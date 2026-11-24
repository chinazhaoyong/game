'use strict';
// —— RPG 机制核心：属性派生 / 升级 / 装备6槽 / 打怪 / 木人桩 / 采集制造 ——
// 全部数据从 DB 读，参数真实落地。
const { db } = require('./db');

const now = () => Date.now();
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const range = (r) => Array.isArray(r) ? rand(r[0], r[1]) : r;

// ===== 常量（供前端/后端共用）=====
const ATTR_NAMES = { gen:'根骨', str:'力量', con:'体质', agi:'身法', luck:'幸运', cha:'魅力', wit:'悟性', fortune:'福缘' };
const ATTR_KEYS = Object.keys(ATTR_NAMES);
const SLOT_NAMES = { head:'头戴', hand:'手拿', feet:'脚踏', body:'身穿', wrist:'护腕', accessory:'配饰' };
const SLOT_KEYS = ['head','hand','feet','body','wrist','accessory'];
const COUNTER_CN = { gang:'刚猛', qiao:'灵巧', nei:'内功' };
const COUNTER = { gang:'qiao', qiao:'nei', nei:'gang' };

// ===== 武功（DB）=====
let _moves = null;
function movesAll() {
  if (!_moves) {
    _moves = {};
    for (const r of db.prepare('SELECT * FROM moves').all()) {
      r.damage = JSON.parse(r.damage || '[0,0]');
      r.req_attr = JSON.parse(r.req_attr || '{}');
      r.attr_bonus = JSON.parse(r.attr_bonus || '{}');
      _moves[r.key] = r;
    }
  }
  return _moves;
}
function moveOf(key) { return movesAll()[key] || null; }
function moveByName(name) {
  const all = movesAll();
  for (const k in all) if (all[k].name === name) return all[k];
  for (const k in all) if (name && (all[k].name.includes(name) || name.includes(all[k].name))) return all[k];
  return null;
}
function invalidateMoves() { _moves = null; }

// ===== 物品（DB：药品/物资/材料/装备）=====
let _items = null;
function itemAll() {
  if (!_items) {
    _items = {};
    const put = (row, src) => { _items[row.key] = Object.assign({ key: row.key, src }, row); };
    for (const r of db.prepare('SELECT * FROM medicines').all()) put(r, 'medicine');
    for (const r of db.prepare('SELECT * FROM life_goods').all()) put(r, 'life_good');
    for (const r of db.prepare('SELECT * FROM materials').all()) put(r, 'material');
    for (const r of db.prepare('SELECT * FROM equipments').all()) put(r, 'equipment');
  }
  return _items;
}
function itemOf(key) { return itemAll()[key] || null; }
function itemByName(name) {
  if (!name) return null;
  const all = itemAll();
  for (const k in all) if (all[k].name === name) return all[k];
  for (const k in all) if (all[k].name.includes(name) || name.includes(all[k].name)) return all[k];
  return null;
}
function invalidateItems() { _items = null; }
// 物品价格（跑商/商店统一）
function itemPrice(key, rate = 1) {
  const it = itemOf(key);
  if (!it) return 0;
  return (it.price || 0) * rate;
}
// 物品是否可消耗（药品/物资·食物）
function isConsumable(key) {
  const it = itemOf(key);
  if (!it) return false;
  return it.src === 'medicine' || it.src === 'life_good';
}

// ===== 商店（DB）=====
let _shops = null;
function shopsAll() {
  if (!_shops) {
    _shops = [];
    for (const r of db.prepare('SELECT * FROM shops').all()) {
      r.items = JSON.parse(r.items || '[]');
      _shops.push(r);
    }
  }
  return _shops;
}
function shopsAt(nodeId) { return shopsAll().filter(s => s.node_id === nodeId); }
function invalidateShops() { _shops = null; }

// ===== 野怪（DB，实时 alive，到期自动复活）=====
function monstersAt(nodeId) {
  db.prepare('UPDATE monsters SET alive=1, killed_at=0 WHERE node_id=? AND alive=0 AND killed_at>0 AND killed_at + respawn_min*60000 <= ?')
    .run(nodeId, now());
  return db.prepare('SELECT * FROM monsters WHERE node_id=? AND alive=1').all(nodeId);
}
function monsterOf(key) { return db.prepare('SELECT * FROM monsters WHERE key=?').get(key); }

