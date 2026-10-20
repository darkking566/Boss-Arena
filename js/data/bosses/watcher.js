'use strict';
// Boss 資料：深淵監視者（純資料：數值、AI 個性、技能時間軸、二階段與大招）
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;
  const FIRE = { kind: 'fire', r: 44, dur: 3, dps: 22 };
  const ignite = (list, zone) => list.map((a) => (a.do === 'hit' ? Object.assign({}, a, { zone }) : a));
  const wCombo = [
    ...strike(0.28, 0.24, { shape: 'cone', r: 120, arc: 120 * D }, { dmg: 48, posture: 18, kb: 120, fx: 'slash' }),
    ...strike(0.52, 0.2, { shape: 'cone', r: 120, arc: 120 * D }, { dmg: 48, posture: 18, kb: 120, fx: 'slash' }),
    // 突然的停頓後重刺（延遲斬）
    ...strike(1.2, 0.4, { shape: 'rect', len: 155, w: 56 }, { dmg: 88, posture: 35, kb: 300, fx: 'thrust' }),
  ];
  const wFlip = [
    { do: 'dash', at: 0.2, dist: 170, dur: 0.3, iframe: true },
    ...strike(0.6, 0.45, { shape: 'circle', r: 95, off: 40 }, { dmg: 92, posture: 40, kb: 320, fx: 'slam' }),
  ];
  const wPlunge = (r, dmg, extra) => [
    { do: 'hide', at: 0.25, fx: 'leap' },
    { do: 'tele', at: 0.25, dur: 0.8, shape: 'circle', r, anchor: 'target', setMark: 'P', follow: true, lockBefore: 0.35 },
    { do: 'land', at: 1.05, mark: 'P' },
    Object.assign({ do: 'hit', at: 1.05, shape: 'circle', r, anchor: 'mark', mark: 'P', dmg, posture: 45, kb: 380, fx: 'bigslam' }, extra || {}),
  ];
  const wSpin = [
    ...strike(0.45, 0.4, { shape: 'circle', r: 125 }, { dmg: 58, posture: 22, kb: 200, fx: 'ring' }),
    ...strike(0.78, 0.25, { shape: 'circle', r: 125 }, { dmg: 68, posture: 26, kb: 260, fx: 'ring' }),
  ];
  const leap = (t0, dur, r, mark, hit) => [
    { do: 'hide', at: t0, fx: 'leap' },
    { do: 'tele', at: t0, dur, shape: 'circle', r, anchor: 'target', setMark: mark, follow: true, lockBefore: 0.3 },
    { do: 'land', at: t0 + dur, mark },
    Object.assign({ do: 'hit', at: t0 + dur, shape: 'circle', r, anchor: 'mark', mark, fx: 'bigslam' }, hit),
  ];
  const watcher = {
    id: 'watcher', name: '深淵監視者', title: '法蘭不死隊', archetype: '迅捷群狼型',
    desc: '飲下狼血的不死隊劍士：大劍配格擋匕首，連斬中夾雜突然停頓，靠後空翻與側翻不斷重置距離；一階段會呼喚同伴群攻，偶爾還會冒出敵我不分的紅眼監視者。',
    color: '#d23a3a', color2: '#22232c', glow: '#ff6b5a', style: 'watcher',
    radius: 38, maxHp: 2250, speed: 245, turn: 8, mass: 1.0, fxEl: 'shadow', hurt: 'shadow',
    traits: ['counter'], // 匕首彈反（js/engine/traits.js）；同伴 / 紅眼規則見 js/engine/minions/watcher.js
    stamina: { max: 110, regen: 34 }, posture: 120, dodgeCost: 16, dodgeSpeed: 620,
    ai: { prefRange: [90, 190], aggression: 0.8, dodge: 0.7, precision: 0.75, reaction: 0.2, strafe: 0.7, walk: 0.75,
      feint: 0.25, delay: 0.45, retreat: 0.15, punish: 0.8, nervous: 0.1, patience: 0.3, read: 0.7, counter: 0.25, resetFlip: 0.35, resetSkill: 'backflip',
      // 連段（僅沉重；格式見 js/engine/combo.js）
      combos: [
        { id: 'wolfblood', name: '狼血三段', weight: 1.3, steps: [
          { skill: 'combo', exits: [{ after: 2, when: { rolled: true }, chance: 0.45, then: 'next' }] },
          { skill: 'backflip', cancel: 0.4, branch: [{ when: { sta: 0.35 }, do: 'extend' }, { do: 'stop' }] },
          { skill: 'plunge', cancel: 0.2, branch: [
            { when: { dist: [150, 540] }, do: 'extend' },
            { when: { dist: [120, 150] }, do: 'switch', skill: 'lunge' },
            { do: 'stop' }] }] },
        { id: 'lungesweep', name: '突刺旋風', steps: [
          { skill: 'lunge' },
          { skill: 'spin', cancel: 0.45, branch: [
            { when: { dist: [0, 145] }, do: 'extend' },
            { when: { rollDir: ['back'], dist: [80, 270] }, do: 'switch', skill: 'flip' },
            { do: 'stop' }] }] },
        { id: 'flipchain', name: '翻斬連斬', steps: [
          { skill: 'flip' },
          { skill: 'combo', cancel: 0.4, branch: [
            { when: { landed: true, dist: [0, 135] }, do: 'extend' },
            { when: { dist: [0, 135] }, chance: 0.5, do: 'delay', hold: [0.3, 0.55] },
            { do: 'stop' }] }] },
        { id: 'pyre', name: '薪火追擊', phase: 2, steps: [
          { skill: 'flamewave' },
          { skill: 'lunge', cancel: 0.3, branch: [{ when: { dist: [120, 350] }, do: 'extend' }, { do: 'stop' }] },
          { skill: 'spin', cancel: 0.4, branch: [{ when: { dist: [0, 145] }, do: 'extend' }, { do: 'stop' }] }] },
      ] },
    phase2: { speedMul: 1.1, dmgMul: 1.2, cdMul: 0.85, line: '薪王之火……燃盡深淵。', aura: 'flame', fxEl: 'fire',
      transDur: 2.8, roarAt: 1.7, purge: true, bloodBurst: true,
      note: '倒地、深紅血霧爆發、同伴全數消散，再以「薪王」之姿獨自起身：大劍燃起火焰；連斬/翻斬/突刺/迴旋會在地上留下火焰，下劈變爆炸，後空翻落地擲出火焰斬，解鎖「烈焰斬波」，不再召喚同伴' },
    skills: [
      { id: 'combo', name: '狼血連斬', short: '連斬', tags: ['melee'], range: [0, 135], cd: 3, cost: 24, track: 7, creep: 0.35, recovery: 0.6,
        actions: wCombo,
        actions2: [...ignite(wCombo, FIRE), ...strike(1.55, 0.3, { shape: 'cone', r: 140, arc: 150 * D }, { dmg: 80, posture: 30, kb: 300, fx: 'slash', zone: FIRE })] },
      { id: 'flip', name: '迴旋翻斬', short: '翻斬', tags: ['gap', 'melee'], range: [80, 270], cd: 5, cost: 22, track: 7, recovery: 0.55,
        actions: wFlip,
        actions2: [...ignite(wFlip, { kind: 'fire', r: 75, dur: 3.5, dps: 24 }),
          ...strike(0.9, 0.3, { shape: 'circle', r: 150, off: 40 }, { dmg: 55, posture: 20, kb: 300, fx: 'pillarring' })] },
      { id: 'plunge', name: '躍空下劈', short: '下劈', tags: ['gap'], range: [150, 540], cd: 7, cost: 26, track: 6, recovery: 0.6,
        actions: wPlunge(100, 112),
        actions2: [...wPlunge(130, 128, { zone: { kind: 'fire', r: 90, dur: 4, dps: 26 } }),
          { do: 'tele', at: 1.05, dur: 0.32, shape: 'circle', r: 175, anchor: 'mark', mark: 'P' },
          { do: 'hit', at: 1.37, shape: 'circle', r: 175, anchor: 'mark', mark: 'P', dmg: 60, posture: 25, kb: 400, fx: 'pillarring' }] },
      { id: 'lunge', name: '突進刺擊', short: '突刺', tags: ['gap', 'fast'], range: [120, 350], cd: 3.6, cost: 20, track: 7, recovery: 0.5,
        actions: dashStrike(0.4, 0.4, 300, 46, 0.15, { dmg: 82, posture: 35, kb: 250 }, { fx: 'slashline' }),
        actions2: dashStrike(0.4, 0.4, 320, 46, 0.15, { dmg: 88, posture: 35, kb: 250 }, { fx: 'slashline', trail: { kind: 'fire', r: 36, dur: 3.5, dps: 22 } }) },
      { id: 'spin', name: '旋風橫掃', short: '旋風', tags: ['melee', 'aoe'], range: [0, 145], cd: 5, cost: 24, track: 5, creep: 0.45, recovery: 0.6,
        actions: wSpin,
        actions2: [...wSpin, ...strike(1.1, 0.3, { shape: 'circle', r: 150 }, { dmg: 80, posture: 30, kb: 330, fx: 'pillarring', zone: { kind: 'fire', r: 110, dur: 3, dps: 22 } })] },
      { id: 'backflip', name: '後空翻', short: '空翻', tags: ['escape'], range: [0, 190], cd: 3.2, cost: 14, track: 0, recovery: 0.25,
        actions: [{ do: 'dash', at: 0.08, dist: 220, dur: 0.3, dir: 'back', iframe: true }],
        actions2: [{ do: 'dash', at: 0.08, dist: 220, dur: 0.3, dir: 'back', iframe: true },
          { do: 'proj', at: 0.45, n: 1, speed: 560, r: 22, dmg: 55, posture: 20, kb: 150, life: 1.4, pierce: true, kind: 'flame' }] },
      { id: 'parry', name: '匕首彈反', short: '彈反', tags: ['counter'], range: [0, 220], cd: 7, cost: 10, track: 8, recovery: 0.5,
        actions: [{ do: 'counter', at: 0, dur: 0.55, dmg: 120, posture: 60, name: '彈反・致命一擊' }] },
      { id: 'pack', name: '呼喚同伴', short: '同伴', maxPhase: 1, summonCap: 1, summonKind: 'watcher', tags: ['summon'], range: [0, 950], cd: 16, cost: 20, recovery: 0.4,
        actions: [{ do: 'summon', at: 0.6, kind: 'watcher', n: 1, cap: 1, rogue: 0.45 }] },
      { id: 'flamewave', name: '烈焰斬波', short: '斬波', phase: 2, tags: ['ranged'], range: [150, 650], cd: 6, cost: 22, track: 6, recovery: 0.55,
        actions: [{ do: 'tele', at: 0, dur: 0.4, shape: 'rect', len: 500, w: 30, follow: true, soft: true },
          { do: 'proj', at: 0.4, n: 1, speed: 540, r: 22, dmg: 62, posture: 22, kb: 160, pierce: true, life: 1.6, kind: 'flame' },
          { do: 'proj', at: 0.75, n: 1, speed: 540, r: 22, dmg: 62, posture: 22, kb: 160, pierce: true, life: 1.6, kind: 'flame' },
          { do: 'proj', at: 1.1, n: 3, spread: 0.3, speed: 560, r: 22, dmg: 50, posture: 18, kb: 160, pierce: true, life: 1.6, kind: 'flame' }] },
    ],
    ultimate: { id: 'ult', name: '狼血連環躍斬', name2: '薪王焚環', ult: true, range: [0, 900], track: 6, recovery: 1.0,
      actions: [...leap(0.2, 0.65, 100, 'A', { dmg: 75, posture: 25, kb: 300 }),
        ...leap(1.0, 0.6, 100, 'B', { dmg: 75, posture: 25, kb: 300 }),
        ...leap(1.75, 0.8, 170, 'C', { dmg: 150, posture: 60, kb: 500 }),
        { do: 'tele', at: 2.55, dur: 0.3, shape: 'ring', r0: 170, r: 260, anchor: 'mark', mark: 'C' },
        { do: 'hit', at: 2.85, shape: 'ring', r0: 170, r: 260, anchor: 'mark', mark: 'C', dmg: 60, posture: 20, kb: 300, fx: 'ring' }],
      actions2: [{ do: 'tele', at: 0.1, dur: 1.9, shape: 'ring', r0: 165, r: 245, anchor: 'target', setMark: 'C' },
        { do: 'circle', at: 0.25, dur: 1.3, mark: 'C', r: 205, trail: { kind: 'fire', r: 40, dur: 4, dps: 24 }, hit: { dmg: 70, posture: 30, kb: 300 } },
        { do: 'hit', at: 2.0, shape: 'ring', r0: 165, r: 245, anchor: 'mark', mark: 'C', dmg: 130, posture: 50, kb: 350, fx: 'pillarring' },
        ...leap(2.1, 0.75, 150, 'D', { dmg: 170, posture: 70, kb: 550, zone: { kind: 'fire', r: 110, dur: 4, dps: 28 } })],
      desc: '一階段「狼血連環躍斬」：連續三次追蹤目標的躍空下劈，最後一擊引發衝擊波；二階段「薪王焚環」：繞目標疾奔一圈留下火痕，火環爆燃後再一記爆炎下劈' },
  };

  BD.registerBoss(watcher);
})(typeof window !== 'undefined' ? window : globalThis);
