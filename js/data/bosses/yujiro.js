'use strict';
// Boss 資料：範馬勇次郎（《刃牙》系列：地上最強生物、食人魔 Ogre）；考據見 docs/bosses/yujiro.md
// 一階段「黑色功夫裝」：隨手玩弄對手的最強生物——用肉體硬扛、一看就會（trait 'learn'：同一招看過越多次越傷不了他），還會模仿郭海皇的消力（trait 'counter'）。
// 二階段「鬼背解放」：肌肉撐破上衣，背肌浮出惡鬼的面孔（phase2.status 'ogreback'），解鎖猛獸連擊與鬼貌一擊；大招「鬼哭啼」。
// 元素：一階段 physical（純粹的拳腳）、二階段 blood（鬼背的赤紅）。
(function (G) {
  const BD = G.BD, { D, strike, dashStrike, flurry } = BD.DataKit;
  const BLOOD = { el: 'blood' };

  const yujiro = {
    id: 'yujiro', name: '範馬勇次郎', title: '地上最強生物', archetype: '純粹暴力・鬼背',
    desc: '《刃牙》系列的終極反派、範馬刃牙與傑克的父親，人稱「地上最強生物」與「食人魔（Ogre）」。紅褐長髮往後梳起、濃眉與惡鬼般的笑容，平時一身黑色功夫裝；認為奧義與秘技都是「雜質」，只信純粹的肉體與暴力。認真起來肌肉撐破衣服，背上浮出一張惡鬼的面孔。',
    color: '#e8654d', color2: '#a8332a', glow: '#ff4a33', style: 'yujiro',
    radius: 30, maxHp: 2450, speed: 225, turn: 6.5, mass: 1.6, fxEl: 'physical', hurt: 'flesh',
    traits: ['learn', 'counter'], // 一看就會：同一招看過越多次越傷不了他；消力：見切架式被攻擊時反擊（js/engine/traits.js）
    stamina: { max: 130, regen: 32 }, posture: 215, dodgeCost: 18, dodgeSpeed: 540,
    ai: {
      prefRange: [70, 220],
      aggression: 0.85,
      dodge: 0.18,
      precision: 0.8,
      reaction: 0.2,
      strafe: 0.4,
      walk: 0.75,
      feint: 0.1,
      delay: 0.35,
      retreat: 0.0,
      punish: 0.75,
      nervous: 0.0,
      patience: 0.4,
      read: 0.7,
      // 不閃不退、邊走邊揍：用踢技與連打一段接一段地逼近，破綻處一記重擊
      combos: [
        { id: 'flick_axe', name: '彈指・踵落', phase: 1, weight: 1.2, steps: [
          { skill: 'finger_flick' },
          { skill: 'axe_kick', cancel: 0.3, branch: [
            { when: { dist: [0, 260] }, do: 'extend' },
            { chance: 0.4, do: 'delay', hold: [0.3, 0.55] },
            { do: 'stop' }] }] },
        { id: 'whip_back', name: '鞭打・裏拳・迴旋踢', weight: 1.3, steps: [
          { skill: 'whip_strike' },
          { skill: 'backhand', cancel: 0.3, branch: [
            { when: { landed: true }, do: 'extend' },
            { when: { dist: [0, 200] }, chance: 0.6, do: 'extend' },
            { do: 'stop' }] },
          { skill: 'roll_kick', cancel: 0.3, branch: [
            { when: { landed: true }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'eardrum_hug', name: '鼓膜・熊抱', phase: 1, weight: 1.0, steps: [
          { skill: 'eardrum' },
          { skill: 'bear_hug', cancel: 0.3, branch: [
            { when: { landed: true }, do: 'extend' },
            { when: { dist: [0, 160] }, chance: 0.5, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'roll_hug', name: '迴旋踢・熊抱', phase: 1, weight: 1.0, steps: [
          { skill: 'roll_kick' },
          { skill: 'bear_hug', cancel: 0.35, branch: [
            { when: { landed: true }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'flex_quake', name: '震樓・止震', phase: 2, weight: 0.9, steps: [
          { skill: 'flex' },
          { skill: 'quake_stop', cancel: 0.4, branch: [
            { when: { dist: [60, 380] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'beast_rush', name: '猛獸連擊・鬼貌', phase: 2, weight: 1.5, steps: [
          { skill: 'beast_barrage' },
          { skill: 'demon_blow', cancel: 0.4, branch: [
            { when: { dist: [0, 300] }, do: 'extend' },
            { when: { dist: [300, 640] }, do: 'switch', skill: 'finger_flick' },
            { do: 'stop' }] }] },
        { id: 'ogre_feast', name: '食人魔・咬碎', phase: 2, weight: 1.2, steps: [
          { skill: 'bite' },
          { skill: 'bear_hug', cancel: 0.3, branch: [
            { when: { landed: true }, do: 'extend' },
            { do: 'stop' }] },
          { skill: 'quake_stop', cancel: 0.3, branch: [
            { when: { landed: true, dist: [0, 300] }, do: 'extend' },
            { chance: 0.5, do: 'extend' },
            { do: 'stop' }] }] },
      ],
    },
    phase2: {
      speedMul: 1.15, dmgMul: 1.1, cdMul: 0.82, fxEl: 'blood', transDur: 2.8, roarAt: 1.7, transFx: { id: 'ogreback', el: 'blood' },
      status: { id: 'ogreback' },
      line: '……不錯，好久沒有這種味道了。這副身體就讓你們看個夠——吃下去之前，先好好欣賞吧。',
      note: '肌肉撐破上衣，背肌浮出惡鬼的面孔：承受傷害降低，踵落多一道震波、指彈變成兩連、鞭打更多下、止震之拳多一圈；解鎖「猛獸連擊」與「鬼貌一擊」',
    },
    skills: [
      // 原作：彈指——一根手指的威力就能把對手打飛（對查莫安、少年阿萊）；遊戲中為遠距離的氣彈直線
      { id: 'finger_flick', name: '彈指', short: '彈指', tags: ['ranged', 'fast'], range: [150, 560], cd: 4.5, cost: 12, track: 9, recovery: 0.4,
        actions: [...strike(0.42, 0.34, { shape: 'rect', len: 560, w: 38 }, { dmg: 64, posture: 22, kb: 280, fx: { id: 'fingerflick', scale: 1.3 } })],
        actions2: [...strike(0.38, 0.3, { shape: 'rect', len: 580, w: 42 }, { dmg: 58, posture: 20, kb: 200, fx: { id: 'fingerflick', scale: 1.3, ...BLOOD } }),
          ...strike(0.7, 0.26, { shape: 'rect', len: 600, w: 46 }, { dmg: 66, posture: 22, kb: 300, fx: { id: 'fingerflick', scale: 1.4, ...BLOOD } })] },
      // 原作：踵落（Axe Kick）——勇次郎最常用的招式（對郭海皇等）；二階段落地再炸出一圈震波
      { id: 'axe_kick', name: '踵落', short: '踵落', tags: ['melee', 'aoe'], range: [0, 230], cd: 5.2, cost: 24, track: 6, creep: 0.3, recovery: 0.7,
        actions: [...strike(0.62, 0.5, { shape: 'circle', r: 120, off: 105 }, { dmg: 150, posture: 56, kb: 470, fx: { id: 'heelstomp', scale: 0.9 } })],
        actions2: [...strike(0.58, 0.46, { shape: 'circle', r: 130, off: 105 }, { dmg: 160, posture: 60, kb: 500, fx: { id: 'heelstomp', scale: 1.05, ...BLOOD } }),
          { do: 'tele', at: 0.8, dur: 0.3, shape: 'ring', r0: 125, r: 290, off: 105, follow: true },
          { do: 'hit', at: 1.1, shape: 'ring', r0: 125, r: 290, off: 105, dmg: 55, posture: 16, kb: 300, fx: { id: 'ring', ...BLOOD } }] },
      // 原作：裏拳（Backhand Blow）——隨手一揮就把小篠與柳打飛
      { id: 'backhand', name: '裏拳', short: '裏拳', tags: ['melee', 'fast'], range: [0, 190], cd: 3.8, cost: 16, track: 8, creep: 0.3, recovery: 0.5,
        actions: [...strike(0.3, 0.22, { shape: 'cone', r: 175, arc: 150 * D }, { dmg: 94, posture: 34, kb: 560, fx: 'backfist' })],
        actions2: [...strike(0.26, 0.2, { shape: 'cone', r: 185, arc: 160 * D }, { dmg: 90, posture: 32, kb: 360, fx: { id: 'backfist', ...BLOOD } }),
          ...strike(0.66, 0.2, { shape: 'cone', r: 195, arc: 170 * D }, { dmg: 100, posture: 36, kb: 600, fx: { id: 'backfist', scale: 1.2, ...BLOOD } })] },
      // 原作：鞭打（Whip Strike）——向柳龍光學的鞭打，罵它是「女人小孩的護身技」，卻比原版更快更狠
      { id: 'whip_strike', name: '鞭打', short: '鞭打', tags: ['melee', 'fast'], range: [60, 330], cd: 6.2, cost: 22, track: 7, recovery: 0.6,
        actions: [{ do: 'tele', at: 0.05, dur: 0.4, shape: 'rect', len: 330, w: 60, follow: true },
          ...flurry(0.45, 4, 0.14, { shape: 'rect', len: 330, w: 60 }, { dmg: 34, posture: 11, kb: 60 }, { id: 'whiplash', scale: 0.8 }, 0.92)],
        actions2: [{ do: 'tele', at: 0.05, dur: 0.36, shape: 'rect', len: 350, w: 64, follow: true },
          ...flurry(0.41, 6, 0.12, { shape: 'rect', len: 350, w: 64 }, { dmg: 32, posture: 11, kb: 60 }, { id: 'whiplash', scale: 0.9, ...BLOOD }, 0.92)] },
      // 原作：滾踢（Roll Kick，對刃牙）——貼身旋身一踢
      { id: 'roll_kick', name: '迴旋踢', short: '迴旋', tags: ['gap', 'melee'], range: [80, 360], cd: 6.5, cost: 24, track: 7, recovery: 0.65,
        actions: [...dashStrike(0.4, 0.35, 190, 70, 0.12, { dmg: 60, posture: 20, kb: 160 }, {}),
          ...strike(0.95, 0.4, { shape: 'circle', r: 175 }, { dmg: 126, posture: 46, kb: 520, fx: { id: 'rollkick', scale: 0.9 } })],
        actions2: [...dashStrike(0.36, 0.32, 210, 74, 0.1, { dmg: 60, posture: 20, kb: 160 }, {}),
          ...strike(0.88, 0.36, { shape: 'circle', r: 190 }, { dmg: 140, posture: 50, kb: 560, fx: { id: 'rollkick', scale: 1.05, ...BLOOD } })] },
      // 原作：噛みつき——咬了傑克一口、出生時還咬了母親的乳房；遊戲中衝過去一口咬住，傷口流血不止
      { id: 'bite', name: '噛みつき', short: '噛咬', tags: ['gap', 'melee'], range: [100, 400], cd: 8.5, cost: 22, track: 7, recovery: 0.7,
        actions: [...dashStrike(0.45, 0.4, 260, 70, 0.1, { dmg: 40, posture: 14, kb: 80 }, {}),
          ...strike(0.9, 0.3, { shape: 'circle', r: 95 }, { dmg: 92, posture: 30, kb: 120, fx: { id: 'fangbite', scale: 1.6, el: 'blood' }, status: { id: 'bleed', stacks: 50, dur: 8 } })],
        actions2: [...dashStrike(0.4, 0.34, 280, 74, 0.09, { dmg: 40, posture: 14, kb: 80 }, {}),
          ...strike(0.8, 0.28, { shape: 'circle', r: 105 }, { dmg: 100, posture: 32, kb: 120, fx: { id: 'fangbite', scale: 1.8, el: 'blood' }, status: { id: 'bleed', stacks: 60, dur: 8 } })] },
      // 原作：熊抱（對刃牙的最後一擊）——抱住不斷收緊，直到肋骨一根根斷裂；遊戲中翻滾脫離就能掙開
      { id: 'bear_hug', name: '熊抱', short: '熊抱', tags: ['melee'], range: [0, 150], cd: 10, cost: 26, track: 6, recovery: 0.9,
        actions: [{ do: 'tele', at: 0.1, dur: 0.65, shape: 'circle', r: 100, follow: true },
          { do: 'hit', at: 0.75, shape: 'circle', r: 100, dmg: 34, posture: 14, kb: 0, fx: { id: 'bearhug', scale: 0.8 } },
          { do: 'hit', at: 1.05, shape: 'circle', r: 100, dmg: 34, posture: 14, kb: 0, fx: { id: 'bearhug', scale: 0.9 } },
          { do: 'hit', at: 1.35, shape: 'circle', r: 100, dmg: 34, posture: 14, kb: 0, fx: { id: 'bearhug', scale: 1.0 } },
          { do: 'hit', at: 1.75, shape: 'circle', r: 110, dmg: 120, posture: 50, kb: 560, fx: { id: 'bearhug', scale: 1.5 } }],
        actions2: [{ do: 'tele', at: 0.1, dur: 0.55, shape: 'circle', r: 105, follow: true },
          { do: 'hit', at: 0.65, shape: 'circle', r: 105, dmg: 36, posture: 14, kb: 0, fx: { id: 'bearhug', scale: 0.9, ...BLOOD } },
          { do: 'hit', at: 0.9, shape: 'circle', r: 105, dmg: 36, posture: 14, kb: 0, fx: { id: 'bearhug', scale: 1.0, ...BLOOD } },
          { do: 'hit', at: 1.15, shape: 'circle', r: 105, dmg: 36, posture: 14, kb: 0, fx: { id: 'bearhug', scale: 1.1, ...BLOOD } },
          { do: 'hit', at: 1.5, shape: 'circle', r: 115, dmg: 135, posture: 55, kb: 600, fx: { id: 'bearhug', scale: 1.7, ...BLOOD } }] },
      // 原作：鼓膜破壞——雙掌拍擊耳朵，震破對手的鼓膜（對江珠、獨步、刃牙）；遊戲中耳鳴＝易傷與緩速
      { id: 'eardrum', name: '鼓膜破壞', short: '鼓膜', tags: ['melee'], range: [0, 150], cd: 9, cost: 18, track: 6, recovery: 0.55,
        actions: [...strike(0.4, 0.32, { shape: 'circle', r: 120 }, { dmg: 55, posture: 40, kb: 260, fx: { id: 'eardrum', scale: 0.9 }, status: [{ id: 'vulnerable', dur: 4 }, { id: 'slow', dur: 1.5 }] })],
        actions2: [...strike(0.36, 0.3, { shape: 'circle', r: 135 }, { dmg: 60, posture: 44, kb: 300, fx: { id: 'eardrum', scale: 1.0, ...BLOOD }, status: [{ id: 'vulnerable', dur: 5 }, { id: 'slow', dur: 2 }] })] },
      // 原作：一拳打在地上，停下了正在發生的地震——「是我的拳頭停下的」；遊戲中拳落處震波一圈圈向外
      { id: 'quake_stop', name: '止震之拳', short: '止震', tags: ['melee', 'aoe'], range: [0, 300], cd: 9.5, cost: 30, track: 5, recovery: 0.9,
        actions: [...strike(0.85, 0.55, { shape: 'circle', r: 140, off: 85 }, { dmg: 138, posture: 50, kb: 460, fx: { id: 'stillquake', scale: 0.9 } }),
          { do: 'tele', at: 0.9, dur: 0.4, shape: 'ring', r0: 135, r: 340, off: 85, follow: true },
          { do: 'hit', at: 1.3, shape: 'ring', r0: 135, r: 340, off: 85, dmg: 62, posture: 18, kb: 340, fx: 'ring' }],
        actions2: [...strike(0.8, 0.52, { shape: 'circle', r: 150, off: 85 }, { dmg: 150, posture: 54, kb: 500, fx: { id: 'stillquake', scale: 1.1, ...BLOOD } }),
          { do: 'tele', at: 0.85, dur: 0.4, shape: 'ring', r0: 145, r: 340, off: 85, follow: true },
          { do: 'hit', at: 1.25, shape: 'ring', r0: 145, r: 340, off: 85, dmg: 60, posture: 18, kb: 340, fx: { id: 'ring', ...BLOOD } },
          { do: 'tele', at: 1.3, dur: 0.35, shape: 'ring', r0: 335, r: 500, off: 85, follow: true },
          { do: 'hit', at: 1.65, shape: 'ring', r0: 335, r: 500, off: 85, dmg: 55, posture: 16, kb: 300, fx: { id: 'ring', scale: 1.2, ...BLOOD } }] },
      // 原作：消力——勇次郎看一眼就學會了郭海皇的「消力」（卸力）；遊戲中為見切架式，被攻擊時卸開來勢並反擊
      { id: 'xiaoli', name: '消力', short: '消力', tags: ['counter'], range: [0, 320], cd: 8, cost: 10, track: 8, recovery: 0.45,
        actions: [{ do: 'counter', at: 0, dur: 0.95, dmg: 150, posture: 60, name: '消力・返', fx: 'dissolve', slowmo: 0.3 }],
        actions2: [{ do: 'counter', at: 0, dur: 1.05, dmg: 165, posture: 66, name: '消力・返', fx: { id: 'dissolve', ...BLOOD }, slowmo: 0.3 }] },
      // 原作：緊繃肌肉就能震動整棟建築（「其實是氣場」）；遊戲中肌肉鼓動、震開近身的對手並進入戰鬥狀態
      { id: 'flex', name: '震樓之軀', short: '鼓動', tags: ['defensive'], range: [0, 300], cd: 14, cost: 12, recovery: 0.5,
        actions: [{ do: 'hit', at: 0.45, shape: 'circle', r: 210, dmg: 0, posture: 30, kb: 380, fx: { id: 'flexpulse', el: 'physical' }, status: { id: 'slow', dur: 1.5 } },
          { do: 'status', at: 0.45, id: 'shield', dur: 5, value: 120 },
          { do: 'status', at: 0.45, id: 'enrage', dur: 4 }],
        actions2: [{ do: 'hit', at: 0.4, shape: 'circle', r: 250, dmg: 0, posture: 36, kb: 440, fx: { id: 'flexpulse', ...BLOOD }, status: [{ id: 'slow', dur: 2 }, { id: 'vulnerable', dur: 3 }] },
          { do: 'status', at: 0.4, id: 'shield', dur: 5, value: 150 },
          { do: 'status', at: 0.4, id: 'enrage', dur: 4 }] },
      // —— 二階段專屬 ——
      // 原作：猛獸的連擊（鬼背解放後的亂打）——背肌浮出鬼臉，一拳接一拳不留空隙
      { id: 'beast_barrage', name: '猛獸連擊', short: '猛獸', phase: 2, tags: ['melee', 'fast'], range: [0, 290], cd: 8, cost: 28, track: 6, recovery: 0.85,
        actions: [{ do: 'tele', at: 0.1, dur: 0.55, shape: 'rect', len: 290, w: 130, follow: true },
          { do: 'hit', at: 0.65, shape: 'rect', len: 290, w: 130, dmg: 100, posture: 38, kb: 260, fx: { id: 'beastclaw', scale: 1.1, ...BLOOD } },
          ...flurry(0.85, 13, 0.1, { shape: 'rect', len: 290, w: 130 }, { dmg: 15, posture: 5, kb: 40 }, { id: 'beastclaw', ...BLOOD }, 0.94),
          ...strike(2.25, 0.25, { shape: 'rect', len: 330, w: 150 }, { dmg: 88, posture: 32, kb: 540, fx: { id: 'beastclaw', scale: 1.4, ...BLOOD } })] },
      // 原作：鬼之貌（鬼背全開）的一擊——打在身上就是「惡魔的領域」，能讓任何戰鬥瞬間結束
      { id: 'demon_blow', name: '鬼貌一擊', short: '鬼貌', phase: 2, tags: ['gap', 'melee'], range: [60, 420], cd: 11, cost: 32, track: 5, recovery: 1.0,
        actions: [{ do: 'tele', at: 0.1, dur: 0.85, shape: 'rect', len: 420, w: 120, follow: true, lockBefore: 0.25, chargeFx: { id: 'pressure', ...BLOOD } },
          { do: 'dash', at: 0.95, dist: 420, dur: 0.09, hit: { dmg: 230, posture: 80, kb: 680 }, fx: { id: 'demonface', scale: 0.85, ...BLOOD } }] },
    ],
    ultimate: {
      id: 'ult', name: '地上最強的一擊', name2: '鬼哭啼', ult: true, range: [0, 900], track: 4, recovery: 1.1,
      actions: [ // 一階段：以快到看不見的步伐瞬間出現在對手背後，威壓把對手拖慢，然後是撼動整個競技場的一拳（核爆般的震波一圈圈外推）
        { do: 'status', at: 0.2, id: 'slow', dur: 1.9, target: 'enemy' },
        { do: 'appear', at: 0.25, dist: 120 },
        { do: 'tele', at: 0.35, dur: 1.15, shape: 'circle', r: 170, follow: true, chargeFx: { id: 'pressure', el: 'physical' } },
        { do: 'hit', at: 1.5, shape: 'circle', r: 170, dmg: 250, posture: 90, kb: 700, fx: { id: 'ultfist', scale: 1.1 } },
        { do: 'tele', at: 1.55, dur: 0.4, shape: 'ring', r0: 165, r: 480, follow: true },
        { do: 'hit', at: 1.95, shape: 'ring', r0: 165, r: 480, dmg: 90, posture: 30, kb: 480, fx: 'ring' },
      ],
      actions2: [ // 二階段「鬼哭啼」：瞬身到對手背後，鬼臉扭曲痛哭、全程無敵——威壓、無盡亂打，最後一拳把大地打凹下去
        { do: 'invuln', at: 0, dur: 4.0 },
        { do: 'appear', at: 0.2, dist: 110 },
        { do: 'tele', at: 0.3, dur: 0.85, shape: 'rect', len: 400, w: 200, follow: true, lockBefore: 0.3, chargeFx: { id: 'pressure', ...BLOOD } },
        { do: 'hit', at: 1.15, shape: 'rect', len: 400, w: 200, dmg: 110, posture: 40, kb: 120, fx: { id: 'beastclaw', scale: 1.5, ...BLOOD } },
        ...flurry(1.35, 15, 0.1, { shape: 'rect', len: 400, w: 200 }, { dmg: 13, posture: 5, kb: 40 }, { id: 'beastclaw', ...BLOOD }, 0.93),
        { do: 'tele', at: 2.7, dur: 0.8, shape: 'circle', r: 280, follow: true },
        { do: 'hit', at: 3.5, shape: 'circle', r: 280, dmg: 230, posture: 90, kb: 760, fx: { id: 'ogrewail', scale: 1.5, ...BLOOD } },
      ],
      desc: '一階段「地上最強的一擊」：對手被威壓拖慢，接著一拳砸出核爆般的震波，一圈圈把整個競技場外推（橫移或翻滾躲開中心，再穿過外圈）；二階段「鬼哭啼」：鬼背的面孔扭曲痛哭，全程無敵地打出無盡亂拳，最後一拳把大地打凹下去。',
    },
  };

  BD.registerBoss(yujiro);
})(typeof window !== 'undefined' ? window : globalThis);
