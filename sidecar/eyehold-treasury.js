/* Self-funding treasury. Cash comes from verified earnings and owner top-ups.
 * A spend stays queued until the owner approves it, and it cannot exceed the
 * cash on hand or that agent's hard cap.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,80}$/;
function cents(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(label + ' must be nonnegative cents');
  return value;
}
function createTreasury({ file, now }) {
  if (!path.isAbsolute(file)) throw new Error('Absolute treasury path required');
  if (typeof now !== 'function') throw new Error('injected clock required');
  function load() {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) {
      if (e.code === 'ENOENT') return { version: 1, next: 1, earnedCents: 0, topUpCents: 0, spentCents: 0, caps: [], spends: [] };
      throw e;
    }
  }
  function save(state) {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const temp = file + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(state) + '\n', { mode: 0o600 });
    fs.renameSync(temp, file);
  }
  function available(state) { return state.earnedCents + state.topUpCents - state.spentCents; }
  function spentBy(state, agentId, ventureId) {
    return state.spends.filter(item => item.status === 'spent' && item.agentId === agentId && item.ventureId === ventureId)
      .reduce((sum, item) => sum + item.cents, 0);
  }
  function creditEarned(centsIn, { verified } = {}) {
    if (verified !== true) throw new Error('only verified earnings fund the treasury');
    const amount = cents(centsIn, 'earnings');
    const state = load();
    state.earnedCents += amount;
    save(state);
    return snapshot(state);
  }
  function topUp(centsIn, { confirmed } = {}) {
    if (confirmed !== true) throw new Error('owner-confirmation-required');
    const amount = cents(centsIn, 'top-up');
    if (amount < 1) throw new Error('top-up must be at least one cent');
    const state = load();
    state.topUpCents += amount;
    save(state);
    return snapshot(state);
  }
  function setCap({ agentId, ventureId, capCents, confirmed }) {
    if (confirmed !== true) throw new Error('owner-confirmation-required');
    if (!ID.test(String(agentId || '')) || !ID.test(String(ventureId || ''))) throw new Error('agent and venture required');
    const cap = cents(capCents, 'cap');
    const state = load();
    const row = state.caps.find(item => item.agentId === agentId && item.ventureId === ventureId);
    if (row) row.capCents = cap;
    else state.caps.push({ agentId, ventureId, capCents: cap });
    save(state);
    return snapshot(state);
  }
  function requestSpend({ agentId, ventureId, cents: amount, kind, note }) {
    if (!ID.test(String(agentId || '')) || !ID.test(String(ventureId || ''))) throw new Error('agent and venture required');
    if (!['listing-fee', 'tool', 'ad-spend', 'trading-capital', 'other'].includes(kind)) throw new Error('unknown spend kind');
    const state = load();
    const spend = { id: 'spend-' + state.next, agentId, ventureId, cents: cents(amount, 'spend'), kind, note: String(note || '').slice(0, 200), status: 'queued', at: now() };
    if (spend.cents < 1) throw new Error('spend must be at least one cent');
    state.next += 1;
    state.spends.push(spend);
    save(state);
    return spend;
  }
  function approveSpend(id, { confirmed } = {}) {
    if (confirmed !== true) throw new Error('owner-confirmation-required');
    const state = load();
    const spend = state.spends.find(item => item.id === id && item.status === 'queued');
    if (!spend) throw new Error('queued spend not found');
    const cap = state.caps.find(item => item.agentId === spend.agentId && item.ventureId === spend.ventureId);
    if (!cap) throw new Error('no hard cap for this agent');
    if (spentBy(state, spend.agentId, spend.ventureId) + spend.cents > cap.capCents) throw new Error('hard cap exceeded');
    if (spend.cents > available(state)) throw new Error('treasury cannot fund this spend');
    spend.status = 'spent';
    state.spentCents += spend.cents;
    save(state);
    return { spend, treasury: snapshot(state) };
  }
  function snapshot(state) {
    const current = state || load();
    return {
      earnedCents: current.earnedCents,
      topUpCents: current.topUpCents,
      spentCents: current.spentCents,
      availableCents: available(current),
      caps: current.caps,
      queue: current.spends.filter(item => item.status === 'queued')
    };
  }
  return Object.freeze({ creditEarned, topUp, setCap, requestSpend, approveSpend, snapshot });
}
module.exports = { createTreasury };
