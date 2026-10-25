'use strict';
// Boss 資料：宙斯（《終末的女武神》第 2 回戰：眾神之王、「全宇宙之父」GFOC）；考據見 docs/bosses/zeus.md
// 一階段「肌肉形態」：瘦小老人把肌肉膨脹到誇張的巨漢，赤手空拳；被打得越痛越開心（trait 'battlelust'）。
// 二階段「阿陀磨須」：把全身肌肉壓縮到極限，身體近乎不壞、卻在一點一滴崩壞（phase2.status 'adamas'）。
// 元素：一階段 holy（金色神威）、神之斧 blood（動畫中的血紅背景）、二階段 cosmos（阿陀磨須身後的紫黑星海，新增元素）。
(function (G) {
  const BD = G.BD, { D, strike, dashStrike, flurry } = BD.DataKit;
  const COSMOS = { el: 'cosmos' };

  const zeus = {
    id: 'zeus', name: '宙斯', title: '全宇宙之父', archetype: '鬥神・肌肉變形',
    desc: '希臘眾神之王、眾神會議議長，自稱「全宇宙之父（GFOC）」。外表是禿頂、灰色衝天髮、長鬚綁著金珠的瘦小老人，一開打就把肌肉膨脹成巨漢；不用神器、只想親耳聽對手骨頭碎裂的聲音。被逼到絕境時把全身肌肉壓縮成「阿陀磨須」，連神明都會本能地發抖。',
    color: '#f2ead8', color2: '#5a4a3a', glow: '#ffd36a', style: 'zeus',
    rank: 'boss', stars: 5,
    radius: 36, maxHp: 2250, speed: 205, turn: 6, mass: 1.5, fxEl: 'holy', hurt: 'flesh',
    traits: ['battlelust'], // 鬥神狂喜：每挨 3 下就興奮到渾身肌肉再膨脹一圈（js/engine/traits.js）
    stamina: { max: 125, regen: 30 }, posture: 175, dodgeCost: 20, dodgeSpeed: 520,
    ai: {
      prefRange: [80, 210],
      aggression: 0.8,
      dodge: 0.35,
      precision: 0.75,
      reaction: 0.22,
      strafe: 0.55,
      walk: 0.5,
      feint: 0.15,
      delay: 0.25,
      retreat: 0.04,
      punish: 0.7,
      nervous: 0.02,
      patience: 0.35,
      read: 0.55,
      // 戰鬥狂：幾乎不退、一路壓上，用連打和掃踢一段接一段地逼近
      combos: [
        { id: 'jab_meteor', name: '亞光速→流星', phase: 1, weight: 1.3, steps: [
          { skill: 'light_jab' },
          { skill: 'meteor_jab', cancel: 0.3, branch: [
            { when: { status: 'ecstasy' }, do: 'extend' },
            { when: { landed: true }, do: 'extend' },
            { when: { dist: [0, 240] }, chance: 0.6, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'meteor_axe', name: '流星藏斧', weight: 1.2, steps: [
          { skill: 'meteor_jab' },
          { skill: 'divine_axe', cancel: 0.4, branch: [
            { when: { status: 'ecstasy' }, do: 'extend' },
            { when: { dist: [0, 250] }, do: 'extend' },
            { when: { rollDir: ['back'], dist: [250, 520] }, do: 'switch', skill: 'zeus_footwork' },
            { do: 'stop' }] }] },
        { id: 'footwork_gavel', name: '步法・審判', phase: 1, weight: 1.0, steps: [
          { skill: 'zeus_footwork' },
          { skill: 'gavel_decree', cancel: 0.35, branch: [
            { when: { landed: true }, do: 'extend' },
            { chance: 0.4, do: 'delay', hold: [0.25, 0.5] },
            { do: 'stop' }] }] },
        { id: 'axe_pose', name: '斧後擺姿', phase: 1, weight: 0.8, steps: [
          { skill: 'divine_axe' },
          { skill: 'gfoc', cancel: 0.4, branch: [
            { when: { landed: true }, do: 'extend' },
            { when: { status: 'ecstasy' }, chance: 0.5, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'adamas_rush', name: '阿陀磨須猛攻', phase: 2, weight: 1.4, steps: [
          { skill: 'true_right' },
          { skill: 'divine_axe', cancel: 0.4, branch: [
            { when: { dist: [0, 260] }, do: 'extend' },
            { when: { dist: [260, 700] }, do: 'switch', skill: 'time_fist' },
            { do: 'stop' }] }] },
        { id: 'adamas_step', name: '神速步法', phase: 2, weight: 1.1, steps: [
          { skill: 'zeus_footwork' },
          { skill: 'true_right', cancel: 0.35, branch: [
            { when: { dist: [0, 300] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'star_storm', name: '星海流星', phase: 2, weight: 1.2, steps: [
          { skill: 'meteor_jab' },
          { skill: 'true_right', cancel: 0.3, branch: [
            { when: { landed: true }, do: 'extend' },
            { when: { dist: [0, 300] }, do: 'extend' },
            { do: 'stop' }] }] },
      ],
    },
    phase2: {
      speedMul: 1.15, dmgMul: 1.2, cdMul: 0.82, fxEl: 'cosmos', transDur: 2.8, roarAt: 1.7, transFx: { id: 'adamas', el: 'cosmos' },
      status: { id: 'adamas' },
      line: '……你很強，我承認。用現在的樣子是贏不了你的——雖然不想用這招，太折騰這把老骨頭了。',
      note: '把全身肌肉壓縮到極限的終極形態「阿陀磨須」：身體近乎不壞（承受傷害降低、架勢更穩），代價是肉體每秒都在崩壞（持續損耗生命，不會因此倒下）；流星拳更長更快、神之斧化為紫黑星海的巨斧、步法殘影更多、超越時間之拳更長，解鎖「真・神之右」；全宇宙之父改為阿陀磨須的威壓',
    },
    skills: [
      // 原作：亞光速 Jab——0.01 秒的一拳，開場第一招
      { id: 'light_jab', name: '亞光速刺拳', short: '刺拳', tags: ['melee', 'fast'], range: [0, 200], cd: 2.4, cost: 14, track: 9, creep: 0.4, recovery: 0.35,
        actions: [...strike(0.3, 0.16, { shape: 'rect', len: 200, w: 70 }, { dmg: 72, posture: 22, kb: 260, fx: { id: 'zeusjab', scale: 1.2 } })],
        actions2: [...strike(0.26, 0.14, { shape: 'rect', len: 215, w: 74 }, { dmg: 60, posture: 18, kb: 120, fx: 'zeusjab' }),
          ...strike(0.5, 0.14, { shape: 'rect', len: 230, w: 80 }, { dmg: 72, posture: 22, kb: 300, fx: { id: 'zeusjab', scale: 1.3 } })] },
      // 原作：黃昏流星群（メテオジャブ）——每一拳都比上一拳快 10 倍，從 0.01 秒加速到 0.00000001 秒；遊戲中間隔逐拳縮短，最後一拳化作漫天拳雨
      { id: 'meteor_jab', name: '黃昏流星拳', short: '流星', tags: ['melee', 'fast'], range: [0, 245], cd: 6.5, cost: 26, track: 7, recovery: 0.75,
        actions: [{ do: 'tele', at: 0.05, dur: 0.45, shape: 'rect', len: 245, w: 120, follow: true },
          ...flurry(0.5, 10, 0.13, { shape: 'rect', len: 245, w: 120 }, { dmg: 16, posture: 6, kb: 35 }, 'sunsetrush', 0.82),
          ...strike(1.32, 0.18, { shape: 'rect', len: 275, w: 140 }, { dmg: 66, posture: 26, kb: 440, fx: 'sunsetrush' })],
        actions2: [{ do: 'tele', at: 0.05, dur: 0.4, shape: 'rect', len: 265, w: 130, follow: true },
          ...flurry(0.45, 14, 0.11, { shape: 'rect', len: 265, w: 130 }, { dmg: 15, posture: 6, kb: 35 }, 'sunsetrush', 0.85),
          ...strike(1.32, 0.18, { shape: 'rect', len: 300, w: 150 }, { dmg: 72, posture: 28, kb: 480, fx: { id: 'sunsetrush', scale: 1.25 } })] },
      // 原作：神之斧（神の斧）——能把對手一分為二的迴旋掃踢；動畫中腿後浮現一柄巨斧的幻影
      { id: 'divine_axe', name: '神之斧', short: '神斧', tags: ['melee', 'aoe'], range: [0, 250], cd: 5.2, cost: 26, track: 6, creep: 0.25, recovery: 0.7,
        actions: [...strike(0.28, 0.2, { shape: 'rect', len: 160, w: 70 }, { dmg: 44, posture: 12, kb: 90, fx: 'zeusjab' }),
          ...strike(0.95, 0.5, { shape: 'cone', r: 235, arc: 210 * D }, { dmg: 152, posture: 52, kb: 540, fx: { id: 'godaxe', el: 'blood' } })],
        actions2: [...strike(0.24, 0.18, { shape: 'rect', len: 170, w: 72 }, { dmg: 44, posture: 12, kb: 90, fx: 'zeusjab' }),
          ...strike(0.85, 0.46, { shape: 'cone', r: 270, arc: 230 * D }, { dmg: 165, posture: 58, kb: 580, fx: { id: 'godaxe', scale: 1.25 } })] },
      // 原作：宙斯的步法（阿瑞斯只稱它「那個」）——加速到留下殘影繞著對手轉，趁對方眼花從背後一記踢頭
      { id: 'zeus_footwork', name: '宙斯步法', short: '步法', tags: ['gap', 'melee'], range: [120, 480], cd: 7.5, cost: 24, track: 6, recovery: 0.6,
        actions: [{ do: 'circle', at: 0.15, dur: 0.75, r: 150 },
          { do: 'appear', at: 0.95, dist: 55 },
          ...strike(1.3, 0.3, { shape: 'cone', r: 160, arc: 110 * D }, { dmg: 138, posture: 48, kb: 460, fx: { id: 'stepecho', scale: 1.4 } })],
        actions2: [{ do: 'circle', at: 0.12, dur: 0.9, r: 160 },
          { do: 'appear', at: 1.05, dist: 55 },
          ...strike(1.35, 0.26, { shape: 'cone', r: 175, arc: 120 * D }, { dmg: 150, posture: 52, kb: 500, fx: { id: 'stepecho', scale: 1.6 } })] },
      // 原作：眾神會議上一槌砸壞大半個地板、宣告諸神黃昏開始的小木槌；改編為審判之槌
      { id: 'gavel_decree', name: '審判之槌', short: '神槌', maxPhase: 1, tags: ['melee', 'aoe'], range: [0, 220], cd: 8, cost: 28, track: 4, recovery: 0.9,
        actions: [...strike(0.8, 0.55, { shape: 'circle', r: 135, off: 90 }, { dmg: 140, posture: 50, kb: 460, fx: { id: 'gavelverdict', scale: 0.95 } }),
          { do: 'tele', at: 0.6, dur: 0.4, shape: 'ring', r0: 120, r: 330, off: 90, follow: true },
          { do: 'hit', at: 1.0, shape: 'ring', r0: 120, r: 330, off: 90, dmg: 62, posture: 18, kb: 320, fx: 'ring' }] },
      // 原作：第 2 回戰入場時赫密士拉小提琴、兩人共舞，眾神齊喊「GFOC」，宙斯隨即把肌肉膨脹成巨漢
      { id: 'gfoc', name: '全宇宙之父', short: 'GFOC', tags: ['defensive'], range: [0, 320], cd: 14, cost: 12, recovery: 0.5,
        actions: [{ do: 'hit', at: 0.45, shape: 'circle', r: 200, dmg: 0, posture: 28, kb: 360, fx: 'gfocroar', status: { id: 'slow', dur: 1.5 } },
          { do: 'status', at: 0.45, id: 'shield', dur: 5, value: 120 },
          { do: 'status', at: 0.45, id: 'enrage', dur: 4 }],
        actions2: [{ do: 'hit', at: 0.4, shape: 'circle', r: 240, dmg: 0, posture: 34, kb: 420, fx: { id: 'gfocroar', el: 'cosmos' }, status: [{ id: 'slow', dur: 2 }, { id: 'vulnerable', dur: 3 }] },
          { do: 'status', at: 0.4, id: 'shield', dur: 5, value: 150 },
          { do: 'status', at: 0.4, id: 'enrage', dur: 4 }] },
      // 原作：超越時間之拳（時を超える拳）——父親克羅諾斯在泰坦之戰最後打中自己的一拳，被宙斯烙進身體、據為己有；出拳快到時間停下
      { id: 'time_fist', name: '超越時間之拳', short: '時間拳', tags: ['gap', 'melee'], range: [150, 560], cd: 12, cost: 30, track: 5, recovery: 1.1,
        actions: [{ do: 'tele', at: 0.1, dur: 1.0, shape: 'rect', len: 560, w: 84, follow: true, lockBefore: 0.3, undodgeable: true, chargeFx: 'timestop' },
          { do: 'dash', at: 1.1, dist: 560, dur: 0.07, hit: { dmg: 220, posture: 75, kb: 620, undodgeable: true }, fx: 'kronosfist' }],
        actions2: [{ do: 'tele', at: 0.1, dur: 0.9, shape: 'rect', len: 620, w: 90, follow: true, lockBefore: 0.28, undodgeable: true, chargeFx: { id: 'timestop', el: 'cosmos' } },
          { do: 'dash', at: 1.0, dist: 620, dur: 0.07, hit: { dmg: 245, posture: 80, kb: 660, undodgeable: true }, fx: { id: 'kronosfist', el: 'cosmos' } }] },
      // —— 二階段專屬 ——
      // 原作：真・神之右（真・神の右）——阿陀磨須傾注全部神力的直拳，接著不停歇地連打；雖名為「右」，左右拳都會出
      { id: 'true_right', name: '真・神之右', short: '神之右', phase: 2, tags: ['melee', 'fast'], range: [0, 290], cd: 8.5, cost: 28, track: 6, recovery: 0.85,
        actions: [{ do: 'tele', at: 0.1, dur: 0.6, shape: 'rect', len: 290, w: 120, follow: true },
          { do: 'hit', at: 0.7, shape: 'rect', len: 290, w: 120, dmg: 130, posture: 48, kb: 300, fx: { id: 'adamasfist', scale: 1.1 } },
          ...flurry(0.92, 12, 0.12, { shape: 'rect', len: 290, w: 120 }, { dmg: 16, posture: 5, kb: 40 }, 'zeusjab', 0.9),
          ...strike(2.25, 0.25, { shape: 'rect', len: 320, w: 140 }, { dmg: 85, posture: 30, kb: 520, fx: { id: 'adamasfist', scale: 1.8 } })] },
    ],
    ultimate: {
      id: 'ult', name: '超越時間之拳・克羅諾斯', name2: '阿陀磨須・真・神之右', ult: true, range: [0, 900], track: 4, recovery: 1.1,
      actions: [ // 一階段：時間停止——鐘面在腳下逆轉、對手被拖慢，然後是比原招更粗更長的一拳
        { do: 'status', at: 0.2, id: 'slow', dur: 1.8, target: 'enemy' },
        { do: 'tele', at: 0.15, dur: 1.45, shape: 'rect', len: 720, w: 130, follow: true, lockBefore: 0.35, undodgeable: true, chargeFx: 'timestop' },
        { do: 'dash', at: 1.6, dist: 720, dur: 0.08, hit: { dmg: 250, posture: 90, kb: 700, undodgeable: true }, fx: { id: 'kronosfist', scale: 1.4, el: 'holy' } },
        ...strike(1.85, 0.3, { shape: 'circle', r: 200 }, { dmg: 90, posture: 30, kb: 500, fx: { id: 'olympusquake', scale: 1.2 } }),
      ],
      actions2: [ // 二階段：阿陀磨須全力——無敵地打出無盡的真・神之右，再補一記超越時間之拳，最後一拳把星海砸進地面
        { do: 'invuln', at: 0, dur: 3.6 },
        { do: 'tele', at: 0.1, dur: 0.85, shape: 'rect', len: 380, w: 190, follow: true, lockBefore: 0.3, chargeFx: { id: 'timestop', el: 'cosmos' } },
        { do: 'hit', at: 0.95, shape: 'rect', len: 380, w: 190, dmg: 110, posture: 40, kb: 120, fx: { id: 'adamasfist', scale: 1.5 } },
        ...flurry(1.15, 14, 0.1, { shape: 'rect', len: 380, w: 190 }, { dmg: 13, posture: 5, kb: 40 }, { id: 'zeusjab', el: 'cosmos' }, 0.92),
        { do: 'tele', at: 2.0, dur: 0.55, shape: 'rect', len: 720, w: 110, follow: true, lockBefore: 0.2, undodgeable: true },
        { do: 'dash', at: 2.55, dist: 720, dur: 0.07, hit: { dmg: 220, posture: 80, kb: 660, undodgeable: true }, fx: { id: 'kronosfist', el: 'cosmos', scale: 1.4 } },
        ...strike(3.4, 0.5, { shape: 'circle', r: 260 }, { dmg: 150, posture: 60, kb: 720, fx: { id: 'olympusquake', scale: 1.6, ...COSMOS } }),
      ],
      desc: '一階段「超越時間之拳・克羅諾斯」：腳下鐘面逆轉、對手被時間拖慢，接著打出比原招更粗更長的一拳（無法閃避，橫移離開直線），落點炸開震波；二階段「阿陀磨須・真・神之右」：全程無敵，傾注全部神力的直拳接無盡連打，再補一記超越時間之拳，最後一拳把紫黑星海砸進大地。',
    },
  };

  BD.registerBoss(zeus);
})(typeof window !== 'undefined' ? window : globalThis);
