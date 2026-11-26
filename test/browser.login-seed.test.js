/* node test/browser.login-seed.test.js - keep the live attended-login proof floor-real. */
'use strict';
const A = require('./_assert.js');
const { ensureLoginKeep } = require('../dev/seed-mock-login.js');

{
  const save = { doc: { keep: null } };
  ensureLoginKeep(save);
  const keep = save.doc.keep;
  const dish = keep.props.find(prop => prop.t === 'comms_dish');
  A.eq(keep.schema, 'eyehold.keep', 'a null golden keep becomes a valid persisted keep document');
  A.ok(keep.rooms.r1 && keep.order[0] === 'r1', 'the proof keep carries the starter room topology');
  A.eq({ t: dish.t, w: dish.w, h: dish.h }, { t: 'comms_dish', w: 2, h: 2 }, 'the proof grants web with the real comms_dish prop');
}

{
  const keep = { _nid: 10, props: [{ id: 'p2', t: 'desk' }] };
  const save = { doc: { keep } };
  ensureLoginKeep(save);
  A.eq(keep.props[1].id, 'p10', 'an existing keep receives a collision-safe persisted prop id');
  A.eq(keep._nid, 11, 'the keep id counter advances with the inserted dish');
  ensureLoginKeep(save);
  A.eq(keep.props.filter(prop => prop.t === 'comms_dish').length, 1, 'seeding is idempotent');
}

{
  const save = {};
  A.eq(ensureLoginKeep(save), save, 'a malformed fixture is left untouched instead of fabricating a save document');
}

A.report('browser.login-seed.test');
