import assert from 'node:assert/strict';
import worker from '../services/portal/src/worker.js';

const env = {
  EYEHOLD_BASE_DOMAIN: 'eyehold.babelbook.net',
  EYEHOLD_ACCESS_EMAILS: 'owner@eyehold.example',
  EYEHOLD_ACCESS_CLIENT_ID: 'client',
  EYEHOLD_ACCESS_CLIENT_SECRET: 'secret'
};
const headers = { 'Cf-Access-Authenticated-User-Email': 'owner@eyehold.example' };
async function get(path, extra) {
  const response = await worker.fetch(new Request('https://eyehold.babelbook.net' + path, { headers: extra || {} }), env);
  const type = response.headers.get('content-type') || '';
  const body = type.includes('json') ? await response.json() : await response.text();
  return { status: response.status, body };
}
assert.equal((await get('/healthz')).status, 200);
assert.equal((await get('/healthz')).body.billingLive, false);
assert.equal((await get('/')).status, 401);
const home = await get('/', headers);
assert.equal(home.status, 200);
assert.match(home.body, /THE EYEHOLD/);
assert.match(home.body, /No signed installer is published/);
assert.doesNotMatch(home.body, /starnetos|babelbook-staging/);
const feed = await get('/updates/latest.json', headers);
assert.equal(feed.status, 200);
assert.deepEqual(feed.body.platforms, {});
assert.equal(feed.body.version, '0.0.0-unsigned');
const token = await get('/updates/latest.json', { 'CF-Access-Client-Id': 'client', 'CF-Access-Client-Secret': 'secret' });
assert.equal(token.status, 200);
const balance = await get('/billing/balance', headers);
assert.equal(balance.status, 200);
assert.equal(balance.body.credits, 0);
assert.equal(balance.body.accountKey, 'email:owner@eyehold.example');
const other = await get('/billing/balance', { 'Cf-Access-Authenticated-User-Email': 'stranger@eyehold.example' });
assert.equal(other.status, 401);
const wrong = await worker.fetch(new Request('https://babelbook.net/'), env);
assert.equal(wrong.status, 404);
const staging = await worker.fetch(new Request('https://babelbook-staging.example/'), env);
assert.equal(staging.status, 404);
console.log('Eyehold portal gate, download page, and update feed OK');
