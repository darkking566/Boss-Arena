'use strict';
// 滿月女王蕾娜菈專屬特效：琥珀金罩、大書庫飛天書卷、發光白墓碑、燃燒吊燈、輝石魔礫、卡利亞權杖旋風、
// 彗星亞茲勒巨型星空光束、蕾娜菈的滿月、以及四大喚魂靈體（離群野狼、獵犬騎士、山妖巨人、王室飛龍）。
// 純視覺：只用 BD.vrng，不參與傷害或狀態；puff / stream 色票一律使用 #rrggbb。
(function (G) {
  const BD = G.BD, V = BD.vrng, TAU = Math.PI * 2;
  const CORE = '#f6fbff', MOON = '#a8e4ff', CYAN = '#54c6ff', AZUR = '#2680eb', DEEP = '#102048', INK = '#080e24';
  const AMBER = '#ffcf58', GOLD = '#f59e0b', WARM = '#fff4c8', CRIM = '#c83848', SILV = '#dceeff';
  const STREAM_MOON = [CORE, MOON, CYAN, DEEP];
  const STREAM_AZUR = [CORE, CYAN, AZUR, DEEP];
  const STREAM_AMBER = [WARM, AMBER, GOLD, '#5a3208'];

  BD.defineElement('fullmoon', {
    name: '滿月星輝', rim: DEEP, debris: '#6aa8d8', core: CORE, glow: CYAN, particle: MOON,
    smoke: 'rgba(20,42,92,0.48)', decal: 'rgba(16,32,72,0.45)', crack: '#8fe4ff', extra: 'motes',
  });
  BD.KIND_EL.fullmoon = 'fullmoon';

  const at = (x, y, a, d, l) => [x + Math.cos(a) * d - Math.sin(a) * (l || 0), y + Math.sin(a) * d + Math.cos(a) * (l || 0)];

  function moonMotes(fx, x, y, r, n, speed, gold) {
    const cols = gold ? [WARM, AMBER, GOLD, CORE] : [CORE, MOON, CYAN, SILV];
    for (let i = 0; i < fx.budget(n); i++) {
      const a = V() * TAU, d = Math.sqrt(V()) * r, v = (speed || 75) * (0.35 + V() * 0.85);
      if (!fx.part(BD.PK.MOTE, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * v, Math.sin(a) * v - 18, 0.65 + V() * 0.85, cols[i % cols.length], 2 + V() * 2.8, 1.35)) break;
    }
  }

  function starFlare(fx, x, y, r, life, col) {
    const c = col || MOON;
    fx.flashAt(x, y, r, CORE, life || 0.16);
    for (let i = 0; i < 4; i++) {
      const a = i * TAU / 4 + 0.35, [ex, ey] = at(x, y, a, r * 1.25, 0), [sx, sy] = at(x, y, a, -r * 1.25, 0);
      fx.streak(sx, sy, ex, ey, 3 + r * 0.035, i % 2 ? c : CORE, life || 0.22, true);
    }
  }

  function pushSpiritVisual(o, kind, x, y, extra) {
    const b = o && o.src;
    if (!b || !b.world) return;
    const list = b._spirits || (b._spirits = []);
    if (list.length > 10) list.shift();
    list.push(Object.assign({
      kind, x, y, angle: (o && o.angle) || 0, r: (o && o.radius) || 90, len: (o && o.len) || 240,
      t0: b.world.time, life: (o && o.life) || 0.9,
    }, extra || {}));
  }

  const E = (id, name, category, desc, spawn) => BD.defineEffect(id, { name, category, params: {}, desc, spawn });

  // ── 一階段：大書庫琥珀金罩、書卷、白墓碑、吊燈、重力球 ──
  E('rennala_amber_cast', '蕾娜菈・琥珀卵聖歌', '增益', '甜美小生徒的聖歌凝聚成溫暖的黃金琥珀球罩，金光環繞並飄起發光書頁與星塵。', (fx, x, y, o) => {
    const r = o.radius || 85;
    fx.flashAt(x, y, r * 1.1, WARM, 0.18);
    fx.glow(x, y, r * 1.5, AMBER, 0.45, 0.75, 0.35, o.src);
    fx.shock(x, y, r * 0.25, r * 1.2, 0.48, AMBER, 10, WARM);
    fx.ring(x, y, r * 0.6, r * 1.35, 0.65, 'rgba(245,158,11,0.55)', 8);
    moonMotes(fx, x, y, r, 22, 95, true);
    fx.shake(4);
  });

  E('rennala_shatter', '蕾娜菈・琥珀金罩碎裂', '爆炸', '琥珀防護金球被打穿碎裂，漫天黃金琥珀薄片四散飛濺。', (fx, x, y, o) => {
    const r = o.radius || 80;
    fx.flashAt(x, y, r * 1.3, WARM, 0.2);
    fx.shock(x, y, r * 0.4, r * 1.5, 0.42, AMBER, 12, CORE);
    for (let i = 0; i < fx.budget(26); i++) {
      const a = V() * TAU, s = 120 + V() * 220;
      const p = fx.part(BD.PK.SHARD, x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4, Math.cos(a) * s, Math.sin(a) * s, 0.7 + V() * 0.5, i % 2 ? AMBER : WARM, 5 + V() * 5, 1.5);
      if (!p) break;
      p.vz = 90 + V() * 160; p.g = 420;
    }
    fx.shake(8);
  });

  E('rennala_books', '蕾娜菈・小生徒書卷齊射', '投射物', '大書庫小生徒吟唱拋出鑲金魔導書卷，書頁翻飛並灑落金色燭火星點。', (fx, x, y, o) => {
    const a = o.angle || 0, arc = Math.max(0.3, o.arc || 0.55);
    fx.stream(x, y, a, Math.min(0.65, arc), 160, STREAM_AMBER, 0.2, 0.4);
    starFlare(fx, x + Math.cos(a) * 26, y + Math.sin(a) * 26, 40, 0.14, AMBER);
    moonMotes(fx, x, y, 42, 14, 110, true);
  });

  E('rennala_tombstone', '蕾娜菈・白墓碑轟炸', '砸地', '半空凝結的潔白浮雕墓碑轟然墜地，炸開銀白與琥珀金交織的石塊與符文震波。', (fx, x, y, o) => {
    const r = o.radius || 95;
    fx.pillar(x, y, r * 0.5, SILV, 0.42);
    starFlare(fx, x, y, r * 0.95, 0.16, AMBER);
    fx.shock(x, y, 10, r * 1.18, 0.4, SILV, 10, CORE);
    fx.ring(x, y, r * 0.4, r * 1.25, 0.52, 'rgba(255,207,88,0.55)', 8);
    fx.crack(x, y, r * 1.1, '#1a2238', 7, '#dceeff', 6);
    fx.debris(x, y, '#e2e8f0', 14, 240, 5, r * 0.45);
    moonMotes(fx, x, y, r * 0.8, 16, 130, true);
    fx.shake(7);
  });

  E('rennala_chandelier', '蕾娜菈・大書庫吊燈墜落', '爆炸', '大書庫高空燃燒的黃銅燭台吊燈呼嘯砸落，燭火與碎金四濺並點燃地面。', (fx, x, y, o) => {
    const r = o.radius || 120;
    fx.streak(x - 40, y - 380, x, y, 14, AMBER, 0.22, true);
    fx.flashAt(x, y, r * 1.15, '#ffe8b0', 0.18);
    fx.shock(x, y, 12, r * 1.2, 0.45, '#ff8a2a', 12, WARM);
    for (let i = 0; i < 10; i++) {
      const a = V() * TAU, d = Math.sqrt(V()) * r * 0.75;
      fx.puff(x + Math.cos(a) * d, y + Math.sin(a) * d, (V() - 0.5) * 35, -35 - V() * 45, 6, r * 0.28 + 8, 0.55 + V() * 0.35, i % 2 ? '#ff7a1a' : AMBER, 0.75, 1);
    }
    fx.embers(x, y, AMBER, 24, r * 0.85, 95);
    fx.crack(x, y, r * 1.15, '#241408', 8, '#ff9a2a', 6);
    fx.shake(9);
  });

  E('rennala_gravity_pull', '蕾娜菈・琥珀引力漩渦', '區域', '高舉琥珀卵開啟紫金引力漩渦，將四周與敵人強力拉向女王身前。', (fx, x, y, o) => {
    const r = o.radius || 320;
    fx.glow(x, y, r * 0.7, '#7c3aed', 0.45, 0.55, 0.35, o.src);
    fx.ring(x, y, r, 24, 0.42, 'rgba(185,140,255,0.85)', 10);
    fx.ring(x, y, r * 0.72, 16, 0.32, 'rgba(255,207,88,0.8)', 7);
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12 + V() * 0.2, sx = x + Math.cos(a) * r * 0.85, sy = y + Math.sin(a) * r * 0.85;
      fx.streak(sx, sy, x + Math.cos(a) * 28, y + Math.sin(a) * 28, 4, i % 2 ? AMBER : '#c4b5fd', 0.28, true);
    }
    fx.flashAt(x, y, 65, WARM, 0.2);
    fx.shake(7);
  });

  E('rennala_gravity', '蕾娜菈・大書庫琥珀坍縮', '爆炸', '琥珀重力蓄勢後轟然坍縮，引爆大範圍黃金與星輝衝擊波。', (fx, x, y, o) => {
    const r = o.radius || 185;
    fx.ring(x, y, r * 1.25, r * 0.18, 0.28, 'rgba(185,140,255,0.75)', 10);
    fx.flashAt(x, y, r * 1.2, WARM, 0.22);
    fx.glow(x, y, r * 1.5, AMBER, 0.5, 0.8, 0.35);
    fx.shock(x, y, r * 0.15, r * 1.2, 0.5, AMBER, 15, CORE);
    fx.shock(x, y, r * 0.3, r * 1.35, 0.62, CYAN, 8, MOON);
    fx.crack(x, y, r * 1.1, DEEP, 9, AMBER, 7);
    moonMotes(fx, x, y, r, 32, 160, true);
    fx.punch(0.03, x, y);
    fx.shake(11);
  });

  E('rennala_moonstep', '蕾娜菈・月影瞬步', '增益', '化作星輝銀霧瞬間側移拉開距離，原地留下一輪淡藍滿月殘影。', (fx, x, y, o) => {
    const tx = o.toX != null ? o.toX : x + 150, ty = o.toY != null ? o.toY : y;
    fx.ring(x, y, 12, 68, 0.34, 'rgba(168,228,255,0.75)', 6);
    fx.ring(tx, ty, 58, 18, 0.34, 'rgba(246,251,255,0.85)', 6);
    fx.streak(x, y, tx, ty, 11, CYAN, 0.26, true);
    fx.streak(x, y, tx, ty, 4, CORE, 0.24, true);
    moonMotes(fx, x, y, 42, 10, 95, false);
    moonMotes(fx, tx, ty, 46, 12, 110, false);
  });

  E('rennala_scholar_choir', '蕾娜菈・小生徒聖歌結界', '區域', '腳下浮現金色吟唱聖歌環與懸浮書頁結界，隨即展開延遲星紋地雷陣。', (fx, x, y, o) => {
    const r = o.radius || 105;
    fx.ring(x, y, r * 0.35, r * 1.08, 0.55, 'rgba(255,207,88,0.82)', 7);
    fx.ring(x, y, r * 1.05, r * 0.72, 0.55, 'rgba(255,244,200,0.65)', 4);
    fx.glow(x, y, r * 1.15, AMBER, 0.38, 0.65, 0.28);
    moonMotes(fx, x, y, r * 0.9, 18, 85, true);
  });

  E('rennala_phalanx_ring', '蕾娜菈・輝劍擴散環波', '區域', '頭頂輝劍陣齊鳴之際，地面推開一圈中距藍銀星輝圓環衝擊波。', (fx, x, y, o) => {
    const r0 = o.r0 || 105, r1 = o.radius || 235, rm = (r0 + r1) * 0.5;
    fx.shock(x, y, Math.max(12, r0), r1 * 1.02, 0.42, CYAN, 12, CORE);
    fx.ring(x, y, r0 * 0.95, r1, 0.46, 'rgba(168,228,255,0.8)', 8);
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12 + V() * 0.2;
      fx.sparkle(x + Math.cos(a) * rm, y + Math.sin(a) * rm, i % 2 ? MOON : CORE, 3, 95);
    }
    fx.shake(6);
  });

  E('rennala_crystal_cross', '蕾娜菈・結晶光束交錯斬', '斬擊', '青藍輝石結晶稜鏡折射出多道縱橫交錯的高能星光斬線。', (fx, x, y, o) => {
    const a = o.angle || 0, len = o.len || 320, w = o.width || 44;
    const [ex, ey] = at(x, y, a, len, 0);
    fx.beam(x, y, ex, ey, w * 0.78, DEEP, 0.3, CYAN);
    fx.streak(x, y, ex, ey, Math.max(5, w * 0.26), CORE, 0.32, true);
    const [mx, my] = at(x, y, a, len * 0.5, 0);
    starFlare(fx, mx, my, Math.max(48, w * 1.2), 0.2, MOON);
    moonMotes(fx, mx, my, len * 0.35, 16, 150, false);
    fx.shake(5, a);
  });

  // ── 卡利亞與雷亞盧卡利亞輝石魔法 ──
  E('rennala_glint_volley', '蕾娜菈・輝石魔礫連射', '投射物', '平舉卡利亞權杖展開一排湛藍輝石法陣，連續射出拖著星芒尾跡的輝石魔礫。', (fx, x, y, o) => {
    const a = o.angle || 0, arc = Math.max(0.25, o.arc || 0.45);
    fx.stream(x, y, a, Math.min(0.6, arc), 180, STREAM_MOON, 0.2, 0.48);
    starFlare(fx, x + Math.cos(a) * 32, y + Math.sin(a) * 32, 48, 0.16, CYAN);
    moonMotes(fx, x, y, 48, 16, 130, false);
  });

  E('rennala_spin_scepter', '蕾娜菈・轉啊轉權杖旋風', '斬擊', '卡利亞權杖在身前高速旋轉，拉出多圈璀璨的冰藍與銀白劍刃漩渦。', (fx, x, y, o) => {
    const r = o.radius || 135;
    for (let i = 0; i < 4; i++) {
      fx.slash(x, y, i * TAU / 4 + V() * 0.4, 2.3, r * (0.82 + i * 0.06), DEEP, 18, 0.32, { core: i % 2 ? CYAN : CORE, trail: 3 });
    }
    fx.ring(x, y, r * 0.35, r * 1.1, 0.38, 'rgba(110,215,255,0.75)', 10);
    starFlare(fx, x, y, r * 0.75, 0.16, CYAN);
    moonMotes(fx, x, y, r, 22, 150, false);
    fx.shake(6);
  });

  E('rennala_phalanx', '蕾娜菈・卡利亞輝劍魔弧', '斬擊', '揮動卡利亞權杖斬出寬闊的新月形輝石劍氣，弧緣迸發湛藍結晶星點。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 230, arc = o.arc || 2.1;
    fx.slash(x, y, a, arc, r, DEEP, 22, 0.32, { core: CYAN, trail: 3 });
    fx.slash(x, y, a, arc * 0.9, r * 0.96, 'rgba(246,251,255,0.75)', 6, 0.26);
    const n = Math.max(1, Math.ceil(arc / 0.65)), sub = Math.min(arc, 0.65);
    for (let i = 0; i < n; i++) {
      fx.stream(x, y, n === 1 ? a : a - arc / 2 + sub / 2 + (arc - sub) * i / (n - 1), sub, r * 0.92, STREAM_MOON, 0.2, 0.42);
    }
    moonMotes(fx, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.6, 18, 120, false);
    fx.shake(5, a);
  });

  E('rennala_crystal', '蕾娜菈・結晶散射星光陣', '區域', '權杖前端炸開璀璨的青藍輝石結晶群，扇形噴發無數高速晶刺與星芒。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 260, arc = o.arc || 1.35;
    const n = Math.max(1, Math.ceil(arc / 0.6)), sub = Math.min(arc, 0.6);
    for (let i = 0; i < n; i++) {
      fx.stream(x, y, n === 1 ? a : a - arc / 2 + sub / 2 + (arc - sub) * i / (n - 1), sub, r, STREAM_AZUR, 0.26, 0.52);
    }
    for (let i = 0; i < 14; i++) {
      const an = a + (V() - 0.5) * arc, len = r * (0.45 + 0.55 * V()), [ex, ey] = at(x, y, an, len, 0);
      fx.streak(x, y, ex, ey, 4 + V() * 3, i % 3 ? CYAN : CORE, 0.26, true);
    }
    starFlare(fx, x + Math.cos(a) * 28, y + Math.sin(a) * 28, 65, 0.18, CYAN);
    moonMotes(fx, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.6, 26, 180, false);
    fx.shake(7, a);
  });

  // ── 二階段：喚魂之鈴與四大靈體骨灰（野狼、獵犬騎士、山妖巨人、王室飛龍） ──
  E('rennala_summon_sigil', '蕾娜菈・卡利亞喚魂法陣', '增益', '左手搖響喚魂之鈴，腳下水面展開銀白雙環卡利亞紋章法陣，白霧與星柱升起。', (fx, x, y, o) => {
    const r = o.radius || 90;
    fx.ring(x, y, r * 0.2, r * 1.35, 0.65, 'rgba(220,238,255,0.85)', 8);
    fx.ring(x, y, r * 1.1, r * 0.75, 0.75, 'rgba(120,212,255,0.65)', 4);
    fx.pillar(x, y, r * 0.42, SILV, 0.55);
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8, [px, py] = at(x, y, a, r * 0.9, 0);
      fx.sparkle(px, py, CORE, 3, 70);
    }
    moonMotes(fx, x, y, r * 1.1, 20, 90, false);
  });

  E('rennala_spirit_wolves', '蕾娜菈・喚魂離群野狼', '投射物', '從銀白喚魂霧中躍出的離群野狼靈體，拖著冰藍星尾撲向獵物。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 44;
    pushSpiritVisual(o, 'wolves', x, y, { life: 0.55 });
    fx.puff(x, y, Math.cos(a) * 40, Math.sin(a) * 40, 10, r, 0.45, SILV, 0.65, 2);
    fx.ring(x, y, 8, r * 1.2, 0.35, 'rgba(220,238,255,0.75)', 5);
    moonMotes(fx, x, y, r, 10, 120, false);
  });

  E('rennala_spirit_bloodhound', '蕾娜菈・喚魂獵犬騎士', '斬擊', '銀藍半透明的獵犬騎士靈體自白霧現身，以獵犬步伐瞬移並揮出凌厲的大曲劍弧光。', (fx, x, y, o) => {
    const a = o.angle || 0, len = o.len || 250, w = o.radius || 64, life = o.life || 0.85;
    pushSpiritVisual(o, 'bloodhound', x, y, { len, r: w, life });
    fx.ring(x, y, 10, w * 1.1, 0.4, 'rgba(220,238,255,0.8)', 6);
    fx.puff(x, y, 0, -25, 12, w * 0.9, 0.5, SILV, 0.6, 2);
    const hitAt = Math.max(0.1, life - 0.42);
    fx.after(hitAt, () => {
      const [mx, my] = at(x, y, a, len * 0.5, 0), [ex, ey] = at(x, y, a, len, 0);
      fx.beam(x, y, ex, ey, w * 0.72, DEEP, 0.26, CYAN);
      fx.streak(x, y, ex, ey, 12, CORE, 0.28, true);
      fx.slash(mx, my, a, 2.2, len * 0.55, DEEP, 22, 0.3, { core: SILV, trail: 3 });
      moonMotes(fx, mx, my, len * 0.45, 20, 160, false);
      fx.shake(7, a);
    });
  });

  E('rennala_spirit_troll', '蕾娜菈・喚魂山妖巨人', '砸地', '高大的宣誓山妖巨人靈體從銀白法陣拔地而起，高舉巨型石劍重砸地面引發銀藍裂地震波。', (fx, x, y, o) => {
    const r = o.radius || 135, life = o.life || 1.1;
    pushSpiritVisual(o, 'troll', x, y, { r, life });
    fx.ring(x, y, r * 0.3, r * 1.05, 0.55, 'rgba(220,238,255,0.75)', 8);
    fx.puff(x, y, 0, -35, 16, r * 0.75, 0.6, SILV, 0.55, 2);
    const hitAt = Math.max(0.1, life - 0.48);
    fx.after(hitAt, () => {
      fx.pillar(x, y, r * 0.55, SILV, 0.48);
      fx.flashAt(x, y, r * 1.15, CORE, 0.18);
      fx.shock(x, y, 14, r * 1.25, 0.48, CYAN, 14, CORE);
      fx.ring(x, y, r * 0.4, r * 1.38, 0.58, 'rgba(168,228,255,0.65)', 10);
      fx.crack(x, y, r * 1.2, DEEP, 9, MOON, 8);
      fx.debris(x, y, '#9fb8d8', 18, 280, 6, r * 0.45);
      moonMotes(fx, x, y, r, 26, 180, false);
      fx.punch(0.03, x, y);
      fx.shake(12);
    });
  });

  E('rennala_spirit_dragon', '蕾娜菈・喚魂王室飛龍', '區域', '巨大的王室輝石飛龍靈體展開雙翼低空掠過，張口噴出橫掃全場的銀藍輝石龍息。', (fx, x, y, o) => {
    const a = o.angle || 0, len = o.len || 430, w = o.radius || 115, life = o.life || 1.15;
    pushSpiritVisual(o, 'dragon', x, y, { len, r: w, life });
    fx.ring(x, y, 20, w * 1.3, 0.55, 'rgba(168,228,255,0.8)', 9);
    fx.gust(x, y, w * 1.8);
    const hitAt = Math.max(0.1, life - 0.55);
    fx.after(hitAt, () => {
      const [ex, ey] = at(x, y, a, len, 0);
      fx.beam(x, y, ex, ey, w * 0.92, DEEP, 0.38, CYAN);
      fx.beam(x, y, ex, ey, w * 0.48, MOON, 0.34, CORE);
      fx.stream(x, y, a, 0.32, len, STREAM_MOON, 0.35, 0.65);
      for (let i = 0; i < 8; i++) {
        fx.after(i * 0.025, () => {
          const [px, py] = at(x, y, a, len * (0.15 + i * 0.11), (V() - 0.5) * w * 0.5);
          fx.puff(px, py, Math.cos(a) * 60, Math.sin(a) * 60 - 20, 10, w * 0.42, 0.48, i % 2 ? CYAN : MOON, 0.65, 2);
        });
      }
      starFlare(fx, x, y, w * 0.85, 0.2, CYAN);
      starFlare(fx, ex, ey, w * 0.75, 0.2, CORE);
      fx.shake(11, a);
    });
  });

  // ── 二階段招牌秘術：彗星亞茲勒 & 蕾娜菈的滿月 ──
  E('rennala_comet_charge', '蕾娜菈・彗星亞茲勒蓄勢', '增益', '高舉卡利亞權杖，杖尖展開多重旋轉的深藍與星白起源魔法陣，星光急遽收束。', (fx, x, y, o) => {
    const r = (o.src && o.src.r) || 45, life = o.life || 0.9;
    fx.charge(x, y, r * 2.5, CYAN, life, o.src, 24);
    fx.ring(x, y, r * 2.2, r * 0.4, life * 0.85, 'rgba(84,198,255,0.85)', 8);
    fx.ring(x, y, r * 1.4, r * 1.9, life, 'rgba(246,251,255,0.65)', 3);
    moonMotes(fx, x, y, r * 2.2, 24, 90, false);
  });

  E('rennala_comet_beam', '蕾娜菈・起源魔法彗星亞茲勒', '大招', '權杖前端噴發貫穿整個競技場的超粗星空激流光束，多層湛藍光芯、螺旋星環與四芒星爆交織。', (fx, x, y, o) => {
    const a = o.angle || 0, len = o.len || 860, w = o.width || 118, [ex, ey] = at(x, y, a, len, 0);
    fx.beam(x, y, ex, ey, w * 1.05, DEEP, 0.38, AZUR);
    fx.beam(x, y, ex, ey, w * 0.68, CYAN, 0.34, MOON);
    fx.beam(x, y, ex, ey, w * 0.28, CORE, 0.3, '#ffffff');
    fx.stream(x, y, a, Math.max(0.14, w / len * 1.5), len, STREAM_AZUR, 0.28, 0.65);
    for (let i = 0; i < 12; i++) {
      fx.after(i * 0.016, () => {
        const u = i / 11, s = Math.sin(u * TAU * 3) * (w * 0.38);
        const [px, py] = at(x, y, a, len * u, s), [qx, qy] = at(x, y, a, len * Math.min(1, u + 0.08), -s);
        fx.streak(px, py, qx, qy, 6, i % 2 ? CORE : CYAN, 0.28, true);
        if (i % 3 === 0) moonMotes(fx, px, py, w * 0.45, 5, 140, false);
      });
    }
    starFlare(fx, x, y, w * 1.05, 0.24, CYAN);
    starFlare(fx, ex, ey, w * 0.85, 0.22, CORE);
    fx.grade('#184890', 0.12, 0.36);
    fx.shake(12, a);
  });

  E('rennala_fullmoon_orb', '蕾娜菈・化身為滿月', '增益', '蕾娜菈蜷縮身體升空化為一輪散發銀藍星輝的巨大滿月，水鏡倒映出雙月同框奇景。', (fx, x, y, o) => {
    const r = o.radius || 95, life = o.life || 1.2;
    fx.glow(x, y, r * 1.8, MOON, 0.55, life, 0.35, o.src);
    fx.ring(x, y, r * 0.6, r * 1.5, life * 0.7, 'rgba(168,228,255,0.75)', 10);
    fx.ring(x, y, r * 1.4, r * 0.9, life * 0.9, 'rgba(246,251,255,0.65)', 4);
    moonMotes(fx, x, y, r * 1.4, 28, 85, false);
  });

  E('rennala_fullmoon_blast', '蕾娜菈・滿月降臨星爆', '大招', '銀藍滿月轟然砸落鏡面月湖，掀起多層月華海嘯震波、十字星芒與漫天銀白星屑。', (fx, x, y, o) => {
    const r = o.radius || 225, big = r >= 200;
    fx.flashAt(x, y, r * 1.35, CORE, 0.24);
    fx.glow(x, y, r * 1.65, CYAN, 0.6, 0.9, 0.4);
    starFlare(fx, x, y, r * 1.15, 0.26, MOON);
    fx.shock(x, y, r * 0.15, r * 1.18, 0.52, MOON, big ? 18 : 11, CORE);
    fx.shock(x, y, r * 0.35, r * 1.38, 0.68, CYAN, big ? 10 : 7, SILV);
    fx.ring(x, y, r * 0.5, r * 1.45, 0.75, 'rgba(16,32,72,0.65)', 16);
    fx.crack(x, y, r * 1.15, INK, 10, MOON, big ? 9 : 6);
    fx.decal(x, y, r * 0.85, 'rgba(20,42,92,0.48)', 8);
    moonMotes(fx, x, y, r * 1.1, big ? 44 : 24, 210, false);
    if (big) { fx.grade('#1c4c88', 0.18, 0.5); fx.punch(0.04, x, y); }
    fx.shake(big ? 15 : 8);
  });

  // ── 二階段轉場與雙階段大招 ──
  E('rennala_phase2', '蕾娜菈・以卡利亞的滿月起誓', '大招', '魔女菈妮的誓言響徹夜空，琥珀卵湧出星霧，無邊星夜水鏡與巨型滿月在腳下轟然展開。', (fx, x, y, o) => {
    const r = (o.src && o.src.r) || 45, life = o.life || 2.2;
    fx.veil(life + 0.5, 0.42, '#060c20');
    fx.grade('#163870', 0.26, life + 0.5);
    fx.charge(x, y, r * 3.2, MOON, life * 0.65, o.src, 32);
    for (let i = 0; i < 4; i++) {
      fx.after(i * 0.28, () => fx.ring(x, y, r * 0.5, r * (3.2 + i * 0.9), 0.85, 'rgba(168,228,255,0.65)', 8));
    }
    fx.after(life * 0.85, () => {
      fx.flash('#b8ecff', 0.38);
      starFlare(fx, x, y, r * 4.2, 0.3, MOON);
      fx.shock(x, y, r * 0.4, r * 5.5, 0.85, CYAN, 20, CORE);
      moonMotes(fx, x, y, r * 4.5, 55, 240, false);
      fx.punch(0.05, x, y);
      fx.shake(16);
    });
  });

  E('rennala_ult_p1_star', '蕾娜菈・大書庫黃金星雨', '爆炸', '大書庫穹頂傾瀉金色書頁與星辰火球，墜地炸出溫暖耀眼的黃金星芒。', (fx, x, y, o) => {
    const r = o.radius || 86;
    fx.streak(x - 75, y - 340, x, y, 9, AMBER, 0.2, true);
    fx.flashAt(x, y, r * 1.05, WARM, 0.18);
    starFlare(fx, x, y, r * 0.85, 0.18, AMBER);
    fx.shock(x, y, 10, r * 1.12, 0.38, AMBER, 9, WARM);
    fx.embers(x, y, AMBER, 14, r * 0.75, 90);
    fx.shake(5);
  });

  E('rennala_ult_p1_ring', '蕾娜菈・琥珀搖籃共振環', '大招', '大書庫中心向外推進黃金聖歌共鳴圓環，逼迫敵人在內外圈之間切換走位。', (fx, x, y, o) => {
    const r0 = o.r0 || 80, r1 = o.radius || 230, rm = (r0 + r1) * 0.5;
    fx.shock(x, y, Math.max(16, r0), r1 * 1.02, 0.48, AMBER, 14, WARM);
    fx.ring(x, y, r0, r1 * 1.04, 0.54, 'rgba(255,207,88,0.72)', 8);
    for (let i = 0; i < 16; i++) {
      const a = i * TAU / 16 + V() * 0.18;
      fx.sparkle(x + Math.cos(a) * rm, y + Math.sin(a) * rm, WARM, 3, 110);
    }
    fx.shake(8);
  });

  E('rennala_ult_p1', '蕾娜菈・大書庫的琥珀輪迴', '大招', '一階段終極外環絕唱：琥珀卵綻放無緣誕生者的大盧恩金光，最外層共鳴波席捲大書庫。', (fx, x, y, o) => {
    const r0 = o.r0 || 320, r = o.radius || 540;
    fx.flash('#ffe698', 0.38);
    fx.grade('#7a4e08', 0.25, 0.8);
    fx.punch(0.05, x, y);
    fx.pillar(x, y, 165, AMBER, 0.65);
    starFlare(fx, x, y, 240, 0.28, AMBER);
    fx.shock(x, y, r0, r * 1.03, 0.62, AMBER, 18, WARM);
    fx.shock(x, y, Math.max(40, r0 * 0.85), r * 0.95, 0.55, CYAN, 8, CORE);
    moonMotes(fx, x, y, r * 0.95, 48, 240, true);
    fx.shake(15);
  });

  E('rennala_ult_p2_meteor', '蕾娜菈・星夜水鏡彗星雨', '爆炸', '深邃夜空滑落銀藍彗星碎片，撞擊水鏡炸開冰藍星芒與漣漪。', (fx, x, y, o) => {
    const r = o.radius || 88;
    fx.streak(x - 90, y - 380, x, y, 10, CYAN, 0.22, true);
    fx.streak(x - 90, y - 380, x, y, 4, CORE, 0.2, true);
    fx.flashAt(x, y, r * 1.1, CORE, 0.18);
    starFlare(fx, x, y, r * 0.9, 0.2, MOON);
    fx.shock(x, y, 12, r * 1.15, 0.4, CYAN, 10, CORE);
    moonMotes(fx, x, y, r * 0.9, 18, 150, false);
    fx.shake(6);
  });

  E('rennala_ult_p2_charge', '蕾娜菈・星蝕月光安全結界', '大招', '顛倒滿月發動前的月蝕蓄力，全場夜幕沉降，唯有一輪清澈月光庇護圈閃耀其中。', (fx, x, y, o) => {
    const r = o.radius || 122, life = o.life || 1.65;
    fx.veil(life + 0.35, 0.46, '#050a1c');
    fx.grade('#0e2b5a', 0.28, life + 0.3);
    fx.glow(x, y, r * 1.4, MOON, 0.55, life, 0.25);
    fx.pillar(x, y, r * 0.32, CORE, life * 0.85);
    for (let k = 0; k < 4; k++) {
      fx.after(k * (life * 0.22), () => {
        fx.ring(x, y, r * 1.05, r * 0.96, 0.42, 'rgba(246,251,255,0.9)', 5);
        moonMotes(fx, x, y, r * 1.2, 14, 70, false);
      });
    }
  });

  E('rennala_ult_p2', '蕾娜菈・顛倒滿月星蝕終焉', '大招', '二階段終極日蝕大爆發：安全月環之外的整片星夜水鏡同時碎裂崩塌，放射十六道滿月彗星。', (fx, x, y, o) => {
    const r = o.radius || 122;
    fx.flash('#d8f3ff', 0.5);
    fx.grade('#0c2858', 0.38, 1.3);
    fx.punch(0.06, x, y);
    fx.ring(x, y, r * 0.9, r * 1.05, 0.9, 'rgba(246,251,255,0.92)', 8);
    starFlare(fx, x, y, r * 1.8, 0.32, CORE);
    for (let i = 0; i < 20; i++) {
      const a = i * TAU / 20 + V() * 0.08;
      const sx = x + Math.cos(a) * (r * 1.08), sy = y + Math.sin(a) * (r * 1.08);
      const ex = x + Math.cos(a) * (r + 520 + V() * 240), ey = y + Math.sin(a) * (r + 520 + V() * 240);
      fx.streak(sx, sy, ex, ey, 5 + V() * 5, i % 2 ? CYAN : CORE, 0.4, true);
    }
    for (let k = 0; k < 4; k++) {
      fx.after(k * 0.08, () => fx.shock(x, y, r * 1.05, r + 240 + k * 140, 0.72, k % 2 ? CYAN : MOON, 16 - k * 2, CORE));
    }
    moonMotes(fx, x, y, r + 520, 75, 280, false);
    fx.shake(20);
  });
})(typeof window !== 'undefined' ? window : globalThis);
