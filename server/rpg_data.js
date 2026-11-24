'use strict';
// —— RPG 静态数据（表源）：特殊属性/装备/药品/材料/物资/生活技能/采集点/配方/野怪 ——
// 门派改名：taohua→kongtong(崆峒) haidao→caobang(漕帮) qianjin→bailian(白莲教)
const FAC_ID_MAP = { taohua: 'kongtong', haidao: 'caobang', qianjin: 'bailian' };
const FAC_NAMES = { kongtong: '崆峒', caobang: '漕帮', bailian: '白莲教' };

// ===== 特殊属性（5 种）=====
const SPECIAL_EFFECTS = [
  { key: 'poison',    name: '淬毒', kind: 'poison',    value: 5, rounds: 3, chance: 0.30, desc: '命中30%挂毒，3回合每回合扣5血' },
  { key: 'burn',      name: '灼烧', kind: 'burn',      value: 4, rounds: 3, chance: 0.30, desc: '命中30%挂灼，3回合每回合扣4血' },
  { key: 'freeze',    name: '冰魄', kind: 'freeze',    value: 0, rounds: 1, chance: 0.20, desc: '命中20%对方下回合无法行动' },
  { key: 'lifesteal', name: '吸血', kind: 'lifesteal', value: 20, rounds: 0, chance: 0,    desc: '每次命中回伤害×20%的血' },
  { key: 'paralyze',  name: '麻痹', kind: 'paralyze',  value: 0, rounds: 1, chance: 0.25, desc: '命中25%对方下回合失能' },
];

