/* Eyehold milestone room-loot catalog.
 * A visual specification only. Never reads owner-entered or agent-claimed
 * earnings as proof, never alters finances, permissions, or keep props.
 */
'use strict';
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 else root.EyeholdRoomLoot=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const tiers=Object.freeze([
  Object.freeze({atUSD:1000000,name:'Guild Ascendant',theme:'bronze',roomAdditions:Object.freeze({
   command:'Bronze command throne and banner',opportunities:'Raven-feather map table and scout banners',
   strategy:'Bronze astrolabe and strategy scrolls',operations:'Iron forge brazier and armory rack',
   production:'Runic anvil and bronze tool wall',quality:'Silver-leaf inspection lantern and trophy case',
   finance:'Bronze vault door and ledgers'})}),
  Object.freeze({atUSD:10000000,name:'The Golden Court',theme:'gold',roomAdditions:Object.freeze({
   command:'Gilded command dais and royal standard',opportunities:'Golden world map and raven observatory',
   strategy:'Celestial orrery and enchanted chart wall',operations:'Grand forge and iron legion standards',
   production:'Golden rune forge with animated embers',quality:'Moonlit gallery and masterwork displays',
   finance:'Golden treasury vault and illuminated accounting desk'})}),
  Object.freeze({atUSD:100000000,name:'The Eternal Dominion',theme:'mythic',roomAdditions:Object.freeze({
   command:'Eternal throne and floating crown',opportunities:'Living world map and spectral raven roost',
   strategy:'Floating star chart and cosmic observatory',operations:'Colossal dragon-forge and legion hall',
   production:'Legendary arcane forge and living runes',quality:'Radiant silver grove and artifact museum',
   finance:'Mythic crystal vault and celestial ledger'})})
 ]);
 function previewFor(roomId){return tiers.map(t=>({atUSD:t.atUSD,tier:t.name,addition:t.roomAdditions[roomId]||null}))}
 function awardedForVerifiedProfit(profitUSD,verified){if(verified!==true||typeof profitUSD!=='number'||!Number.isFinite(profitUSD))return [];
  return tiers.filter(t=>profitUSD>=t.atUSD).map(t=>t.atUSD);
 }
 return Object.freeze({tiers,previewFor,awardedForVerifiedProfit});
});
