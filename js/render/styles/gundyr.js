'use strict';
// Boss 造型：灰燼審判者古達：胸口螺旋劍拔除後的青白微光孔洞、亮鋼金邊重甲、披散黑髮、破爛披風、長戟；
// 二階段人之膿自後頸破體而出（覆滿黑羽毛絲的巨獸團塊、單隻赤紅大眼、利齒巨口、灰白蜘蛛節肢與枯槁巨爪）
// 逐招動畫：T 表以「蓄力 → 引 → 擊 → 收」四個關鍵值描述每招的身軀、戟、人之膿姿態；空中 / 立戟 / 拔戟等特例在 special()
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;

  const VIS = 1.15;                    // 視覺放大：判定半徑不變
  const TRIG = { hit: 1, dash: 1 };
  const REST = 0.4;                    // 戟持平時的角度
  const TAU = U.TAU;
  const ease = (u) => 1 - (1 - u) * (1 - u);
  const lerp = (a, b, u) => a + (b - a) * u;
  const _ = undefined;

  // 姿態參數預設值（tx / fwd / kl 以半徑 r 為單位）：ga 戟角、tx 握點前移、fs 戟長縮放、rot 軀幹扭轉、fwd 整體前衝、sq 蹲伏壓縮、
  // big 整體放大（落地重壓）、glow 戟刃蓄力光、two 左手扶柄、cA/cR/cL 巨爪角度 / 伸展 / 舉高、hA/hL/open 蛇首角度 / 伸長 / 張口、shake 蛇首顫抖、la/kl 踢腿角度 / 長度
  const DEF = { ga: REST, tx: 0, fs: 1, rot: 0, fwd: 0, sq: 1, big: 1, glow: 0, two: 0,
    cA: Math.PI - 1, cR: 0, cL: 1, hA: Math.PI + 0.55, hL: 0, open: 0, shake: 0, la: -1.8, kl: 0.9 };
  const KEYS = Object.keys(DEF);

  // 每招每個出手動作一組：key: [引（蓄滿）, 擊（出手瞬間）, 起始 = DEF, 收招 = 起始, 擊後衰減起點 = 擊]；tr 揮弧殘影濃度；h 蓄力段佔比
  const T = {
    // 重掃：戟拖至身後久久不發，轉身蓄滿一路揮到另一側，收招戟尖拖地
    heavy_sweep: { ga: [1.7, -1.0], rot: [0.4, -0.3], fwd: [-0.12, 0.3], sq: [0.93, 1], glow: [1, 0.3], two: [1, 1], tr: 0.28 },
    // 快掃：單手短促反手推掃
    fast_sweep: { ga: [1.0, -0.8], rot: [0.2, -0.2], fwd: [-0.05, 0.2], fs: [0.9, 1], glow: [0.6, 0.2], tr: 0.22 },
    // 跳斬：下蹲高舉 → 空中斜劈（special）→ 落地反手再斬；二階段落地後巨爪砸地
    leap_slice: [
      { ga: [2.2, 0.2], fs: [0.75, 1.1], sq: [0.86, 1], rot: [0.3, 0], fwd: [-0.1, 0.2], glow: [0.8, 0.3], two: [1, 1] },
      { ga: [1.7, -1.0, -0.4, REST], fs: [1, 1, 1.1, 1], rot: [0.3, -0.3, -0.1, 0], fwd: [-0.05, 0.2, 0.1, 0], glow: [0.6, 0.3], two: [1, 1, 1, 0], tr: 0.26, h: 1 },
      { cA: [-0.2, -0.4], cR: [0.7, 0.5], cL: [1.5, 1.05], hA: [3.3, 0.6], hL: [0.2, 0.6], open: [0.3, 1], fwd: [-0.05, 0.1], rot: [0.15, -0.1] },
    ],
    // 跳刺：深蹲、戟直立舉起 → 飛撲插地（special）→ 拔戟（special）
    leap_jab: { ga: [0.05, 0], tx: [-0.1, 0.3], fs: [0.55, 1.2], sq: [0.8, 1], fwd: [-0.12, 0.25], glow: [1, 0.7], two: [1, 1] },
    // 下劈三連：舉戟過頂 → 劈下，一劈比一劈重，腳步逐步前壓
    rapid_chop: [0, 1, 2].map((n) => n < 2
      ? { ga: [0.1, 0.1], fs: [0.55, 1.1], sq: [0.94, 1], rot: [(n ? -1 : 1) * 0.1, (n ? 1 : -1) * 0.12], fwd: [-0.06, 0.12 + 0.06 * n], glow: [0.6, 0.4], two: [1, 1] }
      : { ga: [0.1, 0.1], fs: [0.4, 1.3], sq: [0.88, 1], big: [1, 1.04], rot: [0.12, -0.15], fwd: [-0.12, 0.3], glow: [1, 0.6], two: [1, 1] }),
    // 迴旋踢：背身蓄轉 → 旋身掃腿，戟收至身側
    gundyr_kick: { ga: [-1.1, -1.1], tx: [-0.25, -0.25], rot: [0.9, -0.25], fwd: [0, 0.1], sq: [0.95, 1], la: [-1.7, 1.3, -1.8], kl: [0.9, 1.35, 0.9] },
    // 肩撞：沉肩壓低 → 左肩前撞
    shoulder_tackle: { ga: [-0.55, -0.55], tx: [-0.15, -0.15], rot: [-0.25, 0.4], fwd: [-0.1, 0.45], sq: [0.9, 1] },
    // 立戟：只畫出手後的反斬，守勢在 special()
    judge_stance: { ga: [1.5, -1.0], rot: [0.3, -0.3], fwd: [-0.05, 0.2], two: [1, 1], tr: 0.26 },
    // 巨爪橫掃：巨爪舉向一側 → 180° 橫掃到另一側，蛇首跟著轉頭
    mass_smack: { cA: [1.5, -1.5], cR: [1, 1], cL: [1.3, 1.05], hA: [3, -0.5], hL: [0.2, 0.8], open: [0.4, 1.1], rot: [0.25, -0.25], fwd: [0, 0.1] },
    // 巨爪砸地：巨爪高舉（透視放大）→ 直砸
    claw_slam: { cA: [-0.3, -0.45], cR: [0.5, 0.45], cL: [1.55, 1], hA: [3.3, 0.5], hL: [0.1, 0.5], open: [0.2, 0.6], fwd: [-0.05, 0.12], rot: [0.15, -0.1], sq: [0.96, 1] },
    // 蛇首衝咬：先昂首嘶吼（hit），再縮頸蓄勢 → 閃電前撲咬合
    screech_bite: [
      { hA: [3.2, 3.2, _, 3.2], hL: [-0.2, -0.2, _, -0.2], open: [1.3, 1.4, _, 1.4], shake: [1, 1, _, 1], fwd: [-0.1, -0.1], sq: [0.95, 0.95], ga: [-0.3, -0.3] },
      { hA: [3.1, 0, 3.2, 3.69], hL: [-0.3, 1.3, -0.2, 0], open: [1.5, 0.2, 1.4, 0], shake: [1, 0, 1, 0], fwd: [-0.12, 0.28, -0.1, 0], sq: [0.92, 1, 0.95, 1], ga: [-0.3, -0.3] },
    ],
    // 泰山壓頂：先下蹲（蓄力段只佔前 26%，之後躍起隱身）→ 落地重壓放大再彈回，雙爪蛇首同時砸下
    leap_slam: [
      { sq: [0.78, 1], big: [1, 1.35], cA: [0.5, 0], cR: [1, 1], cL: [1.6, 1.1], hA: [3.2, 0], hL: [0, 1.1], open: [0.3, 1.3], fwd: [0, 0.1], h: 0.26, ga: [0.3, 0.1] },
      {},
    ],
    // 英雄突擊：腰側持戟蓄勢（special 衝鋒）→ 收勢後旋身 360° 橫掃 → 二階段人之膿巨手橫掃吞噬
    ult: [
      { ga: [0, 0], tx: [0.35, 0.4], fs: [1.15, 1.15], sq: [0.82, 0.8], fwd: [-0.25, -0.2], glow: [1, 1], two: [1, 1] },
      { ga: [2.0, 2.0 - TAU, 0, REST - TAU, 2.0 - TAU], rot: [-0.6, TAU - 0.6, 0, TAU, TAU - 0.6], fs: [1.1, 1.1], fwd: [-0.1, 0.1], sq: [0.9, 1], big: [1, 1.05], glow: [1, 1], two: [1, 1], tr: 0.3 },
      { cA: [1.9, -1.9], cR: [1, 1], cL: [1.25, 1.1], hA: [2.6, -0.8], hL: [0.3, 1], open: [0.8, 1.4], rot: [0.2, -0.2] },
    ],
  };

  // 重用物件：本幀姿態（A）、揮擊中途 / 擊後混合用（B）、出手節奏（P）
  const A = Object.assign({ s0: 0, sa: 0, speed: 0 }, DEF), B = {};
  const P = { L: -1, N: -1, wd: 0, sn: 0, sw: 0, since: 0, rc: 0, dashN: false };

  // 以出手動作節奏取代 R.skillPace：擊後 0.25s 內仍保留「擊」姿態，並與下一手的蓄力混合，連段不跳格；衝刺以落地時刻起算
  function pace(inst) {
    const t = inst.t; let L = null, N = null, n = 0;
    P.L = P.N = -1;
    for (const a of inst.v.actions) {
      if (!TRIG[a.do]) continue;
      if (a.at <= t) { L = a; P.L = n; } else { N = a; P.N = n; break; }
      n++;
    }
    const endL = L ? L.at + (L.do === 'dash' ? L.dur : 0) : 0;
    P.since = L ? t - endL : 0;
    P.sn = L && P.since >= 0 && P.since < 0.25 ? 1 - P.since / 0.25 : 0;
    P.wd = N ? U.clamp((t - endL) / Math.max(0.05, N.at - endL), 0, 1) : 0;
    P.dashN = !!N && N.do === 'dash';
    P.rc = !N && L ? U.clamp((t - endL) / Math.max(0.1, inst.v.dur - endL), 0, 1) : 0;
    return P;
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
  function build(sid, p) {
    const E = T[sid], ent = (i) => Array.isArray(E) ? E[Math.min(i, E.length - 1)] : E;
    const eN = p.N >= 0 ? ent(p.N) : null, eL = p.L >= 0 ? ent(p.L) : null;
    p.sw = 0;
    if (eN) {
      p.sw = p.dashN || p.wd < 0.7 ? 0 : ease((p.wd - 0.7) / 0.3);
      ev(A, eN, 'wind', ease(Math.min(1, p.wd / (eN.h || 0.6))), p.sw);
      if (eL && p.sn > 0) { ev(B, eL, 'snap', p.sn); for (const k of KEYS) A[k] = lerp(A[k], B[k], p.sn); }
    } else if (eL) ev(A, eL, p.sn > 0 ? 'snap' : 'end', p.sn);
    if (eL && eL.tr && p.sn > 0) { A.s0 = eL.ga[0]; A.sa = eL.tr * p.sn; }
    else if (eN && eN.tr && p.sw > 0) { A.s0 = eN.ga[0]; A.sa = eN.tr * p.sw; }
  }
  // 無法用關鍵值表達的動作：衝刺中的空中姿態、跳刺插地後的拔戟、立戟的橫戟守勢
  function special(sid, inst, p, t) {
    const d = inst.dash, q = d ? U.clamp(d.t / d.dur, 0, 1) : 0, arc = Math.sin(Math.PI * q);
    if (d && sid === 'leap_slice') {
      Object.assign(A, { ga: lerp(2.2, -0.4, ease(q)), fs: 1.1, rot: lerp(0.3, -0.1, q), sq: 1, big: 1 + 0.22 * arc, fwd: 0.2, glow: 0.6, two: 1, speed: 1, s0: 2.2, sa: 0.3 });
    } else if (d && sid === 'leap_jab') {
      Object.assign(A, { ga: 0, tx: 0.3, fs: 1.2, rot: 0, sq: 1, big: 1 + 0.18 * arc, fwd: 0.25, glow: 1, two: 1, speed: 1 });
    } else if (d && sid === 'ult') {
      Object.assign(A, { ga: 0, tx: 0.4, fs: 1.2, sq: 0.85, fwd: 0.3, glow: 1, two: 1, speed: 1 });
      Object.assign(A, { cA: Math.PI - 0.35, cR: 1, cL: 1, hA: Math.PI + 0.15, hL: 0.9, open: 0.6, shake: 0.3 }); // 人之膿向後拖曳成流線
    } else if (sid === 'leap_jab' && p.L === 0 && p.since >= 0) { // 戟插入地面：顫動僵持，最後一小段猛力拔起
      const rc = p.rc;
      Object.assign(A, { ga: rc < 0.85 ? 0 : lerp(0, REST, ease((rc - 0.85) / 0.15)), tx: 0.3, fs: rc < 0.85 ? 1.2 : lerp(1.2, 1, (rc - 0.85) / 0.15),
        rot: Math.sin(t * 38) * 0.05 * (1 - rc) - 0.05, fwd: 0.25 - 0.35 * rc, sq: 0.92 + 0.08 * rc, two: 1, glow: 0 });
    } else if (sid === 'judge_stance' && p.L < 0) { // 0~0.65s 橫戟守勢，之後收戟蓄反斬
      const g = 1 - U.clamp((p.wd - 0.72) / 0.1, 0, 1), u = U.clamp((p.wd - 0.72) / 0.28, 0, 1);
      const ga = u < 0.7 ? lerp(-1.45, 1.5, ease(u / 0.7)) : lerp(1.5, -1.0, ease((u - 0.7) / 0.3));
      Object.assign(A, { ga, tx: 0.95 * g, fs: lerp(1, 0.85, g), sq: 0.95, fwd: -0.04, two: 1, glow: g, s0: 1.5, sa: u > 0.7 ? 0.26 * ((u - 0.7) / 0.3) : 0 });
    }
  }

  // 地面層（畫在身體底下）：碎裂紋、震波環、速度線
  function crack(ctx, x, y, rad, a, col) {
    ctx.strokeStyle = hexA(col, a); ctx.lineWidth = 2.2; ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const an = i * 0.785 + 0.2, l = rad * (0.6 + 0.2 * (i % 3));
      ctx.moveTo(x + Math.cos(an) * rad * 0.2, y + Math.sin(an) * rad * 0.2); ctx.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l);
    }
    ctx.stroke();
  }
  function ring(ctx, x, y, rad, a, col, w) {
    ctx.strokeStyle = hexA(col, a); ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, Math.max(1, rad), 0, TAU); ctx.stroke();
  }
  function streaks(ctx, r, col) {
    ctx.strokeStyle = hexA(col, 0.5); ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i < 5; i++) { const y = (i - 2) * r * 0.36, x0 = -r * (0.9 + (i % 2) * 0.4); ctx.moveTo(x0, y); ctx.lineTo(x0 - r * (1.6 + 0.4 * (i % 3)), y); }
    ctx.stroke();
  }
  function decor(ctx, sid, r, p, tint, t) {
    if (A.speed > 0) streaks(ctx, r, tint);
    if (!p) return;
    const sn = p.sn;
    if (sid === 'rapid_chop' && sn > 0) crack(ctx, 105, 0, 42, sn, '#2e261e');
    else if (sid === 'leap_jab' && p.L === 0 && p.since >= 0) {
      crack(ctx, r * 5.2, 0, 52, 1 - p.rc * 0.7, '#2e261e');
      if (p.since < 0.3) ring(ctx, r * 5.2, 0, 30 + 120 * p.since, 1 - p.since / 0.3, tint, 4);
    } else if (sid === 'claw_slam' && sn > 0) {
      const x = Math.cos(-0.4) * 90, y = Math.sin(-0.4) * 90;
      ring(ctx, x, y, 135 * (1.1 - 0.7 * sn), sn * 0.8, '#3a2c46', 8); crack(ctx, x, y, 80, sn, '#1a1220');
    } else if (sid === 'gundyr_kick' && sn > 0) {
      ctx.strokeStyle = hexA(tint, sn * 0.6); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 155 * (1.15 - 0.3 * sn), -0.9, 1.6); ctx.stroke();
    } else if (sid === 'shoulder_tackle' && sn > 0) {
      streaks(ctx, r, tint); crack(ctx, r * 1.7, -r * 0.5, 38, sn, tint);
    } else if (sid === 'leap_slam' && p.L >= 0) {
      const ts = p.since + (p.L === 1 ? 0.2 : 0), u1 = U.clamp(ts / 0.4, 0, 1), u2 = U.clamp((ts - 0.1) / 0.45, 0, 1);
      if (u1 < 1) ring(ctx, 0, 0, 240 * u1, (1 - u1) * 0.8, '#3a2c46', 10);
      if (u2 > 0 && u2 < 1) ring(ctx, 0, 0, lerp(220, 400, u2), (1 - u2) * 0.5, tint, 6);
      if (ts < 0.5) crack(ctx, 0, 0, 200, 1 - ts * 2, '#1a1220');
    } else if (sid === 'ult' && p.L === 1 && sn > 0) ring(ctx, 0, 0, 250 * (1.1 - 0.5 * sn), sn * 0.8, tint, 8);
  }

  // 人之膿：自後頸竄出的巨大長條蛇狀肉身（體長約為古達的四倍以上），末端是張著利齒巨口的頭。
  // 巨爪 / 蛇首姿態由 A（cA cR cL / hA hL open shake）決定；平時盤在身後蠕動
  function limb(ctx, p0, p1, p2, w0, w1, t, ph, k) {
    const N = 16;
    ctx.fillStyle = '#0c090d';
    for (let i = 0; i <= N; i++) {
      const s = i / N, u = 1 - s;
      const x = u * u * p0[0] + 2 * u * s * p1[0] + s * s * p2[0], y = u * u * p0[1] + 2 * u * s * p1[1] + s * s * p2[1];
      const bulge = 1 + 0.25 * Math.sin(t * 4 - s * 9 + ph); // 肉身沿身長起伏蠕動
      ctx.beginPath(); ctx.arc(x, y, (w0 + (w1 - w0) * s) * bulge * k, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = '#3a2c46'; ctx.lineWidth = w0 * 0.15; ctx.beginPath(); ctx.moveTo(p0[0], p0[1] - w0 * 0.4);
    ctx.quadraticCurveTo(p1[0], p1[1] - w0 * 0.35, p2[0], p2[1] - w1 * 0.4); ctx.stroke();
  }
  // 黑羽毛絲質感：在已套用的座標系內，沿橢圓內撒短筆劃（黃金角分佈，不用亂數）
  function fur(ctx, rx, ry, n, len) {
    ctx.strokeStyle = 'rgba(170,176,200,0.55)'; ctx.lineWidth = 1.1; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = i * 2.399, d = Math.sqrt((i + 0.5) / n), x = Math.cos(a) * rx * d, y = Math.sin(a) * ry * d;
      ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(a - 0.5) * len, y - Math.sin(a - 0.5) * len);
    }
    ctx.stroke();
  }
  // 灰白枯骨節肢（蜘蛛狀）：兩節，隨步伐微微開合
  function leg(ctx, base, a, r, t, ph, k) {
    const sw = Math.sin(t * 2.4 + ph) * 0.18, a1 = a + sw, L1 = r * 1.7 * k, L2 = r * 1.5 * k;
    const kx = base[0] + Math.cos(a1) * L1, ky = base[1] + Math.sin(a1) * L1, a2 = a1 + (a > 0 ? 0.7 : -0.7);
    const fx = kx + Math.cos(a2) * L2, fy = ky + Math.sin(a2) * L2;
    for (const [col, w] of [['#2a2430', r * 0.36], ['#cfc7bd', r * 0.22]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    }
  }
  function drawClaw(ctx, base, r, t, k) {
    const a = A.cA + Math.sin(t * 1.3) * 0.12 * (1 - U.clamp(A.cR, 0, 1)), wl = 1 + (A.cL - 1) * 0.5;
    const L = r * (3.4 + 2.4 * A.cR) * k * A.cL, tip = [base[0] + Math.cos(a) * L, Math.sin(a) * L];
    const mid = [(base[0] + tip[0]) / 2 + Math.cos(a - 1.57) * r * 1.1, tip[1] / 2 + Math.sin(a - 1.57) * r * 1.1];
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [col, w] of [['#2a2430', r * 0.95 * wl], ['#c9c0b6', r * 0.66 * wl]]) { // 先畫暗色輪廓再畫慘白臂骨
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(base[0], 0); ctx.lineTo(mid[0], mid[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
    }
    ctx.fillStyle = '#d8d0c6'; ctx.beginPath(); ctx.arc(mid[0], mid[1], r * 0.52 * wl, 0, TAU); ctx.fill(); // 肘關節
    for (let c = 0; c < 4; c++) { // 四根彎曲的枯指
      const fa = a + (c - 1.5) * 0.42 + Math.sin(t * 3 + c) * 0.06, fl = r * (1.8 + 0.25 * (c % 2));
      const f1 = [tip[0] + Math.cos(fa) * fl * 0.6, tip[1] + Math.sin(fa) * fl * 0.6], f2 = [f1[0] + Math.cos(fa + 0.7) * fl * 0.5, f1[1] + Math.sin(fa + 0.7) * fl * 0.5];
      ctx.strokeStyle = '#2a2430'; ctx.lineWidth = r * 0.38; ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(f1[0], f1[1]); ctx.lineTo(f2[0], f2[1]); ctx.stroke();
      ctx.strokeStyle = '#d8d0c6'; ctx.lineWidth = r * 0.22; ctx.stroke();
    }
  }
  // 人之膿：覆滿黑色羽毛絲的巨獸團塊壓在古達身後，灰白節肢撐地，單隻猩紅大眼的巨首撲向前方
  // k 成長 0~1
  function drawMass(ctx, r, t, k) {
    if (k <= 0.01) return;
    const base = [-r * 0.3, 0];
    ctx.save(); ctx.globalAlpha *= Math.min(1, k * 1.5); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 4; i++) leg(ctx, [base[0] - r * 0.2 * (i % 2), 0], (i < 2 ? -1 : 1) * (1.35 + 0.5 * (i % 2)), r, t, i * 1.7, k);
    drawClaw(ctx, base, r, t, k);
    // 身軀團塊
    ctx.save(); ctx.translate(base[0] - r * 0.7, 0); ctx.scale(k, k);
    ctx.fillStyle = '#0c090d'; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.9, r * 1.55 + Math.sin(t * 1.8) * r * 0.08, 0, 0, TAU); ctx.fill();
    fur(ctx, r * 1.8, r * 1.45, 46, r * 0.32);
    ctx.restore();
    // 頸：粗壯、羽毛覆蓋，頭部撲向前方
    const a = A.hA + Math.sin(t * 1.7) * 0.18 * (1 - U.clamp(A.hL, 0, 1)), hl = U.clamp(A.hL, 0, 1.4);
    const L = r * (4.2 + 2.6 * A.hL) * k;
    const head = [base[0] + Math.cos(a) * L + Math.sin(t * 70) * r * 0.07 * A.shake, Math.sin(a) * L + Math.cos(t * 83) * r * 0.07 * A.shake];
    const ca = a + 1.0 * (1 - 0.7 * U.clamp(hl, 0, 1)), cl = L * 0.6 + Math.sin(t * 2.2) * r * 0.5;
    const ctrl = [base[0] + Math.cos(ca) * cl, Math.sin(ca) * cl];
    limb(ctx, base, ctrl, head, r * 1.7, r * 1.3, t, 0, k);
    // 頭：沿身體末端切線朝外張口，噬咬時張得更大；暗紅口腔與慘白利齒
    const ta = Math.atan2(head[1] - ctrl[1], head[0] - ctrl[0]), mo = (1 + 0.7 * U.clamp(A.hL, 0, 1) + A.open) * k;
    ctx.save(); ctx.translate(head[0], head[1]); ctx.rotate(ta);
    ctx.fillStyle = '#0c090d'; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.55 * k, r * 1.3 * k, 0, 0, TAU); ctx.fill();
    fur(ctx, r * 1.45 * k, r * 1.2 * k, 30, r * 0.28);
    ctx.fillStyle = '#5a1220'; ctx.beginPath(); ctx.ellipse(r * 0.6, 0, r * 0.85 * mo, r * 0.9 * mo, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e0d4dc';
    for (let i = 0; i < 8; i++) {
      const b = i / 8 * TAU, ex = r * 0.6 + Math.cos(b) * r * 0.85 * mo, ey = Math.sin(b) * r * 0.9 * mo;
      ctx.beginPath(); ctx.moveTo(ex + Math.sin(b) * 3, ey - Math.cos(b) * 3); ctx.lineTo(ex - Math.cos(b) * r * 0.22, ey - Math.sin(b) * r * 0.22); ctx.lineTo(ex - Math.sin(b) * 3, ey + Math.cos(b) * 3); ctx.closePath(); ctx.fill();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; // 單隻猩紅大眼，帶裂紋光斑
    const pu = (0.85 + 0.15 * Math.sin(t * 5)) * (1 + 0.3 * A.open);
    ctx.fillStyle = hexA('#ff2a2a', Math.min(1, pu)); ctx.beginPath(); ctx.ellipse(-r * 0.1, -r * 0.62, r * 0.42 * k, r * 0.3 * k, 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = hexA('#ff9a8a', 0.5 * Math.min(1, pu)); ctx.beginPath(); ctx.ellipse(-r * 0.1, -r * 0.62, r * 0.18 * k, r * 0.12 * k, 0.3, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.restore();
  }

  function drawBody(ctx, o, t, { r }) {
    const p2 = o.phase === 2, massK = p2 ? 1 : (o.massK || 0);
    let inst = o.inst && o.inst.skill && o.inst.v && o.inst.v.actions ? o.inst : null;
    if (o.state === 'stagger' || o.state === 'stun') inst = null; // 被打斷：人之膿垂軟
    const sid = inst ? inst.skill.id : '';
    const tint = p2 ? '#a88ac8' : '#e8e4dc', glowC = p2 ? '#b48cff' : '#e08a3a';

    // —— 本幀姿態：待機呼吸 → 逐招關鍵值 → 特例 ——
    for (const k of KEYS) A[k] = DEF[k];
    A.s0 = 0; A.sa = 0; A.speed = 0;
    A.ga = REST + Math.sin(t * 2.2) * 0.04; A.big = 1 + Math.sin(t * 1.8) * 0.012;
    let p = null;
    if (inst) {
      p = pace(inst);
      if (T[sid]) { build(sid, p); special(sid, inst, p, t); }
      if (sid === 'ult' && p.N === 0 && !inst.dash && A.glow > 0) A.rot += Math.sin(t * 40) * 0.02 * A.glow; // 衝鋒前蓄力顫動
    }

    decor(ctx, sid, r, p, tint, t);
    ctx.save(); ctx.translate(A.fwd * r, 0); if (A.big !== 1) ctx.scale(A.big, A.big);

    // 1. 破爛披風（衝刺時被風扯長）
    const sway = Math.sin(t * 4) * r * 0.1, cs = 1 + 0.6 * A.speed;
    ctx.fillStyle = '#2a211b';
    ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.85);
    for (let i = 1; i <= 6; i++) ctx.lineTo(-r * 0.1 - (i * r * 0.28 + (i % 2) * r * 0.12) * cs, -r * 0.85 + i * r * 0.283 + Math.sin(t * 5 + i) * r * 0.1 + sway);
    ctx.lineTo(-r * 0.1, r * 0.85); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4a3a2c'; ctx.lineWidth = 1.5; ctx.stroke();

    // 2. 人之膿（畫在身體之下，從後頸探出）
    drawMass(ctx, r, t, massK);

    // 軀幹扭轉 / 蹲伏：只作用於古達本身，人之膿不跟著轉
    ctx.save(); ctx.rotate(A.rot); if (A.sq !== 1) ctx.scale(A.sq, 1 + (1 - A.sq) * 0.5);

    // 2.5 體術：審判鐵腿・迴旋踢（畫在軀幹下方）
    if (sid === 'gundyr_kick') {
      const ka = A.la, kL = r * A.kl, sg = Math.max(p.sn, p.sw);
      ctx.save();
      ctx.translate(-r * 0.05, r * 0.3);
      ctx.rotate(ka);
      if (sg > 0) {
        ctx.fillStyle = hexA(tint, 0.28 * sg);
        ctx.beginPath();
        ctx.arc(0, 0, kL + r * 0.35, -2.2 * (1 - sg), 0.2);
        ctx.arc(0, 0, kL * 0.45, 0.2, -2.2 * (1 - sg), true);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = '#5a6270'; ctx.lineWidth = r * 0.38; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(kL, 0); ctx.stroke();
      ctx.strokeStyle = '#8e97a4'; ctx.lineWidth = r * 0.22;
      ctx.beginPath(); ctx.moveTo(kL * 0.3, 0); ctx.lineTo(kL, 0); ctx.stroke();
      // 鋼鐵戰靴 (Sabaton)
      ctx.fillStyle = '#3a424e'; ctx.strokeStyle = '#1b1e24'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(kL + r * 0.14, 0, r * 0.22, r * 0.16, 0, 0, TAU); ctx.fill(); ctx.stroke();
      // 靴頭金屬雕邊
      ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(kL + r * 0.16, 0, r * 0.1, -1.2, 1.2); ctx.stroke();
      ctx.restore();
    }

    // 3. 軀幹：雙肩甲 + 胸甲（精靈快取）
    R.blit(ctx, 'body:gundyr:torso:' + r, r * 2.4 + 20, r * 2.4 + 20, r * 1.2 + 10, r * 1.2 + 10, (g) => {
      g.lineWidth = 2;
      // 胸甲
      const gr = g.createRadialGradient(r * 0.1, 0, 2, 0, 0, r * 0.9);
      gr.addColorStop(0, '#e6eaf0'); gr.addColorStop(0.6, '#a3abb8'); gr.addColorStop(1, '#4a5260');
      g.fillStyle = gr; g.strokeStyle = '#1b1e24';
      g.beginPath(); g.ellipse(0, 0, r * 0.62, r * 0.8, 0, 0, TAU); g.fill(); g.stroke();
      // 肩甲
      for (const s of [-1, 1]) {
        g.fillStyle = '#b9c0ca';
        g.beginPath(); g.ellipse(r * 0.05, s * r * 0.82, r * 0.42, r * 0.3, s * 0.25, 0, TAU); g.fill(); g.stroke();
        g.strokeStyle = '#c9a24a'; g.beginPath(); g.ellipse(r * 0.05, s * r * 0.82, r * 0.28, r * 0.17, s * 0.25, 0, TAU); g.stroke(); // 肩甲金邊雕花
        g.strokeStyle = '#1b1e24';
      }
      // 腰帶與甲片
      g.strokeStyle = '#b8903c';
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(-r * 0.3, i * r * 0.2); g.lineTo(r * 0.3, i * r * 0.2); g.stroke(); }
    });

    // 4. 螺旋劍已被拔除：胸口留下貫穿孔洞，孔中一點青白微光（蓄力時加亮）
    ctx.fillStyle = '#0b0d12'; ctx.strokeStyle = '#8a7a52'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(r * 0.52, 0, r * 0.13, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const wp = Math.min(1, 0.6 + 0.3 * Math.sin(t * 2.5) + 0.5 * A.glow);
    ctx.fillStyle = hexA('#9fd0ff', 0.18 * wp); ctx.beginPath(); ctx.arc(r * 0.52, 0, r * 0.26, 0, TAU); ctx.fill();
    ctx.fillStyle = hexA('#e8f4ff', wp); ctx.beginPath(); ctx.arc(r * 0.52, 0, r * 0.07, 0, TAU); ctx.fill();
    ctx.restore();

    // 5. 頭：鋼盔 + 腦後披散的黑色長髮（衝刺時被風吹直）
    ctx.strokeStyle = '#0d0b10'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      const sy = i * r * 0.1, w2 = Math.sin(t * 3 + i * 1.3) * r * 0.08 * (1 - 0.7 * A.speed);
      ctx.beginPath(); ctx.moveTo(r * 0.05, sy * 0.6); ctx.quadraticCurveTo(-r * 0.5, sy + w2, -r * (0.95 + 0.6 * A.speed), sy * 1.8 + w2 * 1.5); ctx.stroke();
    }
    ctx.fillStyle = '#8e97a4'; ctx.strokeStyle = '#1b1e24'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(r * 0.15, 0, r * 0.38, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r * 0.2, 0); ctx.lineTo(r * 0.5, 0); ctx.stroke(); // 盔頂金脊
    ctx.fillStyle = '#0a0806'; // 面罩橫縫
    ctx.fillRect(r * 0.32, -r * 0.2, r * 0.1, r * 0.4);

    // 6. 古達的長戟：長柄 + 斧刃 + 槍尖（掃擊時帶揮弧殘影，蓄力時刃上聚光）
    const ha = A.ga, fs = A.fs, hpx = r * 0.2 + A.tx * r, hpy = r * 0.62;
    const L = r * 4.0;
    if (A.sa > 0.01) {
      const a0 = Math.min(A.s0, ha), a1 = Math.max(A.s0, ha);
      ctx.fillStyle = hexA(tint, A.sa);
      ctx.beginPath(); ctx.arc(hpx, hpy, L * fs + r * 0.4, a0, a1); ctx.arc(hpx, hpy, L * 0.55, a1, a0, true); ctx.closePath(); ctx.fill();
    }
    ctx.save(); ctx.translate(hpx, hpy); ctx.rotate(ha); if (fs !== 1) ctx.scale(fs, 1);
    ctx.strokeStyle = '#3a2f26'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-r * 0.9, 0); ctx.lineTo(L, 0); ctx.stroke();
    ctx.fillStyle = '#6f695f'; ctx.strokeStyle = '#2a251f'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(L - r * 0.9, 0); ctx.quadraticCurveTo(L - r * 0.75, -r * 0.75, L - r * 0.1, -r * 0.55); ctx.lineTo(L - r * 0.25, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); // 斧刃
    ctx.beginPath(); ctx.moveTo(L - r * 0.9, 0); ctx.quadraticCurveTo(L - r * 0.75, r * 0.3, L - r * 0.4, r * 0.28); ctx.lineTo(L - r * 0.3, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); // 背鉤
    ctx.fillStyle = '#c9c6bf';
    ctx.beginPath(); ctx.moveTo(L - r * 0.3, -4); ctx.lineTo(L + r * 0.75, 0); ctx.lineTo(L - r * 0.3, 4); ctx.closePath(); ctx.fill(); ctx.stroke(); // 槍尖
    if (A.glow > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.save(); ctx.scale(1 / fs, 1); // 戟長縮放不可壓扁光暈
      ctx.fillStyle = hexA(glowC, 0.32 * A.glow); ctx.beginPath(); ctx.arc((L - r * 0.4) * fs, 0, r * (0.3 + 0.25 * A.glow), 0, TAU); ctx.fill();
      ctx.restore();
      if (sid === 'ult' && p.N === 0 && !inst.dash) { // 英雄突擊蓄力：光點向刃尖收束
        ctx.fillStyle = hexA('#fff4dc', 0.8 * A.glow);
        for (let i = 0; i < 6; i++) { const an = i * 1.047 + t * 3, d = (1 - A.glow * 0.8) * r * 1.8 + 4; ctx.beginPath(); ctx.arc(L - r * 0.4 + Math.cos(an) * d, Math.sin(an) * d, 2.5, 0, TAU); ctx.fill(); }
      }
    }
    ctx.restore();

    // 7. 雙手：右手握柄；左手平時垂在身側，雙手持戟的招式扶在柄上
    ctx.fillStyle = '#6f695f'; ctx.strokeStyle = '#1b1612'; ctx.lineWidth = 1.5;
    const hx = hpx + Math.cos(ha) * r * 1.4 * fs, hy = hpy + Math.sin(ha) * r * 1.4 * fs;
    const gx = lerp(r * 0.45, hx, A.two), gy = lerp(-r * 0.62, hy, A.two);
    ctx.beginPath(); ctx.arc(hpx, hpy, r * 0.2, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(gx, gy, r * 0.2, 0, TAU); ctx.fill(); ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  // 換階段用的繪製物件（重用）
  const TR = { x: 0, y: 0, face: 0, r: 0, def: null, phase: 1, state: 'transition', massK: 0, inst: null };
  R.defineBossStyle('gundyr', {
    body(ctx, o, t, args) { ctx.save(); ctx.lineWidth = 1; drawBody(ctx, o, t, Object.assign({}, args, { r: args.r * VIS })); ctx.restore(); },
    // 泰山壓頂躍入空中時：起跳處煙塵環，落點上的巨影隨落下愈來愈大愈濃
    hidden(ctx, b, t) {
      const inst = b.inst;
      if (!inst || !inst.skill || inst.skill.id !== 'leap_slam') return;
      const m = inst.marks && inst.marks.slamSpot, u = U.clamp((inst.t - 0.25) / 0.7, 0, 1), v = U.clamp((inst.t - 0.25) / 0.4, 0, 1);
      ctx.save();
      if (v < 1) { ctx.strokeStyle = hexA('#3a2c46', 0.6 * (1 - v)); ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1 + 1.4 * v), 0, TAU); ctx.stroke(); }
      if (m) { ctx.fillStyle = hexA('#05030a', 0.12 + 0.4 * u); ctx.beginPath(); ctx.arc(m.x, m.y, 240 * (0.2 + 0.8 * u), 0, TAU); ctx.fill(); }
      ctx.restore();
    },
    // 換階段「人之膿破體」：先單膝壓低身形顫抖，肉團在咆哮前逐漸脹出（爆裂煙霧由 phase2.transFx 負責）
    transition(ctx, b, t) {
      const at = b.roarAt || 0.6, before = b.stateT < at, k = U.clamp(b.stateT / at, 0, 1);
      TR.x = b.x + (before ? Math.sin(t * 40) * 1.5 * k : 0); TR.y = b.y; TR.face = b.face; TR.r = b.r; TR.def = b.def;
      TR.phase = before ? 1 : 2; TR.massK = before ? k : 1;
      R.drawBossBody(ctx, TR, t);
      return true;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
