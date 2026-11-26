/* Venture catalog. The Manager assigns specialists to money-making ventures.
 * Built-in types exist so the team can start. A new type is only a proposal
 * until the owner approves it. Nothing here spends money or calls a network.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,80}$/;
const BUILTINS = Object.freeze([
  { id: 'etsy-shop', name: 'Etsy Shopkeeper', summary: 'Digital and printable products listed for sale.' },
  { id: 'digital-services', name: 'Digital Services', summary: 'Freelance-style deliverables a customer pays for.' },
  { id: 'trader', name: 'Trader', summary: 'Markets, starting on paper and graduating only with the owner.' }
]);
function clean(value, max) {
  const text = String(value || '').trim();
  if (!text || text.length > max) throw new Error('venture text is missing or too long');
  return text;
}
function createVentures({ file, now }) {
  if (!path.isAbsolute(file)) throw new Error('Absolute venture path required');
  if (typeof now !== 'function') throw new Error('injected clock required');
  function load() {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) {
      if (e.code === 'ENOENT') return { version: 1, next: 1, assignments: [], proposals: [] };
      throw e;
    }
  }
  function save(state) {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const temp = file + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(state) + '\n', { mode: 0o600 });
    fs.renameSync(temp, file);
  }
  function types(state) {
    const custom = (state || load()).proposals.filter(item => item.status === 'approved').map(item => ({ id: item.id, name: item.name, summary: item.summary, custom: true }));
    return BUILTINS.concat(custom);
  }
  function known(state, id) { return types(state).some(item => item.id === id); }
  function assign({ agentId, ventureId }) {
    if (!ID.test(String(agentId || ''))) throw new Error('agent id required');
    const state = load();
    if (!known(state, ventureId)) throw new Error('unknown venture');
    const existing = state.assignments.find(item => item.agentId === agentId && item.ventureId === ventureId && item.status === 'active');
    if (existing) return existing;
    const row = { id: 'venture-agent-' + state.next, agentId, ventureId, status: 'active', at: now() };
    state.next += 1;
    state.assignments.push(row);
    save(state);
    return row;
  }
  function retire({ agentId, ventureId, confirmed }) {
    if (confirmed !== true) throw new Error('owner-confirmation-required');
    const state = load();
    const row = state.assignments.find(item => item.agentId === agentId && item.ventureId === ventureId && item.status === 'active');
    if (!row) throw new Error('active assignment not found');
    row.status = 'retired';
    row.retiredAt = now();
    save(state);
    return row;
  }
  function proposeType({ name, summary, managerId }) {
    if (!ID.test(String(managerId || ''))) throw new Error('manager id required');
    const state = load();
    const proposal = { id: 'venture-type-' + state.next, name: clean(name, 60), summary: clean(summary, 240), managerId, status: 'queued', at: now() };
    state.next += 1;
    state.proposals.push(proposal);
    save(state);
    return proposal;
  }
  function approveType(id, { confirmed } = {}) {
    if (confirmed !== true) throw new Error('owner-confirmation-required');
    const state = load();
    const proposal = state.proposals.find(item => item.id === id && item.status === 'queued');
    if (!proposal) throw new Error('queued venture type not found');
    proposal.status = 'approved';
    save(state);
    return proposal;
  }
  function board() {
    const state = load();
    return { types: types(state), assignments: state.assignments.filter(item => item.status === 'active'), proposals: state.proposals.filter(item => item.status === 'queued') };
  }
  return Object.freeze({ assign, retire, proposeType, approveType, board, BUILTINS });
}
const MANAGER_GOAL = 'You are the Manager. Pick ventures that can earn real money for the owner, assign specialists, and allocate treasury budgets from money the team has already earned. Review each agent by verified net profit, not by activity. Reassign or retire a weak venture. Draft listings and trades, but every spend, listing, publish, trade, and outward message waits for the owner. Paper trading is practice, not Crowns and not cash.';
module.exports = { createVentures, BUILTINS, MANAGER_GOAL };
