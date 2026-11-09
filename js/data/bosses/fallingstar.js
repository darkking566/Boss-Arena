'use strict';
// 原作考據 / 圖片查看與改編界線：docs/bosses/fallingstar.md、docs/research/fallingstar/。
// 招式取自原作墜星獸 / 墜星成獸的動作（攻略站命名的 Head Swing、Tail Sweep、Gravitas、Gravity Bolt、Reverse Gravity、Gravity Ray…）；數值與演出為本遊戲改編。
(function (G) {
  const BD = G.BD, { D, strike } = BD.DataKit;
  const GRAV = { fxEl: 'gravity' }, PHYS = { fxEl: 'physical' };
  const BLEED = { id: 'bleed', stacks: 34 }; // 原作尾刺會造成出血
  // 重力雷：先在目標腳下聚起紫雷（鎖定後不再追），再從地面刺出岩柱
  function bolt(at, up, r, dmg, mark) {
    return [
      { do: 'tele', at: at - up, dur: up, shape: 'circle', r, anchor: 'target', follow: true, lockBefore: 0.35, setMark: mark, chargeFx: false, teleFx: 'fsboltcharge' },
      { do: 'hit', at, shape: 'circle', r, anchor: 'mark', mark, dmg, posture: Math.round(dmg * 0.3), kb: 200, multi: true, ...GRAV, fx: 'fsbolt' },
    ];
  }
  function charge(at, n) { // 原作：低頭張顎全速衝鋒，折返兩次
    return Array.from({ length: n }, (_, i) => {
      const t = at + i * 1.05;
      return [{ do: 'tele', at: t, dur: 0.55, shape: 'rect', len: 520, w: 150, follow: true, lockBefore: 0.18, chargeFx: false },
        { do: 'dash', at: t + 0.55, dist: 500, dur: 0.42, fx: 'fscharge', hit: { dmg: 98 + i * 8, posture: 26, kb: 380 } }];
    }).flat();
  }
  function roll(at, up, r, dmg) { // 原作：後躍、捲成一球懸空片刻，再朝目標砸落
    return [
      { do: 'tele', at: at - up, dur: up, shape: 'circle', r, anchor: 'target', follow: true, lockBefore: 0.4, setMark: 'fsLanding', chargeFx: false },
      { do: 'hide', at: at - up + 0.03, fx: 'fsjump' },
      { do: 'land', at, mark: 'fsLanding' },
      { do: 'hit', at, shape: 'circle', r, anchor: 'mark', mark: 'fsLanding', dmg, posture: 50, kb: 460, ...PHYS, fx: 'fsroll' },
    ];
  }
  function ray(at, n, len, from, to, dmg) { // 原作：左肩上方凝聚重力球，射出順時針橫掃的巨大光束
    return Array.from({ length: n }, (_, i) => ({ do: 'hit', at: +(at + i * 0.2).toFixed(3), shape: 'rect', len, w: 140,
      angOff: (from + (to - from) * i / (n - 1)) * D, dmg, posture: 7, kb: 90, multi: true, ...GRAV, fx: 'fsray' }));
  }
  BD.registerBoss({
    id: 'fallingstar', name: '墜星成獸', title: '無光彼方的隕星', archetype: '隕星重獸・重力壓制',
    desc: '自無光彼方隨隕石墜落的成長個體，盤踞格密爾火山的山巔。閃亮黑岩構成的四足身軀，頸間與臀部長著白毛，頭部正中嵌著一顆藍紫色的眼核，前方一對巨大彎顎，背上豎起晶刺、尖刺長尾高高捲起。像公牛一樣橫衝直撞，用顎掘地拋岩，並能操控周身的重力：把敵人吸過來、從地底召來重力雷，半血後更會讓重力反轉、射出橫掃的重力光束。被動「星核引力」（改編）：每挨 4 下直接攻擊，眼核發光預警後把附近的敵人吸向原地，至少間隔 8 秒。',
    color: '#8c7bd6', color2: '#1d1c24', glow: '#a77bff', style: 'fallingstar', rank: 'boss', stars: 3,
    radius: 85, sizeMul: 1.5, maxHp: 4500, speed: 235, turn: 3.4, mass: 2.6, fxEl: 'gravity', hurt: 'flesh', traits: ['starcore'],
    stamina: { max: 165, regen: 32 }, posture: 235, dodgeCost: 26, dodgeSpeed: 420,
    ai: { prefRange: [180, 440], aggression: 0.78, dodge: 0.2, precision: 0.62, reaction: 0.3, strafe: 0.32, walk: 0.7,
      feint: 0.05, delay: 0.25, retreat: 0.14, punish: 0.62, nervous: 0.08, patience: 0.32,
      combos: [
        { id: 'jawtail', name: '顎掃・尾刺', weight: 1.3, steps: [{ skill: 'head_swing' }, { skill: 'tail_sweep', cancel: 0.3, branch: [{ when: { dist: [0, 420] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'stomprock', name: '踏碎・拋岩', weight: 1.2, steps: [{ skill: 'fore_stomp' }, { skill: 'rock_throw', cancel: 0.3, branch: [{ when: { dist: [160, 900] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'stampede', name: '狂奔・墜擊', weight: 1.1, steps: [{ skill: 'charge' }, { skill: 'beast_roll', cancel: 0.3, branch: [{ when: { dist: [200, 900] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'collapse', name: '引力・反轉', weight: 1.3, phase: 2, steps: [{ skill: 'gravitas' }, { skill: 'reverse_gravity', cancel: 0.3, branch: [{ when: { dist: [0, 560] }, do: 'extend' }, { do: 'stop' }] }] },
      ],
    },
    phase2: { speedMul: 1.1, dmgMul: 1.12, cdMul: 0.88, line: '——眼核轉為深紫，周圍的岩石浮上半空。重力，開始反轉。',
      fxEl: 'gravity', transFx: { id: 'fsawaken', el: 'gravity' }, transDur: 2.6, roarAt: 1.8,
      note: '原作墜星成獸在半血後才使用「重力反轉」與「重力光束」：本遊戲照此解鎖兩招；眼核紫光、浮空碎岩與背部晶刺發光是演出改編，大招也加入浮空與光束',
    },
    skills: [
      { id: 'head_swing', name: '彎顎連掃', short: '顎掃', tags: ['melee'], range: [0, 300], cd: 4, cost: 18, track: 5, recovery: 0.55,
        actions: [...strike(0.5, 0.4, { shape: 'cone', r: 260, arc: 120 * D, angOff: -0.35 }, { dmg: 90, posture: 20, kb: 160, ...PHYS, fx: 'fsmandible' }),
          ...strike(1.0, 0.34, { shape: 'cone', r: 280, arc: 125 * D, angOff: 0.35 }, { dmg: 108, posture: 24, kb: 240, ...PHYS, fx: 'fsmandible', multi: true })] },
      { id: 'tail_sweep', name: '星刺尾掃', short: '尾掃', tags: ['melee', 'aoe'], range: [0, 320], cd: 6.5, cost: 22, track: 4, recovery: 0.75,
        // 原作先轉身再貼地掃尾：本遊戲以原地迴轉一圈表現，前方也掃得到
        actions: [...strike(0.85, 0.7, { shape: 'circle', r: 300 }, { dmg: 84, posture: 24, kb: 300, ...PHYS, fx: 'fstail', status: BLEED })] },
      { id: 'fore_stomp', name: '人立踏碎', short: '踏碎', tags: ['melee', 'aoe'], range: [0, 320], cd: 6, cost: 22, track: 3, recovery: 0.8,
        actions: [...strike(0.85, 0.7, { shape: 'circle', r: 190, off: 135 }, { dmg: 128, posture: 36, kb: 330, ...PHYS, fx: 'fsstomp' }),
          ...strike(1.4, 0.35, { shape: 'rect', len: 330, w: 150 }, { dmg: 92, posture: 22, kb: 260, ...PHYS, fx: 'fsmandible', multi: true })] },
      { id: 'hind_kick', name: '後蹄踐踏', short: '後蹄', tags: ['melee', 'aoe'], range: [0, 260], cd: 5, cost: 16, track: 2, recovery: 0.6,
        actions: [...strike(0.6, 0.5, { shape: 'circle', r: 210, off: -60 }, { dmg: 112, posture: 30, kb: 380, ...PHYS, fx: 'fsstomp' })] },
      { id: 'gouge', name: '顎掘衝撕', short: '顎掘', tags: ['gap', 'melee'], range: [120, 520], cd: 7, cost: 25, track: 3.5, recovery: 0.85,
        actions: [{ do: 'tele', at: 0.05, dur: 0.7, shape: 'rect', len: 470, w: 170, follow: true, lockBefore: 0.25, chargeFx: false },
          { do: 'dash', at: 0.75, dist: 330, dur: 0.5, fx: 'fsgouge', hit: { dmg: 118, posture: 32, kb: 320 } },
          { do: 'erupt', at: 0.85, n: 4, interval: 0.1, start: 140, step: 105, r: 95, dmg: 46, posture: 10, kb: 180, fx: 'fsspike', fxEl: 'gravity' }] },
      { id: 'bite', name: '擒顎重摔', short: '擒顎', tags: ['gap', 'melee'], range: [100, 520], cd: 9, cost: 28, track: 4, recovery: 1,
        actions: [{ do: 'dash', at: 0.05, dir: 'back', dist: 120, dur: 0.35, fx: 'fsjump' },
          { do: 'tele', at: 0.4, dur: 0.6, shape: 'rect', len: 430, w: 190, follow: true, lockBefore: 0.2, chargeFx: false },
          { do: 'dash', at: 1.0, dist: 360, dur: 0.32, fx: 'fsmandible', hit: { dmg: 158, posture: 46, kb: 540 } }] },
      { id: 'rock_throw', name: '掘岩拋射', short: '拋岩', tags: ['ranged'], range: [180, 900], cd: 7.5, cost: 24, track: 3, recovery: 0.8,
        actions: [{ do: 'tele', at: 0.05, dur: 0.9, shape: 'cone', r: 780, arc: 46 * D, follow: true, lockBefore: 0.25, chargeFx: 'fsdig' },
          { do: 'proj', at: 0.95, n: 7, spread: 0.11, speed: 860, r: 24, dmg: 52, posture: 12, kb: 170, life: 1.1, kind: 'starrock', deflect: true, fx: 'fsrockburst', fxEl: 'physical' }] },
      { id: 'beast_roll', name: '星球墜擊', short: '墜擊', tags: ['gap', 'aoe'], range: [200, 850], cd: 10, cost: 28, track: 4, recovery: 1.05, actions: roll(1.75, 1.6, 230, 155) },
      { id: 'gravitas', name: '引力崩落', short: '引力', tags: ['aoe'], range: [0, 520], cd: 11, cost: 32, track: 1.5, recovery: 1,
        actions: [{ do: 'tele', at: 0.05, dur: 1.05, shape: 'circle', r: 380, follow: true, chargeFx: 'fsrear' },
          { do: 'gravpull', at: 1.1, r: 400, dmg: 28, posture: 8, kb: 560, fx: 'fspull' },
          ...strike(1.75, 0.5, { shape: 'circle', r: 220 }, { dmg: 118, posture: 36, kb: 360, ...GRAV, fx: 'fsspikes' }),
          ...strike(2.0, 0.45, { shape: 'ring', r0: 220, r: 380 }, { dmg: 70, posture: 18, kb: 260, multi: true, ...GRAV, fx: 'fsspikes' })] },
      { id: 'gravity_bolt', name: '重力雷・三重', short: '重雷', tags: ['ranged', 'aoe'], range: [150, 950], cd: 10, cost: 30, track: 2, recovery: 1,
        actions: [...bolt(1.0, 0.9, 115, 66, 'fsB1'), ...bolt(1.75, 0.65, 115, 66, 'fsB2'), ...bolt(2.75, 0.95, 270, 104, 'fsB3')] },
      { id: 'charge', name: '狂牛三連衝', short: '三衝', tags: ['gap', 'melee'], range: [240, 820], cd: 10, cost: 30, track: 6, recovery: 1, actions: charge(0.1, 3) },
      { id: 'reverse_gravity', name: '重力反轉', short: '反轉', phase: 2, tags: ['aoe'], range: [0, 560], cd: 13, cost: 34, track: 1.5, recovery: 1.1,
        actions: [{ do: 'tele', at: 0.05, dur: 1.1, shape: 'circle', r: 430, follow: true, chargeFx: 'fsrear' },
          { do: 'hit', at: 1.15, shape: 'circle', r: 430, dmg: 36, posture: 10, kb: 0, status: { id: 'airborne', dur: 1.05 }, ...GRAV, fx: 'fsreverse' },
          { do: 'hit', at: 2.05, shape: 'circle', r: 430, dmg: 150, posture: 48, kb: 300, multi: true, ...GRAV, fx: 'fsslam' }] },
      { id: 'gravity_ray', name: '重力光束', short: '光束', phase: 2, tags: ['ranged', 'aoe'], range: [200, 950], cd: 14, cost: 38, track: 1.2, sweep: true, recovery: 1.2,
        actions: [{ do: 'tele', at: 0.05, dur: 1.4, shape: 'cone', r: 950, arc: 120 * D, follow: true, lockBefore: 0.4, chargeFx: 'fsorb' }, ...ray(1.5, 9, 950, -60, 60, 38)] },
    ],
    ultimate: { id: 'ult', name: '隕星召來・無光彼方', name2: '星之成獸・重力崩壞', ult: true, range: [0, 1000], track: 3, recovery: 1.3,
      desc: '本遊戲新編：眼核吸盡周圍的光，把敵人吸向身前，再從天外召下一輪黑岩隕星雨，最後以全身重量砸地；二階段先讓整片地面重力反轉，隕星雨落下後再射出繞行一周的重力光束。',
      actions: [{ do: 'tele', at: 0.1, dur: 1.4, shape: 'circle', r: 560, follow: true, chargeFx: 'fsawaken' },
        { do: 'gravpull', at: 1.5, r: 620, dmg: 34, posture: 10, kb: 680, fx: 'fspull' },
        { do: 'rain', at: 1.7, n: 14, dur: 2, area: 380, flight: 0.8, r: 95, dmg: 62, posture: 14, kb: 200, kind: 'starrock', fx: 'fsmeteor', teleColor: '#a77bff' },
        ...strike(4.5, 0.6, { shape: 'circle', r: 320 }, { dmg: 165, posture: 50, kb: 460, ...GRAV, fx: 'fsslam' })],
      actions2: [{ do: 'tele', at: 0.1, dur: 1.3, shape: 'circle', r: 560, follow: true, chargeFx: 'fsawaken' },
        { do: 'hit', at: 1.4, shape: 'circle', r: 560, dmg: 40, posture: 12, kb: 0, status: { id: 'airborne', dur: 1.3 }, ...GRAV, fx: 'fsreverse' },
        { do: 'rain', at: 1.5, n: 12, dur: 1.4, area: 360, flight: 0.7, r: 95, dmg: 58, posture: 12, kb: 180, kind: 'starrock', fx: 'fsmeteor', teleColor: '#a77bff' },
        { do: 'hit', at: 2.7, shape: 'circle', r: 560, dmg: 150, posture: 46, kb: 360, multi: true, ...GRAV, fx: 'fsslam' },
        { do: 'tele', at: 3.0, dur: 0.9, shape: 'circle', r: 950, chargeFx: 'fsorb' }, ...ray(4.0, 13, 950, -180, 180, 34)],
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
