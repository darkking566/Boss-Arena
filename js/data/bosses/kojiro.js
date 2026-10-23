'use strict';
// Boss 資料：佐佐木小次郎（《終末的女武神》第 3 回戰，人類代表「史上最強的敗者」）
// 一階段：備前長光三尺余寸「物干し竿」的巖流——燕返し / 虎切 / 千手無雙（見切）/ 剣氣；被動「千手無雙」＝招式看過越多次越傷不了他（trait learn）
// HP 50%：物干し竿被折斷，神器再錬（Re-Völundr）成長刀＋小太刀，「二天岩流」解鎖富田 / 柳生 / 一刀齋 / 歷代劍豪幻影，千手進化為「萬手無雙」
// 大招：一階段「燕返し・千手無雙」三連返斬；二階段「雙燕斬虎萬刃繚亂」踏進零距離的三連斬（小太刀上撩 → 長刀上撩 → 十字斬）。考據見 docs/bosses/kojiro.md
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;
  const rect = (len, w) => ({ shape: 'rect', len, w });
  const cone = (r, arc, angOff) => Object.assign({ shape: 'cone', r, arc: arc * D }, angOff ? { angOff: angOff * D } : {});

  const kojiro = {
    id: 'kojiro', name: '佐佐木小次郎', title: '史上最強的敗者', archetype: '見切型劍聖',
    desc: '終末的女武神第 3 回戰、人類代表。一生從未勝過任何人，卻把每一場敗北都化成養分。長刀「物干し竿」使出燕返し；被折斷後神器再錬成二刀的「二天岩流」，千手進化成萬手，看穿一切攻擊。',
    color: '#8c4a3a', color2: '#4a5a3a', glow: '#cfe8ff', style: 'kojiro',
    radius: 29, maxHp: 2050, speed: 240, turn: 7.5, mass: 0.95, fxEl: 'physical', hurt: 'flesh',
    traits: ['counter', 'learn', 'clash'], clash: { style: 'blade', proj: true }, learnReset: true, // 被完美閃避＝預測被超越，千手的學習歸零（原作波賽頓超越千手）
    stamina: { max: 105, regen: 34 }, posture: 120, dodgeCost: 18, dodgeSpeed: 580,
    ai: { clash: 0.6, basic: 0.5, // 對撞傾向、普攻填空窗機率（js/engine/ai.js）
      prefRange: [150, 290], aggression: 0.5, dodge: 0.65, precision: 0.9, reaction: 0.18, strafe: 0.6, walk: 0.75,
      feint: 0.25, delay: 0.45, retreat: 0.1, punish: 0.85, nervous: 0.03, patience: 0.8, read: 0.9, counter: 0.55,
      // 連段（僅沉重）：燕返し接虎切、剣氣後長刀突進、二階段小太刀亂舞接一刀兩斷、柳生繞背接二天十字
      combos: [
        { id: 'tt', name: '燕返し・虎切', weight: 1.3, steps: [
          { skill: 'tsubame' },
          { skill: 'torakiri', cancel: 0.3, branch: [
            { when: { rolled: true, dist: [0, 330] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'kg', name: '剣氣・袈裟', steps: [
          { skill: 'kenki' },
          { skill: 'ganryu', cancel: 0.25, branch: [
            { when: { dist: [0, 300] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'ti', name: '亂舞・兩斷', phase: 2, weight: 1.2, steps: [
          { skill: 'toda' },
          { skill: 'itto', cancel: 0.35, branch: [
            { when: { dist: [0, 300] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'yn', name: '無刀・二天', phase: 2, weight: 1.1, steps: [
          { skill: 'yagyu' },
          { skill: 'niten', cancel: 0.3, branch: [
            { when: { landed: true }, do: 'extend' },
            { do: 'stop' }] }] },
      ] },
    phase2: { speedMul: 1.1, dmgMul: 1.25, cdMul: 0.8, line: '重量剛剛好……就讓我借用歷代劍豪的刀吧！', fxEl: 'physical',
      transFx: { id: 'rewelund', el: 'fire', life: 1.9 }, status: { id: 'manju' },
      note: '物干し竿被折斷、神器再錬成長刀＋小太刀的二天岩流：所有近戰招式改成雙刀版本；解鎖「富田流・小太刀亂舞」「柳生・無刀之步」「一刀齋・一刀兩斷」「二天・雙燕十字」「歷代劍豪」；千手進化為萬手無雙（常駐：移動更快、承傷降低），大招換成「雙燕斬虎萬刃繚亂」' },
    skills: [
      // 巖流基本功：物干し竿的袈裟斬 + 逆袈裟（二階段：雙刀四連）
      { id: 'ganryu', name: '巖流・袈裟斬', short: '袈裟', tags: ['melee'], range: [0, 300], cd: 2.6, cost: 12, track: 8, creep: 0.25, recovery: 0.45,
        actions: [...strike(0.42, 0.34, cone(290, 100, -18), { dmg: 72, posture: 20, kb: 150, fx: 'slash' }),
          ...strike(0.9, 0.3, cone(300, 110, 18), { dmg: 82, posture: 24, kb: 190, fx: 'slash' })],
        actions2: [...strike(0.3, 0.24, cone(210, 100, -20), { dmg: 65, posture: 16, kb: 120, fx: 'slash' }),
          ...strike(0.52, 0.2, cone(300, 100, 20), { dmg: 72, posture: 20, kb: 150, fx: 'slash' }),
          ...strike(0.76, 0.2, cone(210, 100, -20), { dmg: 65, posture: 16, kb: 120, fx: 'slash' }),
          ...strike(1.02, 0.24, cone(320, 120, 0), { dmg: 95, posture: 28, kb: 260, fx: 'cleave' })] },
      // 燕返し：全力下劈，被躲開就在瞬間停住刀勢、翻轉成速度超過 200km/h 的上撩，直取盲點（刻意不是 undodgeable，但第二擊來得很晚）
      { id: 'tsubame', name: '燕返し', short: '燕返', tags: ['melee', 'gap'], range: [60, 340], cd: 6.5, cost: 20, track: 8, recovery: 0.6,
        actions: [...strike(0.62, 0.62, rect(340, 74), { dmg: 95, posture: 28, kb: 120, fx: { id: 'cleave', scale: 0.85 } }),
          { do: 'tele', at: 0.66, dur: 0.18, ...cone(350, 230), follow: true },
          { do: 'hit', at: 0.84, ...cone(350, 230), dmg: 120, posture: 36, kb: 280, fx: { id: 'tsubame', el: 'ice' } }],
        actions2: [...strike(0.55, 0.55, rect(340, 74), { dmg: 105, posture: 30, kb: 120, fx: { id: 'cleave', scale: 0.85 } }),
          { do: 'tele', at: 0.58, dur: 0.16, ...cone(350, 230), follow: true },
          { do: 'hit', at: 0.74, ...cone(350, 230), dmg: 132, posture: 40, kb: 280, fx: { id: 'tsubame', el: 'ice' } },
          { do: 'tele', at: 0.8, dur: 0.16, ...cone(330, 90, 0), follow: true },
          { do: 'hit', at: 0.96, ...cone(330, 90, 0), dmg: 88, posture: 22, kb: 200, fx: { id: 'slash', el: 'ice' } }] },
      // 岩流秘奧・虎切：逆手握刀、突然換握改變刀位的橫斬，三道金色爪痕
      { id: 'torakiri', name: '岩流秘奧・虎切', short: '虎切', tags: ['gap'], range: [90, 340], cd: 5.5, cost: 18, track: 8, recovery: 0.55,
        actions: dashStrike(0.45, 0.42, 250, 76, 0.12, { dmg: 92, posture: 32, kb: 240, fx: 'slash' }, { fx: 'torakiri' }),
        actions2: [...dashStrike(0.4, 0.38, 270, 80, 0.11, { dmg: 100, posture: 34, kb: 240, fx: 'slash' }, { fx: 'torakiri' }),
          ...strike(0.95, 0.3, cone(220, 130), { dmg: 75, posture: 20, kb: 180, fx: 'slash' })] },
      // 千手無雙：在腦中模擬對手上千次，看穿後反斬（二階段進化為萬手無雙：架式更久、反斬更重）
      { id: 'senju', name: '千手無雙', short: '千手', tags: ['counter', 'defensive'], range: [0, 360], cd: 6.5, cost: 10, track: 8, recovery: 0.45,
        actions: [{ do: 'counter', at: 0, dur: 1.0, dmg: 156, posture: 58, name: '千手無雙・見切', fx: 'senju', slowmo: 0.35 }],
        actions2: [{ do: 'counter', at: 0, dur: 1.3, dmg: 206, posture: 80, name: '萬手無雙・見切', fx: 'manju', slowmo: 0.5 }] },
      // 剣氣・懾：原作中不拔刀、只用劍氣就讓兄弟子富田景勝屈服；範圍震懾，附帶緩速
      { id: 'kenki', name: '剣氣・懾', short: '剣氣', tags: ['zone', 'defensive'], range: [0, 260], cd: 9, cost: 14, track: 6, recovery: 0.5,
        actions: strike(0.95, 0.95, { shape: 'circle', r: 215 }, { dmg: 45, posture: 52, kb: 330, slow: 1, fx: { id: 'ring', scale: 1.3 } }),
        actions2: strike(0.85, 0.85, { shape: 'circle', r: 235 }, { dmg: 58, posture: 62, kb: 380, slow: 1, fx: { id: 'ring', scale: 1.5 } }) },
      // 物干し竿・突：超長刀的長距離突刺（二階段：小太刀快突三連）
      { id: 'monohoshi', name: '物干し竿・突', short: '長突', tags: ['ranged', 'gap'], range: [170, 440], cd: 5, cost: 16, track: 8, recovery: 0.5,
        actions: strike(0.6, 0.55, rect(450, 50), { dmg: 88, posture: 26, kb: 220, fx: 'thrust' }),
        actions2: [...strike(0.34, 0.3, rect(400, 44), { dmg: 58, posture: 14, kb: 120, fx: 'thrust' }),
          ...strike(0.56, 0.2, rect(400, 44), { dmg: 58, posture: 14, kb: 120, fx: 'thrust' }),
          ...strike(0.84, 0.28, rect(470, 54), { dmg: 92, posture: 28, kb: 260, fx: 'thrust' })] },

      // ── 二階段：二天岩流（融合歷代對手的劍） ──
      // 富田勢源（小太刀名人）：快速的小太刀亂舞
      { id: 'toda', name: '富田流・小太刀亂舞', short: '小太刀', phase: 2, tags: ['melee', 'fast'], range: [0, 190], cd: 4.5, cost: 18, track: 9, creep: 0.3, recovery: 0.5,
        actions: [...strike(0.26, 0.2, cone(170, 90, -25), { dmg: 40, posture: 10, kb: 70, fx: 'slash' }),
          ...strike(0.44, 0.16, cone(170, 90, 25), { dmg: 40, posture: 10, kb: 70, fx: 'slash' }),
          ...strike(0.62, 0.16, cone(180, 90, -20), { dmg: 42, posture: 10, kb: 70, fx: 'slash' }),
          ...strike(0.8, 0.16, cone(180, 90, 20), { dmg: 42, posture: 10, kb: 70, fx: 'slash' }),
          ...strike(1.14, 0.3, cone(220, 140, 0), { dmg: 80, posture: 26, kb: 260, fx: 'cleave' })] },
      // 柳生石舟齋（無刀取り）：流水般的步法，閃到對手背後再斬
      { id: 'yagyu', name: '柳生・無刀之步', short: '無刀', phase: 2, tags: ['gap'], range: [120, 520], cd: 7, cost: 20, track: 8, recovery: 0.55,
        actions: [{ do: 'hide', at: 0.05, fx: 'vanish' }, { do: 'appear', at: 0.55, dist: 70 },
          ...strike(1.0, 0.42, cone(240, 150), { dmg: 110, posture: 34, kb: 260, fx: 'whirl' })] },
      // 伊藤一刀齋（一刀流）：全身的重量壓在一刀上，一刀兩斷
      { id: 'itto', name: '一刀齋・一刀兩斷', short: '兩斷', phase: 2, tags: ['melee', 'zone'], range: [0, 360], cd: 9, cost: 26, track: 6, recovery: 0.85,
        actions: [{ do: 'tele', at: 0, dur: 1.0, ...rect(400, 120), follow: true },
          { do: 'hit', at: 1.0, ...rect(400, 120), dmg: 188, posture: 80, kb: 420, fx: { id: 'cleave', scale: 1.25 } }] },
      // 宮本武蔵的二天一流：雙刀左右交錯，最後交叉成十字
      { id: 'niten', name: '二天・雙燕十字', short: '十字', phase: 2, tags: ['melee'], range: [0, 320], cd: 6, cost: 22, track: 8, recovery: 0.6,
        actions: [...strike(0.36, 0.3, cone(320, 100, -22), { dmg: 68, posture: 18, kb: 140, fx: 'slash' }),
          ...strike(0.62, 0.22, cone(320, 100, 22), { dmg: 68, posture: 18, kb: 140, fx: 'slash' }),
          { do: 'tele', at: 0.62, dur: 0.5, ...rect(340, 70), angOff: 0.7, follow: true },
          { do: 'tele', at: 0.62, dur: 0.5, ...rect(340, 70), angOff: -0.7, follow: true },
          { do: 'hit', at: 1.12, ...rect(340, 70), angOff: 0.7, dmg: 78, posture: 30, kb: 260, fx: { id: 'cross', el: 'blood' } },
          { do: 'hit', at: 1.12, ...rect(340, 70), angOff: -0.7, dmg: 78, posture: 30, kb: 260, fx: { id: 'cross', el: 'blood' } }] },
      // 圖像訓練：歷代劍豪的幻影從身後奔出（原作：與前人的對戰記憶、客席的劍豪們為他吶喊）
      { id: 'phantoms', name: '歷代劍豪', short: '幻影', phase: 2, tags: ['ranged', 'zone'], range: [200, 900], cd: 10, cost: 28, track: 7, recovery: 0.7,
        actions: [{ do: 'tele', at: 0, dur: 0.85, ...cone(820, 70), follow: true },
          { do: 'proj', at: 0.85, n: 5, spread: 0.2, speed: 780, r: 42, dmg: 78, posture: 22, kb: 240, life: 1.15, pierce: true, kind: 'swordghost' }] },
      // 普攻：無冷卻無消耗，填補技能空窗，也是對撞的主力
      { id: 'basic', name: '長刀斬', short: '長刀', tags: ['melee', 'fast', 'basic'], weight: 0.45, range: [0, 300], cd: 0, cost: 0, track: 8, recovery: 0.3,
        actions: strike(0.22, 0.16, rect(290, 56), { dmg: 28, posture: 8, kb: 60, fx: 'slash' }) }
    ],
    // 一階段「燕返し・千手無雙」：在腦中死了十八次後的三連返斬，一次比一次更深；
    // 二階段「雙燕斬虎萬刃繚亂」：劍豪幻影奔過全場、踏進零距離，小太刀上撩 → 長刀上撩 → 雙刀十字斬
    ultimate: { id: 'ult', name: '燕返し・千手無雙', name2: '雙燕斬虎萬刃繚亂', ult: true, range: [0, 560], track: 0, recovery: 0.95,
      actions: [...strike(0.9, 0.9, rect(420, 90), { dmg: 112, posture: 40, kb: 220, fx: { id: 'cleave', scale: 1 } }),
        { do: 'tele', at: 0.95, dur: 0.2, ...cone(430, 230), follow: true },
        { do: 'hit', at: 1.15, ...cone(430, 230), dmg: 130, posture: 46, kb: 300, fx: { id: 'tsubame', el: 'ice' } },
        ...strike(1.85, 0.5, rect(470, 100), { dmg: 125, posture: 44, kb: 240, fx: { id: 'cleave', scale: 1.1 } }),
        { do: 'tele', at: 1.9, dur: 0.18, ...cone(480, 250), follow: true },
        { do: 'hit', at: 2.08, ...cone(480, 250), dmg: 155, posture: 52, kb: 340, fx: { id: 'tsubame', el: 'ice', scale: 1.2 } },
        ...strike(2.85, 0.6, rect(560, 130), { dmg: 188, posture: 70, kb: 400, fx: { id: 'skyrend', el: 'ice' } })],
      actions2: [{ do: 'proj', at: 0.9, n: 5, spread: 0.26, speed: 900, r: 44, dmg: 50, posture: 16, kb: 160, life: 1.0, pierce: true, kind: 'swordghost' },
        { do: 'tele', at: 0.1, dur: 0.8, ...cone(720, 60), follow: true },
        ...dashStrike(1.2, 0.55, 520, 90, 0.14, { dmg: 88, posture: 30, kb: 220, fx: 'slash' }, { fx: 'slashline' }),
        { do: 'tele', at: 1.35, dur: 0.35, ...cone(300, 120, -35), follow: true },
        { do: 'hit', at: 1.7, ...cone(300, 120, -35), dmg: 120, posture: 38, kb: 260, fx: { id: 'tsubame', el: 'blood' } },
        { do: 'tele', at: 1.75, dur: 0.2, ...cone(320, 130, 35), follow: true },
        { do: 'hit', at: 1.95, ...cone(320, 130, 35), dmg: 138, posture: 44, kb: 300, fx: { id: 'tsubame', el: 'blood' } },
        { do: 'tele', at: 2.0, dur: 0.5, shape: 'circle', r: 220, off: 130, follow: true },
        { do: 'hit', at: 2.5, shape: 'circle', r: 220, off: 130, dmg: 288, posture: 90, kb: 560, fx: { id: 'souen', el: 'blood', scale: 1.2 } }],
      desc: '一階段：十八次「死亡」換來的三連燕返し，下劈、上撩一次比一次深；二階段：歷代劍豪的幻影奔過戰場，踏進零距離，小太刀上撩、長刀上撩、最後雙刀交叉的十字斬' },
  };

  BD.registerBoss(kojiro);
})(typeof window !== 'undefined' ? window : globalThis);
