import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import Stripe from 'npm:stripe@18.5.0';
const headers = { 'Access-Control-Allow-Origin': 'https://sprouttie.online', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
serve(async (req) => {
  if (req.method === 'OPTIONS') return reply({});
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return reply({ error: 'Please sign in again.' }, 401);
  let stage = 'authentication';
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return reply({ error: 'Please sign in again.' }, 401);
    const { data: profile, error: profileError } = await admin.from('profiles').select('stripe_customer_id,stripe_subscription_id,plan').eq('id', user.id).single();
    if (profileError) throw profileError;
    stage = 'billing';
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('Billing verification unavailable');
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
    // Inspect all customers for this email, as older checkout code used email linkage.
    const customers = new Set<string>(profile.stripe_customer_id ? [profile.stripe_customer_id] : []);
    if (user.email) for await (const customer of stripe.customers.list({ email: user.email, limit: 100 })) {
      if (customer.metadata?.supabase_user_id === user.id) customers.add(customer.id);
    }
    if (profile.plan !== 'free' && customers.size === 0) throw new Error('Billing ownership needs manual verification');
    for (const customer of customers) {
      for await (const sub of stripe.subscriptions.list({ customer, status: 'all', limit: 100 })) {
        if (!['canceled', 'incomplete_expired'].includes(sub.status)) await stripe.subscriptions.cancel(sub.id);
      }
    }
    stage = 'media';
    // Delete files through Storage API, never by deleting storage metadata in SQL.
    const removeFolder = async (bucket: string, prefix: string) => {
      while (true) {
        const { data: entries, error: listError } = await admin.storage.from(bucket).list(prefix, { limit: 100 });
        if (listError) throw listError;
        if (!entries?.length) break;
        for (const entry of entries) {
          const path = `${prefix}/${entry.name}`;
          if (!entry.id) await removeFolder(bucket, path);
          else {
            const { error: removeError } = await admin.storage.from(bucket).remove([path]);
            if (removeError) throw removeError;
          }
        }
      }
    };
    for (const bucket of ['spoken-word-videos', 'insight-photos']) await removeFolder(bucket, user.id);
    stage = 'records';
    for (const table of ['daily_tracking','daily_flashing_sessions','spoken_words','word_plans','weekly_suggestions','flashcards','recommended_books','book_feedback','weekly_logs','lexicon','activity_logs']) {
      const { error: removeError } = await admin.from(table).delete().eq('user_id', user.id);
      if (removeError) throw removeError;
    }
    if (user.email) {
      const { error: waitlistError } = await admin.from('waitlist').delete().eq('email', user.email);
      if (waitlistError) throw waitlistError;
    }
    stage = 'sessions';
    const { error: signOutError } = await admin.auth.admin.signOut(token, 'global');
    if (signOutError) throw signOutError;
    stage = 'account';
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;
    return reply({ success: true });
  } catch (error) {
    console.error('Account deletion failed at', stage, error);
    return reply({ error: `Account deletion stopped during ${stage}. Some earlier steps may already be complete. Please contact support@sprouttie.com before trying again.`, stage }, 500);
  }
});
