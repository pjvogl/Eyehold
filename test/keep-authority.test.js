/* node test/keep-authority.test.js - pure sidecar Keep authority store.
   Covers accepting SaveDoc.keep without trusting renderer-posted capability lists. */
'use strict';
const A = require('./_assert.js');
const WM = require('../frontend/app/worldmodel.js');
const { makeKeepStore } = require('../sidecar/keep-store.js');

function hasCap(objects, cap) {
  return objects.some(o => o === cap || (o && o.objectType === cap));
}

function keepDoc(agentId, withWorkkeep) {
  const doc = WM.defaultDoc();
  doc.props.push({ id: 'bay1', t: 'bay', x: 4, y: 1, w: 2, h: 2, agentId });
  if (withWorkkeep) doc.props.push({ id: 'pc1', t: 'console', x: 7, y: 1, w: 2, h: 1, agentId });
  doc._nid = 3;
  return doc;
}

{
  const store = makeKeepStore();
  const accepted = store.setSaveDoc({ schema: 'eyehold.save', keep: keepDoc('coder', true) });
  A.ok(accepted.ok, 'a SaveDoc with a valid keep is accepted');
  A.ok(store.hasKeep(), 'accepted SaveDoc.keep installs the authoritative keep');
  const objs = store.bayObjects('coder');
  A.ok(Array.isArray(objs), 'bayObjects derives from the installed keep');
  A.ok(hasCap(objs, 'computer'), 'derived bay objects include the real workkeep');
}

{
  const store = makeKeepStore();
  const accepted = store.setSaveDoc({ keep: keepDoc('coder', true) });
  A.ok(accepted.ok, 'valid SaveDoc.keep installs as last-good');
  const bad = store.setSaveDoc({ keep: { schema: 'eyehold.keep', version: 1, rooms: {}, order: [], props: [] } });
  A.ok(!bad.ok, 'invalid SaveDoc.keep is refused');
  A.ok(hasCap(store.bayObjects('coder'), 'computer'), 'last-good keep survives invalid SaveDoc update');
}

{
  const store = makeKeepStore();
  const missing = store.setSaveDoc({ schema: 'eyehold.save' });
  A.ok(!missing.ok, 'SaveDoc without keep is refused for authority installation');
  A.ok(!store.hasKeep(), 'missing SaveDoc.keep does not install authority');
}

A.report('keep-authority');
