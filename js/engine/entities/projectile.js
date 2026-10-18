'use strict';
// 投射物與拋射物實體：生成、飛行、追蹤、撞牆 / 柱子、命中判定
(function (G) {
  const BD = G.BD, U = BD.U;
  const A = () => BD.ARENA;

  BD.spawnProj = function (w, src, owner, ang, a) {
    const r0 = (src.r || 10) + 4;
    w.projectiles.push({ team: owner.team, owner, x: src.x + Math.cos(ang) * r0, y: src.y + Math.sin(ang) * r0,
      vx: Math.cos(ang) * a.speed, vy: Math.sin(ang) * a.speed, r: a.r, dmg: a.dmg, posture: a.posture, kb: a.kb || 40,
      life: a.life || 2, homing: a.homing || 0, pierce: !!a.pierce, kind: a.kind, slow: a.slow, status: a.status, undodgeable: a.undodgeable, hitSet: new Set(), t: 0, alive: true, ret: a.ret || 0, back: false });
  };

  BD.updateProjectiles = function (w, dt) {
    for (const p of w.projectiles) {
      p.t += dt; p.life -= dt;
      // 迴旋：飛行 ret 秒後折返飛向施放者（去程與回程各可命中一次），碰到施放者即消失
      if (p.ret && p.t >= p.ret) {
        if (!p.back) { p.back = true; p.hitSet.clear(); }
        const o = p.owner, sp = Math.hypot(p.vx, p.vy), a = U.angTo(p, o);
        p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
        if (Math.hypot(o.x - p.x, o.y - p.y) < o.r + p.r) { p.alive = false; continue; }
      }
      if (p.homing) {
        const e = w.bosses[1 - p.team];
        if (e.state !== 'dead' && !BD.getMod(e, 'untargetable')) {
          const sp = Math.hypot(p.vx, p.vy), a = U.rotateToward(Math.atan2(p.vy, p.vx), U.angTo(p, e), p.homing * dt);
          p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
        }
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'swarm') {
        if (w.rng() < 0.6) { const sx = p.x + w.rng.range(-p.r, p.r), sy = p.y + w.rng.range(-p.r, p.r); BD.spawnFx(w, 'swarmtrail', sx, sy, { el: 'poison' }); }
        if (p.x < -p.r || p.y < -p.r || p.x > A().w + p.r || p.y > A().h + p.r) p.alive = false;
      } else {
        if (p.x < 0 || p.y < 0 || p.x > A().w || p.y > A().h) p.alive = false;
        for (const pl of A().pillars) if (Math.hypot(p.x - pl.x, p.y - pl.y) < pl.r + p.r) p.alive = false;
        if (!p.alive) BD.spawnFx(w, 'projwall', p.x, p.y, { el: BD.kindElement(p.kind, BD.fxElementOf(p.owner)) });
      }
      if (p.life <= 0) p.alive = false;
      if (!p.alive) continue;
      for (const u of w.enemiesOf(p.team)) {
        if (p.hitSet.has(u)) continue;
        if (Math.hypot(u.x - p.x, u.y - p.y) < u.r + p.r) {
          p.hitSet.add(u);
          w.damageUnit(p.owner, u, { dmg: p.dmg, posture: p.posture, kb: p.kb, kbAng: Math.atan2(p.vy, p.vx), slow: p.kind === 'ice' ? 0.8 : p.slow, status: p.status, undodgeable: p.undodgeable });
          if (!p.pierce) { p.alive = false; BD.spawnFx(w, 'projhit', p.x, p.y, { el: BD.kindElement(p.kind, BD.fxElementOf(p.owner)), angle: Math.atan2(p.vy, p.vx), dirHit: true }); break; }
        }
      }
    }
    w.projectiles = w.projectiles.filter((p) => p.alive);
  };

  // 拋射物（純視覺弧線；落點傷害由排程的爆炸處理）
  BD.updateLobs = function (w, dt) {
    for (const l of w.lobs) l.t += dt;
    w.lobs = w.lobs.filter((l) => l.t < l.dur);
  };
})(typeof window !== 'undefined' ? window : globalThis);
