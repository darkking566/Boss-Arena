'use strict';
// 獵魂模式（Soul Hunt）資料：8 種初始武器、強化項目、每位 Boss 的被動 / 套裝（純資料，不碰 DOM）
// 數值皆為「沉重節奏」最終值（主角定義不經 BD.applyPace 轉換）。
(function (G) {
  const BD = G.BD, { D } = BD.DataKit;
  const hit = (at, shape, p) => Object.assign({ do: 'hit', at }, shape, p);
  const cone = (r, arcDeg) => ({ shape: 'cone', r, arc: arcDeg * D });
  const circle = (r) => ({ shape: 'circle', r });
  const bolt = (at, p) => Object.assign({ do: 'proj', at, n: 1, life: 1.3 }, p);

  // 武器：兩招（左鍵 / 右鍵）。res:'mana' 的招式耗法力，其餘耗體力。
  const WEAPONS = [
    { id: 'bow', name: '弓箭', icon: '🏹', el: 'physical', ai: [380, 700], bonus: { spd: 0.03 },
      desc: '遠距離輕快射擊。左鍵射箭；右鍵三連箭（扇形）。',
      skills: [
        { id: 'w_shot', name: '射箭', short: '射箭', tags: ['ranged', 'fast'], range: [0, 900], cd: 0.3, cost: 9, track: 10, recovery: 0.22,
          actions: [bolt(0.34, { speed: 1000, r: 7, dmg: 40, posture: 10, kb: 60, kind: 'arrow' })] },
        { id: 'w_volley', name: '三連箭', short: '三連箭', tags: ['ranged'], range: [0, 800], cd: 4, cost: 20, track: 8, recovery: 0.35,
          actions: [bolt(0.5, { n: 3, spread: 0.15, speed: 980, r: 7, dmg: 30, posture: 9, kb: 50, kind: 'arrow' })] },
      ] },
    { id: 'greatsword', name: '雙手劍', icon: '⚔️', el: 'physical', ai: [60, 150], bonus: { def: 0.03 },
      desc: '均衡的大範圍斬擊。左鍵橫斬；右鍵蓄力重劈（高架勢傷害）。',
      skills: [
        { id: 'w_cleave', name: '橫斬', short: '橫斬', tags: ['melee'], range: [0, 150], cd: 0.2, cost: 20, track: 6, recovery: 0.5,
          actions: [hit(0.38, cone(140, 120), { dmg: 78, posture: 24, kb: 220, fx: 'slash' })] },
        { id: 'w_overhead', name: '蓄力重劈', short: '重劈', tags: ['melee', 'aoe'], range: [0, 170], cd: 5, cost: 34, track: 5, recovery: 0.75,
          actions: [hit(0.85, cone(170, 100), { dmg: 175, posture: 75, kb: 420, fx: { id: 'slash', scale: 1.4 } })] },
      ] },
    { id: 'daggers', name: '雙刀', icon: '🗡️', el: 'physical', ai: [50, 110], bonus: { spd: 0.06 },
      desc: '極快的連斬，傷害細碎但出手不間斷。左鍵雙連斬；右鍵旋刃（三段旋轉）。',
      skills: [
        { id: 'w_twin', name: '雙連斬', short: '雙連斬', tags: ['melee', 'fast'], range: [0, 110], cd: 0.15, cost: 14, track: 8, recovery: 0.3,
          actions: [hit(0.15, cone(105, 100), { dmg: 32, posture: 10, kb: 90, fx: 'slash' }), hit(0.32, cone(105, 100), { dmg: 32, posture: 10, kb: 90, fx: 'slash' })] },
        { id: 'w_whirl', name: '旋刃', short: '旋刃', tags: ['melee', 'aoe'], range: [0, 120], cd: 6, cost: 28, track: 4, recovery: 0.4,
          actions: [0.2, 0.4, 0.6].map((t) => hit(t, circle(118), { dmg: 36, posture: 11, kb: 130, fx: 'whirl' })) },
      ] },
    { id: 'greataxe', name: '巨斧', icon: '🪓', el: 'physical', ai: [60, 160], bonus: { hp: 80 },
      desc: '緩慢而沉重。左鍵劈斬；右鍵碎地（範圍震擊，架勢傷害極高）。',
      skills: [
        { id: 'w_chop', name: '劈斬', short: '劈斬', tags: ['melee'], range: [0, 165], cd: 0.3, cost: 28, track: 5, recovery: 0.7,
          actions: [hit(0.6, cone(165, 90), { dmg: 115, posture: 38, kb: 320, fx: { id: 'slash', scale: 1.3 } })] },
        { id: 'w_shatter', name: '碎地', short: '碎地', tags: ['melee', 'aoe'], range: [0, 180], cd: 8, cost: 40, track: 4, recovery: 0.95,
          actions: [hit(0.95, circle(175), { dmg: 200, posture: 95, kb: 500, fx: 'slam' })] },
      ] },
    { id: 'katana', name: '太刀', icon: '🔪', el: 'physical', ai: [80, 170], bonus: { staRegen: 0.1 }, traits: ['deflect', 'counter'],
      desc: '拚刀太刀：左鍵五式連斬（不耗體力、可不間斷進攻），揮刀瞬間若剛好擋下攻擊就是「彈刀」——近戰攻擊免傷並反震敵人架勢、投射物會被打回；連斬命中累積「氣刃」，右鍵消耗氣刃接氣刃斬 I→II→III→氣刃大回旋斬（命中提升練氣等級：白 / 黃 / 紅）；Q 見切斬（架式中被打中就反擊並回氣）；E 居合。',
      skills: [
        { id: 'k_a1', grp: 'a', sw: 'cw', name: '踏步斬', short: '連斬', tags: ['melee', 'fast'], range: [0, 150], cd: 0.05, cost: 0, track: 7, creep: 0.5, recovery: 0.26,
          actions: [hit(0.22, cone(150, 80), { dmg: 52, posture: 14, kb: 120, fx: 'slash' })] },
        { id: 'k_s1', grp: 's', name: '氣刃斬 I', short: '氣刃', tags: ['melee', 'gap'], range: [0, 220], cd: 0.05, cost: 10, res: 'spirit', track: 8, recovery: 0.3,
          actions: [{ do: 'dash', at: 0.15, dist: 120, dur: 0.1 }, hit(0.27, cone(150, 90), { dmg: 62, posture: 18, kb: 160, fx: 'slash' })] },
        { id: 'k_mikiri', name: '見切斬', short: '見切', tags: ['counter', 'defensive'], range: [0, 300], cd: 4, cost: 12, track: 8, recovery: 0.4,
          actions: [{ do: 'counter', at: 0, dur: 0.8, dmg: 140, posture: 70, fx: 'mikiri', slowmo: 0.3 }] },
        { id: 'w_iai', name: '居合', short: '居合', tags: ['gap'], range: [60, 330], cd: 5, cost: 26, track: 8, recovery: 0.5,
          actions: [{ do: 'dash', at: 0.4, dist: 300, dur: 0.13, iframe: true, fx: 'iaido', hit: { dmg: 110, posture: 40, kb: 250 } }] },
      ],
      // 連段變體：不佔技能欄，由 BD.Hunt 的太刀邏輯依連段順序挑選（見 js/engine/hunt.js）；sw = 揮刀動作（供繪圖）
      variants: [
        { id: 'k_a2', grp: 'a', sw: 'ccw', name: '返し斬', short: '連斬', tags: ['melee', 'fast'], range: [0, 150], cd: 0.05, cost: 0, track: 7, creep: 0.4, recovery: 0.26,
          actions: [hit(0.2, cone(155, 100), { dmg: 56, posture: 15, kb: 130, fx: 'slash' })] },
        { id: 'k_a3', grp: 'a', sw: 'thrust', name: '突刺', short: '連斬', tags: ['melee', 'gap'], range: [0, 230], cd: 0.05, cost: 0, track: 8, recovery: 0.32,
          actions: [{ do: 'dash', at: 0.14, dist: 80, dur: 0.08 }, hit(0.22, { shape: 'rect', len: 200, w: 70 }, { dmg: 66, posture: 20, kb: 200, fx: 'thrust' })] },
        { id: 'k_a4', grp: 'a', sw: 'spin', name: '旋身斬', short: '連斬', tags: ['melee', 'aoe'], range: [0, 160], cd: 0.05, cost: 0, track: 6, recovery: 0.34,
          actions: [hit(0.24, circle(155), { dmg: 64, posture: 20, kb: 200, fx: 'whirl' })] },
        { id: 'k_a5', grp: 'a', sw: 'down', name: '袈裟落斬', short: '連斬', tags: ['melee'], range: [0, 170], cd: 0.05, cost: 0, track: 6, recovery: 0.5,
          actions: [hit(0.3, cone(170, 110), { dmg: 98, posture: 34, kb: 300, fx: { id: 'slash', scale: 1.3 } })] },
        { id: 'k_s2', grp: 's', name: '氣刃斬 II', short: '氣刃', tags: ['melee', 'gap'], range: [0, 200], cd: 0.05, cost: 10, res: 'spirit', track: 8, recovery: 0.3,
          actions: [{ do: 'dash', at: 0.14, dist: 90, dur: 0.1 }, hit(0.26, cone(150, 90), { dmg: 68, posture: 20, kb: 170, fx: 'slash' })] },
        { id: 'k_s3', grp: 's', name: '氣刃斬 III', short: '氣刃', tags: ['melee'], range: [0, 180], cd: 0.05, cost: 10, res: 'spirit', track: 7, recovery: 0.4,
          actions: [hit(0.25, cone(175, 120), { dmg: 92, posture: 32, kb: 280, fx: { id: 'slash', scale: 1.3 } })] },
        { id: 'k_spin', grp: 's', name: '氣刃大回旋斬', short: '大回旋', tags: ['melee', 'aoe'], range: [0, 190], cd: 0.05, cost: 25, res: 'spirit', track: 3, recovery: 0.6,
          actions: [hit(0.3, circle(185), { dmg: 55, posture: 15, kb: 160, fx: 'whirl' }), hit(0.45, circle(185), { dmg: 55, posture: 15, kb: 160, fx: 'whirl' }),
            hit(0.62, circle(195), { dmg: 100, posture: 55, kb: 380, fx: { id: 'whirl', scale: 1.3 } })] },
      ] },
    { id: 'staff', name: '法杖', icon: '🔮', el: 'arcane', ai: [380, 650], bonus: { mana: 40, manaRegen: 0.3 },
      desc: '以法力施法（不耗體力）。左鍵秘法彈；右鍵星隕（落在滑鼠位置的爆炸）。',
      skills: [
        { id: 'w_bolt', name: '秘法彈', short: '秘法彈', tags: ['ranged', 'fast'], range: [0, 800], cd: 0.3, cost: 6, res: 'mana', track: 9, recovery: 0.25,
          actions: [bolt(0.3, { speed: 780, r: 10, dmg: 44, posture: 12, kb: 70, kind: 'magic' })] },
        { id: 'w_starfall', name: '星隕', short: '星隕', tags: ['ranged', 'aoe'], range: [0, 800], cd: 5, cost: 24, res: 'mana', track: 8, recovery: 0.4,
          actions: [{ do: 'lob', at: 0.25, n: 1, scatter: 0, flight: 0.7, r: 110, dmg: 135, posture: 50, kb: 220, kind: 'magic' }] },
      ] },
    { id: 'lightxbow', name: '輕弩', icon: '🎯', el: 'physical', ai: [320, 620], bonus: { sta: 10 },
      desc: '穩定的中距離連射。左鍵弩矢；右鍵速射（連發三矢）。',
      skills: [
        { id: 'w_bolt1', name: '弩矢', short: '弩矢', tags: ['ranged', 'fast'], range: [0, 800], cd: 0.55, cost: 10, track: 9, recovery: 0.3,
          actions: [bolt(0.28, { speed: 1250, r: 7, dmg: 48, posture: 13, kb: 80, kind: 'bolt' })] },
        { id: 'w_rapid', name: '速射', short: '速射', tags: ['ranged'], range: [0, 760], cd: 5, cost: 24, track: 10, recovery: 0.4,
          actions: [0.2, 0.38, 0.56].map((t) => bolt(t, { speed: 1250, r: 7, dmg: 36, posture: 10, kb: 60, kind: 'bolt' })) },
      ] },
    { id: 'heavyxbow', name: '重弩', icon: '🏴', el: 'physical', ai: [420, 760], bonus: { dmg: 0.04 },
      desc: '裝填慢但一發沉重，箭矢貫穿。左鍵重弩矢；右鍵破甲弩矢（命中後敵人易傷）。',
      skills: [
        { id: 'w_heavy', name: '重弩矢', short: '重弩矢', tags: ['ranged'], range: [0, 950], cd: 1.2, cost: 26, track: 6, recovery: 0.8,
          actions: [bolt(0.6, { speed: 1500, r: 9, dmg: 125, posture: 48, kb: 220, pierce: true, kind: 'bolt' })] },
        { id: 'w_pierce', name: '破甲弩矢', short: '破甲', tags: ['ranged'], range: [0, 950], cd: 9, cost: 36, track: 5, recovery: 0.9,
          actions: [bolt(1.0, { speed: 1600, r: 10, dmg: 185, posture: 95, kb: 300, pierce: true, kind: 'bolt', status: { id: 'vulnerable', dur: 5 } })] },
      ] },
  ];

  // 裝備欄位與原型：每位 Boss 套用一個原型（四件各一組數值）+ 該 Boss 的二件 / 四件套裝獎勵
  const SLOTS = [{ id: 'helm', name: '頭盔', suffix: '面甲' }, { id: 'chest', name: '胸甲', suffix: '胸甲' }, { id: 'legs', name: '護腿', suffix: '護脛' }, { id: 'boots', name: '鞋子', suffix: '戰靴' }];
  const ARCH = {
    bulwark: { name: '厚實', helm: { hp: 40, def: 0.02 }, chest: { hp: 90, def: 0.04 }, legs: { hp: 60, def: 0.025 }, boots: { hp: 30, spd: 0.02 } },
    fury: { name: '狂猛', helm: { dmg: 0.03 }, chest: { dmg: 0.04, hp: 40 }, legs: { dmg: 0.03, sta: 10 }, boots: { dmg: 0.02, spd: 0.03 } },
    swift: { name: '迅捷', helm: { sta: 10, cdr: 0.02 }, chest: { spd: 0.03, hp: 40 }, legs: { spd: 0.04, staRegen: 0.05 }, boots: { spd: 0.06, sta: 8 } },
    arcane: { name: '秘法', helm: { mana: 20 }, chest: { mana: 25, hp: 30 }, legs: { manaRegen: 0.1, mana: 10 }, boots: { cdr: 0.03, manaRegen: 0.08 } },
    vital: { name: '生機', helm: { hp: 50 }, chest: { hp: 110 }, legs: { hp: 70, staRegen: 0.08 }, boots: { hp: 40, staRegen: 0.08 } },
  };
  // 每位 Boss：short 套裝簡稱、arch 原型、passive 被動（靈魂解鎖後可裝備）、set2 / set4 套裝獎勵
  const BOSS_META = {
    magmus: { short: '熔岩', arch: 'bulwark', passive: { name: '熔岩之軀', mods: { def: 0.08, hp: 60 } }, set2: { name: '熔岩護佑', mods: { hp: 120 } }, set4: { name: '不滅熔核', mods: { def: 0.1, dmg: 0.08 } } },
    witch: { short: '霜月', arch: 'arcane', passive: { name: '霜月加護', mods: { mana: 30, manaRegen: 0.2 } }, set2: { name: '寒霜吐息', mods: { mana: 40 } }, set4: { name: '絕對零度', mods: { cdr: 0.12, manaRegen: 0.3 } } },
    ronin: { short: '影刃', arch: 'swift', passive: { name: '見切之心', mods: { spd: 0.05, cdr: 0.05 } }, set2: { name: '無聲步法', mods: { spd: 0.04 } }, set4: { name: '百鬼夜行', mods: { spd: 0.06, dmg: 0.1 } } },
    brood: { short: '腐沼', arch: 'vital', passive: { name: '腐沼再生', mods: { staRegen: 0.15, hp: 50 } }, set2: { name: '沼澤韌性', mods: { hp: 100 } }, set4: { name: '萬蟲噬魂', mods: { lifesteal: 0.03, hp: 100 } } },
    watcher: { short: '深淵', arch: 'fury', passive: { name: '狼血', mods: { dmg: 0.06, lifesteal: 0.015 } }, set2: { name: '群狼之牙', mods: { dmg: 0.04 } }, set4: { name: '薪王之火', mods: { dmg: 0.1, spd: 0.04 } } },
    lubu: { short: '飛將', arch: 'fury', passive: { name: '人中呂布', mods: { dmg: 0.07, hp: 40 } }, set2: { name: '赤兔之勢', mods: { hp: 100 } }, set4: { name: '天喰', mods: { dmg: 0.12, def: 0.05 } } },
    gundyr: { short: '灰燼', arch: 'bulwark', passive: { name: '灰燼審判', mods: { def: 0.06, sta: 15 } }, set2: { name: '長戟守護', mods: { sta: 20 } }, set4: { name: '英雄之軀', mods: { def: 0.1, hp: 150 } } },
    thor: { short: '雷神', arch: 'fury', passive: { name: '雷槌覺醒', mods: { dmg: 0.08 } }, set2: { name: '雷鳴', mods: { dmg: 0.05 } }, set4: { name: '鬥神之雷', mods: { dmg: 0.1, cdr: 0.08 } } },
    zed: { short: '影流', arch: 'swift', passive: { name: '影忍法', mods: { dmg: 0.05, cdr: 0.06 } }, set2: { name: '分身之術', mods: { cdr: 0.05 } }, set4: { name: '瞬獄影殺', mods: { dmg: 0.1, spd: 0.05 } } },
    fiora: { short: '決鬥', arch: 'swift', passive: { name: '決鬥之舞', mods: { lifesteal: 0.02, staRegen: 0.1 } }, set2: { name: '破綻直覺', mods: { staRegen: 0.1 } }, set4: { name: '終極挑戰', mods: { lifesteal: 0.03, dmg: 0.08 } } },
    mihawk: { short: '黑刀', arch: 'fury', passive: { name: '劍聖威壓', mods: { dmg: 0.06, sta: 12 } }, set2: { name: '鷹眼', mods: { sta: 15 } }, set4: { name: '世界第一', mods: { dmg: 0.12, cdr: 0.06 } } },
    adam: { short: '始祖', arch: 'arcane', passive: { name: '神虛視', mods: { def: 0.05, cdr: 0.05 } }, set2: { name: '見切複製', mods: { cdr: 0.04 } }, set4: { name: '為了孩子', mods: { def: 0.08, cdr: 0.1 } } },
    zeus: { short: '鬥神', arch: 'fury', passive: { name: '鬥神狂喜', mods: { dmg: 0.06, hp: 60 } }, set2: { name: '全宇宙之父', mods: { hp: 100 } }, set4: { name: '阿陀磨須', mods: { dmg: 0.12, lifesteal: 0.02 } } },
    yujiro: { short: '鬼背', arch: 'bulwark', passive: { name: '一看就會', mods: { def: 0.07, dmg: 0.04 } }, set2: { name: '震樓之軀', mods: { hp: 100 } }, set4: { name: '地上最強', mods: { def: 0.1, dmg: 0.1 } } },
    deviljho: { short: '暴食', arch: 'vital', passive: { name: '健啖', mods: { lifesteal: 0.02, hp: 60 } }, set2: { name: '腐蝕涎液', mods: { hp: 100 } }, set4: { name: '龍息・滅世', mods: { lifesteal: 0.03, dmg: 0.1 } } },
    kojiro: { short: '燕返', arch: 'swift', passive: { name: '千手無雙', mods: { def: 0.04, cdr: 0.06 } }, set2: { name: '二天岩流', mods: { cdr: 0.04 } }, set4: { name: '萬手無雙', mods: { dmg: 0.1, spd: 0.05 } } },
    itachi: { short: '曉', arch: 'arcane', passive: { name: '寫輪眼', mods: { cdr: 0.06, mana: 20 } }, set2: { name: '幻術', mods: { mana: 30 } }, set4: { name: '月讀・天照', mods: { cdr: 0.1, dmg: 0.08 } } },
  };

  // 基礎數值強化：每級 +per；花費 = base + 級數 × step 顆靈魂（可用任一 Boss 的靈魂支付）
  const UPGRADES = [
    { id: 'hp', name: '生命', per: 40, max: 10, unit: '', base: 2, step: 1 },
    { id: 'sta', name: '體力', per: 8, max: 10, unit: '', base: 2, step: 1 },
    { id: 'mana', name: '法力', per: 10, max: 10, unit: '', base: 2, step: 1 },
    { id: 'atk', name: '攻擊', per: 0.04, max: 10, unit: '%', base: 3, step: 1 },
    { id: 'soul', name: '魂力（借用招式威力）', per: 0.05, max: 10, unit: '%', base: 3, step: 1 },
    { id: 'potion', name: '藥水容量', per: 1, max: 3, unit: '', base: 6, step: 4 },
  ];

  for (const w of WEAPONS) if (w.id !== 'katana') w.hidden = true; // 暫時只開放太刀（其餘武器之後比照重製再開放）

  BD.HUNT = {
    WEAPONS, WEAPON_BY_ID: Object.fromEntries(WEAPONS.map((w) => [w.id, w])), SLOTS, ARCH, BOSS_META, UPGRADES,
    SKILL_SLOTS: 4, PASSIVE_SLOTS: 3,
    BASE: { hp: 700, sta: 100, mana: 100, potions: 3, soulMul: 0.75 },
    COST: { skill: 3, skill2: 4, ult: 8, passive: 5, gear: 1 },
    REWARD: { kill: 2, first: 3 },
  };
})(typeof window !== 'undefined' ? window : globalThis);
