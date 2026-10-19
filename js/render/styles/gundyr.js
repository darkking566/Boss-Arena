'use strict';
// Boss 造型：灰燼審判者古達：灰鐵重甲與冠盔、胸口貫穿的螺旋劍（Coiled Sword）、破爛披風、長戟；
// 二階段人之膿自後頸破體而出（黑色肉團與帶爪巨手）
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

  // 人之膿：後頸黑色肉團 + 帶爪巨手。k 成長 0~1，reach 巨手前伸 0~1，aim 前伸方向（面向為 0）
  function drawMass(ctx, r, t, k, reach, aim) {
    if (k <= 0.01) return;
    const baseX = -r * 0.35, wob = Math.sin(t * 6) * 0.12;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, k * 1.5);
    // 肉團本體
    ctx.fillStyle = '#0c090d';
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * U.TAU, rr = r * (0.5 + 0.12 * Math.sin(t * 5 + i * 2.3)) * k;
      const x = baseX - r * 0.15 + Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    // 兩條蠕動觸手 + 主巨手
    ctx.lineCap = 'round';
    const arms = [[Math.PI - 0.7, 0.5], [Math.PI + 0.7, 0.5], [Math.PI + aim * 0 + 3.1, 0.65]];
    for (let i = 0; i < 2; i++) {
      const [ba, len] = arms[i], a = ba + Math.sin(t * 4 + i * 2) * 0.35;
      const tx = baseX + Math.cos(a) * r * len * 1.6 * k, ty = Math.sin(a) * r * len * 1.6 * k;
      ctx.strokeStyle = '#0c090d'; ctx.lineWidth = r * 0.2;
      ctx.beginPath(); ctx.moveTo(baseX, 0); ctx.quadraticCurveTo((baseX + tx) / 2, ty * 0.3 + Math.sin(t * 7 + i) * r * 0.2, tx, ty); ctx.stroke();
    }
    // 主巨手：從頸後越過肩膀前伸；reach=0 時垂在身後
    const rest = Math.PI + 0.35 + wob, a = rest + (aim - rest) * reach;
    const L = r * (1.0 + 1.5 * reach) * k;
    const hx = baseX + Math.cos(a) * L, hy = Math.sin(a) * L;
    ctx.strokeStyle = '#0c090d'; ctx.lineWidth = r * 0.34;
    ctx.beginPath(); ctx.moveTo(baseX, 0); ctx.quadraticCurveTo(baseX + Math.cos(a - 0.5) * L * 0.6, Math.sin(a - 0.5) * L * 0.6, hx, hy); ctx.stroke();
    ctx.strokeStyle = '#34283e'; ctx.lineWidth = r * 0.06;
    ctx.beginPath(); ctx.moveTo(baseX, 0); ctx.quadraticCurveTo(baseX + Math.cos(a - 0.5) * L * 0.6, Math.sin(a - 0.5) * L * 0.6, hx, hy); ctx.stroke();
    // 三指爪
    ctx.strokeStyle = '#c9bcd6'; ctx.lineWidth = 2.2;
    for (let c = -1; c <= 1; c++) {
      const ca = a + c * 0.45 + Math.sin(t * 9 + c) * 0.08;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(ca) * r * 0.6, hy + Math.sin(ca) * r * 0.6); ctx.stroke();
    }
    // 肉團上的慘白微光
    ctx.fillStyle = hexA('#d8c8e8', 0.55 + 0.25 * Math.sin(t * 8));
    ctx.beginPath(); ctx.arc(baseX - r * 0.3, -r * 0.12, 2.2, 0, U.TAU); ctx.arc(baseX - r * 0.3, r * 0.12, 2.2, 0, U.TAU); ctx.fill();
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
      gr.addColorStop(0, '#9b948a'); gr.addColorStop(0.6, '#6f695f'); gr.addColorStop(1, '#3a352e');
      g.fillStyle = gr; g.strokeStyle = '#1b1612';
      g.beginPath(); g.ellipse(0, 0, r * 0.62, r * 0.8, 0, 0, U.TAU); g.fill(); g.stroke();
      // 肩甲
      for (const s of [-1, 1]) {
        g.fillStyle = '#7d766b';
        g.beginPath(); g.ellipse(r * 0.05, s * r * 0.82, r * 0.42, r * 0.3, s * 0.25, 0, U.TAU); g.fill(); g.stroke();
        g.strokeStyle = '#4a443c'; g.beginPath(); g.moveTo(r * 0.3, s * r * 0.7); g.lineTo(-r * 0.2, s * r * 0.95); g.stroke();
        g.strokeStyle = '#1b1612';
      }
      // 腰帶與甲片
      g.strokeStyle = '#2a251f';
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(-r * 0.3, i * r * 0.2); g.lineTo(r * 0.3, i * r * 0.2); g.stroke(); }
    });

    // 4. 胸口貫穿的螺旋劍：劍身貫穿前後，前方露出螺旋護手，劍尖帶餘燼微光
    ctx.strokeStyle = '#5a5248'; ctx.lineWidth = r * 0.1;
    ctx.beginPath(); ctx.moveTo(r * 0.45, 0); ctx.lineTo(-r * 0.95, 0); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = hexA('#e08a3a', 0.35 + 0.2 * Math.sin(t * 3));
    ctx.beginPath(); ctx.arc(-r * 0.95, 0, r * 0.14, 0, U.TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#b8aa94'; ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) { const a = i / 18 * 3.5 * U.TAU, rr = r * (0.05 + 0.2 * i / 18); const x = r * 0.45 + Math.cos(a) * rr, y = Math.sin(a) * rr; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();

    // 5. 左手：擒拿時前探
    const grab = sid === 'grab_stab';
    const gx = r * 0.45 + (grab ? r * 1.0 * (sn > 0 ? 1 : Math.min(1, wd * 1.6)) : 0), gy = -r * 0.62 + (grab ? r * 0.45 * Math.min(1, wd * 1.6) : 0);
    ctx.fillStyle = '#6f695f'; ctx.strokeStyle = '#1b1612'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(gx, gy, r * 0.2, 0, U.TAU); ctx.fill(); ctx.stroke();

    // 6. 頭：鐵盔 + 冠狀尖刺
    ctx.fillStyle = '#4a443c'; ctx.strokeStyle = '#1b1612'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(r * 0.15, 0, r * 0.38, 0, U.TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9b948a';
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 0.9 + i / 6 * Math.PI * 1.2 - Math.PI * 0.6, x0 = r * 0.15 + Math.cos(a) * r * 0.34, y0 = Math.sin(a) * r * 0.34;
      ctx.beginPath(); ctx.moveTo(x0 + Math.sin(a) * 3, y0 - Math.cos(a) * 3); ctx.lineTo(r * 0.15 + Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58); ctx.lineTo(x0 - Math.sin(a) * 3, y0 + Math.cos(a) * 3); ctx.closePath(); ctx.fill();
    }
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
