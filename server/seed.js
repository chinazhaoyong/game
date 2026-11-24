'use strict';
// —— 种子数据：NPC/任务/火线定义（核心数据落库统一走 rpg_seed.seedRpgData）——
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

  // ================================================================
  // —— 20门派专属入门剧情任务（玩家入派前/后自动触发）——
  // ================================================================

  // —— 少林入门：扫落叶 → 拜伽蓝 ——
  { key:'q_shaolin_join', type:'bai', faction:'shaolin', title:'少林入门·扫落叶', desc:'[少林入门剧情] 你到嵩山少林寺，知客僧说："少林不收无名之辈，先扫三日落叶。" 完成后去见方丈拜伽蓝。', reward:{ silver:0, fame:5 }, prereq:{}, loc:'shaolin', target:'shaolin', script:'shaolin_join' },
  // —— 少林晋级考核 ——
  { key:'q_shaolin_rank1', type:'bai', faction:'shaolin', title:'少林·闯罗汉堂', desc:'[杂役→见习] 方丈让你闯罗汉堂，接3招不倒即可正式入门。', reward:{ silver:5, fame:10 }, prereq:{}, loc:'shaolin', target:'shaolin', script:'shaolin_rank1' },
  { key:'q_shaolin_rank2', type:'bai', faction:'shaolin', title:'少林·送经卷', desc:'[见习→外门] 送少林经卷到山下洛阳白马寺，来回路上不能丢。', reward:{ silver:10, fame:15 }, prereq:{}, loc:'shaolin', target:'luoyang', script:'shaolin_rank2' },
  { key:'q_shaolin_rank3', type:'bai', faction:'shaolin', title:'少林·72绝技初窥', desc:'[外门→内门] 在藏经阁抄录一段72绝技口诀，交给监寺。', reward:{ silver:15, fame:20 }, prereq:{}, loc:'shaolin', target:'shaolin', script:'shaolin_rank3' },
  { key:'q_chk_shaolin', type:'heroic', faction:'shaolin', title:'少林·闯十八铜人阵', desc:'[核心弟子考验] 方丈让你闯十八铜人阵，阵成则传独门绝技。传说只有3人闯过。', reward:{ silver:100, fame:50, skill:'shaolin_s5_l1' }, prereq:{ rep:{shaolin:1500}, contrib:{shaolin:1000} }, loc:'shaolin', target:'shaolin', script:'shaolin_core' },
  { key:'q_secret_shaolin', type:'heroic', faction:'shaolin', title:'少林·救方丈', desc:'[亲传弟子剧情] 魔教围攻少林，你救出被困的玄慈方丈。方丈说："你是我关门弟子，传你《易筋经》真本。"', reward:{ silver:200, fame:100, skill:'shaolin_s6_l1' }, prereq:{ rep:{shaolin:4000}, contrib:{shaolin:3000} }, loc:'shaolin', target:'shaolin', script:'shaolin_priv' },
  { key:'q_chief_shaolin', type:'heroic', faction:'shaolin', title:'少林·掌门继任', desc:'[首席弟子剧情] 当前首席叛门，方丈亲自选你为下一任掌门接班人。', reward:{ silver:500, fame:300, skill:'shaolin_s7_l1' }, prereq:{}, loc:'shaolin', target:'shaolin', script:'shaolin_chief' },

  // —— 武当入门：听道经 → 紫霄宫 ——
  { key:'q_wudang_join', type:'bai', faction:'wudang', title:'武当入门·听道经', desc:'[武当入门剧情] 你到武当山紫霄宫，宋远桥说："武当不收急功近利之人，先听三日道经。"', reward:{ silver:0, fame:5 }, prereq:{}, loc:'wudang', target:'wudang', script:'wudang_join' },
  { key:'q_wudang_rank1', type:'bai', faction:'wudang', title:'武当·过七剑阵', desc:'[杂役→见习] 接武当七名弟子摆的剑阵，接10招不倒即可正式入门。', reward:{ silver:5, fame:10 }, prereq:{}, loc:'wudang', target:'wudang', script:'wudang_rank1' },
  { key:'q_wudang_rank2', type:'bai', faction:'wudang', title:'武当·送药', desc:'[见习→外门] 送武当丹药到山下襄阳医馆，不能坏。', reward:{ silver:10, fame:15 }, prereq:{}, loc:'wudang', target:'xiangyang', script:'wudang_rank2' },
  { key:'q_wudang_rank3', type:'bai', faction:'wudang', title:'武当·太极奥义初探', desc:'[外门→内门] 在武当后山练太极云手，达到"触而不发"的境界。', reward:{ silver:15, fame:20 }, prereq:{}, loc:'wudang', target:'wudang', script:'wudang_rank3' },
  { key:'q_chk_wudang', type:'heroic', faction:'wudang', title:'武当·接掌门十招', desc:'[核心弟子考验] 冲虚道长用太极剑打你10招，不倒则过。', reward:{ silver:100, fame:50, skill:'wudang_s5_l1' }, prereq:{ rep:{wudang:1500}, contrib:{wudang:1000} }, loc:'wudang', target:'wudang', script:'wudang_core' },
  { key:'q_secret_wudang', type:'heroic', faction:'wudang', title:'武当·太极奥义领悟', desc:'[亲传弟子剧情] 你独自在武当后山领悟太极最深处的"绕指柔真意"，冲虚道长说："你是我独传。"', reward:{ silver:200, fame:100, skill:'wudang_s6_l1' }, prereq:{ rep:{wudang:4000}, contrib:{wudang:3000} }, loc:'wudang', target:'wudang', script:'wudang_priv' },
  { key:'q_chief_wudang', type:'heroic', faction:'wudang', title:'武当·掌门继任', desc:'[首席弟子剧情] 冲虚道长退位，选你为下一代掌门。', reward:{ silver:500, fame:300, skill:'wudang_s7_l1' }, prereq:{}, loc:'wudang', target:'wudang', script:'wudang_chief' },

  // —— 丐帮入门：要饭3次 → 帮主义子 ——
  { key:'q_gaibang_join', type:'bai', faction:'gaibang', title:'丐帮入门·要饭', desc:'[丐帮入门剧情] 你到君山丐帮总舵，长老说："丐帮入门需立投名状，去要饭3次，每次要到10两以上。"', reward:{ silver:0, fame:5 }, prereq:{}, loc:'gaibang', target:'gaibang', script:'gaibang_join' },
  { key:'q_gaibang_rank1', type:'bai', faction:'gaibang', title:'丐帮·棍法考核', desc:'[杂役→见习] 接丐帮执法长老丐帮棍5招，不倒即可正式入门。', reward:{ silver:5, fame:10 }, prereq:{}, loc:'gaibang', target:'gaibang', script:'gaibang_rank1' },
  { key:'q_gaibang_rank2', type:'bai', faction:'gaibang', title:'丐帮·送密信', desc:'[见习→外门] 送丐帮密信到洛阳分舵，必须亲手交到分舵主手中。', reward:{ silver:10, fame:15 }, prereq:{}, loc:'gaibang', target:'luoyang', script:'gaibang_rank2' },
  { key:'q_gaibang_rank3', type:'bai', faction:'gaibang', title:'丐帮·选边站队', desc:'[外门→内门] 净衣派和污衣派争执，你必须选一边站队并帮忙调解。', reward:{ silver:15, fame:20 }, prereq:{}, loc:'gaibang', target:'gaibang', script:'gaibang_rank3' },
  { key:'q_chk_gaibang', type:'heroic', faction:'gaibang', title:'丐帮·接帮主三掌', desc:'[核心弟子考验] 帮主用降龙掌打你3掌，不倒则传降龙十八掌。', reward:{ silver:100, fame:50, skill:'gaibang_s5_l1' }, prereq:{ rep:{gaibang:1500}, contrib:{gaibang:1000} }, loc:'gaibang', target:'gaibang', script:'gaibang_core' },
  { key:'q_secret_gaibang', type:'heroic', faction:'gaibang', title:'丐帮·帮主临终传功', desc:'[亲传弟子剧情] 老帮主临死前把降龙十八掌最后三掌传给你，立你为义子。', reward:{ silver:200, fame:100, skill:'gaibang_s6_l1' }, prereq:{ rep:{gaibang:4000}, contrib:{gaibang:3000} }, loc:'gaibang', target:'gaibang', script:'gaibang_priv' },
  { key:'q_chief_gaibang', type:'heroic', faction:'gaibang', title:'丐帮·帮主继任', desc:'[首席弟子剧情] 当前帮主退位，选你为新帮主。', reward:{ silver:500, fame:300, skill:'gaibang_s7_l1' }, prereq:{}, loc:'gaibang', target:'gaibang', script:'gaibang_chief' },

  // —— 华山入门：接剑三招 → 剑宗气宗抉择 ——
  { key:'q_huashan_join', type:'bai', faction:'huashan', title:'华山入门·接剑', desc:'[华山入门剧情] 你到华山，剑宗封不平说："华山入门需剑法考核，接我三招不倒。"', reward:{ silver:0, fame:5 }, prereq:{}, loc:'huashan', target:'huashan', script:'huashan_join' },
  { key:'q_huashan_rank1', type:'bai', faction:'huashan', title:'华山·剑法考核', desc:'[杂役→见习] 接岳不群基础剑法五招，不倒即可正式入门。', reward:{ silver:5, fame:10 }, prereq:{}, loc:'huashan', target:'huashan', script:'huashan_rank1' },
  { key:'q_huashan_rank2', type:'bai', faction:'huashan', title:'华山·送剑谱', desc:'[见习→外门] 送华山剑谱到山下开封府，不能坏。', reward:{ silver:10, fame:15 }, prereq:{}, loc:'huashan', target:'kaifeng', script:'huashan_rank2' },
  { key:'q_huashan_rank3', type:'bai', faction:'huashan', title:'华山·剑气之争', desc:'[外门→内门] 剑宗气宗大吵，你必须站队并解决纷争（选剑宗得独孤九剑，选气宗得紫霞神功加成）。', reward:{ silver:15, fame:20 }, prereq:{}, loc:'huashan', target:'huashan', script:'huashan_rank3' },
  { key:'q_chk_huashan', type:'heroic', faction:'huashan', title:'华山·破剑阵', desc:'[核心弟子考验] 破华山三剑阵，剑宗气宗联合摆阵。', reward:{ silver:100, fame:50, skill:'huashan_s5_l1' }, prereq:{ rep:{huashan:1500}, contrib:{huashan:1000} }, loc:'huashan', target:'huashan', script:'huashan_core' },
  { key:'q_secret_huashan', type:'heroic', faction:'huashan', title:'华山·风清扬真传', desc:'[亲传弟子剧情] 风清扬看中你资质，悄悄传你独孤九剑真谱。', reward:{ silver:200, fame:100, skill:'huashan_s6_l1' }, prereq:{ rep:{huashan:4000}, contrib:{huashan:3000} }, loc:'huashan', target:'huashan', script:'huashan_priv' },
  { key:'q_chief_huashan', type:'heroic', faction:'huashan', title:'华山·掌门继任', desc:'[首席弟子剧情] 岳不群（或风清扬）退位，选你为下一代掌门。', reward:{ silver:500, fame:300, skill:'huashan_s7_l1' }, prereq:{}, loc:'huashan', target:'huashan', script:'huashan_chief' },

  // —— 峨眉入门：接掌七招 → 灭绝遗言 ——
  { key:'q_emei_join', type:'bai', faction:'emei', title:'峨眉入门·接掌', desc:'[峨眉入门剧情] 你到峨眉山，灭绝师太说："峨眉入门需掌法考核，接我七招不倒。"', reward:{ silver:0, fame:5 }, prereq:{}, loc:'emei', target:'emei', script:'emei_join' },
  { key:'q_emei_rank1', type:'bai', faction:'emei', title:'峨眉·刺术考核', desc:'[杂役→见习] 接丁敏君峨眉刺五招，不倒即可正式入门。', reward:{ silver:5, fame:10 }, prereq:{}, loc:'emei', target:'emei', script:'emei_rank1' },
  { key:'q_emei_rank2', type:'bai', faction:'emei', title:'峨眉·送丹药', desc:'[见习→外门] 送峨眉丹药到山下成都医馆。', reward:{ silver:10, fame:15 }, prereq:{}, loc:'emei', target:'chengdu', script:'emei_rank2' },
  { key:'q_emei_rank3', type:'bai', faction:'emei', title:'峨眉·周芷若复仇', desc:'[外门→内门] 周芷若找你帮忙复仇张无忌，你选边站队。', reward:{ silver:15, fame:20 }, prereq:{}, loc:'emei', target:'emei', script:'emei_rank3' },
  { key:'q_chk_emei', type:'heroic', faction:'emei', title:'峨眉·接灭绝七招', desc:'[核心弟子考验] 灭绝师太用金顶绵掌打你7招，不倒则传九阴白骨爪。', reward:{ silver:100, fame:50, skill:'emei_s5_l1' }, prereq:{ rep:{emei:1500}, contrib:{emei:1000} }, loc:'emei', target:'emei', script:'emei_core' },
  { key:'q_secret_emei', type:'heroic', faction:'emei', title:'峨眉·灭绝托孤', desc:'[亲传弟子剧情] 灭绝临终前把倚天剑托孤给你，说："你是峨眉正统。"', reward:{ silver:200, fame:100, skill:'emei_s6_l1' }, prereq:{ rep:{emei:4000}, contrib:{emei:3000} }, loc:'emei', target:'emei', script:'emei_priv' },
  { key:'q_chief_emei', type:'heroic', faction:'emei', title:'峨眉·掌门继任', desc:'[首席弟子剧情] 灭绝（或周芷若）退位，选你为峨眉掌门。', reward:{ silver:500, fame:300, skill:'emei_s7_l1' }, prereq:{}, loc:'emei', target:'emei', script:'emei_chief' },

  // —— 昆仑入门：接剑五招 → 不可犯色戒 ——
  { key:'q_kunlun_join', type:'bai', faction:'kunlun', title:'昆仑入门·接剑', desc:'[昆仑入门剧情] 你到昆仑山，何太冲说："昆仑入门需两仪剑考核，接我五招不倒，且不可犯色戒。"', reward:{ silver:0, fame:5 }, prereq:{}, loc:'kunlun', target:'kunlun', script:'kunlun_join' },
  { key:'q_kunlun_rank1', type:'bai', faction:'kunlun', title:'昆仑·剑招考核', desc:'[杂役→见习] 接昆仑首席弟子两仪剑五招，不倒即可正式入门。', reward:{ silver:5, fame:10 }, prereq:{}, loc:'kunlun', target:'kunlun', script:'kunlun_rank1' },
  { key:'q_kunlun_rank2', type:'bai', faction:'kunlun', title:'昆仑·送剑', desc:'[见习→外门] 送昆仑剑到山下兰州兵器铺。', reward:{ silver:10, fame:15 }, prereq:{}, loc:'kunlun', target:'lanzhou', script:'kunlun_rank2' },
  { key:'q_kunlun_rank3', type:'bai', faction:'kunlun', title:'昆仑·何太冲篡位', desc:'[外门→内门] 何太冲想篡位，你选边站队（帮何太冲或帮班淑娴）。', reward:{ silver:15, fame:20 }, prereq:{}, loc:'kunlun', target:'kunlun', script:'kunlun_rank3' },
  { key:'q_chk_kunlun', type:'heroic', faction:'kunlun', title:'昆仑·接掌门闪电手', desc:'[核心弟子考验] 掌门用昆仑闪电手打你3招，不倒则传昆仑三圣真谱。', reward:{ silver:100, fame:50, skill:'kunlun_s5_l1' }, prereq:{ rep:{kunlun:1500}, contrib:{kunlun:1000} }, loc:'kunlun', target:'kunlun', script:'kunlun_core' },
  { key:'q_secret_kunlun', type:'heroic', faction:'kunlun', title:'昆仑·掌门独传', desc:'[亲传弟子剧情] 何太冲发现你资质，悄悄传你昆仑三圣真全谱。', reward:{ silver:200, fame:100, skill:'kunlun_s6_l1' }, prereq:{ rep:{kunlun:4000}, contrib:{kunlun:3000} }, loc:'kunlun', target:'kunlun', script:'kunlun_priv' },
  { key:'q_chief_kunlun', type:'heroic', faction:'kunlun', title:'昆仑·掌门继任', desc:'[首席弟子剧情] 何太冲（或班淑娴）退位，选你为昆仑掌门。', reward:{ silver:500, fame:300, skill:'kunlun_s7_l1' }, prereq:{}, loc:'kunlun', target:'kunlun', script:'kunlun_chief' },

  // —— 天山入门：生死考核 → 70%通过率 ——
  { key:'q_tianshan_join', type:'bai', faction:'tianshan', title:'天山入门·生死考核', desc:'[天山入门剧情] 你到天山，童姥说："天山入门需生死考核，我用八荒六合功打你3招，扛过且不犯戒方准入派（70%通过率）。"', reward:{ silver:0, fame:5 }, prereq:{}, loc:'tianshan', target:'tianshan', script:'tianshan_join' },
  { key:'q_tianshan_rank1', type:'bai', faction:'tianshan', title:'天山·轻功考核', desc:'[杂役→见习] 在天山悬崖上踏雪走一趟，不掉下去即可正式入门。', reward:{ silver:5, fame:10 }, prereq:{}, loc:'tianshan', target:'tianshan', script:'tianshan_rank1' },
  { key:'q_tianshan_rank2', type:'bai', faction:'tianshan', title:'天山·送雪莲', desc:'[见习→外门] 送天山雪莲到山下西域医馆。', reward:{ silver:10, fame:15 }, prereq:{}, loc:'tianshan', target:'xiyu', script:'tianshan_rank2' },
  { key:'q_tianshan_rank3', type:'bai', faction:'tianshan', title:'天山·童姥李秋水之争', desc:'[外门→内门] 童姥和李秋水大吵，你必须站队。', reward:{ silver:15, fame:20 }, prereq:{}, loc:'tianshan', target:'tianshan', script:'tianshan_rank3' },
  { key:'q_chk_tianshan', type:'heroic', faction:'tianshan', title:'天山·接童姥一掌', desc:'[核心弟子考验] 童姥用白虹掌打你1掌，不倒则传八荒六合功真本。', reward:{ silver:100, fame:50, skill:'tianshan_s5_l1' }, prereq:{ rep:{tianshan:1500}, contrib:{tianshan:1000} }, loc:'tianshan', target:'tianshan', script:'tianshan_core' },
  { key:'q_secret_tianshan', type:'heroic', faction:'tianshan', title:'天山·童姥关门弟子', desc:'[亲传弟子剧情] 童姥收你为关门弟子，说："你是我唯一不杀的弟子。"', reward:{ silver:200, fame:100, skill:'tianshan_s6_l1' }, prereq:{ rep:{tianshan:4000}, contrib:{tianshan:3000} }, loc:'tianshan', target:'tianshan', script:'tianshan_priv' },
  { key:'q_chief_tianshan', type:'heroic', faction:'tianshan', title:'天山·掌门继任', desc:'[首席弟子剧情] 童姥（或继任者）退位，选你为天山掌门。', reward:{ silver:500, fame:300, skill:'tianshan_s7_l1' }, prereq:{}, loc:'tianshan', target:'tianshan', script:'tianshan_chief' },

  // —— 明教入门：圣火暗号 → 光明顶 ——
  { key:'q_mingjiao_join', type:'bai', faction:'mingjiao', title:'明教入门·圣火暗号', desc:'[明教入门剧情] 你到光明顶，杨逍说："明教入门需传圣火令暗号，且有分舵接应。暗号：焚我残躯，熊熊圣火。"', reward:{ silver:0, fame:5 }, prereq:{}, loc:'guangmingding', target:'guangmingding', script:'mingjiao_join' },
  { key:'q_mingjiao_rank1', type:'bai', faction:'mingjiao', title:'明教·圣火拳考核', desc:'[杂役→见习] 接五散人圣火拳五招，不倒即可正式入门。', reward:{ silver:5, fame:10 }, prereq:{}, loc:'guangmingding', target:'guangmingding', script:'mingjiao_rank1' },
  { key:'q_mingjiao_rank2', type:'bai', faction:'mingjiao', title:'明教·送圣火令', desc:'[见习→外门] 送圣火令到各分舵，必须亲手交到分舵主手中。', reward:{ silver:10, fame:15 }, prereq:{}, loc:'guangmingding', target:'mingjiao_den', script:'mingjiao_rank2' },
  { key:'q_mingjiao_rank3', type:'bai', faction:'mingjiao', title:'明教·阳顶天失踪之谜', desc:'[外门→内门] 帮杨逍调查阳顶天失踪的真相，选边站队。', reward:{ silver:15, fame:20 }, prereq:{}, loc:'guangmingding', target:'guangmingding', script:'mingjiao_rank3' },
  { key:'q_chk_mingjiao', type:'heroic', faction:'mingjiao', title:'明教·扛住乾坤反弹', desc:'[核心弟子考验] 杨逍用乾坤大挪移反弹你的攻击，你不受伤则过。', reward:{ silver:100, fame:50, skill:'mingjiao_s5_l1' }, prereq:{ rep:{mingjiao:1500}, contrib:{mingjiao:1000} }, loc:'guangmingding', target:'guangmingding', script:'mingjiao_core' },
  { key:'q_secret_mingjiao', type:'heroic', faction:'mingjiao', title:'明教·张无忌真传', desc:'[亲传弟子剧情] 张无忌（或杨逍）发现你资质，悄悄传你乾坤大挪移第九层。', reward:{ silver:200, fame:100, skill:'mingjiao_s6_l1' }, prereq:{ rep:{mingjiao:4000}, contrib:{mingjiao:3000} }, loc:'guangmingding', target:'guangmingding', script:'mingjiao_priv' },
  { key:'q_chief_mingjiao', type:'heroic', faction:'mingjiao', title:'明教·教主继任', desc:'[首席弟子剧情] 张无忌（或杨逍）退位，选你为明教教主。', reward:{ silver:500, fame:300, skill:'mingjiao_s7_l1' }, prereq:{}, loc:'guangmingding', target:'guangmingding', script:'mingjiao_chief' },

  // —— 点苍入门：接剑五招 → 正派声望 ——
  { key:'q_diancang_join', type:'bai', faction:'diancang', title:'点苍入门·接剑', desc:'[点苍入门剧情] 你到点苍山，掌门说："点苍入门需柔剑考核，接我五招不倒，且正派声望不为负。"', reward:{ silver:0, fame:5 }, prereq:{}, loc:'diancang', target:'diancang', script:'diancang_join' },
  { key:'q_diancang_rank1', type:'bai', faction:'diancang', title:'点苍·剑招考核', desc:'[杂役→见习] 接点苍首席弟子剑法五招，不倒即可正式入门。', reward:{ silver:5, fame:10 }, prereq:{}, loc:'diancang', target:'diancang', script:'diancang_rank1' },
  { key:'q_diancang_rank2', type:'bai', faction:'diancang', title:'点苍·送剑谱', desc:'[见习→外门] 送点苍剑谱到山下大理城。', reward:{ silver:10, fame:15 }, prereq:{}, loc:'diancang', target:'dali', script:'diancang_rank2' },
  { key:'q_diancang_rank3', type:'bai', faction:'diancang', title:'点苍·掌门继承人之争', desc:'[外门→内门] 点苍掌门选继承人，你选边站队。', reward:{ silver:15, fame:20 }, prereq:{}, loc:'diancang', target:'diancang', script:'diancang_rank3' },
  { key:'q_chk_diancang', type:'heroic', faction:'diancang', title:'点苍·接掌门一指禅', desc:'[核心弟子考验] 掌门用点苍一指禅打你1指，不倒则传剑真谱。', reward:{ silver:100, fame:50, skill:'diancang_s5_l1' }, prereq:{ rep:{diancang:1500}, contrib:{diancang:1000} }, loc:'diancang', target:'diancang', script:'diancang_core' },
  { key:'q_secret_diancang', type:'heroic', faction:'diancang', title:'点苍·掌门独传', desc:'[亲传弟子剧情] 点苍掌门发现你资质，悄悄传你点苍剑真全谱。', reward:{ silver:200, fame:100, skill:'diancang_s6_l1' }, prereq:{ rep:{diancang:4000}, contrib:{diancang:3000} }, loc:'diancang', target:'diancang', script:'diancang_priv' },
  { key:'q_chief_diancang', type:'heroic', faction:'diancang', title:'点苍·掌门继任', desc:'[首席弟子剧情] 点苍掌门退位，选你为点苍掌门。', reward:{ silver:500, fame:300, skill:'diancang_s7_l1' }, prereq:{}, loc:'diancang', target:'diancang', script:'diancang_chief' },

  // —— 唐门入门：暗器打靶十发八中 ——
  { key:'q_tangmen_join', type:'bai', faction:'tangmen', title:'唐门入门·打靶', desc:'[唐门入门剧情] 你到唐门，门主说："唐门入门需暗器考核，十发八中方可入门。"', reward:{ silver:0, fame:5 }, prereq:{}, loc:'tangmen', target:'tangmen', script:'tangmen_join' },
  { key:'q_tangmen_rank1', type:'bai', faction:'tangmen', title:'唐门·暗器考核', desc:'[杂役→见习] 接唐门首席弟子暗器五招，不倒即可正式入门。', reward:{ silver:5, fame:10 }, prereq:{}, loc:'tangmen', target:'tangmen', script:'tangmen_rank1' },
  { key:'q_tangmen_rank2', type:'bai', faction:'tangmen', title:'唐门·送镖', desc:'[见习→外门] 送一趟镖到成都，不能丢。', reward:{ silver:10, fame:15 }, prereq:{}, loc:'tangmen', target:'chengdu', script:'tangmen_rank2' },
  { key:'q_tangmen_rank3', type:'bai', faction:'tangmen', title:'唐门·叛门者事件', desc:'[外门→内门] 唐门有叛门者，你负责追查，选边站队。', reward:{ silver:15, fame:20 }, prereq:{}, loc:'tangmen', target:'tangmen', script:'tangmen_rank3' },
  { key:'q_chk_tangmen', type:'heroic', faction:'tangmen', title:'唐门·躲暴雨梨花针', desc:'[核心弟子考验] 门主用暴雨梨花针对你发射，你躲过则传真套。', reward:{ silver:100, fame:50, skill:'tangmen_s5_l1' }, prereq:{ rep:{tangmen:1500}, contrib:{tangmen:1000} }, loc:'tangmen', target:'tangmen', script:'tangmen_core' },
  { key:'q_secret_tangmen', type:'heroic', faction:'tangmen', title:'唐门·唐老太爷真传', desc:'[亲传弟子剧情] 唐老太爷（或门主）发现你资质，悄悄传你暴雨梨花针真套。', reward:{ silver:200, fame:100, skill:'tangmen_s6_l1' }, prereq:{ rep:{tangmen:4000}, contrib:{tangmen:3000} }, loc:'tangmen', target:'tangmen', script:'tangmen_priv' },
  { key:'q_chief_tangmen', type:'heroic', faction:'tangmen', title:'唐门·门主继任', desc:'[首席弟子剧情] 唐门门主退位，选你为唐门门主。', reward:{ silver:500, fame:300, skill:'tangmen_s7_l1' }, prereq:{}, loc:'tangmen', target:'tangmen', script:'tangmen_chief' },

  // —— 五毒入门：喝毒汤不死 → 70%通过率 ——
  { key:'q_wudu_join', type:'bai', faction:'wudu', title:'五毒入门·喝毒汤', desc:'[五毒入门剧情] 你到五毒谷，蓝凤凰说："五毒入门需百毒不侵考核，喝一碗毒汤不死方可入门（70%通过率）。"', reward:{ silver:0, fame:5 }, prereq:{}, loc:'wudu', target:'wudu', script:'wudu_join' },
  { key:'q_wudu_rank1', type:'bai', faction:'wudu', title:'五毒·毒掌考核', desc:'[杂役→见习] 接五毒教主五毒掌五招，不倒即可正式入门。', reward:{ silver:5, fame:10 }, prereq:{}, loc:'wudu', target:'wudu', script:'wudu_rank1' },
  { key:'q_wudu_rank2', type:'bai', faction:'wudu', title:'五毒·送毒囊', desc:'[见习→外门] 送毒囊到各分舵，必须亲手交到分舵主手中。', reward:{ silver:10, fame:15 }, prereq:{}, loc:'wudu', target:'wudu', script:'wudu_rank2' },
  { key:'q_wudu_rank3', type:'bai', faction:'wudu', title:'五毒·继位之争', desc:'[外门→内门] 蓝凤凰想继位，你选边站队（帮蓝凤凰或帮前任教主之子）。', reward:{ silver:15, fame:20 }, prereq:{}, loc:'wudu', target:'wudu', script:'wudu_rank3' },
  { key:'q_chk_wudu', type:'heroic', faction:'wudu', title:'五毒·活过万蛊噬心', desc:'[核心弟子考验] 教主用万蛊噬心考验你，你活过则传金蚕蛊珠。', reward:{ silver:100, fame:50, skill:'wudu_s5_l1' }, prereq:{ rep:{wudu:1500}, contrib:{wudu:1000} }, loc:'wudu', target:'wudu', script:'wudu_core' },
  { key:'q_secret_wudu', type:'heroic', faction:'wudu', title:'五毒·蓝凤凰关门弟子', desc:'[亲传弟子剧情] 蓝凤凰收你为关门弟子，说："你是我唯一不喂蛊的弟子。"', reward:{ silver:200, fame:100, skill:'wudu_s6_l1' }, prereq:{ rep:{wudu:4000}, contrib:{wudu:3000} }, loc:'wudu', target:'wudu', script:'wudu_priv' },
  { key:'q_chief_wudu', type:'heroic', faction:'wudu', title:'五毒·教主继任', desc:'[首席弟子剧情] 蓝凤凰（或继任者）退位，选你为五毒教主。', reward:{ silver:500, fame:300, skill:'wudu_s7_l1' }, prereq:{}, loc:'wudu', target:'wudu', script:'wudu_chief' },

  // —— 段氏入门：接指三招 → 皇帝点头 ——
  { key:'q_duanshi_join', type:'bai', faction:'duanshi', title:'段氏入门·接指', desc:'[段氏入门剧情] 你到大理，段正明说："段氏入门需一阳指考核，接我三招不倒，且需皇帝点头（非皇族也能入）。"', reward:{ silver:0, fame:5 }, prereq:{}, loc:'dali', target:'dali', script:'duanshi_join' },
  { key:'q_duanshi_rank1', type:'bai', faction:'duanshi', title:'段氏·剑法考核', desc:'[杂役→见习] 接段誉段氏剑法五招，不倒即可正式入门。', reward:{ silver:5, fame:10 }, prereq:{}, loc:'dali', target:'dali', script:'duanshi_rank1' },
  { key:'q_duanshi_rank2', type:'bai', faction:'duanshi', title:'段氏·送剑谱', desc:'[见习→外门] 送段氏剑谱到山下昆明府。', reward:{ silver:10, fame:15 }, prereq:{}, loc:'dali', target:'kunming', script:'duanshi_rank2' },
  { key:'q_duanshi_rank3', type:'bai', faction:'duanshi', title:'段氏·段正淳风流债', desc:'[外门→内门] 段正淳的风流债找上门，你选边站队。', reward:{ silver:15, fame:20 }, prereq:{}, loc:'dali', target:'dali', script:'duanshi_rank3' },
  { key:'q_chk_duanshi', type:'heroic', faction:'duanshi', title:'段氏·接段正明一阳指', desc:'[核心弟子考验] 段正明用一阳指打你1指，不倒则传六脉神剑。', reward:{ silver:100, fame:50, skill:'duanshi_s5_l1' }, prereq:{ rep:{duanshi:1500}, contrib:{duanshi:1000} }, loc:'dali', target:'dali', script:'duanshi_core' },
  { key:'q_secret_duanshi', type:'heroic', faction:'duanshi', title:'段氏·段誉真传', desc:'[亲传弟子剧情] 段誉发现你资质，悄悄传你六脉神剑真谱。', reward:{ silver:200, fame:100, skill:'duanshi_s6_l1' }, prereq:{ rep:{duanshi:4000}, contrib:{duanshi:3000} }, loc:'dali', target:'dali', script:'duanshi_priv' },
  { key:'q_chief_duanshi', type:'heroic', faction:'duanshi', title:'段氏·皇帝继任', desc:'[首席弟子剧情] 段正明（或段誉）退位，选你为大理皇帝（和六脉神剑）。', reward:{ silver:500, fame:300, skill:'duanshi_s7_l1' }, prereq:{}, loc:'dali', target:'dali', script:'duanshi_chief' },

  // —— 桃花岛入门：三问考核（文/武/巧）——
  { key:'q_taohua_join', type:'bai', faction:'taohua', title:'桃花岛入门·三问', desc:'[桃花岛入门剧情] 你到桃花岛，黄老邪说："桃花岛入门需三问考核：文（答一题）、武（接一掌）、巧（破机关），全过方可入门。"', reward:{ silver:0, fame:5 }, prereq:{}, loc:'taohua', target:'taohua', script:'taohua_join' },
  { key:'q_taohua_rank1', type:'bai', faction:'taohua', title:'桃花岛·掌法考核', desc:'[杂役→见习] 接黄蓉落英神剑掌五招，不倒即可正式入门。', reward:{ silver:5, fame:10 }, prereq:{}, loc:'taohua', target:'taohua', script:'taohua_rank1' },
  { key:'q_taohua_rank2', type:'bai', faction:'taohua', title:'桃花岛·送玉箫', desc:'[见习→外门] 送黄老邪的玉箫到江南烟雨楼。', reward:{ silver:10, fame:15 }, prereq:{}, loc:'taohua', target:'jiangnan', script:'taohua_rank2' },
  { key:'q_taohua_rank3', type:'bai', faction:'taohua', title:'桃花岛·继位之争', desc:'[外门→内门] 黄蓉想继位，你选边站队（帮黄蓉或帮黄老邪旧部）。', reward:{ silver:15, fame:20 }, prereq:{}, loc:'taohua', target:'taohua', script:'taohua_rank3' },
  { key:'q_chk_taohua', type:'heroic', faction:'taohua', title:'桃花岛·接黄老邪弹指', desc:'[核心弟子考验] 黄老邪用弹指神通打你1指，不倒则传弹指神通真谱。', reward:{ silver:100, fame:50, skill:'taohua_s5_l1' }, prereq:{ rep:{taohua:1500}, contrib:{taohua:1000} }, loc:'taohua', target:'taohua', script:'taohua_core' },
  { key:'q_secret_taohua', type:'heroic', faction:'taohua', title:'桃花岛·黄蓉真传', desc:'[亲传弟子剧情] 黄蓉（或郭靖）发现你资质，悄悄传你九阴真经下卷。', reward:{ silver:200, fame:100, skill:'taohua_s6_l1' }, prereq:{ rep:{taohua:4000}, contrib:{taohua:3000} }, loc:'taohua', target:'taohua', script:'taohua_priv' },
  { key:'q_chief_taohua', type:'heroic', faction:'taohua', title:'桃花岛·帮主继任', desc:'[首席弟子剧情] 黄蓉（或郭靖）退位，选你为桃花岛（丐帮帮主继承？）继任。', reward:{ silver:500, fame:300, skill:'taohua_s7_l1' }, prereq:{}, loc:'taohua', target:'taohua', script:'taohua_chief' },

  // —— 海盗入门：喝朗姆酒 + 捅自己一刀 ——
  { key:'q_haidao_join', type:'bai', faction:'haidao', title:'海盗入门·拼命', desc:'[海盗入门剧情] 你到海盗岛，头目说："海盗入门需拼命：喝一碗朗姆酒 + 敢捅自己胳膊一刀（证明不怕死）。"', reward:{ silver:0, fame:5, infamy:5 }, prereq:{}, loc:'haidao', target:'haidao', script:'haidao_join' },
  { key:'q_haidao_rank1', type:'bai', faction:'haidao', title:'海盗·刀法考核', desc:'[杂役→见习] 接海盗头目刀法五招，不倒即可正式入门。', reward:{ silver:5, fame:5, infamy:5 }, prereq:{}, loc:'haidao', target:'haidao', script:'haidao_rank1' },
  { key:'q_haidao_rank2', type:'bai', faction:'haidao', title:'海盗·送赃物', desc:'[见习→外门] 送赃物到泉州黑市，不能被抓。', reward:{ silver:20, fame:5, infamy:10 }, prereq:{}, loc:'haidao', target:'quanzhou', script:'haidao_rank2' },
  { key:'q_haidao_rank3', type:'bai', faction:'haidao', title:'海盗·杀正道人', desc:'[外门→内门] 必须杀一个正道人立投名状（选边，帮海盗或帮正道）。', reward:{ silver:30, fame:-10, infamy:30 }, prereq:{}, loc:'haidao', target:'haidao', script:'haidao_rank3' },
  { key:'q_chk_haidao', type:'heroic', faction:'haidao', title:'海盗·杀百人过关', desc:'[核心弟子考验] 海盗头目让你杀100个敌人（商船护卫/正道人士），完成则传血海屠岛。', reward:{ silver:200, fame:-20, infamy:50, skill:'haidao_s5_l1' }, prereq:{ rep:{haidao:1500}, contrib:{haidao:1000} }, loc:'haidao', target:'haidao', script:'haidao_core' },
  { key:'q_secret_haidao', type:'heroic', faction:'haidao', title:'海盗·海盗王真传', desc:'[亲传弟子剧情] 海盗王收你为关门弟子，说："你是我下一个海盗王。"', reward:{ silver:300, fame:-30, infamy:100, skill:'haidao_s6_l1' }, prereq:{ rep:{haidao:4000}, contrib:{haidao:3000} }, loc:'haidao', target:'haidao', script:'haidao_priv' },
  { key:'q_chief_haidao', type:'heroic', faction:'haidao', title:'海盗·海盗王继任', desc:'[首席弟子剧情] 海盗王退位，选你为新海盗王。', reward:{ silver:1000, fame:-50, infamy:200, skill:'haidao_s7_l1' }, prereq:{}, loc:'haidao', target:'haidao', script:'haidao_chief' },

  // —— 盐帮入门：扛200斤盐袋 ——
  { key:'q_salt_join', type:'bai', faction:'salt', title:'盐帮入门·扛盐', desc:'[盐帮入门剧情] 你到盐场，钱掌柜说："盐帮入门需扛盐考核，扛200斤盐袋走三里路。"', reward:{ silver:0, fame:5 }, prereq:{}, loc:'salt', target:'salt', script:'salt_join' },
  { key:'q_salt_rank1', type:'bai', faction:'salt', title:'盐帮·短打考核', desc:'[杂役→见习] 接盐帮帮主短打五招，不倒即可正式入门。', reward:{ silver:5, fame:10 }, prereq:{}, loc:'salt', target:'salt', script:'salt_rank1' },
  { key:'q_salt_rank2', type:'bai', faction:'salt', title:'盐帮·送盐', desc:'[见习→外门] 送盐到各地盐店，不能丢。', reward:{ silver:15, fame:15 }, prereq:{}, loc:'salt', target:'salt', script:'salt_rank2' },
  { key:'q_salt_rank3', type:'bai', faction:'salt', title:'盐帮·继位之争', desc:'[外门→内门] 钱掌柜想传位，你选边站队（帮钱掌柜或帮竞争对手）。', reward:{ silver:30, fame:20 }, prereq:{}, loc:'salt', target:'salt', script:'salt_rank3' },
  { key:'q_chk_salt', type:'heroic', faction:'salt', title:'盐帮·接帮主三招', desc:'[核心弟子考验] 帮主用盐帮镇帮功打你3招，不倒则传镇帮功。', reward:{ silver:100, fame:50, skill:'salt_s5_l1' }, prereq:{ rep:{salt:1500}, contrib:{salt:1000} }, loc:'salt', target:'salt', script:'salt_core' },
  { key:'q_secret_salt', type:'heroic', faction:'salt', title:'盐帮·盐商大佬真传', desc:'[亲传弟子剧情] 钱掌柜收你为关门弟子，传你巨富盐商令。', reward:{ silver:500, fame:100, skill:'salt_s6_l1' }, prereq:{ rep:{salt:4000}, contrib:{salt:3000} }, loc:'salt', target:'salt', script:'salt_priv' },
  { key:'q_chief_salt', type:'heroic', faction:'salt', title:'盐帮·帮主继任', desc:'[首席弟子剧情] 钱掌柜退位，选你为盐帮帮主（兼盐商大佬）。', reward:{ silver:2000, fame:300, skill:'salt_s7_l1' }, prereq:{}, loc:'salt', target:'salt', script:'salt_chief' },

  // —— 铁掌帮入门：接裘千仞三掌 ——
  { key:'q_tiezhang_join', type:'bai', faction:'tiezhang', title:'铁掌帮入门·接掌', desc:'[铁掌帮入门剧情] 你到铁掌峰，裘千仞说："铁掌帮入门需三掌考核，接我三掌不倒方可入门。"', reward:{ silver:0, fame:5 }, prereq:{}, loc:'tiezhang', target:'tiezhang', script:'tiezhang_join' },
  { key:'q_tiezhang_rank1', type:'bai', faction:'tiezhang', title:'铁掌帮·掌法考核', desc:'[杂役→见习] 接铁掌帮首席弟子铁掌五招，不倒即可正式入门。', reward:{ silver:5, fame:10 }, prereq:{}, loc:'tiezhang', target:'tiezhang', script:'tiezhang_rank1' },
  { key:'q_tiezhang_rank2', type:'bai', faction:'tiezhang', title:'铁掌帮·送铁掌', desc:'[见习→外门] 送铁掌兵器到山下襄阳。', reward:{ silver:10, fame:15 }, prereq:{}, loc:'tiezhang', target:'xiangyang', script:'tiezhang_rank2' },
  { key:'q_tiezhang_rank3', type:'bai', faction:'tiezhang', title:'铁掌帮·篡位之争', desc:'[外门→内门] 裘千仞想强化统治，你选边站队。', reward:{ silver:15, fame:20 }, prereq:{}, loc:'tiezhang', target:'tiezhang', script:'tiezhang_rank3' },
  { key:'q_chk_tiezhang', type:'heroic', faction:'tiezhang', title:'铁掌帮·接裘千仞三掌', desc:'[核心弟子考验] 裘千仞用铁掌真力打你3掌，不倒则传铁掌真经。', reward:{ silver:100, fame:50, skill:'tiezhang_s5_l1' }, prereq:{ rep:{tiezhang:1500}, contrib:{tiezhang:1000} }, loc:'tiezhang', target:'tiezhang', script:'tiezhang_core' },
  { key:'q_secret_tiezhang', type:'heroic', faction:'tiezhang', title:'铁掌帮·裘千仞真传', desc:'[亲传弟子剧情] 裘千仞发现你资质，悄悄传你铁掌真经真本。', reward:{ silver:200, fame:100, skill:'tiezhang_s6_l1' }, prereq:{ rep:{tiezhang:4000}, contrib:{tiezhang:3000} }, loc:'tiezhang', target:'tiezhang', script:'tiezhang_priv' },
  { key:'q_chief_tiezhang', type:'heroic', faction:'tiezhang', title:'铁掌帮·帮主继任', desc:'[首席弟子剧情] 裘千仞退位，选你为铁掌帮帮主。', reward:{ silver:500, fame:300, skill:'tiezhang_s7_l1' }, prereq:{}, loc:'tiezhang', target:'tiezhang', script:'tiezhang_chief' },

  // —— 慕容入门：接剑三招 → 不能背刺 ——
  { key:'q_murong_join', type:'bai', faction:'murong', title:'慕容入门·接剑', desc:'[慕容入门剧情] 你到慕容庄，慕容复说："慕容入门需剑法考核，接我三招不倒，且不能做背刺的人。"', reward:{ silver:0, fame:5 }, prereq:{}, loc:'murong', target:'murong', script:'murong_join' },
  { key:'q_murong_rank1', type:'bai', faction:'murong', title:'慕容·剑招考核', desc:'[杂役→见习] 接慕容博参合拳五招，不倒即可正式入门。', reward:{ silver:5, fame:10 }, prereq:{}, loc:'murong', target:'murong', script:'murong_rank1' },
  { key:'q_murong_rank2', type:'bai', faction:'murong', title:'慕容·送剑谱', desc:'[见习→外门] 送参合剑谱到慕容庄密库。', reward:{ silver:10, fame:15 }, prereq:{}, loc:'murong', target:'murong', script:'murong_rank2' },
  { key:'q_murong_rank3', type:'bai', faction:'murong', title:'慕容·复国计划', desc:'[外门→内门] 慕容复的复国计划需要人手，你选边站队。', reward:{ silver:15, fame:20 }, prereq:{}, loc:'murong', target:'murong', script:'murong_rank3' },
  { key:'q_chk_murong', type:'heroic', faction:'murong', title:'慕容·接自己斗转星移', desc:'[核心弟子考验] 慕容博用斗转星移反弹你的攻击，你接住反弹则传真谱。', reward:{ silver:100, fame:50, skill:'murong_s5_l1' }, prereq:{ rep:{murong:1500}, contrib:{murong:1000} }, loc:'murong', target:'murong', script:'murong_core' },
  { key:'q_secret_murong', type:'heroic', faction:'murong', title:'慕容·慕容博真传', desc:'[亲传弟子剧情] 慕容博发现你资质，悄悄传你斗转星移真谱。', reward:{ silver:200, fame:100, skill:'murong_s6_l1' }, prereq:{ rep:{murong:4000}, contrib:{murong:3000} }, loc:'murong', target:'murong', script:'murong_priv' },
  { key:'q_chief_murong', type:'heroic', faction:'murong', title:'慕容·家主继任', desc:'[首席弟子剧情] 慕容博（或慕容复）退位，选你为慕容家主。', reward:{ silver:500, fame:300, skill:'murong_s7_l1' }, prereq:{}, loc:'murong', target:'murong', script:'murong_chief' },

  // —— 青龙会入门：双杀暗号 + 杀正道人 ——
  { key:'q_qinglong_join', type:'bai', faction:'qinglong', title:'青龙会入门·双杀', desc:'[青龙会入门剧情] 你到青龙会暗堂，龙头说："青龙会入门需双杀暗号 + 杀一个正道人立投名状。"', reward:{ silver:0, infamy:10 }, prereq:{}, loc:'qinglong', target:'qinglong', script:'qinglong_join' },
  { key:'q_qinglong_rank1', type:'bai', faction:'qinglong', title:'青龙会·刀法考核', desc:'[杂役→见习] 接青龙会长老青龙刀法五招，不倒即可正式入门。', reward:{ silver:5, infamy:10 }, prereq:{}, loc:'qinglong', target:'qinglong', script:'qinglong_rank1' },
  { key:'q_qinglong_rank2', type:'bai', faction:'qinglong', title:'青龙会·送情报', desc:'[见习→外门] 送情报到各分舵，必须亲手交到分舵主手中。', reward:{ silver:10, infamy:15 }, prereq:{}, loc:'qinglong', target:'qinglong', script:'qinglong_rank2' },
  { key:'q_qinglong_rank3', type:'bai', faction:'qinglong', title:'青龙会·龙头篡位', desc:'[外门→内门] 现任龙头想篡位，你选边站队（帮现任或帮前任之子）。', reward:{ silver:15, infamy:30 }, prereq:{}, loc:'qinglong', target:'qinglong', script:'qinglong_rank3' },
  { key:'q_chk_qinglong', type:'heroic', faction:'qinglong', title:'青龙会·完成三次黑活', desc:'[核心弟子考验] 龙头让你做3次暗杀任务，完成则传青龙令真令。', reward:{ silver:200, infamy:100, skill:'qinglong_s5_l1' }, prereq:{ rep:{qinglong:1500}, contrib:{qinglong:1000} }, loc:'qinglong', target:'qinglong', script:'qinglong_core' },
  { key:'q_secret_qinglong', type:'heroic', faction:'qinglong', title:'青龙会·龙头真传', desc:'[亲传弟子剧情] 龙头收你为关门弟子，说："你是我唯一的继承人。"', reward:{ silver:300, infamy:200, skill:'qinglong_s6_l1' }, prereq:{ rep:{qinglong:4000}, contrib:{qinglong:3000} }, loc:'qinglong', target:'qinglong', script:'qinglong_priv' },
  { key:'q_chief_qinglong', type:'heroic', faction:'qinglong', title:'青龙会·龙头继任', desc:'[首席弟子剧情] 龙头退位，选你为新龙头。', reward:{ silver:1000, infamy:500, skill:'qinglong_s7_l1' }, prereq:{}, loc:'qinglong', target:'qinglong', script:'qinglong_chief' },

  // —— 金钱帮入门：交100两 ——
  { key:'q_qianjin_join', type:'bai', faction:'qianjin', title:'金钱帮入门·交钱', desc:'[金钱帮入门剧情] 你到金钱帮，帮主说："金钱帮入门需100两银子入门费（爱钱如命）。"', reward:{ silver:0, fame:5 }, prereq:{}, loc:'qianjin', target:'qianjin', script:'qianjin_join' },
  { key:'q_qianjin_rank1', type:'bai', faction:'qianjin', title:'金钱帮·暗器考核', desc:'[杂役→见习] 接金钱帮长老金钱镖五招，不倒即可正式入门。', reward:{ silver:5, fame:10 }, prereq:{}, loc:'qianjin', target:'qianjin', script:'qianjin_rank1' },
  { key:'q_qianjin_rank2', type:'bai', faction:'qianjin', title:'金钱帮·跑商', desc:'[见习→外门] 跑一趟商到开封，赚的钱归帮里。', reward:{ silver:20, fame:15 }, prereq:{}, loc:'qianjin', target:'kaifeng', script:'qianjin_rank2' },
  { key:'q_qianjin_rank3', type:'bai', faction:'qianjin', title:'金钱帮·帮主继位', desc:'[外门→内门] 现任帮主想传位，你选边站队。', reward:{ silver:30, fame:20 }, prereq:{}, loc:'qianjin', target:'qianjin', script:'qianjin_rank3' },
  { key:'q_chk_qianjin', type:'heroic', faction:'qianjin', title:'金钱帮·完成三次商路', desc:'[核心弟子考验] 帮主让你做3次跑商任务，每次赚1000两以上，完成则传乾坤一掷。', reward:{ silver:500, fame:50, skill:'qianjin_s5_l1' }, prereq:{ rep:{qianjin:1500}, contrib:{qianjin:1000} }, loc:'qianjin', target:'qianjin', script:'qianjin_core' },
  { key:'q_secret_qianjin', type:'heroic', faction:'qianjin', title:'金钱帮·帮主真传', desc:'[亲传弟子剧情] 帮主发现你爱财如命，悄悄传你金饭碗（赚钱神器）。', reward:{ silver:1000, fame:100, skill:'qianjin_s6_l1' }, prereq:{ rep:{qianjin:4000}, contrib:{qianjin:3000} }, loc:'qianjin', target:'qianjin', script:'qianjin_priv' },
  { key:'q_chief_qianjin', type:'heroic', faction:'qianjin', title:'金钱帮·帮主继任', desc:'[首席弟子剧情] 帮主退位，选你为金钱帮帮主（兼天下首富）。', reward:{ silver:5000, fame:300, skill:'qianjin_s7_l1' }, prereq:{}, loc:'qianjin', target:'qianjin', script:'qianjin_chief' },

  // —— 南宫入门：血脉优先 / 立大功 ——
  { key:'q_nangong_join', type:'bai', faction:'nan_gong', title:'南宫入门·立大功', desc:'[南宫入门剧情] 你到南宫家，南宫老爷子说："南宫入门需家族血脉优先，或立下大功被接纳。你说一件你立的大功。"', reward:{ silver:0, fame:10 }, prereq:{}, loc:'nan_gong', target:'nan_gong', script:'nangong_join' },
  { key:'q_nangong_rank1', type:'bai', faction:'nan_gong', title:'南宫·剑法考核', desc:'[杂役→见习] 接南宫老爷子南宫剑法五招，不倒即可正式入门。', reward:{ silver:5, fame:10 }, prereq:{}, loc:'nan_gong', target:'nan_gong', script:'nangong_rank1' },
  { key:'q_nangong_rank2', type:'bai', faction:'nan_gong', title:'南宫·送剑谱', desc:'[见习→外门] 送南宫剑谱到南宫家密库。', reward:{ silver:10, fame:15 }, prereq:{}, loc:'nan_gong', target:'nan_gong', script:'nangong_rank2' },
  { key:'q_nangong_rank3', type:'bai', faction:'nan_gong', title:'南宫·老爷子继位', desc:'[外门→内门] 南宫老爷子选继承人，你选边站队。', reward:{ silver:15, fame:20 }, prereq:{}, loc:'nan_gong', target:'nan_gong', script:'nangong_rank3' },
  { key:'q_chk_nangong', type:'heroic', faction:'nan_gong', title:'南宫·接老爷子玄冰掌', desc:'[核心弟子考验] 南宫老爷子用玄冰掌打你1掌，不倒则传玄冰真气。', reward:{ silver:100, fame:50, skill:'nangong_s5_l1' }, prereq:{ rep:{nan_gong:1500}, contrib:{nan_gong:1000} }, loc:'nan_gong', target:'nan_gong', script:'nangong_core' },
  { key:'q_secret_nangong', type:'heroic', faction:'nan_gong', title:'南宫·老爷子真传', desc:'[亲传弟子剧情] 南宫老爷子发现你资质，悄悄传你玄冰剑。', reward:{ silver:200, fame:100, skill:'nangong_s6_l1' }, prereq:{ rep:{nan_gong:4000}, contrib:{nan_gong:3000} }, loc:'nan_gong', target:'nan_gong', script:'nangong_priv' },
  { key:'q_chief_nangong', type:'heroic', faction:'nan_gong', title:'南宫·家主继任', desc:'[首席弟子剧情] 南宫老爷子退位，选你为南宫家主。', reward:{ silver:500, fame:300, skill:'nangong_s7_l1' }, prereq:{}, loc:'nan_gong', target:'nan_gong', script:'nangong_chief' },

  // —— 黑活（风险高报酬高，target 全是真实节点）——
  { key:'q_black_salt',   type:'hei',  faction:null,      title:'走私私盐',   desc:'运 5 包私盐到雁门关（北荒入口）。', reward:{ silver:20, infamy:10 }, risk:'通缉', loc:'yanyang', target:'yanmen' },
  { key:'q_black_steal',  type:'hei',  faction:null,      title:'偷窃',       desc:'偷武当山清虚道长的钱袋。', reward:{ silver:15, infamy:15 }, risk:'武当声望-20', loc:'wudang', target:'wudang' },
  { key:'q_black_kill',   type:'hei',  faction:'qinglong',title:'暗杀',       desc:'暗杀一名华山弟子（在华山）。', reward:{ silver:40, infamy:20 }, risk:'华山声望-30', loc:'huashan', target:'huashan', combat:true },
  { key:'q_black_info',   type:'hei',  faction:null,      title:'倒卖情报',   desc:'把少林派系斗争消息卖给明教（光明顶）。', reward:{ silver:25, infamy:10 }, risk:'少林声望-40', loc:'luoyang', target:'guangmingding' },
  { key:'q_black_fake',   type:'hei',  faction:'qinglong',title:'伪造名册',   desc:'伪造一份丐帮弟子名册（在丐帮总舵）。', reward:{ silver:30, infamy:15 }, risk:'丐帮声望-50', loc:'gaibang', target:'gaibang' },

  // ===== 补全所有城镇（按域补齐缺口）=====

  // —— 中州域补齐 ——
  { key:'q_xy_msg_luoyang', type:'bai', faction:'gaibang', title:'送信襄阳', desc:'从襄阳城丐帮分舵送急信去洛阳丐帮分舵。', reward:{ silver:3, fame:3 }, prereq:{}, loc:'xiangyang', target:'luoyang' },
  { key:'q_xy_escort_merch', type:'bai', faction:null, title:'护送商队', desc:'护送一队商人从襄阳到洛阳。', reward:{ silver:10, fame:6 }, prereq:{ rep:{gaibang:10} }, loc:'xiangyang', target:'luoyang' },
  { key:'q_black_smuggle',  type:'hei',  faction:'qinglong', title:'黑市出货', desc:'在洛阳黑市帮青龙会出货一批禁药。', reward:{ silver:25, infamy:15 }, risk:'官府通缉', loc:'luoyang_black', target:'luoyang_black' },
  { key:'q_black_bribe',    type:'hei',  faction:null,       title:'贿赂捕快', desc:'带 50 两银子去铁门关贿赂守关士兵放一人过关。', reward:{ silver:30, infamy:10 }, risk:'铁门关通缉', loc:'xiyu_entrance', target:'xiyu_entrance' },
  { key:'q_guide_south',    type:'bai',  faction:null,       title:'带路过蜀道', desc:'给一名商人带路过蜀道南口到成都。', reward:{ silver:6, fame:3 }, prereq:{}, loc:'nanjiang_entrance', target:'chengdu' },

  // —— 西域域补齐（敦煌/光明顶/天山/昆仑/沙漠/绿洲/天山派）——
  { key:'q_dh_guard',     type:'bai', faction:null,       title:'守夜', desc:'在敦煌城门前守夜一整夜（到敦煌即完成）。', reward:{ silver:5, fame:2 }, prereq:{}, loc:'dunhuang', target:'dunhuang' },
  { key:'q_dh_camel',     type:'bai', faction:null,       title:'找骆驼', desc:'商队的骆驼跑丢了，去沙漠商道找回来。', reward:{ silver:8, fame:3 }, prereq:{}, loc:'dunhuang', target:'desert' },
  { key:'q_mj_recruit',   type:'bai', faction:'mingjiao', title:'联络暗桩', desc:'去明教暗桩联络新成员，带暗号回光明顶。', reward:{ silver:10, fame:-3 }, prereq:{ rep:{mingjiao:20} }, loc:'guangmingding', target:'mingjiao_den' },
  { key:'q_mj_secret',    type:'hei', faction:'mingjiao', title:'夺密信', desc:'去光明顶抢一封六大门派围攻光明顶的密信。', reward:{ silver:35, infamy:20 }, risk:'正道声望全降', loc:'guangmingding', target:'guangmingding', combat:true },
  { key:'q_ts_snowlotus', type:'bai', faction:'tianshan', title:'采雪莲', desc:'在天山雪原采 3 株雪莲（到天山即完成）。', reward:{ silver:8, fame:4 }, prereq:{}, loc:'tianshan', target:'tianshan' },
  { key:'q_ts_fight',     type:'bai', faction:'tianshan', title:'击退盗匪', desc:'天山脚下有盗匪骚扰牧民，去打跑他们。', reward:{ silver:12, fame:8 }, prereq:{ rep:{tianshan:30} }, loc:'tianshan', target:'tianshan', combat:true },
  { key:'q_kl_msg',       type:'bai', faction:'kunlun',   title:'送信光明顶', desc:'昆仑派掌门让你送一封信去光明顶。', reward:{ silver:4, fame:3 }, prereq:{}, loc:'kunlun', target:'guangmingding' },
  { key:'q_kl_demon',     type:'bai', faction:'kunlun',   title:'除妖',     desc:'昆仑山口据说有妖兽出没，去查看一下。', reward:{ silver:10, fame:7 }, prereq:{ rep:{kunlun:30} }, loc:'kunlun', target:'kunlun', combat:true },
  { key:'q_desert_escort',type:'bai', faction:null,        title:'穿越沙漠', desc:'护送一名迷路的行商从沙漠商道到绿洲。', reward:{ silver:15, fame:5 }, prereq:{}, loc:'desert', target:'oasis' },
  { key:'q_oasis_trade',  type:'bai', faction:null,        title:'绿洲换粮', desc:'帮绿洲的驼队用 10 匹马换 20 袋粮食。', reward:{ silver:7, fame:3 }, prereq:{}, loc:'oasis', target:'oasis' },
  { key:'q_tsp_teach',    type:'bai', faction:'tianshan',  title:'代教弟子', desc:'在天山派代掌门教新弟子基础剑法。', reward:{ silver:8, fame:5 }, prereq:{ rep:{tianshan:40} }, loc:'tianshan_peak', target:'tianshan_peak' },

  // —— 南疆域补齐（成都/大理/点苍山/盐井/旧案/毒沼）——
  { key:'q_cd_tea',       type:'bai', faction:null,       title:'送茶叶', desc:'帮茶商送一批好茶叶到洛阳茶馆。', reward:{ silver:10, fame:4 }, prereq:{}, loc:'chengdu', target:'luoyang' },
  { key:'q_cd_sha',       type:'hei', faction:'qinglong',  title:'地下赌场', desc:'帮青龙会在成都开一家地下赌场。', reward:{ silver:30, infamy:15 }, risk:'官府查抄', loc:'chengdu', target:'chengdu' },
  { key:'q_dl_diancang',  type:'bai', faction:'duanshi',   title:'送信点苍', desc:'大理国段王爷送信给点苍山掌门。', reward:{ silver:5, fame:3 }, prereq:{}, loc:'dali', target:'diancang' },
  { key:'q_dl_murder',    type:'hei', faction:null,        title:'灭口',    desc:'去大理城门口杀掉一个可能泄密的证人。', reward:{ silver:40, infamy:25 }, risk:'大理国通缉', loc:'dali', target:'dali', combat:true },
  { key:'q_dc_lore',      type:'bai', faction:'diancang',  title:'找秘籍', desc:'点苍山深处据说有失踪的内功秘籍，去找找。', reward:{ silver:20, fame:10 }, prereq:{ rep:{diancang:30} }, loc:'diancang', target:'diancang' },
  { key:'q_salt_smuggle', type:'hei', faction:null,        title:'偷盐',   desc:'从盐井偷运 10 包官盐去成都黑市。', reward:{ silver:25, infamy:12 }, risk:'官府通缉', loc:'saltwell', target:'chengdu' },
  { key:'q_oc_investigate',type:'bai', faction:'tangmen', title:'查旧案', desc:'唐门让你去旧案遗址查二十年前那桩冲突的证据。', reward:{ silver:15, fame:8 }, prereq:{ rep:{tangmen:50} }, loc:'oldcase', target:'oldcase' },
  { key:'q_poison_collect',type:'hei', faction:'wudu',     title:'采剧毒', desc:'去毒沼采 5 株最毒的毒草回五毒谷。', reward:{ silver:20, infamy:8 }, risk:'中毒风险', loc:'poison_marsh', target:'wudu' },

  // —— 东海域补齐（全缺！泉州/盐场/无名岛/桃花岛/海盗窝/码头/海路）——
  { key:'q_qz_shipping',  type:'bai', faction:null,       title:'接货',    desc:'在泉州码头接一批南洋来的香料并送到城内商号。', reward:{ silver:6, fame:2 }, prereq:{}, loc:'quanzhou', target:'quanzhou' },
  { key:'q_qz_pirate',    type:'hei', faction:'qinglong',  title:'销赃',    desc:'帮青龙会在泉州销一批从海盗那里抢来的赃物。', reward:{ silver:28, infamy:12 }, risk:'水师通缉', loc:'quanzhou', target:'luoyang' },
  { key:'q_sy_guard',     type:'bai', faction:null,       title:'晒盐',    desc:'帮盐场把 10 筐海盐翻晒收仓。', reward:{ silver:5, fame:2 }, prereq:{}, loc:'saltyard', target:'saltyard' },
  { key:'q_sy_raid',      type:'hei', faction:null,        title:'抢盐车',  desc:'抢劫盐场的运盐车，抢 30 包盐回泉州黑市。', reward:{ silver:22, infamy:18 }, risk:'盐帮追杀', loc:'saltyard', target:'quanzhou' },
  { key:'q_wm_messenger', type:'bai', faction:null,        title:'送信海盗',desc:'给无名岛上的海盗头目送一封私人信件。', reward:{ silver:8, fame:-2 }, prereq:{}, loc:'wumingdao', target:'wumingdao' },
  { key:'q_wm_fight',     type:'hei', faction:null,        title:'夺岛',    desc:'帮一伙海匪攻占无名岛的海盗窝。', reward:{ silver:45, infamy:30 }, risk:'水师+海盗双重追杀', loc:'wumingdao', target:'haidao', combat:true },
  { key:'q_thd_lore',     type:'bai', faction:null,        title:'求师',    desc:'去桃花岛找黄老邪求一套入门功夫。', reward:{ silver:3, fame:5 }, prereq:{ req_fame:100 }, loc:'taohuadao', target:'taohuadao' },
  { key:'q_thd_boat',     type:'bai', faction:null,        title:'借船',    desc:'帮一个商人向黄老邪借船去泉州。', reward:{ silver:12, fame:4 }, prereq:{}, loc:'taohuadao', target:'quanzhou' },
  { key:'q_hd_raid',      type:'hei', faction:null,        title:'劫海盗',  desc:'突袭海盗窝，抢他们的宝藏回泉州。', reward:{ silver:50, infamy:25 }, risk:'海盗追杀', loc:'haidao', target:'quanzhou', combat:true },
  { key:'q_pier_guide',   type:'bai', faction:null,        title:'带路',    desc:'在码头给一个第一次下海的商队带路出海。', reward:{ silver:7, fame:2 }, prereq:{}, loc:'pier', target:'seaway' },
  { key:'q_seaway_rescue',type:'bai', faction:null,        title:'救落水',  desc:'海路上有人落水，去把他救起来。', reward:{ silver:15, fame:10 }, prereq:{}, loc:'seaway', target:'pier' },

  // —— 北荒域补齐（全缺！雁门关/铁掌峰/慕容/长白山/雪原/铁掌分舵/北荒小镇）——
  { key:'q_ym_pass',      type:'bai', faction:null,        title:'过关文书',desc:'帮一个商人把通关文书交给雁门关守将。', reward:{ silver:4, fame:2 }, prereq:{}, loc:'yanmen', target:'yanmen' },
  { key:'q_ym_blockade',  type:'hei', faction:'qinglong',    title:'劫粮',    desc:'在雁门关道上劫一批军粮。', reward:{ silver:38, infamy:22 }, risk:'朝廷通缉+铁掌帮追杀', loc:'yanmen', target:'yanmen', combat:true },
  { key:'q_tz_challenge', type:'bai', faction:'tiezhang',  title:'挑战掌力',desc:'铁掌峰上裘千仞要你接他三掌。', reward:{ silver:10, fame:10 }, prereq:{ rep:{tiezhang:20} }, loc:'tiezhang', target:'tiezhang', combat:true },
  { key:'q_tz_training',  type:'bai', faction:'tiezhang',  title:'练掌',    desc:'帮铁掌帮弟子代师传艺三天。', reward:{ silver:6, fame:4 }, prereq:{}, loc:'tiezhang', target:'tiezhang' },
  { key:'q_mr_find',      type:'bai', faction:null,        title:'找斗谱',  desc:'慕容旧宅里据说有失传的斗谱，去找找。', reward:{ silver:25, fame:12 }, prereq:{ req_fame:150 }, loc:'murong', target:'murong' },
  { key:'q_mr_assassin',  type:'hei', faction:null,        title:'杀慕容',  desc:'有人要灭慕容家口，进去杀掉慕容复。', reward:{ silver:60, infamy:35 }, risk:'江湖公愤', loc:'murong', target:'murong', combat:true },
  { key:'q_cb_hunt',      type:'bai', faction:null,        title:'猎异兽',  desc:'长白山最近出现异兽踪迹，去猎一只来。', reward:{ silver:18, fame:8 }, prereq:{}, loc:'changbai', target:'changbai', combat:true },
  { key:'q_snow_guide',   type:'bai', faction:null,        title:'雪地带路',desc:'在雪原给一队迷路的商人带路到铁掌峰。', reward:{ silver:14, fame:6 }, prereq:{}, loc:'snowfield', target:'tiezhang' },
  { key:'q_tzf_bribe',    type:'hei', faction:'qinglong',    title:'贿赂分舵',desc:'给铁掌帮分舵送 30 两银子，买一条私盐通道。', reward:{ silver:22, infamy:10 }, risk:'铁掌帮翻脸', loc:'tiezhang_fengduo', target:'tiezhang_fengduo' },
  { key:'q_bht_trade',    type:'bai', faction:null,        title:'跑商',    desc:'在北荒小镇帮商户跑一趟铁掌峰的商路。', reward:{ silver:12, fame:5 }, prereq:{}, loc:'beihuang_town', target:'tiezhang' },

  // ===== 20 门派掌门考验（特技前置任务，完成后才能学门派绝学）=====
  // 规则：必须在门派所在地、声望≥280 才能接
  { key:'q_chk_shaolin',  type:'bai', faction:'shaolin',    title:'少林·七十二绝技考验', desc:'玄慈方丈让你闯过罗汉堂十八铜人阵，证明你配学易筋经。', reward:{ silver:0, fame:20 }, prereq:{ rep:{shaolin:280} }, loc:'shaolin',      target:'shaolin',      combat:true },
  { key:'q_chk_wudang',   type:'bai', faction:'wudang',     title:'武当·太极奥义考验',   desc:'冲虚道长让你以柔克刚，接他十招不倒下。', reward:{ silver:0, fame:20 }, prereq:{ rep:{wudang:280} }, loc:'wudang',       target:'wudang',       combat:true },
  { key:'q_chk_gaibang',  type:'bai', faction:'gaibang',    title:'丐帮·帮主传承考验',   desc:'裘老帮主考验你是否配当帮主，接他三掌不倒下。', reward:{ silver:0, fame:20 }, prereq:{ rep:{gaibang:280} }, loc:'gaibang',      target:'gaibang',      combat:true },
  { key:'q_chk_huashan',  type:'bai', faction:'huashan',    title:'华山·独孤九剑考验',   desc:'岳不群让你破掉他的剑阵，才能学独孤九剑。', reward:{ silver:0, fame:20 }, prereq:{ rep:{huashan:280} }, loc:'huashan',      target:'huashan',      combat:true },
  { key:'q_chk_emei',     type:'bai', faction:'emei',       title:'峨眉·九阴真经考验',   desc:'灭绝师太用倚天剑考验你，接她七招。', reward:{ silver:0, fame:20 }, prereq:{ rep:{emei:280} }, loc:'emei',         target:'emei',         combat:true },
  { key:'q_chk_kunlun',   type:'bai', faction:'kunlun',     title:'昆仑·掌门考验',       desc:'何太冲让你接住他的昆仑闪电手，才能学昆仑绝学。', reward:{ silver:0, fame:20 }, prereq:{ rep:{kunlun:280} }, loc:'kunlun',       target:'kunlun',       combat:true },
  { key:'q_chk_tianshan', type:'bai', faction:'tianshan',   title:'天山·童姥考验',       desc:'天山童姥让你接她一掌白虹掌力，不倒就算过。', reward:{ silver:0, fame:20 }, prereq:{ rep:{tianshan:280} }, loc:'tianshan_peak',target:'tianshan_peak',combat:true },
  { key:'q_chk_mingjiao', type:'bai', faction:'mingjiao',   title:'明教·圣火令考验',     desc:'杨逍让你扛住他的乾坤大挪移反弹，才能得圣火令法。', reward:{ silver:0, fame:20 }, prereq:{ rep:{mingjiao:280} }, loc:'guangmingding',target:'guangmingding',combat:true },
  { key:'q_chk_diancang', type:'bai', faction:'diancang',   title:'点苍·一指禅考验',     desc:'点苍掌门考验你内功，接他一指禅不倒。', reward:{ silver:0, fame:20 }, prereq:{ rep:{diancang:280} }, loc:'diancang',     target:'diancang',     combat:true },
  { key:'q_chk_tangmen',  type:'bai', faction:'tangmen',    title:'唐门·暴雨梨花针考验', desc:'唐老太爷让你躲过他的暴雨梨花针，才能学。', reward:{ silver:0, fame:20 }, prereq:{ rep:{tangmen:280} }, loc:'tangmen',      target:'tangmen',      combat:true },
  { key:'q_chk_wudu',    type:'hei', faction:'wudu',       title:'五毒·万蛊噬心考验',   desc:'蓝凤凰让你活过她的万蛊噬心，才能学五毒绝学。', reward:{ silver:0, infamy:20 }, prereq:{ rep:{wudu:280} }, loc:'wudu',         target:'wudu',         combat:true },
  { key:'q_chk_duanshi',  type:'bai', faction:'duanshi',    title:'段氏·六脉神剑考验',   desc:'段正明让你接他一阳指不倒下，才能学六脉神剑。', reward:{ silver:0, fame:20 }, prereq:{ rep:{duanshi:280} }, loc:'dali',         target:'dali',         combat:true },
  { key:'q_chk_taohua',   type:'bai', faction:'taohua',     title:'桃花岛·弹指神通考验', desc:'黄老邪让你接住他的弹指神通，才能学。', reward:{ silver:0, fame:20 }, prereq:{ rep:{taohua:280} }, loc:'taohuadao',    target:'taohuadao',    combat:true },
  { key:'q_chk_haidao',   type:'hei', faction:'haidao',     title:'海盗·血海屠岛考验',   desc:'海匪头子让你杀过他的手下百人，才能学海盗绝学。', reward:{ silver:0, infamy:20 }, prereq:{ rep:{haidao:280} }, loc:'haidao',       target:'haidao',       combat:true },
  { key:'q_chk_salt',     type:'bai', faction:'salt',       title:'盐帮·镇帮功考验',     desc:'钱掌柜让你扛住盐车压，才能学盐帮镇帮功。', reward:{ silver:0, fame:20 }, prereq:{ rep:{salt:280} }, loc:'quanzhou',     target:'quanzhou',     combat:true },
  { key:'q_chk_tiezhang', type:'bai', faction:'tiezhang',   title:'铁掌帮·铁掌考验',     desc:'裘千仞让你接他三掌铁掌不倒，才能学铁掌·裂。', reward:{ silver:0, fame:20 }, prereq:{ rep:{tiezhang:280} }, loc:'tiezhang',     target:'tiezhang',     combat:true },
  { key:'q_chk_murong',   type:'bai', faction:'murong',     title:'慕容·斗转星移考验',   desc:'慕容复用斗转星移反弹你的攻击，你必须接住。', reward:{ silver:0, fame:20 }, prereq:{ rep:{murong:280} }, loc:'murong',       target:'murong',       combat:true },
  { key:'q_chk_qinglong', type:'hei', faction:'qinglong',   title:'青龙会·龙头考验',     desc:'青龙会龙头让你过五关杀六将，才能学青龙令。', reward:{ silver:0, infamy:20 }, prereq:{ rep:{qinglong:280} }, loc:'luoyang',      target:'luoyang',      combat:true },
  { key:'q_chk_qianjin',  type:'hei', faction:'qianjin',    title:'金钱帮·乾坤一掷考验', desc:'金钱帮帮主让你接住他的乾坤一掷，才能学。', reward:{ silver:0, infamy:20 }, prereq:{ rep:{qianjin:280} }, loc:'yanyang',      target:'yanyang',      combat:true },
  { key:'q_chk_nangong',  type:'bai', faction:'nan_gong',   title:'南宫·玄冰真气考验',   desc:'南宫老爷子让你扛住玄冰真气，才能学家传绝学。', reward:{ silver:0, fame:20 }, prereq:{ rep:{nan_gong:280} }, loc:'xiangyang',    target:'xiangyang',    combat:true },
];

