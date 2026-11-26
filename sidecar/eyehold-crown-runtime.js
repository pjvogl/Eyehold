/* Compose the trusted acceptance store and Crown adapter for one running
 * sidecar owner. This is the only wiring surface needed once the host provides
 * its real run reader, evidence verifier, event emitter and roster/history.
 * Never call from an agent tool or public request handler.
 */
'use strict';
const path=require('node:path');
const {openAcceptanceStore}=require('./eyehold-acceptance-store.js');
const {installCrownIntegration}=require('./eyehold-crown-integration.js');
function createCrownRuntime({workspaceDir,events,getRun,verifyEvidence,getHistory,getAgentIds,now}){
 if(typeof workspaceDir!=='string'||!path.isAbsolute(workspaceDir))throw new TypeError('absolute workspace required');
 if(typeof getRun!=='function'||typeof verifyEvidence!=='function'||typeof getHistory!=='function'||typeof getAgentIds!=='function')throw new TypeError('trusted host readers required');
 if(!events||typeof events.on!=='function'||typeof events.emit!=='function')throw new TypeError('trusted host emitter required');
 if(typeof now!=='function')throw new TypeError('injected clock required');
 const acceptance=openAcceptanceStore({
  file:path.join(workspaceDir,'.eyehold','acceptances.v1.json'),
  getRun,verifyEvidence,events
 });
 const crowns=installCrownIntegration({
  workspaceDir,events,runs:{get:getRun},acceptances:{get:acceptance.get},
  history:{forAgent:getHistory},agentIds:getAgentIds,now
 });
 // Acceptance is durable before the award. Recover an interrupted event fold
 // on restart; the ledger's receipt key prevents duplicate Crown allocations.
 for(const record of acceptance.list())crowns.reconcile(record);
 let closed=false;
 return Object.freeze({
  // Host-side human/reviewer approval only; no direct agent/API permission.
  acceptVerifiedDeliverable:decision=>{
   const result=acceptance.accept(decision);
   if(result.ok)crowns.reconcile(decision);
   return result;
  },
  readAcceptance:(taskId,deliverableId)=>acceptance.get(taskId,deliverableId),
  crownTotals:()=>crowns.totals(),
  supervisor:()=>crowns.supervisor(),
  close:()=>{if(!closed){closed=true;crowns.close();}}
 });
}
module.exports=Object.freeze({createCrownRuntime});
