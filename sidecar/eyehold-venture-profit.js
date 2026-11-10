/* One owner-confirmed sale updates the profit ladder, the treasury, and Crowns.
 * The ladder stores revenue and compute. The treasury receives the net only.
 * Practice points are not touched.
 */
'use strict';
const { settleReviewedSale } = require('./eyehold-market-sales.js');
function settleVentureProfit({ finance, treasury, score, sale, agentId, ventureId, otherCostCents = 0, confirmedReviewed = false }) {
  if (confirmedReviewed !== true) throw new Error('Explicit local operator review required');
  if (!Number.isSafeInteger(otherCostCents) || otherCostCents < 0) throw new Error('other cost must be measured in cents');
  settleReviewedSale(finance, sale, { confirmedReviewed: true });
  if (otherCostCents > 0) {
    finance.appendReviewed([
      JSON.stringify({ id: sale.id + ':cost', currency: 'USD', type: 'expense', cents: otherCostCents })
    ], { confirmedReviewed: true });
  }
  const net = sale.cents - sale.computeCents - otherCostCents;
  if (net > 0) treasury.creditEarned(net, { verified: true });
  const scored = score.creditVerified({
    agentId, ventureId, revenueCents: sale.cents, computeCents: sale.computeCents, otherCostCents
  });
  return { ladder: finance.snapshot(), crowns: scored.crowns, netCents: scored.netCents, treasury: treasury.snapshot(), practicePoints: scored.practicePoints };
}
module.exports = { settleVentureProfit };
