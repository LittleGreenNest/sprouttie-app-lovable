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
- Deployed on **Cloudflare Pages** (auto-deploys on push to GitHub `LittleGreenNest/LGN`). `render.yaml` is a leftover from Lovable and is no longer used.
- Express backend placeholder in `/server/` (currently empty)

## Key files

| File | Purpose |
|---|---|
| `src/App.jsx` | Root router, lazy-loaded routes, auth wiring |
| `src/context/AuthContext.jsx` | Auth state, profile management, plan flags |
| `src/context/FlashcardContext.jsx` | Flashcard state management |
| `src/integrations/supabase/client.ts` | Supabase client (reads from `VITE_SUPABASE_*` env vars) |
| `src/integrations/supabase/types.ts` | Generated DB types |
| `vite.config.js` | Build config, env injection, PWA manifest |
| `render.yaml` | Render deployment config — DO NOT TOUCH |

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
| *(others inferred from components)* | Flashcards, session logs, spoken words, word journey |

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

## ⚠️ There are TWO checkouts of this repo and they have diverged

Both are working copies of `LittleGreenNest/sprouttie-app-lovable`:

| Path | State (2026-09-05) |
|---|---|
| `~/sprouttie-app-lovable` (**this one — the active repo**) | ahead by commits, latest `d436fd4` 2026-09-05 |
| `.../Google Drive/.../Sprouttie-Claude-Marketing/Sprouttie-App` | last commit 2026-08-23, but holds **uncommitted work not in git**: `20260829000000_insight_photos.sql` and ~118 extra lines of CLAUDE.md |

Neither is a superset of the other. Before editing either, check which one you are in.
The uncommitted work in the Drive copy needs committing or copying across, or it will be
lost the moment anyone cleans that folder up.

## Pending — needs a human (opened 2026-09-03)

Plain-language versions, because these are easy to misread. Fuller detail lives in the
**Launch Checklist** tab of the Sprouttie Google Sheet, rows 13-15.

### 1. ~~Exposed database key~~ — RESOLVED 2026-09-05

A Supabase secret key (`sb_secret_Ngydq…`) was pasted into a chat transcript on
2026-08-30 and stayed live for six days. **Deleted 2026-09-05 and verified dead** — the
same request that returned HTTP 200 while it was live now returns HTTP 401. The project's
`default` secret key was left untouched. No further action.

Lesson worth keeping: paste a secret with a hidden prompt, never into a chat message —
`read -s -p "paste key: " k && echo "NAME=$k" >> .env`

### 2. Server-side code cannot read most tables

The app works; anything server-side (edge functions, Stripe webhook, reporting, admin
tooling) gets `42501 permission denied` on all 14 tables except `profiles`.

**Cause:** `20260621082843_fix_all_table_grants.sql` granted `authenticated` but never
`service_role`. End users are `authenticated`, which is why the app is fine.

**Consequence:** usage and engagement cannot be measured at all, so any claim that people
actually use the app is currently unsupported.

**Fix written and committed, still NOT applied:**
`supabase/migrations/20260903000000_grant_service_role_all_tables.sql`, committed
2026-09-05 in `edb40b7` on branch `docs/desk-prompt`. Permissions only — no data, no
policies, no RLS change. Committing the file changes nothing on its own; the grants take
effect only when the migration is run, via `supabase db push` or by pasting the SQL into
the dashboard SQL editor. Until then every symptom above is still live.

### 3. The database claims 4 paying subscribers; Stripe says 0

Four profiles have `plan='print'` + `subscription_status='active'`. Three have **no
`stripe_customer_id` at all** so cannot ever have paid; the fourth is cancelled or past due
in Stripe. They get Print Plan features free, and anything reading `profiles` overstates
revenue. **For revenue, trust Stripe, never `profiles`.**

Fix drafted, deliberately **not** a migration so it cannot be pushed by accident:
`scratchpad/fix-entitlements.sql` — a SELECT first, UPDATEs commented out.

**Deeper bug:** nothing downgrades a profile when a Stripe subscription is cancelled.
Trace the `stripe-webhook` cancellation path before a real subscriber ever signs up.

### 4. Two commits sit on an unmerged branch

`docs/desk-prompt` is pushed to GitHub but never merged, so nothing on it reaches
production and it is easy to forget:

| Commit | What |
|---|---|
| `c6a8b99` | the Sprouttie desk build prompt |
| `edb40b7` | this file's pending notes, the `service_role` migration, and `server/` added to `.gitignore` |

The migration in particular belongs on `main`. Open a PR at
`https://github.com/LittleGreenNest/sprouttie-app-lovable/pull/new/docs/desk-prompt`,
or cherry-pick the migration across if the desk prompt is not wanted on `main` yet.

Note `main` is what auto-deploys to Cloudflare Pages, so work parked here ships nothing.

### Also open, non-urgent

- The two Sprouttie Google Sheets belong to `hellolittlegreennest@gmail.com`; the Drive
  connector is authed as `cyrenachio@gmail.com` and cannot see them. Share as Viewer to
  unblock reading.
- `profiles.caregivers` is **null for 100% of profiles** — onboarding never captures it.
  The "who is flashing today" household angle carries positioning weight but has no data
  behind it. Product decision, not a bug.
- `last_activity_date` is null for everyone and `longest_streak` maxes at 0. The streak
  columns are dead. Nothing to remove; do not start surfacing them.

## Do not touch

- `render.yaml`
- Supabase schema or live data
- Any working auth flow
