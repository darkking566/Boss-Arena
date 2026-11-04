'use strict';
// 狩獵模式（4v1）雙刀（荒野式）：資料。驅動在 js/engine/hunt4/db.js。取代 weapons.js 原本的簡化版雙刀（載入順序在 weapons.js 之後）。
// 招式（27 招，含集中亂舞）：一般 二段斬 / 二段斬返 / 車輪斬 / 斬拂 / 迴轉斬 / 上撈斬 / 跳躍二段斬；鬼人系 逆手斬 / 二段斬 / 六段斬 / 突進連斬 / 二迴轉斬 / 左右移動斬 /
//   空中回轉亂舞 + 終結；亂舞 I~III；鬼人連斬 I~II；鬼人迴避 / 強化迴避（身躱）→ 螺旋切割；集中亂舞【迴天】→ 空中回轉亂舞・天 / 迴天穿刺。
// 傷害 = 動作值（MV）× K。可查到的動作值照荒野（二段斬 8+11、車輪斬 6+11+12、斬拂 3+3+6+6、迴轉斬 15+7+5、空中回轉亂舞 8+8+12+12、跳躍二段斬 12+9、迴天穿刺 12+9×4+18+24…）；
// 查不到的（鬼人系、亂舞、鬼人連斬）是本作自訂的近似值，總量對齊三階亂舞的爆發定位。
// 招式旗標：dm＝true / false 招式開始時進入 / 解除鬼人化（R2 派生）、gc＝消耗鬼人槽、gg＝命中累積鬼人槽的倍率（0＝不累積）、evade＝{ win, perfect }（鬼人迴避）。
(function (G) {
  const BD = G.BD, H4 = BD.HUNT4, { D } = BD.DataKit;
  const hit = (at, shape, p) => Object.assign({ do: 'hit', at }, shape, p);
  const cone = (r, arcDeg) => ({ shape: 'cone', r, arc: arcDeg * D });
  const circle = (r) => ({ shape: 'circle', r });
  const dash = (at, dist, dur, extra) => Object.assign({ do: 'dash', at, dist, dur }, extra);
  const sk = (id, name, short, tags, range, o, actions) => Object.assign({ id, name, short, tags, range, cd: 0.05, cost: 0, track: 7 }, o, { actions });

  const K = 2.3; // 動作值 → 傷害
  const SL = cone(130, 110), WIDE = cone(140, 160), AROUND = circle(150);
  // 一串小傷害：mvs 每段動作值，從 t0 起每 gap 秒一下；kb / posture 隨動作值
  const mvh = (t0, gap, mvs, shape, fx, o) => mvs.map((mv, i) => hit(+(t0 + i * gap).toFixed(3), shape, Object.assign({ dmg: Math.round(mv * K), posture: +(mv * 0.28).toFixed(1), kb: 30, fx }, o)));
  const fin = (at, mv, shape, o) => hit(at, shape, Object.assign({ dmg: Math.round(mv * K), posture: Math.round(mv * 0.9), kb: 200, fx: { id: 'slash', scale: 1.3 } }, o)); // 收尾重擊
  const rep = (n, mv) => Array(n).fill(mv);
  const M = (id, name, short, range, o, actions) => sk(id, name, short, ['melee'], range, o, actions);

  const dualblades = { id: 'db', name: '雙刀', el: 'physical', ai: [40, 115], bonus: {}, traits: [],
    skills: [M('db_n1', '二段斬', '二段', [0, 120], { cost: 5, sw: 'cw', creep: 0.5, recovery: 0.2 }, mvh(0.12, 0.1, [8, 11], SL, 'slash'))],
    variants: [
      // ── 一般狀態 ──
      M('db_n2', '二段斬返', '斬返', [0, 120], { cost: 5, sw: 'ccw', creep: 0.4, recovery: 0.22 }, mvh(0.1, 0.1, [9, 11], SL, 'slash')),
      M('db_n3', '車輪斬', '車輪', [0, 135], { cost: 8, sw: 'spin', creep: 0.6, recovery: 0.32 }, mvh(0.12, 0.09, [6, 11, 12], WIDE, 'slash')),
      sk('db_lunge', '斬拂', '斬拂', ['melee', 'gap'], [50, 280], { cost: 8, sw: 'thrust', track: 9, recovery: 0.26 }, [dash(0.05, 130, 0.16)].concat(mvh(0.12, 0.08, [3, 3, 6, 6], SL, 'slash'))),
      M('db_spin', '迴轉斬', '迴轉', [0, 130], { cost: 8, sw: 'spin', creep: 0.5, recovery: 0.3 }, mvh(0.1, 0.1, [15, 7, 5], WIDE, 'slash')),
      M('db_up', '上撈斬', '上撈', [0, 125], { cost: 5, sw: 'down', creep: 0.4, recovery: 0.24 }, mvh(0.14, 0.1, [8], cone(135, 90), { id: 'slash', scale: 1.2 }, { kb: 90 })),
      sk('db_jump', '跳躍二段斬', '跳斬', ['melee', 'gap'], [140, 360], { cost: 10, sw: 'down', track: 9, recovery: 0.35 }, [dash(0.08, 210, 0.22)].concat(mvh(0.3, 0.1, [12, 9], SL, 'slash'))),
      sk('db_demon', '鬼人化', '鬼人', ['buff'], [0, 400], { cd: 1, cost: 0, track: 0, recovery: 0.25 }, []),
      // ── 鬼人化：基本連段（約 +12% 速度的小傷害，命中累積鬼人槽） ──
      M('db_d1', '鬼人逆手斬', '逆手', [0, 125], { cost: 5, sw: 'cw', creep: 0.6, recovery: 0.18 }, mvh(0.08, 0.07, [6, 8], SL, 'slash')),
      M('db_d2', '鬼人二段斬', '鬼二', [0, 130], { cost: 5, sw: 'ccw', creep: 0.5, recovery: 0.2 }, mvh(0.08, 0.07, [6, 7, 8], SL, 'slash')),
      M('db_d3', '鬼人六段斬', '六段', [0, 130], { cost: 9, sw: 'spin', creep: 0.5, recovery: 0.26, gg: 1.3 }, mvh(0.1, 0.065, [5, 5, 5, 5, 6, 8], WIDE, 'slash')),
      sk('db_dash', '鬼人突進連斬', '突進', ['melee', 'gap'], [60, 320], { cost: 10, sw: 'thrust', track: 9, recovery: 0.25 }, [dash(0.06, 190, 0.17)].concat(mvh(0.22, 0.07, [5, 5, 5, 8], SL, 'slash'))),
      M('db_spin2', '二迴轉斬', '二迴', [0, 135], { cost: 9, sw: 'spin', creep: 0.5, recovery: 0.3 }, mvh(0.1, 0.09, [10, 10, 12], WIDE, 'slash')),
      sk('db_side', '左右移動斬', '移斬', ['melee', 'defensive'], [0, 220], { cost: 8, sw: 'cw', track: 10, recovery: 0.2 }, [dash(0.04, 120, 0.16, { dir: 'side' })].concat(mvh(0.14, 0.07, [6, 6, 8], SL, 'slash'))),
      sk('db_air', '空中回轉亂舞', '空旋', ['melee', 'gap'], [120, 380], { cost: 12, sw: 'spin', track: 9, recovery: 0.3, dm: true }, [dash(0.06, 240, 0.28)].concat(mvh(0.3, 0.08, [8, 8, 12, 12], WIDE, 'whirl'))),
      M('db_airfin', '空中回轉亂舞終結', '空終', [0, 160], { cost: 6, sw: 'down', creep: 0.3, recovery: 0.3 }, [fin(0.16, 16, cone(150, 100))]),
      // ── 三階亂舞（鬼人化；II、III 耗鬼人槽，R2 派生回到鬼人化）──
      M('db_ra1', '亂舞 I', '亂舞I', [0, 140], { cost: 12, sw: 'spin', track: 4, recovery: 0.3, dm: true, gg: 0 }, mvh(0.1, 0.07, rep(7, 5), WIDE, 'slash').concat([fin(0.62, 10, AROUND, { fx: 'whirl' })])),
      M('db_ra2', '亂舞 II', '亂舞II', [0, 140], { cost: 14, sw: 'spin', track: 4, recovery: 0.34, dm: true, gc: 20, gg: 0 }, mvh(0.1, 0.07, rep(9, 5), WIDE, 'slash').concat([fin(0.8, 14, AROUND, { fx: 'whirl' })])),
      M('db_ra3', '亂舞 III', '亂舞III', [0, 145], { cost: 16, sw: 'spin', track: 4, recovery: 0.45, dm: true, gc: 25, gg: 0 }, mvh(0.1, 0.065, rep(12, 5), WIDE, 'slash').concat([fin(0.96, 24, circle(160), { fx: { id: 'whirl', scale: 1.3 }, kb: 260 })])),
      // ── 鬼人連斬（鬼人強化；解除鬼人化的派生，耗鬼人槽）──
      M('db_ar1', '鬼人連斬 I', '連斬I', [0, 140], { cost: 10, sw: 'cw', creep: 0.9, track: 6, recovery: 0.3, dm: false, gc: 20, gg: 0 }, mvh(0.1, 0.07, rep(8, 6), WIDE, 'slash').concat([fin(0.7, 12, AROUND)])),
      M('db_ar2', '鬼人連斬 II', '連斬II', [0, 145], { cost: 12, sw: 'ccw', creep: 0.9, track: 6, recovery: 0.34, dm: false, gc: 25, gg: 0 }, mvh(0.1, 0.07, rep(10, 6), WIDE, 'slash').concat([fin(0.86, 16, AROUND)])),
      // ── 鬼人迴避 / 鬼人身躱 ──
      sk('db_dodge', '鬼人迴避', '迴避', ['melee', 'defensive'], [0, 900], { cost: 14, track: 12, recovery: 0.1, evade: { win: 0.26, perfect: 0.12 } }, [dash(0.02, 150, 0.2, { dir: 'side' })]),
      sk('db_dodge_b', '強化迴避', '強迴', ['melee', 'defensive'], [0, 900], { cost: 14, track: 12, recovery: 0.12, evade: { win: 0.34, perfect: 0.14 } }, [dash(0.02, 190, 0.26, { dir: 'side' })].concat(mvh(0.12, 0.06, [5, 5, 7], WIDE, 'slash'))),
      sk('db_screw', '螺旋切割', '螺旋', ['melee', 'gap'], [0, 460], { cost: 8, sw: 'spin', track: 9, recovery: 0.28 }, [dash(0.04, 180, 0.3)].concat(mvh(0.08, 0.075, [6, 6, 8, 8, 8, 10], WIDE, 'whirl'))),
      // ── 集中亂舞【迴天】後的兩種終結（驅動依 Boss 傷口數選）──
      sk('db_heaven', '空中回轉亂舞・天', '天', ['melee'], [0, 600], { cost: 1, sw: 'spin', track: 9, recovery: 0.5 },
        [dash(0.04, 260, 0.6)].concat(mvh(0.12, 0.07, [8, 8, 8, 10, 10, 10, 10, 12, 12, 12, 12, 14], WIDE, 'whirl'), [hit(0.4, WIDE, { dmg: 10, posture: 4, kb: 20, focus: true }), hit(0.66, WIDE, { dmg: 10, posture: 4, kb: 20, focus: true }), fin(1.0, 22, circle(170), { fx: { id: 'whirl', scale: 1.4 } })])),
      sk('db_drill', '迴天穿刺', '穿刺', ['melee'], [0, 300], { cost: 1, sw: 'thrust', track: 9, recovery: 0.5 },
        mvh(0.1, 0.06, [12, 9, 12, 9, 12, 9, 12, 9, 18], cone(120, 80), 'slash').concat([fin(0.72, 24, circle(140), { fx: { id: 'whirl', scale: 1.2 }, kb: 300 })])),
    ] };

  H4.WEAPON_DEFS.db = dualblades;
  H4.WEAPON_SPECS.db = { dtype: 'cut', sharp: 200,
    focus: sk('h4_focus_db', '集中亂舞【迴天】', '迴天', ['melee'], [0, 180], { cd: 6, sw: 'spin', track: 9, recovery: 0.4 },
      [dash(0.05, 110, 0.14)].concat(mvh(0.18, 0.06, [10, 10], cone(140, 90), 'slash'), [hit(0.34, cone(150, 80), { dmg: 40, focus: true, posture: 20, kb: 120, fx: 'whirl' })])) };

  // 鬼人化每秒耗體力 / 體力低於此比例自動解除 / 每次命中加槽 / 鬼人強化每秒掉槽 / 鬼人化傷害倍率 / 集中亂舞打破傷口回體力
  // 鬼人身躱（精準迴避）：dur 基礎秒數、ext 再次精準迴避延長、cap 上限；atk 物理倍率、el 屬性倍率；dodgeCost 鬼人化 / 強化時迴避體力
  H4.DEMON = { drain: 5.5, exitAt: 0.25, gaugePerHit: 3.6, archDrain: 1.6, dmgMul: 1.1, popSta: 25, dodgeCost: 8, idleDrain: 0.4, costMul: 0.6,
    boost: { dur: 20, ext: 8, cap: 40, atk: 1.15, el: 1.3 } };

  // 連招表：AI 依情境（Boss 狀態 when、鬼人狀態 st、需求 need）挑一套，獵人大腦記住每個情境下哪套回報高。
  // 步驟：a1~a3 △ 基本攻擊（鬼人化時換成鬼人系）、o1 ○（鬼人化 / 強化＝突進連斬，否則斬拂）、o2 迴轉斬、o3 二迴轉斬、up 上撈斬、side 左右移動斬、
  //       ra1~ra3 亂舞 I~III、ar1~ar2 鬼人連斬 I~II、on / off 鬼人化 R2、dodge 鬼人迴避、screw 螺旋切割、jump 跳躍二段斬、air 空中回轉亂舞、airfin 終結。
  //       做不到的步驟（距離 / 體力 / 鬼人槽）跳過，最多連跳 3 個，走完或卡住就結束。
  // st：n 一般、d 鬼人化、a 鬼人強化（解除鬼人化）、da 兩者並存；留空＝任何狀態。need：near 近身（< 240）、far 遠（> 230）、g 鬼人槽下限、gMax 鬼人槽上限、
  //   arch 有鬼人強化、boost 有鬼人身躱、sta 體力下限、lowSta 體力少、noBoost 沒有身躱；after＝精準迴避成功後才挑；prior 先驗回報、risk 越愛冒險越想用
  const C = (id, name, when, st, need, prior, risk, seq, after) => ({ id, name, when, st, need, prior, risk, seq, after });
  const ANY = ['idle', 'move', 'open', 'atk', 'down'], IMO = ['idle', 'move', 'open'], MV = ['idle', 'move', 'atk'], OD = ['open', 'down'];
  H4.DB_COMBOS = [
    // ── 一般狀態 ──
    C('poke', '試探二段斬', MV, 'n', { near: true }, 0.25, -0.3, ['a1', 'a2']),
    C('basic', '基本三連', IMO, 'n', { near: true }, 0.3, 0, ['a1', 'a2', 'a3']),
    C('lungeUp', '斬拂上撈', IMO, 'n', null, 0.3, 0, ['o1', 'up', 'a1', 'a2']),
    C('lungeSpin', '斬拂迴轉', IMO, 'n', null, 0.3, 0.1, ['o1', 'o2', 'a1', 'a2', 'a3']),
    C('approach', '斬拂接近', ['idle', 'move'], 'n', { far: true }, 0.55, 0, ['o1', 'o2', 'a1']),
    C('jumpIn', '跳躍突入', ['idle', 'move', 'open'], 'n', { far: true }, 0.45, 0.3, ['jump', 'a1', 'a2', 'a3']),
    C('rouse', '鬼人化起手', IMO, 'n', { near: true, sta: 35 }, 0.9, 0.2, ['on', 'a1', 'a2', 'a3']),
    C('rouseDash', '鬼人化突進', ['idle', 'move'], 'n', { far: true, sta: 35 }, 0.85, 0.3, ['on', 'o1', 'a1', 'a2', 'a3']),
    C('rouseDown', '倒地鬼人化爆發', OD, 'n', { sta: 30 }, 0.9, 0.3, ['on', 'a1', 'a2', 'a3', 'ra1', 'ra2']),
    C('normalOpen', '破綻普攻', OD, 'n', null, 0.25, 0, ['a1', 'a2', 'a3', 'o2']),
    // ── 鬼人化 ──
    C('gaugeBuild', '鬼人槽累積', ANY, 'd', { near: true, gMax: 60 }, 0.6, 0, ['a1', 'a2', 'a3', 'o1', 'a1', 'a2', 'a3']),
    C('gaugeSix', '六段斬補槽', IMO, 'd', { near: true, gMax: 70 }, 0.55, 0.1, ['a1', 'a2', 'a3', 'a1', 'a2', 'a3']),
    C('demonDash', '突進連斬追擊', ['idle', 'move', 'atk'], 'd', { far: true }, 0.55, 0.1, ['o1', 'o2', 'o3', 'a1', 'a2']),
    C('demonDashUp', '突進上撈', MV, 'd', { far: true }, 0.4, 0, ['o1', 'up', 'a1', 'a2', 'a3']),
    C('sideLoop', '移動斬循環', ['move', 'atk', 'idle'], 'd', { near: true }, 0.5, -0.1, ['a1', 'side', 'a2', 'side', 'a3']),
    C('sideSafe', '移動斬閃避', ['atk'], 'd', { near: true }, 0.45, -0.3, ['a1', 'side', 'a1', 'side']),
    C('demonSpin', '迴轉追擊', IMO, 'd', null, 0.4, 0, ['o1', 'o2', 'o3', 'a1', 'a2', 'a3']),
    C('flurry1', '亂舞 I 短爆發', ['open', 'idle', 'move'], 'd', { near: true }, 0.5, 0.1, ['a1', 'ra1', 'a1']),
    C('flurry12', '亂舞 I→II', IMO, 'd', { near: true, g: 20 }, 0.6, 0.2, ['a1', 'ra1', 'ra2']),
    C('flurry123', '完整三階亂舞', OD, 'd', { near: true, g: 45 }, 0.7, 0.3, ['ra1', 'ra2', 'ra3']),
    C('flurryGreed', '亂舞全接', ['down'], 'd', { near: true, g: 45 }, 0.65, 0.5, ['a1', 'a2', 'ra1', 'ra2', 'ra3', 'a1', 'a2', 'a3']),
    C('flurryTail', '亂舞後補刀', ['open'], 'd', { near: true, g: 20 }, 0.5, 0, ['ra1', 'ra2', 'a1', 'a2']),
    C('demonDownFull', '倒地全力', ['down'], 'd', { near: true }, 0.65, 0.3, ['a1', 'a2', 'a3', 'ra1', 'ra2', 'ra3', 'a1', 'a2', 'a3', 'ra1']),
    C('downBuild', '倒地補槽再爆發', ['down'], 'd', { near: true, gMax: 25 }, 0.6, 0.2, ['a1', 'a2', 'a3', 'o1', 'a1', 'a2', 'a3', 'ra1', 'ra2']),
    C('airIn', '空中回轉亂舞突入', ['idle', 'move'], 'd', { far: true }, 0.5, 0.3, ['air', 'airfin', 'a1', 'a2', 'ra1']),
    C('demonRest', '解除鬼人化回耐力', ['idle', 'move', 'atk'], 'd', { lowSta: true }, 0.8, -0.4, ['off', 'a1', 'a2']),
    // ── 交錯亂舞（鬼人化 + 鬼人強化）──
    C('weave1', '亂舞→鬼人連斬', IMO, 'da', { near: true, arch: true, g: 20 }, 0.65, 0.2, ['ra1', 'ar1']),
    C('weave12', '亂舞 I→連斬 I→亂舞 II', IMO, 'da', { near: true, arch: true, g: 45 }, 0.7, 0.3, ['ra1', 'ar1', 'ra2']),
    C('weaveFull', '完整交錯亂舞', OD, 'da', { near: true, arch: true, g: 75 }, 0.8, 0.4, ['ra1', 'ar1', 'ra2', 'ar2', 'ra3']),
    C('weaveDown', '倒地交錯全力', ['down'], 'da', { near: true, arch: true, g: 75 }, 0.8, 0.5, ['a1', 'ra1', 'ar1', 'ra2', 'ar2', 'ra3', 'a1', 'a2']),
    C('weaveHalf', '連斬→亂舞 III', OD, 'da', { near: true, arch: true, g: 60 }, 0.7, 0.3, ['ra1', 'ar1', 'ar2', 'ra3']),
    C('weaveDash', '突進接交錯', MV, 'da', { arch: true, g: 45 }, 0.6, 0.2, ['o1', 'a1', 'ra1', 'ar1', 'ra2']),
    C('weaveRest', '連斬中途收鬼人化', ['atk', 'move'], 'da', { arch: true, g: 20, lowSta: true }, 0.75, -0.3, ['ra1', 'ar1', 'o1']),
    // ── 鬼人強化（已解除鬼人化，用槽維持輸出並回耐力）──
    C('archBurst', '鬼人連斬 I→II', IMO, 'a', { near: true, arch: true, g: 45 }, 0.65, 0.2, ['ar1', 'ar2']),
    C('archEnd', '連斬接亂舞 III', OD, 'a', { near: true, arch: true, g: 70 }, 0.7, 0.4, ['ar1', 'ar2', 'ra3']),
    C('archDash', '強化突進連斬', ['idle', 'move'], 'a', { far: true, arch: true, g: 20 }, 0.6, 0.1, ['o1', 'o2', 'ar1']),
    C('archPoke', '強化試探', MV, 'a', { near: true, arch: true }, 0.45, -0.2, ['o1', 'up', 'a1', 'a2']),
    C('archRelight', '重新鬼人化接亂舞', OD, 'a', { near: true, arch: true, g: 40, sta: 60 }, 0.6, 0.3, ['on', 'ra1', 'ra2', 'ra3']),
    C('archKeep', '強化維持', ANY, 'a', { arch: true }, 0.4, 0, ['o1', 'o2', 'o3', 'ar1']),
    // ── 鬼人身躱（有藍色強化時）──
    C('boostScrew', '身躱螺旋追擊', ['idle', 'move', 'atk'], null, { boost: true }, 0.65, 0.2, ['screw', 'o1', 'a1', 'a2', 'a3']),
    C('boostRepos', '強化迴避位移', ['atk'], null, { boost: true, near: true }, 0.5, -0.1, ['dodge', 'screw', 'a1', 'a2']),
    C('boostFlurry', '身躱中亂舞', OD, 'd', { boost: true, near: true, g: 20 }, 0.75, 0.3, ['a1', 'ra1', 'ra2', 'ra3']),
    // ── 精準迴避成功後（after：不經一般挑選，由驅動在迴避後挑）──
    C('dScrewChase', '螺旋切割追擊', ANY, null, { boost: true }, 0.65, 0, ['screw', 'o1', 'a1', 'a2'], true),
    C('dScrewFlurry', '螺旋切割接亂舞', ANY, 'd', { boost: true, g: 20 }, 0.7, 0.2, ['screw', 'ra1', 'ra2'], true),
    C('dScrewSide', '螺旋切割移動斬', ANY, 'd', { boost: true }, 0.5, 0, ['screw', 'side', 'a2', 'a3'], true),
    C('dFlurry2', '迴避直接亂舞 II', ANY, 'd', { boost: true, near: true, g: 20 }, 0.8, 0.3, ['ra2', 'ra3'], true),
    C('dFlurry2Weave', '迴避亂舞 II→連斬 II→III', ANY, 'da', { boost: true, near: true, arch: true, g: 70 }, 0.85, 0.4, ['ra2', 'ar2', 'ra3'], true),
    C('dFlurryFull', '迴避亂舞接交錯', ANY, 'da', { boost: true, near: true, arch: true, g: 60 }, 0.75, 0.3, ['ra2', 'ar1', 'ra3'], true),
    C('dBasic', '迴避後基本連段', ANY, 'd', { boost: true, near: true }, 0.5, 0, ['a1', 'a2', 'a3'], true),
    C('dArch', '迴避後鬼人連斬', ANY, 'a', { boost: true, near: true, arch: true, g: 45 }, 0.7, 0.3, ['ar1', 'ar2'], true),
    C('dNormal', '迴避後一般連段', ANY, 'n', { boost: true }, 0.5, 0, ['screw', 'up', 'a1', 'a2', 'a3'], true),
    C('dDemon', '迴避後鬼人化', ANY, 'n', { boost: true, sta: 55 }, 0.55, 0.2, ['screw', 'on', 'a1', 'a2', 'a3'], true),
  ];
})(typeof window !== 'undefined' ? window : globalThis);
