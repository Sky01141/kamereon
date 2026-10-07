const { state, save } = require('./store');
const REASONS = ['Cheating', 'Harassment', 'Exploit', 'Spam', 'Inappropriate Name', 'Other'];
function add(from, target, reason) {
  if (!REASONS.includes(reason)) return false;
  if (state.reports.filter(r => r.from === from.key && r.status === 'open').length >= 5) return false; // anti-spam
  state.reports.unshift({ id: Date.now().toString(36), t: Date.now(), from: from.key, fromName: from.name, target: target.id, targetKey: target.key, targetName: target.name, reason, status: 'open' });
  state.reports.length = Math.min(state.reports.length, 300); save(); return true;
}
function setStatus(id, status) { const r = state.reports.find(x => x.id === id); if (r) { r.status = status; save(); } }
module.exports = { REASONS, add, setStatus };
