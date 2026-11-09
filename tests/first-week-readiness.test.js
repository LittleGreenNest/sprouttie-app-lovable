import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const { transformSync, buildSync } = createRequire(import.meta.resolve('vite'))('esbuild');

const source = fs.readFileSync('supabase/functions/generate-autopilot-suggestions/index.ts', 'utf8');
const interestModule = { exports: {} };
vm.runInNewContext(transformSync(fs.readFileSync('supabase/functions/generate-autopilot-suggestions/interests.ts', 'utf8'), { loader: 'ts', format: 'cjs' }).code, { module: interestModule, exports: interestModule.exports });
const planModule = { exports: {} };
vm.runInNewContext(buildSync({ entryPoints: ['src/utils/initialWeekPlan.js'], bundle: true, write: false, platform: 'node', format: 'cjs' }).outputFiles[0].text, { module: planModule, exports: planModule.exports });
const words = ['bus (巴士 bā shì)', 'truck (卡车 kǎ chē)', 'train (火车 huǒ chē)', 'car (汽车 qì chē)', 'boat (船 chuán)'];
const success = () => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ theme: 'Vehicles', words: words.map(word => ({ word, reason: 'You mentioned vehicles.', activity_tip: 'Name it outdoors.' })) }) }] } }] });

async function generate(onboarded, responses) {
  let handler;
  const calls = [];
  let saved = [];
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: 'test-family', user_metadata: {} } }, error: null }) },
    from(table) {
      let query;
      query = new Proxy({}, { get(_target, key) {
        if (key === 'then') return resolve => resolve({ data: table === 'profiles' ? { onboarding_completed: onboarded, target_language: 'mandarin', child_interests: 'buses and trucks', child_age_band: '2-3' } : [], error: null });
        return (...args) => { if (key === 'insert') saved = args[0]; return query; };
      } });
      return query;
    },
  };
  vm.runInNewContext(transformSync(source, { loader: 'ts', format: 'cjs' }).code, {
    require: name => name.includes('supabase-js') ? { createClient: () => supabase } : name.includes('interests') ? interestModule.exports : { serve: fn => { handler = fn; } },
    Deno: { env: { get: () => 'test-only' } }, Response, Request, AbortSignal,
    console: { log() {}, warn() {}, error() {} }, setTimeout: fn => { fn(); },
    fetch: async url => { calls.push(url); return responses.shift()(); },
  });
  const response = await handler(new Request('https://example.invalid', { method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify({ numSets: 1, weekStart: '2026-11-09' }) }));
  return { status: response.status, body: await response.json(), calls, saved };
}

test('onboarding tries the lighter model first and returns the saved words to the screen', async () => {
  const result = await generate(false, [success]);
  assert.equal(result.status, 200);
  assert.match(result.calls[0], /gemini-flash-lite-latest/);
  assert.equal(result.body.suggestions.length, 5);
  assert.equal(result.body.suggestions[0].word, result.saved[0].word);
  assert.equal(result.body.suggestions[0].activity, 'Name it outdoors.');
});

test('new-family fallback still works when the lighter model is busy', async () => {
  const result = await generate(false, [() => new Response('busy', { status: 503 }), success]);
  assert.equal(result.status, 200);
  assert.match(result.calls[1], /gemini-flash-latest/);
});

test('existing families retain the primary model with a fast fallback', async () => {
  const result = await generate(true, [() => { throw Error('timeout'); }, success]);
  assert.equal(result.status, 200);
  assert.match(result.calls[0], /gemini-flash-latest/);
  assert.match(result.calls[1], /gemini-flash-lite-latest/);
});

test('exhausted AI requests return failure and do not save an empty plan', async () => {
  const result = await generate(false, [() => { throw Error('timeout'); }, () => { throw Error('timeout'); }]);
  assert.equal(result.status, 500);
  assert.equal(result.saved.length, 0);
});

test('onboarding cards keep Chinese, pinyin and English separate; pinyin does not make a phrase', () => {
  const plan = planModule.exports.buildInitialWeekPlan(words.map(word => ({ word })), 'Vehicles', null, 1);
  assert.equal(plan.sets[0].words[0].word, '巴士');
  assert.equal(plan.sets[0].words[0].back, 'bus');
  assert.equal(plan.sets[0].words[0].pinyin, 'bā shì');
  assert.ok(plan.sets[0].words.every(word => !word.is_phrase));
});
