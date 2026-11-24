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
    rank TEXT DEFAULT 'servant',           -- 弟子等级: servant/trainee/outer/inner/inner_high/core/privileged/chief
    contrib INTEGER DEFAULT 0,             -- 门派贡献点
    joined_at INTEGER,                     -- 入派时间戳
    rank_at INTEGER,                       -- 上次升级时间戳
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
  )`,
  // 门派专属武器/装备
  `CREATE TABLE IF NOT EXISTS faction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    faction TEXT NOT NULL,
    item_key TEXT NOT NULL,
    name TEXT,
    type TEXT,               -- weapon / armor / book
    damage TEXT,
    defense TEXT,
    rank_required TEXT,      -- servant/trainee/outer/inner/core/privileged/chief
    contrib_cost INTEGER DEFAULT 0,
    granted_by TEXT,         -- 掌门/长老 赐予（隐藏剧情）
    UNIQUE(faction, item_key)
  )`,
  // 门派等级定义表
  `CREATE TABLE IF NOT EXISTS faction_tiers (
    faction TEXT NOT NULL,
    rank TEXT NOT NULL,           -- servant/trainee/outer/inner/inner_high/core/privileged/chief
    rank_order INTEGER NOT NULL,  -- 0-7 排序
    rank_name TEXT NOT NULL,      -- 显示名: 杂役弟子/见习弟子/...
    min_rep INTEGER DEFAULT 0,
    min_contrib INTEGER DEFAULT 0,
    min_days INTEGER DEFAULT 0,    -- 入门后需等待的天数
    req_quest TEXT,               -- 晋级需完成的任务
    desc TEXT,
    PRIMARY KEY(faction, rank)
  )`,
  // —— RPG 系统表（每系统一张）——
  // 特殊属性定义（毒/灼烧/冰冻/吸血/麻痹）
  `CREATE TABLE IF NOT EXISTS special_effects (
    key TEXT PRIMARY KEY,
    name TEXT,
    kind TEXT,                 -- poison/burn/freeze/lifesteal/paralyze
    value INTEGER DEFAULT 0,
    rounds INTEGER DEFAULT 0,
    chance REAL DEFAULT 0,
    desc TEXT
  )`,
  // 武器装备（武器+防具）
  `CREATE TABLE IF NOT EXISTS equipments (
    key TEXT PRIMARY KEY,
    name TEXT,
    slot TEXT,                 -- head/hand/feet/body/wrist/accessory
    type TEXT,                 -- weapon/armor
    atk INTEGER DEFAULT 0,
    def INTEGER DEFAULT 0,
    rarity TEXT,
    req_level INTEGER DEFAULT 1,
    bonuses TEXT DEFAULT '{}', -- JSON 如 {"luck":2,"crit":0.05}
    special_key TEXT,
    price REAL,
    desc TEXT
  )`,
  // 药品
  `CREATE TABLE IF NOT EXISTS medicines (
    key TEXT PRIMARY KEY,
    name TEXT,
    kind TEXT,                 -- heal/nei/cure/buff
    heal INTEGER DEFAULT 0,
    nei INTEGER DEFAULT 0,
    cure INTEGER DEFAULT 0,
    buff_key TEXT,
    buff_rounds INTEGER DEFAULT 0,
    buff_def INTEGER DEFAULT 0,
    buff_atk INTEGER DEFAULT 0,
    buff_neicost REAL DEFAULT 0,
    buff_undead INTEGER DEFAULT 0,
    full_heal INTEGER DEFAULT 0,
    price REAL,
    rarity TEXT,
    desc TEXT
  )`,
  // 药材/原料
  `CREATE TABLE IF NOT EXISTS materials (
    key TEXT PRIMARY KEY,
    name TEXT,
    kind TEXT,                 -- herb/ore/wood/leather/other
    rarity TEXT,
    price REAL,
    desc TEXT
  )`,
  // 生活物资（食物/跑商货）
  `CREATE TABLE IF NOT EXISTS life_goods (
    key TEXT PRIMARY KEY,
    name TEXT,
    kind TEXT,                 -- food/goods
    heal INTEGER DEFAULT 0,
    nei INTEGER DEFAULT 0,
    full_heal INTEGER DEFAULT 0,
    price REAL,
    desc TEXT
  )`,
  // 武功及秘籍
  `CREATE TABLE IF NOT EXISTS moves (
    key TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,                 -- 拳脚/兵器/内功/被动/特技/轻功
    counter TEXT,
    damage TEXT,               -- JSON "[5,8]"
    nei_cost INTEGER DEFAULT 0,
    faction TEXT,
    req_rank TEXT,
    req_rep INTEGER DEFAULT 0,
    req_quest TEXT,
    req_attr TEXT DEFAULT '{}',
    attr_bonus TEXT DEFAULT '{}',
    special_key TEXT,
    hp_bonus INTEGER DEFAULT 0,
    max_nei INTEGER DEFAULT 0,
    def_bonus INTEGER DEFAULT 0,
    heal INTEGER DEFAULT 0,
    x INTEGER DEFAULT 1,
    first INTEGER DEFAULT 0,
    reflect INTEGER DEFAULT 0,
    damage_bonus INTEGER DEFAULT 0,
    dodge_bonus INTEGER DEFAULT 0,
    learn_cost REAL DEFAULT 0,          -- 学费（两）
    desc TEXT
  )`,
  // 野怪
  `CREATE TABLE IF NOT EXISTS monsters (
    key TEXT PRIMARY KEY,
    name TEXT,
    node_id TEXT,
    level INTEGER,
    hp INTEGER,
    atk INTEGER,
    def INTEGER,
    exp INTEGER,
    silver REAL,
    style TEXT,
    drops TEXT,                -- JSON [{"key":"leather_shou","chance":0.3,"count":[1,2]}]
    respawn_min INTEGER DEFAULT 5,
    alive INTEGER DEFAULT 1,
    killed_at INTEGER DEFAULT 0
  )`,
  // 各个节点
  `CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    domain TEXT,
    name TEXT,
    desc TEXT,
    exits TEXT,                -- JSON ["luoyang","shaolin"]
    is_wild INTEGER DEFAULT 0
  )`,
  // 商店
  `CREATE TABLE IF NOT EXISTS shops (
    id TEXT PRIMARY KEY,
    node_id TEXT,
    name TEXT,
    price_rate REAL DEFAULT 1,
    items TEXT,                -- JSON ["mantou","jincang_yao",...]
    teach INTEGER DEFAULT 0,
    inn INTEGER DEFAULT 0,
    teahouse INTEGER DEFAULT 0,
    black INTEGER DEFAULT 0,
    auction INTEGER DEFAULT 0,
    gambling INTEGER DEFAULT 0,
    info INTEGER DEFAULT 0
  )`,
  // 门派
  `CREATE TABLE IF NOT EXISTS factions (
    id TEXT PRIMARY KEY,
    name TEXT,
    domain TEXT,
    color TEXT,
    desc TEXT
  )`,
  // 生活技能定义
  `CREATE TABLE IF NOT EXISTS life_skills (
    key TEXT PRIMARY KEY,
    name TEXT,
    branch TEXT,               -- 采集/制造
    tool_req TEXT,
    desc TEXT
  )`,
  // 玩家生活技能进度
  `CREATE TABLE IF NOT EXISTS player_life_skills (
    player_id INTEGER,
    skill_key TEXT,
    level INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    PRIMARY KEY(player_id, skill_key)
  )`,
  // 采集点
  `CREATE TABLE IF NOT EXISTS collecting_nodes (
    id TEXT PRIMARY KEY,
    node_id TEXT,
    skill_key TEXT,
    material_key TEXT,
    respawn_min INTEGER DEFAULT 10,
    alive INTEGER DEFAULT 1,
    harvested_at INTEGER DEFAULT 0
  )`,
  // 制造配方
  `CREATE TABLE IF NOT EXISTS recipes (
    key TEXT PRIMARY KEY,
    name TEXT,
    skill_key TEXT,
    level_req INTEGER,
    inputs TEXT,               -- JSON {"herb_chucai":3}
    output_key TEXT,
    output_type TEXT,          -- medicine/equipment/life_good
    count INTEGER DEFAULT 1,
    success_rate REAL DEFAULT 0.8,
    desc TEXT
  )`
];

// 执行建表
for (const sql of SCHEMA) {
  try { db.exec(sql); } catch (e) { console.warn('[schema] warn:', e.message); }
}

// 老数据库迁移：补表的新字段（重复列会吞错）
const MIGRATIONS = [
  // players 旧列
  `ALTER TABLE players ADD COLUMN rank TEXT DEFAULT 'servant'`,
  `ALTER TABLE players ADD COLUMN contrib INTEGER DEFAULT 0`,
  `ALTER TABLE players ADD COLUMN joined_at INTEGER`,
  `ALTER TABLE players ADD COLUMN rank_at INTEGER`,
  // players RPG 属性/升级
  `ALTER TABLE players ADD COLUMN level INTEGER DEFAULT 1`,
  `ALTER TABLE players ADD COLUMN exp INTEGER DEFAULT 0`,
  `ALTER TABLE players ADD COLUMN gen INTEGER DEFAULT 10`,      // 根骨
  `ALTER TABLE players ADD COLUMN str INTEGER DEFAULT 10`,      // 力量
  `ALTER TABLE players ADD COLUMN con INTEGER DEFAULT 10`,      // 体质
  `ALTER TABLE players ADD COLUMN agi INTEGER DEFAULT 10`,      // 身法
  `ALTER TABLE players ADD COLUMN luck INTEGER DEFAULT 10`,     // 幸运
  `ALTER TABLE players ADD COLUMN cha INTEGER DEFAULT 10`,      // 魅力
  `ALTER TABLE players ADD COLUMN wit INTEGER DEFAULT 10`,      // 悟性
  `ALTER TABLE players ADD COLUMN fortune INTEGER DEFAULT 10`,  // 福缘
  `ALTER TABLE players ADD COLUMN dummy_prof INTEGER DEFAULT 0`,   // 木人桩熟练度0-10
  `ALTER TABLE players ADD COLUMN free_points INTEGER DEFAULT 0`,  // 待分配属性点
  // player_items 装备实例
  `ALTER TABLE player_items ADD COLUMN name TEXT`,
  `ALTER TABLE player_items ADD COLUMN slot TEXT`,
  `ALTER TABLE player_items ADD COLUMN atk INTEGER DEFAULT 0`,
  `ALTER TABLE player_items ADD COLUMN def INTEGER DEFAULT 0`,
  `ALTER TABLE player_items ADD COLUMN rarity TEXT`,
  `ALTER TABLE player_items ADD COLUMN bonuses TEXT DEFAULT '{}'`,
  `ALTER TABLE player_items ADD COLUMN special_key TEXT`,
  `ALTER TABLE player_items ADD COLUMN req_level INTEGER DEFAULT 1`,
  // npc_core 战斗扩展
  `ALTER TABLE npc_core ADD COLUMN level INTEGER DEFAULT 1`,
  `ALTER TABLE npc_core ADD COLUMN atk INTEGER DEFAULT 5`,
  `ALTER TABLE npc_core ADD COLUMN def INTEGER DEFAULT 2`,
  `ALTER TABLE npc_core ADD COLUMN drops TEXT DEFAULT '[]'`,
  // quests 经验奖励
  `ALTER TABLE quests ADD COLUMN reward_exp INTEGER DEFAULT 0`,
  // moves 闪避加成（轻功招）
  `ALTER TABLE moves ADD COLUMN dodge_bonus INTEGER DEFAULT 0`,
];
for (const sql of MIGRATIONS) {
  try { db.exec(sql); } catch (e) { /* 字段已存在时忽略 */ }
}

module.exports = { db };
