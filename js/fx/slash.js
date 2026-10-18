'use strict';
// 特效庫｜斬擊（slash / cleave / whirl）：弧形揮砍、重劈與 360° 迴旋斬
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
// o：E 元素主題、angle 揮擊方向、arc 張角、radius 半徑、k 綜合倍率、heavy 沉重節奏、src 施放者
(function (G) {
  const BD = G.BD;

  BD.defineEffect('slash', {
    name: '弧斬', category: '斬擊',
    desc: '一道明亮弧刃掃過前方：核心亮線、殘影弧與沿切線飛散的火花。適合一般揮砍、快速連段。',
    params: { arc: 1.6 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.radius || 100;
      const ang = o.angle || 0, arc = o.arc || 1.6;
      const life = o.heavy ? 0.4 : 0.22, width = o.heavy ? 14 : 12;
      fx.slash(x, y, ang, arc, r, E.glow, width, life, { core: E.core, trail: k > 1.3 ? 3 : 2 });
      const tipA = ang + arc * 0.5, midA = ang;
      const tipX = x + Math.cos(tipA) * r, tipY = y + Math.sin(tipA) * r;
      fx.sparkle(tipX, tipY, E.core, Math.round(6 * k), 300, tipA + Math.PI / 2, 0.8);
      fx.sparkle(tipX, tipY, E.core, Math.round(4 * k), 300, tipA - Math.PI / 2, 0.8);
      for (let i = 0; i < 3; i++) {
        const a = ang + (BD.vrng() - 0.5) * arc;
        fx.motes(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85, E, 1, 10, 90);
      }
      if (k > 1.3) fx.flashAt(x + Math.cos(midA) * r * 0.7, y + Math.sin(midA) * r * 0.7, r * 0.35, E.core, 0.12);
    },
  });

  BD.defineEffect('cleave', {
    name: '重劈', category: '斬擊',
    desc: '更寬更慢的大弧重斬：弧刃前端砸出裂地、閃光與碎石，畫面震動明顯。適合巨型 Boss 的單發重斬。',
    params: { arc: 1.9 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.radius || 140;
      const ang = o.angle || 0, arc = o.arc || 1.9;
      const life = o.heavy ? 0.55 : 0.4, width = (o.heavy ? 22 : 18) * Math.min(1.6, k);
      fx.slash(x, y, ang, arc, r, E.glow, width, life, { core: E.core, trail: 3 });
      const hx = x + Math.cos(ang) * r * 0.8, hy = y + Math.sin(ang) * r * 0.8;
      fx.crack(hx, hy, r * 0.32, E.decal, o.heavy ? 8 : 6, E.crack, 5);
      fx.flashAt(hx, hy, r * 0.4, E.core, 0.14);
      fx.debris(hx, hy, E.debris, Math.round(8 * k), 240, 3.5 + k, r * 0.12);
      fx.sparkle(hx, hy, E.core, Math.round(8 * k), 280);
      fx.motes(hx, hy, E, Math.round(6 * k), r * 0.2, 140);
      fx.shake(Math.min(18, 6 * k));
    },
  });

  BD.defineEffect('whirl', {
    name: '迴旋斬', category: '斬擊',
    desc: '原地 360° 迴旋：兩段半圓弧刃接連掃出，外圈震波擴散、四周火花沿切線飛射。適合旋轉掃擊、清場。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.radius || 110;
      const ang = o.angle || 0;
      const life = o.heavy ? 0.4 : 0.26, width = (o.heavy ? 15 : 12) * Math.min(1.5, k);
      fx.slash(x, y, ang, Math.PI, r, E.glow, width, life, { core: E.core, trail: 2 });
      fx.slash(x, y, ang + Math.PI, Math.PI, r, E.glow, width, life, { core: E.core, trail: 2 });
      fx.shock(x, y, 10, r * 1.1, o.heavy ? 0.5 : 0.35, E.glow, 6 * Math.min(1.6, k), E.core);
      const n = Math.round(8 * k);
      for (let i = 0; i < n; i++) {
        const a = ang + i / n * Math.PI * 2;
        fx.sparkle(x + Math.cos(a) * r, y + Math.sin(a) * r, E.core, 2, 260, a + Math.PI / 2, 0.7);
        fx.motes(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, E, 1, 12, 100);
      }
      if (k > 1.4) fx.flashAt(x, y, r * 0.5, E.core, 0.12);
      fx.shake(Math.min(10, 3 * k));
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
