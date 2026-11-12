'use strict';
// 拉鋸戰原型（opts.lane，Nexus Wars 式）：一條兵線，兩端各一顆核心（召喚物），兩方定時生兵沿線推進；
// Boss 由 BD.laneSummon 在戰鬥中途加入、AI 操控、跟兵一起推。核心被毀即分勝負。其餘模式不啟用，指紋不變。
// Boss AI 只會打 Boss：每位召喚 Boss 配一個 hidden 代理假人（敵方隊伍），每步移到它眼前最近的敵方小兵 / 核心上；
// 附近有敵方真 Boss 時直接改打那位。開場兩位 hidden 錨點假人只是讓 World 有兩隊、隊伍不會因 Boss 全滅而判輸。
// shortcut: 原型只有固定生兵、沒有經濟 / 建築 / 介面 / 對手指揮官，驗證可行後再加。
(function (G) {
  const BD = G.BD, U = BD.U;
  const UNITS = BD.LANE_UNITS = {
    lanecore:  { name: '核心',   r: 60, hp: 6000, dmg: 0,  speed: 0,   reach: 0,  cd: 0,   color: '#ffd36a', shape: 'armor' },
    lanemelee: { name: '步兵',   r: 12, hp: 90,   dmg: 9,  speed: 110, reach: 20, cd: 1.0, color: '#d8d8d8', shape: 'blob' },
    lanerange: { name: '弓兵',   r: 10, hp: 55,   dmg: 7,  speed: 110, reach: 180, cd: 1.3, color: '#a8e070', shape: 'tri' },
  };
  const LEN = 1800, AGGRO = 260, WAVE = 6, BOSS_AGGRO = 700;
  const cell = (v) => Math.floor(v / 40);

  function nearestFoe(w, m, range) {
    let best = null, bd = range;
    for (const u of w.enemiesOf(m.team)) { const d = U.dist(m, u) - u.r; if (d < bd) { bd = d; best = u; } }
    return best;
  }
  function update(w, m, dt) {
    const g = UNITS[m.kind], L = w.lane;
    if (g.speed === 0) return true; // 核心不動
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
  for (const kind of Object.keys(UNITS)) {
    const g = UNITS[kind];
    BD.defineMinion(kind, {
      spawn(w, b, m, i, n) {
        Object.assign(m, { r: g.r, hp: g.hp, maxHp: g.hp, laneUnit: true, cd: w.rng.range(0.2, 0.8) });
        const c = w.lane.home[b.team];
        if (kind === 'lanecore') return [c.x, c.y];
        return [c.x + (b.team ? -90 : 90), c.y + (i - (n - 1) / 2) * 30];
      },
      update,
      onDeath(w, m) {
        const L = w.lane; if (!L) return;
        L.kills[1 - m.team]++;
        if (m.kind === 'lanecore' && !w.winner) {
          const win = 1 - m.team;
          w.winner = L.anchors[win]; w.slowmo = 1.4;
          w.banner((win ? '紅方' : '藍方') + '獲勝！', '摧毀了對方核心', win ? '#ff6a6a' : '#6aa8ff', 3);
        }
      },
    });
  }

  // 戰鬥中途召喚一位 Boss（AI 操控）；回傳 Boss
  BD.laneSummon = function (w, team, def) {
    const L = w.lane, c = L.home[team];
    const b = new BD.Boss(w, BD.applyPace(def, w.paceId), team, c.x + (team ? -150 : 150), c.y);
    const px = new BD.Boss(w, BD.bossById.dummy, 1 - team, b.x, b.y);
    px.isDummy = true; BD.applyStatus(px, 'hidden', { dur: Infinity }, w);
    b.laneProxy = px; b.controller = new BD.AIController(b, w);
    w.bosses.push(b, px); L.summoned.push(b);
    w.banner(b.name + ' 參戰', team ? '紅方' : '藍方', b.def.color, 1.5);
    return b;
  };

  BD.setupLane = function (w) {
    const cx = BD.ARENA.w / 2, cy = BD.ARENA.h / 2;
    const anchors = w.bosses.slice(0, 2);
    for (const a of anchors) { a.isDummy = true; a.controller = null; BD.applyStatus(a, 'hidden', { dur: Infinity }, w); a.x = cx; a.y = cy - 2000; }
    w.teamMode = true; w.enrageAt = Infinity;
    const L = w.lane = { anchors, summoned: [], kills: [0, 0], spawned: 0, grid: new Map(), home: [{ x: cx - LEN, y: cy }, { x: cx + LEN, y: cy }], cores: [] };
    L.cores = [0, 1].map((t) => BD.spawnMinion(w, anchors[t], 'lanecore', 0, 1));
    const retarget = w.retarget.bind(w);
    w.retarget = (b) => { // 召喚 Boss：附近有敵方真 Boss 就打它，否則打代理假人
      if (!b.laneProxy) return retarget(b);
      let foe = null, fd = BOSS_AGGRO;
      for (const o of L.summoned) if (o.team !== b.team && o.state !== 'dead') { const d = U.dist(b, o); if (d < fd) { fd = d; foe = o; } }
      b._target = foe || b.laneProxy;
    };
    let wait = 1;
    w.on('think', (dt) => {
      if (w.winner) return;
      L.grid.clear();
      for (const m of w.minions) if (m.alive && m.laneUnit && m.kind !== 'lanecore') {
        const k = cell(m.x) * 4096 + cell(m.y), l = L.grid.get(k); if (l) l.push(m); else L.grid.set(k, [m]);
      }
      for (const b of L.summoned) if (b.state !== 'dead') { // 代理假人移到 Boss 眼前最近的敵方單位（沒有就是對方核心）
        let best = L.cores[1 - b.team], bd = Infinity;
        for (const m of w.minions) if (m.alive && m.laneUnit && m.team !== b.team) { const d = U.dist(b, m); if (d < bd) { bd = d; best = m; } }
        b.laneProxy.x = best.x; b.laneProxy.y = best.y;
      }
      wait -= dt; if (wait > 0) return;
      wait = WAVE;
      for (const t of [0, 1]) {
        const kinds = ['lanemelee', 'lanemelee', 'lanemelee', 'lanerange', 'lanerange'];
        kinds.forEach((k, i) => BD.spawnMinion(w, anchors[t], k, i, kinds.length));
        L.spawned += kinds.length;
      }
    });
    w.on('postStep', () => { // 倒下的召喚 Boss 與它的代理假人在 3 秒後移出場（不再占用 AI / 碰撞）
      for (const b of L.summoned) if (b.state === 'dead' && !b.laneGone && b.stateT > 3) b.laneGone = true;
      if (L.summoned.some((b) => b.laneGone && w.bosses.includes(b))) w.bosses = w.bosses.filter((x) => !(x.laneGone || (x.isDummy && L.summoned.some((b) => b.laneGone && b.laneProxy === x))));
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
