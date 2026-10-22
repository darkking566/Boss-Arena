'use strict';
// Boss 造型：鷹眼米霍克（俯視）：黑底紅襯長外套、寬簷羽飾帽、V 字鬢角與金色鷹眼、胸前金色十字吊墜（小刀）；
// 一階段右手持十字小刀、背上斜背著未出鞘的夜；二階段（HP 50%）夜握在手中，黑色刀身泛暗紅微光。
// under()：被「鷹眼鎖定」的對手身上畫出金色準星（四道缺口環 + 十字線，隨剩餘時間收束）。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  const TRIG = { hit: 1, proj: 1, dash: 1 };
  const GOLD = '#d8b44e', RED = '#a8232e';
  const POSE = { ext: 0, guard: false };

  // 揮刀前伸量：0 = 垂刀待機，1 = 完全揮出，負值 = 蓄力後拉
  function pose(o, t) {
    const p = POSE;
    p.ext = 0.1 + Math.sin(t * 2.5) * 0.04; p.guard = !!(o.statuses && BD.hasStatus(o, 'counter'));
    const inst = o.inst;
    if (p.guard || !inst || !inst.v) return p;
    const P = R.skillPace(inst, TRIG);
    if (!P.a) return p;
    p.ext = P.snap > 0 ? 0.4 + P.snap * 0.6 : -0.45 * P.wind;
    return p;
  }

  // 夜：黑色大刀，十字護手；刀身 L 長，從 (0,0) 往 +x
  function yoru(ctx, r, shade, p2, L) {
    if (p2 && !shade) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(RED, 0.5); ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(r * 0.5, 0); ctx.lineTo(L, 0); ctx.stroke(); ctx.restore(); }
    const W = r * 0.2;
    ctx.fillStyle = shade ? '#000000' : '#15131a';
    ctx.beginPath(); ctx.moveTo(r * 0.4, -W); ctx.lineTo(L * 0.9, -W * 0.85); ctx.lineTo(L, 0); ctx.lineTo(L * 0.9, W * 0.85); ctx.lineTo(r * 0.4, W); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade ? RED : '#6a6478'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.5, 0); ctx.lineTo(L * 0.92, 0); ctx.stroke();
    // 十字護手
    ctx.strokeStyle = shade ? RED : GOLD; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(r * 0.4, -r * 0.5); ctx.lineTo(r * 0.4, r * 0.5); ctx.stroke();
    ctx.strokeStyle = shade ? '#2a1016' : '#2a2430'; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(r * 0.4, 0); ctx.lineTo(-r * 0.2, 0); ctx.stroke();
  }

  // 十字小刀（kogatana）：金色十字吊墜般的小刀，刀身短而亮
  function knife(ctx, r, shade) {
    ctx.fillStyle = shade ? '#2a1016' : '#d9dce6';
    ctx.beginPath(); ctx.moveTo(r * 0.25, -r * 0.1); ctx.lineTo(r * 1.15, -r * 0.05); ctx.lineTo(r * 1.35, 0); ctx.lineTo(r * 1.15, r * 0.05); ctx.lineTo(r * 0.25, r * 0.1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade ? RED : '#8c91a4'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = shade ? RED : GOLD; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(r * 0.25, -r * 0.28); ctx.lineTo(r * 0.25, r * 0.28); ctx.stroke();
    ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(r * 0.25, 0); ctx.lineTo(0, 0); ctx.stroke();
  }

  function lockOn(ctx, b, t) {
    const e = b.enemy, st = e && e.statuses && BD.getStatus(e, 'hawklock');
    if (!st || e.state === 'dead') return;
    const k = Math.min(1, st.rem / 1.2), rr = e.r + 26 + (1 - k) * 8;
    ctx.save(); ctx.translate(e.x, e.y); ctx.globalAlpha *= 0.35 + 0.65 * k;
    ctx.strokeStyle = hexA('#e8c860', 0.9); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.rotate(t * 0.8);
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.arc(0, 0, rr, -0.5, 0.5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(rr + 4, 0); ctx.lineTo(rr + 14, 0); ctx.stroke(); }
    ctx.restore();
  }

  R.defineBossStyle('mihawk', {
    under: lockOn,
    body(ctx, o, t, { def, r }) {
      const shade = !!o.shade, p2 = o.phase === 2, P = pose(o, t);
      const tag = r + ':' + (shade ? 's' : 'b');

      // 背上的夜（一階段未出鞘，斜背）
      if (!p2) {
        ctx.save(); ctx.rotate(2.35); ctx.translate(-r * 0.2, 0);
        ctx.fillStyle = shade ? '#000000' : '#15131a'; ctx.strokeStyle = shade ? RED : '#4a4456'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.rect(r * 0.2, -r * 0.1, r * 2.3, r * 0.2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = shade ? RED : GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 0.42); ctx.lineTo(r * 0.2, r * 0.42); ctx.stroke();
        ctx.restore();
      }

      // 長外套下擺：身後隨移動擺動，內襯暗紅
      const sw = Math.sin(t * 3.5 + o.x * 0.01) * 0.15;
      ctx.fillStyle = shade ? '#000000' : '#16121a';
      ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.8); ctx.quadraticCurveTo(-r * 1.2, -r * (0.9 + sw), -r * 1.7, -r * sw * 2);
      ctx.quadraticCurveTo(-r * 1.2, r * (0.9 - sw), -r * 0.1, r * 0.8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shade ? RED : RED; ctx.lineWidth = 2; ctx.stroke();

      // 左臂：向後平衡
      ctx.strokeStyle = shade ? '#050407' : '#241d2a'; ctx.lineWidth = r * 0.3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(-r * 0.45, -r * 0.95); ctx.stroke();

      // 軀幹：黑外套，胸口敞開露出紅襯與金色十字吊墜
      R.blit(ctx, 'body:mihawk:torso:' + tag, r * 1.6 + 8, r * 2.2 + 8, r * 0.8 + 4, r * 1.1 + 4, (g) => {
        const gr = g.createRadialGradient(r * 0.1, 0, 2, 0, 0, r);
        gr.addColorStop(0, shade ? '#12141c' : '#2a2430'); gr.addColorStop(1, shade ? '#000000' : '#0e0c12');
        g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, r * 0.62, r * 1.05, 0, 0, U.TAU); g.fill();
        g.strokeStyle = shade ? RED : RED; g.lineWidth = 2.4; g.beginPath(); g.moveTo(r * 0.55, -r * 0.5); g.lineTo(r * 0.55, r * 0.5); g.stroke();
        g.strokeStyle = shade ? RED : GOLD; g.lineWidth = 2; g.beginPath(); g.moveTo(r * 0.5, -r * 0.18); g.lineTo(r * 0.5, r * 0.18); g.moveTo(r * 0.4, -r * 0.07); g.lineTo(r * 0.6, -r * 0.07); g.stroke();
      });

      // 右臂＋武器：一階段小刀、二階段夜
      const e = P.guard ? -0.2 : P.ext, hx = r * (0.55 + 0.75 * e), hy = r * (0.55 - 0.3 * Math.max(e, 0));
      ctx.strokeStyle = shade ? '#050407' : '#241d2a'; ctx.lineWidth = r * 0.3;
      ctx.beginPath(); ctx.moveTo(0, r * 0.6); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(P.guard ? -1.1 : -0.15 * (1 - e));
      if (p2) yoru(ctx, r, shade, p2, r * 3.4); else knife(ctx, r, shade);
      ctx.restore();

      // 寬簷羽飾帽：帽簷、紅帽帶、帽頂，一根長羽向後彎
      R.blit(ctx, 'body:mihawk:hat:' + tag, r * 2.4 + 8, r * 2.4 + 8, r * 1.2 + 4, r * 1.2 + 4, (g) => {
        const gr = g.createRadialGradient(0, 0, 2, 0, 0, r * 0.92);
        gr.addColorStop(0, shade ? '#1a1620' : '#2e2836'); gr.addColorStop(1, shade ? '#000000' : '#0f0d13');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 0.86, 0, U.TAU); g.fill();
        g.strokeStyle = shade ? RED : '#4a4456'; g.lineWidth = 1.6; g.stroke();
        g.strokeStyle = shade ? RED : RED; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r * 0.42, 0, U.TAU); g.stroke();
        g.fillStyle = shade ? '#12101a' : '#1a161f'; g.beginPath(); g.arc(0, 0, r * 0.37, 0, U.TAU); g.fill();
        // 羽毛：由帽帶往後彎的長弧
        g.strokeStyle = shade ? RED : '#e8e4ec'; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-r * 0.05, -r * 0.32); g.quadraticCurveTo(-r * 0.8, -r * 0.85, -r * 0.95, -r * 0.15); g.stroke();
        g.strokeStyle = shade ? '#2a1016' : '#a9a4b4'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(-r * 0.05, -r * 0.32); g.quadraticCurveTo(-r * 0.7, -r * 0.72, -r * 0.85, -r * 0.15); g.stroke();
      });

      // 帽簷前緣下的金色鷹眼（兩點）；二階段更亮
      const a = 0.65 + 0.3 * Math.sin(t * 4);
      ctx.fillStyle = hexA(p2 ? '#ffd860' : '#e8c860', a);
      ctx.beginPath(); ctx.arc(r * 0.8, -r * 0.15, 2.4, 0, U.TAU); ctx.arc(r * 0.8, r * 0.15, 2.4, 0, U.TAU); ctx.fill();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
