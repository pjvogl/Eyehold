/* node test/keep-inspect.test.js — tool registration, authority, and honest degradation. */
'use strict';
const A = require('./_assert.js');
const { makeKeepInspectTool } = require('../sidecar/tools/builtin/keep-inspect.js');
const { resolveTools } = require('../sidecar/capability/resolve.js');

(async () => {
  const planted = {
    schemaVersion: 1,
    build: { status: 'confirmed', data: { harness: 'v-test' } },
    runtime: { status: 'confirmed', data: { runId: 'r1' } },
    scheduler: { status: 'confirmed', data: { jobCount: 2, healthy: true } },
    connectors: { status: 'confirmed', data: { count: 1 } },
    diagnostics: { status: 'confirmed', data: { errorCount: 1 } }
  };
  const made = makeKeepInspectTool({ inspect: async () => planted });
  const out = await made.tool.run({}, { runId: 'r1' });
  A.eq(JSON.parse(out.content).scheduler.data.jobCount, 2, 'tool returns the planted authoritative snapshot');
  A.eq(out.summary, 'harness snapshot confirmed', 'all-confirmed state says so');
  A.eq(made.tool.scope, 'read', 'keep.inspect is read-only');
  A.eq(made.tool.requiresConsent, false, 'keep.inspect needs no approval');
  A.eq(made.tool.capability, 'keepinfo', 'keep.inspect has a non-toggleable base capability');
  A.ok(/instead of guessing/.test(made.tool.description), 'tool description carries the anti-guessing rule');

  const missing = makeKeepInspectTool({});
  const noReader = JSON.parse((await missing.tool.run({})).content);
  A.eq(noReader.status, 'unavailable', 'an unwired reader is explicit, never an empty-success lie');

  const partial = makeKeepInspectTool({ inspect: () => Object.assign({}, planted, { connectors: { status: 'unavailable', reason: 'store down' } }) });
  A.ok(/connectors/.test((await partial.tool.run({})).summary), 'partial snapshots name unavailable sections');

  const keep = {
    agents: { nova: { id: 'nova', room: 'bay' } },
    rooms: { bay: { id: 'bay', objects: [{ instanceId: 'desk-1', objectType: 'computer' }] } }
  };
  const resolved = resolveTools('nova', keep);
  A.ok(resolved.hasCompute, 'the planted COMPUTER still grants model compute');
  A.ok(resolved.tools.indexOf('keep.inspect') >= 0, 'COMPUTER grants keep.inspect with no other prop');
  A.ok(resolved.tools.indexOf('fs.read') < 0 && resolved.tools.indexOf('shell.exec') < 0 && resolved.tools.indexOf('web_search') < 0,
    'self-inspection does not widen files, terminal, or network authority');

  const reg = { names: [], register(def) { this.names.push(def.name); } };
  made.register(reg);
  A.eq(reg.names.join(','), 'keep.inspect', 'register installs exactly the inspect reader');

  A.report('keep-inspect');
})().catch(error => { console.error(error); process.exit(1); });
