'use strict';
// No secrets, provider requests or paid inference: backend/launch preflight.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const world=read('frontend/app/worldmodel.js');
const app=read('frontend/app/app.js');
const index=read('frontend/index.html');
const handler=read('sidecar/eyehold-owner-review-http.js');
const multi=read('test/eyehold-live-multidepartment.test.js');
for(const fn of ['addRoom','setRoomTerritory','replaceLayout','assignDesk'])assert(world.includes(fn),'native keep API missing: '+fn);
for(const fn of ['summonAgent','keep: () => keep','persist','pushRoster'])assert(app.includes(fn),'real runtime method missing: '+fn);
for(const file of ['eyehold-workboard','eyehold-layout-install','eyehold-staff-departments','eyehold-departments'])assert(index.includes('app/'+file+'.js'),'UI not mounted: '+file);
assert(handler.includes("typeof authorizeRequest!=='function'||typeof inspectEvidence!=='function'"),'approval must fail closed');
assert(handler.includes('operator.authorized!==true'),'owner authentication is required');
assert(multi.includes("SKYNET_BUDGET_PER_RUN:'0.20'"),'per-run budget must be capped');
const workflows=['eyehold-live-multidepartment.yml','eyehold-produce-deliverable.yml','eyehold-seven-room-blueprint.yml'];
for(const file of workflows){const y=read('.github/workflows/'+file);assert(y.includes('workflow_dispatch:'),'manual launch required: '+file);assert(!/^\s+schedule:/m.test(y),'no scheduled charge allowed: '+file);assert(!/^\s+push:/m.test(y),'no automatic run allowed: '+file)}
console.log('PASS: native persistence/room/roster seams, fail-closed owner review, budget and manual-only workflow triggers');
console.log('PENDING: live game launch, real operator authentication, UI clicks, paid two-specialist delegation, external integrations and verified USD profit.');
