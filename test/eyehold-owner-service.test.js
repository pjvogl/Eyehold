/* Real host HTTP boundary and durable award proof; seeded outputs are test
 * fixtures, never a claim of a new model run or a real owner acceptance.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {SidecarFixture}=require('./helpers/sidecar-fixture.js');
const {provision,authFile}=require('../sidecar/eyehold-owner-auth.js');
const fixture=SidecarFixture.create({env:{EYEHOLD_BUDGET_GLOBAL:'0',EYEHOLD_BUDGET_PER_DAY:'0',EYEHOLD_LIVE_PRICES:'0'}});
const row={runId:'review-run',agentId:'deepforge',reason:'done',deliveryText:'Fixture only: readiness checks, measured acceptance criteria, and rollback plan.',ts:Date.now()};
let key;
const endpoint='/api/eyehold/review';
async function request(body,ownerKey){return fixture.json('POST',endpoint,body,{headers:{'X-Eyehold-Owner-Key':ownerKey||''}})}
async function run(){
 fs.writeFileSync(path.join(fixture.workspace,'runs.jsonl'),JSON.stringify(row)+'\n');
 key=provision(fixture.workspace);
 assert(!fs.readFileSync(authFile(fixture.workspace),'utf8').includes(key),'only hash stored');
 assert.throws(()=>provision(fixture.workspace),{code:'EEXIST'},'existing owner cannot be replaced');
 await fixture.start();
 assert.equal((await fixture.request(endpoint,{headers:{'X-Eyehold-Token':''}})).status,403,'existing host gate remains');
 assert.equal((await fixture.json('GET',endpoint+'?runId=review-run')).status,422,'a current business goal is required');
 await fixture.json('POST','/api/goals',{goal:{id:'g1',text:'Prepare a verifiable release readiness pilot',milestones:[]}});
 let packet=(await fixture.json('GET',endpoint+'?runId=review-run')).body;
 assert.equal(packet.output,row.deliveryText);
 const body={runId:packet.runId,outputDigest:packet.outputDigest,goalDigest:packet.goalDigest,goalAdvanced:true,quality:4};
 assert.equal((await request({...body,authenticated:true,verified:true})).status,403,'JSON cannot grant owner authority');
 assert.equal((await request(body,fixture.token)).status,403,'shared API credential is not owner authority');
 assert.equal((await request({...body,outputDigest:'sha256:'+'0'.repeat(64)},key)).status,409,'changed evidence fails');
 await fixture.json('POST','/api/goals',{goal:{id:'g1',text:'A changed goal with the same ID',milestones:[]}});
 assert.equal((await request(body,key)).status,409,'same goal id with changed wording needs new review');
 packet=(await fixture.json('GET',endpoint+'?runId=review-run')).body;body.goalDigest=packet.goalDigest;
 const accepted=await request({...body,testPassed:true,predeclaredComplexity:2,contributors:['agent','deepforge'],verificationMethod:'objective-test'},key);
 assert.equal(accepted.status,200,JSON.stringify(accepted.body));
 assert.equal(accepted.body.totals.deepforge,18,'server enforces human review, complexity one and no test bonus');
 assert.equal(accepted.body.totals.agent,undefined,'client cannot invent contributors');
 assert.equal((await request(body,key)).status,422,'one award per run');
 const file=path.join(fixture.workspace,'.eyehold','acceptances.v1.json');
 const record=JSON.parse(fs.readFileSync(file)).records[0];
 assert(record.reviewedBy);assert.equal(record.goalEvidenceRef,packet.outputDigest);
 await fixture.restart();
 assert.equal((await fixture.json('GET',endpoint)).body.totals.deepforge,18,'award survives process restart');
 await fixture.stop();
 fs.unlinkSync(path.join(fixture.workspace,'.eyehold','crowns.v1.json'));
 await fixture.start();
 assert.equal((await fixture.json('GET',endpoint)).body.totals.deepforge,18,'durable acceptance recovers interrupted award fold');
 await fixture.restart();
 assert.equal((await fixture.json('GET',endpoint)).body.totals.deepforge,18,'recovery does not double award');
 assert(!fixture.output().includes(key),'owner credential never logged');
 console.log('PASS: mounted owner review enforces separate credential, exact output and goal binding, server scoring, duplicate prevention, and award recovery across real sidecar restarts');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>fixture.dispose());
