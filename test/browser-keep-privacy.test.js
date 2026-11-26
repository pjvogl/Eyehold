/* node test/browser-keep-privacy.test.js — ONLY the Commander at COMMS may drive the shared keep browser.
   Release review 2026-09-30: the keep browser carries the Commander's sign-ins and open tabs, and 'interactive' is
   also the surface of Telegram/Discord chats with approvals on (including allowed group chats), EYEHOLD REMOTE phone
   runs and group sessions. Those must browse in a private browser. Pins the composition-root wiring (an injected-deps
   unit test cannot see it): the keep view is granted only on surface 'interactive' AND keepBrowser:true, and only
   the COMMS /api/run call passes keepBrowser. Plus the view itself: a non-interactive request gets no keep view. */
'use strict';
const fs = require('fs');
const path = require('path');
const A = require('./_assert.js');
const { makeBrowserViews } = require('../sidecar/browser-view.js');

const ROOT = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const index = read('sidecar/index.js');

// the grant
const grant = index.match(/runKeepBrowser = await browserViews\.sessionForRun\(\{[^}]*\}\)/);
A.ok(!!grant, 'runOnce asks browser-view for the keep browser');
A.ok(grant && /interactive:\s*surface === 'interactive' && o\.keepBrowser === true/.test(grant[0]),
  'the keep browser is granted only to an interactive run that is ALSO marked as started from COMMS');

// who marks a run as COMMS
const marks = index.match(/keepBrowser:\s*true/g) || [];
A.eq(marks.length, 1, 'exactly one runOnce call in index.js claims the keep browser');
const at = index.indexOf('keepBrowser: true');
const around = index.slice(Math.max(0, at - 2500), at);
A.ok(/loginPrompt:\s*askHuman/.test(around) && /surface:\s*'interactive', prompt: promptConsent/.test(around),
  '…and it is the COMMS directive run (the one with the live consent and sign-in prompts)');

// the unattended / remote callers never claim it
for (const rel of ['sidecar/channels/hub.js', 'sidecar/remote/host.js']) {
  A.ok(!/keepBrowser/.test(read(rel)), rel + ' never claims the keep browser');
}
// the group-session runOnce (surface 'interactive', lead:false) must not either
const group = index.indexOf("surface: 'interactive', lead: false, groupTools: tools");
A.ok(group > 0, 'the group-session run is still where this test expects it');
const groupCall = index.slice(group - 1500, group + 1500);
A.ok(!/keepBrowser/.test(groupCall), 'group sessions never claim the keep browser');

// the view: no keep view unless interactive
{
  const views = makeBrowserViews({ now: () => 0, makeKeepSession: () => ({}) });
  A.eq(views.sessionForRun({ agentId: 'nova', runId: 'r1', interactive: false }), null, 'a run that is not granted gets no keep view (a private browser)');
  A.eq(views.sessionForRun({ agentId: 'nova', runId: 'r2' }), null, '…including one that says nothing');
}
A.report('browser-keep-privacy.test');
