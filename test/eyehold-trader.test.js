'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createTrader, createBrokerAdapter } = require('../sidecar/eyehold-trader.js');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eyehold-trader-'));
const trader = createTrader({ file: path.join(root, 'trader.json') });
const calls = [];
const original = global.fetch;
global.fetch = (...args) => { calls.push(args); throw new Error('network'); };
try {
  assert.throws(() => trader.paperFill({ agentId: 'forge', symbol: 'ACME', side: 'buy', qty: 100, priceCents: 200 }), /position limit/);
  const buy = trader.paperFill({ agentId: 'forge', symbol: 'ACME', side: 'buy', qty: 2, priceCents: 100 });
  assert.equal(buy.simulated, true);
  assert.equal(buy.crowns, 0);
  assert.equal(buy.positionCents, 200);
  const sold = trader.paperFill({ agentId: 'forge', symbol: 'ACME', side: 'sell', qty: 2, priceCents: 150 });
  assert.equal(sold.pnlCents, 100);
  assert.throws(() => trader.graduate('forge', { confirmed: true }), /not good enough/);
  trader.paperFill({ agentId: 'loss', symbol: 'ACME', side: 'buy', qty: 40, priceCents: 100 });
  assert.throws(() => trader.paperFill({ agentId: 'loss', symbol: 'ACME', side: 'sell', qty: 40, priceCents: 40 }), /max loss/);
  assert.equal(trader.status('loss').pnlCents, 0);
  for (let i = 0; i < 2; i++) {
    trader.paperFill({ agentId: 'forge', symbol: 'ACME', side: 'buy', qty: 1, priceCents: 100 });
    trader.paperFill({ agentId: 'forge', symbol: 'ACME', side: 'sell', qty: 1, priceCents: 150 });
  }
  assert.throws(() => trader.graduate('forge', { confirmed: false }), /owner-confirmation-required/);
  const graduated = trader.graduate('forge', { confirmed: true });
  assert.equal(graduated.mode, 'real-budget');
  assert.equal(graduated.liveBroker, false);
  assert.equal(graduated.realBudgetCents, 2500);
  assert.throws(() => trader.paperFill({ agentId: 'forge', symbol: 'ACME', side: 'buy', qty: 1, priceCents: 100 }), /paper mode/);
  const broker = createBrokerAdapter({ id: 'paper-broker' });
  assert.throws(() => broker.liveOrder({}), /no live broker/);
  assert.equal(calls.length, 0);
  console.log('Trader stays on paper until the owner graduates good results');
} finally {
  global.fetch = original;
  fs.rmSync(root, { recursive: true, force: true });
}
