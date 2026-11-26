/* Strict adapter between the existing Eyehold run-store shape and Eyehold's
 * trusted acceptance contract. runStore entries contain runId/reason, not
 * id/status/taskId. The task identity is the immutable runId for MVP receipts.
 * NEVER infer verified business impact from "reason: done".
 */
'use strict';
function makeEyeholdRunReader(runStore){
 if(!runStore||typeof runStore.all!=='function')throw new TypeError('trusted runStore required');
 return function getRun(runId){
  if(typeof runId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(runId))return null;
  const records=runStore.all();
  const row=Array.isArray(records)?records.find(r=>r&&r.runId===runId):null;
  if(!row||typeof row.agentId!=='string')return null;
  // Existing runstore has terminal reasons; ONLY done maps to completed.
  return {id:row.runId,taskId:row.runId,agentId:row.agentId,status:row.reason==='done'?'completed':'failed'};
 };
}
module.exports=Object.freeze({makeEyeholdRunReader});
