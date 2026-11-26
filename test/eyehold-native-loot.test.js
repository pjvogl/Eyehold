'use strict';
const assert=require('node:assert/strict');
const WorldModel=require('../frontend/app/worldmodel.js');
const {buildEyeholdKeep}=require('../scripts/eyehold-seven-room-starter.cjs');
const {applyTrustedMilestone,plan}=require('../frontend/app/eyehold-native-loot.js');
const keep=WorldModel.deserialize(buildEyeholdKeep().doc);
let saves=0;
const args={keep,persist:()=>saves++,verifyAttekeep:(proof,tier)=>proof?.trusted===true&&proof?.atUSD===tier};
assert.equal(plan(keep,1000000).length,7,'seven rooms get native prop placements');
assert.throws(()=>applyTrustedMilestone({...args,tier:1000000,attekeep:{trusted:false,atUSD:1000000}}),/Trusted milestone attekeep/);
assert.equal(saves,0,'untrusted client must not change world');
for(const tier of [1000000,10000000,100000000]){
 const result=applyTrustedMilestone({...args,tier,attekeep:{trusted:true,atUSD:tier}});
 assert.equal(result.complete,true,'all seven room decorations place for '+tier+': '+JSON.stringify(result.results));
 const repeat=applyTrustedMilestone({...args,tier,attekeep:{trusted:true,atUSD:tier}});
 assert.equal(repeat.complete,true);
 assert(repeat.results.every(x=>x.alreadyPresent),'repeated confirmation does not duplicate props');
}
const restored=WorldModel.deserialize(keep.serialize()).serialize();
const placed=restored.props.filter(p=>['plant','shelf','vault'].includes(p.t));
assert(placed.length>=21,'all 21 real keep cosmetics survive native WorldModel serialization');
assert(saves>=3);
console.log('PASS: all 21 real WorldModel room decorations persist and untrusted milestone calls fail closed');
console.log('PENDING: native fantasy-specific art assets; imported receipt-to-unlock path is covered by finance integration tests');
