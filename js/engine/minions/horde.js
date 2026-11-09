'use strict';
// 小兵潮（生存模式，opts.horde）：一位 Boss 對上從四面八方湧來、數量隨時間越來越多、沒有上限的低級雜兵；Boss 倒下即結束。
// 對手是 hidden 的訓練假人（untargetable、不繪製），每幀飄到最近的雜兵身上，讓 AI 有目標可打；其餘模式不啟用，指紋不變。
// GRUNTS 是純資料（render/minions.js 依 shape / color 造型）；UNLOCK 是各種類開始出現的秒數。
(function (G) {
  const BD = G.BD, U = BD.U;
  const GRUNTS = BD.GRUNTS = {
    ember:  { name: '熔岩小鬼', r: 12, hp: 60,  dmg: 8,  speed: 120, reach: 20, cd: 1.1, color: '#e8641e', shape: 'blob' },
    frost:  { name: '霜月侍從', r: 10, hp: 40,  dmg: 6,  speed: 150, reach: 20, cd: 0.9, color: '#9fdcff', shape: 'tri' },
    shadow: { name: '影刃雜兵', r: 10, hp: 35,  dmg: 9,  speed: 190, reach: 22, cd: 1.0, color: '#6b5a8c', shape: 'tri' },
    mire:   { name: '沼澤蟲',   r: 8,  hp: 20,  dmg: 4,  speed: 220, reach: 16, cd: 0.7, color: '#8fbf3a', shape: 'bug' },
    bone:   { name: '深淵殘兵', r: 14, hp: 110, dmg: 11, speed: 100, reach: 26, cd: 1.4, color: '#b9b3a6', shape: 'armor' },
    bomber: { name: '爆裂蟲',   r: 9,  hp: 25,  dmg: 22, speed: 200, reach: 14, cd: 0,   color: '#ff9a2a', shape: 'bomb' },
  };
  const UNLOCK = { ember: 0, mire: 0, frost: 20, shadow: 40, bomber: 60, bone: 90 };
  const ALL = Object.keys(GRUNTS);

  const cell = (v) => Math.floor(v / 40);
  const key = (x, y) => cell(x) * 4096 + cell(y);

  function update(w, m, dt) {
    const g = GRUNTS[m.kind], H = w.horde, e = H.hero;
    const bd = e.state !== 'dead' && !BD.getMod(e, 'untargetable') ? U.dist(m, e) - e.r : Infinity;
    m.cd -= dt;
    if (bd < Infinity) {
      const a = U.angTo(m, e);
      m.face = U.rotateToward(m.face, a, 10 * dt);
      const k = Math.min(1, 5 * dt), sp = bd > g.reach * 0.5 ? g.speed : 0;
      m.vx += (Math.cos(a) * sp - m.vx) * k; m.vy += (Math.sin(a) * sp - m.vy) * k;
      if (bd < m.r + g.reach && m.cd <= 0) {
        w.applyArea(m, { kind: 'circle', x: m.x, y: m.y, r: m.r + g.reach + 6 }, { dmg: g.dmg, posture: g.shape === 'bomb' ? 12 : 3, kb: g.shape === 'bomb' ? 180 : 40 });
        if (g.shape === 'bomb') { BD.spawnFx(w, 'burst', m.x, m.y, { el: 'fire', radius: 55, src: m.owner }); m.alive = false; return true; }
        m.cd = g.cd;
      }
    } else { m.vx *= 0.9; m.vy *= 0.9; }
    const cx = cell(m.x), cy = cell(m.y);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { // 同類互相推開，避免疊成一點（格子雜湊，雜兵再多也不是 O(n²)）
      const list = H.grid.get((cx + i) * 4096 + cy + j);
      if (!list) continue;
      for (const o of list) {
        if (o === m || !o.alive) continue;
        const dx = m.x - o.x, dy = m.y - o.y, d = Math.hypot(dx, dy) || 0.01, s = m.r + o.r;
        if (d < s) { m.x += dx / d * (s - d) * 0.5; m.y += dy / d * (s - d) * 0.5; }
      }
    }
  }

  for (const kind of ALL) {
    const g = GRUNTS[kind];
    BD.defineMinion(kind, {
      spawn(w, b, m) {
        Object.assign(m, { r: g.r, hp: g.hp, maxHp: g.hp, grunt: true, cd: w.rng.range(0.2, 0.8) });
        const h = w.horde.hero, an = w.rng.range(0, U.TAU), d = w.rng.range(650, 950); // 從鏡頭外的四面八方湧入
        return [h.x + Math.cos(an) * d, h.y + Math.sin(an) * d];
      },
      update,
      onDeath(w) { if (w.horde) w.horde.kills++; },
    });
  }

  BD.setupHorde = function (w) {
    const hero = w.bosses[0], ph = w.bosses[1];
    ph.isDummy = true; ph.controller = null; BD.applyStatus(ph, 'hidden', { dur: Infinity }, w);
    hero.maxPosture = Infinity; // 雜兵潮中 Boss 不會架勢崩潰（checkPostureBreak 永遠不成立；架勢條也不再填）
    w.enrageAt = Infinity; w.intro = 0; // 生存模式不狂暴、不播開場；難度只來自雜兵數量
    w.banner('小兵潮來襲', '撐得越久越好', '#ffb070', 2);
    let wait = 2, ended = false;
    const H = w.horde = {
      hero, kills: 0, peak: 0, spawned: 0, grid: new Map(),
      step(dt) {
        if (w.winner) { // 結算：把「某某獲勝」換成生存結果
          if (!ended) { ended = true; w.banners.length = 0; w.banner(hero.name + ' 倒下了', `撐了 ${Math.floor(w.time)} 秒，擊倒 ${H.kills} 隻`, '#ff6a6a', 3); }
          return;
        }
        H.grid.clear();
        let near = null, nd = Infinity, n = 0;
        for (const m of w.minions) {
          if (!m.alive || !m.grunt) continue;
          n++; const k = key(m.x, m.y), l = H.grid.get(k); if (l) l.push(m); else H.grid.set(k, [m]);
          const d = U.dist(m, hero); if (d < nd) { nd = d; near = m; }
        }
        H.peak = Math.max(H.peak, n);
        // 假人（AI 的目標）飄到最近的雜兵上；場上沒有雜兵時站在 Boss 面前
        if (near) { ph.x = near.x; ph.y = near.y; } else { ph.x = hero.x + Math.cos(hero.face) * 700; ph.y = hero.y + Math.sin(hero.face) * 700; }
        wait -= dt;
        if (wait > 0) return;
        wait = 1.5;
        const t = w.time, kinds = ALL.filter((k) => t >= UNLOCK[k]);
        const c = 2 + Math.floor(t / 10) + Math.floor(2 * (t / 60) ** 2); // 每波數量隨時間增加，沒有上限
        for (let i = 0; i < c; i++) BD.spawnMinion(w, ph, kinds[w.rng.int(0, kinds.length - 1)], i, c);
        H.spawned += c;
      },
    };
    w.on('think', (dt) => H.step(dt));
  };
})(typeof window !== 'undefined' ? window : globalThis);
