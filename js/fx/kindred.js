'use strict';
// 特效庫｜鏡爪專屬（lambdash / lambvolley / lambshot / lambleap / lambmark / lambmarkbloom / lambsanctum / lambrain /
// wolfpounce / wolfbite / wolfmaw / wolfcharge / wolfawaken / lambfinale）：神羊的銀弓、符印與聖域；魔狼的獵場、獠牙與衝殺。
// 魔狼本體是召喚物（js/engine/minions/kindred.js，造型在 js/render/styles/kindred.js），這裡只負責爪痕、咬合與光效。只呼叫 fx 原件；亂數只用 BD.vrng；不觸碰 DOM。
(function (G) {
  const BD = G.BD, TAU = Math.PI * 2, V = BD.vrng;
  const SILVER = '#eef7ff', ICE = '#8fe3ff', DARK = '#141826', BLOOD = '#d0102a';

  // 沿角度 ang 從 (x,y) 前進 d、側移 l 的點
  const along = (x, y, ang, d, l) => [x + Math.cos(ang) * d - Math.sin(ang) * (l || 0), y + Math.sin(ang) * d + Math.cos(ang) * (l || 0)];
  // 三道平行爪痕（中心 (x,y)、沿 ang 劃過、長 len）
  function claws(fx, x, y, ang, len, color, width, life, rim) {
    for (let i = -1; i <= 1; i++) {
      const [sx, sy] = along(x, y, ang, -len / 2, i * width * 2.2), [ex, ey] = along(x, y, ang, len / 2, i * width * 2.2 + V() * 4);
      fx.streak(sx, sy, ex, ey, width, color, life, true);
      if (rim) fx.streak(sx, sy, ex, ey, width * 2.2, rim, life * 0.8, true);
    }
  }

  BD.defineEffect('lambdash', {
    name: '神羊翻滾', category: '突刺',
    desc: '神羊側身翻滾：身後拖出一道銀藍的風痕與兩條殘影線，落地處炸出一圈銀光與星屑。適合鏡爪「舞動箭矢」的翻滾段（el 換成 blood 即血色風痕）。',
    params: { len: 220 },
    spawn(fx, x, y, o) {
      const E = o.E, ang = o.angle || 0, len = o.len || 220, [tx, ty] = along(x, y, ang, len, 0);
      fx.ghost(o.src || null, 0.3, E.glow);
      for (let i = -1; i <= 1; i += 2) { const [sx, sy] = along(x, y, ang, -10, i * 10), [ex, ey] = along(x, y, ang, len * 0.9, i * 14); fx.streak(sx, sy, ex, ey, 1.6, SILVER, 0.24, true); }
      fx.beam(x, y, tx, ty, 3, E.glow, 0.2, SILVER);
      fx.ring(tx, ty, 4, 36, 0.3, SILVER, 2);
      fx.sparkle(tx, ty, SILVER, fx.budget(10), 240, ang, 0.9);
    },
  });

  BD.defineEffect('lambvolley', {
    name: '銀弓連射', category: '突刺',
    desc: '神羊的銀箭扇形射出：弓弦處炸開一道新月形光弧，每支箭拉出一道銀白光尾，箭尖掠過的地方落下細碎的銀羽。適合鏡爪的舞動箭矢與躍步放箭（el 換成 blood 即血色箭羽）。',
    params: { n: 3, spread: 0.22 },
    spawn(fx, x, y, o) {
      const E = o.E, ang = o.angle || 0, n = o.n || 3, spread = o.spread || 0.22;
      fx.slash(x, y, ang, 1.4, 46, SILVER, 5, 0.22, { core: '#ffffff', trail: 2, rim: E.glow }); // 弓弦的新月光
      fx.glow(x, y, 30, E.glow, 0.18, 0.9);
      for (let i = 0; i < n; i++) {
        const a = ang + (i - (n - 1) / 2) * spread, [ex, ey] = along(x, y, a, 170, 0);
        fx.streak(x, y, ex, ey, 2.4, SILVER, 0.2, true);
        fx.streak(x, y, ex, ey, 6, E.glow, 0.14, true);
        fx.after(0.05 + i * 0.03, () => fx.sparkle(ex, ey, E.glow, fx.budget(3), 160, a, 0.6));
      }
    },
  });

  BD.defineEffect('lambshot', {
    name: '恐懼之箭', category: '突刺',
    desc: '一支念過咒的銀箭：一道筆直的白熱光線，尾端拖著藍色符印殘影，沿線一圈圈細環掠過，起點亮起銀色符印。適合鏡爪「恐懼蔓延」的緩速箭與魔狼狂熱的掩護射擊。',
    params: { len: 180 },
    spawn(fx, x, y, o) {
      const E = o.E, ang = o.angle || 0, len = o.len || 180, [tx, ty] = along(x, y, ang, len, 0);
      fx.beam(x, y, tx, ty, 2.5, SILVER, 0.14, E.glow);
      fx.streak(x, y, tx, ty, 5, ICE, 0.22, true);
      fx.ring(x, y, 6, 22, 0.22, SILVER, 2);
      for (let i = 1; i <= 3; i++) { const [rx, ry] = along(x, y, ang, len * i / 4, 0); fx.after(i * 0.03, () => fx.ring(rx, ry, 2, 9, 0.18, ICE, 1.5)); }
    },
  });

  BD.defineEffect('lambleap', {
    name: '神羊躍步', category: '突刺',
    desc: '神羊往後一躍：起跳處留下一圈羊毛般的白色絨光與銀羽，空中劃出一道弧形的銀色軌跡，落點亮起一圈冷藍光環。適合鏡爪「神羊躍步」的後躍（blink fx）。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, tx = o.toX == null ? x : o.toX, ty = o.toY == null ? y : o.toY, ang = Math.atan2(ty - y, tx - x), d = Math.hypot(tx - x, ty - y);
      fx.ring(x, y, 6, 44, 0.32, SILVER, 3);
      fx.sparkle(x, y, '#ffffff', fx.budget(14), 200, 0, TAU);
      const [mx, my] = along(x, y, ang, d / 2, d * 0.25);
      fx.streak(x, y, mx, my, 3, SILVER, 0.3, true); fx.streak(mx, my, tx, ty, 3, SILVER, 0.3, true);
      fx.after(0.12, () => { fx.ring(tx, ty, 4, 40, 0.3, E.glow, 2.5); fx.glow(tx, ty, 26, ICE, 0.2, 0.8); });
    },
  });

  BD.defineEffect('lambmark', {
    name: '鏡爪符印', category: '大招',
    desc: '神羊的銀色符印落在目標腳下：外圈旋轉的符文環、內圈慢慢收縮的銀光，每隔四分之一預警時間脈動一次，六顆符點環繞。適合鏡爪印記與大招的預警（teleFx）。',
    params: { radius: 60 },
    spawn(fx, x, y, o) {
      const r = o.radius || 60, life = o.life || 0.9;
      fx.ring(x, y, r * 0.2, r, life, SILVER, 2);
      fx.ring(x, y, r * 0.55, r * 0.7, life, ICE, 1.5);
      fx.glow(x, y, r * 0.5, ICE, life, 0.45, 0.2);
      for (let s = 0; s < 4; s++) fx.after(s * life / 4, () => fx.ring(x, y, r * 0.25, r * (0.9 + V() * 0.2), life / 4, SILVER, 2));
      for (let i = 0; i < 6; i++) { const [px, py] = along(x, y, i * TAU / 6, r * 0.85, 0); fx.glow(px, py, 4, SILVER, life * 0.8, 0.9); }
    },
  });

  BD.defineEffect('lambmarkbloom', {
    name: '符印爆開', category: '爆炸',
    desc: '符印爆開：銀白閃光中升起一道細長的靈魂光柱，冷藍光環向外擴張，星屑般的銀色粉塵飄起。適合鏡爪印記的命中（el 換成 blood 即血色靈魂）。',
    params: { radius: 60 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), r = o.radius || 60;
      fx.glow(x, y, r * 0.9, SILVER, 0.22, 1, 0.35);
      fx.ring(x, y, r * 0.3, r * 1.3, 0.42, SILVER, 3 * k + 1);
      fx.ring(x, y, r * 0.5, r * 1.6, 0.52, E.glow, 2);
      fx.beam(x, y, x, y - 170 * k, 8 * k, ICE, 0.5, SILVER);
      fx.sparkle(x, y, SILVER, fx.budget(18), 260, -Math.PI / 2, Math.PI);
      fx.shake(Math.min(5, 2.5 * k), -Math.PI / 2);
    },
  });

  BD.defineEffect('lambsanctum', {
    name: '神羊聖域', category: '大招',
    desc: '神羊腳下展開 4 秒的銀色聖域：一圈符文環穩穩地鋪在地上、每半秒脈動一次，邊緣升起細長的白色光柱，最後一刻向內收攏、灑下星屑。適合鏡爪「神羊喘息」（status fx）。',
    params: { radius: 200 },
    spawn(fx, x, y, o) {
      const E = o.E, r = o.radius || 200, life = 4;
      fx.glow(x, y, r, SILVER, 0.5, 0.6, 0.3);
      fx.ring(x, y, r * 0.2, r, 0.6, SILVER, 4);
      for (let s = 0; s < 8; s++) fx.after(s * 0.5, () => {
        fx.ring(x, y, r * 0.95, r, 0.55, SILVER, 3);
        fx.ring(x, y, r * 0.5, r * 0.56, 0.55, E.glow, 1.5);
        const a = s * TAU / 8 + V() * 0.3, [px, py] = along(x, y, a, r * 0.92, 0);
        fx.beam(px, py, px, py - 90, 3, ICE, 0.5, SILVER);
      });
      fx.after(life - 0.3, () => { fx.ring(x, y, r, r * 0.1, 0.4, SILVER, 4); fx.sparkle(x, y, '#ffffff', fx.budget(24), 160, -Math.PI / 2, Math.PI); });
    },
  });

  BD.defineEffect('lambrain', {
    name: '銀箭雨', category: '突刺',
    desc: '銀箭從高空落下：每支箭在落點前拉出一道斜斜的銀白光線，落地炸出一圈光環與星屑，像流星般砸進獵場。適合鏡爪的狩獵風暴與大招箭雨（el 換成 blood 即血色箭雨）。',
    params: { radius: 60 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), r = o.radius || 60;
      fx.streak(x - 70, y - 230, x, y, 2.4 * k, SILVER, 0.2, true);
      fx.streak(x - 70, y - 230, x, y, 6 * k, E.glow, 0.14, true);
      fx.after(0.12, () => { fx.ring(x, y, 2, r * 0.9, 0.22, E.glow, 2); fx.glow(x, y, r * 0.4, ICE, 0.18, 0.8); fx.sparkle(x, y, SILVER, fx.budget(5), 180, 0, TAU); });
    },
  });

  BD.defineEffect('wolfpounce', {
    name: '魔狼獵場', category: '突刺',
    desc: '魔狼盯上獵物：目標腳下浮出一圈暗紅的獵場環，三枚爪印依序亮起，環內升起冷藍的霧。適合鏡爪魔狼撲擊前的預警（teleFx）。',
    params: { radius: 70 },
    spawn(fx, x, y, o) {
      const r = o.radius || 70, life = o.life || 0.45;
      fx.ring(x, y, r * 0.75, r, life, BLOOD, 2.5);
      for (let i = 0; i < 3; i++) { const [px, py] = along(x, y, i * 0.9 - 0.9, r * 0.45, 0); fx.after(i * life / 3, () => { fx.glow(px, py, 7, ICE, life * 0.6, 0.95); fx.ring(px, py, 2, 10, life * 0.5, ICE, 1.5); }); }
      fx.glow(x, y, r * 0.6, ICE, life, 0.3, 0.15);
    },
  });

  BD.defineEffect('wolfbite', {
    name: '魔狼噬咬', category: '斬擊',
    desc: '魔狼一口咬下：咬合點上下兩排獠牙光弧猛地合攏，三道冷藍的爪痕斜劃過地面，炸開一團黑霧與銀色毛屑。適合鏡爪魔狼狂熱的連咬與躍步的斷後（el 換成 blood 即血色獠牙）。',
    params: { radius: 110 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), ang = V() * TAU;
      fx.slash(x, y, ang - 0.5, 1.0, 34 * k, SILVER, 4, 0.16, { core: '#ffffff', trail: 1, rim: E.glow });
      fx.slash(x, y, ang + Math.PI - 0.5, 1.0, 34 * k, SILVER, 4, 0.16, { core: '#ffffff', trail: 1, rim: E.glow });
      claws(fx, x, y, ang + 0.8, 90 * k, ICE, 2.2, 0.26, E.glow);
      fx.glow(x, y, 30 * k, DARK, 0.3, 0.8, 0.4);
      fx.sparkle(x, y, SILVER, fx.budget(10), 220, 0, TAU);
      fx.shake(Math.min(5, 2.5 * k), ang);
    },
  });

  BD.defineEffect('wolfmaw', {
    name: '魔狼撲殺', category: '爆炸',
    desc: '魔狼整個撲上去：落點炸開一圈暗色震波與冷光，兩道巨大的獠牙弧從兩側合攏，五道爪痕呈放射狀劃開地面，黑霧與血色碎光四濺。適合鏡爪恐懼蔓延的第三下撲擊與魔狼狂熱的最後一口（el 換成 blood 即血色撲殺）。',
    params: { radius: 80 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), r = o.radius || 80, ang = V() * TAU;
      fx.ring(x, y, r * 0.2, r * 1.4, 0.42, E.glow, 4 * k);
      fx.ring(x, y, r * 0.4, r * 1.1, 0.32, SILVER, 2);
      fx.slash(x, y, ang, 1.5, r * 0.8, SILVER, 6 * k, 0.22, { core: '#ffffff', trail: 2, rim: E.glow });
      fx.slash(x, y, ang + Math.PI, 1.5, r * 0.8, SILVER, 6 * k, 0.22, { core: '#ffffff', trail: 2, rim: E.glow });
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + V() * 0.4, [px, py] = along(x, y, a, r * 0.75, 0); fx.streak(x, y, px, py, 3 * k, ICE, 0.3, true); }
      fx.glow(x, y, r * 0.8, DARK, 0.4, 0.85, 0.5);
      fx.sparkle(x, y, E.core, fx.budget(18), 300, 0, TAU);
      fx.shake(Math.min(8, 4.5 * k), ang);
    },
  });

  BD.defineEffect('wolfcharge', {
    name: '魔狼衝殺', category: '突刺',
    desc: '魔狼沿直線狂奔衝殺：整條路徑被一道暗色的疾風與兩排平行的爪痕撕開，兩側噴出冷光與血色碎屑，終點炸開一圈震波與獠牙光弧。適合鏡爪二階段「魔狼撕咬」與大招最後的衝殺（el 換成 blood 即血色疾風）。',
    params: { len: 560, width: 100 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), ang = o.angle || 0, len = o.len || 560, w = o.width || 100, [tx, ty] = along(x, y, ang, len, 0);
      fx.beam(x, y, tx, ty, w * 0.5, DARK, 0.35, E.glow);
      fx.beam(x, y, tx, ty, 6 * k, E.glow, 0.3, SILVER);
      for (let i = 0; i < 4; i++) fx.after(i * 0.04, () => {
        const [sx, sy] = along(x, y, ang, len * i / 4, w * 0.35), [ex, ey] = along(x, y, ang, len * (i + 1) / 4, w * 0.35);
        const [sx2, sy2] = along(x, y, ang, len * i / 4, -w * 0.35), [ex2, ey2] = along(x, y, ang, len * (i + 1) / 4, -w * 0.35);
        fx.streak(sx, sy, ex, ey, 3, ICE, 0.35, true); fx.streak(sx2, sy2, ex2, ey2, 3, ICE, 0.35, true);
        fx.sparkle(ex, ey, E.glow, fx.budget(4), 200, ang + Math.PI / 2, 0.6); fx.sparkle(ex2, ey2, E.glow, fx.budget(4), 200, ang - Math.PI / 2, 0.6);
      });
      fx.after(0.16, () => {
        fx.ring(tx, ty, 10, w * 1.1, 0.4, E.glow, 4 * k);
        fx.slash(tx, ty, ang - 0.6, 1.2, w * 0.6, SILVER, 5 * k, 0.22, { core: '#ffffff', trail: 2, rim: E.glow });
        fx.slash(tx, ty, ang + 0.6, 1.2, w * 0.6, SILVER, 5 * k, 0.22, { core: '#ffffff', trail: 2, rim: E.glow });
      });
      fx.shake(Math.min(9, 5 * k), ang);
    },
  });

  BD.defineEffect('wolfawaken', {
    name: '魔狼的饗宴', category: '大招',
    desc: '魔狼的飢餓失控：暗色霧氣與血紅光暈向外翻湧，四道巨大的爪痕劃過地面，震環一圈圈擴散，場地被染成淡紅。適合鏡爪二階段的轉換（transFx）。',
    params: { radius: 260 },
    spawn(fx, x, y, o) {
      const k = Math.min(1.5, o.k), r = o.radius || 260;
      fx.veil(0.6, 0.3, '#1a0006'); fx.grade(BLOOD, 0.3, 0.8);
      for (let i = 0; i < 3; i++) fx.after(i * 0.18, () => fx.ring(x, y, r * 0.1, r * (0.7 + i * 0.15), 0.5, i === 0 ? SILVER : BLOOD, 4 * k));
      for (let i = 0; i < 4; i++) claws(fx, x, y, i * TAU / 4 + 0.4, r * 0.9, BLOOD, 3 * k, 0.5, '#ff6a5a');
      fx.sparkle(x, y, '#ffd0d0', fx.budget(24), 320, 0, TAU);
      fx.shake(Math.min(9, 6 * k), 0);
    },
  });

  BD.defineEffect('lambfinale', {
    name: '永恆獵手・終', category: '大招',
    desc: '大招的終結：一道銀白巨光從天貫下，魔狼隨光撲落，四道爪痕的弧光橫劈地面，銀藍震環炸開、粉碎的符印化為星屑漫天飛舞，場地短暫染上冷光。適合鏡爪大招「永恆獵手」的符印命中（el 換成 blood 即血色的終結）。',
    params: { radius: 130 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), r = o.radius || 130;
      fx.veil(0.5, 0.25, '#050008'); fx.grade(ICE, 0.25, 0.8);
      fx.beam(x, y - 420 * k, x, y, 12 * k, SILVER, 0.35, '#ffffff');
      fx.ring(x, y, 10, r * 1.4, 0.8, SILVER, 4 * k);
      fx.ring(x, y, 20, r * 1.1, 0.6, E.glow, 3 * k);
      for (let i = 0; i < 4; i++) claws(fx, x, y, i * TAU / 4 + V() * 0.3, r * 1.4, ICE, 3 * k, 0.45, E.glow);
      fx.sparkle(x, y, SILVER, fx.budget(26), 340, 0, TAU);
      fx.after(0.15, () => fx.sparkle(x, y, ICE, fx.budget(14), 260, -Math.PI / 2, Math.PI));
      fx.shake(Math.min(10, 7 * k), 0);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
