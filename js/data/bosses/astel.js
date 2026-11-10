'use strict';
// 原作考據、圖片查看與改編界線：docs/bosses/astel.md、docs/research/astel/。
// 招式取自攻略站對原作招式的命名（Cosmic Burst、Waves of Darkness、Tail Lash、Diving Grab、Crushing Bite、Meteorite of Astel…）；
// 數值、被動「星屑流散」、半血演出與大招為觀戰遊戲改編。
(function (G) {
  const BD = G.BD, { D, strike } = BD.DataKit;
  const VOID = { fxEl: 'voidstar' }, PHYS = { fxEl: 'physical' };
  const STAR = { kind: 'stardust', r: 130, dur: 2.4, dps: 6, delay: 0.3, status: { id: 'slow', dur: 1.2 } }; // 星屑殘滯：只減速，不累積
  // 光束：先鎖定、再短暫停頓，一束極寬紫光（原作：延遲出手、高傷害高擊退）
  function beam(at, up, dmg, w) {
    return [{ do: 'tele', at: at - up, dur: up, shape: 'rect', len: 940, w: w || 150, follow: true, lockBefore: 0.35, chargeFx: 'astelgather' },
      { do: 'hit', at, shape: 'rect', len: 940, w: w || 150, dmg, posture: 40, kb: 380, ...VOID, fx: 'astelbeam' }];
  }
  // 黑暗波：貼地推出的環形衝擊，環與環之間留縫（原作：衝擊波半徑一波比一波大）
  function waves(at, n, r0, gap, thick, dmg) {
    return Array.from({ length: n }, (_, i) => strike(at + i * 0.4, i ? 0.2 : 0.55, { shape: 'ring', r0: r0 + i * gap, r: r0 + i * gap + thick },
      { dmg: dmg + i * 4, posture: 14 + i * 3, kb: 230, multi: true, ...VOID, fx: 'astelwave' })).flat();
  }
  // 星尾連刺：每一刺各自鎖定落點，鎖定後不再追
  function stab(at, up, mark, dmg) {
    return [{ do: 'tele', at: at - up, dur: up, shape: 'circle', r: 105, anchor: 'target', follow: true, lockBefore: 0.3, setMark: mark, chargeFx: false },
      { do: 'hit', at, shape: 'circle', r: 105, anchor: 'mark', mark, dmg, posture: 16, kb: 210, multi: true, ...VOID, fx: 'astelstab' }];
  }
  BD.registerBoss({
    id: 'astel', name: '黑暗棄子・艾絲緹', title: '無光彼方的墮星', archetype: '虛空墮星・重力壓制',
    desc: '自無光虛空落下的畸形星辰，傳說曾毀去一座永恆之城並奪走它的天空。顱骨臉面帶一對彎鉗與裂縫中的藍眼，六條細長骨臂末端是人手，背後兩對蜻蜓般的透明翅膜，尾巴是一串彩色星屑球捲成的蠍尾。用重力把人舉起壓碎、瞬移到頭頂擒抱，黑暗波與宇宙光束橫掃整個場地。被動「星屑流散」（改編）：落地行動時每 9 秒預警後在敵人腳邊撒下星屑殘滯，只減速。半血「天外流星」及奪天大招為本遊戲新增與改編。',
    color: '#8f7bff', color2: '#1a1c3a', glow: '#b9a2ff', style: 'astel', rank: 'boss', stars: 4,
    radius: 80, sizeMul: 1.5, maxHp: 4600, speed: 240, turn: 3.4, mass: 2.4, fxEl: 'voidstar', hurt: 'shadow', traits: ['stardust'],
    stamina: { max: 170, regen: 31 }, posture: 240, dodgeCost: 27, dodgeSpeed: 410,
    ai: { prefRange: [180, 460], aggression: 0.74, dodge: 0.22, precision: 0.66, reaction: 0.3, strafe: 0.34, walk: 0.7,
      feint: 0.05, delay: 0.3, retreat: 0.16, punish: 0.62, nervous: 0.08, patience: 0.36, safeCancel: true,
      combos: [
        { id: 'jawgrip', name: '顎咬・壓碎', weight: 1.2, steps: [{ skill: 'bite' }, { skill: 'crushing_bite', cancel: 0.3, branch: [{ when: { dist: [0, 360] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'nebulachain', name: '橫掃・推掌', weight: 1.2, steps: [{ skill: 'sweeping_nebula' }, { skill: 'nebula_shove', cancel: 0.3, branch: [{ when: { dist: [0, 380] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'tailwave', name: '尾鞭・黑暗波', weight: 1.1, steps: [{ skill: 'tail_lash' }, { skill: 'dark_waves', cancel: 0.3, branch: [{ when: { dist: [0, 520] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'starfall', name: '流星・光束', weight: 1.3, phase: 2, steps: [{ skill: 'meteorite' }, { skill: 'cosmic_burst', cancel: 0.3, branch: [{ when: { dist: [180, 1000] }, do: 'extend' }, { do: 'stop' }] }] },
      ],
    },
    phase2: { speedMul: 1.08, dmgMul: 1.12, cdMul: 0.88, line: '——六臂高舉。艾絲緹瞬移到遠空，天外的星辰一顆顆被撕開。',
      fxEl: 'voidstar', transFx: { id: 'astelawaken', el: 'voidstar' }, transDur: 2.7, roarAt: 1.85,
      note: '原作約半血時艾絲緹瞬移到遠方並施放「艾絲緹的隕石」；本遊戲照此解鎖「流星隕落」，另加入黑暗棄子群抓（改編自黑暗之星版本的群體擒抱），翅膜轉為紫光與星屑環亮起為演出改編',
    },
    skills: [
      { id: 'bite', name: '彎鉗連咬', short: '顎咬', tags: ['melee'], range: [0, 290], cd: 3.4, cost: 17, track: 5, recovery: 0.5,
        actions: [...strike(0.5, 0.36, { shape: 'cone', r: 255, arc: 105 * D }, { dmg: 92, posture: 20, kb: 160, ...PHYS, fx: 'astelbite' }),
          ...strike(0.95, 0.28, { shape: 'cone', r: 265, arc: 110 * D }, { dmg: 108, posture: 24, kb: 220, multi: true, ...PHYS, fx: 'astelbite' })] },
      { id: 'sweeping_nebula', name: '星雲橫掃', short: '橫掃', tags: ['melee', 'aoe'], range: [0, 390], cd: 5, cost: 21, track: 4, recovery: 0.75,
        actions: [...strike(0.7, 0.55, { shape: 'cone', r: 350, arc: 150 * D, angOff: -0.45 }, { dmg: 112, posture: 28, kb: 280, ...VOID, fx: 'astelswipe' }),
          ...strike(1.25, 0.38, { shape: 'cone', r: 370, arc: 155 * D, angOff: 0.45 }, { dmg: 124, posture: 30, kb: 340, multi: true, ...VOID, fx: 'astelswipe' })] },
      { id: 'nebula_shove', name: '星雲推掌', short: '推掌', tags: ['melee'], range: [0, 340], cd: 6, cost: 22, track: 3, recovery: 0.9,
        // 原作：慢速推出左手，掌前留下一段持續判定
        actions: [...strike(0.9, 0.8, { shape: 'rect', len: 330, w: 190 }, { dmg: 118, posture: 32, kb: 260, ...VOID, fx: 'astelshove' }),
          ...[0.28, 0.56].map(d => ({ do: 'hit', at: +(0.9 + d).toFixed(2), shape: 'rect', len: 330, w: 190, dmg: 36, posture: 6, kb: 80, multi: true, ...VOID, fx: 'astelshove' }))] },
      { id: 'tail_lash', name: '星屑尾鞭', short: '尾鞭', tags: ['melee', 'aoe'], range: [120, 560], cd: 6, cost: 24, track: 4, recovery: 0.8,
        // 原作：蠍尾從背上越過頭頂往前砸，射程中長；第二下落點更近、範圍更圓
        actions: [...strike(0.85, 0.7, { shape: 'cone', r: 520, arc: 74 * D }, { dmg: 132, posture: 34, kb: 380, ...PHYS, fx: 'asteltail' }),
          ...strike(1.5, 0.4, { shape: 'circle', r: 170, off: 340 }, { dmg: 110, posture: 28, kb: 330, multi: true, ...PHYS, fx: 'asteltail' })] },
      { id: 'tail_sting', name: '星尾連刺', short: '尾刺', tags: ['ranged', 'aoe'], range: [120, 820], cd: 8, cost: 28, track: 2, recovery: 0.85,
        actions: [...stab(1.0, 0.8, 'asS1', 70), ...stab(1.55, 0.45, 'asS2', 72), ...stab(2.1, 0.45, 'asS3', 78)] },
      { id: 'flying_nebula', name: '後掠星雲', short: '後掠', tags: ['gap', 'aoe'], range: [0, 560], cd: 9, cost: 28, track: 3, recovery: 0.95,
        // 原作：飛退同時揮臂，留下一路爆炸的星屑
        actions: [{ do: 'dash', at: 0.1, dir: 'back', dist: 220, dur: 0.55, fx: 'astelvanish' },
          { do: 'tele', at: 0.15, dur: 0.6, shape: 'cone', r: 400, arc: 165 * D, follow: true, chargeFx: false },
          ...strike(0.75, 0.01, { shape: 'cone', r: 400, arc: 165 * D }, { dmg: 118, posture: 28, kb: 320, ...VOID, fx: 'astelswipe' }),
          { do: 'erupt', at: 0.85, n: 4, interval: 0.12, start: 120, step: 90, r: 85, dmg: 40, posture: 8, kb: 150, fx: 'astelstarburst', fxEl: 'voidstar' }] },
      { id: 'cosmic_burst', name: '宇宙爆發', short: '光束', tags: ['ranged', 'aoe'], range: [200, 960], cd: 8.5, cost: 30, track: 1.6, recovery: 1,
        actions: beam(1.35, 1.2, 150),
        actions2: [...beam(1.35, 1.2, 150), ...beam(2.3, 0.7, 140, 135)] },
      { id: 'dark_waves', name: '黑暗波', short: '黑波', tags: ['aoe'], range: [0, 540], cd: 8, cost: 28, track: 2, recovery: 0.95,
        actions: [{ do: 'tele', at: 0.05, dur: 0.95, shape: 'circle', r: 390, follow: true, chargeFx: 'astelorbs' }, ...waves(1.05, 3, 90, 110, 92, 60)],
        actions2: [{ do: 'tele', at: 0.05, dur: 0.95, shape: 'circle', r: 470, follow: true, chargeFx: 'astelorbs' }, ...waves(1.05, 4, 90, 110, 92, 62)] },
      { id: 'great_waves', name: '六臂黑暗波', short: '六臂', tags: ['aoe'], range: [0, 760], cd: 12.5, cost: 34, track: 1.8, recovery: 1.05,
        actions: [{ do: 'tele', at: 0.05, dur: 1.3, shape: 'circle', r: 560, follow: true, chargeFx: 'astelorbs' }, ...waves(1.4, 4, 130, 135, 105, 66)],
        actions2: [{ do: 'tele', at: 0.05, dur: 1.3, shape: 'circle', r: 640, follow: true, chargeFx: 'astelorbs' }, ...waves(1.4, 5, 130, 135, 105, 68)] },
      { id: 'crushing_bite', name: '壓碎咬', short: '壓碎', tags: ['melee'], range: [0, 330], cd: 9.5, cost: 30, track: 3, recovery: 1.05,
        // 原作：顱骨泛紫、咬下時用重力氣泡把人舉起壓碎，前搖明顯、射程短
        actions: [{ do: 'tele', at: 0.05, dur: 0.85, shape: 'circle', r: 175, off: 150, follow: true, lockBefore: 0.25, chargeFx: 'astelgather' },
          { do: 'hit', at: 0.95, shape: 'circle', r: 175, off: 150, dmg: 40, posture: 8, kb: 0, status: { id: 'airborne', dur: 0.95 }, ...VOID, fx: 'astelgravity' },
          { do: 'hit', at: 1.85, shape: 'circle', r: 175, off: 150, dmg: 148, posture: 46, kb: 220, multi: true, ...VOID, fx: 'astelcrush' }] },
      { id: 'teleport_grab', name: '瞬移俯衝擒抱', short: '擒抱', tags: ['gap', 'aoe'], range: [200, 920], cd: 11.5, cost: 31, track: 4, recovery: 1.15,
        // 原作：先化成一顆球瞬移到目標頭頂，再俯衝並夾緊彎鉗
        actions: [{ do: 'tele', at: 0.15, dur: 1.45, shape: 'circle', r: 215, anchor: 'target', follow: true, lockBefore: 0.45, setMark: 'asLanding', chargeFx: false },
          { do: 'hide', at: 0.2, fx: 'astelvanish' }, { do: 'land', at: 1.6, mark: 'asLanding' },
          { do: 'hit', at: 1.6, shape: 'circle', r: 215, anchor: 'mark', mark: 'asLanding', dmg: 152, posture: 50, kb: 400, status: { id: 'root', dur: 0.6 }, ...VOID, fx: 'astelgrab' }] },
      { id: 'meteorite', name: '艾絲緹的隕石', short: '流星', phase: 2, tags: ['ranged', 'aoe'], range: [200, 1000], cd: 14, cost: 36, track: 1.6, recovery: 1.1,
        // 原作約半血：瞬移到遠方，面前開出傳送門，隕石由門中砸出
        actions: [{ do: 'dash', at: 0.05, dir: 'back', dist: 260, dur: 0.5, fx: 'astelvanish' },
          { do: 'tele', at: 0.4, dur: 1.2, shape: 'circle', r: 340, off: 240, follow: true, lockBefore: 0.5, chargeFx: 'astelportal' },
          { do: 'rain', at: 1.6, n: 9, dur: 1.5, area: 330, flight: 0.75, r: 95, dmg: 62, posture: 14, kb: 210, kind: 'starrock', fx: 'astelmeteor', teleColor: '#b9a2ff' }] },
      { id: 'star_clones', name: '黑暗棄子群抓', short: '群抓', phase: 2, tags: ['gap', 'aoe'], range: [150, 800], cd: 15, cost: 38, track: 3, recovery: 1.2,
        // 取自「黑暗之星」版本：半血後召出多個分身一起抓；本遊戲讓四個分身各鎖一處，最後本體收網
        actions: [...[0, 1, 2, 3].flatMap(i => [
          { do: 'tele', at: 0.1 + i * 0.35, dur: 0.95, shape: 'circle', r: 150, anchor: 'target', follow: true, lockBefore: 0.35, setMark: 'asC' + i, chargeFx: false },
          { do: 'hit', at: 1.05 + i * 0.35, shape: 'circle', r: 150, anchor: 'mark', mark: 'asC' + i, dmg: 62, posture: 14, kb: 180, multi: true, ...VOID, fx: 'astelclone' }]),
          { do: 'tele', at: 1.7, dur: 0.75, shape: 'circle', r: 260, anchor: 'target', follow: true, lockBefore: 0.4, setMark: 'asCF', chargeFx: false },
          { do: 'hit', at: 2.45, shape: 'circle', r: 260, anchor: 'mark', mark: 'asCF', dmg: 128, posture: 40, kb: 300, status: { id: 'root', dur: 0.5 }, multi: true, ...VOID, fx: 'astelgrab' }] },
    ],
    ultimate: { id: 'ult', name: '奪天之星・永恆之城的末日', name2: '星辰崩落・無光彼方', ult: true, range: [0, 1100], track: 3, recovery: 1.25,
      desc: '本遊戲新編（取意原作「毀去永恆之城、奪走它的天空」）：蓄起整片星空，把敵人吸向身前，一輪隕星雨後以黑暗波層層推出；二階段先開出傳送門，隕星雨更密，收尾加上繞場橫掃的宇宙光束。',
      actions: [{ do: 'tele', at: 0.1, dur: 1.4, shape: 'circle', r: 580, follow: true, chargeFx: 'astelawaken' },
        { do: 'gravpull', at: 1.5, r: 620, dmg: 32, posture: 10, kb: 660, fx: 'astelpull' },
        { do: 'rain', at: 1.7, n: 13, dur: 2, area: 380, flight: 0.8, r: 95, dmg: 60, posture: 14, kb: 200, kind: 'starrock', fx: 'astelmeteor', teleColor: '#b9a2ff' },
        ...waves(4.2, 4, 140, 150, 110, 70)],
      actions2: [{ do: 'tele', at: 0.1, dur: 1.3, shape: 'circle', r: 600, follow: true, chargeFx: 'astelawaken' },
        { do: 'gravpull', at: 1.4, r: 640, dmg: 34, posture: 10, kb: 680, fx: 'astelpull' },
        { do: 'rain', at: 1.55, n: 15, dur: 1.8, area: 400, flight: 0.7, r: 95, dmg: 58, posture: 12, kb: 190, kind: 'starrock', fx: 'astelmeteor', teleColor: '#b9a2ff' },
        ...waves(3.4, 4, 140, 150, 110, 72),
        { do: 'tele', at: 4.9, dur: 0.8, shape: 'circle', r: 960, chargeFx: 'astelgather' },
        ...Array.from({ length: 11 }, (_, i) => ({ do: 'hit', at: +(5.75 + i * 0.17).toFixed(2), shape: 'rect', len: 960, w: 150, angOff: (-150 + i * 30) * D,
          dmg: 36, posture: 7, kb: 90, multi: true, ...VOID, fx: 'astelbeam' }))],
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
