'use strict';
// —— 《大江湖》世界数据 ——
// 五域地图 + 势力 + NPC + 招式 + 任务 + 火线 + 物价 + 战斗描述

// ===== 五域 =====
const DOMAINS = {
  zhongzhou: { id: 'zhongzhou', name: '中州', open: true },
  xiyu:      { id: 'xiyu',      name: '西域', open: true },
  nanjiang:  { id: 'nanjiang',  name: '南疆', open: true },
  donghai:   { id: 'donghai',   name: '东海', open: true },
  beihuang:  { id: 'beihuang',  name: '北荒', open: true },
  ancheng:  { id: 'ancheng',   name: '暗层', open: false, note: '没有固定位置' },
};

// ===== 42 个地图节点 =====
const NODES = {
  // —— 中州 12 ——
  qingshi:    { id: 'qingshi',    domain: 'zhongzhou', name: '青石镇',    desc: '青石铺路的小镇，五条巷子七家店。是初入江湖的落脚点。', exits: { N: 'luoyang', E: 'shaolin' } },
  luoyang:    { id: 'luoyang',    domain: 'zhongzhou', name: '洛阳城',    desc: '九朝古都，城内人口十万。南门是茶馆区，东门是镖局区，西门是黑市入口。', exits: { S: 'qingshi', N: 'xiangyang', E: 'huashan' } },
  xiangyang:  { id: 'xiangyang',  domain: 'zhongzhou', name: '襄阳城',    desc: '汉水之滨，丐帮总舵所在。城墙斑驳但热闹得很。', exits: { S: 'luoyang', W: 'emei' } },
  shaolin:    { id: 'shaolin',    domain: 'zhongzhou', name: '少林寺',    desc: '嵩山之上，古刹红墙。寺门半开，石阶上站着扫地僧。', exits: { W: 'qingshi' } },
  wudang:     { id: 'wudang',     domain: 'zhongzhou', name: '武当山',    desc: '天柱峰顶，云雾缭绕。紫霄宫内有琴声传出。', exits: { S: 'luoyang' } },
  huashan:    { id: 'huashan',    domain: 'zhongzhou', name: '华山',      desc: '西岳之险，栈道悬挂山腰。剑宗气宗各占一峰。', exits: { W: 'luoyang', N: 'xiyu_entrance' } },
  emei:       { id: 'emei',       domain: 'zhongzhou', name: '峨眉',      desc: '金顶之上，僧尼同修。山风掠过，钟鸣声悠远。', exits: { E: 'xiangyang', S: 'nanjiang_entrance' } },
  gaibang:    { id: 'gaibang',    domain: 'zhongzhou', name: '丐帮总舵',  desc: '破庙一间，门口蹲着两条黄狗。帮主的位子在破庙里最干净的那个角落。', exits: { E: 'xiangyang' } },
  luoyang_black:{ id: 'luoyang_black', domain: 'zhongzhou', name: '洛阳黑市', desc: '洛阳城西的废弃钱庄，入口藏在布匹店后院。灯火昏暗，什么都卖。', exits: { E: 'luoyang' } },
  yanyang:    { id: 'yanyang',    domain: 'zhongzhou', name: '扬州城',    desc: '江南运河枢纽，盐号林立，青楼连排。消息铺比米铺还多。', exits: { N: 'luoyang', E: 'donghai_entrance' } },
  xiyu_entrance:{id:'xiyu_entrance',domain:'zhongzhou', name:'铁门关', desc:'出了关就是西域。守关士兵盘查得严。', exits:{S:'huashan', N:'dunhuang'} },
  nanjiang_entrance:{id:'nanjiang_entrance',domain:'zhongzhou', name:'蜀道南口', desc:'栈道惊险，过了就是南疆地界。', exits:{N:'emei', S:'chengdu'} },

  // —— 西域 8 ——
  dunhuang:   { id: 'dunhuang',   domain: 'xiyu', name: '敦煌',        desc: '鸣沙山下的绿洲城，商队的起点也是终点。', exits: { S: 'xiyu_entrance', W: 'tianshan' } },
  guangmingding:{id:'guangmingding',domain:'xiyu', name:'光明顶',  desc: '明教总坛。山势陡峭，只有一条暗道能上。', exits: { E: 'kunlun' } },
  tianshan:   { id: 'tianshan',   domain: 'xiyu', name: '天山雪原',    desc: '白雪皑皑，雪莲盛开。冰峰之上有天山派练功的身影。', exits: { E: 'dunhuang' } },
  kunlun:     { id: 'kunlun',     domain: 'xiyu', name: '昆仑山口',    desc: '千年积雪，昆仑派隐于此。山口常有罡风。', exits: { W: 'guangmingding' } },
  desert:     { id: 'desert',     domain: 'xiyu', name: '沙漠商道',    desc: '黄沙万里，骆驼铃声断续。路上有劫匪出没。', exits: { E: 'dunhuang', W: 'dunhuang' } },
  oasis:      { id: 'oasis',      domain: 'xiyu', name: '绿洲',        desc: '沙漠中难得的活水，过往商队必停。', exits: { E: 'desert' } },
  mingjiao_den:{id:'mingjiao_den',domain:'xiyu', name:'明教暗桩',    desc: '一个不起眼的驼队营地，里面住的不是驼夫。', exits: { E: 'dunhuang' } },
  tianshan_peak:{id:'tianshan_peak',domain:'xiyu', name:'天山派', desc:'雪莲丛中的木屋群，天山弟子在此练功。', exits: { S: 'tianshan' } },

  // —— 南疆 8 ——
  chengdu:    { id: 'chengdu',   domain: 'nanjiang', name: '成都',    desc: '蜀地首城，茶馆遍地。唐门势力渗入城中商号。', exits: { N: 'nanjiang_entrance', S: 'dali' } },
  dali:       { id: 'dali',       domain: 'nanjiang', name: '大理',    desc: '苍山洱海，段氏祖地。崇圣寺的钟声能传十里。', exits: { N: 'chengdu', W: 'diancang' } },
  tangmen:    { id: 'tangmen',    domain: 'nanjiang', name: '唐门堡',  desc: '深墙大院，暗器机关密布。唐门弟子进出自如，外人寸步难行。', exits: { N: 'chengdu' } },
  wudu:       { id: 'wudu',       domain: 'nanjiang', name: '五毒谷',  desc: '毒虫遍地，瘴气弥漫。五毒教在此炼毒养蛊。', exits: { E: 'dali' } },
  diancang:   { id: 'diancang',   domain: 'nanjiang', name: '点苍山',  desc: '苍山十九峰，点苍派隐居于此。', exits: { E: 'dali' } },
  saltwell:   { id: 'saltwell',   domain: 'nanjiang', name: '盐井',    desc: '南境盐泉，产的盐专供蜀地。有私盐贩子活动。', exits: { E: 'chengdu' } },
  oldcase:    { id: 'oldcase',    domain: 'nanjiang', name: '旧案遗址',desc: '二十年前唐门五毒冲突的现场，荒草没膝。', exits: { E: 'tangmen' } },
  poison_marsh:{id:'poison_marsh',domain:'nanjiang', name:'毒沼',    desc: '毒气弥漫，飞鸟不渡。五毒教偶尔在此试毒。', exits: { E: 'wudu' } },

  // —— 东海 7 ——
  quanzhou:   { id: 'quanzhou',   domain: 'donghai', name: '泉州',    desc: '海滨商港，各国商船停靠。盐帮势力最大。', exits: { W: 'yanyang', S: 'saltyard' } },
  saltyard:   { id: 'saltyard',   domain: 'donghai', name: '盐场',    desc: '盐田连绵，盐帮在此晒盐收盐。', exits: { N: 'quanzhou' } },
  wumingdao:  { id: 'wumingdao',  domain: 'donghai', name: '无名岛',  desc: '海盗窝所在。岛上只有一条路，路尽头是海盗头目的寨。', exits: { N: 'quanzhou' } },
  taohuadao:  { id: 'taohuadao',  domain: 'donghai', name: '桃花岛',  desc: '海上仙岛，黄老邪隐居于此。岛上遍布奇门机关。', exits: { N: 'quanzhou' } },
  haidao:     { id: 'haidao',     domain: 'donghai', name: '海盗窝',  desc: '无名岛深处，海贼分赃议事的洞窟。', exits: { N: 'wumingdao' } },
  pier:       { id: 'pier',       domain: 'donghai', name: '码头',    desc: '泉州码头，船票在此卖，消息也在此卖。', exits: { E: 'quanzhou' } },
  seaway:     { id: 'seaway',     domain: 'donghai', name: '海路',    desc: '茫茫大海，商船往来。有风暴也有海盗。', exits: { E: 'pier', W: 'taohuadao' } },

  // —— 北荒 7 ——
  yanmen:     { id: 'yanmen',     domain: 'beihuang', name: '雁门关',  desc: '长城尽头，出关便是北荒。守军严密盘查。', exits: { S: 'luoyang', N: 'tiezhang' } },
  tiezhang:   { id: 'tiezhang',   domain: 'beihuang', name: '铁掌峰',  desc: '铁掌帮帮主裘千仞的地盘。掌风凛冽，草木低伏。', exits: { S: 'yanmen', E: 'changbai' } },
  murong:     { id: 'murong',     domain: 'beihuang', name: '慕容旧宅',desc: '破败的王府，慕容复祖居。还留着复燕的旗帜。', exits: { W: 'yanmen' } },
  changbai:   { id: 'changbai',   domain: 'beihuang', name: '长白山',  desc: '冰封千里，有异兽出没。', exits: { W: 'tiezhang' } },
  snowfield:  { id: 'snowfield',  domain: 'beihuang', name: '雪原',    desc: '白茫茫一片，容易迷路。', exits: { E: 'changbai' } },
  tiezhang_fengduo:{id:'tiezhang_fengduo',domain:'beihuang', name:'铁掌帮分舵', desc:'铁掌帮在雁门关外的分舵。', exits:{S:'yanmen'} },
  beihuang_town:{id:'beihuang_town',domain:'beihuang', name:'北荒小镇', desc:'关内关外唯一的物资集散地。', exits:{N:'yanmen'} },

  // —— 暗层（没有固定位置，是所有城市里随机出现的"神秘来客"）——
};

