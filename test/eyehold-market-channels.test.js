'use strict';
const assert = require('node:assert/strict');
const { createChannelAdapter, stripePaymentLinkAdapter } = require('../sidecar/eyehold-market-channels.js');
const listing = { id: 'listing-1', title: 'Field guide', description: 'A short ledger guide.', priceCents: 1200 };
const calls = [];
function fakeFetch(url, init) {
  calls.push({ url, body: init.body });
  const path = url.replace('https://api.stripe.com', '');
  const payload = path === '/v1/products' ? { id: 'prod_test', livemode: false }
    : path === '/v1/prices' ? { id: 'price_test', livemode: false }
    : { id: 'plink_test', url: 'https://buy.stripe.test/plink_test', livemode: false };
  return Promise.resolve({ ok: true, json: async () => payload });
}
(async () => {
  assert.throws(() => createChannelAdapter({ id: 'x' }), /publish/);
  const adapter = stripePaymentLinkAdapter();
  const published = await adapter.publish(listing, { secret: 'rk_test_placeholder', fetchImpl: fakeFetch });
  assert.equal(published.url, 'https://buy.stripe.test/plink_test');
  assert.equal(calls.length, 3);
  assert.equal(calls.some(call => call.body.includes('payment_method_types')), false);
  assert.match(calls[2].body, /line_items%5B0%5D%5Bprice%5D=price_test/);
  assert.match(calls[2].body, /managed_payments%5Benabled%5D=false/);
  await assert.rejects(adapter.publish(listing, { secret: 'sk_live_no', fetchImpl: fakeFetch }), /live-key-rejected/);
  const liveCalls = [];
  const liveFetch = async (url, init) => {
    liveCalls.push(init.body);
    const path = url.replace('https://api.stripe.com', '');
    const payload = path === '/v1/products' ? { id: 'prod_live', livemode: true }
      : path === '/v1/prices' ? { id: 'price_live', livemode: true }
      : { id: 'plink_live', url: 'https://buy.stripe.com/plink_live', livemode: true };
    return { ok: true, json: async () => payload };
  };
  const live = stripePaymentLinkAdapter({ mode: 'live' });
  const livePublished = await live.publish(listing, { secret: 'rk_live_placeholder', fetchImpl: liveFetch });
  assert.equal(livePublished.livemode, true);
  assert.equal(livePublished.url, 'https://buy.stripe.com/plink_live');
  await assert.rejects(live.publish(listing, { secret: 'rk_test_placeholder', fetchImpl: liveFetch }), /test-key-rejected/);
  await assert.rejects(adapter.publish(listing, { secret: 'rk_test_placeholder', fetchImpl: fakeFetch, contactCustomer: true }), /customer/);
  const later = createChannelAdapter({ id: 'later', async publish() { return { channel: 'later', url: 'https://example.test/item' }; } });
  assert.equal((await later.publish(listing, {})).channel, 'later');
  console.log('Stripe payment-link adapter stays test-mode and replaceable');
})().catch(error => { console.error(error); process.exit(1); });
