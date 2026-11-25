'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createResearch } = require('../sidecar/eyehold-research.js');
const { createVentures } = require('../sidecar/eyehold-ventures.js');
const { createVentureDesk } = require('../sidecar/eyehold-venture-desk.js');
const { createMarket } = require('../sidecar/eyehold-market.js');
const { createTreasury } = require('../sidecar/eyehold-treasury.js');
const { createVentureScore } = require('../sidecar/eyehold-venture-score.js');
const { createFinanceStore } = require('../sidecar/eyehold-finance-store.js');
const { createTrader } = require('../sidecar/eyehold-trader.js');
const { stripePaymentLinkAdapter } = require('../sidecar/eyehold-market-channels.js');
const { createCycle } = require('../sidecar/eyehold-cycle.js');
const { toolsFor } = require('../sidecar/eyehold-tools.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eyehold-cycle-'));
const now = () => '2026-11-25T23:00:00.000Z';
function deps(name) {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  return {
    research: createResearch({ file: path.join(dir, 'research.json'), now }),
    ventures: createVentures({ file: path.join(dir, 'ventures.json'), now }),
    desk: createVentureDesk({ file: path.join(dir, 'desk.json'), now }),
    market: createMarket({ file: path.join(dir, 'market.json'), now }),
    treasury: createTreasury({ file: path.join(dir, 'treasury.json'), now }),
    score: createVentureScore({ file: path.join(dir, 'score.json') }),
    finance: createFinanceStore({ file: path.join(dir, 'finance.json'), now }),
    trader: createTrader({ file: path.join(dir, 'trader.json') }),
    file: path.join(dir, 'cycle.json')
  };
}
function liveFetch(url) {
  const stripePath = url.replace('https://api.stripe.com', '');
  const payload = stripePath === '/v1/products' ? { id: 'prod_live', livemode: true }
    : stripePath === '/v1/prices' ? { id: 'price_live', livemode: true }
    : { id: 'plink_live', url: 'https://buy.stripe.com/plink_live', livemode: true };
  return Promise.resolve({ ok: true, json: async () => payload });
}
const parts = deps('shop');
let briefFails = 2;
const cycle = createCycle({
  ...parts,
  now,
  stripe: { adapter: stripePaymentLinkAdapter({ mode: 'live' }), secret: 'rk_live_placeholder', fetchImpl: liveFetch },
  tools: {
    async briefs() {
      if (briefFails > 0) { briefFails -= 1; throw new Error('research source unavailable'); }
      return [{ rank: 1, title: 'Ledger guide', ventureType: 'etsy-shop', expectedRevenueCents: 2000, upfrontCostCents: 100, risk: 'low', timeToFirstDollarDays: 7, sources: ['local catalog'] }];
    },
    async findings() { return { findings: 'Price the guide at five dollars.', sources: ['local catalog'] }; },
    async produce() { return 'A one-page ledger guide.'; },
    async review() { return true; }
  }
});
assert.deepEqual(toolsFor('trader'), ['research', 'draft', 'review', 'paper-trade']);
assert.equal(toolsFor('trader').includes('stripe-payment-link'), false);
cycle.start({ managerId: 'eye', researcherId: 'raven', question: 'What can earn the first dollar?' });
(async () => {
  let report = null;
  for (let i = 0; i < 12 && (!report || !['awaiting-receipt', 'blocked', 'done', 'paper-complete'].includes(report.run.phase)); i += 1) {
    report = await cycle.tick();
  }
  assert.equal(report.run.phase, 'awaiting-receipt');
  assert.equal(report.run.etsy, 'not-connected');
  assert.equal(report.run.paymentUrl, 'https://buy.stripe.com/plink_live');
  assert.equal(report.run.attempts.researching, 2);
  assert.equal(report.externalCharges, false);
  const resumed = createCycle({
    ...parts,
    now,
    stripe: { adapter: stripePaymentLinkAdapter({ mode: 'live' }), secret: 'rk_live_placeholder', fetchImpl: liveFetch },
    tools: {
      async briefs() { throw new Error('unused'); },
      async findings() { throw new Error('unused'); },
      async produce() { throw new Error('unused'); },
      async review() { throw new Error('unused'); }
    }
  });
  const waiting = await resumed.tick();
  assert.equal(waiting.run.phase, 'awaiting-receipt');
  resumed.noteReceipt({ id: 'stripe:cs_live_local', verified: true, livemode: true, currency: 'USD', cents: 2000, computeCents: 0 });
  const finished = await resumed.tick();
  assert.equal(finished.run.phase, 'done');
  assert.equal(finished.treasury.spentCents, 100);
  assert.equal(finished.treasury.availableCents, 1900);
  const deepforge = finished.crowns.find(row => row.agentId === 'deepforge');
  const raven = finished.crowns.find(row => row.agentId === 'raven');
  assert.equal(deepforge.crowns, 16);
  assert.equal(raven.crowns, 4);
  assert.equal(deepforge.practicePoints, 0);
  const paperParts = deps('paper');
  const paper = createCycle({
    ...paperParts,
    now,
    stripe: { adapter: stripePaymentLinkAdapter(), secret: 'rk_test_placeholder', fetchImpl: liveFetch },
    tools: {
      async briefs() { return [{ rank: 1, title: 'Paper book', ventureType: 'trader', expectedRevenueCents: 100, upfrontCostCents: 0, risk: 'medium', timeToFirstDollarDays: 1, sources: ['paper tape'] }]; },
      async findings() { return { findings: 'Stay on paper.', sources: ['paper tape'] }; },
      async produce() { return 'Buy one paper unit and sell it higher.'; },
      async review() { return true; }
    }
  });
  paper.start({ managerId: 'eye', researcherId: 'raven', question: 'Should the trader go live?' });
  let paperReport = null;
  for (let i = 0; i < 12 && (!paperReport || paperReport.run.phase !== 'paper-complete'); i += 1) paperReport = await paper.tick();
  assert.equal(paperReport.run.phase, 'paper-complete');
  assert.equal(paperReport.trader ? paperReport.trader : paperParts.trader.status('deepforge').mode, 'paper');
  assert.equal(paperParts.trader.status('deepforge').liveBroker, false);
  assert.equal(paperParts.trader.status('deepforge').graduated, false);
  const practice = paperReport.crowns.find(row => row.agentId === 'deepforge');
  assert.equal(practice.crowns, 0);
  assert.equal(practice.practicePoints, 1);
  fs.rmSync(root, { recursive: true, force: true });
  console.log('Unattended venture cycle retries, survives a restart, pays Crowns from a verified receipt, and leaves the trader on paper');
})().catch(error => { console.error(error); process.exit(1); });
