/* Eyehold commercial division-of-labor catalog.
 * Roles/routes are operator-visible planning definitions, not live rooms,
 * identity grants, linked accounts, agent summons, or permission changes.
 */
'use strict';
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 else root.EyeholdDepartments=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const rooms=Object.freeze([
  Object.freeze({id:'command',name:'The Eye — Command Keep',role:'eyehold-keep',mission:'Assign bounded tasks and coordinate verified handoffs across departments.',handoff:'Each proposal gets an owner, evidence, deadline, cost ceiling and acceptance criteria.',authority:'recommend-only'}),
  Object.freeze({id:'opportunities',name:'Raven Court — Researcher',role:'eyehold-archive',mission:'The Researcher. Sole job is research: ranked briefs on real money-making opportunities, plus answers for a venture such as niches, pricing, competitors, and market conditions. No selling, spending, or publishing.',handoff:'Send ranked briefs to the Manager with expected revenue, upfront cost, risk, time to first dollar, and cite sources.',authority:'research-only'}),
  Object.freeze({id:'strategy',name:'Star Sages — Business Strategy',role:'eyehold-astral',mission:'Rank lawful opportunities without moral or industry preference using measured net-profit potential, speed to cash, licensing/compliance costs, execution feasibility and downside risk.',handoff:'Request owner approval of one bounded commercial pilot before assigning production.',authority:'recommend-only'}),
  Object.freeze({id:'operations',name:'Iron Host — Operations',role:'eyehold-foundry',mission:'Prepare required platform accounts, workflows, schedules and compliance checklists; manage only already-authorized resources.',handoff:'Present account-creation, outreach or payment actions for explicit operator approval. Never self-register, purchase, or impersonate the owner.',authority:'approval-required'}),
  Object.freeze({id:'production',name:'Deepforge — Production',role:'eyehold-forge',mission:'Produce software, automation and technical deliverables for authorized pilot projects.',handoff:'Send evidence-linked, reviewable outputs to Silver Bough, then operator acceptance.',authority:'bounded-execution'}),
  Object.freeze({id:'quality',name:'Silver Bough — Quality',role:'eyehold-moonleaf',mission:'Check customer-ready presentation, accuracy and completeness of deliverables.',handoff:'Return corrections with testable evidence; never self-accept financially meaningful output.',authority:'review-only'}),
  Object.freeze({id:'finance',name:'Treasury Watch — Financial Oversight',role:'eyehold-astral',mission:'Track VERIFIED business revenue, refunds, provider spend, fees and cumulative net USD profit. Advance sequential $1M, $10M, $100M room-loot milestones only on verified evidence, never on Crowns or claims.',handoff:'Report missing bank/payment data as unavailable, never zero; no invented income, and no payments or trades.',authority:'read-only'})
 ]);
 function get(id){return rooms.find(r=>r.id===id)||null}
 return Object.freeze({rooms,get});
});
