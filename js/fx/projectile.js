'use strict';
// 特效庫｜投射物（projhit / projwall / swarmtrail / trail）：投射物命中、碎散、蟲群尾跡與拖痕
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
// o：E 元素主題、radius 半徑、k 綜合倍率、src 施放者（可為 null）
(function (G) {
  const BD = G.BD;

  BD.defineEffect('projhit', {
    name: '投射物命中', category: '投射物',
    desc: '投射物擊中目標的小型爆點：幾點放射火花、短暫閃光與元素微粒。適合飛刀、火球、毒彈的命中回饋。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      // 知道打擊方向（施放者朝向或投射物飛行方向）時，火花往前方錐形噴出；否則四散
      const dir = o.dirHit || o.src ? o.angle : null;
      fx.sparkle(x, y, E.core, Math.round(8 * k), 200, dir, dir == null ? null : 1.8);
      fx.flashAt(x, y, 12 + 4 * k, E.core, 0.1);
      fx.motes(x, y, E, Math.round(4 * k), 10, 90);
    },
  });

  BD.defineEffect('projwall', {
    name: '碰撞碎散', category: '投射物',
    desc: '撞上牆面或柱子的碎散：方形火花四濺與少量碎塊。衝刺撞牆時範圍加大、碎塊更多。適合投射物撞牆、Boss 撞柱。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      const rr = o.radius || 0, extra = rr > 80 ? Math.round(rr / 40) : 0;
      fx.sparks(x, y, E.particle, Math.round(5 * k) + extra, 150);
      fx.debris(x, y, E.debris, 3 + extra, 160, 3, 10);
      fx.motes(x, y, E, Math.round(3 * k) + extra, 12, 80);
      if (rr > 80) fx.shake(Math.min(8, 2 * Math.min(k, 2)));
    },
  });

  BD.defineEffect('swarmtrail', {
    name: '蟲群尾跡', category: '投射物',
    desc: '蟲群飛行留下的細碎尾跡：一點綠色火花，偶爾飄起毒泡。適合蜂群、蟲雲等群體投射物。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E;
      fx.sparks(x, y, E.particle, 1, 60);
      if (BD.vrng() < 0.3) {
        const p = fx.part(BD.PK.BUBBLE, x + (BD.vrng() - 0.5) * 10, y + (BD.vrng() - 0.5) * 10, (BD.vrng() - 0.5) * 25, -10 - BD.vrng() * 20, 0.5 + BD.vrng() * 0.5, E.particle, 2.5 + BD.vrng() * 3, 1.5);
        void p;
      }
    },
  });

  BD.defineEffect('trail', {
    name: '拖痕火花', category: '投射物',
    desc: '移動中留下的短暫痕跡：幾點火花與元素餘燼 / 微粒。適合衝刺、繞圈留下區域等持續位置。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      fx.sparks(x, y, E.particle, Math.round(3 * Math.min(1.4, k)), 120);
      fx.motes(x, y, E, Math.round(3 * Math.min(1.4, k)), 12, 90);
      if (E.extra === 'embers' || E.extra == null) fx.embers(x, y, E.core, 1, 8, 40);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
