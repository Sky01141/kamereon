const crypto = require('crypto');
const P = require('./playerManager'), R = require('./roomManager'), B = require('./banManager'), O = require('./ownerManager'), A = require('./announcementManager'), RP = require('./reportManager');
function attachGameServer(io) {
  R.init(io); O.init(io);
  io.on('connection', socket => {
    const key = String(socket.handshake.auth?.key || '');
    if (!/^[\w-]{8,64}$/.test(key)) return void socket.disconnect(true);
    const ip = crypto.createHash('sha256').update((process.env.IP_HASH_SALT || 'dev') + socket.handshake.address).digest('hex').slice(0, 16);
    const ban = B.check(key, ip);
    if (ban) { socket.emit('banned', { reason: ban.reason, until: ban.until }); return void socket.disconnect(true); }
    O.stats.conn++; const p = P.add(socket.id, key, ip); let lastChat = 0;
    socket.emit('server:connected', { id: socket.id });
    const on = (ev, fn) => socket.on(ev, (...a) => { try { p.last = Date.now(); fn(...a); } catch (e) { O.stats.errors++; console.error(ev, e.message); } });
    const err = m => socket.emit('err', m);
    on('hello', d => { if (p.room) return; p.name = P.clean(d?.name) || p.name; if (P.HEX.test(d?.color)) p.color = d.color; p.style = d?.style === 'square' ? 'square' : 'circle'; });
    on('quick', () => { const e = R.quick(p); e ? err(e) : socket.emit('room:joined'); });
    on('room:create', d => { const r = R.create(p, d); const e = R.join(r, p); e ? err(e) : socket.emit('room:joined'); });
    on('room:join', d => { const e = R.join(R.rooms.get(String(d?.code || '').toUpperCase().slice(0, 5)), p); e ? err(e) : socket.emit('room:joined'); });
    on('room:leave', () => R.leave(p));
    on('ready', v => R.ready(p, v));
    on('move', d => R.move(p, +d?.x, +d?.y));
    on('paint', g => R.paint(p, g));
    on('pose', i => R.pose(p, i));
    on('scan', d => R.scan(p, +d?.x, +d?.y));
    on('latency', ms => { p.ping = Math.min(9999, Math.max(0, +ms || 0)); });
    on('chat', t => { const now = Date.now(); if (!p.room || now - lastChat < 500) return; lastChat = now; t = String(t || '').slice(0, 200).trim(); if (t) io.to(p.room).emit('chat', { n: p.name, m: t, o: O.is(socket) ? 1 : 0 }); });
    on('report', d => { const t = P.get(d?.id); if (!t || t.id === p.id) return err('Invalid target'); err(RP.add(p, t, d.reason) ? 'Report sent' : 'Report failed'); });
    on('ann:list', cb => typeof cb === 'function' && cb(A.list()));
    on('owner:login', (d, cb) => typeof cb === 'function' && cb(O.login(socket, d)));
    on('owner:act', (d, cb) => typeof cb === 'function' && cb(O.act(socket, d)));
    socket.on('disconnect', () => { O.stats.disc++; R.leave(p); P.hist(p, 'disconnect'); P.remove(socket.id); });
  });
}
module.exports = { attachGameServer };
