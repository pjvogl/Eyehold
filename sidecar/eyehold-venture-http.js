/* Venture board HTTP. Reading is free. Spend, graduation, retirement,
 * new venture types, and Etsy listings run only when confirmed is true.
 */
'use strict';
function createVentureHttp({ ventures, treasury, trader, score, etsy, research, finance }) {
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
      research: research ? research.queue() : { opportunities: [], requests: [], links: [] },
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
      if (body.op === 'research-ask') return send(res, 200, { request: research.requestOpportunities({ managerId: body.managerId, question: body.question }) });
      if (body.op === 'research-briefs') return send(res, 200, { request: research.fileBriefs({ requestId: body.requestId, researcherId: body.researcherId, briefs: body.briefs }) });
      if (body.op === 'research-accept') return send(res, 200, { brief: research.acceptBrief({ requestId: body.requestId, rank: body.rank, managerId: body.managerId }) });
      if (body.op === 'research-open') return send(res, 200, research.openFromBrief({ requestId: body.requestId, rank: body.rank, agentId: body.agentId, ventures }));
      if (body.op === 'research-request') return send(res, 200, { request: research.requestForVenture({ agentId: body.agentId, ventureId: body.ventureId, topic: body.topic }) });
      if (body.op === 'research-answer') return send(res, 200, { request: research.attachFindings({ requestId: body.requestId, researcherId: body.researcherId, findings: body.findings, sources: body.sources }) });
      if (body.op === 'settle') {
        const { settleVentureProfit } = require('./eyehold-venture-profit.js');
        const links = research.attributionFor(body.ventureId);
        const result = settleVentureProfit({
          finance, treasury, score, sale: body.sale, agentId: body.agentId, ventureId: body.ventureId,
          otherCostCents: body.otherCostCents || 0,
          research: links[0] ? { researcherId: links[0].researcherId, sharePercent: links[0].sharePercent } : null,
          confirmedReviewed: body.confirmedReviewed === true
        });
        return send(res, 200, result);
      }
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
