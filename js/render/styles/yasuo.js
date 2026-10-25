'use strict';
// Boss 造型：犽宿（依原畫，俯視）：高束髮髻甩出一大片深棕色馬尾（最重要的剪影）、藍色圍巾、左肩層疊的鋼刃肩甲、
// 古銅色裸胸與藍色臂纏、橘褐粗麻繩腰帶、深藍袴、紅柄長太刀（雲紋護手、橘色繩穗）、左腰白色漩渦紋的藍刀鞘、右腰綠色酒葫蘆。
// 逐招動畫（沿用菲歐拉的關鍵值姿態混合）：鋼鐵暴雪直刺、劍擊左右橫斬、迴旋斬、突進拖刀、旋風大揮、納刀（刀收進鞘）→ 拔刀、風牆橫刀推風；
// 奪命氣息期間整個人騰空、刀光繞身急旋。二階段劍身泛青白風光、身邊繞著風帶。
// under()：風牆、腳下的劍意環（浪人之道，滿了發白光）與天寒地凍層數；R.projStyles：旋風與斷風的風刃。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  const TAU = U.TAU, PI = Math.PI;
  const WHITE = '#ffffff', PALE = '#e6fbff', CYAN = '#9fe8ff', DEEP = '#2f7fa6', TEAL = '#3fd6c8';
  const SKIN = '#c98a5c', SKIN_D = '#9a6440', HAIR = '#3b2618', HAIR_L = '#5e3d27', NAVY = '#1f2740', BLUE = '#3f7fb5', STEEL = '#b9c3cf', STEEL_D = '#6c7684', ROPE = '#c7742f', RED = '#a8262a';
  const TRIG = { hit: 1, dash: 1, proj: 1, windwall: 1, lastbreath: 1, blink: 1 };
  const ease = (u) => 1 - (1 - u) * (1 - u);
  const lerp = (a, b, u) => a + (b - a) * u;
  const _ = undefined;

  // 姿態參數：ext 持刀手前伸、ang 刀身偏轉、spin 軀幹扭轉、fwd 前衝、sq 蹲伏、gl 刀光、sh 刀在鞘中（1＝收刀）、hair 馬尾甩直的程度
  const DEF = { ext: 0.2, ang: 0.35, spin: 0, fwd: 0, sq: 1, gl: 0, sh: 0, hair: 0 };
  const KEYS = Object.keys(DEF);
  // 關鍵值：key: [蓄滿, 擊, 起始 = DEF, 收招 = 起始, 擊後衰減起點 = 擊]
  const STAB = { ext: [-0.35, 1.25], ang: [0.15, 0], spin: [0.35, -0.2], fwd: [-0.1, 0.3], sq: [0.94, 1], gl: [0.6, 1], hair: [0, 0.6] };
  const SWING = [-1, 1].map((s) => ({ ext: [0.1, 0.7], ang: [-1.3 * s, 1.15 * s], spin: [-0.4 * s, 0.35 * s], fwd: [-0.05, 0.12], gl: [0.4, 1], hair: [0.2, 0.5] }));
  const WHIRL = { ext: [0.2, 0.8], ang: [-2.2, 3.4], spin: [-0.6, 1.2], sq: [0.9, 1], gl: [0.6, 1], hair: [0.3, 1] };
  const DASH = { ext: [0.3, 0.55], ang: [0.9, 1.7], spin: [0.25, 0.1], fwd: [-0.15, 0.45], sq: [0.86, 1.04], gl: [0.4, 0.8], hair: [0.4, 1] };
  const GUST = { ext: [0, 0.9], ang: [-1.5, 1.3], spin: [-0.5, 0.5], fwd: [-0.1, 0.2], sq: [0.9, 1], gl: [0.8, 1], hair: [0.3, 1] }; // 旋風大揮
  const IAI = { ext: [-0.2, 1.1], ang: [1.6, -0.7], spin: [0.6, -0.4], fwd: [-0.15, 0.3], sq: [0.82, 1], gl: [1, 1], sh: [1, 0, _, 0, 0], hair: [0, 1] }; // 納刀 → 拔刀
  const WALL = { ext: [0.3, 0.75], ang: [-0.6, -1.45], spin: [0.2, -0.3], sq: [0.94, 1], gl: [0.6, 1], hair: [0.2, 0.7] }; // 橫刀推出風牆
  const STEP = { ext: [0.1, 0.4], ang: [0.8, 1.2], sq: [0.8, 1], gl: [0.6, 0.8], hair: [0.2, 0.8] };
  const ULT = { ext: [0.2, 0.9], ang: [-1, 2], spin: [0, 0.6], sq: [0.9, 1.05], gl: [1, 1], hair: [0.5, 1] };

  function pick(e, sid) {
    const a = e.a;
    if (a.do === 'lastbreath') return ULT;
    if (a.do === 'windwall') return WALL;
    if (a.do === 'blink') return STEP;
    if (a.do === 'dash') return DASH;
    if (a.do === 'proj') return a.kind === 'windblade' ? IAI : GUST;
    if (a.shape === 'rect') return STAB;
    if (a.shape === 'circle') return WHIRL;
    return SWING[e.hi & 1];
  }

  // ── 姿態混合（同菲歐拉）──
  const A = Object.assign({}, DEF), B = {};
  const P = { L: -1, N: -1, le: null, ne: null, wd: 0, sn: 0, sw: 0, since: 0 };
  const CACHE = new WeakMap();
  function trigs(v) {
    let c = CACHE.get(v.actions);
    if (!c) {
      c = []; let hn = 0;
      for (const a of v.actions) if (TRIG[a.do]) c.push({ a, hi: a.do === 'hit' ? hn++ : -1 });
      c.sort((x, y) => x.a.at - y.a.at);
      CACHE.set(v.actions, c);
    }
    return c;
  }
  function pace(inst) {
    const c = trigs(inst.v), t = inst.t; let L = -1, N = -1;
    for (let i = 0; i < c.length; i++) { if (c[i].a.at <= t) L = i; else { N = i; break; } }
    P.le = L >= 0 ? c[L] : null; P.ne = N >= 0 ? c[N] : null;
    const endL = L >= 0 ? c[L].a.at : 0;
    P.since = L >= 0 ? t - endL : 0;
    P.sn = L >= 0 && P.since < 0.25 ? 1 - P.since / 0.25 : 0;
    P.wd = N >= 0 ? U.clamp((t - endL) / Math.max(0.05, c[N].a.at - endL), 0, 1) : 0;
  }
  function ev(O, e, mode, a, b) {
    for (const k of KEYS) {
      const x = e[k];
      if (!x) { O[k] = DEF[k]; continue; }
      const r0 = x[2] === _ ? DEF[k] : x[2], end = x[3] === _ ? r0 : x[3];
      O[k] = mode === 'snap' ? lerp(end, x[4] === _ ? x[1] : x[4], a) : mode === 'end' ? end : b > 0 ? lerp(x[0], x[1], b) : lerp(r0, x[0], a);
    }
  }
  function build(sid) {
    const eN = P.ne && pick(P.ne, sid), eL = P.le && pick(P.le, sid);
    P.sw = 0;
    if (eN) {
      P.sw = P.wd < 0.7 ? 0 : ease((P.wd - 0.7) / 0.3);
      ev(A, eN, 'wind', ease(Math.min(1, P.wd / 0.6)), P.sw);
      if (eL && P.sn > 0) { ev(B, eL, 'snap', P.sn); for (const k of KEYS) A[k] = lerp(A[k], B[k], P.sn); }
    } else if (eL) ev(A, eL, P.sn > 0 ? 'snap' : 'end', P.sn);
  }

  // ── 地面層：蓄力與收勢（本地座標，+x 為面向）──
  function ring(ctx, x, y, rad, a, col, w) { ctx.strokeStyle = hexA(col, a); ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, Math.max(1, rad), 0, TAU); ctx.stroke(); }
  function crescent(ctx, rad, a0, a1, col, a, w) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.strokeStyle = hexA(col, 0.55 * a); ctx.lineWidth = w * 2.4; ctx.beginPath(); ctx.arc(0, 0, rad, a0, a1); ctx.stroke();
    ctx.strokeStyle = hexA(WHITE, 0.9 * a); ctx.lineWidth = w * 0.6; ctx.stroke();
    ctx.restore();
  }
  function spiral(ctx, rad, t, n, col, a) { // 腳下繞轉的風絲
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = hexA(col, a); ctx.lineWidth = 2;
    for (let i = 0; i < n; i++) { const a0 = t * 7 + i * TAU / n; ctx.beginPath(); ctx.arc(0, 0, rad * (0.6 + 0.4 * ((i % 3) / 2)), a0, a0 + 1.4); ctx.stroke(); }
    ctx.restore();
  }
  function lines(ctx, x0, len, n, gap, col, a) { // 平行風切線
    ctx.strokeStyle = hexA(col, a); ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < n; i++) { const y = (i - (n - 1) / 2) * gap, l = len * (1 - Math.abs(i - (n - 1) / 2) * 0.16); ctx.moveTo(x0, y); ctx.lineTo(x0 - l, y); }
    ctx.stroke();
  }
  function windup(ctx, r, e, wd, t, tint) {
    const a = e.a;
    if (a.do === 'proj' && a.kind === 'windblade') { ring(ctx, 0, 0, r * (3.4 - 2.2 * wd), 0.6 * wd, PALE, 2); lines(ctx, r * 3.2 * (1 - wd) + r, r * 1.2, 6, r * 0.3, tint, 0.5 * wd); }
    else if (a.do === 'proj' || a.do === 'lastbreath') spiral(ctx, r * (1.6 + wd), t, 6, tint, 0.6 * wd);
    else if (a.do === 'dash') lines(ctx, -r * 0.6, r * 2.6 * wd, 5, r * 0.24, tint, 0.6 * wd);
    else if (a.do === 'windwall') { ctx.save(); ctx.setLineDash([8, 7]); ctx.lineDashOffset = -t * 60; ring(ctx, 0, 0, r * (2.6 - 0.8 * wd), 0.5 * wd, tint, 2); ctx.restore(); }
    else if (a.do === 'hit' && a.shape === 'circle') spiral(ctx, r * 2.2, t, 5, tint, 0.5 * wd);
  }
  function snapfx(ctx, r, e, k, tint) {
    const a = e.a, ex = 1 - k;
    if (a.do === 'hit' && a.shape === 'rect') { // 直刺：前方一道光軌 + 劍尖星芒
      const x1 = r + (a.len - r) * Math.min(1, ex * 4);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      ctx.strokeStyle = hexA(tint, 0.5 * k); ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(x1, 0); ctx.stroke();
      ctx.strokeStyle = hexA(WHITE, 0.9 * k); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1 - 14 * k, 0); ctx.lineTo(x1 + 14 * k, 0); ctx.moveTo(x1, -14 * k); ctx.lineTo(x1, 14 * k); ctx.stroke();
      ctx.restore();
    } else if (a.do === 'hit' && a.shape === 'circle') { crescent(ctx, (a.r || 130) * (0.6 + 0.4 * ex), -PI, PI * 0.9, tint, k, 3); ring(ctx, 0, 0, (a.r || 130) * (0.5 + 0.7 * ex), 0.5 * k, PALE, 2); }
    else if (a.do === 'hit') { const s = e.hi & 1 ? 1 : -1; crescent(ctx, (a.r || 110) * 0.85, s > 0 ? -1.1 : -0.1, s > 0 ? 0.1 : 1.1, tint, k, 2.5); }
    else if (a.do === 'dash') lines(ctx, -r * 0.6 - ex * r * 2, (a.dist || 300) * 0.5 * k, 5, r * 0.24, tint, 0.8 * k);
    else if (a.do === 'proj') { crescent(ctx, r * (2 + ex), -1.2, 1.2, tint, k, 3); ring(ctx, 0, 0, r * (1 + 2 * ex), 0.4 * k, PALE, 2); }
    else if (a.do === 'windwall') ring(ctx, r * 2, 0, r * (0.5 + 2 * ex), 0.6 * k, PALE, 3);
  }

  // 風帶（二階段 / 奪命氣息）：兩條繞身飄動的白藍飄帶
  function ribbons(ctx, r, t, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const a0 = t * 3.2 + i * PI;
      ctx.strokeStyle = hexA(i ? CYAN : PALE, 0.55 * a); ctx.lineWidth = 3 - i;
      ctx.beginPath();
      for (let s = 0; s <= 14; s++) { const an = a0 + s * 0.22, rr = r * (1.5 + 0.25 * Math.sin(t * 4 + s * 0.5 + i)); s ? ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : ctx.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); }
      ctx.stroke();
    }
    ctx.restore();
  }

  // 刀：hx, hy 為握柄位置；紅色菱紋柄、雲紋護手、長而細的刀身（刃朝上）
  function katana(ctx, hx, hy, ang, r, glow, glowCol, shade) {
    const L = r * 3.5, W = r * 0.11;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
    if (glow > 0.05) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      ctx.strokeStyle = hexA(glowCol, 0.25 + 0.45 * glow); ctx.lineWidth = 7 + 7 * glow; ctx.beginPath(); ctx.moveTo(r * 0.3, 0); ctx.lineTo(L, 0); ctx.stroke();
      ctx.restore();
    }
    // 柄（往後）與繩穗
    ctx.fillStyle = shade ? '#000' : RED; ctx.fillRect(-r * 0.75, -W * 1.4, r * 0.75, W * 2.8);
    if (!shade) { ctx.strokeStyle = '#2a0e10'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 1; i < 5; i++) { const x = -r * 0.75 + i * r * 0.15; ctx.moveTo(x - 3, -W * 1.4); ctx.lineTo(x + 3, W * 1.4); } ctx.stroke(); }
    ctx.strokeStyle = shade ? '#000' : ROPE; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r * 0.75, 0); ctx.quadraticCurveTo(-r * 1.0, r * 0.15, -r * 1.15, r * 0.35); ctx.stroke();
    // 刀身：刃朝上（-y）微彎，刃緣亮線
    ctx.fillStyle = shade ? '#101620' : '#e4eaf2';
    ctx.beginPath(); ctx.moveTo(r * 0.12, -W); ctx.quadraticCurveTo(L * 0.6, -W * 1.6, L, -W * 2.2); ctx.lineTo(L * 0.94, W * 0.2); ctx.quadraticCurveTo(L * 0.6, W * 0.4, r * 0.12, W); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade ? CYAN : '#8b98aa'; ctx.lineWidth = 1; ctx.stroke();
    if (!shade) { ctx.strokeStyle = WHITE; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(r * 0.2, -W * 0.8); ctx.quadraticCurveTo(L * 0.6, -W * 1.4, L * 0.98, -W * 2); ctx.stroke(); }
    // 雲紋護手
    ctx.fillStyle = shade ? '#000' : STEEL; ctx.strokeStyle = shade ? CYAN : STEEL_D; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(r * 0.06, 0, r * 0.13, r * 0.26, 0, 0, TAU); ctx.fill(); ctx.stroke();
    if (!shade) { ctx.beginPath(); ctx.arc(r * 0.06, -r * 0.08, r * 0.08, 0.5, 4.5); ctx.stroke(); }
    ctx.restore();
  }
  // 刀鞘：左腰（-y 側）往後斜；藍底白漩渦紋
  function scabbard(ctx, r, shade) {
    R.blit(ctx, 'body:yasuo:sheath:' + r + ':' + (shade ? 's' : 'b'), r * 3.4 + 8, r * 1.2 + 8, r * 2.6 + 4, r * 0.6 + 4, (g) => {
      g.rotate(-0.28);
      g.fillStyle = shade ? '#000' : '#2c5f93'; g.strokeStyle = shade ? CYAN : '#16324f'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(r * 0.3, -r * 0.6); g.lineTo(-r * 2.3, -r * 0.48); g.quadraticCurveTo(-r * 2.5, -r * 0.6, -r * 2.3, -r * 0.72); g.lineTo(r * 0.3, -r * 0.82); g.closePath(); g.fill(); g.stroke();
      if (!shade) { g.strokeStyle = 'rgba(240,248,255,0.85)'; g.lineWidth = 1; for (let i = 0; i < 4; i++) { const x = -r * 0.3 - i * r * 0.5; g.beginPath(); g.arc(x, -r * 0.66, r * 0.07, 0, 4.4); g.stroke(); } }
    });
  }

  function body(ctx, o, t, { def, r }) {
    const shade = !!o.shade, p2 = o.phase === 2, w = o.world;
    const stag = o.state === 'stagger' || o.state === 'stun';
    const inst = !stag && o.inst && o.inst.skill && o.inst.v && o.inst.v.actions ? o.inst : null;
    const sid = inst ? inst.skill.id : '';
    const lb = !shade && o._lb && w && w.time < o._lb.until; // 奪命氣息中
    for (const k of KEYS) A[k] = DEF[k];
    A.ang = 0.35 + Math.sin(t * 2.4) * 0.05;
    P.ne = P.le = null; P.wd = P.sn = P.since = 0;
    if (inst) { pace(inst); build(sid); }
    const ry = !stag && R.rally(o);
    if (ry) { A.ext = 0.6 + 0.3 * ry.s; A.ang = ry.off + 0.3 * (1 - ry.s); A.gl = 0.4 + 0.6 * ry.s; A.hair = 0.6 * ry.s; }
    if (lb) { A.ang = t * 22; A.gl = 1; A.hair = 1; A.ext = 0.7; }
    const tint = p2 ? CYAN : PALE;
    ctx.save();
    if (!shade && (p2 || lb)) ribbons(ctx, r, t, lb ? 1 : 0.6);
    if (inst && !shade) {
      if (P.ne && P.wd > 0) windup(ctx, r, P.ne, P.wd, t, tint);
      if (P.le) { const k = U.clamp(1 - P.since / 0.34, 0, 1); if (k > 0) snapfx(ctx, r, P.le, k, tint); }
    }
    if (inst || ry) { ctx.translate(A.fwd * r, 0); if (A.sq !== 1) ctx.scale(A.sq, 1 + (1 - A.sq) * 0.5); }
    if (A.spin) ctx.rotate(A.spin);
    const tag = r + ':' + (shade ? 's' : 'b');
    const sway = Math.sin(t * 3.5 + o.x * 0.01) * (1 - A.hair);

    // 圍巾尾端：從頸後往後飄
    ctx.strokeStyle = shade ? '#000' : BLUE; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.15); ctx.quadraticCurveTo(-r * 1.1, r * (0.35 + sway * 0.3), -r * (1.6 + 0.6 * A.hair), r * (0.25 + sway * 0.5)); ctx.stroke();

    scabbard(ctx, r, shade);

    // 軀幹：古銅色裸胸，右側斜披深藍衣、腰後橘色粗繩腰帶、右腰綠酒葫蘆
    R.blit(ctx, 'body:yasuo:torso:' + tag, r * 1.6 + 8, r * 2.2 + 8, r * 0.8 + 4, r * 1.1 + 4, (g) => {
      const gr = g.createRadialGradient(r * 0.15, 0, 2, 0, 0, r);
      gr.addColorStop(0, shade ? '#0a0f16' : '#e0a676'); gr.addColorStop(1, shade ? '#000' : SKIN_D);
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, r * 0.62, r * 0.95, 0, 0, TAU); g.fill();
      g.fillStyle = shade ? '#000' : NAVY; g.beginPath(); g.ellipse(-r * 0.05, r * 0.45, r * 0.55, r * 0.5, 0.3, 0, TAU); g.fill(); // 右側衣
      g.strokeStyle = shade ? CYAN : ROPE; g.lineWidth = r * 0.16; g.beginPath(); g.arc(0, 0, r * 0.6, PI * 0.62, PI * 1.38); g.stroke(); // 繩腰帶（背後）
      if (!shade) { g.strokeStyle = '#8a4a1a'; g.lineWidth = 1; for (let i = 0; i < 7; i++) { const an = PI * 0.65 + i * 0.1; g.beginPath(); g.moveTo(Math.cos(an) * r * 0.53, Math.sin(an) * r * 0.53); g.lineTo(Math.cos(an + 0.05) * r * 0.67, Math.sin(an + 0.05) * r * 0.67); g.stroke(); } }
      g.fillStyle = shade ? '#000' : '#5f8a3a'; g.beginPath(); g.ellipse(-r * 0.55, r * 0.72, r * 0.16, r * 0.12, 0, 0, TAU); g.fill(); // 酒葫蘆
      g.beginPath(); g.arc(-r * 0.36, r * 0.72, r * 0.1, 0, TAU); g.fill();
    });

    // 左臂：藍色臂纏，向後收（出刀時往後甩開平衡）
    const lx = -r * (0.2 + 0.3 * Math.max(0, A.ext)), ly = -r * (0.85 + 0.15 * A.ext);
    ctx.strokeStyle = shade ? '#000' : SKIN; ctx.lineWidth = r * 0.24; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(lx, ly); ctx.stroke();
    ctx.strokeStyle = shade ? '#000' : BLUE; ctx.lineWidth = r * 0.26; ctx.beginPath(); ctx.moveTo(lx * 0.5, -r * 0.6 + (ly + r * 0.6) * 0.5); ctx.lineTo(lx, ly); ctx.stroke();

    // 右臂＋太刀（收刀時手按在鞘口的刀柄上）
    const e = A.ext, hx = r * (0.5 + 0.7 * e), hy = r * (0.55 - 0.35 * Math.max(e, 0));
    if (A.sh > 0.5) {
      ctx.strokeStyle = shade ? '#000' : SKIN; ctx.lineWidth = r * 0.24; ctx.beginPath(); ctx.moveTo(0, r * 0.6); ctx.lineTo(r * 0.35, -r * 0.4); ctx.stroke();
      katana(ctx, r * 0.4, -r * 0.62, PI - 0.28, r * 0.75, A.gl * A.sh, CYAN, shade); // 只露出刀柄（刀身在鞘內，縮短示意）
    } else {
      ctx.strokeStyle = shade ? '#000' : SKIN; ctx.lineWidth = r * 0.24;
      ctx.beginPath(); ctx.moveTo(0, r * 0.6); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = shade ? '#000' : BLUE; ctx.lineWidth = r * 0.26; ctx.beginPath(); ctx.moveTo(hx * 0.55, r * 0.6 + (hy - r * 0.6) * 0.55); ctx.lineTo(hx * 0.9, hy + (r * 0.6 - hy) * 0.1); ctx.stroke();
      if (ry && !shade) { ctx.save(); ctx.translate(hx, hy); ctx.rotate(A.ang); R.bladeTrail(ctx, ry, r * 3.5, p2 ? CYAN : WHITE); ctx.restore(); }
      katana(ctx, hx, hy, A.ang, r, Math.max(A.gl, p2 ? 0.55 : 0), p2 ? CYAN : WHITE, shade);
    }

    // 左肩：層疊的鋼刃肩甲（三片往後交疊的刃板）
    R.blit(ctx, 'body:yasuo:pauldron:' + tag, r * 1.8 + 8, r * 1.4 + 8, r * 0.9 + 4, r * 1.1 + 4, (g) => {
      for (let i = 2; i >= 0; i--) {
        g.fillStyle = shade ? '#000' : i ? STEEL_D : STEEL; g.strokeStyle = shade ? CYAN : '#3e4652'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(r * 0.35 - i * r * 0.22, -r * 0.45); g.lineTo(r * 0.1 - i * r * 0.3, -r * 1.05 - i * r * 0.06); g.lineTo(-r * 0.3 - i * r * 0.28, -r * 0.95); g.lineTo(-r * 0.15 - i * r * 0.2, -r * 0.4); g.closePath(); g.fill(); g.stroke();
      }
      if (!shade) { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(r * 0.3, -r * 0.5); g.lineTo(r * 0.08, -r * 0.98); g.stroke(); }
    });

    // 馬尾：從頭頂髮髻往後甩出的一大片扇形（隨動作甩直、平時擺動）
    const hl = r * (1.5 + 0.5 * A.hair), sp = 0.75 - 0.35 * A.hair;
    ctx.fillStyle = shade ? '#000' : HAIR; ctx.strokeStyle = shade ? CYAN : HAIR_L; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.18);
    for (let i = 0; i <= 6; i++) { const an = PI + (i / 6 - 0.5) * 2 * sp + sway * 0.18, rr = hl * (i % 2 ? 0.78 : 1); ctx.lineTo(-r * 0.05 + Math.cos(an) * rr, Math.sin(an) * rr); }
    ctx.lineTo(-r * 0.05, r * 0.18); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (!shade) { ctx.strokeStyle = HAIR_L; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 1; i < 6; i++) { const an = PI + (i / 6 - 0.5) * 2 * sp + sway * 0.18; ctx.moveTo(-r * 0.2, 0); ctx.lineTo(-r * 0.05 + Math.cos(an) * hl * 0.85, Math.sin(an) * hl * 0.85); } ctx.stroke(); }

    // 頭：深棕亂髮、頭頂髮髻與綁繩、前額一縷瀏海；藍圍巾圍住頸部
    R.blit(ctx, 'body:yasuo:head:' + tag, r * 1.3 + 8, r * 1.3 + 8, r * 0.65 + 4, r * 0.65 + 4, (g) => {
      g.fillStyle = shade ? '#000' : BLUE; g.beginPath(); g.ellipse(-r * 0.05, 0, r * 0.5, r * 0.55, 0, 0, TAU); g.fill(); // 圍巾
      const gr = g.createRadialGradient(r * 0.1, -r * 0.05, 1, 0, 0, r * 0.42);
      gr.addColorStop(0, shade ? '#120c08' : HAIR_L); gr.addColorStop(1, shade ? '#000' : HAIR);
      g.fillStyle = gr; g.beginPath(); g.arc(r * 0.02, 0, r * 0.4, 0, TAU); g.fill();
      g.strokeStyle = shade ? CYAN : '#7a5236'; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(r * 0.38, -r * 0.1); g.quadraticCurveTo(r * 0.55, r * 0.1, r * 0.35, r * 0.28); g.stroke(); // 瀏海
      g.fillStyle = shade ? '#000' : '#2a1a10'; g.beginPath(); g.arc(-r * 0.2, 0, r * 0.13, 0, TAU); g.fill(); // 髮髻
      g.strokeStyle = shade ? CYAN : RED; g.lineWidth = 2.5; g.beginPath(); g.arc(-r * 0.2, 0, r * 0.13, PI * 0.6, PI * 1.4); g.stroke(); // 綁繩
    });
    ctx.restore();
  }

  // ── 地面：風牆、劍意環、天寒地凍 ──
  function walls(ctx, b, t) {
    const w = b.world;
    if (!w || !w.walls) return;
    for (const wl of w.walls) {
      if (wl.owner !== b) continue;
      const left = wl.until - w.time; if (left <= 0) continue;
      const a = Math.min(1, (w.time - wl.t0) / 0.15, left / 0.4), [cx, cy] = BD.wallPos(wl, w.time), hw = wl.w / 2;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(wl.ang); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= a;
      const g = ctx.createLinearGradient(-46, 0, 46, 0);
      g.addColorStop(0, 'rgba(159,232,255,0)'); g.addColorStop(0.5, 'rgba(159,232,255,0.38)'); g.addColorStop(1, 'rgba(159,232,255,0)');
      ctx.fillStyle = g; ctx.fillRect(-46, -hw, 92, hw * 2);
      ctx.lineCap = 'round';
      for (let i = 0; i < 16; i++) { // 沿牆面上下流動的風絲
        const s = -hw + (i + 0.5) * wl.w / 16, ph = t * 5 + i * 1.7;
        ctx.strokeStyle = hexA(i % 3 ? PALE : WHITE, 0.45 + 0.3 * Math.sin(ph)); ctx.lineWidth = i % 3 ? 1.5 : 2.5;
        ctx.beginPath(); ctx.moveTo(-30 + Math.sin(ph) * 8, s); ctx.quadraticCurveTo(Math.sin(ph + 1) * 20, s + 14, 32 + Math.sin(ph + 2) * 8, s + 24); ctx.stroke();
      }
      ctx.strokeStyle = hexA(CYAN, 0.8); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -hw); ctx.lineTo(0, hw); ctx.stroke();
      for (const s of [-1, 1]) { ctx.save(); ctx.translate(0, s * hw); ctx.rotate(t * 8 * s); ctx.strokeStyle = hexA(WHITE, 0.7); ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(0, 0, 8 + k * 6, k * 2, k * 2 + 1.6); ctx.stroke(); } ctx.restore(); }
      ctx.restore();
    }
  }
  function flowRing(ctx, b, t) {
    if (b.state === 'dead') return;
    const f = (b.flow || 0) / 100, r = b.r + 14, full = f >= 1;
    ctx.save(); ctx.translate(b.x, b.y); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(159,232,255,0.15)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = hexA(full ? WHITE : CYAN, full ? 0.6 + 0.3 * Math.sin(t * 8) : 0.55); ctx.lineWidth = full ? 4 : 3;
    ctx.beginPath(); ctx.arc(0, 0, r, -PI / 2, -PI / 2 + TAU * f); ctx.stroke();
    if (full) spiral(ctx, r * 0.9, t * 0.6, 3, PALE, 0.35);
    const st = BD.getStatus(b, 'gatherstorm'), n = st ? st.stacks : 0;
    for (let i = 0; i < 2; i++) { // 天寒地凍：兩顆小旋風點，集滿時發亮旋轉
      const an = -PI / 2 + (i ? 0.35 : -0.35), x = Math.cos(an) * (r + 10), y = Math.sin(an) * (r + 10);
      ctx.fillStyle = hexA(i < n ? WHITE : CYAN, i < n ? 0.95 : 0.2); ctx.beginPath(); ctx.arc(x, y, i < n ? 4 : 3, 0, TAU); ctx.fill();
      if (n >= 2) { ctx.strokeStyle = hexA(PALE, 0.7); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 8, t * 10 + i, t * 10 + i + 3.6); ctx.stroke(); }
    }
    ctx.restore();
  }

  // ── 投射物：旋風（白藍渦流 + 星芒核心 + 繞飛碎葉）、斷風（細長的白色月牙風刃）──
  R.projStyles = R.projStyles || {};
  R.projStyles.tornado = function (ctx, p, t) {
    const r = p.r;
    ctx.rotate(-Math.atan2(p.vy, p.vx));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 1.2);
    g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.5, 'rgba(159,232,255,0.28)'); g.addColorStop(1, 'rgba(47,127,166,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.2, 0, TAU); ctx.fill();
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a0 = t * 16 + i * TAU / 6, rr = r * (0.35 + 0.11 * i);
      ctx.strokeStyle = hexA(i % 2 ? CYAN : WHITE, 0.85 - i * 0.08); ctx.lineWidth = 4 - i * 0.4;
      ctx.beginPath(); ctx.arc(0, -i * r * 0.06, rr, a0, a0 + 2.2); ctx.stroke();
    }
    ctx.strokeStyle = hexA(WHITE, 0.9); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r * 0.35, 0); ctx.lineTo(r * 0.35, 0); ctx.moveTo(0, -r * 0.35); ctx.lineTo(0, r * 0.35); ctx.stroke();
    ctx.fillStyle = '#d8462a';
    for (let i = 0; i < 4; i++) { const an = -t * 9 + i * TAU / 4, rr = r * (0.9 + 0.1 * Math.sin(t * 5 + i)); ctx.beginPath(); ctx.ellipse(Math.cos(an) * rr, Math.sin(an) * rr, 3.5, 2, an, 0, TAU); ctx.fill(); }
    ctx.restore();
  };
  R.projStyles.windblade = function (ctx, p, t) {
    const k = p.r, pulse = 0.85 + 0.15 * Math.sin(t * 30 + p.r);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const path = (s) => { ctx.beginPath(); ctx.moveTo(-k * 0.4 * s, -k * 1.6 * s); ctx.quadraticCurveTo(k * 1.1 * s, 0, -k * 0.4 * s, k * 1.6 * s); ctx.quadraticCurveTo(k * 0.35 * s, 0, -k * 0.4 * s, -k * 1.6 * s); };
    for (let i = 1; i <= 3; i++) { ctx.save(); ctx.translate(-k * 0.7 * i, 0); ctx.fillStyle = hexA(CYAN, 0.22 - i * 0.05); path(1 - i * 0.1); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = hexA(CYAN, 0.6 * pulse); path(1.15); ctx.fill();
    ctx.fillStyle = hexA(WHITE, 0.9); path(0.8); ctx.fill();
    ctx.strokeStyle = hexA(PALE, 0.5); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-k * 0.4, -k * 1.6); ctx.lineTo(-k * 3.4, -k * 1.2); ctx.moveTo(-k * 0.4, k * 1.6); ctx.lineTo(-k * 3.4, k * 1.2); ctx.stroke();
    ctx.restore();
  };

  R.defineBossStyle('yasuo', { body, under(ctx, b, t) { walls(ctx, b, t); flowRing(ctx, b, t); } });
})(typeof window !== 'undefined' ? window : globalThis);
