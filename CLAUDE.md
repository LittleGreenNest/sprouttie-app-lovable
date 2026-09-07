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

Plan values: `free`, `print`, `pro`. `pdf` is a legacy value still present on old rows;
`Plans.jsx` maps it through `const alias = { pdf: 'print', print: 'print', ... }`. Read plans
through that alias, never by comparing to `'pdf'` directly.

Price: **SGD 3/month or SGD 29/year** for Print. `pro` is waitlist only and must not be sold.

## Plan / entitlement flags (from AuthContext)

```js
const { plan, isPdf, isPro } = useAuth();
// isPdf = plan === 'pdf' || plan === 'pro'   // flag name is legacy; it means "has Print"
// isPro = plan === 'pro'
```

### For revenue, trust Stripe, never `profiles`

Four profiles carry `plan = 'print'` with `subscription_status = 'active'`. Three have no
Stripe customer record at all, so they cannot ever have paid; the fourth is cancelled or past
due. Those accounts get Print features free, and any query over `profiles` reports paying
subscribers who do not exist.

The cause is unfixed: something sets `print`/`active` with no Stripe customer, and nothing
downgrades a profile when a subscription is cancelled. Trace the `stripe-webhook`
cancellation path before a real subscriber signs up, or the state returns.

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

## Product direction (locked 2026-09-05)

The stage vocabulary is **SPROUT**, and it replaces the earlier Capture / Decide / Do / Use /
Notice names. Anything written before 2026-09-05 uses the old five; translate rather than
rewrite: Capture = S, Decide = P, Do = R, Use = O + U, Notice = T.

| | Stage | Who performs it |
|---|---|---|
| **S** | See what they know | Parent, in seconds |
| **P** | Personalise what comes next | Sprouttie |
| **R** | Repeat through short exposures | Sprouttie |
| **O** | Open up reading opportunities | Sprouttie (**beta**) |
| **U** | Use language in everyday life | Parent, prompted |
| **T** | Track how they grow | Parent, once a week |

Rules that bind code, not just copy:

- **SPROUT is the logic underneath, never the navigation.** Do not ship six tabs, and do not
  name a stage after a mechanic (`Repeat through short exposures` never becomes "Flash").
- **O stays behind a beta label** until there is a real Mandarin book catalogue obtainable in
  Singapore. Ship whatever `BookRecommendations` already does, labelled beta. Build no
  commerce layer.
- **T is the only place a parent sets word states.** No other screen may ask them to maintain
  one. That input burden is why the garden stalls — see the `word_stage` note.
- **The child never looks at a screen.** The phone is the adult's prompt sheet. Print is what
  makes that true, which is why print stays in the paid line.
- **Pricing and packaging are frozen.** SGD 3, current free/paid boundary. Do not re-gate
  features or restructure Stripe plans.

Full rules, voice, palette and the pre-ship checklist live in the `sprouttie-brand` skill at
`~/.claude/skills/sprouttie-brand/SKILL.md`. Load it before writing any user-facing string.

### Not being built right now

`Use it today` (the U-stage phrases) in-app, book catalogue, pricing changes, Word Garden
rework, milestones, AI Storybooks, Bingo, staging environment, share cards, automated email.
Each has a case; none is why nobody has signed up. The bottleneck is distribution.

Reference: **Sprouttie Launch Week** —
https://claude.ai/code/artifact/54cd9e74-4d99-4d4d-8984-c174187bcad5
**SPROUT Framework** (loop poster + internal feature map) —
https://claude.ai/code/artifact/25f2ec17-b14a-46ad-8023-2af3ff5f307a

## Repo state — read before starting work (2026-09-05)

There are two working copies of `LittleGreenNest/sprouttie-app-lovable` and four branches
with unmerged work. Confirm the branch before editing anything.

| Checkout | Use |
|---|---|
| `~/sprouttie-app-lovable` | **active.** Do work here |
| `.../My Drive/Sprouttie-Claude-Marketing/Sprouttie-App` | stale Drive copy. Its `CLAUDE.md` is 60 lines behind this one and still names `render.yaml` and the wrong GitHub repo. Do not work in it |

| Branch | Head | Holds |
|---|---|---|
| `main` | `0bd2995` | what deploys. This file |
| `merge/drive-rescue` | `0a46f4e` | the rescued Drive work, lock file and `.bak` already dropped. **`screenshots/` is still tracked, 25 JPGs, 1.1MB — strip before merging.** Divergent from `main` |
| `docs/desk-prompt` | `42e0af2` | the `service_role` grants migration and the desk prompt. 5 ahead of `main` |
| `rescue/drive-checkout-2026-09-05` | `281c995` | the Drive-side duplicate of the rescue. Superseded by `merge/drive-rescue`; nothing to salvage |
| `wip/segments-pinyin` | `58d4c84` | flashcard segments, sentence splitting, pinyin |

### Migrations: recovered, and the database is ahead of `main`

Both migrations are now present on this branch, recovered from `docs/desk-prompt`:

- `20260829000000` insight photos, `log_type` constraint
- `20260903000000` `service_role` grants on all 14 tables, applied and verified

Both are **already applied to the live Supabase project**. The database being ahead of the
deployed app is the safe direction, but the next deploy is the first time the app meets a
schema it has never run against. Check the gate items touching insight photos and log types
specifically.

### Not on this branch

`src/utils/cardId.js` and the `daily_tracking.flashcard_id` normalisation live on
`merge/drive-rescue`, along with the note that `planner/WeeklyWordPlanner.jsx` still keys off
the raw value. Do not assume `cardIdFrom()` is importable here until that branch lands.

## Do not touch

- Supabase schema or live data
- Any working auth flow
- Pricing, plan structure, or Stripe products
