'use strict';
// Boss 資料：影刃武士（純資料：數值、AI 個性、技能時間軸、二階段與大招）
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;
  const rTsu = [
    ...strike(0.3, 0.26, { shape: 'cone', r: 115, arc: 130 * D }, { dmg: 55, posture: 20, kb: 120, fx: 'slash' }),
    ...strike(0.58, 0.22, { shape: 'cone', r: 115, arc: 130 * D }, { dmg: 70, posture: 25, kb: 200, fx: 'slash' }),
  ];
  const ronin = {
    id: 'ronin', name: '影刃武士', title: '無聲之刃', archetype: '耐心反擊型',
    desc: '閃避極佳，在中距離游走誘使對手出招，再以居合、影步與「見切」懲罰每一個破綻。',
    color: '#ff5470', color2: '#1a1a2e', glow: '#ffb3c0', style: 'ronin',
    rank: 'boss', stars: 4.5,
    radius: 27, maxHp: 2050, speed: 235, turn: 8, mass: 0.8, fxEl: 'physical', hurt: 'flesh',
    traits: ['echo', 'counter', 'clash'], clash: { style: 'blade', proj: true }, // 二階段影分身追斬、見切反擊（js/engine/traits.js）
    stamina: { max: 100, regen: 34 }, posture: 100, dodgeCost: 18, dodgeSpeed: 600,
    ai: { clash: 0.5, basic: 0.5, // 對撞傾向、普攻填空窗機率（js/engine/ai.js）
      prefRange: [150, 240], aggression: 0.45, dodge: 0.76, precision: 0.9, reaction: 0.17, strafe: 0.9, walk: 0.6,
      feint: 0.35, delay: 0.35, retreat: 0.2, punish: 0.95, nervous: 0.05, patience: 0.8, read: 0.8, counter: 0.55,
      // 連段（僅沉重；格式見 js/engine/combo.js）
      combos: [
        { id: 'kage', name: '影步二式', weight: 1.3, steps: [
          { skill: 'shadowstep' },
          { skill: 'tsubame', cancel: 0.35, branch: [
            { when: { dist: [0, 115] }, do: 'extend' },
            { when: { dist: [90, 380] }, do: 'switch', skill: 'iai' },
            { do: 'stop' }] }] },
        { id: 'iaigaeshi', name: '居合返し', steps: [
          { skill: 'iai' },
          { skill: 'tsubame', cancel: 0.4, branch: [
            { when: { landed: true, dist: [0, 130] }, do: 'extend' },
            { when: { rolled: true, dist: [140, 650] }, chance: 0.5, do: 'switch', skill: 'kunai' },
            { when: { dist: [0, 115] }, chance: 0.4, do: 'delay', hold: [0.25, 0.45] },
            { do: 'stop' }] }] },
        { id: 'kunaiiai', name: '苦無誘斬', steps: [
          { skill: 'kunai' },
          { skill: 'iai', cancel: 0.3, branch: [
            { when: { rolled: true, dist: [90, 380] }, do: 'extend' },
            { when: { dist: [90, 380] }, chance: 0.4, do: 'delay', hold: [0.25, 0.5] },
            { do: 'stop' }] }] },
        { id: 'chidoriend', name: '千鳥・終', phase: 2, steps: [
          { skill: 'chidori' },
          { skill: 'tsubame', cancel: 0.4, branch: [
            { when: { dist: [0, 115] }, do: 'extend' },
            { when: { dist: [110, 480] }, do: 'switch', skill: 'shadowstep' },
            { do: 'stop' }] }] },
      ] },
    phase2: { speedMul: 1.15, dmgMul: 1.15, cdMul: 0.8, line: '影隨刃動——你已經死了。', aura: 'shadow', fxEl: 'shadow', transFx: { id: 'shadowrise', el: 'shadow' },
      note: '所有斬擊附帶 0.3 秒後的「影分身追斬」、燕返追加突刺、苦無兩輪五連，解鎖「千鳥三連閃」' },
    skills: [
      { id: 'iai', name: '居合斬', short: '居合', tags: ['gap', 'fast'], range: [90, 380], cd: 3.8, cost: 22, track: 7, recovery: 0.6,
        actions: dashStrike(0.42, 0.42, 330, 60, 0.13, { dmg: 95, posture: 40, kb: 250 }, { iframe: true, fx: 'iaido' }) },
      { id: 'tsubame', name: '燕返', short: '燕返', tags: ['melee', 'fast'], range: [0, 115], cd: 2.4, cost: 18, track: 8, creep: 0.3, recovery: 0.45,
        actions: rTsu,
        actions2: [...rTsu, ...strike(0.9, 0.25, { shape: 'rect', len: 150, w: 40 }, { dmg: 85, posture: 30, kb: 300, fx: 'thrust' })] },
      { id: 'shadowstep', name: '影步', short: '影步', tags: ['gap'], range: [110, 480], cd: 7, cost: 20, track: 10, recovery: 0.5,
        actions: [{ do: 'blink', at: 0.22, to: 'behind', dist: 85 },
          ...strike(0.62, 0.36, { shape: 'cone', r: 125, arc: 120 * D }, { dmg: 100, posture: 40, kb: 250, fx: 'slash' })] },
      { id: 'mikiri', name: '見切', short: '見切', tags: ['counter'], range: [0, 320], cd: 6, cost: 10, track: 8, recovery: 0.45,
        actions: [{ do: 'counter', at: 0, dur: 1.0, dmg: 140, posture: 60, fx: 'mikiri', slowmo: 0.35 }] },
      { id: 'kunai', name: '飛苦無', short: '苦無', tags: ['ranged', 'fast'], range: [140, 650], cd: 4.2, cost: 12, track: 8, recovery: 0.35,
        actions: [{ do: 'proj', at: 0.25, n: 3, spread: 0.22, speed: 660, r: 6, dmg: 24, posture: 8, life: 1.6, kind: 'kunai' }],
        actions2: [{ do: 'proj', at: 0.25, n: 5, spread: 0.2, speed: 660, r: 6, dmg: 22, posture: 7, life: 1.6, kind: 'kunai' },
          { do: 'proj', at: 0.45, n: 5, spread: 0.2, speed: 660, r: 6, dmg: 22, posture: 7, life: 1.6, kind: 'kunai' }] },
      { id: 'smoke', name: '煙幕遁', short: '煙幕', tags: ['escape', 'zone'], range: [0, 190], cd: 10, cost: 15, recovery: 0.3,
        actions: [{ do: 'zone', at: 0.15, kind: 'caltrops', pattern: 'self', n: 1, r: 115, dur: 4, dps: 20, slow: true, delay: 0.25 },
          { do: 'blink', at: 0.2, to: 'away', dist: 240 }] },
      { id: 'chidori', name: '千鳥三連閃', short: '千鳥', phase: 2, tags: ['gap'], range: [100, 450], cd: 9, cost: 30, track: 9, recovery: 0.7,
        actions: [...dashStrike(0.38, 0.38, 280, 56, 0.12, { dmg: 70, posture: 25, kb: 150 }, { iframe: true, fx: 'iaido' }),
          ...dashStrike(0.85, 0.3, 280, 56, 0.12, { dmg: 70, posture: 25, kb: 150 }, { iframe: true, fx: 'iaido' }),
          ...dashStrike(1.3, 0.3, 300, 60, 0.12, { dmg: 90, posture: 35, kb: 300 }, { iframe: true, fx: 'iaido' })] },
      // 普攻：無冷卻無消耗，填補技能空窗，也是對撞的主力
      { id: 'basic', name: '斬擊', short: '斬擊', tags: ['melee', 'fast', 'basic'], weight: 0.45, range: [0, 170], cd: 0, cost: 0, track: 9, recovery: 0.3,
        actions: strike(0.2, 0.14, { shape: 'cone', r: 150, arc: 100 * D }, { dmg: 26, posture: 8, kb: 60, fx: 'slash' }) }
    ],
    ultimate: { id: 'ult', name: '百鬼夜斬', ult: true, range: [0, 800], track: 0, recovery: 0.9,
      actions: [{ do: 'hide', at: 0.2, fx: { id: 'nightfall', el: 'shadow', life: 2.75 } },
        { do: 'slashes', at: 0.3, n: 6, interval: 0.2, tele: 0.55, len: 560, w: 46, dmg: 60, posture: 18, fx: { id: 'threadcut', el: 'shadow' },
          final: { tele: 0.7, len: 660, w: 74, dmg: 170, posture: 60, fx: { id: 'threadcut', el: 'shadow', scale: 1.6 } } },
        { do: 'appear', at: 2.9, to: 'behind', dist: 90 }],
      actions2: [{ do: 'hide', at: 0.2, fx: { id: 'nightfall', el: 'shadow', life: 3.05 } },
        { do: 'slashes', at: 0.3, n: 9, interval: 0.18, tele: 0.55, len: 600, w: 46, dmg: 60, posture: 18, fx: { id: 'threadcut', el: 'shadow' },
          final: { tele: 0.7, len: 700, w: 80, dmg: 190, posture: 70, fx: { id: 'threadcut', el: 'shadow', scale: 1.6 } } },
        { do: 'appear', at: 3.2, to: 'behind', dist: 90 }],
      desc: '遁入暗影，從四面八方連續斬線交錯於目標，最後一記十字斬' },
  };

  BD.registerBoss(ronin);
})(typeof window !== 'undefined' ? window : globalThis);
