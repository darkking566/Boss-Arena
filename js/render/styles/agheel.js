'use strict';
// 自繪俯視飛龍亞基爾。造型來源：Creative Uncut 收錄的官方設定稿（俯視圖：雙翼展開、背脊一列骨棘、長尾；後視圖背棘的紅色描線）、
//   遊戲截圖（灰黑鱗甲、翼緣如燒焦羽毛層層剝落、頭上兩支後掠長角與鼻角、張口的橘紅喉嚨）。不載入第三方圖片；亂數只用 BD.vrng。
// 飛行：技能時間軸決定離地高度（body 往畫面上方平移、陰影留在地上）；hide 期間由 hidden() 畫出在空中振翼移向落點的龍。
(function (G) {
  const BD = G.BD, R = BD.Render, U = BD.U, TAU = U.TAU;
  const SCALE = '#4a433f', SCALE_D = '#221e1d', SCALE_L = '#7a7069', FEATHER = '#5e5550', HORN = '#2b2624', EYE = '#ffd27a', FIRE = '#ff8a1e', CORE = '#fff1b8';
  // 離地高度：[開始升空, 到頂, 開始下降, 落地, 高度]（技能時間，秒）
  const FLY = { retreat_flame: [0.1, 0.5, 1.75, 2.15, 120], strafe: [0.05, 0.85, 1.95, 2.3, 95], agheel_flame: [0.1, 0.95, 2.0, 2.4, 150] };
  const BREATH = { sweeping_breath: 1, tracking_breath: 1, agheel_flame: 1, strafe: 1, retreat_flame: 1 };

  function elev(inst) {
    const f = inst && FLY[inst.skill.id]; if (!f) return 0;
    const t = inst.t, e = (x) => x * x * (3 - 2 * x);
    if (t < f[0] || t > f[3]) return 0;
    return f[4] * (t < f[1] ? e((t - f[0]) / (f[1] - f[0])) : t < f[2] ? 1 : e(1 - (t - f[2]) / (f[3] - f[2])));
  }
  // 右翼精靈（翼座標：原點＝肩、+y 往外展、+x 往前）；左翼以 scale(1,-1) 鏡像
  function wingSprite(g, r) {
    R.blit(g, 'agheel:wing:' + r, r * 4.4, r * 3.4, r * 2.2, r * 0.3, (c) => {
      const wrist = [r * 0.35, r * 1.35], tip = [-r * 0.15, r * 2.85];
      const edge = []; // 後緣：翼尖 → 身體，鋸齒狀羽緣
      for (let i = 0; i <= 18; i++) {
        const u = i / 18, x = tip[0] + (-r * 1.45 - tip[0]) * u - Math.sin(u * Math.PI) * r * 0.65, y = tip[1] + (r * 0.15 - tip[1]) * u;
        edge.push([x, y], [x - r * (0.18 + 0.12 * Math.sin(i * 2.7)), y + r * 0.06]);
      }
      const gr = c.createLinearGradient(0, 0, -r, r * 2.6); gr.addColorStop(0, '#3e3734'); gr.addColorStop(0.6, '#2a2523'); gr.addColorStop(1, '#151211');
      c.fillStyle = gr; c.beginPath(); c.moveTo(0, 0); c.lineTo(wrist[0], wrist[1]); c.lineTo(tip[0], tip[1]);
      for (const [x, y] of edge) c.lineTo(x, y);
      c.lineTo(-r * 0.6, 0); c.closePath(); c.fill();
      // 羽毛般的鱗片：沿後緣一層層往外的短筆觸
      c.lineCap = 'round';
      for (let i = 0; i < 120; i++) {
        const u = (i * 0.618) % 1, v = (i * 0.37) % 1, x = tip[0] * (1 - u) + (-r * 1.4) * u - Math.sin(u * Math.PI) * r * 0.5 * v, y = (tip[1] * (1 - u) + r * 0.2 * u) * (0.55 + 0.45 * v);
        c.strokeStyle = ['#5e5550', '#3a3431', '#6e645d', '#2a2523'][i % 4]; c.lineWidth = r * (0.02 + 0.02 * (i % 3)); c.globalAlpha = 0.55;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - r * (0.22 + 0.1 * v), y + r * 0.04); c.stroke();
      }
      c.globalAlpha = 1;
      // 骨架：上臂、前臂、三根指骨
      c.strokeStyle = '#625852'; c.lineWidth = r * 0.12; c.beginPath(); c.moveTo(0, 0); c.lineTo(wrist[0], wrist[1]); c.lineTo(tip[0], tip[1]); c.stroke();
      c.strokeStyle = SCALE_D; c.lineWidth = r * 0.05; c.stroke();
      c.lineWidth = r * 0.05; c.strokeStyle = '#4e4641';
      for (const u of [0.28, 0.55, 0.8]) { const [ex, ey] = edge[Math.round(u * 36)]; c.beginPath(); c.moveTo(wrist[0], wrist[1]); c.lineTo(ex, ey); c.stroke(); }
      c.fillStyle = HORN; for (const [x, y] of [wrist, tip]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + r * 0.22, y + r * 0.05); c.lineTo(x, y + r * 0.1); c.fill(); } // 翼爪
    });
  }
  function torso(g, r, phase) {
    R.blit(g, 'agheel:torso:' + r, r * 3.2, r * 2, r * 1.7, r * 1, (c) => {
      const gr = c.createLinearGradient(0, -r * 0.6, 0, r * 0.6); gr.addColorStop(0, SCALE_D); gr.addColorStop(0.5, SCALE_L); gr.addColorStop(1, SCALE_D);
      c.fillStyle = gr; c.beginPath(); c.ellipse(-r * 0.1, 0, r * 1.05, r * 0.55, 0, 0, TAU); c.fill();
      for (let i = 0; i < 70; i++) { // 鱗片
        const u = (i * 0.618) % 1, v = ((i * 0.381) % 1) * 2 - 1, x = -r * 1.0 + u * r * 1.9, y = v * r * 0.45 * Math.sqrt(1 - Math.pow((x + r * 0.1) / (r * 1.05), 2));
        c.fillStyle = i % 3 ? 'rgba(20,16,15,0.35)' : 'rgba(140,128,118,0.25)'; c.beginPath(); c.ellipse(x, y, r * 0.07, r * 0.045, 0, 0, TAU); c.fill();
      }
    });
  }
  // 背脊骨棘（二階段赤光脈動）
  function spines(g, r, phase, t) {
    for (let i = 0; i < 9; i++) {
      const x = r * (0.75 - i * 0.22), h = r * (0.22 - Math.abs(i - 3) * 0.018);
      for (const s of [-1, 1]) {
        g.fillStyle = HORN; g.beginPath(); g.moveTo(x + r * 0.08, s * r * 0.05); g.lineTo(x - h, s * r * (0.16 + 0.02 * i)); g.lineTo(x - r * 0.04, s * r * 0.02); g.fill();
      }
      if (phase === 2) {
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + 0.35 * Math.sin(t * 6 - i * 0.6);
        g.fillStyle = '#ff3b1a'; g.beginPath(); g.ellipse(x - r * 0.05, 0, r * 0.11, r * 0.07, 0, 0, TAU); g.fill(); g.restore();
      }
    }
  }
  function tail(g, r, t, sway) {
    let x = -r * 0.95, y = 0;
    g.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const k = i / 15, nx = -r * (0.95 + k * 2.9), ny = Math.sin(t * 2.1 - k * 2.6) * r * k * 0.35 + sway * r * k * k * 1.6;
      g.strokeStyle = i % 2 ? SCALE : '#3a3431'; g.lineWidth = r * (0.36 * (1 - k) + 0.05);
      g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
      if (i % 2 === 0 && i < 13) { g.fillStyle = HORN; g.beginPath(); g.moveTo(nx, ny); g.lineTo(nx + r * 0.1, ny - r * 0.04); g.lineTo(nx + r * 0.1, ny + r * 0.04); g.fill(); }
      x = nx; y = ny;
    }
    for (let j = 0; j < 7; j++) { const a = Math.PI + (j - 3) * 0.22; g.strokeStyle = j % 2 ? FEATHER : '#2e2927'; g.lineWidth = r * 0.05; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42); g.stroke(); } // 尾端破旗般的羽緣
  }
  function legs(g, r, moving, t) {
    for (const s of [-1, 1]) {
      const step = moving ? Math.sin(t * 9 + (s < 0 ? Math.PI : 0)) * r * 0.18 : 0, x = -r * 0.45 + step, y = s * r * 0.62;
      g.fillStyle = SCALE_D; g.beginPath(); g.ellipse(x, y, r * 0.3, r * 0.17, 0, 0, TAU); g.fill();
      for (let j = -1; j <= 1; j++) { g.strokeStyle = '#cfc4b0'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x + r * 0.22, y + j * r * 0.08); g.lineTo(x + r * 0.38, y + j * r * 0.1); g.stroke(); }
    }
  }
  function head(g, r, jaw, fire, phase) {
    // 頭的固定部分（角、鱗片、眼）快取；下顎與口火即時畫
    if (jaw > 0.02) {
      g.fillStyle = '#3a1410'; g.beginPath(); g.moveTo(r * 0.05, 0); g.lineTo(r * 0.62, -r * jaw); g.lineTo(r * 0.62, r * jaw); g.closePath(); g.fill();
      g.fillStyle = '#c9512a'; g.beginPath(); g.ellipse(r * 0.3, 0, r * 0.2, r * jaw * 0.5, 0, 0, TAU); g.fill();
    }
    R.blit(g, 'agheel:head:' + r, r * 1.6, r * 1.2, r * 0.6, r * 0.6, (c) => {
      for (const s of [-1, 1]) { // 兩支往後掠的長角
        c.fillStyle = HORN; c.beginPath(); c.moveTo(-r * 0.05, s * r * 0.14); c.quadraticCurveTo(-r * 0.4, s * r * 0.36, -r * 0.58, s * r * 0.5); c.lineTo(-r * 0.12, s * r * 0.06); c.fill();
        c.fillStyle = '#3c3532'; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(r * (0.2 - i * 0.12), s * r * 0.16); c.lineTo(r * (0.1 - i * 0.12), s * r * 0.3); c.lineTo(r * (0.06 - i * 0.12), s * r * 0.15); c.fill(); } // 頰側棘
      }
      const gr = c.createLinearGradient(0, -r * 0.2, 0, r * 0.2); gr.addColorStop(0, '#2e2927'); gr.addColorStop(0.5, '#6a615a'); gr.addColorStop(1, '#2e2927');
      c.fillStyle = gr; c.beginPath(); c.moveTo(-r * 0.15, -r * 0.2); c.quadraticCurveTo(r * 0.35, -r * 0.2, r * 0.7, -r * 0.06); c.lineTo(r * 0.78, 0); c.lineTo(r * 0.7, r * 0.06); c.quadraticCurveTo(r * 0.35, r * 0.2, -r * 0.15, r * 0.2); c.closePath(); c.fill();
      c.fillStyle = HORN; c.beginPath(); c.moveTo(r * 0.5, -r * 0.03); c.lineTo(r * 0.92, 0); c.lineTo(r * 0.5, r * 0.03); c.fill(); // 鼻角
      c.strokeStyle = 'rgba(20,16,15,0.6)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(r * 0.0, 0); c.lineTo(r * 0.55, 0); c.stroke();
      for (const s of [-1, 1]) { c.fillStyle = EYE; c.beginPath(); c.ellipse(r * 0.2, s * r * 0.12, r * 0.05, r * 0.025, s * 0.3, 0, TAU); c.fill(); }
    });
    for (const s of [-1, 1]) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = R.hexA(phase === 2 ? '#ff5a1a' : EYE, 0.35); g.beginPath(); g.arc(r * 0.2, s * r * 0.12, r * 0.09, 0, TAU); g.fill(); g.restore(); }
    if (fire > 0) { // 口中火光
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { g.globalAlpha = fire * (0.5 - i * 0.12); g.fillStyle = i ? FIRE : CORE; g.beginPath(); g.arc(r * (0.75 + i * 0.12), 0, r * (0.12 + i * 0.1) * (0.9 + 0.2 * BD.vrng()), 0, TAU); g.fill(); }
      g.restore();
    }
  }
  function actionsAt(inst, kind) { return inst.v.actions.filter((a) => a.do === kind); }
  function dragon(g, o, t, r, st, air) {
    const inst = o.inst, id = inst ? inst.skill.id : '', moving = st === 'dodge' || (inst && inst.dash) || Math.hypot(o.vx || 0, o.vy || 0) > 25;
    const pace = inst ? R.skillPace(inst, { hit: 1, dash: 1, erupt: 1 }) : { wind: 0, snap: 0, i: 0 };
    let spread = 0.22 + Math.sin(t * 1.6) * 0.03, flap = 0, yaw = 0, jaw = 0.03, fire = 0, sway = Math.sin(t * 1.3) * 0.1, spin = 0;
    if (air || st === 'transition') { spread = 0.85; flap = Math.sin(t * (air ? 8 : 5)); }
    if (inst) {
      if (id === 'wing_slam') { spread = 0.35 + (pace.i === 0 ? pace.wind * 0.6 : 0.9 - pace.snap * 0.3); flap = pace.i === 0 ? -pace.snap : pace.wind - pace.snap; }
      if (id === 'bite' || id === 'charge' || id === 'tail_gore') { jaw = 0.05 + pace.wind * 0.15 + pace.snap * 0.05; yaw = (pace.a && pace.a.angOff ? pace.a.angOff : 0) * (0.4 + pace.wind); }
      if (id === 'tail_gore' && pace.i === 0) spin = Math.sin(Math.min(1, inst.t / 0.9) * Math.PI) * TAU * 0.5, sway = (pace.wind - 0.5) * 2;
      if (BREATH[id]) {
        const hits = actionsAt(inst, 'hit'), a0 = hits.length ? hits[0].at : 1, a1 = hits.length ? hits[hits.length - 1].at + 0.15 : 1;
        const p = U.clamp((inst.t - a0) / Math.max(0.1, a1 - a0), 0, 1), on = inst.t >= a0 - 0.5 && inst.t <= a1;
        jaw = on ? 0.06 + (inst.t >= a0 ? 0.12 : (inst.t - a0 + 0.5) * 0.24) : 0.04; fire = on ? (inst.t >= a0 ? 1 : (inst.t - a0 + 0.5) * 2) : 0;
        if (id === 'sweeping_breath') { const sw = (hits.length && hits[0].angOff) || -1.57; yaw = sw * (1 - 2 * p); } // 跟著第一口 → 最後一口的角度轉
        if (id === 'strafe') yaw = -1.1;
      }
      if (id === 'stomp' || id === 'dive_bomb') sway = pace.snap * 0.6;
      if (id === 'ult' && !air) { fire = inst.t > 3.3 && inst.t < 4.4 ? 1 : 0; jaw = fire ? 0.18 : 0.06; spin = fire ? (inst.t - 3.3) / 1.1 * TAU : 0; }
    }
    if (st === 'transition') { jaw = 0.17; fire = 0.6; }
    g.save(); g.rotate(spin);
    tail(g, r, t, sway);
    legs(g, r, moving && !air, t);
    for (const s of [-1, 1]) { // 雙翼：spread 0 收在身側、1 完全展開；flap 上下拍（俯視時表現為翼面伸縮與前後擺）
      g.save(); g.translate(r * 0.4, s * r * 0.35); g.scale(1, s);
      g.rotate(-0.95 * (1 - spread) + flap * 0.18);
      g.scale(1, 0.32 + 0.68 * spread * (1 - 0.18 * Math.max(0, flap)));
      wingSprite(g, r); g.restore();
    }
    torso(g, r, o.phase); spines(g, r, o.phase, t);
    // 長頸：三節往前，頭部依 yaw 擺動
    g.save(); g.translate(r * 0.75, 0);
    let nx = 0, ny = 0;
    for (let i = 1; i <= 4; i++) {
      const a = yaw * i / 4, px = nx, py = ny; nx += Math.cos(a) * r * 0.26; ny += Math.sin(a) * r * 0.26;
      g.strokeStyle = SCALE; g.lineWidth = r * (0.42 - i * 0.04); g.lineCap = 'round'; g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
      g.fillStyle = HORN; g.beginPath(); g.moveTo(nx, ny); g.lineTo(nx - r * 0.14, ny - r * 0.05); g.lineTo(nx - r * 0.14, ny + r * 0.05); g.fill();
    }
    g.translate(nx, ny); g.rotate(yaw); head(g, r, jaw, fire, o.phase); g.restore();
    g.restore();
  }
  R.defineBossStyle('agheel', {
    body(g, o, t, k) {
      const h = elev(o.inst);
      g.save();
      if (h) { g.translate(-Math.sin(o.face) * h, -Math.cos(o.face) * h); const s = 1 + h / 600; g.scale(s, s); }
      dragon(g, o, t, k.r, k.st, h > 20); g.restore();
    },
    hidden(g, b, t) { // 升空（三拍俯衝 / 大招）：地上一團陰影跟著落點走，龍在空中振翼
      const inst = b.inst; if (!inst) return;
      const land = inst.v.actions.find((a) => a.do === 'land' && a.at > inst.t), hide = inst.v.actions.filter((a) => a.do === 'hide' && a.at <= inst.t).pop();
      const mark = (land && inst.marks[land.mark]) || b.enemy || b;
      const p = land && hide ? U.clamp((inst.t - hide.at) / (land.at - hide.at), 0, 1) : 0.5;
      const q = p < 0.75 ? p / 0.75 * 0.5 : 0.5 + (p - 0.75) / 0.25 * 0.5; // 前段盤旋、最後 1/4 急降
      const x = b.x + (mark.x - b.x) * q, y = b.y + (mark.y - b.y) * q, hgt = p < 0.75 ? 60 + 150 * Math.sin(Math.min(1, p / 0.4) * Math.PI / 2) : 210 * (1 - (p - 0.75) / 0.25);
      g.save(); g.fillStyle = 'rgba(0,0,0,' + (0.18 + 0.25 * (1 - hgt / 210)) + ')';
      g.beginPath(); g.ellipse(x, y, b.r * (1.6 + hgt / 300), b.r * (1.1 + hgt / 400), 0, 0, TAU); g.fill(); g.restore();
      g.save(); g.translate(x, y - hgt); g.rotate(U.angTo({ x, y }, mark) || b.face); const s = 1 + hgt / 900; g.scale(s, s);
      dragon(g, b, t, b.r, 'skill', true); g.restore();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
