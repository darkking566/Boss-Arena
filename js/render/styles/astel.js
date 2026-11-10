'use strict';
// 自繪黑暗棄子・艾絲緹（俯視）。依已查看的官方畫作與遊戲畫面：骷髏顱骨帶裂縫藍眼、兩支黑色彎鉗、頸後白毛、六條細長骨臂配人手、
// 兩對蜻蜓狀透明翅膜、一串彩色星屑球捲成的蠍尾。姿勢讀實際時間軸；靜態材質以 R.blit 快取，亂數只用 BD.vrng 或確定性公式。
(function (G) {
  const BD = G.BD, R = BD.Render, U = BD.U, TAU = U.TAU;
  const BONE = '#d4dbee', BONE2 = '#8a93b4', INK = '#10112a', VIO = '#b9a2ff', BLUE = '#6fb4ff', CORE = '#fff2ff';
  const STARS = ['#6fb4ff', '#e06cff', '#ffb45a', '#7dffd0', '#b9a2ff', '#8fa8ff'];
  const cl = v => U.clamp(v, 0, 1), ease = v => { v = cl(v); return v * v * (3 - 2 * v); };
  const CACHE = new WeakMap();
  function info(inst) { // 每個技能的判定時間點：蓄力 = 到第一次判定，收勢 = 最後一次判定之後
    let v = CACHE.get(inst.v); if (v) return v;
    const hits = inst.v.actions.filter(a => a.do === 'hit' || a.do === 'rain' || a.do === 'gravpull').map(a => a.at).sort((a, b) => a - b);
    v = { first: hits.length ? hits[0] : 1, last: hits.length ? hits[hits.length - 1] : 1, n: hits.length, hide: inst.v.actions.filter(a => a.do === 'hide'), land: inst.v.actions.filter(a => a.do === 'land') };
    CACHE.set(inst.v, v); return v;
  }
  function orb(g, x, y, rad, i, glow) { // 星屑球：實心球帶高光，key 以半徑 / 顏色分桶
    const q = Math.max(2, Math.round(rad)), col = STARS[i % STARS.length];
    R.blit(g, 'astel:orb:' + col + ':' + q, q * 2.8, q * 2.8, q * 1.4, q * 1.4, c => {
      const gr = c.createRadialGradient(-q * 0.3, -q * 0.3, q * 0.1, 0, 0, q); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, col); gr.addColorStop(1, 'rgba(20,16,70,0.85)');
      c.fillStyle = gr; c.beginPath(); c.arc(0, 0, q, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = q * 0.1; c.stroke();
    });
    if (glow) { g.globalAlpha *= glow; g.fillStyle = VIO; g.beginPath(); g.arc(0, 0, rad * 1.7, 0, TAU); g.fill(); }
  }
  function pose(o, t, st) {
    const P = { jaw: 0.08, eye: o.phase === 2 ? 0.55 : 0.3, orb: 0, spread: 0, raise: 0, lunge: 0, tail: 0, tailUp: 0, flap: 0.18, wingOpen: 0.45, sweep: [0, 0], armPush: 0, glow: o.phase === 2 ? 1 : 0 };
    if (Math.hypot(o.vx || 0, o.vy || 0) > 30) { P.flap = 0.35; P.wingOpen = 0.55; }
    if (['stun', 'stagger', 'knockdown'].includes(st)) { P.jaw = 0.5; P.wingOpen = 0.2; P.flap = 0; P.eye = 0.1; P.spread = -0.3; return P; }
    if (st === 'transition') {
      const q = cl((o.stateT || 0) / ((o.def.phase2 && o.def.phase2.roarAt) || 1.85));
      P.wingOpen = 0.4 + ease(q) * 0.6; P.flap = 0.08; P.raise = ease(q); P.orb = ease(q); P.eye = 0.3 + q * 0.7; P.jaw = 0.1 + q * 0.4; P.glow = q; return P;
    }
    const inst = o.inst; if (!inst) return P;
    const I = info(inst), T = inst.t, id = inst.skill.id;
    const wind = ease(T / Math.max(0.2, I.first)), after = 1 - ease((T - I.last) / 0.55), live = T <= I.last + 0.3 ? 1 : 0;
    if (id === 'cosmic_burst') { P.jaw = 0.15 + wind * 0.55; P.eye = 0.3 + wind * 0.7; P.spread = 0.5 * wind; P.wingOpen = 0.6 + 0.3 * wind; P.lunge = -0.2 * wind; }
    else if (id === 'dark_waves' || id === 'great_waves') { P.raise = wind * after; P.orb = wind * after; P.wingOpen = 0.55 + 0.3 * wind; P.lunge = -0.1 * wind; P.eye = 0.4 + 0.4 * wind; }
    else if (id === 'sweeping_nebula') { const q = ease((T - I.first + 0.3) / 0.6); P.sweep = [wind * 0.9 - q * 1.5, -wind * 0.5 + q * 0.9]; P.armPush = 0.5 * live; }
    else if (id === 'nebula_shove') { P.sweep = [wind * -0.7 + ease((T - I.first + 0.2) / 0.3) * 1.2, 0]; P.armPush = 0.35 * live; P.lunge = 0.25 * ease((T - I.first + 0.2) / 0.3) * after; }
    else if (id === 'bite' || id === 'crushing_bite') { P.jaw = 0.12 + (id === 'crushing_bite' ? wind : wind * 0.6) * 0.6 * after + 0.2 * live; P.lunge = 0.35 * Math.sin(U.clamp(T / (I.last + 0.4), 0, 1) * Math.PI); P.eye = id === 'crushing_bite' ? 0.35 + wind * 0.65 : P.eye; }
    else if (id === 'tail_lash') { P.tailUp = ease(T / I.first) * after; P.spread = 0.2; P.eye = 0.45; }
    else if (id === 'tail_sting') { P.tailUp = 1 * after * Math.min(1, T / 0.6); P.eye = 0.5; }
    else if (id === 'flying_nebula') { P.wingOpen = 0.85; P.flap = 0.5; P.spread = 0.6 * live; P.sweep = [wind * 1.1 - live * 0.4, wind * 1.1 - live * 0.4]; }
    else if (id === 'meteorite' || id === 'star_clones') { P.wingOpen = 0.95; P.flap = 0.4; P.raise = wind * after; P.orb = wind * 0.6; P.eye = 0.5 + wind * 0.5; P.spread = 0.4 * wind; }
    else if (id === 'ult') { P.wingOpen = 0.6 + 0.35 * wind; P.raise = wind * 0.9; P.orb = wind; P.eye = 0.5 + wind * 0.5; P.glow = 1; P.jaw = 0.1 + wind * 0.3; }
    return P;
  }
  function wing(g, r, shadow, phase, big) {
    const L = r * (big ? 3.5 : 2.9), W = r * (big ? 1.25 : 1.0);
    R.blit(g, 'astel:wing:' + r + ':' + shadow + ':' + phase + ':' + (big ? 1 : 0), W * 2.6, L * 1.15, W * 1.3, L * 0.06, c => {
      const path = () => { c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(W * 1.15, L * 0.12, W * 0.95, L * 0.78, W * 0.12, L); c.bezierCurveTo(-W * 0.55, L * 0.7, -W * 0.5, L * 0.25, 0, 0); c.closePath(); };
      if (shadow) { c.fillStyle = '#000'; path(); c.fill(); return; }
      const gr = c.createLinearGradient(0, 0, W * 0.6, L); gr.addColorStop(0, 'rgba(110,150,255,0.55)'); gr.addColorStop(0.55, 'rgba(150,120,255,0.38)'); gr.addColorStop(1, 'rgba(210,170,255,0.2)');
      c.fillStyle = gr; path(); c.fill(); c.strokeStyle = phase === 2 ? 'rgba(220,190,255,0.9)' : 'rgba(205,225,255,0.65)'; c.lineWidth = r * 0.025; c.stroke();
      c.lineWidth = r * 0.016; c.strokeStyle = 'rgba(225,238,255,0.5)';
      for (let i = 0; i < 9; i++) { const u = (i + 0.5) / 9; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(W * (0.15 + u * 0.8), L * 0.45, W * (0.6 - u * 0.5) + W * 0.05, L * (0.92 - 0.1 * Math.abs(u - 0.5))); c.stroke(); }
      for (let j = 1; j < 8; j++) { const y = L * j / 8; c.beginPath(); c.moveTo(-W * 0.3 * (1 - y / L), y); c.lineTo(W * (0.95 - 0.8 * y / L), y + r * 0.04 * (j % 2 ? 1 : -1)); c.stroke(); }
    });
  }
  function arm(g, r, sx, sy, a0, a1, reach, shadow, orbi, orbAmt) {
    const L1 = r * 1.15 * reach, L2 = r * 1.3 * reach, ex = sx + Math.cos(a0) * L1, ey = sy + Math.sin(a0) * L1, hx = ex + Math.cos(a1) * L2, hy = ey + Math.sin(a1) * L2;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = shadow ? '#000' : BONE2; g.lineWidth = r * 0.16; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.lineTo(hx, hy); g.stroke();
    if (shadow) return;
    g.strokeStyle = BONE; g.lineWidth = r * 0.07; g.stroke(); g.fillStyle = BONE; g.beginPath(); g.arc(ex, ey, r * 0.1, 0, TAU); g.fill();
    for (let f = -2; f <= 2; f++) { const fa = a1 + f * 0.26, fl = r * (0.34 - Math.abs(f) * 0.04); g.strokeStyle = BONE; g.lineWidth = r * 0.035; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + Math.cos(fa) * fl, hy + Math.sin(fa) * fl); g.stroke(); }
    if (orbAmt > 0.02) { g.save(); g.translate(hx + Math.cos(a1) * r * 0.2, hy + Math.sin(a1) * r * 0.2); const rr = r * (0.12 + 0.3 * orbAmt);
      g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(0, 0, 0, 0, 0, rr * 2.2); gr.addColorStop(0, 'rgba(255,240,255,0.95)'); gr.addColorStop(0.35, 'rgba(185,162,255,0.6)'); gr.addColorStop(1, 'rgba(90,60,200,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rr * 2.2, 0, TAU); g.fill(); g.restore(); }
  }
  function head(g, r, P, t, shadow) {
    // 彎鉗：兩支黑色粗弧從顱骨下方向前夾出，張開時向外撐
    for (const s of [-1, 1]) {
      const open = 0.25 + P.jaw * 1.4, ex = r * 0.95, ey = s * r * (0.2 + open * 0.55);
      g.strokeStyle = shadow ? '#000' : '#16152e'; g.lineCap = 'round'; g.lineWidth = r * 0.17; g.beginPath(); g.moveTo(r * 0.05, s * r * 0.16); g.quadraticCurveTo(r * 0.6, s * r * (0.55 + open * 0.5), ex, ey); g.stroke();
      if (!shadow) { g.strokeStyle = '#5a5c92'; g.lineWidth = r * 0.04; g.stroke(); g.fillStyle = '#9aa0cc'; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + r * 0.2, ey - s * r * 0.08); g.lineTo(ex - r * 0.02, ey - s * r * 0.1); g.fill(); }
    }
    if (shadow) { g.fillStyle = '#000'; g.beginPath(); g.ellipse(r * 0.18, 0, r * 0.45, r * 0.38, 0, 0, TAU); g.fill(); return; }
    // 頸後白毛：一圈細長放射刺
    R.blit(g, 'astel:ruff:' + r, r * 2.2, r * 2.2, r * 1.1, r * 1.1, c => { c.strokeStyle = 'rgba(230,240,255,0.8)'; c.lineWidth = r * 0.025; c.lineCap = 'round';
      for (let i = 0; i < 44; i++) { const a = i * TAU / 44 + (i % 3) * 0.04, l = r * (0.5 + 0.14 * ((i * 7) % 5) / 4); c.beginPath(); c.moveTo(Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32); c.lineTo(Math.cos(a) * l, Math.sin(a) * l); c.stroke(); } });
    R.blit(g, 'astel:skull:' + r, r * 1.4, r * 1.2, r * 0.6, r * 0.6, c => {
      const gr = c.createRadialGradient(-r * 0.05, -r * 0.08, r * 0.04, 0, 0, r * 0.5); gr.addColorStop(0, '#f4f6ff'); gr.addColorStop(0.65, BONE); gr.addColorStop(1, '#5d6590');
      c.fillStyle = gr; c.beginPath(); c.moveTo(-r * 0.38, 0); c.bezierCurveTo(-r * 0.36, -r * 0.4, r * 0.12, -r * 0.42, r * 0.3, -r * 0.2); c.lineTo(r * 0.46, -r * 0.08); c.lineTo(r * 0.46, r * 0.08); c.lineTo(r * 0.3, r * 0.2);
      c.bezierCurveTo(r * 0.12, r * 0.42, -r * 0.36, r * 0.4, -r * 0.38, 0); c.closePath(); c.fill(); c.strokeStyle = '#323963'; c.lineWidth = r * 0.025; c.stroke();
      c.fillStyle = '#0c0d26'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(r * 0.2, s * r * 0.15, r * 0.115, r * 0.085, s * 0.3, 0, TAU); c.fill(); }
      c.beginPath(); c.moveTo(r * 0.4, 0); c.lineTo(r * 0.33, -r * 0.035); c.lineTo(r * 0.33, r * 0.035); c.fill();
      c.strokeStyle = '#e9edff'; c.lineWidth = r * 0.02; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(r * 0.44, i * r * 0.026); c.lineTo(r * 0.36, i * r * 0.026); c.stroke(); }
      c.strokeStyle = '#262b55'; c.lineWidth = r * 0.03; c.beginPath(); c.moveTo(r * 0.08, -r * 0.2); c.lineTo(-r * 0.02, -r * 0.06); c.lineTo(r * 0.03, r * 0.02); c.lineTo(-r * 0.12, r * 0.14); c.stroke();
    });
    // 額上裂縫中的藍眼
    const e = (0.35 + P.eye * 0.65) * (0.85 + 0.15 * Math.sin(t * 6)); g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(r * 0.02, -r * 0.02, 0, r * 0.02, -r * 0.02, r * (0.2 + e * 0.55)); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.3, 'rgba(111,180,255,' + (0.5 + e * 0.5) + ')'); gr.addColorStop(1, 'rgba(60,90,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(r * 0.02, -r * 0.02, r * (0.2 + e * 0.55), 0, TAU); g.fill(); g.restore();
  }
  function dragon(g, o, t, r, P, shadow) {
    g.save(); g.translate(P.lunge * r, 0);
    // 尾：一串漸小的彩色球沿 S 形擺動，尖端帶刺，向上翹時拉直
    const n = 15, pts = [];
    for (let i = 0; i <= n; i++) { const u = i / n, wob = Math.sin(t * 1.8 - u * 3) * 0.22 * r * u, curl = P.tail * Math.sin(u * 2.2) * r * 1.4 * u;
      pts.push([-r * (0.7 + u * 3.1 * (1 - P.tailUp * 0.25)), wob + curl]); }
    if (!shadow) { g.strokeStyle = 'rgba(30,26,90,0.8)'; g.lineWidth = r * 0.1; g.lineCap = 'round'; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
    pts.forEach((p, i) => { const u = i / n, rad = r * (0.2 - 0.12 * u); g.save(); g.translate(p[0], p[1]); if (shadow) { g.fillStyle = '#000'; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.fill(); } else orb(g, 0, 0, rad, i); g.restore(); });
    const tip = pts[n]; if (!shadow) { g.strokeStyle = BONE; g.lineWidth = r * 0.05; g.beginPath(); g.moveTo(tip[0], tip[1]); g.lineTo(tip[0] - r * 0.35, tip[1] + (P.tail ? 0 : r * 0.05)); g.stroke(); }
    // 後翼、前翼
    for (const s of [-1, 1]) for (let k = 0; k < 2; k++) { const base = k ? 1.25 : 0.7, open = P.wingOpen, flutter = Math.sin(t * (9 + k) + s) * P.flap * 0.35;
      g.save(); g.translate(r * (0.15 - k * 0.3), s * r * 0.22); g.scale(1, s); g.rotate(base * (1 - open * 0.4) + flutter); wing(g, r, shadow, o.phase, !k); g.restore(); }
    if (!shadow) { g.save(); g.globalCompositeOperation = 'lighter'; const au = g.createRadialGradient(-r * 0.4, 0, r * 0.2, -r * 0.4, 0, r * 2.6); au.addColorStop(0, 'rgba(120,96,255,' + (0.2 + 0.12 * P.glow) + ')'); au.addColorStop(1, 'rgba(40,24,140,0)'); g.fillStyle = au; g.beginPath(); g.arc(-r * 0.4, 0, r * 2.6, 0, TAU); g.fill(); g.restore(); }
    // 軀幹：星屑堆成的橢圓
    R.blit(g, 'astel:torso:' + r + ':' + shadow + ':' + o.phase, r * 2.6, r * 1.9, r * 1.4, r * 0.95, c => {
      if (shadow) { c.fillStyle = '#000'; c.beginPath(); c.ellipse(-r * 0.1, 0, r * 0.9, r * 0.5, 0, 0, TAU); c.fill(); return; }
      const gr = c.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 0.95); gr.addColorStop(0, '#2d2f6e'); gr.addColorStop(1, '#0c0d28'); c.fillStyle = gr; c.beginPath(); c.ellipse(-r * 0.1, 0, r * 0.9, r * 0.5, 0, 0, TAU); c.fill();
      for (let i = 0; i < 46; i++) { const u = (i * 0.618) % 1, v = ((i * 0.381) % 1) * 2 - 1, x = -r * 0.95 + r * 1.75 * u, y = v * r * 0.45 * Math.sqrt(Math.max(0, 1 - ((x + r * 0.1) / r) ** 2)), q = r * (0.05 + 0.07 * ((i * 5) % 7) / 7), col = STARS[i % STARS.length];
        const gg = c.createRadialGradient(x - q * 0.3, y - q * 0.3, 0, x, y, q); gg.addColorStop(0, '#fff'); gg.addColorStop(0.4, col); gg.addColorStop(1, 'rgba(18,14,60,0.8)'); c.fillStyle = gg; c.beginPath(); c.arc(x, y, q, 0, TAU); c.fill(); }
    });
    // 六條手臂：前、中、後各一對；pose 決定揮舉與聚球
    const sw = P.sweep, ARM = [[0.45, 0.22, 0.65, 0.2], [0.05, 0.3, 1.55, 1.1], [-0.4, 0.28, 2.45, 2.0]];
    for (let k = 2; k >= 0; k--) for (const s of [-1, 1]) {
      const [sx, sy, b0, b1] = ARM[k], idle = Math.sin(t * 1.4 + k * 1.3 + s) * 0.08, swv = sw[s < 0 ? 0 : 1] * (k === 0 ? 1 : 0.4), spread = P.spread * (k === 0 ? 1 : 0.5);
      const raise = P.raise * (1.1 - k * 0.2); // 舉起時手臂朝外上翻（俯視為向外展開 + 縮短）
      const a0 = s * (b0 - raise * 0.35 + spread * 0.5 + idle) + swv * s * 0.6, a1 = s * (b1 - raise * 0.45 + spread * 0.4 + idle * 1.5) + swv * s;
      arm(g, r, r * sx, s * r * sy, a0, a1, 1 - P.armPush * 0.0 + (P.armPush && k === 0 ? 0.25 : 0) - raise * 0.12, shadow, k * 2 + (s < 0 ? 0 : 1), P.orb);
    }
    // 頭
    g.save(); g.translate(r * 0.72, 0); head(g, r, P, t, shadow); g.restore();
    // 星屑環：身側緩緩旋轉的行星環光
    if (!shadow) for (let i = 0; i < 2; i++) { const a = t * (0.5 + i * 0.3) + i * 3; g.strokeStyle = 'rgba(210,190,255,' + (0.35 + 0.2 * P.glow) + ')'; g.lineWidth = r * 0.03; g.beginPath(); g.ellipse(Math.cos(a) * r * 0.2 - r * 1.3, Math.sin(a * 1.3) * r * 0.55, r * 0.34, r * 0.1, a, 0, TAU); g.stroke(); }
    g.restore();
  }
  function shadowOf(g, b, t, r, P, h) { g.save(); g.globalAlpha *= Math.max(0.12, 0.28 - h / 1500); g.translate(h * 0.15, h * 0.2); dragon(g, b, t, r, P, true); g.restore(); }
  R.defineBossStyle('astel', {
    body(g, b, t, k) {
      const portrait = !b.world && g.canvas && g.canvas.width <= 256, P = pose(b, t, k.st);
      const hover = (Math.sin(t * 1.7) * 0.5 + 0.5) * k.r * 0.12; // 常態輕輕浮空：陰影比本體淡、略偏
      if (portrait) { g.translate(k.r * 0.55, 0); g.scale(0.3, 0.3); }
      shadowOf(g, b, t, k.r, P, hover + k.r * 0.2);
      g.save(); g.translate(0, -hover); dragon(g, b, t, k.r, P, false); g.restore();
    },
    hidden(g, b, t) { // 瞬移俯衝：化成一顆發光球，沿弧線飛向落點
      if (!b.inst) return;
      const I = info(b.inst), T = b.inst.t, land = I.land.find(a => a.at > T), hide = I.hide.filter(a => a.at <= T).pop();
      if (!land || !hide) return;
      const mark = b.inst.marks[land.mark] || b.enemy || b, p = cl((T - hide.at) / (land.at - hide.at)), q = ease(p);
      const x = U.lerp(b.x, mark.x, q), y = U.lerp(b.y, mark.y, q), h = Math.sin(p * Math.PI) * b.r * 3;
      g.save(); g.translate(x, y); g.globalAlpha *= 0.28; g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, 0, b.r * 0.5, b.r * 0.28, 0, 0, TAU); g.fill(); g.restore();
      g.save(); g.translate(x, y - h); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) { const tt = Math.max(0, p - i * 0.035), tq = ease(tt), hx = U.lerp(b.x, mark.x, tq) - x, hy = U.lerp(b.y, mark.y, tq) - U.lerp(0, 0, tq) - Math.sin(tt * Math.PI) * b.r * 3 + h; g.fillStyle = 'rgba(185,162,255,' + (0.35 - i * 0.04) + ')'; g.beginPath(); g.arc(hx, hy, b.r * (0.4 - i * 0.04), 0, TAU); g.fill(); }
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, b.r * 0.9); gr.addColorStop(0, 'rgba(255,245,255,1)'); gr.addColorStop(0.3, 'rgba(185,162,255,0.8)'); gr.addColorStop(1, 'rgba(70,50,200,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, b.r * 0.9, 0, TAU); g.fill(); g.restore();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
