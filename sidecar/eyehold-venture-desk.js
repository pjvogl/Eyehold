/* Venture work uses the existing desks.
 * Deepforge produces. Silver Bough reviews. Iron Host may queue a listing,
 * payment, or trade only after that review and an owner click. Etsy,
 * digital services, and the paper trader are ventures, not extra departments.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { route } = require('./eyehold-department-loop.js');
const VENTURES = new Set(['etsy-shop', 'digital-services', 'trader']);
function createVentureDesk({ file, now }) {
  if (!path.isAbsolute(file)) throw new Error('Absolute venture desk path required');
  if (typeof now !== 'function') throw new Error('injected clock required');
  function load() {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return { version: 1, next: 1, items: [] }; throw e; }
  }
  function save(state) {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, JSON.stringify(state) + '\n', { mode: 0o600 });
  }
  function produce({ ventureId, artifact }) {
    route({ fromDepartment: 'production', kind: 'produce' });
    if (!VENTURES.has(ventureId)) throw new Error('unknown venture');
    const text = String(artifact || '').trim();
    if (!text) throw new Error('artifact required');
    const state = load();
    const item = { id: 'desk-' + state.next, ventureId, artifact: text.slice(0, 1000), status: 'draft', at: now() };
    state.next += 1;
    state.items.push(item);
    save(state);
    return item;
  }
  function review({ id, approved }) {
    route({ fromDepartment: 'quality', kind: 'review' });
    const state = load();
    const item = state.items.find(row => row.id === id && row.status === 'draft');
    if (!item) throw new Error('draft not found');
    item.status = approved === true ? 'reviewed' : 'returned';
    save(state);
    return item;
  }
  function queueOutward({ id, kind, confirmed }) {
    const state = load();
    const item = state.items.find(row => row.id === id);
    if (!item || item.status !== 'reviewed') throw new Error('Silver Bough has not reviewed this');
    if (item.ventureId === 'trader' && kind !== 'trade') throw new Error('the trader only queues a trade');
    route({ fromDepartment: 'operations', kind, confirmed });
    item.status = 'queued-outward';
    item.outward = kind;
    save(state);
    return item;
  }
  return Object.freeze({ produce, review, queueOutward, VENTURES });
}
module.exports = { createVentureDesk };
