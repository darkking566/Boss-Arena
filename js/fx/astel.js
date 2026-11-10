'use strict';
// 黑暗棄子・艾絲緹專屬特效：紫白宇宙光束、彩色星屑球、重力氣泡、傳送門與隕石。純視覺，只用 BD.vrng，不參與傷害或狀態。
// 配色依已查看的官方畫作與遊戲畫面：深藍黑虛空、青藍翅膜、紫白能量，星屑球混有藍 / 洋紅 / 橘 / 青綠（docs/research/astel/）。
(function (G) {
  const BD = G.BD, V = BD.vrng, TAU = Math.PI * 2;
  const VIO = '#b9a2ff', DEEP = '#2a1f6b', CORE = '#fff2ff', BLUE = '#6fb4ff', MAG = '#e06cff', AMB = '#ffb45a', MINT = '#7dffd0', INK = '#0a0b22';
  const STARS = [BLUE, MAG, AMB, MINT, VIO, CORE];
  BD.defineElement('voidstar', { name: '虛空星屑', rim: '#080a22', debris: '#3b3f77', core: CORE, glow: VIO, particle: '#d6c8ff',
    smoke: 'rgba(54,40,128,0.42)', decal: 'rgba(14,12,48,0.45)', crack: '#a98cff', extra: 'motes' });
  BD.KIND_EL.stardust = 'voidstar';
  const at = (x, y, a, d, l) => [x + Math.cos(a) * d - Math.sin(a) * (l || 0), y + Math.sin(a) * d + Math.cos(a) * (l || 0)];
  // 彩色星屑球：泡泡粒子向外飄散，顏色取自原作星屑的雜色
  function orbs(fx, x, y, r, n, speed) {
    for (let i = 0; i < fx.budget(n); i++) {
      const a = V() * TAU, d = Math.sqrt(V()) * r, v = (speed || 70) * (0.3 + V());
      if (!fx.part(BD.PK.BUBBLE, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * v, Math.sin(a) * v - 20, 0.7 + V() * 0.9, STARS[i % STARS.length], 2.5 + V() * 5, 1.2)) break;
    }
  }
  function motes(fx, x, y, r, n, speed) {
    for (let i = 0; i < fx.budget(n); i++) {
      const a = V() * TAU, d = V() * r, v = (speed || 60) * (0.4 + V());
      if (!fx.part(BD.PK.MOTE, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * v, Math.sin(a) * v - 15, 0.6 + V() * 0.9, i % 3 ? '#e4d9ff' : CORE, 1.8 + V() * 2.4, 1.4)) break;
    }
  }
  // 四芒星爆（十字星芒）
  function flare(fx, x, y, r, life, color) {
    fx.flashAt(x, y, r, color || CORE, life || 0.14);
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.4, [ex, ey] = at(x, y, a, r * 1.2, 0), [sx, sy] = at(x, y, a, -r * 1.2, 0); fx.streak(sx, sy, ex, ey, 3 + r * 0.04, i % 2 ? VIO : CORE, life || 0.2, true); }
  }
  // fx.stream 的霧團半徑隨半角的 tan 暴增（半角 75° 約 800px）：寬扇形拆成數道 ≤0.7 rad 的窄流，每道再縮小，霧只蓋住判定範圍
  function nebula(fx, x, y, a, arc, len, dur) {
    const n = Math.max(1, Math.ceil(arc / 0.7)), sub = Math.min(arc, 0.7);
    for (let i = 0; i < n; i++) fx.stream(x, y, n === 1 ? a : a - arc / 2 + sub / 2 + (arc - sub) * i / (n - 1), sub, len, [CORE, VIO, '#5a45c8', '#241848'], dur || 0.25, 0.6);
  }
  const E = (id, name, category, desc, spawn) => BD.defineEffect(id, { name, category, params: {}, desc, spawn });

  E('astelbeam', '艾絲緹・宇宙光束', '區域', '紫白光束貫穿整條判定：最亮的芯、外層紫光、沿路星屑球與爆裂星芒，起點與終點各一次十字星爆。', (fx, x, y, o) => {
    const a = o.angle || 0, len = o.len || 940, w = o.width || 150, [ex, ey] = at(x, y, a, len, 0);
    fx.beam(x, y, ex, ey, w * 0.9, DEEP, 0.34, MAG); fx.beam(x, y, ex, ey, w * 0.55, VIO, 0.3, CORE); fx.beam(x, y, ex, ey, w * 0.2, CORE, 0.26, '#ffffff');
    nebula(fx, x, y, a, Math.max(0.12, w / len * 1.6), len, 0.22);
    for (let i = 0; i < 9; i++) fx.after(i * 0.02, () => { const [px, py] = at(x, y, a, len * (0.1 + 0.9 * V()), (V() - 0.5) * w); orbs(fx, px, py, 22, 3, 90); motes(fx, px, py, 24, 4, 120); });
    flare(fx, x, y, w * 0.9, 0.22); flare(fx, ex, ey, w * 0.7, 0.2);
    fx.grade('#6c58d8', 0.08, 0.35); fx.shake(8, a);
  });
  E('astelwave', '艾絲緹・黑暗波', '震波', '貼地環形黑暗波：暗色寬環內緣帶紫白亮線，環上不斷擠出星屑球。', (fx, x, y, o) => {
    const r = o.radius || 300, r0 = o.r0 || r * 0.7;
    fx.shock(x, y, r0, r, 0.55, VIO, 14, CORE); fx.ring(x, y, r0 * 0.9, r * 1.04, 0.7, 'rgba(36,24,112,0.55)', 20);
    for (let i = 0; i < 14; i++) fx.after(i * 0.012, () => { const an = i * TAU / 14 + V() * 0.3, [px, py] = at(x, y, an, r * 0.92, 0); orbs(fx, px, py, 16, 3, 80); });
    motes(fx, x, y, r, 26, 90); fx.shake(5);
  });
  E('astelstab', '艾絲緹・星尾刺落', '砸地', '星屑尾尖由上刺入落點：一道紫白光柱、放射裂紋、四芒星爆與彩色球四散。', (fx, x, y, o) => {
    const r = o.radius || 105;
    fx.pillar(x, y, r * 0.6, VIO, 0.5); flare(fx, x, y, r * 0.9, 0.16); fx.crack(x, y, r * 1.2, INK, 8, VIO, 7);
    fx.shock(x, y, 8, r * 1.3, 0.4, VIO, 8, CORE); orbs(fx, x, y, r * 0.5, 16, 190); fx.shake(6);
  });
  E('astelswipe', '艾絲緹・星雲揮臂', '斬擊', '長臂揮出一整片星雲：扇形紫霧塗滿判定，弧緣拖出彩色星屑。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 360, arc = o.arc || 2.6;
    nebula(fx, x, y, a, arc, r, 0.2); fx.slash(x, y, a, arc, r, INK, 20, 0.34, { core: VIO, trail: 2 });
    for (let i = 0; i < 9; i++) fx.after(i * 0.02, () => { const an = a - arc / 2 + arc * i / 8, [px, py] = at(x, y, an, r * 0.88, 0); orbs(fx, px, py, 18, 3, 110); });
    fx.shake(6, a);
  });
  E('astelshove', '艾絲緹・星雲推掌', '區域', '手掌推出的一道寬星雲：掌前留下緩緩消散的紫霧與星屑。', (fx, x, y, o) => {
    const a = o.angle || 0, len = o.len || 330;
    nebula(fx, x, y, a, 0.5, len, 0.3); const [ex, ey] = at(x, y, a, len * 0.8, 0); fx.shock(ex, ey, 20, 120, 0.4, VIO, 8, CORE); orbs(fx, ex, ey, 70, 8, 90); fx.shake(4, a);
  });
  E('astelbite', '艾絲緹・彎鉗閉合', '斬擊', '兩支黑色彎鉗從兩側夾合：紫白弧痕交叉、碎光四濺。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 260;
    fx.slash(x, y, a - 0.5, 1.0, r * 0.95, INK, 18, 0.2, { core: VIO }); fx.slash(x, y, a + 0.5, 1.0, r * 0.95, INK, 18, 0.2, { core: VIO });
    const [px, py] = at(x, y, a, r * 0.75, 0); flare(fx, px, py, 55, 0.14); fx.sparks(px, py, CORE, 10, 220); fx.shake(5, a);
  });
  E('asteltail', '艾絲緹・星屑尾鞭', '斬擊', '一串彩色星屑球甩成弧形長鞭，尾尖帶出星芒。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 440, arc = o.arc || 2.7;
    fx.slash(x, y, a, arc, r, INK, 22, 0.38, { core: BLUE, trail: 3 });
    for (let i = 0; i < 14; i++) fx.after(i * 0.018, () => { const an = a - arc / 2 + arc * i / 13, [px, py] = at(x, y, an, r * (0.55 + 0.4 * V()), 0); orbs(fx, px, py, 14, 3, 100); if (i % 5 === 0) flare(fx, px, py, 22, 0.1); });
    fx.shake(7);
  });
  E('astelvanish', '艾絲緹・化球瞬移', '位移', '身形收成一顆發光球：起點內縮光環、一圈星屑向內吸入，原地留一道淡紫殘光。', (fx, x, y, o) => {
    const r = o.src ? o.src.r : 80;
    fx.ring(x, y, r * 2.4, r * 0.2, 0.45, VIO, 5); fx.charge(x, y, r * 1.4, CORE, 0.35, null, 20); flare(fx, x, y, r * 0.9, 0.18); orbs(fx, x, y, r * 0.6, 12, 120); fx.shake(3);
  });
  E('astelgrab', '艾絲緹・俯衝擒抱', '砸地', '從天而降的一記合鉗：光柱砸落、鉗形弧光夾緊、雙層震波與一圈星屑，地面留下放射裂紋。', (fx, x, y, o) => {
    const r = o.radius || 215;
    fx.flashAt(x, y, r * 0.9, CORE, 0.13); fx.shock(x, y, 20, r * 1.15, 0.5, VIO, 14, CORE); fx.after(0.08, () => fx.shock(x, y, r * 0.3, r * 1.6, 0.75, 'rgba(120,96,230,0.5)', 9, VIO));
    for (const s of [-1, 1]) fx.slash(x, y, (o.angle || 0) + s * 0.6, 1.1, r * 0.8, INK, 20, 0.28, { core: VIO });
    fx.crack(x, y, r * 1.2, INK, 10, VIO, 10); fx.pillar(x, y, r * 0.5, VIO, 0.6); orbs(fx, x, y, r * 0.7, 30, 260); flare(fx, x, y, r * 0.7, 0.2); fx.shake(13); fx.punch(0.04, x, y);
  });
  E('astelgravity', '艾絲緹・重力氣泡', '增益', '落點長出一顆半透明紫色重力氣泡，向上吸起碎光，氣泡內星點緩緩旋轉。', (fx, x, y, o) => {
    const r = o.radius || 175;
    fx.shock(x, y, r * 0.2, r, 0.5, VIO, 8, CORE); fx.ring(x, y, r, r * 0.55, 0.9, 'rgba(210,190,255,0.5)', 5); fx.glow(x, y, r, VIO, 0.9, 0.32, 0.1);
    for (let i = 0; i < fx.budget(18); i++) { const an = V() * TAU, d = V() * r; fx.part(BD.PK.MOTE, x + Math.cos(an) * d, y + Math.sin(an) * d, 0, -90 - V() * 80, 0.9 + V() * 0.5, STARS[i % STARS.length], 2 + V() * 3, 0.6); }
    fx.shake(3);
  });
  E('astelcrush', '艾絲緹・重力壓碎', '砸地', '氣泡猛然收縮、白閃後炸成向下壓的環形震波，地面被壓出同心裂紋。', (fx, x, y, o) => {
    const r = o.radius || 175;
    fx.ring(x, y, r * 1.1, r * 0.1, 0.18, CORE, 7); fx.after(0.12, () => { flare(fx, x, y, r * 0.9, 0.2); fx.shock(x, y, 10, r * 1.5, 0.55, VIO, 14, CORE); fx.crack(x, y, r * 1.1, INK, 9, VIO, 9); orbs(fx, x, y, r * 0.6, 24, 230); fx.shake(11); fx.punch(0.03, x, y); });
  });
  E('astelstarburst', '艾絲緹・星屑爆散', '爆炸', '飛退時留下的一顆顆彩色星屑球依序炸開，各帶一圈小震波。', (fx, x, y, o) => {
    const r = o.radius || 85; fx.flashAt(x, y, r, CORE, 0.1); fx.shock(x, y, 6, r * 1.4, 0.4, MAG, 8, CORE); orbs(fx, x, y, r * 0.4, 12, 170); motes(fx, x, y, r, 8, 140); fx.shake(4);
  });
  E('astelclone', '艾絲緹・星影分身', '增益', '落點浮出一個半透明紫色星影，鉗形收攏，帶一圈亮環。', (fx, x, y, o) => {
    const r = o.radius || 150;
    fx.ring(x, y, r * 1.2, r * 0.2, 0.3, VIO, 5); fx.glow(x, y, r * 0.8, VIO, 0.35, 0.35, 0.2);
    for (const s of [-1, 1]) fx.slash(x, y, TAU * 0.25 + s * 0.4, 1.2, r * 0.9, INK, 12, 0.2, { core: CORE });
    flare(fx, x, y, r * 0.5, 0.14); orbs(fx, x, y, r * 0.5, 10, 130); fx.shake(4);
  });
  E('astelmeteor', '艾絲緹・隕星墜落', '爆炸', '從天外落下的彩色隕石：落點強光、紫白爆環、碎星四濺與焦黑印記。', (fx, x, y, o) => {
    const r = o.radius || 95;
    fx.flashAt(x, y, r * 1.3, CORE, 0.14); fx.shock(x, y, 10, r * 1.5, 0.5, VIO, 12, CORE); fx.crack(x, y, r * 1.2, INK, 9, VIO, 8);
    fx.debris(x, y, '#58509a', fx.budget(14), 300, 6, TAU); orbs(fx, x, y, r * 0.6, 20, 240); flare(fx, x, y, r * 0.8, 0.18); fx.shake(8); fx.punch(0.02, x, y);
  });
  E('astelportal', '艾絲緹・星空傳送門', '增益', '身前張開一道圓形星空光陣，多層光環內縮、內部星點旋轉，蓄到最後一閃。', (fx, x, y, o) => {
    const r = o.src ? o.src.r * 2.6 : 200, life = o.life || 1.2, a = o.src ? o.src.face || 0 : 0, [px, py] = at(x, y, a, r * 0.9, 0);
    fx.charge(px, py, r, VIO, life, null, 30); for (let i = 0; i < 4; i++) fx.after(i * life * 0.22, () => { fx.ring(px, py, r * (0.4 + i * 0.28), r * (0.15 + i * 0.1), 0.5, i % 2 ? BLUE : MAG, 4); orbs(fx, px, py, r * 0.4, 6, 60); });
    fx.glow(px, py, r * 0.8, DEEP, life, 0.7, 0.1); fx.after(life * 0.9, () => flare(fx, px, py, r * 0.7, 0.2));
  });
  E('astelorbs', '艾絲緹・臂端聚球', '增益', '六條手臂末端各聚起一顆紫色能量球，球內亮點越轉越快。', (fx, x, y, o) => {
    const r = o.src ? o.src.r : 80, life = o.life || 1;
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + (o.src ? o.src.face || 0 : 0), [px, py] = at(x, y, a, r * 1.9, 0); fx.charge(px, py, r * 0.5, VIO, life, null, 6); fx.after(life * 0.85, () => flare(fx, px, py, r * 0.35, 0.14)); }
    fx.ring(x, y, r * 2.8, r * 0.8, life, 'rgba(160,130,255,0.4)', 4); fx.shake(2);
  });
  E('astelgather', '艾絲緹・星光聚流', '增益', '藍眼亮起，周圍星屑與光點沿弧線向顱骨聚攏；光束與壓碎咬的蓄力。', (fx, x, y, o) => {
    const r = o.src ? o.src.r : 80, life = o.life || 1.1;
    fx.charge(x, y, r * 2.2, VIO, life, null, 34); fx.ring(x, y, r * 2.4, r * 0.4, life, BLUE, 4); fx.after(life * 0.8, () => { flare(fx, x, y, r * 0.8, 0.2); fx.glow(x, y, r * 1.2, CORE, 0.2, 0.7, 0.4); });
  });
  E('astelpull', '艾絲緹・星空吸引', '增益', '星屑從四面八方沿弧線被吸向中心：放射狀光線向內收束，中心紫白爆閃。', (fx, x, y, o) => {
    const r = o.radius || 620;
    for (let i = 0; i < 20; i++) { const a = i * TAU / 20 + V() * 0.3, [sx, sy] = at(x, y, a, r, 0), [ex, ey] = at(x, y, a, r * 0.2, 0); fx.streak(sx, sy, ex, ey, 2 + V() * 3, i % 2 ? VIO : CORE, 0.45, true); }
    fx.ring(x, y, r, r * 0.15, 0.55, VIO, 8); flare(fx, x, y, r * 0.2, 0.25); orbs(fx, x, y, r * 0.25, 18, 100); fx.grade('#4a3aa8', 0.1, 0.5); fx.shake(7);
  });
  E('astelawaken', '艾絲緹・天外流星', '大招', '半血／大招演出：場地轉成深紫星空，多層光環向外盪開，一圈圈彩色星屑撕開空間。', (fx, x, y, o) => {
    const r = o.src ? o.src.r : 80, life = o.life || 1.5;
    fx.charge(x, y, r * 3, VIO, life, null, 46); fx.grade('#3a2c9c', 0.18, life + 0.6);
    for (let i = 0; i < 4; i++) fx.after(i * 0.32, () => { fx.ring(x, y, r * (2 + i * 0.5), r * 0.3, 0.9, i % 2 ? BLUE : MAG, 4); orbs(fx, x, y, r * 1.6, 10, 80); flare(fx, x, y, r * (0.6 + i * 0.2), 0.14); });
    fx.after(life * 0.85, () => { fx.shock(x, y, r * 0.5, r * 5, 0.8, VIO, 16, CORE); fx.flashAt(x, y, r * 3, CORE, 0.16); }); fx.shake(5);
  });
  E('astelstardust', '艾絲緹・星屑流散', '區域', '改編被動：地面升起一圈彩色星屑球，緩慢旋轉，減速的星屑殘滯。', (fx, x, y, o) => {
    const r = o.radius || 190;
    fx.ring(x, y, r * 0.2, r, 0.6, VIO, 5); for (let i = 0; i < 7; i++) { const a = i * TAU / 7, [px, py] = at(x, y, a, r * 0.6, 0); orbs(fx, px, py, 24, 4, 40); } motes(fx, x, y, r, 14, 50); fx.glow(x, y, r * 0.8, DEEP, 0.7, 0.3, 0.1);
  });
})(typeof window !== 'undefined' ? window : globalThis);
