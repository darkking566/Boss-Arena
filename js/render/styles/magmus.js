'use strict';
// Boss 造型：熔岩巨像：熔岩石塊身軀、雙拳、裂紋發光
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  R.defineBossStyle('golem', {
    body(ctx, o, t, { def, r, st, act, swing }) {
      const glow = o.phase === 2 ? 1 : 0.55 + 0.2 * Math.sin(t * 4);
      for (const side of [-1, 1]) { // 拳頭
        const fx = r * 0.55 + (o.inst ? Math.max(0, swing * side) * r * 0.6 : 0), fy = side * r * 0.95;
        ctx.fillStyle = def.color2; ctx.beginPath(); ctx.arc(fx, fy, r * 0.42, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = hexA(def.glow, glow); ctx.lineWidth = r * 0.085; ctx.stroke();
      }
      // 岩塊身軀（徑向漸層 + 同一路徑外框）以精靈快取
      R.blit(ctx, 'body:golem:rock:' + o.phase + ':' + r + ':' + def.color2, r * 2 + 8, r * 2 + 8, r + 4, r + 4, (g) => {
        g.beginPath();
        for (let i = 0; i < 9; i++) { const a = i / 9 * U.TAU, rr = r * (0.92 + ((i * 7) % 3) * 0.05); i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(rr, 0); }
        g.closePath();
        // 精靈繪製回呼，每種樣式只建立一次
        const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.06, 0, 0, r); gr.addColorStop(0, '#6b3a22'); gr.addColorStop(1, def.color2);
        g.fillStyle = gr; g.fill(); g.strokeStyle = '#1a0a04'; g.lineWidth = r * 0.07; g.stroke();
      });
      ctx.strokeStyle = hexA(def.color, glow); ctx.lineWidth = r * 0.07; ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 0.2); ctx.lineTo(-r * 0.1, 0); ctx.lineTo(-r * 0.4, r * 0.45); ctx.moveTo(-r * 0.1, 0); ctx.lineTo(r * 0.3, -r * 0.35); ctx.moveTo(0, r * 0.1); ctx.lineTo(r * 0.2, r * 0.5); ctx.stroke();
      ctx.strokeStyle = hexA(def.color, glow * 0.6); ctx.lineWidth = r * 0.035; ctx.beginPath();
      ctx.moveTo(r * 0.1, -r * 0.55); ctx.lineTo(r * 0.35, -r * 0.15); ctx.lineTo(r * 0.6, -r * 0.4); ctx.moveTo(-r * 0.55, r * 0.15); ctx.lineTo(-r * 0.2, r * 0.6); ctx.stroke();
      ctx.fillStyle = o.phase === 2 ? '#fff6c0' : def.glow;
      ctx.beginPath(); ctx.arc(r * 0.55, -r * 0.22, r * 0.1, 0, U.TAU); ctx.arc(r * 0.55, r * 0.22, r * 0.1, 0, U.TAU); ctx.fill();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
