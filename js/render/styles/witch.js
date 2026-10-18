'use strict';
// Boss 造型：霜月魔女：披風、法杖冰晶、環繞冰片
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  R.defineBossStyle('witch', {
    body(ctx, o, t, { def, r, st, act, swing }) {
      const sway = Math.sin(t * 3) * 0.15;
      ctx.fillStyle = def.color2; ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.9); ctx.quadraticCurveTo(-r * 2.1, sway * r * 3, -r * 0.2, r * 0.9); ctx.closePath(); ctx.fill();
      // 身體圓盤（徑向漸層 + 同一路徑外框）以精靈快取
      R.blit(ctx, 'body:witch:disc:' + o.phase + ':' + r + ':' + def.color, r * 2 + 8, r * 2 + 8, r + 4, r + 4, (g) => {
        // 精靈繪製回呼，每種樣式只建立一次
        const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r); gr.addColorStop(0, '#d8f4ff'); gr.addColorStop(1, def.color);
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, U.TAU); g.fill(); g.strokeStyle = '#0d2238'; g.lineWidth = 2; g.stroke();
      });
      ctx.fillStyle = '#16304d'; ctx.beginPath(); ctx.moveTo(r * 1.15, 0); ctx.lineTo(-r * 0.4, -r * 0.7); ctx.lineTo(-r * 0.4, r * 0.7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#bff'; ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.18, 2.5, 0, U.TAU); ctx.arc(r * 0.35, r * 0.18, 2.5, 0, U.TAU); ctx.fill();
      const sx = r * (1.0 + (o.inst ? 0.4 * Math.max(0, swing) : 0));
      ctx.strokeStyle = '#d9c9a3'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.85); ctx.lineTo(sx + r * 0.5, r * 0.75); ctx.stroke();
      ctx.save(); ctx.translate(sx + r * 0.6, r * 0.75); ctx.rotate(t * 2);
      // 法杖冰晶（固定區域座標 + 陰影）：精靈含陰影範圍 14px
      R.blit(ctx, 'body:witch:crystal', 10 + 40, 16 + 40, 5 + 20, 8 + 20, (g) => {
        g.shadowColor = '#bff'; g.shadowBlur = 14; g.fillStyle = '#e8fdff';
        g.beginPath(); g.moveTo(0, -8); g.lineTo(5, 0); g.lineTo(0, 8); g.lineTo(-5, 0); g.closePath(); g.fill();
      });
      ctx.restore();
      ctx.rotate(-o.face);
      const n = o.phase === 2 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const a = t * 1.6 + i * U.TAU / n; ctx.save(); ctx.translate(Math.cos(a) * r * 1.6, Math.sin(a) * r * 1.6); ctx.rotate(a);
        ctx.fillStyle = 'rgba(210,245,255,0.85)'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(0, 3); ctx.lineTo(-6, 0); ctx.lineTo(0, -3); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
