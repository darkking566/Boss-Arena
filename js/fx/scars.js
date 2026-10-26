'use strict';
// 戰鬥痕跡：招式在地面留下的永久痕跡（劍痕、焦痕、坑洞、霜、毒漬、樹墩與落葉…），整場保留，超過上限時最舊的先消失。
// 由 BD.spawnFx 依特效分類自動呼叫 BD.leaveScar，所以日後新增的招式只要分類正確就會自動留痕。
// 純視覺：亂數只用 BD.vrng、不碰戰鬥狀態與 DOM；繪圖見 js/render/world.js 的 drawScars。水面不留痕。
(function (G) {
  const BD = G.BD, V = BD.vrng, TAU = Math.PI * 2, CAP = 420;
  // c 主色（痕跡本體）、c2 邊緣 / 次色、glow 剛造成時的餘燼 / 微光（會在數秒內冷卻）
  const PAL = {
    physical: { c: '#2a1d12', c2: '#7a6446' },
    fire: { c: '#120b07', c2: '#33280f', glow: '#ff6a1a' },
    lightning: { c: '#0c1017', c2: '#262c36', glow: '#a8dcff' },
    ice: { c: '#e9f7ff', c2: '#9fd3ea' },
    poison: { c: '#33520f', c2: '#587a20' },
    blood: { c: '#4a0610', c2: '#700c1a' },
    shadow: { c: '#150a24', c2: '#2e1c46' },
    umbra: { c: '#0a0408', c2: '#2a1218', glow: '#e01e37' },
    holy: { c: '#f2e6b0', c2: '#d9c47a', glow: '#ffe27a' },
    arcane: { c: '#3a1e5a', c2: '#5f3d88', glow: '#c77dff' },
  };
  const GROUND = { desert: { c: '#6d5632', c2: '#e3d3a0' }, snow: { c: '#8aa3bf', c2: '#ffffff' }, wheat: { c: '#4a3618', c2: '#caa24c' } };
  const LEAF = ['#5f9e3c', '#3f7a2c', '#8bc34a', '#9b6b3c'];
  // 粗糙輪廓：n 個半徑倍率 = 低頻起伏（大尺度的歪斜）＋逐點抖動，amp 越大越不規則
  const rough = (n, amp) => {
    const ph = [V() * TAU, V() * TAU, V() * TAU];
    return Array.from({ length: n }, (_, i) => { const t = i / n * TAU; return clamp(1 - amp * 0.5 + amp * (0.5 * Math.sin(ph[0] + t * 2) + 0.3 * Math.sin(ph[1] + t * 3) + 0.2 * Math.sin(ph[2] + t * 5)) * 0.8 + (V() - 0.5) * amp * 0.5, 0.3, 1.4); });
  };
  const jag = (n, lo) => Array.from({ length: n }, () => lo + V() * (1 - lo));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  BD.leaveScar = function (w, id, cat, x, y, o) {
    const fx = w.fx; if (!fx.scars || BD.pondAt(x, y)) return;
    const ground = GROUND[BD.biomeAt(x).id], D = ground || PAL.physical; // 沙 / 雪 / 麥田的「泥土色」
    const P = o.el === 'physical' && ground ? ground : PAL[o.el] || PAL.physical;
    const a = o.angle || 0, r = o.radius, k = o.k;
    const add = (s) => { if (BD.pondAt(s.x, s.y)) return; s.age = 0; fx.scars.push(s); if (!BD.keepScars && fx.scars.length > CAP) fx.scars.shift(); };
    // 劍痕：不規則的裂口。沿路取樣，寬度（尖端收窄＋起伏）、深度（深淺不一的暗核）、左右邊緣與中線偏移各自抖動；
    // 長痕會斷成數段，沿邊緣另有細裂紋與碎屑。每點 = [左x,左y,右x,右y,中x,中y,深度]
    const gash = (gx, gy, ga, len, wd, arc, al) => {
      wd *= 1.6; // 變寬後起伏才看得出來
      const total = arc ? len * arc : len, ph = [V() * TAU, V() * TAU, V() * TAU], cut = [];
      for (let u = 0; u < 0.98;) { const u1 = total < 80 ? 1 : Math.min(1, u + 0.25 + V() * 0.6); cut.push([u, u1]); u = u1 + 0.03 + V() * 0.07; }
      const strokes = [], chips = [];
      for (const [u0, u1] of cut) {
        const n = clamp(Math.round(total * (u1 - u0) / 7), 5, 34), pts = [];
        for (let i = 0; i <= n; i++) {
          const t = i / n, u = u0 + (u1 - u0) * t, env = Math.pow(Math.sin(Math.PI * t), 0.65);
          const wob = 0.65 + 0.35 * (Math.sin(ph[0] + u * 9) * 0.6 + Math.sin(ph[1] + u * 23) * 0.4);
          const w = wd * (0.35 + 1.15 * wob + (V() - 0.5) * 0.35) * env, d = clamp(env * (0.45 + 0.55 * Math.sin(ph[2] + u * 11) ** 2 + (V() - 0.5) * 0.3), 0.08, 1);
          const j = (Math.sin(ph[0] * 2 + u * 6) * 0.5 + (V() - 0.5) * 0.4) * wd, wl = w * (0.5 + (V() - 0.5) * 0.7), wr = w * (0.5 + (V() - 0.5) * 0.7);
          const ang = ga + (arc ? (u - 0.5) * arc : 0), nx = arc ? Math.cos(ang) : -Math.sin(ga), ny = arc ? Math.sin(ang) : Math.cos(ga);
          const bx = arc ? gx + Math.cos(ang) * len : gx + Math.cos(ga) * len * u, by = arc ? gy + Math.sin(ang) * len : gy + Math.sin(ga) * len * u;
          const cx = bx + nx * j, cy = by + ny * j;
          pts.push([cx + nx * wl, cy + ny * wl, cx - nx * wr, cy - ny * wr, cx, cy, d]);
          if (i > 0 && i < n && V() < 0.16) { const s = V() < 0.5 ? 1 : -1, a2 = Math.atan2(ny, nx) + (V() - 0.5) * 1.2, L = (3 + V() * 9) * (0.6 + wd * 0.12);
            chips.push([cx + nx * s * w * 0.5, cy + ny * s * w * 0.5, Math.cos(a2) * s * L, Math.sin(a2) * s * L, V() < 0.5 ? 1 : 0]); }
        }
        strokes.push(pts);
      }
      add({ k: 'gash', strokes, chips, al: al || 1, c: P.c, c2: P.c2, glow: P.glow });
    };
    const blot = (bx, by, br, al) => add({ k: 'blot', x: bx, y: by, r: br, rot: V() * TAU, pts: rough(14, 0.7), pts2: rough(10, 0.6), rot2: V() * TAU, off: [(V() - 0.5) * br * 0.3, (V() - 0.5) * br * 0.3],
      sat: Array.from({ length: 2 + ((V() * 4) | 0) }, () => [V() * TAU, br * (1.05 + V() * 0.8), br * (0.05 + V() * 0.1)]), // 外圍濺點
      tails: Array.from({ length: (V() * 3) | 0 }, () => [V() * TAU, br * (1.1 + V() * 0.7)]), al: al || 1, c: P.c, c2: P.c2, glow: P.glow });
    const surf = (kind, sr) => add({ k: kind, x, y, r: sr, rot: V() * TAU, pts: jag(12, 0.65), cr: Array.from({ length: 6 + ((V() * 3) | 0) }, () => [V() * TAU, sr * (0.4 + V() * 0.7)]) });
    // 坑洞：粗糙外緣、偏向一側的深坑、被翻起的土塊、帶分叉的鋸齒裂紋
    const crack = (a, d, len, depth) => {
      const pts = [[Math.cos(a) * d, Math.sin(a) * d * 0.85]], kids = [];
      for (let i = 0; i < 3 + ((V() * 3) | 0); i++) {
        a += (V() - 0.5) * 1; d += len * (0.6 + V() * 0.6); pts.push([Math.cos(a) * d, Math.sin(a) * d * 0.85]);
        if (depth && i === 1 && V() < 0.5) kids.push(crack(a + (V() < 0.5 ? 0.7 : -0.7), d, len * 0.7, 0));
      }
      return [pts, ...kids.flat()];
    };
    const pit = (px, py, pr) => add({ k: 'pit', x: px, y: py, r: pr, rot: V() * TAU, pts: rough(20, 0.5), inner: rough(16, 0.45), lip: rough(18, 0.6), c: D.c, c2: D.c2,
      lumps: Array.from({ length: 6 + ((V() * 6) | 0) }, () => [V() * TAU, pr * (1.05 + V() * 0.4), 1.2 + V() * 2.8]),
      cr: Array.from({ length: 3 + ((V() * 4) | 0) }, () => crack(V() * TAU, pr * 0.85, pr * (0.15 + V() * 0.2), 1)).flat() });
    const litter = (n, spread) => add({ k: 'litter', x, y, bits: Array.from({ length: n }, () => [(V() - 0.5) * 2 * spread, (V() - 0.5) * 2 * spread, V() * TAU, 2 + V() * 2.5, LEAF[(V() * LEAF.length) | 0]]) });

    if (BD.biomeAt(x).id === 'lake') { // 湖面：只有 lakesplash 會留下水面上的痕跡
      if (id !== 'lakesplash') return;
      const el = o.el;
      if (el === 'fire' && (o.dmg >= 100 || o.zoneR || k >= 1.6)) surf('rock', clamp(o.zoneR || 60 * k, 36, 150)); // 熔岩遇水凝固成岩石
      else if (el === 'ice') surf('ice', clamp(55 * k, 40, 130)); // 水面凍結
      else if (el === 'poison' || el === 'blood' || el === 'shadow' || el === 'umbra') blot(x, y, clamp(70 * k, 40, 160), 0.6); // 毒 / 血 / 暗影在水中暈開
      return;
    }
    if (cat === '斬擊') {
      if (id === 'contempt') for (const s of [-1, 1]) gash(x, y, a + s * Math.PI / 4 + Math.PI, 40, 3, 0, 0.9);
      else if (id === 'whirl') gash(x, y, a, r * 0.95, 3 + k, TAU * 0.92);
      else {
        gash(x, y, a, r * 0.95, 3 + 2 * k, o.arc || 1.6);
        if (id === 'cleave') pit(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, clamp(r * 0.2, 14, 40));
      }
    } else if (cat === '突刺') {
      if (o.len > 0) gash(x, y, a, o.len, clamp((o.width || 40) * 0.1, 3, 8), 0);
    } else if (cat === '砸地') {
      const pr = clamp(r * (id === 'bigslam' ? 0.55 : 0.4), 14, 90);
      pit(x, y, pr);
      if (o.el !== 'physical') blot(x, y, pr * 1.9);
    } else if (cat === '爆炸') {
      if (id === 'explode' || id === 'firerockburst' || id === 'dragonpyre' || (id === 'burst' && r >= 80)) { if (o.el === 'physical') pit(x, y, clamp(r * 0.35, 12, 60)); else blot(x, y, clamp(r * 0.7, 20, 110)); }
    } else if (cat === '區域') {
      if ((id === 'breath' || id === 'graftbreath') && o.el !== 'physical') for (const f of [0.5, 0.8]) blot(x + Math.cos(a) * r * f, y + Math.sin(a) * r * f, r * 0.3);
    } else if (cat === '位移') {
      if (id === 'leap' || id === 'omenleap' || id === 'axeleap' || id === 'stormleap') pit(x, y, 20);
      else if (id === 'burrow') pit(x, y, clamp(36 * k, 20, 60));
      else if ((id === 'dash' || id === 'hoofcharge' || id === 'goldcharge' || id === 'omenbackstep') && o.len > 0) { // 衝刺滑痕 / 蹄痕：沿路兩道淡痕
        const gap = id === 'dash' ? (o.src && o.src.r || 20) * 0.5 : 14;
        for (const s of [-1, 1]) gash(x - Math.sin(a) * s * gap, y + Math.cos(a) * s * gap, a, o.len, 2, 0, 0.45);
      }
    } else if (cat === '大招') {
      if (id === 'skyrend' && o.len > 0) { // 沿整條判定線的深溝，溝上每隔一段留一塊元素焦痕
        const w = o.width || 120;
        gash(x, y, a, o.len, clamp(w * 0.12, 6, 16), 0);
        for (let d = 90; d < o.len; d += 180) blot(x + Math.cos(a) * d, y + Math.sin(a) * d, w * 0.35);
      } else if (id === 'threadcut' && o.len > 0) fx.after(Math.max(0, o.hold || 0), () => gash(x, y, a, o.len, clamp((o.width || 40) * 0.1, 3, 8), 0)); // 刀線裂開時才現形
      else if (id === 'domain') for (let i = 0; i + 1 < (o.pts || []).length && i < 20; i += 2) blot(o.pts[i], o.pts[i + 1], 24 + V() * 16);
      else if (id === 'finale') blot(x, y, clamp((o.src && o.src.r || r) * 2.2, 50, 130));
    } else if (cat === '地形') {
      if (id === 'treecut') { add({ k: 'stump', x, y, r: o.r }); litter(14, o.r * 1.6); }
      else if (id === 'treesmash') { pit(x, y, o.r * 0.9); litter(14, o.r * 2); }
      else if (id === 'treehit') litter(4, 24);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
