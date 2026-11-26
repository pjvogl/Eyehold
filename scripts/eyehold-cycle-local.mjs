#!/usr/bin/env node
/* Local unattended venture cycle. Uses an in-process Stripe mock.
 * No network, no charge, no Cloudflare, and no live broker.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
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

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eyehold-cycle-local-'));
const now = () => '2026-11-25T23:40:00.000Z';
const stripeCalls = [];
function liveFetch(url) {
  assert.equal(String(url).startsWith('https://api.stripe.com/'), true);
  stripeCalls.push(url);
  const stripePath = url.replace('https://api.stripe.com', '');
  const payload = stripePath === '/v1/products' ? { id: 'prod_local', livemode: true }
    : stripePath === '/v1/prices' ? { id: 'price_local', livemode: true }
    : { id: 'plink_local', url: 'https://buy.stripe.com/plink_local', livemode: true };
  return Promise.resolve({ ok: true, json: async () => payload });
}
function build(dir) {
  return {
    research: createResearch({ file: path.join(dir, 'research.json'), now }),
    ventures: createVentures({ file: path.join(dir, 'ventures.json'), now }),
    desk: createVentureDesk({ file: path.join(dir, 'desk.json'), now }),
    market: createMarket({ file: path.join(dir, 'market.json'), now }),
    treasury: createTreasury({ file: path.join(dir, 'treasury.json'), now }),
    score: createVentureScore({ file: path.join(dir, 'score.json') }),
    finance: createFinanceStore({ file: path.join(dir, 'finance.json'), now }),
    trader: createTrader({ file: path.join(dir, 'trader.json') }),
    file: path.join(dir, 'cycle.json'),
    now,
    stripe: { adapter: stripePaymentLinkAdapter({ mode: 'live' }), secret: 'rk_live_placeholder', fetchImpl: liveFetch },
    tools: {
      async briefs() {
        return [{ rank: 1, title: 'Ledger guide', ventureType: 'etsy-shop', expectedRevenueCents: 2000, upfrontCostCents: 100, risk: 'low', timeToFirstDollarDays: 7, sources: ['local catalog'] }];
      },
      async findings() { return { findings: 'Price the guide at five dollars.', sources: ['local catalog'] }; },
      async produce() { return 'A one-page ledger guide.'; },
      async review() { return true; }
    }
  };
}
const first = createCycle(build(root));
first.start({ managerId: 'eye', researcherId: 'raven', question: 'What can earn the first dollar?' });
let report = null;
for (let i = 0; i < 12 && (!report || report.run.phase !== 'awaiting-receipt'); i += 1) report = await first.tick();
assert.equal(report.run.phase, 'awaiting-receipt');
const restarted = createCycle(build(root));
const waiting = await restarted.tick();
assert.equal(waiting.run.phase, 'awaiting-receipt');
restarted.noteReceipt({ id: 'stripe:cs_live_local_fixture', verified: true, livemode: true, currency: 'USD', cents: 2000, computeCents: 0 });
const finished = await restarted.tick();
assert.equal(finished.run.phase, 'done');
assert.equal(finished.externalCharges, false);
const summary = {
  charged: false,
  stripe: 'mock',
  stripeCalls: stripeCalls.length,
  phase: finished.run.phase,
  etsy: finished.run.etsy,
  paymentUrl: finished.run.paymentUrl,
  crowns: finished.crowns,
  treasurySpentCents: finished.treasury.spentCents,
  treasuryAvailableCents: finished.treasury.availableCents,
  restarted: true
};
console.log(JSON.stringify(summary, null, 2));
fs.rmSync(root, { recursive: true, force: true });
