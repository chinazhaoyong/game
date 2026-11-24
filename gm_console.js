'use strict';
// === 大江湖 · GM 控制台（独立进程）===
// 负责：启动 / 停止游戏服务器，并把 GM 管理请求代理到游戏服务器。
// 本控制台常驻，不依赖游戏服务器是否在运行，因此「启动」也能在面板里完成。
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');

const CTRL_PORT = parseInt(process.env.GM_PORT, 10) || 7790;
const GAME_PORT = parseInt(process.env.GAME_PORT || process.env.PORT, 10) || 7788;
const PUBLIC = path.join(__dirname, 'public');
const NODE = process.execPath;                       // 与本进程相同的 node 可执行文件
const GM_PASSWORD = process.env.GM_PASS || 'admin123'; // 代理注入用，面板本身免密

let child = null;       // 游戏服务器子进程（由本控制台启动时才有值）
let childPID = null;

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

// 游戏服务器是否在监听端口（在跑）
function gameRunning() {
  return new Promise((resolve) => {
    const s = net.connect(GAME_PORT, '127.0.0.1');
    s.setTimeout(800);
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('timeout', () => { s.destroy(); resolve(false); });
    s.on('error', () => resolve(false));
  });
}

function startGame() {
  return new Promise((resolve) => {
    if (child && child.exitCode === null) return resolve({ ok: true, msg: '服务器正在启动中…' });
    gameRunning().then((running) => {
      if (running) return resolve({ ok: true, msg: '服务器已在运行' });
      child = spawn(NODE, ['server/index.js'], {
        cwd: __dirname,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PORT: String(GAME_PORT) },
      });
      childPID = child.pid;
      child.stdout.on('data', (d) => process.stdout.write('[游戏] ' + d));
      child.stderr.on('data', (d) => process.stderr.write('[游戏ERR] ' + d));
      child.on('exit', (code) => {
        console.log('[控制台] 游戏服务器已退出 code=' + code);
        child = null; childPID = null;
      });
      resolve({ ok: true, msg: '正在启动游戏服务器…' });
    });
  });
}

function stopGame() {
  return new Promise((resolve) => {
    const kill = () => {
      if (child && child.exitCode === null) { child.kill(); return resolve({ ok: true, msg: '已停止' }); }
      return resolve({ ok: false, msg: '服务器未在运行' });
    };
    gameRunning().then((running) => {
      if (!running) return kill();
      // 让游戏服务器自己退出（不伤到本控制台进程）
      const req = http.request({
        host: '127.0.0.1', port: GAME_PORT, path: '/api/gm/shutdown', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GM_PASSWORD}` },
      }, (res) => { res.resume(); resolve({ ok: true, msg: '已发送停止指令' }); });
      req.on('error', () => kill());
      req.write(JSON.stringify({ confirm: 'SHUTDOWN' }));
      req.end();
    });
  });
}

function status() {
  return gameRunning().then((running) => ({ running, port: GAME_PORT, pid: childPID }));
}

// 把 /api/gm/* 代理到游戏服务器，并自动注入 GM 口令（面板免密）
function proxyGm(req, res) {
  gameRunning().then((running) => {
    if (!running) return json(res, 503, { error: '游戏服务器未启动，请先点「启动服务器」。' });
    const opts = {
      host: '127.0.0.1', port: GAME_PORT, path: req.url, method: req.method,
      headers: { ...req.headers, host: `127.0.0.1:${GAME_PORT}`, authorization: `Bearer ${GM_PASSWORD}` },
    };
    const preq = http.request(opts, (pres) => {
      res.writeHead(pres.statusCode, pres.headers);
      pres.pipe(res);
    });
    preq.on('error', () => json(res, 502, { error: '无法连接游戏服务器' }));
    req.pipe(preq);
  });
}

// 静态文件（与游戏服务器共用 public 目录）
const MIME = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg' };
function serveStatic(req, res) {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/gm.html';
  const file = path.join(PUBLIC, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('404'); }
    const mime = MIME[path.extname(file)] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (req.url.startsWith('/api/ctl/')) {
      if (u.pathname === '/api/ctl/status' && req.method === 'GET') return json(res, 200, await status());
      if (u.pathname === '/api/ctl/start' && req.method === 'POST') return json(res, 200, await startGame());
      if (u.pathname === '/api/ctl/stop' && req.method === 'POST') return json(res, 200, await stopGame());
      return json(res, 404, { error: 'not found' });
    }
    if (req.url.startsWith('/api/gm/')) return proxyGm(req, res);
    return serveStatic(req, res);
  } catch (e) {
    console.error(e);
    json(res, 500, { error: 'server error' });
  }
});

// 关闭游戏服务器子进程（控制台退出时调用，避免残留）
function shutdownChild() {
  if (child && child.exitCode === null) { try { child.kill(); } catch (e) {} }
}

server.listen(CTRL_PORT, '0.0.0.0', () => {
  console.log('\n  《大江湖》GM 控制台');
  console.log(`  面板地址：  http://localhost:${CTRL_PORT}/gm.html`);
  console.log(`  游戏端口：  ${GAME_PORT}（由面板启动/停止）`);
  console.log('  按 Ctrl+C 停止控制台。\n');
  // 一启动就把游戏服务器拉起来，双击即用
  startGame();
});

// 控制台退出时，把游戏服务器一并关掉
process.on('SIGINT', () => { shutdownChild(); process.exit(0); });
process.on('SIGTERM', () => { shutdownChild(); process.exit(0); });
process.on('exit', shutdownChild);