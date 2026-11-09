'use strict';
// Boss 造型：神皮雙人組（俯視）。依原作概念圖與遊戲畫面（docs/research/godskinduo/）：
// 使徒（body）：佝僂細瘦、縫合人皮的長袍（拖地的下襬、肩上一塊塊皮片與縫線）、兜帽下沒有五官只有暗影與額前的紫寶石、手腕護環，雙手持兩端一鐮一刃的長柄武器；
//   每招有自己的動作（揮砍、旋轉、抬手聚黑焰、伸展上身的皮囊、倒插）；二階段上身的皮解開、甩在身側。
// 貴人（一般對戰是完整 Boss，style 'godskinnoble'；訓練場等模式是召喚物 noble，畫在使徒的 over。兩者共用 drawNoble）：圓胖的白色軀幹（縫線與皮片）、兜帽小頭、細長的青瓷細劍與藍灰色長尾；
//   蓄勢時壓扁、突刺時身體前傾、神皮之輪縮成一顆滾動的大球、神皮碾壓浮空；二階段腹皮撕開，露出一整面布滿臉孔的圓盤。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render;
  const SKIN = '#e9e1d2', SKIN2 = '#cbbfa9', SEAM = '#8a7f6e', DARK = '#1b1622', LAV = '#b9b4ff', GEM = '#8a62e6', CELADON = '#a6e8cf', TAIL = '#8fa3b8';
  const win = (T, a, b) => U.clamp((T - a) / (b - a), 0, 1), ease = (x) => x * x * (3 - 2 * x), bump = (T, a, b) => Math.sin(win(T, a, b) * Math.PI);
  const nobleOf = (b) => (b.world ? b.world.minions.find((m) => m.alive && m.owner === b && m.kind === 'noble') : null);

  // ── 使徒的動作組（純視覺，只讀招式時間軸）：wa 武器擺角、spin 連續旋轉、th 前刺、st 上身伸展、orb 掌心黑焰、ring 腳下符環、arms 雙臂外展 ──
  const P = {};
  function pose(o) {
    const p = Object.assign(P, { wa: 0, spin: 0, th: 0, st: 0, orb: 0, ring: 0, arms: 0 }), inst = o.inst;
    if (o.state !== 'skill' || !inst || !inst.v) return p;
    const id = inst.skill.id, T = inst.t, acts = inst.v.actions;
    if (id === 'spin' || id === 'tornado' || id === 'ult') { p.spin = win(T, 0.2, 0.5) * (1 - win(T, id === 'spin' ? 1.4 : 2.4, id === 'spin' ? 1.6 : 2.7)); p.st = id === 'ult' ? bump(T, 0, 3.6) * 0.4 : 0; return p; }
    if (id === 'flame') { const pr = acts.find((a) => a.do === 'proj'); p.orb = pr ? win(T, 0, pr.at) * (1 - win(T, pr.at, pr.at + 0.25)) : 0; p.arms = p.orb * 0.5; return p; }
    if (id === 'ritual') { p.ring = bump(T, 0, 1.4); p.arms = p.ring; return p; }
    if (id === 'fling' || id === 'flamesweep' || id === 'plunge') p.st = id === 'plunge' ? bump(T, 0.3, 1.1) : bump(T, 0.2, 1.7);
    const hits = acts.filter((a) => a.do === 'hit'), j = Math.max(0, hits.findIndex((a) => a.at + 0.25 >= T)), h = hits[j] || hits[hits.length - 1];
    if (h) { const k = ease(win(T, h.at - 0.4, h.at)), after = win(T, h.at, h.at + 0.2); p.wa = (j % 2 ? 1 : -1) * (-1 + 2 * k) * 1.0 * (1 - after * 0.6); p.th = bump(T, h.at - 0.12, h.at + 0.12) * 0.7; }
    return p;
  }

  // 長柄武器：一端鐮刃、一端直刃；attack 時邊緣帶黑焰
  function weapon(ctx, r, wa, th, flame, shade) {
    ctx.save(); ctx.rotate(wa); ctx.translate(th * r, 0);
    ctx.strokeStyle = shade ? '#000' : '#2a2431'; ctx.lineWidth = r * 0.14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 1.7, 0); ctx.lineTo(r * 2.0, 0); ctx.stroke();
    if (!shade) {
      ctx.strokeStyle = 'rgba(185,180,255,0.35)'; ctx.lineWidth = r * 0.05; ctx.beginPath(); ctx.moveTo(-r * 1.7, 0); ctx.lineTo(r * 2.0, 0); ctx.stroke();
      ctx.fillStyle = '#dfe2ee'; ctx.strokeStyle = '#6a6f86'; ctx.lineWidth = 1.2; // 前端鐮刃：向內彎的月牙
      ctx.beginPath(); ctx.moveTo(r * 2.0, 0); ctx.quadraticCurveTo(r * 2.6, -r * 0.1, r * 2.55, -r * 0.75); ctx.quadraticCurveTo(r * 2.3, -r * 0.3, r * 1.95, -r * 0.14); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 1.7, 0); ctx.lineTo(-r * 2.3, -r * 0.1); ctx.lineTo(-r * 2.3, r * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke(); // 後端直刃
      if (flame > 0.05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(185,180,255,' + 0.5 * flame + ')'; ctx.lineWidth = r * 0.22; ctx.beginPath(); ctx.moveTo(r * 1.2, 0); ctx.quadraticCurveTo(r * 2.6, -r * 0.1, r * 2.55, -r * 0.8); ctx.stroke(); ctx.restore(); }
    } else { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(r * 2.4, -r * 0.4, r * 0.4, 0, U.TAU); ctx.fill(); }
    ctx.restore();
  }

  // 靜態的袍身（拖地的長下襬、肩上的皮片、縫線與鍊飾）
  function robe(g, r, stretch) {
    const L = r * (2.9 + stretch * 1.4);
    const gr = g.createLinearGradient(-L, 0, r * 0.5, 0); gr.addColorStop(0, SKIN2); gr.addColorStop(1, SKIN);
    g.fillStyle = gr; g.strokeStyle = SEAM; g.lineWidth = 1.3; g.beginPath(); g.moveTo(r * 0.3, -r * 0.82);
    g.quadraticCurveTo(-r * 0.6, -r * 0.95, -L, -r * 0.3); // 下襬由肩往後收成細長的尾
    for (let i = 0; i < 5; i++) g.quadraticCurveTo(-L - r * 0.15, -r * 0.12 + i * r * 0.1, -L + r * 0.1, -r * 0.2 + i * r * 0.1 + r * 0.1);
    g.quadraticCurveTo(-r * 0.6, r * 0.95, r * 0.3, r * 0.82); g.closePath(); g.fill(); g.stroke();
    g.setLineDash([r * 0.25, r * 0.18]); g.strokeStyle = 'rgba(70,60,50,0.55)'; // 縫線
    for (const y of [-0.45, 0, 0.45]) { g.beginPath(); g.moveTo(-r * 0.2, y * r); g.lineTo(-L * 0.92, y * r * 0.4); g.stroke(); }
    g.setLineDash([]);
    for (const d of [1, -1]) { // 肩上一塊塊皮片
      g.fillStyle = '#efe7d8'; g.strokeStyle = SEAM; g.beginPath(); g.ellipse(r * 0.0, d * r * 0.74, r * 0.5, r * 0.3, d * 0.35, 0, U.TAU); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(70,60,50,0.6)'; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(r * (0.05 + i * 0.16), d * r * 0.62); g.lineTo(r * (0.05 + i * 0.16), d * r * 0.76); g.stroke(); }
    }
    g.strokeStyle = '#c9a85a'; g.lineWidth = 1.4; g.setLineDash([2, 3]); // 胸前鍊飾
    g.beginPath(); g.arc(r * 0.55, 0, r * 0.7, -1.2, 1.2); g.stroke(); g.setLineDash([]);
  }

  function body(ctx, o, t, { r }) {
    const shade = !!o.shade, p2 = o.phase === 2, p = pose(o), flame = p.orb || p.spin || (o.state === 'skill' ? 0.4 : 0);
    ctx.save();
    ctx.scale(1 + p.st * 0.7, 1 - p.st * 0.2); // 上身的皮囊往前伸展
    if (shade) { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, U.TAU); ctx.fill(); }
    else {
      if (p.ring > 0.02) { // 腳下的黑焰符環
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(185,180,255,' + 0.6 * p.ring + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, U.TAU); ctx.stroke();
        ctx.lineWidth = 3; for (let i = 0; i < 6; i++) { const a = -t * 1.5 + i * U.TAU / 6; ctx.beginPath(); ctx.arc(0, 0, r * 2.1, a, a + 0.4); ctx.stroke(); } ctx.restore();
      }
      R.blit(ctx, 'body:godskinduo:robe:' + r + ':' + (p2 ? 2 : 1), r * 8.6, r * 2.4, r * 7.4, r * 1.2, (g) => robe(g, r, p2 ? 0.2 : 0));
      if (p2) { ctx.fillStyle = SKIN; ctx.strokeStyle = SEAM; ctx.lineWidth = 1.2; // 二階段：解開的上身皮片甩在身側
        for (const d of [1, -1]) { const w = Math.sin(t * 3 + d) * 0.12; ctx.beginPath(); ctx.moveTo(0, d * r * 0.6); ctx.quadraticCurveTo(-r * 0.8, d * (r * 1.3 + r * w * 3), -r * 1.8, d * (r * 1.0 + r * w * 5)); ctx.quadraticCurveTo(-r * 1.0, d * r * 0.6, -r * 0.3, d * r * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
    }
    ctx.rotate(p.spin * (t * 16) * 1);
    weapon(ctx, r, p.wa, p.th, flame, shade);
    ctx.rotate(-p.spin * (t * 16));
    if (!shade) {
      ctx.strokeStyle = '#c8d0dc'; ctx.lineWidth = r * 0.2; ctx.lineCap = 'round'; // 手臂與手腕護環
      for (const d of [1, -1]) { const ax = r * (0.75 + p.arms * 0.5), ay = d * r * (0.38 + p.arms * 0.6); ctx.beginPath(); ctx.moveTo(r * 0.05, d * r * 0.7); ctx.lineTo(ax, ay); ctx.stroke(); ctx.strokeStyle = '#2a2431'; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.moveTo(ax - r * 0.1, ay); ctx.lineTo(ax + r * 0.05, ay); ctx.stroke(); ctx.strokeStyle = '#c8d0dc'; ctx.lineWidth = r * 0.2; }
      if (p.orb > 0.02) { // 掌心的黑焰球
        const ox = r * 1.2, oy = r * 0.9; ctx.fillStyle = '#0a0710'; ctx.beginPath(); ctx.arc(ox, oy, r * (0.2 + 0.3 * p.orb), 0, U.TAU); ctx.fill();
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(185,180,255,' + 0.5 * p.orb + ')'; ctx.beginPath(); ctx.arc(ox, oy, r * (0.35 + 0.35 * p.orb), 0, U.TAU); ctx.fill(); ctx.restore();
      }
      ctx.fillStyle = '#d9cfbd'; ctx.strokeStyle = SEAM; ctx.lineWidth = 1.3; // 兜帽：後方尖起、前方一片暗影
      ctx.beginPath(); ctx.moveTo(-r * 0.75, 0); ctx.quadraticCurveTo(-r * 0.3, -r * 0.7, r * 0.45, -r * 0.5); ctx.quadraticCurveTo(r * 0.85, 0, r * 0.45, r * 0.5); ctx.quadraticCurveTo(-r * 0.3, r * 0.7, -r * 0.75, 0); ctx.fill(); ctx.stroke();
      ctx.fillStyle = DARK; ctx.beginPath(); ctx.ellipse(r * 0.42, 0, r * 0.26, r * 0.32, 0, 0, U.TAU); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(138,98,230,' + (0.5 + 0.2 * Math.sin(t * 3)) + ')'; ctx.beginPath(); ctx.arc(r * 0.62, 0, r * 0.2, 0, U.TAU); ctx.fill(); ctx.restore();
      ctx.fillStyle = GEM; ctx.beginPath(); ctx.arc(r * 0.62, 0, r * 0.09, 0, U.TAU); ctx.fill(); // 額前的紫寶石
    }
    ctx.restore();
  }

  // ── 貴人 ──
  function nobleBody(g, r, p2) {
    const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.15, 0, 0, r * 1.05);
    gr.addColorStop(0, '#f5eee2'); gr.addColorStop(0.7, SKIN); gr.addColorStop(1, '#b9a58f');
    g.fillStyle = gr; g.strokeStyle = SEAM; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, r, 0, U.TAU); g.fill(); g.stroke();
    g.setLineDash([r * 0.12, r * 0.1]); g.strokeStyle = 'rgba(70,60,50,0.55)'; // 縫在身上的皮片接縫
    for (let i = 0; i < 6; i++) { const a = i * U.TAU / 6 + 0.3; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25); g.quadraticCurveTo(Math.cos(a + 0.5) * r * 0.65, Math.sin(a + 0.5) * r * 0.65, Math.cos(a + 0.3) * r * 0.98, Math.sin(a + 0.3) * r * 0.98); g.stroke(); }
    g.setLineDash([]);
    if (p2) { // 二階段：撕下腹皮，露出一整面布滿臉孔的暗色圓盤
      g.fillStyle = '#4a3f45'; g.strokeStyle = '#2a2024'; g.lineWidth = 2; g.beginPath(); g.arc(-r * 0.1, 0, r * 0.66, 0, U.TAU); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(185,180,255,0.5)'; g.lineWidth = 1.2; for (const k of [0.4, 0.62]) { g.beginPath(); g.arc(-r * 0.1, 0, r * k, 0, U.TAU); g.stroke(); }
      for (let i = 0; i < 9; i++) { // 圓盤上浮出的一張張臉
        const a = i * U.TAU / 9, d = i % 2 ? r * 0.5 : r * 0.28, fx = -r * 0.1 + Math.cos(a) * d, fy = Math.sin(a) * d;
        g.fillStyle = '#d9cdbd'; g.beginPath(); g.arc(fx, fy, r * 0.09, 0, U.TAU); g.fill(); g.fillStyle = '#2a2024'; g.beginPath(); g.arc(fx - r * 0.03, fy - r * 0.01, r * 0.014, 0, U.TAU); g.arc(fx + r * 0.03, fy - r * 0.01, r * 0.014, 0, U.TAU); g.fill();
      }
    }
  }
  // 貴人的動作由戰鬥狀態推得：aim 壓扁蓄勢、dash 前傾（神皮之輪＝滾動的球、碾壓＝浮空）、rec 回彈
  const NP = {};
  function nPose(m) {
    const p = Object.assign(NP, { sq: 0, lean: 0, roll: 0, air: 0, th: 0, tail: 0 }), o = m.o;
    if (m.ms === 'aim' && o) { const k = U.clamp(1 - m.st / o.tele, 0, 1); p.sq = ease(k) * 0.18; p.tail = k; p.air = o.fx === 'gscrusher' ? ease(win(k, 0.3, 1)) * 0.5 : 0; }
    else if (m.ms === 'dash' && o) { const k = U.clamp(1 - m.st / m.dashT, 0, 1); p.lean = 0.16; p.th = o.fx === 'gsthrust' ? 1 : 0; p.roll = o.fx === 'gswheel' ? 1 : 0; p.air = o.fx === 'gscrusher' ? Math.sin(k * Math.PI) * 0.9 : 0; p.tail = 1; }
    else if (m.ms === 'rec') p.sq = -U.clamp(m.st / 0.35, 0, 1) * 0.08;
    return p;
  }
  function under(ctx, b) {
    const m = nobleOf(b);
    if (!m) return;
    const p = nPose(m); ctx.save(); ctx.globalAlpha = Math.min(1, m.t / 0.4) * (1 - p.air * 0.45); ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(m.x + 5, m.y + m.r * 0.25, m.r * (1.0 - p.air * 0.2), m.r * 0.85, 0, 0, U.TAU); ctx.fill(); ctx.restore();
  }
  // 貴人本體（原點＝身體中心、已轉向面向）：長尾、身體（神皮之輪時是滾動的球）、手臂與細劍、兜帽小頭
  function drawNoble(ctx, r, p2, p, t, seed, hurt) {
    ctx.scale((1 + p.air * 0.25) * (1 + p.lean), (1 + p.air * 0.25) * (1 - p.sq));
    ctx.strokeStyle = TAIL; ctx.lineWidth = r * 0.14; ctx.lineCap = 'round'; // 藍灰色長尾，蓄勢時繃緊、衝刺時往後拉直
    ctx.beginPath(); ctx.moveTo(-r * 0.85, 0);
    const w = Math.sin(t * 3 + seed) * r * (0.5 - p.tail * 0.35);
    ctx.bezierCurveTo(-r * 1.5, w, -r * 2.0, -w, -r * (2.2 + p.tail * 0.5), w * 0.5); ctx.stroke();
    if (p.roll) { // 神皮之輪：縮成一顆滾動的大球（接縫轉動、不露頭手）
      ctx.rotate(t * 14);
      R.blit(ctx, 'body:godskinduo:noble:' + r + ':' + (p2 ? 2 : 1), r * 2.4, r * 2.4, r * 1.2, r * 1.2, (g) => nobleBody(g, r, p2));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(0, 0, r * 1.1, 0, U.TAU); ctx.fill(); ctx.restore();
    } else {
      R.blit(ctx, 'body:godskinduo:noble:' + r + ':' + (p2 ? 2 : 1), r * 2.4, r * 2.4, r * 1.2, r * 1.2, (g) => nobleBody(g, r, p2));
      for (const d of [1, -1]) { // 兩條粗短的手臂（壓在身體上）；右手握細劍，突刺時往前伸
        const ex = r * (0.8 + p.th * 0.35), ey = d * r * 0.5;
        ctx.strokeStyle = '#d4c6b0'; ctx.lineWidth = r * 0.3; ctx.beginPath(); ctx.moveTo(r * 0.25, d * r * 0.62); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = SEAM; ctx.lineWidth = 1.2; ctx.stroke();
        if (d > 0) {
          ctx.strokeStyle = '#2a2431'; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.moveTo(ex - r * 0.1, ey); ctx.lineTo(ex + r * 0.2, ey); ctx.stroke();
          ctx.strokeStyle = CELADON; ctx.lineWidth = r * 0.06; ctx.beginPath(); ctx.moveTo(ex + r * 0.2, ey); ctx.lineTo(ex + r * (1.7 + p.th * 0.5), ey - r * 0.04); ctx.stroke();
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(166,232,207,0.3)'; ctx.lineWidth = r * 0.18; ctx.beginPath(); ctx.moveTo(ex + r * 0.4, ey); ctx.lineTo(ex + r * (1.7 + p.th * 0.5), ey - r * 0.04); ctx.stroke(); ctx.restore();
        }
      }
      ctx.fillStyle = '#d9cfbd'; ctx.strokeStyle = SEAM; ctx.lineWidth = 1.3; // 兜帽小頭：後方拖成尖角、前方一小片暗影
      ctx.beginPath(); ctx.moveTo(r * 0.45, 0); ctx.quadraticCurveTo(r * 0.55, -r * 0.34, r * 0.85, -r * 0.3); ctx.quadraticCurveTo(r * 1.15, -r * 0.15, r * 1.12, 0);
      ctx.quadraticCurveTo(r * 1.15, r * 0.15, r * 0.85, r * 0.3); ctx.quadraticCurveTo(r * 0.55, r * 0.34, r * 0.45, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = DARK; ctx.beginPath(); ctx.ellipse(r * 1.0, 0, r * 0.1, r * 0.15, 0, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(70,60,50,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(r * 0.62, -r * 0.2); ctx.quadraticCurveTo(r * 0.8, 0, r * 0.62, r * 0.2); ctx.stroke(); // 兜帽的皺褶
    }
    if (p2 && !p.roll) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(185,180,255,' + (0.1 + 0.05 * Math.sin(t * 4)) + ')'; ctx.beginPath(); ctx.arc(-r * 0.1, 0, r * 0.7, 0, U.TAU); ctx.fill(); ctx.restore(); }
    if (hurt) { ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, U.TAU); ctx.fill(); }
  }
  function over(ctx, b, t) {
    const m = nobleOf(b);
    if (!m) return;
    const p = nPose(m), r = m.r;
    ctx.save(); ctx.globalAlpha = Math.min(1, m.t / 0.4); ctx.translate(m.x, m.y - p.air * r * 1.1);
    ctx.rotate(m.ang);
    drawNoble(ctx, r, m.p2, p, t, m.t, m.hurt > 0);
    ctx.restore();
    const bw = 52, y = m.y - r * 1.15 - p.air * r * 1.1; // 迷你血條：貴人可以被打倒
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(m.x - bw / 2, y, bw, 4);
    ctx.fillStyle = R.TEAM[m.team]; ctx.fillRect(m.x - bw / 2, y, bw * U.clamp(m.hp / m.maxHp, 0, 1), 4);
  }

  R.defineBossStyle('godskinduo', { body, under, over });

  // ── 貴人（一般對戰的完整 Boss godskinnoble）：動作由招式時間軸推得 ──
  //   出手前壓扁蓄勢、衝刺時前傾（神皮之輪／大招的衝刺＝滾動的球）、細劍招出手瞬間劍往前伸；神皮碾壓躍起期間（hidden）在空中畫出拋物線
  function bPose(o) {
    const p = Object.assign(NP, { sq: 0, lean: 0, roll: 0, air: 0, th: 0, tail: 0 }), inst = o.inst;
    if (o.state !== 'skill' || !inst || !inst.v) return p;
    const T = inst.t, id = inst.skill.id, sword = id === 'rapier' || id === 'thrusts';
    if (inst.dash) { p.lean = 0.16; p.tail = 1; p.roll = id === 'wheel' || id === 'ult' ? 1 : 0; p.th = sword ? 1 : 0; return p; }
    const nx = inst.v.actions.find((a) => (a.do === 'hit' || a.do === 'dash') && a.at >= T);
    if (nx) { const k = win(T, nx.at - 0.45, nx.at); p.sq = ease(k) * 0.18; p.tail = k; if (sword && nx.at - T < 0.12) p.th = 1; }
    return p;
  }
  R.defineBossStyle('godskinnoble', {
    body(ctx, o, t, { r }) {
      if (o.shade) { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, U.TAU); ctx.fill(); return; }
      drawNoble(ctx, r, o.phase === 2, bPose(o), t, 0, false);
    },
    hidden(ctx, b, t) { // 神皮碾壓：從起跳點沿拋物線飛向落點，地上的影子跟著移動
      const inst = b.inst; if (!inst || !inst.v) return;
      const T = inst.t, acts = inst.v.actions, hide = acts.filter((a) => a.do === 'hide' && a.at <= T).pop(), land = acts.find((a) => a.do === 'land' && a.at > T);
      if (!hide || !land) return;
      const mk = inst.marks[land.mark] || b, k = win(T, hide.at, land.at), q = ease(k), x = U.lerp(b.x, mk.x, q), y = U.lerp(b.y, mk.y, q), h = Math.sin(k * Math.PI) * b.r * 3;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x + 5, y + 6, b.r * (1.1 - k * 0.3 + 0.3 * k * k), b.r * 0.85, 0, 0, U.TAU); ctx.fill();
      const p = Object.assign(NP, { sq: k > 0.85 ? -0.1 : 0, lean: 0, roll: 0, air: Math.sin(k * Math.PI), th: 0, tail: 1 });
      ctx.save(); ctx.translate(x, y - h); ctx.rotate(b.face); drawNoble(ctx, b.r, b.phase === 2, p, t, 0, false); ctx.restore();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
