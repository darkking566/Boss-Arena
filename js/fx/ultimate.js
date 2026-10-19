'use strict';
// 特效庫｜大招（ultcast / domain / zerocast / absolutezero / nightfall / threadcut / skyrend / timefist / finale）：大招蓄勢、領域爆發、夜幕、懸斬、天喰巨劈與擊倒終結
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
// o：E 元素主題、color 覆寫、radius 半徑、k 綜合倍率、src 施放者（可為 null）、pts 預先算好的點陣
(function (G) {
  const BD = G.BD;

  BD.defineEffect('ultcast', {
    name: '大招發動', category: '大招',
    desc: '施放大招的起手：全屏一閃、畫面輕震、巨大蓄力光向中心收束、反向震波收攏，大量微粒上升。適合必殺技詠唱。',
    params: { life: 1.0 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, src = o.src || null;
      const r = src && src.r ? src.r : o.radius || 60;
      fx.flash(o.color || E.glow, 0.35);
      fx.shake(Math.min(12, 6 * Math.min(k, 1.6)));
      fx.charge(x, y, r * 3, E.glow, o.life || 1.0, src, Math.round(20 * Math.min(2, k)));
      fx.shock(x, y, r * 4, r, 0.5, E.glow, 10 * Math.min(1.5, k), E.core);
      fx.sparkle(x, y, E.core, Math.round(18 * k), 260, -Math.PI / 2, 1.2);
      for (let i = 0; i < 30; i++) {
        const a = BD.vrng() * Math.PI * 2, d = r * (0.6 + BD.vrng() * 1.8);
        fx.motes(x + Math.cos(a) * d, y + Math.sin(a) * d, E, 1, 8, 70);
      }
      fx.glow(x, y, r * 1.5, E.glow, 1.0, 0.4, 0.3, src);
    },
  });

  BD.defineEffect('domain', {
    name: '領域爆發', category: '大招',
    desc: '領域展開的爆發：全屏核心色閃光、強烈震動，預先算好的場上各點接連爆出火花與微粒，外圍光環與淡震波同時擴散。適合凍結全場、結界覆蓋。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      const pts = o.pts || [];
      fx.flash(E.core, 0.6);
      fx.shake(Math.min(26, 16 * Math.min(k, 1.4)));
      for (let i = 0; i + 1 < pts.length; i += 2) {
        fx.sparks(pts[i], pts[i + 1], E.core, 2, 120);
        fx.motes(pts[i], pts[i + 1], E, 1, 8, 50);
      }
      const r = o.radius || 200;
      fx.ring(x, y, r, r + 40, 0.6, E.glow, 6 * Math.min(1.4, k));
      fx.shock(x, y, 10, r * 1.6, 0.8, E.glow, 6, E.core);
      fx.glow(x, y, r * 0.9, E.glow, 0.8, 0.4, 0.5);
    },
  });

  BD.defineEffect('zerocast', {
    name: '絕對零度蓄勢', category: '大招',
    desc: '全場冰封的預兆：畫面漸暗泛藍，安全圈亮起燈塔般的冷光並不斷有光環向圈心收束，場上飄起雪光、地面陸續裂出霜紋，施放者周身一圈圈寒氣外擴。位置為安全圈圓心，life 為預警時長。',
    params: { life: 2.6, radius: 115 },
    spawn(fx, x, y, o) {
      const E = o.E, life = o.life || 2.6, r = o.radius || 115, src = o.src || null, A = BD.ARENA;
      fx.veil(life, 0.42, '#041a33');
      fx.glow(x, y, r * 1.4, E.glow, life, 0.55, 0);
      for (let t = 0; t < life; t += 0.2) fx.after(t, () => {
        fx.ring(x, y, r * 3.2, r, 0.55, E.glow, 3);
        for (let i = 0; i < 6; i++) fx.sparkle(BD.vrng() * A.w, BD.vrng() * A.h, '#ffffff', 1, 40, -Math.PI / 2, 1);
        fx.motes(x, y, E, 2, r, 60);
      });
      for (let t = 0.3; t < life; t += 0.5) fx.after(t, () => fx.crack(BD.vrng() * A.w, BD.vrng() * A.h, 70 + BD.vrng() * 60, E.decal, 6, E.crack, 3));
      if (src) for (let t = 0; t < life - 0.4; t += 0.7) fx.after(t, () => { fx.ring(src.x, src.y, src.r, src.r * 4.5, 0.7, E.glow, 4); fx.motes(src.x, src.y, E, 4, src.r * 2, 90); });
      fx.after(life - 0.15, () => fx.flash(E.glow, 0.2));
    },
  });

  BD.defineEffect('absolutezero', {
    name: '絕對零度', category: '大招',
    desc: '全場瞬間凍結的爆發：全屏白光與強震、自安全圈向四面八方射出冰晶光束、兩道巨大冰環橫掃全場，預先算好的各點接連爆出霜晶與霜紋，餘波的雪光緩緩飄落。位置為安全圈圓心。',
    params: { radius: 115 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, pts = o.pts || [], r = o.radius || 115;
      fx.flash('#ffffff', 0.85);
      fx.shake(Math.min(30, 20 * Math.min(k, 1.5)));
      fx.veil(0.9, 0.3, '#7fd8ff');
      fx.shock(x, y, 10, 1500, 0.9, E.glow, 10, E.core);
      fx.ring(x, y, r, 1800, 1.0, E.glow, 12);
      fx.after(0.18, () => fx.ring(x, y, r, 1800, 1.0, '#ffffff', 5));
      fx.glow(x, y, r * 1.6, E.glow, 0.9, 0.8, 0.4);
      const n = 14, a0 = BD.vrng() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = a0 + i * Math.PI * 2 / n, len = 800 + BD.vrng() * 500;
        fx.beam(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, 14 + BD.vrng() * 10, E.glow, 0.55, E.core);
      }
      for (let i = 0; i + 1 < pts.length; i += 2) {
        const px = pts[i], py = pts[i + 1], d = Math.hypot(px - x, py - y) / 1800;
        fx.after(d * 0.5, () => {
          fx.sparkle(px, py, E.core, 3, 320);
          fx.sparks(px, py, E.core, 2, 160);
          fx.motes(px, py, E, 2, 14, 70);
          if (i % 4 === 0) fx.crack(px, py, 60 + BD.vrng() * 50, E.decal, 9, E.crack, 3);
        });
      }
      for (let t = 0.3; t < 1.8; t += 0.15) fx.after(t, () => { for (let j = 0; j < 8; j++) fx.sparkle(BD.vrng() * BD.ARENA.w, BD.vrng() * BD.ARENA.h, '#ffffff', 1, 50, Math.PI / 2, 1); });
    },
  });

  BD.defineEffect('nightfall', {
    name: '夜幕', category: '大招',
    desc: '遁入黑暗：身影化為大團暗影散去，整個場地被暗幕籠罩 life 秒，只剩角色與預警線在黑暗中發亮。適合潛伏型大招、暗殺、百鬼夜行。',
    params: { life: 2.5 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      fx.veil(o.life, 0.72, '#04020a');
      fx.smoke(x, y, E.smoke, 20, 40 * Math.min(1.5, k));
      fx.ring(x, y, 70, 4, 0.4, E.glow, 4);
      fx.motes(x, y, E, Math.round(16 * k), 30, 120);
    },
  });

  BD.defineEffect('threadcut', {
    name: '懸斬', category: '大招',
    desc: '斬下卻不立即裂開的刀痕：一條細白刀線懸在空中，hold 秒後才猛然裂開成白熱光束、兩側噴出火花並全屏一閃。多道刀痕同時到期就會「一齊裂開」。適合連續斬擊最後一起爆發的大招。',
    params: { len: 400, width: 40, hold: 0.6 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, len = o.len || 400, ang = o.angle || 0, hold = Math.max(0, o.hold || 0);
      const tx = x + Math.cos(ang) * len, ty = y + Math.sin(ang) * len;
      fx.sparkle((x + tx) / 2, (y + ty) / 2, '#ffffff', 4, 160, ang + Math.PI / 2, 0.6);
      for (let t = 0; t < hold; t += 0.1) fx.after(t, () => fx.beam(x, y, tx, ty, 2.5, '#ffffff', 0.14));
      fx.after(hold, () => {
        fx.beam(x, y, tx, ty, (o.width || 40) * 0.7 * Math.min(1.6, k), E.glow, 0.4, E.core);
        fx.beam(x, y, tx, ty, 6, '#ffffff', 0.3, E.core);
        const n = Math.max(3, Math.round(len / 50));
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n, px = x + (tx - x) * t, py = y + (ty - y) * t;
          fx.sparkle(px, py, E.core, 1, 300, ang + (i % 2 ? 1 : -1) * Math.PI / 2, 0.5);
          if (i % 2) fx.motes(px, py, E, 1, 8, 80);
        }
        fx.flash(E.core, 0.18);
        fx.shake(Math.min(10, 3 * k));
      });
    },
  });

  BD.defineEffect('skyrend', {
    name: '天喰', category: '大招',
    desc: '撕裂戰場的終極巨劈：沿整條直線劈出巨大的元素刃光與白熱芯、全屏一閃，地面沿線裂開發光、兩側噴出火花與碎石；0.25 秒後整條裂口再噴出元素煙霧與二次刃光。適合長直線大招、斬斷戰場的巨刃。',
    params: { len: 600, width: 120 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, len = o.len || 600, w = o.width || 120, ang = o.angle || 0;
      const tx = x + Math.cos(ang) * len, ty = y + Math.sin(ang) * len;
      fx.beam(x, y, tx, ty, w * 0.9, E.glow, 0.5, E.core);
      fx.beam(x, y, tx, ty, w * 0.25, '#ffffff', 0.4, E.core);
      fx.flash(E.glow, 0.4);
      fx.shake(Math.min(24, 14 * Math.min(k, 1.6)), ang + Math.PI / 2);
      const n = Math.max(3, Math.round(len / 90));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, px = x + (tx - x) * t, py = y + (ty - y) * t;
        fx.crack(px, py, w * 0.55, E.decal, 9, E.crack, 3);
        fx.sparkle(px, py, E.core, 3, 380, ang + (i % 2 ? 1 : -1) * Math.PI / 2, 0.5);
        if (i % 2) fx.debris(px, py, E.debris || E.particle, 2, 260, 4, w * 0.2);
      }
      fx.after(0.25, () => {
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n, px = x + (tx - x) * t, py = y + (ty - y) * t;
          fx.smoke(px, py, E.smoke, 3, w * 0.3);
          fx.motes(px, py, E, 3, w * 0.3, 160);
        }
        fx.beam(x, y, tx, ty, w * 0.5, E.glow, 0.3, E.core);
        fx.shake(8, ang + Math.PI / 2);
      });
    },
  });

  BD.defineEffect('timefist', {
    name: '超越時間之拳', category: '大招',
    desc: '快到時間停下的一拳：先是整個場地暗下、光環收束、全屏一閃，彷彿時間凍結；0.12 秒後沿整條直線同時炸出白熱光束與連鎖震波，地面沿線留下發光裂痕，終點爆開巨大衝擊。適合極速直線強襲、時間靜止系的終結一擊。',
    params: { len: 500, width: 90 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, len = o.len || 500, w = o.width || 90, ang = o.angle || 0;
      const tx = x + Math.cos(ang) * len, ty = y + Math.sin(ang) * len;
      fx.veil(0.8, 0.8, '#000000');
      fx.flash('#ffffff', 0.35);
      fx.ring(x, y, 160, 20, 0.16, '#ffffff', 5);
      fx.after(0.12, () => {
        fx.beam(x, y, tx, ty, w, E.glow, 0.45, E.core);
        fx.beam(x, y, tx, ty, w * 0.25, '#ffffff', 0.55, E.core);
        fx.flash('#ffffff', 0.5);
        const n = Math.max(4, Math.round(len / 80));
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n, px = x + (tx - x) * t, py = y + (ty - y) * t;
          fx.after(i * 0.012, () => {
            fx.shock(px, py, 8, w * 0.9, 0.35, E.glow, 4, E.core);
            fx.crack(px, py, w * 0.5, E.decal, 8, E.crack, 3);
            fx.sparkle(px, py, E.core, 2, 360, ang + (i % 2 ? 1 : -1) * Math.PI / 2, 0.6);
          });
        }
        fx.after(0.1, () => {
          fx.shock(tx, ty, 10, w * 2.2 * Math.min(1.4, k), 0.5, E.glow, 8, E.core);
          fx.flashAt(tx, ty, w * 1.6, '#ffffff', 0.25);
          fx.debris(tx, ty, E.debris || E.particle, 8, 320, 5, w * 0.4);
          fx.motes(tx, ty, E, 8, w, 220);
          fx.shake(22, ang);
        });
      });
    },
  });

  BD.defineEffect('finale', {
    name: '終結', category: '大招',
    desc: 'Boss 被擊倒的終結演出：全屏白光、強烈震動、巨大光環盪開、海量火花與碎塊、光暈與微粒緩緩飄散。適合擊殺收尾。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, src = o.src || null;
      const r = src && src.r ? src.r : o.radius || 80;
      fx.flash('#fff', 0.6);
      fx.shake(Math.min(26, 22 * Math.min(k, 1.3)));
      fx.ring(x, y, 10, 260, 1.0, E.glow, 8 * Math.min(1.4, k));
      fx.sparks(x, y, E.core, 60, 520);
      fx.debris(x, y, E.debris, 20, 340, 5, r * 0.4);
      fx.glow(x, y, r * 2.5, E.glow, 1.2, 0.8, 0.5, src);
      for (let i = 0; i < 30; i++) {
        const a = BD.vrng() * Math.PI * 2, d = BD.vrng() * r;
        fx.motes(x + Math.cos(a) * d, y + Math.sin(a) * d, E, 1, 10, 80);
      }
      fx.sparkle(x, y, E.core, Math.round(24 * k), 420);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