// ===== 装备 47 件（价格= atk/def×8×稀有倍率 白1/绿1.5/蓝2.5/紫5/橙10）=====
// [key,name,slot,type,atk,def,rarity,req_level,bonuses,special_key,desc]
const EQUIPMENTS = [
  // hand·sword
  ['wood_stick','木棍','hand','weapon',2,0,'白',1,null,null,'粗糙的木棍，聊胜于无。'],
  ['tiejian','铁剑','hand','weapon',5,0,'白',3,null,null,'铁匠铺里最常见的铁剑。'],
  ['jinggang_jian','精钢剑','hand','weapon',8,0,'绿',6,null,null,'精钢锻造，锋刃不卷。'],
  ['qinggang_jian','青钢剑','hand','weapon',12,0,'蓝',10,null,null,'青钢铸就，寒光内蕴。'],
  ['yuchang_jian','鱼肠剑','hand','weapon',16,0,'紫',18,null,'poison','春秋名剑，剑身淬毒，中者腐骨。'],
  ['zhanlu','湛卢','hand','weapon',22,0,'橙',30,null,'paralyze','仁道名剑，剑气可乱人心神，命中易使敌失能。'],
  ['ganjiang','干将','hand','weapon',30,0,'橙',50,null,'lifesteal','干将铸剑传世神兵，饮血回元。'],
  // hand·dao
  ['tie_dao','铁刀','hand','weapon',4,0,'白',2,null,null,'边关军士制式铁刀。'],
  ['qinggang_dao','青钢刀','hand','weapon',10,0,'绿',8,null,null,'刀身宽厚，劈砍有力。'],
  ['shenghuo_dao','圣火刀','hand','weapon',18,0,'紫',25,null,'burn','教团宝刀，刀气带灼热圣火。'],
  ['guiya_dao','鬼牙刀','hand','weapon',24,0,'橙',40,null,'lifesteal','刀背如齿，血不落地。'],
  // hand·spear
  ['changqiang','长枪','hand','weapon',6,0,'白',4,null,null,'丈二白蜡杆枪。'],
  ['sanjian_qiang','三尖两刃枪','hand','weapon',14,0,'蓝',15,null,null,'枪头三尖两刃，军中名将所使。'],
  ['fangtian_ji','方天画戟','hand','weapon',26,0,'橙',45,null,null,'三国名将宝戟，重一百二十斤。'],
  // hand·stick
  ['shufu_gun','竹棍','hand','weapon',3,0,'白',1,null,null,'山民挑柴的竹棍。'],
  ['luohan_gun','罗汉棍','hand','weapon',9,0,'绿',7,null,null,'少林武僧练功棍。'],
  ['gangtie_chu','钢鞭','hand','weapon',13,0,'蓝',12,null,null,'四棱钢鞭，专打护甲。'],
  // hand·fist
  ['bu_xi','布拳套','hand','weapon',3,0,'白',1,null,null,'缠手的粗布拳套。'],
  ['tisha_tao','铁砂套','hand','weapon',11,0,'蓝',11,null,null,'内灌铁砂的拳套，打人闷痛。'],
  ['xuanmie_zhang','玄铁掌套','hand','weapon',20,0,'紫',28,null,null,'玄铁包边的铁掌帮重器。'],
  // hand·hidden
  ['meihua_zhen','梅花针','hand','weapon',7,0,'绿',9,null,'poison','五枚一组的手翻暗器，淬毒。'],
  ['yinsuo','天竺银梭','hand','weapon',15,0,'紫',22,null,'poison','银梭形暗器，指力弹出，毒入骨髓。'],
  ['lijia_zhen','暴雨梨花针','hand','weapon',28,0,'橙',55,null,'poison','机关筒装数百枚毒针，一筒激出如雨。'],
  // head
  ['bu_jin','布巾','head','armor',0,2,'白',1,null,null,'蒙头御寒的粗布巾。'],
  ['tie_kui','铁盔','head','armor',0,6,'绿',8,null,null,'军中制式铁盔。'],
  ['jia_kui','山甲盔','head','armor',0,10,'蓝',16,null,null,'以山龟甲片缀成的头盔，刀斧难伤。'],
  ['jin_guan','金冠','head','armor',0,16,'橙',40,'{wit:2}',null,'世家公子所戴金冠。'],
  // body
  ['buyi','布衣','body','armor',0,3,'白',1,null,null,'粗布短衣。'],
  ['pijia','皮甲','body','armor',0,7,'绿',6,null,null,'牛皮鞣制的软甲。'],
  ['luozijia','锁子甲','body','armor',0,13,'蓝',14,null,null,'铁环相扣，护体周全。'],
  ['shanjia','山甲','body','armor',0,18,'紫',26,null,null,'龟甲连环重铠。'],
  ['xuantie_kai','玄铁重铠','body','armor',0,26,'橙',42,'{crit_resist:0.1}',null,'玄铁浇铸重铠，重如磐石，暴击亦难破甲。'],
  // feet
  ['caoxie','草鞋','feet','armor',0,1,'白',1,null,null,'草编布底鞋。'],
  ['pi_xie','皮靴','feet','armor',0,4,'绿',6,null,null,'牛皮长靴，耐磨护脚。'],
  ['tie_xie','铁靴','feet','armor',0,8,'蓝',14,null,null,'靴面覆铁片，踢击亦是兵刃。'],
  ['tayun_xie','踏云靴','feet','armor',0,12,'紫',24,'{dodge:0.08}',null,'轻功靴，着地无声，身法更佳。'],
  // wrist
  ['bu_wan','布护腕','wrist','armor',0,2,'白',2,null,null,'护腕绑带。'],
  ['tie_wan','铁护腕','wrist','armor',0,5,'绿',9,null,null,'铁片护腕，硬接拳脚。'],
  ['xuantie_wan','玄铁护腕','wrist','armor',0,9,'蓝',18,null,null,'玄铁护腕，重而坚。'],
  ['longjin_wan','龙筋护腕','wrist','armor',0,13,'紫',30,'{agi:2}',null,'传说以蛟筋为绳，佩之身轻。'],
  // accessory
  ['yu_pei','玉佩','accessory','armor',0,0,'白',1,'{luck:1}',null,'寻常玉佩，佩之心境平和。'],
  ['feicui_biyan','翡翠臂钏','accessory','armor',0,0,'绿',10,'{cha:2}',null,'翡翠臂钏，气度不凡。'],
  ['jin_huan','金环','accessory','armor',0,0,'蓝',18,'{luck:2,fortune:1}',null,'纯金双环，财运暗藏。'],
  ['xueyu_pei','血玉佩','accessory','armor',0,0,'紫',28,'{fortune:3}',null,'血色玉佩，传说主人多逢奇遇。'],
  ['yu_zhang','玉璋','accessory','armor',0,0,'橙',45,'{wit:2,cha:2}',null,'古礼器玉璋，佩之悟性开明。'],
];

