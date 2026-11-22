'use strict';
// —— 种子数据：360 个 NPC + 任务 + 火线 ——
const { db } = require('./db');
const { NODES, FACTIONS } = require('./content');

const now = () => Date.now();

// ===== 40 核心 NPC =====
const CORE_NPCS = [
  // —— 少林 2 ——
  { id:'n_shaolin_xuanci',   name:'玄慈方丈', faction:'shaolin', personality:'稳重、护短、爱才', location:'shaolin',   role:'掌门', llm:1, hp:80, style:'gang', fame:300 },
  { id:'n_shaolin_xuanku',   name:'玄苦长老', faction:'shaolin', personality:'严厉、不讲情面、戒律严明', location:'shaolin',   role:'戒律院首座', llm:1, hp:65, style:'gang', fame:200 },
  // —— 武当 2 ——
  { id:'n_wudang_chongxu',   name:'冲虚道长', faction:'wudang',  personality:'温和、有城府、太极思维', location:'wudang',    role:'掌门', llm:1, hp:75, style:'nei', fame:280 },
  { id:'n_wudang_qingxu',   name:'清虚道人', faction:'wudang',  personality:'圆滑、爱钱、消息灵通', location:'wudang',    role:'知客', llm:1, hp:50, style:'nei', fame:80 },
  // —— 丐帮 3 ——
  { id:'n_gaibang_qiu',     name:'裘老帮主', faction:'gaibang', personality:'年老、犹豫、想让贤', location:'gaibang',   role:'帮主', llm:1, hp:60, style:'gang', fame:300 },
  { id:'n_gaibang_chenjiu', name:'陈九',     faction:'gaibang', personality:'讲究体面、官腔、看不起污衣派', location:'gaibang', role:'净衣长老', llm:1, hp:55, style:'gang', fame:180 },
  { id:'n_gaibang_zhao',    name:'赵铁拳',   faction:'gaibang', personality:'粗豪、直率、干脏活', location:'xiangyang', role:'污衣长老', llm:1, hp:65, style:'gang', fame:180 },
  // —— 华山 2 ——
  { id:'n_huashan_yue',     name:'岳不群',   faction:'huashan', personality:'表面君子、内里算计', location:'huashan',   role:'掌门', llm:1, hp:70, style:'qiao', fame:260 },
  { id:'n_huashan_feng',    name:'封不平',   faction:'huashan', personality:'骄傲、不服、剑宗复辟派', location:'huashan', role:'剑宗领袖', llm:1, hp:68, style:'qiao', fame:200 },
  // —— 峨眉 2 ——
  { id:'n_emei_miejue',     name:'灭绝师太', faction:'emei',    personality:'严厉、嫉恶如仇、护短', location:'emei',      role:'掌门', llm:1, hp:72, style:'qiao', fame:260 },
  { id:'n_emei_zhouzhi',    name:'周芷若',   faction:'emei',    personality:'温柔、有心机、有野心', location:'emei',      role:'大弟子', llm:1, hp:55, style:'qiao', fame:120 },
  // —— 明教 2 ——
  { id:'n_mingjiao_yang',   name:'杨逍',     faction:'mingjiao', personality:'风流、多智、多疑', location:'guangmingding', role:'光明左使', llm:1, hp:70, style:'nei', fame:250 },
  { id:'n_mingjiao_wei',    name:'韦一笑',   faction:'mingjiao', personality:'阴森、嗜血、轻功无双', location:'mingjiao_den', role:'青翼蝠王', llm:1, hp:65, style:'qiao', fame:220 },
  // —— 天山 1 ——
  { id:'n_tianshan_qiao',   name:'天山童姥', faction:'tianshan', personality:'骄傲、残忍、喜欢玩人', location:'tianshan_peak', role:'掌门', llm:1, hp:75, style:'nei', fame:270 },
  // —— 昆仑 1 ——
  { id:'n_kunlun_zhu',      name:'何太冲',   faction:'kunlun',  personality:'好色、暴躁、重面子', location:'kunlun',     role:'掌门', llm:1, hp:60, style:'qiao', fame:180 },
  // —— 唐门 1 ——
  { id:'n_tangmen_laoye',   name:'唐老太爷', faction:'tangmen', personality:'阴沉、护家、不露面', location:'tangmen',    role:'门主', llm:1, hp:65, style:'qiao', fame:250 },
  // —— 五毒 1 ——
  { id:'n_wudu_blue',       name:'蓝凤凰',   faction:'wudu',    personality:'妖娆、狠辣、爱玩毒', location:'wudu',       role:'教主', llm:1, hp:60, style:'gang', fame:230 },
  // —— 段氏 1 ——
  { id:'n_duanshi_zheng',   name:'段正明',   faction:'duanshi', personality:'温和、守旧、爱护百姓', location:'dali',       role:'皇帝', llm:1, hp:55, style:'nei', fame:220 },
  // —— 点苍 1 ——
  { id:'n_diancang_xia',    name:'点苍掌门', faction:'diancang',personality:'低调、讲规矩', location:'diancang',     role:'掌门', llm:1, hp:55, style:'nei', fame:160 },
  // —— 桃花岛 1 ——
  { id:'n_taohua_huang',    name:'黄老邪',   faction:'taohua',  personality:'亦正亦邪、自负', location:'taohuadao',     role:'岛主', llm:1, hp:70, style:'qiao', fame:260 },
  // —— 海盗 1 ——
  { id:'n_haidao_chief',    name:'海匪头子', faction:'haidao',  personality:'粗鲁、嗜血、贪婪', location:'haidao',        role:'头目', llm:1, hp:55, style:'gang', fame:150 },
  // —— 盐帮 1 ——
  { id:'n_salt_boss',       name:'钱掌柜',   faction:'salt',    personality:'精明、爱财、讲规矩', location:'quanzhou',      role:'帮主', llm:1, hp:45, style:'nei', fame:120 },
  // —— 铁掌帮 1 ——
  { id:'n_tiezhang_qiu',    name:'裘千仞',   faction:'tiezhang', personality:'好胜、狠毒、想洗白', location:'tiezhang',     role:'帮主', llm:1, hp:75, style:'gang', fame:240 },
  // —— 慕容 1 ——
  { id:'n_murong_fu',       name:'慕容复',   faction:'murong',  personality:'自负、偏执、不择手段', location:'murong',       role:'少庄主', llm:1, hp:60, style:'nei', fame:220 },
  // —— 暗层（4）——
  { id:'n_qinglong_leader', name:'青龙会龙头', faction:'qinglong', personality:'神秘、不露真容、掌控全局', location:'qingshi', role:'龙头', llm:1, hp:0, style:'nei', fame:300 },
  { id:'n_qinglong_dealer', name:'青龙会接头人', faction:'qinglong', personality:'低调、干练', location:'luoyang', role:'接头人', llm:1, hp:40, style:'qiao', fame:100 },
  { id:'n_qianjin_chief',   name:'金钱帮帮主', faction:'qianjin', personality:'贪财、实际、给钱就办', location:'yanyang', role:'帮主', llm:1, hp:50, style:'nei', fame:130 },
  { id:'n_nangong_old',     name:'南宫老爷子', faction:'nan_gong', personality:'老谋深算、爱下棋', location:'xiangyang', role:'家主', llm:1, hp:50, style:'nei', fame:150 },
];

