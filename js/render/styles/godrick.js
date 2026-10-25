'use strict';
// Boss 造型：「接肢」葛瑞克（依官方設定稿兩張、遊戲模型與圖鑑，俯視）：
//   前傾的巨大身軀披綠色斗篷（金色寬邊、長流蘇、銀色結紋），腰間一條金色長布帶斜過身體；白色亂髮夾細辮、額上一圈金冠；
//   背後與肩上接著一叢別人的手臂（各自抓動、出招時一起張開，其中一隻握著錘矛），左側一隻格外巨大的手臂；
//   右手刻著葛孚雷獅紋的黃金雙刃戰斧。二階段左臂換成龍頭（暗紫紅的肉、黑鱗、尖刺），嘴裡常駐火光，噴火時張大嘴。
// 逐招動畫：依動作種類與技能挑「蓄力 → 擊」關鍵值姿態（斧角度、伸手、高舉、左臂角度 / 前伸 / 高舉、張嘴、前撲、扭身、蹲伏、背臂張開）；
//   喚風整個人掄斧旋轉；龍息的龍頭跟著每一格扇形轉。transition()：斷臂接龍過場；hidden()：躍起在半空。
//   R.projStyles.stormblade：彎月形風刃（二階段火風）；R.lobStyles.firerock：燃燒的火岩。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  const TAU = U.TAU, PI = Math.PI;
  const WHITE = '#ffffff', PALE = '#fff6d0', GOLD = '#ffcf4a', GOLD_D = '#a07a2a', FLAME = '#ff7a1a', FLAME_L = '#ffd27a', BLOOD = '#b0102a';
  const CLOAK = '#3e5a3c', CLOAK_L = '#5f7d56', CLOAK_D = '#1e2c1c', TRIM = '#c9a24a', TRIM_D = '#6e5426';
  const HAIR = '#e6e2d8', HAIR_D = '#a8a49a', SKIN = '#c8b8a8', ARMS = ['#a08878', '#8a7466', '#b49a88', '#7a6458', '#9a8070', '#a89080'];
  const AXE = '#c8a050', AXE_L = '#ead9a0', AXE_D = '#6e5426', DRAGON = '#6a2a40', DRAGON_L = '#9a4a5e', SCALE = '#2a1a22';
  const TRIG = { hit: 1, dash: 1, proj: 1, lob: 1, rain: 1, erupt: 1 };
  const ease = (u) => 1 - (1 - u) * (1 - u);
  const lerp = (a, b, u) => a + (b - a) * u;
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }; // 固定的偽亂數（快取圖用，不碰戰鬥亂數）

  // 姿態：aa 斧方向（相對面向）、ae 持斧手前伸、up 高舉過頂、la 左臂方向、le 左臂前伸、ll 左臂高舉、jaw 龍嘴張開、fwd 前撲、spin 扭身、cr 蹲伏、arms 背臂張開
  const DEF = { aa: 0.7, ae: 0.25, up: 0, la: -0.6, le: 0.3, ll: 0, jaw: 0.15, fwd: 0, spin: 0, cr: 0, arms: 0.2 };
  const KEYS = Object.keys(DEF);
  // key: [蓄滿, 擊]
  const AXE_SWING = [ // 戰斧大弧橫掃：右後往左前、再反手掃回
    { aa: [2.0, -1.0], ae: [0.4, 1.1], spin: [0.4, -0.35], arms: [0.6, 0.9] },
    { aa: [-1.1, 1.7], ae: [0.4, 1.1], spin: [-0.35, 0.4], arms: [0.6, 0.9] }];
  const KNEEL = { aa: [0, 0], ae: [0.2, 1.15], up: [1, 0], fwd: [-0.2, 0.35], cr: [-0.15, 0.35], arms: [1, 0.6] }; // 斧拉到胸前 → 捶地
  const POUND = { la: [-1.5, -0.25], le: [0.2, 1.4], ll: [1, 0], fwd: [-0.1, 0.3], cr: [0, 0.2], arms: [0.8, 0.9] }; // 巨臂捶地
  const BITE = { la: [-1.0, -0.3], le: [0, 1.3], jaw: [1, 0.15], fwd: [-0.1, 0.3] }; // 龍頭咬
  const STORM = { aa: [1.6, 1.6], ae: [1, 1], up: [0.5, 0.5], la: [-1.4, -1.4], le: [0.9, 0.9], arms: [1, 1] }; // 掄斧旋轉（body 依時間轉）
  const ROLL = { cr: [0.6, 0.5], arms: [0.1, 0.1], ae: [0.1, 0.1], aa: [1.2, 1.2] };
  const SLAM = { aa: [0, 0], up: [1, 0], ae: [0.5, 1.2], ll: [0.6, 0], fwd: [-0.2, 0.4], cr: [-0.15, 0.35], arms: [1, 0.7] };
  const DRAG = { aa: [1.1, 1.1], ae: [0.7, 0.7], cr: [0.25, 0.25], fwd: [0.2, 0.2], arms: [0.5, 0.5] };
  const UPSLASH = { aa: [1.2, -0.2], ae: [0.6, 1.25], up: [0, 0.5], fwd: [0, 0.35], arms: [0.5, 1] };
  const FLING = { aa: [0.4, -0.5], ae: [1.0, 1.35], cr: [0.4, 0.1], fwd: [0.1, 0.3], arms: [0.6, 0.9] };
  const LUNGE = { la: [-0.4, 0], le: [-0.2, 1.7], jaw: [1, 0], fwd: [-0.15, 0.45], arms: [0.5, 0.9] };
  const HOLD = { la: [0, 0], le: [1.3, 1.3], ll: [0.7, 0.7], jaw: [0.4, 0.95], arms: [0.9, 0.9] };
  const DSLAM = { la: [0, 0], ll: [1, 0], le: [1.2, 1.35], fwd: [-0.1, 0.4], cr: [-0.1, 0.3], jaw: [0.3, 0.8] };
  const UPPER = { la: [0.5, -0.2], ll: [0, 1], le: [1.2, 1.1], jaw: [0.5, 1], arms: [0.7, 1] };
  const RAISE = { ll: [1, 1], la: [-0.4, -0.4], le: [0.8, 0.8], jaw: [1, 1], arms: [1, 1] };
  const DYN = new WeakMap(); // 依動作角度產生的姿態（龍頭跟著扇形 / 拖地繞圈）
  function aimed(a, le, jaw, cr) {
    let e = DYN.get(a);
    if (!e) { const ao = a.angOff || 0; e = { la: [ao - 0.3, ao], le: [le * 0.7, le], jaw: [jaw * 0.6, jaw], cr: [cr, cr], fwd: [0, 0.12], arms: [0.6, 0.8] }; DYN.set(a, e); }
    return e;
  }
  function pick(e, sid) {
    const a = e.a, fid = a.fx && (a.fx.id || a.fx);
    if (a.do === 'proj') return FLING;
    if (a.do === 'rain' || a.do === 'lob') return RAISE;
    if (a.do === 'erupt') return aimed(a, 1.4, 0.9, 0.3);
    if (a.do === 'dash') return a.dir === 'side' ? ROLL : sid === 'drag_slash' ? DRAG : DRAG;
    if (fid === 'stormcall') return STORM;
    if (a.anchor === 'mark') return SLAM;
    if (fid === 'flamethrow') return a.shape === 'circle' ? HOLD : aimed(a, 1.15, 1, 0);
    if (fid === 'dragonbite') return a.shape === 'rect' ? LUNGE : BITE;
    if (fid === 'burst') return DSLAM;
    if (fid === 'erupt') return aimed(a, 1.4, 0.6, 0.35);
    if (fid === 'bearwitness') return UPPER;
    if (fid === 'kneelquake') return KNEEL;
    if (fid === 'axegrind') return UPSLASH;
    if (fid === 'slam') return POUND;
    return AXE_SWING[e.hi & 1];
  }

  // ── 姿態混合（同瑪爾基特：下一手蓄力、上一手收勢）──
  const A = Object.assign({}, DEF), B = {};
  const P = { le: null, ne: null, wd: 0, sn: 0 };
  const CACHE = new WeakMap(), STORMS = new WeakMap();
  function trigs(v) {
    let c = CACHE.get(v.actions);
    if (!c) {
      c = []; let hn = 0;
      for (const a of v.actions) if (TRIG[a.do] && !(a.do === 'hit' && a.shape === 'ring')) c.push({ a, hi: a.do === 'hit' ? hn++ : -1 });
      c.sort((x, y) => x.a.at - y.a.at);
      CACHE.set(v.actions, c);
    }
    return c;
  }
  function pace(inst) {
    const c = trigs(inst.v), t = inst.t; let L = -1, N = -1;
    for (let i = 0; i < c.length; i++) { if (c[i].a.at <= t) L = i; else { N = i; break; } }
    P.le = L >= 0 ? c[L] : null; P.ne = N >= 0 ? c[N] : null;
    const endL = L >= 0 ? c[L].a.at : 0, since = L >= 0 ? t - endL : 0;
    P.sn = L >= 0 && since < 0.3 ? 1 - since / 0.3 : 0;
    P.wd = N >= 0 ? U.clamp((t - endL) / Math.max(0.05, c[N].a.at - endL), 0, 1) : 0;
  }
  function ev(O, e, mode, a, b) {
    for (const k of KEYS) {
      const x = e[k];
      if (!x) { O[k] = DEF[k]; continue; }
      O[k] = mode === 'snap' ? lerp(DEF[k], x[1], a) : b > 0 ? lerp(x[0], x[1], b) : lerp(DEF[k], x[0], a);
    }
  }
  let ARC = 0, ARC0 = 0, ARC1 = 0; // 本幀戰斧掃過的弧
  function arcOf(e, sw, cur) { if (e.aa && Math.abs(e.aa[1] - e.aa[0]) > 0.8) { ARC = sw; ARC0 = e.aa[0]; ARC1 = cur ? A.aa : e.aa[1]; } }
  function build(sid) {
    const eN = P.ne && pick(P.ne, sid), eL = P.le && pick(P.le, sid);
    ARC = 0;
    if (eN) {
      const sw = P.wd < 0.72 ? 0 : ease((P.wd - 0.72) / 0.28);
      ev(A, eN, 'wind', ease(Math.min(1, P.wd / 0.65)), sw);
      if (sw > 0.05) arcOf(eN, sw, true);
      if (eL && P.sn > 0) { ev(B, eL, 'snap', P.sn); for (const k of KEYS) A[k] = lerp(A[k], B[k], P.sn); }
    } else if (eL) ev(A, eL, 'snap', P.sn);
    if (!ARC && eL && P.sn > 0) arcOf(eL, P.sn, false);
  }

  // ── 部件（本地座標：+x 為面向、+y 為右側）──
  const C = (shade, col) => (shade ? '#0a0806' : col);
  // 綠色斗篷：金色寬邊、外緣流蘇、銀色結紋與獸紋、腰間金色長布帶斜過身體
  function cloak(ctx, r, shade) {
    R.blit(ctx, 'body:gd:cloak:' + r + ':' + (shade ? 's' : 'b'), r * 2.8 + 20, r * 2.6 + 20, r * 1.5 + 10, r * 1.3 + 10, (g) => {
      const edge = (k) => { g.beginPath(); for (let i = 0; i <= 48; i++) { const an = i / 48 * TAU, back = Math.max(0, -Math.cos(an)); g.lineTo(Math.cos(an) * r * (1.12 + back * 0.12) * k - r * 0.15, Math.sin(an) * r * (1.0 + back * 0.08) * k * (1 + (hash(i) - 0.5) * 0.04)); } g.closePath(); };
      if (!shade) { // 流蘇：外緣一圈短金線
        g.strokeStyle = TRIM_D; g.lineWidth = 1.4; g.beginPath();
        for (let i = 0; i < 70; i++) { const an = i / 70 * TAU, back = Math.max(0, -Math.cos(an)), rx = r * (1.12 + back * 0.12), ry = r * (1.0 + back * 0.08), x = Math.cos(an) * rx - r * 0.15, y = Math.sin(an) * ry, l = r * (0.08 + 0.06 * hash(i + 3)); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l); }
        g.stroke();
      }
      edge(1);
      const gr = g.createRadialGradient(r * 0.15, -r * 0.2, 2, -r * 0.1, 0, r * 1.15);
      gr.addColorStop(0, C(shade, CLOAK_L)); gr.addColorStop(0.6, C(shade, CLOAK)); gr.addColorStop(1, C(shade, CLOAK_D));
      g.fillStyle = gr; g.fill(); g.strokeStyle = shade ? GOLD : '#141c12'; g.lineWidth = 1.3; g.stroke();
      if (shade) return;
      g.strokeStyle = C(shade, TRIM); g.lineWidth = r * 0.1; edge(0.94); g.stroke(); // 金色寬邊
      g.strokeStyle = 'rgba(255,230,150,0.5)'; g.lineWidth = 1; edge(0.97); g.stroke();
      g.strokeStyle = 'rgba(210,220,205,0.3)'; g.lineWidth = 1.1; g.beginPath(); // 銀色凱爾特結紋：漩渦 + 交織線
      for (let i = 0; i < 5; i++) { const cx = -r * (0.2 + 0.15 * i) , cy = (hash(i + 30) - 0.5) * r * 1.2, rr = r * (0.1 + 0.05 * hash(i)); for (let k = 0; k < 18; k++) { const an = k * 0.6, d = rr * k / 18; k ? g.lineTo(cx + Math.cos(an) * d, cy + Math.sin(an) * d) : g.moveTo(cx, cy); } }
      for (const s of [-1, 1]) { g.moveTo(r * 0.2, s * r * 0.75); for (let k = 0; k <= 12; k++) { const u = k / 12; g.lineTo(lerp(r * 0.2, -r * 1.1, u), s * r * (0.75 - 0.1 * u) + Math.sin(u * 14) * r * 0.05); } }
      g.stroke();
      g.strokeStyle = 'rgba(10,16,10,0.4)'; g.lineWidth = 1; g.beginPath(); // 褶皺
      for (let i = 0; i < 7; i++) { const y = (i / 6 - 0.5) * r * 1.6; g.moveTo(r * 0.1, y * 0.6); g.quadraticCurveTo(-r * 0.4, y, -r * 1.1, y * 1.1); }
      g.stroke();
      // 高立的金邊衣領（頭後方的厚弧）
      g.fillStyle = CLOAK_D; g.beginPath(); g.arc(r * 0.35, 0, r * 0.52, PI * 0.55, PI * 1.45); g.arc(r * 0.35, 0, r * 0.36, PI * 1.45, PI * 0.55, true); g.closePath(); g.fill();
      g.strokeStyle = TRIM; g.lineWidth = 2; g.stroke();
      // 金色長布帶：左肩斜到右腰、尾端垂下
      g.lineCap = 'butt';
      for (const [col, wd] of [[TRIM_D, r * 0.14], [TRIM, r * 0.1]]) { g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); g.moveTo(r * 0.3, -r * 0.75); g.quadraticCurveTo(r * 0.05, 0, -r * 0.35, r * 0.8); g.lineTo(-r * 0.95, r * 0.95); g.stroke(); }
      g.strokeStyle = 'rgba(110,84,38,0.8)'; g.lineWidth = 1; g.beginPath(); // 布帶上的結紋
      for (let i = 0; i < 9; i++) { const u = i / 8, x = lerp(r * 0.28, -r * 0.33, u) - u * u * r * 0.05, y = lerp(-r * 0.72, r * 0.78, u); g.moveTo(x - 3, y - 2); g.lineTo(x + 3, y + 2); g.moveTo(x + 3, y - 2); g.lineTo(x - 3, y + 2); }
      g.stroke();
    });
  }
  // 一隻接來的手臂：上臂 + 前臂（關節彎）+ 張開的手指；mace 為握著錘矛
  function graftArm(ctx, x0, y0, an, len, bend, open, col, wd, shade, mace) {
    const ex = x0 + Math.cos(an) * len * 0.5, ey = y0 + Math.sin(an) * len * 0.5, a2 = an + bend, hx = ex + Math.cos(a2) * len * 0.5, hy = ey + Math.sin(a2) * len * 0.5;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = C(shade, '#3a2a24'); ctx.lineWidth = wd * 1.35; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = C(shade, col); ctx.lineWidth = wd; ctx.stroke();
    if (shade) return;
    ctx.strokeStyle = 'rgba(200,170,120,0.55)'; ctx.lineWidth = wd * 0.3; ctx.beginPath(); ctx.moveTo(ex - Math.cos(an) * wd * 0.6, ey - Math.sin(an) * wd * 0.6); ctx.lineTo(ex + Math.cos(an) * wd * 0.2, ey + Math.sin(an) * wd * 0.2); ctx.stroke(); // 縫合的護腕
    ctx.strokeStyle = col; ctx.lineWidth = wd * 0.35; ctx.beginPath(); // 手指
    for (let f = 0; f < 4; f++) { const fa = a2 + (f - 1.5) * (0.25 + 0.35 * open), fl = wd * (1.1 + 0.4 * open); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(fa) * fl, hy + Math.sin(fa) * fl); }
    ctx.stroke();
    if (mace) { // 錘矛
      ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = wd * 0.35; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(a2 + 1.2) * len * 0.6, hy + Math.sin(a2 + 1.2) * len * 0.6); ctx.stroke();
      ctx.fillStyle = '#3a3430'; ctx.beginPath(); ctx.arc(hx + Math.cos(a2 + 1.2) * len * 0.6, hy + Math.sin(a2 + 1.2) * len * 0.6, wd * 0.7, 0, TAU); ctx.fill();
    }
  }
  // 背上的一叢手臂：從肩背往後、往兩側長出，各自抓動；spread 張開程度
  function backArms(ctx, r, t, spread, shade) {
    for (let i = 0; i < 6; i++) {
      const s = i < 3 ? -1 : 1, k = i % 3, base = PI - s * (0.25 + 0.33 * k), wob = Math.sin(t * (1.6 + 0.4 * k) + i * 1.7) * 0.18;
      const an = base + s * spread * (0.3 + 0.15 * k) + wob, x0 = -r * (0.45 - 0.08 * k), y0 = s * r * (0.18 + 0.16 * k);
      graftArm(ctx, x0, y0, an, r * (1.05 + 0.3 * hash(i + 4)) * (1 + 0.25 * spread), s * (0.6 - 0.4 * spread) + wob, spread, ARMS[i], r * (0.19 - 0.025 * k), shade, i === 4);
    }
  }
  // 頭：白色亂髮夾細辮、金冠、死白的臉
  function head(ctx, r, shade) {
    R.blit(ctx, 'body:gd:head:' + r + ':' + (shade ? 's' : 'b'), r * 1.4 + 10, r * 1.4 + 10, r * 0.7 + 5, r * 0.7 + 5, (g) => {
      g.fillStyle = C(shade, HAIR_D); g.beginPath(); g.ellipse(-r * 0.08, 0, r * 0.36, r * 0.32, 0, 0, TAU); g.fill();
      if (!shade) {
        g.lineCap = 'round';
        for (const [col, n, wd] of [[HAIR_D, 30, 2.4], [HAIR, 26, 1.5], ['#ffffff', 12, 0.9]]) { // 亂髮往後披散
          g.strokeStyle = col; g.lineWidth = wd; g.beginPath();
          for (let i = 0; i < n; i++) { const y0 = (hash(i + n) - 0.5) * r * 0.5, an = PI + (hash(i + 60 + n) - 0.5) * 1.9, l = r * (0.25 + 0.25 * hash(i + 70 + n)), x0 = r * 0.1 - Math.abs(y0) * 0.3; g.moveTo(x0, y0); g.quadraticCurveTo(x0 + Math.cos(an) * l * 0.5, y0 + Math.sin(an) * l * 0.5 + (hash(i) - 0.5) * r * 0.12, x0 + Math.cos(an) * l, y0 + Math.sin(an) * l); }
          g.stroke();
        }
        for (const s of [-1, 1]) { // 兩條細辮垂到肩上
          g.strokeStyle = HAIR_D; g.lineWidth = 3; g.beginPath(); g.moveTo(r * 0.05, s * r * 0.2); g.quadraticCurveTo(r * 0.1, s * r * 0.4, -r * 0.05, s * r * 0.55); g.stroke();
          g.strokeStyle = HAIR; g.lineWidth = 1; g.beginPath(); for (let k = 0; k < 5; k++) { const u = k / 5, x = lerp(r * 0.05, -r * 0.05, u) + r * 0.05 * Math.sin(u * PI), y = s * lerp(r * 0.2, r * 0.55, u); g.moveTo(x - 2, y - 2); g.lineTo(x + 2, y + 2); } g.stroke();
        }
      }
      g.fillStyle = C(shade, SKIN); g.beginPath(); g.ellipse(r * 0.17, 0, r * 0.12, r * 0.14, 0, 0, TAU); g.fill(); // 前額
      g.strokeStyle = C(shade, GOLD); g.lineWidth = r * 0.06; g.beginPath(); g.ellipse(r * 0.02, 0, r * 0.2, r * 0.22, 0, 0, TAU); g.stroke(); // 金冠
      if (!shade) {
        g.strokeStyle = GOLD_D; g.lineWidth = 1; g.stroke();
        g.fillStyle = PALE; for (let i = 0; i < 6; i++) { const an = i / 6 * TAU; g.beginPath(); g.arc(r * 0.02 + Math.cos(an) * r * 0.2, Math.sin(an) * r * 0.22, 1.6, 0, TAU); g.fill(); }
        g.fillStyle = '#2a1a14'; g.beginPath(); g.arc(r * 0.25, -r * 0.06, r * 0.025, 0, TAU); g.arc(r * 0.25, r * 0.06, r * 0.025, 0, TAU); g.fill(); // 眼窩
      }
    });
  }
  // 粗壯的手臂（持斧的右手 / 一階段巨大左臂）
  function limb(ctx, x0, y0, x1, y1, wd, col, shade) {
    const mx = (x0 + x1) / 2 + (y1 - y0) * 0.1, my = (y0 + y1) / 2 - (x1 - x0) * 0.1;
    ctx.lineCap = 'round';
    ctx.strokeStyle = C(shade, '#3a2a24'); ctx.lineWidth = wd * 1.3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
    ctx.strokeStyle = C(shade, col); ctx.lineWidth = wd; ctx.stroke();
    if (!shade) { ctx.strokeStyle = 'rgba(255,230,210,0.25)'; ctx.lineWidth = wd * 0.3; ctx.beginPath(); ctx.moveTo(x0, y0 - wd * 0.2); ctx.quadraticCurveTo(mx, my - wd * 0.2, x1, y1 - wd * 0.2); ctx.stroke(); }
  }
  // 巨大左手：張開的五指
  function bigHand(ctx, x, y, an, r, open, shade) {
    ctx.fillStyle = C(shade, ARMS[1]); ctx.beginPath(); ctx.arc(x, y, r * 0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = C(shade, ARMS[1]); ctx.lineCap = 'round'; ctx.lineWidth = r * 0.08; ctx.beginPath();
    for (let f = 0; f < 5; f++) { const fa = an + (f - 2) * (0.3 + 0.25 * open), fl = r * (0.3 + 0.12 * open); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(fa) * fl, y + Math.sin(fa) * fl); }
    ctx.stroke();
    if (!shade) { ctx.strokeStyle = '#1a1210'; ctx.lineWidth = 2; ctx.beginPath(); for (let f = 0; f < 5; f++) { const fa = an + (f - 2) * (0.3 + 0.25 * open), fl = r * (0.3 + 0.12 * open); ctx.moveTo(x + Math.cos(fa) * fl * 0.85, y + Math.sin(fa) * fl * 0.85); ctx.lineTo(x + Math.cos(fa) * fl * 1.05, y + Math.sin(fa) * fl * 1.05); } ctx.stroke(); } // 黑指甲
  }
  // 龍頭（從斷口往 +x 延伸）：暗紫紅的頸、黑鱗、尖刺、張合的顎、口中火光
  function dragonHead(ctx, r, jaw, t, shade, fire) {
    const L = r * 1.1;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = C(shade, '#3a1422'); ctx.lineWidth = r * 0.34; ctx.beginPath(); ctx.moveTo(-r * 0.15, 0); ctx.lineTo(L * 0.55, 0); ctx.stroke(); // 頸
    ctx.strokeStyle = C(shade, DRAGON); ctx.lineWidth = r * 0.26; ctx.stroke();
    if (!shade) { ctx.fillStyle = SCALE; for (let i = 0; i < 5; i++) { const x = lerp(-r * 0.05, L * 0.5, i / 4); ctx.beginPath(); ctx.moveTo(x - r * 0.08, -r * 0.1); ctx.lineTo(x + r * 0.03, -r * 0.24); ctx.lineTo(x + r * 0.06, -r * 0.08); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - r * 0.08, r * 0.1); ctx.lineTo(x + r * 0.03, r * 0.24); ctx.lineTo(x + r * 0.06, r * 0.08); ctx.closePath(); ctx.fill(); } } // 頸側尖刺
    const op = 0.12 + 0.42 * U.clamp(jaw, 0, 1);
    ctx.translate(L * 0.55, 0);
    for (const s of [-1, 1]) { // 上下顎
      ctx.save(); ctx.rotate(s * op);
      ctx.fillStyle = C(shade, s < 0 ? DRAGON_L : DRAGON); ctx.beginPath(); ctx.moveTo(0, -s * r * 0.02); ctx.lineTo(r * 0.62, s * r * 0.04); ctx.lineTo(r * 0.55, s * r * 0.14); ctx.lineTo(0, s * r * 0.2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C(shade, SCALE); ctx.lineWidth = 1.4; ctx.stroke();
      if (!shade) { ctx.fillStyle = '#f4ecd8'; for (let k = 0; k < 5; k++) { const x = r * (0.1 + 0.1 * k); ctx.beginPath(); ctx.moveTo(x, s * r * 0.03); ctx.lineTo(x + r * 0.03, -s * r * 0.04); ctx.lineTo(x + r * 0.06, s * r * 0.03); ctx.closePath(); ctx.fill(); } } // 獠牙
      ctx.restore();
    }
    if (!shade) {
      ctx.fillStyle = SCALE; ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.18); ctx.lineTo(-r * 0.35, -r * 0.34); ctx.lineTo(r * 0.05, -r * 0.1); ctx.closePath(); ctx.fill(); // 頭後的角
      ctx.beginPath(); ctx.moveTo(-r * 0.05, r * 0.18); ctx.lineTo(-r * 0.35, r * 0.34); ctx.lineTo(r * 0.05, r * 0.1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffb030'; ctx.beginPath(); ctx.arc(r * 0.12, -r * 0.14, r * 0.035, 0, TAU); ctx.arc(r * 0.12, r * 0.14, r * 0.035, 0, TAU); ctx.fill(); // 眼
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; // 口中的火光
      const f = (fire ? 0.6 : 0.25) + 0.15 * Math.sin(t * 13), gr = ctx.createRadialGradient(r * 0.3, 0, 1, r * 0.3, 0, r * (0.3 + 0.4 * jaw));
      gr.addColorStop(0, hexA(FLAME_L, f)); gr.addColorStop(1, hexA(FLAME, 0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(r * 0.3, 0, r * (0.3 + 0.4 * jaw), 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  // 黃金雙刃戰斧（從握處往 +x 延伸）：長金柄、兩片月牙斧刃、中央獅紋盾徽、斧頂方錘
  function axe(ctx, r, shade) {
    const len = r * 2.4;
    R.blit(ctx, 'body:gd:axe:' + r + ':' + (shade ? 's' : 'b'), len * 1.3 + 20, r * 1.6 + 20, len * 0.2 + 10, r * 0.8 + 10, (g) => {
      g.lineCap = 'round';
      g.strokeStyle = shade ? GOLD : '#2a1e10'; g.lineWidth = r * 0.12; g.beginPath(); g.moveTo(-len * 0.15, 0); g.lineTo(len, 0); g.stroke();
      g.strokeStyle = C(shade, AXE); g.lineWidth = r * 0.08; g.stroke(); // 柄
      const hx = len * 0.82;
      for (const s of [-1, 1]) { // 兩片月牙斧刃
        g.beginPath(); g.moveTo(hx - r * 0.2, s * r * 0.08); g.quadraticCurveTo(hx - r * 0.42, s * r * 0.5, hx - r * 0.34, s * r * 0.72);
        g.quadraticCurveTo(hx, s * r * 0.5, hx + r * 0.34, s * r * 0.72); g.quadraticCurveTo(hx + r * 0.42, s * r * 0.5, hx + r * 0.2, s * r * 0.08); g.closePath();
        const gr = g.createLinearGradient(hx, 0, hx, s * r * 0.72); gr.addColorStop(0, C(shade, AXE_D)); gr.addColorStop(0.6, C(shade, AXE)); gr.addColorStop(1, C(shade, AXE_L));
        g.fillStyle = gr; g.fill(); g.strokeStyle = shade ? GOLD : '#2a1e10'; g.lineWidth = 1.4; g.stroke();
        if (!shade) { g.strokeStyle = 'rgba(255,250,230,0.85)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx - r * 0.34, s * r * 0.72); g.quadraticCurveTo(hx, s * r * 0.5, hx + r * 0.34, s * r * 0.72); g.stroke(); } // 刃口
      }
      g.fillStyle = C(shade, AXE_D); g.beginPath(); g.moveTo(hx - r * 0.2, -r * 0.2); g.lineTo(hx + r * 0.2, -r * 0.2); g.lineTo(hx + r * 0.2, r * 0.1); g.lineTo(hx, r * 0.24); g.lineTo(hx - r * 0.2, r * 0.1); g.closePath(); g.fill(); // 盾徽
      if (!shade) {
        g.strokeStyle = GOLD; g.lineWidth = 1.2; g.stroke();
        g.strokeStyle = PALE; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 7; i++) { const an = -PI / 2 + (i / 6 - 0.5) * 2.4; g.moveTo(hx, -r * 0.02); g.lineTo(hx + Math.cos(an) * r * 0.13, -r * 0.02 + Math.sin(an) * r * 0.13); } g.stroke(); // 獅子鬃毛
      }
      g.fillStyle = C(shade, AXE); g.fillRect(hx + r * 0.22, -r * 0.13, r * 0.22, r * 0.26); // 斧頂方錘
      if (!shade) { g.fillStyle = '#e0b040'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(hx + r * 0.33, (i - 1) * r * 0.08, r * 0.03, 0, TAU); g.fill(); } }
    });
  }
  // 斷口：二階段轉場砍斷左臂後的血肉
  function stump(ctx, x, y, r, t) {
    ctx.fillStyle = '#5a0a18'; ctx.beginPath(); ctx.arc(x, y, r * 0.16, 0, TAU); ctx.fill();
    ctx.fillStyle = BLOOD; ctx.beginPath(); ctx.arc(x, y, r * 0.1, 0, TAU); ctx.fill();
    ctx.fillStyle = hexA(BLOOD, 0.8); for (let i = 0; i < 4; i++) { const an = -PI / 2 + i * 0.7 + t * 2, d = r * (0.2 + 0.1 * ((t * 3 + i) % 1)); ctx.beginPath(); ctx.arc(x + Math.cos(an) * d, y + Math.sin(an) * d, 2.2, 0, TAU); ctx.fill(); }
  }

  function body(ctx, o, t, { r }) {
    const shade = !!o.shade, w = o.world, trans = o.state === 'transition';
    const stag = o.state === 'stagger' || o.state === 'stun';
    const inst = !stag && o.inst && o.inst.skill && o.inst.v && o.inst.v.actions ? o.inst : null;
    const sid = inst ? inst.skill.id : '';
    for (const k of KEYS) A[k] = DEF[k];
    A.aa = DEF.aa + Math.sin(t * 1.4) * 0.05; A.jaw = DEF.jaw + Math.sin(t * 2.3) * 0.08;
    ARC = 0;
    let spinA = 0, fire = false;
    if (inst) {
      pace(inst); build(sid);
      const e = P.ne && (P.wd > 0.3 || !P.le) ? P.ne : P.le;
      fire = !!(e && e.a.fx && /flamethrow|bearwitness|burst|dragonbite|erupt/.test(e.a.fx.id || e.a.fx));
      let c = STORMS.get(inst.v.actions);
      if (!c) { c = trigs(inst.v).filter((x) => x.a.fx && (x.a.fx.id || x.a.fx) === 'stormcall'); STORMS.set(inst.v.actions, c); }
      if (c.length && inst.t > c[0].a.at - 0.35 && inst.t < c[c.length - 1].a.at + 0.12) spinA = (inst.t - c[0].a.at + 0.35) / 0.32 * TAU; // 喚風：掄斧旋轉
    }
    // 換階段：舉斧 → 砍斷左臂 → 龍頭飛來接上 → 朝天噴火
    let p2 = o.phase === 2, armGone = false, dragonK = 1;
    if (trans) {
      const u = U.clamp((o.stateT || 0) / (o.stateDur || 2.6), 0, 1);
      if (u < 0.1) { A.up = u / 0.1; A.aa = 0; A.ae = 0.4; A.arms = 0.8; }
      else if (u < 0.14) { A.up = 0; A.aa = -1.6; A.ae = 1.1; A.spin = -0.3; }
      else { A.aa = -1.2; A.ae = 0.6; A.arms = 0.9; }
      armGone = u >= 0.13 && u < 0.38; p2 = u >= 0.38; dragonK = p2 ? ease(Math.min(1, (u - 0.38) / 0.08)) : 1;
      if (u >= 0.62) { A.ll = 1; A.la = -0.3; A.le = 1; A.jaw = 1; fire = true; }
    }
    const spd = Math.hypot(o.vx || 0, o.vy || 0), run = U.clamp(spd / 220, 0, 1);
    const bob = Math.sin(t * (4 + 5 * run)) * 0.05 * run, lurch = Math.sin(t * (3 + 4 * run)) * 0.06 * run; // 兩條腿不一樣：走路一拐一拐
    const clawK = w && o._clawAt != null ? U.clamp(1 - (w.time - o._clawAt) / 0.35, 0, 1) : 0; // 被動追擊：背臂 / 龍頭探出

    ctx.save();
    ctx.translate((A.fwd + bob) * r, 0); ctx.rotate(A.spin + spinA + lurch);
    const cr = 1 - 0.1 * U.clamp(A.cr, -1, 1); ctx.scale(cr, cr);
    // 地面斧光
    const hx = r * (0.3 + 0.5 * A.ae), hy = r * 0.62;
    if (ARC > 0 && !shade) {
      ctx.save(); ctx.translate(hx, hy); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const a0 = Math.min(ARC0, ARC1), a1 = Math.max(ARC0, ARC1), col = p2 ? FLAME : GOLD;
      ctx.strokeStyle = hexA(col, 0.4 * ARC); ctx.lineWidth = r * 0.45; ctx.beginPath(); ctx.arc(0, 0, r * 2.2, a0, a1); ctx.stroke();
      ctx.strokeStyle = hexA(WHITE, 0.8 * ARC); ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }
    backArms(ctx, r, t, U.clamp(A.arms + clawK * (p2 ? 0 : 0.8), 0, 1.4), shade);
    cloak(ctx, r, shade);
    if (!shade && run > 0.1) { // 腳：一隻騎士脛甲、一隻赤腳獸足（俯視只在跨步時露出斗篷外）
      const st = Math.sin(t * (4 + 5 * run));
      ctx.fillStyle = '#8a8c90'; ctx.beginPath(); ctx.ellipse(r * (0.9 + 0.22 * st), r * 0.38, r * 0.2, r * 0.12, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#6a5040'; ctx.beginPath(); ctx.ellipse(r * (0.9 - 0.22 * st), -r * 0.38, r * 0.22, r * 0.14, 0, 0, TAU); ctx.fill();
    }
    // 左臂：一階段巨大手臂、二階段龍頭（高舉時縮短，表示朝上）
    const lup = U.clamp(A.ll, 0, 1), la = A.la + (clawK && p2 ? -0.3 * clawK : 0), le = A.le + clawK * 0.6;
    const sx = r * 0.2, sy = -r * 0.62;
    if (armGone) stump(ctx, sx, sy, r, t);
    else if (!p2) {
      const L = r * (0.7 + 0.7 * le) * (1 - 0.5 * lup), ex = sx + Math.cos(la) * L, ey = sy + Math.sin(la) * L;
      limb(ctx, sx, sy, ex, ey, r * 0.3, ARMS[1], shade);
      bigHand(ctx, ex, ey, la, r * (1 + 0.15 * lup), le, shade);
    } else {
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(la); ctx.scale(dragonK * (1 - 0.45 * lup) * (0.8 + 0.35 * U.clamp(le, 0, 1.7)), dragonK);
      dragonHead(ctx, r, A.jaw + clawK, t, shade, fire);
      ctx.restore();
    }
    ctx.save(); ctx.translate(r * 0.4, 0); head(ctx, r, shade); ctx.restore();
    // 右手 + 黃金戰斧
    limb(ctx, r * 0.15, r * 0.6, hx, hy, r * 0.22, SKIN, shade);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(A.aa); ctx.scale(1 - 0.55 * U.clamp(A.up, 0, 1), 1);
    axe(ctx, r, shade);
    if (p2 && !shade && fire) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = hexA(FLAME, 0.25); ctx.beginPath(); ctx.arc(r * 2, 0, r * 0.7, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.restore();
    ctx.restore();
  }

  // 躍起重劈 / 風暴突襲在半空：落點影子越落越濃，葛瑞克放大沿弧線飛過去、戰斧高舉
  const TB = { x: 0, y: 0, face: 0, r: 0, def: null, phase: 1, state: 'skill', inst: null, world: null, vx: 0, vy: 0 };
  function hidden(ctx, b, t) {
    const inst = b.inst; if (!inst || !inst.v) return;
    const land = inst.v.actions.find((a) => a.do === 'land' && a.at >= inst.t - 0.05), m = land && inst.marks && inst.marks[land.mark];
    if (!m) return;
    const hide = inst.v.actions.filter((a) => a.do === 'hide' && a.at <= land.at).pop();
    if (!hide) return;
    const u = U.clamp((inst.t - hide.at) / (land.at - hide.at), 0, 1);
    ctx.save();
    ctx.fillStyle = hexA('#100a04', 0.15 + 0.4 * u); ctx.beginPath(); ctx.ellipse(m.x, m.y, b.r * (1.1 + 1.2 * u), b.r * (0.75 + 0.8 * u), 0, 0, TAU); ctx.fill();
    ctx.restore();
    const x = lerp(b.x, m.x, ease(u)), y0 = lerp(b.y, m.y, ease(u)), y = y0 - Math.sin(PI * Math.min(1, u * 1.15)) * 220, s = 1 + 0.5 * Math.min(1, (y0 - y) / 200);
    Object.assign(TB, { x, y, face: U.angTo(b, m), r: b.r, def: b.def, phase: b.phase, inst, world: b.world });
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y);
    R.drawBossBody(ctx, TB, t);
    ctx.restore();
  }

  // ── 投射物：風暴之刃（青白彎月風刃 + 風絲拖尾；二階段火風染橘）──
  R.projStyles = R.projStyles || {};
  R.projStyles.stormblade = function (ctx, p, t) {
    const k = p.r, fire = !!p.status, c = fire ? FLAME : '#bff0e0', c2 = fire ? FLAME_L : WHITE;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = hexA(c, 0.25 - i * 0.06); ctx.lineWidth = k * (0.5 - i * 0.1); ctx.beginPath(); ctx.arc(-k * (0.6 + i * 0.7), 0, k * (1.3 - i * 0.15), -1.2, 1.2); ctx.stroke(); } // 拖尾
    ctx.strokeStyle = hexA(c, 0.8); ctx.lineWidth = k * 0.45; ctx.beginPath(); ctx.arc(-k * 0.3, 0, k * 1.2, -1.25, 1.25); ctx.stroke();
    ctx.strokeStyle = hexA(c2, 0.95); ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = hexA(c, 0.5); ctx.lineWidth = 1.2; ctx.beginPath(); // 風絲
    for (let i = 0; i < 4; i++) { const y = (i / 3 - 0.5) * k * 1.6; ctx.moveTo(-k * 0.5, y); ctx.lineTo(-k * (2.4 + Math.sin(t * 20 + i) * 0.6), y * 0.7); }
    ctx.stroke();
    ctx.restore();
  };
  // ── 拋射物：火岩（燃燒的岩塊拖著火焰從龍口噴出）──
  R.lobStyles = R.lobStyles || {};
  R.lobStyles.firerock = function (ctx, l, x, y, k, t) {
    const an = Math.atan2(l.y1 - l.y0, l.x1 - l.x0), s = 9 + 5 * k;
    ctx.save(); ctx.translate(x, y); ctx.rotate(an);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, s * 2.6); g.addColorStop(0, hexA(FLAME_L, 0.8)); g.addColorStop(0.5, hexA(FLAME, 0.4)); g.addColorStop(1, hexA(FLAME, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * 2.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = hexA(FLAME, 0.5); ctx.lineWidth = s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(-s * 4, Math.sin(t * 18) * s * 0.4); ctx.stroke(); // 火尾
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#3a1a0a'; ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, d = s * (0.8 + 0.3 * hash(i)); ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d); } ctx.closePath(); ctx.fill();
    ctx.strokeStyle = hexA(FLAME_L, 0.9); ctx.lineWidth = 1.4; ctx.stroke(); // 岩縫透出的火
    ctx.restore();
  };

  R.defineBossStyle('godrick', { body, hidden });
})(typeof window !== 'undefined' ? window : globalThis);
