/* EYEHOLD — legacymigrate.js : one-time localStorage key migration for the Skynet→Eyehold rename.

   The project was renamed Skynet → Eyehold. Every browser-side key the app owns moved from the
   `skynet.*` prefix to `eyehold.*`. This script runs FIRST (before any store reads localStorage —
   it is the very first <script> in index.html) and copies each legacy `skynet.*` key forward to its
   `eyehold.*` name when the new key is absent. The OLD keys are LEFT IN PLACE as a rollback, so a
   downgrade still finds its data and a botched migration loses nothing. Idempotent (re-running is a
   no-op once the new keys exist) and origin-scoped (localStorage is per port, so this only ever
   touches the one origin the user loads — there is no cross-tab/worktree split-brain).

   The planning core is a PURE function so it is unit-testable headless; run() just binds it to a
   real Storage. No dependencies — safe to load before everything else. */
'use strict';

const LegacyMigrate = (() => {
  const LEGACY = 'skynet.';
  const CURRENT = 'eyehold.';

  // pure: given a snapshot of [key, value] entries, return the [{ key, value }] writes needed to bring
  // every legacy `skynet.*` key forward — skipping any whose `eyehold.*` target already exists (never clobber).
  // Layout saves used to say "station". The app now says "keep". Copy the old key
  // forward and leave it in place. A newer keep key is never overwritten.
  function keepName(key) {
    return key
      .replace(/(^|[^A-Za-z])STATION/g, '$1KEEP')
      .replace(/(^|[^A-Za-z])Station/g, '$1Keep')
      .replace(/(^|[^A-Za-z])station/g, '$1keep');
  }
  function plan(entries) {
    const have = new Set(entries.map(e => e[0]));
    const writes = [];
    function add(key, value) {
      if (have.has(key)) return;
      have.add(key);
      writes.push({ key, value });
    }
    const rows = entries.filter(e => typeof e[0] === 'string');
    for (const [k, v] of rows) {
      if (k.indexOf(CURRENT) !== 0) continue;
      const nk = keepName(k);
      if (nk !== k) add(nk, v);
    }
    for (const [k, v] of rows) {
      if (k.indexOf(LEGACY) !== 0) continue;
      add(keepName(CURRENT + k.slice(LEGACY.length)), v);
    }
    return writes;
  }

  function run(storage) {
    try {
      const entries = [];
      for (let i = 0; i < storage.length; i++) { const k = storage.key(i); entries.push([k, storage.getItem(k)]); }
      const writes = plan(entries);
      for (const w of writes) storage.setItem(w.key, w.value);
      return writes.length;
    } catch (_) { return 0; }
  }

  // run immediately in the browser, before any store reads its key.
  if (typeof window !== 'undefined' && window.localStorage) { try { run(window.localStorage); } catch (_) {} }

  return { plan, run, LEGACY, CURRENT };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = LegacyMigrate;
