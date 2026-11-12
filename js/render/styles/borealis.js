'use strict';
// 自繪冰龍。依已查看的概念圖與遊戲畫面：兩翼肢＋兩後腿、額前長角、深鱗與霜白碎片。
// 姿勢讀實際時間軸，沉重節奏不硬編秒數；靜態材質以 R.blit 快取。
(function (G) {
  const BD = G.BD, R = BD.Render, U = BD.U, TAU = U.TAU;
  const INK = '#27343c', SCALE = '#5a6871', MEMBRANE = '#553d42', WHITE = '#d7e5e6', ICE = '#9bd8ed';
  const cl = v => U.clamp(v, 0, 1), ease = v => { v = cl(v); return v * v * (3 - 2 * v); };
  const idOf = a => typeof a.fx === 'string' ? a.fx : a.fx && a.fx.id;
  const CACHE = new WeakMap();
  function info(inst) {
    let v = CACHE.get(inst.v); if (v) return v;
    const hits = inst.v.actions.filter(a => a.do === 'hit');
    v = { hits, breath: hits.filter(a => ['borealisbreath', 'borealisdownbreath', 'borealiscommunion'].includes(idOf(a))),
      roar: hits.filter(a => idOf(a) === 'borealisroar'), hide: inst.v.actions.filter(a => a.do === 'hide'),
      land: inst.v.actions.filter(a => a.do === 'land'), dash: inst.v.actions.filter(a => a.do === 'dash') };
    CACHE.set(inst.v, v); return v;
  }
  function breathAngle(list, t) {
    if (t <= list[0].at) return list[0].angOff || 0;
    for (let i = 1; i < list.length; i++) if (t < list[i].at) { const a = list[i - 1], b = list[i], q = (t - a.at) / (b.at - a.at); return U.lerp(a.angOff || 0, b.angOff || 0, q); }
    return list[list.length - 1].angOff || 0;
  }
  function elevation(o) {
    if (!o.inst) return 0;
    const inst = o.inst, I = info(inst), t = inst.t, id = inst.skill.id;
    if (['retreat_breath', 'aerial_breath', 'borealis_mist'].includes(id) && I.breath.length) {
      const first = I.breath[0].at, last = I.breath[I.breath.length - 1].at;
      if (t < first) return ease(t / first) * (id === 'retreat_breath' ? 0.6 : 1);
      return (t <= last ? 1 : 1 - ease((t - last) / 0.55)) * (id === 'retreat_breath' ? 0.6 : 1);
    }
    if (id === 'ult' && I.dash.length) {
      const a = I.dash[0], u = cl((t - a.at + 0.25) / (a.dur + 0.5));
      return Math.sin(u * Math.PI) * 0.95;
    }
    return 0;
  }
  function pose(o, t, st, airborne) {
    const P = { spread: [0.28, 0.28], flap: [0, 0], sweep: [0, 0], lift: [0, 0], reach: 1, yaw: Math.sin(t * 0.75) * 0.1,
      jaw: 0.035, curl: Math.sin(t * 0.7) * 0.14, spin: 0, dip: 1, glow: o.phase === 2 ? 1 : 0, cold: 0, tuck: airborne ? 1 : 0 };
    const wings = (s, f, w) => { P.spread = [s, s]; P.flap = [f, f]; P.sweep = [w || 0, w || 0]; };
    if (Math.hypot(o.vx || 0, o.vy || 0) > 30 && !airborne) {
      const walk = Math.sin(t * 8); P.flap = [walk * 0.15, -walk * 0.15]; P.sweep = [walk * 0.12, -walk * 0.12];
      P.lift = [Math.max(0, walk) * 0.22, Math.max(0, -walk) * 0.22]; P.dip = 1 + Math.abs(walk) * 0.012;
    }
    if (airborne) wings(0.95, Math.sin(t * 7) * 0.78, 0.05);
    if (['stun', 'stagger', 'knockdown'].includes(st)) { wings(0.55, -0.2, -0.2); P.reach = 0.8; P.jaw = 0.13; P.dip = 0.94; }
    if (st === 'transition') {
      const q = cl((o.stateT || 0) / (o.def.phase2.roarAt || 1.85));
      wings(0.3 + ease(q) * 0.65, Math.sin(t * 18) * 0.04, -0.12); P.reach = 0.8 + ease(q) * 0.4; P.jaw = 0.06 + q * 0.27;
      P.glow = q; P.cold = q; P.dip = 0.95 + 0.08 * q;
    }
    const inst = o.inst; if (!inst) return P;
    const I = info(inst), T = inst.t, id = inst.skill.id, p = R.skillPace(inst, { hit: 1 }), load = ease(p.wind / 0.83);
    if (id === 'ice_bite' || (id === 'tail_whip' && p.i > 0)) {
      P.reach = p.snap > 0 ? 1.22 - p.snap * 0.1 : 1 - load * 0.25 + Math.max(0, (p.wind - 0.83) / 0.17) * 0.5;
      P.yaw = (1 - p.snap) * 0.14; P.jaw = p.snap > 0 ? 0.06 : load * 0.27; P.dip = 1 - p.snap * 0.035;
    } else if (id === 'ice_stomp') {
      P.lift[1] = p.snap > 0 ? 0 : load; P.flap[1] = load * 0.6; P.spread[1] = 0.3 + load * 0.3;
      P.dip = p.snap > 0 ? 1 - p.snap * 0.07 : 1 + load * 0.025; P.spin = -load * 0.06;
    } else if (id === 'wing_sweep') {
      P.spread[1] = 0.3 + load * 0.7; P.flap[1] = p.snap > 0 ? -0.75 * p.snap : load * 0.85;
      P.sweep[1] = p.snap > 0 ? p.snap * 0.45 : -load * 0.45; P.spin = -0.08 * load;
    } else if (id === 'tail_whip' && I.hits[0]) {
      const q = ease(T / (I.hits[0].at + 0.18)); P.spin = TAU * q; P.curl = -Math.sin(q * Math.PI) * 1.6; P.yaw = -0.25; wings(0.3, 0, -0.2);
    }
    if (I.breath.length) {
      const b0 = I.breath[0].at, b1 = I.breath[I.breath.length - 1].at + 0.3;
      if (T <= b1) {
        const c = T < b0 ? ease(T / b0) : 1 - ease((T - b1 + 0.3) / 0.3);
        P.cold = c; P.jaw = 0.08 + c * 0.24; P.reach = T < b0 ? 1 - c * 0.22 : 1 + c * 0.11;
        P.yaw = breathAngle(I.breath, T); if (!airborne) wings(0.45, -0.05, -0.08);
      }
    }
    if (I.roar.length && T <= I.roar[I.roar.length - 1].at + 0.3) {
      const q = ease(T / I.roar[0].at); P.reach = 0.82 + q * 0.35; P.yaw = 0; P.jaw = 0.05 + q * 0.36;
      wings(0.4 + q * 0.55, Math.sin(t * 20) * 0.06, -0.15); P.dip = 1 + q * 0.03; P.cold = q;
    }
    if (I.hide.length && T < I.hide[0].at && !I.land.some(a => a.at <= T)) { wings(0.7, -0.55, -0.2); P.dip = 0.93; P.reach = 0.9; } // 起飛前一蹲
    for (const h of I.hits) if (h.shape === 'ring' && T >= h.at - 0.3 && T < h.at + 0.3) { // 外擴冰環：雙翼高舉 → 拍下
      const q = cl((T - h.at + 0.3) / 0.3), d = cl((T - h.at) / 0.3); wings(0.95, T < h.at ? 0.7 * q : -0.7 * (1 - d), 0); P.dip = T < h.at ? 1 + 0.04 * q : 1 - 0.05 * (1 - d); P.jaw = 0.2; P.cold = Math.max(P.cold, 0.6);
    }
    const landed = I.land.filter(a => T >= a.at && T < a.at + 0.5).pop();
    if (landed) { const q = ease((T - landed.at) / 0.5); wings(1 - q * 0.7, -0.65 * (1 - q), 0.1); P.dip = 0.9 + q * 0.1; P.jaw = 0.2 * (1 - q); P.tuck = 0; }
    return P;
  }
  function plate(g, x, y, len, angle, width) {
    g.save(); g.translate(x, y); g.rotate(angle); g.fillStyle = WHITE; g.strokeStyle = '#728e9d'; g.lineWidth = Math.max(0.6, width * 0.1);
    g.beginPath(); g.moveTo(0, -width * 0.5); g.lineTo(len * 0.7, -width * 0.2); g.lineTo(len, 0); g.lineTo(len * 0.4, width * 0.3); g.lineTo(0, width * 0.45); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = '#f4ffff'; g.lineWidth = Math.max(0.5, width * 0.1); g.beginPath(); g.moveTo(len * 0.15, -width * 0.25); g.lineTo(len * 0.9, 0); g.stroke(); g.restore();
  }
  function wing(g, r, shadow, phase) {
    R.blit(g, 'borealis:wing:' + r + ':' + shadow + ':' + phase, r * 4.6, r * 3.9, r * 2.6, r * 0.3, c => {
      const wrist = [r * 0.52, r * 1.2], tip = [-r * 0.06, r * 3.1];
      const path = () => { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(r * 0.5, r * 0.45, ...wrist); c.lineTo(...tip);
        for (let i = 0; i <= 14; i++) { const u = i / 14, x = -r * (0.06 + 1.5 * u) - Math.sin(u * Math.PI) * r * 0.2, y = r * (3.1 - 2.95 * u); c.lineTo(x, y); c.lineTo(x - r * (0.12 + 0.08 * Math.sin(i * 2.1)), y - r * 0.08); } c.lineTo(-r * 0.5, 0); c.closePath(); };
      if (shadow) { c.fillStyle = '#000'; path(); c.fill(); return; }
      const gr = c.createLinearGradient(0, 0, -r, r * 3); gr.addColorStop(0, INK); gr.addColorStop(0.52, '#59666c'); gr.addColorStop(1, '#26343f');
      c.fillStyle = gr; path(); c.fill(); c.strokeStyle = '#18272f'; c.lineWidth = r * 0.025; c.stroke();
      for (let i = 0; i < 5; i++) {
        const ex = -r * (0.1 + i * 0.35), ey = r * (3 - i * 0.64);
        c.fillStyle = i % 2 ? 'rgba(109,63,66,0.45)' : 'rgba(22,35,44,0.35)';
        c.beginPath(); c.moveTo(...wrist); c.lineTo(ex, ey); c.lineTo(ex - r * 0.3, ey - r * 0.45); c.closePath(); c.fill();
        c.strokeStyle = '#91a2a6'; c.lineWidth = r * 0.045; c.beginPath(); c.moveTo(...wrist); c.lineTo(ex, ey); c.stroke();
        for (let j = 0; j < 10; j++) { const u = (j + 0.3) / 10; plate(c, U.lerp(wrist[0], ex, u), U.lerp(wrist[1], ey, u), r * (0.17 + 0.22 * u), Math.PI + 0.25 * i, r * 0.035); }
      }
      // 成片的霜殼留在膜面與骨架上，破片間仍有暗紅膜；不只靠細線表示覆霜。
      for (let i = 0; i < 100; i++) {
        const u = (i * 0.618) % 1, v = (i * 0.413) % 1;
        const x = -r * (0.12 + 1.45 * u) + r * 0.5 * (1 - v), y = r * (2.95 - u * 2.7) * (0.66 + v * 0.32);
        c.fillStyle = ['#a8bfc6', '#c2d4d7', '#d4e1e0', '#829ba7'][i % 4];
        c.beginPath(); c.moveTo(x, y - r * 0.055); c.lineTo(x - r * (0.15 + v * 0.18), y - r * 0.01); c.lineTo(x - r * (0.28 + v * 0.21), y + r * 0.045); c.lineTo(x - r * 0.08, y + r * 0.075); c.closePath(); c.fill();
      }
      // 被霜覆住的破膜纖維：長短交錯，下面仍露出深膜，沒有整片塗白。
      for (let i = 0; i < 110; i++) {
        const u = (i * 0.618) % 1, v = (i * 0.377) % 1;
        const x = -r * (0.15 + 1.4 * u) + r * 0.6 * (1 - v), y = r * (3 - u * 2.8) * (0.55 + v * 0.42);
        plate(c, x, y, r * (0.12 + 0.3 * v), Math.PI * (0.85 + u * 0.16), r * (0.022 + 0.033 * v));
      }
      c.strokeStyle = '#798c96'; c.lineWidth = r * 0.16; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(r * 0.5, r * 0.45, ...wrist); c.lineTo(...tip); c.stroke();
      c.strokeStyle = '#c5d8da'; c.lineWidth = r * 0.045; c.stroke();
      for (let i = 0; i < 23; i++) { const u = i / 23; plate(c, U.lerp(wrist[0], tip[0], u), U.lerp(wrist[1], tip[1], u), r * (0.14 + 0.1 * (i % 3)), -0.55, r * 0.028); }
      for (const [x, y] of [wrist, tip]) { c.fillStyle = '#3b4549'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + r * 0.34, y - r * 0.05); c.lineTo(x + r * 0.12, y + r * 0.13); c.closePath(); c.fill(); plate(c, x + r * 0.06, y, r * 0.23, 0, r * 0.07); }
      if (phase === 2) { c.strokeStyle = 'rgba(178,231,250,0.6)'; c.lineWidth = r * 0.03; path(); c.stroke(); }
    });
  }
  function torso(g, r, shadow) {
    R.blit(g, 'borealis:torso:' + r + ':' + shadow, r * 2.8, r * 1.8, r * 1.5, r * 0.9, c => {
      if (shadow) c.fillStyle = '#000'; else { const gr = c.createLinearGradient(0, -r * 0.6, 0, r * 0.6); gr.addColorStop(0, INK); gr.addColorStop(0.45, SCALE); gr.addColorStop(1, '#192b34'); c.fillStyle = gr; }
      c.beginPath(); c.ellipse(-r * 0.12, 0, r, r * 0.53, 0, 0, TAU); c.fill(); if (shadow) return;
      for (let i = 0; i < 105; i++) { const u = (i * 0.618) % 1, v = ((i * 0.381) % 1) * 2 - 1, x = -r + r * 1.8 * u, y = v * r * 0.44 * Math.sqrt(Math.max(0, 1 - (x / r) ** 2)); c.fillStyle = i % 3 ? '#34454f' : '#9cadb0'; c.beginPath(); c.ellipse(x, y, r * 0.06, r * 0.034, 0, 0, TAU); c.fill(); }
      for (let i = 0; i < 42; i++) { const u = (i * 0.618) % 1, v = ((i * 0.37) % 1) * 2 - 1, x = -r * 0.8 + u * r * 1.5, y = v * r * 0.35; c.fillStyle = i % 3 ? '#a6bdc4' : '#6f8b98'; c.beginPath(); c.moveTo(x, y - r * 0.04); c.lineTo(x - r * 0.2, y - r * 0.065); c.lineTo(x - r * 0.3, y + r * 0.035); c.lineTo(x + r * 0.03, y + r * 0.075); c.closePath(); c.fill(); }
      for (let i = 0; i < 48; i++) { const u = (i * 0.618) % 1, v = ((i * 0.37) % 1) * 2 - 1; plate(c, -r * 0.85 + u * r * 1.6, v * r * 0.4, r * (0.1 + 0.16 * ((i % 7) / 7)), Math.PI + v * 0.7, r * 0.028); }
    });
  }
  function head(g, r, jaw, shadow) {
    if (!shadow) { g.fillStyle = '#181c24'; g.beginPath(); g.moveTo(-r * 0.06, -r * 0.12); g.quadraticCurveTo(r * 0.35, -r * (0.16 + jaw * 0.5), r * 0.78, -r * 0.08); g.lineTo(r * 0.87, 0); g.lineTo(r * 0.78, r * 0.08); g.quadraticCurveTo(r * 0.35, r * (0.16 + jaw * 0.5), -r * 0.06, r * 0.12); g.closePath(); g.fill();
      g.fillStyle = MEMBRANE; g.beginPath(); g.ellipse(r * 0.4, 0, r * 0.34, r * (0.035 + jaw * 0.22), 0, 0, TAU); g.fill(); }
    R.blit(g, 'borealis:head:' + r + ':' + shadow, r * 2.1, r * 1.7, r * 0.8, r * 0.85, c => {
      c.fillStyle = shadow ? '#000' : '#596a72'; c.beginPath(); c.moveTo(-r * 0.2, -r * 0.19); c.quadraticCurveTo(r * 0.18, -r * 0.32, r * 0.75, -r * 0.08); c.lineTo(r * 0.88, 0); c.lineTo(r * 0.75, r * 0.08); c.quadraticCurveTo(r * 0.18, r * 0.32, -r * 0.2, r * 0.19); c.closePath(); c.fill();
      for (const s of [-1, 1]) { c.strokeStyle = shadow ? '#000' : '#a6b9c0'; c.lineWidth = r * 0.07; c.beginPath(); c.moveTo(0, s * r * 0.16); c.quadraticCurveTo(-r * 0.35, s * r * 0.5, -r * 0.57, s * r * 0.48); c.stroke(); }
      if (shadow) return;
      for (let i = 0; i < 35; i++) { const u = (i * 0.618) % 1, s = i % 2 ? 1 : -1; plate(c, -r * 0.12 + r * 0.65 * u, s * r * (0.07 + 0.13 * ((i * 0.31) % 1)), r * (0.12 + 0.2 * u), Math.PI + s * (0.15 + 0.6 * u), r * 0.032); }
      // 額前長角，在俯視輪廓中超出長吻；口腔仍維持暗紅。
      c.fillStyle = '#e2eff0'; c.strokeStyle = '#657d89'; c.lineWidth = r * 0.016; c.beginPath(); c.moveTo(r * 0.25, -r * 0.075); c.lineTo(r * 0.94, 0); c.lineTo(r * 0.25, r * 0.075); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#96c8d9'; c.beginPath(); c.moveTo(r * 0.26, 0); c.lineTo(r * 0.94, 0); c.lineTo(r * 0.25, r * 0.075); c.closePath(); c.fill();
      for (const s of [-1, 1]) { c.fillStyle = '#172c38'; c.beginPath(); c.ellipse(r * 0.12, s * r * 0.18, r * 0.08, r * 0.038, s * 0.4, 0, TAU); c.fill(); c.fillStyle = '#daf6ff'; c.beginPath(); c.ellipse(r * 0.14, s * r * 0.17, r * 0.038, r * 0.017, s * 0.4, 0, TAU); c.fill(); }
    });
    if (!shadow && jaw > 0.05) for (let i = 0; i < 7; i++) for (const s of [-1, 1]) { const x = r * (0.19 + i * 0.075); g.fillStyle = '#dce8dc'; g.beginPath(); g.moveTo(x, s * r * (0.1 + jaw * 0.32)); g.lineTo(x + r * 0.018, s * r * 0.025); g.lineTo(x + r * 0.042, s * r * (0.1 + jaw * 0.32)); g.fill(); }
  }
  function dragon(g, o, t, r, P, shadow) {
    g.save(); g.rotate(P.spin); g.scale(P.dip, P.dip);
    let px = -r * 0.8, py = 0;
    for (let i = 1; i <= 20; i++) { const u = i / 20, x = -r * (0.8 + u * 3), y = (Math.sin(t * 1.6 - u * 2.3) * 0.24 + P.curl * u) * r * u;
      g.lineCap = 'round'; g.strokeStyle = shadow ? '#000' : INK; g.lineWidth = r * (0.3 * (1 - u) + 0.04); g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke();
      if (!shadow) { g.strokeStyle = SCALE; g.lineWidth *= 0.38; g.stroke(); }
      if (!shadow && i % 2 === 0) for (const s of [-1, 1]) plate(g, x, y + s * r * 0.04, r * (0.19 - u * 0.1), Math.PI + s * 0.8, r * 0.026); px = x; py = y;
    }
    for (const s of [-1, 1]) { const lift = P.lift[s < 0 ? 0 : 1], x = -r * 0.64 + lift * r * 0.18, y = s * r * (0.59 - P.tuck * 0.15);
      g.fillStyle = shadow ? '#000' : INK; g.beginPath(); g.ellipse(x, y, r * (0.37 - P.tuck * 0.08), r * 0.2, -s * 0.4, 0, TAU); g.fill();
      if (!shadow) for (let i = 0; i < 3; i++) { plate(g, x + r * 0.11, y + s * r * (i - 1) * 0.07, r * 0.25, 0, r * 0.047); }
    }
    for (const s of [-1, 1]) { const i = s < 0 ? 0 : 1; g.save(); g.translate(r * 0.4, s * r * 0.3); g.scale(1, s); g.rotate(0.95 * (1 - P.spread[i]) - P.sweep[i]); g.scale(1 + P.flap[i] * 0.08, (0.31 + P.spread[i] * 0.69) * (1 - Math.abs(P.flap[i]) * 0.28)); wing(g, r, shadow, o.phase); g.restore(); }
    if (!shadow) for (const s of [-1, 1]) {
      const lift = P.lift[s < 0 ? 0 : 1], x = -r * 0.85 + lift * r * 0.22, y = s * r * (0.68 - P.tuck * 0.15);
      g.fillStyle = '#40545f'; g.strokeStyle = '#20313b'; g.lineWidth = r * 0.035; g.beginPath(); g.ellipse(x, y, r * 0.32, r * 0.19, -s * 0.35, 0, TAU); g.fill(); g.stroke();
      for (let j = 0; j < 3; j++) plate(g, x + r * 0.1, y + s * r * (j - 1) * 0.075, r * 0.32, 0.12 * s, r * 0.053);
      for (let j = 0; j < 4; j++) plate(g, x - r * 0.15 + j * r * 0.08, y - s * r * 0.08, r * 0.12, Math.PI + s * 0.2, r * 0.026);
    }
    torso(g, r, shadow);
    if (!shadow) for (let i = 0; i < 11; i++) { const x = r * (0.7 - i * 0.17), lit = P.glow * 11 > i; plate(g, x, 0, r * 0.25, Math.PI, r * 0.07);
      if (lit) { g.fillStyle = R.hexA(ICE, 0.35 + 0.2 * Math.sin(t * 5 - i)); g.beginPath(); g.ellipse(x, 0, r * 0.1, r * 0.055, 0, 0, TAU); g.fill(); } }
    g.save(); g.translate(r * 0.68, 0);
    for (let i = 0; i < 5; i++) { g.rotate(P.yaw / 5); g.strokeStyle = shadow ? '#000' : '#405761'; g.lineWidth = r * (0.34 - i * 0.032); g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(r * 0.24 * P.reach, 0); g.stroke();
      if (!shadow) { g.strokeStyle = '#8199a3'; g.lineWidth *= 0.3; g.stroke(); }
      if (!shadow) for (const s of [-1, 1]) plate(g, 0, s * r * 0.07, r * (0.24 - i * 0.018), Math.PI + s * 0.5, r * 0.03);
      g.translate(r * 0.22 * P.reach, 0);
    }
    head(g, r, P.jaw, shadow);
    if (!shadow && P.cold > 0.01) { g.globalAlpha *= P.cold * 0.6; g.fillStyle = '#b2ecff'; g.beginPath(); g.ellipse(r * 0.53, 0, r * 0.22, r * (0.06 + P.jaw * 0.24), 0, 0, TAU); g.fill(); }
    g.restore();
    if (!shadow && o.inst && o.inst.skill.id === 'borealis_mist') { // 龍饗幻影是已標示的改編，半透明且短暫。
      const I = info(o.inst), start = I.breath[0].at, end = I.breath[I.breath.length - 1].at + 0.25, a = ease(o.inst.t / start) * (1 - ease((o.inst.t - end + 0.4) / 0.4));
      if (a > 0) { g.save(); g.translate(r * 0.5, -r * 0.15); g.scale(1.9, 1.9); g.globalAlpha *= a * 0.27; g.rotate(P.yaw); head(g, r, 0.33, false); g.restore(); }
    }
    if (!shadow) for (let i = 0; i < (o.phase === 2 ? 16 : 8); i++) { const ph = (t * 0.3 + i * 0.17) % 1, a = i * 2.399; g.fillStyle = R.hexA(WHITE, (1 - ph) * 0.5); g.fillRect(Math.cos(a) * r * (0.8 + ph * 0.5), Math.sin(a) * r * (0.6 + ph) - ph * r * 0.2, Math.max(1, r * 0.012), Math.max(1, r * 0.012)); }
    g.restore();
  }
  function shadow(g, b, t, r, P, h) { g.save(); g.globalAlpha *= Math.max(0.12, 0.3 - h / 1300); g.translate(h * 0.2, h * 0.25); g.rotate(b.face || 0); g.scale(1 - h / 2200, 1 - h / 2200); dragon(g, b, t, r, P, true); g.restore(); }
  R.borealisMouth = function (b) {
    const t = b.world ? b.world.time : 0, P = pose(b, t, b.state, elevation(b) > 0.2), face = (b.face || 0) + P.spin;
    let x = b.r * 0.68, y = 0;
    for (let i = 1; i <= 5; i++) { const a = P.yaw * i / 5; x += Math.cos(a) * b.r * 0.22 * P.reach; y += Math.sin(a) * b.r * 0.22 * P.reach; }
    x += Math.cos(P.yaw) * b.r * 0.8; y += Math.sin(P.yaw) * b.r * 0.8;
    return { x: b.x + (x * Math.cos(face) - y * Math.sin(face)) * P.dip, y: b.y + (x * Math.sin(face) + y * Math.cos(face)) * P.dip - elevation(b) * b.r };
  };
  R.defineBossStyle('borealis', {
    body(g, b, t, k) {
      const portrait = !b.world && g.canvas && g.canvas.width <= 256, h = elevation(b) * k.r, P = pose(b, t, k.st, h > 15);
      if (portrait) { g.translate(k.r * 0.25, 0); g.scale(0.32, 0.32); P.spread = [0.88, 0.88]; }
      if (h > 2) { // 已轉到面向座標；陰影用世界向量換算回區域座標。
        g.save(); g.rotate(-(b.face || 0)); shadow(g, b, t, k.r, P, h); g.restore();
        g.save(); g.translate(-Math.sin(b.face || 0) * h, -Math.cos(b.face || 0) * h); dragon(g, b, t, k.r, P, false); g.restore();
      } else dragon(g, b, t, k.r, P, false);
    },
    hidden(g, b, t) {
      if (!b.inst) return;
      const I = info(b.inst), T = b.inst.t, land = I.land.find(a => a.at > T), hide = I.hide.filter(a => a.at <= T).pop();
      if (!land || !hide) return;
      const mark = b.inst.marks[land.mark] || b.enemy || b, p = cl((T - hide.at) / (land.at - hide.at)), q = p < 0.72 ? ease(p / 0.72) * 0.65 : 0.65 + ease((p - 0.72) / 0.28) * 0.35;
      const x = U.lerp(b.x, mark.x, q), y = U.lerp(b.y, mark.y, q), h = Math.sin(p * Math.PI) * b.r * 1.7, P = pose(b, t, 'skill', true);
      P.spin = P.yaw = 0; P.reach = 1.05; P.jaw = 0.08; P.cold = 0; P.tuck = 1;
      if (p > 0.72) { P.spread = [0.6 - (p - 0.72), 0.6 - (p - 0.72)]; P.flap = [-0.3, -0.3]; }
      const fake = { ...b, face: b.face }; g.save(); g.translate(x, y); shadow(g, fake, t, b.r, P, h); g.restore();
      g.save(); g.translate(x, y - h); g.rotate(b.face); dragon(g, b, t, b.r, P, false); g.restore();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
