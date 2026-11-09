'use strict';
// Boss 資料：神皮雙人組（《艾爾登法環》Godskin Duo，遺落法魯姆．亞茲拉）：神皮使徒（godskinduo，選角用這張）與神皮貴人（godskinnoble，hidden）。
// 使徒持長柄鐮刃、使出黑焰；貴人圓胖、持細劍。招式名取自原作攻略的常用譯名（黑焰、神皮之輪、黑焰龍捲…），數值為本作改編。
// 一般對戰：def.partner 讓 World 把貴人當成第二位完整 Boss 同隊出場，兩人各自的 AI 與招式；一個倒下，另一個把他喚醒（trait godskin，js/engine/minions/godskinduo.js）。
// 訓練場、獵魂、4v1、小兵潮一邊只能一位 Boss：使徒單獨出場，貴人退回召喚物版本。
// 考據與圖片：docs/bosses/godskinduo.md、docs/research/godskinduo/。
(function (G) {
  const BD = G.BD, { D, strike, dashStrike, flurry } = BD.DataKit;
  const BF = { id: 'blackflame', dur: 4 }, FLAME = { fxEl: 'blackflame', status: BF }, PHYS = { fxEl: 'physical' };
  const POOL = (r, dur, dps) => ({ kind: 'gsflame', r, dur, dps, delay: 0.3, status: { id: 'blackflame', dur: 2 } });
  // 對貴人下令：tele 預警秒數、shape 與 len/w/r/arc、go 前進距離、dash 位移秒數
  // 神皮碾壓：鎖定落點、躍起（hide）、在落點砸下（land + hit）
  const crush = (at, up, r, dmg) => [{ do: 'tele', at: at - up - 0.05, dur: up + 0.05, shape: 'circle', r, anchor: 'target', follow: true, lockBefore: 0.35, setMark: 'C', chargeFx: false },
    { do: 'hide', at: at - up + 0.1, fx: 'gsslam' }, { do: 'land', at, mark: 'C' },
    { do: 'hit', at, shape: 'circle', r, anchor: 'mark', mark: 'C', dmg, posture: 34, kb: 460, ...FLAME, fx: 'gscrusher', zone: POOL(r * 0.8, 3, 10) }];
  const bolt = (at, dmg, extra) => ({ do: 'proj', at, n: 1, speed: 1100, r: 16, dmg, posture: 10, kb: 90, life: 0.8, kind: 'gsflame', fx: 'gsflamebolt', status: BF, ...extra });
  const sweep = (at, n, r, dmg) => Array.from({ length: n }, (_, i) => ({ do: 'hit', at: +(at + i * 0.2).toFixed(3), shape: 'cone', r, arc: 46 * D,
    angOff: (72 - i * 144 / (n - 1)) * D, dmg, posture: 8, kb: 90, multi: true, ...FLAME, fx: 'gssweep' }));
  const rings = (at, radii, dmg, step) => radii.map((r, i) => ({ do: 'hit', at: +(at + i * step).toFixed(3), shape: i ? 'ring' : 'circle', r0: i ? radii[i - 1] - 20 : undefined, r,
    dmg: dmg + i * 4, posture: 14, kb: 180, multi: true, ...FLAME, fx: i ? 'gsburst' : 'gstornado' }));

  BD.registerBoss({
    id: 'godskinduo', name: '神皮雙人組', title: '使徒與貴人', archetype: '黑焰雙人組・一個倒下，另一個喚醒他',
    desc: '遺落法魯姆．亞茲拉的神皮雙人組。使徒是披著縫合人皮長袍的細瘦身影，手持兩端一鐮一刃的長柄武器，用能殺神的黑焰遠近通吃；貴人是最古老的使徒，圓胖的軀幹下露出細劍與長尾，貼著獵物腹撞、柄擊、突刺。兩人是各自行動的兩位 Boss，各有生命：打倒其中一個，十幾秒後另一個會把他喚醒（每次喚醒的生命越來越少），兩個都倒下才算贏。半血後使徒解開上身的皮、貴人撕下腹皮，黑焰龍捲、神皮之輪與神皮碾壓接連而來。',
    color: '#e4dccd', color2: '#2a2431', glow: '#a39fe0', style: 'godskinduo', rank: 'boss', stars: 4, partner: 'godskinnoble', unitName: '神皮使徒',
    // 二打一所以生命低；單獨出場（訓練場、獵魂、4v1，多為沉重）時 ×soloHpMul，沉重約 3820，與改版前相同
    radius: 26, maxHp: 1300, soloHpMul: 2.1, speed: 245, turn: 8, mass: 1, fxEl: 'blackflame', hurt: 'flesh', traits: ['godskin'],
    stamina: { max: 105, regen: 32 }, posture: 115, dodgeCost: 18, dodgeSpeed: 560,
    ai: { prefRange: [150, 400], aggression: 0.6, dodge: 0.45, precision: 0.7, reaction: 0.24, strafe: 0.7, walk: 0.65,
      feint: 0.1, delay: 0.3, retreat: 0.25, punish: 0.65, nervous: 0.08, patience: 0.4,
      combos: [
        { id: 'flameritual', name: '黑焰・儀式', phase: 1, weight: 1.2, steps: [{ skill: 'flame' }, { skill: 'ritual', cancel: 0.3, branch: [{ when: { dist: [140, 760] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'stabspin', name: '刺斬・旋舞', phase: 1, weight: 1.1, steps: [{ skill: 'stabslash' }, { skill: 'spin', cancel: 0.3, branch: [{ when: { dist: [0, 300] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'leappull', name: '躍斬・鉤刺', phase: 1, weight: 1.1, steps: [{ skill: 'leapslash' }, { skill: 'stabpull', cancel: 0.35, branch: [{ when: { landed: true }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'tornadoplunge', name: '龍捲・倒插', phase: 2, weight: 1.2, steps: [{ skill: 'tornado' }, { skill: 'plunge', cancel: 0.4, branch: [{ when: { dist: [0, 700] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'plungefling', name: '倒插・伸展', phase: 2, weight: 1.1, steps: [{ skill: 'plunge' }, { skill: 'fling', cancel: 0.35, branch: [{ when: { landed: true }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'flingsweep', name: '伸展・橫掃', phase: 2, weight: 1.1, steps: [{ skill: 'fling' }, { skill: 'flamesweep', cancel: 0.35, branch: [{ when: { dist: [0, 500] }, do: 'extend' }, { do: 'stop' }] }] },
      ] },
    phase2: { speedMul: 1.1, dmgMul: 1.15, cdMul: 0.85, fxEl: 'blackflame', transFx: { id: 'gsawaken', el: 'blackflame' }, transDur: 2.4,
      line: '——使徒交叉雙臂、浮到半空，解開上身的皮。',
      note: '半血：使徒解開上身的皮、攻擊範圍變長；解鎖皮囊伸展、倒插橫掃、黑焰龍捲、黑焰橫掃；大招多一圈黑焰，並立刻喚醒倒下的貴人' },
    skills: [
      // 使徒（本體）
      { id: 'flame', name: '黑焰', short: '黑焰', tags: ['ranged'], range: [150, 760], cd: 5, cost: 16, track: 7, recovery: 0.5,
        actions: [{ do: 'tele', at: 0, dur: 0.5, shape: 'rect', len: 720, w: 40, follow: true, lockBefore: 0.2 }, bolt(0.5, 46)],
        actions2: [{ do: 'tele', at: 0, dur: 0.5, shape: 'rect', len: 760, w: 80, follow: true, lockBefore: 0.2 },
          bolt(0.5, 38, { n: 3, spread: 0.3 })] },
      { id: 'stabpull', name: '鉤刺回拉', short: '鉤刺', tags: ['melee'], range: [0, 320], cd: 4, cost: 18, track: 6, recovery: 0.5,
        actions: [...strike(0.5, 0.45, { shape: 'rect', len: 290, w: 80 }, { dmg: 78, posture: 20, kb: 120, heal: 0.12, ...PHYS, fx: 'gsscythe' }),
          ...strike(1.05, 0.3, { shape: 'cone', r: 230, arc: 95 * D }, { dmg: 52, posture: 14, kb: 160, multi: true, ...PHYS, fx: 'gsscythe' })] },
      { id: 'spin', name: '旋舞長刃', short: '旋刃', tags: ['melee', 'aoe'], range: [0, 260], cd: 6, cost: 22, track: 4, recovery: 0.6,
        actions: [{ do: 'tele', at: 0, dur: 0.4, shape: 'circle', r: 180, follow: true }, { do: 'dash', at: 0.35, dist: 170, dur: 0.85 },
          ...[0.5, 0.75, 1, 1.25].map((t) => ({ do: 'hit', at: t, shape: 'circle', r: 180, dmg: 34, posture: 8, kb: 120, multi: true, ...PHYS, fx: 'gsscythe', status: BF }))] },
      { id: 'stabslash', name: '刺・旋・斬', short: '刺斬', tags: ['melee'], range: [0, 330], cd: 6.5, cost: 24, track: 6, recovery: 0.6,
        actions: [...strike(0.5, 0.4, { shape: 'rect', len: 320, w: 70 }, { dmg: 70, posture: 18, kb: 140, ...PHYS, fx: 'gsscythe' }),
          ...strike(0.95, 0.3, { shape: 'circle', r: 155 }, { dmg: 52, posture: 14, kb: 160, multi: true, ...PHYS, fx: 'gsscythe' }),
          ...strike(1.5, 0.35, { shape: 'cone', r: 240, arc: 105 * D }, { dmg: 90, posture: 26, kb: 280, ...PHYS, fx: 'gsscythe' })] },
      { id: 'leapslash', name: '躍斬', short: '躍斬', tags: ['gap', 'melee'], range: [160, 600], cd: 8, cost: 24, track: 5, recovery: 1,
        actions: [...dashStrike(0.7, 0.6, 400, 150, 0.35, { dmg: 100, posture: 28, kb: 320, ...PHYS, fx: 'gsscythe' }),
          ...strike(1.3, 0.35, { shape: 'circle', r: 120 }, { dmg: 60, posture: 16, kb: 200, multi: true, ...FLAME, fx: 'gsburst' })] },
      { id: 'ritual', name: '黑焰儀式', short: '儀式', tags: ['ranged', 'zone'], range: [140, 760], cd: 10, cost: 24, track: 6, recovery: 0.6,
        actions: [{ do: 'tele', at: 0.05, dur: 1.1, shape: 'circle', r: 210, anchor: 'target', setMark: 'R', follow: true, lockBefore: 0.35, teleFx: 'gsritual' },
          { do: 'hit', at: 1.15, shape: 'circle', r: 210, anchor: 'mark', mark: 'R', dmg: 64, posture: 18, kb: 220, ...FLAME, fx: 'gsritualburst', zone: POOL(170, 3, 9) }],
        actions2: [{ do: 'tele', at: 0.05, dur: 1, shape: 'circle', r: 215, anchor: 'target', setMark: 'R', follow: true, lockBefore: 0.35, teleFx: 'gsritual' },
          { do: 'hit', at: 1.05, shape: 'circle', r: 215, anchor: 'mark', mark: 'R', dmg: 64, posture: 18, kb: 220, ...FLAME, fx: 'gsritualburst', zone: POOL(175, 3.2, 10) },
          ...strike(1.5, 0.4, { shape: 'ring', r0: 200, r: 340 }, { dmg: 56, posture: 14, kb: 200, multi: true, ...FLAME, fx: 'gsburst' })] },
      // 二階段
      { id: 'fling', name: '皮囊伸展', short: '伸展', phase: 2, tags: ['ranged', 'aoe'], range: [0, 600], cd: 8, cost: 24, track: 5, recovery: 0.7,
        actions: [{ do: 'tele', at: 0, dur: 0.8, shape: 'rect', len: 580, w: 160, follow: true, lockBefore: 0.3 },
          { do: 'hit', at: 0.85, shape: 'rect', len: 580, w: 160, dmg: 72, posture: 20, kb: 220, ...PHYS, fx: 'gsscythe' },
          ...strike(1.35, 0.4, { shape: 'cone', r: 430, arc: 200 * D }, { dmg: 62, posture: 18, kb: 260, multi: true, ...FLAME, fx: 'gssweep' })] },
      { id: 'plunge', name: '倒插橫掃', short: '倒插', phase: 2, tags: ['ranged', 'aoe'], range: [0, 700], cd: 8.5, cost: 26, track: 5, recovery: 0.7,
        actions: [{ do: 'tele', at: 0.05, dur: 0.9, shape: 'circle', r: 125, anchor: 'target', setMark: 'P', follow: true, lockBefore: 0.4 },
          { do: 'hit', at: 0.95, shape: 'circle', r: 125, anchor: 'mark', mark: 'P', dmg: 100, posture: 30, kb: 300, ...PHYS, fx: 'gsplunge' },
          ...strike(1.55, 0.35, { shape: 'cone', r: 340, arc: 220 * D }, { dmg: 80, posture: 22, kb: 320, multi: true, ...FLAME, fx: 'gssweep' })] },
      { id: 'tornado', name: '黑焰龍捲', short: '龍捲', phase: 2, tags: ['aoe'], range: [0, 460], cd: 13, cost: 34, track: 2, sweep: true, recovery: 1,
        actions: [{ do: 'tele', at: 0.05, dur: 1.05, shape: 'circle', r: 330, follow: true, chargeFx: 'gsgather' }, ...rings(1.15, [140, 225, 315], 30, 0.3),
          ...strike(2.15, 0.35, { shape: 'ring', r0: 150, r: 390 }, { dmg: 92, posture: 28, kb: 380, ...FLAME, fx: 'gsburst', zone: POOL(150, 3, 10) })] },
      { id: 'flamesweep', name: '黑焰橫掃', short: '橫掃', phase: 2, tags: ['ranged', 'aoe'], range: [0, 520], cd: 9, cost: 28, track: 2, sweep: true, recovery: 0.9,
        actions: [{ do: 'tele', at: 0.05, dur: 0.95, shape: 'cone', r: 490, arc: 170 * D, follow: true, lockBefore: 0.3, chargeFx: 'gsgather' }, ...sweep(1.05, 7, 490, 34)] },
    ],
    ultimate: { id: 'ult', name: '黑焰葬禮', name2: '黑焰葬禮・互為復活', ult: true, range: [0, 900], track: 0, recovery: 1,
      desc: '使徒高舉黑焰，黑焰沿地面由內向外三重展開、再捲成龍捲，收尾整片場地黑焰爆發；半血後先喚醒倒下的貴人，範圍更大。',
      actions: [{ do: 'tele', at: 0.1, dur: 1.2, shape: 'circle', r: 420, follow: true, chargeFx: 'gsgather' },
        ...rings(1.4, [190, 340, 490], 44, 0.4),
        ...rings(2.6, [140, 225, 315], 30, 0.3),
        ...strike(3.6, 0.5, { shape: 'ring', r0: 120, r: 380 }, { dmg: 96, posture: 30, kb: 380, ...FLAME, fx: 'gsburst', zone: POOL(160, 3, 10) })],
      actions2: [{ do: 'gscall', at: 0 }, { do: 'tele', at: 0.1, dur: 1.2, shape: 'circle', r: 430, follow: true, chargeFx: 'gsgather' },
        ...rings(1.4, [190, 340, 490], 48, 0.4),
        ...rings(2.6, [140, 225, 315], 32, 0.3),
        ...rings(3.6, [160, 300, 440], 36, 0.3),
        ...strike(4.7, 0.55, { shape: 'ring', r0: 120, r: 520 }, { dmg: 124, posture: 40, kb: 500, ...FLAME, fx: 'gsburst', zone: POOL(200, 3.2, 12) })],
    },
  });

  // 神皮貴人：一般對戰裡是使徒的搭檔（完整 Boss；hidden：不出現在選角，World 依使徒的 def.partner 帶他上場）
  BD.registerBoss({
    id: 'godskinnoble', name: '神皮貴人', title: '最古老的使徒', archetype: '圓胖肉搏・腹撞與神皮之輪', hidden: true,
    desc: '最古老的使徒，據說已同化了非人的身體構造。圓胖的軀幹、細長的青瓷細劍與藍灰長尾；腹撞、柄擊、細劍連刺，半血後撕下腹皮，縮成球滾動輾壓、浮空整個砸下。',
    color: '#d9cfbd', color2: '#4a3f45', glow: '#a39fe0', style: 'godskinnoble', rank: 'boss', stars: 4,
    radius: 32, maxHp: 1200, speed: 215, turn: 6, mass: 1.6, fxEl: 'blackflame', hurt: 'flesh', traits: ['godskin'],
    stamina: { max: 110, regen: 30 }, posture: 140, dodgeCost: 22, dodgeSpeed: 460,
    ai: { prefRange: [60, 240], aggression: 0.75, dodge: 0.3, precision: 0.6, reaction: 0.28, strafe: 0.5, walk: 0.55,
      feint: 0.05, delay: 0.25, retreat: 0.1, punish: 0.6, nervous: 0.05, patience: 0.3,
      combos: [
        { id: 'bellyrapier', name: '腹撞・細劍', phase: 1, weight: 1.2, steps: [{ skill: 'belly' }, { skill: 'rapier', cancel: 0.3, branch: [{ when: { dist: [0, 420] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'tailbelly', name: '尾掃・腹撞', phase: 1, weight: 1, steps: [{ skill: 'tail' }, { skill: 'belly', cancel: 0.3, branch: [{ when: { landed: true }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'wheelcrush', name: '神皮之輪・碾壓', phase: 2, weight: 1.2, steps: [{ skill: 'wheel' }, { skill: 'crusher', cancel: 0.4, branch: [{ when: { dist: [0, 700] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'thrustbelly', name: '連刺・腹撞', phase: 2, weight: 1, steps: [{ skill: 'thrusts' }, { skill: 'belly', cancel: 0.3, branch: [{ when: { landed: true }, do: 'extend' }, { do: 'stop' }] }] },
      ] },
    phase2: { speedMul: 1.1, dmgMul: 1.15, cdMul: 0.85, fxEl: 'blackflame', transFx: { id: 'gsawaken', el: 'blackflame' }, transDur: 2.2,
      line: '——貴人撕下腹皮，露出一整面布滿臉孔的肚子。', note: '半血：解鎖神皮之輪、神皮碾壓、連續突刺' },
    skills: [
      { id: 'nflame', name: '黑焰', short: '黑焰', tags: ['ranged'], range: [200, 700], cd: 7, cost: 16, track: 7, recovery: 0.6,
        actions: [{ do: 'tele', at: 0, dur: 0.6, shape: 'rect', len: 700, w: 40, follow: true, lockBefore: 0.2 }, bolt(0.6, 40)] },
      { id: 'belly', name: '腹撞與柄擊', short: '腹撞', tags: ['melee', 'gap'], range: [0, 300], cd: 6, cost: 20, track: 5, recovery: 0.6,
        actions: [...dashStrike(0.5, 0.5, 210, 130, 0.12, { dmg: 40, posture: 30, kb: 440, ...PHYS, fx: 'gsbelly' }),
          ...strike(0.95, 0.3, { shape: 'circle', r: 115 }, { dmg: 38, posture: 12, kb: 180, multi: true, ...PHYS, fx: 'gsslam' }),
          ...strike(1.4, 0.35, { shape: 'circle', r: 135 }, { dmg: 50, posture: 16, kb: 240, multi: true, ...PHYS, fx: 'gsslam' })] },
      { id: 'rapier', name: '細劍連刺', short: '細劍', tags: ['melee', 'gap'], range: [0, 440], cd: 7, cost: 22, track: 6, recovery: 0.6,
        actions: [...strike(0.5, 0.45, { shape: 'rect', len: 300, w: 60 }, { dmg: 44, posture: 12, kb: 140, ...PHYS, fx: 'gsthrust' }),
          ...strike(1.0, 0.35, { shape: 'cone', r: 240, arc: 140 * D }, { dmg: 48, posture: 14, kb: 200, multi: true, ...PHYS, fx: 'gsthrust' }),
          ...dashStrike(1.75, 0.6, 420, 74, 0.18, { dmg: 98, posture: 26, kb: 360, ...PHYS, fx: 'gsthrust' })] },
      { id: 'tail', name: '長尾橫掃', short: '尾掃', tags: ['melee', 'aoe'], range: [0, 200], cd: 5, cost: 14, track: 3, recovery: 0.5,
        actions: [...strike(0.45, 0.4, { shape: 'circle', r: 190 }, { dmg: 46, posture: 16, kb: 300, multi: true, ...PHYS, fx: 'gsslam' })] },
      // 二階段
      { id: 'wheel', name: '神皮之輪', short: '輪', phase: 2, tags: ['gap', 'aoe'], range: [0, 700], cd: 10, cost: 28, track: 5, recovery: 0.8,
        actions: [...dashStrike(1.0, 0.9, 660, 170, 0.7, { dmg: 94, posture: 30, kb: 420, ...PHYS, fx: 'gswheel' }),
          ...dashStrike(2.3, 0.6, 520, 170, 0.55, { dmg: 80, posture: 24, kb: 380, ...PHYS, fx: 'gswheel' })] },
      { id: 'crusher', name: '神皮碾壓', short: '碾壓', phase: 2, tags: ['gap', 'aoe'], range: [150, 720], cd: 11, cost: 28, track: 5, recovery: 0.8,
        actions: crush(1.2, 0.8, 200, 108) },
      { id: 'thrusts', name: '連續突刺', short: '連刺', phase: 2, tags: ['melee'], range: [0, 360], cd: 7, cost: 24, track: 7, recovery: 0.7,
        actions: [{ do: 'tele', at: 0, dur: 0.5, shape: 'rect', len: 330, w: 70, follow: true },
          ...flurry(0.5, 6, 0.16, { shape: 'rect', len: 330, w: 70 }, { dmg: 22, posture: 7, kb: 60, multi: true, ...PHYS }, 'gsthrust'),
          ...dashStrike(1.85, 0.45, 400, 80, 0.16, { dmg: 80, posture: 24, kb: 340, ...PHYS, fx: 'gsthrust' })] },
    ],
    ultimate: { id: 'ult', name: '神皮之輪・三連輾', name2: '神皮之輪・葬送', ult: true, range: [0, 900], track: 5, recovery: 1,
      desc: '貴人縮成一顆大球，在場上來回滾三趟，最後浮到半空整個砸下；半血後先喚醒倒下的使徒，落地的黑焰更大。',
      actions: [{ do: 'tele', at: 0, dur: 0.4, shape: 'circle', r: 160, follow: true, chargeFx: 'gsgather' },
        ...dashStrike(1.0, 0.6, 640, 170, 0.55, { dmg: 70, posture: 22, kb: 360, ...PHYS, fx: 'gswheel' }),
        ...dashStrike(1.9, 0.5, 640, 170, 0.55, { dmg: 70, posture: 22, kb: 360, ...PHYS, fx: 'gswheel' }),
        ...dashStrike(2.8, 0.5, 640, 170, 0.55, { dmg: 70, posture: 22, kb: 360, ...PHYS, fx: 'gswheel' }),
        ...crush(4.4, 1.0, 230, 110)],
      actions2: [{ do: 'gscall', at: 0 }, { do: 'tele', at: 0, dur: 0.4, shape: 'circle', r: 170, follow: true, chargeFx: 'gsgather' },
        ...dashStrike(1.0, 0.6, 680, 180, 0.55, { dmg: 76, posture: 24, kb: 380, ...PHYS, fx: 'gswheel' }),
        ...dashStrike(1.9, 0.5, 680, 180, 0.55, { dmg: 76, posture: 24, kb: 380, ...PHYS, fx: 'gswheel' }),
        ...dashStrike(2.8, 0.5, 680, 180, 0.55, { dmg: 76, posture: 24, kb: 380, ...PHYS, fx: 'gswheel' }),
        ...crush(4.4, 1.0, 260, 124), ...rings(4.6, [200, 330, 460], 34, 0.3)],
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
