/* Opt-in seven-department starter layout. Uses canonical WorldModel validations.
 * NEVER overwrites an existing save, grants tools, or runs a model.
 */
'use strict';
const WorldModel=require('../frontend/app/worldmodel.js');
const departments=require('../frontend/app/eyehold-departments.js');
function buildEyeholdStation(){
 const station=WorldModel.create(WorldModel.starterDoc());
 const doc=station.serialize();
 const homeId=doc.meta.spawnRoomId;
 const nameHome=station.renameRoom(homeId,'The Eye - Command Keep');
 if(nameHome && nameHome.ok===false)throw Error('home rename: '+nameHome.error);
 const t=station.setRoomTerritory(homeId,'keep');
 if(!t.ok)throw Error('home territory: '+t.error);
 // One unobstructed shared corridor directly north of the original home.
 const corridor=station.addRoom({kind:'corridor',name:'Cross-Department Hall',rect:{x1:0,y1:-3,x2:53,y2:-1}});
 if(!corridor.ok)throw Error('hall placement: '+corridor.error);
 const units=[
  ['Raven Court - Opportunity Research','lab','archive'],
  ['Star Sages - Business Strategy','lab','astral'],
  ['Iron Host - Operations','factory','foundry'],
  ['Deepforge - Production','factory','forge'],
  ['Silver Bough - Quality','lab','moonleaf'],
  ['Treasury Watch - Finance','storage','astral']
 ];
 const placed=[];
 units.forEach(([name,kind,territory],i)=>{
  const x=i*9;
  const result=station.addRoom({kind,name,rect:{x1:x,y1:-12,x2:x+7,y2:-4}});
  if(!result.ok)throw Error('room '+name+': '+result.error);
  const label=station.setRoomTerritory(result.id,territory);
  if(!label.ok)throw Error('room territory '+name+': '+label.error);
  const workstation=station.addProp({t:'desk',x:x+2,y:-10,w:2,h:1});
  if(!workstation.ok)throw Error('workstation '+name+': '+workstation.error);
  placed.push({name,id:result.id,territory,deskId:workstation.id});
 });
 const docLive=station.serialize();
 docLive.rooms[homeId].departmentId='command';
 const departmentFor={
  archive:'opportunities', foundry:'operations', forge:'production', moonleaf:'quality'
 };
 for(const room of placed){
  let departmentId=departmentFor[room.territory];
  if(room.territory==='astral') departmentId=room.name.startsWith('Treasury')?'finance':'strategy';
  if(!departments.get(departmentId)) throw Error('starter room is not a catalog department: '+room.name);
  docLive.rooms[room.id].departmentId=departmentId;
 }
 return {doc:docLive,placed,homeId,corridorId:corridor.id};
}
module.exports={buildEyeholdStation};
