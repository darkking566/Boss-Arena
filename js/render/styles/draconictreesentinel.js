'use strict';
// Boss 造型：龍裝大樹守衛（依遊戲內模型與參考圖，俯視）：
//   戰馬——畸形的金色龍鎧、背上展開骨架嶙峋的龍翼（暗紅膜）、頸後一排棘刺鬃毛，鎧底垂著黑羽裙甲；
//   騎士——尖刺肩甲的金色龍鎧、帶角的頭盔與頂羽、赭色披風；
//   右手龍爪巨槌（長柄、巨大槌頭、龍爪般彎曲的尖爪），左手龍爪盾（三道龍爪稜脊）；二階段槌與盾纏繞紅色雷光。
// 逐招動畫沿用大樹守衛的關鍵值姿態混合（蓄力 → 擊 → 收），槌砸、人立、舉盾、衝鋒各有姿態；
//   under()：龍雷灌注的腳下紅雷環、衝鋒拖尾；R.projStyles.redwave：赤雷浪（鋸齒紅雷波）。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  const TAU = U.TAU, PI = Math.PI;
  const WHITE = '#ffffff', PALE = '#ffd6c8', GOLD = '#ff4a3a', GILT = '#c79a3a', GILT_D = '#6e4a1a', GILT_L = '#f2d484', WING = '#4a1a1c', WING_L = '#8a2a28';
  const SKIRT = '#2e2833', SKIRT_L = '#5a4d66', LEG = '#5a2a20', HOOF = '#2a1a12', CAPE = '#6b5426', ROOT = '#6e665a', PLUME = '#cfc27a';
  const TRIG = { hit: 1, dash: 1, proj: 1, lob: 1, status: 1, erupt: 1 };
  const ease = (u) => 1 - (1 - u) * (1 - u);
  const lerp = (a, b, u) => a + (b - a) * u;

  // 姿態：ang 戟身方向（相對面向）、ext 持戟手前伸、up 高舉過頂（戟身縮短示意朝上）、rear 戰馬人立、sh 舉盾、fwd 前衝、spin 扭身、gl 戟上金光、thr 戟尖前方的光槍、bk 盾面撞擊弧光
  const DEF = { ang: 2.55, ext: 0.1, up: 0, rear: 0, sh: 0, fwd: 0, spin: 0, gl: 0, thr: 0, bk: 0 };
  const KEYS = Object.keys(DEF);
  // key: [蓄滿, 擊]
  const SWING = [ // 側揮：由右後往左前掃、第二下反手掃回
    { ang: [2.3, -0.7], ext: [0.2, 0.9], spin: [0.35, -0.3], gl: [0.4, 1] },
    { ang: [-0.9, 1.9], ext: [0.3, 0.9], spin: [-0.3, 0.35], gl: [0.4, 1] }];
  const STAB = { ang: [0.15, 0], ext: [-0.4, 1.25], rear: [0.7, 0.15], fwd: [-0.1, 0.3], gl: [0.6, 1], thr: [0.1, 1] };
  const SLAM = { ang: [0, 0], ext: [0.4, 1.1], up: [1, 0], rear: [1, -0.1], fwd: [-0.12, 0.25], gl: [1, 1] };
  const STOMP = { rear: [1, -0.25], fwd: [-0.05, 0.25], ang: [2.4, 2.2] };
  const BASH = { spin: [-0.45, 0.7], fwd: [0, 0.15], ang: [2.6, 2.3] };
  const TWIRL = { ang: [-2.2, 3.7], ext: [0.3, 1.1], rear: [0.8, 0.1], spin: [-0.5, 0.7], gl: [0.8, 1] };
  const BACKSWING = { ang: [1.2, 3.6], ext: [0.3, 1], spin: [0.4, 0.9], gl: [0.5, 1] };
  const DASH = { ang: [0.25, 0.08], ext: [0.6, 1.1], fwd: [-0.12, 0.35], gl: [0.5, 0.9], thr: [0.3, 0.8] }; // 戟夾腋下平舉，像騎槍衝鋒
  const WALL = { sh: [1, 1], fwd: [0, 0.08], ang: [2.6, 2.6], gl: [0, 0] };
  const SHIELDBASH = { sh: [0.8, 1], spin: [0.35, -0.45], fwd: [-0.12, 0.35], ang: [2.6, 2.4], bk: [0.2, 1] };
  const CRUSH = { sh: [1, 1], rear: [1, -0.2], fwd: [0, 0.2], ang: [2.6, 2.6], bk: [0.3, 1] };
  const VOW = { up: [1, 1], rear: [0.6, 0.5], gl: [1, 1], ext: [0.4, 0.5], ang: [0, 0] };

  const QUICK = { ang: [0.4, 0], ext: [0.4, 1.0], up: [0.4, 0], fwd: [-0.05, 0.2], gl: [0.4, 1] };
  const SWIPE = { sh: [0.6, 1], spin: [0.4, -0.45], fwd: [-0.08, 0.2], ang: [2.6, 2.4], bk: [0.2, 1] };
  const REARFIRE = { rear: [1, 0.8], ang: [2.4, 2.4], fwd: [0, 0.08], gl: [0.6, 1] };
  const BOLT = { sh: [1, 1], up: [0.6, 0.6], gl: [1, 1], ang: [2.6, 2.6], ext: [0.3, 0.3] };
  const WAVE = { ang: [2.9, 0.15], ext: [0.2, 1.1], fwd: [-0.12, 0.12], gl: [0.8, 1], thr: [0, 0.7] };
  function pick(e, sid) {
    const a = e.a;
    switch (a.do) {
      case 'dash': return DASH;
      case 'status': case 'erupt': return VOW;
      case 'proj': return WAVE;
      default:
        switch (sid) {
          case 'quick_maul': return QUICK;
          case 'horse_stomp': return STOMP;
          case 'fireball': return REARFIRE;
          case 'honed_bolt': return BOLT;
          case 'shield_smash': return SHIELDBASH;
          case 'shield_swipe': case 'lightning_strike': if (a.shape === 'cone') return SWIPE;
        }
        if (a.shape === 'circle' || a.shape === 'ring') return SLAM;
        return SWING[e.hi & 1];
    }
  }

  // ── 姿態混合（同犽宿：下一手蓄力、上一手收勢）──
  const A = Object.assign({}, DEF), B = {};
  const P = { le: null, ne: null, wd: 0, sn: 0, since: 0 };
  const CACHE = new WeakMap();
  function trigs(v) {
    let c = CACHE.get(v.actions);
    if (!c) {
      c = []; let hn = 0;
      for (const a of v.actions) if (TRIG[a.do] && (a.do !== 'status' || a.fx)) c.push({ a, hi: a.do === 'hit' ? hn++ : -1 });
      c.sort((x, y) => x.a.at - y.a.at);
      CACHE.set(v.actions, c);
    }
    return c;
  }
  function pace(inst) {
    const c = trigs(inst.v), t = inst.t; let L = -1, N = -1;
    for (let i = 0; i < c.length; i++) { if (c[i].a.at <= t) L = i; else { N = i; break; } }
    P.le = L >= 0 ? c[L] : null; P.ne = N >= 0 ? c[N] : null;
    const endL = L >= 0 ? c[L].a.at : 0;
    P.since = L >= 0 ? t - endL : 0;
    P.sn = L >= 0 && P.since < 0.3 ? 1 - P.since / 0.3 : 0;
    P.wd = N >= 0 ? U.clamp((t - endL) / Math.max(0.05, c[N].a.at - endL), 0, 1) : 0;
  }
  function ev(O, e, mode, a, b) {
    for (const k of KEYS) {
      const x = e[k];
      if (!x) { O[k] = DEF[k]; continue; }
      O[k] = mode === 'snap' ? lerp(DEF[k], x[1], a) : b > 0 ? lerp(x[0], x[1], b) : lerp(DEF[k], x[0], a);
    }
  }
  let ARC = 0, ARC0 = 0, ARC1 = 0; // 本幀戟刃掃過的弧（強度、起訖角）
  function build(sid) {
    const eN = P.ne && pick(P.ne, sid), eL = P.le && pick(P.le, sid);
    ARC = 0;
    if (eN) {
      const sw = P.wd < 0.72 ? 0 : ease((P.wd - 0.72) / 0.28);
      ev(A, eN, 'wind', ease(Math.min(1, P.wd / 0.65)), sw);
      if (sw > 0.05 && eN.ang && Math.abs(eN.ang[1] - eN.ang[0]) > 0.8) { ARC = sw; ARC0 = eN.ang[0]; ARC1 = A.ang; }
      if (eL && P.sn > 0) { ev(B, eL, 'snap', P.sn); for (const k of KEYS) A[k] = lerp(A[k], B[k], P.sn); }
    } else if (eL) ev(A, eL, 'snap', P.sn);
    if (!ARC && eL && P.sn > 0 && eL.ang && Math.abs(eL.ang[1] - eL.ang[0]) > 0.8) { ARC = P.sn; ARC0 = eL.ang[0]; ARC1 = eL.ang[1]; }
  }

  // ── 部件（本地座標：+x 為面向、+y 為右側）──
  const C = (shade, col) => (shade ? '#0a0806' : col);
  function filigree(g, x, y, s, col) { // 雕花卷紋
    g.strokeStyle = col; g.lineWidth = Math.max(0.8, s * 0.12);
    g.beginPath(); g.arc(x, y, s, 0.3, 4.6); g.stroke();
    g.beginPath(); g.arc(x + s * 0.9, y + s * 0.2, s * 0.5, 3.4, 7.6); g.stroke();
  }
  // 腿：四蹄依奔馳相位前後擺動（人立時前蹄抬起往前踢）
  function legs(ctx, r, run, ph, rear, shade) {
    ctx.lineCap = 'round';
    const pts = [[0.95, -0.42, 0], [0.95, 0.42, PI], [-0.95, -0.4, PI * 0.5], [-0.95, 0.4, PI * 1.5]];
    for (let i = 0; i < 4; i++) {
      const [lx, ly, o] = pts[i], front = i < 2, sw = Math.sin(ph + o) * 0.32 * r * run;
      const kick = front ? rear * r * (0.5 + 0.25 * Math.sin(ph * 2 + o)) : 0;
      const x0 = lx * r, y0 = ly * r, x1 = x0 + sw + kick, y1 = y0 * 1.1;
      ctx.strokeStyle = C(shade, LEG); ctx.lineWidth = r * 0.17; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.fillStyle = C(shade, HOOF); ctx.beginPath(); ctx.ellipse(x1 + r * 0.05, y1, r * 0.11, r * 0.09, 0, 0, TAU); ctx.fill();
    }
  }
  function tail(ctx, r, sway, run, shade) {
    ctx.strokeStyle = C(shade, '#1c1612'); ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.lineWidth = r * (0.14 - i * 0.025);
      ctx.beginPath(); ctx.moveTo(-r * 1.25, (i - 1.5) * r * 0.05);
      ctx.quadraticCurveTo(-r * (1.6 + 0.3 * run), r * (sway * 0.4 + (i - 1.5) * 0.1), -r * (1.9 + 0.6 * run), r * (sway * 0.7 + (i - 1.5) * 0.14)); ctx.stroke();
    }
  }
  // 馬身：紫黑羽葉裙甲（外緣一圈扇形葉片）+ 黃金馬鎧（雕花、皮帶）
  function barding(ctx, r, shade) {
    R.blit(ctx, 'body:dts:horse:' + r + ':' + (shade ? 's' : 'b'), r * 3.0 + 16, r * 1.8 + 16, r * 1.5 + 8, r * 0.9 + 8, (g) => {
      // 羽葉裙甲
      g.fillStyle = C(shade, SKIRT); g.beginPath(); g.ellipse(-r * 0.05, 0, r * 1.42, r * 0.84, 0, 0, TAU); g.fill();
      if (!shade) {
        for (let i = 0; i < 34; i++) {
          const an = i / 34 * TAU, ex = Math.cos(an) * r * 1.38 - r * 0.05, ey = Math.sin(an) * r * 0.8;
          g.fillStyle = i % 3 ? SKIRT_L : '#44384f'; g.beginPath(); g.ellipse(ex, ey, r * 0.13, r * 0.07, an, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(20,14,24,0.7)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(ex - Math.cos(an) * r * 0.1, ey - Math.sin(an) * r * 0.06); g.lineTo(ex + Math.cos(an) * r * 0.1, ey + Math.sin(an) * r * 0.06); g.stroke();
        }
      }
      // 黃金馬鎧：後臀甲、鞍下甲、胸甲三片
      const gr = g.createLinearGradient(0, -r * 0.7, 0, r * 0.7);
      gr.addColorStop(0, C(shade, GILT_L)); gr.addColorStop(0.5, C(shade, GILT)); gr.addColorStop(1, C(shade, GILT_D));
      g.fillStyle = gr; g.strokeStyle = shade ? GOLD : '#5a3e14'; g.lineWidth = 1.4;
      g.beginPath(); g.ellipse(-r * 0.62, 0, r * 0.66, r * 0.62, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(r * 0.55, 0, r * 0.6, r * 0.55, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(0, 0, r * 0.5, r * 0.6, 0, 0, TAU); g.fill(); g.stroke();
      if (!shade) {
        for (const [x, y, s] of [[-0.75, -0.3, 0.13], [-0.7, 0.28, 0.12], [-0.4, 0, 0.1], [0.6, -0.25, 0.11], [0.62, 0.25, 0.11], [0.85, 0, 0.08]]) filigree(g, x * r, y * r, s * r, 'rgba(110,74,20,0.75)');
        g.strokeStyle = 'rgba(255,240,190,0.55)'; g.lineWidth = 1;
        g.beginPath(); g.ellipse(-r * 0.62, 0, r * 0.5, r * 0.46, 0, 3.6, 5.6); g.stroke();
        g.strokeStyle = '#8a3a1a'; g.lineWidth = r * 0.06; // 胸前皮帶
        g.beginPath(); g.arc(r * 0.35, 0, r * 0.55, -1.1, 1.1); g.stroke();
      }
    });
  }
  // 馬頭：黃金面甲、額前金角、兩個打孔的圓眼罩、豎起的耳朵
  function head(ctx, r, shade) {
    R.blit(ctx, 'body:dts:head:' + r + ':' + (shade ? 's' : 'b'), r * 1.6 + 10, r * 0.9 + 10, r * 0.25 + 5, r * 0.45 + 5, (g) => {
      g.fillStyle = C(shade, GILT_D); g.beginPath(); g.ellipse(r * 0.05, -r * 0.3, r * 0.1, r * 0.06, -0.5, 0, TAU); g.fill(); // 耳
      g.beginPath(); g.ellipse(r * 0.05, r * 0.3, r * 0.1, r * 0.06, 0.5, 0, TAU); g.fill();
      const gr = g.createLinearGradient(0, -r * 0.3, 0, r * 0.3);
      gr.addColorStop(0, C(shade, GILT_L)); gr.addColorStop(1, C(shade, GILT_D));
      g.fillStyle = gr; g.strokeStyle = shade ? GOLD : '#5a3e14'; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(-r * 0.15, -r * 0.3); g.quadraticCurveTo(r * 0.55, -r * 0.32, r * 0.95, -r * 0.12); g.quadraticCurveTo(r * 1.05, 0, r * 0.95, r * 0.12);
      g.quadraticCurveTo(r * 0.55, r * 0.32, -r * 0.15, r * 0.3); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = C(shade, '#1a1210'); g.beginPath(); g.ellipse(r * 1.0, 0, r * 0.1, r * 0.12, 0, 0, TAU); g.fill(); // 鼻口
      for (const s of [-1, 1]) { // 打孔眼罩
        g.fillStyle = C(shade, GILT); g.beginPath(); g.arc(r * 0.35, s * r * 0.24, r * 0.1, 0, TAU); g.fill(); g.stroke();
        if (!shade) { g.fillStyle = '#2a1a0a'; for (let i = 0; i < 5; i++) { const a = i * 1.26; g.beginPath(); g.arc(r * 0.35 + Math.cos(a) * r * 0.045, s * r * 0.24 + Math.sin(a) * r * 0.045, 1.1, 0, TAU); g.fill(); } }
      }
      g.fillStyle = C(shade, GILT_L); g.beginPath(); g.moveTo(r * 0.2, -r * 0.06); g.lineTo(r * 0.85, 0); g.lineTo(r * 0.2, r * 0.06); g.closePath(); g.fill(); // 額角
      if (!shade) { filigree(g, r * 0.6, -r * 0.12, r * 0.06, 'rgba(110,74,20,0.8)'); filigree(g, r * 0.6, r * 0.14, r * 0.06, 'rgba(110,74,20,0.8)'); }
    });
  }
  // 龍爪盾：厚重的圓盾，三道龍爪稜脊由盾心往外撕開；二階段盾面爬滿紅雷
  function shield(ctx, r, shade, glow) {
    const sr = r * 0.64;
    if (glow > 0.02 && !shade) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, 0, sr * 0.3, 0, 0, sr * 1.8);
      g.addColorStop(0, hexA(GOLD, 0.55 * glow)); g.addColorStop(1, hexA(GOLD, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, sr * 1.8, 0, TAU); ctx.fill(); ctx.restore();
    }
    R.blit(ctx, 'body:dts:shield:' + r + ':' + (shade ? 's' : 'b'), sr * 2 + 12, sr * 2 + 12, sr + 6, sr + 6, (g) => {
      const gr = g.createRadialGradient(-sr * 0.3, -sr * 0.3, 2, 0, 0, sr);
      gr.addColorStop(0, C(shade, '#f0cf78')); gr.addColorStop(0.6, C(shade, GILT)); gr.addColorStop(1, C(shade, GILT_D));
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, sr, 0, TAU); g.fill();
      g.strokeStyle = shade ? GOLD : '#4a2c10'; g.lineWidth = 2.5; g.stroke();
      if (shade) return;
      g.lineCap = 'round';
      for (let i = 0; i < 3; i++) { // 三道龍爪稜脊：由盾心向外彎曲收尖
        const a = -1.1 + i * 1.1;
        g.fillStyle = '#e8d08a'; g.strokeStyle = '#4a2c10'; g.lineWidth = 1.3;
        g.beginPath(); g.moveTo(Math.cos(a - 0.14) * sr * 0.2, Math.sin(a - 0.14) * sr * 0.2);
        g.quadraticCurveTo(Math.cos(a - 0.35) * sr * 0.65, Math.sin(a - 0.35) * sr * 0.65, Math.cos(a + 0.08) * sr * 1.0, Math.sin(a + 0.08) * sr * 1.0);
        g.quadraticCurveTo(Math.cos(a + 0.25) * sr * 0.6, Math.sin(a + 0.25) * sr * 0.6, Math.cos(a + 0.14) * sr * 0.2, Math.sin(a + 0.14) * sr * 0.2);
        g.closePath(); g.fill(); g.stroke();
      }
      g.fillStyle = '#7a2a1c'; g.strokeStyle = '#3a1608'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, sr * 0.2, 0, TAU); g.fill(); g.stroke(); // 盾心
      g.fillStyle = 'rgba(255,230,160,0.85)'; g.beginPath(); g.arc(-sr * 0.06, -sr * 0.06, sr * 0.06, 0, TAU); g.fill();
    });
  }
  // 龍爪巨槌：長柄 + 方正的巨大槌頭 + 槌頭前緣一支彎曲的龍爪；len 為柄長（沿用原函式名 halberd 以免動到 body 呼叫）
  function halberd(ctx, len, r, shade, glow) {
    const W = r * 0.08;
    if (glow > 0.05 && !shade) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      ctx.strokeStyle = hexA(GOLD, 0.2 + 0.4 * glow); ctx.lineWidth = 12 + 12 * glow; ctx.beginPath(); ctx.moveTo(len * 0.7, 0); ctx.lineTo(len * 1.25, 0); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = C(shade, '#5a3a22'); ctx.fillRect(-len * 0.28, -W, len * 1.15, W * 2); // 柄
    if (!shade) { ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 10; i++) { const x = -len * 0.28 + i * len * 0.11; ctx.moveTo(x, -W); ctx.lineTo(x + 3, W); } ctx.stroke(); }
    ctx.fillStyle = C(shade, GILT); ctx.beginPath(); ctx.arc(-len * 0.3, 0, W * 2.3, 0, TAU); ctx.fill(); // 柄尾圓頭
    const hx = len * 0.86, hw = r * 0.42, hl = r * 0.62;
    const gr = ctx.createLinearGradient(0, -hw, 0, hw); gr.addColorStop(0, C(shade, GILT_L)); gr.addColorStop(0.5, C(shade, GILT)); gr.addColorStop(1, C(shade, GILT_D));
    ctx.fillStyle = gr; ctx.strokeStyle = shade ? GOLD : '#3a2208'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(hx, -hw); ctx.lineTo(hx + hl, -hw * 0.82); ctx.lineTo(hx + hl, hw * 0.82); ctx.lineTo(hx, hw); ctx.closePath(); ctx.fill(); ctx.stroke(); // 槌頭
    ctx.beginPath(); ctx.moveTo(hx + hl, -hw * 0.55); // 龍爪：槌頭前緣長出的彎爪
    ctx.quadraticCurveTo(hx + hl + r * 0.55, -hw * 0.45, hx + hl + r * 0.7, hw * 0.35); ctx.quadraticCurveTo(hx + hl + r * 0.42, hw * 0.05, hx + hl, hw * 0.45); ctx.closePath();
    ctx.fillStyle = C(shade, '#e8d8a8'); ctx.fill(); ctx.stroke();
    if (!shade) {
      ctx.strokeStyle = '#3a2208'; ctx.lineWidth = 1; ctx.beginPath(); // 槌面稜線
      for (const f of [-0.5, 0, 0.5]) { ctx.moveTo(hx + hl * 0.1, hw * f); ctx.lineTo(hx + hl * 0.9, hw * f * 0.85); }
      ctx.stroke();
      if (glow > 0.3) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(WHITE, 0.55 * glow); ctx.lineWidth = 1.5; ctx.beginPath(); // 槌面電弧
        for (let i = 0; i < 4; i++) { const y0 = (i - 1.5) * hw * 0.5; ctx.moveTo(hx + hl * 0.1, y0); ctx.lineTo(hx + hl * 0.4, y0 + (i % 2 ? 6 : -6)); ctx.lineTo(hx + hl * 0.7, y0); ctx.lineTo(hx + hl * 1.05, y0 + (i % 2 ? -5 : 5)); }
        ctx.stroke(); ctx.restore();
      }
    }
  }
  // 龍翼：兩片骨架嶙峋的翼從馬背兩側展開（暗紅膜 + 三根翼骨），奔跑時微微拍動
  function wings(ctx, r, shade, t, spread) {
    const flap = Math.sin(t * 5) * 0.05 + spread * 0.2;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(-r * 0.1, s * r * 0.4); ctx.scale(1, s);
      const L = r * (1.35 + spread * 0.4);
      const tips = [[0.2 - flap, 0.95], [0.6 - flap, 0.8], [0.98 - flap, 0.55]].map(([a, k]) => [-Math.sin(a) * L * k * 1.1 + L * 0.1, Math.cos(a) * L * k]); // 由前往後三根翼骨的末端
      ctx.fillStyle = C(shade, WING); ctx.strokeStyle = shade ? GOLD : '#1a0a0a'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(tips[0][0], tips[0][1]);
      for (let i = 1; i < 3; i++) { const m = [(tips[i - 1][0] + tips[i][0]) / 2 + L * 0.06, (tips[i - 1][1] + tips[i][1]) / 2 - L * 0.16]; ctx.quadraticCurveTo(m[0], m[1], tips[i][0], tips[i][1]); } // 翼膜在翼骨間內凹成弧
      ctx.lineTo(-L * 0.2, L * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (!shade) {
        ctx.strokeStyle = '#d8c080'; ctx.lineWidth = 2.2; ctx.beginPath(); // 翼骨
        for (const [x, y] of tips) { ctx.moveTo(0, 0); ctx.lineTo(x, y); }
        ctx.stroke();
        ctx.fillStyle = '#c8a850'; for (const [x, y] of tips) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill(); } // 翼爪
      }
      ctx.restore();
    }
    ctx.restore();
  }
  // 頸後棘刺鬃毛：一排向後倒伏的金色尖刺
  function mane(ctx, r, shade) {
    ctx.fillStyle = C(shade, GILT_L); ctx.strokeStyle = shade ? GOLD : '#4a2c10'; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) {
      const x = r * (0.2 - i * 0.16), y = s * r * (0.2 + i * 0.012);
      ctx.beginPath(); ctx.moveTo(x, y - s * r * 0.04); ctx.lineTo(x - r * 0.28, y + s * r * 0.12); ctx.lineTo(x, y + s * r * 0.06); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  // 騎士：披風（白色黃金樹紋）、金甲軀幹、肩甲、頭盔與乾草羽飾
  function rider(ctx, r, shade, sway, run) {
    ctx.fillStyle = C(shade, CAPE); ctx.strokeStyle = shade ? GOLD : '#3a2c12'; ctx.lineWidth = 1.2; // 披風往後飄
    ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.42); ctx.quadraticCurveTo(-r * (0.8 + 0.3 * run), -r * (0.55 + sway * 0.1), -r * (1.05 + 0.45 * run), -r * 0.35 + sway * r * 0.15);
    ctx.lineTo(-r * (1.15 + 0.5 * run), r * 0.32 + sway * r * 0.15); ctx.quadraticCurveTo(-r * (0.8 + 0.3 * run), r * (0.55 + sway * 0.1), -r * 0.05, r * 0.42); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (!shade) { // 白色黃金樹紋
      const bx = -r * (0.75 + 0.3 * run);
      ctx.strokeStyle = 'rgba(240,232,210,0.75)'; ctx.lineWidth = 1.3; ctx.beginPath();
      ctx.moveTo(-r * 0.2, 0); ctx.lineTo(bx, 0);
      for (const s of [-1, 1]) for (const f of [0.35, 0.6, 0.85]) { const x = lerp(-r * 0.2, bx, f); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x - r * 0.1, s * r * 0.12, x - r * 0.05, s * r * 0.25 * f); }
      ctx.stroke();
    }
    R.blit(ctx, 'body:dts:rider:' + r + ':' + (shade ? 's' : 'b'), r * 1.2 + 10, r * 1.2 + 10, r * 0.6 + 5, r * 0.6 + 5, (g) => {
      const gr = g.createRadialGradient(r * 0.1, -r * 0.1, 2, 0, 0, r * 0.5);
      gr.addColorStop(0, C(shade, GILT_L)); gr.addColorStop(1, C(shade, GILT_D));
      g.fillStyle = gr; g.strokeStyle = shade ? GOLD : '#5a3e14'; g.lineWidth = 1.3;
      g.beginPath(); g.ellipse(0, 0, r * 0.32, r * 0.42, 0, 0, TAU); g.fill(); g.stroke();
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(-r * 0.02, s * r * 0.36, r * 0.2, r * 0.15, 0, 0, TAU); g.fill(); g.stroke(); } // 肩甲
      if (!shade) { filigree(g, -r * 0.02, -r * 0.36, r * 0.07, 'rgba(110,74,20,0.8)'); filigree(g, -r * 0.02, r * 0.36, r * 0.07, 'rgba(110,74,20,0.8)'); g.fillStyle = '#b8202a'; g.beginPath(); g.arc(r * 0.18, 0, r * 0.04, 0, TAU); g.fill(); } // 胸前紅寶石
      g.fillStyle = C(shade, GILT); g.beginPath(); g.arc(r * 0.04, 0, r * 0.17, 0, TAU); g.fill(); g.stroke(); // 頭盔
      if (!shade) { g.strokeStyle = '#3a2810'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(r * 0.16, -r * 0.08); g.lineTo(r * 0.16, r * 0.08); g.stroke(); }
    });
    // 乾草般的羽飾：從盔頂往後散成一大叢
    ctx.strokeStyle = C(shade, PLUME); ctx.lineCap = 'round'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = PI + (i / 9 - 0.5) * 0.9 + sway * 0.12, l = r * (0.32 + 0.1 * (i % 3) + 0.15 * run); ctx.moveTo(r * 0.04, 0); ctx.quadraticCurveTo(Math.cos(a) * l * 0.5, Math.sin(a) * l * 0.3, Math.cos(a) * l, Math.sin(a) * l); }
    ctx.stroke();
  }

  function body(ctx, o, t, { r }) {
    const shade = !!o.shade, p2 = o.phase === 2, w = o.world;
    const stag = o.state === 'stagger' || o.state === 'stun';
    const inst = !stag && o.inst && o.inst.skill && o.inst.v && o.inst.v.actions ? o.inst : null;
    const sid = inst ? inst.skill.id : '';
    for (const k of KEYS) A[k] = DEF[k];
    A.ang = DEF.ang + Math.sin(t * 1.8) * 0.04;
    ARC = 0;
    if (inst) { pace(inst); build(sid); }
    if (o.state === 'transition') { A.up = 1; A.rear = 0.7; A.gl = 1; A.ang = 0; A.ext = 0.4; }
    if (w && w.walls && w.walls.some((wl) => wl.owner === o && wl.until > w.time)) A.sh = 1; // 盾壁還在：盾一直舉著
    const spd = Math.hypot(o.vx || 0, o.vy || 0), run = U.clamp(spd / 260, 0, 1);
    const ph = t * (6 + 10 * run) + (o.x || 0) * 0.01, sway = Math.sin(t * 3 + (o.y || 0) * 0.01) * (1 - run * 0.5);
    const rear = Math.max(0, A.rear), gl = Math.max(A.gl, p2 ? 0.6 : 0), fl2 = Math.max(run, U.clamp(A.fwd * 2.2, 0, 0.85)); // 衝刺 / 前撲時披風與尾巴也飄起

    ctx.save();
    ctx.translate(A.fwd * r, 0); if (A.spin) ctx.rotate(A.spin);
    // 地面金光：戟揮動時沿戟尖畫一道金色弧光（在人馬底下）
    const len = r * 2.2, hx = r * (0.15 + 0.45 * A.ext), hy = r * 0.42;
    if (ARC > 0 && !shade) {
      ctx.save(); ctx.translate(hx, hy); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const a0 = Math.min(ARC0, ARC1), a1 = Math.max(ARC0, ARC1);
      ctx.strokeStyle = hexA(GOLD, 0.45 * ARC); ctx.lineWidth = r * 0.35; ctx.beginPath(); ctx.arc(0, 0, len * 1.15, a0, a1); ctx.stroke();
      ctx.strokeStyle = hexA(WHITE, 0.85 * ARC); ctx.lineWidth = 3; ctx.stroke();
      if (a1 - a0 > 3) for (const f of [0.8, 0.56]) { // 迴旋大掃：內側再掃兩圈
        ctx.strokeStyle = hexA(f > 0.7 ? GOLD : PALE, 0.35 * ARC); ctx.lineWidth = r * 0.2 * f; ctx.beginPath(); ctx.arc(0, 0, len * 1.15 * f, a0, a1); ctx.stroke();
      }
      ctx.restore();
    }
    // 人立：前半身抬起——整體放大、往前推一點（影子由引擎畫在原地）
    const lift = 1 + 0.16 * rear;
    if (rear > 0) { ctx.translate(r * 0.25 * rear, 0); ctx.scale(lift, lift); }
    legs(ctx, r, Math.max(run, rear * 0.4), ph, rear, shade);
    tail(ctx, r, sway, fl2, shade);
    wings(ctx, r, shade, t, Math.max(run, rear * 0.6, fl2, p2 ? 0.5 : 0));
    barding(ctx, r, shade);
    // 頸與頭：人立時頭抬得更高（再放大）
    ctx.save(); ctx.translate(r * 0.95, 0);
    if (rear > 0) { ctx.translate(r * 0.2 * rear, 0); ctx.scale(1 + 0.22 * rear, 1 + 0.22 * rear); }
    ctx.rotate(Math.sin(ph) * 0.06 * run);
    ctx.fillStyle = C(shade, GILT_D); ctx.beginPath(); ctx.ellipse(r * 0.15, 0, r * 0.38, r * 0.28, 0, 0, TAU); ctx.fill(); // 頸
    mane(ctx, r, shade);
    ctx.translate(r * 0.38, 0); head(ctx, r, shade);
    ctx.restore();
    // 黃金樹大盾（左側；舉盾時移到正前方、發金光）
    ctx.save();
    ctx.translate(lerp(r * 0.0, r * 0.75, A.sh), lerp(-r * 0.72, -r * 0.25, A.sh));
    ctx.rotate(lerp(0, 0.5, A.sh));
    const sg = A.sh * (0.6 + 0.4 * Math.sin(t * 14));
    shield(ctx, r, shade, (p2 ? 0.45 : 0) + sg * 0.6);
    if (A.bk > 0.05 && !shade) { // 盾面撞出的金色弧光與放射根紋
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = hexA('#c08418', 0.5 * A.bk); ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, 0, r * 0.88, -0.95, 0.95); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = hexA(GOLD, 0.7 * A.bk); ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, r * 0.88, -0.95, 0.95); ctx.stroke();
      ctx.strokeStyle = hexA(WHITE, 0.9 * A.bk); ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = hexA(PALE, 0.6 * A.bk); ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = -3; i <= 3; i++) { const a = i * 0.28; ctx.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); ctx.lineTo(Math.cos(a) * r * (1.05 + 0.2 * (i & 1)), Math.sin(a) * r * (1.05 + 0.2 * (i & 1))); }
      ctx.stroke(); ctx.restore();
    }
    ctx.restore();
    rider(ctx, r, shade, sway, fl2);
    // 右臂 + 黃金戟（高舉時戟身縮短，表示朝上）
    ctx.strokeStyle = C(shade, GILT); ctx.lineWidth = r * 0.16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, r * 0.36); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(A.ang);
    const fl = 1 - 0.62 * U.clamp(A.up, 0, 1);
    ctx.scale(fl, 1);
    if (A.thr > 0.05 && !shade) { // 戟尖前方延伸出一道光槍（突刺、衝鋒）
      ctx.save(); ctx.lineCap = 'round';
      const L = len * (1.25 + 1.6 * A.thr);
      ctx.strokeStyle = hexA('#c08418', 0.4 * A.thr); ctx.lineWidth = r * 0.3; ctx.beginPath(); ctx.moveTo(len * 0.6, 0); ctx.lineTo(L, 0); ctx.stroke(); // 琥珀底（淺色地圖上加亮看不出來）
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = hexA(GOLD, 0.35 * A.thr); ctx.lineWidth = r * 0.34; ctx.beginPath(); ctx.moveTo(len * 0.6, 0); ctx.lineTo(L, 0); ctx.stroke();
      ctx.strokeStyle = hexA(WHITE, 0.85 * A.thr); ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = hexA(PALE, 0.55 * A.thr); ctx.lineWidth = 1.5; ctx.beginPath();
      for (const sd of [-1, 1]) { ctx.moveTo(len * 0.95, sd * r * 0.16); ctx.lineTo(L * 0.92, sd * r * 0.16); }
      ctx.stroke(); ctx.restore();
    }
    halberd(ctx, len, r, shade, gl);
    ctx.restore();
    if (A.up > 0.5 && gl > 0.5 && !shade) { // 高舉時戟頭上方的金色光點
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const tx = hx + Math.cos(A.ang) * len * 1.2 * fl, ty = hy + Math.sin(A.ang) * len * 1.2 * fl;
      const g = ctx.createRadialGradient(tx, ty, 1, tx, ty, r * 0.8);
      g.addColorStop(0, hexA(WHITE, 0.9)); g.addColorStop(0.4, hexA(GOLD, 0.5)); g.addColorStop(1, hexA(GOLD, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, ty, r * 0.8, 0, TAU); ctx.fill();
      ctx.strokeStyle = hexA(PALE, 0.5); ctx.lineWidth = 1.5; ctx.beginPath(); // 旋轉放射光芒
      for (let i = 0; i < 8; i++) { const a = t * 0.8 + i * TAU / 8, l0 = r * 0.5, l1 = r * (i % 2 ? 1.0 : 1.4); ctx.moveTo(tx + Math.cos(a) * l0, ty + Math.sin(a) * l0); ctx.lineTo(tx + Math.cos(a) * l1, ty + Math.sin(a) * l1); }
      ctx.stroke(); ctx.restore();
    }
    ctx.restore();
    if (w && w.time != null && BD.hasStatus && o.statuses && BD.hasStatus(o, 'draconicsurge') && !shade) { // 黃金誓言：身上繞著升起的金色光點
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = hexA(GOLD, 0.8);
      for (let i = 0; i < 10; i++) { const a = t * 1.5 + i * 0.628, rr = r * (1.1 + 0.25 * Math.sin(t * 3 + i)); ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 2.2, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }

  // ── 地面：龍雷灌注的腳下紅雷環、衝鋒拖尾 ──
  function under(ctx, b, t) {
    const dh = b.inst && b.inst.dash;
    if (dh && dh.t < dh.dur && b.state !== 'dead' && !BD.hasStatus(b, 'hidden')) { // 衝鋒：身後拖五條紅光帶
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(dh.vy, dh.vx)); ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) {
        const ay = Math.abs(i), l = b.r * (2.6 - 0.4 * ay) + ((t * 30 + i * 7) % 1) * 22;
        ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = hexA('#701818', 0.3 - 0.04 * ay); ctx.lineWidth = 7 - ay; ctx.beginPath(); ctx.moveTo(-b.r * 0.7, i * b.r * 0.3); ctx.lineTo(-b.r * 0.7 - l, i * b.r * 0.3); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = hexA(i & 1 ? PALE : GOLD, 0.55 - 0.08 * ay); ctx.lineWidth = 4 - 0.6 * ay;
        ctx.beginPath(); ctx.moveTo(-b.r * 0.7, i * b.r * 0.3); ctx.lineTo(-b.r * 0.7 - l, i * b.r * 0.3); ctx.stroke();
      }
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, b.r * 1.7); g.addColorStop(0, hexA(GOLD, 0.35)); g.addColorStop(1, hexA(GOLD, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, b.r * 1.7, 0, TAU); ctx.fill();
      ctx.restore();
    }
    if (b.state !== 'dead' && BD.hasStatus(b, 'draconicsurge') && !BD.hasStatus(b, 'hidden')) { // 龍雷灌注：腳下紅雷環，環上不時閃出電弧
      ctx.save(); ctx.translate(b.x, b.y); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const rr = b.r * 1.55;
      ctx.strokeStyle = hexA(GOLD, 0.35 + 0.15 * Math.sin(t * 6)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke();
      ctx.strokeStyle = hexA(PALE, 0.6); ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = t * 0.9 + i * TAU / 5, j = Math.sin(t * 23 + i * 3.1);
        ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); ctx.lineTo(Math.cos(a + 0.12) * (rr + 9 * j), Math.sin(a + 0.12) * (rr + 9 * j)); ctx.lineTo(Math.cos(a + 0.24) * rr, Math.sin(a + 0.24) * rr);
      }
      ctx.stroke(); ctx.restore();
    }
  }

  // ── 投射物：赤雷浪（鋸齒狀紅雷波 + 白芯 + 拖尾火花）──
  R.projStyles = R.projStyles || {};
  R.projStyles.redwave = function (ctx, p, t) {
    const k = p.r;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, k * 2.2);
    g.addColorStop(0, hexA(WHITE, 0.8)); g.addColorStop(0.4, hexA(GOLD, 0.5)); g.addColorStop(1, hexA(GOLD, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, k * 2.2, 0, TAU); ctx.fill();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [w, c, al] of [[k * 0.5, GOLD, 0.7], [k * 0.18, WHITE, 0.95]]) { // 垂直於前進方向的鋸齒雷弧，兩層
      ctx.strokeStyle = hexA(c, al); ctx.lineWidth = w; ctx.beginPath();
      for (let i = -4; i <= 4; i++) { const x = Math.abs(i) * -k * 0.28 + Math.sin(t * 40 + i * 2.3) * k * 0.12, y = i * k * 0.3; if (i === -4) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.fillStyle = hexA(PALE, 0.7);
    for (let i = 0; i < 6; i++) { const x = -k * (1.4 + i * 0.8), y = Math.sin(t * 22 + i * 1.7) * k * 0.7; ctx.beginPath(); ctx.arc(x, y, 2.4 - i * 0.25, 0, TAU); ctx.fill(); }
    ctx.restore();
  };

  R.defineBossStyle('draconictreesentinel', { body, under });
})(typeof window !== 'undefined' ? window : globalThis);
