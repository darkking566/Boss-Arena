'use strict';
// 狩獵模式（4v1）裝備：AI 配裝（每場依目標 Boss 從自己做過的裝備挑）、裝備效果（武器特性 / 防具技能 / 套裝）、勝利掉落素材、AI 自動製作。
// 資料在 js/data/hunt4/gear.js、decos.js（裝飾珠）；裝備存在學習存檔的 hunters[id].gear（BD.H4Brain 的存檔）。不碰 DOM / Canvas。
(function (G) {
  const BD = G.BD, U = BD.U, H4 = BD.HUNT4;
  const OPENS = new Set(['stagger', 'stun', 'knockdown']);
  BD.defineStatus('h4slow', { name: '時之隙', tags: ['debuff'], stacking: 'refresh', modifiers: { speedMul: 0.6 } });

  const gearOf = (save, hid) => { const M = BD.H4Brain.mem(save, hid), g = M.gear || (M.gear = { mats: {}, w: {}, a: {}, rec: {}, deco: {}, eq: null }); g.deco = g.deco || {}; return g; };
  const aff = (p, a) => { let s = 0; for (const k in a) s += a[k] * (p[k] || 0); return s; };
  const rec = (g, k) => { const r = g.rec[k]; return r && r[0] >= 3 ? r[1] - 0.5 : 0; }; // 穿這件的戰績（學到的評價）
  const elemFit = (T, bid) => (T.el ? (((H4.BOSS_PARTS[bid] || {}).weak || {})[T.el] || 1) - 1 : T.ail ? 0.2 : 0.15);
  const keyBoss = (k) => k.slice(k.indexOf(':') + 1);
  const ROMAN = ['', 'I', 'II', 'III'];
  const armed = (h) => { const hd = H4.HUNTERS.find((x) => x.id === h.def.hunter); return { id: hd.id, persona: hd.persona, mod: hd.mod, weapons: h.h4.defs[0].h4weapons || hd.weapons }; }; // 這場實際帶的主武器
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
    socket(g, hd, eq);
    return eq;
  }
  // 鑲珠：孔由大到小，每孔挑「還能加到的等級 × 個性偏好」最高、而且有庫存的珠子；對這把武器 / 屬性沒用的技能不算分
  function socket(g, hd, eq) {
    const p = hd.persona, wpn = hd.weapons[0], T = eq.w ? H4.BOSS_GEAR[keyBoss(eq.w)] : null, mod = T ? { el: T.el, ail: T.ail } : hd.mod || {};
    const have = {}, left = Object.assign({}, g.deco), slots = H4.DECO_SLOTS.w[eq.w ? g.w[eq.w] : 0].map((n) => ['w', n]);
    for (const s in H4.SLOTS) if (eq[s]) { const sk = H4.BOSS_GEAR[keyBoss(eq[s])].sk; have[sk] = (have[sk] || 0) + g.a[eq[s]]; for (const n of H4.DECO_SLOTS.a[g.a[eq[s]]]) slots.push(['a', n]); }
    const useful = (S) => { const x = S.fx || {}; return S.pw && (!x.wp || x.wp.includes(wpn)) && (!x.on || x.on === '*' || x.on === (x.el ? mod.el : mod.ail)); };
    const val = (d) => d.skills.reduce((a, [k, l]) => { const S = H4.SKILLS[k]; return a + (useful(S) ? Math.max(0, Math.min(l, S.max - (have[k] || 0))) * S.pw * (0.3 + aff(p, S.aff)) : 0); }, 0);
    eq.deco = [];
    for (const [kind, n] of slots.sort((x, y) => y[1] - x[1])) {
      let best = null, bv = 0;
      for (const id in left) { const d = H4.DECOS[id]; if (left[id] > 0 && d.kind === kind && d.slot <= n) { const v = val(d); if (v > bv) { bv = v; best = d; } } }
      if (!best) continue;
      left[best.name]--; eq.deco.push(best.name);
      for (const [k, l] of best.skills) have[k] = (have[k] || 0) + l;
    }
  }
  // 把配裝換算成戰鬥中的效果
  function build(g, eq) {
    const E = { wt: null, atk: 1, mod: null, sharp: 1, sk: {}, wsk: {}, set: null };
    if (eq.w) {
      const r = g.w[eq.w], T = H4.BOSS_GEAR[keyBoss(eq.w)], W = H4.WPN, v = W.elv + W.elvPer * r;
      E.wt = T.wt; E.atk = 1 + W.atk * r + (T.el || T.ail ? 0 : W.raw); E.sharp = 1 + W.sharp * r;
      E.mod = T.el ? { el: T.el, elv: v } : T.ail ? { ail: T.ail, sv: v } : {};
    }
    const bs = new Set();
    for (const s in H4.SLOTS) if (eq[s]) { const b = keyBoss(eq[s]), sk = H4.BOSS_GEAR[b].sk; E.sk[sk] = (E.sk[sk] || 0) + g.a[eq[s]]; bs.add(b); }
    if (bs.size === 1 && Object.keys(H4.SLOTS).every((s) => eq[s])) E.set = H4.BOSS_GEAR[[...bs][0]].set;
    for (const id of eq.deco || []) { const d = H4.DECOS[id]; for (const [k, l] of d.skills) { const o = d.kind === 'w' ? E.wsk : E.sk; o[k] = (o[k] || 0) + l; } }
    // 技能等級：L0 = 拿副武器時（只有防具），L1 = 拿主武器（再加武器珠）；都夾在技能上限
    const cap = (o) => { for (const k in o) o[k] = Math.min(H4.SKILLS[k].max, o[k]); return o; };
    E.L0 = cap(Object.assign({}, E.sk)); E.L1 = Object.assign({}, E.sk);
    for (const k in E.wsk) E.L1[k] = (E.L1[k] || 0) + E.wsk[k];
    cap(E.L1);
    return E;
  }

  // ── 戰鬥內 ──
  const live = (E, eq) => Object.assign(E, { eq, hits: 0, combo: 0, lastHit: -9, ogUntil: 0, struckUntil: 0, rushUntil: 0, freeUntil: 0, aff: 0, whets: 0, used: 0, bonus: false, ev: 0, perf: 0, undying: false, got: null, gem: null, made: [] });
  const blank = () => live(build({ w: {}, a: {} }, {}), {}); // 沒有裝備（獵魂代理）
  function install(w, st) {
    const bid = st.boss.def.id;
    for (const h of st.hunters) {
      const hs = h.h4, hd = armed(h), g = gearOf(st.save, hd.id), eq = g.eq = choose(g, hd, bid), E = build(g, eq);
      hs.gear = live(E, eq);
      if (E.mod) hs.mods[0] = hs.mod = E.mod;
      E.sharp += 0.1 * (E.L1.handi || 0); // 匠
      if (hs.specs[0].sharp && E.sharp !== 1) { hs.specs[0] = hs.spec = Object.assign({}, hs.spec, { sharp: Math.round(hs.spec.sharp * E.sharp) }); hs.sharp = hs.sharps[0] = hs.spec.sharp; }
      hs.items.flash += fx(h, 'flash'); hs.items.dust += fx(h, 'dust');
      const ev = E.L0.evade, d0 = h.tryDodge;
      if (ev) h.tryDodge = (a) => { const ok = d0(a); if (ok) BD.applyStatus(h, 'iframe', { dur: 0.3 + 0.08 * ev, stacking: 'refresh' }); return ok; };
    }
  }
  const main = (h) => h.h4.wi === 0; // 武器效果只在拿 Boss 武器（主武器）時；防具一直有效
  const lv = (h) => (main(h) ? h.h4.gear.L1 : h.h4.gear.L0);
  // 條件型技能
  const COND = {
    og: (w, st, h) => w.time < h.h4.gear.ogUntil, struck: (w, st, h) => w.time < h.h4.gear.struckUntil, rush: (w, st, h) => w.time < h.h4.gear.rushUntil,
    first: (w, st, h) => w.time - h.h4.gear.lastHit > 2.5, weak: (w, st, h, P, hz) => hz >= 0.6 || !!P.wound, p2: (w, st) => st.boss.phase === 2,
    ailing: (w, st) => st.poisonT > 0 || st.asleep || st.boss.state === 'stun', lowhp: (w, st, h) => h.hp < h.maxHp * 0.35, hurt: (w, st, h) => h.hp < h.maxHp * 0.9,
    fullhp: (w, st, h) => h.hp >= h.maxHp * 0.98, stam: (w, st, h) => h.sta >= h.maxSta * 0.95, latent: (w) => w.time % 80 >= 50, // 力量解放：每 80 秒有 30 秒發動
  };
  // 技能效果加總：f = fx 欄位；ok(條件) 沒給 = 有條件的不算；on = 屬性 / 異常種類
  function fx(h, f, ok, on) {
    const L = lv(h), wp = h.def.weapon; let s = 0;
    for (const k in L) { const x = H4.SKILLS[k].fx; if (x && x[f] && (!x.wp || x.wp.includes(wp)) && (!x.if || (ok && ok(x.if))) && (!x.on || x.on === '*' || x.on === on)) s += x[f] * L[k]; }
    return s;
  }
  const mul = (h, f) => 1 + fx(h, f);
  const cut = (h, f, cap) => 1 - Math.min(cap, fx(h, f));
  const buffT = (h, t) => t * mul(h, 'buff'); // 強化持續
  function atkMul(w, st, h, P, hz) {
    const E = h.h4.gear, b = st.boss, S = lv(h), ok = (c) => COND[c](w, st, h, P, hz);
    let m = 1;
    if (main(h)) {
      m *= E.atk;
      if (E.wt === 'magma' && (P.wound || P.broken)) m *= 1.15;
      if (E.wt === 'exploit' && OPENS.has(b.state)) m *= 1.2;
      if (E.bonus) { m *= 1.4; E.bonus = false; }
    }
    m *= 1 + fx(h, 'atk', ok);
    if (S.combo) m *= 1 + 0.02 * S.combo * E.combo;
    if (S.adversity) m *= 1 + 0.08 * S.adversity * Math.min(2, st.faints);
    if (E.set === 'berserk' && h.hp < h.maxHp * 0.4) m *= 1.25;
    // shortcut: 會心以期望值計（不擲骰、不顯示會心字樣），要有爆擊演出時改用 w.rng 擲
    const a = E.aff = U.clamp(fx(h, 'aff', ok), -1, 1);
    return m * (1 + a * (a > 0 ? 0.25 + fx(h, 'cd') : 0.25));
  }
  // 屬性 / 異常值倍率（atkMul 之後呼叫，用它算好的會心率）
  const elMul = (h, el) => 1 + fx(h, 'el', null, el) + fx(h, 'elc') * Math.max(0, h.h4.gear.aff);
  const svMul = (h, ail) => 1 + fx(h, 'ail', null, ail) + fx(h, 'ailc') * Math.max(0, h.h4.gear.aff);
  const coats = (h) => { const L = lv(h), out = []; if (h.def.weapon === 'bow') for (const k in L) { const x = H4.SKILLS[k].fx; if (x && x.coat) out.push(x.coat); } return out; }; // 弓的瓶追加
  const postureMul = (h) => (main(h) && h.h4.gear.wt === 'siege' ? 1.3 : 1) * mul(h, 'post');
  function sharpCost(h) {
    const E = h.h4.gear;
    if (h.world.time < E.freeUntil) return 0; // 剛刃研磨
    const c = !main(h) ? 1 : E.wt === 'sharp' ? 0.5 : E.wt === 'gorge' ? 2 : 1;
    return c * cut(h, 'keep', 0.9) * (lv(h).master ? 1 - Math.max(0, E.aff) : 1); // 利刃、達人藝（會心時不耗）
  }
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
    E.struckUntil = w.time + buffT(h, 10); // 逆襲 / 因禍得福：被打後 10 秒
    let m = cut(h, 'taken', 0.6);
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
  function tick(w, st, dt) {
    for (const h of st.hunters) {
      const E = h.h4.gear, s = h.stats, ev = s.h4.offsets + s.h4.pguards + (s.deflects || 0) + s.counters;
      if (ev > E.ev) { E.ev = ev; E.ogUntil = w.time + buffT(h, 8); if (E.wt === 'swallow') E.bonus = true; }
      if (s.h4.whets > E.whets) { E.whets = s.h4.whets; E.freeUntil = w.time + fx(h, 'free'); }
      if (h.hunt.used > E.used) { // 喝藥：體力回復量提升多回、速食縮短硬直
        E.used = h.hunt.used; h.hp = Math.min(h.maxHp, h.hp + h.maxHp * fx(h, 'heal'));
        if (h.state === 'recover') h.stateDur *= cut(h, 'quick', 0.6);
      }
      if (h.state !== 'dead') {
        if (h.hp < h.maxHp) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * fx(h, 'regen') * dt);
        h.sta = Math.min(h.maxSta, h.sta + h.maxSta * fx(h, 'sta') * dt);
        const r = fx(h, 'res'); // 異常耐性：身上的負面狀態倒數變快
        if (r) for (const x of h.statuses || []) if (x.def.tags && x.def.tags.includes('debuff') && isFinite(x.rem)) x.rem -= dt * r;
      }
      if (s.perfect > E.perf) { E.perf = s.perfect; E.rushUntil = w.time + buffT(h, 8); if (E.set === 'timegap' && st.boss.state !== 'dead') { BD.applyStatus(st.boss, 'h4slow', { dur: 1.5 }, w); w.fx.text(st.boss.x, st.boss.y - st.boss.r - 34, '時之隙', '#c8b4ff', 20); } }
    }
  }

  // ── 一場結束：掉落、配裝戰績、AI 製作 ──
  function cost(kind, r) { return H4.COST[kind][r]; }
  const afford = (m, c) => Object.keys(c).every((k) => (m[k] || 0) >= c[k]);
  function end(w, st) {
    const save = st.save, b = st.boss, bid = b.def.id, win = w.winner && w.winner.team === 0, rng = st.brng, D = H4.DROP;
    const breaks = st.parts.filter((P) => P.broken).length;
    for (const h of st.hunters) {
      const hd = armed(h), g = gearOf(save, hd.id), E = h.h4.gear, p = hd.persona;
      const score = (win ? 1 : 0) - 0.2 * st.faintsBy.get(h);
      for (const k of [E.eq.w, E.eq.head, E.eq.body, E.eq.legs]) if (k) { const r = g.rec[k] || (g.rec[k] = [0, 0]); r[0] = Math.min(200, r[0] + 1); r[1] += (score - r[1]) / r[0]; }
      if (!win) continue;
      const got = E.got = { s: D.s + (rng() < D.sExtra ? 1 : 0), p: breaks, g: rng() < D.gBase + D.gPerBreak * breaks ? 1 : 0 }, m = g.mats[bid] || (g.mats[bid] = { s: 0, p: 0, g: 0 });
      for (const k in got) m[k] += got[k];
      const gem = rollDeco(rng, b.def.stars || 3, breaks); if (gem) { g.deco[gem] = (g.deco[gem] || 0) + 1; E.gem = gem; }
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

  // 珠子掉落：先擲有沒有，再依 Boss 星數的權重抽稀有度，同稀有度內平均
  const DECO_TIERS = [1, 2, 3, 4].map((t) => Object.keys(H4.DECOS).filter((k) => H4.DECOS[k].tier === t));
  function rollDeco(rng, stars, breaks) {
    const D = H4.DECO_DROP;
    if (rng() >= Math.min(D.max, D.base + D.perBreak * breaks)) return null;
    const ws = D.w(stars); let r = rng() * ws.reduce((a, x) => a + x, 0), t = 0;
    while (t < 3 && r >= ws[t]) r -= ws[t++];
    const L = DECO_TIERS[t]; return L[Math.floor(rng() * L.length)];
  }
  const skillText = (L) => Object.keys(L).map((k) => H4.SKILLS[k].name + L[k]).join('、');

  // 匯入防呆：只留認得的 Boss / 武器 / 部位，等級夾在範圍內
  function sanitize(o) {
    const g = { mats: {}, w: {}, a: {}, rec: {}, deco: {}, eq: null };
    if (!o || typeof o !== 'object') return g;
    const n = (x, lo, hi) => (typeof x === 'number' && isFinite(x) ? U.clamp(Math.round(x), lo, hi) : lo);
    const ok = (k, pre) => typeof k === 'string' && pre(k.slice(0, k.indexOf(':'))) && H4.BOSS_GEAR[keyBoss(k)];
    for (const b in o.mats || {}) if (H4.BOSS_GEAR[b] && o.mats[b]) g.mats[b] = { s: n(o.mats[b].s, 0, 999), p: n(o.mats[b].p, 0, 999), g: n(o.mats[b].g, 0, 99) };
    for (const k in o.w || {}) if (ok(k, (t) => H4.WEAPON_NAMES[t])) g.w[k] = n(o.w[k], 1, 3);
    for (const k in o.a || {}) if (ok(k, (t) => H4.SLOTS[t])) g.a[k] = n(o.a[k], 1, 2);
    for (const k in o.deco || {}) if (H4.DECOS[k]) { const c = n(o.deco[k], 0, 99); if (c) g.deco[k] = c; }
    for (const k in o.rec || {}) if ((g.w[k] || g.a[k]) && Array.isArray(o.rec[k])) g.rec[k] = [n(o.rec[k][0], 0, 200), U.clamp(+o.rec[k][1] || 0, -1, 1)];
    return g;
  }

  BD.H4Gear = { blank, choose, build, install, atkMul, elMul, svMul, coats, fx, mul, cut, postureMul, sharpCost, onHit, onPop, takenMul, undying, tick, end, sanitize, gearOf, itemName, rollDeco, skillText };
})(typeof window !== 'undefined' ? window : globalThis);
