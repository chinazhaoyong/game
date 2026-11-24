'use strict';
// —— RPG 系统种子：把 plan 二~八节数据全部落库 ——
const { db } = require('./db');
const { NODES, FACTIONS } = require('./content');
const D = require('./rpg_data');
const { buildAll, RANK, REP, QST } = require('./rpg_moves');
const now = () => Date.now();
// quest 里无效的旧 loc/target → 真实节点
const LOC_FIX = { taohua:'taohuadao', qianjin:'yanyang', salt:'quanzhou', xiyu:'dunhuang', kunming:'chengdu', kaifeng:'luoyang', jiangnan:'yanyang' };

// ===== 去金庸化替换表（人名/武功名/势力名 → 历史/公有领域口径）=====
// 顺序敏感：长名在前
const RENAMES = [
  ['倚天剑','峨眉镇派剑'],['易筋经','少林真经'],
  ['玄慈方丈','慧远方丈'],['玄慈','慧远'],['冲虚道长','玄正道长'],['冲虚','玄正'],
  ['段正明','段氏世子'],['段正淳','老王爷'],['段誉','世子大弟子'],['段王爷','段氏'],
  ['慕容博','慕容家主'],['慕容复','慕容世子'],
  ['黄老邪','崆峒岛主'],['黄蓉','大小姐'],['郭靖','大侠'],['郭襄','大小姐'],
  ['灭绝师太','清照掌门'],['灭绝','清照'],['周芷若','大弟子'],['张无忌','圣子'],
  ['杨逍','圣子'],['韦一笑','火工'],['阳顶天','前任教主'],['五散人','长老'],
  ['童姥','天山老道'],['李秋水','前掌门'],
  ['何太冲','昆仑掌教'],['班淑娴','青崖弟子'],['宋远桥','玄正长老'],['丁敏君','大弟子'],
  ['封不平','剑宗长老'],['岳不群','掌门'],['风清扬','隐世前辈'],
  ['裘千仞','铁掌帮主'],['裘老帮主','老帮主'],
  ['九阴真经下卷','崆峒镇派剑谱'],['九阴真经','崆峒镇派剑谱'],['九阴白骨爪','摧心掌·真'],
  ['六脉神剑真谱','段氏镇派剑谱'],['六脉神剑','段氏镇派剑'],['一阳指','段氏指法'],
  ['独孤九剑剑谱','华山镇派剑谱'],['独孤九剑','华山镇派剑'],['紫霞神功','紫阳神功'],['紫霞神剑','华山镇派剑'],
  ['君子剑','青锋剑'],['淑女剑','青竹剑'],['真武大帝佩剑','武当镇派剑'],['真武剑','太极剑谱'],
  ['折梅剑','天山梅步剑'],['血海屠岛斧','血海夺岛斧'],['血海屠岛','血海夺岛'],
  ['金蚕蛊珠','镇教毒珠'],['暴雨梨花针真套','唐门镇派针真套'],['暴雨梨花针','唐门镇派针'],
  ['落英神剑掌','惊雷掌'],['弹指神通','崆峒镇派剑'],
  ['乾坤一掷','白莲镇教扇'],['乾坤大挪移','圣火神功'],['乾坤反弹','圣火反弹'],['乾坤',''],
  ['白虹掌力','昆仑寒阳掌'],['白虹掌','昆仑寒阳掌'],['白虹剑','昆仑寒阳剑'],
  ['八荒六合功','天山纯阳功'],['八荒六合','天山纯阳'],
  ['斗转星移','慕容身法'],['降龙十八掌','降魔神拳'],['降龙掌','降魔神拳'],['降龙棒','降魔神棒'],
  ['金顶绵掌','金顶禅功'],['72绝技','七十二绝技'],
  ['桃花岛','崆峒岛'],['光明顶','圣火峰'],
  ['六大门派围攻','群雄围攻'],['六大门派','各派'],
];
function deJY(s) {
  if (!s) return s;
  for (const [a, b] of RENAMES) s = s.split(a).join(b);
  return s;
}