// ===== 派生属性 =====
function equippedMap(p) {
  const rows = db.prepare('SELECT * FROM player_items WHERE player_id=? AND equipped=1').all(p.id);
  const bySlot = {};
  for (const r of rows) {
    if (r.slot === 'accessory') { (bySlot.accessory = bySlot.accessory || []).push(r); }
    else bySlot[r.slot] = r;
  }
  return bySlot;
}
function derivedStats(p) {
  const eq = equippedMap(p);
  let eqAtk = 0, eqDef = 0, eqHp = 0, eqNei = 0;
  const bonus = {};
  let special = null;
  const walk = (it) => {
    eqAtk += it.atk || 0;
    eqDef += it.def || 0;
    let b = {}; try { b = JSON.parse(it.bonuses || '{}'); } catch (e) {}
    for (const k in b) bonus[k] = (bonus[k] || 0) + b[k];
    if (it.special_key) special = it.special_key;
  };
  for (const s of SLOT_KEYS) if (eq[s]) walk(eq[s]);
  if (eq.accessory) for (const it of eq.accessory) walk(it);

  const gen = p.gen || 0, str = p.str || 0, con = p.con || 0, agi = p.agi || 0,
        luck = p.luck || 0, wit = p.wit || 0, lv = p.level || 1;
  return {
    atk: 3 + Math.floor(str * 1.2) + eqAtk,
    def: 1 + Math.floor(gen * 0.5 + con * 0.3) + eqDef,
    max_hp: 40 + gen * 2 + con * 2 + lv * 5 + eqHp,
    max_nei: 20 + con * 2 + wit * 2 + lv * 2 + eqNei,
    crit: Math.min(0.40, 0.05 + luck * 0.003 + (bonus.crit || 0)),
    dodge: Math.min(0.45, 0.03 + agi * 0.004 + (bonus.dodge || 0)),
    hit: Math.min(0.99, 0.90 + agi * 0.002 + (bonus.hit || 0)),
    special,
  };
}

// ===== 升级 =====
function expNeed(lv) { return 100 + lv * 30; }
function addExp(p, amount) {
  if (amount <= 0) return [];
  p.exp = (p.exp || 0) + Math.floor(amount);
  const lines = [];
  while (p.level < 99 && p.exp >= expNeed(p.level)) {
    p.exp -= expNeed(p.level);
    p.level += 1;
    p.free_points = (p.free_points || 0) + 3;
    p.hp = Math.min(p.max_hp, (p.hp || 0) + 15);
    p.nei = Math.min(p.max_nei, (p.nei || 0) + 8);
    lines.push(`🎉 升级了！你现在 Lv.${p.level}（获得 3 点属性点，气血+15，内力+8）`);
  }
  return lines;
}

// ===== 装备实例 =====
function giveEquipment(p, key) {
  const it = itemOf(key);
  if (!it || it.src !== 'equipment') return null;
  db.prepare(`INSERT INTO player_items (player_id,item_key,name,slot,atk,def,rarity,bonuses,special_key,req_level,equipped,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,0,?)`)
    .run(p.id, key, it.name, it.slot, it.atk || 0, it.def || 0, it.rarity, it.bonuses || '{}', it.special_key || null, it.req_level || 1, now());
  return it;
}
function equipItem(p, itemKey) {
  const it = itemOf(itemKey);
  if (!it || it.src !== 'equipment') {
    // 支持按名字
    const byName = itemByName(itemKey);
    if (byName && byName.src === 'equipment') return equipItem(p, byName.key);
    return { ok: false, msg: '这不是装备，没法穿。' };
  }
  const row = db.prepare('SELECT * FROM player_items WHERE player_id=? AND item_key=? AND equipped=0 ORDER BY id DESC LIMIT 1').get(p.id, it.key);
  if (!row) return { ok: false, msg: `你身上没有「${it.name}」。` };
  if ((p.level || 1) < (it.req_level || 1)) return { ok: false, msg: `需要 Lv.${it.req_level} 才能装备「${it.name}」。` };
  // 卸同槽（accessory 可叠 2 件，其余 1 件）
  if (it.slot !== 'accessory') {
    const cur = db.prepare('SELECT id FROM player_items WHERE player_id=? AND equipped=1 AND slot=? AND id!=?').all(p.id, it.slot, row.id);
    for (const c of cur) db.prepare('UPDATE player_items SET equipped=0 WHERE id=?').run(c.id);
  } else {
    const cur = db.prepare('SELECT id FROM player_items WHERE player_id=? AND equipped=1 AND slot=? AND id!=?').all(p.id, 'accessory', row.id);
    if (cur.length >= 2) { db.prepare('UPDATE player_items SET equipped=0 WHERE id=?').run(cur[cur.length - 1].id); }
  }
  db.prepare('UPDATE player_items SET equipped=1 WHERE id=?').run(row.id);
  return { ok: true, msg: `你穿上了「${it.name}」（${SLOT_NAMES[it.slot]}）。` };
}
function unequipSlot(p, slotOrName) {
  let slot = SLOT_KEYS.includes(slotOrName) ? slotOrName : Object.keys(SLOT_NAMES).find(k => SLOT_NAMES[k] === slotOrName);
  if (!slot) return { ok: false, msg: '要脱哪个部位？头戴/手拿/脚踏/身穿/护腕/配饰' };
  const row = db.prepare('SELECT * FROM player_items WHERE player_id=? AND equipped=1 AND slot=? ORDER BY id DESC LIMIT 1').get(p.id, slot);
  if (!row) return { ok: false, msg: `你没穿【${SLOT_NAMES[slot]}】。` };
  db.prepare('UPDATE player_items SET equipped=0 WHERE id=?').run(row.id);
  return { ok: true, msg: `你脱下了「${row.name}」。` };
}
function equipList(p) {
  const rows = db.prepare('SELECT * FROM player_items WHERE player_id=?').all(p.id);
  const inv = [], worn = [];
  for (const r of rows) (r.equipped ? worn : inv).push(r);
  return { worn, inv };
}

