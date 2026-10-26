'use strict';
// 特效庫｜葛瑞克專屬（stormcall / kneelquake / axegrind / goldaxeslam / dragonbite / bearwitness / graftclaw / graftsever / lordgold，
//   以及每個技能組各自的 goldaxeswing / graftpound / furyswing / stormbladecast / stormroll / stormleap / stormslam / axeleap / goldquakering /
//   graftbreath / stridingflame / grabflame / grabslam / witnessgouge / firerockburst / dragonpyre）：
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

  // ═══ 每個技能組各自的特效 ═══
  const arcPt = (x, y, a, d) => [x + Math.cos(a) * d, y + Math.sin(a) * d];
  const isFire = (E) => E.id === 'fire';
  // 一團翻滾的火：主火 + 亮芯 + 往上飄的火星
  function flameBall(fx, x, y, s, life) {
    fx.glow(x, y, s, V() < 0.5 ? FLAME : EMBER, life, 0.5, 0.35);
    if (V() < 0.4) fx.glow(x, y, s * 0.45, FLAME_L, life * 0.5, 0.6, 0.2);
    fx.embers(x, y, FLAME, 1, s * 0.4, 110);
  }

  BD.defineEffect('goldaxeswing', {
    name: '黃金戰斧雙揮', category: '斬擊',
    desc: '黃金雙刃戰斧的大弧橫掃：一道厚重的琥珀色斧弧帶兩層拖影與白熱刃口，弧外緣兩條平行的細金線（雙刃各一道），斧刃掃過的弧尾一閃獅紋金光、灑下金屑與塵土；揮得很慢很重，殘弧停留較久。適合巨斧、雙刃斧的大幅橫掃。',
    params: { arc: 2.6 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.7, o.k || 1), ang = o.angle || 0, arc = o.arc || 2.6, r = o.radius || 250, life = o.heavy ? 0.5 : 0.4, fire = isFire(E);
      fx.slash(x, y, ang, arc, r, fire ? FLAME : AMBER, Math.round(18 * k), life, { core: PALE, trail: 2, rim: '#5a3a10' });
      for (const f of [1.04, 0.9]) fx.slash(x, y, ang, arc * 0.95, r * f, GOLD, 2, life * 0.85, { rim: null }); // 雙刃的兩道鋒線
      const [ex, ey] = arcPt(x, y, ang + arc / 2, r * 0.9);
      fx.flashAt(ex, ey, 34, WHITE, 0.1);
      for (let i = 0; i < 6; i++) { const a = ang + Math.PI / 2 + i * TAU / 6; fx.streak(ex, ey, ex + Math.cos(a) * 26, ey + Math.sin(a) * 26, i % 2 ? 2 : 3, PALE, 0.2, true); }
      for (let i = 0; i < 5; i++) { const a = ang - arc / 2 + arc * (i + 0.5) / 5, [px, py] = arcPt(x, y, a, r * 0.85); fx.sparkle(px, py, i % 2 ? GOLD : PALE, fx.budget(3), 200, a + 1.4, 0.7); fx.puff(px, py, Math.cos(a) * 60, Math.sin(a) * 60, 8, 24, 0.5, 'sand', 0.3); }
      if (fire) fx.embers(x, y, FLAME, fx.budget(10), r * 0.6, 120);
      fx.shake(8); fx.punch(0.015, ex, ey);
    },
  });

  BD.defineEffect('graftpound', {
    name: '接肢巨臂捶地', category: '砸地',
    desc: '左邊那隻接來的巨大手臂握拳往地上一捶：落點壓出一個五指張開的巨大掌印、指尖各裂出一道裂痕，一圈灰褐塵浪貼地推開、碎石往上彈，掌印邊緣滲出淡淡血色。適合巨大手臂、拳頭的砸地。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k || 1), R = o.radius || 110, ang = o.angle || 0;
      fx.flashAt(x, y, R * 0.5, PALE, 0.08);
      fx.decal(x, y, R * 0.45, 'rgba(40,26,18,0.45)', 9); // 掌心
      for (let f = 0; f < 5; f++) { // 五指：往前張開的指痕 + 指尖裂痕
        const a = ang + (f - 2) * 0.42, [fx0, fy0] = arcPt(x, y, a, R * 0.35), [fx1, fy1] = arcPt(x, y, a, R * (0.8 + (f === 2 ? 0.12 : 0)));
        fx.streak(fx0, fy0, fx1, fy1, 10, 'rgba(40,26,18,0.5)', 1.6, false);
        fx.streak(fx1, fy1, fx1 + Math.cos(a) * R * 0.4, fy1 + Math.sin(a) * R * 0.4, 2, 'rgba(30,18,10,0.6)', 2.2, false);
      }
      fx.shock(x, y, R * 0.2, R * 1.2, 0.38, 'rgba(180,150,120,0.85)', 8, PALE);
      fx.after(0.06, () => fx.ring(x, y, R * 0.5, R * 1.6, 0.42, DUST, 4));
      fx.debris(x, y, E.debris, fx.budget(14), 320 * k, 4.5, TAU);
      fx.sparks(x, y, BLOOD, fx.budget(6), 160);
      fx.smoke(x, y, DUST, fx.budget(10), R * 0.7);
      fx.shake(10); fx.punch(0.025, x, y);
    },
  });

  BD.defineEffect('furyswing', {
    name: '狂怒五連', category: '斬擊',
    desc: '怒吼後雙手握斧的狂亂連揮：斧弧從金色漸染成怒紅，拖影短而急、弧尾甩出紅金火星，揮過處背後接肢的影子一閃；scale ≥ 1.4（延遲的最後一斧）時斧弧加倍粗、雙層殘弧、落點炸開震波與塵浪，浮出「喝啊！」。適合狂暴化的巨斧連斬。',
    params: { arc: 2.6 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.8, o.k || 1), ang = o.angle || 0, arc = o.arc || 2.6, r = o.radius || 240, last = (o.scale || 1) >= 1.4;
      const RAGE = '#ff5a2a';
      fx.slash(x, y, ang, arc, r, last ? RAGE : '#f08a30', Math.round((last ? 22 : 13) * k), last ? 0.42 : 0.26, { core: last ? WHITE : PALE, trail: last ? 3 : 1, rim: '#4a1408' });
      fx.slash(x, y, ang, arc * 0.92, r * 0.78, GOLD, Math.round(6 * k), 0.22, { core: WHITE, rim: null });
      fx.ghost(o.src, 0.18, RAGE);
      for (let i = 0; i < 4; i++) { const a = ang - arc / 2 + arc * (i + 0.5) / 4, [px, py] = arcPt(x, y, a, r * 0.95); fx.sparkle(px, py, i % 2 ? RAGE : GOLD, fx.budget(3), 260, a + 1.5, 0.6); }
      if (last) {
        fx.after(0.05, () => fx.slash(x, y, ang + 0.25, arc * 0.85, r * 0.9, '#c02a10', Math.round(12 * k), 0.32, { core: FLAME_L, rim: null }));
        const [mx, my] = arcPt(x, y, ang, r * 0.7);
        fx.shock(mx, my, 20, r * 0.7, 0.4, RAGE, 7, PALE);
        fx.debris(mx, my, E.debris, fx.budget(14), 340 * k, 5, TAU);
        fx.smoke(mx, my, DUST, fx.budget(10), r * 0.4);
        fx.text(x, y - 90, '喝啊！', '#ff8a5a', 26);
        fx.shake(14); fx.punch(0.03, mx, my); fx.grade('#ff5a2a', 0.18, 0.3);
      } else fx.shake(6);
    },
  });

  BD.defineEffect('stormbladecast', {
    name: '風暴之刃', category: '投射物',
    desc: '戰斧斧刃插進地面往前一撥：斧落處炸出一圈青白風壓與塵土、地面一道短刮痕，兩三道彎月形風弧順著出手方向扇形甩出、風絲往前狂吹、落葉被捲起；元素為火時風弧帶火星。適合以武器劈出風刃 / 劍氣（proj 的 fx）。',
    params: { arc: 1.1 },
    spawn(fx, x, y, o) {
      const E = o.E, src = o.src, rr = (src && src.r) || 40, ang = o.angle || 0, arc = o.arc || 0.55, n = o.n || 2, fire = isFire(E), c = fire ? FLAME : WIND, c2 = fire ? FLAME_L : WHITE;
      const [px, py] = arcPt(x, y, ang + 0.35, rr * 1.6); // 斧刃插地點（右前方）
      fx.flashAt(px, py, 30, c2, 0.08);
      fx.shock(px, py, 8, 90, 0.32, c, 5, c2);
      fx.streak(px - Math.cos(ang) * 40, py - Math.sin(ang) * 40, px + Math.cos(ang) * 30, py + Math.sin(ang) * 30, 6, 'rgba(50,40,24,0.5)', 1.4, false);
      fx.debris(px, py, E.debris, fx.budget(8), 240, 4, 1.4);
      for (let i = 0; i < n; i++) { const a = ang + (n > 1 ? (i / (n - 1) - 0.5) * arc : 0); fx.after(i * 0.03, () => { fx.slash(px, py, a, 1.2, 120, c, 9, 0.26, { core: c2, trail: 2 }); fx.streak(px, py, px + Math.cos(a) * 260, py + Math.sin(a) * 260, 2, c2, 0.22, true); }); }
      leaves(fx, px, py, fx.budget(fire ? 3 : 7), 260);
      if (fire) fx.embers(px, py, FLAME, fx.budget(10), 40, 120);
      fx.smoke(px, py, fire ? 'rgba(80,30,10,0.4)' : DUST, fx.budget(6), 30);
      fx.shake(6);
    },
  });

  BD.defineEffect('stormroll', {
    name: '風暴翻滾', category: '位移',
    desc: '巨大身軀往側邊一滾：沿路捲起一道青白旋風，風弧貼著翻滾軌跡一圈圈繞、落葉與塵土被捲著走，滾停處風一收、一圈小風壓環；元素為火時是火捲。適合帶風的翻滾、側閃（dash 的 fx）。',
    params: { len: 170, dur: 0.3 },
    spawn(fx, x, y, o) {
      const E = o.E, src = o.src || null, dur = o.dur || 0.3, len = o.len || 170, ang = o.angle || 0, fire = isFire(E), c = fire ? FLAME : WIND;
      for (let i = 0; i < 5; i++) fx.after(dur * i / 5, () => {
        const cx = src ? src.x : x + Math.cos(ang) * len * i / 5, cy = src ? src.y : y + Math.sin(ang) * len * i / 5;
        fx.slash(cx, cy, ang + i * 1.3, 2.2, 60 + 6 * i, c, 6, 0.22, { core: WHITE });
        fx.puff(cx, cy, 0, 0, 12, 30, 0.5, 'sand', 0.3);
        leaves(fx, cx, cy, fx.budget(2), 160);
      });
      fx.after(dur, () => { const ex = src ? src.x : x + Math.cos(ang) * len, ey = src ? src.y : y + Math.sin(ang) * len; fx.ring(ex, ey, 20, 110, 0.3, fire ? FLAME_L : PALE, 3); fx.shake(4); });
    },
  });

  BD.defineEffect('stormleap', {
    name: '乘風躍起', category: '位移',
    desc: '翻滾後借著旋風一躍而起：腳下炸開一圈青白風壓、塵土往外推，一道旋轉的風柱托著身形往上沖，金色落葉被吸上去打轉；元素為火時是火旋風柱。適合乘風跳躍、旋風起跳。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k || 1), fire = isFire(E), c = fire ? FLAME : WIND, c2 = fire ? EMBER : WIND_D;
      fx.shock(x, y, 10, 150 * Math.sqrt(k), 0.4, c, 7, WHITE);
      swirl(fx, x, y, 90, 5, 0.35, c, V() * TAU);
      fx.after(0.08, () => swirl(fx, x, y, 55, 3, 0.3, c2, V() * TAU));
      fx.pillar(x, y, 30, c, 0.5);
      leaves(fx, x, y, fx.budget(8), 220);
      fx.smoke(x, y, fire ? 'rgba(80,30,10,0.4)' : DUST, fx.budget(8), 40);
      fx.decal(x, y, 28, 'rgba(30,22,14,0.35)', 6);
      fx.shake(8);
    },
  });

  BD.defineEffect('stormslam', {
    name: '風暴突襲', category: '砸地',
    desc: '從旋風裡一斧劈下：落點閃白、金色斧痕十字裂開，一圈青白旋風環從落點往外螺旋捲開、把塵土和落葉甩向四周，風壓環後面跟一道金色震波；元素為火時旋風染成火捲。適合乘風躍起後的下劈。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.7, o.k || 1), R = 140 * (o.scale || 1), fire = isFire(E), c = fire ? FLAME : WIND;
      fx.flashAt(x, y, R * 0.7, WHITE, 0.12);
      for (const a of [0.4, 0.4 + Math.PI / 2]) for (const d of [1, -1]) fx.streak(x, y, x + Math.cos(a) * R * 1.1 * d, y + Math.sin(a) * R * 1.1 * d, 5, GOLD, 0.32, true);
      fx.shock(x, y, R * 0.1, R * 1.1, 0.38, GOLD, 8, WHITE);
      const a0 = V() * TAU;
      for (let i = 0; i < 3; i++) fx.after(0.04 + i * 0.06, () => swirl(fx, x, y, R * (0.9 + 0.35 * i), 4, 0.3, c, a0 + i * 0.8)); // 旋風往外螺旋
      fx.after(0.1, () => fx.ring(x, y, R * 0.4, R * 1.7, 0.45, fire ? FLAME_L : PALE, 3));
      fx.crack(x, y, R * 0.85, 'rgba(40,24,6,0.6)', 9, GOLD, 9);
      fx.debris(x, y, E.debris, fx.budget(16), 380 * k, 5, TAU);
      leaves(fx, x, y, fx.budget(fire ? 4 : 10), R * 2);
      if (fire) fx.embers(x, y, FLAME, fx.budget(14), R * 0.7, 140);
      fx.smoke(x, y, DUST, fx.budget(10), R * 0.7);
      fx.shake(13); fx.punch(0.035, x, y); fx.grade(fire ? '#ff7a1a' : '#bff0e0', 0.16, 0.3);
    },
  });

  BD.defineEffect('axeleap', {
    name: '黃金戰斧躍起', category: '位移',
    desc: '雙手橫握戰斧、彎腰一蹬躍起：腳下踩出深色凹坑與放射裂紋、厚重塵浪往外滾，斧刃反光拉出一道往上的金色光痕，金屑被帶著往上飄；元素為火時塵浪裡夾火星。適合沉重巨人的起跳。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.7, o.k || 1), src = o.src, rr = (src && src.r) || 40, ang = (src && src.face) || 0, fire = isFire(E);
      fx.shock(x, y, 10, 160 * Math.sqrt(k), 0.45, 'rgba(180,155,115,0.85)', 9, PALE);
      fx.decal(x, y, 34, 'rgba(30,20,10,0.45)', 7);
      fx.crack(x, y, 70, 'rgba(30,20,10,0.6)', 7, null, 6);
      const [ax, ay] = arcPt(x, y, ang + 0.7, rr * 0.9); // 斧刃反光：一道往上的金光
      fx.streak(ax, ay, ax, ay - 160, 6, GOLD, 0.3, true); fx.streak(ax, ay, ax, ay - 120, 2, WHITE, 0.24, true);
      fx.flashAt(ax, ay, 24, PALE, 0.1);
      fx.embers(x, y, GOLD, fx.budget(10), 40, 170);
      fx.debris(x, y, E.debris, fx.budget(12), 280, 5, TAU);
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + V() * 0.3; fx.puff(x, y, Math.cos(a) * 130, Math.sin(a) * 130, 14, 40, 0.7, 'sand', 0.35); }
      if (fire) fx.embers(x, y, FLAME, fx.budget(10), 50, 140);
      fx.shake(10);
    },
  });

  BD.defineEffect('goldquakering', {
    name: '黃金餘震', category: '震波',
    desc: '重劈落地半拍後的外圈餘震：一圈厚塵浪貼地推開，前緣鑲一道金色細環，環上每隔一段立起一小簇金色碎光、碎石沿環彈起，地面被環拖出一道道徑向金痕；元素為火時前緣是火線、碎光換成火星。適合重擊後的外環二次判定。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, r = o.radius || 260, r0 = o.r0 || r * 0.6, fire = isFire(E), c = fire ? FLAME : GOLD;
      fx.shock(x, y, r0 * 0.8, r, 0.42, 'rgba(180,155,115,0.85)', 8, fire ? FLAME_L : PALE);
      fx.after(0.05, () => fx.ring(x, y, r0, r * 1.08, 0.38, c, 3));
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * TAU + V() * 0.3, [ax, ay] = arcPt(x, y, a, r0), [bx, by] = arcPt(x, y, a, r * 0.98);
        fx.streak(ax, ay, bx, by, 3, c, 0.3, true);
        fx.sparkle(bx, by, fire ? FLAME_L : PALE, fx.budget(2), 140, -Math.PI / 2, 0.8);
        fx.debris(bx, by, E.debris, fx.budget(2), 150, 3, 6);
      }
      fx.smoke(x, y, DUST, fx.budget(8), r * 0.8);
      fx.shake(7);
    },
  });

  BD.defineEffect('graftbreath', {
    name: '龍頭火息', category: '區域',
    desc: '接在左臂上的龍頭張大嘴噴出的橘金烈焰：火舌從龍口往外一波波翻滾，越遠越寬越暗、最前緣一團亮火球，扇形邊緣捲起黑煙，地上留下一長條焦痕與殘火；多格接力時就是從右燒到左的龍息橫掃。非火元素時火焰改用元素色。適合龍頭 / 接肢的火焰吐息（cone 判定的 fx）。',
    params: { arc: 1.1 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k || 1), r = o.radius || 300, ang = o.angle || 0, arc = o.arc || 1.1, src = o.src, rr = (src && src.r) || 40, fire = isFire(E);
      const mx = x + Math.cos(ang) * rr * 0.9, my = y + Math.sin(ang) * rr * 0.9;
      fx.flashAt(mx, my, 34, fire ? FLAME_L : E.core, 0.1);
      for (let i = 0; i < 6; i++) fx.after(i * 0.035, () => {
        const q = (i + 1) / 6, d = r * (0.15 + 0.85 * q);
        for (let j = 0; j < 2 + (i >> 1); j++) { const a = ang + (V() - 0.5) * arc * 0.8, dd = d * (0.6 + 0.4 * V()), px = x + Math.cos(a) * dd, py = y + Math.sin(a) * dd; if (fire) flameBall(fx, px, py, (24 + 30 * q) * k, 0.45); else fx.glow(px, py, (24 + 30 * q) * k, E.glow, 0.45, 0.45, 0.3); }
        if (V() < 0.5) fx.smoke(x + Math.cos(ang) * d, y + Math.sin(ang) * d, 'rgba(40,20,10,0.45)', 1, 30);
      });
      const [tx, ty] = arcPt(x, y, ang, r * 0.92);
      fx.after(0.2, () => { fx.glow(tx, ty, 50 * k, fire ? FLAME_L : E.core, 0.28, 0.7, 0.5); fx.decal(tx, ty, r * 0.16, E.decal, 6); });
      fx.decal(x + Math.cos(ang) * r * 0.55, y + Math.sin(ang) * r * 0.55, r * 0.14, 'rgba(40,14,4,0.3)', 5);
      fx.sparkle(mx, my, fire ? FLAME_L : E.core, fx.budget(4), 420, ang, arc * 0.4);
      fx.shake(3);
    },
  });

  BD.defineEffect('stridingflame', {
    name: '噴火進軍', category: '區域',
    desc: '邊大步往前走邊從龍口噴出細長的火柱：一道筆直的白芯火束往正前方貫出、兩側翻著橘紅火團與黑煙，火束盡頭濺開火花打在地上；以扇形判定（cone）出現時是收尾那口橫掃——一大片火浪往前翻、終點熱浪環。適合邊移動邊噴火（rect / cone 判定的 fx）。',
    params: { len: 400, width: 96 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k || 1), ang = o.angle || 0, fire = isFire(E), c = fire ? FLAME : E.glow, cl = fire ? FLAME_L : E.core;
      if (o.shape === 'cone') { // 收尾：一大口火浪
        const r = o.radius || 330, arc = o.arc || 2.1;
        for (let i = 0; i < 8; i++) fx.after(i * 0.04, () => { const q = (i + 1) / 8; for (let j = 0; j < 3; j++) { const a = ang + (V() - 0.5) * arc * 0.85, d = r * q * (0.7 + 0.3 * V()); if (fire) flameBall(fx, x + Math.cos(a) * d, y + Math.sin(a) * d, (30 + 30 * q) * k, 0.5); else fx.glow(x + Math.cos(a) * d, y + Math.sin(a) * d, (30 + 30 * q) * k, c, 0.5, 0.45, 0.3); } });
        fx.after(0.3, () => fx.shock(x, y, r * 0.5, r * 1.05, 0.35, c, 5, cl));
        fx.smoke(x + Math.cos(ang) * r * 0.6, y + Math.sin(ang) * r * 0.6, 'rgba(40,20,10,0.45)', fx.budget(8), r * 0.3);
        fx.shake(8); fx.grade('#ff6a1a', 0.12, 0.25);
        return;
      }
      const len = o.len || 400, w = (o.width || 96) * (o.arc ? 0.8 : 1), [tx, ty] = arcPt(x, y, ang, len);
      fx.beam(x, y, tx, ty, w * 0.35, c, 0.22, cl);
      fx.beam(x, y, tx, ty, w * 0.1, WHITE, 0.16, WHITE);
      for (let i = 0; i < 5; i++) { const u = 0.2 + 0.8 * V(), l = (V() - 0.5) * w * 0.8, px = x + Math.cos(ang) * len * u - Math.sin(ang) * l, py = y + Math.sin(ang) * len * u + Math.cos(ang) * l; if (fire) flameBall(fx, px, py, 18 + 16 * u, 0.35); else fx.glow(px, py, 18 + 16 * u, c, 0.35, 0.45, 0.3); }
      fx.sparkle(tx, ty, cl, fx.budget(6), 260, ang, 1.4);
      fx.smoke(tx, ty, 'rgba(40,20,10,0.4)', fx.budget(2), 30);
      fx.shake(2);
    },
  });

  BD.defineEffect('grabflame', {
    name: '擒噬噴火', category: '區域',
    desc: '龍頭咬住獵物、提到半空裡近距離灌火：被咬處一團脹大收縮的亮火、火舌從牙縫往四面噴，黑煙與火星往上冒，獵物周圍一圈熱浪漣漪。適合擒拿中的持續灼燒（小範圍 circle 多段判定的 fx）。',
    params: { radius: 95 },
    spawn(fx, x, y, o) {
      const E = o.E, R = o.radius || 95, ang = o.angle || 0, fire = isFire(E), c = fire ? FLAME : E.glow, cl = fire ? FLAME_L : E.core;
      fx.glow(x, y, R * 0.9, c, 0.35, 0.6, 0.5);
      fx.flashAt(x, y, R * 0.4, cl, 0.1);
      for (let i = 0; i < 5; i++) { const a = ang + Math.PI + (i - 2) * 0.6; tongue(fx, x, y, a, R * 0.8, 0.3); } // 從牙縫往四面噴
      fx.ring(x, y, R * 0.4, R * 1.2, 0.3, cl, 2);
      fx.embers(x, y, c, fx.budget(10), R * 0.5, 150);
      fx.smoke(x, y, 'rgba(40,20,10,0.5)', fx.budget(4), R * 0.4);
      fx.shake(3);
    },
  });

  BD.defineEffect('grabslam', {
    name: '擒噬摔地', category: '砸地',
    desc: '龍頭咬著獵物往地上狠狠一摔：落點一團火焰轟然炸開、火團呈放射狀往外翻滾，兩圈橘紅震波，地面燒出焦黑的凹坑與發紅的裂縫，熔岩碎塊往外噴；龍口最後補一口火舌。適合擒拿後的摔地火爆。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.7, o.k || 1), R = (o.radius || 150) * (o.scale || 1), ang = o.angle || 0, fire = isFire(E), c = fire ? FLAME : E.glow, cl = fire ? FLAME_L : E.core;
      fx.flashAt(x, y, R * 0.8, cl, 0.14); fx.flash('#ffc080', 0.12);
      fx.shock(x, y, R * 0.1, R * 1.1, 0.4, c, 9, cl);
      fx.after(0.07, () => fx.shock(x, y, R * 0.3, R * 1.5, 0.5, fire ? EMBER : E.glow, 5, PALE));
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + V() * 0.3; fx.after(0.02 * i, () => { const [px, py] = arcPt(x, y, a, R * 0.6); if (fire) flameBall(fx, px, py, 36, 0.55); else fx.glow(px, py, 36, c, 0.55, 0.45, 0.3); }); }
      fx.crack(x, y, R * 0.9, 'rgba(50,14,4,0.65)', 10, fire ? EMBER : E.crack, 10);
      fx.decal(x, y, R * 0.5, 'rgba(30,10,4,0.45)', 10);
      fx.debris(x, y, '#3a1a0a', fx.budget(16), 380 * k, 5, TAU);
      fx.embers(x, y, c, fx.budget(18), R * 0.7, 160);
      fx.after(0.12, () => tongue(fx, x - Math.cos(ang) * R * 0.6, y - Math.sin(ang) * R * 0.6, ang, R * 0.9, 0.35));
      fx.shake(15); fx.punch(0.04, x, y); fx.grade('#ff6a1a', 0.25, 0.4);
    },
  });

  BD.defineEffect('witnessgouge', {
    name: '龍頭犁地', category: '砸地',
    desc: '「見證吧！」前半段：龍頭插進地面拖著走，每經過一處地面就被犁開、炸出一根火柱與熔岩碎塊，留下一道發紅的焦黑溝痕與殘火；多段接力時火痕連成半圈。適合龍頭 / 巨物拖地、沿路噴發（小範圍 circle 判定的 fx）。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k || 1), R = (o.radius || 110) * (o.scale || 1), src = o.src, fire = isFire(E), c = fire ? FLAME : E.glow, cl = fire ? FLAME_L : E.core;
      const a = src ? Math.atan2(y - src.y, x - src.x) + Math.PI / 2 : 0; // 溝痕沿拖行方向（繞著葛瑞克轉）
      fx.streak(x - Math.cos(a) * R * 0.7, y - Math.sin(a) * R * 0.7, x + Math.cos(a) * R * 0.7, y + Math.sin(a) * R * 0.7, 16, 'rgba(40,12,4,0.55)', 3, false);
      fx.streak(x - Math.cos(a) * R * 0.6, y - Math.sin(a) * R * 0.6, x + Math.cos(a) * R * 0.6, y + Math.sin(a) * R * 0.6, 4, fire ? EMBER : E.crack, 0.9, true);
      fx.pillar(x, y, R * 0.3, c, 0.5);
      fx.glow(x, y, R * 0.8, c, 0.4, 0.55, 0.4);
      fx.flashAt(x, y, R * 0.3, cl, 0.08);
      fx.debris(x, y, '#3a1a0a', fx.budget(8), 300 * k, 4.5, TAU);
      fx.embers(x, y, c, fx.budget(8), R * 0.4, 160);
      fx.smoke(x, y, 'rgba(40,20,10,0.4)', fx.budget(3), R * 0.3);
      fx.shake(5);
    },
  });

  BD.defineEffect('firerockburst', {
    name: '火岩墜落', category: '爆炸',
    desc: '龍口噴上天的燃燒火岩砸回地面：落點岩塊碎裂、一團橘紅火焰炸開，熔岩碎片往四周飛、地上一灘發紅的熔渣與焦痕，殘火冒著黑煙。適合火山彈、燃燒岩塊、火雨落點（lob / rain 的 fx）。',
    params: { radius: 85 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k || 1), R = o.radius || 85, fire = isFire(E), c = fire ? FLAME : E.glow, cl = fire ? FLAME_L : E.core;
      fx.flashAt(x, y, R * 0.6, cl, 0.1);
      fx.glow(x, y, R * 1.1, c, 0.4, 0.6, 0.5);
      fx.shock(x, y, R * 0.15, R * 1.05, 0.32, c, 6, cl);
      fx.debris(x, y, '#3a1a0a', fx.budget(10), 320 * k, 5, TAU); // 岩塊碎片
      fx.sparks(x, y, cl, fx.budget(10), 280);
      fx.decal(x, y, R * 0.45, 'rgba(60,16,4,0.45)', 8);
      fx.crack(x, y, R * 0.6, 'rgba(40,12,4,0.55)', 7, fire ? EMBER : E.crack, 5);
      fx.embers(x, y, c, fx.budget(8), R * 0.5, 120);
      fx.smoke(x, y, 'rgba(40,20,10,0.5)', fx.budget(5), R * 0.4);
      fx.shake(6);
    },
  });

  BD.defineEffect('dragonpyre', {
    name: '列祖火柱', category: '爆炸',
    desc: '大招「列祖列宗，見證吧！」的終幕：龍頭插地後，火柱沿直線一根接一根往前炸開——每根都是一道沖天的白芯火柱、底下一圈橘紅火環與龜裂，火團往四周翻滾、熔岩碎塊往上噴。適合直線連鎖的火柱噴發（erupt 的 fx）。',
    params: { radius: 95 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k || 1), R = o.radius || 95, fire = isFire(E), c = fire ? FLAME : E.glow, cl = fire ? FLAME_L : E.core;
      fx.pillar(x, y, R * 0.55, c, 0.7);
      fx.after(0.05, () => fx.pillar(x, y, R * 0.25, cl, 0.5));
      fx.flashAt(x, y, R * 0.6, cl, 0.12);
      fx.shock(x, y, R * 0.2, R * 1.2, 0.4, c, 7, cl);
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + V(); const [px, py] = arcPt(x, y, a, R * 0.5); if (fire) flameBall(fx, px, py, 30, 0.5); else fx.glow(px, py, 30, c, 0.5, 0.45, 0.3); }
      fx.crack(x, y, R * 0.8, 'rgba(50,14,4,0.6)', 9, fire ? EMBER : E.crack, 7);
      fx.debris(x, y, '#3a1a0a', fx.budget(10), 360 * k, 5, TAU);
      fx.embers(x, y, c, fx.budget(12), R * 0.5, 200);
      fx.shake(9); fx.punch(0.02, x, y);
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
