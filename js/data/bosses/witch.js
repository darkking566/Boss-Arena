'use strict';
// Boss 資料：霜月魔女（純資料：數值、AI 個性、技能時間軸、二階段與大招）
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;
  const shot = (at, o) => Object.assign({ do: 'proj', at, n: 1, speed: 560, r: 9, dmg: 44, posture: 10, life: 2.2, kind: 'ice' }, o || {});
  const witch = {
    id: 'witch', name: '霜月魔女', title: '永凍之眼', archetype: '風箏型法師',
    desc: '永遠保持距離，以冰錐、冰槍、地雷與哨兵消耗對手；被貼身時冰爆擊退並閃現脫離。',
    color: '#7fd8ff', color2: '#1b3a5c', glow: '#e0f7ff', style: 'witch',
    radius: 32, maxHp: 2500, speed: 190, turn: 6, mass: 0.9, fxEl: 'ice', hurt: 'frost',
    stamina: { max: 110, regen: 30 }, posture: 110, dodgeCost: 20, dodgeSpeed: 540,
    ai: { prefRange: [300, 470], aggression: 0.5, dodge: 0.62, precision: 0.7, reaction: 0.22, strafe: 0.85, walk: 0.68,
      feint: 0.05, delay: 0.15, retreat: 0.55, punish: 0.5, nervous: 0.25, patience: 0.45, read: 0.55, kiter: true,
      // 連段（僅沉重；格式見 js/engine/combo.js）
      combos: [
        { id: 'froststep', name: '霜步連射', weight: 1.3, steps: [
          { skill: 'blink' },
          { skill: 'icicle', cancel: 0.2, branch: [{ when: { dist: [120, 700] }, do: 'extend' }, { do: 'stop' }] },
          { skill: 'nova', cancel: 0.25, branch: [
            { when: { dist: [0, 160] }, do: 'extend' },
            { when: { dist: [200, 950] }, chance: 0.4, do: 'switch', skill: 'lance' },
            { do: 'stop' }] }] },
        { id: 'novaescape', name: '冰爆脫離', steps: [
          { skill: 'nova' },
          { skill: 'blink', cancel: 0.3 },
          { skill: 'icicle', cancel: 0.2, branch: [{ when: { dist: [120, 700] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'snare', name: '冰雷槍', steps: [
          { skill: 'mines' },
          { skill: 'lance', cancel: 0.3, branch: [
            { when: { dist: [200, 950] }, chance: 0.6, do: 'extend' },
            { when: { dist: [120, 700] }, do: 'switch', skill: 'icicle' },
            { do: 'stop' }] }] },
        { id: 'mirrorvolley', name: '鏡月齊射', phase: 2, steps: [
          { skill: 'mirror' },
          { skill: 'icicle', cancel: 0.2, branch: [{ when: { dist: [120, 700] }, do: 'extend' }, { do: 'stop' }] },
          { skill: 'lance', cancel: 0.3, branch: [{ when: { dist: [200, 950] }, do: 'extend' }, { do: 'stop' }] }] },
      ] },
    phase2: { speedMul: 1.12, dmgMul: 1.15, cdMul: 0.75, line: '月蝕降臨，凍結你的靈魂。', aura: 'frost', fxEl: 'arcane', transFx: { id: 'eclipse', el: 'arcane' },
      frostbite: 14,
      note: '冰錐變三向追蹤、地雷 5 顆、哨兵 2 座、暴風雪範圍大增、冰槍追加第二槍，解鎖「鏡像分身」；招式命中會累積冰凍值，滿了瞬間凍結；大招安全區縮小並追加冰刺與收束冰爆' },
    skills: [
      { id: 'icicle', name: '冰錐連射', short: '冰錐', tags: ['ranged', 'fast'], range: [120, 700], cd: 2.4, cost: 14, track: 6, recovery: 0.35,
        actions: [{ do: 'tele', at: 0, dur: 0.35, shape: 'rect', len: 420, w: 14, follow: true, soft: true }, shot(0.35), shot(0.5), shot(0.65)],
        actions2: [{ do: 'tele', at: 0, dur: 0.35, shape: 'rect', len: 420, w: 14, follow: true, soft: true },
          shot(0.35, { n: 3, spread: 0.2, homing: 1.3 }), shot(0.5, { n: 3, spread: 0.2, homing: 1.3 }), shot(0.65, { n: 3, spread: 0.2, homing: 1.3 })] },
      { id: 'nova', name: '寒冰新星', short: '新星', tags: ['defensive'], range: [0, 160], cd: 7, cost: 20, track: 0, recovery: 0.35,
        // 原地爆發並留下霜域（不再位移，脫離交給「霜步」）
        actions: [...strike(0.45, 0.45, { shape: 'circle', r: 165 }, { dmg: 65, posture: 30, kb: 650, slow: 2, fx: 'nova' }),
          { do: 'zone', at: 0.45, kind: 'blizzard', pattern: 'self', n: 1, r: 190, dur: 3, dps: 20, slow: true, delay: 0.25 }] },
      { id: 'blink', name: '霜步', short: '霜步', tags: ['escape'], range: [0, 260], cd: 4.5, cost: 14, track: 0, recovery: 0.15,
        actions: [{ do: 'blink', at: 0.15, to: 'away', dist: 300 }] },
      { id: 'mines', name: '霜凍地雷', short: '地雷', tags: ['trap'], range: [0, 750], cd: 10, cost: 15, recovery: 0.4,
        actions: [{ do: 'trap', at: 0.4, kind: 'mine', n: 3, pattern: 'between', r: 75, dmg: 85, slow: 1.8, arm: 0.7, life: 12, undodgeable: true }],
        actions2: [{ do: 'trap', at: 0.4, kind: 'mine', n: 5, pattern: 'between', r: 75, dmg: 85, slow: 1.8, arm: 0.7, life: 12, undodgeable: true }] },
      { id: 'blizzard', name: '暴風雪', short: '風雪', tags: ['zone', 'aoe'], range: [180, 750], cd: 10, cost: 24, track: 5, recovery: 0.6,
        actions: [{ do: 'zone', at: 0.5, kind: 'blizzard', pattern: 'at', lead: 0.5, n: 1, r: 145, dur: 5.5, dps: 24, slow: true, delay: 0.9 }],
        // 二階段：主風雪擴大並加長，另在兩側各補一小片，逼出更大的走位空間
        actions2: [{ do: 'zone', at: 0.5, kind: 'blizzard', pattern: 'at', lead: 0.5, n: 1, r: 235, dur: 7, dps: 30, slow: true, delay: 0.9 },
          { do: 'zone', at: 0.7, kind: 'blizzard', pattern: 'flank', n: 2, off: 280, r: 130, dur: 6, dps: 24, slow: true, delay: 1.1 }] },
      { id: 'sentinel', name: '冰晶哨兵', short: '哨兵', tags: ['summon'], range: [0, 950], cd: 14, cost: 24, recovery: 0.5,
        actions: [{ do: 'summon', at: 0.5, kind: 'sentinel', n: 1 }],
        actions2: [{ do: 'summon', at: 0.5, kind: 'sentinel', n: 2 }] },
      { id: 'lance', name: '冰槍貫穿', short: '冰槍', tags: ['ranged'], range: [200, 950], cd: 8, cost: 24, track: 3, recovery: 0.9,
        actions: strike(1.0, 1.0, { shape: 'rect', len: 950, w: 54, off: 10 }, { dmg: 165, posture: 65, kb: 300, fx: { id: 'beam', el: 'arcane' }, slow: 1 }),
        // 二階段：貫穿後立刻重新瞄準補上第二槍（威力較低、預警較短）
        actions2: [...strike(1.0, 1.0, { shape: 'rect', len: 950, w: 54, off: 10 }, { dmg: 165, posture: 65, kb: 300, fx: { id: 'beam', el: 'arcane' }, slow: 1 }),
          ...strike(1.75, 0.6, { shape: 'rect', len: 950, w: 54, off: 10 }, { dmg: 100, posture: 40, kb: 200, fx: { id: 'beam', el: 'arcane' }, slow: 1 })] },
      { id: 'mirror', name: '鏡像分身', short: '鏡像', phase: 2, tags: ['summon', 'escape'], range: [0, 950], cd: 15, cost: 20, recovery: 0.3,
        actions: [{ do: 'summon', at: 0.3, kind: 'clone', n: 2 }, { do: 'blink', at: 0.35, to: 'side', dist: 240 }] },
    ],
    ultimate: { id: 'ult', name: '絕對零度', ult: true, range: [0, 1800], track: 0, recovery: 1.0,
      actions: [{ do: 'invuln', at: 0, dur: 0.8 },
        { do: 'tele', at: 0.2, dur: 2.6, shape: 'except', r: 115, anchor: 'safe', setMark: 'S', undodgeable: true, teleFx: 'zerocast' },
        { do: 'hit', at: 2.8, shape: 'except', r: 115, anchor: 'mark', mark: 'S', undodgeable: true, dmg: 230, posture: 90, freeze: 1.3, fx: 'absolutezero' },
        { do: 'proj', at: 2.85, n: 12, radial: true, speed: 420, r: 10, dmg: 40, posture: 10, kind: 'ice', life: 2 }],
      actions2: [{ do: 'invuln', at: 0, dur: 0.8 },
        { do: 'tele', at: 0.2, dur: 2.6, shape: 'except', r: 85, anchor: 'safe', setMark: 'S', undodgeable: true, teleFx: 'zerocast' },
        { do: 'hit', at: 2.8, shape: 'except', r: 85, anchor: 'mark', mark: 'S', undodgeable: true, dmg: 320, posture: 120, freeze: 1.6, fx: 'absolutezero' },
        { do: 'proj', at: 2.85, n: 14, radial: true, speed: 420, r: 10, dmg: 40, posture: 10, kind: 'ice', life: 2 },
        { do: 'proj', at: 3.2, n: 14, radial: true, angOff: 0.22, speed: 380, r: 10, dmg: 40, posture: 10, kind: 'ice', life: 2.2 },
        // 收束冰爆：安全圈內也不能久留，爆發後立刻預警圈心，須翻出圈外
        { do: 'tele', at: 3.0, dur: 0.6, shape: 'circle', r: 105, anchor: 'mark', mark: 'S' },
        { do: 'hit', at: 3.6, shape: 'circle', r: 105, anchor: 'mark', mark: 'S', dmg: 100, posture: 50, kb: 500, slow: 1.5, fx: 'nova' }],
      desc: '全場冰封，只留一個遠方安全圈；圈外者受重創並被凍結（二階段：安全圈更小、傷害更高，圈心隨後追加冰爆）' },
  };

  BD.registerBoss(witch);
})(typeof window !== 'undefined' ? window : globalThis);
