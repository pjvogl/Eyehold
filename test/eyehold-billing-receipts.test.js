'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createFinanceStore } = require('../sidecar/eyehold-finance-store.js');
const { importReviewedReceipts } = require('../sidecar/eyehold-billing-receipts.js');
const { reportBusinessProfit } = require('../sidecar/eyehold-finance-truth.js');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eyehold-receipts-'));
const store = createFinanceStore({ file: path.join(root, 'finance.json'), now: () => '2026-11-10T00:00:00.000Z' });
const feed = [
  { id: 'stripe:cs_test_1', verified: true, livemode: false, currency: 'USD', type: 'revenue', cents: 500, credits: 500 },
  { id: 'stripe:cs_test_2', verified: true, livemode: false, currency: 'USD', type: 'revenue', cents: 2000, credits: 2000 }
];
assert.equal(store.snapshot().netProfitUSD, null);
assert.throws(() => importReviewedReceipts(store, feed), /operator review/);
const imported = importReviewedReceipts(store, feed, { confirmedReviewed: true });
assert.equal(imported.netProfitUSD, 25);
assert.equal(imported.creditsImported, 0);
assert.equal(imported.crownsImported, 0);
assert.equal(store.snapshot().netProfitUSD, 25);
assert.throws(() => importReviewedReceipts(store, [{ ...feed[0], livemode: true }], { confirmedReviewed: true }), /test-mode/);
assert.equal(store.snapshot().netProfitUSD, 25);
const direct = reportBusinessProfit({ records: [{ type: 'revenue', cents: 500, verified: true, evidenceRef: 'sha256:abc' }] });
assert.equal(direct.netProfitUSD, 5);
assert.equal(direct.status, 'verified-records-only');
fs.rmSync(root, { recursive: true, force: true });
console.log('Reviewed Eyehold billing receipts enter the profit ladder as USD');
