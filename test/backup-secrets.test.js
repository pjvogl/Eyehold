/* node test/backup-secrets.test.js — EL-3 recovery-backup credential boundary.

   Recovery EXPORT AGENT is a portable plaintext file. It must preserve nonsecret browser state and memories,
   but it must never carry provider/BYOK/channel/OAuth/token/key storage records. The same boundary applies on
   import: an older or adversarial bundle cannot install credential material on this machine. */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const mem = {};
global.localStorage = {
  get length() { return Object.keys(mem).length; },
  key: i => Object.keys(mem)[i] || null,
  getItem: k => Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null,
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; }
};

const Backup = require('../frontend/app/backup.js');
let n = 0;
const ok = (value, message) => { assert.ok(value, message); n++; };
const eq = (actual, expected, message) => { assert.deepStrictEqual(actual, expected, message); n++; };

const SAVE = JSON.stringify({ schema: 'eyehold.save', version: 8, agent: { id: 'agent', name: 'NOVA' } });
const SECRET_ROWS = {
  'eyehold.byok.key': 'QA_BYOK_KEY',
  'eyehold.byok.key.openrouter': 'QA_SCOPED_BYOK_KEY',
  'eyehold.byok.baseUrl.openrouter': 'https://u:QA_BASEURL_PASSWORD@example.test/v1?token=QA_URL_TOKEN',
  'eyehold.provider.openai.apiKey': 'QA_PROVIDER_API_KEY',
  'eyehold.providers.anthropic.key': 'QA_PROVIDER_KEY',
  'eyehold.channel.discord.bot_token': 'QA_CHANNEL_TOKEN',
  'eyehold.channels.telegram.credential': 'QA_CHANNEL_CREDENTIAL',
  'eyehold.oauth.github.refresh_token': 'QA_OAUTH_TOKEN',
  'eyehold.auth.session.token': 'QA_AUTH_TOKEN',
  'eyehold.credentials.v1': 'QA_CREDENTIAL_BLOB',
  'eyehold.secret.future': 'QA_FUTURE_SECRET'
};

(async () => {
  localStorage.setItem('eyehold.save', SAVE);
  localStorage.setItem('eyehold.keep.v1', JSON.stringify({ theme: 'amber', crt: true }));
  localStorage.setItem('eyehold.byok.model', 'openai/gpt-safe-model-name');
  localStorage.setItem('eyehold.byok.prov', 'openrouter');
  for (const [key, value] of Object.entries(SECRET_ROWS)) localStorage.setItem(key, value);
  global.Harness = { notebook: async () => [{ id: 'm1', title: 'safe memory', body: 'remember the launch checklist' }] };

  const bundle = await Backup.build();
  const bytes = JSON.stringify(bundle);
  eq(bundle.secretsIncluded, false, 'portable bundle explicitly declares that secrets are excluded');
  eq(bundle.store['eyehold.save'], SAVE, 'agent save survives export');
  eq(JSON.parse(bundle.store['eyehold.keep.v1']).theme, 'amber', 'keep settings survive export');
  eq(bundle.store['eyehold.byok.model'], 'openai/gpt-safe-model-name', 'nonsecret model selection survives export');
  eq(bundle.notebook[0].title, 'safe memory', 'nonsecret memory survives export');
  for (const [key, sentinel] of Object.entries(SECRET_ROWS)) {
    ok(!Object.prototype.hasOwnProperty.call(bundle.store, key), 'credential storage record excluded: ' + key);
    ok(!bytes.includes(sentinel), 'credential sentinel absent from serialized bundle: ' + key);
  }

  // Import is backward-compatible with a v1/legacy envelope, but its contents are untrusted. Preserve an existing
  // local key and ignore every incoming credential family while restoring safe records.
  localStorage.clear();
  localStorage.setItem('eyehold.byok.key.openrouter', 'CURRENT_MACHINE_KEY');
  const legacyStore = Object.assign({
    'skynet.save': JSON.stringify({ schema: 'eyehold.save', version: 8, agent: { id: 'agent', name: 'RESTORED' } }),
    'skynet.keep.v1': JSON.stringify({ theme: 'green' })
  }, SECRET_ROWS, { 'skynet.byok.key.legacy': 'QA_LEGACY_KEY' });
  const applied = Backup.applyBundle({ schema: 'skynet.backup', version: 1, agentName: 'RESTORED', store: legacyStore });
  ok(applied.ok, 'legacy bundle still imports');
  eq(JSON.parse(localStorage.getItem('eyehold.save')).agent.name, 'RESTORED', 'legacy nonsecret save maps forward');
  eq(JSON.parse(localStorage.getItem('eyehold.keep.v1')).theme, 'green', 'legacy nonsecret settings map forward');
  eq(localStorage.getItem('eyehold.byok.key.openrouter'), 'CURRENT_MACHINE_KEY', 'import never overwrites this machine credential');
  eq(localStorage.getItem('eyehold.byok.key.legacy'), null, 'legacy credential alias is not restored');
  for (const key of Object.keys(SECRET_ROWS)) {
    if (key === 'eyehold.byok.key.openrouter') continue;
    eq(localStorage.getItem(key), null, 'incoming credential record ignored: ' + key);
  }

  const appSource = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'app', 'app.js'), 'utf8');
  ok(/r\.records\s*\+\s*' records'/.test(appSource), 'recovery export reports nonsecret records, not all localStorage keys');
  ok(/secrets excluded/i.test(appSource), 'recovery export uses the Settings secret-excluded copy');

  delete global.Harness;
  console.log('backup-secrets.test.js OK — ' + n + ' assertions');
})().catch(err => { console.error(err); process.exitCode = 1; });
