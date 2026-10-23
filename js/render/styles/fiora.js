'use strict';
// Boss 造型：菲歐拉（依原畫）：酒紅色短髮、白色貼身上衣、金銅肩甲與護手臂甲、深紫披風、寬刃劍；二階段劍身泛起光芒。
// 逐招動畫：每個出手動作（hit / dash / vitalstep / vitalmark）依種類與所屬技能取一組「蓄力 → 擊 → 收」關鍵值姿態（pick），
// 驅動持劍前伸、軀幹扭轉、前衝、蹲伏、左臂平衡、劍角、披風飄揚與劍身蓄力光，連段姿態混合不跳格；招架期間橫劍護身。
// 地面層（decor）依下一手 / 上一手畫蓄力光與收勢：刺劍光軌、衝刺風切線、側步弧光、破綻瞬步菱形爆、招架護盾弧、終極挑戰的四破綻環。
// under()：在對手身上畫出「破綻」標記（金色菱形，位置即決鬥之舞的命中方位）。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  const TRIG = { hit: 1, dash: 1, vitalstep: 1, vitalmark: 1 };
  const GOLD = '#d4a94a', PINK = '#e0527a', BRIGHT = '#fff1b0', ICE = '#9fe0ff';
  const TAU = U.TAU, PI = Math.PI;
  const ease = (u) => 1 - (1 - u) * (1 - u);
  const lerp = (a, b, u) => a + (b - a) * u;
  const _ = undefined;

  // 姿態參數預設值：ext 持劍前伸（負值＝後拉）、off 左臂向後甩開、spin 軀幹扭轉、fwd 整體前衝（半徑倍數）、
  // sq 蹲伏壓縮、ang 劍身偏轉角、gl 劍身蓄力光、cape 披風向後飄直的程度
  const DEF = { ext: 0.15, off: 0, spin: 0, fwd: 0, sq: 1, ang: 0, gl: 0, cape: 0 };
  const KEYS = Object.keys(DEF);

  // 關鍵值：key: [蓄滿, 擊, 起始 = DEF, 收招 = 起始, 擊後衰減起點 = 擊]
  // 刺擊：劍後拉、軀幹反向扭轉再彈回，左臂甩開平衡；k 為力道（收尾刺與招架反刺更大），s 左右交替
  const thrust = (s, k) => ({ ext: [-0.45 * k, 0.85 + 0.25 * k], off: [0.3, k > 1 ? 1 : 0.8], spin: [0.3 * s * k, -0.2 * s * k], fwd: [-0.1 * k, 0.05 + 0.22 * k],
    sq: [1 - 0.05 * k, 1], ang: [0.14 * s * k, 0], gl: [0.5, 1], cape: [0, 0.5 * k] });
  const THR = [-1, 1].map((s) => [0.8, 1, 1.3, 1.5].map((k) => thrust(s, k)));
  // 衝刺突刺（移形之體）與飛躍突刺（整個人壓低伸直、披風完全飄直）
  const LUNGE = { ext: [-0.7, 1.2], off: [0.4, 1], spin: [0.2, -0.1], fwd: [-0.22, 0.55], sq: [0.84, 1.04], ang: [0.1, 0], gl: [0.8, 1], cape: [0, 1] };
  const FLECHE = { ext: [-0.8, 1.3], off: [0.5, 1], fwd: [-0.3, 0.9], sq: [0.8, 1.08], gl: [0.9, 1], cape: [0.2, 1] };
  const SIDE = { ext: [0.2, 0.35], off: [0.6, 0.9], spin: [0.45, -0.25], sq: [0.9, 1], gl: [0.5, 0.8], cape: [0.5, 1] }; // 側步閃身
  const RECOIL = { ext: [0, -0.1], ang: [-0.6, -0.9], fwd: [0, -0.25], sq: [1, 0.94], gl: [0.4, 0.7], cape: [0.3, 0.2] }; // 刺後拉開，橫劍護身
  const BLINK = { ext: [-0.25, 0.3], off: [0.9, 0.4], spin: [-0.35, 0.15], fwd: [-0.1, 0.05], sq: [0.8, 0.96], ang: [-0.7, -0.2], gl: [1, 1] }; // 瞬步：蹲伏、劍橫舉過胸
  const RAISE = { ext: [0.7, 0.7], off: [1, 0.7], sq: [0.96, 1], ang: [-0.9, -0.9], gl: [1, 1], cape: [0.5, 0.5] }; // 終極挑戰：劍指天際宣告

  // 依動作種類與所屬技能挑姿態
  function pick(e, sid) {
    const a = e.a;
    if (a.do === 'vitalmark') return RAISE;
    if (a.do === 'vitalstep') return BLINK;
    if (a.do === 'dash') return a.hit ? (sid === 'fleche' ? FLECHE : LUNGE) : a.dir === 'back' ? RECOIL : SIDE;
    return THR[e.hi & 1][sid === 'parry_w' ? 3 : e.last ? 2 : sid === 'flurry' ? 0 : 1];
  }

  // 重用物件：本幀姿態（A）、擊後混合用（B）、出手節奏（P）、劍尖座標（TX / TY）
  const A = Object.assign({}, DEF), B = {};
  const P = { L: -1, N: -1, le: null, ne: null, wd: 0, sn: 0, sw: 0, since: 0, done: 0 };
  const CACHE = new WeakMap();
  let TX = 0, TY = 0;
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
  // 出手節奏：擊後 0.25s 內仍保留「擊」姿態並與下一手的蓄力混合，連段不跳格；done＝已刺出幾記 hit
  function pace(inst) {
    const c = trigs(inst.v), t = inst.t; let L = -1, N = -1, done = 0;
    for (let i = 0; i < c.length; i++) { if (c[i].a.at <= t) { L = i; if (c[i].a.do === 'hit') done++; } else { N = i; break; } }
    P.L = L; P.N = N; P.le = L >= 0 ? c[L] : null; P.ne = N >= 0 ? c[N] : null; P.done = done;
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

  // 劍尖在本地座標的位置（寫入 TX / TY；未計入軀幹扭轉）
  function tipOf(r) {
    const e = A.ext, rot = -0.12 * (1 - e) + A.ang;
    TX = A.fwd * r + r * (0.55 + 0.7 * e) + Math.cos(rot) * r * 3.2; TY = r * (0.5 - 0.3 * Math.max(e, 0)) + Math.sin(rot) * r * 3.2;
  }

  // ───────── 地面層：蓄力光與收勢（畫在身體底下，本地座標：+x 為面向）─────────
  function ring(ctx, x, y, rad, a, col, w) {
    ctx.strokeStyle = hexA(col, a); ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, Math.max(1, rad), 0, TAU); ctx.stroke();
  }
  function crescent(ctx, rad, a0, a1, col, a, w) { // 弧形光：金暈 + 白芯
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.strokeStyle = hexA(col, 0.6 * a); ctx.lineWidth = w * 2.2; ctx.beginPath(); ctx.arc(0, 0, rad, a0, a1); ctx.stroke();
    ctx.strokeStyle = hexA('#ffffff', 0.85 * a); ctx.lineWidth = w * 0.6; ctx.stroke();
    ctx.restore();
  }
  function motes(ctx, r, col, k, n) { // 光點向身上收束
    ctx.fillStyle = hexA(col, 0.8 * k);
    for (let i = 0; i < n; i++) { const an = i * TAU / n + k * 3, d = (1 - k) * r * 4 + r * 0.8; ctx.beginPath(); ctx.arc(Math.cos(an) * d, Math.sin(an) * d, 2.5, 0, TAU); ctx.fill(); }
  }
  function glint(ctx, x, y, rad, a, col) { // 劍尖的蓄力光
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = hexA(col, 0.35 * a); ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
    ctx.fillStyle = hexA('#ffffff', 0.8 * a); ctx.beginPath(); ctx.arc(x, y, rad * 0.35, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function star(ctx, x, y, len, a, col) { // 四芒星閃
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const w of [[4, col, 0.6], [1.4, '#ffffff', 0.9]]) {
      ctx.strokeStyle = hexA(w[1], w[2] * a); ctx.lineWidth = w[0]; ctx.beginPath();
      ctx.moveTo(x - len, y); ctx.lineTo(x + len, y); ctx.moveTo(x, y - len); ctx.lineTo(x, y + len); ctx.stroke();
    }
    ctx.restore();
  }
  function diamond(ctx, x, y, s, rot, col, a, fill) { // 破綻菱形
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot + PI / 4); ctx.globalCompositeOperation = 'lighter';
    if (fill) { ctx.fillStyle = hexA(col, 0.45 * a); ctx.fillRect(-s / 2, -s / 2, s, s); }
    ctx.strokeStyle = hexA(BRIGHT, 0.9 * a); ctx.lineWidth = 2; ctx.strokeRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }
  function streak(ctx, x0, x1, w, col, a) { // 刺劍光軌：金暈 + 白芯
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.strokeStyle = hexA(col, 0.5 * a); ctx.lineWidth = w * 2.4; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x1, 0); ctx.stroke();
    ctx.strokeStyle = hexA('#ffffff', 0.9 * a); ctx.lineWidth = w * 0.6; ctx.stroke();
    ctx.restore();
  }
  function speedlines(ctx, x0, len, n, gap, col, a) { // 平行風切線（由 x0 往 -x 拖長 len）
    ctx.strokeStyle = hexA(col, a); ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < n; i++) { const y = (i - (n - 1) / 2) * gap, l = len * (1 - Math.abs(i - (n - 1) / 2) * 0.18); ctx.moveTo(x0, y); ctx.lineTo(x0 - l, y); }
    ctx.stroke();
  }

  // 招架：橫劍護身的金色盾弧（隨狀態脈動，弧上迸出火花）
  function shield(ctx, r, t, tint) {
    const pu = 0.6 + 0.4 * Math.sin(t * 14);
    crescent(ctx, r * 1.9, -1.05, 1.05, tint, 0.55 + 0.3 * pu, 3);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(BRIGHT, 0.7 * pu); ctx.lineWidth = 1.6; ctx.beginPath();
    for (let i = -2; i <= 2; i++) { const an = i * 0.42 + Math.sin(t * 9 + i) * 0.06; ctx.moveTo(Math.cos(an) * r * 1.9, Math.sin(an) * r * 1.9); ctx.lineTo(Math.cos(an) * r * 2.35, Math.sin(an) * r * 2.35); }
    ctx.stroke(); ctx.restore();
  }
  // 終極挑戰：腳下旋轉的金環與四個破綻菱形，已刺出的點亮
  function challenge(ctx, r, t, tint, done) {
    ctx.save(); ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 50; ring(ctx, 0, 0, r * 2.7, 0.55, tint, 2); ctx.restore();
    for (let i = 0; i < 4; i++) { const an = t * 0.8 + i * PI / 2; diamond(ctx, Math.cos(an) * r * 2.7, Math.sin(an) * r * 2.7, 13, an, tint, i < done ? 1 : 0.45, i < done); }
  }

  // 蓄力：依「下一手」的種類與所屬技能
  function windup(ctx, sid, r, e, wd, t, tint) {
    const a = e.a;
    if (a.do === 'hit') {
      tipOf(r); glint(ctx, TX, TY, 3 + 8 * wd, wd, a.status ? ICE : tint);
      if (sid === 'parry_w') { ring(ctx, 0, 0, r * (3.2 - 1.6 * wd), 0.6 * wd, BRIGHT, 3); motes(ctx, r, BRIGHT, wd, 8); }
    } else if (a.do === 'dash' && a.hit) { // 衝刺突刺：身後匯聚的風切線；飛躍突刺更長更密
      const fl = sid === 'fleche';
      speedlines(ctx, -r * 0.6, r * (fl ? 3.6 : 2.4) * wd, fl ? 7 : 5, r * 0.22, tint, 0.65 * wd);
      if (fl) { ctx.save(); ctx.scale(1, 0.55); ring(ctx, 0, 0, r * (3 - 1.4 * wd), 0.4 * wd, tint, 3); ctx.restore(); }
    } else if (a.do === 'dash') { // 側步 / 後撤：身周浮現旋轉的虛線環
      ctx.save(); ctx.setLineDash([8, 7]); ctx.lineDashOffset = -t * 60; ring(ctx, 0, 0, r * (2.4 - 0.8 * wd), 0.5 * wd, tint, 2); ctx.restore();
    } else if (a.do === 'vitalstep') { // 瞬步：胸前凝出破綻菱形，連鎖時三個小菱形繞身
      diamond(ctx, 0, 0, r * (0.3 + 0.9 * wd), t * 6, tint, wd, true); motes(ctx, r, BRIGHT, wd, 6);
      if (sid === 'vital_chain') for (let i = 0; i < 3; i++) { const an = t * 5 + i * TAU / 3; diamond(ctx, Math.cos(an) * r * 1.9, Math.sin(an) * r * 1.9, 9, an, tint, wd); }
    } else if (a.do === 'vitalmark') { ring(ctx, 0, 0, r * (4 - 1.5 * wd), 0.6 * wd, tint, 3); motes(ctx, r, BRIGHT, wd, 10); }
  }
  // 收勢：依「上一手」的種類；k 由 1 衰減到 0
  function snapfx(ctx, sid, r, e, k, tint) {
    const a = e.a, ex = 1 - k;
    if (a.do === 'hit') {
      const len = a.len || a.r || 150, x1 = r * 0.8 + (len - r * 0.8) * Math.min(1, ex * 4), heavy = sid === 'parry_w' || e.last, col = a.status ? ICE : tint;
      streak(ctx, r * 0.8, x1, sid === 'flurry' ? 2.5 : heavy ? 5 : 3.5, col, k);
      if (heavy) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(tint, 0.35 * k); ctx.lineWidth = 1.5; ctx.beginPath(); for (const s of [-1, 1]) { ctx.moveTo(r * 0.8, s * (a.w || 50) * 0.4); ctx.lineTo(x1, s * 6); } ctx.stroke(); ctx.restore(); }
      star(ctx, x1, 0, (sid === 'flurry' ? 10 : 16) * k + 4, k, col);
      if (a.vital) ring(ctx, x1, 0, 6 + r * 1.1 * ex, 0.7 * k, GOLD, 2.5);
      if (sid === 'parry_w') { ring(ctx, x1, 0, 8 + r * 2.4 * ex, 0.8 * k, BRIGHT, 4); glint(ctx, x1, 0, r * 1.6 * k, k, BRIGHT); }
      if (sid === 'ult') ring(ctx, 0, 0, r * (1.4 + 1.8 * ex), 0.5 * k, tint, 2);
    } else if (a.do === 'dash' && a.hit) { // 衝刺突刺：身後拖出風切線，前方刺劍光軌；飛躍突刺落地震出擴散環
      const fl = sid === 'fleche';
      speedlines(ctx, -r * 0.6 - ex * r * 2, a.dist * (fl ? 0.8 : 0.5) * k, fl ? 7 : 5, r * 0.22, tint, 0.8 * k);
      streak(ctx, r * 0.8, r * 0.8 + a.dist * 0.45 * Math.min(1, ex * 3), fl ? 5 : 4, tint, k);
      if (fl) ring(ctx, 0, 0, r * (1.2 + 2.6 * ex), 0.55 * k, tint, 3);
    } else if (a.do === 'dash' && a.dir === 'back') { // 後撤：前方迸散的短線
      speedlines(ctx, r * 2.6 + ex * r * 2, 70 * k, 4, r * 0.3, tint, 0.6 * k);
    } else if (a.do === 'dash') { // 側步閃身：身後的弧光與擴散環
      crescent(ctx, r * (1.5 + 1.2 * ex), PI - 0.9, PI + 0.9, tint, k, 3);
      ring(ctx, 0, 0, r * (1 + 1.2 * ex), 0.4 * k, tint, 2);
    } else if (a.do === 'vitalstep') { // 瞬步抵達：菱形爆開、十字閃與擴散環
      diamond(ctx, 0, 0, r * (1 + 2.4 * ex), PI * ex, tint, k, true);
      star(ctx, 0, 0, r * (1.2 + 1.2 * ex), 0.9 * k, tint);
      ring(ctx, 0, 0, r * (1 + 1.8 * ex), 0.6 * k, GOLD, 3);
      if (sid === 'vital_chain') ring(ctx, 0, 0, r * (2 + 2.2 * ex), 0.4 * k, BRIGHT, 2);
    } else if (a.do === 'vitalmark') { // 破綻全開：金環震開，四個菱形向四方飛出
      ring(ctx, 0, 0, r * (1.5 + 4 * ex), 0.8 * k, tint, 5);
      for (let i = 0; i < 4; i++) { const an = i * PI / 2 + ex; diamond(ctx, Math.cos(an) * r * (1.5 + 2 * ex), Math.sin(an) * r * (1.5 + 2 * ex), 14, an, tint, k, true); }
    }
  }
  function decor(ctx, sid, o, r, p2, t, guard) {
    const tint = p2 ? PINK : GOLD;
    if (guard) shield(ctx, r, t, tint);
    if (sid === 'ult' && o._ult && o.world && o.world.time < o._ult.until) challenge(ctx, r, t, tint, P.done);
    if (P.ne && P.wd > 0) windup(ctx, sid, r, P.ne, P.wd, t, tint);
    if (P.le) { const k = U.clamp(1 - P.since / 0.34, 0, 1); if (k > 0) snapfx(ctx, sid, r, P.le, k, tint); }
  }

  // 對撞連拚（R.rally）：劍尖對準接點，碰的瞬間（s = 1）刃身剛好穿過接點，之後後甩蓄力、加速劈回下一個接點
  function rallyPose(ry, r) {
    const L = r * 3.2, fwd = 0.1 * ry.s - 0.05 * (1 - ry.s), c = ry.c - fwd * r;
    const e = lerp(-0.2, U.clamp(((c - 0.68 * L) / r - 0.55) / 0.7, -0.4, 1.3), ry.s);
    const hx = r * (0.55 + 0.7 * e), hy = r * (0.5 - 0.3 * Math.max(e, 0));
    A.ext = e; A.fwd = fwd; A.ang = Math.atan2(-hy, c - hx) + ry.off + 0.12 * (1 - e);
    A.spin = ry.off * 0.2; A.gl = 0.3 + 0.7 * ry.s; A.cape = 0.6 * ry.s; A.off = 0.4 + 0.5 * ry.s; A.sq = 1 - 0.04 * (1 - ry.s);
  }

  function body(ctx, o, t, { def, r }) {
    const shade = !!o.shade, p2 = o.phase === 2;
    const stag = o.state === 'stagger' || o.state === 'stun'; // 被打斷：回到待機姿態
    const guard = !stag && !!(o.statuses && BD.hasStatus(o, 'counter'));
    const inst = !stag && o.inst && o.inst.skill && o.inst.v && o.inst.v.actions ? o.inst : null;
    const sid = inst ? inst.skill.id : '';
    for (const k of KEYS) A[k] = DEF[k];
    A.ext = 0.15 + Math.sin(t * 3) * 0.05;
    P.ne = P.le = null; P.wd = P.sn = P.since = P.done = 0;
    if (inst) { pace(inst); build(sid); }
    const ry = !stag && !guard && R.rally(o);
    if (ry) rallyPose(ry, r);
    if (guard) { A.ext = -0.25; A.ang = -1.2; A.gl = Math.max(A.gl, 0.6); A.sq = 0.95; A.fwd = -0.06; }
    ctx.save();
    if (inst && !shade) decor(ctx, sid, o, r, p2, t, guard);
    if (inst || ry) { ctx.translate(A.fwd * r, 0); if (A.sq !== 1) ctx.scale(A.sq, 1 + (1 - A.sq) * 0.5); }
    if (A.spin) ctx.rotate(A.spin);
    const tag = r + ':' + (shade ? 's' : 'b');

    // 深紫披風：身後隨移動擺動；衝刺時向後飄直
    const sw = Math.sin(t * 4 + o.x * 0.01) * 0.2 * (1 - A.cape), cl = 2.0 + 0.9 * A.cape;
    ctx.fillStyle = shade ? '#000000' : '#4a2a63';
    ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.8); ctx.quadraticCurveTo(-r * 1.4, -r * (0.9 + sw), -r * cl, -r * sw * 2);
    ctx.quadraticCurveTo(-r * 1.4, r * (0.9 - sw), -r * 0.2, r * 0.8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade ? PINK : '#7a4a98'; ctx.lineWidth = 1.2; ctx.stroke();

    // 左臂：深色手套，向後平衡（出劍時甩開）
    const lx = -r * (0.5 + 0.35 * A.off), ly = -r * (0.9 + 0.25 * A.off);
    ctx.strokeStyle = shade ? '#050407' : '#e9edf4'; ctx.lineWidth = r * 0.26; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(lx, ly); ctx.stroke();
    ctx.fillStyle = shade ? '#000000' : '#1c2030'; ctx.beginPath(); ctx.arc(lx - r * 0.05, ly - r * 0.03, r * 0.17, 0, U.TAU); ctx.fill();

    // 軀幹：白色貼身上衣，兩側與下擺金銅護甲
    R.blit(ctx, 'body:fiora:torso:' + tag, r * 1.4 + 8, r * 2 + 8, r * 0.7 + 4, r + 4, (g) => {
      const gr = g.createRadialGradient(r * 0.1, 0, 2, 0, 0, r);
      gr.addColorStop(0, shade ? '#12141c' : '#ffffff'); gr.addColorStop(1, shade ? '#000000' : '#cfd5e2');
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, r * 0.6, r * 0.9, 0, 0, U.TAU); g.fill();
      g.strokeStyle = shade ? PINK : GOLD; g.lineWidth = 2.2; g.beginPath(); g.ellipse(0, 0, r * 0.6, r * 0.9, 0, 2.2, 4.1); g.stroke();
      g.beginPath(); g.moveTo(-r * 0.55, -r * 0.3); g.lineTo(-r * 0.55, r * 0.3); g.stroke();
    });

    // 右臂＋寬刃劍：金銅護手臂甲包住拳頭，寬而扁的劍身漸尖；蓄力 / 招架時劍身泛光
    const e = A.ext, hx = r * (0.55 + 0.7 * e), hy = r * (0.5 - 0.3 * Math.max(e, 0));
    ctx.strokeStyle = shade ? '#050407' : '#e9edf4'; ctx.lineWidth = r * 0.26;
    ctx.beginPath(); ctx.moveTo(0, r * 0.6); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-0.12 * (1 - e) + A.ang);
    const L = r * 3.2, W = r * 0.2;
    if (ry && !shade) R.bladeTrail(ctx, ry, L, p2 ? def.glow : BRIGHT);
    if ((p2 && !shade) || A.gl > 0.05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(p2 ? def.glow : BRIGHT, (p2 ? 0.5 : 0.35) + 0.4 * A.gl); ctx.lineWidth = 8 + 6 * A.gl; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = shade ? '#1a1020' : '#dfe6f2';
    ctx.beginPath(); ctx.moveTo(r * 0.3, -W); ctx.lineTo(L * 0.8, -W * 0.7); ctx.lineTo(L, 0); ctx.lineTo(L * 0.8, W * 0.7); ctx.lineTo(r * 0.3, W); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade ? PINK : '#8fa0bc'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.3, 0); ctx.lineTo(L * 0.95, 0); ctx.stroke();
    ctx.fillStyle = shade ? '#2a1020' : GOLD; ctx.strokeStyle = shade ? PINK : '#7a5a18'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(r * 0.3, 0, r * 0.5, r * 0.4, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = shade ? PINK : '#f5dc8a'; ctx.beginPath(); ctx.ellipse(r * 0.38, -r * 0.08, r * 0.2, r * 0.12, 0, 0, U.TAU); ctx.fill();
    ctx.restore();

    // 金銅肩甲
    R.blit(ctx, 'body:fiora:shoulder:' + tag, r * 1.4 + 8, r * 2.4 + 8, r * 0.7 + 4, r * 1.2 + 4, (g) => {
      for (const s of [-1, 1]) {
        g.fillStyle = shade ? '#0a0610' : GOLD; g.beginPath(); g.ellipse(-r * 0.05, s * r * 0.8, r * 0.42, r * 0.3, s * 0.3, 0, U.TAU); g.fill();
        g.strokeStyle = shade ? PINK : '#7a5a18'; g.lineWidth = 1.4; g.stroke();
        g.fillStyle = shade ? PINK : '#f5dc8a'; g.beginPath(); g.ellipse(-r * 0.12, s * r * 0.76, r * 0.18, r * 0.1, s * 0.3, 0, U.TAU); g.fill();
      }
    });

    // 頭：酒紅色短髮，一側瀏海斜掃
    R.blit(ctx, 'body:fiora:head:' + tag, r * 1.2 + 8, r * 1.2 + 8, r * 0.6 + 4, r * 0.6 + 4, (g) => {
      const gr = g.createRadialGradient(r * 0.1, -r * 0.1, 1, 0, 0, r * 0.46);
      gr.addColorStop(0, shade ? '#1a0c14' : '#d9487a'); gr.addColorStop(1, shade ? '#000000' : '#8e1f44');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 0.46, 0, U.TAU); g.fill();
      g.strokeStyle = shade ? PINK : '#f08aae'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(-r * 0.2, -r * 0.3); g.quadraticCurveTo(r * 0.3, -r * 0.35, r * 0.4, r * 0.15); g.stroke();
    });
    ctx.restore();
  }

  // 單個破綻：金色菱形加兩側弧形翼片與光暈（朝向對手外側），脈動
  function mark(ctx, e, ang, t, k) {
    const d = e.r + 22, x = e.x + Math.cos(ang) * d, y = e.y + Math.sin(ang) * d, p = 1 + Math.sin(t * 7) * 0.12;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 34 * k * p);
    g.addColorStop(0, hexA('#fff1b0', 0.85)); g.addColorStop(1, hexA(GOLD, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 34 * k * p, 0, U.TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = hexA('#fff6cf', 0.95); ctx.fillStyle = hexA(GOLD, 0.9); ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-4 * k, s * 8 * k); ctx.quadraticCurveTo(-18 * k * p, s * 18 * k * p, -4 * k, s * 30 * k * p); ctx.stroke(); }
    const s2 = 13 * k * p;
    ctx.rotate(Math.PI / 4); ctx.fillRect(-s2 / 2, -s2 / 2, s2, s2); ctx.strokeRect(-s2 / 2, -s2 / 2, s2, s2);
    ctx.restore();
  }

  // 破綻：平時一個；終極挑戰期間四個（已擊破的熄滅），並在對手外圍畫一圈金環連起它們；回復領域畫在地上
  function vital(ctx, b, t) {
    const e = b.enemy, w = b.world;
    if (!w) return;
    if (b._heal) for (const z of b._heal) {
      const left = z.until - w.time; if (left <= 0) continue;
      const a = Math.min(1, (w.time - z.t0) / 0.3, left / 0.5);
      ctx.save(); ctx.globalAlpha *= a;
      const g = ctx.createRadialGradient(z.x, z.y, z.r * 0.1, z.x, z.y, z.r);
      g.addColorStop(0, 'rgba(160,240,110,0.32)'); g.addColorStop(0.85, 'rgba(90,200,90,0.2)'); g.addColorStop(1, 'rgba(120,230,160,0.45)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = hexA('#b8f5d8', 0.8); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, U.TAU); ctx.stroke();
      ctx.strokeStyle = hexA('#2f7a3a', 0.45); ctx.lineWidth = 2; ctx.translate(z.x, z.y); ctx.rotate(t * 0.4);
      for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(z.r * 0.2, 0); ctx.quadraticCurveTo(z.r * 0.6, z.r * 0.25, z.r * 0.9, 0); ctx.stroke(); }
      ctx.restore();
    }
    if (!e || b.state === 'dead' || e.state === 'dead') return;
    const u = b._ult, v = b._vital;
    if (u && w.time < u.until && v) {
      ctx.save(); ctx.strokeStyle = hexA(GOLD, 0.55); ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -t * 40;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 22, 0, U.TAU); ctx.stroke(); ctx.restore();
      for (let i = 0; i < 4; i++) if (!u.hit[i]) mark(ctx, e, v.ang + i * Math.PI / 2, t, 1.2);
    } else if (v && w.time - v.t0 <= 6) {
      ctx.save(); ctx.strokeStyle = hexA(GOLD, 0.35); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 22, 0, U.TAU); ctx.stroke(); ctx.restore();
      mark(ctx, e, v.ang, t, 1);
      if (b.phase === 2) mark(ctx, e, v.ang + Math.PI, t, 1);
    }
  }

  R.defineBossStyle('fiora', { body, under: vital });
})(typeof window !== 'undefined' ? window : globalThis);
