// Owner auth + actions. EVERY owner action is re-authorised here; the client key combo is only a UI entrance.
const crypto = require('crypto'), os = require('os');
const { state, save } = require('./store');
const P = require('./playerManager'), R = require('./roomManager'), B = require('./banManager'), A = require('./announcementManager'), RP = require('./reportManager');
let io; const owners = new Set(), tries = new Map();
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const stats = { errors: 0, disc: 0, conn: 0 };
const is = s => owners.has(s.id) && s.data.owner === true;
function login(s, d) {
  const H = process.env.OWNER_SECRET_HASH, I = process.env.OWNER_ID, n = (tries.get(s.id) || 0) + 1; tries.set(s.id, n);
  if (!H || !I || n > 5) return false;
  try { const ok = String(d?.id) === I && crypto.timingSafeEqual(sha(d?.secret), Buffer.from(H, 'hex')); if (ok) { owners.add(s.id); s.data.owner = true; log('LOGIN', s.id, ''); } return ok; } catch { return false; }
}
function log(action, target, detail) { state.ownerLog.unshift({ t: Date.now(), owner: process.env.OWNER_ID || '?', action, target: String(target), detail: String(detail || '') }); state.ownerLog.length = Math.min(state.ownerLog.length, 500); save(); }
function snapshot() {
  const rooms = R.list();
  return { stats: { players: P.players.size, rooms: rooms.length, matches: rooms.filter(r => r.phase !== 'lobby').length, banned: B.active().length, cpu: os.loadavg()[0].toFixed(2), mem: Math.round(process.memoryUsage().rss / 1048576), conns: io.engine.clientsCount, errors: stats.errors, disc: stats.disc, conn: stats.conn, up: Math.round(process.uptime()) },
    players: [...P.players.values()].map(p => ({ id: p.id, n: p.name, room: p.room, ip: p.ip.slice(0, 8), t: p.t, ping: p.ping, role: p.role, last: p.last, st: p.room ? 'IN ROOM' : 'MENU', hist: p.hist.slice(0, 10) })),
    rooms, reports: state.reports.slice(0, 50), bans: B.active(), ann: A.list(), log: state.ownerLog.slice(0, 50) };
}
function act(s, d) {
  if (!is(s)) return { err: 'forbidden' }; d = d || {}; const p = P.get(d.id), room = R.rooms.get(d.code), reason = String(d.reason || '').slice(0, 200);
  switch (d.type) {
    case 'warn': if (!p) break; io.to(p.id).emit('warn', reason || 'Warning'); log('WARN', p.name, reason); return {};
    case 'kick': if (!p) break; R.leave(p); io.to(p.id).emit('kicked', reason || 'Kicked by Owner'); log('KICK', p.name, reason); return {};
    case 'ban': { if (!p || !reason) return { err: 'reason required' }; const ms = +d.ms || 0, b = B.add({ key: p.key, ip: p.ip, name: p.name, until: ms ? Date.now() + ms : 0, reason, owner: process.env.OWNER_ID });
      log(ms ? 'TEMP BAN' : 'PERM BAN', p.name, reason); R.leave(p); io.to(p.id).emit('banned', { reason, until: b.until }); io.in(p.id).disconnectSockets(true); return {}; }
    case 'unban': B.revoke(String(d.bid)); log('UNBAN', d.bid, ''); return {};
    case 'roomClose': if (!room) break; R.close(room); log('ROOM CLOSE', d.code, ''); return {};
    case 'roomStart': if (!room || !R.forceStart(room)) break; log('FORCE START', d.code, ''); return {};
    case 'roomEnd': if (!room) break; R.forceEnd(room); log('FORCE END', d.code, ''); return {};
    case 'annAdd': { const a = A.add(d); if (!a) break; log('ANNOUNCEMENT CREATE', a.title, ''); return {}; }
    case 'annDel': A.remove(+d.aid); log('ANNOUNCEMENT DELETE', d.aid, ''); return {};
    case 'report': { RP.setStatus(String(d.rid), d.status === 'dismissed' ? 'dismissed' : 'reviewed'); log('REPORT ' + d.status, d.rid, ''); return {}; }
    case 'say': if (p || room) { R.sys(room || R.rooms.get(P.get(s.id)?.room) || { code: '' }, '[OWNER] ' + reason); } return {};
  }
  return { err: 'bad request' };
}
module.exports = { init: i => { io = i; setInterval(() => { tries.clear(); }, 6e4); setInterval(() => { for (const id of owners) { const s = io.sockets.sockets.get(id); s ? s.emit('owner:snapshot', snapshot()) : owners.delete(id); } }, 2000); }, is, login, act, snapshot, stats, owners };
