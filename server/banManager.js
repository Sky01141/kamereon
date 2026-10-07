// Bans are checked server-side by persistent client key AND salted IP hash (never localStorage alone).
const { state, save } = require('./store');
const check = (key, ip) => { const n = Date.now(); return state.bans.find(b => !b.revoked && (!b.until || b.until > n) && (b.key === key || b.ip === ip)); };
function add(b) { const r = { id: Date.now().toString(36), t: Date.now(), ...b }; state.bans.push(r); save(); return r; }
function revoke(id) { const b = state.bans.find(x => x.id === id); if (b) { b.revoked = true; save(); } }
const active = () => state.bans.filter(b => !b.revoked && (!b.until || b.until > Date.now()));
module.exports = { check, add, revoke, active };
