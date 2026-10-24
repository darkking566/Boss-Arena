'use strict';
// Boss 造型：鏡爪（俯視）。
// 神羊（body）：白色羊毛斗篷（邊緣一圈蓬鬆的毛球）、兩側垂下的羊耳、臉上是深色的狼面具（眼窩冷藍）、手中一直握著新月形的銀弓——
//   射箭的招式會依時間軸拉滿弓弦、搭上一支發光的箭。
// 魔狼（召喚物 wolf，js/engine/minions/kindred.js）：沒有四肢、整隻像一筆水墨——狼頭戴白色羊面具（原作：兩人的面具互相顛倒），
//   頭後是一條長長的墨色身軀，邊緣是逆向炸開的鋸齒鬃毛，尾端散成數縷捲曲的墨絲。身軀是一條跟著狼頭走的「繩」（純視覺，存在 WeakMap），
//   停下時會留在剛走過的路徑上緩緩起伏。蓄勢時張口（口腔冷藍），撲擊時張到最大；大招的躍擊會離地。二階段（饗宴）輪廓與鬃毛燃起橘紅鬼火。
//   影子畫在 under（地面，會被沙塵蓋住），身軀畫在 over（壓在沙塵之上）。考據見 docs/bosses/kindred.md
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render;
  const ICE = '#8fe3ff', SILVER = '#eef7ff', EMBER = '#ff7a3a', INK = '#0d1120', N = 18;
  const SHOOT = { arrows: 1, dread: 1, leap: 1, frenzy: 1 }, TRIG = { proj: 1 };
  const spines = new WeakMap();

  const wolfOf = (b) => (b.world ? b.world.minions.find((m) => m.alive && m.owner === b && m.kind === 'wolf') : null);
  const size = (m) => m.r * 1.7;

  // 身軀：頭是第 0 節，其餘每節與前一節最多相隔 seg（像拖著一條繩）；第一次出現時捲成 C 字形
  function spine(m) {
    const s = size(m), seg = s * 0.34;
    let p = spines.get(m);
    if (!p) {
      p = []; let x = m.x, y = m.y, a = m.ang + Math.PI;
      for (let i = 0; i < N; i++) { p.push({ x, y }); x += Math.cos(a) * seg; y += Math.sin(a) * seg; a += 0.16; }
      spines.set(m, p);
    }
    p[0].x = m.x; p[0].y = m.y;
    for (let i = 1; i < N; i++) {
      const dx = p[i].x - p[i - 1].x, dy = p[i].y - p[i - 1].y, d = Math.hypot(dx, dy);
      if (d > seg) { p[i].x = p[i - 1].x + dx / d * seg; p[i].y = p[i - 1].y + dy / d * seg; }
    }
    return p;
  }
  // 畫用的脊椎：每節加上側向的緩慢起伏（越往尾巴越大），回傳點、法線與寬度
  function shape(p, s, t) {
    const out = [];
    for (let i = 0; i < N; i++) {
      const a = p[Math.max(0, i - 1)], c = p[Math.min(N - 1, i + 1)], tx = a.x - c.x, ty = a.y - c.y, l = Math.hypot(tx, ty) || 1;
      const nx = -ty / l, ny = tx / l, u = i / (N - 1), wav = Math.sin(t * 2.6 - i * 0.55) * s * 0.1 * (0.2 + u);
      const wd = s * 0.5 * Math.pow(1 - u, 1.1) * (u < 0.12 ? 0.85 + u * 1.25 : 1);
      out.push({ x: p[i].x + nx * wav, y: p[i].y + ny * wav, nx, ny, tx: tx / l, ty: ty / l, w: wd, u });
    }
    return out;
  }
  // 逐段變細的筆觸
  function taper(ctx, pts, w0, w1) {
    for (let i = 1; i < pts.length; i++) {
      ctx.lineWidth = U.lerp(w0, w1, i / (pts.length - 1));
      ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
    }
  }
  function outline(ctx, q, k) {
    ctx.beginPath(); ctx.moveTo(q[0].x + q[0].nx * q[0].w * k, q[0].y + q[0].ny * q[0].w * k);
    for (let i = 1; i < N; i++) ctx.lineTo(q[i].x + q[i].nx * q[i].w * k, q[i].y + q[i].ny * q[i].w * k);
    for (let i = N - 1; i >= 0; i--) ctx.lineTo(q[i].x - q[i].nx * q[i].w * k, q[i].y - q[i].ny * q[i].w * k);
    ctx.closePath();
  }

  function drawBody(ctx, q, s, t, p2, hurt) {
    const rimRGB = p2 ? '255,110,50' : '120,210,255';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 靈光：遠距離也看得出一條長長的狼身
    ctx.fillStyle = 'rgba(' + rimRGB + ',0.1)'; outline(ctx, q, 2.1); ctx.fill(); outline(ctx, q, 1.5); ctx.fill();
    // 墨身 + 往後掃的鬃毛：左右交錯、長短不一，像一筆筆刷出的毛（越靠近頭越長）
    ctx.fillStyle = INK; outline(ctx, q, 1); ctx.fill();
    ctx.beginPath();
    for (let i = 1; i < N - 3; i++) {
      const o = q[i], d = i % 2 ? 1 : -1, L = s * (0.75 - o.u * 0.6) * (0.6 + 0.4 * Math.sin(i * 2.3 + t * 2.5));
      const bx = o.x + o.nx * o.w * d * 0.8, by = o.y + o.ny * o.w * d * 0.8;
      ctx.moveTo(bx + o.tx * s * 0.2, by + o.ty * s * 0.2);
      ctx.quadraticCurveTo(bx + o.nx * d * L * 0.4, by + o.ny * d * L * 0.4, bx + (o.nx * d * 0.35 - o.tx) * L, by + (o.ny * d * 0.35 - o.ty) * L);
      ctx.lineTo(bx - o.tx * s * 0.1, by - o.ty * s * 0.1);
    }
    ctx.fill();
    // 尾巴：幾縷墨絲從尾端繼續延伸、各自捲曲；身上是斷斷續續的乾筆飛白（較亮的墨線）
    const end = q[N - 1], ta = Math.atan2(-end.ty, -end.tx);
    for (const k of [-0.6, -0.2, 0.25, 0.65]) {
      const pts = q.map((o) => [o.x + o.nx * o.w * k, o.y + o.ny * o.w * k]);
      let [x, y] = pts[N - 1], a = ta + k * 0.6;
      for (let j = 0; j < 6; j++) { a += (k > 0 ? 1 : -1) * (0.2 + j * 0.07) + Math.sin(t * 2 + k * 5) * 0.08; x += Math.cos(a) * s * 0.26; y += Math.sin(a) * s * 0.26; pts.push([x, y]); }
      ctx.strokeStyle = INK; taper(ctx, pts.slice(N - 2), s * 0.14, s * 0.02);
      ctx.save(); ctx.setLineDash([s * 0.8, s * 0.25, s * 0.3, s * 0.4]); ctx.lineDashOffset = k * s * 4;
      ctx.strokeStyle = p2 ? 'rgba(170,70,55,0.45)' : 'rgba(85,110,175,0.45)'; ctx.lineWidth = s * 0.04;
      ctx.beginPath(); for (let j = 1; j < N + 3; j++) j > 1 ? ctx.lineTo(pts[j][0], pts[j][1]) : ctx.moveTo(pts[j][0], pts[j][1]); ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(' + rimRGB + ',0.45)'; ctx.lineWidth = Math.max(1.2, s * 0.04); outline(ctx, q, 1); ctx.stroke();
    if (p2) { // 饗宴：鬃毛燃起鬼火
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i < 9; i++) {
        const o = q[i], f = 0.6 + 0.4 * Math.sin(t * 13 + i * 1.9), d = i % 2 ? 1 : -1;
        const bx = o.x + o.nx * o.w * d, by = o.y + o.ny * o.w * d;
        ctx.fillStyle = i % 3 ? 'rgba(255,120,50,0.5)' : 'rgba(255,60,40,0.45)';
        ctx.beginPath(); ctx.moveTo(bx + o.tx * s * 0.1, by + o.ty * s * 0.1);
        ctx.lineTo(bx + (o.nx * d * 0.5 - o.tx * 0.6) * s * 0.5 * f, by + (o.ny * d * 0.5 - o.ty * 0.6) * s * 0.5 * f);
        ctx.lineTo(bx - o.tx * s * 0.1, by - o.ty * s * 0.1); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    if (hurt) { ctx.fillStyle = 'rgba(255,255,255,0.45)'; outline(ctx, q, 1); ctx.fill(); }
  }

  // 狼頭（本地座標朝 +x）：鬃毛頸圈、頭骨、兩片上下顎（俯視時往兩側張開）、白色羊面具與發光的眼
  function drawHead(ctx, s, jaw, p2, hurt) {
    const rim = p2 ? EMBER : ICE, eye = p2 ? '#ffb070' : '#d8f8ff';
    ctx.fillStyle = INK; ctx.beginPath(); // 頸圈的鋸齒鬃毛
    for (let i = 0; i <= 14; i++) { const a = Math.PI * 0.4 + i / 14 * Math.PI * 1.2, rr = (i % 2 ? 0.38 : 0.8 - Math.abs(i - 7) * 0.03) * s; ctx.lineTo(Math.cos(a) * rr - s * 0.12, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
    for (const d of [1, -1]) { ctx.beginPath(); ctx.moveTo(s * 0.05, d * s * 0.16); ctx.lineTo(-s * 0.42, d * s * 0.42); ctx.lineTo(-s * 0.08, d * s * 0.05); ctx.closePath(); ctx.fill(); } // 往後貼的尖耳
    const op = jaw * 0.55, piv = s * 0.18;
    if (jaw > 0.05) { // 口腔：冷藍（饗宴時橘紅）的光——不用 lighter，在沙地上才不會洗成白色
      const g = ctx.createRadialGradient(piv, 0, 0, piv, 0, s * 0.9);
      g.addColorStop(0, p2 ? '#ffb070' : '#bff0ff'); g.addColorStop(1, p2 ? '#a0200c' : '#1d5fb8');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(piv, 0); ctx.lineTo(piv + Math.cos(op) * s * 0.95, Math.sin(op) * s * 0.95); ctx.lineTo(piv + Math.cos(-op) * s * 0.95, Math.sin(-op) * s * 0.95); ctx.closePath(); ctx.fill();
    }
    // 吻部：寬而長、前端圓鈍的狼嘴；張口時左右兩半（俯視的上下顎）繞嘴角往外張，內側露出白牙
    for (const d of [1, -1]) {
      ctx.save(); ctx.translate(piv, 0); ctx.rotate(d * op);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(-s * 0.05, 0); ctx.lineTo(-s * 0.05, d * s * 0.25);
      ctx.quadraticCurveTo(s * 0.5, d * s * 0.25, s * 0.8, d * s * 0.16); ctx.quadraticCurveTo(s * 0.98, d * s * 0.1, s * 0.96, 0); ctx.closePath(); ctx.fill();
      if (jaw > 0.05) { ctx.fillStyle = '#f4f8ff'; for (let i = 0; i < 5; i++) { const x = s * (0.1 + i * 0.13), h = i === 0 ? 0.13 : 0.07; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + s * 0.04, -d * s * h); ctx.lineTo(x + s * 0.08, 0); ctx.closePath(); ctx.fill(); } }
      ctx.restore();
    }
    ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.4, s * 0.34, 0, 0, U.TAU); ctx.fill(); // 頭骨
    ctx.strokeStyle = rim; ctx.globalAlpha *= 0.6; ctx.lineWidth = Math.max(1.2, s * 0.035); ctx.stroke(); ctx.globalAlpha /= 0.6;
    if (jaw < 0.05) { ctx.beginPath(); ctx.ellipse(s * 1.0, 0, s * 0.08, s * 0.1, 0, 0, U.TAU); ctx.fill(); } // 鼻頭
    // 白色羊面具：蓋住額頭與鼻樑上段（張口時只留額頭），額上一道 S 形漩紋，兩個眼窩發光
    const mL = s * (0.62 - jaw * 0.3);
    ctx.fillStyle = hurt ? '#ffffff' : '#e9eef6'; ctx.strokeStyle = '#8f9bb0'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-s * 0.22, -s * 0.22); ctx.quadraticCurveTo(s * 0.25, -s * 0.3, mL, -s * 0.1);
    ctx.quadraticCurveTo(mL + s * 0.06, 0, mL, s * 0.1); ctx.quadraticCurveTo(s * 0.25, s * 0.3, -s * 0.22, s * 0.22); ctx.quadraticCurveTo(-s * 0.32, 0, -s * 0.22, -s * 0.22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#3a4562'; ctx.lineWidth = Math.max(1.2, s * 0.035);
    ctx.beginPath(); ctx.moveTo(-s * 0.18, -s * 0.05); ctx.bezierCurveTo(-s * 0.12, -s * 0.15, -s * 0.02, -s * 0.06, -s * 0.07, 0); ctx.bezierCurveTo(-s * 0.12, s * 0.06, -s * 0.02, s * 0.15, s * 0.04, s * 0.06); ctx.stroke();
    for (const d of [1, -1]) { // 面具兩側捲起的羊角、細長上挑的眼縫
      ctx.fillStyle = hurt ? '#ffffff' : '#e9eef6'; ctx.strokeStyle = '#8f9bb0'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(-s * 0.1, d * s * 0.27, s * 0.11, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-s * 0.1, d * s * 0.27, s * 0.055, d * 0.5, d * 0.5 + d * 4.5, d < 0); ctx.stroke();
      ctx.fillStyle = '#1a2033'; ctx.beginPath(); ctx.ellipse(s * 0.22, d * s * 0.12, s * 0.1, s * 0.035, d * 0.35, 0, U.TAU); ctx.fill();
    }
    ctx.save(); // 面具眼窩的光（白面具上不用 lighter，否則會洗白）
    for (const d of [1, -1]) {
      ctx.fillStyle = p2 ? 'rgba(255,90,30,0.55)' : 'rgba(40,160,255,0.5)'; ctx.beginPath(); ctx.ellipse(s * 0.22, d * s * 0.12, s * 0.12, s * 0.06, d * 0.35, 0, U.TAU); ctx.fill();
      ctx.fillStyle = eye; ctx.beginPath(); ctx.ellipse(s * 0.24, d * s * 0.12, s * 0.05, s * 0.02, d * 0.35, 0, U.TAU); ctx.fill();
    }
    ctx.restore();
  }

  // 張口與騰空完全由魔狼的戰鬥狀態推得：蓄勢時漸開、撲擊時全開、收招時合上；躍擊（leap）在撲擊途中離地
  function pose(m) {
    if (m.ms === 'aim' && m.o) return { jaw: U.clamp(1 - m.st / m.o.tele, 0, 1) * 0.7, air: 0 };
    if (m.ms === 'dash' && m.o) { const k = U.clamp(1 - m.st / m.dashT, 0, 1); return { jaw: 1, air: m.o.leap ? Math.sin(k * Math.PI) : 0 }; }
    if (m.ms === 'rec') return { jaw: U.clamp(m.st / 0.3, 0, 1) * 0.5, air: 0 };
    return { jaw: 0, air: 0 };
  }

  // 神羊：羊毛斗篷 + 羊耳 + 深色狼面具 + 銀弓
  function lambBody(g, r) {
    g.fillStyle = '#e6ebf4';
    for (let i = 0; i < 14; i++) { const a = i / 14 * U.TAU; g.beginPath(); g.arc(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86, r * 0.24, 0, U.TAU); g.fill(); } // 蓬鬆的毛邊
    const grd = g.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r * 1.0);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.7, '#e9eef6'); grd.addColorStop(1, '#b9c4d8');
    g.fillStyle = grd; g.beginPath(); g.arc(0, 0, r * 0.9, 0, U.TAU); g.fill();
    g.strokeStyle = 'rgba(150,165,190,0.6)'; g.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) { const a = i / 6 * U.TAU + 0.3; g.beginPath(); g.arc(Math.cos(a) * r * 0.45 - r * 0.15, Math.sin(a) * r * 0.45, r * 0.16, a, a + 2.4); g.stroke(); } // 羊毛捲紋
    for (const d of [1, -1]) { // 垂下的羊耳
      g.fillStyle = '#f4f6fb'; g.beginPath(); g.ellipse(r * 0.1, d * r * 0.78, r * 0.36, r * 0.17, d * 0.5, 0, U.TAU); g.fill();
      g.fillStyle = '#c9d1e2'; g.beginPath(); g.ellipse(r * 0.12, d * r * 0.78, r * 0.22, r * 0.08, d * 0.5, 0, U.TAU); g.fill();
    }
    // 深色狼面具：從額頭收成一個尖尖的狼吻，兩側一對尖耳，吻部畫出交錯的白牙
    g.fillStyle = '#1b2031'; g.strokeStyle = '#6a7da3'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(r * 0.12, -r * 0.46); g.quadraticCurveTo(r * 0.75, -r * 0.48, r * 1.22, 0);
    g.quadraticCurveTo(r * 0.75, r * 0.48, r * 0.12, r * 0.46); g.quadraticCurveTo(-r * 0.02, 0, r * 0.12, -r * 0.46); g.closePath(); g.fill(); g.stroke();
    for (const d of [1, -1]) { g.beginPath(); g.moveTo(r * 0.18, d * r * 0.3); g.lineTo(-r * 0.12, d * r * 0.62); g.lineTo(r * 0.36, d * r * 0.42); g.closePath(); g.fill(); g.stroke(); } // 面具的狼耳
    g.strokeStyle = '#e8edf5'; g.lineWidth = 1.2; g.beginPath(); // 狼牙紋
    for (let i = 0; i <= 4; i++) { const x = r * (0.78 + i * 0.09), y = (i % 2 ? 1 : -1) * r * 0.1 * (1 - i * 0.2); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }

  function bow(ctx, r, pull, p2, shade) {
    const glow = p2 ? '#ff8a9a' : ICE, cx = r * 0.25, R0 = r * 1.05, A = 1.0;
    const tx = cx + Math.cos(A) * R0, ty = Math.sin(A) * R0, nock = tx - pull * r * 0.7;
    if (!shade) { ctx.strokeStyle = 'rgba(' + (p2 ? '255,120,140' : '140,225,255') + ',0.35)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, 0, R0, -A, A); ctx.stroke(); }
    ctx.strokeStyle = shade ? '#000' : SILVER; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, 0, R0, -A, A); ctx.stroke();
    if (shade) return;
    ctx.fillStyle = glow; for (const d of [1, -1]) { ctx.beginPath(); ctx.arc(tx, d * ty, 2.6, 0, U.TAU); ctx.fill(); } // 弓梢的光點
    ctx.strokeStyle = 'rgba(230,245,255,0.85)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tx, -ty); ctx.lineTo(nock, 0); ctx.lineTo(tx, ty); ctx.stroke();
    if (pull > 0.05) { // 搭上的箭：箭身 + 發光箭尖
      const tip = cx + R0 + r * 0.35;
      ctx.strokeStyle = SILVER; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(nock, 0); ctx.lineTo(tip, 0); ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = glow; ctx.globalAlpha = 0.5 + 0.5 * pull;
      ctx.beginPath(); ctx.arc(tip, 0, 4 + 3 * pull, 0, U.TAU); ctx.fill(); ctx.restore();
    }
  }

  function body(ctx, o, t, { r }) {
    const shade = !!o.shade, p2 = o.phase === 2, inst = o.inst;
    if (shade) { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, U.TAU); ctx.fill(); }
    else R.blit(ctx, 'body:kindred:lamb:' + r, r * 2.6 + 10, r * 2.6 + 10, r * 1.3 + 5, r * 1.3 + 5, (g) => lambBody(g, r));
    if (!shade) { // 狼面具的眼窩（冷藍）
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const d of [1, -1]) {
        ctx.fillStyle = 'rgba(120,220,255,0.45)'; ctx.beginPath(); ctx.arc(r * 0.55, d * r * 0.17, r * 0.15, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#d8f8ff'; ctx.beginPath(); ctx.arc(r * 0.55, d * r * 0.17, r * 0.06, 0, U.TAU); ctx.fill();
      }
      ctx.restore();
    }
    let pull = 0;
    if (o.state === 'skill' && inst && inst.v && SHOOT[inst.skill.id]) { const P = R.skillPace(inst, TRIG); pull = P.a ? (P.snap > 0 ? 0 : P.wind) : 0; }
    bow(ctx, r, pull, p2, shade);
  }

  // under：推進魔狼身軀、沿身軀畫地面陰影（躍擊時陰影留在地面）——陰影屬於地面，會被沙塵蓋住
  function under(ctx, b, t) {
    const m = wolfOf(b);
    if (!m) return;
    const s = size(m), q = shape(spine(m), s, t);
    ctx.save(); ctx.globalAlpha = Math.min(1, m.t / 0.4); ctx.translate(4, s * 0.2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; outline(ctx, q, 1.2); ctx.fill();
    ctx.restore();
  }
  // over：魔狼本體畫在煙塵之上（靈體不會被沙塵遮住）
  function over(ctx, b, t) {
    const m = wolfOf(b), p = m && spines.get(m);
    if (!p) return;
    const s = size(m), p2 = m.p2, P = pose(m), q = shape(p, s, t), hurt = m.hurt > 0;
    ctx.save(); ctx.globalAlpha = Math.min(1, m.t / 0.4); // 剛凝聚（開場 / 重聚）時由淡轉濃
    if (P.air) { ctx.translate(0, -P.air * s * 1.1); }
    drawBody(ctx, q, s, t, p2, hurt);
    const ha = m.ms === 'prowl' ? Math.atan2(q[0].y - q[1].y, q[0].x - q[1].x) : m.ang;
    ctx.save(); ctx.translate(q[0].x, q[0].y); ctx.rotate(ha); const k = (1 + P.air * 0.2) * 1.3; ctx.scale(k, k); // 頭比頸粗一圈
    drawHead(ctx, s, P.jaw, p2, hurt);
    ctx.restore();
    const bw = 44, y = m.y - s * 0.95 - P.air * s * 1.1; // 迷你血條：魔狼可以被打散
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(m.x - bw / 2, y, bw, 4);
    ctx.fillStyle = R.TEAM[m.team]; ctx.fillRect(m.x - bw / 2, y, bw * U.clamp(m.hp / m.maxHp, 0, 1), 4);
    ctx.restore();
  }

  R.defineBossStyle('kindred', { body, under, over });
})(typeof window !== 'undefined' ? window : globalThis);
