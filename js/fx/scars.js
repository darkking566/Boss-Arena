'use strict';
// 戰鬥痕跡：招式在地面留下的永久痕跡（劍痕、焦痕、坑洞、霜、毒漬、樹墩與落葉…），整場保留，超過上限時最舊的先消失。
// 由 BD.spawnFx 依特效分類自動呼叫 BD.leaveScar，所以日後新增的招式只要分類正確就會自動留痕。
// 純視覺：亂數只用 BD.vrng、不碰戰鬥狀態與 DOM；繪圖見 js/render/world.js 的 drawScars。水面不留痕。
(function (G) {
  const BD = G.BD, V = BD.vrng, TAU = Math.PI * 2, CAP = 260;
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
  const jag = (n, lo) => Array.from({ length: n }, () => lo + V() * (1 - lo));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  BD.leaveScar = function (w, id, cat, x, y, o) {
    const fx = w.fx; if (!fx.scars || BD.pondAt(x, y)) return;
    const ground = GROUND[BD.biomeAt(x).id], D = ground || PAL.physical; // 沙 / 雪 / 麥田的「泥土色」
    const P = o.el === 'physical' && ground ? ground : PAL[o.el] || PAL.physical;
    const a = o.angle || 0, r = o.radius, k = o.k;
    const add = (s) => { if (BD.pondAt(s.x, s.y)) return; s.age = 0; fx.scars.push(s); if (fx.scars.length > CAP) fx.scars.shift(); };
    const gash = (gx, gy, ga, len, wd, arc, al) => add({ k: 'gash', x: gx, y: gy, a: ga, len, wd, arc, al: al || 1, c: P.c, c2: P.c2, glow: P.glow });
    const blot = (bx, by, br) => add({ k: 'blot', x: bx, y: by, r: br, rot: V() * TAU, pts: jag(12, 0.6), c: P.c, c2: P.c2, glow: P.glow });
    const pit = (px, py, pr) => add({ k: 'pit', x: px, y: py, r: pr, rot: V() * TAU, pts: jag(10, 0.8), c: D.c, c2: D.c2,
      cr: Array.from({ length: 5 + ((V() * 3) | 0) }, () => [V() * TAU, pr * (1.2 + V() * 0.7)]) });
    const litter = (n, spread) => add({ k: 'litter', x, y, bits: Array.from({ length: n }, () => [(V() - 0.5) * 2 * spread, (V() - 0.5) * 2 * spread, V() * TAU, 2 + V() * 2.5, LEAF[(V() * LEAF.length) | 0]]) });

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
      if (id === 'explode' || (id === 'burst' && r >= 80)) { if (o.el === 'physical') pit(x, y, clamp(r * 0.35, 12, 60)); else blot(x, y, clamp(r * 0.7, 20, 110)); }
    } else if (cat === '區域') {
      if (id === 'breath' && o.el !== 'physical') for (const f of [0.5, 0.8]) blot(x + Math.cos(a) * r * f, y + Math.sin(a) * r * f, r * 0.3);
    } else if (cat === '位移') {
      if (id === 'leap') pit(x, y, 20);
      else if (id === 'burrow') pit(x, y, clamp(36 * k, 20, 60));
      else if ((id === 'dash' || id === 'hoofcharge') && o.len > 0) { // 衝刺滑痕 / 蹄痕：沿路兩道淡痕
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
