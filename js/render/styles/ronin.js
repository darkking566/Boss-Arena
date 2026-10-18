'use strict';
// Boss 造型：影刃武士：飄帶、太刀、斗笠
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  R.defineBossStyle('ronin', {
    body(ctx, o, t, { def, r, st, act, swing }) {
      ctx.strokeStyle = def.color; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(-r * 0.5, s * r * 0.3);
        for (let i = 1; i <= 6; i++) ctx.lineTo(-r * 0.5 - i * 7, s * r * 0.3 + Math.sin(t * 8 + i * 0.9 + s) * i * 1.4 + s * i * 1.5);
        ctx.stroke();
      }
      // 身體圓盤（純色 + 同一路徑外框）以精靈快取
      R.blit(ctx, 'body:ronin:disc:' + o.phase + ':' + r + ':' + def.color2 + ':' + def.color, r * 2 + 8, r * 2 + 8, r + 4, r + 4, (g) => {
        g.fillStyle = def.color2; g.beginPath(); g.arc(0, 0, r, 0, U.TAU); g.fill(); g.strokeStyle = def.color; g.lineWidth = 2; g.stroke();
      });
      // 刀
      const drawn = o.inst || st === 'feint' || st === 'dodge';
      const ka = drawn ? (o.inst ? -0.9 + act * 2.6 : -0.6) : 0.9;
      ctx.save(); ctx.rotate(ka);
      if (drawn) {
        // 拔刀時的發光刀身：幾何固定（旋轉在外層），含 10px 陰影；未拔刀時無陰影，維持即時繪製
        R.blit(ctx, 'body:ronin:blade:' + o.phase + ':' + r, r * 1.8 + 40, 3 + 40, r * 1.4 + 20, 1.5 + 20, (g) => {
          g.strokeStyle = '#e9eef5'; g.lineWidth = 3; g.shadowColor = o.phase === 2 ? '#b48cff' : '#fff'; g.shadowBlur = 10;
          g.beginPath(); g.moveTo(r * 0.5, 0); g.lineTo(r * 2.3, 0); g.stroke();
        });
      } else {
        ctx.strokeStyle = '#e9eef5'; ctx.lineWidth = 3; ctx.shadowColor = o.phase === 2 ? '#b48cff' : '#fff'; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.moveTo(r * 0.5, 0); ctx.lineTo(r * 2.3, 0); ctx.stroke();
      }
      ctx.strokeStyle = '#a0413e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r * 0.1, 0); ctx.lineTo(r * 0.5, 0); ctx.stroke(); ctx.restore();
      // 斗笠（俯視）
      // 斗笠徑向漸層：維持即時繪製（會疊加在靜態身體精靈之上，非大面積昂貴來源）
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 0.95); g.addColorStop(0, '#d8b26a'); g.addColorStop(1, '#8a6a32');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-r * 0.05, 0, r * 0.88, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(60,40,10,0.6)'; ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(-r * 0.05, 0); ctx.lineTo(-r * 0.05 + Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86); ctx.stroke(); }
      ctx.fillStyle = '#5a3e14'; ctx.beginPath(); ctx.arc(-r * 0.05, 0, 3, 0, U.TAU); ctx.fill();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
