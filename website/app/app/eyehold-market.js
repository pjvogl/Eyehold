/* Owner market queue. Opening it only reads drafts. Stripe is called from the
 * publish button, and only after that click.
 */
'use strict';
(function () {
  if (typeof document === 'undefined') return;
  const SELL = 'Draft a sellable digital product for the Market outbox: a template, guide, asset, or small paid service, with a title, a description, and a price in cents. Do not create a Stripe product, payment link, or customer message. The owner publishes.';
  const setup = () => {
    if (document.getElementById('eyehold-market')) return;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.textContent = 'MARKET';
    toggle.setAttribute('aria-controls', 'eyehold-market');
    toggle.style.cssText = 'position:fixed;bottom:18px;right:150px;z-index:995;padding:9px 13px;border:1px solid #aa8d5c;border-radius:5px;background:#1b1719;color:#e7d8b8;font:14px VT323,monospace;cursor:pointer';
    const board = document.createElement('section');
    board.id = 'eyehold-market';
    board.hidden = true;
    board.setAttribute('aria-label', 'Eyehold market outbox');
    board.style.cssText = 'position:fixed;bottom:57px;right:150px;z-index:995;box-sizing:border-box;width:min(420px,calc(100vw * var(--sn-unzoom,1) - 36px));max-height:calc(55vh * var(--sn-unzoom,1));overflow:auto;padding:14px;border:1px solid #aa8d5c;border-radius:6px;background:#171518;color:#e7d8b8;font:13px/1.5 VT323,monospace';
    const heading = document.createElement('h2');
    heading.textContent = 'MARKET OUTBOX';
    heading.style.cssText = 'font:17px VT323,monospace;margin:0 0 8px';
    const goal = document.createElement('p');
    goal.textContent = SELL;
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = 'Nothing is sent until you press a button.';
    const list = document.createElement('ol');
    list.style.cssText = 'padding-left:18px;margin:8px 0';
    board.append(heading, goal, status, list);
    document.body.append(toggle, board);
    toggle.addEventListener('click', () => {
      board.hidden = !board.hidden;
      toggle.setAttribute('aria-expanded', String(!board.hidden));
      if (!board.hidden) load();
    });
    async function load() {
      status.textContent = 'Loading the outbox…';
      list.replaceChildren();
      try {
        const response = await fetch('/api/eyehold/market', { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'unavailable');
        const rows = body.queue || [];
        if (!rows.length) { status.textContent = 'No drafts waiting. Crowns are not money, and nothing was published.'; return; }
        status.textContent = rows.length + ' draft' + (rows.length === 1 ? '' : 's') + ' waiting for an owner click.';
        for (const row of rows) {
          const item = document.createElement('li');
          const listing = row.listing || {};
          item.textContent = listing.title + ' · $' + (listing.priceCents / 100).toFixed(2) + ' · ' + listing.channel;
          const publish = document.createElement('button');
          publish.type = 'button';
          publish.textContent = 'CREATE STRIPE LINK';
          publish.style.cssText = 'display:block;margin-top:6px;font:14px VT323,monospace';
          publish.addEventListener('click', () => act(row.id, 'publish'));
          const reject = document.createElement('button');
          reject.type = 'button';
          reject.textContent = 'REJECT DRAFT';
          reject.style.cssText = 'margin-top:6px;font:14px VT323,monospace';
          reject.addEventListener('click', () => act(row.id, 'reject'));
          item.append(publish, reject);
          list.appendChild(item);
        }
      } catch (error) { status.textContent = 'Market outbox unavailable: ' + error.message; }
    }
    async function act(actionId, op) {
      status.textContent = op === 'publish' ? 'Creating the Stripe link…' : 'Rejecting the draft…';
      const response = await fetch('/api/eyehold/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(op === 'publish' ? { op, actionId, confirmed: true } : { op, actionId })
      });
      const body = await response.json();
      if (!response.ok) { status.textContent = 'Not sent: ' + (body.error || 'refused'); return; }
      status.textContent = op === 'publish' && body.action && body.action.receipt ? 'Link created: ' + body.action.receipt.url : 'Draft rejected. Nothing was published.';
      load();
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
