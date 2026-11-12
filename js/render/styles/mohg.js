'use strict';
// 自繪鮮血君王蒙格（俯視）。依官方設定稿 mg-ref-107（一階段正背面）、mg-ref-108（二階段展翼＋三叉戟）與開場／戰鬥畫面：
// 滿頭黑色捲角、黑袍上兩條金繡長領帶、紅色頸巾、左肩教堂造型的金色聖物匣肩甲配黑紗、背後太陽狀金繡、黑色爪手配金手環；
// 三叉戟為金色螺旋戟身＋金環護手＋三支黑色鋸齒戟尖；二階段長出破碎黑羽翼（翼關節帶爪）、聖槍燃起血焰。
// 俯視輪廓、手臂角度與羽翼造型為自繪（原作只有正視／側視）。姿勢讀實際時間軸；靜態部位以 R.blit 快取，亂數只用確定性公式。
(function (G) {
  const BD = G.BD, R = BD.Render, U = BD.U, TAU = U.TAU;
  const ROBE = '#141014', ROBE2 = '#2a1a20', GOLD = '#d8a23a', GOLD2 = '#f6d27a', GOLDD = '#7a5418', RED = '#b8122a', CRIM = '#e0142e', CLAW = '#0e0b10', HORN = '#1c1a20', HORN2 = '#5a5660';
  const cl = v => U.clamp(v, 0, 1), ease = v => { v = cl(v); return v * v * (3 - 2 * v); }, bump = v => (v > 0 && v < 1 ? Math.sin(v * Math.PI) : 0);
  // 關鍵影格：frames = [[秒, 值], ...]，區段內平滑插值
  function kf(T, F) {
    if (T <= F[0][0]) return F[0][1];
    for (let i = 1; i < F.length; i++) if (T <= F[i][0]) { const [t0, v0] = F[i - 1], [t1, v1] = F[i]; return v0 + (v1 - v0) * ease((T - t0) / Math.max(1e-3, t1 - t0)); }
    return F[F.length - 1][1];
  }
  const CACHE = new WeakMap();
  function info(inst) {
    let v = CACHE.get(inst.v); if (v) return v;
    const A = inst.v.actions, hits = A.filter(a => a.do === 'hit' || a.do === 'rain' || a.do === 'dash').map(a => a.at).sort((a, b) => a - b);
    v = { h: hits.length ? hits : [1], nihil: A.filter(a => a.do === 'nihil').map(a => a.at), curse: A.filter(a => a.do === 'curse').map(a => a.at), hide: A.filter(a => a.do === 'hide'), land: A.filter(a => a.do === 'land') };
    CACHE.set(inst.v, v); return v;
  }
  const NIHIL_T = [1.0, 1.75, 2.5]; // 與 js/engine/actions/mohg.js 的轉階段虛無時間一致（純演出）
  function pose(o, t, st) {
    const p2 = o.phase === 2;
    const P = { sa: -0.35, sr: 0, lift: 0, sglow: p2 ? 0.5 : 0, la: 0.9, lh: 0, lup: 0, lglow: 0, lean: 0, wing: p2 ? 0.5 : 0, flap: 0.25, claw: 0, twist: 0, halo: 0 };
    if (Math.hypot(o.vx || 0, o.vy || 0) > 30) { P.wing += 0.12; P.flap = 0.4; }
    if (['stun', 'stagger', 'knockdown'].includes(st)) { P.sa = 0.7; P.lean = -0.18; P.wing *= 0.5; P.la = 1.3; return P; }
    if (st === 'transition') {
      const q = o.stateT || 0;
      P.lift = Math.max(...NIHIL_T.map(n => bump((q - n + 0.4) / 0.65))); P.sa = 0; P.sglow = cl(q / 2.6);
      P.wing = ease((q - 2.4) / 0.5); P.flap = 0.6; P.halo = cl(q / 0.8) * (1 - ease((q - 2.9) / 0.3)); P.la = 1.2; P.lglow = cl(q / 2);
      return P;
    }
    const inst = o.inst; if (!inst) return P;
    const I = info(inst), T = inst.t, id = inst.skill.id, h = I.h, h0 = h[0], hl = h[h.length - 1];
    if (id === 'trident_sweep') {
      const [a, b, c] = h;
      P.sa = kf(T, [[0, -0.35], [a - 0.3, 1.3], [a, -1.2], [b - 0.18, -1.3], [b, 1.2], [c - 0.35, 0.2], [c, 0], [hl + 0.5, -0.35]]);
      P.lift = kf(T, [[b, 0], [c - 0.3, 1], [c, 0]]); P.sr = kf(T, [[c - 0.05, 0], [c, 0.45], [hl + 0.5, 0]]); P.lean = 0.1 * bump(T / (hl + 0.4));
    } else if (id === 'ground_thrust') {
      P.sa = -0.05; P.sr = kf(T, [[0, 0], [h0 - 0.25, -0.4], [h0, 0.65], [h[1] - 0.1, 0.5], [h[1], 0.1], [hl + 0.4, 0]]); P.lean = P.sr * 0.25;
    } else if (id === 'blood_tax') {
      P.sa = -0.05; P.sr = kf(T, [[0, 0], [h0 - 0.18, -0.5], [h0, 0.8], [h0 + 0.6, 0]]); P.twist = bump((T - h0 + 0.45) / 0.7); P.sglow = Math.max(P.sglow, ease(T / h0)); P.lean = P.sr * 0.25;
    } else if (id === 'bloodflame_talons') {
      P.la = kf(T, [[0, 0.9], [0.4, 1.5], [0.6, -0.7], [1.2, -0.5], [1.6, 0.9]]); P.lh = kf(T, [[0, 0], [0.45, 0.4], [0.6, 1], [1.3, 0.3], [1.6, 0]]); P.lglow = bump(T / 0.75);
      P.claw = T > 0.55 && T < h0 + 0.05 ? cl((T - 0.55) / 0.08) : 0;
    } else if (id === 'bloodboon_arc' || id === 'bloodboon_cone') {
      P.la = kf(T, [[0, 1.0], [h0 - 0.35, 1.7], [h0, id === 'bloodboon_cone' ? 0 : -0.4], [h0 + 0.7, 0.8]]); P.lh = kf(T, [[0, 0], [h0 - 0.3, 0.1], [h0, 1], [h0 + 0.7, 0]]); P.lglow = ease(T / h0) * (1 - ease((T - h0) / 0.4));
    } else if (id === 'bloodboon_shower') {
      P.lup = bump(T / (hl + 0.3)); P.lglow = P.lup; P.la = 0.2;
    } else if (id === 'spear_slam') {
      P.lift = kf(T, [[0, 0], [h0 - 0.25, 1], [h0, 0]]); P.sa = 0; P.sr = kf(T, [[h0 - 0.05, 0], [h0, 0.45], [h[1] + 0.4, 0]]); P.sglow = Math.max(P.sglow, bump((T - h0) / (h[1] - h0 + 0.2)));
    } else if (id === 'rising_slash') {
      P.sa = kf(T, [[0, 0.3], [h0 - 0.2, 0.7], [h0, -0.1]]); P.lift = kf(T, [[h0 - 0.05, 0], [h0, 0.85], [hl - 0.2, 1], [hl, 0]]); P.sr = kf(T, [[hl - 0.05, 0], [hl, 0.45], [hl + 0.5, 0]]); P.lean = 0.2 * bump((T - h0) / (hl - h0 + 0.3));
    } else if (id === 'bloodflame_charge') {
      P.sa = 0; P.sr = kf(T, [[0, 0], [0.55, -0.3], [0.7, 0.7], [1.3, 0.2]]); P.lean = 0.25 * bump(T / 1.3); P.wing = 0.3; P.sglow = 1; P.flap = 0.1;
    } else if (id === 'bloodflame_swing') {
      P.sa = kf(T, [[0, -0.35], [h0 - 0.3, 1.7], [h0, -1.8], [h0 + 0.6, -1.5], [h0 + 1, -0.35]]); P.sglow = 1; P.lean = 0.12 * bump(T / (h0 + 0.8));
    } else if (id === 'winged_assault' || id === 'plunge') {
      P.wing = 1; P.flap = 1.2; P.lift = 0.4; P.lean = -0.1;
    } else if (id === 'ult') {
      if (o.phase === 2) {
        P.wing = 1; P.flap = 0.7; P.halo = cl(T / 0.6) * (1 - ease((T - 4.2) / 0.4)); P.sglow = 1;
        P.lift = Math.max(...I.nihil.map(n => bump((T - n + 0.35) / 0.6)), kf(T, [[4.1, 0], [4.55, 1], [4.7, 0]])); P.lglow = Math.max(...I.curse.map(c => bump((T - c + 0.2) / 0.4)), 0); P.la = 1.3; P.lh = P.lglow * 0.6;
      } else {
        P.lift = Math.max(kf(T, [[0, 0], [0.5, 1], [1.5, 1], [1.62, 0]]), kf(T, [[3.5, 0], [3.95, 1], [4.1, 0]])); P.sglow = 1; P.halo = 0.5 * cl(T / 1) * (1 - ease((T - 1.6) / 0.3)); P.sr = kf(T, [[4.05, 0], [4.1, 0.45], [4.6, 0]]);
      }
    }
    return P;
  }
  // ── 部位 ──
  function robe(g, r, p2, shadow) {
    R.blit(g, 'mohg:robe:' + r + ':' + p2 + ':' + shadow, r * 2.6, r * 2.4, r * 1.35, r * 1.2, c => {
      const bell = () => { c.beginPath(); c.moveTo(r * 0.75, 0); c.bezierCurveTo(r * 0.78, r * 0.72, r * 0.05, r * 1.02, -r * 0.6, r * 0.86); c.bezierCurveTo(-r * 1.25, r * 0.6, -r * 1.25, -r * 0.6, -r * 0.6, -r * 0.86); c.bezierCurveTo(r * 0.05, -r * 1.02, r * 0.78, -r * 0.72, r * 0.75, 0); c.closePath(); };
      if (shadow) { c.fillStyle = '#000'; bell(); c.fill(); return; }
      const gr = c.createRadialGradient(r * 0.1, 0, r * 0.1, -r * 0.1, 0, r * 1.15); gr.addColorStop(0, ROBE2); gr.addColorStop(0.7, ROBE); gr.addColorStop(1, '#050305');
      c.fillStyle = gr; bell(); c.fill();
      c.strokeStyle = 'rgba(184,18,42,0.55)'; c.lineWidth = r * 0.05; c.stroke(); // 袍緣透出紅色襯裡
      c.strokeStyle = 'rgba(80,50,60,0.35)'; c.lineWidth = r * 0.02; // 袍褶
      for (let i = 0; i < 9; i++) { const a = Math.PI * (0.62 + i * 0.095); c.beginPath(); c.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.4); c.lineTo(Math.cos(a) * r * 1.05, Math.sin(a) * r * 0.86); c.stroke(); c.beginPath(); c.moveTo(Math.cos(a) * r * 0.3, -Math.sin(a) * r * 0.4); c.lineTo(Math.cos(a) * r * 1.05, -Math.sin(a) * r * 0.86); c.stroke(); }
      // 背後太陽狀金繡
      c.save(); c.translate(-r * 0.6, 0); c.strokeStyle = GOLD; c.lineWidth = r * 0.025;
      c.beginPath(); c.arc(0, 0, r * 0.17, 0, TAU); c.stroke(); c.fillStyle = 'rgba(216,162,58,0.25)'; c.fill();
      c.globalAlpha = 0.7; for (let i = 0; i < 16; i++) { const a = i * TAU / 16, l = r * (i % 2 ? 0.27 : 0.34); c.beginPath(); c.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2); c.lineTo(Math.cos(a) * l, Math.sin(a) * l); c.stroke(); }
      c.beginPath(); c.arc(0, 0, r * 0.07, 0, TAU); c.fillStyle = GOLD2; c.fill(); c.globalAlpha = 1; c.restore();
      // 胸前兩條金繡長領帶：從頸部往前垂到袍前緣
      for (const s of [-1, 1]) {
        c.save(); c.translate(r * 0.12, s * r * 0.26); c.rotate(s * 0.16);
        const L = r * 0.66, W = r * 0.2; c.fillStyle = '#3a2410'; c.fillRect(0, -W / 2, L, W);
        const gg = c.createLinearGradient(0, -W / 2, 0, W / 2); gg.addColorStop(0, GOLDD); gg.addColorStop(0.5, GOLD2); gg.addColorStop(1, GOLDD); c.fillStyle = gg; c.globalAlpha = 0.85; c.fillRect(0, -W * 0.4, L, W * 0.8); c.globalAlpha = 1;
        c.strokeStyle = '#2a1608'; c.lineWidth = r * 0.012; for (let k = 1; k < 7; k++) { const x = L * k / 7; c.beginPath(); c.moveTo(x - W * 0.25, -W * 0.35); c.quadraticCurveTo(x + W * 0.1, 0, x - W * 0.25, W * 0.35); c.stroke(); }
        c.fillStyle = '#9a0a1c'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(L * (0.25 + k * 0.25), 0, W * 0.12, 0, TAU); c.fill(); } // 紅寶石
        c.restore();
      }
      c.strokeStyle = GOLD; c.lineWidth = r * 0.012; c.beginPath(); c.moveTo(r * 0.28, -r * 0.16); c.quadraticCurveTo(r * 0.42, 0, r * 0.28, r * 0.16); c.stroke(); // 胸前金鏈
    });
  }
  function pauldron(g, r, shadow) { // 左肩（-y）教堂造型聖物匣肩甲＋垂在後方的黑紗
    R.blit(g, 'mohg:pauldron:' + r + ':' + shadow, r * 1.3, r * 1.1, r * 0.75, r * 0.45, c => {
      if (shadow) { c.fillStyle = '#000'; c.beginPath(); c.ellipse(0, 0, r * 0.38, r * 0.3, 0, 0, TAU); c.fill(); return; }
      c.fillStyle = 'rgba(10,6,10,0.85)'; c.beginPath(); c.moveTo(-r * 0.1, -r * 0.2); c.quadraticCurveTo(-r * 0.75, -r * 0.35, -r * 0.7, r * 0.15); c.quadraticCurveTo(-r * 0.4, r * 0.3, -r * 0.05, r * 0.18); c.fill(); // 黑紗
      c.strokeStyle = 'rgba(70,60,70,0.6)'; c.lineWidth = r * 0.012; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-r * 0.1, -r * 0.12 + i * r * 0.06); c.quadraticCurveTo(-r * 0.45, -r * 0.2 + i * r * 0.1, -r * 0.68, -r * 0.2 + i * r * 0.08); c.stroke(); }
      const gr = c.createLinearGradient(0, -r * 0.3, 0, r * 0.3); gr.addColorStop(0, GOLD2); gr.addColorStop(0.5, GOLD); gr.addColorStop(1, GOLDD);
      c.fillStyle = gr; c.beginPath(); c.moveTo(-r * 0.32, -r * 0.24); c.lineTo(r * 0.3, -r * 0.24); c.quadraticCurveTo(r * 0.42, 0, r * 0.3, r * 0.24); c.lineTo(-r * 0.32, r * 0.24); c.quadraticCurveTo(-r * 0.42, 0, -r * 0.32, -r * 0.24); c.fill();
      c.strokeStyle = '#4a300c'; c.lineWidth = r * 0.02; c.stroke();
      c.lineWidth = r * 0.016; for (let i = -2; i <= 2; i++) { const x = i * r * 0.12; c.beginPath(); c.moveTo(x - r * 0.05, r * 0.2); c.lineTo(x - r * 0.05, -r * 0.06); c.arc(x, -r * 0.06, r * 0.05, Math.PI, 0); c.lineTo(x + r * 0.05, r * 0.2); c.stroke(); } // 一排拱窗
      c.fillStyle = '#8a0a1a'; c.beginPath(); c.arc(0, -r * 0.15, r * 0.045, 0, TAU); c.fill();
      c.fillStyle = GOLD2; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(-r * 0.3 + i * r * 0.075, r * 0.26, r * 0.018, 0, TAU); c.fill(); } // 流蘇
    });
  }
  function horns(g, r, shadow) { // 滿頭黑色捲角：一圈螺旋捲角堆成比肩還寬的頭冠（mg-ref-107／058）
    R.blit(g, 'mohg:horns:' + r + ':' + shadow, r * 1.7, r * 1.7, r * 0.85, r * 0.85, c => {
      if (shadow) { c.fillStyle = '#000'; c.beginPath(); c.arc(0, 0, r * 0.48, 0, TAU); c.fill(); return; }
      c.fillStyle = '#0b090c'; c.beginPath(); c.arc(0, 0, r * 0.34, 0, TAU); c.fill();
      const curls = [[0.22, 0, 0.15], [0.08, 0.3, 0.16], [0.08, -0.3, 0.16], [-0.18, 0.27, 0.17], [-0.18, -0.27, 0.17], [-0.33, 0, 0.16], [0.3, 0.22, 0.12], [0.3, -0.22, 0.12], [-0.04, 0.12, 0.13], [-0.04, -0.12, 0.13]];
      for (const [x, y, sz] of curls) {
        c.save(); c.translate(x * r, y * r); c.rotate(x * 7 + y * 5);
        c.lineCap = 'round'; c.strokeStyle = HORN; c.lineWidth = sz * r * 0.6; c.beginPath();
        for (let k = 0; k <= 28; k++) { const u = k / 28, a = u * TAU * 1.4, rr = sz * r * (1 - u * 0.8); const px = Math.cos(a) * rr, py = Math.sin(a) * rr; k ? c.lineTo(px, py) : c.moveTo(px, py); }
        c.stroke(); c.strokeStyle = HORN2; c.lineWidth = sz * r * 0.12; c.stroke();
        c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = sz * r * 0.05; for (let k = 2; k < 26; k += 3) { const u = k / 28, a = u * TAU * 1.4, rr = sz * r * (1 - u * 0.8); c.beginPath(); c.moveTo(Math.cos(a) * rr * 0.75, Math.sin(a) * rr * 0.75); c.lineTo(Math.cos(a) * rr * 1.2, Math.sin(a) * rr * 1.2); c.stroke(); } // 角上的環紋
        c.restore();
      }
      for (const s of [-1, 1]) { c.strokeStyle = HORN; c.lineWidth = r * 0.08; c.lineCap = 'round'; c.beginPath(); c.moveTo(r * 0.15, s * r * 0.28); c.quadraticCurveTo(r * 0.58, s * r * 0.5, r * 0.46, s * r * 0.72); c.stroke(); c.strokeStyle = HORN2; c.lineWidth = r * 0.02; c.stroke(); } // 向外撐的兩支大角
    });
  }
  function spear(g, r, p2, shadow) { // 三叉戟精靈：握把在原點，戟尖朝 +x
    const L = r * 2.7, back = L * 0.38;
    R.blit(g, 'mohg:spear:' + r + ':' + p2 + ':' + shadow, L + r * 0.4, r * 0.7, back + r * 0.1, r * 0.35, c => {
      if (shadow) { c.strokeStyle = '#000'; c.lineWidth = r * 0.07; c.beginPath(); c.moveTo(-back, 0); c.lineTo(L - back, 0); c.stroke(); return; }
      c.lineCap = 'round'; c.strokeStyle = '#1a1208'; c.lineWidth = r * 0.07; c.beginPath(); c.moveTo(-back, 0); c.lineTo(L - back - r * 0.5, 0); c.stroke();
      c.strokeStyle = p2 ? '#5a2a14' : GOLD; c.lineWidth = r * 0.045; c.stroke();
      c.strokeStyle = p2 ? '#a0402a' : GOLD2; c.lineWidth = r * 0.018; for (let x = -back; x < L - back - r * 0.6; x += r * 0.1) { c.beginPath(); c.moveTo(x, -r * 0.03); c.lineTo(x + r * 0.06, r * 0.03); c.stroke(); } // 螺旋紋
      const hx = L - back - r * 0.55; // 戟頭：金環護手＋三支黑色鋸齒尖
      c.strokeStyle = GOLD; c.lineWidth = r * 0.035; c.beginPath(); c.ellipse(hx, 0, r * 0.06, r * 0.2, 0, 0, TAU); c.stroke(); c.strokeStyle = GOLD2; c.lineWidth = r * 0.012; c.stroke();
      for (const s of [-1, 0, 1]) {
        const y0 = s * r * 0.13, len = r * (s ? 0.5 : 0.62); c.fillStyle = '#0c0a0e'; c.beginPath(); c.moveTo(hx, y0 - r * 0.03); c.lineTo(hx + len, y0 + s * r * 0.02); c.lineTo(hx, y0 + r * 0.03); c.closePath(); c.fill();
        c.fillStyle = '#2a2630'; for (let k = 1; k < 4; k++) { const x = hx + len * k / 4.5; c.beginPath(); c.moveTo(x, y0 - r * 0.025); c.lineTo(x + r * 0.05, y0 - r * 0.06); c.lineTo(x + r * 0.04, y0 - r * 0.015); c.fill(); }
      }
      c.fillStyle = GOLD; c.beginPath(); c.arc(-back, 0, r * 0.05, 0, TAU); c.fill();
    });
    return { L, back };
  }
  function flameLick(g, x, y, s, t, seed) { // 一簇血焰火舌（確定性搖曳）
    const fl = 0.6 + 0.4 * Math.sin(t * 15 + seed * 3.1), h = s * (1.2 + 0.8 * fl);
    g.fillStyle = 'rgba(224,20,46,' + (0.55 * fl + 0.25) + ')'; g.beginPath(); g.moveTo(x - s * 0.5, y); g.quadraticCurveTo(x - s * 0.2, y - h * 0.6, x + Math.sin(t * 9 + seed) * s * 0.3, y - h); g.quadraticCurveTo(x + s * 0.3, y - h * 0.5, x + s * 0.5, y); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,190,140,' + 0.5 * fl + ')'; g.beginPath(); g.ellipse(x, y - h * 0.25, s * 0.18, h * 0.25, 0, 0, TAU); g.fill();
  }
  function wing(g, r, s, open, flap, t, shadow, grow) { // 破碎黑羽翼：往兩側展開、羽片往後垂，翼關節帶爪（mg-ref-108）；grow 用縮放（不換快取 key）
    g.save(); g.translate(-r * 0.2, s * r * 0.42); g.scale(grow, s * grow); g.rotate(Math.PI / 2 + 0.5 - open * 0.65 + Math.sin(t * 5 * flap + 1) * 0.12 * flap);
    const LL = r * 3.4, WW = r * 1.5;
    R.blit(g, 'mohg:wing:' + r + ':' + shadow, LL * 1.25, WW * 2.2, r * 0.3, WW * 0.6, c => {
      const col = k => (shadow ? '#000' : k);
      c.fillStyle = col('#120e14'); c.beginPath(); c.moveTo(0, -r * 0.08); // 翼膜底：沿翼骨，後緣破碎參差
      c.quadraticCurveTo(LL * 0.25, -WW * 0.36, LL * 0.45, -WW * 0.2); c.quadraticCurveTo(LL * 0.75, -WW * 0.12, LL, WW * 0.1);
      for (let i = 0; i <= 14; i++) { const u = 1 - i / 14, x = LL * (0.04 + 0.94 * u), y = WW * (0.3 + 0.8 * Math.sin(Math.PI * Math.min(1, u * 1.12))) * (i % 2 ? 0.8 : 1); c.lineTo(x, y); }
      c.lineTo(0, r * 0.16); c.closePath(); c.fill();
      for (let layer = 0; layer < 3; layer++) { // 三層羽片：外層最長最暗，內層較短較灰
        const n = 16 - layer * 4, tone = ['#0a080c', '#1a161e', '#2a242e'][layer];
        for (let i = 0; i < n; i++) {
          const u = (i + 0.5) / n, bx = LL * (0.04 + 0.9 * u) * (1 - layer * 0.1), by = -WW * 0.22 * Math.sin(Math.PI * u) + layer * WW * 0.1, a = 1.4 - 0.9 * u;
          const fl = WW * (0.5 + 0.65 * Math.sin(Math.PI * Math.min(1, u * 1.1))) * (1 - layer * 0.28) * (0.85 + 0.15 * ((i * 7) % 3) / 2), fw = r * (0.16 - layer * 0.03);
          const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca, tx = bx + ca * fl, ty = by + sa * fl;
          c.fillStyle = col(tone); c.beginPath(); c.moveTo(bx + nx * fw * 0.3, by + ny * fw * 0.3);
          c.quadraticCurveTo(bx + ca * fl * 0.5 + nx * fw, by + sa * fl * 0.5 + ny * fw, tx + nx * fw * 0.3, ty + ny * fw * 0.3);
          c.lineTo(tx - ca * fw * 0.5, ty - sa * fw * 0.5); c.lineTo(tx - nx * fw * 0.35, ty - ny * fw * 0.35); // 破缺的羽尖
          c.quadraticCurveTo(bx + ca * fl * 0.5 - nx * fw * 0.8, by + sa * fl * 0.5 - ny * fw * 0.8, bx - nx * fw * 0.3, by - ny * fw * 0.3); c.closePath(); c.fill();
          if (!shadow) { c.strokeStyle = 'rgba(120,108,130,0.35)'; c.lineWidth = r * 0.012; c.beginPath(); c.moveTo(bx, by); c.lineTo(tx - ca * fw * 0.4, ty - sa * fw * 0.4); c.stroke(); }
        }
      }
      c.strokeStyle = col('#0e0a10'); c.lineWidth = r * 0.13; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(LL * 0.25, -WW * 0.36, LL * 0.45, -WW * 0.2); c.quadraticCurveTo(LL * 0.75, -WW * 0.12, LL * 0.98, WW * 0.06); c.stroke(); // 翼骨
      if (!shadow) { c.strokeStyle = 'rgba(90,80,100,0.5)'; c.lineWidth = r * 0.03; c.stroke(); }
      c.save(); c.translate(LL * 0.45, -WW * 0.2); c.strokeStyle = col('#2e2834'); c.lineWidth = r * 0.05; // 翼關節的爪
      for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(r * 0.1 + k * r * 0.1, -r * 0.25, k * r * 0.14 + r * 0.02, -r * 0.4); c.stroke(); } c.restore();
    });
    g.restore();
  }
  function hand(g, r, x, y, a, shadow, glow, t) { // 黑色爪手配金手環
    g.save(); g.translate(x, y); g.rotate(a);
    if (shadow) { g.fillStyle = '#000'; g.beginPath(); g.arc(0, 0, r * 0.12, 0, TAU); g.fill(); g.restore(); return; }
    g.fillStyle = GOLD; g.beginPath(); g.ellipse(-r * 0.1, 0, r * 0.04, r * 0.1, 0, 0, TAU); g.fill();
    g.fillStyle = CLAW; g.beginPath(); g.ellipse(0, 0, r * 0.1, r * 0.09, 0, 0, TAU); g.fill();
    g.strokeStyle = CLAW; g.lineWidth = r * 0.035; g.lineCap = 'round'; for (let f = -2; f <= 2; f++) { const fa = f * 0.32; g.beginPath(); g.moveTo(r * 0.05, f * r * 0.025); g.quadraticCurveTo(r * 0.16, f * r * 0.06, Math.cos(fa) * r * 0.24, Math.sin(fa) * r * 0.24); g.stroke(); }
    if (glow > 0.02) { g.globalCompositeOperation = 'lighter'; const rr = r * (0.2 + 0.35 * glow) * (0.9 + 0.1 * Math.sin(t * 20)); const gr = g.createRadialGradient(r * 0.1, 0, 0, r * 0.1, 0, rr); gr.addColorStop(0, 'rgba(255,220,200,' + glow + ')'); gr.addColorStop(0.4, 'rgba(224,20,46,' + 0.7 * glow + ')'); gr.addColorStop(1, 'rgba(120,0,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(r * 0.1, 0, rr, 0, TAU); g.fill(); }
    g.restore();
  }
  function sleeve(g, r, sx, sy, hx, hy, shadow) {
    g.lineCap = 'round'; g.strokeStyle = shadow ? '#000' : '#1a1218'; g.lineWidth = r * 0.24; g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo((sx + hx) / 2 - r * 0.05, (sy + hy) / 2 + Math.sign(sy) * r * 0.12, hx, hy); g.stroke();
    if (!shadow) { g.strokeStyle = 'rgba(184,18,42,0.35)'; g.lineWidth = r * 0.04; g.stroke(); }
  }
  function mohg(g, o, t, r, P, shadow, wingK) {
    const p2 = o.phase === 2;
    g.save(); g.translate(P.lean * r, 0);
    const wk = wingK == null ? (p2 ? 1 : 0) : wingK;
    if (wk > 0.01) for (const s of [-1, 1]) wing(g, r, s, P.wing, P.flap, t, shadow, 0.4 + 0.6 * wk);
    // 紅色頸巾的兩條飄帶（往後飄）
    if (!shadow) { g.strokeStyle = RED; g.lineCap = 'round'; for (const s of [-1, 1]) { g.lineWidth = r * 0.1; g.beginPath(); g.moveTo(r * 0.05, s * r * 0.22); for (let k = 1; k <= 6; k++) { const u = k / 6; g.lineTo(-r * (0.1 + u * 0.95), s * r * (0.3 + u * 0.15) + Math.sin(t * 4 - u * 4 + s) * r * 0.07 * u); } g.stroke(); g.lineWidth = r * 0.03; g.strokeStyle = '#ff4a5a'; g.stroke(); g.strokeStyle = RED; } }
    robe(g, r, p2, shadow);
    // 右手（+y）持聖槍
    const sa = P.sa, lift = P.lift, hx = r * (0.5 + P.sr * 0.6 - lift * 0.2), hy = r * (0.6 - Math.max(0, -sa) * 0.15);
    sleeve(g, r, r * 0.02, r * 0.5, hx, hy, shadow);
    g.save(); g.translate(hx, hy); g.rotate(sa - 0.15 + P.twist * Math.sin(t * 30) * 0.08); g.scale(1 - lift * 0.55, 1);
    const S = spear(g, r, p2, shadow);
    if (!shadow && (P.sglow > 0.05 || P.twist > 0)) { // 聖槍血焰：沿戟身竄動的火舌，戟頭最旺
      g.save(); g.globalCompositeOperation = 'lighter'; const n = 9, k = Math.max(P.sglow, P.twist);
      for (let i = 0; i < n; i++) { const x = -S.back * 0.3 + (S.L - S.back) * i / (n - 1); g.save(); g.translate(x, 0); g.rotate(-Math.PI / 2 + Math.sin(t * 6 + i) * 0.3 - 0.4); flameLick(g, 0, 0, r * (0.07 + 0.08 * k * (i / n)), t, i); g.restore(); }
      if (P.twist > 0) for (let i = 0; i < 10; i++) { const u = i / 10, x = (S.L - S.back) * u, ph = t * 22 + u * 12; g.fillStyle = 'rgba(255,90,60,' + 0.7 * P.twist + ')'; g.beginPath(); g.arc(x, Math.sin(ph) * r * 0.12, r * 0.04, 0, TAU); g.fill(); }
      g.restore();
    }
    g.restore();
    hand(g, r, hx, hy, sa, shadow, 0, t);
    // 左手（-y）：血之恩賜 / 猛禽爪
    const la = P.la, lr = r * (0.55 + P.lh * 0.6 - P.lup * 0.2), lx = r * 0.05 + Math.cos(-la) * lr * 0.9, ly = -r * 0.45 + Math.sin(-la) * lr * 0.55 - P.lup * r * 0.1;
    sleeve(g, r, r * 0.02, -r * 0.48, lx, ly, shadow);
    hand(g, r, lx, ly, -la * 0.6, shadow, P.lglow, t);
    g.save(); g.translate(r * 0.0, -r * 0.48); pauldron(g, r, shadow); g.restore();
    if (!shadow) { g.strokeStyle = RED; g.lineWidth = r * 0.14; g.beginPath(); g.arc(r * 0.14, 0, r * 0.4, Math.PI * 0.4, Math.PI * 1.6); g.stroke(); g.strokeStyle = '#ff4a5a'; g.lineWidth = r * 0.03; g.stroke(); } // 紅色頸巾
    g.save(); g.translate(r * 0.18, 0); horns(g, r, shadow);
    if (!shadow) { const e = 0.5 + 0.5 * Math.sin(t * 3); g.fillStyle = 'rgba(255,60,60,' + (0.5 + 0.4 * e) + ')'; for (const s of [-1, 1]) { g.beginPath(); g.arc(r * 0.25, s * r * 0.07, r * 0.025, 0, TAU); g.fill(); } }
    g.restore();
    g.restore();
  }
  function shadowOf(g, o, t, r, P, h, wk) { g.save(); g.globalAlpha *= Math.max(0.12, 0.3 - h / 1500); g.translate(h * 0.15, h * 0.2); mohg(g, o, t, r, P, true, wk); g.restore(); }
  function wingAmt(o) { // 轉階段尾聲黑羽撕裂展開；之後常駐
    if (o.state === 'transition' && o.phase === 1) return ease(((o.stateT || 0) - 2.4) / 0.5);
    return o.phase === 2 ? 1 : 0;
  }
  // 血日／天上的旋轉血環（mg-ref-021／028／044／079：儀式時頭頂浮現多層血色漩渦）
  function bloodSun(g, x, y, r, k, t) {
    if (k <= 0.01) return;
    g.save(); g.translate(x, y); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.6 * k); gr.addColorStop(0, 'rgba(255,230,220,' + 0.9 * k + ')'); gr.addColorStop(0.2, 'rgba(255,40,60,' + 0.7 * k + ')'); gr.addColorStop(1, 'rgba(120,0,20,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 1.6 * k, 0, TAU); g.fill();
    for (let i = 0; i < 4; i++) { const rr = r * k * (0.5 + i * 0.28), a = t * (1.2 - i * 0.25) * (i % 2 ? -1 : 1); g.strokeStyle = 'rgba(255,' + (60 + i * 30) + ',' + (70 + i * 20) + ',' + (0.75 - i * 0.12) * k + ')'; g.lineWidth = r * 0.05; g.beginPath(); g.ellipse(0, 0, rr, rr * 0.42, 0, a, a + 4.6); g.stroke(); }
    g.strokeStyle = 'rgba(255,80,90,' + 0.5 * k + ')'; g.lineWidth = r * 0.025; for (let i = 0; i < 18; i++) { const a = i * TAU / 18 + t * 0.6; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.35 * k, Math.sin(a) * r * 0.15 * k); g.lineTo(Math.cos(a) * r * 1.25 * k, Math.sin(a) * r * 0.52 * k); g.stroke(); }
    for (let i = 0; i < 10; i++) { const ph = (t * 1.3 + i * 0.37) % 1, a = i * 2.3; g.fillStyle = 'rgba(224,20,46,' + 0.8 * k * (1 - ph) + ')'; g.fillRect(Math.cos(a) * r * 0.6 * k, ph * r * 2.8, r * 0.025, r * 0.12); } // 灑下的血雨
    g.restore();
  }
  function curseRing(g, e, n, t) { // 咒印者腳下旋轉的紅色符文圈＋頭頂的咒印數
    const r = (e.r || 30) * 1.6; g.save(); g.translate(e.x, e.y);
    g.strokeStyle = 'rgba(255,40,60,0.75)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
    g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, r * 0.82, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(255,90,100,0.85)'; for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + t * 0.8; g.save(); g.rotate(a); g.translate(r * 0.91, 0); g.fillRect(-2, -5, 4, 10); g.fillRect(-5, -1, 10, 2); g.restore(); }
    for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 14, y = -(e.r || 30) - 26 + Math.sin(t * 4 + i) * 2; g.fillStyle = '#ff2a40'; g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 5, y); g.lineTo(x, y + 7); g.lineTo(x - 5, y); g.closePath(); g.fill(); g.strokeStyle = '#ffd0d0'; g.lineWidth = 1; g.stroke(); }
    g.restore();
  }
  R.defineBossStyle('mohg', {
    body(g, b, t, k) {
      const portrait = !b.world && g.canvas && g.canvas.width <= 256, P = pose(b, t, k.st), wk = wingAmt(b);
      if (portrait) { g.translate(k.r * 0.2, 0); g.scale(0.55, 0.55); }
      const hover = wk > 0 ? (Math.sin(t * 2.2) * 0.5 + 0.5) * k.r * 0.08 * wk : 0;
      shadowOf(g, b, t, k.r, P, hover + k.r * 0.12, wk);
      if (P.claw > 0 && !portrait) { // 鮮血猛禽爪：三道懸空的血焰爪痕，等爆炸
        g.save(); g.globalCompositeOperation = 'lighter'; const len = 340 * (b.sizeMul || 1);
        for (const ao of [-0.3, 0, 0.3]) { g.save(); g.rotate(ao); const fl = 0.75 + 0.25 * Math.sin(t * 30 + ao * 9);
          g.strokeStyle = 'rgba(224,20,46,' + 0.55 * P.claw * fl + ')'; g.lineWidth = 18; g.beginPath(); g.moveTo(k.r * 0.5, 0); g.quadraticCurveTo(len * 0.5, ao * 40, len, 0); g.stroke();
          g.strokeStyle = 'rgba(255,220,200,' + 0.9 * P.claw * fl + ')'; g.lineWidth = 4; g.stroke(); g.restore(); }
        g.restore();
      }
      g.save(); g.translate(0, -hover); mohg(g, b, t, k.r, P, false, wk); g.restore();
    },
    under(g, b, t) { // 腳下血泊（他總是站在一灘血裡）；交感儀式時泛起黑色波紋
      if (b.state === 'dead') return;
      const r = b.r; g.save(); g.translate(b.x, b.y);
      g.fillStyle = 'rgba(80,0,12,0.4)'; g.beginPath(); g.ellipse(0, 0, r * 1.3, r * 1.1, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(150,10,30,0.35)'; g.lineWidth = 2; const ph = (t * 0.4) % 1; g.beginPath(); g.ellipse(0, 0, r * (1 + ph * 0.5), r * (0.85 + ph * 0.45), 0, 0, TAU); g.stroke();
      if (b.inst && b.inst.skill.id === 'ult' && b.phase === 1 && b.inst.t < 1.7) { for (let i = 0; i < 4; i++) { const q = ((b.inst.t * 0.9 + i * 0.25) % 1); g.strokeStyle = 'rgba(0,0,0,' + 0.6 * (1 - q) + ')'; g.lineWidth = 10 * (1 - q) + 2; g.beginPath(); g.arc(0, 0, r * (0.8 + q * 4), 0, TAU); g.stroke(); } }
      g.restore();
    },
    over(g, b, t) {
      const w = b.world; if (!w) return;
      for (const e of w.enemiesOf(b.team)) { if (e.state === 'dead') continue; const st = BD.getStatus(e, 'bloodcurse'); if (st && (st.source === b || !st.source)) curseRing(g, e, Math.round(st.stacks), t); }
      if (b.state === 'dead') return;
      const P = pose(b, t, b.state); if (P.halo > 0.01) bloodSun(g, b.x, b.y - b.r * 3.4, b.r * 1.3, P.halo, t);
    },
    hidden(g, b, t) { // 翼擊 / 墜擊：展開黑羽飛上半空，沿弧線撲向落點
      if (!b.inst) return;
      const I = info(b.inst), T = b.inst.t, land = I.land.find(a => a.at > T), hide = I.hide.filter(a => a.at <= T).pop();
      if (!land || !hide) return;
      const mark = b.inst.marks[land.mark] || b.enemy || b, p = cl((T - hide.at) / (land.at - hide.at)), q = ease(p);
      const x = U.lerp(b.x, mark.x, q), y = U.lerp(b.y, mark.y, q), h = Math.sin(p * Math.PI) * b.r * (b.inst.skill.id === 'plunge' ? 3 : 4.5), sc = 1 + Math.sin(p * Math.PI) * 0.35;
      g.save(); g.translate(x, y); g.globalAlpha *= 0.3; g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, 0, b.r * 0.9 * (1.3 - p * 0.3), b.r * 0.5, 0, 0, TAU); g.fill(); g.restore();
      const P = { sa: p > 0.75 ? 0 : -0.6, sr: p > 0.75 ? 0.6 : 0, lift: p > 0.75 ? 0 : 0.3, sglow: 1, la: 1.2, lh: 0.2, lup: 0, lglow: 0.6, lean: 0, wing: p > 0.8 ? 0.5 : 1, flap: 1.4, claw: 0, twist: 0, halo: 0 };
      g.save(); g.translate(x, y - h); g.rotate(Math.atan2(mark.y - b.y, mark.x - b.x)); g.scale(sc, sc); mohg(g, b, t, b.r, P, false, 1); g.restore();
    },
  });
  // 拋射物：從天落下的血焰團（翼擊、血雨、大招）
  R.lobStyles = R.lobStyles || {};
  R.lobStyles.bloodflame = (g, l, x, y, k, t) => {
    g.save(); g.translate(x, y); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(224,20,46,0.5)'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-26, -90); g.stroke();
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 22); gr.addColorStop(0, 'rgba(255,230,210,1)'); gr.addColorStop(0.35, 'rgba(255,60,50,0.9)'); gr.addColorStop(1, 'rgba(120,0,20,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill(); g.restore();
  };
  // 血焰池：暗紅血泊、表面浮著猩紅火舌（由 js/render/world.js 的 R.zoneStyles 掛勾呼叫）
  R.zoneStyles = R.zoneStyles || {};
  R.zoneStyles.bloodflame = (g, z, t) => {
    g.save(); g.translate(z.x, z.y);
    R.blit(g, 'zone:bloodflame:' + z.r, z.r * 2 + 8, z.r * 2 + 8, z.r + 4, z.r + 4, c => {
      const blob = (k) => { c.beginPath(); for (let i = 0; i <= 16; i++) { const a = i * TAU / 16, rr = z.r * k * (0.84 + 0.16 * ((i * 7) % 3) / 2); i ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); };
      const gr = c.createRadialGradient(0, 0, 2, 0, 0, z.r); gr.addColorStop(0, 'rgba(210,20,40,0.8)'); gr.addColorStop(0.6, 'rgba(140,4,22,0.72)'); gr.addColorStop(1, 'rgba(70,0,10,0.5)');
      c.fillStyle = gr; blob(1); c.fill(); c.strokeStyle = 'rgba(255,70,80,0.75)'; c.lineWidth = 3; c.stroke();
      c.fillStyle = 'rgba(255,170,150,0.35)'; for (let i = 0; i < 5; i++) { const a = i * 2.3, d = z.r * 0.45 * ((i * 3) % 4) / 3; c.beginPath(); c.ellipse(Math.cos(a) * d, Math.sin(a) * d, z.r * 0.14, z.r * 0.06, a, 0, TAU); c.fill(); } // 血泊反光
    });
    g.globalCompositeOperation = 'lighter';
    const gl = 0.55 + 0.25 * Math.sin(t * 7 + z.seed), gg = g.createRadialGradient(0, 0, 0, 0, 0, z.r * 1.2); gg.addColorStop(0, 'rgba(255,60,50,' + 0.35 * gl + ')'); gg.addColorStop(1, 'rgba(200,0,20,0)');
    g.fillStyle = gg; g.beginPath(); g.arc(0, 0, z.r * 1.2, 0, TAU); g.fill();
    for (let i = 0; i < 9; i++) { const a = i * 2.4 + z.seed, rr = z.r * (0.15 + 0.7 * ((i * 37 % 10) / 10)); flameLick(g, Math.cos(a) * rr, Math.sin(a) * rr, z.r * 0.28, t, i + z.seed); }
    g.restore();
  };
})(typeof window !== 'undefined' ? window : globalThis);
