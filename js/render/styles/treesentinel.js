'use strict';
// Boss 造型：大樹守衛（依官方畫冊設計稿與遊戲內模型，俯視）：
//   戰馬——頭到蹄披滿雕花黃金馬鎧，額前一根金角、眼罩是兩個打孔的圓杯，鎧甲底下垂著一圈紫黑色羽葉裙甲，露出紅褐色的腿；
//   騎士——金色雕花板甲、頭盔頂一大叢乾草般的淡金羽飾、暗赭色披風上繡白色黃金樹紋；
//   右手黃金戟（扭紋長刺、鏤空斧刃、八角柄頭，平時扛在肩上往後斜），左手圓形黃金樹大盾（纏著灰褐色樹根、中央圓章）。
// 逐招動畫：依動作種類與技能挑「蓄力 → 擊」關鍵值姿態，驅動戟角、伸手、人立（前半身抬起放大）、舉盾、前衝、扭身與戟上金光；
//   移動時四蹄交替奔馳、尾巴與披風隨速度飄起。二階段戟身常駐金光。
// under()：黃金的返報的金色盾壁、黃金誓言的腳下金環；hidden()：大盾碾壓躍在半空（落點巨影 + 放大的人馬）；R.projStyles.goldbeam：返報光束。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  const TAU = U.TAU, PI = Math.PI;
  const WHITE = '#ffffff', PALE = '#fff6d0', GOLD = '#ffd34d', GILT = '#c9a24a', GILT_D = '#7a5a22', GILT_L = '#f0d890';
  const SKIRT = '#2e2833', SKIRT_L = '#5a4d66', LEG = '#7a3a2a', HOOF = '#2a1a12', CAPE = '#6b5426', ROOT = '#6e665a', PLUME = '#cfc27a';
  const TRIG = { hit: 1, dash: 1, windwall: 1, status: 1, erupt: 1 };
  const ease = (u) => 1 - (1 - u) * (1 - u);
  const lerp = (a, b, u) => a + (b - a) * u;

  // 姿態：ang 戟身方向（相對面向）、ext 持戟手前伸、up 高舉過頂（戟身縮短示意朝上）、rear 戰馬人立、sh 舉盾、fwd 前衝、spin 扭身、gl 戟上金光
  const DEF = { ang: 2.55, ext: 0.1, up: 0, rear: 0, sh: 0, fwd: 0, spin: 0, gl: 0 };
  const KEYS = Object.keys(DEF);
  // key: [蓄滿, 擊]
  const SWING = [ // 側揮：由右後往左前掃、第二下反手掃回
    { ang: [2.3, -0.7], ext: [0.2, 0.9], spin: [0.35, -0.3], gl: [0.4, 1] },
    { ang: [-0.9, 1.9], ext: [0.3, 0.9], spin: [-0.3, 0.35], gl: [0.4, 1] }];
  const STAB = { ang: [0.15, 0], ext: [-0.4, 1.25], rear: [0.7, 0.15], fwd: [-0.1, 0.3], gl: [0.6, 1] };
  const SLAM = { ang: [0, 0], ext: [0.4, 1.1], up: [1, 0], rear: [1, -0.1], fwd: [-0.12, 0.25], gl: [1, 1] };
  const STOMP = { rear: [1, -0.25], fwd: [-0.05, 0.25], ang: [2.4, 2.2] };
  const BASH = { spin: [-0.45, 0.7], fwd: [0, 0.15], ang: [2.6, 2.3] };
  const TWIRL = { ang: [-2.2, 3.7], ext: [0.3, 1.1], rear: [0.8, 0.1], spin: [-0.5, 0.7], gl: [0.8, 1] };
  const BACKSWING = { ang: [1.2, 3.6], ext: [0.3, 1], spin: [0.4, 0.9], gl: [0.5, 1] };
  const DASH = { ang: [0.25, 0.08], ext: [0.6, 1.1], fwd: [-0.12, 0.35], gl: [0.5, 0.9] }; // 戟夾腋下平舉，像騎槍衝鋒
  const WALL = { sh: [1, 1], fwd: [0, 0.08], ang: [2.6, 2.6], gl: [0, 0] };
  const SHIELDBASH = { sh: [0.8, 1], spin: [0.35, -0.45], fwd: [-0.12, 0.35], ang: [2.6, 2.4] };
  const CRUSH = { sh: [1, 1], rear: [1, -0.2], fwd: [0, 0.2], ang: [2.6, 2.6] };
  const VOW = { up: [1, 1], rear: [0.6, 0.5], gl: [1, 1], ext: [0.4, 0.5], ang: [0, 0] };

  function pick(e, sid) {
    const a = e.a;
    switch (a.do) {
      case 'dash': return DASH;
      case 'windwall': return WALL;
      case 'status': case 'erupt': return VOW;
      default:
        if (sid === 'golden_vow') return VOW;
        if (sid === 'hoof_stomp') return STOMP;
        if (sid === 'horse_bash') return BASH;
        if (sid === 'twirl_swing') return TWIRL;
        if (sid === 'shield_crush' || (sid === 'ult' && a.anchor === 'mark')) return CRUSH;
        if (a.fx && a.fx.id === 'guardbash') return SHIELDBASH;
        if (a.angOff === Math.PI) return BACKSWING;
        if (a.shape === 'rect') return STAB;
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
    R.blit(ctx, 'body:ts:horse:' + r + ':' + (shade ? 's' : 'b'), r * 3.0 + 16, r * 1.8 + 16, r * 1.5 + 8, r * 0.9 + 8, (g) => {
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
    R.blit(ctx, 'body:ts:head:' + r + ':' + (shade ? 's' : 'b'), r * 1.6 + 10, r * 0.9 + 10, r * 0.25 + 5, r * 0.45 + 5, (g) => {
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
  // 黃金樹大盾：圓盾、外緣金邊、灰褐樹根纏繞、中央圓章
  function shield(ctx, r, shade, glow) {
    const sr = r * 0.64;
    if (glow > 0.02 && !shade) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, 0, sr * 0.3, 0, 0, sr * 1.8);
      g.addColorStop(0, hexA(GOLD, 0.55 * glow)); g.addColorStop(1, hexA(GOLD, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, sr * 1.8, 0, TAU); ctx.fill(); ctx.restore();
    }
    R.blit(ctx, 'body:ts:shield:' + r + ':' + (shade ? 's' : 'b'), sr * 2 + 12, sr * 2 + 12, sr + 6, sr + 6, (g) => {
      const gr = g.createRadialGradient(-sr * 0.3, -sr * 0.3, 2, 0, 0, sr);
      gr.addColorStop(0, C(shade, '#fff0b0')); gr.addColorStop(0.6, C(shade, GILT)); gr.addColorStop(1, C(shade, GILT_D));
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, sr, 0, TAU); g.fill();
      g.strokeStyle = shade ? GOLD : '#5a3e14'; g.lineWidth = 2.5; g.stroke();
      g.strokeStyle = C(shade, '#e8c868'); g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, sr * 0.86, 0, TAU); g.stroke();
      if (shade) return;
      for (let i = 0; i < 8; i++) filigree(g, Math.cos(i * 0.785) * sr * 0.62, Math.sin(i * 0.785) * sr * 0.62, sr * 0.09, 'rgba(110,74,20,0.7)');
      g.strokeStyle = ROOT; g.lineCap = 'round'; // 樹根：從盾緣往中心彎曲爬入
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9 + 0.3; g.lineWidth = 2.6 - (i % 3) * 0.5;
        g.beginPath(); g.moveTo(Math.cos(a) * sr * 1.02, Math.sin(a) * sr * 1.02);
        g.bezierCurveTo(Math.cos(a + 0.5) * sr * 0.8, Math.sin(a + 0.5) * sr * 0.8, Math.cos(a - 0.4) * sr * 0.55, Math.sin(a - 0.4) * sr * 0.55, Math.cos(a + 0.2) * sr * 0.32, Math.sin(a + 0.2) * sr * 0.32); g.stroke();
      }
      g.fillStyle = '#b8903a'; g.strokeStyle = '#5a3e14'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, sr * 0.3, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,240,190,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, sr * 0.2); g.lineTo(0, -sr * 0.18); g.moveTo(0, -sr * 0.02); g.lineTo(-sr * 0.12, -sr * 0.15); g.moveTo(0, -sr * 0.02); g.lineTo(sr * 0.12, -sr * 0.15); g.stroke(); // 圓章上的小黃金樹
    });
  }
  // 黃金戟：扭紋長刺 + 鏤空斧刃（刃朝右外側）+ 八角柄頭；len 為柄長
  function halberd(ctx, len, r, shade, glow) {
    const W = r * 0.07;
    if (glow > 0.05 && !shade) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      ctx.strokeStyle = hexA(GOLD, 0.2 + 0.4 * glow); ctx.lineWidth = 10 + 10 * glow; ctx.beginPath(); ctx.moveTo(len * 0.55, 0); ctx.lineTo(len * 1.2, 0); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = C(shade, '#a8823a'); ctx.fillRect(-len * 0.28, -W, len * 1.2, W * 2); // 柄
    if (!shade) { ctx.strokeStyle = '#6a4a1a'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 12; i++) { const x = -len * 0.28 + i * len * 0.1; ctx.moveTo(x, -W); ctx.lineTo(x + 4, W); } ctx.stroke(); }
    ctx.fillStyle = C(shade, GILT); ctx.beginPath(); // 八角柄頭
    for (let i = 0; i < 8; i++) { const a = i * PI / 4 + PI / 8; ctx.lineTo(-len * 0.3 + Math.cos(a) * W * 2.4, Math.sin(a) * W * 2.4); }
    ctx.closePath(); ctx.fill();
    const hx = len * 0.92;
    ctx.fillStyle = C(shade, GILT_L); ctx.strokeStyle = shade ? GOLD : '#5a3e14'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(hx, W); ctx.quadraticCurveTo(hx - r * 0.15, r * 0.35, hx - r * 0.3, r * 0.62); ctx.lineTo(hx + r * 0.08, r * 0.4); // 斧刃
    ctx.quadraticCurveTo(hx + r * 0.25, r * 0.55, hx + r * 0.32, r * 0.62); ctx.quadraticCurveTo(hx + r * 0.3, r * 0.3, hx + r * 0.18, W); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx - r * 0.05, -W); ctx.quadraticCurveTo(hx - r * 0.2, -r * 0.3, hx - r * 0.05, -r * 0.4); ctx.lineTo(hx + r * 0.12, -W); ctx.closePath(); ctx.fill(); ctx.stroke(); // 背鉤
    if (!shade) { ctx.fillStyle = '#5a3e14'; ctx.beginPath(); ctx.ellipse(hx + r * 0.02, r * 0.38, r * 0.06, r * 0.1, 0.4, 0, TAU); ctx.fill(); } // 鏤空
    ctx.fillStyle = C(shade, GILT_L); ctx.beginPath(); ctx.moveTo(hx + r * 0.15, -W * 1.2); ctx.lineTo(len * 1.25, 0); ctx.lineTo(hx + r * 0.15, W * 1.2); ctx.closePath(); ctx.fill(); ctx.stroke(); // 長刺
    if (!shade) { ctx.strokeStyle = '#7a5a22'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 5; i++) { const x = hx + r * 0.2 + i * (len * 1.25 - hx - r * 0.2) / 6; ctx.moveTo(x, -W); ctx.lineTo(x + 5, W); } ctx.stroke(); } // 扭紋
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
    R.blit(ctx, 'body:ts:rider:' + r + ':' + (shade ? 's' : 'b'), r * 1.2 + 10, r * 1.2 + 10, r * 0.6 + 5, r * 0.6 + 5, (g) => {
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
    const rear = Math.max(0, A.rear), gl = Math.max(A.gl, p2 ? 0.6 : 0);

    ctx.save();
    ctx.translate(A.fwd * r, 0); if (A.spin) ctx.rotate(A.spin);
    // 地面金光：戟揮動時沿戟尖畫一道金色弧光（在人馬底下）
    const len = r * 2.2, hx = r * (0.15 + 0.45 * A.ext), hy = r * 0.42;
    if (ARC > 0 && !shade) {
      ctx.save(); ctx.translate(hx, hy); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const a0 = Math.min(ARC0, ARC1), a1 = Math.max(ARC0, ARC1);
      ctx.strokeStyle = hexA(GOLD, 0.45 * ARC); ctx.lineWidth = r * 0.35; ctx.beginPath(); ctx.arc(0, 0, len * 1.15, a0, a1); ctx.stroke();
      ctx.strokeStyle = hexA(WHITE, 0.85 * ARC); ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }
    // 人立：前半身抬起——整體放大、往前推一點（影子由引擎畫在原地）
    const lift = 1 + 0.16 * rear;
    if (rear > 0) { ctx.translate(r * 0.25 * rear, 0); ctx.scale(lift, lift); }
    legs(ctx, r, Math.max(run, rear * 0.4), ph, rear, shade);
    tail(ctx, r, sway, run, shade);
    barding(ctx, r, shade);
    // 頸與頭：人立時頭抬得更高（再放大）
    ctx.save(); ctx.translate(r * 0.95, 0);
    if (rear > 0) { ctx.translate(r * 0.2 * rear, 0); ctx.scale(1 + 0.22 * rear, 1 + 0.22 * rear); }
    ctx.rotate(Math.sin(ph) * 0.06 * run);
    ctx.fillStyle = C(shade, GILT_D); ctx.beginPath(); ctx.ellipse(r * 0.15, 0, r * 0.38, r * 0.28, 0, 0, TAU); ctx.fill(); // 頸
    ctx.translate(r * 0.38, 0); head(ctx, r, shade);
    ctx.restore();
    // 黃金樹大盾（左側；舉盾時移到正前方、發金光）
    ctx.save();
    ctx.translate(lerp(r * 0.0, r * 0.75, A.sh), lerp(-r * 0.72, -r * 0.25, A.sh));
    ctx.rotate(lerp(0, 0.5, A.sh));
    const sg = A.sh * (0.6 + 0.4 * Math.sin(t * 14));
    shield(ctx, r, shade, sid === 'golden_retaliation' ? Math.max(sg, 0.6 * A.sh) : sg * 0.6);
    ctx.restore();
    rider(ctx, r, shade, sway, run);
    // 右臂 + 黃金戟（高舉時戟身縮短，表示朝上）
    ctx.strokeStyle = C(shade, GILT); ctx.lineWidth = r * 0.16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, r * 0.36); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(A.ang);
    const fl = 1 - 0.62 * U.clamp(A.up, 0, 1);
    ctx.scale(fl, 1);
    halberd(ctx, len, r, shade, gl);
    ctx.restore();
    if (A.up > 0.5 && gl > 0.5 && !shade) { // 高舉時戟頭上方的金色光點
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const tx = hx + Math.cos(A.ang) * len * 1.2 * fl, ty = hy + Math.sin(A.ang) * len * 1.2 * fl;
      const g = ctx.createRadialGradient(tx, ty, 1, tx, ty, r * 0.8);
      g.addColorStop(0, hexA(WHITE, 0.9)); g.addColorStop(0.4, hexA(GOLD, 0.5)); g.addColorStop(1, hexA(GOLD, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, ty, r * 0.8, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    if (w && w.time != null && BD.hasStatus && o.statuses && BD.hasStatus(o, 'goldenvow') && !shade) { // 黃金誓言：身上繞著升起的金色光點
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = hexA(GOLD, 0.8);
      for (let i = 0; i < 10; i++) { const a = t * 1.5 + i * 0.628, rr = r * (1.1 + 0.25 * Math.sin(t * 3 + i)); ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 2.2, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }

  // ── 地面：黃金的返報的盾壁、黃金誓言的金環 ──
  function under(ctx, b, t) {
    const w = b.world;
    if (w && w.walls) for (const wl of w.walls) {
      if (wl.owner !== b) continue;
      const left = wl.until - w.time; if (left <= 0) continue;
      const a = Math.min(1, (w.time - wl.t0) / 0.1, left / 0.25), [cx, cy] = BD.wallPos(wl, w.time), hw = wl.w / 2;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(wl.ang); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= a;
      const g = ctx.createLinearGradient(-30, 0, 30, 0);
      g.addColorStop(0, hexA(GOLD, 0)); g.addColorStop(0.5, hexA(GOLD, wl.used ? 0.25 : 0.45)); g.addColorStop(1, hexA(GOLD, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 30, hw, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = hexA(PALE, 0.85); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 12, hw, 0, -PI / 2, PI / 2); ctx.stroke();
      ctx.strokeStyle = hexA(GOLD, 0.6); ctx.lineWidth = 1.5; // 沿壁面流動的根紋
      for (let i = 0; i < 6; i++) { const s = -hw + (i + 0.5) * wl.w / 6, p = t * 4 + i; ctx.beginPath(); ctx.moveTo(4, s); ctx.quadraticCurveTo(14 + Math.sin(p) * 6, s + 10, 6, s + 22); ctx.stroke(); }
      ctx.restore();
    }
    if (b.state !== 'dead' && BD.hasStatus(b, 'goldenvow') && !BD.hasStatus(b, 'hidden')) {
      ctx.save(); ctx.translate(b.x, b.y); ctx.globalCompositeOperation = 'lighter';
      const rr = b.r * 1.55;
      ctx.strokeStyle = hexA(GOLD, 0.35 + 0.15 * Math.sin(t * 5)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke();
      ctx.strokeStyle = hexA(PALE, 0.5); ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) { const a = t * 0.8 + i * TAU / 6; ctx.beginPath(); ctx.arc(0, 0, rr + 8, a, a + 0.5); ctx.stroke(); }
      ctx.restore();
    }
  }

  // 大盾碾壓 / 大招躍起時：落點巨影越落越濃，人馬放大在半空（從起跳點飛向落點）
  const TB = { x: 0, y: 0, face: 0, r: 0, def: null, phase: 1, state: 'skill', inst: null, world: null, vx: 0, vy: 0 };
  function hidden(ctx, b, t) {
    const inst = b.inst, m = inst && inst.marks && inst.marks.crushSpot;
    if (!m) return;
    const land = inst.v.actions.find((a) => a.do === 'land'), hide = inst.v.actions.find((a) => a.do === 'hide');
    if (!land || !hide) return;
    const u = U.clamp((inst.t - hide.at) / (land.at - hide.at), 0, 1);
    ctx.save();
    ctx.fillStyle = hexA('#1a1004', 0.15 + 0.4 * u); ctx.beginPath(); ctx.ellipse(m.x, m.y, b.r * (1.2 + 1.2 * u), b.r * (0.8 + 0.8 * u), 0, 0, TAU); ctx.fill();
    ctx.restore();
    const x = lerp(b.x, m.x, ease(u)), y = lerp(b.y, m.y, ease(u)) - Math.sin(PI * u) * 160, s = 1 + 0.45 * Math.sin(PI * u);
    Object.assign(TB, { x, y, face: U.angTo(b, m), r: b.r, def: b.def, phase: b.phase, inst, world: b.world });
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y);
    R.drawBossBody(ctx, TB, t);
    ctx.restore();
  }

  // ── 投射物：黃金的返報光束（金色長梭形光矛 + 白芯 + 拖尾光點）──
  R.projStyles = R.projStyles || {};
  R.projStyles.goldbeam = function (ctx, p, t) {
    const k = p.r;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, k * 2.4);
    g.addColorStop(0, hexA(WHITE, 0.8)); g.addColorStop(0.4, hexA(GOLD, 0.45)); g.addColorStop(1, hexA(GOLD, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, k * 2.4, 0, TAU); ctx.fill();
    ctx.fillStyle = hexA(GOLD, 0.7); ctx.beginPath(); ctx.ellipse(-k * 1.2, 0, k * 2.6, k * 0.55, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = hexA(WHITE, 0.95); ctx.beginPath(); ctx.ellipse(-k * 0.6, 0, k * 1.6, k * 0.25, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = hexA(PALE, 0.7);
    for (let i = 0; i < 5; i++) { const x = -k * (2 + i * 0.9), y = Math.sin(t * 20 + i * 1.7) * k * 0.5; ctx.beginPath(); ctx.arc(x, y, 2.4 - i * 0.3, 0, TAU); ctx.fill(); }
    ctx.restore();
  };

  R.defineBossStyle('treesentinel', { body, under, hidden });
})(typeof window !== 'undefined' ? window : globalThis);
