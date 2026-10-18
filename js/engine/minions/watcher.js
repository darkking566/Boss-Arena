'use strict';
// 深淵監視者的召喚物：rogue 紅眼監視者（中立 team 2，敵我不分）、watcher 同伴監視者（同陣營）
// 規則：同伴由 summon 的 cap 限制；每次呼喚同伴有 a.rogue 機率引來紅眼監視者——同時最多 1 名、每場最多 ROGUE_MAX 名
(function (G) {
  const BD = G.BD, U = BD.U, K = BD.K;
  const A = () => BD.ARENA;
  const ROGUE_MAX = 2;

  // 同伴／紅眼監視者：簡化版 AI（接近、側移、兩到三連斬、偶爾後空翻）
  function updateWatcherMinion(w, m, dt, e, eAlive) {
    let tgt = null;
    if (m.kind === 'watcher') tgt = eAlive && !BD.getMod(e, 'untargetable') ? e : null;
    else {
      let bd = 1e9;
      for (const u of w.bosses) if (u.state !== 'dead' && !BD.getMod(u, 'untargetable')) { const d = U.dist(m, u); if (d < bd) { bd = d; tgt = u; } }
      for (const o of w.minions) if (o !== m && o.alive && o.kind === 'watcher') { const d = U.dist(m, o) * 0.8; if (d < bd) { bd = d; tgt = o; } }
    }
    m.st -= dt; m.cd -= dt;
    const col = m.kind === 'rogue' ? '#ff3344' : '#c9c9d6';
    const teleFor = () => K.addTele(w, { team: m.team, def: { color: col } }, null, { kind: 'cone', x: m.x, y: m.y, ang: m.face, r: 95, arc: 2.1 }, m.st, { detached: true });
    if (m.ms === 'wind') {
      m.vx *= 0.8; m.vy *= 0.8;
      if (m.st <= 0) {
        w.applyArea(m, { kind: 'cone', x: m.x, y: m.y, ang: m.face, r: 95, arc: 2.1 }, { dmg: m.dmg, posture: 14, kb: 160 });
        BD.spawnFx(w, 'slash', m.x, m.y, { angle: m.face, arc: 2.1, radius: 85, color: col, src: m.owner });
        m.combo--;
        if (m.combo > 0 && tgt) { m.face = U.angTo(m, tgt); m.st = 0.32; m.ms = 'wind'; teleFor(); }
        else { m.ms = 'rec'; m.st = 0.7; }
      }
    } else if (m.ms === 'rec') { m.vx *= 0.85; m.vy *= 0.85; if (m.st <= 0) m.ms = 'move'; }
    else if (m.ms === 'flip') { if (m.st <= 0) m.ms = 'move'; }
    else if (tgt) {
      const d = U.dist(m, tgt), a = U.angTo(m, tgt);
      m.face = U.rotateToward(m.face, a, 8 * dt);
      const rad = d > 85 ? 1 : -0.2;
      const mvx = Math.cos(a) * rad - Math.sin(a) * m.dir * 0.6, mvy = Math.sin(a) * rad + Math.cos(a) * m.dir * 0.6, l = Math.hypot(mvx, mvy) || 1;
      m.vx += (mvx / l * m.speed - m.vx) * Math.min(1, 6 * dt); m.vy += (mvy / l * m.speed - m.vy) * Math.min(1, 6 * dt);
      if (m.cd <= 0 && d < m.r + tgt.r + 75) {
        m.face = a; m.ms = 'wind'; m.st = 0.5; m.combo = w.rng() < 0.5 ? 2 : 3; m.cd = w.rng.range(1.6, 2.6); teleFor();
      } else if (d < 140 && w.rng() < dt * 0.3) {
        m.ms = 'flip'; m.st = 0.3; m.vx = -Math.cos(a) * 420; m.vy = -Math.sin(a) * 420;
      }
      if (w.rng() < dt * 0.4) m.dir *= -1;
    } else { m.vx *= 0.9; m.vy *= 0.9; }
    if (m.t > m.life) BD.killMinion(w, m);
  }
  function knight(w, b, m, rogue) {
    Object.assign(m, { r: rogue ? 20 : 19, hp: rogue ? 320 : 260, maxHp: rogue ? 320 : 260, life: rogue ? 20 : 22, speed: rogue ? 225 : 215,
      dmg: rogue ? 45 : 32, ms: 'move', st: 0, cd: 1.0, combo: 0, dir: w.rng() < 0.5 ? 1 : -1, def: b.def });
  }

  // （先定義 rogue：World.stats 欄位順序 rogues → rogueHits → packs 與重構前一致）
  BD.defineMinion('rogue', {
    threat: true,
    stats: () => ({ rogues: 0, rogueHits: [0, 0] }),
    spawn(w, b, m) {
      knight(w, b, m, true);
      m.team = 2; m.neutral = true;
      const A2 = A(), side = w.rng.int(0, 3);
      const x = side === 0 ? 40 : side === 1 ? A2.w - 40 : w.rng.range(100, A2.w - 100);
      const y = side === 2 ? 40 : side === 3 ? A2.h - 40 : w.rng.range(100, A2.h - 100);
      w.stats.rogues++;
      w.banner('紅眼監視者出現！', '被深淵吞噬的同伴——敵我不分', '#ff3344', 1.6);
      w.log(null, '紅眼監視者出現了，敵我不分地攻擊所有人！', true);
      BD.spawnFx(w, 'vanish', x, y, { el: 'blood', src: b });
      return [x, y];
    },
    update: updateWatcherMinion,
    onHitBoss(w, m, boss) { w.stats.rogueHits[boss.team]++; },
  });

  BD.defineMinion('watcher', {
    threat: true,
    stats: () => ({ packs: 0 }),
    spawn(w, b, m, i, n, t, base) {
      knight(w, b, m, false);
      const an = base + (w.rng() < 0.5 ? 1 : -1) * 1.2, x = b.x + Math.cos(an) * 90, y = b.y + Math.sin(an) * 90;
      BD.spawnFx(w, 'vanish', x, y, { el: 'shadow', src: b });
      return [x, y];
    },
    update: updateWatcherMinion,
    afterSummon(w, b, a, n) {
      if (n > 0) { w.stats.packs++; w.log(b, '呼喚了同伴監視者！'); }
      if (a.rogue && w.rng() < a.rogue && w.stats.rogues < ROGUE_MAX && !w.minions.some((m) => m.alive && m.kind === 'rogue')) BD.spawnMinion(w, b, 'rogue', 0, 1);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
