'use strict';
// Boss 造型：深淵監視者：破爛披風、格擋匕首、狼血印記、大劍（二階段燃火）、兜帽紅眼；
// 依招式擺出姿勢（大劍左右交替橫斬 / 後拉突刺 / 旋風 / 高舉下劈 / 低身突進 / 後空翻縮身 / 匕首前架 / 舉劍嚎叫），揮劍時留下劍弧殘影
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;

  const TRIG = { hit: 1, dash: 1, proj: 1, summon: 1, hide: 1 };
  const REST = 0.55; // 大劍待機角（右前下）
  function poseOf(id, a) {
    if (id === 'parry') return 'guard';
    if (!a) return null;
    if (a.do === 'dash') return a.dir === 'back' ? 'flip' : 'lunge';
    if (a.do === 'summon') return 'howl';
    if (a.do === 'hide') return 'overhead';
    if (a.do === 'proj' || a.shape === 'cone') return 'slash';
    if (a.shape === 'rect') return 'thrust';
    return a.off || a.anchor === 'mark' ? 'overhead' : 'spin';
  }
  const ease = (u) => 1 - (1 - u) * (1 - u);
  // 大劍姿勢（重用物件）：ga 角度、tx 握點前後位移、fs 劍長縮放（高舉時透視縮短）、s0 / sa 劍弧殘影起點與透明度、
  // lean 身體前傾、dag 匕首前架、sc 身體縮放、eye 紅眼加亮
  const W = { ga: REST, tx: 0, fs: 1, s0: 0, sa: 0, lean: 0, dag: 0, sc: 1, eye: 0 };
  const SPIN2 = U.TAU - 0.3; // 二階段迴旋斬的刀光拖滿近一整圈（火環）
  // 熔岩裂紋折線（單位為半徑 r；披風用 -x 方向，鎧甲用 x/y 原值）
  const CAPE_CRACKS = [[[0.3, -0.7], [0.55, -0.5], [0.5, -0.25], [0.85, -0.1]], [[0.35, 0.1], [0.7, 0.3], [0.6, 0.55], [1.0, 0.75]], [[0.9, -0.55], [1.15, -0.4], [1.1, -0.2]]];
  const ARMOR_CRACKS = [[[-0.2, -0.7], [-0.05, -0.5], [-0.18, -0.3], [0, -0.1]], [[0.4, -0.6], [0.3, -0.4], [0.45, -0.2]], [[-0.6, 0.2], [-0.4, 0.35], [-0.5, 0.6]],
    [[0.1, 0.5], [0.25, 0.35], [0.15, 0.15], [0.35, 0]], [[-0.45, -0.25], [-0.3, -0.1], [-0.55, 0.05]], [[0.55, 0.3], [0.4, 0.5]], [[-0.1, 0.75], [0.05, 0.62]]];
  function pose(r, mode, i, wd, sn, dashing, p2) {
    W.ga = REST; W.tx = 0; W.fs = 1; W.s0 = 0; W.sa = 0; W.lean = 0; W.dag = 0; W.sc = 1; W.eye = 0;
    const hold = Math.min(1, wd / 0.5), sw = wd < 0.65 ? 0 : ease((wd - 0.65) / 0.35); // 先擺架勢，最後 35% 揮出
    if (mode === 'slash') {
      const A = i % 2 ? -1.2 : 1.7, B = i % 2 ? 1.5 : -1.3;
      if (sn > 0) { W.ga = REST + (B - REST) * sn; W.s0 = A; W.sa = 0.28 * sn; }
      else if (sw > 0) { W.ga = A + (B - A) * sw; W.s0 = A; W.sa = 0.28; }
      else W.ga = REST + (A - REST) * hold;
      W.lean = r * 0.12 * Math.max(sw, sn);
    } else if (mode === 'thrust') {
      W.ga = sn > 0 ? 0 : REST * (1 - hold);
      W.tx = sn > 0 ? r * 0.5 * sn : -r * 0.35 * hold + r * 0.85 * sw;
      W.lean = W.tx * 0.4;
    } else if (mode === 'spin') {
      const A = 2.2;
      const span = p2 ? SPIN2 : 2.5;
      if (sn > 0) { W.ga = A; W.s0 = A - span; W.sa = 0.28 * sn; }
      else if (sw > 0) { W.ga = A + U.TAU * sw; W.s0 = W.ga - Math.min(span, U.TAU * sw); W.sa = 0.28; }
      else W.ga = REST + (A - REST) * hold;
    } else if (mode === 'overhead') {
      W.ga = 0.2 * (1 - sw); W.fs = sn > 0 ? 1 + 0.15 * sn : 1 - 0.55 * hold + 0.7 * sw;
      W.lean = r * 0.15 * Math.max(sw, sn);
    } else if (mode === 'lunge') {
      if (dashing || sn > 0) { W.ga = 0; W.tx = r * 0.4; W.fs = 1.1; W.lean = r * 0.15; }
      else { W.ga = REST + (2.6 - REST) * hold; W.tx = -r * 0.2 * hold; }
    } else if (mode === 'flip') {
      W.ga = 1.2; if (dashing) W.sc = 0.8;
    } else if (mode === 'guard') {
      W.dag = 1; W.ga = 1.0;
    } else if (mode === 'howl') {
      W.ga = 0.1; W.fs = 1 - 0.55 * Math.max(hold, sn); W.eye = Math.max(wd, sn);
    }
    return W;
  }

  const TB = {}; // 轉場繪製用的重用物件
  // 全場狼血流光：十二道暗紅血線由外圍向倒地的 Boss 收束，帶一顆亮頭
  function streams(ctx, b, t, k) {
    const r = b.r, fade = U.clamp(k * 3, 0, 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 12; i++) {
      const a0 = i * 2.399 + 0.5, d0 = r * (5 + (i * 5) % 4), sw = i % 2 ? 0.9 : -0.9, qh = (t * 0.8 + i * 0.083) % 1;
      if (qh <= 0.02) continue;
      const pts = [];
      for (let s = 0; s <= 6; s++) { const q = Math.max(0, qh - 0.24 * s / 6), rr = d0 * (1 - q * q), an = a0 + sw * q; pts.push(b.x + Math.cos(an) * rr, b.y + Math.sin(an) * rr); }
      for (const [col, lw] of [[`rgba(170,10,30,${0.35 * fade})`, 6], [`rgba(255,70,70,${0.75 * fade})`, 1.8]]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
        for (let s = 1; s <= 6; s++) ctx.lineTo(pts[s * 2], pts[s * 2 + 1]);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(255,150,120,${0.9 * fade})`; ctx.beginPath(); ctx.arc(pts[0], pts[1], 3, 0, U.TAU); ctx.fill();
    }
    ctx.restore();
  }
  // 血色荊棘藤蔓：自 Boss 身下向四周蔓延、彎曲生刺，起身時退去
  function vines(ctx, b, t, k, alpha) {
    if (alpha <= 0.01) return;
    const r = b.r, grow = 1 - (1 - U.clamp(k, 0, 1)) * (1 - U.clamp(k, 0, 1)), len = r * (1.2 + 3.6 * grow);
    ctx.save(); ctx.globalAlpha = alpha * 0.9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 8; i++) {
      const an = i * 0.785 + 0.3, nx = -Math.sin(an), ny = Math.cos(an), pts = [];
      for (let s = 0; s <= 10; s++) { const f = s / 10, off = Math.sin(f * 5 + i + t * 1.5) * r * 0.35 * f; pts.push(b.x + Math.cos(an) * len * f + nx * off, b.y + Math.sin(an) * len * f + ny * off); }
      ctx.strokeStyle = '#3a0410'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
      for (let s = 1; s <= 10; s++) ctx.lineTo(pts[s * 2], pts[s * 2 + 1]);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200,30,50,0.8)'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath();
      for (let s = 2; s <= 10; s += 2) { const x = pts[s * 2], y = pts[s * 2 + 1], sd = s % 4 ? 1 : -1; ctx.moveTo(x, y); ctx.lineTo(x + nx * sd * 7, y + ny * sd * 7); }
      ctx.stroke();
    }
    ctx.restore();
  }

  R.defineBossStyle('watcher', {
    body(ctx, o, t, { def, r, st, act }) {
      const p2 = o.phase === 2, inst = o.inst;
      let mode = null, p = null;
      // 召喚同伴只傳簡化的 inst（沒有時間軸）：沿用舊的整段揮劍
      if (inst && inst.skill && inst.v && inst.v.actions) { p = R.skillPace(inst, TRIG); mode = poseOf(inst.skill.id, p.a); }
      const w = mode ? pose(r, mode, p.i, p.snap > 0 ? 0 : p.wind, p.snap, !!inst.dash, p2) : null;
      const ign = o.ign == null ? 1 : o.ign; // 二階段起身時，薪火自劍柄燒向劍尖（0→1）
      const sway = Math.sin(t * 4) * 0.2 + (inst && inst.dash ? 0.35 : 0);
      if (w) { ctx.save(); ctx.translate(w.lean, 0); if (w.sc !== 1) ctx.scale(w.sc, w.sc); }
      // 破爛披風（衝刺時飄得更開）
      ctx.fillStyle = p2 ? '#8a2a12' : '#6a1218'; // 一階段暗紅披風；二階段燒成餘燼紅
      ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.95);
      for (let i = 0; i <= 6; i++) { const yy = -r * 0.95 + i * (r * 1.9 / 6); ctx.lineTo(-r * (1.45 + (i % 2 ? 0.4 : 0) + sway * (i / 6)), yy); }
      ctx.lineTo(-r * 0.1, r * 0.95); ctx.closePath(); ctx.fill();
      if (p2) {
        // 披風上的熔岩裂紋：端點隨披風擺動位移
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const pl = (0.65 + 0.35 * Math.sin(t * 5)) * ign;
        for (const cr of CAPE_CRACKS) {
          ctx.beginPath();
          cr.forEach(([cx, cy], i) => { const x = -r * (cx + sway * 0.7 * (cy + 0.95) / 1.9), y = r * cy; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
          ctx.strokeStyle = `rgba(255,120,30,${0.45 * pl})`; ctx.lineWidth = 4; ctx.stroke();
          ctx.strokeStyle = `rgba(255,220,130,${0.8 * pl})`; ctx.lineWidth = 1.4; ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = `rgba(255,120,40,${0.5 + 0.3 * Math.sin(t * 9)})`; ctx.lineWidth = 1.5; ctx.stroke();
        // 披風邊緣燃起的火舌（朝後飄）
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 7; i++) {
          const fl = 0.5 + 0.5 * Math.sin(t * 14 + i * 1.9), xx = -r * (1.5 + (i % 2 ? 0.4 : 0) + sway * (i / 6)), yy = -r * 0.9 + i * r * 0.3, h = 7 + fl * 9;
          ctx.fillStyle = `rgba(255,140,40,${0.55 + 0.3 * fl})`; ctx.beginPath(); ctx.ellipse(xx - h * 0.4, yy, h, 3.6, 0, 0, U.TAU); ctx.fill();
          ctx.fillStyle = `rgba(255,230,140,${0.5 * fl})`; ctx.beginPath(); ctx.ellipse(xx - h * 0.2, yy, h * 0.5, 1.8, 0, 0, U.TAU); ctx.fill();
        }
        ctx.restore();
      }
      // 格擋匕首（左手）：彈反架式時橫架在身前、刃上閃光
      const dg = w ? w.dag : 0;
      const d0x = r * (0.3 + 0.2 * dg), d0y = -r * (0.85 - 0.35 * dg), d1x = r * (1.1 + 0.25 * dg), d1y = -r * (1.0 - 0.9 * dg);
      ctx.strokeStyle = '#bfc3cc'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(d0x, d0y); ctx.lineTo(d1x, d1y); ctx.stroke();
      ctx.strokeStyle = '#5a4030'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(d0x - r * 0.15, d0y + r * 0.03 * (1 - dg)); ctx.lineTo(d0x + r * 0.05, d0y - r * 0.01); ctx.stroke();
      if (dg > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 14)})`; ctx.beginPath(); ctx.arc((d0x + d1x) / 2, (d0y + d1y) / 2, 3, 0, U.TAU); ctx.fill();
        ctx.restore();
      }
      // 鎧甲圓盤（徑向漸層 + 同一路徑外框）以精靈快取
      R.blit(ctx, 'body:watcher:armor:' + o.phase + ':' + r + ':' + def.color2, r * 2 + 8, r * 2 + 8, r + 4, r + 4, (g) => {
        // 精靈繪製回呼，每種樣式只建立一次
        const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r); gr.addColorStop(0, '#5f7694'); gr.addColorStop(1, def.color2);
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, U.TAU); g.fill(); g.strokeStyle = '#0c0c12'; g.lineWidth = 2; g.stroke();
      });
      // 藍鋼肩甲（持劍的右肩較大）
      ctx.fillStyle = '#41597a'; ctx.strokeStyle = '#0c0c12'; ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-r * 0.05, s * r * 0.78, r * 0.5, r * (s > 0 ? 0.34 : 0.28), 0, 0, U.TAU); ctx.fill(); ctx.stroke(); }
      if (p2) {
        // 鎧甲熔岩裂紋（精靈快取，繪製時以 additive 與脈動 alpha 疊上）
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= (0.7 + 0.3 * Math.sin(t * 5 + 1)) * ign;
        R.blit(ctx, 'body:watcher:cracks:' + r, r * 2 + 40, r * 2 + 40, r + 20, r + 20, (g) => {
          g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = '#ff8a2a'; g.shadowBlur = 8;
          for (const [col, lw] of [['rgba(255,120,30,0.8)', 3.2], ['rgba(255,225,140,1)', 1.1]]) {
            g.strokeStyle = col; g.lineWidth = lw;
            for (const cr of ARMOR_CRACKS) { g.beginPath(); cr.forEach(([x, y], i) => (i ? g.lineTo(x * r, y * r) : g.moveTo(x * r, y * r))); g.stroke(); }
          }
        });
        ctx.restore();
      }
      // 狼血印記
      ctx.strokeStyle = '#8a1020'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-r * 0.35, 0, r * 0.42, 1.9, 4.4); ctx.stroke();
      ctx.fillStyle = '#8a1020'; ctx.beginPath(); ctx.arc(-r * 0.62, 0, 2.5, 0, U.TAU); ctx.fill();
      // 大劍（右手）
      const L = r * 2.5;
      let ga = w ? w.ga : (inst || st === 'feint') ? (inst ? -1.0 + act * 2.4 : -0.7) : REST;
      const px = r * 0.2 + (w ? w.tx : 0), py = r * 0.7;
      if (w && w.sa > 0.01) {
        // 劍弧殘影：從起揮角掃到目前角的扇環
        const a0 = Math.min(w.s0, ga), a1 = Math.max(w.s0, ga);
        if (p2) {
          // 火焰刃光：外橘、中黃、內白熱三層加亮扇環，外緣比劍尖再長一截
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          for (const [ro, ri, col, k] of [[1.35, 0.45, '#ff5a14', 0.9], [1.2, 0.6, '#ffb347', 1], [1.05, 0.75, '#fff1b8', 0.8], ...(w.s0 < ga - 3 || w.s0 > ga + 3 ? [[1.5, 1.3, '#ff8a2a', 0.7]] : [])]) {
            ctx.fillStyle = hexA(col, Math.min(1, w.sa * 2.4 * k));
            ctx.beginPath(); ctx.arc(px, py, L * w.fs * ro, a0, a1); ctx.arc(px, py, L * w.fs * ri, a1, a0, true); ctx.closePath(); ctx.fill();
          }
          ctx.restore();
        } else {
          ctx.fillStyle = `rgba(220,226,240,${w.sa})`;
          ctx.beginPath(); ctx.arc(px, py, L * w.fs + 4, a0, a1); ctx.arc(px, py, L * w.fs * 0.55, a1, a0, true); ctx.closePath(); ctx.fill();
        }
      }
      ctx.save(); ctx.translate(px, py); ctx.rotate(ga); if (w && w.fs !== 1) ctx.scale(w.fs, 1);
      const burn = r * 0.45 + (L - r * 0.45) * ign; // 薪火燒到的劍長
      ctx.fillStyle = p2 ? '#3a2a2e' : '#b9c2d0'; // 二階段劍身燒成暗紅焦鐵，由熔岩裂紋撐出光
      ctx.beginPath(); ctx.moveTo(r * 0.35, -3.8); ctx.lineTo(L - 6, -3.8); ctx.lineTo(L + 4, 0); ctx.lineTo(L - 6, 3.8); ctx.lineTo(r * 0.35, 3.8); ctx.closePath(); ctx.fill();
      if (!p2) {
        ctx.strokeStyle = 'rgba(122,26,34,0.75)'; ctx.lineWidth = 1.8; // 沾血的血槽
        ctx.beginPath(); ctx.moveTo(r * 0.5, 0); ctx.lineTo(L - 10, 0); ctx.stroke();
      }
      ctx.strokeStyle = '#2a2a33'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r * 0.35, -8); ctx.lineTo(r * 0.35, 8); ctx.stroke();
      ctx.strokeStyle = '#4a3020'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.33, 0); ctx.stroke();
      if (p2) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, -60, burn, 120); ctx.clip();
        const fa = 0.55 + 0.25 * Math.sin(t * 17);
        // 外圍火光（以最大 alpha 0.8 快取，繪製時乘上 (目前 alpha / 0.8)）
        ctx.save(); ctx.globalAlpha *= fa / 0.8;
        R.blit(ctx, 'body:watcher:swordflame:' + r, r * 2.6 + 60, 24 + 60, r * 1.3 + 30, 24 / 2 + 30, (g) => {
          g.shadowColor = '#ff7a1a'; g.shadowBlur = 26;
          g.strokeStyle = 'rgba(255,140,40,0.8)'; g.lineWidth = 24; g.lineCap = 'round';
          g.beginPath(); g.moveTo(r * 0.45, 0); g.lineTo(L, 0); g.stroke();
        });
        ctx.restore();
        // 熔岩劍身：熱核直線加沿劍身折返的裂紋；揮砍時核心轉白熱
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const hot = w && w.sa > 0.01 ? 1 : 0, pl = 0.75 + 0.25 * Math.sin(t * 13);
        ctx.strokeStyle = `rgba(255,${hot ? 230 : 150},${hot ? 150 : 40},${0.85 * pl})`; ctx.lineWidth = hot ? 4 : 2.6;
        ctx.beginPath(); ctx.moveTo(r * 0.5, 0); ctx.lineTo(L - 8, 0); ctx.stroke();
        ctx.strokeStyle = `rgba(255,200,90,${0.75 * pl})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(r * 0.5, 0);
        for (let i = 1; i <= 9; i++) ctx.lineTo(r * 0.5 + (L - r * 0.5 - 8) * i / 9, (i % 2 ? -1 : 1) * (2 + (i * 7 % 3)));
        ctx.stroke();
        ctx.restore();
        for (let i = 0; i < 10; i++) {
          const fx0 = r * (0.5 + i * 0.22), fl = 0.5 + 0.5 * Math.sin(t * 20 + i * 1.7), sd = i % 2 ? 1 : -1;
          ctx.fillStyle = `rgba(255,${170 + i * 8},60,${0.8 * fl})`; ctx.beginPath(); ctx.arc(fx0, sd * (5 + fl * 7), 4 + fl * 4, 0, U.TAU); ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();
      // 兜帽與紅眼
      // 尖頂鐵盔（帽尖朝前）＋腦後兜帽布
      ctx.fillStyle = '#14151c'; ctx.beginPath(); ctx.arc(r * 0.1, 0, r * 0.55, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.4); ctx.lineTo(-r * 0.9, 0); ctx.lineTo(-r * 0.25, r * 0.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#232b3a'; ctx.beginPath(); ctx.moveTo(r * 0.95, 0); ctx.lineTo(r * 0.3, -r * 0.4); ctx.lineTo(r * 0.3, r * 0.4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#0c0c12'; ctx.lineWidth = 1.2; ctx.stroke();
      // 紅眼（固定區域座標 + 陰影）：依 rogue / 半徑快取，精靈框含 16px 陰影
      const er = o.rogue ? 3.2 : 2.6;
      // 本體盔內透出橘光（薪王之火），紅眼監視者才是血紅
      R.blit(ctx, 'body:watcher:eyes:' + (o.rogue ? 'rogue' : 'boss') + ':' + r, r * 0.3 + 44, r * 0.56 + 44, r * 0.1 + 22, r * 0.28 + 22, (g) => {
        g.shadowColor = o.rogue ? '#ff2020' : '#ff8a2a'; g.shadowBlur = o.rogue ? 16 : 10; g.fillStyle = o.rogue ? '#ff1a1a' : '#ffa040';
        g.beginPath(); g.arc(r * 0.55, -r * 0.17, er, 0, U.TAU); g.arc(r * 0.55, r * 0.17, er, 0, U.TAU); g.fill();
      });
      if (w && w.eye > 0.02) {
        // 嚎叫：紅眼爆亮
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,40,40,${0.6 * w.eye})`;
        ctx.beginPath(); ctx.arc(r * 0.55, -r * 0.17, er * (1.5 + w.eye), 0, U.TAU); ctx.arc(r * 0.55, r * 0.17, er * (1.5 + w.eye), 0, U.TAU); ctx.fill();
        ctx.restore();
      }
      if (w) ctx.restore();
    },
    // 轉場：先倒地（全場狼血流光匯入、血色荊棘蔓延、熔岩裂紋依序亮起），再以薪王之姿起身（薪火自劍柄燒向劍尖）
    transition(ctx, b, t) {
      const p2 = b.def.phase2, roar = p2.roarAt || 0.6;
      if (!p2.bloodBurst) return false;
      const r = b.r, down = b.stateT < roar, k = U.clamp(b.stateT / roar, 0, 1), u = down ? 0 : U.clamp((b.stateT - roar) / Math.max(0.1, (p2.transDur || 1.9) - roar), 0, 1);
      if (down) streams(ctx, b, t, k);
      vines(ctx, b, t, k, down ? 1 : 1 - u);
      if (down) {
        // 側躺：先畫一階段身體，後半段以二階段身體疊上做漸變（裂紋與劍火同步亮起）
        const lx = b.x - 8, ly = b.y + 4, lf = b.face + 1.3, lr = r * 0.92, v = U.clamp((k - 0.5) / 0.5, 0, 1);
        ctx.globalAlpha = 0.85;
        Object.assign(TB, { x: lx, y: ly, face: lf, r: lr, def: b.def, phase: 1, state: 'idle', inst: null, ign: 1 });
        R.drawBossBody(ctx, TB, t);
        if (v > 0) { ctx.globalAlpha = 0.85 * v; TB.phase = 2; TB.ign = v * 0.6; R.drawBossBody(ctx, TB, t); }
        ctx.globalAlpha = 1;
      } else {
        // 起身：非等比壓扁逐漸回正（同倒地起身），身體已是二階段
        const kk = 1 - u * u;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.face); ctx.scale(1 + 0.12 * kk, 1 - 0.38 * kk); ctx.rotate(-b.face); ctx.translate(-b.x, -b.y);
        Object.assign(TB, { x: b.x, y: b.y, face: b.face, r, def: b.def, phase: 2, state: 'idle', inst: null, ign: U.clamp(0.6 + u * 1.2, 0, 1) });
        R.drawBossBody(ctx, TB, t);
        ctx.restore();
      }
      return true;
    },
    // 二階段：腳下被薪火烤出的橘紅裂地光暈 + 全場飄升的餘燼（亂數只用 BD.vrng）
    under(ctx, b, t) {
      const tr = b.state === 'transition', p2 = b.def.phase2;
      if (b.state === 'dead' || (b.phase !== 2 && !tr)) return;
      const a = tr ? U.clamp((b.stateT - (p2.roarAt || 0.6)) / Math.max(0.1, (p2.transDur || 1.9) - (p2.roarAt || 0.6)), 0, 1) : 1, r = b.r;
      if (a > 0) {
        ctx.save(); ctx.translate(b.x, b.y); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * a * (0.8 + 0.2 * Math.sin(t * 7));
        R.blit(ctx, 'under:watcher:glow:' + r, r * 8 + 8, r * 8 + 8, r * 4 + 4, r * 4 + 4, (g) => {
          const gr = g.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 4);
          gr.addColorStop(0, 'rgba(255,140,40,0.55)'); gr.addColorStop(0.45, 'rgba(210,70,12,0.28)'); gr.addColorStop(1, 'rgba(120,20,0,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 4, 0, U.TAU); g.fill();
          // 放射狀熔岩裂地線
          g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = '#ff7a1a'; g.shadowBlur = 6;
          for (let i = 0; i < 9; i++) {
            const an = i * 0.698 + 0.2, len = r * (1.9 + 0.8 * ((i * 5) % 3) / 2);
            for (const [col, lw] of [['rgba(255,110,30,0.7)', 2.6], ['rgba(255,220,130,0.9)', 0.9]]) {
              g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(Math.cos(an) * r * 0.9, Math.sin(an) * r * 0.9);
              for (let s = 1; s <= 4; s++) { const d = r * 0.9 + (len - r * 0.9) * s / 4, j = (((i + s) * 7) % 5 - 2) * 0.09; g.lineTo(Math.cos(an + j) * d, Math.sin(an + j) * d); }
              g.stroke();
            }
          }
        });
        ctx.restore();
      }
      const w = b.world;
      if (w && w.fx && BD.element && BD.vrng() < (tr ? 0.9 : 0.5)) {
        const E = BD.element('fire'), sp = r * 7;
        w.fx.motes(b.x + (BD.vrng() - 0.5) * sp * 2, b.y + (BD.vrng() - 0.5) * sp * 2, E, 1, 10, 70);
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
