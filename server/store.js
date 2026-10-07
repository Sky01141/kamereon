// Tiny JSON persistence. Swap for PostgreSQL/MongoDB by replacing this file.
const fs = require('fs'), path = require('path');
const F = path.join(__dirname, '..', 'data', 'state.json');
let state = { bans: [], reports: [], ownerLog: [], announcements: [{ id: 1, type: 'NOTICE', title: 'Welcome to MIMICRY', content: 'Paint, pose, hide.', version: '0.1.0', priority: 1, t: Date.now() }] };
try { state = { ...state, ...JSON.parse(fs.readFileSync(F, 'utf8')) }; } catch {}
let tm;
function save() { clearTimeout(tm); tm = setTimeout(() => { try { fs.mkdirSync(path.dirname(F), { recursive: true }); fs.writeFileSync(F, JSON.stringify(state)); } catch (e) { console.error(e.message); } }, 500); }
module.exports = { state, save };