// ===== 30 核心 NPC（历史名人/公有领域，替换全部金庸角色）=====
const CORE_NPCS = [
  { id:'n_qs_laozhou', name:'老周', faction:'', personality:'和气生财、见多识广', location:'qingshi', role:'客栈老板', llm:1, hp:25, style:'none', fame:5 },
  { id:'n_qs_wang', name:'王铁匠', faction:'', personality:'豪爽、手艺好', location:'qingshi', role:'铁匠', llm:1, hp:30, style:'none', fame:8 },
  { id:'n_qs_li', name:'李捕头', faction:'', personality:'精明干练、官威十足', location:'qingshi', role:'捕快', llm:1, hp:45, style:'gang', fame:20 },
  { id:'n_ly_zhanzhao', name:'展昭', faction:'', personality:'忠义、沉稳、武功超群', location:'luoyang', role:'御前四品带刀护卫', llm:1, hp:70, style:'gang', fame:120 },
  { id:'n_ly_baiyutang', name:'白玉堂', faction:'', personality:'桀、潇洒、盗帅风度', location:'luoyang', role:'锦毛鼠·盗帅', llm:1, hp:65, style:'qiao', fame:100 },
  { id:'n_ly_jingke', name:'荆轲', faction:'', personality:'慷慨悲歌、燕国刺客隐于市', location:'luoyang', role:'隐士剑客', llm:1, hp:70, style:'gang', fame:110 },
  { id:'n_ly_zhuanzhu', name:'专诸', faction:'', personality:'隐忍、厨师兼剑客', location:'luoyang', role:'厨侠', llm:1, hp:60, style:'gang', fame:90 },
  { id:'n_ly_song', name:'宋三郎', faction:'', personality:'消息灵通、见钱眼开', location:'luoyang', role:'消息贩子', llm:1, hp:20, style:'none', fame:15 },
  { id:'n_xy_niugao', name:'牛皋', faction:'', personality:'粗豪直率、武校教头', location:'xiangyang', role:'武校教头', llm:1, hp:65, style:'gang', fame:80 },
  { id:'n_xy_hongsi', name:'洪四', faction:'', personality:'嘴皮子利索、说书人', location:'xiangyang', role:'说书人', llm:1, hp:18, style:'none', fame:10 },
  { id:'n_sl_huiyuan', name:'慧远', faction:'shaolin', personality:'德高望重、少林长老', location:'shaolin', role:'少林长老', llm:1, hp:80, style:'nei', fame:150 },
  { id:'n_sl_zhizhen', name:'志臻小僧', faction:'shaolin', personality:'勤勉、扫地杂役', location:'shaolin', role:'杂役', llm:0, hp:15, style:'none', fame:5 },
  { id:'n_wd_xuanzheng', name:'玄正道长', faction:'wudang', personality:'温和有城府、太极思维', location:'wudang', role:'武当长老', llm:1, hp:78, style:'nei', fame:150 },
  { id:'n_wd_qingsong', name:'青松道童', faction:'wudang', personality:'机灵、杂役', location:'wudang', role:'道童', llm:0, hp:15, style:'none', fame:5 },
  { id:'n_hs_libai', name:'李柏悦', faction:'huashan', personality:'巾帼掌门、剑法凌厉', location:'huashan', role:'掌门', llm:1, hp:72, style:'qiao', fame:120 },
  { id:'n_hs_guhengbo', name:'顾横波', faction:'huashan', personality:'才情出众、剑宗传人', location:'huashan', role:'剑宗传人', llm:1, hp:66, style:'qiao', fame:100 },
  { id:'n_em_liqingzhao', name:'李清照', faction:'emei', personality:'词宗掌门、金顶剑法传人', location:'emei', role:'掌门', llm:1, hp:74, style:'qiao', fame:130 },
  { id:'n_em_jingxuan', name:'静玄', faction:'emei', personality:'虔诚、小尼姑', location:'emei', role:'弟子', llm:1, hp:35, style:'nei', fame:30 },
  { id:'n_gb_zhangfei', name:'张飞', faction:'gaibang', personality:'豹头环眼、粗中有细', location:'gaibang', role:'帮主', llm:1, hp:85, style:'gang', fame:140 },
  { id:'n_gb_gousheng', name:'狗剩', faction:'gaibang', personality:'嬉皮笑脸、叫花子', location:'gaibang', role:'弟子', llm:0, hp:20, style:'none', fame:5 },
  { id:'n_dh_banchao', name:'班超', faction:'', personality:'西域都护府老兵、刀法老辣', location:'dunhuang', role:'老兵', llm:1, hp:68, style:'gang', fame:90 },
  { id:'n_dh_zhangqian', name:'张骞', faction:'', personality:'通西域的商队首领', location:'dunhuang', role:'商队首领', llm:1, hp:30, style:'none', fame:20 },
  { id:'n_mj_shengzi', name:'明教圣子', faction:'mingjiao', personality:'摩尼教圣子、神秘威严', location:'guangmingding', role:'圣子', llm:1, hp:78, style:'nei', fame:130 },
  { id:'n_mj_huogong', name:'火工', faction:'mingjiao', personality:'沉默、教众', location:'guangmingding', role:'教众', llm:0, hp:40, style:'none', fame:20 },
  { id:'n_ts_laodao', name:'天山老道', faction:'tianshan', personality:'清冷、天山掌门', location:'tianshan_peak', role:'掌门', llm:1, hp:78, style:'nei', fame:130 },
  { id:'n_ts_xuemei', name:'雪梅', faction:'tianshan', personality:'灵秀、弟子', location:'tianshan_peak', role:'弟子', llm:0, hp:38, style:'none', fame:20 },
  { id:'n_kl_zhangjiao', name:'昆仑掌教', faction:'kunlun', personality:'持重、昆仑剑主', location:'kunlun', role:'掌教', llm:1, hp:75, style:'nei', fame:130 },
  { id:'n_kl_qingya', name:'青崖', faction:'kunlun', personality:'剑性刚直、弟子', location:'kunlun', role:'弟子', llm:0, hp:42, style:'qiao', fame:20 },
  { id:'n_cd_tangmenzhu', name:'唐门门主', faction:'tangmen', personality:'阴沉老辣、机关暗器通神', location:'chengdu', role:'门主', llm:1, hp:72, style:'qiao', fame:130 },
  { id:'n_cd_yaopopo', name:'药婆婆', faction:'', personality:'慈祥老药师、毒理通晓', location:'chengdu', role:'老药师', llm:1, hp:35, style:'none', fame:40 },
  { id:'n_dl_shizi', name:'段氏世子', faction:'duanshi', personality:'温文、大理段氏传人', location:'dali', role:'世子', llm:1, hp:68, style:'nei', fame:120 },
  { id:'n_dl_chongsheng', name:'崇圣僧人', faction:'duanshi', personality:'虔诚武僧', location:'dali', role:'僧人', llm:1, hp:55, style:'nei', fame:60 },
  { id:'n_wd_jiaozhu', name:'五毒教主', faction:'wudu', personality:'妖娆狠辣、养蛊炼毒', location:'wudu', role:'教主', llm:1, hp:65, style:'qiao', fame:130 },
  { id:'n_wd_gutong', name:'蛊童', faction:'wudu', personality:'懵懂、小奴', location:'wudu', role:'小奴', llm:0, hp:22, style:'none', fame:15 },
  { id:'n_qz_yanbanguzhu', name:'盐帮帮主', faction:'salt', personality:'精明爱财、讲规矩', location:'quanzhou', role:'帮主', llm:1, hp:62, style:'gang', fame:120 },
  { id:'n_qz_agui', name:'码头阿贵', faction:'', personality:'豪爽水手', location:'quanzhou', role:'水手', llm:0, hp:35, style:'none', fame:10 },
  { id:'n_wm_duyanolong', name:'独眼龙', faction:'caobang', personality:'独眼海盗头目、嗜血', location:'wumingdao', role:'头目', llm:1, hp:70, style:'gang', fame:110 },
  { id:'n_wm_xiaoliu', name:'小六', faction:'caobang', personality:'机警、海盗喽啰', location:'wumingdao', role:'喽啰', llm:0, hp:32, style:'none', fame:10 },
  { id:'n_tz_bangzhu', name:'铁掌帮主', faction:'tiezhang', personality:'硬功宗师、好胜', location:'tiezhang', role:'帮主', llm:1, hp:80, style:'gang', fame:130 },
  { id:'n_tz_shipo', name:'石破', faction:'tiezhang', personality:'憨厚、铁掌帮二当家', location:'tiezhang', role:'二当家', llm:1, hp:60, style:'gang', fame:80 },
  { id:'n_mr_shizi', name:'慕容世子', faction:'murong', personality:'博闻强记、心思深沉', location:'murong', role:'世子', llm:1, hp:66, style:'qiao', fame:120 },
  { id:'n_mr_laopu', name:'琅琊老仆', faction:'murong', personality:'忠心老仆', location:'murong', role:'老仆', llm:0, hp:25, style:'none', fame:20 },
  { id:'n_yy_shisanmei', name:'十三妹', faction:'', personality:'儿女英雄传侠女、仗义', location:'yanyang', role:'侠女', llm:1, hp:68, style:'qiao', fame:110 },
  { id:'n_yy_huangtianhua', name:'黄天化', faction:'', personality:'三侠五义侠士、热血', location:'yanyang', role:'侠士', llm:1, hp:64, style:'gang', fame:90 },
  { id:'n_bh_liguang', name:'李广', faction:'', personality:'飞将军、边关守将', location:'beihuang_town', role:'守将', llm:1, hp:85, style:'gang', fame:140 },
  { id:'n_bh_huoqubing', name:'霍去病', faction:'', personality:'年轻校尉、神速善战', location:'beihuang_town', role:'校尉', llm:1, hp:78, style:'gang', fame:120 },
  { id:'n_ym_qinquan', name:'秦琼', faction:'', personality:'瓦岗旧将、义气深重', location:'yanmen', role:'守将', llm:1, hp:82, style:'gang', fame:130 },
  { id:'n_ym_yuchi', name:'尉迟恭', faction:'', personality:'黑脸武将、双鞭无敌', location:'yanmen', role:'武将', llm:1, hp:80, style:'gang', fame:120 },
  { id:'n_ql_leader', name:'青龙会龙头', faction:'qinglong', personality:'神秘、不露真容、掌控全局', location:'qingshi', role:'龙头', llm:1, hp:75, style:'nei', fame:300 },
  { id:'n_bl_bangzhu', name:'白莲教教主', faction:'bailian', personality:'传教狂热、深藏不露', location:'yanyang', role:'教主', llm:1, hp:55, style:'nei', fame:130 },
  { id:'n_ng_laoye', name:'南宫老爷子', faction:'nan_gong', personality:'老谋深算、爱下棋', location:'xiangyang', role:'家主', llm:1, hp:50, style:'nei', fame:150 },
];

