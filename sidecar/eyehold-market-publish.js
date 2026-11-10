/* Owner execution of one queued market action. confirmed must be exactly true.
 * Anything else returns the queue unchanged and does not call the channel.
 */
'use strict';
async function publishQueued(market, actionId, { confirmed, adapter, secret, fetchImpl } = {}) {
  if (confirmed !== true) return { ok: false, error: 'owner-confirmation-required', queue: market.queue() };
  const queued = market.queue().find(item => item.id === actionId);
  if (!queued || !queued.listing) return { ok: false, error: 'queued action not found' };
  if (!adapter || adapter.id !== queued.channel) return { ok: false, error: 'channel-not-available' };
  const receipt = await adapter.publish(queued.listing, { secret, fetchImpl, contactCustomer: false });
  const saved = market.markPublished(actionId, receipt);
  return { ok: true, ...saved };
}
module.exports = { publishQueued };
