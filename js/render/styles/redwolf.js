'use strict';
// 自繪四足紅狼。造型來源：參考圖 26/37/47；遊戲版冷藍眼、蓬鬃、長吻、金飾與長尾。
// 不載入第三方圖片；毛束使用固定三角函數，繪圖不消耗戰鬥亂數。
(function (G) {
  const BD = G.BD, R = BD.Render, U = BD.U, TAU = U.TAU;
  const FUR = '#9b482a', DARK = '#37241e', GOLD = '#f9ba65', BLUE = '#78d9ff';
  function tuft(g, x, y, a, len, w, c) {
    const co = Math.cos(a), si = Math.sin(a);
    g.fillStyle = c; g.beginPath(); g.moveTo(x - si * w, y + co * w);
    g.quadraticCurveTo(x + co * len * 0.4 - si * w, y + si * len * 0.4 + co * w, x + co * len, y + si * len);
    g.quadraticCurveTo(x + co * len * 0.45 + si * w, y + si * len * 0.45 - co * w, x + si * w, y - co * w); g.closePath(); g.fill();
  }
  function blade(g, len, blue) {
    const c = blue ? BLUE : GOLD;
    g.save(); g.lineJoin = 'round';
    g.beginPath(); g.moveTo(0, -5); g.quadraticCurveTo(len * 0.64, 6, len, -len * 0.17);
    g.quadraticCurveTo(len * 0.83, 12, 5, 7); g.closePath();
    g.strokeStyle = R.hexA(c, 0.22); g.lineWidth = 15; g.stroke();
    g.strokeStyle = c; g.lineWidth = 4; g.stroke(); g.fillStyle = blue ? '#c5f5ff' : '#fff0c4'; g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(4, -3); g.quadraticCurveTo(len * 0.65, 7, len, -len * 0.17); g.stroke();
    g.strokeStyle = c; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -15); g.lineTo(-3, 13); g.moveTo(-2, 0); g.lineTo(-21, 0); g.stroke();
    for (let i = 1; i < 7; i++) { g.fillStyle = c; g.fillRect(len * i / 9, 0, 2, 2); }
    g.restore();
  }
  // 由共用 drawBoss 呼叫，因此獵魂主角借用這招也會看見蓄力中的輝劍。
  R.drawGlintblades = function (g, b, t) {
    if (!b._glintblades || b.state === 'dead' || b.state === 'transition') return;
    for (const p of b._glintblades) {
      const rem = p.launchAt - b.world.time; if (rem <= 0) continue;
      g.save(); g.translate(p.x, p.y);
      g.strokeStyle = 'rgba(90,190,255,0.65)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(0, 0, 27 + Math.sin(t * 5) * 2, 0, TAU); g.stroke();
      g.beginPath();
      for (let i = 0; i <= 5; i++) { const a = t * 0.4 + i * TAU * 2 / 5; g.lineTo(Math.cos(a) * 23, Math.sin(a) * 23); } g.stroke();
      g.rotate(p.face); g.globalAlpha = Math.min(1, (b.world.time - p.formed) * 5 + 0.25); blade(g, 54, true); g.restore();
    }
  };
  // 共用飛彈分派；判定仍由既有投射物引擎處理。
  R.drawWolfProjectile = function (g, p, t) {
    if (p.kind !== 'glintblade' && p.kind !== 'glintcomet') return false;
    const k = p.r / 10, comet = p.kind === 'glintcomet';
    if (comet) {
      R.blit(g, 'redwolf:comet:' + p.r, 190 * k, 42 * k, 165 * k, 21 * k, (c) => {
        const gr = c.createLinearGradient(-150 * k, 0, 10 * k, 0); gr.addColorStop(0, 'rgba(30,100,220,0)'); gr.addColorStop(0.7, '#3f9ff0'); gr.addColorStop(1, '#edffff');
        c.fillStyle = gr; c.beginPath(); c.moveTo(14 * k, 0); c.lineTo(-150 * k, -12 * k); c.lineTo(-75 * k, 0); c.lineTo(-150 * k, 12 * k); c.closePath(); c.fill();
        c.fillStyle = '#e5ffff'; c.beginPath(); c.ellipse(0, 0, 13 * k, 8 * k, 0, 0, TAU); c.fill();
      });
      g.strokeStyle = BLUE; g.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) { const x = -30 - ((t * 170 + i * 32) % 140); g.beginPath(); g.moveTo(x, (i % 2 ? 1 : -1) * p.r * 0.6); g.lineTo(x - 25, (i % 2 ? 1 : -1) * p.r); g.stroke(); }
    } else {
      g.strokeStyle = 'rgba(70,185,255,0.45)'; g.lineWidth = 6; g.beginPath(); g.moveTo(-8, 0); g.lineTo(-100, 0); g.stroke();
      g.scale(k, k); blade(g, 38, true);
    }
    return true;
  };
  function torso(g, r) {
    R.blit(g, 'redwolf:torso:' + r, r * 4.4, r * 3.4, r * 2.6, r * 1.7, (c) => {
      const gr = c.createLinearGradient(-r * 1.5, -r, r, r); gr.addColorStop(0, '#4f3024'); gr.addColorStop(0.45, '#aa5732'); gr.addColorStop(0.7, '#c87840'); gr.addColorStop(1, '#4a281e');
      c.fillStyle = gr; c.beginPath(); c.ellipse(-r * 0.35, 0, r * 1.28, r * 0.67, 0, 0, TAU); c.fill();
      // Shoulder mane: individual irregular locks, dark roots with copper edges.
      for (let i = 0; i < 48; i++) {
        const a = i * 2.39996, f = 0.72 + 0.25 * Math.sin(i * 8.3), x = r * 0.42 + Math.cos(a) * r * 0.63 * f, y = Math.sin(a) * r * 0.77 * f;
        const dir = Math.atan2(y, x - r * 0.42), len = r * (0.28 + 0.33 * (0.5 + 0.5 * Math.sin(i * 3.7)));
        tuft(c, x, y, dir + 0.55, len, r * 0.12, ['#48291f', '#783c27', '#a7542d', '#c87942', '#ad6238'][i % 5]);
      }
      c.strokeStyle = '#dda46c'; c.lineWidth = 0.8;
      for (let i = 0; i < 130; i++) {
        const a = i * 2.39996, f = (i % 13) / 13, x = r * (0.35 + Math.cos(a) * 0.8 * f), y = Math.sin(a) * r * f;
        c.globalAlpha = 0.2 + (i % 4) * 0.09; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - r * 0.25, y * 1.12, x - r * 0.66, y * 1.22); c.stroke();
      } c.globalAlpha = 1;
      // Slim gold straps crossing the shaggy shoulders; blue green jeweled clasp.
      c.strokeStyle = '#5e3520'; c.lineWidth = r * 0.12; c.beginPath(); c.moveTo(-r * 0.05, -r * 0.7); c.lineTo(-r * 0.22, r * 0.67); c.stroke();
      c.strokeStyle = '#d6ac62'; c.lineWidth = r * 0.045; c.stroke();
      c.fillStyle = '#d8ad5d'; c.beginPath(); c.arc(r * 0.47, -r * 0.52, r * 0.13, 0, TAU); c.fill();
      c.fillStyle = '#37908d'; c.beginPath(); c.arc(r * 0.47, -r * 0.52, r * 0.075, 0, TAU); c.fill();
    });
  }
  function tail(g, r, t, speed) {
    let x = -r * 1.1, y = 0;
    g.lineCap = 'round';
    for (let i = 0; i < 13; i++) {
      const k = i / 12, nx = -r * (1.1 + k * 2.3), ny = Math.sin(t * (speed ? 7 : 2.6) - k * 2.3) * r * k * 0.6;
      g.strokeStyle = i % 2 ? FUR : '#733a28'; g.lineWidth = r * (0.55 * (1 - k) + 0.06);
      g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
      for (const s of [-1, 1]) tuft(g, nx, ny, Math.PI + s * 0.35, r * (0.28 - k * 0.12), r * 0.09, i % 3 ? '#b56639' : DARK);
      x = nx; y = ny;
    }
  }
  function wolf(g, o, t, r, st) {
    const inst = o.inst, skill = inst && inst.skill, id = skill ? skill.id : '', moving = st === 'dodge' || (inst && inst.dash) || Math.hypot(o.vx || 0, o.vy || 0) > 25;
    const pace = inst ? R.skillPace(inst, { hit: 1, dash: 1, proj: 1, glintblades: 1 }) : { wind: 0, snap: 0 };
    const swordSkill = /sword|hunt|ult/.test(id), spin = id === 'sword_spin' && inst ? Math.sin(Math.min(1, inst.t / 1.1) * Math.PI) * TAU : 0;
    g.save(); g.rotate(spin); g.scale(1 + pace.snap * 0.06, 1 - pace.wind * 0.04);
    tail(g, r, t, moving);
    // Four legs with different fore/hind joints; long, slender, digitigrade paws.
    for (const s of [-1, 1]) for (const front of [false, true]) {
      const step = moving ? Math.sin(t * 17 + (front ? 0 : Math.PI) + (s < 0 ? Math.PI : 0)) * r * 0.33 : Math.sin(t * 2) * r * 0.02;
      const x = (front ? 0.65 : -0.95) * r, y = s * r * 0.52;
      g.strokeStyle = DARK; g.lineWidth = r * 0.21; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - r * 0.2 + step, y + s * r * 0.4); g.lineTo(x + step + r * (front ? 0.28 : -0.12), y + s * r * 0.7); g.stroke();
      g.strokeStyle = '#9e5533'; g.lineWidth = r * 0.12; g.stroke();
      const px = x + step + r * (front ? 0.28 : -0.12), py = y + s * r * 0.7;
      g.fillStyle = '#6e3e2c'; g.beginPath(); g.ellipse(px, py, r * 0.24, r * 0.14, 0, 0, TAU); g.fill();
      for (let j = -1; j <= 1; j++) { g.strokeStyle = '#c0ae91'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(px + r * 0.17, py + j * r * 0.07); g.lineTo(px + r * 0.27, py + j * r * 0.075); g.stroke(); }
    }
    torso(g, r);
    g.save(); g.translate(r * (0.8 + pace.snap * 0.12), 0); g.rotate((id === 'bite' ? pace.snap * 0.25 : 0));
    // Triangular upright ears, cheek ruff, a distinctly long muzzle.
    for (const s of [-1, 1]) {
      tuft(g, 0, s * r * 0.3, s * 1.2 - 0.25, r * 0.73, r * 0.22, '#a15632');
      tuft(g, r * 0.03, s * r * 0.35, s * 1.2 - 0.25, r * 0.43, r * 0.095, '#422921');
      for (let i = 0; i < 4; i++) tuft(g, -r * 0.15, s * r * (0.2 + i * 0.085), Math.PI - s * 0.7, r * (0.44 + 0.08 * i), r * 0.12, i % 2 ? '#c27940' : '#7d3f28');
    }
    g.fillStyle = '#a15733'; g.strokeStyle = '#472a20'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(-r * 0.05, -r * 0.39); g.quadraticCurveTo(r * 0.55, -r * 0.32, r * 0.95, -r * 0.14); g.lineTo(r * 1.03, 0); g.lineTo(r * 0.95, r * 0.14); g.quadraticCurveTo(r * 0.55, r * 0.32, -r * 0.05, r * 0.39); g.closePath(); g.fill(); g.stroke();
    const jaw = id === 'bite' || id === 'pounce' || st === 'transition' ? 0.1 + pace.wind * 0.18 : 0.04;
    g.fillStyle = '#35151c'; g.beginPath(); g.ellipse(r * 0.7, 0, r * 0.33, r * jaw, 0, 0, TAU); g.fill();
    for (const s of [-1, 1]) {
      tuft(g, r * 0.5, s * r * jaw, -s * Math.PI / 2, r * 0.13, r * 0.035, '#e8d7b2');
      g.strokeStyle = '#e4b46f'; g.lineWidth = 2; g.beginPath(); g.moveTo(r * 0.07, s * r * 0.23); g.lineTo(r * 0.38, s * r * 0.19); g.stroke();
      g.fillStyle = '#d4fcff'; g.beginPath(); g.ellipse(r * 0.27, s * r * 0.2, r * 0.065, r * 0.037, -s * 0.3, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(90,205,255,0.35)'; g.lineWidth = 4; g.stroke();
    }
    g.fillStyle = '#201d20'; g.beginPath(); g.ellipse(r * 1.02, 0, r * 0.12, r * 0.135, 0, 0, TAU); g.fill();
    if (swordSkill || (st === 'transition')) {
      g.save(); g.translate(r * 0.8, 0);
      const off = id === 'sword_combo' ? (pace.i % 2 ? -1 : 1) * (1.4 - pace.snap * 2.3) : -0.9 + pace.wind * 1.3 - pace.snap * 1.8;
      g.rotate(off); blade(g, r * (o.phase === 2 ? 5.7 : 5.1), false); g.restore();
    }
    g.restore(); g.restore();
  }
  R.defineBossStyle('redwolf', {
    body(g, o, t, k) {
      g.save();
      if (o.inst && o.inst.skill.id === 'comet') {
        const shot = o.inst.v.actions.find((a) => a.do === 'proj'), p = U.clamp(o.inst.t / Math.max(0.1, shot.at + 0.2), 0, 1), h = Math.sin(p * Math.PI) * 44;
        g.translate(-Math.sin(o.face) * h, -Math.cos(o.face) * h);
      }
      wolf(g, o, t, k.r, k.st); g.restore();
    },
    hidden(g, b, t) {
      const inst = b.inst; if (!inst) return;
      const mark = inst.marks.wolfLanding || b;
      const land = inst.v.actions.find((a) => a.do === 'land' && a.at > inst.t), hide = inst.v.actions.filter((a) => a.do === 'hide' && a.at <= inst.t).pop();
      const p = land && hide ? U.clamp((inst.t - hide.at) / (land.at - hide.at), 0, 1) : 0.5;
      const x = b.x + (mark.x - b.x) * p, y = b.y + (mark.y - b.y) * p - Math.sin(p * Math.PI) * 130;
      g.save(); g.translate(x, y); g.rotate(b.face); const s = 1 + Math.sin(p * Math.PI) * 0.16; g.scale(s, s); wolf(g, b, t, b.r, 'skill'); g.restore();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
