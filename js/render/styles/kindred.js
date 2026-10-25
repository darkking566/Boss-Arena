'use strict';
// Boss 造型：鏡爪（俯視）。
// 神羊（body）：白色羊毛斗篷（邊緣一圈蓬鬆的毛球）、兩側垂下的羊耳、臉上是深色的狼面具（眼窩冷藍）、手中一直握著新月形的銀弓——
//   射箭的招式會依時間軸拉滿弓弦、搭上一支發光的箭；每招另有自己的動作組（lambPose：翻滾、過拉、符陣、躍落、下令、符環、聖域靈光）。
// 魔狼（召喚物 wolf，js/engine/minions/kindred.js）：沒有四肢、整隻像一筆水墨——狼頭戴白色羊面具（原作：兩人的面具互相顛倒），
//   頭後是一條長長的墨色身軀，邊緣是逆向炸開的鋸齒鬃毛，尾端散成數縷捲曲的墨絲。身軀是一條跟著狼頭走的「繩」（純視覺，存在 WeakMap），
//   停下時會留在剛走過的路徑上緩緩起伏。蓄勢時張口（口腔冷藍），撲擊時張到最大；大招的躍擊會離地。二階段（饗宴）輪廓與鬃毛燃起橘紅鬼火。
//   影子畫在 under（地面，會被沙塵蓋住），身軀畫在 over（壓在沙塵之上）。考據見 docs/bosses/kindred.md
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render;
  const ICE = '#8fe3ff', SILVER = '#eef7ff', EMBER = '#ff7a3a', INK = '#0d1120', N = 18;
  const TRIG = { proj: 1 };
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

  function drawBody(ctx, q, s, t, p2, hurt, mane) {
    const rimRGB = p2 ? '255,110,50' : '120,210,255';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 靈光：遠距離也看得出一條長長的狼身
    ctx.fillStyle = 'rgba(' + rimRGB + ',0.1)'; outline(ctx, q, 2.1); ctx.fill(); outline(ctx, q, 1.5); ctx.fill();
    // 墨身 + 往後掃的鬃毛：左右交錯、長短不一，像一筆筆刷出的毛（越靠近頭越長）
    ctx.fillStyle = INK; outline(ctx, q, 1); ctx.fill();
    ctx.beginPath();
    for (let i = 1; i < N - 3; i++) {
      const o = q[i], d = i % 2 ? 1 : -1, L = s * (0.75 - o.u * 0.6) * (0.6 + 0.4 * Math.sin(i * 2.3 + t * 2.5)) * (mane || 1);
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

  // 魔狼的動作完全由牠的戰鬥狀態推得（純視覺）：
  //   蓄勢（aim）伏低、鬃毛炸開、口漸開（躍擊伏得最低）；撲擊（dash）口全開、鬃毛往後貼、衝殺類頭往前拉長並拖出疾風，躍擊離地；
  //   樹影幢幢（ring）貼地狂奔、頭往圈心偏、身上留下殘影；收招（rec）合口、甩頭
  const WP = { jaw: 0, air: 0, crouch: 0, stretch: 0, mane: 1, shake: 0, lean: 0, ghost: 0, streak: 0 };
  function pose(m) {
    const p = Object.assign(WP, { jaw: 0, air: 0, crouch: 0, stretch: 0, mane: 1, shake: 0, lean: 0, ghost: 0, streak: 0 }), o = m.o;
    if (m.ms === 'aim' && o) {
      const k = U.clamp(1 - m.st / o.tele, 0, 1), c = k * k * (3 - 2 * k) * (o.leap ? 1 : o.w || o.len ? 0.8 : 0.6);
      p.jaw = k * 0.7; p.crouch = c; p.mane = 1 + 0.7 * c;
    } else if (m.ms === 'dash' && o) {
      const k = U.clamp(1 - m.st / m.dashT, 0, 1);
      p.jaw = 1; p.mane = 0.55; p.air = o.leap ? Math.sin(k * Math.PI) : 0;
      p.stretch = o.w || o.len || o.exit ? 1 : 0.5; p.streak = o.w || o.len || o.exit ? 1 - k * 0.5 : 0;
    } else if (m.ms === 'ring' && o) {
      p.jaw = 0.35; p.mane = 0.6; p.stretch = 0.6; p.ghost = 1; p.lean = m.dir * 0.35;
    } else if (m.ms === 'rec') {
      const k = U.clamp(m.st / 0.3, 0, 1); p.jaw = k * 0.5; p.shake = k;
    }
    return p;
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

  function bow(ctx, r, pull, p2, shade, tipC) {
    const glow = tipC || (p2 ? '#ff8a9a' : ICE), cx = r * 0.25, R0 = r * 1.05, A = 1.0;
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

  // 神羊每招的動作組（純視覺，只讀招式時間軸與 inst.dash）：
  //   spin 翻滾角、sq 縮成一團、air 騰空、dx 前後位移（負＝後仰 / 後座力）、turn 轉頭、bowA 弓的擺角、pull 拉弓（>1 過拉）、trem 拉滿的顫動、
  //   rune 身前符陣、halo 身周符環、flare 眼窩爆亮、curse 咒箭、gather 聚光、sanct 聖域靈光
  const LP = {};
  const ease = (x) => x * x * (3 - 2 * x), win = (T, a, b) => U.clamp((T - a) / (b - a), 0, 1), bump = (T, a, b) => Math.sin(win(T, a, b) * Math.PI);
  function lambPose(o) {
    const p = Object.assign(LP, { spin: 0, sq: 0, air: 0, dx: 0, turn: 0, bowA: 0, pull: 0, trem: 0, rune: 0, halo: 0, flare: 0, curse: 0, gather: 0, sanct: 0 });
    if (o.world && BD.hasStatus(o, 'respite')) p.sanct = 1;
    const inst = o.inst;
    if (o.state !== 'skill' || !inst || !inst.v) return p;
    const id = inst.skill.id, T = inst.t, P = R.skillPace(inst, TRIG), kick = P.snap, draw = P.a && kick <= 0 ? P.wind : 0;
    const look = (u) => (u ? U.clamp(U.angDiff(o.face, U.angTo(o, u)), -0.7, 0.7) : 0);
    p.dx = -kick * 5; p.pull = draw;
    if (id === 'arrows') { // 側滾：縮成一團轉一圈、弓收在懷裡；落地一沉，扇形放箭時弓順著扇面掃過
      const tb = inst.v.actions[0], e = tb.at + tb.dur, k = win(T, tb.at, e), d = inst.dash;
      const dir = d ? Math.sign(Math.cos(o.face) * d.vy - Math.sin(o.face) * d.vx) || 1 : 1;
      p.spin = dir * U.TAU * ease(k); p.sq = Math.sin(k * Math.PI) * 0.3 + bump(T, e, e + 0.1) * 0.12; p.bowA = -Math.sin(k * Math.PI) * 1.2;
      if (T < e) p.pull = 0;
      if (kick > 0 && P.a) p.bowA = (kick - 0.5) * (P.a.spread || 0) * ((P.a.n || 1) - 1);
    } else if (id === 'dread') { // 咒箭兩連射；第二箭離弦後回頭看魔狼、眼窩爆亮——下令撲殺
      p.curse = 1;
      if (P.n >= 2) { const k = win(T, 0.5, 0.62); p.turn = look(BD.wolfOf(o.world, o)) * k; p.flare = k * (1 - win(T, 0.9, 1.2)); }
    } else if (id === 'pincer') { // 拉滿銀弓：過拉、後仰、末段顫動，光點往箭尖聚攏；放箭時大後座
      p.pull = draw * 1.35; p.dx = -draw * 4 - kick * 9; p.trem = U.clamp((draw - 0.75) * 4, 0, 1); p.gather = draw; p.flare = Math.max(draw * 0.6, kick);
    } else if (id === 'mark') { // 宣告：弓往前舉、身前符陣隨預警轉開；符印爆開時符陣碎散、往後一震
      const a = inst.v.actions[0], hit = a.at + a.dur, k = win(T, a.at, hit), s = T >= hit ? 1 - win(T, hit, hit + 0.25) : 0;
      p.rune = T < hit ? ease(Math.min(1, k * 3)) * (0.75 + 0.25 * k) : s; p.dx = 3 * (T < hit ? ease(Math.min(1, k * 3)) : 0) - 4 * s; p.bowA = -0.25 * p.rune; p.flare = s;
    } else if (id === 'leap') { // 躍步：先蹲（壓扁後縮），躍出後從空中落下、途中放箭，落地再一沉
      const b = inst.v.actions[0].at, a = win(T, b, b + 0.24);
      if (T < b) { p.sq = win(T, 0, b) * 0.22; p.dx -= win(T, 0, b) * 3; } else { p.air = 1 - ease(a); p.sq = bump(T, b + 0.2, b + 0.32) * 0.15; }
    } else if (id === 'frenzy' || id === 'ult') { // 劃獵場：弓往外一揮、眼窩亮起，再拉弓補箭；大招先跪地一沉，聖域展開時爆亮
      const c = win(T, 0, 0.4);
      p.bowA = -Math.sin(c * Math.PI) * 0.9; p.flare = Math.sin(c * Math.PI) * 0.7;
      if (P.i === 0 && kick <= 0) p.pull = win(T, 0.4, P.a ? P.a.at : 0.7);
      if (id === 'ult') { p.sq = bump(T, 0, 0.3) * 0.2; p.flare = Math.max(p.flare, bump(T, 0.15, 0.6)); p.halo = 1 - win(T, 0.6, 1.0); }
    } else if (id === 'maw') { // 撕咬：弓往後收、再朝獵物猛然一指，眼窩爆亮
      const k1 = ease(win(T, 0, 0.15)), k2 = win(T, 0.15, 0.32);
      p.bowA = -0.7 * k1 * (1 - k2) + 0.35 * Math.sin(k2 * Math.PI); p.dx = -3 * k1 * (1 - k2) + 5 * Math.sin(k2 * Math.PI); p.flare = k2 * (1 - win(T, 0.45, 0.9));
    } else if (id === 'shadows') { // 「開始狩獵吧」：身周符環亮起，目光一路追著繞圈的魔狼；圈合上時爆亮
      const tl = inst.v.actions[0], e = tl.at + tl.tele;
      p.halo = win(T, tl.at, tl.at + 0.2) * (1 - win(T, e, e + 0.2)); p.turn = look(BD.wolfOf(o.world, o)) * p.halo; p.flare = Math.max(p.halo * 0.4, bump(T, e - 0.05, e + 0.35));
    }
    return p;
  }

  function body(ctx, o, t, { r }) {
    const shade = !!o.shade, p2 = o.phase === 2, p = lambPose(o), gc = p2 ? '255,120,140' : '140,225,255';
    if (p.sanct && !shade) { // 聖域靈光：羊毛泛出銀光、身周一圈緩轉的光點
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.7);
      g.addColorStop(0, 'rgba(' + gc + ',' + (0.18 + 0.07 * Math.sin(t * 6)) + ')'); g.addColorStop(1, 'rgba(' + gc + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, U.TAU); ctx.fill();
      ctx.fillStyle = SILVER;
      for (let i = 0; i < 6; i++) { const a = t * 1.6 + i * U.TAU / 6; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45, 2.2, 0, U.TAU); ctx.fill(); }
      ctx.restore();
    }
    if (p.halo > 0.01 && !shade) { // 身周符環：七道符刻（對應七道殘影）
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= p.halo; ctx.strokeStyle = 'rgba(' + gc + ',0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.55, 0, U.TAU); ctx.stroke();
      ctx.lineWidth = 3; for (let i = 0; i < 7; i++) { const a = -t * 2 + i * U.TAU / 7; ctx.beginPath(); ctx.arc(0, 0, r * 1.75, a, a + 0.35); ctx.stroke(); }
      ctx.restore();
    }
    ctx.save();
    if (p.trem) ctx.translate(0, Math.sin(t * 70) * p.trem);
    ctx.translate(p.dx, 0); ctx.rotate(p.turn + p.spin);
    const sc = 1 + p.air * 0.22; ctx.scale(sc * (1 - p.sq), sc * (1 - p.sq * 0.4));
    if (shade) { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, U.TAU); ctx.fill(); }
    else R.blit(ctx, 'body:kindred:lamb:' + r, r * 2.6 + 10, r * 2.6 + 10, r * 1.3 + 5, r * 1.3 + 5, (g) => lambBody(g, r));
    if (!shade) { // 狼面具的眼窩（冷藍；下令 / 爆發時爆亮，二階段轉橘紅）
      const f = p.flare, ec = p2 && f > 0.05 ? '255,140,90' : '120,220,255';
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const d of [1, -1]) {
        ctx.fillStyle = 'rgba(' + ec + ',' + (0.45 + 0.3 * f) + ')'; ctx.beginPath(); ctx.arc(r * 0.55, d * r * 0.17, r * 0.15 * (1 + f * 0.3), 0, U.TAU); ctx.fill();
        if (f > 0.05) { // 爆亮：眼縫往後拖出兩道細長的光痕
          ctx.strokeStyle = 'rgba(' + ec + ',' + 0.8 * f + ')'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(r * 0.55, d * r * 0.17); ctx.lineTo(r * (0.55 - 0.6 * f), d * r * (0.17 + 0.18 * f)); ctx.stroke();
        }
        ctx.fillStyle = '#d8f8ff'; ctx.beginPath(); ctx.arc(r * 0.55, d * r * 0.17, r * 0.06, 0, U.TAU); ctx.fill();
      }
      ctx.restore();
    }
    ctx.save(); ctx.rotate(p.bowA);
    bow(ctx, r, p.pull, p2, shade, p.curse ? '#b896ff' : null);
    if (p.gather > 0.05 && !shade) { // 拉滿時光點往箭尖聚攏
      const tip = r * 1.65;
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(' + gc + ',' + 0.8 * p.gather + ')';
      for (let i = 0; i < 6; i++) { const ph = (t * 2.4 + i / 6) % 1, a = i * 1.05 + t, dd = r * 1.4 * (1 - ph); ctx.beginPath(); ctx.arc(tip + Math.cos(a) * dd, Math.sin(a) * dd, 1.5 + ph * 1.5, 0, U.TAU); ctx.fill(); }
    }
    ctx.restore();
    ctx.restore();
    if (p.rune > 0.01 && !shade) { // 身前符陣：外環 + 六道符刻 + 內三角，隨預警轉開
      const cx = r * 2, rr = r * 0.75 * p.rune;
      ctx.save(); ctx.translate(cx, 0); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(' + gc + ',' + 0.8 * p.rune + ')'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, U.TAU); ctx.stroke();
      ctx.rotate(t * 2.5); ctx.lineWidth = 2.6;
      for (let i = 0; i < 6; i++) { const a = i * U.TAU / 6; ctx.beginPath(); ctx.arc(0, 0, rr * 1.2, a, a + 0.5); ctx.stroke(); }
      ctx.rotate(-t * 5); ctx.lineWidth = 1.4; ctx.beginPath();
      for (let i = 0; i < 3; i++) { const a = i * U.TAU / 3; i ? ctx.lineTo(Math.cos(a) * rr * 0.7, Math.sin(a) * rr * 0.7) : ctx.moveTo(Math.cos(a) * rr * 0.7, Math.sin(a) * rr * 0.7); }
      ctx.closePath(); ctx.stroke();
      ctx.restore();
    }
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
    const ha = (m.ms === 'prowl' ? Math.atan2(q[0].y - q[1].y, q[0].x - q[1].x) : m.ang) + P.lean + P.shake * Math.sin(m.st * 45) * 0.25;
    if (P.streak > 0.05) { // 衝殺的疾風：頭後拖出三道往後的光線
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(' + (p2 ? '255,110,50' : '120,210,255') + ',' + 0.5 * P.streak + ')'; ctx.lineCap = 'round';
      for (const l of [-0.35, 0, 0.35]) {
        const bx = q[0].x - Math.sin(ha) * l * s, by = q[0].y + Math.cos(ha) * l * s, L = s * (l ? 2.4 : 3.4);
        ctx.lineWidth = l ? 2 : 3; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - Math.cos(ha) * L, by - Math.sin(ha) * L); ctx.stroke();
      }
      ctx.restore();
    }
    drawBody(ctx, q, s, t, p2, hurt, P.mane);
    const k = (1 + P.air * 0.2) * 1.3; // 頭比頸粗一圈
    if (P.ghost) for (const [i, a] of [[5, 0.3], [10, 0.15]]) { // 樹影幢幢：沿身軀留下兩個狼頭殘影
      const o = q[i];
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(o.x, o.y); ctx.rotate(Math.atan2(o.ty, o.tx)); ctx.scale(k, k);
      drawHead(ctx, s, 0.6, p2, false); ctx.restore();
    }
    ctx.save(); ctx.translate(q[0].x, q[0].y); ctx.rotate(ha);
    ctx.scale(k * (1 + 0.15 * P.stretch - 0.06 * P.crouch), k * (1 - 0.12 * P.crouch - 0.08 * P.stretch)); // 伏低縮頸、衝殺拉長
    if (P.crouch > 0.05) { // 蓄勢：頭後一圈收緊的冷光
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(' + (p2 ? '255,110,50' : '120,210,255') + ',' + 0.55 * P.crouch + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(-s * 0.1, 0, s * (1.1 - 0.4 * P.crouch), Math.PI * 0.55, Math.PI * 1.45); ctx.stroke(); ctx.restore();
    }
    drawHead(ctx, s, P.jaw, p2, hurt);
    ctx.restore();
    const bw = 44, y = m.y - s * 0.95 - P.air * s * 1.1; // 迷你血條：魔狼可以被打散
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(m.x - bw / 2, y, bw, 4);
    ctx.fillStyle = R.TEAM[m.team]; ctx.fillRect(m.x - bw / 2, y, bw * U.clamp(m.hp / m.maxHp, 0, 1), 4);
    ctx.restore();
  }

  R.defineBossStyle('kindred', { body, under, over });
})(typeof window !== 'undefined' ? window : globalThis);
