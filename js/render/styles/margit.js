'use strict';
// Boss 造型：惡兆妖鬼 瑪爾基特（依官方設定稿〈蒙葛特〉、遊戲模型與圖鑑，俯視）：
//   駝背前傾的巨大老人：破爛的黃褐毛皮斗篷（高立的衣領、背後撕成一條條長布條）、胸前一條粗金繩打結垂下；
//   頭上一圈亂長的捲曲小角（像荊冠）、灰白亂髮與長鬚往前垂，灰白皮膚、細長垂到膝的手臂與黑色長指甲；
//   右手燒焦樹根般的黑色扭曲長拐杖，左手凝出金色聖光的幻影武器（短刀 / 大槌 / 聖劍），斗篷底下拖著一條長尾。
// 逐招動畫：依動作種類與技能挑「蓄力 → 擊」關鍵值姿態（拐杖角度、伸手、高舉、左手武器角度、前撲、扭身、甩尾、蹲伏），
//   左手武器依招式切換；走路時整個人前傾晃動、布條往後飄。二階段左手與角尖常駐金光；大招二階段揭開面紗時身上滲出暗紅咒血。
// 招式細節：拐杖弧帶焦黑火星、幻影武器弧帶殘影、尾掃貼地掃痕、延遲那一下杖尖閃光發抖、擲刀前光點收進掌心、大槌蓄力發亮、聖劍迴旋的金色劍環。
// hidden()：躍起下刺 / 大槌躍擊在半空（落點影子越來越大 + 放大的瑪爾基特 + 光跡；躍刺十字準星、大槌雙環）；R.projStyles.holydagger：黃金短刀；R.lobStyles.holysword：黃金劍雨。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  const TAU = U.TAU, PI = Math.PI;
  const WHITE = '#ffffff', PALE = '#fff6d0', GOLD = '#ffd34d', AMBER = '#e0a030', BLOOD = '#c0142e';
  const CLOAK = '#7a6440', CLOAK_D = '#3e3020', CLOAK_L = '#a88a58', ROPE = '#c9a24a', ROPE_D = '#6e5426';
  const SKIN = '#b4ada2', SKIN_D = '#6f685e', HAIR = '#c4beb2', HORN = '#5a3e30', HORN_L = '#b89070', CANE = '#1a1612', CANE_L = '#4a4038', TAIL = '#4a3e36';
  const TRIG = { hit: 1, dash: 1, proj: 1, rain: 1 };
  const ease = (u) => 1 - (1 - u) * (1 - u);
  const lerp = (a, b, u) => a + (b - a) * u;
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }; // 固定的偽亂數（快取圖用，不碰戰鬥亂數）

  // 姿態：ca 拐杖方向（相對面向）、ce 持杖手前伸、up 高舉過頂、lw 左手武器方向、le 左手前伸、ll 左手高舉、fwd 前撲、spin 扭身、tail 甩尾、cr 蹲伏
  const DEF = { ca: 0.55, ce: 0.25, up: 0, lw: -0.5, le: 0.2, ll: 0, fwd: 0, spin: 0, tail: 0, cr: 0 };
  const KEYS = Object.keys(DEF);
  // key: [蓄滿, 擊]
  const CANE_SWING = [ // 拐杖橫掃：右後往左前、再反手掃回
    { ca: [1.9, -0.9], ce: [0.3, 1], spin: [0.35, -0.3] },
    { ca: [-1.0, 1.6], ce: [0.3, 1], spin: [-0.3, 0.35] }];
  const CANE_SMASH = { ca: [0, 0], ce: [0.3, 1.1], up: [1, 0], fwd: [-0.15, 0.3], cr: [-0.1, 0.25] };
  const SLAM = { ca: [0, 0], ce: [0.5, 1.15], up: [1, 0], ll: [1, 0], fwd: [-0.2, 0.35], cr: [-0.15, 0.3] }; // 雙手高舉
  const THROW = { lw: [-2.4, 0.1], le: [0, 1.1], spin: [-0.35, 0.25], ca: [0.8, 0.7] };
  const DSLASH = [
    { lw: [-2.1, 0.6], le: [0.2, 1], spin: [-0.3, 0.3] },
    { lw: [0.7, -1.4], le: [0.3, 1], spin: [0.3, -0.25] }];
  const DTHRUST = { lw: [-0.2, 0], le: [-0.3, 1.25], fwd: [-0.1, 0.3] };
  const TAILS = { spin: [0.6, -0.9], tail: [-1.4, 1.6], cr: [0.2, 0.1], ca: [0.9, 0.9] }; // 扭身甩尾
  const STAB = { lw: [0, 0], le: [0.2, 0.9], up: [0.5, 0], cr: [0, 0.4], fwd: [0, 0.2] }; // 落地下刺
  const HAMMER = { lw: [-PI * 0.9, 0], le: [0.2, 1.2], ll: [1, 0], fwd: [-0.15, 0.4], cr: [-0.1, 0.35] }; // 大槌從肩後砸到正前方
  const SWORD = [
    { lw: [-2.3, 0.7], le: [0.3, 1.1], spin: [-0.4, 0.45], ca: [1.2, -0.3] },
    { lw: [0.9, -1.6], le: [0.3, 1.1], spin: [0.4, -0.4], ca: [-0.3, 1.1] }];
  const SWORD_STAB = { lw: [0.3, 0], le: [-0.2, 1.3], fwd: [-0.15, 0.4], cr: [0, 0.2] };
  const SPIN = { lw: [-1.6, -1.6], le: [1, 1], ca: [1.6, 1.6], ce: [1, 1] }; // 雙臂張開，整個人由 body 依時間旋轉
  const BACKSTEP = { fwd: [0, -0.3], cr: [0.3, 0.2], lw: [-1.2, -0.8] };
  const REVEAL = { ll: [1, 0.3], le: [0.6, 1], lw: [-1.8, -1.2], ca: [1.4, 1.2], ce: [0.6, 1], cr: [0.2, -0.1] }; // 張開雙臂、斗篷撕裂
  const RAISE = { ll: [1, 1], lw: [-PI / 2, -PI / 2], le: [0.5, 0.6] };

  // 左手武器：0 空手、1 短刀、2 大槌、3 聖劍
  const W_NONE = 0, W_DAGGER = 1, W_HAMMER = 2, W_SWORD = 3;
  function weaponOf(sid, a, p2) {
    if (sid === 'hammer_leap' || (sid === 'cane_hammer' && a.shape !== 'cone')) return W_HAMMER;
    if (sid === 'sword_spin' || sid === 'sword_combo') return W_SWORD;
    if (sid === 'ult') return a.do === 'hit' && a.shape === 'cone' ? W_SWORD : a.anchor === 'mark' && a.mark === 'hammerSpot' ? W_HAMMER : a.do === 'rain' ? W_SWORD : W_DAGGER;
    if (sid === 'dagger_toss' && a.anchor === 'mark') return p2 ? W_HAMMER : W_DAGGER;
    if (sid === 'dagger_toss' || sid === 'dagger_slash' || sid === 'dagger_retreat' || sid === 'leaping_stab') return W_DAGGER;
    return W_NONE;
  }
  function pick(e, sid) {
    const a = e.a;
    if (a.do === 'proj') return THROW;
    if (a.do === 'rain') return RAISE;
    if (a.do === 'dash') return sid === 'sword_spin' ? SPIN : a.dir === 'back' ? BACKSTEP : DTHRUST;
    if (sid === 'tail_sweep') return TAILS;
    if (sid === 'sword_spin') return SPIN;
    if (a.anchor === 'mark') return a.mark === 'hammerSpot' ? HAMMER : STAB;
    if (sid === 'ult' && a.fx === 'cursedblood') return REVEAL;
    const wk = weaponOf(sid, a, false);
    if (wk === W_HAMMER) return HAMMER;
    if (wk === W_SWORD || sid === 'ult') return a.shape === 'rect' ? SWORD_STAB : SWORD[e.hi & 1];
    if (wk === W_DAGGER) return a.shape === 'rect' ? DTHRUST : DSLASH[e.hi & 1];
    if (sid === 'delayed_slam') return SLAM;
    if (a.shape === 'rect' || a.shape === 'circle' || a.shape === 'ring') return CANE_SMASH;
    return CANE_SWING[e.hi & 1];
  }

  // ── 姿態混合（同大樹守衛：下一手蓄力、上一手收勢）──
  const A = Object.assign({}, DEF), B = {};
  const P = { le: null, ne: null, wd: 0, sn: 0 };
  const CACHE = new WeakMap();
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
  const K_CANE = 0, K_PHANTOM = 1, K_TAIL = 2;
  let ARC = 0, ARC0 = 0, ARC1 = 0, ARCK = K_CANE; // 本幀掃過的弧（強度、起訖角、拐杖 / 左手幻影武器 / 長尾）
  function arcOf(e, sw, cur) {
    if (e.ca && Math.abs(e.ca[1] - e.ca[0]) > 0.8) { ARC = sw; ARC0 = e.ca[0]; ARC1 = cur ? A.ca : e.ca[1]; ARCK = K_CANE; }
    else if (e.lw && Math.abs(e.lw[1] - e.lw[0]) > 0.8) { ARC = sw; ARC0 = e.lw[0]; ARC1 = cur ? A.lw : e.lw[1]; ARCK = K_PHANTOM; }
    else if (e.tail && Math.abs(e.tail[1] - e.tail[0]) > 0.8) { ARC = sw; ARC0 = PI + e.tail[0] * 0.9; ARC1 = PI + (cur ? A.tail : e.tail[1]) * 0.9; ARCK = K_TAIL; }
  }
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
  // 斗篷：破爛的毛皮大斗篷（外緣鋸齒、毛皮短紋）、高立的衣領、胸前粗金繩
  function cloak(ctx, r, shade) {
    R.blit(ctx, 'body:mg:cloak:' + r + ':' + (shade ? 's' : 'b'), r * 2.6 + 16, r * 2.4 + 16, r * 1.4 + 8, r * 1.2 + 8, (g) => {
      g.beginPath();
      for (let i = 0; i <= 56; i++) { // 不規則的破爛外緣：後半部撕得更破、偶爾有深缺口
        const an = i / 56 * TAU, back = Math.max(0, -Math.cos(an)), jag = 1 + (hash(i) - 0.5) * 0.14 - back * hash(i + 5) * (hash(i + 9) > 0.7 ? 0.3 : 0.12);
        g.lineTo(Math.cos(an) * r * 1.08 * jag - r * 0.12, Math.sin(an) * r * 0.98 * jag);
      }
      g.closePath();
      const gr = g.createRadialGradient(r * 0.2, -r * 0.2, 2, -r * 0.1, 0, r * 1.1);
      gr.addColorStop(0, C(shade, CLOAK_L)); gr.addColorStop(0.55, C(shade, CLOAK)); gr.addColorStop(1, C(shade, CLOAK_D));
      g.fillStyle = gr; g.fill(); g.strokeStyle = shade ? GOLD : '#2a2014'; g.lineWidth = 1.3; g.stroke();
      if (shade) return;
      g.strokeStyle = 'rgba(40,30,18,0.55)'; g.lineWidth = 1; g.beginPath(); // 毛皮短紋與褶皺
      for (let i = 0; i < 60; i++) { const an = hash(i + 3) * TAU, d = Math.sqrt(hash(i + 7)) * r * 0.9, x = Math.cos(an) * d - r * 0.12, y = Math.sin(an) * d * 0.9; g.moveTo(x, y); g.lineTo(x - r * 0.08, y + (hash(i) - 0.5) * r * 0.06); }
      for (let i = 0; i < 7; i++) { const y = (i / 6 - 0.5) * r * 1.5; g.moveTo(r * 0.1, y * 0.6); g.quadraticCurveTo(-r * 0.4, y, -r * 1.0, y * 1.1); }
      g.stroke();
      g.strokeStyle = 'rgba(200,170,110,0.35)'; g.lineWidth = 1.2; g.beginPath(); g.arc(-r * 0.1, 0, r * 0.8, -2.4, -1.2); g.stroke();
      // 高立的衣領：繞在頭後方的厚弧
      g.fillStyle = CLOAK_D; g.beginPath(); g.arc(r * 0.42, 0, r * 0.5, PI * 0.55, PI * 1.45); g.arc(r * 0.42, 0, r * 0.34, PI * 1.45, PI * 0.55, true); g.closePath(); g.fill();
      g.strokeStyle = '#2a2014'; g.lineWidth = 1; g.stroke();
      // 粗金繩：從左肩繞到右肩，胸前打結、垂下兩股
      g.lineCap = 'round';
      for (const [col, wd] of [[ROPE_D, r * 0.11], [ROPE, r * 0.07]]) {
        g.strokeStyle = col; g.lineWidth = wd;
        g.beginPath(); g.moveTo(r * 0.05, -r * 0.6); g.quadraticCurveTo(r * 0.75, -r * 0.1, r * 0.72, 0); g.quadraticCurveTo(r * 0.75, r * 0.1, r * 0.05, r * 0.6); g.stroke();
        g.beginPath(); g.moveTo(r * 0.72, 0); g.quadraticCurveTo(r * 0.85, r * 0.05, r * 0.95, r * 0.18); g.moveTo(r * 0.72, 0); g.quadraticCurveTo(r * 0.88, -r * 0.02, r * 1.0, r * 0.06); g.stroke();
      }
      g.strokeStyle = 'rgba(255,240,190,0.6)'; g.lineWidth = 1; g.beginPath(); // 繩上的扭紋
      for (let i = 0; i < 10; i++) { const u = i / 9, x = lerp(r * 0.1, r * 0.7, 1 - Math.abs(u - 0.5) * 2) , y = lerp(-r * 0.58, r * 0.58, u); g.moveTo(x - 2, y - 2); g.lineTo(x + 2, y + 2); }
      g.stroke();
      g.fillStyle = ROPE; g.beginPath(); g.arc(r * 0.72, 0, r * 0.09, 0, TAU); g.fill(); g.strokeStyle = ROPE_D; g.stroke();
    });
  }
  // 斗篷背後撕成一條條的長布條：隨走速往後飄、隨時間擺動
  function tatters(ctx, r, run, t, shade, blood) {
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const s = (i / 8 - 0.5) * 2, an = PI + s * 1.15, x0 = Math.cos(an) * r * 0.95 - r * 0.12, y0 = Math.sin(an) * r * 0.9;
      const len = r * (0.45 + 0.35 * hash(i + 20)) * (1 + 0.7 * run), sw = Math.sin(t * 3.2 + i * 1.3) * r * 0.12 * (1 - 0.4 * run);
      const x1 = x0 - len, y1 = y0 * (1.15 + 0.1 * run) + sw;
      ctx.strokeStyle = C(shade, i % 3 ? CLOAK_D : '#56442a'); ctx.lineWidth = r * (0.14 - 0.04 * hash(i + 9));
      ctx.beginPath(); ctx.moveTo(x0 + r * 0.1, y0); ctx.quadraticCurveTo(x0 - len * 0.5, y0 + sw * 1.5, x1, y1); ctx.stroke();
      if (blood && !shade && i % 2) { ctx.strokeStyle = hexA(BLOOD, 0.55); ctx.lineWidth = r * 0.04; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 - len * 0.5, y0 + sw * 1.5, x1, y1); ctx.stroke(); }
    }
  }
  // 長尾：從斗篷底下往後伸，甩尾時繞根部大幅擺動
  function tail(ctx, r, sway, swing, shade) {
    ctx.save(); ctx.translate(-r * 0.75, 0); ctx.rotate(swing * 0.9);
    const L = r * 1.6, bend = sway * 0.3 + swing * 0.5;
    ctx.strokeStyle = C(shade, TAIL); ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.lineWidth = r * (0.2 - i * 0.05);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-L * 0.5, r * bend * 0.8, -L * (0.75 + i * 0.12), r * bend * (1.2 + i * 0.2)); ctx.stroke();
    }
    if (!shade) { // 毛
      ctx.strokeStyle = 'rgba(150,130,110,0.6)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 1; i < 8; i++) { const u = i / 8, x = -L * 0.75 * u, y = r * bend * (0.8 * 2 * u * (1 - u) + 1.2 * u * u); ctx.moveTo(x, y - r * 0.1); ctx.lineTo(x - r * 0.12, y - r * 0.16); ctx.moveTo(x, y + r * 0.1); ctx.lineTo(x - r * 0.12, y + r * 0.16); }
      ctx.stroke();
    }
    ctx.restore();
  }
  // 頭：灰白亂髮、一圈捲曲小角（荊冠）、往前垂的長鬚、混濁的眼
  function head(ctx, r, shade, p2, t) {
    R.blit(ctx, 'body:mg:head:' + r + ':' + (shade ? 's' : 'b'), r * 1.6 + 10, r * 1.6 + 10, r * 0.8 + 5, r * 0.8 + 5, (g) => {
      g.lineCap = 'round';
      for (let i = 0; i < 14; i++) { // 角：從頭頂一圈往外亂長（荊冠）、末端捲起
        const an = i / 14 * TAU + (hash(i + 40) - 0.5) * 0.35, L = r * (0.22 + 0.2 * hash(i + 50)), cv = (i % 2 ? 1 : -1) * (0.6 + hash(i) * 0.6);
        const x0 = Math.cos(an) * r * 0.16, y0 = Math.sin(an) * r * 0.16, x1 = Math.cos(an) * (r * 0.2 + L), y1 = Math.sin(an) * (r * 0.2 + L);
        const mx = (x0 + x1) / 2 - Math.sin(an) * L * 0.35 * cv, my = (y0 + y1) / 2 + Math.cos(an) * L * 0.35 * cv;
        g.strokeStyle = C(shade, HORN); g.lineWidth = r * 0.1; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx, my, x1, y1); g.stroke();
        g.strokeStyle = C(shade, HORN_L); g.lineWidth = r * 0.04; g.beginPath(); g.moveTo(mx, my); g.quadraticCurveTo(x1 - Math.sin(an) * L * 0.25 * cv, y1 + Math.cos(an) * L * 0.25 * cv, x1 + Math.cos(an + cv) * r * 0.06, y1 + Math.sin(an + cv) * r * 0.06); g.stroke(); // 捲起的角尖
        if (!shade) { g.strokeStyle = 'rgba(50,30,20,0.6)'; g.lineWidth = 0.8; g.beginPath(); for (let k = 1; k < 4; k++) { const u = k / 4, x = lerp(x0, x1, u), y = lerp(y0, y1, u); g.moveTo(x - Math.sin(an) * 2, y + Math.cos(an) * 2); g.lineTo(x + Math.sin(an) * 2, y - Math.cos(an) * 2); } g.stroke(); } // 角上的環紋
      }
      g.fillStyle = C(shade, '#8a8478'); g.beginPath(); g.ellipse(-r * 0.05, 0, r * 0.3, r * 0.26, 0, 0, TAU); g.fill(); // 亂髮：灰白長髮往後披散
      if (!shade) {
        g.lineCap = 'round';
        for (const [col, n, wd] of [['#9a9488', 26, 2.2], [HAIR, 22, 1.4], ['#e4e0d6', 10, 0.9]]) {
          g.strokeStyle = col; g.lineWidth = wd; g.beginPath();
          for (let i = 0; i < n; i++) { const y0 = (hash(i + n) - 0.5) * r * 0.4, an = PI + (hash(i + 60 + n) - 0.5) * 1.6, l = r * (0.2 + 0.22 * hash(i + 70 + n)), x0 = r * 0.12 - Math.abs(y0) * 0.3;
            g.moveTo(x0, y0); g.quadraticCurveTo(x0 + Math.cos(an) * l * 0.5, y0 + Math.sin(an) * l * 0.5 + (hash(i) - 0.5) * r * 0.1, x0 + Math.cos(an) * l, y0 + Math.sin(an) * l); }
          g.stroke();
        }
      }
      g.fillStyle = C(shade, SKIN); g.beginPath(); g.ellipse(r * 0.2, 0, r * 0.11, r * 0.13, 0, 0, TAU); g.fill(); // 前額與臉（俯視只露出一點）
      if (!shade) {
        g.fillStyle = '#e8e4d8'; g.beginPath(); g.arc(r * 0.26, -r * 0.06, r * 0.03, 0, TAU); g.fill(); // 混濁的眼
        g.strokeStyle = HAIR; g.lineWidth = 1.4; g.beginPath(); // 長鬚往前垂
        for (let i = 0; i < 7; i++) { const y = (i / 6 - 0.5) * r * 0.2; g.moveTo(r * 0.26, y); g.quadraticCurveTo(r * 0.38, y * 1.4, r * (0.46 + 0.05 * hash(i)), y * 1.7); }
        g.stroke();
      }
    });
    if (p2 && !shade) { // 二階段：角尖冒出細碎金光
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = hexA(GOLD, 0.7);
      for (let i = 0; i < 6; i++) { const an = PI + (i / 5 - 0.5) * 4 + Math.sin(t * 2 + i) * 0.1, d = r * (0.5 + 0.08 * Math.sin(t * 5 + i * 2)); ctx.beginPath(); ctx.arc(Math.cos(an) * d, Math.sin(an) * d, 1.6 + Math.sin(t * 7 + i) * 0.8, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }
  // 細長的手臂 + 黑色長指甲
  function arm(ctx, x0, y0, x1, y1, r, shade) {
    const mx = (x0 + x1) / 2 + (y1 - y0) * 0.12, my = (y0 + y1) / 2 - (x1 - x0) * 0.12;
    ctx.lineCap = 'round';
    ctx.strokeStyle = C(shade, SKIN_D); ctx.lineWidth = r * 0.17; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
    ctx.strokeStyle = C(shade, SKIN); ctx.lineWidth = r * 0.11; ctx.stroke();
    ctx.fillStyle = C(shade, SKIN); ctx.beginPath(); ctx.arc(x1, y1, r * 0.1, 0, TAU); ctx.fill();
  }
  // 黑色扭曲長拐杖：燒焦樹根般的節瘤（從握處往 +x 延伸，後端留一截杖頭）
  function cane(ctx, len, r, shade) {
    R.blit(ctx, 'body:mg:cane:' + r + ':' + (shade ? 's' : 'b'), len * 1.3 + 16, r * 0.6 + 12, len * 0.22 + 8, r * 0.3 + 6, (g) => {
      const pts = [];
      for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([lerp(-len * 0.2, len, u), Math.sin(u * 17) * r * 0.05 + (hash(i + 80) - 0.5) * r * 0.06]); }
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const [col, wd] of [[shade ? GOLD : '#000000', r * 0.17], [C(shade, CANE), r * 0.13]]) {
        g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      }
      g.fillStyle = C(shade, CANE);
      for (let i = 1; i < 12; i += 2) { const [x, y] = pts[i]; g.beginPath(); g.ellipse(x, y, r * 0.1, r * 0.08, hash(i) * 3, 0, TAU); g.fill(); } // 節瘤
      g.beginPath(); g.ellipse(-len * 0.2, 0, r * 0.14, r * 0.12, 0, 0, TAU); g.fill(); // 杖頭
      if (!shade) { g.strokeStyle = CANE_L; g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i < 12; i++) { const [x, y] = pts[i], [x2, y2] = pts[i + 1]; g.moveTo(x, y - r * 0.03); g.quadraticCurveTo((x + x2) / 2, y - r * 0.07, x2, y2 - r * 0.02); } g.stroke(); } // 樹皮上的亮紋
    });
  }
  // 左手的金色幻影武器（外光 + 淡金身 + 白芯；從手往 +x 延伸）
  function phantom(ctx, kind, r, shade, glow) {
    if (!kind) return;
    ctx.save();
    if (!shade) ctx.globalCompositeOperation = 'lighter';
    const body = (path, w) => {
      if (shade) { ctx.fillStyle = '#0a0806'; path(); ctx.fill(); return; }
      ctx.strokeStyle = hexA(GOLD, 0.25 + 0.25 * glow); ctx.lineWidth = w; ctx.lineJoin = 'round'; path(); ctx.stroke();
      ctx.fillStyle = hexA(PALE, 0.85); path(); ctx.fill();
      ctx.strokeStyle = hexA(WHITE, 0.9); ctx.lineWidth = 1.2; path(); ctx.stroke();
    };
    if (kind === W_DAGGER) {
      body(() => { ctx.beginPath(); ctx.moveTo(0, -r * 0.06); ctx.quadraticCurveTo(r * 0.5, -r * 0.18, r * 0.95, r * 0.08); ctx.quadraticCurveTo(r * 0.5, r * 0.02, 0, r * 0.08); ctx.closePath(); }, 8);
    } else if (kind === W_HAMMER) {
      const L = r * 1.7;
      body(() => { ctx.beginPath(); ctx.rect(0, -r * 0.06, L, r * 0.12); }, 8);
      body(() => { ctx.beginPath(); ctx.rect(L - r * 0.25, -r * 0.45, r * 0.6, r * 0.9); }, 12);
    } else if (kind === W_SWORD) {
      const L = r * 2.0;
      body(() => { ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 0.07); ctx.lineTo(L - r * 0.15, -r * 0.06); ctx.lineTo(L, 0); ctx.lineTo(L - r * 0.15, r * 0.06); ctx.lineTo(r * 0.2, r * 0.07); ctx.closePath(); }, 9);
      body(() => { ctx.beginPath(); ctx.rect(r * 0.14, -r * 0.26, r * 0.08, r * 0.52); }, 5); // 劍格
    }
    ctx.restore();
  }

  function body(ctx, o, t, { r }) {
    const shade = !!o.shade, p2 = o.phase === 2, w = o.world;
    const stag = o.state === 'stagger' || o.state === 'stun';
    const inst = !stag && o.inst && o.inst.skill && o.inst.v && o.inst.v.actions ? o.inst : null;
    const sid = inst ? inst.skill.id : '';
    for (const k of KEYS) A[k] = DEF[k];
    A.ca = DEF.ca + Math.sin(t * 1.6) * 0.05;
    ARC = 0;
    let wk = W_NONE, spinA = 0, hold = 0, form = 0, charge = 0;
    if (inst) {
      pace(inst); build(sid);
      const e = P.ne && (P.wd > 0.1 || !P.le) ? P.ne : P.le || P.ne;
      if (e) wk = weaponOf(sid, e.a, p2);
      if (sid === 'sword_spin') { const c = trigs(inst.v), t0 = c[0].a.at - 0.5, t1 = c[c.length - 1].a.at; if (inst.t > t0 && inst.t < t1 + 0.15) spinA = (inst.t - t0) / 0.3 * TAU; }
      const n = P.ne;
      // 延遲的那一下（重砸、拐杖連擊第三下）：高舉停住時拐杖微微發抖、杖尖閃光——原作騙翻滾的那一拍
      if (n && n.a.do === 'hit' && (sid === 'delayed_slam' || (sid === 'cane_combo' && n.hi === 2)) && P.wd > 0.4 && P.wd < 0.74) { hold = Math.sin((P.wd - 0.4) / 0.34 * PI); A.ca += Math.sin(t * 42) * 0.035 * hold; }
      if (n && n.a.do === 'proj' && P.wd > 0.15) form = (P.wd - 0.15) / 0.85; // 短刀在左手凝成
      if (n && wk === W_HAMMER && P.wd < 0.75) charge = U.clamp(P.wd / 0.75, 0, 1); // 大槌蓄力發亮
    }
    if (o.state === 'transition') { wk = W_HAMMER; A.ll = 1; A.lw = -PI / 2; A.le = 0.6; A.cr = -0.1; }
    const blood = inst && sid === 'ult' && p2; // 大招二階段：揭開面紗，滲出咒血
    const dh = inst && inst.dash, spd = Math.hypot(o.vx || 0, o.vy || 0), run = dh && dh.t < dh.dur ? 1 : U.clamp(spd / 240, 0, 1); // 後撤跳步 / 迴旋推進時布條整個翻飛
    const sway = Math.sin(t * 3 + (o.y || 0) * 0.01) * (1 - run * 0.5), bob = Math.sin(t * (4 + 6 * run)) * 0.04 * run;
    const gl = p2 ? 0.7 : 0.4;

    ctx.save();
    if (blood && !shade) { // 咒血外光
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.2);
      g.addColorStop(0, hexA(BLOOD, 0.4 + 0.15 * Math.sin(t * 9))); g.addColorStop(1, hexA(BLOOD, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.translate((A.fwd + bob) * r, 0); if (A.spin || spinA) ctx.rotate(A.spin + spinA);
    const cr = 1 - 0.12 * U.clamp(A.cr, -1, 1); ctx.scale(cr, cr); // 蹲伏縮小、高舉時挺起放大
    // 地面刀光：武器大幅揮動時沿武器尖端畫一道弧（拐杖灰白、幻影武器金色）
    const hx = r * (0.25 + 0.45 * A.ce), hy = r * 0.55, lx = r * (0.25 + 0.45 * A.le) - A.ll * r * 0.1, ly = -r * (0.55 - 0.1 * A.ll);
    if (ARC > 0 && !shade) {
      const [ox, oy, rad] = ARCK === K_PHANTOM ? [lx, ly, r * (wk === W_SWORD ? 2.0 : wk === W_HAMMER ? 1.9 : 1.0)] : ARCK === K_TAIL ? [-r * 0.75, 0, r * 1.6] : [hx, hy, r * 2.2];
      ctx.save(); ctx.translate(ox, oy); ctx.lineCap = 'round';
      const a0 = Math.min(ARC0, ARC1), a1 = Math.max(ARC0, ARC1), arc = (rr, wd, col, al) => { ctx.strokeStyle = hexA(col, al); ctx.lineWidth = wd; ctx.beginPath(); ctx.arc(0, 0, rr, a0, a1); ctx.stroke(); };
      if (ARCK === K_PHANTOM) { // 幻影武器：金色主弧 + 往回落後一截的殘影弧
        ctx.globalCompositeOperation = 'lighter';
        const d = ARC1 > ARC0 ? -0.3 : 0.3;
        ctx.strokeStyle = hexA(GOLD, 0.18 * ARC); ctx.lineWidth = r * 0.22; ctx.beginPath(); ctx.arc(0, 0, rad * 0.92, a0 + d, a1 + d); ctx.stroke();
        arc(rad, r * 0.3, GOLD, 0.4 * ARC); arc(rad, 2.5, WHITE, 0.8 * ARC);
      } else if (ARCK === K_TAIL) { // 長尾：貼地的棕灰掃痕
        arc(rad, r * 0.36, '#3a3026', 0.3 * ARC);
        ctx.globalCompositeOperation = 'lighter'; arc(rad, r * 0.16, '#8a7a62', 0.35 * ARC); arc(rad * 1.04, 1.5, PALE, 0.5 * ARC);
      } else { // 黑色拐杖：焦黑底帶 + 灰白弧，沿弧冒出閃爍的火星
        arc(rad, r * 0.36, '#2a221c', 0.35 * ARC);
        ctx.globalCompositeOperation = 'lighter'; arc(rad, r * 0.22, '#d8d0c0', 0.3 * ARC); arc(rad, 2.5, WHITE, 0.7 * ARC);
        ctx.fillStyle = hexA('#ff9a40', 0.8 * ARC);
        for (let i = 0; i < 6; i++) { const a = lerp(a0, a1, hash(i + 90)), d = rad + (hash(i + 95) - 0.5) * r * 0.4; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 1.2 + 1.2 * Math.abs(Math.sin(t * 17 + i * 3)), 0, TAU); ctx.fill(); }
      }
      ctx.restore();
    }
    if (spinA && !shade) { // 聖劍迴旋：身邊一圈金色劍環，環上的劍痕跟著轉
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      ctx.strokeStyle = hexA(GOLD, 0.3); ctx.lineWidth = r * 0.25; ctx.beginPath(); ctx.arc(0, 0, r * 2.05, 0, TAU); ctx.stroke();
      ctx.strokeStyle = hexA(WHITE, 0.6); ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = hexA(PALE, 0.7); ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) { const a = -spinA * 0.15 + i * TAU / 6; ctx.beginPath(); ctx.arc(0, 0, r * 2.05, a, a + 0.35); ctx.stroke(); }
      ctx.restore();
    }
    tail(ctx, r, sway, A.tail, shade);
    tatters(ctx, r, run, t, shade, blood);
    cloak(ctx, r, shade);
    // 左手 + 幻影武器（高舉時手臂縮短、武器朝上）
    const lup = U.clamp(A.ll, 0, 1);
    arm(ctx, r * 0.15, -r * 0.55, lx, ly, r, shade);
    if (wk) {
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(A.lw); ctx.scale(1 - 0.55 * lup, 1);
      if (!shade) { const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 0.9); g.addColorStop(0, hexA(GOLD, 0.5)); g.addColorStop(1, hexA(GOLD, 0)); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, TAU); ctx.fill(); ctx.restore(); }
      phantom(ctx, wk, r, shade, Math.max(gl, charge));
      if (charge > 0.05 && !shade && wk === W_HAMMER) { // 大槌蓄力：槌頭越來越亮，外圈一道光環收緊
        const hx2 = r * 1.75, g = ctx.createRadialGradient(hx2, 0, 1, hx2, 0, r * (0.5 + 0.5 * charge));
        g.addColorStop(0, hexA(WHITE, 0.7 * charge)); g.addColorStop(0.5, hexA(GOLD, 0.45 * charge)); g.addColorStop(1, hexA(GOLD, 0));
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx2, 0, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = hexA(PALE, 0.6 * charge); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx2, 0, r * (1.3 - 0.7 * charge), 0, TAU); ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    } else if (p2 && !shade) { // 二階段空手時掌心也亮著金光
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = hexA(GOLD, 0.35 + 0.2 * Math.sin(t * 6)); ctx.beginPath(); ctx.arc(lx, ly, r * 0.22, 0, TAU); ctx.fill(); ctx.restore();
    }
    if (form > 0 && !shade) { // 短刀成形：四顆金色光點繞著左手往掌心收
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = hexA(PALE, 0.5 + 0.5 * form);
      for (let i = 0; i < 4; i++) { const a = t * 9 + i * TAU / 4, d = r * (0.9 - 0.7 * form); ctx.beginPath(); ctx.arc(lx + Math.cos(a) * d, ly + Math.sin(a) * d, 2 + 1.5 * form, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    ctx.save(); ctx.translate(r * 0.42, 0); head(ctx, r, shade, p2, t); ctx.restore();
    // 右手 + 黑色拐杖（高舉時拐杖縮短，表示朝上）
    arm(ctx, r * 0.15, r * 0.55, hx, hy, r, shade);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(A.ca); ctx.scale(1 - 0.6 * U.clamp(A.up, 0, 1), 1);
    cane(ctx, r * 2.3, r, shade);
    if (hold > 0.05 && !shade) { // 杖尖星芒
      const L = r * 2.3, s = r * 0.5 * hold;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(PALE, 0.85 * hold); ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(L - s, 0); ctx.lineTo(L + s, 0); ctx.moveTo(L, -s); ctx.lineTo(L, s); ctx.stroke();
      ctx.fillStyle = hexA(WHITE, 0.8 * hold); ctx.beginPath(); ctx.arc(L, 0, 3, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.restore();
    ctx.restore();
  }

  // 躍起下刺 / 大槌躍擊在半空：落點影子越落越濃，瑪爾基特放大在半空（從起跳點飛向落點）
  const TB = { x: 0, y: 0, face: 0, r: 0, def: null, phase: 1, state: 'skill', inst: null, world: null, vx: 0, vy: 0 };
  function hidden(ctx, b, t) {
    const inst = b.inst; if (!inst || !inst.v) return;
    const land = inst.v.actions.find((a) => a.do === 'land' && a.at >= inst.t - 0.05), m = land && inst.marks && inst.marks[land.mark];
    if (!m) return;
    const hide = inst.v.actions.filter((a) => a.do === 'hide' && a.at <= land.at).pop();
    if (!hide) return;
    const u = U.clamp((inst.t - hide.at) / (land.at - hide.at), 0, 1), stab = land.mark === 'stabSpot';
    ctx.save();
    ctx.fillStyle = hexA('#1a1004', 0.15 + 0.4 * u); ctx.beginPath(); ctx.ellipse(m.x, m.y, b.r * (1.1 + 1.1 * u), b.r * (0.75 + 0.75 * u), 0, 0, TAU); ctx.fill();
    ctx.restore();
    // 躍起下刺：飛到落點上空後停在半空（原作的滯空），最後一瞬才刺下
    const at = (uu) => {
      const fly = stab ? Math.min(1, uu / 0.6) : uu, hang = stab && uu > 0.6 ? 1 - (uu - 0.6) / 0.4 * 0.3 : 1, gy = lerp(b.y, m.y, ease(fly));
      return [lerp(b.x, m.x, ease(fly)), gy - (stab ? Math.sin(PI * 0.5 * Math.min(1, fly * 1.6)) * 170 * hang * (uu > 0.92 ? (1 - uu) / 0.08 : 1) : Math.sin(PI * uu) * 200), gy];
    };
    const [x, y, gy] = at(u), s = 1 + 0.45 * (y < gy ? Math.min(1, (gy - y) / 180) : 0);
    const hit = inst.v.actions.find((a) => a.do === 'hit' && a.anchor === 'mark' && a.mark === land.mark), rr = (hit ? hit.r : 120) * (1.25 - 0.3 * u);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    if (stab) { // 躍刺：落點一個往內收緊的金色十字準星
      ctx.strokeStyle = hexA(GOLD, 0.2 + 0.5 * u); ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) { const a = t * 1.2 + i * TAU / 4; ctx.beginPath(); ctx.moveTo(m.x + Math.cos(a) * rr * 0.35, m.y + Math.sin(a) * rr * 0.35); ctx.lineTo(m.x + Math.cos(a) * rr, m.y + Math.sin(a) * rr); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(m.x, m.y, rr * 0.8, 0, TAU); ctx.stroke();
      if (u > 0.6) { const k = (u - 0.6) / 0.4; ctx.strokeStyle = hexA(PALE, 0.8 * k); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y + b.r * 0.4); ctx.lineTo(x, y + b.r * (0.4 + 1.6 * k)); ctx.stroke(); } // 滯空時往下指的短刀光
    } else { // 大槌：落點雙層金環，越落越實
      ctx.strokeStyle = hexA(GOLD, 0.15 + 0.5 * u); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(m.x, m.y, rr * 0.85, 0, TAU); ctx.stroke();
      ctx.strokeStyle = hexA(PALE, 0.1 + 0.35 * u); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(m.x, m.y, rr * 0.6, 0, TAU); ctx.stroke();
    }
    const [px, py] = at(Math.max(0, u - 0.18)); // 身後拖出的光跡：躍刺偏暗、大槌金色
    ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = hexA(stab ? '#3e3020' : '#b07818', 0.3); ctx.lineWidth = b.r * 0.55; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(GOLD, stab ? 0.25 : 0.45); ctx.lineWidth = b.r * 0.4; ctx.stroke();
    ctx.restore();
    Object.assign(TB, { x, y, face: U.angTo(b, m), r: b.r, def: b.def, phase: b.phase, inst, world: b.world });
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y);
    R.drawBossBody(ctx, TB, t);
    ctx.restore();
  }

  // ── 投射物：黃金短刀（彎月形金刀 + 白芯 + 拖尾光點）──
  R.projStyles = R.projStyles || {};
  R.projStyles.holydagger = function (ctx, p, t) {
    const k = p.r;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, k * 2.6);
    g.addColorStop(0, hexA(WHITE, 0.7)); g.addColorStop(0.4, hexA(GOLD, 0.4)); g.addColorStop(1, hexA(GOLD, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, k * 2.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = hexA(GOLD, 0.45); ctx.lineWidth = k * 0.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-k * 1.2, 0); ctx.lineTo(-k * 4.5, 0); ctx.stroke(); // 光尾
    ctx.fillStyle = hexA(PALE, 0.95); ctx.beginPath(); ctx.moveTo(-k * 1.1, -k * 0.35); ctx.quadraticCurveTo(k * 0.6, -k * 0.75, k * 1.9, k * 0.15); ctx.quadraticCurveTo(k * 0.5, -k * 0.05, -k * 1.1, k * 0.35); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = hexA(WHITE, 0.95); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = hexA(AMBER, 0.9); ctx.fillRect(-k * 1.6, -k * 0.2, k * 0.5, k * 0.4); // 刀柄
    ctx.fillStyle = hexA(PALE, 0.7);
    for (let i = 0; i < 4; i++) { const x = -k * (2.2 + i * 0.8), y = Math.sin(t * 22 + i * 1.9) * k * 0.4; ctx.beginPath(); ctx.arc(x, y, 2.2 - i * 0.35, 0, TAU); ctx.fill(); }
    ctx.restore();
  };
  // ── 拋射物：黃金劍雨（劍尖朝下的金色聖劍從斜上方落下，越接近落點越大越亮）──
  R.lobStyles = R.lobStyles || {};
  R.lobStyles.holysword = function (ctx, l, x, y, k, t) {
    const an = Math.atan2(l.y1 - l.y0, l.x1 - l.x0), L = 34 + 26 * k;
    ctx.save(); ctx.translate(x, y); ctx.rotate(an); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA(GOLD, 0.25 + 0.3 * k); ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-L * 1.4, 0); ctx.lineTo(L * 0.3, 0); ctx.stroke(); // 光尾
    ctx.fillStyle = hexA(PALE, 0.9); ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(L * 0.8, -3.5); ctx.lineTo(-L * 0.4, -3.5); ctx.lineTo(-L * 0.4, 3.5); ctx.lineTo(L * 0.8, 3.5); ctx.closePath(); ctx.fill(); // 劍身（劍尖朝落點）
    ctx.fillStyle = hexA(GOLD, 0.95); ctx.fillRect(-L * 0.46, -10, 5, 20); ctx.fillRect(-L * 0.75, -2.5, L * 0.3, 5); // 劍格與劍柄
    ctx.strokeStyle = hexA(WHITE, 0.9); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-L * 0.35, 0); ctx.lineTo(L * 0.9, 0); ctx.stroke();
    ctx.restore();
  };

  R.defineBossStyle('margit', { body, hidden });
})(typeof window !== 'undefined' ? window : globalThis);
