'use strict';
// 特效庫｜大樹守衛專屬（goldvow / goldshield / goldretaliate / shieldguard / shieldcrush / erdtreeblast / holylance，
//   以及每個技能組各自的 goldcleave / lancethrust / lanceslam / goldring / hoofstomp / horsebash / goldcharge / goldleap / twirlsweep / erdbash）：
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

  // ── 每個技能組各自的招式特效 ──
  const DUST = 'rgba(170,140,90,0.4)', PRINT = 'rgba(40,24,8,0.5)';
  const arcPt = (x, y, a, d) => [x + Math.cos(a) * d, y + Math.sin(a) * d];

  BD.defineEffect('goldcleave', {
    name: '黃金戟橫掃', category: '斬擊',
    desc: '黃金戟大開大合的橫掃：琥珀色寬弧帶三層拖影、內圈細金弧、白熱核心，弧上沿途迸出金色火花、弧兩端各閃一點星芒，戟尖掠過處落下淡金羽葉。scale ≥ 1.15 的重掃再多一圈外環震波與更強的震動。適合戟、長柄斧的橫掃與反手回掃。',
    params: { arc: 2.6 },
    spawn(fx, x, y, o) {
      const k = Math.min(1.6, o.k), ang = o.angle || 0, arc = o.arc || 2.6, r = o.radius || 240, big = (o.scale || 1) >= 1.15, life = o.heavy ? 0.5 : 0.38;
      fx.slash(x, y, ang, arc, r, AMBER, Math.round(17 * k), life, { core: PALE, trail: 3, rim: DEEP });
      fx.slash(x, y, ang, arc * 0.92, r * 0.72, GOLD, Math.round(9 * k), life * 0.85, { core: WHITE, trail: 1 });
      fx.ghost(o.src, life * 0.7, GOLD);
      for (let i = 0; i < 5; i++) {
        const a = ang - arc / 2 + arc * i / 4, [px, py] = arcPt(x, y, a, r * 0.95);
        fx.sparkle(px, py, i % 2 ? PALE : GOLD, fx.budget(3), 200, a + 0.4, 0.7);
        if (i === 0 || i === 4) { fx.flashAt(px, py, 22, WHITE, 0.12); fx.streak(px - Math.cos(a) * 26, py - Math.sin(a) * 26, px + Math.cos(a) * 26, py + Math.sin(a) * 26, 3, PALE, 0.18, true); }
      }
      const [mx, my] = arcPt(x, y, ang, r * 0.85);
      fx.embers(mx, my, PALE, fx.budget(8), r * 0.4, 70);
      fx.motes(mx, my, o.E, fx.budget(6), r * 0.3, 90);
      if (big) { fx.after(0.06, () => fx.ring(x, y, r * 0.5, r * 1.1, 0.4, GOLD, 3)); fx.flashAt(mx, my, r * 0.35, PALE, 0.14); }
      fx.shake(big ? 10 : 6);
    },
  });

  BD.defineEffect('lancethrust', {
    name: '聖戟突刺', category: '突刺',
    desc: '人立後由上往前的長距直刺：琥珀光束貫穿判定長度、白熱細芯，兩條金色螺旋沿槍身纏繞，速度線往戟尖收束；戟尖炸出星芒、小震環與一排金色火花。適合長柄武器、騎槍的直刺。',
    params: { len: 340, width: 66 },
    spawn(fx, x, y, o) {
      const k = Math.min(1.5, o.k), ang = o.angle || 0, len = o.len || 340, w = o.width || 66, [tx, ty] = along(x, y, ang, len, 0);
      fx.beam(x, y, tx, ty, w * 0.5, AMBER, 0.28, PALE);
      fx.beam(x, y, tx, ty, w * 0.15, WHITE, 0.22, WHITE);
      for (const s of [-1, 1]) {
        let px = x, py = y;
        for (let i = 1; i <= 9; i++) {
          const u = i / 9, [nx, ny] = along(x, y, ang, len * u, Math.sin(u * TAU * 1.5 + (s > 0 ? 0 : Math.PI)) * w * 0.3);
          fx.streak(px, py, nx, ny, 3, s > 0 ? GOLD : PALE, 0.26, true); px = nx; py = ny;
        }
      }
      for (let i = 0; i < 6; i++) { // 速度線：從兩側遠處往戟尖收束
        const l = (V() - 0.5) * w * 1.6, [ax, ay] = along(x, y, ang, len * (0.15 + 0.3 * V()), l), [bx, by] = along(x, y, ang, len * (0.8 + 0.2 * V()), l * 0.15);
        fx.streak(ax, ay, bx, by, 2, PALE, 0.2, true);
      }
      fx.flashAt(tx, ty, 52, WHITE, 0.14);
      rays(fx, tx, ty, 62 * k, 8, 0.26, ang);
      fx.ring(tx, ty, 8, 64, 0.26, GOLD, 3);
      fx.sparkle(tx, ty, PALE, fx.budget(12), 340, ang, 0.7);
      fx.embers(tx, ty, GOLD, fx.budget(6), 20, 60);
      fx.shake(7); fx.punch(0.015, tx, ty);
    },
  });

  BD.defineEffect('lanceslam', {
    name: '聖戟重砸', category: '砸地',
    desc: '高舉的黃金戟連同聖光一起砸落：一道金色光槍由天而降釘在落點，落點閃白，雙層金色震波、一株小型光之黃金樹從裂縫長出，樹根紋沿地面爬開，碎石與金色餘燼噴起。適合重武器的蓄力砸地。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.7, o.k), r = o.radius || 125;
      fx.streak(x, y - r * 3.4, x, y, 18, AMBER, 0.24, true);
      fx.streak(x, y - r * 3.4, x, y, 6, WHITE, 0.2, true);
      fx.flashAt(x, y, r * 0.9, WHITE, 0.16);
      fx.pillar(x, y, r * 0.3, GOLD, 0.7);
      fx.shock(x, y, r * 0.2, r * 1.25, 0.42, E.glow, 8, WHITE);
      fx.after(0.1, () => fx.ring(x, y, r * 0.5, r * 1.8, 0.5, AMBER, 4));
      fx.crack(x, y, r * 0.95, 'rgba(40,24,6,0.6)', 8, '#ffd34d', 9);
      roots(fx, x, y, r, 8, 0.6);
      fx.after(0.12, () => tree(fx, x, y, r * 1.5 * k, 0.8, 3));
      fx.debris(x, y, E.debris, fx.budget(18), 380 * k, 5, TAU);
      fx.smoke(x, y, DUST, fx.budget(8), r * 0.7);
      fx.embers(x, y, GOLD, fx.budget(10), r * 0.7, 110);
      fx.shake(14); fx.punch(0.03, x, y);
    },
  });

  BD.defineEffect('goldring', {
    name: '黃金震環', category: '震波',
    desc: '貼地向外推開的金色環形震波：琥珀實心前緣、後面跟一圈細金環，環上一道道樹根狀的光線沿徑向爬出，光點隨環飄起。適合聖光系的二次擴散、外環震波。',
    params: {},
    spawn(fx, x, y, o) {
      const k = Math.min(1.5, o.k), r = o.radius || 200, r0 = o.r0 || r * 0.5;
      fx.shock(x, y, r0 * 0.8, r, 0.4, AMBER, 6, PALE);
      fx.after(0.08, () => fx.ring(x, y, r0, r * 1.15, 0.4, GOLD, 3));
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * TAU + V() * 0.3, [ax, ay] = arcPt(x, y, a, r0 * 0.9), [bx, by] = arcPt(x, y, a + (V() - 0.5) * 0.25, r * 0.98);
        fx.streak(ax, ay, bx, by, 3, i % 2 ? PALE : GOLD, 0.28, true);
      }
      fx.motes(x, y, o.E, fx.budget(8), r * 0.7, 100);
      fx.shake(Math.min(10, 5 * k));
    },
  });

  BD.defineEffect('hoofstomp', {
    name: '馬蹄踐踏', category: '砸地',
    desc: '戰馬前蹄重踏：落點先印出一個馬蹄鐵形的金色蹄痕，蹄鐵與地面磨出火星，一圈棕黃塵浪和金色震波推開，塵土碎石彈起。scale 大時多踏一道餘震。適合騎兵、巨獸的踐踏。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), r = o.radius || 118, ang = o.angle || 0;
      let px = null, py = null; // 馬蹄鐵：U 形，開口朝後
      for (let i = 0; i <= 8; i++) {
        const a = ang + 0.6 + (TAU - 1.2) * i / 8, [nx, ny] = arcPt(x, y, a, r * 0.3);
        if (px !== null) { fx.streak(px, py, nx, ny, 5, AMBER, 0.6, true); fx.streak(px, py, nx, ny, 2, PALE, 0.5, true); }
        px = nx; py = ny;
      }
      fx.decal(x, y, r * 0.35, PRINT, 6);
      fx.flashAt(x, y, r * 0.5, WHITE, 0.12);
      fx.shock(x, y, r * 0.15, r * 0.95, 0.38, E.glow, 6, PALE);
      fx.after(0.1, () => fx.shock(x, y, r * 0.3, r * 1.3, 0.45, DUST, 8, GOLD));
      fx.sparkle(x, y, GOLD, fx.budget(10), 300, ang + Math.PI, 1.6);
      fx.debris(x, y, E.debris, fx.budget(12), 320 * k, 4, TAU);
      fx.smoke(x, y, DUST, fx.budget(8), r * 0.7);
      fx.crack(x, y, r * 0.7, E.decal, 6, '#ffd34d', 5);
      if ((o.scale || 1) > 1.1) fx.after(0.2, () => { fx.ring(x, y, r * 0.5, r * 1.5, 0.35, GOLD, 3); fx.shake(6); });
      fx.shake(Math.min(12, 8 * k)); fx.punch(0.02, x, y);
    },
  });

  BD.defineEffect('horsebash', {
    name: '側身衝撞', category: '砸地',
    desc: '戰馬甩身用馬鎧撞人：撞點閃白，一道金色月牙往外推出，馬鎧擦出的金屬火花沿撞擊方向噴射，數條平行速度線和一片被帶起的塵浪。適合坐騎、重裝單位的側身撞擊。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), r = o.radius || 108, ang = o.angle || 0;
      fx.flashAt(x, y, r * 0.6, WHITE, 0.12);
      fx.slash(x, y, ang, 1.7, r * 0.9, GOLD, Math.round(15 * k), 0.24, { core: PALE, rim: DEEP });
      for (let i = 0; i < 5; i++) {
        const l = (i - 2) * r * 0.22, [ax, ay] = along(x, y, ang, -r * 0.2, l), [bx, by] = along(x, y, ang, r * (0.9 + 0.3 * V()), l);
        fx.streak(ax, ay, bx, by, 3, i % 2 ? PALE : GOLD, 0.22, true);
      }
      fx.sparkle(x, y, PALE, fx.budget(12), 380, ang, 0.9);
      fx.sparks(x, y, E.particle, fx.budget(8), 260);
      fx.ring(x, y, 8, r * 0.9, 0.26, AMBER, 4);
      fx.smoke(x, y, DUST, fx.budget(8), r * 0.6);
      fx.debris(x, y, E.debris, fx.budget(8), 260, 3.5, r * 0.2);
      fx.shake(Math.min(12, 8 * k)); fx.punch(0.018, x, y);
    },
  });

  BD.defineEffect('goldcharge', {
    name: '黃金騎兵衝鋒', category: '位移',
    desc: '黃金重騎的衝鋒：起步時金色震波與塵浪，沿途左右交替的蹄印、揚塵與金色火星，身後拖兩層琥珀 / 淡金的光帶和金色殘影，終點揚起一圈塵浪、閃光與放射光線。適合重騎兵、聖騎士的直衝（搭配 dash 動作）。',
    params: { len: 300, dur: 0.3 },
    spawn(fx, x, y, o) {
      const src = o.src || null, dur = o.dur || 0.3, len = o.len || 300, ang = o.angle || 0, n = Math.max(4, Math.round(len / 45));
      fx.shock(x, y, 10, 100, 0.35, AMBER, 5, PALE);
      fx.smoke(x, y, DUST, fx.budget(8), 30);
      let px = x, py = y;
      for (let i = 1; i <= n; i++) {
        fx.after(dur * i / n, () => {
          const a = src && src.face != null ? src.face : ang, cx = src ? src.x : x + Math.cos(ang) * len * i / n, cy = src ? src.y : y + Math.sin(ang) * len * i / n;
          const side = i % 2 ? 1 : -1, hx = cx - Math.sin(a) * side * 14, hy = cy + Math.cos(a) * side * 14;
          fx.decal(hx, hy, 7, PRINT, 4);
          fx.smoke(hx, hy, DUST, 2, 10);
          fx.sparkle(hx, hy, GOLD, 2, 180, a + Math.PI, 0.8);
          fx.embers(hx, hy, PALE, 1, 6, 30);
          fx.streak(px, py, cx, cy, 14, AMBER, 0.35, true);
          fx.streak(px, py, cx, cy, 5, PALE, 0.3, true);
          if (i % 2 === 0) fx.ghost(src, 0.3, GOLD);
          px = cx; py = cy;
        });
      }
      fx.after(dur, () => {
        const a = src && src.face != null ? src.face : ang, ex = src ? src.x : x + Math.cos(ang) * len, ey = src ? src.y : y + Math.sin(ang) * len;
        fx.ring(ex, ey, 10, 100, 0.4, GOLD, 5);
        fx.smoke(ex, ey, DUST, fx.budget(8), 40);
        fx.flashAt(ex, ey, 46, WHITE, 0.14);
        rays(fx, ex, ey, 70, 8, 0.26, a);
        fx.shake(5);
      });
    },
  });

  BD.defineEffect('goldleap', {
    name: '躍馬騰空', category: '位移',
    desc: '黃金重騎縱馬躍起：起跳點金色震波與外擴光環，一道光柱隨馬身衝天、放射光線、金色羽葉般的餘燼往上飄，碎石與塵土彈起。適合重騎兵的跳躍起手。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k);
      fx.shock(x, y, 10, 150 * Math.sqrt(k), 0.5, AMBER, 8, PALE);
      fx.after(0.07, () => fx.ring(x, y, 20, 180, 0.45, GOLD, 3));
      fx.pillar(x, y, 26, GOLD, 0.5);
      rays(fx, x, y, 82, 10, 0.3, V() * TAU);
      fx.debris(x, y, E.debris, fx.budget(10), 240, 4 + k * 0.5, 20);
      fx.smoke(x, y, DUST, fx.budget(6), 26);
      fx.embers(x, y, GOLD, fx.budget(12), 40, 130);
      fx.shake(Math.min(12, 8 * k));
    },
  });

  BD.defineEffect('twirlsweep', {
    name: '迴旋大掃', category: '斬擊',
    desc: '人馬整個轉身的超大迴旋：三圈金弧由外而內先後掃過（琥珀、金、白），弧上每一段切線方向迸出火花，掃過的扇面起一圈旋風環，中央閃出放射光芒，畫面輕震。適合範圍極大的長柄迴旋斬。',
    params: { arc: 4.4 },
    spawn(fx, x, y, o) {
      const k = Math.min(1.7, o.k), ang = o.angle || 0, arc = o.arc || 4.4, r = o.radius || 330, life = o.heavy ? 0.6 : 0.48;
      fx.slash(x, y, ang, arc, r, AMBER, Math.round(20 * k), life, { core: PALE, trail: 4, rim: DEEP });
      fx.after(0.05, () => fx.slash(x, y, ang + 0.08, arc * 0.92, r * 0.76, GOLD, Math.round(12 * k), life * 0.85, { core: WHITE, trail: 2 }));
      fx.after(0.1, () => fx.slash(x, y, ang + 0.16, arc * 0.85, r * 0.54, PALE, Math.round(8 * k), life * 0.7, { core: WHITE }));
      fx.ghost(o.src, life * 0.7, GOLD);
      for (let i = 0; i < 8; i++) {
        const a = ang - arc / 2 + arc * i / 7, [px, py] = arcPt(x, y, a, r * 0.96);
        fx.sparkle(px, py, i % 2 ? PALE : GOLD, fx.budget(3), 260, a + Math.PI / 2, 0.5);
      }
      fx.ring(x, y, r * 0.3, r * 1.05, 0.5, PALE, 2);
      fx.after(0.1, () => fx.ring(x, y, r * 0.2, r * 0.85, 0.45, GOLD, 3));
      fx.flashAt(x, y, r * 0.45, PALE, 0.18);
      rays(fx, x, y, r * 0.65, 10, 0.3, ang);
      fx.motes(x, y, o.E, fx.budget(10), r * 0.5, 120);
      fx.shake(14); fx.punch(0.02, x, y);
    },
  });

  BD.defineEffect('erdbash', {
    name: '大盾猛撞', category: '砸地',
    desc: '黃金樹大盾正面撞出：撞點閃白，大盾面推出一道金色寬弧，盾面上的樹根紋在撞點炸成放射光線，雙層金色震環與一排往前噴的火花，地面短暫亮起根紋裂痕。適合重盾的盾擊與盾牌推撞。',
    params: { len: 185, width: 130 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), ang = o.angle || 0, len = o.len || 185, w = o.width || 130, [cx, cy] = along(x, y, ang, len * 0.7, 0);
      fx.slash(x, y, ang, 1.5, len * 0.95, GOLD, Math.round(21 * k), 0.24, { core: PALE, rim: DEEP });
      fx.flashAt(cx, cy, w * 0.6, WHITE, 0.14);
      fx.ring(cx, cy, w * 0.15, w * 0.75, 0.3, GOLD, 5);
      roots(fx, cx, cy, w * 0.7, 7, 0.45);
      fx.shock(cx, cy, 10, w, 0.36, AMBER, 6, PALE);
      fx.after(0.08, () => fx.shock(cx, cy, w * 0.3, w * 1.3, 0.4, GOLD, 4, WHITE));
      fx.sparkle(cx, cy, PALE, fx.budget(12), 360, ang, 0.8);
      fx.debris(cx, cy, E.debris, fx.budget(8), 260, 4, w * 0.2);
      fx.shake(Math.min(14, 10 * k)); fx.punch(0.02, cx, cy);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
