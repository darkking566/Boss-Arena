'use strict';
// 特效庫｜瑪爾基特專屬（daggerform / canesmash / omenstab / goldhammer / phantomforge / omenreveal / cursedblood / swordfall）：
// 依原作配色——左手幻影武器的白金聖光、黑色拐杖砸地的焦木與塵土、真身蒙葛特封在劍裡的暗紅咒血。只呼叫 fx 原件；亂數只用 BD.vrng；不觸碰 DOM。
(function (G) {
  const BD = G.BD, TAU = Math.PI * 2, V = BD.vrng;
  const WHITE = '#ffffff', PALE = '#fff6d0', GOLD = '#ffd34d', AMBER = '#e0a030';
  const BLOOD = '#c0142e', GORE = '#5a0614', WOOD = '#2a221c', DUST = 'rgba(150,130,100,0.45)';

  // 金色光芒：n 道放射光線
  function rays(fx, x, y, len, n, life, a0) {
    for (let i = 0; i < n; i++) { const a = (a0 || 0) + i * TAU / n, l = len * (i % 2 ? 0.55 : 1); fx.streak(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, i % 2 ? 3 : 5, i % 2 ? GOLD : PALE, life, true); }
  }
  // 幻影大槌的剪影：槌柄 + 橫在前端的方形槌頭（ang 為槌柄方向，從 x,y 指向槌頭）
  function hammerShape(fx, x, y, ang, len, life) {
    const hx = x + Math.cos(ang) * len, hy = y + Math.sin(ang) * len, px = -Math.sin(ang), py = Math.cos(ang), hw = len * 0.42;
    fx.streak(x, y, hx, hy, 7, AMBER, life, true); fx.streak(x, y, hx, hy, 3, WHITE, life, true);
    fx.streak(hx - px * hw, hy - py * hw, hx + px * hw, hy + py * hw, len * 0.4, GOLD, life, true);
    fx.streak(hx - px * hw * 0.8, hy - py * hw * 0.8, hx + px * hw * 0.8, hy + py * hw * 0.8, len * 0.18, WHITE, life * 0.8, true);
  }

  BD.defineEffect('daggerform', {
    name: '黃金短刀成形', category: '投射物',
    desc: '左手凝出黃金幻影短刀：金色光點往手心收束，閃出一道彎月形刀光與白芯，刀尖朝出手方向拉出一道短光痕。適合擲出聖屬性的飛刀 / 匕首。',
    params: {},
    spawn(fx, x, y, o) {
      const ang = o.angle || 0, r = (o.src && o.src.r) || 30, hx = x + Math.cos(ang - 0.7) * r, hy = y + Math.sin(ang - 0.7) * r;
      fx.charge(hx, hy, r * 1.4, GOLD, 0.18, null, fx.budget(8));
      fx.slash(hx, hy, ang, 1.2, 26, GOLD, 5, 0.2, { core: WHITE });
      fx.flashAt(hx, hy, 26, WHITE, 0.1);
      fx.streak(hx, hy, hx + Math.cos(ang) * 70, hy + Math.sin(ang) * 70, 4, PALE, 0.16, true);
      fx.sparkle(hx, hy, GOLD, fx.budget(8), 220, ang, 0.6);
    },
  });

  BD.defineEffect('canesmash', {
    name: '拐杖砸地', category: '砸地',
    desc: '燒焦樹根般的黑色拐杖重重砸地：落點一圈塵浪、地面裂開，焦黑木屑與碎石往外噴，塵土緩緩散開、畫面重震。直線判定時落在拐杖前端。適合木杖 / 棍棒的重擊。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k || 1, s = o.scale || 1;
      if (o.shape === 'rect' && o.len) { x += Math.cos(o.angle || 0) * o.len * 0.8; y += Math.sin(o.angle || 0) * o.len * 0.8; }
      const R = (o.shape === 'rect' ? 90 : o.radius || 110) * s;
      fx.flashAt(x, y, R * 0.5, PALE, 0.08);
      fx.shock(x, y, R * 0.15, R * 1.1, 0.35, 'rgba(190,170,130,0.85)', 8, WHITE);
      fx.after(0.07, () => fx.ring(x, y, R * 0.4, R * 1.5, 0.45, DUST, 4));
      fx.crack(x, y, R * 0.9, 'rgba(30,22,14,0.6)', 9, null, 8);
      fx.debris(x, y, WOOD, fx.budget(14), 360 * k, 5, TAU);
      fx.debris(x, y, E.debris, fx.budget(12), 300 * k, 4, TAU);
      fx.smoke(x, y, DUST, fx.budget(12), R * 0.7);
      fx.decal(x, y, R * 0.5, 'rgba(30,22,14,0.3)', 8);
      fx.shake(10 * Math.min(1.6, s)); fx.punch(0.025, x, y);
    },
  });

  BD.defineEffect('omenstab', {
    name: '惡兆下刺', category: '砸地',
    desc: '從半空往下刺：落點先閃白，一道金色光柱沖起，地面炸開十字形的聖光裂痕，兩圈金色震波、碎石與光點往外噴。適合躍起後的下刺 / 穿地一擊。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k || 1, R = 120 * (o.scale || 1);
      fx.flashAt(x, y, R * 0.8, WHITE, 0.14);
      fx.pillar(x, y, R * 0.3, GOLD, 0.6);
      for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.785, l = R * 1.5; fx.streak(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 9, AMBER, 0.4, true); fx.streak(x, y, x + Math.cos(a) * l * 0.9, y + Math.sin(a) * l * 0.9, 3, WHITE, 0.32, true); }
      fx.shock(x, y, R * 0.1, R * 1.2, 0.4, E.glow, 8, WHITE);
      fx.after(0.09, () => fx.shock(x, y, R * 0.3, R * 1.7, 0.5, GOLD, 5, PALE));
      fx.crack(x, y, R, 'rgba(40,24,6,0.6)', 9, GOLD, 10);
      fx.debris(x, y, E.debris, fx.budget(18), 380 * k, 5, TAU);
      fx.motes(x, y, E, fx.budget(14), R * 0.5, 120);
      fx.shake(12); fx.punch(0.03, x, y); fx.grade('#ffe9a0', 0.2, 0.3);
    },
  });

  BD.defineEffect('goldhammer', {
    name: '黃金大槌', category: '砸地',
    desc: '金色幻影大槌從天砸下：一把巨大的發光槌影由上往下落、落點閃白，三層金色震波一層比一層大，地面裂出放射金痕，碎石與塵浪往外噴，金屑像雨一樣灑落、畫面泛金重震。適合巨槌 / 戰鎚的砸地。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k || 1, R = 200 * (o.scale || 1);
      hammerShape(fx, x, y - R * 1.1, Math.PI / 2, R * 0.9, 0.2); // 槌影剛落到地面
      fx.flashAt(x, y, R * 0.8, WHITE, 0.16); fx.flash('#fff3c0', 0.25);
      fx.shock(x, y, R * 0.15, R * 1.05, 0.4, E.glow, 10, WHITE);
      fx.after(0.08, () => fx.shock(x, y, R * 0.3, R * 1.4, 0.5, GOLD, 6, PALE));
      fx.after(0.18, () => fx.ring(x, y, R * 0.5, R * 1.8, 0.55, AMBER, 4));
      rays(fx, x, y, R * 1.3, 12, 0.35, V() * TAU);
      fx.crack(x, y, R, 'rgba(40,24,6,0.6)', 10, GOLD, 14);
      fx.debris(x, y, E.debris, fx.budget(28), 460 * k, 6, TAU);
      fx.smoke(x, y, 'rgba(210,190,140,0.4)', fx.budget(14), R * 0.8);
      fx.embers(x, y, GOLD, fx.budget(22), R * 0.9, 120);
      fx.motes(x, y, E, fx.budget(18), R * 0.7, 140);
      fx.decal(x, y, R * 0.6, 'rgba(60,40,10,0.35)', 9);
      fx.shake(18); fx.punch(0.045, x, y); fx.grade('#ffd34d', 0.3, 0.4);
    },
  });

  BD.defineEffect('phantomforge', {
    name: '幻影武器成形', category: '增益',
    desc: '高舉左手召出黃金幻影武器：四周的金光往手心收束，頭頂浮出一把巨大的發光槌影，一道光柱沖天、放射光芒與光點往上飄，畫面短暫泛金。適合召喚武器、換階段（phase2.transFx）。',
    params: { life: 0.5 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k || 1, src = o.src || null, r = (src && src.r) || 40, life = Math.max(0.3, o.life || 0.5);
      fx.charge(x, y, r * 3.4, GOLD, life, src, fx.budget(20));
      fx.ring(x, y, r * 3.2, r * 1.1, life, GOLD, 3);
      fx.glow(x, y, r * 2.2, GOLD, life + 0.6, 0.5, 0.4, src);
      fx.after(life, () => {
        hammerShape(fx, x, y - r * 0.6, -Math.PI / 2, r * 2.6 * k, 0.9);
        fx.pillar(x, y, r * 0.8 * k, GOLD, 1.0);
        fx.shock(x, y, r, r * 4 * k, 0.55, E.glow, 6, WHITE);
        rays(fx, x, y, r * 3.4 * k, 12, 0.45, V() * TAU);
        fx.motes(x, y, E, fx.budget(24), r * 2, 70);
        fx.embers(x, y, GOLD, fx.budget(14), r * 1.6, 90);
        fx.grade('#ffd34d', 0.35, 0.6); fx.shake(8); fx.punch(0.025, x, y);
      });
    },
  });

  BD.defineEffect('omenreveal', {
    name: '揭開面紗', category: '大招',
    desc: '惡兆妖鬼揭露真身：畫面暗下，破爛的斗篷碎片與毛皮往四周撕飛，暗紅咒血與金光同時從身上滲出、往身上收束，頭頂浮現「惡兆王 蒙葛特」，最後金紅雙色震波炸開。適合變身、揭露真面目的大招起手（tele.chargeFx）。',
    params: { life: 1.0 },
    spawn(fx, x, y, o) {
      const E = o.E, src = o.src || null, r = (src && src.r) || 40, life = Math.max(0.4, o.life || 1.0);
      fx.veil(life + 0.6, 0.45, '#0a0204');
      fx.charge(x, y, r * 4, BLOOD, life, src, fx.budget(18));
      fx.charge(x, y, r * 3, GOLD, life * 0.8, src, fx.budget(12));
      fx.glow(x, y, r * 2.4, BLOOD, life + 0.4, 0.5, 0.3, src);
      for (let i = 0; i < 3; i++) fx.after(life * (0.15 + i * 0.25), () => fx.debris(x, y, '#6b5426', fx.budget(10), 320, 7, TAU)); // 斗篷碎片
      fx.after(life * 0.35, () => fx.text(x, y - r - 70, '惡兆王 蒙葛特', GOLD, 30));
      fx.after(life, () => {
        fx.flash('#ffe0c0', 0.35);
        fx.shock(x, y, r, r * 5, 0.6, BLOOD, 8, GOLD);
        fx.after(0.08, () => fx.shock(x, y, r, r * 4, 0.5, GOLD, 5, WHITE));
        rays(fx, x, y, r * 4, 14, 0.4, V() * TAU);
        fx.embers(x, y, BLOOD, fx.budget(20), r * 2, 110);
        fx.motes(x, y, E, fx.budget(16), r * 2, 90);
        fx.shake(12); fx.punch(0.04, x, y); fx.grade('#ff3048', 0.25, 0.5);
      });
    },
  });

  BD.defineEffect('cursedblood', {
    name: '咒血爆發', category: '爆炸',
    desc: '封在劍裡的咒血一口氣炸開：暗紅震波帶著一圈金色閃光往外擴散，濃稠的血滴四濺、地面留下大片血漬與發光的紅色裂紋，黑紅餘燼往上飄。適合流血 / 詛咒系的範圍爆發。',
    params: {},
    spawn(fx, x, y, o) {
      const k = o.k || 1, R = o.radius || 200;
      fx.flashAt(x, y, R * 0.7, '#ffd0d0', 0.14);
      fx.shock(x, y, R * 0.1, R * 1.1, 0.45, BLOOD, 12, '#ffc0c8');
      fx.after(0.06, () => fx.ring(x, y, R * 0.4, R * 1.25, 0.4, GOLD, 3));
      fx.after(0.14, () => fx.shock(x, y, R * 0.4, R * 1.5, 0.55, GORE, 6, BLOOD));
      fx.sparks(x, y, BLOOD, fx.budget(30), 520 * k);
      fx.debris(x, y, GORE, fx.budget(18), 420 * k, 5, TAU);
      fx.crack(x, y, R * 0.9, 'rgba(60,4,14,0.6)', 10, '#ff2a40', 12);
      fx.embers(x, y, '#ff3048', fx.budget(18), R * 0.8, 100);
      fx.decal(x, y, R * 0.75, 'rgba(90,6,20,0.45)', 12);
      fx.shake(14); fx.punch(0.035, x, y); fx.grade('#b0102a', 0.3, 0.5);
    },
  });

  BD.defineEffect('swordfall', {
    name: '黃金劍落地', category: '爆炸',
    desc: '一把黃金聖劍從天插進地面：劍身與劍格的金色光痕立在落點、落點閃白，一圈金色震環與聖光碎屑往外噴，地面留下金色裂紋。適合天降劍雨（rain）的每一把劍。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, r = o.radius || 80, h = r * 1.2;
      fx.streak(x, y, x + 6, y - h, 9, AMBER, 0.55, true); fx.streak(x, y, x + 6, y - h, 3, WHITE, 0.45, true); // 劍身（往畫面上方立起）
      fx.streak(x - r * 0.3, y - h * 0.72, x + r * 0.34, y - h * 0.74, 5, GOLD, 0.5, true); // 劍格
      fx.flashAt(x, y, r * 0.7, WHITE, 0.1);
      fx.shock(x, y, 6, r * 1.1, 0.3, E.glow, 5, WHITE);
      fx.sparkle(x, y, GOLD, fx.budget(8), 260, -Math.PI / 2, 1.6);
      fx.crack(x, y, r * 0.6, 'rgba(40,24,6,0.5)', 6, GOLD, 5);
      fx.shake(4);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
