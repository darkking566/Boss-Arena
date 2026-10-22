'use strict';
// Boss 造型：鷹眼米霍克（俯視）：黑底紅襯長外套、寬簷羽飾帽、V 字鬢角與金色鷹眼、胸前金色十字吊墜（小刀）；
// 一階段右手持十字小刀、背上斜背著未出鞘的夜；二階段（HP 50%）夜握在手中，黑色刀身泛暗紅微光。
// 逐招動畫：每個出手動作（hit / proj / dash）依種類與所屬技能取一組「蓄力 → 擊」關鍵值姿態（pick），驅動右臂前伸、刀身角度、
// 前傾、軀幹扭轉、下蹲、刀身蓄力光與左臂平衡，連段姿態混合不跳格；撥擋架式為橫刀護身。
// 地面層（decor）依下一手 / 上一手畫蓄力光與收勢：鷹眼光束、突刺軌跡、居合白線、月牙斬光、扇面三斬、沉艦弧斬、荒星星芒、大招巨斬線。
// hidden()：荒星躍起時畫出落點逐漸放大的影子與墜落的十字星芒。under()：被「鷹眼鎖定」的對手身上畫金色準星（收束閉合）。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  const TRIG = { hit: 1, proj: 1, dash: 1 };
  const GOLD = '#d8b44e', HG = '#ffd860', RED = '#a8232e', HOT = '#ff4a5e';
  const TAU = U.TAU, PI = Math.PI;
  const ease = (u) => 1 - (1 - u) * (1 - u);
  const lerp = (a, b, u) => a + (b - a) * u;
  const _ = undefined;

  // 姿態參數預設值：e 右臂前伸（負值＝後拉）、sw 刀身角度（負＝向左前、正＝向右後）、lean 整體前傾（半徑倍數）、
  // spin 軀幹扭轉、sq 下蹲壓縮、gl 刀身與鷹眼蓄力光、l 左臂前伸（負＝向後平衡）
  const DEF = { e: 0.1, sw: -0.13, lean: 0, spin: 0, sq: 1, gl: 0, l: 0 };
  const KEYS = Object.keys(DEF);

  // 關鍵值：key: [蓄滿, 擊, 起始 = DEF, 收招 = 起始, 擊後衰減起點 = 擊]
  const JAB = (s, k) => ({ e: [-0.7, 1.2 * k], sw: [-0.3, 0.05], lean: [-0.12, 0.28 * k], spin: [0.3 * s, -0.22 * s], sq: [0.94, 1], gl: [0.6, 1], l: [-0.1, -0.4] });
  const JABS = [JAB(1, 1), JAB(-1, 1)], JABL = [JAB(1, 1.4), JAB(-1, 1.4)];
  const CROSS = (s) => ({ e: [0.3, 0.9], sw: [-1.5, 1.2], spin: [-0.7 * s, 0.6 * s], lean: [-0.1, 0.2], sq: [0.93, 1], gl: [0.8, 1], l: [0.1, -0.5] });
  const CROSSES = [CROSS(1), CROSS(-1)];
  const LUNGE = { e: [-0.9, 1.4], sw: [-0.1, 0], lean: [-0.25, 0.5], spin: [0.35, -0.25], sq: [0.86, 1], gl: [1, 1], l: [-0.3, -0.6] };
  const RETREAT = { e: [0.2, 0.1], sw: [-0.8, -0.2], lean: [0.15, -0.4], sq: [0.95, 1], gl: [0.3, 0.6], l: [0.4, 0.6] };
  const DRAW = { e: [0.1, 1.4], sw: [2.0, -0.05], lean: [-0.15, 0.5], spin: [0.5, -0.3], sq: [0.82, 1], gl: [1, 1], l: [0.2, -0.4] };
  const BACKHAND = { e: [0.6, 1.0], sw: [0.9, -1.5], spin: [0.8, -0.8], lean: [-0.05, 0.15], sq: [0.92, 1], gl: [0.8, 1], l: [0.2, -0.3] };
  const GLARE = { e: [0.5, 0.9], sw: [-0.35, -0.05], lean: [-0.05, 0.1], sq: [0.97, 1], gl: [1, 1], l: [0.3, 0.2] };
  const FLICK = { e: [0.4, 1.0], sw: [-0.6, 0.25], spin: [0.18, -0.14], lean: [-0.04, 0.1], sq: [1, 1], gl: [0.5, 1], l: [0.1, -0.2] };
  const CHOP = { e: [0.9, 1.1], sw: [-2.4, 0.15], lean: [-0.2, 0.35], spin: [0.5, -0.4], sq: [0.88, 1], gl: [1, 1], l: [0.5, -0.5] };
  const SWEEP = { e: [0.9, 1.1], sw: [1.4, -1.6], spin: [1.0, -1.0], lean: [-0.1, 0.25], sq: [0.86, 1], gl: [1, 1], l: [0.4, -0.5] };
  const SLAM = { e: [1, 1.4], sw: [-2.6, 0.3], lean: [-0.2, 0.2], sq: [0.84, 1], gl: [1, 1], l: [0.6, -0.6] };
  const ULTCUT = { e: [1, 1.4], sw: [-2.8, 0.2], lean: [-0.3, 0.4], spin: [0.7, -0.5], sq: [0.82, 1], gl: [1, 1], l: [0.7, -0.7] };

  // 依動作種類與所屬技能挑姿態
  function pick(e, sid) {
    const a = e.a;
    switch (a.do) {
      case 'proj': return sid === 'flick' || sid === 'backstep' ? FLICK : CHOP;
      case 'dash': return a.dir === 'back' ? RETREAT : sid === 'iai' ? DRAW : LUNGE;
      default:
        if (a.shape === 'circle') return SLAM;
        if (a.shape === 'rect') return sid === 'glare' ? GLARE : sid === 'ult' ? ULTCUT : e.last ? JABL[e.hi & 1] : JABS[e.hi & 1];
        return sid === 'fleet' ? SWEEP : sid === 'iai' ? BACKHAND : CROSSES[e.hi & 1];
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

  // 右手與刀尖位置（寫入 HX / HY / TX / TY，避免配置）
  let HX = 0, HY = 0, TX = 0, TY = 0;
  function tip(r, p2) {
    const e = A.e; HX = r * (0.55 + 0.75 * e); HY = r * (0.55 - 0.3 * Math.max(e, 0));
    const L = p2 ? r * 3.4 : r * 1.35; TX = HX + Math.cos(A.sw) * L; TY = HY + Math.sin(A.sw) * L;
  }

  // ───────── 地面層：蓄力光與收勢（畫在身體底下，本地座標：+x 為面向）─────────
  function ring(ctx, x, y, rad, a, col, w) {
    ctx.strokeStyle = hexA(col, a); ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, Math.max(1, rad), 0, TAU); ctx.stroke();
  }
  function crescent(ctx, rad, a0, a1, col, a, w) { // 弧形斬光：色暈 + 白芯
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.strokeStyle = hexA(col, 0.6 * a); ctx.lineWidth = w * 2.2; ctx.beginPath(); ctx.arc(0, 0, rad, a0, a1); ctx.stroke();
    ctx.strokeStyle = hexA('#ffffff', 0.85 * a); ctx.lineWidth = w * 0.6; ctx.stroke();
    ctx.restore();
  }
  function beam(ctx, x0, x1, w, col, a) { // 沿 +x 的光束：色暈 + 白熱芯
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.strokeStyle = hexA(col, 0.45 * a); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x1, 0); ctx.stroke();
    ctx.strokeStyle = hexA('#ffffff', 0.9 * a); ctx.lineWidth = Math.max(1.5, w * 0.26); ctx.stroke();
    ctx.restore();
  }
  function glint(ctx, x, y, rad, a, col) { // 刀尖的蓄力光
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = hexA(col || HG, 0.28 * a); ctx.beginPath(); ctx.arc(x, y, rad * 0.65, 0, TAU); ctx.fill();
    ctx.fillStyle = hexA('#ffffff', 0.85 * a); ctx.beginPath(); ctx.arc(x, y, rad * 0.22, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function motes(ctx, r, col, k, n) { // 光點向身上收束
    ctx.fillStyle = hexA(col, 0.8 * k);
    for (let i = 0; i < n; i++) { const an = i * TAU / n + k * 3, d = (1 - k) * r * 4 + r * 0.8; ctx.beginPath(); ctx.arc(Math.cos(an) * d, Math.sin(an) * d, 2.5, 0, TAU); ctx.fill(); }
  }
  function cross(ctx, x, y, len, col, a) { // 十字星芒（鷹眼 / 命中點）
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.translate(x, y);
    for (const w of [[4.5, col, 0.6], [1.5, '#ffffff', 0.95]]) {
      ctx.strokeStyle = hexA(w[1], w[2] * a); ctx.lineWidth = w[0]; ctx.beginPath();
      ctx.moveTo(-len, 0); ctx.lineTo(len, 0); ctx.moveTo(0, -len); ctx.lineTo(0, len); ctx.stroke();
    }
    ctx.restore();
  }
  function rays(ctx, n, off, r0, r1, col, a, w) { // 放射星芒線
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = hexA(col, a); ctx.lineWidth = w; ctx.beginPath();
    for (let i = 0; i < n; i++) { const an = off + i * TAU / n; ctx.moveTo(Math.cos(an) * r0, Math.sin(an) * r0); ctx.lineTo(Math.cos(an) * r1, Math.sin(an) * r1); }
    ctx.stroke(); ctx.restore();
  }
  function cracks(ctx, rad, a) {
    ctx.strokeStyle = hexA('#14070b', a); ctx.lineWidth = 2.2; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const an = i * 0.628 + 0.2, l = rad * (0.6 + 0.2 * (i % 3)); ctx.moveTo(Math.cos(an) * rad * 0.2, Math.sin(an) * rad * 0.2); ctx.lineTo(Math.cos(an) * l, Math.sin(an) * l); }
    ctx.stroke();
  }

  // 蓄力：依「下一手」的種類與所屬技能
  function windup(ctx, sid, r, e, wd, t, p2) {
    const a = e.a, tint = p2 ? HOT : GOLD;
    tip(r, p2);
    if (a.do === 'dash') {
      if (a.dir === 'back') return;
      if (sid === 'iai') { // 居合：腰間凝光、空中浮出一道細白線
        glint(ctx, HX, HY, r * (0.3 + 0.5 * wd), wd, HOT);
        ctx.save(); ctx.setLineDash([6, 8]); ctx.lineDashOffset = -t * 50; ring(ctx, 0, 0, r * (2.4 - 1.2 * wd), 0.2 + 0.5 * wd, tint, 2); ctx.restore();
        beam(ctx, r, a.dist, 2 + 3 * wd, '#ffffff', 0.15 + 0.35 * wd);
      } else { // 突刺：刀尖凝光、身後匯聚速度線
        glint(ctx, TX, TY, 3 + 8 * wd, wd);
        ctx.strokeStyle = hexA(tint, 0.6 * wd); ctx.lineWidth = 1.6; ctx.beginPath();
        for (let i = -1; i <= 1; i++) { ctx.moveTo(-r * (2.4 - wd), i * r * 0.5); ctx.lineTo(-r * (1.3 - 0.3 * wd), i * r * 0.4); }
        ctx.stroke();
      }
    } else if (a.do === 'proj') {
      if (sid === 'flick' || sid === 'backstep') { glint(ctx, TX, TY, 3 + 5 * wd, wd); return; }
      glint(ctx, TX, TY, 5 + 12 * wd, wd, HOT);
      ctx.save(); ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 90; ring(ctx, 0, 0, r * (2.8 - 0.8 * wd), 0.2 + 0.5 * wd, HOT, 2.4); ctx.restore();
      motes(ctx, r, HOT, wd, a.radial ? 10 : 7);
      if (a.n === 3) { // 三連月牙：扇面兩側邊線收束
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(HOT, 0.5 * wd); ctx.lineWidth = 1.6; ctx.beginPath();
        for (const s of [-1, 1]) { const an = s * (0.5 - 0.15 * wd) * 1.2; ctx.moveTo(r, 0); ctx.lineTo(Math.cos(an) * 820, Math.sin(an) * 820); }
        ctx.stroke(); ctx.restore();
      }
    } else if (a.shape === 'rect') {
      if (sid === 'glare') { // 鷹眼：兩眼拉出細金線，由近到遠逐漸點亮，刀尖指向目標
        beam(ctx, r * 0.9, a.len, 1.5 + 4 * wd, HG, 0.12 + 0.5 * wd);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(HG, 0.7 * wd); ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) { const x = r + (((i / 5) + t * 1.1) % 1) * (a.len - r); ctx.beginPath(); ctx.moveTo(x, -9); ctx.lineTo(x + 12, 0); ctx.lineTo(x, 9); ctx.stroke(); }
        ctx.restore();
        glint(ctx, TX, TY, 4 + 9 * wd, wd);
      } else if (sid === 'ult') { // 大招：天地失色般的紅金氣場、橫貫全場的斬線漸亮
        ctx.save(); ctx.setLineDash([18, 12]); ctx.lineDashOffset = -t * 120; ring(ctx, 0, 0, r * (3.6 - 1.6 * wd), 0.2 + 0.5 * wd, HOT, 3); ctx.restore();
        ctx.fillStyle = hexA(RED, 0.18 * wd); ctx.beginPath(); ctx.arc(0, 0, r * (3 - 1.2 * wd), 0, TAU); ctx.fill();
        beam(ctx, r, a.len, a.w * (0.1 + 0.2 * wd), HOT, 0.12 + 0.3 * wd);
        motes(ctx, r, HG, wd, 12); glint(ctx, TX, TY, 6 + 16 * wd, wd, HOT);
      } else glint(ctx, TX, TY, 3 + 7 * wd, wd);
    } else if (a.shape === 'circle') { // 荒星：落地前聚氣
      motes(ctx, r, HOT, wd, 10); ring(ctx, 0, 0, r * (3 - 1.4 * wd), 0.3 + 0.5 * wd, HOT, 3);
      glint(ctx, TX, TY, 6 + 14 * wd, wd, HOT);
    } else if (sid === 'fleet') { // 沉艦：半圓虛弧依蓄力逐步畫出，刀尖聚光
      const half = (a.arc || 3.5) / 2;
      ctx.save(); ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 60; ctx.strokeStyle = hexA(HOT, 0.55 * wd); ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, 0, a.r * 0.9, -half, -half + 2 * half * wd); ctx.stroke(); ctx.restore();
      glint(ctx, TX, TY, 5 + 12 * wd, wd, HOT); motes(ctx, r, HOT, wd, 8);
    } else glint(ctx, TX, TY, 3 + 8 * wd, wd, p2 ? HOT : HG);
  }

  // 收勢：依「上一手」的種類；k 由 1 衰減到 0
  function snapfx(ctx, sid, r, e, k, p2) {
    const a = e.a, tint = p2 ? HOT : GOLD, ex = 1 - k;
    if (a.do === 'dash') {
      if (a.dir === 'back') { // 後撤：身前拖出塵痕
        ctx.strokeStyle = hexA('#c8c0b0', 0.4 * k); ctx.lineWidth = 2; ctx.beginPath();
        for (let i = -1; i <= 1; i++) { ctx.moveTo(r * 0.6, i * r * 0.5); ctx.lineTo(Math.min(a.dist, 260) * Math.min(1, ex * 5) + r * 0.6, i * r * 0.5); }
        ctx.stroke(); ring(ctx, 0, 0, r * (1.2 + 1.2 * ex), 0.3 * k, '#c8c0b0', 2); return;
      }
      const d = Math.min(a.dist, 720), x0 = -d * Math.min(1, ex * 6 + 0.35);
      if (sid === 'iai') { // 居合：筆直的白色斬線與沿線迸開的十字星芒
        beam(ctx, -d, 0, 10 * k + 2, '#ffffff', k);
        for (let i = 1; i <= 3; i++) cross(ctx, -d * i / 3.4, 0, r * (0.5 + 0.8 * ex), HOT, 0.8 * k);
        ring(ctx, 0, 0, r * (1 + 1.6 * ex), 0.7 * k, HOT, 3); return;
      }
      for (let i = 0; i < 4; i++) { // 殘影：沿路徑漸淡的暗紅身影
        ctx.fillStyle = hexA(p2 ? RED : '#1a1420', (0.5 - i * 0.1) * k); ctx.beginPath(); ctx.ellipse(x0 * (i + 1) / 4.5, 0, r * 0.62, r * 0.9, 0, 0, TAU); ctx.fill();
      }
      beam(ctx, x0, 0, (r * 0.7) * k + 2, tint, 0.9 * k);
      cross(ctx, r * 1.2, 0, r * (0.4 + 0.8 * ex), tint, 0.9 * k); ring(ctx, 0, 0, r * (1 + 1.4 * ex), 0.5 * k, tint, 2);
    } else if (a.do === 'proj') {
      const w = 2 + a.r * 0.05;
      if (a.radial) { // 荒星：星芒射線
        rays(ctx, a.n, a.angOff || 0, r * (1 + 1.5 * ex), r * 1.6 + 380 * Math.min(1, ex * 2.2), HOT, 0.8 * k, w); ring(ctx, 0, 0, r * (1.3 + 3 * ex), 0.55 * k, HOT, 4); return;
      }
      const n = a.n || 1, sp = a.spread || 0;
      for (let i = 0; i < n; i++) { // 斬光脫手：沿各自方向的月牙，朝前擴張
        const an = (i - (n - 1) / 2) * sp;
        ctx.save(); ctx.rotate(an); crescent(ctx, r * (1.1 + ex * 2.4) + a.r * 0.3, -0.35 - a.r * 0.006, 0.35 + a.r * 0.006, sid === 'flick' || sid === 'backstep' ? tint : HOT, k, w); ctx.restore();
      }
      if (sid !== 'flick' && sid !== 'backstep') ring(ctx, 0, 0, r * (1.4 + 2.2 * ex), 0.5 * k, HOT, 4);
    } else if (a.shape === 'rect') {
      if (sid === 'glare') { // 鷹眼：金白光束貫穿，末端十字星芒
        beam(ctx, r, a.len, 18 * k + 2, HG, k); cross(ctx, a.len - 8, 0, 30 * k + 6, HG, k); ring(ctx, r, 0, r * (0.8 + 1.2 * ex), 0.6 * k, HG, 3);
      } else if (sid === 'ult') { // 大招：橫貫全場的巨斬線，沿途迸射十字星芒
        beam(ctx, r, a.len, a.w * 0.9 * k + 4, HOT, k);
        for (let i = 1; i <= 5; i++) cross(ctx, a.len * i / 5, 0, 18 + 36 * k, HOT, 0.8 * k);
        ring(ctx, 0, 0, r * (1.5 + 3.4 * ex), 0.7 * k, HOT, 6);
        if (!p2) return;
        rays(ctx, 12, ex * 2, r * 1.4, r * (2 + 3 * ex), HG, 0.5 * k, 2);
      } else { // 小刀連刺：筆直的刺痕與刀尖火花
        beam(ctx, r, a.len + r * 0.6, 8 * k + 2, tint, 0.9 * k); cross(ctx, a.len + r * 0.6, 0, 8 + 10 * k, tint, k);
      }
    } else if (a.shape === 'circle') { // 荒星落地：星形裂紋、衝擊環
      const rad = a.r;
      ring(ctx, 0, 0, rad * (0.55 + 0.5 * ex), 0.85 * k, HOT, 7); ring(ctx, 0, 0, rad * (0.3 + 0.35 * ex), 0.5 * k, HG, 3);
      ctx.fillStyle = hexA('#14070b', 0.4 * k); ctx.beginPath(); ctx.arc(0, 0, rad * 0.7, 0, TAU); ctx.fill();
      cracks(ctx, rad * 0.95, k); rays(ctx, 5, -PI / 2, r, rad * (1 + 0.9 * ex), HOT, 0.8 * k, 4);
    } else { // 扇形斬：由出手側掃向另一側的弧光；沉艦更大並多一道衝擊環
      const half = (a.arc || 2) / 2, rad = (a.r || 112) * 0.95, s = sid === 'knife' ? 1 : -1, from = -half * s, to = lerp(from, -from, Math.min(1, ex * 3.5));
      ctx.fillStyle = hexA(tint, 0.14 * k); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, rad, -half, half); ctx.closePath(); ctx.fill();
      crescent(ctx, rad, Math.min(from, to), Math.max(from, to), sid === 'fleet' ? HOT : tint, k, sid === 'fleet' ? 7 : 4);
      if (sid === 'fleet') { crescent(ctx, rad * 0.7, -half * 0.85, half * 0.85, HOT, 0.7 * k, 4); ring(ctx, 0, 0, rad * (0.5 + 0.6 * ex), 0.5 * k, HOT, 5); }
    }
  }
  function decor(ctx, sid, r, p2, t) {
    if (P.ne && P.wd > 0) windup(ctx, sid, r, P.ne, P.wd, t, p2);
    if (P.le) { const k = U.clamp(1 - P.since / 0.34, 0, 1); if (k > 0) snapfx(ctx, sid, r, P.le, k, p2); }
  }

  // 撥擋架式：身周金色虛環緩緩旋轉、四顆光點；見切成功（counters 增加）時在新位置迸出十字斬與擴散環
  function guardfx(ctx, r, t) {
    ctx.save(); ctx.setLineDash([10, 9]); ctx.lineDashOffset = -t * 40; ring(ctx, 0, 0, r * 2.1, 0.3 + 0.15 * Math.sin(t * 8), GOLD, 2.4); ctx.restore();
    ctx.fillStyle = hexA(HG, 0.7);
    for (let i = 0; i < 4; i++) { const an = t * 1.6 + i * PI / 2; ctx.beginPath(); ctx.arc(Math.cos(an) * r * 2.1, Math.sin(an) * r * 2.1, 2.6, 0, TAU); ctx.fill(); }
  }
  function parried(ctx, o, r, t) {
    const n = o.stats && o.stats.counters;
    if (n === _) return;
    if (o._pcN !== n) { if (o._pcN !== _) o._pcT = t; o._pcN = n; }
    const k = o._pcT === _ ? 0 : U.clamp(1 - (t - o._pcT) / 0.45, 0, 1);
    if (k <= 0) return;
    const ex = 1 - k;
    ctx.save(); ctx.rotate(-o.face); // 迸發固定朝世界座標方向，不隨面向轉
    cross(ctx, 0, 0, r * (1.2 + 2.4 * ex), HG, k); ring(ctx, 0, 0, r * (1 + 2.8 * ex), 0.8 * k, HG, 4);
    rays(ctx, 8, 0.3, r * 0.8, r * (1.2 + 2 * ex), '#ffffff', 0.6 * k, 2);
    ctx.restore();
  }

  // 夜：黑色大刀，十字護手；刀身 L 長，從 (0,0) 往 +x
  function yoru(ctx, r, shade, p2, L) {
    if (p2 && !shade) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(RED, 0.5); ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(r * 0.5, 0); ctx.lineTo(L, 0); ctx.stroke(); ctx.restore(); }
    const W = r * 0.2;
    ctx.fillStyle = shade ? '#000000' : '#15131a';
    ctx.beginPath(); ctx.moveTo(r * 0.4, -W); ctx.lineTo(L * 0.9, -W * 0.85); ctx.lineTo(L, 0); ctx.lineTo(L * 0.9, W * 0.85); ctx.lineTo(r * 0.4, W); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade ? RED : '#6a6478'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.5, 0); ctx.lineTo(L * 0.92, 0); ctx.stroke();
    // 十字護手
    ctx.strokeStyle = shade ? RED : GOLD; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(r * 0.4, -r * 0.5); ctx.lineTo(r * 0.4, r * 0.5); ctx.stroke();
    ctx.strokeStyle = shade ? '#2a1016' : '#2a2430'; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(r * 0.4, 0); ctx.lineTo(-r * 0.2, 0); ctx.stroke();
  }

  // 十字小刀（kogatana）：金色十字吊墜般的小刀，刀身短而亮
  function knife(ctx, r, shade) {
    ctx.fillStyle = shade ? '#2a1016' : '#d9dce6';
    ctx.beginPath(); ctx.moveTo(r * 0.25, -r * 0.1); ctx.lineTo(r * 1.15, -r * 0.05); ctx.lineTo(r * 1.35, 0); ctx.lineTo(r * 1.15, r * 0.05); ctx.lineTo(r * 0.25, r * 0.1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade ? RED : '#8c91a4'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = shade ? RED : GOLD; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(r * 0.25, -r * 0.28); ctx.lineTo(r * 0.25, r * 0.28); ctx.stroke();
    ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(r * 0.25, 0); ctx.lineTo(0, 0); ctx.stroke();
  }

  function lockOn(ctx, b, t) {
    const e = b.enemy, st = e && e.statuses && BD.getStatus(e, 'hawklock');
    if (!st || e.state === 'dead') return;
    const k = Math.min(1, st.rem / 1.2), intro = U.clamp(1 - st.t / 0.3, 0, 1), rr = e.r + 26 + (1 - k) * 8 + intro * 70;
    ctx.save(); ctx.translate(e.x, e.y); ctx.globalAlpha *= (0.35 + 0.65 * k) * (1 - 0.4 * intro);
    ctx.strokeStyle = hexA('#e8c860', 0.9); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.rotate(t * 0.8 + intro * 2);
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.arc(0, 0, rr, -0.5, 0.5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(rr + 4, 0); ctx.lineTo(rr + 14, 0); ctx.stroke(); }
    if (intro > 0) { ctx.rotate(-t * 0.8 - intro * 2); cross(ctx, 0, 0, e.r + 14, HG, intro); } // 鎖定瞬間：中央十字閃現
    ctx.restore();
  }

  // 荒星躍起：離地處金塵環擴散；落點影子逐漸放大、星環收束，墜落的十字星芒愈來愈亮（世界座標）
  function leap(ctx, b, t) {
    const inst = b.inst;
    if (!inst || !inst.v) return;
    const acts = inst.v.actions, h = acts.find((a) => a.do === 'hide'), l = acts.find((a) => a.do === 'land'), m = l && inst.marks && inst.marks[l.mark];
    if (!h || !m) return;
    const q = U.clamp((inst.t - h.at) / (l.at - h.at), 0, 1);
    ctx.save();
    if (q < 0.3) { const ex = q / 0.3; ctx.translate(b.x, b.y); ring(ctx, 0, 0, b.r * (1 + 2.6 * ex), 0.7 * (1 - ex), HG, 3); rays(ctx, 8, 0.4, b.r * (0.8 + ex), b.r * (1.4 + 2 * ex), HG, 0.6 * (1 - ex), 2); ctx.translate(-b.x, -b.y); }
    ctx.translate(m.x, m.y);
    ctx.fillStyle = hexA('#05020a', 0.55 * q); ctx.beginPath(); ctx.ellipse(0, 0, b.r * (0.3 + 1.5 * q * q), b.r * (0.24 + 1.2 * q * q), 0, 0, TAU); ctx.fill();
    ring(ctx, 0, 0, 130 * (1.5 - 0.5 * q), 0.25 + 0.45 * q, HOT, 2.4);
    cross(ctx, 0, 0, 8 + 60 * q * q * q, HG, 0.3 + 0.7 * q);
    ctx.restore();
  }

  R.defineBossStyle('mihawk', {
    under: lockOn,
    hidden: leap,
    body(ctx, o, t, { def, r }) {
      const shade = !!o.shade, p2 = o.phase === 2, tag = r + ':' + (shade ? 's' : 'b');
      const guard = !!(o.statuses && BD.hasStatus(o, 'counter'));
      const stag = o.state === 'stagger' || o.state === 'stun'; // 被打斷：回到待機姿態
      const inst = !guard && !stag && o.inst && o.inst.skill && o.inst.v && o.inst.v.actions ? o.inst : null;
      const sid = inst ? inst.skill.id : '';
      for (const k of KEYS) A[k] = DEF[k];
      if (inst) { pace(inst); build(sid); } else A.e = 0.1 + Math.sin(t * 2.5) * 0.04;
      if (guard) { A.e = -0.2; A.sw = -1.1; A.l = 0.45; A.gl = 0.35 + 0.2 * Math.sin(t * 8); }
      ctx.save();
      if (!shade) { if (guard) guardfx(ctx, r, t); parried(ctx, o, r, t); }
      if (inst && !shade) decor(ctx, sid, r, p2, t);
      ctx.translate(A.lean * r, 0); if (A.sq !== 1) ctx.scale(A.sq, 1 + (1 - A.sq) * 0.5);
      if (A.spin) ctx.rotate(A.spin);

      // 背上的夜（一階段未出鞘，斜背）
      if (!p2) {
        ctx.save(); ctx.rotate(2.35); ctx.translate(-r * 0.2, 0);
        ctx.fillStyle = shade ? '#000000' : '#15131a'; ctx.strokeStyle = shade ? RED : '#4a4456'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.rect(r * 0.2, -r * 0.1, r * 2.3, r * 0.2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = shade ? RED : GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 0.42); ctx.lineTo(r * 0.2, r * 0.42); ctx.stroke();
        ctx.restore();
      }

      // 長外套下擺：身後隨移動擺動，內襯暗紅
      const sw = Math.sin(t * 3.5 + o.x * 0.01) * 0.15;
      ctx.fillStyle = shade ? '#000000' : '#16121a';
      ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.8); ctx.quadraticCurveTo(-r * 1.2, -r * (0.9 + sw), -r * 1.7, -r * sw * 2);
      ctx.quadraticCurveTo(-r * 1.2, r * (0.9 - sw), -r * 0.1, r * 0.8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.stroke();

      // 左臂：平衡（出手時隨之前伸 / 後甩）
      ctx.strokeStyle = shade ? '#050407' : '#241d2a'; ctx.lineWidth = r * 0.3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(r * (-0.45 + 0.9 * A.l), -r * (0.95 - 0.3 * Math.abs(A.l))); ctx.stroke();

      // 軀幹：黑外套，胸口敞開露出紅襯與金色十字吊墜
      R.blit(ctx, 'body:mihawk:torso:' + tag, r * 1.6 + 8, r * 2.2 + 8, r * 0.8 + 4, r * 1.1 + 4, (g) => {
        const gr = g.createRadialGradient(r * 0.1, 0, 2, 0, 0, r);
        gr.addColorStop(0, shade ? '#12141c' : '#2a2430'); gr.addColorStop(1, shade ? '#000000' : '#0e0c12');
        g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, r * 0.62, r * 1.05, 0, 0, U.TAU); g.fill();
        g.strokeStyle = RED; g.lineWidth = 2.4; g.beginPath(); g.moveTo(r * 0.55, -r * 0.5); g.lineTo(r * 0.55, r * 0.5); g.stroke();
        g.strokeStyle = shade ? RED : GOLD; g.lineWidth = 2; g.beginPath(); g.moveTo(r * 0.5, -r * 0.18); g.lineTo(r * 0.5, r * 0.18); g.moveTo(r * 0.4, -r * 0.07); g.lineTo(r * 0.6, -r * 0.07); g.stroke();
      });

      // 右臂＋武器：一階段小刀、二階段夜；蓄力時刀身泛光
      tip(r, p2);
      ctx.strokeStyle = shade ? '#050407' : '#241d2a'; ctx.lineWidth = r * 0.3;
      ctx.beginPath(); ctx.moveTo(0, r * 0.6); ctx.lineTo(HX, HY); ctx.stroke();
      ctx.save(); ctx.translate(HX, HY); ctx.rotate(A.sw);
      if (A.gl > 0.05 && !shade) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        ctx.strokeStyle = hexA(p2 ? HOT : HG, 0.5 * A.gl); ctx.lineWidth = 3 + 7 * A.gl; ctx.beginPath(); ctx.moveTo(r * 0.4, 0); ctx.lineTo(p2 ? r * 3.4 : r * 1.35, 0); ctx.stroke();
        ctx.restore();
      }
      if (p2) yoru(ctx, r, shade, p2, r * 3.4); else knife(ctx, r, shade);
      ctx.restore();

      // 寬簷羽飾帽：帽簷、紅帽帶、帽頂，一根長羽向後彎
      R.blit(ctx, 'body:mihawk:hat:' + tag, r * 2.4 + 8, r * 2.4 + 8, r * 1.2 + 4, r * 1.2 + 4, (g) => {
        const gr = g.createRadialGradient(0, 0, 2, 0, 0, r * 0.92);
        gr.addColorStop(0, shade ? '#1a1620' : '#2e2836'); gr.addColorStop(1, shade ? '#000000' : '#0f0d13');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 0.86, 0, U.TAU); g.fill();
        g.strokeStyle = shade ? RED : '#4a4456'; g.lineWidth = 1.6; g.stroke();
        g.strokeStyle = RED; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r * 0.42, 0, U.TAU); g.stroke();
        g.fillStyle = shade ? '#12101a' : '#1a161f'; g.beginPath(); g.arc(0, 0, r * 0.37, 0, U.TAU); g.fill();
        // 羽毛：由帽帶往後彎的長弧
        g.strokeStyle = shade ? RED : '#e8e4ec'; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-r * 0.05, -r * 0.32); g.quadraticCurveTo(-r * 0.8, -r * 0.85, -r * 0.95, -r * 0.15); g.stroke();
        g.strokeStyle = shade ? '#2a1016' : '#a9a4b4'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(-r * 0.05, -r * 0.32); g.quadraticCurveTo(-r * 0.7, -r * 0.72, -r * 0.85, -r * 0.15); g.stroke();
      });

      // 帽簷前緣下的金色鷹眼（兩點）；二階段更亮，蓄力時放大並拉出光線
      const a = Math.min(1, 0.65 + 0.3 * Math.sin(t * 4) + 0.3 * A.gl);
      ctx.fillStyle = hexA(p2 ? '#ffd860' : '#e8c860', a);
      ctx.beginPath(); ctx.arc(r * 0.8, -r * 0.15, 2.4 + 1.8 * A.gl, 0, TAU); ctx.arc(r * 0.8, r * 0.15, 2.4 + 1.8 * A.gl, 0, TAU); ctx.fill();
      if (A.gl > 0.3 && !shade) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(HG, 0.5 * A.gl); ctx.lineWidth = 1.5; ctx.beginPath();
        for (const s of [-1, 1]) { ctx.moveTo(r * 0.8, s * r * 0.15); ctx.lineTo(r * 0.8 + r * 1.6 * A.gl, s * r * 0.15); }
        ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
