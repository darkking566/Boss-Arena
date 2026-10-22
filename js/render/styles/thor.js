'use strict';
// Boss 造型：雷之狂戰士索爾：紅色長髮披滿後背、寬肩半裸的蒼白肌肉、白色斜肩布、
// 一階段鐵手套「雅恩格利佩爾」、巨型長方塊槌頭＋短柄的妙爾尼爾；二階段手套碎裂、槌頭龜裂透出熔紅血肉與雷弧。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;

  // 視覺放大：判定半徑不變，只放大繪製（巨大槌頭、長紅髮在一般縮放下更易辨識）
  const VIS = 1.2;

  // 持續時間輔助：動作 dur 傾向以「最後一個動作的時間」為長度，取兩者較大值較安全
  function instDur(inst) {
    if (!inst) return 1;
    const v = inst.v || {};
    let d = Math.max(0.1, v.dur || 0.1);
    if (Array.isArray(v.actions)) for (const a of v.actions) if (a && a.at > d) d = a.at + 0.05;
    return d;
  }

  // 找出大招「躍起落地」隱身期間：回傳 { pos: {x,y}, k: 0..1 } 或 null
  function leapState(o) {
    const inst = o.inst;
    if (!inst || !inst.skill || !inst.skill.ult || !Array.isArray(inst.v && inst.v.actions)) return null;
    let tHide = -1, tLand = -1;
    for (const a of inst.v.actions) {
      if (!a) continue;
      if (a.do === 'hide') tHide = a.at;
      else if (a.do === 'land' && tHide >= 0 && tLand < 0) tLand = a.at;
    }
    if (tHide < 0 || tLand < 0 || inst.t < tHide || inst.t > tLand) return null;
    const m = inst.marks && inst.marks.G2;
    return { pos: m || null, k: U.clamp((inst.t - tHide) / Math.max(0.1, tLand - tHide), 0, 1) };
  }

  // 投擲／迴旋的時間軸：去程判定前 0.3s 脫手（t0），回程判定時接回（tB）
  function throwSpan(o) {
    const inst = o.inst;
    if (!inst || !inst.skill || !inst.v || !Array.isArray(inst.v.actions)) return null;
    const markId = inst.skill.id === 'mjolnir_throw' ? 'M' : inst.skill.ult && o.phase === 2 ? 'G1' : null;
    if (!markId) return null;
    let tOut = -1, tBack = -1, len = 0;
    for (const a of inst.v.actions) {
      if (!a || a.anchor !== 'mark' || a.mark !== markId || a.do !== 'hit') continue;
      if (tOut < 0) { tOut = a.at; len = a.len || len; }
      else { tBack = a.at; break; }
    }
    return tOut < 0 || tBack < 0 ? null : { markId, t0: tOut - 0.3, tB: tBack, len };
  }

  // 飛行中的雷槌：回傳 { pos:{x,y}, spin, f } 或 null
  function thrownState(o) {
    const sp = throwSpan(o), inst = o.inst;
    if (!sp || inst.t < sp.t0 || inst.t > sp.tB) return null;
    const m = inst.marks && inst.marks[sp.markId];
    if (!m) return null;
    const f = U.clamp((inst.t - sp.t0) / Math.max(0.05, sp.tB - sp.t0), 0, 1);
    const d = sp.len * Math.sin(Math.PI * f);
    return {
      pos: { x: m.x + Math.cos(m.ang) * d, y: m.y + Math.sin(m.ang) * d },
      spin: inst.t * 22, f,
    };
  }

  // 目前畫布上是否已有世界座標（rol 為世界旋轉矩陣）可用來換算局部座標
  function worldRot(ctx) {
    const m = ctx.getTransform();
    const rol = m.a * m.a + m.b * m.b;
    if (!(rol > 1e-6) || !isFinite(rol)) return null;
    return { c: m.a / Math.sqrt(rol), s: m.b / Math.sqrt(rol) };
  }

  // 單幀閃電折線（亂數僅用 BD.vrng）
  function bolt(g, x0, y0, x1, y1, seg, amp) {
    g.beginPath();
    g.moveTo(x0, y0);
    for (let i = 1; i < seg; i++) {
      const u = i / seg;
      const nx = -(y1 - y0), ny = x1 - x0;
      const nl = Math.hypot(nx, ny) || 1;
      const off = (BD.vrng() - 0.5) * 2 * amp;
      g.lineTo(x0 + (x1 - x0) * u + nx / nl * off, y0 + (y1 - y0) * u + ny / nl * off);
    }
    g.lineTo(x1, y1);
    g.stroke();
  }

  // ───────────── 妙爾尼爾槌頭（靜態，R.blit 快取；phase 2 的裂紋另以熔紅覆蓋） ─────────────
  function drawHammerHead(g, r, p2) {
    const hw = r * 1.3, hh = r * 0.5;
    const bevel = r * 0.09;

    g.beginPath();
    g.moveTo(-hw + bevel, -hh);
    g.lineTo(hw - bevel, -hh);
    g.lineTo(hw, -hh + bevel);
    g.lineTo(hw, hh - bevel);
    g.lineTo(hw - bevel, hh);
    g.lineTo(-hw + bevel, hh);
    g.lineTo(-hw, hh - bevel);
    g.lineTo(-hw, -hh + bevel);
    g.closePath();
    const gr = g.createLinearGradient(0, -hh, 0, hh);
    gr.addColorStop(0, '#eef0f3');
    gr.addColorStop(0.42, '#d9dde2');
    gr.addColorStop(1, '#a9afb8');
    g.fillStyle = gr;
    g.fill();
    g.strokeStyle = '#5d636c';
    g.lineWidth = 2;
    g.stroke();

    // 兩端深色端蓋
    for (const sd of [-1, 1]) {
      const xa = sd * hw, xb = sd * (hw - r * 0.3);
      g.beginPath();
      g.moveTo(xa - sd * bevel, -hh);
      g.lineTo(xb, -hh);
      g.lineTo(xb, hh);
      g.lineTo(xa - sd * bevel, hh);
      g.lineTo(xa, hh - bevel);
      g.lineTo(xa, -hh + bevel);
      g.closePath();
      g.fillStyle = '#3a3f47';
      g.fill();
      g.strokeStyle = '#1e2127';
      g.lineWidth = 1.5;
      g.stroke();
      g.strokeStyle = '#6b7480';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(xb, -hh); g.lineTo(xb, hh); g.stroke();
      g.strokeStyle = '#8a939e';
      g.beginPath(); g.moveTo(xa - sd * bevel * 0.6, -hh * 0.55); g.lineTo(xb + sd * bevel, -hh * 0.55); g.stroke();
    }

    // 金色電路紋路
    g.strokeStyle = '#e2b93b';
    g.lineWidth = 1.6;
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(-hw * 0.5, -hh * 0.35); g.lineTo(-hw * 0.2, -hh * 0.35); g.lineTo(-hw * 0.2, -hh * 0.6); g.lineTo(hw * 0.15, -hh * 0.6);
    g.lineTo(hw * 0.15, -hh * 0.2); g.lineTo(hw * 0.5, -hh * 0.2);
    g.stroke();
    g.beginPath();
    g.moveTo(-hw * 0.45, hh * 0.38); g.lineTo(-hw * 0.1, hh * 0.38); g.lineTo(-hw * 0.1, hh * 0.08); g.lineTo(hw * 0.3, hh * 0.08);
    g.stroke();
    g.fillStyle = '#f0cf62';
    for (const [ex, ey] of [[-hw * 0.5, -hh * 0.35], [hw * 0.5, -hh * 0.2], [-hw * 0.45, hh * 0.38], [hw * 0.3, hh * 0.08]]) {
      g.beginPath(); g.arc(ex, ey, 2, 0, U.TAU); g.fill();
    }

    // 中央裝飾凹槽
    g.strokeStyle = 'rgba(80,86,96,0.55)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(-hw * 0.32, 0); g.lineTo(hw * 0.32, 0); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.6)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(-hw * 0.32, -2); g.lineTo(hw * 0.32, -2); g.stroke();

    if (p2) {
      // 常駐暗紅裂縫（脈動光暈另外即時繪製）
      g.strokeStyle = 'rgba(255,90,30,0.55)';
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(-hw * 0.7, -hh * 0.5); g.lineTo(-hw * 0.3, -hh * 0.1); g.lineTo(-hw * 0.4, hh * 0.2); g.lineTo(-hw * 0.05, hh * 0.5);
      g.moveTo(-hw * 0.3, -hh * 0.1); g.lineTo(hw * 0.1, -hh * 0.4); g.lineTo(hw * 0.45, -hh * 0.15);
      g.moveTo(-hw * 0.05, hh * 0.5); g.lineTo(hw * 0.25, hh * 0.15); g.lineTo(hw * 0.6, hh * 0.3);
      g.stroke();
      g.fillStyle = 'rgba(120,30,20,0.45)';
      g.beginPath(); g.ellipse(hw * 0.05, -hh * 0.15, r * 0.16, r * 0.07, 0.3, 0, U.TAU); g.fill();
      g.beginPath(); g.ellipse(-hw * 0.28, hh * 0.18, r * 0.11, r * 0.06, -0.4, 0, U.TAU); g.fill();
    }
  }

  const HEAD_W = r => r * 2.6 + 12;
  const HEAD_H = r => r * 1.0 + 12;

  // ───────────── 局部座標中的槌頭＋裂紋脈動＋雷弧 ─────────────
  function hammerHead(ctx, r, p2, t) {
    ctx.save();
    R.blit(ctx, 'body:thor:head:' + r + ':' + (p2 ? 2 : 1), HEAD_W(r), HEAD_H(r), HEAD_W(r) / 2, HEAD_H(r) / 2, (g) => {
      drawHammerHead(g, r, p2);
    });

    if (p2) {
      const s1 = Math.sin(t * 6.5), s2 = Math.sin(t * 6.5 - 0.9);
      const p = Math.pow(Math.max(0, s1), 6) + 0.6 * Math.pow(Math.max(0, s2), 6);
      const hw = r * 1.3, hh = r * 0.5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 + 0.65 * U.clamp(p, 0, 1);
      ctx.strokeStyle = '#ff5a1e';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-hw * 0.7, -hh * 0.5); ctx.lineTo(-hw * 0.3, -hh * 0.1); ctx.lineTo(-hw * 0.4, hh * 0.2); ctx.lineTo(-hw * 0.05, hh * 0.5);
      ctx.moveTo(-hw * 0.3, -hh * 0.1); ctx.lineTo(hw * 0.1, -hh * 0.4); ctx.lineTo(hw * 0.45, -hh * 0.15);
      ctx.moveTo(-hw * 0.05, hh * 0.5); ctx.lineTo(hw * 0.25, hh * 0.15); ctx.lineTo(hw * 0.6, hh * 0.3);
      ctx.stroke();
      ctx.strokeStyle = '#ffd0a0';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 熔光中心
      ctx.globalAlpha = (0.12 + 0.3 * p);
      const gr = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 1.5);
      gr.addColorStop(0, 'rgba(255,90,30,0.55)');
      gr.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.5, 0, U.TAU); ctx.fill();

      // 槌頭周圍閃爍的雷弧（每幀重繪，隨機折線）
      const n = 2 + (BD.vrng() < 0.5 ? 1 : 2);
      for (let i = 0; i < n; i++) {
        const a = BD.vrng() * U.TAU;
        const x0 = Math.cos(a) * r * 0.9, y0 = Math.sin(a) * r * 0.4;
        const x1 = x0 + (BD.vrng() - 0.5) * r * 1.6;
        const y1 = y0 + (BD.vrng() - 0.5) * r * 1.1;
        ctx.strokeStyle = 'rgba(127,200,255,0.55)';
        ctx.lineWidth = 3;
        bolt(ctx, x0, y0, x1, y1, 4 + BD.vrng() * 3 | 0, r * 0.16);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1.2;
        bolt(ctx, x0, y0, x1, y1, 4 + BD.vrng() * 3 | 0, r * 0.16);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // ───────────── 槌柄（短柄） ─────────────
  function drawHandle(ctx, r, handX, handY, hx, hy) {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(Math.atan2(hy - handY, hx - handX) + Math.PI);
    // 柄身自手部延伸至槌頭
    const L = Math.hypot(hx - handX, hy - handY) + r * 0.08;
    ctx.strokeStyle = '#3c4048';
    ctx.lineWidth = r * 0.19;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
    ctx.strokeStyle = '#d4d8de';
    ctx.lineWidth = r * 0.13;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
    ctx.strokeStyle = '#e2b93b';
    ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.beginPath(); ctx.moveTo(r * 0.05, 0); ctx.lineTo(L - r * 0.15, 0); ctx.stroke();
    // 握把纏皮（手握的那一端）
    ctx.strokeStyle = '#4a3a2c';
    ctx.lineWidth = r * 0.14;
    ctx.beginPath(); ctx.moveTo(L - r * 0.32, 0); ctx.lineTo(L, 0); ctx.stroke();
    // 柄尾金環
    ctx.strokeStyle = '#c9a44a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(L, -r * 0.08); ctx.lineTo(L, r * 0.08); ctx.stroke();
    ctx.restore();
  }

  // ───────────── 鐵手套（一階段） ─────────────
  function drawGauntlet(ctx, x, y, ang, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const w = r * 0.26, l = r * 0.5;
    ctx.beginPath();
    ctx.moveTo(-l * 0.5, -w * 0.9);
    ctx.lineTo(l * 0.5, -w);
    ctx.lineTo(l * 0.62, 0);
    ctx.lineTo(l * 0.5, w);
    ctx.lineTo(-l * 0.5, w * 0.9);
    ctx.lineTo(-l * 0.62, 0);
    ctx.closePath();
    const gr = ctx.createLinearGradient(0, -w, 0, w);
    gr.addColorStop(0, '#3a3f48');
    gr.addColorStop(0.5, '#2a2e35');
    gr.addColorStop(1, '#171a1f');
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.strokeStyle = '#6b7480';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // 分節甲片
    ctx.strokeStyle = 'rgba(107,116,128,0.85)';
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * l * 0.3 - l * 0.05, -w * 0.85);
      ctx.lineTo(i * l * 0.3 + l * 0.05, w * 0.85);
      ctx.stroke();
    }
    ctx.fillStyle = '#8b949f';
    ctx.beginPath(); ctx.arc(l * 0.4, -w * 0.35, 1.6, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(l * 0.4, w * 0.35, 1.6, 0, U.TAU); ctx.fill();
    ctx.restore();
  }

  // ───────────── 裸露前臂（二階段）：金色血管 + 雷弧 ─────────────
  function drawBareArm(ctx, x, y, ang, r, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const w = r * 0.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#e8bda5';
    ctx.lineWidth = w * 2;
    ctx.beginPath(); ctx.moveTo(-r * 0.22, 0); ctx.lineTo(r * 0.24, 0); ctx.stroke();
    ctx.strokeStyle = '#c98f75';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-r * 0.18, w * 0.55); ctx.lineTo(r * 0.2, w * 0.55); ctx.stroke();

    const pulse = 0.55 + 0.45 * Math.sin(t * 7 + (x > 0 ? 1 : 2));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA('#ffd84a', pulse);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -w * 0.35); ctx.lineTo(-r * 0.04, w * 0.15); ctx.lineTo(r * 0.06, -w * 0.1); ctx.lineTo(r * 0.22, w * 0.25);
    ctx.stroke();
    if (BD.vrng() < 0.75) {
      const x0 = -r * 0.15 + BD.vrng() * r * 0.3, y0 = (BD.vrng() - 0.5) * w;
      ctx.strokeStyle = 'rgba(207,233,255,0.7)';
      ctx.lineWidth = 2;
      bolt(ctx, x0, y0, x0 + (BD.vrng() - 0.5) * r * 0.4, y0 + (BD.vrng() - 0.5) * r * 0.4, 4, r * 0.08);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1;
      bolt(ctx, x0, y0, x0 + (BD.vrng() - 0.5) * r * 0.4, y0 + (BD.vrng() - 0.5) * r * 0.4, 4, r * 0.08);
    }
    ctx.restore();
    ctx.restore();
  }

  // ───────────── 逐招動畫 ─────────────
  // T 表以「蓄力 → 引 → 擊 → 收」關鍵值描述每招的軀幹與槌姿；key: [引（蓄滿）, 擊, 起始 = DEF, 收招 = 起始, 擊後衰減起點 = 擊]；
  // 節拍 = 每個非 ring 的 hit / erupt / blink；擊後 0.25s 仍保留「擊」姿態並與下一手蓄力混合，連段不跳格。
  // 投擲 / 躍擊 / 格擋 / 威壓抖動等無法用關鍵值表達者在 special()
  const REST = 2.3, TAU = U.TAU, PI = Math.PI;
  const ease = (u) => 1 - (1 - u) * (1 - u);
  const lerp = (a, b, u) => a + (b - a) * u;
  const _ = undefined;
  // ha 槌角（手→槌頭，0 = 正前）、lift 舉高（槌頭放大）、both 雙手握柄、rot 軀幹扭轉、fwd 前衝（半徑倍數）、sq 蹲伏壓縮、big 落地重壓、gl 槌頭蓄力光
  const DEF = { ha: REST, lift: 0, both: 0, rot: 0, fwd: 0, sq: 1, big: 1, gl: 0 };
  const KEYS = Object.keys(DEF);
  // 另有 tr 揮弧殘影濃度、wk 蓄力成形佔等待的比例（預設 0.6）、swAt 開始「擊」前傾的比例（預設 0.7）
  const SWEEP = { ha: [2.1, -1.3, _, REST], rot: [0.5, -0.45], fwd: [-0.12, 0.22], sq: [0.94, 1], big: [1, 1.04], lift: [0.2, 0], gl: [0.5, 0.8], tr: 0.3 };
  const SWEEP_L = Object.assign({}, SWEEP, { ha: [2.1, -1.3, _, -1.3] }); // 後面還接反手掃：停在左側
  const BACK = { ha: [-1.6, 2.2, -1.3, REST], rot: [-0.5, 0.45], fwd: [-0.1, 0.2], sq: [0.94, 1], big: [1, 1.04], lift: [0, 0.2], gl: [0.5, 0.8], tr: 0.3 };
  // 過頂砸擊：雙手高舉（槌頭放大、更靠近鏡頭）→ 砸落，落地重壓
  const SLAM = { ha: [2.9, 0.05, _, REST], lift: [0.85, 0, _, 0], both: [1, 1, _, 0], rot: [0.25, 0], fwd: [-0.15, 0.3], sq: [0.9, 1], big: [1, 1.1], gl: [0.5, 1] };
  const T = {
    hammer_sweep: [SWEEP],
    hammer_sweep2: [SWEEP_L, BACK],
    hammer_slam: [SLAM],
    jarngreipr_guard: [Object.assign({}, SLAM, { fwd: [-0.1, 0.25], sq: [0.92, 1] })],
    // 屠巨一振：雙手舉槌向右後蓄到極限（身軀大幅扭轉）→ 一路橫掃出大扇形
    giant_felling: [{ ha: [2.9, -1.4, _, REST], lift: [0.9, 0.2, _, 0], both: [1, 1, _, 0], rot: [0.7, -0.6], fwd: [-0.2, 0.3], sq: [0.85, 1], big: [1, 1.1], gl: [1, 1], tr: 0.35, wk: 0.8 }],
    // 威壓：身軀先壓低蓄勢 → 挺身咆哮，震波外擴
    divine_pressure: [{ ha: [1, 0.9, _, REST], lift: [0.4, 0.2, _, 0], fwd: [-0.15, 0.2], sq: [0.85, 1], big: [1, 1.14], gl: [0.8, 1] }],
    // 三連：兩記快掃，最後蓄滿力的故意延遲重砸
    hammer_chain: [SWEEP_L, BACK, Object.assign({}, SLAM, { fwd: [-0.2, 0.35], sq: [0.84, 1], big: [1, 1.12], gl: [1, 1] })],
    // 瞬身：先蹲伏聚雷 → 閃現（落點迸雷）→ 舉槌砸落
    thunder_step: [{ ha: [2.6, 2], lift: [0.3, 0], rot: [0.5, -0.3], fwd: [-0.28, 0.15], sq: [0.82, 1], gl: [1, 1] }, SLAM],
    // 萬雷：槌高舉聚雷 → 槌頭指向前方，雷柱沿列落下（落雷期間保持姿態）
    thunder_rampage: [{ ha: [2.9, 0.15, _, REST], lift: [1, 0.5, _, 0], both: [1, 1, _, 0], rot: [0.2, 0], fwd: [-0.12, 0.15], sq: [0.9, 1], big: [1, 1.05], gl: [1, 1] }],
    // 鬥神之雷槌：上身後仰到幾乎倒地（雷纏左前臂）→ 借起身反動砸下
    ult: [{ ha: [2.9, 0.05, _, REST], lift: [0.9, 0, _, 0], both: [1, 1, _, 0], rot: [0.15, 0], fwd: [-0.45, 0.28], sq: [0.8, 1], big: [1, 1.12], gl: [1, 1], wk: 0.85, swAt: 0.9 }],
    // 蓋爾羅德：擲出 / 接槌由 special() 負責，這裡只有躍擊落地的重壓
    ult2: [{ ha: [2.9, 0.05, _, REST], lift: [1, 0, _, 0], both: [1, 1, _, 0], fwd: [0, 0.3], big: [1, 1.18], gl: [1, 1] }],
  };

  const isBeat = (a) => a.do === 'blink' || a.do === 'erupt' || (a.do === 'hit' && a.shape !== 'ring' && !(a.anchor === 'mark' && a.shape === 'rect'));
  // 重用物件：本幀姿態（A）、擊後混合用（B）、出手節奏（P）
  const A = Object.assign({ s0: 0, sa: 0, guard: 0, rel: 0, cat: 0 }, DEF), B = {};
  const P = { L: -1, N: -1, wd: 0, sn: 0, sw: 0, since: 0 };

  function pace(inst) {
    const t = inst.t; let L = null, N = null, n = 0;
    P.L = P.N = -1;
    for (const a of inst.v.actions) {
      if (!isBeat(a)) continue;
      if (a.at <= t) { L = a; P.L = n; } else { N = a; P.N = n; break; }
      n++;
    }
    const endL = L ? L.at + (L.do === 'erupt' ? (L.n - 1) * L.interval : 0) : 0; // 落雷期間視為仍在「擊」
    P.since = L ? t - endL : 0;
    P.sn = L ? (P.since < 0 ? 1 : P.since < 0.25 ? 1 - P.since / 0.25 : 0) : 0;
    P.wd = N ? U.clamp((t - endL) / Math.max(0.05, N.at - endL), 0, 1) : 0;
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
      const s = eN.swAt || 0.7;
      p.sw = p.wd < s ? 0 : ease((p.wd - s) / (1 - s));
      ev(A, eN, 'wind', ease(Math.min(1, p.wd / (eN.wk || 0.6))), p.sw);
      if (eL && p.sn > 0) { ev(B, eL, 'snap', p.sn); for (const k of KEYS) A[k] = lerp(A[k], B[k], p.sn); }
    } else if (eL) ev(A, eL, p.sn > 0 ? 'snap' : 'end', p.sn);
    if (eL && eL.tr && p.sn > 0) { A.s0 = eL.ha[0]; A.sa = eL.tr * p.sn; }
    else if (eN && eN.tr && p.sw > 0) { A.s0 = eN.ha[0]; A.sa = eN.tr * p.sw; }
  }
  const put = (ha, lift, both, rot, fwd, sq, big, gl) => { A.ha = ha; A.lift = lift; A.both = both; A.rot = rot; A.fwd = fwd; A.sq = sq; A.big = big; A.gl = gl; };
  // 無法用關鍵值表達的動作：格擋架式、威壓抖動、擲槌 → 目送 → 接槌（蓋爾羅德接槌後蹲身躍起）
  function special(sid, o, inst, p) {
    const t = inst.t;
    if (sid === 'jarngreipr_guard') { // 見切窗口 0 ~ 0.65：鐵手套前舉護身，之後收回蓄勢反砸
      const g = U.clamp(t / 0.1, 0, 1) * (1 - U.clamp((t - 0.5) / 0.15, 0, 1));
      if (g > 0) { A.guard = g; A.ha = lerp(A.ha, 1.7, g); A.both = lerp(A.both, 0, g); A.lift = lerp(A.lift, 0, g); A.rot = lerp(A.rot, -0.15, g); A.sq = lerp(A.sq, 0.95, g); A.fwd = lerp(A.fwd, 0.08, g); A.gl = lerp(A.gl, 0.4, g); }
    } else if (sid === 'divine_pressure') A.rot += Math.sin(t * 40) * 0.06 * (p.N >= 0 ? p.wd : p.sn);
    else if (sid === 'mjolnir_throw' || sid === 'ult2') {
      const sp = throwSpan(o); if (!sp) return;
      const t0 = sp.t0, tB = sp.tB;
      if (t < t0) { const k = ease(t / t0); put(lerp(REST, 2.7, k), 0.6 * k, 0, 0.7 * k, -0.22 * k, 1 - 0.1 * k, 1, k); } // 後拉蓄力
      else if (t < t0 + 0.25) { const k = ease((t - t0) / 0.25); put(lerp(2.7, 0.3, k), 0.6 * (1 - k), 0, lerp(0.7, -0.45, k), lerp(-0.22, 0.3, k), lerp(0.9, 1, k), 1, 1 - k); A.rel = 1 - k; } // 脫手擲出
      else if (t < tB - 0.3) { const k = ease(Math.min(1, (t - t0 - 0.25) / 0.4)); put(lerp(0.3, REST, k), 0, 0, lerp(-0.45, -0.1, k), lerp(0.3, 0.08, k), 1, 1, 0); } // 目送
      else if (t < tB) { const k = (t - tB + 0.3) / 0.3; put(lerp(REST, 1.2, k), 0, 0, lerp(-0.1, 0.25, k), lerp(0.08, -0.1, k), 1, 1, 0.6 * k); } // 伸手迎槌
      else if (sid === 'mjolnir_throw') { const k = U.clamp((t - tB) / 0.3, 0, 1); put(lerp(0.6, REST, ease(k)), 0.3 * (1 - k), 0, 0.1 * (1 - k), -0.15 * (1 - k), 0.92 + 0.08 * k, 1, 1 - k); A.cat = 1 - k; } // 接槌後坐
      else {
        let tL = Infinity; for (const a of inst.v.actions) if (a.do === 'land') tL = a.at;
        if (t < tL) { put(2.9, 0.8, 1, 0, -0.2, 0.82, 1, 1); A.cat = 1 - U.clamp((t - tB) / 0.1, 0, 1); } // 接槌 → 蹲身躍起
      }
    }
    if (A.gl >= 0.95 && p.N >= 0 && p.sw === 0) A.rot += Math.sin(t * 45) * 0.025; // 蓄滿力時顫動
  }

  // 地面層（畫在身體底下）：扇形光痕、震波環、地裂紋、地面雷弧、光點收束
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
    ctx.fillStyle = hexA(col, 0.16 * a); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, rad, -half, half); ctx.closePath(); ctx.fill();
  }
  function motes(ctx, r, col, k, n) { // 光點向身上收束
    ctx.fillStyle = hexA(col, 0.8 * k);
    for (let i = 0; i < n; i++) { const an = i * TAU / n + k * 3, d = (1 - k) * r * 5 + r * 0.8; ctx.beginPath(); ctx.arc(Math.cos(an) * d, Math.sin(an) * d, 3, 0, TAU); ctx.fill(); }
  }
  function gbolts(ctx, x, y, rad, a, n, col) { // 地面雷弧：自 (x, y) 向外亂竄
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const an = BD.vrng() * TAU, l = rad * (0.5 + 0.5 * BD.vrng()), x1 = x + Math.cos(an) * l, y1 = y + Math.sin(an) * l;
      ctx.strokeStyle = hexA(col, 0.6 * a); ctx.lineWidth = 3; bolt(ctx, x, y, x1, y1, 5, rad * 0.08);
      ctx.strokeStyle = hexA('#ffffff', 0.9 * a); ctx.lineWidth = 1; bolt(ctx, x, y, x1, y1, 5, rad * 0.08);
    }
    ctx.restore();
  }
  function gather(ctx, r, t, col, k) { // 蓄力：腳下符環收縮旋轉、光點匯入
    ctx.save(); ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 60; ring(ctx, 0, 0, r * (2.8 - 1.2 * k), 0.15 + 0.5 * k, col, 3); ctx.restore();
    motes(ctx, r, col, k, 10);
  }
  function decor(ctx, sid, r, p, p2, t, inst) {
    const tint = p2 ? '#9fd4ff' : '#e8e8f0', rc = p2 ? '#7fc8ff' : '#c9c0b0', scar = p2 ? '#0e1f38' : '#2a2620';
    const sn = p.sn, L = p.L, N = p.N, wd = p.wd;
    const impact = (x, y, rad) => { ring(ctx, x, y, rad * (1.15 - 0.35 * sn), sn * 0.8, rc, 7); crack(ctx, x, y, rad * 0.9, sn, scar); if (p2) gbolts(ctx, x, y, rad * 0.9, sn, 3, tint); };
    if (sid === 'hammer_sweep') {
      if (sn > 0) { wedge(ctx, p2 ? 205 : 190, p2 ? 1.31 : 1.22, tint, sn); if (p2) gbolts(ctx, 0, 0, 170, sn, 2, tint); }
    } else if (sid === 'hammer_chain') {
      if (sn > 0) { if (L < 2) wedge(ctx, 175, 1.05, tint, sn); else impact(90, 0, 125); }
    } else if (sid === 'hammer_slam') {
      if (sn > 0) impact(95, 0, 125);
    } else if (sid === 'jarngreipr_guard') {
      if (A.guard > 0.05) { // 鐵手套前方的見切光弧
        ctx.strokeStyle = hexA('#dfe6f2', 0.4 * A.guard * (0.6 + 0.4 * Math.sin(t * 14))); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, r * 1.8, -0.9, 0.9); ctx.stroke();
      }
      if (sn > 0) impact(70, 0, 115);
    } else if (sid === 'giant_felling') {
      if (N === 0) gather(ctx, r, t, tint, wd);
      else if (sn > 0) { wedge(ctx, p2 ? 350 : 330, p2 ? 0.96 : 0.87, tint, sn); crack(ctx, 250, 0, 70, sn, scar); if (p2) gbolts(ctx, 0, 0, 300, sn, 3, tint); }
    } else if (sid === 'divine_pressure') {
      if (N === 0) { motes(ctx, r, tint, wd, 8); ring(ctx, 0, 0, r * (2.2 - 1.2 * wd), 0.2 + 0.4 * wd, rc, 3); }
      else if (sn > 0) { const R0 = p2 ? 240 : 200; ring(ctx, 0, 0, R0 * (1 - sn * 0.9), sn * 0.7, rc, 8); ring(ctx, 0, 0, R0 * 0.6 * (1 - sn * 0.9), sn * 0.5, tint, 4); if (p2) gbolts(ctx, 0, 0, R0 * 0.7, sn, 3, tint); }
    } else if (sid === 'thunder_step') {
      if (N === 0) { gbolts(ctx, 0, 0, r * 2.2, wd, 3, tint); ring(ctx, 0, 0, r * (3 - 1.8 * wd), 0.2 + 0.4 * wd, tint, 3); }
      else if (L === 0 && sn > 0) { ring(ctx, 0, 0, r * (1 + 2.5 * (1 - sn)), sn * 0.8, tint, 5); gbolts(ctx, 0, 0, r * 3, sn, 4, tint); }
      else if (L === 1 && sn > 0) impact(80, 0, 125);
    } else if (sid === 'thunder_rampage') {
      if (N === 0) gbolts(ctx, 0, 0, r * (1 + 2 * wd), wd, 2, tint);
      for (const a of inst.v.actions) {
        if (a.do !== 'erupt') continue;
        for (let i = 0; i < a.n; i++) { // 每根落雷點的焦痕與環
          const age = (inst.t - a.at - i * a.interval) / 0.5; if (age < 0 || age > 1) continue;
          const x = a.start + i * a.step; ring(ctx, x, 0, a.r * 0.8 * (0.6 + 0.6 * age), (1 - age) * 0.8, tint, 5); crack(ctx, x, 0, a.r * 0.7, 1 - age, scar);
        }
      }
    } else if (sid === 'mjolnir_throw' || sid === 'ult2') {
      if (A.rel > 0) streaks(ctx, r, tint, A.rel);
      if (A.cat > 0) { ring(ctx, 0, 0, 40 + 120 * (1 - A.cat), A.cat * 0.8, tint, 5); gbolts(ctx, 0, 0, r * 2.5, A.cat, 4, tint); }
      if (A.gl > 0.05 && A.rel === 0 && A.cat === 0 && A.fwd <= 0) gather(ctx, r, t, tint, A.gl);
      if (sid === 'ult2' && L === 0 && sn > 0) impact(0, 0, 230);
    } else if (sid === 'ult') {
      if (N === 0) gather(ctx, r, t, tint, wd);
      else if (sn > 0) {
        impact(115, 0, 200);
        ctx.fillStyle = hexA('#b8a888', 0.7 * sn); // 震波吹飛的沙土
        for (let i = 0; i < 14; i++) { const an = i / 14 * TAU, d = 120 + (1 - sn) * (260 + 60 * (i % 3)); ctx.beginPath(); ctx.arc(115 + Math.cos(an) * d, Math.sin(an) * d, 2.5 + (i % 2), 0, TAU); ctx.fill(); }
      }
    }
  }

  function drawBody(ctx, o, t, { def, r, st, act, swing }) {
    const p2 = o.phase === 2;
    const trans = st === 'transition';
    const roarAt = o.roarAt || 0.6, pre = trans && (o.stateT || 0) < roarAt, awake = p2 || (trans && !pre);
    const preK = pre ? U.clamp((o.stateT || 0) / roarAt, 0, 1) : 0;
    const transK = trans && !pre ? U.clamp(((o.stateT || 0) - roarAt) / Math.max(0.1, (o.stateDur || 1) - roarAt), 0, 1) : 0;
    if (pre) ctx.translate((BD.vrng() - 0.5) * preK * 4, (BD.vrng() - 0.5) * preK * 4);
    const inst = o.inst || null;
    const leap = leapState(o);
    const thrown = thrownState(o);

    // ── 1. 本幀姿態：被打斷回到待機；出招依逐招 T 表與 special() 決定軀幹、槌角與蓄力光 ──
    for (const k of KEYS) A[k] = DEF[k];
    A.s0 = A.sa = A.guard = A.rel = A.cat = 0;
    let p = null, sid = '';
    const live = inst && inst.skill && inst.v && Array.isArray(inst.v.actions) ? inst : null;
    if (st === 'stun' || st === 'stagger') A.ha = 1.25;
    else if (st === 'feint') { A.ha = 2.9; A.lift = 0.6; A.both = 1; }
    else if (live) {
      sid = live.skill.id === 'ult' && p2 ? 'ult2' : live.skill.id;
      p = pace(live);
      if (T[sid]) build(p2 && T[sid + '2'] ? sid + '2' : sid, p);
      special(sid, o, live, p);
    } else A.ha = REST + (swing || 0) * 0.15;
    if (p) { ctx.save(); decor(ctx, sid, r, p, p2, t, live); ctx.restore(); }
    ctx.save();
    ctx.translate(A.fwd * r, 0);
    if (A.big !== 1) ctx.scale(A.big, A.big);
    if (A.sq !== 1) ctx.scale(A.sq, 1 + (1 - A.sq) * 0.5);
    if (A.rot) ctx.rotate(A.rot);

    // ── 2. 軀幹（快取：蒼白肌肉、白色斜肩帶、棕色皮帶與金扣） ──
    R.blit(ctx, 'body:thor:torso:' + r + ':' + (p2 ? 2 : 1), r * 2.4 + 16, r * 2.2 + 16, r * 1.2 + 8, r * 1.1 + 8, (g) => {
      g.beginPath();
      g.moveTo(r * 0.5, 0);
      g.lineTo(r * 0.42, -r * 0.62);
      g.quadraticCurveTo(0, -r * 1.02, -r * 0.3, -r * 0.78);
      g.lineTo(-r * 0.55, -r * 0.55);
      g.lineTo(-r * 0.55, r * 0.55);
      g.lineTo(-r * 0.3, r * 0.78);
      g.quadraticCurveTo(0, r * 1.02, r * 0.42, r * 0.62);
      g.closePath();
      const gr = g.createRadialGradient(r * 0.1, 0, 2, 0, 0, r * 1.05);
      gr.addColorStop(0, '#f8dcc8');
      gr.addColorStop(0.55, '#f2cdb4');
      gr.addColorStop(1, '#c98f75');
      g.fillStyle = gr;
      g.fill();
      g.strokeStyle = '#9c6752';
      g.lineWidth = 2;
      g.stroke();

      // 胸肌與三角肌陰影線
      g.strokeStyle = 'rgba(160,100,80,0.6)';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(-r * 0.1, 0); g.lineTo(r * 0.48, 0); g.stroke();
      g.beginPath(); g.arc(r * 0.18, -r * 0.28, r * 0.26, 0.35, 2.6); g.stroke();
      g.beginPath(); g.arc(r * 0.18, r * 0.28, r * 0.26, -2.6, -0.35); g.stroke();
      g.lineWidth = 1.4;
      g.beginPath(); g.arc(r * 0.3, -r * 0.72, r * 0.16, 0.2, 2.4); g.stroke();
      g.beginPath(); g.arc(r * 0.3, r * 0.72, r * 0.16, -2.4, -0.2); g.stroke();
      g.strokeStyle = 'rgba(160,100,80,0.4)';
      g.beginPath(); g.moveTo(-r * 0.05, -r * 0.1); g.lineTo(-r * 0.05, r * 0.1); g.stroke();

      // 白色斜肩帶（自右肩斜跨至左腰）
      g.beginPath();
      g.moveTo(r * 0.3, -r * 0.82);
      g.lineTo(r * 0.5, -r * 0.66);
      g.lineTo(-r * 0.45, r * 0.42);
      g.lineTo(-r * 0.62, r * 0.22);
      g.closePath();
      g.fillStyle = '#eef0f2';
      g.fill();
      g.strokeStyle = '#b9bec5';
      g.lineWidth = 1.4;
      g.stroke();
      g.strokeStyle = '#c9ced4';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(r * 0.32, -r * 0.76); g.lineTo(-r * 0.5, r * 0.3); g.stroke();

    });

    // ── 2b. 紅色長髮：自頭頂披落、覆蓋整片後背並越過背緣（俯視時最醒目的剪影），髮尾分成數束隨步伐擺動 ──
    {
      const sw = Math.sin(t * 1.7) * r * 0.1 + (o.vx || o.vy ? Math.sin(t * 5) * r * 0.05 : 0);
      const tips = [[-1.4, -0.4], [-1.6, -0.15], [-1.66, 0.1], [-1.48, 0.36]];
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(r * 0.2, -r * 0.3);
      ctx.bezierCurveTo(-r * 0.1, -r * 0.5, -r * 0.7, -r * 0.52, -r * 1.15, -r * 0.48 + sw);
      for (let i = 0; i < tips.length; i++) {
        const [tx, ty] = tips[i], wv = Math.sin(t * 2.3 + i * 1.1) * r * 0.07;
        ctx.lineTo(r * tx, r * ty + sw * (1.2 + i * 0.15) + wv);
        if (i < tips.length - 1) ctx.lineTo(r * (tx + 0.28), r * (ty + tips[i + 1][1]) / 2 + sw * 1.2);
      }
      ctx.bezierCurveTo(-r * 1.0, r * 0.5 + sw, -r * 0.35, r * 0.5, r * 0.2, r * 0.3);
      ctx.closePath();
      const hg = ctx.createLinearGradient(r * 0.2, 0, -r * 1.7, 0);
      hg.addColorStop(0, '#d8291f'); hg.addColorStop(0.55, '#b81d16'); hg.addColorStop(1, '#7c120d');
      ctx.fillStyle = hg; ctx.fill();
      ctx.strokeStyle = '#5a0c08'; ctx.lineWidth = 1.5; ctx.stroke();
      // 髮絲高光
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,110,70,0.75)'; ctx.lineWidth = Math.max(1, r * 0.035);
      for (let i = 0; i < 5; i++) {
        const y = (i / 4 - 0.5) * r * 0.6, wv = Math.sin(t * 2.3 + i) * r * 0.06;
        ctx.beginPath(); ctx.moveTo(0, y * 0.45);
        ctx.quadraticCurveTo(-r * 0.7, y * 1.05 + wv, -r * (1.3 + (i % 2) * 0.15), y * 1.15 + sw * 1.3 + wv);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── 3. 二階段脈動：肩背雷弧 ──
    if (p2) {
      const q = Math.pow(Math.max(0, Math.sin(t * 6.5)), 6) + 0.6 * Math.pow(Math.max(0, Math.sin(t * 6.5 - 0.9)), 6);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.4 + 0.5 * U.clamp(q, 0, 1);
      for (let i = 0; i < 2; i++) {
        const y0 = (i ? 1 : -1) * r * 0.62;
        ctx.strokeStyle = 'rgba(127,200,255,0.6)';
        ctx.lineWidth = 2.5;
        bolt(ctx, r * (BD.vrng() - 0.2), y0, r * (BD.vrng() - 0.4), y0 * (0.7 + BD.vrng() * 0.6), 4, r * 0.12);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1;
        bolt(ctx, r * (BD.vrng() - 0.2), y0, r * (BD.vrng() - 0.4), y0 * (0.7 + BD.vrng() * 0.6), 4, r * 0.12);
      }
      ctx.restore();
    }

    // ── 4. 手臂與槌（槌頭以快取繪製） ──
    const handX = r * 0.22, handY = r * 0.62;
    const hum = r * 0.38, humY = r * 0.88;

    // 槌柄方向由逐招姿態決定（ha：手→槌頭的角度，0 = 正前方）
    const ha = A.ha, lift = A.lift;
    const hd = r * 1.45 * (1 - 0.35 * lift);
    const headX = handX + Math.cos(ha) * hd;
    const headY = handY + Math.sin(ha) * hd;

    // 左臂：雙手握槌時伸向柄，格擋時前舉護身，否則收在身側
    const leftHand = {
      x: lerp(lerp(r * 0.12, handX + Math.cos(ha) * r * 0.35, A.both), r * 0.78, A.guard),
      y: lerp(lerp(-r * 0.72, handY + Math.sin(ha) * r * 0.35 - r * 0.12, A.both), -r * 0.06, A.guard),
    };
    ctx.strokeStyle = '#e8bda5';
    ctx.lineWidth = r * 0.17;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.5); ctx.lineTo(leftHand.x, leftHand.y); ctx.stroke();
    ctx.strokeStyle = '#c98f75';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.55); ctx.lineTo(leftHand.x, leftHand.y); ctx.stroke();

    // 左前臂裝備
    const la = Math.atan2(leftHand.y - (-r * 0.5), leftHand.x - (-r * 0.05));
    if (awake) {
      const glint = inst && inst.skill && inst.skill.ult && o.phase === 1;
      drawBareArm(ctx, (leftHand.x - r * 0.1), (leftHand.y - r * 0.05), la, r, t);
      if (glint) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(207,233,255,0.85)';
        ctx.lineWidth = 2.5;
        bolt(ctx, leftHand.x - r * 0.3, leftHand.y - r * 0.2, leftHand.x + r * 0.25, leftHand.y + r * 0.3, 5, r * 0.18);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        bolt(ctx, leftHand.x - r * 0.3, leftHand.y - r * 0.2, leftHand.x + r * 0.25, leftHand.y + r * 0.3, 5, r * 0.18);
        ctx.restore();
      }
    } else {
      drawGauntlet(ctx, leftHand.x, leftHand.y, la, r);
    }

    // 右臂（持槌）
    ctx.strokeStyle = '#e8bda5';
    ctx.lineWidth = r * 0.18;
    ctx.beginPath(); ctx.moveTo(-r * 0.05, r * 0.5); ctx.quadraticCurveTo(hum * 0.4, humY * 0.75, handX, handY); ctx.stroke();
    ctx.strokeStyle = '#c98f75';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-r * 0.02, r * 0.55); ctx.quadraticCurveTo(hum * 0.4, humY * 0.78, handX, handY); ctx.stroke();

    const ra = Math.atan2(handY - humY, handX - hum * 0.3);
    if (awake) drawBareArm(ctx, (handX + hum * 0.2) * 0.85, (handY + humY) * 0.5, ra, r, t);
    else drawGauntlet(ctx, (handX + hum * 0.2) * 0.85, (handY + humY) * 0.5, ra, r);

    // 槌柄與槌頭（空手或飛行時不畫）
    if (!leap && !thrown && A.sa > 0.01) {
      const a0 = Math.min(A.s0, ha), a1 = Math.max(A.s0, ha);
      ctx.fillStyle = awake ? 'rgba(127,200,255,' + A.sa + ')' : 'rgba(232,232,240,' + A.sa + ')';
      ctx.beginPath(); ctx.arc(handX, handY, hd + r * 0.55, a0, a1); ctx.arc(handX, handY, hd * 0.55, a1, a0, true); ctx.closePath(); ctx.fill();
    }
    if (!leap && !thrown) {
      drawHandle(ctx, r, handX, handY, headX, headY);
      // 槌頭長軸與柄垂直（T 字形）；舉過頂時放大（較靠近鏡頭）
      ctx.save();
      ctx.translate(headX, headY);
      ctx.rotate(ha + Math.PI / 2 + Math.sin(t * 2.6) * 0.04);
      const sc = 1 + 0.28 * lift;
      ctx.scale(sc, sc);
      hammerHead(ctx, r, awake, t);
      ctx.restore();
      if (A.gl > 0.05) { // 槌頭蓄力光：二階段雷藍、一階段白金
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = hexA(awake ? '#7fc8ff' : '#fff2c0', awake ? 0.1 + 0.3 * A.gl : 0.04 + 0.12 * A.gl);
        ctx.beginPath(); ctx.arc(headX, headY, r * (0.6 + 0.7 * A.gl) * (1 + 0.28 * lift), 0, U.TAU); ctx.fill();
        if (awake) for (let i = 0, n = Math.round(A.gl * 3); i < n; i++) {
          const x1 = headX + (BD.vrng() - 0.5) * r * 2.2, y1 = headY + (BD.vrng() - 0.5) * r * 1.6;
          ctx.strokeStyle = 'rgba(127,200,255,0.6)'; ctx.lineWidth = 2.5; bolt(ctx, headX, headY, x1, y1, 4, r * 0.14);
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; bolt(ctx, headX, headY, x1, y1, 4, r * 0.14);
        }
        ctx.restore();
      }
    }

    // ── 5. 頭部：紅髮頭頂（髮流向後）、微露的額與鼻樑、金色額環 ──
    ctx.save();
    ctx.fillStyle = '#f2cdb4';
    ctx.beginPath(); ctx.ellipse(r * 0.34, 0, r * 0.15, r * 0.17, 0, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = '#b07a62'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#c4231c';
    ctx.beginPath(); ctx.arc(r * 0.14, 0, r * 0.33, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = '#6e0f0a'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,110,70,0.85)'; ctx.lineWidth = Math.max(1, r * 0.035); ctx.lineCap = 'round';
    for (const yy of [-0.16, 0, 0.16]) { ctx.beginPath(); ctx.moveTo(r * 0.36, r * yy * 0.6); ctx.quadraticCurveTo(r * 0.12, r * yy * 1.4, -r * 0.14, r * yy * 1.5); ctx.stroke(); }
    // 金色額環（頭頂前緣）
    ctx.strokeStyle = '#e8c040';
    ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.beginPath(); ctx.arc(r * 0.14, 0, r * 0.31, -0.75, 0.75); ctx.stroke();
    ctx.fillStyle = '#fff1a8';
    ctx.beginPath(); ctx.arc(r * 0.45, 0, r * 0.045, 0, U.TAU); ctx.fill();
    ctx.restore();

    // ── 6. 大招一階段：雷電纏繞左前臂（已於左臂繪製），額外擴散雷光 ──
    if (inst && inst.skill && inst.skill.ult && o.phase === 1) {
      let firstHit = Infinity;
      if (Array.isArray(inst.v && inst.v.actions)) for (const a of inst.v.actions) if (a && a.do === 'hit') { firstHit = a.at; break; }
      if (inst.t < firstHit) {
        const wd = A.gl;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(127,200,255,' + (0.15 + 0.35 * wd) + ')';
        ctx.beginPath(); ctx.arc(leftHand.x, leftHand.y, r * (0.2 + 0.5 * wd), 0, U.TAU); ctx.fill();
        for (let i = 0, n = 2 + Math.round(4 * wd); i < n; i++) {
          ctx.strokeStyle = 'rgba(127,200,255,0.5)';
          ctx.lineWidth = 2;
          bolt(ctx, leftHand.x + (BD.vrng() - 0.5) * r * 0.6, leftHand.y + (BD.vrng() - 0.5) * r * 0.6, leftHand.x + (BD.vrng() - 0.5) * r, leftHand.y + (BD.vrng() - 0.5) * r, 4, r * 0.14);
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 1;
          bolt(ctx, leftHand.x + (BD.vrng() - 0.5) * r * 0.6, leftHand.y + (BD.vrng() - 0.5) * r * 0.6, leftHand.x + (BD.vrng() - 0.5) * r, leftHand.y + (BD.vrng() - 0.5) * r, 4, r * 0.14);
        }
        ctx.restore();
      }
    }

    // ── 7a. 換階段・咆哮前：鐵手套裂紋發光、雷弧在槌頭與雙手間越竄越密 ──
    if (pre) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const n = 1 + Math.round(preK * 4);
      for (let i = 0; i < n; i++) {
        ctx.strokeStyle = 'rgba(127,200,255,' + (0.3 + 0.5 * preK) + ')'; ctx.lineWidth = 2.2;
        bolt(ctx, headX + (BD.vrng() - 0.5) * r * 0.8, headY + (BD.vrng() - 0.5) * r * 0.8, headX + (BD.vrng() - 0.5) * r * 1.6, headY + (BD.vrng() - 0.5) * r * 1.6, 4, r * 0.15);
      }
      ctx.strokeStyle = 'rgba(255,240,200,' + preK + ')'; ctx.lineWidth = 1.4;
      for (const [gx, gy] of [[leftHand.x, leftHand.y], [(handX + hum * 0.2) * 0.85, (handY + humY) * 0.5]]) {
        bolt(ctx, gx - r * 0.15, gy - r * 0.12, gx + r * 0.15, gy + r * 0.1, 3, r * 0.06);
        if (preK > 0.5) bolt(ctx, gx - r * 0.1, gy + r * 0.12, gx + r * 0.12, gy - r * 0.1, 3, r * 0.06);
      }
      ctx.restore();
    }

    // ── 7b. 換階段・咆哮後：鐵手套碎片飛散 + 槌頭裂紋逐步顯現強光 ──
    if (trans && !pre) {
      ctx.save();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * U.TAU + i * 0.37;
        const d = r * (0.35 + transK * (1.0 + (i % 3) * 0.35));
        const x = Math.cos(a) * d + r * 0.2;
        const y = Math.sin(a) * d * 0.8;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + transK * 4);
        ctx.globalAlpha = 1 - transK * 0.7;
        ctx.fillStyle = i % 2 ? '#2a2e35' : '#3a3f48';
        ctx.fillRect(-3, -2, 6, 4);
        ctx.strokeStyle = '#6b7480';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-3, -2, 6, 4);
        ctx.restore();
      }
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = transK;
      ctx.strokeStyle = '#ff5a1e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(headX, headY, r * 0.7 + transK * r * 0.5, 0, U.TAU);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // 結束軀幹扭轉 / 前衝 / 壓縮

    // ── 8. 投擲／迴旋中的雷槌（世界座標換算到局部；在姿態變形之外） ──
    if (thrown) {
      const wr = worldRot(ctx);
      if (wr) {
        const dx = thrown.pos.x - o.x, dy = thrown.pos.y - o.y;
        const lx = dx * wr.c + dy * wr.s;
        const ly = -dx * wr.s + dy * wr.c;
        // 雷電尾跡（朝手的反方向）
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const back = Math.atan2(ly - handY, lx - handX);
        for (let i = 0; i < 3; i++) {
          const bx = lx - Math.cos(back) * r * (0.4 + i * 0.4);
          const by = ly - Math.sin(back) * r * (0.4 + i * 0.4);
          ctx.strokeStyle = 'rgba(127,200,255,' + (0.5 - i * 0.12) + ')';
          ctx.lineWidth = 2.5 - i * 0.5;
          bolt(ctx, lx, ly, bx + (BD.vrng() - 0.5) * r * 0.4, by + (BD.vrng() - 0.5) * r * 0.4, 5, r * 0.16);
        }
        ctx.restore();

        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(thrown.spin);
        hammerHead(ctx, r, p2, t);
        ctx.restore();

        // 連向手部的殘光
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = '#cfe9ff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(handX, handY); ctx.lineTo(lx, ly); ctx.stroke();
        ctx.restore();
      }
    }
  }

  function hidden(ctx, b, t) {
    const ls = leapState(b);
    if (!ls || !ls.pos) return;
    const r = (b.r || 32) * VIS;
    const k = ls.k;
    ctx.save();
    // 地面陰影：隨躍起變大、變淡
    const rr = r * (1.5 + k * 1.2);
    const gr = ctx.createRadialGradient(ls.pos.x, ls.pos.y, rr * 0.2, ls.pos.x, ls.pos.y, rr);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.ellipse(ls.pos.x, ls.pos.y, rr, rr * 0.7, 0, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(159,212,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(ls.pos.x, ls.pos.y, rr * 0.8, rr * 0.56, 0, 0, U.TAU); ctx.stroke();
    // 落下的槌影：接近落地時逐漸清晰、放大
    const a = U.clamp((k - 0.55) / 0.45, 0, 1);
    if (a > 0) {
      const s = r * (0.8 + 0.5 * a);
      ctx.globalAlpha = a * 0.5;
      ctx.save();
      ctx.translate(ls.pos.x, ls.pos.y - (1 - a) * r * 2.2);
      ctx.rotate(-0.6);
      ctx.fillStyle = '#d9dde2';
      ctx.fillRect(-s * 1.3, -s * 0.5, s * 2.6, s);
      ctx.fillStyle = '#3a3f47';
      ctx.fillRect(-s * 1.3, -s * 0.5, s * 0.3, s);
      ctx.fillRect(s * 1.0, -s * 0.5, s * 0.3, s);
      ctx.restore();
    }
    ctx.restore();
  }

  R.defineBossStyle('thor', {
    body(ctx, o, t, args) {
      ctx.save();
      ctx.lineWidth = 1;
      drawBody(ctx, o, t, Object.assign({}, args, { r: args.r * VIS }));
      ctx.restore();
    },
    hidden(ctx, b, t) { hidden(ctx, b, t); },
    transition() { return false; },
  });
})(typeof window !== 'undefined' ? window : globalThis);
