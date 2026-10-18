'use strict';
// Boss 造型：腐沼母巢：八足、腹部卵囊、多眼、螯牙
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  R.defineBossStyle('brood', {
    body(ctx, o, t, { def, r, st, act, swing }) {
      ctx.strokeStyle = '#2a1636'; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round';
      const moving = Math.hypot(o.vx || 0, o.vy || 0) > 20 ? 1 : 0.25;
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
        const ba = s * (0.55 + i * 0.42), ph = Math.sin(t * 10 * moving + i * 1.3 + (s > 0 ? 0 : 1.5)) * 0.25;
        const kx = Math.cos(ba + ph) * r * 1.15, ky = Math.sin(ba + ph) * r * 1.15;
        const fx2 = Math.cos(ba + ph * 1.5 + s * 0.3) * r * 1.75, fy2 = Math.sin(ba + ph * 1.5 + s * 0.3) * r * 1.75;
        ctx.beginPath(); ctx.moveTo(Math.cos(ba) * r * 0.4, Math.sin(ba) * r * 0.4); ctx.lineTo(kx, ky); ctx.lineTo(fx2, fy2); ctx.stroke();
      }
      // 腹部卵囊（徑向漸層橢圓）以精靈快取
      R.blit(ctx, 'body:brood:abdomen:' + o.phase + ':' + r + ':' + def.color2, r * 1.7 + 8, r * 1.44 + 8, r * 0.85 + 4, r * 0.72 + 4, (g) => {
        // 精靈繪製回呼，每種樣式只建立一次
        const gr = g.createRadialGradient(-r * 0.7, -r * 0.2, r * 0.075, -r * 0.5, 0, r); gr.addColorStop(0, '#7a4a8c'); gr.addColorStop(1, def.color2);
        g.fillStyle = gr; g.beginPath(); g.ellipse(-r * 0.45, 0, r * 0.85, r * 0.72, 0, 0, U.TAU); g.fill();
      });
      ctx.fillStyle = hexA(def.color, o.phase === 2 ? 0.9 : 0.6);
      for (const [sx, sy, sr] of [[-0.6, -0.3, 0.14], [-0.3, 0.25, 0.11], [-0.85, 0.15, 0.12], [-0.45, -0.05, 0.09]]) { ctx.beginPath(); ctx.arc(sx * r, sy * r, sr * r, 0, U.TAU); ctx.fill(); }
      ctx.fillStyle = '#3b2448'; ctx.beginPath(); ctx.arc(r * 0.45, 0, r * 0.5, 0, U.TAU); ctx.fill(); ctx.strokeStyle = '#1a0d22'; ctx.lineWidth = r * 0.05; ctx.stroke();
      ctx.fillStyle = def.glow;
      for (const [ex, ey] of [[0.7, -0.15], [0.7, 0.15], [0.6, -0.3], [0.6, 0.3], [0.78, 0]]) { ctx.beginPath(); ctx.arc(ex * r, ey * r, r * 0.065, 0, U.TAU); ctx.fill(); }
      ctx.strokeStyle = '#cfc'; ctx.lineWidth = r * 0.075;
      const mo = o.inst ? Math.abs(swing) * 0.4 : 0.1;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(r * 0.85, s * r * 0.15); ctx.quadraticCurveTo(r * 1.2, s * r * (0.3 + mo), r * 1.15, s * r * 0.02); ctx.stroke(); }
    },
    // 鑽地時地面隆起
    hidden(ctx, b, t) {
      if (b.state === 'skill') { ctx.fillStyle = 'rgba(60,40,20,0.5)'; ctx.beginPath(); ctx.arc(b.x + Math.sin(t * 30) * (b.r * 0.08), b.y, b.r * 0.8, 0, U.TAU); ctx.fill(); }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
