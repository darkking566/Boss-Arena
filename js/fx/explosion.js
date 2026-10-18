'use strict';
// 特效庫｜爆炸（explode / burst / impact）：落點爆炸、小型爆散與 Boss 受擊爆點
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
// o：E 元素主題、radius 半徑、k 綜合倍率、heavy 沉重節奏、src / victim（僅 impact）
(function (G) {
  const BD = G.BD;

  BD.defineEffect('explode', {
    name: '爆炸', category: '爆炸',
    desc: '投射物或隕石落地的爆炸：強光、光暈、急速擴張的震波、四散火花與彈跳碎石，地面留下焦痕。適合火球、砲彈、落雷。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.radius || 90;
      fx.flashAt(x, y, r * 0.6, E.core, 0.16);
      fx.glow(x, y, r * 0.9, E.glow, o.heavy ? 0.6 : 0.45, 0.7, 0.5);
      fx.shock(x, y, 5, r, o.heavy ? 0.55 : 0.35, E.glow, 6 * Math.min(1.6, k), E.core);
      fx.sparkle(x, y, E.core, Math.round(14 * k), 280);
      fx.debris(x, y, E.debris, Math.round(6 * k), 260, 3.5 + k * 0.6, r * 0.25);
      fx.decal(x, y, r * 0.6, E.decal, 8);
      fx.motes(x, y, E, Math.round(8 * k), r * 0.5, 160);
      if (o.heavy || k > 1.3) fx.smoke(x, y, E.smoke, Math.round(6 * k), r * 0.5);
      fx.shake(Math.min(14, (o.heavy ? 6 : 4) * Math.min(k, 1.8)));
    },
  });

  BD.defineEffect('burst', {
    name: '爆散', category: '爆炸',
    desc: '小型爆散：一圈短促光環與幾點火花，體積較大時伴隨煙霧與地面痕跡。適合召喚物死亡、自爆、陷阱、血霧。',
    params: { radius: 40 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.radius || 40;
      fx.ring(x, y, 4, r, 0.3, E.glow, 5 * Math.min(1.4, k));
      fx.sparkle(x, y, E.core, Math.round(12 * k), 220);
      fx.motes(x, y, E, Math.round(8 * k), r * 0.5, 120);
      fx.flashAt(x, y, r * 0.5, E.core, 0.1);
      if (r >= 80) {
        fx.smoke(x, y, E.smoke, Math.round(6 * k), r * 0.5);
        fx.decal(x, y, r * 0.55, E.decal, 6);
      }
      fx.shake(Math.min(8, 2.5 * k));
    },
  });

  // Boss 受擊爆點：數值對應舊 world.js damageBoss 的視覺（heavyHit / light 兩個分支）
  BD.defineEffect('impact', {
    name: '命中爆點', category: '爆炸',
    desc: 'Boss 被命中的瞬間爆點：依輕重噴出不同量的火花並震動畫面，重擊時追加全屏閃白、地面痕跡與煙塵。純視覺的受擊回饋。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      const dmg = o.dmg || 0, big = !!o.big, victim = o.victim || null;
      const vr = victim && victim.r ? victim.r : (o.radius || 60);
      let ang = o.angle;
      if (ang == null && o.src && victim) ang = Math.atan2(victim.y - o.src.y, victim.x - o.src.x);
      fx.flashAt(x, y, vr * 0.9 * Math.sqrt(Math.min(2, k)), E.core, 0.14);
      if (o.heavyHit) {
        fx.sparks(x, y, big ? '#fff2a8' : '#ffd7a0', big ? 28 : 10, big ? 460 : 260);
        fx.shake(Math.min(24, 3 + dmg / 12));
        if (big) {
          fx.flash('#fff', 0.12);
          fx.decal(x, y, vr * 1.3, E.decal, 6);
          fx.smoke(x, y, E.smoke, 8, vr);
        }
      } else {
        fx.sparks(x, y, big ? '#fff2a8' : '#ffd7a0', big ? 18 : 8, big ? 380 : 240);
        fx.shake(Math.min(14, 2 + dmg / 22));
      }
      if (ang != null) fx.sparkle(x, y, E.core, Math.round(6 * k), 300, ang, 0.9);
      fx.motes(x, y, E, Math.round((big ? 6 : 3) * k), vr * 0.3, 120);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
