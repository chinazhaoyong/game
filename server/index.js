'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { WebSocketServer } = require('ws');
const { db } = require('./db');
const { createGame, hashPass, makeSession } = require('./game');
const RPG = require('./rpg_system');

const PORT = parseInt(process.env.PORT, 10) || 7788;
const PUBLIC = path.join(__dirname, '..', 'public');
const NAME_RE = /^[\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z0-9_]{1,11}$/;

// 启动
// 启动前：如果数据库是空的（首次部署），自动 seed
try {
  const questCount = db.prepare('SELECT COUNT(*) as c FROM quests').get();
  const npcCount = db.prepare('SELECT COUNT(*) as c FROM npc_core').get();
  if (questCount?.c === 0 || npcCount?.c === 0) {
    console.log('[init] 数据库是空的，自动 seed...');
    require('./seed').init();
    console.log('[init] seed 完成。');
  }
} catch (e) {
  console.warn('[init] seed 检测跳过:', e.message);
}

const game = createGame();

// —— 读取请求体 ——
async function readBody(req) {
  return new Promise((res, rej) => {
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => {
      try { res(data ? JSON.parse(data) : {}); } catch (e) { rej(e); }
    });
    req.on('error', rej);
  });
}

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

// —— GM 鉴权（默认 admin123，改这里）——
const GM_PASSWORD = process.env.GM_PASS || 'admin123';

// —— HTTP 路由 ——
async function handleApi(req, res) {
  let body;
  try { body = await readBody(req); } catch { return json(res, 400, { error: '请求格式不对。' }); }

  const name = String(body.name || '').trim();
  const pass = String(body.pass || '');
  const token = String(body.token || '');

  // 掷属性（注册前预览/重掷）：8 维各 rand(5,15)，总和阈值 64–96
  if (req.url === '/api/roll-attrs' && req.method === 'POST') {
    const keys = ['gen','str','con','agi','luck','cha','wit','fortune'];
    const attrs = {};
    for (const k of keys) attrs[k] = 5 + Math.floor(Math.random() * 11);
    return json(res, 200, { attrs });
  }

  if (req.url === '/api/register') {
    if (!NAME_RE.test(name)) return json(res, 400, { error: '角色名 2–12 字，只能是汉字、字母、数字或下划线。' });
    if (pass.length < 4 || pass.length > 64) return json(res, 400, { error: '口令至少 4 位。' });
    const exists = db.prepare('SELECT id FROM players WHERE name = ?').get(name);
    if (exists) return json(res, 409, { error: '这个名字已经有人了。' });
    // 8 维属性：前端传来则校验阈值（各项 5–15，总和 64–96），否则随机生成
    const keys = ['gen','str','con','agi','luck','cha','wit','fortune'];
    let attrs = {};
    const src = body.attrs || {};
    let valid = keys.every(k => Number.isFinite(Number(src[k])) && Number(src[k]) >= 5 && Number(src[k]) <= 15);
    if (valid) {
      for (const k of keys) attrs[k] = Math.floor(Number(src[k]));
      const total = keys.reduce((s, k) => s + attrs[k], 0);
      if (total < 64 || total > 96) valid = false;
    }
    if (!valid) for (const k of keys) attrs[k] = 5 + Math.floor(Math.random() * 11);
    const maxHp = 40 + attrs.gen * 2 + attrs.con * 2;
    const maxNei = 20 + attrs.con * 2 + attrs.wit * 2;
    const salt = crypto.randomBytes(12).toString('hex');
    db.prepare(`INSERT INTO players (name,pass,created_at,level,exp,gen,str,con,agi,luck,cha,wit,fortune,hp,max_hp,nei,max_nei,free_points)
      VALUES (?,?,?,1,0,?,?,?,?,?,?,?,?,?,?,?,?,0)`)
      .run(name, `${salt}$${hashPass(pass, salt)}`, Date.now(),
        attrs.gen, attrs.str, attrs.con, attrs.agi, attrs.luck, attrs.cha, attrs.wit, attrs.fortune,
        maxHp, maxHp, maxNei, maxNei);
    const newToken = makeSession(db.prepare('SELECT last_insert_rowid() as id').get().id);
    return json(res, 200, { token: newToken, name, attrs });
  }

  if (req.url === '/api/login') {
    if (!NAME_RE.test(name)) return json(res, 400, { error: '角色名 2–12 字。' });
    if (pass.length < 4) return json(res, 400, { error: '口令至少 4 位。' });
    const p = db.prepare('SELECT * FROM players WHERE name = ?').get(name);
    if (!p) return json(res, 401, { error: '没有这个名字。' });
    const [salt, hashed] = String(p.pass).split('$');
    if (!salt || !hashed || hashPass(pass, salt) !== hashed) {
      return json(res, 401, { error: '口令不对。' });
    }
    const newToken = makeSession(Number(p.id));
    return json(res, 200, { token: newToken, name: p.name });
  }

  if (req.url === '/api/password') {
    // 修改密码：token + 旧密码 + 新密码
    if (!token) return json(res, 401, { error: '未登录。' });
    const sess = db.prepare('SELECT player_id FROM sessions WHERE token=?').get(token);
    if (!sess) return json(res, 401, { error: '登录已过期。' });
    const p = db.prepare('SELECT * FROM players WHERE id=?').get(sess.player_id);
    const oldPass = String(body.old || '');
    const newPass = String(body.new || '');
    if (!oldPass || !newPass) return json(res, 400, { error: '请输入旧口令和新口令。' });
    if (newPass.length < 4) return json(res, 400, { error: '新口令至少 4 位。' });
    const [salt, hashed] = String(p.pass).split('$');
    if (hashPass(oldPass, salt) !== hashed) return json(res, 401, { error: '旧口令不对。' });
    const newSalt = crypto.randomBytes(12).toString('hex');
    db.prepare('UPDATE players SET pass=? WHERE id=?').run(`${newSalt}$${hashPass(newPass, newSalt)}`, p.id);
    return json(res, 200, { ok: true });
  }

  if (req.url === '/api/logout') {
    if (token) db.prepare('DELETE FROM sessions WHERE token=?').run(token);
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'not found' });
}

