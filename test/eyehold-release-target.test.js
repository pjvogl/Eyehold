'use strict';
const assert=require('node:assert/strict');
const {validateTarget}=require('../scripts/eyehold/release-target.cjs');
const config=require('../src-tauri/tauri.conf.json');
assert.equal(validateTarget({sourceRepo:'pjvogl/eyehold',targetRepo:'Eyehold/eyehold-releases',config}).ok,false);
const input={sourceRepo:'owner/fork',targetRepo:'owner/releases',config:{bundle:{publisher:'Fixture Publisher',createUpdaterArtifacts:true},plugins:{updater:{endpoints:['https://github.com/owner/releases/releases/latest/download/latest.json']}}},review:{status:'approved-for-distribution',reviewer:'fixture-owner',evidence:['fixture-art-review']}};
assert.equal(validateTarget(input).ok,true,'syntactically configured fixture only; does not prove signing');
assert.equal(validateTarget({...input,targetRepo:'other/releases'}).ok,false);
assert.equal(validateTarget({...input,review:null}).ok,false);
assert.equal(validateTarget({...input,config}).ok,false,'actual development config remains unshippable');
const fs=require('node:fs'),path=require('node:path');
for(const name of ['release.yml','release-train.yml','desktop-build.yml','sync-source-release.yml']){
 const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows',name),'utf8');
 assert.match(workflow,/node scripts\/eyehold\/release-target\.cjs/,'public workflow enforces release policy: '+name);
 assert.doesNotMatch(workflow,/--repo Eyehold\/eyehold-releases|^\s+(?:REPO|DISTRIBUTION_REPO): Eyehold/m,'no actionable inherited upstream target: '+name);
}
console.log('PASS: release policy refuses upstream destinations, missing independent review and unsigned development config');
