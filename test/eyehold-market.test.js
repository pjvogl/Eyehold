'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createMarket } = require('../sidecar/eyehold-market.js');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eyehold-market-'));
const market = createMarket({ file: path.join(root, 'market.json'), now: () => '2026-11-10T00:00:00.000Z' });
const calls = [];
const originalFetch = global.fetch;
global.fetch = (...args) => { calls.push(args); throw new Error('network'); };
try {
  const draft = { agentId: 'moonleaf', title: 'Field guide', description: 'A short guide to keeping a station ledger.', priceCents: 1200, channel: 'stripe-payment-link', deliverableRef: 'delivery:guide-1', computeCents: 35 };
  const made = market.propose(draft);
  assert.equal(made.listing.status, 'proposed');
  assert.equal(made.action.status, 'queued');
  assert.equal(made.action.kind, 'publish');
  assert.equal(calls.length, 0, 'a proposal does not touch the network');
  assert.equal(market.queue().length, 1);
  const again = createMarket({ file: path.join(root, 'market.json'), now: () => 'later' });
  assert.equal(again.queue()[0].listing.title, 'Field guide');
  assert.equal(again.reject(made.action.id).status, 'rejected');
  assert.equal(again.queue().length, 0);
  assert.throws(() => market.propose({ ...draft, priceCents: 10 }), /50 cents/);
  assert.throws(() => market.propose({ ...draft, computeCents: -1 }), /compute/);
  assert.equal(calls.length, 0);
  console.log('Market outbox keeps sellable drafts queued and offline');
} finally {
  global.fetch = originalFetch;
  fs.rmSync(root, { recursive: true, force: true });
}
