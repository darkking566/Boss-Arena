'use strict';
// Boss 資料：大樹守衛（Tree Sentinel，《艾爾登法環》寧姆格福「第一步」賜福外巡邏的黃金重騎士）
// 考據：騎著披黃金馬鎧、黑色羽葉裙甲的戰馬；右手黃金戟（聖屬性）、左手刻著黃金樹根紋的黃金樹大盾；
//   招式取自原作招式表：側揮連斬 / 人立突刺 / 人立重砸 / 馬蹄踐踏 / 側身衝撞 / 騎兵衝鋒 / 躍馬斬 / 迴旋大掃；
//   大盾戰技「黃金的返報」吹散飛來的魔法並回以黃金光束；黃金戟戰技「黃金誓言」強化自身。
//   二階段（原作 60% 換階段，本作照全體規則 50%）解鎖盾擊、大盾碾壓與轉身 180° 的回馬連掃。
// 被動「黃金樹大盾」在 js/engine/traits.js、返報光束在 js/engine/actions/wind.js（借用風牆的投射物攔截）；考據見 docs/bosses/treesentinel.md
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;
  const HORSE = { el: 'physical' }; // 戰馬本身的踢、撞：物理塵土

  // 大盾碾壓：戰馬躍起（短暫消失在空中）→ 落地以大盾砸地，外圈再炸一圈震波
  function crush(at, r, dmg, ring) {
    return [
      { do: 'tele', at: at - 0.85, dur: 0.85, shape: 'circle', r, anchor: 'target', follow: true, lockBefore: 0.35, setMark: 'crushSpot' },
      { do: 'hide', at: at - 0.7, fx: 'leap' },
      { do: 'land', at, mark: 'crushSpot' },
      { do: 'hit', at, shape: 'circle', r, anchor: 'mark', mark: 'crushSpot', dmg, posture: 80, kb: 680, fx: { id: 'shieldcrush', scale: r / 230 } },
      { do: 'tele', at: at - 0.15, dur: 0.35, shape: 'ring', r0: r - 20, r: r + ring, anchor: 'mark', mark: 'crushSpot' },
      { do: 'hit', at: at + 0.2, shape: 'ring', r0: r - 20, r: r + ring, anchor: 'mark', mark: 'crushSpot', dmg: Math.round(dmg * 0.32), posture: 22, kb: 380, fx: 'ring' },
    ];
  }

  const sentinel = {
    id: 'treesentinel', name: '大樹守衛', title: '黃金樹的活壁壘', archetype: '黃金重騎',
    desc: '侍奉黃金樹的重裝騎士團，被視為「黃金樹的活壁壘」。黃金戟大開大合、戰馬人立踐踏、衝鋒時整片大地都在震動；黃金樹大盾會把飛來的魔法化為黃金光束奉還。',
    color: '#c9a24a', color2: '#2a2218', glow: '#ffe27a', style: 'treesentinel',
    radius: 50, maxHp: 2450, speed: 225, turn: 3.6, mass: 2.2, fxEl: 'holy', hurt: 'flesh',
    traits: ['sentinel'], // 黃金樹大盾：盾側（左前方）來的攻擊減傷
    stamina: { max: 130, regen: 26 }, posture: 210, dodgeCost: 26, dodgeSpeed: 430,
    ai: {
      prefRange: [110, 260], aggression: 0.75, dodge: 0.3, precision: 0.65, reaction: 0.3, strafe: 0.45, walk: 0.8,
      feint: 0.05, delay: 0.4, retreat: 0.05, punish: 0.6, nervous: 0.05, patience: 0.4,
      windWall: 0.8, // 飛來的投射物將命中前舉起黃金樹大盾（黃金的返報）
      combos: [
        { id: 'sweep', name: '側揮・回身突刺', weight: 1.3, steps: [
          { skill: 'side_swing' },
          { skill: 'halberd_stab', cancel: 0.35, branch: [
            { when: { dist: [0, 320] }, do: 'extend' },
            { chance: 0.4, do: 'delay', hold: [0.3, 0.55] }, // 原作人立後停頓，騙翻滾
            { do: 'stop' }] }] },
        { id: 'charge', name: '衝鋒・人立重砸', weight: 1.1, steps: [
          { skill: 'cavalry_charge' },
          { skill: 'rearing_slam', cancel: 0.4, branch: [
            { when: { dist: [0, 280] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'hug', name: '踐踏・迴旋大掃', phase: 1, weight: 1.0, steps: [
          { skill: 'hoof_stomp' },
          { skill: 'twirl_swing', cancel: 0.35, branch: [
            { when: { rolled: true }, do: 'extend' }, // 原作：退開時接迴旋大掃
            { when: { dist: [0, 330] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'shieldwall', name: '回馬盾擊', phase: 2, weight: 1.4, steps: [
          { skill: 'turn_sweep' },
          { skill: 'shield_crush', cancel: 0.4, branch: [
            { when: { dist: [120, 520] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'bashcrush', name: '盾擊・碾壓', phase: 2, weight: 1.1, steps: [
          { skill: 'shield_bash' },
          { skill: 'rearing_slam', cancel: 0.35, branch: [
            { when: { dist: [0, 280] }, do: 'extend' },
            { do: 'stop' }] }] },
      ],
    },
    phase2: {
      speedMul: 1.12, dmgMul: 1.18, cdMul: 0.82,
      line: '（高舉黃金戟，向黃金樹立誓）', aura: 'fire', fxEl: 'holy', transFx: { id: 'goldvow', el: 'holy' },
      note: '黃金誓言加身；解鎖「黃金樹大盾・盾擊」「大盾碾壓」「回馬連掃」；側揮多一擊、衝鋒更遠，黃金的返報光束更強，大招追加聖戟光柱',
    },
    skills: [
      // 1. 側揮連斬：黃金戟往右側左右來回橫掃（原作 Side Swing ↻ ↺）
      { id: 'side_swing', name: '側揮連斬', short: '側揮', tags: ['melee', 'aoe'], range: [0, 245], cd: 3.4, cost: 22, track: 5, creep: 0.3, recovery: 0.55,
        actions: [...strike(0.5, 0.4, { shape: 'cone', r: 240, arc: 150 * D, angOff: 0.45 }, { dmg: 108, posture: 30, kb: 360, fx: 'cleave' }),
          ...strike(0.95, 0.3, { shape: 'cone', r: 240, arc: 150 * D, angOff: -0.3 }, { dmg: 118, posture: 32, kb: 400, fx: 'cleave' })],
        actions2: [...strike(0.45, 0.36, { shape: 'cone', r: 255, arc: 155 * D, angOff: 0.45 }, { dmg: 108, posture: 30, kb: 360, fx: 'cleave' }),
          ...strike(0.85, 0.28, { shape: 'cone', r: 255, arc: 155 * D, angOff: -0.3 }, { dmg: 118, posture: 32, kb: 400, fx: 'cleave' }),
          ...strike(1.25, 0.3, { shape: 'cone', r: 265, arc: 160 * D, angOff: 0.35 }, { dmg: 128, posture: 36, kb: 440, fx: { id: 'cleave', scale: 1.2 } })] },
      // 2. 人立突刺：戰馬前蹄抬起，黃金戟由上往前直刺（原作 Rearing Stab / Stab）
      { id: 'halberd_stab', name: '人立突刺', short: '突刺', tags: ['melee'], range: [0, 340], cd: 3.8, cost: 20, track: 6, creep: 0.2, recovery: 0.55,
        actions: strike(0.62, 0.48, { shape: 'rect', len: 340, w: 66 }, { dmg: 138, posture: 38, kb: 380, fx: { id: 'thrust', scale: 1.3 } }),
        actions2: strike(0.56, 0.44, { shape: 'rect', len: 380, w: 72 }, { dmg: 150, posture: 42, kb: 420, fx: { id: 'thrust', scale: 1.4 } }) },
      // 3. 人立重砸：戰馬人立、雙手高舉黃金戟停頓，再朝前方砸出聖光震波（原作 Rearing Slam）
      { id: 'rearing_slam', name: '人立重砸', short: '重砸', tags: ['melee', 'aoe'], range: [0, 290], cd: 4.6, cost: 26, track: 5, recovery: 0.7,
        actions: [...strike(0.85, 0.65, { shape: 'circle', r: 125, off: 155 }, { dmg: 165, posture: 48, kb: 440, fx: { id: 'bigslam', scale: 0.9 } }),
          ...strike(1.0, 0.2, { shape: 'ring', r0: 110, r: 230, off: 155 }, { dmg: 52, posture: 16, kb: 300, fx: 'ring' })],
        actions2: [...strike(0.78, 0.6, { shape: 'circle', r: 135, off: 160 }, { dmg: 178, posture: 52, kb: 470, fx: { id: 'bigslam', scale: 1.05 } }),
          ...strike(0.93, 0.2, { shape: 'ring', r0: 120, r: 270, off: 160 }, { dmg: 60, posture: 18, kb: 340, fx: 'ring' })] },
      // 4. 馬蹄踐踏：戰馬人立後前蹄重踏（原作 Hoof Attack，唯一由馬蹄造成傷害的招式），把貼身的人踏飛
      { id: 'hoof_stomp', name: '馬蹄踐踏', short: '踐踏', tags: ['melee', 'fast', 'defensive'], range: [0, 165], cd: 4.4, cost: 18, track: 7, recovery: 0.45,
        actions: strike(0.44, 0.34, { shape: 'circle', r: 118, off: 70 }, { dmg: 98, posture: 40, kb: 500, fx: { id: 'slam', ...HORSE } }),
        actions2: strike(0.4, 0.3, { shape: 'circle', r: 128, off: 72 }, { dmg: 108, posture: 44, kb: 540, fx: { id: 'slam', scale: 1.15, ...HORSE } }) },
      // 5. 側身衝撞：戰馬猛然往右甩身撞人（原作 Horse Bash，又快又難躲，別待在他右側）
      { id: 'horse_bash', name: '側身衝撞', short: '甩撞', tags: ['melee', 'fast'], range: [0, 175], cd: 4.0, cost: 16, track: 9, recovery: 0.4,
        actions: strike(0.3, 0.22, { shape: 'circle', r: 108, off: 70, angOff: 1.25 }, { dmg: 86, posture: 46, kb: 540, fx: { id: 'impact', scale: 1.2, ...HORSE } }),
        actions2: strike(0.27, 0.2, { shape: 'circle', r: 118, off: 74, angOff: 1.25 }, { dmg: 95, posture: 50, kb: 580, fx: { id: 'impact', scale: 1.3, ...HORSE } }) },
      // 6. 騎兵衝鋒：遠處策馬直衝，擦身時順勢揮戟（原作 Charging Attack）
      { id: 'cavalry_charge', name: '騎兵衝鋒', short: '衝鋒', tags: ['gap'], range: [200, 720], cd: 5.6, cost: 24, track: 5, recovery: 0.6,
        actions: [...dashStrike(0.7, 0.58, 560, 112, 0.45, { dmg: 148, posture: 40, kb: 440 }, { fx: 'hoofcharge' }),
          ...strike(1.32, 0.24, { shape: 'cone', r: 240, arc: 160 * D, angOff: 0.4 }, { dmg: 112, posture: 30, kb: 380, fx: 'cleave' })],
        actions2: [...dashStrike(0.64, 0.54, 660, 120, 0.48, { dmg: 160, posture: 44, kb: 470 }, { fx: 'hoofcharge' }),
          ...strike(1.28, 0.24, { shape: 'cone', r: 255, arc: 165 * D, angOff: 0.4 }, { dmg: 122, posture: 32, kb: 410, fx: { id: 'cleave', scale: 1.2 } })] },
      // 7. 躍馬斬：中距離縱馬一躍，邊落地邊揮戟（原作 Leap Attack）
      { id: 'leap_attack', name: '躍馬斬', short: '躍斬', tags: ['gap', 'melee'], range: [150, 430], cd: 4.8, cost: 24, track: 6, recovery: 0.6,
        actions: [...dashStrike(0.55, 0.45, 340, 104, 0.3, { dmg: 135, posture: 38, kb: 400 }, { fx: 'leap' }),
          ...strike(0.98, 0.24, { shape: 'cone', r: 225, arc: 145 * D, angOff: 0.35 }, { dmg: 104, posture: 28, kb: 340, fx: 'cleave' })],
        actions2: [...dashStrike(0.5, 0.42, 400, 110, 0.3, { dmg: 146, posture: 42, kb: 430 }, { fx: 'leap' }),
          ...strike(0.92, 0.24, { shape: 'cone', r: 240, arc: 150 * D, angOff: 0.35 }, { dmg: 112, posture: 30, kb: 360, fx: { id: 'cleave', scale: 1.15 } })] },
      // 8. 迴旋大掃：轉身人立，黃金戟逆時針掃出極長的大弧（原作 Twirling Swing，專抓往後退的人）
      { id: 'twirl_swing', name: '迴旋大掃', short: '迴掃', tags: ['melee', 'aoe'], range: [0, 335], cd: 5.4, cost: 28, track: 4, recovery: 0.75,
        actions: strike(0.95, 0.72, { shape: 'cone', r: 330, arc: 250 * D }, { dmg: 172, posture: 50, kb: 520, fx: { id: 'cleave', scale: 1.45 } }),
        actions2: strike(0.88, 0.66, { shape: 'cone', r: 355, arc: 270 * D }, { dmg: 186, posture: 54, kb: 560, fx: { id: 'cleave', scale: 1.55 } }) },
      // 9. 黃金誓言：高舉黃金戟向黃金樹立誓，震開周圍並強化自身（黃金戟的戰技 Golden Vow）
      { id: 'golden_vow', name: '黃金誓言', short: '誓言', tags: ['defensive'], range: [0, 320], cd: 15, cost: 12, track: 8, recovery: 0.5,
        actions: [...strike(0.7, 0.55, { shape: 'circle', r: 200 }, { dmg: 45, posture: 30, kb: 420, fx: { id: 'wardnova', scale: 1.1 } }),
          { do: 'status', at: 0.7, id: 'goldenvow', fx: 'goldvow' }],
        actions2: [...strike(0.62, 0.5, { shape: 'circle', r: 230 }, { dmg: 55, posture: 36, kb: 460, fx: { id: 'wardnova', scale: 1.25 } }),
          { do: 'status', at: 0.62, id: 'goldenvow', fx: 'goldvow' }] },
      // 10. 黃金的返報：舉起黃金樹大盾（黃金樹大盾的戰技），擋下飛來的投射物並以追蹤的黃金光束反擊；只由 AI 的閃避計畫施放
      { id: 'golden_retaliation', name: '黃金的返報', short: '返報', tags: ['defensive', 'windwall'], range: [0, 900], cd: 7, cost: 12, recovery: 0.35,
        actions: [{ do: 'windwall', at: 0.1, w: 190, life: 1.1, drift: 0, retaliate: { dmg: 150, posture: 40 } }],
        actions2: [{ do: 'windwall', at: 0.08, w: 220, life: 1.3, drift: 0, retaliate: { dmg: 175, posture: 48 } }] },
      // —— 二階段專屬（原作招式表第二階段）——
      // 11. 黃金樹大盾・盾擊：舉盾猛撞（Shield Bash），削架勢極重
      { id: 'shield_bash', name: '黃金樹大盾・盾擊', short: '盾擊', phase: 2, tags: ['melee', 'fast'], range: [0, 190], cd: 4.2, cost: 18, track: 8, creep: 0.3, recovery: 0.45,
        actions: strike(0.32, 0.25, { shape: 'rect', len: 185, w: 130, angOff: -0.25 }, { dmg: 104, posture: 78, kb: 500, fx: { id: 'guardbash', scale: 1.2 } }) },
      // 12. 大盾碾壓：躍起後以大盾砸地，震波範圍比看起來大得多，收招很長（Shield Crush）
      { id: 'shield_crush', name: '大盾碾壓', short: '碾壓', phase: 2, tags: ['gap', 'aoe', 'melee'], range: [0, 500], cd: 7.5, cost: 32, track: 5, recovery: 1.15,
        actions: crush(1.0, 230, 245, 170) },
      // 13. 回馬連掃：連續轉身 180° 的兩記側揮，接盾擊（招式表第二階段 Side Swing Turning 180° → Shield Bash）
      { id: 'turn_sweep', name: '回馬連掃', short: '回馬', phase: 2, tags: ['melee', 'aoe'], range: [0, 260], cd: 6.2, cost: 30, track: 6, recovery: 0.7,
        actions: [...strike(0.45, 0.35, { shape: 'cone', r: 250, arc: 170 * D, angOff: Math.PI }, { dmg: 112, posture: 30, kb: 380, fx: 'cleave' }),
          ...strike(0.85, 0.3, { shape: 'cone', r: 255, arc: 170 * D }, { dmg: 122, posture: 32, kb: 400, fx: { id: 'cleave', scale: 1.2 } }),
          ...strike(1.25, 0.28, { shape: 'rect', len: 190, w: 130, angOff: -0.25 }, { dmg: 108, posture: 70, kb: 520, fx: { id: 'guardbash', scale: 1.2 } })] },
    ],
    // 大招（改編）：黃金誓言 → 兩趟騎兵衝鋒 → 躍起大盾碾壓，落點長出光之黃金樹；二階段落地後再沿面向拔起一排聖戟光柱
    ultimate: {
      id: 'ult', name: '黃金樹的活壁壘', name2: '黃金樹的活壁壘・聖戟天罰', ult: true, range: [0, 900], track: 4, recovery: 1.1,
      actions: [
        { do: 'status', at: 0.3, id: 'goldenvow', fx: 'goldvow' },
        { do: 'tele', at: 0.3, dur: 0.9, shape: 'rect', len: 640, w: 120, follow: true, lockBefore: 0.25, chargeFx: 'ultcast' },
        { do: 'dash', at: 1.2, dist: 640, dur: 0.42, hit: { dmg: 120, posture: 34, kb: 420 }, fx: 'hoofcharge' },
        { do: 'tele', at: 1.75, dur: 0.5, shape: 'rect', len: 640, w: 120, follow: true, lockBefore: 0.15 },
        { do: 'dash', at: 2.25, dist: 640, dur: 0.42, hit: { dmg: 120, posture: 34, kb: 420 }, fx: 'hoofcharge' },
        ...crush(3.6, 260, 240, 200).map((a) => (a.fx && a.fx.id === 'shieldcrush' ? Object.assign({}, a, { fx: { id: 'erdtreeblast', scale: 1.2 } }) : a)),
      ],
      actions2: [
        { do: 'status', at: 0.25, id: 'goldenvow', fx: 'goldvow' },
        { do: 'tele', at: 0.25, dur: 0.85, shape: 'rect', len: 700, w: 130, follow: true, lockBefore: 0.25, chargeFx: 'ultcast' },
        { do: 'dash', at: 1.1, dist: 700, dur: 0.42, hit: { dmg: 130, posture: 38, kb: 440 }, fx: 'hoofcharge' },
        { do: 'tele', at: 1.6, dur: 0.48, shape: 'rect', len: 700, w: 130, follow: true, lockBefore: 0.15 },
        { do: 'dash', at: 2.08, dist: 700, dur: 0.42, hit: { dmg: 130, posture: 38, kb: 440 }, fx: 'hoofcharge' },
        ...crush(3.4, 270, 255, 210).map((a) => (a.fx && a.fx.id === 'shieldcrush' ? Object.assign({}, a, { fx: { id: 'erdtreeblast', scale: 1.3 } }) : a)),
        { do: 'tele', at: 3.55, dur: 0.4, shape: 'rect', len: 1100, w: 150 },
        { do: 'erupt', at: 3.95, n: 8, interval: 0.09, start: 140, step: 125, r: 95, dmg: 70, posture: 20, kb: 220, fx: 'holylance' },
      ],
      desc: '一階段「黃金樹的活壁壘」：立下黃金誓言，策馬來回衝鋒兩趟，再躍起以大盾碾壓，落點長出一株光之黃金樹；二階段「聖戟天罰」：落地後沿面向拔起一排聖戟光柱。',
    },
  };

  BD.registerBoss(sentinel);
})(typeof window !== 'undefined' ? window : globalThis);
