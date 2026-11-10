/* Crowns track verified net profit. One Crown per whole dollar.
 * Paper and other simulated results are practice points and never Crowns.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,80}$/;
function wholeDollars(cents) {
  if (!Number.isSafeInteger(cents) || cents <= 0) return 0;
  return Math.floor(cents / 100);
}
function createVentureScore({ file }) {
  if (!path.isAbsolute(file)) throw new Error('Absolute score path required');
  function load() {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return { version: 1, rows: [] }; throw e; }
  }
  function save(state) {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, JSON.stringify(state) + '\n', { mode: 0o600 });
  }
  function row(state, agentId, ventureId) {
    let found = state.rows.find(item => item.agentId === agentId && item.ventureId === ventureId);
    if (!found) {
      found = { agentId, ventureId, netCents: 0, crowns: 0, practiceCents: 0, practicePoints: 0 };
      state.rows.push(found);
    }
    return found;
  }
  function creditVerified({ agentId, ventureId, revenueCents, computeCents, otherCostCents }) {
    if (!ID.test(String(agentId || '')) || !ID.test(String(ventureId || ''))) throw new Error('agent and venture required');
    for (const [value, label] of [[revenueCents, 'revenue'], [computeCents, 'compute'], [otherCostCents, 'other cost']]) {
      if (!Number.isSafeInteger(value) || value < 0) throw new Error(label + ' must be measured in cents');
    }
    const net = revenueCents - computeCents - otherCostCents;
    const state = load();
    const current = row(state, agentId, ventureId);
    current.netCents += net;
    current.crowns = wholeDollars(current.netCents);
    save(state);
    return { ...current, practicePoints: current.practicePoints, crowns: current.crowns };
  }
  function creditPractice({ agentId, ventureId, paperPnlCents }) {
    if (!ID.test(String(agentId || '')) || !ID.test(String(ventureId || ''))) throw new Error('agent and venture required');
    if (!Number.isSafeInteger(paperPnlCents)) throw new Error('paper result must be integer cents');
    const state = load();
    const current = row(state, agentId, ventureId);
    current.practiceCents += paperPnlCents;
    current.practicePoints = wholeDollars(current.practiceCents);
    save(state);
    return { agentId, ventureId, crowns: current.crowns, practicePoints: current.practicePoints, netCents: current.netCents };
  }
  function board() {
    return load().rows.map(item => ({
      agentId: item.agentId,
      ventureId: item.ventureId,
      netCents: item.netCents,
      crowns: item.crowns,
      practicePoints: item.practicePoints,
      practiceIsCrowns: false
    }));
  }
  return Object.freeze({ creditVerified, creditPractice, board, wholeDollars });
}
module.exports = { createVentureScore, wholeDollars };
