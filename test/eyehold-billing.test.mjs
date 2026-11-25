import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  PACKS, accountKey, applyCheckoutEvent, checkoutForm, createCheckoutSession, createMemoryLedger, verifyStripeSignature
} from '../services/billing/billing.mjs';
import { handleBilling } from '../services/billing/src/worker.js';

const ledger = createMemoryLedger();
const email = 'owner@eyehold.example';
const key = accountKey(email);
assert.equal(key, 'email:owner@eyehold.example');
assert.throws(() => accountKey('not an email'), /account-email-required/);
assert.equal(accountKey('Owner@Eyehold.example'), key);

const form = checkoutForm({
  pack: 'spark', email, successUrl: 'https://eyehold.babelbook.net/billing/return',
  cancelUrl: 'https://eyehold.babelbook.net/billing/cancel'
});
assert.equal(form.includes('payment_method_types'), false);
assert.match(form, /managed_payments%5Benabled%5D=false/);
assert.match(form, /mode=payment/);
assert.match(form, /currency%5D=usd/);
assert.match(form, /unit_amount%5D=500/);
assert.match(form, /integration_identifier=eyehold_checkout_[a-z0-9]{8}/);
assert.throws(() => checkoutForm({ pack: 'nope', email, successUrl: 'https://eyehold.example/a', cancelUrl: 'https://eyehold.example/b' }), /unknown-pack/);

const calls = [];
const session = await createCheckoutSession(async (url, init) => {
  calls.push({ url, init });
  return { ok: true, json: async () => ({ id: 'cs_test_1', url: 'https://checkout.stripe.test/pay', livemode: false }) };
}, { secret: 'rk_test_placeholder', pack: 'hearth', email, successUrl: 'https://eyehold.babelbook.net/ok', cancelUrl: 'https://eyehold.babelbook.net/no' });
assert.equal(session.id, 'cs_test_1');
assert.equal(calls[0].url, 'https://api.stripe.com/v1/checkout/sessions');
assert.match(calls[0].init.headers.Authorization, /^Bearer rk_test_/);
assert.equal(calls[0].init.headers['Stripe-Version'], '2026-09-30.endive');
assert.match(calls[0].init.body, /managed_payments%5Benabled%5D=false/);
await assert.rejects(createCheckoutSession(async () => { throw new Error('unused'); }, {
  secret: 'sk_live_nope', pack: 'spark', email, successUrl: 'https://eyehold.example/a', cancelUrl: 'https://eyehold.example/b'
}), /live-key-rejected/);

function signed(payload, secret, t = Math.floor(Date.now() / 1000)) {
  const mac = createHmac('sha256', secret).update(t + '.' + payload).digest('hex');
  return { header: 't=' + t + ',v1=' + mac, payload };
}
const secret = 'whsec_test';
const paid = {
  id: 'evt_1', livemode: false, type: 'checkout.session.completed',
  data: { object: {
    id: 'cs_test_1', mode: 'payment', payment_status: 'paid', currency: 'usd', amount_total: PACKS.spark.cents,
    customer_email: email, metadata: { pack: 'spark', accountKey: key, credits: '500' }
  } }
};
const body = JSON.stringify(paid);
const good = signed(body, secret);
assert.equal((await verifyStripeSignature(good.payload, good.header, secret)).ok, true);
assert.equal((await verifyStripeSignature(good.payload, good.header, 'wrong')).ok, false);
assert.equal((await verifyStripeSignature(body, 't=1,v1=00', secret, Date.now())).error, 'stale-signature');

const first = await applyCheckoutEvent(ledger, paid);
assert.equal(first.duplicate, false);
assert.equal(await ledger.getBalance(key), 500);
const replay = await applyCheckoutEvent(ledger, paid);
assert.equal(replay.duplicate, true);
assert.equal(await ledger.getBalance(key), 500);
const asyncPaid = { ...paid, type: 'checkout.session.async_payment_succeeded', data: { object: { ...paid.data.object, id: 'cs_test_2' } } };
await applyCheckoutEvent(ledger, asyncPaid);
assert.equal(await ledger.getBalance(key), 1000);
const unpaid = { ...paid, data: { object: { ...paid.data.object, id: 'cs_test_3', payment_status: 'unpaid' } } };
assert.equal((await applyCheckoutEvent(ledger, unpaid)).ignored, true);
assert.equal((await applyCheckoutEvent(ledger, { ...paid, livemode: true })).error, 'live-mode-rejected');
const linkPaid = {
  id: 'evt_link', livemode: false, type: 'checkout.session.completed',
  data: { object: {
    id: 'cs_test_link', mode: 'payment', payment_status: 'paid', currency: 'usd', amount_total: 900,
    livemode: false, customer_email: email, payment_link: 'plink_test',
    metadata: { listingId: 'listing_1' }
  } }
};
const linked = await applyCheckoutEvent(ledger, linkPaid, { evidenceRef: 'sha256:' + 'ab'.repeat(32) });
assert.equal(linked.duplicate, false);
assert.equal(linked.receipt.credits, 0);
assert.equal(linked.receipt.cents, 900);
assert.equal(linked.receipt.accountKey, key);
assert.equal(linked.receipt.evidenceRef.startsWith('sha256:'), true);
assert.equal(await ledger.getBalance(key), 1000);
const other = accountKey('other@eyehold.example');
assert.equal(await ledger.getBalance(other), 0);
const receipts = await ledger.listReceipts(key);
assert.equal(receipts.length, 3);
assert.equal(receipts[0].currency, 'USD');
assert.equal(receipts[0].type, 'revenue');
assert.equal(receipts[0].cents, 500);

