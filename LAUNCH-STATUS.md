# Launch readiness

## Owner decisions
- Free: 50 cards, three PDF prints monthly. Existing cards are retained.
- Primary actions: Daisy Yellow with dark ink.
- Pronunciation catalogue and assessment: deferred. Missing features stay unavailable.
- Complete launch blockers before starting acquisition measurement.

## Verification still in progress
- Database guard and billing privileges: migration confirmation has expired twice. Not applied yet.
- Billing backend: price allowlist and server-verified entitlements deployed; end-to-end paid checkout needs validation.
- Deletion: billing cancellation, media cleanup, session revocation and fail-visible cleanup deployed; destructive end-to-end check must use a disposable account.
- Backups: organisation is on Free. Managed daily backups are not included. No backup or restore drill has yet been verified.
- Mail: MX routes to Cloudflare. Owner identified hellolittlegreennest@gmail.com and support@sprouttie.com. Individual alias delivery is not verified.
- Alerts: no externally delivered alert verified yet.
- Parent usability study: no participants observed. Never invent completion.

## Recovery and alerting limits

- `health` now checks the database rather than returning unconditional success.
- `.github/workflows/health.yml` checks app and database every 15 minutes after merge. Failed-run email depends on the repository owner's GitHub Actions notification settings. Alert receipt is not yet verified.
- Supabase's managed daily backups are not included on this Free organisation. A paid plan or an independently scheduled database AND Storage backup is required; database backups alone do not include uploaded photos/videos. No paid upgrade has been made.
- Do not run a restore against production to test recovery. Use a separate target and verify row counts and sample media before calling the backup usable.

## Latest code verification

- Production build passes.
- 12 Node regression tests pass, including checkout price tampering, verified email/customer linkage, payment entitlements, deletion failure ordering, login timeout and card capacity.
- Local browser check confirms Google Analytics and Meta scripts are absent before optional consent and remain absent after Essential only.
- Public health endpoint confirms the database is reachable; unsigned webhook and unauthenticated deletion requests are rejected.
- Backend functions deployed: stripe-webhook, create-checkout, customer-portal, delete-account and health. Database billing restrictions are still pending; do not describe payment security as complete.
