import { toLocalDateString } from './week.js';

// Count dates, not rows or consecutive days. A missed day never resets progress.
export function countPracticeDays(records, now = new Date()) {
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  since.setDate(since.getDate() - 6);
  const start = toLocalDateString(since);
  const end = toLocalDateString(now);
  return new Set((records || [])
    .filter((r) => r.status === 'flashed')
    .map((r) => r.user_local_date || r.date)
    .filter((d) => d && d >= start && d <= end)).size;
}
