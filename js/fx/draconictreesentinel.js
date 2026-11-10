'use strict';
// 特效庫｜龍裝大樹守衛專屬（dtsbolt 落雷轟頂 / dtssmite 雷鳴重擊 / dtswave 赤雷浪出手 / dtsawaken 龍雷灌注）：
// 配色取自原作二階段的赤紅雷霆（元素用 'dragon'：深紅 + 電弧），夾帶畸形龍鎧的金色火星。只呼叫 fx 原件；亂數只用 BD.vrng；不觸碰 DOM。
(function (G) {
  const BD = G.BD, TAU = Math.PI * 2, V = BD.vrng;
  const GOLD = '#ffd34d', WHITE = '#ffffff';

  // 折線落雷：由上空 h 高處折下 n 段，外層粗光、內層白芯
  function bolt(fx, x, y, h, w, E, life, n) {
    let px = x + (V() - 0.5) * h * 0.2, py = y - h;
    for (let i = 1; i <= n; i++) {
      const last = i === n, nx = last ? x : x + (V() - 0.5) * h * 0.18, ny = y - h * (1 - i / n);
      fx.streak(px, py, nx, ny, w * 2.2, E.glow, life * 1.3, true);
      fx.streak(px, py, nx, ny, w, E.core, life, true);
      if (!last && V() < 0.7) { const bx = nx + (V() - 0.5) * h * 0.35, by = ny + h * 0.12; fx.streak(nx, ny, bx, by, w * 0.7, E.glow, life * 0.9, true); } // 分叉電弧
      px = nx; py = ny;
    }
  }
  // 地面放射電弧
  function arcs(fx, x, y, r, n, E, life) {
    for (let i = 0; i < n; i++) {
      let a = i / n * TAU + V() * 0.5, px = x, py = y;
      for (let s = 0; s < 3; s++) {
        a += (V() - 0.5) * 0.9; const l = r * (0.28 + V() * 0.14), nx = px + Math.cos(a) * l, ny = py + Math.sin(a) * l;
        fx.after(s * 0.03, ((ax, ay, bx, by) => () => { fx.streak(ax, ay, bx, by, 5, E.glow, life, true); fx.streak(ax, ay, bx, by, 2, E.core, life * 0.8, true); })(px, py, nx, ny));
        px = nx; py = ny;
      }
    }
  }

  BD.defineEffect('dtsbolt', {
    name: '龍雷轟頂', category: '砸地',
    desc: '二階段磨礪雷擊的第三道落雷：一根粗大的紅色折線雷柱貫穿地面、白光閃爆，地面向外炸出放射電弧與金色火星。適合重落雷、雷罰。',
    params: { radius: 120 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k || 1), r = o.radius || 120;
      fx.flashAt(x, y, r * 1.3, E.core, 0.2);
      fx.pillar(x, y, r * 0.6 * k, E.glow, 0.5);
      bolt(fx, x, y, 480 * k, 7 * k, E, 0.22, 5);
      fx.shock(x, y, r * 0.3, r * 1.5, 0.45, E.glow, 7, E.core);
      fx.ring(x, y, r * 0.5, r * 1.2, 0.6, E.core, 2);
      fx.crack(x, y, r * 1.1, E.crack || E.glow, 1.2, true, 7);
      arcs(fx, x, y, r * 1.3, 8, E, 0.3);
      fx.sparks(x, y, GOLD, fx.budget(18), 360);
      fx.debris(x, y, E.debris, fx.budget(10), 280, 5, TAU);
      fx.shake(7); fx.punch(0.02, x, y);
    },
  });

  BD.defineEffect('dtssmite', {
    name: '雷鳴重擊', category: '砸地',
    desc: '龍爪巨槌灌滿赤雷砸地：落點爆開紅白閃光與裂紋，三圈雷波一圈比一圈外擴，電弧沿地面亂竄，數道細雷從天劈下。適合帶雷的重錘、範圍遠大於落點的雷震。',
    params: { radius: 140 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, (o.k || 1) * (o.scale || 1)), r = o.radius || 140;
      fx.flashAt(x, y, r * 1.2, WHITE, 0.14);
      fx.pillar(x, y, r * 0.5 * k, E.glow, 0.45);
      fx.shock(x, y, r * 0.4, r * 1.3, 0.35, E.glow, 8, E.core);
      for (let i = 0; i < 3; i++) fx.after(0.1 + i * 0.1, () => fx.ring(x, y, r * (0.8 + i * 0.7), r * (1.6 + i * 1.5), 0.55, i ? E.glow : E.core, 4 - i));
      fx.crack(x, y, r * 1.5, E.crack || E.glow, 1.4, true, 9);
      arcs(fx, x, y, r * 2.0, 10, E, 0.32);
      for (let i = 0; i < 3; i++) { const a = V() * TAU, d = r * (0.8 + V() * 1.2); fx.after(0.12 + i * 0.09, () => bolt(fx, x + Math.cos(a) * d, y + Math.sin(a) * d, 360, 4, E, 0.18, 4)); }
      fx.sparks(x, y, GOLD, fx.budget(24), 420);
      fx.debris(x, y, E.debris, fx.budget(14), 340, 6, TAU);
      fx.shake(9); fx.punch(0.025, x, y);
    },
  });

  BD.defineEffect('dtswave', {
    name: '赤雷浪出手', category: '投射物',
    desc: '巨槌從身後猛然扯出赤雷波：出手點爆出紅白閃光，沿射向放出數條鋸齒電弧與兩圈震環，金色火星往前噴。適合雷屬性長距離波動的出手演出。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, ang = o.angle || 0, n = o.n || 1, arc = o.arc || 0;
      const fwd = (d, l) => [x + Math.cos(ang) * d - Math.sin(ang) * (l || 0), y + Math.sin(ang) * d + Math.cos(ang) * (l || 0)];
      const [fx0, fy0] = fwd(60);
      fx.flashAt(fx0, fy0, 90, E.core, 0.16);
      fx.ring(fx0, fy0, 10, 120, 0.3, E.glow, 4);
      for (let i = 0; i < 6 + n * 2; i++) {
        let d = 40, l = 0;
        for (let s = 0; s < 4; s++) {
          const [ax, ay] = fwd(d, l); d += 55 + V() * 25; l += (V() - 0.5) * 70 + (arc ? (i % 3 - 1) * arc * 30 : 0);
          const [bx, by] = fwd(d, l);
          fx.after(s * 0.025, () => { fx.streak(ax, ay, bx, by, 5, E.glow, 0.24, true); fx.streak(ax, ay, bx, by, 2, E.core, 0.2, true); });
        }
      }
      fx.sparks(fx0, fy0, GOLD, fx.budget(14), 380);
      fx.shake(4);
    },
  });

  BD.defineEffect('dtsawaken', {
    name: '龍雷灌注', category: '增益',
    desc: '紅雷灌進巨槌與龍爪盾：腳下收束一圈紅光，天空畫面短暫泛紅，數道赤雷環繞劈下、白光閃爆、衝擊環一圈圈擴散，金色火星往上飄。適合二階段轉場與龍屬性強化。',
    params: { life: 0.7 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k || 1, src = o.src || null, r = (src && src.r) || 54, life = Math.max(0.4, o.life || 0.7);
      fx.charge(x, y, r * 3.4, E.glow, life, src, fx.budget(20));
      fx.glow(x, y, r * 2.4, E.glow, life + 0.7, 0.55, 0.4, src);
      fx.after(life, () => {
        fx.grade(E.glow, 0.32, 0.8);
        fx.flashAt(x, y, r * 3, WHITE, 0.18);
        fx.pillar(x, y, r * 0.9 * k, E.glow, 1.0);
        fx.shock(x, y, r, r * 4.6 * k, 0.6, E.glow, 7, E.core);
        fx.ring(x, y, r * 1.4, r * 2.0, 1.2, E.core, 2);
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + V() * 0.4, d = r * (1.4 + V() * 1.6); fx.after(i * 0.05, () => bolt(fx, x + Math.cos(a) * d, y + Math.sin(a) * d, 380, 5, E, 0.22, 4)); }
        arcs(fx, x, y, r * 3.2, 12, E, 0.4);
        fx.embers(x, y, GOLD, fx.budget(18), r * 1.8, 90);
        fx.shake(8); fx.punch(0.025, x, y);
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
