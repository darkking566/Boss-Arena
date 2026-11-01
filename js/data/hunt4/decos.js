'use strict';
// 狩獵模式（4v1）裝飾珠純資料：原作《魔物獵人 荒野》全部 361 顆珠子（名稱、孔位大小、技能與等級）＋本模式的技能效果。
// 珠子清單照 gamewith 裝飾品一覽（2026-11）；技能效果換算成本遊戲的戰鬥管線，原作採集 / 探索類技能沒有 fx（照樣會掉、AI 不會鑲）。
// fx 每級數值：atk 傷害 / aff 會心率（期望值）/ cd 會心傷害 / el、ail 屬性值、異常值（on = 限定哪種屬性 / 異常，'*' = 任何）/ elc、ailc 會心時屬性 / 異常加成
//   taken 受傷減少 / sharp 銳利度上限 / keep 銳利度消耗減少 / whet 磨刀時間減少 / free 磨刀後幾秒不耗銳利度 / ko 暈眩值 / brk 部位破壞 / wound 傷口累積 / post 架勢傷害
//   heal 喝藥多回（最大生命比例）/ regen 每秒回血 / sta 每秒回耐力（比例）/ quick 喝藥硬直減少 / aggro 仇恨減少 / res 異常狀態時間縮短 / buff 增益時間延長
//   poison 毒傷害 / eye 心眼（被彈開的懲罰減輕，3 級不彈刀）/ mt 達人藝 / coat 弓的瓶追加（異常）/ flash 閃光彈 +1 / fdur 閃光目眩時間 / dust 生命粉塵 +1 / swap 換武器硬直減少
//   wp：只對哪些武器有效；if：條件（見 engine/hunt4/gear.js COND）。kind：w 武器珠 / a 防具珠
(function (G) {
  const BD = G.BD, H4 = BD.HUNT4;
  const R = ['bow', 'lightxbow', 'heavyxbow'], GUARD = ['sns', 'lance', 'gunlance', 'chargeblade', 'gs'];
  const S = (name, kind, max, fx) => ({ name, kind, max, fx });
  const NEW = {
    atk: S('攻擊', 'w', 5, { atk: 0.03 }), eye: S('看破', 'w', 5, { aff: 0.05 }), critBoost: S('超會心', 'w', 5, { cd: 0.05 }),
    fireA: S('火屬性攻擊強化', 'w', 3, { el: 0.15, on: 'fire' }), waterA: S('水屬性攻擊強化', 'w', 3, { el: 0.15, on: 'water' }), thunderA: S('雷屬性攻擊強化', 'w', 3, { el: 0.15, on: 'thunder' }),
    iceA: S('冰屬性攻擊強化', 'w', 3, { el: 0.15, on: 'ice' }), dragonA: S('龍屬性攻擊強化', 'w', 3, { el: 0.15, on: 'dragon' }),
    poisonA: S('毒屬性強化', 'w', 3, { ail: 0.15, on: 'poison' }), paraA: S('麻痺屬性強化', 'w', 3, { ail: 0.15, on: 'paralysis' }),
    sleepA: S('睡眠屬性強化', 'w', 3, { ail: 0.15, on: 'sleep' }), blastA: S('爆破屬性強化', 'w', 3, { ail: 0.15, on: 'blast' }),
    critEl: S('會心擊【屬性】', 'w', 3, { elc: 0.12 }), critSt: S('會心擊【特殊】', 'w', 3, { ailc: 0.12 }), poisonDmg: S('毒傷害強化', 'w', 3, { poison: 0.15 }),
    handi: S('匠', 'w', 5, { sharp: 0.1 }), razor: S('利刃', 'w', 5, { keep: 0.12 }), whet: S('砥石使用高速化', 'w', 3, { whet: 0.25 }), grind: S('剛刃研磨', 'w', 3, { free: 8 }),
    mind: S('心眼', 'w', 3, { eye: 1 }), master: S('達人藝', 'w', 1, { mt: 1 }), ko: S('昏厥術', 'w', 3, { ko: 0.15 }), drain: S('奪取耐力', 'w', 3, { post: 0.08 }),
    buff: S('強化持續', 'w', 3, { buff: 0.15 }), guardUp: S('防禦強化', 'w', 3, { taken: 0.02, wp: GUARD }), guardP: S('防禦性能', 'w', 3, { taken: 0.04, wp: GUARD }),
    drawT: S('拔刀術【技】', 'w', 3, { aff: 0.15, if: 'first' }), drawP: S('拔刀術【力】', 'w', 3, { atk: 0.04, ko: 0.1, if: 'first' }),
    focus: S('集中', 'w', 3, { atk: 0.03, wp: ['gs', 'bow', 'switchaxe', 'chargeblade', 'glaive'] }), charge: S('蓄打強化', 'w', 1, { atk: 0.06, wp: ['hammer', 'gs'] }),
    cmaster: S('蓄力大師', 'w', 3, { el: 0.1, on: '*', wp: ['gs', 'hammer', 'bow', 'switchaxe', 'chargeblade'] }), blunt: S('鈍器能手', 'w', 3, { atk: 0.04, ko: 0.05, wp: ['hammer', 'horn'] }),
    morph: S('高速變形', 'w', 3, { atk: 0.04, wp: ['switchaxe', 'chargeblade'] }), horn: S('吹笛名人', 'w', 2, { atk: 0.04, wp: ['horn'] }), aerial: S('飛燕', 'w', 1, { atk: 0.08, wp: ['glaive'] }),
    shell: S('砲彈裝填', 'w', 2, { atk: 0.03, wp: ['gunlance'] }), artillery: S('砲術', 'w', 3, { atk: 0.05, wp: ['gunlance'] }),
    ammo: S('彈導強化', 'w', 3, { atk: 0.03, wp: R }), first: S('首發射擊', 'w', 3, { atk: 0.08, if: 'first', wp: R }), force: S('蓄能射擊', 'w', 3, { atk: 0.02, post: 0.05, wp: R }),
    normal: S('通常彈・通常箭強化', 'w', 1, { atk: 0.05, wp: R }), pierce: S('貫通彈・龍之箭強化', 'w', 1, { atk: 0.05, wp: R }), spread: S('散彈・剛射強化', 'w', 1, { atk: 0.05, wp: R }),
    rapid: S('速射強化', 'w', 1, { atk: 0.06, wp: ['lightxbow'] }), special: S('特殊射擊強化', 'w', 2, { atk: 0.05, wp: ['lightxbow', 'heavyxbow'] }),
    sleepCoat: S('睡眠瓶追加', 'w', 1, { coat: 'sleep', wp: ['bow'] }), poisonCoat: S('毒瓶追加', 'w', 1, { coat: 'poison', wp: ['bow'] }),
    paraCoat: S('麻痺瓶追加', 'w', 1, { coat: 'paralysis', wp: ['bow'] }), blastCoat: S('爆破瓶追加', 'w', 1, { coat: 'blast', wp: ['bow'] }), exhaustCoat: S('減氣瓶追加', 'w', 1, { post: 0.15, wp: ['bow'] }),

    intim: S('威嚇', 'a', 3, { aggro: 0.15 }), divine: S('精靈加護', 'a', 5, { taken: 0.03 }), defense: S('防禦', 'a', 7, { taken: 0.02 }),
    counter: S('逆襲', 'a', 3, { atk: 0.05, if: 'struck' }), resent: S('怨恨', 'a', 5, { atk: 0.02, if: 'hurt' }), heroics: S('火場怪力', 'a', 5, { atk: 0.05, if: 'lowhp' }),
    peak: S('無傷', 'a', 3, { atk: 0.03, if: 'fullhp' }), might: S('渾身', 'a', 3, { aff: 0.1, if: 'stam' }), foray: S('攻勢', 'a', 3, { atk: 0.03, aff: 0.05, if: 'ailing' }),
    latent: S('力量解放', 'a', 5, { aff: 0.1, if: 'latent' }), rush: S('巧擊', 'a', 3, { atk: 0.05, if: 'rush' }), coalesce: S('因禍得福', 'a', 3, { aff: 0.05, if: 'struck' }),
    ambush: S('急襲', 'a', 3, { atk: 0.06, if: 'first' }), flayer: S('鎖刃刺擊', 'a', 3, { wound: 0.15 }), partbreak: S('破壞王', 'a', 3, { brk: 0.15 }),
    bomber: S('炸彈客', 'a', 3, { ail: 0.1, on: 'blast' }), recUp: S('體力回復量提升', 'a', 3, { heal: 0.05 }), recSpeed: S('回復速度', 'a', 3, { regen: 0.002 }),
    eat: S('速食', 'a', 3, { quick: 0.2 }), sheathe: S('收刀術', 'a', 3, { swap: 0.2 }), flash: S('閃光強化', 'a', 3, { flash: 1 }), prolong: S('道具使用強化', 'a', 3, { fdur: 0.15 }),
    wide: S('廣域化', 'a', 5, { dust: 1 }), surge: S('耐力急速回復', 'a', 3, { sta: 0.08 }), runner: S('跑者', 'a', 3, { sta: 0.05 }), constit: S('體術', 'a', 5, { sta: 0.05 }),
    evadeDist: S('迴避距離提升', 'a', 3, { sta: 0.04 }), leap: S('飛撲', 'a', 1, { sta: 0.03 }),
    buffer: S('緩衝', 'a', 3, { taken: 0.02 }), jump: S('跳躍鐵人', 'a', 3, { taken: 0.02 }), earplug: S('耳塞', 'a', 3, { taken: 0.02 }), wind: S('風壓耐性', 'a', 3, { taken: 0.02 }),
    flinch: S('減輕膽怯', 'a', 3, { taken: 0.02 }), fireR: S('火耐性', 'a', 3, { taken: 0.02 }), waterR: S('水耐性', 'a', 3, { taken: 0.02 }), thunderR: S('雷耐性', 'a', 3, { taken: 0.02 }),
    iceR: S('冰耐性', 'a', 3, { taken: 0.02 }), dragonR: S('龍耐性', 'a', 3, { taken: 0.02 }),
    poisonR: S('毒耐性', 'a', 3, { res: 0.25 }), paraR: S('麻痺耐性', 'a', 3, { res: 0.25 }), sleepR: S('睡眠耐性', 'a', 3, { res: 0.25 }), stunR: S('昏厥耐性', 'a', 3, { res: 0.25 }),
    blastR: S('爆破異常耐性', 'a', 3, { res: 0.25 }), bleedR: S('裂傷耐性', 'a', 3, { res: 0.25 }), defR: S('防禦力DOWN耐性', 'a', 3, { res: 0.25 }), bindR: S('拘束耐性', 'a', 3, { res: 0.25 }),
    stenchR: S('惡臭耐性', 'a', 3, { res: 0.25 }),
    life: S('獵人生活', 'a', 3), envKnow: S('環境利用知識', 'a', 3), polish: S('研鑽', 'a', 3), antiv: S('無我之境', 'a', 3), maint: S('整備', 'a', 3), meal: S('滿足感', 'a', 3),
    botany: S('植生學', 'a', 4), geo: S('地質學', 'a', 3), entomo: S('昆蟲標本達人', 'a', 1), mush: S('蘑菇大師', 'a', 3), climber: S('攀爬者', 'a', 1), swamp: S('水場・油泥適應', 'a', 2),
    adapt: S('環境適應', 'a', 3), hunger: S('耐餓', 'a', 3),
  };
  // 舊有的 Boss 防具技能也能用珠子疊：改成通用 fx（耐震 / 攻擊守勢 / 弱點特效 / 挑戰者），迴避性能 / 連擊 / 逆境維持專用程式
  const SK = H4.SKILLS;
  Object.assign(SK.guard, { kind: 'a', max: 3, fx: { taken: 0.06 } });
  Object.assign(SK.offguard, { kind: 'w', max: 5, fx: { atk: 0.08, if: 'og' } });
  Object.assign(SK.weakex, { kind: 'a', max: 5, fx: { atk: 0.06, if: 'weak' } });
  Object.assign(SK.challenger, { kind: 'a', max: 5, fx: { atk: 0.08, if: 'p2' } });
  Object.assign(SK.evade, { kind: 'a', max: 5, pw: 0.5 }); Object.assign(SK.combo, { name: '連擊', kind: 'a', max: 3, pw: 0.8 }); Object.assign(SK.adversity, { kind: 'a', max: 3, pw: 0.5 });
  // AI 鑲珠用：依效果種類給個性偏好 aff 與每級份量 pw（直接加傷害的最重，有條件的打六折）；Boss 防具原本的 aff 不動
  // 只在會心時有用的（超會心、會心擊、達人藝）打折：AI 不算技能之間的搭配
  const AFF = [[['cd', 'elc', 'ailc', 'mt'], { risk: 0.5, show: 0.5 }, 0.3], [['atk', 'aff', 'el', 'ail', 'poison', 'coat'], { risk: 0.5, show: 0.5 }, 1], [['taken', 'heal', 'regen', 'res', 'quick', 'flash', 'fdur', 'dust'], { care: 1 }, 0.7],
    [['ko', 'brk', 'wound', 'post'], { team: 0.5, patience: 0.5 }, 0.5], [['aggro'], { care: 0.5, team: 0.5 }, 0.5], [['sharp', 'keep', 'whet', 'free', 'eye', 'mt'], { patience: 1 }, 0.4],
    [['sta', 'swap', 'buff'], { risk: 0.5, learn: 0.5 }, 0.3]];
  for (const k in NEW) SK[k] = NEW[k];
  for (const k in SK) { const s = SK[k], e = s.fx && AFF.find(([fs]) => fs.some((f) => f in s.fx)); if (e) { s.aff = s.aff || e[1]; s.pw = e[2] * (s.fx.if ? 0.6 : 1); } else s.pw = s.pw || 0; } // pw 0 = 採集 / 探索類，AI 不鑲

  // 珠子：「名稱【孔位】 技能:等級 …」（照原作一覽順序；「・」組合珠）
  const LIST = `
攻擊珠【1】 atk:1|攻擊珠Ⅱ【2】 atk:2|攻擊珠Ⅲ【3】 atk:3|威嚇珠【1】 intim:1|迴避珠【2】 evade:1
火炎・強壁珠【3】 fireA:3 guardUp:1|火炎・KO珠【3】 fireA:3 ko:1|火炎・昂揚珠【3】 fireA:3 buff:1|火炎・射法珠【3】 fireA:3 ammo:1|火炎・集中珠【3】 fireA:3 focus:1|火炎・守勢珠【3】 fireA:3 offguard:1|火炎・初彈珠【3】 fireA:3 first:1
火炎珠【1】 fireA:1|火炎珠Ⅲ【3】 fireA:3|火炎珠Ⅱ【2】 fireA:2|火炎・積彈珠【3】 fireA:3 force:1|火炎・速變珠【3】 fireA:3 morph:1|火炎・屬會珠【3】 fireA:3 critEl:1|火炎・匠珠【3】 fireA:3 handi:1|火炎・鐵壁珠【3】 fireA:3 guardP:1|火炎・業物珠【3】 fireA:3 razor:1
加護珠【1】 divine:1|狩人珠【1】 life:1|環境珠【1】 envKnow:1|緩衝珠【1】 buffer:1|貫通珠【3】 pierce:1|急襲珠【2】 ambush:1|強走珠【1】 runner:1|強彈珠【3】 normal:1|強跳珠【1】 jump:1
強毒・KO珠【3】 poisonDmg:1 ko:1|強毒・攻擊珠【3】 poisonDmg:1 atk:1|強毒・射法珠【3】 poisonDmg:1 ammo:1|強毒珠【2】 poisonDmg:1|強毒・匠珠【3】 poisonDmg:1 handi:1|強毒・達人珠【3】 poisonDmg:1 eye:1|強毒・鐵壁珠【3】 poisonDmg:1 guardP:1|強毒・拔刀珠【3】 poisonDmg:1 drawT:1
強壁・火炎珠【3】 guardUp:3 fireA:1|強壁珠【1】 guardUp:1|強壁珠Ⅲ【3】 guardUp:3|強壁珠Ⅱ【2】 guardUp:2|強壁・匠珠【3】 guardUp:3 handi:1|強壁・鐵壁珠【3】 guardUp:3 guardP:1|強壁・破龍珠【3】 guardUp:3 dragonA:1|強壁・冰結珠【3】 guardUp:3 iceA:1|強壁・雷光珠【3】 guardUp:3 thunderA:1|強壁・流水珠【3】 guardUp:3 waterA:1
逆襲珠【2】 counter:1|逆上珠【2】 resent:1|研鑽珠【1】 polish:1
研磨・KO珠【3】 whet:2 ko:1|研磨・攻擊珠【3】 whet:2 atk:1|研磨珠【1】 whet:1|研磨珠Ⅱ【2】 whet:2|研磨・匠珠【3】 whet:2 handi:1|研磨・達人珠【3】 whet:2 eye:1|研磨・鐵壁珠【3】 whet:2 guardP:1|研磨・拔刀珠【3】 whet:2 drawT:1
KO珠【1】 ko:1|KO珠Ⅲ【3】 ko:3|KO珠Ⅱ【2】 ko:2|抗狂珠【1】 antiv:1|攻勢珠【3】 foray:1
昂揚・火炎珠【3】 buff:3 fireA:1|昂揚珠【1】 buff:1|昂揚珠Ⅲ【3】 buff:3|昂揚珠Ⅱ【2】 buff:2|昂揚・匠珠【3】 buff:3 handi:1|昂揚・破龍珠【3】 buff:3 dragonA:1|昂揚・冰結珠【3】 buff:3 iceA:1|昂揚・雷光珠【3】 buff:3 thunderA:1|昂揚・流水珠【3】 buff:3 waterA:1
鼓笛・KO珠【3】 horn:2 ko:1|鼓笛・攻擊珠【3】 horn:2 atk:1|鼓笛珠【2】 horn:1|鼓笛・匠珠【3】 horn:2 handi:1|鼓笛・達人珠【3】 horn:2 eye:1|鼓笛・拔刀珠【3】 horn:2 drawT:1
渾身珠【2】 might:1|剛刃珠【1】 grind:1|剛刃珠Ⅱ【2】 grind:2|剛刃珠Ⅲ【3】 grind:3|散彈珠【3】 spread:1|刺擊珠【3】 flayer:1|射法珠【1】 ammo:1|射法珠Ⅱ【2】 ammo:2|射法珠Ⅲ【3】 ammo:3
集中・火炎珠【3】 focus:3 fireA:1|集中・KO珠【3】 focus:3 ko:1|集中・射法珠【3】 focus:3 ammo:1|集中珠【1】 focus:1|集中珠Ⅲ【3】 focus:3|集中珠Ⅱ【2】 focus:2|集中・匠珠【3】 focus:3 handi:1|集中・破龍珠【3】 focus:3 dragonA:1|集中・冰結珠【3】 focus:3 iceA:1|集中・雷光珠【3】 focus:3 thunderA:1|集中・流水珠【3】 focus:3 waterA:1
守勢・火炎珠【3】 offguard:3 fireA:1|守勢珠【1】 offguard:1|守勢珠Ⅲ【3】 offguard:3|守勢珠Ⅱ【2】 offguard:2|守勢・匠珠【3】 offguard:3 handi:1|守勢・鐵壁珠【3】 offguard:3 guardP:1|守勢・破龍珠【3】 offguard:3 dragonA:1|守勢・冰結珠【3】 offguard:3 iceA:1|守勢・雷光珠【3】 offguard:3 thunderA:1|守勢・流水珠【3】 offguard:3 waterA:1
植學珠【1】 botany:1
初彈・火炎珠【3】 first:3 fireA:1|初彈・射法珠【3】 first:3 ammo:1|初彈珠【1】 first:1|初彈珠Ⅱ【2】 first:2|初彈珠Ⅲ【3】 first:3|初彈・鐵壁珠【3】 first:3 guardP:1|初彈・破龍珠【3】 first:3 dragonA:1|初彈・冰結珠【3】 first:3 iceA:1|初彈・雷光珠【3】 first:3 thunderA:1|初彈・流水珠【3】 first:3 waterA:1
心眼珠【1】 mind:1|心眼珠Ⅱ【2】 mind:2|心眼珠Ⅲ【3】 mind:3|持續珠【1】 prolong:1|重擊珠【2】 partbreak:1|眠瓶珠【3】 sleepCoat:1|睡眠珠【1】 sleepA:1|睡眠珠Ⅲ【3】 sleepA:3|睡眠珠Ⅱ【2】 sleepA:2|整備珠【2】 maint:1
積彈・雷光珠【3】 force:3 thunderA:1|積彈・火炎珠【3】 force:3 fireA:1|積彈・射法珠【3】 force:3 ammo:1|積彈珠【1】 force:1|積彈珠Ⅱ【2】 force:2|積彈珠Ⅲ【3】 force:3|積彈・鐵壁珠【3】 force:3 guardP:1|積彈・破龍珠【3】 force:3 dragonA:1|積彈・冰結珠【3】 force:3 iceA:1|積彈・流水珠【3】 force:3 waterA:1
節食珠【1】 meal:1|閃光珠【1】 flash:1|全開珠【3】 latent:1|早氣珠【2】 surge:1|早食珠【1】 eat:1|早復珠【1】 recSpeed:1|速射珠【3】 rapid:1|速納珠【1】 sheathe:1
速變・火炎珠【3】 morph:3 fireA:1|速變・KO珠【3】 morph:3 ko:1|速變珠【1】 morph:1|速變珠Ⅲ【3】 morph:3|速變珠Ⅱ【2】 morph:2|速變・匠珠【3】 morph:3 handi:1|速變・鐵壁珠【3】 morph:3 guardP:1|速變・破龍珠【3】 morph:3 dragonA:1|速變・冰結珠【3】 morph:3 iceA:1|速變・雷光珠【3】 morph:3 thunderA:1|速變・流水珠【3】 morph:3 waterA:1
底力珠【2】 heroics:1|增彈・攻擊珠【3】 shell:2 atk:1|增彈珠【1】 shell:1|增彈珠Ⅱ【2】 shell:2|增彈・匠珠【3】 shell:2 handi:1|增彈・達人珠【3】 shell:2 eye:1|增彈・鐵壁珠【3】 shell:2 guardP:1|增彈・拔刀珠【3】 shell:2 drawT:1
屬會・火炎珠【3】 critEl:3 fireA:1|屬會・KO珠【3】 critEl:3 ko:1|屬會珠Ⅲ【3】 critEl:3|屬會・射法珠【3】 critEl:3 ammo:1|屬會珠【1】 critEl:1|屬會珠Ⅱ【2】 critEl:2|屬會・匠珠【3】 critEl:3 handi:1|屬會・鐵壁珠【3】 critEl:3 guardP:1|屬會・破龍珠【3】 critEl:3 dragonA:1|屬會・冰結珠【3】 critEl:3 iceA:1|屬會・雷光珠【3】 critEl:3 thunderA:1|屬會・流水珠【3】 critEl:3 waterA:1
耐火珠【1】 fireR:1|耐拘珠【1】 bindR:1|耐臭珠【1】 stenchR:1|耐衝珠【1】 flinch:1|耐震珠【1】 guard:1|體術珠【1】 constit:1|耐水珠【1】 waterR:1|耐絕珠【1】 stunR:1|耐毒珠【1】 poisonR:1|耐爆珠【1】 blastR:1
耐冰珠【1】 iceR:1|耐防珠【1】 defR:1|耐麻珠【1】 paraR:1|耐眠珠【1】 sleepR:1|耐雷珠【1】 thunderR:1|耐龍珠【1】 dragonR:1|耐裂珠【1】 bleedR:1
匠珠【1】 handi:1|匠珠Ⅱ【2】 handi:2|匠珠Ⅲ【3】 handi:3|茸好珠【2】 mush:1|達藝珠【3】 master:1|達人珠【1】 eye:1|達人珠Ⅲ【3】 eye:3|達人珠Ⅱ【2】 eye:2
溜打・KO珠【3】 charge:1 ko:1|溜打・攻擊珠【3】 charge:1 atk:1|溜打珠【2】 charge:1|溜打・匠珠【3】 charge:1 handi:1|溜打・達人珠【3】 charge:1 eye:1|溜打・拔刀珠【3】 charge:1 drawT:1
奪氣珠【1】 drain:1|奪氣珠Ⅲ【3】 drain:3|奪氣珠Ⅱ【2】 drain:2|地學珠【1】 geo:1|治癒珠【1】 recUp:1|超心珠【1】 critBoost:1|超心珠Ⅲ【3】 critBoost:3|超心珠Ⅱ【2】 critBoost:2
挑戰珠【3】 challenger:1|跳躍珠【2】 evadeDist:1|痛擊珠【3】 weakex:1|適應珠【1】 adapt:1|鐵壁珠【1】 guardP:1|鐵壁珠Ⅲ【3】 guardP:3|鐵壁珠Ⅱ【2】 guardP:2|轉福珠【2】 coalesce:1|登壁珠【1】 climber:1
特會・KO珠【3】 critSt:3 ko:1|特會・射法珠【3】 critSt:3 ammo:1|特會珠【1】 critSt:1|特會珠Ⅲ【3】 critSt:3|特會珠Ⅱ【2】 critSt:2|特會・匠珠【3】 critSt:3 handi:1|特會・鐵壁珠【3】 critSt:3 guardP:1
特射珠【1】 special:1|特射珠Ⅱ【2】 special:2|飛込珠【1】 leap:1|毒珠【1】 poisonA:1|毒珠Ⅲ【3】 poisonA:3|毒珠Ⅱ【2】 poisonA:2|毒瓶珠【2】 poisonCoat:1|鈍器珠【1】 blunt:1|鈍器珠Ⅱ【2】 blunt:2|鈍器珠Ⅲ【3】 blunt:3
拔打・鐵壁珠【3】 drawP:3 guardP:1|沼渡珠【1】 swamp:1
破龍・強壁珠【3】 dragonA:3 guardUp:1|破龍・KO珠【3】 dragonA:3 ko:1|破龍・昂揚珠【3】 dragonA:3 buff:1|破龍・射法珠【3】 dragonA:3 ammo:1|破龍・集中珠【3】 dragonA:3 focus:1|破龍・守勢珠【3】 dragonA:3 offguard:1|破龍・初彈珠【3】 dragonA:3 first:1
破龍珠【1】 dragonA:1|破龍珠Ⅲ【3】 dragonA:3|破龍珠Ⅱ【2】 dragonA:2|破龍・積彈珠【3】 dragonA:3 force:1|破龍・速變珠【3】 dragonA:3 morph:1|破龍・屬會珠【3】 dragonA:3 critEl:1|破龍・匠珠【3】 dragonA:3 handi:1|破龍・鐵壁珠【3】 dragonA:3 guardP:1|破龍・業物珠【3】 dragonA:3 razor:1
反攻珠【3】 rush:1|爆師珠【1】 bomber:1|爆破珠【1】 blastA:1|爆破珠Ⅲ【3】 blastA:3|爆破珠Ⅱ【2】 blastA:2|爆瓶珠【2】 blastCoat:1
拔打・KO珠【3】 drawP:3 ko:1|拔刀珠【1】 drawT:1|拔打珠【1】 drawP:1|拔刀珠Ⅲ【3】 drawT:3|拔打珠Ⅲ【3】 drawP:3|拔刀珠Ⅱ【2】 drawT:2|拔打珠Ⅱ【2】 drawP:2|拔打・匠珠【3】 drawP:3 handi:1
飛燕・攻擊珠【3】 aerial:1 atk:1|飛燕珠【2】 aerial:1|飛燕・匠珠【3】 aerial:1 handi:1|飛燕・達人珠【3】 aerial:1 eye:1|飛燕・拔刀珠【3】 aerial:1 drawT:1|痺瓶珠【3】 paraCoat:1|疲瓶珠【2】 exhaustCoat:1
冰結・強壁珠【3】 iceA:3 guardUp:1|冰結・KO珠【3】 iceA:3 ko:1|冰結・昂揚珠【3】 iceA:3 buff:1|冰結・射法珠【3】 iceA:3 ammo:1|冰結・集中珠【3】 iceA:3 focus:1|冰結・守勢珠【3】 iceA:3 offguard:1|冰結・初彈珠【3】 iceA:3 first:1
冰結珠【1】 iceA:1|冰結珠Ⅲ【3】 iceA:3|冰結珠Ⅱ【2】 iceA:2|冰結・積彈珠【3】 iceA:3 force:1|冰結・速變珠【3】 iceA:3 morph:1|冰結・屬會珠【3】 iceA:3 critEl:1|冰結・匠珠【3】 iceA:3 handi:1|冰結・鐵壁珠【3】 iceA:3 guardP:1|冰結・業物珠【3】 iceA:3 razor:1
標本珠【1】 entomo:1|砲術珠【1】 artillery:1|砲術珠Ⅲ【3】 artillery:3|砲術珠Ⅱ【2】 artillery:2|防音珠【2】 earplug:1|防禦珠【1】 defense:1|防風珠【1】 wind:1|麻痺珠【1】 paraA:1|麻痺珠Ⅲ【3】 paraA:3|麻痺珠Ⅱ【2】 paraA:2
無傷珠【2】 peak:1|無食珠【1】 hunger:1|友愛珠【1】 wide:1
雷光・速變珠【3】 thunderA:3 morph:1|雷光・KO珠【3】 thunderA:3 ko:1|雷光・初彈珠【3】 thunderA:3 first:1|雷光・昂揚珠【3】 thunderA:3 buff:1|雷光・守勢珠【3】 thunderA:3 offguard:1|雷光・積彈珠【3】 thunderA:3 force:1
雷光珠【1】 thunderA:1|雷光珠Ⅲ【3】 thunderA:3|雷光珠Ⅱ【2】 thunderA:2|雷光・集中珠【3】 thunderA:3 focus:1|雷光・鐵壁珠【3】 thunderA:3 guardP:1|雷光・屬會珠【3】 thunderA:3 critEl:1|雷光・匠珠【3】 thunderA:3 handi:1|雷光・業物珠【3】 thunderA:3 razor:1|雷光・強壁珠【3】 thunderA:3 guardUp:1|雷光・射法珠【3】 thunderA:3 ammo:1
流水・強壁珠【3】 waterA:3 guardUp:1|流水・KO珠【3】 waterA:3 ko:1|流水・昂揚珠【3】 waterA:3 buff:1|流水・射法珠【3】 waterA:3 ammo:1|流水・集中珠【3】 waterA:3 focus:1|流水・守勢珠【3】 waterA:3 offguard:1|流水・初彈珠【3】 waterA:3 first:1
流水珠【1】 waterA:1|流水珠Ⅲ【3】 waterA:3|流水珠Ⅱ【2】 waterA:2|流水・積彈珠【3】 waterA:3 force:1|流水・速變珠【3】 waterA:3 morph:1|流水・屬會珠【3】 waterA:3 critEl:1|流水・匠珠【3】 waterA:3 handi:1|流水・鐵壁珠【3】 waterA:3 guardP:1|流水・業物珠【3】 waterA:3 razor:1
溜幅・KO珠【3】 cmaster:3 ko:1|溜幅珠【1】 cmaster:1|溜幅珠Ⅲ【3】 cmaster:3|溜幅珠Ⅱ【2】 cmaster:2|溜幅・匠珠【3】 cmaster:3 handi:1|連擊珠【3】 combo:1
業物・火炎珠【3】 razor:3 fireA:1|業物・KO珠【3】 razor:3 ko:1|業物珠【1】 razor:1|業物珠Ⅱ【2】 razor:2|業物珠Ⅲ【3】 razor:3|業物・匠珠【3】 razor:3 handi:1|業物・鐵壁珠【3】 razor:3 guardP:1|業物・破龍珠【3】 razor:3 dragonA:1|業物・冰結珠【3】 razor:3 iceA:1|業物・雷光珠【3】 razor:3 thunderA:1|業物・流水珠【3】 razor:3 waterA:1`;
  // tier：掉落稀有度 1 = 1 孔、2 = 2 孔、3 = 3 孔單技能、4 = 3 孔組合珠
  H4.DECOS = {};
  for (const s of LIST.trim().split(/[|\n]/)) {
    const [name, ...sk] = s.trim().split(' '), slot = +name.match(/【(\d)】/)[1], skills = sk.map((x) => { const [k, l] = x.split(':'); return [k, +l]; });
    H4.DECOS[name] = { name, slot, kind: SK[skills[0][0]].kind, skills, tier: slot < 3 ? slot : skills.length > 1 ? 4 : 3 };
  }
  // 孔位：武器依等級（0 = 初始武器）、防具依等級
  H4.DECO_SLOTS = { w: [[1], [1], [2, 1], [3, 2, 1]], a: [null, [1], [2, 1]] };
  // 掉落（每位獵人各自擲）：機率 base + perBreak × 破壞數（上限 max）；稀有度權重隨 Boss 星數（1.5~5）：越強的 Boss 才掉得出 3 孔 / 組合珠
  H4.DECO_DROP = { base: 0.3, perBreak: 0.05, max: 0.6, w: (s) => [8, 2 + s, Math.max(0, s - 1.5) * 1.2, Math.max(0, s - 2.5) * 0.8] };
})(typeof window !== 'undefined' ? window : globalThis);
