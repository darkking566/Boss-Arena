'use strict';
// 位移類動作：dash 衝刺（可帶判定 / 火痕）、blink 閃現、circle 繞目標疾奔、hide / land 躍起與落地、appear 背後現身
(function (G) {
  const BD = G.BD, U = BD.U, K = BD.K;

  function blinkTo(w, b, x, y) {
    const oldX = b.x, oldY = b.y;
    b.trail.push({ x: b.x, y: b.y, face: b.face, life: 0.4 });
    b.x = x; b.y = y; w.confine(b);
    BD.spawnFx(w, 'blink', oldX, oldY, { src: b, toX: b.x, toY: b.y });
  }
  function blinkDest(w, b, a) {
    const t = b.enemy;
    if (a.to === 'behind') {
      const ang = t.face + Math.PI + w.rng.range(-0.4, 0.4);
      return [t.x + Math.cos(ang) * (a.dist + t.r), t.y + Math.sin(ang) * (a.dist + t.r)];
    }
    let best = null, bestD = -1;
    for (let i = 0; i < 7; i++) {
      let ang;
      if (a.to === 'side') ang = U.angTo(b, t) + (w.rng() < 0.5 ? 1 : -1) * Math.PI / 2 + w.rng.range(-0.3, 0.3);
      else ang = U.angTo(t, b) + w.rng.range(-1.1, 1.1);
      const [x, y] = K.clampPt(b.x + Math.cos(ang) * a.dist, b.y + Math.sin(ang) * a.dist, b.r + 20);
      const d = Math.hypot(t.x - x, t.y - y) + (a.to === 'side' ? w.rng() * 200 : 0);
      if (d > bestD) { bestD = d; best = [x, y]; }
    }
    return best;
  }

  // 衝刺：每幀的移動與接觸判定在 Boss.updateSkill（inst.dash）
  BD.defineAction('dash', (w, b, inst, a) => {
    const ang = b.face + (a.dir === 'back' ? Math.PI : a.dir === 'side' ? (w.rng() < 0.5 ? 1 : -1) * Math.PI / 2 : 0), sp = a.dist / a.dur;
    inst.dash = { vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, t: 0, dur: a.dur, hit: a.hit, hitSet: new Set(), trail: a.trail || null };
    if (a.iframe) BD.applyStatus(b, 'iframe', { dur: a.dur + 0.05 }, w);
    const P = BD.parseFx(a.fx);
    const x0 = b.x, y0 = b.y;
    if (P && P.id === 'dash') {
      BD.spawnFx(w, a.fx, b.x, b.y, { src: b, el: a.fxEl, angle: ang, len: a.dist, dur: a.dur });
    } else {
      BD.spawnFx(w, 'dash', b.x, b.y, { src: b, el: a.fxEl, angle: ang, len: a.dist, dur: a.dur });
      if (a.fx) {
        BD.spawnFx(w, a.fx, x0, y0, { src: b, el: a.fxEl, angle: ang, len: a.dist, dur: a.dur, dmg: a.hit && a.hit.dmg });
      }
    }
    BD.traitHook(b, 'onDash', w, b, x0, y0, ang, a);
  }, { active: true, duration: true });

  BD.defineAction('blink', (w, b, inst, a) => { const [x, y] = blinkDest(w, b, a); blinkTo(w, b, x, y); b.face = U.angTo(b, b.enemy); }, { active: true });

  // 繞圈疾奔：每幀的移動、火痕與接觸判定在 Boss.updateSkill（inst.circle）
  BD.defineAction('circle', (w, b, inst, a, tgt) => {
    const m = inst.marks[a.mark] || { x: tgt.x, y: tgt.y };
    inst.circle = { cx: m.x, cy: m.y, r: a.r, dur: a.dur, t: 0, a0: Math.atan2(b.y - m.y, b.x - m.x), d0: Math.hypot(b.x - m.x, b.y - m.y),
      dir: w.rng() < 0.5 ? 1 : -1, trail: a.trail, hit: a.hit, hitSet: new Set() };
    BD.spawnFx(w, 'dash', b.x, b.y, { src: b, dur: a.dur });
  }, { active: true, duration: true });

  BD.defineAction('hide', (w, b, inst, a) => {
    BD.applyStatus(b, 'hidden', {}, w); BD.applyStatus(b, 'invuln', { dur: 0.2 }, w);
    BD.spawnFx(w, a.fx || 'vanish', b.x, b.y, { src: b, el: a.fxEl });
  });

  BD.defineAction('land', (w, b, inst, a) => {
    const m = inst.marks[a.mark] || { x: b.x, y: b.y };
    b.x = m.x; b.y = m.y; BD.removeStatus(b, 'hidden', 'appear', w); w.confine(b); b.face = U.angTo(b, b.enemy); b.vx = b.vy = 0;
  }, { active: true });

  BD.defineAction('appear', (w, b, inst, a) => {
    const t = b.enemy, ang = t.face + Math.PI;
    const [x, y] = K.clampPt(t.x + Math.cos(ang) * (a.dist + t.r), t.y + Math.sin(ang) * (a.dist + t.r), b.r + 10);
    b.x = x; b.y = y; BD.removeStatus(b, 'hidden', 'appear', w); w.confine(b); b.face = U.angTo(b, t);
    BD.spawnFx(w, 'appear', b.x, b.y, { src: b });
  }, { active: true });
})(typeof window !== 'undefined' ? window : globalThis);
