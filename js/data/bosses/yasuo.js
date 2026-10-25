'use strict';
// Boss 資料：犽宿（《英雄聯盟》放逐浪人）：被動「浪人之道」走動累積劍意，滿了受擊時化為護盾；劍擊可能暴擊
// 鋼鐵暴雪（Q）命中累積「天寒地凍」，兩層時下一記化為旋風把對手捲上天（滯空）；風牆（W）擋下敵方投射物；刃敵千軍（E）穿身突進；
// 大招「奪命氣息」瞬移到滯空的對手身邊連斬。2XKO 的招式改編：納刀・斷風、颶風破、乘風而起（二階段）
// 風之劍術在 js/engine/actions/wind.js；考據見 docs/bosses/yasuo.md
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;
  const stab = { shape: 'rect', len: 250, w: 46 };
  const cone = { shape: 'cone', r: 118, arc: 110 * D };

  // 鋼鐵暴雪・旋風：沿直線捲出旋風，穿透、命中的對手滯空
  function tornado(tele, r, dmg, air) {
    return [
      { do: 'tele', at: 0.04, dur: tele, shape: 'rect', len: 1000, w: r * 2, follow: true },
      { do: 'proj', at: 0.04 + tele, n: 1, dmg, speed: 950, r, posture: 20, kb: 60, life: 1.1, pierce: true, kind: 'tornado', status: { id: 'airborne', dur: air }, fx: 'tornadocast' },
      { do: 'gather', at: 0.04 + tele },
    ];
  }
  // 刃敵千軍：穿身突進（無敵幀），每次突進疊一層「乘風」
  function sweep(at, tele, dmg) {
    return [...dashStrike(at, tele, 360, 70, 0.2, { dmg, posture: 12, kb: 80 }, { iframe: true, fx: 'sweepblade' }),
      { do: 'status', at, id: 'ridewind', dur: 5 }];
  }

  const yasuo = {
    id: 'yasuo', name: '犽宿', title: '放逐浪人', archetype: '風之劍豪',
    desc: '愛歐尼亞的放逐劍客，背負弒師的冤罪浪跡天涯。劍隨風走：鋼鐵暴雪連刺兩次就捲起旋風把人送上天，風牆吹散一切飛來的東西，奪命氣息在對手落地前斬下最後一刀。「死亡就像一陣風，永遠伴隨著我。」',
    color: '#3f7fb5', color2: '#2a2f45', glow: '#9fe8ff', style: 'yasuo',
    radius: 25, maxHp: 1520, speed: 272, turn: 11, mass: 0.8, fxEl: 'wind', hurt: 'flesh',
    traits: ['clash', 'wanderer'], clash: { style: 'blade', proj: true }, // 浪人之道（js/engine/actions/wind.js）；clash 在前：拚刀擋下的攻擊不耗劍意
    stamina: { max: 100, regen: 36 }, posture: 100, dodgeCost: 18, dodgeSpeed: 620,
    ai: { prefRange: [100, 260], aggression: 0.75, dodge: 0.5, precision: 0.85, reaction: 0.18, strafe: 0.9, walk: 0.5,
      feint: 0.2, delay: 0.25, retreat: 0.15, punish: 0.85, nervous: 0.05, patience: 0.45, read: 0.7,
      clash: 0.6, basic: 0.5, // 對撞傾向、普攻填空窗機率
      windWall: 0.75, // 風牆擋投射物的機率（js/engine/ai.js）
      escDodge: 0.3, escKite: 0.35, // 刃敵千軍穿過對手的招（無敵幀）、遠距也邊突進邊打
      // 連段（僅沉重）：E 接 Q、普攻接 Q、斷風接 E 追擊
      combos: [
        { id: 'eq', name: '刃敵千軍・鋼鐵暴雪', weight: 1.4, steps: [
          { skill: 'sweeping_blade' },
          { skill: 'steel_tempest', cancel: 0.3, branch: [
            { when: { dist: [0, 240] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'aq', name: '劍擊・鋼鐵暴雪', steps: [
          { skill: 'basic' },
          { skill: 'steel_tempest', cancel: 0.3, branch: [
            { when: { dist: [0, 240] }, do: 'extend' },
            { when: { dist: [240, 420] }, do: 'switch', skill: 'sweeping_blade' },
            { do: 'stop' }] }] },
        { id: 'se', name: '斷風・刃敵千軍', steps: [
          { skill: 'sever_wind' },
          { skill: 'sweeping_blade', cancel: 0.3, branch: [
            { when: { dist: [120, 420] }, do: 'extend' },
            { do: 'stop' }] }] },
      ] },
    phase2: { speedMul: 1.1, dmgMul: 1.15, cdMul: 0.8, fxEl: 'wind', transFx: { id: 'galeawaken', el: 'wind' },
      line: '死亡就像一陣風，永遠伴隨著我。',
      note: '喝一口酒、往劍上一噴，劍身泛起青白風光：暴擊率提高、浪人之道的護盾更厚、旋風更大、環斬也能把人捲上天、風牆更寬、斷風一次斬出三道；解鎖「颶風破」與「乘風而起」；奪命氣息連斬更多刀、落地一擊更重' },
    skills: [
      // 原作 Q：前刺；命中累積天寒地凍（兩層時 AI 改放旋風）
      { id: 'steel_tempest', name: '鋼鐵暴雪', short: '暴雪', tags: ['melee', 'fast'], range: [0, 240], cd: 1.6, cost: 8, track: 9, recovery: 0.3, noStorm: true, weight: 1.6,
        actions: strike(0.26, 0.22, stab, { dmg: 46, posture: 14, kb: 110, fx: 'steeltempest', storm: true, crit: true }),
        actions2: strike(0.22, 0.18, stab, { dmg: 48, posture: 14, kb: 110, fx: 'steeltempest', storm: true, crit: true }) },
      // 原作 Q3：天寒地凍兩層才能放（手動施放也受限）
      { id: 'tempest_tornado', name: '鋼鐵暴雪・旋風', short: '旋風', tags: ['ranged', 'fast'], range: [0, 900], cd: 1.2, cost: 10, track: 8, recovery: 0.4, needStorm: true, weight: 2.2,
        actions: tornado(0.3, 44, 62, 1.0),
        actions2: tornado(0.26, 54, 66, 1.15) },
      // 原作 E：穿身突進
      { id: 'sweeping_blade', name: '刃敵千軍', short: '突進', tags: ['gap', 'fast', 'escape'], range: [0, 420], cd: 2.2, cost: 10, track: 8, recovery: 0.25,
        actions: sweep(0.16, 0.14, 40),
        actions2: sweep(0.14, 0.12, 44) },
      // 原作 E → Q：突進途中的環斬；二階段環斬也會捲起旋風
      { id: 'eq_ring', name: '刃敵千軍・環斬', short: '環斬', tags: ['gap', 'aoe'], range: [120, 420], cd: 5, cost: 18, track: 7, recovery: 0.45,
        actions: [{ do: 'dash', at: 0.18, dist: 320, dur: 0.2, iframe: true, fx: 'sweepblade' },
          ...strike(0.52, 0.14, { shape: 'circle', r: 135 }, { dmg: 70, posture: 22, kb: 170, fx: 'eqring', storm: true })],
        actions2: [{ do: 'dash', at: 0.16, dist: 330, dur: 0.18, iframe: true, fx: 'sweepblade' },
          ...strike(0.48, 0.14, { shape: 'circle', r: 150 }, { dmg: 72, posture: 22, kb: 60, fx: 'eqring', storm: true, status: { id: 'airborne', dur: 0.75 } })] },
      // 原作 W：朝前方立起一道風牆 4 秒，擋下敵方投射物（AI 只在投射物將命中時反應施放）
      { id: 'wind_wall', name: '風牆', short: '風牆', tags: ['defensive', 'windwall'], range: [0, 900], cd: 14, cost: 10, recovery: 0.25,
        actions: [{ do: 'windwall', at: 0.08, w: 260, life: 4, drift: 90 }],
        actions2: [{ do: 'windwall', at: 0.06, w: 340, life: 4, drift: 100 }] },
      // 2XKO 改編：收刀入鞘凝風，拔刀斬出貫穿全場的長距風刃；二階段三道
      { id: 'sever_wind', name: '納刀・斷風', short: '斷風', tags: ['ranged'], range: [200, 800], cd: 7, cost: 18, track: 8, recovery: 0.45,
        actions: [{ do: 'tele', at: 0.1, dur: 0.5, shape: 'rect', len: 900, w: 70, follow: true },
          { do: 'proj', at: 0.6, n: 1, dmg: 80, speed: 1300, r: 30, posture: 26, kb: 140, life: 0.75, pierce: true, kind: 'windblade', fx: 'severwind' }],
        actions2: [{ do: 'tele', at: 0.1, dur: 0.44, shape: 'rect', len: 900, w: 70, follow: true },
          { do: 'proj', at: 0.54, n: 3, spread: 0.16, dmg: 60, speed: 1300, r: 28, posture: 20, kb: 120, life: 0.75, pierce: true, kind: 'windblade', fx: 'severwind' }] },
      // 2XKO 超必殺改編：突進撞上後瞬步到身後、側面連斬，最後交叉一斬
      { id: 'storm_breaker', name: '颶風破', short: '颶風', phase: 2, tags: ['gap', 'melee'], range: [140, 500], cd: 10, cost: 26, track: 7, recovery: 0.55,
        actions: [...dashStrike(0.32, 0.26, 340, 80, 0.18, { dmg: 50, posture: 16, kb: 60 }, { iframe: true, fx: 'sweepblade' }),
          { do: 'blink', at: 0.68, to: 'behind', dist: 60, fx: 'windstep' },
          ...strike(0.88, 0.16, cone, { dmg: 52, posture: 16, kb: 80, fx: 'slash', crit: true }),
          { do: 'blink', at: 1.06, to: 'side', dist: 150, fx: 'windstep' },
          ...strike(1.36, 0.22, { shape: 'circle', r: 150 }, { dmg: 88, posture: 30, kb: 240, fx: 'stormbreaker', crit: true })] },
      // 2XKO 改編：在對手腳下捲起巨大龍捲風，把人送上天（接著就是奪命氣息）
      { id: 'rise_wind', name: '乘風而起', short: '乘風', phase: 2, tags: ['aoe'], range: [0, 520], cd: 12, cost: 24, track: 6, recovery: 0.5,
        actions: [{ do: 'tele', at: 0.1, dur: 0.7, shape: 'circle', r: 150, anchor: 'target', setMark: 'rw', teleFx: 'risecharge' },
          { do: 'hit', at: 0.8, shape: 'circle', r: 150, anchor: 'mark', mark: 'rw', dmg: 70, posture: 20, kb: 40, fx: 'risewind', status: { id: 'airborne', dur: 1.3 } }] },
      // 普攻：兩記橫斬，可能暴擊
      { id: 'basic', name: '劍擊', short: '劍擊', tags: ['melee', 'fast', 'basic'], range: [0, 130], cd: 0, cost: 6, track: 9, creep: 0.3, recovery: 0.3,
        actions: [...strike(0.2, 0.16, cone, { dmg: 30, posture: 10, kb: 70, fx: 'slash', crit: true }),
          ...strike(0.44, 0.16, cone, { dmg: 34, posture: 12, kb: 120, fx: 'slash', crit: true })] },
    ],
    ultimate: { id: 'ult', name: '奪命氣息', name2: '奪命氣息・死亡如風', ult: true, range: [0, 900], track: 0, recovery: 0.5,
      // 原作 R：瞬移到滯空的對手身邊、延長滯空並連斬；對手沒在滯空就先捲出一道大旋風
      actions: [{ do: 'lastbreath', at: 0.05, dur: 2.3, n: 6, dmg: 20, final: 150 }],
      actions2: [{ do: 'lastbreath', at: 0.05, dur: 2.3, n: 9, dmg: 20, final: 200 }],
      desc: '瞬移到滯空的對手身邊（自身無敵），延長滯空並連斬 6 刀，最後一記落地重斬；結束時劍意充滿、重置天寒地凍。對手沒在滯空就先捲出一道大旋風，捲中才發動。二階段連斬 9 刀、落地一擊更重。' },
  };

  BD.registerBoss(yasuo);
})(typeof window !== 'undefined' ? window : globalThis);
