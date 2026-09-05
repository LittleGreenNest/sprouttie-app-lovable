# Sprouttie — Developer Reference

Bilingual (Mandarin/English) baby flashcard tracker. Live at sprouttie.online.
Migrated from Lovable to Claude Code — no Lovable dependencies remain.

## Stack

- React 18 + Vite 5 + Tailwind CSS 3
- Supabase (auth + database via `@supabase/supabase-js`)
- React Router v6
- @tanstack/react-query v5
- Framer Motion
- PWA via vite-plugin-pwa
- Deployed on **Cloudflare Pages** (auto-deploys on push to `main` in GitHub `LittleGreenNest/sprouttie-app-lovable`). Verified against a live deploy 2026-09-05.
- Express backend placeholder in `/server/` (currently empty)

## Key files

| File | Purpose |
|---|---|
| `src/App.jsx` | Root router, lazy-loaded routes, auth wiring |
| `src/context/AuthContext.jsx` | Auth state, profile management, plan flags |
| `src/context/FlashcardContext.jsx` | Flashcard state management |
| `src/integrations/supabase/client.ts` | Supabase client (reads from `VITE_SUPABASE_*` env vars) |
| `src/utils/cardId.js` | `cardIdFrom()` — normalises `daily_tracking.flashcard_id`. See Data conventions |
| `src/integrations/supabase/types.ts` | Generated DB types |
| `vite.config.js` | Build config, env injection, PWA manifest |

## Routes

## Architecture
| Domain | Purpose |
|---|---|
| sprouttie.com | Marketing site (Lovable) — hub + /app product page + /shop |
| sprouttie.online | App only — `/` redirects to `/login`. No homepage. |

### Public
| Path | Component |
|---|---|
| `/` | Redirects to `/login` (LandingPage.jsx exists but is unrouted as of 2026-06) |
| `/login` | `components/auth/Login` |
| `/signup` | `components/auth/Signup` |
| `/forgot-password` | `components/auth/ForgotPassword` |
| `/reset-password` | `components/auth/ResetPassword` |
| `/terms` | `pages/Terms` |
| `/privacy` | `pages/Privacy` |
| `/support` | `pages/Support` |
| `/plans` | `components/subscription/Plans` |
| `/pdf-success` | `pdf-success` |
| `/upgrade-success` | `components/subscription/UpgradeSuccess` |
| `/install` | `pages/Install` |

### Protected (require auth)
| Path | Component |
|---|---|
| `/dashboard` | `components/Dashboard` |
| `/daily-tracking` | `components/tracking/SessionLogTracker` |
| `/flashed-history` | `components/FlashedHistory` |
| `/words-said` | `components/SpokenWords` |
| `/cards` | `components/FlashcardManager` |
| `/pronunciation` | `components/pronunciation/PronunciationPortal` |
| `/word-planner` | `components/planner/WeeklyWordPlanner` |
| `/book-recommendations` | `components/storybooks/BookRecommendations` |
| `/word-journey` | `components/tracking/WordJourney` |
| `/scan-flashcards` | `components/import/PhotoScanner` |
| `/profile` | `components/user/Profile` |
| `/print` | `components/PrintFlashcards` |
| `/garden-guide` | `components/dashboard/GardenGuide` |

### Legacy redirects
`/words` → `/words-said`, `/all-words` → `/cards`, `/spoken-words` → `/words-said`, `/manage-flashcards` → `/cards`

## Auth

- Email/password: `supabase.auth.signInWithPassword` / `signUp`
- Google OAuth: `supabase.auth.signInWithOAuth({ provider: 'google' })` (direct Supabase, no Lovable wrapper)
- Session persistence: localStorage
- Profile auto-created on first auth in `ensureProfileExists()`
- Realtime profile subscription active per user (for plan upgrades from Stripe webhook)

## Supabase tables (key)

| Table | Purpose |
|---|---|
| `profiles` | User profile — `id`, `email`, `plan`, `subscription_status`, `onboarding_completed` |
| `flashcards` | `id`, `front`, `back`, `folder`, `card_language`, `set_number`, `user_id` |
| `daily_tracking` | One row per card per round per day. `flashcard_id` is NOT a bare card id — see Data conventions |
| `spoken_words` | `word`, `word_stage` (`new` \| `growing` \| `owned`), `stage_updated_at` |

Plan values: `free`, `pdf`, `pro`

## Plan / entitlement flags (from AuthContext)

```js
const { plan, isPdf, isPro } = useAuth();
// isPdf = plan === 'pdf' || plan === 'pro'
// isPro = plan === 'pro'
```

