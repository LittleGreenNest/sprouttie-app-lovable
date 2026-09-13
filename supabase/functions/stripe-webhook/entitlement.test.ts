import { assertEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import { patchForSubscription } from './entitlement.ts';

const MONTHLY = 'price_1TV5x9EVoum0YBjstZUa3WSq';
const YEARLY = 'price_1TV5yoEVoum0YBjseEsQMVBY';
const LEGACY = 'price_legacy_usd_1';

Deno.test('failed payment switches Print Plan off and keeps the subscription link', () => {
  for (const status of ['past_due', 'unpaid', 'paused']) {
    assertEquals(patchForSubscription(status, [MONTHLY]), { plan: 'free', subscription_status: status });
  }
});

Deno.test('recovered payment switches Print Plan back on, monthly and yearly', () => {
  assertEquals(patchForSubscription('active', [MONTHLY]), { plan: 'print', subscription_status: 'active' });
  assertEquals(patchForSubscription('active', [YEARLY]), { plan: 'print', subscription_status: 'active' });
  assertEquals(patchForSubscription('trialing', [YEARLY]), { plan: 'print', subscription_status: 'trialing' });
});

Deno.test('active subscription on an unknown price leaves plan untouched', () => {
  assertEquals(patchForSubscription('active', [LEGACY]), { subscription_status: 'active' });
  assertEquals(patchForSubscription('active', []), { subscription_status: 'active' });
});

Deno.test('ended subscriptions go to free and drop the subscription link', () => {
  for (const status of ['canceled', 'incomplete_expired']) {
    assertEquals(patchForSubscription(status, [MONTHLY]), {
      plan: 'free',
      subscription_status: status,
      stripe_subscription_id: null,
    });
  }
});

Deno.test('first payment still processing never downgrades a new subscriber', () => {
  assertEquals(patchForSubscription('incomplete', [MONTHLY]), { subscription_status: 'incomplete' });
});
