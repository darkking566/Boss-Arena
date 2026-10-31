'use strict';
// 狩獵模式（4v1）武器資料：每把武器 = 給 buildHero 的武器物件（skills＝AI 可直接挑的招、variants＝只由武器驅動接出的招）+ 狩獵屬性。
// 驅動邏輯（連段、蓄力、鬼人化、防禦…）在 js/engine/hunt4/weapons.js。數值皆為沉重節奏最終值。
// 招式旗標：offset＝[起, 迄] 秒的相殺判定窗、guard＝{ perfect } 防禦（整招期間；開頭 perfect 秒為完美防禦）、armor＝受擊減傷比例（鐵壁，不被打斷）、dtype＝覆寫傷害類型、focus＝集中弱點攻擊
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

  H4.WEAPON_DEFS = { gs: greatsword, db: dualblades, sns }; // katana / bow / lightxbow 用獵魂的武器物件
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
  });
  H4.DEMON = { drain: 7, exitAt: 0.25, gaugePerHit: 2.2, archDrain: 2, flurryCost: 30, dmgMul: 1.15 }; // 雙刀：鬼人化每秒耗體力、體力低於此比例自動解除（留翻滾的體力）、每次命中加鬼人槽、鬼人強化每秒掉槽、亂舞耗槽、鬼人化傷害倍率
  H4.GUARD = { chip: 0.25, staPerDmg: 0.35, kbMul: 0.3 }; // 一般防禦：承受傷害比例、每點傷害耗體力、擊退倍率
  H4.CLASH = { dmg: 120, lock: 1.2, win: 0.55, topple: 2.5 }; // 力量對抗：Boss 單擊傷害門檻、對峙時間、基礎勝率、勝利時 Boss 倒地秒數
})(typeof window !== 'undefined' ? window : globalThis);
