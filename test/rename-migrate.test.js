/* node test/rename-migrate.test.js — Skynet→Eyehold localStorage migration (data-safety net).
   Proves the boot pass copies every legacy `skynet.*` key forward to `eyehold.*` WITHOUT losing the
   old keys (rollback), never clobbers an existing new key, ignores foreign keys, and is idempotent. */
'use strict';
const A = require('./_assert.js');
const LM = require('../frontend/app/legacymigrate.js');

// minimal Storage stand-in (length/key/getItem/setItem) over a Map.
function memStorage(init) {
  const m = new Map(Object.entries(init || {}));
  return {
    get length() { return m.size; },
    key(i) { return [...m.keys()][i]; },
    getItem(k) { return m.has(k) ? m.get(k) : null; },
    setItem(k, v) { m.set(k, String(v)); },
    _map: m
  };
}

// ---- A. plan() is pure: returns the forward-copies needed, skips foreign + already-present targets ----
{
  const writes = LM.plan([['skynet.save', 'A'], ['skynet.byok.key', 'K'], ['theme', 'dark']]);
  const byKey = Object.fromEntries(writes.map(w => [w.key, w.value]));
  A.eq(writes.length, 2, 'only the two skynet.* keys produce writes (foreign key ignored)');
  A.eq(byKey['eyehold.save'], 'A', 'skynet.save -> eyehold.save');
  A.eq(byKey['eyehold.byok.key'], 'K', 'skynet.byok.key -> eyehold.byok.key');
  A.eq('theme' in byKey || 'eyehold.theme' in byKey, false, 'a non-skynet key is left alone');
}

// ---- B. never clobber an existing eyehold.* key (a newer value already migrated) ----
{
  const writes = LM.plan([['skynet.save', 'OLD'], ['eyehold.save', 'NEW']]);
  A.eq(writes.length, 0, 'target already exists -> no write (NEW is preserved)');
}

// ---- C. run() against a real-ish Storage copies forward AND leaves the legacy key in place (rollback) ----
{
  const s = memStorage({ 'skynet.save': 'AGENT', 'skynet.station.v1': 'LAYOUT', 'pref.x': '1' });
  const n = LM.run(s);
  A.eq(n, 2, 'migrated two keys');
  A.eq(s.getItem('eyehold.save'), 'AGENT', 'agent save reachable under the new key');
  A.eq(s.getItem('eyehold.station.v1'), 'LAYOUT', 'station layout reachable under the new key');
  A.eq(s.getItem('skynet.save'), 'AGENT', 'legacy key LEFT IN PLACE (rollback safety)');
  A.eq(s.getItem('pref.x'), '1', 'foreign key untouched');
}

// ---- D. idempotent: a second run is a no-op (the new keys already exist) ----
{
  const s = memStorage({ 'skynet.save': 'A' });
  A.eq(LM.run(s), 1, 'first run migrates');
  A.eq(LM.run(s), 0, 'second run is a no-op');
  A.eq(s.getItem('eyehold.save'), 'A', 'value intact after re-run');
}

// ---- E. an already-Eyehold store (fresh install, no legacy keys) migrates nothing ----
{
  const s = memStorage({ 'eyehold.save': 'A', 'eyehold.byok.key': 'K' });
  A.eq(LM.run(s), 0, 'no legacy keys -> nothing to do');
}

A.report('rename-migrate.test');