// ===== 20 势力 =====
const FACTIONS = {
  // 中州
  shaolin:   { id: 'shaolin',   name: '少林',     domain: 'zhongzhou', color: '#d4c5a0' },
  wudang:    { id: 'wudang',    name: '武当',     domain: 'zhongzhou', color: '#a0c4d4' },
  gaibang:   { id: 'gaibang',   name: '丐帮',     domain: 'zhongzhou', color: '#b8a278' },
  huashan:   { id: 'huashan',   name: '华山',     domain: 'zhongzhou', color: '#c4a0d4' },
  emei:      { id: 'emei',      name: '峨眉',     domain: 'zhongzhou', color: '#d4a0a0' },
  // 西域
  kunlun:    { id: 'kunlun',    name: '昆仑',     domain: 'xiyu',      color: '#a0d4c4' },
  tianshan:  { id: 'tianshan',  name: '天山',     domain: 'xiyu',      color: '#c0c0d4' },
  mingjiao:  { id: 'mingjiao',  name: '明教',     domain: 'xiyu',      color: '#d44040' },
  // 南疆
  diancang:  { id: 'diancang',  name: '点苍',     domain: 'nanjiang',  color: '#88c088' },
  tangmen:   { id: 'tangmen',   name: '唐门',     domain: 'nanjiang',  color: '#c8a070' },
  wudu:      { id: 'wudu',      name: '五毒',     domain: 'nanjiang',  color: '#80b080' },
  duanshi:   { id: 'duanshi',   name: '段氏',     domain: 'nanjiang',  color: '#a0b0d0' },
  // 东海
  taohua:    { id: 'taohua',    name: '桃花岛',   domain: 'donghai',   color: '#f0a0c0' },
  haidao:    { id: 'haidao',    name: '海盗',     domain: 'donghai',   color: '#666666' },
  salt:      { id: 'salt',      name: '盐帮',     domain: 'donghai',   color: '#c0c0c0' },
  // 北荒
  tiezhang:  { id: 'tiezhang',  name: '铁掌帮',   domain: 'beihuang',  color: '#b08050' },
  murong:    { id: 'murong',    name: '慕容',     domain: 'beihuang',  color: '#b0b0d0' },
  // 暗层
  qinglong:  { id: 'qinglong',  name: '青龙会',   domain: 'ancheng',   color: '#404040' },
  qianjin:   { id: 'qianjin',   name: '金钱帮',   domain: 'ancheng',   color: '#d4c040' },
  nan_gong:  { id: 'nan_gong',  name: '南宫',     domain: 'ancheng',   color: '#a080d0' },
};

