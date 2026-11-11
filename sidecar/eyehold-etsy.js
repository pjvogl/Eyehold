/* Etsy listing adapter. The Open API shape is here so a later connection can
 * use ETSY_API_KEY. This build does not call Etsy, with or without a key.
 * The owner still has to confirm before the adapter is asked.
 */
'use strict';
const { createChannelAdapter } = require('./eyehold-market-channels.js');
function etsyListingAdapter({ env = process.env } = {}) {
  return createChannelAdapter({
    id: 'etsy',
    async publish(listing, ctx) {
      if (!ctx || ctx.confirmed !== true) throw new Error('owner-confirmation-required');
      const key = env.ETSY_API_KEY || '';
      if (typeof (ctx.fetchImpl) === 'function') throw new Error('etsy-not-connected');
      if (key) throw new Error('etsy-not-connected');
      throw new Error('etsy-not-connected');
    }
  });
}
module.exports = { etsyListingAdapter };
