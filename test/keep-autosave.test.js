'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const M = require('../frontend/app/worldmodel.js');
const T = require('../frontend/app/keeptemplates.js');
const P = require('../frontend/app/propsprites.js');
const app = fs.readFileSync(require.resolve('../frontend/app/app.js'), 'utf8');
const start = app.indexOf('  let unsubscribeKeepSave = null;');
const end = app.indexOf('  /* ---------- connect screen', start);
assert.ok(start > 0 && end > start, 'production autosave and persistence functions exist');
assert.match(app, /pendingKeepDoc = null;\s+watchKeepSave\(\);/, 'every loaded keep is subscribed');
const cache = new Map(), pushed = [], notices = [];
let fail = false, flashes = 0;
const c = vm.createContext({ console: { warn() {} }, queueMicrotask,
  localStorage: { getItem: k => cache.get(k) || null, setItem(k, v) { if (fail) throw Error('quota'); cache.set(k, v); } },
  keep: M.create(), agent: { id: 'agent', name: 'NOVA' }, agents: new Map(),
  liveAgents: () => [], Harness: { totals: () => ({}) }, Workstreams: { serialize: () => ({ workstreams: [{ id: 'keep-session' }] }) },
  rosterPushFailed: false, CloudSave: { revision: () => 7, push: d => pushed.push(d) },
  KeepUI: { flashSave: () => flashes++, notify: (...a) => notices.push(a) }
});
vm.runInContext(fs.readFileSync(require.resolve('../frontend/app/save.js'), 'utf8'), c);
vm.runInContext(app.slice(start, end), c);
const watch = () => vm.runInContext('watchKeepSave()', c);
const tick = () => new Promise(resolve => queueMicrotask(resolve));
const stored = () => JSON.parse(cache.get('eyehold.save'));
async function check(label, action) {
  const before = pushed.length;
  const result = action(); assert.notEqual(result && result.ok, false, label + ': valid mutation');
  await tick();
  assert.equal(pushed.length, before + 1, label + ': queued for durable write without closing Build');
  assert.deepEqual(stored().keep, c.keep.serialize(), label + ': complete keep round-trip');
  assert.equal(stored().workstreams[0].id, c.Workstreams.serialize().workstreams[0].id);
  assert.deepEqual(M.deserialize(stored().keep).serialize(), c.keep.serialize(), label + ': reload retains design');
}
(async () => {
  watch();
  const room = c.keep.spawnRoomId();
  await check('rename', () => c.keep.renameRoom(room, 'Saved workshop'));
  await check('floor', () => c.keep.setFloor(room, 'cobalt'));
  await check('walls', () => c.keep.setWalls(room, { style: 'hull' }));
  await check('hull', () => c.keep.setHull(room, { style: 'cobalt' }));
  let prop;
  await check('placement', () => { const r = c.keep.addProp({ t: 'plant', x: 3, y: 3, w: 1, h: 1 }); prop = r.id; return r; });
  await check('move', () => c.keep.moveProp(prop, 1, 0));
  await check('remove', () => c.keep.removeProp(prop));
  await check('undo', () => c.keep.undo());
  await check('redo', () => c.keep.redo());
  await check('preset', () => c.keep.replaceLayout(T.build('retreat', M, P, 1000)));
  await check('burst', () => { c.keep.renameRoom(c.keep.spawnRoomId(), 'One'); c.keep.renameRoom(c.keep.spawnRoomId(), 'Two'); });
  const previous = c.keep;
  c.keep = M.deserialize(stored().keep); watch(); watch();
  const count = pushed.length; previous.renameRoom(previous.spawnRoomId(), 'Detached'); await tick();
  assert.equal(pushed.length, count, 'replaced keeps cannot trigger saves');
  await check('reentry has one subscription', () => c.keep.renameRoom(c.keep.spawnRoomId(), 'Current'));
  const lastGood = cache.get('eyehold.save'), flashCount = flashes;
  fail = true;
  c.keep.renameRoom(c.keep.spawnRoomId(), 'Quota failure'); await tick();
  assert.equal(cache.get('eyehold.save'), lastGood, 'failed cache write preserves previous save');
  assert.equal(flashes, flashCount, 'failed write cannot flash saved');
  assert.match(notices[0][0], /Could not save keep/);
  assert.equal(vm.runInContext('persist()', c), false);
  assert.equal(notices.length, 1, 'storage failures do not flood notifications');
  fail = false; assert.equal(vm.runInContext('persist()', c), true);
  assert.equal(stored().keep.rooms[c.keep.spawnRoomId()].name, 'Quota failure', 'retry saves retained in-memory design');
  const noOpCount = pushed.length;
  assert.equal(c.keep.removeProp('not-a-prop').ok, false);
  await tick(); assert.equal(pushed.length, noOpCount, 'rejected edits do not schedule a save');
  const burstCount = pushed.length;
  for (let i = 0; i < 500; i++) c.keep.renameRoom(c.keep.spawnRoomId(), 'Rapid edit ' + i);
  await tick();
  assert.equal(pushed.length, burstCount + 1, 'large synchronous edit burst causes one save');
  assert.equal(stored().keep.rooms[c.keep.spawnRoomId()].name, 'Rapid edit 499');
  const departing = c.keep, reentryCount = pushed.length;
  departing.renameRoom(departing.spawnRoomId(), 'Queued before reentry');
  c.keep = M.create(); watch();
  c.keep.renameRoom(c.keep.spawnRoomId(), 'Replacement keep');
  await tick();
  assert.equal(pushed.length, reentryCount + 1, 'pending old callback and new edit coalesce across reentry');
  assert.deepEqual(stored().keep, c.keep.serialize(), 'queued save cannot resurrect the replaced model');
  const hero = { id: 'agent', name: 'NOVA' }, crew = { id: 'crew', name: 'VEGA' };
  c.agent = crew; c.agents = new Map([['agent', hero], ['crew', crew]]);
  c.liveAgents = () => [hero, crew]; c.serializeAgentLite = a => ({ ...a });
  c.Workstreams = { serialize: () => ({ workstreams: [{ id: 'new-session', draft: 'keep my draft' }], activeId: 'new-session' }) };
  await check('build while crew and another session are focused', () => c.keep.renameRoom(c.keep.spawnRoomId(), 'Crew editing'));
  assert.equal(stored().agent.id, 'agent', 'autosave retains the hero as the save root');
  assert.equal(stored().agents.length, 2, 'autosave retains the crew roster');
  assert.equal(stored().activeId, 'new-session', 'autosave retains the active session');
  assert.equal(stored().workstreams[0].draft, 'keep my draft', 'autosave retains session content');
  console.log('keep-autosave: edits, undo/redo, presets, coalescing, reentry and storage failure PASS');
})().catch(e => { console.error(e); process.exitCode = 1; });
