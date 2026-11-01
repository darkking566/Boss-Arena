'use strict';
// 主角（獵魂 / 狩獵獵人）的出招動作：每招套一個動作模板 → 依時間算姿勢（武器角度、手伸出、身體前傾 / 下沉 / 騰空、發光、盾）。
// 關鍵：畫面上揮到前方的那一刻＝招式命中時間（hit / proj 的 at）。只在繪圖層，不碰戰鬥；抖動用 sin，不用亂數。
// 沒列在 MOTIONS 的招式回傳 null，由 hero.js 沿用舊的 sw 擺法。設計見 docs/hunt4-motion.md。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, TAU = Math.PI * 2;
  const LEAD = 0.07, FOLLOW = 0.05; // 命中前多久開始揮、命中後甩出多久
  const REST = { a: -0.25, reach: 0, lean: 0, sq: 0, air: 0, glow: 0, shake: 0, shield: 0 };
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
  const KIND = { slash: (i, p) => SLASH(i % 2 ? -p.side : p.side, p.w), chop: (i, p) => CHOP(p.h), thrust: (i, p) => THRUST(p.len || 0.6, p.ang), shove: () => SHOVE() };

  // 模板：回傳關鍵影格 [時間, 姿勢, 這段的緩動]，最後一格固定回到待機
  const T = {
    // 單擊（slash / chop / thrust / shove）；多段命中就左右來回
    hit(H, D, p) {
      const keys = [[0, P({}), 'io']], mk = KIND[p.kind || 'slash'];
      H.forEach((t0, i) => {
        const gap = i ? t0 - H[i - 1] : t0, lead = Math.min(LEAD, gap * 0.5), fol = i < H.length - 1 ? Math.min(FOLLOW, (H[i + 1] - t0) * 0.4) : FOLLOW;
        const [f, m, e] = mk(i, p); strike(keys, t0, lead, fol, f, m, e);
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
    guard(H, D) { return [[0, P({}), 'io'], [0.06, P({ a: -0.7, reach: -0.15, lean: -0.05 }), 'out'], [D - 0.1, P({ a: -0.7, reach: -0.15, lean: -0.05 }), 'lin']]; },
  };
  const air = (keys, amt) => keys.map((k, i) => (i && i < keys.length - 1 ? [k[0], Object.assign({}, k[1], { air: amt }), k[2]] : k)); // 騰空：中間各格放大

  // ── 招式 → 模板（M1：太刀、大劍、片手劍；之後的武器見設計文件 §4）──
  const red = { trail: '#ff8a7a' };
  const MOTIONS = {
    // 太刀
    k_a1: { t: 'hit', side: 1 }, k_a2: { t: 'hit', side: -1 }, k_a3: { t: 'hit', kind: 'thrust', len: 0.7 }, k_a4: { t: 'spin' }, k_a5: { t: 'hit', kind: 'chop' },
    k_s1: Object.assign({ t: 'hit', side: 1, w: 1.3 }, red), k_s2: Object.assign({ t: 'hit', side: -1, w: 1.3 }, red), k_s3: Object.assign({ t: 'hit', kind: 'chop', h: 1.15 }, red),
    k_spin: Object.assign({ t: 'spin', turns: 1 }, red),
    k_mikiri: { t: 'rush', at: 0.45, holdA: -1.4, then: { t: 'hit', side: 1 } },
    w_iai: { t: 'charge', at: 0.5, lv: 1, holdA: 2.4, holdReach: -0.2, then: { t: 'hit', side: -1, w: 1.4 } }, // 刀收在腰側，放出時反手一閃
    k_helm: Object.assign({ t: 'rush', air: 1, then: { t: 'hit', kind: 'chop', h: 0.8 } }, red, { airAll: 1 }),
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
  };

  // 每招的關鍵影格只算一次（依招式版本 v 快取）
  const cache = new WeakMap();
  function keysOf(sk, v) {
    let k = cache.get(v);
    if (k) return k;
    const m = MOTIONS[sk.id], D = v.dur;
    let H = v.actions.filter((a) => a.do === 'hit' || a.do === 'proj').map((a) => a.at);
    if (m.at != null || !H.length) H = [D * (m.at != null ? m.at : 0.45)]; // 沒有攻擊動作的招（見切、居合）：用比例時間當出手點
    k = T[m.t](H, D, m);
    if (m.airAll) k = air(k, m.airAll);
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
    glaive: [0.7, 1.6], lightxbow: [0.1, 0.9], heavyxbow: [0.1, 1.0], bow: [1.3], sns: [0], lance: [0], gunlance: [0] };
  function hands(ctx, m, def, o, r) {
    const d = o.h4 && o.h4.drv, w = def.weapon;
    const xs = w === 'chargeblade' ? (d && d.mode === 'axe' ? [0, 0.5] : [0]) : HANDS[w] || [0];
    ctx.save(); ctx.setTransform(m); ctx.fillStyle = '#d7e6f2'; ctx.strokeStyle = def.color; ctx.lineWidth = 1.5;
    const dot = (x, y) => { ctx.beginPath(); ctx.arc(x, y, r * 0.17, 0, U.TAU); ctx.fill(); ctx.stroke(); };
    if (w === 'db') for (const s of [-1, 1]) dot(r * 0.3, s * r * 0.75);
    else for (const x of xs) dot(x * r, 0);
    ctx.restore();
  }
  R.heroMotion = { pose, trail, hands, MOTIONS, keysOf, LEN };
})(typeof window !== 'undefined' ? window : globalThis);
