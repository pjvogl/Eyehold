/* Venture board. Opening it only reads. Spend, graduation, and listings
 * happen from a button click.
 */
'use strict';
(function () {
  if (typeof document === 'undefined') return;
  const setup = () => {
    if (document.getElementById('eyehold-ventures')) return;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.textContent = 'VENTURES';
    toggle.setAttribute('aria-controls', 'eyehold-ventures');
    toggle.style.cssText = 'position:fixed;bottom:18px;right:250px;z-index:995;padding:9px 13px;border:1px solid #aa8d5c;border-radius:5px;background:#1b1719;color:#e7d8b8;font:14px VT323,monospace;cursor:pointer';
    const board = document.createElement('section');
    board.id = 'eyehold-ventures';
    board.hidden = true;
    board.setAttribute('aria-label', 'Eyehold ventures');
    board.style.cssText = 'position:fixed;bottom:57px;right:250px;z-index:995;box-sizing:border-box;width:min(440px,calc(100vw * var(--sn-unzoom,1) - 36px));max-height:calc(60vh * var(--sn-unzoom,1));overflow:auto;padding:14px;border:1px solid #aa8d5c;border-radius:6px;background:#171518;color:#e7d8b8;font:13px/1.5 VT323,monospace';
    const heading = document.createElement('h2');
    heading.textContent = 'VENTURES';
    heading.style.cssText = 'font:17px VT323,monospace;margin:0 0 8px';
    const pitch = document.createElement('p');
    pitch.textContent = 'The Manager and specialists look for real ways to earn money. Crowns follow verified net profit. Paper trades are practice points, not Crowns and not cash.';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = 'Nothing is spent or sent until you press a button.';
    const list = document.createElement('div');
    board.append(heading, pitch, status, list);
    document.body.append(toggle, board);
    toggle.addEventListener('click', () => {
      board.hidden = !board.hidden;
      toggle.setAttribute('aria-expanded', String(!board.hidden));
      if (!board.hidden) load();
    });
    function line(text) {
      const p = document.createElement('p');
      p.textContent = text;
      return p;
    }
    async function load() {
      list.replaceChildren();
      status.textContent = 'Loading ventures…';
      try {
        const response = await fetch('/api/eyehold/ventures', { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'unavailable');
        const cash = body.treasury ? body.treasury.availableCents : null;
        list.appendChild(line(cash == null ? 'Treasury unavailable.' : 'Treasury available: $' + (cash / 100).toFixed(2) + ' (earned plus owner top-ups, minus approved spends).'));
        list.appendChild(line('Etsy: not connected. Trader: paper only until you graduate a good record.'));
        const scores = body.scores || [];
        if (!scores.length) list.appendChild(line('No verified profit yet. Crowns stay at zero.'));
        for (const row of scores) {
          list.appendChild(line(row.agentId + ' · ' + row.ventureId + ' · ' + row.crowns + ' Crowns from verified net · ' + row.practicePoints + ' practice points (not Crowns)'));
        }
        for (const proposal of (body.ventures && body.ventures.proposals) || []) {
          const hold = document.createElement('button');
          hold.type = 'button';
          hold.textContent = 'APPROVE VENTURE TYPE';
          hold.style.cssText = 'display:block;margin:6px 0;font:14px VT323,monospace';
          hold.addEventListener('click', () => post({ op: 'approve-type', id: proposal.id, confirmed: true }));
          list.append(line(proposal.name + ' — proposed, not active'), hold);
        }
        for (const spend of (body.treasury && body.treasury.queue) || []) {
          const hold = document.createElement('button');
          hold.type = 'button';
          hold.textContent = 'APPROVE SPEND';
          hold.style.cssText = 'display:block;margin:6px 0;font:14px VT323,monospace';
          hold.addEventListener('click', () => post({ op: 'approve-spend', id: spend.id, confirmed: true }));
          list.append(line(spend.agentId + ' wants $' + (spend.cents / 100).toFixed(2) + ' for ' + spend.kind), hold);
        }
        const agent = document.createElement('input');
        agent.type = 'text';
        agent.placeholder = 'trader agent id';
        agent.setAttribute('aria-label', 'Trader agent id');
        agent.style.cssText = 'font:14px VT323,monospace;margin-top:8px';
        const graduate = document.createElement('button');
        graduate.type = 'button';
        graduate.textContent = 'GRADUATE TRADER';
        graduate.style.cssText = 'display:block;margin-top:6px;font:14px VT323,monospace';
        graduate.addEventListener('click', () => post({ op: 'graduate', agentId: agent.value, confirmed: true }));
        list.append(agent, graduate);
        status.textContent = 'Loaded. No spend, listing, or trade was sent.';
      } catch (error) { status.textContent = 'Ventures unavailable: ' + error.message; }
    }
    async function post(body) {
      status.textContent = 'Sending the owner decision…';
      const response = await fetch('/api/eyehold/ventures', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json();
      status.textContent = response.ok ? 'Owner decision recorded.' : 'Not done: ' + (payload.error || 'refused');
      if (response.ok) load();
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