// ===== 商店 46 家（门派武馆 teach 用真实 s1 key）=====
// [id,node_id,name,price_rate,items,teach,inn,teahouse,black,auction,gambling,info]
const SHOPS = [
  ['shop_qingshi_grocery','qingshi','杂货铺',1.0,['mantou','shaoji','siyan','herb'],0,0,0,0,0,0,0],
  ['shop_qingshi_med','qingshi','药铺',1.0,['jincang_yao','hui_qi_san','jie_du_san'],0,0,0,0,0,0,0],
  ['shop_qingshi_iron','qingshi','铁匠铺',1.0,['tiejian','buyi'],0,0,0,0,0,0,0],
  ['shop_qingshi_wuguan','qingshi','武馆',1.0,['mp01','mp02','mp03','mp04'],1,0,0,0,0,0,0],
  ['shop_qingshi_innt','qingshi','客栈',1.0,[],0,1,0,0,0,0,0],
  ['shop_qingshi_teahouse','qingshi','茶馆',1.0,[],0,0,1,0,0,0,0],
  ['shop_luoyang_auction','luoyang','拍卖行',1.0,[],0,0,0,0,1,0,0],
  ['shop_luoyang_bingqi','luoyang','兵器铺',1.2,['jinggang_jian','pijia','qinggang_jian'],0,0,0,0,0,0,0],
  ['shop_luoyang_cloth','luoyang','绸缎庄',1.2,['silk'],0,0,0,0,0,0,0],
  ['shop_luoyang_innt','luoyang','悦来客栈',1.2,[],0,1,0,0,0,0,0],
  ['shop_luoyang_gambling','luoyang','赌坊',1.0,[],0,0,0,0,0,1,0],
  ['shop_yangzhou_black','luoyang_black','黑市',1.5,['duyao','miyan','weizhao'],0,0,0,1,0,0,0],
  ['shop_yangzhou_salt','quanzhou','盐号',0.8,['siyan'],0,0,0,0,0,0,0],
  ['shop_yangzhou_info','yanyang','消息铺',1.0,[],0,0,0,0,0,0,1],
  ['shop_dunhuang','dunhuang','西域集市',1.3,['mantou','shaoji','tiejian','herb'],0,0,0,0,0,0,0],
  ['shop_chengdu','chengdu','蜀地药铺',0.9,['jie_du_san','herb','jincang_yao'],0,0,0,0,0,0,0],
  ['shop_tangmen','tangmen','唐门暗器铺',1.1,['duyao','miyan'],0,0,0,0,0,0,0],
  ['shop_quanzhou','quanzhou','泉州海港铺',1.0,['mantou','shaoji','silk','siyan'],0,0,0,0,0,0,0],
  ['shop_beihuang','beihuang_town','边关集市',1.4,['buyi','pijia','herb'],0,0,0,0,0,0,0],
  ['shop_shaolin_wuguan','shaolin','少林武馆',1.0,['shaolin_s1_l1','shaolin_s1_l4','shaolin_s1_l3'],1,0,0,0,0,0,0],
  ['shop_wudang_wuguan','wudang','武当紫霄宫',1.0,['wudang_s1_l1','wudang_s1_l3','wudang_s1_l4'],1,0,0,0,0,0,0],
  ['shop_gaibang_wuguan','gaibang','丐帮分舵',1.0,['gaibang_s1_l1','gaibang_s1_l4','gaibang_s1_l3'],1,0,0,0,0,0,0],
  ['shop_huashan_wuguan','huashan','华山剑派',1.0,['huashan_s1_l1','huashan_s1_l4','huashan_s1_l2'],1,0,0,0,0,0,0],
  ['shop_emei_wuguan','emei','峨眉金顶',1.0,['emei_s1_l1','emei_s1_l4','emei_s1_l2'],1,0,0,0,0,0,0],
  ['shop_mingjiao_wuguan','guangmingding','明教圣火峰',1.0,['mingjiao_s1_l1','mingjiao_s1_l4','mingjiao_s1_l2'],1,0,0,0,0,0,0],
  ['shop_tianshan_wuguan','tianshan_peak','天山派',1.0,['tianshan_s1_l1','tianshan_s1_l4','tianshan_s1_l2'],1,0,0,0,0,0,0],
  ['shop_kunlun_wuguan','kunlun','昆仑派',1.0,['kunlun_s1_l1','kunlun_s1_l4','kunlun_s1_l2'],1,0,0,0,0,0,0],
  ['shop_diancang_wuguan','diancang','点苍山',1.0,['diancang_s1_l1','diancang_s1_l4','diancang_s1_l2'],1,0,0,0,0,0,0],
  ['shop_tangmen_wuguan','tangmen','唐门堡',1.0,['tangmen_s1_l1','tangmen_s1_l4','tangmen_s1_l2'],1,0,0,0,0,0,0],
  ['shop_wudu_wuguan','wudu','五毒谷',1.0,['wudu_s1_l1','wudu_s1_l4','wudu_s1_l2'],1,0,0,0,0,0,0],
  ['shop_duanshi_wuguan','dali','大理国武馆',1.0,['duanshi_s1_l1','duanshi_s1_l4','duanshi_s1_l2'],1,0,0,0,0,0,0],
  ['shop_kongtong_wuguan','taohuadao','崆峒岛',1.0,['kongtong_s1_l1','kongtong_s1_l4','kongtong_s1_l2'],1,0,0,0,0,0,0],
  ['shop_caobang_wuguan','haidao','漕帮码头',1.0,['caobang_s1_l1','caobang_s1_l4','caobang_s1_l2'],1,0,0,0,0,0,0],
  ['shop_salt_wuguan','quanzhou','盐帮武馆',1.0,['salt_s1_l1','salt_s1_l4','salt_s1_l2'],1,0,0,0,0,0,0],
  ['shop_tiezhang_wuguan','tiezhang','铁掌峰',1.0,['tiezhang_s1_l1','tiezhang_s1_l4','tiezhang_s1_l2'],1,0,0,0,0,0,0],
  ['shop_murong_wuguan','murong','慕容旧宅',1.0,['murong_s1_l1','murong_s1_l4','murong_s1_l2'],1,0,0,0,0,0,0],
  ['shop_qinglong_wuguan','luoyang','青龙会密室',1.0,['qinglong_s1_l1','qinglong_s1_l4','qinglong_s1_l2'],1,0,0,0,0,0,0],
  ['shop_bailian_wuguan','yanyang','白莲教密室',1.0,['bailian_s1_l1','bailian_s1_l4','bailian_s1_l2'],1,0,0,0,0,0,0],
  ['shop_nangong_wuguan','xiangyang','南宫家祠',1.0,['nan_gong_s1_l1','nan_gong_s1_l4','nan_gong_s1_l2'],1,0,0,0,0,0,0],
];

