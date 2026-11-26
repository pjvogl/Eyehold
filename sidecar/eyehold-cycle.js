/* Unattended venture cycle.
 * The Eye asks Raven Court, Star Sages rank, Deepforge produces, Silver Bough
 * reviews, and Iron Host releases a reviewed listing or a paper trade.
 * A failed step retries up to three times, then the run stops. Files survive
 * a restart. Paper trades stay paper and never become Crowns. This module
 * does not call a network unless the caller passes a fetch implementation.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { route, requestResearch } = require('./eyehold-department-loop.js');
const { assertTool } = require('./eyehold-tools.js');
const { publishReviewed } = require('./eyehold-market-publish.js');
const { settleVentureProfit } = require('./eyehold-venture-profit.js');

const MAX_ATTEMPTS = 3;
const AGENTS = Object.freeze({
  'etsy-shop': 'deepforge',
  'digital-services': 'deepforge',
  trader: 'deepforge'
});

function rankBriefs(briefs) {
  const risk = { low: 0, medium: 1, high: 2 };
  return [...briefs].sort((a, b) => {
    const net = (b.expectedRevenueCents - b.upfrontCostCents) - (a.expectedRevenueCents - a.upfrontCostCents);
    if (net) return net;
    if (risk[a.risk] !== risk[b.risk]) return risk[a.risk] - risk[b.risk];
    return a.rank - b.rank;
  });
}

function createCycle({ file, now, research, ventures, desk, market, treasury, score, finance, trader, stripe, tools }) {
  if (!path.isAbsolute(file)) throw new Error('Absolute cycle path required');
  if (typeof now !== 'function') throw new Error('injected clock required');
  if (!tools || typeof tools.briefs !== 'function' || typeof tools.findings !== 'function' || typeof tools.produce !== 'function' || typeof tools.review !== 'function') {
    throw new Error('research, draft, and review tools are required');
  }
  function load() {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return { version: 1, run: null }; throw e; }
  }
  function save(state) {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const temp = file + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(state) + '\n', { mode: 0o600 });
    fs.renameSync(temp, file);
  }
  function blankAttempts() {
    return { researching: 0, ranking: 0, assigning: 0, 'researching-job': 0, producing: 0, reviewing: 0, listing: 0, reinvesting: 0 };
  }
  function opportunity(run) {
    return research.queue().opportunities.find(item => item.id === run.requestId) || null;
  }
  function start({ managerId, researcherId, question }) {
    const state = load();
    if (state.run && state.run.phase !== 'done' && state.run.phase !== 'paper-complete' && state.run.phase !== 'blocked') return state.run;
    state.run = {
      id: 'cycle-' + now(),
      phase: 'researching',
      managerId,
      researcherId,
      question,
      requestId: null,
      rank: null,
      ventureId: null,
      agentId: null,
      upfrontCostCents: 0,
      title: '',
      opened: false,
      followUpId: null,
      deskId: null,
      actionId: null,
      paymentUrl: null,
      sale: null,
      etsy: null,
      attempts: blankAttempts(),
      lastError: null,
      externalCharges: false,
      at: now()
    };
    save(state);
    return state.run;
  }
  function noteReceipt(sale) {
    const state = load();
    if (!state.run || state.run.phase !== 'awaiting-receipt') throw new Error('no listing is waiting for a receipt');
    if (!sale || sale.verified !== true) throw new Error('receipt is not verified');
    state.run.sale = sale;
    save(state);
    return state.run;
  }
  async function researching(run) {
    route({ fromDepartment: 'opportunities', kind: 'research' });
    if (!run.requestId) {
      const request = research.requestOpportunities({ managerId: run.managerId, question: run.question });
      run.requestId = request.id;
    }
    const current = opportunity(run);
    if (!current) throw new Error('research request missing');
    if (current.status === 'open') {
      const briefs = await tools.briefs({ question: run.question });
      research.fileBriefs({ requestId: run.requestId, researcherId: run.researcherId, briefs });
    }
    run.phase = 'ranking';
  }
  function ranking(run) {
    route({ fromDepartment: 'strategy', kind: 'rank' });
    const current = opportunity(run);
    if (!current || !current.briefs.length) throw new Error('no briefs to rank');
    const best = rankBriefs(current.briefs)[0];
    if (best.status === 'filed') research.acceptBrief({ requestId: run.requestId, rank: best.rank, managerId: run.managerId });
    run.rank = best.rank;
    run.ventureId = best.ventureType;
    run.agentId = AGENTS[best.ventureType];
    run.upfrontCostCents = best.upfrontCostCents;
    run.title = best.title;
    if (!run.agentId) throw new Error('no agent for venture');
    assertTool(run.ventureId, 'research');
    run.phase = 'assigning';
  }
  function assigning(run) {
    route({ fromDepartment: 'command', kind: 'assign' });
    if (!run.opened) {
      research.openFromBrief({ requestId: run.requestId, rank: run.rank, agentId: run.agentId, ventures });
      run.opened = true;
    }
    requestResearch({ fromDepartment: 'production', ventureId: run.ventureId });
    if (!run.followUpId) {
      const request = research.requestForVenture({ agentId: run.agentId, ventureId: run.ventureId, topic: run.title });
      run.followUpId = request.id;
    }
    run.phase = 'researching-job';
  }
  async function researchingJob(run) {
    assertTool(run.ventureId, 'research');
    const queued = research.queue().requests.find(item => item.id === run.followUpId);
    if (queued) {
      const answer = await tools.findings({ topic: queued.topic, ventureId: run.ventureId });
      research.attachFindings({
        requestId: run.followUpId,
        researcherId: run.researcherId,
        findings: answer.findings,
        sources: answer.sources
      });
    }
    run.phase = 'producing';
  }
  async function producing(run) {
    assertTool(run.ventureId, 'draft');
    route({ fromDepartment: 'production', kind: 'produce' });
    if (!run.deskId) {
      const artifact = await tools.produce({ ventureId: run.ventureId, title: run.title });
      const item = desk.produce({ ventureId: run.ventureId, artifact });
      run.deskId = item.id;
    }
    run.phase = 'reviewing';
  }
  async function reviewing(run) {
    assertTool(run.ventureId, 'review');
    route({ fromDepartment: 'quality', kind: 'review' });
    const approved = await tools.review({ ventureId: run.ventureId, deskId: run.deskId });
    const item = desk.review({ id: run.deskId, approved: approved === true });
    if (item.status !== 'reviewed') {
      run.deskId = null;
      throw new Error('quality returned the draft');
    }
    run.phase = 'listing';
  }
  async function listing(run) {
    if (run.ventureId === 'trader') {
      assertTool(run.ventureId, 'paper-trade');
      desk.queueOutward({ id: run.deskId, kind: 'trade', reviewed: true });
      trader.paperFill({ agentId: run.agentId, symbol: 'PAPER', side: 'buy', qty: 1, priceCents: 100 });
      const sold = trader.paperFill({ agentId: run.agentId, symbol: 'PAPER', side: 'sell', qty: 1, priceCents: 200 });
      score.creditPractice({ agentId: run.agentId, ventureId: 'trader', paperPnlCents: sold.pnlCents });
      run.phase = 'paper-complete';
      return;
    }
    assertTool(run.ventureId, 'stripe-payment-link');
    desk.queueOutward({ id: run.deskId, kind: 'listing', reviewed: true });
    if (toolsForHas(run.ventureId, 'etsy')) {
      run.etsy = 'not-connected';
    }
    if (!run.actionId) {
      const proposed = market.propose({
        agentId: run.agentId,
        title: run.title,
        description: 'Deliverable ' + run.deskId,
        priceCents: 500,
        channel: 'stripe-payment-link',
        deliverableRef: run.deskId,
        computeCents: 0
      });
      run.actionId = proposed.action.id;
    }
    if (!stripe || !stripe.secret) throw new Error('stripe-key-missing');
    if (market.queue().some(item => item.id === run.actionId)) {
      const published = await publishReviewed(market, run.actionId, {
        reviewed: true,
        adapter: stripe.adapter,
        secret: stripe.secret,
        fetchImpl: stripe.fetchImpl
      });
      if (!published.ok) throw new Error(published.error || 'publish failed');
      run.paymentUrl = published.action.receipt.url;
    }
    if (!run.paymentUrl) throw new Error('payment link missing');
    run.phase = 'awaiting-receipt';
  }
  function toolsForHas(ventureId, tool) {
    try { assertTool(ventureId, tool); return true; }
    catch { return false; }
  }
  function reinvesting(run) {
    const available = treasury.snapshot();
    const cap = Math.min(run.upfrontCostCents || 0, available.earnedCents, available.availableCents);
    if (cap >= 1) {
      treasury.allocateFromEarnings({ agentId: run.agentId, ventureId: run.ventureId, capCents: cap });
      const spend = treasury.requestSpend({
        agentId: run.agentId,
        ventureId: run.ventureId,
        cents: cap,
        kind: 'listing-fee',
        note: 'reinvest within cap'
      });
      treasury.releaseWithinCap(spend.id);
    }
    run.phase = 'done';
  }
  async function tick() {
    const state = load();
    const run = state.run;
    if (!run || run.phase === 'done' || run.phase === 'paper-complete' || run.phase === 'blocked' || run.phase === 'awaiting-receipt') {
      if (run && run.phase === 'awaiting-receipt' && run.sale) {
        const links = research.attributionFor(run.ventureId);
        settleVentureProfit({
          finance, treasury, score,
          sale: run.sale,
          agentId: run.agentId,
          ventureId: run.ventureId,
          research: links[0] ? { researcherId: links[0].researcherId, sharePercent: links[0].sharePercent } : null,
          confirmedReviewed: true
        });
        run.phase = 'reinvesting';
        save(state);
        return tick();
      }
      return report(run);
    }
    try {
      if (run.phase === 'researching') await researching(run);
      else if (run.phase === 'ranking') ranking(run);
      else if (run.phase === 'assigning') assigning(run);
      else if (run.phase === 'researching-job') await researchingJob(run);
      else if (run.phase === 'producing') await producing(run);
      else if (run.phase === 'reviewing') await reviewing(run);
      else if (run.phase === 'listing') await listing(run);
      else if (run.phase === 'reinvesting') reinvesting(run);
      else throw new Error('unknown phase');
      run.lastError = null;
      save(state);
    } catch (error) {
      const key = run.phase;
      run.attempts[key] = (run.attempts[key] || 0) + 1;
      run.lastError = error.message;
      if (run.attempts[key] >= MAX_ATTEMPTS) run.phase = 'blocked';
      save(state);
    }
    return report(state.run);
  }
  function report(run) {
    const current = run || load().run;
    return {
      run: current,
      crowns: score.board(),
      treasury: treasury.snapshot(),
      externalCharges: false,
      paperIsCrowns: false
    };
  }
  return Object.freeze({ start, tick, noteReceipt, report, rankBriefs, MAX_ATTEMPTS });
}
module.exports = { createCycle, rankBriefs, MAX_ATTEMPTS, AGENTS };
