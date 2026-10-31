import test from 'node:test';
import assert from 'node:assert/strict';
import { withTimeout, fetchWithTimeout, CONNECTION_MESSAGE } from '../src/utils/requestTimeout.js';
import { countPracticeDays } from '../src/utils/practiceDays.js';
import { FREE_CARD_LIMIT } from '../src/utils/planLimits.js';

test('a stalled authentication operation times out with an actionable message', async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 15), { message: CONNECTION_MESSAGE });
  assert.equal(await withTimeout(Promise.resolve('signed-in'), 15), 'signed-in');
});

test('stalled HTTP requests are aborted, and caller cancellation is preserved', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_input, { signal }) => new Promise((_resolve, reject) => {
    if (signal.aborted) reject(new Error('aborted'));
    else signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });
  try {
    await assert.rejects(fetchWithTimeout('https://example.invalid', {}, 15), /aborted/);
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(fetchWithTimeout('https://example.invalid', { signal: controller.signal }, 15), /aborted/);
  } finally { globalThis.fetch = originalFetch; }
});

test('practice counts unique local days and survives gaps; ignores future and non-practice rows', () => {
  const now = new Date(2026, 9, 31, 12);
  const records = [
    { date: '2026-10-25', status: 'flashed' },
    { date: '2026-10-25', status: 'flashed' },
    { date: '2026-10-28', status: 'flashed' },
    { date: '2026-10-30', user_local_date: '2026-10-31', status: 'flashed' },
    { date: '2026-10-24', status: 'flashed' },
    { date: '2026-10-27', status: 'skipped' },
    { date: '2026-11-01', status: 'flashed' },
  ];
  assert.equal(countPracticeDays(records, now), 3);
  assert.equal(countPracticeDays([], now), 0);
  assert.equal(FREE_CARD_LIMIT, 50);
});

import { createFlashcardWriter } from '../src/utils/flashcardLimit.js';
function cardStore(plan, initialCount) {
  let count = initialCount;
  const client = { from(table) {
    let rows;
    const query = {
      select() { return query; },
      eq() { return query; },
      maybeSingle() { return Promise.resolve({ data: { plan }, error: null }); },
      insert(value) { rows = Array.isArray(value) ? value : [value]; return query; },
      single() { return Promise.resolve({ data: rows[0], error: null }); },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          if (rows) { count += rows.length; return { data: rows, error: null }; }
          return { count, error: null };
        }).then(resolve, reject);
      },
    };
    return query;
  } };
  return { client, get count() { return count; } };
}

test('two simultaneous additions at 49 cards cannot exceed 50 in the app', async () => {
  const store = cardStore('free', 49);
  const write = createFlashcardWriter(store.client);
  const results = await Promise.allSettled([write({ user_id: 'parent' }), write({ user_id: 'parent' })]);
  assert.equal(results[0].status, 'fulfilled');
  assert.equal(results[1].status, 'rejected');
  assert.match(results[1].reason.message, /50 flashcards/);
  assert.equal(store.count, 50);
});

test('imports respect remaining capacity without deleting existing cards; paid plans stay unlimited', async () => {
  const store = cardStore('free', 49);
  await assert.rejects(createFlashcardWriter(store.client)([{ user_id: 'parent' }, { user_id: 'parent' }]), /50 flashcards/);
  assert.equal(store.count, 49);
  const paid = cardStore('print', 150);
  await createFlashcardWriter(paid.client)([{ user_id: 'parent' }, { user_id: 'parent' }]);
  assert.equal(paid.count, 152);
});
