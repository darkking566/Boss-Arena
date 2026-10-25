'use strict';
// 特效庫｜大樹守衛專屬（goldvow / goldshield / goldretaliate / shieldguard / shieldcrush / erdtreeblast / holylance）：
// 依原作配色——黃金戟與黃金樹大盾的暖金光、黃金樹的淡金枝椏、盾面上纏繞的樹根紋。只呼叫 fx 原件；亂數只用 BD.vrng；不觸碰 DOM。
(function (G) {
  const BD = G.BD, TAU = Math.PI * 2, V = BD.vrng;
  const WHITE = '#ffffff', PALE = '#fff6d0', GOLD = '#ffd34d', AMBER = '#e0a030', DEEP = '#8a5a10';

  const along = (x, y, ang, d, l) => [x + Math.cos(ang) * d - Math.sin(ang) * (l || 0), y + Math.sin(ang) * d + Math.cos(ang) * (l || 0)];
  // 光之黃金樹：樹幹往畫面上方長，逐層分岔成金色枝椏（俯視角下像從地面立起的一株光樹），枝梢綻出光點
  function tree(fx, x, y, h, life, depth) {
    const grow = (px, py, a, len, w, d) => {
      const nx = px + Math.cos(a) * len, ny = py + Math.sin(a) * len;
      fx.after(0.035 * (depth - d), () => { fx.streak(px, py, nx, ny, w * 1.8, AMBER, life, true); fx.streak(px, py, nx, ny, w, PALE, life * 0.9, true); });
      if (d <= 0) { fx.after(0.035 * depth, () => fx.flashAt(nx, ny, 10 + w * 3, GOLD, life * 0.5)); return; }
      const n = d > depth - 2 ? 2 : 3;
      for (let i = 0; i < n; i++) grow(nx, ny, a + (i - (n - 1) / 2) * (0.55 + V() * 0.25), len * (0.68 + V() * 0.12), w * 0.7, d - 1);
    };
    grow(x, y, -Math.PI / 2, h * 0.32, Math.max(3, h / 24), depth);
  }
  // 樹根裂紋：從中心放射出彎曲的金色根鬚（黃金樹大盾上的根紋）
  function roots(fx, x, y, r, n, life) {
    for (let i = 0; i < n; i++) {
      let a = i / n * TAU + V() * 0.4, px = x, py = y, w = 5;
      for (let s = 0; s < 4; s++) {
        a += (V() - 0.5) * 0.9; const l = r * (0.18 + V() * 0.12), nx = px + Math.cos(a) * l, ny = py + Math.sin(a) * l;
        fx.after(s * 0.04, ((ax, ay, bx, by, ww) => () => { fx.streak(ax, ay, bx, by, ww * 1.8, AMBER, life, true); fx.streak(ax, ay, bx, by, ww, PALE, life * 0.8, true); })(px, py, nx, ny, w));
        px = nx; py = ny; w *= 0.72;
      }
    }
  }
  // 金色光芒：n 道放射光線
  function rays(fx, x, y, len, n, life, a0) {
    for (let i = 0; i < n; i++) { const a = (a0 || 0) + i * TAU / n, l = len * (i % 2 ? 0.6 : 1); fx.streak(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, i % 2 ? 3 : 5, i % 2 ? GOLD : PALE, life, true); }
    fx.flashAt(x, y, len * 0.5, WHITE, life * 0.6);
  }

  BD.defineEffect('goldvow', {
    name: '黃金誓言', category: '增益',
    desc: '高舉黃金戟向黃金樹立誓：一圈金光從四周收束到施放者身上，腳下亮起金色符環，一道光柱沖天、背後長出一株光之黃金樹，金色光點緩緩上升、畫面短暫泛金。適合強化、立誓、換階段（phase2.transFx）。',
    params: { life: 0.45 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k || 1, src = o.src || null, r = (src && src.r) || 40, life = Math.max(0.3, o.life || 0.45);
      fx.charge(x, y, r * 3.2, GOLD, life, src, fx.budget(18));
      fx.ring(x, y, r * 3, r * 1.1, life, GOLD, 3);
      fx.glow(x, y, r * 2.2, GOLD, life + 0.6, 0.5, 0.4, src);
      fx.after(life, () => {
        fx.grade('#ffd34d', 0.35, 0.7);
        fx.pillar(x, y, r * 0.9 * k, GOLD, 1.0);
        fx.shock(x, y, r, r * 4.2 * k, 0.55, E.glow, 6, WHITE);
        fx.ring(x, y, r * 1.4, r * 1.6, 1.2, PALE, 2);
        rays(fx, x, y, r * 3.4 * k, 12, 0.4, V() * TAU);
        tree(fx, x, y - r * 0.4, r * 5.5 * k, 1.0, 4);
        fx.motes(x, y, E, fx.budget(24), r * 2, 60);
        fx.embers(x, y, GOLD, fx.budget(14), r * 1.6, 90);
        fx.shake(6); fx.punch(0.02, x, y);
      });
    },
  });

  BD.defineEffect('goldshield', {
    name: '黃金的返報・舉盾', category: '增益',
    desc: '舉起黃金樹大盾：盾前立起一道金色光壁（依 width 寬度），沿壁面亮起樹根紋與光點，中央閃出一顆金色星芒。適合任何「舉盾擋魔法」的護壁。',
    params: { width: 190 },
    spawn(fx, x, y, o) {
      const ang = o.angle || 0, hw = (o.width || 190) / 2, ax = x, ay = y, px = -Math.sin(ang), py = Math.cos(ang);
      fx.streak(ax - px * hw, ay - py * hw, ax + px * hw, ay + py * hw, 10, AMBER, 0.35, true);
      fx.streak(ax - px * hw, ay - py * hw, ax + px * hw, ay + py * hw, 4, PALE, 0.3, true);
      rays(fx, x, y, 46, 8, 0.25, ang);
      fx.ring(x, y, 10, hw, 0.3, GOLD, 3);
      for (let i = 0; i < 6; i++) { const s = (i / 5 - 0.5) * 2 * hw; fx.sparkle(x + px * s, y + py * s, GOLD, fx.budget(2), 120, ang, 0.8); }
    },
  });

  BD.defineEffect('goldretaliate', {
    name: '黃金的返報・回敬', category: '投射物',
    desc: '大盾吸住飛來的魔法後回敬：盾面炸開金白星芒與放射光線，兩圈金色震波，一道短促的光束朝射手方向射出。適合反射、彈回投射物。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, ang = o.angle || 0, [tx, ty] = along(x, y, ang, 160, 0);
      rays(fx, x, y, 90, 12, 0.32, ang);
      fx.shock(x, y, 8, 130, 0.35, E.glow, 5, WHITE);
      fx.after(0.08, () => fx.ring(x, y, 20, 90, 0.3, PALE, 3));
      fx.beam(x, y, tx, ty, 14, GOLD, 0.18, WHITE);
      fx.sparkle(x, y, PALE, fx.budget(16), 320, ang, 0.9);
      fx.text(x, y - 40, '返報', GOLD, 20);
      fx.shake(5); fx.punch(0.015, x, y);
    },
  });

  BD.defineEffect('shieldguard', {
    name: '大盾格擋', category: '震波',
    desc: '攻擊撞上黃金樹大盾：盾緣迸出一道金色弧光、火花往來襲方向反濺，一圈小震波。適合格擋、盾反、彈開。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, ang = o.angle || 0;
      fx.slash(x, y, ang, 1.4, 34, GOLD, 5, 0.18, { core: WHITE, rim: DEEP });
      fx.sparks(x, y, E.particle, fx.budget(10), 280);
      fx.sparkle(x, y, GOLD, fx.budget(6), 240, ang, 0.8);
      fx.ring(x, y, 6, 46, 0.18, PALE, 2);
      fx.flashAt(x, y, 30, WHITE, 0.1);
    },
  });

  BD.defineEffect('shieldcrush', {
    name: '大盾碾壓', category: '砸地',
    desc: '黃金樹大盾從空中砸地：落點閃白、三層金色震波一層比一層大，地面裂出金光樹根紋，碎石與塵浪往外噴，金色光點四散、畫面重震。適合巨型騎士 / 重盾的落地重砸。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k || 1, R = 230 * (o.scale || 1);
      fx.flashAt(x, y, R * 0.7, WHITE, 0.16);
      fx.shock(x, y, R * 0.15, R, 0.4, E.glow, 9, WHITE);
      fx.after(0.08, () => fx.shock(x, y, R * 0.3, R * 1.35, 0.5, GOLD, 6, PALE));
      fx.after(0.18, () => fx.ring(x, y, R * 0.5, R * 1.7, 0.55, AMBER, 4));
      fx.crack(x, y, R * 0.9, 'rgba(40,24,6,0.6)', 10, '#ffd34d', 12);
      roots(fx, x, y, R * 0.95, 9, 0.6);
      fx.debris(x, y, E.debris, fx.budget(26), 420 * k, 6, TAU);
      fx.smoke(x, y, 'rgba(210,190,140,0.4)', fx.budget(14), R * 0.8);
      fx.motes(x, y, E, fx.budget(18), R * 0.6, 120);
      fx.decal(x, y, R * 0.6, 'rgba(60,40,10,0.35)', 9);
      fx.shake(16); fx.punch(0.04, x, y); fx.grade('#ffe9a0', 0.28, 0.35);
    },
  });

  BD.defineEffect('erdtreeblast', {
    name: '光之黃金樹', category: '大招',
    desc: '大招收尾：大盾砸地的同時，落點炸開金白光爆，一道巨大光柱沖天，一株枝椏繁茂的光之黃金樹從地面拔起，樹根紋沿地面爬滿整片震波範圍，金色光點與餘燼如雨飄落，畫面泛金後再震一次。適合神聖系大招的終結一擊。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k || 1, R = 260 * (o.scale || 1);
      fx.veil(0.9, 0.35, '#1a1004');
      fx.flashAt(x, y, R, WHITE, 0.22); fx.flash('#fff3c0', 0.45);
      fx.pillar(x, y, R * 0.35, GOLD, 1.4);
      fx.shock(x, y, R * 0.2, R * 1.2, 0.5, E.glow, 12, WHITE);
      fx.after(0.12, () => fx.shock(x, y, R * 0.4, R * 1.7, 0.6, GOLD, 7, PALE));
      fx.after(0.3, () => { fx.shock(x, y, R * 0.6, R * 2.2, 0.7, AMBER, 5, PALE); fx.shake(12); });
      fx.crack(x, y, R * 1.1, 'rgba(40,24,6,0.6)', 12, '#ffd34d', 16);
      roots(fx, x, y, R * 1.3, 14, 0.9);
      tree(fx, x, y, R * 2.6 * k, 1.5, 5);
      rays(fx, x, y, R * 1.6, 16, 0.5, V() * TAU);
      fx.debris(x, y, E.debris, fx.budget(34), 520 * k, 7, TAU);
      fx.embers(x, y, GOLD, fx.budget(30), R, 140);
      fx.motes(x, y, E, fx.budget(30), R, 160);
      fx.shake(22); fx.punch(0.06, x, y); fx.grade('#ffd34d', 0.4, 0.8);
    },
  });

  BD.defineEffect('holylance', {
    name: '聖戟光柱', category: '爆炸',
    desc: '地面拔起一根聖戟形的金色光柱：先亮起一圈符環，接著光柱與長長的光芒往上射，落點閃白、金色碎光往外噴。適合排成一列的連續爆發（erupt）。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k || 1, r = o.radius || 90;
      fx.ring(x, y, r * 0.2, r, 0.28, GOLD, 3);
      fx.pillar(x, y, r * 0.42, GOLD, 0.55);
      fx.streak(x, y, x, y - r * 3.2 * k, 9, AMBER, 0.32, true);
      fx.streak(x, y, x, y - r * 3.4 * k, 4, WHITE, 0.26, true);
      fx.streak(x - r * 0.5, y - r * 2.2 * k, x + r * 0.5, y - r * 2.2 * k, 5, PALE, 0.26, true); // 戟刃的橫枝
      fx.flashAt(x, y, r * 0.8, WHITE, 0.12);
      fx.sparkle(x, y, E.particle, fx.budget(10), 300, -Math.PI / 2, 1.4);
      fx.crack(x, y, r * 0.7, 'rgba(40,24,6,0.5)', 7, '#ffd34d', 6);
      fx.shake(5);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
