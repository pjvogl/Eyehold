'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const {bootToken}=require('./_httpToken.js');
const WorldModel=require('../frontend/app/worldmodel.js');
const {buildEyeholdKeep}=require('../scripts/eyehold-seven-room-starter.cjs');
const {applyTrustedMilestone}=require('../frontend/app/eyehold-native-loot.js');
const {createFinanceStore}=require('../sidecar/eyehold-finance-store.js');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'eyehold-finance-http-'));
const port=21000+Math.floor(Math.random()*16000),base='http://127.0.0.1:'+port;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let child;
async function start(){
 const env={...process.env,EYEHOLD_PORT:String(port),EYEHOLD_WORKSPACES:root,EYEHOLD_BUDGET_GLOBAL:'0',EYEHOLD_BUDGET_PER_DAY:'0'};
 for(const name of Object.keys(env))if(/KEY|TOKEN|SECRET/.test(name))delete env[name];
 child=spawn(process.execPath,[path.resolve(__dirname,'../sidecar/index.js')],{env,stdio:'ignore'});
 for(let i=0;i<70;i++){try{if((await fetch(base+'/api/health')).ok)return;}catch{}await sleep(150);}throw Error('Sidecar failed to start');
}
async function stop(){if(!child)return;const c=child;child=null;c.kill('SIGTERM');await Promise.race([new Promise(r=>{if(c.exitCode!==null||c.signalCode!==null)r();else c.once('exit',r)}),sleep(4000)]);if(c.exitCode===null&&c.signalCode===null)c.kill('SIGKILL');}
async function run(){
 await start();
 const endpoint=base+'/api/eyehold/finance';
 assert.equal((await fetch(endpoint,{headers:{Origin:base}})).status,403,'finance requires existing host token');
 let headers={Origin:base,'X-Eyehold-Token':await bootToken(base,base),'Content-Type':'application/json'};
 let report=await(await fetch(endpoint,{headers})).json();assert.equal(report.netProfitUSD,null);
 const store=createFinanceStore({file:path.join(root,'eyehold-finance.json')});
 store.replaceReviewed([JSON.stringify({id:'receipt-1',currency:'USD',type:'revenue',cents:100000000})],{confirmedReviewed:true});
 report=await(await fetch(endpoint,{headers})).json();assert.deepEqual(report.unlockedMilestonesUSD,[1000000]);
 assert(!JSON.stringify(report).includes('receipt-1'),'HTTP omits individual receipts');
 assert.notEqual((await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({verified:true,netProfitUSD:100000000})})).status,200,'client cannot import finances');
 const keep=WorldModel.deserialize(buildEyeholdKeep().doc);
 assert(applyTrustedMilestone({keep,tier:1000000,attekeep:report,verifyAttekeep:(proof,t)=>proof===report&&proof.unlockedMilestonesUSD.includes(t),persist:()=>{}}).complete);
 const saved=await(await fetch(base+'/api/save',{method:'POST',headers,body:JSON.stringify({schema:'eyehold.save',version:6,updatedAt:Date.now(),agent:{id:'agent',name:'THE EYE'},keep:keep.serialize()})})).json();assert.equal(saved.ok,true);
 await stop();await start();headers={Origin:base,'X-Eyehold-Token':await bootToken(base,base)};
 report=await(await fetch(endpoint,{headers})).json();assert.deepEqual(report.unlockedMilestonesUSD,[1000000],'host restart retains financial unlock');
 const recovered=await(await fetch(base+'/api/save?agent=agent',{headers})).json();
 const restored=WorldModel.deserialize(recovered.save.keep);assert.equal(restored.props().filter(p=>String(p.label||'').startsWith('Eyehold:')).length,7,'seven native trophies survive durable HTTP save and process restart');
 console.log('PASS: real sidecar finance authentication, missing data, host import, no client write, and restart durability; no provider calls');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await stop();fs.rmSync(root,{recursive:true,force:true,maxRetries:5,retryDelay:200});});