// ===== 药品 21 种 =====
// [key,name,kind,heal,nei,cure,buff_key,buff_rounds,buff_def,buff_atk,buff_neicost,buff_undead,full_heal,price,rarity,desc]
const MEDICINES = [
  ['jincang_yao','金疮药','heal',30,0,0,null,0,0,0,0,0,0,1.0,'白','最基础的止血敷伤药。'],
  ['da_huan_dan','大还丹','heal',80,0,0,null,0,0,0,0,0,0,5,'绿','药铺里卖得最好的大补丸。'],
  ['jiu_zhuan_jincang','九转金疮','heal',200,0,0,null,0,0,0,0,0,0,20,'蓝','九转炼成的金疮药，重伤可活。'],
  ['huan_hun_dan','还魂丹','heal',0,0,0,null,0,0,0,0,0,1,80,'紫','九死还生，气血回满。'],
  ['hui_qi_san','回气散','nei',0,20,0,null,0,0,0,0,0,0,2.0,'白','理顺气息，回复内力。'],
  ['qing_xin_dan','清心丹','nei',0,60,0,null,0,0,0,0,0,0,8,'绿','清心凝气，内力大复。'],
  ['yu_shen_dan','玉神丹','nei',0,150,0,null,0,0,0,0,0,0,30,'蓝','玉石入药，内力回满。'],
  ['jie_du_san','解毒散','cure',0,0,1,null,0,0,0,0,0,0,1.5,'白','解常见毒。'],
  ['wan_jie_dan','万解丹','cure',0,0,2,null,0,0,0,0,0,0,15,'绿','解一切毒与异常。'],
  ['han_yu_dan','寒玉丹','buff',0,0,0,'def',5,10,0,0,0,0,6,'绿','5回合内防御+10。'],
  ['xuan_tie_fang','玄铁粉','buff',0,0,0,'def',5,25,0,0,0,0,25,'蓝','玄铁细粉敷身，5回合防御+25。'],
  ['sheng_ji_tang','生肌汤','heal',50,0,0,null,0,0,0,0,0,0,3,'白','烫洗伤口，生肌续皮。'],
  ['jiu_shang_huo','九伤膏','heal',120,0,0,null,0,0,0,0,0,0,10,'绿','九味伤药调成的膏。'],
  ['ling_hua_dan','灵花丹','heal',60,0,0,null,0,0,0,0,0,0,4,'白','南疆灵花炼成的丹药。'],
  ['yin_qing_dan','引气丹','nei',0,30,0,null,0,0,0,0,0,0,4,'白','引气归元。'],
  ['chong_jing_dan','冲经丹','nei',0,90,0,null,0,0,0,0,0,0,15,'蓝','冲开经脉淤堵，内力大涨。'],
  ['du_jin_dan','渡金丹','heal',300,0,0,null,0,0,0,0,0,0,50,'紫','渡劫金身之丹，气血大涨。'],
  ['xue_xin_yao','血心药','heal',150,0,0,null,0,0,0,0,0,0,12,'绿','以血参入药，回血极快。'],
  ['huo_bing_dan','火冰丹','buff',0,0,0,'atk',5,0,8,0,0,0,18,'蓝','5回合内攻击+8。'],
  ['tian_shou_dan','天寿丹','buff',0,0,0,'undead',5,0,0,0,1,0,60,'紫','5回合内濒死保1血不死。'],
  ['ling_qi_dan','灵气丹','buff',0,0,0,'neicost',5,0,0,0.3,0,0,22,'蓝','5回合内出招内力消耗-30%。'],
];

// ===== 材料 24 种 =====
// [key,name,kind,rarity,price,desc]
const MATERIALS = [
  ['herb_chucai','初阶草药','herb','白',1,'路边随处可见的草药。'],
  ['herb_jingcai','精草药','herb','绿',3,'药农精挑的药材。'],
  ['herb_ginseng','野山参','herb','蓝',8,'深山老参，回血神物。'],
  ['herb_xuelian','雪莲','herb','紫',25,'长白山雪线之上盛开的奇花。'],
  ['herb_yangrou','阳柔草','herb','绿',4,'性温，配伍活血。'],
  ['herb_yinyang','阴阳藤','herb','蓝',10,'一藤两极，解毒良材。'],
  ['herb_lingcao','南疆灵草','herb','蓝',12,'南疆雾林中带的草。'],
  ['herb_gucao','五毒蛊草','herb','紫',30,'五毒谷炼毒专用草。'],
  ['herb_luoshi','露丝草','herb','白',2,'海边潮湿地带的野草。'],
  ['herb_jiuzhuan','九转灵芝','herb','橙',80,'千年灵芝，炼仙丹之材。'],
  ['ore_tie','铁矿石','ore','白',1,'铁矿石。'],
  ['ore_gang','精铁矿','ore','绿',4,'杂质少的精铁矿。'],
  ['ore_xuantie','玄铁','ore','蓝',15,'沉黑如墨的铁，打重兵器。'],
  ['ore_chijin','赤金矿','ore','紫',40,'赤色金矿。'],
  ['ore_hanyu','寒玉','ore','紫',35,'昆仑寒玉，触手生凉。'],
  ['wood_chu','柴木','wood','白',0.5,'普通柴木。'],
  ['wood_jing','硬木','wood','绿',2,'质地坚硬的木料。'],
  ['wood_hong','红木','wood','蓝',6,'名贵红木。'],
  ['wood_jingang','金刚木','wood','紫',20,'刀劈不开的神木。'],
  ['leather_shou','兽皮','leather','白',1,'剥下的兽皮。'],
  ['leather_lang','狼皮','leather','绿',3,'山狼的皮。'],
  ['leather_xue','雪狼皮','leather','蓝',10,'北荒雪狼的皮，御寒又轻。'],
  ['leather_qionqi','穷奇皮','leather','橙',60,'穷奇的皮，坚如铁革。'],
  ['other_yao_dan','妖丹','other','紫',50,'妖物体内的丹，药力极强。'],
  ['other_ya_lin','梼杌鳞','other','橙',90,'梼杌的鳞，铸甲极品。'],
];

