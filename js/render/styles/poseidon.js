'use strict';
// Boss 造型：波賽頓（俯視）。造型依據＝動畫角色設定圖 Poseidon_anime_design.png 與漫畫彩圖 Poseidon.png、背面分鏡 Poseidon_Trident_anime.png（見 docs/bosses/poseidon.md）：
// 金棕色凌亂短髮（一撮呆毛）、深藍緊身上衣（肩袖寬大、背後有金色拱形紋）、二頭肌上發光的金色尖刺環、橄欖綠無指手套配天藍腕帶、
// 白色長外袍（金色分岔紋、前襟分開、身後長長拖曳）、金色渦紋頸環；武器＝與身高等長的三叉槍：深藍長柄、藍紫蝠翼狀鰭片、銀白三齒（兩側齒帶倒鉤）。
// 一階段：腳下的海水向兩側分開（入場那一踏）；二階段「神中之神」：海藍光暈、環繞的水珠、頭頂金白光環；動怒（tyrantwrath）時金色尖刺環爆亮；見切（撥浪）時槍在身前高速旋轉、捲起水環。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  const TRIG = { hit: 1, proj: 1, dash: 1 };
  const POSE = { ext: 0, guard: false, id: null, i: 0, reach: 0 };
  const GOLD = '#d9b24a';

  // 揮槍前伸量：0 = 待機，1 = 完全刺出，負值 = 蓄力後拉；id / i / reach = 目前招式、第幾個出手動作、招式最遠距離（槍身視覺依此拉長）
  function pose(o, t) {
    const p = POSE;
    p.ext = 0.05 + Math.sin(t * 2.0) * 0.04; p.guard = !!(o.statuses && BD.hasStatus(o, 'counter')); p.id = null; p.i = 0; p.reach = 0;
    const inst = o.inst;
    if (p.guard || !inst || !inst.v) return p;
    const P = R.skillPace(inst, TRIG);
    if (!P.a) return p;
    p.ext = P.snap > 0 ? 0.4 + P.snap * 0.6 : -0.45 * P.wind;
    if (inst.skill) { p.id = inst.skill.id; p.i = P.i; p.reach = inst.skill.range ? inst.skill.range[1] : 0; }
    return p;
  }

  // 三叉槍：握點在 (0,0) 往 +x，槍頭在 L，槍尾在 -r*1.5；glow＝二階段 / 動怒 / 見切時沿槍身的水藍光
  function trident(ctx, r, shade, L, glow, t) {
    const W = r * 0.17, bx = -r * 1.5, xb = L - r * 0.1, col = (c) => (shade ? '#000000' : c);
    if (glow && !shade) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(90,200,255,0.34)'; ctx.lineWidth = r * 0.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(L + r * 1.1, 0); ctx.stroke(); ctx.restore(); }
    ctx.lineCap = 'round';
    ctx.strokeStyle = col('#1f3478'); ctx.lineWidth = W; ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(xb, 0); ctx.stroke(); // 深藍長柄
    if (!shade) { ctx.strokeStyle = 'rgba(120,160,255,0.55)'; ctx.lineWidth = W * 0.28; ctx.beginPath(); ctx.moveTo(bx, -W * 0.22); ctx.lineTo(xb, -W * 0.22); ctx.stroke(); }
    for (const gx of [r * 0.28, xb - r * 0.55]) { ctx.fillStyle = col(GOLD); ctx.beginPath(); ctx.ellipse(gx, 0, r * 0.07, r * 0.17, 0, 0, U.TAU); ctx.fill(); } // 金色箍環
    ctx.fillStyle = col('#2f58c8'); ctx.strokeStyle = col('#7a4ac0'); ctx.lineWidth = 1.4; // 槍尾：藍色結球與魚鰭
    ctx.beginPath(); ctx.arc(bx, 0, r * 0.2, 0, U.TAU); ctx.fill(); ctx.stroke();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(bx - r * 0.05, s * r * 0.1); ctx.lineTo(bx - r * 0.42, s * r * 0.34); ctx.lineTo(bx - r * 0.18, s * r * 0.04); ctx.closePath(); ctx.fill(); }
    // 蝠翼狀鰭片（槍頭底部）：藍色翼面、紫色條紋、中央一顆天藍寶石
    ctx.fillStyle = col('#2b50bd'); ctx.strokeStyle = col('#8a4ac0'); ctx.lineWidth = 1.5;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(xb - r * 0.05, 0); ctx.bezierCurveTo(xb - r * 0.2, s * r * 0.3, xb - r * 0.5, s * r * 0.62, xb - r * 0.72, s * r * 0.5);
      ctx.lineTo(xb - r * 0.5, s * r * 0.3); ctx.lineTo(xb - r * 0.42, s * r * 0.4); ctx.lineTo(xb - r * 0.26, s * r * 0.16); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = col('#b9d0ff'); ctx.beginPath(); ctx.arc(xb - r * 0.05, 0, r * 0.13, 0, U.TAU); ctx.fill();
    if (!shade) { ctx.fillStyle = '#3ec8ff'; ctx.beginPath(); ctx.arc(xb - r * 0.05, 0, r * 0.07, 0, U.TAU); ctx.fill(); }
    // 銀白三齒：中央長矛尖，兩側向外彎、尖端帶倒鉤
    ctx.fillStyle = col('#e4eaf4'); ctx.strokeStyle = col('#6a7488'); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(xb, -W * 0.75); ctx.lineTo(xb + r * 0.8, -W * 1.05); ctx.lineTo(xb + r * 1.25, 0); ctx.lineTo(xb + r * 0.8, W * 1.05); ctx.lineTo(xb, W * 0.75); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(xb, s * W * 0.4); ctx.quadraticCurveTo(xb + r * 0.12, s * r * 0.66, xb + r * 0.98, s * r * 0.62);
      ctx.lineTo(xb + r * 0.58, s * r * 0.4); ctx.lineTo(xb + r * 0.72, s * r * 0.3); ctx.quadraticCurveTo(xb + r * 0.34, s * r * 0.3, xb + r * 0.2, s * W * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (!shade) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(xb + r * 0.1, 0); ctx.lineTo(xb + r * 1.1, 0); ctx.stroke(); }
    if (glow && !shade) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = hexA('#9fe8ff', 0.5 + 0.25 * Math.sin(t * 9)); for (const s of [-1, 0, 1]) { ctx.beginPath(); ctx.arc(xb + r * (s ? 0.98 : 1.25), s * r * 0.62, r * 0.12, 0, U.TAU); ctx.fill(); } ctx.restore(); }
  }

  R.defineBossStyle('poseidon', {
    body(ctx, o, t, { r }) {
      const shade = !!o.shade, p2 = o.phase === 2, wrath = !shade && !!o.statuses && BD.hasStatus(o, 'tyrantwrath'), P = pose(o, t);
      const tag = r + ':' + (shade ? 's' : 'b');
      const col = (c) => (shade ? '#000000' : c);
      const sw = Math.sin(t * 3.0 + o.x * 0.01) * (p2 ? 0.28 : 0.15);

      // 腳下的海：向兩側分開的水環（外圈不斷向外盪開；一階段淡、二階段濃）
      if (!shade) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = p2 ? 2.4 : 1.8;
        for (let i = 0; i < 3; i++) { const u = (t * 0.55 + i / 3) % 1; ctx.strokeStyle = hexA('#7fdcff', (p2 ? 0.5 : 0.34) * (1 - u)); ctx.beginPath(); ctx.arc(0, 0, r * (1.25 + u * 1.5), 0, U.TAU); ctx.stroke(); }
        if (p2) { // 二階段：海藍光暈與環繞的水珠，頭頂一圈金白光環（神中之神）
          const hg = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 2.4); hg.addColorStop(0, hexA('#3fb8ff', 0.22 + 0.06 * Math.sin(t * 4))); hg.addColorStop(1, hexA('#3fb8ff', 0));
          ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, U.TAU); ctx.fill();
          for (let i = 0; i < 8; i++) { const a = t * 1.4 + i * U.TAU / 8, d = r * (1.55 + 0.25 * Math.sin(t * 2.3 + i * 1.7)); ctx.fillStyle = hexA(i % 2 ? '#e8fbff' : '#7fdcff', 0.8); ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 2.2, 0, U.TAU); ctx.fill(); }
          ctx.strokeStyle = hexA('#ffe9a0', 0.4 + 0.15 * Math.sin(t * 3)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 1.42, 0, U.TAU); ctx.stroke();
        }
        ctx.restore();
      }
      // 見切（撥浪）：槍在身前高速旋轉，水環一圈圈捲起
      if (P.guard && !shade) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const u = (t * 2 + i / 3) % 1; ctx.strokeStyle = hexA(i % 2 ? '#ffffff' : '#7fdcff', 0.6 * (1 - u)); ctx.beginPath(); ctx.arc(r * 0.5, 0, r * (1.3 + u * 1.8), t * 9 + i, t * 9 + i + 2.2); ctx.stroke(); }
        ctx.restore();
      }

      // 白色長外袍：身後一片長長拖曳的衣擺（尾端分叉），金色樹枝狀分岔紋沿中線展開
      const ty = r * sw * 1.2;
      ctx.fillStyle = col('#e9edf4'); ctx.strokeStyle = col('#9aa4b4'); ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.55); ctx.quadraticCurveTo(-r * 1.2, -r * (0.78 - sw * 0.5), -r * (p2 ? 2.8 : 2.4), -r * 0.3 + ty);
      ctx.lineTo(-r * (p2 ? 2.25 : 1.95), ty * 0.8); ctx.lineTo(-r * (p2 ? 2.8 : 2.4), r * 0.3 + ty); ctx.quadraticCurveTo(-r * 1.2, r * (0.78 + sw * 0.5), -r * 0.1, r * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (!shade) {
        ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        const cy = (x) => ty * (-x / 2.4) * 0.8;
        ctx.beginPath(); ctx.moveTo(-r * 0.4, 0); ctx.lineTo(-r * 1.85, cy(-1.85)); ctx.stroke();
        for (const x of [-0.7, -1.05, -1.4, -1.7]) for (const s of [-1, 1]) { const y0 = cy(x); ctx.beginPath(); ctx.moveTo(r * x, y0); ctx.lineTo(r * (x - 0.3), y0 + s * r * (0.2 - 0.03 * (x < -1.2))); ctx.stroke(); }
      }

      // 肩袖與背：深藍寬袖、背後金色拱形紋、金色渦紋頸環
      R.blit(ctx, 'body:poseidon:torso:' + tag, r * 2.6 + 8, r * 2.8 + 8, r * 1.3 + 4, r * 1.4 + 4, (g) => {
        for (const s of [-1, 1]) {
          const gr = g.createRadialGradient(0, s * r * 0.85, 2, 0, s * r * 0.85, r * 0.7);
          gr.addColorStop(0, shade ? '#000000' : '#4268d0'); gr.addColorStop(1, shade ? '#000000' : '#1f3480');
          g.fillStyle = gr; g.beginPath(); g.ellipse(-r * 0.05, s * r * 0.88, r * 0.66, r * 0.44, s * 0.15, 0, U.TAU); g.fill();
          g.strokeStyle = shade ? '#000000' : '#142058'; g.lineWidth = 2; g.stroke();
        }
        const gr = g.createRadialGradient(r * 0.12, 0, 2, 0, 0, r * 0.95);
        gr.addColorStop(0, shade ? '#000000' : '#3c5ec8'); gr.addColorStop(1, shade ? '#000000' : '#1c2f78');
        g.fillStyle = gr; g.beginPath(); g.ellipse(-r * 0.05, 0, r * 0.62, r * 0.98, 0, 0, U.TAU); g.fill(); g.strokeStyle = shade ? '#000000' : '#142058'; g.lineWidth = 2; g.stroke();
        if (!shade) { // 背後金色拱形紋（背面分鏡）
          g.strokeStyle = GOLD; g.lineWidth = 1.6;
          for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-r * 0.5, 0, r * (0.14 + i * 0.1), -1.5, 1.5); g.stroke(); }
        }
      });

      // 二頭肌的金色尖刺環：發光的金色刻痕，二階段 / 動怒時爆亮
      if (!shade) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        const hot = wrath ? 1 : p2 ? 0.6 : 0.3, fl = 0.7 + 0.3 * Math.sin(t * 9);
        for (const s of [-1, 1]) {
          ctx.strokeStyle = hexA('#ffd86a', (0.55 + hot * 0.4) * fl); ctx.lineWidth = 2.2;
          for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.1 + r * 0.12, s * (r * 0.62 + (i % 2 ? 0 : r * 0.05))); ctx.lineTo(i * r * 0.1 + r * 0.12, s * (r * 1.15 + (i % 2 ? r * 0.08 : 0) + hot * r * 0.12)); ctx.stroke(); }
          if (hot > 0.5) { ctx.fillStyle = hexA('#ffd86a', 0.14 * hot * fl); ctx.beginPath(); ctx.arc(r * 0.12, s * r * 0.9, r * 0.7, 0, U.TAU); ctx.fill(); }
        }
        ctx.restore();
      }

      // 手臂與槍：右手（+y）握槍，左手平時垂放、出招 / 見切時扶上槍柄
      const e = P.guard ? 0.2 : P.ext, ex = Math.max(0, e);
      const grow = (base) => 1 + Math.min(1.4, Math.max(0, P.reach * 0.75 / (r * base) - 1)) * ex;
      const spear = P.guard ? r * 2.9 : r * 4.6 * grow(4.6);
      const gx = r * (0.5 + 0.5 * e), gy = P.guard ? 0 : r * (0.62 - 0.45 * ex);
      const arm = (sy, hx, hy, fat) => {
        const mx = (hx + 0) * 0.55 + r * 0.1, my = (sy * r * 0.78 + hy) * 0.5 + sy * r * 0.12;
        ctx.lineCap = 'round'; ctx.strokeStyle = col('#2a46a0'); ctx.lineWidth = r * 0.5 * fat; ctx.beginPath(); ctx.moveTo(0, sy * r * 0.78); ctx.lineTo(mx, my); ctx.stroke();
        ctx.lineWidth = r * 0.38 * fat; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(hx - r * 0.06, hy); ctx.stroke();
        ctx.strokeStyle = col('#e9edf4'); ctx.lineWidth = r * 0.4; ctx.beginPath(); ctx.moveTo(hx - r * 0.2, hy); ctx.lineTo(hx - r * 0.1, hy); ctx.stroke(); // 白色袖口
        ctx.fillStyle = col('#6b7a3a'); ctx.beginPath(); ctx.arc(hx, hy, r * 0.2, 0, U.TAU); ctx.fill();                                           // 橄欖綠手套
        if (!shade) { ctx.strokeStyle = '#4aa8e0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy, r * 0.2, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke(); }
      };
      const rx = gx, ry = gy, lx = P.guard ? gx + r * 0.9 : r * (0.5 + 0.55 * ex) - ex * 0.1 * r, ly = P.guard ? gy : -r * (0.7 - 0.5 * ex);
      ctx.save(); ctx.translate(rx, ry);
      ctx.rotate(P.guard ? t * 13 : -0.32 + 0.32 * ex + 0.2 * Math.max(0, -e));
      trident(ctx, r, shade, spear, !shade && (p2 || wrath || P.guard), t);
      ctx.restore();
      arm(1, rx, ry, p2 ? 1.28 : 1); arm(-1, lx, ly, 1); // 二階段：右臂肌肉膨脹（原作：「右臂的肌肉變得更粗」）
      if (p2 && !shade) { // 被小次郎砍出的傷：血沿袖子與肩背淌下
        ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(140,8,28,0.9)';
        for (const [x, y, L, w] of [[0.1, 0.95, 0.5, 2.6], [0.28, 0.62, 0.42, 2], [-0.25, -0.9, 0.55, 2.6], [0.05, -0.6, 0.4, 2], [-0.35, 0.2, 0.34, 1.8]]) { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(r * x, r * y); ctx.lineTo(r * (x + L), r * (y + (y > 0 ? 0.1 : -0.1))); ctx.stroke(); }
        ctx.restore();
      }

      // 頭：金棕色凌亂短髮（外圈一撮撮尖髮、額前三綹瀏海偏向一側）、兩側淡色耳朵
      R.blit(ctx, 'body:poseidon:head:' + tag + (p2 ? ':2' : ''), r * 1.7 + 8, r * 1.7 + 8, r * 0.85 + 4, r * 0.85 + 4, (g) => {
        g.fillStyle = shade ? '#000000' : '#f0cdb4'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(-r * 0.02, s * r * 0.44, r * 0.1, r * 0.13, 0, 0, U.TAU); g.fill(); }
        g.lineJoin = 'round'; g.strokeStyle = shade ? '#000000' : '#8a6a1e'; g.lineWidth = 1.4;
        for (let i = 0; i < 9; i++) { // 外圈尖髮：只長在後腦與兩側，長短交錯、略向後掃
          const a = Math.PI * (0.38 + 1.24 * i / 8), L = r * (0.56 + 0.1 * Math.sin(i * 2.9)), w = 0.24;
          g.fillStyle = shade ? '#000000' : i % 2 ? '#d9b44c' : '#c49d3a';
          g.beginPath(); g.moveTo(Math.cos(a - w) * r * 0.34, Math.sin(a - w) * r * 0.34); g.lineTo(Math.cos(a + 0.2) * L, Math.sin(a + 0.2) * L); g.lineTo(Math.cos(a + w) * r * 0.34, Math.sin(a + w) * r * 0.34); g.closePath(); g.fill(); g.stroke();
        }
        const gr = g.createRadialGradient(r * 0.05, -r * 0.05, 2, 0, 0, r * 0.5);
        gr.addColorStop(0, shade ? '#000000' : '#f6e28c'); gr.addColorStop(1, shade ? '#000000' : '#cfa940');
        g.fillStyle = gr; g.beginPath(); g.ellipse(-r * 0.03, 0, r * 0.44, r * 0.42, 0, 0, U.TAU); g.fill(); g.stroke();
        if (!shade) {
          g.strokeStyle = '#a07e28'; g.lineWidth = 1.2; // 後腦髮流
          for (let i = 0; i < 5; i++) { const y = (i - 2) * r * 0.14; g.beginPath(); g.moveTo(-r * 0.05, y * 0.4); g.quadraticCurveTo(-r * 0.25, y * 0.9, -r * 0.4, y * 1.2); g.stroke(); }
          if (p2) { // 二階段：用自己的血把頭髮往後撥（原作第 19 話），髮絲向後梳、染著暗紅血跡
            g.strokeStyle = '#8a0f22'; g.lineWidth = 2.2; g.lineCap = 'round';
            for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(r * 0.3, i * r * 0.11); g.quadraticCurveTo(0, i * r * 0.15, -r * 0.4, i * r * 0.2); g.stroke(); }
            g.strokeStyle = 'rgba(255,230,150,0.7)'; g.lineWidth = 1.2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(r * 0.28, i * r * 0.13); g.quadraticCurveTo(0, i * r * 0.17, -r * 0.34, i * r * 0.22); g.stroke(); }
          } else for (const [y, L] of [[-0.24, 0.5], [0.0, 0.58], [0.24, 0.48]]) { // 額前三綹瀏海
            g.fillStyle = '#f9e9a0'; g.strokeStyle = '#a07e28'; g.lineWidth = 1.3;
            g.beginPath(); g.moveTo(r * 0.06, r * (y - 0.1)); g.quadraticCurveTo(r * 0.3, r * (y - 0.12), r * L, r * (y + 0.04)); g.quadraticCurveTo(r * 0.3, r * (y + 0.1), r * 0.06, r * (y + 0.1)); g.closePath(); g.fill(); g.stroke();
          }
        }
      });
      if (!shade) { // 呆毛：隨時間輕輕晃動
        ctx.strokeStyle = '#f7e49a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(r * 0.05, -r * 0.05);
        ctx.quadraticCurveTo(r * 0.3, -r * 0.3 + Math.sin(t * 3) * 2, r * 0.42, -r * 0.14 + Math.sin(t * 3 + 1) * 3); ctx.stroke();
        if (p2) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA('#9fe8ff', 0.5); ctx.lineWidth = 1.6; for (let i = 0; i < 4; i++) { const a = i * 1.7 + t * 0.8; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42); ctx.lineTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78 - 2); ctx.stroke(); } ctx.restore(); } // 髮絲被海水光托起
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
