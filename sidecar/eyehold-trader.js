/* Paper trading only until the owner graduates a trader.
 * Fills are simulated at the price the caller supplies. There is no broker
 * connection and no market-data fetch. A real order still has to be approved
 * one at a time, and this module refuses to send one.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,40}$/;
const LIMITS = Object.freeze({ maxPositionCents: 10000, maxLossCents: 2000, graduateMinTrades: 5, graduateMinPnlCents: 100, realBudgetCents: 2500 });
function createBrokerAdapter(spec) {
  if (!spec || typeof spec.id !== 'string') throw new Error('broker adapter needs an id');
  return Object.freeze({
    id: spec.id,
    liveOrder() { throw new Error('no live broker is connected'); }
  });
}
function createTrader({ file }) {
  if (!path.isAbsolute(file)) throw new Error('Absolute trader path required');
  function load() {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) {
      if (e.code === 'ENOENT') return { version: 1, next: 1, traders: [] };
      throw e;
    }
  }
  function save(state) {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, JSON.stringify(state) + '\n', { mode: 0o600 });
  }
  function book(state, agentId) {
    if (!ID.test(String(agentId || ''))) throw new Error('agent id required');
    let found = state.traders.find(item => item.agentId === agentId);
    if (!found) {
      found = { agentId, mode: 'paper', trades: 0, pnlCents: 0, qty: 0, avgCents: 0, graduated: false };
      state.traders.push(found);
    }
    return found;
  }
  function paperFill({ agentId, symbol, side, qty, priceCents }) {
    if (!ID.test(String(symbol || '')) || (side !== 'buy' && side !== 'sell')) throw new Error('symbol and side required');
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > 1000) throw new Error('quantity out of range');
    if (!Number.isSafeInteger(priceCents) || priceCents < 1) throw new Error('price required');
    const notional = qty * priceCents;
    if (notional > LIMITS.maxPositionCents) throw new Error('position limit');
    const state = load();
    const trader = book(state, agentId);
    if (trader.mode !== 'paper') throw new Error('paper fill is only for paper mode');
    if (side === 'buy') {
      const nextQty = trader.qty + qty;
      if (nextQty * priceCents > LIMITS.maxPositionCents) throw new Error('position limit');
      trader.avgCents = nextQty === 0 ? 0 : Math.floor((trader.qty * trader.avgCents + notional) / nextQty);
      trader.qty = nextQty;
    } else {
      if (qty > trader.qty) throw new Error('cannot sell more than the paper position');
      const realized = (priceCents - trader.avgCents) * qty;
      if (trader.pnlCents + realized < -LIMITS.maxLossCents) throw new Error('max loss');
      trader.pnlCents += realized;
      trader.qty -= qty;
      if (trader.qty === 0) trader.avgCents = 0;
    }
    trader.trades += 1;
    state.next += 1;
    save(state);
    return { mode: 'paper', simulated: true, agentId, symbol, side, qty, priceCents, pnlCents: trader.pnlCents, positionCents: trader.qty * priceCents, crowns: 0 };
  }
  function graduate(agentId, { confirmed } = {}) {
    if (confirmed !== true) throw new Error('owner-confirmation-required');
    const state = load();
    const trader = book(state, agentId);
    if (trader.trades < LIMITS.graduateMinTrades || trader.pnlCents < LIMITS.graduateMinPnlCents) throw new Error('paper results are not good enough');
    if (trader.pnlCents < -LIMITS.maxLossCents) throw new Error('max loss');
    trader.mode = 'real-budget';
    trader.graduated = true;
    trader.realBudgetCents = LIMITS.realBudgetCents;
    save(state);
    return { ...trader, liveBroker: false };
  }
  function status(agentId) {
    const trader = book(load(), agentId);
    return { ...trader, limits: LIMITS, liveBroker: false };
  }
  return Object.freeze({ paperFill, graduate, status, LIMITS });
}
module.exports = { createTrader, createBrokerAdapter, LIMITS };
