const $ = s => document.querySelector(s);
function show(id) { document.querySelectorAll('.scr').forEach(e => e.classList.toggle('on', e.id === id)); $('#chat').classList.toggle('on', id === 'lobby' || id === 'game'); }
const ov = (id, on = true) => $('#' + id).classList.toggle('on', on);
document.querySelectorAll('.x').forEach(b => b.onclick = () => b.closest('.ov').classList.remove('on'));
let PD = null, booted = false, failT;
try { PD = JSON.parse(localStorage.getItem('mm.player')); } catch {}
const hello = () => PD && socket.emit('hello', PD);
function fail() { if (booted) return; $('#lmsg').textContent = 'SERVER CONNECTION FAILED'; $('#retry').hidden = false; }
function boot() { $('#retry').hidden = true; $('#lmsg').textContent = 'SERVER CONNECTION...'; clearTimeout(failT); failT = setTimeout(fail, 12000); socket.connect(); }
$('#retry').onclick = boot;
socket.on('server:connected', () => { hello(); log('Connected to server'); if (booted) return toast('Reconnected'); booted = true; clearTimeout(failT); $('#lmsg').textContent = 'SERVER CONNECTED';
  setTimeout(() => { $('#lmsg').textContent = 'PLAYER DATA LOADING...'; setTimeout(() => show('title'), 600); }, 600); });
socket.on('connect_error', () => { log('Connection error'); fail(); });
socket.on('disconnect', () => { log('Disconnected'); if (booted) { toast('Disconnected - reconnecting...'); show('loading'); $('#lmsg').textContent = 'RECONNECTING...'; booted = false; clearTimeout(failT); failT = setTimeout(fail, 12000); } });
$('#b-start').onclick = () => show(PD ? 'modes' : 'setup'); $('#b-how').onclick = () => ov('ov-how'); $('#b-set').onclick = () => { buildSettings(); ov('ov-set'); };
$('#b-ann').onclick = () => { socket.emit('ann:list', l => { $('#ann-body').innerHTML = l.map(a => `<div><b>[${esc(a.type)}] ${esc(a.title)}</b> ${esc(a.version)}<br><small>${new Date(a.t).toLocaleDateString()}</small><p>${esc(a.content)}</p></div>`).join(''); ov('ov-ann'); }); };
$('#s-ok').onclick = () => { PD = { name: $('#s-name').value.trim() || 'Player', color: $('#s-col').value, style: $('#s-style').value }; localStorage.setItem('mm.player', JSON.stringify(PD)); hello(); show('modes'); };
$('#m-back').onclick = () => show('title');
$('#m-quick').onclick = () => socket.emit('quick');
$('#m-create').onclick = () => socket.emit('room:create', { max: +$('#m-max').value, rounds: +$('#m-rd').value });
$('#m-join').onclick = () => socket.emit('room:join', { code: $('#m-code').value.trim() });
$('#l-leave').onclick = () => { socket.emit('room:leave'); G.st = null; show('modes'); };
let rdy = false; $('#l-ready').onclick = () => { rdy = !rdy; socket.emit('ready', rdy); $('#l-ready').textContent = rdy ? 'UNREADY' : 'READY'; };
$('#l-rep').onclick = () => openReport();
function openReport() { const l = G.st ? G.st.pl.filter(p => p.id !== G.st.me) : []; $('#rp-t').innerHTML = l.map(p => `<option value="${esc(p.id)}">${esc(p.n)}</option>`).join(''); ov('ov-rep'); }
$('#rp-ok').onclick = () => { socket.emit('report', { id: $('#rp-t').value, reason: $('#rp-r').value }); ov('ov-rep', false); };
socket.on('err', toast); socket.on('warn', m => alert('WARNING FROM OWNER:\n' + m));
socket.on('kicked', m => { alert(m); G.st = null; show('modes'); });
socket.on('banned', b => { $('#ban-m').textContent = `Reason: ${b.reason}  Until: ${b.until ? new Date(b.until).toLocaleString() : 'PERMANENT'}`; ov('ov-ban'); });
socket.on('room:joined', () => { log('Joined room'); show('lobby'); });
socket.on('state', st => {
  const was = G.st && G.st.ph; G.onState(st); if (was !== st.ph) log(`Phase: ${st.ph}`);
  if (st.ph === 'lobby') { show('lobby'); $('#l-code').textContent = st.c; if (was && was !== 'lobby') { rdy = false; $('#l-ready').textContent = 'READY'; }
    $('#l-list').innerHTML = st.pl.map(p => `<li style="border-left:6px solid ${esc(p.col)}">${esc(p.n)} ${p.id === st.host ? '(HOST)' : ''} ${p.rdy ? '✔ READY' : ''} <small>${p.tot ? 'pts ' + p.tot : ''}</small></li>`).join(''); }
  else if (!$('#game').classList.contains('on')) show('game');
});
socket.on('chat', c => { const d = document.createElement('div'); if (c.sys) { d.className = 'sys'; d.textContent = c.m; log(c.m); } else { d.innerHTML = (c.o ? '<b class="own">[OWNER]</b> ' : '') + esc(c.n) + ': ' + esc(c.m); } $('#cm').append(d); $('#cm').scrollTop = 1e9; while ($('#cm').children.length > 60) $('#cm').firstChild.remove(); });
addEventListener('keydown', e => { if (e.code === 'Enter' && $('#chat').classList.contains('on')) { if (document.activeElement === $('#ci')) { if ($('#ci').value.trim()) socket.emit('chat', $('#ci').value); $('#ci').value = ''; $('#ci').blur(); } else { e.preventDefault(); $('#ci').focus(); } }
  if (e.code === S.binds.menu && !typing()) document.querySelectorAll('.ov.on').forEach(o => o.classList.remove('on')); });
boot();
