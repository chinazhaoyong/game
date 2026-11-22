'use strict';

(() => {
  const $ = (s) => document.querySelector(s);
  const boot = $('#boot');
  const app = $('#app');
  const logEl = $('#log');
  const cmdEl = $('#cmd');
  const authErr = $('#authErr');

  let ws = null, state = null, token = localStorage.getItem('djh_token') || '';
  const history = [];
  let histIdx = -1, stickBottom = true;

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // —— 日志 ——
  function addLine(kind, text) {
    const el = document.createElement('div');
    el.className = 'line k-' + kind;
    el.textContent = text;
    logEl.appendChild(el);
    while (logEl.childElementCount > 1200) logEl.removeChild(logEl.firstElementChild);
    if (stickBottom) logEl.scrollTop = logEl.scrollHeight;
  }
  logEl.addEventListener('scroll', () => {
    stickBottom = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 80;
  });

  // —— 认证 ——
  async function auth(kind) {
    const name = $('#authName').value.trim();
    const pass = $('#authPass').value;
    authErr.textContent = '';
    if (!name || !pass) { authErr.textContent = '角色名和口令都要写。'; return; }
    try {
      const res = await fetch('/api/' + kind, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pass }),
      });
      const data = await res.json();
      if (!res.ok) { authErr.textContent = data.error || '进不去。'; return; }
      token = data.token;
      localStorage.setItem('djh_token', token);
      enterWorld();
    } catch (e) { authErr.textContent = '连不上。服务器开了吗？'; }
  }

  $('#authForm').addEventListener('submit', (e) => { e.preventDefault(); auth('login'); });
  $('#btnRegister').addEventListener('click', () => auth('register'));

  function disconnectWS() {
    if (ws) { try { ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null; ws.close(); } catch(_){} ws = null; }
  }
  function enterWorld() {
    disconnectWS();
    boot.hidden = true;
    app.hidden = false;
    logEl.innerHTML = '';
    connect();
    setTimeout(() => cmdEl.focus(), 60);
  }
  function toLogin() {
    disconnectWS();
    boot.hidden = false;
    app.hidden = true;
    setNet(false);
  }

  // —— 连接 ——
  function setNet(on) {
    const n = $('#net');
    if (!n) return;
    n.classList.toggle('off', !on);
    n.classList.toggle('on', !!on);
    n.title = on ? '已连接' : '断开';
  }

  function connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${location.host}/ws?token=${encodeURIComponent(token)}`;
    let opened = false;
    try { ws = new WebSocket(url); } catch (e) { toLogin(); return; }

    ws.onopen = () => { opened = true; setNet(true); };
    ws.onmessage = (ev) => {
      let msg; try { msg = JSON.parse(ev.data); } catch(e) { return; }
      if (msg.type === 'lines' && Array.isArray(msg.lines)) {
        for (const l of msg.lines) addLine(l.kind, l.text);
      } else if (msg.type === 'state' && msg.state) {
        state = msg.state; renderState();
      }
    };
    ws.onclose = () => {
      setNet(false);
      if (!opened) {
        localStorage.removeItem('djh_token');
        token = '';
        toLogin();
        authErr.textContent = '凭证过期，重新进一次。';
        return;
      }
      if (token) setTimeout(connect, 2000);
    };
    ws.onerror = () => {};
  }

  // —— 发送 ——
  function run(text) {
    const t = String(text || '').trim();
    if (!t) return;
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'cmd', text: t }));
      addLine('cmd', t);
      stickBottom = true;
      logEl.scrollTop = logEl.scrollHeight;
      if (history[history.length - 1] !== t) history.push(t);
      if (history.length > 80) history.shift();
      histIdx = history.length;
    }
  }

  $('#bar').addEventListener('submit', (e) => { e.preventDefault(); const v = cmdEl.value; cmdEl.value = ''; run(v); histIdx = history.length; });
  cmdEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      if (!history.length) return;
      e.preventDefault();
      histIdx = Math.max(0, histIdx - 1);
      cmdEl.value = history[histIdx] || '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      histIdx = Math.min(history.length, histIdx + 1);
      cmdEl.value = history[histIdx] || '';
    }
  });

  // —— 面板 Tab 切换 ——
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]'); if (!b) return;
    document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b));
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.dataset.pane === b.dataset.tab));
  });
  $('#quick').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cmd]'); if (!b) return;
    run(b.dataset.cmd);
  });

  // —— 渲染状态 ——
  function renderState() {
    const s = state; if (!s) return;
    $('#mRoom').textContent = s.roomName || '';
    $('#mDomain').textContent = s.domainName || '';
    $('#mWho').textContent = `${s.name} · ${s.title || ''}`;
    document.title = `${s.roomName} · 大江湖`;

    // 此身
    const famePct = s.fameNext ? Math.round((s.fame / s.fameNext.at) * 100) : 100;
    $('#panes .pane[data-pane="state"]').innerHTML = `
      <div class="block">
        <h4>此身</h4>
        <div class="kv"><b>${esc(s.name)}</b><span>${esc(s.title || '无名小卒')}</span></div>
        <div class="kv"><span>HP</span><span>${s.hp}/${s.maxHp}</span></div>
        <div class="kv"><span>内力</span><span>${s.nei}/${s.maxNei}</span></div>
        <div class="meter"><div class="row"><b>名望 · ${esc(s.fameTier)}</b><em>${s.fameNext ? s.fame + ' / ' + s.fameNext.at : String(s.fame)}</em></div><div class="track"><div class="fill" style="width:${famePct}%"></div></div></div>
        <div class="kv"><span>恶名</span><span style="color:${s.infamy > 50 ? 'var(--rust)' : 'var(--dim)'}">${s.infamy}</span></div>
        <div class="kv"><span>银两</span><span>${Number(s.silver).toFixed(1)} 两</span></div>
      </div>`;

    // 此地
    const exits = (s.exits || []).map(x => `<button class="chip" data-cmd="去${x.label}">${x.label}　${esc(x.name)}</button>`).join('');
    const npcs = (s.npcsHere || []).map(n => `<span class="chip">${esc(n.name)}<small style="color:var(--dim2)">${esc(n.role)}</small></span>`).join('');
    $('#panes .pane[data-pane="loc"]').innerHTML = `
      <div class="block">
        <h4>此地 · ${esc(s.roomName)}</h4>
        <div style="color:var(--dim);font-size:12px;line-height:1.8;margin-bottom:10px">${esc(s.desc || '')}</div>
        <div class="chips">${exits || '<span class="empty">没有出口。</span>'}</div>
      </div>
      <div class="block">
        <h4>在场 ${s.npcsHere?.length || 0}</h4>
        <div class="chips">${npcs || '<span class="empty">这里没其他人。</span>'}</div>
      </div>`;

    // 势力
    const rep = (s.rep || []).map(r => {
      const pct = r.nextAt ? Math.round((r.value / r.nextAt) * 100) : 100;
      return `<div class="meter"><div class="row"><b>${esc(r.name)}</b><em>${r.value} · ${esc(r.tier)}</em></div><div class="track"><div class="fill" style="width:${pct}%;background:var(--good)"></div></div></div>`;
    }).join('');
    $('#panes .pane[data-pane="faction"]').innerHTML = `
      <div class="block">
        <h4>三派声望</h4>
        ${rep || '<div class="empty">还没跟任何势力建立关系。</div>'}
      </div>
      <div class="block">
        <h4>此域</h4>
        <div class="kv"><span>所在域</span><b>${esc(s.domainName)}</b></div>
        <div class="kv"><span>名望门槛</span><span>西域 30　南疆 40　东海 50　北荒 60</span></div>
      </div>`;

    // 武功
    $('#panes .pane[data-pane="war"]').innerHTML = `
      <div class="block">
        <h4>已学武功</h4>
        <div class="empty">武功系统暂未实装。打「学 <招式名>」在武馆学。</div>
      </div>
      <div class="block">
        <h4>指令速查</h4>
        <div class="empty">打「帮」看全部指令。</div>
      </div>`;

    // 任务
    $('#panes .pane[data-pane="quest"]').innerHTML = `
      <div class="block">
        <h4>任务</h4>
        <div class="empty">任务系统正在配置中。</div>
      </div>`;

    // 江湖
    $('#panes .pane[data-pane="rumor"]').innerHTML = `
      <div class="block">
        <h4>茶馆传闻</h4>
        <div class="empty">打「传闻」看茶馆公告板。打「喊 <话>」域内喊话（带延迟）。</div>
      </div>`;
  }

  // —— 启动 ——
  if (token) enterWorld(); else toLogin();

  // —— 帮助弹窗 ——
  const helpBtn = $('#helpBtn');
  const helpOverlay = $('#helpOverlay');
  const helpClose = $('#helpClose');
  function openHelp() { helpOverlay.hidden = false; }
  function closeHelp() { helpOverlay.hidden = true; }
  helpBtn.addEventListener('click', openHelp);
  helpClose.addEventListener('click', closeHelp);
  helpOverlay.addEventListener('click', (e) => { if (e.target === helpOverlay) closeHelp(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !helpOverlay.hidden) closeHelp(); });
})();
