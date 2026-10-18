'use strict';
// 特效庫｜地形（treecut / treesmash / treehit / splash / sanddust）：樹被斬成兩半、被撞飛、被擊中，水面濺起水花與漣漪，沙地揚起沙塵
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
// o：angle 招式方向（斬擊為刃向、撞擊為衝擊方向）、r 樹幹半徑、scale 倍率、dir 水花是否沿 angle 噴射
(function (G) {
  const BD = G.BD, V = BD.vrng;
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
      const k = o.scale, n = Math.round(7 * k) + 2;
      for (let i = 0; i < n; i++) {
        const a = o.dir ? o.angle + (V() - 0.5) * 0.9 : V() * Math.PI * 2, s = (90 + V() * 200) * Math.sqrt(k);
        fx.part(BD.PK.SOFT, x, y, Math.cos(a) * s, Math.sin(a) * s, 0.6 + V() * 0.5, 'rgba(214,190,140,0.6)', 8 + V() * 10 * k, 2.2);
      }
      fx.debris(x, y, '#d8be86', Math.round(5 * k) + 2, 160 * Math.sqrt(k), 2.4, 8 * k);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