// ===== 20 势力 =====
function buildFactions() {
  const out = [];
  for (const [id, f] of Object.entries(FACTIONS)) {
    const nid = D.FAC_ID_MAP[id] || id;
    out.push({ id: nid, name: D.FAC_NAMES[nid] || f.name, domain: f.domain, color: f.color, desc: f.name + '，' + f.domain + '势力。' });
  }
  return out;
}

// ===== 42 节点（去金庸化显示名/描述）=====
function buildNodes() {
  const wild = new Set(D.MONSTERS.map(m => m[2]));
  const out = [];
  for (const n of Object.values(NODES)) {
    let name = deJY(n.name);
    let desc = deJY(n.desc);
    if (n.id === 'taohuadao') { name = '崆峒岛'; desc = '海上仙岛，崆峒派隐于此。岛上遍布奇门机关。'; }
    if (n.id === 'guangmingding') { name = '圣火峰'; desc = '明教总坛。山势陡峭，只有一条暗道能上。'; }
    if (n.id === 'haidao') { name = '海盗窝'; desc = '无名岛深处，海贼分赃议事的洞窟。'; }
    out.push({ id: n.id, domain: n.domain, name, desc, exits: JSON.stringify(n.exits || {}), is_wild: wild.has(n.id) ? 1 : 0 });
  }
  return out;
}

