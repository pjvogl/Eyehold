#!/usr/bin/env node
/* Local test-mode purchase. Does not deploy, does not change DNS, and does not
 * call Stripe. The portal Worker and the payment-link adapter run in this
 * process. Stripe's API is a mock that only answers test-mode calls.
 *
 * Chain: checkout session + payment link -> signed webhook -> receipt in
 * BILLING_KV -> Treasury Watch crowns from that verified USD receipt.
 */
import assert from 'node:assert/strict';
import { createHmac, createHash } from 'node:crypto';
import worker from '../services/portal/src/worker.js';
import { evidenceRefFor } from '../services/billing/billing.mjs';
import market from '../sidecar/eyehold-market-channels.js';
import treasury from '../sidecar/eyehold-treasury-watch.js';

const { stripePaymentLinkAdapter } = market;
const { treasuryWatch, crownsForVerifiedProfit } = treasury;

const EMAIL = 'owner@eyehold.example';
const WEBHOOK_SECRET = 'whsec_e2e_test_only';
const TEST_KEY = 'rk_test_e2e_not_a_real_key';
const LISTING = {
  id: 'listing_keep_guide',
  title: 'Keep ledger guide',
  description: 'A short guide to reading a verified receipt.',
  priceCents: 500
};

function memoryKv() {
  const store = new Map();
  return {
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async put(key, value) { store.set(key, String(value)); }
  };
}

const stripeCalls = [];
async function mockStripe(url, init) {
  const href = String(url);
  assert.equal(href.startsWith('https://api.stripe.com/'), true, href);
  const auth = init.headers.Authorization || init.headers.authorization || '';
  assert.equal(auth, 'Bearer ' + TEST_KEY);
  assert.equal(/sk_live_|rk_live_/.test(auth), false);
  assert.equal(String(init.body || '').includes('payment_method_types'), false);
  stripeCalls.push(href);
  if (href.endsWith('/v1/checkout/sessions')) {
    return { ok: true, json: async () => ({ id: 'cs_test_e2e_checkout', url: 'https://checkout.stripe.test/c/cs_test_e2e_checkout', livemode: false }) };
  }
  if (href.endsWith('/v1/products')) return { ok: true, json: async () => ({ id: 'prod_test_e2e', livemode: false }) };
  if (href.endsWith('/v1/prices')) return { ok: true, json: async () => ({ id: 'price_test_e2e', livemode: false }) };
  if (href.endsWith('/v1/payment_links')) {
    return { ok: true, json: async () => ({ id: 'plink_test_e2e', url: 'https://buy.stripe.test/plink_test_e2e', livemode: false }) };
  }
  return { ok: false, json: async () => ({ error: { message: 'unexpected-stripe-path' } }) };
}

const env = {
  EYEHOLD_BASE_DOMAIN: 'eyehold.babelbook.net',
  EYEHOLD_ACCESS_EMAILS: EMAIL,
  STRIPE_SECRET_KEY: TEST_KEY,
  STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
  STRIPE_MODE: 'test',
  BILLING_KV: memoryKv()
};
const access = { 'Cf-Access-Authenticated-User-Email': EMAIL };

function signed(payload, secret, t = Math.floor(Date.now() / 1000)) {
  const mac = createHmac('sha256', secret).update(t + '.' + payload).digest('hex');
  return 't=' + t + ',v1=' + mac;
}

async function main() {
  const previous = globalThis.fetch;
  globalThis.fetch = mockStripe;
  try {
    const checkoutRes = await worker.fetch(new Request('https://eyehold.babelbook.net/billing/checkout', {
      method: 'POST',
      headers: { ...access, 'content-type': 'application/json' },
      body: JSON.stringify({ pack: 'spark' })
    }), env);
    const checkout = await checkoutRes.json();
    assert.equal(checkoutRes.status, 200);
    assert.equal(checkout.id, 'cs_test_e2e_checkout');
    assert.equal(checkout.url, 'https://checkout.stripe.test/c/cs_test_e2e_checkout');

    const link = await stripePaymentLinkAdapter().publish(LISTING, { secret: TEST_KEY, fetchImpl: mockStripe });
    assert.equal(link.livemode, false);
    assert.equal(link.url, 'https://buy.stripe.test/plink_test_e2e');

    const unpaid = await worker.fetch(new Request('https://eyehold.babelbook.net/billing/receipts', { headers: access }), env);
    assert.equal((await unpaid.json()).receipts.length, 0);

    const paid = {
      id: 'evt_e2e_paid',
      livemode: false,
      type: 'checkout.session.completed',
      data: { object: {
        id: 'cs_test_e2e_paid',
        mode: 'payment',
        payment_status: 'paid',
        currency: 'usd',
        amount_total: LISTING.priceCents,
        livemode: false,
        customer_email: EMAIL,
        payment_link: 'plink_test_e2e',
        metadata: { listingId: LISTING.id, accountKey: 'email:' + EMAIL }
      } }
    };
    const body = JSON.stringify(paid);
    const bad = await worker.fetch(new Request('https://eyehold.babelbook.net/billing/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 't=1,v1=00' },
      body
    }), env);
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error, 'stale-signature');

    const good = await worker.fetch(new Request('https://eyehold.babelbook.net/billing/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': signed(body, WEBHOOK_SECRET) },
      body
    }), env);
    const recorded = await good.json();
    assert.equal(good.status, 200);
    assert.equal(recorded.duplicate, false);
    assert.equal(recorded.receipt.verified, true);
    assert.equal(recorded.receipt.cents, 500);
    assert.equal(recorded.receipt.credits, 0);
    assert.equal(recorded.receipt.evidenceRef, await evidenceRefFor(body));
    assert.equal(recorded.receipt.evidenceRef, 'sha256:' + createHash('sha256').update(body).digest('hex'));

    const replay = await worker.fetch(new Request('https://eyehold.babelbook.net/billing/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': signed(body, WEBHOOK_SECRET) },
      body
    }), env);
    assert.equal((await replay.json()).duplicate, true);

    const listed = await worker.fetch(new Request('https://eyehold.babelbook.net/billing/receipts', { headers: access }), env);
    const receipts = (await listed.json()).receipts;
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0].id, 'stripe:cs_test_e2e_paid');

    const watch = treasuryWatch(receipts);
    const crowns = crownsForVerifiedProfit(watch, receipts[0].cents);
    assert.equal(watch.status, 'verified-records-only');
    assert.equal(watch.netProfitUSD, 5);
    assert.equal(watch.crownsAreMoney, false);
    assert.equal(crowns.crowns, 5);
    assert.equal(crowns.reason, 'verified-net');

    const balance = await worker.fetch(new Request('https://eyehold.babelbook.net/billing/balance', { headers: access }), env);
    assert.equal((await balance.json()).credits, 0);

    const report = {
      mode: 'test',
      deployed: false,
      stripe: 'mock',
      checkout: { id: checkout.id, url: checkout.url, paid: false },
      paymentLink: { id: 'plink_test_e2e', url: link.url, livemode: link.livemode },
      webhook: { verified: true, status: good.status, duplicateReplay: true },
      receipt: {
        id: receipts[0].id,
        cents: receipts[0].cents,
        currency: receipts[0].currency,
        verified: receipts[0].verified,
        evidenceRef: receipts[0].evidenceRef
      },
      treasuryWatch: { status: watch.status, netProfitUSD: watch.netProfitUSD, crowns: crowns.crowns, crownsAreMoney: false },
      stripeCalls: stripeCalls.length
    };
    console.log(JSON.stringify(report, null, 2));
  } finally {
    globalThis.fetch = previous;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