// —— GM API ——
function gmAuth(req) {
  const auth = req.headers.authorization || '';
  if (auth === `Bearer ${GM_PASSWORD}`) return true;
  // 也支持 query 参数
  const u = new URL(req.url, 'http://x');
  if (u.searchParams.get('key') === GM_PASSWORD) return true;
  return false;
}

async function handleGmApi(req, res) {
  if (!gmAuth(req)) return json(res, 401, { error: 'GM 口令不对。' });
  const u = new URL(req.url, 'http://x');
  const body = req.method === 'POST' ? await readBody(req).catch(() => ({})) : {};

  // 服务器状态
  if (u.pathname === '/api/gm/status') {
    const total = db.prepare('SELECT COUNT(*) as c FROM players').get().c;
    const online = game.onlineCount();
    return json(res, 200, { total, online, uptime: process.uptime() });
  }

  // 玩家列表
  if (u.pathname === '/api/gm/players') {
    const q = String(u.searchParams.get('q') || '').trim();
    let rows;
    const PCOLS = 'id,name,hp,max_hp,nei,max_nei,silver,fame,infamy,faction_id,rank,location_id,domain_id,joined_at,level,exp,free_points,gen,str,con,agi,luck,cha,wit,fortune,dummy_prof';
    if (q) {
      rows = db.prepare(`SELECT ${PCOLS} FROM players WHERE name LIKE ? ORDER BY fame DESC LIMIT 100`).all('%' + q + '%');
    } else {
      rows = db.prepare(`SELECT ${PCOLS} FROM players ORDER BY fame DESC LIMIT 200`).all();
    }
    const online = game.onlinePlayers();
    rows = rows.map(r => ({ ...r, is_online: online.has(Number(r.id)) }));
    return json(res, 200, { players: rows, online_count: online.size });
  }

  // 玩家详情
  if (u.pathname === '/api/gm/player') {
    const id = Number(u.searchParams.get('id'));
    const p = db.prepare('SELECT * FROM players WHERE id=?').get(id);
    if (!p) return json(res, 404, { error: '玩家不存在。' });
    const inv = db.prepare('SELECT item_key,count FROM inventory WHERE player_id=?').all(id)
      .map(r => { const it = RPG.itemOf(r.item_key); return { key: r.item_key, count: r.count, name: (it && it.name) || r.item_key }; });
    const moves = db.prepare('SELECT move_key FROM player_moves WHERE player_id=?').all(id)
      .map(r => { const m = RPG.moveOf(r.move_key); return { key: r.move_key, name: (m && m.name) || r.move_key }; });
    const equipment = db.prepare('SELECT id,item_key,name,slot,atk,def,rarity,req_level,equipped FROM player_items WHERE player_id=?').all(id);
    const life = db.prepare('SELECT pls.skill_key, ls.name, pls.level, pls.exp FROM player_life_skills pls LEFT JOIN life_skills ls ON ls.key=pls.skill_key WHERE pls.player_id=?').all(id);
    const quests = db.prepare('SELECT pq.quest_key, pq.status, q.title FROM player_quests pq LEFT JOIN quests q ON q.key=pq.quest_key WHERE pq.player_id=?').all(id)
      .map(r => ({ key: r.quest_key, status: r.status, title: r.title || r.quest_key }));
    return json(res, 200, { player: p, inventory: inv, moves: moves, equipment, life, quests });
  }

  // 修改玩家属性
  if (u.pathname === '/api/gm/player/edit' && req.method === 'POST') {
    const id = Number(body.id);
    const p = db.prepare('SELECT * FROM players WHERE id=?').get(id);
    if (!p) return json(res, 404, { error: '玩家不存在。' });
    const allowed = ['hp','max_hp','nei','max_nei','silver','fame','infamy','title','faction_id','rank','location_id','domain_id',
      'level','exp','free_points','dummy_prof','gen','str','con','agi','luck','cha','wit','fortune','contrib'];
    const sets = []; const vals = [];
    for (const k of allowed) {
      if (k in body) { sets.push(`${k}=?`); vals.push(body[k]); }
    }
    if (sets.length === 0) return json(res, 400, { error: '没有要改的字段。' });
    vals.push(id);
    db.prepare(`UPDATE players SET ${sets.join(',')} WHERE id=?`).run(...vals);
    game.notifyPlayer(id);
    return json(res, 200, { ok: true });
  }

  // 给物品（消耗品/材料走 inventory 聚合，装备走 player_items 实例化）
  if (u.pathname === '/api/gm/item/give' && req.method === 'POST') {
    const id = Number(body.id);
    const key = String(body.key || '').trim();
    const count = Math.max(1, Number(body.count || 1));
    if (!key) return json(res, 400, { error: '物品 key 不能为空。' });
    const it = RPG.itemOf(key) || RPG.itemByName(key);
    if (!it) return json(res, 400, { error: `物品 ${key} 不存在。` });
    const pStub = { id };
    if (it.src === 'equipment') {
      for (let i = 0; i < count; i++) RPG.giveEquipment(pStub, it.key);
    } else {
      RPG.addItem(pStub, it.key, count);
    }
    game.notifyPlayer(id);
    return json(res, 200, { ok: true, name: it.name, count });
  }

  // 删物品
  if (u.pathname === '/api/gm/item/remove' && req.method === 'POST') {
    const id = Number(body.id);
    const key = String(body.key || '').trim();
    const count = Math.max(1, Number(body.count || 1));
    const rows = db.prepare('SELECT id,count FROM inventory WHERE player_id=? AND item_key=? LIMIT ?').all(id, key, count);
    for (const r of rows) {
      if (r.count <= 1) db.prepare('DELETE FROM inventory WHERE id=?').run(r.id);
      else db.prepare('UPDATE inventory SET count=count-1 WHERE id=?').run(r.id);
    }
    return json(res, 200, { ok: true, removed: rows.length });
  }

  // 学武功
  if (u.pathname === '/api/gm/move/learn' && req.method === 'POST') {
    const id = Number(body.id);
    const key = String(body.key || '').trim();
    if (!key) return json(res, 400, { error: '武功 key 不能为空。' });
    try { db.prepare('INSERT INTO player_moves (player_id,move_key,learned_at) VALUES (?,?,?)').run(id, key, Date.now()); } catch(e) {}
    return json(res, 200, { ok: true });
  }

  // 删武功
  if (u.pathname === '/api/gm/move/forget' && req.method === 'POST') {
    const id = Number(body.id);
    const key = String(body.key || '').trim();
    db.prepare('DELETE FROM player_moves WHERE player_id=? AND move_key=?').run(id, key);
    return json(res, 200, { ok: true });
  }

  // 装备库列表（前端下拉用）
  if (u.pathname === '/api/gm/equipment/list') {
    const list = db.prepare('SELECT key,name,slot,type,atk,def,rarity,req_level,price FROM equipments ORDER BY req_level,price').all();
    return json(res, 200, { equipment: list });
  }

  // 赐装备（按 key 实例化到 player_items）
  if (u.pathname === '/api/gm/equipment/give' && req.method === 'POST') {
    const id = Number(body.id);
    const key = String(body.key || '').trim();
    const count = Math.max(1, Number(body.count || 1));
    const pStub = { id };
    let given = 0;
    for (let i = 0; i < count; i++) { if (RPG.giveEquipment(pStub, key)) given++; }
    if (!given) return json(res, 400, { error: `装备 ${key} 不存在。` });
    game.notifyPlayer(id);
    return json(res, 200, { ok: true, given });
  }

  // 删除玩家装备实例（player_items 行）
  if (u.pathname === '/api/gm/equipment/remove' && req.method === 'POST') {
    const eid = Number(body.eid);
    const r = db.prepare('SELECT id,player_id,name FROM player_items WHERE id=?').get(eid);
    if (!r) return json(res, 404, { error: '装备实例不存在。' });
    db.prepare('DELETE FROM player_items WHERE id=?').run(eid);
    game.notifyPlayer(r.player_id);
    return json(res, 200, { ok: true });
  }

  // 生活技能列表 / 设置等级
  if (u.pathname === '/api/gm/lifeskill/list') {
    const skills = db.prepare('SELECT key,name,branch,tool_req FROM life_skills').all();
    return json(res, 200, { skills });
  }
  if (u.pathname === '/api/gm/lifeskill/set' && req.method === 'POST') {
    const id = Number(body.id);
    const skill = String(body.skill || '').trim();
    const level = Math.min(10, Math.max(0, Number(body.level || 0)));
    if (!db.prepare('SELECT key FROM life_skills WHERE key=?').get(skill)) return json(res, 400, { error: '生活技能不存在。' });
    db.prepare(`INSERT INTO player_life_skills (player_id,skill_key,level,exp) VALUES (?,?,?,0)
      ON CONFLICT(player_id, skill_key) DO UPDATE SET level=excluded.level, exp=0`).run(id, skill, level);
    game.notifyPlayer(id);
    return json(res, 200, { ok: true, skill, level });
  }

  // 野怪列表 / 复活重置
  if (u.pathname === '/api/gm/monster/list') {
    const node = String(u.searchParams.get('node') || '').trim();
    const rows = node
      ? db.prepare('SELECT key,name,node_id,level,hp,atk,def,exp,silver,alive,respawn_min FROM monsters WHERE node_id=?').all(node)
      : db.prepare('SELECT key,name,node_id,level,hp,atk,def,exp,silver,alive,respawn_min FROM monsters ORDER BY level').all();
    return json(res, 200, { monsters: rows });
  }
  if (u.pathname === '/api/gm/monster/reset' && req.method === 'POST') {
    if (body.all) {
      db.prepare('UPDATE monsters SET alive=1, killed_at=0').run();
      return json(res, 200, { ok: true, scope: 'all' });
    }
    const key = String(body.key || '').trim();
    const r = db.prepare('UPDATE monsters SET alive=1, killed_at=0 WHERE key=?').run(key);
    if (!r.changes) return json(res, 400, { error: `野怪 ${key} 不存在。` });
    return json(res, 200, { ok: true, key });
  }

  // 直接加经验（走 RPG.addExp 真实升级逻辑）
  if (u.pathname === '/api/gm/player/addexp' && req.method === 'POST') {
    const id = Number(body.id);
    const amount = Number(body.exp || 0);
    if (!Number.isFinite(amount) || amount === 0) return json(res, 400, { error: 'exp 需为非零数字。' });
    const p = db.prepare('SELECT * FROM players WHERE id=?').get(id);
    if (!p) return json(res, 404, { error: '玩家不存在。' });
    p.id = Number(p.id);
    const d = RPG.derivedStats(p);
    p.max_hp = d.max_hp; p.max_nei = d.max_nei;
    const lvBefore = p.level || 1;
    const lines = RPG.addExp(p, amount);
    db.prepare(`UPDATE players SET level=?,exp=?,free_points=?,hp=?,max_hp=?,nei=?,max_nei=? WHERE id=?`)
      .run(p.level, p.exp, p.free_points || 0, p.hp, p.max_hp, p.nei, p.max_nei, id);
    game.notifyPlayer(id);
    return json(res, 200, { ok: true, exp: amount, level_before: lvBefore, level_after: p.level, upgrades: lines });
  }

  // 传送玩家
  if (u.pathname === '/api/gm/player/teleport' && req.method === 'POST') {
    const id = Number(body.id);
    const loc = String(body.location || '').trim();
    const dom = String(body.domain || '').trim();
    if (loc) db.prepare('UPDATE players SET location_id=? WHERE id=?').run(loc, id);
    if (dom) db.prepare('UPDATE players SET domain_id=? WHERE id=?').run(dom, id);
    game.notifyPlayer(id);
    return json(res, 200, { ok: true });
  }

  // 踢人
  if (u.pathname === '/api/gm/player/kick' && req.method === 'POST') {
    const id = Number(body.id);
    game.kickPlayer(id, body.reason || 'GM 踢你下线了。');
    return json(res, 200, { ok: true });
  }

  // 删玩家（危险！）
  if (u.pathname === '/api/gm/player/delete' && req.method === 'POST') {
    const id = Number(body.id);
    const confirm = String(body.confirm || '');
    if (confirm !== 'DELETE') return json(res, 400, { error: '请输入 DELETE 确认。' });
    db.prepare('DELETE FROM players WHERE id=?').run(id);
    db.prepare('DELETE FROM inventory WHERE player_id=?').run(id);
    db.prepare('DELETE FROM player_moves WHERE player_id=?').run(id);
    db.prepare('DELETE FROM player_quests WHERE player_id=?').run(id);
    game.kickPlayer(id, '你的角色已被 GM 删除。');
    return json(res, 200, { ok: true });
  }

  // 搜武功（DB moves 全量 604+）
  if (u.pathname === '/api/gm/moves') {
    const q = String(u.searchParams.get('q') || '').trim();
    const all = RPG.movesAll();
    const list = all
      .filter(m => !q || m.key.includes(q) || (m.name || '').includes(q))
      .slice(0, 100)
      .map(m => ({ key: m.key, name: m.name, type: m.type, faction: m.faction }));
    return json(res, 200, { moves: list });
  }

  // 搜物品（DB 合并：装备/药品/材料/生活物资 + content 跑商货）
  if (u.pathname === '/api/gm/items') {
    const q = String(u.searchParams.get('q') || '').trim();
    const list = RPG.itemAll()
      .filter(it => !q || it.key.includes(q) || (it.name || '').includes(q))
      .slice(0, 200)
      .map(it => ({ key: it.key, name: it.name, type: it.src || it.kind }));
    return json(res, 200, { items: list });
  }

  // 关闭服务器（危险！）
  if (u.pathname === '/api/gm/shutdown' && req.method === 'POST') {
    const confirm = String(body.confirm || '');
    if (confirm !== 'SHUTDOWN') return json(res, 400, { error: '请输入 SHUTDOWN 确认。' });
    json(res, 200, { ok: true });
    setTimeout(() => {
      console.log('[GM] 服务器正在关闭...');
      process.exit(0);
    }, 500);
    return;
  }

  return json(res, 404, { error: 'GM API not found' });
}

