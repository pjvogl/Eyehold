/* Host review API. The normal API token still applies to these routes; an
 * additional, independently provisioned owner key is required to approve.
 * All run/evidence/scoring fields are derived here, never trusted from JSON.
 */
'use strict';
const crypto=require('node:crypto');
const {authenticate}=require('./eyehold-owner-auth.js');
const {createOwnerReviewRuntime}=require('./eyehold-owner-review-runtime.js');
const digest=text=>'sha256:'+crypto.createHash('sha256').update(text).digest('hex');
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
function createOwnerService({workspaceDir,events,getRun,getRawRun,getGoal,getAgentIds,now}){
 const tickets=new WeakSet();let active=null;
 function packet(runId){
  const run=getRun(runId),raw=getRawRun(runId),goal=getGoal();
  if(!run||run.status!=='completed'||!raw||typeof raw.deliveryText!=='string'||raw.deliveryText.trim().length<20)return null;
  if(!goal||!ID.test(String(goal.id||''))||!String(goal.text||'').trim())return null;
  const goalSnapshot={id:goal.id,text:goal.text,milestoneId:goal.milestoneId||null,next:goal.next||null};
  return {runId,agentId:run.agentId,output:raw.deliveryText,outputDigest:digest(raw.deliveryText),goal:goalSnapshot,goalDigest:digest(JSON.stringify(goalSnapshot)),
   accepted:!!runtime.readAcceptance(runId,'delivery:'+runId),verificationMethod:'user',testBonus:false,complexity:1};
 }
 if(typeof now!=='function')throw new TypeError('injected clock required');
 const runtime=createOwnerReviewRuntime({workspaceDir,events,getRun,getAgentIds,now,getHistory:()=>[],
  authenticateOperator:ctx=>tickets.has(ctx),
  inspectEvidence:(d,r,ctx)=>{
   const p=packet(r.id);
   return !!p&&active?.decision===d&&active.context===ctx&&p.outputDigest===d.goalEvidenceRef&&p.goal.id===d.goalId&&active.goalDigest===p.goalDigest;
  }
 });
 const send=(res,code,body)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body))};
 async function handle(req,res){
  if(req.method==='GET'){
   const url=new URL(req.url,'http://127.0.0.1');
   const runId=url.searchParams.get('runId');
   if(!runId)return send(res,200,{totals:runtime.crownTotals(),source:'owner-reviewed-productivity',currency:false});
   const p=packet(runId);
   return send(res,p?200:422,p||{error:'completed-output-and-active-goal-required'});
  }
  if(req.method!=='POST')return send(res,405,{error:'method-not-allowed'});
  const owner=authenticate(workspaceDir,req);
  if(!owner)return send(res,403,{error:'separate-owner-key-required'});
  try{
   let body='';for await(const chunk of req){body+=chunk.toString('utf8');if(Buffer.byteLength(body)>4096)return send(res,413,{error:'too-large'})}
   const input=JSON.parse(body),p=packet(input.runId);
   if(!p||p.accepted)return send(res,422,{error:p?'already-accepted':'completed-output-and-active-goal-required'});
   if(input.outputDigest!==p.outputDigest||input.goalDigest!==p.goalDigest)return send(res,409,{error:'evidence-changed-reload-review'});
   if(input.goalAdvanced!==true||!Number.isInteger(input.quality)||input.quality<1||input.quality>5)return send(res,422,{error:'confirm-goal-progress-and-quality-required'});
   const decision={taskId:p.runId,runId:p.runId,deliverableId:'delivery:'+p.runId,goalId:p.goal.id,goalAdvanced:true,goalEvidenceRef:p.outputDigest,
    evidenceRefs:[p.outputDigest,p.goalDigest],verificationMethod:'user',contributors:[p.agentId],quality:input.quality,testPassed:false,predeclaredComplexity:1,reviewedBy:owner.id,reviewedAt:now(),goalText:p.goal.text,goalDigest:p.goalDigest};
   const context={actorType:'operator',authenticated:true,operatorId:owner.id,reviewedRunId:p.runId,reviewedGoalId:p.goal.id,reviewedEvidenceRef:p.outputDigest};
   tickets.add(context);active={decision,context,goalDigest:p.goalDigest};
   let result;try{result=runtime.approve(decision,context)}finally{active=null;tickets.delete(context)}
   return send(res,result.ok?200:422,{...result,totals:runtime.crownTotals(),verificationMethod:'user',currency:false});
  }catch{return send(res,400,{error:'invalid-review-request'})}
 }
 return {handle,close:runtime.close,packet};
}
module.exports={createOwnerService,digest};
