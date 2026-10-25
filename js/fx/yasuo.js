'use strict';
// 特效庫｜犽宿專屬（steeltempest / tornadocast / airlaunch / sweepblade / eqring / windwallcast / windblock / severwind /
// lbwarp / lbslash / lbfinale / flowshield / galeawaken / stormbreaker / risecharge / risewind / windstep）：
// 依原作配色——鋼鐵暴雪是青白鏡頭光、旋風是白藍渦流加星芒、風牆是淡藍風絲、奪命氣息落地是青綠圓環、暴擊是紅色新月。只呼叫 fx 原件；亂數只用 BD.vrng；不觸碰 DOM。
(function (G) {
  const BD = G.BD, TAU = Math.PI * 2, V = BD.vrng;
  const WHITE = '#ffffff', PALE = '#e6fbff', CYAN = '#9fe8ff', DEEP = '#2f7fa6', TEAL = '#3fd6c8', MAPLE = '#d8462a';

  const along = (x, y, ang, d, l) => [x + Math.cos(ang) * d - Math.sin(ang) * (l || 0), y + Math.sin(ang) * d + Math.cos(ang) * (l || 0)];
  // 渦流：n 道由內往外、逐層錯開角度的弧形風刃（旋風的主體）
  function swirl(fx, x, y, r, n, life, col, spin) {
    for (let i = 0; i < n; i++) {
      const k = (i + 1) / n, a0 = (spin || 0) + i * 2.1 + V() * 0.4;
      fx.slash(x, y, a0, 1.6 + k * 0.8, r * (0.3 + 0.7 * k), i % 2 ? col : WHITE, 3 + 4 * k, life * (0.7 + 0.3 * k), { core: WHITE, trail: 2, rim: DEEP });
    }
  }
  // 四芒星閃（旋風 / 奪命氣息的星芒）
  function star(fx, x, y, len, col, life) {
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4 * (len > 60 ? 0 : 1); fx.streak(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, len > 60 ? 5 : 3, col, life, true); }
    fx.flashAt(x, y, len * 0.6, WHITE, life * 0.7);
  }
  // 細長風絲：從 (x,y) 沿 ang 吹出 n 條微彎的淡藍細線
  function wisps(fx, x, y, ang, len, n, spread, col, life) {
    for (let i = 0; i < n; i++) {
      const l = (V() - 0.5) * spread, [sx, sy] = along(x, y, ang, -len * 0.1, l), [mx, my] = along(x, y, ang, len * 0.5, l + (V() - 0.5) * 18), [ex, ey] = along(x, y, ang, len * (0.8 + V() * 0.3), l + (V() - 0.5) * 30);
      fx.streak(sx, sy, mx, my, 1.4 + V(), col, life, true); fx.streak(mx, my, ex, ey, 1 + V() * 0.8, col, life * 0.85, true);
    }
  }
  function leaves(fx, x, y, n, speed) { fx.sparkle(x, y, MAPLE, fx.budget(n), speed, V() * TAU, TAU); } // 紅楓葉（原畫場景）

  BD.defineEffect('steeltempest', {
    name: '鋼鐵暴雪', category: '突刺',
    desc: '犽宿的前刺：一道筆直的青白鏡頭光從劍尖射出，中段亮起一顆白熱星芒，兩側吹出細長的風絲，刺擊終點迸出冰晶般的碎光。適合任何快速直刺（el 換成 ice 更冷冽）。',
    params: { len: 250 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k || 1, ang = o.angle || 0, len = o.len || 250, [tx, ty] = along(x, y, ang, len, 0), [mx, my] = along(x, y, ang, len * 0.55, 0);
      fx.beam(x, y, tx, ty, 6 * k, E.glow, 0.16, WHITE);
      fx.streak(x, y, tx, ty, 14 * k, CYAN, 0.12, true);
      star(fx, mx, my, 26 * k, PALE, 0.18);
      wisps(fx, x, y, ang, len, fx.budget(5), 44 * k, PALE, 0.26);
      fx.sparkle(tx, ty, E.particle, fx.budget(10), 260, ang, 0.7);
      fx.ring(tx, ty, 4, 28 * k, 0.2, WHITE, 2);
    },
  });

  BD.defineEffect('tornadocast', {
    name: '旋風捲起', category: '投射物',
    desc: '鋼鐵暴雪第三段出手：劍向前一揮，腳前炸開白藍色的渦流與四芒星，一圈風壓環向外擴散，青白風絲朝前方狂吹。適合任何「放出旋風 / 龍捲」的起手。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k || 1, ang = o.angle || 0, [fx0, fy0] = along(x, y, ang, 50 * k, 0);
      swirl(fx, fx0, fy0, 60 * k, 4, 0.3, E.glow, ang);
      star(fx, fx0, fy0, 70 * k, WHITE, 0.22);
      fx.shock(fx0, fy0, 10, 110 * k, 0.35, E.glow, 5, WHITE);
      wisps(fx, x, y, ang, 300 * k, fx.budget(8), 90 * k, PALE, 0.35);
      fx.shake(4);
    },
  });

  BD.defineEffect('airlaunch', {
    name: '捲上天', category: '震波',
    desc: '被旋風捲起：腳下一圈急速收縮又彈開的風環，白色渦流從地面螺旋往上，揚起塵土與碎葉，頭頂亮起一顆小星芒。適合所有擊飛 / 滯空狀態。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, r = (o.victim && o.victim.r) || 30;
      fx.ring(x, y, r * 2.6, r * 0.8, 0.22, PALE, 3);
      fx.after(0.12, () => fx.shock(x, y, r * 0.6, r * 3, 0.4, E.glow, 5, WHITE));
      swirl(fx, x, y, r * 1.8, 5, 0.5, E.glow, V() * TAU);
      fx.smoke(x, y, E.smoke, fx.budget(8), r * 1.4);
      leaves(fx, x, y, 6, 220);
      star(fx, x, y - r * 1.6, 22, WHITE, 0.25);
    },
  });

  BD.defineEffect('sweepblade', {
    name: '刃敵千軍', category: '位移',
    desc: '犽宿的穿身突進：身後一道殘影，沿路拖出三條平行的青白風痕，起點掀起一圈落葉與風環，終點斬出一道橫向的白色刀弧。適合高速突進、穿身斬。',
    params: { len: 360 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k || 1, ang = o.angle || 0, len = o.len || 360, [tx, ty] = along(x, y, ang, len, 0);
      fx.ghost(o.src || null, 0.35, E.glow);
      for (let i = -1; i <= 1; i++) { const [sx, sy] = along(x, y, ang, 0, i * 12 * k), [ex, ey] = along(x, y, ang, len, i * 6 * k); fx.streak(sx, sy, ex, ey, i ? 2 : 4, i ? PALE : WHITE, 0.3, true); }
      fx.beam(x, y, tx, ty, 3 * k, E.glow, 0.2, WHITE);
      fx.ring(x, y, 6, 46 * k, 0.3, PALE, 2);
      leaves(fx, x, y, 5, 180);
      fx.after(Math.min(0.2, o.dur || 0.2), () => { fx.slash(tx, ty, ang + Math.PI / 2, 1.5, 54 * k, WHITE, 6, 0.2, { core: WHITE, trail: 2, rim: DEEP }); fx.sparkle(tx, ty, PALE, fx.budget(8), 220, ang, 0.9); });
    },
  });

  BD.defineEffect('eqring', {
    name: '環斬', category: '斬擊',
    desc: '突進中的迴旋一斬：以身為圓心劃出兩圈重疊的白藍刀環，外圈接著擴出青色震波，地上留下一圈淡淡的風痕與飛散的落葉。適合範圍迴旋斬。',
    params: { radius: 135 },
    spawn(fx, x, y, o) {
      const E = o.E, r = o.radius || 135, a0 = V() * TAU;
      fx.slash(x, y, a0, TAU * 0.9, r * 0.85, WHITE, 10, 0.26, { core: WHITE, trail: 3, rim: DEEP });
      fx.slash(x, y, a0 + 1.4, TAU * 0.8, r, E.glow, 7, 0.3, { core: PALE, trail: 2, rim: DEEP });
      fx.shock(x, y, r * 0.5, r * 1.25, 0.35, E.glow, 6, WHITE);
      fx.decal(x, y, r * 0.8, E.decal, 4);
      leaves(fx, x, y, 8, 300);
      fx.sparkle(x, y, PALE, fx.budget(14), 320, 0, TAU);
      fx.shake(5);
    },
  });

  BD.defineEffect('windwallcast', {
    name: '風牆', category: '區域',
    desc: '一道淡藍色的風牆從犽宿面前升起：牆面由一束束上下流動的風絲組成，兩端捲起小渦流，升起時沿牆面閃過一道白光並擴出風壓環。適合任何「擋下投射物」的屏障（風牆本體由造型持續繪製）。',
    params: { width: 260 },
    spawn(fx, x, y, o) {
      const E = o.E, ang = o.angle || 0, wd = o.width || 260, t = ang + Math.PI / 2;
      const [ax, ay] = along(x, y, t, wd / 2, 0), [bx, by] = along(x, y, t, -wd / 2, 0);
      fx.beam(ax, ay, bx, by, 6, E.glow, 0.3, WHITE);
      for (let i = 0; i < fx.budget(10); i++) { const s = (V() - 0.5) * wd, [px, py] = along(x, y, t, s, 0); fx.streak(px, py, px + Math.cos(ang) * (30 + V() * 40), py + Math.sin(ang) * (30 + V() * 40), 2, PALE, 0.4, true); }
      for (const [ex, ey] of [[ax, ay], [bx, by]]) swirl(fx, ex, ey, 26, 3, 0.4, E.glow, V() * TAU);
      fx.shock(x, y, 10, wd * 0.5, 0.35, E.glow, 4, WHITE);
    },
  });

  BD.defineEffect('windblock', {
    name: '風牆擋下', category: '區域',
    desc: '飛來的東西撞上風牆被吹散：撞擊點迸出一顆白色星芒、一圈短促的風環與四散的淡藍碎光（empower：犽宿自己的旋風穿過風牆，渦流放大一圈）。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, ang = o.angle || 0;
      star(fx, x, y, o.empower ? 60 : 30, WHITE, 0.2);
      fx.ring(x, y, 6, o.empower ? 90 : 40, 0.25, E.glow, 3);
      fx.sparkle(x, y, PALE, fx.budget(10), 260, ang + Math.PI, 1.8);
      if (o.empower) swirl(fx, x, y, 70, 4, 0.35, E.glow, V() * TAU);
    },
  });

  BD.defineEffect('severwind', {
    name: '納刀・斷風', category: '斬擊',
    desc: '收刀入鞘、一口氣拔出：腳下先收束一圈風，拔刀的瞬間朝前方噴出一道狹長的白色刀光，身後逆向吹出風絲，刀光兩側掠過細長的青色殘影（n > 1 時扇形多道）。適合居合 / 拔刀斬。',
    params: { n: 1, arc: 0 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k || 1, ang = o.angle || 0, n = o.n || 1, arc = o.arc || 0;
      fx.ring(x, y, 70 * k, 10, 0.18, PALE, 2);
      for (let i = 0; i < n; i++) {
        const a = ang + (n > 1 ? (i / (n - 1) - 0.5) * arc : 0), [tx, ty] = along(x, y, a, 420 * k, 0);
        fx.beam(x, y, tx, ty, 4 * k, E.glow, 0.18, WHITE);
        fx.streak(x, y, tx, ty, 12 * k, CYAN, 0.14, true);
      }
      fx.slash(x, y, ang, 1.2, 60 * k, WHITE, 8, 0.2, { core: WHITE, trail: 3, rim: DEEP });
      wisps(fx, x, y, ang + Math.PI, 120 * k, fx.budget(5), 50, PALE, 0.3);
      fx.flashAt(x, y, 50 * k, WHITE, 0.12);
      fx.shake(4);
    },
  });

  BD.defineEffect('lbwarp', {
    name: '奪命氣息・瞬移', category: '位移',
    desc: '化為一陣風瞬移：原地留下殘影與一團旋散的風，起點與落點之間拉出一道極細的白光，落點閃出青綠星芒並捲起落葉。適合大招前的瞬移。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, tx = o.toX == null ? x : o.toX, ty = o.toY == null ? y : o.toY;
      fx.ghost(o.src || null, 0.5, E.glow);
      swirl(fx, x, y, 40, 3, 0.3, E.glow, V() * TAU);
      fx.beam(x, y, tx, ty, 2, TEAL, 0.25, WHITE);
      star(fx, tx, ty, 50, TEAL, 0.25);
      leaves(fx, tx, ty, 8, 260);
      fx.veil(0.9, 0.35, '#06121c');
      fx.grade(TEAL, 0.25, 0.9);
    },
  });

  BD.defineEffect('lbslash', {
    name: '奪命氣息・連斬', category: '斬擊',
    desc: '空中的一記斬擊：犽宿的殘影從目標四周閃現，一道穿過目標的長直白色刀線（角度每刀不同），外層包一圈青色殘光並帶一道弧形刀風，切點迸出白色碎光；越後面的刀越長。適合多段空中連斬（i / n 表示第幾刀）。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, ang = o.angle || 0, i = o.i || 0, n = o.n || 6, len = 150 + 110 * (i / n), s = o.src;
      const [sx, sy] = along(x, y, ang, -len, 0), [ex, ey] = along(x, y, ang, len, 0);
      if (s && s.def) fx.ghost({ x: sx + (x - sx) * 0.55, y: sy + (y - sy) * 0.55, face: ang, r: s.r, def: s.def, phase: s.phase }, 0.3, E.glow); // 殘影：從刀線起點斬過去
      fx.beam(sx, sy, ex, ey, 5, E.glow, 0.22, WHITE);
      fx.streak(sx, sy, ex, ey, 16, CYAN, 0.16, true);
      fx.slash(x, y, ang + Math.PI / 2, 1.2, len * 0.45, WHITE, 6, 0.18, { core: WHITE, trail: 2, rim: DEEP });
      fx.sparkle(x, y, PALE, fx.budget(6), 240, ang, 0.6);
      fx.flashAt(x, y, 30, WHITE, 0.08);
      fx.shake(3);
    },
  });

  BD.defineEffect('lbfinale', {
    name: '奪命氣息・落地斬', category: '大招',
    desc: '奪命氣息最後一刀：一道橫貫畫面的白色巨型刀光把對手斬回地面，落點炸開青綠色圓環與兩層震波，地面裂出淡藍風痕，紅楓葉與碎光四散，畫面閃白後瞬間拉回。適合大招收尾。',
    params: { radius: 170 },
    spawn(fx, x, y, o) {
      const E = o.E, r = o.radius || 170, ang = o.angle || 0, [sx, sy] = along(x, y, ang + 0.6, -r * 1.8, 0), [ex, ey] = along(x, y, ang + 0.6, r * 1.8, 0);
      fx.beam(sx, sy, ex, ey, 10, E.glow, 0.3, WHITE);
      fx.streak(sx, sy, ex, ey, 26, CYAN, 0.22, true);
      fx.slash(x, y, ang, 2.4, r * 0.9, WHITE, 14, 0.32, { core: WHITE, trail: 4, rim: DEEP });
      fx.ring(x, y, r * 0.3, r * 1.1, 0.5, TEAL, 6);
      fx.shock(x, y, 20, r * 1.4, 0.5, E.glow, 8, WHITE);
      fx.after(0.1, () => fx.shock(x, y, 10, r * 2, 0.55, TEAL, 5, WHITE));
      fx.crack(x, y, r * 0.8, 'rgba(30,70,100,0.5)', 3, CYAN, 6);
      leaves(fx, x, y, 14, 380);
      fx.sparkle(x, y, PALE, fx.budget(20), 420, 0, TAU);
      fx.flash(WHITE, 0.45); fx.shake(14); fx.punch(0.05, x, y);
    },
  });

  BD.defineEffect('flowshield', {
    name: '浪人之道・護盾', category: '增益',
    desc: '劍意化為護盾：身周捲起一圈半透明的白藍風壁，風絲沿圓周逆時針流轉，外圈一道擴散的風環。適合短暫護盾（被動觸發）。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, r = ((o.src && o.src.r) || 25) * 1.9;
      for (let i = 0; i < 3; i++) fx.slash(x, y, i * 2.1, 2.2, r, i ? E.glow : WHITE, 5, 0.6, { core: PALE, trail: 2, rim: DEEP });
      fx.ring(x, y, r * 0.8, r * 1.5, 0.4, PALE, 3);
      fx.glow(x, y, r, E.glow, 0.6, 0.35, 0.2, o.src || null);
    },
  });

  BD.defineEffect('galeawaken', {
    name: '疾風覺醒', category: '增益',
    desc: '犽宿喝一口酒、往劍上一噴：酒霧化成一團細碎的白光，接著以身為圓心捲起巨大的龍捲風——三層白藍渦流、向上升騰的風絲與漫天紅楓葉，最後一道風壓環橫掃全場。適合二階段轉換。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, life = o.life || 0.6;
      fx.sparkle(x, y - 10, WHITE, fx.budget(14), 160, -Math.PI / 2, 1.2); // 噴在劍上的酒霧
      fx.after(life * 0.5, () => {
        swirl(fx, x, y, 90, 6, 0.6, E.glow, 0);
        swirl(fx, x, y, 150, 5, 0.7, PALE, 1.5);
        leaves(fx, x, y, 20, 420);
        fx.shock(x, y, 20, 320, 0.7, E.glow, 8, WHITE);
        fx.grade(CYAN, 0.3, 1.2); fx.shake(10);
      });
    },
  });

  BD.defineEffect('stormbreaker', {
    name: '颶風破', category: '斬擊',
    desc: '交叉兩斬的收尾：兩道交錯的巨大白色刀弧，交點炸開一顆四芒星與青白震波，周圍捲起渦流和碎葉。適合多段連斬的最後一擊。',
    params: { radius: 150 },
    spawn(fx, x, y, o) {
      const E = o.E, r = o.radius || 150, a = V() * Math.PI;
      for (const d of [Math.PI / 4, -Math.PI / 4]) { const [sx, sy] = along(x, y, a + d, -r, 0), [ex, ey] = along(x, y, a + d, r, 0); fx.beam(sx, sy, ex, ey, 6, E.glow, 0.24, WHITE); fx.streak(sx, sy, ex, ey, 16, CYAN, 0.18, true); }
      star(fx, x, y, 80, WHITE, 0.26);
      fx.shock(x, y, 10, r * 1.2, 0.4, E.glow, 6, WHITE);
      swirl(fx, x, y, r * 0.7, 3, 0.35, E.glow, a);
      leaves(fx, x, y, 10, 320);
      fx.shake(9);
    },
  });

  BD.defineEffect('risecharge', {
    name: '乘風而起・聚風', category: '區域',
    desc: '目標腳下聚起旋風：一圈向內收縮的風環，地上的風絲沿圓周繞圈越轉越快，中心慢慢亮起白光。適合龍捲 / 擊飛的預警（teleFx）。',
    params: { radius: 150 },
    spawn(fx, x, y, o) {
      const E = o.E, r = o.radius || 150, life = o.life || 0.7;
      fx.ring(x, y, r * 1.2, r * 0.3, life, PALE, 2);
      fx.charge(x, y, r * 0.6, E.glow, life, null, 12);
      for (let s = 0; s < 4; s++) fx.after(s * life / 4, () => fx.slash(x, y, s * 1.7, 2, r * (0.9 - s * 0.15), E.glow, 3, life / 3, { core: PALE, trail: 2, rim: DEEP }));
    },
  });

  BD.defineEffect('risewind', {
    name: '乘風而起', category: '大招',
    desc: '腳下捲起巨大龍捲風：六層白藍渦流螺旋升起、中心一道白光柱沖天，外圈兩層震波，碎石、塵土與紅楓葉被一起捲上天。適合巨大龍捲 / 擊飛範圍技。',
    params: { radius: 150 },
    spawn(fx, x, y, o) {
      const E = o.E, r = o.radius || 150;
      swirl(fx, x, y, r, 6, 0.55, E.glow, V() * TAU);
      fx.pillar(x, y, r * 0.35, PALE, 0.5);
      fx.shock(x, y, 10, r * 1.3, 0.45, E.glow, 7, WHITE);
      fx.after(0.12, () => fx.shock(x, y, r * 0.5, r * 1.8, 0.5, PALE, 4, WHITE));
      fx.debris(x, y, E.debris, fx.budget(10), 320, 4, r * 0.6);
      fx.smoke(x, y, E.smoke, fx.budget(10), r);
      leaves(fx, x, y, 14, 400);
      fx.shake(10);
    },
  });

  BD.defineEffect('windstep', {
    name: '風步', category: '位移',
    desc: '一陣風似地閃身：原地留下殘影與小渦流，到達處閃出白色小星芒（也用在天寒地凍集滿時，身上捲起一圈風）。適合短距瞬步。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, tx = o.toX == null ? x : o.toX, ty = o.toY == null ? y : o.toY;
      fx.ghost(o.src || null, 0.3, E.glow);
      swirl(fx, x, y, 34, 2, 0.25, E.glow, V() * TAU);
      if (tx !== x || ty !== y) { fx.streak(x, y, tx, ty, 2, PALE, 0.2, true); star(fx, tx, ty, 24, WHITE, 0.18); }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