// ===== 消耗品（inventory 表，按 key 聚合）=====
function invCount(p, key) {
  const r = db.prepare('SELECT count FROM inventory WHERE player_id=? AND item_key=?').get(p.id, key);
  return r ? (r.count || 0) : 0;
}
function addItem(p, key, n = 1) {
  const c = invCount(p, key);
  if (c > 0) db.prepare('UPDATE inventory SET count=count+? WHERE player_id=? AND item_key=?').run(n, p.id, key);
  else db.prepare('INSERT INTO inventory (player_id,item_key,count,created_at) VALUES (?,?,?,?)').run(p.id, key, n, now());
}
function consumeItem(p, key, n = 1) {
  const c = invCount(p, key);
  if (c < n) return false;
  if (c - n <= 0) db.prepare('DELETE FROM inventory WHERE player_id=? AND item_key=?').run(p.id, key);
  else db.prepare('UPDATE inventory SET count=count-? WHERE player_id=? AND item_key=?').run(n, p.id, key);
  return true;
}
// 用消耗品（可指定数量），返回 {ok,lines,used}
function useItem(p, keyOrName, n = 1) {
  let it = itemOf(keyOrName) || itemByName(keyOrName);
  if (!it) return { ok: false, msg: `你身上没有「${keyOrName}」。` };
  if (!isConsumable(it.key)) return { ok: false, msg: `「${it.name}」不是能吃/能用的消耗品。${it.src === 'equipment' ? '要装备请打：穿 ' + it.name : ''}` };
  const c = invCount(p, it.key);
  if (c < 1) return { ok: false, msg: `你身上没有「${it.name}」。` };
  n = Math.max(1, Math.min(n, c));
  const lines = [];
  for (let i = 0; i < n; i++) {
    if (it.full_heal) { p.hp = p.max_hp; p.nei = p.max_nei; lines.push(`「${it.name}」让你气血内力全满！`); break; }
    if (it.heal) { const amt = Math.min(it.heal, p.max_hp - p.hp); p.hp += amt; lines.push(`你用了「${it.name}」，回复 ${amt} 血。`); }
    if (it.nei) { const amt = Math.min(it.nei, p.max_nei - p.nei); p.nei += amt; lines.push(`你用了「${it.name}」，回复 ${amt} 内力。`); }
    if (it.kind === 'cure' && it.cure) lines.push(`「${it.name}」解除了中毒/异常状态。`);
  }
  consumeItem(p, it.key, n);
  return { ok: true, lines, used: n };
}

