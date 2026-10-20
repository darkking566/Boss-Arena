'use strict';
// Boss 資料：宇智波鼬（《火影忍者》）：一階段頭戴斗笠、不願多戰——苦無 / 手裏劍 / 豪火球 / 烏鴉分身 / 月讀，靠寫輪眼見切與烏鴉替身周旋；
// HP 50% 脫下斗笠、萬花筒寫輪眼全開：解鎖天照 / 須佐能乎（八尺瓊勾玉、十拳劍），見切變為八咫鏡；大招「月讀・天照・須佐能乎」
// 被動：寫輪眼（見切 trait counter）、烏鴉分身（trait crowsub，每 14 秒替身一次）、萬花筒反噬（strain：用萬花筒招式損耗生命）
// 新增機制：狀態 tsukuyomi / amaterasu / susanoo（js/engine/statuses/effects.js）、動作 strain（combat.js）；考據見 docs/bosses/itachi.md
(function (G) {
  const BD = G.BD, { D, strike } = BD.DataKit;
  const rect = (len, w) => ({ shape: 'rect', len, w });
  const cone = (r, deg) => ({ shape: 'cone', r, arc: deg * D });

  // 月讀：與目標眼神交會（長條預警＝視線）；命中拉進月讀世界，無法行動並承受連續刺擊
  const gaze = (tele, len, w, dur, crows) => [{ do: 'strain', at: 0.05, pct: 0.008 },
    ...strike(0.1 + tele, tele, rect(len, w), { dmg: 60, posture: 20, kb: 0, status: { id: 'tsukuyomi', dur } }),
    { do: 'proj', at: 0.3 + tele, n: crows, spread: 0.5, speed: 640, r: 22, dmg: 24, posture: 8, kb: 60, life: 1.4, homing: 4, kind: 'crow' }];
  // 天照：鎖定目標腳下，落點先炸一記黑炎、再留下燒灼的黑炎地面
  const blackfire = (tele, r, dmg, zoneDps, zoneDur) => [{ do: 'strain', at: 0.05, pct: 0.008 },
    { do: 'tele', at: 0.1, dur: tele, shape: 'circle', r, anchor: 'target', setMark: 'A', follow: true, lockBefore: 0.3 },
    { do: 'zone', at: 0.1 + tele - 0.3, pattern: 'at', r, dur: zoneDur, dps: zoneDps, kind: 'blackfire', delay: 0.3, status: { id: 'amaterasu' } },
    { do: 'hit', at: 0.1 + tele, shape: 'circle', r, anchor: 'mark', mark: 'A', dmg, posture: 26, kb: 120, fx: { id: 'amaterasu', el: 'blackfire' }, status: { id: 'amaterasu' } }];

  const itachi = {
    id: 'itachi', name: '宇智波鼬', title: '寫輪眼之鼬', archetype: '幻術與火遁的天才忍者',
    desc: '被稱為「寫輪眼的鼬」的宇智波天才。一階段頭戴斗笠、不願多戰：苦無與手裏劍、豪火球之術，再以烏鴉分身周旋，一旦與他眼神交會就會被拖進月讀；撐到半血，他脫下斗笠、萬花筒寫輪眼全開——黑炎天照燒到燒盡為止，須佐能乎的八咫鏡擋下一切、十拳劍將人封進酒壺。',
    color: '#b3123c', color2: '#14141c', glow: '#ff3a58', style: 'itachi',
    radius: 33, maxHp: 2050, speed: 250, turn: 9, mass: 0.85, fxEl: 'umbra', hurt: 'flesh',
    traits: ['counter', 'crowsub'], // 寫輪眼見切、烏鴉分身替身（js/engine/traits.js）
    stamina: { max: 100, regen: 34 }, posture: 105, dodgeCost: 18, dodgeSpeed: 600,
    ai: { prefRange: [140, 360], aggression: 0.5, dodge: 0.65, precision: 0.9, reaction: 0.17, strafe: 0.7, walk: 0.7,
      feint: 0.25, delay: 0.3, retreat: 0.2, punish: 0.85, nervous: 0.03, patience: 0.8, read: 0.85, counter: 0.5,
      // 連段（僅沉重）：苦無接手裏劍、月讀接豪火球；二階段：天照接烏鴉、須佐能乎接十拳劍
      combos: [
        { id: 'ks', name: '苦無・手裏劍', weight: 1.2, steps: [
          { skill: 'kunai' },
          { skill: 'shuriken', cancel: 0.3, branch: [
            { when: { rolled: true, dist: [120, 700] }, do: 'extend' },
            { when: { dist: [0, 130] }, do: 'switch', skill: 'flicker' },
            { do: 'stop' }] }] },
        { id: 'tf', name: '月讀・豪火球', weight: 1.3, steps: [
          { skill: 'tsukuyomi' },
          { skill: 'fireball', cancel: 0.4, branch: [
            { when: { landed: true }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'am', name: '天照・烏鴉', phase: 2, weight: 1.2, steps: [
          { skill: 'amaterasu' },
          { skill: 'crow_clone', cancel: 0.35, branch: [
            { when: { landed: true, dist: [0, 260] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'su', name: '八尺瓊勾玉・十拳劍', phase: 2, weight: 1.3, steps: [
          { skill: 'yasaka' },
          { skill: 'totsuka', cancel: 0.45, branch: [
            { when: { dist: [0, 360] }, do: 'extend' },
            { do: 'stop' }] }] },
      ] },
    phase2: { speedMul: 1.12, dmgMul: 1.2, cdMul: 0.82, fxEl: 'umbra', transFx: { id: 'mangekyo', el: 'umbra' },
      line: '看來，我不能再手下留情了。',
      note: '脫下斗笠、萬花筒寫輪眼全開：苦無 / 手裏劍 / 豪火球更猛，見切變為「八咫鏡・反映」；解鎖「天照」「須佐能乎・八尺瓊勾玉」「須佐能乎・十拳劍」；大招追加須佐能乎與十拳劍巨斬' },
    skills: [
      // 近戰：苦無連擊（蒙面之前就是暗部隊長，近身苦無一樣俐落）；二階段火焰附著
      { id: 'kunai', name: '苦無連擊', short: '苦無', tags: ['melee', 'fast'], range: [0, 125], cd: 2.4, cost: 12, track: 9, creep: 0.3, recovery: 0.4,
        actions: [...strike(0.22, 0.18, cone(125, 100), { dmg: 36, posture: 12, kb: 90, fx: 'slash' }),
          ...strike(0.44, 0.18, cone(125, 100), { dmg: 36, posture: 12, kb: 90, fx: 'slash' }),
          ...strike(0.68, 0.2, rect(165, 40), { dmg: 50, posture: 18, kb: 200, fx: 'thrust' })],
        actions2: [...strike(0.2, 0.16, cone(135, 105), { dmg: 40, posture: 14, kb: 100, fx: { id: 'slash', el: 'fire' } }),
          ...strike(0.4, 0.16, cone(135, 105), { dmg: 40, posture: 14, kb: 100, fx: { id: 'slash', el: 'fire' } }),
          ...strike(0.62, 0.2, rect(180, 44), { dmg: 58, posture: 20, kb: 220, fx: { id: 'thrust', el: 'fire' }, status: { id: 'burn', dur: 2 } })] },
      // 手裏劍術：三枚苦無扇形射出、緊接一枚精準的手裏劍（原作：手裏劍術比父親更高明、能折射命中隱藏標靶）；二階段火焰手裏劍
      { id: 'shuriken', name: '手裏劍術', short: '手裏劍', tags: ['ranged', 'fast'], range: [140, 720], cd: 3.2, cost: 14, track: 8, recovery: 0.35,
        actions: [{ do: 'tele', at: 0, dur: 0.34, shape: 'rect', len: 700, w: 40, follow: true },
          { do: 'proj', at: 0.34, n: 3, spread: 0.24, speed: 1000, r: 10, dmg: 30, posture: 10, kb: 70, life: 0.8, kind: 'kunai' },
          { do: 'proj', at: 0.62, n: 1, speed: 1100, r: 11, dmg: 44, posture: 16, kb: 100, life: 0.8, pierce: true, kind: 'shuriken' }],
        actions2: [{ do: 'tele', at: 0, dur: 0.3, shape: 'rect', len: 760, w: 44, follow: true },
          { do: 'proj', at: 0.3, n: 5, spread: 0.36, speed: 1050, r: 10, dmg: 30, posture: 10, kb: 70, life: 0.8, kind: 'kunai' },
          { do: 'proj', at: 0.58, n: 1, speed: 1150, r: 12, dmg: 52, posture: 18, kb: 120, life: 0.8, pierce: true, kind: 'shuriken', status: { id: 'burn', dur: 2 } }] },
      // 火遁・豪火球之術：宇智波的代表忍術——鼬的火焰多到連佐助的豪火球都被壓過
      { id: 'fireball', name: '火遁・豪火球之術', short: '豪火球', tags: ['ranged', 'aoe'], range: [120, 400], cd: 6, cost: 22, track: 7, recovery: 0.6,
        actions: strike(0.8, 0.8, cone(340, 75), { dmg: 100, posture: 40, kb: 280, fx: { id: 'flamethrow', el: 'fire' }, status: { id: 'burn', dur: 3 } }),
        actions2: [...strike(0.7, 0.7, cone(400, 90), { dmg: 108, posture: 44, kb: 300, fx: { id: 'flamethrow', el: 'fire' }, status: { id: 'burn', dur: 3 } }),
          ...strike(1.25, 0.4, cone(300, 70), { dmg: 60, posture: 20, kb: 200, fx: { id: 'flamethrow', el: 'fire' }, status: { id: 'burn', dur: 2 } })] },
      // 烏鴉分身：化作烏鴉群四散、拉開距離，同時放出一群烏鴉撲向對手（原作：以烏鴉牽制、擾亂對手）
      { id: 'crow_clone', name: '烏鴉分身', short: '烏鴉', tags: ['escape', 'ranged'], range: [0, 240], cd: 8, cost: 16, recovery: 0.4,
        actions: [{ do: 'blink', at: 0.1, to: 'away', dist: 300, fx: 'crowburst' },
          { do: 'tele', at: 0.3, dur: 0.35, shape: 'cone', r: 640, arc: 50 * D, follow: true },
          { do: 'proj', at: 0.65, n: 5, spread: 0.55, speed: 720, r: 22, dmg: 28, posture: 10, kb: 90, life: 1.3, homing: 3.2, kind: 'crow' }],
        actions2: [{ do: 'blink', at: 0.1, to: 'away', dist: 320, fx: 'crowburst' },
          { do: 'tele', at: 0.3, dur: 0.32, shape: 'cone', r: 680, arc: 70 * D, follow: true },
          { do: 'proj', at: 0.62, n: 7, spread: 0.8, speed: 760, r: 22, dmg: 30, posture: 10, kb: 90, life: 1.3, homing: 3.2, kind: 'crow' }] },
      // 烏鴉風暴：烏鴉群從天空俯衝落在目標周圍一片區域（落點預警），二階段每隻烏鴉帶著天照的黑炎
      { id: 'crow_storm', name: '烏鴉風暴', short: '風暴', tags: ['ranged', 'aoe'], range: [120, 640], cd: 9, cost: 22, track: 7, recovery: 0.6,
        actions: [{ do: 'rain', at: 0.3, n: 12, dur: 1.1, area: 260, r: 70, flight: 0.7, dmg: 40, posture: 14, kb: 160, kind: 'crow' }],
        actions2: [{ do: 'rain', at: 0.3, n: 18, dur: 1.3, area: 300, r: 75, flight: 0.7, dmg: 44, posture: 16, kb: 180, kind: 'crow', status: { id: 'amaterasu' } }] },
      // 瞬身之術：閃到對手背後、一記擒拿般的掌擊（鼬的身手連暗部都追不上）
      { id: 'flicker', name: '瞬身・背後擒拿', short: '瞬身', tags: ['gap', 'melee'], range: [120, 520], cd: 5.5, cost: 18, track: 8, recovery: 0.5,
        actions: [{ do: 'blink', at: 0.1, to: 'behind', dist: 70, fx: 'blink' },
          ...strike(0.5, 0.3, rect(130, 46), { dmg: 72, posture: 34, kb: 240, fx: 'thrust' })],
        actions2: [{ do: 'blink', at: 0.1, to: 'behind', dist: 70, fx: 'crowburst' },
          ...strike(0.46, 0.28, rect(150, 52), { dmg: 84, posture: 38, kb: 280, fx: 'thrust' })] },
      // 月讀：與目標眼神交會、拉進自己的世界，數日的酷刑只在一瞬間（長條預警＝視線，翻滾可躲；命中後無法行動並承受連續刺擊）
      { id: 'tsukuyomi', name: '月讀', short: '月讀', tags: ['ranged', 'zone'], range: [120, 480], cd: 11, cost: 26, track: 7, recovery: 0.55,
        actions: gaze(1.0, 480, 110, 2.2, 6),
        actions2: gaze(0.9, 540, 120, 2.6, 9) },
      // 寫輪眼見切（原作：能看穿動作預測攻擊）：一階段看穿後反斬；二階段須佐能乎的八咫鏡把攻擊彈回去
      { id: 'sharingan', name: '寫輪眼・見切', short: '見切', tags: ['counter', 'defensive'], range: [0, 320], cd: 7, cost: 10, track: 8, recovery: 0.45,
        actions: [{ do: 'counter', at: 0, dur: 0.9, dmg: 125, posture: 55, fx: 'parry', slowmo: 0.3 }],
        actions2: [{ do: 'counter', at: 0, dur: 1.0, dmg: 160, posture: 70, name: '八咫鏡・反映', fx: 'yatamirror', slowmo: 0.35 }] },
      // 額頭一戳：「下次吧，佐助。」——輕輕一戳幾乎不痛，卻把對手的架勢整個推散、並留下破綻（原作：戳額頭是他表達親情與封印天照的動作）
      { id: 'poke', name: '額頭一戳・下次吧', short: '一戳', tags: ['melee', 'gap'], range: [0, 150], cd: 9, cost: 10, track: 7, recovery: 0.5,
        actions: strike(0.8, 0.8, cone(115, 70), { dmg: 18, posture: 80, kb: 50, status: { id: 'vulnerable', dur: 3 } }),
        actions2: strike(0.7, 0.7, cone(125, 75), { dmg: 22, posture: 90, kb: 50, status: { id: 'vulnerable', dur: 3.5 } }) },
      // 二階段：天照——黑炎燒到燒盡為止，落點先炸一記再留下燃燒的黑炎地面（不可撲滅、只能走出去）
      { id: 'amaterasu', name: '天照', short: '天照', phase: 2, tags: ['ranged', 'zone'], range: [120, 560], cd: 10, cost: 30, track: 6, recovery: 0.6,
        actions: blackfire(0.95, 105, 78, 28, 4.5) },
      // 二階段：須佐能乎・顯現——骨架巨人拔地而起、持續 16 秒（之後各須佐能乎招式都會重新刷新）（承受傷害 −25%），並由八咫鏡先擋下 150 點傷害
      { id: 'susanoo_form', name: '須佐能乎・顯現', short: '顯現', phase: 2, tags: ['defensive'], range: [0, 900], cd: 24, cost: 20, track: 6, recovery: 0.6,
        actions: [{ do: 'strain', at: 0.05, pct: 0.01 }, { do: 'status', at: 0.3, id: 'susanoo' }, { do: 'status', at: 0.3, id: 'shield', value: 150 }] },
      // 二階段：須佐能乎・八尺瓊勾玉——須佐能乎顯現、朝目標拋出一排巨大的勾玉
      { id: 'yasaka', name: '須佐能乎・八尺瓊勾玉', short: '勾玉', phase: 2, tags: ['ranged'], range: [180, 820], cd: 8, cost: 24, track: 6, recovery: 0.65,
        actions: [{ do: 'status', at: 0.05, id: 'susanoo' }, { do: 'strain', at: 0.1, pct: 0.008 },
          { do: 'tele', at: 0.2, dur: 0.75, shape: 'rect', len: 820, w: 150, follow: true },
          { do: 'proj', at: 0.95, n: 5, spread: 0.22, speed: 780, r: 34, dmg: 62, posture: 22, kb: 200, life: 1.1, kind: 'magatama' }] },
      // 二階段：須佐能乎・十拳劍——酒壺中湧出的靈劍刺穿目標，被刺中者被封印（定身 + 易傷）
      { id: 'totsuka', name: '須佐能乎・十拳劍', short: '十拳', phase: 2, tags: ['melee', 'zone'], range: [0, 380], cd: 9, cost: 28, track: 6, recovery: 0.75,
        actions: [{ do: 'status', at: 0.05, id: 'susanoo' }, { do: 'strain', at: 0.1, pct: 0.008 },
          ...strike(1.05, 1.0, rect(720, 150), { dmg: 125, posture: 60, kb: 320, fx: 'totsuka', status: [{ id: 'root', dur: 1.2 }, { id: 'vulnerable', dur: 4 }] })] },
    ],
    // 大招：鼬在對手面前同時動用三種瞳術——月讀拖進幻境、天照的黑炎沿著視線一路燒過去；二階段再以須佐能乎揮出十拳劍的巨斬
    ultimate: { id: 'ult', name: '月讀・天照', name2: '月讀・天照・須佐能乎', ult: true, range: [0, 900], track: 0, recovery: 0.8,
      actions: [{ do: 'strain', at: 0.05, pct: 0.02 },
        ...strike(1.3, 1.2, rect(900, 150), { dmg: 60, posture: 30, kb: 0, status: { id: 'tsukuyomi', dur: 2.4 } }),
        { do: 'proj', at: 0.5, n: 8, spread: 0.45, speed: 640, r: 22, dmg: 24, posture: 8, kb: 60, life: 1.6, homing: 4, kind: 'crow' },
        { do: 'erupt', at: 1.45, n: 6, interval: 0.14, start: 90, step: 120, r: 85, dmg: 62, posture: 24, kb: 100, fx: 'amaterasu', fxEl: 'blackfire', status: { id: 'amaterasu' } }],
      actions2: [{ do: 'status', at: 0.05, id: 'susanoo' }, { do: 'strain', at: 0.1, pct: 0.03 },
        ...strike(1.2, 1.1, rect(1000, 160), { dmg: 70, posture: 34, kb: 0, status: { id: 'tsukuyomi', dur: 2.8 } }),
        { do: 'proj', at: 0.5, n: 12, spread: 0.4, speed: 660, r: 22, dmg: 26, posture: 8, kb: 60, life: 1.6, homing: 4, kind: 'crow' },
        { do: 'erupt', at: 1.35, n: 8, interval: 0.12, start: 90, step: 115, r: 90, dmg: 66, posture: 24, kb: 100, fx: 'amaterasu', fxEl: 'blackfire', status: { id: 'amaterasu' } },
        ...strike(2.9, 1.0, rect(1100, 210), { dmg: 190, posture: 80, kb: 450, fx: 'totsuka', status: [{ id: 'root', dur: 1.0 }, { id: 'vulnerable', dur: 4 }] })],
      desc: '與目標眼神交會，把對方拖進月讀的幻境（命中後無法行動）；黑炎天照沿著視線一路燒過去。二階段須佐能乎顯現，最後以十拳劍的巨斬橫貫全場，將對手封印（定身 + 易傷）。' },
  };

  BD.registerBoss(itachi);
})(typeof window !== 'undefined' ? window : globalThis);