const liveLedger = createMemoryLedger();
const liveCalls = [];
const liveSession = await createCheckoutSession(async (url, init) => {
  liveCalls.push({ url, init });
  return { ok: true, json: async () => ({ id: 'cs_live_1', url: 'https://checkout.stripe.com/pay', livemode: true }) };
}, { secret: 'rk_live_placeholder', mode: 'live', pack: 'spark', email, successUrl: 'https://eyehold.babelbook.net/ok', cancelUrl: 'https://eyehold.babelbook.net/no' });
assert.equal(liveSession.id, 'cs_live_1');
assert.match(liveCalls[0].init.headers.Authorization, /^Bearer rk_live_/);
assert.match(liveCalls[0].init.body, /managed_payments%5Benabled%5D=false/);
const liveSecret = await createCheckoutSession(async () => ({ ok: true, json: async () => ({ id: 'cs_live_sk', url: 'https://checkout.stripe.com/pay', livemode: true }) }), {
  secret: 'sk_live_also', mode: 'live', pack: 'spark', email, successUrl: 'https://eyehold.example/a', cancelUrl: 'https://eyehold.example/b'
});
assert.equal(liveSecret.id, 'cs_live_sk');
await assert.rejects(createCheckoutSession(async () => { throw new Error('unused'); }, {
  secret: 'rk_test_placeholder', mode: 'live', pack: 'spark', email, successUrl: 'https://eyehold.example/a', cancelUrl: 'https://eyehold.example/b'
}), /test-key-rejected/);
await assert.rejects(createCheckoutSession(async () => { throw new Error('unused'); }, {
  secret: 'sk_test_placeholder', mode: 'live', pack: 'spark', email, successUrl: 'https://eyehold.example/a', cancelUrl: 'https://eyehold.example/b'
}), /test-key-rejected/);
await assert.rejects(createCheckoutSession(async () => ({ ok: true, json: async () => ({ id: 'cs_live_testish', url: 'https://checkout.stripe.com/pay', livemode: false }) }), {
  secret: 'rk_live_placeholder', mode: 'live', pack: 'spark', email, successUrl: 'https://eyehold.example/a', cancelUrl: 'https://eyehold.example/b'
}), /test-session-rejected/);
await assert.rejects(createCheckoutSession(async () => ({ ok: true, json: async () => ({ id: 'cs_test_liveish', url: 'https://checkout.stripe.test/pay', livemode: true }) }), {
  secret: 'rk_test_placeholder', pack: 'spark', email, successUrl: 'https://eyehold.example/a', cancelUrl: 'https://eyehold.example/b'
}), /live-session-rejected/);

const livePaid = {
  id: 'evt_live_1', livemode: true, type: 'checkout.session.completed',
  data: { object: {
    id: 'cs_live_1', mode: 'payment', payment_status: 'paid', currency: 'usd', amount_total: PACKS.spark.cents,
    livemode: true, customer_email: email, metadata: { pack: 'spark', accountKey: key, credits: '500' }
  } }
};
const liveFirst = await applyCheckoutEvent(liveLedger, livePaid, { mode: 'live' });
assert.equal(liveFirst.duplicate, false);
assert.equal(liveFirst.receipt.livemode, true);
assert.equal(await liveLedger.getBalance(key), 500);
const liveReplay = await applyCheckoutEvent(liveLedger, livePaid, { mode: 'live' });
assert.equal(liveReplay.duplicate, true);
assert.equal(await liveLedger.getBalance(key), 500);
assert.equal((await applyCheckoutEvent(liveLedger, paid, { mode: 'live' })).error, 'test-mode-rejected');
assert.equal(await liveLedger.getBalance(key), 500);
const liveMismatch = { ...livePaid, data: { object: { ...livePaid.data.object, id: 'cs_live_bad', amount_total: 1 } } };
assert.equal((await applyCheckoutEvent(liveLedger, liveMismatch, { mode: 'live' })).error, 'amount-mismatch');
const liveUnpaid = { ...livePaid, data: { object: { ...livePaid.data.object, id: 'cs_live_unpaid', payment_status: 'unpaid' } } };
assert.equal((await applyCheckoutEvent(liveLedger, liveUnpaid, { mode: 'live' })).ignored, true);
const mixed = { ...livePaid, data: { object: { ...livePaid.data.object, id: 'cs_live_mixed', livemode: false } } };
assert.equal((await applyCheckoutEvent(liveLedger, mixed, { mode: 'live' })).error, 'test-mode-rejected');

