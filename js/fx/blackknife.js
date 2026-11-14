'use strict';
// 黑刀刺客（Black Knife Assassin ／ 黑刀首領・亞勒托）專屬特效庫：
// 配色依《艾爾登法環》官方設定稿與實機畫面（docs/research/blackknife/）：
//   ・命定之死（Destined Death）：深淵漆黑刀核（#0b040c）、鮮血緋紅刃芒（#e0143c）、赤白高熱火芯（#ffe4ec）、暗紅死煙（#26050c）
//   ・黑夜面紗（Concealing Veil）：半透明銀藍折射霧光（#9aa8d8）、暗夜靛青殘影（#1c1a2e）
// 注意：純視覺，只用 BD.vrng；fx.puff / fx.stream 的色票嚴格使用 #rrggbb 十六進位字串（不可用 rgba）。
(function (G) {
  const BD = G.BD, V = BD.vrng, TAU = Math.PI * 2, PI = Math.PI;
  const CORE = '#ffe6ee', HOT = '#ff385c', CRIM = '#e0143c', RED = '#a80824', DEEP = '#4e0210', INK = '#0b040e';
  const SMOKE = '#24050c', VEIL = '#9aa8d8', VEIL_DARK = '#1c1a2e', SILVER = '#d4dcf0', SHARD_COL = '#1a0c16';

  BD.defineElement('destineddeath', {
    name: '命定之死', rim: '#1c0208', debris: '#520614', core: CORE, glow: CRIM, particle: HOT,
    smoke: 'rgba(36,4,12,0.62)', decal: 'rgba(70,0,16,0.52)', crack: '#ff2448', extra: 'embers',
  });
  BD.KIND_EL.deathblade = 'destineddeath';
  BD.KIND_EL.blackknife_dagger = 'destineddeath';

  const DEATH_FLAME = [CORE, CRIM, RED, SMOKE];
  const VEIL_MIST = [SILVER, VEIL, '#4a5278', VEIL_DARK];
  const at = (x, y, a, d, l) => [
    x + Math.cos(a) * d - Math.sin(a) * (l || 0),
    y + Math.sin(a) * d + Math.cos(a) * (l || 0),
  ];

  // 3D 拋物線飛濺碎片：黑刀黑曜碎屑與緋紅死印火種
  function deathShards(fx, x, y, r, n, speed, dir, spread, veilTone) {
    n = fx.budget(n);
    for (let i = 0; i < n; i++) {
      const a = dir == null ? V() * TAU : dir + (V() - 0.5) * (spread || 1.3);
      const s = (speed || 230) * (0.35 + V() * 0.8);
      const d = V() * (r || 12);
      const col = veilTone ? (i % 3 === 0 ? VEIL : i % 2 ? '#383450' : INK) : (i % 3 === 0 ? HOT : i % 2 ? CRIM : SHARD_COL);
      const p = fx.part(
        BD.PK.SHARD,
        x + Math.cos(a) * d, y + Math.sin(a) * d,
        Math.cos(a) * s, Math.sin(a) * s,
        0.65 + V() * 0.65, col, 3.5 + V() * 4, 1.5
      );
      if (!p) break;
      p.vz = 75 + V() * 210;
      p.g = 620;
    }
  }

  // 命定之死紅黑火舌：向上竄升的暗紅死焰與黑煙（嚴格使用 #rrggbb）
  function deathFlames(fx, x, y, r, n, life) {
    for (let i = 0; i < n; i++) {
      const a = V() * TAU, d = Math.sqrt(V()) * r;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      const L = (life || 0.55) * (0.7 + V() * 0.5);
      fx.puff(px, py, (V() - 0.5) * 32, -42 - V() * 55, 5, r * (0.24 + V() * 0.18) + 9, L, i % 3 === 0 ? SMOKE : i % 2 ? CRIM : RED, 0.76, 1);
      if (i % 2 === 0) fx.puff(px, py, 0, -34, 3.5, r * 0.14 + 5, L * 0.6, CORE, 0.52, 2);
    }
    fx.embers(x, y, HOT, Math.round(n * 1.6), r, 75);
  }

  // 扇形紅黑火流（自動切分為 ≤0.68 rad 窄流避免霧團暴增）
  function deathWash(fx, x, y, a, arc, len, dur, palette) {
    const n = Math.max(1, Math.ceil(arc / 0.68)), sub = Math.min(arc, 0.68);
    const pal = palette || DEATH_FLAME;
    for (let i = 0; i < n; i++) {
      const ang = n === 1 ? a : a - arc / 2 + sub / 2 + (arc - sub) * i / (n - 1);
      fx.stream(x, y, ang, sub, len, pal, dur || 0.22, 0.42);
    }
  }

  // 招牌黑刀弧光：外層深淵黑刃、中層猩紅死焰、內層銀白細芒，沿弧甩出紅黑火舌與碎屑
  function blackKnifeArc(fx, x, y, a, arc, r, life, heavy) {
    const L = life || 0.28;
    fx.slash(x, y, a, arc, r, INK, heavy ? 26 : 19, L, { core: CRIM, trail: 3 });
    fx.slash(x, y, a, arc * 0.94, r * 0.98, 'rgba(255,36,72,0.82)', heavy ? 11 : 7, L * 0.9, { core: CORE, trail: 2 });
    fx.slash(x, y, a, arc * 0.86, r * 0.94, 'rgba(255,230,238,0.75)', heavy ? 4.5 : 3, L * 0.75);
    const steps = Math.max(3, Math.round(arc * 5));
    for (let i = 0; i <= steps; i++) {
      fx.after(i * 0.011, () => {
        const an = a - arc / 2 + arc * i / steps;
        const [px, py] = at(x, y, an, r * 0.92, 0);
        deathShards(fx, px, py, 6, heavy ? 3 : 2, 195, an + PI / 2, 0.85);
        if (heavy || i % 2 === 0) fx.embers(px, py, HOT, 3, 14, 65);
      });
    }
  }

  // 命定之死爆破：白紅閃光、雙重紅黑震波、地面死亡盧恩裂痕與上升死焰
  function deathBlast(fx, x, y, r, big) {
    fx.flashAt(x, y, r * 1.15, CORE, 0.16);
    fx.glow(x, y, r * 1.45, CRIM, 0.52, 0.82, 0.38);
    fx.shock(x, y, r * 0.18, r * 1.18, 0.44, CRIM, big ? 16 : 10, CORE);
    fx.ring(x, y, r * 0.45, r * 1.32, 0.56, 'rgba(18,4,12,0.78)', big ? 16 : 11);
    deathFlames(fx, x, y, r * 0.82, big ? 16 : 9, 0.75);
    deathShards(fx, x, y, r * 0.32, big ? 28 : 16, 330);
    fx.crack(x, y, r * 1.08, INK, big ? 9 : 6, HOT, big ? 8 : 5);
    fx.decal(x, y, r * 0.78, 'rgba(55,0,14,0.52)', 8.5);
    fx.shake(big ? 12 : 6);
    if (big) fx.punch(0.035, x, y);
  }

  // 在空中或地面刻畫「死亡盧恩」（百足傷環／下彎弧與垂直劍脊）
  function drawRuneOfDeath(fx, x, y, r, dur) {
    const L = dur || 0.42;
    // 垂直主幹
    fx.streak(x, y - r * 0.95, x, y + r * 0.85, 8, CRIM, L, true);
    fx.streak(x, y - r * 0.9, x, y + r * 0.8, 3.5, CORE, L * 0.85, true);
    // 上方下彎的死亡盧恩新月弧
    const segs = 8;
    for (let i = 0; i < segs; i++) {
      const a0 = PI * 0.15 + (PI * 0.7) * (i / segs);
      const a1 = PI * 0.15 + (PI * 0.7) * ((i + 1) / segs);
      const x0 = x + Math.cos(a0) * r * 0.85, y0 = y - r * 0.55 + Math.sin(a0) * r * 0.42;
      const x1 = x + Math.cos(a1) * r * 0.85, y1 = y - r * 0.55 + Math.sin(a1) * r * 0.42;
      fx.streak(x0, y0, x1, y1, 6.5, CRIM, L, true);
    }
  }

  const E = (id, name, category, desc, spawn) => BD.defineEffect(id, { name, category, params: {}, desc, spawn });

  // 1. 基礎與連段黑刀斬擊
  E('bk_slash', '黑刀・暗紅弧斬', '斬擊', '深淵黑底與緋紅刃芒交織的反手快斬，沿弧甩出紅黑死焰與黑曜碎屑。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 96, arc = o.arc || 1.9;
    const heavy = (o.dmg || 0) >= 42 || r >= 115;
    blackKnifeArc(fx, x, y, a, arc, r, 0.27, heavy);
    if (heavy) deathWash(fx, x, y, a, arc * 0.75, r * 0.95, 0.18);
    fx.shake(heavy ? 5 : 3, a);
  });

  // 2. 十字雙重斬（連段收尾／二階段追擊）
  E('bk_xslash', '黑刀・死印十字雙斬', '斬擊', '正反手瞬間交錯的 X 形紅黑雙重斬擊，中心迸發十字死印火光與地面裂紋。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 115, arc = o.arc || 2.2;
    blackKnifeArc(fx, x, y, a - 0.24, arc, r, 0.3, true);
    fx.after(0.035, () => blackKnifeArc(fx, x, y, a + 0.24, arc, r * 1.04, 0.3, true));
    const [cx, cy] = at(x, y, a, r * 0.62, 0);
    for (const s of [-0.65, 0.65]) {
      const [x0, y0] = at(cx, cy, a + s, -r * 0.55, 0), [x1, y1] = at(cx, cy, a + s, r * 0.55, 0);
      fx.streak(x0, y0, x1, y1, 6, CORE, 0.26, true);
    }
    fx.flashAt(cx, cy, r * 0.7, CORE, 0.14);
    fx.shock(cx, cy, 8, r * 0.85, 0.32, CRIM, 8, CORE);
    deathFlames(fx, cx, cy, r * 0.45, 6, 0.5);
    fx.shake(6, a);
  });

  // 3. 命定突刺
  E('bk_thrust', '黑刀・命定疾刺', '突刺', '黑刀正手極速貫穿，拉出三道黑紅槍芒與尖端死印爆裂。', (fx, x, y, o) => {
    const a = o.angle || 0, len = o.len || o.radius || 135;
    for (const l of [-1, 0, 1]) {
      const [sx, sy] = at(x, y, a, 12, l * 11);
      const [ex, ey] = at(x, y, a, len * (l ? 0.86 : 1.04), l * 15);
      fx.streak(sx, sy, ex, ey, l ? 5 : 9, l ? RED : CORE, 0.26, true);
    }
    const [tx, ty] = at(x, y, a, len * 0.95, 0);
    fx.beam(x, y, tx, ty, 22, INK, 0.2, CRIM);
    fx.flashAt(tx, ty, 56, CORE, 0.13);
    fx.shock(tx, ty, 6, 78, 0.28, CRIM, 7, CORE);
    deathShards(fx, tx, ty, 8, 14, 260, a, 1.1);
    fx.crack(tx, ty, 64, INK, 5, HOT, 4);
    fx.shake(5, a);
  });

  // 4. 側翻車輪旋刃
  E('bk_cartwheel', '黑刀・側翻雙月斬', '斬擊', '側手翻騰時揮出的 270 度大弧度黑紅月牙，伴隨銀藍黑夜面紗流光。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 110, arc = o.arc || 2.8;
    blackKnifeArc(fx, x, y, a, arc, r, 0.3, false);
    fx.slash(x, y, a, arc * 0.9, r * 0.82, 'rgba(154,168,216,0.55)', 9, 0.28, { core: SILVER, trail: 2 });
    deathShards(fx, x, y, r * 0.6, 12, 180, a, 2.2, true);
    fx.ring(x, y, r * 0.35, r * 0.95, 0.32, 'rgba(154,168,216,0.45)', 5);
    fx.shake(4, a);
  });

  // 5. 貼地疾馳・挑空抹喉
  E('bk_upcut', '黑刀・貼地挑空斬', '斬擊', '刀尖拖地擦出長串緋紅火花後由下往上猛烈挑斬，掀起直立紅黑火幕。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 120, arc = o.arc || 2.1;
    blackKnifeArc(fx, x, y, a, arc, r, 0.32, true);
    deathWash(fx, x, y, a, arc * 0.65, r * 0.95, 0.22);
    const [px, py] = at(x, y, a, r * 0.65, 0);
    fx.pillar(px, py, 24, CRIM, 0.38);
    fx.debris(px, py, '#2a1822', 9, 210, 4, 34);
    deathFlames(fx, px, py, 36, 7, 0.55);
    fx.shake(6, a);
  });

  // 6. 死亡之刃・騰空凝印（施放起手）
  E('bk_deathwave_cast', '黑刀・死亡之刃凝印', '增益', '輕盈躍上半空、高舉黑刀凝聚命定之死，空中浮現鮮紅死亡盧恩與收束氣流。', (fx, x, y, o) => {
    const r = (o.src && o.src.r) || 24;
    fx.charge(x, y, r * 2.6, CRIM, 0.38, o.src, 16);
    fx.ring(x, y, r * 2.2, r * 0.6, 0.36, 'rgba(224,20,60,0.75)', 6);
    drawRuneOfDeath(fx, x, y - 18, r * 1.4, 0.36);
    deathFlames(fx, x, y, r * 1.2, 6, 0.45);
  });

  // 7. 死亡之刃・劍波射出與命中爆裂
  function deathwaveSpawn(fx, x, y, o) {
    const a = o.angle || 0, r = o.radius || 126;
    blackKnifeArc(fx, x, y, a, 2.2, r, 0.34, true);
    deathWash(fx, x, y, a, 0.92, r * 1.35, 0.24);
    fx.shock(x, y, 10, r * 1.05, 0.34, CRIM, 9, CORE);
    deathFlames(fx, x, y, r * 0.62, 8, 0.55);
    deathShards(fx, x, y, r * 0.35, 16, 260, a, 1.5);
    fx.decal(x, y, r * 0.58, 'rgba(65,0,16,0.45)', 6);
    fx.shake(6, a);
  }
  E('bk_deathwave', '黑刀・死亡之刃', '投射物', '黑刀揮出的命定之死紅黑彎月光波，撕裂空氣並留下死亡盧恩餘燼。', deathwaveSpawn);
  E('bk_deathwave_hit', '黑刀・死亡之刃爆裂', '投射物', '死亡之刃命中時炸開的紅黑死焰與盧恩裂痕。', deathwaveSpawn);

  // 8. 黑夜面紗・隱沒與現身
  function veilVanish(fx, x, y, o) {
    const r = o.radius || 56;
    fx.ring(x, y, r * 1.25, r * 0.25, 0.38, 'rgba(154,168,216,0.68)', 6);
    fx.ring(x, y, r * 0.4, r * 1.4, 0.42, 'rgba(18,14,32,0.75)', 9);
    for (let i = 0; i < 7; i++) {
      const an = i * TAU / 7 + V() * 0.3, d = V() * r * 0.6;
      fx.puff(x + Math.cos(an) * d, y + Math.sin(an) * d, Math.cos(an) * 28, -25 - V() * 30, 5, r * 0.42, 0.48, i % 2 ? VEIL_DARK : '#343050', 0.68, 0);
    }
    deathShards(fx, x, y, r * 0.5, 12, 160, null, TAU, true);
    fx.sparkle(x, y, VEIL, 10, r * 0.9);
  }
  E('bk_veil_vanish', '黑刀・黑夜面紗隱沒', '位移', '披風折射光線化為銀藍暗霧消散，原地留下一抹搖曳的黑夜面紗殘影。', veilVanish);
  E('bk_ambush', '黑刀・面紗匿影', '位移', '黑夜面紗折射光線化為半透明暗霧，瞬間隱去身形。', veilVanish);

  E('bk_veil_appear', '黑刀・匿蹤現身背刺', '位移', '自敵人背後暗影中破霧現身，雙眼掠過猩紅十字寒芒。', (fx, x, y, o) => {
    const r = o.radius || 58, a = o.angle || 0;
    fx.shock(x, y, r * 0.2, r * 1.35, 0.32, CRIM, 7, VEIL);
    deathWash(fx, x, y, a, 1.1, r * 1.2, 0.18, VEIL_MIST);
    const [ex, ey] = at(x, y, a, r * 0.35, 0);
    fx.streak(ex - 22, ey, ex + 22, ey, 3.5, CORE, 0.22, true);
    fx.streak(ex, ey - 22, ex, ey + 22, 3.5, CRIM, 0.22, true);
    deathShards(fx, x, y, r * 0.4, 14, 210, a, 1.6, false);
  });

  // 9. 後空翻・暗刃散射
  E('bk_backflip', '黑刀・翻騰暗刃', '位移', '足尖蹬地後空翻騰躍開，掀動銀藍風壓環並甩出扇形暗刃寒光。', (fx, x, y, o) => {
    const a = o.angle || 0;
    fx.ring(x, y, 10, 68, 0.3, 'rgba(180,192,235,0.65)', 5);
    fx.gust(x, y, 58);
    for (let i = -2; i <= 2; i++) {
      const an = a + i * 0.16, [tx, ty] = at(x, y, an, 54, 0);
      fx.streak(x, y, tx, ty, 3, i % 2 ? VEIL : CRIM, 0.2, true);
    }
    deathShards(fx, x, y, 16, 10, 170, a + PI, 1.2, true);
  });

  // 10. 騰空躍起與裂地暴刺
  E('bk_plunge_takeoff', '黑刀・騰空躍起', '位移', '旋身拔地衝入高空，地面炸開暗黑氣旋與向上拉長的猩紅殘影線。', (fx, x, y, o) => {
    const r = (o.src && o.src.r) || 26;
    fx.shock(x, y, r * 0.4, r * 2.5, 0.42, 'rgba(30,10,24,0.82)', 10, VEIL);
    fx.gust(x, y, r * 2.2);
    for (let i = -1; i <= 1; i++) {
      fx.streak(x + i * 12, y, x + i * 6, y - 240, i === 0 ? 8 : 4, i === 0 ? CRIM : VEIL, 0.26, true);
    }
    deathShards(fx, x, y, r * 0.6, 16, 190, null, TAU, true);
    fx.shake(4);
  });

  function plungeSlam(fx, x, y, o) {
    const r = o.radius || 135;
    fx.pillar(x, y, r * 0.46, CRIM, 0.48);
    fx.streak(x, y - 420, x, y, 18, CRIM, 0.25, true);
    fx.streak(x, y - 420, x, y, 6, CORE, 0.2, true);
    deathBlast(fx, x, y, r, true);
    drawRuneOfDeath(fx, x, y, r * 0.72, 0.48);
  }
  E('bk_plunge_slam', '黑刀・裂地暴刺', '砸地', '自高空倒持黑刀貫入大地，降下猩紅死焰光柱並刻出放射狀死亡盧恩裂痕。', plungeSlam);
  E('bk_plunge', '黑刀・飛身落刃', '砸地', '自空中俯衝將黑刀刺入地面，爆發紅黑死焰震波與放射裂痕。', plungeSlam);

  // 11. 弒神處決・飛身抱殺（貫心刺 + 拔刀爆破）
  E('bk_grab_pin', '黑刀・弒神貫心刺', '突刺', '撲倒獵物將黑刀刺入胸口，在心臟上方烙下鮮紅的死亡盧恩百足傷環。', (fx, x, y, o) => {
    const r = o.radius || 64;
    fx.flashAt(x, y, r * 1.1, CORE, 0.16);
    fx.ring(x, y, r * 1.5, r * 0.35, 0.34, 'rgba(224,20,60,0.9)', 8);
    drawRuneOfDeath(fx, x, y, r * 0.95, 0.45);
    deathShards(fx, x, y, 10, 18, 250);
    fx.shake(7);
  });

  E('bk_grab_burst', '黑刀・死印拔刀爆破', '爆炸', '自對手胸口猛力扯出黑刀，死亡盧恩轟然炸裂，掀起扇形紅黑火海。', (fx, x, y, o) => {
    const a = o.angle || 0, r = o.radius || 135;
    fx.grade('#7a0018', 0.22, 0.42);
    deathWash(fx, x, y, a, 1.45, r * 1.35, 0.28);
    deathBlast(fx, x, y, r, true);
    for (let i = -2; i <= 2; i++) {
      const an = a + i * 0.22, [ex, ey] = at(x, y, an, r * 1.25, 0);
      fx.streak(x, y, ex, ey, i === 0 ? 9 : 5, i % 2 ? CRIM : CORE, 0.28, true);
    }
  });

  // 12. 命定死印崩裂（疊滿 3 層爆發）
  E('bk_brand_burst', '黑刀・命定死印崩裂', '爆炸', '體內累積的命定之死盧恩徹底崩裂，沖起黑紅火柱與刺穿軀體的死印光刺。', (fx, x, y, o) => {
    const r = o.radius || 65;
    fx.pillar(x, y, r * 0.5, CRIM, 0.45);
    drawRuneOfDeath(fx, x, y, r * 0.9, 0.42);
    fx.shock(x, y, r * 0.2, r * 1.3, 0.38, CRIM, 10, CORE);
    deathFlames(fx, x, y, r * 0.75, 10, 0.6);
    deathShards(fx, x, y, r * 0.3, 20, 290);
    fx.shake(8);
  });

  // 13. 亞勒托・紅蓮旋刃亂舞（二階段 360 度迴旋斬）
  E('bk_alecto_whirl', '亞勒托・紅蓮旋刃亂舞', '斬擊', '黑刀首領亞勒托高速旋身揮舞黑刀，形成 360 度雙層黑紅刀刃風暴。', (fx, x, y, o) => {
    const r = o.radius || 135, a = o.angle || 0;
    blackKnifeArc(fx, x, y, a, 3.8, r, 0.34, true);
    blackKnifeArc(fx, x, y, a + PI, 3.4, r * 0.88, 0.34, false);
    fx.ring(x, y, r * 0.45, r * 1.08, 0.38, 'rgba(224,20,60,0.75)', 10);
    deathFlames(fx, x, y, r * 0.85, 11, 0.6);
    fx.shake(7);
  });

  // 14. 亞勒托・千刃死滅風暴（Alecto's Iconic Helical Death Sphere）
  function alectoStorm(fx, x, y, o) {
    const r = o.radius || 175;
    fx.veil(0.62, 0.28, '#140006');
    fx.grade('#6e0014', 0.2, 0.62);
    fx.pillar(x, y, r * 0.38, CRIM, 0.55);
    fx.shock(x, y, 12, r * 1.05, 0.38, CRIM, 12, CORE);
    drawRuneOfDeath(fx, x, y, r * 0.82, 0.55);
    // 22 道交錯球狀空間斬線（還原亞勒托插地後籠罩四周的紅黑刀網球體）
    const total = 22;
    for (let i = 0; i < total; i++) {
      fx.after(i * 0.016, () => {
        const an = i * 2.39996 + V() * 0.25; // 黃金角分布，鋪滿整個球形領域
        const tilt = (V() - 0.5) * 1.4;
        const rad = r * (0.68 + 0.34 * ((i % 3) / 2));
        fx.slash(x, y, an, 2.2 + (i % 2) * 0.8, rad, i % 3 === 0 ? INK : CRIM, i % 2 ? 16 : 11, 0.24, { core: CORE, trail: 2 });
        const [x0, y0] = at(x, y, an + tilt, -rad * 0.88, (V() - 0.5) * rad * 0.5);
        const [x1, y1] = at(x, y, an + tilt, rad * 0.88, (V() - 0.5) * rad * 0.5);
        fx.streak(x0, y0, x1, y1, i % 3 === 0 ? 7 : 4.5, i % 2 ? CRIM : CORE, 0.24, true);
        if (i % 3 === 0) deathShards(fx, x1, y1, 8, 3, 220, an, 1.0);
      });
    }
    fx.after(0.34, () => {
      deathBlast(fx, x, y, r * 1.08, true);
      for (let k = 0; k < 12; k++) {
        const an = k * TAU / 12, [ex, ey] = at(x, y, an, r * 1.25, 0);
        fx.streak(x, y, ex, ey, 6, k % 2 ? CRIM : CORE, 0.3, true);
      }
    });
  }
  E('bk_alecto_storm', '亞勒托・千刃死滅風暴', '大招', '黑刀首領亞勒托插地解放命定之死，無數紅黑刀線交織成球形死滅風暴並轟然炸裂。', alectoStorm);
  E('bk_helical_storm', '亞勒托・迴旋劍風', '斬擊', '黑刀首領亞勒托的螺旋死滅劍風，數十道紅黑刀痕構成球狀殺陣。', alectoStorm);

  // 15. 二階段轉階段覺醒：黑刀首領・亞勒托
  E('bk_awaken', '亞勒托・命定之死覺醒', '大招', '黑刀首領亞勒托於虛空中刻下完整死亡盧恩，全場暗幕降臨、爆發沖天紅黑死焰。', (fx, x, y, o) => {
    const r = o.radius || 210;
    fx.veil(1.1, 0.42, '#180008');
    fx.grade('#880018', 0.28, 1.1);
    drawRuneOfDeath(fx, x, y - 16, r * 0.78, 0.75);
    fx.pillar(x, y, r * 0.52, CRIM, 0.65);
    for (let k = 0; k < 3; k++) {
      fx.after(k * 0.08, () => fx.shock(x, y, r * 0.15, r * (0.95 + k * 0.28), 0.52, CRIM, 16 - k * 3, CORE));
    }
    deathBlast(fx, x, y, r * 0.85, true);
    deathShards(fx, x, y, r * 0.5, 36, 360, null, TAU, false);
  });

  // 16. 大招：陰謀之夜・群影奇襲（單道分身穿刺光軌）
  E('bk_ult_phantom', '黑刀・陰謀之夜群影穿刺', '大招', '黑夜面紗刺客分身自四面八方掠過獵物，拉出貫穿戰場的紅黑死線。', (fx, x, y, o) => {
    const tx = o.toX != null ? o.toX : x + Math.cos(o.angle || 0) * 320;
    const ty = o.toY != null ? o.toY : y + Math.sin(o.angle || 0) * 320;
    const delay = (o.i || 0) * 0.035;
    fx.after(delay, () => {
      fx.beam(x, y, tx, ty, 18, INK, 0.34, CRIM);
      fx.streak(x, y, tx, ty, 6, CORE, 0.32, true);
      fx.ring(x, y, 8, 46, 0.28, 'rgba(154,168,216,0.7)', 4);
      const mx = (x + tx) * 0.5, my = (y + ty) * 0.5;
      deathShards(fx, mx, my, 14, 6, 210, o.angle || 0, 0.9);
      fx.shake(4);
    });
  });

  // 17. 大招終結：陰謀之夜・命定之死滅世劫
  function ultCataclysm(fx, x, y, o) {
    const r = o.radius || 240;
    fx.flash('#ff1838', 0.42);
    fx.veil(0.95, 0.45, '#160006');
    fx.grade('#92001c', 0.34, 0.95);
    fx.punch(0.055, x, y);
    fx.pillar(x, y, r * 0.58, CRIM, 0.68);
    fx.streak(x, y - 520, x, y, 32, CRIM, 0.32, true);
    drawRuneOfDeath(fx, x, y, r * 0.92, 0.72);
    // 八方弒神死印光柱與放射裂線
    for (let i = 0; i < 8; i++) {
      const an = i * TAU / 8;
      const [px, py] = at(x, y, an, r * 0.72, 0);
      const [ex, ey] = at(x, y, an, r * 1.28, 0);
      fx.streak(x, y, ex, ey, 9, i % 2 ? CRIM : CORE, 0.38, true);
      fx.after(0.04 + (i % 3) * 0.03, () => {
        fx.pillar(px, py, 26, CRIM, 0.42);
        deathFlames(fx, px, py, 34, 4, 0.55);
      });
    }
    for (let k = 0; k < 3; k++) {
      fx.after(k * 0.075, () => fx.shock(x, y, r * 0.14, r * (0.95 + k * 0.28), 0.58, CRIM, 18 - k * 4, CORE));
    }
    deathBlast(fx, x, y, r, true);
    deathShards(fx, x, y, r * 0.4, 42, 420);
    fx.shake(18);
  }
  E('bk_ult_cataclysm', '黑刀・命定之死滅世劫', '大招', '所有群影死線同時引爆，大地浮現巨型死亡盧恩、八方沖起猩紅死焰光柱。', ultCataclysm);
  E('bk_ult', '黑刀・陰謀之夜終焉', '大招', '重現陰謀之夜的群影處決，八方紅黑死線匯聚引爆命定之死。', ultCataclysm);
})(typeof window !== 'undefined' ? window : globalThis);