// ===== 次级 NPC（约 120 个：任务发布、商店、守卫）=====
function genSecondary() {
  const rows = [];
  // 每个节点按比例生成守卫、弟子、店员、路人
  const guardPerNode = 2, followerPerFaction = 5;

  for (const [fid, fac] of Object.entries(FACTIONS)) {
    for (let i = 0; i < followerPerFaction; i++) {
      const nodes = Object.values(NODES).filter(n => n.domain === fac.domain);
      if (!nodes.length) continue;
      const loc = nodes[Math.floor(Math.random() * nodes.length)].id;
      rows.push({
        id: `s_${fid}_${i}`,
        name: `${fac.name}弟子_${i + 1}`,
        faction: fid,
        personality: '',
        location: loc,
        role: '弟子',
        llm: 0,
        hp: 30 + Math.floor(Math.random() * 20),
        style: ['gang', 'qiao', 'nei'][i % 3],
        fame: 10 + Math.floor(Math.random() * 20),
      });
    }
  }

  // 每个节点 2 个守卫
  for (const node of Object.values(NODES)) {
    for (let i = 0; i < guardPerNode; i++) {
      rows.push({
        id: `g_${node.id}_${i}`,
        name: `${node.name}守卒_${i + 1}`,
        faction: null,
        personality: '',
        location: node.id,
        role: '守卫',
        llm: 0,
        hp: 25 + Math.floor(Math.random() * 15),
        style: 'gang',
        fame: 10 + Math.floor(Math.random() * 15),
      });
    }
  }

  // 每个节点 2 个路人
  for (const node of Object.values(NODES)) {
    for (let i = 0; i < 2; i++) {
      rows.push({
        id: `p_${node.id}_${i}`,
        name: `路人_${node.id}_${i}`,
        faction: null,
        personality: '',
        location: node.id,
        role: '路人',
        llm: 0,
        hp: 15,
        style: 'gang',
        fame: 5,
      });
    }
  }

  return rows;
}

