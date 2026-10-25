'use strict';
// 地面類動作：zone 持續傷害區域、trap 陷阱、erupt 連續噴發柱；以及區域 / 陷阱的每幀更新與火痕（trail）
(function (G) {
  const BD = G.BD, U = BD.U, K = BD.K;
  const A = () => BD.ARENA;

  function makeZone(w, owner, x, y, z) {
    w.zones.push({ team: owner.team, owner, x, y, r: z.r, dur: z.dur, dps: z.dps, slow: !!z.slow, kind: z.kind, delay: z.delay || 0, status: z.status, t: 0, tick: 0, seed: BD.vrng() * 100 });
  }
  BD.makeZone = makeZone;
  // 衝刺 / 繞圈時沿路留下區域（例如火痕）
  BD.dropTrail = function (w, b, d) {
    if (d.lx == null) { d.lx = b.x; d.ly = b.y; }
    if (Math.hypot(b.x - d.lx, b.y - d.ly) >= d.trail.r * 1.1) {
      d.lx = b.x; d.ly = b.y; makeZone(w, b, b.x, b.y, d.trail);
      BD.spawnFx(w, 'trail', b.x, b.y, { src: b, el: BD.kindElement(d.trail.kind, BD.fxElementOf(b)) });
    }
  };

  BD.defineAction('zone', (w, b, inst, a, tgt) => {
    const pts = [];
    if (a.pattern === 'self') pts.push([b.x, b.y]);
    else if (a.pattern === 'at') pts.push(K.clampPt(tgt.x + (tgt.vx || 0) * (a.lead || 0), tgt.y + (tgt.vy || 0) * (a.lead || 0)));
    else if (a.pattern === 'flank') {
      const base = U.angTo(b, tgt);
      const offs = [Math.PI / 2, -Math.PI / 2, 0];
      for (let i = 0; i < a.n; i++) {
        const an = base + offs[i % 3] + w.rng.range(-0.3, 0.3);
        pts.push(K.clampPt(tgt.x + Math.cos(an) * (a.off || 130), tgt.y + Math.sin(an) * (a.off || 130)));
      }
    }
    for (const [x, y] of pts) {
      makeZone(w, b, x, y, a);
      K.addTele(w, b, null, { kind: 'circle', x, y, r: a.r }, a.delay || 0.3, { detached: true, color: b.def.color });
    }
  }, { active: true });

  BD.defineAction('trap', (w, b, inst, a, tgt) => {
    for (let i = 0; i < a.n; i++) {
      let x, y;
      if (a.pattern === 'around') {
        const an = (i / a.n) * U.TAU + w.rng.range(0, 1);
        x = tgt.x + Math.cos(an) * (a.off || 125); y = tgt.y + Math.sin(an) * (a.off || 125);
      } else {
        const f = 0.3 + (i + 0.5) / a.n * 0.6, ang = U.angTo(b, tgt) + Math.PI / 2, off = w.rng.range(-110, 110);
        x = U.lerp(b.x, tgt.x, f) + Math.cos(ang) * off; y = U.lerp(b.y, tgt.y, f) + Math.sin(ang) * off;
      }
      [x, y] = K.clampPt(x, y);
      w.traps.push({ team: b.team, owner: b, kind: a.kind, x, y, trig: 30, r: a.r, dmg: a.dmg, slow: a.slow, root: a.root, status: a.status, arm: a.arm, life: a.life, t: 0, undodgeable: a.undodgeable });
      BD.spawnFx(w, 'trapset', x, y, { src: b, el: BD.kindElement(a.kind, BD.fxElementOf(b)) });
    }
  }, { active: true });

  BD.defineAction('erupt', (w, b, inst, a) => {
    const ang = b.face, x0 = b.x, y0 = b.y;
    for (let i = 0; i < a.n; i++) {
      w.later(i * a.interval, () => {
        const d = a.start + i * a.step, x = x0 + Math.cos(ang) * d, y = y0 + Math.sin(ang) * d;
        if (x < 0 || y < 0 || x > A().w || y > A().h) return;
        const s = { kind: 'circle', x, y, r: a.r };
        w.applyArea(b, s, { dmg: a.dmg, posture: a.posture, kb: a.kb, status: a.status });
        BD.spawnFx(w, a.fx || 'erupt', x, y, { src: b, el: a.fxEl, radius: a.r, dmg: a.dmg });
      });
    }
  }, { active: true });

  BD.updateZones = function (w, dt) {
    for (const z of w.zones) {
      z.t += dt;
      if (z.t < z.delay) continue;
      z.tick -= dt;
      if (z.tick <= 0) {
        z.tick = 0.4;
        BD.spawnFx(w, 'ambient', z.x, z.y, { el: BD.kindElement(z.kind, BD.fxElementOf(z.owner)), radius: z.r });
        for (const u of w.enemiesOf(z.team)) {
          if (Math.hypot(u.x - z.x, u.y - z.y) < z.r + u.r * 0.4) {
            w.damageUnit(z.owner, u, { dmg: z.dps * 0.4, posture: 2, dot: true, unblockable: true, slow: z.slow ? 0.6 : 0, status: z.status });
          }
        }
      }
    }
    w.zones = w.zones.filter((z) => z.t < z.dur + z.delay);
  };

  BD.updateTraps = function (w, dt) {
    for (const tr of w.traps) {
      tr.t += dt;
      if (tr.t < tr.arm) continue;
      for (const e of w.foes(tr.team)) {
        if (e.state !== 'dead' && !BD.getMod(e, 'untargetable') && Math.hypot(e.x - tr.x, e.y - tr.y) < tr.trig + e.r) {
          tr.dead = true;
          w.applyArea(tr.owner, { kind: 'circle', x: tr.x, y: tr.y, r: tr.r }, { dmg: tr.dmg, posture: 20, slow: tr.slow, root: tr.root, kb: tr.kind === 'mine' ? 200 : 0, unblockable: true, undodgeable: tr.undodgeable, status: tr.status });
          BD.spawnFx(w, 'trapburst', tr.x, tr.y, { src: tr.owner, radius: tr.r, el: tr.kind === 'mine' ? 'ice' : 'physical' });
          if (tr.root && (tr.undodgeable || !BD.getMod(e, 'iframe')) && !BD.getMod(e, 'invuln')) w.fx.text(e.x, e.y - e.r - 26, '被蛛網纏住！', '#eee', 16);
          break;
        }
      }
    }
    w.traps = w.traps.filter((t) => !t.dead && t.t < t.life);
  };
})(typeof window !== 'undefined' ? window : globalThis);
