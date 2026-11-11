'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/eyehold-keep-art.json'), 'utf8'));
assert.equal(manifest.provenance, 'original');
assert.equal(manifest.license, 'MIT');
assert.equal(manifest.generator, 'scripts/eyehold-keep-art.mjs');
assert.equal(fs.existsSync(path.join(root, manifest.generator)), true);
const roles = new Set(manifest.assets.map(row => row.role));
assert.equal(roles.has('keep-floor'), true);
assert.equal(roles.has('keep-wall'), true);
assert.ok(manifest.assets.length >= 12);
for (const row of manifest.assets) {
  assert.equal(row.provenance, 'original', row.path);
  assert.equal(row.license, 'MIT', row.path);
  assert.ok(row.path.startsWith('frontend/assets/industrial/'), row.path);
  const bytes = fs.readFileSync(path.join(root, row.path));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), row.sha256, row.path);
  assert.equal(bytes.readUInt32BE(16), row.width, row.path + ' width');
  assert.equal(bytes.readUInt32BE(20), row.height, row.path + ' height');
}
const geometry = JSON.parse(fs.readFileSync(path.join(root, 'frontend/assets/industrial/projection-correction/runtime-geometry.json'), 'utf8'));
for (const row of manifest.assets.filter(item => item.role.startsWith('keep-prop:'))) {
  const name = path.basename(row.path);
  const view = Object.values(geometry.views).find(item => item.image === name);
  assert.equal(view.sha256, row.sha256, name + ' geometry lock');
}
console.log('Eyehold keep art provenance OK (' + manifest.assets.length + ' original sheets)');