// ===== 战斗 · 野怪（回合制 + 特殊属性 + 克制）=====
// opts: { ws, p, monsterKey, push, pushOne, savePlayer, sync, playerOf, broadcastAll }
function combatMonster(opts) {
  const { ws, p, monsterKey, push, pushOne, savePlayer, sync } = opts;
  const m = monsterOf(monsterKey);
  if (!m || !m.alive) { pushOne(ws, 'err', '这里的野怪已经跑了。'); return; }
  const d = derivedStats(p);
  let mhp = m.hp, php = p.hp, pnei = p.nei;
  let poisonOnMon = 0, burnOnMon = 0;   // 挂在怪身上的 DoT
  let freezePlayer = 0, poisonOnPlayer = 0;
  const log = [];
  const learned = db.prepare('SELECT move_key FROM player_moves WHERE player_id=?').all(p.id).map(r => r.move_key);
  const atkMoves = learned.map(moveOf).filter(mv => mv && mv.damage && mv.damage[1] > 0);
  const pool = atkMoves.length ? atkMoves : [moveOf('mp01')].filter(Boolean);

  for (let round = 1; round <= 12; round++) {
    // —— 玩家回合 ——
    if (freezePlayer > 0) { freezePlayer--; log.push(`${round}. 你被定住，动弹不得！`); }
    else {
      const move = choice(pool);
      let dmg = range(move.damage) + Math.floor(d.atk * 0.4);
      // 克制
      if (move.counter && COUNTER[move.counter] === m.style) dmg = Math.round(dmg * 1.3);
      else if (move.counter && COUNTER[m.style] === move.counter) dmg = Math.round(dmg * 0.7);
      dmg = Math.max(1, dmg - Math.floor(m.def / 2));
      // 暴击
      let critHit = false;
      if (Math.random() < d.crit) { dmg = Math.round(dmg * 1.8); critHit = true; }
      // 命中/闪避（怪闪避按等级）
      if (Math.random() > d.hit + 0.3) { log.push(`${round}. 你挥出「${move.name}」，但被 ${m.name} 躲开了。`); }
      else {
        mhp -= dmg;
        log.push(`${round}. 你使出「${move.name}」，造成 ${dmg} 伤害${critHit ? '（暴击！）' : ''}。`);
        // 武器特殊属性
        if (d.special && Math.random() < 0.3) {
          if (d.special === 'poison') { poisonOnMon = 3; log.push(`　　${m.name} 中毒了！`); }
          else if (d.special === 'burn') { burnOnMon = 3; log.push(`　　${m.name} 被灼烧！`); }
        }
        // 招特殊
        if (move.special_key === 'poison') { poisonOnMon = 3; }
        if (move.special_key === 'burn') { burnOnMon = 3; }
        if (move.special_key === 'freeze' && Math.random() < 0.2) { /* 冻住怪=下回合它不动 */ log.push(`　　${m.name} 被冻住了！`); }
      }
      if (move.nei_cost) { if (pnei >= move.nei_cost) pnei -= move.nei_cost; else dmg = Math.round(dmg * 0.7); }
    }
    // 怪身上 DoT
    if (poisonOnMon > 0) { poisonOnMon--; mhp -= 5; log.push(`　　毒在侵蚀 ${m.name}（-5）。`); }
    if (burnOnMon > 0) { burnOnMon--; mhp -= 4; log.push(`　　灼烧灼痛 ${m.name}（-4）。`); }
    if (mhp <= 0) break;

    // —— 怪回合 ——
    let mdmg = Math.max(1, rand(m.atk - 2, m.atk + 2) - Math.floor(d.def / 3));
    if (Math.random() < d.dodge) { log.push(`${round}. ${m.name}扑来，你身形一闪，避开了！`); }
    else {
      php -= mdmg;
      log.push(`${round}. ${m.name}反击，你受到 ${mdmg} 伤害。`);
    }
    if (poisonOnPlayer > 0) { poisonOnPlayer--; php -= 3; log.push(`　　你中毒，-3。`); }
    if (php <= 0) break;
  }

  const win = mhp <= 0;
  if (win) {
    db.prepare('UPDATE monsters SET alive=0, killed_at=? WHERE key=?').run(now(), m.key);
    p.silver += m.silver;
    p.fame += Math.round(m.exp / 10);
    const expLines = addExp(p, m.exp);
    // 掉落
    const drops = [];
    try {
      const dropList = JSON.parse(m.drops || '[]');
      for (const dr of dropList) {
        if (Math.random() <= (dr.chance || 0)) {
          if (dr.key === 'orange_equipment') {
            const orange = db.prepare("SELECT key FROM equipments WHERE rarity='橙'").all().map(r => r.key);
            const k = orange.length ? choice(orange) : null;
            if (k) { giveEquipment(p, k); drops.push('一件【橙色】神兵！'); }
          } else {
            addItem(p, dr.key, dr.count || 1);
            drops.push(`${itemOf(dr.key) ? itemOf(dr.key).name : dr.key} ×${dr.count || 1}`);
          }
        }
      }
    } catch (e) {}
    push(ws, [
      ...log.map(l => ({ kind: 'dim', text: l })),
      { kind: 'faction', text: `🏆 你击败了 ${m.name}！银两 +${m.silver}，经验 +${m.exp}。` },
      ...expLines.map(t => ({ kind: 'sys', text: t })),
      ...(drops.length ? [{ kind: 'sys', text: '💰 掉落：' + drops.join('、') }] : []),
    ]);
    if (opts.broadcastAll) {
      const nodeName = (opts.NODES && opts.NODES[m.node_id]) ? opts.NODES[m.node_id].name : m.node_id;
      opts.broadcastAll([{ kind: 'rumor', text: `${p.name} 在 ${nodeName} 讨伐了 ${m.name}。` }]);
    }
  } else {
    const fameLoss = Math.max(1, Math.round(p.fame / 30));
    p.fame = Math.max(0, p.fame - fameLoss);
    php = 0;
    push(ws, [
      ...log.map(l => ({ kind: 'dim', text: l })),
      { kind: 'combat', text: `💀 你被 ${m.name} 打倒了……名望 -${fameLoss}，昏迷片刻。` },
    ]);
    const pid = p.id;
    setTimeout(() => {
      const pr = opts.playerOf ? opts.playerOf(pid) : null;
      if (pr) { pr.hp = Math.max(10, Math.floor(pr.max_hp * 0.2)); opts.savePlayer(pr); if (opts.ws && opts.ws.readyState === 1) opts.sync(opts.ws, pr); }
    }, 90000);
  }
  p.hp = Math.max(0, php);
  p.nei = Math.max(0, pnei);
  savePlayer(p);
  sync(ws, p);
}

