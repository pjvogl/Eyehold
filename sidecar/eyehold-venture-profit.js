/* One owner-confirmed sale updates the profit ladder, the treasury, and Crowns.
 * The ladder stores revenue and compute. The treasury receives the net only.
 * Practice points are not touched.
 */
'use strict';
const { settleReviewedSale } = require('./eyehold-market-sales.js');
function settleVentureProfit({ finance, treasury, score, sale, agentId, ventureId, otherCostCents = 0, research = null, confirmedReviewed = false }) {
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
  let researcherShare = 0;
  if (research && net > 0) {
    if (!Number.isInteger(research.sharePercent) || research.sharePercent < 1 || research.sharePercent > 50) throw new Error('research share must be 1 to 50 percent');
    researcherShare = Math.floor(net * research.sharePercent / 100);
  }
  const workerNet = net - researcherShare;
  const scored = score.creditVerified({
    agentId, ventureId,
    revenueCents: workerNet + sale.computeCents + otherCostCents,
    computeCents: sale.computeCents,
    otherCostCents
  });
  let researcher = null;
  if (researcherShare > 0) {
    researcher = score.creditVerified({
      agentId: research.researcherId, ventureId, revenueCents: researcherShare, computeCents: 0, otherCostCents: 0
    });
  }
  return {
    ladder: finance.snapshot(), crowns: scored.crowns, researcherCrowns: researcher ? researcher.crowns : 0,
    netCents: net, treasury: treasury.snapshot(), practicePoints: scored.practicePoints
  };
}
module.exports = { settleVentureProfit };
