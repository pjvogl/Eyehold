/* Eyehold: six original faction worker sprites (16x18 pixel grids).
 * Purely cosmetic; the real agent's position and activity continue to drive the world.
 */
'use strict';
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EyeholdFactions=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const sprites={
  foundry:{palette:{A:'#48543a',B:'#89946a',C:'#282b30',D:'#8a4f32',E:'#cd8c51'},rows:[
'.....CCCC......','....CDDDCC.....','...CCDDDCCC....','...CAAAACCC....','..CCABBAACCC...','..CAAEEAACCC...','...CCAAACCC....','..DDCCCCCDDD...','..DDCCCCCDDD...','..CCCCCCCCCC...','..CCDDCCDDCC...','...DDDCCDDD....','...CCCCCCCC....','...CCC..CCC....','..CCCC..CCCC...','..CCC....CCC...','..CCC....CCC...','................']},
  moonleaf:{palette:{A:'#d1c5ab',B:'#b2d9bb',C:'#477564',D:'#e5e2ce',E:'#7d8fba'},rows:[
'.....CCCCC......','....CCCCC......','...CCAAAAAC....','..CCCCAAAACC...','..CCADDAADCC...','..CCAAAAACCC...','...CCCCCACC....','...BBBBBBBB....','..BBBBEBBBBB...','..BBBBBBBBBB...','...BBBBBBBB....','...BBCBBCBB....','...CCCBBCCC....','...CCC..CCC....','...CCC..CCC....','...CCC..CCC....','..DDDD..DDDD...','................']},
  forge:{palette:{A:'#c38b61',B:'#704e3b',C:'#363842',D:'#a98c57',E:'#f2c56d'},rows:[
'....CCCCCCC.....','...CCDDDDCC.....','...CAAAAACC.....','..CCAEEAACCC....','..CAAABBBAAC....','..CAAABBBAAC....','...CBBBBBBC.....','..CCCCCCCCCC....','..CDDDCCCCDD....','..CDDDCCCCDD....','..CCCCCCCCCC....','...CCDDDDCC.....','...CCCCCCCC.....','..CCCC..CCCC....','..CCCC..CCCC....','..CCCC..CCCC....','...DDD..DDD.....','................']},
  archive:{palette:{A:'#d3bda4',B:'#313649',C:'#5a6382',D:'#8c87a4',E:'#d4c6a1'},rows:[
'.....BBBBB......','....BBBBBBB.....','...BBBBBBBBB....','...BBAAAABBB....','...BAEEAABBB....','....BAAAABB.....','....BBBBBB......','...BBCCCCBB.....','..BBBCCCCBBB....','..BBCCCCCCBB....','...BCCCCCCB.....','...BCCDDCCB.....','..BBCCCCCCBB....','..BBBC..CBBB....','..BBBC..CBBB....','..BBBC..CBBB....','..DDD....DDD....','................']},
  roost:{palette:{A:'#b78a69',B:'#6b4d42',C:'#b9a078',D:'#393642',E:'#e8ca97'},rows:[
'.....BBBBB......','....BBCCCBB.....','....BAAAABB.....','...BBAEEAABB....','...BBAAAABB.....','....BBBBBB......','...BCCCCCCB.....','..BBCCCCCCBB....','..BBCCDDCCBB....','..BBCCDDCCBB....','...BCCCCCCB.....','...BCCCCCCB.....','...BBBBBBBB.....','...BBB..BBB.....','..BBBB..BBBB....','..BBBB..BBBB....','...CCC..CCC.....','................']},
  astral:{palette:{A:'#c8b9ae',B:'#373a66',C:'#746bac',D:'#d1b6eb',E:'#f2cc89'},rows:[
'......BBBB......','.....BBBBBB.....','....BBCCCCBB....','....BAAAAABB....','....BAEEAABB....','.....BAAABB.....','.....BBBBBB.....','....BCCCCCBB....','...BBCCDDCCBB...','..BBCCCDCCCBB...','...BBCCCCCCB....','....BCCCCCBB....','....BBCCCCBB....','....BBCCBB......','....BB..BB......','...BBB..BBB.....','...DD....DD.....','................']},
  wanderer:{palette:{A:'#1c1a22',B:'#6e5340',C:'#cbb89a',D:'#8d3b32',E:'#e6c27a'},rows:[
'......AAAA......','.....AAAAAA.....','....AACCCAA.....','....AACCCAA.....','...AAACCCAAA....','...AAAAAAAAA....','..AAAAAAAAAAA...','..AABBBBBBAA....','..AABBDDBBAA....','..AAAAAAAAAAA...','...AAABBBBAA....','...AAABBBBAA....','....AAABAAA.....','....AAA.AAA.....','...AAAA.AAAA....','..BBAA...AABB...','..BB.......BB...','................']}
};
// Normalize authored grids so deliberate empty margins cannot truncate a silhouette.
for(const rec of Object.values(sprites))rec.rows=rec.rows.map(row=>row.padEnd(16,'.'));
const validate=rec=>!!rec&&rec.rows.length===18&&rec.rows.every(row=>row.length===16&&[...row].every(c=>c==='.'||Object.prototype.hasOwnProperty.call(rec.palette,c)));
function pose(body, now) {
 const walking = !!(body && (body.walking || (Array.isArray(body.path) && body.path.length>0)));
 // Only an explicitly projected backend run may activate the work pose.
 const working = !walking && !!(body && body.eyeBackendRunning === true);
 return {walking,working,phase:Math.floor(Math.max(0,Number(now)||0)/160)%4};
}
function draw(ctx,body,now,environment){
 const rec=Object.prototype.hasOwnProperty.call(sprites,environment)?sprites[environment]:null;
 if(!ctx||!body||!rec||!Number.isFinite(body.px)||!Number.isFinite(body.py))return null;
 const p=pose(body,now);
 const x=Math.round(body.px)-8,y=Math.round(body.py)-17;
 const bob=p.walking&&p.phase%2===1?-1:0;
 ctx.save();ctx.imageSmoothingEnabled=false;
 for(let iy=0;iy<18;iy++)for(let ix=0;ix<16;ix++){
   const c=rec.rows[iy][ix];if(c==='.')continue;
   let xx=ix,yy=iy+bob;
   // Alternating legs only while the agent actually travels.
   if(p.walking&&iy>=13){if(ix<=7)yy+=p.phase%2;else yy+=(p.phase+1)%2;}
   // Subtle raised hand while seated/working, without covering status overlays.
   if(p.working&&iy>=7&&iy<=10&&ix<=3)xx+=p.phase%2;
   ctx.fillStyle=rec.palette[c];ctx.fillRect(x+xx,y+yy,1,1);
 }
 // Readable faction-specific tools appear only for agents with a work posture.
 if(p.working){
   const tip=p.phase%2;
   ctx.fillStyle=rec.palette.E||'#e5bf7e';
   if(environment==='forge'){ctx.fillRect(x+13,y+9-tip,2,7);ctx.fillRect(x+11,y+9-tip,5,2);}
   else if(environment==='archive'||environment==='moonleaf'){ctx.fillRect(x+12,y+10,4,5);ctx.fillRect(x+13,y+11,2,3);}
   else if(environment==='foundry'){ctx.fillRect(x+13,y+9-tip,2,6);ctx.fillRect(x+11,y+9-tip,5,2);}
   else if(environment==='roost'){ctx.fillRect(x+11,y+11,5,3);ctx.fillRect(x+12,y+10,3,1);}
   else if(environment==='astral'){ctx.fillRect(x+13,y+8-tip,2,7);ctx.fillRect(x+12,y+7-tip,4,2);}
 }
 ctx.restore();return {top:y+bob};
}

return Object.freeze({sprites,validate,pose,draw});
});