'use strict';
// Boss 造型：飛將呂布：半裸古銅肌肉胸膛、赤紅戰袍披風、金冠雙雉翎、方天畫戟（二階段赤兔馬戰騎剪影）
// 逐招動畫：T 表以「蓄力 → 引 → 擊 → 收」關鍵值驅動軀幹扭轉、前衝、蹲伏、戟角與赤兔姿態，連段姿態混合不跳格；衝刺 / 逆斬守勢 / 狂喜抖動為特例 special()
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;

  // 視覺放大：判定半徑不變，只放大繪製（戟、翎、赤兔在一般縮放下更易辨識）
  const VIS = 1.25;

  // 逐招動畫：T 表以「蓄力 → 引 → 擊 → 收」關鍵值描述每招的軀幹、戟、赤兔姿態；衝刺中與守勢等特例在 special()
  const TRIG = { hit: 1, dash: 1 };
  const REST = 0.35;
  const TAU = U.TAU, PI = Math.PI;
  const ease = (u) => 1 - (1 - u) * (1 - u);
  const lerp = (a, b, u) => a + (b - a) * u;
  const _ = undefined;
  // 姿態參數預設值（tx / fwd 以半徑 r 為單位）：ga 戟角、tx 握點前後位移、fs 戟長縮放（高舉時透視縮短）、rot 軀幹扭轉、fwd 整體前衝、
  // sq 蹲伏壓縮、big 整體放大（落地重壓）、gl 戟刃蓄力光、bl 戟刃伸長、hl 赤兔前傾（負值為人立）
  const DEF = { ga: REST, tx: 0, fs: 1, rot: 0, fwd: 0, sq: 1, big: 1, gl: 0, bl: 1, hl: 0 };
  const KEYS = Object.keys(DEF);

  // 每招每個出手動作一組：key: [引（蓄滿）, 擊, 起始 = DEF, 收招 = 起始, 擊後衰減起點 = 擊]；tr 揮弧殘影濃度
  const SWEEP = { ga: [1.9, -1.2], tx: [-0.2, 0.1], rot: [0.45, -0.4], fwd: [-0.12, 0.22], sq: [0.94, 1], fs: [1, 1.08], gl: [0.6, 0.2], tr: 0.3 };
  // 後拉突刺：戟收腰後、握點後縮蓄滿，擊時整個人貼上去
  const THRUST = { ga: [0.15, 0], tx: [-0.6, 0.95], rot: [0.35, -0.2], fwd: [-0.25, 0.45], sq: [0.88, 1], fs: [1, 1.12], gl: [1, 0.7], hl: [0.3, 0] };
  // 高舉重劈：戟高舉過頂（透視縮短）→ 劈下變長，落地重壓放大再彈回
  const CHOP = { ga: [0.1, 0.1], fs: [0.45, 1.3], sq: [0.88, 1], big: [1, 1.08], fwd: [-0.1, 0.28], gl: [1, 0.8] };
  // 低身蓄勢：蹲伏、戟平端；衝刺中與衝刺後（special）改成戟尖前伸
  const CHARGE = { ga: [0, 0], tx: [-0.3, 0.3], fs: [1, 1.15], rot: [0.3, 0], fwd: [-0.25, 0.3, _, 0.05, 0.3], sq: [0.84, 0.84, _, 1, 0.84], gl: [1, 0.8], hl: [0.5, 1, _, 0, 1] };
  // 天喰巨劈：高舉蓄滿（戟刃隨蓄力伸長）→ 全力斬落
  const CLEAVE = { ga: [0.1, 0.1], fs: [0.35, 1.45], sq: [0.8, 1], big: [1, 1.12], fwd: [-0.15, 0.4], gl: [1, 1], bl: [1.8, 1.8] };
  const whirl = (s) => ({ ga: [2, 2 + s * TAU, REST, REST + s * TAU, 2 + s * TAU], rot: [-s * 0.6, s * (TAU - 0.6), 0, s * TAU, s * (TAU - 0.6)], fwd: [-0.05, 0.08], sq: [0.9, 1], big: [1, 1.04], gl: [0.5, 0.3], tr: 0.3 });
  const T = {
    // 方天掃：轉腰把戟拖到身後 → 一路橫掃到另一側；二階段再補一記戟尾頓地的震波
    fangtian_sweep: [SWEEP, { ga: [0.1, 0.1], fs: [0.5, 1.25], sq: [0.88, 1], big: [1, 1.08], fwd: [-0.08, 0.2], gl: [1, 0.7] }],
    randgriz_thrust: [THRUST],
    // 凌空怒劈：低身蓄勢 → 躍空衝刺（special）→ 落地重劈震波
    sky_cleave: [CHARGE, { ga: [0.1, 0.1], fs: [1.3, 1.3], sq: [0.92, 0.92], big: [1.06, 1.06], gl: [0.8, 0.8] }],
    // 神境逆斬：前 0.45s 橫戟守勢（special）→ 收戟蓄勢 → 反手斜斬
    godcut: [{ ga: [1.7, -1.2], tx: [-0.1, 0.1], rot: [0.5, -0.45], fwd: [-0.1, 0.25], sq: [0.95, 1], gl: [1, 0.3], tr: 0.3 }],
    rift_cut: [CHOP],
    // 戟舞：旋身讓步、整圈迴旋；二階段反向再轉一圈
    dodge_whirl: [whirl(1), whirl(-1)],
    centaur_charge: [CHARGE, THRUST],
    // 狂喜：赤兔人立、仰天長笑，戟高舉，身軀抖動（special）
    proud_laugh: [{ ga: [0.2, 0.2], fs: [0.4, 0.4], big: [1, 1.1], sq: [0.96, 1], fwd: [-0.05, 0], gl: [0.6, 0.6], hl: [-0.8, -0.8], rot: [-0.15, 0] }],
    ult: [CLEAVE],
    ult2: [CHARGE, CLEAVE],
  };

  // 重用物件：本幀姿態（A）、擊後混合用（B）、出手節奏（P）
  const A = Object.assign({ s0: 0, sa: 0, speed: 0, guard: 0 }, DEF), B = {};
  const P = { L: -1, N: -1, wd: 0, sn: 0, sw: 0, since: 0, dashN: false };

  // 出手節奏：擊後 0.25s 內仍保留「擊」姿態並與下一手的蓄力混合，連段不跳格；衝刺以落地時刻起算
  function pace(inst) {
    const t = inst.t; let L = null, N = null, n = 0;
    P.L = P.N = -1;
    for (const a of inst.v.actions) {
      if (!TRIG[a.do]) continue;
      if (a.at <= t) { L = a; P.L = n; } else { N = a; P.N = n; break; }
      n++;
    }
    const endL = L ? L.at + (L.do === 'dash' ? L.dur : 0) : 0;
    P.since = L ? t - endL : 0;
    P.sn = L && P.since >= 0 && P.since < 0.25 ? 1 - P.since / 0.25 : 0;
    P.wd = N ? U.clamp((t - endL) / Math.max(0.05, N.at - endL), 0, 1) : 0;
    P.dashN = !!N && N.do === 'dash';
    return P;
  }
  // 把一組關鍵值展開成姿態：蓄力（a = hold, b = sw）/ 擊後衰減（a = sn）/ 收招定格
  function ev(O, e, mode, a, b) {
    for (const k of KEYS) {
      const x = e[k];
      if (!x) { O[k] = DEF[k]; continue; }
      const r0 = x[2] === _ ? DEF[k] : x[2], end = x[3] === _ ? r0 : x[3];
      O[k] = mode === 'snap' ? lerp(end, x[4] === _ ? x[1] : x[4], a) : mode === 'end' ? end : b > 0 ? lerp(x[0], x[1], b) : lerp(r0, x[0], a);
    }
  }
  function build(sid, p) {
    const E = T[sid], ent = (i) => E[Math.min(i, E.length - 1)];
    const eN = p.N >= 0 ? ent(p.N) : null, eL = p.L >= 0 ? ent(p.L) : null;
    p.sw = 0;
    if (eN) {
      p.sw = p.dashN || p.wd < 0.7 ? 0 : ease((p.wd - 0.7) / 0.3);
      ev(A, eN, 'wind', ease(Math.min(1, p.wd / 0.6)), p.sw);
      if (eL && p.sn > 0) { ev(B, eL, 'snap', p.sn); for (const k of KEYS) A[k] = lerp(A[k], B[k], p.sn); }
    } else if (eL) ev(A, eL, p.sn > 0 ? 'snap' : 'end', p.sn);
    if (eL && eL.tr && p.sn > 0) { A.s0 = eL.ga[0]; A.sa = eL.tr * p.sn; }
    else if (eN && eN.tr && p.sw > 0) { A.s0 = eN.ga[0]; A.sa = eN.tr * p.sw; }
  }
  // 無法用關鍵值表達的動作：衝刺中的姿態、逆斬守勢、狂喜抖動
  function special(sid, inst) {
    const d = inst.dash, t = inst.t;
    if (d) {
      const q = U.clamp(d.t / d.dur, 0, 1);
      A.speed = 1; A.hl = 1;
      if (sid === 'sky_cleave') Object.assign(A, { ga: 0.1, tx: 0.4, fs: 1.25, rot: 0, sq: 0.9, fwd: 0.3, big: 1 + 0.14 * Math.sin(PI * q), gl: 0.9 }); // 躍空：整體放大再落下
      else Object.assign(A, { ga: 0, tx: 0.3, fs: 1.15, rot: 0, sq: 0.86, fwd: 0.3, gl: 0.8 });
    } else if (sid === 'godcut') { // 逆斬見切窗口：立刻橫戟，收招前漸收回蓄勢
      const g = U.clamp(t / 0.1, 0, 1) * (1 - U.clamp((t - 0.45) / 0.15, 0, 1));
      if (g > 0) { A.guard = g; A.ga = lerp(A.ga, -1.45, g); A.tx = lerp(A.tx, 0.1, g); A.rot = lerp(A.rot, 0.2, g); A.sq = lerp(A.sq, 0.96, g); A.fwd = lerp(A.fwd, -0.05, g); A.gl = lerp(A.gl, 1, g); }
    } else if (sid === 'proud_laugh') A.rot += Math.sin(t * 40) * 0.07 * (P.N >= 0 ? P.wd : P.sn);
  }

  // 對撞連拚（R.rally）：戟對準接點，碰的瞬間（s = 1）戟身剛好穿過接點，之後後甩蓄力、加速劈回下一個接點
  function rallyPose(rl, r) {
    for (const k of KEYS) A[k] = DEF[k];
    A.s0 = 0; A.sa = 0; A.speed = 0; A.guard = 0;
    A.tx = -0.1; A.fwd = 0.1 * rl.s - 0.05 * (1 - rl.s);
    const hpx = r * 0.15, hpy = r * 0.6, c = rl.c - A.fwd * r, d = Math.hypot(c - hpx, hpy);
    A.ga = Math.atan2(-hpy, c - hpx) + rl.off; A.fs = lerp(0.8, U.clamp(d * 1.25 / (r * 3.4), 0.55, 1.1), rl.s);
    A.rot = rl.off * 0.15; A.gl = 0.3 + 0.7 * rl.s; A.sq = 1 - 0.04 * (1 - rl.s);
  }

  // 地面層（畫在身體底下）：碎裂紋、震波環、速度線、斬擊光帶
  function crack(ctx, x, y, rad, a, col) {
    ctx.strokeStyle = hexA(col, a); ctx.lineWidth = 2.2; ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const an = i * 0.785 + 0.2, l = rad * (0.6 + 0.2 * (i % 3));
      ctx.moveTo(x + Math.cos(an) * rad * 0.2, y + Math.sin(an) * rad * 0.2); ctx.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l);
    }
    ctx.stroke();
  }
  function ring(ctx, x, y, rad, a, col, w) {
    ctx.strokeStyle = hexA(col, a); ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, Math.max(1, rad), 0, TAU); ctx.stroke();
  }
  function streaks(ctx, r, col, a) {
    ctx.strokeStyle = hexA(col, 0.5 * a); ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i < 5; i++) { const y = (i - 2) * r * 0.36, x0 = -r * (0.9 + (i % 2) * 0.4); ctx.moveTo(x0, y); ctx.lineTo(x0 - r * (1.6 + 0.4 * (i % 3)), y); }
    ctx.stroke();
  }
  function wedge(ctx, rad, half, col, a) {
    ctx.fillStyle = hexA(col, 0.14 * a); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, rad, -half, half); ctx.closePath(); ctx.fill();
  }
  function beam(ctx, len, col, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA(col, 0.55 * a); ctx.lineWidth = 3 + 14 * a; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
    ctx.strokeStyle = hexA('#ffffff', 0.8 * a); ctx.lineWidth = 1 + 3 * a; ctx.stroke();
    ctx.restore();
  }
  function motes(ctx, r, col, k, n) { // 光點向身上收束
    ctx.fillStyle = hexA(col, 0.8 * k);
    for (let i = 0; i < n; i++) { const an = i * TAU / n + k * 3, d = (1 - k) * r * 5 + r * 0.8; ctx.beginPath(); ctx.arc(Math.cos(an) * d, Math.sin(an) * d, 3, 0, TAU); ctx.fill(); }
  }
  function decor(ctx, sid, r, p, p2, t) {
    const tint = p2 ? '#ff6a6a' : '#dfe6f2', rc = p2 ? '#ff2b38' : '#d8c8aa', scar = p2 ? '#3a0810' : '#2a2018';
    if (A.speed > 0) streaks(ctx, r, tint, 1);
    if (A.guard > 0.05) { // 橫戟前方的見切光弧
      ctx.strokeStyle = hexA('#e8f0f8', 0.35 * A.guard * (0.6 + 0.4 * Math.sin(t * 14))); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, r * 1.9, -0.9, 0.9); ctx.stroke();
    }
    if (!p) return;
    const sn = p.sn, L = p.L, N = p.N, wd = p.wd, since = p.since, landing = L === 0 && since >= 0 && since < 0.3;
    if (landing && (sid === 'sky_cleave' || sid === 'centaur_charge' || sid === 'ult2')) ring(ctx, 0, 0, r * (1.2 + 2 * since / 0.3), 1 - since / 0.3, '#a89a80', 4); // 落地塵環
    if (sid === 'fangtian_sweep') {
      if (L === 0 && sn > 0) wedge(ctx, p2 ? 205 : 185, p2 ? 1.4 : 1.31, tint, sn);
      else if (L === 1 && sn > 0) { ring(ctx, 0, 0, 150 * (1.15 - 0.35 * sn), sn * 0.8, rc, 7); crack(ctx, 0, 0, 130, sn, scar); }
    } else if (sid === 'randgriz_thrust') {
      if (sn > 0) { streaks(ctx, r, tint, sn); crack(ctx, 250, 0, 30, sn, scar); }
    } else if (sid === 'sky_cleave') {
      if (L === 1 && sn > 0) { ring(ctx, 0, 0, 120 * (1.15 - 0.35 * sn), sn * 0.8, rc, 7); crack(ctx, 0, 0, 110, sn, scar); }
    } else if (sid === 'godcut') {
      if (sn > 0) wedge(ctx, 190, 0.96, '#ff2b38', sn);
    } else if (sid === 'rift_cut') {
      if (sn > 0) { beam(ctx, 330, '#ff2b38', sn); crack(ctx, 300, 0, 40, sn, scar); }
    } else if (sid === 'dodge_whirl') {
      if (N >= 0 && wd > 0.2) { // 旋身讓步：腳下捲起氣流弧
        ctx.strokeStyle = hexA(rc, 0.35 * wd); ctx.lineWidth = 4;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(0, 0, r * 1.5, t * 14 + k * 2.094, t * 14 + k * 2.094 + 1); ctx.stroke(); }
      }
      if (sn > 0) { ring(ctx, 0, 0, (L === 1 ? 180 : 160) * (1.15 - 0.35 * sn), sn * 0.8, rc, 7); crack(ctx, 0, 0, 120, sn, scar); }
    } else if (sid === 'centaur_charge') {
      if (L === 1 && sn > 0) { streaks(ctx, r, tint, sn); crack(ctx, 120, 0, 40, sn, scar); }
    } else if (sid === 'proud_laugh') {
      if (N === 0) motes(ctx, r, '#ff4040', wd, 8);
      else if (sn > 0) { ring(ctx, 0, 0, 50 + 250 * (1 - sn), sn * 0.7, '#c0392b', 6); ring(ctx, 0, 0, 30 + 160 * (1 - sn), sn * 0.5, '#ff2b38', 4); }
    } else if (sid === 'ult' || sid === 'ult2') {
      const c = sid === 'ult2' ? 1 : 0;
      if (N === c) { // 天喰蓄力：腳下符環收縮旋轉、光點匯入
        ctx.save(); ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 60; ring(ctx, 0, 0, r * (2.6 - wd), 0.15 + 0.5 * wd, rc, 3); ctx.restore();
        motes(ctx, r, '#ff4040', wd, 10);
      } else if (L === c && sn > 0) { beam(ctx, 1200, '#ff2b38', sn); ring(ctx, 0, 0, 200 * (1.15 - 0.35 * sn), sn * 0.8, rc, 8); crack(ctx, 0, 0, 170, sn, scar); }
    }
  }

  // 赤兔馬（二階段坐騎；換階段時由身後奔入）：lean 衝鋒時往前拉長
  function drawHorse(ctx, r, t, lean) {
    if (lean) ctx.scale(1 + 0.15 * lean, 1 - 0.06 * lean);
    // 赤兔馬身軀輪廓（以精靈快取靜態徑向漸層）
    R.blit(ctx, 'body:lubu:horse:' + r, r * 3.6 + 20, r * 1.8 + 20, r * 1.9 + 10, r * 0.9 + 10, (g) => {
      g.beginPath();
      g.moveTo(r * 1.6, 0);               // 馬吻
      g.lineTo(r * 1.45, -r * 0.22);       // 額頂
      g.lineTo(r * 1.25, -r * 0.35);       // 馬耳
      g.lineTo(r * 1.15, -r * 0.2);        // 耳根
      g.lineTo(r * 0.5, -r * 0.42);        // 頸脊
      g.lineTo(-r * 0.4, -r * 0.68);       // 側肋
      g.quadraticCurveTo(-r * 1.5, -r * 0.72, -r * 1.7, 0); // 臀部
      g.quadraticCurveTo(-r * 1.5, r * 0.72, -r * 0.4, r * 0.68);
      g.lineTo(r * 0.5, r * 0.42);
      g.lineTo(r * 1.15, r * 0.2);
      g.lineTo(r * 1.25, r * 0.35);
      g.lineTo(r * 1.45, r * 0.22);
      g.closePath();

      const gr = g.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.6);
      gr.addColorStop(0, '#9a1622');
      gr.addColorStop(1, '#48080e');
      g.fillStyle = gr;
      g.fill();
      g.strokeStyle = '#280408';
      g.lineWidth = 2.5;
      g.stroke();
    });

    // 赤兔馬動態烈火馬尾與飄逸鬃毛
    const tailSway = Math.sin(t * 8) * r * 0.25;
    ctx.strokeStyle = 'rgba(255,50,40,0.85)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 1.6, 0);
    ctx.quadraticCurveTo(-r * 2.1, tailSway * 0.6, -r * 2.5, tailSway);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,140,50,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 1.6, 0);
    ctx.quadraticCurveTo(-r * 2.0, -tailSway * 0.5, -r * 2.3, -tailSway * 0.8);
    ctx.stroke();

    // 烈焰鬃毛光絲
    for (let i = 0; i < 4; i++) {
      const mx = r * (0.8 - i * 0.35);
      const my = Math.sin(t * 12 + i * 1.5) * 3;
      ctx.strokeStyle = `rgba(255,${120 + i * 30},40,0.7)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx, -r * 0.2);
      ctx.lineTo(mx - r * 0.2, -r * 0.5 + my);
      ctx.stroke();
    }
  }
  function drawBody(ctx, o, t, { def, r, st, act, swing }) {
      const p2 = o.phase === 2;

      const stag = o.state === 'stagger' || o.state === 'stun'; // 被打斷：回到待機姿態
      const live = !stag && o.inst ? o.inst : null;
      const inst = live && live.skill && live.v && live.v.actions ? live : null;
      const raise = !stag && !inst && o.pose === 'raise'; // 換階段咆哮前高舉方天畫戟
      let p = null, sid = '';
      if (inst || raise) {
        for (const k of KEYS) A[k] = DEF[k];
        A.s0 = 0; A.sa = 0; A.speed = 0; A.guard = 0;
      }
      if (inst) {
        sid = inst.skill.id === 'ult' && p2 ? 'ult2' : inst.skill.id; p = pace(inst);
        if (T[sid]) build(sid, p);
        special(sid, inst);
        if (A.gl >= 0.95 && p.N >= 0 && p.sw === 0 && !inst.dash) A.rot += Math.sin(t * 45) * 0.025; // 蓄滿力時顫動
      } else if (raise) { A.ga = 0.2; A.fs = 1 - 0.6 * Math.min(1, (o.poseK || 0) / 0.5); }
      const rl = !stag && !inst && !raise && R.rally(o); // rl：對撞連拚的揮刀節奏（R.rally）
      if (rl) rallyPose(rl, r);
      const w = inst || raise || rl ? A : null;
      if (w) { decor(ctx, sid, r, p, p2, t); ctx.save(); ctx.translate(w.fwd * r, 0); if (w.big !== 1) ctx.scale(w.big, w.big); if (w.sq !== 1) ctx.scale(w.sq, 1 + (1 - w.sq) * 0.5); }
      // 1. 赤兔馬：二階段坐騎（衝鋒時前傾、狂喜時人立）；換階段時 horseK 0→1 由身後奔入、漸顯
      if (p2) { ctx.save(); drawHorse(ctx, r, t, w ? w.hl : 0); ctx.restore(); }
      else if (o.horseK > 0) {
        ctx.save(); ctx.translate(-r * 7 * (1 - o.horseK), 0); ctx.globalAlpha *= o.horseK; drawHorse(ctx, r, t, 1 - o.horseK); ctx.restore();
      }
      // 斷腿傲立：狂怒期間全身赤紅氣焰
      if (o.statuses && BD.hasStatus(o, 'enrage')) {
        const a = 0.35 + 0.2 * Math.sin(t * 12);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = hexA('#d83ad8', a * 0.5); ctx.beginPath(); ctx.arc(0, 0, r * 1.25, 0, U.TAU); ctx.fill(); // 原作洋紅鬥氣
        for (let i = 0; i < 6; i++) {
          const ang = i / 6 * U.TAU + t * 2, fl = 0.5 + 0.5 * Math.sin(t * 18 + i * 2.1);
          ctx.fillStyle = hexA('#f060e8', a * fl);
          ctx.beginPath(); ctx.arc(Math.cos(ang) * r * 0.95, Math.sin(ang) * r * 0.95, r * (0.12 + 0.1 * fl), 0, U.TAU); ctx.fill();
        }
        ctx.restore();
      }
      if (w && w.rot) ctx.rotate(w.rot); // 只有騎士的軀幹扭轉，赤兔不跟著轉
      const spd = w ? w.speed : 0, cl = 1 + 0.4 * spd; // 衝刺時披風、雉翎向後拉長

      // 2. 赤紅戰袍披風（隨時間與動作起伏飄揚）
      const capeSway = Math.sin(t * 5) * 0.15 + 0.3 * spd;
      ctx.fillStyle = p2 ? '#0a0e1c' : '#161c36'; // 原作為深藍黑長披風
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.8);
      for (let i = 1; i <= 5; i++) {
        const cx = -r * 0.2 - i * (r * 1.6 / 5) * cl;
        const cy = -r * 0.8 + i * (r * 1.6 / 5) + Math.sin(t * 6 + i) * r * 0.18 + capeSway * r;
        ctx.lineTo(cx, cy);
      }
      ctx.lineTo(-r * 0.2, r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d4af37'; // 戰袍金邊
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 3. 魁梧半裸軀幹（古銅膚色胸膛 + 腰間獸面甲裙）以精靈快取
      R.blit(ctx, 'body:lubu:torso:' + r + ':' + (p2 ? 2 : 1), r * 2.2 + 20, r * 2.0 + 20, r * 0.9 + 10, r * 1.0 + 10, (g) => {
        // 寬闊肩背與胸肌底輪廓
        g.beginPath();
        g.moveTo(r * 0.45, 0);
        g.lineTo(r * 0.35, -r * 0.7);
        g.lineTo(-r * 0.2, -r * 0.82);
        g.lineTo(-r * 0.5, -r * 0.55);
        g.lineTo(-r * 0.5, r * 0.55);
        g.lineTo(-r * 0.2, r * 0.82);
        g.lineTo(r * 0.35, r * 0.7);
        g.closePath();

        // 健壯肌肉膚色漸層
        const gr = g.createRadialGradient(r * 0.15, 0, 2, 0, 0, r * 0.9);
        gr.addColorStop(0, '#e8b896');
        gr.addColorStop(0.65, '#c5855f');
        gr.addColorStop(1, '#8e4c2b');
        g.fillStyle = gr;
        g.fill();
        g.strokeStyle = '#5a2e16';
        g.lineWidth = 2;
        g.stroke();

        // 雙肩紫色菱形魚鱗刺青（原作標誌）：裁切在軀幹內，只畫兩肩帶
        g.save(); g.clip();
        g.strokeStyle = 'rgba(96, 48, 150, 0.7)';
        g.lineWidth = 1.2;
        const step = r * 0.2;
        for (const side of [-1, 1]) {
          g.beginPath();
          for (let k = -4; k <= 4; k++) {
            g.moveTo(-r * 0.2 + k * step, side * r * 0.5); g.lineTo(r * 0.3 + k * step, side * r * 0.9);
            g.moveTo(r * 0.3 + k * step, side * r * 0.5); g.lineTo(-r * 0.2 + k * step, side * r * 0.9);
          }
          g.stroke();
        }
        g.restore();

        // 胸肌與腹肌陰影線條
        g.strokeStyle = 'rgba(110, 50, 25, 0.55)';
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(-r * 0.15, 0); g.lineTo(r * 0.4, 0); g.stroke();
        g.beginPath(); g.arc(r * 0.18, -r * 0.26, r * 0.22, 0.4, 2.7); g.stroke();
        g.beginPath(); g.arc(r * 0.18, r * 0.26, r * 0.22, -2.7, -0.4); g.stroke();

        // 腰腹白燈籠褲 + 金邊（原作赤足白褲）
        g.fillStyle = '#e8e4dc';
        g.beginPath();
        g.moveTo(-r * 0.15, -r * 0.65);
        g.lineTo(-r * 0.5, -r * 0.55);
        g.lineTo(-r * 0.5, r * 0.55);
        g.lineTo(-r * 0.15, r * 0.65);
        g.closePath();
        g.fill();
        g.strokeStyle = '#d4af37';
        g.lineWidth = 2;
        g.stroke();

        // 獅蠻金帶扣：金環嵌青藍寶玉
        g.fillStyle = '#f0c030';
        g.beginPath();
        g.arc(-r * 0.15, 0, r * 0.18, 0, U.TAU);
        g.fill();
        g.strokeStyle = '#8a6010';
        g.lineWidth = 1.5;
        g.stroke();
        g.fillStyle = '#1f8fb0';
        g.beginPath();
        g.arc(-r * 0.15, 0, r * 0.09, 0, U.TAU);
        g.fill();
      });

      // 4. 頭部金冠與兩道標誌性長雉翎（隨身姿大幅飄逸）
      // 披散黑長髮
      const hairSway = Math.sin(t * 4) * r * 0.12;
      ctx.fillStyle = '#0c0f1c';
      ctx.beginPath();
      ctx.moveTo(r * 0.1, -r * 0.3);
      ctx.quadraticCurveTo(-r * 0.5, -r * 0.35 + hairSway, -r * 1.1, hairSway);
      ctx.quadraticCurveTo(-r * 0.5, r * 0.35 + hairSway, r * 0.1, r * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1e1412';
      ctx.beginPath();
      ctx.arc(r * 0.12, 0, r * 0.36, 0, U.TAU);
      ctx.fill();

      // 紫金冠頂件
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.moveTo(r * 0.35, 0);
      ctx.lineTo(r * 0.05, -r * 0.25);
      ctx.lineTo(r * 0.12, 0);
      ctx.lineTo(r * 0.05, r * 0.25);
      ctx.closePath();
      ctx.fill();

      // 雙翎（長金羽向後飄逸；衝刺時拉長）
      const plumeWave1 = Math.sin(t * 6) * r * 0.32;
      const plumeWave2 = Math.sin(t * 6 + 1.4) * r * 0.32;
      for (const [side, sway] of [[-1, plumeWave1], [1, plumeWave2]]) {
        ctx.strokeStyle = '#f5c538';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(r * 0.15, side * r * 0.15);
        ctx.bezierCurveTo(
          -r * 0.3 * cl, side * (r * 0.6) + sway * 0.4,
          -r * 1.1 * cl, side * (r * 0.85) + sway * 0.8,
          -r * 2.2 * cl, side * (r * 0.5) + sway * 1.2
        );
        ctx.stroke();

        // 翎羽尖端赤紅珠節
        ctx.fillStyle = '#ff4433';
        ctx.beginPath();
        ctx.arc(-r * 2.2 * cl, side * (r * 0.5) + sway * 1.2, 3, 0, U.TAU);
        ctx.fill();

        ctx.strokeStyle = '#ffe880';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // 5. 方天畫戟（長柄 + 月牙刀 + 槍尖，隨攻擊進度與呼吸擺動）
      const drawn = live || st === 'feint';
      const ha = w ? w.ga : drawn ? (live ? -1.1 + act * 2.6 : -0.6) : (REST + swing);
      const fs = w ? w.fs : 1, bl = w ? w.bl : 1, hpx = r * (0.25 + (w ? w.tx : 0)), hpy = r * 0.6;
      if (w && w.sa > 0.01) {
        // 戟弧殘影：從起揮角掃到目前角的扇環帶
        const a0 = Math.min(w.s0, ha), a1 = Math.max(w.s0, ha), L = r * 3.4 * fs;
        ctx.fillStyle = p2 ? hexA('#ff2b38', w.sa) : `rgba(232,240,248,${w.sa})`;
        ctx.beginPath(); ctx.arc(hpx, hpy, L + r * 0.45, a0, a1); ctx.arc(hpx, hpy, L * 0.55, a1, a0, true); ctx.closePath(); ctx.fill();
      }
      ctx.save();
      ctx.translate(hpx, hpy);
      ctx.rotate(ha);
      if (fs !== 1) ctx.scale(fs, 1);

      const poleLen = r * 3.4;
      if (rl && !o.shade) R.bladeTrail(ctx, rl, poleLen, p2 ? '#ff2b38' : '#e8f0f8');
      if (w && w.gl > 0.01) {
        // 戟刃蓄力光（天喰 / 赤兔衝鋒 / 各招蓄力）
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = hexA('#ff2b38', 0.25 + 0.45 * w.gl); ctx.beginPath(); ctx.ellipse(poleLen, 0, r * (0.5 + 0.6 * w.gl) * bl, r * (0.35 + 0.3 * w.gl), 0, 0, U.TAU); ctx.fill();
        ctx.restore();
      }
      // 戟桿（長柄）
      ctx.strokeStyle = '#32231c';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, 0);
      ctx.lineTo(poleLen, 0);
      ctx.stroke();

      // 戟尾金鐏
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -3);
      ctx.lineTo(-r * 0.9, 0);
      ctx.lineTo(-r * 0.7, 3);
      ctx.closePath();
      ctx.fill();

      // 紅纓繫綴
      ctx.fillStyle = p2 ? '#ff2030' : '#c81824';
      ctx.beginPath();
      ctx.moveTo(poleLen - r * 0.9, -4);
      ctx.lineTo(poleLen - r * 0.6, 0);
      ctx.lineTo(poleLen - r * 0.9, 4);
      ctx.lineTo(poleLen - r * 1.2, 0);
      ctx.closePath();
      ctx.fill();

      // 戟頭部（中央透甲槍尖 + 側邊方天月牙刃）；天喰蓄力時以戟頭根部為原點伸長
      if (bl !== 1) { ctx.translate(poleLen - r * 0.8, 0); ctx.scale(bl, bl); ctx.translate(-(poleLen - r * 0.8), 0); }
      if (p2) {
        ctx.shadowColor = '#ff2b38';
        ctx.shadowBlur = 12;
      }
      // 中央長槍頭
      ctx.fillStyle = '#e8f0f8';
      ctx.beginPath();
      ctx.moveTo(poleLen - r * 0.8, -4);
      ctx.lineTo(poleLen + r * 0.45, 0);
      ctx.lineTo(poleLen - r * 0.8, 4);
      ctx.lineTo(poleLen - r * 0.65, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8fa3b5';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 側邊方天月牙鏟弧刃
      ctx.fillStyle = '#e8f0f8';
      ctx.beginPath();
      ctx.moveTo(poleLen - r * 0.75, -r * 0.05);
      ctx.quadraticCurveTo(poleLen - r * 0.4, -r * 0.55, poleLen - r * 0.05, -r * 0.05);
      ctx.quadraticCurveTo(poleLen - r * 0.4, -r * 0.35, poleLen - r * 0.75, -r * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 金色加固橫梃
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(poleLen - r * 0.6, 0);
      ctx.lineTo(poleLen - r * 0.5, -r * 0.42);
      ctx.stroke();

      ctx.restore();
      if (w) ctx.restore();
  }

  // 換階段用的繪製物件（重用）
  const TB = { x: 0, y: 0, face: 0, r: 0, def: null, phase: 1, state: 'mount', horseK: 0, pose: null, poseK: 0, inst: null };
  R.defineBossStyle('lubu', {
    body(ctx, o, t, args) { ctx.save(); ctx.lineWidth = 1; drawBody(ctx, o, t, Object.assign({}, args, { r: args.r * VIS })); ctx.restore(); },
    // 換階段「赤兔登場」：咆哮前高舉方天畫戟、赤兔由身後奔入漸顯（蹄印與塵浪由 phase2.transFx 的 warsteed 負責）；咆哮後即為騎乘外觀
    transition(ctx, b, t) {
      const at = b.roarAt || 0.6, before = b.stateT < at, k = U.clamp(b.stateT / at, 0, 1);
      TB.x = b.x; TB.y = b.y; TB.face = b.face; TB.r = b.r; TB.def = b.def;
      TB.phase = before ? 1 : 2; TB.horseK = before ? k : 0; TB.pose = before ? 'raise' : null; TB.poseK = k;
      R.drawBossBody(ctx, TB, t);
      return true;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
