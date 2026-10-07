// Rooms, roles, phases (lobby > hide > search > result), server-authoritative movement/scan/score.
const MAP = require('../public/js/map.js'), P = require('./playerManager');
let io; const rooms = new Map(); let matchSeq = 1;
const T = { hide: 40e3, search: 90e3, result: 8e3 }, SPEED = 280;
const cl = (v, a, b) => Math.min(b, Math.max(a, Math.round(+v) || a));
const sys = (r, m) => io.to(r.code).emit('chat', { sys: 1, m });
const mem = r => [...r.players.values()];
const hiders = r => mem(r).filter(p => p.role === 'hider');
function init(i) { io = i; setInterval(() => rooms.forEach(tick), 100); }
function create(host, o = {}) {
  let c; do { c = Math.random().toString(36).slice(2, 7).toUpperCase(); } while (rooms.has(c));
  const r = { code: c, host: host.id, max: cl(o.max, 2, 10), rounds: cl(o.rounds, 1, 10), round: 0, phase: 'lobby', end: 0, players: new Map(), match: 0, map: 'CITY', quick: !!o.quick, res: null, final: false };
  rooms.set(c, r); return r;
}
function join(r, p) {
  if (!r) return 'Room not found'; if (r.players.size >= r.max) return 'Room is full'; if (r.phase !== 'lobby') return 'Match in progress';
  leave(p); r.players.set(p.id, p); p.room = r.code; p.ready = false; p.tot = 0; io.in(p.id).socketsJoin(r.code);
  P.hist(p, 'join ' + r.code); sys(r, `${p.name} joined`); return null;
}
function leave(p) {
  const r = rooms.get(p.room); if (!r) return; r.players.delete(p.id); io.in(p.id).socketsLeave(r.code); P.hist(p, 'leave ' + r.code); p.room = null; p.role = '';
  if (!r.players.size) return void rooms.delete(r.code);
  if (r.host === p.id) r.host = mem(r)[0].id; sys(r, `${p.name} left`);
  if (r.phase !== 'lobby' && r.players.size < 2) { sys(r, 'Not enough players'); toLobby(r); }
}
function quick(p) { let r = [...rooms.values()].find(x => x.quick && x.phase === 'lobby' && x.players.size < x.max); return join(r || create(p, { quick: 1, max: 10, rounds: 3 }), p); }
function startRound(r) {
  const ps = mem(r).sort(() => Math.random() - .5), n = ps.length, ns = n >= 7 ? 2 : 1;
  r.round++; r.match = matchSeq++; r.phase = 'hide'; r.end = Date.now() + T.hide; r.res = null;
  ps.forEach((p, i) => { p.role = i < ns ? 'seeker' : 'hider'; p.found = false; p.score = 0; p.cd = 0; p.pose = 0; p.grid = P.defGrid(p); p.ready = false;
    p.x = p.role === 'seeker' ? 800 : 60 + Math.random() * 1480; p.y = p.role === 'seeker' ? 440 : 60 + Math.random() * 780; P.hist(p, 'role ' + p.role); });
  sys(r, `Round ${r.round}/${r.rounds} - Hide Phase Started (match #${r.match})`);
  hiders(r).forEach(h => hiders(r).forEach(o => io.to(h.id).emit('paint', { id: o.id, grid: o.grid })));
}
function toLobby(r) { r.phase = 'lobby'; r.round = 0; r.final = false; mem(r).forEach(p => { p.role = ''; p.ready = false; p.tot = 0; }); }
function finish(r, now) {
  hiders(r).forEach(h => { if (!h.found) h.tot += h.score; });
  r.res = mem(r).map(p => ({ n: p.name, role: p.role, camo: p.role === 'hider' ? p.score : null, found: p.found, tot: p.tot })).sort((a, b) => b.tot - a.tot);
  r.final = r.round >= r.rounds; r.phase = 'result'; r.end = now + T.result; sys(r, r.final ? 'Final Result' : 'Round Result');
}
function tick(r) {
  const now = Date.now();
  if (r.phase === 'hide' && now >= r.end) {
    hiders(r).forEach(h => { h.score = MAP.camo(h.grid, h.pose, h.x, h.y); });
    r.phase = 'search'; r.end = now + T.search; sys(r, 'Search Phase Started');
    hiders(r).forEach(h => io.to(r.code).emit('paint', { id: h.id, grid: h.grid }));
  } else if (r.phase === 'search') { const h = hiders(r); if (!h.length || h.every(p => p.found) || now >= r.end) finish(r, now); }
  else if (r.phase === 'result' && now >= r.end) r.final ? toLobby(r) : startRound(r);
  emit(r, now);
}
function emit(r, now) {
  const ps = mem(r);
  ps.forEach(me => {
    const see = o => r.phase === 'lobby' ? false : o.id === me.id || (r.phase === 'hide' ? me.role === 'hider' && o.role === 'hider' : true);
    io.to(me.id).emit('state', { c: r.code, ph: r.phase, tl: Math.max(0, r.end - now), rd: r.round, rs: r.rounds, me: me.id, host: r.host, fin: r.final, res: r.res, cd: Math.max(0, me.cd - now), rt: r.phase === 'result' ? 1 : 0,
      pl: ps.map(o => { const v = see(o); return { id: o.id, n: o.name, col: o.color, role: o.role, rdy: o.ready, f: o.found, tot: o.tot, x: v ? Math.round(o.x) : undefined, y: v ? Math.round(o.y) : undefined, po: v ? o.pose : undefined }; }) });
  });
}
function move(p, x, y) {
  const r = rooms.get(p.room); if (!r) return; const now = Date.now(), dt = Math.min(.25, (now - (p.lm || now)) / 1e3); p.lm = now;
  if (!((p.role === 'hider' && r.phase === 'hide') || (p.role === 'seeker' && r.phase === 'search')) || !isFinite(x) || !isFinite(y)) return;
  x = Math.min(MAP.W - 16, Math.max(16, x)); y = Math.min(MAP.H - 16, Math.max(16, y));
  const d = Math.hypot(x - p.x, y - p.y), max = SPEED * dt * 1.6 + 6;
  if (d > max) { x = p.x + (x - p.x) * max / d; y = p.y + (y - p.y) * max / d; }
  p.x = x; p.y = y;
}
function paint(p, grid) { const r = rooms.get(p.room); if (!r || r.phase !== 'hide' || p.role !== 'hider' || !P.validGrid(grid)) return; p.grid = grid; hiders(r).forEach(h => h.id !== p.id && io.to(h.id).emit('paint', { id: p.id, grid })); }
function pose(p, i) { const r = rooms.get(p.room); if (r && r.phase === 'hide' && p.role === 'hider' && i >= 0 && i < MAP.POSES.length) p.pose = i | 0; }
function scan(p, x, y) {
  const r = rooms.get(p.room), now = Date.now(); if (!r || r.phase !== 'search' || p.role !== 'seeker' || now < p.cd || !isFinite(x) || !isFinite(y)) return;
  if (Math.hypot(p.x - x, p.y - y) > 170) return; P.hist(p, 'scan');
  const t = hiders(r).find(h => !h.found && Math.hypot(h.x - x, h.y - y) <= 28);
  if (t) { t.found = true; p.tot += 100; sys(r, `${p.name} found ${t.name}!`); io.to(p.id).emit('scan:result', { ok: 1, x, y }); }
  else { p.cd = now + 4000; io.to(p.id).emit('scan:result', { ok: 0, x, y }); }
}
function ready(p, v) { const r = rooms.get(p.room); if (!r || r.phase !== 'lobby') return; p.ready = !!v; P.hist(p, 'ready ' + p.ready); if (r.players.size >= 2 && mem(r).every(q => q.ready)) startRound(r); }
const forceStart = r => { if (r.phase === 'lobby' && r.players.size >= 2) { startRound(r); return true; } };
const forceEnd = r => { sys(r, 'Match ended by Owner'); toLobby(r); };
function close(r) { io.to(r.code).emit('kicked', 'Room closed by Owner'); mem(r).forEach(p => { io.in(p.id).socketsLeave(r.code); p.room = null; p.role = ''; }); rooms.delete(r.code); }
const list = () => [...rooms.values()].map(r => ({ code: r.code, n: r.players.size, max: r.max, phase: r.phase, round: r.round, rounds: r.rounds, map: r.map, match: r.match, tl: Math.max(0, r.end - Date.now()), names: mem(r).map(p => p.name) }));
module.exports = { init, rooms, create, join, leave, quick, ready, move, paint, pose, scan, forceStart, forceEnd, close, list, sys };
