// Owner UI. Entry = Shift+O+S, but ALL authority is enforced server-side on owner:* events.
const OW = { on: false, snap: null, tab: 'Dashboard' }, esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), ob = () => document.getElementById('owner-box');
const pressed = new Set(); addEventListener('keydown', e => { pressed.add(e.code); if (e.shiftKey && pressed.has('KeyO') && pressed.has('KeyS')) { pressed.clear(); openOwner(); } }); addEventListener('keyup', e => pressed.delete(e.code)); addEventListener('blur', () => pressed.clear());
function openOwner() { document.getElementById('ov-owner').classList.add('on'); OW.on ? renderOwner() : loginUI(); }
function loginUI() { ob().innerHTML = '<h2>OWNER LOGIN</h2><input id="o-id" placeholder="Owner ID" autocomplete="off"><input id="o-sec" type="password" placeholder="Secret Token"><div class="row"><button id="o-go">LOGIN</button><button id="o-x">CLOSE</button></div><div id="o-err"></div>';
  document.getElementById('o-x').onclick = closeOwner; document.getElementById('o-go').onclick = () => socket.emit('owner:login', { id: document.getElementById('o-id').value, secret: document.getElementById('o-sec').value }, ok => { if (ok) { OW.on = true; renderOwner(); } else document.getElementById('o-err').textContent = 'ACCESS DENIED'; }); }