// ===== 声望等级 =====
const REP_TIERS = [0, 40, 120, 280, 500];
const REP_NAMES = ['陌生', '听闻', '信任', '倚重', '核心'];

// ===== 名望等级 =====
const FAME_TIERS = [0, 100, 300, 600, 1000];
const FAME_NAMES = ['无名小卒', '略有耳闻', '小有名气', '名动一方', '江湖闻名'];

// ===== 克制关系 =====
const COUNTER = {
  gang: 'qiao',    // 刚猛克灵巧
  qiao: 'nei',     // 灵巧克内功
  nei:  'gang',    // 内功克刚猛
};
const COUNTER_NAMES = { gang: '刚猛', qiao: '灵巧', nei: '内功' };

// ===== 28 招式 + 12 绝学 =====
const MOVES = {
  // 基础招式（武馆可学）
  mp01: { key:'mp01', name:'直拳',   type:'拳脚',   counter:'gang', damage:[3,5], nei_cost:0,  learn_cost:5,  faction:null, desc:'沉肩坠肘，一记直拳。' },
  mp02: { key:'mp02', name:'劈砍',   type:'兵器',   counter:'gang', damage:[4,6], nei_cost:0,  learn_cost:5,  faction:null, desc:'双手握剑，自上而下劈出。' },
  mp03: { key:'mp03', name:'吐纳',   type:'内功',   counter:'nei',  damage:[0,0], nei_cost:0,  learn_cost:5,  faction:null, heal:5,  desc:'调气回元，内力恢复。' },
  mp04: { key:'mp04', name:'疾步',   type:'轻功',   counter:'qiao', damage:[0,0], nei_cost:2,  learn_cost:5,  faction:null, first: true, desc:'下回合先手。' },

  // 少林
  shaolin_l: { key:'shaolin_l', name:'罗汉拳',  type:'拳脚', counter:'gang', damage:[6,9], nei_cost:3, learn_cost:0, faction:'shaolin', req_rep:20 },
  shaolin_h: { key:'shaolin_h', name:'铁头功',  type:'拳脚', counter:'gang', damage:[5,7], nei_cost:2, learn_cost:0, faction:'shaolin', req_rep:40 },
  // 武当
  wudang_l:  { key:'wudang_l',  name:'太极拳',  type:'拳脚', counter:'nei',  damage:[5,8], nei_cost:4, learn_cost:0, faction:'wudang',  req_rep:20, heal:3 },
  wudang_h:  { key:'wudang_h',  name:'太极剑',  type:'兵器', counter:'nei',  damage:[6,8], nei_cost:4, learn_cost:0, faction:'wudang',  req_rep:40 },
  // 丐帮
  gaibang_l: { key:'gaibang_l', name:'丐帮棍',  type:'兵器', counter:'qiao', damage:[7,10], nei_cost:4, learn_cost:0, faction:'gaibang', req_rep:40 },
  gaibang_h: { key:'gaibang_h', name:'降龙掌',  type:'拳脚', counter:'gang', damage:[8,12], nei_cost:5, learn_cost:0, faction:'gaibang', req_rep:60 },
  // 华山
  huashan_l: { key:'huashan_l', name:'华山剑',  type:'兵器', counter:'qiao', damage:[6,9], nei_cost:3, learn_cost:0, faction:'huashan', req_rep:20 },
  huashan_h: { key:'huashan_h', name:'紫霞功',  type:'内功', counter:'nei',  damage:[0,0], nei_cost:3, learn_cost:0, faction:'huashan', req_rep:60, max_nei:10 },
  // 峨眉
  emei_l:    { key:'emei_l',    name:'峨眉刺',  type:'兵器', counter:'qiao', damage:[5,8], nei_cost:3, learn_cost:0, faction:'emei',    req_rep:20, poison:[2,2] },
  emei_h:    { key:'emei_h',    name:'金顶掌',  type:'拳脚', counter:'gang', damage:[6,9], nei_cost:4, learn_cost:0, faction:'emei',    req_rep:60, poison:[3,3] },
  // 明教
  mingjiao_l:{ key:'mingjiao_l',name:'圣火拳',  type:'拳脚', counter:'gang', damage:[7,10], nei_cost:4, learn_cost:0, faction:'mingjiao', req_rep:40 },
  mingjiao_h:{ key:'mingjiao_h',name:'乾坤大挪移', type:'内功', counter:'nei', damage:[4,8], nei_cost:8, learn_cost:0, faction:'mingjiao', req_rep:80, reflect:true },
  // 天山
  tianshan_l:{ key:'tianshan_l',name:'天山折梅手', type:'拳脚', counter:'qiao', damage:[9,13], nei_cost:5, learn_cost:0, faction:'tianshan', req_rep:60 },
  tianshan_h:{ key:'tianshan_h',name:'八荒六合功', type:'内功', counter:'nei',  damage:[0,0], nei_cost:3, learn_cost:0, faction:'tianshan', req_rep:80, max_nei:30 },
  // 铁掌帮
  tiezhang_l:{ key:'tiezhang_l',name:'铁掌',    type:'拳脚', counter:'gang', damage:[10,14], nei_cost:5, learn_cost:0, faction:'tiezhang', req_rep:60 },
  // 慕容
  murong_l:  { key:'murong_l',  name:'斗转星移',type:'内功', counter:'nei',  damage:[8,11], nei_cost:7, learn_cost:0, faction:'murong', req_rep:80, reflect:true },
  // 唐门
  tangmen_l: { key:'tangmen_l', name:'唐门暗器',type:'兵器', counter:'qiao', damage:[6,10], nei_cost:3, learn_cost:0, faction:'tangmen', req_rep:40, first:true },
  // 五毒
  wudu_l:    { key:'wudu_l',    name:'五毒掌',  type:'拳脚', counter:'gang', damage:[5,8], nei_cost:4, learn_cost:0, faction:'wudu',    req_rep:40, poison:[3,5] },
  // 段氏
  duanshi_l: { key:'duanshi_l', name:'一阳指',  type:'内功', counter:'nei',  damage:[8,12], nei_cost:6, learn_cost:0, faction:'duanshi', req_rep:60 },

  // 绝学（每势力 1，核心声望 280+ 解锁）
  jx_syl: { key:'jx_syl', name:'易筋经',    type:'被动', faction:'shaolin',  req_rep:280, desc:'HP 上限 +20', hp_bonus:20 },
  jx_tjj: { key:'jx_tjj', name:'太极剑',    type:'被动', faction:'wudang',   req_rep:280, desc:'内功招式伤害 +3', nei_damage_bonus:3 },
  jx_xlzp:{ key:'jx_xlzp',name:'降龙十八掌',type:'拳脚', counter:'gang', damage:[15,20], nei_cost:10, faction:'gaibang', req_rep:280 },
  jx_dgjj:{ key:'jx_dgjj',name:'独孤九剑', type:'被动', faction:'huashan',  req_rep:280, desc:'兵器招式必中', weapon_hit:true },
  jx_jdmc:{ key:'jx_jdmc',name:'金顶绵掌', type:'被动', faction:'emei',     req_rep:280, desc:'中毒效果翻倍', poison_double:true },
  jx_lmsc:{ key:'jx_lmsc',name:'六脉神剑', type:'内功', counter:'nei',  damage:[12,18], nei_cost:8, faction:'duanshi', req_rep:280 },
  jx_bayhz:{ key:'jx_bayhz',name:'暴雨梨花针',type:'兵器', counter:'qiao', damage:[8,12], x2:true, nei_cost:6, faction:'tangmen', req_rep:280 },
  jx_wgfx:{ key:'jx_wgfx',name:'万蛊噬心', type:'拳脚', counter:'gang', damage:[3,5], poison:[3,7], nei_cost:5, faction:'wudu', req_rep:280 },
  jx_shlfa:{ key:'jx_shlfa',name:'圣火令法',type:'被动', faction:'mingjiao', req_rep:280, desc:'反弹 +5', reflect_bonus:5 },
  jx_bhlhg:{ key:'jx_bhlhg',name:'八荒六合功·真', type:'被动', faction:'tianshan', req_rep:280, desc:'内力上限 +50', max_nei:50 },
  jx_tzhz:{ key:'jx_tzhz',name:'铁掌·裂',  type:'拳脚', counter:'gang', damage:[14,22], nei_cost:8, faction:'tiezhang', req_rep:280 },
  jx_dzxy:{ key:'jx_dzxy',name:'斗转·真',  type:'内功', counter:'nei',  damage:[15,25], nei_cost:12, faction:'murong', req_rep:280, reflect:true },
};

