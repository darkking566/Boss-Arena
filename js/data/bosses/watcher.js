'use strict';
// Boss 資料：深淵監視者（純資料：數值、AI 個性、技能時間軸、二階段與大招）
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;
  // 二階段火焰：延遲 0.5 秒才燃起，對應原作「揮劍後地面遲一拍炸出火焰」
  const FIRE = { kind: 'fire', r: 44, dur: 3, dps: 22, delay: 0.5 };
  // 二階段每一揮都帶出粗大的火焰刃光（fx 放大 1.45 倍、火元素）並在原地留火
  const flame = (fx) => ({ id: fx, scale: 1.45, el: 'fire' });
  const ignite = (list, zone) => list.map((a) => (a.do === 'hit' ? Object.assign({}, a, { zone, fx: flame(a.fx) }) : a));
  // 不死隊連環劍舞：每揮一劍就踏步貼近，三擊一刺，收尾重劈；fire = 二階段（踏步拖火痕、隔擊留火、尾擊火環）
  const legion = (fire) => {
    const out = [], n = 9, t0 = 0.9, gap = 0.4;
    for (let i = 0; i < n; i++) {
      const t = +(t0 + i * gap).toFixed(2), tele = i ? 0.2 : 0.5, stab = i % 3 === 2;
      out.push(Object.assign({ do: 'dash', at: +(t - tele - 0.16).toFixed(2), dist: 95, dur: 0.14 }, fire && { trail: { kind: 'fire', r: 34, dur: 3, dps: 20, delay: 0.5 } }));
      out.push(...strike(t, tele, stab ? { shape: 'rect', len: 190, w: 60 } : { shape: 'cone', r: 135, arc: 150 * D },
        { dmg: stab ? 62 : 38, posture: stab ? 24 : 14, kb: stab ? 260 : 140, fx: fire ? flame(stab ? 'thrust' : 'slash') : stab ? 'thrust' : 'slash', zone: fire && i % 2 ? FIRE : undefined }));
    }
    const tf = +(t0 + n * gap + 0.3).toFixed(2);
    out.push(...strike(tf, 0.45, { shape: 'circle', r: 175 }, { dmg: 130, posture: 55, kb: 480, fx: fire ? { id: 'bigslam', scale: 1.2, el: 'fire' } : 'bigslam', zone: fire ? { kind: 'fire', r: 140, dur: 4, dps: 28, delay: 0.4 } : undefined }));
    if (fire) out.push(...strike(tf + 0.4, 0.25, { shape: 'ring', r0: 175, r: 270 }, { dmg: 70, posture: 25, kb: 320, fx: 'pillarring' }));
    return out;
  };
  const wCombo = [
    ...strike(0.28, 0.24, { shape: 'cone', r: 120, arc: 120 * D }, { dmg: 48, posture: 18, kb: 120, fx: 'slash' }),
    ...strike(0.52, 0.2, { shape: 'cone', r: 120, arc: 120 * D }, { dmg: 48, posture: 18, kb: 120, fx: 'slash' }),
    // 突然的停頓後重刺（延遲斬）
    ...strike(1.2, 0.4, { shape: 'rect', len: 155, w: 56 }, { dmg: 88, posture: 35, kb: 300, fx: 'thrust' }),
  ];
  // 原作「上撩」：大劍由下往上撩起，揚起漫天塵土並把人打倒
  const wRise = strike(0.5, 0.4, { shape: 'cone', r: 125, arc: 100 * D }, { dmg: 78, posture: 45, kb: 480, fx: 'cleave' });
  // 原作「衝斬」：長距離突進後近乎 360 度的迴旋斬
  const wDashSlash = (hit, trail, zone) => [
    ...dashStrike(0.45, 0.45, 270, 44, 0.25, { dmg: 66, posture: 24, kb: 220 }, Object.assign({ fx: 'slashline' }, trail && { trail })),
    ...strike(1.0, 0.3, { shape: 'circle', r: hit }, { dmg: 98, posture: 42, kb: 340, fx: 'whirl', zone }),
  ];
  const wPlunge = (r, dmg, extra) => [
    { do: 'hide', at: 0.25, fx: 'leap' },
    { do: 'tele', at: 0.25, dur: 0.8, shape: 'circle', r, anchor: 'target', setMark: 'P', follow: true, lockBefore: 0.35 },
    { do: 'land', at: 1.05, mark: 'P' },
    Object.assign({ do: 'hit', at: 1.05, shape: 'circle', r, anchor: 'mark', mark: 'P', dmg, posture: 45, kb: 380, fx: 'bigslam' }, extra || {}),
  ];
  const watcher = {
    id: 'watcher', name: '深淵監視者', title: '法蘭不死隊', archetype: '迅捷群狼型',
    desc: '飲下狼血的不死隊薪王：尖盔藍鋼甲、紅披風，法蘭大劍配格擋匕首。一階段以突刺、上撩、衝斬與躍斬逼近，並呼喚同伴群攻，偶爾冒出敵我不分的紅眼監視者；二階段狼血匯於一身、大劍燃起薪火，招式在地面留下遲一拍的火焰。',
    color: '#c0392b', color2: '#26303f', glow: '#ff9a4a', style: 'watcher',
    radius: 32, maxHp: 2250, speed: 245, turn: 8, mass: 1.0, fxEl: 'physical', hurt: 'flesh',
    traits: ['counter', 'clash'], clash: { style: 'blade', proj: true }, // 匕首彈反（js/engine/traits.js）；同伴 / 紅眼規則見 js/engine/minions/watcher.js
    stamina: { max: 110, regen: 34 }, posture: 120, dodgeCost: 16, dodgeSpeed: 620,
    ai: { clash: 0.5, basic: 0.5, // 對撞傾向、普攻填空窗機率（js/engine/ai.js）
      prefRange: [90, 190], aggression: 0.8, dodge: 0.7, precision: 0.75, reaction: 0.2, strafe: 0.7, walk: 0.75,
      feint: 0.25, delay: 0.45, retreat: 0.15, punish: 0.8, nervous: 0.1, patience: 0.3, read: 0.7, counter: 0.25, resetFlip: 0.35, resetSkill: 'backflip',
      // 連段（僅沉重；格式見 js/engine/combo.js）
      combos: [
        { id: 'wolfblood', name: '狼血三段', weight: 1.3, steps: [
          { skill: 'combo', exits: [{ after: 2, when: { rolled: true }, chance: 0.45, then: 'next' }] },
          { skill: 'backflip', cancel: 0.4, branch: [{ when: { sta: 0.35 }, do: 'extend' }, { do: 'stop' }] },
          { skill: 'plunge', cancel: 0.2, branch: [
            { when: { dist: [150, 540] }, do: 'extend' },
            { when: { dist: [120, 150] }, do: 'switch', skill: 'lunge' },
            { do: 'stop' }] }] },
        { id: 'stabrise', name: '突刺上撩', steps: [
          { skill: 'lunge' },
          { skill: 'rise', cancel: 0.45, branch: [
            { when: { dist: [0, 150] }, do: 'extend' },
            { when: { rollDir: ['back'], dist: [80, 270] }, do: 'switch', skill: 'dashslash' },
            { do: 'stop' }] }] },
        { id: 'risedash', name: '上撩衝斬', steps: [
          { skill: 'rise' },
          { skill: 'dashslash', cancel: 0.4, branch: [
            { when: { landed: true }, do: 'extend' },
            { when: { dist: [60, 330] }, chance: 0.5, do: 'delay', hold: [0.3, 0.55] },
            { do: 'stop' }] }] },
        { id: 'pyre', name: '薪火追擊', phase: 2, steps: [
          { skill: 'emberswipe' },
          { skill: 'dashslash', cancel: 0.3, branch: [{ when: { dist: [100, 350] }, do: 'extend' }, { do: 'stop' }] },
          { skill: 'rise', cancel: 0.4, branch: [{ when: { dist: [0, 150] }, do: 'extend' }, { do: 'stop' }] }] },
      ] },
    phase2: { speedMul: 1.1, dmgMul: 1.2, cdMul: 0.85, line: '薪王之火……燃盡深淵。', aura: 'flame', fxEl: 'fire',
      transDur: 2.8, roarAt: 1.7, purge: true, bloodBurst: true,
      note: '倒地、深紅血霧爆發、同伴全數消散，狼血匯於一身，以「薪王」之姿獨自起身：大劍燃起火焰；連斬/上撩/突刺/衝斬會在地上留下遲一拍才燃起的火焰，衝斬沿途拖出火痕，下劈變爆炸，解鎖「薪火長斬」（突進後身後遲一拍炸出火焰），不再召喚同伴' },
    skills: [
      { id: 'combo', name: '狼血連斬', short: '連斬', tags: ['melee'], range: [0, 135], cd: 3, cost: 24, track: 7, creep: 0.35, recovery: 0.6,
        actions: wCombo,
        actions2: [...ignite(wCombo, FIRE), ...strike(1.55, 0.3, { shape: 'cone', r: 140, arc: 150 * D }, { dmg: 80, posture: 30, kb: 300, fx: 'slash', zone: FIRE })] },
      { id: 'rise', name: '上撩・揚塵', short: '上撩', tags: ['melee'], range: [0, 140], cd: 4, cost: 22, track: 7, recovery: 0.6,
        actions: wRise,
        actions2: [...ignite(wRise, FIRE), ...strike(0.95, 0.3, { shape: 'circle', r: 105, off: 95 }, { dmg: 55, posture: 20, kb: 300, fx: 'pillarring', zone: FIRE })] },
      { id: 'dashslash', name: '衝斬', short: '衝斬', tags: ['gap', 'melee'], range: [120, 330], cd: 5, cost: 24, track: 7, recovery: 0.6,
        actions: wDashSlash(135),
        actions2: wDashSlash(140, { kind: 'fire', r: 38, dur: 4, dps: 24, delay: 0.6 }, { kind: 'fire', r: 100, dur: 3.5, dps: 24, delay: 0.5 }) },
      { id: 'plunge', name: '躍空重劈', short: '重劈', tags: ['gap'], range: [150, 540], cd: 7, cost: 26, track: 6, recovery: 0.6,
        actions: wPlunge(100, 112),
        actions2: [...wPlunge(130, 128, { zone: { kind: 'fire', r: 90, dur: 4, dps: 26 } }),
          { do: 'tele', at: 1.05, dur: 0.32, shape: 'circle', r: 175, anchor: 'mark', mark: 'P' },
          { do: 'hit', at: 1.37, shape: 'circle', r: 175, anchor: 'mark', mark: 'P', dmg: 60, posture: 25, kb: 400, fx: 'pillarring' }] },
      { id: 'lunge', name: '突進刺擊', short: '突刺', tags: ['gap', 'fast'], range: [120, 350], cd: 3.6, cost: 20, track: 7, recovery: 0.5,
        actions: dashStrike(0.4, 0.4, 300, 46, 0.15, { dmg: 82, posture: 35, kb: 250 }, { fx: 'slashline' }),
        actions2: dashStrike(0.4, 0.4, 320, 46, 0.15, { dmg: 88, posture: 35, kb: 250 }, { fx: 'slashline', trail: { kind: 'fire', r: 36, dur: 3.5, dps: 22 } }) },
      { id: 'backflip', name: '後空翻', short: '空翻', tags: ['escape'], range: [0, 190], cd: 3.2, cost: 14, track: 0, recovery: 0.25,
        actions: [{ do: 'dash', at: 0.08, dist: 220, dur: 0.3, dir: 'back', iframe: true }] },
      { id: 'parry', name: '匕首彈反', short: '彈反', tags: ['counter'], range: [0, 220], cd: 7, cost: 10, track: 8, recovery: 0.5,
        actions: [{ do: 'counter', at: 0, dur: 0.55, dmg: 120, posture: 60, name: '彈反・致命一擊' }] },
      { id: 'pack', name: '呼喚同伴', short: '同伴', maxPhase: 1, summonCap: 1, summonKind: 'watcher', tags: ['summon'], range: [0, 950], cd: 16, cost: 20, recovery: 0.4,
        actions: [{ do: 'summon', at: 0.6, kind: 'watcher', n: 1, cap: 1, rogue: 0.45 }] },
      // 原作二階段：劍尖前伸滑近的長斬，翻滾穿到他身後會被遲一拍的火焰吞沒
      { id: 'emberswipe', name: '薪火長斬', short: '長斬', phase: 2, tags: ['gap', 'melee'], range: [150, 400], cd: 6, cost: 24, track: 7, recovery: 0.6,
        actions: [...dashStrike(0.5, 0.5, 340, 56, 0.3, { dmg: 84, posture: 32, kb: 260 }, { fx: 'slashline', trail: { kind: 'fire', r: 34, dur: 3, dps: 20, delay: 0.5 } }),
          ...strike(1.2, 0.35, { shape: 'circle', r: 95, off: -85 }, { dmg: 72, posture: 26, kb: 260, fx: 'pillarring', zone: { kind: 'fire', r: 90, dur: 3.5, dps: 24 } })] },
      // 普攻：無冷卻無消耗，填補技能空窗，也是對撞的主力
      { id: 'basic', name: '斬擊', short: '斬擊', tags: ['melee', 'fast', 'basic'], weight: 0.45, range: [0, 160], cd: 0, cost: 0, track: 8, recovery: 0.3,
        actions: strike(0.2, 0.14, { shape: 'cone', r: 135, arc: 100 * D }, { dmg: 26, posture: 8, kb: 60, fx: 'slash' }) }
    ],
    ultimate: { id: 'ult', name: '不死隊連環劍舞', name2: '薪王焚天連斬', ult: true, range: [0, 900], track: 6, recovery: 1.2,
      actions: legion(false), actions2: legion(true),
      desc: '一階段「不死隊連環劍舞」：法蘭不死隊的劍技，九記踏步斬刺（三擊一刺）連綿不斷追著目標，最後以一記重劈收尾；二階段「薪王焚天連斬」：同樣的連斬，每一揮都帶出粗大的火焰刃光，踏步拖出火痕，隔擊留火，尾擊引爆火環' },
  };

  BD.registerBoss(watcher);
})(typeof window !== 'undefined' ? window : globalThis);
