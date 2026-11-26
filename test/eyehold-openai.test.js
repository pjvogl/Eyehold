'use strict';
const assert = require('node:assert/strict');
const { openaiTools, chargeDailyCap, runScheduledCycle, DEFAULT_MODEL } = require('../sidecar/eyehold-openai.js');

function payload(text, sources, tokens) {
  return {
    output: [{ type: 'message', content: [{ type: 'output_text', text, annotations: (sources || []).map(url => ({ type: 'url_citation', url })) }] }],
    usage: { total_tokens: tokens || 100 }
  };
}
function fakeFetch(body) {
  return async () => ({ ok: true, json: async () => body });
}
const env = { OPENAI_API_KEY: 'sk-test-not-real', OPENAI_MODEL: 'gpt-4o-mini' };

(async () => {
  assert.equal(DEFAULT_MODEL, 'gpt-4o-mini');
  const briefs = await openaiTools(env, { fetchImpl: fakeFetch(payload('[{"rank":1,"title":"Guide","ventureType":"digital-services","expectedRevenueCents":500,"upfrontCostCents":0,"risk":"low","timeToFirstDollarDays":3,"sources":["https://example.com/guide"]}]', ['https://example.com/guide'], 120)) }).briefs({ question: 'first dollar' });
  assert.equal(briefs[0].sources[0], 'https://example.com/guide');
  await assert.rejects(openaiTools(env, { fetchImpl: fakeFetch(payload('no citations', [], 10)) }).findings({ topic: 'price', ventureId: 'etsy-shop' }), /no-sources/);
  const kv = { store: new Map(), async get(k) { return this.store.get(k) || null; }, async put(k, v) { this.store.set(k, v); } };
  const capped = await chargeDailyCap(kv, { OPENAI_DAILY_TOKEN_CAP: 50, OPENAI_DAILY_USD_CAP_CENTS: 200 }, 40, Date.parse('2026-11-26T00:00:00Z'));
  assert.equal(capped.ok, true);
  const blocked = await chargeDailyCap(kv, { OPENAI_DAILY_TOKEN_CAP: 50, OPENAI_DAILY_USD_CAP_CENTS: 200 }, 20, Date.parse('2026-11-26T01:00:00Z'));
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'daily-cap');
  const ran = await runScheduledCycle(Object.assign({ BILLING_KV: kv }, env), { fetchImpl: fakeFetch(payload('[{"rank":1,"title":"Guide","ventureType":"digital-services","expectedRevenueCents":500,"upfrontCostCents":0,"risk":"low","timeToFirstDollarDays":3,"sources":["https://example.com/guide"]}]', ['https://example.com/guide'], 10)), now: Date.parse('2026-11-27T00:00:00Z') });
  assert.equal(ran.purchases, false);
  assert.equal(ran.model, 'gpt-4o-mini');
  console.log('OpenAI research cites sources, drafts stay unsold, and the daily cap holds');
})().catch(error => { console.error(error); process.exit(1); });