// ===== 物价基准 =====
const ITEMS = {
  // 消耗品
  mantou:  { key:'mantou',  name:'馒头',  type:'food',  price:0.1,  heal:5 },
  shaoji:  { key:'shaoji',  name:'烧鸡',  type:'food',  price:0.5,  heal:20 },
  jincang: { key:'jincang', name:'金疮药',type:'heal',  price:1.0,  heal:30 },
  huiqi:   { key:'huiqi',   name:'回气散',type:'nei',  price:2.0,  nei:20 },
  jiedu:   { key:'jiedu',   name:'解毒散',type:'antidote', price:1.5 },
  // 基础武器
  tiejian: { key:'tiejian', name:'铁剑',  type:'weapon', price:5,  damage:'3-5', counter:'gang' },
  jinggang:{ key:'jinggang',name:'精钢剑',type:'weapon', price:20, damage:'5-7', counter:'qiao', req_fame:100 },
  buyu:    { key:'buyu',    name:'布衣',  type:'armor', price:2,  defense:'1-2' },
  pijia:   { key:'pijia',   name:'皮甲',  type:'armor', price:10, defense:'3-5', req_fame:50 },
  // 黑市违禁品
  duyao:   { key:'duyao',   name:'毒药',  type:'contraband', price:15 },
  miyan:   { key:'miyan',   name:'迷烟',  type:'contraband', price:20 },
  weizhao: { key:'weizhao', name:'伪造册子', type:'contraband', price:50 },
  // 跑商货源
  siyan:   { key:'siyan',   name:'私盐',  type:'goods', price:3 },
  silk:    { key:'silk',    name:'丝绸',  type:'goods', price:15 },
  herb:    { key:'herb',    name:'药材',  type:'goods', price:5 },
};

