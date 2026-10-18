'use strict';
// 效能監看：F3 顯示 FPS / 幀時間 / 繪製時間 / 實體數量 / 快取命中率；F4 快取開關提示
(function (G) {
  const BD = G.BD, R = BD.Render;
  const N = 120;
  const frameBuf = [], renderBuf = [];
  const P = R.perf = { show: false };
  let banner = '', bannerT = 0;

  function p95(arr) {
    if (!arr.length) return 0;
    const a = arr.slice().sort((x, y) => x - y);
    return a[Math.min(a.length - 1, Math.floor(a.length * 0.95))];
  }
  function avg(arr) { let s = 0; for (const v of arr) s += v; return arr.length ? s / arr.length : 0; }

  // 每幀推入：frameMs = 兩個 rAF 的間隔，renderMs = R.render 所花時間
  P.push = function (frameMs, renderMs) {
    if (frameMs > 0) { frameBuf.push(frameMs); if (frameBuf.length > N) frameBuf.shift(); }
    renderBuf.push(renderMs); if (renderBuf.length > N) renderBuf.shift();
    if (bannerT > 0) bannerT -= frameMs / 1000;
  };
  // 顯示 1.5 秒的短提示（繪製端狀態，不動遊戲世界）
  P.notice = function (text) { banner = text; bannerT = 1.5; };

  P.draw = function (ctx, w) {
    const lines = [];
    const fps = frameBuf.length ? 1000 / avg(frameBuf) : 0;
    const parts = w ? w.fx.parts.length : 0;
    const minions = w ? w.minions.filter((m) => m.alive).length : 0;
    lines.push(`FPS ${fps.toFixed(0)}  幀 ${avg(frameBuf).toFixed(1)} / p95 ${p95(frameBuf).toFixed(1)} ms`);
    lines.push(`繪製 ${avg(renderBuf).toFixed(1)} / p95 ${p95(renderBuf).toFixed(1)} ms`);
    if (w) lines.push(`粒子 ${parts}  召喚物 ${minions}  投射物 ${w.projectiles.length}  區域 ${w.zones.length}`);
    const C = R.cache;
    lines.push(`快取 ${C.enabled ? '開' : '關'}  項目 ${C.map.size}  命中 ${C.frameHits} / 未命中 ${C.frameMisses}`);
    ctx.save();
    ctx.font = '13px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const pw = 300, ph = lines.length * 18 + 10;
    ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(R.OX, 180, pw, ph);
    ctx.fillStyle = '#9f9'; ctx.fillText(lines[0], R.OX + 8, 186);
    ctx.fillStyle = '#dfd';
    for (let i = 1; i < lines.length; i++) ctx.fillText(lines[i], R.OX + 8, 186 + i * 18);
    ctx.restore();
  };

  // 快取開關的短提示（獨立於 overlay，任何畫面都可見）
  P.drawNotice = function (ctx) {
    if (bannerT <= 0) return;
    ctx.save();
    ctx.font = `bold 20px ${R.FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = Math.min(1, bannerT * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(R.OX + R.W / 2 - R.OX - 110, 300, 220, 44);
    ctx.fillStyle = '#fff'; ctx.fillText(banner, R.W / 2, 322);
    ctx.restore();
  };
})(typeof window !== 'undefined' ? window : globalThis);
