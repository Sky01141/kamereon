// Player registry. Server-side validation of names/colours/paint.
const players = new Map();
const HEX = /^#[0-9a-f]{6}$/i;
const clean = n => String(n || '').replace(/[^\p{L}\p{N}_\- ]/gu, '').trim().slice(0, 16);
function add(id, key, ip) {
  const p = { id, key, ip, name: 'Player_' + Math.floor(1000 + Math.random() * 9000), color: '#39ff88', style: 'circle', room: null, t: Date.now(), last: Date.now(), ping: 0, hist: [],
    x: 800, y: 450, role: '', ready: false, grid: null, pose: 0, found: false, score: 0, tot: 0, cd: 0, lm: 0 };
  players.set(id, p); hist(p, 'connect'); return p;
}
function hist(p, e) { p.hist.unshift({ t: Date.now(), e }); p.hist.length = Math.min(p.hist.length, 30); }
function defGrid(p) { const cut = p.style === 'circle' ? [0, 1, 8, 6, 7, 15, 48, 56, 57, 55, 62, 63] : []; return Array.from({ length: 64 }, (_, i) => cut.includes(i) ? null : p.color); }
const validGrid = g => Array.isArray(g) && g.length === 64 && g.every(c => c === null || (typeof c === 'string' && HEX.test(c)));
module.exports = { players, add, hist, clean, HEX, defGrid, validGrid, remove: id => players.delete(id), get: id => players.get(id) };
