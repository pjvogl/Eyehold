/* Recovery of the existing workflow engine's durable records through the
 * actual host. Fixtures only; this does not run a paid or overnight task.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {SidecarFixture}=require('./helpers/sidecar-fixture.js');
const Jobs=require('../sidecar/routing/linejobs.js');
const f=SidecarFixture.create({env:{SKYNET_BUDGET_GLOBAL:'0',SKYNET_BUDGET_PER_DAY:'0',SKYNET_LIVE_PRICES:'0'}});
async function run(){
 let state=Jobs.start({jobs:[]},{id:'job-aaaaaaaaaaaa',line:'pilot-line',text:'Interrupted fixture',at:1}).state;
 state=Jobs.start(state,{id:'job-bbbbbbbbbbbb',line:'pilot-line',text:'Completed fixture',at:2}).state;
 state=Jobs.finish(state,'job-bbbbbbbbbbbb',{status:'delivered',at:3,output:'Saved fixture output',usd:0.02,runs:[{runId:'fixture-r1',agentId:'raven',reason:'done',usd:0.01},{runId:'fixture-r2',agentId:'deepforge',reason:'done',usd:0.01}]}).state;
 fs.writeFileSync(path.join(f.workspace,'line-jobs.json'),JSON.stringify({version:1,jobs:state.jobs}));
 await f.start();
 assert.equal((await f.request('/api/line-jobs',{headers:{'X-Eyehold-Token':''}})).status,403);
 const read=async id=>(await f.json('GET','/api/line-jobs/'+id)).body.job;
 let interrupted=await read('job-aaaaaaaaaaaa');
 assert.equal(interrupted.status,'interrupted');assert.match(interrupted.error,/station stopped/);
 assert.equal((await read('job-bbbbbbbbbbbb')).output,'Saved fixture output');
 await f.restart();
 assert.deepEqual(await read('job-aaaaaaaaaaaa'),interrupted,'interrupted work is retained, never silently replayed');
 const completed=await read('job-bbbbbbbbbbbb');
 assert.equal(completed.status,'delivered');assert.equal(completed.runs.length,2);assert.equal(completed.usd,0.02);
 assert.equal((await f.json('GET','/api/runs?agent=*')).body.runs.length,0,'reading/recovery never launches a run');
 console.log('PASS: real workflow host preserves completed stage records and costs, marks interrupted jobs honestly, and does not replay them after restart');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>f.dispose());