// ===== 武功 604 =====
function buildMoves() {
  const rows = buildAll();
  return rows.map(m => {
    const tier = m.tier || 's1';
    const e = m.e || {};
    const reqAttr = {};
    if (e.at) reqAttr[e.at] = e.av;
    if (e.at2) reqAttr[e.at2] = e.av2;
    return {
      key: m.key, name: m.n, type: m.t,
      counter: e.ct || null,
      damage: JSON.stringify(m.d || [0,0]),
      nei_cost: m.c || 0,
      faction: m.faction || null,
      req_rank: m.faction ? RANK[tier] : null,
      req_rep: m.faction ? REP[tier] : 0,
      req_quest: (m.faction && QST[tier]) ? QST[tier] + m.faction : null,
      req_attr: JSON.stringify(reqAttr),
      attr_bonus: e.ab ? JSON.stringify(e.ab) : '{}',
      special_key: e.sp || null,
      hp_bonus: e.hp || 0,
      max_nei: e.mn || 0,
      def_bonus: e.df || 0,
      heal: e.he || 0,
      x: e.x || 1,
      first: e.first ? 1 : 0,
      reflect: e.ref || 0,
      damage_bonus: e.db || 0,
      dodge_bonus: e.dg || 0,
      atk_bonus: e.atk || 0,
      desc: (m.faction ? '' : '通用招式。'),
      learn_cost: m.key.startsWith('mp0') ? 3 : ({ s1: 5, s2: 20, s3: 60, s4: 120, s5: 300, s6: 800, s7: 2000 }[tier] || 0),
    };
  });
}

// 任务定义在 seed.js —— 由 init() 直接传入，彻底避开 seed↔rpg_seed 循环 require

