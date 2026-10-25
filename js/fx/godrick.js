'use strict';
// 特效庫｜葛瑞克專屬（stormcall / kneelquake / axegrind / goldaxeslam / dragonbite / bearwitness / graftclaw / graftsever / lordgold）：
// 依原作配色——黃金戰斧的金光與葛孚雷獅紋、喚風的青白旋風與落葉、接肢的血肉、龍頭的橘金烈焰。只呼叫 fx 原件；亂數只用 BD.vrng；不觸碰 DOM。
(function (G) {
  const BD = G.BD, TAU = Math.PI * 2, V = BD.vrng;
  const WHITE = '#ffffff', PALE = '#fff6d0', GOLD = '#ffcf4a', AMBER = '#e0a030';
  const WIND = '#d8f4ec', WIND_D = '#8fc8b8', LEAF = '#c9a640', FLAME = '#ff7a1a', FLAME_L = '#ffd27a', EMBER = '#ff4a10';
  const BLOOD = '#b0102a', FLESH = '#7a3a44', DUST = 'rgba(160,140,110,0.45)';

  // 旋風：n 道沿圓周掃過的弧（逐道延遲，越外圈越淡），加上落葉
  function swirl(fx, x, y, r, n, life, color, a0) {
    for (let i = 0; i < n; i++) fx.after(i * 0.04, () => fx.slash(x, y, (a0 || 0) + i * TAU / n, 2.4, r * (0.55 + 0.45 * ((i % 3) / 2)), color, 10, life, { core: WHITE, trail: 2 }));
  }
  function leaves(fx, x, y, n, sp) {
    for (let i = 0; i < n; i++) { const a = V() * TAU; if (!fx.part(BD.PK.SQ, x + Math.cos(a) * 20, y + Math.sin(a) * 20, Math.cos(a + 1.3) * sp, Math.sin(a + 1.3) * sp, 0.8 + V() * 0.5, i % 2 ? LEAF : '#8a6a20', 3.5, 1.2)) break; } // 落葉順著旋風切線飛出
  }
  // 葛孚雷的獅紋：盾形外框 + 獅頭的鬃毛放射線（俯視時浮在地面上）
  function lionCrest(fx, x, y, s, life) {
    const pts = [[-0.8, -1], [0.8, -1], [0.8, 0.2], [0, 1.1], [-0.8, 0.2]];
    for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; fx.streak(x + ax * s, y + ay * s, x + bx * s, y + by * s, 5, GOLD, life, true); }
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 9 - 0.5) * 2.6, l = s * 0.55; fx.streak(x, y - s * 0.05, x + Math.cos(a) * l, y - s * 0.05 + Math.sin(a) * l * 0.9, 3, i % 2 ? AMBER : PALE, life * 0.9, true); }
    fx.glow(x, y, s * 1.2, GOLD, life, 0.45, 0.2);
  }
  // 火舌：從 (x,y) 朝 ang 噴一道短火
  function tongue(fx, x, y, ang, len, life) {
    for (let i = 0; i < 6; i++) { const u = (i + 1) / 6, a = ang + (V() - 0.5) * 0.4; fx.after(i * 0.025, () => fx.glow(x + Math.cos(a) * len * u, y + Math.sin(a) * len * u, 14 + 26 * u, i % 2 ? FLAME : EMBER, life, 0.55, 0.4)); }
    fx.glow(x + Math.cos(ang) * len, y + Math.sin(ang) * len, 30, FLAME_L, life * 0.6, 0.7, 0.6);
  }

  BD.defineEffect('stormcall', {
    name: '喚風', category: '震波',
    desc: '黃金戰斧在頭頂掄圈捲起的大旋風：青白的風弧沿圓周層層掃過、外圈一道風壓環推開，金色落葉與塵土被捲著打轉；元素為火時旋風染成橘紅火捲、帶著火星。適合以自身為中心的旋風 / 龍捲（喚風、多段 circle 判定）。',
    params: { radius: 200 },
    spawn(fx, x, y, o) {
      const E = o.E, r = o.radius || 200, fire = E.id === 'fire', c = fire ? FLAME : WIND, c2 = fire ? EMBER : WIND_D, a0 = V() * TAU;
      swirl(fx, x, y, r, 6, 0.32, c, a0);
      fx.after(0.06, () => swirl(fx, x, y, r * 0.7, 4, 0.28, c2, a0 + 1));
      fx.ring(x, y, r * 0.4, r * 1.1, 0.35, fire ? FLAME_L : PALE, 4);
      fx.smoke(x, y, fire ? 'rgba(80,30,10,0.4)' : DUST, fx.budget(8), r * 0.7);
      leaves(fx, x, y, fx.budget(fire ? 4 : 10), r * 1.6);
      if (fire) fx.embers(x, y, FLAME, fx.budget(14), r * 0.8, 140);
      else fx.motes(x, y, E, fx.budget(8), r * 0.6, 160);
      fx.shake(5);
    },
  });

  BD.defineEffect('kneelquake', {
    name: '給我跪下', category: '砸地',
    desc: '「我命令你，跪下！」黃金戰斧捶進地面：落點閃金，一圈金色震地環貼著地面推開，地面裂出放射狀的金痕、碎石往外噴、塵浪低低滾開；scale 越大震得越兇（第三下大震波）；元素為火時裂縫透出火光。適合震地、地震波、王威。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k || 1, s = o.scale || 1, R = (o.shape === 'ring' ? o.radius : (o.radius || 150)) * 1, fire = E.id === 'fire';
      fx.flashAt(x, y, R * 0.35, PALE, 0.08);
      fx.shock(x, y, R * 0.2, R * 1.05, 0.4 + 0.1 * s, GOLD, 6 + 3 * s, WHITE);
      fx.after(0.07, () => fx.ring(x, y, R * 0.5, R * 1.25, 0.45, DUST, 6));
      if (s > 1.5) fx.after(0.12, () => fx.shock(x, y, R * 0.4, R * 1.4, 0.55, fire ? FLAME : AMBER, 5, PALE));
      fx.crack(x, y, R * 0.8, 'rgba(40,26,10,0.6)', 9, fire ? EMBER : GOLD, Math.round(6 + 4 * s));
      fx.debris(x, y, E.debris, fx.budget(Math.round(10 + 8 * s)), 320 * k, 5, TAU);
      fx.smoke(x, y, DUST, fx.budget(10), R * 0.6);
      if (fire) fx.embers(x, y, FLAME, fx.budget(16), R * 0.7, 130);
      fx.shake(7 + 6 * s); fx.punch(0.015 + 0.012 * s, x, y);
      if (s > 1.5) { fx.grade(fire ? '#ff7a1a' : '#ffcf4a', 0.25, 0.4); fx.text(x, y - 80, '跪下！', GOLD, 30); }
    },
  });

  BD.defineEffect('axegrind', {
    name: '拖斧', category: '斬擊',
    desc: '戰斧拖地：位移時沿路刮出一串金橙火花與地上的長刮痕；直線判定（rect）時是停一拍後往上撩，一道直立的金色月牙弧從斧尖往上掃、刮痕盡頭炸開火花。適合拖刀 / 拖斧突進與上撩（dash 的 fx 與直線判定）。',
    params: { len: 300 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k || 1, ang = o.angle || 0, len = o.len || 300, ca = Math.cos(ang), sa = Math.sin(ang), side = (o.src && o.src.r) || 40;
      if (o.shape !== 'rect') { // 拖地（dash 的 fx）：斧刃在身體右側一路刮
        const px = -sa * side, py = ca * side, dur = o.dur || 0.5;
        for (let i = 0; i < 8; i++) fx.after(i * dur / 8, () => {
          const u = (i + 1) / 8, sx = x + px + ca * len * u, sy = y + py + sa * len * u;
          fx.sparkle(sx, sy, i % 2 ? GOLD : FLAME_L, fx.budget(4), 260, ang + Math.PI, 1.2);
          fx.decal(sx, sy, 10, 'rgba(40,30,20,0.35)', 5);
        });
        fx.streak(x + px, y + py, x + px + ca * len, y + py + sa * len, 4, 'rgba(60,44,24,0.5)', 1.2, false);
        return;
      }
      const ex = x + ca * len * 0.8, ey = y + sa * len * 0.8;
      fx.slash(x + ca * len * 0.35, y + sa * len * 0.35, ang, 1.4, len * 0.55, E.glow, 14, 0.3, { core: WHITE, trail: 2 });
      fx.streak(x, y, ex, ey, 10, GOLD, 0.3, true); fx.streak(x, y, ex, ey, 3, WHITE, 0.24, true);
      fx.sparkle(ex, ey, FLAME_L, fx.budget(16), 380 * k, ang, 1.0);
      fx.debris(ex, ey, E.debris, fx.budget(10), 280 * k, 4, 1.2);
      fx.flashAt(ex, ey, 40, PALE, 0.08);
      fx.shake(8); fx.punch(0.02, ex, ey);
    },
  });

  BD.defineEffect('goldaxeslam', {
    name: '黃金戰斧重劈', category: '砸地',
    desc: '從半空一斧劈下：落點閃白、葛孚雷的金色獅紋盾徽在地上一閃，兩層金色震波、十字斧痕裂開，碎石與塵浪往外噴、金屑飄起；元素為火時震波帶火。適合躍起重劈、空中下砸。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k || 1, R = 150 * (o.scale || 1), fire = E.id === 'fire';
      fx.flashAt(x, y, R * 0.8, WHITE, 0.12);
      lionCrest(fx, x, y, R * 0.45, 0.5);
      fx.shock(x, y, R * 0.1, R * 1.15, 0.4, fire ? FLAME : GOLD, 9, WHITE);
      fx.after(0.08, () => fx.shock(x, y, R * 0.3, R * 1.6, 0.5, fire ? EMBER : AMBER, 5, PALE));
      for (const a of [0.6, 0.6 + Math.PI / 2]) for (const d of [1, -1]) fx.streak(x, y, x + Math.cos(a) * R * 1.3 * d, y + Math.sin(a) * R * 1.3 * d, 6, fire ? FLAME : GOLD, 0.35, true);
      fx.crack(x, y, R, 'rgba(40,24,6,0.6)', 10, fire ? EMBER : GOLD, 12);
      fx.debris(x, y, E.debris, fx.budget(22), 420 * k, 6, TAU);
      fx.smoke(x, y, DUST, fx.budget(12), R * 0.8);
      fx.embers(x, y, fire ? FLAME : GOLD, fx.budget(16), R * 0.7, 110);
      fx.decal(x, y, R * 0.55, 'rgba(50,34,10,0.35)', 9);
      fx.shake(15); fx.punch(0.04, x, y); fx.grade(fire ? '#ff7a1a' : '#ffcf4a', 0.22, 0.35);
    },
  });

  BD.defineEffect('dragonbite', {
    name: '龍首咬', category: '斬擊',
    desc: '接在手臂上的龍頭猛然撲咬：上下兩排白色獠牙的弧痕在前方合攏，牙縫噴出一口橘金火舌、火星四濺，咬合點閃白。適合撲咬、擒拿、龍頭攻擊。',
    params: {},
    spawn(fx, x, y, o) {
      const k = o.k || 1, ang = o.angle || 0, d = (o.shape === 'rect' ? (o.len || 200) * 0.6 : (o.radius || 160) * 0.6), bx = x + Math.cos(ang) * d, by = y + Math.sin(ang) * d;
      for (const s of [1, -1]) { // 上下顎：兩道往咬合點收的弧
        const a0 = ang + s * 0.9;
        fx.slash(bx - Math.cos(a0) * 40, by - Math.sin(a0) * 40, ang - s * 0.5, 1.2, 46, WHITE, 6, 0.18, { core: PALE });
        for (let i = 0; i < 4; i++) { const t = (i / 3 - 0.5) * 0.9, tx = bx + Math.cos(ang + t) * 30, ty = by + Math.sin(ang + t) * 30; fx.streak(tx + Math.cos(a0) * 18, ty + Math.sin(a0) * 18, tx, ty, 4, WHITE, 0.2, true); } // 獠牙
      }
      fx.flashAt(bx, by, 44, WHITE, 0.08);
      tongue(fx, bx, by, ang, 110 * k, 0.4);
      fx.sparks(bx, by, FLAME_L, fx.budget(14), 300 * k);
      fx.shake(7); fx.punch(0.02, bx, by);
    },
  });

  BD.defineEffect('bearwitness', {
    name: '見證吧', category: '大招',
    desc: '「見證吧！」龍頭插進地面再往上撩：落點地面整片燒紅龜裂、火柱一根接一根沖起，橘金火焰呈扇形往前翻滾，熔岩碎塊與火星往上噴，畫面染橘；作為預警蓄力（chargeFx）時是龍口裡的火焰越聚越亮。適合龍頭 / 火焰的上撩爆發。',
    params: { life: 0.7 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k || 1, src = o.src || null, r = (src && src.r) || 50;
      if (o.life && !o.shape) { // 預警蓄力：龍口聚火
        const life = Math.max(0.3, o.life);
        fx.charge(x, y, r * 3, FLAME, life, src, fx.budget(18));
        fx.glow(x, y, r * 2, EMBER, life + 0.3, 0.45, 0.4, src);
        fx.after(life * 0.3, () => fx.text(x, y - r - 60, '見證吧！', FLAME_L, 28));
        return;
      }
      const ang = o.angle || 0, R = (o.radius || 260) * (o.scale || 1);
      fx.flashAt(x, y, R * 0.4, FLAME_L, 0.12);
      for (let i = 0; i < 5; i++) fx.after(i * 0.05, () => { const a = ang + (i / 4 - 0.5) * 1.3, d = R * (0.35 + 0.15 * i); fx.pillar(x + Math.cos(a) * d, y + Math.sin(a) * d, 28 + 6 * i, FLAME, 0.55); });
      fx.slash(x, y, ang, 1.6, R, FLAME, 26, 0.4, { core: FLAME_L, trail: 2 });
      fx.shock(x, y, R * 0.15, R * 0.9, 0.4, EMBER, 7, FLAME_L);
      fx.crack(x, y, R * 0.8, 'rgba(60,16,4,0.65)', 10, EMBER, 10);
      fx.debris(x, y, '#3a1a0a', fx.budget(16), 380 * k, 5, TAU);
      fx.embers(x, y, FLAME, fx.budget(24), R * 0.7, 160);
      fx.sparkle(x, y, FLAME_L, fx.budget(12), 420, ang, 1.2);
      fx.decal(x + Math.cos(ang) * R * 0.4, y + Math.sin(ang) * R * 0.4, R * 0.45, E.decal, 10);
      fx.shake(13); fx.punch(0.035, x, y); fx.grade('#ff6a1a', 0.3, 0.45);
    },
  });

  BD.defineEffect('graftclaw', {
    name: '接肢追擊', category: '斬擊',
    desc: '背上接來的手臂一齊探出抓一把：三四道長短不一的灰褐爪痕從身側斜掃過前方、指尖拖出血色殘痕，掀起塵土；dragon 版本是左臂龍頭咬一口，獠牙弧痕 + 一口火。適合被動追擊、多臂連抓。',
    params: { radius: 200 },
    spawn(fx, x, y, o) {
      const ang = o.angle || 0, R = o.radius || 200;
      if (o.dragon) { BD.effects.dragonbite.spawn(fx, x, y, Object.assign({}, o, { radius: R })); return; }
      for (let i = 0; i < 4; i++) fx.after(i * 0.03, () => {
        const a = ang + (i - 1.5) * 0.28, rr = R * (0.7 + 0.1 * i);
        fx.slash(x, y, a, 0.9, rr, i % 2 ? '#c8b4a0' : '#9a7a6a', 7, 0.22, { core: '#f0e0d0' });
        fx.streak(x + Math.cos(a - 0.4) * rr, y + Math.sin(a - 0.4) * rr, x + Math.cos(a + 0.4) * rr, y + Math.sin(a + 0.4) * rr, 3, BLOOD, 0.3, false);
      });
      fx.smoke(x + Math.cos(ang) * R * 0.6, y + Math.sin(ang) * R * 0.6, DUST, fx.budget(5), R * 0.3);
      fx.shake(5);
    },
  });

  BD.defineEffect('graftsever', {
    name: '斷臂接龍', category: '增益',
    desc: '換階段的「接肢」儀式：先是一記金色斧光砍下（左臂齊肩斷開、血柱噴起、肉塊落地），接著一團暗紫的龍頭從遠處飛來接上斷口，接合處冒出血霧與火星，最後龍頭朝天噴出一道巨大火柱、橘紅震波炸開，頭頂浮出「列祖列宗……見證吧！」。life 為整段過場秒數（phase2.transFx）。',
    params: { life: 1.7 },
    spawn(fx, x, y, o) {
      const src = o.src || null, r = (src && src.r) || 50, life = Math.max(0.8, o.life || 1.7), ang = (src && src.face) || 0;
      const lx = x + Math.cos(ang - 1.2) * r * 0.8, ly = y + Math.sin(ang - 1.2) * r * 0.8; // 左肩
      fx.veil(life + 0.8, 0.4, '#0a0604');
      fx.after(life * 0.2, () => { // 砍斷左臂
        fx.slash(lx, ly, ang - 1.2 + Math.PI / 2, 1.6, r * 1.6, GOLD, 12, 0.25, { core: WHITE });
        fx.flashAt(lx, ly, r, WHITE, 0.1);
        fx.sparks(lx, ly, BLOOD, fx.budget(26), 420);
        fx.debris(lx, ly, FLESH, fx.budget(10), 260, 7, TAU);
        fx.decal(lx, ly, r * 0.6, 'rgba(90,6,20,0.5)', 12);
        fx.shake(12); fx.punch(0.03, lx, ly); fx.text(x, y - r - 50, '斷臂！', '#ff6070', 24);
      });
      fx.after(life * 0.45, () => { // 龍頭飛來接上
        const fx0 = x + Math.cos(ang + Math.PI * 0.8) * r * 6, fy0 = y + Math.sin(ang + Math.PI * 0.8) * r * 6;
        fx.streak(fx0, fy0, lx, ly, 16, '#5a2a48', 0.4, false); fx.streak(fx0, fy0, lx, ly, 5, FLAME, 0.35, true);
        fx.after(0.25, () => { fx.smoke(lx, ly, 'rgba(90,20,30,0.6)', fx.budget(10), r * 0.6); fx.embers(lx, ly, FLAME, fx.budget(12), r * 0.5, 100); fx.text(x, y - r - 50, '接肢！', FLAME_L, 26); });
      });
      fx.after(life * 0.75, () => fx.charge(lx, ly, r * 2.4, FLAME, life * 0.25, src, fx.budget(14)));
      fx.after(life, () => { // 龍頭朝天噴火
        fx.pillar(lx, ly, r * 0.9, FLAME, 1.1);
        fx.after(0.1, () => fx.pillar(lx, ly, r * 0.5, FLAME_L, 0.8));
        fx.flash('#ffc080', 0.3);
        fx.shock(x, y, r, r * 5, 0.6, FLAME, 8, FLAME_L);
        fx.after(0.1, () => fx.shock(x, y, r, r * 3.6, 0.5, EMBER, 5, PALE));
        fx.embers(x, y, FLAME, fx.budget(30), r * 2.2, 160);
        fx.text(x, y - r - 80, '列祖列宗……見證吧！', FLAME_L, 26);
        fx.shake(16); fx.punch(0.045, x, y); fx.grade('#ff6a1a', 0.35, 0.7);
      });
    },
  });

  BD.defineEffect('lordgold', {
    name: '黃金之王', category: '大招',
    desc: '「我乃黃金之王！」大招的終結重劈：落點閃白，一面巨大的葛孚雷金色獅紋盾徽浮在地上、一道金色光柱沖天，三層金色震波一層比一層大，十二道放射金光、地面金痕龜裂，碎石與金屑漫天，畫面泛金重震。適合王者降臨、終結重擊。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k || 1, R = 200 * (o.scale || 1);
      fx.flashAt(x, y, R, WHITE, 0.18); fx.flash('#fff0b0', 0.3);
      lionCrest(fx, x, y, R * 0.75, 0.9);
      fx.pillar(x, y, R * 0.45, GOLD, 0.9);
      fx.shock(x, y, R * 0.15, R * 1.1, 0.45, GOLD, 12, WHITE);
      fx.after(0.08, () => fx.shock(x, y, R * 0.3, R * 1.5, 0.55, AMBER, 7, PALE));
      fx.after(0.18, () => fx.ring(x, y, R * 0.5, R * 2.0, 0.6, GOLD, 4));
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + 0.13, l = R * (i % 2 ? 1.1 : 1.6); fx.streak(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, i % 2 ? 3 : 6, i % 2 ? GOLD : PALE, 0.45, true); }
      fx.crack(x, y, R * 1.1, 'rgba(40,24,6,0.6)', 12, GOLD, 16);
      fx.debris(x, y, E.debris, fx.budget(30), 480 * k, 6, TAU);
      fx.embers(x, y, GOLD, fx.budget(24), R, 130);
      fx.text(x, y - 110, '我乃黃金之王！', GOLD, 32);
      fx.shake(22); fx.punch(0.055, x, y); fx.grade('#ffcf4a', 0.35, 0.6);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
