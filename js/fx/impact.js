'use strict';
// 特效庫｜砸地（impact / slam）：重擊地面的衝擊、裂地、碎石與煙塵
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
// o：E 元素主題、radius 半徑、k 綜合倍率（scale × √(weight × intensity)）、heavy 沉重節奏、src 施放者
(function (G) {
  const BD = G.BD;

  BD.defineEffect('slam', {
    name: '砸地', category: '砸地',
    desc: '武器或拳頭重擊地面：衝擊閃光、明亮前緣震波、裂地、碎石彈跳與煙塵。適合中型範圍的單發重擊。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, r = o.radius, k = o.k, life = o.heavy ? 0.55 : 0.4;
      fx.flashAt(x, y, r * 0.55, E.core, 0.14);
      fx.glow(x, y, r * 0.8, E.glow, life * 1.2, 0.55, 0.4);
      fx.shock(x, y, 10, r, life, E.glow, 8 * Math.min(1.6, k), E.core);
      fx.crack(x, y, r * 0.75, E.decal, o.heavy ? 8 : 6, E.crack, Math.round(6 + 3 * k));
      fx.decal(x, y, r * 0.6, E.decal, 6);
      fx.debris(x, y, E.debris, Math.round(10 * k), 260 * Math.min(1.5, k), 3.5 + k, r * 0.3);
      fx.sparkle(x, y, E.core, Math.round(10 * k), 340);
      if (o.heavy || k > 1.2) fx.smoke(x, y, E.smoke, Math.round(6 * k), r * 0.6);
      fx.motes(x, y, E, Math.round(8 * k), r * 0.6, 160);
      fx.shake((o.heavy ? 8.4 : 6) * Math.min(1.7, k));
    },
  });

  BD.defineEffect('bigslam', {
    name: '巨力砸地', category: '砸地',
    desc: '跳砸 / 大招級的毀滅重擊：雙層震波、大範圍裂地、強烈閃光與大量碎石。巨型 Boss 使用時會自動更巨大。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, r = o.radius, k = o.k, life = o.heavy ? 0.9 : 0.6;
      fx.flashAt(x, y, r * 0.55, E.core, 0.16);
      fx.glow(x, y, r * 1.1, E.glow, life * 1.4, 0.45, 0.5);
      fx.shock(x, y, 10, r * 1.2, life, E.glow, 14 * Math.min(1.5, k), E.core);
      fx.shock(x, y, 10, r, life * 0.7, '#ffffff', 5, E.core);
      fx.crack(x, y, r * 0.95, E.decal, o.heavy ? 12 : 10, E.crack, Math.round(8 + 4 * k));
      fx.decal(x, y, r * 0.85, E.decal, 10);
      fx.debris(x, y, E.debris, Math.round(22 * k), 420 * Math.min(1.4, k), 5 + k * 1.5, r * 0.35);
      fx.sparkle(x, y, E.core, Math.round(24 * k), 560);
      fx.smoke(x, y, E.smoke, Math.round(10 * k), r * 0.7);
      fx.motes(x, y, E, Math.round(16 * k), r * 0.8, 220);
      fx.shake((o.heavy ? 22.4 : 16) * Math.min(1.4, Math.sqrt(k)));
    },
  });

  BD.defineEffect('erupt', {
    name: '地脈噴發', category: '砸地',
    desc: '地面猛然噴發：一柱元素光柱衝起、大量火花向上四射，地面裂開小縫並留下痕跡。適合地刺、岩漿噴發、地脈爆發。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.radius || 60;
      fx.pillar(x, y, r * Math.min(1.5, k), E.glow, o.heavy ? 0.7 : 0.5);
      fx.sparkle(x, y, E.core, Math.round(10 * k), 360, -Math.PI / 2, 1.6);
      fx.crack(x, y, r * 0.6, E.decal, 6, E.crack, 5);
      fx.decal(x, y, r * 0.5, E.decal, 6);
      fx.motes(x, y, E, Math.round(8 * k), r * 0.4, 160);
      fx.flashAt(x, y, r * 0.5, E.core, 0.12);
      fx.shake(Math.min(8, 3 * Math.min(k, 1.6)));
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