// ===== 商店（按节点 id）=====
const SHOPS = {
  // 青石镇
  shop_qingshi_grocery:  { id:'shop_qingshi_grocery',  location:'qingshi',    name:'杂货铺', price_rate:1.0, items:['mantou','shaoji','siyan','herb'] },
  shop_qingshi_med:      { id:'shop_qingshi_med',      location:'qingshi',    name:'药铺',   price_rate:1.0, items:['jincang','huiqi','jiedu'] },
  shop_qingshi_iron:     { id:'shop_qingshi_iron',     location:'qingshi',    name:'铁匠铺', price_rate:1.0, items:['tiejian','buyu'] },
  shop_qingshi_wuguan:   { id:'shop_qingshi_wuguan',   location:'qingshi',    name:'武馆',   price_rate:1.0, items:['mp01','mp02','mp03','mp04'], teach:true },
  shop_qingshi_innt:     { id:'shop_qingshi_innt',     location:'qingshi',    name:'客栈',   price_rate:1.0, items:[], inn:true },
  shop_qingshi_teahouse: { id:'shop_qingshi_teahouse', location:'qingshi',    name:'茶馆',   price_rate:1.0, items:[], teahouse:true },
  // 洛阳
  shop_luoyang_auction:  { id:'shop_luoyang_auction',  location:'luoyang',    name:'拍卖行', price_rate:1.0, auction:true },
  shop_luoyang_bingqi:   { id:'shop_luoyang_bingqi',   location:'luoyang',    name:'兵器铺', price_rate:1.2, items:['jinggang','pijia'] },
  shop_luoyang_cloth:    { id:'shop_luoyang_cloth',    location:'luoyang',    name:'绸缎庄', price_rate:1.2, items:['silk'] },
  shop_luoyang_innt:     { id:'shop_luoyang_innt',     location:'luoyang',    name:'悦来客栈', price_rate:1.2, items:[], inn:true },
  shop_luoyang_gambling: { id:'shop_luoyang_gambling', location:'luoyang',    name:'赌坊',   price_rate:1.0, gambling:true },
  // 扬州
  shop_yangzhou_black:   { id:'shop_yangzhou_black',   location:'luoyang_black', name:'黑市', price_rate:1.5, items:['duyao','miyan','weizhao'], black:true },
  shop_yangzhou_salt:    { id:'shop_yangzhou_salt',    location:'quanzhou',   name:'盐号',   price_rate:0.8, items:['siyan'] },
  shop_yangzhou_info:    { id:'shop_yangzhou_info',    location:'yanyang',    name:'消息铺', price_rate:1.0, info:true },
  // 西域
  shop_dunhuang:         { id:'shop_dunhuang',         location:'dunhuang',   name:'西域集市', price_rate:1.3, items:['mantou','shaoji','tiejian','herb'] },
  // 南疆
  shop_chengdu:         { id:'shop_chengdu',         location:'chengdu',   name:'蜀地药铺', price_rate:0.9, items:['jiedu','herb','jincang'] },
  shop_tangmen:          { id:'shop_tangmen',          location:'tangmen',    name:'唐门暗器铺', price_rate:1.1, items:['duyao','miyan'] },
  // 东海
  shop_quanzhou:         { id:'shop_quanzhou',         location:'quanzhou',   name:'泉州海港铺', price_rate:1.0, items:['mantou','shaoji','silk','siyan'] },
  // 北荒
  shop_beihuang:         { id:'shop_beihuang',         location:'beihuang_town', name:'边关集市', price_rate:1.4, items:['buyu','pijia','herb'] },
};

