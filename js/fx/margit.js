'use strict';
// 特效庫｜瑪爾基特專屬（daggerform / canesmash / omenstab / goldhammer / phantomforge / omenreveal / cursedblood / swordfall，
//   以及每個技能組各自的 caneswing / omenslam / omenring / phantomslash / phantomthrust / tailwhip / swordcleave / swordwhirl / hammerslam / omenleap / omenbackstep）：
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

  // ── 每個技能組各自的招式特效 ──
  const arcPt = (x, y, a, d) => [x + Math.cos(a) * d, y + Math.sin(a) * d];
  const along = (x, y, a, d, l) => [x + Math.cos(a) * d - Math.sin(a) * l, y + Math.sin(a) * d + Math.cos(a) * l];

  BD.defineEffect('caneswing', {
    name: '拐杖橫掃', category: '斬擊',
    desc: '燒焦樹根般的黑色拐杖大幅橫掃：一道灰白偏焦黑的寬弧帶兩層暗色拖影，弧上沿途甩出焦黑木屑與灰燼，掃過的地面揚起一排塵土，弧末端擦地迸出火星。適合木杖、棍棒、樹根類鈍器的橫掃。',
    params: { arc: 2.4 },
    spawn(fx, x, y, o) {
      const k = Math.min(1.6, o.k), ang = o.angle || 0, arc = o.arc || 2.4, r = o.radius || 230, life = o.heavy ? 0.46 : 0.36;
      fx.slash(x, y, ang, arc, r, '#5a4c3e', Math.round(18 * k), life, { core: '#d8d0c0', trail: 3, rim: '#1a1410' });
      fx.slash(x, y, ang, arc * 0.9, r * 0.8, '#463c32', Math.round(8 * k), life * 0.8, { trail: 1, rim: null });
      fx.ghost(o.src, life * 0.6, '#8a7a66');
      for (let i = 0; i < 5; i++) {
        const a = ang - arc / 2 + arc * i / 4, [px, py] = arcPt(x, y, a, r * 0.9);
        fx.debris(px, py, WOOD, fx.budget(2), 220, 3, 6);
        fx.smoke(px, py, DUST, fx.budget(2), 14);
      }
      const [ex, ey] = arcPt(x, y, ang + arc / 2, r * 0.92);
      fx.sparks(ex, ey, '#ffb060', fx.budget(6), 220);
      fx.embers(x + Math.cos(ang) * r * 0.7, y + Math.sin(ang) * r * 0.7, '#a04a1a', fx.budget(6), r * 0.3, 60);
      fx.shake(6);
    },
  });

  BD.defineEffect('omenslam', {
    name: '延遲重砸', category: '砸地',
    desc: '雙手高舉拐杖、停頓很久後的全力重砸：落點先往內一縮（塵土吸入），接著一聲悶響——深色凹坑、放射狀的焦黑裂地、兩圈塵浪與厚重煙塵沖起，焦木碎屑往外噴、半拍後再震一下餘震。適合蓄力很久的鈍器重擊。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.7, o.k || 1), R = (o.radius || 120) * 1.1;
      fx.charge(x, y, R * 1.3, DUST, 0.08, null, fx.budget(8));
      fx.flashAt(x, y, R * 0.6, PALE, 0.1);
      fx.shock(x, y, R * 0.1, R * 1.15, 0.4, 'rgba(160,140,110,0.9)', 10, WHITE);
      fx.after(0.08, () => fx.shock(x, y, R * 0.3, R * 1.6, 0.55, DUST, 7, 'rgba(220,200,160,0.6)'));
      fx.crack(x, y, R * 1.1, 'rgba(24,16,10,0.7)', 10, null, 12);
      fx.decal(x, y, R * 0.55, 'rgba(20,14,8,0.4)', 10);
      for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + V() * 0.3; fx.puff(x, y, Math.cos(a) * 160, Math.sin(a) * 160, R * 0.15, R * 0.4, 0.8, 'sand', 0.4); }
      fx.debris(x, y, WOOD, fx.budget(16), 380 * k, 5, TAU);
      fx.debris(x, y, E.debris, fx.budget(14), 340 * k, 4.5, TAU);
      fx.smoke(x, y, DUST, fx.budget(16), R * 0.8);
      fx.shake(14); fx.punch(0.035, x, y);
      fx.after(0.22, () => { fx.ring(x, y, R * 0.6, R * 1.9, 0.4, DUST, 3); fx.shake(6); });
    },
  });

  BD.defineEffect('omenring', {
    name: '惡兆震環', category: '震波',
    desc: '重擊之後貼地推開的外環：一圈厚塵浪當前緣，後面跟元素色細環，環上一道道裂痕往外爬、碎石沿環彈起。物理（拐杖）時是灰黃塵土，聖屬性（幻影大槌）時前緣與裂痕發金光。適合重擊的二次擴散。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k || 1), r = o.radius || 220, r0 = o.r0 || r * 0.5, holy = o.el !== 'physical';
      fx.shock(x, y, r0 * 0.8, r, 0.42, holy ? AMBER : 'rgba(170,150,115,0.85)', 7, holy ? PALE : 'rgba(230,215,180,0.6)');
      fx.after(0.07, () => fx.ring(x, y, r0, r * 1.12, 0.4, holy ? GOLD : DUST, 3));
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * TAU + V() * 0.35, [ax, ay] = arcPt(x, y, a, r0), [bx, by] = arcPt(x, y, a + (V() - 0.5) * 0.2, r * 0.95);
        fx.streak(ax, ay, bx, by, 3, holy ? GOLD : 'rgba(60,46,30,0.7)', 0.32, holy);
        fx.debris(bx, by, E.debris, fx.budget(2), 160, 3, 6);
      }
      fx.smoke(x, y, DUST, fx.budget(8), r * 0.8);
      fx.shake(Math.min(10, 5 * k));
    },
  });

  BD.defineEffect('phantomslash', {
    name: '幻影短刀斬', category: '斬擊',
    desc: '左手黃金幻影短刀的快斬：一道細而亮的金色彎月刀光、白芯，緊跟兩道半透明殘影刀光（幻影武器的拖影），刀尖劃過處灑下細碎金屑、末端一點星芒。適合聖屬性短刀 / 匕首的快速連斬。',
    params: { arc: 2.0 },
    spawn(fx, x, y, o) {
      const k = Math.min(1.5, o.k), ang = o.angle || 0, arc = o.arc || 2.0, r = o.radius || 190;
      fx.slash(x, y, ang, arc, r, GOLD, Math.round(10 * k), 0.24, { core: WHITE, trail: 2 });
      fx.after(0.04, () => fx.slash(x, y, ang - 0.12, arc * 0.9, r * 0.9, AMBER, Math.round(7 * k), 0.2, { core: PALE, rim: null }));
      fx.after(0.08, () => fx.slash(x, y, ang - 0.24, arc * 0.8, r * 0.8, '#a87a20', Math.round(5 * k), 0.18, { rim: null }));
      fx.ghost(o.src, 0.2, GOLD);
      for (let i = 0; i < 4; i++) { const a = ang - arc / 2 + arc * (i + 0.5) / 4, [px, py] = arcPt(x, y, a, r * 0.92); fx.sparkle(px, py, i % 2 ? PALE : GOLD, fx.budget(3), 180, a + 1.2, 0.6); }
      const [ex, ey] = arcPt(x, y, ang + arc / 2, r * 0.95);
      fx.flashAt(ex, ey, 20, WHITE, 0.1);
      fx.streak(ex - 18, ey, ex + 18, ey, 2, PALE, 0.14, true); fx.streak(ex, ey - 18, ex, ey + 18, 2, PALE, 0.14, true);
      fx.shake(4);
    },
  });

  BD.defineEffect('phantomthrust', {
    name: '幻影突刺', category: '突刺',
    desc: '幻影武器往前一刺：一道細長的金色光束沿判定長度貫出、白熱刀芯，刀身兩側掠過速度線，刀尖炸出十字星芒與一圈金環。scale ≥ 1.2（聖劍往地上一刺）時刀尖再炸開十字聖光裂痕與光柱。適合聖屬性短刀、長劍的直刺。',
    params: { len: 230, width: 50 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), ang = o.angle || 0, len = o.len || 230, w = o.width || 50, big = (o.scale || 1) >= 1.2, [tx, ty] = along(x, y, ang, len, 0);
      fx.beam(x, y, tx, ty, w * 0.4, GOLD, 0.24, PALE);
      fx.beam(x, y, tx, ty, w * 0.12, WHITE, 0.18, WHITE);
      for (let i = 0; i < 5; i++) { const l = (V() - 0.5) * w * 1.5, [ax, ay] = along(x, y, ang, len * (0.1 + 0.3 * V()), l), [bx, by] = along(x, y, ang, len * (0.75 + 0.2 * V()), l * 0.2); fx.streak(ax, ay, bx, by, 2, PALE, 0.18, true); }
      fx.flashAt(tx, ty, 40 * k, WHITE, 0.12);
      for (let i = 0; i < 4; i++) { const a = ang + i * TAU / 4; fx.streak(tx, ty, tx + Math.cos(a) * 46 * k, ty + Math.sin(a) * 46 * k, i % 2 ? 2 : 4, PALE, 0.22, true); }
      fx.ring(tx, ty, 6, 54 * k, 0.24, GOLD, 3);
      fx.sparkle(tx, ty, GOLD, fx.budget(10), 320, ang, 0.6);
      if (big) {
        fx.pillar(tx, ty, 22, GOLD, 0.45);
        for (let i = 0; i < 4; i++) { const a = ang + i * TAU / 4 + 0.785; fx.streak(tx, ty, tx + Math.cos(a) * w * 2.2, ty + Math.sin(a) * w * 2.2, 6, AMBER, 0.36, true); }
        fx.crack(tx, ty, w * 1.6, 'rgba(40,24,6,0.55)', 7, GOLD, 6);
        fx.debris(tx, ty, E.debris, fx.budget(10), 280, 4, TAU);
        fx.shake(9); fx.punch(0.02, tx, ty);
      } else fx.shake(5);
    },
  });

  BD.defineEffect('tailwhip', {
    name: '尾掃', category: '斬擊',
    desc: '斗篷底下的長尾猛然甩過：一道貼地的低矮棕灰寬弧，弧內翻起一片塵浪與草屑，尾尖掃過處拉出一條鞭痕般的細亮線，碎石與塵土往外甩。適合尾巴、觸手、長鞭的低位橫掃。',
    params: { arc: 3.1 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), ang = o.angle || 0, arc = o.arc || 3.1, r = o.radius || 180;
      fx.slash(x, y, ang, arc, r, '#6a5a48', Math.round(16 * k), 0.3, { core: '#c8b89a', trail: 2, rim: '#2a2018' });
      fx.slash(x, y, ang, arc * 0.95, r * 1.02, PALE, 2, 0.2, { rim: null }); // 尾尖鞭痕
      for (let i = 0; i < 7; i++) {
        const a = ang - arc / 2 + arc * i / 6, [px, py] = arcPt(x, y, a, r * (0.6 + 0.3 * V()));
        fx.puff(px, py, Math.cos(a + 1.3) * 90, Math.sin(a + 1.3) * 90, r * 0.08, r * 0.24, 0.6, 'sand', 0.35);
      }
      fx.debris(x, y, E.debris, fx.budget(10), 300 * k, 3.5, r * 0.5);
      fx.smoke(x, y, DUST, fx.budget(8), r * 0.6);
      fx.shake(7); fx.punch(0.012, x, y);
    },
  });

  BD.defineEffect('omenleap', {
    name: '惡兆躍起', category: '位移',
    desc: '駝背的巨大身軀猛然躍起：起跳點一圈塵浪與深色蹬痕，破爛的斗篷布條碎片往四周甩飛，一道淡金光柱隨身形升起、金色光點拖在後面往上飄。適合巨大人形的跳躍起手。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k || 1);
      fx.shock(x, y, 10, 140 * Math.sqrt(k), 0.45, 'rgba(170,150,115,0.85)', 8, PALE);
      fx.after(0.06, () => fx.ring(x, y, 20, 170, 0.4, GOLD, 2));
      fx.decal(x, y, 30, 'rgba(30,22,14,0.4)', 6);
      fx.pillar(x, y, 20, GOLD, 0.4);
      fx.debris(x, y, '#6b5426', fx.budget(10), 300, 6, 30); // 斗篷碎片
      fx.debris(x, y, E.debris, fx.budget(8), 220, 4, 20);
      fx.smoke(x, y, DUST, fx.budget(8), 30);
      fx.embers(x, y, GOLD, fx.budget(10), 30, 150);
      fx.shake(Math.min(10, 7 * k));
    },
  });

  BD.defineEffect('omenbackstep', {
    name: '後撤躍步', category: '位移',
    desc: '揮刀後往後一跳：腳下蹬出塵土，沿後退路線兩道拖地的滑痕與斷續塵團，斗篷布條往前翻飛，落地處一小圈塵浪與金色光點。適合後跳、閃身拉開距離（搭配 dash 動作）。',
    params: { len: 230, dur: 0.26 },
    spawn(fx, x, y, o) {
      const src = o.src || null, dur = o.dur || 0.26, len = o.len || 230, ang = o.angle || 0;
      fx.smoke(x, y, DUST, fx.budget(8), 26);
      fx.debris(x, y, WOOD, fx.budget(6), 200, 4, 20);
      for (let i = 1; i <= 4; i++) fx.after(dur * i / 4, () => {
        const cx = src ? src.x : x + Math.cos(ang) * len * i / 4, cy = src ? src.y : y + Math.sin(ang) * len * i / 4;
        fx.puff(cx, cy, 0, 0, 10, 26, 0.5, 'sand', 0.3);
        fx.debris(cx, cy, '#6b5426', fx.budget(2), 140, 5, 10);
      });
      fx.after(dur, () => {
        const ex = src ? src.x : x + Math.cos(ang) * len, ey = src ? src.y : y + Math.sin(ang) * len;
        fx.ring(ex, ey, 10, 80, 0.32, DUST, 4);
        fx.motes(ex, ey, o.E, fx.budget(6), 30, 80);
        fx.shake(4);
      });
    },
  });

  BD.defineEffect('swordcleave', {
    name: '黃金聖劍斬', category: '斬擊',
    desc: '左手召出的黃金聖劍大幅橫斬：寬大的金色劍弧帶三層拖影與白熱劍刃，弧外緣一圈細白鋒線，劍尖劃過處留下一串立起的光羽，弧中段閃白。scale ≥ 1.5（大招十字斬）時再補一道反向殘弧與外環震波。適合聖屬性長劍的重斬。',
    params: { arc: 2.6 },
    spawn(fx, x, y, o) {
      const k = Math.min(1.7, o.k), ang = o.angle || 0, arc = o.arc || 2.6, r = o.radius || 260, big = (o.scale || 1) >= 1.5, life = o.heavy ? 0.46 : 0.36;
      fx.slash(x, y, ang, arc, r, AMBER, Math.round(16 * k), life, { core: PALE, trail: 3, rim: '#7a4e10' });
      fx.slash(x, y, ang, arc * 0.96, r * 1.03, WHITE, 2, life * 0.8, { rim: null }); // 鋒線
      fx.slash(x, y, ang, arc * 0.9, r * 0.7, GOLD, Math.round(7 * k), life * 0.8, { core: WHITE });
      fx.ghost(o.src, life * 0.7, GOLD);
      for (let i = 0; i < 6; i++) { const a = ang - arc / 2 + arc * i / 5, [px, py] = arcPt(x, y, a, r * 0.9); fx.streak(px, py, px, py - 18 - 10 * (i % 2), 3, PALE, 0.4, true); fx.sparkle(px, py, GOLD, fx.budget(2), 160, -Math.PI / 2, 1.2); }
      const [mx, my] = arcPt(x, y, ang, r * 0.8);
      fx.flashAt(mx, my, r * 0.3, WHITE, 0.12);
      fx.motes(mx, my, o.E, fx.budget(8), r * 0.35, 100);
      if (big) { fx.after(0.05, () => fx.slash(x, y, ang + 0.3, arc * 0.8, r * 0.85, GOLD, Math.round(10 * k), life * 0.7, { core: PALE, rim: null })); fx.ring(x, y, r * 0.4, r * 1.15, 0.45, GOLD, 3); }
      fx.shake(big ? 11 : 7);
    },
  });

  BD.defineEffect('swordwhirl', {
    name: '聖劍迴旋', category: '斬擊',
    desc: '持黃金聖劍原地轉一整圈：一圈完整的金色劍環、白芯，環外切線方向甩出金色光點，腳下一圈金色旋紋。scale ≥ 1.3（最後一轉）時劍環加倍粗、外圈炸開震波與放射光芒。適合聖屬性長劍的連續迴旋斬。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), r = o.radius || 175, ang = o.angle || 0, last = (o.scale || 1) >= 1.3;
      fx.slash(x, y, ang, Math.PI, r, GOLD, Math.round((last ? 16 : 10) * k), 0.26, { core: WHITE, trail: 2 });
      fx.slash(x, y, ang + Math.PI, Math.PI, r, GOLD, Math.round((last ? 16 : 10) * k), 0.26, { core: WHITE, trail: 2 });
      fx.ring(x, y, r * 0.3, r * 0.75, 0.3, 'rgba(255,211,77,0.5)', 2);
      for (let i = 0; i < 8; i++) { const a = ang + i * TAU / 8, [px, py] = arcPt(x, y, a, r); fx.sparkle(px, py, i % 2 ? PALE : GOLD, fx.budget(2), 240, a + Math.PI / 2, 0.5); }
      if (last) {
        fx.shock(x, y, r * 0.5, r * 1.4, 0.45, E.glow, 7, WHITE);
        rays(fx, x, y, r * 1.2, 10, 0.3, ang);
        fx.motes(x, y, E, fx.budget(12), r * 0.6, 120);
        fx.shake(12); fx.punch(0.025, x, y);
      } else fx.shake(4);
    },
  });

  BD.defineEffect('hammerslam', {
    name: '拐杖接大槌', category: '砸地',
    desc: '拐杖揮過之後，左手的黃金幻影大槌從肩後掄過頭頂往正前方砸下：三道依序落下的槌影拉出掄擊弧線，落點閃白、金色震波，地面裂出金痕、碎石與塵浪噴起，金屑往上飄。適合巨槌的掄砸（從身側掄過，不是從天而降）。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.7, o.k || 1), R = (o.radius || 140) * 1.1, src = o.src, sx = src ? src.x : x, sy = src ? src.y : y, a = Math.atan2(y - sy, x - sx);
      const hl = Math.hypot(x - sx, y - sy) || R;
      for (let i = 0; i < 3; i++) hammerShape(fx, sx, sy, a - (2 - i) * 0.5, hl, 0.1 + i * 0.06); // 掄過的三道槌影
      fx.flashAt(x, y, R * 0.7, WHITE, 0.14); fx.flash('#fff3c0', 0.15);
      fx.shock(x, y, R * 0.15, R * 1.1, 0.4, E.glow, 9, WHITE);
      fx.after(0.08, () => fx.shock(x, y, R * 0.3, R * 1.45, 0.48, GOLD, 5, PALE));
      rays(fx, x, y, R * 1.1, 10, 0.3, a);
      fx.crack(x, y, R * 0.95, 'rgba(40,24,6,0.6)', 9, GOLD, 10);
      fx.debris(x, y, E.debris, fx.budget(18), 400 * k, 5, TAU);
      fx.smoke(x, y, 'rgba(210,190,140,0.4)', fx.budget(10), R * 0.7);
      fx.embers(x, y, GOLD, fx.budget(14), R * 0.7, 110);
      fx.decal(x, y, R * 0.5, 'rgba(60,40,10,0.35)', 8);
      fx.shake(15); fx.punch(0.035, x, y); fx.grade('#ffd34d', 0.2, 0.3);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
