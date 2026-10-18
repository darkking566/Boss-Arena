'use strict';
// 投射類動作：proj 直線 / 放射投射物、lob 拋射爆炸、rain 天降隕石雨
(function (G) {
  const BD = G.BD, U = BD.U, K = BD.K;

  function explodeAt(w, src, x, y, a) {
    const s = { kind: 'circle', x, y, r: a.r };
    w.applyArea(src, s, { dmg: a.dmg, posture: a.posture, kb: a.kb, slow: a.slow, root: a.root, status: a.status });
    BD.spawnFx(w, 'explode', x, y, { src: src, el: BD.kindElement(a.kind, BD.fxElementOf(src)), radius: a.r, dmg: a.dmg });
    if (a.zone) BD.makeZone(w, src.owner || src, x, y, a.zone);
  }
  function lobOne(w, b, x0, y0, x1, y1, a, sky) {
    const s = { kind: 'circle', x: x1, y: y1, r: a.r };
    K.addTele(w, b, null, s, a.flight, { detached: true, color: a.kind === 'acid' ? '#9be15d' : '#ff7a2e' });
    w.lobs.push({ x0, y0, x1, y1, t: 0, dur: a.flight, kind: a.kind, sky: !!sky });
    w.later(a.flight, () => explodeAt(w, b, x1, y1, a));
  }

  BD.defineAction('proj', (w, b, inst, a) => {
    for (let i = 0; i < a.n; i++) {
      let ang;
      if (a.radial) ang = i * U.TAU / a.n + (a.angOff || 0);
      else ang = b.face + (a.angOff || 0) + (i - (a.n - 1) / 2) * (a.spread || 0);
      BD.spawnProj(w, b, b, ang, a);
    }
    if (a.kind === 'swarm') { w.fx.shake(10); }
  }, { active: true });

  BD.defineAction('lob', (w, b, inst, a, tgt) => {
    const lead = a.lead || 0;
    const [cx, cy] = K.clampPt(tgt.x + (tgt.vx || 0) * lead, tgt.y + (tgt.vy || 0) * lead);
    for (let i = 0; i < a.n; i++) {
      let x = cx, y = cy;
      if (i > 0) { const an = w.rng() * U.TAU, rr = Math.sqrt(w.rng()) * a.scatter + a.scatter * 0.3; x += Math.cos(an) * rr; y += Math.sin(an) * rr; }
      [x, y] = K.clampPt(x, y);
      lobOne(w, b, b.x, b.y, x, y, Object.assign({}, a, { flight: a.flight + i * 0.08 }));
    }
  }, { active: true });

  BD.defineAction('rain', (w, b, inst, a) => {
    for (let i = 0; i < a.n; i++) {
      w.later(w.rng() * a.dur, () => {
        const t = b.enemy; let x, y;
        if (w.rng() < 0.4) { x = t.x + (t.vx || 0) * 0.6; y = t.y + (t.vy || 0) * 0.6; }
        else { x = t.x + w.rng.range(-a.area, a.area) * 0.7; y = t.y + w.rng.range(-a.area, a.area) * 0.7; }
        [x, y] = K.clampPt(x, y);
        lobOne(w, b, x - 200, y - 700, x, y, a, true);
      });
    }
  }, { active: true });
})(typeof window !== 'undefined' ? window : globalThis);
