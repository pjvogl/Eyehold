/* node test/keep-default-wire.test.js — issue #24: "Follow keep default" must follow the KEEP, not the
   last pinned agent that was focused. focusAgent writes the focused agent's wire into the one global Harness wire
   every COMMS run reads; an unpinned agent used to keep whatever pin was there, so a specialist summoned on Eyehold
   credits and later un-pinned kept sending runs as `eyehold` — refused at 0s with "Out of managed credit" on a funded
   OpenRouter keep. app.js is not node-loadable, so the wire helpers are lifted from source and run against a fake
   roster, and the call sites that must use them are locked against the source. */
'use strict';
const A = require('./_assert.js');
const fs = require('fs');
const path = require('path');
const appjs = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'app', 'app.js'), 'utf8');

function lift(name) {
  const start = appjs.indexOf('  function ' + name + '(');
  A.ok(start >= 0, name + ' exists in app.js');
  const end = appjs.indexOf('\n  }\n', start);
  return appjs.slice(start, end + 4);
}
const src = ['keepDefaultWire', 'savedKeepProv', 'focusWire', 'applyWire'].map(lift).join('\n');
function world(agentsList) {
  const agents = new Map(agentsList.map(a => [a.id, a]));
  const state = { prov: '', model: '', effort: '' };
  const Harness = {
    setProv: p => { state.prov = p; }, setModel: m => { state.model = m; }, setReasoningEffort: e => { state.effort = e; }
  };
  const fns = new Function('agents', 'Harness', src + '\nreturn { keepDefaultWire, savedKeepProv, focusWire, applyWire };')(agents, Harness);
  return Object.assign(fns, { agents, state });
}

const hero = { id: 'agent', model: 'openai/gpt-6-astra-pro', provider: 'openrouter', reasoningEffort: 'medium' };
const pinned = { id: 'chief', model: 'anthropic/claude-sonnet-5', provider: 'eyehold', reasoningEffort: 'high' };
const unpinned = { id: 'researcher', model: null, provider: null, reasoningEffort: null };
const w = world([hero, pinned, unpinned]);

// the reporter's sequence: focus a eyehold-pinned specialist, then an unpinned one
w.applyWire(w.focusWire(pinned));
A.eq(w.state.prov, 'eyehold', 'a pinned agent still runs on its own pin');
A.eq(w.state.model, 'anthropic/claude-sonnet-5', 'a pinned agent still runs on its own model');
w.applyWire(w.focusWire(unpinned));
A.eq(w.state.prov, 'openrouter', 'an unpinned agent follows the keep provider, not the last pin focused (#24)');
A.eq(w.state.model, 'openai/gpt-6-astra-pro', 'an unpinned agent follows the keep model, not the last pin focused');
A.eq(w.state.effort, 'medium', 'an unpinned agent follows the keep reasoning effort');

// clearing the focused agent's pin re-applies the keep default at once
w.applyWire(w.focusWire(pinned));
pinned.model = null; pinned.provider = null; pinned.reasoningEffort = null;
w.applyWire(w.focusWire(pinned));
A.eq(w.state.prov, 'openrouter', 'FOLLOW KEEP DEFAULT on the focused agent drops its eyehold pin immediately');

// a pinned model with no provider takes the keep provider, never a stale global
const legacy = { id: 'old', model: 'openai/gpt-4o-mini', provider: null };
A.eq(w.focusWire(legacy).provider, 'openrouter', 'a legacy pin without a provider rides the keep provider');

// saves written while a pinned agent was focused carried its provider as the top-level `prov`
A.eq(w.savedKeepProv({ prov: 'eyehold', agent: { provider: 'openrouter' } }), 'openrouter', 'a poisoned save resumes on the hero\'s provider');
A.eq(w.savedKeepProv({ prov: 'codex', agent: {} }), 'codex', 'an older save without a hero provider still resumes on its top-level prov');
A.eq(w.savedKeepProv(null), '', 'no save → no provider');

// the call sites that must route through the keep default
const focusBody = appjs.slice(appjs.indexOf('  function focusAgent('), appjs.indexOf('\n  }\n', appjs.indexOf('  function focusAgent(')));
A.ok(/applyWire\(wire\)/.test(focusBody) && /const wire = focusWire\(a\)/.test(focusBody), 'focusAgent applies focusWire (keep default for unpinned agents)');
A.ok(!/if \(a\.provider && typeof Harness/.test(focusBody), 'focusAgent no longer writes only the fields an agent happens to carry');
A.ok(/applyWire\(focusWire\(a\)\);\s+\/\/ a CLEARED pin/.test(appjs), 'clearing the focused agent\'s pin re-applies the keep default');
A.ok(/const fallbackProv = keepDefaultWire\(\)\.provider \|\|/.test(appjs), 'pushRoster stamps unpinned rows with the keep provider, not the focused pin');
A.ok(/const prov = \(hero && hero\.provider\) \|\|/.test(appjs), 'persist saves the keep provider, not the focused agent\'s pin');
A.eq((appjs.match(/Harness\.setProv\(saved\.prov\)/g) || []).length, 0, 'no resume path restores the raw top-level saved.prov');
A.eq((appjs.match(/Harness\.setProv\(savedKeepProv\(saved\)\)/g) || []).length, 3, 'all three resume paths restore the keep provider');

// SETTINGS -> PROVIDERS moves the keep default (the Overseer's pin), so unpinned agents follow the switch instead
// of the provider the keep just left (a Eyehold-credits keep switched to a BYOK key kept sending `eyehold`).
{
  const calls = [];
  const src2 = ['keepDefaultWire', 'focusWire', 'setKeepProvider'].map(lift).join('\n');
  const roster = new Map([
    ['agent', { id: 'agent', model: 'anthropic/claude-sonnet-5', provider: 'eyehold', reasoningEffort: 'medium' }],
    ['scout', { id: 'scout', model: null, provider: null, reasoningEffort: null }]
  ]);
  const f = new Function('agents', 'normalizeProviderId', 'pushRoster', 'persist', src2 + '\nreturn { focusWire, setKeepProvider };')(
    roster, p => String(p).trim().toLowerCase(), () => calls.push('roster'), () => calls.push('persist'));
  A.eq(f.focusWire(roster.get('scout')).provider, 'eyehold', 'before the switch an unpinned agent follows the Overseer');
  A.eq(f.setKeepProvider('openrouter'), true, 'the Settings pick moves the keep default');
  A.eq(f.focusWire(roster.get('scout')).provider, 'openrouter', 'an unpinned agent follows the Settings switch, not the provider the keep left');
  A.eq(f.focusWire(roster.get('scout')).model, 'anthropic/claude-sonnet-5', 'the keep model is kept (the dock reconciles an invalid one)');
  A.eq(calls, ['roster', 'persist'], 'unpinned roster rows and the save are rewritten');
  A.eq(f.setKeepProvider('openrouter'), false, 'a repeat pick is a no-op');
}
const keepui = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'app', 'keepui.js'), 'utf8');
A.ok(/h\.setProv\(p\);\s*\n\s*\/\/[^\n]*\n\s*if \(typeof App !== 'undefined' && App\.setKeepProvider\) App\.setKeepProvider\(p\);/.test(keepui),
  'the Settings provider card moves the keep default too');

A.report('keep-default-wire.test');
