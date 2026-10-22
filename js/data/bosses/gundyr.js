'use strict';
// Boss 資料：灰燼審判者古達（Iudex Gundyr，黑暗靈魂3 灰燼墓地的守墓者）
// 考據：胸口貫穿螺旋劍（Coiled Sword）、手持「古達的長戟」、不死人墓地的審判者；
//   一階段：大延遲重掃 / 快速推擊 / 長程跳斬 / 跳躍插戟（收招極慢，大破口）/ 下劈三連 / 審判鐵腿・迴旋踢 / 崩架肩肘撞 / 審判立戟（見切反斬）；
//   半血：人之膿自後頸破體而出；
//   二階段：人之膿・巨爪橫掃（180°大範圍半圓弧）/ 人之膿・巨爪砸地 / 人之膿・蛇首衝咬 / 泰山壓頂・巨獸躍砸（空中滯空後全屏巨震）。
//   大招取自長戟戰技「英雄突擊」（腰側持戟戰車衝鋒，終點大迴旋橫掃；二階追加人之膿巨幅吞噬）。
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;
  const MASS = { el: 'shadow' }; // 人之膿的招式一律用暗影元素

  const gundyr = {
    id: 'gundyr', name: '古達', title: '灰燼審判者', archetype: '長戟審判',
    desc: '胸口貫著螺旋劍、守在灰燼墓地的審判者，以長戟的大開大合重掃、剛猛鐵腿體術考驗無火之灰；半血時背脊裂開，人之膿化為深淵巨獸狂暴壓制。',
    color: '#8a8378', color2: '#1b1612', glow: '#e08a3a', style: 'gundyr',
    radius: 47, maxHp: 3000, speed: 195, turn: 4.5, mass: 1.7, fxEl: 'physical', hurt: 'flesh',
    traits: ['counter'], // 審判立戟的見切架式
    stamina: { max: 120, regen: 26 }, posture: 190, dodgeCost: 22, dodgeSpeed: 470,
    ai: {
      prefRange: [80, 230],
      aggression: 0.8,
      dodge: 0.45,
      precision: 0.7,
      reaction: 0.28,
      strafe: 0.55,
      walk: 0.75,
      feint: 0.08,
      delay: 0.45,
      retreat: 0.05,
      punish: 0.65,
      nervous: 0.05,
      patience: 0.45,
      combos: [
        { id: 'judge', name: '審判連掃', weight: 1.3, steps: [
          { skill: 'fast_sweep' },
          { skill: 'heavy_sweep', cancel: 0.35, branch: [
            { when: { landed: true }, do: 'extend' },
            { chance: 0.5, do: 'delay', hold: [0.35, 0.6] },   // 原作重掃前搖長：延遲出手騙翻滾
            { do: 'stop' }] }] },
        { id: 'leap', name: '跳斬連劈', weight: 1.1, steps: [
          { skill: 'leap_slice' },
          { skill: 'rapid_chop', cancel: 0.4, branch: [
            { when: { dist: [0, 140] }, do: 'switch', skill: 'gundyr_kick' }, // 近身偷刀直接迴旋踢踹飛
            { when: { dist: [140, 240] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'tackle_combo', name: '崩架截擊', phase: 1, weight: 1.2, steps: [
          { skill: 'shoulder_tackle' },
          { skill: 'heavy_sweep', cancel: 0.35, branch: [
            { when: { landed: true }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'anti_hug', name: '鐵腿截擊', phase: 1, weight: 1.0, steps: [
          { skill: 'gundyr_kick' },
          { skill: 'leap_slice', cancel: 0.35, branch: [
            { when: { dist: [160, 420] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'devour', name: '人之膿狂潮', phase: 2, weight: 1.4, steps: [
          { skill: 'mass_smack' },
          { skill: 'screech_bite', cancel: 0.4, branch: [
            { when: { dist: [0, 260] }, do: 'extend' },
            { when: { dist: [200, 480] }, do: 'switch', skill: 'leap_slam' },
            { do: 'stop' }] }] },
        { id: 'crush', name: '深淵重壓', phase: 2, weight: 1.2, steps: [
          { skill: 'claw_slam' },
          { skill: 'mass_smack', cancel: 0.35, branch: [
            { when: { dist: [0, 280] }, do: 'extend' },
            { do: 'stop' }] }] },
      ],
    },
    phase2: {
      speedMul: 1.15, dmgMul: 1.2, cdMul: 0.8,
      line: '……（人之膿自後頸破體而出）', aura: 'shadow', fxEl: 'shadow', transFx: { id: 'sacburst', el: 'shadow' },
      note: '解鎖人之膿「巨爪橫掃」「巨爪砸地」「蛇首衝咬」「泰山壓頂・巨躍猛砸」；跳斬衝得更遠並追加巨爪拍擊，重掃與跳刺範圍加長，大招追加巨手橫掃吞噬',
    },
    skills: [
      // 1. 重掃：前搖長、傷害高，原作著名「翻滾殺手」
      { id: 'heavy_sweep', name: '審判重掃', short: '重掃', tags: ['melee', 'aoe'], range: [0, 235], cd: 3.6, cost: 26, track: 5, creep: 0.3, recovery: 0.6,
        actions: strike(0.62, 0.46, { shape: 'cone', r: 225, arc: 150 * D }, { dmg: 155, posture: 40, kb: 460, fx: 'cleave' }),
        actions2: strike(0.62, 0.5, { shape: 'cone', r: 265, arc: 160 * D }, { dmg: 169, posture: 45, kb: 500, fx: 'cleave' }) },
      // 2. 快掃：近身快速推掃拉開距離
      { id: 'fast_sweep', name: '快速推擊', short: '快掃', tags: ['melee', 'fast'], range: [0, 205], cd: 2.8, cost: 18, track: 7, creep: 0.2, recovery: 0.45,
        actions: strike(0.4, 0.3, { shape: 'cone', r: 205, arc: 125 * D }, { dmg: 95, posture: 25, kb: 380, fx: 'slash' }),
        actions2: strike(0.36, 0.27, { shape: 'cone', r: 240, arc: 135 * D }, { dmg: 105, posture: 28, kb: 420, fx: 'slash' }) },
      // 3. 跳斬：長程突進空中斜劈，二階段落地後人之膿巨爪拍擊追擊
      { id: 'leap_slice', name: '跳躍長斬', short: '跳斬', tags: ['gap'], range: [130, 430], cd: 4.6, cost: 24, track: 6, recovery: 0.55,
        actions: [...dashStrike(0.45, 0.4, 330, 80, 0.2, { dmg: 122, posture: 35, kb: 320 }, { fx: 'leap' }),
          ...strike(0.98, 0.28, { shape: 'cone', r: 170, arc: 110 * D }, { dmg: 101, posture: 25, kb: 300, fx: 'slash' })],
        actions2: [...dashStrike(0.4, 0.38, 420, 90, 0.2, { dmg: 135, posture: 38, kb: 340 }, { fx: 'leap' }),
          ...strike(0.9, 0.26, { shape: 'cone', r: 190, arc: 115 * D }, { dmg: 108, posture: 28, kb: 320, fx: 'slash' }),
          ...strike(1.2, 0.26, { shape: 'circle', r: 140, off: 70 }, { dmg: 95, posture: 25, kb: 300, fx: { id: 'slam', scale: 0.8, ...MASS } })] },
      // 4. 跳刺：跳躍插戟，傷害與架勢高，拔戟收招極慢——原作最大反擊破口
      { id: 'leap_jab', name: '跳躍插戟', short: '跳刺', tags: ['gap', 'melee'], range: [140, 450], cd: 5.2, cost: 26, track: 6, recovery: 0.85,
        actions: dashStrike(0.5, 0.45, 360, 62, 0.2, { dmg: 169, posture: 60, kb: 420 }, { fx: 'leap' }),
        actions2: dashStrike(0.44, 0.4, 440, 70, 0.18, { dmg: 189, posture: 65, kb: 460 }, { fx: 'leap' }) },
      // 5. 連劈：正前方快速連環下劈三次
      { id: 'rapid_chop', name: '下劈三連', short: '連劈', tags: ['melee', 'fast'], range: [0, 190], cd: 4.0, cost: 24, track: 6, creep: 0.25, recovery: 0.5,
        actions: [...strike(0.4, 0.28, { shape: 'circle', r: 105, off: 105 }, { dmg: 74, posture: 18, kb: 220, fx: { id: 'slam', scale: 0.7 } }),
          ...strike(0.72, 0.22, { shape: 'circle', r: 105, off: 105 }, { dmg: 74, posture: 18, kb: 220, fx: { id: 'slam', scale: 0.7 } }),
          ...strike(1.04, 0.22, { shape: 'circle', r: 115, off: 105 }, { dmg: 88, posture: 22, kb: 300, fx: { id: 'slam', scale: 0.8 } })],
        actions2: [...strike(0.36, 0.26, { shape: 'circle', r: 115, off: 110 }, { dmg: 78, posture: 18, kb: 220, fx: { id: 'slam', scale: 0.75 } }),
          ...strike(0.66, 0.2, { shape: 'circle', r: 115, off: 110 }, { dmg: 78, posture: 18, kb: 220, fx: { id: 'slam', scale: 0.75 } }),
          ...strike(0.96, 0.2, { shape: 'circle', r: 125, off: 110 }, { dmg: 95, posture: 22, kb: 320, fx: { id: 'slam', scale: 0.85 } })] },
      // 6. ★ 原作靈魂體術：審判鐵腿・迴旋踢（防身貼身、擊退貪刀）
      { id: 'gundyr_kick', name: '審判鐵腿・迴旋踢', short: '鐵腿', tags: ['melee', 'fast', 'defensive'], range: [0, 155], cd: 4.5, cost: 18, track: 8, recovery: 0.45,
        actions: strike(0.32, 0.24, { shape: 'cone', r: 155, arc: 140 * D }, { dmg: 85, posture: 35, kb: 520, fx: 'slam' }),
        actions2: strike(0.28, 0.22, { shape: 'cone', r: 170, arc: 150 * D }, { dmg: 98, posture: 40, kb: 560, fx: 'slam' }) },
      // 7. ★ 原作靈魂體術：崩架肩肘撞（高速破防削架勢）
      { id: 'shoulder_tackle', name: '崩架肩肘撞', short: '肩撞', tags: ['melee', 'fast'], range: [0, 140], cd: 3.8, cost: 16, track: 8, creep: 0.35, recovery: 0.45,
        actions: strike(0.35, 0.26, { shape: 'rect', len: 140, w: 85 }, { dmg: 80, posture: 65, kb: 220, fx: 'thrust' }),
        actions2: strike(0.32, 0.24, { shape: 'rect', len: 155, w: 90 }, { dmg: 92, posture: 75, kb: 260, fx: 'thrust' }) },
      // 8. 審判立戟：審判者的見切架式（本作改編保留）
      { id: 'judge_stance', name: '審判立戟', short: '立戟', tags: ['counter', 'defensive'], range: [0, 210], cd: 8.0, cost: 14, track: 8, recovery: 0.5,
        actions: [{ do: 'counter', at: 0, dur: 0.65, dmg: 175, posture: 60, name: '審判・反斬', fx: 'parry', slowmo: 0.25 },
          ...strike(0.9, 0.22, { shape: 'cone', r: 200, arc: 130 * D }, { dmg: 95, posture: 30, kb: 340, fx: 'slash' })],
        actions2: [{ do: 'counter', at: 0, dur: 0.65, dmg: 195, posture: 70, name: '審判・反斬', fx: 'parry', slowmo: 0.25 },
          ...strike(0.88, 0.2, { shape: 'cone', r: 230, arc: 140 * D }, { dmg: 105, posture: 34, kb: 380, fx: 'slash' })] },
      // —— 二階段專屬：人之膿深淵肉搏體系 ——
      // 9. ★ 人之膿・巨爪橫掃（180度貼地大橫掃，封鎖左右翻滾）
      { id: 'mass_smack', name: '人之膿・巨爪橫掃', short: '爪掃', phase: 2, tags: ['melee', 'aoe'], range: [0, 280], cd: 5.2, cost: 26, track: 6, recovery: 0.65,
        actions: strike(0.55, 0.42, { shape: 'cone', r: 280, arc: 180 * D }, { dmg: 168, posture: 48, kb: 520, fx: { id: 'cleave', scale: 1.2, ...MASS } }) },
      // 10. ★ 人之膿・巨爪砸地（垂直拍擊地面引發暗影爆發）
      { id: 'claw_slam', name: '人之膿・巨爪砸地', short: '爪砸', phase: 2, tags: ['melee', 'aoe'], range: [0, 220], cd: 4.8, cost: 24, track: 6, recovery: 0.6,
        actions: strike(0.52, 0.38, { shape: 'circle', r: 135, off: 90, angOff: -0.4 }, { dmg: 145, posture: 42, kb: 440, fx: { id: 'slam', scale: 1.1, ...MASS } }) },
      // 11. ★ 人之膿・蛇首衝咬（蛇首昂首後電光石火前撲撕咬）
      { id: 'screech_bite', name: '人之膿・蛇首衝咬', short: '蛇咬', phase: 2, tags: ['melee', 'fast'], range: [0, 260], cd: 5.8, cost: 22, track: 7, recovery: 0.6,
        actions: [{ do: 'hit', at: 0.2, shape: 'circle', r: 90, dmg: 0, posture: 15, kb: 160, fx: { id: 'bloodroar', scale: 0.8, ...MASS } },
          ...strike(0.65, 0.35, { shape: 'rect', len: 260, w: 95 }, { dmg: 175, posture: 50, kb: 380, fx: { id: 'thrust', scale: 1.2, ...MASS } })] },
      // 12. ★ 泰山壓頂・巨獸躍砸（全體躍入空中後下壓全場巨震）
      { id: 'leap_slam', name: '泰山壓頂・巨獸躍砸', short: '泰山壓頂', phase: 2, tags: ['gap', 'aoe', 'melee'], range: [0, 480], cd: 7.0, cost: 32, track: 5, recovery: 1.0,
        actions: [
          { do: 'tele', at: 0.1, dur: 0.85, shape: 'circle', r: 240, anchor: 'target', follow: true, lockBefore: 0.35, setMark: 'slamSpot' },
          { do: 'hide', at: 0.25, fx: 'leap' },
          { do: 'land', at: 0.95, mark: 'slamSpot' },
          { do: 'hit', at: 0.95, shape: 'circle', r: 240, anchor: 'mark', mark: 'slamSpot', dmg: 240, posture: 75, kb: 650, fx: { id: 'bigslam', scale: 1.6, ...MASS } },
          { do: 'tele', at: 0.8, dur: 0.35, shape: 'ring', r0: 220, r: 400, anchor: 'mark', mark: 'slamSpot' },
          { do: 'hit', at: 1.15, shape: 'ring', r0: 220, r: 400, anchor: 'mark', mark: 'slamSpot', dmg: 75, posture: 20, kb: 350, fx: 'ring' },
        ] },
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
