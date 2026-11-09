'use strict';
// 特效庫｜星軌輪刃（ckthrow / ckchain / ckstep / ckbind / ckconst / ckstar / cknova）：狩獵模式原創武器的輪刃拋擲、星鏈、流星步、星縛與星座崩落
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。飛行中的輪刃本體由 js/render/hunt4.js 依招式時間畫。
(function (G) {
  const BD = G.BD, TAU = Math.PI * 2;
  const col = (o) => o.color || o.E.core;

  BD.defineEffect('ckthrow', {
    name: '輪刃迴旋擲', category: '投射物',
    desc: '環刃飛出的軌跡：沿直線一串星屑與兩道細亮線，終點迸開小星芒。搭配繪圖層畫出旋轉飛行的輪刃。',
    params: {},
    spawn(fx, x, y, o) {
      const c = col(o), a = o.angle || 0, L = o.len || 400, sx = o.src ? o.src.x : x, sy = o.src ? o.src.y : y, ex = sx + Math.cos(a) * L, ey = sy + Math.sin(a) * L;
      const nx = -Math.sin(a) * 10, ny = Math.cos(a) * 10;
      fx.streak(sx + nx, sy + ny, ex + nx, ey + ny, 2.5, c, 0.35, true);
      fx.streak(sx - nx, sy - ny, ex - nx, ey - ny, 2.5, '#ffffff', 0.3, true);
      for (let k = 1; k <= 6; k++) fx.after(k * 0.03, () => fx.sparkle(sx + (ex - sx) * k / 6, sy + (ey - sy) * k / 6, c, 3, 120));
      fx.after(0.2, () => { fx.ring(ex, ey, 6, 40, 0.25, c, 3); fx.flashAt(ex, ey, 22, '#ffffff', 0.1); });
    },
  });

  BD.defineEffect('ckchain', {
    name: '星鏈突進', category: '位移',
    desc: '甩出星鏈把自己拉過去：一串鏈節亮點沿衝刺方向排開、依序亮起，起點留一圈星環。',
    params: {},
    spawn(fx, x, y, o) {
      const c = col(o), a = o.angle || 0, L = o.len || 250;
      fx.ring(x, y, 4, 34, 0.25, c, 2.5);
      for (let k = 1; k <= 8; k++) {
        const px = x + Math.cos(a) * L * k / 8, py = y + Math.sin(a) * L * k / 8;
        fx.after(k * 0.018, () => { fx.flashAt(px, py, 7, c, 0.18); fx.sparkle(px, py, '#ffffff', 1, 60); });
      }
      fx.streak(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, 3, c, 0.3, true);
    },
  });

  BD.defineEffect('ckstep', {
    name: '流星步', category: '位移',
    desc: '橫向閃身：身後拖出一道金色流星尾與幾點星屑。',
    params: {},
    spawn(fx, x, y, o) {
      const c = col(o), a = o.angle || 0, L = o.len || 140, ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
      fx.streak(ex, ey, x, y, 6, c, 0.3, true);
      fx.sparkle(x, y, c, 6, 140, a + Math.PI, 1.2);
      if (o.src) fx.ghost(o.src, 0.25, c);
    },
  });

  BD.defineEffect('ckbind', {
    name: '星縛', category: '增益',
    desc: '精準閃過後，數道星鏈從四方射向 Boss 纏住：放射亮線收束、外圈星環縮緊、中心閃白。',
    params: { life: 0.9 },
    spawn(fx, x, y, o) {
      const c = col(o), V = BD.vrng, r = (o.src && o.src.r ? o.src.r : 40) + 60, life = o.life || 0.9;
      for (let k = 0; k < 6; k++) {
        const a = k * TAU / 6 + V() * 0.4, px = x + Math.cos(a) * r * 2.2, py = y + Math.sin(a) * r * 2.2;
        fx.streak(px, py, x, y, 3, k % 2 ? '#ffffff' : c, 0.35, true);
        fx.flashAt(px, py, 10, c, 0.2);
      }
      fx.ring(x, y, r * 1.6, r * 0.7, 0.35, c, 4);
      fx.after(0.2, () => fx.ring(x, y, r * 0.7, r * 0.8, life, c, 2));
      fx.flashAt(x, y, r * 0.6, '#ffffff', 0.12); fx.shake(4);
    },
  });

  BD.defineEffect('ckconst', {
    name: '星座顯現', category: '大招',
    desc: '星座崩落起手：場地一暗，Boss 身上的星痕亮起並以亮線連成星座，外圈緩緩轉起金色星環。',
    params: { life: 1.8 },
    spawn(fx, x, y, o) {
      const c = col(o), b = o.src, n = Math.max(3, o.n || 7), life = o.life || 1.8, r = (b && b.r ? b.r : 40);
      fx.veil(life, 0.45, '#05060f'); fx.grade('#3a4aa0', 0.18, life);
      const P = BD.HUNT4 && BD.HUNT4.ckStarPos && b ? (k) => BD.HUNT4.ckStarPos(b, k) : (k) => ({ x: x + Math.cos(k * 2.4) * r * 0.5, y: y + Math.sin(k * 2.4) * r * 0.5 });
      for (let k = 0; k < n; k++) {
        const p = P(k), q = P((k + 1) % n);
        fx.after(k * 0.08, () => { fx.flashAt(p.x, p.y, 14, '#ffffff', 0.4); fx.streak(p.x, p.y, q.x, q.y, 2.5, c, life - k * 0.08, true); });
      }
      for (let k = 0; k < 3; k++) fx.after(0.2 + k * 0.4, () => fx.ring(x, y, r * 2.6, r * 1.2, 0.5, c, 3));
    },
  });

  BD.defineEffect('ckstar', {
    name: '星光落下', category: '投射物',
    desc: '星座裡的一顆星：一道細長星光從高空直落、落點十字星芒與小星環。',
    params: {},
    spawn(fx, x, y, o) {
      const c = col(o);
      fx.streak(x - 60, y - 420, x, y, 5, '#ffffff', 0.18, true);
      fx.streak(x - 60, y - 420, x, y, 9, c, 0.22, true);
      fx.streak(x - 22, y, x + 22, y, 3, '#ffffff', 0.2, true); fx.streak(x, y - 22, x, y + 22, 3, '#ffffff', 0.2, true);
      fx.ring(x, y, 4, 36, 0.3, c, 3); fx.sparkle(x, y, c, 6, 160); fx.shake(2);
    },
  });

  BD.defineEffect('cknova', {
    name: '星座崩落', category: '大招',
    desc: '整個星座向中心坍縮後爆開：全屏白閃、三層金藍震波、放射星芒與大量星屑，地面留下星形光痕。',
    params: {},
    spawn(fx, x, y, o) {
      const c = col(o), V = BD.vrng, R = o.radius || 300;
      fx.ring(x, y, R, 10, 0.18, '#ffffff', 5);
      fx.after(0.12, () => {
        fx.flash('#fff6d8', 0.55); fx.punch(0.05, x, y); fx.shake(14);
        fx.shock(x, y, 20, R, 0.45, c, 10, '#ffffff'); fx.shock(x, y, 10, R * 0.7, 0.35, '#9fd8ff', 7); fx.ring(x, y, 30, R * 1.25, 0.6, c, 3);
        for (let k = 0; k < 10; k++) { const a = k * TAU / 10 + V() * 0.2, L = R * (0.7 + 0.5 * V()); fx.streak(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, 5, k % 2 ? c : '#ffffff', 0.4, true); }
        fx.sparkle(x, y, c, 30, 520); fx.sparkle(x, y, '#9fd8ff', 16, 380);
        fx.decal(x, y, R * 0.5, 'rgba(255,233,168,0.25)', 3);
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
