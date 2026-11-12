'use strict';
// 輝石龍亞杜拉專屬特效：青藍輝石吐息、結晶爆裂、月刃與暗月。純視覺，只用 BD.vrng，不參與傷害或狀態。
// 配色依已查看的遊戲畫面與官方宣傳圖（docs/research/adula/）：深藍灰鱗甲，輝石魔法是青藍帶白芯，輝石之星是冰藍半透明尖晶簇，月刃是冰藍魔法大劍與月牙。
(function (G) {
  const BD = G.BD, V = BD.vrng, TAU = Math.PI * 2;
  const TEAL = '#6fe3ff', ICE = '#bff6ff', CORE = '#f2ffff', DEEP = '#133a66', INK = '#0b1426', MOON = '#dfe9ff', CRYS = '#7ff0ff', STEEL = '#4a6a9a';
  BD.KIND_EL.glintbloom = BD.KIND_EL.glintrock = BD.KIND_EL.glintshard = BD.KIND_EL.moonwave = 'glintstone';
  const at = (x, y, a, d, l) => [x + Math.cos(a) * d - Math.sin(a) * (l || 0), y + Math.sin(a) * d + Math.cos(a) * (l || 0)];
  const E = (id, name, category, desc, spawn) => BD.defineEffect(id, { name, category, params: {}, desc, spawn });
  function motes(fx, x, y, r, n, speed) { // 向上飄的青白光點
    for (let i = 0; i < fx.budget(n); i++) {
      const a = V() * TAU, d = V() * r, v = (speed || 60) * (0.4 + V());
      if (!fx.part(BD.PK.MOTE, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * v, Math.sin(a) * v - 25, 0.6 + V() * 0.9, i % 3 ? ICE : CORE, 1.8 + V() * 2.6, 1.3)) break;
    }
  }
  function shards(fx, x, y, r, n, speed) { // 冰藍碎晶
    for (let i = 0; i < fx.budget(n); i++) {
      const a = V() * TAU, d = Math.sqrt(V()) * r, v = (speed || 200) * (0.4 + V());
      if (!fx.part(BD.PK.SHARD, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * v, Math.sin(a) * v, 0.5 + V() * 0.6, i % 2 ? CRYS : ICE, 3 + V() * 5, 1.1)) break;
    }
  }
  function flare(fx, x, y, r, life, color) { // 四芒星閃
    fx.flashAt(x, y, r, color || CORE, life || 0.14);
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.2, [ex, ey] = at(x, y, a, r * 1.2, 0), [sx, sy] = at(x, y, a, -r * 1.2, 0); fx.streak(sx, sy, ex, ey, 3 + r * 0.04, i % 2 ? TEAL : CORE, life || 0.2, true); }
  }
  // 寬扇形拆成 ≤0.7 rad 的窄流（fx.stream 的霧團半徑隨半角暴增）
  function spray(fx, x, y, a, arc, len, dur, cols) {
    const n = Math.max(1, Math.ceil(arc / 0.7)), sub = Math.min(arc, 0.7);
    for (let i = 0; i < n; i++) fx.stream(x, y, n === 1 ? a : a - arc / 2 + sub / 2 + (arc - sub) * i / (n - 1), sub, len, cols || [CORE, ICE, TEAL, DEEP], dur || 0.25, 0.6);
  }

  E('adulabreath', '亞杜拉・輝石吐息', '區域', '青藍帶白芯的輝石魔法噴流：扇形噴霧、沿路飄起的青白光點與碎晶。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 520, arc = o.arc || 1.05;
    spray(fx, x, y, a, arc, r, 0.26); fx.beam(x, y, ...at(x, y, a, r * 0.8, 0), Math.max(40, r * arc * 0.22), DEEP, 0.2, TEAL);
    for (let i = 0; i < 6; i++) fx.after(i * 0.02, () => { const [px, py] = at(x, y, a + (V() - 0.5) * arc * 0.8, r * (0.2 + 0.75 * V()), 0); motes(fx, px, py, 26, 4, 90); if (i % 2) shards(fx, px, py, 18, 3, 120); });
    fx.grade('#2a8fc8', 0.06, 0.3); fx.shake(3, a);
  });
  E('adulabite', '亞杜拉・利齒咬合', '斬擊', '兩排冰藍弧痕自上下合攏，咬合點閃出四芒星與碎晶。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 200;
    fx.slash(x, y, a - 0.45, 1.0, r, INK, 18, 0.2, { core: TEAL }); fx.slash(x, y, a + 0.45, 1.0, r, INK, 18, 0.2, { core: ICE });
    const [px, py] = at(x, y, a, r * 0.75, 0); flare(fx, px, py, 50, 0.14); shards(fx, px, py, 20, 8, 240); fx.shake(5, a);
  });
  E('adulastomp', '亞杜拉・結晶踏地', '砸地', '龍爪踏下：放射裂紋、冰藍碎晶向外彈、一圈薄震波。', (fx, x, y, o) => {
    const r = o.radius || 130;
    fx.shock(x, y, 8, r * 1.2, 0.4, TEAL, 9, CORE); fx.crack(x, y, r * 1.1, INK, 9, CRYS, 8); shards(fx, x, y, r * 0.6, 14, 260); motes(fx, x, y, r * 0.5, 8, 80); fx.shake(7); fx.punch(0.02, x, y);
  });
  E('adulawing', '亞杜拉・破羽翼砸', '斬擊', '寬大的黑羽翼膜拍落，扇形弧痕之後掀起一圈碎羽與青白光屑。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 300, arc = o.arc || 2.4;
    fx.slash(x, y, a, arc, r, INK, 24, 0.36, { core: STEEL, trail: 3 }); spray(fx, x, y, a, Math.min(arc, 2.6), r * 0.9, 0.2, [ICE, STEEL, DEEP]);
    for (let i = 0; i < 8; i++) fx.after(i * 0.02, () => { const an = a - arc / 2 + arc * i / 7, [px, py] = at(x, y, an, r * 0.85, 0); motes(fx, px, py, 18, 3, 100); });
    fx.shake(8, a);
  });
  E('adulatail', '亞杜拉・結晶尾鞭', '斬擊', '長尾貼地甩過一整圈：深藍粗弧、尾尖一道白亮鞭痕，沿弧線迸出碎晶與揚塵。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 300, arc = o.arc || 6;
    fx.slash(x, y, a, arc, r * 0.8, INK, 30, 0.4, { core: STEEL, trail: 3 }); fx.slash(x, y, a, arc, r, ICE, 4, 0.3);
    fx.after(0.07, () => fx.slash(x, y, a - 0.1, arc, r * 0.6, DEEP, 7, 0.45, { core: TEAL, trail: 2 }));
    for (let i = 0; i < 10; i++) fx.after(i * 0.018, () => { const [px, py] = at(x, y, a - arc / 2 + arc * i / 9, r * 0.86, 0); shards(fx, px, py, 14, 3, 160); if (i % 3 === 0) fx.smoke(px, py, 'rgba(60,80,120,0.3)', 1, 26); });
    fx.shake(8, a);
  });
  E('adulacharge', '亞杜拉・怒吼衝撞', '位移', '龍軀貼地衝出：兩道青白氣流線夾著整條路徑，沿途碎晶一段段迸起，終點撞出一圈氣浪。', (fx, x, y, o) => {
    const a = o.angle == null ? (o.src ? o.src.face : 0) : o.angle, len = o.len || 470, dur = o.dur || 0.5, r = o.src ? o.src.r : 90;
    fx.shock(x, y, r * 0.4, r * 1.8, 0.4, ICE, 8, CORE);
    for (const s of [-1, 1]) fx.streak(...at(x, y, a, 0, s * r * 0.75), ...at(x, y, a, len, s * r * 0.75), 6, s > 0 ? TEAL : ICE, dur + 0.25, true);
    for (let i = 1; i <= 6; i++) fx.after(dur * i / 6, () => { const [px, py] = at(x, y, a, len * i / 6, 0); shards(fx, px, py, r * 0.6, 4, 200); motes(fx, px, py, r * 0.7, 4, 80); fx.smoke(px, py, 'rgba(60,80,120,0.3)', fx.budget(2), r * 0.6); });
    fx.after(dur, () => { const [ex, ey] = at(x, y, a, len, 0); fx.shock(ex, ey, r * 0.5, r * 2, 0.45, TEAL, 10, CORE); flare(fx, ...at(ex, ey, a, r, 0), r * 0.5, 0.16); fx.shake(8, a); });
  });
  E('adulastars', '亞杜拉・星晶齊射', '投射物', '嘴前的晶簇碎成一波追蹤碎片：出手處四芒星閃，每枚碎片一條冰藍射線；放射狀的一波則是整圈星環。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.src ? o.src.r : 90, n = o.n || 7, radial = !o.arc && n > 3, [mx, my] = radial ? [x, y] : at(x, y, a, r * 1.9, 0);
    flare(fx, mx, my, r * 0.5, 0.18); fx.ring(mx, my, r * 0.2, r * (radial ? 1.8 : 0.9), 0.3, TEAL, 3);
    for (let i = 0; i < n; i++) { const an = radial ? i * TAU / n + a : a + (n > 1 ? (i / (n - 1) - 0.5) * (o.arc || 0) : 0); fx.streak(...at(mx, my, an, r * 0.3, 0), ...at(mx, my, an, r * 0.3 + 150, 0), 3, i % 2 ? CRYS : CORE, 0.22, true); }
    shards(fx, mx, my, r * 0.3, 10, 260); fx.shake(3);
  });
  E('adulamoonwave', '亞杜拉・月刃劍波', '投射物', '月刃橫甩放出的霜寒劍波：出手處一道冰藍寬月牙，每道劍波先拖出一條白亮新月殘影。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.src ? o.src.r : 90, n = o.n || 3;
    fx.slash(x, y, a, Math.max(1.6, (o.arc || 1) + 0.8), r * 3, DEEP, 22, 0.32, { core: MOON, trail: 3 });
    for (let i = 0; i < n; i++) { const an = a + (n > 1 ? (i / (n - 1) - 0.5) * (o.arc || 0) : 0); fx.after(i * 0.03, () => { fx.slash(...at(x, y, an, r * 1.2, 0), an, 1.5, r * 1.6, ICE, 8, 0.3, { core: CORE }); fx.streak(...at(x, y, an, r * 2, 0), ...at(x, y, an, r * 2 + 260, 0), 4, MOON, 0.25, true); }); }
    motes(fx, ...at(x, y, a, r * 2, 0), r, 12, 140); fx.grade('#7ad0ff', 0.08, 0.3); fx.shake(5, a);
  });
  E('adulatakeoff', '亞杜拉・振翼起飛', '位移', '雙翼大力下壓：向外的氣浪環、碎羽與光屑被吹散。', (fx, x, y, o) => {
    const r = o.src ? o.src.r : 90;
    fx.shock(x, y, r * 0.4, r * 2.6, 0.5, ICE, 10, CORE); fx.ring(x, y, r * 2.4, r * 0.3, 0.4, TEAL, 4); motes(fx, x, y, r * 1.4, 14, 140); shards(fx, x, y, r, 6, 200); fx.shake(4);
  });
  E('adulaland', '亞杜拉・落地爆晶', '砸地', '龍身從天砸下：強光、雙層青白震波、冰藍結晶柱自落點炸出。', (fx, x, y, o) => {
    const r = o.radius || 190;
    fx.flashAt(x, y, r * 0.9, CORE, 0.13); fx.shock(x, y, 20, r * 1.15, 0.5, TEAL, 14, CORE); fx.after(0.08, () => fx.shock(x, y, r * 0.3, r * 1.6, 0.75, 'rgba(70,160,230,0.5)', 9, ICE));
    fx.crack(x, y, r * 1.2, INK, 10, CRYS, 10); fx.pillar(x, y, r * 0.5, CRYS, 0.6); shards(fx, x, y, r * 0.8, 24, 320); flare(fx, x, y, r * 0.7, 0.2); fx.shake(13); fx.punch(0.04, x, y);
  });
  E('adulashock', '亞杜拉・輝石衝擊環', '震波', '貼地擴張的青白衝擊環，環上擠出碎晶與光點。', (fx, x, y, o) => {
    const r = o.radius || 300, r0 = o.r0 || r * 0.7;
    fx.shock(x, y, r0, r, 0.55, TEAL, 14, CORE); fx.ring(x, y, r0 * 0.9, r * 1.04, 0.7, 'rgba(24,70,130,0.5)', 20);
    for (let i = 0; i < 12; i++) fx.after(i * 0.012, () => { const an = i * TAU / 12 + V() * 0.3, [px, py] = at(x, y, an, r * 0.92, 0); shards(fx, px, py, 14, 3, 100); });
    motes(fx, x, y, r, 20, 90); fx.shake(5);
  });
  E('adulacrystal', '亞杜拉・輝石之星', '爆炸', '嘴前凝出的冰藍尖晶簇炸開：強閃、十字星芒、碎晶向四面噴射、青白霧團。', (fx, x, y, o) => {
    const r = o.radius || 130;
    fx.flashAt(x, y, r * 1.3, CORE, 0.16); flare(fx, x, y, r * 0.9, 0.22); fx.shock(x, y, 10, r * 1.6, 0.5, ICE, 10, CORE); fx.pillar(x, y, r * 0.4, CRYS, 0.5);
    shards(fx, x, y, r * 0.5, 30, 340); motes(fx, x, y, r, 14, 120); fx.grade('#3aa8e0', 0.1, 0.4); fx.shake(9); fx.punch(0.03, x, y);
  });
  E('adulamoon', '亞杜拉・月刃', '斬擊', '冰冷魔法大劍斬下：新月形寬弧、劍身白芯、地面霜白裂紋與一圈冰晶，餘波化成霜寒光屑。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 300, arc = o.arc || 2.6;
    fx.slash(x, y, a, arc, r, DEEP, 30, 0.42, { core: MOON, trail: 4 }); fx.slash(x, y, a, arc * 0.8, r * 0.85, INK, 12, 0.3, { core: CORE });
    fx.shock(x, y, 10, r * 1.1, 0.55, ICE, 12, CORE); fx.crack(x, y, r * 0.8, INK, 8, ICE, 9); fx.pillar(x, y, r * 0.3, MOON, 0.5);
    shards(fx, x, y, r * 0.6, 22, 320); motes(fx, x, y, r * 0.8, 16, 110); fx.grade('#7ad0ff', 0.1, 0.5); fx.shake(11, a); fx.punch(0.03, x, y);
  });
  E('adulagather', '亞杜拉・聚流', '增益', '周圍的青白光點與魔力向口中聚攏：吐息、衝撞與月刃的蓄力。', (fx, x, y, o) => {
    const r = o.src ? o.src.r : 90, life = o.life || 1.0;
    fx.charge(x, y, r * 2.0, TEAL, life, null, 30); fx.ring(x, y, r * 2.2, r * 0.4, life, ICE, 4); fx.after(life * 0.8, () => { flare(fx, x, y, r * 0.7, 0.2); fx.glow(x, y, r, CORE, 0.2, 0.6, 0.4); });
  });
  E('adulamoonrise', '亞杜拉・暗月升起', '大招', '半血／大招演出：場地罩上藍色月光，光柱自天而降，多層光環向外盪開，碎晶如星散落。', (fx, x, y, o) => {
    const r = o.src ? o.src.r : 90, life = o.life || 1.5;
    fx.charge(x, y, r * 3, TEAL, life, null, 46); fx.grade('#1f5ca8', 0.18, life + 0.6);
    for (let i = 0; i < 4; i++) fx.after(i * 0.3, () => { fx.ring(x, y, r * (2 + i * 0.5), r * 0.3, 0.9, i % 2 ? ICE : TEAL, 4); const [px, py] = at(x, y, i * TAU / 4 + 0.5, r * 2.2, 0); fx.pillar(px, py, r * 0.35, MOON, 0.7); motes(fx, x, y, r * 2, 10, 100); });
    fx.after(life * 0.85, () => { fx.shock(x, y, r * 0.5, r * 5, 0.8, TEAL, 16, CORE); fx.flashAt(x, y, r * 3, CORE, 0.16); shards(fx, x, y, r * 2, 28, 360); }); fx.shake(5);
  });
  E('adulameteor', '亞杜拉・星晶墜落', '爆炸', '天外落下的輝石結晶：落點強光、青白爆環、碎晶四濺與焦黑印記。', (fx, x, y, o) => {
    const r = o.radius || 95;
    fx.flashAt(x, y, r * 1.3, CORE, 0.14); fx.shock(x, y, 10, r * 1.5, 0.5, TEAL, 12, CORE); fx.crack(x, y, r * 1.2, INK, 9, CRYS, 8);
    fx.debris(x, y, '#4a6a9a', fx.budget(12), 300, 6, TAU); shards(fx, x, y, r * 0.6, 20, 300); flare(fx, x, y, r * 0.8, 0.18); fx.shake(8); fx.punch(0.02, x, y);
  });
  E('adulabloom', '亞杜拉・輝石結晶', '區域', '改編被動：地面長出一圈青白結晶，緩慢閃爍，減速的魔力殘滯。', (fx, x, y, o) => {
    const r = o.radius || 180;
    fx.ring(x, y, r * 0.2, r, 0.6, TEAL, 5); for (let i = 0; i < 7; i++) { const a = i * TAU / 7, [px, py] = at(x, y, a, r * 0.6, 0); fx.pillar(px, py, 18, CRYS, 0.5); shards(fx, px, py, 12, 3, 40); }
    motes(fx, x, y, r, 12, 50); fx.glow(x, y, r * 0.9, TEAL, 0.8, 0.25, 0.1);
  });
})(typeof window !== 'undefined' ? window : globalThis);
