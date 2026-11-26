/* Market HTTP. Propose and reject never call Stripe. Publish and sale
 * settlement run only when the JSON body sets the matching confirmation flag.
 */
'use strict';
const { createMarket } = require('./eyehold-market.js');
const { stripePaymentLinkAdapter } = require('./eyehold-market-channels.js');
const { publishQueued } = require('./eyehold-market-publish.js');
const { settleReviewedSale } = require('./eyehold-market-sales.js');
function createMarketHttp({ file, finance, now, secret, fetchImpl }) {
  const market = createMarket({ file, now });
  const adapter = stripePaymentLinkAdapter();
  const send = (res, code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  async function handle(req, res) {
    if (req.method === 'GET') return send(res, 200, { queue: market.queue(), live: false, crownsAreMoney: false });
    if (req.method !== 'POST') return send(res, 405, { error: 'method-not-allowed' });
    try {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk.toString('utf8');
        if (Buffer.byteLength(raw) > 8192) return send(res, 413, { error: 'too-large' });
      }
      const body = JSON.parse(raw);
      if (body.op === 'propose') {
        const made = market.propose(body.listing || {});
        return send(res, 200, { ...made, published: false });
      }
      if (body.op === 'reject') return send(res, 200, { action: market.reject(body.actionId) });
      if (body.op === 'publish') {
        const result = await publishQueued(market, body.actionId, {
          confirmed: body.confirmed, adapter, secret: secret(), fetchImpl
        });
        return send(res, result.ok ? 200 : 422, result);
      }
      if (body.op === 'settle') {
        const report = settleReviewedSale(finance, body.sale, { confirmedReviewed: body.confirmedReviewed });
        return send(res, 200, report);
      }
      return send(res, 404, { error: 'unknown-market-op' });
    } catch (error) {
      return send(res, 422, { error: error.message });
    }
  }
  return { handle, market };
}
module.exports = { createMarketHttp };
