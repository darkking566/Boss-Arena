'use strict';
// 腐沼母巢的召喚物：spider 幼蟲（追蹤自爆）、egg 卵囊（拋出後孵化成兩隻幼蟲）
(function (G) {
  const BD = G.BD, U = BD.U, K = BD.K;

  function spiderBoom(w, m) {
    if (!m.alive) return;
    w.applyArea(m, { kind: 'circle', x: m.x, y: m.y, r: 58 }, { dmg: m.owner.phase === 2 ? 55 : 45, posture: 18, kb: 220 });
    BD.spawnFx(w, 'burst', m.x, m.y, { el: 'poison', radius: 58, src: m.owner });
    m.alive = false;
  }

  BD.defineMinion('spider', {
    threat: true,
    spawn(w, b, m, i, n, t, base) {
      Object.assign(m, { r: b.phase === 2 ? 13 : 11, hp: 45, maxHp: 45, life: 7, speed: b.phase === 2 ? 210 : 180, wob: w.rng() * 10 });
      const an = base + (i - (n - 1) / 2) * 0.5;
      m.vx = Math.cos(an) * 260; m.vy = Math.sin(an) * 260;
      return [b.x + Math.cos(an) * (b.r + 16), b.y + Math.sin(an) * (b.r + 16)];
    },
    update(w, m, dt, e, eAlive) {
      if (m.fuse >= 0) { m.fuse -= dt; m.vx *= 0.8; m.vy *= 0.8; if (m.fuse <= 0) { spiderBoom(w, m); return true; } }
      else if (eAlive && !BD.getMod(e, 'untargetable')) {
        const a = U.angTo(m, e) + Math.sin(m.t * 6 + m.wob) * 0.5;
        m.face = a;
        m.vx += (Math.cos(a) * m.speed - m.vx) * Math.min(1, 6 * dt); m.vy += (Math.sin(a) * m.speed - m.vy) * Math.min(1, 6 * dt);
        if (U.dist(m, e) < m.r + e.r + 10) {
          m.fuse = 0.4;
          K.addTele(w, m.owner, null, { kind: 'circle', x: m.x, y: m.y, r: 58 }, 0.4, { detached: true, color: '#9be15d', follow: false });
        }
      } else { m.vx *= 0.9; m.vy *= 0.9; }
      if (m.t > m.life) { spiderBoom(w, m); return true; }
    },
  });

  BD.defineMinion('egg', {
    spawn(w, b, m, i, n, t, base) {
      Object.assign(m, { r: 16, hp: 70, maxHp: 70, life: 2.8 });
      const f = w.rng.range(0.3, 0.7), off = w.rng.range(-200, 200), pa = base + Math.PI / 2;
      const x = U.lerp(b.x, t.x, f) + Math.cos(pa) * off, y = U.lerp(b.y, t.y, f) + Math.sin(pa) * off;
      w.lobs.push({ x0: b.x, y0: b.y, x1: x, y1: y, t: 0, dur: 0.5, kind: 'egg' });
      return [x, y];
    },
    update(w, m) {
      if (m.t > m.life) {
        m.alive = false; BD.spawnFx(w, 'burst', m.x, m.y, { el: 'poison', src: m.owner });
        for (let i = 0; i < 2; i++) {
          const s = { kind: 'spider', team: m.team, owner: m.owner, dmgMul: m.dmgMul, alive: true, t: 0, r: 11, hp: 40, maxHp: 40, life: 6, speed: 200,
            wob: w.rng() * 10, x: m.x + (i ? 12 : -12), y: m.y, vx: 0, vy: 0, hurt: 0, fuse: -1, face: 0 };
          w.minions.push(s);
        }
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
