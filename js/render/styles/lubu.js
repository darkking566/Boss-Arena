'use strict';
// Boss 造型：飛將呂布：半裸古銅肌肉胸膛、赤紅戰袍披風、金冠雙雉翎、方天畫戟（二階段赤兔馬戰騎剪影）
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;

  // 視覺放大：判定半徑不變，只放大繪製（戟、翎、赤兔在一般縮放下更易辨識）
  const VIS = 1.25;
  function drawBody(ctx, o, t, { def, r, st, act, swing }) {
      const p2 = o.phase === 2;

      // 1. 二階段：赤兔馬戰騎剪影（繪於身後/底層）
      if (p2) {
        // 赤兔馬身軀輪廓（以精靈快取靜態徑向漸層）
        R.blit(ctx, 'body:lubu:horse:' + r, r * 3.6 + 20, r * 1.8 + 20, r * 1.9 + 10, r * 0.9 + 10, (g) => {
          g.beginPath();
          g.moveTo(r * 1.6, 0);               // 馬吻
          g.lineTo(r * 1.45, -r * 0.22);       // 額頂
          g.lineTo(r * 1.25, -r * 0.35);       // 馬耳
          g.lineTo(r * 1.15, -r * 0.2);        // 耳根
          g.lineTo(r * 0.5, -r * 0.42);        // 頸脊
          g.lineTo(-r * 0.4, -r * 0.68);       // 側肋
          g.quadraticCurveTo(-r * 1.5, -r * 0.72, -r * 1.7, 0); // 臀部
          g.quadraticCurveTo(-r * 1.5, r * 0.72, -r * 0.4, r * 0.68);
          g.lineTo(r * 0.5, r * 0.42);
          g.lineTo(r * 1.15, r * 0.2);
          g.lineTo(r * 1.25, r * 0.35);
          g.lineTo(r * 1.45, r * 0.22);
          g.closePath();

          const gr = g.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.6);
          gr.addColorStop(0, '#9a1622');
          gr.addColorStop(1, '#48080e');
          g.fillStyle = gr;
          g.fill();
          g.strokeStyle = '#280408';
          g.lineWidth = 2.5;
          g.stroke();
        });

        // 赤兔馬動態烈火馬尾與飄逸鬃毛
        const tailSway = Math.sin(t * 8) * r * 0.25;
        ctx.strokeStyle = 'rgba(255,50,40,0.85)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-r * 1.6, 0);
        ctx.quadraticCurveTo(-r * 2.1, tailSway * 0.6, -r * 2.5, tailSway);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,140,50,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-r * 1.6, 0);
        ctx.quadraticCurveTo(-r * 2.0, -tailSway * 0.5, -r * 2.3, -tailSway * 0.8);
        ctx.stroke();

        // 烈焰鬃毛光絲
        for (let i = 0; i < 4; i++) {
          const mx = r * (0.8 - i * 0.35);
          const my = Math.sin(t * 12 + i * 1.5) * 3;
          ctx.strokeStyle = `rgba(255,${120 + i * 30},40,0.7)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(mx, -r * 0.2);
          ctx.lineTo(mx - r * 0.2, -r * 0.5 + my);
          ctx.stroke();
        }
      }

      // 2. 赤紅戰袍披風（隨時間與動作起伏飄揚）
      const capeSway = Math.sin(t * 5) * 0.15;
      ctx.fillStyle = p2 ? '#7a0a14' : '#a81622';
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.8);
      for (let i = 1; i <= 5; i++) {
        const cx = -r * 0.2 - i * (r * 1.6 / 5);
        const cy = -r * 0.8 + i * (r * 1.6 / 5) + Math.sin(t * 6 + i) * r * 0.18 + capeSway * r;
        ctx.lineTo(cx, cy);
      }
      ctx.lineTo(-r * 0.2, r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d4af37'; // 戰袍金邊
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 3. 魁梧半裸軀幹（古銅膚色胸膛 + 腰間獸面甲裙）以精靈快取
      R.blit(ctx, 'body:lubu:torso:' + r + ':' + (p2 ? 2 : 1), r * 2.2 + 20, r * 2.0 + 20, r * 0.9 + 10, r * 1.0 + 10, (g) => {
        // 寬闊肩背與胸肌底輪廓
        g.beginPath();
        g.moveTo(r * 0.45, 0);
        g.lineTo(r * 0.35, -r * 0.7);
        g.lineTo(-r * 0.2, -r * 0.82);
        g.lineTo(-r * 0.5, -r * 0.55);
        g.lineTo(-r * 0.5, r * 0.55);
        g.lineTo(-r * 0.2, r * 0.82);
        g.lineTo(r * 0.35, r * 0.7);
        g.closePath();

        // 健壯肌肉膚色漸層
        const gr = g.createRadialGradient(r * 0.15, 0, 2, 0, 0, r * 0.9);
        gr.addColorStop(0, '#e8b896');
        gr.addColorStop(0.65, '#c5855f');
        gr.addColorStop(1, '#8e4c2b');
        g.fillStyle = gr;
        g.fill();
        g.strokeStyle = '#5a2e16';
        g.lineWidth = 2;
        g.stroke();

        // 胸肌與腹肌陰影線條
        g.strokeStyle = 'rgba(110, 50, 25, 0.55)';
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(-r * 0.15, 0); g.lineTo(r * 0.4, 0); g.stroke();
        g.beginPath(); g.arc(r * 0.18, -r * 0.26, r * 0.22, 0.4, 2.7); g.stroke();
        g.beginPath(); g.arc(r * 0.18, r * 0.26, r * 0.22, -2.7, -0.4); g.stroke();

        // 腰腹黑紅戰甲裙
        g.fillStyle = '#221115';
        g.beginPath();
        g.moveTo(-r * 0.15, -r * 0.65);
        g.lineTo(-r * 0.5, -r * 0.55);
        g.lineTo(-r * 0.5, r * 0.55);
        g.lineTo(-r * 0.15, r * 0.65);
        g.closePath();
        g.fill();
        g.strokeStyle = '#d4af37';
        g.lineWidth = 2;
        g.stroke();

        // 獅蠻金帶扣
        g.fillStyle = '#f0c030';
        g.beginPath();
        g.arc(-r * 0.15, 0, r * 0.18, 0, U.TAU);
        g.fill();
        g.strokeStyle = '#8a6010';
        g.lineWidth = 1.5;
        g.stroke();
      });

      // 4. 頭部金冠與兩道標誌性長雉翎（隨身姿大幅飄逸）
      ctx.fillStyle = '#1e1412';
      ctx.beginPath();
      ctx.arc(r * 0.12, 0, r * 0.36, 0, U.TAU);
      ctx.fill();

      // 紫金冠頂件
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.moveTo(r * 0.35, 0);
      ctx.lineTo(r * 0.05, -r * 0.25);
      ctx.lineTo(r * 0.12, 0);
      ctx.lineTo(r * 0.05, r * 0.25);
      ctx.closePath();
      ctx.fill();

      // 雙翎（長金羽向後飄逸）
      const plumeWave1 = Math.sin(t * 6) * r * 0.32;
      const plumeWave2 = Math.sin(t * 6 + 1.4) * r * 0.32;
      for (const [side, sway] of [[-1, plumeWave1], [1, plumeWave2]]) {
        ctx.strokeStyle = '#f5c538';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(r * 0.15, side * r * 0.15);
        ctx.bezierCurveTo(
          -r * 0.3, side * (r * 0.6) + sway * 0.4,
          -r * 1.1, side * (r * 0.85) + sway * 0.8,
          -r * 2.2, side * (r * 0.5) + sway * 1.2
        );
        ctx.stroke();

        // 翎羽尖端赤紅珠節
        ctx.fillStyle = '#ff4433';
        ctx.beginPath();
        ctx.arc(-r * 2.2, side * (r * 0.5) + sway * 1.2, 3, 0, U.TAU);
        ctx.fill();

        ctx.strokeStyle = '#ffe880';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // 5. 方天畫戟（長柄 + 月牙刀 + 槍尖，隨攻擊進度與呼吸擺動）
      const drawn = o.inst || st === 'feint';
      const ha = drawn ? (o.inst ? -1.1 + act * 2.6 : -0.6) : (0.35 + swing);
      ctx.save();
      ctx.translate(r * 0.25, r * 0.6);
      ctx.rotate(ha);

      const poleLen = r * 3.4;
      // 戟桿（長柄）
      ctx.strokeStyle = '#32231c';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, 0);
      ctx.lineTo(poleLen, 0);
      ctx.stroke();

      // 戟尾金鐏
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -3);
      ctx.lineTo(-r * 0.9, 0);
      ctx.lineTo(-r * 0.7, 3);
      ctx.closePath();
      ctx.fill();

      // 紅纓繫綴
      ctx.fillStyle = p2 ? '#ff2030' : '#c81824';
      ctx.beginPath();
      ctx.moveTo(poleLen - r * 0.9, -4);
      ctx.lineTo(poleLen - r * 0.6, 0);
      ctx.lineTo(poleLen - r * 0.9, 4);
      ctx.lineTo(poleLen - r * 1.2, 0);
      ctx.closePath();
      ctx.fill();

      // 戟頭部（中央透甲槍尖 + 側邊方天月牙刃）
      if (p2) {
        ctx.shadowColor = '#ff2b38';
        ctx.shadowBlur = 12;
      }
      // 中央長槍頭
      ctx.fillStyle = '#e8f0f8';
      ctx.beginPath();
      ctx.moveTo(poleLen - r * 0.8, -4);
      ctx.lineTo(poleLen + r * 0.45, 0);
      ctx.lineTo(poleLen - r * 0.8, 4);
      ctx.lineTo(poleLen - r * 0.65, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8fa3b5';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 側邊方天月牙鏟弧刃
      ctx.fillStyle = '#e8f0f8';
      ctx.beginPath();
      ctx.moveTo(poleLen - r * 0.75, -r * 0.05);
      ctx.quadraticCurveTo(poleLen - r * 0.4, -r * 0.55, poleLen - r * 0.05, -r * 0.05);
      ctx.quadraticCurveTo(poleLen - r * 0.4, -r * 0.35, poleLen - r * 0.75, -r * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 金色加固橫梃
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(poleLen - r * 0.6, 0);
      ctx.lineTo(poleLen - r * 0.5, -r * 0.42);
      ctx.stroke();

      ctx.restore();
  }

  R.defineBossStyle('lubu', {
    body(ctx, o, t, args) { ctx.save(); ctx.lineWidth = 1; drawBody(ctx, o, t, Object.assign({}, args, { r: args.r * VIS })); ctx.restore(); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