// ===== 生活物资 18 种 =====
// [key,name,kind,heal,nei,full_heal,price,desc]
const LIFE_GOODS = [
  ['mantou','馒头','food',5,0,0,0.1,'白面馒头，吃一个回5血。'],
  ['shaoji','烧鸡','food',20,0,0,0.5,'香喷喷的烧鸡，回20血。'],
  ['hongshao','红烧肉','food',40,0,0,2,'一碗红烧肉，回40血。'],
  ['lingguo','灵果','food',100,0,0,8,'南疆灵果，回100血。'],
  ['jiu','浊酒','food',0,10,0,0.8,'一口浊酒下肚，内力+10。'],
  ['jing','清茶','food',0,5,0,0.5,'一盏清茶，内力+5。'],
  ['jiu_nian','女儿红','food',30,0,0,3,'女儿红一坛，回30血。'],
  ['jiu_wuxing','五行酿','food',60,0,0,6,'五行酿，回60血。'],
  ['jiu_changsheng','长生酿','food',0,0,1,30,'传说饮之延年，气血回满。'],
  ['fancai','山味杂烩','food',25,0,0,1.5,'一锅山珍，回25血。'],
  ['silk','丝绸','goods',0,0,0,15,'蜀锦丝绸，跑商硬通货。'],
  ['siyan','私盐','goods',0,0,0,3,'官盐外的私盐，利厚风险大。'],
  ['herb','药材','goods',0,0,0,5,'一包杂药材。'],
  ['ciqi','瓷器','goods',0,0,0,8,'青花瓷器，销路好。'],
  ['cha_ye','茶叶','goods',0,0,0,4,'明前好茶。'],
  ['xiang_liao','香料','goods',0,0,0,6,'南洋香料，金贵。'],
  ['duyao','毒药','goods',0,0,0,15,'瓶装剧毒，黑市货，官府查得严。'],
  ['miyan','迷烟','goods',0,0,0,20,'点燃使人昏沉的迷烟，违禁品。'],
  ['weizhao','伪造册子','goods',0,0,0,50,'伪造的官府文书，风险极高。'],
];

// ===== 生活技能 8 种 =====
const LIFE_SKILLS = [
  { key: 'cayao',   name: '采药', branch: '采集', tool_req: null,            desc: '采得草药，供炼药。' },
  { key: 'kuang',   name: '挖矿', branch: '采集', tool_req: null,            desc: '挖出矿石，供锻造。' },
  { key: 'famu',    name: '伐木', branch: '采集', tool_req: null,            desc: '砍伐木料，供各制造。' },
  { key: 'buyu',    name: '捕鱼', branch: '采集', tool_req: '鱼竿(5级后)',   desc: '海边打渔。' },
  { key: 'lianyao', name: '炼药', branch: '制造', tool_req: null,            desc: '以药材炼制药品。' },
  { key: 'duanzao', name: '锻造', branch: '制造', tool_req: '铁砧(3级后)',   desc: '以矿石木料锻造兵器。' },
  { key: 'pengren', name: '烹饪', branch: '制造', tool_req: null,            desc: '以木作薪烹制食物。' },
  { key: 'fengren', name: '缝纫', branch: '制造', tool_req: null,            desc: '以兽皮缝制甲衣。' },
];

