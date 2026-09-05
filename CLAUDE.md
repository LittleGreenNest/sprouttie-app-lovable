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

## Do not touch

- Supabase schema or live data
- Any working auth flow
