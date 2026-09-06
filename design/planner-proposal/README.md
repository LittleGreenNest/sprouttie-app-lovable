# Weekly screen proposal — working files

Published canvas: https://claude.ai/code/artifact/794a5990-16ec-4cb4-8623-fdf9e8bf6da6

Seven artboards arguing that the app's two weekly experiences should collapse
into one state-driven screen. Static mockups, not a prototype.

| File | Artboard |
|---|---|
| `CurrentWizard.dc.html` | 1 · The week today (a) — the dashboard wizard, from `components/thisweek/` |
| `CurrentPlanner.dc.html` | 2 · The week today (b) — `/word-planner` |
| `StateEmpty.dc.html` | 3 · Proposed — nothing chosen yet |
| `Main.dc.html` | 4 · Proposed — the week is ready (the screen that matters) |
| `StateRunning.dc.html` | 5 · Proposed — confirmed and running |
| `StateReflect.dc.html` | 6 · Proposed — Sunday reflection |
| `Rules.dc.html` | 7 · Five things to settle first |
| `canvas.json` | Layout, titles, sticky notes |

## Palette note

Drawn on the corrected brand tokens (cream `#FCF9F3`, mint `#ECF3F0`, sage
`#42946E`, deep sage `#296549`, Daisy Yellow `#F0C040` CTA). The Home proposal
canvas predates the token fix on `fix/launch-blockers`, where
`--sprouttie-cream` was still pure white and `--secondary` still pointed at
coral — which is why the two canvases differ slightly in ground colour.

## Editing

Source of truth. Re-seed and republish rather than editing the published page,
and re-read the artifact first if it was saved from the canvas editor since the
last re-seed.

## Drawn but not built

- The "Say it today" block on board 5 is the U stage. Not built.
- "Why these words?" on board 4 needs the suggestion generator to store a
  reason alongside each word — a change at the generation end, not only UI.
- Board 3's last-week card assumes a review actually ran that week.
