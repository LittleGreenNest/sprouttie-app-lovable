// Week boundaries in the device's own timezone.
//
// Several screens computed Monday with toISOString(), which converts to UTC
// first. In Singapore (UTC+8) that returned the previous day before 8am, so
// the review log and the weekly suggestions could disagree about which week
// it was.

export const toLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Monday of the week containing `date`, as YYYY-MM-DD. */
export const localWeekStart = (date = new Date()) => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = monday.getDay();
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
  return toLocalDateString(monday);
};

/** The weekly review is offered on Saturday and Sunday. */
export const isReviewDay = (date = new Date()) => date.getDay() === 0 || date.getDay() === 6;
