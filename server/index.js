'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { WebSocketServer } = require('ws');
const { db } = require('./db');
const { createGame, hashPass, makeSession } = require('./game');

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

// —— HTTP 路由 ——
async function handleApi(req, res) {
  let body;
  try { body = await readBody(req); } catch { return json(res, 400, { error: '请求格式不对。' }); }

  const name = String(body.name || '').trim();
  const pass = String(body.pass || '');

  if (!NAME_RE.test(name)) return json(res, 400, { error: '角色名 2–12 字，只能是汉字、字母、数字或下划线。' });
  if (pass.length < 4 || pass.length > 64) return json(res, 400, { error: '口令至少 4 位。' });

  if (req.url === '/api/register') {
    const exists = db.prepare('SELECT id FROM players WHERE name = ?').get(name);
    if (exists) return json(res, 409, { error: '这个名字已经有人了。' });
    const salt = crypto.randomBytes(12).toString('hex');
    db.prepare('INSERT INTO players (name,pass,created_at) VALUES (?,?,?)').run(name, `${salt}$${hashPass(pass, salt)}`, Date.now());
    const token = makeSession(db.prepare('SELECT last_insert_rowid() as id').get().id);
    return json(res, 200, { token, name });
  }

  if (req.url === '/api/login') {
    const p = db.prepare('SELECT * FROM players WHERE name = ?').get(name);
    if (!p) return json(res, 401, { error: '没有这个名字。' });
    const [salt, hashed] = String(p.pass).split('$');
    if (!salt || !hashed || hashPass(pass, salt) !== hashed) {
      return json(res, 401, { error: '口令不对。' });
    }
    const token = makeSession(Number(p.id));
    return json(res, 200, { token, name: p.name });
  }

  return json(res, 404, { error: 'not found' });
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
    if (req.url.startsWith('/api/')) await handleApi(req, res);
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
