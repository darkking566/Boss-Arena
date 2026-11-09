'use strict';
// 原作、圖片與改編界線：docs/bosses/borealis.md。數值、被動、半血與大招為觀戰遊戲改編。
(function (G) {
  const BD = G.BD, { D, strike } = BD.DataKit;
  const COLD = { id: 'rimebuildup', stacks: 23, dur: 10 };
  const FIELD = { kind: 'rimefog', r: 145, dur: 3.2, dps: 8, delay: 0.3, status: { id: 'rimebuildup', stacks: 12, dur: 10 } };
  const ICE = { fxEl: 'ice', status: COLD }, PHYS = { fxEl: 'physical' };
  function stream(at, n, len, fx) {
    return Array.from({ length: n }, (_, i) => ({ do: 'hit', at: +(at + i * 0.28).toFixed(3), shape: 'rect', len, w: 155,
      dmg: 30, posture: 6, kb: 55, multi: true, ...ICE, fx: fx || 'borealisbreath', ...(i % 2 ? {} : { zone: FIELD }) }));
  }
  function sweep(at, n, r) {
    return Array.from({ length: n }, (_, i) => ({ do: 'hit', at: +(at + i * 0.23).toFixed(3), shape: 'cone', r, arc: 42 * D,
      angOff: (65 - i * 130 / (n - 1)) * D, dmg: 33, posture: 6, kb: 70, multi: true, ...ICE, fx: 'borealisbreath', ...(i % 2 ? {} : { zone: FIELD }) }));
  }
  function roar(at, n, r) {
    return Array.from({ length: n }, (_, i) => ({ do: 'hit', at: +(at + i * 0.4).toFixed(3), shape: 'circle', r: r + i * 45,
      dmg: i ? 38 : 62, posture: i ? 10 : 24, kb: i ? 130 : 310, multi: true, ...ICE, fx: 'borealisroar',
      ...(i === n - 1 ? { zone: { ...FIELD, r: r + i * 45, dur: 2.8, dps: 6 } } : {}) }));
  }
  function dive(at, up, r, dmg) {
    return [{ do: 'tele', at: at - up, dur: up, shape: 'circle', r, anchor: 'target', follow: true, lockBefore: 0.45, setMark: 'iceLanding', chargeFx: false },
      { do: 'hide', at: at - up + 0.06, fx: 'borealistakeoff' }, { do: 'land', at, mark: 'iceLanding' },
      { do: 'hit', at, shape: 'circle', r, anchor: 'mark', mark: 'iceLanding', dmg, posture: 48, kb: 460, ...ICE, fx: 'borealiscrash', zone: { ...FIELD, r: r * 0.85 } }];
  }
  BD.registerBoss({
    id: 'borealis', name: '凍結冰霧・玻列琉斯', title: '冰結湖的白霧', archetype: '冰霧飛龍・凍傷壓制',
    desc: '巨人山頂冰結湖的冰龍。黑灰鱗甲托住霜白破片，厚重翼腕撐地，額前長角伸出白霧。以冰息、踩踏殘霧與昂首咆哮累積凍傷；滿值後碎冰爆發，短暫易傷並降低耐力恢復，火焰可解除。被動「冰結湖遺霧」（改編）：落地行動時每 8 秒預警後散出短命冰霧。半血「白霧再臨」及升空霧海大招為本遊戲新增。',
    color: '#d0e4e8', color2: '#394852', glow: '#89d7ee', style: 'borealis', rank: 'boss', stars: 3,
    radius: 96, sizeMul: 1.6, maxHp: 5350, speed: 215, turn: 3, mass: 3, fxEl: 'ice', hurt: 'frost', traits: ['freezingfog'],
    stamina: { max: 170, regen: 30 }, posture: 255, dodgeCost: 28, dodgeSpeed: 395,
    ai: { prefRange: [190, 440], aggression: 0.7, dodge: 0.2, precision: 0.65, reaction: 0.32, strafe: 0.3, walk: 0.74,
      feint: 0.03, delay: 0.28, retreat: 0.18, punish: 0.62, nervous: 0.08, patience: 0.4, safeCancel: true,
      combos: [
        { id: 'frostfloor', name: '重踏・霜吼', weight: 1.2, steps: [{ skill: 'ice_stomp' }, { skill: 'freezing_roar', cancel: 0.3, branch: [{ when: { dist: [0, 690] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'mistchase', name: '後撤・追息', weight: 1.2, steps: [{ skill: 'retreat_breath' }, { skill: 'ice_breath', cancel: 0.3, branch: [{ when: { dist: [200, 1100] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'tailmist', name: '尾鞭・橫息', weight: 1.1, steps: [{ skill: 'tail_whip' }, { skill: 'sweeping_breath', cancel: 0.3, branch: [{ when: { dist: [0, 1000] }, do: 'extend' }, { do: 'stop' }] }] },
      ],
    },
    phase2: { speedMul: 1.08, dmgMul: 1.1, cdMul: 0.9, line: '——白霧再臨。背脊霜線逐段亮起，冰龍昂首，將整片寒霧吼向湖面。',
      fxEl: 'ice', transFx: { id: 'borealisawaken', el: 'ice' }, transDur: 2.7, roarAt: 1.85,
      note: '本遊戲半血改編「白霧再臨」：霜白翼緣泛光，吐息與咆哮擴張，解鎖龍饗幻影；大招增加低空掠息、升空撲落與三重外擴冰環，並非原作固定半血變身',
    },
    skills: [
      { id: 'ice_bite', name: '冰牙前噬', short: '冰牙', tags: ['melee'], range: [0, 300], cd: 3.8, cost: 18, track: 5, recovery: 0.6,
        actions: [...strike(0.6, 0.46, { shape: 'cone', r: 265, arc: 110 * D }, { dmg: 120, posture: 24, kb: 190, ...PHYS, fx: 'borealisbite' })] },
      { id: 'wing_sweep', name: '霜翼橫擊', short: '霜翼', tags: ['melee', 'aoe'], range: [0, 370], cd: 5.4, cost: 22, track: 3, recovery: 0.8,
        actions: [...strike(0.9, 0.75, { shape: 'cone', r: 340, arc: 165 * D }, { dmg: 134, posture: 32, kb: 380, ...PHYS, fx: 'borealiswing' })] },
      { id: 'ice_stomp', name: '踏冰揚霧', short: '冰踏', tags: ['melee', 'aoe'], range: [0, 260], cd: 4.6, cost: 21, track: 3, recovery: 0.7,
        actions: [...strike(0.8, 0.65, { shape: 'circle', r: 210 }, { dmg: 126, posture: 33, kb: 295, ...PHYS, fx: 'borealisstomp', zone: { ...FIELD, r: 175 } })] },
      { id: 'tail_whip', name: '迴身霜尾', short: '霜尾', tags: ['melee', 'aoe'], range: [0, 400], cd: 6, cost: 25, track: 4, recovery: 0.8,
        actions: [...strike(0.9, 0.75, { shape: 'cone', r: 380, arc: 270 * D, angOff: Math.PI }, { dmg: 145, posture: 37, kb: 430, ...PHYS, fx: 'borealistail' }),
          ...strike(1.5, 0.4, { shape: 'cone', r: 260, arc: 100 * D }, { dmg: 75, posture: 14, kb: 150, multi: true, ...PHYS, fx: 'borealisbite' })] },
      { id: 'ice_breath', name: '冰霧直息', short: '直息', tags: ['ranged', 'aoe'], range: [140, 850], cd: 8.5, cost: 30, track: 1.8, sweep: true, recovery: 1,
        actions: [{ do: 'tele', at: 0.06, dur: 1.05, shape: 'rect', len: 760, w: 155, follow: true, lockBefore: 0.3, chargeFx: 'borealisinhale' }, ...stream(1.11, 6, 760)] },
      { id: 'sweeping_breath', name: '橫掃冰息', short: '橫息', tags: ['ranged', 'aoe'], range: [100, 760], cd: 9, cost: 31, track: 2, sweep: true, recovery: 0.95,
        actions: [{ do: 'tele', at: 0.06, dur: 1.15, shape: 'cone', r: 665, arc: 175 * D, follow: true, lockBefore: 0.35, chargeFx: 'borealisinhale' }, ...sweep(1.21, 7, 665)],
        actions2: [{ do: 'tele', at: 0.06, dur: 1.15, shape: 'cone', r: 735, arc: 175 * D, follow: true, lockBefore: 0.35, chargeFx: 'borealisinhale' }, ...sweep(1.21, 8, 735)] },
      { id: 'retreat_breath', name: '後撤俯息', short: '退息', tags: ['defensive', 'ranged', 'aoe'], range: [0, 490], cd: 10, cost: 28, track: 2.5, recovery: 0.95,
        actions: [{ do: 'dash', at: 0.1, dir: 'back', dist: 185, dur: 0.55, fx: 'borealistakeoff' },
          { do: 'tele', at: 0.12, dur: 0.95, shape: 'circle', r: 420, off: 110, follow: true, chargeFx: 'borealisinhale' },
          ...[0, 1, 2].map(i => ({ do: 'hit', at: +(1.07 + i * 0.3).toFixed(3), shape: 'circle', r: 420, off: 110, dmg: 38, posture: 8, kb: 90, multi: true, ...ICE, fx: 'borealisdownbreath', ...(i === 2 ? { zone: { ...FIELD, r: 200 } } : {}) }))] },
      { id: 'aerial_breath', name: '懸空覆霜', short: '覆霜', tags: ['ranged', 'aoe'], range: [0, 620], cd: 11.5, cost: 32, track: 2, recovery: 1.1,
        actions: [{ do: 'tele', at: 0.1, dur: 1.2, shape: 'circle', r: 440, off: 180, follow: true, lockBefore: 0.35, chargeFx: 'borealisinhale' },
          ...[0, 1, 2, 3].map(i => ({ do: 'hit', at: +(1.3 + i * 0.32).toFixed(3), shape: 'circle', r: 440, off: 180, dmg: 34, posture: 8, kb: 85, multi: true, ...ICE, fx: 'borealisdownbreath', ...(i === 3 ? { zone: { ...FIELD, r: 260 } } : {}) }))] },
      { id: 'dive_bomb', name: '冰翼撲落', short: '撲落', tags: ['gap', 'aoe'], range: [200, 900], cd: 10.8, cost: 31, track: 4, recovery: 1.1,
        actions: dive(1.8, 1.6, 215, 158) },
      { id: 'freezing_roar', name: '凍結咆哮', short: '霜吼', tags: ['aoe'], range: [0, 530], cd: 12.5, cost: 35, track: 1.5, recovery: 1,
        actions: [{ do: 'tele', at: 0.08, dur: 1.27, shape: 'circle', r: 460, follow: true, chargeFx: 'borealisgather' }, ...roar(1.35, 2, 415)],
        actions2: [{ do: 'tele', at: 0.08, dur: 1.27, shape: 'circle', r: 550, follow: true, chargeFx: 'borealisgather' }, ...roar(1.35, 3, 460)] },
      { id: 'borealis_mist', name: '龍饗・玻列琉斯的冰霧', short: '龍饗', phase: 2, tags: ['ranged', 'aoe'], range: [180, 900], cd: 15, cost: 39, track: 1.6, sweep: true, recovery: 1.2,
        actions: [{ do: 'tele', at: 0.08, dur: 1.32, shape: 'rect', len: 810, w: 220, follow: true, lockBefore: 0.4, chargeFx: 'borealisgather' },
          ...stream(1.4, 7, 810, 'borealiscommunion').map(a => ({ ...a, w: 220 }))] },
    ],
    ultimate: { id: 'ult', name: '失落山巔・永凍白幕', name2: '白霧再臨・冰海葬場', ult: true, range: [0, 1100], track: 3, recovery: 1.15,
      desc: '本遊戲新編：蓄霜長吼，霧浪由近推遠，再橫掃湖面；半血後低空掠息、收翼撲落，三重冰環沿地面依序外擴。',
      actions: [{ do: 'tele', at: 0.1, dur: 1.2, shape: 'circle', r: 510, follow: true, chargeFx: 'borealisawaken' },
        ...roar(1.3, 3, 420), ...sweep(2.75, 7, 760),
        ...strike(4.65, 0.45, { shape: 'ring', r0: 180, r: 570 }, { dmg: 86, posture: 28, kb: 350, multi: true, ...ICE, fx: 'borealisring' })],
      actions2: [{ do: 'tele', at: 0.1, dur: 1.2, shape: 'circle', r: 550, follow: true, chargeFx: 'borealisawaken' }, ...roar(1.3, 3, 460),
        { do: 'tele', at: 1.8, dur: 0.45, shape: 'rect', len: 480, w: 200, follow: true, lockBefore: 0.25, chargeFx: false },
        { do: 'dash', at: 2.25, dist: 480, dur: 1, fx: 'borealistakeoff', trail: { ...FIELD, r: 95, dur: 2.8 } },
        ...[0, 1, 2].map(i => ({ do: 'hit', at: +(2.3 + i * 0.32).toFixed(3), shape: 'cone', r: 600, arc: 55 * D, angOff: (i - 1) * 0.5,
          dmg: 35, posture: 8, kb: 80, multi: true, ...ICE, fx: 'borealisbreath' })),
        ...dive(4.75, 1.4, 265, 175),
        ...[0, 1, 2].flatMap(i => strike(5.15 + i * 0.55, 0.4, { shape: 'ring', r0: 170 + i * 175, r: 370 + i * 175 },
          { dmg: 65 + i * 6, posture: 22, kb: 250, multi: true, ...ICE, fx: 'borealisring' }))],
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