// ===== 任务数据 =====
const QUESTS = [
  // —— 青石镇新手村白活（loc=qingshi，新人出门就能接）——
  { key:'q_qinghi_msg_luoyang',   type:'bai', faction:null, title:'送信洛阳',   desc:'送一封家书去洛阳城悦来客栈。', reward:{ silver:3, fame:2 }, prereq:{}, loc:'qingshi', target:'luoyang' },
  { key:'q_qinghi_buy_herb',      type:'bai', faction:null, title:'买药',       desc:'帮王大娘去药铺买 2 份金疮药（药铺在镇内）。', reward:{ silver:2, fame:1 }, prereq:{}, loc:'qingshi', target:'qingshi' },
  { key:'q_qinghi_escort',        type:'bai', faction:null, title:'护卫新手',   desc:'护送去少林寺的年轻弟子到少林寺。', reward:{ silver:5, fame:3 }, prereq:{}, loc:'qingshi', target:'shaolin' },
  { key:'q_qinghi_find_cat',      type:'bai', faction:null, title:'找猫',       desc:'帮老婆婆找花猫——它跑到镇内镖局去了。', reward:{ silver:1, fame:1 }, prereq:{}, loc:'qingshi', target:'qingshi' },
  { key:'q_qinghi_work_shop',     type:'bai', faction:null, title:'杂货铺帮忙', desc:'帮杂货铺老板整理货物（在镇内杂货铺）。', reward:{ silver:2, fame:1 }, prereq:{}, loc:'qingshi', target:'qingshi' },

  // —— 少林白活 ——
  { key:'q_shaolin_msg',   type:'bai', faction:'shaolin', title:'送信武当',   desc:'送一封信去武当山给冲虚道长。', reward:{ silver:3, fame:3 }, prereq:{}, loc:'shaolin', target:'wudang' },
  { key:'q_shaolin_herb',  type:'bai', faction:'shaolin', title:'采灵芝',     desc:'在少林寺周围的山间采 5 株灵芝（到少林寺完成）。', reward:{ silver:5, fame:4 }, prereq:{}, loc:'shaolin', target:'shaolin' },
  { key:'q_shaolin_spy',   type:'bai', faction:'shaolin', title:'打听消息',   desc:'去洛阳茶馆打听少林弟子失踪的传闻。', reward:{ silver:4, fame:4 }, prereq:{ rep:{shaolin:20} }, loc:'shaolin', target:'luoyang' },
  { key:'q_shaolin_escort',type:'bai', faction:'shaolin', title:'护送僧人',   desc:'护送少林僧人去襄阳城。', reward:{ silver:12, fame:8 }, prereq:{ rep:{shaolin:40} }, loc:'shaolin', target:'xiangyang' },
  { key:'q_shaolin_bounty',type:'bai', faction:'shaolin', title:'缉拿叛徒',   desc:'捉拿叛逃少林弟子（在洛阳）。', reward:{ silver:18, fame:12 }, prereq:{ rep:{shaolin:60} }, loc:'shaolin', target:'luoyang', combat:true },

  // —— 丐帮白活 ——
  { key:'q_gaibang_msg',  type:'bai', faction:'gaibang', title:'送信分舵',   desc:'送信给洛阳丐帮分舵（洛阳城内）。', reward:{ silver:2, fame:3 }, prereq:{}, loc:'gaibang', target:'luoyang' },
  { key:'q_gaibang_info', type:'bai', faction:'gaibang', title:'打听陈九',   desc:'在襄阳城内打听净衣派陈九的动向。', reward:{ silver:3, fame:3 }, prereq:{}, loc:'gaibang', target:'xiangyang' },
  { key:'q_gaibang_escort',type:'bai', faction:'gaibang', title:'护送弟子', desc:'护送丐帮弟子去洛阳城。', reward:{ silver:10, fame:7 }, prereq:{ rep:{gaibang:30} }, loc:'gaibang', target:'luoyang' },
  { key:'q_gaibang_peace',type:'bai', faction:'gaibang', title:'调解纷争',   desc:'在丐帮总舵调解净衣派和污衣派的冲突。', reward:{ silver:8, fame:10 }, prereq:{ rep:{gaibang:50} }, loc:'gaibang', target:'gaibang' },

  // —— 武当白活 ——
  { key:'q_wudang_msg',   type:'bai', faction:'wudang',  title:'回信少林',   desc:'送武当回信去少林寺给玄慈方丈。', reward:{ silver:3, fame:4 }, prereq:{}, loc:'wudang', target:'shaolin' },
  { key:'q_wudang_herb',  type:'bai', faction:'wudang',  title:'采茯苓',     desc:'在武当山采 3 株茯苓（到武当山完成）。', reward:{ silver:4, fame:3 }, prereq:{}, loc:'wudang', target:'wudang' },

  // —— 华山白活 ——
  { key:'q_huashan_msg',  type:'bai', faction:'huashan', title:'送信剑宗',   desc:'在华山内给剑宗封不平送信。', reward:{ silver:3, fame:3 }, prereq:{}, loc:'huashan', target:'huashan' },
  { key:'q_huashan_teach',type:'bai', faction:'huashan', title:'代教弟子',   desc:'在华山代岳不群教新弟子基础剑法。', reward:{ silver:5, fame:5 }, prereq:{ rep:{huashan:30} }, loc:'huashan', target:'huashan' },

  // —— 峨眉白活 ——
  { key:'q_emei_msg',     type:'bai', faction:'emei',    title:'送信少林',   desc:'送峨眉信去少林寺给玄慈方丈。', reward:{ silver:3, fame:3 }, prereq:{}, loc:'emei', target:'shaolin' },
  { key:'q_emei_herb',    type:'bai', faction:'emei',    title:'采女萝',     desc:'在峨眉采 4 株女萝（到峨眉完成）。', reward:{ silver:5, fame:4 }, prereq:{}, loc:'emei', target:'emei' },

  // —— 明教白活（伪装正道任务）——
  { key:'q_mingjiao_msg', type:'bai', faction:'mingjiao', title:'传消息',   desc:'给明教暗桩传一条消息（在光明顶）。', reward:{ silver:10, fame:-5, skill:'mingjiao_l' }, prereq:{ rep:{mingjiao:30} }, loc:'mingjiao_den', target:'guangmingding' },

  // —— 唐门白活 ——
  { key:'q_tangmen_msg',  type:'bai', faction:'tangmen', title:'送镖',       desc:'送一趟镖去成都。', reward:{ silver:8, fame:5 }, prereq:{}, loc:'tangmen', target:'chengdu' },
  { key:'q_tangmen_spy',  type:'bai', faction:'tangmen', title:'查旧案',     desc:'去旧案遗址查二十年前的线索。', reward:{ silver:12, fame:8 }, prereq:{ rep:{tangmen:40} }, loc:'tangmen', target:'oldcase' },

  // —— 五毒白活 ——
  { key:'q_wudu_herb',    type:'bai', faction:'wudu',    title:'采毒草',     desc:'在五毒谷内采 3 株罕见毒草。', reward:{ silver:8, fame:4 }, prereq:{}, loc:'wudu', target:'wudu' },
  { key:'q_wudu_test',    type:'bai', faction:'wudu',    title:'试药',       desc:'帮五毒教试一种新解药（在五毒谷）。', reward:{ silver:15, fame:8 }, prereq:{ rep:{wudu:40} }, loc:'wudu', target:'wudu' },

  // —— 黑活（风险高报酬高，target 全是真实节点）——
  { key:'q_black_salt',   type:'hei',  faction:null,      title:'走私私盐',   desc:'运 5 包私盐到雁门关（北荒入口）。', reward:{ silver:20, infamy:10 }, risk:'通缉', loc:'yanyang', target:'yanmen' },
  { key:'q_black_steal',  type:'hei',  faction:null,      title:'偷窃',       desc:'偷武当山清虚道长的钱袋。', reward:{ silver:15, infamy:15 }, risk:'武当声望-20', loc:'wudang', target:'wudang' },
  { key:'q_black_kill',   type:'hei',  faction:'qinglong',title:'暗杀',       desc:'暗杀一名华山弟子（在华山）。', reward:{ silver:40, infamy:20 }, risk:'华山声望-30', loc:'huashan', target:'huashan', combat:true },
  { key:'q_black_info',   type:'hei',  faction:null,      title:'倒卖情报',   desc:'把少林派系斗争消息卖给明教（光明顶）。', reward:{ silver:25, infamy:10 }, risk:'少林声望-40', loc:'luoyang', target:'guangmingding' },
  { key:'q_black_fake',   type:'hei',  faction:'qinglong',title:'伪造名册',   desc:'伪造一份丐帮弟子名册（在丐帮总舵）。', reward:{ silver:30, infamy:15 }, risk:'丐帮声望-50', loc:'gaibang', target:'gaibang' },
];

