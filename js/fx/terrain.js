'use strict';
// 特效庫｜地形（treecut / treesmash / treehit / splash / sanddust / snowburst / wheatburst）：樹被斬成兩半、被撞飛、被擊中，水面濺起水花與漣漪，沙地揚起沙塵、雪地炸開雪霧、麥田被削飛成漫天麥稈
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
// o：angle 招式方向（斬擊為刃向、撞擊為衝擊方向）、r 樹幹半徑、scale 倍率、dir 水花是否沿 angle 噴射
(function (G) {
  const BD = G.BD, V = BD.vrng, TAU = Math.PI * 2;
  const LEAF = ['#5f9e3c', '#3f7a2c', '#8bc34a'];
  const leaves = (fx, x, y, n, speed, spread) => { for (const c of LEAF) fx.debris(x, y, c, Math.ceil(n / 3), speed, 4.5, spread); };

  BD.defineEffect('treecut', {
    name: '斬斷樹木', category: '地形',
    desc: '樹被斬擊劈成兩半：兩半棵樹順著刃的垂直方向倒向兩側並漸隱，原地留下樹墩，葉片與木屑四散。',
    params: { r: 32 },
    spawn(fx, x, y, o) {
      const a = o.angle || 0, nx = -Math.sin(a), ny = Math.cos(a), r = o.r;
      for (const s of [-1, 1]) fx.chunk(x + nx * s * 4, y + ny * s * 4, nx * s * (110 + V() * 60) + Math.cos(a) * 40, ny * s * (110 + V() * 60) + Math.sin(a) * 40, a, s * (1 + V() * 1.6), s, r, (V() * 3) | 0);
      fx.decal(x, y, r * 0.55, '#3a2a1c', 45);
      leaves(fx, x, y, 24, 240, r * 0.8);
      fx.debris(x, y, '#9b6b3c', 8, 260, 5, r * 0.5);
      fx.flashAt(x, y, 36, '#ffffff', 0.08);
      fx.shake(3);
    },
  });

  BD.defineEffect('treesmash', {
    name: '撞飛樹木', category: '地形',
    desc: '樹被重擊連根撞飛：地面炸開塵土與樹根碎塊，沿衝擊方向噴出葉片，原地留下坑洞。（飛行的滾木由引擎投射物負責）',
    params: { r: 32 },
    spawn(fx, x, y, o) {
      const a = o.angle || 0, r = o.r;
      fx.decal(x, y, r * 0.7, '#2e2118', 45);
      fx.ring(x, y, 6, r * 2.6, 0.4, '#d9c9a8', 4);
      fx.smoke(x, y, 'rgba(180,160,120,0.5)', 8, r);
      leaves(fx, x, y, 30, 320, r * 0.9);
      fx.sparkle(x, y, '#c9a56a', 10, 340, a, 1.2);
      fx.debris(x, y, '#6b4a2a', 10, 300, 6, r * 0.6);
      fx.shake(6, a);
    },
  });

  BD.defineEffect('treehit', {
    name: '擊中樹木', category: '地形',
    desc: '樹被擊中但沒倒：幾片葉子與木屑震落。',
    params: {},
    spawn(fx, x, y, o) {
      leaves(fx, x, y, 9, 140, 26);
      fx.debris(x, y, '#9b6b3c', 3, 160, 3.5, 12);
    },
  });

  BD.defineEffect('splash', {
    name: '水花', category: '地形',
    desc: '水面被踩踏、被招式命中時濺起：兩圈擴散漣漪與落回水面的水珠；dir 為真時沿招式方向再噴出一道水沫。',
    params: {},
    spawn(fx, x, y, o) {
      const k = o.scale;
      fx.ring(x, y, 3, 34 * k, 0.55, '#cfeaf0', 2.5);
      fx.ring(x, y, 1, 20 * k, 0.4, '#ffffff', 1.5);
      fx.debris(x, y, '#e4f6fa', Math.round(8 * k) + 2, 120 + 90 * k, 2.6, 6 * k);
      if (o.dir) fx.sparkle(x, y, '#e4f6fa', Math.round(8 * k), 320, o.angle, 0.9);
    },
  });

  BD.defineEffect('sanddust', {
    name: '沙塵', category: '地形',
    desc: '沙地被招式擊中 / 被踩踏時揚起：dir 為真時沿 angle 噴出一道沙塵與沙粒，否則向四周擴散；scale 越大沙塵越多越遠。',
    params: {},
    spawn(fx, x, y, o) {
      const k = o.scale, sk = Math.sqrt(k);
      for (let i = 0, n = Math.round(12 * k) + 8; i < n; i++) { // 大塵團：2~5 秒慢慢擴散、向上飄散
        const a = o.dir ? o.angle + (V() - 0.5) * 0.9 : V() * TAU, s = (60 + V() * 240) * sk;
        fx.puff(x + (V() - 0.5) * 24, y + (V() - 0.5) * 24, Math.cos(a) * s, Math.sin(a) * s - 25, 16 + V() * 10, 70 + V() * 80 * sk, 2.4 + V() * 2.2, 'sand', 0.5);
      }
      for (let i = 0, n = Math.round(14 * k) + 6; i < n; i++) { // 沙粒拋物線飛濺
        const a = o.dir ? o.angle + (V() - 0.5) * 1.3 : V() * TAU, s = (120 + V() * 300) * sk;
        fx.stalk(x, y, Math.cos(a) * s, Math.sin(a) * s, 140 + V() * 280 * sk, 0, 0, 3, 4, V() < 0.5 ? '#d8be86' : '#b89a5e', 0.9 + V() * 0.9);
      }
      fx.debris(x, y, '#d8be86', Math.round(5 * k) + 2, 160 * sk, 2.4, 8 * k);
    },
  });

  BD.defineEffect('snowburst', {
    name: '雪沫飛揚', category: '地形',
    desc: '雪地被招式擊中 / 被踩踏時炸開：大片雪霧翻滾 2~4 秒、雪塊拋物線飛濺、冰晶閃光；dir 為真時沿 angle 噴出一道雪浪，否則向四周炸開。',
    params: {},
    spawn(fx, x, y, o) {
      const k = o.scale, sk = Math.sqrt(k);
      for (let i = 0, n = Math.round(9 * k) + 5; i < n; i++) {
        const a = o.dir ? o.angle + (V() - 0.5) * 1.1 : V() * TAU, s = (80 + V() * 260) * sk;
        fx.puff(x + (V() - 0.5) * 20, y + (V() - 0.5) * 20, Math.cos(a) * s, Math.sin(a) * s - 25, 22 + V() * 14, 70 + V() * 70 * sk, 2.2 + V() * 1.8, 'snow', 0.6);
      }
      for (let i = 0, n = Math.round(10 * k) + 4; i < n; i++) {
        const a = o.dir ? o.angle + (V() - 0.5) * 1.2 : V() * TAU, s = (200 + V() * 420) * sk;
        fx.stalk(x, y, Math.cos(a) * s, Math.sin(a) * s, (260 + V() * 480) * sk, 0, 0, 4 + V() * 5, 6 + V() * 5, V() < 0.5 ? '#ffffff' : '#d3e3f3', 1.2 + V() * 1.1);
      }
      fx.sparkle(x, y, '#bfe6ff', Math.round(6 * k), 360, o.dir ? o.angle : null, o.dir ? 1 : null);
    },
  });

  const WATER_COL = ['#e8fbff', '#bfe6f2', '#8ccbe0'];
  const rnd = (n) => (V() * n) | 0;
  // 湖面：所有招式都濺起大片水花；依招式元素與水面起反應（蒸發 / 凍結 / 導電 / 暈染 / 聖光…）
  // 持久的痕跡（岩石、冰面、油汙般的毒血暈）由 js/fx/scars.js 在同一次 spawnFx 後留下
  BD.defineEffect('lakesplash', {
    name: '湖面水花', category: '地形',
    desc: '淺水湖面被招式擊中：三圈外擴漣漪、沖天水柱與漫天水珠、水霧團；火焰蒸發成大片水氣、冰霜凍結水面、雷電沿水面竄出電弧、毒 / 血 / 暗影在水中暈開、聖光盪出金色光圈、秘法泛起紫色漣漪。',
    params: {},
    spawn(fx, x, y, o) {
      const k = o.scale, sk = Math.sqrt(k), el = o.el, E = o.E;
      fx.ring(x, y, 6, 60 * k, 0.7, '#e4f8fb', 3.5); fx.ring(x, y, 4, 115 * k, 1.0, '#bfe6ee', 2.4); fx.ring(x, y, 2, 180 * k, 1.3, '#a9dbe6', 1.6);
      for (let i = 0, n = Math.round(4 * k) + 3; i < n; i++) {
        const a = V() * TAU, s = 30 + V() * 90 * sk;
        fx.puff(x + (V() - 0.5) * 30, y + (V() - 0.5) * 30, Math.cos(a) * s, Math.sin(a) * s, 18, 60 + V() * 40 * k, 0.9 + V() * 0.7, 'water', 0.55);
      }
      for (let i = 0, n = Math.round(30 * k) + 16; i < n; i++) { // 漫天水珠
        const a = o.dir ? o.angle + (V() - 0.5) * 1.3 : V() * TAU, s = (160 + V() * 380) * sk;
        fx.stalk(x, y, Math.cos(a) * s, Math.sin(a) * s, (340 + V() * 520) * sk, 0, 0, 3 + V() * 3, 3 + V() * 3, WATER_COL[rnd(3)], 1 + V() * 0.8);
      }
      for (let i = 0, n = Math.round(6 * k) + 2; i < n; i++) fx.stalk(x + (V() - 0.5) * 20, y + (V() - 0.5) * 12, (V() - 0.5) * 50, (V() - 0.5) * 30, (700 + V() * 350) * sk, 0, 0, 5, 8, '#ffffff', 1.2); // 水柱
      if (o.dir) fx.sparkle(x, y, '#e8fbff', Math.round(8 * k), 380, o.angle, 0.9);
      const mist = (tint, n, al, life) => { for (let i = 0; i < n; i++) fx.puff(x + (V() - 0.5) * 40, y + (V() - 0.5) * 40, (V() - 0.5) * 80, -(20 + V() * 60), 24, 90 + 60 * k, life + V() * 1.5, tint, al); };
      if (el === 'fire') { // 蒸發：大片白色水氣向上翻騰、冒泡、餘燼嘶嘶
        mist('steam', Math.round(6 * k) + 4, 0.5, 2.2);
        fx.sparkle(x, y, '#ffb347', Math.round(8 * k), 300);
        for (let i = 0, n = Math.round(8 * k); i < n; i++) fx.part(BD.PK.BUBBLE, x + (V() - 0.5) * 50, y + (V() - 0.5) * 30, (V() - 0.5) * 40, -V() * 40, 0.8 + V() * 0.6, 'rgba(255,255,255,0.75)', 3 + V() * 3, 1);
        if (o.zoneR || k >= 1.5) fx.shake(6);
      } else if (el === 'ice') { // 凍結：冰晶迸射、寒霧、白色凍結圈
        mist('snow', Math.round(4 * k) + 2, 0.4, 1.8);
        fx.ring(x, y, 10, 150 * k, 0.9, '#ffffff', 3);
        fx.sparkle(x, y, '#e6fbff', Math.round(12 * k), 340); fx.debris(x, y, '#cfefff', Math.round(10 * k), 280, 4, 14);
      } else if (el === 'lightning') { // 導電：電弧沿水面向四周竄走
        const R = 170 * k, bolt = (n) => { for (let b = 0; b < n; b++) { let a = V() * TAU, px = x, py = y; for (let s = 0, m = 3 + rnd(2); s < m; s++) { a += (V() - 0.5) * 1.1; const len = R / 3 * (0.7 + V() * 0.6), nx = px + Math.cos(a) * len, ny = py + Math.sin(a) * len; fx.beam(px, py, nx, ny, 3 + V() * 2, '#a8dcff', 0.28 + V() * 0.12, '#ffffff'); px = nx; py = ny; } } };
        bolt(6 + Math.round(2 * k)); fx.after(0.12, () => bolt(4));
        fx.ring(x, y, 6, R, 0.5, '#a8dcff', 3); fx.sparkle(x, y, '#ffffff', Math.round(14 * k), 460); fx.flashAt(x, y, R * 0.5, '#cfe9ff', 0.14);
      } else if (el === 'poison') {
        mist('toxic', Math.round(6 * k) + 3, 0.5, 2.5);
        for (let i = 0, n = Math.round(10 * k); i < n; i++) fx.part(BD.PK.BUBBLE, x + (V() - 0.5) * 60, y + (V() - 0.5) * 40, (V() - 0.5) * 30, -V() * 30, 1 + V(), '#b6ff5c', 3 + V() * 4, 1);
      } else if (el === 'blood') {
        mist('blood', Math.round(6 * k) + 3, 0.55, 2.5);
        for (let i = 0, n = Math.round(10 * k); i < n; i++) { const a = V() * TAU, s = (120 + V() * 300) * sk; fx.stalk(x, y, Math.cos(a) * s, Math.sin(a) * s, (300 + V() * 400) * sk, 0, 0, 4, 5, '#9a0a1c', 1.2); }
      } else if (el === 'shadow' || el === 'umbra') {
        mist('ink', Math.round(6 * k) + 3, 0.55, 2.8);
        fx.motes(x, y, E, Math.round(8 * k), 40, 70);
      } else if (el === 'holy') {
        fx.ring(x, y, 8, 140 * k, 0.9, '#ffe27a', 3); fx.ring(x, y, 4, 220 * k, 1.3, '#fff1b0', 2);
        fx.glow(x, y, 110 * k, '#ffe27a', 0.9, 0.7, 0.6); fx.sparkle(x, y, '#fff1b0', Math.round(14 * k), 300); fx.motes(x, y, E, Math.round(8 * k), 40, 90);
      } else if (el === 'arcane') {
        fx.ring(x, y, 8, 150 * k, 0.9, '#c77dff', 3); fx.ring(x, y, 4, 230 * k, 1.3, '#e0b8ff', 2);
        fx.motes(x, y, E, Math.round(10 * k), 50, 90); fx.sparkle(x, y, '#e0b8ff', Math.round(10 * k), 300);
      }
    },
  });

  const WHEAT_COL = ['#e3b94a', '#d1a233', '#f1cf6e', '#b98a24'];
  BD.defineEffect('wheatburst', {
    name: '麥浪炸裂', category: '地形',
    desc: '麥田被摧毀：cells（格號清單）裡的麥叢被連根削飛成漫天麥稈與麥粒，金色麥屑翻滾，風圈讓周圍麥浪向外倒伏。mode 為 cut（沿刃的兩側削飛）、blast（以中心炸開）或 trample（腳下踩倒，規模小）。',
    params: { cells: [], mode: 'cut' },
    spawn(fx, x, y, o) {
      const a = o.angle || 0, trample = o.mode === 'trample', blast = o.mode === 'blast', per = trample ? 2 : blast ? 7 : 5;
      for (const idx of o.cells) {
        fx.field[idx] = 1;
        const cx = BD.WHEAT.cx(idx), cy = BD.WHEAT.cy(idx), rad = Math.atan2(cy - y, cx - x);
        for (let j = 0; j < per; j++) {
          const side = V() < 0.5 ? -1 : 1;
          const dir = trample ? a + Math.PI + (V() - 0.5) * 2 : blast || o.dirless ? rad + (V() - 0.5) * 0.8 : a + side * Math.PI / 2 + (V() - 0.5) * 0.6;
          const s = trample ? 60 + V() * 90 : 300 + V() * 450 + (blast ? 150 : 0), vz = trample ? 150 + V() * 150 : 300 + V() * (blast ? 480 : 340);
          const fwd = blast || trample ? 0 : 120;
          fx.stalk(cx, cy, Math.cos(dir) * s + Math.cos(a) * fwd, Math.sin(dir) * s + Math.sin(a) * fwd, vz, V() * TAU, (V() < 0.5 ? -1 : 1) * (8 + V() * 14), 24 + V() * 22, 2.2, WHEAT_COL[(V() * 4) | 0], 1.1 + V());
        }
        if (!trample) {
          for (let j = 0; j < 2; j++) fx.stalk(cx, cy, Math.cos(rad) * (200 + V() * 500), Math.sin(rad) * (200 + V() * 500), 300 + V() * 500, 0, 0, 3, 3.5, '#f6dc7a', 1 + V());
          if (V() < 0.35) fx.stalk(cx, cy, Math.cos(rad) * (150 + V() * 300), Math.sin(rad) * (150 + V() * 300), 350 + V() * 350, V() * TAU, (V() - 0.5) * 12, 48 + V() * 14, 6, '#d9aa38', 1.4 + V());
          if (V() < 0.5) fx.puff(cx, cy, Math.cos(rad) * 70, Math.sin(rad) * 70 - 20, 14, 46 + V() * 30, 1.6 + V() * 1.2, 'wheat', 0.42);
        }
      }
      if (!trample) { fx.gust(x, y, o.radius || 150); fx.shake(Math.min(10, 2 + o.cells.length * 0.08)); }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
