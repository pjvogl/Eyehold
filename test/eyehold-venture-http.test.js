'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { createVentures } = require('../sidecar/eyehold-ventures.js');
const { createTreasury } = require('../sidecar/eyehold-treasury.js');
const { createTrader } = require('../sidecar/eyehold-trader.js');
const { createVentureScore } = require('../sidecar/eyehold-venture-score.js');
const { etsyListingAdapter } = require('../sidecar/eyehold-etsy.js');
const { createVentureHttp } = require('../sidecar/eyehold-venture-http.js');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eyehold-venture-http-'));
const http = createVentureHttp({
  ventures: createVentures({ file: path.join(root, 'ventures.json'), now: () => 't' }),
  treasury: createTreasury({ file: path.join(root, 'treasury.json'), now: () => 't' }),
  trader: createTrader({ file: path.join(root, 'trader.json') }),
  score: createVentureScore({ file: path.join(root, 'score.json') }),
  etsy: etsyListingAdapter({ env: {} })
});
function request(method, body) {
  const req = Readable.from(body ? [JSON.stringify(body)] : []);
  req.method = method;
  let code = 0, out = '';
  const res = { writeHead: c => { code = c; }, end: s => { out = s; } };
  return http.handle(req, res).then(() => ({ code, body: JSON.parse(out) }));
}
(async () => {
  const board = await request('GET');
  assert.equal(board.body.etsy, 'not-connected');
  assert.equal(board.body.trader.liveBroker, false);
  assert.equal(board.body.crownsAreMoney, false);
  const held = await request('POST', { op: 'top-up', cents: 100, confirmed: false });
  assert.equal(held.code, 422);
  assert.equal(held.body.treasury.availableCents, 0);
  const listed = await request('POST', { op: 'etsy-list', confirmed: true, listing: { id: 'listing-1', title: 'Planner', description: 'A page.', priceCents: 500 } });
  assert.equal(listed.code, 422);
  assert.match(listed.body.error, /etsy-not-connected/);
  fs.rmSync(root, { recursive: true, force: true });
  console.log('Venture board reads freely and still refuses an unconfirmed or disconnected action');
})().catch(error => { console.error(error); process.exit(1); });
