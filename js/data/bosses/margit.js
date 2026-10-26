'use strict';
// Boss 資料：惡兆妖鬼 瑪爾基特（Margit, the Fell Omen，《艾爾登法環》史東薇爾城門前的惡兆，真身是半神蒙葛特）
// 考據：駝背巨大的老人，頭上亂長捲曲小角、灰白亂髮長鬚，披破爛黃褐毛皮斗篷、胸前綁粗金繩，斗篷下拖著長尾；
//   右手燒焦樹根般的黑色長拐杖（裡面藏著封住咒血的劍），左手隨時凝出聖屬性的黃金幻影武器（短刀 / 大槌 / 聖劍）。
//   招式取自原作招式表：拐杖連擊（第三下延遲）/ 延遲重砸 / 雙擲短刀接躍起下刺 / 短刀快斬 / 後撤擲刀 / 尾掃 / 躍起下刺；
//   二階段（原作約 60%，本作照全體規則 50%）召出黃金大槌，解鎖大槌躍擊、拐杖大槌連擊、聖劍五連迴旋、聖劍三連。
//   大招二階段揭開面紗，以真身「惡兆王蒙葛特」的咒血爆發與黃金劍雨收場。
// 被動「黃金幻影」在 js/engine/traits.js；考據見 docs/bosses/margit.md
(function (G) {
  const BD = G.BD, { D, strike } = BD.DataKit;
  const CANE = { el: 'physical' }; // 拐杖本身是木頭：物理塵土；幻影武器才是聖屬性（Boss 預設 fxEl）
  const dagger = (at, o) => Object.assign({ do: 'proj', at, n: 1, speed: 820, r: 12, dmg: 62, posture: 14, kb: 120, life: 1.1, homing: 1.6, kind: 'holydagger', deflect: true, fx: 'daggerform' }, o);

  // 躍起下刺：躍起消失 → 空中停頓鎖定落點 → 往下刺，落點炸開聖光十字
  function leapStab(at, r, dmg, up) {
    return [
      { do: 'tele', at: at - (up || 0.75), dur: up || 0.75, shape: 'circle', r, anchor: 'target', follow: true, lockBefore: 0.3, setMark: 'stabSpot' },
      { do: 'hide', at: at - (up || 0.75) + 0.1, fx: 'omenleap' },
      { do: 'land', at, mark: 'stabSpot' },
      { do: 'hit', at, shape: 'circle', r, anchor: 'mark', mark: 'stabSpot', dmg, posture: 46, kb: 460, fx: { id: 'omenstab', scale: r / 120 } },
    ];
  }
  // 黃金大槌躍擊：高高躍起，以金色幻影大槌砸地，外圈再一圈震波
  function hammerLeap(at, r, dmg, ring) {
    return [
      { do: 'tele', at: at - 0.9, dur: 0.9, shape: 'circle', r, anchor: 'target', follow: true, lockBefore: 0.35, setMark: 'hammerSpot' },
      { do: 'hide', at: at - 0.75, fx: 'omenleap' },
      { do: 'land', at, mark: 'hammerSpot' },
      { do: 'hit', at, shape: 'circle', r, anchor: 'mark', mark: 'hammerSpot', dmg, posture: 70, kb: 640, fx: { id: 'goldhammer', scale: r / 200 } },
      { do: 'tele', at: at - 0.15, dur: 0.35, shape: 'ring', r0: r - 20, r: r + ring, anchor: 'mark', mark: 'hammerSpot' },
      { do: 'hit', at: at + 0.2, shape: 'ring', r0: r - 20, r: r + ring, anchor: 'mark', mark: 'hammerSpot', dmg: Math.round(dmg * 0.3), posture: 20, kb: 360, fx: 'omenring' },
    ];
  }
  // 聖劍五連迴旋：每轉一圈往前推進一步
  function spin(t0, n, gap, r, dmg) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = +(t0 + i * gap).toFixed(3), last = i === n - 1;
      out.push({ do: 'dash', at: +(t - 0.1).toFixed(3), dist: 60, dur: 0.14 },
        ...strike(t, i ? 0.16 : 0.5, { shape: 'circle', r: last ? r + 30 : r }, { dmg: last ? dmg * 2 : dmg, posture: last ? 30 : 12, kb: last ? 420 : 140, fx: { id: 'swordwhirl', scale: last ? 1.4 : 1 } }));
    }
    return out;
  }

  const margit = {
    id: 'margit', name: '瑪爾基特', title: '惡兆妖鬼', archetype: '延遲重擊',
    desc: '在史東薇爾城門前攔住褪色者的惡兆。黑色拐杖大開大合、第三下總是慢半拍；左手隨時凝出黃金短刀、大槌與聖劍。斗篷底下藏著的，是半神「惡兆王」蒙葛特。',
    color: '#8a6a3a', color2: '#2a2018', glow: '#ffd34d', style: 'margit',
    rank: 'boss', stars: 4,
    radius: 44, maxHp: 2050, speed: 215, turn: 4.2, mass: 1.9, fxEl: 'holy', hurt: 'flesh',
    traits: ['phantomarms'], // 黃金幻影：每挨 3 下自動擲出一把黃金短刀
    stamina: { max: 130, regen: 28 }, posture: 190, dodgeCost: 24, dodgeSpeed: 460,
    ai: {
      prefRange: [100, 260], aggression: 0.7, dodge: 0.45, precision: 0.65, reaction: 0.28, strafe: 0.5, walk: 0.75,
      feint: 0.15, delay: 0.6, retreat: 0.15, punish: 0.65, nervous: 0.05, patience: 0.45, // 原作招牌：延遲出手騙翻滾
      // 距離條件要算進前一招的擊退（拐杖第三下 / 大槌會把人打飛到 350~450 外），否則連段接不起來
      combos: [
        { id: 'delay', name: '拐杖・延遲下砸', weight: 1.4, steps: [
          { skill: 'cane_combo' },
          { skill: 'delayed_slam', cancel: 0.4, branch: [
            { when: { rolled: true, rollDir: ['back'] }, chance: 0.6, do: 'switch', skill: 'leaping_stab' }, // 往後滾 → 躍起追刺
            { when: { rolled: true }, chance: 0.6, do: 'delay', hold: [0.3, 0.6] }, // 看到翻滾就再拖一拍
            { when: { dist: [0, 420] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'dagger', name: '短刀快斬・尾掃', weight: 1.0, steps: [
          { skill: 'dagger_slash' },
          { skill: 'tail_sweep', cancel: 0.3, branch: [
            { when: { dist: [0, 260] }, do: 'extend' },
            { when: { dist: [260, 700] }, do: 'switch', skill: 'leaping_stab' }, // 被拉開 → 躍刺
            { do: 'stop' }] }] },
        { id: 'retreat', name: '後撤擲刀・躍刺', phase: 1, weight: 1.1, steps: [
          { skill: 'dagger_retreat' },
          { skill: 'leaping_stab', cancel: 0.35, branch: [
            { when: { dist: [160, 700] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'toss', name: '雙擲躍刺・短刀追擊', phase: 1, weight: 1.2, steps: [
          { skill: 'dagger_toss' },
          { skill: 'dagger_slash', cancel: 0.35, branch: [
            { when: { rolled: true, rollDir: ['left', 'right', 'through'] }, do: 'switch', skill: 'tail_sweep' }, // 滾到身側 / 身後 → 尾掃
            { when: { dist: [0, 300] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'hammer', name: '拐杖大槌・聖劍迴旋', phase: 2, weight: 1.3, steps: [
          { skill: 'cane_hammer' },
          { skill: 'sword_spin', cancel: 0.4, branch: [
            { when: { rolled: true, rollDir: ['back'] }, chance: 0.6, do: 'switch', skill: 'hammer_leap' }, // 往後滾 → 大槌躍擊
            { when: { dist: [0, 460] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'sword', name: '聖劍三連・大槌躍擊', phase: 2, weight: 1.1, steps: [
          { skill: 'sword_combo' },
          { skill: 'hammer_leap', cancel: 0.4, branch: [
            { when: { dist: [0, 140] }, do: 'switch', skill: 'tail_sweep' }, // 貼身 → 尾掃甩開
            { when: { dist: [140, 700] }, do: 'extend' },
            { when: { rolled: true }, do: 'extend' },
            { do: 'stop' }] }] },
      ],
    },
    phase2: {
      speedMul: 1.12, dmgMul: 1.18, cdMul: 0.82,
      line: '哼，你的身手還算過得去。', aura: 'fire', fxEl: 'holy', transFx: { id: 'phantomforge', el: 'holy' },
      note: '召出黃金大槌；解鎖「黃金大槌・躍擊」「拐杖・大槌連擊」「聖劍五連迴旋」「聖劍三連」；雙擲短刀後的躍刺換成大槌躍擊，後撤時一次擲出三把短刀，大招揭開面紗、以真身惡兆王蒙葛特收場',
    },
    skills: [
      // 1. 拐杖連擊：左右兩記橫掃，第三下拐杖下砸刻意慢半拍（原作 Cane Swing ↻ ↺ → 延遲下砸）
      { id: 'cane_combo', name: '拐杖連擊', short: '杖擊', tags: ['melee', 'aoe'], range: [0, 250], cd: 3.6, cost: 22, track: 5, creep: 0.3, recovery: 0.6,
        actions: [...strike(0.45, 0.35, { shape: 'cone', r: 230, arc: 140 * D, angOff: 0.4 }, { dmg: 92, posture: 26, kb: 300, fx: { id: 'caneswing', ...CANE } }),
          ...strike(0.85, 0.3, { shape: 'cone', r: 230, arc: 140 * D, angOff: -0.35 }, { dmg: 98, posture: 28, kb: 320, fx: { id: 'caneswing', ...CANE } }),
          ...strike(1.75, 0.75, { shape: 'rect', len: 260, w: 72 }, { dmg: 140, posture: 40, kb: 380, fx: 'canesmash' })],
        actions2: [...strike(0.42, 0.33, { shape: 'cone', r: 240, arc: 145 * D, angOff: 0.4 }, { dmg: 92, posture: 26, kb: 300, fx: { id: 'caneswing', ...CANE } }),
          ...strike(0.8, 0.28, { shape: 'cone', r: 240, arc: 145 * D, angOff: -0.35 }, { dmg: 98, posture: 28, kb: 320, fx: { id: 'caneswing', ...CANE } }),
          ...strike(1.65, 0.72, { shape: 'rect', len: 280, w: 76 }, { dmg: 150, posture: 44, kb: 400, fx: { id: 'canesmash', scale: 1.15 } })] },
      // 2. 延遲重砸：雙手高舉拐杖，停頓很久才砸（原作 Delayed Overhead Strike / Windup Attack）
      { id: 'delayed_slam', name: '延遲重砸', short: '重砸', tags: ['melee', 'aoe'], range: [0, 280], cd: 4.8, cost: 26, track: 4, creep: 0.6, recovery: 0.8,
        actions: [...strike(1.25, 1.05, { shape: 'circle', r: 120, off: 150 }, { dmg: 170, posture: 50, kb: 450, fx: { id: 'omenslam', ...CANE } }),
          ...strike(1.4, 0.2, { shape: 'ring', r0: 100, r: 220, off: 150 }, { dmg: 50, posture: 16, kb: 300, fx: { id: 'omenring', ...CANE } })],
        actions2: [...strike(1.15, 1.0, { shape: 'circle', r: 130, off: 155 }, { dmg: 180, posture: 54, kb: 470, fx: { id: 'omenslam', scale: 1.15, ...CANE } }),
          ...strike(1.3, 0.2, { shape: 'ring', r0: 110, r: 250, off: 155 }, { dmg: 58, posture: 18, kb: 330, fx: { id: 'omenring', ...CANE } })] },
      // 3. 黃金短刀・雙擲：先後擲出兩把追蹤的黃金短刀，再躍起下刺（原作 Dagger Toss and Jump）；二階段換成大槌躍擊
      { id: 'dagger_toss', name: '黃金短刀・雙擲', short: '擲刀', tags: ['ranged', 'gap'], range: [220, 650], cd: 5.2, cost: 22, track: 6, recovery: 0.6,
        actions: [{ do: 'tele', at: 0.1, dur: 0.35, shape: 'rect', len: 620, w: 40, follow: true },
          dagger(0.45), dagger(0.85), ...leapStab(1.95, 115, 150)],
        actions2: [{ do: 'tele', at: 0.1, dur: 0.32, shape: 'rect', len: 620, w: 40, follow: true },
          dagger(0.42), dagger(0.78), ...hammerLeap(2.0, 175, 190, 130)] },
      // 4. 幻影短刀斬：左手黃金短刀快速兩斬（原作 Quick Dagger Slashes）
      { id: 'dagger_slash', name: '幻影短刀斬', short: '短刀', tags: ['melee', 'fast'], range: [0, 200], cd: 3.2, cost: 16, track: 8, creep: 0.4, recovery: 0.4,
        actions: [...strike(0.28, 0.22, { shape: 'cone', r: 190, arc: 120 * D, angOff: -0.3 }, { dmg: 70, posture: 20, kb: 220, fx: 'phantomslash' }),
          ...strike(0.58, 0.22, { shape: 'cone', r: 190, arc: 110 * D, angOff: 0.2 }, { dmg: 76, posture: 22, kb: 260, fx: 'phantomslash' })],
        actions2: [...strike(0.26, 0.2, { shape: 'cone', r: 200, arc: 120 * D, angOff: -0.3 }, { dmg: 70, posture: 20, kb: 220, fx: 'phantomslash' }),
          ...strike(0.54, 0.2, { shape: 'cone', r: 200, arc: 110 * D, angOff: 0.2 }, { dmg: 76, posture: 22, kb: 260, fx: 'phantomslash' }),
          ...strike(0.9, 0.26, { shape: 'rect', len: 230, w: 50 }, { dmg: 92, posture: 26, kb: 320, fx: 'phantomthrust' })] },
      // 5. 後撤擲刀：揮刀、往後跳、在空中擲出短刀（原作 Dagger Retreat）
      { id: 'dagger_retreat', name: '後撤擲刀', short: '後撤', tags: ['melee', 'defensive'], range: [0, 220], cd: 6, cost: 18, track: 7, recovery: 0.45,
        actions: [...strike(0.3, 0.24, { shape: 'cone', r: 200, arc: 140 * D }, { dmg: 74, posture: 20, kb: 320, fx: 'phantomslash' }),
          { do: 'dash', at: 0.42, dir: 'back', dist: 230, dur: 0.26, fx: 'omenbackstep' }, dagger(0.64, { homing: 1.2 })],
        actions2: [...strike(0.28, 0.22, { shape: 'cone', r: 210, arc: 140 * D }, { dmg: 74, posture: 20, kb: 320, fx: 'phantomslash' }),
          { do: 'dash', at: 0.4, dir: 'back', dist: 250, dur: 0.24, fx: 'omenbackstep' }, dagger(0.6, { n: 3, spread: 0.16, homing: 1.0 })] },
      // 6. 尾掃：扭身，長尾先掃背後、再隨轉身掃過前方（原作 Tail Swipe 只掃背後；這裡接著轉回正面）
      { id: 'tail_sweep', name: '尾掃', short: '尾掃', tags: ['melee', 'fast', 'defensive'], range: [0, 185], cd: 4.5, cost: 14, track: 9, creep: 0.5, recovery: 0.45,
        actions: [...strike(0.26, 0.2, { shape: 'cone', r: 180, arc: 180 * D, angOff: Math.PI }, { dmg: 72, posture: 34, kb: 460, fx: { id: 'tailwhip', ...CANE } }),
          ...strike(0.44, 0.16, { shape: 'cone', r: 180, arc: 160 * D }, { dmg: 66, posture: 30, kb: 420, fx: { id: 'tailwhip', ...CANE } })],
        actions2: [...strike(0.24, 0.18, { shape: 'cone', r: 195, arc: 180 * D, angOff: Math.PI }, { dmg: 78, posture: 36, kb: 480, fx: { id: 'tailwhip', ...CANE } }),
          ...strike(0.4, 0.15, { shape: 'cone', r: 195, arc: 160 * D }, { dmg: 72, posture: 32, kb: 440, fx: { id: 'tailwhip', ...CANE } })] },
      // 7. 躍起下刺：躍起、在空中停一下鎖定落點，再往下刺（原作 Leaping Stab）
      { id: 'leaping_stab', name: '躍起下刺', short: '躍刺', tags: ['gap', 'melee'], range: [160, 700], cd: 5.5, cost: 24, track: 5, recovery: 0.7,
        actions: leapStab(1.15, 125, 165, 0.95),
        actions2: leapStab(1.05, 135, 175, 0.88) },
      // —— 二階段專屬（原作招式表第二階段）——
      // 8. 黃金大槌・躍擊：高高躍起，以幻影大槌砸地（Hammer Leap，換階段的演出也是這招）
      { id: 'hammer_leap', name: '黃金大槌・躍擊', short: '大槌', phase: 2, tags: ['gap', 'aoe', 'melee'], range: [0, 520], cd: 7, cost: 30, track: 5, recovery: 1.0,
        actions: hammerLeap(1.1, 200, 220, 160) },
      // 9. 拐杖・大槌連擊：拐杖一揮，接延遲的大槌下砸（Cane and Hammer Slash Combo / Hammer Slam）
      { id: 'cane_hammer', name: '拐杖・大槌連擊', short: '杖槌', phase: 2, tags: ['melee', 'aoe'], range: [0, 270], cd: 5.6, cost: 28, track: 5, creep: 0.3, recovery: 0.8,
        actions: [...strike(0.42, 0.32, { shape: 'cone', r: 235, arc: 150 * D, angOff: 0.4 }, { dmg: 96, posture: 28, kb: 320, fx: { id: 'caneswing', ...CANE } }),
          ...strike(1.35, 0.62, { shape: 'circle', r: 140, off: 165 }, { dmg: 190, posture: 58, kb: 500, fx: 'hammerslam' }),
          ...strike(1.5, 0.2, { shape: 'ring', r0: 120, r: 260, off: 165 }, { dmg: 56, posture: 16, kb: 320, fx: 'omenring' })] },
      // 10. 聖劍五連迴旋：召出黃金聖劍，邊推進邊連轉五圈（Quintuple Spin）
      { id: 'sword_spin', name: '聖劍五連迴旋', short: '迴旋', phase: 2, tags: ['melee', 'aoe'], range: [0, 300], cd: 7.5, cost: 32, track: 3, creep: 0.3, recovery: 0.9,
        actions: spin(0.6, 5, 0.3, 175, 50) },
      // 11. 聖劍三連：橫斬、回斬、往地上一刺（Sword and Stab Three-Hit String）
      { id: 'sword_combo', name: '聖劍三連', short: '三連', phase: 2, tags: ['melee'], range: [0, 300], cd: 5, cost: 24, track: 6, creep: 0.3, recovery: 0.65,
        actions: [...strike(0.4, 0.3, { shape: 'cone', r: 260, arc: 150 * D, angOff: 0.4 }, { dmg: 104, posture: 28, kb: 340, fx: 'swordcleave' }),
          ...strike(0.78, 0.26, { shape: 'cone', r: 260, arc: 150 * D, angOff: -0.4 }, { dmg: 110, posture: 30, kb: 360, fx: 'swordcleave' }),
          ...strike(1.3, 0.42, { shape: 'rect', len: 300, w: 64 }, { dmg: 150, posture: 44, kb: 420, fx: { id: 'phantomthrust', scale: 1.3 } })] },
    ],
    // 大招（改編）：一階段雙輪扇形擲刀 → 躍起下刺 → 十字斬；二階段斗篷撕裂露出真身蒙葛特：咒血爆發 → 黃金劍雨 → 大槌躍擊
    ultimate: {
      id: 'ult', name: '惡兆妖鬼・熄滅之火', name2: '揭開面紗・惡兆王蒙葛特', ult: true, range: [0, 900], track: 4, recovery: 1.0,
      actions: [
        { do: 'tele', at: 0.2, dur: 0.7, shape: 'cone', r: 650, arc: 60 * D, follow: true, chargeFx: 'ultcast' },
        dagger(0.9, { n: 5, spread: 0.2, speed: 900, dmg: 58, homing: 0.8 }),
        dagger(1.25, { n: 4, spread: 0.26, speed: 900, dmg: 58, homing: 0.8 }),
        ...leapStab(2.4, 150, 170, 0.85),
        ...strike(3.05, 0.42, { shape: 'cone', r: 320, arc: 200 * D, angOff: 0.45 }, { dmg: 120, posture: 36, kb: 380, fx: { id: 'swordcleave', scale: 1.6 } }),
        ...strike(3.25, 0.2, { shape: 'cone', r: 320, arc: 200 * D, angOff: -0.45 }, { dmg: 130, posture: 40, kb: 480, fx: { id: 'swordcleave', scale: 1.7 } }),
      ],
      actions2: [
        { do: 'tele', at: 0.2, dur: 1.0, shape: 'circle', r: 270, follow: true, chargeFx: 'omenreveal' },
        { do: 'hit', at: 1.2, shape: 'circle', r: 270, dmg: 130, posture: 40, kb: 520, status: { id: 'bleed', stacks: 45 }, fx: 'cursedblood', fxEl: 'blood' },
        { do: 'rain', at: 1.5, n: 16, dur: 1.8, area: 420, flight: 0.75, r: 85, dmg: 60, posture: 16, kb: 160, kind: 'holysword', fx: 'swordfall', teleColor: '#ffd34d' },
        ...hammerLeap(4.3, 240, 230, 200),
      ],
      desc: '一階段「熄滅之火」：擲出兩輪扇形黃金短刀，躍起下刺，落地接一記黃金聖劍十字斬；二階段「揭開面紗・惡兆王蒙葛特」：斗篷撕裂露出真身，咒血爆發（流血）、天降黃金劍雨，最後高高躍起以黃金大槌砸地。',
    },
  };

  BD.registerBoss(margit);
})(typeof window !== 'undefined' ? window : globalThis);
