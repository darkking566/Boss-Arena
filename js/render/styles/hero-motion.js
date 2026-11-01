'use strict';
// 主角（獵魂 / 狩獵獵人）的出招動作：每招套一個動作模板 → 依時間算姿勢（武器角度、手伸出、身體前傾 / 下沉 / 騰空、發光、盾）。
// 關鍵：畫面上揮到前方的那一刻＝招式命中時間（hit / proj 的 at）。只在繪圖層，不碰戰鬥；抖動用 sin，不用亂數。
// 沒列在 MOTIONS 的招式回傳 null，由 hero.js 沿用舊的 sw 擺法。設計見 docs/hunt4-motion.md。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, TAU = Math.PI * 2;
  const LEAD = 0.07, FOLLOW = 0.05; // 命中前多久開始揮、命中後甩出多久
  const REST = { a: -0.25, reach: 0, lean: 0, sq: 0, air: 0, glow: 0, shake: 0, shield: 0, pull: 0, arrows: 0, aim: 0, brace: 0 }; // pull 拉弦、arrows 搭箭數、aim 瞄準線、brace 架設
  const FIELDS = Object.keys(REST);
  const P = (o) => Object.assign({}, REST, o);
  const EASE = { in: (u) => u * u, out: (u) => 1 - (1 - u) * (1 - u), io: (u) => u * u * (3 - 2 * u), lin: (u) => u };

  // 揮擊三格：起手姿勢（命中前 LEAD）→ 命中瞬間 → 甩出
  function strike(keys, t0, lead, follow, from, mid, to) {
    keys.push([Math.max(0.01, t0 - lead), from, 'out'], [t0, mid, 'in'], [t0 + follow, to, 'out']);
  }
  const SLASH = (side, w) => [P({ a: -side * (w || 1.1), lean: -0.05, reach: -0.1 }), P({ a: 0, lean: 0.15 }), P({ a: side * (w || 1.1), lean: 0.15 })]; // side 1＝由左往右
  const CHOP = (h) => [P({ a: -2.3 * (h || 1), reach: -0.25, lean: -0.1 }), P({ a: -0.25, lean: 0.2 }), P({ a: 0.25, lean: 0.25, sq: 1 })];
  const THRUST = (len, ang) => [P({ a: ang || 0, reach: -0.4, lean: -0.1 }), P({ a: ang || 0, reach: len * 0.8, lean: 0.25 }), P({ a: ang || 0, reach: len, lean: 0.25 })];
  const SHOVE = () => [P({ a: -0.9, shield: 0.6, lean: -0.05 }), P({ a: -0.9, shield: 1.3, lean: 0.25 }), P({ a: -0.9, shield: 1.4, lean: 0.25 })]; // 盾往前推
  const glow = (q, g) => Object.assign({}, q, { glow: g });
  // 每段命中的動作：n＝這是第幾個斬（左右來回用）、prev＝上一段甩出的姿勢（瓶爆等「原地再爆一次」用）
  const KIND = {
    slash: (n, p) => SLASH(n % 2 ? -(p.side || 1) : p.side || 1, p.w), chop: (n, p) => CHOP(p.h), thrust: (n, p) => THRUST(p.len || 0.6, p.ang), shove: () => SHOVE(),
    up: () => [P({ a: 2.0, reach: -0.2, lean: -0.05 }), P({ a: 0, lean: 0.2 }), P({ a: -1.0, lean: 0.15 })], // 上撈：從身後低處往前上方撈起
    back: () => [P({ a: -0.6, lean: 0.05 }), P({ a: 2.4, lean: -0.15 }), P({ a: 2.9, lean: -0.2, sq: 1 })], // 往身後砸
    shot: (n, p) => { const k = p.kick || 1, a = p.ang || 0; return [P({ a }), P({ a, reach: -0.25 * k, lean: -0.12 * k, glow: 1 }), P({ a, reach: -0.15 * k, lean: -0.08 * k, glow: 0.3 })]; }, // 砲擊後座
    jab: () => [P({ reach: 0.45, glow: 0.4, lean: 0.15 }), P({ reach: 0.7, glow: 0.9, lean: 0.2 }), P({ reach: 0.55, glow: 0.5, lean: 0.2 })], // 插住不拔、一下一下灌入
    flash: (n, p, prev) => [prev, glow(prev, 1), glow(prev, 0.2)], // 原地爆一下（瓶爆）
  };

  // 模板：回傳關鍵影格 [時間, 姿勢, 這段的緩動]，最後一格固定回到待機
  const T = {
    // 單擊（slash / chop / thrust / shove）；多段命中就左右來回
    hit(H, D, p) {
      const keys = [[0, P({}), 'io']];
      let prev = P({}), n = 0;
      H.forEach((t0, i) => {
        const gap = i ? t0 - H[i - 1] : t0, lead = Math.min(LEAD, gap * 0.5), fol = i < H.length - 1 ? Math.min(FOLLOW, (H[i + 1] - t0) * 0.4) : FOLLOW;
        const kind = (p.kinds && p.kinds[Math.min(i, p.kinds.length - 1)]) || p.kind || 'slash';
        const [f, m, e] = KIND[kind](n, p, prev); strike(keys, t0, lead, fol, f, m, e); prev = e; if (kind === 'slash') n++;
      });
      return keys;
    },
    // 迴旋：從開始到最後一擊轉 turns 圈（等速），收招接回待機（同角度加整圈，不倒轉）
    spin(H, D, p) {
      const n = p.turns || 1, t0 = Math.max(0.01, H[0] - LEAD), t1 = H[H.length - 1] + FOLLOW, a0 = -1.2;
      return [[0, P({}), 'io'], [t0, P({ a: a0, lean: 0.05 }), 'out'], [t1, P({ a: a0 + TAU * n, lean: 0.15 }), 'lin'], [D, P({ a: REST.a + TAU * n }), 'io']];
    },
    // 蓄力：起手段停在後拉姿勢，發光與抖動隨時間增加，再接放出的模板（從命中前 LEAD 起）
    charge(H, D, p) {
      const lv = p.lv || 1, t0 = Math.max(0.02, H[0] - LEAD), hold = P({ a: p.holdA != null ? p.holdA : -2.3 - 0.15 * lv, reach: p.holdReach != null ? p.holdReach : -0.3, lean: -0.12, glow: 0.15, shake: lv * 0.4 }), full = Math.min(1, 0.25 + lv * 0.25);
      const rel = T[p.then.t](H, D, p.then).filter((k) => k[0] >= t0);
      if (rel[1]) rel[1] = [rel[1][0], Object.assign({}, rel[1][1], { glow: full }), rel[1][2]]; // 放出命中那一刻最亮，之後熄掉
      return [[0, P({}), 'io'], [Math.min(0.15, t0 * 0.4), hold, 'out'], [t0, Object.assign({}, hold, { glow: full, shake: lv * 0.6 }), 'lin']].concat(rel.slice(1));
    },
    // 突進：衝刺段身體大幅前傾、武器平舉在身側，到命中前接放出的模板
    rush(H, D, p) {
      const t0 = Math.max(0.02, H[0] - LEAD), rel = T[p.then.t](H, D, p.then).filter((k) => k[0] >= t0);
      return [[0, P({}), 'io'], [Math.min(0.12, t0 * 0.5), P({ a: p.holdA != null ? p.holdA : 0.7, lean: 0.35, air: p.air || 0 }), 'out']].concat(rel);
    },
    // 防禦：整招舉盾 / 武器擋在前方
    // 非攻擊動作（鬼人化、裝瓶、放獵蟲、裝填、演奏）：擺一個姿勢撐住，sway＝左右晃（演奏）
    item(H, D, p) {
      const q = P(p.pose), keys = [[0, P({}), 'io'], [Math.min(0.1, D * 0.3), q, 'out']], n = p.sway ? 4 : 0;
      for (let k = 1; k <= n; k++) keys.push([0.1 + (D - 0.25) * k / (n + 1), Object.assign({}, q, { a: q.a + (k % 2 ? 1 : -1) * p.sway }), 'io']);
      keys.push([Math.max(0.12, D - 0.12), q, 'io']);
      return keys;
    },
    // 拉弓：起手把弦拉到 pull 深度（搭 arrows 支箭），命中時間放手、回彈後座；aim＝同時畫瞄準線（龍之一矢）
    draw(H, D, p) {
      const t0 = H[0], k = p.kick || 0.4, full = P({ a: 0, pull: p.pull || 1, arrows: p.arrows || 1, lean: -0.08 * (p.pull || 1) - (p.lean || 0), aim: p.aim ? 1 : 0 });
      return [[0, P({ a: 0 }), 'io'], [Math.min(0.08, t0 * 0.3), P({ a: 0, pull: 0.15, arrows: p.arrows || 1, aim: p.aim ? 0.2 : 0 }), 'out'], [Math.max(0.02, t0 - 0.03), full, 'out'],
        [t0, P({ a: 0, glow: 0.5 }), 'in'], [t0 + 0.08, P({ a: 0, reach: -0.15 * k, lean: -0.12 * k - (p.lean || 0) }), 'out']];
    },
    // 瞄準：舉槍對準，瞄準線越來越亮，命中前接放出的模板（狙擊彈）
    aim(H, D, p) {
      const t0 = Math.max(0.05, H[0] - LEAD), rel = T[p.then.t](H, D, p.then).filter((k) => k[0] >= t0);
      return [[0, P({}), 'io'], [Math.min(0.12, t0 * 0.3), P({ a: 0, aim: 0.25, lean: -0.05 }), 'out'], [t0, P({ a: 0, aim: 1, lean: -0.06 }), 'lin']].concat(rel.slice(1));
    },
    guard(H, D) { return [[0, P({}), 'io'], [0.06, P({ a: -0.7, reach: -0.15, lean: -0.05 }), 'out'], [D - 0.1, P({ a: -0.7, reach: -0.15, lean: -0.05 }), 'lin']]; },
  };
  const over = (keys, o) => keys.map((k, i) => (i && i < keys.length - 1 ? [k[0], Object.assign({}, k[1], o), k[2]] : k)); // 整招疊加（騰空放大、架設壓低）：中間各格

  // ── 招式 → 模板（M1 太刀 / 大劍 / 片手劍、M2 其餘近戰；遠程見設計文件 §4）──
  const red = { trail: '#ff8a7a' };
  const MOTIONS = {
    // 太刀
    k_a1: { t: 'hit', side: 1 }, k_a2: { t: 'hit', side: -1 }, k_a3: { t: 'hit', kind: 'thrust', len: 0.7 }, k_a4: { t: 'spin' }, k_a5: { t: 'hit', kind: 'chop' },
    k_s1: Object.assign({ t: 'hit', side: 1, w: 1.3 }, red), k_s2: Object.assign({ t: 'hit', side: -1, w: 1.3 }, red), k_s3: Object.assign({ t: 'hit', kind: 'chop', h: 1.15 }, red),
    k_spin: Object.assign({ t: 'spin', turns: 1 }, red),
    k_mikiri: { t: 'rush', at: 0.45, holdA: -1.4, then: { t: 'hit', side: 1 } },
    w_iai: { t: 'charge', at: 0.5, lv: 1, holdA: 2.4, holdReach: -0.2, then: { t: 'hit', side: -1, w: 1.4 } }, // 刀收在腰側，放出時反手一閃
    k_helm: Object.assign({ t: 'rush', air: 1, then: { t: 'hit', kind: 'chop', h: 0.8 } }, red, { airAll: 1 }),
    k_musou: Object.assign({ t: 'spin', turns: 3 }, red),
    h4_focus_katana: { t: 'charge', lv: 1, holdA: 2.4, holdReach: -0.2, then: { t: 'hit', kind: 'thrust', len: 0.8 } },
    // 大劍
    gs_c1: { t: 'charge', lv: 1, then: { t: 'hit', kind: 'chop' } },
    gs_c2: { t: 'charge', lv: 2, holdA: -2.6, then: { t: 'hit', side: 1, w: 1.5 } },
    gs_true: { t: 'charge', lv: 3, then: { t: 'hit', kind: 'chop', h: 1.1 } },
    gs_wide: { t: 'hit', side: 1, w: 1.7 },
    gs_tackle: { t: 'rush', holdA: -1.3, then: { t: 'hit', kind: 'thrust', len: 0.35, ang: -1.3 } }, // 劍身平擋在身前撞
    h4_focus_gs: { t: 'hit', kind: 'chop', h: 1.1 },
    // 片手劍
    sns_a1: { t: 'hit', kind: 'chop', h: 0.8 }, sns_a2: { t: 'hit', side: 1 }, sns_a3: { t: 'spin' },
    sns_jump: { t: 'hit', kind: 'chop', airAll: 1 },
    sns_bash: { t: 'hit', kind: 'shove' }, sns_guard: { t: 'guard' },
    sns_counter: { t: 'hit', kind: 'thrust', len: 0.7 },
    sns_rush: { t: 'rush', then: { t: 'spin', turns: 2 } },
    h4_focus_sns: { t: 'hit', kind: 'thrust', len: 0.8 },
    // 雙刀（鬼人系殘影紅）
    db_a1: { t: 'hit', side: 1, w: 0.9 }, db_a2: { t: 'hit', side: -1, w: 0.9 }, db_a3: { t: 'spin' },
    db_demon: { t: 'item', pose: { a: -0.7, reach: 0.1, glow: 0.7 } }, // 雙刀在胸前交叉
    db_d1: { t: 'hit', side: 1, w: 0.9, trail: '#ff6a5a' }, db_d2: { t: 'spin', turns: 2, trail: '#ff6a5a' }, db_flurry: { t: 'spin', turns: 3, trail: '#ff6a5a' },
    db_dash: { t: 'rush', trail: '#ff6a5a', then: { t: 'hit', side: 1, w: 0.9 } },
    h4_focus_db: { t: 'rush', then: { t: 'spin' } },
    // 大錘：錘頭拖在身後蓄力
    ham_c1: { t: 'charge', lv: 1, holdA: 2.2, then: { t: 'hit', kind: 'up' } },
    ham_side: { t: 'hit', side: 1, w: 1.3 },
    ham_c2: { t: 'charge', lv: 2, holdA: 2.3, then: { t: 'hit', kind: 'chop' } },
    ham_c3: { t: 'charge', lv: 3, holdA: 2.4, then: { t: 'hit', kind: 'chop', h: 1.2 } },
    ham_spin: { t: 'spin', turns: 2 },
    ham_offset: { t: 'hit', kind: 'up', trail: '#e8f4ff' },
    h4_focus_hammer: { t: 'hit', kind: 'chop', h: 1.1 },
    // 狩獵笛：殘影顏色＝音色（紅 / 藍 / 綠）
    horn_l: { t: 'hit', side: -1, w: 1.2, trail: '#ff6a5a' }, horn_r: { t: 'hit', side: 1, w: 1.2, trail: '#6aa8ff' },
    horn_dash: { t: 'rush', trail: '#ff6a5a', then: { t: 'hit', kind: 'chop' } },
    horn_back: { t: 'hit', kind: 'back', trail: '#6ad48a' },
    horn_play: { t: 'item', pose: { a: -1.6, reach: -0.15, air: 0.06, glow: 0.4 }, sway: 0.45 }, // 笛舉起來左右晃（旋律效果由文字 / 光環表示）
    horn_echo: { t: 'spin', turns: 1.5, trail: '#c8f0ff' }, h4_focus_horn: { t: 'spin' },
    // 長槍：身體幾乎不動，只有槍伸縮
    lance_p1: { t: 'hit', kind: 'thrust', len: 0.8 }, lance_p2: { t: 'hit', kind: 'thrust', len: 0.8, ang: 0.12 }, lance_p3: { t: 'hit', kind: 'thrust', len: 0.8, ang: -0.3 },
    lance_charge: { t: 'rush', holdA: 0, then: { t: 'hit', kind: 'thrust', len: 0.7 } },
    lance_guard: { t: 'guard' }, lance_counter: { t: 'hit', kind: 'thrust', len: 0.9 }, h4_focus_lance: { t: 'hit', kind: 'thrust', len: 0.9 },
    // 銃槍：刺＋砲擊後座
    gl_p1: { t: 'hit', kind: 'thrust', len: 0.7 }, gl_shell: { t: 'hit', kind: 'shot' },
    gl_lunge: { t: 'rush', holdA: 0, then: { t: 'hit', kind: 'thrust', len: 0.7 } },
    gl_p2: { t: 'hit', kind: 'up' }, gl_slam: { t: 'hit', kind: 'chop' },
    gl_burst: { t: 'hit', kinds: ['chop', 'flash'] }, // 砸地後槍口連爆
    gl_wf: { t: 'charge', lv: 3, holdA: 0, holdReach: -0.1, then: { t: 'hit', kind: 'shot', kick: 2.2 } },
    gl_reload: { t: 'item', pose: { a: 0.9, reach: -0.25 } }, gl_guard: { t: 'guard' },
    h4_focus_gunlance: { t: 'hit', kinds: ['thrust', 'shot'], len: 0.6 },
    // 斬擊斧：斧重而寬、劍快；變形招在命中瞬間換形態
    sa_axe1: { t: 'hit', kind: 'chop' }, sa_lunge: { t: 'rush', then: { t: 'hit', kind: 'chop' } }, sa_axe2: { t: 'hit', side: 1, w: 1.3 },
    sa_wild: { t: 'hit', w: 1.4, side: 1 },
    sa_morph: { t: 'hit', side: 1, w: 1.3, morph: 'axe', trail: '#c8b8ff' }, sa_morph_axe: { t: 'hit', kind: 'chop', morph: 'sword' },
    sa_sw1: { t: 'hit', kind: 'chop', h: 0.9 }, sa_sw2: { t: 'hit', side: -1 }, sa_sw3: { t: 'hit', side: 1 },
    sa_zsd: { t: 'hit', kinds: ['jab', 'jab', 'jab', 'jab', 'jab', 'jab', 'chop'], trail: '#ff7aff' }, // 插住、一下一下灌入，最後爆開
    h4_focus_switchaxe: { t: 'hit', kind: 'chop', h: 1.1 },
    // 充能斧：劍盾 → 斧（解放斬命中瞬間變斧），瓶爆在原地再閃一下
    cb_s1: { t: 'rush', holdA: 0.3, then: { t: 'hit', kind: 'thrust', len: 0.6 } }, cb_s2: { t: 'hit', kind: 'chop', h: 0.9 }, cb_s3: { t: 'spin' },
    cb_charge: { t: 'item', pose: { a: -1.5, reach: -0.3, glow: 0.6 } }, cb_guard: { t: 'guard' }, // 劍插回盾裡裝瓶
    cb_ed1: { t: 'hit', kinds: ['slash', 'flash'], side: 1, w: 1.3, morph: 'sword' },
    cb_ed2: { t: 'hit', kinds: ['slash', 'flash', 'slash', 'flash'], side: -1, w: 1.3, morph: 'sword' },
    cb_aed: { t: 'hit', kinds: ['chop', 'flash'], h: 1.2 },
    cb_saed: { t: 'charge', lv: 2, then: { t: 'hit', kind: 'chop', h: 1.2 } },
    h4_focus_chargeblade: { t: 'hit', kinds: ['chop', 'flash'] },
    // 操蟲棍：輕盈、跳躍系整招騰空
    ig_a1: { t: 'hit', side: 1 }, ig_a2: { t: 'hit', kind: 'thrust', len: 0.6 }, ig_a3: { t: 'spin' },
    ig_red: { t: 'hit', side: 1, w: 1.2, trail: '#ff6a5a' },
    ig_vault: { t: 'rush', air: 1, airAll: 1, then: { t: 'hit', kind: 'chop', h: 0.8 } },
    ig_air: { t: 'spin', airAll: 1 }, ig_kinsect: { t: 'item', pose: { a: -0.3, reach: 0.35 } },
    ig_dive: { t: 'rush', air: 1, airAll: 1, then: { t: 'hit', kind: 'thrust', len: 0.8 } },
    h4_focus_glaive: { t: 'spin', airAll: 0.5 },
    // 弓：拉弦越來越深、搭箭越來越多（長按蓄力拉得最滿）；剛射 / 剛連射 / 千矢一次搭多支；墊步側跳、飛燕射擊騰空拉弓；曲射後仰朝天；誘導箭 / 龍之一矢 / 集中射擊帶瞄準線
    bow_s1: { t: 'draw', pull: 0.45, arrows: 1 }, bow_s2: { t: 'draw', pull: 0.7, arrows: 2 }, bow_s3: { t: 'draw', pull: 1, arrows: 3 },
    bow_c2: { t: 'draw', pull: 0.9, arrows: 2 }, bow_c3: { t: 'draw', pull: 1.2, arrows: 3, kick: 0.5 },
    bow_quick: { t: 'draw', pull: 0.3, arrows: 3, kick: 0.3 },
    bow_p1: { t: 'draw', pull: 1, arrows: 4, kick: 0.6 }, bow_p2: { t: 'draw', pull: 1, arrows: 5, kick: 0.6 }, bow_p3: { t: 'draw', pull: 1.05, arrows: 5, kick: 0.7 },
    bow_v1: { t: 'draw', pull: 1.1, arrows: 5, kick: 0.8 }, bow_v2: { t: 'draw', pull: 1.1, arrows: 6, kick: 0.8 }, bow_v3: { t: 'draw', pull: 1.15, arrows: 6, kick: 0.9 },
    bow_step: { t: 'item', pose: { a: 0.2, lean: -0.15, air: 0.04 } },
    bow_sw1: { t: 'rush', holdA: 0, air: 1, airAll: 1, then: { t: 'draw', pull: 0.9, arrows: 3 } }, bow_sw2: { t: 'rush', holdA: 0, air: 1, airAll: 1, then: { t: 'draw', pull: 1, arrows: 4 } },
    bow_sw3: { t: 'rush', holdA: 0, air: 1, airAll: 1, then: { t: 'draw', pull: 1.1, arrows: 5 } },
    bow_tracer: { t: 'draw', pull: 0.8, arrows: 1, aim: true },
    bow_load: { t: 'item', pose: { a: 1.1, reach: -0.3 } }, // 弓垂到身側裝瓶
    bow_arc: { t: 'draw', pull: 1, arrows: 3, lean: 0.25, kick: 0.5 },
    bow_dragon: { t: 'draw', pull: 1.3, arrows: 1, aim: true, lean: 0.15, kick: 2 },
    bow_dragon_q: { t: 'draw', pull: 1.15, arrows: 1, aim: true, lean: 0.08, kick: 1.4 }, bow_focus_dragon: { t: 'draw', pull: 1.2, arrows: 1, aim: true, lean: 0.1, kick: 1.6 },
    bow_thousand: { t: 'draw', pull: 1.2, arrows: 7, kick: 1.6 },
    h4_focus_bow: { t: 'draw', pull: 1, arrows: 3, aim: true, kick: 0.6 },
    // 輕弩：小後座（貫通 / 散彈大一點）；速射逐發小抖、速射追擊最後一發大後座；墊步射擊 / 墊步裝填側滑；集中攻擊彈帶瞄準線（招式由下面依彈種生成）
    lbg_mode: { t: 'item', pose: { a: 0.4, reach: 0.1 } }, lbg_sreload: { t: 'item', pose: { a: 0.9, reach: -0.25, lean: -0.15 } },
    lbg_step: { t: 'item', pose: { a: 0.2, lean: -0.15, air: 0.04 } }, lbg_slide: { t: 'item', pose: { a: 0.3, lean: -0.3 } },
    lbg_adh: { t: 'hit', kind: 'shot', kick: 0.9 }, lbg_wyv: { t: 'item', pose: { a: 1.2, reach: -0.1, lean: 0.25 } },
    h4_focus_lbg: { t: 'aim', then: { t: 'hit', kind: 'shot', kick: 1 } },
    lbg_focus1: { t: 'aim', then: { t: 'hit', kind: 'shot', kick: 1.3 } }, lbg_focus2: { t: 'aim', then: { t: 'hit', kind: 'shot', kick: 1.7 } },
    // 重弩：大後座；狙擊先畫瞄準線；架設壓低身體、展開腳架
    hbg_n: { t: 'hit', kind: 'shot', kick: 1.3 },
    hbg_snipe: { t: 'aim', then: { t: 'hit', kind: 'shot', kick: 2.2 } },
    hbg_siege: { t: 'hit', kind: 'shot', kick: 0.35, hold: { brace: 1, sq: 0.5 } },
    hbg_reload: { t: 'item', pose: { a: 0.9, reach: -0.3 } },
  };
  for (const [am, k] of [['n', 0.5], ['p', 0.8], ['s', 0.9]]) Object.assign(MOTIONS, {
    ['lbg_shot_' + am]: { t: 'hit', kind: 'shot', kick: k }, ['lbg_chase_' + am]: { t: 'hit', kind: 'shot', kick: k, hold: { sq: 0.3 } },
    ['lbg_rapid_' + am]: { t: 'hit', kind: 'shot', kick: k * 0.6 }, ['lbg_rchase_' + am]: { t: 'hit', kind: 'shot', kick: k * 0.8, hold: { sq: 0.4 } },
    ['lbg_burst_' + am]: { t: 'hit', kind: 'shot', kick: k * 0.5, hold: { lean: -0.15 } }, ['lbg_reload_' + am]: { t: 'item', pose: { a: 0.9, reach: -0.25 } },
  });

  // 每招的關鍵影格只算一次（依招式版本 v 快取）
  const cache = new WeakMap();
  function keysOf(sk, v) {
    let k = cache.get(v);
    if (k) return k;
    const m = MOTIONS[sk.id], D = v.dur;
    let H = v.actions.filter((a) => a.do === 'hit' || a.do === 'proj').map((a) => a.at);
    if (m.at != null || !H.length) H = [D * (m.at != null ? m.at : 0.45)]; // 沒有攻擊動作的招（見切、居合）：用比例時間當出手點
    k = T[m.t](H, D, m);
    if (m.airAll) k = over(k, { air: m.airAll });
    if (m.hold) k = over(k, m.hold);
    k.H0 = H[0]; // 變形武器：第一擊前畫舊形態
    const last = k[k.length - 1];
    if (last[0] < D - 1e-6) k.push([D, P({ a: REST.a + TAU * Math.round((last[1].a - REST.a) / TAU) }), 'io']); // 收招回待機（轉過整圈的接同角度，不倒轉）
    cache.set(v, k);
    return k;
  }
  function poseAt(keys, t) {
    let i = 1;
    while (i < keys.length - 1 && keys[i][0] <= t) i++;
    const [ta, pa] = keys[i - 1], [tb, pb, e] = keys[i];
    const u = tb > ta ? EASE[e || 'io'](U.clamp((t - ta) / (tb - ta), 0, 1)) : 1, o = {};
    for (const f of FIELDS) o[f] = pa[f] + (pb[f] - pa[f]) * u;
    return o;
  }
  // 目前（或 dt 秒前）的姿勢；不在出招或招式沒列表 → null
  function pose(o, dt) {
    const i = o.inst;
    if (!i || o.state !== 'skill' || !MOTIONS[i.skill.id]) return null;
    const p = poseAt(keysOf(i.skill, i.v), Math.max(0, i.t - (dt || 0)));
    if (p.shake) p.a += Math.sin(i.t * 55) * 0.035 * p.shake;
    const m = MOTIONS[i.skill.id];
    if (m.morph && i.t < keysOf(i.skill, i.v).H0) p.form = m.morph; // 驅動在招式開始就切形態；畫面等揮到命中才換
    return p;
  }

  // 武器長度（半徑倍數）：殘影畫在刀尖
  const LEN = { katana: 2.2, gs: 2.7, greatsword: 2.6, sns: 1.5, db: 1.4, hammer: 2.3, horn: 2.4, lance: 2.8, gunlance: 2.6, switchaxe: 2.3, chargeblade: 2.3, glaive: 2.4, bow: 1.3, lightxbow: 1.4, heavyxbow: 1.7 };
  const WIDE = { gs: 11, greatsword: 11, hammer: 10, switchaxe: 9, chargeblade: 9, katana: 5, db: 3, sns: 5 };
  const GRIP = [0.2, 0.55]; // 握點（身體座標，半徑倍數）：與 hero.js 一致
  // 殘影：取前 0.064 秒內幾個時間點的刀尖連成淡出的帶子（在已套用前傾 / 騰空的身體座標）
  function trail(ctx, o, r, weapon) {
    const m = MOTIONS[o.inst.skill.id], L = (LEN[weapon] || 2) * r, pts = [];
    for (let k = 0; k <= 8; k++) {
      const p = pose(o, k * 0.008);
      pts.push([GRIP[0] * r + p.reach * r + Math.cos(p.a) * L * 0.92, GRIP[1] * r + Math.sin(p.a) * L * 0.92]);
    }
    if (Math.hypot(pts[0][0] - pts[8][0], pts[0][1] - pts[8][1]) < r * 0.5) return; // 沒在快速揮動
    const col = m.trail || '#ffffff', w = WIDE[weapon] || 6;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.globalAlpha = 0.09;
    for (let k = 8; k > 0; k--) { // 疊畫越來越短的折線：越靠近刀尖疊越多層越亮，尾端自然淡出、不會一顆一顆
      ctx.lineWidth = w * (0.5 + 0.5 * (1 - k / 9)); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let j = 1; j <= k; j++) ctx.lineTo(pts[j][0], pts[j][1]);
      ctx.stroke();
    }
    ctx.restore();
  }
  // 手：畫在武器座標（hero.js 存下的變換）上；雙手武器第二隻手握在柄上
  const HANDS = { katana: [0, 0.32], gs: [0, 0.5], greatsword: [0, 0.5], hammer: [0, 0.55], horn: [0, 0.55], switchaxe: [0, 0.5], greataxe: [0, 0.5], staff: [0, 0.5],
    glaive: [0, 0.6], lightxbow: [0.1, 0.9], heavyxbow: [0.1, 1.0], bow: [1.3], sns: [0], lance: [0], gunlance: [0] };
  function hands(ctx, m, def, o, r) {
    const d = o.h4 && o.h4.drv, w = def.weapon;
    const xs = w === 'chargeblade' ? (d && d.mode === 'axe' ? [0, 0.5] : [0]) : HANDS[w] || [0];
    ctx.save(); ctx.setTransform(m); ctx.fillStyle = '#d7e6f2'; ctx.strokeStyle = def.color; ctx.lineWidth = 1.5;
    const dot = (x, y) => { ctx.beginPath(); ctx.arc(x, y, r * 0.17, 0, U.TAU); ctx.fill(); ctx.stroke(); };
    if (w === 'db') for (const s of [-1, 1]) dot(r * 0.3, s * r * 0.75);
    else for (const x of xs) dot(x * r, 0);
    const p = w === 'bow' && pose(o);
    if (p && p.pull > 0.05) dot(r * (0.65 - p.pull * 0.85), 0); // 拉弦的手
    ctx.restore();
  }
  R.heroMotion = { pose, trail, hands, MOTIONS, keysOf, LEN };
})(typeof window !== 'undefined' ? window : globalThis);
