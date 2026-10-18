'use strict';
// 特效庫｜大招（ultcast / domain / finale）：大招蓄勢、領域爆發與擊倒終結
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
// o：E 元素主題、color 覆寫、radius 半徑、k 綜合倍率、src 施放者（可為 null）、pts 預先算好的點陣
(function (G) {
  const BD = G.BD;

  BD.defineEffect('ultcast', {
    name: '大招發動', category: '大招',
    desc: '施放大招的起手：全屏一閃、畫面輕震、巨大蓄力光向中心收束、反向震波收攏，大量微粒上升。適合必殺技詠唱。',
    params: { life: 1.0 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, src = o.src || null;
      const r = src && src.r ? src.r : o.radius || 60;
      fx.flash(o.color || E.glow, 0.35);
      fx.shake(Math.min(12, 6 * Math.min(k, 1.6)));
      fx.charge(x, y, r * 3, E.glow, o.life || 1.0, src, Math.round(20 * Math.min(2, k)));
      fx.shock(x, y, r * 4, r, 0.5, E.glow, 10 * Math.min(1.5, k), E.core);
      fx.sparkle(x, y, E.core, Math.round(18 * k), 260, -Math.PI / 2, 1.2);
      for (let i = 0; i < 30; i++) {
        const a = BD.vrng() * Math.PI * 2, d = r * (0.6 + BD.vrng() * 1.8);
        fx.motes(x + Math.cos(a) * d, y + Math.sin(a) * d, E, 1, 8, 70);
      }
      fx.glow(x, y, r * 1.5, E.glow, 1.0, 0.4, 0.3, src);
    },
  });

  BD.defineEffect('domain', {
    name: '領域爆發', category: '大招',
    desc: '領域展開的爆發：全屏核心色閃光、強烈震動，預先算好的場上各點接連爆出火花與微粒，外圍光環與淡震波同時擴散。適合凍結全場、結界覆蓋。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      const pts = o.pts || [];
      fx.flash(E.core, 0.6);
      fx.shake(Math.min(26, 16 * Math.min(k, 1.4)));
      for (let i = 0; i + 1 < pts.length; i += 2) {
        fx.sparks(pts[i], pts[i + 1], E.core, 2, 120);
        fx.motes(pts[i], pts[i + 1], E, 1, 8, 50);
      }
      const r = o.radius || 200;
      fx.ring(x, y, r, r + 40, 0.6, E.glow, 6 * Math.min(1.4, k));
      fx.shock(x, y, 10, r * 1.6, 0.8, E.glow, 6, E.core);
      fx.glow(x, y, r * 0.9, E.glow, 0.8, 0.4, 0.5);
    },
  });

  BD.defineEffect('finale', {
    name: '終結', category: '大招',
    desc: 'Boss 被擊倒的終結演出：全屏白光、強烈震動、巨大光環盪開、海量火花與碎塊、光暈與微粒緩緩飄散。適合擊殺收尾。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, src = o.src || null;
      const r = src && src.r ? src.r : o.radius || 80;
      fx.flash('#fff', 0.6);
      fx.shake(Math.min(26, 22 * Math.min(k, 1.3)));
      fx.ring(x, y, 10, 260, 1.0, E.glow, 8 * Math.min(1.4, k));
      fx.sparks(x, y, E.core, 60, 520);
      fx.debris(x, y, E.debris, 20, 340, 5, r * 0.4);
      fx.glow(x, y, r * 2.5, E.glow, 1.2, 0.8, 0.5, src);
      for (let i = 0; i < 30; i++) {
        const a = BD.vrng() * Math.PI * 2, d = BD.vrng() * r;
        fx.motes(x + Math.cos(a) * d, y + Math.sin(a) * d, E, 1, 10, 80);
      }
      fx.sparkle(x, y, E.core, Math.round(24 * k), 420);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
