'use strict';
// 投射物與拋射物實體：生成、飛行、追蹤、撞牆 / 柱子、命中判定
(function (G) {
  const BD = G.BD, U = BD.U;
  const A = () => BD.ARENA;

  BD.spawnProj = function (w, src, owner, ang, a) {
    if (BD.sfx) BD.sfx.proj(a.kind, a, owner); // 音效（僅瀏覽器）
    const r0 = (src.r || 10) + 4;
    // rehit：貫穿時每 rehit 秒可再命中同一目標；extra：併進命中參數（狩獵模式的弓用）；owner.onProj：施放者改寫剛射出的投射物（狩獵弓的瓶 / 誘導箭）
    const p = { team: owner.team, owner, x: src.x + Math.cos(ang) * r0, y: src.y + Math.sin(ang) * r0,
      vx: Math.cos(ang) * a.speed, vy: Math.sin(ang) * a.speed, r: a.r, dmg: a.dmg, posture: a.posture, kb: a.kb || 40,
      life: a.life || 2, homing: a.homing || 0, pierce: !!a.pierce, kind: a.kind, slow: a.slow, status: a.status, undodgeable: a.undodgeable, deflect: !!a.deflect, hitSet: new Set(), seq: w.projSeq = (w.projSeq | 0) + 1, t: 0, alive: true, ret: a.ret || 0, back: false,
      rehit: a.rehit || 0, reT: 0, extra: a.extra };
    w.projectiles.push(p);
    if (owner.onProj) owner.onProj(p, a);
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
        const e = w.foeOf(p.team, p);
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
        for (const pl of A().pillars) {
          if (Math.hypot(p.x - pl.x, p.y - pl.y) < pl.r + p.r) { p.alive = false; if (pl.tree) BD.projHitsTree(w, p, pl); break; }
        }
        if (p.alive) BD.projTerrain(w, p, dt);
        if (p.alive && w.walls && w.walls.length) BD.wallBlocks(w, p); // 犽宿的風牆
        if (!p.alive) BD.spawnFx(w, 'projwall', p.x, p.y, { el: BD.kindElement(p.kind, BD.fxElementOf(p.owner)) });
      }
      if (p.life <= 0) p.alive = false;
      if (!p.alive) continue;
      for (const u of w.enemiesOf(p.team)) {
        if (p.hitSet.has(u) && !(p.rehit && p.t >= p.reT)) continue;
        if (Math.hypot(u.x - p.x, u.y - p.y) < u.r + p.r) {
          p.hitSet.add(u); if (p.rehit) p.reT = p.t + p.rehit; // shortcut: 再命中計時整支共用，多目標時各目標不分開算；目前只有狩獵弓（單一 Boss）用
          if (w.damageUnit(p.owner, u, Object.assign({ proj: p, dmg: p.dmg, posture: p.posture, kb: p.kb, kbAng: Math.atan2(p.vy, p.vx), slow: p.kind === 'ice' ? 0.8 : p.slow, status: p.status, undodgeable: p.undodgeable }, p.extra)) === 'deflected') break; // 被太刀彈開：已改向並換隊，不再命中
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
