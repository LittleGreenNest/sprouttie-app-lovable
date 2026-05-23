import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

/**
 * Verify Stripe webhook signature using native Web Crypto API.
 * Replaces Stripe.createSubtleCryptoProvider() which is unreliable in Deno edge runtimes.
 */
async function verifyStripeSignature(
  body: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();

  // Parse "t=timestamp,v1=sig1,v1=sig2,..." header
  const items: Record<string, string[]> = {};
  for (const part of signatureHeader.split(',')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx);
    const v = part.slice(idx + 1);
    if (!items[k]) items[k] = [];
    items[k].push(v);
  }

  const timestamp = items.t?.[0];
  const v1Sigs = items.v1 ?? [];

  if (!timestamp || v1Sigs.length === 0) return false;

  // Reject events older than 5 minutes
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp, 10)) > 300) return false;

  const signedPayload = `${timestamp}.${body}`;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const rawSig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const computedSig = Array.from(new Uint8Array(rawSig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return v1Sigs.some(sig => sig === computedSig);
}

serve(async (req) => {
  const signatureHeader = req.headers.get('Stripe-Signature');
  const body = await req.text();
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signatureHeader || !webhookSecret) {
    console.error('Missing Stripe-Signature header or STRIPE_WEBHOOK_SECRET env var');
    return new Response(
      JSON.stringify({ error: 'Missing signature or secret' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const isValid = await verifyStripeSignature(body, signatureHeader, webhookSecret);
  if (!isValid) {
    console.error('Webhook signature verification failed');
    return new Response(
      JSON.stringify({ error: 'Invalid signature' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let event: Stripe.Event;
  try {
    event = JSON.parse(body) as Stripe.Event;
  } catch (err) {
    console.error('Failed to parse event body:', err);
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  console.log('Processing webhook event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const planKey = session.metadata?.plan_key;

        if (userId && planKey) {
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              plan: planKey,
              subscription_status: 'active',
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
            })
            .eq('id', userId);

          if (updateError) {
            console.error(`Failed to update profile for user ${userId}:`, updateError.message);
            throw new Error(`Profile update failed: ${updateError.message}`);
          }
          console.log(`Updated user ${userId} to plan ${planKey}`);
        } else {
          console.error('Missing metadata — userId:', userId, 'planKey:', planKey);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: subscription.status })
          .eq('stripe_subscription_id', subscription.id);
        console.log(`Updated subscription status: ${subscription.status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await supabaseAdmin
          .from('profiles')
          .update({
            plan: 'free',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
          })
          .eq('stripe_subscription_id', subscription.id);
        console.log('Subscription canceled, reverted to free plan');
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
