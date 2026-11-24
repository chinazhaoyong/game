'use strict';
// === GM 管理后台前端（免密，服务由 GM 控制台 7790 提供）===

const API = '';
const GAME_PORT = 7788;
let selectedPlayer = null;

// 通用请求（控制台会代理 /api/gm/* 到游戏服务器并注入口令）
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

function toast(msg, isErr = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 200); }, 2200);
}

// === 初始化 ===
function initApp() {
  refreshStatus();
  loadPlayers();
  loadMonsters();
  setInterval(refreshStatus, 5000);
  document.getElementById('gmRefresh').onclick = () => { refreshStatus(); loadMonsters(); if (selectedPlayer) loadPlayerDetail(selectedPlayer.id); };
  document.getElementById('gmStart').onclick = startServer;
  document.getElementById('gmStop').onclick = stopServer;
  document.getElementById('gmSearch').addEventListener('input', debounce(() => loadPlayers(), 300));
  const a = document.getElementById('gmOpenGame');
  if (a) a.href = 'http://' + location.hostname + ':' + GAME_PORT + '/';
}
initApp();

function debounce(fn, t) { let h; return () => { clearTimeout(h); h = setTimeout(fn, t); }; }

// === 服务器控制 ===
async function refreshStatus() {
  try {
    const ctl = await api('/api/ctl/status');
    const st = document.getElementById('stRunning');
    st.textContent = ctl.running ? '服务器 运行中' : '服务器 已停止';
    st.className = 'st-badge ' + (ctl.running ? 'on' : 'off');
    if (ctl.running) {
      const g = await api('/api/gm/status');
      document.getElementById('stOnline').textContent = `在线 ${g.online}`;
      document.getElementById('stTotal').textContent = `玩家 ${g.total}`;
      document.getElementById('stUptime').textContent = `运行 ${formatUptime(g.uptime)}`;
      loadPlayers();
    } else {
      document.getElementById('stOnline').textContent = '在线 —';
      document.getElementById('stTotal').textContent = '玩家 —';
      document.getElementById('stUptime').textContent = '运行 —';
      document.getElementById('gmPlayerList').innerHTML = '<div class="gm-empty sm">服务器未启动</div>';
    }
  } catch (e) { /* 忽略轮询错误 */ }
}

function formatUptime(s) {
  if (s < 60) return `${Math.floor(s)}秒`;
  if (s < 3600) return `${Math.floor(s/60)}分${Math.floor(s%60)}秒`;
  if (s < 86400) return `${Math.floor(s/3600)}时${Math.floor((s%3600)/60)}分`;
  return `${Math.floor(s/86400)}天${Math.floor((s%86400)/3600)}时`;
}

async function startServer() {
  try {
    const r = await api('/api/ctl/start', { method: 'POST', body: '{}' });
    toast('▶️ ' + (r.msg || '正在启动'));
    setTimeout(refreshStatus, 1600);
  } catch (e) { toast(e.message, true); }
}

async function stopServer() {
  if (!confirm('确定停止游戏服务器？所有玩家将断开连接。')) return;
  try {
    const r = await api('/api/ctl/stop', { method: 'POST', body: '{}' });
    toast('⏹️ ' + (r.msg || '已停止'));
    setTimeout(refreshStatus, 900);
  } catch (e) { toast(e.message, true); }
}

// === 玩家列表 ===
async function loadPlayers() {
  const list = document.getElementById('gmPlayerList');
  try {
    const q = document.getElementById('gmSearch').value.trim();
    const { players } = await api('/api/gm/players' + (q ? '?q=' + encodeURIComponent(q) : ''));
    list.innerHTML = players.map(p => `
      <div class="gm-player-row ${p.is_online ? 'online' : ''}" data-id="${p.id}">
        <div>
          <div class="name">${p.name}</div>
          <div class="meta">HP ${p.hp}/${p.max_hp} · 名望 ${p.fame}</div>
        </div>
        <div class="online-dot"></div>
      </div>
    `).join('');
    list.querySelectorAll('.gm-player-row').forEach(row => {
      row.addEventListener('click', () => {
        document.querySelectorAll('.gm-player-row').forEach(r => r.classList.remove('active'));
        row.classList.add('active');
        loadPlayerDetail(Number(row.dataset.id));
      });
    });
  } catch (e) {
    list.innerHTML = '<div class="gm-empty sm">游戏服务器未启动或不可用</div>';
  }
}

