'use strict';
const assert=require('node:assert/strict');
const roles=require('../frontend/app/eyehold-roles.js');
assert.equal(Object.keys(roles.ROLES).length,7);
for(const id of Object.keys(roles.ROLES)){
 const r=roles.compose(id);
 assert(r.purpose.length>20&&r.manual.length>120,id);
 assert.match(r.manual,/permissions actually granted/);
}
assert.equal(roles.compose('unassigned'),null);
assert.equal(roles.compose('__proto__'),null);
assert.match(roles.compose('keep').manual,/never silently retry indefinitely/i);
assert.match(roles.compose('moonleaf').manual,/Market outbox/);
assert.match(roles.compose('moonleaf').manual,/Do not create a Stripe product/);
console.log('Eyehold seven opt-in specialist instructions OK');
