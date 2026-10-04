import { cardIdFrom } from './cardId';

/** A card has had its run after this many flashed days. */
export const DAYS_TO_FINISH = 5;

/** How far back the round log is read when counting days. */
export const DAY_COUNT_WINDOW = 60;

/**
 * How many different days each card has been flashed on since it joined its
 * set. One logged round is enough for a day to count, and the days do not have
 * to be in a row: a skipped day pauses the count, it never resets it.
 *
 * daily_tracking.flashcard_id is "<card uuid>:R<round>" from the Log page and
 * a bare uuid from the calendar, so ids are normalised first.
 */
export const daysFlashed = (trackingRows = [], cards = []) => {
  const since = new Map(cards.map((c) => [c.id, String(c.date_introduced || '').slice(0, 10)]));
  const days = new Map();
  trackingRows.forEach((r) => {
    if (r.status && r.status !== 'flashed') return;
    const id = cardIdFrom(r.flashcard_id);
    if (!since.has(id)) return;
    const day = r.user_local_date || r.date;
    if (!day || day < since.get(id)) return;
    if (!days.has(id)) days.set(id, new Set());
    days.get(id).add(day);
  });
  return new Map(cards.map((c) => [c.id, days.get(c.id)?.size || 0]));
};

export const dayLabel = (count) => {
  if (count >= DAYS_TO_FINISH) return 'Done';
  if (!count) return 'New';
  return `Day ${count} of ${DAYS_TO_FINISH}`;
};
