const DEF = { logShow: true, logMax: 30, ui: 1, cross: true, fx: true, bgm: '', binds: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', run: 'ShiftLeft', pose: 'Space', scan: 'KeyF', interact: 'KeyE', menu: 'Escape' } };
const S = (() => { try { const s = JSON.parse(localStorage.getItem('mm.settings')); return { ...DEF, ...s, binds: { ...DEF.binds, ...(s && s.binds) } }; } catch { return JSON.parse(JSON.stringify(DEF)); } })();
function saveS() { try { localStorage.setItem('mm.settings', JSON.stringify(S)); } catch {} applyS(); }
function applyS() { document.getElementById('log').style.display = S.logShow ? '' : 'none'; document.getElementById('root').style.zoom = S.ui; }
function buildSettings() {
  const b = document.getElementById('set-body'); b.innerHTML = '';
  const add = (l, el) => { const d = document.createElement('label'); d.append(l + ' ', el); b.append(d); };
  const chk = (k) => { const e = document.createElement('input'); e.type = 'checkbox'; e.checked = S[k]; e.onchange = () => { S[k] = e.checked; saveS(); }; return e; };
  const num = (k, mn, mx, st) => { const e = document.createElement('input'); e.type = 'range'; e.min = mn; e.max = mx; e.step = st || 1; e.value = S[k]; e.oninput = () => { S[k] = +e.value; saveS(); }; return e; };
  add('Show Log', chk('logShow')); add('Log Size (lines)', num('logMax', 5, 100)); add('UI Scale', num('ui', .7, 1.4, .1)); add('Crosshair', chk('cross')); add('Effects', chk('fx'));
  const u = document.createElement('input'); u.placeholder = 'BGM URL (future)'; u.value = S.bgm; u.onchange = () => { S.bgm = u.value.slice(0, 300); saveS(); }; add('BGM', u);
  Object.keys(S.binds).forEach(k => { const e = document.createElement('button'); e.textContent = S.binds[k]; e.onclick = () => { e.textContent = 'press key...'; const h = ev => { ev.preventDefault(); S.binds[k] = ev.code; saveS(); e.textContent = ev.code; removeEventListener('keydown', h, true); }; addEventListener('keydown', h, true); }; add('Key: ' + k, e); });
}
applyS();