## Env vars required

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY   (anon key)
```

Both have public fallbacks hard-coded in `vite.config.js` so the app won't blank on missing env.

## Onboarding gate

If `currentUser` exists but `profile.onboarding_completed` is falsy, `App.jsx` renders `PersonaliseFlow` instead of the main app. On completion it calls `refreshProfile(currentUser)`.

## Data conventions

### `daily_tracking.flashcard_id` carries a round suffix

`SessionLogTracker.toggleSetRound()` writes it as `"<card uuid>:R<round>"`, to
dodge the `user_id / flashcard_id / date` unique index when the same card is
flashed in several rounds on one day. `CalendarGridView` and older rows store a
bare uuid, so **both shapes exist in the table**.

Never join this column against `flashcards.id` directly. Always normalise:

```js
import { cardIdFrom } from '@/utils/cardId';   // or a relative path
const cardId = cardIdFrom(row.flashcard_id);   // handles both shapes
```

Getting this wrong fails silently: the lookup never matches, counts come back 0,
and the screen renders a plausible empty state instead of an error. It emptied
Word Journey, Flashed Words Grid, Bingo, All Words' flashed markers, the
planner's counts and Calendar Grid before it was caught.

Sentinel rows (`set-<id>-sentinel:R<n>`) normalise to `set-<id>-sentinel`, so a
`startsWith('set-')` guard still works after normalising.

Known remaining gap: `planner/WeeklyWordPlanner.jsx` still keys by the raw
value. Probably the same bug; its read side was never traced.

### `spoken_words.word_stage` is manual-only

`handleStageChange()` in `SpokenWords.jsx` is the only writer, fired by a swipe.
There is no automatic promotion. Expect `growing` and `owned` to be 0 on real
accounts, and note that Garden, Word Journey and the dashboard's three counters
all read from stages that in practice never change.

## Design

`design/home-proposal/` holds the working files for the directive-Home proposal
canvas, with its published link and open questions in that folder's README.

## ⚠️ THIS IS THE STALE CHECKOUT — the active repo is `~/sprouttie-app-lovable`

Both folders are working copies of `LittleGreenNest/sprouttie-app-lovable`, and they have
diverged (checked 2026-09-05):

| Path | State |
|---|---|
| `~/sprouttie-app-lovable` | **ahead by commits**, latest `d436fd4` 2026-09-05. Deploy from here. |
| this folder | last commit `2b0c9a3` 2026-08-23, but holds **uncommitted work not in git**: `20260829000000_insight_photos.sql` and CLAUDE.md sections the other copy lacks |

Neither is a superset of the other. The uncommitted work here needs committing or copying
across, or it is lost the moment this folder is cleaned up. Do new work in
`~/sprouttie-app-lovable`.

## Pending — needs a human (opened 2026-09-03)

Three things are outstanding. None can be finished by Claude alone: the first two
need dashboard access, the third edits live customer data. Written in plain terms
because they are easy to misread.

### 1. ~~Exposed database key~~ — RESOLVED 2026-09-05

A Supabase secret key (`sb_secret_Ngydq…`) was pasted into a chat transcript on
2026-08-30 and stayed live for six days. **Deleted 2026-09-05 and verified dead** — the
same request that returned HTTP 200 while it was live now returns HTTP 401. The project's
`default` secret key was left untouched. No further action.

Lesson worth keeping: paste a secret with a hidden prompt, never into a chat message —
`read -s -p "paste key: " k && echo "NAME=$k" >> .env`

### 2. Server-side code cannot read most tables

**What is broken.** The app itself is fine. But anything running on the *server* —
edge functions, the Stripe webhook, any reporting or admin tooling — is refused by
the database with `42501 permission denied` on every table except `profiles`.

**Why.** Postgres needs each table to name which roles may touch it.
`20260621082843_fix_all_table_grants.sql` named `authenticated` (logged-in users,
which is why the app works) and never named `service_role` (the server). Only
`profiles` has it, from the earlier May fix.

**Consequence today.** Usage and engagement cannot be measured at all. Any claim
about whether people actually use the app is currently unsupported, because the
question cannot be asked.

**The fix, written but NOT applied:**
`supabase/migrations/20260903000000_grant_service_role_all_tables.sql`
It grants the server role on all 14 tables and sets a default so new tables do not
repeat the problem. It changes permissions only — no data, no policies, no RLS
behaviour. Apply with `supabase db push` when you want it live.

### 3. The database claims 4 paying subscribers; Stripe says 0

**What is wrong.** Four profiles carry `plan = 'print'` and
`subscription_status = 'active'`. Three of them have no Stripe customer record at
all, so they cannot ever have paid. The fourth is cancelled or past due in Stripe.

**Two consequences.** Those accounts get Print Plan features free, and anything
reading `profiles` reports paying subscribers who do not exist. **For revenue, trust
Stripe, never `profiles`.**

**The fix, drafted and deliberately NOT a migration** (so it cannot be applied by
accident): `scratchpad/fix-entitlements.sql`. It runs a SELECT first, then two
commented-out UPDATEs. The batch one only touches rows with no Stripe customer, so a
genuine subscriber cannot be caught by it. Run by hand in the SQL editor.

**The deeper bug.** Downgrading those rows fixes today's data, not the cause.
Something sets `print`/`active` with no Stripe customer, and nothing downgrades a
profile when a subscription is cancelled. Trace the `stripe-webhook` cancellation
path before a real subscriber ever signs up, or this state returns.

### Also blocked, non-urgent

- The two Sprouttie Google Sheets are owned by `hellolittlegreennest@gmail.com`; the
  Drive connector is authed as `cyrenachio@gmail.com` and cannot see them. Share them
  with `cyrenachio@gmail.com` as Viewer to unblock reading.
- `profiles.caregivers` is **null for 100% of profiles** — onboarding never captures
  it. The household angle ("who is flashing today") carries real positioning weight
  but has no data behind it. Product decision, not a bug.
- `last_activity_date` is null for everyone and `longest_streak` maxes at 0. The
  streak columns are dead. Nothing to remove; do not start surfacing them.

## Do not touch

- Supabase schema or live data
- Any working auth flow
