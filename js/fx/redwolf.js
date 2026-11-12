'use strict';
// 冷藍輝石與橙金曲劍各自配色；全為視覺，沒有燃燒 / 聖傷判定。
(function (G) {
  const BD = G.BD, TAU = Math.PI * 2;
  const BLUE = '#65c9ff', WHITE = '#eaffff', GOLD = '#ffb65b', PALE = '#fff2c9';
  BD.defineElement('glintstone', { name: '輝石', core: WHITE, glow: BLUE, particle: '#b9efff', rim: '#2156a1', debris: '#5087ac', smoke: 'rgba(68,130,200,0.2)', extra: 'runes' });
  BD.defineElement('amberblade', { name: '橙金劍光', core: PALE, glow: GOLD, particle: '#ffd89c', rim: '#9b4d25', debris: '#a58865', smoke: 'rgba(154,113,78,0.2)', extra: 'motes' });
  BD.KIND_EL.glintblade = 'glintstone'; BD.KIND_EL.glintcomet = 'glintstone';
  BD.defineEffect('redwolfglint', { name: '紅狼・輝劍成形', category: '投射物', desc: '冷藍符環收束、劍尖閃亮，散出輝石碎光。', params: {},
    spawn(fx, x, y, o) {
      const r = o.radius || 38;
      fx.ring(x, y, r * 0.9, r * 0.3, 0.32, BLUE, 2);
      fx.flashAt(x, y, r * 0.8, BLUE, 0.22);
      fx.streak(x - r * 0.75, y, x + r * 0.75, y, 2, WHITE, 0.2, true);
      fx.streak(x, y - r * 0.7, x, y + r * 0.7, 2, BLUE, 0.25, true);
      fx.sparkle(x, y, BLUE, fx.budget(7), 130, o.angle || 0, TAU);
    } });
  BD.defineEffect('redwolfslash', { name: '紅狼・橙金咬劍', category: '斬擊', desc: '巨大的橙金曲刃拉出兩層月牙，前緣白亮，刃後金粉消散。', params: {},
    spawn(fx, x, y, o) {
      const r = o.radius || o.len || 240, a = o.angle || 0, arc = o.arc || 2.8;
      fx.slash(x, y, a, arc, r, GOLD, 17, 0.34, { core: PALE });
      fx.slash(x, y, a - 0.07, arc * 0.94, r * 0.84, '#ca682e', 6, 0.45, { core: GOLD });
      fx.sparkle(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, GOLD, fx.budget(13), 230, a, arc);
      fx.shake(4);
    } });
  BD.defineEffect('redwolfwhirl', { name: '紅狼・咬劍圓舞', category: '斬擊', desc: '紅狼旋身甩劍，橙金劍光繞身一整圈；冷藍星屑與金色劍痕交錯。', params: {},
    spawn(fx, x, y, o) {
      const r = o.radius || 225, a = o.angle || 0;
      fx.slash(x, y, a, TAU - 0.06, r, GOLD, 21, 0.4, { core: PALE });
      fx.after(0.08, () => fx.slash(x, y, a + 1.2, TAU - 0.12, r * 0.9, '#f1983d', 7, 0.4, { core: PALE }));
      fx.ring(x, y, r * 0.7, r * 1.08, 0.48, BLUE, 2);
      fx.sparkle(x, y, GOLD, fx.budget(24), r * 1.4, 0, TAU); fx.shake(7);
    } });
  BD.defineEffect('redwolfbound', { name: '紅狼・疾躍', category: '位移', desc: '紅褐鬃毛般的疾風與少量冷藍星屑，腳下掀起細塵。', params: {},
    spawn(fx, x, y, o) {
      const a = o.angle == null ? (o.src ? o.src.face : 0) : o.angle, len = Math.min(o.len || 140, 320);
      for (let i = -2; i <= 2; i++) {
        const px = -Math.sin(a) * i * 9, py = Math.cos(a) * i * 9;
        fx.streak(x + px, y + py, x - Math.cos(a) * len + px, y - Math.sin(a) * len + py, i === 0 ? 5 : 2, i % 2 ? '#a65d37' : BLUE, 0.27, true);
      }
      fx.smoke(x, y, 'rgba(145,111,80,0.27)', fx.budget(6), 35);
    } });
  BD.defineEffect('redwolfpounce', { name: '紅狼・飛撲噬咬', category: '突刺', desc: '紅褐疾風沿撲躍路徑拉成三道爪痕，落點上下兩排獠牙合攏、濺起塵土與少量冷藍星屑。', params: {},
    spawn(fx, x, y, o) {
      const a = o.angle == null ? (o.src ? o.src.face : 0) : o.angle, len = Math.min(o.len || 360, 480), dur = o.dur || 0.3, ca = Math.cos(a), sa = Math.sin(a);
      for (let i = -1; i <= 1; i++) fx.streak(x - sa * i * 14, y + ca * i * 14, x + ca * len - sa * i * 14, y + sa * len + ca * i * 14, i ? 3 : 6, i ? '#a65d37' : GOLD, dur + 0.2, true);
      fx.smoke(x, y, 'rgba(145,111,80,0.3)', fx.budget(6), 38); fx.ring(x, y, 10, 60, 0.3, '#c9a27a', 3);
      fx.after(dur, () => {
        const ex = x + ca * (len + 30), ey = y + sa * (len + 30);
        fx.slash(ex - ca * 70, ey - sa * 70, a - 0.5, 1.1, 95, '#46261f', 15, 0.2, { core: PALE });
        fx.slash(ex - ca * 70, ey - sa * 70, a + 0.5, 1.1, 95, '#46261f', 15, 0.2, { core: PALE });
        fx.flashAt(ex, ey, 50, PALE, 0.12); fx.sparkle(ex, ey, BLUE, fx.budget(8), 190, a, 1.6);
        fx.debris(ex, ey, '#a48e70', fx.budget(8), 220, 4, TAU); fx.shake(6, a);
      });
    } });
  BD.defineEffect('redwolfplunge', { name: '紅狼・騰空裂地', category: '砸地', desc: '橙金劍光斜插大地，放射裂痕與兩層蒼金震環交替展開。', params: {},
    spawn(fx, x, y, o) {
      const r = o.radius || 150;
      fx.beam(x - r * 0.4, y - r * 1.7, x, y, 22, GOLD, 0.22, PALE);
      fx.flashAt(x, y, r * 0.85, PALE, 0.15);
      fx.shock(x, y, r * 0.12, r * 1.05, 0.42, GOLD, 8, PALE);
      fx.after(0.1, () => fx.ring(x, y, r * 0.2, r * 1.35, 0.48, BLUE, 3));
      fx.crack(x, y, r, 'rgba(55,35,25,0.55)', 7, GOLD, 8);
      fx.debris(x, y, '#a48e70', fx.budget(16), 300, 5, TAU);
      fx.sparkle(x, y, BLUE, fx.budget(18), 210, 0, TAU); fx.shake(10); fx.punch(0.025, x, y);
    } });
  BD.defineEffect('redwolfcrown', { name: '紅狼・蒼金劍冠', category: '大招', desc: '冷藍符環與橙金劍弧向外展開，七道細長光劍在周圍短暫成冠。', params: {},
    spawn(fx, x, y, o) {
      const r = (o.src && o.src.r || 34) * 4;
      fx.charge(x, y, r, BLUE, 0.85, o.src || null, fx.budget(20));
      fx.ring(x, y, r * 0.3, r * 1.4, 0.9, BLUE, 3);
      fx.slash(x, y, -0.6, 4.5, r * 1.3, GOLD, 8, 0.85, { core: PALE });
      for (let i = 0; i < 7; i++) {
        const a = i * TAU / 7, cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r;
        fx.streak(cx, cy, cx + Math.cos(a) * 65, cy + Math.sin(a) * 65, 4, BLUE, 0.7, true);
      }
      fx.sparkle(x, y, WHITE, fx.budget(22), 250, 0, TAU); fx.shake(5);
    } });
})(typeof window !== 'undefined' ? window : globalThis);
