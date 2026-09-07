/**
 * daily_tracking.flashcard_id is written as "<card uuid>:R<round>" by
 * SessionLogTracker (to dodge the user_id/flashcard_id/date unique index),
 * while CalendarGridView and older rows store a bare uuid. Always normalise
 * before joining against flashcards.id.
 */
export const cardIdFrom = (value) => {
  if (!value) return null;
  return String(value).split(':')[0];
};
