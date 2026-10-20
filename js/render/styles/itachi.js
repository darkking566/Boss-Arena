'use strict';
// Boss 造型：宇智波鼬（俯視）：黑色曉袍（紅雲、豎起的紅邊高領）、兩袖與指尖的淡藍指甲油、右手苦無；
// 一階段頭戴斗笠（笠下露出紅色寫輪眼的光），二階段脫下斗笠——黑髮低馬尾、割痕的木葉護額、萬花筒的紅眼與血淚。
// 身邊盤旋著烏鴉；須佐能乎（status susanoo）顯現時，身後浮出橘紅的巨大骨架：肋骨、天狗般的長鼻、左手八咫鏡、右手十拳劍。
// 結印技（豪火球 / 天照 / 勾玉…）兩手在胸前合攏，月讀時笠下的眼睛亮起。考據見 docs/bosses/itachi.md
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  const TRIG = { hit: 1, proj: 1 };
  const RED = '#c01830', MAROON = '#7a1020', SEAL = { fireball: 1, amaterasu: 1, yasaka: 1, tsukuyomi: 1, shuriken: 1, crow_clone: 1, ult: 1 };
  const POSE = { ext0: 0, ext1: 0, seal: 0 };

  function pose(o, t) {
    const p = POSE;
    p.ext0 = 0.1 + Math.sin(t * 2) * 0.05; p.ext1 = 0.1 - Math.sin(t * 2) * 0.05; p.seal = 0;
    const inst = o.inst;
    if (!inst || !inst.v) return p;
    const P = R.skillPace(inst, TRIG), a = P.a;
    if (!a) return p;
    if (SEAL[inst.skill.id]) { // 結印：手在胸前合攏，出招瞬間向前推出
      p.seal = P.snap > 0 ? 0.35 : 0.4 + 0.6 * P.wind;
      p.ext0 = p.ext1 = P.snap > 0 ? 0.55 + 0.6 * P.snap : 0.35 + 0.3 * P.wind;
    } else {
      const k = P.snap > 0 ? P.snap : -0.4 * P.wind;
      if (P.i % 2) p.ext1 = k; else p.ext0 = k;
    }
    return p;
  }

  // 一條手臂：袖子（黑袍、紅邊）+ 手 + 淡藍指甲；右手握苦無
  function arm(ctx, r, s, ext, seal, shade, p2, withKunai) {
    const sx = r * 0.05, sy = s * r * 0.72, hx = r * (0.45 + 0.55 * ext), hy = s * r * (0.58 - 0.5 * seal - 0.12 * ext);
    ctx.lineCap = 'round';
    ctx.strokeStyle = shade ? '#000' : '#15151d'; ctx.lineWidth = r * 0.34;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx - r * 0.1, hy); ctx.stroke();
    ctx.strokeStyle = shade ? '#000' : MAROON; ctx.lineWidth = r * 0.1; // 袖口紅邊
    ctx.beginPath(); ctx.moveTo(hx - r * 0.22, hy - s * r * 0.13); ctx.lineTo(hx - r * 0.22, hy + s * r * 0.13); ctx.stroke();
    if (withKunai) { // 苦無：黑色刀身、銀色刃尖、環狀握柄
      ctx.fillStyle = shade ? '#000' : '#cfd3dc';
      ctx.beginPath(); ctx.moveTo(hx + r * 0.9, hy + s * r * 0.04); ctx.lineTo(hx + r * 0.1, hy + s * r * 0.17); ctx.lineTo(hx + r * 0.1, hy - s * r * 0.09); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2a2c34'; ctx.lineWidth = r * 0.1; ctx.beginPath(); ctx.moveTo(hx - r * 0.1, hy + s * r * 0.04); ctx.lineTo(hx + r * 0.12, hy + s * r * 0.04); ctx.stroke();
      ctx.strokeStyle = RED; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(hx - r * 0.18, hy + s * r * 0.04, r * 0.09, 0, U.TAU); ctx.stroke();
    }
    ctx.fillStyle = shade ? '#000' : '#e6c9ad'; ctx.beginPath(); ctx.arc(hx, hy, r * 0.15, 0, U.TAU); ctx.fill();
    if (!shade) { ctx.fillStyle = '#9fd8ff'; for (const d of [-0.07, 0.02, 0.1]) { ctx.beginPath(); ctx.arc(hx + r * 0.12, hy + d * r, r * 0.04, 0, U.TAU); ctx.fill(); } } // 淡藍指甲油
  }

  // 紅雲（曉的標誌）：紅底白邊的雲朵
  function cloud(g, x, y, k) {
    g.fillStyle = RED; g.strokeStyle = '#f4ecec'; g.lineWidth = Math.max(1, k * 0.16);
    g.beginPath(); g.arc(x - k * 0.5, y, k * 0.42, 0, U.TAU); g.arc(x, y - k * 0.3, k * 0.5, 0, U.TAU); g.arc(x + k * 0.5, y, k * 0.42, 0, U.TAU); g.arc(x, y + k * 0.28, k * 0.4, 0, U.TAU); g.fill(); g.stroke();
  }

  function body(ctx, o, t, { def, r }) {
    const shade = !!o.shade, p2 = o.phase === 2, P = pose(o, t), tag = r + ':' + (shade ? 's' : 'b');
    const sk = o.inst && o.inst.skill ? o.inst.skill.id : '', gazing = (sk === 'tsukuyomi' || sk === 'ult') && o.state === 'skill';

    // 軀幹：黑袍的肩背，背上與兩袖各一朵紅雲
    R.blit(ctx, 'body:itachi:torso:' + tag, r * 2 + 10, r * 2.2 + 10, r + 5, r * 1.1 + 5, (g) => {
      const gr = g.createRadialGradient(r * 0.1, 0, 2, 0, 0, r * 1.1);
      gr.addColorStop(0, shade ? '#0a0a0e' : '#2a2a36'); gr.addColorStop(1, shade ? '#000' : '#0f0f16');
      g.fillStyle = gr; g.beginPath(); g.ellipse(-r * 0.1, 0, r * 0.78, r * 1.0, 0, 0, U.TAU); g.fill();
      g.strokeStyle = shade ? RED : MAROON; g.lineWidth = 1.6; g.stroke();
      if (!shade) { cloud(g, -r * 0.42, 0, r * 0.3); cloud(g, r * 0.0, -r * 0.78, r * 0.18); cloud(g, r * 0.0, r * 0.78, r * 0.18); }
    });
    arm(ctx, r, -1, P.ext0, P.seal, shade, p2, false);
    arm(ctx, r, 1, P.ext1, P.seal, shade, p2, !P.seal);

    // 豎起的紅邊高領（頭後面的半圈）
    ctx.strokeStyle = shade ? '#000' : MAROON; ctx.lineWidth = r * 0.3;
    ctx.beginPath(); ctx.arc(-r * 0.02, 0, r * 0.5, Math.PI * 0.62, Math.PI * 1.38); ctx.stroke();
    ctx.strokeStyle = shade ? RED : '#14141c'; ctx.lineWidth = r * 0.12;
    ctx.beginPath(); ctx.arc(-r * 0.02, 0, r * 0.5, Math.PI * 0.62, Math.PI * 1.38); ctx.stroke();

    if (!p2) { // 斗笠：草笠的放射紋、笠頂、笠緣垂下的細繩；笠下露出一點紅光
      R.blit(ctx, 'body:itachi:hat:' + tag, r * 2.2 + 8, r * 2.2 + 8, r * 1.1 + 4, r * 1.1 + 4, (g) => {
        const gr = g.createRadialGradient(-r * 0.12, -r * 0.1, 2, 0, 0, r * 1.02);
        gr.addColorStop(0, shade ? '#14100a' : '#e6d9b2'); gr.addColorStop(0.6, shade ? '#0a0806' : '#cdbf9a'); gr.addColorStop(1, shade ? '#000' : '#9a8860');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 1.0, 0, U.TAU); g.fill();
        g.strokeStyle = shade ? RED : '#6b5a3c'; g.lineWidth = 1.6; g.stroke();
        g.strokeStyle = shade ? 'rgba(192,24,48,0.6)' : 'rgba(107,90,60,0.55)'; g.lineWidth = 1;
        for (let i = 0; i < 16; i++) { const a = i * U.TAU / 16; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.16, Math.sin(a) * r * 0.16); g.lineTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98); g.stroke(); }
        for (const f of [0.45, 0.72]) { g.beginPath(); g.arc(0, 0, r * f, 0, U.TAU); g.stroke(); }
        g.fillStyle = shade ? '#000' : '#b6a47a'; g.beginPath(); g.arc(0, 0, r * 0.2, 0, U.TAU); g.fill(); g.stroke(); // 笠頂
        g.strokeStyle = shade ? RED : '#7a1020'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r * 0.99, -0.5, 0.5); g.stroke(); // 前緣的紅繩
      });
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; // 笠緣下的紅眼
      const ea = gazing ? 1 : 0.55 + 0.2 * Math.sin(t * 5), er = gazing ? r * 0.2 : r * 0.1;
      ctx.fillStyle = hexA('#ff2a44', ea);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(r * 0.98, s * r * 0.2, er, 0, U.TAU); ctx.fill(); }
      if (gazing) { ctx.strokeStyle = 'rgba(255,48,72,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r * 1.0, 0, r * 0.42 + 2 * Math.sin(t * 14), -0.9, 0.9); ctx.stroke(); }
      ctx.restore();
    } else { // 脫下斗笠：黑髮、低馬尾、割痕護額、萬花筒紅眼與血淚
      ctx.strokeStyle = shade ? '#000' : '#0c0c12'; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round'; // 馬尾（隨動作輕擺）
      const sw = Math.sin(t * 3) * r * 0.12;
      ctx.beginPath(); ctx.moveTo(-r * 0.3, 0); ctx.quadraticCurveTo(-r * 0.9, sw, -r * 1.35, sw * 1.8); ctx.stroke();
      ctx.fillStyle = shade ? '#000' : '#ece6e0'; ctx.fillRect(-r * 0.55, -r * 0.05, r * 0.1, r * 0.1); // 髮繩
      R.blit(ctx, 'body:itachi:head:' + tag, r * 1.4 + 8, r * 1.4 + 8, r * 0.7 + 4, r * 0.7 + 4, (g) => {
        const gr = g.createRadialGradient(r * 0.1, -r * 0.1, 1, 0, 0, r * 0.5);
        gr.addColorStop(0, shade ? '#14141a' : '#3a3a46'); gr.addColorStop(1, shade ? '#000' : '#0c0c12');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 0.47, 0, U.TAU); g.fill();
        g.strokeStyle = shade ? RED : '#050508'; g.lineWidth = 1.2; g.stroke();
        // 護額（正面的銀色金屬片，斜斜一道割痕）
        g.fillStyle = shade ? '#000' : '#c9ced8'; g.beginPath(); g.moveTo(r * 0.3, -r * 0.3); g.lineTo(r * 0.5, -r * 0.24); g.lineTo(r * 0.5, r * 0.24); g.lineTo(r * 0.3, r * 0.3); g.closePath(); g.fill();
        g.strokeStyle = shade ? RED : '#4a4e58'; g.lineWidth = 1.1; g.stroke();
        g.strokeStyle = shade ? RED : '#14141c'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(r * 0.28, r * 0.28); g.lineTo(r * 0.52, -r * 0.2); g.stroke();
      });
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const ea = 0.7 + 0.3 * Math.sin(t * 8) + (gazing ? 0.4 : 0);
      ctx.fillStyle = hexA('#ff1a3a', Math.min(1, ea));
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(r * 0.34, s * r * 0.17, r * (gazing ? 0.14 : 0.085), 0, U.TAU); ctx.fill(); }
      ctx.strokeStyle = hexA('#d0102a', 0.8); ctx.lineWidth = 1.4; // 血淚
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(r * 0.36, s * r * 0.2); ctx.lineTo(r * 0.5, s * (r * 0.34 + (Math.sin(t * 6 + s) * 0.5 + 0.5) * r * 0.2)); ctx.stroke(); }
      ctx.restore();
    }
  }

  // 烏鴉：一小隻展翅的剪影（local：朝 +x）
  function crow(ctx, x, y, ang, k, t, red) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = '#0b0810';
    const fl = Math.sin(t * 20 + x * 0.1) * 0.5 + 0.5;
    ctx.beginPath(); ctx.moveTo(8 * k, 0); ctx.lineTo(-1 * k, 2.5 * k); ctx.lineTo(-7 * k, 0); ctx.lineTo(-1 * k, -2.5 * k); ctx.closePath(); ctx.fill();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(1 * k, s * k); ctx.quadraticCurveTo(-2 * k, s * (8 + 7 * fl) * k, -9 * k, s * (6 + 9 * fl) * k); ctx.lineTo(-4 * k, s * 2 * k); ctx.closePath(); ctx.fill(); }
    if (red) { ctx.fillStyle = '#ff3048'; ctx.fillRect(6 * k, -0.8 * k, 1.6 * k, 1.6 * k); }
    ctx.restore();
  }

  // 須佐能乎：身後浮出的橘紅巨大骨架——肋骨、天狗般的長鼻、左手八咫鏡、右手握著十拳劍（朝向跟著面向）
  function susanoo(ctx, b, t) {
    const st = BD.getStatus(b, 'susanoo');
    if (!st) return;
    const k = U.clamp(st.t / 0.4, 0, 1) * U.clamp(st.rem / 0.35, 0, 1), S = b.r * 3.4, p2 = b.phase === 2;
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.face); ctx.globalAlpha *= 0.85 * k; ctx.lineCap = 'round';
    const gr = R.grad(ctx, 'susanoo:glow', (c) => { const g = c.createRadialGradient(0, 0, 8, 0, 0, 64); g.addColorStop(0, 'rgba(255,150,60,0.55)'); g.addColorStop(0.6, 'rgba(255,100,30,0.25)'); g.addColorStop(1, 'rgba(255,90,20,0)'); return g; });
    ctx.save(); ctx.scale(S / 64 * 1.25, S / 64 * 1.25); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, 64, 0, U.TAU); ctx.fill(); ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    // 肋骨與脊柱
    ctx.strokeStyle = 'rgba(255,140,60,0.8)'; ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) { const x = -S * 0.5 + i * S * 0.2, w = S * (0.95 - Math.abs(i - 2) * 0.12); ctx.beginPath(); ctx.moveTo(x, -w); ctx.quadraticCurveTo(x - S * 0.15, 0, x, w); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,200,120,0.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-S * 0.7, 0); ctx.lineTo(S * 0.5, 0); ctx.stroke();
    // 頭：圓顱 + 向前伸出的長鼻（天狗）
    ctx.fillStyle = 'rgba(255,120,40,0.45)'; ctx.strokeStyle = 'rgba(255,210,150,0.95)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(S * 0.15, 0, S * 0.34, 0, U.TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(S * 0.4, -S * 0.1); ctx.lineTo(S * 0.98, 0); ctx.lineTo(S * 0.4, S * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe9b8'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(S * 0.34, s * S * 0.13, S * 0.04, 0, U.TAU); ctx.fill(); }
    // 肩甲與雙臂
    for (const s of [-1, 1]) {
      ctx.fillStyle = 'rgba(255,120,40,0.5)'; ctx.strokeStyle = 'rgba(255,210,150,0.9)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(-S * 0.05, s * S * 0.95, S * 0.3, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-S * 0.05, s * S * 0.95); ctx.lineTo(S * 1.05, s * S * 0.95); ctx.stroke();
    }
    // 左手：八咫鏡（同心圓＋漩渦紋，旋轉）
    ctx.save(); ctx.translate(S * 1.2, -S * 0.95); ctx.rotate(t * 0.8);
    ctx.strokeStyle = 'rgba(255,200,120,0.9)'; ctx.lineWidth = 3;
    for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(0, 0, S * 0.2 * i, 0, U.TAU); ctx.stroke(); }
    ctx.beginPath(); for (let a = 0; a < 9; a += 0.4) { const rr = S * 0.06 * a / 1.5; a ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(0, 0); } ctx.stroke();
    ctx.restore();
    // 右手：十拳劍（酒壺 + 蒼紫的靈刃）
    ctx.strokeStyle = 'rgba(190,170,255,0.9)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(S * 1.1, S * 0.95); ctx.lineTo(S * (p2 ? 3.2 : 2.6), S * 0.95); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(S * 1.1, S * 0.95); ctx.lineTo(S * (p2 ? 3.2 : 2.6), S * 0.95); ctx.stroke();
    ctx.fillStyle = 'rgba(255,170,90,0.9)'; ctx.beginPath(); ctx.arc(S * 1.1, S * 0.7, S * 0.12, 0, U.TAU); ctx.fill();
    ctx.restore();
  }

  function under(ctx, b, t) {
    susanoo(ctx, b, t);
    if (b.state === 'dead') return;
    const n = b.phase === 2 ? 5 : 3;
    for (let i = 0; i < n; i++) { // 盤旋的烏鴉
      const a = t * (1.1 + 0.12 * i) + i * U.TAU / n, d = b.r * (2.0 + 0.35 * Math.sin(t * 1.7 + i));
      crow(ctx, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d * 0.8, a + Math.PI / 2, b.r / 20, t + i, b.phase === 2);
    }
  }

  R.defineBossStyle('itachi', { body, under });
})(typeof window !== 'undefined' ? window : globalThis);
