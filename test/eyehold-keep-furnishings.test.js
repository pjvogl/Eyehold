'use strict';
/* The seeded stone keep keeps its original floor, wall, shell, and crown sheets,
   and gains original cosmetic furnishings that leave the desk seat and the open
   aisle walkable. None of these props grant a capability. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

const utilSrc = fs.readFileSync(path.join(root, 'frontend/js/util.js'), 'utf8');
global.window = global.window || { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
global.document = global.document || { addEventListener() {}, documentElement: { style: { setProperty() {} } }, createElement: () => ({ getContext: () => null, style: {} }) };
global.U = new Function(utilSrc + '; return U;')();

const WM = require('../frontend/app/worldmodel.js');
const PS = require('../frontend/app/propsprites.js');
WM.setPropRules(t => PS.ruleFor(t));

const KEEP_ROLES = ['keep-floor', 'keep-wall', 'keep-shell', 'keep-crown'];
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/eyehold-keep-art.json'), 'utf8'));
for (const role of KEEP_ROLES) {
  const row = manifest.assets.find(item => item.role === role);
  assert.ok(row, role + ' still ships');
  const bytes = fs.readFileSync(path.join(root, row.path));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), row.sha256, role + ' sheet was kept');
}

const FURNISHINGS = {
  eyehold_hearth: { label: 'STONE HEARTH', w: 2, h: 2, blocks: true, n: 1 },
  eyehold_bookcase: { label: 'OAK BOOKCASE', w: 1, h: 2, blocks: true, n: 2 },
  eyehold_banner: { label: 'KEEP BANNER', w: 2, h: 1, blocks: false, n: 1 },
  eyehold_map: { label: 'REALM MAP', w: 2, h: 1, blocks: false, n: 1 },
  eyehold_rug: { label: 'KEEP RUG', w: 4, h: 3, blocks: false, n: 1 },
  eyehold_runner: { label: 'LONG RUG', w: 4, h: 2, blocks: false, n: 1 },
  eyehold_scribe: { label: 'SCRIBE DESK', w: 2, h: 1, blocks: true, n: 1 },
  eyehold_chest: { label: 'BANDED CHEST', w: 1, h: 1, blocks: true, n: 2 },
  eyehold_candle: { label: 'TALLOW CANDLE', w: 1, h: 1, blocks: false, n: 4 }
};

const doc = WM.starterDoc();
const props = doc.props;
for (const [type, want] of Object.entries(FURNISHINGS)) {
  const placed = props.filter(p => p.t === type);
  assert.equal(placed.length, want.n, type + ' count');
  const spec = PS.spec(type);
  assert.ok(spec, type + ' is in the catalog');
  assert.equal(spec.label, want.label, type + ' keeps an original name');
  assert.equal(spec.tier, 'cosmetic', type + ' is decoration');
  assert.equal(spec.cat, 'decor', type);
  assert.equal(WM.capForProp(type), null, type + ' grants nothing');
  assert.equal(PS.has(type), true, type + ' has original draw art');
  for (const p of placed) {
    assert.deepEqual([p.w, p.h, p.block !== false], [want.w, want.h, want.blocks], type + ' footprint');
    assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.w - 1 <= 17 && p.y + p.h - 1 <= 10, type + ' stays inside the keep');
  }
}
assert.equal(props.filter(p => p.t === 'desk').length, 1, 'the workstation is still the one desk');
assert.equal(props.some(p => p.t === 'eyehold_scribe'), true, 'a scribe desk furnishes the room without becoming a second workstation');

const occupied = new Map();
for (const p of props) {
  if (PS.spec(p.t) && PS.spec(p.t).flat) continue;
  for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) {
    const k = x + ',' + y;
    assert.equal(occupied.has(k), false, 'furnishings overlap at ' + k + ' (' + occupied.get(k) + ' and ' + p.t + ')');
    occupied.set(k, p.t);
  }
}
for (let x = 0; x <= 17; x++) for (let y = 2; y <= 7; y++) {
  assert.equal(occupied.has(x + ',' + y), false, 'the aisle ' + x + ',' + y + ' stays clear for lines and walking');
}

const st = WM.create(doc);
assert.equal(st.canPlaceProp('intake', 4, 4, 2, 2).ok, true, 'the central workflow lane stays free');
const hero = st.ensureWorkstation('agent');
assert.equal(hero.ok && hero.adopted, true, 'boot still adopts the prepared desk');
assert.equal(st.props().filter(p => p.t === 'desk').length, 1, 'adopting the desk does not build another');
const crew = st.ensureWorkstation('rex');
assert.equal(crew.ok, true, 'a second agent still finds a work spot: ' + (crew.error || crew.msg || 'ok'));
assert.notEqual(crew.id, hero.id, 'the second agent does not take the prepared desk');

const geo = st.projectGeometry();
const localDesk = geo.props.find(p => p.id === hero.id);
assert.ok(localDesk, 'the desk is on the floor');
const seats = [{ x: localDesk.x, y: localDesk.y + 1 }, { x: localDesk.x + 1, y: localDesk.y + 1 }];
assert.ok(seats.every(s => geo.walkable(s.x, s.y)), 'both tiles south of the desk are walkable seats');

function approach(prop) {
  const spots = [];
  for (let x = prop.x; x < prop.x + prop.w; x++) spots.push({ x, y: prop.y - 1 }, { x, y: prop.y + prop.h });
  for (let y = prop.y; y < prop.y + prop.h; y++) spots.push({ x: prop.x - 1, y }, { x: prop.x + prop.w, y });
  return spots.find(s => geo.walkable(s.x, s.y)) || null;
}
const workTypes = ['desk', 'war_intelcab', 'workbench', 'comms_dish', 'gigs_servercart', 'studio', 'eyehold_hearth', 'eyehold_bookcase', 'eyehold_scribe', 'eyehold_chest'];
for (const type of workTypes) {
  for (const prop of geo.props.filter(p => p.t === type)) {
    const spot = approach(prop);
    assert.ok(spot, type + ' has a walkable side');
    const route = geo.path(seats[0].x, seats[0].y, spot.x, spot.y);
    assert.ok(route, 'a path reaches ' + type + ' from the desk seat');
  }
}
const bookcases = geo.props.filter(p => p.t === 'eyehold_bookcase').sort((a, b) => a.x - b.x);
const plants = geo.props.filter(p => p.t === 'plant').sort((a, b) => a.x - b.x);
const west = bookcases[0];
const east = plants[plants.length - 1];
assert.ok(west && east && west.x < east.x, 'the furnished room still has both ends');
assert.ok(geo.path(approach(west).x, approach(west).y, approach(east).x, approach(east).y), 'the long aisle still connects the west bookcase to the east wall');

function paint(type, when) {
  const rects = [];
  const ctx = {
    fillStyle: '', rects,
    fillRect(x, y, w, h) { if (w > 0 && h > 0) rects.push([x, y, w, h, ctx.fillStyle]); },
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
    translate() {}, scale() {}, transform() {}, setLineDash() {}
  };
  PS.setCtx(ctx);
  PS.setNow(when);
  const spec = PS.spec(type);
  PS.draw({ t: type, x: 4, y: 4, w: spec.w, h: spec.h, id: 'paint' }, false);
  return rects;
}
for (const type of Object.keys(FURNISHINGS)) {
  const rects = paint(type, 0);
  assert.ok(rects.length >= 6, type + ' paints (' + rects.length + ' rects)');
  const spec = PS.spec(type);
  const X = 4 * PS.TILE, Y = 4 * PS.TILE, W = spec.w * PS.TILE, H = spec.h * PS.TILE;
  for (const [x, y, w, h] of rects) {
    assert.ok(x >= X - 10 && x + w <= X + W + 10 && y >= Y - 44 && y + h <= Y + H + 8, type + ' stays on its footprint');
  }
}
const cold = JSON.stringify(paint('eyehold_hearth', 0));
const hot = JSON.stringify(paint('eyehold_hearth', 160));
assert.notEqual(cold, hot, 'the hearth fire moves');
const wick = JSON.stringify(paint('eyehold_candle', 0));
const wick2 = JSON.stringify(paint('eyehold_candle', 160));
assert.notEqual(wick, wick2, 'the candle flame moves');
const hearthColors = paint('eyehold_hearth', 160).map(r => r[4]).join(' ');
assert.ok(hearthColors.includes('#d6682a') && hearthColors.includes('#f4dcaa'), 'the hearth paints ember and flame');

const src = fs.readFileSync(path.join(root, 'frontend/app/propsprites.js'), 'utf8');
const drawBlock = src.slice(src.indexOf('F.eyehold_hearth'), src.indexOf('const CATALOG'));
assert.equal(/drawImage|projection-correction|approved-sheet/.test(drawBlock), false, 'furnishing art is procedural, not an upstream sheet');

console.log('Eyehold keep furnishings: ' + Object.keys(FURNISHINGS).length + ' original prop kinds, aisle and desk seat open');
