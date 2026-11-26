/* Treasury Watch reads verified Stripe receipts and nothing else.
 * Missing receipts stay unavailable. Crowns are not dollars.
 */
'use strict';
const { reportBusinessProfit } = require('./eyehold-finance-truth.js');
const { route } = require('./eyehold-department-loop.js');
const { wholeDollars } = require('./eyehold-venture-score.js');
function treasuryWatch(entries) {
  route({ fromDepartment: 'finance', kind: 'read-profit' });
  const stripe = (Array.isArray(entries) ? entries : []).filter(row => row && row.verified === true && row.currency === 'USD' && typeof row.id === 'string' && row.id.startsWith('stripe:') && row.evidenceRef);
  if (!stripe.length) return { department: 'finance', status: 'unavailable', netProfitUSD: null, reason: 'No verified Stripe receipts', crownsAreMoney: false };
  const report = reportBusinessProfit({ records: stripe });
  if (report.netProfitUSD == null) return { department: 'finance', status: 'unavailable', netProfitUSD: null, reason: report.reason, crownsAreMoney: false };
  return { department: 'finance', status: report.status, netProfitUSD: report.netProfitUSD, unlockedMilestonesUSD: report.completedMilestonesUSD, crownsAreMoney: false };
}
function crownsForVerifiedProfit(watch, netCents) {
  if (!watch || watch.status !== 'verified-records-only' || watch.netProfitUSD == null) return { crowns: 0, practicePoints: 0, reason: 'unverified' };
  return { crowns: wholeDollars(netCents), practicePoints: 0, reason: 'verified-net' };
}
module.exports = { treasuryWatch, crownsForVerifiedProfit };
