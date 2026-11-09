'use strict';
// 狩獵模式：星軌輪刃（原創武器，AI 專用）——一對會飛出去再回來的環刃，打中 Boss 會在牠身上刻下「星痕」。
// 玩法：近身雙環連舞 / 中距離輪刃迴旋擲 / 星鏈突進 → 每一招命中刻一顆星痕；攻擊將至用「流星步」閃過，
//       精準閃過（開頭 perfect 秒）＝「星縛」：Boss 被星鏈纏住一下、多刻兩顆星，接「流星返し」穿身反擊（回一點生命）。
//       星痕刻滿 CK.max 顆 → 「星座崩落」：星痕連成星座、Boss 被釘住，每顆星落下一道星光，最後整個星座崩落爆炸（固定傷害 + 大量架勢）。
// 驅動在 js/engine/hunt4/chakram.js；特效在 js/fx/chakram.js；繪圖（Boss 身上的星痕、飛行中的輪刃）在 js/render/hunt4.js。
(function (G) {
  const BD = G.BD, H4 = BD.HUNT4, { D, flurry } = BD.DataKit;
  const hit = (at, shape, p) => Object.assign({ do: 'hit', at }, shape, p);
  const cone = (r, arcDeg) => ({ shape: 'cone', r, arc: arcDeg * D });
  const circle = (r) => ({ shape: 'circle', r });
  const rect = (len, w) => ({ shape: 'rect', len, w });
  const dash = (at, dist, dur, extra) => Object.assign({ do: 'dash', at, dist, dur }, extra);
  const sk = (id, name, short, tags, range, o, actions) => Object.assign({ id, name, short, tags, range, cd: 0.05, cost: 0, track: 7 }, o, { actions });
  const RING = '#9fd8ff', STAR = '#ffe9a8';

  // 數值：max 星痕上限（刻滿放星座崩落）、bind 星縛（Boss 硬直秒數；近 12 秒每次再 ÷ (1 + resist × 次數)）、
  //       heal 流星返し命中回復最大生命比例、nova 星座崩落（每顆星固定傷害、終爆基礎 + Boss 最大生命比例、架勢、Boss 被釘住秒數）
  H4.CK = { max: 7, perfectStars: 2, bind: 0.9, resist: 0.35, heal: 0.05,
    nova: { star: 40, boom: 260, hpPct: 0.06, posture: 160, pin: 2.4 } };

  const chakram = { id: 'chakram', name: '星軌輪刃', el: 'physical', ai: [90, 260], aiMod: { gapMul: 1.2, midWait: 0.25 }, bonus: {}, traits: [],
    skills: [
      sk('ck_a1', '雙環斬', '雙環', ['melee', 'fast'], [0, 150], { cost: 0, sw: 'cw', creep: 0.4, recovery: 0.22 },
        [hit(0.14, cone(150, 120), { dmg: 46, posture: 12, kb: 80, fx: { id: 'slash', color: RING } }), hit(0.26, cone(150, 120), { dmg: 40, posture: 10, kb: 80, fx: { id: 'slash', color: RING } })]),
      sk('ck_throw', '輪刃迴旋擲', '迴旋擲', ['ranged'], [110, 470], { cost: 10, sw: 'thrust', track: 8, recovery: 0.3 },
        [hit(0.24, rect(480, 70), { dmg: 58, posture: 14, kb: 0, ev: 'ckthrow', fx: { id: 'ckthrow', color: RING } }), hit(0.62, rect(480, 70), { dmg: 52, posture: 14, kb: 0 })]),
    ],
    variants: [
      sk('ck_a2', '迴環斬', '迴環', ['melee', 'fast'], [0, 150], { cost: 0, sw: 'ccw', creep: 0.4, recovery: 0.22 },
        [hit(0.15, cone(155, 140), { dmg: 52, posture: 14, kb: 90, fx: { id: 'slash', color: RING } })]),
      sk('ck_a3', '星旋舞', '星旋', ['melee', 'aoe'], [0, 160], { cost: 8, sw: 'spin', recovery: 0.32 },
        flurry(0.12, 4, 0.07, circle(155), { dmg: 20, posture: 6, kb: 0 }, 'whirl').concat([hit(0.46, circle(165), { dmg: 70, posture: 22, kb: 160, fx: { id: 'whirl', color: STAR, scale: 1.3 } })])),
      sk('ck_chain', '星鏈突進', '星鏈', ['melee', 'gap'], [140, 520], { cost: 10, sw: 'thrust', track: 10, recovery: 0.3 },
        [dash(0.06, 300, 0.2, { iframe: true, fx: { id: 'ckchain', color: RING } }), hit(0.28, circle(130), { dmg: 66, posture: 20, kb: 120, fx: { id: 'whirl', color: RING } })]),
      // 流星步：橫向閃身，開頭 win 秒迴避攻擊、perfect 秒內＝精準（星縛）
      sk('ck_step', '流星步', '流星步', ['melee', 'defensive'], [0, 900], { cost: 10, track: 12, recovery: 0.08, evade: { win: 0.34, perfect: 0.16 } },
        [dash(0.02, 140, 0.2, { dir: 'side', fx: { id: 'ckstep', color: STAR } })]),
      sk('ck_counter', '流星返し', '返し', ['melee'], [0, 400], { cost: 0, sw: 'spin', track: 12, recovery: 0.3, armor: 0.6 },
        [dash(0.03, 230, 0.16, { iframe: true, fx: { id: 'ckchain', color: STAR } })].concat(
          flurry(0.22, 5, 0.05, circle(150), { dmg: 22, posture: 8, kb: 0 }, 'slash'),
          [hit(0.5, circle(170), { dmg: 90, posture: 30, kb: 0, ev: 'ckheal', fx: { id: 'whirl', color: STAR, scale: 1.4 } })])),
      // 星座崩落：整招無敵；開頭釘住 Boss（驅動），每顆星的星光與終爆由驅動依星痕數追加（固定傷害）
      sk('ck_nova', '星座崩落', '星座', ['melee', 'aoe'], [0, 600], { cost: 0, sw: 'spin', track: 4, recovery: 0.6 },
        [{ do: 'invuln', at: 0, dur: 1.9 }, hit(1.7, circle(300), { dmg: 120, posture: 40, kb: 0, ev: 'cknova', fx: { id: 'cknova', color: STAR } })]),
    ] };

  H4.WEAPON_DEFS.chakram = chakram;
  H4.WEAPON_SPECS.chakram = { dtype: 'cut', sharp: 0, // 環刃靠星力切割，不必磨刀
    focus: sk('h4_focus_ck', '集中星斬', '集中', ['melee'], [0, 200], { cd: 6, sw: 'cw', track: 9, recovery: 0.35 },
      [dash(0.05, 120, 0.14), hit(0.3, cone(170, 90), { dmg: 120, posture: 30, kb: 0, focus: true, fx: { id: 'whirl', color: RING, scale: 1.3 } })]) };
  H4.WEAPON_NAMES.chakram = '星軌輪刃';
})(typeof window !== 'undefined' ? window : globalThis);