// ===== 采集点 11 处 =====
// [id,node_id,skill_key,material_key,respawn_min]
const COLLECTING_NODES = [
  ['cn_chengdu','chengdu','cayao','herb_chucai',10],
  ['cn_nanjiang','nanjiang_entrance','cayao','herb_jingcai',10],
  ['cn_wudu','wudu','cayao','herb_gucao',15],
  ['cn_dali','dali','cayao','herb_ginseng',15],
  ['cn_changbai','changbai','cayao','herb_xuelian',20],
  ['cn_xiye','desert','kuang','ore_tie',10],
  ['cn_kunlun','kunlun','kuang','ore_xuantie',20],
  ['cn_beihuang','beihuang_town','kuang','ore_chijin',25],
  ['cn_yanyang','yanyang','famu','wood_jing',10],
  ['cn_donghai','seaway','buyu','herb_luoshi',15],
  ['cn_quanzhou','pier','buyu','wood_chu',10],
];

// ===== 配方 16 条 =====
// [key,name,skill_key,level_req,inputs,output_key,output_type,count,success_rate,desc]
const RECIPES = [
  ['r_jincang','炼药·金疮药','lianyao',1,{'herb_chucai':3},'jincang_yao','medicine',1,0.80,'三株初阶草药炼一瓶金疮药。'],
  ['r_shengji','炼药·生肌汤','lianyao',2,{'herb_luoshi':2,'herb_jingcai':1},'sheng_ji_tang','medicine',1,0.80,'露丝草与精草药熬汤。'],
  ['r_dahuan','炼药·大还丹','lianyao',4,{'herb_jingcai':2,'herb_yangrou':1},'da_huan_dan','medicine',1,0.70,'精药两株配阳柔草。'],
  ['r_jiuzhuan','炼药·九转金疮','lianyao',7,{'herb_ginseng':2,'herb_jiuzhuan':1},'jiu_zhuan_jincang','medicine',1,0.50,'野山参配九转灵芝。'],
  ['r_huanhun','炼药·还魂丹','lianyao',9,{'herb_xuelian':2,'other_yao_dan':1},'huan_hun_dan','medicine',1,0.40,'雪莲配妖丹，九死还生。'],
  ['r_jiedu','炼药·解毒散','lianyao',2,{'herb_yinyang':1,'herb_luoshi':1},'jie_du_san','medicine',1,0.85,'阴阳藤与露丝草合制。'],
  ['r_huoyu','炼药·寒玉丹','lianyao',5,{'ore_hanyu':1,'herb_yinyang':1},'han_yu_dan','medicine',1,0.65,'寒玉粉配阴阳藤。'],
  ['r_tie_jian','锻造·铁剑','duanzao',2,{'ore_tie':2,'wood_chu':1},'tiejian','equipment',1,0.80,'铁矿石两锭锻一剑。'],
  ['r_jinggang','锻造·精钢剑','duanzao',4,{'ore_gang':2,'wood_chu':1},'jinggang_jian','equipment',1,0.70,'精铁矿锻好剑。'],
  ['r_qinggang','锻造·青钢剑','duanzao',6,{'ore_gang':3,'ore_tie':2},'qinggang_jian','equipment',1,0.60,'青钢需反复淬火。'],
  ['r_yuchang','锻造·鱼肠剑','duanzao',8,{'ore_xuantie':2,'ore_tie':3},'yuchang_jian','equipment',1,0.45,'玄铁入剑身，淬毒自施。'],
  ['r_zhanlu','锻造·湛卢','duanzao',10,{'ore_xuantie':3,'ore_hanyu':1},'zhanlu','equipment',1,0.30,'玄铁配寒玉，铸仁道之剑。'],
  ['r_shaoji_c','烹饪·烧鸡','pengren',2,{'wood_chu':1},'shaoji','life_good',2,0.85,'柴火烧鸡两只。'],
  ['r_hongshao','烹饪·红烧肉','pengren',4,{'wood_jing':1},'hongshao','life_good',2,0.70,'硬木文火炖肉两碗。'],
  ['r_buyi_f','缝纫·布衣','fengren',2,{'leather_shou':2},'buyi','equipment',1,0.85,'两整张兽皮缝一件衣。'],
  ['r_pijia_f','缝纫·皮甲','fengren',4,{'leather_shou':3,'wood_jing':1},'pijia','equipment',1,0.65,'三张皮鞣制一副皮甲。'],
  ['r_tayun','缝纫·踏云靴','fengren',8,{'leather_xue':3},'tayun_xie','equipment',1,0.40,'雪狼皮缝轻功靴。'],
];

