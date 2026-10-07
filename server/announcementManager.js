const { state, save } = require('./store');
const list = () => state.announcements.slice().sort((a, b) => b.priority - a.priority || b.t - a.t).slice(0, 20);
function add(a) {
  const r = { id: Date.now(), t: Date.now(), type: ['UPDATE', 'EVENT', 'NOTICE'].includes(a.atype) ? a.atype : 'NOTICE',
    title: String(a.title || '').slice(0, 80), content: String(a.content || '').slice(0, 1000), version: String(a.version || '').slice(0, 16), priority: Math.max(0, Math.min(9, +a.priority || 0)) };
  if (!r.title) return null; state.announcements.push(r); save(); return r;
}
function remove(id) { state.announcements = state.announcements.filter(a => a.id !== id); save(); }
module.exports = { list, add, remove };
