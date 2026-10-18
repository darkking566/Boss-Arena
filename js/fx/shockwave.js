'use strict';
// 特效庫｜震波（ring / nova / pillarring）：地面震波環、爆環與柱環
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
// o：E 元素主題、radius 外半徑、r0 內半徑、k 綜合倍率、heavy 沉重節奏
(function (G) {
  const BD = G.BD;

  BD.defineEffect('ring', {
    name: '震波環', category: '震波',
    desc: '貼地擴散的單圈衝擊環：明亮前緣向外推開，外圈散出元素微光。適合踐踏、落地衝擊等中距離範圍。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.radius || 100;
      fx.shock(x, y, o.r0 || 0, r, o.heavy ? 0.5 : 0.35, E.glow, 10 * Math.min(1.5, k), E.core);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        fx.motes(x + Math.cos(a) * r, y + Math.sin(a) * r, E, 1, 10, 100);
      }
      fx.shake(Math.min(8, 5 * Math.min(k, 1.6)));
    },
  });

  BD.defineEffect('nova', {
    name: '爆環', category: '震波',
    desc: '光暈炸開的環形爆散：震波快速擴張、火花向四周放射、元素粒子四射（冰元素為冰晶）。適合冰爆、能量新星。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.radius || 120;
      fx.glow(x, y, r * 0.7, E.glow, 0.4, 0.6, 0.6);
      fx.shock(x, y, 10, r, 0.4, E.glow, 10 * Math.min(1.5, k), E.core);
      fx.sparkle(x, y, E.core, Math.round(24 * k), 380);
      fx.motes(x, y, E, Math.round(20 * k), r * 0.5, 240);
      if (k > 1.3) fx.flashAt(x, y, r * 0.4, E.core, 0.14);
      fx.shake(Math.min(10, 4 * k));
    },
  });

  BD.defineEffect('pillarring', {
    name: '柱環', category: '震波',
    desc: '環形排列的光柱同時升起：震波掃過的環上接連冒出多道光柱與爆散火花。適合火焰環、聖環、地脈噴發圈。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.radius || 140, r0 = o.r0 || 10;
      fx.shock(x, y, r0, r, o.heavy ? 0.6 : 0.45, E.glow, 12 * Math.min(1.5, k), E.core);
      const rr = o.r0 ? (o.r0 + r) / 2 : r * 0.7;
      const pr = 40 * Math.sqrt(k);
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2 + 0.2 * i;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        fx.pillar(px, py, pr, E.glow, 0.5 + 0.06 * i);
        fx.motes(px, py, E, 1, 14, 120);
        fx.sparkle(px, py, E.core, 1, 200);
      }
      fx.sparkle(x, y, E.core, Math.round(30 * k), 420);
      fx.motes(x, y, E, Math.round(12 * k), rr, 180);
      fx.flashAt(x, y, r * 0.35, E.core, 0.12);
      fx.shake(Math.min(18, 9 * Math.min(k, 1.7)));
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
