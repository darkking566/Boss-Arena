'use strict';
// 墜星成獸：全部 Canvas 自繪，不載入參考圖。依官方概念圖與遊戲畫面（docs/research/fallingstar/）：
// 閃亮黑岩堆疊的四足身軀、背脊晶刺、頸部與臀部白毛、頭部白毛團正中的藍紫眼核、一對巨大彎顎、帶刺長尾高捲。
// 俯視：面向 +x、左側為 −y。姿勢讀實際時間軸（沉重節奏也對得上）：人立、低頭衝鋒、顎插地、甩尾、重力球、捲成岩球。
(function (G) {
  const BD = G.BD, R = BD.Render, U = BD.U, TAU = U.TAU, hexA = R.hexA;
  const ROCK = '#1c1b22', ROCK2 = '#2c2b35', EDGE = '#8f8ca6', SHINE = '#c9c6dc', FUR = '#ece7dc', FUR2 = '#b9b2a4', CRYS = '#a9a3c4';
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  // 黑岩甲片：決定性多邊形，亮邊表現「閃亮的黑色岩石」
  function plate(c, x, y, s, seed) {
    c.beginPath();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + hash(seed + i) * 0.5, d = s * (0.7 + 0.4 * hash(seed * 3 + i)); c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
    c.closePath(); c.fillStyle = hash(seed) > 0.5 ? ROCK2 : ROCK; c.fill();
    c.strokeStyle = hexA(EDGE, 0.55); c.lineWidth = Math.max(0.8, s * 0.09); c.stroke();
    c.strokeStyle = hexA(SHINE, 0.5); c.beginPath(); c.moveTo(x - s * 0.5, y - s * 0.35); c.lineTo(x + s * 0.2, y - s * 0.55); c.stroke();
  }
  function furTuft(c, x, y, rx, ry, n, seed) {
    c.fillStyle = FUR2; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
    c.strokeStyle = FUR; c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996 + seed, d = Math.sqrt((i + 0.5) / n), px = x + Math.cos(a) * rx * d, py = y + Math.sin(a) * ry * d, l = rx * (0.18 + 0.12 * hash(i + seed));
      c.lineWidth = Math.max(1, rx * 0.06); c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); c.stroke();
    }
  }
  function torso(g, r, p2) {
    R.blit(g, 'fallingstar:torso:' + r + ':' + p2, r * 2.8, r * 2, r * 1.5, r, c => {
      c.fillStyle = '#121117'; c.beginPath(); c.ellipse(-r * 0.05, 0, r * 1.15, r * 0.74, 0, 0, TAU); c.fill();
      for (let i = 0; i < 46; i++) { // 由外圈往脊線堆疊的岩甲
        const a = i * 2.39996, d = Math.sqrt(1 - (i + 0.5) / 46);
        plate(c, -r * 0.05 + Math.cos(a) * r * 1.02 * d, Math.sin(a) * r * 0.64 * d, r * (0.15 + 0.08 * hash(i)), i);
      }
      furTuft(c, -r * 0.95, 0, r * 0.32, r * 0.36, 40, 1.3); // 臀部白毛（原作弱點之一）
      for (let i = 0; i < 26; i++) { // 肩背的晶刺叢：方向、大小不一，靠前（頸後）較密
        const u = hash(i + 200), x = r * (0.75 - 1.35 * u * u), y = r * 0.5 * (hash(i + 300) - 0.5) * (1.2 - u * 0.5), s = r * (0.09 + 0.1 * hash(i + 400)) * (1.2 - u * 0.6);
        const a = Math.atan2(y, r * 0.3) + (hash(i + 500) - 0.5) * 1.2;
        c.fillStyle = p2 ? (i % 3 ? '#9d7ce6' : '#c8b0ff') : (i % 3 ? '#7f7a96' : CRYS); c.strokeStyle = p2 ? '#efe4ff' : SHINE; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x - Math.sin(a) * s * 0.3, y + Math.cos(a) * s * 0.3); c.lineTo(x + Math.cos(a) * s * 1.6, y + Math.sin(a) * s * 1.6); c.lineTo(x + Math.sin(a) * s * 0.3, y - Math.cos(a) * s * 0.3); c.closePath(); c.fill(); c.stroke();
      }
    });
  }
  // 頭部白毛團：正中一顆眼核（一階段藍、二階段紫）
  function head(g, r, p2, glow) {
    R.blit(g, 'fallingstar:head:' + r, r * 1.5, r * 1.5, r * 0.75, r * 0.75, c => {
      furTuft(c, 0, 0, r * 0.5, r * 0.52, 70, 0.7);
      c.fillStyle = '#5a5566'; c.beginPath(); c.ellipse(r * 0.08, 0, r * 0.2, r * 0.2, 0, 0, TAU); c.fill();
    });
    const col = p2 ? '#b66bff' : '#6fa8ff';
    R.blit(g, 'fallingstar:eye:' + r + ':' + p2, r * 0.9, r * 0.9, r * 0.37, r * 0.45, c => {
      const gr = c.createRadialGradient(r * 0.08, 0, 1, r * 0.08, 0, r * 0.4); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, col); gr.addColorStop(1, hexA(col, 0));
      c.fillStyle = gr; c.beginPath(); c.arc(r * 0.08, 0, r * 0.4, 0, TAU); c.fill();
    });
    if (glow > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = glow; g.fillStyle = hexA(col, 0.6); g.beginPath(); g.arc(r * 0.08, 0, r * (0.3 + glow * 0.35), 0, TAU); g.fill(); g.restore(); }
  }
  // 彎顎：黑亮的粗新月，由頭兩側伸出、尖端向內彎；open 張開角度（區域座標 +y 朝內）
  function mandible(g, r, s, open) {
    g.save(); g.translate(r * 0.3, s * r * 0.3); g.scale(1, -s); g.rotate(-open);
    R.blit(g, 'fallingstar:mand:' + r, r * 1.8, r * 1.3, r * 0.15, r * 0.95, c => {
      // 外緣先向外鼓、再向內彎到尖端；兩支尖端之間留一道縫（概念圖中兩顎幾乎圍成圓環）
      c.fillStyle = '#16151c'; c.strokeStyle = EDGE; c.lineWidth = r * 0.03;
      c.beginPath(); c.moveTo(-r * 0.05, -r * 0.14); c.bezierCurveTo(r * 0.55, -r * 0.95, r * 1.45, -r * 0.7, r * 1.55, r * 0.12);
      c.bezierCurveTo(r * 1.25, -r * 0.38, r * 0.6, -r * 0.48, r * 0.05, r * 0.16); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = hexA(SHINE, 0.65); c.lineWidth = r * 0.035; c.beginPath(); c.moveTo(r * 0.08, -r * 0.2); c.bezierCurveTo(r * 0.6, -r * 0.85, r * 1.35, -r * 0.62, r * 1.47, r * 0.02); c.stroke();
      for (let i = 0; i < 5; i++) { const u = 0.25 + i * 0.13, x = r * (0.1 + 1.25 * u), y = -r * (0.42 - 0.5 * (u - 0.5) * (u - 0.5) * 4 * 0.6); c.fillStyle = '#3a3846'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + r * 0.04, y + r * 0.13); c.lineTo(x + r * 0.09, y + r * 0.02); c.fill(); }
    });
    g.restore();
  }
  // 帶刺長尾：分節、向後高捲（俯視為 S 形），尖端一叢長刺；swing 甩尾角
  function tail(g, r, t, swing, p2) {
    let px = -r * 1.05, py = 0, ang = Math.PI;
    for (let i = 0; i < 16; i++) {
      const u = i / 15, seg = r * 0.2;
      ang = Math.PI + swing * u * 1.4 + Math.sin(t * 1.6 - u * 3) * 0.12 + Math.sin(u * 4.2) * 0.55 * (1 - Math.abs(swing));
      const nx = px + Math.cos(ang) * seg, ny = py + Math.sin(ang) * seg, w = r * (0.24 * (1 - u) + 0.07);
      g.strokeStyle = i % 2 ? ROCK2 : ROCK; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
      g.strokeStyle = hexA(EDGE, 0.5); g.lineWidth = Math.max(1, w * 0.12); g.stroke();
      for (const s of [-1, 1]) { // 尾刺
        const sa = ang + s * 1.75, l = r * (0.12 + 0.1 * u);
        g.strokeStyle = p2 ? '#c9b2ff' : SHINE; g.lineWidth = Math.max(1.2, r * 0.02); g.beginPath(); g.moveTo(nx, ny); g.lineTo(nx + Math.cos(sa) * l, ny + Math.sin(sa) * l); g.stroke();
      }
      px = nx; py = ny;
    }
    for (let i = 0; i < 7; i++) { const a = ang + (i - 3) * 0.32, l = r * 0.3; g.strokeStyle = SHINE; g.lineWidth = r * 0.03; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke(); }
  }
  function leg(g, r, x, y, lift, s) {
    g.save(); g.translate(x, y);
    g.fillStyle = ROCK; g.strokeStyle = hexA(EDGE, 0.6); g.lineWidth = r * 0.02;
    g.beginPath(); g.ellipse(r * 0.05 * lift, s * r * 0.08, r * 0.24, r * 0.17, s * 0.3, 0, TAU); g.fill(); g.stroke();
    for (let i = 0; i < 3; i++) { g.fillStyle = '#0d0c11'; g.beginPath(); g.arc(r * (0.18 + lift * 0.05), s * r * (0.03 + i * 0.07), r * 0.05, 0, TAU); g.fill(); }
    g.restore();
  }
  const GRAVITY = { gravitas: 1, reverse_gravity: 1, gravity_bolt: 1, gravity_ray: 1, ult: 1 };
  // 依技能與時間軸算出姿勢
  function pose(o, t, st) {
    const inst = o.inst, id = inst ? inst.skill.id : '', time = inst ? inst.t : 0, P = { rear: 0, lunge: 0, yaw: Math.sin(t * 0.9) * 0.06, tail: 0, dig: 0, jaw: 0.08 + Math.sin(t * 2.3) * 0.03, glow: 0, orb: 0, curl: 0 };
    if (st === 'transition') { P.rear = 0.7 + Math.sin(t * 6) * 0.1; P.glow = 0.8; P.jaw = 0.35; return P; }
    if (!inst) return P;
    const a = R.skillPace(inst, { hit: 1, dash: 1, gravpull: 1, proj: 1, erupt: 1, rain: 1 });
    if (GRAVITY[id]) P.glow = 0.35 + 0.4 * a.wind + 0.4 * a.snap;
    if (id === 'head_swing') { P.yaw = (a.i % 2 ? 1 : -1) * (0.5 * a.wind - 0.9 * a.snap); P.jaw = 0.25 + 0.2 * a.wind; P.lunge = a.snap * 0.3; }
    else if (id === 'tail_sweep') { P.tail = -0.9 * a.wind + 1.6 * a.snap; P.yaw = 0.3 * a.wind; P.spin = a.snap > 0 ? (1 - a.snap) * TAU : 0; }
    else if (id === 'fore_stomp') { P.rear = a.i === 0 ? a.wind : 0.2 * (1 - a.snap); P.lunge = a.i === 1 ? a.snap * 0.4 : 0; P.jaw = 0.3; }
    else if (id === 'hind_kick') { P.rear = -0.4 * a.wind; P.tail = Math.sin(time * 9) * 0.3; }
    else if (id === 'gouge' || id === 'rock_throw') { P.dig = time < (id === 'gouge' ? 1.3 : 0.95) ? Math.min(1, time * 2) : Math.max(0, 1 - (time - 0.95) * 4); P.jaw = 0.05; P.lunge = 0.2 * P.dig; }
    else if (id === 'bite' || id === 'charge') { P.lunge = 0.35 + 0.25 * a.snap; P.jaw = 0.45 + 0.2 * a.wind - 0.4 * a.snap; P.yaw = 0; }
    else if (id === 'beast_roll') { P.curl = Math.min(1, time / 0.15); }
    else if (id === 'gravitas' || id === 'reverse_gravity' || id === 'ult') { const up = time < 1.15 ? time / 1.15 : Math.max(0, 1 - (time - 1.15) * 2); P.rear = Math.max(up, a.snap * 0.6); P.jaw = 0.3 + 0.2 * up; }
    else if (id === 'gravity_ray') { P.orb = time < 1.5 ? time / 1.5 : 1; P.jaw = 0.4; P.yaw = time > 1.5 ? U.clamp((time - 1.5) / 1.8, 0, 1) * 1.6 - 0.8 : 0; }
    else if (id === 'gravity_bolt') { P.rear = 0.25 * a.wind; P.jaw = 0.2 + 0.25 * a.wind; }
    return P;
  }
  function beast(g, o, t, r, st, P) {
    const p2 = o.phase === 2, moving = st === 'idle' && (o.moveX || o.moveY), step = moving ? t * 9 : 0;
    // 環繞岩塊：重力漸強或二階段時浮在身旁（純演出）
    const orbit = p2 ? 7 : P.glow > 0.3 ? 4 : 0;
    for (let i = 0; i < orbit; i++) { const a = t * 0.8 + i * TAU / orbit, d = r * (1.5 + 0.2 * Math.sin(t * 2 + i)); g.save(); g.translate(Math.cos(a) * d, Math.sin(a) * d * 0.8 - r * 0.15); g.rotate(t + i); plate(g, 0, 0, r * (0.08 + 0.03 * hash(i)), i + 50); g.restore(); }
    if (P.curl > 0.6) { ball(g, r, t * 6, p2); return; }
    tail(g, r, t, P.tail, p2);
    const fl = 1 + P.rear * 0.35, lift = P.rear * r * 0.25;
    for (const s of [-1, 1]) { leg(g, r, -r * 0.65 + Math.sin(step + s) * r * 0.1, s * r * 0.55, 0, s); }
    for (const s of [-1, 1]) { leg(g, r, r * 0.55 + Math.sin(step - s) * r * 0.1 + lift, s * r * 0.55 * fl, P.rear, s); }
    torso(g, r, p2 ? 2 : 1);
    if (p2) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.18 + 0.1 * Math.sin(t * 4); g.fillStyle = '#7b4dff'; g.beginPath(); g.ellipse(r * 0.05, 0, r * 0.75, r * 0.12, 0, 0, TAU); g.fill(); g.restore(); }
    // 頸部白毛與頭：人立時前半身放大（越靠近鏡頭）
    g.save(); g.translate(r * (0.95 + P.lunge * 0.6 + P.dig * 0.25) + lift, 0); g.rotate(P.yaw); g.scale(fl * (1 - P.dig * 0.15), fl * (1 - P.dig * 0.15));
    furTuft(g, -r * 0.12, 0, r * 0.45, r * 0.6, 0, 0);
    for (const s of [-1, 1]) mandible(g, r, s, P.jaw - P.dig * 0.25);
    head(g, r, p2, P.glow);
    g.restore();
    if (P.orb > 0) { // 左肩上方的重力球
      const ox = r * 0.15, oy = -r * 0.85, rr = r * (0.12 + 0.25 * P.orb);
      g.save(); g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(ox, oy, 1, ox, oy, rr * 2.2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, '#c9a8ff'); gr.addColorStop(1, 'rgba(120,60,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(ox, oy, rr * 2.2, 0, TAU); g.fill();
      g.strokeStyle = hexA('#a77bff', 0.7); g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(ox, oy, rr * (1.3 + i * 0.35), t * (3 + i) , t * (3 + i) + 2); g.stroke(); }
      g.restore(); g.fillStyle = '#0a0612'; g.beginPath(); g.arc(ox, oy, rr * 0.55, 0, TAU); g.fill();
    }
  }
  // 捲成岩球：外圈尾刺朝外、甲片隨滾動旋轉
  function ball(g, r, spin, p2) {
    g.save(); g.rotate(spin);
    R.blit(g, 'fallingstar:ball:' + r + ':' + p2, r * 2.6, r * 2.6, r * 1.3, r * 1.3, c => {
      for (let i = 0; i < 18; i++) { const a = i * TAU / 18, l = r * 1.15; c.strokeStyle = p2 ? '#c9b2ff' : SHINE; c.lineWidth = r * 0.04; c.beginPath(); c.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); c.lineTo(Math.cos(a) * l, Math.sin(a) * l); c.stroke(); }
      c.fillStyle = '#121117'; c.beginPath(); c.arc(0, 0, r * 0.85, 0, TAU); c.fill();
      for (let i = 0; i < 34; i++) { const a = i * 2.39996, d = Math.sqrt((i + 0.5) / 34); plate(c, Math.cos(a) * r * 0.75 * d, Math.sin(a) * r * 0.75 * d, r * (0.13 + 0.05 * hash(i)), i + 90); }
      furTuft(c, r * 0.2, 0, r * 0.25, r * 0.25, 20, 2.1);
    });
    g.restore();
  }
  R.defineBossStyle('fallingstar', {
    body(g, o, t, k) {
      const portrait = !o.world && g.canvas && g.canvas.width <= 256;
      if (portrait) { g.translate(k.r * 0.15, 0); g.scale(0.42, 0.42); }
      const P = pose(o, t, k.st);
      if (P.rear > 0.05) { // 人立：地上影子留在原地，身體往鏡頭抬起
        g.save(); g.globalAlpha *= 0.25 * P.rear; g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, 0, k.r * 1.2, k.r * 0.7, 0, 0, TAU); g.fill(); g.restore();
      }
      if (P.spin) g.rotate(P.spin); // 迴身尾掃：出手瞬間整隻轉一圈
      beast(g, o, t, k.r, k.st, P);
    },
    hidden(g, b, t) { // 星球墜擊：後躍捲成岩球升空，懸停片刻後朝落點砸下
      const inst = b.inst; if (!inst) return;
      const land = inst.v.actions.find(a => a.do === 'land' && a.at > inst.t), hide = inst.v.actions.filter(a => a.do === 'hide' && a.at <= inst.t).pop();
      const mark = (land && inst.marks[land.mark]) || b.enemy || b, p = land && hide ? U.clamp((inst.t - hide.at) / (land.at - hide.at), 0, 1) : 0.5;
      const e = p < 0.75 ? p / 0.75 * 0.4 : 0.4 + (p - 0.75) / 0.25 * 0.6; // 前段懸空、最後四分之一急墜
      const x = U.lerp(b.x, mark.x, e), y = U.lerp(b.y, mark.y, e), h = (p < 0.75 ? Math.sin(p / 0.75 * Math.PI / 2) : 1 - (p - 0.75) / 0.25) * b.r * 2.2;
      g.save(); g.fillStyle = `rgba(20,10,40,${0.2 + 0.25 * p})`; g.beginPath(); g.ellipse(mark.x, mark.y, b.r * (0.6 + 0.6 * p), b.r * (0.4 + 0.35 * p), 0, 0, TAU); g.fill();
      g.strokeStyle = hexA('#a77bff', 0.3 + 0.4 * p); g.lineWidth = 2; g.beginPath(); g.arc(mark.x, mark.y, b.r * (1.6 - p), 0, TAU); g.stroke();
      g.translate(x, y - h); ball(g, b.r, t * 8, b.phase === 2); g.restore();
    },
  });
  // 拋出的黑岩：翻滾的多邊形，亮邊＋紫色重力殘光
  R.projStyles = R.projStyles || {};
  R.projStyles.starrock = function (ctx, p, t) {
    const s = p.r;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(167,123,255,0.35)'; ctx.lineWidth = s * 0.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.5, 0); ctx.lineTo(-s * 3, 0); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.rotate(t * 9 + (p.id || 0)); plate(ctx, 0, 0, s, (p.id || 0) % 97); ctx.restore();
  };
  R.lobStyles = R.lobStyles || {};
  R.lobStyles.starrock = function (ctx, l, x, y, k, t) { // 天外落下的黑岩隕星：紫焰尾跡
    const an = Math.atan2(l.y1 - l.y0, l.x1 - l.x0), s = 12 + 6 * k;
    ctx.save(); ctx.translate(x, y); ctx.rotate(an); ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(0, 0, 1, 0, 0, s * 2.8); gr.addColorStop(0, 'rgba(241,232,255,0.85)'); gr.addColorStop(0.5, 'rgba(167,123,255,0.4)'); gr.addColorStop(1, 'rgba(167,123,255,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, s * 2.8, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(140,90,255,0.5)'; ctx.lineWidth = s * 1.1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(-s * 5, Math.sin(t * 16) * s * 0.4); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over'; ctx.rotate(t * 7); plate(ctx, 0, 0, s, 7); ctx.restore();
  };
})(typeof window !== 'undefined' ? window : globalThis);
