const cv = document.getElementById('cv'), cx = cv.getContext('2d');
const G = { st: null, me: { x: 800, y: 450 }, others: new Map(), paints: new Map(), keys: new Set(), mouse: { x: 0, y: 0 }, cam: { x: 0, y: 0 }, fx: [], lastRound: -1, scanMsg: '' };
const typing = () => /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
addEventListener('keydown', e => { if (typing()) return; G.keys.add(e.code);
  if (!G.st || G.st.ph === 'lobby') return;
  if (e.code === S.binds.pose && me()?.role === 'hider' && G.st.ph === 'hide') { e.preventDefault(); const p = ((me().po || 0) + 1) % MAP.POSES.length; setPose(p); }
  if (e.code === S.binds.scan) doScan(); if (e.code === S.binds.interact && me()?.role === 'hider') { document.getElementById('pcol').value = MAP.bgAt(G.me.x, G.me.y); } });
addEventListener('keyup', e => G.keys.delete(e.code));
const me = () => G.st && G.st.pl.find(p => p.id === G.st.me);
function setPose(i) { socket.emit('pose', i); const m = me(); if (m) m.po = i; document.querySelectorAll('#poses button').forEach((b, k) => b.classList.toggle('on', k === i)); }
function world(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (cv.width / r.width) + G.cam.x, y: (e.clientY - r.top) * (cv.height / r.height) + G.cam.y }; }
cv.onmousemove = e => G.mouse = world(e);
cv.onclick = e => { const w = world(e); G.mouse = w; const m = me(); if (m?.role === 'hider' && document.getElementById('ptool').value === 'world') document.getElementById('pcol').value = MAP.bgAt(w.x, w.y); else doScan(); };
function doScan() { const m = me(); if (m?.role === 'seeker' && G.st.ph === 'search' && !(G.st.cd > 0)) socket.emit('scan', { x: G.mouse.x, y: G.mouse.y }); }
socket.on('scan:result', r => { G.fx.push({ x: r.x, y: r.y, t: 0, ok: r.ok }); toast(r.ok ? 'FOUND!' : 'MISS - scan locked 4s'); });
socket.on('paint', d => G.paints.set(d.id, d.grid));
function initPoses() { const b = document.getElementById('poses'); b.innerHTML = ''; MAP.POSES.forEach((p, i) => { const e = document.createElement('button'); e.textContent = p.n; e.onclick = () => setPose(i); b.append(e); }); }
initPoses();
G.onState = st => {
  G.st = st; const m = me();
  if (st.rd !== G.lastRound || st.ph === 'hide' && G.lastPh !== 'hide') { G.lastRound = st.rd; if (m && m.x != null) { G.me.x = m.x; G.me.y = m.y; } PT.on = false; pSet(defGrid()); G.paints.clear(); }
  G.lastPh = st.ph; const hide = m?.role === 'hider' && st.ph === 'hide';
  if (hide && !PT.on) { setPose(0); document.querySelectorAll('#poses button')[0]?.classList.add('on'); }
  PT.on = hide; document.getElementById('paint').hidden = !hide;
  if (m && m.x != null && Math.hypot(m.x - G.me.x, m.y - G.me.y) > 80) { G.me.x = m.x; G.me.y = m.y; }
  st.pl.forEach(p => { if (p.x == null) return; let o = G.others.get(p.id); if (!o) G.others.set(p.id, o = { x: p.x, y: p.y }); o.tx = p.x; o.ty = p.y; });
  const tl = Math.ceil(st.tl / 1000), names = { hide: 'HIDE PHASE', search: 'SEARCH PHASE', result: st.fin ? 'FINAL RESULT' : 'ROUND RESULT' };
  document.getElementById('hud').innerHTML = `${names[st.ph] || ''} ${st.ph === 'result' ? '' : tl + 's'} | R${st.rd}/${st.rs} | ${m?.role === 'hider' ? 'HIDER' : 'SEEKER'}${m?.role === 'seeker' && st.cd > 0 ? ' | SCAN LOCKED' : ''}`;
};
function body(x, y, grid, pose, name, hl) {
  const s = MAP.POSES[pose || 0], w = MAP.SIZE * s.w, h = MAP.SIZE * s.h; cx.save(); cx.translate(x, y); if (s.tilt) cx.rotate(s.tilt);
  for (let i = 0; i < 64; i++) { if (!grid[i]) continue; cx.fillStyle = grid[i]; cx.fillRect(-w / 2 + i % 8 * w / 8, -h / 2 + Math.floor(i / 8) * h / 8, w / 8 + .6, h / 8 + .6); }
  cx.restore(); if (hl) { cx.strokeStyle = '#fff8'; cx.setLineDash([4, 4]); cx.strokeRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4); cx.setLineDash([]); }
  if (name) { cx.fillStyle = '#fff'; cx.font = '11px sans-serif'; cx.textAlign = 'center'; cx.fillText(name, x, y - 24); }
}
let last = performance.now(), sendAcc = 0;
function loop(t) {
  requestAnimationFrame(loop); const dt = Math.min(.05, (t - last) / 1e3); last = t; const st = G.st;
  if (!document.getElementById('game').classList.contains('on') || !st) return;
  cv.width = innerWidth; cv.height = innerHeight; const m = me(), canMove = m && ((m.role === 'hider' && st.ph === 'hide') || (m.role === 'seeker' && st.ph === 'search'));
  if (canMove && !typing()) { const k = G.keys, b = S.binds, sp = k.has(b.run) ? 280 : 170; let dx = (k.has(b.right) ? 1 : 0) - (k.has(b.left) ? 1 : 0), dy = (k.has(b.down) ? 1 : 0) - (k.has(b.up) ? 1 : 0);
    if (dx || dy) { const l = Math.hypot(dx, dy); G.me.x = Math.min(MAP.W - 16, Math.max(16, G.me.x + dx / l * sp * dt)); G.me.y = Math.min(MAP.H - 16, Math.max(16, G.me.y + dy / l * sp * dt)); } }
  sendAcc += dt; if (sendAcc > .066 && canMove) { sendAcc = 0; socket.volatile.emit('move', G.me); }
  G.cam.x = Math.min(Math.max(0, G.me.x - cv.width / 2), Math.max(0, MAP.W - cv.width)); G.cam.y = Math.min(Math.max(0, G.me.y - cv.height / 2), Math.max(0, MAP.H - cv.height));
  cx.fillStyle = '#05080c'; cx.fillRect(0, 0, cv.width, cv.height); cx.save(); cx.translate(-G.cam.x, -G.cam.y); MAP.draw(cx);
  st.pl.forEach(p => { if (p.x == null) return; const isMe = p.id === st.me; let x, y; if (isMe) { x = G.me.x; y = G.me.y; } else { const o = G.others.get(p.id); if (!o) return; o.x += (o.tx - o.x) * Math.min(1, dt * 12); o.y += (o.ty - o.y) * Math.min(1, dt * 12); x = o.x; y = o.y; }
    const g = p.role === 'seeker' ? Array(64).fill('#ff4d4d') : (isMe && PT.on ? PT.grid : G.paints.get(p.id)) || (isMe ? PT.grid : null); if (!g) return;
    body(x, y, g, p.role === 'seeker' ? 0 : isMe && PT.on ? me().po : p.po, (isMe || p.role === 'seeker' || p.f || st.ph === 'result') ? p.n + (p.f ? ' (found)' : '') : '', isMe && p.role === 'hider'); });
  G.fx = G.fx.filter(f => (f.t += dt) < .8); G.fx.forEach(f => { cx.strokeStyle = f.ok ? '#39ff88' : '#ff4d4d'; cx.lineWidth = 3; cx.beginPath(); cx.arc(f.x, f.y, 10 + f.t * 60, 0, 7); cx.stroke(); });
  cx.restore();
  if (m?.role === 'seeker' && st.ph === 'hide') { cx.fillStyle = '#000'; cx.fillRect(0, 0, cv.width, cv.height); cx.fillStyle = '#39ff88'; cx.font = '28px sans-serif'; cx.textAlign = 'center'; cx.fillText('HIDERS ARE HIDING... ' + Math.ceil(st.tl / 1e3), cv.width / 2, cv.height / 2); }
  if (S.cross && m?.role === 'seeker' && st.ph === 'search') { const r = cv.getBoundingClientRect(), mx = G.mouse.x - G.cam.x, my = G.mouse.y - G.cam.y; cx.strokeStyle = st.cd > 0 ? '#f55' : '#39ff88'; cx.beginPath(); cx.arc(mx, my, 14, 0, 7); cx.moveTo(mx - 20, my); cx.lineTo(mx + 20, my); cx.moveTo(mx, my - 20); cx.lineTo(mx, my + 20); cx.stroke(); }
  if (st.ph === 'result' && st.res) { cx.fillStyle = '#000c'; cx.fillRect(cv.width / 2 - 230, 70, 460, 40 + st.res.length * 26); cx.textAlign = 'left'; cx.font = '15px sans-serif'; st.res.forEach((r, i) => { cx.fillStyle = r.found ? '#f77' : '#fff'; cx.fillText(`${i + 1}. ${r.n} [${r.role}] ${r.camo != null ? 'CAMOUFLAGE ' + r.camo + '%' : ''} ${r.found ? 'FOUND' : ''}  total ${r.tot}`, cv.width / 2 - 215, 110 + i * 26); }); }
}
requestAnimationFrame(loop);
