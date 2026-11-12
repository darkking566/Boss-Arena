'use strict';
// 原作考據 / 圖片查看與改編界線：docs/bosses/ekzykes.md、docs/research/ekzykes/。
(function (G) {
  const BD = G.BD, { D, strike } = BD.DataKit;
  const ROT = { id: 'rotbuildup', stacks: 32, dur: 10 };
  const FIELD = { kind: 'scarletrot', r: 125, dur: 4.2, dps: 14, delay: 0.25, status: { id: 'rotbuildup', stacks: 14, dur: 10 } };
  const ROTTEN = { fxEl: 'scarletrot', status: ROT };
  const PHYS = { fxEl: 'physical' };
  function sweep(at, n, r, gap) {
    return Array.from({ length: n }, (_, i) => ({ do: 'hit', at: +(at + i * gap).toFixed(3), shape: 'cone', r, arc: 42 * D,
      angOff: (62 - i * 124 / (n - 1)) * D, dmg: 35, posture: 5, kb: 55, multi: true, ...ROTTEN,
      fx: 'ekzykesbreath', zone: { ...FIELD, r: 145 } }));
  }
  function stream(at, n, len) {
    return Array.from({ length: n }, (_, i) => ({ do: 'hit', at: +(at + i * 0.3).toFixed(3), shape: 'rect', len, w: 165,
      dmg: 34, posture: 6, kb: 60, multi: true, ...ROTTEN, fx: 'ekzykesbreath', ...(i % 2 ? {} : { zone: FIELD }) }));
  }
  function miasma(at, count, r) {
    return Array.from({ length: count }, (_, i) => ({ do: 'hit', at: +(at + i * 0.42).toFixed(3), shape: 'circle', r: r + i * 30,
      dmg: 30, posture: 7, kb: 75, multi: true, ...ROTTEN, fx: 'ekzykesmiasma', ...(i === count - 1 ? { zone: { ...FIELD, r: r + i * 30, dur: 4.5, dps: 8 } } : {}) }));
  }
  function dive(at, up, r, dmg) {
    return [
      { do: 'tele', at: at - up, dur: up, shape: 'circle', r, anchor: 'target', follow: true, lockBefore: 0.45, setMark: 'ekLanding', chargeFx: false },
      { do: 'hide', at: at - up + 0.03, fx: 'ekzykestakeoff' },
      { do: 'land', at, mark: 'ekLanding' },
      { do: 'hit', at, shape: 'circle', r, anchor: 'mark', mark: 'ekLanding', dmg, posture: 52, kb: 480, ...ROTTEN, fx: 'ekzykescrash', zone: { ...FIELD, r: r * 0.82 } },
    ];
  }
  BD.registerBoss({
    id: 'ekzykes', name: '步入腐敗・艾格基斯', title: '龍饗復仇者', archetype: '腐龍・霧海壓制',
    desc: '蓋利德的腐敗巨龍。灰黑鱗肉從灰白菌絲下露出，傷口暗紅，兩隻巨大翼肢支撐低伏身軀；牠即使身受猩紅腐敗，仍未忘卻憎恨。以踩踏、甩尾與回咬守住近身，再噴出橫掃、追蹤與向下洩出的赭紅腐霧。腐敗要累積滿才發作，離開霧區可避免繼續累積。被動「腐軀洩霧」（改編）：每挨 4 下直接攻擊，預警後在身邊留下孢霧，至少間隔 7 秒。',
    color: '#d4c8b4', color2: '#514b43', glow: '#d66e54', style: 'ekzykes', rank: 'boss', stars: 3,
    radius: 100, sizeMul: 1.6, maxHp: 5400, speed: 195, turn: 2.9, mass: 2.9, fxEl: 'scarletrot', hurt: 'flesh', traits: ['rottingbody'],
    stamina: { max: 170, regen: 30 }, posture: 250, dodgeCost: 28, dodgeSpeed: 390,
    ai: { prefRange: [200, 460], aggression: 0.7, dodge: 0.18, precision: 0.64, reaction: 0.34, strafe: 0.28, walk: 0.72,
      feint: 0.04, delay: 0.3, retreat: 0.18, punish: 0.6, nervous: 0.08, patience: 0.4,
      combos: [
        { id: 'rotground', name: '腐踏・洩腐', weight: 1.3, steps: [{ skill: 'rot_stomp' }, { skill: 'great_miasma', cancel: 0.3, branch: [{ when: { dist: [0, 700] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'fogchase', name: '退翼・追腐', weight: 1.2, steps: [{ skill: 'retreat_breath' }, { skill: 'tracking_breath', cancel: 0.3, branch: [{ when: { dist: [230, 850] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'tailfog', name: '尾鞭・橫息', weight: 1.2, steps: [{ skill: 'tail_whip' }, { skill: 'sweeping_breath', cancel: 0.3, branch: [{ when: { dist: [0, 950] }, do: 'extend' }, { do: 'stop' }] }] },
      ],
    },
    phase2: { speedMul: 1.08, dmgMul: 1.12, cdMul: 0.88, line: '——腐敗侵骨，憎恨未熄。灰白菌絲顫裂，整片猩紅霧海翻湧。',
      fxEl: 'scarletrot', transFx: { id: 'ekzykesheart', el: 'scarletrot' }, transDur: 2.6, roarAt: 1.8,
      note: '「憎恨未熄」是本遊戲半血改編，沒有宣稱原作在半血變身：潰爛處紅光脈動，吐息與腐霧擴張；解鎖「龍饗・艾格基斯的腐敗」；大招增加落地腐爆與向外推進的兩重霧浪',
    },
    skills: [
      { id: 'rot_stomp', name: '腐爛重踏', short: '腐踏', tags: ['melee', 'aoe'], range: [0, 240], cd: 4, cost: 18, track: 3, recovery: 0.7,
        actions: [...strike(0.75, 0.6, { shape: 'circle', r: 195 }, { dmg: 122, posture: 32, kb: 280, ...PHYS, fx: 'ekzykesstomp', zone: { ...FIELD, r: 155, dur: 3.3 } })] },
      { id: 'double_bite', name: '腐顎・連環回咬', short: '回咬', tags: ['melee'], range: [0, 300], cd: 4.6, cost: 20, track: 5, recovery: 0.6,
        actions: [...strike(0.55, 0.42, { shape: 'cone', r: 250, arc: 105 * D, angOff: -0.3 }, { dmg: 94, posture: 20, kb: 110, ...PHYS, fx: 'ekzykesbite' }),
          ...strike(1.08, 0.36, { shape: 'cone', r: 280, arc: 110 * D, angOff: 0.3 }, { dmg: 116, posture: 25, kb: 220, ...PHYS, fx: 'ekzykesbite', multi: true })] },
      { id: 'wing_sweep', name: '枯翼橫掃', short: '翼掃', tags: ['melee', 'aoe'], range: [0, 370], cd: 5.6, cost: 23, track: 3, recovery: 0.8,
        actions: [...strike(0.9, 0.75, { shape: 'cone', r: 335, arc: 170 * D }, { dmg: 135, posture: 34, kb: 420, ...PHYS, fx: 'ekzykeswing' })] },
      { id: 'tail_whip', name: '腐尾・迴身重鞭', short: '甩尾', tags: ['melee', 'aoe'], range: [0, 390], cd: 6, cost: 25, track: 4, recovery: 0.8,
        actions: [...strike(0.85, 0.7, { shape: 'cone', r: 380, arc: 265 * D, angOff: Math.PI }, { dmg: 146, posture: 40, kb: 450, ...PHYS, fx: 'ekzykestail' }),
          ...strike(1.5, 0.36, { shape: 'cone', r: 265, arc: 105 * D }, { dmg: 81, posture: 16, kb: 150, ...PHYS, fx: 'ekzykesbite', multi: true })] },
      { id: 'rotting_charge', name: '低伏龍軀突進', short: '龍撞', tags: ['gap', 'melee'], range: [220, 650], cd: 7.5, cost: 27, track: 3.5, recovery: 0.9,
        actions: [{ do: 'tele', at: 0.05, dur: 0.78, shape: 'rect', len: 460, w: 170, follow: true, lockBefore: 0.3, chargeFx: 'ekzykesroar' },
          { do: 'dash', at: 0.83, dist: 440, dur: 0.52, fx: 'ekzykescharge', hit: { dmg: 138, posture: 35, kb: 350 } }] },
      { id: 'sweeping_breath', name: '猩紅腐敗・橫掃吐息', short: '橫息', tags: ['ranged', 'aoe'], range: [100, 740], cd: 8.5, cost: 30, track: 2, sweep: true, recovery: 0.95,
        actions: [{ do: 'tele', at: 0.05, dur: 1.12, shape: 'cone', r: 660, arc: 165 * D, follow: true, lockBefore: 0.35, chargeFx: 'ekzykesroar' }, ...sweep(1.17, 7, 660, 0.25)],
        actions2: [{ do: 'tele', at: 0.05, dur: 1.12, shape: 'cone', r: 730, arc: 165 * D, follow: true, lockBefore: 0.35, chargeFx: 'ekzykesroar' }, ...sweep(1.17, 8, 730, 0.23)] },
      { id: 'tracking_breath', name: '猩紅腐敗・追蹤吐息', short: '追息', tags: ['ranged', 'aoe'], range: [120, 850], cd: 9, cost: 32, track: 1.8, sweep: true, recovery: 1,
        actions: [{ do: 'tele', at: 0.05, dur: 1.1, shape: 'rect', len: 780, w: 165, follow: true, lockBefore: 0.3, chargeFx: 'ekzykesroar' }, ...stream(1.15, 6, 780)] },
      { id: 'retreat_breath', name: '後躍・俯身洩腐', short: '退息', tags: ['gap', 'ranged', 'aoe'], range: [0, 480], cd: 9.5, cost: 28, track: 2, recovery: 0.9,
        actions: [{ do: 'tele', at: 0.05, dur: 0.85, shape: 'circle', r: 460, follow: true, chargeFx: 'ekzykesroar' },
          { do: 'dash', at: 0.1, dir: 'back', dist: 175, dur: 0.65, fx: 'ekzykestakeoff' }, ...miasma(0.9, 3, 400)] },
      { id: 'dive_bomb', name: '腐翼・滯空撲落', short: '撲落', tags: ['gap', 'aoe'], range: [200, 850], cd: 10.5, cost: 30, track: 4, recovery: 1.1, actions: dive(1.8, 1.65, 215, 150) },
      { id: 'great_miasma', name: '艾格基斯・大腐霧', short: '腐霧', tags: ['aoe'], range: [0, 540], cd: 13, cost: 36, track: 1.5, recovery: 1.1,
        actions: [{ do: 'tele', at: 0.08, dur: 1.45, shape: 'circle', r: 480, follow: true, chargeFx: 'ekzykesroar' }, ...miasma(1.53, 4, 390)],
        actions2: [{ do: 'tele', at: 0.08, dur: 1.45, shape: 'circle', r: 550, follow: true, chargeFx: 'ekzykesroar' }, ...miasma(1.53, 5, 430)] },
      // 從玩家龍饗祈禱取得視覺依據，不冒稱這是原作 Boss 的額外招式。
      { id: 'ekzykes_decay', name: '龍饗・艾格基斯的腐敗', short: '龍饗', phase: 2, tags: ['ranged', 'aoe'], range: [200, 850], cd: 15, cost: 39, track: 1.5, sweep: true, recovery: 1.2,
        actions: [{ do: 'tele', at: 0.1, dur: 1.4, shape: 'cone', r: 810, arc: 70 * D, follow: true, lockBefore: 0.45, chargeFx: 'ekzykesheart' },
          ...Array.from({ length: 7 }, (_, i) => ({ do: 'hit', at: +(1.5 + i * 0.28).toFixed(3), shape: 'cone', r: 810, arc: 70 * D, dmg: 31, posture: 8, kb: 85, multi: true, ...ROTTEN, fx: 'ekzykesbreath', zone: { ...FIELD, r: 195 } }))] },
    ],
    ultimate: { id: 'ult', name: '龍饗復仇・腐霧葬場', name2: '憎恨未熄・猩紅霧海', ult: true, range: [0, 1000], track: 3, recovery: 1.3,
      desc: '本遊戲新編：低吼蓄腐、抬起枯翼、由近及遠吐出多重霧浪；二階段再短暫升空撲落，兩圈猩紅腐霧依序擴張。',
      actions: [{ do: 'tele', at: 0.1, dur: 1.55, shape: 'circle', r: 555, follow: true, chargeFx: 'ekzykesheart' },
        ...miasma(1.65, 5, 370), ...sweep(3.65, 6, 780, 0.22)],
      actions2: [{ do: 'tele', at: 0.1, dur: 1.4, shape: 'circle', r: 530, follow: true, chargeFx: 'ekzykesheart' },
        ...miasma(1.5, 4, 400), ...dive(4.8, 1.65, 285, 175),
        ...strike(5.3, 0.45, { shape: 'ring', r0: 240, r: 440 }, { dmg: 72, posture: 24, kb: 230, multi: true, ...ROTTEN, fx: 'ekzykesmiasma' }),
        ...strike(5.85, 0.5, { shape: 'ring', r0: 410, r: 660 }, { dmg: 80, posture: 26, kb: 270, multi: true, ...ROTTEN, fx: 'ekzykesmiasma' })],
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
