/* Venture board HTTP. Reading is free. Spend, graduation, retirement,
 * new venture types, and Etsy listings run only when confirmed is true.
 */
'use strict';
function createVentureHttp({ ventures, treasury, trader, score, etsy }) {
  const send = (res, code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  function view() {
    return {
      ventures: ventures.board(),
      treasury: treasury.snapshot(),
      scores: score.board(),
      trader: { mode: 'paper', liveBroker: false, limits: trader.LIMITS },
      etsy: 'not-connected',
      crownsAreMoney: false
    };
  }
  async function handle(req, res) {
    if (req.method === 'GET') return send(res, 200, view());
    if (req.method !== 'POST') return send(res, 405, { error: 'method-not-allowed' });
    try {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk.toString('utf8');
        if (Buffer.byteLength(raw) > 8192) return send(res, 413, { error: 'too-large' });
      }
      const body = JSON.parse(raw);
      const confirmed = body.confirmed === true;
      if (body.op === 'approve-type') return send(res, 200, { proposal: ventures.approveType(body.id, { confirmed }) });
      if (body.op === 'retire') return send(res, 200, { assignment: ventures.retire({ agentId: body.agentId, ventureId: body.ventureId, confirmed }) });
      if (body.op === 'top-up') return send(res, 200, { treasury: treasury.topUp(body.cents, { confirmed }) });
      if (body.op === 'set-cap') return send(res, 200, { treasury: treasury.setCap({ agentId: body.agentId, ventureId: body.ventureId, capCents: body.capCents, confirmed }) });
      if (body.op === 'approve-spend') return send(res, 200, treasury.approveSpend(body.id, { confirmed }));
      if (body.op === 'graduate') return send(res, 200, { trader: trader.graduate(body.agentId, { confirmed }) });
      if (body.op === 'etsy-list') {
        await etsy.publish(body.listing || {}, { confirmed });
        return send(res, 200, { ok: true });
      }
      return send(res, 404, { error: 'unknown-venture-op' });
    } catch (error) {
      return send(res, 422, { error: error.message, ...view() });
    }
  }
  return { handle };
}
module.exports = { createVentureHttp };
