/* Real sidecar persistence: roster, seven physical workkeeps and sessions.
 * No /api/run calls, provider credentials or completed-work claims.
 */
'use strict';
const assert=require('node:assert/strict');
const {SidecarFixture}=require('./helpers/sidecar-fixture.js');
const {buildEyeholdKeep}=require('../scripts/eyehold-seven-room-starter.cjs');
const WorldModel=require('../frontend/app/worldmodel.js');
const Workstreams=require('../frontend/app/workstreams.js');
const ids=['agent','raven','sages','iron','deepforge','silver','treasury'];
const names=['THE EYE','RAVEN COURT','STAR SAGES','IRON HOST','DEEPFORGE','SILVER BOUGH','TREASURY WATCH'];
const specialties=['eyehold-keep','eyehold-archive','eyehold-astral','eyehold-foundry','eyehold-forge','eyehold-moonleaf','eyehold-astral'];
const roster=ids.map((agentId,i)=>({agentId,name:names[i],model:'openai/gpt-4.1-mini',provider:'openrouter',specialtyId:specialties[i],system:'Offline fixture only; never submit a model request.'}));
const fixture=SidecarFixture.create({env:{SKYNET_BUDGET_GLOBAL:'0',SKYNET_BUDGET_PER_DAY:'0',SKYNET_LIVE_PRICES:'0'}});
async function crew(){const r=await fixture.json('GET','/api/eyehold/crew');assert.equal(r.status,200);assert.equal(r.body.source,'server-roster');assert.deepEqual(r.body.agents.map(a=>a.agentId).sort(),[...ids].sort());for(const a of r.body.agents){assert.equal(a.model,'openai/gpt-4.1-mini');assert.equal(a.provider,'openrouter');assert(!('system' in a),'read-only crew API must omit prompts');}}
async function run(){
 await fixture.start();
 assert.equal((await fixture.request('/api/eyehold/crew',{headers:{'X-Eyehold-Token':''}})).status,403);
 const registered=await fixture.json('POST','/api/roster',{agents:roster,updatedAt:Date.now()});assert.equal(registered.body.ok,true);await crew();
 const blueprint=buildEyeholdKeep(),keep=WorldModel.deserialize(blueprint.doc);
 const home=keep.roomById(blueprint.homeId);
 const homeDesk=keep.props().find(p=>p.t==='desk'&&home.rects.some(r=>p.x>=r.x1&&p.x<=r.x2&&p.y>=r.y1&&p.y<=r.y2));
 assert(keep.assignDesk(homeDesk.id,'agent').ok);
 for(let i=0;i<blueprint.placed.length;i++)assert(keep.assignDesk(blueprint.placed[i].deskId,ids[i+1]).ok);
 Workstreams.reset();const sessions=ids.map((agentId,i)=>Workstreams.create(['command','research','strategy','operations','engineering','quality','finance'][i],{agentId,activate:false}));
 const saved=await fixture.json('POST','/api/save',{schema:'eyehold.save',version:6,updatedAt:Date.now(),agent:{id:'agent',name:names[0]},agents:roster.map(a=>({id:a.agentId,name:a.name,specialtyId:a.specialtyId})),keep:keep.serialize(),...Workstreams.serialize()});assert.equal(saved.body.ok,true);
 await fixture.restart();
 // No re-registration: this reads the host's actual restored in-memory roster.
 await crew();
 const recovered=await fixture.json('GET','/api/save?agent=agent');assert.equal(recovered.status,200);
 const doc=recovered.body.save;assert.equal(doc.agents.length,7);
 const restored=WorldModel.deserialize(doc.keep);assert.equal(restored.rooms().filter(r=>r.kind!=='corridor').length,7);
 for(const id of ids)assert.equal(restored.props().filter(p=>p.t==='desk'&&p.agentId===id).length,1,id+' workkeep survived');
 Workstreams.reset();Workstreams.init(doc);
 for(const session of sessions){const restoredSession=Workstreams.get(session.id);assert(restoredSession);assert.equal(restoredSession.agentId,session.agentId);assert.equal(restoredSession.title,session.title);}
 console.log('PASS: real sidecar restores seven-agent roster without re-registration, seven staffed rooms, and seven named sessions after restart; no paid inference');
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>fixture.dispose());