// ===== 门派武器（faction_items）改名 =====
const FACTION_WEAPONS = {
  shaolin: [
    ['shaolin_weap_outer','戒刀','weapon',6,null,'outer',30,null],
    ['shaolin_weap_inner','禅杖','weapon',9,null,'inner',150,null],
    ['shaolin_weap_core','金刚禅杖','weapon',13,null,'core',500,'掌门'],
    ['shaolin_weap_chief','达摩禅杖','weapon',19,null,'chief',0,'掌门亲赐'],
  ],
  wudang: [
    ['wudang_weap_outer','青锋剑','weapon',6.5,null,'outer',30,null],
    ['wudang_weap_inner','太极剑','weapon',10,null,'inner',150,null],
    ['wudang_weap_core','太极剑谱','weapon',13,null,'core',500,'掌门'],
    ['wudang_weap_chief','武当镇派剑','weapon',16,null,'chief',0,'掌门亲赐'],
  ],
  gaibang: [
    ['gaibang_weap_outer','铁杖','weapon',6,null,'outer',30,null],
    ['gaibang_weap_inner','绿竹杖','weapon',10,null,'inner',150,null],
    ['gaibang_weap_core','降魔神棒','weapon',13,null,'core',500,'帮主'],
    ['gaibang_weap_chief','打狗棒','weapon',16,null,'chief',0,'帮主信物'],
  ],
  huashan: [
    ['huashan_weap_outer','青锋剑','weapon',7.5,null,'outer',30,null],
    ['huashan_weap_inner','青竹剑','weapon',10,null,'inner',150,null],
    ['huashan_weap_core','紫阳神剑','weapon',13,null,'core',500,'掌门'],
    ['huashan_weap_chief','华山镇派剑','weapon',16,null,'chief',0,'隐世前辈真传'],
  ],
  emei: [
    ['emei_weap_outer','峨眉刺','weapon',6.5,null,'outer',30,null],
    ['emei_weap_inner','金顶刺','weapon',10,null,'inner',150,null],
    ['emei_weap_core','玄铁匕首','weapon',13,null,'core',500,'掌门'],
    ['emei_weap_chief','峨眉镇派剑','weapon',19,null,'chief',0,'掌门真传'],
  ],
  kunlun: [
    ['kunlun_weap_outer','两仪剑','weapon',6.5,null,'outer',30,null],
    ['kunlun_weap_inner','昆仑剑','weapon',10,null,'inner',150,null],
    ['kunlun_weap_core','昆仑寒阳剑','weapon',13,null,'core',500,'掌门'],
    ['kunlun_weap_chief','昆仑神剑','weapon',17.5,null,'chief',0,'掌门亲赐'],
  ],
  tianshan: [
    ['tianshan_weap_outer','天山剑','weapon',7.5,null,'outer',30,null],
    ['tianshan_weap_inner','天山梅步剑','weapon',10,null,'inner',150,null],
    ['tianshan_weap_core','天山纯阳剑','weapon',13,null,'core',500,'掌门'],
    ['tianshan_weap_chief','天山镇派剑','weapon',16,null,'chief',0,'掌门真传'],
  ],
  mingjiao: [
    ['mingjiao_weap_outer','圣火刀','weapon',7.5,null,'outer',30,null],
    ['mingjiao_weap_inner','圣火令','weapon',10,null,'inner',150,null],
    ['mingjiao_weap_core','圣火神功牌','weapon',13,null,'core',500,'圣子'],
    ['mingjiao_weap_chief','明教镇教刀','weapon',17.5,null,'chief',0,'圣火峰亲赐'],
  ],
  diancang: [
    ['diancang_weap_outer','点苍剑','weapon',6.5,null,'outer',30,null],
    ['diancang_weap_inner','点苍剑','weapon',10,null,'inner',150,null],
    ['diancang_weap_core','点苍剑谱','book',null,null,'core',500,'掌门'],
    ['diancang_weap_chief','点苍镇派剑','weapon',16,null,'chief',0,'掌门亲赐'],
  ],
  tangmen: [
    ['tangmen_weap_outer','铁镖','weapon',6,null,'outer',30,null],
    ['tangmen_weap_inner','梅花针筒','weapon',10,null,'inner',150,null],
    ['tangmen_weap_core','含沙射影镖','weapon',13,null,'core',500,'门主'],
    ['tangmen_weap_chief','唐门镇派针','weapon',17.5,null,'chief',0,'门主真传'],
  ],
  wudu: [
    ['wudu_weap_outer','蝎尾针','weapon',6,null,'outer',30,null],
    ['wudu_weap_inner','蜈蚣鞭','weapon',10,null,'inner',150,null],
    ['wudu_weap_core','五毒珠','weapon',13,null,'core',500,'教主'],
    ['wudu_weap_chief','五毒镇教鞭','weapon',17.5,null,'chief',0,'教主真传'],
  ],
  duanshi: [
    ['duanshi_weap_outer','段氏剑','weapon',7.5,null,'outer',30,null],
    ['duanshi_weap_inner','段氏指套','weapon',10,null,'inner',150,null],
    ['duanshi_weap_core','段氏剑谱','book',null,null,'core',500,'世子'],
    ['duanshi_weap_chief','段氏镇派剑','weapon',16,null,'chief',0,'世子真传'],
  ],
  kongtong: [
    ['kongtong_weap_outer','崆峒剑','weapon',6.5,null,'outer',30,null],
    ['kongtong_weap_inner','崆峒剑·精','weapon',10,null,'inner',150,null],
    ['kongtong_weap_core','崆峒剑典','book',null,null,'core',500,'岛主'],
    ['kongtong_weap_chief','崆峒镇派剑','weapon',16,null,'chief',0,'岛主真传'],
  ],
  caobang: [
    ['caobang_weap_outer','海盗刀','weapon',6.5,null,'outer',30,null],
    ['caobang_weap_inner','黑鲨刀','weapon',10,null,'inner',150,null],
    ['caobang_weap_core','血海夺岛斧','weapon',13,null,'core',500,'头目'],
    ['caobang_weap_chief','鬼牙刀','weapon',17.5,null,'chief',0,'海盗王真传'],
  ],
  salt: [
    ['salt_weap_outer','盐刀','weapon',5.5,null,'outer',30,null],
    ['salt_weap_outer2','盐镖','weapon',8,null,'inner',150,null],
    ['salt_weap_core','盐帮镇帮刀','weapon',11,null,'core',500,'帮主'],
    ['salt_weap_chief','盐帮镇帮刀','weapon',0,null,'chief',0,'帮主亲赐'],
  ],
  tiezhang: [
    ['tiezhang_weap_outer','铁掌套','weapon',7.5,null,'outer',30,null],
    ['tiezhang_weap_inner','铁掌套·精','weapon',10.5,null,'inner',150,null],
    ['tiezhang_weap_core','铁山靠','weapon',13,null,'core',500,'帮主'],
    ['tiezhang_weap_chief','铁镇镇派掌','weapon',null,null,'chief',0,'帮主真传'],
  ],
  murong: [
    ['murong_weap_outer','琅琊剑','weapon',7.5,null,'outer',30,null],
    ['murong_weap_inner','琅琊剑·精','weapon',10,null,'inner',150,null],
    ['murong_weap_core','慕容宝剑','weapon',13,null,'core',500,'世子'],
    ['murong_weap_chief','慕容镇家剑','weapon',null,null,'chief',0,'家主真传'],
  ],
  qinglong: [
    ['qinglong_weap_outer','青龙刀','weapon',7.5,null,'outer',30,null],
    ['qinglong_weap_inner','五湖刀','weapon',10,null,'inner',150,null],
    ['qinglong_weap_core','青龙令刀','weapon',13,null,'core',500,'龙头'],
    ['qinglong_weap_chief','青龙偃月刀','weapon',0,null,'chief',0,'龙头亲赐'],
  ],
  bailian: [
    ['bailian_weap_outer','白莲扇','weapon',6.5,null,'outer',30,null],
    ['bailian_weap_inner','白莲扇·精','weapon',10,null,'inner',150,null],
    ['bailian_weap_core','白莲镇教扇','weapon',13,null,'core',500,'教主'],
    ['bailian_weap_chief','金饭碗','weapon',0,null,'chief',0,'教主亲赐'],
  ],
  nan_gong: [
    ['nan_gong_weap_outer','南宫剑','weapon',6.5,null,'outer',30,null],
    ['nan_gong_weap_inner','南宫幻扇','weapon',10,null,'inner',150,null],
    ['nan_gong_weap_core','八卦阵剑','weapon',13,null,'core',500,'老爷子'],
    ['nan_gong_weap_chief','南宫镇家剑','weapon',17.5,null,'chief',0,'老爷子真传'],
  ],
};

