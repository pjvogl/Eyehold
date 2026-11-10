/* Live routing for the seven departments in eyehold-departments.js.
 * Command Keep assigns. Raven Court researches. Iron Host holds every
 * account, outreach, payment, listing, and trade until the owner confirms.
 * Deepforge produces. Silver Bough reviews. Treasury Watch only reads.
 */
'use strict';
const departments = require('../frontend/app/eyehold-departments.js');
const EXTERNAL = new Set(['account', 'outreach', 'payment', 'listing', 'trade']);
function department(id) {
  const row = departments.get(id);
  if (!row) throw new Error('unknown department');
  return row;
}
function route({ fromDepartment, kind, confirmed }) {
  const row = department(fromDepartment);
  if (EXTERNAL.has(kind)) {
    if (row.id !== 'operations' || row.authority !== 'approval-required') throw new Error('only Iron Host may hold an outward action');
    if (confirmed !== true) throw new Error('owner-confirmation-required');
    return { ok: true, department: row.id, authority: row.authority, kind, external: true };
  }
  if (kind === 'assign' && row.id !== 'command') throw new Error('only Command Keep assigns');
  if (kind === 'research' && row.id !== 'opportunities') throw new Error('only Raven Court serves research');
  if (kind === 'review' && row.id !== 'quality') throw new Error('only Silver Bough reviews');
  if (kind === 'read-profit' && row.id !== 'finance') throw new Error('only Treasury Watch reads verified profit');
  if (kind === 'produce' && row.id !== 'production') throw new Error('only Deepforge produces');
  if (kind === 'rank' && row.id !== 'strategy') throw new Error('only Star Sages rank');
  return { ok: true, department: row.id, authority: row.authority, kind, external: false };
}
function requestResearch({ fromDepartment, ventureId }) {
  const row = department(fromDepartment);
  const fromCommand = row.id === 'command';
  const fromVenture = row.id === 'production' || row.id === 'operations';
  if (!fromCommand && !fromVenture) throw new Error('research requests come from Command Keep or a venture desk');
  if (fromVenture && !ventureId) throw new Error('a venture request names its venture');
  return { to: 'opportunities', from: row.id, ventureId: ventureId || null, servedBy: 'Raven Court' };
}
module.exports = { route, requestResearch, EXTERNAL };
