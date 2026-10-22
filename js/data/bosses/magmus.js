'use strict';
// Boss 資料：熔岩巨像（純資料：數值、AI 個性、技能時間軸、二階段與大招）
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;
  const mCombo = [
    ...strike(0.55, 0.4, { shape: 'cone', r: 189, arc: 110 * D }, { dmg: 70, posture: 22, kb: 180, fx: 'slash' }),
    ...strike(1.0, 0.35, { shape: 'cone', r: 189, arc: 110 * D }, { dmg: 70, posture: 22, kb: 180, fx: 'slash' }),
    ...strike(1.6, 0.5, { shape: 'circle', r: 147, off: 84 }, { dmg: 120, posture: 45, kb: 380, fx: 'slam' }),
  ];
  const mCharge = dashStrike(0.75, 0.75, 658, 118, 0.42, { dmg: 130, posture: 55, kb: 520 }, { fx: { id: 'dash', el: 'fire', scale: 1.4 } });
  const mQuake = [
    ...strike(0.85, 0.85, { shape: 'circle', r: 175 }, { dmg: 110, posture: 40, kb: 420, fx: 'slam' }),
    ...strike(1.25, 0.4, { shape: 'ring', r0: 175, r: 336 }, { dmg: 80, posture: 25, kb: 300, fx: 'ring' }),
  ];
  const magmus = {
    id: 'magmus', name: '熔岩巨像', title: '焚城者', archetype: '狂暴重戰士',
    desc: '皮糙肉厚的近戰怪物，以弧線逼近並用重擊、衝撞碾壓對手，體力見底才會退開。',
    color: '#ff7a2e', color2: '#4a1a0a', glow: '#ffb347', style: 'golem',
    radius: 78, maxHp: 3250, speed: 165, turn: 4.2, mass: 1.8, fxEl: 'fire', hurt: 'magma',
    stamina: { max: 120, regen: 26 }, posture: 170, dodgeCost: 24, dodgeSpeed: 420,
    ai: { prefRange: [115, 230], aggression: 0.85, dodge: 0.3, precision: 0.45, reaction: 0.3, strafe: 0.4, walk: 0.72,
      feint: 0.1, delay: 0.3, retreat: 0.06, punish: 0.6, nervous: 0.12, patience: 0.2, read: 0.45,
      // 連段（僅沉重；格式見 js/engine/combo.js）
      combos: [
        { id: 'hammer', name: '重錘變奏', weight: 1.4, steps: [
          { skill: 'combo', exits: [{ after: 2, when: { rolled: true }, chance: 0.5, then: 'next' }, { after: 2, when: { landed: false }, chance: 0.3, then: 'stop' }] },
          { skill: 'quake', cancel: 0.5, branch: [
            { when: { landed: true }, do: 'extend' },
            { when: { rollDir: ['back'], dist: [240, 780] }, do: 'switch', skill: 'charge' },
            { chance: 0.45, do: 'delay', hold: [0.3, 0.6] },
            { do: 'stop' }] }] },
        { id: 'rush', name: '衝撞連擊', steps: [
          { skill: 'charge' },
          { skill: 'combo', cancel: 0.45, branch: [
            { when: { dist: [0, 196] }, do: 'extend' },
            { when: { rollDir: ['through', 'left', 'right'], dist: [0, 320] }, do: 'switch', skill: 'quake' },
            { do: 'stop' }] }] },
        { id: 'scorch', name: '焚野', steps: [
          { skill: 'breath' },
          { skill: 'meteor', cancel: 0.3, branch: [
            { when: { dist: [210, 900] }, do: 'extend' },
            { when: { dist: [0, 196] }, do: 'switch', skill: 'combo' },
            { do: 'stop' }] }] },
        { id: 'eruption', name: '熔核爆發', phase: 2, steps: [
          { skill: 'erupt' },
          { skill: 'charge', cancel: 0.3, branch: [
            { when: { dist: [240, 780] }, do: 'extend' },
            { when: { dist: [0, 240] }, do: 'switch', skill: 'quake' },
            { do: 'stop' }] },
          { skill: 'quake', cancel: 0.4, branch: [
            { when: { landed: true }, do: 'extend' },
            { when: { dist: [0, 320] }, chance: 0.5, do: 'delay', hold: [0.35, 0.6] },
            { do: 'stop' }] }] },
      ] },
    phase2: { speedMul: 1.18, dmgMul: 1.28, cdMul: 0.8, line: '熔核覺醒——萬物皆將化為灰燼！', aura: 'fire', fxEl: 'fire', transFx: { id: 'shellburst', el: 'fire' },
      note: '重錘變四連、衝撞後追加砸地、震波三圈、火山彈 5 發並留下熔岩，解鎖「熔岩噴發柱」' },
    skills: [
      { id: 'combo', name: '重錘三連', short: '重錘', tags: ['melee'], clash: 'heavy', range: [0, 196], cd: 3.2, cost: 26, track: 5, creep: 0.25, recovery: 0.85,
        actions: mCombo,
        actions2: [...mCombo, ...strike(2.15, 0.45, { shape: 'circle', r: 210, off: 42 },
          { dmg: 130, posture: 45, kb: 420, fx: 'slam', zone: { kind: 'lava', r: 84, dur: 4, dps: 28 } })] },
      { id: 'charge', name: '熔岩衝撞', short: '衝撞', tags: ['gap'], range: [240, 780], cd: 6, cost: 30, track: 4, recovery: 1.0,
        actions: mCharge,
        actions2: [...mCharge, ...strike(1.3, 0.35, { shape: 'circle', r: 210 }, { dmg: 100, posture: 30, kb: 400, fx: 'slam' })] },
      { id: 'quake', name: '地裂震波', short: '震波', tags: ['aoe', 'melee'], range: [0, 320], cd: 7, cost: 30, track: 3, recovery: 1.0,
        actions: mQuake,
        actions2: [...mQuake, ...strike(1.65, 0.4, { shape: 'ring', r0: 336, r: 480 }, { dmg: 70, posture: 20, kb: 250, fx: 'ring' })] },
      { id: 'breath', name: '熔岩噴吐', short: '噴吐', tags: ['ranged'], range: [0, 380], cd: 8, cost: 24, track: 1.4, sweep: true, recovery: 0.8,
        actions: [{ do: 'tele', at: 0, dur: 1.65, hitIn: 0.6, shape: 'cone', r: 392, arc: 60 * D, follow: true, lockBefore: -9 },
          ...[0, 1, 2, 3, 4, 5].map((i) => ({ do: 'hit', at: 0.6 + i * 0.2, shape: 'cone', r: 392, arc: 60 * D, dmg: 22, posture: 6, fx: 'breath', multi: true }))] },
      { id: 'meteor', name: '火山彈', short: '火彈', tags: ['ranged', 'aoe'], range: [210, 900], cd: 6.5, cost: 20, track: 5, recovery: 0.6,
        actions: [{ do: 'lob', at: 0.5, n: 3, scatter: 126, lead: 0.6, flight: 1.1, r: 112, dmg: 85, posture: 25, kb: 200, kind: 'fire' }],
        actions2: [{ do: 'lob', at: 0.5, n: 5, scatter: 182, lead: 0.6, flight: 1.0, r: 112, dmg: 85, posture: 25, kb: 200, kind: 'fire',
          zone: { kind: 'lava', r: 77, dur: 3.5, dps: 25 } }] },
      { id: 'pools', name: '熔岩池', short: '熔池', tags: ['zone'], range: [0, 800], cd: 12, cost: 18, track: 5, recovery: 0.5,
        actions: [{ do: 'zone', at: 0.45, kind: 'lava', pattern: 'flank', n: 3, off: 170, r: 105, dur: 7, dps: 30, delay: 0.9 }] },
      { id: 'erupt', name: '熔岩噴發柱', short: '噴發', phase: 2, tags: ['ranged', 'aoe'], range: [170, 950], cd: 8, cost: 24, track: 4, recovery: 0.7,
        actions: [{ do: 'tele', at: 0, dur: 0.7, shape: 'rect', len: 1000, w: 154, follow: true, hitIn: 0.75 },
          { do: 'erupt', at: 0.7, n: 7, start: 112, step: 140, interval: 0.08, r: 87, dmg: 75, posture: 25, kb: 300 }] },
    ],
    ultimate: { id: 'ult', name: '末日隕落', ult: true, range: [0, 1000], track: 6, recovery: 1.1,
      actions: [{ do: 'hide', at: 0.3, fx: 'leap' },
        { do: 'tele', at: 0.3, dur: 1.3, shape: 'circle', r: 294, anchor: 'target', setMark: 'U', follow: true, lockBefore: 0.45 },
        { do: 'land', at: 1.6, mark: 'U' },
        { do: 'hit', at: 1.6, shape: 'circle', r: 294, anchor: 'mark', mark: 'U', dmg: 240, posture: 80, kb: 650, fx: { id: 'bigslam', scale: 1.3 } },
        { do: 'rain', at: 1.8, n: 8, dur: 2.0, area: 448, r: 98, flight: 0.9, dmg: 65, posture: 20, kind: 'fire' }],
      actions2: [{ do: 'hide', at: 0.3, fx: 'leap' },
        { do: 'tele', at: 0.3, dur: 1.3, shape: 'circle', r: 322, anchor: 'target', setMark: 'U', follow: true, lockBefore: 0.45 },
        { do: 'land', at: 1.6, mark: 'U' },
        { do: 'hit', at: 1.6, shape: 'circle', r: 322, anchor: 'mark', mark: 'U', dmg: 270, posture: 90, kb: 700, fx: { id: 'bigslam', scale: 1.3 },
          zone: { kind: 'lava', r: 168, dur: 5, dps: 30 } },
        { do: 'rain', at: 1.8, n: 14, dur: 2.4, area: 560, r: 98, flight: 0.9, dmg: 65, posture: 20, kind: 'fire' }],
      desc: '躍入高空後砸向目標，引發隕石雨（二階段範圍更大、留下熔岩）' },
  };

  BD.registerBoss(magmus);
})(typeof window !== 'undefined' ? window : globalThis);
