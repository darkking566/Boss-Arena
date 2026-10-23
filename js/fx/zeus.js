'use strict';
// 特效庫｜宙斯專屬（zeusjab / sunsetrush / godaxe / stepecho / gavelverdict / gfocroar / kronosfist / adamasfist / olympusquake）：
// 每個招式一組自己的演出——亞光速刺拳、黃昏流星雨、神之斧幻影、宙斯步法殘影、審判之槌、全宇宙之父、時間逆流拳、阿陀磨須星海拳、眾神震盪。
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
(function (G) {
  const BD = G.BD, TAU = Math.PI * 2, V = BD.vrng;

  // 沿角度 ang 從 (x,y) 前進 d、側移 l 的點
  const along = (x, y, ang, d, l) => [x + Math.cos(ang) * d - Math.sin(ang) * (l || 0), y + Math.sin(ang) * d + Math.cos(ang) * (l || 0)];

  BD.defineEffect('zeusjab', {
    name: '亞光速刺拳', category: '突刺',
    desc: '亞光速的一拳：拳路兩側的速度線由遠處向拳心收束，三道拳影依序在拳路上閃現，白熱光束貫穿到底、拳鋒爆出音爆環與火花；scale ≥ 1.2 的重拳再加震環與「亞光速」字樣。適合宙斯的刺拳與連打開頭。',
    params: { len: 200, width: 70 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), ang = o.angle || 0, len = o.len || 200, w = o.width || 70, sc = o.scale || 1;
      const [tx, ty] = along(x, y, ang, len, 0);
      fx.flash(E.core, 0.1 + 0.04 * sc);
      for (let i = 0; i < 10; i++) { // 速度線：從拳後方遠處收束到拳心
        const l = (V() - 0.5) * w * 2.4, [sx, sy] = along(x, y, ang, -len * 0.55, l), [ex, ey] = along(x, y, ang, len * 0.2, l * 0.2);
        fx.streak(sx, sy, ex, ey, 2 + V() * 1.5, E.glow, 0.16, true);
      }
      for (let j = 0; j < 3; j++) fx.after(j * 0.035, () => { // 三道拳影依序閃現
        const [px, py] = along(x, y, ang, len * (0.45 + 0.2 * j), 0);
        fx.ring(px, py, 6, 24 * k + 8, 0.14, E.glow, 2.5);
      });
      fx.beam(x, y, tx, ty, Math.max(2, w * 0.1 * k), '#ffffff', 0.12, '#ffffff');
      fx.beam(x, y, tx, ty, w * 0.4 * k, E.glow, 0.18, E.core);
      fx.shock(tx, ty, 4, w * 1.4 + 20, 0.22, E.glow, 4, E.core);
      fx.sparkle(tx, ty, E.core, fx.budget(Math.round(10 * k)), 360, ang, 0.9);
      if (sc >= 1.2) { fx.text(tx, ty - 30, '亞光速', E.core, 22); fx.punch(0.02, tx, ty); }
      fx.shake(Math.min(8, 3 * k), ang);
    },
  });

  BD.defineEffect('sunsetrush', {
    name: '黃昏流星拳', category: '突刺',
    desc: '黃昏的流星雨：每一拳都是一顆從天而降、拖著橘金尾焰的流星，砸進拳路上的落點炸出小火星；scale ≥ 1.2 的收尾重拳落下一輪黃昏巨日（暗紅暗幕、放射光芒、橘色震波），並浮出「黃昏」。適合宙斯的流星拳連打與收尾。',
    params: { len: 245, width: 120 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), ang = o.angle || 0, len = o.len || 245, w = o.width || 120, sc = o.scale || 1, big = sc >= 1.2;
      const l = (V() - 0.5) * w * 0.9, [ex, ey] = along(x, y, ang, len * (0.6 + 0.35 * V()), l);
      const sx = ex + (V() - 0.3) * 50, sy = ey - (110 + V() * 70) * (big ? 1.6 : 1); // 流星從天上斜落
      fx.streak(sx, sy, ex, ey, big ? 9 : 3, '#ffb347', big ? 0.3 : 0.14, true);
      fx.streak(sx, sy, ex, ey, big ? 16 : 6, '#ff6a2a', big ? 0.32 : 0.16, true);
      fx.flashAt(ex, ey, big ? 60 : 12 + 6 * k, '#ffd27a', big ? 0.2 : 0.09);
      fx.ring(ex, ey, 3, big ? 60 : 18, big ? 0.3 : 0.14, '#ff8a3a', big ? 5 : 2);
      fx.sparkle(ex, ey, '#ffe0a0', fx.budget(big ? 12 : 3), big ? 400 : 220, -Math.PI / 2, 1.4);
      if (!big) return;
      fx.veil(0.35, 0.35, '#3a0a00');
      fx.glow(ex, ey, w * 1.1, '#ff7a2a', 0.5, 0.85, 0.3); // 黃昏巨日
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, [px, py] = along(ex, ey, a, 90, 0); fx.streak(ex, ey, px, py, 3, '#ffd27a', 0.3, true); } // 放射光芒
      fx.shock(ex, ey, 10, w * 1.3, 0.4, '#ff8a3a', 7, '#ffe0a0');
      fx.motes(ex, ey, E, 8, 50, 200); fx.text(ex, ey - 60, '黃昏', '#ffd27a', 30); fx.punch(0.03, ex, ey); fx.shake(11, ang);
    },
  });

  BD.defineEffect('godaxe', {
    name: '神之斧幻影', category: '斬擊',
    desc: '宙斯腿後的巨斧幻影：場地一暗，三道漆黑的斧影依序掃過扇面、每道都留下發光的斧刃邊；斧刃掃過的軌跡沿途裂地，一道白線把對手一分為二，血霧般的紅煙從斬口升起。適合神之斧這類大弧斬。',
    params: { arc: 3.6 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), ang = o.angle || 0, arc = o.arc || 3.6, r = o.radius || 230;
      fx.veil(0.4, 0.45, '#000000');
      for (let i = 0; i < 3; i++) fx.after(i * 0.07, () => { // 三道斧影依序掃過
        const a = ang + (i - 1) * 0.08;
        fx.slash(x, y, a, arc, r * (0.72 + 0.1 * i), '#16100e', r * 0.42, 0.36, { core: null, trail: 3, rim: E.glow });
        fx.slash(x, y, a, arc, r * (0.95 + 0.04 * i), E.glow, 10 * Math.min(1.6, k), 0.34, { core: E.core, trail: 3 });
      });
      const ea = ang + arc / 2, ex = x + Math.cos(ea) * r, ey = y + Math.sin(ea) * r;
      fx.beam(x, y, ex, ey, 3, '#ffffff', 0.22, '#ffffff'); // 一分為二的白線
      for (let i = 0; i < 8; i++) { // 斧刃沿途裂地
        const a = ang - arc / 2 + arc * (i + 0.5) / 8, px = x + Math.cos(a) * r * 0.9, py = y + Math.sin(a) * r * 0.9;
        fx.after(0.12 + i * 0.02, () => fx.crack(px, py, r * 0.22, E.decal, 6, E.crack, 3));
      }
      fx.after(0.2, () => { fx.smoke(ex, ey, E.smoke, 5, r * 0.3); fx.debris(ex, ey, E.debris, Math.round(8 * k), 260, 4 + k, r * 0.1); fx.flashAt(ex, ey, r * 0.3, E.core, 0.14); });
      fx.text(x + Math.cos(ang) * r * 0.5, y + Math.sin(ang) * r * 0.5 - 20, '神斧', E.core, 24);
      fx.shake(Math.min(20, 9 * k), ang);
    },
  });

  BD.defineEffect('stepecho', {
    name: '宙斯步法殘影', category: '位移',
    desc: '加速到幾乎看不見的步法：施放者周圍浮起一圈殘影光點，殘影沿圓圈依序亮起，之後從背後踢出一道弧形殘痕，踢擊點炸出白光與星火。適合繞圈、拖著殘影的背後踢擊。',
    params: { radius: 160 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), ang = o.angle || 0, r = o.radius || 160, src = o.src || null;
      fx.ghost(src, 0.35, E.glow); fx.ghost(src, 0.22, E.core);
      for (let i = 0; i < 8; i++) { // 殘影環：依序亮起
        const a = i / 8 * TAU, [px, py] = along(x, y, a, r * 0.8, 0);
        fx.after(i * 0.03, () => { fx.glow(px, py, 6 + 3 * k, E.glow, 0.28, 0.75, 0.2); fx.streak(x, y, px, py, 1.5, E.core, 0.18, true); });
      }
      fx.slash(x, y, ang, 1.9, r * 0.95, E.core, 12 * Math.min(1.5, k), 0.2, { core: '#ffffff', trail: 3 });
      fx.slash(x, y, ang - 0.25, 1.6, r * 0.8, E.glow, 6, 0.26, { core: null, trail: 2 });
      fx.after(0.08, () => { fx.shock(x, y, 6, r * 0.9, 0.3, E.glow, 4, E.core); fx.sparkle(x, y, E.core, fx.budget(8), 300, ang, 1.2); });
      fx.motes(x, y, E, Math.round(6 * k), r * 0.5, 140);
      fx.shake(Math.min(12, 6 * k), ang);
    },
  });

  BD.defineEffect('gavelverdict', {
    name: '審判之槌', category: '砸地',
    desc: '眾神會議的一槌定音：整個場地泛黃暗下，木槌從天而降咚地敲下，金色審判環一層層向外擴開、地面放射裂紋，木屑與金光四濺並浮出「審判」。適合大範圍的木槌砸擊與宣判類的範圍攻擊。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), r = o.radius || 120;
      fx.veil(0.25, 0.35, '#2a1a00');
      fx.streak(x, y - r * 1.4, x, y - 6, Math.max(6, r * 0.12), '#8a5a2a', 0.12, false); // 木槌落下的拖影
      fx.after(0.12, () => {
        fx.flashAt(x, y, r * 0.6, '#fff4c8', 0.14);
        fx.shock(x, y, 6, r * 1.6, 0.45, '#ffd36a', 8 * Math.min(1.4, k), '#ffffff');
        fx.ring(x, y, 10, r * 1.1, 0.4, E.glow, 6);
        fx.ring(x, y, 6, r * 1.5, 0.5, '#ffe9a0', 3);
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + V() * 0.4, px = x + Math.cos(a) * r * 0.5, py = y + Math.sin(a) * r * 0.5; fx.crack(px, py, r * 0.6, E.decal, 7, E.crack, 4); }
        fx.debris(x, y, '#a0683a', Math.round(10 * k), 240, 3 + k, r * 0.25);
        fx.sparkle(x, y, '#ffe27a', fx.budget(12), 280, -Math.PI / 2, 1.2);
        fx.text(x, y - r * 0.7, '審判', '#ffe27a', 30);
        fx.punch(0.025, x, y); fx.shake(Math.min(16, 9 * k), Math.PI / 2);
      });
    },
  });

  BD.defineEffect('gfocroar', {
    name: '全宇宙之父', category: '增益',
    desc: '「GFOC」的神威宣告：金色光芒從施放者放射出十六道光線，三圈光環依序向外推開，頭頂炸出「GFOC」，周圍的光點如神威般飛散，施放者身上的殘影一圈圈膨脹。半血後以星海色調施放時自動換成紫黑神威。適合全宇宙之父這類的自我強化與威壓宣告。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), r = o.radius || 60, src = o.src || null;
      fx.flash(E.glow, 0.25); fx.grade(E.glow, 0.35, 0.5);
      for (let i = 0; i < 16; i++) { // 放射光線
        const a = i / 16 * TAU, [px, py] = along(x, y, a, r * 1.8, 0), [qx, qy] = along(x, y, a, r * 0.3, 0);
        fx.streak(qx, qy, px, py, 3, E.glow, 0.5, true);
      }
      for (let j = 0; j < 3; j++) fx.after(j * 0.08, () => fx.ring(x, y, r * 0.2, r * (1.0 + 0.35 * j), 0.5, E.glow, 6 - j * 1.5));
      fx.glow(x, y, r * 0.8, E.core, 0.45, 0.9, 0.6, src);
      fx.ghost(src, 0.5, E.glow);
      fx.after(0.1, () => fx.ghost(src, 0.42, E.core));
      fx.after(0.2, () => fx.ghost(src, 0.34, E.glow));
      fx.sparkle(x, y, E.core, fx.budget(Math.round(14 * Math.min(1.5, k))), 340);
      fx.motes(x, y, E, 8, r * 1.6, 120);
      fx.text(x, y - r - 30, 'GFOC', E.core, 34); fx.punch(0.03, x, y);
      fx.shake(Math.min(9, 4 * k));
    },
  });

  BD.defineEffect('kronosfist', {
    name: '時間逆流拳', category: '大招',
    desc: '超越時間之拳的逆流：拳路上的殘影由終點往施放者倒著亮起（時間倒流），接著一道白熱光束貫穿直線、沿途地裂，終點爆出時鐘震環與閃光並浮出「時間」。適合直線、極速、時間系的重拳（dash 的 fx）。',
    params: { len: 500, width: 90 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), ang = o.angle || 0, len = o.len || 500, w = o.width || 90, sc = o.scale || 1, N = 8;
      const [ex, ey] = along(x, y, ang, len, 0);
      fx.veil(0.4, 0.35, '#000000');
      for (let i = N - 1; i >= 0; i--) { // 倒流：由終點往回亮起
        const [px, py] = along(x, y, ang, len * i / N, 0);
        fx.after((N - 1 - i) * 0.014, () => { fx.glow(px, py, w * 0.35, E.glow, 0.2, 0.8, 0.2); fx.ring(px, py, 4, w * 0.5, 0.18, E.core, 2); });
      }
      fx.beam(x, y, ex, ey, Math.max(2, w * 0.14 * k), '#ffffff', 0.13, '#ffffff');
      fx.beam(x, y, ex, ey, w * 0.45 * k, E.glow, 0.2, E.core);
      for (let i = 1; i < 6; i++) { const [px, py] = along(x, y, ang, len * i / 6, (i % 2 ? 1 : -1) * w * 0.4); fx.after(0.05 + i * 0.012, () => fx.crack(px, py, w * 0.5, E.decal, 6, E.crack, 3)); }
      fx.after(0.13, () => {
        fx.shock(ex, ey, 10, w * 2.4 + 60 * sc, 0.45, E.glow, 8 * Math.min(1.4, k), E.core);
        fx.ring(ex, ey, 12, w * 1.6, 0.3, E.core, 3);
        fx.flashAt(ex, ey, w * 1.1, E.core, 0.18);
        fx.debris(ex, ey, E.debris, Math.round(9 * k), 280, 3 + k, w * 0.3);
        fx.sparkle(ex, ey, E.core, fx.budget(Math.round(12 * k)), 360, ang, 1.1);
        fx.text(ex, ey - 40, '時間', E.core, 24 + 4 * (sc - 1));
        fx.punch(0.025 * Math.min(1.5, sc), ex, ey);
      });
      fx.shake(Math.min(16, 8 * k), ang);
    },
  });

  BD.defineEffect('adamasfist', {
    name: '阿陀磨須星海拳', category: '突刺',
    desc: '阿陀磨須傾注全部神力的星海拳：暗紫的星空暗幕籠罩場地，拳路上撒滿星點，粗大的紫光束由拳鋒貫出，拳鋒爆出一圈圈星海震環與向外射出的星芒光線；重拳（scale ≥ 1.5）再浮出「真・神之右」。適合阿陀磨須形態的連打與終結重拳。',
    params: { len: 290, width: 120 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), ang = o.angle || 0, len = o.len || 290, w = o.width || 120, sc = o.scale || 1, big = sc >= 1.5;
      const [ex, ey] = along(x, y, ang, len, 0);
      fx.veil(0.3, 0.4, '#1a0636');
      for (let i = 0; i < fx.budget(16); i++) { // 星點散落在拳路上
        const d = len * V(), l = (V() - 0.5) * w * 1.6, [px, py] = along(x, y, ang, d, l);
        fx.streak(px, py, px + 2, py + 2, 2, '#ffffff', 0.25, true);
      }
      fx.beam(x, y, ex, ey, w * 0.35 * k, E.glow, 0.22, E.core);
      fx.beam(x, y, ex, ey, Math.max(2, w * 0.1 * k), '#ffffff', 0.14, '#ffffff');
      fx.after(0.05, () => {
        fx.shock(ex, ey, 8, w * 1.6, 0.4, E.glow, 6, E.core);
        fx.ring(ex, ey, 10, w * 1.1, 0.35, E.glow, 4);
        for (let i = 0; i < 12; i++) { const a = ang + (i / 12 - 0.5) * 2.6, [px, py] = along(ex, ey, a, 90 * k, 0); fx.streak(ex, ey, px, py, 2.5, E.core, 0.26, true); }
        fx.motes(ex, ey, E, Math.round(6 * k), 60, 180);
        fx.flashAt(ex, ey, big ? 90 : 40, E.core, 0.14);
        if (big) { fx.text(ex, ey - 40, '真・神之右', E.core, 26); fx.punch(0.035, ex, ey); fx.shake(14, ang); }
      });
    },
  });

  BD.defineEffect('olympusquake', {
    name: '眾神震盪', category: '砸地',
    desc: '眾神之王的終結砸地：金色（或星海）的巨大震環連續擴散三層，地面向外龜裂，四方爆出光柱與碎石，中心一片強光，鏡頭猛烈震動。大招的最後一擊專用，el 可換成星海色成為宇宙崩裂。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), r = o.radius || 120;
      fx.flash(E.core, 0.45); fx.grade(E.glow, 0.5, 0.6);
      fx.shock(x, y, 8, r * 2.2, 0.5, E.glow, 10 * Math.min(1.5, k), E.core);
      for (let j = 0; j < 3; j++) fx.after(j * 0.1, () => fx.ring(x, y, r * (0.2 + 0.2 * j), r * (1.6 + 0.5 * j), 0.45, E.glow, 7 - j * 1.5));
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; fx.crack(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 1.1, E.decal, 9, E.crack, 5); }
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.26; const [px, py] = along(x, y, a, r * 1.2, 0); fx.pillar(px, py, 18, E.glow, 0.5); }
      fx.debris(x, y, E.debris, Math.round(14 * k), 300, 4 + k, r * 0.4);
      fx.glow(x, y, r * 0.7, E.core, 0.5, 0.9, 0.5);
      fx.text(x, y - r, '眾神', E.core, 30);
      fx.punch(0.04, x, y); fx.shake(Math.min(24, 14 * k), Math.PI / 2);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
