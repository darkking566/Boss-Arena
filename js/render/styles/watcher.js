'use strict';
// Boss 造型：深淵監視者：破爛披風、格擋匕首、狼血印記、大劍（二階段燃火）、兜帽紅眼
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  R.defineBossStyle('watcher', {
    body(ctx, o, t, { def, r, st, act, swing }) {
      const p2 = o.phase === 2, sway = Math.sin(t * 4) * 0.2;
      // 破爛披風
      ctx.fillStyle = p2 ? '#1a0f10' : '#1c1d26';
      ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.95);
      for (let i = 0; i <= 6; i++) { const yy = -r * 0.95 + i * (r * 1.9 / 6); ctx.lineTo(-r * (1.45 + (i % 2 ? 0.4 : 0) + sway * (i / 6)), yy); }
      ctx.lineTo(-r * 0.1, r * 0.95); ctx.closePath(); ctx.fill();
      if (p2) { ctx.strokeStyle = `rgba(255,120,40,${0.5 + 0.3 * Math.sin(t * 9)})`; ctx.lineWidth = 1.5; ctx.stroke(); }
      // 格擋匕首（左手）
      ctx.strokeStyle = '#bfc3cc'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.85); ctx.lineTo(r * 1.1, -r * 1.0); ctx.stroke();
      ctx.strokeStyle = '#5a4030'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r * 0.15, -r * 0.82); ctx.lineTo(r * 0.35, -r * 0.86); ctx.stroke();
      // 鎧甲圓盤（徑向漸層 + 同一路徑外框）以精靈快取
      R.blit(ctx, 'body:watcher:armor:' + o.phase + ':' + r + ':' + def.color2, r * 2 + 8, r * 2 + 8, r + 4, r + 4, (g) => {
        // 精靈繪製回呼，每種樣式只建立一次
        const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r); gr.addColorStop(0, '#565a68'); gr.addColorStop(1, def.color2);
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, U.TAU); g.fill(); g.strokeStyle = '#0c0c12'; g.lineWidth = 2; g.stroke();
      });
      // 狼血印記
      ctx.strokeStyle = '#8a1020'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-r * 0.35, 0, r * 0.42, 1.9, 4.4); ctx.stroke();
      ctx.fillStyle = '#8a1020'; ctx.beginPath(); ctx.arc(-r * 0.62, 0, 2.5, 0, U.TAU); ctx.fill();
      // 大劍（右手）
      const drawn = o.inst || st === 'feint';
      const ga = drawn ? (o.inst ? -1.0 + act * 2.4 : -0.7) : 0.55;
      ctx.save(); ctx.translate(r * 0.2, r * 0.7); ctx.rotate(ga);
      const L = r * 2.5;
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
      ctx.fillStyle = '#d9dde6';
      ctx.beginPath(); ctx.moveTo(r * 0.35, -3.8); ctx.lineTo(L - 6, -3.8); ctx.lineTo(L + 4, 0); ctx.lineTo(L - 6, 3.8); ctx.lineTo(r * 0.35, 3.8); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#2a2a33'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r * 0.35, -8); ctx.lineTo(r * 0.35, 8); ctx.stroke();
      ctx.strokeStyle = '#4a3020'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.33, 0); ctx.stroke();
      if (p2) for (let i = 0; i < 6; i++) {
        const fx0 = r * (0.5 + i * 0.36), fl = 0.5 + 0.5 * Math.sin(t * 20 + i * 1.7);
        ctx.fillStyle = `rgba(255,${180 + i * 10},60,${0.7 * fl})`; ctx.beginPath(); ctx.arc(fx0, -4 - fl * 5, 3 + fl * 3, 0, U.TAU); ctx.fill();
      }
      ctx.restore();
      // 兜帽與紅眼
      ctx.fillStyle = '#14151c'; ctx.beginPath(); ctx.arc(r * 0.18, 0, r * 0.62, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.4); ctx.lineTo(-r * 0.9, 0); ctx.lineTo(-r * 0.25, r * 0.4); ctx.closePath(); ctx.fill();
      // 紅眼（固定區域座標 + 陰影）：依 rogue / 半徑快取，精靈框含 16px 陰影
      const er = o.rogue ? 3.2 : 2.6;
      R.blit(ctx, 'body:watcher:eyes:' + (o.rogue ? 'rogue' : 'boss') + ':' + r, r * 0.3 + 44, r * 0.56 + 44, r * 0.1 + 22, r * 0.28 + 22, (g) => {
        g.shadowColor = '#ff2020'; g.shadowBlur = o.rogue ? 16 : 10; g.fillStyle = o.rogue ? '#ff1a1a' : '#ff4a3a';
        g.beginPath(); g.arc(r * 0.55, -r * 0.17, er, 0, U.TAU); g.arc(r * 0.55, r * 0.17, er, 0, U.TAU); g.fill();
      });
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
