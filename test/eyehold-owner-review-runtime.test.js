'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {EventEmitter}=require('node:events');
const {createOwnerReviewRuntime}=require('../sidecar/eyehold-owner-review-runtime.js');
const workspaceDir=fs.mkdtempSync(path.join(os.tmpdir(),'eyehold-review-'));
const events=new EventEmitter();
const run={id:'r1',taskId:'r1',agentId:'deepforge',status:'completed'};
const dec={taskId:'r1',deliverableId:'deliver1',runId:'r1',goalId:'business1',goalAdvanced:true,goalEvidenceRef:'proof1',evidenceRefs:['proof1'],verificationMethod:'user',contributors:['deepforge'],quality:5,testPassed:true,predeclaredComplexity:1};
const valid={actorType:'operator',authenticated:true,operatorId:'owner',reviewedRunId:'r1',reviewedGoalId:'business1',reviewedEvidenceRef:'proof1',evidenceVerified:true};
try{
 const runtime=createOwnerReviewRuntime({workspaceDir,events,getRun:id=>id==='r1'?run:null,getHistory:()=>[],getAgentIds:()=>['deepforge'],now:()=>1,authenticateOperator:c=>c.operatorId==='owner',inspectEvidence:(_d,_r,c)=>c.evidenceVerified===true});
 assert.equal(runtime.approve(dec,{...valid,actorType:'agent'}).ok,false,'agent self approval rejected');
 assert.equal(runtime.approve(dec,{...valid,operatorId:'deepforge'}).ok,false,'other identity rejected');
 assert.equal(runtime.approve(dec,{...valid,evidenceVerified:false}).ok,false,'unverified work rejected');
 assert.equal(runtime.readAcceptance('r1','deliver1'),null);
 assert.equal(runtime.approve(dec,valid).accepted,true,'authorized evidence approval accepted');
 assert.equal(runtime.approve(dec,valid).ok,false,'duplicate rejected');
 assert.equal(runtime.readAcceptance('r1','deliver1').accepted,true);
 runtime.close();
 console.log('Owner review -> authoritative accepted record verified, no API self-approval.');
}finally{fs.rmSync(workspaceDir,{recursive:true,force:true})}
