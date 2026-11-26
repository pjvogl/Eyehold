'use strict';
const assert = require('node:assert/strict');
const { treasuryWatch, crownsForVerifiedProfit } = require('../sidecar/eyehold-treasury-watch.js');
const empty = treasuryWatch([]);
assert.equal(empty.status, 'unavailable');
assert.equal(empty.netProfitUSD, null);
assert.equal(crownsForVerifiedProfit(empty, 5000).crowns, 0);
const ignored = treasuryWatch([{ id: 'guess', type: 'revenue', cents: 100000, verified: true, currency: 'USD', evidenceRef: 'sha256:abc' }]);
assert.equal(ignored.netProfitUSD, null);
const watched = treasuryWatch([
  { id: 'stripe:pi_1', type: 'revenue', cents: 5000, verified: true, currency: 'USD', evidenceRef: 'sha256:rev' },
  { id: 'stripe:pi_1:compute', type: 'model-cost', cents: 200, verified: true, currency: 'USD', evidenceRef: 'sha256:cost' }
]);
assert.equal(watched.netProfitUSD, 48);
assert.equal(watched.department, 'finance');
assert.equal(watched.crownsAreMoney, false);
assert.equal(crownsForVerifiedProfit(watched, 4800).crowns, 48);
console.log('Treasury Watch follows verified Stripe receipts and withholds Crowns otherwise');
