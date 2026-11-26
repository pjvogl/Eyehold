/* node test/cli.e2e.test.js — the `eyehold` command, end to end, against a REAL sidecar.

   test/cli.test.js proves the decisions against fakes. This is the proof the surface exists: it boots the real
   sidecar (test/helpers/sidecar-fixture.js — hermetic profile, so no real keep is ever seen or touched),
   points its OpenRouter adapter at a content-driven mock (ZERO spend), and spawns bin/eyehold.js exactly the
   way a shell does. Nothing on either side of the pipe is stubbed.

   What it locks:
     1. ATTACH: `eyehold -p … --port N` drives a real /api/run on the running keep; the model's text streams
        to stdout, the receipt line goes to stderr, exit 0 on agent.run.end{done};
     2. --json emits one receipt object whose runId/text/reason are the keep's own;
     3. tool calls show as terse stderr lines; the consent gate is real — --yes approves and the write LANDS,
        the non-interactive default DENIES and the write never happens;
     4. status / doctor read the keep (providers by name only, never a key);
     5. a NAMED dead port (--port) is an error (exit 3), never a spawn; status never boots a keep;
     6. SPAWN: with no keep, `eyehold --spawn --workspace <fresh dir> -p …` bootstraps a full-power agent,
        boots a private sidecar, runs, and tears it down — and the workspace it leaves behind is one the DESKTOP
        resumes (a real sidecar booted on it afterwards serves the save + roster). Part of test:http. */
'use strict';

const A = require('./_assert.js');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { SidecarFixture } = require('./helpers/sidecar-fixture.js');

const HOST = '127.0.0.1';
const BIN = path.resolve(__dirname, '..', 'bin', 'eyehold.js');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* Content-driven mock OpenRouter (same shape as test/acp.e2e.test.js): a run also makes reflection/aux calls
   this test never asked for, so answers key off the LAST USER MESSAGE, never a queue. */
function startMockOpenRouter(script) {
  function decide(body) {
    const msgs = (body && body.messages) || [];
    const toolResults = msgs.filter(m => m && m.role === 'tool');
    if (toolResults.length) return { text: 'done' };
    const lastUser = [...msgs].reverse().find(m => m && m.role === 'user');
    const text = String((lastUser && lastUser.content) || '').toLowerCase();
    return script.find(r => text.indexOf(r.when) >= 0) || { text: 'nothing to do' };
  }
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url.indexOf('/models') >= 0) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ data: [{ id: 'test/model', context_length: 8000, pricing: { prompt: '0', completion: '0' }, supported_parameters: ['tools'] }] }));
      }
      if (req.url.indexOf('/chat/completions') >= 0) {
        let body = '';
        req.on('data', d => { body += d; });
        req.on('end', () => {
          let parsed = null; try { parsed = JSON.parse(body); } catch (_) {}
          const turn = decide(parsed);
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
          if (turn.tool) {
            res.write('data: ' + JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: turn.tool.name, arguments: JSON.stringify(turn.tool.args) } }] } }] }) + '\n\n');
            res.write('data: ' + JSON.stringify({ choices: [{ delta: {}, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 } }) + '\n\n');
          } else {
            res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: turn.text } }] }) + '\n\n');
            res.write('data: ' + JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 } }) + '\n\n');
          }
          res.write('data: [DONE]\n\n');
          res.end();
        });
        return;
      }
      res.writeHead(404); res.end();
    });
    server.listen(0, HOST, () => resolve({ server, base: 'http://' + HOST + ':' + server.address().port + '/api/v1' }));
  });
}

// run the CLI exactly as a shell would: a child process, no TTY on stdin (so the non-interactive rules apply)
function cli(args, env, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [BIN].concat(args), { env: Object.assign({}, process.env, env || {}), stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', d => { out += d; }); child.stderr.on('data', d => { err += d; });
    const timer = setTimeout(() => { try { child.kill(); } catch (_) {} }, timeoutMs || 90000);
    child.on('exit', (code) => { clearTimeout(timer); resolve({ code, out, err }); });
  });
}

// the hermetic profile the sidecar fixture uses — the CLI's OWN desktop discovery must look at the same empty
// scratch roots, so it can never find (or boot into) the developer's real keep.
function hermetic(profile) {
  const h = { APPDATA: profile, LOCALAPPDATA: profile, XDG_DATA_HOME: profile, EYEHOLD_PORT: '', EYEHOLD_PORT: '', EYEHOLD_WORKSPACES: '', EYEHOLD_WORKSPACES: '', EYEHOLD_TOKEN: '', EYEHOLD_API_TOKEN: '', EYEHOLD_API_TOKEN: '' };
  if (process.platform !== 'win32') h.HOME = profile;
  return h;
}