// ===== 木人桩（熟练度 0-10）=====
function dummyPractice(ws, p, push, pushOne, savePlayer, sync) {
  if ((p.dummy_prof || 0) >= 10) { pushOne(ws, 'dim', '你的木人桩已经练到极境（熟练度 10/10），无需再练。'); return; }
  p.dummy_prof = (p.dummy_prof || 0) + 1;
  const expLines = addExp(p, 2);
  // 木人桩也涨一点点门派熟练（这里给通用 4 招各 0.5 熟练，简化为经验）
  savePlayer(p); sync(ws, p);
  push(ws, [
    { kind: 'combat', text: '你对着木人桩挥汗如雨地练了一通拳脚。' },
    ...expLines.map(t => ({ kind: 'sys', text: t })),
    { kind: 'dim', text: `木人桩熟练度 ${p.dummy_prof}/10　（经验 +2）` },
  ]);
}

// ===== 生活技能进度 =====
function lifeSkillLv(p, skillKey) {
  const r = db.prepare('SELECT level, exp FROM player_life_skills WHERE player_id=? AND skill_key=?').get(p.id, skillKey);
  return r ? r : { level: 0, exp: 0 };
}
function addLifeSkillExp(p, skillKey, exp) {
  const cur = lifeSkillLv(p, skillKey);
  let level = cur.level, e = cur.exp + exp;
  const need = (lv) => 50 + lv * 40;
  while (level < 10 && e >= need(level)) { e -= need(level); level++; }
  db.prepare(`INSERT INTO player_life_skills (player_id, skill_key, level, exp) VALUES (?,?,?,?)
    ON CONFLICT(player_id, skill_key) DO UPDATE SET level=excluded.level, exp=excluded.exp`)
    .run(p.id, skillKey, level, e);
  return { level, exp: e };
}