function closeOwner() { document.getElementById('ov-owner').classList.remove('on'); }
socket.on('owner:snapshot', s => { OW.snap = s; if (OW.on && document.getElementById('ov-owner').classList.contains('on') && !typingOwner()) renderOwner(); });
const typingOwner = () => /INPUT|SELECT/.test(document.activeElement.tagName) && ob().contains(document.activeElement);
function ownerAct(d, conf) { if (conf && !confirm('Confirm: ' + conf)) return; socket.emit('owner:act', d, r => { toast(r && r.err ? 'ERR: ' + r.err : 'OK'); }); }
const tm = t => new Date(t).toTimeString().slice(0, 8);
function renderOwner() {
  const s = OW.snap; if (!s) { ob().innerHTML = '<p>Loading...</p>'; return; } const T = ['Dashboard', 'Players', 'Rooms', 'Reports', 'Bans', 'Announce', 'Log'];
  const tabs = `<div class="tabs">${T.map(t => `<button data-tab="${t}" class="${t === OW.tab ? 'on' : ''}">${t}</button>`).join('')}<button id="o-x">CLOSE</button></div>`; let h = '';
  const st = s.stats;
  if (OW.tab === 'Dashboard') h = `<h2>OWNER CONTROL PANEL</h2><table>${[['SERVER', 'ONLINE'], ['PLAYERS', st.players], ['ROOMS', st.rooms], ['ACTIVE MATCHES', st.matches], ['BANNED', st.banned], ['SERVER LOAD', st.cpu], ['MEMORY MB', st.mem], ['CONNECTIONS', st.conns], ['ERRORS', st.errors], ['DISCONNECTS', st.disc + '/' + st.conn], ['UPTIME s', st.up]].map(r => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</table>`;
  if (OW.tab === 'Players') h = `<table><tr><th>Name</th><th>Room</th><th>Conn</th><th>Ping</th><th>State</th><th>Role</th><th>Last</th><th>Actions</th></tr>${s.players.map(p => `<tr><td title="${esc(p.id)}">${esc(p.n)}</td><td>${esc(p.room || '-')}</td><td>${esc(p.ip)} ${tm(p.t)}</td><td>${p.ping}</td><td>${p.st}</td><td>${p.role}</td><td>${tm(p.last)}</td><td><button data-a="warn" data-id="${esc(p.id)}">WARN</button><button data-a="kick" data-id="${esc(p.id)}">KICK</button><button data-a="tban" data-id="${esc(p.id)}">TEMP</button><button data-a="pban" data-id="${esc(p.id)}">PERM</button><button data-a="hist" data-id="${esc(p.id)}">LOG</button></td></tr>`).join('')}</table>`;
  if (OW.tab === 'Rooms') h = `<table><tr><th>ROOM</th><th>PLAYERS</th><th>STATUS</th><th>MAP</th><th>ROUND</th><th>TIMER</th><th></th></tr>${s.rooms.map(r => `<tr><td title="${esc(r.names.join(', '))}">${esc(r.code)}</td><td>${r.n}/${r.max}</td><td>${r.phase}</td><td>${r.map}</td><td>${r.round}/${r.rounds}</td><td>${Math.ceil(r.tl / 1e3)}s</td><td><button data-a="rs" data-code="${esc(r.code)}">FORCE START</button><button data-a="re" data-code="${esc(r.code)}">FORCE END</button><button data-a="rc" data-code="${esc(r.code)}">CLOSE</button></td></tr>`).join('')}</table>`;
  if (OW.tab === 'Reports') h = `<table><tr><th>Time</th><th>From</th><th>Target</th><th>Reason</th><th>Status</th><th></th></tr>${s.reports.map(r => `<tr><td>${tm(r.t)}</td><td>${esc(r.fromName)}</td><td>${esc(r.targetName)}</td><td>${esc(r.reason)}</td><td>${r.status}</td><td><button data-a="rv" data-rid="${r.id}">REVIEWED</button><button data-a="rd" data-rid="${r.id}">DISMISS</button><button data-a="kick" data-id="${esc(r.target)}">KICK</button><button data-a="tban" data-id="${esc(r.target)}">BAN</button></td></tr>`).join('')}</table>`;
  if (OW.tab === 'Bans') h = `<table><tr><th>Player</th><th>Reason</th><th>Until</th><th>By</th><th></th></tr>${s.bans.map(b => `<tr><td>${esc(b.name)}</td><td>${esc(b.reason)}</td><td>${b.until ? new Date(b.until).toLocaleString() : 'PERMANENT'}</td><td>${esc(b.owner)}</td><td><button data-a="unban" data-bid="${b.id}">UNBAN</button></td></tr>`).join('')}</table>`;
  if (OW.tab === 'Announce') h = `<div class="row"><select id="a-type"><option>UPDATE</option><option>EVENT</option><option>NOTICE</option></select><input id="a-title" placeholder="Title"><input id="a-ver" placeholder="Version" size="8"><input id="a-pri" type="number" value="1" min="0" max="9" style="width:60px"></div><textarea id="a-body" placeholder="Content" rows="3" style="width:100%"></textarea><button data-a="annadd">POST</button><table>${s.ann.map(a => `<tr><td>[${a.type}] ${esc(a.title)}</td><td>${esc(a.version)}</td><td><button data-a="anndel" data-aid="${a.id}">DELETE</button></td></tr>`).join('')}</table>`;
  if (OW.tab === 'Log') h = `<table>${s.log.map(l => `<tr><td>${tm(l.t)}</td><td>${esc(l.owner)}</td><td>${esc(l.action)}</td><td>${esc(l.target)}</td><td>${esc(l.detail)}</td></tr>`).join('')}</table>`;
  ob().innerHTML = tabs + h; ob().style.minWidth = 'min(88vw,800px)';
}
document.addEventListener('click', e => {
  if (!ob().contains(e.target)) return; const b = e.target.closest('button'); if (!b) return; if (b.id === 'o-x') return closeOwner(); if (b.dataset.tab) { OW.tab = b.dataset.tab; return renderOwner(); }
  const d = b.dataset, s = OW.snap, pl = s && s.players.find(p => p.id === d.id), nm = pl ? pl.n : '';
  const why = () => (prompt('Reason (required):') || '').trim();
  switch (d.a) {
    case 'warn': { const r = why(); if (r) ownerAct({ type: 'warn', id: d.id, reason: r }); break; }
    case 'kick': ownerAct({ type: 'kick', id: d.id, reason: 'Kicked by Owner' }, 'KICK ' + nm); break;
    case 'tban': { const o = { '10m': 6e5, '1h': 36e5, '1d': 864e5, '7d': 6048e5, '30d': 2592e6 }, k = prompt('Duration: 10m / 1h / 1d / 7d / 30d'); if (!o[k]) break; const r = why(); if (r) ownerAct({ type: 'ban', id: d.id, ms: o[k], reason: r }, `TEMP BAN ${nm} ${k}`); break; }
    case 'pban': { const r = why(); if (r) ownerAct({ type: 'ban', id: d.id, ms: 0, reason: r }, 'PERMANENT BAN ' + nm); break; }
    case 'hist': alert((pl?.hist || []).map(h => tm(h.t) + ' ' + h.e).join('\n') || 'none'); break;
    case 'rs': ownerAct({ type: 'roomStart', code: d.code }, 'FORCE START ' + d.code); break;
    case 're': ownerAct({ type: 'roomEnd', code: d.code }, 'FORCE END ' + d.code); break;
    case 'rc': ownerAct({ type: 'roomClose', code: d.code }, 'CLOSE ROOM ' + d.code); break;
    case 'rv': ownerAct({ type: 'report', rid: d.rid, status: 'reviewed' }); break; case 'rd': ownerAct({ type: 'report', rid: d.rid, status: 'dismissed' }); break;
    case 'unban': ownerAct({ type: 'unban', bid: d.bid }, 'UNBAN'); break;
    case 'annadd': ownerAct({ type: 'annAdd', annType: 0, ...{ type: 'annAdd' }, title: document.getElementById('a-title').value, content: document.getElementById('a-body').value, version: document.getElementById('a-ver').value, priority: document.getElementById('a-pri').value, atype: document.getElementById('a-type').value }); break;
    case 'anndel': ownerAct({ type: 'annDel', aid: d.aid }, 'DELETE announcement'); break;
  }
});
