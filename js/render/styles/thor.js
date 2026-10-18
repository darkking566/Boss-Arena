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

  // 投擲／迴旋的雷槌：回傳 { pos:{x,y}, spin, f } 或 null
  function thrownState(o) {
    const inst = o.inst;
    if (!inst || !inst.skill || !inst.v || !Array.isArray(inst.v.actions)) return null;
    const id = inst.skill.id;
    let markId = null;
    if (id === 'mjolnir_throw') markId = 'M';
    else if (inst.skill.ult && o.phase === 2) markId = 'G1';
    if (!markId) return null;
    let tOut = -1, tBack = -1, len = 0;
    for (const a of inst.v.actions) {
      if (!a || a.anchor !== 'mark' || a.mark !== markId || a.do !== 'hit') continue;
      if (tOut < 0) { tOut = a.at; len = a.len || len; }
      else { tBack = a.at; break; }
    }
    if (tOut < 0 || tBack < 0) return null;
    const t0 = tOut - 0.3;
    if (inst.t < t0 || inst.t > tBack) return null;
    const m = inst.marks && inst.marks[markId];
    if (!m) return null;
    const f = U.clamp((inst.t - t0) / Math.max(0.05, tBack - t0), 0, 1);
    const d = len * Math.sin(Math.PI * f);
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

  // ───────────── 槌的姿勢：以「下一記判定」為節拍 ─────────────
  // 判定前舉槌蓄力（橫掃 → 拉到右後方；砸擊 → 雙手高舉過頂，lift 讓槌頭變大像是更靠近鏡頭）、
  // 判定瞬間 0.16 秒內揮落 / 掃過、之後停在收招位置直到下一記；ring 震波與飛行中的槌不計入節拍
  const IDLE_HA = 2.3, FT = 0.16;
  const lerp = (a, b, k) => a + (b - a) * k;
  function hammerPose(o, st, swing) {
    const inst = o.inst, idle = { ha: IDLE_HA + (swing || 0) * 0.15, lift: 0, both: false };
    if (st === 'stun' || st === 'stagger') return { ha: 1.25, lift: 0, both: false };
    if (st === 'feint') return { ha: 2.9, lift: 0.6, both: true };
    if (!inst || !inst.v || !Array.isArray(inst.v.actions)) return idle;
    const hits = inst.v.actions.filter((a) => a && (a.do === 'hit' || a.do === 'erupt') && a.shape !== 'ring' && !(a.anchor === 'mark' && a.shape === 'rect'))
      .sort((a, b) => a.at - b.at);
    if (inst.skill && inst.skill.id === 'jarngreipr_guard' && hits.length && inst.t < hits[0].at - 0.4) return { ha: 1.7, lift: 0, both: false, guard: true };
    let prev = null, next = null;
    for (const a of hits) { if (a.at <= inst.t) prev = a; else { next = a; break; } }
    const sweep = (a) => a && (a.shape === 'cone' || a.shape === 'arc');
    if (prev && inst.t - prev.at < FT) {
      const k = U.clamp((inst.t - prev.at) / FT, 0, 1);
      return sweep(prev) ? { ha: lerp(2.1, -1.3, k), lift: 0.2 * (1 - k), both: false } : { ha: lerp(2.9, 0.05, k), lift: 0.8 * (1 - k), both: true };
    }
    if (next) {
      const t0 = prev ? prev.at + FT : 0;
      const k = U.clamp((inst.t - t0) / Math.max(0.1, next.at - t0), 0, 1), e = 1 - (1 - k) * (1 - k);
      const from = prev ? (sweep(prev) ? -1.3 : 0.05) : IDLE_HA;
      return sweep(next) ? { ha: lerp(from, 2.1, e), lift: 0.2 * e, both: false, wind: e } : { ha: lerp(from, 2.9, e), lift: 0.8 * e, both: true, wind: e };
    }
    if (prev) return sweep(prev) ? { ha: -1.3, lift: 0, both: false } : { ha: 0.05, lift: 0, both: false };
    return idle;
  }

  function drawBody(ctx, o, t, { def, r, st, act, swing }) {
    const p2 = o.phase === 2;
    const trans = st === 'transition';
    const transK = trans ? U.clamp((o.stateT || 0) / Math.max(0.1, o.stateDur || 1), 0, 1) : 0;
    const inst = o.inst || null;
    const tilt = st === 'stun' || st === 'stagger';
    const leap = leapState(o);
    const thrown = thrownState(o);
    // 一階段大招（鬥神之雷槌）：上身後仰到幾乎倒地的蓄力——整個身體往後移
    if (inst && inst.skill && inst.skill.ult && o.phase === 1) { const pw = hammerPose(o, st, swing); if (pw.wind) ctx.translate(-r * 0.32 * pw.wind, 0); }

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

    // 依節拍決定槌柄方向（ha：手→槌頭的角度，0 = 正前方）
    const pose = hammerPose(o, st, swing);
    const ha = pose.ha, lift = pose.lift || 0, both = !!pose.both;
    const hd = r * 1.45 * (1 - 0.35 * lift);
    const headX = handX + Math.cos(ha) * hd;
    const headY = handY + Math.sin(ha) * hd;

    // 左臂（僅在大招雙手握槌時伸向柄）
    const leftHand = pose.guard ? { x: r * 0.78, y: -r * 0.06 }
      : both ? { x: handX + Math.cos(ha) * r * 0.35, y: handY + Math.sin(ha) * r * 0.35 - r * 0.12 }
      : { x: r * 0.12, y: -r * 0.72 };
    ctx.strokeStyle = '#e8bda5';
    ctx.lineWidth = r * 0.17;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.5); ctx.lineTo(leftHand.x, leftHand.y); ctx.stroke();
    ctx.strokeStyle = '#c98f75';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.55); ctx.lineTo(leftHand.x, leftHand.y); ctx.stroke();

    // 左前臂裝備
    const la = Math.atan2(leftHand.y - (-r * 0.5), leftHand.x - (-r * 0.05));
    if (p2 || trans) {
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
    if (p2 || trans) drawBareArm(ctx, (handX + hum * 0.2) * 0.85, (handY + humY) * 0.5, ra, r, t);
    else drawGauntlet(ctx, (handX + hum * 0.2) * 0.85, (handY + humY) * 0.5, ra, r);

    // 槌柄與槌頭（空手或飛行時不畫）
    if (!leap && !thrown) {
      drawHandle(ctx, r, handX, handY, headX, headY);
      // 槌頭長軸與柄垂直（T 字形）；舉過頂時放大（較靠近鏡頭）
      ctx.save();
      ctx.translate(headX, headY);
      ctx.rotate(ha + Math.PI / 2 + Math.sin(t * 2.6) * 0.04);
      const sc = 1 + 0.28 * lift;
      ctx.scale(sc, sc);
      hammerHead(ctx, r, p2 || trans, t);
      ctx.restore();
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
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 2; i++) {
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

    // ── 7. 階段轉換：鐵手套碎片飛散 + 槌頭裂紋逐步顯現強光 ──
    if (trans) {
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

    // ── 8. 投擲／迴旋中的雷槌（世界座標換算到局部） ──
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
