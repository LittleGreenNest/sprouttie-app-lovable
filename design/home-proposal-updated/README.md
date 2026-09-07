# Home proposal, board 4 rewritten (2026-09-06)

Published canvas: https://claude.ai/code/artifact/4b85fa85-4e5d-4429-977a-05e52b078890

**These two files replace their namesakes in `design/home-proposal/`,** which
lives on `merge/drive-rescue`, not on `main`. Copy them across when the branches
land, then delete this folder. It exists only because the original working files
are on a branch this one is not based on.

## What changed and why

The two `[run query]` holes were filled by querying the live database through the
founder's own browser session on 2026-09-06. The answer invalidated all three
options, so board 4 is a rewrite rather than a fill-in.

| | Would promote today |
|---|---|
| A, heard on 3 separate days | 0 |
| B, said unprompted | 0 |
| C, flashed 5x and heard once | 0 |
| C with the threshold lowered to 3 | 0 |

Why: 149 flashcards but only **22 ever flashed**, **58 rows** in `daily_tracking`
in total, and **no card past 3 distinct days**. `weekly_logs` has 1 row, so the
repeat-observation signal option A needs does not exist either.

The decisive number: **only 13 of 101 logged words are flashcards at all.** Any
rule keyed to flashing tops out at 13% of the recorded vocabulary.

New recommendation: **the Sunday review writes the stage**, using the four-state
question drawn on board 6 of the weekly canvas. No new capture, works on all 101
words, and moves the decision off the data and onto the weekly merge.

Two corrections folded in: stages now read 107 / 4 / 0, so promotion HAS fired
four times and "never run in eleven months" is retired; and option A's old "data
needed" line was wrong, since `spoken_words` holds one date per word.
