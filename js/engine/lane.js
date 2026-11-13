'use strict';
// 拉鋸戰（opts.lane，Nexus Wars 式）：一條兵線，兩端各一顆核心；玩家只管經濟與建築，兵與 Boss 都自動推進，核心被毀即分勝負。
// 經濟：定時發收入（基本 + 建築），擊殺 / 拆建築 / 打倒 Boss 有賞金。建築是場上的召喚物（敵人打得掉），每波依種類生兵；
// 建築數量不設上限，可升級（最多 Lv3，產出 × 等級）或拆除（退一半投入）；有召喚祭壇就能花錢叫出 Boss（價格依星數，同時在場數不設上限）。
// 對手由 AI 指揮官操作（opts.laneAI = [藍, 紅]，預設 [否, 是]）；AI 叫 Boss 時依 BD.LANE_COUNTER（1v1 勝率表）挑克制場上敵方 Boss 的人選。
// Boss AI 只會打 Boss：每位召喚 Boss 配一個 hidden 代理假人（敵方隊伍），每步移到它眼前最近的敵方單位上；附近有敵方真 Boss 就改打那位。
// 開場兩位 hidden 錨點假人只是讓 World 有兩隊、隊伍不會因 Boss 全滅而判輸。其餘模式不啟用，指紋不變。
(function (G) {
  const BD = G.BD, U = BD.U;
  // 兵與建築共用一張表（render/minions.js 依 shape / 隊伍色畫）；建築有 cost，spawn = 每波生出的兵
  const UNITS = BD.LANE_UNITS = {
    lanecore:  { name: '核心',   r: 60, hp: 38000, dmg: 90, splash: 110, reach: 420, cd: 0.8, color: '#ffd36a', shape: 'armor', static: true, bounty: 0 }, // 核心自己會打，守方有翻盤機會
    // 小兵要扛得住 Boss 幾下（Boss 單發打小兵的中位數約 47、前 1/4 重擊 120 以上），也要打得痛 Boss
    lanemelee: { name: '步兵',   r: 12, hp: 320, dmg: 26, speed: 110, reach: 20,  cd: 1.0, color: '#d8d8d8', shape: 'blob', bounty: 6 },
    lanerange: { name: '弓兵',   r: 10, hp: 190, dmg: 20, speed: 110, reach: 180, cd: 1.3, color: '#a8e070', shape: 'tri',  bounty: 6 },
    laneheavy: { name: '重甲兵', r: 15, hp: 900, dmg: 48, speed: 85,  reach: 24,  cd: 1.4, color: '#b9b3a6', shape: 'armor', bounty: 12 },
    lb_barracks: { name: '兵營',     r: 30, hp: 2100, color: '#c8c8c8', shape: 'armor', static: true, cost: 120, income: 4, spawn: { lanemelee: 2 }, bounty: 40 },
    lb_archery:  { name: '弓兵營',   r: 30, hp: 1800, color: '#a8e070', shape: 'armor', static: true, cost: 140, income: 4, spawn: { lanerange: 2 }, bounty: 40 },
    lb_armory:   { name: '重甲營',   r: 32, hp: 2700, color: '#b9b3a6', shape: 'armor', static: true, cost: 220, income: 6, spawn: { laneheavy: 1 }, needs: 'lb_barracks', bounty: 60 },
    lb_bank:     { name: '金庫',     r: 28, hp: 1500, color: '#ffd36a', shape: 'armor', static: true, cost: 160, income: 18, bounty: 60 },
    lb_tower:    { name: '箭塔',     r: 24, hp: 2400, color: '#9fdcff', shape: 'tri', static: true, cost: 150, dmg: 45, reach: 330, cd: 1.0, bounty: 40 },
    lb_altar:    { name: '召喚祭壇', r: 32, hp: 2700, color: '#d080ff', shape: 'armor', static: true, cost: 260, bounty: 80, noUp: true }, // 有一座就能召喚，不能升級
  };
  const OPENING = ['lb_archery', 'lb_bank', 'lb_barracks']; // AI 開局固定先補產能，避免隨機開局一步落後就被滾雪球
  const ECON = BD.LANE_ECON = { startGold: 250, baseIncome: 40, incomeT: 15, wave: 6, cols: 5, maxLv: 3, upMul: [0, 1, 1.5], sellBack: 0.5, bossBase: 200, bossPerStar: 100, bossBounty: 120,
    otAt: 300, otDrain: 6.3, otDmg: 60 }; // 加時：otAt 秒起雙方核心每秒掉 otDrain × 加時秒數（約 110 秒內必分勝負，血少的先倒），兵的傷害每 otDmg 秒 +100%
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
          m.cd = g.cd; m.face = U.angTo(m, e); const p = { dmg: g.dmg * (m.lv || 1), posture: 2, kb: 0 };
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
    if (e && d < g.reach && m.cd <= 0) { m.cd = g.cd; w.damageUnit(m, e, { dmg: g.dmg * L.otMul, posture: 3, kb: 20, kbAng: a }); }
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
  // 建築格位：核心前方每排 5 格，排數不設上限，由兵線兩側往外長（避開兵線正中央 y）
  // shortcut: 約 130 座以後會疊在場地上下邊緣，真有人蓋到那麼多再改成往後排
  const slotPos = BD.laneSlotPos = (L, team, i) => {
    const c = L.home[team], dir = team ? -1 : 1, col = i % ECON.cols, row = Math.floor(i / ECON.cols);
    const y = c.y + (row % 2 ? 1 : -1) * (190 + 110 * Math.floor(row / 2));
    return [c.x + dir * (170 + col * 110), U.clamp(y, 60, BD.ARENA.h - 60)];
  };
  for (const kind of Object.keys(UNITS)) {
    const g = UNITS[kind];
    BD.defineMinion(kind, {
      spawn(w, b, m, i, n) {
        Object.assign(m, { r: g.r, hp: g.hp, maxHp: g.hp, laneUnit: true, cd: w.rng.range(0.2, 0.8) });
        const L = w.lane, c = L.home[b.team];
        if (kind === 'lanecore') return [c.x, c.y];
        if (g.cost) { m.slot = L.spawnSlot; m.lv = 1; m.spent = g.cost; return slotPos(L, b.team, L.spawnSlot); }
        const s = L.spawnFrom || c; // 兵從生出它的建築（或核心）旁邊出來，往兵線中央靠
        return [s.x + (b.team ? -50 : 50), s.y + (c.y - s.y) * 0.3 + (i - (n - 1) / 2) * 26];
      },
      update,
      onDeath(w, m) {
        const L = w.lane; if (!L) return;
        if (g.cost) L.slots[m.team][m.slot] = null;
        if (m.sold) return; // 自己拆的：不算擊殺、不給賞金
        L.kills[1 - m.team]++; L.gold[1 - m.team] += g.bounty * (m.lv || 1);
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
    if (L.gold[team] < g.cost) return fail('金錢不足');
    return { ok: true };
  };
  BD.laneBuild = function (w, team, kind) {
    const r = BD.laneCanBuild(w, team, kind); if (!r.ok) return r;
    const L = w.lane;
    L.gold[team] -= UNITS[kind].cost; L.spawnSlot = L.slots[team].indexOf(null);
    if (L.spawnSlot < 0) L.spawnSlot = L.slots[team].push(null) - 1; // 沒有空格就往外加一格
    L.slots[team][L.spawnSlot] = BD.spawnMinion(w, L.anchors[team], kind, 0, 1);
    L.built[team]++;
    return r;
  };
  // 升級：Lv1→2 花原價、Lv2→3 花 1.5 倍；產出（生兵數 / 收入 / 箭塔傷害）× 等級，生命 +50% / 級（補上多出的血）
  BD.laneUpCost = (m) => Math.round(UNITS[m.kind].cost * ECON.upMul[m.lv]);
  BD.laneCanUpgrade = function (w, team, m) {
    const g = m && UNITS[m.kind];
    if (!g || !g.cost || !m.alive || m.team !== team) return fail('沒有這座建築');
    if (w.winner) return fail('已分勝負');
    if (g.noUp) return fail(g.name + '不能升級');
    if (m.lv >= ECON.maxLv) return fail('已經是最高等級');
    if (w.lane.gold[team] < BD.laneUpCost(m)) return fail('金錢不足');
    return { ok: true };
  };
  BD.laneUpgrade = function (w, team, m) {
    const r = BD.laneCanUpgrade(w, team, m); if (!r.ok) return r;
    const c = BD.laneUpCost(m), g = UNITS[m.kind];
    w.lane.gold[team] -= c; m.spent += c; m.lv++;
    const hp = Math.round(g.hp * (1 + 0.5 * (m.lv - 1)));
    m.hp += hp - m.maxHp; m.maxHp = hp;
    return r;
  };
  BD.laneSellValue = (m) => Math.floor(m.spent * ECON.sellBack);
  BD.laneSell = function (w, team, m) {
    const g = m && UNITS[m.kind];
    if (!g || !g.cost || !m.alive || m.team !== team) return fail('沒有這座建築');
    if (w.winner) return fail('已分勝負');
    w.lane.gold[team] += BD.laneSellValue(m); m.sold = true; BD.killMinion(w, m);
    return { ok: true };
  };
  BD.laneBossesAlive = (w, team) => w.lane.summoned.filter((b) => b.team === team && b.state !== 'dead').length;
  BD.laneCanSummon = function (w, team, id) {
    const L = w.lane, def = BD.bossById[id];
    if (!def || def.hidden) return fail('沒有這位 Boss');
    if (w.winner) return fail('已分勝負');
    if (!count(L, team, 'lb_altar')) return fail('需要先蓋召喚祭壇');
    if (L.gold[team] < BD.laneBossCost(def)) return fail('金錢不足');
    return { ok: true };
  };
  BD.laneSummonBoss = function (w, team, id) {
    const r = BD.laneCanSummon(w, team, id); if (!r.ok) return r;
    w.lane.gold[team] -= BD.laneBossCost(BD.bossById[id]);
    BD.laneSummon(w, team, BD.bossById[id]);
    return r;
  };
  const income = (L, team) => ECON.baseIncome + L.slots[team].reduce((s, m) => s + (m ? (UNITS[m.kind].income || 0) * m.lv : 0), 0);
  BD.laneIncome = (w, team) => income(w.lane, team);

  // 敵方的兵 / Boss 已經逼近自家核心（900 內）
  const pressed = (w, team) => w.enemiesOf(team).some((u) => !(u.laneUnit && UNITS[u.kind].static) && U.dist(u, w.lane.home[team]) < 900);
  // AI 指揮官：每秒想一次；先選目標（蓋什麼 / 叫誰），存到錢才執行，再選下一個。只用 w.rng（只在拉鋸戰裡影響戰鬥）
  function commander(w, team) {
    const L = w.lane, C = L.cmd[team];
    if (!C.goal && L.built[team] < OPENING.length) C.goal = { build: OPENING[L.built[team]] };
    if (C.goal && C.goal.boss && C.goal.vs !== foesKey(w, team)) C.goal = null; // 敵方 Boss 陣容變了：重新挑克制
    if (!C.goal) {
      const has = (k) => count(L, team, k), alive = BD.laneBossesAlive(w, team);
      const opts = [];
      if (has('lb_altar')) opts.push(['boss', 40 / (1 + alive)]); // 不設上限，但在場越多越少再叫
      else if (w.time > 40) opts.push(['lb_altar', 60]);
      opts.push(['lb_barracks', has('lb_barracks') ? 18 : 40], ['lb_archery', 18], ['lb_bank', has('lb_bank') * 3 < L.built[team] ? 30 : 8], ['lb_tower', pressed(w, team) ? 30 : 3]);
      if (has('lb_barracks')) opts.push(['lb_armory', 14]);
      if (L.slots[team].some((m) => m && m.lv < ECON.maxLv && !UNITS[m.kind].noUp)) opts.push(['up', 16]);
      let r = w.rng() * opts.reduce((s, o) => s + o[1], 0), pick = opts[0][0];
      for (const o of opts) { r -= o[1]; if (r <= 0) { pick = o[0]; break; } }
      if (pick === 'boss') C.goal = { boss: pickBoss(w, team, C.pool), vs: foesKey(w, team) };
      else if (pick === 'up') { // 升級等級最低的那座（同級取最早蓋的）
        let best = null;
        for (const m of L.slots[team]) if (m && !UNITS[m.kind].noUp && m.lv < ECON.maxLv && (!best || m.lv < best.lv)) best = m;
        C.goal = { up: best };
      } else C.goal = { build: pick };
    }
    const g = C.goal;
    const r = g.boss ? BD.laneCanSummon(w, team, g.boss) : g.up ? BD.laneCanUpgrade(w, team, g.up) : BD.laneCanBuild(w, team, g.build);
    if (r.ok) { if (g.boss) BD.laneSummonBoss(w, team, g.boss); else if (g.up) BD.laneUpgrade(w, team, g.up); else BD.laneBuild(w, team, g.build); C.goal = null; }
    else if (r.why !== '金錢不足') C.goal = null; // 條件變了（祭壇被拆、要升級的建築被拆）：重選
  }
  const foes = (w, team) => w.lane.summoned.filter((b) => b.team !== team && b.state !== 'dead').map((b) => b.def.id);
  const foesKey = (w, team) => foes(w, team).join(',');
  // 克制：場上有敵方 Boss 時，依 1v1 勝率表算對它們的平均勝率，從前 3 名裡抽一位；沒有敵方 Boss（或表裡沒資料）就隨機
  // 只挑約 2 次收入內付得起的（被壓著打時不會一直存錢等貴的；都付不起就挑最便宜的 3 位）
  const pickBoss = BD.lanePickBoss = function (w, team, all) {
    const f = foes(w, team), T = BD.LANE_COUNTER || {}, budget = w.lane.gold[team] + 2 * BD.laneIncome(w, team);
    const cost = (id) => BD.laneBossCost(BD.bossById[id]);
    let pool = all.filter((id) => cost(id) <= budget);
    if (!pool.length) pool = all.slice().sort((a, b) => cost(a) - cost(b) || (a < b ? -1 : 1)).slice(0, 3);
    if (!f.length) return pool[w.rng.int(0, pool.length - 1)];
    const score = (id) => f.reduce((s, e) => s + (T[id] && T[id][e] != null ? T[id][e] : 0.5), 0) / f.length;
    const top = pool.map((id) => [id, score(id)]).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 3);
    return top[w.rng.int(0, top.length - 1)][0];
  };

  BD.setupLane = function (w, opts) {
    const cx = BD.ARENA.w / 2, cy = BD.ARENA.h / 2;
    const anchors = w.bosses.slice(0, 2);
    for (const a of anchors) { a.isDummy = true; a.controller = null; BD.applyStatus(a, 'hidden', { dur: Infinity }, w); a.x = cx; a.y = cy - 2000; }
    w.teamMode = true; w.enrageAt = Infinity;
    const ai = (opts && opts.laneAI) || [false, true];
    const pool = BD.bosses.map((d) => d.id);
    const L = w.lane = {
      anchors, summoned: [], kills: [0, 0], spawned: 0, grid: new Map(), home: [{ x: cx - LEN, y: cy }, { x: cx + LEN, y: cy }], cores: [],
      gold: [ECON.startGold, ECON.startGold], built: [0, 0], slots: [[], []],
      waves: 0, ot: 0, otMul: 1, ai, cmd: [0, 1].map(() => ({ goal: null, pool })), spawnSlot: 0, spawnFrom: null,
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
      if (w.time > ECON.otAt) { // 加時：避免雙方建築無上限滾成僵局（小兵上千隻會卡）
        if (!L.ot) w.banner('加時賽', '雙方核心開始崩落，兵的傷害逐漸提高', '#ffd36a', 3);
        L.ot = w.time - ECON.otAt; L.otMul = 1 + L.ot / ECON.otDmg;
        for (const c of L.cores.slice().sort((a, b) => a.hp - b.hp)) if (c.alive && !w.winner) { c.hp -= ECON.otDrain * L.ot * dt; if (c.hp <= 0) BD.killMinion(w, c); } // 血少的先結算
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
          for (const k in sp) { const n = sp[k] * b.lv; for (let i = 0; i < n; i++) spawn(t, b, k, i, n); }
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
