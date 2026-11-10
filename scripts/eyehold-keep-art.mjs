#!/usr/bin/env node
/* Original Eyehold keep art. Draws pixel art from code and writes the sheets
 * the seeded room actually samples. No upstream image is decoded or copied.
 * Re-running this file reproduces the same bytes.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const C = {
  stone: [58, 50, 42, 255], stone2: [78, 66, 54, 255], stone3: [42, 36, 32, 255],
  mortar: [22, 18, 16, 255], timber: [112, 68, 36, 255], timber2: [78, 46, 24, 255],
  gold: [230, 172, 101, 255], ember: [214, 104, 42, 255], flame: [244, 220, 170, 255],
  parchment: [232, 214, 176, 255], ink: [28, 20, 24, 255], leaf: [46, 82, 48, 255],
  leaf2: [78, 120, 62, 255], cloth: [112, 36, 46, 255], brass: [186, 142, 70, 255],
  night: [18, 14, 20, 255]
};

function buf(w, h) { return new Uint8ClampedArray(w * h * 4); }
function put(px, w, h, x, y, c) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= w || y >= h || !c) return;
  const i = (y * w + x) * 4;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = c[3];
}
function fill(px, w, h, x, y, rw, rh, c) {
  for (let yy = 0; yy < rh; yy++) for (let xx = 0; xx < rw; xx++) put(px, w, h, x + xx, y + yy, c);
}
function n32(x, y) {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function paintFloor(w, h) {
  const px = buf(w, h), cell = w / 8;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
    const lx = x % cell, ly = y % cell;
    const edge = lx < 3 || ly < 3 || lx > cell - 4 || ly > cell - 4;
    const tone = n32(cx, cy) > 0.55 ? C.stone2 : n32(cx + 3, cy + 1) > 0.8 ? C.stone3 : C.stone;
    const fleck = !edge && n32(x, y) > 0.985 ? C.gold : null;
    put(px, w, h, x, y, edge ? C.mortar : fleck || tone);
  }
  return px;
}

function paintWall(w, h) {
  const px = buf(w, h), bay = Math.floor(w / 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const bx = x % bay;
    const course = Math.floor(y / 36);
    const shift = (course & 1) ? Math.floor(bay / 5) : 0;
    const mortar = (y % 36) < 4 || ((bx + shift) % Math.floor(bay / 2)) < 4;
    const post = bx < 28 || bx >= bay - 28;
    const beam = y < 40 || y >= h - 48;
    const torchX = Math.abs(bx - Math.floor(bay / 2));
    const torchY = y - Math.floor(h * 0.38);
    let color = mortar ? C.mortar : (n32(course, Math.floor((bx + shift) / 20)) > 0.62 ? C.stone2 : C.stone);
    if (post || beam) color = ((bx + y) % 11) < 3 ? C.timber : C.timber2;
    if (torchX < 18 && torchY > -10 && torchY < 70) color = torchY < 24 ? C.flame : C.ember;
    if (torchX < 6 && torchY >= -36 && torchY < -10) color = C.gold;
    put(px, w, h, x, y, color);
  }
  return px;
}
function paintShell(w, h) {
  const px = buf(w, h), period = 96;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const lx = x % period, ly = y % period;
    const course = Math.floor(ly / 24);
    const shift = (course & 1) ? 20 : 0;
    const mortar = ly % 24 < 3 || (lx + shift) % 32 < 3;
    const beam = ly < 16 || ly > 80;
    let color = mortar ? C.mortar : (n32(Math.floor(x / period), course) > 0.5 ? C.stone2 : C.stone);
    if (beam) color = lx % 8 < 2 ? C.gold : C.timber;
    put(px, w, h, x, y, color);
  }
  return px;
}
function paintCrown(w, h) {
  const px = buf(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const band = y > h * 0.2 && y < h * 0.75;
    const stud = band && (x % 48) < 8 && Math.abs(y - h * 0.48) < 10;
    put(px, w, h, x, y, stud ? C.gold : band ? C.timber : C.timber2);
  }
  return px;
}

function sprite(sw, sh, draw) {
  const px = buf(sw, sh);
  const g = (x, y, w, h, c) => fill(px, sw, sh, x, y, w, h, c);
  draw(g, sw, sh);
  return px;
}

const SPRITES = {
  desk: (g, w, h) => {
    g(2, h - 16, 4, 14, C.timber2); g(w - 6, h - 16, 4, 14, C.timber2);
    g(1, 8, w - 2, 10, C.timber); g(2, 9, w - 4, 3, C.gold);
    g(6, 12, 12, 6, C.parchment); g(8, 14, 7, 1, C.ink);
    g(w - 12, 4, 3, 8, C.brass); g(w - 13, 2, 5, 3, C.flame);
  },
  'desk-n': (g, w, h) => { g(1, 4, w - 2, h - 8, C.timber2); g(2, 6, w - 4, 4, C.timber); g(4, 14, w - 8, h - 22, C.stone3); },
  'desk-e': (g, w, h) => { g(2, h - 14, w - 4, 4, C.timber); g(4, 8, 4, h - 16, C.timber2); g(w - 8, 6, 3, 6, C.flame); },
  'desk-w': (g, w, h) => { g(2, h - 14, w - 4, 4, C.timber); g(w - 8, 8, 4, h - 16, C.timber2); g(3, 6, 3, 6, C.flame); },
  plant: (g, w, h) => {
    g(w / 2 - 5, h - 12, 10, 8, C.timber); g(w / 2 - 3, h - 16, 6, 4, C.timber2);
    g(w / 2 - 2, h - 28, 4, 14, C.leaf); g(w / 2 - 8, h - 26, 6, 5, C.leaf2); g(w / 2 + 2, h - 24, 6, 5, C.leaf2);
  },
  banner: (g, w, h) => {
    g(w / 2 - 1, 1, 3, h - 2, C.timber2);
    g(w / 2 + 2, 6, w / 2 - 6, h - 16, C.cloth);
    g(w / 2 + 6, 12, 8, 4, C.gold); g(w / 2 + 8, 10, 4, 8, C.gold);
  },
  bookshelf: (g, w, h) => {
    g(1, 1, w - 2, h - 2, C.timber2);
    for (let i = 0; i < 4; i++) {
      const y = 4 + i * ((h - 8) / 4);
      g(3, y, w - 6, 2, C.timber);
      g(4, y + 2, 3, (h - 8) / 4 - 4, C.cloth); g(8, y + 2, 3, (h - 8) / 4 - 5, C.leaf);
      g(12, y + 3, 3, (h - 8) / 4 - 6, C.gold);
    }
  },
  chest: (g, w, h) => {
    g(2, h / 2, w - 4, h / 2 - 2, C.timber); g(3, h / 2 - 6, w - 6, 8, C.timber2);
    g(2, h / 2 + 2, w - 4, 2, C.brass); g(w / 2 - 2, h / 2 + 4, 4, 4, C.gold);
  },
  bench: (g, w, h) => {
    g(2, h - 14, 3, 12, C.timber2); g(w - 5, h - 14, 3, 12, C.timber2);
    g(1, 6, w - 2, 8, C.timber); g(4, 8, 6, 3, C.brass); g(12, 8, 8, 2, C.parchment);
  },
  lectern: (g, w, h) => {
    g(w / 2 - 2, h / 2, 4, h / 2 - 2, C.timber2);
    g(4, 8, w - 8, 8, C.timber); g(6, 10, w - 14, 4, C.parchment);
    g(w - 10, 4, 3, 6, C.flame);
  }
};

const KINDS = {
  'desk.png': 'desk', 'desk-n.png': 'desk-n', 'desk-e.png': 'desk-e', 'desk-w.png': 'desk-w',
  'plant.png': 'plant', 'comms_dish.png': 'banner', 'war_intelcab.png': 'bookshelf',
  'gigs_servercart.png': 'chest', 'workbench.png': 'bench', 'studio.png': 'lectern'
};

function pngSize(file) {
  const b = readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function cropOf(px, w, h) {
  let l = w, t = h, r = -1, b = -1;
  for (let i = 3; i < px.length; i += 4) if (px[i]) {
    const n = (i - 3) / 4, x = n % w, y = Math.floor(n / w);
    if (x < l) l = x; if (y < t) t = y; if (x > r) r = x; if (y > b) b = y;
  }
  if (r < 0) throw new Error('empty sprite');
  return { x: l, y: t, width: r - l + 1, height: b - t + 1 };
}
function blitInto(dst, dw, dh, crop, kind) {
  const sw = 32, sh = 40;
  const src = sprite(sw, sh, SPRITES[kind]);
  for (let y = 0; y < crop.height; y++) for (let x = 0; x < crop.width; x++) {
    const sx = Math.min(sw - 1, Math.floor(x * sw / crop.width));
    const sy = Math.min(sh - 1, Math.floor(y * sh / crop.height));
    const si = (sy * sw + sx) * 4;
    if (!src[si + 3]) continue;
    const di = ((crop.y + y) * dw + (crop.x + x)) * 4;
    dst[di] = src[si]; dst[di + 1] = src[si + 1]; dst[di + 2] = src[si + 2]; dst[di + 3] = 255;
  }
  const ink = C.timber2;
  for (const [x, y] of [[crop.x, crop.y], [crop.x + crop.width - 1, crop.y], [crop.x, crop.y + crop.height - 1], [crop.x + crop.width - 1, crop.y + crop.height - 1]]) {
    put(dst, dw, dh, x, y, ink);
  }
}

const geometryPath = 'frontend/assets/industrial/projection-correction/runtime-geometry.json';
const coveragePath = 'docs/station-remaster/projection-effects/coverage.json';
const geometry = JSON.parse(readFileSync(join(root, geometryPath), 'utf8'));
const crops = new Map();
for (const view of Object.values(geometry.views)) {
  crops.set('frontend/assets/industrial/projection-correction/' + view.image, view.crop);
}

const assets = [];
async function writeRaw(rel, px, w, h, role) {
  const file = join(root, rel);
  const old = createHash('sha256').update(readFileSync(file)).digest('hex');
  const png = await sharp(Buffer.from(px), { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  writeFileSync(file, png);
  const sha256 = createHash('sha256').update(png).digest('hex');
  assets.push({ path: rel, role, provenance: 'original', license: 'MIT', width: w, height: h, sha256, replaces: old });
  return { old, sha256 };
}

const floorRel = 'frontend/assets/industrial/remaster/floors/resin.png';
const floorSize = pngSize(join(root, floorRel));
await writeRaw(floorRel, paintFloor(floorSize.w, floorSize.h), floorSize.w, floorSize.h, 'keep-floor');
const wallRel = 'frontend/assets/industrial/remaster/walls/panelled-v3.png';
const wallSize = pngSize(join(root, wallRel));
await writeRaw(wallRel, paintWall(wallSize.w, wallSize.h), wallSize.w, wallSize.h, 'keep-wall');
for (const [rel, paint, role] of [
  ['frontend/assets/industrial/remaster/shell-v2.png', paintShell, 'keep-shell'],
  ['frontend/assets/industrial/remaster/crown.png', paintCrown, 'keep-crown']
]) {
  const size = pngSize(join(root, rel));
  await writeRaw(rel, paint(size.w, size.h), size.w, size.h, role);
}

const replacements = new Map();
for (const [name, kind] of Object.entries(KINDS)) {
  const rel = 'frontend/assets/industrial/projection-correction/' + name;
  const { w, h } = pngSize(join(root, rel));
  const crop = crops.get(rel);
  if (!crop) throw new Error('missing crop ' + rel);
  const px = buf(w, h);
  blitInto(px, w, h, crop, kind);
  const got = cropOf(px, w, h);
  if (got.x !== crop.x || got.y !== crop.y || got.width !== crop.width || got.height !== crop.height) {
    throw new Error(name + ' crop drifted ' + JSON.stringify(got));
  }
  const hashes = await writeRaw(rel, px, w, h, 'keep-prop:' + kind);
  replacements.set(hashes.old, hashes.sha256);
}

let geometryText = readFileSync(join(root, geometryPath), 'utf8');
let coverageText = readFileSync(join(root, coveragePath), 'utf8');
for (const [old, sha] of replacements) {
  if (!geometryText.includes(old) || !coverageText.includes(old)) throw new Error('hash missing from locks ' + old);
  geometryText = geometryText.split(old).join(sha);
  coverageText = coverageText.split(old).join(sha);
}
writeFileSync(join(root, geometryPath), geometryText);
writeFileSync(join(root, coveragePath), coverageText);

const manifest = {
  generator: 'scripts/eyehold-keep-art.mjs',
  provenance: 'original',
  license: 'MIT',
  note: 'Procedural pixel art for the seeded Eyehold room. Upstream sheets were not sampled. Crowns are not depicted as money.',
  assets
};
writeFileSync(join(root, 'docs/eyehold-keep-art.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('eyehold keep art: ' + assets.length + ' original sheets');
