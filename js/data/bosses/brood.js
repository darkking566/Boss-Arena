'use strict';
// Boss 資料：腐沼母巢（純資料：數值、AI 個性、技能時間軸、二階段與大招）
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;
  const brood = {
    id: 'brood', name: '腐沼母巢', title: '萬蟲之母', archetype: '召喚 / 區域控制',
    desc: '行動緩慢但難以靠近：酸液、蛛網、毒霧與源源不絕的幼蟲，會把戰場變成沼澤。',
    color: '#9be15d', color2: '#3b1f4a', glow: '#d4ff8a', style: 'brood',
    radius: 64, maxHp: 3150, speed: 140, turn: 3.6, mass: 2.0, fxEl: 'poison',
    stamina: { max: 120, regen: 24 }, posture: 190, dodgeCost: 26, dodgeSpeed: 390,
    ai: { prefRange: [270, 430], aggression: 0.55, dodge: 0.2, precision: 0.4, reaction: 0.32, strafe: 0.55, walk: 0.7,
      feint: 0.1, delay: 0.2, retreat: 0.35, punish: 0.45, nervous: 0.15, patience: 0.5, read: 0.4,
      // 連段（僅沉重；格式見 js/engine/combo.js）
      combos: [
        { id: 'ambush', name: '鑽地伏擊', weight: 1.3, steps: [
          { skill: 'burrow' },
          { skill: 'stab', cancel: 0.45, branch: [
            { when: { dist: [0, 224] }, do: 'extend' },
            { when: { dist: [200, 900] }, do: 'switch', skill: 'acid' },
            { do: 'stop' }] },
          { skill: 'acid', cancel: 0.35, branch: [{ when: { dist: [200, 900] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'webacid', name: '網中酸雨', steps: [
          { skill: 'web' },
          { skill: 'acid', cancel: 0.3, branch: [
            { when: { dist: [200, 900] }, do: 'extend' },
            { when: { dist: [0, 224] }, do: 'switch', skill: 'stab' },
            { do: 'stop' }] }] },
        { id: 'stabmiasma', name: '突刺毒霧', steps: [
          { skill: 'stab' },
          { skill: 'miasma', cancel: 0.4, branch: [{ when: { dist: [0, 360] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'eggrain', name: '卵雨', phase: 2, steps: [
          { skill: 'eggs' },
          { skill: 'acid', cancel: 0.3, branch: [{ when: { dist: [200, 900] }, do: 'extend' }, { do: 'stop' }] }] },
      ] },
    phase2: { speedMul: 1.15, dmgMul: 1.2, cdMul: 0.75, line: '孩子們……吞噬牠！', aura: 'poison', transFx: { id: 'sacburst', el: 'poison' },
      note: '酸液 5 發、幼蟲 5 隻且更快，解鎖「卵囊播種」，大招變三道蟲潮' },
    skills: [
      { id: 'acid', name: '酸液彈', short: '酸液', tags: ['ranged', 'aoe'], range: [200, 900], cd: 3, cost: 15, track: 5, recovery: 0.5,
        actions: [{ do: 'lob', at: 0.4, n: 3, scatter: 84, lead: 0.5, flight: 0.9, r: 84, dmg: 48, posture: 12, kind: 'acid', zone: { kind: 'acid', r: 70, dur: 3, dps: 16 } }],
        actions2: [{ do: 'lob', at: 0.4, n: 5, scatter: 140, lead: 0.5, flight: 0.9, r: 84, dmg: 48, posture: 12, kind: 'acid', zone: { kind: 'acid', r: 70, dur: 3, dps: 16 } }] },
      { id: 'spawn', name: '召喚幼蟲', short: '幼蟲', tags: ['summon'], range: [0, 950], cd: 9, cost: 24, recovery: 0.5,
        actions: [{ do: 'summon', at: 0.5, kind: 'spider', n: 3 }],
        actions2: [{ do: 'summon', at: 0.5, kind: 'spider', n: 5 }] },
      { id: 'web', name: '蛛網陷阱', short: '蛛網', tags: ['trap'], range: [0, 700], cd: 11, cost: 15, recovery: 0.4,
        actions: [{ do: 'trap', at: 0.4, kind: 'web', n: 4, pattern: 'around', off: 150, r: 76, dmg: 20, root: 1.0, arm: 0.5, life: 10 }] },
      { id: 'stab', name: '尖肢突刺', short: '突刺', tags: ['melee'], range: [0, 224], cd: 3, cost: 20, track: 4, creep: 0.2, recovery: 0.7,
        actions: [...strike(0.5, 0.4, { shape: 'rect', len: 231, w: 84 }, { dmg: 80, posture: 30, kb: 200, fx: 'thrust' }),
          ...strike(0.95, 0.35, { shape: 'cone', r: 210, arc: 160 * D }, { dmg: 90, posture: 35, kb: 420, fx: 'slash' })] },
      { id: 'burrow', name: '鑽地突襲', short: '鑽地', tags: ['gap'], range: [220, 950], cd: 10, cost: 30, track: 0, recovery: 0.8,
        actions: [{ do: 'hide', at: 0.3, fx: 'burrow' },
          { do: 'tele', at: 0.5, dur: 0.95, shape: 'circle', r: 189, anchor: 'target', setMark: 'B', follow: true, lockBefore: 0.45 },
          { do: 'land', at: 1.45, mark: 'B' },
          { do: 'hit', at: 1.45, shape: 'circle', r: 189, anchor: 'mark', mark: 'B', dmg: 140, posture: 60, kb: 520, fx: { id: 'bigslam', scale: 1.2 } }] },
      { id: 'miasma', name: '毒霧瘴氣', short: '毒霧', tags: ['zone', 'defensive'], range: [0, 360], cd: 12, cost: 20, recovery: 0.5,
        actions: [{ do: 'zone', at: 0.5, kind: 'poison', pattern: 'self', n: 1, r: 259, dur: 5, dps: 26, delay: 0.6 }] },
      { id: 'eggs', name: '卵囊播種', short: '卵囊', phase: 2, tags: ['summon'], range: [0, 950], cd: 13, cost: 22, recovery: 0.5,
        actions: [{ do: 'summon', at: 0.5, kind: 'egg', n: 3 }] },
    ],
    ultimate: { id: 'ult', name: '萬蟲潮', ult: true, range: [0, 1800], track: 2, recovery: 1.0,
      actions: [{ do: 'tele', at: 0, dur: 1.6, shape: 'rect', len: 1700, w: 336, follow: true },
        { do: 'proj', at: 1.6, n: 1, speed: 620, r: 168, dmg: 190, posture: 70, kb: 400, life: 3, pierce: true, kind: 'swarm' },
        { do: 'summon', at: 1.9, kind: 'spider', n: 4 }],
      actions2: [{ do: 'tele', at: 0, dur: 1.6, shape: 'rect', len: 1700, w: 336, follow: true, angOff: -0.5 },
        { do: 'tele', at: 0, dur: 1.6, shape: 'rect', len: 1700, w: 336, follow: true },
        { do: 'tele', at: 0, dur: 1.6, shape: 'rect', len: 1700, w: 336, follow: true, angOff: 0.5 },
        { do: 'proj', at: 1.6, n: 3, spread: 0.5, speed: 620, r: 168, dmg: 190, posture: 70, kb: 400, life: 3, pierce: true, kind: 'swarm' },
        { do: 'summon', at: 1.9, kind: 'spider', n: 6 }],
      desc: '掀起橫掃全場的蟲潮巨浪並孵出大量幼蟲（二階段三道扇形蟲潮）' },
  };

  BD.registerBoss(brood);
})(typeof window !== 'undefined' ? window : globalThis);