async function loadPlayerDetail(id) {
  try {
    const { player, inventory, moves, equipment, life, quests } = await api('/api/gm/player?id=' + id);
    selectedPlayer = player;
    renderPlayerDetail(player, inventory, moves, equipment, life, quests);
  } catch (e) { toast(e.message, true); }
}

const ATTR_CN = { gen:'根骨', str:'力量', con:'体质', agi:'身法', luck:'幸运', cha:'魅力', wit:'悟性', fortune:'福缘' };
const SLOT_CN = { head:'头戴', hand:'手拿', feet:'脚踏', body:'身穿', wrist:'护腕', accessory:'配饰' };

function renderPlayerDetail(p, inv, moves, equipment, life, quests) {
  const main = document.getElementById('gmMain');
  const factionNames = { shaolin:'少林',wudang:'武当',gaibang:'丐帮',huashan:'华山',emei:'峨眉',kunlun:'昆仑',tianshan:'天山',mingjiao:'明教',diancang:'点苍',tangmen:'唐门',wudu:'五毒',duanshi:'大理',taohua:'桃花岛',haidao:'海盗',salt:'盐帮',tiezhang:'铁掌帮',murong:'慕容',qinglong:'青龙会',qianjin:'金钱帮',nan_gong:'南宫' };
  const rankNames = { servant:'杂役',trainee:'见习',outer:'外门',inner:'内门',inner_high:'内门高层',core:'核心',privileged:'亲传',chief:'首席' };

  const factionTag = p.faction_id ? `${factionNames[p.faction_id] || p.faction_id} · ${rankNames[p.rank] || p.rank}` : '无门派';
  const attrTags = Object.entries(ATTR_CN).map(([k, cn]) =>
    `<span class="tag attr-tag" title="${cn}（${k}）">${cn} <b>${p[k] ?? '—'}</b></span>`).join('');
  const eqHtml = equipment.length === 0 ? '<div style="color:#666">没有装备</div>' :
    equipment.map(e => `<span class="tag ${e.equipped ? 'eq-on' : ''}" title="${e.item_key}">${e.equipped ? '✅' : ''}${SLOT_CN[e.slot] || e.slot} · ${e.name}（攻${e.atk || 0}/防${e.def || 0}${e.rarity ? ' · ' + e.rarity : ''}）${e.equipped ? '' : `<button onclick="removeEquip(${e.id},'${e.name}')" title="删除">✕</button>`}</span>`).join('');
  const lifeHtml = life.length === 0 ? '<div style="color:#666">没有生活技能</div>' :
    life.map(l => `<span class="tag">${l.name || l.skill_key} Lv.${l.level}（经验 ${l.exp}）<button onclick="setLifeSkill('${l.skill_key}',${l.level})" title="改等级">✎</button></span>`).join('');

  main.innerHTML = `
    <div class="player-card">
      <h2>${p.name} <span class="pid">ID: ${p.id}</span></h2>
      <div class="stat-grid">
        <div class="stat"><div class="label">等级</div><div class="val">Lv.${p.level || 1}</div></div>
        <div class="stat"><div class="label">经验</div><div class="val">${p.exp || 0}</div></div>
        <div class="stat"><div class="label">自由点</div><div class="val">${p.free_points || 0}</div></div>
        <div class="stat"><div class="label">木人桩</div><div class="val">${p.dummy_prof || 0}/10</div></div>
        <div class="stat"><div class="label">HP</div><div class="val">${p.hp} / ${p.max_hp}</div></div>
        <div class="stat"><div class="label">内力</div><div class="val">${p.nei} / ${p.max_nei}</div></div>
        <div class="stat"><div class="label">银两</div><div class="val">${p.silver}</div></div>
        <div class="stat"><div class="label">名望</div><div class="val">${p.fame}</div></div>
        <div class="stat"><div class="label">恶名</div><div class="val">${p.infamy}</div></div>
        <div class="stat"><div class="label">门派</div><div class="val" style="font-size:14px">${factionTag}</div></div>
        <div class="stat"><div class="label">称号</div><div class="val" style="font-size:13px">${p.title || '—'}</div></div>
        <div class="stat"><div class="label">位置</div><div class="val" style="font-size:13px">${p.domain_id}/${p.location_id}</div></div>
      </div>
      <div class="item-grid" style="margin-top:10px">${attrTags}</div>
    </div>

    <div class="player-card">
      <div class="section-head"><h3>✏️ 编辑属性</h3><button class="btn btn-primary btn-sm" id="saveEdit">保存修改</button></div>
      <div class="edit-grid">
        <label>HP<input id="e_hp" value="${p.hp}"></label>
        <label>最大HP<input id="e_max_hp" value="${p.max_hp}"></label>
        <label>内力<input id="e_nei" value="${p.nei}"></label>
        <label>最大内力<input id="e_max_nei" value="${p.max_nei}"></label>
        <label>等级<input id="e_level" value="${p.level || 1}"></label>
        <label>经验<input id="e_exp" value="${p.exp || 0}"></label>
        <label>自由点<input id="e_free_points" value="${p.free_points || 0}"></label>
        <label>木人桩熟练<input id="e_dummy_prof" value="${p.dummy_prof || 0}"></label>
        <label>银两<input id="e_silver" value="${p.silver}"></label>
        <label>名望<input id="e_fame" value="${p.fame}"></label>
        <label>恶名<input id="e_infamy" value="${p.infamy}"></label>
        <label>称号<input id="e_title" value="${p.title || ''}"></label>
        ${Object.entries(ATTR_CN).map(([k, cn]) => `<label>${cn}<input id="e_${k}" value="${p[k] ?? 10}"></label>`).join('')}
        <label>门派
          <select id="e_faction">
            <option value="">无门派</option>
            ${Object.entries(factionNames).map(([k,v]) => `<option value="${k}" ${p.faction_id===k?'selected':''}>${v}</option>`).join('')}
          </select>
        </label>
        <label>门内等级
          <select id="e_rank">
            ${Object.entries(rankNames).map(([k,v]) => `<option value="${k}" ${p.rank===k?'selected':''}>${v}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="action-row">
        <button class="btn" onclick="quickStat('hp_full')">满血满内</button>
        <button class="btn" onclick="quickStat('silver_99999')">+99999 两</button>
        <button class="btn" onclick="quickStat('fame_9999')">+9999 名望</button>
        <button class="btn btn-ok" onclick="addExpPlayer()">📈 加 300 经验（真实升级）</button>
      </div>
    </div>

    <div class="player-card">
      <div class="section-head">
        <h3>🎁 背包物品 (${inv.length})</h3>
        <button class="btn btn-primary btn-sm" onclick="openGiveItem()">➕ 送东西</button>
      </div>
      <div class="item-grid" id="invList">
        ${inv.length === 0 ? '<div style="color:#666">背包是空的</div>' :
          inv.map(i => `<span class="tag" title="${i.key}">${i.name} <small style="color:#666">${i.key}</small> ×${i.count}<button onclick="removeItem('${i.key}',${i.count})" title="全部删除">✕</button></span>`).join('')}
      </div>
    </div>

    <div class="player-card">
      <div class="section-head">
        <h3>🗡️ 装备 (${equipment.length})</h3>
        <button class="btn btn-primary btn-sm" onclick="openGiveItem()">➕ 送装备</button>
      </div>
      <div class="item-grid">${eqHtml}</div>
    </div>

    <div class="player-card">
      <div class="section-head">
        <h3>⚔️ 武功 (${moves.length})</h3>
        <button class="btn btn-sm" onclick="openLearnMove()">➕ 学武功</button>
      </div>
      <div class="item-grid" id="moveList">
        ${moves.length === 0 ? '<div style="color:#666">还没学任何武功</div>' :
          moves.map(m => `<span class="tag" title="${m.key}">${m.name}<button onclick="forgetMove('${m.key}')" title="删除">✕</button></span>`).join('')}
      </div>
    </div>

    <div class="player-card">
      <div class="section-head">
        <h3>🧑‍🌾 生活技能 (${life.length})</h3>
        <button class="btn btn-primary btn-sm" onclick="setLifeSkill('',0)">➕ 设技能等级</button>
      </div>
      <div class="item-grid">${lifeHtml}</div>
    </div>

    <div class="player-card">
      <div class="section-head"><h3>📜 任务 (${quests.length})</h3></div>
      <div class="item-grid">
        ${quests.length === 0 ? '<div style="color:#666">没有任务记录</div>' :
          quests.map(q => `<span class="tag" title="${q.key}">${q.title} <span style="color:#888;font-size:10px">${q.status}</span></span>`).join('')}
      </div>
    </div>

    <div class="player-card">
      <div class="section-head"><h3>⚠️ 危险操作</h3></div>
      <div class="action-row">
        <button class="btn btn-sm" onclick="teleportPlayer()">📍 传送</button>
        <button class="btn btn-sm" onclick="kickPlayer()">🥾 踢下线</button>
        <button class="btn btn-danger btn-sm" onclick="deletePlayer()">🗑️ 删除角色</button>
      </div>
    </div>
  `;

  document.getElementById('saveEdit').onclick = saveEdit;
}

// === 快捷操作 ===
async function saveEdit() {
  if (!selectedPlayer) return;
  const id = selectedPlayer.id;
  const data = { id };
  ['hp','max_hp','nei','max_nei','silver','fame','infamy',
   'level','exp','free_points','dummy_prof',
   'gen','str','con','agi','luck','cha','wit','fortune'].forEach(k => {
    const el = document.getElementById('e_' + k);
    if (el) data[k] = Number(el.value);
  });
  data.title = document.getElementById('e_title').value;
  data.faction_id = document.getElementById('e_faction').value || null;
  data.rank = document.getElementById('e_rank').value;
  try {
    await api('/api/gm/player/edit', { method: 'POST', body: JSON.stringify(data) });
    toast('✅ 已保存');
    loadPlayerDetail(id);
  } catch (e) { toast(e.message, true); }
}

async function quickStat(type) {
  if (!selectedPlayer) return;
  const data = { id: selectedPlayer.id };
  if (type === 'hp_full') { data.hp = 9999; data.max_hp = 9999; data.nei = 9999; data.max_nei = 9999; }
  if (type === 'silver_99999') data.silver = (selectedPlayer.silver || 0) + 99999;
  if (type === 'fame_9999') data.fame = (selectedPlayer.fame || 0) + 9999;
  try {
    await api('/api/gm/player/edit', { method: 'POST', body: JSON.stringify(data) });
    toast('✅ 已应用');
    loadPlayerDetail(selectedPlayer.id);
  } catch (e) { toast(e.message, true); }
}

// === 送东西 ===
async function openGiveItem() {
  if (!selectedPlayer) return;
  const q = prompt('要送什么？输入物品名称或 key 关键字（如 金丝甲、馒头）:');
  if (!q) return;
  try {
    const { items } = await api('/api/gm/items?q=' + encodeURIComponent(q));
    if (!items.length) { toast('没找到物品', true); return; }
    const chosen = prompt(`找到 ${items.length} 个，输入要送的 key（或直接复制下面）:\n` + items.slice(0, 20).map(i => `${i.key} — ${i.name}`).join('\n'));
    if (!chosen) return;
    const count = Number(prompt('送几个:', '1')) || 1;
    await api('/api/gm/item/give', { method: 'POST', body: JSON.stringify({ id: selectedPlayer.id, key: chosen.trim(), count }) });
    toast(`✅ 已送 ${count} 个 ${chosen}`);
    loadPlayerDetail(selectedPlayer.id);
  } catch (e) { toast(e.message, true); }
}

async function removeItem(key, count) {
  if (!selectedPlayer) return;
  if (!confirm(`确定删除 ${key} ×${count}？`)) return;
  try {
    await api('/api/gm/item/remove', { method: 'POST', body: JSON.stringify({ id: selectedPlayer.id, key, count }) });
    toast('✅ 已删除');
    loadPlayerDetail(selectedPlayer.id);
  } catch (e) { toast(e.message, true); }
}

async function openLearnMove() {
  if (!selectedPlayer) return;
  const q = prompt('武功关键字（key 或名称，如 直拳）:');
  if (!q) return;
  try {
    const { moves } = await api('/api/gm/moves?q=' + encodeURIComponent(q));
    if (!moves.length) { toast('没找到武功', true); return; }
    const chosen = prompt(`找到 ${moves.length} 个，输入要学的 key:\n` + moves.slice(0, 30).map(m => `${m.key} — ${m.name} (${m.type})`).join('\n'));
    if (!chosen) return;
    await api('/api/gm/move/learn', { method: 'POST', body: JSON.stringify({ id: selectedPlayer.id, key: chosen.trim() }) });
    toast('✅ 已学会');
    loadPlayerDetail(selectedPlayer.id);
  } catch (e) { toast(e.message, true); }
}

async function forgetMove(key) {
  if (!selectedPlayer) return;
  if (!confirm(`确定让玩家忘掉 ${key}？`)) return;
  try {
    await api('/api/gm/move/forget', { method: 'POST', body: JSON.stringify({ id: selectedPlayer.id, key }) });
    toast('✅ 已删除武功');
    loadPlayerDetail(selectedPlayer.id);
  } catch (e) { toast(e.message, true); }
}

async function teleportPlayer() {
  if (!selectedPlayer) return;
  const loc = prompt('目标 location_id（如 luoyang, shaolin）:');
  const dom = prompt('目标 domain_id（如 zhongyuan）:');
  try {
    await api('/api/gm/player/teleport', { method: 'POST', body: JSON.stringify({ id: selectedPlayer.id, location: loc, domain: dom }) });
    toast('✅ 已传送');
    loadPlayerDetail(selectedPlayer.id);
  } catch (e) { toast(e.message, true); }
}

async function kickPlayer() {
  if (!selectedPlayer) return;
  const reason = prompt('踢下线原因:', 'GM 踢你下线了');
  if (!confirm('确定踢下线？')) return;
  try {
    await api('/api/gm/player/kick', { method: 'POST', body: JSON.stringify({ id: selectedPlayer.id, reason }) });
    toast('✅ 已踢下线');
    loadPlayers();
  } catch (e) { toast(e.message, true); }
}

async function deletePlayer() {
  if (!selectedPlayer) return;
  if (!confirm(`⚠️ 永久删除玩家「${selectedPlayer.name}」？此操作不可恢复！`)) return;
  try {
    await api('/api/gm/player/delete', { method: 'POST', body: JSON.stringify({ id: selectedPlayer.id, confirm: 'DELETE' }) });
    toast('✅ 已删除');
    selectedPlayer = null;
    document.getElementById('gmMain').innerHTML = '<div class="gm-empty">👈 从左侧选择一个玩家开始管理</div>';
    loadPlayers();
  } catch (e) { toast(e.message, true); }
}

// === 经验/装备/生活技能 ===
async function addExpPlayer() {
  if (!selectedPlayer) return;
  const n = Number(prompt('加多少经验？', '300')) || 0;
  if (n <= 0) return;
  try {
    const r = await api('/api/gm/player/addexp', { method: 'POST', body: JSON.stringify({ id: selectedPlayer.id, exp: n }) });
    toast(`📈 经验 +${n}：Lv.${r.level_before} → Lv.${r.level_after}` + (Array.isArray(r.upgrades) && r.upgrades.length ? `（+${r.upgrades.length * 3} 自由点）` : ''));
    loadPlayerDetail(selectedPlayer.id);
  } catch (e) { toast(e.message, true); }
}

async function removeEquip(eid, name) {
  if (!selectedPlayer) return;
  if (!confirm(`确定删除装备「${name}」？不可恢复。`)) return;
  try {
    await api('/api/gm/equipment/remove', { method: 'POST', body: JSON.stringify({ eid }) });
    toast('✅ 已删除装备');
    loadPlayerDetail(selectedPlayer.id);
  } catch (e) { toast(e.message, true); }
}

async function setLifeSkill(skillKey, curLevel) {
  if (!selectedPlayer) return;
  let skill = skillKey;
  if (!skill) {
    try {
      const { skills } = await api('/api/gm/lifeskill/list');
      if (!skills.length) { toast('没有生活技能数据', true); return; }
      skill = prompt('输入技能 key:\n' + skills.map(s => `${s.key} — ${s.name}`).join('\n'));
      if (!skill) return;
      skill = skill.trim();
    } catch (e) { toast(e.message, true); return; }
  }
  const lvRaw = prompt(`${skill} 设为几级？（0–10）`, String(curLevel || 1));
  if (lvRaw === null) return;
  const lv = Math.min(10, Math.max(0, Number(lvRaw) || 0));
  try {
    await api('/api/gm/lifeskill/set', { method: 'POST', body: JSON.stringify({ id: selectedPlayer.id, skill, level: lv }) });
    toast(`✅ ${skill} → Lv.${lv}`);
    loadPlayerDetail(selectedPlayer.id);
  } catch (e) { toast(e.message, true); }
}

// === 野怪管理 ===
async function loadMonsters() {
  const box = document.getElementById('gmGlobal');
  if (!box) return;
  try {
    const { monsters } = await api('/api/gm/monster/list');
    const alive = monsters.filter(m => m.alive).length;
    box.innerHTML = `
      <div class="gm-global-head">
        <h3>👹 野怪管理（存活 ${alive}/${monsters.length}）</h3>
        <button class="btn btn-sm" onclick="resetAllMonsters()">♻️ 全部复活</button>
      </div>
      <div class="item-grid monster-grid">
        ${monsters.map(m => `<span class="tag ${m.alive ? 'mob-alive' : 'mob-dead'}" title="${m.key} · ${m.node_id} · 攻${m.atk}/防${m.def}">${m.alive ? '🟢' : '☠️'} ${m.name} Lv.${m.level}（${m.node_id}）<button onclick="resetMonster('${m.key}')" title="复活该野怪">↻</button></span>`).join('')}
      </div>`;
  } catch (e) {
    box.innerHTML = '<div class="gm-empty sm">野怪数据不可用（游戏服务器未启动）</div>';
  }
}

async function resetMonster(key) {
  try {
    await api('/api/gm/monster/reset', { method: 'POST', body: JSON.stringify({ key }) });
    toast('♻️ 已复活');
    loadMonsters();
  } catch (e) { toast(e.message, true); }
}

async function resetAllMonsters() {
  if (!confirm('复活全部野怪？')) return;
  try {
    await api('/api/gm/monster/reset', { method: 'POST', body: JSON.stringify({ all: true }) });
    toast('♻️ 全部野怪已复活');
    loadMonsters();
  } catch (e) { toast(e.message, true); }
}

// 让 HTML 里的 onclick 全局可访问
window.quickStat = quickStat;
window.addExpPlayer = addExpPlayer;
window.removeEquip = removeEquip;
window.setLifeSkill = setLifeSkill;
window.resetMonster = resetMonster;
window.resetAllMonsters = resetAllMonsters;
window.openGiveItem = openGiveItem;
window.removeItem = removeItem;
window.openLearnMove = openLearnMove;
window.forgetMove = forgetMove;
window.teleportPlayer = teleportPlayer;
window.kickPlayer = kickPlayer;
window.deletePlayer = deletePlayer;
window.startServer = startServer;
window.stopServer = stopServer;