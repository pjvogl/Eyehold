/* Station market outbox. Bots may propose a sellable deliverable.
 * Proposing never calls a payment provider. Publish and customer contact
 * stay queued until the owner executes that one action.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,80}$/;
const CHANNEL = /^[a-z0-9][a-z0-9-]{0,40}$/;
function clean(value, max) {
  const text = String(value || '').trim();
  if (!text || text.length > max) throw new Error('listing text is missing or too long');
  return text;
}
function createMarket({ file, now }) {
  if (!path.isAbsolute(file)) throw new Error('Absolute market path required');
  if (typeof now !== 'function') throw new Error('injected clock required');
  function load() {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return { version: 1, next: 1, listings: [], actions: [] }; throw e; }
  }
  function save(state) {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const temp = file + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(state) + '\n', { mode: 0o600 });
    fs.renameSync(temp, file);
  }
  function propose({ agentId, title, description, priceCents, channel, deliverableRef, computeCents }) {
    if (!ID.test(String(agentId || '')) || !ID.test(String(deliverableRef || ''))) throw new Error('agent and deliverable are required');
    if (!CHANNEL.test(String(channel || ''))) throw new Error('channel id is required');
    if (!Number.isSafeInteger(priceCents) || priceCents < 50 || priceCents > 10000000) throw new Error('price must be 50 cents to 100000 dollars');
    if (computeCents != null && (!Number.isSafeInteger(computeCents) || computeCents < 0)) throw new Error('compute cost must be measured in cents');
    const state = load();
    const id = 'listing-' + state.next;
    const listing = {
      id, agentId, title: clean(title, 80), description: clean(description, 500),
      priceCents, channel, deliverableRef, computeCents: computeCents == null ? null : computeCents,
      status: 'proposed', proposedAt: now()
    };
    const action = { id: 'action-' + state.next, listingId: id, kind: 'publish', channel, status: 'queued' };
    state.next += 1;
    state.listings.push(listing);
    state.actions.push(action);
    save(state);
    return { listing, action };
  }
  function queue() {
    const state = load();
    return state.actions.filter(action => action.status === 'queued').map(action => ({
      ...action, listing: state.listings.find(listing => listing.id === action.listingId) || null
    }));
  }
  function reject(actionId) {
    const state = load();
    const action = state.actions.find(item => item.id === actionId && item.status === 'queued');
    if (!action) throw new Error('queued action not found');
    action.status = 'rejected';
    const listing = state.listings.find(item => item.id === action.listingId);
    if (listing && listing.status === 'proposed') listing.status = 'rejected';
    save(state);
    return action;
  }
  function markPublished(actionId, receipt) {
    const state = load();
    const action = state.actions.find(item => item.id === actionId && item.status === 'queued');
    if (!action) throw new Error('queued action not found');
    action.status = 'done';
    action.receipt = receipt;
    const listing = state.listings.find(item => item.id === action.listingId);
    if (listing) listing.status = 'published';
    save(state);
    return { action, listing };
  }
  return Object.freeze({ propose, queue, reject, markPublished, load });
}
module.exports = { createMarket };
