'use strict';
// 给归去来兮加满所有属性 + 所有门派武功 + 神兵利器
const { db } = require('./server/db.js');

const PLAYER_NAME = '归去来兮';

// 1. 确保数据库已 seed（如果没有 quests 表说明没 seed 过）
const questCount = db.prepare('SELECT COUNT(*) as c FROM quests').get();
if (!questCount.c) {
  console.log('[bootstrap] 数据库是空的，先 seed...');
  require('./server/seed').init();
}

// 2. 找到归去来兮（如果没有就创建一个）
let p = db.prepare('SELECT * FROM players WHERE name=?').get(PLAYER_NAME);
if (!p) {
  console.log('[bootstrap] 归去来兮不存在，先注册...');
  const crypto = require('node:crypto');
  const salt = crypto.randomBytes(12).toString('hex');
  const { hashPass } = require('./server/game');
  db.prepare('INSERT INTO players (name,pass,created_at) VALUES (?,?,?)').run(
    PLAYER_NAME, `${salt}$${hashPass('dajianghu', salt)}`, Date.now());
  p = db.prepare('SELECT * FROM players WHERE name=?').get(PLAYER_NAME);
}

const pid = p.id;
const now = Date.now();

// 3. 属性拉满
console.log(`[bootstrap] 设置 ${PLAYER_NAME} 属性拉满...`);
const MAX_HP = 9999;
const MAX_NEI = 9999;
db.prepare(`UPDATE players SET
  location_id=?, domain_id=?, hp=?, max_hp=?, nei=?, max_nei=?,
  silver=?, fame=?, infamy=?, title=?,
  faction_id=?, faction_rep=?, rank=?, contrib=?, joined_at=?, rank_at=?
  WHERE id=?`).run(
  'shaolin', 'zhongyuan', MAX_HP, MAX_HP, MAX_NEI, MAX_NEI,
  99999999, 99999, 0, '武林至尊',
  'shaolin', '{}', 'chief', 99999, now, now, pid);

// 4. 所有门派声望拉满
const factionIds = ['shaolin','wudang','gaibang','huashan','emei','kunlun','tianshan','mingjiao','diancang','tangmen','wudu','duanshi','taohua','haidao','salt','tiezhang','murong','qinglong','qianjin','nan_gong'];
const repMap = {};
for (const fid of factionIds) repMap[fid] = 9999;
db.prepare('UPDATE players SET faction_rep=? WHERE id=?').run(JSON.stringify(repMap), pid);

// 5. 删除已有武功 → 塞所有 604 招
console.log('[bootstrap] 塞所有 604 招武功...');
db.prepare('DELETE FROM player_moves WHERE player_id=?').run(pid);
const MOVES = require('./server/moves_data.js');
const insMove = db.prepare('INSERT INTO player_moves (player_id, move_key, learned_at) VALUES (?,?,?)');
const allMoveKeys = Object.keys(MOVES);
let count = 0;
for (const key of allMoveKeys) {
  try { insMove.run(pid, key, now); count++; } catch(e) {}
}
console.log(`[bootstrap] 已塞 ${count} 招武功`);

// 6. 删除已有物品 → 塞神兵利器
console.log('[bootstrap] 塞神兵利器...');
db.prepare('DELETE FROM inventory WHERE player_id=?').run(pid);
const insInv = db.prepare('INSERT INTO inventory (player_id, item_key, count, created_at) VALUES (?,?,?,?)');
const LEGENDARY_ITEMS = [
  'tulong','yitian','jinsijia','xuanming_zhanpao',
  'shaolin_weap_chief','wudang_weap_chief','gaibang_weap_chief','huashan_weap_chief',
  'emei_weap_chief','kunlun_weap_chief','tianshan_weap_chief','mingjiao_weap_chief',
  'diancang_weap_chief','tangmen_weap_chief','wudu_weap_chief','duanshi_weap_chief',
  'taohua_weap_chief','haidao_weap_chief','salt_weap_chief','tiezhang_weap_chief',
  'murong_weap_chief','qinglong_weap_chief','qianjin_weap_chief','nangong_weap_chief',
];
for (const item of LEGENDARY_ITEMS) {
  try { insInv.run(pid, item, 1, now); } catch(e) { console.log('  跳过:', item); }
}
// 加一些老的顶级神兵
const EXTRA_ITEMS = ['tulong','yitian','jinsijia','xuanming_zhanpao','chengguang'];
for (const item of EXTRA_ITEMS) {
  try { insInv.run(pid, item, 3, now); } catch(e) {}
}
console.log(`[bootstrap] 已塞 ${LEGENDARY_ITEMS.length + EXTRA_ITEMS.length} 件神兵`);

// 7. 完成所有门派专属任务（解锁所有剧情武功）
console.log('[bootstrap] 完成所有门派专属任务...');
const questKeys = db.prepare("SELECT key FROM quests WHERE key LIKE 'q_%_join' OR key LIKE 'q_%_rank%' OR key LIKE 'q_chk_%' OR key LIKE 'q_secret_%' OR key LIKE 'q_chief_%'").all().map(r=>r.key);
const insQuest = db.prepare('INSERT OR REPLACE INTO player_quests (player_id, quest_key, status, progress, started_at, completed_at) VALUES (?,?,?,?,?,?)');
for (const qk of questKeys) {
  try { insQuest.run(pid, qk, 'done', '{}', now, now); } catch(e) {}
}
console.log(`[bootstrap] 已完成 ${questKeys.length} 条门派任务`);

console.log('\n========================================');
console.log(`✅ ${PLAYER_NAME} 已完成全满配置！`);
console.log(`   HP/内力: ${MAX_HP}/${MAX_NEI}`);
console.log(`   金钱: 99,999,999 两`);
console.log(`   声望: 所有门派 9999`);
console.log(`   门派: 少林 首席弟子 (chief)`);
console.log(`   武功: ${count} 招全学会`);
console.log(`   神兵: ${LEGENDARY_ITEMS.length} 件门派镇派 + ${EXTRA_ITEMS.length} 件顶级神兵`);
console.log(`   任务: ${questKeys.length} 条门派剧情已完成`);
console.log('========================================\n');
