/* Payment-channel adapters. publish() is the only method that may talk to a
 * provider, and only the owner executor calls it. Adding a channel means
 * another object with the same publish(listing, ctx) shape.
 */
'use strict';
function createChannelAdapter(spec) {
  if (!spec || typeof spec.id !== 'string' || typeof spec.publish !== 'function') throw new Error('channel adapter needs an id and publish');
  return Object.freeze({ id: spec.id, publish: (listing, ctx) => spec.publish(listing, ctx) });
}
function assertTestKey(secret) {
  const key = String(secret || '');
  if (key.startsWith('sk_live_') || key.startsWith('rk_live_')) throw new Error('live-key-rejected');
  if (!key.startsWith('sk_test_') && !key.startsWith('rk_test_')) throw new Error('test-key-required');
  return key;
}
async function stripeForm(fetchImpl, secret, path, fields) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  const response = await fetchImpl('https://api.stripe.com' + path, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + secret,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2026-09-30.endive'
    },
    body: body.toString()
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload && payload.error && payload.error.message || 'stripe-call-failed');
  if (payload.livemode) throw new Error('live-mode-rejected');
  return payload;
}
function stripePaymentLinkAdapter() {
  return createChannelAdapter({
    id: 'stripe-payment-link',
    async publish(listing, ctx) {
      const secret = assertTestKey(ctx && ctx.secret);
      const fetchImpl = ctx && ctx.fetchImpl;
      if (typeof fetchImpl !== 'function') throw new Error('stripe fetch is required');
      if (ctx.contactCustomer) throw new Error('contacting a customer is not this channel');
      const product = await stripeForm(fetchImpl, secret, '/v1/products', {
        name: listing.title,
        description: listing.description,
        'metadata[listingId]': listing.id
      });
      const price = await stripeForm(fetchImpl, secret, '/v1/prices', {
        product: product.id,
        currency: 'usd',
        unit_amount: String(listing.priceCents)
      });
      const link = await stripeForm(fetchImpl, secret, '/v1/payment_links', {
        'line_items[0][price]': price.id,
        'line_items[0][quantity]': '1',
        'metadata[listingId]': listing.id
      });
      if (!link.url) throw new Error('payment link missing');
      return { channel: 'stripe-payment-link', productId: product.id, priceId: price.id, url: link.url, livemode: false };
    }
  });
}
module.exports = { createChannelAdapter, stripePaymentLinkAdapter, assertTestKey };
