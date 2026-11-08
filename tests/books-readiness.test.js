import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const { transform } = createRequire(import.meta.resolve('vite'))('esbuild');

const page = fs.readFileSync(new URL('../src/components/storybooks/BookRecommendations.jsx', import.meta.url), 'utf8');
const backend = fs.readFileSync(new URL('../supabase/functions/recommend-books/index.ts', import.meta.url), 'utf8');
const wordSource = fs.readFileSync(new URL('../src/components/thisweek/weekWords.js', import.meta.url), 'utf8');
const helpers = vm.createContext({});
vm.runInContext(wordSource.replaceAll('export const ', 'const ') + '\n' +
  page.slice(page.indexOf('const dedupeWords'), page.indexOf('const colorClasses')) +
  '\nthis.dedupe = dedupeWords; this.languages = detectLanguages;', helpers);

test('pinyin does not imply Hokkien, but explicit family choices do', () => {
  assert.deepEqual(Array.from(helpers.languages([{ front: '鸟 niǎo', back: 'bird' }], [], {})), ['english', 'mandarin']);
  assert.ok(helpers.languages([{ folder: 'Hokkien' }], [], {}).includes('hokkien'));
  assert.ok(helpers.languages([], [], { target_language: 'hokkien' }).includes('hokkien'));
});

test('bilingual word variants count once without losing distinct words', () => {
  assert.deepEqual(Array.from(helpers.dedupe(['sun', 'sun (太阳 tài yáng)', 'Sun', '鸟', '鸟 (niǎo)', '', null, 'bus'])), ['sun (太阳 tài yáng)', '鸟', 'bus']);
});

const book = { title: 'Test Book', author: 'Test Author', language: 'English', ageRange: '2-3', matchingWords: ['bus'], description: 'Test fixture', coverColor: 'green' };
async function runEndpoint(responses) {
  const calls = [];
  const budgets = [];
  let handler;
  const transformed = await transform(backend.replace(/^import .*\n/, ''), { loader: 'ts', format: 'cjs' });
  vm.runInNewContext(transformed.code, {
    serve: fn => { handler = fn; },
    Deno: { env: { get: () => 'test-only' } },
    Response, console: { log() {}, warn() {}, error() {} },
    AbortSignal: { timeout(ms) { budgets.push(ms); return AbortSignal.timeout(ms); } },
    setTimeout: fn => { fn(); },
    fetch: async (url) => { calls.push(url); return responses.shift()(); },
  });
  const result = await handler({ method: 'POST', json: async () => ({ words: ['bus'] }) });
  return { status: result.status, body: await result.json(), calls, budgets };
}
const success = () => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ books: [book] }) }] } }] });

test('busy primary model retries then returns fallback recommendations within the client budget', async () => {
  const result = await runEndpoint([() => new Response('busy', { status: 503 }), () => new Response('busy', { status: 503 }), success]);
  assert.equal(result.status, 200);
  assert.equal(result.body.books[0].title, book.title);
  assert.match(result.calls[2], /gemini-flash-lite-latest/);
  const clientBudget = Number(page.match(/REQUEST_TIMEOUT_MS = (\d+)/)[1]);
  assert.ok(result.budgets.reduce((a, b) => a + b, 0) + 2000 + 5000 < clientBudget);
});

test('network timeouts recover through fallback; exhausted attempts return an error', async () => {
  const timeout = () => { throw new Error('timeout'); };
  assert.equal((await runEndpoint([timeout, timeout, success])).status, 200);
  const failed = await runEndpoint([timeout, timeout, timeout]);
  assert.equal(failed.status, 500);
  assert.match(failed.body.error, /try again/i);
});

test('rate limits return immediately without retrying', async () => {
  const result = await runEndpoint([() => new Response('rate limited', { status: 429 })]);
  assert.equal(result.status, 429);
  assert.equal(result.calls.length, 1);
});
