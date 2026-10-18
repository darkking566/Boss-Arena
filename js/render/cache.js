'use strict';
// 精靈快取：把靜態繪製指令畫進離屏 canvas 並重複使用，以及漸層快取（R.grad）
// 僅供瀏覽器使用；實際使用 R.blit / R.grad 的繪圖程式在後續調整中逐步套用。
(function (G) {
  const BD = G.BD, R = BD.Render;
  const C = R.cache = {
    enabled: true, debug: false, map: new Map(), max: 600,
    hits: 0, misses: 0, frameHits: 0, frameMisses: 0, gen: 0,
  };
  const invalidators = [];
  const grads = new Map(); // Map: ctx → Map(key → gradient)

  // 由目前畫布的變換取得量化後的繪製倍率（1/4 級距，最低 0.5）
  R.renderScale = function (ctx) {
    const m = ctx.getTransform();
    const s = Math.hypot(m.a, m.b) || 1;
    return Math.max(0.5, Math.round(s * 4) / 4);
  };

  // 取得（必要時建立）快取精靈；key + '@' + scale
  R.sprite = function (key, w, h, ox, oy, draw, scale) {
    const k = key + '@' + scale;
    const hit = C.map.get(k);
    if (hit) { C.hits++; C.frameHits++; return hit; }
    C.misses++; C.frameMisses++;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * scale) + 2; canvas.height = Math.ceil(h * scale) + 2;
    const c2d = canvas.getContext('2d');
    c2d.setTransform(scale, 0, 0, scale, scale * ox + 1, scale * oy + 1);
    draw(c2d);
    const entry = { canvas, w, h, ox, oy, scale };
    C.map.set(k, entry);
    if (C.map.size > C.max) {
      const n = Math.ceil(C.map.size / 4);
      let i = 0;
      for (const mk of C.map.keys()) { if (i++ >= n) break; C.map.delete(mk); }
    }
    return entry;
  };

  // 把精靈畫到目前座標 (x, y)（區域座標）。若目前變換只有平移與等於精靈倍率的縮放（無旋轉 / 額外縮放），
  // 改以裝置像素對齊的 1:1 複製（不需重新取樣，軟體光柵下快很多；位置誤差 ≤ 0.5 裝置像素）。
  function drawSprite(ctx, e, x, y) {
    const m = ctx.getTransform();
    if (m.b === 0 && m.c === 0 && Math.abs(m.a - e.scale) < 1e-6 && Math.abs(m.d - e.scale) < 1e-6) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(e.canvas, Math.round(m.e + x * m.a), Math.round(m.f + y * m.d));
      ctx.restore();
    } else {
      ctx.drawImage(e.canvas, x, y, e.canvas.width / e.scale, e.canvas.height / e.scale);
    }
  }
  R.drawSprite = drawSprite;

  // 快取繪製：呼叫端已把 ctx 平移到精靈原點（可再旋轉），draw(c2d) 以相同區域座標繪製
  R.blit = function (ctx, key, w, h, ox, oy, draw) {
    if (!C.enabled) { draw(ctx); return; }
    const s = R.renderScale(ctx);
    const e = R.sprite(key, w, h, ox, oy, draw, s);
    drawSprite(ctx, e, -ox - 1 / s, -oy - 1 / s);
    if (C.debug) { ctx.save(); ctx.strokeStyle = 'rgba(0,255,0,0.7)'; ctx.lineWidth = 1 / s; ctx.strokeRect(-ox, -oy, w, h); ctx.restore(); }
  };

  // 漸層備忘：同一 ctx 上，key 相同且參數固定的漸層可跨幀重用
  R.grad = function (ctx, key, make) {
    let m = grads.get(ctx);
    if (!m) { m = new Map(); grads.set(ctx, m); }
    let g = m.get(key);
    if (!g) { g = make(ctx); m.set(key, g); }
    return g;
  };

  // 清空快取並通知其他模組（例如場景靜態層）
  R.onInvalidate = function (fn) { if (typeof fn === 'function') invalidators.push(fn); };
  R.invalidateCaches = function () {
    C.map.clear(); grads.clear(); C.gen++;
    for (const fn of invalidators) fn();
  };
  // 每幀開始時重設快取統計
  R.cacheBeginFrame = function () { C.frameHits = 0; C.frameMisses = 0; };
})(typeof window !== 'undefined' ? window : globalThis);
