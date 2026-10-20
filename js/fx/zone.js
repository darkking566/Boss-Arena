'use strict';
// 特效庫｜區域（breath / ambient / trapset / trapburst）：錐形噴吐、區域氛圍、陷阱佈置與觸發
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
// o：E 元素主題、angle 方向、arc 張角、radius 半徑、k 綜合倍率、src 施放者（可為 null）
(function (G) {
  const BD = G.BD;

  BD.defineEffect('breath', {
    name: '噴吐', category: '區域',
    desc: '廣角錐形噴吐：半透明的扇形刃光鋪開，錐內火花與元素微粒翻湧。適合火焰吐息、毒霧、寒風噴射。',
    params: { arc: 1.6 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.radius || 120;
      const ang = o.angle || 0, arc = o.arc || 1.6;
      fx.slash(x, y, ang, arc, r, E.glow, 30 * Math.min(1.5, k), o.heavy ? 0.5 : 0.35, { core: E.core, trail: 1 });
      for (let i = 0; i < 3; i++) {
        const a = ang + (BD.vrng() - 0.5) * arc * 0.7;
        fx.sparkle(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, E.core, Math.round(5 * k), 260, a, arc * 0.5);
      }
      const cx = x + Math.cos(ang) * r * 0.55, cy = y + Math.sin(ang) * r * 0.55;
      fx.motes(cx, cy, E, Math.round(10 * k), r * 0.3, 150);
      fx.flashAt(x, y, 16, E.core, 0.1);
    },
  });

  BD.defineEffect('ambient', {
    name: '區域氛圍', category: '區域',
    desc: '持續存在的區域每次跳動：幾點元素微粒在範圍內緩緩飄起，伴隨極淡的光暈。用於毒池、火海、冰域等的持續感。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, r = o.radius || 80;
      const n = 2 + BD.vrng.int(0, 1);
      for (let i = 0; i < n; i++) {
        const a = BD.vrng() * Math.PI * 2, d = BD.vrng() * r * 0.8;
        fx.motes(x + Math.cos(a) * d, y + Math.sin(a) * d, E, 1, 10, 60);
      }
      fx.glow(x, y, r * 0.6, E.glow, 0.5, 0.15, 0.2);
    },
  });

  BD.defineEffect('trapset', {
    name: '佈置陷阱', category: '區域',
    desc: '陷阱設置時的細微提示：一圈收束的淡光環與兩點元素微光。適合地雷、蛛網、符印的埋伏佈置。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E;
      fx.ring(x, y, 2, 30, 0.3, E.glow, 2);
      fx.motes(x, y, E, 2, 14, 60);
    },
  });

  BD.defineEffect('trapburst', {
    name: '陷阱觸發', category: '區域',
    desc: '陷阱引爆：光環向外彈開、大量方形火花散射、元素微粒與一點閃光。適合地雷、蛛網、毒陣的觸發瞬間。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.radius || 60;
      fx.ring(x, y, 4, r, 0.35, E.glow, 6 * Math.min(1.4, k));
      fx.sparks(x, y, E.particle, Math.round(14 * Math.min(1.5, k)), 260);
      fx.motes(x, y, E, Math.round(8 * k), r * 0.4, 140);
      fx.flashAt(x, y, r * 0.4, E.core, 0.1);
      fx.shake(Math.min(6, 2 * k));
    },
  });
  BD.defineEffect('amaterasu', {
    name: '天照', category: '區域',
    desc: '燒到燒盡為止的黑色火焰：落點一閃白光後，墨黑濃煙與暗紅火星從地面竄起，暗紅光柱與震波推開，地面留下焦黑的大片印記與暗紅裂痕。適合黑炎、無法撲滅的火、神罰（hit / erupt 的 fx，搭配元素 blackfire）。',
    params: { radius: 100 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, V = BD.vrng, TAU = Math.PI * 2, r = (o.radius || 100) * Math.min(1.5, o.scale || 1);
      fx.flashAt(x, y, r * 1.4, '#ffffff', 0.12);
      fx.pillar(x, y, r * 0.7, E.glow, 0.7);
      fx.shock(x, y, r * 0.2, r * 1.2, 0.5, E.glow, 8, E.core);
      fx.smoke(x, y, 'rgba(2,0,6,0.85)', fx.budget(14), r * 0.8);
      for (let i = 0; i < 6; i++) fx.after(i * 0.06, () => {
        const a = V() * TAU, d = V() * r * 0.8, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
        fx.smoke(px, py, 'rgba(2,0,6,0.8)', 3, r * 0.25);
        fx.embers(px, py, E.glow, 3, r * 0.3, 150);
      });
      fx.decal(x, y, r, E.decal, 10);
      fx.crack(x, y, r * 0.9, E.decal, 6, E.crack, 5);
      fx.sparkle(x, y, E.glow, fx.budget(12), 300, -Math.PI / 2, 1.6);
      fx.shake(6 * Math.min(1.4, k));
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
