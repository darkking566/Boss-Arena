'use strict';
// 戰場繪圖：競技場、預警、區域、陷阱、Boss、召喚物、投射物、拋射物、特效、浮動文字
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA, TEAM = R.TEAM, FONT = R.FONT;
  function pathShape(ctx, s, prog) {
    const k = prog == null ? 1 : prog;
    ctx.beginPath();
    switch (s.kind) {
      case 'circle': ctx.arc(s.x, s.y, Math.max(0.1, s.r * k), 0, U.TAU); break;
      case 'ring': {
        const r1 = (s.r0 || 0) + (s.r - (s.r0 || 0)) * k;
        ctx.arc(s.x, s.y, Math.max(0.1, r1), 0, U.TAU); ctx.arc(s.x, s.y, Math.max(0.1, s.r0 || 0), U.TAU, 0, true); break;
      }
      case 'cone': ctx.moveTo(s.x, s.y); ctx.arc(s.x, s.y, Math.max(0.1, s.r * k), s.ang - s.arc / 2, s.ang + s.arc / 2); ctx.closePath(); break;
      case 'rect': {
        const c = Math.cos(s.ang), sn = Math.sin(s.ang), hw = s.w / 2, L = s.len * k;
        ctx.moveTo(s.x - sn * hw, s.y + c * hw); ctx.lineTo(s.x + c * L - sn * hw, s.y + sn * L + c * hw);
        ctx.lineTo(s.x + c * L + sn * hw, s.y + sn * L - c * hw); ctx.lineTo(s.x + sn * hw, s.y - c * hw); ctx.closePath(); break;
      }
      case 'except':
        ctx.rect(0, 0, BD.ARENA.w, BD.ARENA.h); ctx.moveTo(s.x + s.r, s.y); ctx.arc(s.x, s.y, s.r, 0, U.TAU, true); break;
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // ─────────────────────── 競技場 ───────────────────────
  // 地面：直接畫進指定 context（會以繪製倍率畫入靜態層，DPR 2 也清晰）；rnd 固定種子、順序固定
  function drawFloor(g) {
    const A = BD.ARENA;
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // 生態區底色：橫向漸層，交界處各留 120px 的柔和過渡
    const GROUND = { forest: ['#52703c', '#2f4a28'], desert: ['#c9ab70', '#b08f58'], swamp: ['#3d4a30', '#2a3626'] };
    const lg = g.createLinearGradient(0, 0, A.w, 0);
    A.biomes.forEach((b, i) => {
      const c = GROUND[b.id][0], pad = 120;
      lg.addColorStop(i ? (b.x0 + pad) / A.w : 0, c); lg.addColorStop(i < A.biomes.length - 1 ? (b.x1 - pad) / A.w : 1, c);
    });
    g.fillStyle = lg; g.fillRect(0, 0, A.w, A.h);
    g.lineWidth = 1.5; g.lineCap = 'round';
    for (const b of A.biomes) {
      const x0 = b.x0 + 70, x1 = b.x1 - 70, area = (x1 - x0) * A.h / 1.23e6, X = () => x0 + rnd() * (x1 - x0), dark = GROUND[b.id][1];
      for (let i = 0, n = Math.round(260 * area); i < n; i++) {
        g.fillStyle = rnd() < 0.5 ? dark : b.id === 'desert' ? 'rgba(235,215,160,0.5)' : 'rgba(150,190,90,0.5)';
        g.globalAlpha = 0.14; g.beginPath(); g.ellipse(X(), rnd() * A.h, 30 + rnd() * 70, 20 + rnd() * 45, rnd() * 3, 0, U.TAU); g.fill();
      }
      g.globalAlpha = 1;
      for (let i = 0, n = Math.round((b.id === 'desert' ? 300 : 900) * area); i < n; i++) {
        const x = X(), y = rnd() * A.h;
        if (b.id === 'desert') { // 沙丘風紋：緩弧
          g.strokeStyle = rnd() < 0.5 ? 'rgba(120,90,50,0.22)' : 'rgba(255,240,200,0.3)';
          g.beginPath(); g.arc(x, y, 30 + rnd() * 60, 3.4, 5.4); g.stroke();
        } else { // 草叢 / 沼澤雜草
          g.strokeStyle = rnd() < 0.5 ? (b.id === 'swamp' ? 'rgba(120,150,70,0.35)' : 'rgba(160,205,100,0.35)') : 'rgba(25,55,20,0.45)';
          const h = 4 + rnd() * 7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 4, y - h); g.stroke();
        }
      }
      if (b.id === 'swamp') for (let i = 0, n = Math.round(60 * area); i < n; i++) { // 泥濘斑
        g.fillStyle = 'rgba(40,30,18,0.28)'; g.beginPath(); g.ellipse(X(), rnd() * A.h, 20 + rnd() * 50, 12 + rnd() * 26, rnd() * 3, 0, U.TAU); g.fill();
      }
    }
    g.lineCap = 'butt';
    // 沼澤：泥岸 → 水面 → 睡蓮葉
    for (const p of A.ponds) {
      g.fillStyle = '#3a3220'; g.beginPath(); g.ellipse(p.x, p.y, p.rx + 16, p.ry + 12, 0, 0, U.TAU); g.fill();
      g.fillStyle = 'rgba(25,45,20,0.55)'; g.beginPath(); g.ellipse(p.x, p.y, p.rx + 7, p.ry + 5, 0, 0, U.TAU); g.fill();
      g.strokeStyle = 'rgba(110,140,60,0.8)'; g.lineWidth = 2; g.beginPath();
      for (let i = 0; i < 46; i++) { const an = rnd() * U.TAU, rx = p.x + Math.cos(an) * (p.rx + 18 + rnd() * 10), ry = p.y + Math.sin(an) * (p.ry + 14 + rnd() * 8), h = 10 + rnd() * 12; g.moveTo(rx, ry); g.lineTo(rx + (rnd() - 0.5) * 6, ry - h); }
      g.stroke();
      const wg = g.createRadialGradient(p.x - p.rx * 0.2, p.y - p.ry * 0.3, 8, p.x, p.y, p.rx);
      wg.addColorStop(0, '#3f7b80'); wg.addColorStop(1, '#1c4247');
      g.fillStyle = wg; g.beginPath(); g.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, U.TAU); g.fill();
      for (let i = 0; i < 5; i++) {
        const a = rnd() * U.TAU, d = 0.35 + rnd() * 0.5, lx = p.x + Math.cos(a) * p.rx * d, ly = p.y + Math.sin(a) * p.ry * d;
        g.fillStyle = 'rgba(80,130,60,0.9)'; g.beginPath(); g.ellipse(lx, ly, 9 + rnd() * 5, 6 + rnd() * 3, rnd() * 3, 0, U.TAU); g.fill();
      }
    }
    // 暗角
    const v = g.createRadialGradient(A.w / 2, A.h / 2, A.h * 0.4, A.w / 2, A.h / 2, A.w * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = v; g.fillRect(0, 0, A.w, A.h);
  }
  // 快取關閉時沿用的 1x 地板畫布（避免每幀重畫石磚）
  let floorCache = null;
  function floor() {
    if (floorCache) return floorCache;
    const A = BD.ARENA;
    const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (!c) return null;
    c.width = A.w; c.height = A.h;
    drawFloor(c.getContext('2d'));
    floorCache = c; return c;
  }
  // 靜態層：牆、地面、兩圈邊框一起畫進離屏畫布（涵蓋 -34..A.w+34 / -34..A.h+34）
  // 繪製倍率變更或 R.invalidateCaches() 時重建
  let arenaLayer = null;
  function drawArenaStatic(g) {
    const A = BD.ARENA;
    g.fillStyle = '#0a110a'; g.fillRect(-34, -34, A.w + 68, A.h + 68);
    g.fillStyle = '#1b2a17'; g.fillRect(-26, -26, A.w + 52, A.h + 52);
    drawFloor(g);
    g.strokeStyle = '#5a4a30'; g.lineWidth = 4; g.strokeRect(-2, -2, A.w + 4, A.h + 4);
    g.strokeStyle = 'rgba(255,200,120,0.15)'; g.lineWidth = 1; g.strokeRect(-14, -14, A.w + 28, A.h + 28);
  }
  function getArenaLayer(scale) {
    if (arenaLayer && arenaLayer.scale === scale) return arenaLayer;
    const A = BD.ARENA, c = document.createElement('canvas');
    c.width = Math.ceil((A.w + 68) * scale) + 2; c.height = Math.ceil((A.h + 68) * scale) + 2;
    const g = c.getContext('2d');
    g.setTransform(scale, 0, 0, scale, 34 * scale + 1, 34 * scale + 1);
    drawArenaStatic(g);
    arenaLayer = { canvas: c, scale };
    return arenaLayer;
  }
  if (R.onInvalidate) R.onInvalidate(() => { arenaLayer = null; });
  function drawArena(ctx, w, t) {
    const A = BD.ARENA;
    if (R.cache.enabled) {
      const s = Math.min(1.25, R.renderScale(ctx)), L = getArenaLayer(s); // 大地圖：靜態層倍率上限 1.25，避免離屏畫布過大
      R.drawSprite(ctx, { canvas: L.canvas, scale: s }, -34 - 1 / s, -34 - 1 / s);
    } else {
      // 快取關閉：照舊即時繪製（地面用 1x 快取畫布）
      ctx.fillStyle = '#0a110a'; ctx.fillRect(-34, -34, A.w + 68, A.h + 68);
      ctx.fillStyle = '#1b2a17'; ctx.fillRect(-26, -26, A.w + 52, A.h + 52);
      const f = floor(); if (f) ctx.drawImage(f, 0, 0); else { ctx.fillStyle = '#25202a'; ctx.fillRect(0, 0, A.w, A.h); }
      ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 4; ctx.strokeRect(-2, -2, A.w + 4, A.h + 4);
      ctx.strokeStyle = 'rgba(255,200,120,0.15)'; ctx.lineWidth = 1; ctx.strokeRect(-14, -14, A.w + 28, A.h + 28);
    }
    drawWater(ctx, t);
    // 地面痕跡（圓形污痕 / 程序化裂地）
    drawDecals(ctx, w);
  }
  // 地面痕跡：圓形舊痕直接填圓；segs 為程序化裂地（每個 decal 的段落一次路徑批次描繪）
  // 裂縫先以暗色描繪，glow 存在時再以 additive 細線疊一層（前 40% 生命強烈，之後冷卻熄滅）
  // 永久戰鬥痕跡（js/fx/scars.js）：畫在地面痕跡之下；餘燼（glow）在 4 秒內冷卻
  function blob(ctx, s, k) { // 以 pts 為半徑倍率的圓滑不規則塊
    const n = s.pts.length, P = (i) => { i %= n; const a = s.rot + i / n * U.TAU, rr = s.r * k * s.pts[i]; return [s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr * 0.85]; };
    let p0 = P(n - 1), p1 = P(0);
    ctx.beginPath(); ctx.moveTo((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
    for (let i = 0; i < n; i++) { p0 = P(i); p1 = P(i + 1); ctx.quadraticCurveTo(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2); }
    ctx.closePath();
  }
  function drawScars(ctx, w) {
    const scars = w.fx.scars;
    if (!scars || !scars.length) return;
    ctx.save(); ctx.lineCap = 'round';
    for (const s of scars) {
      const hot = s.glow && s.age < 4 ? 1 - s.age / 4 : 0;
      if (s.k === 'blot') {
        ctx.fillStyle = s.c2; ctx.globalAlpha = 0.32; blob(ctx, s, 1.3); ctx.fill();
        ctx.fillStyle = s.c; ctx.globalAlpha = 0.55; blob(ctx, s, 1); ctx.fill();
        ctx.globalAlpha = 0.4; blob(ctx, s, 0.55); ctx.fill();
        if (hot) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = s.glow; ctx.globalAlpha = hot * 0.5; blob(ctx, s, 0.7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
      } else if (s.k === 'pit') {
        ctx.fillStyle = s.c; ctx.globalAlpha = 0.5; blob(ctx, s, 1); ctx.fill();
        ctx.strokeStyle = s.c2; ctx.lineWidth = Math.max(2, s.r * 0.14); ctx.globalAlpha = 0.5; blob(ctx, s, 1.08); ctx.stroke();
        ctx.strokeStyle = s.c; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6; ctx.beginPath();
        for (const [a, len] of s.cr) { ctx.moveTo(s.x + Math.cos(a) * s.r, s.y + Math.sin(a) * s.r * 0.85); ctx.lineTo(s.x + Math.cos(a) * len, s.y + Math.sin(a) * len * 0.85); }
        ctx.stroke();
      } else if (s.k === 'gash') {
        const ca = Math.cos(s.a), sa = Math.sin(s.a), al = s.al;
        if (s.arc) { // 弧形劍痕：三層由寬到窄疊出中段較深
          for (const [f, m, c, a] of [[1, 2.4, s.c2, 0.28], [1, 1.2, s.c, 0.7], [0.6, 1.8, s.c, 0.5]]) {
            ctx.strokeStyle = c; ctx.globalAlpha = a * al; ctx.lineWidth = s.wd * m;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.len, s.a - s.arc * f / 2, s.a + s.arc * f / 2); ctx.stroke();
          }
          if (hot) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = s.glow; ctx.globalAlpha = hot * 0.6; ctx.lineWidth = s.wd * 0.7; ctx.beginPath(); ctx.arc(s.x, s.y, s.len, s.a - s.arc / 2, s.a + s.arc / 2); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
        } else { // 直線劍痕：兩端尖、中段最寬的細長刀口
          const ex = s.x + ca * s.len, ey = s.y + sa * s.len, mx = (s.x + ex) / 2, my = (s.y + ey) / 2, nx = -sa * s.wd * 2, ny = ca * s.wd * 2;
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(mx + nx, my + ny, ex, ey); ctx.quadraticCurveTo(mx - nx, my - ny, s.x, s.y);
          ctx.fillStyle = s.c; ctx.globalAlpha = 0.78 * al; ctx.fill();
          ctx.strokeStyle = s.c2; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5 * al; ctx.stroke();
          if (hot) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = s.glow; ctx.globalAlpha = hot * 0.6; ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
        }
      } else if (s.k === 'stump') {
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.globalAlpha = 1; ctx.beginPath(); ctx.ellipse(s.x + 3, s.y + 5, s.r * 0.95, s.r * 0.8, 0, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#5a3d22'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.78, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#b8884e'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.62, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = '#8a6238'; ctx.lineWidth = 1.5; for (const f of [0.4, 0.2]) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r * f, 0, U.TAU); ctx.stroke(); }
      } else if (s.k === 'litter') {
        ctx.globalAlpha = 0.85;
        for (const [dx, dy, rot, sz, col] of s.bits) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(s.x + dx, s.y + dy, sz, sz * 0.55, rot, 0, U.TAU); ctx.fill(); }
      }
    }
    ctx.restore();
  }
  function drawDecals(ctx, w) {
    drawScars(ctx, w);
    const decals = w.fx.decals;
    if (!decals || !decals.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (const d of decals) {
      // 生命曲線與舊版圓形地面痕跡相同：後半段才開始淡出
      const a = Math.min(1, d.life / d.max * 2);
      ctx.globalAlpha = a;
      if (!d.segs) { ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, U.TAU); ctx.fill(); continue; }
      // 裂地：段落依寬度分 3 級（主幹 / 分岔 / 細紋）。快取開啟時每個裂痕只在第一次出現時烘焙成兩張精靈
      // （暗色裂縫 + 發光層），之後每幀只貼圖；快取關閉（F4）時照舊即時描線
      const glowA = d.glow ? crackGlowAlpha(d) : 0;
      if (R.cache.enabled) {
        const sp = crackSprite(ctx, d);
        // R.drawSprite：變換只有平移 + 等倍縮放時以裝置像素對齊 1:1 複製（不重新取樣，比縮放貼圖快約 10 倍）
        R.drawSprite(ctx, sp.dark, sp.x, sp.y);
        if (glowA > 0.01) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = glowA; R.drawSprite(ctx, sp.glow, sp.x, sp.y); ctx.globalCompositeOperation = 'source-over'; }
        continue;
      }
      const segs = d.segs, n = segs.length, w0 = segs[4] || 2;
      ctx.strokeStyle = d.color;
      for (let lv = 0; lv < 3; lv++) crackPass(ctx, segs, n, w0, lv, 1);
      if (glowA > 0.01) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = glowA; ctx.strokeStyle = d.glow;
        for (let lv = 0; lv < 3; lv++) crackPass(ctx, segs, n, w0, lv, 0.42);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.restore();
  }
  // 熔岩 / 發光裂縫：剛砸出時最亮，前 45% 生命內冷卻熄滅
  function crackGlowAlpha(d) { const p = 1 - d.life / d.max; return p < 0.45 ? Math.pow(1 - p / 0.45, 1.5) * 0.9 : 0; }
  // 裂痕精靈（WeakMap：裂痕消失後自動回收）；以目前繪製倍率烘焙（最高 2），貼圖時才能像素對齊
  const crackCache = new WeakMap();
  function crackSprite(ctx, d) {
    const sc = Math.min(2, R.renderScale(ctx));
    let sp = crackCache.get(d);
    if (sp && sp.sc === sc) return sp;
    const segs = d.segs, n = segs.length, w0 = segs[4] || 2;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i + 4 < n; i += 5) { x0 = Math.min(x0, segs[i], segs[i + 2]); y0 = Math.min(y0, segs[i + 1], segs[i + 3]); x1 = Math.max(x1, segs[i], segs[i + 2]); y1 = Math.max(y1, segs[i + 1], segs[i + 3]); }
    const pad = w0 + 2; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    const mk = (color, mul) => {
      const c = document.createElement('canvas'); c.width = Math.ceil((x1 - x0) * sc); c.height = Math.ceil((y1 - y0) * sc);
      const g = c.getContext('2d'); g.setTransform(sc, 0, 0, sc, -x0 * sc, -y0 * sc); g.lineCap = 'round'; g.strokeStyle = color;
      for (let lv = 0; lv < 3; lv++) crackPass(g, segs, n, w0, lv, mul);
      return { canvas: c, scale: sc };
    };
    sp = { sc, x: x0, y: y0, dark: mk(d.color, 1), glow: d.glow ? mk(d.glow, 0.42) : null };
    crackCache.set(d, sp);
    return sp;
  }
  // 描出寬度屬於第 lv 級的裂縫段（0：≥ 主幹 60%、1：30%~60%、2：其餘），寬度取該級代表值 × mul
  function crackPass(ctx, segs, n, w0, lv, mul) {
    const hi = lv === 0 ? Infinity : lv === 1 ? w0 * 0.6 : w0 * 0.3, lo = lv === 0 ? w0 * 0.6 : lv === 1 ? w0 * 0.3 : 0;
    let any = false;
    ctx.beginPath();
    for (let i = 0; i + 4 < n; i += 5) {
      const sw = segs[i + 4]; if (sw < lo || sw >= hi) continue;
      ctx.moveTo(segs[i], segs[i + 1]); ctx.lineTo(segs[i + 2], segs[i + 3]); any = true;
    }
    if (!any) return;
    ctx.lineWidth = Math.max(0.8, (lv === 0 ? w0 * 0.85 : lv === 1 ? w0 * 0.45 : w0 * 0.22) * mul);
    ctx.stroke();
  }
  // 樹（俯視）：陰影 + 疊色樹冠；碰撞只看樹幹半徑 r，樹冠純裝飾。每個半徑 / 變體烘焙一張精靈
  const CROWN = 1.9;
  function drawTreeSprite(ctx, r, v) {
    const cr = r * CROWN, S = cr * 2 + 40;
    R.blit(ctx, 'tree:' + r + ':' + v, S, S, S / 2, S / 2, (g) => {
      let seed = 11 + v * 97; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(10, 14, cr * 0.98, cr * 0.9, 0, 0, U.TAU); g.fill();
      g.fillStyle = '#6b4a2a'; g.beginPath(); g.arc(0, 0, r * 0.5, 0, U.TAU); g.fill();
      const tones = ['#1f4a22', '#2c6a2c', '#3f8a38', '#62a844'];
      for (let layer = 0; layer < tones.length; layer++) {
        g.fillStyle = tones[layer];
        const n = 7 - layer, rad = cr * (0.62 - layer * 0.09), dist = cr * (0.42 - layer * 0.08);
        for (let i = 0; i < n; i++) {
          const a = i / n * U.TAU + rnd() * 0.6, d = dist * (0.7 + rnd() * 0.5);
          g.beginPath(); g.arc(Math.cos(a) * d - layer * 2, Math.sin(a) * d - layer * 2.5, rad * (0.85 + rnd() * 0.3), 0, U.TAU); g.fill();
        }
      }
      g.fillStyle = 'rgba(200,235,140,0.35)';
      for (let i = 0; i < 14; i++) { const a = rnd() * U.TAU, d = rnd() * cr * 0.6; g.beginPath(); g.arc(Math.cos(a) * d - 4, Math.sin(a) * d - 6, 2 + rnd() * 2.5, 0, U.TAU); g.fill(); }
    });
  }
  function drawPillars(ctx) {
    for (const p of BD.ARENA.pillars) {
      ctx.save(); ctx.translate(p.x, p.y);
      drawTreeSprite(ctx, p.r, p.v);
      ctx.restore();
    }
  }
  // 池面動態：幾圈緩慢擴散的漣漪（只與時間有關，不影響戰鬥）
  function drawWater(ctx, t) {
    ctx.save(); ctx.lineWidth = 1.5;
    BD.ARENA.ponds.forEach((p, pi) => {
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, U.TAU); ctx.save(); ctx.clip();
      for (let i = 0; i < 6; i++) {
        const k = (t * 0.18 + i / 6) % 1, cx = p.x + Math.sin(i * 2.1 + pi) * p.rx * 0.55, cy = p.y + Math.cos(i * 1.7 + pi * 3) * p.ry * 0.5;
        ctx.strokeStyle = `rgba(210,235,240,${(1 - k) * 0.28})`;
        ctx.beginPath(); ctx.ellipse(cx, cy, 6 + k * 46, 3 + k * 22, 0, 0, U.TAU); ctx.stroke();
      }
      ctx.restore();
    });
    ctx.restore();
  }
  // 水面倒影：把站在池邊 / 池中的 Boss 上下翻轉畫在腳下、半透明、輕微晃動，再蓋一層水色
  function drawReflections(ctx, w, t) {
    for (const p of BD.ARENA.ponds) {
      const list = w.bosses.filter((b) => b.state !== 'dead' && Math.abs(b.x - p.x) < p.rx + b.r * 2 && Math.abs(b.y - p.y) < p.ry + b.r * 3);
      if (!list.length) continue;
      ctx.save(); ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, U.TAU); ctx.clip();
      for (const b of list) {
        ctx.save(); ctx.globalAlpha = 0.45; ctx.translate(Math.sin(t * 3 + b.x * 0.02) * 2.5, b.y * 2 + b.r * 1.6); ctx.scale(1, -1);
        R.drawBossBody(ctx, b, t); ctx.restore();
      }
      ctx.fillStyle = 'rgba(40,95,105,0.22)'; ctx.fillRect(p.x - p.rx, p.y - p.ry, p.rx * 2, p.ry * 2);
      ctx.restore();
    }
  }
  // 斷樹的兩半：沿刃線切開，各自旋轉飛開並漸隱
  function drawChunks(ctx, fx) {
    for (const c of fx.chunks) {
      const cr = c.r * CROWN + 8;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.spin); ctx.globalAlpha = Math.min(1, c.life / c.max * 1.6);
      ctx.save(); ctx.rotate(c.a0); ctx.beginPath(); ctx.rect(-cr, c.side > 0 ? 0 : -cr, cr * 2, cr); ctx.clip(); ctx.rotate(-c.a0);
      drawTreeSprite(ctx, c.r, c.v);
      ctx.restore();
      ctx.rotate(c.a0); ctx.strokeStyle = '#c89a62'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-c.r * 0.5, 0); ctx.lineTo(c.r * 0.5, 0); ctx.stroke();
      ctx.restore();
    }
  }

  // ─────────────────────── 預警 / 區域 / 陷阱 ───────────────────────
  function drawTelegraphs(ctx, w, t) {
    for (const te of w.telegraphs) {
      const s = te.shape, prog = U.clamp(te.t / Math.max(0.01, te.hitIn), 0, 1);
      if (te.soft) {
        ctx.save(); ctx.setLineDash([10, 8]); ctx.strokeStyle = hexA(te.color, 0.55); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(s.ang) * s.len, s.y + Math.sin(s.ang) * s.len); ctx.stroke(); ctx.restore();
        continue;
      }
      const pulse = 0.5 + 0.5 * Math.sin(t * 20);
      if (s.kind === 'except') {
        ctx.save();
        ctx.fillStyle = `rgba(150,220,255,${0.12 + prog * 0.25})`; pathShape(ctx, s); ctx.fill('evenodd');
        ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 4; ctx.setLineDash([14, 8]); ctx.lineDashOffset = -t * 40;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, U.TAU); ctx.stroke();
        ctx.setLineDash([]); ctx.fillStyle = 'rgba(120,255,170,0.18)'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#e8fff0'; ctx.font = `bold 20px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('安全區', s.x, s.y);
        ctx.restore();
      } else {
        const base = te.color === '#a070ff' ? '160,112,255' : '255,60,60';
        ctx.fillStyle = `rgba(${base},${0.1 + 0.05 * pulse})`; pathShape(ctx, s); ctx.fill();
        ctx.fillStyle = `rgba(${base},${0.18 + prog * 0.25})`; pathShape(ctx, s, prog); ctx.fill();
        ctx.strokeStyle = prog > 0.8 ? `rgba(255,240,200,${0.6 + pulse * 0.4})` : hexA(te.color, 0.75);
        ctx.lineWidth = prog > 0.8 ? 3 : 2; pathShape(ctx, s); ctx.stroke();
      }
      if (te.undodgeable) {
        ctx.save();
        ctx.setLineDash([]);
        const a = 0.55 + 0.45 * Math.sin(t * 9);
        if (s.kind === 'except') {
          ctx.strokeStyle = `rgba(255,40,70,${a})`; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 6, 0, U.TAU); ctx.stroke();
          ctx.strokeStyle = `rgba(190,90,255,${a})`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 11, 0, U.TAU); ctx.stroke();
        } else {
          pathShape(ctx, s);
          ctx.strokeStyle = `rgba(255,40,70,${a})`; ctx.lineWidth = 5; ctx.stroke();
          ctx.strokeStyle = `rgba(190,90,255,${a})`; ctx.lineWidth = 2; ctx.stroke();
        }
        let bx = s.x, by = s.y;
        if (s.kind === 'except') {
          bx = s.x;
          by = Math.max(30, s.y - s.r - 34);
        } else if (s.kind === 'cone') {
          bx = s.x + Math.cos(s.ang) * s.r * 0.55;
          by = s.y + Math.sin(s.ang) * s.r * 0.55;
        } else if (s.kind === 'rect') {
          bx = s.x + Math.cos(s.ang) * s.len * 0.55;
          by = s.y + Math.sin(s.ang) * s.len * 0.55;
        } else if (s.kind === 'ring') {
          bx = s.x;
          by = s.y - s.r;
        }
        ctx.translate(bx, by);
        const sc = 1 + 0.08 * pulse;
        ctx.scale(sc, sc);
        roundRect(ctx, -16, -16, 32, 32, 6);
        ctx.fillStyle = 'rgba(200,20,50,0.9)'; ctx.fill();
        ctx.strokeStyle = 'rgba(190,90,255,1)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold 22px ${FONT}`; ctx.fillStyle = '#fff';
        ctx.fillText('危', 0, 0);
        ctx.font = `bold 12px ${FONT}`; ctx.fillStyle = '#ffd6e0';
        ctx.fillText('無法閃避', 0, 24);
        ctx.restore();
      }
    }
  }
  function drawZones(ctx, w, t) {
    for (const z of w.zones) {
      const arming = z.t < z.delay, life = z.dur + z.delay - z.t, fade = U.clamp(life / 0.6, 0, 1) * U.clamp((z.t - z.delay + 0.3) / 0.3, 0.3, 1);
      ctx.save(); ctx.globalAlpha = fade;
      const col = { lava: ['255,110,30', '255,200,80'], blizzard: ['160,220,255', '240,250,255'], poison: ['120,200,60', '200,255,120'],
        acid: ['170,230,40', '230,255,120'], caltrops: ['120,120,130', '200,200,210'], fire: ['255,80,20', '255,200,80'] }[z.kind] || ['255,255,255', '255,255,255'];
      if (arming) {
        ctx.setLineDash([8, 6]); ctx.strokeStyle = `rgba(${col[1]},0.8)`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (z.t / z.delay), 0, U.TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, U.TAU); ctx.stroke(); ctx.restore(); continue;
      }
      // 底盤（徑向漸層 + 外框）為靜態精靈；淡出用的 globalAlpha 照舊套用
      ctx.translate(z.x, z.y);
      R.blit(ctx, 'zone:' + z.kind + ':' + z.r, z.r * 2 + 8, z.r * 2 + 8, z.r + 4, z.r + 4, (g) => {
        const gr = g.createRadialGradient(0, 0, 4, 0, 0, z.r);
        gr.addColorStop(0, `rgba(${col[1]},0.55)`); gr.addColorStop(0.7, `rgba(${col[0]},0.35)`); gr.addColorStop(1, `rgba(${col[0]},0.05)`);
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, z.r, 0, U.TAU); g.fill();
        g.strokeStyle = `rgba(${col[1]},0.4)`; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, z.r, 0, U.TAU); g.stroke();
      });
      ctx.translate(-z.x, -z.y);
      if (z.kind === 'blizzard') {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) { const a = t * 2 + i * 1.256; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (0.3 + i * 0.13), a, a + 1.2); ctx.stroke(); }
      } else if (z.kind === 'fire') {
        for (let i = 0; i < 4; i++) {
          const a = i * 1.57 + z.seed, rr = z.r * 0.45, fl = 0.6 + 0.4 * Math.sin(t * 14 + i * 2 + z.seed);
          const fx0 = z.x + Math.cos(a) * rr, fy0 = z.y + Math.sin(a) * rr;
          ctx.fillStyle = `rgba(255,${150 + i * 20},40,${0.55 * fl})`;
          ctx.beginPath(); ctx.moveTo(fx0 - 7, fy0 + 6); ctx.quadraticCurveTo(fx0, fy0 - 18 * fl, fx0 + 7, fy0 + 6); ctx.closePath(); ctx.fill();
        }
      } else if (z.kind === 'caltrops') {
        ctx.fillStyle = '#ddd';
        for (let i = 0; i < 14; i++) { const a = i * 2.4 + z.seed, rr = (i * 37 % 100) / 100 * z.r * 0.9; ctx.fillRect(z.x + Math.cos(a) * rr - 2, z.y + Math.sin(a) * rr - 2, 4, 4); }
      } else {
        for (let i = 0; i < 6; i++) {
          const ph = (t * 0.8 + i / 6 + z.seed) % 1, a = i * 1.7 + z.seed, rr = z.r * 0.6 * ((i * 53 % 10) / 10);
          ctx.fillStyle = `rgba(${col[1]},${0.6 * (1 - ph)})`;
          ctx.beginPath(); ctx.arc(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr, 3 + ph * 8, 0, U.TAU); ctx.fill();
        }
      }
      ctx.restore();
    }
  }
  function drawTraps(ctx, w, t) {
    for (const tr of w.traps) {
      const armed = tr.t >= tr.arm, blink = armed ? 0.5 + 0.5 * Math.sin(t * 8 + tr.x) : 0.3;
      ctx.save(); ctx.translate(tr.x, tr.y);
      if (tr.kind === 'mine') {
        if (tr.undodgeable && armed) {
          const g = 0.6 + 0.4 * Math.sin(t * 5 + tr.y);
          const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
          gr.addColorStop(0, `rgba(255,60,90,${0.35 * g})`);
          gr.addColorStop(1, 'rgba(255,60,90,0)');
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.arc(0, 0, 26, 0, U.TAU); ctx.fill();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = 'rgba(255,70,100,0.45)';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(0, 0, (tr.trig || 30) + 6, 0, U.TAU); ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.strokeStyle = `rgba(190,240,255,${0.15 + blink * 0.2})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, tr.r, 0, U.TAU); ctx.stroke();
        ctx.rotate(t);
        ctx.fillStyle = `rgba(150,220,255,${0.5 + blink * 0.5})`; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(9, 0); ctx.lineTo(0, 11); ctx.lineTo(-9, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      } else {
        ctx.strokeStyle = `rgba(235,235,235,${0.4 + blink * 0.3})`; ctx.lineWidth = 1.2;
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * tr.r * 0.8, Math.sin(a) * tr.r * 0.8); ctx.stroke(); }
        for (let k = 1; k <= 3; k++) { ctx.beginPath(); for (let i = 0; i <= 8; i++) { const a = i * Math.PI / 4, rr = tr.r * 0.26 * k; i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(rr, 0); } ctx.stroke(); }
      }
      ctx.restore();
    }
  }

  function drawBoss(ctx, b, t) {
    const style = R.bossStyle(b.def.style);
    if (style.under) style.under(ctx, b, t); // 例如劫的影子：隱身時也要畫
    if (BD.hasStatus(b, 'hidden')) {
      if (style.hidden) style.hidden(ctx, b, t);
      return;
    }
    // 殘影
    for (const tr of b.trail) {
      ctx.globalAlpha = tr.life / 0.4 * 0.35;
      R.drawBossBody(ctx, { x: tr.x, y: tr.y, face: tr.face, r: b.r, def: b.def, phase: b.phase, state: 'idle' }, t);
    }
    ctx.globalAlpha = 1;
    // 陰影 + 陣營圈
    if (b.r >= 45) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(b.x + b.r * 0.2, b.y + b.r * 0.28, b.r * 1.35, b.r * 1.05, 0, 0, U.TAU); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(b.x + b.r * 0.15, b.y + b.r * 0.2, b.r * 1.15, b.r * 0.92, 0, 0, U.TAU); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(b.x + 6, b.y + 8, b.r * 1.1, b.r * 0.9, 0, 0, U.TAU); ctx.fill();
    }
    ctx.strokeStyle = hexA(TEAM[b.team], 0.8); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 9, 0, U.TAU); ctx.stroke();
    ctx.fillStyle = TEAM[b.team];
    ctx.beginPath(); ctx.moveTo(b.x + Math.cos(b.face) * (b.r + 18), b.y + Math.sin(b.face) * (b.r + 18));
    ctx.lineTo(b.x + Math.cos(b.face + 0.25) * (b.r + 9), b.y + Math.sin(b.face + 0.25) * (b.r + 9));
    ctx.lineTo(b.x + Math.cos(b.face - 0.25) * (b.r + 9), b.y + Math.sin(b.face - 0.25) * (b.r + 9)); ctx.closePath(); ctx.fill();
    // 二階段氣場
    if (b.phase === 2 || b.state === 'transition') {
      const k = b.state === 'transition' ? 1.6 : 1, a = 0.25 + 0.15 * Math.sin(t * 6);
      // 氣場精靈以 k=1、alpha=1 快取，繪製時縮放 k 並乘上 globalAlpha（漸層 alpha 線性縮放，等效）
      ctx.save(); ctx.translate(b.x, b.y); ctx.scale(k, k); ctx.globalAlpha *= a;
      R.blit(ctx, 'aura:' + b.def.glow + ':' + b.def.color + ':' + b.r, b.r * 4.4 + 8, b.r * 4.4 + 8, b.r * 2.2 + 4, b.r * 2.2 + 4, (g) => {
        const gr = g.createRadialGradient(0, 0, b.r * 0.5, 0, 0, b.r * 2.2);
        gr.addColorStop(0, hexA(b.def.glow, 1)); gr.addColorStop(1, hexA(b.def.color, 0));
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, b.r * 2.2, 0, U.TAU); g.fill();
      });
      ctx.restore();
      // 氣場粒子：改用元素主題的 motes（只在有世界與元素系統時；亂數仍只用 BD.vrng）
      if (b.world && b.world.fx && BD.element && BD.fxElementOf && BD.vrng() < 0.4) {
        const E = BD.element(BD.fxElementOf(b));
        b.world.fx.motes(b.x + (BD.vrng() - 0.5) * b.r * 2, b.y + (BD.vrng() - 0.5) * b.r * 2, E, 1, b.r * 0.8, 60);
      }
    }
    // 蓄力光
    if (b.isWindingUp()) {
      const p = 0.5 + 0.5 * Math.sin(t * 24);
      // 環底下墊一層柔和的 additive 光暈（精靈以顏色 + 半徑快取），透明度跟隨脈動
      const gr0 = Math.round(b.r * (1.1 + p * 0.25));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.18 + p * 0.22;
      blitGlow(ctx, 'fxwind:' + b.def.glow + ':' + gr0, gr0, b.def.glow, b.x, b.y);
      ctx.restore();
      ctx.strokeStyle = hexA(b.def.glow, 0.5 + p * 0.5); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 4 + p * 4, 0, U.TAU); ctx.stroke();
    }
    if (b.state === 'dodge' || BD.getMod(b, 'iframe')) ctx.globalAlpha = 0.6;
    if (b.state === 'dead') ctx.globalAlpha = Math.max(0.25, 1 - b.stateT * 0.5);
    if (b.state === 'knockdown') {
      // 倒地：壓扁躺地、逐漸起身回正，底下揚塵陰影與繞轉的褐色星塵
      const k = U.clamp((b.stateDur - b.stateT) / 0.3, 0, 1);
      ctx.save(); ctx.globalAlpha *= 0.85;
      ctx.fillStyle = 'rgba(60,45,30,0.35)';
      ctx.beginPath(); ctx.ellipse(b.x, b.y + b.r * 0.35, b.r * 1.25, b.r * 0.65, 0, 0, U.TAU); ctx.fill();
      // 以 Boss 本身繪製（造型可讀取所有欄位），只在其位置沿面向做非等比縮放
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.face); ctx.scale(1 + 0.12 * k, 1 - 0.38 * k); ctx.rotate(-b.face); ctx.translate(-b.x, -b.y);
      R.drawBossBody(ctx, b, t);
      ctx.restore();
      ctx.restore();
      for (let i = 0; i < 3; i++) { const a = t * 3 + i * 2.09; star(ctx, b.x + Math.cos(a) * b.r * 0.75, b.y - b.r * 0.25 + Math.sin(a) * 5, 5, 'rgba(190,150,90,0.9)'); }
    } else if (!(b.state === 'transition' && style.transition && style.transition(ctx, b, t))) {
      // 沉重蓄力：身體向後拉（沿面向的反方向），蓄力越滿拉得越多
      let lean = 0;
      if (b.world && b.world.pace && b.isWindingUp()) {
        if (b.state === 'feint') lean = b.stateDur > 0 ? U.clamp(b.stateT / b.stateDur, 0, 1) : 0;
        else if (b.inst && b.inst.v && b.inst.v.windup > 0) lean = U.clamp(b.inst.t / b.inst.v.windup, 0, 1);
        lean = U.clamp(lean, 0, 1);
      }
      if (lean > 0) {
        ctx.save(); ctx.translate(-Math.cos(b.face) * 5 * lean, -Math.sin(b.face) * 5 * lean);
        R.drawBossBody(ctx, b, t); ctx.restore();
      } else R.drawBossBody(ctx, b, t);
    }
    ctx.globalAlpha = 1;
    if (b.state === 'whiff') {
      // 空振破綻：紅橘色輪廓脈動，提示可反擊的破口
      const a = 0.45 + 0.45 * Math.sin(t * 18);
      ctx.strokeStyle = `rgba(255,150,80,${Math.max(0, a)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 7, 0, U.TAU); ctx.stroke();
    }
    if (b.hurtFlash > 0) { ctx.fillStyle = `rgba(255,255,255,${b.hurtFlash * 4})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, U.TAU); ctx.fill(); }
    if (BD.hasStatus(b, 'counter')) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = t * 60;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 16, 0, U.TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    if (BD.hasStatus(b, 'stagger')) {
      for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.09; star(ctx, b.x + Math.cos(a) * b.r * 0.8, b.y - b.r - 8 + Math.sin(a) * 6, 6, '#ffdd55'); }
    }
    if (BD.hasStatus(b, 'frozen')) {
      ctx.fillStyle = 'rgba(190,240,255,0.45)'; ctx.strokeStyle = '#eaffff'; ctx.lineWidth = 2;
      ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3, rr = b.r * 1.35; i ? ctx.lineTo(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr) : ctx.moveTo(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (BD.hasStatus(b, 'root')) { ctx.strokeStyle = 'rgba(240,240,240,0.7)'; ctx.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const a = i * 1.05; ctx.beginPath(); ctx.moveTo(b.x + Math.cos(a) * b.r * 1.4, b.y + Math.sin(a) * b.r * 1.4); ctx.lineTo(b.x - Math.cos(a) * b.r * 1.4, b.y - Math.sin(a) * b.r * 1.4); ctx.stroke(); } }
    if (BD.hasStatus(b, 'slow')) { ctx.strokeStyle = 'rgba(170,230,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 3, t * 3, t * 3 + 2); ctx.stroke(); }
    drawStatusAuras(ctx, b, t);
    // 頭頂狀態圖示列（小血條上方；中心 y = b.y - b.r - 36；死亡時不畫小血條但狀態列照常）
    drawStatusGlyphs(ctx, b, b.x, b.y - b.r - 36);
    // 頭頂小血條
    if (b.state !== 'dead') {
      const bw = 64, x = b.x - bw / 2, y = b.y - b.r - 24;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 1, y - 1, bw + 2, 7);
      ctx.fillStyle = TEAM[b.team]; ctx.fillRect(x, y, bw * b.hp / b.maxHp, 5);
      ctx.fillStyle = '#fff'; ctx.fillRect(x + bw / 2 - 0.5, y - 1, 1, 7);
      ctx.fillStyle = '#f5c542'; ctx.fillRect(x, y + 6, bw * b.posture / b.maxPosture, 2);
    }
  }
  // 新狀態的戰場視覺：護盾 / 燃燒 / 中毒 / 流血 / 易傷 / 狂暴（純繪圖，動畫只依賴時間 t）
  function drawStatusAuras(ctx, b, t) {
    const list = BD.activeStatuses(b);
    if (!list.length) return;
    const r = b.r;
    for (const st of list) {
      switch (st.id) {
        case 'shield': {
          const a = 0.12 + 0.3 * U.clamp(st.value / 120, 0, 1);
          ctx.fillStyle = `rgba(127,200,255,${a})`;
          ctx.beginPath(); ctx.arc(b.x, b.y, r + 12, 0, U.TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(190,235,255,0.7)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(b.x, b.y, r + 12, 0, U.TAU); ctx.stroke();
          break;
        }
        case 'deathmark': {
          // 瞬獄影殺陣：目標身上的紅色印記，越接近引爆轉得越快、收得越緊、越亮
          const k = 1 - U.clamp(st.rem / 3, 0, 1), rr = r + 22 - k * 10, a = 0.45 + 0.4 * k + 0.15 * Math.sin(t * (8 + k * 20));
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(t * (1.5 + k * 6));
          ctx.strokeStyle = `rgba(224,30,55,${a})`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, rr, 0, U.TAU); ctx.stroke();
          ctx.fillStyle = `rgba(224,30,55,${a * 0.9})`;
          for (let i = 0; i < 3; i++) {
            const an = i * U.TAU / 3;
            ctx.beginPath(); ctx.moveTo(Math.cos(an) * (rr + 9), Math.sin(an) * (rr + 9));
            ctx.lineTo(Math.cos(an + 0.35) * (rr - 4), Math.sin(an + 0.35) * (rr - 4)); ctx.lineTo(Math.cos(an - 0.12) * (rr - 2), Math.sin(an - 0.12) * (rr - 2)); ctx.closePath(); ctx.fill();
          }
          ctx.restore();
          break;
        }
        case 'burn': {
          ctx.strokeStyle = 'rgba(255,138,42,0.85)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
          for (let i = 0; i < 3; i++) {
            const a0 = t * 4 + i * 2.09, fl = 0.6 + 0.4 * Math.sin(t * 17 + i * 1.7), rr = r + 6 + fl * 4;
            ctx.beginPath(); ctx.arc(b.x, b.y - 4, rr, a0, a0 + 0.45 * fl); ctx.stroke();
          }
          break;
        }
        case 'poison': {
          const n = Math.max(1, Math.round(st.stacks));
          ctx.fillStyle = 'rgba(143,220,58,0.8)';
          for (let i = 0; i < n; i++) {
            const a = i * U.TAU / n + t * 0.8;
            ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * (r + 8), b.y + Math.sin(a) * (r + 8), 3, 0, U.TAU); ctx.fill();
          }
          break;
        }
        case 'bleed': {
          const k = U.clamp(st.stacks / 100, 0, 1);
          ctx.strokeStyle = 'rgba(255,51,68,0.85)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(b.x, b.y, r + 5, -Math.PI / 2, -Math.PI / 2 + U.TAU * k); ctx.stroke();
          break;
        }
        case 'vulnerable': {
          ctx.save(); ctx.strokeStyle = 'rgba(192,122,255,0.85)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 20;
          ctx.beginPath(); ctx.arc(b.x, b.y, r + 14, 0, U.TAU); ctx.stroke(); ctx.restore();
          break;
        }
        case 'enrage': {
          const p = 0.5 + 0.5 * Math.sin(t * 8), rr = r + 20 + p * 8, r0 = r * 0.8;
          // 漸層快取於每個 (r, rr) 組合（內外半徑皆依 p 變動）；R.grad 以世界座標建立漸層
          const g = R.grad(ctx, 'enrage:' + r + ':' + rr, (c) => {
            const gr = c.createRadialGradient(b.x, b.y, r0, b.x, b.y, rr);
            gr.addColorStop(0, 'rgba(255,80,64,0.35)'); gr.addColorStop(1, 'rgba(255,80,64,0)');
            return gr;
          });
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, U.TAU); ctx.fill();
          break;
        }
      }
    }
  }
  // 有 HUD 可見狀態時回傳 true（供呼叫文字上移判斷）
  function hasHudStatus(b) {
    return BD.activeStatuses(b).some((st) => st.def.hud !== false);
  }
  // 狀態圖示列：放在頭頂小血條「上方」（每格 12px，最多 6 個，置中）
  function drawStatusGlyphs(ctx, b, cx, cy) {
    const list = BD.activeStatuses(b).filter((st) => st.def.hud !== false).slice(0, 6);
    if (!list.length) return;
    const S = 12, y = cy - S / 2, GAP = 2, total = list.length * S + (list.length - 1) * GAP;
    let x = cx - total / 2;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold 10px ${FONT}`;
    for (const st of list) {
      const icon = R.statusIcon(st.def.visual), cy = y + S / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, S, S);
      ctx.strokeStyle = icon.color; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, S - 1, S - 1);
      ctx.fillStyle = icon.color; ctx.fillText(icon.glyph, x + S / 2, cy + 0.5);
      x += S + GAP;
    }
  }
  function star(ctx, x, y, r, c) {
    ctx.fillStyle = c; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  }

  // 召喚物：通用的陰影、陣營圈與受擊閃白；造型由 R.defineMinionStyle 註冊（js/render/minions.js）
  function drawMinions(ctx, w, t) {
    for (const m of w.minions) {
      const style = R.minionStyle(m.kind);
      ctx.save(); ctx.translate(m.x, m.y);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(3, 4, m.r, m.r * 0.8, 0, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = hexA(TEAM[m.team], 0.6); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, m.r + 4, 0, U.TAU); ctx.stroke();
      if (style.absolute) { ctx.restore(); ctx.save(); style.draw(ctx, m, t); ctx.translate(m.x, m.y); } // 以世界座標繪製（例如沿用 Boss 造型）
      else style.draw(ctx, m, t);
      if (m.hurt > 0) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(0, 0, m.r, 0, U.TAU); ctx.fill(); }
      ctx.restore();
    }
  }
  function drawProjectiles(ctx, w, t) {
    for (const p of w.projectiles) {
      const a = Math.atan2(p.vy, p.vx);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
      if (p.kind === 'ice') {
        // 含陰影的整顆冰錐（陰影範圍已計入精靈框）
        R.blit(ctx, 'proj:ice:' + p.r, p.r * 4.9 + 24, p.r * 1.4 + 24, p.r * 4 + 12, p.r * 0.7 + 12, (g) => {
          g.shadowColor = '#bff'; g.shadowBlur = 12; g.fillStyle = '#e8fdff';
          g.beginPath(); g.moveTo(p.r * 2, 0); g.lineTo(0, p.r * 0.7); g.lineTo(-p.r * 1.6, 0); g.lineTo(0, -p.r * 0.7); g.closePath(); g.fill();
          g.shadowBlur = 0;
          g.fillStyle = 'rgba(160,220,255,0.35)'; g.fillRect(-p.r * 4, -p.r * 0.4, p.r * 2.5, p.r * 0.8);
        });
      } else if (p.kind === 'kunai') {
        // 小刀造型簡單、無陰影漸層，維持即時繪製
        ctx.fillStyle = '#ccd'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(0, 3); ctx.lineTo(-6, 0); ctx.lineTo(0, -3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-22, 0); ctx.stroke();
        ctx.fillStyle = '#a0413e'; ctx.beginPath(); ctx.arc(-7, 0, 2.5, 0, U.TAU); ctx.fill();
      } else if (p.kind === 'shuriken') {
        // 劫的諸刃：旋轉的四刃手裏劍，後方拖一道紅色殘光
        // R：刃尖半徑；風魔手裏劍（r > 30）刃尖相對較短，並多一圈紅色外環
        const R = p.r * (p.r > 30 ? 1.45 : 1.9), big = p.r > 30;
        ctx.strokeStyle = 'rgba(224,30,55,0.45)'; ctx.lineWidth = R * 0.7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-R * 0.5, 0); ctx.lineTo(-R * 2.6, 0); ctx.stroke();
        ctx.rotate(p.back ? -t * 22 : t * 22);
        ctx.fillStyle = '#d4d8e2'; ctx.strokeStyle = '#e01e37'; ctx.lineWidth = big ? 2.5 : 1.6; ctx.beginPath();
        for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2; ctx.lineTo(Math.cos(an) * R, Math.sin(an) * R); ctx.lineTo(Math.cos(an + 0.78) * R * 0.28, Math.sin(an + 0.78) * R * 0.28); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#15161c'; ctx.beginPath(); ctx.arc(0, 0, R * 0.2, 0, U.TAU); ctx.fill();
        if (big) { ctx.strokeStyle = 'rgba(255,75,92,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R * 0.42, 0, U.TAU); ctx.stroke(); }
      } else if (p.kind === 'airslash') {
        // 米霍克的飛斬：大型月牙斬（弧口朝飛行方向）。深紅外暈 + 粗紅弦 + 白熱刃緣，後方拖三道殘光，弧尖各一點星芒
        const k = p.r, cx = -k * 0.9, rad = k * 1.35, a0 = 1.2;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(168,35,46,0.35)'; ctx.lineWidth = k * 0.5;
        for (const o of [-0.55, 0, 0.55]) { ctx.beginPath(); ctx.moveTo(cx - k * 0.2, o * k); ctx.lineTo(cx - k * (2.2 + (o ? 0.4 : 1.0)), o * k * 1.15); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(200,40,60,0.5)'; ctx.lineWidth = k * 0.38; ctx.beginPath(); ctx.arc(cx, 0, rad * 1.08, -a0, a0); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,90,110,0.8)'; ctx.lineWidth = k * 0.14; ctx.beginPath(); ctx.arc(cx, 0, rad, -a0 + 0.08, a0 - 0.08); ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = '#fff4f6'; ctx.lineWidth = Math.max(4, k * 0.07); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(cx, 0, rad * 0.97, -a0 + 0.14, a0 - 0.14); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        for (const s of [-1, 1]) { const tx = cx + Math.cos(a0) * rad, ty = s * Math.sin(a0) * rad; ctx.beginPath(); ctx.arc(tx, ty, Math.max(3, k * 0.06), 0, U.TAU); ctx.fill(); }
      } else if (p.kind === 'flame') {
        R.blit(ctx, 'proj:flame:' + p.r, p.r * 3.2 + 24, p.r * 2 + 24, p.r * 2.6 + 12, p.r + 12, (g) => {
          g.shadowColor = '#ff7a1a'; g.shadowBlur = 18; g.lineCap = 'round';
          g.strokeStyle = 'rgba(255,120,30,0.8)'; g.lineWidth = 10; g.beginPath(); g.arc(-p.r * 0.6, 0, p.r, -1.1, 1.1); g.stroke();
          g.strokeStyle = '#ffe0a0'; g.lineWidth = 3; g.beginPath(); g.arc(-p.r * 0.6, 0, p.r, -0.9, 0.9); g.stroke();
        });
      } else if (p.kind === 'log') {
        ctx.rotate(-a + t * 9); drawTreeSprite(ctx, p.r, 0);
      } else if (p.kind === 'swarm') {
        ctx.rotate(-a);
        R.blit(ctx, 'proj:swarm:' + p.r, p.r * 2 + 4, p.r * 2 + 4, p.r + 2, p.r + 2, (g) => {
          const gr = g.createRadialGradient(0, 0, 10, 0, 0, p.r); gr.addColorStop(0, 'rgba(50,30,60,0.75)'); gr.addColorStop(1, 'rgba(60,90,20,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(0, 0, p.r, 0, U.TAU); g.fill();
        });
        // 40 顆蟲點：同一路徑一次填滿
        ctx.fillStyle = '#2a1636'; ctx.beginPath();
        for (let i = 0; i < 40; i++) { const an = i * 2.39996 + t * 3 * (i % 2 ? 1 : -1), rr = Math.sqrt(i / 40) * p.r * 0.9; ctx.moveTo(Math.cos(an) * rr + 3.5, Math.sin(an) * rr); ctx.arc(Math.cos(an) * rr, Math.sin(an) * rr, 3.5, 0, U.TAU); }
        ctx.fill();
        // 20 個亮點：同一填充色一次填滿
        ctx.fillStyle = '#c8ff7a'; ctx.beginPath();
        for (let i = 0; i < 20; i++) { const an = i * 2.39996 * 1.7 + t * 2, rr = Math.sqrt(i / 20) * p.r * 0.85; ctx.rect(Math.cos(an) * rr, Math.sin(an) * rr, 2, 2); }
        ctx.fill();
      } else {
        ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, U.TAU); ctx.fill();
      }
      ctx.restore();
    }
  }
  function drawLobs(ctx, w, t) {
    for (const l of w.lobs) {
      const k = U.clamp(l.t / l.dur, 0, 1);
      let x, y, h;
      if (l.sky) { x = U.lerp(l.x0, l.x1, k); y = U.lerp(l.y0, l.y1, k); h = 0; }
      else { x = U.lerp(l.x0, l.x1, k); y = U.lerp(l.y0, l.y1, k); h = Math.sin(Math.PI * k) * 160; }
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(l.sky ? l.x1 : x, l.sky ? l.y1 : y, 10 * (l.sky ? k : 1), 6 * (l.sky ? k : 1), 0, 0, U.TAU); ctx.fill();
      const col = l.kind === 'acid' ? '#b6ff5c' : l.kind === 'egg' ? '#d9e8b0' : '#ff8a3a';
      const cr = l.sky ? 14 : 10;
      // 發光球：以顏色 + 半徑快取（含陰影），於 (x, y-h) 繪製
      ctx.save(); ctx.translate(x, y - h);
      R.blit(ctx, 'lob:' + col + ':' + cr, cr * 2 + 36, cr * 2 + 36, cr + 18, cr + 18, (g) => {
        g.shadowColor = col; g.shadowBlur = 16; g.fillStyle = col;
        g.beginPath(); g.arc(0, 0, cr, 0, U.TAU); g.fill();
      });
      ctx.restore();
      if (l.sky) { ctx.strokeStyle = 'rgba(255,150,60,0.5)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (l.x1 - l.x0) * 0.15, y - (l.y1 - l.y0) * 0.15); ctx.stroke(); }
    }
  }
  // 通用光暈：每個顏色只建一個半徑 64、圓心在原點的徑向漸層（R.grad 跨幀重用），繪製時平移 + 縮放後填圓。
  // 軟體光柵下，大半徑時漸層填色比放大貼圖快 2~3 倍（貼圖需重新取樣）；半徑上限 GLOW_MAX 防止整個畫面被加亮洗白。
  const GLOW_MAX = 320;
  function glowGrad(ctx, color) {
    return R.grad(ctx, 'fxglow:' + color, (g) => {
      const gr = g.createRadialGradient(0, 0, 1, 0, 0, 64);
      gr.addColorStop(0, hexA(color, 1)); gr.addColorStop(0.35, hexA(color, 0.55)); gr.addColorStop(1, hexA(color, 0));
      return gr;
    });
  }
  function blitGlow(ctx, key, r, color, x, y) {
    if (r <= 0.5) return;
    const q = Math.min(r, GLOW_MAX) / 64;
    ctx.save(); ctx.translate(x, y); ctx.scale(q, q);
    ctx.fillStyle = glowGrad(ctx, color); ctx.beginPath(); ctx.arc(0, 0, 64, 0, U.TAU); ctx.fill();
    ctx.restore();
  }

  function drawShocks(ctx, fx) {
    for (const s of fx.shocks) {
      const p = U.clamp(1 - s.life / s.max, 0, 1);
      const k = s.life / s.max;
      const r = s.r0 + (s.r1 - s.r0) * (1 - Math.pow(1 - p, 3)); // easeOutCubic
      // 淡色內部圓盤（衝擊後的餘波）＋ 同色外環（隨擴張變細）
      if (r > 1) {
        // 內部填色壓低（0.16 → 0.08）：大範圍砸地時不再把整片戰場與 Boss 染成同一色
        ctx.globalAlpha = k * 0.08; ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, U.TAU); ctx.fill();
        // 對比邊緣：前緣外側一圈細的深色 / 反差色環
        if (s.rim) {
          ctx.globalAlpha = k * 0.6; ctx.strokeStyle = s.rim; ctx.lineWidth = Math.max(1.5, s.width * 0.35);
          ctx.beginPath(); ctx.arc(s.x, s.y, r + s.width * 0.55, 0, U.TAU); ctx.stroke();
        }
        ctx.globalAlpha = k * 0.55; ctx.strokeStyle = s.color; ctx.lineWidth = s.width * (0.35 + 0.65 * k);
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, U.TAU); ctx.stroke();
      }
      // 明亮前緣：additive 細環 + 前緣外圈的柔光（外擴時寬度遞減）
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = k; ctx.strokeStyle = s.core; ctx.lineWidth = Math.max(1, s.width * 0.3 * (0.4 + 0.6 * k));
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, U.TAU); ctx.stroke();
      // 前緣柔光：同色寬描邊（additive、低透明度），模擬泛光
      ctx.globalAlpha = k * 0.3; ctx.strokeStyle = s.color; ctx.lineWidth = s.width * 1.6 * (0.4 + 0.6 * k);
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, U.TAU); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  // 新月形刀光路徑：沿弧 a0 → a1（a1 為前緣），厚度兩端收尖、最厚處偏向前緣；
  // bias 把外緣往外推（刀光外側飽滿、內側較平），W 為最大厚度
  const CRESCENT_N = 18;
  function crescentPath(ctx, x, y, rad, a0, a1, W, bias) {
    ctx.beginPath();
    for (let i = 0; i <= CRESCENT_N; i++) {
      const u = i / CRESCENT_N, a = a0 + (a1 - a0) * u;
      const th = W * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.7)), 0.85);
      const r = rad + th * (0.5 + bias);
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    for (let i = CRESCENT_N; i >= 0; i--) {
      const u = i / CRESCENT_N, a = a0 + (a1 - a0) * u;
      const th = W * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.7)), 0.85);
      const r = rad - th * (0.5 - bias);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  }
  // 一道新月刀光：外光主體 → 殘影（往回轉、更淡更薄）→ additive 元素核心 → 白熱刃芯
  function drawCrescent(ctx, s, k, a0, a1, rad, trailOff) {
    const W = s.width * (0.55 + 0.75 * k);
    if (s.trail > 0) {
      for (let i = s.trail; i >= 1; i--) {
        const f = 1 - i / (s.trail + 1), off = s.arc * trailOff * i;
        ctx.fillStyle = hexA(s.color, k * 0.28 * f);
        crescentPath(ctx, s.x, s.y, rad + i * 3, a0 - off, a1 - off, W * 0.7 * f, 0.15); ctx.fill();
      }
    }
    // 對比邊緣：主體外側多一圈深色 / 反差色，刀光才有輪廓、不會和同色系地面糊在一起
    if (s.rim) { ctx.fillStyle = hexA(s.rim, k * 0.75); crescentPath(ctx, s.x, s.y, rad + 1.5, a0, a1, W + 5, 0.2); ctx.fill(); }
    ctx.fillStyle = hexA(s.color, Math.min(1, k * 1.1));
    crescentPath(ctx, s.x, s.y, rad, a0, a1, W, 0.15); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    if (s.core) { ctx.fillStyle = hexA(s.core, k * 0.85); crescentPath(ctx, s.x, s.y, rad, a0, a1, W * 0.55, 0.3); ctx.fill(); }
    ctx.fillStyle = `rgba(255,255,255,${k * 0.7})`;
    crescentPath(ctx, s.x, s.y, rad, a0, a1, Math.max(1.5, W * 0.22), 0.45); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawSlashes(ctx, fx) {
    for (const s of fx.slashes) {
      const k = s.life / s.max;
      const rad = s.r * 0.85;
      if (s.max >= 0.3) {
        // 沉重：緩慢掃出的弧形斬擊——可見弧長在前 45% 生命內由起點長到全弧，前緣加亮
        const p = U.clamp(1 - k, 0, 1);
        const grow = p < 0.45 ? 1 - Math.pow(1 - p / 0.45, 2) : 1;
        const a0 = s.ang - s.arc / 2, a1 = a0 + s.arc * Math.max(0.05, grow);
        drawCrescent(ctx, s, k, a0, a1, rad, 0.16);
        if (grow < 1) {
          // 掃出中的前緣亮點
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = hexA(s.core || '#fff5e1', k * 0.7);
          ctx.beginPath(); ctx.arc(s.x + Math.cos(a1) * rad, s.y + Math.sin(a1) * rad, Math.max(2, s.width * 0.28), 0, U.TAU); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
        continue;
      }
      // 輕快：整道刀光一次出現，尾端隨生命往前收
      const sweep = (1 - k) * 0.6;
      const a0 = s.ang - s.arc / 2 + sweep * s.arc * 0.35, a1 = s.ang + s.arc / 2;
      drawCrescent(ctx, s, k, a0, a1, rad, 0.14);
    }
  }
  function drawStreakGeo(ctx, st) {
    // 從細端 (x1,y1) 到粗端 (x2,y2) 的漸細四邊形
    const dx = st.x2 - st.x1, dy = st.y2 - st.y1, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L, w1 = 0.6, w2 = st.w / 2;
    ctx.beginPath();
    ctx.moveTo(st.x1 + nx * w1, st.y1 + ny * w1);
    ctx.lineTo(st.x2 + nx * w2, st.y2 + ny * w2);
    ctx.lineTo(st.x2 - nx * w2, st.y2 - ny * w2);
    ctx.lineTo(st.x1 - nx * w1, st.y1 - ny * w1);
    ctx.closePath();
  }
  function drawStreams(ctx, fx) {
    // 拖影：批次繪製。先畫非 additive（source-over），再一次切到 additive 畫其餘
    for (const addPass of [false, true]) {
      let on = false;
      for (const st of fx.streaks) {
        if (!!st.add !== addPass) continue;
        const k = st.life / st.max;
        if (!on) { ctx.globalCompositeOperation = addPass ? 'lighter' : 'source-over'; on = true; }
        ctx.globalAlpha = addPass ? k * 0.9 : k * 0.55;
        ctx.fillStyle = st.color;
        drawStreakGeo(ctx, st); ctx.fill();
        // 粗端一點收束（同一路徑僅多一次小圓，仍很便宜）
        ctx.globalAlpha = addPass ? k : k * 0.4;
        ctx.beginPath(); ctx.arc(st.x2, st.y2, Math.max(0.5, st.w * 0.35), 0, U.TAU); ctx.fill();
      }
      if (on) ctx.globalCompositeOperation = 'source-over';
    }
  }
  // 大光暈（半徑 ≥ GROUND_GLOW_R）屬於地面層，畫在 Boss 底下，避免大招的閃光把角色洗成一片白；
  // 小光暈（命中閃點、蓄力光等）仍畫在最上層。ground：true 只畫大光暈、false 只畫小光暈、undefined 全畫
  const GROUND_GLOW_R = 70;
  function drawGlows(ctx, fx, ground) {
    ctx.globalCompositeOperation = 'lighter';
    for (const g of fx.glows) {
      const k = g.life / g.max;
      if (k <= 0) continue;
      if (ground != null && (g.r >= GROUND_GLOW_R) !== ground) continue;
      let x = g.x, y = g.y;
      if (g.follow) {
        const f = g.follow;
        if (f.statuses && BD.hasStatus(f, 'hidden')) continue;
        x = f.x; y = f.y;
      }
      let a, r;
      if (g.inv) {
        // 蓄力：由暗漸亮（alpha 隨生命上升）、半徑由 r*(1+grow) 收縮到 r，結束前快速收掉
        const p = 1 - k;
        a = g.a * Math.min(1, p * 1.6) * (k < 0.12 ? k / 0.12 : 1);
        r = g.r * (1 + g.grow * k);
      } else {
        a = g.a * k;
        r = g.r * (1 + g.grow * (1 - k));
      }
      if (a <= 0.01 || r <= 0.5) continue;
      ctx.globalAlpha = Math.min(1, a);
      blitGlow(ctx, 'fxglow:' + g.color + ':' + Math.round(r), r, g.color, x, y);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  // 場地暗幕（fx.veil）：0.15 秒淡入、最後 0.3 秒淡出；畫在地面與區域之上、預警與角色之下
  function drawVeil(ctx, w, x, y, wd, h) {
    const vs = w.fx && w.fx.veils;
    if (!vs || !vs.length) return;
    for (const v of vs) {
      const a = v.a * Math.min(1, (v.max - v.life) / 0.15, v.life / 0.3);
      if (a <= 0) continue;
      ctx.globalAlpha = a; ctx.fillStyle = v.color; ctx.fillRect(x, y, wd, h);
    }
    ctx.globalAlpha = 1;
  }
  function drawGhosts(ctx, w, t) {
    const fx = w.fx;
    if (!fx || !fx.ghosts.length) return;
    ctx.save();
    for (const gh of fx.ghosts) {
      if (!gh.def) continue;
      ctx.globalAlpha = (gh.life / gh.max) * 0.4;
      R.drawBossBody(ctx, { x: gh.x, y: gh.y, face: gh.face, r: gh.r, def: gh.def, phase: gh.phase, state: 'idle' }, t);
    }
    ctx.restore();
  }
  // 特效分兩層：layer 'ground'（震波、光環、大光暈：貼地，畫在 Boss 底下）與 'air'（其餘：畫在 Boss 上面）；
  // 省略 layer 時兩層依序全畫（特效圖鑑等沒有 Boss 夾在中間的場合）
  function drawFx(ctx, w, layer) {
    const fx = w.fx;
    if (!layer) { drawFx(ctx, w, 'ground'); drawFx(ctx, w, 'air'); return; }
    ctx.save(); ctx.lineCap = 'butt';
    if (layer === 'ground') {
      drawChunks(ctx, fx);
      // 由下而上：震波 → 光環 → 大光暈
      drawShocks(ctx, fx);
      for (const r of fx.rings) {
        const k = 1 - r.life / r.max;
        ctx.strokeStyle = hexA(r.color, (1 - k) * 0.9); ctx.lineWidth = r.width * (1 - k * 0.6);
        ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0.1, U.lerp(r.r0, r.r1, Math.sqrt(k))), 0, U.TAU); ctx.stroke();
      }
      drawGlows(ctx, fx, true);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt';
      ctx.restore();
      return;
    }
    // 空中層由下而上：光柱 → 斬擊 → 光束 → 拖影 → 粒子 → 小光暈（最上層 additive）
    for (const p of fx.pillars) {
      const k = p.life / p.max;
      // 光柱：以 k=1 快取（所有色停 alpha 都隨 k 線性縮放），繪製時縮放半徑並套用 globalAlpha = k
      // key 必須含顏色（白熱中心 + 元素光色）；加法混合讓它像真正在發光
      ctx.save(); ctx.translate(p.x, p.y); const sc = 1.2 - k * 0.3; ctx.scale(sc, sc); ctx.globalAlpha *= k;
      ctx.globalCompositeOperation = 'lighter';
      const col = p.color || '#ff7a28';
      R.blit(ctx, 'fxpillar:' + Math.round(p.r) + ':' + col, p.r * 2 + 8, p.r * 2 + 8, p.r + 4, p.r + 4, (g) => {
        const gr = g.createRadialGradient(0, 0, 2, 0, 0, p.r);
        gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.35, hexA(col, 0.9)); gr.addColorStop(1, hexA(col, 0));
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, p.r, 0, U.TAU); g.fill();
      });
      ctx.restore();
    }
    drawSlashes(ctx, fx);
    for (const b of fx.beams) {
      const k = b.life / b.max;
      ctx.lineCap = 'round';
      if (b.rim) {
        ctx.strokeStyle = hexA(b.rim, k * 0.55); ctx.lineWidth = b.w * (0.6 + k * 0.6) + 6;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      }
      ctx.strokeStyle = hexA(b.color, k * 0.6); ctx.lineWidth = b.w * (0.6 + k * 0.6);
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${k})`; ctx.lineWidth = Math.max(1.5, b.w * 0.25 * k);
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      if (b.core) {
        // 元素核心光束：additive，內層亮芯 + 外層柔光
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = hexA(b.core, k * 0.55); ctx.lineWidth = Math.max(2, b.w * 0.7 * k);
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${k * 0.9})`; ctx.lineWidth = Math.max(1.5, b.w * 0.22 * k);
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    drawStreams(ctx, fx);
    drawParts(ctx, fx.parts);
    drawGlows(ctx, fx, false);
    // 收尾：狀態歸零（globalAlpha 1、source-over、lineCap butt）
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt';
    ctx.restore();
  }
  // 粒子批次：依顏色 + 量化透明度（1/32）分組，每組只設定一次樣式、一次填滿
  // 重用 Map / 陣列，每幀清空；軟粒子以 moveTo + arc 併入同一路徑
  // 依 kind 分成多組：每組一個 Map<顏色, Map<量化alpha, 陣列>>；Map 與陣列全部跨幀重用
  const PK = BD.PK || { SQ: 0, SOFT: 1, DEBRIS: 2, EMBER: 3, SHARD: 4, BUBBLE: 5, WISP: 6, SPARK: 7, MOTE: 8 };
  const partFree = [], mapsPool = [];
  // 每組暫存：hard（實心方塊）/ soft（軟圓）/ line（線段）
  const PG = [
    { map: null, mode: 'hard', add: false }, // 0 SQ
    { map: null, mode: 'soft', add: false }, // 1 SOFT
    { map: null, mode: 'debris', add: false }, // 2 DEBRIS
    { map: null, mode: 'hard', add: true },  // 3 EMBER
    { map: null, mode: 'line', add: false, tip: true }, // 4 SHARD
    { map: null, mode: 'bubble', add: false }, // 5 BUBBLE
    { map: null, mode: 'soft', add: false, wisps: true }, // 6 WISP
    { map: null, mode: 'line', add: true },  // 7 SPARK
    { map: null, mode: 'soft', add: true },  // 8 MOTE
  ];
  function drawParts(ctx, parts) {
    const take = () => partFree.pop() || [];
    // 分批：p.soft 且 kind 0 視為 SOFT（相容舊資料）
    for (const p of parts) {
      const kind = p.kind || (p.soft ? PK.SOFT : PK.SQ);
      const G0 = PG[kind] || PG[PK.SQ];
      const k = p.life / p.max;
      // 閃爍（餘燼 / 電弧 / 秘紋）：以相位與生命做低成本抖動
      let alpha = k;
      if (kind === PK.EMBER) alpha = k * (0.6 + 0.4 * Math.sin(p.ph + p.life * 20));
      else if (kind === PK.WISP || kind === PK.SOFT) alpha = k * 0.5;
      const qa = Math.round(U.clamp(alpha, 0, 1) * 32) / 32;
      if (qa <= 0) continue;
      let m = G0.map;
      if (!m) m = G0.map = mapsPool.pop() || new Map();
      let cm = m.get(p.color);
      if (!cm) { cm = new Map(); m.set(p.color, cm); }
      let arr = cm.get(qa); if (!arr) { arr = take(); cm.set(qa, arr); }
      arr.push(p);
    }
    // 先畫非加法組，再切換一次到 additive 畫其餘組
    for (const addPass of [false, true]) {
      let on = false;
      for (const G0 of PG) {
        if (G0.add !== addPass || !G0.map) continue;
        if (!on) { ctx.globalCompositeOperation = addPass ? 'lighter' : 'source-over'; on = true; }
        for (const [color, cm] of G0.map) {
          for (const [a, arr] of cm) {
            ctx.globalAlpha = a; ctx.fillStyle = color; ctx.strokeStyle = color; ctx.beginPath();
            if (G0.mode === 'hard') {
              for (const p of arr) ctx.rect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
              ctx.fill();
            } else if (G0.mode === 'soft') {
              for (const p of arr) {
                const kk = p.life / p.max, rr = p.size * (1.5 - kk * 0.5);
                ctx.moveTo(p.x + rr, p.y); ctx.arc(p.x, p.y, rr, 0, U.TAU);
              }
              ctx.fill();
            } else if (G0.mode === 'bubble') {
              // 毒泡：外擴的鏤空圓（線寬固定）
              ctx.lineWidth = 1.2;
              for (const p of arr) {
                const age = 1 - p.life / p.max, rr = p.size * (0.7 + age * 0.6);
                ctx.moveTo(p.x + rr, p.y); ctx.arc(p.x, p.y, rr, 0, U.TAU);
              }
              ctx.stroke();
            } else if (G0.mode === 'debris') {
              // 碎塊：先把同組的地面陰影併成一條路徑，再畫依假高度抬升、略放大的方塊（俯視角的高度感）
              ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.globalAlpha = a * 0.4;
              for (const p of arr) { const sw = p.size * (1.1 + p.z / 400), sh = p.size * 0.6; ctx.moveTo(p.x + sw, p.y + 1); ctx.ellipse(p.x, p.y + 1, sw, sh, 0, 0, U.TAU); }
              ctx.fill();
              ctx.globalAlpha = a; ctx.fillStyle = color; ctx.beginPath();
              for (const p of arr) { const sc = 1 + p.z / 220, sz = p.size * sc; ctx.rect(p.x - sz / 2, p.y - p.z - sz / 2, sz, sz); }
              ctx.fill();
            } else {
              // 線段：火花（速度方向拉長）與冰晶（固定長度 + 白色尖端）
              if (G0.tip) {
                for (const p of arr) {
                  const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp, L = p.size * 2.2;
                  ctx.moveTo(p.x - ux * L, p.y - uy * L); ctx.lineTo(p.x, p.y);
                }
                ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.stroke();
                ctx.fillStyle = '#fff'; ctx.beginPath();
                for (const p of arr) { ctx.moveTo(p.x + 1.6, p.y); ctx.arc(p.x, p.y, 1.6, 0, U.TAU); }
                ctx.fill();
              } else {
                for (const p of arr) {
                  const sp = Math.hypot(p.vx, p.vy) || 1, L = U.clamp(sp * 0.035, 2, 18);
                  const ux = p.vx / sp, uy = p.vy / sp;
                  ctx.moveTo(p.x - ux * L, p.y - uy * L); ctx.lineTo(p.x, p.y);
                }
                ctx.lineWidth = Math.max(1, arr[0].size); ctx.lineCap = 'round'; ctx.stroke();
              }
            }
            arr.length = 0;
          }
        }
      }
      if (on) ctx.globalCompositeOperation = 'source-over';
    }
    // 回收 Map 與陣列（Map 已清空後放回池中）
    for (const G0 of PG) {
      if (!G0.map) continue;
      for (const cm of G0.map.values()) for (const arr of cm.values()) if (!arr.length) partFree.push(arr);
      G0.map.clear(); mapsPool.push(G0.map); G0.map = null;
    }
  }
  function drawTexts(ctx, w) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const tx of w.fx.texts) {
      const k = tx.life / tx.max, pop = tx.pop ? 1 + Math.max(0, (k - 0.8)) * 2.5 : 1;
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = `bold ${Math.round(tx.size * pop)}px ${FONT}`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(tx.text, tx.x, tx.y);
      ctx.fillStyle = tx.color; ctx.fillText(tx.text, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;
    for (const c of w.callouts) {
      const b = c.boss, k = c.life / c.max;
      if (BD.hasStatus(b, 'hidden') && b.state !== 'skill') continue;
      ctx.globalAlpha = Math.min(1, k * 3);
      ctx.font = `bold 20px ${FONT}`;
      // 有 HUD 狀態時狀態圖示列佔用了原文字位置，文字再上移 12px
      const y = b.y - b.r - 44 - (1 - k) * 14 - (hasHudStatus(b) ? 12 : 0);
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.strokeText(c.text, b.x, y);
      ctx.fillStyle = b.def.glow; ctx.fillText(c.text, b.x, y);
    }
    ctx.globalAlpha = 1;
  }

  Object.assign(R.draw, { arena: drawArena, decals: drawDecals, zones: drawZones, traps: drawTraps, telegraphs: drawTelegraphs, pillars: drawPillars, reflections: drawReflections,
    minions: drawMinions, boss: drawBoss, ghosts: drawGhosts, veil: drawVeil, projectiles: drawProjectiles, lobs: drawLobs, fx: drawFx, texts: drawTexts, star });
})(typeof window !== 'undefined' ? window : globalThis);