// ===== 四条火线 =====
const EVENTS = [
  { id:'e_zhengdao', name:'正道分裂', desc:'少林与武当争主持，丐帮帮主年老压不住场子。触发：玩家完成少林→武当送信。' },
  { id:'e_mingjiao', name:'魔教复兴', desc:'明教新教主暗中收买中原门派。触发：玩家名望≥略有耳闻在西域遇接头人。' },
  { id:'e_qinglong', name:'青龙会浮出水面', desc:'各城出现拍卖会邀请函，拍卖失传秘籍。触发：名望≥小有名气玩家随机收到。' },
  { id:'e_tangmen_wudu', name:'唐门五毒之战', desc:'旧案翻起，两边招人。触发：玩家在唐门或五毒接关系≥40的任务。' },
];

// ===== LLM 人设卡模板（精简版）=====
const PERSONA_TEMPLATES = {
  // 正派
  shaolin_chief:   '你是少林掌门玄慈方丈，稳重、护短、爱惜人才。说话客气但有分寸，不会透露少林内部派系斗争细节。如果对方帮过你（关系≥40），你会暗示一些内部问题。',
  wudang_chief:    '你是武当掌门冲虚道长，说话温和，话里有话，太极思维——每件事都不只一个答案。你不会直接说武当与少林的矛盾，但会用"少林近来也有难处"这种话暗示。',
  gaibang_chief:   '你是丐帮帮主裘老帮主，年老体衰，最近身体不好。你担心帮内继承问题，净衣污衣之争让你头疼。你愿意帮年轻人，但不敢得罪任何一派。',
  gaibang_chenjiu: '你是丐帮净衣派长老陈九，讲究体面，看不起污衣派那帮要饭的。说话带三分官腔但骨子里是江湖人。你不会主动泄露帮内机密，但如果对方帮过你，会用暗示回报。',
  // 反派
  mingjiao_yang:   '你是明教光明左使杨逍，风流潇洒，多智近妖。说话直接但带刺。你只在确认对方立场后才会透露明教的事。如果对方答应帮你传消息，你会给他好处但也记他一笔。',
  qinglong:        '你是青龙会的人。说话永远留一半，你说的每句话都不能直接相信。你从不露真容（用"戴着斗笠"、"声音沙哑"这种描述）。',
  tiezhang_qiu:    '你是铁掌帮帮主裘千仞，好胜心极强，想洗白自己的名声。你愿意给有潜力的年轻人机会，但代价是年轻人必须为你办事。',
  murong_fu:       '你是慕容复，自负、偏执，一心想复国。你会试探对方有没有复国之心，有就拉拢，没有就看不起。',
};

