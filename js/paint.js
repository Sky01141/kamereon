// 8x8 paint grid (null = transparent so silhouette matters).
const PT = { grid: Array(64).fill('#39ff88'), undo: [], redo: [], on: false };
const pc = document.getElementById('pc'), px = pc.getContext('2d'), $p = id => document.getElementById(id);
function pRender() { px.clearRect(0, 0, 160, 160); for (let i = 0; i < 64; i++) { const x = i % 8 * 20, y = Math.floor(i / 8) * 20; px.fillStyle = (i % 8 + Math.floor(i / 8)) % 2 ? '#222' : '#2d2d2d'; px.fillRect(x, y, 20, 20); if (PT.grid[i]) { px.fillStyle = PT.grid[i]; px.fillRect(x, y, 20, 20); } } }
let sendT; function pSend() { pRender(); clearTimeout(sendT); sendT = setTimeout(() => socket.emit('paint', PT.grid), 150); }
function pPush() { PT.undo.push(PT.grid.slice()); if (PT.undo.length > 30) PT.undo.shift(); PT.redo = []; }
function pSet(g) { PT.grid = g.slice(); PT.undo = []; PT.redo = []; pRender(); }
const hex = a => '#' + a.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const rgbv = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function mix(a, b, t) { if (!a) return b; const x = rgbv(a), y = rgbv(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); }
function paintAt(i) {
  const t = $p('ptool').value, s = +$p('psize').value, al = $p('pop').value / 100, col = $p('pcol').value, cx = i % 8, cy = Math.floor(i / 8);
  if (t === 'spoit') { if (PT.grid[i]) $p('pcol').value = PT.grid[i]; return; }
  for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) { const x = cx + dx, y = cy + dy; if (x > 7 || y > 7) continue; PT.grid[y * 8 + x] = t === 'erase' ? null : mix(PT.grid[y * 8 + x], col, al); }
}
let down = false;
const cell = e => { const r = pc.getBoundingClientRect(); return Math.min(7, Math.max(0, Math.floor((e.clientX - r.left) / r.width * 8))) + 8 * Math.min(7, Math.max(0, Math.floor((e.clientY - r.top) / r.height * 8))); };
pc.onpointerdown = e => { if (!PT.on || $p('ptool').value === 'world') return; down = true; pPush(); paintAt(cell(e)); pSend(); };
pc.onpointermove = e => { if (down) { paintAt(cell(e)); pSend(); } };
addEventListener('pointerup', () => down = false);
const fillAll = f => { pPush(); PT.grid = PT.grid.map((c, i) => c === null ? null : f(i)); pSend(); };
$p('pundo').onclick = () => { if (PT.undo.length) { PT.redo.push(PT.grid); PT.grid = PT.undo.pop(); pSend(); } };
$p('predo').onclick = () => { if (PT.redo.length) { PT.undo.push(PT.grid); PT.grid = PT.redo.pop(); pSend(); } };
$p('pclear').onclick = () => { pPush(); PT.grid = Array(64).fill(null); pSend(); };
$p('pfill').onclick = () => fillAll(() => $p('pcol').value);
$p('pstripe').onclick = () => fillAll(i => Math.floor(i / 8) % 2 ? $p('pcol2').value : $p('pcol').value);
$p('pgrad').onclick = () => fillAll(i => mix($p('pcol').value, $p('pcol2').value, (i % 8) / 7));

function defGrid() { let pd = {}; try { pd = JSON.parse(localStorage.getItem('mm.player')) || {}; } catch {} const cut = pd.style === 'square' ? [] : [0, 1, 8, 6, 7, 15, 48, 56, 57, 55, 62, 63]; return Array.from({ length: 64 }, (_, i) => cut.includes(i) ? null : (pd.color || '#39ff88')); }
