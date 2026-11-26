import { accountKey, applyCheckoutEvent, createCheckoutSession, createKvLedger, createMemoryLedger, evidenceRefFor, stripeMode, verifyStripeSignature } from '../billing.mjs';

export function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
export function allowedEmail(request, env) {
  const email = String(request.headers.get('Cf-Access-Authenticated-User-Email') || '').trim().toLowerCase();
  const allow = String(env.EYEHOLD_ACCESS_EMAILS || '').split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
  if (!email || !allow.includes(email)) return '';
  return email;
}
const KEY_ERRORS = new Set(['test-key-required', 'live-key-rejected', 'live-key-required', 'test-key-rejected']);

export async function handleBilling(request, env, ledger) {
  const url = new URL(request.url);
  const mode = stripeMode(env && env.STRIPE_MODE);
  if (url.pathname === '/healthz') return json(200, { ok: true, service: 'eyehold', billingLive: mode === 'live', mode });
  if (url.pathname === '/billing/webhook' && request.method === 'POST') {
    const payload = await request.text();
    const verified = await verifyStripeSignature(payload, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
    if (!verified.ok) {
      console.error(JSON.stringify({ message: 'billing-webhook-rejected', error: verified.error || 'rejected' }));
      return json(400, verified);
    }
    let event;
    try { event = JSON.parse(payload); } catch {
      console.error(JSON.stringify({ message: 'billing-webhook-rejected', error: 'invalid-json' }));
      return json(400, { error: 'invalid-json' });
    }
    const evidenceRef = await evidenceRefFor(payload);
    const result = await applyCheckoutEvent(ledger, event, { evidenceRef, mode });
    console.log(JSON.stringify({
      message: 'billing-webhook',
      ok: result.ok !== false,
      duplicate: !!result.duplicate,
      ignored: !!result.ignored,
      error: result.error || null
    }));
    return json(200, result);
  }
  const email = allowedEmail(request, env);
  if (!email) return json(401, { error: 'access-email-required' });
  if (url.pathname === '/billing/balance' && request.method === 'GET') {
    const key = accountKey(email);
    return json(200, { accountKey: key, credits: await ledger.getBalance(key), currency: false });
  }
  if (url.pathname === '/billing/receipts' && request.method === 'GET') {
    return json(200, { receipts: await ledger.listReceipts(accountKey(email)) });
  }
  if (url.pathname === '/billing/checkout' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return json(400, { error: 'invalid-json' }); }
    const origin = 'https://' + (env.EYEHOLD_BASE_DOMAIN || 'eyehold.babelbook.net');
    try {
      const session = await createCheckoutSession(globalThis.fetch, {
        secret: env.STRIPE_SECRET_KEY,
        pack: body.pack,
        email,
        successUrl: origin + '/billing/return',
        cancelUrl: origin + '/billing/cancel',
        mode
      });
      return json(200, session);
    } catch (error) {
      const status = KEY_ERRORS.has(error.message) ? 503 : 400;
      return json(status, { error: error.message });
    }
  }
  return null;
}

const memory = createMemoryLedger();
export function ledgerFor(env, fallback = memory) {
  const kv = env && env.BILLING_KV;
  if (kv && typeof kv.get === 'function' && typeof kv.put === 'function') return createKvLedger(kv);
  return fallback;
}
export default {
  async fetch(request, env) {
    const handled = await handleBilling(request, env, ledgerFor(env));
    return handled || json(404, { error: 'not-found' });
  }
};
