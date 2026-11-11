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
const { createResearch } = require('../sidecar/eyehold-research.js');
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
  const { createFinanceStore } = require('../sidecar/eyehold-finance-store.js');
  const researched = createVentureHttp({
    ventures: createVentures({ file: path.join(root, 'ventures-2.json'), now: () => 't' }),
    treasury: createTreasury({ file: path.join(root, 'treasury-2.json'), now: () => 't' }),
    trader: createTrader({ file: path.join(root, 'trader-2.json') }),
    score: createVentureScore({ file: path.join(root, 'score-2.json') }),
    research: createResearch({ file: path.join(root, 'research.json'), now: () => 't' }),
    finance: createFinanceStore({ file: path.join(root, 'finance.json'), now: () => 't' }),
    etsy: etsyListingAdapter({ env: {} })
  });
  function ask(body) {
    const req = Readable.from([JSON.stringify(body)]);
    req.method = 'POST';
    let code = 0, out = '';
    const res = { writeHead: c => { code = c; }, end: s => { out = s; } };
    return researched.handle(req, res).then(() => JSON.parse(out));
  }
  const openedAsk = await ask({ op: 'research-ask', managerId: 'eye', question: 'Where is the first dollar?' });
  await ask({ op: 'research-briefs', requestId: openedAsk.request.id, researcherId: 'raven', briefs: [{ rank: 1, title: 'Planners', ventureType: 'etsy-shop', expectedRevenueCents: 1000, upfrontCostCents: 100, risk: 'low', timeToFirstDollarDays: 10, sources: ['Etsy search'] }] });
  await ask({ op: 'research-accept', requestId: openedAsk.request.id, rank: 1, managerId: 'eye' });
  await ask({ op: 'research-open', requestId: openedAsk.request.id, rank: 1, agentId: 'moonleaf' });
  const job = await ask({ op: 'research-request', agentId: 'moonleaf', ventureId: 'etsy-shop', topic: 'competitor pricing' });
  const answered = await ask({ op: 'research-answer', requestId: job.request.id, researcherId: 'raven', findings: 'Price near 8 dollars.', sources: ['Shop listings'] });
  assert.equal(answered.request.ventureId, 'etsy-shop');
  const settled = await ask({ op: 'settle', confirmedReviewed: true, agentId: 'moonleaf', ventureId: 'etsy-shop', sale: { id: 'stripe:pi_research', verified: true, livemode: false, currency: 'USD', cents: 1000, computeCents: 0 } });
  assert.equal(settled.researcherCrowns, 2);
  assert.equal(settled.crowns, 8);
  fs.rmSync(root, { recursive: true, force: true });
  console.log('Venture board reads freely and still refuses an unconfirmed or disconnected action');
})().catch(error => { console.error(error); process.exit(1); });
