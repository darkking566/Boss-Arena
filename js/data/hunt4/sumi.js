'use strict';
// 狩獵模式：墨染武士刀（原創武器，AI 專用）——一把會「寫字」的黑刃太刀，每一刀都是一筆水墨。
// 玩法：近身 一文字 → 返し筆 → 落花三連；中距離 居合・一閃（穿身而過，0.3 秒後 Boss 身上那一筆才裂開）；燕翔三連（三次穿身折返斬）。
//       每一招第一次命中在 Boss 身上留一道「墨痕」；攻擊將至用「流墨」閃身，精準閃過（開頭 perfect 秒）＝「墨縛」：
//       潑墨纏住 Boss（短暫硬直、+2 墨痕），接「墨影返し」穿身反擊（回一點生命）。
//       墨痕寫滿 SM.max 道 → 「水墨・一筆百斬」：場地化為宣紙、Boss 被定住，一筆一筆穿身斬過（每筆固定傷害），
//       最後在 Boss 身上寫下「斬」字、納刀，整幅墨畫爆開（固定傷害 + 大量架勢）。
// 驅動在 js/engine/hunt4/sumi.js；特效在 js/fx/sumi.js；繪圖（Boss 身上的墨痕、刀）在 js/render/hunt4.js 與 js/render/styles/hero.js。
(function (G) {
  const BD = G.BD, H4 = BD.HUNT4, { D, flurry } = BD.DataKit;
  const hit = (at, shape, p) => Object.assign({ do: 'hit', at }, shape, p);
  const cone = (r, arcDeg) => ({ shape: 'cone', r, arc: arcDeg * D });
  const circle = (r) => ({ shape: 'circle', r });
  const dash = (at, dist, dur, extra) => Object.assign({ do: 'dash', at, dist, dur }, extra);
  const sk = (id, name, short, tags, range, o, actions) => Object.assign({ id, name, short, tags, range, cd: 0.05, cost: 0, track: 8 }, o, { actions });
  const INK = '#1a1614', RED = '#c8202e';
  const fxs = (scale) => ({ id: 'sumislash', color: INK, scale });

  // 數值：max 墨痕上限（寫滿放一筆百斬）、bind 墨縛（Boss 硬直秒數；近 12 秒每次再 ÷ (1 + resist × 次數)）、
  //       heal 墨影返し命中回復最大生命比例、late 居合遲來的那一筆（固定傷害）、
  //       ult 一筆百斬（筆數、每筆固定傷害、終爆基礎 + Boss 最大生命比例、架勢、Boss 被定住秒數）
  H4.SM = { max: 6, perfectStars: 2, bind: 0.9, resist: 0.35, heal: 0.05, late: 46,
    ult: { n: 7, cut: 36, boom: 260, hpPct: 0.06, posture: 170, pin: 2.6 } };

  const sumi = { id: 'sumi', name: '墨染武士刀', el: 'physical', ai: [90, 240], aiMod: { gapMul: 1.2, midWait: 0.25 }, bonus: {}, traits: [],
    skills: [
      sk('sm_a1', '墨刃・一文字', '一文字', ['melee', 'fast'], [0, 160], { sw: 'cw', creep: 0.5, recovery: 0.2 },
        [hit(0.13, cone(165, 115), { dmg: 50, posture: 12, kb: 80, fx: fxs(1) })]),
      // 居合・一閃：腰間蓄一拍、穿身而過；命中那一筆 0.3 秒後才在 Boss 身上裂開（驅動追加）
      sk('sm_iai', '居合・一閃', '一閃', ['melee', 'gap'], [140, 330], { cost: 10, sw: 'thrust', track: 10, recovery: 0.32 },
        [dash(0.2, 390, 0.13, { iframe: true, hit: { dmg: 66, posture: 20, kb: 0, ev: 'smiai' }, fx: { id: 'sumiiai', color: INK } })]),
    ],
    variants: [
      sk('sm_a2', '返し筆', '返し筆', ['melee', 'fast'], [0, 160], { sw: 'ccw', creep: 0.5, recovery: 0.2 },
        [hit(0.13, cone(165, 135), { dmg: 54, posture: 14, kb: 90, fx: fxs(1.1) })]),
      sk('sm_a3', '落花三連', '落花', ['melee'], [0, 170], { cost: 6, sw: 'spin', creep: 0.3, recovery: 0.3 },
        flurry(0.1, 3, 0.08, cone(170, 150), { dmg: 22, posture: 6, kb: 0 }, fxs(0.8)).concat([hit(0.42, circle(175), { dmg: 76, posture: 24, kb: 160, fx: { id: 'sumiwhirl', color: INK, scale: 1.3 } })])),
      // 燕翔三連：三次穿身折返（每次衝刺命中一次，衝過頭後自動回頭），收尾一記迴旋
      sk('sm_rush', '燕翔三連', '燕翔', ['melee', 'aoe'], [0, 300], { cost: 12, sw: 'thrust', track: 12, recovery: 0.32 },
        [0.05, 0.25, 0.45].map((at) => dash(at, 270, 0.1, { iframe: true, hit: { dmg: 34, posture: 10, kb: 0 }, fx: { id: 'sumidash', color: INK } }))
          .concat([hit(0.66, circle(170), { dmg: 64, posture: 20, kb: 120, fx: { id: 'sumiwhirl', color: INK } })])),
      // 流墨：橫向閃身，開頭 win 秒迴避攻擊、perfect 秒內＝精準（墨縛）
      sk('sm_step', '流墨', '流墨', ['melee', 'defensive'], [0, 900], { cost: 10, track: 12, recovery: 0.08, evade: { win: 0.34, perfect: 0.16 } },
        [dash(0.02, 140, 0.2, { dir: 'side', fx: { id: 'sumistep', color: INK } })]),
      sk('sm_counter', '墨影返し', '墨影', ['melee'], [0, 420], { sw: 'spin', track: 12, recovery: 0.3, armor: 0.6 },
        [dash(0.03, 250, 0.14, { iframe: true, hit: { dmg: 40, posture: 12, kb: 0 }, fx: { id: 'sumidash', color: RED } })].concat(
          flurry(0.22, 4, 0.05, circle(150), { dmg: 22, posture: 8, kb: 0 }, fxs(0.7)),
          [hit(0.48, circle(170), { dmg: 90, posture: 30, kb: 0, ev: 'smheal', fx: { id: 'sumiwhirl', color: RED, scale: 1.4 } })])),
      // 水墨・一筆百斬：整招無敵；一筆一筆的穿身斬由驅動依時間排定（固定傷害），最後一記判定觸發終爆
      sk('sm_ult', '水墨・一筆百斬', '一筆百斬', ['melee', 'aoe'], [0, 600], { sw: 'spin', track: 4, recovery: 0.6 },
        [{ do: 'invuln', at: 0, dur: 2.4 }, hit(2.15, circle(340), { dmg: 120, posture: 40, kb: 0, ev: 'smult', fx: { id: 'sumiult', color: INK } })]),
    ] };

  H4.WEAPON_DEFS.sumi = sumi;
  H4.WEAPON_SPECS.sumi = { dtype: 'cut', sharp: 0, // 墨刃不必磨
    focus: sk('h4_focus_sm', '集中・墨突', '墨突', ['melee'], [0, 210], { cd: 6, sw: 'thrust', track: 9, recovery: 0.35 },
      [dash(0.05, 130, 0.12), hit(0.26, cone(190, 50), { dmg: 120, posture: 30, kb: 0, focus: true, fx: { id: 'sumiiai', color: INK } })]) };
  H4.WEAPON_NAMES.sumi = '墨染武士刀';
})(typeof window !== 'undefined' ? window : globalThis);
