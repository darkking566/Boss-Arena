'use strict';
// Boss 造型：劫：背負巨型手裏劍、兩臂腕刃、刃冠頭盔與紅色眼縫、尖角護肩；二階段護甲縫隙透出紅光、背上手裏劍緩緩轉動。
// 逐招動畫：每個出手動作（hit / proj / swap / shadowstep / shadow / appear）依種類取一組「蓄力 → 引 → 擊 → 收」關鍵值姿態（pick），
// 驅動雙臂前伸、軀幹迴旋、前衝、蹲伏、結印與腕刃蓄力光，連段姿態混合不跳格；風魔手裏劍會從背上取下、離手後背上留空位。
// 地面層（decor）依下一手 / 上一手的動作種類畫蓄力光與收勢：斬光、迴旋環、換位煙爆、瞬步 X 斬、影子池、死亡印記符環。
// 影子（b.shadows）以同一身形的漆黑剪影繪製，並模仿本體目前的招式姿勢——原作影子會同步施放（影子只重現投擲與迴旋的光效）。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  const TRIG = { hit: 1, proj: 1, swap: 1, shadowstep: 1, shadow: 1, appear: 1 };
  const RED = '#e01e37', HOT = '#ff3048';
  const TAU = U.TAU, PI = Math.PI;
  const ease = (u) => 1 - (1 - u) * (1 - u);
  const lerp = (a, b, u) => a + (b - a) * u;
  const _ = undefined;

  // 姿態參數預設值：e0 / e1 左右臂前伸（負值＝後拉）、spin 軀幹迴旋角、fwd 整體前衝（半徑倍數）、sq 蹲伏壓縮、
  // seal 雙手合攏結印、gl 腕刃與眼縫蓄力光、lift 背上手裏劍取下舉起（風魔）
  const DEF = { e0: 0.1, e1: 0.1, spin: 0, fwd: 0, sq: 1, seal: 0, gl: 0, lift: 0 };
  const KEYS = Object.keys(DEF);

  // 關鍵值：key: [引（蓄滿）, 擊, 起始 = DEF, 收招 = 起始, 擊後衰減起點 = 擊]
  // 腕刃突刺：出手臂後拉再刺出，另一臂護在身前，軀幹反向扭轉再彈回；k 為力道（最後一擊的撲刺加大）
  const stab = (s, k) => ({ ['e' + s]: [-0.75, 1.15 * k], ['e' + (1 - s)]: [0.35, -0.15], spin: s ? [0.4, -0.32 * k] : [-0.4, 0.32 * k], fwd: [-0.12, 0.3 * k], sq: [0.94, 1], gl: [0.6, 1] });
  const STAB = [stab(0, 1), stab(1, 1)], LUNGE = [stab(0, 1.4), stab(1, 1.4)];
  // 鬼斬迴旋：反扭蓄力 → 張臂整圈迴旋（k 圈）
  const whirl = (s, n) => ({ e0: [0.45, 1.1, _, _, 1.1], e1: [0.45, 1.1, _, _, 1.1], spin: [-0.8 * s, s * (n * TAU - 0.8), 0, s * n * TAU, s * (n * TAU - 0.8)], fwd: [-0.05, 0.08], sq: [0.9, 1], gl: [0.8, 1] });
  const WHIRL = [whirl(1, 1), whirl(-1, 1)], DANCE_WHIRL = whirl(1, 2);
  // 擲手裏劍：右臂後拉擲出，左臂前護；風魔手裏劍則把背上的巨型手裏劍取下舉過肩，雙臂同力
  const THROW = { e1: [-0.9, 1.15], e0: [0.55, 0.25], spin: [0.45, -0.3], fwd: [-0.1, 0.12], sq: [0.93, 1], gl: [0.8, 1] };
  const BIGTHROW = { e1: [-1.1, 1.25], e0: [0.9, 0.3], spin: [0.9, -0.55], fwd: [-0.2, 0.2], sq: [0.86, 1], gl: [1, 1], lift: [1, 1, _, _, 0] };
  // 放影子 / 換位：雙手在胸前合攏結印、蹲伏；瞬步：交叉蹲伏準備快斬；現身：從蹲伏彈起
  const SEAL = { seal: [1, 0.5], e0: [0.5, 0.7], e1: [0.5, 0.7], sq: [0.8, 0.92], fwd: [-0.06, 0.12], gl: [0.7, 1] };
  const SWAP = { seal: [1, 0.2], e0: [0.5, 0.4], e1: [0.5, 0.4], sq: [0.82, 1], spin: [-0.3, 0.2], gl: [1, 1] };
  const BLINK = { seal: [0.6, 0], e0: [0.8, 0.5], e1: [0.8, 0.5], sq: [0.84, 0.95], fwd: [-0.08, 0.08], spin: [0.3, 0], gl: [0.8, 0.5] };
  const EMERGE = { sq: [0.78, 1], seal: [0.8, 0.3], e0: [0.6, 0.5], e1: [0.6, 0.5], gl: [1, 1] };

  // 依動作種類與所屬技能挑姿態
  function pick(e, sid) {
    const a = e.a;
    switch (a.do) {
      case 'proj': return sid === 'windmill' ? BIGTHROW : THROW;
      case 'hit':
        if (a.shape === 'circle') return sid === 'shadow_dance' ? DANCE_WHIRL : WHIRL[e.hi & 1];
        return sid === 'blade_flurry' && e.last ? LUNGE[e.hi & 1] : STAB[e.hi & 1];
      case 'swap': return SWAP;
      case 'shadowstep': return BLINK;
      case 'shadow': return SEAL;
      default: return EMERGE;
    }
  }

  // 重用物件：本幀姿態（A）、擊後混合用（B）、出手節奏（P）
  const A = Object.assign({}, DEF), B = {};
  const P = { L: -1, N: -1, le: null, ne: null, wd: 0, sn: 0, sw: 0, since: 0 };
  const CACHE = new WeakMap();
  // 招式內的出手動作（依時間排序）；hi＝第幾記 hit、last＝最後一記 hit
  function trigs(v) {
    let c = CACHE.get(v.actions);
    if (!c) {
      c = []; let hn = 0;
      for (const a of v.actions) if (TRIG[a.do]) c.push({ a, hi: a.do === 'hit' ? hn++ : -1, last: false });
      for (const e of c) e.last = e.hi === hn - 1;
      c.sort((x, y) => x.a.at - y.a.at);
      CACHE.set(v.actions, c);
    }
    return c;
  }
  // 出手節奏：擊後 0.25s 內仍保留「擊」姿態並與下一手的蓄力混合，連段不跳格
  function pace(inst) {
    const c = trigs(inst.v), t = inst.t; let L = -1, N = -1;
    for (let i = 0; i < c.length; i++) { if (c[i].a.at <= t) L = i; else { N = i; break; } }
    P.L = L; P.N = N; P.le = L >= 0 ? c[L] : null; P.ne = N >= 0 ? c[N] : null;
    const endL = L >= 0 ? c[L].a.at : 0;
    P.since = L >= 0 ? t - endL : 0;
    P.sn = L >= 0 && P.since < 0.25 ? 1 - P.since / 0.25 : 0;
    P.wd = N >= 0 ? U.clamp((t - endL) / Math.max(0.05, c[N].a.at - endL), 0, 1) : 0;
  }
  // 把一組關鍵值展開成姿態：蓄力（a = hold, b = sw）/ 擊後衰減（a = sn）/ 收招定格
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

  // 手的位置（寫入 HX / HY，避免配置）：s -1 左 / 1 右；seal 合攏時兩手靠向中線
  let HX = 0, HY = 0;
  function hand(r, s, ext, seal) { HX = r * (0.5 + 0.45 * ext + 0.1 * seal); HY = s * r * (0.56 - 0.16 * ext - 0.44 * seal); }

  // ───────── 地面層：蓄力光與收勢（畫在身體底下，本地座標：+x 為面向）─────────
  function ring(ctx, x, y, rad, a, col, w) {
    ctx.strokeStyle = hexA(col, a); ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, Math.max(1, rad), 0, TAU); ctx.stroke();
  }
  function crescent(ctx, rad, a0, a1, col, a, w) { // 弧形斬光：紅暈 + 白芯
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.strokeStyle = hexA(col, 0.6 * a); ctx.lineWidth = w * 2.2; ctx.beginPath(); ctx.arc(0, 0, rad, a0, a1); ctx.stroke();
    ctx.strokeStyle = hexA('#ffffff', 0.85 * a); ctx.lineWidth = w * 0.6; ctx.stroke();
    ctx.restore();
  }
  function motes(ctx, r, col, k, n) { // 光點向身上收束
    ctx.fillStyle = hexA(col, 0.8 * k);
    for (let i = 0; i < n; i++) { const an = i * TAU / n + k * 3, d = (1 - k) * r * 4 + r * 0.8; ctx.beginPath(); ctx.arc(Math.cos(an) * d, Math.sin(an) * d, 2.5, 0, TAU); ctx.fill(); }
  }
  function glint(ctx, x, y, rad, a) { // 手上 / 刃尖的蓄力光
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = hexA(HOT, 0.35 * a); ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
    ctx.fillStyle = hexA('#ffffff', 0.8 * a); ctx.beginPath(); ctx.arc(x, y, rad * 0.35, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function burst(ctx, x, y, k, rad) { // 暗影煙爆：黑煙團 + 紅環 + 放射線（k 由 1 衰減到 0）
    const e = 1 - k;
    ctx.fillStyle = hexA('#05020a', 0.55 * k); ctx.beginPath(); ctx.arc(x, y, rad * (0.35 + 0.65 * e), 0, TAU); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ring(ctx, x, y, rad * (0.4 + 0.8 * e), 0.8 * k, RED, 3);
    ctx.strokeStyle = hexA(HOT, 0.6 * k); ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const an = i * PI / 4 + 0.2; ctx.moveTo(x + Math.cos(an) * rad * 0.3 * e, y + Math.sin(an) * rad * 0.3 * e); ctx.lineTo(x + Math.cos(an) * rad * (0.4 + 0.7 * e), y + Math.sin(an) * rad * (0.4 + 0.7 * e)); }
    ctx.stroke(); ctx.restore();
  }
  function cross(ctx, rot, len, col, a) { // 瞬步 X 斬
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.rotate(rot);
    for (const w of [[5, col, 0.6], [1.6, '#ffffff', 0.9]]) {
      ctx.strokeStyle = hexA(w[1], w[2] * a); ctx.lineWidth = w[0]; ctx.beginPath();
      ctx.moveTo(-len, -len * 0.6); ctx.lineTo(len, len * 0.6); ctx.moveTo(-len, len * 0.6); ctx.lineTo(len, -len * 0.6); ctx.stroke();
    }
    ctx.restore();
  }
  function cracks(ctx, rad, a) {
    ctx.strokeStyle = hexA('#1a0508', a); ctx.lineWidth = 2.2; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const an = i * 0.785 + 0.2, l = rad * (0.6 + 0.2 * (i % 3)); ctx.moveTo(Math.cos(an) * rad * 0.2, Math.sin(an) * rad * 0.2); ctx.lineTo(Math.cos(an) * l, Math.sin(an) * l); }
    ctx.stroke();
  }

  // 蓄力：依「下一手」的種類與所屬技能
  function windup(ctx, sid, r, e, wd, t, p2) {
    const a = e.a, tint = p2 ? HOT : RED;
    if (a.do === 'proj') {
      hand(r, 1, A.e1, A.seal); glint(ctx, HX + r * 0.5, HY, r * (0.2 + 0.4 * wd), wd);
      if (sid === 'windmill') { // 風魔：身周旋轉的刃環與匯入的光點
        ctx.save(); ctx.setLineDash([16, 10]); ctx.lineDashOffset = -t * 120; ring(ctx, 0, 0, r * (2.6 - 0.5 * wd), 0.2 + 0.5 * wd, tint, 3); ctx.restore();
        motes(ctx, r, HOT, wd, 8);
      }
    } else if (a.do === 'hit' && a.shape === 'circle') { // 鬼斬 / 亂舞終式：身周繞動的三道弧光
      for (let i = 0; i < 3; i++) { const an = t * 10 + i * TAU / 3; crescent(ctx, r * 1.7, an, an + 0.9, tint, 0.5 * wd, 2); }
      if (a.r > 155) motes(ctx, r, HOT, wd, 10);
    } else if (a.do === 'hit') { // 突刺：出手臂腕刃尖端凝光
      const s = e.hi & 1 ? 1 : -1; hand(r, s, A['e' + (e.hi & 1)], 0); glint(ctx, HX + r * 1.2, HY + s * r * 0.34, 3 + 7 * wd, wd);
    } else if (a.do === 'shadow') { // 放影子：腳下黑影池擴張、符環收束
      ctx.fillStyle = hexA('#05020a', 0.5 * wd); ctx.beginPath(); ctx.ellipse(0, 0, r * (0.8 + 0.9 * wd), r * (0.65 + 0.7 * wd), 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.setLineDash([8, 7]); ctx.lineDashOffset = -t * 40; ring(ctx, 0, 0, r * (2.4 - 0.9 * wd), 0.2 + 0.5 * wd, tint, 2); ctx.restore();
      motes(ctx, r, HOT, wd, 6);
    } else if (a.do === 'swap') { // 換位：黑煙聚攏
      ctx.fillStyle = hexA('#05020a', 0.45 * wd); ctx.beginPath(); ctx.arc(0, 0, r * (1.7 - 0.6 * wd), 0, TAU); ctx.fill();
      motes(ctx, r, HOT, wd, 6);
    }
  }
  // 收勢：依「上一手」的種類；k 由 1 衰減到 0
  function snapfx(ctx, sid, r, e, k, p2) {
    const a = e.a, tint = p2 ? HOT : RED, ex = 1 - k;
    if (a.do === 'proj') {
      hand(r, 1, 1, 0);
      ctx.strokeStyle = hexA(tint, 0.7 * k); ctx.lineWidth = 2.2; ctx.beginPath();
      for (let i = -1; i <= 1; i++) { const x0 = HX + r * 0.5 + ex * r * 3 + Math.abs(i) * 10; ctx.moveTo(x0, HY + i * r * 0.14); ctx.lineTo(x0 + 150 * k, HY + i * r * 0.14); }
      ctx.stroke();
      if (sid === 'windmill') ring(ctx, 0, 0, r * (1.5 + 2.2 * ex), 0.6 * k, tint, 5);
    } else if (a.do === 'hit' && a.shape === 'circle') {
      const rad = a.r;
      ring(ctx, 0, 0, rad * (0.7 + 0.35 * ex), 0.85 * k, tint, 6);
      for (let i = 0; i < 3; i++) { const an = ex * 6 * (e.hi & 1 ? -1 : 1) + i * TAU / 3; crescent(ctx, rad * 0.88, an, an + 1.1, tint, k, 4); }
      if (rad > 155) cracks(ctx, rad * 0.8, k);
    } else if (a.do === 'hit') { // 腕刃交叉斬：由出手側掃向另一側的弧光
      const half = (a.arc || 2) / 2, rad = (a.r || 112) * 0.95, s = e.hi & 1 ? 1 : -1, from = -half * s, to = lerp(from, -from, Math.min(1, ex * 3.5));
      ctx.fillStyle = hexA(tint, 0.14 * k); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, rad, -half, half); ctx.closePath(); ctx.fill();
      crescent(ctx, rad, Math.min(from, to), Math.max(from, to), tint, k, 4);
      if (e.last && sid === 'blade_flurry') crescent(ctx, rad * 0.65, -half * 0.8, half * 0.8, tint, 0.8 * k, 3);
    } else if (a.do === 'swap') {
      burst(ctx, 0, 0, k, r * 3);
    } else if (a.do === 'shadowstep') {
      cross(ctx, a.off, r * (1.3 + 0.8 * ex), tint, k); ring(ctx, 0, 0, r * (1 + 1.4 * ex), 0.5 * k, tint, 2);
    } else if (a.do === 'shadow') { // 影子衝出：沿身前拖出暗影軌跡與符環
      ctx.strokeStyle = hexA('#05020a', 0.6 * k); ctx.lineWidth = r * 0.7 * k; ctx.lineCap = 'round';
      if (a.to === 'target') { ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(r + Math.min(a.dist, 420) * Math.min(1, ex * 4), 0); ctx.stroke(); }
      ring(ctx, 0, 0, r * (1.2 + 1.8 * ex), 0.6 * k, tint, 3);
    } else if (a.do === 'appear') { // 現身於背後：煙爆 + 死亡印記符環（六角星）
      burst(ctx, 0, 0, k, r * 3.4);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(HOT, 0.7 * k); ctx.lineWidth = 2;
      const sr = r * (1.4 + 1.6 * ex);
      for (let j = 0; j < 2; j++) { ctx.beginPath(); for (let i = 0; i < 3; i++) { const an = j * PI / 3 + i * TAU / 3 - PI / 2 + ex; ctx.lineTo(Math.cos(an) * sr, Math.sin(an) * sr); } ctx.closePath(); ctx.stroke(); }
      ctx.restore();
    }
  }
  function decor(ctx, sid, r, p2, t, shade) {
    if (P.ne && P.wd > 0 && (!shade || P.ne.a.do === 'proj' || P.ne.a.shape === 'circle')) windup(ctx, sid, r, P.ne, P.wd, t, p2);
    if (P.le) {
      const k = U.clamp(1 - P.since / 0.34, 0, 1), a = P.le.a;
      if (k > 0 && (!shade || a.do === 'proj' || a.shape === 'circle')) snapfx(ctx, sid, r, P.le, k, p2);
    }
  }

  // 一條手臂＋腕刃（s：-1 左、1 右；ext 前伸量；seal 合攏；gl 腕刃蓄力光）
  function arm(ctx, r, s, ext, seal, gl, shade, p2) {
    const sx = r * 0.05, sy = s * r * 0.72;
    hand(r, s, ext, seal); const hx = HX, hy = HY;
    // 腕刃：裝在前臂外側，越過拳頭往前延伸、刃背向外弧
    const ax = hx - r * 0.4, ay = hy + s * r * 0.08, bx = hx + r * 1.2, by = hy + s * r * 0.34;
    if (gl > 0.05) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      ctx.strokeStyle = hexA(HOT, 0.45 * gl); ctx.lineWidth = 3 + 6 * gl; ctx.beginPath(); ctx.moveTo(ax + r * 0.3, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = shade ? '#000000' : '#c3c8d2';
    ctx.beginPath(); ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(hx + r * 0.45, hy + s * r * 0.42, bx, by);
    ctx.quadraticCurveTo(hx + r * 0.35, hy + s * r * 0.08, ax + r * 0.1, ay - s * r * 0.12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade || p2 ? RED : '#f4f6fa'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(hx + r * 0.45, hy + s * r * 0.42, bx, by); ctx.stroke();
    ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(ax + r * 0.14, ay - s * r * 0.01, r * 0.06, 0, TAU); ctx.fill();
    // 手臂與護腕
    ctx.strokeStyle = shade ? '#050407' : '#22242c'; ctx.lineWidth = r * 0.24; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = shade ? '#1a0508' : '#545966'; ctx.lineWidth = r * 0.28;
    ctx.beginPath(); ctx.moveTo(hx - r * 0.32, hy - s * r * 0.02); ctx.lineTo(hx - r * 0.02, hy); ctx.stroke();
  }

  function body(ctx, o, t, { def, r }) {
    const shade = !!o.shade, p2 = o.phase === 2;
    const stag = o.state === 'stagger' || o.state === 'stun'; // 被打斷：回到待機姿態
    const inst = !stag && o.inst && o.inst.skill && o.inst.v && o.inst.v.actions ? o.inst : null;
    const sid = inst ? inst.skill.id : '';
    for (const k of KEYS) A[k] = DEF[k];
    if (inst) { pace(inst); build(sid); } else { A.e0 = 0.1 + Math.sin(t * 2.4) * 0.06; A.e1 = 0.1 - Math.sin(t * 2.4) * 0.06; }
    ctx.save();
    if (inst) { decor(ctx, sid, r, p2, t, shade); ctx.translate(A.fwd * r, 0); if (A.sq !== 1) ctx.scale(A.sq, 1 + (1 - A.sq) * 0.5); }
    if (A.spin) ctx.rotate(A.spin);
    const tag = r + ':' + (shade ? 's' : 'b');

    // 背上的巨型手裏劍（二階段緩緩轉動）；風魔：取下舉過肩並加速旋轉，離手後背上只剩空位的虛影
    const away = !shade && o.world && o.world.projectiles.some((q) => q.owner === o && q.ret && q.alive);
    ctx.save();
    if (away) { ctx.strokeStyle = hexA(RED, 0.5); ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(-r * 0.62, 0, r * 0.7, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    else {
      ctx.translate(lerp(-r * 0.62, r * 0.35, A.lift), lerp(0, r * 1.05, A.lift)); if (A.lift) ctx.scale(1 + 0.4 * A.lift, 1 + 0.4 * A.lift);
      ctx.rotate(0.4 + (p2 ? t * 1.5 : 0) + A.lift * t * 18);
      if (A.lift) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = hexA(HOT, 0.25 + 0.3 * A.lift); ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, TAU); ctx.fill(); ctx.restore(); }
      R.blit(ctx, 'body:zed:star:' + tag, r * 2 + 6, r * 2 + 6, r + 3, r + 3, (g) => {
        g.fillStyle = shade ? '#000000' : '#5a5f6c';
        g.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2;
          g.moveTo(Math.cos(a + 0.6) * r * 0.24, Math.sin(a + 0.6) * r * 0.24);
          g.quadraticCurveTo(Math.cos(a + 0.28) * r * 0.7, Math.sin(a + 0.28) * r * 0.7, Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98);
          g.lineTo(Math.cos(a - 0.45) * r * 0.26, Math.sin(a - 0.45) * r * 0.26);
        }
        g.fill();
        g.strokeStyle = shade ? RED : '#b4bac6'; g.lineWidth = 1.2; g.stroke();
        g.fillStyle = shade ? '#000000' : '#22242c'; g.beginPath(); g.arc(0, 0, r * 0.28, 0, TAU); g.fill();
        g.fillStyle = RED; g.beginPath(); g.arc(0, 0, r * 0.12, 0, TAU); g.fill();
      });
    }
    ctx.restore();

    // 軀幹（精靈快取）
    R.blit(ctx, 'body:zed:torso:' + tag, r * 1.3 + 8, r * 1.9 + 8, r * 0.65 + 4, r * 0.95 + 4, (g) => {
      const gr = g.createRadialGradient(r * 0.1, 0, 2, 0, 0, r);
      gr.addColorStop(0, shade ? '#120a0d' : '#3a3d47'); gr.addColorStop(1, shade ? '#000000' : def.color2);
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, r * 0.6, r * 0.9, 0, 0, U.TAU); g.fill();
    });

    // 兩臂腕刃（右臂兼擲手裏劍）
    arm(ctx, r, -1, A.e0, A.seal, A.gl, shade, p2);
    arm(ctx, r, 1, A.e1, A.seal, A.gl, shade, p2);

    // 尖角護肩：兩片向後掠的尖刺甲片，外緣紅邊（壓住肩關節）
    R.blit(ctx, 'body:zed:pauldron:' + tag, r * 1.4 + 8, r * 2.4 + 8, r * 0.85 + 4, r * 1.2 + 4, (g) => {
      for (const s of [-1, 1]) {
        g.fillStyle = shade ? '#050407' : '#30333d';
        g.beginPath(); g.moveTo(r * 0.28, s * r * 0.42); g.lineTo(r * 0.12, s * r * 0.92); g.lineTo(-r * 0.3, s * r * 1.12);
        g.lineTo(-r * 0.32, s * r * 0.86); g.lineTo(-r * 0.78, s * r * 0.92); g.lineTo(-r * 0.4, s * r * 0.48); g.closePath(); g.fill();
        g.strokeStyle = shade ? RED : '#6a707d'; g.lineWidth = 1; g.stroke();
        g.strokeStyle = RED; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(r * 0.12, s * r * 0.92); g.lineTo(-r * 0.3, s * r * 1.12); g.lineTo(-r * 0.32, s * r * 0.86); g.lineTo(-r * 0.78, s * r * 0.92); g.stroke();
      }
    });
    if (p2 && !shade) {
      // 二階段：護甲縫隙透出的紅光
      ctx.strokeStyle = hexA(RED, 0.5 + 0.3 * Math.sin(t * 6)); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.3); ctx.lineTo(r * 0.1, 0); ctx.lineTo(-r * 0.4, r * 0.3); ctx.stroke();
    }

    // 刃冠頭盔
    R.blit(ctx, 'body:zed:helm:' + tag, r * 1.5 + 8, r * 1.1 + 8, r * 0.7 + 4, r * 0.55 + 4, (g) => {
      const gr = g.createRadialGradient(r * 0.15, -r * 0.1, 1, r * 0.08, 0, r * 0.5);
      gr.addColorStop(0, shade ? '#1a0d10' : '#6c717e'); gr.addColorStop(1, shade ? '#000000' : '#22242c');
      g.fillStyle = gr; g.beginPath(); g.arc(r * 0.08, 0, r * 0.46, 0, U.TAU); g.fill();
      // 頭盔中線的刃冠：由後往前收尖
      g.fillStyle = shade ? '#000000' : '#9aa0ad';
      g.beginPath(); g.moveTo(-r * 0.7, 0); g.lineTo(-r * 0.1, -r * 0.09); g.lineTo(r * 0.5, 0); g.lineTo(-r * 0.1, r * 0.09); g.closePath(); g.fill();
      g.strokeStyle = shade ? RED : '#2a2c34'; g.lineWidth = 1; g.stroke();
    });
    // 紅色眼縫（脈動光，不快取）
    const ea = Math.min(1, (shade ? 0.9 : p2 ? 0.75 + 0.25 * Math.sin(t * 9) : 0.85) + 0.2 * A.gl);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA(HOT, ea); ctx.lineWidth = 2.2 + 1.5 * A.gl; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(r * 0.3, s * r * 0.08); ctx.lineTo(r * 0.44, s * r * 0.24); ctx.stroke(); }
    ctx.restore();
    ctx.restore();
  }

  // 影子：地上一灘黑影 + 漆黑剪影（出現時淡入、消失前淡出、輕微閃爍）
  function shadows(ctx, b, t) {
    const w = b.world, list = b.shadows;
    if (!w || !list || !list.length) return;
    for (const s of list) {
      const left = s.until - w.time, age = w.time - s.t0;
      if (left <= 0) continue;
      const a = U.clamp(age / 0.15, 0, 1) * U.clamp(left / 0.4, 0, 1) * (0.78 + 0.12 * Math.sin(t * 11 + s.t0 * 7));
      ctx.save(); ctx.globalAlpha *= a;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.ellipse(s.x + 4, s.y + 6, b.r * 1.2, b.r * 0.95, 0, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = hexA(RED, 0.55); ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]); ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.arc(s.x, s.y, b.r + 8, 0, U.TAU); ctx.stroke(); ctx.setLineDash([]);
      const face = b.enemy ? U.angTo(s, b.enemy) : s.face;
      R.drawBossBody(ctx, { x: s.x, y: s.y, face, r: b.r, def: b.def, phase: b.phase, state: b.state, inst: b.inst, shade: true }, t);
      ctx.restore();
      if (BD.vrng() < 0.25) w.fx.motes(s.x + (BD.vrng() - 0.5) * b.r * 1.6, s.y + (BD.vrng() - 0.5) * b.r * 1.6, BD.element('umbra'), 1, b.r * 0.5, 40);
    }
  }

  // 三角殺陣：本體與兩個影子連成三角形，三頂點各拉一道紅線匯向目標（三把諸刃交會）
  function triangle(ctx, b, t) {
    const inst = b.inst, e = b.enemy, list = b.shadows;
    if (!inst || !inst.skill || inst.skill.id !== 'shadow_triangle' || !e || !list || list.length < 2) return;
    const pts = [b, list[list.length - 2], list[list.length - 1]], a = 0.35 + 0.2 * Math.sin(t * 10);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 60;
    ctx.strokeStyle = hexA(HOT, a); ctx.lineWidth = 2; ctx.beginPath();
    pts.forEach((p, i) => { const q = pts[(i + 1) % 3]; ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); });
    ctx.stroke();
    ctx.strokeStyle = hexA(RED, a * 0.7); ctx.beginPath();
    for (const p of pts) { ctx.moveTo(p.x, p.y); ctx.lineTo(e.x, e.y); }
    ctx.stroke(); ctx.restore();
  }

  // 瞬獄影殺陣：化為暗影（無法選取）時，以一顆拖著黑煙的紅光沿路徑掠向目標背後
  function vanished(ctx, b, t) {
    const inst = b.inst, e = b.enemy;
    if (!inst || !e) return;
    const acts = inst.v.actions, h = acts.find((a) => a.do === 'hide'), ap = acts.find((a) => a.do === 'appear');
    if (!h || !ap) return;
    const q = U.clamp((inst.t - h.at) / (ap.at - h.at), 0, 1), ang = e.face + PI, ex = e.x + Math.cos(ang) * (ap.dist + e.r), ey = e.y + Math.sin(ang) * (ap.dist + e.r);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const u = Math.max(0, q - i * 0.04);
      ctx.fillStyle = hexA(i ? '#2a0a10' : HOT, (i ? 0.45 : 0.9) * (1 - i / 7));
      ctx.beginPath(); ctx.arc(lerp(b.x, ex, u), lerp(b.y, ey, u), b.r * (0.5 - i * 0.05), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  R.defineBossStyle('zed', { body, under(ctx, b, t) { shadows(ctx, b, t); triangle(ctx, b, t); }, hidden: vanished });
})(typeof window !== 'undefined' ? window : globalThis);
