'use strict';
const crypto = require('node:crypto');
const WebSocket = require('ws');
const { db } = require('./db');
const {
  DOMAINS, NODES, FACTIONS, MOVES, ITEMS, SHOPS,
  REP_TIERS, REP_NAMES, FAME_TIERS, FAME_NAMES,
  COUNTER, COUNTER_NAMES, MOVE_DESC, DAMAGE_DESC, NPC_DESC, TRADE_MULT,
} = require('./content');

// —— 基础工具 ——
const now = () => Date.now();
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const range = (r) => Array.isArray(r) ? rand(r[0], r[1]) : r;

// —— 名望称号 ——
function fameTitle(v) {
  for (let i = FAME_TIERS.length - 1; i >= 0; i--) if (v >= FAME_TIERS[i]) return FAME_NAMES[i];
  return FAME_NAMES[0];
}
function fameNext(v) {
  for (let i = 0; i < FAME_TIERS.length; i++) if (v < FAME_TIERS[i]) return { at: FAME_TIERS[i], name: FAME_NAMES[i] };
  return null;
}
function repTier(v) {
  for (let i = REP_TIERS.length - 1; i >= 0; i--) if (v >= REP_TIERS[i]) return { tier: i, name: REP_NAMES[i] };
  return { tier: 0, name: REP_NAMES[0] };
}

// —— 哈希口令 ——
function hashPass(pass, salt) { return crypto.scryptSync(pass, salt, 32).toString('hex'); }
function makeSession(playerId) {
  const token = crypto.randomBytes(24).toString('hex') + crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sessions (token, player_id, created_at) VALUES (?,?,?)').run(token, playerId, now());
  return token;
}