// ===== 野怪 22 只 =====
// [key,name,node_id,level,hp,atk,def,exp,silver,style,drops,respawn_min]
const ORANGE_EQUIP = ['fangtian_ji','guiya_dao','xuanmie_zhang','jia_kui','shanjia','xuantie_wan','xueyu_pei'];
const MONSTERS = [
  ['m_huangpi','黄皮子','qingshi',1,30,5,1,10,0.5,'qiao',[{key:'leather_shou',chance:0.30,count:1}],5],
  ['m_shanlang','山狼','qingshi',3,45,8,2,18,1,'gang',[{key:'leather_shou',chance:0.40,count:1}],5],
  ['m_chimu_huan','赤目獾','luoyang',6,80,12,4,35,2,'gang',[{key:'leather_shou',chance:0.30,count:1},{key:'herb_chucai',chance:0.25,count:1}],5],
  ['m_shanxiong','山熊','huashan',10,140,18,7,60,4,'gang',[{key:'leather_lang',chance:0.50,count:1}],10],
  ['m_hufu','虎符妖','xiangyang',14,200,24,9,90,6,'qiao',[{key:'herb_jingcai',chance:0.30,count:1}],10],
  ['m_sha_jiang','沙匪','desert',8,100,14,5,45,8,'gang',[{key:'ore_tie',chance:0.20,count:1},{key:'siyan',chance:0.30,count:1}],10],
  ['m_tu_yan','土魃','oasis',18,300,30,12,130,10,'gang',[{key:'ore_gang',chance:0.40,count:1}],15],
  ['m_gu_diao','蛊雕','kunlun',22,380,33,12,160,12,'qiao',[{key:'ore_xuantie',chance:0.35,count:1}],15],
  ['m_dang_kang','当康','tianshan',15,220,22,8,95,8,'nei',[{key:'herb_xuelian',chance:0.30,count:1}],15],
  ['m_zhuyan','朱厌','tianshan_peak',25,420,36,14,180,15,'gang',[{key:'other_yao_dan',chance:0.40,count:1}],20],
  ['m_luan','鸾鸟','emei',12,170,21,8,75,5,'qiao',[{key:'herb_lingcao',chance:0.30,count:1}],10],
  ['m_wu_gu','五毒蛊王','wudu',30,550,42,18,250,20,'qiao',[{key:'herb_gucao',chance:0.50,count:1}],20],
  ['m_tan_yao','瘴妖','poison_marsh',20,320,32,10,140,10,'qiao',[{key:'herb_gucao',chance:0.30,count:1}],15],
  ['m_duan_shou','断首罗刹','oldcase',26,450,38,15,200,18,'gang',[{key:'other_yao_dan',chance:0.30,count:1}],20],
  ['m_hai_dao','海盗喽啰','wumingdao',16,260,26,10,110,15,'gang',[{key:'siyan',chance:0.40,count:1}],15],
  ['m_jing_ben','海蛇','seaway',24,400,35,13,170,14,'gang',[{key:'leather_xue',chance:0.35,count:1}],15],
  ['m_zhou_jiang','舟将水鬼','pier',19,330,31,11,150,11,'qiao',[{key:'herb_luoshi',chance:0.40,count:1}],15],
  ['m_tu_jin','海驮','quanzhou',21,360,33,14,160,13,'gang',[{key:'wood_jingang',chance:0.15,count:1}],15],
  ['m_bai_lang','雪原白狼','changbai',28,520,40,16,230,18,'gang',[{key:'leather_xue',chance:0.50,count:1}],20],
  ['m_ying_tian','鹰天隼','snowfield',26,480,38,14,210,16,'qiao',[{key:'leather_lang',chance:0.40,count:1}],20],
  ['m_qiong_qi','穷奇','beihuang_town',45,1300,72,30,650,80,'gang',[{key:'leather_qionqi',chance:0.80,count:1},{key:'orange_equipment',chance:0.15,count:1}],30],
  ['m_tao_wu','梼杌','yanmen',50,1600,85,35,950,120,'gang',[{key:'other_ya_lin',chance:0.90,count:1},{key:'orange_equipment',chance:0.25,count:1}],30],
];
module.exports = {
  FAC_ID_MAP, FAC_NAMES, SPECIAL_EFFECTS, EQUIPMENTS, MEDICINES, MATERIALS,
  LIFE_GOODS, LIFE_SKILLS, COLLECTING_NODES, RECIPES, MONSTERS, ORANGE_EQUIP,
};
