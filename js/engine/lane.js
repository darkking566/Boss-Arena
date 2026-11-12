'use strict';
// 拉鋸戰（opts.lane，Nexus Wars 式）：一條兵線，兩端各一顆核心；玩家只管經濟與建築，兵與 Boss 都自動推進，核心被毀即分勝負。
// 經濟：定時發收入（基本 + 建築），擊殺 / 拆建築 / 打倒 Boss 有賞金。建築是場上的召喚物（敵人打得掉），每波依種類生兵；
// 召喚祭壇讓該隊可以花錢叫出 Boss（價格依星數，同時在場數 = 祭壇數）。對手由 AI 指揮官操作（opts.laneAI = [藍, 紅]，預設 [否, 是]）。
// Boss AI 只會打 Boss：每位召喚 Boss 配一個 hidden 代理假人（敵方隊伍），每步移到它眼前最近的敵方單位上；附近有敵方真 Boss 就改打那位。
// 開場兩位 hidden 錨點假人只是讓 World 有兩隊、隊伍不會因 Boss 全滅而判輸。其餘模式不啟用，指紋不變。
(function (G) {
  const BD = G.BD, U = BD.U;
  // 兵與建築共用一張表（render/minions.js 依 shape / 隊伍色畫）；建築有 cost，spawn = 每波生出的兵
  const UNITS = BD.LANE_UNITS = {
    lanecore:  { name: '核心',   r: 60, hp: 15000, dmg: 40, splash: 110, reach: 420, cd: 0.8, color: '#ffd36a', shape: 'armor', static: true, bounty: 0 }, // 核心自己會打，守方有翻盤機會
    lanemelee: { name: '步兵',   r: 12, hp: 90,  dmg: 9,  speed: 110, reach: 20,  cd: 1.0, color: '#d8d8d8', shape: 'blob', bounty: 3 },
    lanerange: { name: '弓兵',   r: 10, hp: 55,  dmg: 7,  speed: 110, reach: 180, cd: 1.3, color: '#a8e070', shape: 'tri',  bounty: 3 },
    laneheavy: { name: '重甲兵', r: 15, hp: 260, dmg: 16, speed: 85,  reach: 24,  cd: 1.4, color: '#b9b3a6', shape: 'armor', bounty: 6 },
    lb_barracks: { name: '兵營',     r: 30, hp: 700, color: '#c8c8c8', shape: 'armor', static: true, cost: 120, income: 4, spawn: { lanemelee: 2 }, bounty: 40 },
    lb_archery:  { name: '弓兵營',   r: 30, hp: 600, color: '#a8e070', shape: 'armor', static: true, cost: 140, income: 4, spawn: { lanerange: 2 }, bounty: 40 },
    lb_armory:   { name: '重甲營',   r: 32, hp: 900, color: '#b9b3a6', shape: 'armor', static: true, cost: 220, income: 6, spawn: { laneheavy: 1 }, needs: 'lb_barracks', bounty: 60 },
    lb_bank:     { name: '金庫',     r: 28, hp: 500, color: '#ffd36a', shape: 'armor', static: true, cost: 160, income: 18, bounty: 60 },
    lb_tower:    { name: '箭塔',     r: 24, hp: 800, color: '#9fdcff', shape: 'tri', static: true, cost: 150, dmg: 18, reach: 330, cd: 1.0, bounty: 40 },
    lb_altar:    { name: '召喚祭壇', r: 32, hp: 900, color: '#d080ff', shape: 'armor', static: true, cost: 260, bounty: 80 },
  };
  const OPENING = ['lb_archery', 'lb_bank', 'lb_barracks']; // AI 開局固定先補產能，避免隨機開局一步落後就被滾雪球
  const ECON = BD.LANE_ECON = { startGold: 250, baseIncome: 40, incomeT: 15, wave: 6, slots: 12, maxBosses: 2, bossBase: 200, bossPerStar: 100, bossBounty: 120 };
  const BUILDS = Object.keys(UNITS).filter((k) => UNITS[k].cost);
  const LEN = 1800, AGGRO = 260, BOSS_AGGRO = 700;
  const cell = (v) => Math.floor(v / 40);
  const R_TEAM = ['#5a9cf0', '#e8625a']; // 戰鬥紀錄用的隊伍色（引擎不讀 render）
  BD.laneBossCost = (def) => ECON.bossBase + Math.round((def.stars || 3) * ECON.bossPerStar);

  function nearestFoe(w, m, range) {
    let best = null, bd = range;
    for (const u of w.enemiesOf(m.team)) { const d = U.dist(m, u) - u.r; if (d < bd) { bd = d; best = u; } }
    return best;
  }
  function update(w, m, dt) {
    const g = UNITS[m.kind], L = w.lane;
    if (g.static) { // 建築不動；箭塔射最近的敵人
      if (g.dmg && (m.cd -= dt) <= 0) {
        const e = nearestFoe(w, m, g.reach);
        if (e) {
          m.cd = g.cd; m.face = U.angTo(m, e); const p = { dmg: g.dmg, posture: 2, kb: 0 };
          if (g.splash) w.applyArea(m, { kind: 'circle', x: e.x, y: e.y, r: g.splash }, p); else w.damageUnit(m, e, p); // 核心打範圍，剋兵海
        }
      }
      return true;
    }
    m.cd -= dt;
    const e = nearestFoe(w, m, AGGRO);
    const goal = e || L.cores[1 - m.team];
    const a = U.angTo(m, goal), d = U.dist(m, goal) - goal.r - m.r;
    m.face = U.rotateToward(m.face, a, 10 * dt);
    const sp = d > g.reach * 0.8 ? g.speed : 0, k = Math.min(1, 5 * dt);
    m.vx += (Math.cos(a) * sp - m.vx) * k; m.vy += (Math.sin(a) * sp - m.vy) * k;
    if (e && d < g.reach && m.cd <= 0) { m.cd = g.cd; w.damageUnit(m, e, { dmg: g.dmg, posture: 3, kb: 20, kbAng: a }); }
    const cx = cell(m.x), cy = cell(m.y);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { // 同隊互推（同小兵潮的格子雜湊）
      const list = L.grid.get((cx + i) * 4096 + cy + j);
      if (list) for (const o of list) {
        if (o === m || !o.alive) continue;
        const dx = m.x - o.x, dy = m.y - o.y, dd = Math.hypot(dx, dy) || 0.01, s = m.r + o.r;
        if (dd < s) { m.x += dx / dd * (s - dd) * 0.5; m.y += dy / dd * (s - dd) * 0.5; }
      }
    }
  }
  // 建築格位：核心前方 3 列 × 4 排（避開兵線正中央 y）
  const slotPos = BD.laneSlotPos = (L, team, i) => {
    const c = L.home[team], dir = team ? -1 : 1, col = Math.floor(i / 4), row = i % 4;
    return [c.x + dir * (170 + col * 110), c.y + [-300, -190, 190, 300][row]];
  };
  for (const kind of Object.keys(UNITS)) {
    const g = UNITS[kind];
    BD.defineMinion(kind, {
      spawn(w, b, m, i, n) {
        Object.assign(m, { r: g.r, hp: g.hp, maxHp: g.hp, laneUnit: true, cd: w.rng.range(0.2, 0.8) });
        const L = w.lane, c = L.home[b.team];
        if (kind === 'lanecore') return [c.x, c.y];
        if (g.cost) { m.slot = L.spawnSlot; return slotPos(L, b.team, L.spawnSlot); }
        const s = L.spawnFrom || c; // 兵從生出它的建築（或核心）旁邊出來，往兵線中央靠
        return [s.x + (b.team ? -50 : 50), s.y + (c.y - s.y) * 0.3 + (i - (n - 1) / 2) * 26];
      },
      update,
      onDeath(w, m) {
        const L = w.lane; if (!L) return;
        L.kills[1 - m.team]++; L.gold[1 - m.team] += g.bounty;
        if (g.cost) L.slots[m.team][m.slot] = null;
        if (m.kind === 'lanecore' && !w.winner) {
          const win = 1 - m.team;
          w.winner = L.anchors[win]; w.slowmo = 1.4;
          w.banner((win ? '紅方' : '藍方') + '獲勝！', '摧毀了對方核心', win ? '#ff6a6a' : '#6aa8ff', 3);
        }
      },
    });
  }

  // 直接讓一位 Boss 參戰（不扣錢、不看祭壇；測試與 laneSummonBoss 共用）；回傳 Boss
  BD.laneSummon = function (w, team, def) {
    const L = w.lane, c = L.home[team];
    const b = new BD.Boss(w, BD.applyPace(def, w.paceId), team, c.x + (team ? -150 : 150), c.y);
    if (def.partner) b.maxHp = b.hp = b.hpTrail = Math.round(b.maxHp * (def.soloHpMul || 1)); // 雙人 Boss 單獨出場（同小兵潮）
    const px = new BD.Boss(w, BD.bossById.dummy, 1 - team, b.x, b.y);
    px.isDummy = true; BD.applyStatus(px, 'hidden', { dur: Infinity }, w);
    b.laneProxy = px; b.controller = new BD.AIController(b, w);
    w.bosses.push(b, px); L.summoned.push(b);
    w.banner(b.name + ' 參戰', team ? '紅方' : '藍方', b.def.color, 1.5);
    return b;
  };
  const fail = (why) => ({ ok: false, why });
  const count = (L, team, kind) => L.slots[team].filter((m) => m && m.kind === kind).length;
  // 玩家 / AI 指揮官共用的操作：回傳 { ok, why? }，失敗不扣錢
  BD.laneCanBuild = function (w, team, kind) {
    const L = w.lane, g = UNITS[kind];
    if (!g || !g.cost) return fail('沒有這種建築');
    if (w.winner) return fail('已分勝負');
    if (g.needs && !count(L, team, g.needs)) return fail('需要先蓋' + UNITS[g.needs].name);
    if (L.slots[team].indexOf(null) < 0) return fail('建築格已滿');
    if (L.gold[team] < g.cost) return fail('金錢不足');
    return { ok: true };
  };
  BD.laneBuild = function (w, team, kind) {
    const r = BD.laneCanBuild(w, team, kind); if (!r.ok) return r;
    const L = w.lane;
    L.gold[team] -= UNITS[kind].cost; L.spawnSlot = L.slots[team].indexOf(null);
    L.slots[team][L.spawnSlot] = BD.spawnMinion(w, L.anchors[team], kind, 0, 1);
    L.built[team]++;
    return r;
  };
  BD.laneBossesAlive = (w, team) => w.lane.summoned.filter((b) => b.team === team && b.state !== 'dead').length;
  BD.laneCanSummon = function (w, team, id) {
    const L = w.lane, def = BD.bossById[id];
    if (!def || def.hidden) return fail('沒有這位 Boss');
    if (w.winner) return fail('已分勝負');
    const cap = Math.min(ECON.maxBosses, count(L, team, 'lb_altar'));
    if (!cap) return fail('需要先蓋召喚祭壇');
    if (BD.laneBossesAlive(w, team) >= cap) return fail('Boss 已達上限（祭壇數）');
    if (L.gold[team] < BD.laneBossCost(def)) return fail('金錢不足');
    return { ok: true };
  };
  BD.laneSummonBoss = function (w, team, id) {
    const r = BD.laneCanSummon(w, team, id); if (!r.ok) return r;
    w.lane.gold[team] -= BD.laneBossCost(BD.bossById[id]);
    BD.laneSummon(w, team, BD.bossById[id]);
    return r;
  };
  const income = (L, team) => ECON.baseIncome + L.slots[team].reduce((s, m) => s + (m ? UNITS[m.kind].income || 0 : 0), 0);
  BD.laneIncome = (w, team) => income(w.lane, team);

  // 敵方的兵 / Boss 已經逼近自家核心（900 內）
  const pressed = (w, team) => w.enemiesOf(team).some((u) => !(u.laneUnit && UNITS[u.kind].static) && U.dist(u, w.lane.home[team]) < 900);
  // AI 指揮官：每秒想一次；先選目標（蓋什麼 / 叫誰），存到錢才執行，再選下一個。只用 w.rng（只在拉鋸戰裡影響戰鬥）
  function commander(w, team) {
    const L = w.lane, C = L.cmd[team];
    if (!C.goal && L.built[team] < OPENING.length) C.goal = { build: OPENING[L.built[team]] };
    if (!C.goal) {
      const has = (k) => count(L, team, k), full = L.slots[team].indexOf(null) < 0;
      const cap = Math.min(ECON.maxBosses, has('lb_altar'));
      const opts = [];
      if (cap && BD.laneBossesAlive(w, team) < cap) opts.push(['boss', 40]);
      if (!full) {
        if (!has('lb_altar') && w.time > 40) opts.push(['lb_altar', 60]);
        else if (has('lb_altar') < ECON.maxBosses && w.time > 240) opts.push(['lb_altar', 8]);
        opts.push(['lb_barracks', has('lb_barracks') ? 18 : 40], ['lb_archery', 18], ['lb_bank', has('lb_bank') * 3 < L.built[team] ? 30 : 8], ['lb_tower', pressed(w, team) ? 30 : 3]);
        if (has('lb_barracks')) opts.push(['lb_armory', 14]);
      }
      if (!opts.length) return;
      let r = w.rng() * opts.reduce((s, o) => s + o[1], 0), pick = opts[0][0];
      for (const o of opts) { r -= o[1]; if (r <= 0) { pick = o[0]; break; } }
      C.goal = pick === 'boss' ? { boss: C.pool[w.rng.int(0, C.pool.length - 1)] } : { build: pick };
    }
    const g = C.goal;
    const r = g.boss ? BD.laneCanSummon(w, team, g.boss) : BD.laneCanBuild(w, team, g.build);
    if (r.ok) { if (g.boss) BD.laneSummonBoss(w, team, g.boss); else BD.laneBuild(w, team, g.build); C.goal = null; }
    else if (r.why !== '金錢不足') C.goal = null; // 條件變了（格子滿、祭壇被拆、Boss 已滿）：重選
  }

  BD.setupLane = function (w, opts) {
    const cx = BD.ARENA.w / 2, cy = BD.ARENA.h / 2;
    const anchors = w.bosses.slice(0, 2);
    for (const a of anchors) { a.isDummy = true; a.controller = null; BD.applyStatus(a, 'hidden', { dur: Infinity }, w); a.x = cx; a.y = cy - 2000; }
    w.teamMode = true; w.enrageAt = Infinity;
    const ai = (opts && opts.laneAI) || [false, true];
    const pool = BD.bosses.map((d) => d.id);
    const L = w.lane = {
      anchors, summoned: [], kills: [0, 0], spawned: 0, grid: new Map(), home: [{ x: cx - LEN, y: cy }, { x: cx + LEN, y: cy }], cores: [],
      gold: [ECON.startGold, ECON.startGold], built: [0, 0], slots: [0, 1].map(() => new Array(ECON.slots).fill(null)),
      waves: 0, ai, cmd: [0, 1].map(() => ({ goal: null, pool })), spawnSlot: 0, spawnFrom: null,
    };
    L.cores = [0, 1].map((t) => BD.spawnMinion(w, anchors[t], 'lanecore', 0, 1));
    for (const t of [0, 1]) { L.gold[t] += UNITS.lb_barracks.cost; BD.laneBuild(w, t, 'lb_barracks'); L.built[t] = 0; } // 開局各送一座兵營
    const retarget = w.retarget.bind(w);
    w.retarget = (b) => { // 召喚 Boss：附近有敵方真 Boss 就打它，否則打代理假人
      if (!b.laneProxy) return retarget(b);
      let foe = null, fd = BOSS_AGGRO;
      for (const o of L.summoned) if (o.team !== b.team && o.state !== 'dead') { const d = U.dist(b, o); if (d < fd) { fd = d; foe = o; } }
      b._target = foe || b.laneProxy;
    };
    w.on('kill', (e) => { if (e.b.laneProxy) { L.gold[1 - e.b.team] += ECON.bossBounty; L.fixKill = e.b; } });
    const spawn = (t, from, kind, i, n) => { L.spawnFrom = from; BD.spawnMinion(w, anchors[t], kind, i, n); L.spawned++; };
    let wave = 1, think = 0; L.payIn = ECON.incomeT;
    w.on('think', (dt) => {
      if (w.winner) return;
      L.grid.clear();
      for (const m of w.minions) if (m.alive && m.laneUnit && !UNITS[m.kind].static) {
        const k = cell(m.x) * 4096 + cell(m.y), l = L.grid.get(k); if (l) l.push(m); else L.grid.set(k, [m]);
      }
      for (const b of L.summoned) if (b.state !== 'dead') { // 代理假人移到 Boss 眼前最近的敵方單位（沒有就是對方核心）
        let best = L.cores[1 - b.team], bd = Infinity;
        for (const m of w.minions) if (m.alive && m.laneUnit && m.team !== b.team) { const d = U.dist(b, m); if (d < bd) { bd = d; best = m; } }
        b.laneProxy.x = best.x; b.laneProxy.y = best.y;
      }
      if ((L.payIn -= dt) <= 0) { L.payIn = ECON.incomeT; for (const t of [0, 1]) L.gold[t] += income(L, t); }
      if ((think -= dt) <= 0) { think = 1; for (const t of [0, 1]) if (L.ai[t]) commander(w, t); }
      if ((wave -= dt) > 0) return;
      wave = ECON.wave;
      L.waves++;
      for (const t of L.waves % 2 ? [0, 1] : [1, 0]) { // 每波輪流先生，抵銷先動的一方先出手
        spawn(t, L.cores[t], 'lanemelee', 0, 1); // 核心每波免費一名步兵，兵線不會空
        for (const b of L.slots[t]) if (b && b.alive && UNITS[b.kind].spawn) {
          const sp = UNITS[b.kind].spawn;
          for (const k in sp) for (let i = 0; i < sp[k]; i++) spawn(t, b, k, i, sp[k]);
        }
      }
      L.spawnFrom = null;
    });
    w.on('postStep', () => {
      if (L.fixKill) { // World.kill 的團隊橫幅會把錨點 / 代理假人算成「剩下 N 位」、擊殺者記成假人：改成拉鋸戰的說法
        const b = L.fixKill, side = b.team ? '藍方' : '紅方'; L.fixKill = null;
        for (const bn of w.banners) if (bn.text === b.name + ' 倒下了') { bn.sub = `${side} +${ECON.bossBounty} 賞金`; bn.color = R_TEAM[1 - b.team]; }
        for (const lg of w.logs.slice(-3)) if (lg.who === BD.bossById.dummy.name) { lg.who = side; lg.color = R_TEAM[1 - b.team]; }
      }
      // 倒下的召喚 Boss 與它的代理假人在 3 秒後移出場（不再占用 AI / 碰撞）
      for (const b of L.summoned) if (b.state === 'dead' && !b.laneGone && b.stateT > 3) b.laneGone = true;
      if (L.summoned.some((b) => b.laneGone && w.bosses.includes(b))) w.bosses = w.bosses.filter((x) => !(x.laneGone || (x.isDummy && L.summoned.some((b) => b.laneGone && b.laneProxy === x))));
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
