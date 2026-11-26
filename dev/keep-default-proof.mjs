import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { launchChrome, connectCDP, evalJS, sleep, capture, collectDiagnostics } from '../scripts/lib/cdp.mjs';

const out = path.resolve('.dogfood/keep-default');
fs.mkdirSync(out, {recursive:true});
const {proc} = launchChrome({cdpPort:18846, profileDir:path.join(out,'browser'), win:'1440,1000'});
let cdp;
try {
  cdp = await connectCDP(18846);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {source:`
    Element.prototype.requestPointerLock = async function() {};
    if (navigator.keyboard) navigator.keyboard.lock = async function() {};
  `});
  const diagnostics=collectDiagnostics(cdp);
  await cdp.send('Page.navigate',{url:'http://127.0.0.1:18845/'});
  let ready=false;
  for(let i=0;i<120;i++) {
    ready=await evalJS(cdp,"typeof World!=='undefined' && !!World.keepDoc() && typeof PropRemaster!=='undefined' && PropRemaster.enabled('studio','s')");
    if(ready)break;
    await sleep(500);
  }
  assert.ok(ready,'Keep and remastered art loaded');
  await sleep(1500);
  const receipt=await evalJS(cdp,`({keep:World.keepDoc(),caps:World.heroCaps('agent').map(c=>c.objectType),art:PropRemaster.status()})`);
  assert.equal(receipt.keep.order.length,1);
  assert.equal(receipt.keep.props.length,8);
  for(const cap of ['cabinet','dish','workbench','notebook','studio'])assert.ok(receipt.caps.includes(cap),cap);
  assert.equal(receipt.keep.props.filter(p=>p.t==='desk'&&p.agentId==='agent').length,1);
  assert.deepEqual(receipt.art.failures,[]);
  receipt.exceptions=diagnostics.exceptions;
  fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2));
  await capture(cdp,out,'default-keep');
  console.log('Default keep: five grants, assigned desk, remastered assets, no loader failures');
  await evalJS(cdp,"Build.open();document.querySelector('#refit-keeps').click()");
  assert.equal(await evalJS(cdp,"document.querySelectorAll('[data-keep-build]').length"),6);
  await capture(cdp,out,'keep-build-picker');
  receipt.builds=[];
  for(const [id,count] of [['retreat',2],['creative',3],['research',3],['engineering',5],['operations',5]]) {
    await evalJS(cdp,`if(!document.querySelector('[data-keep-build]'))document.querySelector('#refit-keeps').click();document.querySelector('[data-keep-build="${id}"]').click();document.querySelector('[data-use-build]').click()`);
    const before=await evalJS(cdp,'World.keepDoc().meta.templateId||"default"');
    await evalJS(cdp,"document.querySelector('[data-use-build]').click()");
    await sleep(800);
    const result=await evalJS(cdp,`({id:World.keepDoc().meta.templateId,rooms:Object.values(World.keepDoc().rooms).filter(r=>r.kind!=='corridor').length,owners:World.keepDoc().props.filter(p=>p.agentId).map(p=>p.agentId),backup:JSON.parse(localStorage.getItem('eyehold.layoutBackup.'+World.keepDoc().meta.createdAt)).meta.templateId||'default'})`);
    assert.equal(result.id,id);assert.equal(result.rooms,count);assert.equal(result.backup,before);assert.deepEqual(result.owners,['agent']);
    receipt.builds.push(result);
    await evalJS(cdp,'Build.close();World.camPullBack()');await sleep(1200);
    await capture(cdp,out,id);
    await evalJS(cdp,'Build.open()');
  }
  await evalJS(cdp,"document.querySelector('#refit-keeps').click();document.querySelector('[data-restore-build]').click()");
  assert.equal(await evalJS(cdp,'World.keepDoc().meta.templateId'),'engineering');
  await evalJS(cdp,"document.querySelector('#refit-undo').click()");
  assert.equal(await evalJS(cdp,'World.keepDoc().meta.templateId'),'operations');
  await evalJS(cdp,`document.querySelector('#refit-keeps').click();document.querySelector('[data-keep-build="default"]').click();document.querySelector('[data-use-build]').click();document.querySelector('[data-use-build]').click();Build.close()`);
  await sleep(1000);
  await cdp.send('Page.reload');await sleep(3000);
  assert.equal(await evalJS(cdp,'World.keepDoc().meta.templateId'),'default');
  assert.equal(await evalJS(cdp,'World.keepDoc().props.length'),8);
  assert.equal((await evalJS(cdp,'CloudSave.flushForUpdate()')).ok,true);
  receipt.exceptions=diagnostics.exceptions;
  fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2));
  console.log('Five build choices: apply, backup, restore, undo, reload PASS');
} finally {cdp?.ws.close();proc.kill();}
