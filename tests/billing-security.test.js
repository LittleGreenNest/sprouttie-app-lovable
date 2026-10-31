import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const { transformSync } = createRequire(import.meta.resolve('vite'))('esbuild');

function loadCheckout(user) {
  let handler, checkout;
  class Stripe {
    customers = { list: async () => ({ data: [{ id: 'owned', metadata: { supabase_user_id: 'parent' } }, { id: 'other', metadata: { supabase_user_id: 'someone-else' } }] }), create: async () => ({ id: 'new-owned' }) };
    checkout = { sessions: { create: async (options) => { checkout = options; return { url: 'https://checkout.stripe.com/test' }; } } };
  }
  const source = transformSync(readFileSync('supabase/functions/create-checkout/index.ts','utf8'), { loader: 'ts', format: 'cjs' }).code;
  vm.runInNewContext(source, {
    require: (name) => name.includes('stripe@') ? Stripe : name.includes('supabase-js') ? { createClient: () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) } }) } : { serve: fn => { handler = fn; } },
    Deno: { env: { get: () => 'test-only' } }, Response, Request, console: { log() {}, error() {} },
  });
  return { handler, get checkout() { return checkout; } };
}
const user = { id:'parent', email:'parent@example.invalid', email_confirmed_at:'2026-01-01' };
const request = body => new Request('https://example.invalid', { method:'POST', headers:{ Authorization:'Bearer test' }, body:JSON.stringify(body) });
test('checkout rejects arbitrary prices before creating a Stripe session', async () => {
  const fixture=loadCheckout(user);
  const response=await fixture.handler(request({priceId:'cheap-unapproved',planKey:'pro'}));
  assert.equal(response.status,400); assert.equal(fixture.checkout,undefined);
});
test('checkout derives Print from the approved price and keeps billing owned by this user', async () => {
  const fixture=loadCheckout(user);
  const response=await fixture.handler(request({priceId:'price_1TV5x9EVoum0YBjstZUa3WSq',planKey:'pro'}));
  assert.equal(response.status,200);
  assert.equal(fixture.checkout.customer,'owned');
  assert.equal(fixture.checkout.metadata.plan_key,'print');
  assert.match(fixture.checkout.success_url,/^https:\/\/sprouttie.online\//);
});
test('an unverified email cannot access Stripe checkout', async () => {
  const fixture=loadCheckout({...user,email_confirmed_at:null});
  assert.notEqual((await fixture.handler(request({priceId:'price_1TV5x9EVoum0YBjstZUa3WSq'}))).status,200);
  assert.equal(fixture.checkout,undefined);
});
const entitlementSource=transformSync(readFileSync('supabase/functions/stripe-webhook/entitlement.ts','utf8'),{loader:'ts',format:'esm'}).code;
const {patchForSubscription}=await import(`data:text/javascript;base64,${Buffer.from(entitlementSource).toString('base64')}`);
test('paid entitlement follows approved Stripe prices and payment status',()=>{
  assert.equal(patchForSubscription('active',['price_1TV5x9EVoum0YBjstZUa3WSq']).plan,'print');
  assert.equal(patchForSubscription('active',['unknown']).plan,'free');
  assert.equal(patchForSubscription('past_due',['price_1TV5x9EVoum0YBjstZUa3WSq']).plan,'free');
  assert.equal(patchForSubscription('canceled',[]).plan,'free');
});

function loadDeletion(failAt) {
  const events=[]; let handler;
  class Stripe {
    customers = { list: () => [{id:'owned',metadata:{supabase_user_id:'parent'}},{id:'unrelated',metadata:{supabase_user_id:'someone-else'}}] };
    subscriptions = { list: ({customer}) => { assert.equal(customer,'owned'); return [{id:'subscription',status:'active'}]; }, cancel: async () => { events.push('billing'); if(failAt==='billing') throw Error('billing failure'); } };
  }
  const admin = {
    auth: { getUser: async()=>({data:{user},error:null}), admin:{ signOut:async()=>{events.push('sessions');return {error:null};}, deleteUser:async()=>{events.push('account');return {error:null};} } },
    from(table) { return { select(){return this;}, eq(){return this;}, single:async()=>({data:{plan:'free',stripe_customer_id:'owned'},error:null}), delete(){ events.push('records');return {eq:async()=>({error:null})};} }; },
    storage: { from:()=>({ list:async()=> failAt==='media' ? {error:Error('storage failed')} : {data:[],error:null}, remove:async()=>({error:null}) }) },
  };
  const source=transformSync(readFileSync('supabase/functions/delete-account/index.ts','utf8'),{loader:'ts',format:'cjs'}).code;
  vm.runInNewContext(source,{ require:name=>name.includes('stripe@')?Stripe:name.includes('supabase-js')?{createClient:()=>admin}:{serve:fn=>{handler=fn;}},Deno:{env:{get:()=> 'test-only'}},Request,Response,console:{log(){},error(){}} });
  return {handler,events};
}
test('account deletion stops before records when billing cancellation fails',async()=>{
  const fixture=loadDeletion('billing'); const response=await fixture.handler(request({}));
  assert.equal(response.status,500);assert.equal((await response.json()).stage,'billing');assert.deepEqual(fixture.events,['billing']);
});
test('account deletion does not report success or delete records when media cleanup fails',async()=>{
  const fixture=loadDeletion('media');const response=await fixture.handler(request({}));
  assert.equal(response.status,500);assert.equal((await response.json()).stage,'media');assert.ok(!fixture.events.includes('records'));assert.ok(!fixture.events.includes('account'));
});
test('successful deletion cancels linked billing, removes records and revokes sessions before deleting login',async()=>{
  const fixture=loadDeletion();const response=await fixture.handler(request({}));
  assert.equal(response.status,200);assert.equal(fixture.events[0],'billing');assert.ok(fixture.events.includes('records'));assert.deepEqual(fixture.events.slice(-2),['sessions','account']);
});