// ===== 采集 =====
function collect(ws, p, push, pushOne, savePlayer, sync) {
  const node = db.prepare('SELECT * FROM nodes WHERE id=?').get(p.location_id);
  const points = db.prepare('SELECT * FROM collecting_nodes WHERE node_id=?').all(p.location_id);
  if (!points.length) { pushOne(ws, 'dim', '这里没有可采集的资源点。去山林/海边/矿脉试试。'); return; }
  // 找玩家已学且匹配的技能点
  let done = 0;
  const gains = [];
  for (const pt of points) {
    const skill = lifeSkillLv(p, pt.skill_key);
    const chance = Math.min(0.95, 0.4 + skill.level * 0.05);
    if (Math.random() < chance) {
      const got = rand(1, 2);
      addItem(p, pt.material_key, got);
      addLifeSkillExp(p, pt.skill_key, 8);
      gains.push(`${itemOf(pt.material_key) ? itemOf(pt.material_key).name : pt.material_key} ×${got}`);
      done++;
    }
  }
  if (done === 0) { pushOne(ws, 'dim', '你忙活半天，一无所获。提升对应生活技能可以提高成功率。'); return; }
  const expLines = addExp(p, 3);
  savePlayer(p); sync(ws, p);
  push(ws, [
    { kind: 'sys', text: '🌿 你在' + (node ? node.name : '此处') + '采集到：' + gains.join('、') },
    ...expLines.map(t => ({ kind: 'sys', text: t })),
  ]);
}

// ===== 制造（炼药/锻造/烹饪/缝纫）=====
function craft(ws, p, recipeKey, push, pushOne, savePlayer, sync) {
  const recipes = db.prepare('SELECT * FROM recipes').all();
  function doCraft(key) {
    const rc = recipes.find(r => r.key === key) || recipes.find(r => r.name.includes(key));
    if (!rc) return { ok: false, msg: '没有这个配方。' };
    const skill = lifeSkillLv(p, rc.skill_key);
    if (skill.level < (rc.level_req || 0)) return { ok: false, msg: `需要【${rc.skill_key}】Lv.${rc.level_req}。你现在 Lv.${skill.level}。` };
    const inputs = JSON.parse(rc.inputs || '{}');
    for (const [mk, n] of Object.entries(inputs)) {
      if (invCount(p, mk) < n) return { ok: false, msg: `材料不足：缺 ${itemOf(mk) ? itemOf(mk).name : mk} ×${n}。` };
    }
    const rate = Math.min(0.98, (rc.success_rate || 0.5) + skill.level * 0.02);
    for (const [mk, n] of Object.entries(inputs)) consumeItem(p, mk, n);
    if (Math.random() < rate) {
      if (rc.output_type === 'equipment') giveEquipment(p, rc.output_key);
      else addItem(p, rc.output_key, rc.count || 1);
      addLifeSkillExp(p, rc.skill_key, 15);
      addExp(p, 5);
      return { ok: true, msg: `✅ 炼制成功：${itemOf(rc.output_key) ? itemOf(rc.output_key).name : rc.output_key} ×${rc.count || 1}` };
    } else {
      addLifeSkillExp(p, rc.skill_key, 5);
      return { ok: false, msg: '❌ 炼制失败了，材料散了。多练手艺可提高成功率。' };
    }
  }
  if (!recipeKey) {
    const lines = [{ kind: 'room', text: '【可炼制】（制造 <配方名>）' }];
    for (const rc of recipes) {
      const skill = lifeSkillLv(p, rc.skill_key);
      const inputs = JSON.parse(rc.inputs || '{}');
      const inStr = Object.entries(inputs).map(([mk, n]) => `${itemOf(mk) ? itemOf(mk).name : mk}×${n}`).join('+');
      const can = skill.level >= (rc.level_req || 0) ? '' : `（需${rc.skill_key} Lv${rc.level_req}）`;
      lines.push({ kind: 'sys', text: `${rc.name}　原料：${inStr} → ${itemOf(rc.output_key) ? itemOf(rc.output_key).name : rc.output_key}${can}` });
    }
    push(ws, lines);
    return;
  }
  const res = doCraft(recipeKey);
  savePlayer(p); sync(ws, p);
  pushOne(ws, res.ok ? 'faction' : 'err', res.msg);
}

module.exports = {
  ATTR_NAMES, ATTR_KEYS, SLOT_NAMES, SLOT_KEYS, COUNTER_CN, COUNTER,
  movesAll, moveOf, moveByName, invalidateMoves,
  itemAll, itemOf, itemByName, itemPrice, isConsumable, invalidateItems,
  shopsAll, shopsAt, invalidateShops,
  monstersAt, monsterOf,
  equippedMap, derivedStats, expNeed, addExp,
  giveEquipment, equipItem, unequipSlot, equipList,
  invCount, addItem, consumeItem, useItem,
  combatMonster, dummyPractice,
  lifeSkillLv, addLifeSkillExp, collect, craft,
};
