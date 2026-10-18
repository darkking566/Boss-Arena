'use strict';
// Boss 造型：訓練假人（木樁）：十字橫桿、草靶圓盤、中央木樁、同心靶環
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render;
  R.defineBossStyle('dummy', {
    body(ctx, o, t, { def, r, st }) {
      // 受擊反應：晃動與白閃（沒有 hurtFlash 的物件——例如選角肖像——照常繪製）
      const hf = o.hurtFlash > 0 ? o.hurtFlash : 0;
      ctx.save();
      if (hf > 0) ctx.translate(Math.sin(t * 90) * 3 * (hf / 0.12), 0);
      if (st === 'stagger') ctx.scale(1.08, 0.9);

      // 十字橫桿：垂直於面向（區域 y 軸）的木樑，兩端繩結
      const aw = r * 0.32;
      R.blit(ctx, 'body:dummy:cross:' + r + ':' + def.color + ':' + def.color2, r * 3.2, r * 3.2, r * 1.6, r * 1.6, (g) => {
        g.strokeStyle = def.color2; g.lineWidth = 3;
        g.fillStyle = '#a87a46';
        g.beginPath();
        if (g.roundRect) g.roundRect(-aw / 2, -r * 1.3, aw, r * 2.6, aw * 0.4);
        else g.rect(-aw / 2, -r * 1.3, aw, r * 2.6);
        g.fill(); g.stroke();
        // 木紋
        g.strokeStyle = 'rgba(70,44,20,0.45)'; g.lineWidth = 1.2;
        for (let i = -2; i <= 2; i++) {
          g.beginPath(); g.moveTo(i * aw * 0.16, -r * 1.22); g.lineTo(i * aw * 0.16, r * 1.22); g.stroke();
        }
        // 兩端繩結
        g.strokeStyle = '#c8a06a'; g.lineWidth = Math.max(1.5, aw * 0.18);
        for (const sy of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            g.beginPath(); g.moveTo(-aw * 0.6, sy * r * (1.1 + i * 0.07)); g.lineTo(aw * 0.6, sy * r * (1.1 + i * 0.07)); g.stroke();
          }
        }
        g.strokeStyle = def.color2; g.lineWidth = 3;
        g.beginPath(); g.moveTo(0, -r * 1.3); g.lineTo(0, r * 1.3); g.stroke();
      });

      // 身體：草靶圓盤（徑向漸層 + 深色外框）
      R.blit(ctx, 'body:dummy:disc:' + r + ':' + def.color + ':' + def.color2, r * 2 + 8, r * 2 + 8, r + 4, r + 4, (g) => {
        const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
        gr.addColorStop(0, '#e2c38a'); gr.addColorStop(1, def.color);
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, U.TAU); g.fill();
        g.strokeStyle = def.color2; g.lineWidth = 3; g.stroke();
        // 稻草束紋
        g.strokeStyle = 'rgba(120,86,44,0.3)'; g.lineWidth = 1;
        for (let i = 0; i < 9; i++) {
          const a = i * U.TAU / 9 + 0.2;
          g.beginPath(); g.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2);
          g.lineTo(Math.cos(a + 0.18) * r * 0.96, Math.sin(a + 0.18) * r * 0.96); g.stroke();
        }
      });

      // 靶心與木樁正面的刻度：反向旋轉回世界座標，朝向固定
      ctx.save(); ctx.rotate(-o.face);
      R.blit(ctx, 'body:dummy:target:' + r + ':' + def.color2, r * 2 + 4, r * 2 + 4, r + 2, r + 2, (g) => {
        const rings = [[0.82, '#c8323a'], [0.6, '#f2e6cc'], [0.38, '#c8323a'], [0.16, '#c8323a']];
        for (const [k, col] of rings) { g.fillStyle = col; g.beginPath(); g.arc(0, 0, r * k, 0, U.TAU); g.fill(); }
        g.strokeStyle = 'rgba(70,44,20,0.55)'; g.lineWidth = 1.2;
        for (const k of [0.71, 0.49, 0.27]) { g.beginPath(); g.arc(0, 0, r * k, 0, U.TAU); g.stroke(); }
        g.strokeStyle = 'rgba(40,24,10,0.7)'; g.lineWidth = 1.6;
        for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          g.beginPath(); g.moveTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86); g.lineTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72); g.stroke();
        }
      });
      ctx.restore();

      // 中央木樁（俯視）：較深的小圓 + 年輪（已反向旋轉回世界座標，年輪不會隨面向轉動）
      R.blit(ctx, 'body:dummy:post:' + r + ':' + def.color2, r * 0.7 + 4, r * 0.7 + 4, r * 0.35 + 2, r * 0.35 + 2, (g) => {
        g.fillStyle = '#8a6236'; g.beginPath(); g.arc(0, 0, r * 0.28, 0, U.TAU); g.fill();
        g.strokeStyle = def.color2; g.lineWidth = 1.5; g.stroke();
        g.strokeStyle = 'rgba(70,44,20,0.6)'; g.lineWidth = 1;
        for (const k of [0.2, 0.13, 0.06]) { g.beginPath(); g.arc(0, 0, r * k, 0, U.TAU); g.stroke(); }
      });

      // 白閃
      if (hf > 0) {
        ctx.fillStyle = `rgba(255,255,255,${U.clamp(hf / 0.12, 0, 1) * 0.6})`;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, U.TAU); ctx.fill();
      }
      ctx.restore();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