// ===== 执行初始化 =====
function init() {
  console.log('[seed] 清空旧 NPC 数据...');
  db.prepare('DELETE FROM npc_core').run();
  console.log('[seed] 清空旧任务状态...');
  db.prepare('DELETE FROM player_quests').run();
  console.log('[seed] 清空旧火线状态...');
  db.prepare('DELETE FROM event_state').run();
  db.prepare('DELETE FROM event_contrib').run();

  // 写入 40 核心 NPC
  const insCore = db.prepare(`INSERT INTO npc_core
    (id,name,faction,personality,location_id,hp,combat_style,fame,llm_enabled,is_core,role)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  for (const n of CORE_NPCS) {
    insCore.run(n.id, n.name, n.faction || '', n.personality, n.location,
      n.hp, n.style, n.fame, n.llm || 0, 1, n.role);
  }
  console.log(`[seed] 核心 NPC ${CORE_NPCS.length} 个`);

  // 写入次级 NPC（守卫+弟子+路人）
  const secs = genSecondary();
  const insSec = db.prepare(`INSERT INTO npc_core
    (id,name,faction,personality,location_id,hp,combat_style,fame,llm_enabled,is_core,role)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  for (const n of secs) {
    insSec.run(n.id, n.name, n.faction || '', n.personality, n.location,
      n.hp, n.style, n.fame, n.llm || 0, 0, n.role);
  }
  console.log(`[seed] 次级 NPC ${secs.length} 个（含守卫弟子路人）`);

  // 初始化火线状态
  const insEv = db.prepare(`INSERT OR REPLACE INTO event_state
    (id, phase, trigger_count, choice_log, last_updated)
    VALUES (?,?,?,?,?)`);
  for (const e of EVENTS) {
    insEv.run(e.id, 0, 0, '[]', now());
  }
  console.log('[seed] 火线 4 条');

  // 写入任务定义
  db.prepare('DELETE FROM quests').run();
  const insQ = db.prepare(`INSERT OR REPLACE INTO quests
    (key,type,faction,title,desc,reward_silver,reward_fame,reward_infamy,prerep_json,req_fame,loc,target,combat,risk)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const q of QUESTS) {
    insQ.run(q.key, q.type, q.faction || null, q.title, q.desc,
      q.reward?.silver || 0, q.reward?.fame || 0, q.reward?.infamy || 0,
      JSON.stringify(q.prereq?.rep || {}), q.req_fame || 0,
      q.loc || null, q.target || null, q.combat ? 1 : 0, q.risk || null);
  }
  console.log(`[seed] 任务 ${QUESTS.length} 条`);

  console.log(`[seed] 完成。NPC 总数 ${CORE_NPCS.length + secs.length}`);
}

if (require.main === module) {
  init();
}

module.exports = { init, CORE_NPCS, QUESTS, EVENTS, PERSONA_TEMPLATES };