// —— 静态文件 ——
function serveStatic(req, res) {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.join(PUBLIC, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('404'); return; }
    const ext = path.extname(file);
    const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg' }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    // GM 面板统一由控制台(7790)提供；谁访问游戏服务的 /gm 都跳到控制台
    const CONSOLE_PORT = 7790;
    if (req.url === '/gm.html' || req.url === '/gm' || req.url === '/gm/') {
      const host = (req.headers.host || '').replace(/:\d+$/, '') || 'localhost';
      res.writeHead(302, { Location: `http://${host}:${CONSOLE_PORT}/gm.html` });
      return res.end();
    }
    if (req.url.startsWith('/api/gm/')) await handleGmApi(req, res);
    else if (req.url.startsWith('/api/')) await handleApi(req, res);
    else serveStatic(req, res);
  } catch (e) {
    console.error(e);
    json(res, 500, { error: 'server error' });
  }
});

// —— WebSocket ——
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://x');
  const token = url.searchParams.get('token');
  if (!token) { try { ws.close(); } catch(_) {} return; }
  const sess = db.prepare('SELECT player_id FROM sessions WHERE token=?').get(token);
  if (!sess) { try { ws.close(); } catch(_) {} return; }
  game.connect(ws, Number(sess.player_id));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === 'cmd') game.exec(ws, msg.text || '');
  });
  ws.on('close', () => game.disconnect(ws));
});

server.listen(PORT, '0.0.0.0', () => {
  // 查本机 IP 给局域网访问
  const nets = require('node:os').networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const n of nets[name]) {
      if (n.family === 'IPv4' && !n.internal) ips.push(n.address);
    }
  }
  console.log('\n  《大江湖》');
  console.log(`  本机访问：  http://localhost:${PORT}`);
  for (const ip of ips) console.log(`  局域网访问：http://${ip}:${PORT}`);
  console.log('  按 Ctrl+C 停止。\n');
});
