'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../frontend/app/modeldock.js'), 'utf8');
const handler = source.slice(source.indexOf('  function openSubscription(event)'), source.indexOf('  function wire()'));
async function exercise(invoke) {
  let closed = 0, prevented = 0;
  const notices = [], calls = [];
  const context = {
    closeDock: () => closed++,
    window: invoke ? { __TAURI__: { core: { invoke: (...args) => { calls.push(args); return invoke(); } } } } : {},
    StationUI: { notify: (...args) => notices.push(args) }
  };
  vm.runInNewContext(handler + '\nthis.openAccount = openSubscription;', context);
  context.openAccount({ preventDefault: () => prevented++ });
  await new Promise(resolve => setImmediate(resolve));
  return { closed, prevented, notices, calls };
}
(async () => {
  const browser = await exercise();
  assert.equal(browser.prevented, 1, 'browser does not follow an upstream billing link');
  assert.equal(browser.calls.length, 0);
  assert.match(browser.notices[0][0], /billing is not configured/);
  const desktop = await exercise(() => Promise.resolve());
  assert.equal(desktop.calls.length, 0, 'desktop does not open an external billing URL');
  assert.match(desktop.notices[0][0], /billing is not configured/);
  assert.equal(desktop.notices[0][1], 'warn');
  const html = fs.readFileSync(path.join(__dirname, '../frontend/index.html'), 'utf8');
  assert.match(html, /id="model-dock-subscription" href="#billing-not-configured"/);
  assert.doesNotMatch(html, /starnetos\.com\/pricing/);
  console.log('model-subscription: billing stays unconfigured and does not open a payment page');
})().catch(e => { console.error(e); process.exitCode = 1; });
