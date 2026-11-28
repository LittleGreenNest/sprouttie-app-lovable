import test from 'node:test';
import assert from 'node:assert/strict';
import { createCardTranslator, mandarinCardReady } from '../src/utils/cardTranslation.js';
import { lookupCommonTranslation } from '../supabase/functions/_shared/commonMandarin.js';
const tick = () => new Promise(resolve => setTimeout(resolve, 5));
const translated = (english='new meaning') => ({chinese:'测试',english,pinyin:'cè shì'});
function setup(invoke, timeoutMs=100) {
  const results=[],states=[];
  const controller=createCardTranslator({invoke,onResult:v=>results.push(v),onState:v=>states.push(v),debounceMs:0,timeoutMs});
  return {controller,results,states};
}

test('Rabbit translates instantly, in both directions, without any network request', () => {
  let requests=0; const s=setup(async()=>{requests++;});
  s.controller.change('  Rabbit  ','en-to-zh');
  assert.deepEqual(s.results[0],{chinese:'兔子',pinyin:'tù zi',english:'rabbit'});
  assert.equal(requests,0);
  assert.deepEqual(lookupCommonTranslation('兔子'),s.results[0]);
  assert.equal(s.states.at(-1).loading,false);
});

test('older replies and their loading states cannot overwrite newer input',async()=>{
  const pending={}; const s=setup(term=>new Promise(resolve=>{pending[term]=resolve;}));
  s.controller.change('first unknown','en-to-zh');await tick();
  s.controller.change('second unknown','en-to-zh');await tick();
  pending['first unknown'](translated('old'));await tick();
  assert.equal(s.results.length,0);
  assert.equal(s.states.at(-1).loading,true);
  pending['second unknown'](translated('latest'));await tick();
  assert.equal(s.results.at(-1).english,'latest');
  assert.equal(s.states.at(-1).loading,false);
});

test('manual edit, mode change/reset and unmount cancellation discard late fills',async()=>{
  for(const reason of ['manual edit','mode change','reset','unmount']) {
    let resolve; const s=setup(()=>new Promise(r=>{resolve=r;}));
    s.controller.change(reason,'en-to-zh');await tick();s.controller.cancel();
    resolve(translated());await tick();
    assert.equal(s.results.length,0,reason);
    assert.equal(s.states.at(-1).loading,false);
  }
});

test('a stalled translation ends visibly, retries successfully and never caches failure',async()=>{
  let requests=0; const s=setup(()=>++requests===1?new Promise(()=>{}):Promise.resolve(translated()),10);
  s.controller.change('unlisted input','en-to-zh');await new Promise(r=>setTimeout(r,30));
  assert.equal(s.states.at(-1).loading,false);assert.match(s.states.at(-1).error,/Retry/);
  s.controller.change('unlisted input','en-to-zh',true);await tick();
  assert.equal(requests,2);assert.equal(s.results.length,1);
  s.controller.change('UNLISTED INPUT','en-to-zh');
  assert.equal(requests,2);assert.equal(s.results.length,2);
});

test('incomplete results are rejected and incomplete or busy Mandarin cards cannot save',async()=>{
  const s=setup(async()=>({chinese:'测试',english:'meaning'}));
  s.controller.change('unknown word','en-to-zh');await tick();
  assert.equal(s.results.length,0);assert.ok(s.states.at(-1).error);
  const complete={chinese:'兔子',english:'rabbit',pinyin:'tù zi',translating:false};
  assert.equal(mandarinCardReady(complete),true);
  for(const field of ['chinese','english','pinyin']) assert.equal(mandarinCardReady({...complete,[field]:''}),false);
  assert.equal(mandarinCardReady({...complete,translating:true}),false);
});

import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const {transformSync}=createRequire(import.meta.resolve('vite'))('esbuild');
async function backend(word, responses=[], direction='en-to-zh') {
  let handler;const calls=[];const budgets=[];
  const common={exports:{}};
  vm.runInNewContext(transformSync(fs.readFileSync('supabase/functions/_shared/commonMandarin.js','utf8'),{format:'cjs'}).code,{module:common,exports:common.exports});
  vm.runInNewContext(transformSync(fs.readFileSync('supabase/functions/translate-word/index.ts','utf8'),{loader:'ts',format:'cjs'}).code,{
    require:n=>n.includes('commonMandarin')?common.exports:{serve:fn=>{handler=fn;}},
    module:{exports:{}},exports:{},Deno:{env:{get:()=> 'test-only'}},Response,Request,Error,AbortController,
    setTimeout:(_fn,ms)=>{budgets.push(ms);return 1;},clearTimeout(){},console:{warn(){}},
    fetch:async(url,options)=>{calls.push(url);assert.ok(options.signal);return responses.shift()();},
  });
  const response=await handler(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({word,direction})}));
  return {status:response.status,body:await response.json(),calls,budgets};
}
const ai=value=>()=>Response.json({candidates:[{content:{parts:[{text:JSON.stringify(value)}]}}]});

test('backend Rabbit also bypasses Gemini and keeps all three fields',async()=>{
  const r=await backend('Rabbit');assert.equal(r.status,200);assert.equal(r.calls.length,0);assert.equal(r.body.pinyin,'tù zi');
});
test('backend falls back from busy light model and validates translation fields',async()=>{
  const r=await backend('unlisted',[()=>new Response('',{status:503}),ai(translated())]);
  assert.equal(r.status,200);assert.match(r.calls[0],/flash-lite-latest/);assert.match(r.calls[1],/flash-latest/);
  assert.deepEqual(r.budgets,[4000,4000]);assert.equal(r.body.chinese,'测试');
});
test('rate limits are not retried, and incomplete model output never becomes success',async()=>{
  const rate=await backend('unlisted',[()=>new Response('',{status:429})]);assert.equal(rate.status,429);assert.equal(rate.calls.length,1);
  const invalid=await backend('unlisted',[ai({chinese:'测试',english:'test'}),ai({chinese:'测试',english:'test'})]);assert.equal(invalid.status,504);
});
