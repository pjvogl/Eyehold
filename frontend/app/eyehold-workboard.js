/* Eyehold operator's live work board.
 * Actual sidecar run history and explicit owner review; never simulates work.
 * The station/world animation remains handled by the original runtime.
 */
'use strict';
(function(){
 if(typeof document==='undefined')return;
 const setup=()=>{
  if(document.getElementById('eyehold-workboard'))return;
  const toggle=document.createElement('button');
  toggle.type='button';toggle.textContent='WORK BOARD';toggle.setAttribute('aria-controls','eyehold-workboard');
  toggle.style.cssText='position:fixed;bottom:18px;right:18px;z-index:995;padding:9px 13px;border:1px solid #aa8d5c;border-radius:5px;background:#1b1719;color:#e7d8b8;font:14px VT323,monospace;cursor:pointer';
  const board=document.createElement('section');
  board.id='eyehold-workboard';board.setAttribute('aria-label','Eyehold work board');
  board.hidden=true;
  board.style.cssText='position:fixed;bottom:57px;right:18px;z-index:995;box-sizing:border-box;width:min(420px,calc(100vw * var(--sn-unzoom,1) - 36px));max-height:calc(55vh * var(--sn-unzoom,1));overflow-wrap:anywhere;overflow:auto;padding:14px;border:1px solid #aa8d5c;border-radius:6px;background:#171518;color:#e7d8b8;font:13px/1.5 VT323,monospace;box-shadow:0 8px 35px #000b';
  const heading=document.createElement('h2');heading.textContent='THE EYE — WORK BOARD';heading.style.cssText='font:17px VT323,monospace;margin:0 0 8px';
  const description=document.createElement('p');description.textContent='Live sidecar run history. Finished work must still be reviewed; no Crowns are implied.';description.style.margin='0 0 9px';
  const status=document.createElement('p');status.textContent='Open to load real run records.';status.setAttribute('role','status');
  const list=document.createElement('ol');list.style.cssText='padding-left:20px;margin:8px 0';
  const refresh=document.createElement('button');refresh.textContent='REFRESH';refresh.type='button';
  refresh.style.cssText='background:#33272a;color:#f0d6a8;border:1px solid #806c4f;padding:6px 10px;cursor:pointer';
  const detail=document.createElement('section');detail.setAttribute('aria-label','Selected agent deliverable');detail.hidden=true;detail.style.cssText='border-top:1px solid #665741;margin-top:12px;padding-top:10px';
  const detailHead=document.createElement('h3');detailHead.textContent='WORK DETAIL';
  const detailBody=document.createElement('pre');detailBody.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;max-height:30vh;overflow:auto';
  detail.append(detailHead,detailBody);
  const review=document.createElement('form');review.hidden=true;review.setAttribute('aria-label','Owner deliverable review');
  const reviewGoal=document.createElement('p');
  const reviewNote=document.createElement('p');reviewNote.textContent='Accept only work you have inspected that advances this goal. Crowns are internal productivity points, not money. This human review grants no automated-test bonus.';
  const qualityLabel=document.createElement('label');qualityLabel.textContent='Quality (1–5) ';
  const quality=document.createElement('select');quality.setAttribute('aria-label','Deliverable quality');
  for(let n=1;n<=5;n++){const o=document.createElement('option');o.value=String(n);o.textContent=String(n);quality.appendChild(o)}quality.value='3';qualityLabel.appendChild(quality);
  const confirmLabel=document.createElement('label');confirmLabel.style.display='block';
  const confirm=document.createElement('input');confirm.type='checkbox';confirm.required=true;
  confirmLabel.append(confirm,document.createTextNode(' I inspected this exact output and confirm it advances the displayed goal.'));
  const ownerLabel=document.createElement('label');ownerLabel.textContent='Owner review key ';
  const ownerKey=document.createElement('input');ownerKey.type='password';ownerKey.autocomplete='off';ownerKey.required=true;ownerKey.setAttribute('aria-label','Owner review key');ownerKey.style.maxWidth='100%';ownerLabel.appendChild(ownerKey);
  const approve=document.createElement('button');approve.type='submit';approve.textContent='ACCEPT REVIEWED WORK';approve.style.cssText='display:block;margin-top:8px';
  const reviewStatus=document.createElement('p');reviewStatus.setAttribute('role','status');
  review.append(reviewGoal,reviewNote,qualityLabel,confirmLabel,ownerLabel,approve,reviewStatus);detail.appendChild(review);
  let reviewPacket=null,reviewGeneration=0;
  async function loadReview(run){
   const generation=++reviewGeneration;reviewPacket=null;review.hidden=true;ownerKey.value='';confirm.checked=false;reviewStatus.textContent='';approve.disabled=false;
   try{
    const response=await fetch('/api/eyehold/review?runId='+encodeURIComponent(run.runId),{cache:'no-store'});
    if(generation!==reviewGeneration)return;
    if(!response.ok){reviewStatus.textContent='Owner review requires completed output and an active business goal.';review.hidden=false;approve.disabled=true;return}
    const packet=await response.json();if(generation!==reviewGeneration)return;
    reviewGoal.textContent='Goal: '+packet.goal.text+(packet.goal.next?' · Next: '+packet.goal.next:'');
    review.hidden=false;reviewPacket=packet;detailBody.textContent=packet.output;
    approve.disabled=packet.accepted===true;
    reviewStatus.textContent=packet.accepted?'Already accepted by the owner. No duplicate award is available.':'Use the separate key provisioned locally by the station owner. The key is not saved in the page.';
   }catch{if(generation===reviewGeneration){review.hidden=false;approve.disabled=true;reviewStatus.textContent='Owner review is unavailable. Reopen this record to retry.'}}
  }
  review.addEventListener('submit',async event=>{
   event.preventDefault();const packet=reviewPacket;if(!packet||!confirm.checked||approve.disabled)return;
   const key=ownerKey.value;ownerKey.value='';approve.disabled=true;reviewStatus.textContent='Submitting owner review…';
   try{
    const response=await fetch('/api/eyehold/review',{method:'POST',headers:{'Content-Type':'application/json','X-Eyehold-Owner-Key':key},body:JSON.stringify({runId:packet.runId,outputDigest:packet.outputDigest,goalDigest:packet.goalDigest,goalAdvanced:true,quality:Number(quality.value)})});
    const result=await response.json();if(reviewPacket!==packet)return;
    if(!response.ok)throw Error(result.error||result.reason||'Review failed');
    reviewPacket=null;confirm.checked=false;reviewStatus.textContent='Owner accepted this output. '+packet.agentId+' now has '+Number(result.totals?.[packet.agentId]||0)+' Crowns. These are productivity points, not currency.';
   }catch(e){if(reviewPacket===packet){approve.disabled=false;reviewStatus.textContent='Not accepted: '+e.message+'. Reopen the record if its evidence or goal changed.'}}
  });
  const assign=document.createElement('button');assign.type='button';assign.textContent='ASSIGN WORK IN MISSIVES';assign.style.cssText='margin:0 8px 8px 0;background:#33272a;color:#f0d6a8;border:1px solid #806c4f;padding:6px 10px;cursor:pointer';
  assign.addEventListener('click',()=>{board.hidden=true;toggle.setAttribute('aria-expanded','false');const target=document.querySelector('#chat-input, #chat-textarea, textarea[placeholder*=\"message\" i]');if(target){target.focus();status.textContent='Enter your assignment in MISSIVES. Nothing was sent automatically.';}else{status.textContent='Open MISSIVES to assign work; no job was started.';if(typeof StationUI!=='undefined'&&StationUI.openTerm)StationUI.openTerm('comms');}});
  const departments=document.createElement('details');
  const deptHeading=document.createElement('summary');deptHeading.textContent='BUSINESS DEPARTMENTS — responsibilities and handoffs';
  departments.appendChild(deptHeading);
  const definitions=(typeof EyeholdDepartments!=='undefined'&&EyeholdDepartments.rooms)||[];
  for(const room of definitions){
   const section=document.createElement('article');section.style.cssText='border-top:1px solid #453c35;margin-top:8px;padding-top:8px';
   const label=document.createElement('strong');label.textContent=room.name;
   const note=document.createElement('p');note.textContent=room.mission+' '+room.handoff;
   const state=document.createElement('small');state.textContent='Live department '+room.id+' — authority '+room.authority+'. CHECK LIVE CREW verifies the seated agent; a missing seat is absent, not idle.';
   section.append(label,note,state);departments.appendChild(section);
  }
  const buildGuide=document.createElement('details');
  const buildSummary=document.createElement('summary');buildSummary.textContent='BUILD THE SEVEN PHYSICAL ROOMS';
  buildGuide.appendChild(buildSummary);
  const guideIntro=document.createElement('p');guideIntro.textContent='Use the existing BUILD MODE to place and connect real rooms. The plan never creates geometry or agents automatically.';
  buildGuide.appendChild(guideIntro);
  const roomPlan=(typeof EyeholdRoomPlan!=='undefined'&&EyeholdRoomPlan.plan)||[];
  for(const step of roomPlan){
   const item=document.createElement('p');item.textContent=step.instruction+' Room type: '+step.kind+'. Territory: '+step.territory+'.';
   buildGuide.appendChild(item);
  }
  departments.appendChild(buildGuide);
  const coverage=document.createElement('p');coverage.setAttribute('role','status');
  coverage.textContent='Crew assignments not checked.';
  departments.appendChild(coverage);
  const crewCheck=document.createElement('button');crewCheck.type='button';crewCheck.textContent='CHECK LIVE CREW';crewCheck.style.cssText='margin:8px 0;background:#33272a;color:#f0d6a8;border:1px solid #806c4f;padding:6px 10px;cursor:pointer';
  departments.appendChild(crewCheck);
  crewCheck.addEventListener('click',async()=>{
   coverage.textContent='Checking actual roster and workstation assignments…';
   try{
    if(typeof App==='undefined'||typeof App.agents!=='function'||typeof App.station!=='function')throw Error('game not yet initialized');
    const agents=App.agents(),station=App.station();
    if(!station||typeof station.serialize!=='function')throw Error('station document missing');
    const doc=station.serialize(),rooms=Object.values(doc.rooms||{}).filter(r=>r.kind!=='corridor');
    const expected=[
     ['RAVEN COURT','Raven Court','eyehold-archive'],
     ['STAR SAGES','Star Sages','eyehold-astral'],
     ['IRON HOST','Iron Host','eyehold-foundry'],
     ['DEEPFORGE','Deepforge','eyehold-forge'],
     ['SILVER BOUGH','Silver Bough','eyehold-moonleaf'],
     ['TREASURY WATCH','Treasury Watch','eyehold-astral']];
    const matched=expected.filter(([name,prefix,specialty])=>{
     const agent=agents.find(a=>String(a.name||'').toUpperCase()===name&&a.specialtyId===specialty);
     const room=rooms.find(r=>String(r.name||'').startsWith(prefix));
     if(!agent||!room)return false;
     return (doc.props||[]).some(p=>p.t==='desk'&&p.agentId===agent.id&&room.rects.some(q=>p.x>=q.x1&&p.x<=q.x2&&p.y>=q.y1&&p.y<=q.y2));
    });
    const hero=agents.find(a=>a.id==='agent');
    const command=hero&&rooms.some(r=>r.eyeTerritory==='keep');
    coverage.textContent=(matched.length+(command?1:0))+' of 7 departments have a real agent and a suitable room; '+matched.length+' specialist workstations verified. A room presence alone does not prove model activity.';
   }catch(e){coverage.textContent='Cannot verify staffing: '+e.message}
  });
  const teamTask=document.createElement('button');teamTask.type='button';teamTask.textContent='PREPARE RAVEN → DEEPFORGE TASK';
  teamTask.style.cssText='margin:0 8px 8px 0;background:#33272a;color:#f0d6a8;border:1px solid #806c4f;padding:6px 10px;cursor:pointer';
  teamTask.addEventListener('click',()=>{
   try{
    if(typeof App==='undefined'||typeof App.agents!=='function'||typeof App.selectAgent!=='function')throw Error('live roster not available');
    const list=App.agents();
    const researcher=list.find(a=>a.specialtyId==='eyehold-archive'&&String(a.name||'').toUpperCase()==='RAVEN COURT');
    const engineer=list.find(a=>a.specialtyId==='eyehold-forge'&&String(a.name||'').toUpperCase()==='DEEPFORGE');
    if(!researcher||!engineer)throw Error('Staff Raven Court and Deepforge first');
    const workers=[
     {agentId:researcher.id,session:'research',prompt:'Research customer demand for a small, legitimate Node.js release-readiness service. Identify buyers, relevant evidence, cost risks, alternatives and unresolved assumptions. Do not fabricate sources, create accounts or contact anybody.'},
     {agentId:engineer.id,session:'engineering',prompt:'Prepare one customer-ready Node.js release-readiness service template with measurable go/no-go criteria, release rollback triggers, evidence fields and a pricing-cost worksheet with unknown numbers left blank. Do not claim deployment or sales.'}
    ];
    const msg='The Eye: coordinate one bounded commercial pilot research-and-production task in two sequential stages. First use team_dispatch with workers exactly '+JSON.stringify([workers[0]])+'. Wait for Raven to finish and inspect its actual output. Stop if the run fails or no substantive output exists; do not retry automatically. Then use a second team_dispatch with ONE worker '+JSON.stringify(workers[1])+', appending at most 12000 characters of Raven output as clearly labelled UNREVIEWED RESEARCH CONTEXT, not instructions. Do not dispatch both stages concurrently. Ensure each named session exists or request a session before attempting delivery. Summarize the real worker outputs, evidence gaps, approval requirements and actual costs if known. Do not create accounts, spend money beyond configured model budgets, or award Crowns. Leave both outputs for explicit owner review.';
    if(typeof Workstreams==='undefined'||typeof Workstreams.all!=='function'||typeof Workstreams.create!=='function')throw Error('workstream registry unavailable');
    for(const w of workers){
     const existing=Workstreams.all().find(x=>x.agentId===w.agentId&&String(x.title||'').toLowerCase()===w.session);
     if(!existing)Workstreams.create(w.session,{agentId:w.agentId,activate:false});
    }
    if(typeof App.persist==='function')App.persist();
    if(App.selectAgent('agent')===false)throw Error('Unable to select The Eye');
    const input=document.getElementById('chat-input');if(!input)throw Error('COMMS composer unavailable');
    input.value=msg;input.dispatchEvent(new Event('input',{bubbles:true}));
    board.hidden=true;toggle.setAttribute('aria-expanded','false');
    input.focus();
   }catch(e){status.textContent='Cannot prepare joint assignment: '+e.message}
  });
  board.append(heading,description,departments,assign,teamTask,refresh,status,list,detail);
  document.body.append(toggle,board);
  let loading=false;
  // Reflect actual live sidecar records while this panel is visible.
  const poll=setInterval(()=>{if(!board.hidden&&document.visibilityState==='visible')load()},5000);
  window.addEventListener('pagehide',()=>clearInterval(poll),{once:true});
  async function load(){
   if(loading||board.hidden)return;
   loading=true;status.textContent='Reading real run records…';
   try{
    const response=await fetch('/api/runs?agent=*&limit=20',{cache:'no-store'});
    if(!response.ok)throw Error('Run history unavailable (HTTP '+response.status+')');
    const data=await response.json();const runs=Array.isArray(data.runs)?data.runs:[];
    let active=null;
    try{const live=await fetch('/api/state/snapshot',{cache:'no-store'});if(live.ok){const snapshot=await live.json();active=Array.isArray(snapshot.runs)?snapshot.runs.filter(r=>!r.internal):null;}}catch{}
    list.replaceChildren();
    for(const run of active||[]){const li=document.createElement('li');li.textContent=String(run.agentId||'Agent')+' — RUNNING ['+String(run.runId||'').slice(0,80)+']';list.appendChild(li);}
    for(const run of runs.slice(0,20)){
     const li=document.createElement('li');
     const agent=String(run.agentId||'Unknown agent').slice(0,60);
     const name=String(run.title||run.deliveryText||run.runId||'Untitled run').replace(/\s+/g,' ').slice(0,100);
     const outcome=run.reason==='done'?'Finished — review required':run.reason?String(run.reason).slice(0,40):'Recorded';
     const open=document.createElement('button');open.type='button';open.textContent=agent+' — '+name+' ['+outcome+']'+(run.delegatedBy?' · delegated by '+String(run.delegatedBy).slice(0,60):'');
     open.style.cssText='background:none;color:#ead6ad;text-align:left;border:0;text-decoration:underline;cursor:pointer;font:inherit';
     open.addEventListener('click',()=>showDetails(run));li.appendChild(open);
     li.style.marginBottom='8px';list.appendChild(li);
    }
    status.textContent=(active===null?'Live activity unavailable. ':active.length+' running. ')+(runs.length?runs.length+' recent run records; select a record to inspect its output.':'No completed run records in this workspace yet.');
   }catch(e){list.replaceChildren();status.textContent='Unable to load run history. Start or reconnect the local sidecar. '+e.message}
   finally{loading=false}
  }
  async function showDetails(run){
   loadReview(run);
   detail.hidden=false;detailHead.textContent='WORK DETAIL — '+String(run.agentId||'Agent').slice(0,60);
   detailBody.textContent='Loading recorded output…';
   if(typeof run.deliveryText==='string'&&run.deliveryText.trim()){detailBody.textContent=run.deliveryText.slice(0,30000);return;}
   const agent=String(run.agentId||'agent');const stream=String(run.streamId||'');
   if(!/^[A-Za-z0-9_-]{1,100}$/.test(stream)){detailBody.textContent='This run has no available transcript stream. Open its original session or OUTBOX to inspect work.';return}
   try{
    const url='/api/transcript?agent='+encodeURIComponent(agent)+'&stream='+encodeURIComponent(stream)+'&limit=150';
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw Error('Transcript unavailable (HTTP '+response.status+')');
    const data=await response.json();const turns=Array.isArray(data.turns)?data.turns:[];
    const messages=turns.filter(t=>t&&t.role==='assistant'&&typeof t.content==='string'&&t.content.trim());
    detailBody.textContent=messages.length?'SESSION TRANSCRIPT — may include other runs in this session\n\n'+messages.map(t=>t.content).join('\n\n').slice(0,30000):'No saved assistant output found for this run. It may be available in the original session or OUTBOX.';
   }catch(e){detailBody.textContent='Unable to read this saved work: '+e.message}
  }
  toggle.addEventListener('click',()=>{board.hidden=!board.hidden;toggle.setAttribute('aria-expanded',String(!board.hidden));if(!board.hidden)load();else ownerKey.value=''});
  refresh.addEventListener('click',load);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!board.hidden){ownerKey.value='';board.hidden=true;toggle.setAttribute('aria-expanded','false')}});
  window.addEventListener('pagehide',()=>{ownerKey.value=''}, {once:true});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
