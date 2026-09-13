// Maps a Stripe subscription's state onto the profiles columns the app reads.
// usePlanAccess gates every paid feature on profiles.plan alone, so plan has to
// follow payment: off when a payment fails, back on when it recovers.

/** Every price that grants a paid plan. Mirrors the priceIds in Plans.jsx. */
export const PRICE_TO_PLAN: Record<string, string> = {
  price_1TV5x9EVoum0YBjstZUa3WSq: 'print', // Print Plan monthly, SGD 3
  price_1TV5yoEVoum0YBjseEsQMVBY: 'print', // Print Plan yearly, SGD 29
};

const PAID = new Set(['active', 'trialing']);

// The subscription still exists and Stripe is retrying or waiting on the
// customer. Keep stripe_subscription_id so a recovered payment finds this row.
const PAYMENT_FAILED = new Set(['past_due', 'unpaid', 'paused']);

// Terminal: this subscription can never be paid again.
const ENDED = new Set(['canceled', 'incomplete_expired']);

export type ProfilePatch = {
  plan?: string;
  subscription_status: string;
  stripe_subscription_id?: null;
};

export function patchForSubscription(status: string, priceIds: string[]): ProfilePatch {
  if (PAID.has(status)) {
    const plan = priceIds.map((id) => PRICE_TO_PLAN[id]).find(Boolean);
    // An unknown price (a legacy USD test price) leaves plan untouched rather
    // than guessing which plan it should grant.
    return plan ? { plan, subscription_status: status } : { subscription_status: status };
  }
  if (PAYMENT_FAILED.has(status)) {
    return { plan: 'free', subscription_status: status };
  }
  if (ENDED.has(status)) {
    return { plan: 'free', subscription_status: status, stripe_subscription_id: null };
  }
  // 'incomplete': the first payment is still processing. Leave plan alone so a
  // new subscriber is never downgraded by an event racing checkout.session.completed.
  return { subscription_status: status };
}
