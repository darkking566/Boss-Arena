'use strict';
// 狩獵模式（4v1）裝備：AI 配裝（每場依目標 Boss 從自己做過的裝備挑）、裝備效果（武器特性 / 防具技能 / 套裝）、勝利掉落素材、AI 自動製作。
// 資料在 js/data/hunt4/gear.js；裝備存在學習存檔的 hunters[id].gear（BD.H4Brain 的存檔）。不碰 DOM / Canvas。
(function (G) {
  const BD = G.BD, U = BD.U, H4 = BD.HUNT4;
  const OPENS = new Set(['stagger', 'stun', 'knockdown']);
  BD.defineStatus('h4slow', { name: '時之隙', tags: ['debuff'], stacking: 'refresh', modifiers: { speedMul: 0.6 } });

  const gearOf = (save, hid) => { const M = BD.H4Brain.mem(save, hid); return M.gear || (M.gear = { mats: {}, w: {}, a: {}, rec: {}, eq: null }); };
  const aff = (p, a) => { let s = 0; for (const k in a) s += a[k] * (p[k] || 0); return s; };
  const rec = (g, k) => { const r = g.rec[k]; return r && r[0] >= 3 ? r[1] - 0.5 : 0; }; // 穿這件的戰績（學到的評價）
  const elemFit = (T, bid) => (T.el ? (((H4.BOSS_PARTS[bid] || {}).weak || {})[T.el] || 1) - 1 : T.ail ? 0.2 : 0.15);
  const keyBoss = (k) => k.slice(k.indexOf(':') + 1);
  const ROMAN = ['', 'I', 'II', 'III'];
  const itemName = (k, r) => { const [t, bid] = k.split(':'); return `${BD.bossById[bid].name}${H4.SLOTS[t] ? '・' + H4.SLOTS[t] : H4.WEAPON_NAMES[t]} ${ROMAN[r]}`; };

  // AI 配裝：武器挑（等級 + 個性偏好特性 + 打這隻 Boss 的屬性相性 + 戰績）；防具每格挑最好的，三件同 Boss 的套裝更划算就整套
  function choose(g, hd, bid) {
    const p = hd.persona, eq = { w: null, head: null, body: null, legs: null };
    let bw = -Infinity;
    for (const k in g.w) {
      if (!k.startsWith(hd.weapons[0] + ':')) continue;
      const T = H4.BOSS_GEAR[keyBoss(k)], v = 0.5 * g.w[k] + aff(p, H4.WTRAITS[T.wt].aff) + elemFit(T, bid) + rec(g, k);
      if (v > bw) { bw = v; eq.w = k; }
    }
    const piece = (k) => 0.5 * g.a[k] + aff(p, H4.SKILLS[H4.BOSS_GEAR[keyBoss(k)].sk].aff) + rec(g, k);
    let sum = 0;
    for (const s in H4.SLOTS) {
      let bv = -Infinity;
      for (const k in g.a) if (k.startsWith(s + ':') && piece(k) > bv) { bv = piece(k); eq[s] = k; }
      if (eq[s]) sum += bv;
    }
    for (const k in g.a) {
      const b = keyBoss(k), ks = Object.keys(H4.SLOTS).map((s) => s + ':' + b);
      if (!k.startsWith('head:') || !ks.every((x) => g.a[x])) continue;
      const v = ks.reduce((a, x) => a + piece(x), 0) + 1 + 1.5 * aff(p, H4.SETS[H4.BOSS_GEAR[b].set].aff);
      if (v > sum) { sum = v; for (const x of ks) eq[x.split(':')[0]] = x; }
    }
    return eq;
  }
  // 把配裝換算成戰鬥中的效果
  function build(g, eq) {
    const E = { wt: null, atk: 1, mod: null, sharp: 1, sk: {}, set: null };
    if (eq.w) {
      const r = g.w[eq.w], T = H4.BOSS_GEAR[keyBoss(eq.w)], W = H4.WPN, v = W.elv + W.elvPer * r;
      E.wt = T.wt; E.atk = 1 + W.atk * r + (T.el || T.ail ? 0 : W.raw); E.sharp = 1 + W.sharp * r;
      E.mod = T.el ? { el: T.el, elv: v } : T.ail ? { ail: T.ail, sv: v } : {};
    }
    const bs = new Set();
    for (const s in H4.SLOTS) if (eq[s]) { const b = keyBoss(eq[s]), sk = H4.BOSS_GEAR[b].sk; E.sk[sk] = Math.min(3, (E.sk[sk] || 0) + g.a[eq[s]]); bs.add(b); }
    if (bs.size === 1 && Object.keys(H4.SLOTS).every((s) => eq[s])) E.set = H4.BOSS_GEAR[[...bs][0]].set;
    return E;
  }

  // ── 戰鬥內 ──
  function install(w, st) {
    const bid = st.boss.def.id;
    for (const h of st.hunters) {
      const hs = h.h4, hd = H4.HUNTERS.find((x) => x.id === h.def.hunter), g = gearOf(st.save, hd.id), eq = g.eq = choose(g, hd, bid), E = build(g, eq);
      hs.gear = Object.assign(E, { eq, hits: 0, combo: 0, lastHit: -9, ogUntil: 0, bonus: false, ev: 0, perf: 0, undying: false, got: null, made: [] });
      if (E.mod) hs.mods[0] = hs.mod = E.mod;
      if (hs.specs[0].sharp && E.sharp !== 1) { hs.specs[0] = hs.spec = Object.assign({}, hs.spec, { sharp: Math.round(hs.spec.sharp * E.sharp) }); hs.sharp = hs.sharps[0] = hs.spec.sharp; }
      const ev = E.sk.evade, d0 = h.tryDodge;
      if (ev) h.tryDodge = (a) => { const ok = d0(a); if (ok) BD.applyStatus(h, 'iframe', { dur: 0.3 + 0.08 * ev, stacking: 'refresh' }); return ok; };
    }
  }
  const main = (h) => h.h4.wi === 0; // 武器效果只在拿 Boss 武器（主武器）時；防具一直有效
  function atkMul(w, st, h, P, hz) {
    const E = h.h4.gear, b = st.boss, S = E.sk;
    let m = 1;
    if (main(h)) {
      m *= E.atk;
      if (E.wt === 'magma' && (P.wound || P.broken)) m *= 1.15;
      if (E.wt === 'exploit' && OPENS.has(b.state)) m *= 1.2;
      if (E.bonus) { m *= 1.4; E.bonus = false; }
    }
    if (S.offguard && w.time < E.ogUntil) m *= 1 + 0.08 * S.offguard;
    if (S.weakex && (hz >= 0.6 || P.wound)) m *= 1 + 0.06 * S.weakex;
    if (S.combo) m *= 1 + 0.02 * S.combo * E.combo;
    if (S.challenger && b.phase === 2) m *= 1 + 0.08 * S.challenger;
    if (S.adversity) m *= 1 + 0.08 * S.adversity * Math.min(2, st.faints);
    if (E.set === 'berserk' && h.hp < h.maxHp * 0.4) m *= 1.25;
    return m;
  }
  const postureMul = (h) => (main(h) && h.h4.gear.wt === 'siege' ? 1.3 : 1);
  const sharpCost = (h) => (!main(h) ? 1 : h.h4.gear.wt === 'sharp' ? 0.5 : h.h4.gear.wt === 'gorge' ? 2 : 1);
  // 命中後：看破段數、血契、雷神之怒落雷
  function onHit(w, st, h, dealt, orig) {
    const E = h.h4.gear, b = st.boss;
    E.combo = w.time - E.lastHit < 1.2 ? Math.min(5, E.combo + 1) : 0; E.lastHit = w.time;
    if (main(h) && E.wt === 'leech') h.hp = Math.min(h.maxHp, h.hp + dealt * 0.02);
    if (E.set === 'storm' && ++E.hits % 15 === 0) {
      orig(h, b, { dmg: 150, posture: 20, unblockable: true, noPerfect: true, ignoreIframe: true });
      w.fx.text(b.x, b.y - b.r - 40, '落雷！', '#ffe14a', 24); w.fx.ring(b.x, b.y, 10, b.r + 40, 0.3, '#ffe14a', 6);
    }
  }
  // 打破傷口後：連鎖雷（跳到另一個傷口）、暴食（回血）
  function onPop(w, st, h, P, orig) {
    if (!main(h)) return;
    const E = h.h4.gear, b = st.boss;
    if (E.wt === 'gorge') { const n = Math.round(h.maxHp * 0.08); h.hp = Math.min(h.maxHp, h.hp + n); w.fx.text(h.x, h.y - h.r - 14, '暴食 +' + n, '#7dffb0', 18); }
    if (E.wt === 'chain') {
      const Q = st.parts.find((x) => x.wound && x !== P);
      if (!Q) return;
      Q.wound = 0; Q.scarUntil = w.time + H4.WOUND.scar; h.stats.h4.pops++;
      orig(h, b, { dmg: H4.WOUND.popDmg / 2, posture: H4.WOUND.popPosture / 2, unblockable: true, noPerfect: true, ignoreIframe: true });
      const at = BD.H4Combat.partPos(b, Q); w.fx.text(at.x, at.y - 20, '連鎖雷！', '#ffe14a', 22);
    }
  }
  // 受傷倍率：耐震、守護靈光（自己或附近隊友穿著）
  function takenMul(w, h) {
    const st = w.hunt4, E = h.h4 && h.h4.gear;
    if (!st || !E) return 1;
    let m = 1 - 0.06 * (E.sk.guard || 0);
    if (st.hunters.some((x) => x.state !== 'dead' && x.h4.gear.set === 'guardian' && U.dist(x, h) < 400)) m *= 0.9;
    return m;
  }
  function undying(w, h) {
    const E = h.h4 && h.h4.gear;
    if (!E || E.set !== 'undying' || E.undying) return false;
    E.undying = true; h.hp = 1; w.fx.text(h.x, h.y - h.r - 30, '不死之身！', '#ffe27a', 24); w.log(h, '不死之身發動', true);
    return true;
  }
  // 每幀：攻擊守勢 / 燕返的觸發（相殺、完美防禦、彈刀、見切），時之隙（完美閃避）
  function tick(w, st) {
    for (const h of st.hunters) {
      const E = h.h4.gear, s = h.stats, ev = s.h4.offsets + s.h4.pguards + (s.deflects || 0) + s.counters;
      if (ev > E.ev) { E.ev = ev; E.ogUntil = w.time + 8; if (E.wt === 'swallow') E.bonus = true; }
      if (s.perfect > E.perf) { E.perf = s.perfect; if (E.set === 'timegap' && st.boss.state !== 'dead') { BD.applyStatus(st.boss, 'h4slow', { dur: 1.5 }, w); w.fx.text(st.boss.x, st.boss.y - st.boss.r - 34, '時之隙', '#c8b4ff', 20); } }
    }
  }

  // ── 一場結束：掉落、配裝戰績、AI 製作 ──
  function cost(kind, r) { return H4.COST[kind][r]; }
  const afford = (m, c) => Object.keys(c).every((k) => (m[k] || 0) >= c[k]);
  function end(w, st) {
    const save = st.save, b = st.boss, bid = b.def.id, win = w.winner && w.winner.team === 0, rng = st.brng, D = H4.DROP;
    const breaks = st.parts.filter((P) => P.broken).length;
    for (const h of st.hunters) {
      const hd = H4.HUNTERS.find((x) => x.id === h.def.hunter), g = gearOf(save, hd.id), E = h.h4.gear, p = hd.persona;
      const score = (win ? 1 : 0) - 0.2 * st.faintsBy.get(h);
      for (const k of [E.eq.w, E.eq.head, E.eq.body, E.eq.legs]) if (k) { const r = g.rec[k] || (g.rec[k] = [0, 0]); r[0] = Math.min(200, r[0] + 1); r[1] += (score - r[1]) / r[0]; }
      if (!win) continue;
      const got = E.got = { s: D.s + (rng() < D.sExtra ? 1 : 0), p: breaks, g: rng() < D.gBase + D.gPerBreak * breaks ? 1 : 0 }, m = g.mats[bid] || (g.mats[bid] = { s: 0, p: 0, g: 0 });
      for (const k in got) m[k] += got[k];
      // 製作：只做「比這一格現有最好的更想要」的東西（個性偏好的特性 / 技能、等級、湊套裝），可負擔的裡挑最想要的
      const wv = (b2, r) => aff(p, H4.WTRAITS[H4.BOSS_GEAR[b2].wt].aff) + 0.6 * r;
      const av = (b2, r) => { const T = H4.BOSS_GEAR[b2], own = Object.keys(H4.SLOTS).filter((s) => g.a[s + ':' + b2]).length; return aff(p, H4.SKILLS[T.sk].aff) + 0.4 * r + 0.3 * own * (1 + aff(p, H4.SETS[T.set].aff)); };
      const top = (pre, f) => { let v = -Infinity; for (const k in g[pre === 'w' ? 'w' : 'a']) if (k.startsWith(pre === 'w' ? hd.weapons[0] + ':' : pre + ':')) v = Math.max(v, f(keyBoss(k), g[pre === 'w' ? 'w' : 'a'][k])); return v; };
      for (let n = 0; n < H4.CRAFTS_PER_MATCH; n++) {
        let best = null, bv = 0;
        for (const b2 in g.mats) {
          const M = g.mats[b2];
          const wk = hd.weapons[0] + ':' + b2, wr = g.w[wk] || 0;
          if (wr < 3 && afford(M, cost('w', wr + 1))) { const v = wv(b2, wr + 1) - top('w', wv); if (v > bv) { bv = v; best = ['w', wk, wr + 1, M]; } }
          for (const s in H4.SLOTS) {
            const ak = s + ':' + b2, ar = g.a[ak] || 0;
            if (ar < 2 && afford(M, cost('a', ar + 1))) { const v = av(b2, ar + 1) - top(s, av); if (v > bv) { bv = v; best = ['a', ak, ar + 1, M]; } }
          }
        }
        if (!best) break;
        const [kind, k, r, M] = best, c = cost(kind, r);
        for (const x in c) M[x] -= c[x];
        g[kind][k] = r; E.made.push(itemName(k, r));
      }
    }
  }

  // 匯入防呆：只留認得的 Boss / 武器 / 部位，等級夾在範圍內
  function sanitize(o) {
    const g = { mats: {}, w: {}, a: {}, rec: {}, eq: null };
    if (!o || typeof o !== 'object') return g;
    const n = (x, lo, hi) => (typeof x === 'number' && isFinite(x) ? U.clamp(Math.round(x), lo, hi) : lo);
    const ok = (k, pre) => typeof k === 'string' && pre(k.slice(0, k.indexOf(':'))) && H4.BOSS_GEAR[keyBoss(k)];
    for (const b in o.mats || {}) if (H4.BOSS_GEAR[b] && o.mats[b]) g.mats[b] = { s: n(o.mats[b].s, 0, 999), p: n(o.mats[b].p, 0, 999), g: n(o.mats[b].g, 0, 99) };
    for (const k in o.w || {}) if (ok(k, (t) => H4.WEAPON_NAMES[t])) g.w[k] = n(o.w[k], 1, 3);
    for (const k in o.a || {}) if (ok(k, (t) => H4.SLOTS[t])) g.a[k] = n(o.a[k], 1, 2);
    for (const k in o.rec || {}) if ((g.w[k] || g.a[k]) && Array.isArray(o.rec[k])) g.rec[k] = [n(o.rec[k][0], 0, 200), U.clamp(+o.rec[k][1] || 0, -1, 1)];
    return g;
  }

  BD.H4Gear = { choose, build, install, atkMul, postureMul, sharpCost, onHit, onPop, takenMul, undying, tick, end, sanitize, gearOf, itemName };
})(typeof window !== 'undefined' ? window : globalThis);
