'use strict';
const assert = require('node:assert/strict');
const { etsyListingAdapter } = require('../sidecar/eyehold-etsy.js');
const { stripePaymentLinkAdapter } = require('../sidecar/eyehold-market-channels.js');
const listing = { id: 'listing-1', title: 'Printable planner', description: 'A one-page planner.', priceCents: 500 };
(async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return { ok: true, json: async () => ({}) }; };
  const etsy = etsyListingAdapter({ env: { ETSY_API_KEY: 'test-key-not-used' } });
  await assert.rejects(etsy.publish(listing, { confirmed: false, fetchImpl }), /owner-confirmation-required/);
  assert.equal(calls, 0);
  await assert.rejects(etsy.publish(listing, { confirmed: true, fetchImpl }), /etsy-not-connected/);
  assert.equal(calls, 0);
  assert.equal(stripePaymentLinkAdapter().id, 'stripe-payment-link');
  console.log('Etsy stays disconnected; Stripe remains the test-mode sales channel');
})().catch(error => { console.error(error); process.exit(1); });