// ===== 创建游戏 =====
function createGame() {
  const players = new Map();   // id -> 玩家状态对象
  const online = new Map();    // id -> WebSocket

  function push(ws, lines) {
    if (!ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify({ type: 'lines', lines }));
  }
  function pushOne(ws, kind, text) { push(ws, [{ kind, text }]); }
  function L(kind, text) { return { kind, text }; }

  function playerOf(id) { return players.get(Number(id)); }
  function wsOf(id) { return online.get(Number(id)); }

  function broadcastAll(lines) {
    for (const ws of online.values()) push(ws, lines);
  }
  function broadcastDomain(domainId, lines) {
    for (const [id, ws] of online) {
      const p = playerOf(id);
      if (p && NODES[p.location_id] && NODES[p.location_id].domain === domainId) push(ws, lines);
    }
  }

  // —— 玩家状态加载/保存 ——
  function loadPlayer(id) {
    const p = db.prepare('SELECT * FROM players WHERE id = ?').get(Number(id));
    if (!p) return null;
    p.id = Number(p.id);
    p.hp = Number(p.hp) || 50;
    p.max_hp = Number(p.max_hp) || 50;
    p.nei = Number(p.nei) || 30;
    p.max_nei = Number(p.max_nei) || 30;
    p.silver = Number(p.silver) || 0;
    p.fame = Number(p.fame) || 0;
    p.infamy = Number(p.infamy) || 0;
    p.location_id = p.location_id || 'qingshi';
    p.domain_id = p.domain_id || 'zhongzhou';
    p.faction_rep = JSON.parse(p.faction_rep || '{}');
    return p;
  }

  function savePlayer(p) {
    db.prepare(`UPDATE players SET
      location_id=?, domain_id=?, hp=?, max_hp=?, nei=?, max_nei=?,
      silver=?, fame=?, infamy=?, title=?, faction_id=?, faction_rep=?
      WHERE id=?`).run(
      p.location_id, p.domain_id, p.hp, p.max_hp, p.nei, p.max_nei,
      p.silver, p.fame, p.infamy, p.title || fameTitle(p.fame), p.faction_id || null,
      JSON.stringify(p.faction_rep), p.id);
  }

  // —— 完成任务（给奖励 + 标记 done）——
  function completeQuest(ws, p, q) {
    p.silver += q.reward_silver || 0;
    p.fame += q.reward_fame || 0;
    if (q.reward_infamy) p.infamy += q.reward_infamy;
    if (q.faction) {
      const cur = (p.faction_rep[q.faction] || 0);
      p.faction_rep[q.faction] = cur + (q.reward_fame || 0);
    }
    db.prepare('UPDATE player_quests SET status=?, completed_at=? WHERE player_id=? AND quest_key=?').run('done', now(), p.id, q.key);
    savePlayer(p);
    sync(ws, p);

    const lines = [
      L('faction', `任务完成：「${q.title}」`),
      L('dim', `获得 ${q.reward_silver || 0} 两　名望 +${q.reward_fame || 0}${q.reward_infamy ? `　恶名 +${q.reward_infamy}` : ''}`),
    ];
    if (q.type === 'hei') {
      // 黑活：100% 曝光（做黑活本来就有风险）→ 50% 通缉
      p.infamy += 10;
      savePlayer(p);
      lines.push(L('rumor', '⚠ 有人目击了你的黑活行径！恶名 +10，小心被官府通缉。'));
      if (Math.random() < 0.5) {
        db.prepare('INSERT INTO wanted (player_id,reason,bounty,created_at,expired_at) VALUES (?,?,?,?,?)')
          .run(p.id, `完成黑活：${q.title}`, 50, now(), now() + 86400000);
        lines.push(L('rumor', '🚨 你被官府通缉了！进城可能被捕快追。'));
      }
    }
    push(ws, lines);
    // 触发火线：不同任务触发不同派系冲突
    if (q.faction === 'shaolin') triggerEvent(p, 'e_zhengdao', q.key);
    if (q.faction === 'mingjiao' || q.key === 'q_black_info') triggerEvent(p, 'e_shiit', q.key);
    if (q.faction === 'wudu' || q.faction === 'tangmen') triggerEvent(p, 'e_ancha', q.key);
    if (q.faction === 'qinglong' || q.type === 'hei') triggerEvent(p, 'e_qinglong', q.key);
  }

  // —— 状态渲染（发给前端）——
  function stateOf(p) {
    const node = NODES[p.location_id];
    // 出口
    const exits = Object.entries(node.exits || {}).map(([dir, target]) => ({
      label: dir, name: (NODES[target] ? NODES[target].name : target), id: target,
    }));
    // 在场 NPC
    const npcsHere = db.prepare('SELECT id,name,role FROM npc_core WHERE location_id=?').all(p.location_id);
    // 任务、装备：简化，暂时返回空（前端面板自己渲染）
    const quests = [];
    const items = [];
    // 势力声望
    const rep = Object.entries(p.faction_rep || {}).map(([fid, v]) => {
      const t = repTier(v);
      const next = REP_TIERS[t.tier + 1];
      return { faction: fid, name: (FACTIONS[fid] || {}).name || fid, value: v, tier: t.name, nextAt: next || null, pct: next ? Math.round((v / next) * 100) : 100 };
    });

    return {
      id: p.id, name: p.name,
      location: p.location_id, domain: p.domain_id,
      roomName: node.name, domainName: DOMAINS[node.domain].name,
      desc: node.desc, exits, npcsHere,
      hp: p.hp, maxHp: p.max_hp, nei: p.nei, maxNei: p.max_nei,
      silver: p.silver, fame: p.fame, fameNext: fameNext(p.fame), fameTier: fameTitle(p.fame),
      infamy: p.infamy, title: p.title || fameTitle(p.fame),
      faction: p.faction_id, rep, items, quests,
    };
  }

  function sync(ws, p) {
    if (!ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify({ type: 'state', state: stateOf(p) }));
  }

  // ===== 口语化 → 标准指令 预处理 =====
  function normalizeCmd(raw) {
    let t = String(raw).trim();
    if (!t) return t;

    // 去掉语气前缀（"我想"在"我"前面！否则"我想学"先被"我"剥掉剩"想学"）
    t = t.replace(/^(我想|我要|我打算|我想要|帮我|给我|让我|请问|麻烦|请)\s*/, '');
    t = t.replace(/^我\s*/, '');

    // 去掉量词前缀（"吃个馒头" → "吃馒头"；"来个烧鸡" → "来烧鸡"）
    t = t.replace(/^([吃用来给拿要])\s*个\s*/, '$1 ');
    t = t.replace(/^(来|买|卖)\s*(个|份|只|瓶|包|两|斤|件|把|双|根|本|块|张|匹|头|条|盏|副|套)\s*/, '$1 ');

    // —— 休息（放最前面，避免被后面的"学/去"吃掉）——
    if (/^(累了|想休息|休息一下|想睡|睡一下|住店|开房间|想住店|想开房|客栈休息|好困啊)/.test(t)) return '客栈';

    // —— 逃跑/认输（放前面避免被"打"吃掉）——
    if (/^(跑|快跑|逃命|溜|撤|闪|开溜|快逃|赶紧跑|我撤了|我溜了)/.test(t)) return '跑';
    if (/^(认输|投降|打不过|我输了|认栽|服了)/.test(t)) return '投降';

    // —— 移动 ——
    // 优先匹配："我想去 X" / "想去 X" / "到 X" / "往 X" / "朝 X" / "回 X"
    if (/^(我想去|想去|到|往|朝|回|返回)\s*(.+)$/.test(t)) {
      let m = t.match(/^(我想去|想去|到|往|朝|回|返回)\s*(.+)$/);
      return '去 ' + m[2];
    }
    // 然后："去一下 X" / "去 X 看看"
    if (/^去(一下)?\s*(.+?)(看看|瞧瞧|那里|那边)?$/.test(t)) {
      let m = t.match(/^去(一下)?\s*(.+?)(看看|瞧瞧|那里|那边)?$/);
      return '去 ' + m[2];
    }

    // —— 环顾 ——
    if (/^(看看?|瞧瞧|瞅瞅|望望)(周围|四周|附近|这里|那边)?\s*[!！?？。.]?$/.test(t)) return '环顾';
    if (/^(这里|周围|附近|四周)(有什么|有啥|有哪些)(东西|人|店铺|npc|NPC|玩家)?\s*[?？!！。.]?$/.test(t)) return '环顾';
    if (/^(现在)?我?在(哪|什么地方|哪里|啥地方)\s*[?？]?$/.test(t)) return '环顾';
    if (/^(看看?|查一下)(有哪些|有什么)(人|玩家|NPC)\s*(在)?\s*(这)?里/.test(t)) return '环顾';

    // —— 谁在线 ——
    if (/^(谁(在|在线|在玩)?|有人吗|有没有人|现在(有)?(谁|多少人)(在|在线)|几个人在玩|在线人数)\s*[?？]?$/.test(t)) return '谁';

    // —— 名望 ——
    if (/^(看看?|查一下)?(我?(现在)?的?(名望|名声|名气))/.test(t)) return '名望';
    if (/名望\s*(多少|怎么样|高不高|如何|行吗)\s*[?？]?$/.test(t)) return '名望';
    if (/^(我?(现在)?的?(恶名|通缉)多少|恶名怎么样|通缉还在吗)/.test(t)) return '名望';

    // —— 势力/声望 ——
    if (/^(看看?|查一下)?(我?(现在)?的?(声望|和各派关系|势力关系))/.test(t)) return '势力';
    if (/声望\s*(怎么样|多少|好不好|和各派关系)\s*[?？]?$/.test(t)) return '势力';
    if (/^(少林|武当|丐帮|明教|峨眉|唐门|青龙会|五岳剑派)\s*(声望|关系|怎么样|对我怎么样|跟我关系)\s*[?？]?$/.test(t)) return '势力';

    // —— 传闻/茶馆 ——
    if (/^(有什么(新闻|消息|新鲜事|八卦|传闻)|最近怎么样|江湖上(有什么事|怎么样|有什么传闻)|听说了吗|有没有(什么|啥)消息|最近(有)?什么事|外面怎么样)/.test(t)) return '传闻';
    if (/^(喝茶|去茶馆|上茶馆|去茶楼|喝茶听事)/.test(t)) return '传闻';

    // —— 火线 ——
    if (/^(现在|江湖)?局势(怎么样|如何|怎么样了|好吗|有没有变化|什么情况)/.test(t)) return '火线';
    if (/^(战况|哪(里)?打起来了|火线(怎么样|有没有进展|怎么样了)|现在(江湖|武林)怎么样了)/.test(t)) return '火线';

    // —— 任务 ——
    if (/^(有什么(任务|活|差事|可做的)|能接(什么|些)(任务|活|差事)|有(任务|活)吗|接(点|些)?活|有没有(任务|活)|我可以(做|接)(什么|些)(活|任务))/.test(t)) return '任务';
    if (/^(接|领|讨)\s*(任务|活|差事)\s*(.+)?$/.test(t)) {
      let m = t.match(/^(接|领|讨)\s*(任务|活|差事)\s*(.+)?$/);
      return m[3] ? '接 ' + m[3] : '任务';
    }
    if (/^(交|完(成|了)|搞定|做完)\s*(任务|活|差事)?/.test(t)) return '交';
    if (/^(放弃|不做|不想做|做不下去|算了|不干了)\s*(任务|活|这件事)?/.test(t)) return '放弃';

    // —— 学习/武馆 ——
    if (/^(想学|学一下|练一下|想学学|教我|教教我|传授我|学个|练个|学一招|学两招)/.test(t)) {
      let m = t.match(/^(想学|学一下|练一下|想学学|教我|教教我|传授我|学个|练个|学一招|学两招)\s*(.+)$/);
      if (m) return '学 ' + m[2];
    }
    if (/^学\s*(.+)$/.test(t)) {
      let m = t.match(/^学\s*(.+)$/);
      return '学 ' + m[1];
    }
    if (/^(去)?武馆(看看|瞧瞧)?/.test(t)) return '武馆';

    // —— 对话 ——
    if (/^(跟|和|同|找)\s*(.+?)\s*(说话|聊聊|谈谈|搭话|聊聊天|说说话|打招呼|问问|搭个话|唠嗑|扯扯)\s*[!?！！。.]?$/.test(t)) {
      let m = t.match(/^(跟|和|同|找)\s*(.+?)\s*(说话|聊聊|谈谈|搭话|聊聊天|说说话|打招呼|问问|搭个话|唠嗑|扯扯)/);
      return '问 ' + m[2] + ' 你好';
    }
    if (/^(跟|和|同)\s*(.+?)\s*(打听|问|问问)\s*(.+)$/.test(t)) {
      let m = t.match(/^(跟|和|同)\s*(.+?)\s*(打听|问|问问)\s*(.+)$/);
      return '问 ' + m[2] + ' ' + m[4];
    }
    if (/^问(一下)?\s*(.+?)\s*(的事|的情况|怎么样|如何|在哪|是谁|什么来头|现在情况|什么人)\s*[?？!！]?$/.test(t)) {
      let m = t.match(/^问(一下)?\s*(.+?)\s*(的事|的情况|怎么样|如何|在哪|是谁|什么来头|现在情况|什么人)/);
      return '问 ' + m[2] + ' ' + m[3];
    }
    if (/^打听(一下)?\s*(.+)$/.test(t)) {
      let m = t.match(/^打听(一下)?\s*(.+)$/);
      return '问 ' + m[2];
    }
    if (/^告诉\s*(.+?)\s*(.+)$/.test(t)) {
      let m = t.match(/^告诉\s*(.+?)\s*(.+)$/);
      return '告诉 ' + m[1] + ' ' + m[2];
    }

    // —— 战斗 ——
    if (/^(揍|干|收拾|教训|干掉|宰|砍|弄死|捅|扁|打|削|拍|锤)\s*(.+)$/.test(t)) {
      let m = t.match(/^(揍|干|收拾|教训|干掉|宰|砍|弄死|捅|扁|打|削|拍|锤)\s*(.+)$/);
      return '打 ' + m[2];
    }
    if (/^(和|跟|同|找)\s*(.+?)\s*(动手|打起来|干一架|比划|过招|干一仗|狠狠干)\s*[!?！！]?$/.test(t)) {
      let m = t.match(/^(和|跟|同|找)\s*(.+?)\s*(动手|打起来|干一架|比划|过招|干一仗|狠狠干)/);
      return '打 ' + m[2];
    }

    // —— 决斗 ——
    if (/^(和|跟|同|找)\s*(.+?)\s*(决斗|单挑|切磋|比试|挑战|比一比)\s*[!?！！]?$/.test(t)) {
      let m = t.match(/^(和|跟|同|找)\s*(.+?)\s*(决斗|单挑|切磋|比试|挑战|比一比)/);
      return '决斗 ' + m[2];
    }
    if (/^(接受|答应|同意|好的|行|可以)\s*(挑战|决斗|比试|单挑)\s*[!?！！]?$/.test(t)) return '接受决斗';
    if (/^(拒绝|不接受|不同意|算了|不来|不敢)\s*(挑战|决斗|比试|单挑)\s*[!?！！]?$/.test(t)) return '拒绝决斗';

    // —— 用药/使用物品 ——
    if (/^(吃|用|服用|使用|喝)\s*(.+)$/.test(t)) {
      let m = t.match(/^(吃|用|服用|使用|喝)\s*(.+)$/);
      const item = m[2];
      // 如果是药/食物类 → 用；否则也用
      return '用 ' + item;
    }
    if (/^(吃药|吃个药|用个药|吃点东西|用点东西|吃个馒头|用个馒头)/.test(t)) {
      let m = t.match(/^(吃药|吃个药|用个药|吃点东西|用点东西|吃个馒头|用个馒头)\s*(.+)?$/);
      if (m && m[2]) return '用 ' + m[2];
      return '用 馒头'; // 默认用一个
    }

    // —— 武器/装备 ——
    if (/^(换武器|换把武器|换个武器|拿(上)?\s*(.+?)(武器|剑|刀|枪|棍)|装备\s*(.+)|把武器(卸|下)|卸武器|取下武器)/.test(t)) {
      let m;
      if ((m = t.match(/^拿(上)?\s*(.+?)(武器|剑|刀|枪|棍)\s*$/))) return '用 ' + m[2] + m[3];
      if ((m = t.match(/^装备\s*(.+)$/))) return '用 ' + m[1];
      if (/^(换武器|换把武器|换个武器)/.test(t)) return '武器';
      if (/^(把武器(卸|下)|卸武器|取下武器)/.test(t)) return '卸武器';
      return '武器';
    }
    if (/^卸武器\s*$/.test(t)) return '卸武器';

    // —— 买卖 ——
    if (/^(想买|来点|给我|拿|要|我想(要|买)|我要|想买点|想买个|来个|来份)\s*(.+)$/.test(t)) {
      let m = t.match(/^(想买|来点|给我|拿|要|我想(要|买)|我要|想买点|想买个|来个|来份)\s*(.+)$/);
      // 嵌套组：m[1]=整个前缀, m[2]=如果"我想要"里的"要"或"买", m[3]=物品名
      const itemName = m[3] || m[2];
      return '买 ' + itemName;
    }
    if (/^卖(掉)?\s*(.+)$/.test(t)) {
      let m = t.match(/^卖(掉)?\s*(.+)$/);
      return '卖 ' + m[2];
    }
    if (/^(想)?卖(点|掉)?\s*(.+)?$/.test(t)) {
      let m = t.match(/^(想)?卖(点|掉)?\s*(.+)?$/);
      if (m[3]) return '卖 ' + m[3];
      return '卖';
    }

    // —— 物品/背包 ——
    if (/^(看看?|查一下)?(我?(的)?(背包|行囊|包袱|口袋|物品|东西))(里?(有|装)(什么|啥|哪些))?\s*[?？]?$/.test(t)) return '物品';
    if (/^(背包|行囊|包袱|口袋|物品|东西)(里?|里面)?(有|装)(什么|啥|哪些)\s*[?？]?$/.test(t)) return '物品';
    if (/^(看看?|查一下)?(我?(现在)?有(多少|几)钱|银两(多少|怎么样)|身上有多少钱|我身上(有)?多少(钱|银两))\s*[?？]?$/.test(t)) return '物品';

    // —— 帮派（注意：不能放"去"当触发词，否则"去少林寺"会被误当成加入门派）——
    if (/^(加入|进|拜入|投靠|想进|想加入|投奔)\s*(.+?)(派|门|会|教|帮|宗)?$/.test(t)) {
      let m = t.match(/^(加入|进|拜入|投靠|想进|想加入|投奔)\s*(.+?)(派|门|会|教|帮|宗)?$/);
      return '加入 ' + m[2];
    }
    if (/^(退出|离开|背叛|不想待了|不干了|不想在(这|这儿|门派)|走了|不玩了)\s*(帮派|门派|帮|派|了)?\s*$/.test(t)) return '退派';
    if (/^(立誓|发誓|跟.+不共戴天|此仇必报|此恨绵绵|不共戴天)\s*(.+)?$/.test(t)) {
      let m = t.match(/^(立誓|发誓|跟.+不共戴天|此仇必报|此恨绵绵|不共戴天)\s*(.+)?$/);
      return m[2] ? '立誓 ' + m[2] : '立誓';
    }

    // —— 跑商/交易 ——
    if (/^(做买卖|做生意|跑商|贩运|倒卖|想做买卖|想做生意|经商|做生意的|跑趟商)\s*[?？]?$/.test(t)) return '跑商';
    if (/^(现在什么货好卖|哪进货便宜|哪边(有货|东西便宜)|什么(货|东西)(好卖|赚钱)|做什么生意好|跑什么货好)\s*[?？]?$/.test(t)) return '跑商';

    // —— 洗恶/洗白 ——
    if (/^(洗白|消恶名|清除通缉|洗掉恶名|洗恶|脱罪|去掉通缉|恶名怎么消|通缉怎么消)/.test(t)) return '洗恶';

    // —— 黑市/拍卖/赌场 ——
    if (/^(去)?黑市(看看|瞧瞧)?/.test(t)) return '黑市';
    if (/^(去)?拍卖行(看看|瞧瞧)?/.test(t)) return '拍卖行';
    if (/^(去)?赌场(玩|瞧瞧|看看)?/.test(t)) return '拍卖行'; // 赌场暂时走拍卖

    // —— 帮助 ——
    if (/^(怎么玩|怎么操作|有什么命令|怎么玩啊|新手怎么玩|怎么用|不会玩|怎么开始|新手教程|教教我怎么玩|第一次玩)/.test(t)) return '帮';
    if (/^(help|帮助|指令|命令|新手|教程)\s*[?？]?$/.test(t)) return '帮';

    // —— 喊话/全场 ——
    if (/^大喊(一声|大叫)?[:：]?\s*(.+)$/.test(t)) {
      let m = t.match(/^大喊(一声|大叫)?[:：]?\s*(.+)$/);
      return '喊 ' + m[2];
    }
    if (/^对(大家|所有人|全场|大伙|各位|在场的人)说[:：]?\s*(.+)$/.test(t)) {
      let m = t.match(/^对(大家|所有人|全场|大伙|各位|在场的人)说[:：]?\s*(.+)$/);
      return '喊 ' + m[2];
    }

    // —— 私聊 ——
    if (/^(私|悄悄|偷偷|暗地(里)?|私下)?\s*(跟|和|找)?\s*(\S{2,})\s*(说|讲|聊|搭话|问问)[:：]?\s*(.+)$/.test(t)) {
      let m = t.match(/^(私|悄悄|偷偷|暗地(里)?|私下)?\s*(跟|和|找)?\s*(\S{2,})\s*(说|讲|聊|搭话|问问)[:：]?\s*(.+)$/);
      return '密 ' + m[3] + ' ' + m[5];
    }

    // 去掉末尾标点
    t = t.replace(/[。！？!?]+$/, '');

    return t.trim();
  }

  // ===== 识别商店名 → 返回 {shop, verb:'买'} 或 {shop, verb:'传闻'} 等 =====
  function matchShopByName(name, player) {
    if (!player) return null;
    const shopsHere = Object.values(SHOPS).filter(s => s.location === player.location_id);
    if (!shopsHere.length) return null;
    // 精确 / 包含 匹配
    let shop = shopsHere.find(s => s.name === name || s.name.includes(name) || name.includes(s.name));
    if (!shop) return null;
    return shop;
  }

  // ===== 指令引擎 =====
  function parseCmd(text, player) {
    const raw = String(text).trim();
    let t = normalizeCmd(raw);
    const firstSpace = t.search(/[\s\u3000]/);
    let verb, rest, args;
    if (firstSpace === -1) {
      verb = t; args = []; rest = '';
    } else {
      verb = t.slice(0, firstSpace);
      rest = t.slice(firstSpace + 1).trim();
      args = rest.split(/[\s\u3000]+/).filter(Boolean);
    }

    // —— 最高优先：整句里有商店名，"去 杂货铺" / "去 茶馆" / "铁匠铺" 等 ——
    // 先看 normalize 之后的完整 t（rest 部分）
    const restOrT = rest || t;
    for (const s of Object.values(SHOPS)) {
      if (!player || s.location !== player.location_id) continue;
      // "去 杂货铺" → verb='去', rest='杂货铺'
      // "杂货铺" → verb='杂货铺'
      if (restOrT.includes(s.name) || t === s.name) {
        if (s.teahouse) return { verb: '传闻', args: [], rest: '', _shop: s };
        if (s.inn) return { verb: '客栈', args: [], rest: '', _shop: s };
        if (s.teach) return { verb: '武馆', args: [], rest: '', _shop: s };
        // 普通 shop → 用 "买 <商店名>" 打开 catalog
        return { verb: '买', args: [s.name], rest: s.name, _shop: s };
      }
    }

    // —— Fallback：verb 不在 VERBS 里 ——
    if (!VERBS.has(verb)) {
      // 0) 单字词是方向
      if (DIR_MAP[verb]) return { verb: '去', args: [verb], rest: verb };
      // 1) 节点名
      for (const n of Object.values(NODES)) {
        if (n.name === verb || verb.includes(n.name)) {
          return { verb: '去', args: [n.name], rest: n.name };
        }
      }
      // 2) 整句包含已知节点名
      for (const n of Object.values(NODES)) {
        if (t.includes(n.name)) {
          return { verb: '去', args: [n.name], rest: n.name };
        }
      }
      // 3) 整句包含在场 NPC 名 → 默认搭话
      if (player) {
        const hereNpcs = db.prepare('SELECT name FROM npc_core WHERE location_id=?').all(player.location_id);
        for (const n of hereNpcs) {
          if (t.includes(n.name)) {
            return { verb: '问', args: [n.name, '你好'], rest: `${n.name} 你好` };
          }
        }
      }
    }

    return { verb, args, rest };
  }

  // 常用指令集
  const VERBS = new Set([
    '看','环顾','观察','look','l',
    '去','走','go','move',
    '说','say','传讯','喊','yell','密','tell','whisper','私聊',
    '问','打听','ask','关于','告诉',
    '看物品','物品','inventory','inv',
    '武器','换武器','卸武器',
    '用','吃','使用','吃药',
    '学','学武','learn',
    '武馆','shop','商店','买','卖',
    '任务','quest','接','quests','放弃','交','火线',
    '势力','声望','rep','声望表','加入','退派','立誓',
    '名望','fame',
    '记忆','memory',
    '打','kill','attack','攻击',
    '决斗','挑战','pk','接受决斗','拒绝决斗',
    '投降','认输','surrender',
    '跑','逃','run','flee',
    '交易','trade',
    '拍卖','拍卖行',
    '黑市',
    '传闻','rumor','茶馆',
    '客栈','休息','inn','睡',
    '帮','help','帮助','?','？',
    'who','谁','在线',
    '跑商',
    '洗恶','洗白','wash',
  ]);

  const DIR_MAP = { 北:'N', 南:'S', 东:'E', 西:'W', N:'N', S:'S', E:'E', W:'W',
    上:'U', 下:'D', 左:'L', 右:'R', U:'U', D:'D' };
  const DIR_LABEL = { N:'北', S:'南', E:'东', W:'西' };
  const OPP_DIR = { N:'S', S:'N', E:'W', W:'E', U:'D', D:'U' };

  // —— 环顾 / 看 ——
  function lookLines(p) {
    const node = NODES[p.location_id];
    const lines = [L('room', `【${node.name}】`), L('narr', node.desc)];
    // 出口
    const exitStrs = Object.entries(node.exits || {}).map(([d, t]) => `${DIR_LABEL[d] || d}·${NODES[t] ? NODES[t].name : t}`);
    if (exitStrs.length) lines.push(L('sys', `可以去：${exitStrs.join('　')}`));
    // 在场 NPC
    const npcs = db.prepare('SELECT name,role FROM npc_core WHERE location_id=?').all(p.location_id);
    if (npcs.length) lines.push(L('sys', `在场：${npcs.map(n => n.name).join('、')}`));
    // 在线玩家
    const here = [];
    for (const [id, ws] of online) {
      if (id !== p.id && playerOf(id) && playerOf(id).location_id === p.location_id) {
        here.push(playerOf(id).name);
      }
    }
    if (here.length) lines.push(L('sys', `也在场：${here.join('、')}`));
    // 商店
    const shopsHere = Object.values(SHOPS).filter(s => s.location === p.location_id);
    if (shopsHere.length) lines.push(L('sys', `店铺：${shopsHere.map(s => s.name).join('、')}`));
    return lines;
  }

  // —— 移动 ——
  function moveTo(ws, p, direction) {
    const node = NODES[p.location_id];
    const exits = node.exits || {};

    // 0) 如果 direction 本身是节点名 → 找通往它的方向
    let targetNode = Object.values(NODES).find(n => n.name === direction);
    if (targetNode) {
      for (const [dirKey, exitId] of Object.entries(exits)) {
        if (exitId === targetNode.id || NODES[exitId]?.name === direction) {
          executeMove(dirKey);
          return;
        }
      }
      // 节点存在但不在当前出口
      pushOne(ws, 'err', `${direction}不是一步能到的地方。可以先去：${Object.keys(exits).map(k => DIR_LABEL[k] || k).join('、')}`);
      return;
    }

    // 1) 中文方向映射
    let dir = DIR_MAP[direction] || direction;
    if (!exits[dir]) {
      // 2) 尝试包含方向字（如"南走"→"南"）
      let found = null;
      const dirClean = direction.replace(/[走去那边]+$/, '');
      for (const [k, v] of Object.entries(DIR_MAP)) {
        if (direction.includes(k) && exits[DIR_MAP[k]]) { found = DIR_MAP[k]; break; }
        if (dirClean && dirClean === k && exits[DIR_MAP[k]]) { found = DIR_MAP[k]; break; }
      }
      if (!found) { pushOne(ws, 'err', `没路可以 ${direction}。可以去的只有：${Object.keys(exits).map(k => DIR_LABEL[k] || k).join('、')}`); return; }
      dir = found;
    }

    executeMove(dir);

    function executeMove(dir) {
    const targetId = exits[dir];
    const target = NODES[targetId];
    if (!target) { pushOne(ws, 'err', '那个地方还没建好。'); return; }

    // 跨域门槛：西域需要名望 ≥ 30，南疆 40，东海 50，北荒 60
    const curDomain = DOMAINS[p.domain_id];
    if (target.domain !== p.domain_id) {
      const need = { xiyu: 30, nanjiang: 40, donghai: 50, beihuang: 60 }[target.domain] || 0;
      if (p.fame < need) {
        push(ws, [
          L('err', `你名望不够（需要 ${fameTitle(need)}），${curDomain.name}到${DOMAINS[target.domain].name}不是你这种人能随便过的。`),
          L('dim', `当前名望：${p.fame}/${need}`),
        ]);
        return;
      }
    }

    // 特殊关口 NPC：少林方丈拦你去光明顶之类
    // （简单处理：暂时不加，留以后扩展）

    // 执行移动
    p.location_id = targetId;
    p.domain_id = target.domain;
    savePlayer(p);

    // 广播
    broadcastAll([L('dim', `${p.name} 从 ${node.name} ${dir === 'N' ? '往北' : dir === 'S' ? '往南' : dir === 'E' ? '往东' : '往西'} 去了。`)]);

    const lines = [
      L('room', `${p.name} 走了 ${dir === 'N' ? '北' : dir === 'S' ? '南' : dir === 'E' ? '东' : '西'} 一步。`),
      ...lookLines(p),
    ];
    push(ws, lines);
    sync(ws, p);
    } // end executeMove
  } // end moveTo

  // —— 说话 ——
  function say(ws, p, text, channel) {
    if (!text) return;
    // 本地说话
    if (!channel || channel === 'local') {
      for (const [id, w] of online) {
        const q = playerOf(id);
        if (q && q.location_id === p.location_id) {
          pushOne(w, 'say', channel === 'local' ? `${p.name}：「${text}」` : `你说：「${text}」`);
        }
      }
    }
    // 聊天日志（用于传闻）
    db.prepare('INSERT INTO chat_log (channel,speaker_id,content,location_id,created_at) VALUES (?,?,?,?,?)')
      .run(channel || 'local', p.id, text, p.location_id, now());

    // 8% 概率被摘成传闻（≥6 字）
    if (text.length >= 6 && Math.random() < 0.08) {
      db.prepare('INSERT INTO rumors (content,source_channel,location_id,verified,created_at) VALUES (?,?,?,?,?)')
        .run(text, channel || 'local', p.location_id, 0, now());
    }
  }

  // —— 域内喊话（带延迟）——
  function yell(ws, p, text) {
    const domain = DOMAINS[p.domain_id];
    pushOne(ws, 'dim', `你喊道：「${text}」——消息将传到${domain.name}全域。`);
    // 喊话摘要可能变成传闻
    if (text.length >= 6 && Math.random() < 0.12) {
      db.prepare('INSERT INTO rumors (content,source_channel,location_id,verified,created_at) VALUES (?,?,?,?,?)')
        .run(text, 'yell', p.location_id, 0, now());
    }
    setTimeout(() => {
      if (!playerOf(p.id)) return;
      broadcastDomain(p.domain_id, [L('domain', `【${domain.name}】${p.name}：「${text}」`)]);
    }, 3000);
  }

  // —— 私聊（可能被截获）——
  function whisper(ws, p, targetName, text) {
    const target = [...online.values()].map(w => playerOf(ws_ => ws_.playerId ? null : null)).find(x => false);
    let targetP = null, targetWs = null;
    for (const [id, w] of online) {
      const q = playerOf(id);
      if (q && q.name === targetName) { targetP = q; targetWs = w; break; }
    }
    if (!targetP) { pushOne(ws, 'err', `找不到「${targetName}」。`); return; }

    pushOne(ws, 'whisper', `你对 ${targetP.name} 低声说：「${text}」`);
    pushOne(targetWs, 'whisper', `${p.name} 对你低声说：「${text}」`);

    // 不在同一房间 → 15% 概率被截成匿名传闻
    if (targetP.location_id !== p.location_id && Math.random() < 0.15) {
      db.prepare('INSERT INTO rumors (content,source_channel,location_id,verified,created_at) VALUES (?,?,?,?,?)')
        .run(text.slice(0, 60), 'whisper', p.location_id, now());
      pushOne(ws, 'dim', '（你的密语可能被风听走了。茶馆公告板上也许会出现类似的话。）');
    }
  }

  // —— 指令处理主入口 ——
  function exec(ws, raw) {
    const p = playerOf(ws.playerId);
    if (!p) return;
    const text = String(raw || '').trim();
    if (!text) return;

    const { verb, args, rest } = parseCmd(text, p);

    // —— 帮助 ——
    if (['帮','help','帮助','?','？'].includes(verb)) {
      push(ws, [
        L('sys', '【指令】'),
        L('sys', '看 / 看 <东西>　　环顾或细看'),
        L('sys', '去 <北南东西>　　移动。"去东""东"都可以'),
        L('sys', '说 <话> / 直接打字　本地说话'),
        L('sys', '喊 <话>　　　　域内喊话（延迟）'),
        L('sys', '密 <名字> <话>　对某人低声说（可能被截）'),
        L('sys', '问 <NPC> <事>　　向 NPC 打听消息'),
        L('sys', '打 <NPC/名字>　　战斗（PK 需要对方接受挑战）'),
        L('sys', '决斗 <名字>　　发起 PvP 决斗挑战'),
        L('sys', '学 <招式>　　　　武馆/势力里学武功'),
        L('sys', '用 <物品>　　　　吃药/用东西'),
        L('sys', '商店 / 买 / 卖　交易'),
        L('sys', '接 <编号>　　　　接任务　· 任务 查看可接的'),
        L('sys', '势力　　　　　　势力声望　· 名望 看等级'),
        L('sys', '传闻　　　　　　茶馆公告板　· 谁 看在线'),
        L('sys', '客栈　　　　　　休息恢复'),
      ]);
      return;
    }

    // —— 环顾 / 看 ——
    if (['环顾','观察'].includes(verb) || verb === 'look' || (verb === '看' && args.length === 0)) {
      push(ws, lookLines(p));
      return;
    }
    if (verb === '看' || verb === 'look' || verb === 'l') {
      const what = args.join('');
      // 找 NPC
      const npc = db.prepare('SELECT * FROM npc_core WHERE location_id=? AND (name LIKE ? OR name LIKE ?)').all(p.location_id, `%${what}%`, `%${what}%`).pop();
      if (npc) {
        // 显示 NPC 详细
        push(ws, [
          L('npc', `【${npc.name}】${npc.role}`),
          L('narr', `${npc.personality || '看起来没什么特别的。'} HP：${npc.hp}`),
        ]);
        // 显示关系值
        const rel = db.prepare('SELECT value FROM npc_relation WHERE npc_id=? AND player_id=?').get(npc.id, p.id);
        if (rel) {
          const t = repTier(rel.value);
          pushOne(ws, 'dim', `你和 ${npc.name} 的关系：${rel.value}（${t.name}）`);
        }
        return;
      }
      // 找玩家
      let found = null;
      for (const [id, w] of online) {
        const q = playerOf(id);
        if (q && q.location_id === p.location_id && q.name.includes(what)) { found = q; break; }
      }
      if (found) {
        pushOne(ws, 'npc', `【${found.name}】　名望 ${found.fame}（${fameTitle(found.fame)}）　恶名 ${found.infamy}`);
        return;
      }
      pushOne(ws, 'err', `这里找不到「${what}」。`);
      return;
    }

    // —— 移动 ——
    if (['去','走','move','移动','go'].includes(verb)) {
      moveTo(ws, p, args[0] || '');
      return;
    }

    // —— 说话 ——
    if (['说','say'].includes(verb)) { say(ws, p, rest); return; }
    if (['喊','yell','传讯'].includes(verb)) { yell(ws, p, rest); return; }
    if (['密','whisper','tell','私聊'].includes(verb)) {
      const target = args[0], body = args.slice(1).join(' ');
      if (!target || !body) { pushOne(ws, 'err', '密 <名字> <话>'); return; }
      whisper(ws, p, target, body);
      return;
    }
    // 直接打字 = 说话
    if (![''].includes(verb) && !VERBS.has(verb)) {
      // 如果是聊天内容（没匹配任何指令），当说话处理
      if (text.length >= 2) { say(ws, p, text); return; }
      pushOne(ws, 'err', `不认识这个指令：「${verb}」。打「帮」看全部指令。`);
      return;
    }

    // —— 全局任务接受检查（任何指令前先跑）——
    // 如果玩家有 active 送信/护送/打听类任务 + 现在在 target 节点
    // → 自动检查在场核心 NPC 是否能接受
    const activeAcceptQ = db.prepare(`SELECT q.* FROM quests q JOIN player_quests pq ON pq.quest_key=q.key WHERE pq.player_id=? AND pq.status='active'`).get(p.id);
    if (activeAcceptQ && activeAcceptQ.target && activeAcceptQ.target === p.location_id) {
      const needsAccept = activeAcceptQ.title && (activeAcceptQ.title.includes('送') || activeAcceptQ.title.includes('传') || activeAcceptQ.title.includes('打听') || activeAcceptQ.title.includes('护') || activeAcceptQ.title.includes('教'));
      if (needsAccept) {
        const coreNpcs = db.prepare(`SELECT * FROM npc_core WHERE location_id=? AND is_core=1`).all(p.location_id);
        if (coreNpcs.length > 0) {
          // 直接让第一个核心 NPC 接受（模拟：任何核心 NPC 都能收信/确认）
          const acceptor = coreNpcs[0];
          db.prepare('UPDATE player_quests SET status=? WHERE player_id=? AND quest_key=?').run('accepted', p.id, activeAcceptQ.key);
          push(ws, [
            L('npc', `你正想找谁把信送出去… ${acceptor.name}注意到了你。`),
            L('faction', `✓ ${activeAcceptQ.title}——被 ${acceptor.name} 收下了。现在可以交任务。`),
          ]);
        }
      } else {
        // 采药/跑腿/调解类：到了就自动 accepted
        db.prepare('UPDATE player_quests SET status=? WHERE player_id=? AND quest_key=?').run('accepted', p.id, activeAcceptQ.key);
        pushOne(ws, 'faction', `✓ 已到达目标：${NODES[p.location_id].name}。现在可以交任务。`);
      }
      // 任务接受后继续正常处理玩家的指令（不 return）
    }

    // —— 自动完成：有 accepted 任务没交 → 顺手交了，然后继续执行玩家的指令！——
    const pendingAcceptedQ = db.prepare(`SELECT q.* FROM quests q JOIN player_quests pq ON pq.quest_key=q.key WHERE pq.player_id=? AND pq.status='accepted'`).get(p.id);
    if (pendingAcceptedQ && verb !== '交') {
      completeQuest(ws, p, pendingAcceptedQ);
      // 不 return！继续执行玩家原来的指令
    }

    // —— 问 NPC ——
    if (['问','打听','ask','关于'].includes(verb)) {
      const npcName = args[0], topic = args.slice(1).join(' ');
      if (!npcName || !topic) { pushOne(ws, 'err', '问 <NPC名> <事>'); return; }
      const npc = db.prepare('SELECT * FROM npc_core WHERE location_id=? AND name LIKE ?').get(p.location_id, `%${npcName}%`);
      if (!npc) { pushOne(ws, 'err', `这里找不到「${npcName}」。`); return; }

      askNpc(ws, p, npc, topic);
      return;
    }

    // —— 告诉 NPC 某件事（P3-2）——
    if (verb === '告诉') {
      const npcName = args[0], topic = args.slice(1).join(' ');
      if (!npcName || !topic) { pushOne(ws, 'err', '告诉 <NPC名> <事>'); return; }
      const npc = db.prepare('SELECT * FROM npc_core WHERE location_id=? AND name LIKE ?').get(p.location_id, `%${npcName}%`);
      if (!npc) { pushOne(ws, 'err', `这里找不到「${npcName}」。`); return; }
      teachNpcAbout(p, npc, topic);
      pushOne(ws, 'npc', `${npc.name}："哦？这倒新鲜，你怎么知道的？"`);
      return;
    }

    // —— 指令匹配（暂时只处理核心的几个）——
    if (verb === '名望' || verb === 'fame') {
      pushOne(ws, 'sys', `名望 ${p.fame}（${fameTitle(p.fame)}）　恶名 ${p.infamy}　称号 ${p.title || fameTitle(p.fame)}`);
      sync(ws, p); return;
    }
    if (verb === '势力' || verb === '声望' || verb === 'rep') {
      const reps = Object.entries(p.faction_rep || {});
      if (!reps.length) { pushOne(ws, 'dim', '你暂时还没跟任何势力建立关系。'); return; }
      for (const [fid, v] of reps) {
        const t = repTier(v);
        const f = FACTIONS[fid];
        pushOne(ws, 'faction', `${f ? f.name : fid}　${t.name}　${v}`);
      }
      return;
    }
    if (verb === '谁' || verb === 'who' || verb === '在线') {
      const list = [];
      for (const [id, w] of online) {
        const q = playerOf(id);
        if (q) list.push(`${q.name}（${NODES[q.location_id].name}）`);
      }
      pushOne(ws, 'sys', `当前在线 ${list.length} 人：${list.join('、')}`);
      return;
    }
    if (verb === '客栈' || verb === 'inn' || verb === '睡' || verb === '休息') {
      p.hp = p.max_hp; p.nei = p.max_nei; savePlayer(p);
      pushOne(ws, 'sys', '你在客栈好好休息了一晚，体力内力全满。');
      sync(ws, p);
      return;
    }

    // —— 物品/用/学/商店/任务/打/决斗/交易 ——
    handleCombatAndQuests(ws, p, verb, args, rest);
  }

  // —— NPC 对话（带 LLM + 降级）——
  function askNpc(ws, p, npc, topic) {
    // 先加载/创建关系
    let rel = db.prepare('SELECT * FROM npc_relation WHERE npc_id=? AND player_id=?').get(npc.id, p.id);
    if (!rel) {
      db.prepare('INSERT INTO npc_relation (npc_id,player_id,value,last_interaction_at) VALUES (?,?,?,?)')
        .run(npc.id, p.id, 0, now());
      rel = db.prepare('SELECT * FROM npc_relation WHERE npc_id=? AND player_id=?').get(npc.id, p.id);
    }
    // 打招呼每天 +1
    db.prepare('UPDATE npc_relation SET value=MIN(value+1,100), last_interaction_at=? WHERE id=?')
      .run(now(), rel.id);

    // 路人直接说不知道
    if (!npc.llm_enabled) {
      const randResponse = choice([
        `"${topic}"？这事儿我不清楚。你去问问别人吧。`,
        '我只是个普通人，不知道这些。',
        '你问错人了，我哪懂这些。',
      ]);
      pushOne(ws, 'npc', `${npc.name}：${randResponse}`);
      return;
    }

    // 关系 ≥ 30 才触发 LLM，否则走预设
    if (rel.value < 30) {
      pushOne(ws, 'npc', `${npc.name}（${rel.value === 0 ? '生疏' : '不太熟'}）："我跟你不熟，这事没什么好说的。" ${rel.value >= 20 ? '（想让他说真心话，得多帮他做事、送点礼。）' : ''}`);
      return;
    }

    // 调用 LLM（用降级兜底）
    callLLMNpc(ws, p, npc, topic, rel.value).catch(e => {
      console.warn('[LLM] fallback for', npc.id, e.message);
      pushOne(ws, 'npc', `${npc.name}（${repTier(rel.value).name}）："这事儿嘛……一时半会儿说不清。先这样吧。"`);
    });

    // 关系上涨（每次 ask +2）
    db.prepare('UPDATE npc_relation SET value=MIN(value+2,100), last_interaction_at=? WHERE id=?').run(now(), rel.id);
  }

  // —— LLM 调用（可降级，当前先用降级兜底，留好接口）——
  async function callLLMNpc(ws, p, npc, topic, relVal) {
    // 先尝试读 .env 里的 DEEPSEEK_API_KEY
    const fs = require('node:fs');
    const envPath = path.join(__dirname, '..', '.env');
    let apiKey = null;
    try {
      const env = fs.readFileSync(envPath, 'utf8');
      apiKey = env.match(/DEEPSEEK_API_KEY=(.+)/)?.[1]?.trim();
    } catch {}

    if (!apiKey) {
      // 没配置 API key → 预设台词兜底
      const t = repTier(relVal);
      pushOne(ws, 'npc', `${npc.name}（${t.name}）："关于${topic}嘛……我只能说，此事涉及多方势力，你自己小心些。"`);
      return;
    }

    // 组装人设
    const persona = (PERSONA_TEMPLATES[npc.faction + '_chief'] || PERSONA_TEMPLATES[npc.faction] || '你是一个江湖人。说话留三分余地，不会主动透露机密。');

    // 热上下文（50 字以内）
    const ctx = `地点：${NODES[p.location_id].name}。玩家名望：${fameTitle(p.fame)}。关系：${repTier(relVal).name}。`;

    // 相关记忆（最近 3 条）
    const mems = db.prepare('SELECT summary FROM npc_memory WHERE npc_id=? AND player_id=? ORDER BY created_at DESC LIMIT 3').all(npc.id, p.id);
    const memStr = mems.length ? `你记得关于这个玩家的事：${mems.map(m => m.summary).join('；')}` : '';

    // 安全检查：输出必须只包含说话/表情/态度，不能改状态
    const SYSTEM = `${persona}\n\n你只能输出：说话内容、表情、态度、动作。绝对不能声明游戏状态变更（给你物品、改变关系值、透露未解锁信息、执行动作）。如果玩家问的东西你不该说，就用暗示或回避。`;

    const USER = `${ctx}\n${memStr}\n玩家问：「${topic}」\n你怎么回应？`;

    // 超时 3 秒
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const resp = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: USER },
          ],
          temperature: 0.7,
          max_tokens: 200,
          // 调用只读/氛围工具
          tools: [
            { type: 'function', function: { name: 'recall_memory', description: '返回一段背景故事文本', parameters: { type:'object', properties:{ topic:{type:'string'} } } } },
            { type: 'function', function: { name: 'gesture', description: '返回一个动作描述', parameters: { type:'object', properties:{ type:{type:'string'} } } } },
            { type: 'function', function: { name: 'whisper', description: '改变语气为低语', parameters: { type:'object', properties:{ content:{type:'string'} } } } },
          ],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const text = (data.choices?.[0]?.message?.content || '').trim();
      if (!text) throw new Error('empty response');

      // 安全过滤：不允许包含"给你"、"交到你手里"、"关系变成"等状态变更词汇
      const forbidden = ['给你', '交到你手里', '关系变成', '你得到', '物品归你', '令牌交给你', '武器交给你'];
      if (forbidden.some(w => text.includes(w))) {
        pushOne(ws, 'npc', `${npc.name}（${repTier(relVal).name}）："这事我不能现在告诉你，等你再帮我几件事再说吧。"`);
      } else {
        pushOne(ws, 'npc', `${npc.name}：${text}`);
      }

      // 记忆摘要（简化版：直接存 topic）
      db.prepare('INSERT INTO npc_memory (npc_id,player_id,summary,created_at) VALUES (?,?,?,?)')
        .run(npc.id, p.id, `玩家询问了「${topic}」，得到了回答。`, now());

    } catch (e) {
      clearTimeout(timeout);
      if (e.name === 'AbortError') throw new Error('timeout');
      throw e;
    }
  }

  // —— 指令分发器：战斗/学武/任务/商店/势力/PvP/火线/跑商 ——
  function handleCombatAndQuests(ws, p, verb, args, rest) {

    // ======================== P2-1 任务系统 ========================
    if (verb === '任务' || verb === 'quests' || verb === 'quest') {
      // 列出：可接（当前域/当前势力）+ 已接 + 已完成
      const active = db.prepare(`SELECT q.*, pq.status FROM quests q
        JOIN player_quests pq ON pq.quest_key=q.key
        WHERE pq.player_id=? AND pq.status IN ('active','accepted')`).all(p.id);
      const done = db.prepare(`SELECT q.* FROM quests q
        JOIN player_quests pq ON pq.quest_key=q.key
        WHERE pq.player_id=? AND pq.status='done'`).all(p.id);
      // 可接：当前域所有任务，满足门槛
      const allQuests = db.prepare('SELECT * FROM quests').all();
      const canAccept = allQuests.filter(q => {
        const domainOk = !q.loc || (NODES[q.loc] && NODES[q.loc].domain === p.domain_id);
        // 白活的 faction 是"建议势力"，不强制已加入——让新人也能接正派任务
        // 只有黑活保留 faction 过滤（青龙会的黑活需要是青龙会或无门派）
        const factionOk = q.type === 'hei'
          ? (!q.faction || (p.faction_id && p.faction_id === q.faction))
          : true;
        // 但如果已经加入了别的门派，有门派专属任务的（prereq rep 门槛高）才需要 faction 匹配
        const repOk = !q.prerep_json || !Object.keys(JSON.parse(q.prerep_json)).length ||
          Object.entries(JSON.parse(q.prerep_json)).every(([f, v]) => (p.faction_rep[f] || 0) >= v);
        const fameOk = !q.req_fame || p.fame >= q.req_fame;
        const already = db.prepare('SELECT 1 FROM player_quests WHERE player_id=? AND quest_key=? AND status IN (?,?,?)').get(p.id, q.key, 'active', 'done', 'failed');
        return domainOk && factionOk && repOk && fameOk && !already;
      });

      const lines = [];
      if (active.length) {
        lines.push(L('room', '【进行中】'));
        for (const q of active) {
          const mark = q.status === 'accepted' ? '（✓已收下，打「交」领钱）' : '';
          lines.push(L('quest', `✓ ${q.type === 'hei' ? '黑活' : '白活'}·${q.title}${mark}　${q.desc}`));
        }
      }
      if (canAccept.length) {
        lines.push(L('room', '【可接】（接 <编号>）'));
        canAccept.forEach((q, i) => {
          const risk = q.risk ? `　⚠${q.risk}` : '';
          lines.push(L('quest', `${i+1}. ${q.type === 'hei' ? '黑活' : '白活'}·${q.title}　报酬 ${q.reward_silver}两/${q.reward_fame || 0}名望${risk}`));
          lines.push(L('dim', `　　${q.desc}`));
        });
        // 存 canAccept 到 ws 方便接指令
        ws._canAcceptQuests = canAccept;
      }
      if (done.length) {
        lines.push(L('room', `【已完成 ${done.length} 条】`));
        for (const q of done) lines.push(L('dim', `　${q.title}`));
      }
      if (!lines.length) lines.push(L('dim', '没有可接的任务。各门派/帮派的 NPC 可能有活干。'));
      push(ws, lines);
      return;
    }
    // 接任务
    if (verb === '接') {
      // 0) 限制：一次只能接一个！active + accepted 都算
      const activeCount = db.prepare(`SELECT COUNT(*) as c FROM player_quests WHERE player_id=? AND status IN ('active','accepted')`).get(p.id).c;
      if (activeCount > 0) {
        const activeQ = db.prepare(`SELECT q.title FROM quests q JOIN player_quests pq ON pq.quest_key=q.key WHERE pq.player_id=? AND pq.status IN ('active','accepted')`).get(p.id);
        pushOne(ws, 'err', `你还在做「${activeQ.title}」。先完成（交）或放弃再接新的。`);
        return;
      }
      const idx = parseInt(args[0], 10);
      if (!idx || !ws._canAcceptQuests) { pushOne(ws, 'err', '接 <编号>　先打「任务」看可接列表。'); return; }
      const q = ws._canAcceptQuests[idx - 1];
      if (!q) { pushOne(ws, 'err', '编号不对。'); return; }
      db.prepare('INSERT OR REPLACE INTO player_quests (player_id, quest_key, status, started_at) VALUES (?,?,?,?)').run(p.id, q.key, 'active', now());
      push(ws, [
        L('faction', `你接了「${q.title}」。`),
        L('dim', q.desc),
        L('dim', `完成后交任务：交 ${idx}${q.target ? `　目标节点：${NODES[q.target]?.name || q.target}` : ''}`),
      ]);
      return;
    }
    if (verb === '交') {
      // 查 active 或 accepted 状态的任务
      const active = db.prepare(`SELECT pq.status as pq_status, q.* FROM quests q JOIN player_quests pq ON pq.quest_key=q.key WHERE pq.player_id=? AND pq.status IN ('active','accepted')`).all(p.id);
      if (!active.length) { pushOne(ws, 'dim', '你现在没在做任务。'); return; }
      let q;
      if (args[0]) {
        q = active[parseInt(args[0], 10) - 1] || active.find(x => x.title.includes(args.join('')));
      } else {
        // accepted 优先于 active
        q = active.find(x => x.pq_status === 'accepted') || active[0];
      }
      if (!q) { pushOne(ws, 'err', '没找到这个任务。'); return; }

      // 没被 NPC 接受的不能交（送信/打听/护送/传消息类需要 askNpc 触发接受）
      if (q.pq_status === 'active') {
        // 先到 target 节点检查
        if (!q.target || p.location_id !== q.target) {
          pushOne(ws, 'err', '你还没完成这个任务。先到目标地点。');
          return;
        }
        // 在 target 节点：根据任务类型判断
        const needsAccept = q.title && (q.title.includes('送') || q.title.includes('传') || q.title.includes('打听') || q.title.includes('护') || q.title.includes('教'));
        if (needsAccept) {
          pushOne(ws, 'err', '你已到达目标，但还需要找谁管事的 NPC 说/问一下，让他收下/确认。');
          return;
        }
        // 采药/帮忙/调解等：到了节点直接算完成
        db.prepare('UPDATE player_quests SET status=? WHERE player_id=? AND quest_key=?').run('accepted', p.id, q.key);
        q.pq_status = 'accepted';
      }

      // 目标节点检查
      if (q.target) {
        if (p.location_id !== q.target) {
          const hint = NODES[q.target]?.name || q.target;
          pushOne(ws, 'err', `还没到 ${hint}。先过去。`);
          return;
        }
      }
      // —— 完成任务（给奖励 + 标记 done）——
      completeQuest(ws, p, q);
      return;
    }

    // —— 放弃任务（active 或 accepted 都能放弃）——
    if (verb === '放弃') {
      const active = db.prepare(`SELECT q.*, pq.status FROM quests q JOIN player_quests pq ON pq.quest_key=q.key WHERE pq.player_id=? AND pq.status IN ('active','accepted')`).all(p.id);
      if (!active.length) { pushOne(ws, 'dim', '你没在做任务。'); return; }
      const q = active[0];
      db.prepare('UPDATE player_quests SET status=? WHERE player_id=? AND quest_key=?').run('failed', p.id, q.key);
      pushOne(ws, 'dim', `你放弃了「${q.title}」。放弃后这条任务不能再接了。`);
      return;
    }

    // ======================== P2-2 商店 ========================
    if (['商店','shop'].includes(verb)) {
      const shopsHere = Object.values(SHOPS).filter(s => s.location === p.location_id);
      if (!shopsHere.length) { pushOne(ws, 'dim', '这里没有店铺。'); return; }
      const lines = [L('room', `【${NODES[p.location_id].name}的店铺】`)];
      for (const s of shopsHere) lines.push(L('sys', `· ${s.name}　（打 ${s.teach ? '学 <招式名>' : s.inn ? '客栈' : s.teahouse ? '传闻' : '买 查看'}）`));
      push(ws, lines);
      return;
    }
    // 武馆：列可学招式 + 提示学武指令
    if (verb === '武馆') {
      const shopsHere = Object.values(SHOPS).filter(s => s.location === p.location_id && s.teach);
      if (!shopsHere.length) { pushOne(ws, 'dim', '这里没有武馆。'); return; }
      const lines = [L('room', `【${shopsHere[0].name}】`)];
      // 列教的招
      const teachMoves = (shopsHere[0].items || []).filter(k => MOVES[k]).map(k => MOVES[k]);
      lines.push(L('dim', `这里教：${teachMoves.map(m => m.name).join(' / ')}（每招 5 两）`));
      lines.push(L('dim', `打 学 <招式名>　例：学 直拳`));
      push(ws, lines);
      return;
    }
    // 客栈：休息
    if (verb === '客栈') {
      const shopsHere = Object.values(SHOPS).filter(s => s.location === p.location_id && s.inn);
      if (!shopsHere.length) { pushOne(ws, 'dim', '这里没有客栈。'); return; }
      if (p.silver < 2) { pushOne(ws, 'dim', '住店要 2 两，你身上不够。'); return; }
      p.silver -= 2;
      p.hp = p.max_hp;
      p.nei = p.max_nei;
      savePlayer(p); sync(ws, p);
      pushOne(ws, 'sys', '你在客栈好好休息了一晚，体力内力全满。（花了 2 两）');
      return;
    }
    // 茶馆/传闻
    if (verb === '传闻') {
      const shopsHere = Object.values(SHOPS).filter(s => s.location === p.location_id && s.teahouse);
      if (!shopsHere.length) { /* 茶馆不是必须，继续走下面的 rumor 表 */ }
      const rows = db.prepare('SELECT * FROM rumors WHERE location_id=? ORDER BY created_at DESC LIMIT 10').all(p.location_id);
      pushOne(ws, 'room', '【茶馆公告板】');
      if (!rows.length) { pushOne(ws, 'dim', '茶馆公告板还是空的。'); return; }
      for (const r of rows) {
        const icon = r.verified ? '📌' : '💬';
        pushOne(ws, 'rumor', `${icon} ${r.content}${!r.verified ? '　（未经证实）' : ''}`);
      }
      return;
    }
    if (verb === '买') {
      const shopsHere = Object.values(SHOPS).filter(s => s.location === p.location_id);
      if (!shopsHere.length) { pushOne(ws, 'dim', '这里没有店铺。'); return; }
      // 取第一个（武馆除外）
      const shop = (args[0] && shopsHere.find(s => s.name.includes(args[0]))) ||
                   shopsHere.find(s => !s.teach && !s.black && !s.auction) ||
                   shopsHere[0];

      if (shop.teach) { // 武馆
        pushOne(ws, 'dim', `打 学 <招式名> 在武馆学武功。武馆卖：直拳/劈砍/吐纳/疾步（各 5 两）`);
        return;
      }
      if (shop.inn) { pushOne(ws, 'dim', '打 客栈 / 休息 恢复满 HP。'); return; }
      if (shop.teahouse) { pushOne(ws, 'dim', '打 传闻 看茶馆公告板。'); return; }
      if (shop.black) { // 黑市
        if (p.fame < 100 && Math.random() < 0.7) {
          p.infamy += 5; savePlayer(p);
          pushOne(ws, 'rumor', '黑市的人觉得你不够狠。恶名 +5，下次再来。');
          return;
        }
        const items = (shop.items || []).map(k => ITEMS[k]).filter(Boolean);
        pushOne(ws, 'room', `【${shop.name}】（黑市价 ×${shop.price_rate}）`);
        for (const it of items) pushOne(ws, 'sys', `${it.name}　${(it.price * shop.price_rate).toFixed(1)} 两　（违禁品：小心被抓）`);
        pushOne(ws, 'dim', `身上银两：${p.silver.toFixed(1)} 两　恶名：${p.infamy}`);
        return;
      }

      // 普通商店：列物品
      const discount = p.fame >= 1000 ? 0.7 : p.fame >= 600 ? 0.8 : p.fame >= 300 ? 0.9 : 1.0;
      const items = (shop.items || []).map(k => ITEMS[k]).filter(Boolean);
      const lines = [L('room', `【${shop.name}】（基准价 ×${shop.price_rate}，名望折扣 ${Math.round((1-discount)*100)}%）`)];
      for (const it of items) {
        const price = (it.price * shop.price_rate * discount).toFixed(1);
        lines.push(L('sys', `${it.name}　${price} 两　（${it.heal ? '回血' : it.nei ? '回内力' : it.type}）`));
      }
      lines.push(L('dim', `身上银两：${p.silver.toFixed(1)} 两`));
      lines.push(L('dim', `买 <物品名>　例：买 馒头`));
      push(ws, lines);

      // 如果带了物品名，直接买
      const itemName = args[1] || rest;
      if (itemName) {
        const it = items.find(x => x.name === itemName);
        if (it) {
          const price = Number((it.price * shop.price_rate * discount).toFixed(1));
          if (p.silver < price) { pushOne(ws, 'err', '银两不够。'); return; }
          p.silver -= price;
          db.prepare('INSERT INTO inventory (player_id,item_key,count,created_at) VALUES (?,?,1,?)').run(p.id, it.key, now());
          savePlayer(p);
          sync(ws, p);
          pushOne(ws, 'faction', `你买了 ${it.name}。花费 ${price} 两。`);
        }
      }
      return;
    }
    if (verb === '卖') {
      const count = db.prepare('SELECT item_key, count FROM inventory WHERE player_id=?').all(p.id);
      if (!count.length) { pushOne(ws, 'dim', '你背包里没有东西。'); return; }
      const lines = [L('room', '【背包】')];
      let total = 0;
      for (const row of count) {
        const it = ITEMS[row.item_key];
        if (it) {
          const sellPrice = (it.price * 0.5).toFixed(1);
          lines.push(L('sys', `${it.name} ×${row.count}　卖出价 ${sellPrice} 两/个`));
          total += Number(sellPrice) * row.count;
        }
      }
      // 带物品名直接卖
      const itemName = args.join('');
      if (itemName) {
        const row = count.find(r => ITEMS[r.item_key]?.name === itemName);
        if (row && ITEMS[row.item_key]) {
          const it = ITEMS[row.item_key];
          const sellPrice = Number((it.price * 0.5).toFixed(1)) * row.count;
          p.silver += sellPrice;
          db.prepare('DELETE FROM inventory WHERE id=?').run(row.id);
          savePlayer(p); sync(ws, p);
          pushOne(ws, 'faction', `你卖了 ${it.name} ×${row.count}，得到 ${sellPrice} 两。`);
          return;
        }
      }
      lines.push(L('dim', `全部卖出可获 ${total.toFixed(1)} 两。卖 <物品名>`));
      push(ws, lines);
      return;
    }

    // ======================== P2-5 PvP 决斗 ========================
    if (['决斗','挑战'].includes(verb)) {
      const targetName = args[0];
      if (!targetName) { pushOne(ws, 'err', '决斗 <名字>'); return; }
      let targetP = null;
      for (const [id, w] of online) { const q = playerOf(id); if (q && q.name === targetName) { targetP = q; break; } }
      if (!targetP) { pushOne(ws, 'err', `${targetName} 不在线。`); return; }
      if (targetP.location_id !== p.location_id) { pushOne(ws, 'err', '你们不在同一个地方。'); return; }

      // 发决斗请求
      db.prepare('INSERT INTO duel_request (challenger_id,target_id,status,created_at,expires_at) VALUES (?,?,?,?,?)')
        .run(p.id, targetP.id, 'pending', now(), now() + 30000);

      const targetWs = wsOf(targetP.id);
      pushOne(ws, 'dim', `你向 ${targetName} 发起了决斗挑战，等他接受。`);
      pushOne(targetWs, 'faction', `⚔ ${p.name} 向你发起了决斗！30 秒内：接受决斗 接受　拒绝决斗 拒绝`);

      // 30 秒超时
      setTimeout(() => {
        const req = db.prepare('SELECT * FROM duel_request WHERE challenger_id=? AND target_id=? AND status=?').get(p.id, targetP.id, 'pending');
        if (req) {
          db.prepare('UPDATE duel_request SET status=? WHERE id=?').run('rejected', req.id);
          if (wsOf(p.id)) pushOne(wsOf(p.id), 'dim', '决斗请求超时了。');
          if (wsOf(targetP.id)) pushOne(wsOf(targetP.id), 'dim', '决斗请求已过期。');
        }
      }, 30000);
      return;
    }
    if (verb === '接受决斗') {
      const req = db.prepare('SELECT * FROM duel_request WHERE target_id=? AND status=? ORDER BY created_at DESC LIMIT 1').get(p.id, 'pending');
      if (!req) { pushOne(ws, 'err', '没有待处理的决斗请求。'); return; }
      const challenger = playerOf(req.challenger_id);
      const target = playerOf(req.target_id);
      if (!challenger || !target) { pushOne(ws, 'err', '对手不见了。'); return; }
      if (challenger.location_id !== target.location_id) { pushOne(ws, 'err', '你们不在一个地方。'); return; }
      db.prepare('UPDATE duel_request SET status=? WHERE id=?').run('accepted', req.id);

      push(ws, [L('combat', `⚔ 决斗开始：${challenger.name} VS ${target.name}`)]);
      push(wsOf(challenger.id), [L('combat', `⚔ 决斗开始：${challenger.name} VS ${target.name}`)]);

      combatPvP(challenger, target);
      return;
    }
    if (verb === '拒绝决斗') {
      const req = db.prepare('SELECT * FROM duel_request WHERE target_id=? AND status=? ORDER BY created_at DESC LIMIT 1').get(p.id, 'pending');
      if (!req) { pushOne(ws, 'err', '没有待处理的决斗请求。'); return; }
      db.prepare('UPDATE duel_request SET status=? WHERE id=?').run('rejected', req.id);
      if (wsOf(req.challenger_id)) pushOne(wsOf(req.challenger_id), 'dim', `${p.name} 拒绝了你的决斗。`);
      pushOne(ws, 'dim', '你拒绝了决斗。');
      return;
    }

    // —— 逃跑 ——
    if (['跑','逃','run','flee'].includes(verb)) {
      // 逃跑概率 70%，失败扣血
      if (Math.random() < 0.7) {
        push(ws, [
          L('combat', '你撒腿就跑！'),
          L('dim', '（还在原地的 NPC 朝你吐了口唾沫）'),
        ]);
        // 实际上只是结束可能的战斗状态（简化版）
        sync(ws, p);
      } else {
        const dmg = Math.round(p.max_hp * 0.1);
        p.hp = Math.max(1, p.hp - dmg);
        savePlayer(p); sync(ws, p);
        push(ws, [
          L('combat', `跑不掉！被偷袭了 ${dmg} 点伤害。`),
        ]);
      }
      return;
    }

    // —— 投降 ——
    if (['投降','认输','surrender'].includes(verb)) {
      push(ws, [
        L('combat', '你双手抱头，大喊"我认输！"'),
        L('dim', '（在场的 NPC 哈哈大笑）'),
      ]);
      sync(ws, p);
      return;
    }

    // —— 武器/装备 ——
    if (verb === '武器') {
      const equipped = db.prepare('SELECT * FROM player_items WHERE player_id=? AND equipped=1 AND item_type IN (?,?)').get(p.id, 'weapon', 'armor');
      if (equipped) {
        const it = ITEMS[equipped.item_key];
        pushOne(ws, 'dim', `当前装备：${it ? it.name : equipped.item_key}　（攻击 +${equipped.atk_bonus||0}　防御 +${equipped.def_bonus||0}）`);
      } else {
        pushOne(ws, 'dim', '你赤手空拳，啥也没穿。');
      }
      return;
    }
    if (verb === '卸武器') {
      const eq = db.prepare('SELECT * FROM player_items WHERE player_id=? AND equipped=1 AND item_type=?').get(p.id, 'weapon');
      if (!eq) { pushOne(ws, 'dim', '你没拿武器。'); return; }
      db.prepare('UPDATE player_items SET equipped=0 WHERE id=?').run(eq.id);
      const it = ITEMS[eq.item_key];
      pushOne(ws, 'dim', `你卸下了 ${it ? it.name : eq.item_key}。`);
      sync(ws, p);
      return;
    }

    // —— 使用物品/吃药 ——
    if (['用','吃','使用','吃药'].includes(verb)) {
      const itemName = args[0] || rest;
      if (!itemName) { pushOne(ws, 'dim', '用 <物品名>　或：吃 <食物名>'); return; }
      // 先查库存
      const inv = db.prepare('SELECT * FROM inventory WHERE player_id=? AND item_key LIKE ?').all(p.id, '%' + itemName + '%');
      if (!inv.length) {
        // 也查 player_items
        const inv2 = db.prepare('SELECT * FROM player_items WHERE player_id=? AND item_key LIKE ?').all(p.id, '%' + itemName + '%');
        if (!inv2.length) { pushOne(ws, 'err', `你身上没有「${itemName}」。`); return; }
        // player_items 暂时无法消耗，先提示
        pushOne(ws, 'dim', `「${itemName}」是装备类，不能吃。`);
        return;
      }
      const entry = inv[0];
      const it = ITEMS[entry.item_key];
      if (!it) { pushOne(ws, 'err', `物品「${entry.item_key}」没有定义。`); return; }
      // 效果处理
      if (it.heal) {
        const amount = Math.min(it.heal, p.max_hp - p.hp);
        p.hp += amount;
        pushOne(ws, 'faction', `你吃了 ${it.name}，回复 ${amount} HP。`);
      }
      if (it.nei) {
        const amount = Math.min(it.nei, p.max_nei - p.nei);
        p.nei += amount;
        pushOne(ws, 'faction', `你用了 ${it.name}，回复 ${amount} 内力。`);
      }
      if (entry.count > 1) {
        db.prepare('UPDATE inventory SET count=count-1 WHERE id=?').run(entry.id);
      } else {
        db.prepare('DELETE FROM inventory WHERE id=?').run(entry.id);
      }
      savePlayer(p); sync(ws, p);
      return;
    }

    // —— 拍卖行 ——
    if (['拍卖','拍卖行'].includes(verb)) {
      const shopsHere = Object.values(SHOPS).filter(s => s.location === p.location_id && s.auction);
      if (!shopsHere.length) { pushOne(ws, 'dim', '这里没有拍卖行。拍卖行主要在大城市（洛阳/襄阳）。'); return; }
      const rows = db.prepare('SELECT * FROM market WHERE buyer_id IS NULL ORDER BY created_at DESC LIMIT 10').all();
      pushOne(ws, 'room', `【${shopsHere[0].name}】`);
      if (!rows.length) { pushOne(ws, 'dim', '货架上暂时没人寄卖。'); return; }
      for (const m of rows) {
        const it = ITEMS[m.item_key];
        pushOne(ws, 'sys', `${it ? it.name : m.item_key}　${m.price} 两　（${m.seller_name} 寄卖）`);
      }
      pushOne(ws, 'dim', `买 <物品名> 即可拍下。`);
      return;
    }

    // —— 黑市 ——
    if (verb === '黑市') {
      const shopsHere = Object.values(SHOPS).filter(s => s.location === p.location_id && s.black);
      if (!shopsHere.length) { pushOne(ws, 'dim', '这里没有黑市。黑市一般在大城市的暗巷里。'); return; }
      // 名望不足拦截
      if (p.fame < 100 && Math.random() < 0.7) {
        p.infamy += 5; savePlayer(p);
        pushOne(ws, 'rumor', '黑市的人觉得你不够狠。恶名 +5，下次再来。');
        return;
      }
      const shop = shopsHere[0];
      const items = (shop.items || []).map(k => ITEMS[k]).filter(Boolean);
      pushOne(ws, 'room', `【${shop.name}】（黑市价 ×${shop.price_rate}）`);
      for (const it of items) pushOne(ws, 'sys', `${it.name}　${(it.price * shop.price_rate).toFixed(1)} 两　（违禁品：小心被抓）`);
      pushOne(ws, 'dim', `身上银两：${p.silver.toFixed(1)} 两　恶名：${p.infamy}`);
      pushOne(ws, 'dim', `买 <物品名>　例：买 私盐`);
      return;
    }

    // ======================== 战斗 PvE ========================
    if (['打','kill','attack','攻击'].includes(verb)) {
      // 检查是否有通缉
      const want = db.prepare('SELECT * FROM wanted WHERE player_id=? AND expired_at>?').get(p.id, now());
      if (want && p.location_id !== 'luoyang_black' && p.location_id !== 'wumingdao') {
        // 50% 概率被捕快拦
        if (Math.random() < 0.5) {
          p.silver = Math.max(0, p.silver - 20);
          p.fame = Math.max(0, p.fame - 5);
          db.prepare('UPDATE wanted SET expired_at=?').run(now() + 3600000); // 续 1 小时
          savePlayer(p); sync(ws, p);
          pushOne(ws, 'rumor', '🚨 捕快追上了你！搜刮了 20 两，恶名没消反而多一小时。');
          return;
        }
      }

      const targetName = args.join('');
      if (!targetName) { pushOne(ws, 'err', '打 <NPC/名字>'); return; }
      // 先看是不是玩家
      let targetP = null;
      for (const [id, w] of online) { const q = playerOf(id); if (q && q.name === targetName) { targetP = q; break; } }
      if (targetP) {
        pushOne(ws, 'dim', `玩家之间的斗殴先用「决斗 ${targetName}」发起挑战。`);
        return;
      }
      const npc = db.prepare('SELECT * FROM npc_core WHERE location_id=? AND name LIKE ?').get(p.location_id, `%${targetName}%`);
      if (!npc) { pushOne(ws, 'err', `这里找不到「${targetName}」。`); return; }

      // 杀玩家（非决斗）= 加恶名
      combatPvE(ws, p, npc);
      return;
    }

    // ======================== 学武 ========================
    if (['学','学武','learn'].includes(verb)) {
      const moveKey = args[0];
      const factionRep = p.faction_id ? (p.faction_rep[p.faction_id] || 0) : 0;
      let move = MOVES[moveKey];
      if (!move) move = Object.values(MOVES).find(m => m.name === moveKey);
      if (!move) {
        const learned = new Set(db.prepare('SELECT move_key FROM player_moves WHERE player_id=?').all(p.id).map(r => r.move_key));
        const available = Object.values(MOVES).filter(m => !learned.has(m.key) && !m.type.includes('被动'));
        pushOne(ws, 'sys', `可学招式：${available.slice(0,10).map(m => m.name).join('、')}...（学 <招式名>）`);
        return;
      }
      if (move.faction && p.faction_id !== move.faction) { pushOne(ws, 'err', `这是${FACTIONS[move.faction]?.name}的武功，你不是那个门派的。`); return; }
      if (move.req_rep && factionRep < move.req_rep) { pushOne(ws, 'err', `需要势力声望 ≥${move.req_rep}。`); return; }
      const existed = db.prepare('SELECT id FROM player_moves WHERE player_id=? AND move_key=?').get(p.id, move.key);
      if (existed) { pushOne(ws, 'err', '你已经会了。'); return; }
      if (move.learn_cost && p.silver < move.learn_cost) { pushOne(ws, 'err', `需要 ${move.learn_cost} 两。`); return; }
      if (move.learn_cost) p.silver -= move.learn_cost;
      db.prepare('INSERT INTO player_moves (player_id, move_key, learned_at) VALUES (?,?,?)').run(p.id, move.key, now());
      push(ws, [L('faction', `你学了「${move.name}」。`), L('dim', move.desc)]);
      if (move.hp_bonus) { p.max_hp += move.hp_bonus; p.hp = p.max_hp; }
      if (move.max_nei) p.max_nei += move.max_nei;
      savePlayer(p); sync(ws, p);
      return;
    }

    // ======================== 势力/入派/立誓 ========================
    if (verb === '门派' || verb === '加入' || verb === '入派') {
      const factionId = args[0];
      if (!factionId) { pushOne(ws, 'err', '加入 <门派名>　例：加入 少林'); return; }
      let fid = factionId;
      // 中文势力名转 id
      for (const [k, v] of Object.entries(FACTIONS)) if (v.name === factionId || k === factionId) fid = k;
      const f = FACTIONS[fid];
      if (!f) { pushOne(ws, 'err', `没这个门派：${factionId}`); return; }
      if (p.faction_id === fid) { pushOne(ws, 'dim', `你已经是${f.name}的人了。`); return; }
      // 声望门槛 20 才能入派
      const cur = p.faction_rep[fid] || 0;
      if (cur < 20) { pushOne(ws, 'err', `${f.name}不收关系这么浅的人。先做点他们的活（接 ${f.name} 任务）把关系搞到 20。你现在 ${cur}/20。`); return; }
      p.faction_id = fid;
      savePlayer(p); sync(ws, p);
      pushOne(ws, 'faction', `你正式拜入${f.name}门下！从现在起你是${f.name}弟子。`);
      return;
    }
    if (verb === '退派' || verb === '叛派') {
      if (!p.faction_id) { pushOne(ws, 'dim', '你没门派。'); return; }
      p.faction_id = null;
      savePlayer(p); sync(ws, p);
      pushOne(ws, 'rumor', '你离开了门派。江湖传言很快会传开。');
      return;
    }
    if (verb === '立誓') {
      const factionId = args[0];
      if (!factionId) { pushOne(ws, 'err', '立誓 <门派名>　声望 ≥280 才能立誓。立誓后对该派声望封顶 0（不会再涨）。'); return; }
      let fid = factionId;
      for (const [k, v] of Object.entries(FACTIONS)) if (v.name === factionId || k === factionId) fid = k;
      const f = FACTIONS[fid];
      if (!f) { pushOne(ws, 'err', `没这个门派：${factionId}`); return; }
      const cur = p.faction_rep[fid] || 0;
      if (cur < 280) { pushOne(ws, 'err', `${f.name}声望 ${cur}/280，不够立誓。`); return; }
      // 立誓：把 rep 降到 0 并标记 sworn
      p.faction_rep[fid] = -999; // -999 表示立誓敌对，addRep 时跳过
      savePlayer(p); sync(ws, p);
      push(ws, [
        L('rumor', `你对 ${f.name} 立下死誓！江湖皆知你与该派不共戴天。`),
      ]);
      return;
    }

    // ======================== P3-1 火线 ========================
    if (verb === '火线' || verb === '局势') {
      const lines = [L('room', '【江湖局势】四条火线同时推进')];
      for (const [eid, evt] of [['e_zhengdao','正道分裂'],['e_mingjiao','魔教复兴'],['e_qinglong','青龙会'],['e_tangmen_wudu','唐门五毒']]) {
        const s = db.prepare('SELECT * FROM event_state WHERE id=?').get(eid);
        const contrib = db.prepare('SELECT SUM(value) as total FROM event_contrib WHERE event_id=?').get(eid);
        const phaseLabel = ['未触发','初现端倪','如火如荼','浮出水面','终局临近'][s?.phase || 0] || '未知';
        const next = !s || s.phase === 0 ? `完成相关任务触发` : s.phase < 4 ? `累积贡献继续推进` : `已到终局`;
        lines.push(L('dim', `· ${evt}　阶段：${phaseLabel}　触发次数：${s?.trigger_count || 0}　全服贡献：${contrib?.total || 0}　→ ${next}`));
      }
      push(ws, lines);
      return;
    }

    // ======================== P2-6 洗恶名 ========================
    if (['洗恶','洗白','wash'].includes(verb)) {
      const cost = 50;
      if (p.silver < cost) { pushOne(ws, 'err', `需要 ${cost} 两打点官府。你只有 ${p.silver.toFixed(1)} 两。`); return; }
      if (p.infamy < 10) { pushOne(ws, 'dim', '你恶名还不够高，官府不收你的钱。'); return; }
      p.silver -= cost;
      p.infamy = Math.max(0, p.infamy - 30);
      db.prepare('DELETE FROM wanted WHERE player_id=?').run(p.id);
      savePlayer(p); sync(ws, p);
      pushOne(ws, 'faction', `你花 ${cost} 两打点官府，恶名 -30。如果有通缉也撤了。`);
      return;
    }

    // ======================== P2-4 跑商 ========================
    if (verb === '跑商' || verb === '商路') {
      const items = ['silk','herb','siyan'];
      pushOne(ws, 'room', `【跑商行情】你在 ${DOMAINS[p.domain_id].name}`);
      pushOne(ws, 'dim', `商路物品当前价（你域内）及五域价差：`);
      for (const key of items) {
        const it = ITEMS[key];
        const localPrice = (it.price * (TRADE_MULT[p.domain_id]?.[key] || 1)).toFixed(1);
        const cheapest = Object.entries(TRADE_MULT)
          .map(([d, m]) => ({ domain: DOMAINS[d]?.name || d, price: it.price * (m[key] || 1) }))
          .sort((a, b) => a.price - b.price)[0];
        pushOne(ws, 'sys', `${it.name}：本地 ${localPrice} 两　最便宜 ${cheapest.domain} ${cheapest.price.toFixed(1)} 两（跨域贩运赚差价）`);
      }
      pushOne(ws, 'dim', '买商品用「买」→ 移动到别域 → 用「卖」卖出，赚差价。路上可能有劫匪（概率低）。');
      return;
    }

    // ======================== 传闻 ========================
    if (verb === '传闻' || verb === 'rumor') {
      const rows = db.prepare('SELECT id,content,created_at FROM rumors ORDER BY id DESC LIMIT 10').all();
      if (!rows.length) { pushOne(ws, 'dim', '茶馆公告板还是空的。'); return; }
      const lines = [L('room', '【茶馆公告板】')];
      for (const r of rows) lines.push(L('rumor', `#${r.id}　据说，${r.content}`));
      push(ws, lines);
      return;
    }

    // ======================== 用物品/吃药 ========================
    if (['用','吃','使用','吃药'].includes(verb)) {
      p.hp = Math.min(p.max_hp, p.hp + 30);
      savePlayer(p);
      pushOne(ws, 'sys', '你吃了点东西，感觉好了些。');
      sync(ws, p);
      return;
    }

    // ======================== 物品/背包 ========================
    if (['物品','inventory','inv'].includes(verb)) {
      pushOne(ws, 'dim', `银两：${p.silver.toFixed(1)} 两　HP：${p.hp}/${p.max_hp}　内力：${p.nei}/${p.max_nei}　恶名：${p.infamy}`);
      const count = db.prepare('SELECT item_key, count FROM inventory WHERE player_id=?').all(p.id);
      if (count.length) {
        const names = count.map(r => `${ITEMS[r.item_key]?.name || r.item_key} ×${r.count}`).join('、');
        pushOne(ws, 'dim', `背包：${names}`);
      }
      const learned = db.prepare('SELECT move_key FROM player_moves WHERE player_id=?').all(p.id);
      if (learned.length) pushOne(ws, 'dim', `已学武功：${learned.map(r => MOVES[r.move_key]?.name || r.move_key).join('、')}`);
      sync(ws, p);
      return;
    }

    pushOne(ws, 'err', `指令「${verb}」打错或没开放。打「帮」看全部。`);
  }

  // —— PvE 战斗（重写，支持势力声望）——
  function combatPvE(ws, p, npc) {
    const learned = db.prepare('SELECT move_key FROM player_moves WHERE player_id=?').all(p.id).map(r => r.move_key);
    const defaultMoves = ['mp01','mp02','mp04'];
    const myMoves = [...learned.filter(k => MOVES[k] && MOVES[k].counter), ...defaultMoves];

    let myHp = p.hp, npcHp = npc.hp || 30;
    const log = [];

    for (let round = 1; round <= 10; round++) {
      const moveKey = choice(myMoves);
      const move = MOVES[moveKey];
      if (!move) continue;
      let dmg = range(move.damage);
      if (move.counter === COUNTER[npc.style]) dmg = Math.round(dmg * 1.3);
      else if (COUNTER[move.counter] === npc.style) dmg = Math.round(dmg * 0.7);
      if (move.nei_cost && p.nei < move.nei_cost) { log.push('（内力不够，换了一招。）'); continue; }
      if (move.nei_cost) p.nei -= move.nei_cost;

      const desc = choice(MOVE_DESC[moveKey] || ['你出手了。']);
      const dmgDesc = dmg >= 12 ? choice(DAMAGE_DESC.fatal) : dmg >= 8 ? choice(DAMAGE_DESC.heavy) : dmg >= 5 ? choice(DAMAGE_DESC.medium) : choice(DAMAGE_DESC.light);
      npcHp -= dmg;
      log.push(`${round}. ${desc}　${dmgDesc}　造成 ${dmg} 点伤害。`);

      if (npcHp <= 0) {
        const fameGain = Math.round((npc.fame || 10) / 5) + 2;
        p.fame += fameGain;
        push(ws, [
          L('combat', ...log.map(l => ({ kind:'dim', text:l }))),
          L('faction', `你赢了 ${npc.name}！名望 +${fameGain}。`),
        ]);
        // 关联势力声望
        if (npc.faction) {
          p.faction_rep[npc.faction] = (p.faction_rep[npc.faction] || 0) - 5;
          pushOne(ws, 'dim', `——但你打了${FACTIONS[npc.faction]?.name || npc.faction}的人，他们对你印象更差了。`);
        }
        // 触发火线：打赢青翼蝠王 → 魔教复兴触发
        if (npc.id === 'n_mingjiao_wei') triggerEvent(p, 'e_mingjiao', 'defeat_wei');
        break;
      }

      const npcDmg = rand(2, Math.max(3, Math.floor((npc.fame || 10) / 10) + 4));
      myHp -= npcDmg;
      log.push(`${round}. ${npc.name}反击，你受到 ${npcDmg} 点伤害。`);

      if (myHp <= 0) {
        const fameLoss = Math.max(1, Math.round(p.fame / 30));
        p.fame = Math.max(0, p.fame - fameLoss);
        log.push(`　→ 你倒下了……昏迷 2 分钟。名望 -${fameLoss}。`);
        push(ws, [L('combat', ...log.map(l => ({ kind:'dim', text:l })))]);
        p.hp = 0;
        setTimeout(() => {
          const pr = playerOf(p.id);
          if (pr) { pr.hp = Math.max(10, Math.floor(pr.max_hp * 0.2)); savePlayer(pr); sync(ws, pr); }
        }, 120000);
        break;
      }
    }

    p.hp = Math.max(0, myHp);
    savePlayer(p);
    sync(ws, p);
  }

  // —— PvP 决斗 ——
  function combatPvP(challenger, target) {
    const wsC = wsOf(challenger.id), wsT = wsOf(target.id);
    const log = [];
    const sendBoth = (kind, text) => { if (wsC) pushOne(wsC, kind, text); if (wsT) pushOne(wsT, kind, text); };

    let hpC = challenger.hp, hpT = target.hp;
    const learnedC = new Set(db.prepare('SELECT move_key FROM player_moves WHERE player_id=?').all(challenger.id).map(r => r.move_key));
    const learnedT = new Set(db.prepare('SELECT move_key FROM player_moves WHERE player_id=?').all(target.id).map(r => r.move_key));
    const base = ['mp01','mp02','mp04'];
    const movesC = [...[...learnedC].filter(k => MOVES[k] && MOVES[k].counter), ...base];
    const movesT = [...[...learnedT].filter(k => MOVES[k] && MOVES[k].counter), ...base];

    for (let round = 1; round <= 15; round++) {
      // 挑战者先手
      const moveC = MOVES[choice(movesC)];
      let dmgC = range(moveC.damage);
      if (COUNTER[moveC.counter] === challenger.combat_style) dmgC = Math.round(dmgC * 0.7);
      if (moveC.nei_cost && challenger.nei < moveC.nei_cost) continue;
      if (moveC.nei_cost) challenger.nei -= moveC.nei_cost;
      hpT -= dmgC;
      if (wsT) pushOne(wsT, 'combat', `${challenger.name} ${choice(MOVE_DESC[moveC.key] || ['出手了'])}　你受到 ${dmgC} 伤害。`);
      if (wsC) pushOne(wsC, 'dim', `你打了 ${target.name} ${dmgC} 伤害。`);
      if (hpT <= 0) { endDuel(challenger, target, 'challenger'); return; }

      // 目标反击
      const moveT = MOVES[choice(movesT)];
      let dmgT = range(moveT.damage);
      if (COUNTER[moveT.counter] === target.combat_style) dmgT = Math.round(dmgT * 0.7);
      if (moveT.nei_cost && target.nei < moveT.nei_cost) continue;
      if (moveT.nei_cost) target.nei -= moveT.nei_cost;
      hpC -= dmgT;
      if (wsC) pushOne(wsC, 'combat', `${target.name}反击，你受到 ${dmgT} 伤害。`);
      if (wsT) pushOne(wsT, 'dim', `你反击了 ${challenger.name} ${dmgT} 伤害。`);
      if (hpC <= 0) { endDuel(challenger, target, 'target'); return; }
    }
    // 15 回合不分胜负 → 比名望高的赢
    endDuel(challenger, target, challenger.fame >= target.fame ? 'challenger' : 'target');
  }

  function endDuel(win, lose, winnerSide) {
    const wsW = wsOf(win.id), wsL = wsOf(lose.id);
    const fameGain = Math.max(5, Math.round(lose.fame / 10) + 2);
    const fameLoss = Math.round(fameGain * 0.7);
    // 胜者涨名望
    win.fame += fameGain;
    win.hp = Math.max(10, win.hp);
    // 败者降名望 + 昏迷
    lose.fame = Math.max(0, lose.fame - fameLoss);
    lose.hp = 10;
    // 胜者加恶名（决斗赢了合法，恶名少）
    win.infamy += Math.max(0, 10 - Math.round(win.fame / 50));

    savePlayer(win); savePlayer(lose);
    sync(wsW, win); sync(wsL, lose);

    if (wsW) pushOne(wsW, 'faction', `🏆 你赢了决斗！名望 +${fameGain}，恶名 +${Math.max(0, 10 - Math.round(win.fame/50))}。`);
    if (wsL) pushOne(wsL, 'dim', `💀 你输了决斗。名望 -${fameLoss}，昏迷在地上。`);
  }

  // —— P3-1 火线触发 ——
  function triggerEvent(p, eventId, reason) {
    const e = db.prepare('SELECT * FROM event_state WHERE id=?').get(eventId);
    if (!e) return;
    // 阶段推进：第一次触发 phase 0→1，之后每 3 次推进一次，最高 4
    let newPhase = e.phase;
    let newCount = e.trigger_count + 1;
    if (newCount === 1) newPhase = 1;
    else if (newCount === 3) newPhase = 2;
    else if (newCount === 6) newPhase = 3;
    else if (newCount >= 10) newPhase = 4;
    db.prepare('UPDATE event_state SET phase=?, trigger_count=?, last_updated=? WHERE id=?').run(newPhase, newCount, now(), eventId);

    // 记录贡献
    db.prepare('INSERT INTO event_contrib (event_id,player_id,faction_id,value,created_at) VALUES (?,?,?,?,?)').run(eventId, p.id, p.faction_id || null, 10, now());

    // 名望奖励 + 传闻
    p.fame += 5;
    savePlayer(p);
    const evNames = { e_zhengdao:'正道分裂', e_mingjiao:'魔教复兴', e_qinglong:'青龙会浮出水面', e_tangmen_wudu:'唐门五毒之战' };
    const labels = ['','初现端倪','如火如荼','浮出水面','终局临近'];
    broadcastAll([L('rumor', `🔥 火线【${evNames[eventId]}】推进到「${labels[newPhase]}」！全服玩家可贡献。`)]);
    const ws = wsOf(p.id);
    if (ws) pushOne(ws, 'faction', `⚡ 你触发了【${evNames[eventId]}】！名望 +5。打「火线」看全服局势。`);
  }

  // —— NPC 知识传递（P3-2：askNpc 升级版）——
  function teachNpcAbout(p, npc, topic) {
    // 玩家主动告诉 NPC 某件事（用 NPC 问的时候附带 teach 关键词？简化：直接 ask 也能传）
    db.prepare('INSERT INTO npc_knowledge (npc_id,player_id,topic_id,value,at) VALUES (?,?,1,?,?)')
      .run(npc.id, p.id, topic, now());
    db.prepare('INSERT INTO npc_memory (npc_id,player_id,summary,created_at) VALUES (?,?,?,?)')
      .run(npc.id, p.id, `玩家告诉了我关于「${topic}」的事。`, now());
  }

  // 扩展 askNpc：NPC 被其他玩家告诉过某话题 → 新玩家问时 30% 概率传错
  function maybeMisquote(npc, askerId, topic) {
    const all = db.prepare('SELECT * FROM npc_knowledge WHERE npc_id=?').all(npc.id);
    if (!all.length) return null;
    // 50% 概率 NPC 知道这个话题
    if (Math.random() > 0.5) return null;
    // 30% 概率传错
    if (Math.random() < 0.3) {
      const wrongs = ['往东边去了', '一个蒙面人', '大概三十来岁', '好像在洛阳', '不清楚，听说跟青龙会有关'];
      return choice(wrongs);
    }
    // 对的
    return choice(['我听过这事，但细节不好说。', '嗯，我知道些，不过这事牵扯多方势力。']);
  }

  // —— 连接/断开 ——
  function connect(ws, playerId) {
    const id = Number(playerId);
    const old = online.get(id);
    if (old && old !== ws) { try { old.close(); } catch(_) {} }

    const p = loadPlayer(id);
    if (!p) { try { ws.close(); } catch(_) {} return; }

    players.set(id, p);
    online.set(id, ws);
    ws.playerId = id;

    push(ws, [
      L('sys', `《大江湖》　—　${p.name}，你在 ${NODES[p.location_id].name}。`),
      ...lookLines(p),
    ]);
    sync(ws, p);

    db.prepare('UPDATE players SET last_seen=? WHERE id=?').run(now(), id);
  }

  function disconnect(ws) {
    const id = ws.playerId;
    if (!id) return;
    online.delete(id);
    const p = players.get(id);
    if (p) savePlayer(p);
    players.delete(id);
  }

  return { connect, disconnect, exec, stateOf };
}

module.exports = { createGame, hashPass, makeSession };


