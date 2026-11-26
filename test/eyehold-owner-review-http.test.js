'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Readable}=require('node:stream');
const {EventEmitter}=require('node:events');
const {createOwnerReviewHandler}=require('../sidecar/eyehold-owner-review-http.js');
const workspaceDir=fs.mkdtempSync(path.join(os.tmpdir(),'eye-owner-http-'));
const run={id:'r1',taskId:'r1',agentId:'deepforge',status:'completed'};
const decision={taskId:'r1',deliverableId:'d1',runId:'r1',goalId:'g1',goalAdvanced:true,goalEvidenceRef:'p1',evidenceRefs:['p1'],verificationMethod:'user',contributors:['deepforge'],quality:5,testPassed:true,predeclaredComplexity:1};
const handler=createOwnerReviewHandler({workspaceDir,events:new EventEmitter(),getRun:id=>id==='r1'?run:null,getHistory:()=>[],getAgentIds:()=>['deepforge'],now:()=>1,authorizeRequest:async req=>req.headers['x-test-owner']==='yes'?{authorized:true,id:'owner'}:null,inspectEvidence:(_d,_r,ctx)=>ctx.operatorId==='owner'&&ctx.reviewedEvidenceRef==='p1'});
async function request(data,owner){const req=Readable.from([JSON.stringify(data)]);req.method='POST';req.headers={'x-test-owner':owner?'yes':'no'};let code=0,out='';const res={writeHead:c=>{code=c},end:s=>{out=s}};await handler.handle(req,res);return {code,body:JSON.parse(out)}}
(async()=>{try{
 assert.equal((await request({decision,actorType:'operator',authenticated:true},false)).code,403,'body cannot grant auth');
 assert.equal(handler.readAcceptance('r1','d1'),null);
 assert.equal((await request({decision},true)).code,200,'host-authenticated owner succeeds');
 assert.equal((await request({decision},true)).code,422,'duplicate rejected');
 assert.equal(handler.readAcceptance('r1','d1').accepted,true);
 console.log('Owner-only HTTP review boundary passed');
}finally{handler.close();fs.rmSync(workspaceDir,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});
