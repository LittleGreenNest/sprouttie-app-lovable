import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'npm:stripe@18.5.0';
import { patchForSubscription } from './entitlement.ts';

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WEBHOOK_SECRET    = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

/** Verify Stripe webhook signature using Web Crypto (no Stripe SDK crypto dep) */
async function verifyStripeSignature(
  body: string,
  header: string,
  secret: string,
): Promise<boolean> {
  const enc = new TextEncoder();
  const parts: Record<string, string[]> = {};
  for (const seg of header.split(',')) {
    const i = seg.indexOf('=');
    if (i < 0) continue;
    const k = seg.slice(0, i), v = seg.slice(i + 1);
    (parts[k] ??= []).push(v);
  }
  const ts   = parts['t']?.[0];
  const sigs = parts['v1'] ?? [];
  if (!ts || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;

  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const raw = await crypto.subtle.sign('HMAC', key, enc.encode(`${ts}.${body}`));
  const hex = Array.from(new Uint8Array(raw)).map(b => b.toString(16).padStart(2, '0')).join('');
  return sigs.some(s => s === hex);
}

/** Call stripe_update_profile RPC (SECURITY DEFINER — bypasses RLS) */
async function updateProfile(userId: string, plan: string, subscriptionStatus: string, customerId: string | null, subscriptionId: string | null): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_KEY env var is missing');
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/stripe_update_profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      p_user_id:               userId,
      p_plan:                  plan,
      p_subscription_status:   subscriptionStatus,
      p_stripe_customer_id:    customerId,
      p_stripe_subscription_id: subscriptionId,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '(no body)');
    throw new Error(`RPC stripe_update_profile ${res.status}: ${detail}`);
  }
}

/** Update subscription_status by stripe_subscription_id via direct REST (anon key + RLS allows service reads) */
async function updateBySubscriptionId(subscriptionId: string, patch: Record<string, unknown>): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Server credentials unavailable');
  // Use service role key if available, otherwise skip (non-critical path)
  const key = SERVICE_KEY;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(patch),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '(no body)');
    throw new Error(`Supabase PATCH by sub ${res.status}: ${detail}`);
  }
}

/** The subscription as Stripe holds it now. Events can arrive out of order, so a
 *  late past_due event must not switch off a plan whose payment has since gone
 *  through. Falls back to the event payload if Stripe cannot be reached. */
async function currentSubscription(fromEvent: Stripe.Subscription): Promise<Stripe.Subscription> {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) return fromEvent;
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(fromEvent.id)}`,
      { headers: { 'Authorization': `Bearer ${key}` } },
    );
    if (!res.ok) {
      console.warn('[webhook] Stripe lookup', res.status, 'using event payload');
      return fromEvent;
    }
    return await res.json() as Stripe.Subscription;
  } catch (e) {
    console.warn('[webhook] Stripe lookup failed, using event payload:', e);
    return fromEvent;
  }
}

serve(async (req) => {
  const sigHeader = req.headers.get('Stripe-Signature');
  const body = await req.text();

  if (!sigHeader || !WEBHOOK_SECRET) {
    console.error('[webhook] Missing Stripe-Signature or STRIPE_WEBHOOK_SECRET');
    return json({ error: 'missing signature' }, 400);
  }

  let valid = false;
  try { valid = await verifyStripeSignature(body, sigHeader, WEBHOOK_SECRET); }
  catch (e) {
    console.error('[webhook] Sig verify threw:', e);
    return json({ error: 'sig verify error' }, 400);
  }
  if (!valid) {
    console.error('[webhook] Invalid signature');
    return json({ error: 'invalid signature' }, 400);
  }

  let event: Stripe.Event;
  try { event = JSON.parse(body); }
  catch { return json({ error: 'bad json' }, 400); }

  console.log('[webhook] event:', event.type);

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId  = session.metadata?.user_id;
      if (!userId || !session.subscription) throw new Error('Missing checkout linkage');
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (!stripeKey) throw new Error('Stripe is unavailable');
      const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(String(session.subscription))}`, {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      if (!response.ok) throw new Error('Could not verify the purchased subscription');
      const sub = await response.json();
      const prices = (sub.items?.data || []).map((item: any) => item.price?.id);
      const patch = patchForSubscription(sub.status, prices);
      await updateProfile(userId, patch.plan || 'free', sub.status, String(session.customer), String(session.subscription));

    } else if (event.type === 'customer.subscription.updated') {
      const sub = await currentSubscription(event.data.object as Stripe.Subscription);
      const priceIds = (sub.items?.data ?? []).map((item) => item.price?.id).filter(Boolean) as string[];
      const patch = patchForSubscription(sub.status, priceIds);
      await updateBySubscriptionId(sub.id, patch);
      console.log('[webhook] subscription.updated', sub.id, sub.status, 'plan:', patch.plan ?? '(unchanged)');

    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      await updateBySubscriptionId(sub.id, {
        plan: 'free',
        subscription_status: 'canceled',
        stripe_subscription_id: null,
      });
      console.log('[webhook] subscription.deleted', sub.id);

    } else {
      console.log('[webhook] unhandled:', event.type);
    }

    return json({ received: true }, 200);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[webhook] ERROR:', msg);
    // Include detail in body so it appears in Stripe's response panel
    return json({ error: 'processing failed' }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
