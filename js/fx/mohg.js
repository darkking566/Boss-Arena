'use strict';
// 鮮血君王蒙格專屬特效：血焰（猩紅火舌＋黑煙＋橘白火芯）、血液飛濺、咒環、虛無吸血、血日與黑羽。純視覺，只用 BD.vrng，不參與傷害或狀態。
// 配色依已查看的官方設定稿與遊戲畫面（docs/research/mohg/）：黑金長袍、猩紅血焰、天上旋轉的血色光環、二階段飄落的黑羽毛。
// puff / stream 的色票只能用 #rrggbb（rgba 會讓畫布狀態壞掉，見 test/astel.test.js 的回歸）。
(function (G) {
  const BD = G.BD, V = BD.vrng, TAU = Math.PI * 2;
  const CORE = '#ffe6cc', HOT = '#ff6a2a', CRIM = '#e0142e', RED = '#b00c22', DEEP = '#5a0410', INK = '#120306', GOLD = '#f0c060', SMOKE = '#2a080c', FEATHER = '#1a1418';
  BD.defineElement('bloodflame', { name: '血焰', rim: '#2a0006', debris: '#6a0a16', core: CORE, glow: CRIM, particle: '#ff3a3a',
    smoke: 'rgba(60,6,14,0.55)', decal: 'rgba(90,0,14,0.5)', crack: '#ff3048', extra: 'embers' });
  BD.KIND_EL.bloodflame = 'bloodflame';
  const FLAME = [CORE, CRIM, RED, SMOKE];
  const at = (x, y, a, d, l) => [x + Math.cos(a) * d - Math.sin(a) * (l || 0), y + Math.sin(a) * d + Math.cos(a) * (l || 0)];
  // 血滴：帶高度的拋物線，落地留下暗紅血點
  function splash(fx, x, y, r, n, speed, dir, spread) {
    n = fx.budget(n);
    for (let i = 0; i < n; i++) {
      const a = dir == null ? V() * TAU : dir + (V() - 0.5) * (spread || 1.2), s = (speed || 220) * (0.3 + V() * 0.8), d = V() * (r || 10);
      const p = fx.part(BD.PK.DEBRIS, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * s, Math.sin(a) * s, 0.7 + V() * 0.6, i % 3 ? RED : DEEP, 2 + V() * 3.5, 1.4);
      if (!p) break; p.vz = 80 + V() * 240; p.g = 900;
    }
  }
  // 血焰火舌：一圈往上竄的猩紅火團（火芯 additive）
  function flames(fx, x, y, r, n, life) {
    for (let i = 0; i < n; i++) {
      const a = V() * TAU, d = Math.sqrt(V()) * r, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d, L = (life || 0.6) * (0.7 + V() * 0.5);
      fx.puff(px, py, (V() - 0.5) * 30, -40 - V() * 50, 6, r * (0.25 + V() * 0.2) + 10, L, i % 3 ? CRIM : RED, 0.75, 1);
      if (i % 2 === 0) fx.puff(px, py, 0, -30, 4, r * 0.15 + 6, L * 0.6, CORE, 0.5, 2);
    }
    fx.embers(x, y, HOT, Math.round(n * 1.5), r, 70);
  }
  // 寬扇形拆成數道 ≤0.7 rad 的窄流（寬張角的 stream 霧團會暴增）
  function wash(fx, x, y, a, arc, len, dur) {
    const n = Math.max(1, Math.ceil(arc / 0.7)), sub = Math.min(arc, 0.7);
    for (let i = 0; i < n; i++) fx.stream(x, y, n === 1 ? a : a - arc / 2 + sub / 2 + (arc - sub) * i / (n - 1), sub, len, FLAME, dur || 0.25, 0.42);
  }
  // 聖槍弧光：黑底猩紅刃、刃緣帶金光（三叉戟的金色環護手）
  function trident(fx, x, y, a, arc, r, life, flame) {
    fx.slash(x, y, a, arc, r, INK, 24, life || 0.3, { core: flame ? CRIM : '#ff4a5a', trail: 3 });
    fx.slash(x, y, a, arc * 0.92, r * 0.97, 'rgba(255,200,120,0.5)', 5, (life || 0.3) * 0.8);
    const n = Math.round(arc * 6);
    for (let i = 0; i <= n; i++) fx.after(i * 0.012, () => { const an = a - arc / 2 + arc * i / Math.max(1, n), [px, py] = at(x, y, an, r * 0.9, 0); splash(fx, px, py, 8, 3, 200, an + Math.PI / 2, 0.8); if (flame) fx.embers(px, py, HOT, 3, 14, 60); });
  }
  function blast(fx, x, y, r, big) {
    fx.flashAt(x, y, r * 1.1, CORE, 0.16); fx.glow(x, y, r * 1.4, CRIM, 0.5, 0.8, 0.4);
    fx.shock(x, y, r * 0.2, r * 1.15, 0.45, CRIM, big ? 16 : 10, CORE); fx.ring(x, y, r * 0.5, r * 1.3, 0.6, 'rgba(120,6,20,0.5)', 14);
    flames(fx, x, y, r * 0.8, big ? 16 : 10, 0.8); splash(fx, x, y, r * 0.3, big ? 30 : 18, 320);
    fx.crack(x, y, r * 1.1, '#1a0206', 9, '#ff3048', big ? 9 : 6); fx.decal(x, y, r * 0.8, 'rgba(90,0,14,0.5)', 9);
    fx.shake(big ? 12 : 7); if (big) fx.punch(0.03, x, y);
  }
  const E = (id, name, category, desc, spawn) => BD.defineEffect(id, { name, category, params: {}, desc, spawn });

  E('mohgsweep', '蒙格・三叉戟橫掃', '斬擊', '黑底猩紅的寬弧刃光，刃緣一道金線，沿弧甩出一串血滴。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 300, arc = o.arc || 2.6;
    trident(fx, x, y, a, arc, r, 0.3, o.el === 'bloodflame'); if (o.el === 'bloodflame') wash(fx, x, y, a, arc, r, 0.18); fx.shake(5, a);
  });
  E('mohgslam', '蒙格・聖槍重砸', '砸地', '三叉戟過頂砸地：三道並列的刺痕、放射裂地、血浪往外濺。', (fx, x, y, o) => {
    const r = o.radius || 140, a = o.angle || 0;
    for (const l of [-1, 0, 1]) { const [px, py] = at(x, y, a, 0, l * r * 0.28); fx.streak(px - Math.cos(a) * r * 0.5, py - Math.sin(a) * r * 0.5, px + Math.cos(a) * r * 0.4, py + Math.sin(a) * r * 0.4, 6, CRIM, 0.4, true); }
    fx.shock(x, y, 10, r * 1.3, 0.4, CRIM, 10, CORE); fx.crack(x, y, r * 1.3, INK, 8, '#ff3048', 7); splash(fx, x, y, r * 0.3, 22, 300);
    fx.debris(x, y, '#3a2a28', 10, 260, 5, r * 0.4); fx.flashAt(x, y, r, '#ffd0c0', 0.1); fx.shake(9, a);
  });
  E('mohgexplode', '蒙格・血焰爆炸', '爆炸', '延遲的血焰大爆炸：白熱閃光、猩紅震波、火舌竄起、血滴與裂地四散。', (fx, x, y, o) => blast(fx, x, y, o.radius || 220, (o.radius || 220) >= 220));
  E('mohgthrust', '蒙格・穿地突刺', '突刺', '三叉戟筆直刺進地面：三道平行猩紅槍光、尖端地面炸裂、血柱噴起。', (fx, x, y, o) => {
    const a = o.angle || 0, len = o.len || 300;
    for (const l of [-1, 0, 1]) { const [sx, sy] = at(x, y, a, 20, l * 16), [ex, ey] = at(x, y, a, len * (l ? 0.88 : 1), l * 22); fx.streak(sx, sy, ex, ey, l ? 6 : 10, l ? RED : CRIM, 0.3, true); }
    const [tx, ty] = at(x, y, a, len * 0.92, 0); fx.beam(x, y, tx, ty, 30, DEEP, 0.2, CRIM);
    fx.pillar(tx, ty, 26, CRIM, 0.45); fx.crack(tx, ty, 90, INK, 7, '#ff3048', 6); splash(fx, tx, ty, 10, 24, 280, a, 1.6); fx.shake(7, a);
  });
  E('mohgtax', '蒙格・血稅', '突刺', '裹著血焰扭轉刺出：沿槍身旋轉的螺旋血帶、尖端血焰爆開，一路甩出血霧。', (fx, x, y, o) => {
    const a = o.angle || 0, len = o.len || 340;
    for (let i = 0; i < 14; i++) fx.after(i * 0.012, () => { const u = i / 13, s = Math.sin(u * TAU * 2.2) * 26, [px, py] = at(x, y, a, len * u, s), [qx, qy] = at(x, y, a, len * (u + 0.07), -s); fx.streak(px, py, qx, qy, 7, i % 2 ? CRIM : HOT, 0.35, true); });
    fx.stream(x, y, a, 0.2, len, FLAME, 0.22, 0.6);
    const [tx, ty] = at(x, y, a, len, 0); fx.flashAt(tx, ty, 80, CORE, 0.14); fx.shock(tx, ty, 8, 110, 0.35, CRIM, 8, CORE); splash(fx, tx, ty, 10, 26, 300, a, 1.4); flames(fx, tx, ty, 40, 6, 0.5); fx.shake(8, a);
  });
  E('mohgtalonburst', '蒙格・猛禽爪爆裂', '爆炸', '懸空的血焰爪痕一齊爆開：整條爪痕噴出火舌、白熱裂線、血滴往兩側炸。', (fx, x, y, o) => {
    const a = o.angle || 0, len = o.len || 340;
    const [ex, ey] = at(x, y, a, len, 0); fx.beam(x, y, ex, ey, 34, RED, 0.3, CORE); fx.streak(x, y, ex, ey, 8, CORE, 0.2, true);
    for (let i = 0; i < 6; i++) fx.after(i * 0.02, () => { const [px, py] = at(x, y, a, len * (0.15 + i * 0.15), 0); flames(fx, px, py, 34, 3, 0.5); splash(fx, px, py, 6, 4, 220, a + Math.PI / 2 * (i % 2 ? 1 : -1), 1); });
    fx.shake(6, a);
  });
  E('mohgboon', '蒙格・血之恩賜', '區域', '伸手探入無形之母、灑出整片血焰：火舌塗滿扇形、血滴拋飛落地起火。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 300, arc = o.arc || 3.4;
    wash(fx, x, y, a, arc, r, 0.3);
    for (let i = 0; i < 10; i++) fx.after(0.05 + i * 0.02, () => { const an = a + (V() - 0.5) * arc, [px, py] = at(x, y, an, r * (0.4 + 0.55 * V()), 0); splash(fx, px, py, 6, 4, 120); fx.embers(px, py, HOT, 4, 20, 80); });
    fx.glow(x, y, 120, CRIM, 0.35, 0.7, 0.5); fx.shake(5, a);
  });
  E('mohgshower', '蒙格・血雨灑落', '區域', '往頭頂一灑，血雨落滿身邊一圈：無數血滴落地、圈內竄起火舌。', (fx, x, y, o) => {
    const r = o.radius || 210;
    for (let i = 0; i < 18; i++) fx.after(i * 0.015, () => { const an = V() * TAU, d = Math.sqrt(V()) * r, px = x + Math.cos(an) * d, py = y + Math.sin(an) * d; fx.streak(px - 30, py - 110, px, py, 3, CRIM, 0.18, true); splash(fx, px, py, 4, 3, 90); });
    flames(fx, x, y, r * 0.9, 12, 0.7); fx.ring(x, y, r * 0.9, r * 1.05, 0.5, 'rgba(224,20,46,0.55)', 8); fx.shake(4);
  });
  E('mohgrise', '蒙格・血焰上撩', '斬擊', '三叉戟由下往上撩起：直立的猩紅弧、火舌往上竄、碎石拋起。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 260, arc = o.arc || 1.9;
    trident(fx, x, y, a, arc, r, 0.32, true); wash(fx, x, y, a, arc * 0.7, r * 0.9, 0.18);
    const [px, py] = at(x, y, a, r * 0.6, 0); fx.debris(px, py, '#3a2a28', 8, 220, 4, 40); fx.shake(6, a);
  });
  E('mohgtakeoff', '蒙格・振翼騰空', '位移', '黑羽一振、捲起一圈血霧與飄落的黑色羽毛，人影沖上半空。', (fx, x, y, o) => {
    const r = (o.src && o.src.r) || 70;
    fx.shock(x, y, r * 0.5, r * 2.6, 0.5, 'rgba(60,10,20,0.8)', 12); fx.gust(x, y, r * 2.4);
    for (let i = 0; i < fx.budget(22); i++) { const an = V() * TAU, s = 90 + V() * 160; const p = fx.part(BD.PK.SHARD, x + Math.cos(an) * r, y + Math.sin(an) * r, Math.cos(an) * s, Math.sin(an) * s, 1.2 + V() * 0.8, FEATHER, 5 + V() * 4, 1.6); if (!p) break; p.vz = 60 + V() * 120; p.g = 120; }
    fx.smoke(x, y, '#3a0a12', 10, r); splash(fx, x, y, r * 0.5, 14, 200); fx.shake(6);
  });
  E('mohgdive', '蒙格・俯衝刺落', '砸地', '從天而降、三叉戟刺進落點：直落的猩紅光柱、雙層震波、黑羽與血浪炸開。', (fx, x, y, o) => {
    const r = o.radius || 190;
    fx.pillar(x, y, r * 0.45, CRIM, 0.5); fx.streak(x, y - 420, x, y, 18, CRIM, 0.25, true); blast(fx, x, y, r, true);
    for (let i = 0; i < fx.budget(12); i++) { const an = V() * TAU, s = 120 + V() * 140; const p = fx.part(BD.PK.SHARD, x, y, Math.cos(an) * s, Math.sin(an) * s, 1.1 + V() * 0.6, FEATHER, 5 + V() * 3, 1.8); if (!p) break; p.vz = 100 + V() * 160; p.g = 160; }
  });
  E('mohgbloodrain', '蒙格・血焰雨滴', '投射物', '從天落下的血焰團砸地：小圈猩紅震波、火舌與血滴。', (fx, x, y, o) => {
    const r = o.radius || 80;
    fx.flashAt(x, y, r * 0.8, '#ffb0a0', 0.1); fx.shock(x, y, 6, r * 1.1, 0.3, CRIM, 6, CORE); flames(fx, x, y, r * 0.6, 5, 0.6); splash(fx, x, y, 8, 10, 200); fx.decal(x, y, r * 0.6, 'rgba(90,0,14,0.45)', 6);
  });
  E('mohgcharge', '蒙格・血焰蓄勢', '增益', '血焰往身上收束：猩紅光點聚攏、腳下一圈血霧；衝鋒時沿路拉出火舌。', (fx, x, y, o) => {
    const r = (o.src && o.src.r) || 70;
    if (o.len) { const a = o.angle || 0, [ex, ey] = at(x, y, a, o.len, 0); fx.stream(x, y, a, 0.25, o.len, FLAME, o.dur || 0.4, 0.6); fx.streak(x, y, ex, ey, 14, CRIM, 0.35, true); fx.shake(7, a); return; }
    fx.charge(x, y, r * 1.6, CRIM, o.life || 0.8, o.src, 16); fx.ring(x, y, r * 1.2, r * 0.6, o.life || 0.8, 'rgba(224,20,46,0.6)', 6); fx.embers(x, y, HOT, 10, r, 60);
  });
  E('mohgswing', '蒙格・血焰大橫掃', '斬擊', '燃著血焰的聖槍大弧橫掃：極寬的猩紅刃、整片火舌、弧緣留下一串懸著的火點。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 330, arc = o.arc || 4;
    trident(fx, x, y, a, arc, r, 0.36, true); wash(fx, x, y, a, arc, r, 0.22); fx.grade('#7a0a18', 0.08, 0.3); fx.shake(9, a);
  });
  E('mohgcommune', '蒙格・交感無形之母', '大招', '高舉聖槍：腳下泛起一圈圈黑色波紋、血光往槍尖聚攏，天色轉紅。', (fx, x, y, o) => {
    const r = (o.src && o.src.r) || 70, life = o.life || 1.4;
    fx.charge(x, y, r * 2.4, CRIM, life, o.src, 26); fx.veil(life + 0.4, 0.35, '#1a0006');
    for (let i = 0; i < 5; i++) fx.after(i * life / 5, () => fx.ring(x, y, r * 0.6, r * 4.2, 0.9, 'rgba(10,0,4,0.7)', 10));
    fx.grade('#5a0010', 0.2, life + 0.3);
  });
  E('mohgcommuneblast', '蒙格・血之誕生', '大招', '血紅放射狀爆光吞沒四周：全屏紅閃、放射速度線、多層震波與漫天血滴。', (fx, x, y, o) => {
    const r = o.radius || 420;
    fx.flash('#ff1a2a', 0.5); fx.grade('#9a0a18', 0.35, 1.2); fx.punch(0.06, x, y); fx.shake(18);
    for (let i = 0; i < 28; i++) { const a = i * TAU / 28 + V() * 0.1, [ex, ey] = at(x, y, a, r * (1.1 + V() * 0.4), 0); fx.streak(x, y, ex, ey, 4 + V() * 4, i % 3 ? CRIM : CORE, 0.35, true); }
    for (let k = 0; k < 3; k++) fx.after(k * 0.08, () => fx.shock(x, y, r * 0.1, r * (1 + k * 0.25), 0.6, CRIM, 18 - k * 4, CORE));
    blast(fx, x, y, r * 0.5, true); splash(fx, x, y, r * 0.3, 50, 520);
  });
  E('mohgnihilend', '蒙格・虛無終砸', '大招', '吸盡鮮血後從空中重砸：血日崩落般的巨大光柱、四層震波、整片血焰火海。', (fx, x, y, o) => {
    const r = o.radius || 300;
    fx.flash('#ff2030', 0.45); fx.pillar(x, y, r * 0.6, CRIM, 0.7); fx.streak(x, y - 600, x, y, 40, CRIM, 0.3, true);
    for (let k = 0; k < 4; k++) fx.after(k * 0.07, () => fx.shock(x, y, r * 0.15, r * (1 + k * 0.3), 0.6, CRIM, 16, CORE));
    blast(fx, x, y, r, true); flames(fx, x, y, r * 1.1, 20, 1); fx.punch(0.06, x, y); fx.shake(20);
  });
  E('mohgawaken', '蒙格・Nihil 展翼', '大招', '轉階段：天上亮起血色光點、膨脹成血日；三聲 Nihil 震波之後，黑羽撕裂展開、羽毛漫天飄落。', (fx, x, y, o) => {
    const r = (o.src && o.src.r) || 70, life = o.life || 2.7;
    fx.veil(life + 0.6, 0.5, '#200008'); fx.grade('#8a0014', 0.3, life + 0.6);
    fx.charge(x, y, r * 3, CRIM, life * 0.6, o.src, 30);
    fx.after(life * 0.92, () => {
      fx.flash('#ff2030', 0.4); fx.shock(x, y, r * 0.5, r * 5, 0.8, CRIM, 20, CORE); fx.shake(16); fx.punch(0.05, x, y);
      for (let i = 0; i < fx.budget(60); i++) { const an = V() * TAU, s = 60 + V() * 260; const p = fx.part(BD.PK.SHARD, x + Math.cos(an) * r * 0.6, y + Math.sin(an) * r * 0.6, Math.cos(an) * s, Math.sin(an) * s, 1.6 + V() * 1.2, FEATHER, 5 + V() * 5, 1.4); if (!p) break; p.vz = 120 + V() * 220; p.g = 90; }
      splash(fx, x, y, r, 40, 380); flames(fx, x, y, r * 1.6, 18, 1);
    });
  });
  E('mohgpool', '蒙格・血焰池', '區域', '血液落地起火：一灘暗紅血泊、邊緣竄起火舌。', (fx, x, y, o) => {
    const r = o.radius || 70; fx.decal(x, y, r * 0.7, 'rgba(140,0,20,0.3)', 4); splash(fx, x, y, r * 0.4, 6, 90); fx.after(0.3, () => flames(fx, x, y, r * 0.7, 4, 0.6));
  });
  E('mohgcurse', '蒙格・血之咒環', '增益', '血之咒環套上身：紅色符文圈從腳下收緊、頭頂一圈血色光環。', (fx, x, y, o) => {
    const r = o.radius || 60;
    fx.ring(x, y, r * 1.8, r * 0.9, 0.6, 'rgba(255,40,60,0.85)', 6); fx.ring(x, y, r * 1.2, r * 1.0, 0.9, 'rgba(255,200,200,0.6)', 2);
    for (let i = 0; i < 10; i++) { const a = i * TAU / 10, [px, py] = at(x, y, a, r, 0); fx.sparkle(px, py, CRIM, 2, 60); }
    fx.pillar(x, y, r * 0.35, CRIM, 0.5); fx.glow(x, y, r * 1.5, CRIM, 0.5, 0.6, 0.2);
  });
  E('mohgnihil', '蒙格・Nihil', '大招', '高舉聖槍念出 Nihil：槍尖血光炸開、天上的血日一震、全場紅閃。', (fx, x, y, o) => {
    const r = o.radius || 200;
    fx.flash('#ff1020', 0.35); fx.grade('#a00018', 0.25, 0.5); fx.shock(x, y, r * 0.2, r * 2.2, 0.55, CRIM, 14, CORE); fx.flashAt(x, y - 60, r * 0.7, CORE, 0.18); fx.shake(10);
  });
  E('mohgdrain', '蒙格・虛無吸血', '大招', '血從咒印者身上被抽出：腳下咒環亮起、螺旋血柱沖天、血霧往上捲。', (fx, x, y, o) => {
    const r = o.radius || 60, n = o.n || 0;
    fx.ring(x, y, r * 1.4, r * 0.8, 0.5, 'rgba(255,60,70,0.9)', 7); fx.pillar(x, y, r * (0.4 + n * 0.1), CRIM, 0.7);
    for (let i = 0; i < 18; i++) fx.after(i * 0.02, () => { const a = i * 0.9, h = i * 14; fx.streak(x + Math.cos(a) * r * 0.5, y - h, x + Math.cos(a + 0.9) * r * 0.5, y - h - 14, 4, i % 2 ? CRIM : CORE, 0.4, true); });
    splash(fx, x, y, r * 0.3, 14 + n * 6, 160); fx.smoke(x, y, '#5a0a14', 6, r);
  });
  E('mohgboonbuff', '蒙格・血之恩寵', '增益', '鮮血流淌、力量高漲：身上竄起一圈血焰、腳下暗紅光暈。', (fx, x, y, o) => {
    const r = (o.src && o.src.r) || 70; fx.glow(x, y, r * 1.8, CRIM, 0.7, 0.7, 0.3, o.src); flames(fx, x, y, r * 0.8, 8, 0.7); fx.ring(x, y, r * 0.6, r * 1.6, 0.5, 'rgba(255,60,70,0.7)', 5);
  });
})(typeof window !== 'undefined' ? window : globalThis);
