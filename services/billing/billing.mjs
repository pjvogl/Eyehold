/* Eyehold managed-credit billing. Test mode only.
 * Stripe calls go through the injected fetch. No secret belongs in this file.
 * Crowns are not credits and credits are not dollars. A paid Checkout session
 * records a USD receipt and a separate credit balance for that account.
 */
const PACKS = Object.freeze({
  spark: { credits: 500, cents: 500, name: 'Eyehold spark credits' },
  hearth: { credits: 2000, cents: 2000, name: 'Eyehold hearth credits' }
});

export function accountKey(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('account-email-required');
  // v1 keys the ledger by the Access email. A later Eyehold Supabase project,
  // separate from Babelbook, can replace this with that project's user id.
  return 'email:' + normalized;
}

export function createMemoryLedger() {
  const receipts = new Map();
  const balances = new Map();
  return {
    async getBalance(key) { return balances.get(key) || 0; },
    async listReceipts(key) { return [...receipts.values()].filter(row => row.accountKey === key); },
    async addReceipt(receipt) {
      const prior = receipts.get(receipt.id);
      if (prior) return { ok: true, duplicate: true, receipt: prior };
      receipts.set(receipt.id, receipt);
      balances.set(receipt.accountKey, (balances.get(receipt.accountKey) || 0) + receipt.credits);
      return { ok: true, duplicate: false, receipt };
    }
  };
}

async function readKvState(kv) {
  const raw = await kv.get('ledger');
  if (!raw) return { receipts: [], balances: {} };
  const state = JSON.parse(raw);
  if (!state || !Array.isArray(state.receipts) || !state.balances || typeof state.balances !== 'object') {
    throw new Error('billing-ledger-unreadable');
  }
  return state;
}

export function createKvLedger(kv) {
  return {
    async getBalance(key) {
      const state = await readKvState(kv);
      return state.balances[key] || 0;
    },
    async listReceipts(key) {
      const state = await readKvState(kv);
      return state.receipts.filter(row => row.accountKey === key);
    },
    async addReceipt(receipt) {
      const state = await readKvState(kv);
      const prior = state.receipts.find(row => row.id === receipt.id);
      if (prior) return { ok: true, duplicate: true, receipt: prior };
      state.receipts.push(receipt);
      state.balances[receipt.accountKey] = (state.balances[receipt.accountKey] || 0) + receipt.credits;
      await kv.put('ledger', JSON.stringify(state));
      return { ok: true, duplicate: false, receipt };
    }
  };
}

function randomSuffix() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => (b % 36).toString(36)).join('');
}

export function checkoutForm({ pack, email, successUrl, cancelUrl }) {
  const item = PACKS[pack];
  if (!item) throw new Error('unknown-pack');
  const key = accountKey(email);
  const body = new URLSearchParams();
  body.set('mode', 'payment');
  body.set('success_url', successUrl);
  body.set('cancel_url', cancelUrl);
  body.set('client_reference_id', key);
  body.set('customer_email', email.trim().toLowerCase());
  body.set('metadata[accountKey]', key);
  body.set('metadata[pack]', pack);
  body.set('metadata[credits]', String(item.credits));
  body.set('line_items[0][quantity]', '1');
  body.set('line_items[0][price_data][currency]', 'usd');
  body.set('line_items[0][price_data][unit_amount]', String(item.cents));
  body.set('line_items[0][price_data][product_data][name]', item.name);
  body.set('integration_identifier', 'eyehold_checkout_' + randomSuffix());
  const encoded = body.toString();
  if (encoded.includes('payment_method_types')) throw new Error('payment-method-types-forbidden');
  return encoded;
}

export function assertTestKey(secret) {
  const key = String(secret || '');
  if (key.startsWith('sk_live_') || key.startsWith('rk_live_')) throw new Error('live-key-rejected');
  if (!key.startsWith('sk_test_') && !key.startsWith('rk_test_')) throw new Error('test-key-required');
  return key;
}

export async function createCheckoutSession(fetchImpl, { secret, pack, email, successUrl, cancelUrl }) {
  const key = assertTestKey(secret);
  const form = checkoutForm({ pack, email, successUrl, cancelUrl });
  const response = await fetchImpl('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2026-09-30.endive'
    },
    body: form
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload && payload.error && payload.error.message || 'stripe-checkout-failed');
  if (payload.livemode) throw new Error('live-session-rejected');
  return { id: payload.id, url: payload.url };
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export async function evidenceRefFor(payload) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(payload)));
  return 'sha256:' + hex(digest);
}

function cleanEvidence(ref) {
  return typeof ref === 'string' && /^sha256:[a-f0-9]{64}$/.test(ref) ? ref : null;
}

export async function verifyStripeSignature(payload, header, secret, now = Date.now()) {
  const parts = Object.fromEntries(String(header || '').split(',').map(part => part.split('=')));
  const timestamp = Number(parts.t);
  const signature = parts.v1 || '';
  if (!Number.isFinite(timestamp) || !signature || !secret) return { ok: false, error: 'missing-signature' };
  if (Math.abs(now - timestamp * 1000) > 300000) return { ok: false, error: 'stale-signature' };
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(timestamp + '.' + payload)));
  if (!safeEqual(mac, signature)) return { ok: false, error: 'bad-signature' };
  return { ok: true };
}

export async function applyCheckoutEvent(ledger, event, meta = {}) {
  if (!event || event.livemode) return { ok: false, error: 'live-mode-rejected' };
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return { ok: true, ignored: true };
  }
  const session = event.data && event.data.object;
  if (!session || session.payment_status !== 'paid' || session.mode !== 'payment') return { ok: true, ignored: true };
  if (session.livemode) return { ok: false, error: 'live-mode-rejected' };
  const evidenceRef = cleanEvidence(meta.evidenceRef);
  const cents = session.amount_total;
  const pack = PACKS[session.metadata && session.metadata.pack];
  const metaKey = session.metadata && session.metadata.accountKey;
  const base = {
    email: String(session.customer_email || '').toLowerCase(),
    currency: 'USD',
    type: 'revenue',
    sessionId: session.id,
    livemode: false,
    verified: true
  };
  if (evidenceRef) base.evidenceRef = evidenceRef;
  if (pack) {
    if (!metaKey) return { ok: false, error: 'incomplete-session' };
    if (cents !== pack.cents || session.currency !== 'usd') return { ok: false, error: 'amount-mismatch' };
    return ledger.addReceipt({
      ...base,
      id: 'stripe:' + session.id,
      accountKey: metaKey,
      cents,
      credits: pack.credits
    });
  }
  const listingId = session.metadata && typeof session.metadata.listingId === 'string' ? session.metadata.listingId : '';
  const paymentLink = typeof session.payment_link === 'string' ? session.payment_link : '';
  if (listingId || paymentLink) {
    let key = typeof metaKey === 'string' ? metaKey : '';
    if (!key && session.customer_email) {
      try { key = accountKey(session.customer_email); } catch { key = ''; }
    }
    if (!key || !Number.isSafeInteger(cents) || cents < 0 || session.currency !== 'usd') {
      return { ok: false, error: 'incomplete-session' };
    }
    return ledger.addReceipt({
      ...base,
      id: 'stripe:' + session.id,
      accountKey: key,
      cents,
      credits: 0,
      listingId: listingId || null,
      paymentLink: paymentLink || null
    });
  }
  return { ok: false, error: 'incomplete-session' };
}

export { PACKS };
