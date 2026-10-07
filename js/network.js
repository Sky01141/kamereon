const KEY = (() => { let k = localStorage.getItem('mm.key'); if (!k) { k = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)); localStorage.setItem('mm.key', k); } return k; })();
const socket = io({ auth: { key: KEY }, reconnectionDelay: 1000 });
function log(m) { const el = document.getElementById('log'), d = document.createElement('div'); d.textContent = `[${new Date().toTimeString().slice(0, 8)}] ${m}`; el.append(d); while (el.children.length > S.logMax) el.firstChild.remove(); el.scrollTop = 1e9; }
function toast(m) { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2500); }
setInterval(() => { if (socket.connected) { const t = performance.now(); socket.volatile.emit('latency', 0); socket.emit('ann:list', () => socket.emit('latency', Math.round(performance.now() - t))); } }, 5000);
