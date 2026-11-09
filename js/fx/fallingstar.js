'use strict';
// 墜星成獸專屬特效：紫色重力、扭曲的紫雷、被吸起的黑岩碎塊與星屑。純視覺，只用 BD.vrng，不影響戰鬥。
// 配色依原作畫面：黑亮岩甲、白毛、藍紫眼核；重力魔法為紫色帶白芯的雷光（docs/research/fallingstar/）。
(function (G) {
  const BD = G.BD, V = BD.vrng, TAU = Math.PI * 2;
  const VIO = '#a77bff', DEEP = '#4b2a9e', CORE = '#f1e8ff', BLUE = '#7fb6ff', ROCK = '#2b2a33', ROCKHI = '#8d8aa0';
  BD.defineElement('gravity', { name: '重力', rim: '#160a33', debris: '#3a3646', core: CORE, glow: VIO, particle: '#d6c4ff',
    smoke: 'rgba(60,34,120,0.45)', decal: 'rgba(30,14,64,0.42)', crack: '#b48cff', extra: 'motes' });
  BD.KIND_EL.starrock = 'gravity';
  const along = (x, y, a, d, l) => [x + Math.cos(a) * d - Math.sin(a) * (l || 0), y + Math.sin(a) * d + Math.cos(a) * (l || 0)];
  // 一道折線紫雷（白芯＋紫外光）
  function zig(fx, x1, y1, x2, y2, w, life, jag) {
    const n = 6, a = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1);
    let px = x1, py = y1;
    for (let i = 1; i <= n; i++) {
      const [qx, qy] = i === n ? [x2, y2] : along(x1, y1, a, len * i / n, (V() - 0.5) * (jag || len * 0.25));
      fx.streak(px, py, qx, qy, w * 2.6, VIO, life, true); fx.streak(px, py, qx, qy, w, CORE, life * 0.8, true); px = qx; py = qy;
    }
  }
  // 被重力扯起的黑岩：向上飄、慢慢減速
  function rocks(fx, x, y, r, n, up) {
    for (let i = 0; i < fx.budget(n); i++) {
      const a = V() * TAU, d = V() * r;
      if (!fx.part(BD.PK.DEBRIS, x + Math.cos(a) * d, y + Math.sin(a) * d, (V() - 0.5) * 60, -(up || 120) * (0.5 + V()), 0.9 + V() * 0.8, i % 4 ? ROCK : ROCKHI, 4 + V() * 7, 1.2)) break;
    }
  }
  function stars(fx, x, y, r, n) {
    for (let i = 0; i < fx.budget(n); i++) {
      const a = V() * TAU, d = V() * r, s = 20 + V() * 90;
      if (!fx.part(BD.PK.MOTE, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * s, Math.sin(a) * s - 30, 0.6 + V() * 0.9, i % 3 ? '#d6c4ff' : CORE, 2 + V() * 2.5, 1.5)) break;
    }
  }
  // 向內收的吸力線：從外圈射向中心
  function inward(fx, x, y, r, n, life) {
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + V() * 0.3, [sx, sy] = along(x, y, a, r, 0), [ex, ey] = along(x, y, a, r * 0.25, 0);
      fx.streak(sx, sy, ex, ey, 2 + V() * 2, i % 2 ? VIO : CORE, life, true);
    }
  }
  function spikes(fx, x, y, r, n) { // 地面刺出的黑岩尖柱
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + V() * 0.4, d = r * (0.35 + V() * 0.6), [px, py] = along(x, y, a, d, 0);
      fx.pillar(px, py, 14 + V() * 12, i % 2 ? VIO : '#6d5fa8', 0.45);
      fx.debris(px, py, ROCKHI, fx.budget(3), 220, 5, TAU);
    }
  }
  const E = (id, name, category, desc, spawn) => BD.defineEffect(id, { name, category, params: {}, desc, spawn });

  E('fsmandible', '墜星成獸・彎顎掃擊', '斬擊', '黑亮彎顎劃出兩道粗弧，弧緣帶紫色重力殘光與岩屑。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || o.len || 270, arc = o.arc || 1.9;
    fx.slash(x, y, a, arc, r, '#1f1d27', 22, 0.36, { core: ROCKHI, trail: 2 });
    fx.after(0.05, () => fx.slash(x, y, a + 0.06, arc * 0.9, r * 0.92, VIO, 6, 0.4, { trail: 2 }));
    const [tx, ty] = along(x, y, a, r * 0.8, 0); fx.debris(tx, ty, ROCKHI, fx.budget(10), 260, 5, 1.6); stars(fx, tx, ty, 40, 8); fx.shake(5, a);
  });
  E('fstail', '墜星成獸・星刺尾掃', '斬擊', '帶刺長尾貼地橫掃：黑色粗弧、尖刺殘影一路排開，掃過處濺起血霧與碎石。', (fx, x, y, o) => {
    const a = (o.angle || 0) + Math.PI, r = o.radius || 360, arc = o.arc || TAU * 0.95;
    fx.slash(x, y, a, arc, r, '#25232d', 26, 0.42, { core: '#55526a', trail: 3 });
    for (let i = 0; i < 9; i++) { const an = a - arc / 2 + arc * i / 8, [px, py] = along(x, y, an, r * 0.92, 0); fx.after(i * 0.025, () => { fx.streak(px, py, ...along(px, py, an, 26, 0), 4, ROCKHI, 0.3); fx.sparks(px, py, '#c4223a', 3, 160); }); }
    fx.smoke(x, y, 'rgba(120,108,96,0.35)', fx.budget(5), r * 0.6); fx.shake(7);
  });
  E('fsstomp', '墜星成獸・人立踏碎', '砸地', '人立後前足砸下：地面龜裂、岩塊翻起，紫色重力波貼地擴散。', (fx, x, y, o) => {
    const r = o.radius || 190;
    fx.flashAt(x, y, r * 0.5, CORE, 0.1); fx.shock(x, y, 20, r * 1.25, 0.5, VIO, 10, CORE);
    fx.after(0.07, () => fx.ring(x, y, r * 0.3, r * 1.4, 0.6, 'rgba(160,150,190,0.5)', 8));
    fx.crack(x, y, r, '#1a1622', 7, VIO, 7); fx.debris(x, y, ROCKHI, fx.budget(16), 340, 7, TAU); rocks(fx, x, y, r * 0.6, 8, 90);
    fx.decal(x, y, r * 0.7, 'rgba(30,14,64,0.3)', 6); fx.shake(10); fx.punch(0.025, x, y);
  });
  E('fsgouge', '墜星成獸・顎掘衝撕', '位移', '雙顎插地向前犁開一道深溝，岩塊兩側翻飛，溝底透出紫光。', (fx, x, y, o) => {
    const a = o.angle || 0, len = o.len || 330;
    for (let i = 0; i < 8; i++) fx.after(i * 0.05, () => {
      const [px, py] = along(x, y, a, len * (i + 1) / 8, 0);
      for (const s of [-1, 1]) fx.chunk(...along(px, py, a, 0, s * 18), Math.cos(a + s * 1.4) * 140, Math.sin(a + s * 1.4) * 140, a, s * 2, s, 9 + V() * 6, (V() * 3) | 0);
      fx.glow(px, py, 30, VIO, 0.5, 0.35, 0.2); fx.smoke(px, py, 'rgba(110,100,95,0.35)', 1, 30);
    });
    fx.decal(...along(x, y, a, len / 2, 0), len * 0.3, 'rgba(20,10,40,0.3)', 7); fx.shake(6, a);
  });
  E('fsspike', '墜星成獸・岩刺', '砸地', '溝旁接連刺出的黑岩尖柱，柱根閃紫光。', (fx, x, y, o) => {
    const r = o.radius || 95; spikes(fx, x, y, r, 4); fx.shock(x, y, 8, r, 0.35, VIO, 5, CORE); fx.shake(3);
  });
  E('fsspikes', '墜星成獸・引力岩陣', '砸地', '吸力停下的瞬間，一圈黑岩尖柱從地面暴刺而出，柱間紫雷亂竄。', (fx, x, y, o) => {
    const r = o.radius || 220, r0 = o.r0 || 0;
    spikes(fx, x, y, r, r0 ? 14 : 9); fx.shock(x, y, r0 || 20, r * 1.1, 0.5, VIO, 9, CORE);
    for (let i = 0; i < 4; i++) { const a = V() * TAU, [px, py] = along(x, y, a, r * 0.9, 0); zig(fx, x, y, px, py, 2, 0.25); }
    rocks(fx, x, y, r, 10, 160); fx.shake(9); fx.punch(0.02, x, y);
  });
  E('fsjump', '墜星成獸・躍起', '位移', '四足蹬地躍起，地面壓出一圈塵環，白毛與碎石向外飛散。', (fx, x, y, o) => {
    const r = o.src ? o.src.r : 120; fx.ring(x, y, r * 0.4, r * 2.2, 0.55, 'rgba(200,190,210,0.55)', 7); fx.debris(x, y, ROCKHI, fx.budget(12), 280, 6, TAU);
    fx.smoke(x, y, 'rgba(140,130,125,0.35)', fx.budget(4), r); stars(fx, x, y, r, 10); fx.shake(4);
  });
  E('fscharge', '墜星成獸・狂牛衝鋒', '位移', '低頭張顎全速衝鋒：身後拖出黑紫殘影與翻飛的岩屑，蹄下一路揚塵。', (fx, x, y, o) => {
    const a = o.angle || 0, len = o.len || 500, dur = o.dur || 0.42;
    for (let i = 0; i < 7; i++) fx.after(dur * i / 7, () => {
      const [px, py] = along(x, y, a, len * i / 7, 0);
      fx.smoke(px, py, 'rgba(130,120,115,0.38)', 1, 40); fx.debris(px, py, ROCKHI, fx.budget(3), 160, 4, TAU); fx.glow(px, py, 40, DEEP, 0.35, 0.25, 0.2);
    });
    fx.streak(x, y, ...along(x, y, a, len, 0), 10, 'rgba(120,90,200,0.4)', 0.4); fx.shake(4, a);
  });
  E('fsdig', '墜星成獸・顎插地', '增益', '把頭埋進地裡蓄力，地面隆起、碎石開始震動。', (fx, x, y, o) => {
    const r = o.src ? o.src.r : 120, a = o.src ? o.src.face : 0, [mx, my] = along(x, y, a, r * 1.4, 0), life = o.life || 0.8;
    fx.crack(mx, my, r * 0.8, '#1a1622', life + 0.6, VIO, 5); fx.debris(mx, my, ROCKHI, fx.budget(8), 120, 5, TAU); fx.glow(mx, my, 50, VIO, life, 0.3, 0.3); fx.shake(2);
  });
  E('fsrockburst', '墜星成獸・拋岩', '投射物', '猛然抬頭，把掘起的大塊黑岩扇形甩出，口前炸開塵霧。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.src ? o.src.r : 120, [mx, my] = along(x, y, a, r * 1.3, 0);
    fx.shock(mx, my, 10, 90, 0.3, ROCKHI, 6); fx.smoke(mx, my, 'rgba(140,130,120,0.45)', fx.budget(5), 50);
    fx.debris(mx, my, ROCKHI, fx.budget(14), 420, 6, o.arc || 0.8); fx.shake(4, a);
  });
  E('fsroll', '墜星成獸・星球墜擊', '砸地', '捲成岩球從空中砸落：白光一閃、紫色衝擊環兩重、碎岩與星屑向四方噴射。', (fx, x, y, o) => {
    const r = o.radius || 230;
    fx.flashAt(x, y, r * 0.8, CORE, 0.14); fx.shock(x, y, 30, r * 1.3, 0.55, VIO, 13, CORE);
    fx.after(0.1, () => fx.shock(x, y, r * 0.4, r * 1.7, 0.7, DEEP, 7, VIO));
    fx.crack(x, y, r * 1.1, '#140f1c', 8, VIO, 9); fx.debris(x, y, ROCKHI, fx.budget(20), 420, 8, TAU); stars(fx, x, y, r, 24);
    fx.decal(x, y, r * 0.8, 'rgba(30,14,64,0.34)', 7); fx.shake(13); fx.punch(0.035, x, y);
  });
  E('fsrear', '墜星成獸・人立蓄力', '增益', '後腿人立，眼核由藍轉紫，周身碎石離地浮起。', (fx, x, y, o) => {
    const r = o.src ? o.src.r : 120, life = o.life || 1;
    fx.charge(x, y, r * 2.2, VIO, life, o.src, 14); rocks(fx, x, y, r * 2, 14, 70); fx.glow(x, y, r * 1.2, DEEP, life, 0.3, 0.3);
  });
  E('fspull', '墜星成獸・重力牽引', '區域', '紫色重力場猛然收縮：吸力線從外圈射向中心，碎石與星屑被扯進漩渦，中心爆出白紫光。', (fx, x, y, o) => {
    const r = o.radius || 380;
    fx.ring(x, y, r, r * 0.15, 0.45, VIO, 9); fx.after(0.08, () => fx.ring(x, y, r * 0.85, 10, 0.4, CORE, 4));
    inward(fx, x, y, r, 18, 0.35);
    for (let i = 0; i < fx.budget(16); i++) { const a = V() * TAU, d = r * (0.6 + V() * 0.4), [px, py] = along(x, y, a, d, 0); fx.part(BD.PK.DEBRIS, px, py, (x - px) * 2.2, (y - py) * 2.2, 0.45, i % 3 ? ROCK : ROCKHI, 4 + V() * 6, 0.5); }
    fx.after(0.3, () => { fx.flashAt(x, y, r * 0.35, CORE, 0.12); fx.shock(x, y, 10, r * 0.5, 0.35, VIO, 8, CORE); stars(fx, x, y, 60, 20); });
    fx.grade('#6a3dd6', 0.12, 0.5); fx.shake(6); fx.punch(0.02, x, y);
  });
  E('fsboltcharge', '墜星成獸・重力雷聚集', '區域', '目標腳下聚起紫雷，地面浮出碎石與重力紋。', (fx, x, y, o) => {
    const r = o.radius || 115, life = o.life || 0.8;
    fx.ring(x, y, r, r * 0.3, life, VIO, 4); fx.glow(x, y, r * 0.8, DEEP, life, 0.25, 0.2);
    for (let i = 0; i < 3; i++) fx.after(i * life / 3, () => { const a = V() * TAU; zig(fx, ...along(x, y, a, r, 0), ...along(x, y, a + 2.4, r * 0.6, 0), 1.6, 0.15, r * 0.3); });
    rocks(fx, x, y, r * 0.8, 6, 50);
  });
  E('fsbolt', '墜星成獸・重力雷', '砸地', '紫雷從天直落、岩柱自地底刺出：白芯雷柱、紫色衝擊環與向上噴飛的黑岩。', (fx, x, y, o) => {
    const r = o.radius || 115;
    zig(fx, x + (V() - 0.5) * 60, y - 520, x, y, 3.5, 0.3, 90); zig(fx, x + (V() - 0.5) * 80, y - 420, x, y, 2, 0.22, 70);
    fx.flashAt(x, y, r * 0.7, CORE, 0.1); fx.shock(x, y, 10, r * 1.2, 0.4, VIO, 8, CORE); spikes(fx, x, y, r, r > 200 ? 10 : 5);
    rocks(fx, x, y, r * 0.6, r > 200 ? 14 : 7, 200); fx.decal(x, y, r * 0.6, 'rgba(30,14,64,0.3)', 5); fx.shake(r > 200 ? 10 : 5);
  });
  E('fsreverse', '墜星成獸・重力反轉', '大招', '整片地面的重力翻轉：紫色光柱由地面衝天，碎岩、塵土與敵人一起被拋上半空。', (fx, x, y, o) => {
    const r = o.radius || 430;
    fx.flash(VIO, 0.12); fx.shock(x, y, r * 0.2, r, 0.6, VIO, 10, CORE);
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + V() * 0.3, [px, py] = along(x, y, a, r * (0.3 + V() * 0.6), 0); fx.after(i * 0.03, () => { fx.pillar(px, py, 18 + V() * 16, i % 2 ? VIO : '#c4a8ff', 0.9); fx.streak(px, py, px, py - 260, 6, 'rgba(190,160,255,0.5)', 0.5, true); }); }
    rocks(fx, x, y, r, 40, 320); stars(fx, x, y, r, 30); fx.grade('#5a2fc0', 0.18, 0.9); fx.shake(8);
  });
  E('fsslam', '墜星成獸・重力砸落', '砸地', '被拋起的一切狠狠砸回地面：地面塌陷成圓坑，三重紫色衝擊環與四散的岩塊。', (fx, x, y, o) => {
    const r = o.radius || 430;
    fx.flashAt(x, y, r * 0.6, CORE, 0.12);
    for (let i = 0; i < 3; i++) fx.after(i * 0.09, () => fx.shock(x, y, r * (0.1 + i * 0.25), r * (1 + i * 0.2), 0.55, i % 2 ? DEEP : VIO, 12 - i * 3, CORE));
    fx.crack(x, y, Math.min(r, 360), '#100c18', 9, VIO, 12); // 大招半徑很大，裂痕只畫在中心一圈 fx.debris(x, y, ROCKHI, fx.budget(26), 460, 8, TAU);
    for (let i = 0; i < 10; i++) { const a = V() * TAU, [px, py] = along(x, y, a, r * V(), 0); fx.chunk(px, py, Math.cos(a) * 180, Math.sin(a) * 180, a, 2, 1, 10 + V() * 8, (V() * 3) | 0); }
    fx.decal(x, y, r * 0.75, 'rgba(24,10,52,0.38)', 8); fx.shake(15); fx.punch(0.04, x, y);
  });
  E('fsorb', '墜星成獸・重力球凝聚', '增益', '左肩上方凝出一顆吸光的重力球：外圈紫光向內捲，球心白亮，周圍碎石繞行。', (fx, x, y, o) => {
    const s = o.src, r = s ? s.r : 120, a = s ? s.face - 1.2 : 0, [ox, oy] = along(x, y, a, r * 0.9, 0), life = o.life || 1.3;
    fx.charge(ox, oy, r * 1.6, VIO, life, null, 16); fx.glow(ox, oy, r * 0.5, CORE, life, 0.6, 0.6); fx.ring(ox, oy, r * 1.4, 8, life, VIO, 5);
    for (let i = 0; i < 4; i++) fx.after(i * life / 4, () => inward(fx, ox, oy, r * 1.2, 6, 0.25));
    rocks(fx, ox, oy, r, 10, 40); fx.grade('#4a26a8', 0.1, life);
  });
  E('fsray', '墜星成獸・重力光束', '區域', '從身前射出的巨大重力光束：白芯、紫色外光、沿束纏繞的紫雷，被掃過的地面翻起碎岩。', (fx, x, y, o) => {
    const a = o.angle || 0, len = o.len || 950, w = o.width || 140, [tx, ty] = along(x, y, a, len, 0);
    fx.beam(x, y, tx, ty, w * 0.75, VIO, 0.24, CORE); fx.beam(x, y, tx, ty, w * 0.22, '#ffffff', 0.18, '#ffffff');
    zig(fx, x, y, tx, ty, 2, 0.2, w * 0.7);
    for (let i = 0; i < 3; i++) { const [px, py] = along(x, y, a, len * (0.35 + V() * 0.6), (V() - 0.5) * w); rocks(fx, px, py, 30, 3, 180); }
    fx.glow(tx, ty, w * 0.8, VIO, 0.3, 0.5, 0.3); fx.shake(3, a);
  });
  E('fsawaken', '墜星成獸・成獸覺醒', '大招', '換階段 / 大招蓄力：眼核爆出藍紫光，背上晶刺逐根點亮，四周的岩塊浮上半空、星屑繞身旋轉。', (fx, x, y, o) => {
    const r = o.src ? o.src.r : 120;
    for (let i = 0; i < 4; i++) fx.after(i * 0.28, () => { fx.shock(x, y, r * 0.4, r * (2.2 + i * 0.6), 0.9, i % 2 ? BLUE : VIO, 5 + i * 2, CORE); rocks(fx, x, y, r * (1.5 + i * 0.4), 10, 110); });
    inward(fx, x, y, r * 3, 22, 0.5); stars(fx, x, y, r * 2, 40); fx.flash(VIO, 0.1); fx.grade('#5a2fc0', 0.2, 1); fx.shake(7); fx.punch(0.03, x, y);
  });
  E('fsmeteor', '墜星成獸・黑岩隕星', '砸地', '天外落下的黑岩隕星：紫色殘焰尾跡、著地炸開的衝擊與四散星屑。', (fx, x, y, o) => {
    const r = o.radius || 95;
    fx.flashAt(x, y, r * 0.6, CORE, 0.1); fx.shock(x, y, 10, r * 1.3, 0.45, VIO, 8, CORE);
    fx.crack(x, y, r * 0.9, '#120e1a', 6, VIO, 5); fx.debris(x, y, ROCKHI, fx.budget(10), 320, 6, TAU); stars(fx, x, y, r, 10); fx.shake(5);
  });
  E('fscoreflare', '墜星成獸・星核引力', '增益', '改編被動：眼核閃起刺眼的藍紫光，一圈光環向內收縮，預告下一刻的吸力。', (fx, x, y, o) => {
    const s = o.src, r = s ? s.r : 120, a = s ? s.face : 0, [hx, hy] = along(x, y, a, r * 1.05, 0), life = o.life || 0.6;
    fx.glow(hx, hy, 70, BLUE, life, 0.7, 0.4); fx.ring(x, y, 300, 30, life, VIO, 5); stars(fx, hx, hy, 40, 12);
  });
})(typeof window !== 'undefined' ? window : globalThis);
