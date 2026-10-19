'use strict';
// Boss 資料：飛將呂布（純資料：數值、AI 個性、技能時間軸、二階段與大招）
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;

  const lubu = {
    id: 'lubu', name: '呂布', title: '飛將', archetype: '重戟壓制',
    desc: '手持方天畫戟的天下無雙飛將，以狂瀾巨戟與霸道衝殺壓制全場，縱橫沙場只為尋得能全力一戰的宿敵。',
    color: '#c81e2b', color2: '#2b1a1a', glow: '#ff3a3a', style: 'lubu',
    radius: 34, maxHp: 2400, speed: 205, turn: 6, mass: 1.5, fxEl: 'physical', hurt: 'flesh',
    traits: ['counter'], // 鎚頂彈反反擊（js/engine/traits.js）
    stamina: { max: 110, regen: 30 }, posture: 170, dodgeCost: 20, dodgeSpeed: 540,
    ai: {
      prefRange: [60, 170],
      aggression: 0.85,
      dodge: 0.55,
      precision: 0.8,
      reaction: 0.2,
      strafe: 0.6,
      walk: 0.8,
      feint: 0.1,
      delay: 0.35,
      retreat: 0.08,
      punish: 0.85,
      nervous: 0.08,
      patience: 0.35,
      read: 0.7,
      counter: 0.45,
      // 連段（僅沉重節奏；格式見 docs/adding-a-boss.md 與 js/engine/combo.js）
      combos: [
        { id: 'wushuang', name: '無雙連戟', weight: 1.3, steps: [
          { skill: 'feijiang_pounce' },
          { skill: 'poshield_thrust', cancel: 0.4, branch: [
            { when: { landed: true }, do: 'extend' },
            { when: { rollDir: ['back'], dist: [100, 300] }, do: 'switch', skill: 'fangtian_sweep' },
            { chance: 0.4, do: 'delay', hold: [0.25, 0.45] },
            { do: 'stop' }] }] },
        { id: 'sweepparry', name: '方天逆破', phase: 1, weight: 1.2, steps: [
          { skill: 'fangtian_sweep' },
          { skill: 'halberd_whirl', cancel: 0.45, branch: [
            { when: { dist: [0, 160] }, do: 'extend' },
            { when: { rollDir: ['back'], dist: [120, 380] }, do: 'switch', skill: 'feijiang_pounce' },
            { do: 'stop' }] }] },
        { id: 'pojin', name: '破陣天誅', weight: 1.1, steps: [
          { skill: 'poshield_thrust' },
          { skill: 'tiankui_lite', cancel: 0.35, branch: [
            { when: { landed: true, dist: [0, 260] }, do: 'extend' },
            { chance: 0.45, do: 'delay', hold: [0.3, 0.5] },
            { do: 'stop' }] }] },
        { id: 'chiturush', name: '赤兔狂瀾', phase: 2, weight: 1.4, steps: [
          { skill: 'chitu_charge' },
          { skill: 'fangtian_sweep', cancel: 0.4, branch: [
            { when: { dist: [0, 185] }, do: 'extend' },
            { when: { dist: [140, 390] }, do: 'switch', skill: 'feijiang_pounce' },
            { do: 'stop' }] }] },
        { id: 'buduan', name: '斷腿不退・破陣', phase: 2, weight: 1.2, steps: [
          { skill: 'unbroken' },
          { skill: 'poshield_thrust', cancel: 0.3, branch: [
            { when: { dist: [0, 280] }, do: 'extend' },
            { do: 'switch', skill: 'feijiang_pounce' }] }] },
      ],
    },
    phase2: {
      speedMul: 1.12, dmgMul: 1.15, cdMul: 0.85,
      line: '好敵手……再讓我高興一點！', aura: 'fire', fxEl: 'blood', transFx: { id: 'warsteed', el: 'blood' },
      note: '解鎖「赤兔奔襲」與「斷腿不退」；方天掃範圍擴大並帶擊飛震波，破盾突更迅猛，大招「天喰」追加赤兔馬踐踏衝鋒後降下終極巨劈',
    },
    skills: [
      { id: 'fangtian_sweep', name: '方天掃', short: '方天掃', tags: ['melee', 'aoe'], range: [0, 185], cd: 3.2, cost: 24, track: 6, creep: 0.3, recovery: 0.55,
        actions: strike(0.52, 0.36, { shape: 'cone', r: 185, arc: 150 * D }, { dmg: 105, posture: 35, kb: 440, fx: 'cleave' }),
        actions2: [...strike(0.48, 0.32, { shape: 'cone', r: 205, arc: 160 * D }, { dmg: 115, posture: 40, kb: 480, fx: 'cleave' }),
          ...strike(0.85, 0.28, { shape: 'circle', r: 150 }, { dmg: 65, posture: 20, kb: 350, fx: 'ring' })] },
      { id: 'poshield_thrust', name: '破盾突', short: '破盾突', tags: ['melee', 'fast'], range: [50, 270], cd: 3.6, cost: 22, track: 8, creep: 0.2, recovery: 0.5,
        actions: strike(0.45, 0.3, { shape: 'rect', len: 270, w: 55 }, { dmg: 100, posture: 70, kb: 260, fx: 'thrust', status: { id: 'vulnerable', dur: 4 } }),
        actions2: strike(0.38, 0.24, { shape: 'rect', len: 300, w: 60 }, { dmg: 115, posture: 80, kb: 300, fx: 'thrust', status: { id: 'vulnerable', dur: 5 } }) },
      { id: 'feijiang_pounce', name: '飛將撲', short: '飛將撲', tags: ['gap', 'fast'], range: [90, 390], cd: 4.5, cost: 25, track: 7, recovery: 0.55,
        actions: dashStrike(0.42, 0.42, 350, 70, 0.16, { dmg: 105, posture: 40, kb: 320 }, { fx: 'slashline' }),
        actions2: dashStrike(0.38, 0.38, 390, 75, 0.15, { dmg: 120, posture: 45, kb: 360 }, { fx: 'slashline' }) },
      { id: 'hammer_parry', name: '鎚頂', short: '鎚頂', tags: ['counter', 'defensive'], range: [0, 210], cd: 6.5, cost: 12, track: 8, recovery: 0.45,
        actions: [{ do: 'counter', at: 0, dur: 0.6, dmg: 155, posture: 65, name: '鎚頂・破軍', fx: { id: 'pojun', el: 'blood' }, slowmo: 0.3 },
          ...strike(0.85, 0.22, { shape: 'rect', len: 180, w: 50 }, { dmg: 95, posture: 35, kb: 280, fx: 'thrust' })],
        actions2: [{ do: 'counter', at: 0, dur: 0.6, dmg: 175, posture: 75, name: '鎚頂・萬夫莫敵', fx: { id: 'pojun', el: 'blood' }, slowmo: 0.3 },
          ...strike(0.8, 0.18, { shape: 'rect', len: 200, w: 55 }, { dmg: 110, posture: 40, kb: 320, fx: 'thrust' })] },
      { id: 'tiankui_lite', name: '天喰・未完成', short: '天喰・未', tags: ['melee', 'aoe'], range: [0, 320], cd: 6.0, cost: 28, track: 5, recovery: 0.7,
        actions: [{ do: 'tele', at: 0.2, dur: 0.55, shape: 'rect', len: 330, w: 90, follow: true },
          { do: 'hit', at: 0.75, shape: 'rect', len: 330, w: 90, dmg: 150, posture: 50, kb: 460, fx: { id: 'skyrend', el: 'blood', scale: 0.8 } }],
        actions2: [{ do: 'tele', at: 0.15, dur: 0.5, shape: 'rect', len: 360, w: 100, follow: true },
          { do: 'hit', at: 0.65, shape: 'rect', len: 360, w: 100, dmg: 170, posture: 60, kb: 520, fx: { id: 'skyrend', el: 'blood', scale: 0.95 } }] },
      { id: 'halberd_whirl', name: '戟旋', short: '戟旋', tags: ['melee', 'aoe'], range: [0, 160], cd: 3.8, cost: 20, track: 5, creep: 0.3, recovery: 0.5,
        actions: strike(0.42, 0.35, { shape: 'circle', r: 160 }, { dmg: 95, posture: 30, kb: 300, fx: 'whirl' }),
        actions2: [...strike(0.38, 0.32, { shape: 'circle', r: 165 }, { dmg: 85, posture: 26, kb: 220, fx: 'whirl' }),
          ...strike(0.76, 0.28, { shape: 'circle', r: 180 }, { dmg: 105, posture: 34, kb: 360, fx: 'whirl' })] },
      { id: 'chitu_charge', name: '赤兔奔襲', short: '赤兔', phase: 2, tags: ['gap', 'melee'], range: [60, 260], cd: 7.0, cost: 26, track: 6, recovery: 0.6,
        actions: [{ do: 'circle', at: 0.2, dur: 1.2, r: 70, hit: { dmg: 45, posture: 15, kb: 150 } },
          ...strike(0.45, 0.2, { shape: 'rect', len: 160, w: 120 }, { dmg: 50, posture: 18, kb: 160, fx: 'thrust' }),
          ...strike(0.8, 0.2, { shape: 'rect', len: 160, w: 120 }, { dmg: 50, posture: 18, kb: 160, fx: 'thrust' }),
          ...strike(1.15, 0.2, { shape: 'rect', len: 170, w: 130 }, { dmg: 70, posture: 25, kb: 300, fx: 'thrust' })] },
      { id: 'unbroken', name: '斷腿不退', short: '不退', phase: 2, tags: ['defensive'], range: [0, 400], cd: 13.0, cost: 15, recovery: 0.35,
        actions: [{ do: 'hit', at: 0.2, shape: 'circle', r: 90, dmg: 0, posture: 15, kb: 220, fx: { id: 'bloodroar', el: 'blood' } },
          { do: 'status', at: 0.2, id: 'shield', dur: 4, value: 160 },
          { do: 'status', at: 0.2, id: 'enrage', dur: 4 }] },
    ],
    ultimate: {
      id: 'ult', name: '天喰', name2: '天喰・赤兔奔騰', ult: true, range: [0, 950], track: 4, recovery: 0.9,
      actions: [
        { do: 'tele', at: 0.2, dur: 1.3, shape: 'rect', len: 1200, w: 130, follow: true, lockBefore: 0.35, chargeFx: 'ultcast' },
        { do: 'hit', at: 1.5, shape: 'rect', len: 1200, w: 150, dmg: 285, posture: 85, kb: 650, fx: { id: 'skyrend', el: 'blood', scale: 1.4 } },
      ],
      actions2: [
        { do: 'tele', at: 0.1, dur: 0.45, shape: 'rect', len: 480, w: 85, follow: true },
        { do: 'dash', at: 0.55, dist: 480, dur: 0.28, hit: { dmg: 95, posture: 35, kb: 320 }, iframe: true, fx: { id: 'hoofcharge', el: 'blood', scale: 1.3 } },
        { do: 'tele', at: 0.9, dur: 0.9, shape: 'rect', len: 1200, w: 140, follow: true, lockBefore: 0.25, chargeFx: 'ultcast' },
        { do: 'hit', at: 1.8, shape: 'rect', len: 1200, w: 160, dmg: 320, posture: 95, kb: 750, fx: { id: 'skyrend', el: 'blood', scale: 1.6 } },
      ],
      desc: '一階段「天喰」：方天畫戟引動狂瀾，劃破全場的深紅軌跡後斬出撕裂戰場的終極巨劈；二階段「天喰・赤兔奔騰」：赤兔烈火奔騰衝鋒穿透戰場，隨後全力斬落天地皆喰的毀滅巨刃。',
    },
  };

  BD.registerBoss(lubu);
})(typeof window !== 'undefined' ? window : globalThis);
