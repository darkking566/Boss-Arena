'use strict';
// Boss 資料：亞當（《終末的女武神》第 2 回戰：人類始祖、「正真正銘的拳骨主義」）；考據見 docs/bosses/adam.md
// 核心：神虛視——見切架式看穿對手出招，把整招複製成自己的反擊（trait 'reflect'）；二階段眼睛過載（眼鼻耳流血），將死時死立不倒。
// 元素：一階段 lightning（拳速的藍白殘光）、時間之拳 holy（金）、模仿蛇神之爪 poison（墨綠）、神虛視 replica（粉紅）、二階段 blood。
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;
  const BLOOD = { el: 'blood' };

  // 連續出拳：n 記小傷害的連打（同一個判定形狀，從 t0 起；間隔 gap 每拳再乘 ratio——小於 1 即越打越快）
  function flurry(t0, n, gap, shape, hit, fx, ratio) {
    const out = []; let t = t0, g = gap;
    for (let i = 0; i < n; i++) { out.push(Object.assign({ do: 'hit', at: +t.toFixed(3) }, shape, hit, { fx })); t += g; g *= ratio || 1; }
    return out;
  }

  const adam = {
    id: 'adam', name: '亞當', title: '人類始祖', archetype: '神虛視・拳骨主義',
    desc: '神按自己的形象造出的第一個人類、全人類之父，白金髮色的纖瘦青年，只用一片樹葉蔽體。右手戴著瑞吉蕾芙化成的銀色手指虎，以神虛視看穿並完整複製神的招式；為了「保護孩子們」而出拳，眼睛過載、甚至死去之後，也要站著打到最後。',
    color: '#e6d58a', color2: '#4a3a28', glow: '#ff6f8f', style: 'adam',
    radius: 37, maxHp: 1850, speed: 205, turn: 6, mass: 1.1, fxEl: 'lightning', hurt: 'flesh',
    traits: ['reflect', 'counter'], // reflect：神虛視（先判定）；counter：沒有可複製的招式時退回固定反斬
    stamina: { max: 120, regen: 30 }, posture: 150, dodgeCost: 18, dodgeSpeed: 540,
    ai: {
      prefRange: [70, 190],
      aggression: 0.7,
      dodge: 0.5,
      precision: 0.8,
      reaction: 0.2,
      strafe: 0.7,
      walk: 0.6,
      feint: 0.1,
      delay: 0.3,
      retreat: 0.05,
      punish: 0.75,
      nervous: 0.04,
      patience: 0.5,
      read: 0.7,
      counter: 0.95,
      combos: [
        { id: 'jab_axe', name: '亞光速連打', phase: 1, weight: 1.3, steps: [
          { skill: 'jab_combo' },
          { skill: 'divine_axe', cancel: 0.35, branch: [
            { when: { landed: true }, do: 'extend' },
            { chance: 0.4, do: 'delay', hold: [0.25, 0.5] },
            { do: 'stop' }] }] },
        { id: 'rush', name: '始祖疾拳', phase: 1, weight: 1.0, steps: [
          { skill: 'leaf_rush' },
          { skill: 'jab_combo', cancel: 0.3, branch: [
            { when: { dist: [0, 170] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'axe_meteor', name: '神斧流星', weight: 1.2, steps: [
          { skill: 'divine_axe' },
          { skill: 'meteor_jab', cancel: 0.4, branch: [
            { when: { dist: [0, 240] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'clash', name: '我慢比べ', phase: 2, weight: 1.4, steps: [
          { skill: 'endurance_clash' },
          { skill: 'divine_axe', cancel: 0.4, branch: [
            { when: { landed: true }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'trueright', name: '真・神之右', phase: 2, weight: 1.1, steps: [
          { skill: 'true_right' },
          { skill: 'meteor_jab', cancel: 0.35, branch: [
            { when: { dist: [0, 240] }, do: 'extend' },
            { when: { dist: [240, 700] }, do: 'switch', skill: 'time_fist' },
            { do: 'stop' }] }] },
      ],
    },
    phase2: {
      speedMul: 1.15, dmgMul: 1.2, cdMul: 0.8, fxEl: 'blood', transDur: 2.2, roarAt: 1.0, transFx: { id: 'divinesight', el: 'replica' },
      line: '……哪裡有嬰兒在哭。沒事的，別哭——誰敢嚇你，爸爸就去收拾他。',
      note: '神虛視用到極限、眼睛開始過載：每次複製都會損耗生命，但複製的招式更快更重；亞當也將死立不倒——生命耗盡時鎖在 1 點、4 秒內無敵並全力出拳；連打多一拳、神之斧範圍加大、超越時間之拳更痛，解鎖「我慢比べ」「真・神之右」',
    },
    skills: [
      // 原作：能以亞光速的直拳互毆（複製宙斯的亞光速 Jab）
      { id: 'jab_combo', name: '亞光速直拳', short: '直拳', tags: ['melee', 'fast'], range: [0, 175], cd: 3.0, cost: 18, track: 8, creep: 0.35, recovery: 0.45,
        actions: [...strike(0.32, 0.22, { shape: 'rect', len: 165, w: 80 }, { dmg: 52, posture: 14, kb: 140, fx: 'thrust' }),
          ...strike(0.58, 0.2, { shape: 'rect', len: 165, w: 80 }, { dmg: 52, posture: 14, kb: 140, fx: 'thrust' }),
          ...strike(0.86, 0.24, { shape: 'rect', len: 195, w: 100 }, { dmg: 74, posture: 24, kb: 320, fx: { id: 'thrust', scale: 1.2 } })],
        actions2: [...strike(0.28, 0.2, { shape: 'rect', len: 175, w: 80 }, { dmg: 52, posture: 14, kb: 140, fx: 'thrust' }),
          ...strike(0.5, 0.18, { shape: 'rect', len: 175, w: 80 }, { dmg: 52, posture: 14, kb: 140, fx: 'thrust' }),
          ...strike(0.72, 0.18, { shape: 'rect', len: 175, w: 80 }, { dmg: 56, posture: 14, kb: 140, fx: 'thrust' }),
          ...strike(1.0, 0.24, { shape: 'rect', len: 210, w: 105 }, { dmg: 80, posture: 26, kb: 340, fx: { id: 'thrust', scale: 1.3 } })] },
      // 原作：黃昏流星群（メテオジャブ）——連打每一拳都比上一拳快 10 倍，由 0.01 秒加速到 0.00000001 秒；遊戲中間隔逐拳縮短
      { id: 'meteor_jab', name: '黃昏流星群・複製', short: '流星拳', tags: ['melee', 'fast'], range: [0, 235], cd: 6.5, cost: 26, track: 7, recovery: 0.75,
        actions: [{ do: 'tele', at: 0.05, dur: 0.45, shape: 'rect', len: 235, w: 105, follow: true },
          ...flurry(0.5, 9, 0.14, { shape: 'rect', len: 235, w: 105 }, { dmg: 17, posture: 6, kb: 40 }, 'projhit', 0.8),
          ...strike(1.3, 0.2, { shape: 'rect', len: 260, w: 120 }, { dmg: 56, posture: 24, kb: 420, fx: { id: 'thrust', scale: 1.5 } })],
        actions2: [{ do: 'tele', at: 0.05, dur: 0.4, shape: 'rect', len: 255, w: 110, follow: true },
          ...flurry(0.45, 12, 0.12, { shape: 'rect', len: 255, w: 110 }, { dmg: 16, posture: 6, kb: 40 }, 'projhit', 0.82),
          ...strike(1.3, 0.18, { shape: 'rect', len: 280, w: 125 }, { dmg: 60, posture: 26, kb: 450, fx: { id: 'thrust', scale: 1.6 } })] },
      // 原作：神之斧（神の斧）——快如閃電、可把對手一分為二的下段掃踢，藏在亞光速 Jab 之後（造型畫出掃踢的腿）
      { id: 'divine_axe', name: '神之斧・複製', short: '神斧', tags: ['melee', 'aoe'], range: [0, 235], cd: 5.0, cost: 24, track: 6, creep: 0.25, recovery: 0.65,
        actions: [...strike(0.3, 0.22, { shape: 'rect', len: 150, w: 70 }, { dmg: 46, posture: 12, kb: 100, fx: 'thrust' }),
          ...strike(0.95, 0.5, { shape: 'cone', r: 220, arc: 200 * D }, { dmg: 148, posture: 50, kb: 520, fx: { id: 'cleave', scale: 1.1 } })],
        actions2: [...strike(0.26, 0.2, { shape: 'rect', len: 155, w: 70 }, { dmg: 46, posture: 12, kb: 100, fx: 'thrust' }),
          ...strike(0.85, 0.46, { shape: 'cone', r: 250, arc: 220 * D }, { dmg: 160, posture: 55, kb: 560, fx: { id: 'cleave', scale: 1.3, el: 'blood' } })] },
      // 核心——神虛視：架式中被攻擊，就把對手整招複製後立刻打回去（trait 'reflect'）
      { id: 'divine_sight', name: '神虛視', short: '神虛視', tags: ['counter', 'defensive'], range: [0, 260], cd: 2.0, cost: 8, track: 10, recovery: 0.4,
        actions: [{ do: 'counter', at: 0, dur: 1.0, dmg: 150, posture: 55, name: '神虛視', reflect: true }],
        actions2: [{ do: 'counter', at: 0, dur: 1.2, dmg: 160, posture: 60, name: '神虛視', reflect: true }] },
      // 原作：複製科羅諾斯傳給宙斯的「超越時間之拳」，快到時間停下
      { id: 'time_fist', name: '超越時間之拳', short: '時間拳', tags: ['gap', 'melee'], range: [140, 540], cd: 11, cost: 30, track: 5, recovery: 1.1,
        actions: [{ do: 'tele', at: 0.1, dur: 0.95, shape: 'rect', len: 540, w: 80, follow: true, lockBefore: 0.3, undodgeable: true },
          { do: 'dash', at: 1.05, dist: 540, dur: 0.07, hit: { dmg: 215, posture: 70, kb: 600, undodgeable: true }, fx: { id: 'timefist', el: 'holy' } }],
        actions2: [{ do: 'tele', at: 0.1, dur: 0.85, shape: 'rect', len: 580, w: 84, follow: true, lockBefore: 0.28, undodgeable: true },
          { do: 'dash', at: 0.95, dist: 580, dur: 0.07, hit: { dmg: 240, posture: 75, kb: 640, undodgeable: true }, fx: { id: 'timefist', el: 'blood' } }] },
      // 原作（伊甸園）：模仿（模倣）——複製蛇神真身的攻擊，雙手長成三倍大、覆滿墨綠鱗片與骨爪，將蛇神撕成碎塊；演出為墨綠爪痕懸空、一齊裂開
      { id: 'serpent_shred', name: '蛇神之爪', short: '蛇爪', tags: ['aoe', 'ranged'], range: [0, 540], cd: 10, cost: 28, track: 5, recovery: 0.85,
        actions: [{ do: 'slashes', at: 0.3, n: 5, interval: 0.14, tele: 0.5, len: 380, w: 34, dmg: 30, posture: 10, fx: { id: 'threadcut', el: 'poison' },
          final: { tele: 0.6, len: 520, w: 60, dmg: 75, posture: 35, fx: { id: 'threadcut', el: 'poison', scale: 1.4 } } }],
        actions2: [{ do: 'slashes', at: 0.3, n: 7, interval: 0.12, tele: 0.5, len: 400, w: 34, dmg: 32, posture: 10, fx: { id: 'threadcut', el: 'poison' },
          final: { tele: 0.6, len: 560, w: 64, dmg: 82, posture: 40, fx: { id: 'threadcut', el: 'poison', scale: 1.5 } } }] },
      // 改編：不穿甲冑、全靠肉身的直線強襲拳（原作「正真正銘的拳骨主義」），補足近身手段。
      { id: 'leaf_rush', name: '始祖衝拳', short: '衝拳', tags: ['gap', 'melee'], range: [150, 440], cd: 4.8, cost: 24, track: 6, recovery: 0.6,
        actions: [...dashStrike(0.55, 0.42, 360, 72, 0.16, { dmg: 118, posture: 40, kb: 380 }, { fx: 'dash' }),
          ...strike(1.05, 0.26, { shape: 'cone', r: 175, arc: 110 * D }, { dmg: 82, posture: 24, kb: 300, fx: 'slash' })],
        actions2: [...dashStrike(0.48, 0.38, 420, 76, 0.14, { dmg: 130, posture: 44, kb: 420 }, { fx: 'dash' }),
          ...strike(0.95, 0.24, { shape: 'cone', r: 190, arc: 120 * D }, { dmg: 90, posture: 26, kb: 320, fx: 'slash' })] },
      // 原作台詞：「保護孩子們需要理由嗎」——改編為護盾與震開近身敵人
      { id: 'fatherly_ward', name: '為了孩子', short: '庇護', tags: ['defensive'], range: [0, 300], cd: 13, cost: 14, recovery: 0.5,
        actions: [{ do: 'hit', at: 0.3, shape: 'circle', r: 190, dmg: 0, posture: 30, kb: 420, fx: { id: 'nova', el: 'holy' }, status: { id: 'slow', dur: 1.5 } },
          { do: 'status', at: 0.3, id: 'shield', dur: 5, value: 130 }],
        actions2: [{ do: 'hit', at: 0.3, shape: 'circle', r: 210, dmg: 0, posture: 35, kb: 460, fx: { id: 'nova', el: 'blood' }, status: [{ id: 'slow', dur: 1.8 }, { id: 'vulnerable', dur: 2.5 }] },
          { do: 'status', at: 0.3, id: 'shield', dur: 5, value: 170 }] },
      // —— 二階段專屬 ——
      // 原作：宙斯變身阿陀磨須後兩人對轟、比拚誰先撐不住（我慢比べ）；亞當第一次擺出防禦姿勢
      { id: 'endurance_clash', name: '我慢比べ', short: '我慢', phase: 2, tags: ['melee', 'aoe'], range: [0, 175], cd: 11, cost: 30, track: 4, recovery: 0.95,
        actions: [{ do: 'tele', at: 0.05, dur: 0.55, shape: 'circle', r: 150, follow: true },
          { do: 'status', at: 0.5, id: 'shield', dur: 3, value: 110 },
          ...flurry(0.7, 7, 0.17, { shape: 'circle', r: 150 }, { dmg: 26, posture: 10, kb: 70 }, { id: 'slam', scale: 0.55 }),
          ...strike(2.1, 0.3, { shape: 'circle', r: 175 }, { dmg: 150, posture: 55, kb: 580, fx: { id: 'bigslam', scale: 0.95 } })] },
      // 原作：真・神之右（真・神の右）——一記傾注全力的直拳，緊接著不停歇的連打；亞當以神虛視逐拳複製還擊，眼睛因此耗盡
      { id: 'true_right', name: '真・神之右', short: '神之右', phase: 2, tags: ['melee', 'fast'], range: [0, 270], cd: 9, cost: 28, track: 6, recovery: 0.85,
        actions: [{ do: 'tele', at: 0.1, dur: 0.6, shape: 'rect', len: 270, w: 110, follow: true },
          { do: 'hit', at: 0.7, shape: 'rect', len: 270, w: 110, dmg: 125, posture: 45, kb: 480, fx: { id: 'thrust', scale: 1.5 } },
          ...flurry(0.95, 12, 0.13, { shape: 'rect', len: 270, w: 110 }, { dmg: 17, posture: 5, kb: 40 }, 'projhit', 0.85)] },
    ],
    ultimate: {
      id: 'ult', name: '神虛視・黃昏流星群', name2: '父之絕唱・死立不倒', ult: true, range: [0, 900], track: 4, recovery: 1.0,
      actions: [ // 一階段：把宙斯的拳雨放大成壓倒性的連打，最後補上超越時間之拳
        { do: 'tele', at: 0.15, dur: 1.0, shape: 'rect', len: 340, w: 170, follow: true, lockBefore: 0.3, chargeFx: 'ultcast' },
        ...flurry(1.2, 10, 0.12, { shape: 'rect', len: 340, w: 170 }, { dmg: 14, posture: 5, kb: 50 }, 'projhit', 0.85),
        { do: 'tele', at: 1.95, dur: 0.6, shape: 'rect', len: 660, w: 100, follow: true, lockBefore: 0.2, undodgeable: true },
        { do: 'dash', at: 2.55, dist: 660, dur: 0.07, hit: { dmg: 195, posture: 70, kb: 620, undodgeable: true }, fx: { id: 'timefist', el: 'holy', scale: 1.3 } },
      ],
      actions2: [ // 二階段：眼睛過載、無敵地打出全部力氣——拳雨、超越時間之拳，最後一拳砸碎地面
        { do: 'invuln', at: 0, dur: 3.3 },
        { do: 'tele', at: 0.1, dur: 0.9, shape: 'rect', len: 360, w: 180, follow: true, lockBefore: 0.3, chargeFx: 'ultcast' },
        ...flurry(1.05, 14, 0.11, { shape: 'rect', len: 360, w: 180 }, { dmg: 13, posture: 5, kb: 50 }, { id: 'projhit', el: 'blood' }, 0.87),
        { do: 'tele', at: 1.9, dur: 0.55, shape: 'rect', len: 700, w: 110, follow: true, lockBefore: 0.2, undodgeable: true },
        { do: 'dash', at: 2.45, dist: 700, dur: 0.07, hit: { dmg: 225, posture: 80, kb: 660, undodgeable: true }, fx: { id: 'timefist', el: 'blood', scale: 1.4 } },
        ...strike(3.2, 0.5, { shape: 'circle', r: 240 }, { dmg: 140, posture: 55, kb: 680, fx: { id: 'bigslam', scale: 1.4, ...BLOOD } }),
      ],
      desc: '一階段「神虛視・黃昏流星群」：越打越快的拳雨（每拳比上一拳更快），最後補上快到時間停下的「超越時間之拳」（無法閃避，橫移離開直線）；二階段「父之絕唱・死立不倒」：全程無敵，拳雨、超越時間之拳之後再以一拳震裂大地。',
    },
  };

  BD.registerBoss(adam);
})(typeof window !== 'undefined' ? window : globalThis);
