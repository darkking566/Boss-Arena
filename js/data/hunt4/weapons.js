'use strict';
// 狩獵模式（4v1）武器資料：每把武器 = 給 buildHero 的武器物件（skills＝AI 可直接挑的招、variants＝只由武器驅動接出的招）+ 狩獵屬性。
// 驅動邏輯（連段、蓄力、鬼人化、防禦…）在 js/engine/hunt4/weapons.js。數值皆為沉重節奏最終值。
// 招式旗標：offset＝[起, 迄] 秒的相殺判定窗、guard＝{ perfect, chip?, block? } 防禦（整招期間；開頭 perfect 秒為完美防禦；chip 覆寫擋下後承受比例；block＝一般防禦也接反擊）、
// armor＝受擊減傷比例（鐵壁，不被打斷）、dtype＝覆寫傷害類型、focus＝集中弱點攻擊；命中參數 fixed＝固定傷害（砲擊：不吃肉質 / 銳利度 / 屬性）
// mode＝變形武器的形態（招式開始時切換到該形態：斬擊斧 axe / sword、充能斧 sword / axe）
// evade＝{ win, perfect? } 招式開頭 win 秒迴避攻擊、perfect 秒內＝看破迴避（弓的蓄力墊步 / 飛燕射擊）
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

  // 太刀：沿用獵魂的太刀（含彈刀 / 見切 / 氣刃），另外補上「氣刃兜割」（白刃起可放、消耗一階）與紅刃兜割後接的「練氣解放無雙斬」（霸體、再消耗一階）
  const helm = sk('k_helm', '氣刃兜割', '兜割', ['melee'], [0, 220], { cost: 0, sw: 'down', track: 8, recovery: 0.7 },
    [dash(0.15, 120, 0.15, { iframe: true })].concat(flurry(0.4, 5, 0.08, cone(150, 80), { dmg: 40, posture: 10, kb: 40 }, 'slash'),
      [hit(0.85, cone(170, 100), { dmg: 160, posture: 60, kb: 360, fx: { id: 'slash', scale: 1.7 } })]));
  const musou = sk('k_musou', '練氣解放無雙斬', '無雙', ['melee', 'aoe'], [0, 200], { cost: 0, sw: 'spin', track: 6, recovery: 0.8, armor: 0.5 },
    flurry(0.2, 6, 0.1, circle(170), { dmg: 35, posture: 10, kb: 40 }, 'whirl').concat([hit(0.95, cone(190, 120), { dmg: 220, posture: 70, kb: 420, fx: { id: 'slash', scale: 1.8 } })]));

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
      sk('lance_guard', '防禦', '防禦', ['defensive'], [0, 400], { cost: 0, track: 12, recovery: 0.7, guard: { perfect: 0.25, chip: 0.18, block: true } }, []),
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

  // ── 斬擊斧：斧形態攻擊回充斬擊槽 → 變形成劍（耗槽、命中累積解放槽）→ 解放槽滿進入「屬性解放」（劍傷害提高）→ 零距離屬性解放突擊收尾 ──
  const axe = (id, name, short, o, actions) => sk(id, name, short, ['melee'], [0, 165], Object.assign({ cost: 0, mode: 'axe' }, o), actions);
  const swd = (id, name, short, o, actions) => sk(id, name, short, ['melee'], [0, 150], Object.assign({ cost: 0, mode: 'sword' }, o), actions);
  const switchaxe = { id: 'switchaxe', name: '斬擊斧', el: 'physical', ai: [50, 160], bonus: {}, traits: [],
    skills: [
      axe('sa_axe1', '斧：縱斬', '縱斬', { sw: 'down', recovery: 0.4 }, [hit(0.32, cone(165, 60), { dmg: 90, posture: 25, kb: 160, fx: { id: 'slash', scale: 1.3 } })]),
      axe('sa_lunge', '斧：突進斬', '突進', { sw: 'down', track: 9, recovery: 0.4, tags: ['melee', 'gap'], range: [140, 320] },
        [dash(0.08, 180, 0.25), hit(0.38, cone(165, 60), { dmg: 85, posture: 25, kb: 180, fx: 'slash' })]),
    ],
    variants: [
      axe('sa_axe2', '斧：橫斬', '橫斬', { sw: 'cw', recovery: 0.35 }, [hit(0.26, cone(165, 110), { dmg: 80, posture: 22, kb: 160, fx: 'slash' })]),
      axe('sa_wild', '斧：狂斧', '狂斧', { sw: 'spin', creep: 0.5, recovery: 0.4 }, flurry(0.15, 6, 0.12, cone(160, 100), { dmg: 26, posture: 7, kb: 30 }, 'slash')),
      swd('sa_morph', '變形斬（劍）', '變形', { sw: 'cw', recovery: 0.3 }, [hit(0.25, cone(150, 100), { dmg: 95, posture: 25, kb: 140, fx: 'slash' })]),
      swd('sa_sw1', '劍：縱斬', '劍縱', { sw: 'down', recovery: 0.25 }, [hit(0.18, cone(150, 60), { dmg: 72, posture: 16, kb: 90, fx: 'slash' })]),
      swd('sa_sw2', '劍：橫斬', '劍橫', { sw: 'ccw', recovery: 0.25 }, [hit(0.18, cone(150, 100), { dmg: 70, posture: 16, kb: 90, fx: 'slash' })]),
      swd('sa_sw3', '劍：二連斬', '二連', { sw: 'cw', recovery: 0.3 }, [hit(0.16, cone(150, 90), { dmg: 44, posture: 12, kb: 60 }), hit(0.32, cone(150, 90), { dmg: 50, posture: 14, kb: 120, fx: 'slash' })]),
      swd('sa_zsd', '零距離屬性解放突擊', '零解', { sw: 'thrust', track: 8, recovery: 0.7, armor: 0.3 },
        [dash(0.05, 80, 0.12)].concat(flurry(0.25, 6, 0.1, rect(140, 70), { dmg: 36, posture: 10, kb: 0 }, 'thrust'), [hit(0.95, circle(170), { dmg: 220, posture: 70, kb: 360, fx: { id: 'whirl', scale: 1.6 } })])),
      axe('sa_morph_axe', '變形斬（斧）', '回斧', { sw: 'down', recovery: 0.35 }, [hit(0.3, cone(165, 60), { dmg: 80, posture: 24, kb: 160, fx: 'slash' })]),
    ] };

  // ── 充能斧：劍盾形態命中累積能量 → 裝瓶（能量轉成瓶）→ 斧形態屬性解放斬 I / II / 大解放斬（每段帶瓶爆）→ 有瓶時大解放斬後盾強化；超解（消耗全部瓶） ──
  const cbS = (id, name, short, o, actions) => sk(id, name, short, ['melee'], [0, 150], Object.assign({ cost: 0, mode: 'sword' }, o), actions);
  const cbA = (id, name, short, o, actions) => sk(id, name, short, ['melee'], [0, 170], Object.assign({ cost: 6, mode: 'axe' }, o), actions);
  const phial = (t, dmg) => hit(t, cone(170, 60), { dmg, fixed: true, posture: 12, kb: 60, fx: { id: 'whirl', scale: 0.9 } });
  const chargeblade = { id: 'chargeblade', name: '充能斧', el: 'physical', ai: [50, 155], bonus: {}, traits: [],
    skills: [
      cbS('cb_s1', '劍：突進斬', '突進', { sw: 'thrust', track: 9, recovery: 0.3, tags: ['melee', 'gap'], range: [120, 300] },
        [dash(0.06, 160, 0.2), hit(0.26, cone(150, 70), { dmg: 60, posture: 15, kb: 90, fx: 'slash' })]),
      cbS('cb_s2', '劍：縱斬', '縱斬', { sw: 'down', recovery: 0.25 }, [hit(0.18, cone(150, 70), { dmg: 58, posture: 15, kb: 90, fx: 'slash' })]),
    ],
    variants: [
      cbS('cb_s3', '劍：迴旋斬', '迴旋', { sw: 'spin', recovery: 0.3 }, [hit(0.22, circle(150), { dmg: 66, posture: 18, kb: 140, fx: 'whirl' })]),
      cbS('cb_charge', '裝瓶', '裝瓶', { tags: ['buff'], range: [0, 600], track: 0, recovery: 0.55 }, []),
      cbS('cb_guard', '防禦', '防禦', { tags: ['defensive'], range: [0, 400], track: 12, recovery: 0.7, guard: { perfect: 0.2, chip: 0.2 } }, []),
      cbA('cb_ed1', '屬性解放斬 I', '解放I', { sw: 'cw', recovery: 0.4 }, [hit(0.3, cone(170, 90), { dmg: 85, posture: 25, kb: 120, fx: 'slash' }), phial(0.36, 30)]),
      cbA('cb_ed2', '屬性解放斬 II', '解放II', { sw: 'ccw', recovery: 0.45 },
        [hit(0.28, cone(170, 90), { dmg: 70, posture: 22, kb: 60 }), phial(0.34, 25), hit(0.5, cone(170, 90), { dmg: 75, posture: 22, kb: 160, fx: 'slash' }), phial(0.56, 25)]),
      cbA('cb_aed', '大解放斬', '大解放', { sw: 'down', recovery: 0.7, armor: 0.3 }, [hit(0.55, cone(175, 70), { dmg: 200, posture: 60, kb: 300, fx: { id: 'slash', scale: 1.6 } }), phial(0.62, 70)]),
      cbA('cb_saed', '超解放斬', '超解', { sw: 'down', track: 5, recovery: 0.9 }, [hit(0.7, cone(180, 60), { dmg: 160, posture: 50, kb: 200, fx: { id: 'slash', scale: 1.8 } })]), // 瓶爆由驅動依瓶數追加
    ] };

  // ── 操蟲棍：放獵蟲採集紅 / 白 / 橙三色精華（攻擊 / 移動 / 防禦強化），三色齊全可放急襲突刺（消耗精華）；跳躍迴避接空中連斬 ──
  const glaive = { id: 'glaive', name: '操蟲棍', el: 'physical', ai: [50, 160], bonus: {}, traits: [],
    skills: [
      sk('ig_a1', '袈裟斬', '袈裟', ['melee', 'fast'], [0, 160], { cost: 0, sw: 'cw', creep: 0.4, recovery: 0.25 }, [hit(0.18, cone(160, 100), { dmg: 58, posture: 14, kb: 90, fx: 'slash' })]),
      sk('ig_vault', '跳躍', '跳躍', ['melee', 'gap'], [130, 340], { cost: 12, sw: 'down', track: 9, recovery: 0.3 },
        [dash(0.05, 200, 0.3, { iframe: true }), hit(0.4, cone(150, 90), { dmg: 70, posture: 18, kb: 120, fx: 'slash' })]),
    ],
    variants: [
      sk('ig_a2', '突刺', '突刺', ['melee', 'fast'], [0, 165], { cost: 0, sw: 'thrust', recovery: 0.25 }, [hit(0.16, rect(165, 50), { dmg: 58, posture: 14, kb: 90, fx: 'thrust' })]),
      sk('ig_a3', '迴轉斬', '迴轉', ['melee'], [0, 160], { cost: 0, sw: 'spin', recovery: 0.3 }, [hit(0.22, circle(160), { dmg: 72, posture: 20, kb: 150, fx: 'whirl' })]),
      sk('ig_red', '紅精華連斬', '紅連', ['melee'], [0, 165], { cost: 6, sw: 'spin', creep: 0.4, recovery: 0.35 }, flurry(0.14, 4, 0.1, cone(165, 110), { dmg: 40, posture: 11, kb: 60 }, 'slash')),
      sk('ig_air', '空中迴轉斬', '空斬', ['melee'], [0, 160], { cost: 8, sw: 'spin', recovery: 0.3 }, [dash(0.02, 60, 0.15, { iframe: true }), hit(0.15, circle(150), { dmg: 50, posture: 12, kb: 60 }), hit(0.3, circle(150), { dmg: 55, posture: 14, kb: 140, fx: 'whirl' })]),
      sk('ig_kinsect', '放獵蟲', '獵蟲', ['buff'], [0, 600], { cost: 0, track: 4, recovery: 0.3 }, []),
      sk('ig_dive', '急襲突刺', '急襲', ['melee'], [0, 200], { cost: 10, sw: 'thrust', track: 9, recovery: 0.6 },
        [dash(0.1, 140, 0.2, { iframe: true }), hit(0.35, rect(200, 70), { dmg: 240, posture: 60, kb: 340, fx: { id: 'thrust', scale: 1.6 } })]),
    ] };

  // ── 遠程：弩的招式不耗體力，由驅動管彈藥；弓的蓄力 / 剛射 / 墊步耗體力 ──
  const shot = (at, p) => Object.assign({ do: 'proj', at, n: 1, life: 1.2 }, p);
  const rs = (id, name, short, o, actions) => sk(id, name, short, ['ranged'], [0, 850], Object.assign({ cost: 0 }, o), actions);
  const arrow = (dmg, n, extra) => Object.assign({ n, spread: n > 1 ? 0.07 : 0, speed: 1100, r: 7, dmg, posture: dmg * 0.25, kb: 40, kind: 'arrow' }, extra);
  // ── 弓（荒野式）：三階蓄力（射擊連射 / 長按蓄力）、迅雷閃擊、剛射 → 剛連射、蓄力墊步（看破迴避）→ 飛燕射擊、特殊箭量表（瓶 / 誘導箭共用）、
  //    八種瓶、曲射（殘留觸發箭）、龍之一矢 / 剎那 / 龍之千矢（引爆誘導箭與殘留觸發箭）、集中射擊【箭雨】。招式耗體力；段數、量表、瓶由驅動管。
  //    箭的額外命中參數放 extra（tracer＝誘導箭、det＝引爆、focus＝打破傷口）；evade＝{ win, perfect? } 開頭 win 秒迴避攻擊、perfect 秒內＝看破迴避
  const L3 = [1, 2, 3], RN = ['', 'I', 'II', 'III'], DET = { det: true };
  const pierceBolt = (dmg, speed, rehit, extra) => Object.assign({ speed, r: 13, dmg, posture: dmg * 0.25, kb: 20, pierce: true, rehit, life: 1.1, kind: 'bolt', extra: DET }, extra); // 貫穿重箭：每 rehit 秒對 Boss 再判定一次（身體越長打越多段）
  const bow = { id: 'bow', name: '弓', el: 'physical', ai: [220, 460], bonus: {}, traits: [],
    skills: [rs('bow_s1', '射擊 I', '射擊I', { track: 9, recovery: 0.2 }, [shot(0.22, arrow(42, 1))])],
    variants: [
      rs('bow_s2', '射擊 II', '射擊II', { track: 9, recovery: 0.22 }, [shot(0.28, arrow(36, 2))]),
      rs('bow_s3', '射擊 III', '射擊III', { track: 9, recovery: 0.25 }, [shot(0.34, arrow(34, 3))]),
      rs('bow_c2', '蓄力射擊 II', '蓄II', { cost: 8, track: 9, recovery: 0.22 }, [shot(0.55, arrow(36, 2))]),
      rs('bow_c3', '蓄力射擊 III', '蓄III', { cost: 14, track: 9, recovery: 0.25 }, [shot(0.85, arrow(34, 3))]),
      rs('bow_quick', '迅雷閃擊', '迅雷', { range: [0, 380], track: 10, recovery: 0.2 }, [shot(0.14, arrow(24, 3, { spread: 0.16, life: 0.4 }))]),
      ...L3.map((l) => rs('bow_p' + l, '剛射 ' + RN[l], '剛射', { cost: 10, range: [0, 600], track: 8, recovery: 0.32 }, [shot(0.26, arrow([26, 26, 30][l - 1], [4, 5, 5][l - 1], { spread: 0.11, life: 0.65 }))])),
      ...L3.map((l) => rs('bow_v' + l, '剛連射 ' + RN[l], '剛連', { cost: 14, range: [0, 600], track: 8, recovery: 0.5 }, [shot(0.3, arrow([28, 28, 32][l - 1], [5, 6, 6][l - 1], { spread: 0.1, life: 0.65 }))])),
      rs('bow_step', '蓄力墊步', '墊步', { tags: ['ranged', 'defensive'], cost: 14, track: 12, recovery: 0.12, evade: { win: 0.26, perfect: 0.12 } }, [dash(0.02, 120, 0.2, { dir: 'side' })]),
      ...L3.map((l) => rs('bow_sw' + l, '飛燕射擊 ' + RN[l], '飛燕', { cost: 10, range: [0, 600], track: 9, recovery: 0.3, evade: { win: 0.3 } }, [dash(0.02, 170, 0.3, { dir: 'side' }), shot(0.24, arrow(30, l + 2, { spread: 0.09 }))])),
      rs('bow_tracer', '誘導箭', '誘導', { track: 10, recovery: 0.25 }, [shot(0.3, arrow(40, 1, { speed: 1300, life: 1.5, extra: { tracer: true } }))]),
      rs('bow_load', '裝填瓶', '裝瓶', { tags: ['buff'], range: [0, 900], track: 0, recovery: 0.45 }, []),
      rs('bow_arc', '曲射', '曲射', { cost: 12, range: [120, 700], track: 6, recovery: 0.45 }, [{ do: 'h4arc', at: 0.45, n: 9, flight: 0.5, scatter: 70, dmg: 32, posture: 8 }]),
      rs('bow_dragon', '龍之一矢', '龍矢', { cost: 20, track: 5, recovery: 0.7 }, [shot(1.0, pierceBolt(62, 950, 0.035))]),
      rs('bow_dragon_q', '龍之一矢・剎那', '剎那', { cost: 16, track: 7, recovery: 0.5 }, [shot(0.45, pierceBolt(48, 1100, 0.045, { r: 11, life: 0.9 }))]),
      rs('bow_thousand', '龍之千矢', '千矢', { cost: 20, range: [0, 300], track: 8, recovery: 0.8 }, [shot(0.5, arrow(34, 13, { spread: 0.075, speed: 1000, life: 0.35, extra: DET }))]),
      rs('bow_focus_dragon', '集中射擊・龍之一矢', '追龍', { track: 9, recovery: 0.6 }, [shot(0.35, pierceBolt(70, 1000, 0.035, { homing: 4 }))]),
    ] };
  // ── 輕弩（荒野式）：普通 / 速射兩種模式（lbg_mode 切換）。每種彈（通常 n / 貫通 p / 散彈 s）各有：射擊、追擊射擊、速射、速射追擊射擊、速射墊步射擊、裝填。
  //    彈匣、速射能量、特殊彈、集中攻擊彈由驅動管；招式 id＝lbg_<動作>_<彈種>。evade 只有迴避窗、沒有看破（跟弓不同）
  const bullet = (dmg, extra) => Object.assign({ speed: 1300, r: 7, dmg, posture: dmg * 0.25, kb: 50, kind: 'bolt' }, extra);
  const LBG_AMMO = { // dmg 單發傷害、ex 彈的額外參數、wind 射擊出手、rec 射擊收招、range 招式射程、chase / rapid 追擊 / 速射的段數、reload 裝填收招
    n: { name: '通常彈', short: '通常', dmg: 32, ex: {}, wind: 0.16, rec: 0.2, range: [0, 650], chase: 3, rapid: 5, reload: 0.5 },
    p: { name: '貫通彈', short: '貫通', dmg: 15, ex: { speed: 1600, pierce: true, rehit: 0.04, life: 0.9 }, wind: 0.22, rec: 0.3, range: [0, 800], chase: 2, rapid: 3, reload: 0.9 },
    s: { name: '散彈', short: '散彈', dmg: 9, ex: { n: 6, spread: 0.1, life: 0.32, kb: 30 }, wind: 0.18, rec: 0.3, range: [0, 300], chase: 2, rapid: 2, reload: 0.7 },
  };
  const volleys = (a, t0, gap, k, mul, extra) => Array.from({ length: k }, (_, i) => shot(t0 + i * gap, bullet(Math.round(a.dmg * (typeof mul === 'function' ? mul(i) : mul)), Object.assign({}, a.ex, extra))));
  const lbgAmmo = (am) => {
    const a = LBG_AMMO[am], o = { range: a.range, track: 10 }, CH = { chase: true };
    return [
      rs('lbg_shot_' + am, a.name, a.short, Object.assign({}, o, { recovery: a.rec }), volleys(a, a.wind, 0, 1, 1)),
      rs('lbg_chase_' + am, a.name + '・追擊射擊', '追擊', Object.assign({}, o, { recovery: 0.45 }), volleys(a, 0.2, 0.07, a.chase, 0.75, { extra: CH })), // 站定、命中回速射能量較多
      rs('lbg_rapid_' + am, a.name + '・速射', '速射', Object.assign({}, o, { recovery: 0.3 }), volleys(a, 0.14, 0.07, a.rapid, 0.55)),
      rs('lbg_rchase_' + am, a.name + '・速射追擊', '速追', Object.assign({}, o, { recovery: 0.6 }), volleys(a, 0.16, 0.07, a.rapid, (i) => (i === a.rapid - 1 ? 1.5 : 0.6))), // 最後一發有加成、硬直大
      rs('lbg_burst_' + am, a.name + '・速射墊步射擊', '墊射', Object.assign({}, o, { tags: ['ranged', 'defensive'], recovery: 0.18, evade: { win: 0.2 } }),
        [dash(0.02, 130, 0.18, { dir: 'side' })].concat(volleys(a, 0.08, 0.05, a.rapid, 0.5))),
      rs('lbg_reload_' + am, '裝填' + a.name, '裝填', { tags: ['buff'], range: [0, 900], track: 0, recovery: a.reload }, []),
    ];
  };
  const lightxbow = { id: 'lightxbow', name: '輕弩', el: 'physical', ai: [320, 620], bonus: {}, traits: [],
    skills: [rs('lbg_shot_n', LBG_AMMO.n.name, LBG_AMMO.n.short, { range: LBG_AMMO.n.range, track: 10, recovery: LBG_AMMO.n.rec }, volleys(LBG_AMMO.n, LBG_AMMO.n.wind, 0, 1, 1))],
    variants: [
      ...['n', 'p', 's'].flatMap(lbgAmmo).filter((s) => s.id !== 'lbg_shot_n'),
      rs('lbg_mode', '切換速射模式', '切換', { tags: ['buff'], range: [0, 900], track: 0, recovery: 0.2 }, []),
      rs('lbg_sreload', '墊步裝填', '墊裝', { tags: ['ranged', 'defensive'], range: [0, 900], track: 0, recovery: 0.5, evade: { win: 0.2 } }, [dash(0.02, 130, 0.2, { dir: 'side' })]), // 速射模式彈匣空：邊移動邊裝填（固定時間）
      rs('lbg_step', '射擊後墊步', '墊步', { tags: ['ranged', 'defensive'], range: [0, 900], track: 12, recovery: 0.1, evade: { win: 0.18 } }, [dash(0.02, 110, 0.16, { dir: 'side' })]),
      rs('lbg_slide', '滑行', '滑行', { tags: ['ranged', 'defensive'], range: [0, 900], track: 0, recovery: 0.3, evade: { win: 0.12 } }, [dash(0.02, 220, 0.3, { dir: 'back' })]),
      rs('lbg_adh', '附著龍彈', '附著', { track: 9, recovery: 0.4 }, [shot(0.35, bullet(30, { speed: 1400, r: 9, extra: { adh: true } }))]),
      rs('lbg_wyv', '起爆龍彈', '起爆', { tags: ['ranged', 'buff'], range: [0, 400], track: 0, recovery: 0.4 }, []), // 設在腳下，驅動生成裝置
      rs('lbg_focus1', '集中攻擊彈【射鵰】・蓄一段', '射鵰', { track: 6, recovery: 0.5 }, [shot(0.75, bullet(156, { speed: 1800, r: 11, kb: 120, extra: { focus: true } }))]),
      rs('lbg_focus2', '集中攻擊彈【射鵰】・蓄二段', '射鵰', { track: 5, recovery: 0.55 }, [shot(1.1, bullet(204, { speed: 1800, r: 12, kb: 160, extra: { focus: true } }))]),
    ] };
  // ── 重弩：重彈一發一發慢慢打；架設＝站定連射（受擊減傷不倒、會被包夾）；Boss 有破綻用狙擊彈；彈匣打空要裝填 ──
  const heavyxbow = { id: 'heavyxbow', name: '重弩', el: 'physical', ai: [420, 760], bonus: {}, traits: [],
    skills: [rs('hbg_n', '重弩彈', '重彈', { track: 8, recovery: 0.4 }, [shot(0.4, bullet(150, { speed: 1500, r: 9, kb: 120 }))])],
    variants: [
      rs('hbg_snipe', '狙擊彈', '狙擊', { track: 5, recovery: 0.7 }, [shot(1.1, bullet(340, { speed: 1900, r: 12, posture: 110, kb: 300, pierce: true }))]),
      rs('hbg_siege', '架設連射', '架設', { track: 8, recovery: 0.5, armor: 0.4 }, [0, 1, 2, 3, 4, 5, 6, 7].map((k) => shot(0.35 + k * 0.16, bullet(56)))),
      rs('hbg_reload', '裝填', '裝填', { tags: ['buff'], range: [0, 900], track: 0, recovery: 1.0 }, []),
    ] };

  H4.WEAPON_DEFS = { gs: greatsword, db: dualblades, sns, hammer, horn, lance, gunlance, switchaxe, chargeblade, glaive, bow, lightxbow, heavyxbow }; // 太刀用獵魂的武器物件
  Object.assign(H4.WEAPON_SPECS, {
    katana: Object.assign(H4.WEAPON_SPECS.katana, { extra: { k_helm: helm, k_musou: musou } }),
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
  Object.assign(H4.WEAPON_SPECS, {
    switchaxe: { dtype: 'cut', sharp: 150,
      focus: sk('h4_focus_switchaxe', '裂傷・變形斬', '裂傷', ['melee'], [0, 170], { cd: 6, sw: 'down', track: 8, recovery: 0.5 },
        [hit(0.35, cone(170, 60), { dmg: 130, posture: 40, kb: 200, focus: true, fx: { id: 'slash', scale: 1.4 } })]) },
    chargeblade: { dtype: 'cut', sharp: 140,
      focus: sk('h4_focus_chargeblade', '瓶爆・穿傷', '瓶爆', ['melee'], [0, 170], { cd: 6, sw: 'down', track: 8, recovery: 0.5 },
        [hit(0.35, cone(170, 60), { dmg: 90, posture: 30, kb: 120 }), hit(0.42, cone(170, 60), { dmg: 50, fixed: true, posture: 20, kb: 200, focus: true, fx: 'whirl' })]) },
    glaive: { dtype: 'cut', sharp: 140,
      focus: sk('h4_focus_glaive', '蟲穿・旋斬', '蟲穿', ['melee'], [0, 180], { cd: 6, sw: 'spin', track: 9, recovery: 0.4 },
        [dash(0.05, 90, 0.15, { iframe: true }), hit(0.3, circle(160), { dmg: 110, posture: 35, kb: 180, focus: true, fx: 'whirl' })]) },
  });
  Object.assign(H4.WEAPON_SPECS, { heavyxbow: { dtype: 'shot', sharp: 0, taken: 1.3 } }); // 重弩沒有集中弱點攻擊
  H4.WEAPON_SPECS.bow.focus = sk('h4_focus_bow', '集中射擊【箭雨】', '箭雨', ['ranged'], [0, 700], { cd: 6, track: 6, recovery: 0.5 }, // 追蹤箭雨：每支命中打破一處傷口，有打破就接強化龍之一矢
    [shot(0.55, arrow(40, 3, { spread: 0.35, homing: 8, life: 1.6, extra: { focus: true, det: true } }))]);
  // 弓：一組瓶 coatShots 次射擊；trickMax 特殊箭量表格數；gain＝量表回復（長按蓄力 II / III、每支箭命中、看破迴避 / 精準看破＝墊步開頭 preciseT 秒內）、discernSta＝看破回體力；
  // tracer＝誘導箭（秒數、追蹤轉向率、射程加長、引爆基礎傷害 / 每支追蹤箭命中加成 / 加成上限）；mark＝殘留觸發箭（秒數、上限、每支引爆傷害）；
  // band＝適正距離（箭飛行距離在 [近, 遠] 內全傷害，外面乘 lo）；decay＝多久沒動作蓄力段數歸零
  H4.BOW = { coatShots: 10, trickMax: 3, gain: { c2: 0.25, c3: 0.45, hit: 0.04, discern: 1, perfect: 1.5, preciseT: 0.05 }, discernSta: 40,
    tracer: { dur: 10, home: 7, reach: 200, det: 60, perHit: 10, maxHits: 15 }, mark: { dur: 20, max: 12, det: 28 }, band: { near: 60, far: 520, lo: 0.75 }, decay: 1.2,
    coatList: ['power', 'close', 'pierce', 'para', 'sleep', 'poison', 'blast', 'exhaust'], // 這把弓能裝的瓶（之後可依武器改）
    coatFx: { // dmg 傷害倍率、band 覆寫適正距離、pierce / rehit 貫穿多段、ail / sv 異常累積、posture 架勢倍率（減氣）
      power: { name: '強擊瓶', color: '#ff8a6a', dmg: 1.3 },
      close: { name: '接擊瓶', color: '#ffb84a', dmg: 1.45, band: [0, 260] },
      pierce: { name: '貫通瓶', color: '#9fd8ff', dmg: 0.5, pierce: true, rehit: 0.06 },
      para: { name: '麻痺瓶', color: '#ffe14a', ail: 'paralysis', sv: 20 },
      sleep: { name: '睡眠瓶', color: '#8fb8ff', ail: 'sleep', sv: 20 },
      poison: { name: '毒瓶', color: '#b86bff', ail: 'poison', sv: 22 },
      blast: { name: '爆破瓶', color: '#ff9a3c', ail: 'blast', sv: 18 },
      exhaust: { name: '減氣瓶', color: '#c8f0a0', posture: 2.2 },
    } };
  // 弓連招表：AI 依情境（Boss 狀態 when、需求 need）挑一套，獵人大腦記住每個情境下哪套回報高。
  // 步驟：shot 射擊（依段數 I→II→III）、charge 長按蓄力到 III、quick 迅雷閃擊、power 剛射、volley 剛連射、step 蓄力墊步、swallow 飛燕射擊、
  //       tracer 誘導箭、load 裝瓶、arc 曲射、dragon 龍之一矢、dragon_q 剎那、thousand 龍之千矢。做不到的步驟（距離 / 體力 / 量表）跳過。
  // need：near 近身（< 300）、trick 量表格數、noTracer / tracer 誘導箭狀態、coatless 沒瓶、det 有可引爆的標記、lowSta 體力少；prior 先驗回報、risk 越愛冒險越想用
  H4.BOW_COMBOS = [
    { id: 'basic', name: '基本高蓄力循環', when: ['idle', 'move', 'open', 'atk'], prior: 0.6, seq: ['shot', 'shot', 'shot', 'power', 'step', 'shot', 'power', 'step', 'shot', 'power'] },
    { id: 'quick', name: '快速起手', when: ['idle', 'move', 'open', 'atk'], need: { near: true }, prior: 0.45, risk: 0.4, seq: ['quick', 'power', 'volley'] },
    { id: 'charge', name: '長按蓄力起手', when: ['idle', 'open'], prior: 0.5, risk: 0.2, seq: ['charge', 'power', 'step', 'shot', 'power'] },
    { id: 'poke', name: '試探射擊', when: ['idle', 'move', 'atk'], prior: 0.4, risk: -0.3, seq: ['shot', 'shot', 'step'] },
    { id: 'greed', name: '剛連射連段', when: ['idle', 'open'], prior: 0.5, risk: 0.5, seq: ['shot', 'shot', 'shot', 'power', 'volley'] },
    { id: 'save', name: '節省體力', when: ['idle', 'move', 'open', 'atk', 'down'], need: { lowSta: true }, prior: 0.7, seq: ['quick', 'shot', 'shot'] },
    { id: 'load', name: '補瓶再射', when: ['idle', 'move', 'open', 'atk'], need: { trick: 1, coatless: true }, prior: 0.85, seq: ['load', 'shot', 'power'] },
    { id: 'tracerChase', name: '誘導箭追擊', when: ['idle', 'move', 'atk'], need: { trick: 1, noTracer: true }, prior: 0.55, seq: ['tracer', 'shot', 'power', 'step', 'shot', 'power'] },
    { id: 'tracerBurst', name: '誘導箭爆發', when: ['open', 'down'], need: { trick: 1, noTracer: true }, prior: 0.6, risk: 0.3, seq: ['tracer', 'shot', 'power', 'volley', 'dragon_q'] },
    { id: 'tracerRide', name: '誘導箭持續輸出', when: ['idle', 'move', 'open', 'atk'], need: { tracer: true }, prior: 0.7, seq: ['shot', 'power', 'step', 'shot', 'power', 'step', 'shot', 'power'] },
    { id: 'tracerCharge', name: '蓄力誘導', when: ['idle'], need: { trick: 2, noTracer: true }, prior: 0.5, seq: ['tracer', 'charge', 'power', 'step', 'shot', 'power', 'volley'] },
    { id: 'swallow', name: '飛燕追擊', when: ['move', 'atk'], prior: 0.45, risk: 0.2, seq: ['shot', 'power', 'step', 'swallow', 'power'] },
    { id: 'stagger', name: '硬直剎那', when: ['open'], prior: 0.55, seq: ['shot', 'power', 'dragon_q'] },
    { id: 'detonate', name: '引爆連段', when: ['open', 'down'], need: { det: true }, prior: 0.65, seq: ['shot', 'power', 'dragon_q'] },
    { id: 'arcQuick', name: '曲射接剎那', when: ['open', 'down'], prior: 0.45, seq: ['arc', 'shot', 'power', 'dragon_q'] },
    { id: 'arcBurst', name: '曲射爆發', when: ['down'], prior: 0.55, risk: 0.2, seq: ['arc', 'arc', 'dragon'] },
    { id: 'tracerArc', name: '誘導曲射一矢', when: ['down'], need: { trick: 1, noTracer: true }, prior: 0.55, risk: 0.3, seq: ['tracer', 'arc', 'shot', 'power', 'dragon'] },
    { id: 'downFull', name: '倒地全力', when: ['down'], prior: 0.65, risk: 0.3, seq: ['shot', 'power', 'volley', 'shot', 'power', 'volley', 'step', 'shot', 'power', 'volley'] },
    { id: 'thousand', name: '龍之千矢', when: ['down'], need: { near: true }, prior: 0.55, risk: 0.5, seq: ['shot', 'power', 'thousand'] },
    { id: 'dragon', name: '龍之一矢', when: ['down'], prior: 0.45, risk: 0.3, seq: ['dragon'] },
  ];
  H4.BOW_DISCERN = { id: 'discern', name: '看破迴避反擊', seq: ['shot', 'power', 'volley'] }; // 看破迴避成功後直接接（不經挑選）
  H4.WEAPON_SPECS.lightxbow.focus = sk('h4_focus_lbg', '集中攻擊彈【射鵰】', '射鵰', ['ranged'], [0, 750], { cd: 6, track: 7, recovery: 0.45 }, // 不蓄力版；驅動依 Boss 狀態改放蓄一 / 二段（lbg_focus1 / 2）
    [shot(0.4, bullet(120, { speed: 1800, r: 10, kb: 90, extra: { focus: true } }))]);
  // 輕弩：mag 彈匣（每種彈各自）；en 速射能量（max、普通模式每秒 regen、普通模式每發命中 hit / 追擊射擊命中 chase、速射每招耗 cost、耗盡強制解除硬直 exitLock、低於 early 考慮提早收手）；
  // band 適正距離（彈飛行距離 [近, 遠] 內全傷害，外面乘 lo）；pref AI 站位；pierce 貫通彈第二段起每段減 fall、最低 min；
  // sp 特殊彈（regen 秒回一發、最多 max）：adh 附著龍彈（life 秒後自爆、need 各階段所需同部位命中數、slash 各階段斬擊次數 / 每下傷害、boom 爆炸、gain 回速射能量）、
  //   wyv 起爆龍彈（life 秒後自爆、n 可爆次數、r 爆炸半徑、trig 被自己的彈打中的判定半徑、dmg、cd 兩次爆炸最短間隔）；focus 集中攻擊彈（max 存量、regen 秒回一發、gain 破傷口回能量）
  H4.LBG = { mag: { n: 6, p: 4, s: 4 },
    en: { max: 100, regen: 4, hit: 1.2, chase: 4, cost: { n: 12, p: 14, s: 14 }, exitLock: 0.8, early: 20, on: 45 },
    band: { n: [60, 480], p: [180, 760], s: [0, 260], lo: 0.7 }, pierce: { fall: 0.15, min: 0.4 },
    pref: { n: [250, 480], p: [320, 620], s: [70, 200] }, // AI 站位（prefRange）依主力彈
    sp: { regen: 100, max: 1,
      adh: { life: 25, need: [0, 10, 25], slash: [6, 12, 18], slashDmg: 12, boom: 120, gain: 35 },
      wyv: { life: 15, n: 3, r: 170, trig: 40, dmg: 110, cd: 0.5 } },
    focus: { max: 3, regen: 35, gain: 20 } };
  // 輕弩連招表：步驟 shot 射擊、chase 追擊射擊、on / off 切到速射 / 普通模式、rapid 速射、rchase 速射追擊、burst 速射墊步射擊（彈匣空自動變墊步裝填）、
  //   reload 裝填（速射模式＝墊步裝填）、step 墊步、slide 滑行、special 特殊彈。做不到的步驟跳過；彈匣空時需要彈的步驟改成裝填。
  // mode：n＝普通模式才能挑、r＝速射模式才能挑；need：en 能量、lowEn 能量低、magLow 彈匣快空、sp 有特殊彈 / spType 特殊彈種類、near 近身（< 350）
  H4.LBG_COMBOS = [
    { id: 'charge', name: '普通模式回能循環', mode: 'n', when: ['idle', 'move', 'open', 'atk'], prior: 0.6, seq: ['shot', 'chase', 'step', 'shot', 'chase'] },
    { id: 'poke', name: '試探射擊', mode: 'n', when: ['idle', 'move', 'atk'], prior: 0.4, risk: -0.3, seq: ['shot', 'shot', 'step'] },
    { id: 'kite', name: '拉開距離', mode: 'n', when: ['atk', 'move'], prior: 0.35, risk: -0.4, seq: ['step', 'slide', 'shot'] },
    { id: 'reload', name: '安全裝填', mode: 'n', when: ['idle', 'open', 'down'], need: { magLow: true }, prior: 0.7, seq: ['reload', 'shot', 'chase'] },
    { id: 'burst', name: '速射爆發', mode: 'n', when: ['open', 'down'], need: { en: 50 }, prior: 0.6, risk: 0.2, seq: ['on', 'rapid', 'rchase'] },
    { id: 'stepLoop', name: '速射墊步循環', mode: 'n', when: ['idle', 'move', 'open', 'atk'], need: { en: 55 }, prior: 0.55, seq: ['on', 'rapid', 'burst', 'burst', 'burst'] },
    { id: 'downFull', name: '倒地全力', mode: 'n', when: ['down'], need: { en: 40 }, prior: 0.65, risk: 0.3, seq: ['on', 'rapid', 'rchase', 'rapid', 'rchase'] },
    { id: 'adh', name: '附著龍彈循環', mode: 'n', when: ['idle', 'move', 'open'], need: { sp: true, spType: 'adh' }, prior: 0.65, seq: ['special', 'shot', 'shot', 'chase', 'shot', 'chase'] },
    { id: 'wyv', name: '起爆龍彈', mode: 'n', when: ['idle', 'open', 'down'], need: { sp: true, spType: 'wyv', near: true }, prior: 0.6, seq: ['special', 'shot', 'shot', 'shot'] },
    { id: 'ride', name: '速射持續輸出', mode: 'r', when: ['idle', 'move', 'open', 'atk', 'down'], prior: 0.6, seq: ['rapid', 'burst', 'rapid', 'burst'] },
    { id: 'rDown', name: '速射追擊爆發', mode: 'r', when: ['open', 'down'], prior: 0.6, risk: 0.2, seq: ['rapid', 'rchase'] },
    { id: 'sreload', name: '墊步裝填', mode: 'r', when: ['idle', 'move', 'open', 'atk'], need: { magLow: true }, prior: 0.6, seq: ['rapid', 'burst', 'burst'] },
    { id: 'exit', name: '提早收手', mode: 'r', when: ['idle', 'move', 'atk'], need: { lowEn: true }, prior: 0.75, risk: -0.4, seq: ['off', 'shot', 'chase'] },
  ];
  H4.HBG = { mag: 6, snipeCd: 25, siegeCd: 14 };
  // 斬擊斧：劍形態每招耗槽、斧攻擊回槽、劍命中累積解放槽、解放後劍傷害倍率與每秒掉槽
  H4.SWITCH = { swordCost: 12, axeGain: 15, wildGain: 30, ampPerHit: 10, ampDmg: 1.25, ampDrain: 2.5, lowAt: 20, morphAt: 55 };
  // 充能斧：劍命中加能量、每 20 能量裝 1 瓶、最多 5 瓶、超解每瓶瓶爆傷害、盾強化秒數 / 防禦承受 / 斧傷害倍率
  H4.CHARGE = { energyPerHit: 10, perPhial: 20, maxPhials: 5, saedPhial: 70, shieldDur: 45, shieldChip: 0.1, shieldDmg: 1.15 };
  // 操蟲棍：精華秒數；紅 = 傷害、白 = 移動、橙 = 減傷
  H4.KINSECT = { dur: 60, order: ['red', 'white', 'orange'] };
  H4.HORN = { range: 600, dur: 45, heal: 0.05, allHeal: 0.03, echoCd: 18 }; // 狩獵笛：演奏範圍、增益秒數、回復旋律 / 全音旋律回復比例、響玉冷卻
  H4.DEMON = { drain: 7, exitAt: 0.25, gaugePerHit: 2.2, archDrain: 2, flurryCost: 30, dmgMul: 1.15 }; // 雙刀：鬼人化每秒耗體力、體力低於此比例自動解除（留翻滾的體力）、每次命中加鬼人槽、鬼人強化每秒掉槽、亂舞耗槽、鬼人化傷害倍率
  // 普攻耗體力：原本 cost 0 的近戰招改耗 收招秒數 × perRec（至少 min）；skip＝獎勵 / 資源型招式維持免費（反擊、砲擊吃彈、龍擊砲吃冷卻）
  H4.BASIC_STA = { perRec: 25, min: 4, skip: ['sns_counter', 'lance_counter', 'gl_shell', 'gl_wf'] };
  H4.STA_REGEN_MUL = 0.6; // 獵人體力回復倍率（獵魂基礎每秒 34 → 約 20）
  H4.GUARD = { chip: 0.25, staPerDmg: 0.35, kbMul: 0.3 }; // 一般防禦：承受傷害比例、每點傷害耗體力、擊退倍率
  H4.CLASH = { dmg: 120, lock: 1.2, win: 0.55, topple: 2.5 }; // 力量對抗：Boss 單擊傷害門檻、對峙時間、基礎勝率、勝利時 Boss 倒地秒數
})(typeof window !== 'undefined' ? window : globalThis);
