'use strict';
// 拉達岡的紅狼：本篇學院版本。原作招式 / 圖像對照及改編邊界見 docs/bosses/redwolf.md。
// 半血強化、獵步被動、大招為本遊戲改編；橙金咬劍不附加燃燒。
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;
  const fang = { fx: 'devour', fxEl: 'physical' };
  const sword = { fx: 'redwolfslash', fxEl: 'amberblade' };
  const blades = (at, n, delay, dmg) => ({ do: 'glintblades', at, n, delay, gap: 0.13, spacing: 48, dmg: dmg || 54, posture: 14, kb: 100, speed: 760, homing: 1.25, life: 1.7, r: 10 });
  function leap(at, r, dmg, up) {
    up = up || 0.85;
    return [
      { do: 'tele', at: at - up, dur: up, shape: 'circle', r, anchor: 'target', follow: true, lockBefore: 0.3, setMark: 'wolfLanding', chargeFx: false },
      { do: 'hide', at: at - up + 0.08, fx: 'redwolfbound' },
      { do: 'land', at, mark: 'wolfLanding' },
      { do: 'hit', at, shape: 'circle', r, dmg, posture: 46, kb: 390, fx: 'redwolfplunge', fxEl: 'amberblade' },
    ];
  }
  function hunt(at, enhanced) {
    return [blades(at, enhanced ? 7 : 5, 1.5, 40),
      { do: 'tele', at: at + 0.2, dur: 0.55, shape: 'cone', r: 240, arc: 155 * D, follow: true, chargeFx: 'redwolfcrown' },
      { do: 'dash', at: at + 0.75, dist: 270, dur: 0.23, fx: 'redwolfbound' },
      ...strike(at + 1.04, 0.24, { shape: 'cone', r: 245, arc: 175 * D, angOff: 0.35 }, { dmg: 100, posture: 24, kb: 180, ...sword }),
      { do: 'dash', at: at + 1.42, dir: 'side', dist: 190, dur: 0.22, fx: 'redwolfbound' },
      ...strike(at + 1.85, 0.36, { shape: 'circle', r: 205 }, { dmg: 108, posture: 26, kb: 170, fx: 'redwolfwhirl', fxEl: 'amberblade' }),
      ...leap(at + 3.15, enhanced ? 210 : 170, enhanced ? 195 : 165, 0.95),
      ...(enhanced ? [blades(at + 3.34, 5, 0.6, 38)] : []),
    ];
  }
  BD.registerBoss({
    id: 'redwolf', name: '拉達岡的紅狼', title: '雷亞盧卡利亞的赤影', archetype: '輝劍與咬劍・迅捷獵殺',
    desc: '魔法學院討論室中的巨大紅狼。蓬亂紅鬃、長尾與金飾下，是忽遠忽近的獵手：藍色輝劍懸停後才射出，橙金曲劍則由狼口揮斬。被動「獵步留輝」（改編）：每兩次技能衝刺留下一把延遲輝劍，最短間隔七秒。半血強化與大招為本遊戲改編，劍光不造成燃燒。',
    color: '#df8548', color2: '#46261f', glow: '#84dcff', style: 'redwolf', rank: 'boss', stars: 4,
    radius: 34, maxHp: 2050, speed: 285, turn: 6, mass: 1.15, fxEl: 'glintstone', hurt: 'flesh',
    traits: ['glinthunter'], stamina: { max: 120, regen: 34 }, posture: 145, dodgeCost: 18, dodgeSpeed: 640,
    ai: { prefRange: [140, 310], aggression: 0.77, dodge: 0.75, precision: 0.7, reaction: 0.22, strafe: 0.85, walk: 0.9,
      feint: 0.06, delay: 0.18, retreat: 0.2, punish: 0.8, nervous: 0.12, patience: 0.25,
      combos: [
        { id: 'crossfire', name: '輝劍交叉獵殺', weight: 1.5, steps: [
          { skill: 'glint_array' }, { skill: 'leap_sword', cancel: 0.3, branch: [{ when: { dist: [180, 720] }, do: 'extend' }, { when: { dist: [0, 260] }, do: 'switch', skill: 'sword_combo' }, { do: 'stop' }] }] },
        { id: 'jaws', name: '撲咬・咬劍追斬', weight: 1.1, steps: [
          { skill: 'pounce' }, { skill: 'sword_combo', cancel: 0.2, branch: [{ when: { dist: [0, 300] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'circlehunt', name: '側躍・彗星', weight: 1, steps: [
          { skill: 'glint_step' }, { skill: 'comet', cancel: 0.2, branch: [{ when: { dist: [200, 820] }, do: 'extend' }, { do: 'stop' }] }] },
      ] },
    phase2: { speedMul: 1.12, dmgMul: 1.12, cdMul: 0.86, line: '嗷——！輝劍在紅鬃四周浮起。',
      aura: 'frost', fxEl: 'glintstone', transFx: { id: 'redwolfcrown', el: 'glintstone' }, // 復用冷色光環標籤；無冰凍判定，實際配色取自輝石元素
      note: '「赤鬃疾獵」為本遊戲改編：輝劍增至五把，咬劍追加追斬，解鎖「輝劍・交錯撲殺」；保留紅狼原形，大招最後再補一輪延遲輝劍' },
    skills: [
      { id: 'bite', name: '獠牙・連續撕咬', short: '連咬', tags: ['melee', 'fast'], range: [0, 155], cd: 2.9, cost: 15, track: 8, creep: 0.5, recovery: 0.4,
        actions: [...strike(0.28, 0.22, { shape: 'cone', r: 142, arc: 85 * D }, { dmg: 62, posture: 17, kb: 65, ...fang }),
          { do: 'dash', at: 0.45, dist: 48, dur: 0.12 },
          ...strike(0.65, 0.22, { shape: 'cone', r: 150, arc: 95 * D }, { dmg: 76, posture: 21, kb: 170, ...fang })] },
      { id: 'pounce', name: '飛撲噬咬', short: '撲咬', tags: ['melee', 'gap'], range: [150, 490], cd: 4.4, cost: 21, track: 5, recovery: 0.6,
        actions: dashStrike(0.6, 0.48, 360, 80, 0.3, { dmg: 117, posture: 28, kb: 230 }, { fx: 'redwolfpounce', fxEl: 'physical' }) },
      { id: 'sword_combo', name: '橙金咬劍・雙向斬', short: '咬劍', tags: ['melee', 'aoe'], range: [0, 290], cd: 4.8, cost: 24, track: 5, creep: 0.35, recovery: 0.65,
        actions: [...strike(0.58, 0.46, { shape: 'cone', r: 255, arc: 165 * D, angOff: 0.4 }, { dmg: 104, posture: 25, kb: 120, ...sword }),
          ...strike(1.07, 0.34, { shape: 'cone', r: 270, arc: 175 * D, angOff: -0.4 }, { dmg: 112, posture: 29, kb: 280, ...sword })],
        actions2: [...strike(0.54, 0.43, { shape: 'cone', r: 260, arc: 165 * D, angOff: 0.4 }, { dmg: 100, posture: 24, kb: 100, ...sword }),
          ...strike(1, 0.32, { shape: 'cone', r: 275, arc: 175 * D, angOff: -0.4 }, { dmg: 108, posture: 28, kb: 100, ...sword }),
          ...strike(1.65, 0.45, { shape: 'rect', len: 305, w: 68 }, { dmg: 115, posture: 32, kb: 310, ...sword })] },
      { id: 'sword_spin', name: '咬劍・迴旋大掃', short: '迴旋', tags: ['melee', 'aoe'], range: [0, 245], cd: 6.3, cost: 25, track: 3, recovery: 0.85,
        actions: strike(0.78, 0.65, { shape: 'circle', r: 225 }, { dmg: 153, posture: 38, kb: 340, fx: 'redwolfwhirl', fxEl: 'amberblade' }) },
      { id: 'leap_sword', name: '咬劍・騰空下劈', short: '跳劈', tags: ['gap', 'melee', 'aoe'], range: [160, 720], cd: 6.1, cost: 25, track: 5, recovery: 0.85,
        actions: leap(1.15, 145, 172) },
      { id: 'glint_array', name: '魔法輝劍・延遲劍陣', short: '輝劍', tags: ['ranged'], range: [150, 800], cd: 6.4, cost: 22, track: 6, recovery: 0.3,
        actions: [blades(0.35, 3, 1.45), { do: 'dash', at: 0.45, dir: 'side', dist: 155, dur: 0.25, fx: 'redwolfbound' }],
        actions2: [blades(0.32, 5, 1.45, 48), { do: 'dash', at: 0.42, dir: 'side', dist: 180, dur: 0.25, fx: 'redwolfbound' }] },
      { id: 'glint_step', name: '側躍・輝劍留置', short: '側躍', tags: ['ranged', 'defensive'], range: [0, 390], cd: 6.8, cost: 18, track: 7, recovery: 0.35,
        actions: [{ do: 'dash', at: 0.2, dir: 'side', dist: 235, dur: 0.3, iframe: true, fx: 'redwolfbound' }, blades(0.45, 1, 1.1, 70)] },
      { id: 'comet', name: '騰躍・輝石彗星', short: '彗星', tags: ['ranged'], range: [230, 850], cd: 6, cost: 24, track: 5, recovery: 0.7,
        actions: [{ do: 'tele', at: 0.1, dur: 0.65, shape: 'rect', len: 850, w: 55, follow: true, chargeFx: 'redwolfglint' },
          { do: 'dash', at: 0.18, dir: 'side', dist: 130, dur: 0.35, fx: 'redwolfbound' },
          { do: 'proj', at: 0.75, n: 1, speed: 960, r: 23, dmg: 132, posture: 29, kb: 220, life: 1.5, homing: 0.65, kind: 'glintcomet', fx: 'redwolfglint' }] },
      { id: 'cross_hunt', name: '輝劍・交錯撲殺（改編）', short: '獵殺', phase: 2, tags: ['ranged', 'gap', 'melee'], range: [180, 620], cd: 10, cost: 32, track: 5, recovery: 0.75,
        actions: [blades(0.2, 3, 1.25, 42), ...dashStrike(0.85, 0.5, 340, 85, 0.3, { dmg: 90, posture: 24, kb: 90 }, { fx: 'redwolfpounce' }),
          ...strike(1.5, 0.4, { shape: 'cone', r: 270, arc: 190 * D }, { dmg: 124, posture: 34, kb: 300, ...sword })] },
    ],
    ultimate: { id: 'ult', name: '赤狼・輝劍獵場', name2: '赤鬃疾獵・蒼金交響', ult: true, range: [0, 900], track: 7, recovery: 1,
      actions: hunt(0.3, false), actions2: hunt(0.3, true),
      desc: '本遊戲改編：藍色輝劍排成弧陣，紅狼趁劍陣蓄力時撲進橙金雙向斬、側躍迴旋，再騰空下劈；半血後劍陣增多，落地再留下一輪追擊輝劍。' },
  });
})(typeof window !== 'undefined' ? window : globalThis);
