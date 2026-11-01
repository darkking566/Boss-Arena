'use strict';
// 狩獵模式（4v1）武器資料：每把武器 = 給 buildHero 的武器物件（skills＝AI 可直接挑的招、variants＝只由武器驅動接出的招）+ 狩獵屬性。
// 驅動邏輯（連段、蓄力、鬼人化、防禦…）在 js/engine/hunt4/weapons.js。數值皆為沉重節奏最終值。
// 招式旗標：offset＝[起, 迄] 秒的相殺判定窗、guard＝{ perfect, chip?, block? } 防禦（整招期間；開頭 perfect 秒為完美防禦；chip 覆寫擋下後承受比例；block＝一般防禦也接反擊）、
// armor＝受擊減傷比例（鐵壁，不被打斷）、dtype＝覆寫傷害類型、focus＝集中弱點攻擊；命中參數 fixed＝固定傷害（砲擊：不吃肉質 / 銳利度 / 屬性）
(function (G) {
  const BD = G.BD, H4 = BD.HUNT4, { D, flurry } = BD.DataKit;
  const hit = (at, shape, p) => Object.assign({ do: 'hit', at }, shape, p);
  const cone = (r, arcDeg) => ({ shape: 'cone', r, arc: arcDeg * D });
  const circle = (r) => ({ shape: 'circle', r });
  const rect = (len, w) => ({ shape: 'rect', len, w });
  const dash = (at, dist, dur, extra) => Object.assign({ do: 'dash', at, dist, dur }, extra);
  const sk = (id, name, short, tags, range, o, actions) => Object.assign({ id, name, short, tags, range, cd: 0.05, cost: 0, track: 7 }, o, { actions });

  // ── 大劍：蓄力 I → 強蓄力 → 真蓄力，中間可用鐵壁衝撞（受擊減傷、相殺）保住蓄力段數 ──
  const greatsword = { id: 'gs', name: '大劍', el: 'physical', ai: [70, 170], aiMod: { gapMul: 1.1, midWait: 0.2 }, bonus: {}, traits: [], // aiMod：覆寫 AI 節奏（大劍招少，出手間隔要短一點）
    skills: [
      sk('gs_c1', '蓄力斬', '蓄力', ['melee'], [0, 175], { cost: 14, sw: 'down', track: 7, recovery: 0.55 },
        [hit(0.62, cone(175, 70), { dmg: 280, posture: 45, kb: 260, fx: { id: 'slash', scale: 1.5 } })]),
      sk('gs_wide', '橫掃', '橫掃', ['melee', 'fast'], [0, 170], { cost: 12, sw: 'cw', track: 6, recovery: 0.5 },
        [hit(0.34, cone(175, 140), { dmg: 150, posture: 28, kb: 240, fx: { id: 'slash', scale: 1.4 } })]),
    ],
    variants: [
      sk('gs_c2', '強蓄力斬', '強蓄', ['melee'], [0, 180], { cost: 14, sw: 'cw', track: 7, recovery: 0.6 },
        [hit(0.82, cone(180, 120), { dmg: 400, posture: 65, kb: 320, fx: { id: 'slash', scale: 1.7 } })]),
      sk('gs_true', '真蓄力斬', '真蓄', ['melee'], [0, 190], { cost: 18, sw: 'down', track: 6, recovery: 0.9 },
        [hit(1.25, cone(150, 60), { dmg: 300, posture: 40, kb: 120, fx: { id: 'slash', scale: 1.6 } }),
          hit(1.45, cone(195, 80), { dmg: 620, posture: 110, kb: 420, fx: { id: 'slash', scale: 2.2 } })]),
      sk('gs_tackle', '鐵壁衝撞', '衝撞', ['melee', 'defensive'], [0, 140], { cost: 16, sw: 'thrust', track: 9, recovery: 0.3, armor: 0.5, offset: [0.02, 0.3] },
        [dash(0.08, 70, 0.12), hit(0.2, circle(90), { dmg: 40, posture: 30, kb: 200, dtype: 'blunt' })]),
    ] };

  // ── 雙刀：鬼人化（持續耗體力、招式換成鬼人系）→ 命中累積鬼人槽 → 解除時槽滿進入鬼人強化（亂舞可用、消耗槽）──
  const demonHit = (n, t0, gap, dmg) => flurry(t0, n, gap, cone(130, 110), { dmg, posture: 6, kb: 50 }, 'slash');
  const dualblades = { id: 'db', name: '雙刀', el: 'physical', ai: [40, 115], bonus: {}, traits: [],
    skills: [
      sk('db_a1', '二連斬', '二連', ['melee', 'fast'], [0, 120], { cost: 0, sw: 'cw', creep: 0.5, recovery: 0.2 }, demonHit(2, 0.12, 0.1, 30)),
    ],
    variants: [
      sk('db_demon', '鬼人化', '鬼人', ['buff'], [0, 400], { cd: 1, cost: 0, track: 0, recovery: 0.25 }, []),
      sk('db_a2', '返刃二連', '二連', ['melee', 'fast'], [0, 120], { cost: 0, sw: 'ccw', creep: 0.4, recovery: 0.22 }, demonHit(2, 0.1, 0.1, 32)),
      sk('db_a3', '車輪斬', '車輪', ['melee'], [0, 135], { cost: 0, sw: 'spin', creep: 0.6, recovery: 0.32 }, demonHit(3, 0.12, 0.09, 30)),
      sk('db_d1', '鬼人連斬', '鬼連', ['melee', 'fast'], [0, 125], { cost: 0, sw: 'cw', creep: 0.6, recovery: 0.18 }, demonHit(4, 0.08, 0.07, 26)),
      sk('db_d2', '鬼人六連斬', '六連', ['melee'], [0, 130], { cost: 6, sw: 'spin', creep: 0.5, recovery: 0.24 }, demonHit(6, 0.1, 0.065, 25)),
      sk('db_flurry', '鬼人亂舞', '亂舞', ['melee', 'aoe'], [0, 140], { cost: 22, sw: 'spin', track: 4, recovery: 0.45 },
        demonHit(10, 0.12, 0.07, 24).concat([hit(0.9, circle(150), { dmg: 70, posture: 30, kb: 260, fx: { id: 'whirl', scale: 1.2 } })])),
      sk('db_dash', '鬼人突進連斬', '突進', ['melee', 'gap'], [80, 300], { cost: 10, sw: 'thrust', track: 9, recovery: 0.25 },
        [dash(0.08, 200, 0.16, { iframe: true })].concat(demonHit(3, 0.26, 0.07, 28))),
    ] };

  // ── 片手劍：連斬 → 迴旋斬、盾擊（打擊，可打暈）、防禦（前 0.2 秒為完美防禦 → 自動反擊）、完美突進、跳躍斬 ──
  const sns = { id: 'sns', name: '片手劍', el: 'physical', ai: [40, 125], bonus: {}, traits: [],
    skills: [
      sk('sns_a1', '斬下', '斬下', ['melee', 'fast'], [0, 125], { cost: 0, sw: 'down', creep: 0.5, recovery: 0.2 },
        [hit(0.16, cone(130, 70), { dmg: 40, posture: 10, kb: 90, fx: 'slash' })]),
      sk('sns_jump', '跳躍斬', '跳斬', ['melee', 'gap'], [90, 300], { cost: 10, sw: 'down', track: 9, recovery: 0.35 },
        [dash(0.1, 190, 0.22, { iframe: true }), hit(0.34, cone(140, 80), { dmg: 70, posture: 25, kb: 160, fx: 'slash' })]),
    ],
    variants: [
      sk('sns_a2', '橫斬', '橫斬', ['melee', 'fast'], [0, 125], { cost: 0, sw: 'cw', creep: 0.4, recovery: 0.2 },
        [hit(0.15, cone(130, 110), { dmg: 42, posture: 10, kb: 90, fx: 'slash' })]),
      sk('sns_a3', '迴旋斬', '迴旋', ['melee', 'aoe'], [0, 135], { cost: 0, sw: 'spin', recovery: 0.3 },
        [hit(0.22, circle(135), { dmg: 62, posture: 18, kb: 180, fx: 'whirl' })]),
      sk('sns_bash', '盾擊', '盾擊', ['melee'], [0, 110], { cost: 8, sw: 'thrust', recovery: 0.3 },
        [hit(0.16, cone(110, 70), { dmg: 46, posture: 26, kb: 140, dtype: 'blunt' }), hit(0.36, cone(115, 70), { dmg: 58, posture: 32, kb: 200, dtype: 'blunt' })]),
      sk('sns_guard', '防禦', '防禦', ['defensive'], [0, 400], { cost: 0, track: 12, recovery: 0.75, guard: { perfect: 0.2 } }, []),
      sk('sns_counter', '完美防禦反擊', '反擊', ['melee'], [0, 140], { cost: 0, sw: 'thrust', track: 10, recovery: 0.3 },
        [dash(0.04, 60, 0.08), hit(0.1, rect(150, 70), { dmg: 95, posture: 45, kb: 240, fx: 'thrust' })]),
      sk('sns_rush', '完美突進', '突進', ['melee'], [0, 140], { cost: 20, sw: 'spin', creep: 0.5, track: 6, recovery: 0.4 },
        [hit(0.12, cone(130, 90), { dmg: 46, posture: 12, kb: 60, fx: 'slash' }), hit(0.3, cone(130, 90), { dmg: 50, posture: 12, kb: 60, fx: 'slash' }),
          hit(0.48, circle(135), { dmg: 58, posture: 16, kb: 80, fx: 'whirl' }), hit(0.72, cone(150, 80), { dmg: 105, posture: 40, kb: 260, fx: { id: 'slash', scale: 1.4 } })]),
    ] };

  // 太刀：沿用獵魂的太刀（含彈刀 / 見切 / 氣刃），另外補上紅刃才能放的「氣刃兜割」
  const helm = sk('k_helm', '氣刃兜割', '兜割', ['melee'], [0, 220], { cost: 0, sw: 'down', track: 8, recovery: 0.7 },
    [dash(0.15, 120, 0.15, { iframe: true })].concat(flurry(0.4, 5, 0.08, cone(150, 80), { dmg: 40, posture: 10, kb: 40 }, 'slash'),
      [hit(0.85, cone(170, 100), { dmg: 160, posture: 60, kb: 360, fx: { id: 'slash', scale: 1.7 } })]));

  // ── 大錘：蓄力 I 上撈 → II 頭擊 → III 大爆擊（打頭累積暈眩）；蓄力迴轉移動接近；蓄力中被打 → 相殺上撈 ──
  const hammer = { id: 'hammer', name: '大錘', el: 'physical', ai: [40, 140], aiMod: { gapMul: 1.1, midWait: 0.2 }, bonus: {}, traits: [],
    skills: [
      sk('ham_c1', '蓄力上撈', '上撈', ['melee'], [0, 150], { cost: 10, sw: 'ccw', track: 8, recovery: 0.4 },
        [hit(0.4, cone(150, 70), { dmg: 150, posture: 40, kb: 200, fx: { id: 'slash', scale: 1.3 } })]),
      sk('ham_side', '橫揮', '橫揮', ['melee', 'fast'], [0, 140], { cost: 6, sw: 'cw', recovery: 0.3 },
        [hit(0.22, cone(145, 100), { dmg: 90, posture: 22, kb: 160, fx: 'slash' })]),
    ],
    variants: [
      sk('ham_c2', '蓄力 II 頭擊', '頭擊', ['melee'], [0, 150], { cost: 12, sw: 'down', track: 7, recovery: 0.45 },
        [hit(0.35, cone(150, 60), { dmg: 120, posture: 35, kb: 80 }), hit(0.6, cone(150, 60), { dmg: 140, posture: 35, kb: 200, fx: { id: 'slash', scale: 1.3 } })]),
      sk('ham_c3', '蓄力 III 大爆擊', '爆擊', ['melee'], [0, 155], { cost: 16, sw: 'down', track: 6, recovery: 0.75 },
        [hit(0.45, cone(150, 60), { dmg: 110, posture: 30, kb: 60 }), hit(0.7, cone(150, 60), { dmg: 130, posture: 35, kb: 60 }),
          hit(1.0, circle(160), { dmg: 260, posture: 80, kb: 360, fx: { id: 'whirl', scale: 1.4 } })]),
      sk('ham_spin', '蓄力迴轉', '迴轉', ['melee', 'gap'], [120, 280], { cost: 14, sw: 'spin', track: 9, recovery: 0.45 },
        [dash(0.08, 170, 0.4)].concat(flurry(0.15, 4, 0.1, circle(120), { dmg: 20, posture: 8, kb: 40 }, 'whirl'), [hit(0.65, circle(135), { dmg: 60, posture: 25, kb: 220, fx: 'whirl' })])),
      sk('ham_offset', '相殺上撈', '相殺', ['melee', 'defensive'], [0, 150], { cost: 10, sw: 'ccw', track: 9, recovery: 0.35, offset: [0.05, 0.3] },
        [hit(0.32, cone(150, 70), { dmg: 130, posture: 50, kb: 220, fx: 'slash' })]),
    ] };

  // ── 狩獵笛：左揮 / 右揮 / 後方叩擊各記一個音符（紅 / 藍 / 綠），同色兩個成旋律 → 演奏給附近隊友增益；響玉：原地三次爆鳴 ──
  const horn = { id: 'horn', name: '狩獵笛', el: 'physical', ai: [40, 140], bonus: {}, traits: [],
    skills: [
      sk('horn_l', '左揮（紅音）', '紅音', ['melee', 'fast'], [0, 140], { cost: 4, sw: 'ccw', recovery: 0.28 },
        [hit(0.2, cone(140, 100), { dmg: 70, posture: 20, kb: 140, fx: 'slash' })]),
      sk('horn_r', '右揮（藍音）', '藍音', ['melee', 'fast'], [0, 140], { cost: 4, sw: 'cw', recovery: 0.28 },
        [hit(0.22, cone(140, 100), { dmg: 72, posture: 20, kb: 140, fx: 'slash' })]),
      sk('horn_dash', '前進叩擊（紅音）', '前進', ['melee', 'gap'], [120, 300], { cost: 10, sw: 'down', track: 9, recovery: 0.35 },
        [dash(0.08, 170, 0.22), hit(0.32, cone(140, 80), { dmg: 75, posture: 22, kb: 160, fx: 'slash' })]),
    ],
    variants: [
      sk('horn_back', '後方叩擊（綠音）', '綠音', ['melee'], [0, 135], { cost: 6, sw: 'down', recovery: 0.35 },
        [hit(0.3, cone(135, 60), { dmg: 95, posture: 30, kb: 180, fx: 'slash' })]),
      sk('horn_play', '演奏', '演奏', ['buff'], [0, 600], { cost: 8, track: 0, recovery: 0.5 },
        [hit(0.3, circle(150), { dmg: 60, posture: 20, kb: 160, fx: { id: 'whirl', scale: 1.3 } })]),
      sk('horn_echo', '響玉', '響玉', ['melee', 'aoe'], [0, 160], { cost: 10, sw: 'spin', track: 4, recovery: 0.5 },
        [0.3, 0.55, 0.8].map((t) => hit(t, circle(170), { dmg: 55, posture: 20, kb: 60, fx: 'whirl' }))),
    ] };

  // ── 長槍：三段突刺、突進；防禦極硬（一般防禦也接反擊突刺）——鐵壁防禦反擊 ──
  const thrust = (id, name, short, dmg, posture, kb) => sk(id, name, short, ['melee', 'fast'], [0, 170], { cost: 0, sw: 'thrust', creep: 0.3, recovery: 0.25 },
    [hit(0.18, rect(175, 50), { dmg, posture, kb, fx: 'thrust' })]);
  const lance = { id: 'lance', name: '長槍', el: 'physical', ai: [60, 170], bonus: {}, traits: [],
    skills: [
      thrust('lance_p1', '中段突刺', '突刺', 46, 14, 60),
      sk('lance_charge', '突進', '突進', ['melee', 'gap'], [150, 420], { cost: 18, sw: 'thrust', track: 9, recovery: 0.45 },
        [dash(0.1, 300, 0.5), hit(0.35, rect(120, 80), { dmg: 30, posture: 12, kb: 60 }), hit(0.62, rect(160, 60), { dmg: 70, posture: 30, kb: 280, fx: 'thrust' })]),
    ],
    variants: [
      thrust('lance_p2', '中段突刺二', '二段', 50, 16, 60),
      thrust('lance_p3', '上段突刺', '三段', 64, 22, 150),
      sk('lance_guard', '防禦', '防禦', ['defensive'], [0, 400], { cost: 0, track: 12, recovery: 0.7, guard: { perfect: 0.25, chip: 0.12, block: true } }, []),
      sk('lance_counter', '反擊突刺', '反擊', ['melee'], [0, 190], { cost: 0, sw: 'thrust', track: 10, recovery: 0.3 },
        [hit(0.14, rect(190, 60), { dmg: 120, posture: 55, kb: 260, fx: { id: 'thrust', scale: 1.3 } })]),
    ] };

  // ── 銃槍：突刺 / 上撈 / 叩擊之間插砲擊（固定傷害、耗彈）；滿彈全彈發射、長冷卻的龍擊砲；裝填；防禦 ──
  const shell = (t) => hit(t, cone(150, 50), { dmg: 62, fixed: true, posture: 10, kb: 120, fx: { id: 'whirl', scale: 0.8 } });
  const gunlance = { id: 'gunlance', name: '銃槍', el: 'physical', ai: [60, 165], bonus: {}, traits: [],
    skills: [
      thrust('gl_p1', '突刺', '突刺', 62, 14, 60),
      sk('gl_shell', '砲擊', '砲擊', ['melee', 'fast'], [0, 150], { cost: 0, sw: 'thrust', recovery: 0.3 }, [shell(0.2)]),
      sk('gl_lunge', '踏步突刺', '踏突', ['melee', 'gap'], [120, 300], { cost: 10, sw: 'thrust', track: 9, recovery: 0.3 },
        [dash(0.06, 170, 0.2), hit(0.28, rect(170, 50), { dmg: 65, posture: 18, kb: 100, fx: 'thrust' })]),
    ],
    variants: [
      sk('gl_p2', '上撈斬', '上撈', ['melee'], [0, 150], { cost: 0, sw: 'ccw', recovery: 0.3 }, [hit(0.2, cone(150, 90), { dmg: 70, posture: 18, kb: 120, fx: 'slash' })]),
      sk('gl_slam', '叩擊', '叩擊', ['melee'], [0, 150], { cost: 8, sw: 'down', recovery: 0.35 }, [hit(0.35, cone(150, 60), { dmg: 90, posture: 30, kb: 160, fx: 'slash' })]),
      sk('gl_burst', '全彈發射', '全彈', ['melee'], [0, 150], { cost: 10, sw: 'down', recovery: 0.6 }, [0.4, 0.46, 0.52, 0.58, 0.64].map(shell)),
      sk('gl_wf', '龍擊砲', '龍擊', ['melee'], [0, 170], { cost: 0, sw: 'thrust', track: 4, recovery: 0.9 },
        [hit(1.3, cone(175, 60), { dmg: 380, fixed: true, posture: 90, kb: 420, fx: { id: 'whirl', scale: 2 } })]),
      sk('gl_reload', '裝填', '裝填', ['buff'], [0, 600], { cost: 0, track: 0, recovery: 0.45 }, []),
      sk('gl_guard', '防禦', '防禦', ['defensive'], [0, 400], { cost: 0, track: 12, recovery: 0.7, guard: { perfect: 0.2, chip: 0.2 } }, []),
    ] };

  H4.WEAPON_DEFS = { gs: greatsword, db: dualblades, sns, hammer, horn, lance, gunlance }; // katana / bow / lightxbow 用獵魂的武器物件
  Object.assign(H4.WEAPON_SPECS, {
    katana: Object.assign(H4.WEAPON_SPECS.katana, { extra: { k_helm: helm } }),
    gs: { dtype: 'cut', sharp: 90,
      focus: sk('h4_focus_gs', '破傷・崩斬', '破傷', ['melee'], [0, 190], { cd: 6, sw: 'down', track: 8, recovery: 0.6 },
        [hit(0.5, cone(190, 50), { dmg: 170, posture: 45, kb: 200, focus: true, fx: { id: 'slash', scale: 1.8 } })]) },
    db: { dtype: 'cut', sharp: 200,
      focus: sk('h4_focus_db', '刃旋・穿傷', '刃旋', ['melee'], [0, 160], { cd: 6, sw: 'spin', track: 9, recovery: 0.4 },
        [dash(0.05, 90, 0.12)].concat(flurry(0.18, 4, 0.06, cone(140, 90), { dmg: 22, posture: 6, kb: 30 }, 'slash'), [hit(0.45, cone(150, 80), { dmg: 40, focus: true, posture: 20, kb: 120, fx: 'whirl' })])) },
    sns: { dtype: 'cut', sharp: 160,
      focus: sk('h4_focus_sns', '盾穿・突刺', '盾穿', ['melee'], [0, 170], { cd: 6, sw: 'thrust', track: 9, recovery: 0.4 },
        [dash(0.08, 80, 0.1), hit(0.22, rect(170, 60), { dmg: 60, posture: 30, kb: 160, focus: true, fx: 'thrust' })]) },
    hammer: { dtype: 'blunt', sharp: 130,
      focus: sk('h4_focus_hammer', '碎傷・重擊', '碎傷', ['melee'], [0, 160], { cd: 6, sw: 'down', track: 8, recovery: 0.5 },
        [hit(0.4, cone(160, 60), { dmg: 140, posture: 45, kb: 200, focus: true, fx: { id: 'slash', scale: 1.5 } })]) },
    horn: { dtype: 'blunt', sharp: 120,
      focus: sk('h4_focus_horn', '共鳴・穿傷', '共鳴', ['melee'], [0, 160], { cd: 6, sw: 'spin', track: 8, recovery: 0.45 },
        [hit(0.35, circle(160), { dmg: 110, posture: 35, kb: 180, focus: true, fx: 'whirl' })]) },
    lance: { dtype: 'cut', sharp: 160,
      focus: sk('h4_focus_lance', '貫傷・突刺', '貫傷', ['melee'], [0, 200], { cd: 6, sw: 'thrust', track: 9, recovery: 0.4 },
        [hit(0.25, rect(200, 60), { dmg: 110, posture: 35, kb: 200, focus: true, fx: 'thrust' })]) },
    gunlance: { dtype: 'cut', sharp: 140, shells: 5, wfCd: 40, // 彈數、龍擊砲冷卻（秒）
      focus: sk('h4_focus_gunlance', '爆傷・砲突', '爆傷', ['melee'], [0, 180], { cd: 6, sw: 'thrust', track: 9, recovery: 0.45 },
        [hit(0.2, rect(180, 60), { dmg: 60, posture: 20, kb: 80, fx: 'thrust' }), hit(0.4, cone(160, 50), { dmg: 70, fixed: true, posture: 25, kb: 200, focus: true, fx: 'whirl' })]) },
  });
  H4.HORN = { range: 600, dur: 45, heal: 0.15, allHeal: 0.08, echoCd: 18 }; // 狩獵笛：演奏範圍、增益秒數、回復旋律 / 全音旋律回復比例、響玉冷卻
  H4.DEMON = { drain: 7, exitAt: 0.25, gaugePerHit: 2.2, archDrain: 2, flurryCost: 30, dmgMul: 1.15 }; // 雙刀：鬼人化每秒耗體力、體力低於此比例自動解除（留翻滾的體力）、每次命中加鬼人槽、鬼人強化每秒掉槽、亂舞耗槽、鬼人化傷害倍率
  H4.GUARD = { chip: 0.25, staPerDmg: 0.35, kbMul: 0.3 }; // 一般防禦：承受傷害比例、每點傷害耗體力、擊退倍率
  H4.CLASH = { dmg: 120, lock: 1.2, win: 0.55, topple: 2.5 }; // 力量對抗：Boss 單擊傷害門檻、對峙時間、基礎勝率、勝利時 Boss 倒地秒數
})(typeof window !== 'undefined' ? window : globalThis);
