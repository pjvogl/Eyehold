import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  PACKS, accountKey, applyCheckoutEvent, checkoutForm, createCheckoutSession, createMemoryLedger, verifyStripeSignature
} from '../services/billing/billing.mjs';

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
const other = accountKey('other@eyehold.example');
assert.equal(await ledger.getBalance(other), 0);
const receipts = await ledger.listReceipts(key);
assert.equal(receipts.length, 2);
assert.equal(receipts[0].currency, 'USD');
assert.equal(receipts[0].type, 'revenue');
assert.equal(receipts[0].cents, 500);
console.log('Eyehold billing webhook, checkout, and per-account credits OK');
