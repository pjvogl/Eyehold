/* Treasury presentation and cosmetic installation from authenticated host records.
 * No income write route, model calls, or financial authority in this UI.
 */
'use strict';
(function(){
 if(typeof document==='undefined')return;
 function mount(){
  const board=document.getElementById('eyehold-workboard');
  if(!board||!globalThis.EyeholdRoomLoot||board.querySelector('[data-eye-loot]'))return;
  const panel=document.createElement('details');panel.dataset.eyeLoot='1';
  const heading=document.createElement('summary');heading.textContent='TREASURY — PROFIT MILESTONES';panel.appendChild(heading);
  const note=document.createElement('p');note.setAttribute('role','status');note.textContent='Checking financial evidence…';panel.appendChild(note);
  const labels=new Map();
  const native={1000000:'plant',10000000:'shelf',100000000:'vault'};
  for(const tier of EyeholdRoomLoot.tiers){
   const section=document.createElement('section');const h=document.createElement('h4');labels.set(tier.atUSD,h);section.appendChild(h);
   const description=document.createElement('p');description.textContent='Native room marker: '+native[tier.atUSD]+'. Planned fantasy artwork:';section.appendChild(description);
   const list=document.createElement('ul');
   for(const [room,addition] of Object.entries(tier.roomAdditions)){
    const li=document.createElement('li');li.textContent=room+': '+addition;list.appendChild(li);
   }
   section.appendChild(list);panel.appendChild(section);
  }
  const refresh=document.createElement('button');refresh.type='button';refresh.textContent='CHECK TREASURY';panel.appendChild(refresh);board.appendChild(panel);
  let busy=false;
  async function sync(){
   if(busy)return;busy=true;
   for(const [tier,label] of labels)label.textContent='$'+tier.toLocaleString('en-US')+' — '+EyeholdRoomLoot.tiers.find(t=>t.atUSD===tier).name+' (LOCKED)';
   try{
    const response=await fetch('/api/eyehold/finance',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);
    const report=await response.json();
    if(report.status!=='verified-records-only'||report.source!=='owner-reviewed-evidence'){
     note.textContent='Profit unavailable: '+String(report.reason||'No reviewed financial evidence.')+' No new upgrades unlocked.';return;
    }
    const tiers=EyeholdRoomLoot.awardedForVerifiedProfit(report.netProfitUSD,true).filter(t=>Array.isArray(report.unlockedMilestonesUSD)&&report.unlockedMilestonesUSD.includes(t));
    note.textContent='Imported net profit: $'+report.netProfitUSD.toLocaleString('en-US')+'. '+report.scope;
    for(const tier of tiers){
     const label=labels.get(tier);label.textContent=label.textContent.replace('(LOCKED)','(UNLOCKED)');
     if(typeof App==='undefined'||!App.keep?.()||typeof EyeholdNativeLoot==='undefined')continue;
     try{
      const applied=EyeholdNativeLoot.applyTrustedMilestone({keep:App.keep(),tier,attekeep:report,
       verifyAttekeep:(proof,t)=>proof===report&&tiers.includes(t),persist:()=>App.persist()});
      label.textContent=label.textContent.replace('(UNLOCKED)',applied.complete?'(INSTALLED)':'(UNLOCKED — make space in the rooms, then retry)');
     }catch(e){label.textContent=label.textContent.replace('(UNLOCKED)','(UNLOCKED — '+e.message+')');}
    }
   }catch(e){note.textContent='Treasury unavailable: '+e.message+'. No new upgrades unlocked.';}
   finally{busy=false;}
  }
  refresh.addEventListener('click',sync);
  const timer=setInterval(()=>{if(document.visibilityState!=='hidden')sync()},30000);
  window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  // Initial app boot can still be restoring the saved WorldModel.
  setTimeout(sync,1500);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
