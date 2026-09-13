// Stripe statuses where a Print Plan subscription still exists but a payment
// failed. The stripe-webhook moves these accounts to the free plan until the
// card is fixed. The fix is a card update in the billing portal, never a new
// checkout: Stripe keeps retrying the old subscription, so a second one would
// bill the family twice.
export const PAYMENT_ISSUE_STATUSES = ['past_due', 'unpaid'];

export const hasPaymentIssue = (status) => PAYMENT_ISSUE_STATUSES.includes(status);
