'use strict';
// Boss 造型：灰燼審判者古達：胸口螺旋劍拔除後的青白微光孔洞、亮鋼金邊重甲、披散黑髮、破爛披風、長戟；
// 二階段人之膿自後頸破體而出（覆滿黑羽毛絲的巨獸團塊、單隻赤紅大眼、利齒巨口、灰白蜘蛛節肢與枯槁巨爪）
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;

  const VIS = 1.15;                    // 視覺放大：判定半徑不變
  const TRIG = { hit: 1, dash: 1 };
  const REST = 0.4;                    // 戟持平時的角度
  const ease = (u) => 1 - (1 - u) * (1 - u);

  // 依下一個出手動作決定戟姿：掃 / 刺 / 劈 / 躍
  function modeOf(inst, a) {
    if (!a) return null;
    if (a.do === 'dash') return inst.skill.ult ? 'lance' : 'jab';
    if (a.shape === 'cone') return 'sweep';
    if (a.shape === 'rect') return 'thrust';
    return inst.skill.id === 'leap_slam' ? 'slam' : 'chop';
  }
  // 重用物件：ga 戟角、tx 握點位移、fs 戟長縮放、s0/sa 揮弧殘影起點與透明度
  const H = { ga: REST, tx: 0, fs: 1, s0: 0, sa: 0 };
  function pose(r, mode, wd, sn) {
    H.ga = REST; H.tx = 0; H.fs = 1; H.s0 = 0; H.sa = 0;
    const hold = Math.min(1, wd / 0.6), sw = wd < 0.7 ? 0 : ease((wd - 0.7) / 0.3);
    if (mode === 'sweep') {
      const A = 1.8, B = -1.3;
      if (sn > 0) { H.ga = REST + (B - REST) * sn; H.s0 = A; H.sa = 0.26 * sn; }
      else if (sw > 0) { H.ga = A + (B - A) * sw; H.s0 = A; H.sa = 0.26; }
      else H.ga = REST + (A - REST) * hold;
    } else if (mode === 'thrust') {
      H.ga = sn > 0 ? 0 : REST * (1 - hold);
      H.tx = sn > 0 ? r * 0.6 * sn : -r * 0.4 * hold + r * 1.0 * sw;
    } else if (mode === 'jab' || mode === 'lance') {
      H.ga = 0; H.tx = r * 0.3; H.fs = 1.1;
    } else { // chop / slam：高舉（透視縮短）後劈下
      H.ga = 0.1; H.fs = sn > 0 ? 1.1 : 1 - (mode === 'slam' ? 0.55 : 0.4) * hold + 0.5 * sw;
    }
    return H;
  }

  // 人之膿：自後頸竄出的巨大長條蛇狀肉身（體長約為古達的四倍以上），末端是張著利齒巨口的頭。
  // k 成長 0~1，reach 前撲 0~1，aim 撲擊方向（面向為 0）；平時盤在身後蠕動
  function limb(ctx, p0, p1, p2, w0, w1, t, ph, k) {
    const N = 16;
    ctx.fillStyle = '#0c090d';
    for (let i = 0; i <= N; i++) {
      const s = i / N, u = 1 - s;
      const x = u * u * p0[0] + 2 * u * s * p1[0] + s * s * p2[0], y = u * u * p0[1] + 2 * u * s * p1[1] + s * s * p2[1];
      const bulge = 1 + 0.25 * Math.sin(t * 4 - s * 9 + ph); // 肉身沿身長起伏蠕動
      ctx.beginPath(); ctx.arc(x, y, (w0 + (w1 - w0) * s) * bulge * k, 0, U.TAU); ctx.fill();
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
  function drawClaw(ctx, base, r, t, reach, aim, k) {
    const rest = Math.PI - 1.0 + Math.sin(t * 1.3) * 0.12, a = rest + (aim - rest) * reach * 0.8;
    const L = r * (3.4 + 2.4 * reach) * k, tip = [base[0] + Math.cos(a) * L, Math.sin(a) * L];
    const mid = [(base[0] + tip[0]) / 2 + Math.cos(a - 1.57) * r * 1.1, tip[1] / 2 + Math.sin(a - 1.57) * r * 1.1];
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [col, w] of [['#2a2430', r * 0.95], ['#c9c0b6', r * 0.66]]) { // 先畫暗色輪廓再畫慘白臂骨
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(base[0], 0); ctx.lineTo(mid[0], mid[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
    }
    ctx.fillStyle = '#d8d0c6'; ctx.beginPath(); ctx.arc(mid[0], mid[1], r * 0.52, 0, U.TAU); ctx.fill(); // 肘關節
    for (let c = 0; c < 4; c++) { // 四根彎曲的枯指
      const fa = a + (c - 1.5) * 0.42 + Math.sin(t * 3 + c) * 0.06, fl = r * (1.8 + 0.25 * (c % 2));
      const f1 = [tip[0] + Math.cos(fa) * fl * 0.6, tip[1] + Math.sin(fa) * fl * 0.6], f2 = [f1[0] + Math.cos(fa + 0.7) * fl * 0.5, f1[1] + Math.sin(fa + 0.7) * fl * 0.5];
      ctx.strokeStyle = '#2a2430'; ctx.lineWidth = r * 0.38; ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(f1[0], f1[1]); ctx.lineTo(f2[0], f2[1]); ctx.stroke();
      ctx.strokeStyle = '#d8d0c6'; ctx.lineWidth = r * 0.22; ctx.stroke();
    }
  }
  // 人之膿：覆滿黑色羽毛絲的巨獸團塊壓在古達身後，灰白節肢撐地，單隻猩紅大眼的巨首撲向前方
  // k 成長 0~1，reach 前撲 0~1，aim 撲擊方向（面向為 0）
  function drawMass(ctx, r, t, k, reach, aim) {
    if (k <= 0.01) return;
    const base = [-r * 0.3, 0];
    ctx.save(); ctx.globalAlpha *= Math.min(1, k * 1.5); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 4; i++) leg(ctx, [base[0] - r * 0.2 * (i % 2), 0], (i < 2 ? -1 : 1) * (1.35 + 0.5 * (i % 2)), r, t, i * 1.7, k);
    drawClaw(ctx, base, r, t, reach, aim, k);
    // 身軀團塊
    ctx.save(); ctx.translate(base[0] - r * 0.7, 0); ctx.scale(k, k);
    ctx.fillStyle = '#0c090d'; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.9, r * 1.55 + Math.sin(t * 1.8) * r * 0.08, 0, 0, U.TAU); ctx.fill();
    fur(ctx, r * 1.8, r * 1.45, 46, r * 0.32);
    ctx.restore();
    // 頸：粗壯、羽毛覆蓋，頭部撲向前方
    const rest = Math.PI + 0.55 + Math.sin(t * 1.7) * 0.18, a = rest + (aim - rest) * reach;
    const L = r * (4.2 + 2.6 * reach) * k;
    const head = [base[0] + Math.cos(a) * L, Math.sin(a) * L];
    const ca = a + 1.0 * (1 - 0.7 * reach), cl = L * 0.6 + Math.sin(t * 2.2) * r * 0.5;
    const ctrl = [base[0] + Math.cos(ca) * cl, Math.sin(ca) * cl];
    limb(ctx, base, ctrl, head, r * 1.7, r * 1.3, t, 0, k);
    // 頭：沿身體末端切線朝外張口，噬咬時張得更大；暗紅口腔與慘白利齒
    const ta = Math.atan2(head[1] - ctrl[1], head[0] - ctrl[0]), mo = (1 + 0.7 * reach) * k;
    ctx.save(); ctx.translate(head[0], head[1]); ctx.rotate(ta);
    ctx.fillStyle = '#0c090d'; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.55 * k, r * 1.3 * k, 0, 0, U.TAU); ctx.fill();
    fur(ctx, r * 1.45 * k, r * 1.2 * k, 30, r * 0.28);
    ctx.fillStyle = '#5a1220'; ctx.beginPath(); ctx.ellipse(r * 0.6, 0, r * 0.85 * mo, r * 0.9 * mo, 0, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#e0d4dc';
    for (let i = 0; i < 8; i++) {
      const b = i / 8 * U.TAU, ex = r * 0.6 + Math.cos(b) * r * 0.85 * mo, ey = Math.sin(b) * r * 0.9 * mo;
      ctx.beginPath(); ctx.moveTo(ex + Math.sin(b) * 3, ey - Math.cos(b) * 3); ctx.lineTo(ex - Math.cos(b) * r * 0.22, ey - Math.sin(b) * r * 0.22); ctx.lineTo(ex - Math.sin(b) * 3, ey + Math.cos(b) * 3); ctx.closePath(); ctx.fill();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; // 單隻猩紅大眼，帶裂紋光斑
    const pu = 0.85 + 0.15 * Math.sin(t * 5);
    ctx.fillStyle = hexA('#ff2a2a', pu); ctx.beginPath(); ctx.ellipse(-r * 0.1, -r * 0.62, r * 0.42 * k, r * 0.3 * k, 0.3, 0, U.TAU); ctx.fill();
    ctx.fillStyle = hexA('#ff9a8a', 0.5 * pu); ctx.beginPath(); ctx.ellipse(-r * 0.1, -r * 0.62, r * 0.18 * k, r * 0.12 * k, 0.3, 0, U.TAU); ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.restore();
  }

  function drawBody(ctx, o, t, { r, act }) {
    const p2 = o.phase === 2, massK = p2 ? 1 : (o.massK || 0);
    const inst = o.inst && o.inst.skill && o.inst.v && o.inst.v.actions ? o.inst : null;
    let w = null, wd = 0, sn = 0, sid = inst ? inst.skill.id : '';
    if (inst) {
      const p = R.skillPace(inst, TRIG), mode = modeOf(inst, p.a);
      wd = p.snap > 0 ? 0 : p.wind; sn = p.snap;
      if (mode) w = pose(r, mode, wd, sn);
    }
    // 人之膿巨手：拍擊 / 噬咬時前伸；平時垂在身後
    let reach = 0, aim = 0;
    if (inst && (sid === 'mass_smack' || sid === 'screech_bite' || sid === 'ult')) {
      reach = sn > 0 ? sn : Math.min(1, wd * 1.4);
      aim = sid === 'mass_smack' ? 0.85 - 1.0 * (act > 0.5 ? 1 : 0) : 0;
    }
    if (o.state === 'stagger' || o.state === 'stun') reach = 0;

    // 1. 破爛披風
    const sway = Math.sin(t * 4) * r * 0.1;
    ctx.fillStyle = '#2a211b';
    ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.85);
    for (let i = 1; i <= 6; i++) ctx.lineTo(-r * 0.1 - i * r * 0.28 - (i % 2) * r * 0.12, -r * 0.85 + i * r * 0.283 + Math.sin(t * 5 + i) * r * 0.1 + sway);
    ctx.lineTo(-r * 0.1, r * 0.85); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4a3a2c'; ctx.lineWidth = 1.5; ctx.stroke();

    // 2. 人之膿（畫在身體之下，從後頸探出）
    drawMass(ctx, r, t, massK, reach, aim);

    // 3. 軀幹：雙肩甲 + 胸甲（精靈快取）
    R.blit(ctx, 'body:gundyr:torso:' + r, r * 2.4 + 20, r * 2.4 + 20, r * 1.2 + 10, r * 1.2 + 10, (g) => {
      g.lineWidth = 2;
      // 胸甲
      const gr = g.createRadialGradient(r * 0.1, 0, 2, 0, 0, r * 0.9);
      gr.addColorStop(0, '#e6eaf0'); gr.addColorStop(0.6, '#a3abb8'); gr.addColorStop(1, '#4a5260');
      g.fillStyle = gr; g.strokeStyle = '#1b1e24';
      g.beginPath(); g.ellipse(0, 0, r * 0.62, r * 0.8, 0, 0, U.TAU); g.fill(); g.stroke();
      // 肩甲
      for (const s of [-1, 1]) {
        g.fillStyle = '#b9c0ca';
        g.beginPath(); g.ellipse(r * 0.05, s * r * 0.82, r * 0.42, r * 0.3, s * 0.25, 0, U.TAU); g.fill(); g.stroke();
        g.strokeStyle = '#c9a24a'; g.beginPath(); g.ellipse(r * 0.05, s * r * 0.82, r * 0.28, r * 0.17, s * 0.25, 0, U.TAU); g.stroke(); // 肩甲金邊雕花
        g.strokeStyle = '#1b1e24';
      }
      // 腰帶與甲片
      g.strokeStyle = '#b8903c';
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(-r * 0.3, i * r * 0.2); g.lineTo(r * 0.3, i * r * 0.2); g.stroke(); }
    });

    // 4. 螺旋劍已被拔除：胸口留下貫穿孔洞，孔中一點青白微光
    ctx.fillStyle = '#0b0d12'; ctx.strokeStyle = '#8a7a52'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(r * 0.52, 0, r * 0.13, 0, U.TAU); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const wp = 0.6 + 0.3 * Math.sin(t * 2.5);
    ctx.fillStyle = hexA('#9fd0ff', 0.18 * wp); ctx.beginPath(); ctx.arc(r * 0.52, 0, r * 0.26, 0, U.TAU); ctx.fill();
    ctx.fillStyle = hexA('#e8f4ff', wp); ctx.beginPath(); ctx.arc(r * 0.52, 0, r * 0.07, 0, U.TAU); ctx.fill();
    ctx.restore();

    // 5. 左手：擒拿時前探
    const grab = sid === 'grab_stab';
    const gx = r * 0.45 + (grab ? r * 1.0 * (sn > 0 ? 1 : Math.min(1, wd * 1.6)) : 0), gy = -r * 0.62 + (grab ? r * 0.45 * Math.min(1, wd * 1.6) : 0);
    ctx.fillStyle = '#6f695f'; ctx.strokeStyle = '#1b1612'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(gx, gy, r * 0.2, 0, U.TAU); ctx.fill(); ctx.stroke();

    // 6. 頭：鋼盔 + 腦後披散的黑色長髮
    ctx.strokeStyle = '#0d0b10'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      const sy = i * r * 0.1, w2 = Math.sin(t * 3 + i * 1.3) * r * 0.08;
      ctx.beginPath(); ctx.moveTo(r * 0.05, sy * 0.6); ctx.quadraticCurveTo(-r * 0.5, sy + w2, -r * 0.95, sy * 1.8 + w2 * 1.5); ctx.stroke();
    }
    ctx.fillStyle = '#8e97a4'; ctx.strokeStyle = '#1b1e24'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(r * 0.15, 0, r * 0.38, 0, U.TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r * 0.2, 0); ctx.lineTo(r * 0.5, 0); ctx.stroke(); // 盔頂金脊
    ctx.fillStyle = '#0a0806'; // 面罩橫縫
    ctx.fillRect(r * 0.32, -r * 0.2, r * 0.1, r * 0.4);

    // 7. 古達的長戟：長柄 + 斧刃 + 槍尖（掃擊時帶揮弧殘影）
    const ha = w ? w.ga : REST + Math.sin(t * 2.2) * 0.04, fs = w ? w.fs : 1, hpx = r * 0.2 + (w ? w.tx : 0), hpy = r * 0.62;
    const L = r * 4.0;
    if (w && w.sa > 0.01) {
      const a0 = Math.min(w.s0, ha), a1 = Math.max(w.s0, ha);
      ctx.fillStyle = p2 ? hexA('#a88ac8', w.sa) : hexA('#e8e4dc', w.sa);
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
    ctx.restore();
  }

  // 換階段用的繪製物件（重用）
  const T = { x: 0, y: 0, face: 0, r: 0, def: null, phase: 1, state: 'transition', massK: 0, inst: null };
  R.defineBossStyle('gundyr', {
    body(ctx, o, t, args) { ctx.save(); ctx.lineWidth = 1; drawBody(ctx, o, t, Object.assign({}, args, { r: args.r * VIS })); ctx.restore(); },
    // 換階段「人之膿破體」：先單膝壓低身形顫抖，肉團在咆哮前逐漸脹出（爆裂煙霧由 phase2.transFx 負責）
    transition(ctx, b, t) {
      const at = b.roarAt || 0.6, before = b.stateT < at, k = U.clamp(b.stateT / at, 0, 1);
      T.x = b.x + (before ? Math.sin(t * 40) * 1.5 * k : 0); T.y = b.y; T.face = b.face; T.r = b.r; T.def = b.def;
      T.phase = before ? 1 : 2; T.massK = before ? k : 1;
      R.drawBossBody(ctx, T, t);
      return true;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
