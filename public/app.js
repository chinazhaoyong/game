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
  const ATTR_CN = { gen: '根骨', str: '力量', con: '体质', agi: '身法', luck: '幸运', cha: '魅力', wit: '悟性', fortune: '福缘' };
  let rolledAttrs = null;

  async function rollAttrs() {
    try {
      const res = await fetch('/api/roll-attrs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (data.attrs) { rolledAttrs = data.attrs; renderRolled(); }
    } catch (e) { authErr.textContent = '连不上服务器。'; }
  }
  function renderRolled() {
    $('#attrGrid').innerHTML = Object.entries(rolledAttrs).map(([k, v]) =>
      `<div class="attr-cell"><i>${ATTR_CN[k] || k}</i><b>${v}</b></div>`).join('');
    const sum = Object.values(rolledAttrs).reduce((a, b) => a + b, 0);
    $('#attrSum').textContent = `总点数 ${sum}` + (sum < 64 || sum > 96 ? ' · 超出 64–96，请重掷' : ' · 可用');
  }
  async function registerWithAttrs() {
    const name = $('#authName').value.trim();
    const pass = $('#authPass').value;
    authErr.textContent = '';
    if (!name || !pass) { authErr.textContent = '角色名和口令都要写。'; return; }
    if (!rolledAttrs) { authErr.textContent = '先掷一次属性。'; return; }
    try {
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pass, attrs: rolledAttrs }),
      });
      const data = await res.json();
      if (!res.ok) { authErr.textContent = data.error || '进不去。'; return; }
      $('#attrRoll').hidden = true;
      token = data.token;
      localStorage.setItem('djh_token', token);
      enterWorld();
    } catch (e) { authErr.textContent = '连不上。服务器开了吗？'; }
  }

  async function auth() {
    const name = $('#authName').value.trim();
    const pass = $('#authPass').value;
    authErr.textContent = '';
    if (!name || !pass) { authErr.textContent = '角色名和口令都要写。'; return; }
    try {
      const res = await fetch('/api/login', {
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

  $('#authForm').addEventListener('submit', (e) => { e.preventDefault(); auth(); });
  $('#btnRegister').addEventListener('click', () => {
    const name = $('#authName').value.trim();
    const pass = $('#authPass').value;
    authErr.textContent = '';
    if (!name || !pass) { authErr.textContent = '先填好角色名和口令，再掷属性。'; return; }
    if (pass.length < 4) { authErr.textContent = '口令至少 4 位。'; return; }
    $('#attrRoll').hidden = false;
    rollAttrs();
  });
  $('#btnReroll').addEventListener('click', rollAttrs);
  $('#btnConfirmReg').addEventListener('click', registerWithAttrs);

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
      } else if (msg.type === 'kick') {
        localStorage.removeItem('djh_token');
        token = '';
        toLogin();
        authErr.textContent = msg.reason || '你被踢下线了。';
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
  // 面板里「此地」的地点 / NPC 芯片：点击即发指令
  $('#panes').addEventListener('click', (e) => {
    const c = e.target.closest('.chip[data-cmd]'); if (!c) return;
    run(c.dataset.cmd);
  });
  // 双击：背包物品 = 使用 1 个 / 背包装备 = 穿上 / 属性面板装备槽 = 脱下
  $('#panes').addEventListener('dblclick', (e) => {
    const c = e.target.closest('[data-act]'); if (!c) return;
    const act = c.dataset.act, arg = c.dataset.arg || '';
    if (act === 'use') run(`用 ${arg} 1`);
    else if (act === 'equip') run(`穿 ${arg}`);
    else if (act === 'unequip') run(`脱 ${arg}`);
  });

  // —— 渲染状态 ——
  function renderState() {
    const s = state; if (!s) return;
    $('#mRoom').textContent = s.roomName || '';
    $('#mDomain').textContent = s.domainName || '';
    $('#mWho').textContent = `${s.name} · ${s.title || ''}`;
    document.title = `${s.roomName} · 大江湖`;

    // 人物属性
    const ATTRS8 = [['gen','根骨'],['str','力量'],['con','体质'],['agi','身法'],['luck','幸运'],['cha','魅力'],['wit','悟性'],['fortune','福缘']];
    const SLOTS6 = [['head','头戴'],['hand','手拿'],['feet','脚踏'],['body','身穿'],['wrist','护腕'],['accessory','配饰']];
    const expPct = Math.min(100, Math.round((s.exp / (s.expNeed || 1)) * 100));
    const hpPct = Math.max(0, Math.round((s.hp / s.maxHp) * 100));
    const neiPct = Math.max(0, Math.round((s.nei / s.maxNei) * 100));
    const famePct = s.fameNext ? Math.min(100, Math.round((s.fame / s.fameNext.at) * 100)) : 100;
    const attrGrid = ATTRS8.map(([k, cn]) => `<div class="attr-cell"><i>${cn}</i><b>${s[k]}</b></div>`).join('');
    const eqBySlot = {};
    for (const e of (s.equipped || [])) (eqBySlot[e.slot] = eqBySlot[e.slot] || []).push(e);
    const slotChips = SLOTS6.map(([k, cn]) => {
      const list = eqBySlot[k] || [];
      if (!list.length) return `<span class="chip slot-empty">${cn} · 空</span>`;
      return list.map(e => `<button class="chip slot-full" data-act="unequip" data-arg="${esc(cn)}" title="双击脱下 ${esc(e.name)}（攻+${e.atk || 0} 防+${e.def || 0}）">${cn} · ${esc(e.name)}</button>`).join('');
    }).join('');
    const usableKinds = ['medicine', 'life'];
    const invChips = (s.items || []).map(it => usableKinds.includes(it.kind)
      ? `<button class="chip slot-full" data-act="use" data-arg="${esc(it.name)}" title="双击使用 1 个">${esc(it.name)} ×${it.count}</button>`
      : `<span class="chip slot-empty" title="材料/货物 —— 可炼制、锻造或出售">${esc(it.name)} ×${it.count}</span>`).join('');
    const bagEquip = (s.equipment || []).filter(e => !e.equipped)
      .map(e => `<button class="chip slot-full" data-act="equip" data-arg="${esc(e.name)}" title="双击穿上（攻+${e.atk || 0} 防+${e.def || 0}，需 Lv.${e.reqLevel || 1}）">${esc(e.name)}${e.slotName ? ' · ' + esc(e.slotName) : ''}</button>`).join('');
    const freeHint = s.freePoints > 0 ? `<div class="hint-line">✦ 有 ${s.freePoints} 点自由属性 —— 打「加 根骨 2」分配</div>` : '';
    $('#panes .pane[data-pane="state"]').innerHTML = `
      <div class="block">
        <h4>人物属性</h4>
        <div class="kv"><b>${esc(s.name)} · Lv.${s.level}</b><span>${esc(s.title || '')}</span></div>
        <div class="meter"><div class="row"><b>经验</b><em>${s.exp} / ${s.expNeed}</em></div><div class="track"><div class="fill" style="width:${expPct}%"></div></div></div>
        <div class="meter"><div class="row"><b>气血</b><em>${s.hp} / ${s.maxHp}</em></div><div class="track"><div class="fill" style="width:${hpPct}%;background:var(--rust)"></div></div></div>
        <div class="meter"><div class="row"><b>内力</b><em>${s.nei} / ${s.maxNei}</em></div><div class="track"><div class="fill" style="width:${neiPct}%;background:var(--good)"></div></div></div>
        <div class="attr-grid">${attrGrid}</div>
        <div class="kv"><span>攻击 / 防御</span><span>${s.derived.atk} / ${s.derived.def}</span></div>
        <div class="kv"><span>暴击 / 闪避 / 命中</span><span>${s.derived.crit}% / ${s.derived.dodge}% / ${s.derived.hit}%</span></div>
        ${s.derived.special ? `<div class="kv"><span>武器特效</span><span>${esc(s.derived.special)}</span></div>` : ''}
        <button class="chip dummy-chip" data-cmd="打木人桩" title="点击练功：熟练度 +1、经验 +2（上限 10）">🎯 木人桩熟练 ${s.dummyProf} / 10 · 点击练功</button>
        ${freeHint}
      </div>
      <div class="block">
        <h4>装备六槽 · 双击脱下</h4>
        <div class="chips">${slotChips}</div>
      </div>
      <div class="block">
        <h4>背包</h4>
        <div class="dim" style="font-size:11px;margin-bottom:6px">双击药品/食物 = 使用 1 个 · 双击装备 = 穿上</div>
        <div class="chips">${invChips}${bagEquip}</div>
        ${(!s.items?.length && !bagEquip) ? '<div class="empty">背包空空如也。去商店买点东西吧。</div>' : ''}
      </div>
      <div class="block">
        <h4>身价</h4>
        <div class="meter"><div class="row"><b>名望 · ${esc(s.fameTier)}</b><em>${s.fameNext ? s.fame + ' / ' + s.fameNext.at : String(s.fame)}</em></div><div class="track"><div class="fill" style="width:${famePct}%"></div></div></div>
        <div class="kv"><span>恶名</span><span style="color:${s.infamy > 50 ? 'var(--rust)' : 'var(--dim)'}">${s.infamy}</span></div>
        <div class="kv"><span>银两</span><span>${Number(s.silver).toFixed(1)} 两</span></div>
      </div>`;

    // 此地
    const DIR_CN = { N:'北', S:'南', E:'东', W:'西' };
    const exits = (s.exits || []).map(x => {
      const d = DIR_CN[x.label] || x.label;
      return `<button class="chip" data-cmd="去 ${esc(x.name)}" title="前往 ${esc(x.name)}">→ ${d}　${esc(x.name)}</button>`;
    }).join('');
    const npcs = (s.npcsHere || []).map(n => `<button class="chip" data-cmd="跟 ${esc(n.name)} 说话" title="和 ${esc(n.name)} 说话">${esc(n.name)}<small style="color:var(--dim2)">${esc(n.role)}</small></button>`).join('');
    const mobs = (s.monstersHere || []).map(m => m.alive
      ? `<button class="chip mob-alive" data-cmd="打 ${esc(m.name)}" title="野怪 Lv.${m.level} · 血 ${m.hp} · 攻 ${m.atk} · 约 ${m.exp} 经验 —— 点击攻击">${esc(m.name)}<small style="color:var(--dim2)">Lv.${m.level}</small></button>`
      : `<span class="chip mob-dead" title="已被击杀，几分钟内自动刷新">${esc(m.name)} · 已被击杀</span>`).join('');
    const aliveCount = (s.monstersHere || []).filter(m => m.alive).length;
    $('#panes .pane[data-pane="loc"]').innerHTML = `
      <div class="block">
        <h4>此地 · ${esc(s.roomName)}</h4>
        <div style="color:var(--dim);font-size:12px;line-height:1.8;margin-bottom:10px">${esc(s.desc || '')}</div>
        <div class="dim" style="font-size:11px;margin-bottom:6px">点击下方地点即可前往</div>
        <div class="chips">${exits || '<span class="empty">没有出口。</span>'}</div>
      </div>
      <div class="block">
        <h4>在场 ${s.npcsHere?.length || 0}</h4>
        <div class="dim" style="font-size:11px;margin-bottom:6px">点击 NPC 即可搭话</div>
        <div class="chips">${npcs || '<span class="empty">这里没其他人。</span>'}</div>
      </div>
      <div class="block">
        <h4>野怪 · 可战 ${aliveCount}/${s.monstersHere?.length || 0}</h4>
        <div class="dim" style="font-size:11px;margin-bottom:6px">点击野怪即可攻击 · 击杀得经验、银两和掉落 · 打「采集」可采此地材料</div>
        <div class="chips">${mobs || '<span class="empty">这里没有野怪，去野外逛逛。</span>'}</div>
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
    const moves = (s.moves || []).map(m => `
      <div class="kv"><span>${esc(m.name)}</span><em>${esc(m.desc)}${m.damage ? '　威力'+m.damage : ''}${m.nei_cost ? '　内力'+m.nei_cost : ''}${m.counter ? '　克制'+esc(m.counter) : ''}</em></div>`).join('');
    $('#panes .pane[data-pane="war"]').innerHTML = `
      <div class="block">
        <h4>已学武功（${s.moves?.length || 0}）</h4>
        ${moves || '<div class="empty">还没学武功。打「学 <招式名>」在武馆学。</div>'}
      </div>
      <div class="block">
        <h4>指令速查</h4>
        <div class="empty">打「帮」看全部指令。</div>
      </div>`;

    // 任务
    const quests = (s.quests || []).map(q => {
      const typeLabel = q.type === 'hei' ? '<em style="color:#e07860">⚠黑活</em>' : '<em>白活</em>';
      const statusLabel = q.pq_status === 'accepted' ? '<span class="good">✓已收下</span>' : '<span class="dim">进行中</span>';
      return `<div class="block" style="margin-bottom:8px;padding:8px;background:var(--bg-card);border-radius:4px;border:1px solid var(--border)">
        <div><b>${esc(q.title)}</b> ${typeLabel} ${statusLabel}</div>
        <div class="dim" style="margin-top:4px">${esc(q.description)}</div>
        <div class="dim" style="margin-top:2px">报酬: ${q.reward_silver}两${q.reward_fame ? '　名望+'+q.reward_fame : ''}${q.reward_infamy ? '　恶名+'+q.reward_infamy : ''}</div>
      </div>`;
    }).join('');
    $('#panes .pane[data-pane="quest"]').innerHTML = `
      <div class="block">
        <h4>当前任务（${s.quests?.length || 0}）</h4>
        ${quests || '<div class="empty">没有进行中的任务。打「任务」看可接列表。</div>'}
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

  // —— 修改密码 ——
  $('#pwBtn').addEventListener('click', async () => {
    const oldP = prompt('输入当前口令:');
    if (oldP === null) return;
    const newP = prompt('输入新口令（至少 4 位）:');
    if (newP === null) return;
    const confirmP = prompt('再输一次新口令:');
    if (confirmP === null) return;
    if (newP !== confirmP) { alert('两次新口令不一致'); return; }
    try {
      const res = await fetch('/api/password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, old: oldP, 'new': newP }),
      });
      const data = await res.json();
      if (!res.ok) { alert('修改失败: ' + data.error); return; }
      alert('✅ 口令修改成功！下次登录用新口令。');
    } catch(e) { alert('网络错误'); }
  });

  // —— 退出游戏 ——
  $('#logoutBtn').addEventListener('click', async () => {
    if (!confirm('确定退出游戏？')) return;
    try { await fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }); } catch(e) {}
    if (ws) { try { ws.close(); } catch(e) {} ws = null; }
    token = '';
    localStorage.removeItem('djh_token');
    state = null;
    app.hidden = true;
    boot.hidden = false;
    logEl.innerHTML = '';
    $('#authName').value = '';
    $('#authPass').value = '';
  });
})();
