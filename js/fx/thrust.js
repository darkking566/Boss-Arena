'use strict';
// 特效庫｜突刺（thrust / cross / slashline / iaido / beam）：直線穿刺、斬線、居合衝刺、遲裂居合與光束
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
// o：E 元素主題、angle 方向、len 長度、width 寬度、dur 衝刺時間、k 綜合倍率、src 施放者
(function (G) {
  const BD = G.BD;

  BD.defineEffect('thrust', {
    name: '突刺', category: '突刺',
    desc: '沿直線貫穿的細長刃光：明亮光束與中軸拖影，尖端爆出放射火花。適合長槍、角撞等單點穿刺。',
    params: { len: 200, width: 40 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, len = o.len || 200, w = (o.width || 40) * 0.6;
      const ang = o.angle || 0;
      const tx = x + Math.cos(ang) * len, ty = y + Math.sin(ang) * len;
      fx.beam(x, y, tx, ty, w * Math.min(1.5, k), E.glow, 0.2, E.core);
      fx.streak(x, y, tx, ty, Math.max(2, w * 0.3), E.glow, 0.22, true);
      fx.flashAt(tx, ty, 14 + 10 * k, E.core, 0.12);
      fx.sparkle(tx, ty, E.core, Math.round(6 * k), 300, ang, 0.6);
      fx.motes(tx, ty, E, Math.round(4 * k), 20, 120);
      fx.shake(Math.min(8, 2 * k));
    },
  });

  BD.defineEffect('cross', {
    name: '斬線', category: '突刺',
    desc: '一道貫穿整個畫面的筆直斬線：粗光束加兩端垂直飛散的火花，沿線留有元素微光。適合多重斬擊、影分身追斬。',
    params: { len: 200, width: 40 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, len = o.len || 200, w = o.width || 40;
      const ang = o.angle || 0;
      const tx = x + Math.cos(ang) * len, ty = y + Math.sin(ang) * len;
      fx.beam(x, y, tx, ty, w * Math.min(1.4, k), E.glow, 0.3, E.core);
      fx.sparkle(x, y, E.core, Math.round(6 * k), 320, ang + Math.PI / 2, 0.5);
      fx.sparkle(tx, ty, E.core, Math.round(6 * k), 320, ang + Math.PI / 2, 0.5);
      const n = Math.max(2, Math.round(len / 60));
      for (let i = 1; i <= n; i++) {
        const t = i / (n + 1);
        fx.motes(x + (tx - x) * t, y + (ty - y) * t, E, 1, 8, 70);
      }
      if (k > 1.3) fx.flashAt(x, y, 12 * k, E.core, 0.1);
      fx.shake(Math.min(6, 1.5 * k));
    },
  });

  BD.defineEffect('slashline', {
    name: '居合一閃', category: '突刺',
    desc: '衝刺穿身的一閃：衝刺途中留下多道殘影，落定後從起點到終點劃出白熱貫穿光束。適合高速突進斬、居合拔刀。',
    params: { len: 200, width: 40, dur: 0.3 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, len = o.len || 200, dur = o.dur || 0.3;
      const ang = o.angle || 0, src = o.src || null;
      const ex = src && src.x != null ? src.x : x + Math.cos(ang) * len;
      const ey = src && src.y != null ? src.y : y + Math.sin(ang) * len;
      const segs = 4;
      for (let i = 1; i <= segs; i++) {
        fx.after(dur * i / segs, () => {
          if (src) fx.ghost(src, 0.3, E.glow);
          else {
            const t = i / segs;
            fx.streak(x + (ex - x) * (t - 1 / segs), y + (ey - y) * (t - 1 / segs), x + (ex - x) * t, y + (ey - y) * t, 6, E.glow, 0.2, true);
          }
        });
      }
      fx.after(dur, () => {
        const sx = src && src.x != null ? src.x : ex, sy = src && src.y != null ? src.y : ey;
        fx.beam(x, y, sx, sy, 10 * Math.min(1.4, k), '#ffffff', 0.3, E.core);
        fx.beam(x, y, sx, sy, 18 * Math.min(1.5, k), E.glow, 0.34, E.core);
        fx.streak(x, y, sx, sy, 5, E.core, 0.4, true);
        fx.flashAt(x, y, 18, E.core, 0.14);
        fx.flashAt(sx, sy, 18, E.core, 0.14);
        const n = Math.round(10 * k);
        const a = Math.atan2(sy - y, sx - x);
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          fx.sparkle(x + (sx - x) * t, y + (sy - y) * t, E.core, 1, 240, a + Math.PI / 2, 1.4);
        }
        fx.motes(sx, sy, E, Math.round(6 * k), 30, 140);
        fx.shake(Math.min(8, 3 * k));
      });
    },
  });

  BD.defineEffect('iaido', {
    name: '居合・遲裂', category: '突刺',
    desc: '快到看不見的拔刀：衝刺途中只留下淡淡殘影，收刀後空中懸著一條細白刀痕，delay 秒後才沿線猛然裂開——白熱光束、裂口兩側錯開的亮線、往兩側噴濺的火花與全屏一閃。適合居合、拔刀術等「斬完才裂」的突進斬。',
    params: { len: 200, width: 40, dur: 0.3, delay: 0.3 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, len = o.len || 200, dur = o.dur || 0.3, delay = o.delay;
      const ang = o.angle || 0, src = o.src || null;
      for (let i = 1; i <= 3; i++) fx.after(dur * i / 3, () => { if (src) fx.ghost(src, 0.18, '#ffffff'); });
      fx.after(dur, () => {
        const sx = src && src.x != null ? src.x : x + Math.cos(ang) * len, sy = src && src.y != null ? src.y : y + Math.sin(ang) * len;
        // 懸在空中的刀痕：短命的細光束接力，亮度維持到裂開
        for (let t = 0; t < delay; t += 0.1) fx.after(t, () => fx.beam(x, y, sx, sy, 2.5, '#ffffff', 0.14));
        fx.flashAt(sx, sy, 10, '#ffffff', 0.08);
        fx.sparkle(sx, sy, '#ffffff', 3, 120);
        fx.after(delay, () => {
          const a = Math.atan2(sy - y, sx - x), nx = -Math.sin(a), ny = Math.cos(a);
          fx.beam(x, y, sx, sy, 26 * Math.min(1.5, k), E.glow, 0.32, E.core);
          fx.beam(x, y, sx, sy, 8, '#ffffff', 0.26, E.core);
          // 裂口兩側的亮線往外錯開，像空間被切開
          for (const s of [-1, 1]) fx.streak(x + nx * s * 7, y + ny * s * 7, sx + nx * s * 7, sy + ny * s * 7, 3, E.core, 0.35, true);
          const n = Math.round(12 * k);
          for (let i = 0; i < n; i++) {
            const t = (i + 0.5) / n;
            fx.sparkle(x + (sx - x) * t, y + (sy - y) * t, E.core, 1, 280, a + (i % 2 ? 1 : -1) * Math.PI / 2, 0.6);
          }
          fx.flashAt(x, y, 20, E.core, 0.14);
          fx.flashAt(sx, sy, 20, E.core, 0.14);
          fx.motes(sx, sy, E, Math.round(6 * k), 30, 140);
          fx.flash('#ffffff', 0.12);
          fx.shake(Math.min(10, 4 * k), a + Math.PI / 2);
        });
      });
    },
  });

  BD.defineEffect('beam', {
    name: '光束', category: '突刺',
    desc: '粗大筆直的能量光束：起點聚光、沿線元素微粒、終點爆閃。適合雷射、吐息直線、法術砲擊。',
    params: { len: 200, width: 40 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, len = o.len || 200, w = (o.width || 40) * Math.min(1.5, k);
      const ang = o.angle || 0;
      const tx = x + Math.cos(ang) * len, ty = y + Math.sin(ang) * len;
      fx.beam(x, y, tx, ty, w, E.glow, 0.4, E.core);
      fx.beam(x, y, tx, ty, Math.max(3, w * 0.35), E.core, 0.4, E.core);
      fx.glow(x, y, w * 0.9, E.glow, 0.35, 0.8, 0.5);
      const n = Math.max(1, Math.floor(len / 60));
      for (let i = 1; i <= n; i++) {
        const t = i / (n + 1);
        fx.motes(x + (tx - x) * t, y + (ty - y) * t, E, 2, 14, 120);
      }
      fx.flashAt(tx, ty, w * 0.7 + 10, E.core, 0.16);
      fx.sparkle(tx, ty, E.core, Math.round(6 * k), 300, ang, 0.7);
      fx.shake(Math.min(18, 8 * Math.min(k, 1.5)));
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
