/* Operator-initiated native station installation. Never replaces a populated
 * station: only offers install when there is exactly one non-corridor room.
 * The game performs actual layout persistence. No model calls or account grants.
 */
'use strict';
(function(){
 if(typeof document==='undefined')return;
 function blueprint(){
  if(typeof WorldModel==='undefined')throw Error('WorldModel is not loaded');
  const m=WorldModel.create(WorldModel.starterDoc());
  const home=m.serialize().meta.spawnRoomId;
  const rename=m.renameRoom(home,'The Eye - Command Keep');
  if(rename&&rename.ok===false)throw Error('home rename rejected');
  const terr=m.setRoomTerritory(home,'keep');if(!terr.ok)throw Error('home territory rejected');
  const hall=m.addRoom({kind:'corridor',name:'Cross-Department Hall',rect:{x1:0,y1:-3,x2:53,y2:-1}});if(!hall.ok)throw Error('hall rejected: '+hall.error);
  const entries=[
   ['Raven Court - Research','lab','archive'],['Star Sages - Strategy','lab','astral'],
   ['Iron Host - Operations','factory','foundry'],['Deepforge - Production','factory','forge'],
   ['Silver Bough - Quality','lab','moonleaf'],['Treasury Watch - Finance','storage','astral']];
  const desks=[];
  entries.forEach(([name,kind,territory],i)=>{
   const x=i*9;
   const room=m.addRoom({kind,name,rect:{x1:x,y1:-12,x2:x+7,y2:-4}});
   if(!room.ok)throw Error('room '+name+' rejected: '+room.error);
   const env=m.setRoomTerritory(room.id,territory);if(!env.ok)throw Error('territory rejected');
   const desk=m.addProp({t:'desk',x:x+2,y:-10,w:2,h:1});
   if(!desk.ok)throw Error('desk rejected: '+desk.error);
   desks.push({roomId:room.id,deskId:desk.id,territory});
  });
   const doc=m.serialize();
   doc.rooms[home].departmentId='command';
   const departmentFor={archive:'opportunities',foundry:'operations',forge:'production',moonleaf:'quality'};
   for(const desk of desks){
    const room=doc.rooms[desk.roomId];
    room.departmentId=desk.territory==='astral'?(String(room.name).startsWith('Treasury')?'finance':'strategy'):departmentFor[desk.territory];
   }
   return {doc,desks};
 }
 function mount(){
  const board=document.getElementById('eyehold-workboard');if(!board||board.querySelector('[data-eye-layout]'))return;
  const section=document.createElement('details');section.dataset.eyeLayout='1';
  const title=document.createElement('summary');title.textContent='INSTALL PHYSICAL SEVEN-ROOM STATION';section.appendChild(title);
  const note=document.createElement('p');note.textContent='Optional, one-time NEW station layout. Existing multi-room stations are protected. Review the backup before confirming; no agents or permissions are created automatically.';
  const button=document.createElement('button');button.type='button';button.textContent='BACK UP & INSTALL NEW LAYOUT';
  const result=document.createElement('p');result.setAttribute('role','status');
  section.append(note,button,result);
  const ref=board.querySelector('details');board.insertBefore(section,ref||board.firstChild);
  function installLayout(){
   try{
    if(typeof App==='undefined'||typeof App.station!=='function')throw Error('Launch the actual game first');
    const current=App.station();if(!current||typeof current.serialize!=='function'||typeof current.replaceLayout!=='function')throw Error('Station builder unavailable');
    const original=current.serialize(),rooms=Object.values(original.rooms||{}).filter(r=>r.kind!=='corridor');
    if(rooms.length!==1)throw Error('Existing multi-room layout preserved. Use the game builder instead.');
    const candidate=blueprint();
    const data=JSON.stringify(original,null,2);
    const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='eyehold-station-backup.json';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),20000);
    const applied=current.replaceLayout(candidate.doc);if(!applied||!applied.ok)throw Error('Layout rejected: '+(applied&&applied.error||'unknown'));
    if(typeof App.persist==='function')App.persist();
    result.textContent='Seven physical rooms installed in this station. A backup was downloaded. Reload to verify persistence, then staff workstations using the existing crew tools.';
   }catch(e){result.textContent='Layout unchanged or installation incomplete: '+e.message}
  }
  if(typeof ArmConfirm!=='undefined'&&ArmConfirm.wire){
   ArmConfirm.wire(button,{armedLabel:'SURE? REPLACE LAYOUT',restLabel:'BACK UP & INSTALL NEW LAYOUT',onConfirm:installLayout});
  }else{
   button.addEventListener('click',()=>{result.textContent='Confirm control unavailable. Layout unchanged.';});
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