function seedRpgData(quests) {
  console.log('[rpg_seed] 开始写入 RPG 数据...');
  const ins = (sql) => db.prepare(sql);

  // 特殊属性
  db.prepare('DELETE FROM special_effects').run();
  const iSE = ins('INSERT INTO special_effects (key,name,kind,value,rounds,chance,desc) VALUES (?,?,?,?,?,?,?)');
  for (const e of D.SPECIAL_EFFECTS) iSE.run(e.key, e.name, e.kind, e.value, e.rounds, e.chance, e.desc);

  // 装备
  db.prepare('DELETE FROM equipments').run();
  const iEQ = ins('INSERT INTO equipments (key,name,slot,type,atk,def,rarity,req_level,bonuses,special_key,price,desc) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  const RARITY_MULT = { '白':1, '绿':1.5, '蓝':2.5, '紫':5, '橙':10 };
  for (const [key,name,slot,type,atk,def,rarity,lv,bonuses,special,desc] of D.EQUIPMENTS) {
    const price = Math.round((atk + def) * 8 * (RARITY_MULT[rarity] || 1) * 10) / 10;
    iEQ.run(key, deJY(name), slot, type, atk, def, rarity, lv, bonuses, special, price, deJY(desc));
  }

  // 药品
  db.prepare('DELETE FROM medicines').run();
  const iMD = ins('INSERT INTO medicines (key,name,kind,heal,nei,cure,buff_key,buff_rounds,buff_def,buff_atk,buff_neicost,buff_undead,full_heal,price,rarity,desc) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  for (const [key,name,kind,heal,nei,cure,buff_key,buff_rounds,buff_def,buff_atk,buff_neicost,buff_undead,full_heal,price,rarity,desc] of D.MEDICINES)
    iMD.run(key,deJY(name),kind,heal,nei,cure,buff_key,buff_rounds,buff_def,buff_atk,buff_neicost,buff_undead,full_heal,price,rarity,deJY(desc));

  // 材料
  db.prepare('DELETE FROM materials').run();
  const iMA = ins('INSERT INTO materials (key,name,kind,rarity,price,desc) VALUES (?,?,?,?,?,?)');
  for (const [key,name,kind,rarity,price,desc] of D.MATERIALS) iMA.run(key,deJY(name),kind,rarity,price,deJY(desc));

  // 生活物资
  db.prepare('DELETE FROM life_goods').run();
  const iLG = ins('INSERT INTO life_goods (key,name,kind,heal,nei,full_heal,price,desc) VALUES (?,?,?,?,?,?,?,?)');
  for (const [key,name,kind,heal,nei,full_heal,price,desc] of D.LIFE_GOODS) iLG.run(key,deJY(name),kind,heal,nei,full_heal,price,deJY(desc));

  // 生活技能
  db.prepare('DELETE FROM life_skills').run();
  const iLS = ins('INSERT INTO life_skills (key,name,branch,tool_req,desc) VALUES (?,?,?,?,?)');
  for (const s of D.LIFE_SKILLS) iLS.run(s.key, s.name, s.branch, s.tool_req, s.desc);

  // 采集点
  db.prepare('DELETE FROM collecting_nodes').run();
  const iCN = ins('INSERT INTO collecting_nodes (id,node_id,skill_key,material_key,respawn_min) VALUES (?,?,?,?,?)');
  for (const [id,node,skill,mat,respawn] of D.COLLECTING_NODES) iCN.run(id,node,skill,mat,respawn);

  // 配方
  db.prepare('DELETE FROM recipes').run();
  const iRC = ins('INSERT INTO recipes (key,name,skill_key,level_req,inputs,output_key,output_type,count,success_rate,desc) VALUES (?,?,?,?,?,?,?,?,?,?)');
  for (const [key,name,skill,lv,inputs,out,outType,count,rate,desc] of D.RECIPES)
    iRC.run(key,name,skill,lv,JSON.stringify(inputs),out,outType,count,rate,desc);

  // 野怪
  db.prepare('DELETE FROM monsters').run();
  const iMO = ins('INSERT INTO monsters (key,name,node_id,level,hp,atk,def,exp,silver,style,drops,respawn_min,alive,killed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  for (const [key,name,node,lv,hp,atk,def,exp,silver,style,drops,respawn] of D.MONSTERS)
    iMO.run(key,name,node,lv,hp,atk,def,exp,silver,style,JSON.stringify(drops),respawn,1,0);

  // 节点
  db.prepare('DELETE FROM nodes').run();
  const iNO = ins('INSERT INTO nodes (id,domain,name,desc,exits,is_wild) VALUES (?,?,?,?,?,?)');
  for (const n of buildNodes()) iNO.run(n.id,n.domain,n.name,n.desc,n.exits,n.is_wild);

  // 商店
  db.prepare('DELETE FROM shops').run();
  const iSH = ins('INSERT INTO shops (id,node_id,name,price_rate,items,teach,inn,teahouse,black,auction,gambling,info) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  for (const s of SHOPS) iSH.run(s[0],s[1],deJY(s[2]),s[3],JSON.stringify(s[4]),s[5],s[6],s[7],s[8],s[9],s[10],s[11]);

  // 势力
  db.prepare('DELETE FROM factions').run();
  const iFA = ins('INSERT INTO factions (id,name,domain,color,desc) VALUES (?,?,?,?,?)');
  for (const f of buildFactions()) iFA.run(f.id,f.name,f.domain,f.color,f.desc);

  // 武功 604
  db.prepare('DELETE FROM moves').run();
  const iMV = ins('INSERT INTO moves (key,name,type,counter,damage,nei_cost,faction,req_rank,req_rep,req_quest,req_attr,attr_bonus,special_key,hp_bonus,max_nei,def_bonus,heal,x,first,reflect,damage_bonus,dodge_bonus,learn_cost,desc) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const moves = buildMoves();
  for (const m of moves)
    iMV.run(m.key,m.name,m.type,m.counter,m.damage,m.nei_cost,m.faction,m.req_rank,m.req_rep,m.req_quest,m.req_attr,m.attr_bonus,m.special_key,m.hp_bonus,m.max_nei,m.def_bonus,m.heal,m.x,m.first,m.reflect,m.damage_bonus,m.dodge_bonus,m.learn_cost,m.desc);

  // 核心 NPC 替换
  db.prepare('DELETE FROM npc_core').run();
  const iNP = ins('INSERT INTO npc_core (id,name,faction,personality,location_id,hp,combat_style,fame,llm_enabled,is_core,role,level,atk,def,drops) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  for (const n of CORE_NPCS) {
    const lvl = Math.max(5, Math.min(60, Math.round(n.fame / 4) + 5));
    const atk = n.style === 'none' ? 0 : 5 + lvl * 1.2;
    const def = n.style === 'none' ? 0 : 2 + Math.round(lvl / 3);
    iNP.run(n.id, deJY(n.name), n.faction || '', deJY(n.personality), n.location, n.hp, n.style, n.fame, n.llm || 0, 1, n.role, lvl, atk, def, '[]');
  }

  // 任务：QUESTS 由 seed.js init() 传入，去金庸化 + 改名 key/faction + reward_exp + 修无效 loc
  const QUESTS = quests;
  if (!Array.isArray(QUESTS)) throw new Error('QUESTS 未传入');
  db.prepare('DELETE FROM quests').run();
  const iQ = ins('INSERT OR REPLACE INTO quests (key,type,faction,title,desc,reward_silver,reward_fame,reward_infamy,prerep_json,req_fame,loc,target,combat,risk,reward_exp) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const keyRenames = { taohua:'kongtong', haidao:'caobang', qianjin:'bailian' };
  const fixLoc = (loc) => (loc && LOC_FIX[loc] ? LOC_FIX[loc] : loc);
  let qCount = 0;
  for (const q of QUESTS) {
    let key = q.key;
    let fid = q.faction;
    if (fid && keyRenames[fid]) fid = keyRenames[fid];
    // key 里旧 faction 前缀
    for (const [old, nw] of Object.entries(keyRenames)) {
      key = key.split(old).join(nw);
    }
    // prereq rep 里的 faction
    let prerep = q.prereq && q.prereq.rep ? { ...q.prereq.rep } : {};
    for (const [old, nw] of Object.entries(keyRenames)) {
      if (prerep[old] != null) { prerep[nw] = prerep[old]; delete prerep[old]; }
    }
    const desc = deJY(q.desc);
    const title = deJY(q.title);
    // reward_exp
    let rex;
    if (q.type === 'heroic') rex = key.includes('chk') ? 1500 : key.includes('secret') ? 2500 : 3000;
    else if (q.type === 'hei') rex = Math.min(150, 60 + Math.round((q.reward?.silver||0) + (q.reward?.infamy||0)));
    else rex = Math.min(50, 20 + Math.round((q.reward?.silver||0) + (q.reward?.fame||0) * 2));
    iQ.run(key, q.type, fid || null, title, desc,
      q.reward?.silver || 0, q.reward?.fame || 0, q.reward?.infamy || 0,
      JSON.stringify(prerep), q.req_fame || 0,
      fixLoc(q.loc) || null, fixLoc(q.target) || null, q.combat ? 1 : 0, q.risk || null, rex);
    qCount++;
  }

  // 门派等级（faction_tiers）—— 新 20 门派 id
  db.prepare('DELETE FROM faction_tiers').run();
  const iT = ins('INSERT INTO faction_tiers (faction,rank,rank_order,rank_name,min_rep,min_contrib,min_days,req_quest,desc) VALUES (?,?,?,?,?,?,?,?,?)');
  const RANK_DEFS = [
    ['servant',0,'杂役弟子',0,0,0,null,'入门观察，还没正式拜师。在门派扫地、挑水、看门。'],
    ['trainee',1,'见习弟子',60,10,7,null,'通过门派考核正式入门，师父给你一个法号。'],
    ['outer',2,'外门弟子',180,80,21,null,'学了门派基本功和内功/轻功。'],
    ['inner',3,'内门弟子',500,300,60,null,'师父亲自教导，学了门派特技。'],
    ['inner_high',4,'内门高层',1000,600,90,null,'门派核心力量，参与门派决策。'],
    ['core',5,'核心弟子',1500,1000,120,'q_chk_','掌门/长老亲自传独门绝技。'],
    ['privileged',6,'亲传弟子',4000,3000,365,'q_secret_','师父独传（剧情触发）。'],
    ['chief',7,'首席弟子',0,0,0,'q_chief_','下一代掌门（剧情更替）。'],
  ];
  const FIDS = ['shaolin','wudang','gaibang','huashan','emei','kunlun','tianshan','mingjiao','diancang','tangmen','wudu','duanshi','kongtong','caobang','salt','tiezhang','murong','qinglong','bailian','nan_gong'];
  for (const fid of FIDS) for (const r of RANK_DEFS)
    iT.run(fid, r[0], r[1], r[2], r[3], r[4], r[5], r[6] ? r[6] + fid : null, r[7]);

  // 门派武器 faction_items
  db.prepare('DELETE FROM faction_items').run();
  const iFI = ins('INSERT INTO faction_items (faction,item_key,name,type,damage,defense,rank_required,contrib_cost,granted_by) VALUES (?,?,?,?,?,?,?,?,?)');
  let fiCount = 0;
  for (const [fid, items] of Object.entries(FACTION_WEAPONS)) {
    for (const it of items) { iFI.run(fid, ...it); fiCount++; }
  }

  console.log(`[rpg_seed] 完成: 特效5 装备${D.EQUIPMENTS.length} 药${D.MEDICINES.length} 材料${D.MATERIALS.length} 物资${D.LIFE_GOODS.length} 技能${D.LIFE_SKILLS.length} 采集点${D.COLLECTING_NODES.length} 配方${D.RECIPES.length} 野怪${D.MONSTERS.length} 节点${Object.keys(NODES).length} 商店${SHOPS.length} 势力20 武功${moves.length} NPC${CORE_NPCS.length} 任务${qCount} 门派武器${fiCount}`);
}

module.exports = { seedRpgData, CORE_NPCS, RENAMES, deJY, SHOPS, FACTION_WEAPONS };
