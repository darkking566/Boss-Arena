'use strict';
// 特效庫｜位移（blink / vanish / appear / leap / burrow / dash）：瞬移、隱現、躍起、鑽地與衝刺殘影
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
// o：E 元素主題、toX / toY 終點、angle 方向、len 距離、dur 衝刺時間、k 綜合倍率、src 施放者
(function (G) {
  const BD = G.BD;

  BD.defineEffect('blink', {
    name: '閃現', category: '位移',
    desc: '瞬移：起點收縮的光環與煙霧，終點綻放的光圈與閃光，兩點之間拉出一道拖影。適合瞬步、傳送、突進。',
    params: { len: 200 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, src = o.src || null;
      const tx = o.toX == null ? x + 120 : o.toX, ty = o.toY == null ? y : o.toY;
      fx.ring(x, y, 4, 60, 0.35, E.glow, 4 * Math.min(1.5, k));
      fx.smoke(x, y, E.smoke, 6, 20);
      fx.motes(x, y, E, Math.round(5 * k), 24, 120);
      fx.ring(tx, ty, 60, 4, 0.3, E.glow, 4 * Math.min(1.5, k));
      fx.flashAt(tx, ty, 20 * Math.min(1.6, k), E.core, 0.14);
      fx.motes(tx, ty, E, Math.round(5 * k), 20, 120);
      fx.streak(x, y, tx, ty, src && src.r ? src.r * 0.6 : 14, E.glow, 0.25, true);
    },
  });

  BD.defineEffect('vanish', {
    name: '隱身', category: '位移',
    desc: '身影化煙散去：一團煙霧炸開、光環向內收縮、暗影粒子飄散。適合潛行、隱蔽、消失。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      fx.smoke(x, y, E.smoke, 14, 30 * Math.min(1.5, k));
      fx.ring(x, y, 50 * Math.min(1.5, k), 4, 0.35, E.glow, 4);
      fx.motes(x, y, E, Math.round(12 * k), 28, 100);
      fx.flashAt(x, y, 22, E.core, 0.08);
    },
  });

  BD.defineEffect('appear', {
    name: '現身', category: '位移',
    desc: '身影從煙霧中浮現：煙塵擴散、光環由外收束、中心一點閃光與元素微粒。適合解除隱身、傳送抵達。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      fx.smoke(x, y, E.smoke, 10, 20);
      fx.ring(x, y, 60, 5, 0.3, E.glow, 4 * Math.min(1.5, k));
      fx.flashAt(x, y, 22, E.core, 0.14);
      fx.motes(x, y, E, Math.round(8 * k), 24, 120);
    },
  });

  BD.defineEffect('leap', {
    name: '躍起', category: '位移',
    desc: '起跳：地面震波向外推開、碎石與塵土彈起、煙霧拖在腳下。適合跳躍、飛撲、起手跳砸。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      fx.shock(x, y, 10, 120 * Math.sqrt(Math.min(2, k)), 0.5, E.glow, 8, E.core);
      fx.debris(x, y, E.debris, Math.round(12 * k), 220, 4 + k * 0.5, 20);
      fx.smoke(x, y, E.smoke, Math.round(6 * k), 24);
      fx.motes(x, y, E, Math.round(8 * k), 24, 120);
      fx.shake(Math.min(12, 8 * Math.min(k, 1.5)));
    },
  });

  BD.defineEffect('burrow', {
    name: '鑽地', category: '位移',
    desc: '鑽入或鑽出地面：泥土碎塊大量翻飛、地面裂開並留下坑痕，伴隨火花與煙塵。適合潛地移動、地底突襲。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      fx.debris(x, y, E.debris, Math.round(20 * k), 280, 4 + k, 24);
      fx.crack(x, y, 40 * Math.min(1.8, k), E.decal, 7, E.crack, 5);
      fx.decal(x, y, 40 * Math.min(1.8, k), E.decal, 7);
      fx.sparks(x, y, E.particle, Math.round(10 * k), 180);
      fx.smoke(x, y, E.smoke, Math.round(8 * k), 28);
      fx.motes(x, y, E, Math.round(6 * k), 24, 100);
      fx.shake(Math.min(10, 4 * k));
    },
  });

  BD.defineEffect('dash', {
    name: '衝刺', category: '位移',
    desc: '高速衝刺：起步光環，過程中連續留下殘影與拖影線，附帶元素尾跡（火為餘燼）。適合突進、衝撞、追擊。',
    params: { len: 200, dur: 0.3 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, src = o.src || null, dur = o.dur || 0.3;
      const ang = o.angle || 0;
      fx.ring(x, y, 4, 50, 0.25, E.glow, 4 * Math.min(1.5, k));
      if (!src) return;
      const segs = 5, len = o.len || 200;
      for (let i = 1; i <= segs; i++) {
        fx.after(dur * i / segs, () => {
          if (src.x == null) return;
          fx.ghost(src, 0.3, E.glow);
          const lx = src.x - Math.cos(ang) * len / segs;
          const ly = src.y - Math.sin(ang) * len / segs;
          fx.streak(lx, ly, src.x, src.y, (src.r || 20) * 0.8, E.glow, 0.22, true);
          fx.motes(src.x, src.y, E, 3, (src.r || 20) * 0.4, 100);
        });
      }
      if (o.heavy) fx.shake(Math.min(8, 3 * k));
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
