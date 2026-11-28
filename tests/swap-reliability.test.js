import test from 'node:test';
import assert from 'node:assert/strict';
import { replacementLibrary } from '../src/components/thisweek/replacementLibrary.js';
import { buildWordChoices } from '../src/components/thisweek/wordChoices.js';
import { saveSwap } from '../src/components/thisweek/saveSwap.js';

test('a new Mandarin account can pick complete words immediately with no AI or saved cards', () => {
  const suggestion = { word: 'car (汽车 qì chē)', category: 'Vehicles and Transport' };
  const choices = buildWordChoices([], [], [suggestion.word], replacementLibrary(suggestion));
  assert.ok(choices.length >= 20);
  assert.equal(choices[0].front, '巴士');
  assert.ok(choices.every(c => c.english && c.pinyin && /[㐀-鿿]/.test(c.front)));
  assert.ok(!choices.some(c => c.front === '汽车'));
  for (const query of ['兔子', 'rabbit', 'tù zi']) {
    assert.ok(choices.some(c => `${c.front} ${c.pinyin} ${c.english}`.includes(query)));
  }
});

test('library respects English plans, parent context and pending exclusions', () => {
  const library = replacementLibrary({ word: 'cow', category: 'farm' });
  assert.equal(library[0], 'rabbit');
  assert.ok(library.every(w => !/[㐀-鿿]/.test(w)));
  const choices = buildWordChoices(['rabbit'], [], ['rabbit', 'cow'], library);
  assert.ok(!choices.some(c => ['rabbit','cow'].includes(c.front)));
});

function clientFor(rows) {
  return { from(table) {
    assert.equal(table, 'weekly_suggestions');
    return { update(patch) {
      const filters = {};
      const query = { eq(k,v) { filters[k]=v; return query; }, select() { return query; }, async single() {
        const matches = rows.filter(row => Object.entries(filters).every(([k,v]) => row[k]===v));
        if (matches.length !== 1) return {data:null,error:new Error('No row')};
        Object.assign(matches[0],patch); return {data:{id:matches[0].id},error:null};
      } };return query;
    } };
  } };
}

test('confirmation persists just the selected pending word and clears its stale rationale', async () => {
  const rows = [{id:'a',user_id:'parent',status:'pending_review',word:'old',reason:'old reason',activity_tip:'old tip'}, {id:'b',user_id:'parent',status:'pending_review',word:'unchanged'}];
  const client = clientFor(rows);
  // Selecting then cancelling causes no call to saveSwap and leaves stored rows unchanged.
  const selected = 'rabbit (兔子 tù zi)';
  assert.equal(rows[0].word, 'old');
  await saveSwap(client,'parent','a',selected);
  assert.equal(rows[0].word, selected);
  assert.equal(rows[0].reason,null);
  assert.equal(rows[0].activity_tip,null);
  assert.equal(rows[1].word,'unchanged');
  assert.equal(JSON.parse(JSON.stringify(rows))[0].word,selected);
});

test('zero-row, wrong-owner and already-accepted updates fail instead of claiming success', async () => {
  const rows = [{id:'a',user_id:'other',status:'pending_review',word:'old'}, {id:'b',user_id:'parent',status:'accepted',word:'keep'}];
  for (const id of ['a','b','missing']) await assert.rejects(saveSwap(clientFor(rows),'parent',id,'new'));
  assert.deepEqual(rows.map(r => r.word),['old','keep']);
});

import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const { transformSync } = createRequire(import.meta.resolve('vite'))('esbuild');

async function swapResponse(alternatives, {timeout=false} = {}) {
  let handler, requestBudget;
  const normal = { exports: {} };
  vm.runInNewContext(transformSync(fs.readFileSync('supabase/functions/generate-autopilot-suggestions/words.ts','utf8'),{loader:'ts',format:'cjs'}).code,{module:normal,exports:normal.exports,Error});
  const db = {auth:{getUser:async()=>({data:{user:{id:'parent'}},error:null})},from(table) {
    let query;query=new Proxy({}, {get(_t,k) {
      if(k==='then') return resolve=>resolve({data:table==='profiles'?{target_language:'mandarin'}:table==='flashcards'?[{front:'火车'}]:[],error:null});
      return ()=>query;
    }});return query;
  }};
  vm.runInNewContext(transformSync(fs.readFileSync('supabase/functions/generate-swap-alternatives/index.ts','utf8'),{loader:'ts',format:'cjs'}).code,{
    require:name=>name.includes('supabase-js')?{createClient:()=>db}:name.includes('words.ts')?normal.exports:{serve:fn=>{handler=fn;}},
    Deno:{env:{get:()=> 'test-only'}}, Response, Request, Error, console:{error(){}},
    AbortSignal:{timeout:ms=>{requestBudget=ms;return new AbortController().signal;}},
    fetch:async(_url,options)=>{assert.ok(options.signal);if(timeout){const e=new Error('timed out');e.name='TimeoutError';throw e;}return Response.json({candidates:[{content:{parts:[{text:JSON.stringify(alternatives)}]}}]});},
  });
  const response=await handler(new Request('https://example.invalid',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({word:'car (汽车 qì chē)',category:'transport',excludedWords:['bus (巴士 bā shì)']})}));
  return {status:response.status,body:await response.json(),requestBudget};
}

test('AI swaps retain complete translations and exclude plan, saved and repeated words',async()=>{
  const result=await swapResponse([
    {chinese:'汽车',english:'car',pinyin:'qì chē'},
    {chinese:'巴士',english:'bus',pinyin:'bā shì'},
    {chinese:'火车',english:'train',pinyin:'huǒ chē'},
    {chinese:'船',english:'boat',pinyin:'chuán'},
    {chinese:'船',english:'ship',pinyin:'chuán'},
    {chinese:'飞机',english:'plane'},
  ]);
  assert.equal(result.status,200);
  assert.deepEqual(result.body.alternatives,['boat (船 chuán)']);
  assert.equal(result.requestBudget,8000);
});

test('stalled AI swaps return a bounded error instead of an empty successful list',async()=>{
  const result=await swapResponse([],{timeout:true});
  assert.equal(result.status,504);
  assert.ok(result.body.error);
});