// ===== 战斗描述库 =====
const MOVE_DESC = {
  mp01: ['你沉肩坠肘，一记直拳轰向对方胸口。', '你侧身进步，直拳带着风声砸向对方肩头。'],
  mp02: ['你双手握剑，自上而下劈出一道寒光。', '你斜身劈砍，剑锋划向对方腰肋。'],
  mp03: ['你闭目吐纳，气沉丹田，内力缓缓回复。', '你双掌合十，体内气息运转了一个周天。'],
  mp04: ['你脚下疾步，瞬间拉开了距离，下回合你先出手。', '你身形一晃，退到对方视线死角。'],
  shaolin_l: ['你拳出如罗汉降世，刚猛无俦。', '你一招"罗汉伏虎"，拳风扑面。'],
  wudang_l:  ['你以柔克刚，太极拳画了个圆。', '你一招"揽雀尾"，将对方的攻势引到一旁。'],
  gaibang_l: ['你棒出如狗吠，丐帮棍法诡异难测。', '你一招"棒打落水狗"，下盘扫去。'],
  huashan_l: ['你剑出凌厉，华山剑法锋锐无双。', '你一招"夺命连环三仙剑"，三剑齐出。'],
  emei_l:    ['你峨眉刺轻巧灵动，直指对方要害。', '你一招"飞蛾扑火"，刺出三朵银花。'],
  mingjiao_l:['你圣火拳带着烈焰，刚猛霸道。', '你一招"焚天掌"，掌风炙热。'],
  tangmen_l: ['你袖中飞出几枚暗器，破空而去。', '你手指一弹，一枚铁针直射对方咽喉。'],
  wudu_l:    ['你手掌泛绿，五毒掌带着瘴气。', '你一招"蝎尾钳"，双掌毒雾弥漫。'],
  tianshan_l:['你天山折梅手，进退之间自有章法。', '你一招"六阳掌"，寒气逼人。'],
  tiezhang_l:['你掌风刚猛，铁掌轰出如天雷。', '你一招"横推八千丈"，巨力无比。'],
  duanshi_l: ['你指尖凝聚内力，一阳指出手。', '你左手拇指翘起，一指透点穴门。'],
};

