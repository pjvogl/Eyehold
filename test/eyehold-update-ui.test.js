'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../frontend/app/updates.js'),'utf8');
assert.match(src,/const EYEHOLD_UPDATES_ENABLED = false;/);
assert.match(src,/if \(!EYEHOLD_UPDATES_ENABLED\) return snapshot\(\);/);
assert.match(src,/if \(!EYEHOLD_UPDATES_ENABLED \|\| !RELEASES_PAGE\) return;/);
assert.doesNotMatch(src,/Eyehold\/eyehold-releases/);
console.log('Eyehold frontend updater lockout assertions OK');