// ===== 四条火线 =====
const EVENTS = [
  { id:'e_zhengdao', name:'正道分裂', desc:'少林与武当争主持，丐帮帮主年老压不住场子。触发：玩家完成少林→武当送信。' },
  { id:'e_mingjiao', name:'魔教复兴', desc:'明教新教主暗中收买中原门派。触发：玩家名望≥略有耳闻在西域遇接头人。' },
  { id:'e_qinglong', name:'青龙会浮出水面', desc:'各城出现拍卖会邀请函，拍卖失传秘籍。触发：名望≥小有名气玩家随机收到。' },
  { id:'e_tangmen_wudu', name:'唐门五毒之战', desc:'旧案翻起，两边招人。触发：玩家在唐门或五毒接关系≥40的任务。' },
];

// ===== LLM 人设卡模板（精简版，NPC 名与 npc_core 表一致）=====
const PERSONA_TEMPLATES = {
  // 正派
  shaolin_chief:   '你是少林长老慧远，德高望重、稳重、护短、爱惜人才。说话客气但有分寸，不会透露少林内部派系斗争细节。如果对方帮过你（关系≥40），你会暗示一些内部问题。',
  wudang_chief:    '你是武当长老玄正道长，说话温和，话里有话，太极思维——每件事都不只一个答案。你不会直接说武当与少林的矛盾，但会用"少林近来也有难处"这种话暗示。',
  gaibang_chief:   '你是丐帮帮主张飞，豹头环眼、粗中有细，最近嫌自己太老了压不住场子。你担心帮内继承问题，净衣污衣之争让你头疼。你愿意帮年轻人，但不敢得罪任何一派。',
  gaibang_follower:'你是丐帮弟子狗剩，嬉皮笑脸，什么八卦都想知道，也什么都敢往外说。',
  // 反派
  mingjiao_shengzi:'你是明教圣子，摩尼教圣子，神秘威严，多智近妖。说话直接但带刺。你只在确认对方立场后才会透露明教的事。如果对方答应帮你传消息，你会给他好处但也记他一笔。',
  qinglong:        '你是青龙会的人。说话永远留一半，你说的每句话都不能直接相信。你从不露真容（用"戴着斗笠"、"声音沙哑"这种描述）。',
  tiezhang_bangzhu:'你是铁掌帮帮主，硬功宗师，好胜心极强，想洗白自己的名声。你愿意给有潜力的年轻人机会，但代价是年轻人必须为你办事。',
  murong_shizi:    '你是慕容世子，博闻强记、心思深沉，一心想光复家族基业。你会试探对方有没有复国之心，有就拉拢，没有就看不起。',
};

// ===== 执行初始化 =====
function init() {
  console.log('[seed] 清空旧状态...');
  db.prepare('DELETE FROM player_quests').run();
  db.prepare('DELETE FROM event_state').run();
  db.prepare('DELETE FROM event_contrib').run();

  // 全量 RPG 数据：30核心NPC/42节点/46商店/20势力/604招/22野怪/装备/药品/材料/物资/
  // 生活技能/采集点/配方/任务(去金庸化+reward_exp)/门派等级/门派武器
  // 注意：QUESTS 直接传入，避开 seed↔rpg_seed 循环 require
  require('./rpg_seed').seedRpgData(QUESTS);

  // 次级 NPC（守卫+弟子+路人）
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

  console.log(`[seed] 完成。次级 NPC ${secs.length} 个`);
}

// 先导出再 init：rpg_seed 内部 require('./seed') 才能拿到完整 exports（含 QUESTS）
module.exports = { init, QUESTS, EVENTS, PERSONA_TEMPLATES };

if (require.main === module) {
  init();
}