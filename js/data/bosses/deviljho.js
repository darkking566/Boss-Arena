'use strict';
// Boss 資料：恐暴龍 Deviljho（《魔物獵人：世界》——「健啖的惡魔」，什麼都吃的流浪暴食者）；考據見 docs/bosses/deviljho.md
// 一階段「飢餓的掠食者」：深苔綠的巨驅、滿嘴涎液——啃咬帶「腐蝕涎液」（易傷）、咬到肉就回血；甩尾、五連衝、鐵山靠、踩踏、投石都是原作招式。
// 二階段「暴怒」：筋肉膨脹、全身泛紅（phase2.status 'jhorage'），口中溢出龍屬性能量：解鎖龍息（龍封：削弱對手傷害）、連踏・龍爆；大招換成橫掃一圈的龍息。
// 元素：一階段 physical（純粹的蠻力）、二階段 dragon（龍屬性）。
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;
  const DROOL = { id: 'vulnerable', dur: 4 };   // 腐蝕涎液：原作的「防禦力 DOWN」
  const BLIGHT = { id: 'dragonblight', dur: 6 }; // 龍息的龍封
  // 龍息橫掃：n 個接力的扇形從 from 轉到 from − step×(n−1)（相對面向），每個扇形一記小傷害 + 龍封
  function sweep(t0, n, gap, from, step, arc, r, hit, scale) {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(Object.assign({ do: 'hit', at: +(t0 + i * gap).toFixed(3), shape: 'cone', r, arc: arc * D, angOff: (from - i * step) * D, status: BLIGHT, fx: { id: 'dragonbreath', scale } }, hit));
    }
    return out;
  }

  const deviljho = {
    id: 'deviljho', name: '恐暴龍', title: '健啖的惡魔', archetype: '暴食・龍息',
    desc: '《魔物獵人》系列的流浪暴食者 Deviljho，別名「恐暴龍」。深苔綠的粗皮、背與尾排滿鋸齒狀的黃褐棘刺，窄吻配上巨大的下顎與好幾排牙，後肢壯碩、前肢細小；新陳代謝快到必須不停進食，涎液帶有腐蝕性。被激怒時背與肩的筋肉鼓脹、全身泛起赤紅，並從口中噴出龍屬性的吐息。',
    color: '#8aa064', color2: '#2f3a2a', glow: '#d0143c', style: 'deviljho',
    radius: 90, maxHp: 2700, speed: 225, turn: 4.6, mass: 2.0, fxEl: 'physical', hurt: 'flesh',
    stamina: { max: 150, regen: 34 }, posture: 235, dodgeCost: 24, dodgeSpeed: 500,
    ai: {
      prefRange: [120, 300],
      aggression: 0.9,
      dodge: 0.2,
      precision: 0.6,
      reaction: 0.3,
      strafe: 0.3,
      walk: 0.8,
      feint: 0.05,
      delay: 0.25,
      retreat: 0.0,
      punish: 0.7,
      nervous: 0.0,
      patience: 0.25,
    },
    phase2: {
      speedMul: 1.12, dmgMul: 1.12, cdMul: 0.82, fxEl: 'dragon', transDur: 2.8, roarAt: 1.8, transFx: { id: 'dragonrage', el: 'dragon' },
      status: { id: 'jhorage' },
      line: '吼——！筋肉膨脹、龍屬性的能量從口中噴湧而出……這已經不是狩獵，是吞食。',
      note: '筋肉膨脹、全身泛紅：承受傷害降低、咬勁更重；啃咬變兩連、甩尾追加第二轉、五連衝更快、衝撞留下龍炎；解鎖「龍息」與「連踏・龍爆」，大招換成橫掃一圈的龍息',
    },
    skills: [
      // 原作：前進啃咬（體力見底時的「ガブリ」）——傷害不高，但腐蝕涎液會讓防禦力下降；咬到肉就回血
      { id: 'snap', name: '前咬', short: '前咬', tags: ['melee', 'fast'], range: [40, 300], cd: 3.8, cost: 14, track: 9, creep: 0.3, recovery: 0.5,
        actions: [...strike(0.4, 0.32, { shape: 'circle', r: 105, off: 115 }, { dmg: 85, posture: 26, kb: 240, heal: 0.4, status: DROOL, fx: { id: 'devour', scale: 0.9 } })],
        actions2: [...strike(0.34, 0.28, { shape: 'circle', r: 110, off: 120 }, { dmg: 78, posture: 24, kb: 200, heal: 0.4, status: DROOL, fx: { id: 'devour', scale: 0.9 } }),
          ...strike(0.78, 0.26, { shape: 'circle', r: 115, off: 120 }, { dmg: 89, posture: 28, kb: 320, heal: 0.4, status: DROOL, fx: { id: 'devour', scale: 1.1 } })] },
      // 原作：撲咬壓制（Jump Bite）——跳上去把獵人壓在地上啃，要靠閃光彈 / 同伴打斷；遊戲中翻滾脫離就能掙開
      { id: 'jump_bite', name: '撲咬壓制', short: '撲咬', tags: ['gap', 'melee'], range: [140, 520], cd: 9.5, cost: 28, track: 8, recovery: 0.95,
        actions: [...dashStrike(0.5, 0.45, 340, 90, 0.15, { dmg: 54, posture: 16, kb: 90, status: DROOL }, {}),
          { do: 'tele', at: 0.7, dur: 0.3, shape: 'circle', r: 100, follow: true },
          { do: 'hit', at: 1.0, shape: 'circle', r: 100, dmg: 38, posture: 12, kb: 0, heal: 0.5, fx: { id: 'devour', scale: 0.8 } },
          { do: 'hit', at: 1.35, shape: 'circle', r: 100, dmg: 38, posture: 12, kb: 0, heal: 0.5, fx: { id: 'devour', scale: 0.9 } },
          { do: 'hit', at: 1.7, shape: 'circle', r: 100, dmg: 38, posture: 12, kb: 0, heal: 0.5, fx: { id: 'devour', scale: 1.0 } },
          { do: 'hit', at: 2.1, shape: 'circle', r: 110, dmg: 102, posture: 40, kb: 520, heal: 0.5, status: DROOL, fx: { id: 'devour', scale: 1.5 } }],
        actions2: [...dashStrike(0.45, 0.4, 380, 90, 0.13, { dmg: 58, posture: 16, kb: 90, status: DROOL }, {}),
          { do: 'tele', at: 0.65, dur: 0.28, shape: 'circle', r: 105, follow: true },
          { do: 'hit', at: 0.93, shape: 'circle', r: 105, dmg: 40, posture: 12, kb: 0, heal: 0.5, fx: { id: 'devour', scale: 0.9 } },
          { do: 'hit', at: 1.22, shape: 'circle', r: 105, dmg: 40, posture: 12, kb: 0, heal: 0.5, fx: { id: 'devour', scale: 1.0 } },
          { do: 'hit', at: 1.51, shape: 'circle', r: 105, dmg: 40, posture: 12, kb: 0, heal: 0.5, fx: { id: 'devour', scale: 1.1 } },
          { do: 'hit', at: 1.8, shape: 'circle', r: 105, dmg: 40, posture: 12, kb: 0, heal: 0.5, fx: { id: 'devour', scale: 1.2 } },
          { do: 'hit', at: 2.2, shape: 'circle', r: 120, dmg: 112, posture: 44, kb: 560, heal: 0.5, status: DROOL, fx: { id: 'devour', scale: 1.7 } }] },
      // 原作：360 度甩尾（360 Spin）——向前一撲、整個身體轉一圈，用粗大的尾巴掃飛周圍的一切
      { id: 'tail_spin', name: '甩尾旋身', short: '甩尾', tags: ['melee', 'aoe'], range: [0, 320], cd: 7.5, cost: 24, track: 7, recovery: 0.8,
        actions: [...dashStrike(0.4, 0.35, 120, 70, 0.14, null, {}),
          ...strike(0.95, 0.45, { shape: 'circle', r: 225 }, { dmg: 140, posture: 46, kb: 560, fx: { id: 'whirl', scale: 1.15 } })],
        actions2: [...dashStrike(0.36, 0.32, 130, 70, 0.12, null, {}),
          ...strike(0.88, 0.42, { shape: 'circle', r: 235 }, { dmg: 134, posture: 44, kb: 540, fx: { id: 'whirl', scale: 1.2 } }),
          ...strike(1.5, 0.3, { shape: 'circle', r: 255 }, { dmg: 116, posture: 36, kb: 640, fx: { id: 'whirl', scale: 1.35 } })] },
      // 原作：五連衝（Five-Step Charge）——最長的招式，每一步身體都向左右猛力甩動，被撞到就會飛起來；暴怒時快得多
      { id: 'five_step', name: '五連衝', short: '五連衝', tags: ['gap', 'melee'], range: [120, 760], cd: 10.5, cost: 32, track: 6, recovery: 1.0,
        actions: [{ do: 'tele', at: 0.05, dur: 0.8, shape: 'rect', len: 700, w: 150, follow: true, lockBefore: 0.3 },
          { do: 'dash', at: 0.85, dist: 140, dur: 0.2, hit: { dmg: 47, posture: 14, kb: 260 } },
          { do: 'dash', at: 1.1, dist: 140, dur: 0.2, hit: { dmg: 47, posture: 14, kb: 260 } },
          { do: 'dash', at: 1.35, dist: 140, dur: 0.2, hit: { dmg: 47, posture: 14, kb: 260 } },
          { do: 'dash', at: 1.6, dist: 140, dur: 0.2, hit: { dmg: 47, posture: 14, kb: 260 } },
          { do: 'dash', at: 1.85, dist: 200, dur: 0.2, hit: { dmg: 116, posture: 40, kb: 620 }, fx: { id: 'bigslam', scale: 0.8 } }],
        actions2: [{ do: 'tele', at: 0.05, dur: 0.65, shape: 'rect', len: 760, w: 160, follow: true, lockBefore: 0.25 },
          { do: 'dash', at: 0.7, dist: 150, dur: 0.16, hit: { dmg: 49, posture: 14, kb: 260 } },
          { do: 'dash', at: 0.9, dist: 150, dur: 0.16, hit: { dmg: 49, posture: 14, kb: 260 } },
          { do: 'dash', at: 1.1, dist: 150, dur: 0.16, hit: { dmg: 49, posture: 14, kb: 260 } },
          { do: 'dash', at: 1.3, dist: 150, dur: 0.16, hit: { dmg: 49, posture: 14, kb: 260 } },
          { do: 'dash', at: 1.5, dist: 210, dur: 0.18, hit: { dmg: 125, posture: 42, kb: 680 }, fx: { id: 'bigslam', scale: 0.95 } }] },
      // 原作：鐵山靠（Hipcheck）——側過身來，用整個肩膀與腰身撞過去；順著牠的身體跑才躲得掉
      { id: 'hipcheck', name: '鐵山靠', short: '鐵山靠', tags: ['gap', 'melee'], range: [60, 360], cd: 8.5, cost: 24, track: 7, recovery: 0.85,
        actions: [...dashStrike(0.65, 0.55, 300, 230, 0.16, { dmg: 129, posture: 42, kb: 660 }, {})],
        actions2: [...dashStrike(0.6, 0.5, 340, 240, 0.16, { dmg: 140, posture: 46, kb: 700 }, { trail: { kind: 'blackfire', r: 55, dur: 3, dps: 14 } })] },
      // 原作：震地踩踏（Quake Stomp）——抬起一條腿連同肚子重重壓下，底下的人被踩平、附近的人被地震震得站不穩
      { id: 'quake_stomp', name: '震地踩踏', short: '踩踏', tags: ['melee', 'aoe'], range: [0, 340], cd: 9, cost: 28, track: 5, recovery: 0.95,
        actions: [...strike(0.7, 0.55, { shape: 'circle', r: 150, off: 60 }, { dmg: 125, posture: 44, kb: 380, fx: { id: 'quakehalt', scale: 0.85 } }),
          { do: 'tele', at: 0.75, dur: 0.4, shape: 'ring', r0: 145, r: 340, off: 60, follow: true },
          { do: 'hit', at: 1.15, shape: 'ring', r0: 145, r: 340, off: 60, dmg: 60, posture: 16, kb: 320, fx: 'ring' }],
        actions2: [...strike(0.66, 0.5, { shape: 'circle', r: 160, off: 60 }, { dmg: 129, posture: 46, kb: 400, fx: { id: 'quakehalt', scale: 1.0 } }),
          { do: 'tele', at: 0.7, dur: 0.38, shape: 'ring', r0: 155, r: 360, off: 60, follow: true },
          { do: 'hit', at: 1.08, shape: 'ring', r0: 155, r: 360, off: 60, dmg: 62, posture: 16, kb: 320, fx: 'ring' },
          ...strike(1.55, 0.4, { shape: 'circle', r: 175, off: 60 }, { dmg: 136, posture: 48, kb: 440, fx: { id: 'quakehalt', scale: 1.15 } }),
          { do: 'tele', at: 1.6, dur: 0.38, shape: 'ring', r0: 170, r: 420, off: 60, follow: true },
          { do: 'hit', at: 1.98, shape: 'ring', r0: 170, r: 420, off: 60, dmg: 67, posture: 18, kb: 340, fx: { id: 'ring', scale: 1.2 } }] },
      // 原作：跳躍砸地（Jump Ground Pound）——跳起重砸，落地之後會發呆好一陣子，是集火的大好機會（耐震也擋不住）
      { id: 'jump_slam', name: '跳躍砸地', short: '跳砸', tags: ['gap', 'aoe'], range: [200, 800], cd: 12.5, cost: 34, track: 6, recovery: 1.35,
        actions: [{ do: 'hide', at: 0.3, fx: 'leap' },
          { do: 'tele', at: 0.3, dur: 1.1, shape: 'circle', r: 200, anchor: 'target', setMark: 'S', follow: true, lockBefore: 0.4 },
          { do: 'land', at: 1.4, mark: 'S' },
          { do: 'hit', at: 1.4, shape: 'circle', r: 200, anchor: 'mark', mark: 'S', dmg: 167, posture: 56, kb: 560, fx: { id: 'bigslam', scale: 1.1 } },
          { do: 'tele', at: 1.45, dur: 0.35, shape: 'ring', r0: 195, r: 380, anchor: 'mark', mark: 'S' },
          { do: 'hit', at: 1.8, shape: 'ring', r0: 195, r: 380, anchor: 'mark', mark: 'S', dmg: 62, posture: 16, kb: 360, fx: 'ring' }],
        actions2: [{ do: 'hide', at: 0.3, fx: 'leap' },
          { do: 'tele', at: 0.3, dur: 1.0, shape: 'circle', r: 220, anchor: 'target', setMark: 'S', follow: true, lockBefore: 0.4 },
          { do: 'land', at: 1.3, mark: 'S' },
          { do: 'hit', at: 1.3, shape: 'circle', r: 220, anchor: 'mark', mark: 'S', dmg: 179, posture: 60, kb: 600, fx: { id: 'bigslam', scale: 1.3 }, zone: { kind: 'blackfire', r: 150, dur: 4, dps: 24 } },
          { do: 'tele', at: 1.35, dur: 0.35, shape: 'ring', r0: 215, r: 440, anchor: 'mark', mark: 'S' },
          { do: 'hit', at: 1.7, shape: 'ring', r0: 215, r: 440, anchor: 'mark', mark: 'S', dmg: 67, posture: 18, kb: 380, fx: { id: 'ring', scale: 1.2 } }] },
      // 原作：掘石投擲（Rock Fling）——下顎插進地面、把岩塊掀起來砸向遠處的獵人；岩塊會依地形帶屬性（冰 / 火 / 水）
      { id: 'rock_fling', name: '掘石投擲', short: '投石', tags: ['ranged'], range: [200, 800], cd: 8, cost: 20, track: 8, recovery: 0.8,
        actions: [{ do: 'lob', at: 0.7, n: 3, scatter: 150, flight: 0.85, r: 85, dmg: 67, posture: 18, kb: 200, kind: 'rock' }],
        actions2: [{ do: 'lob', at: 0.65, n: 5, scatter: 190, flight: 0.8, r: 90, dmg: 69, posture: 18, kb: 220, kind: 'rock' }] },
      // 原作：膽怯反擊——被打到一定程度會突然向後跳開，下一瞬間反撲回來；遊戲中先後跳、再一記長距離衝撞
      { id: 'cower_rush', name: '膽怯反擊', short: '反擊', tags: ['gap'], range: [160, 760], cd: 11, cost: 26, track: 7, recovery: 0.9,
        actions: [{ do: 'dash', at: 0.05, dir: 'back', dist: 200, dur: 0.26 },
          ...dashStrike(0.85, 0.5, 620, 150, 0.2, { dmg: 132, posture: 44, kb: 620 }, {})],
        actions2: [{ do: 'dash', at: 0.05, dir: 'back', dist: 220, dur: 0.24 },
          ...dashStrike(0.8, 0.46, 700, 160, 0.18, { dmg: 143, posture: 48, kb: 680 }, { trail: { kind: 'blackfire', r: 55, dur: 3, dps: 14 } })] },
      // 原作：揮舞獵物——叼起大傢伙的小型獸龍當武器亂甩（附帶防禦力 DOWN），打完還會把牠吃掉
      { id: 'prey_swing', name: '揮舞獵物', short: '揮獵', tags: ['melee', 'aoe'], range: [0, 300], cd: 8.5, cost: 24, track: 7, recovery: 0.9,
        actions: [...strike(0.55, 0.5, { shape: 'cone', r: 280, arc: 150 * D }, { dmg: 102, posture: 34, kb: 420, status: DROOL, fx: { id: 'slash', scale: 1.3 } }),
          ...strike(1.15, 0.3, { shape: 'cone', r: 290, arc: 160 * D }, { dmg: 112, posture: 36, kb: 560, status: DROOL, fx: { id: 'slash', scale: 1.4 } }),
          ...strike(1.85, 0.4, { shape: 'circle', r: 135, off: 150 }, { dmg: 134, posture: 48, kb: 480, heal: 0.5, fx: { id: 'devour', scale: 1.3 } })] },
      // 原作：咆哮——恐暴龍的咆哮必須戴高級耳栓才擋得住，近距離會直接受傷；遊戲中震開近身者、緩速，自己進入狂暴
      { id: 'roar', name: '威嚇咆哮', short: '咆哮', tags: ['defensive'], range: [0, 380], cd: 13, cost: 14, track: 6, recovery: 0.6,
        actions: [...strike(0.55, 0.5, { shape: 'circle', r: 260 }, { dmg: 47, posture: 44, kb: 460, fx: { id: 'pressure' }, status: [{ id: 'slow', dur: 1.4 }] }),
          { do: 'status', at: 0.55, id: 'enrage', dur: 3.5 }],
        actions2: [...strike(0.5, 0.45, { shape: 'circle', r: 300 }, { dmg: 51, posture: 48, kb: 500, fx: { id: 'pressure' }, status: [{ id: 'slow', dur: 1.6 }, { id: 'dragonblight', dur: 4 }] }),
          { do: 'status', at: 0.5, id: 'enrage', dur: 4 }] },
      // 原作：涎液——飢餓時不停滴落的腐蝕性口水，沾到就防禦力 DOWN；遊戲中吐出幾灘涎液留在場上
      { id: 'drool_pool', name: '腐蝕涎液', short: '涎液', tags: ['zone'], range: [80, 600], cd: 12, cost: 12, track: 8, recovery: 0.6,
        actions: [{ do: 'zone', at: 0.5, pattern: 'flank', n: 2, off: 95, delay: 0.4, r: 120, dur: 6, dps: 16, kind: 'acid', status: { id: 'vulnerable', dur: 2 } }],
        actions2: [{ do: 'zone', at: 0.45, pattern: 'flank', n: 3, off: 100, delay: 0.35, r: 125, dur: 7, dps: 22, kind: 'acid', status: { id: 'vulnerable', dur: 2.5 } }] },
      // —— 二階段專屬 ——
      // 原作：龍息（Dragon Breath）——暴怒時才有的招式，由右向左橫掃約 180 度；躲在牠的腹下或尾巴旁最安全。附帶龍封（龍屬性異常）
      { id: 'dragon_breath', name: '龍息', short: '龍息', phase: 2, tags: ['ranged', 'aoe'], range: [0, 520], cd: 10, cost: 32, track: 6, recovery: 1.0,
        actions: [{ do: 'tele', at: 0.1, dur: 0.9, shape: 'cone', r: 480, arc: 200 * D, follow: true, lockBefore: 0.3, chargeFx: { id: 'charge', el: 'dragon' } },
          ...sweep(1.0, 7, 0.13, 95, 31.67, 66, 480, { dmg: 40, posture: 8, kb: 120 }, 1)] },
      // 原作（Frontier 的飢餓恐暴龍）：連續踩踏幾下後，整片地面被龍屬性能量炸開；遊戲中三連踏之後的大範圍龍爆
      { id: 'stomp_blast', name: '連踏・龍爆', short: '龍爆', phase: 2, tags: ['melee', 'aoe'], range: [0, 400], cd: 13, cost: 34, track: 5, recovery: 1.0,
        actions: [...strike(0.7, 0.5, { shape: 'circle', r: 120, off: 60 }, { dmg: 58, posture: 18, kb: 200, fx: { id: 'quakehalt', scale: 0.7 } }),
          ...strike(1.15, 0.3, { shape: 'circle', r: 140, off: 60 }, { dmg: 60, posture: 18, kb: 220, fx: { id: 'quakehalt', scale: 0.8 } }),
          ...strike(1.6, 0.3, { shape: 'circle', r: 160, off: 60 }, { dmg: 62, posture: 20, kb: 240, fx: { id: 'quakehalt', scale: 0.9 } }),
          { do: 'tele', at: 1.7, dur: 0.9, shape: 'circle', r: 340, follow: true },
          { do: 'hit', at: 2.6, shape: 'circle', r: 340, dmg: 179, posture: 60, kb: 640, fx: { id: 'bigslam', scale: 1.4 }, status: BLIGHT }] },
    ],
    ultimate: {
      id: 'ult', name: '饕餮盛宴', name2: '龍息・滅世', ult: true, range: [0, 900], track: 4, recovery: 1.2,
      actions: [ // 一階段：威嚇讓對手腿軟，躍起壓上去——啃咬、啃咬、再啃咬，最後甩出去
        { do: 'status', at: 0.2, id: 'slow', dur: 1.7, target: 'enemy' },
        { do: 'hide', at: 0.3, fx: 'leap' },
        { do: 'tele', at: 0.3, dur: 1.2, shape: 'circle', r: 220, anchor: 'target', setMark: 'F', follow: true, lockBefore: 0.45 },
        { do: 'land', at: 1.5, mark: 'F' },
        { do: 'hit', at: 1.5, shape: 'circle', r: 220, anchor: 'mark', mark: 'F', dmg: 212, posture: 70, kb: 560, fx: { id: 'bigslam', scale: 1.2 } },
        { do: 'tele', at: 1.7, dur: 0.35, shape: 'circle', r: 130, follow: true },
        { do: 'hit', at: 2.05, shape: 'circle', r: 130, dmg: 45, posture: 12, kb: 0, heal: 0.6, status: DROOL, fx: { id: 'devour', scale: 1.0 } },
        { do: 'hit', at: 2.4, shape: 'circle', r: 130, dmg: 45, posture: 12, kb: 0, heal: 0.6, status: DROOL, fx: { id: 'devour', scale: 1.1 } },
        { do: 'hit', at: 2.75, shape: 'circle', r: 130, dmg: 45, posture: 12, kb: 0, heal: 0.6, status: DROOL, fx: { id: 'devour', scale: 1.2 } },
        { do: 'tele', at: 2.8, dur: 0.5, shape: 'circle', r: 200, follow: true },
        { do: 'hit', at: 3.3, shape: 'circle', r: 200, dmg: 190, posture: 70, kb: 700, heal: 0.5, fx: { id: 'bigslam', scale: 1.3 } },
        { do: 'tele', at: 3.35, dur: 0.4, shape: 'ring', r0: 195, r: 520, follow: true },
        { do: 'hit', at: 3.75, shape: 'ring', r0: 195, r: 520, dmg: 78, posture: 24, kb: 440, fx: 'ring' },
      ],
      actions2: [ // 二階段「龍息・滅世」：全程無敵，龍屬性能量蓄滿全身，朝四面八方橫掃整整一圈，最後從體內炸開一圈龍爆
        { do: 'invuln', at: 0, dur: 3.2 },
        { do: 'tele', at: 0.2, dur: 1.15, shape: 'circle', r: 560, follow: true, chargeFx: { id: 'charge', el: 'dragon' } },
        ...sweep(1.35, 12, 0.14, 165, 30, 80, 560, { dmg: 49, posture: 10, kb: 140 }, 1.15),
        { do: 'tele', at: 3.1, dur: 0.5, shape: 'ring', r0: 150, r: 700 },
        { do: 'hit', at: 3.6, shape: 'ring', r0: 150, r: 700, dmg: 123, posture: 40, kb: 640, fx: { id: 'nova', el: 'dragon' }, status: BLIGHT },
      ],
      desc: '一階段「饕餮盛宴」：威嚇讓對手緩速，隨後躍起壓上去重砸、連咬三口（吃肉回血）、最後甩出去；二階段「龍息・滅世」：全程無敵，龍息朝四面八方橫掃整整一圈（跑出範圍外、或看準空檔翻滾穿過），最後炸開一圈龍爆。',
    },
  };

  // 體型依實際體長（約 21 公尺）放大後，近身招式的判定同步放大才夠得到頭前方（遠程 / 位移招式不動）
  const GEO = 1.5;
  for (const sk of deviljho.skills) {
    if (!sk.tags.includes('melee') || sk.range[1] > 400) continue;
    sk.range = sk.range.map((v) => Math.round(v * GEO));
    for (const list of [sk.actions, sk.actions2]) for (const a of list || []) for (const k of ['r', 'r0', 'off', 'len', 'w', 'dist']) if (typeof a[k] === 'number') a[k] = Math.round(a[k] * GEO);
  }

  BD.registerBoss(deviljho);
})(typeof window !== 'undefined' ? window : globalThis);
