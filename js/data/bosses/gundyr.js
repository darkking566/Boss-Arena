'use strict';
// Boss 資料：灰燼審判者古達（Iudex Gundyr，黑暗靈魂3 灰燼墓地的守墓者）
// 考據：胸口貫穿螺旋劍（Coiled Sword）、手持「古達的長戟」、不死人墓地的審判者；
//   一階段：重掃（前搖長）/ 快掃 / 跳斬 / 跳刺（插戟後收招極慢）/ 連劈 / 左手擒拿→刺→擲；
//   半血：人之膿自後頸破體而出，變身期間以巨手拍擊；二階段：躍砸（戟插地、收招長）/ 拍擊後橫掃吞噬 / 嘶吼噬咬，範圍更長。
//   大招取自長戟戰技「英雄突擊」（腰側持戟、衝鋒後轉為橫掃強攻）。
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;
  const MASS = { el: 'shadow' }; // 人之膿的招式一律用暗影元素

  const gundyr = {
    id: 'gundyr', name: '古達', title: '灰燼審判者', archetype: '長戟審判',
    desc: '胸口貫著螺旋劍、守在灰燼墓地的審判者，以長戟的沉重橫掃與跳砸考驗每一位灰燼；半血時背脊裂開，人之膿化為巨手撲出。',
    color: '#8a8378', color2: '#1b1612', glow: '#e08a3a', style: 'gundyr',
    radius: 38, maxHp: 3000, speed: 195, turn: 4.5, mass: 1.7, fxEl: 'physical', hurt: 'flesh',
    traits: ['counter'], // 審判立戟的見切架式
    stamina: { max: 120, regen: 26 }, posture: 190, dodgeCost: 22, dodgeSpeed: 470,
    ai: {
      prefRange: [90, 230],
      aggression: 0.8,
      dodge: 0.5,
      precision: 0.65,
      reaction: 0.3,
      strafe: 0.5,
      walk: 0.75,
      feint: 0.05,
      delay: 0.4,
      retreat: 0.05,
      punish: 0.6,
      nervous: 0.05,
      patience: 0.4,
      combos: [
        { id: 'judge', name: '審判連掃', weight: 1.3, steps: [
          { skill: 'fast_sweep' },
          { skill: 'heavy_sweep', cancel: 0.35, branch: [
            { when: { landed: true }, do: 'extend' },
            { chance: 0.45, do: 'delay', hold: [0.3, 0.55] },   // 原作重掃前搖長：延遲出手騙翻滾
            { do: 'stop' }] }] },
        { id: 'leap', name: '跳斬連劈', weight: 1.1, steps: [
          { skill: 'leap_slice' },
          { skill: 'rapid_chop', cancel: 0.4, branch: [
            { when: { dist: [0, 200] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'grab', name: '連劈擒拿', phase: 1, weight: 1.0, steps: [
          { skill: 'rapid_chop' },
          { skill: 'grab_stab', cancel: 0.35, branch: [
            { when: { rolled: true }, do: 'stop' },
            { when: { dist: [0, 150] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'devour', name: '人之膿吞噬', phase: 2, weight: 1.4, steps: [
          { skill: 'mass_smack' },
          { skill: 'leap_slam', cancel: 0.35, branch: [
            { when: { dist: [0, 240] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'bite', name: '嘶吼噬咬', phase: 2, weight: 1.1, steps: [
          { skill: 'screech_bite' },
          { skill: 'heavy_sweep', cancel: 0.35, branch: [
            { when: { landed: true }, do: 'extend' },
            { do: 'stop' }] }] },
      ],
    },
    phase2: {
      speedMul: 1.15, dmgMul: 1.2, cdMul: 0.8,
      line: '……（人之膿自後頸破體而出）', aura: 'shadow', fxEl: 'shadow', transFx: { id: 'sacburst', el: 'shadow' },
      note: '解鎖「拍擊・吞噬」「嘶吼噬咬」「躍砸」；跳斬衝得更遠並追加人之膿拍擊，重掃與跳刺範圍加長，大招追加人之膿吞噬',
    },
    skills: [
      // 重掃：前搖長、傷害高（原作「delay before it lands」）
      { id: 'heavy_sweep', name: '重掃', short: '重掃', tags: ['melee', 'aoe'], range: [0, 235], cd: 3.6, cost: 26, track: 5, creep: 0.3, recovery: 0.6,
        actions: strike(0.62, 0.46, { shape: 'cone', r: 225, arc: 150 * D }, { dmg: 155, posture: 40, kb: 460, fx: 'cleave' }),
        actions2: strike(0.62, 0.5, { shape: 'cone', r: 265, arc: 160 * D }, { dmg: 169, posture: 45, kb: 500, fx: 'cleave' }) },
      // 快掃：起身時把人推開
      { id: 'fast_sweep', name: '快掃', short: '快掃', tags: ['melee', 'fast'], range: [0, 205], cd: 2.8, cost: 18, track: 7, creep: 0.2, recovery: 0.45,
        actions: strike(0.4, 0.3, { shape: 'cone', r: 205, arc: 125 * D }, { dmg: 95, posture: 25, kb: 380, fx: 'slash' }),
        actions2: strike(0.36, 0.27, { shape: 'cone', r: 240, arc: 135 * D }, { dmg: 105, posture: 28, kb: 420, fx: 'slash' }) },
      // 跳斬：拉開距離時跳起斬地，常再接一斬；二階段落地後人之膿再補一記拍擊
      { id: 'leap_slice', name: '跳斬', short: '跳斬', tags: ['gap'], range: [130, 430], cd: 4.6, cost: 24, track: 6, recovery: 0.55,
        actions: [...dashStrike(0.45, 0.4, 330, 80, 0.2, { dmg: 122, posture: 35, kb: 320 }, { fx: 'leap' }),
          ...strike(0.98, 0.28, { shape: 'cone', r: 170, arc: 110 * D }, { dmg: 101, posture: 25, kb: 300, fx: 'slash' })],
        actions2: [...dashStrike(0.4, 0.38, 420, 90, 0.2, { dmg: 135, posture: 38, kb: 340 }, { fx: 'leap' }),
          ...strike(0.9, 0.26, { shape: 'cone', r: 190, arc: 115 * D }, { dmg: 108, posture: 28, kb: 320, fx: 'slash' }),
          ...strike(1.2, 0.26, { shape: 'circle', r: 140, off: 70 }, { dmg: 95, posture: 25, kb: 300, fx: { id: 'slam', scale: 0.8, ...MASS } })] },
      // 跳刺：插戟落地，收招極慢——最大的反擊空檔
      { id: 'leap_jab', name: '跳刺', short: '跳刺', tags: ['gap', 'melee'], range: [140, 450], cd: 5.2, cost: 26, track: 6, recovery: 0.85,
        actions: dashStrike(0.5, 0.45, 360, 62, 0.2, { dmg: 169, posture: 60, kb: 420 }, { fx: 'leap' }),
        actions2: dashStrike(0.44, 0.4, 440, 70, 0.18, { dmg: 189, posture: 65, kb: 460 }, { fx: 'leap' }) },
      // 連劈：身前快速劈地三下
      { id: 'rapid_chop', name: '連劈', short: '連劈', tags: ['melee', 'fast'], range: [0, 190], cd: 4.0, cost: 24, track: 6, creep: 0.25, recovery: 0.5,
        actions: [...strike(0.4, 0.28, { shape: 'circle', r: 105, off: 105 }, { dmg: 74, posture: 18, kb: 220, fx: { id: 'slam', scale: 0.7 } }),
          ...strike(0.72, 0.22, { shape: 'circle', r: 105, off: 105 }, { dmg: 74, posture: 18, kb: 220, fx: { id: 'slam', scale: 0.7 } }),
          ...strike(1.04, 0.22, { shape: 'circle', r: 115, off: 105 }, { dmg: 88, posture: 22, kb: 300, fx: { id: 'slam', scale: 0.8 } })],
        actions2: [...strike(0.36, 0.26, { shape: 'circle', r: 115, off: 110 }, { dmg: 78, posture: 18, kb: 220, fx: { id: 'slam', scale: 0.75 } }),
          ...strike(0.66, 0.2, { shape: 'circle', r: 115, off: 110 }, { dmg: 78, posture: 18, kb: 220, fx: { id: 'slam', scale: 0.75 } }),
          ...strike(0.96, 0.2, { shape: 'circle', r: 125, off: 110 }, { dmg: 95, posture: 22, kb: 320, fx: { id: 'slam', scale: 0.85 } })] },
      // 擒拿：左手抓住 → 刺 → 擲出（原作唯一的徒手招，最痛）
      { id: 'grab_stab', name: '擒拿刺擲', short: '擒拿', tags: ['melee'], range: [0, 135], cd: 7.5, cost: 22, track: 8, creep: 0.2, recovery: 0.7,
        actions: [...strike(0.5, 0.4, { shape: 'rect', len: 135, w: 95 }, { dmg: 54, posture: 25, kb: 60, fx: 'projhit' }),
          ...strike(0.95, 0.25, { shape: 'rect', len: 150, w: 55 }, { dmg: 149, posture: 45, kb: 200, fx: 'thrust' }),
          ...strike(1.35, 0.2, { shape: 'circle', r: 110, off: 60 }, { dmg: 81, posture: 20, kb: 640, fx: { id: 'ring', scale: 0.8 } })],
        actions2: [...strike(0.45, 0.36, { shape: 'rect', len: 150, w: 100 }, { dmg: 61, posture: 25, kb: 60, fx: 'projhit' }),
          ...strike(0.88, 0.22, { shape: 'rect', len: 165, w: 60 }, { dmg: 169, posture: 50, kb: 200, fx: 'thrust' }),
          ...strike(1.26, 0.2, { shape: 'circle', r: 120, off: 60 }, { dmg: 95, posture: 22, kb: 700, fx: { id: 'ring', scale: 0.9 } })] },
      // —— 二階段專屬（人之膿）——
      // 躍砸：高高跳起、戟插地，收招長
      { id: 'leap_slam', name: '躍砸', short: '躍砸', phase: 2, tags: ['melee', 'aoe'], range: [0, 230], cd: 6.0, cost: 28, track: 5, recovery: 1.1,
        actions: [...strike(0.85, 0.6, { shape: 'circle', r: 195 }, { dmg: 203, posture: 60, kb: 520, fx: { id: 'bigslam', scale: 0.95 } })] },
      // 拍擊・吞噬：巨手先砸右側，再橫掃吞噬
      { id: 'mass_smack', name: '拍擊吞噬', short: '吞噬', phase: 2, tags: ['melee', 'aoe'], range: [0, 270], cd: 5.4, cost: 26, track: 6, recovery: 0.7,
        actions: [...strike(0.5, 0.4, { shape: 'circle', r: 120, off: 120, angOff: 0.85 }, { dmg: 95, posture: 25, kb: 300, fx: { id: 'slam', scale: 0.9, ...MASS } }),
          ...strike(1.0, 0.4, { shape: 'cone', r: 270, arc: 185 * D }, { dmg: 162, posture: 45, kb: 520, fx: { id: 'cleave', ...MASS } })] },
      // 嘶吼噬咬：近身時人之膿嘶吼，低頭咬下
      { id: 'screech_bite', name: '嘶吼噬咬', short: '噬咬', phase: 2, tags: ['melee'], range: [0, 190], cd: 6.5, cost: 24, track: 7, recovery: 0.65,
        actions: [{ do: 'hit', at: 0.25, shape: 'circle', r: 85, dmg: 0, posture: 12, kb: 160, fx: { id: 'bloodroar', ...MASS } },
          ...strike(0.95, 0.6, { shape: 'circle', r: 150, off: 60 }, { dmg: 182, posture: 55, kb: 420, fx: { id: 'bigslam', scale: 0.8, ...MASS } })] },
      // —— 非揮戟的招式（遊戲化演繹，非原作招式）——
      // 灰燼焚地：螺旋劍灼亮，腳下燃起餘燼地帶，逼對手離開近身距離
      { id: 'ember_ground', name: '灰燼焚地', short: '焚地', tags: ['zone', 'defensive'], range: [0, 300], cd: 11, cost: 20, recovery: 0.55,
        actions: [{ do: 'zone', at: 0.5, kind: 'fire', pattern: 'self', n: 1, r: 235, dur: 5, dps: 26, delay: 0.7 }],
        actions2: [{ do: 'zone', at: 0.45, kind: 'fire', pattern: 'self', n: 1, r: 270, dur: 6, dps: 30, delay: 0.6 }] },
      // 審判立戟：審判者的見切架式，近戰攻擊被擋下後反斬
      { id: 'judge_stance', name: '審判立戟', short: '立戟', tags: ['counter', 'defensive'], range: [0, 210], cd: 8, cost: 14, track: 8, recovery: 0.5,
        actions: [{ do: 'counter', at: 0, dur: 0.65, dmg: 175, posture: 60, name: '審判・反斬', fx: 'parry', slowmo: 0.25 },
          ...strike(0.9, 0.22, { shape: 'cone', r: 200, arc: 130 * D }, { dmg: 95, posture: 30, kb: 340, fx: 'slash' })],
        actions2: [{ do: 'counter', at: 0, dur: 0.65, dmg: 195, posture: 70, name: '審判・反斬', fx: 'parry', slowmo: 0.25 },
          ...strike(0.88, 0.2, { shape: 'cone', r: 230, arc: 140 * D }, { dmg: 105, posture: 34, kb: 380, fx: 'slash' })] },
      // 人之膿觸手：地面接連竄出黑色觸手，第二波會重新瞄準
      { id: 'pus_tendrils', name: '膿之觸手', short: '觸手', phase: 2, tags: ['aoe', 'zone'], range: [120, 800], cd: 8, cost: 26, track: 6, recovery: 0.7,
        actions: [{ do: 'tele', at: 0.1, dur: 0.7, shape: 'rect', len: 820, w: 110, follow: true },
          { do: 'erupt', at: 0.8, n: 6, start: 110, step: 125, interval: 0.09, r: 70, dmg: 95, posture: 25, kb: 320, fx: 'erupt', fxEl: 'shadow' },
          { do: 'tele', at: 1.15, dur: 0.6, shape: 'rect', len: 820, w: 110, follow: true },
          { do: 'erupt', at: 1.75, n: 6, start: 110, step: 125, interval: 0.09, r: 70, dmg: 95, posture: 25, kb: 320, fx: 'erupt', fxEl: 'shadow' }] },
      // 人之膿吐息：三發黑膿彈扇形噴出（遠距離手段）
      { id: 'pus_spit', name: '膿彈噴吐', short: '膿彈', phase: 2, tags: ['ranged'], range: [200, 750], cd: 6.5, cost: 22, track: 7, recovery: 0.6,
        actions: [{ do: 'proj', at: 0.6, n: 3, spread: 0.3, speed: 540, r: 24, dmg: 68, posture: 18, kb: 240, life: 2.4, kind: 'watcher' }] },
    ],
    ultimate: {
      id: 'ult', name: '英雄突擊', name2: '英雄突擊・人之膿吞噬', ult: true, range: [0, 900], track: 4, recovery: 1.0,
      actions: [
        { do: 'tele', at: 0.15, dur: 1.0, shape: 'rect', len: 620, w: 100, follow: true, lockBefore: 0.3, chargeFx: 'ultcast' },
        { do: 'dash', at: 1.15, dist: 620, dur: 0.4, hit: { dmg: 149, posture: 45, kb: 420 } },
        ...strike(1.85, 0.45, { shape: 'circle', r: 250 }, { dmg: 270, posture: 75, kb: 650, fx: { id: 'bigslam', scale: 1.4 } }),
      ],
      actions2: [
        { do: 'tele', at: 0.1, dur: 0.9, shape: 'rect', len: 680, w: 110, follow: true, lockBefore: 0.3, chargeFx: 'ultcast' },
        { do: 'dash', at: 1.0, dist: 680, dur: 0.38, hit: { dmg: 162, posture: 50, kb: 460 } },
        ...strike(1.65, 0.4, { shape: 'circle', r: 260 }, { dmg: 284, posture: 80, kb: 680, fx: { id: 'bigslam', scale: 1.5, ...MASS } }),
        ...strike(2.35, 0.5, { shape: 'cone', r: 380, arc: 220 * D }, { dmg: 243, posture: 70, kb: 700, fx: { id: 'cleave', scale: 1.4, ...MASS } }),
      ],
      desc: '一階段「英雄突擊」：腰側持戟蓄勢，直線衝鋒後原地旋身轟下強力橫掃；二階段「英雄突擊・人之膿吞噬」：衝鋒與旋掃之後，人之膿巨手再橫掃吞噬前方整片扇形。',
    },
  };

  BD.registerBoss(gundyr);
})(typeof window !== 'undefined' ? window : globalThis);
