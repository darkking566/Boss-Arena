'use strict';
// Boss 資料：雷神索爾（《終末的女武神》第 1 回戰）：沉睡的雷槌（一階段，物理）→ 覺醒雷槌（二階段，雷電）；考據見 docs/bosses/thor.md
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;

  const thor = {
    id: 'thor', name: '索爾', title: '雷之狂戰士', archetype: '重槌壓制',
    desc: '北歐最強的雷神。寡言而冷漠，只在遇到值得一戰的對手時露出笑容；以鐵手套雅恩格利佩爾壓住沉睡的雷槌妙爾尼爾，雷槌覺醒後雷霆萬鈞。',
    color: '#3d8bff', color2: '#1a2238', glow: '#9fd4ff', style: 'thor',
    rank: 'boss', stars: 3.5,
    radius: 34, maxHp: 2900, speed: 195, turn: 5, mass: 1.6, fxEl: 'physical', hurt: 'flesh',
    traits: ['counter'], // 雅恩格利佩爾格擋反擊（js/engine/traits.js）
    stamina: { max: 115, regen: 28 }, posture: 180, dodgeCost: 22, dodgeSpeed: 500,
    ai: {
      prefRange: [90, 220],
      aggression: 0.6,
      dodge: 0.3,
      precision: 0.75,
      reaction: 0.24,
      strafe: 0.75,
      walk: 0.55,
      feint: 0.12,
      delay: 0.45,
      retreat: 0.06,
      punish: 0.85,
      nervous: 0.04,
      patience: 0.7,
      read: 0.6,
      counter: 0.6,
      // 冷靜沉重的壓迫：耐心繞圈保持距離、極少翻滾、倚賴格擋反擊與延遲重擊
      combos: [
        { id: 'thunderwrath', name: '雷神連槌', weight: 1.3, steps: [
          { skill: 'hammer_sweep' },
          { skill: 'hammer_slam', cancel: 0.4, branch: [
            { when: { landed: true }, do: 'extend' },
            { when: { rollDir: ['back'], dist: [150, 400] }, do: 'switch', skill: 'giant_felling' },
            { chance: 0.45, do: 'delay', hold: [0.3, 0.55] },
            { do: 'stop' }] }] },
        { id: 'ironwall', name: '鐵壁連槌', phase: 1, weight: 1.1, steps: [
          { skill: 'hammer_chain', exits: [{ after: 2, when: { rolled: true }, chance: 0.5, then: 'next' }] },
          { skill: 'hammer_sweep', cancel: 0.45, branch: [
            { when: { dist: [0, 190] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'boomerang', name: '迴旋雷槌', phase: 2, weight: 1.4, steps: [
          { skill: 'mjolnir_throw' },
          { skill: 'thunder_step', cancel: 0.35, branch: [
            { when: { dist: [180, 600] }, do: 'extend' },
            { when: { dist: [0, 180] }, do: 'switch', skill: 'hammer_slam' },
            { do: 'stop' }] }] },
        { id: 'storm', name: '萬雷轟頂', phase: 2, weight: 1.2, steps: [
          { skill: 'thunder_rampage' },
          { skill: 'hammer_sweep', cancel: 0.4, branch: [
            { when: { dist: [0, 200] }, do: 'extend' },
            { when: { dist: [200, 600] }, do: 'switch', skill: 'thunder_step' },
            { do: 'stop' }] }] },
      ],
    },
    phase2: {
      speedMul: 1.15, dmgMul: 1.18, cdMul: 0.82, fxEl: 'lightning', transDur: 2.3, roarAt: 1.0, transFx: { id: 'thunderwake', el: 'lightning' },
      line: '……醒了嗎，貪睡的傢伙。別太快死了。',
      note: '雅恩格利佩爾碎裂、雷槌妙爾尼爾覺醒：招式轉為雷電元素；橫掃改為正反兩掃、砸地追加雷爆環、三連槌加快並以雷擊收尾、屠巨一振震波擴大；格擋失效，解鎖「雷槌迴旋擲」「雷光瞬身」「雷霆萬鈞」；大招變為「覺醒雷槌・蓋爾羅德」（擲出 → 迴旋返回 → 接槌躍擊）',
    },
    skills: [
      { id: 'hammer_sweep', name: '雷槌橫掃', short: '橫掃', tags: ['melee', 'aoe'], range: [0, 190], cd: 3.4, cost: 24, track: 5, creep: 0.25, recovery: 0.7,
        actions: strike(0.6, 0.42, { shape: 'cone', r: 190, arc: 140 * D }, { dmg: 121, posture: 38, kb: 420, fx: 'cleave' }),
        actions2: [...strike(0.5, 0.36, { shape: 'cone', r: 200, arc: 150 * D }, { dmg: 110, posture: 32, kb: 300, fx: 'cleave' }),
          ...strike(0.95, 0.3, { shape: 'cone', r: 210, arc: 150 * D }, { dmg: 105, posture: 30, kb: 440, fx: 'cleave' })] },
      { id: 'hammer_slam', name: '雷槌砸地', short: '砸地', tags: ['melee'], range: [0, 200], cd: 4.2, cost: 26, track: 4, recovery: 0.85,
        actions: strike(0.75, 0.5, { shape: 'circle', r: 120, off: 95 }, { dmg: 154, posture: 50, kb: 480, fx: 'slam' }),
        actions2: [...strike(0.65, 0.45, { shape: 'circle', r: 130, off: 95 }, { dmg: 154, posture: 50, kb: 480, fx: 'slam' }),
          ...strike(0.88, 0.2, { shape: 'ring', r0: 110, r: 250 }, { dmg: 66, posture: 20, kb: 320, fx: 'nova' })] },
      // 原作以戴手套的右臂格擋方天戟；二階段手套已碎，此招僅限一階段
      { id: 'jarngreipr_guard', name: '雅恩格利佩爾・格擋', short: '格擋', maxPhase: 1, tags: ['counter', 'defensive'], range: [0, 220], cd: 6.0, cost: 12, track: 8, recovery: 0.45,
        actions: [{ do: 'counter', at: 0, dur: 0.65, dmg: 165, posture: 70, name: '鐵手套・反槌', fx: 'ironfist', slowmo: 0.3 },
          ...strike(0.9, 0.25, { shape: 'circle', r: 115, off: 70 }, { dmg: 105, posture: 40, kb: 360, fx: 'slam' })] },
      // 原作壯舉：66 名巨人每人一振即斃、一振殲滅呂布全軍
      { id: 'giant_felling', name: '屠巨一振', short: '一振', tags: ['melee', 'aoe'], range: [0, 330], cd: 7.5, cost: 30, track: 3, recovery: 1.0,
        actions: [{ do: 'tele', at: 0.15, dur: 0.85, shape: 'cone', r: 330, arc: 100 * D, follow: true },
          { do: 'hit', at: 1.0, shape: 'cone', r: 330, arc: 100 * D, dmg: 165, posture: 55, kb: 560, fx: { id: 'cleave', scale: 1.4 } },
          { do: 'tele', at: 0.75, dur: 0.4, shape: 'ring', r0: 200, r: 380, follow: true },
          { do: 'hit', at: 1.15, shape: 'ring', r0: 200, r: 380, dmg: 61, posture: 18, kb: 320, fx: 'ring' }],
        actions2: [{ do: 'tele', at: 0.12, dur: 0.78, shape: 'cone', r: 350, arc: 110 * D, follow: true },
          { do: 'hit', at: 0.9, shape: 'cone', r: 350, arc: 110 * D, dmg: 182, posture: 60, kb: 600, fx: { id: 'cleave', scale: 1.5 } },
          { do: 'tele', at: 0.68, dur: 0.4, shape: 'ring', r0: 210, r: 430, follow: true },
          { do: 'hit', at: 1.08, shape: 'ring', r0: 210, r: 430, dmg: 77, posture: 22, kb: 360, fx: 'ring' }] },
      // 原作能力：令人畏懼的威壓，連戰乙女格爾都僵住
      { id: 'divine_pressure', name: '雷神威壓', short: '威壓', tags: ['defensive'], range: [0, 420], cd: 12, cost: 14, recovery: 0.5,
        actions: [{ do: 'hit', at: 0.35, shape: 'circle', r: 200, dmg: 0, posture: 25, kb: 260, fx: 'pressure', status: { id: 'slow', dur: 2.0 } },
          { do: 'status', at: 0.35, id: 'shield', dur: 4, value: 120 }],
        actions2: [{ do: 'hit', at: 0.3, shape: 'circle', r: 240, dmg: 0, posture: 30, kb: 300, fx: 'pressure', status: [{ id: 'slow', dur: 2.5 }, { id: 'vulnerable', dur: 3 }] },
          { do: 'status', at: 0.3, id: 'shield', dur: 4, value: 150 }] },
      // 改編：魂系大開大合——兩記重掃後故意延遲的過頂砸地，誘使對手提早翻滾
      { id: 'hammer_chain', name: '雷槌三連', short: '三連', tags: ['melee'], range: [0, 180], cd: 5.0, cost: 30, track: 5, creep: 0.35, recovery: 0.9,
        actions: [...strike(0.5, 0.35, { shape: 'cone', r: 170, arc: 120 * D }, { dmg: 77, posture: 22, kb: 180, fx: 'slash' }),
          ...strike(1.05, 0.35, { shape: 'cone', r: 170, arc: 120 * D }, { dmg: 82, posture: 24, kb: 200, fx: 'slash' }),
          ...strike(1.75, 0.55, { shape: 'circle', r: 125, off: 90 }, { dmg: 138, posture: 48, kb: 480, fx: 'slam' })],
        actions2: [...strike(0.42, 0.3, { shape: 'cone', r: 175, arc: 120 * D }, { dmg: 77, posture: 22, kb: 180, fx: 'slash' }),
          ...strike(0.85, 0.3, { shape: 'cone', r: 175, arc: 120 * D }, { dmg: 82, posture: 24, kb: 200, fx: 'slash' }),
          ...strike(1.45, 0.5, { shape: 'circle', r: 135, off: 90 }, { dmg: 143, posture: 50, kb: 500, fx: { id: 'bigslam', scale: 0.9 } })] },
      // 原作：覺醒雷槌擲出後像迴力鏢一樣繞回——去程、回程各一段判定
      { id: 'mjolnir_throw', name: '雷槌迴旋擲', short: '迴旋擲', phase: 2, tags: ['ranged'], range: [200, 800], cd: 7, cost: 26, track: 4, recovery: 0.7,
        actions: [{ do: 'tele', at: 0.1, dur: 0.6, shape: 'rect', len: 820, w: 80, follow: true, lockBefore: 0.15, setMark: 'M' },
          { do: 'hit', at: 0.7, shape: 'rect', anchor: 'mark', mark: 'M', len: 820, w: 80, dmg: 94, posture: 30, kb: 200, fx: 'thunderpath' },
          { do: 'tele', at: 0.8, dur: 0.6, shape: 'rect', anchor: 'mark', mark: 'M', len: 820, w: 80 },
          { do: 'hit', at: 1.4, shape: 'rect', anchor: 'mark', mark: 'M', len: 820, w: 80, dmg: 82, posture: 25, kb: 260, fx: { id: 'thunderpath', scale: 1.3 } }] },
      // 原作能力：動畫第 1 話的瞬間移動（資料書確認）；改編為閃到背後的砸擊
      { id: 'thunder_step', name: '雷光瞬身', short: '瞬身', phase: 2, tags: ['gap', 'fast'], range: [180, 600], cd: 6.5, cost: 22, track: 8, recovery: 0.75,
        actions: [{ do: 'blink', at: 0.25, to: 'behind', dist: 70, fx: 'boltblink' },
          ...strike(0.75, 0.42, { shape: 'circle', r: 125, off: 80 }, { dmg: 132, posture: 45, kb: 460, fx: 'slam' })] },
      // 改編：依原作雷電能力（雷光充滿空間、以雷包圍奧丁）化為一列由天而降的落雷
      { id: 'thunder_rampage', name: '雷霆萬鈞', short: '萬雷', phase: 2, tags: ['ranged', 'aoe'], range: [150, 900], cd: 9, cost: 26, track: 3, recovery: 0.8,
        actions: [{ do: 'tele', at: 0, dur: 0.8, shape: 'rect', len: 950, w: 150, follow: true, hitIn: 0.85 },
          { do: 'erupt', at: 0.8, n: 7, start: 110, step: 130, interval: 0.09, r: 80, dmg: 79, posture: 22, kb: 280, fx: 'thunderstrike' }] },
    ],
    ultimate: {
      id: 'ult', name: '鬥神之雷槌', name2: '覺醒雷槌・蓋爾羅德', ult: true, range: [0, 400], track: 4, recovery: 1.0,
      actions: [ // 一階段：鬥神之雷槌（トールハンマー）——雷纏手套、上身後仰到幾乎倒地，再藉起身反動砸下
        { do: 'tele', at: 0.15, dur: 1.55, shape: 'circle', r: 200, off: 115, follow: true, lockBefore: 0.4, chargeFx: 'ultcast' },
        { do: 'hit', at: 1.7, shape: 'circle', r: 200, off: 115, dmg: 297, posture: 90, kb: 680, fx: { id: 'bigslam', scale: 1.5, el: 'lightning' } },
        { do: 'tele', at: 1.3, dur: 0.55, shape: 'ring', r0: 190, r: 420, off: 115, follow: true },
        { do: 'hit', at: 1.85, shape: 'ring', r0: 190, r: 420, off: 115, dmg: 77, posture: 20, kb: 380, fx: 'ring' },
      ],
      actions2: [ // 二階段：覺醒雷槌・蓋爾羅德——①全力擲出 ②迴旋返回（無法閃避：只能橫移離開直線）③接槌躍起、以累積的速度與離心力砸落
        { do: 'tele', at: 0.1, dur: 1.0, shape: 'rect', len: 900, w: 90, follow: true, lockBefore: 0.25, setMark: 'G1', chargeFx: 'ultcast' },
        { do: 'hit', at: 1.1, shape: 'rect', anchor: 'mark', mark: 'G1', len: 900, w: 90, dmg: 99, posture: 30, kb: 240, fx: 'thunderpath' },
        { do: 'tele', at: 1.15, dur: 0.85, shape: 'rect', anchor: 'mark', mark: 'G1', len: 900, w: 90 },
        { do: 'hit', at: 2.0, shape: 'rect', anchor: 'mark', mark: 'G1', len: 900, w: 90, dmg: 110, posture: 35, kb: 300, undodgeable: true, fx: { id: 'thunderpath', scale: 1.3 } },
        { do: 'tele', at: 2.0, dur: 1.3, shape: 'circle', r: 230, anchor: 'target', setMark: 'G2', follow: true, lockBefore: 0.55 },
        { do: 'hide', at: 2.1, fx: 'leap' },
        { do: 'land', at: 3.3, mark: 'G2' },
        { do: 'hit', at: 3.3, shape: 'circle', r: 230, anchor: 'mark', mark: 'G2', dmg: 341, posture: 100, kb: 760, fx: { id: 'bigslam', scale: 1.8 } },
        { do: 'tele', at: 3.0, dur: 0.45, shape: 'ring', r0: 220, r: 420, anchor: 'mark', mark: 'G2' },
        { do: 'hit', at: 3.45, shape: 'ring', r0: 220, r: 420, anchor: 'mark', mark: 'G2', dmg: 82, posture: 20, kb: 380, fx: { id: 'thunderstrike', scale: 2 } },
      ],
      desc: '一階段「鬥神之雷槌」：雷電纏上鐵手套、上身後仰到幾乎倒地，再藉起身的反動砸出落雷般的一擊，震波吹飛沙土；二階段「覺醒雷槌・蓋爾羅德」：將覺醒的雷槌全力擲出、迴旋返回（回程無法閃避，橫移離開直線）、接槌躍起，把累積的速度與離心力全數砸向對手，落雷隨之轟下。',
    },
  };

  BD.registerBoss(thor);
})(typeof window !== 'undefined' ? window : globalThis);
