/* Tools each venture is allowed to call.
 * Etsy and a live broker are named so the gap is visible. They are not connected.
 * The trader's only money tool is a paper fill.
 */
'use strict';
const TOOLS = Object.freeze({
  'etsy-shop': Object.freeze(['research', 'draft', 'review', 'stripe-payment-link', 'etsy']),
  'digital-services': Object.freeze(['research', 'draft', 'review', 'stripe-payment-link']),
  trader: Object.freeze(['research', 'draft', 'review', 'paper-trade'])
});
function toolsFor(ventureId) {
  const tools = TOOLS[ventureId];
  if (!tools) throw new Error('unknown venture');
  return tools;
}
function assertTool(ventureId, tool) {
  if (!toolsFor(ventureId).includes(tool)) throw new Error('tool not granted for this venture: ' + tool);
  return tool;
}
module.exports = { TOOLS, toolsFor, assertTool };
