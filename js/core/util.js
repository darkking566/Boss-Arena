'use strict';
// Boss鬥技場 — 共用工具：數學、亂數、形狀判定
(function (G) {
  const BD = G.BD = G.BD || {};
  const U = BD.U = {};
  U.TAU = Math.PI * 2;
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  U.angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  U.angDiff = (a, b) => {
    let d = (b - a) % U.TAU;
    if (d > Math.PI) d -= U.TAU;
    if (d < -Math.PI) d += U.TAU;
    return d;
  };
  U.rotateToward = (a, b, max) => a + U.clamp(U.angDiff(a, b), -max, max);
  U.norm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };

  // 可設定種子的亂數（mulberry32）
  U.makeRng = function (seed) {
    let s = (seed >>> 0) || 1;
    const r = () => {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (a, b) => a + (b - a) * r();
    r.int = (a, b) => Math.floor(a + (b - a + 1) * r());
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.chance = (p) => r() < p;
    r.sign = () => (r() < 0.5 ? -1 : 1);
    return r;
  };

  // 視覺專用亂數（與遊戲種子完全分離，絕不影響模擬結果）
  // 只在 js/render/**、FX、zone 的 seed 欄位使用；預設種子 0x9E3779B9
  const VR_SEED = 0x9E3779B9;
  let vr = U.makeRng(VR_SEED);
  const vrng = function () { return vr(); };
  vrng.seed = function (n) { vr = U.makeRng(n); return vrng; };
  vrng.range = (a, b) => a + (b - a) * vr();
  vrng.int = (a, b) => Math.floor(a + (b - a + 1) * vr());
  vrng.pick = (arr) => arr[Math.floor(vr() * arr.length)];
  vrng.chance = (p) => vr() < p;
  vrng.sign = () => (vr() < 0.5 ? -1 : 1);
  BD.vrng = vrng;

  // 判定一個圓形單位 (u.x,u.y,u.r) 是否碰到形狀
  // shape.kind: circle | cone | rect | ring | except(全場除安全圈)
  U.hitShape = function (s, u) {
    const er = u.r || 0;
    const dx = u.x - s.x, dy = u.y - s.y;
    const d = Math.hypot(dx, dy);
    switch (s.kind) {
      case 'circle': return d < s.r + er;
      case 'ring': return d < s.r + er && d > (s.r0 || 0) - er;
      case 'cone': {
        if (d > s.r + er) return false;
        if (d < er + 6) return true;
        const a = Math.abs(U.angDiff(s.ang, Math.atan2(dy, dx)));
        return a < s.arc / 2 + Math.asin(Math.min(1, er / d));
      }
      case 'rect': {
        const c = Math.cos(-s.ang), sn = Math.sin(-s.ang);
        const lx = dx * c - dy * sn, ly = dx * sn + dy * c;
        return lx > -er && lx < s.len + er && Math.abs(ly) < s.w / 2 + er;
      }
      case 'except': return d > s.r - er * 0.5;
    }
    return false;
  };
  U.pointInShape = (s, x, y) => U.hitShape(s, { x, y, r: 0 });
})(typeof window !== 'undefined' ? window : globalThis);
