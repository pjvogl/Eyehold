import { createMemoryLedger, safeEqual } from '../../billing/billing.mjs';
import { allowedEmail, handleBilling, json, ledgerFor } from '../../billing/src/worker.js';

const ledger = createMemoryLedger();

function hostAllowed(hostname, env) {
  const domain = env.EYEHOLD_BASE_DOMAIN || 'eyehold.babelbook.net';
  return hostname === domain || hostname === 'localhost' || hostname === '127.0.0.1';
}
function serviceToken(request, env) {
  const id = request.headers.get('CF-Access-Client-Id') || '';
  const secret = request.headers.get('CF-Access-Client-Secret') || '';
  if (!env.EYEHOLD_ACCESS_CLIENT_ID || !env.EYEHOLD_ACCESS_CLIENT_SECRET) return false;
  return safeEqual(id, env.EYEHOLD_ACCESS_CLIENT_ID) && safeEqual(secret, env.EYEHOLD_ACCESS_CLIENT_SECRET);
}
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function page(email) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>The Eyehold</title>
<style>
body{margin:0;background:#140e16;color:#e6ac65;font-family:ui-monospace,monospace}
main{max-width:42rem;margin:0 auto;padding:3rem 1.25rem}
h1{font-weight:400;letter-spacing:.12em;font-size:2rem}
p,li{line-height:1.5;color:#f0d7a8}
a{color:#e6ac65}
.ridge{height:4rem;background:linear-gradient(#140e16,#243028)}
</style></head><body><div class="ridge"></div><main>
<h1>THE EYEHOLD</h1>
<p>A realm of working minds. Signed in as ${esc(email)}.</p>
<h2>Download</h2>
<p>No signed installer is published. Auto-update artifacts stay off until the owner replaces the signing key.</p>
<h2>Updates</h2>
<p>The feed at <a href="/updates/latest.json">/updates/latest.json</a> lists no platforms yet.</p>
<h2>Credits</h2>
<p>Managed credits are separate from Crowns. Purchases stay off until this host is deployed and the live flags are switched on by the owner.</p>
</main></body></html>`;
}
function feed() {
  return {
    version: '0.0.0-unsigned',
    notes: 'No signed Eyehold release is published.',
    pub_date: '2026-11-10T00:00:00Z',
    platforms: {}
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!hostAllowed(url.hostname, env)) return json(404, { error: 'wrong-host' });
    if (url.pathname === '/healthz' || (url.pathname === '/billing/webhook' && request.method === 'POST')) {
      return handleBilling(request, env, ledgerFor(env, ledger));
    }
    const email = allowedEmail(request, env);
    if (!email && !serviceToken(request, env)) return json(401, { error: 'access-email-required' });
    if (url.pathname === '/' || url.pathname === '/download') {
      return new Response(page(email || 'service-token'), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }
    if (url.pathname === '/updates/latest.json' && request.method === 'GET') return json(200, feed());
    const billed = await handleBilling(request, env, ledgerFor(env, ledger));
    return billed || json(404, { error: 'not-found' });
  }
};
