'use strict';
const { makeKeepStore } = require('../keep-store.js');
// The same room scope World.heroCaps uses. A missing client snapshot may use the
// durable floor; an explicitly empty snapshot must never resurrect removed gear.
function savedPlacement(save, agentId) {
  if (!save || !save.keep) return [];
  const checked = makeKeepStore().validateKeepDoc(save.keep);
  if (!checked.ok) return [];
  const keep = checked.keep;
  const scoped = !!keep.agentRoomId(agentId);
  const types = scoped
    ? keep.bayObjects(agentId)
    : keep.props().map(p => keep.capForProp(p.t));
  const out = [...new Set(types.map(o => typeof o === 'string' ? o : o && o.objectType)
    .filter(t => t && t !== 'computer' && t !== 'connector' && t !== 'plugin'))]
    .map(objectType => ({ objectType }));
  // PLUGIN TERMINALS are per-instance like connector portals, but projected from the placement (their binding
  // names WHICH plugin): keep each bound terminal in scope as { objectType: 'plugin', pluginId }, once per plugin.
  const plugins = scoped
    ? keep.bayObjects(agentId).filter(o => o && typeof o === 'object' && o.objectType === 'plugin' && o.pluginId).map(o => o.pluginId)
    : keep.props().filter(p => p.t === 'plugin_terminal' && p.pluginId).map(p => p.pluginId);
  for (const pluginId of new Set(plugins)) out.push({ objectType: 'plugin', pluginId });
  return out;
}
module.exports = { savedPlacement };
