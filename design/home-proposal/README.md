# Home redesign proposal — working files

Published canvas: https://claude.ai/code/artifact/4b85fa85-4e5d-4429-977a-05e52b078890

Four artboards arguing for a directive Home screen, and the promotion-rule
decision that has to be settled first. Static mockups, not a prototype.

| File | Artboard |
|---|---|
| `Current.dc.html` | 1 · Home today (recreated from `src/components/Dashboard.jsx`) |
| `Main.dc.html` | 2 · Proposed Home, once stage promotion works |
| `RealData.dc.html` | 3 · The same design on real data (110 / 0 / 0) |
| `Rules.dc.html` | 4 · Three candidate promotion rules |
| `canvas.json` | Layout, artboard titles, sticky-note descriptions |

## Editing

These are the source of truth. Re-seed and republish rather than editing the
published page, and re-read the artifact first if it was saved from the canvas
editor since the last re-seed.

## Answered 2026-09-06

Board 4 was rewritten, not filled in: the query ruled out all three options.
All promote **zero**. 22 of 149 cards ever flashed, 58 `daily_tracking` rows in
total, nothing past 3 distinct days, and only **13 of 101 logged words are
flashcards at all**.

New recommendation: **the Sunday review writes the stage**, using the four-state
question on board 6 of the weekly canvas. See `design/planner-proposal/`.

Stages now read 107 / 4 / 0, so promotion has fired 4 times and the old "never
run in eleven months" line is retired.

## Open items
- Boards 2 and 3 assume the dashboard's "12 saved" books and "3 tips" are real
  content stores. Untraced.
