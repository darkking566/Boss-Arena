'use strict';
// 霜月魔女的召喚物：sentinel 冰晶哨兵（定點射擊）、clone 鏡像分身（繞行射擊、一擊即碎）
(function (G) {
  const BD = G.BD, U = BD.U;

  // 共用射擊邏輯：clone 會繞著目標保持距離移動
  function turret(w, m, dt, e, eAlive, orbit, cd, dmg) {
    if (orbit && eAlive) {
      const d = U.dist(m, e), a = U.angTo(e, m) + m.dir * 0.9 * dt;
      const want = 340, rr = d + U.clamp(want - d, -150 * dt, 150 * dt);
      const nx = e.x + Math.cos(a) * rr, ny = e.y + Math.sin(a) * rr;
      m.vx = (nx - m.x) / dt * 0.5; m.vy = (ny - m.y) / dt * 0.5;
    }
    m.face = U.angTo(m, e);
    m.cd -= dt;
    if (m.cd <= 0 && eAlive && !BD.getMod(e, 'untargetable')) {
      m.cd = cd;
      const lead = U.dist(m, e) / 450;
      const ang = Math.atan2(e.y + e.vy * lead * 0.6 - m.y, e.x + e.vx * lead * 0.6 - m.x);
      BD.spawnProj(w, m, m, ang, { speed: 450, r: 8, dmg, posture: 8, life: 2.4, kind: 'ice' });
    }
    if (m.t > m.life) BD.killMinion(w, m);
  }

  BD.defineMinion('sentinel', {
    spawn(w, b, m, i, n, t, base) {
      Object.assign(m, { r: 18, hp: 110, maxHp: 110, life: 10 });
      const an = base + (i % 2 ? -1 : 1) * (Math.PI / 2 + 0.3);
      return [b.x + Math.cos(an) * 90, b.y + Math.sin(an) * 90];
    },
    update(w, m, dt, e, eAlive) { turret(w, m, dt, e, eAlive, false, 1.5, 28); },
  });

  BD.defineMinion('clone', {
    spawn(w, b, m, i, n, t, base) {
      Object.assign(m, { r: 22, hp: 1, maxHp: 1, life: 7, dir: i % 2 ? 1 : -1, cd: 0.6 + i * 0.5 });
      const an = base + (i % 2 ? 1 : -1) * 1.4;
      return [b.x + Math.cos(an) * 120, b.y + Math.sin(an) * 120];
    },
    update(w, m, dt, e, eAlive) { turret(w, m, dt, e, eAlive, true, 1.2, 22); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
