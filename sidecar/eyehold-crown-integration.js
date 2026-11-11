/* Trusted-only Eyehold acceptance integration.
 * Attach to the running sidecar's genuine internal event emitter and store
 * readers. There are no public credit or self-attestation methods here.
 */
'use strict';
const path=require('node:path');
const {createOutcomeAdapter}=require('./eyehold-outcome-adapter.js');
function installCrownIntegration({workspaceDir,events,runs,acceptances,history,agentIds,now}){
 if(typeof workspaceDir!=='string'||!path.isAbsolute(workspaceDir))throw new TypeError('absolute workspace root required');
 if(!events||typeof events.on!=='function'||typeof events.removeListener!=='function')throw new TypeError('trusted internal event emitter required');
 if(!runs||typeof runs.get!=='function'||!acceptances||typeof acceptances.get!=='function')throw new TypeError('trusted run and acceptance stores required');
 if(!history||typeof history.forAgent!=='function'||typeof agentIds!=='function')throw new TypeError('trusted history and roster readers required');
 if(typeof now!=='function')throw new TypeError('injected clock required');
 const ledger=path.join(workspaceDir,'.eyehold','crowns.v1.json');
 const adapter=createOutcomeAdapter({
  file:ledger,
  getRun:id=>runs.get(id),
  getAcceptance:(taskId,deliverableId)=>acceptances.get(taskId,deliverableId),
  getHistory:id=>history.forAgent(id),
  getAgentIds:agentIds,
  now,
 });
 const unsubscribe=adapter.subscribe(events);
 let closed=false;
 return Object.freeze({
  reconcile:record=>adapter.acceptedHint(record),
  totals:()=>adapter.totals(),
  supervisor:()=>adapter.supervisor(),
  close:()=>{if(!closed){closed=true;unsubscribe()}},
 });
}
module.exports=Object.freeze({installCrownIntegration});
