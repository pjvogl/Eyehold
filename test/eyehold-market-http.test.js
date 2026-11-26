'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { createMarketHttp } = require('../sidecar/eyehold-market-http.js');
const { createFinanceStore } = require('../sidecar/eyehold-finance-store.js');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eyehold-market-http-'));
const calls = [];
const http = createMarketHttp({
  file: path.join(root, 'market.json'),
  finance: createFinanceStore({ file: path.join(root, 'finance.json'), now: () => 't' }),
  now: () => 't',
  secret: () => 'rk_test_placeholder',
  fetchImpl: async (url) => {
    calls.push(url);
    const payload = url.endsWith('/products') ? { id: 'prod_test', livemode: false }
      : url.endsWith('/prices') ? { id: 'price_test', livemode: false }
      : { id: 'plink_test', url: 'https://buy.stripe.test/plink_test', livemode: false };
    return { ok: true, json: async () => payload };
  }
});
function request(method, body) {
  const req = Readable.from(body ? [JSON.stringify(body)] : []);
  req.method = method;
  let code = 0, out = '';
  const res = { writeHead: c => { code = c; }, end: s => { out = s; } };
  return http.handle(req, res).then(() => ({ code, body: out ? JSON.parse(out) : null }));
}
(async () => {
  assert.equal((await request('GET')).body.queue.length, 0);
  const proposed = await request('POST', { op: 'propose', listing: { agentId: 'moonleaf', title: 'Guide', description: 'How to keep a ledger.', priceCents: 900, channel: 'stripe-payment-link', deliverableRef: 'delivery:1', computeCents: 10 } });
  assert.equal(proposed.code, 200);
  assert.equal(calls.length, 0);
  const actionId = proposed.body.action.id;
  const held = await request('POST', { op: 'publish', actionId, confirmed: false });
  assert.equal(held.code, 422);
  assert.equal(calls.length, 0);
  const published = await request('POST', { op: 'publish', actionId, confirmed: true });
  assert.equal(published.code, 200);
  assert.equal(calls.length, 3);
  assert.equal(published.body.listing.status, 'published');
  fs.rmSync(root, { recursive: true, force: true });
  console.log('Market HTTP publishes only the confirmed owner action');
})().catch(error => { console.error(error); process.exit(1); });
