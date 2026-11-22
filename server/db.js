'use strict';
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// 支持环境变量 DATA_DIR（Railway 持久化卷挂载点）
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'dajianghu.db');
const db = new DatabaseSync(DB_PATH);

// —— 全量建表（node:sqlite 不支持多行注释，注释写外面）——
const SCHEMA = [
  // 玩家
  `CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    pass TEXT NOT NULL,
    domain_id TEXT DEFAULT 'zhongzhou',
    location_id TEXT DEFAULT 'qingshi',
    hp INTEGER DEFAULT 50,
    max_hp INTEGER DEFAULT 50,
    nei INTEGER DEFAULT 30,
    max_nei INTEGER DEFAULT 30,
    silver REAL DEFAULT 5.0,
    fame INTEGER DEFAULT 0,
    infamy INTEGER DEFAULT 0,
    title TEXT DEFAULT '无名小卒',
    faction_id TEXT,
    faction_rep TEXT DEFAULT '{}',
    combat_style TEXT DEFAULT 'none',
    last_seen INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  // 玩家武器/装备
  `CREATE TABLE IF NOT EXISTS player_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    item_key TEXT NOT NULL,
    equipped INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  // 玩家已学招式
  `CREATE TABLE IF NOT EXISTS player_moves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    move_key TEXT NOT NULL,
    learned_at INTEGER NOT NULL,
    UNIQUE(player_id, move_key)
  )`,
  // 玩家背包（可交易物品）
  `CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    item_key TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
  )`,
  // NPC 核心数据（种子数据写入）
  `CREATE TABLE IF NOT EXISTS npc_core (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    faction TEXT,
    personality TEXT DEFAULT '',
    location_id TEXT NOT NULL,
    hp INTEGER DEFAULT 30,
    combat_style TEXT DEFAULT 'none',
    fame INTEGER DEFAULT 10,
    llm_enabled INTEGER DEFAULT 0,
    is_core INTEGER DEFAULT 0,
    role TEXT DEFAULT '路人'
  )`,
  // NPC 与玩家关系值
  `CREATE TABLE IF NOT EXISTS npc_relation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    npc_id TEXT NOT NULL,
    player_id INTEGER NOT NULL,
    value INTEGER DEFAULT 0,
    last_interaction_at INTEGER DEFAULT 0,
    UNIQUE(npc_id, player_id)
  )`,
  // NPC 对玩家的记忆摘要
  `CREATE TABLE IF NOT EXISTS npc_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    npc_id TEXT NOT NULL,
    player_id INTEGER NOT NULL,
    summary TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  // NPC 对玩家传递的信息标记
  `CREATE TABLE IF NOT EXISTS npc_knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    npc_id TEXT NOT NULL,
    player_id INTEGER NOT NULL,
    topic_id TEXT NOT NULL,
    value INTEGER DEFAULT 1,
    at INTEGER NOT NULL,
    UNIQUE(npc_id, player_id, topic_id)
  )`,
  // 任务定义表（种子数据写入）
  `CREATE TABLE IF NOT EXISTS quests (
    key TEXT PRIMARY KEY,
    type TEXT NOT NULL,        -- 'bai' 白活 | 'hei' 黑活
    faction TEXT,              -- 所属势力
    title TEXT NOT NULL,
    desc TEXT NOT NULL,
    reward_silver REAL DEFAULT 0,
    reward_fame INTEGER DEFAULT 0,
    reward_infamy INTEGER DEFAULT 0,
    prerep_json TEXT DEFAULT '{}',   -- 势力声望门槛
    req_fame INTEGER DEFAULT 0,      -- 名望门槛
    loc TEXT,                        -- 起始地点
    target TEXT,                     -- 目标 NPC（送信/找人）
    combat INTEGER DEFAULT 0,        -- 是否需要战斗
    risk TEXT                        -- 风险描述
  )`,
  // 任务状态
  `CREATE TABLE IF NOT EXISTS player_quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    quest_key TEXT NOT NULL,
    status TEXT DEFAULT 'available',   -- available / active / done / failed
    progress TEXT DEFAULT '{}',
    started_at INTEGER DEFAULT 0,
    completed_at INTEGER DEFAULT 0,
    UNIQUE(player_id, quest_key)
  )`,
  // PvP 决斗请求
  `CREATE TABLE IF NOT EXISTS duel_request (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenger_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',     -- pending / accepted / rejected / done
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  // 火线事件状态
  `CREATE TABLE IF NOT EXISTS event_state (
    id TEXT PRIMARY KEY,
    phase INTEGER DEFAULT 0,
    trigger_count INTEGER DEFAULT 0,
    choice_log TEXT DEFAULT '[]',
    last_updated INTEGER DEFAULT 0
  )`,
  // 火线全服贡献
  `CREATE TABLE IF NOT EXISTS event_contrib (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL,
    player_id INTEGER NOT NULL,
    faction_id TEXT,
    value INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  // 聊天日志（用于传闻摘要）
  `CREATE TABLE IF NOT EXISTS chat_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    speaker_id INTEGER,
    content TEXT NOT NULL,
    location_id TEXT,
    created_at INTEGER NOT NULL
  )`,
  // 传闻
  `CREATE TABLE IF NOT EXISTS rumors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    source_channel TEXT,
    location_id TEXT,
    verified INTEGER DEFAULT 0,
    debunked_by INTEGER,
    created_at INTEGER NOT NULL
  )`,
  // 通缉
  `CREATE TABLE IF NOT EXISTS wanted (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    reason TEXT,
    bounty INTEGER DEFAULT 50,
    created_at INTEGER NOT NULL,
    expired_at INTEGER NOT NULL
  )`,
  // 拍卖会/黑市物品
  `CREATE TABLE IF NOT EXISTS market (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER,
    item_key TEXT NOT NULL,
    price REAL NOT NULL,
    market_type TEXT DEFAULT 'auction',
    location_id TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  // 在线会话
  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    player_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  // 战斗状态
  `CREATE TABLE IF NOT EXISTS combat_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attacker_id INTEGER,
    defender_id INTEGER,
    rounds INTEGER DEFAULT 0,
    result TEXT,
    log TEXT DEFAULT '[]',
    created_at INTEGER NOT NULL
  )`
];

// 执行建表
for (const sql of SCHEMA) {
  try { db.exec(sql); } catch (e) { console.warn('[schema] warn:', e.message); }
}

module.exports = { db };