(async () => {
  const mock = await startMockOpenRouter([
    { when: 'say hello', text: 'Hello from the keep.' },
    { when: 'write the notes file', tool: { name: 'fs.write', args: { path: 'cli-notes.md', content: 'written through the eyehold CLI' } } },
    { when: 'write the secret file', tool: { name: 'fs.write', args: { path: 'cli-denied.md', content: 'must never exist' } } }
  ]);
  const providerEnv = {
    EYEHOLD_OPENROUTER_BASE: mock.base, EYEHOLD_OPENROUTER_BASE: mock.base,
    EYEHOLD_OPENROUTER_KEY: 'sk-or-v1-cli-fake', EYEHOLD_OPENROUTER_KEY: 'sk-or-v1-cli-fake',
    EYEHOLD_DEFAULT_MODEL: 'test/model', EYEHOLD_DEFAULT_MODEL: 'test/model'
  };

  /* ================= ATTACH: a running keep ================= */
  const fixture = SidecarFixture.create({ prefix: 'sk-cli-', env: providerEnv });
  await fixture.start();
  const ws = fixture.workspace;
  const port = fixture.port;
  const attachEnv = Object.assign(hermetic(fixture.profile), providerEnv);

  try {
    /* ---- 1. a plain run: text on stdout, receipt on stderr, exit 0 -------------------------- */
    {
      const r = await cli(['-p', 'say hello', '--port', String(port)], attachEnv);
      A.eq(r.code, 0, 'a clean run exits 0 (stderr: ' + r.err.slice(0, 300) + ')');
      A.ok(r.out.indexOf('Hello from the keep.') >= 0, 'the model text really streamed to stdout: ' + JSON.stringify(r.out));
      A.ok(/▸ .*attached http:\/\/127\.0\.0\.1:/.test(r.err), 'stderr names the attached keep');
      A.ok(/■ done · 1 turn\(s\)/.test(r.err), 'stderr carries the keep\'s own terminal reason: ' + r.err.split('\n').filter(l => l.indexOf('■') === 0).join(''));
      A.ok(!/^\s*[{[]/.test(r.out.trim()), 'stdout is prose, not JSON, without --json');
    }

    /* ---- 2. --json: ONE receipt object, values from the keep ---------------------------- */
    {
      const r = await cli(['-p', 'say hello', '--port', String(port), '--json'], attachEnv);
      A.eq(r.code, 0, '--json run exits 0');
      let j = null; try { j = JSON.parse(r.out.trim()); } catch (_) {}
      A.ok(j && typeof j === 'object', 'stdout is exactly one JSON object: ' + r.out.slice(0, 200));
      A.ok(j.ok === true && j.reason === 'done' && j.proven === true && j.exitCode === 0, 'receipt: ok/done/proven/exit 0');
      A.eq(j.text, 'Hello from the keep.', 'receipt text is the streamed answer');
      A.ok(/^[0-9a-f-]{36}$/.test(j.runId), 'receipt carries the keep\'s runId: ' + j.runId);
      A.eq(j.agentId, 'agent', 'the bare hero agent ran');
      A.eq(j.model + '/' + j.provider, 'test/model/openrouter', 'model + provider are what actually ran');
      A.eq(j.keep.mode, 'attached', 'keep mode');
      A.ok(j.turns === 1 && Array.isArray(j.toolCalls) && j.toolCalls.length === 0, 'turns + no tool calls');
      A.ok(!/Hello from the keep/.test(r.err), 'the answer is not duplicated on stderr');
      // truthfulness: the keep's OWN run history holds this runId
      const runs = await fetch(fixture.baseUrl + '/api/runs?limit=3', { headers: { 'X-Eyehold-Token': fixture.token, Origin: fixture.baseUrl } });
      const hist = await runs.json();
      A.ok((hist.runs || []).some(x => x.runId === j.runId && x.reason === 'done'), 'the receipt\'s runId is in the keep\'s run history with the same reason');
    }

    /* ---- 3. tool calls + the REAL consent gate ------------------------------------------------ */
    {
      // the bare 'agent' has no roster entry → approvalMode 'ask' → a write raises permission.prompt.
      // Non-interactive default: DENY. The file must not exist.
      const denied = await cli(['-p', 'write the secret file', '--port', String(port)], attachEnv);
      A.ok(/⋯ fs\.write/.test(denied.err), 'the tool call is printed as a terse stderr line: ' + denied.err.split('\n').find(l => /⋯/.test(l)));
      A.ok(/✗ denied fs\.write/.test(denied.err), 'the non-interactive default DENIES the consent prompt');
      A.ok(/pass --yes to approve/.test(denied.err), '…and says how to approve');
      A.ok(/↳ FAIL/.test(denied.err), 'the denied call is reported as failed');
      A.ok(!fs.existsSync(path.join(ws, 'agent', 'cli-denied.md')), 'the REJECTED write never happened');
      A.eq(denied.code, 0, 'the run still finished (the agent reported the denial) — exit reflects the keep\'s reason');

      const ok = await cli(['-p', 'write the notes file', '--port', String(port), '--yes'], attachEnv);
      A.ok(/✓ allowed fs\.write/.test(ok.err), '--yes approves the prompt');
      A.ok(/↳ ok/.test(ok.err), 'the approved call is reported ok');
      const written = path.join(ws, 'agent', 'cli-notes.md');
      A.ok(fs.existsSync(written), 'the APPROVED write really landed at ' + written);
      A.ok(fs.readFileSync(written, 'utf8').indexOf('written through the eyehold CLI') >= 0, 'with the content the agent sent');
      A.eq(ok.code, 0, 'exit 0');
      const j = JSON.parse((await cli(['-p', 'write the notes file', '--port', String(port), '--yes', '--json'], attachEnv)).out.trim());
      A.ok(j.toolCalls.length >= 1 && j.toolCalls[0].name === 'fs.write' && j.toolCalls[0].ok === true, 'the JSON receipt lists the tool call with its real outcome');
    }

    /* ---- 4. status + doctor ------------------------------------------------------------------ */
    {
      const s = await cli(['status', '--port', String(port)], attachEnv);
      A.eq(s.code, 0, 'status exits 0: ' + s.err.slice(0, 200));
      A.ok(/keep\s+http:\/\/127\.0\.0\.1:\d+ \(attached\)/.test(s.out), 'status names the keep');
      A.ok(/providers\s+openrouter/.test(s.out), 'status lists configured providers by NAME');
      A.ok(s.out.indexOf('sk-or-v1') < 0 && s.err.indexOf('sk-or-v1') < 0, 'status never prints a key');
      A.ok(/version\s+harness /.test(s.out), 'status carries the version surface');
      const sj = JSON.parse((await cli(['status', '--port', String(port), '--json'], attachEnv)).out.trim());
      A.ok(sj.reachable === true && sj.providers.indexOf('openrouter') >= 0 && sj.version && sj.version.node === process.version, 'status --json shape');
      A.eq(path.resolve(sj.workspace), path.resolve(ws), 'status --json reports the workspace the keep disclosed');

      const d = await cli(['doctor', '--port', String(port)], attachEnv);
      A.eq(d.code, 0, 'doctor exits 0');
      A.ok(/Eyehold diagnostics/.test(d.out) && /Credential:\s+configured/.test(d.out), 'doctor prints the static diagnostics report');
      A.ok(d.out.indexOf('sk-or-v1') < 0, 'doctor never prints a key');
    }

    /* ---- 5. a NAMED dead port is an error, not a spawn; status never boots ------------------- */
    {
      const dead = await cli(['-p', 'say hello', '--port', '9'], attachEnv);
      A.eq(dead.code, 3, 'a dead --port exits 3 (keep): ' + dead.err.slice(0, 200));
      A.ok(/no keep is answering on port 9/.test(dead.err) && !/booting a keep/.test(dead.err), 'and it did NOT spawn one');
      const st = await cli(['status', '--port', '9'], attachEnv);
      A.eq(st.code, 3, 'status on a dead port exits 3');
      const stj = JSON.parse((await cli(['status', '--port', '9', '--json'], attachEnv)).out.trim());
      A.ok(stj.ok === false && stj.exitCode === 3, 'status --json on a dead port is an honest failure object');
      const usage = await cli(['-p', 'x', '--timeout', 'never'], attachEnv);
      A.eq(usage.code, 2, 'a bad flag exits 2 (usage)');
      const ghost = await cli(['-p', 'say hello', '--port', String(port), '--agent', 'ghost'], attachEnv);
      A.eq(ghost.code, 3, 'an unknown --agent exits 3');
      A.ok(/unknown agent "ghost"/.test(ghost.err), 'and names it');
    }
  } finally {
    await fixture.dispose();
  }

  /* ================= SPAWN: no keep anywhere ================= */
  {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sk-cli-spawn-profile-'));
    const ws2 = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sk-cli-spawn-')), 'workspaces');
    const spawnEnv = Object.assign(hermetic(profile), providerEnv);
    try {
      const r = await cli(['--spawn', '--workspace', ws2, '--name', 'ATLAS', '-p', 'say hello'], spawnEnv, 120000);
      A.eq(r.code, 0, 'the spawn path exits 0 (stderr: ' + r.err.slice(0, 400) + ')');
      A.ok(r.out.indexOf('Hello from the keep.') >= 0, 'the answer streamed from the private keep: ' + JSON.stringify(r.out));
      A.ok(/bootstrapped .*ATLAS \(full power\)/.test(r.err), 'a fresh workspace was bootstrapped');
      A.ok(/provider openrouter from env:/.test(r.err), 'the provider was inferred from the environment credential');
      A.ok(/booting a keep on /.test(r.err) && /spawned http:\/\/127\.0\.0\.1:/.test(r.err), 'a private keep was booted for the run');
      A.ok(/▸ ATLAS \(agent\)/.test(r.err), 'the bootstrapped agent is the one that ran');
      // what it left behind
      const roster = JSON.parse(fs.readFileSync(path.join(ws2, 'agent.roster.json'), 'utf8'));
      A.eq(roster.agents[0].agentId + ':' + roster.agents[0].name + ':' + roster.agents[0].approvalMode, 'agent:ATLAS:full', 'the roster on disk holds the full-power agent');
      const save = JSON.parse(fs.readFileSync(path.join(ws2, 'agent.save.json'), 'utf8'));
      A.eq(save.doc.schema + ':' + save.doc.agent.name, 'eyehold.save:ATLAS', 'the save on disk is the desktop-resumable shape');
      A.ok(fs.existsSync(path.join(ws2, 'runs.jsonl')), 'the run was recorded durably by the private keep');
      await sleep(300);
      A.ok(!fs.existsSync(path.join(ws2, '.eyehold-workspace-owner.json')), 'the private keep released its workspace owner claim on exit');

      // second run on the SAME workspace: nothing re-bootstrapped, the persisted agent runs again
      const before = fs.readFileSync(path.join(ws2, 'agent.roster.json'), 'utf8');
      const r2 = await cli(['--spawn', '--workspace', ws2, '-p', 'say hello', '--json'], spawnEnv, 120000);
      A.eq(r2.code, 0, 'a second spawn run exits 0: ' + r2.err.slice(0, 300));
      A.ok(!/bootstrapped/.test(r2.err), 'an existing keep is never re-bootstrapped');
      const j2 = JSON.parse(r2.out.trim());
      A.ok(j2.ok && j2.agentName === 'ATLAS' && j2.keep.mode === 'spawned' && path.resolve(j2.keep.workspace) === path.resolve(ws2), 'the receipt names the spawned keep and its workspace');
      A.eq(fs.readFileSync(path.join(ws2, 'agent.roster.json'), 'utf8'), before, 'the roster file is byte-identical after the second run');

      // THE DESKTOP READ-BACK: a real sidecar booted on that workspace serves the save the desktop resumes
      const again = SidecarFixture.create({ prefix: 'sk-cli-resume-', env: providerEnv });
      fs.rmSync(again.workspace, { recursive: true, force: true });
      again.workspace = ws2;
      await again.start();
      try {
        const h = { 'X-Eyehold-Token': again.token, Origin: again.baseUrl };
        const sv = await (await fetch(again.baseUrl + '/api/save?agent=agent', { headers: h })).json();
        A.ok(sv.save && sv.save.agent && sv.save.agent.name === 'ATLAS' && sv.save.schema === 'eyehold.save', 'GET /api/save serves the bootstrapped agent — the desktop\'s boot path takes the RESUME branch, never the first-run ceremony');
        A.ok(!sv.recovery, 'no quarantine/recovery marker was raised by the bootstrap files');
        const rt = await (await fetch(again.baseUrl + '/api/runtime/agent', { headers: h })).json();
        A.ok(rt.agents.some(a => a.agentId === 'agent' && a.name === 'ATLAS' && a.model === 'test/model'), 'the roster the sidecar loaded lists ATLAS with its model');
        A.ok(again.output().indexOf('[recovery] restored prior keep') < 0, 'the recovery gate did not treat the CLI-made workspace as an empty root to recover into');
      } finally { await again.dispose(); }
    } finally {
      try { fs.rmSync(path.dirname(ws2), { recursive: true, force: true }); } catch (_) {}
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
    }
  }

  try { mock.server.close(); } catch (_) {}
  A.report('cli.e2e.test');
})().catch(e => { console.log('FAIL: cli.e2e.test threw - ' + (e && e.stack || e)); process.exit(1); });
