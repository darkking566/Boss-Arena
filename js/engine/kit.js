'use strict';
// 引擎共用小工具：位置夾限、安全點、形狀解析、預警（telegraph）建立與更新、命中特效
(function (G) {
  const BD = G.BD, U = BD.U;
  const A = () => BD.ARENA;

  function clampPt(x, y, m) { m = m || 30; return [U.clamp(x, m, A().w - m), U.clamp(y, m, A().h - m)]; }
  // 安全圈位置：預設離目標約 520px。無法閃避的安全圈（翻滾躲不掉）改以目標的走速估算可及距離，
  // 讓慢速巨型 Boss 在預警時間內也走得到（亂數消耗次數不變）
  function pickSafe(w, b, a) {
    const t = b.enemy; let best = null, bestScore = -1e9;
    let want = 520;
    if (a && a.undodgeable && a.dur && t.speed) want = U.clamp(t.speed() * Math.max(0.6, a.dur - 0.6) * 0.95 + (a.r || 0) * 0.6, 240, 520);
    for (let i = 0; i < 40; i++) {
      const x = w.rng.range(150, A().w - 150), y = w.rng.range(150, A().h - 150);
      if (A().pillars.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + 70)) continue;
      const d = Math.hypot(t.x - x, t.y - y);
      const score = -Math.abs(d - want) + w.rng() * 60;
      if (score > bestScore) { bestScore = score; best = { x, y }; }
    }
    return best || { x: A().w / 2, y: A().h / 2 };
  }
  function resolveShape(w, b, inst, a) {
    let x, y, ang;
    const anchor = a.anchor || 'self';
    if (anchor === 'self') {
      ang = b.face + (a.angOff || 0); const off = a.off || 0;
      x = b.x + Math.cos(ang) * off; y = b.y + Math.sin(ang) * off;
    } else if (anchor === 'target') {
      const t = b.aimTarget(), lead = a.lead || 0;
      [x, y] = clampPt(t.x + (t.vx || 0) * lead, t.y + (t.vy || 0) * lead, 20);
      ang = U.angTo(b, { x, y });
    } else if (anchor === 'mark') {
      const m = inst.marks[a.mark] || { x: b.x, y: b.y, ang: b.face };
      x = m.x; y = m.y; ang = m.ang;
    } else if (anchor === 'safe') {
      const p = pickSafe(w, b, a); x = p.x; y = p.y; ang = 0;
    }
    if (a.setMark) inst.marks[a.setMark] = { x, y, ang };
    return { kind: a.shape, x, y, ang, r: a.r, r0: a.r0, arc: a.arc, len: a.len, w: a.w };
  }
  function shapeCenter(s) {
    if (s.kind === 'rect') return { x: s.x + Math.cos(s.ang) * s.len / 2, y: s.y + Math.sin(s.ang) * s.len / 2 };
    if (s.kind === 'cone') return { x: s.x + Math.cos(s.ang) * s.r * 0.55, y: s.y + Math.sin(s.ang) * s.r * 0.55 };
    return { x: s.x, y: s.y };
  }
  BD.resolveShape = resolveShape;

  function addTele(w, b, inst, shape, dur, opts) {
    const t = Object.assign({ id: w.nextId++, team: b.team, owner: b, inst, shape, t: 0, dur, hitIn: dur, follow: false, lockBefore: 0.2,
      color: b.def.color, detached: false, soft: false, a: null }, opts || {});
    w.telegraphs.push(t); return t;
  }
  BD.addTele = addTele;

  // 命中特效：委派至特效庫 BD.spawnFx；未指定 fx 時預設在中心產生 projhit
  function hitFx(w, b, s, spec, opts) {
    if (!spec) {
      const c = shapeCenter(s);
      BD.spawnFx(w, 'projhit', c.x, c.y, Object.assign({ src: b }, opts));
      return;
    }
    const P = BD.parseFx(spec);
    let pts;
    if (P && (P.id === 'domain' || P.id === 'absolutezero')) {
      pts = [];
      for (let i = 0; i < 40; i++) pts.push(w.rng.range(0, A().w), w.rng.range(0, A().h));
    }
    const o = Object.assign({ src: b, angle: s.ang, arc: s.arc, radius: s.r, r0: s.r0, len: s.len, width: s.w, shape: s.kind }, opts);
    if (pts) o.pts = pts;
    BD.spawnFx(w, spec, s.x, s.y, o);
  }

  // 每幀更新預警：跟隨中的預警在鎖定前持續追蹤；技能被打斷時移除非獨立預警
  function updateTelegraphs(w, dt) {
    for (const t of w.telegraphs) {
      t.t += dt;
      if (t.follow && t.a && t.owner.inst === t.inst && (t.dur - t.t) > t.lockBefore) t.shape = resolveShape(w, t.owner, t.inst, t.a);
    }
    w.telegraphs = w.telegraphs.filter((t) => t.t < t.dur && !(t.inst && t.inst.cancelled && !t.detached));
  }
  BD.updateTelegraphs = updateTelegraphs;
  BD.K = { clampPt, pickSafe, resolveShape, shapeCenter, addTele, hitFx };
})(typeof window !== 'undefined' ? window : globalThis);
