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
| `src/utils/wordLabel.js` | Reads a card's two halves and matches a search across both plus pinyin. See Word labels |
| `src/components/WordLabel.jsx` | Renders a card as `蜗牛 snail` rather than the front alone |
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
| `/tracker-mockup` | `components/tracking/FlashingTrackerMockup` — design mockup, not a parent-facing screen |

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

## Word labels are bilingual

A card is a front/back pair, and which language sits on the front depends on how it was
created: `蜗牛` / `snail` for a Chinese-first card, `bouncing ball` / `拍球` for an
English-first one. The back is always the half the reader is missing.

**Never render `word.front` on its own in a list.** It leaves a Chinese-first card
unreadable to anyone who does not already know the character, which is most of the point
of the app. Use `WordLabel`:

```jsx
import WordLabel from '@/components/WordLabel';
<WordLabel card={word} secondaryStyle={{ color: '#6B7280' }} />
```

**Never filter on `front` and `back` by hand either.** Use `wordMatchesQuery(card, query)`,
which also matches pinyin with tone marks stripped, so `snail`, `woniu`, `wō niú` and `蜗`
all find the same card.

Local state after `updateFlashcard` carries `english`; a freshly loaded row carries `back`.
The helpers read both, so a just-filled translation shows without a reload. Do not reach for
one field directly.

### The card data is dirtier than the schema suggests

Measured against live data on 2026-09-05, 173 cards:

| | |
|---|---|
| Chinese on the front | 83 |
| of those, no English on the back | 27 |
| of those 27, English packed into the *front* field, e.g. `搅拌 (jiǎo bàn) / mix` | 21 |
| of those 27, genuinely bare | 6 |
| of the 83, no pinyin | 76 |
| English on the front, no Chinese anywhere | 90 |

The 21 packed rows need splitting, not translating. `needsEnglish()` currently flags them,
so the Edit Set panel's "Add English" button would send the whole string to `translate-word`
and write the result onto a card whose front is already wrong. **Guard that before running
the fill on real data.** Five more cards are the same shape reversed: `Dog / 狗 (gǒu)`.

## Dead code — routed nowhere

These are built, tracked, and unreachable. Do not assume a feature works because the
component exists; check for a route or an import first.

| Component | Note |
|---|---|
| `components/storybooks/AIStorybooks.jsx` | No route, no import. Yet "Unlimited AI story generation" is sold as a Pro Sprout feature on `/plans` |
| `components/BingoCardGenerator.jsx` | No route, no import |
| `components/gamification/` + `src/utils/milestones.js` | Only imported by a sibling in the same folder, so nothing outside it ever opens |
| `components/AllWords.jsx` + `components/all-words/` | Superseded; `/all-words` redirects to `/cards` |

`components/planner/WeeklyOutcomeReview.jsx` is *not* in this list — it has no route of its
own but is imported by `WeeklyWordPlanner`, so it is reachable through `/word-planner`.

## Do not touch

- Supabase schema or live data
- Any working auth flow