const DAMAGE_DESC = {
  light:  ['对方闷哼一声，退了一步。', '对方踉跄，脸色变了。', '对方身体一晃，嘴角微颤。'],
  medium: ['对方踉跄后退，嘴角渗血。', '对方痛哼出声，捂了一下伤口。', '对方退了两步，喘息加粗。'],
  heavy:  ['对方被击中要害，单膝跪地。', '对方倒抽一口凉气，身形不稳。', '对方被震退数步，后背撞在墙上。'],
  fatal:  ['对方喷出一口鲜血，扑倒在地。', '对方仰天长啸，重伤倒地不起。', '对方眼睛一翻，晕了过去。'],
};

// NPC 受击/逃跑/昏迷描述
const NPC_DESC = {
  hp_low:  ['"好……好个狠人！"对方捂着伤口往后退。', '"哼！咱们走着瞧！"对方一瘸一拐跑了。'],
  flee:    ['对方转身就逃，眨眼间消失在街角。', '"我……我记住你了！"对方屁滚尿流地跑了。'],
  knock:   ['对方头一歪，倒在了地上。', '对方身子一软，瘫倒在地一动不动。'],
  beg:     ['"饶……饶命！我不过是奉命行事……"对方跪了下来。'],
};

// ===== 跑商价差（每个域的价格倍率）=====
const TRADE_MULT = {
  zhongzhou: { silk:1.0, herb:1.0, siyan:1.0 },
  xiyu:      { silk:1.5, herb:0.7, siyan:1.3 },
  nanjiang:  { silk:1.3, herb:0.6, siyan:1.1 },
  donghai:   { silk:0.8, herb:1.2, siyan:0.7 },
  beihuang:  { silk:1.6, herb:1.5, siyan:1.4 },
};

module.exports = {
  DOMAINS, NODES, FACTIONS, MOVES, ITEMS, SHOPS,
  REP_TIERS, REP_NAMES, FAME_TIERS, FAME_NAMES,
  COUNTER, COUNTER_NAMES, MOVE_DESC, DAMAGE_DESC, NPC_DESC, TRADE_MULT,
};
