/* Real browser + real sidecar, isolated fixture keep, zero model calls.
 * Requires playwright and Chromium (EYEHOLD_CHROME may point to installed Chrome).
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const {buildEyeholdKeep}=require('../eyehold-seven-room-starter.cjs');
const {createFinanceStore}=require('../../sidecar/eyehold-finance-store.js');
const {provision}=require('../../sidecar/eyehold-owner-auth.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const root=fs.mkdtempSync(path.join(os.tmpdir(),'eye-ui-smoke-'));
const port=21000+Math.floor(Math.random()*16000),base='http://127.0.0.1:'+port;
const output=process.argv[2]?path.resolve(process.argv[2]):null;
let browser,child,page;
const errors=[];
async function run(){
 // Disposable host-owned run and owner authority: never production data.
 fs.writeFileSync(path.join(root,'runs.jsonl'),JSON.stringify({runId:'ui-review-run',agentId:'agent',reason:'done',title:'UI review fixture',deliveryText:'Fixture output: release checks with measurable acceptance criteria and a rollback plan.',ts:Date.now()})+'\n');
 const reviewKey=provision(root);
 const childEnv={...process.env,SKYNET_PORT:String(port),SKYNET_WORKSPACES:root,SKYNET_BUDGET_GLOBAL:'0',SKYNET_BUDGET_PER_DAY:'0'};
 for(const name of Object.keys(childEnv))if(/KEY|TOKEN|SECRET/.test(name))delete childEnv[name];
 child=spawn(process.execPath,[path.resolve(__dirname,'../../sidecar/index.js')],{env:childEnv,stdio:'ignore'});
 for(let i=0;i<70;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}if(i===69)throw Error('Sidecar failed to start');await sleep(150);}
 browser=await chromium.launch({headless:true,...(process.env.EYEHOLD_CHROME?{executablePath:process.env.EYEHOLD_CHROME}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 page=await browser.newPage({viewport:{width:1440,height:1000}});
 // Test browser cannot send prompts to a provider even if a boot regression tries.
 await page.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():route.abort());
 await page.route('**/api/run',route=>{errors.push('Unexpected model run requested');return route.abort();});
 const seed={schema:'eyehold.save',version:6,updatedAt:Date.now(),agent:{id:'agent',name:'THE EYE',createdAt:Date.now(),onboarded:true,role:'orchestrator',purpose:'Offline UI fixture; no model calls',provider:'ollama',model:'ui-fixture',specialtyId:'eyehold-keep'},keep:buildEyeholdKeep().doc,workstreams:[]};
 await page.addInitScript(doc=>{if(!localStorage.getItem('eyehold.save'))localStorage.setItem('eyehold.save',JSON.stringify(doc));},seed);
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/');await page.waitForFunction(()=>typeof App!=='undefined'&&!!App.keep?.(),null,{timeout:30000});
 await page.getByRole('button',{name:'WORK BOARD',exact:true}).click();
 await page.evaluate(async()=>{const r=await fetch('/api/goals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({goal:{id:'ui-goal',text:'Verify the owner review flow in an isolated test',milestones:[]}})});if(!r.ok)throw Error('fixture goal rejected')});
 await page.getByRole('button',{name:/UI review fixture/}).click();
 await page.getByLabel('Owner deliverable review').getByText(/Goal: Verify the owner review/).waitFor();
 await page.getByLabel('I inspected this exact output').check();
 await page.getByLabel('Owner review key',{exact:true}).fill('invalid-fixture-key');
 await page.getByRole('button',{name:'ACCEPT REVIEWED WORK',exact:true}).click();
 await page.getByText(/Not accepted: separate-owner-key-required/).waitFor();
 await page.getByLabel('Owner review key',{exact:true}).fill(reviewKey);
 await page.getByRole('button',{name:'ACCEPT REVIEWED WORK',exact:true}).click();
 await page.getByText(/Owner accepted this output. agent now has 16 Crowns/).waitFor();
 assert.equal(await page.getByLabel('Owner review key',{exact:true}).inputValue(),'','owner key cleared after submission');
 await page.getByText('TREASURY — PROFIT MILESTONES',{exact:true}).click();
 await page.getByRole('button',{name:'CHECK TREASURY',exact:true}).click();
 await page.getByText(/Profit unavailable:/).waitFor();
 assert.equal(await page.locator('[data-eye-loot] h4').count(),3);
 const store=createFinanceStore({file:path.join(root,'eyehold-finance.json')});
 // Synthetic evidence exists ONLY in this disposable fixture. No production earnings.
 store.replaceReviewed([JSON.stringify({id:'ui-fixture',currency:'USD',type:'revenue',cents:100000000})],{confirmedReviewed:true});
 await page.getByRole('button',{name:'CHECK TREASURY',exact:true}).click();
 await page.getByRole('heading',{name:/Guild Ascendant \(INSTALLED\)/}).waitFor();
 assert.equal(await page.evaluate(()=>App.keep().props().filter(p=>String(p.label||'').startsWith('Eyehold:')).length),7);
 await page.reload();await page.waitForFunction(()=>typeof App!=='undefined'&&!!App.keep?.());
 await page.getByRole('button',{name:'WORK BOARD',exact:true}).click();await page.getByText('TREASURY — PROFIT MILESTONES',{exact:true}).click();await page.getByRole('button',{name:'CHECK TREASURY',exact:true}).click();
 await page.getByRole('heading',{name:/Guild Ascendant \(INSTALLED\)/}).waitFor();
 assert.equal(await page.evaluate(()=>App.keep().props().filter(p=>String(p.label||'').startsWith('Eyehold:')).length),7,'reload cannot duplicate markers');
 if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,'work-board-desktop.png')});}
 await page.setViewportSize({width:390,height:844});
 const box=await page.locator('#eyehold-workboard').boundingBox();assert(box&&box.x>=0&&box.x+box.width<=391,'work board fits mobile viewport');
 if(output)await page.screenshot({path:path.join(output,'work-board-mobile.png')});
 assert.deepEqual(errors,[],'no page errors or model calls');
 console.log('PASS: real app owner review rejects wrong key, accepts explicit fixture review, clears key; Treasury missing-data state, fixture unlock, seven native props, reload and mobile board; no paid inference');
}
run().catch(async e=>{console.error(e);if(page){try{const diagnostic={errors,visibleText:(await page.locator('body').innerText()).slice(0,6000)};console.error(JSON.stringify(diagnostic));if(output){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,'failure-fixture.png')});fs.writeFileSync(path.join(output,'failure-diagnostic.json'),JSON.stringify(diagnostic,null,2));}}catch{}}process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(child){const c=child;c.kill('SIGTERM');await Promise.race([new Promise(r=>c.exitCode!==null?r():c.once('exit',r)),sleep(4000)]);if(c.exitCode===null&&c.signalCode===null)c.kill('SIGKILL');}fs.rmSync(root,{recursive:true,force:true,maxRetries:5,retryDelay:200});});
