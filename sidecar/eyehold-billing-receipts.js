/* Turn Eyehold billing-host receipts into the owner-reviewed finance store.
 * Credits and Crowns are not copied. Only paid USD amounts become revenue.
 * The operator still has to pass confirmedReviewed: the host feed is not a
 * bank reconciliation.
 */
'use strict';
function usdReceipt(row) {
  if (!row || row.verified !== true || row.livemode !== false || row.currency !== 'USD' || row.type !== 'revenue') return null;
  if (typeof row.id !== 'string' || !row.id.trim() || !Number.isSafeInteger(row.cents) || row.cents < 0) return null;
  return JSON.stringify({ id: row.id, currency: 'USD', type: 'revenue', cents: row.cents });
}
function importReviewedReceipts(store, feed, { confirmedReviewed = false } = {}) {
  if (confirmedReviewed !== true) throw new Error('Explicit local operator review required');
  if (!Array.isArray(feed)) throw new Error('Billing feed must be a list');
  const receipts = [];
  for (const row of feed) {
    const bytes = usdReceipt(row);
    if (!bytes) throw new Error('Billing feed row is not a reviewed test-mode USD receipt');
    receipts.push(bytes);
  }
  const report = store.replaceReviewed(receipts, { confirmedReviewed: true });
  return { ...report, creditsImported: 0, crownsImported: 0 };
}
module.exports = { importReviewedReceipts, usdReceipt };
