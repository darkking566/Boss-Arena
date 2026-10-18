'use strict';
// Boss 造型：菲歐拉：德瑪西亞式的藍白護甲外衣與金邊、右手持細長刺劍（護手盤＋劍身）、左臂向後平衡的擊劍站姿、束起的馬尾；
// 招式依階段擺姿勢：突刺時刺劍向前伸直、招架時橫劍護身；二階段刺劍泛起光芒。
// under()：在對手身上畫出「破綻」標記（金色菱形，位置即決鬥之舞的命中方位）。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  const TRIG = { hit: 1, proj: 1 };
  const GOLD = '#f2c94c', BLUE = '#2f6fd6';
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

    // 馬尾：身後隨移動擺動
    const sw = Math.sin(t * 5 + o.x * 0.01) * 0.25;
    ctx.strokeStyle = shade ? '#000000' : '#2a2430'; ctx.lineWidth = r * 0.34; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.4, 0); ctx.quadraticCurveTo(-r * 1.0, r * sw, -r * 1.5, r * sw * 2.2); ctx.stroke();

    // 左臂：向後平衡的擊劍姿勢
    ctx.strokeStyle = shade ? '#050407' : '#cfd8e8'; ctx.lineWidth = r * 0.26;
    ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(-r * 0.55, -r * 0.95); ctx.stroke();

    // 軀幹：藍白外衣（精靈快取），金邊
    R.blit(ctx, 'body:fiora:torso:' + tag, r * 1.4 + 8, r * 2 + 8, r * 0.7 + 4, r + 4, (g) => {
      const gr = g.createRadialGradient(r * 0.1, 0, 2, 0, 0, r);
      gr.addColorStop(0, shade ? '#12141c' : '#f4f7fd'); gr.addColorStop(1, shade ? '#000000' : def.color);
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, r * 0.62, r * 0.92, 0, 0, U.TAU); g.fill();
      g.strokeStyle = shade ? BLUE : GOLD; g.lineWidth = 1.6; g.stroke();
      g.strokeStyle = shade ? BLUE : GOLD; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(-r * 0.5, 0); g.lineTo(r * 0.5, 0); g.stroke();
    });

    // 右臂＋刺劍
    const e = P.guard ? -0.25 : P.ext, hx = r * (0.55 + 0.7 * e), hy = r * (0.5 - 0.3 * Math.max(e, 0));
    ctx.strokeStyle = shade ? '#050407' : '#cfd8e8'; ctx.lineWidth = r * 0.26;
    ctx.beginPath(); ctx.moveTo(0, r * 0.6); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(P.guard ? -1.2 : -0.12 * (1 - e));
    const L = r * 3.1;
    if (p2 && !shade) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(def.glow, 0.5); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke(); ctx.restore(); }
    ctx.strokeStyle = shade ? '#1a2540' : '#eef3fa'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(r * 0.2, 0); ctx.lineTo(L, 0); ctx.stroke();
    ctx.strokeStyle = shade ? BLUE : '#8fa3c4'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(r * 0.2, -1); ctx.lineTo(L, -1); ctx.stroke();
    // 護手盤與握柄
    ctx.fillStyle = shade ? BLUE : GOLD; ctx.beginPath(); ctx.ellipse(r * 0.45, 0, r * 0.12, r * 0.34, 0, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = shade ? '#0a0f1f' : '#5b4a1a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-r * 0.15, 0); ctx.lineTo(r * 0.35, 0); ctx.stroke();
    ctx.restore();

    // 肩甲（金邊）
    R.blit(ctx, 'body:fiora:shoulder:' + tag, r * 1.2 + 8, r * 2.2 + 8, r * 0.6 + 4, r * 1.1 + 4, (g) => {
      for (const s of [-1, 1]) {
        g.fillStyle = shade ? '#0a0f1f' : '#dfe8f6'; g.beginPath(); g.ellipse(0, s * r * 0.78, r * 0.3, r * 0.2, 0, 0, U.TAU); g.fill();
        g.strokeStyle = shade ? BLUE : GOLD; g.lineWidth = 1.4; g.stroke();
      }
    });

    // 頭：深色頭髮、藍色髮帶
    R.blit(ctx, 'body:fiora:head:' + tag, r * 1.2 + 8, r * 1.2 + 8, r * 0.6 + 4, r * 0.6 + 4, (g) => {
      const gr = g.createRadialGradient(r * 0.1, -r * 0.1, 1, 0, 0, r * 0.45);
      gr.addColorStop(0, shade ? '#1a1c28' : '#4a4256'); gr.addColorStop(1, shade ? '#000000' : '#1e1a26');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 0.44, 0, U.TAU); g.fill();
      g.strokeStyle = shade ? BLUE : '#4f8cf0'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r * 0.38, -1.1, 1.1); g.stroke();
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
