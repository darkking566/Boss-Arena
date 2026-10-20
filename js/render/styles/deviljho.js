'use strict';
// Boss 造型：恐暴龍 Deviljho——依原作設計（docs/bosses/deviljho.md；造型取自 MH Wiki 圖庫的 MHW 渲染圖、遊戲截圖與暴怒狀態截圖，只在瀏覽器中檢視、未複製任何圖片）：
// 一階段「飢餓的掠食者」：深苔綠灰的粗皮與鱗紋、背與尾排滿黃褐色棘刺、窄吻配上大下顎與好幾排牙、涎液不斷滴落（體力見底時喘氣、滴得更兇）、細小的前肢、粗壯的後腿與一條帶尖刺的粗尾。
// 二階段「暴怒」：筋肉鼓脹（身驅放大）、全身泛起赤紅、背脊與肩的血脈發亮、眼睛赤紅，口中溢出龍屬性的紅黑電弧；龍息時頭由右掃向左、口中紅光越蓄越亮。
// 招式姿態：啃咬張大嘴再合上並前撲、甩尾整個身體旋一圈、五連衝每一步左右甩動、鐵山靠側身撞、踩踏抬腿再重踏、投石低頭插地、咆哮仰頭、揮舞獵物（叼著小型獸龍甩）。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;

  const VIS = 1.15;                              // 視覺放大：判定半徑不變
  const TRIG = { hit: 1, dash: 1, lob: 1, zone: 1 };
  const P1 = { base: '#4f5f48', lite: '#7d8e66', dark: '#2a3326', line: '#141a12' };   // 深苔綠灰
  const P2 = { base: '#7a4a34', lite: '#c06a42', dark: '#3a1a14', line: '#1a0806' };   // 暴怒：皮膚泛紅
  const SPINE = '#cdb67c', SPINE_D = '#7a6638', CLAW = '#d08a74', TOOTH = '#efe3c4', MOUTH = '#a8283a', DROOL = '#d7e68a', PREY = '#b8864a';
  const ease = (u) => 1 - (1 - u) * (1 - u);
  const clamp = U.clamp;

  // 以 (x,y) 為底邊中心、朝角度 a 伸出 len 的三角棘刺
  function spike(g, x, y, a, len, w, fill, edge) {
    const c = Math.cos(a), s = Math.sin(a), px = -s * w / 2, py = c * w / 2;
    g.beginPath(); g.moveTo(x + px, y + py); g.lineTo(x + c * len, y + s * len); g.lineTo(x - px, y - py); g.closePath();
    g.fillStyle = fill; g.fill(); g.strokeStyle = edge; g.lineWidth = 1; g.stroke();
  }

  // 軀幹（精靈快取）：粗皮與鱗紋、肩部肌肉、背脊上成排的棘刺；暴怒時身驅鼓脹、改為赤褐皮
  function torso(ctx, r, p2) {
    R.blit(ctx, 'body:deviljho:torso:' + (p2 ? 2 : 1) + ':' + r, r * 3.6 + 16, r * 2.6 + 16, r * 2.0 + 8, r * 1.3 + 8, (g) => {
      const S = p2 ? P2 : P1, rx = r * (p2 ? 1.5 : 1.38), ry = r * (p2 ? 0.86 : 0.7), cx = -r * 0.3;
      const gr = g.createRadialGradient(cx + r * 0.2, -r * 0.2, r * 0.1, cx, 0, rx);
      gr.addColorStop(0, S.lite); gr.addColorStop(0.6, S.base); gr.addColorStop(1, S.dark);
      g.fillStyle = gr; g.strokeStyle = S.line; g.lineWidth = 2;
      g.beginPath(); g.ellipse(cx, 0, rx, ry, 0, 0, U.TAU); g.fill(); g.stroke();
      g.save(); g.beginPath(); g.ellipse(cx, 0, rx * 0.97, ry * 0.97, 0, 0, U.TAU); g.clip();   // 鱗紋
      g.strokeStyle = hexA(S.line, 0.3); g.lineWidth = 1;
      for (let row = -6; row <= 6; row++) for (let col = -9; col <= 7; col++) {
        g.beginPath(); g.arc(cx + col * r * 0.16 + (row & 1) * r * 0.08, row * r * 0.14, r * 0.07, 0.2, Math.PI - 0.2); g.stroke();
      }
      g.restore();
      for (const s of [-1, 1]) {   // 肩與背的肌肉隆起
        const mg = g.createRadialGradient(r * 0.35, s * r * 0.45, 2, r * 0.4, s * r * 0.5, r * 0.42);
        mg.addColorStop(0, hexA(S.lite, 0.9)); mg.addColorStop(1, hexA(S.base, 0));
        g.fillStyle = mg; g.beginPath(); g.arc(r * 0.4, s * r * 0.5, r * (p2 ? 0.44 : 0.36), 0, U.TAU); g.fill();
      }
      for (let i = 0; i < 12; i++) {   // 背脊的棘刺：越往後越大，左右各向外後方斜出
        const x = r * 0.55 - i * r * 0.17, len = r * (0.12 + 0.012 * i) * (p2 ? 1.15 : 1);
        for (const s of [-1, 1]) spike(g, x, s * r * 0.04, Math.PI + s * 0.55, len, r * 0.1, SPINE, SPINE_D);
      }
    });
  }

  // 尾巴（每幀）：粗壯、隨動作甩動，沿途排滿棘刺，尖端一根大棘；whip 為額外的彎曲量（甩尾時用）
  function tail(ctx, r, t, p2, whip) {
    const S = p2 ? P2 : P1, N = 12, L = r * 3.0, pts = [];
    let x = -r * 1.5, y = 0;
    pts.push({ x, y, a: Math.PI, w: r * 0.62 });
    for (let i = 1; i <= N; i++) {
      const s = i / N, a = Math.PI + (0.35 * Math.sin(t * 2 - s * 2.4) + whip) * s;
      x += Math.cos(a) * L / N; y += Math.sin(a) * L / N;
      pts.push({ x, y, a, w: r * (0.6 * (1 - s) + 0.1) });
    }
    ctx.lineCap = 'round';
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i <= N; i++) {
        const A = pts[i - 1], B = pts[i];
        if (pass === 0) { ctx.strokeStyle = S.line; ctx.lineWidth = B.w + 3; }
        else if (pass === 1) { ctx.strokeStyle = i % 2 ? S.base : S.dark; ctx.lineWidth = B.w; }
        else { ctx.strokeStyle = hexA(S.lite, 0.55); ctx.lineWidth = B.w * 0.35; }
        ctx.beginPath();
        ctx.moveTo(A.x + (pass === 2 ? -Math.sin(A.a) * A.w * 0.15 : 0), A.y + (pass === 2 ? Math.cos(A.a) * A.w * 0.15 : 0));
        ctx.lineTo(B.x + (pass === 2 ? -Math.sin(B.a) * B.w * 0.15 : 0), B.y + (pass === 2 ? Math.cos(B.a) * B.w * 0.15 : 0)); ctx.stroke();
      }
    }
    for (let i = 1; i < N; i++) {   // 尾刺
      const P = pts[i], s = i / N, len = r * (0.2 - 0.1 * s);
      for (const sd of [-1, 1]) spike(ctx, P.x, P.y, P.a + sd * 0.9, len, r * 0.12, SPINE, SPINE_D);
    }
    const E = pts[N];   // 尾端的大尖刺
    spike(ctx, E.x, E.y, E.a - 0.25, r * 0.55, r * 0.2, SPINE, SPINE_D);
    spike(ctx, E.x, E.y, E.a + 0.5, r * 0.3, r * 0.14, SPINE, SPINE_D);
  }

  // 後腿（每幀）：粗壯的大腿與三趾；lift > 0 時抬起（踩踏前搖），stride 為行走時前後擺動
  function leg(ctx, r, s, lift, stride, S) {
    const x = -r * 0.35 + stride, y = s * r * 0.8, k = 1 + 0.45 * lift;
    if (lift > 0.05) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x + r * 0.15, y + s * r * 0.12 + r * 0.2 * lift, r * 0.6 * k, r * 0.45 * k, 0, 0, U.TAU); ctx.fill(); }
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = S.base; ctx.strokeStyle = S.line; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.55, r * 0.38, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = hexA(S.lite, 0.5); ctx.beginPath(); ctx.ellipse(-r * 0.08, -s * r * 0.08, r * 0.34, r * 0.2, 0, 0, U.TAU); ctx.fill();
    for (let i = -1; i <= 1; i++) {   // 三趾 + 粉褐色爪
      const ty = i * r * 0.16 + s * r * 0.04;
      ctx.strokeStyle = S.line; ctx.lineWidth = r * 0.16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(r * 0.38, ty * 0.6); ctx.lineTo(r * 0.7, ty); ctx.stroke();
      ctx.strokeStyle = S.dark; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.moveTo(r * 0.38, ty * 0.6); ctx.lineTo(r * 0.7, ty); ctx.stroke();
      spike(ctx, r * 0.68, ty, 0.12 * i, r * 0.26, r * 0.1, CLAW, '#6a3a2e');
    }
    ctx.restore();
  }

  // 細小的前肢：reach 為前伸量（壓制獵物時伸出）
  function arm(ctx, r, s, reach, S) {
    const x0 = r * 0.52, y0 = s * r * 0.44, x1 = x0 + r * (0.22 + 0.3 * reach), y1 = s * r * (0.4 - 0.1 * reach);
    ctx.lineCap = 'round'; ctx.strokeStyle = S.line; ctx.lineWidth = r * 0.17; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = S.base; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    for (const d of [-1, 1]) spike(ctx, x1, y1, d * 0.3, r * 0.2, r * 0.07, CLAW, '#6a3a2e');
  }

  // 頭（每幀）：頸、下顎（左右兩片，jaw 0~1 張開）、嘴裡的紅肉、窄吻、眼、眉棘、鼻孔；glow > 0 時口中發出龍屬性的紅光；ex 為喘氣 / 滴涎程度
  function head(ctx, r, t, jaw, glow, p2, ex) {
    const S = p2 ? P2 : P1;
    ctx.lineCap = 'round';   // 頸：圓頭粗線，和身驅融在一起
    ctx.strokeStyle = S.line; ctx.lineWidth = r * 0.8; ctx.beginPath(); ctx.moveTo(-r * 0.8, 0); ctx.lineTo(r * 0.15, 0); ctx.stroke();
    ctx.strokeStyle = S.base; ctx.lineWidth = r * 0.74; ctx.beginPath(); ctx.moveTo(-r * 0.8, 0); ctx.lineTo(r * 0.15, 0); ctx.stroke();
    ctx.strokeStyle = hexA(S.lite, 0.35); ctx.lineWidth = r * 0.3; ctx.beginPath(); ctx.moveTo(-r * 0.75, -r * 0.08); ctx.lineTo(r * 0.1, -r * 0.08); ctx.stroke();
    ctx.save(); ctx.translate(r * 0.3, 0); ctx.scale(1.3, 1.3);
    const ja = jaw * 0.75;
    if (jaw > 0.06) {   // 嘴裡
      const mg = ctx.createLinearGradient(0, 0, r * 0.9, 0); mg.addColorStop(0, '#5a0e1c'); mg.addColorStop(1, MOUTH);
      ctx.fillStyle = mg; ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(r * 0.85, -r * (0.05 + jaw * 0.36)); ctx.lineTo(r * 0.95, 0); ctx.lineTo(r * 0.85, r * (0.05 + jaw * 0.36)); ctx.lineTo(0, r * 0.2); ctx.closePath(); ctx.fill();
    }
    for (const s of [-1, 1]) {   // 下顎：左右兩片；牙齒排在內緣
      ctx.save(); ctx.translate(r * 0.02, s * r * 0.27); if (s < 0) ctx.scale(1, -1); ctx.rotate(ja);
      ctx.fillStyle = S.base; ctx.strokeStyle = S.line; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.11); ctx.lineTo(r * 0.45, -r * 0.13); ctx.lineTo(r * 0.85, -r * 0.06); ctx.lineTo(r * 0.97, 0); ctx.lineTo(r * 0.8, r * 0.07); ctx.lineTo(r * 0.4, r * 0.11); ctx.lineTo(0, r * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = hexA(S.lite, 0.5); ctx.beginPath(); ctx.moveTo(0.02 * r, r * 0.04); ctx.lineTo(r * 0.7, r * 0.03); ctx.lineTo(r * 0.55, r * 0.09); ctx.lineTo(0.02 * r, r * 0.1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = TOOTH; ctx.strokeStyle = '#6a5a3a'; ctx.lineWidth = 0.7;
      for (let i = 0; i < 7; i++) { const x = r * (0.1 + i * 0.12), h = r * (0.15 + 0.05 * (i % 2)); ctx.beginPath(); ctx.moveTo(x, -r * 0.1); ctx.lineTo(x + r * 0.05, -r * 0.1 - h); ctx.lineTo(x + r * 0.11, -r * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }
    if (glow > 0.02) {   // 口中的龍屬性紅光 + 電弧
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hexA('#d0143c', 0.55 * glow); ctx.beginPath(); ctx.arc(r * 0.6, 0, r * (0.18 + 0.32 * glow), 0, U.TAU); ctx.fill();
      ctx.fillStyle = hexA('#ffd9df', 0.8 * glow); ctx.beginPath(); ctx.arc(r * 0.62, 0, r * (0.06 + 0.12 * glow), 0, U.TAU); ctx.fill();
      ctx.strokeStyle = hexA('#ff5a78', 0.8 * glow); ctx.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) { const a = (BD.vrng() - 0.5) * 2.2; ctx.beginPath(); ctx.moveTo(r * 0.6, 0); ctx.lineTo(r * 0.6 + Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4); ctx.lineTo(r * 0.6 + Math.cos(a + 0.5) * r * 0.7, Math.sin(a + 0.5) * r * 0.55); ctx.stroke(); }
      ctx.restore();
    }
    const hg = ctx.createLinearGradient(-r * 0.2, 0, r * 1.0, 0); hg.addColorStop(0, S.base); hg.addColorStop(1, S.dark);   // 窄吻（上顎）
    ctx.fillStyle = hg; ctx.strokeStyle = S.line; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-r * 0.22, 0); ctx.bezierCurveTo(-r * 0.22, -r * 0.38, r * 0.35, -r * 0.36, r * 0.6, -r * 0.22); ctx.quadraticCurveTo(r * 0.95, -r * 0.1, r * 1.06, 0); ctx.quadraticCurveTo(r * 0.95, r * 0.1, r * 0.6, r * 0.22); ctx.bezierCurveTo(r * 0.35, r * 0.36, -r * 0.22, r * 0.38, -r * 0.22, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = hexA(S.line, 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(r * 0.1, 0); ctx.lineTo(r * 0.9, 0); ctx.stroke();   // 鼻樑
    ctx.fillStyle = '#0c0a08'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(r * 0.88, s * r * 0.06, r * 0.025, 0, U.TAU); ctx.fill(); }   // 鼻孔
    for (const s of [-1, 1]) {   // 眉棘與眼
      spike(ctx, r * 0.12, s * r * 0.3, Math.PI * (s > 0 ? 0.5 : -0.5) + s * -0.9, r * 0.2, r * 0.1, SPINE, SPINE_D);
      spike(ctx, r * 0.3, s * r * 0.3, Math.PI * (s > 0 ? 0.5 : -0.5) + s * -0.7, r * 0.16, r * 0.09, SPINE, SPINE_D);
      ctx.fillStyle = p2 ? '#ff3a2a' : '#e8c24a'; ctx.strokeStyle = '#1a0c08'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(r * 0.42, s * r * 0.27, r * 0.07, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#100808'; ctx.beginPath(); ctx.ellipse(r * 0.43, s * r * 0.27, r * 0.015, r * 0.05, 0, 0, U.TAU); ctx.fill();
      if (p2) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = hexA('#ff3a2a', 0.5); ctx.beginPath(); ctx.arc(r * 0.42, s * r * 0.27, r * 0.15, 0, U.TAU); ctx.fill(); ctx.restore(); }
    }
    // 涎液：從下顎尖端滴落，向外飄開並淡出；體力見底時更多
    const n = ex > 0.5 ? 5 : 3;
    for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
      const u = (t * (0.8 + 0.6 * ex) + i * 0.37 + (s > 0 ? 0.5 : 0)) % 1, jy = s * (r * 0.12 + jaw * r * 0.36);
      const dx = r * (0.88 - 0.25 * u), dy = jy + s * r * 0.3 * u;
      ctx.strokeStyle = hexA(DROOL, 0.3 * (1 - u)); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(r * 0.9, jy); ctx.lineTo(dx, dy); ctx.stroke();
      ctx.fillStyle = hexA(DROOL, 0.8 * (1 - u)); ctx.beginPath(); ctx.arc(dx, dy, r * 0.04 * (1 - 0.5 * u), 0, U.TAU); ctx.fill();
    }
    ctx.restore();
  }

  // 被叼著甩的獵物（小型獸龍的剪影）：以嘴為軸心，ang 為相對面向的擺動角
  function prey(ctx, r, ang) {
    ctx.save(); ctx.rotate(ang);
    ctx.fillStyle = PREY; ctx.strokeStyle = '#4a3016'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(r * 0.62, 0, r * 0.62, r * 0.22, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = hexA('#4a3016', 0.6); ctx.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(r * (0.25 + i * 0.22), -r * 0.2); ctx.lineTo(r * (0.3 + i * 0.22), r * 0.2); ctx.stroke(); }
    ctx.fillStyle = '#8a5e30'; ctx.beginPath(); ctx.moveTo(r * 1.2, 0); ctx.lineTo(r * 1.5, -r * 0.1); ctx.lineTo(r * 1.5, r * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();   // 尾巴
    ctx.strokeStyle = '#4a3016'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(r * 0.5, s * r * 0.18); ctx.lineTo(r * 0.55, s * r * 0.42); ctx.stroke(); }   // 垂下的腳
    ctx.restore();
  }

  function drawBody(ctx, o, t, { r }) {
    const p2 = o.phase === 2, S = p2 ? P2 : P1, rageK = o.rageK || 0;
    const inst = o.inst && o.inst.skill && o.inst.v && o.inst.v.actions ? o.inst : null;
    const sid = inst ? inst.skill.id : '', ult = !!(inst && inst.skill.ult);
    let wd = 0, sn = 0, hitI = 0, cur = null, nDone = 0;
    if (inst) { const p = R.skillPace(inst, TRIG); wd = p.snap > 0 ? 0 : p.wind; sn = p.snap; hitI = p.i; cur = p.a; nDone = p.n; }
    const sp = o.vx != null ? clamp(Math.hypot(o.vx, o.vy) / (o.def.speed || 200), 0, 1.4) : 0;
    const exhausted = o.maxSta ? clamp(1 - (o.sta / o.maxSta) / 0.3, 0, 1) : 0;

    // 姿態參數
    let jaw = 0.1 + 0.04 * Math.sin(t * 3) + exhausted * 0.14 * (0.5 + 0.5 * Math.sin(t * 9)), glow = 0, headX = 0, headRot = 0, headY = 0;
    let bodyRot = 0, roll = 0, tailWhip = 0, liftR = 0, liftL = 0, armReach = 0, shake = 0, preyAng = null, scaleB = 1 + 0.1 * rageK;
    const bite = sid === 'snap' || sid === 'jump_bite' || (ult && !p2 && sid === 'ult');
    if (bite && inst) { jaw = wd > 0 ? 0.12 + 0.85 * wd : 0.12; headX = r * (-0.1 * wd + 0.35 * sn); armReach = sid === 'jump_bite' ? 1 : sn; }
    else if (sid === 'tail_spin') {
      const hits = inst.v.actions.filter((a) => a.do === 'hit');
      let th = null; for (const a of hits) if (inst.t >= a.at - 0.25) th = a.at;
      if (th != null) bodyRot = U.TAU * ease(clamp((inst.t - (th - 0.25)) / 0.5, 0, 1));
      jaw = 0.35; tailWhip = -0.5 * wd;
    } else if (sid === 'five_step') { roll = (nDone % 2 ? 1 : -1) * (inst.dash ? 0.32 : 0.1); headX = inst.dash ? r * 0.18 : -r * 0.06 * wd; jaw = 0.4; }
    else if (sid === 'hipcheck') { bodyRot = 0.85 * ((inst.dash || sn > 0) ? 1 : wd); jaw = 0.25; tailWhip = 0.3 * bodyRot; }
    else if (sid === 'quake_stomp' || sid === 'stomp_blast') {
      const w = cur && cur.do === 'hit' && cur.shape === 'circle' ? wd : 0, side = hitI % 2 ? -1 : 1;
      if (side > 0) liftR = w; else liftL = w;
      shake = sn * 5; headY = -r * 0.04 * w;
    } else if (sid === 'rock_fling') { headX = r * (0.2 * wd - 0.25 * sn); jaw = 0.1 + 0.6 * sn; headY = r * 0.05 * wd; }
    else if (sid === 'cower_rush') { headX = inst.dash ? r * 0.22 : -r * 0.1 * wd; jaw = 0.45 * (wd > 0 ? wd : 0.4); roll = inst.dash ? 0.06 * Math.sin(t * 40) : 0; }
    else if (sid === 'roar') { jaw = 1; headY = -r * 0.04; shake = 2.5 + 3 * sn; headX = -r * 0.1; }
    else if (sid === 'drool_pool') { jaw = 0.6 * (wd > 0 ? wd : sn); headX = r * 0.1 * wd; }
    else if (sid === 'prey_swing') {
      const T1 = 0.55, T2 = 1.15, T3 = 1.85, it = inst.t;
      preyAng = it < T1 ? U.lerp(1.2, -1.3, ease(clamp(it / T1, 0, 1))) : it < T2 ? U.lerp(-1.3, 1.4, ease((it - T1) / (T2 - T1))) : it < T3 ? U.lerp(1.4, 0, ease((it - T2) / (T3 - T2))) : null;
      jaw = preyAng == null ? (wd > 0 ? 0.12 + 0.85 * wd : 0.12) : 0.18; headRot = preyAng == null ? 0 : -preyAng * 0.25; headX = preyAng == null ? r * 0.35 * sn : 0;
    } else if (inst && (sid === 'dragon_breath' || (ult && p2))) {
      jaw = 1; glow = Math.max(0.35, wd > 0 ? wd : 1);
      const lead = inst.v.actions.find((a) => a.angOff != null), a0 = lead ? lead.angOff : 0;
      headRot = clamp((cur && cur.angOff != null ? cur.angOff : a0) * 0.45, -1.1, 1.1);
      headX = -r * 0.14 * (wd > 0 ? wd : 0.4); shake = 1.8;
    }
    if (p2 && glow < 0.18) glow = 0.12 + 0.05 * Math.sin(t * 7);   // 暴怒時口中總有一絲龍屬性能量

    if (shake) ctx.translate((BD.vrng() - 0.5) * shake, (BD.vrng() - 0.5) * shake);
    if (scaleB !== 1) ctx.scale(scaleB, scaleB);
    if (bodyRot) ctx.rotate(bodyRot);
    if (roll) ctx.rotate(roll);
    if (bodyRot > 0 && sid === 'tail_spin' && bodyRot < U.TAU - 0.05) {   // 旋身的殘影弧
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA('#e8e0c0', 0.3); ctx.lineWidth = r * 0.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, r * 2.1, Math.PI - 1.2, Math.PI + 1.2); ctx.stroke(); ctx.restore();
    }

    // 1. 暴怒的熱氣與龍屬性氣場
    if (p2) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const pulse = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.fillStyle = hexA('#d0143c', 0.1 + 0.06 * pulse); ctx.beginPath(); ctx.ellipse(-r * 0.3, 0, r * 2.2, r * 1.4, 0, 0, U.TAU); ctx.fill();
      ctx.restore();
    }

    // 2. 尾 → 腿 → 軀幹 → 前肢 → 頭（由下到上）
    tail(ctx, r, t, p2, tailWhip);
    const stride = Math.sin(t * 9) * r * 0.28 * sp + (sid === 'five_step' && inst.dash ? Math.sin(t * 30) * r * 0.25 : 0);
    leg(ctx, r, -1, liftL, stride, S); leg(ctx, r, 1, liftR, -stride, S);
    torso(ctx, r, p2);
    if (rageK > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = hexA('#e8402a', 0.35 * rageK); ctx.beginPath(); ctx.ellipse(-r * 0.2, 0, r * 1.2, r * 0.82, 0, 0, U.TAU); ctx.fill(); ctx.restore(); }
    if (p2) {   // 赤紅的血脈與背脊發光（加法混色，隨呼吸脈動）
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const pl = 0.5 + 0.5 * Math.sin(t * 4);
      ctx.strokeStyle = hexA('#ff5a30', 0.35 + 0.25 * pl); ctx.lineWidth = r * 0.05; ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const x = r * 0.45 - i * r * 0.3;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, s * r * 0.05); ctx.quadraticCurveTo(x - r * 0.12, s * r * 0.35, x - r * 0.28, s * r * (0.55 + 0.08 * ((i * 5) % 3))); ctx.stroke(); }
      }
      for (let i = 0; i < 9; i++) { ctx.fillStyle = hexA('#ff7a40', 0.12 + 0.1 * Math.sin(t * 5 + i)); ctx.beginPath(); ctx.arc(r * 0.55 - i * r * 0.19, 0, r * 0.16, 0, U.TAU); ctx.fill(); }
      ctx.restore();
    }
    arm(ctx, r, -1, armReach, S); arm(ctx, r, 1, armReach, S);

    // 3. 頭（以頸根為軸，龍息時整顆頭由右掃向左；叼獵物時獵物接在嘴上）
    ctx.save();
    ctx.translate(r * 0.7 + headX, headY); ctx.rotate(headRot);
    head(ctx, r, t, clamp(jaw, 0, 1), glow, p2, exhausted);
    if (preyAng != null) { ctx.save(); ctx.translate(r * 1.25, 0); prey(ctx, r, preyAng); ctx.restore(); }
    ctx.restore();
  }

  R.defineBossStyle('deviljho', {
    body(ctx, o, t, args) { ctx.save(); ctx.lineWidth = 1; drawBody(ctx, o, t, Object.assign({}, args, { r: args.r * VIS })); ctx.restore(); },
    // 跳躍砸地的滯空：看不到本體，只剩落點不斷放大的陰影與揚起的塵
    hidden(ctx, b, t) {
      const inst = b.inst, m = inst && inst.marks && (inst.marks.S || inst.marks.F);
      if (!m) return;
      const k = clamp((inst.t - 0.3) / 1.1, 0, 1);
      ctx.fillStyle = `rgba(0,0,0,${0.12 + 0.3 * k})`; ctx.beginPath(); ctx.ellipse(m.x, m.y, b.r * (0.5 + 1.9 * k), b.r * (0.4 + 1.5 * k), 0, 0, U.TAU); ctx.fill();
    },
    // 換階段：全身發抖、赤紅逐漸蓋過皮膚、身驅膨脹；咆哮（龍屬性炸開）後改成暴怒外觀
    transition(ctx, b, t) {
      const at = b.roarAt || 1.8, cracking = b.stateT < at, k = clamp(b.stateT / at, 0, 1), j = cracking ? k * 6 : 0;
      T.x = b.x + (BD.vrng() - 0.5) * j; T.y = b.y + (BD.vrng() - 0.5) * j; T.face = b.face; T.r = b.r; T.def = b.def;
      T.phase = cracking ? 1 : 2; T.rageK = cracking ? k : 0; T.sta = b.sta; T.maxSta = b.maxSta;
      R.drawBossBody(ctx, T, t);
      return true;
    },
  });
  const T = { x: 0, y: 0, face: 0, r: 0, def: null, phase: 1, rageK: 0, inst: null, sta: 1, maxSta: 1 };
})(typeof window !== 'undefined' ? window : globalThis);
