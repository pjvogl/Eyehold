/* Research queue for the Raven Court researcher.
 * Briefs are estimates. They do not add Crowns, treasury cash, or profit.
 * A manager accepts a brief, then assigns it to a job agent as a venture.
 * Job agents can ask for more research; the answer attaches to that venture.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,80}$/;
const RISKS = new Set(['low', 'medium', 'high']);
const SHARE = 20;
function clean(value, max, label) {
  const text = String(value || '').trim();
  if (!text || text.length > max) throw new Error(label + ' is missing or too long');
  return text;
}
function cents(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(label + ' must be nonnegative cents');
  return value;
}
function createResearch({ file, now }) {
  if (!path.isAbsolute(file)) throw new Error('Absolute research path required');
  if (typeof now !== 'function') throw new Error('injected clock required');
  function load() {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return { version: 1, next: 1, opportunityRequests: [], ventureRequests: [], links: [] }; throw e; }
  }
  function save(state) {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const temp = file + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(state) + '\n', { mode: 0o600 });
    fs.renameSync(temp, file);
  }
  function requestOpportunities({ managerId, question }) {
    if (!ID.test(String(managerId || ''))) throw new Error('manager id required');
    const state = load();
    const request = { id: 'research-opp-' + state.next, managerId, question: clean(question, 300, 'question'), status: 'open', briefs: [], at: now() };
    state.next += 1;
    state.opportunityRequests.push(request);
    save(state);
    return request;
  }
  function fileBriefs({ requestId, researcherId, briefs }) {
    if (!ID.test(String(researcherId || ''))) throw new Error('researcher id required');
    if (!Array.isArray(briefs) || briefs.length < 1 || briefs.length > 8) throw new Error('one to eight briefs required');
    const ranks = new Set();
    const cleanBriefs = briefs.map(brief => {
      if (!Number.isInteger(brief.rank) || brief.rank < 1 || ranks.has(brief.rank)) throw new Error('ranks must be unique positive integers');
      ranks.add(brief.rank);
      if (!RISKS.has(brief.risk)) throw new Error('risk must be low, medium, or high');
      if (!Number.isSafeInteger(brief.timeToFirstDollarDays) || brief.timeToFirstDollarDays < 0 || brief.timeToFirstDollarDays > 3650) throw new Error('time to first dollar must be days');
      if (!ID.test(String(brief.ventureType || ''))) throw new Error('venture type required');
      const sources = Array.isArray(brief.sources) ? brief.sources.map(source => clean(source, 200, 'source')) : [];
      if (!sources.length) throw new Error('sources required');
      return {
        rank: brief.rank,
        title: clean(brief.title, 80, 'title'),
        ventureType: brief.ventureType,
        expectedRevenueCents: cents(brief.expectedRevenueCents, 'expected revenue'),
        upfrontCostCents: cents(brief.upfrontCostCents, 'upfront cost'),
        risk: brief.risk,
        timeToFirstDollarDays: brief.timeToFirstDollarDays,
        sources,
        status: 'filed'
      };
    });
    const state = load();
    const request = state.opportunityRequests.find(item => item.id === requestId && item.status === 'open');
    if (!request) throw new Error('open opportunity request not found');
    request.status = 'briefed';
    request.researcherId = researcherId;
    request.briefs = cleanBriefs.sort((a, b) => a.rank - b.rank);
    save(state);
    return request;
  }
  function acceptBrief({ requestId, rank, managerId }) {
    if (!ID.test(String(managerId || ''))) throw new Error('manager id required');
    const state = load();
    const request = state.opportunityRequests.find(item => item.id === requestId);
    if (!request) throw new Error('opportunity request not found');
    const brief = request.briefs.find(item => item.rank === rank);
    if (!brief || brief.status === 'opened') throw new Error('brief not available');
    brief.status = 'accepted';
    brief.acceptedBy = managerId;
    save(state);
    return brief;
  }
  function openFromBrief({ requestId, rank, agentId, ventures }) {
    const state = load();
    const request = state.opportunityRequests.find(item => item.id === requestId);
    const brief = request && request.briefs.find(item => item.rank === rank && item.status === 'accepted');
    if (!brief) throw new Error('accepted brief not found');
    const assignment = ventures.assign({ agentId, ventureId: brief.ventureType });
    brief.status = 'opened';
    brief.agentId = agentId;
    brief.ventureId = assignment.ventureId;
    state.links.push({ ventureId: assignment.ventureId, researcherId: request.researcherId, briefTitle: brief.title, sharePercent: SHARE });
    save(state);
    return { assignment, attribution: state.links[state.links.length - 1] };
  }
  function requestForVenture({ agentId, ventureId, topic }) {
    if (!ID.test(String(agentId || '')) || !ID.test(String(ventureId || ''))) throw new Error('agent and venture required');
    const state = load();
    const request = { id: 'research-job-' + state.next, agentId, ventureId, topic: clean(topic, 200, 'topic'), status: 'queued', findings: null, at: now() };
    state.next += 1;
    state.ventureRequests.push(request);
    save(state);
    return request;
  }
  function attachFindings({ requestId, researcherId, findings, sources }) {
    if (!ID.test(String(researcherId || ''))) throw new Error('researcher id required');
    const cited = Array.isArray(sources) ? sources.map(source => clean(source, 200, 'source')) : [];
    if (!cited.length) throw new Error('sources required');
    const state = load();
    const request = state.ventureRequests.find(item => item.id === requestId && item.status === 'queued');
    if (!request) throw new Error('queued research request not found');
    request.status = 'answered';
    request.researcherId = researcherId;
    request.findings = clean(findings, 1000, 'findings');
    request.sources = cited;
    if (!state.links.some(link => link.ventureId === request.ventureId && link.researcherId === researcherId)) {
      state.links.push({ ventureId: request.ventureId, researcherId, briefTitle: request.topic, sharePercent: SHARE });
    }
    save(state);
    return request;
  }
  function attributionFor(ventureId) {
    return load().links.filter(link => link.ventureId === ventureId);
  }
  function queue() {
    const state = load();
    return {
      opportunities: state.opportunityRequests,
      requests: state.ventureRequests.filter(item => item.status === 'queued'),
      links: state.links
    };
  }
  return Object.freeze({ requestOpportunities, fileBriefs, acceptBrief, openFromBrief, requestForVenture, attachFindings, attributionFor, queue, SHARE });
}
module.exports = { createResearch, SHARE };
