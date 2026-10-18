'use strict';
// Boss 造型：劫：背負巨型手裏劍、兩臂腕刃、刃冠頭盔與紅色眼縫、尖角護肩；二階段護甲縫隙透出紅光、背上手裏劍緩緩轉動。
// 腕刃依招式擺姿勢：普攻左右交替突刺、鬼斬張臂迴旋、諸刃後拉甩手擲出。
// 影子（b.shadows）以同一身形的漆黑剪影繪製（紅色眼縫與輪廓），並模仿本體目前的招式姿勢——原作影子會同步施放。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  const TRIG = { hit: 1, proj: 1 };
  const RED = '#e01e37';
  const POSE = { spin: 0, ext0: 0, ext1: 0, throwK: 0 };

  // 招式姿勢（回傳重用物件）：spin 迴旋角、ext0 / ext1 左右臂前伸（負值＝後拉）、throwK 擲出甩手（負值＝蓄力後拉）
  function pose(o, t) {
    const p = POSE;
    p.spin = 0; p.ext0 = 0.1 + Math.sin(t * 2.4) * 0.06; p.ext1 = 0.1 - Math.sin(t * 2.4) * 0.06; p.throwK = 0;
    const inst = o.inst;
    if (!inst || !inst.v) return p;
    const P = R.skillPace(inst, TRIG), a = P.a;
    if (!a) return p;
    if (a.do === 'proj') p.throwK = P.snap > 0 ? P.snap : -P.wind;
    else if (a.shape === 'circle') {
      p.ext0 = p.ext1 = 0.55 + P.wind * 0.45;
      p.spin = P.snap > 0 ? (1 - P.snap) * U.TAU : -0.5 * P.wind;
    } else {
      const k = P.snap > 0 ? P.snap : -0.4 * P.wind;
      if (P.i % 2) p.ext1 = k; else p.ext0 = k;
    }
    return p;
  }

  // 一條手臂＋腕刃（s：-1 左、1 右；ext 前伸量）
  function arm(ctx, r, s, ext, shade, p2) {
    const sx = r * 0.05, sy = s * r * 0.72;
    const hx = r * (0.5 + 0.45 * ext), hy = s * r * (0.56 - 0.16 * ext);
    // 腕刃：裝在前臂外側，越過拳頭往前延伸、刃背向外弧
    const ax = hx - r * 0.4, ay = hy + s * r * 0.08, bx = hx + r * 1.2, by = hy + s * r * 0.34;
    ctx.fillStyle = shade ? '#000000' : '#c3c8d2';
    ctx.beginPath(); ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(hx + r * 0.45, hy + s * r * 0.42, bx, by);
    ctx.quadraticCurveTo(hx + r * 0.35, hy + s * r * 0.08, ax + r * 0.1, ay - s * r * 0.12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade || p2 ? RED : '#f4f6fa'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(hx + r * 0.45, hy + s * r * 0.42, bx, by); ctx.stroke();
    ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(ax + r * 0.14, ay - s * r * 0.01, r * 0.06, 0, U.TAU); ctx.fill();
    // 手臂與護腕
    ctx.strokeStyle = shade ? '#050407' : '#22242c'; ctx.lineWidth = r * 0.24; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = shade ? '#1a0508' : '#545966'; ctx.lineWidth = r * 0.28;
    ctx.beginPath(); ctx.moveTo(hx - r * 0.32, hy - s * r * 0.02); ctx.lineTo(hx - r * 0.02, hy); ctx.stroke();
  }

  function body(ctx, o, t, { def, r }) {
    const shade = !!o.shade, p2 = o.phase === 2, P = pose(o, t);
    if (P.spin) ctx.rotate(P.spin);
    const tag = r + ':' + (shade ? 's' : 'b');

    // 背上的巨型手裏劍（二階段緩緩轉動）
    ctx.save(); ctx.translate(-r * 0.62, 0); ctx.rotate(0.4 + (p2 ? t * 1.5 : 0));
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
      g.fillStyle = shade ? '#000000' : '#22242c'; g.beginPath(); g.arc(0, 0, r * 0.28, 0, U.TAU); g.fill();
      g.fillStyle = RED; g.beginPath(); g.arc(0, 0, r * 0.12, 0, U.TAU); g.fill();
    });
    ctx.restore();

    // 軀幹（精靈快取）
    R.blit(ctx, 'body:zed:torso:' + tag, r * 1.3 + 8, r * 1.9 + 8, r * 0.65 + 4, r * 0.95 + 4, (g) => {
      const gr = g.createRadialGradient(r * 0.1, 0, 2, 0, 0, r);
      gr.addColorStop(0, shade ? '#120a0d' : '#3a3d47'); gr.addColorStop(1, shade ? '#000000' : def.color2);
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, r * 0.6, r * 0.9, 0, 0, U.TAU); g.fill();
    });

    // 兩臂腕刃（右臂兼擲諸刃）
    const tk = P.throwK;
    arm(ctx, r, -1, P.ext0, shade, p2);
    arm(ctx, r, 1, tk ? (tk > 0 ? 0.6 + tk * 0.6 : -0.6 * -tk) : P.ext1, shade, p2);

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
    const ea = shade ? 0.9 : p2 ? 0.75 + 0.25 * Math.sin(t * 9) : 0.85;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA('#ff3048', ea); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(r * 0.3, s * r * 0.08); ctx.lineTo(r * 0.44, s * r * 0.24); ctx.stroke(); }
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

  R.defineBossStyle('zed', { body, under: shadows });
})(typeof window !== 'undefined' ? window : globalThis);