const workerLedger = createMemoryLedger();
const liveEnv = {
  STRIPE_MODE: 'live',
  STRIPE_SECRET_KEY: 'sk_live_placeholder',
  STRIPE_WEBHOOK_SECRET: secret,
  EYEHOLD_ACCESS_EMAILS: email,
  EYEHOLD_BASE_DOMAIN: 'eyehold.babelbook.net'
};
const health = await handleBilling(new Request('https://eyehold.babelbook.net/healthz'), liveEnv, workerLedger);
const healthBody = await health.json();
assert.equal(healthBody.billingLive, true);
assert.equal(healthBody.mode, 'live');
const testHealth = await handleBilling(new Request('https://eyehold.babelbook.net/healthz'), { ...liveEnv, STRIPE_MODE: 'test' }, workerLedger);
const testHealthBody = await testHealth.json();
assert.equal(testHealthBody.billingLive, false);
assert.equal(testHealthBody.mode, 'test');
const previousFetch = globalThis.fetch;
globalThis.fetch = async () => ({ ok: true, json: async () => ({ id: 'cs_live_worker', url: 'https://checkout.stripe.com/c/cs_live_worker', livemode: true }) });
try {
  const checkout = await handleBilling(new Request('https://eyehold.babelbook.net/billing/checkout', {
    method: 'POST',
    headers: { 'Cf-Access-Authenticated-User-Email': email, 'content-type': 'application/json' },
    body: JSON.stringify({ pack: 'spark' })
  }), liveEnv, workerLedger);
  assert.equal(checkout.status, 200);
  assert.equal((await checkout.json()).id, 'cs_live_worker');
  const rejected = await handleBilling(new Request('https://eyehold.babelbook.net/billing/checkout', {
    method: 'POST',
    headers: { 'Cf-Access-Authenticated-User-Email': email, 'content-type': 'application/json' },
    body: JSON.stringify({ pack: 'spark' })
  }), { ...liveEnv, STRIPE_SECRET_KEY: 'rk_test_placeholder' }, workerLedger);
  const rejectedBody = await rejected.json();
  assert.equal(rejected.status, 503);
  assert.equal(rejectedBody.error, 'test-key-rejected');
} finally {
  globalThis.fetch = previousFetch;
}
const liveBody = JSON.stringify(livePaid);
const liveGood = signed(liveBody, secret);
const accepted = await handleBilling(new Request('https://eyehold.babelbook.net/billing/webhook', {
  method: 'POST',
  headers: { 'stripe-signature': liveGood.header },
  body: liveBody
}), liveEnv, workerLedger);
const acceptedBody = await accepted.json();
assert.equal(accepted.status, 200);
assert.equal(acceptedBody.duplicate, false);
assert.equal(await workerLedger.getBalance(key), 500);
const replayed = await handleBilling(new Request('https://eyehold.babelbook.net/billing/webhook', {
  method: 'POST',
  headers: { 'stripe-signature': liveGood.header },
  body: liveBody
}), liveEnv, workerLedger);
assert.equal((await replayed.json()).duplicate, true);
assert.equal(await workerLedger.getBalance(key), 500);
const testBody = JSON.stringify(paid);
const testSigned = signed(testBody, secret);
const testEvent = await handleBilling(new Request('https://eyehold.babelbook.net/billing/webhook', {
  method: 'POST',
  headers: { 'stripe-signature': testSigned.header },
  body: testBody
}), liveEnv, workerLedger);
const testEventBody = await testEvent.json();
assert.equal(testEvent.status, 200);
assert.equal(testEventBody.error, 'test-mode-rejected');
assert.equal(await workerLedger.getBalance(key), 500);
const unsigned = await handleBilling(new Request('https://eyehold.babelbook.net/billing/webhook', {
  method: 'POST',
  body: liveBody
}), liveEnv, workerLedger);
const unsignedBody = await unsigned.json();
assert.equal(unsigned.status, 400);
assert.equal(unsignedBody.error, 'missing-signature');
console.log('Eyehold billing webhook, checkout, and per-account credits OK');
