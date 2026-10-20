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
  function pose(r, mode, i, wd, sn, dashing) {
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
      if (sn > 0) { W.ga = A; W.s0 = A - 2.5; W.sa = 0.28 * sn; }
      else if (sw > 0) { W.ga = A + U.TAU * sw; W.s0 = W.ga - Math.min(2.5, U.TAU * sw); W.sa = 0.28; }
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

  R.defineBossStyle('watcher', {
    body(ctx, o, t, { def, r, st, act }) {
      const p2 = o.phase === 2, inst = o.inst;
      let mode = null, p = null;
      // 召喚同伴只傳簡化的 inst（沒有時間軸）：沿用舊的整段揮劍
      if (inst && inst.skill && inst.v && inst.v.actions) { p = R.skillPace(inst, TRIG); mode = poseOf(inst.skill.id, p.a); }
      const w = mode ? pose(r, mode, p.i, p.snap > 0 ? 0 : p.wind, p.snap, !!inst.dash) : null;
      const sway = Math.sin(t * 4) * 0.2 + (inst && inst.dash ? 0.35 : 0);
      if (w) { ctx.save(); ctx.translate(w.lean, 0); if (w.sc !== 1) ctx.scale(w.sc, w.sc); }
      // 破爛披風（衝刺時飄得更開）
      ctx.fillStyle = p2 ? '#3a0c0c' : '#6a1218'; // 原作的暗紅披風
      ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.95);
      for (let i = 0; i <= 6; i++) { const yy = -r * 0.95 + i * (r * 1.9 / 6); ctx.lineTo(-r * (1.45 + (i % 2 ? 0.4 : 0) + sway * (i / 6)), yy); }
      ctx.lineTo(-r * 0.1, r * 0.95); ctx.closePath(); ctx.fill();
      if (p2) { ctx.strokeStyle = `rgba(255,120,40,${0.5 + 0.3 * Math.sin(t * 9)})`; ctx.lineWidth = 1.5; ctx.stroke(); }
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
        ctx.fillStyle = p2 ? hexA('#ff8a2a', w.sa) : `rgba(220,226,240,${w.sa})`;
        ctx.beginPath(); ctx.arc(px, py, L * w.fs + 4, a0, a1); ctx.arc(px, py, L * w.fs * 0.55, a1, a0, true); ctx.closePath(); ctx.fill();
      }
      ctx.save(); ctx.translate(px, py); ctx.rotate(ga); if (w && w.fs !== 1) ctx.scale(w.fs, 1);
      if (p2) {
        // 二階段劍上火焰：幾何固定在區域座標；以最大 alpha 0.8 快取，繪製時乘上 (目前 alpha / 0.8)
        const fa = 0.55 + 0.25 * Math.sin(t * 17);
        ctx.save(); ctx.globalAlpha *= fa / 0.8;
        R.blit(ctx, 'body:watcher:swordflame:' + r, r * 2.6 + 60, 13 + 60, r * 1.3 + 30, 13 / 2 + 30, (g) => {
          g.shadowColor = '#ff7a1a'; g.shadowBlur = 20;
          g.strokeStyle = 'rgba(255,140,40,0.8)'; g.lineWidth = 13; g.lineCap = 'round';
          g.beginPath(); g.moveTo(r * 0.45, 0); g.lineTo(L, 0); g.stroke();
        });
        ctx.restore();
      }
      ctx.fillStyle = '#b9c2d0';
      ctx.beginPath(); ctx.moveTo(r * 0.35, -3.8); ctx.lineTo(L - 6, -3.8); ctx.lineTo(L + 4, 0); ctx.lineTo(L - 6, 3.8); ctx.lineTo(r * 0.35, 3.8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(122,26,34,0.75)'; ctx.lineWidth = 1.8; // 沾血的血槽
      ctx.beginPath(); ctx.moveTo(r * 0.5, 0); ctx.lineTo(L - 10, 0); ctx.stroke();
      ctx.strokeStyle = '#2a2a33'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r * 0.35, -8); ctx.lineTo(r * 0.35, 8); ctx.stroke();
      ctx.strokeStyle = '#4a3020'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.33, 0); ctx.stroke();
      if (p2) for (let i = 0; i < 6; i++) {
        const fx0 = r * (0.5 + i * 0.36), fl = 0.5 + 0.5 * Math.sin(t * 20 + i * 1.7);
        ctx.fillStyle = `rgba(255,${180 + i * 10},60,${0.7 * fl})`; ctx.beginPath(); ctx.arc(fx0, -4 - fl * 5, 3 + fl * 3, 0, U.TAU); ctx.fill();
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
    // 倒地：身體側躺、暗紅血霧脈動，之後以薪王之姿起身
    transition(ctx, b, t) {
      if (!(b.def.phase2.bloodBurst && b.stateT < (b.def.phase2.roarAt || 0.6))) return false;
      const k = b.stateT / b.def.phase2.roarAt;
      ctx.globalAlpha = 0.85;
      R.drawBossBody(ctx, { x: b.x - 8, y: b.y + 4, face: b.face + 1.3, r: b.r * 0.92, def: b.def, phase: 1, state: 'idle', inst: null }, t);
      // 轉場動畫專用：半徑隨時間 k 成長，維持即時繪製
      const g2 = ctx.createRadialGradient(b.x, b.y, 4, b.x, b.y, b.r * (2 + k * 2));
      g2.addColorStop(0, `rgba(140,0,20,${0.35 + 0.25 * Math.sin(t * 8)})`); g2.addColorStop(1, 'rgba(60,0,10,0)');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (2 + k * 2), 0, U.TAU); ctx.fill();
      ctx.globalAlpha = 1;
      return true;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
