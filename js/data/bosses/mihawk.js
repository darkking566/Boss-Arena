'use strict';
// Boss 資料：鷹眼・德拉庫爾・米霍克（《ONE PIECE》世界第一大劍豪）：一階段只用胸前十字小刀（輕視對手），
// HP 50% 佩服對手的決心而拔出黑刀「夜」，解鎖飛斬 / 一斬沉艦 / 荒星；大招「世界第一大劍豪」橫貫全場的巨斬
// 重製：「鷹眼鎖定」→「獵殺」循環——鷹眼 / 撥擋反刺會把對手標記為鎖定（受傷 +18%），AI 鎖定後才欺身近戰；見切成功得「從容」
// 純資料，重用既有動作；考據見 docs/bosses/mihawk.md
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;
  const rect = (len, w) => ({ shape: 'rect', len, w });
  const LOCK = (dur) => ({ id: 'hawklock', dur });
  // 預警 + 一道飛斬（細長直線）
  const shot = (at, tele, len, w, proj) => [
    { do: 'tele', at: at - tele, dur: tele, ...rect(len, w), follow: true },
    { do: 'proj', at, n: 1, kind: 'airslash', ...proj }];

  const mihawk = {
    id: 'mihawk', name: '鷹眼米霍克', title: '世界第一大劍豪', archetype: '輕視對手的劍聖',
    desc: '王下七武海、世界第一大劍豪。一階段只用胸前的十字小刀，從容撥開所有攻擊；對手撐到半血，他才佩服地拔出黑刀「夜」，揮出能斬開艦隊的飛斬。',
    color: '#c9a24a', color2: '#16121a', glow: '#e8c860', style: 'mihawk',
    radius: 31, maxHp: 1950, speed: 245, turn: 8, mass: 0.9, fxEl: 'physical', hurt: 'flesh',
    traits: ['counter', 'clash'], clash: { style: 'blade', proj: true },
    stamina: { max: 100, regen: 34 }, posture: 115, dodgeCost: 18, dodgeSpeed: 600,
    ai: { prefRange: [150, 290], aggression: 0.45, dodge: 0.7, precision: 0.92, reaction: 0.17, strafe: 0.6, walk: 0.8,
      feint: 0.2, delay: 0.3, retreat: 0.1, punish: 0.9, nervous: 0.02, patience: 0.85, read: 0.8, counter: 0.65, clash: 0.7, // 對撞傾向（js/engine/ai.js）
      hawk: true, // 鎖定感知（js/engine/ai.js）：沒鎖定先用鷹眼 / 指尖斬 / 撥擋，鎖定後欺身獵殺
      // 連段（僅沉重）：小刀連刺接貫胸、鷹眼鎖定後獵殺、後撤拉開再鎖定、居合接沉艦、三連月牙接居合
      combos: [
        { id: 'kt', name: '連刺・貫胸', phase: 1, weight: 1.3, steps: [
          { skill: 'knife' },
          { skill: 'pierce', cancel: 0.3, branch: [
            { when: { dist: [0, 260] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'gk', name: '鷹眼・獵殺', weight: 1.2, steps: [
          { skill: 'glare' },
          { skill: 'pierce', cancel: 0.3, branch: [
            { when: { landed: true, dist: [0, 420] }, do: 'extend' },
            { when: { rolled: true, dist: [0, 600] }, chance: 0.7, do: 'switch', skill: 'flick' },
            { do: 'stop' }] },
          { skill: 'knife', cancel: 0.3, branch: [
            { when: { dist: [0, 150] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'bg', name: '後撤・鎖定', phase: 1, weight: 1, steps: [
          { skill: 'backstep' },
          { skill: 'glare', cancel: 0.3, branch: [
            { when: { dist: [200, 700] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'ia', name: '居合・沉艦', phase: 2, weight: 1.2, steps: [
          { skill: 'iai' },
          { skill: 'fleet', cancel: 0.35, branch: [
            { when: { dist: [0, 300] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'wf', name: '飛斬・沉艦', phase: 2, weight: 1, steps: [
          { skill: 'wave' },
          { skill: 'fleet', cancel: 0.35, branch: [
            { when: { dist: [0, 300] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'fi', name: '三連月牙・居合', phase: 2, weight: 1, steps: [
          { skill: 'fan' },
          { skill: 'iai', cancel: 0.35, branch: [
            { when: { dist: [100, 520] }, do: 'extend' },
            { do: 'stop' }] }] },
      ] },
    phase2: { speedMul: 1.1, dmgMul: 1.3, cdMul: 0.8, line: '你的眼神很有趣……讓我看看，你到底有多少決心。',
      fxEl: 'physical',
      note: '佩服對手，拔出黑刀「夜」：所有近戰招式改用大刀，射程更長，鷹眼鎖定更久；解鎖「居合・夜」「飛斬」「三連月牙」「一斬沉艦」「荒星」；大招更寬更快' },
    skills: [
      // 輕鬆接下三刀流後反刺：小刀連刺（二階段換成夜的橫斬）
      { id: 'knife', name: '小刀連刺', short: '小刀', tags: ['melee', 'fast'], range: [0, 130], cd: 2.4, cost: 12, track: 9, creep: 0.3, recovery: 0.4,
        actions: [...strike(0.22, 0.18, rect(110, 36), { dmg: 36, posture: 12, kb: 80, fx: 'thrust' }),
          ...strike(0.42, 0.18, rect(110, 36), { dmg: 36, posture: 12, kb: 80, fx: 'thrust' }),
          ...strike(0.62, 0.2, rect(120, 40), { dmg: 48, posture: 16, kb: 160, fx: 'thrust' })],
        actions2: [...strike(0.3, 0.24, { shape: 'cone', r: 180, arc: 110 * D }, { dmg: 60, posture: 22, kb: 180, fx: 'slash' }),
          ...strike(0.6, 0.24, { shape: 'cone', r: 190, arc: 120 * D }, { dmg: 78, posture: 28, kb: 260, fx: 'slash' })] },
      // 用刀尖撥開子彈、擋下全部攻擊後反擊（見切特性）
      { id: 'parry', name: '撥擋', short: '撥擋', tags: ['counter', 'defensive'], range: [0, 320], cd: 6, cost: 10, track: 8, recovery: 0.45,
        actions: [{ do: 'counter', at: 0, dur: 0.9, dmg: 135, posture: 60, name: '撥擋・反刺', fx: 'parry', slowmo: 0.3, status: LOCK(4), self: 'poise' }],
        actions2: [{ do: 'counter', at: 0, dur: 0.9, dmg: 165, posture: 75, name: '撥擋・反斬', fx: 'parry', slowmo: 0.3, status: LOCK(5), self: 'poise' }] },
      // 小刀貫穿索隆胸口的一刺
      { id: 'pierce', name: '貫胸一刺', short: '貫胸', tags: ['gap'], clash: 'light', range: [90, 330], cd: 5.5, cost: 18, track: 8, recovery: 0.55,
        actions: dashStrike(0.4, 0.38, 280, 44, 0.12, { dmg: 82, posture: 40, kb: 200, fx: 'thrust' }),
        actions2: dashStrike(0.36, 0.34, 340, 52, 0.12, { dmg: 100, posture: 48, kb: 260, fx: 'thrust' }) },
      // 見聞色與銳利視力：遠距離鎖定、釘在原地的精準一斬
      { id: 'glare', name: '鷹眼鎖定', short: '鷹眼', tags: ['ranged', 'lock'], range: [200, 760], cd: 6, cost: 16, track: 8, recovery: 0.5,
        actions: strike(0.85, 0.85, rect(760, 34), { dmg: 70, posture: 24, kb: 160, fx: 'thrust', status: LOCK(5) }),
        actions2: strike(0.75, 0.75, rect(860, 46), { dmg: 90, posture: 30, kb: 220, fx: 'cross', status: LOCK(6) }) },
      // 隔空以刀尖彈出的細長斬擊：快、準、傷害低，用來在鎖定前騷擾（二階段夜揮出三道、斬幅更寬）
      { id: 'flick', name: '指尖斬', short: '指尖', tags: ['ranged', 'fast'], range: [160, 640], cd: 3.8, cost: 10, track: 9, recovery: 0.35,
        actions: [...shot(0.4, 0.4, 640, 56, { speed: 1300, r: 30, dmg: 34, posture: 10, kb: 100, life: 0.6 }),
          ...shot(0.8, 0.3, 640, 56, { speed: 1300, r: 30, dmg: 44, posture: 14, kb: 120, life: 0.6 })],
        actions2: [...shot(0.35, 0.35, 700, 80, { speed: 1400, r: 45, dmg: 46, posture: 14, kb: 140, life: 0.6, pierce: true }),
          ...shot(0.7, 0.25, 700, 80, { speed: 1400, r: 45, dmg: 52, posture: 16, kb: 160, life: 0.6, pierce: true }),
          ...shot(1.05, 0.25, 700, 80, { speed: 1400, r: 50, dmg: 64, posture: 20, kb: 200, life: 0.6, pierce: true })] },
      // 對手逼近就從容地退開，順手送上一道斬擊——輕視對手的距離感
      { id: 'backstep', name: '從容後撤', short: '後撤', tags: ['escape', 'ranged'], range: [0, 190], cd: 6.5, cost: 14, track: 6, recovery: 0.4,
        actions: [{ do: 'dash', at: 0.05, dir: 'back', dist: 240, dur: 0.24 },
          ...shot(0.6, 0.35, 620, 56, { speed: 1200, r: 32, dmg: 44, posture: 14, kb: 160, life: 0.65 })],
        actions2: [{ do: 'dash', at: 0.05, dir: 'back', dist: 300, dur: 0.24 },
          ...shot(0.6, 0.35, 700, 90, { speed: 1250, r: 55, dmg: 60, posture: 20, kb: 220, life: 0.7, pierce: true })] },
      // 二階段：夜揮出巨大的飛斬，緊接著再補一道較小的追斬（月牙形，貫穿）
      { id: 'wave', name: '飛斬', short: '飛斬', phase: 2, tags: ['ranged'], range: [200, 950], cd: 6, cost: 22, track: 7, recovery: 0.6,
        actions: [{ do: 'tele', at: 0, dur: 0.6, ...rect(950, 190), follow: true },
          { do: 'proj', at: 0.6, n: 1, speed: 950, r: 95, dmg: 100, posture: 38, kb: 300, life: 1.1, pierce: true, kind: 'airslash' },
          { do: 'tele', at: 0.5, dur: 0.4, ...rect(950, 130), follow: true },
          { do: 'proj', at: 0.9, n: 1, speed: 1150, r: 65, dmg: 70, posture: 24, kb: 200, life: 0.95, pierce: true, kind: 'airslash' }] },
      // 二階段：單人毀掉整支艦隊——大範圍橫掃，斬勁收不住地繼續飛向遠方
      { id: 'fleet', name: '一斬沉艦', short: '沉艦', phase: 2, tags: ['melee', 'zone'], range: [0, 300], cd: 8, cost: 28, track: 6, recovery: 0.75,
        actions: [...strike(0.7, 0.7, { shape: 'cone', r: 300, arc: 200 * D }, { dmg: 130, posture: 60, kb: 450, fx: 'cleave' }),
          { do: 'tele', at: 0.4, dur: 0.4, ...rect(850, 150), follow: true },
          { do: 'proj', at: 0.8, n: 1, speed: 900, r: 80, dmg: 80, posture: 30, kb: 260, life: 1.0, pierce: true, kind: 'airslash' }] },
      // 二階段：拔刀術——夜出鞘的瞬間貫穿全線，回身再補一記反手大弧斬
      { id: 'iai', name: '居合・夜', short: '居合', phase: 2, tags: ['gap', 'melee'], range: [120, 520], cd: 7.5, cost: 24, track: 7, recovery: 0.7,
        actions: [...dashStrike(0.55, 0.5, 520, 90, 0.1, { dmg: 125, posture: 60, kb: 320, fx: 'cross', status: LOCK(4) }, { fx: 'slashline' }),
          ...strike(1.0, 0.3, { shape: 'cone', r: 210, arc: 150 * D }, { dmg: 80, posture: 34, kb: 260, fx: 'slash' })] },
      // 二階段：夜連揮三道月牙，扇形封住閃避方向，最後補一記貫穿中央的大斬
      { id: 'fan', name: '黑刀・三連月牙', short: '月牙', phase: 2, tags: ['ranged', 'zone'], range: [200, 900], cd: 8, cost: 26, track: 6, recovery: 0.65,
        actions: [{ do: 'tele', at: 0, dur: 0.75, shape: 'cone', r: 820, arc: 56 * D, follow: true },
          { do: 'proj', at: 0.75, n: 3, spread: 0.36, speed: 1000, r: 70, dmg: 66, posture: 24, kb: 220, life: 1.0, pierce: true, kind: 'airslash' },
          { do: 'tele', at: 0.95, dur: 0.4, ...rect(900, 120), follow: true },
          { do: 'proj', at: 1.35, n: 1, speed: 1100, r: 90, dmg: 90, posture: 34, kb: 300, life: 0.95, pierce: true, kind: 'airslash' }] },
      // 二階段（衍生名稱）：躍上高空落下，落地炸出五道星芒斬、再補第二輪錯位的星芒，最後一記貫穿突斬
      { id: 'star', name: '黑刀・荒星', short: '荒星', phase: 2, tags: ['gap', 'zone'], range: [150, 620], cd: 10, cost: 30, track: 6, recovery: 0.7,
        actions: [{ do: 'hide', at: 0.2, fx: 'leap' },
          { do: 'tele', at: 0.2, dur: 0.9, shape: 'circle', r: 130, anchor: 'target', setMark: 'S', follow: true, lockBefore: 0.3 },
          { do: 'land', at: 1.1, mark: 'S' },
          { do: 'hit', at: 1.1, shape: 'circle', r: 130, anchor: 'mark', mark: 'S', dmg: 120, posture: 55, kb: 380, fx: { id: 'bigslam', scale: 1.2 } },
          { do: 'proj', at: 1.15, n: 5, radial: true, speed: 850, r: 50, dmg: 45, posture: 18, kb: 160, life: 0.8, pierce: true, kind: 'airslash' },
          { do: 'proj', at: 1.55, n: 5, radial: true, angOff: Math.PI / 5, speed: 850, r: 50, dmg: 45, posture: 18, kb: 160, life: 0.8, pierce: true, kind: 'airslash' },
          ...dashStrike(2.0, 0.45, 520, 80, 0.14, { dmg: 110, posture: 50, kb: 300, fx: 'thrust' }, { fx: 'slashline' })] },
    ],
    // 頂上戰爭向白鬍子陣營放出的遠距離巨斬（連冰山都斬開）＋對索隆那記斜劈過胸的最後一斬；
    // 改編為：橫貫全場的粗斬線 → 扇形月牙斬（「小月」衍生名稱）→ 貫穿目標的突進斬
    ultimate: { id: 'ult', name: '世界第一大劍豪', ult: true, range: [0, 1000], track: 0, recovery: 0.9,
      actions: [...strike(1.0, 1.0, rect(1100, 110), { dmg: 150, posture: 65, kb: 400, fx: 'cross', status: LOCK(6) }),
        { do: 'tele', at: 0.9, dur: 0.5, shape: 'cone', r: 780, arc: 100 * D, follow: true },
        { do: 'proj', at: 1.4, n: 5, spread: 0.3, speed: 800, r: 60, dmg: 55, posture: 20, kb: 220, life: 1.0, pierce: true, kind: 'airslash' },
        ...dashStrike(2.1, 0.5, 560, 90, 0.14, { dmg: 120, posture: 55, kb: 300, fx: 'cross' }, { fx: 'slashline' })],
      actions2: [...strike(0.9, 0.9, rect(1500, 170), { dmg: 220, posture: 90, kb: 500, fx: 'cross', status: LOCK(7) }),
        { do: 'tele', at: 0.8, dur: 0.45, shape: 'cone', r: 820, arc: 120 * D, follow: true },
        { do: 'proj', at: 1.25, n: 7, spread: 0.24, speed: 900, r: 70, dmg: 62, posture: 22, kb: 240, life: 1.0, pierce: true, kind: 'airslash' },
        ...dashStrike(1.9, 0.45, 700, 100, 0.14, { dmg: 150, posture: 65, kb: 360, fx: 'cross' }, { fx: 'slashline' })],
      desc: '夜揮出橫貫全場的巨斬，緊接著扇形的月牙斬撕開整片戰場，最後一記貫穿身後的突進斬' },
  };

  BD.registerBoss(mihawk);
})(typeof window !== 'undefined' ? window : globalThis);
