'use strict';
// Boss 資料：菲歐拉（《英雄聯盟》德瑪西亞的無雙劍姬）：被動「決鬥之舞」從對手的破綻方位命中會追加真實傷害並回復；
// 移形之體（Q 兩段突刺）、招架（W 架式反擊）、劍術（E 兩連刺，首擊緩速）、大招「終極挑戰」四個破綻全開
// 破綻機制在 js/engine/actions/duelist.js；考據見 docs/bosses/fiora.md
(function (G) {
  const BD = G.BD, { strike, dashStrike } = BD.DataKit;
  const thrust = (len, w) => ({ shape: 'rect', len, w });

  const fiora = {
    id: 'fiora', name: '菲歐拉', title: '無雙劍姬', archetype: '決鬥劍士',
    desc: '德瑪西亞勞倫特家的無雙劍姬。以刺劍追逐對手防禦的破綻：從破綻方位刺中會追加真實傷害並回復體力；招架成功擋下進攻後的反刺命中會使對手暈眩；終極挑戰讓四個破綻同時暴露。',
    color: '#d4a94a', color2: '#f4f1ee', glow: '#e0527a', style: 'fiora',
    radius: 22, maxHp: 1350, speed: 265, turn: 10, mass: 0.8, fxEl: 'holy', hurt: 'flesh',
    traits: ['duelist', 'counter'],
    stamina: { max: 100, regen: 34 }, posture: 105, dodgeCost: 18, dodgeSpeed: 600,
    ai: { prefRange: [90, 230], aggression: 0.7, dodge: 0.55, precision: 0.85, reaction: 0.2, strafe: 0.9, walk: 0.5,
      feint: 0.3, delay: 0.3, retreat: 0.15, punish: 0.8, nervous: 0.05, patience: 0.5, read: 0.7,
      // 連段（僅沉重）：移形接劍術、劍術接連刺、交叉步接劍術
      combos: [
        { id: 'qe', name: '移形・劍術', weight: 1.3, steps: [
          { skill: 'lunge' },
          { skill: 'bladework', cancel: 0.35, branch: [
            { when: { dist: [0, 170] }, do: 'extend' },
            { when: { rolled: true }, do: 'switch', skill: 'fleche' },
            { do: 'stop' }] }] },
        { id: 'ea', name: '劍術・連刺', steps: [
          { skill: 'bladework' },
          { skill: 'flurry', cancel: 0.3, branch: [
            { when: { landed: true, dist: [0, 130] }, do: 'extend' },
            { when: { rolled: true, dist: [100, 400] }, chance: 0.6, do: 'switch', skill: 'lunge' },
            { do: 'stop' }] }] },
        { id: 'xe', name: '交叉・劍術', phase: 2, weight: 1.2, steps: [
          { skill: 'crossstep' },
          { skill: 'bladework', cancel: 0.3, branch: [
            { when: { dist: [0, 170] }, do: 'extend' },
            { do: 'stop' }] }] },
      ] },
    phase2: { speedMul: 1.12, dmgMul: 1.15, cdMul: 0.8, fxEl: 'holy',
      line: '決鬥，才剛開始。',
      note: '劍姬認真起來：移形之體追加第三段突刺、劍術多一記收尾刺、招架反擊更強；決鬥之舞追加傷害 3% → 4%；解鎖「交叉步」；終極挑戰刺得更快' },
    skills: [
      // 原作 Q：衝向目標突刺，再施放可再來一次（第二段會閃到破綻方位）
      { id: 'lunge', name: '移形之體', short: '移形', tags: ['gap', 'fast'], range: [100, 420], cd: 4.5, cost: 16, track: 8, recovery: 0.4,
        actions: [...dashStrike(0.4, 0.34, 300, 60, 0.14, { dmg: 48, posture: 14, kb: 120, fx: 'thrust' }),
          { do: 'vitalstep', at: 0.82, dist: 110 },
          ...strike(1.02, 0.2, thrust(170, 55), { dmg: 62, posture: 18, kb: 160, fx: 'thrust', vital: true })],
        actions2: [...dashStrike(0.36, 0.3, 300, 60, 0.14, { dmg: 50, posture: 14, kb: 120, fx: 'thrust' }),
          { do: 'vitalstep', at: 0.74, dist: 110 },
          ...strike(0.92, 0.18, thrust(170, 55), { dmg: 58, posture: 16, kb: 140, fx: 'thrust', vital: true }),
          { do: 'vitalstep', at: 1.2, dist: 110, off: 2.2 },
          ...strike(1.38, 0.18, thrust(170, 55), { dmg: 66, posture: 18, kb: 180, fx: 'thrust', vital: true })] },
      // 原作 W：招架擋下下一次攻擊並立刻反刺（成功時由 counter 特性反擊，沒被攻擊則收劍刺出）
      { id: 'parry_w', name: '招架', short: '招架', tags: ['counter', 'defensive'], range: [0, 220], cd: 6.5, cost: 12, track: 8, recovery: 0.45,
        actions: [{ do: 'counter', at: 0, dur: 0.65, dmg: 140, posture: 70, name: '招架・反刺', fx: { id: 'parry', el: 'holy' }, slowmo: 0.3, status: { id: 'stun', dur: 1.3 } },
          ...strike(0.9, 0.22, thrust(190, 55), { dmg: 70, posture: 24, kb: 220, fx: 'thrust', vital: true })],
        actions2: [{ do: 'counter', at: 0, dur: 0.7, dmg: 165, posture: 80, name: '招架・反刺', fx: { id: 'parry', el: 'holy' }, slowmo: 0.3, status: { id: 'stun', dur: 1.6 } },
          ...strike(0.9, 0.2, thrust(200, 55), { dmg: 78, posture: 26, kb: 240, fx: 'thrust', vital: true })] },
      // 原作 E：連續兩擊，第一擊緩速、第二擊強力（原作必定暴擊）
      { id: 'bladework', name: '劍術', short: '劍術', tags: ['melee', 'fast'], range: [0, 160], cd: 3.2, cost: 14, track: 9, creep: 0.3, recovery: 0.4,
        actions: [...strike(0.24, 0.2, thrust(150, 50), { dmg: 40, posture: 12, kb: 90, fx: 'thrust', status: { id: 'slow', dur: 1.2 } }),
          ...strike(0.5, 0.2, thrust(160, 55), { dmg: 66, posture: 20, kb: 180, fx: 'thrust', vital: true })],
        actions2: [...strike(0.22, 0.18, thrust(150, 50), { dmg: 42, posture: 12, kb: 90, fx: 'thrust', status: { id: 'slow', dur: 1.2 } }),
          ...strike(0.45, 0.18, thrust(160, 55), { dmg: 52, posture: 16, kb: 120, fx: 'thrust' }),
          ...strike(0.7, 0.2, thrust(170, 60), { dmg: 74, posture: 22, kb: 200, fx: 'thrust', vital: true })] },
      // 普攻：快速三連刺
      { id: 'flurry', name: '連刺', short: '連刺', tags: ['melee', 'fast'], range: [0, 130], cd: 2.2, cost: 12, track: 9, creep: 0.3, recovery: 0.4,
        actions: [...strike(0.2, 0.16, thrust(140, 44), { dmg: 34, posture: 10, kb: 70, fx: 'thrust' }),
          ...strike(0.38, 0.16, thrust(140, 44), { dmg: 34, posture: 10, kb: 70, fx: 'thrust' }),
          ...strike(0.58, 0.18, thrust(150, 50), { dmg: 44, posture: 14, kb: 140, fx: 'thrust', vital: true })] },
      // 改編：擊劍的「飛躍突刺」(flèche)——長距離疾衝刺穿後立刻拉開
      { id: 'fleche', name: '飛躍突刺', short: '飛躍', tags: ['gap', 'ranged'], range: [220, 560], cd: 7, cost: 20, track: 8, recovery: 0.5,
        actions: [...dashStrike(0.5, 0.45, 480, 60, 0.16, { dmg: 74, posture: 22, kb: 220, fx: 'thrust' }),
          { do: 'dash', at: 0.9, dir: 'back', dist: 200, dur: 0.2 }],
        actions2: [...dashStrike(0.45, 0.4, 520, 60, 0.15, { dmg: 80, posture: 24, kb: 240, fx: 'thrust' }),
          { do: 'dash', at: 0.85, dir: 'back', dist: 220, dur: 0.2 }] },
      // 改編：交叉步——側身閃過後從破綻方位刺出（二階段）
      { id: 'crossstep', name: '交叉步', short: '交叉', phase: 2, tags: ['gap', 'defensive'], range: [80, 300], cd: 8, cost: 18, track: 6, recovery: 0.45,
        actions: [{ do: 'dash', at: 0.05, dir: 'side', dist: 170, dur: 0.18, iframe: true },
          { do: 'vitalstep', at: 0.35, dist: 100 },
          ...strike(0.55, 0.2, thrust(180, 55), { dmg: 70, posture: 20, kb: 200, fx: 'thrust', vital: true })] },
    ],
    // 原作 R：鎖定敵方英雄並暴露四個破綻，每擊破一個就造成最大生命比例真實傷害；改編為從四個方位連續刺中
    ultimate: { id: 'ult', name: '終極挑戰', ult: true, range: [0, 600], track: 0, recovery: 0.6,
      actions: [{ do: 'vitalmark', at: 0, dur: 2.6 }, ...[0, 1, 2, 3].flatMap((i) => [{ do: 'vitalstep', at: 0.15 + 0.5 * i, dist: 100, off: i * Math.PI / 2 },
        ...strike(0.15 + 0.5 * i + 0.22, 0.18, thrust(180, 55), { dmg: 52, posture: 16, kb: 140, fx: 'thrust', vital: 'all' })])],
      actions2: [{ do: 'vitalmark', at: 0, dur: 2.2 }, ...[0, 1, 2, 3].flatMap((i) => [{ do: 'vitalstep', at: 0.12 + 0.42 * i, dist: 100, off: i * Math.PI / 2 },
        ...strike(0.12 + 0.42 * i + 0.2, 0.16, thrust(190, 55), { dmg: 58, posture: 18, kb: 160, fx: 'thrust', vital: 'all' })])],
      desc: '鎖定對手，四個破綻同時暴露：連續閃到四個方位刺出，每一擊都吃到決鬥之舞（追加最大生命比例真實傷害並回復自身）；四個破綻全部擊破時，在對手腳下產生巨大的回復領域，菲歐拉站在其中持續回血。' },
  };

  BD.registerBoss(fiora);
})(typeof window !== 'undefined' ? window : globalThis);
