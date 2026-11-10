/* A realized test-mode sale becomes revenue, and the measured compute cost
 * becomes a model-cost receipt. Missing compute is not treated as zero.
 * Crowns are not awarded here.
 */
'use strict';
function saleReceipts(sale) {
  if (!sale || sale.verified !== true || sale.livemode !== false || sale.currency !== 'USD') throw new Error('sale is not a verified test-mode USD payment');
  if (typeof sale.id !== 'string' || !sale.id.trim()) throw new Error('sale id required');
  if (!Number.isSafeInteger(sale.cents) || sale.cents < 0) throw new Error('sale amount required');
  if (!Number.isSafeInteger(sale.computeCents) || sale.computeCents < 0) throw new Error('compute cost not measured');
  return [
    JSON.stringify({ id: sale.id, currency: 'USD', type: 'revenue', cents: sale.cents }),
    JSON.stringify({ id: sale.id + ':compute', currency: 'USD', type: 'model-cost', cents: sale.computeCents })
  ];
}
function settleReviewedSale(store, sale, { confirmedReviewed = false } = {}) {
  if (confirmedReviewed !== true) throw new Error('Explicit local operator review required');
  const report = store.appendReviewed(saleReceipts(sale), { confirmedReviewed: true });
  return { ...report, crownsAwarded: 0 };
}
module.exports = { saleReceipts, settleReviewedSale };
