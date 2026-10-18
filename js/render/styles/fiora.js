'use strict';
// Boss 造型：菲歐拉（依原畫）：酒紅色短髮、白色貼身上衣、金銅肩甲與護手臂甲、深紫披風、寬刃劍；
// 招式依階段擺姿勢：突刺時劍向前伸直、招架時橫劍護身；二階段劍身泛起光芒。
// under()：在對手身上畫出「破綻」標記（金色菱形，位置即決鬥之舞的命中方位）。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  const TRIG = { hit: 1, proj: 1 };
  const GOLD = '#d4a94a', PINK = '#e0527a';
  const POSE = { ext: 0, guard: false };

  // 刺劍前伸量：0 = 收劍待機，1 = 完全刺出，負值 = 蓄力後拉
  function pose(o, t) {
    const p = POSE;
    p.ext = 0.15 + Math.sin(t * 3) * 0.05; p.guard = !!(o.statuses && BD.hasStatus(o, 'counter'));
    const inst = o.inst;
    if (p.guard || !inst || !inst.v) return p;
    const P = R.skillPace(inst, TRIG);
    if (!P.a) return p;
    p.ext = P.snap > 0 ? 0.4 + P.snap * 0.6 : -0.45 * P.wind;
    return p;
  }

  function body(ctx, o, t, { def, r }) {
    const shade = !!o.shade, p2 = o.phase === 2, P = pose(o, t);
    const tag = r + ':' + (shade ? 's' : 'b');

    // 深紫披風：身後隨移動擺動
    const sw = Math.sin(t * 4 + o.x * 0.01) * 0.2;
    ctx.fillStyle = shade ? '#000000' : '#4a2a63';
    ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.8); ctx.quadraticCurveTo(-r * 1.4, -r * (0.9 + sw), -r * 2.0, -r * sw * 2);
    ctx.quadraticCurveTo(-r * 1.4, r * (0.9 - sw), -r * 0.2, r * 0.8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade ? PINK : '#7a4a98'; ctx.lineWidth = 1.2; ctx.stroke();

    // 左臂：深色手套，向後平衡
    ctx.strokeStyle = shade ? '#050407' : '#e9edf4'; ctx.lineWidth = r * 0.26; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(-r * 0.5, -r * 0.9); ctx.stroke();
    ctx.fillStyle = shade ? '#000000' : '#1c2030'; ctx.beginPath(); ctx.arc(-r * 0.55, -r * 0.93, r * 0.17, 0, U.TAU); ctx.fill();

    // 軀幹：白色貼身上衣，兩側與下擺金銅護甲
    R.blit(ctx, 'body:fiora:torso:' + tag, r * 1.4 + 8, r * 2 + 8, r * 0.7 + 4, r + 4, (g) => {
      const gr = g.createRadialGradient(r * 0.1, 0, 2, 0, 0, r);
      gr.addColorStop(0, shade ? '#12141c' : '#ffffff'); gr.addColorStop(1, shade ? '#000000' : '#cfd5e2');
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, r * 0.6, r * 0.9, 0, 0, U.TAU); g.fill();
      g.strokeStyle = shade ? PINK : GOLD; g.lineWidth = 2.2; g.beginPath(); g.ellipse(0, 0, r * 0.6, r * 0.9, 0, 2.2, 4.1); g.stroke();
      g.beginPath(); g.moveTo(-r * 0.55, -r * 0.3); g.lineTo(-r * 0.55, r * 0.3); g.stroke();
    });

    // 右臂＋寬刃劍：金銅護手臂甲包住拳頭，寬而扁的劍身漸尖
    const e = P.guard ? -0.25 : P.ext, hx = r * (0.55 + 0.7 * e), hy = r * (0.5 - 0.3 * Math.max(e, 0));
    ctx.strokeStyle = shade ? '#050407' : '#e9edf4'; ctx.lineWidth = r * 0.26;
    ctx.beginPath(); ctx.moveTo(0, r * 0.6); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(P.guard ? -1.2 : -0.12 * (1 - e));
    const L = r * 3.2, W = r * 0.2;
    if (p2 && !shade) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(def.glow, 0.5); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = shade ? '#1a1020' : '#dfe6f2';
    ctx.beginPath(); ctx.moveTo(r * 0.3, -W); ctx.lineTo(L * 0.8, -W * 0.7); ctx.lineTo(L, 0); ctx.lineTo(L * 0.8, W * 0.7); ctx.lineTo(r * 0.3, W); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade ? PINK : '#8fa0bc'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.3, 0); ctx.lineTo(L * 0.95, 0); ctx.stroke();
    ctx.fillStyle = shade ? '#2a1020' : GOLD; ctx.strokeStyle = shade ? PINK : '#7a5a18'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(r * 0.3, 0, r * 0.5, r * 0.4, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = shade ? PINK : '#f5dc8a'; ctx.beginPath(); ctx.ellipse(r * 0.38, -r * 0.08, r * 0.2, r * 0.12, 0, 0, U.TAU); ctx.fill();
    ctx.restore();

    // 金銅肩甲
    R.blit(ctx, 'body:fiora:shoulder:' + tag, r * 1.4 + 8, r * 2.4 + 8, r * 0.7 + 4, r * 1.2 + 4, (g) => {
      for (const s of [-1, 1]) {
        g.fillStyle = shade ? '#0a0610' : GOLD; g.beginPath(); g.ellipse(-r * 0.05, s * r * 0.8, r * 0.42, r * 0.3, s * 0.3, 0, U.TAU); g.fill();
        g.strokeStyle = shade ? PINK : '#7a5a18'; g.lineWidth = 1.4; g.stroke();
        g.fillStyle = shade ? PINK : '#f5dc8a'; g.beginPath(); g.ellipse(-r * 0.12, s * r * 0.76, r * 0.18, r * 0.1, s * 0.3, 0, U.TAU); g.fill();
      }
    });

    // 頭：酒紅色短髮，一側瀏海斜掃
    R.blit(ctx, 'body:fiora:head:' + tag, r * 1.2 + 8, r * 1.2 + 8, r * 0.6 + 4, r * 0.6 + 4, (g) => {
      const gr = g.createRadialGradient(r * 0.1, -r * 0.1, 1, 0, 0, r * 0.46);
      gr.addColorStop(0, shade ? '#1a0c14' : '#d9487a'); gr.addColorStop(1, shade ? '#000000' : '#8e1f44');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 0.46, 0, U.TAU); g.fill();
      g.strokeStyle = shade ? PINK : '#f08aae'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(-r * 0.2, -r * 0.3); g.quadraticCurveTo(r * 0.3, -r * 0.35, r * 0.4, r * 0.15); g.stroke();
    });
  }

  // 破綻標記：對手身上決鬥之舞的命中方位（金色脈動菱形）
  function vital(ctx, b, t) {
    const e = b.enemy, v = b._vital, w = b.world;
    if (!e || !v || !w || b.state === 'dead' || e.state === 'dead' || w.time - v.t0 > 6) return;
    const x = e.x + Math.cos(v.ang) * (e.r + 14), y = e.y + Math.sin(v.ang) * (e.r + 14), s = 7 + Math.sin(t * 8) * 1.5;
    ctx.save(); ctx.translate(x, y); ctx.rotate(v.ang + Math.PI / 4);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = hexA(GOLD, 0.35); ctx.fillRect(-s * 1.5, -s * 1.5, s * 3, s * 3);
    ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = hexA('#fff6cf', 0.95); ctx.lineWidth = 2; ctx.strokeRect(-s, -s, s * 2, s * 2);
    ctx.restore();
  }

  R.defineBossStyle('fiora', { body, under: vital });
})(typeof window !== 'undefined' ? window : globalThis);
