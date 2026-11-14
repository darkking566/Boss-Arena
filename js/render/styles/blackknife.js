'use strict';
// Boss 造型：黑刀刺客 ／ 黑刀首領・亞勒托（《艾爾登法環》）
// 造型考據自官方設定稿（bk-ref-001.jpg）與實機模型（docs/research/blackknife/）：
//   ・半透明「黑夜面紗」（Concealing Veil）：7 道隨步伐與迴旋飄動的多層次銀藍半透明薄紗披風
//   ・無聲銀鱗鎖子甲：修長稀人女性身形、暗銀魚鱗胸甲、束腰皮甲與雕花銀護肩
//   ・尖頂刺客兜帽：深邃暗影面容，一階段透出冰冷銀藍雙眸，二階段（首領亞勒托）燃起猩紅死印眼芒與光痕
//   ・扭曲黑刀（Black Knife）：環首刀柄、如焦木般扭曲鋸齒的漆黑刀身、中央鏤空血槽常駐「命定之死」紅黑火舌；支援反手握持（預設）與正手突刺切換
// 逐招關鍵幀動畫（pace + build + pick）：
//   ・每個出手動作（hit / dash / proj / bk_ambush / bk_grab_strike）驅動持刀前伸、正反手翻轉、軀幹扭轉、360° 旋身、蹲伏、騰空躍起與披風飄揚
//   ・地面層（decor）繪製蓄力刀尖星芒、死亡盧恩法陣、疾馳風切線，以及擊後殘留的黑紅月牙刀軌与十字裂光
//   ・hidden()：跳劈（裂地暴刺／死滅風暴／大招）期間繪製 3D 拋物線高空翻騰飛躍身影、地面陰影與落點死亡盧恩準星
//   ・under()：繪製黑夜面紗殘影誘餌（b._decoys）與敵人身上的「命定之死・百足傷環」咒印
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  const TAU = U.TAU, PI = Math.PI;
  const TRIG = { hit: 1, dash: 1, proj: 1, bk_ambush: 1, bk_ambush_strike: 1, bk_grab_strike: 1 };

  const CORE = '#ffe6ee', HOT = '#ff385c', CRIM = '#e0143c', RED = '#9e0822', INK = '#0a040d';
  const VEIL = '#9aa8d8', VEIL_BRIGHT = '#dce4ff', SILVER = '#b8c0d8', ARMOR = '#282638', ARMOR_DARK = '#14121e';

  const ease = u => 1 - (1 - u) * (1 - u);
  const lerp = (a, b, u) => a + (b - a) * u;
  const _ = undefined;

  // 姿態參數預設值：
  // rExt 右臂前伸、rAng 右腕偏角、lExt 左臂前伸、lAng 左臂偏角、spin 軀幹迴旋、
  // fwd 前衝位移、sq 蹲伏縮放、rev 反手握刀（1＝反手橫護、-1＝正手前指）、gl 死印刃光、cape 面紗後掠、hop 騰空高度
  const DEF = { rExt: 0.12, rAng: 0.15, lExt: 0.15, lAng: -0.25, spin: 0, fwd: 0, sq: 1, rev: 1, gl: 0.15, cape: 0, hop: 0 };
  const KEYS = Object.keys(DEF);

  // 關鍵幀定義：key: [蓄滿, 擊出, 起始=DEF, 收招=起始, 擊後衰減起點=擊出]
  // 1. 反手快斬（左右交替揮砍）
  const revSlash = (s, k) => ({
    rExt: [-0.45 * k, 0.95 * k],
    rAng: [-1.15 * s, 1.15 * s],
    lExt: [0.45, -0.25],
    lAng: [-0.4 * s, 0.55 * s],
    spin: [-0.45 * s * k, 0.42 * s * k],
    fwd: [-0.12 * k, 0.28 * k],
    sq: [0.92, 1.02],
    rev: [1, 1],
    gl: [0.55, 1],
    cape: [0.2, 0.75 * k],
  });
  const SLASH_L = revSlash(1, 1), SLASH_R = revSlash(-1, 1);
  const XSLASH = revSlash(1, 1.28);

  // 2. 正手突刺（將黑刀翻轉為正手往前貫穿）
  const THRUST = {
    rExt: [-0.65, 1.32], rAng: [0.08, 0], lExt: [0.55, -0.45], lAng: [-0.2, -0.8],
    spin: [0.35, -0.18], fwd: [-0.2, 0.52], sq: [0.86, 1.06], rev: [-1, -1, 1, 1, -1], gl: [0.8, 1], cape: [0.15, 0.95],
  };

  // 3. 挑空抹喉（低身拖刀蓄力 → 由下往上挑斬躍起）
  const UPCUT = {
    rExt: [-0.75, 1.15], rAng: [1.35, -1.1], lExt: [0.3, -0.35],
    spin: [0.55, -0.5], fwd: [-0.22, 0.42], sq: [0.78, 1.08], rev: [-1, -1], gl: [0.85, 1], cape: [0.5, 1], hop: [0, 0.45, 0, 0, 0.45],
  };

  // 4. 側翻車輪與首領 360° 旋刃
  const CARTWHEEL = {
    rExt: [0.55, 1.15], rAng: [-0.9, 0.9], lExt: [0.65, 0.85],
    spin: [-0.7, TAU - 0.7, 0, TAU, TAU - 0.7], fwd: [-0.08, 0.22], sq: [0.88, 1.04], rev: [1, 1], gl: [0.75, 1], cape: [0.6, 1], hop: [0.25, 0.55, 0, 0, 0.35],
  };
  const WHIRL = {
    rExt: [0.65, 1.2], rAng: [-0.6, 0.6], lExt: [0.7, 0.9],
    spin: [-0.9, TAU * 1.5 - 0.9, 0, TAU * 1.5, TAU * 1.5 - 0.9], fwd: [0, 0.18], sq: [0.86, 1.02], rev: [-1, -1], gl: [0.9, 1], cape: [0.8, 1],
  };

  // 5. 命定之死・死亡之刃（躍上半空懸停、高舉黑刀揮出紅黑月牙）
  const DEATH_WAVE = {
    rExt: [-0.7, 1.25], rAng: [-1.1, 0.45], lExt: [0.8, -0.3], lAng: [0.2, -0.7],
    spin: [0.45, -0.32], fwd: [-0.15, 0.18], sq: [0.9, 1.05], rev: [-1, -1, 1, 1, -1], gl: [1, 1], cape: [0.65, 1], hop: [0.85, 0.95, 0, 0, 0.7],
  };

  // 6. 後空翻擲暗刃
  const BACKFLIP = {
    rExt: [0.2, 0.65], lExt: [-0.6, 1.15], lAng: [-0.4, 0.1],
    spin: [-0.4, 0.25], fwd: [0.1, -0.35], sq: [0.84, 1], rev: [1, 1], gl: [0.6, 0.9], cape: [0.5, 1], hop: [0.6, 0.75, 0, 0, 0.5],
  };

  // 7. 衝刺／匿蹤步／抱殺突進
  const DASH_FWD = {
    rExt: [-0.55, -0.25], rAng: [0.85, 0.6], lExt: [0.5, 0.2],
    spin: [0.25, 0.1], fwd: [-0.15, 0.45], sq: [0.8, 0.92], rev: [1, 1], gl: [0.65, 0.9], cape: [0.4, 1],
  };
  const DASH_SIDE = {
    rExt: [0.25, 0.5], rAng: [-0.6, 0.4], lExt: [0.55, 0.75],
    spin: [-0.35, 0.35], sq: [0.86, 0.98], rev: [1, 1], gl: [0.5, 0.8], cape: [0.5, 0.95], hop: [0.15, 0.35],
  };
  const AMBUSH = {
    rExt: [-0.4, 0.35], rAng: [-0.8, -0.2], lExt: [0.6, 0.3],
    spin: [-0.5, 0.15], sq: [0.78, 0.96], rev: [1, 1], gl: [0.9, 1], cape: [0.7, 1],
  };
  const GRAB = {
    rExt: [-0.7, 1.35], rAng: [0.1, 0], lExt: [-0.5, 1.15], lAng: [-0.3, 0.15],
    spin: [0.3, -0.15], fwd: [-0.25, 0.6], sq: [0.8, 1.08], rev: [-1, -1], gl: [1, 1], cape: [0.3, 1],
  };
  const STORM_SLAM = {
    rExt: [-0.5, 1.1], rAng: [0, 0.2], lExt: [0.6, 0.8],
    spin: [0, TAU], fwd: [0, 0.15], sq: [0.8, 0.94], rev: [-1, -1], gl: [1, 1], cape: [0.8, 1],
  };

  function pick(e, sid) {
    const a = e.a;
    if (a.do === 'bk_grab_strike') return GRAB;
    if (a.do === 'bk_ambush' || a.do === 'bk_ambush_strike') return AMBUSH;
    if (a.do === 'proj') return sid === 'blade_of_death' ? DEATH_WAVE : BACKFLIP;
    if (a.do === 'dash') {
      if (a.dir === 'back') return BACKFLIP;
      const isSide = a.dir === 'side' || a.dir === 'left' || a.dir === 'right' || (typeof a.dir === 'number' && Math.abs(a.dir) > 0.4);
      if (isSide) return sid === 'acrobatic_cartwheel' ? CARTWHEEL : DASH_SIDE;
      return DASH_FWD;
    }
    if (sid === 'acrobatic_cartwheel') return CARTWHEEL;
    if (sid === 'alecto_whirl' && a.shape === 'circle') return WHIRL;
    if (sid === 'death_storm' || sid === 'diving_splitter' || sid === 'ult') return STORM_SLAM;
    if (sid === 'lunging_upcut' && a.shape === 'cone') return UPCUT;
    if (a.shape === 'rect') return THRUST;
    if (a.fx === 'bk_xslash' || e.last) return XSLASH;
    return (e.hi & 1) ? SLASH_R : SLASH_L;
  }

  const A = Object.assign({}, DEF), B = {};
  const P = { L: -1, N: -1, le: null, ne: null, wd: 0, sn: 0, sw: 0, since: 0 };
  const CACHE = new WeakMap();
  let TX = 0, TY = 0;

  function trigs(v) {
    let c = CACHE.get(v.actions);
    if (!c) {
      c = []; let hn = 0;
      for (const a of v.actions) if (TRIG[a.do]) c.push({ a, hi: a.do === 'hit' ? hn++ : -1, last: false });
      for (const e of c) e.last = e.hi >= 0 && e.hi === hn - 1;
      c.sort((x, y) => x.a.at - y.a.at);
      CACHE.set(v.actions, c);
    }
    return c;
  }

  function pace(inst) {
    const c = trigs(inst.v), t = inst.t;
    let L = -1, N = -1;
    for (let i = 0; i < c.length; i++) {
      if (c[i].a.at <= t) L = i;
      else { N = i; break; }
    }
    P.L = L; P.N = N; P.le = L >= 0 ? c[L] : null; P.ne = N >= 0 ? c[N] : null;
    const endL = L >= 0 ? c[L].a.at : 0;
    P.since = L >= 0 ? t - endL : 0;
    P.sn = L >= 0 && P.since < 0.26 ? 1 - P.since / 0.26 : 0;
    P.wd = N >= 0 ? U.clamp((t - endL) / Math.max(0.05, c[N].a.at - endL), 0, 1) : 0;
  }

  function ev(O, e, mode, a, b) {
    for (const k of KEYS) {
      const x = e[k];
      if (!x) { O[k] = DEF[k]; continue; }
      const r0 = x[2] === _ ? DEF[k] : x[2], end = x[3] === _ ? r0 : x[3];
      O[k] = mode === 'snap' ? lerp(end, x[4] === _ ? x[1] : x[4], a)
        : mode === 'end' ? end
        : b > 0 ? lerp(x[0], x[1], b) : lerp(r0, x[0], a);
    }
  }

  function build(sid) {
    const eN = P.ne && pick(P.ne, sid), eL = P.le && pick(P.le, sid);
    P.sw = 0;
    if (eN) {
      P.sw = P.wd < 0.68 ? 0 : ease((P.wd - 0.68) / 0.32);
      ev(A, eN, 'wind', ease(Math.min(1, P.wd / 0.62)), P.sw);
      if (eL && P.sn > 0) {
        ev(B, eL, 'snap', P.sn);
        for (const k of KEYS) A[k] = lerp(A[k], B[k], P.sn);
      }
    } else if (eL) {
      ev(A, eL, P.sn > 0 ? 'snap' : 'end', P.sn);
    }
  }

  // 對撞連拚（R.rally）姿態
  function rallyPose(ry, r) {
    const L = r * 2.35, fwd = 0.12 * ry.s - 0.05 * (1 - ry.s), c = ry.c - fwd * r;
    const e = lerp(-0.25, U.clamp(((c - 0.65 * L) / r - 0.5) / 0.65, -0.4, 1.25), ry.s);
    const hx = r * (0.48 + 0.62 * e), hy = r * (0.56 - 0.25 * Math.max(e, 0));
    A.rExt = e; A.fwd = fwd; A.rev = -1;
    A.rAng = Math.atan2(-hy, c - hx) + ry.off;
    A.spin = ry.off * 0.22; A.gl = 0.4 + 0.6 * ry.s; A.cape = 0.65 * ry.s;
  }

  function tipOf(r) {
    const hx = r * (0.48 + 0.62 * A.rExt), hy = r * (0.56 - 0.24 * Math.max(A.rExt, 0));
    const bladeAng = A.rAng + (A.rev > 0 ? PI * 0.78 : 0);
    const L = r * 2.25;
    TX = A.fwd * r + hx + Math.cos(bladeAng) * L;
    TY = hy + Math.sin(bladeAng) * L;
  }

  // ───────── 地面與刀軌裝飾層（decor）─────────
  function ring(ctx, x, y, rad, a, col, w) {
    ctx.strokeStyle = hexA(col, a); ctx.lineWidth = w;
    ctx.beginPath(); ctx.arc(x, y, Math.max(1, rad), 0, TAU); ctx.stroke();
  }

  // 黑紅雙層月牙刀軌（外層深淵黑底、中層猩紅死焰、內層銀白亮芯）
  function deathCrescent(ctx, rad, a0, a1, a, w) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = hexA(INK, 0.78 * a);
    ctx.lineWidth = w * 2.8;
    ctx.beginPath(); ctx.arc(0, 0, rad, a0, a1); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA(CRIM, 0.85 * a);
    ctx.lineWidth = w * 1.5;
    ctx.beginPath(); ctx.arc(0, 0, rad, a0, a1); ctx.stroke();
    ctx.strokeStyle = hexA(CORE, 0.9 * a);
    ctx.lineWidth = w * 0.55;
    ctx.beginPath(); ctx.arc(0, 0, rad * 0.97, a0, a1); ctx.stroke();
    ctx.restore();
  }

  function starGlint(ctx, x, y, len, a, col) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.fillStyle = hexA(col, 0.35 * a);
    ctx.beginPath(); ctx.arc(x, y, len * 0.65, 0, TAU); ctx.fill();
    for (const [w, c, al] of [[3.8, col, 0.75], [1.4, CORE, 0.95]]) {
      ctx.strokeStyle = hexA(c, al * a); ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x - len, y); ctx.lineTo(x + len, y);
      ctx.moveTo(x, y - len); ctx.lineTo(x, y + len);
      ctx.stroke();
    }
    ctx.restore();
  }

  function speedlines(ctx, x0, len, n, gap, col, a) {
    ctx.strokeStyle = hexA(col, a); ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const y = (i - (n - 1) / 2) * gap;
      const l = len * (1 - Math.abs(i - (n - 1) / 2) * 0.16);
      ctx.moveTo(x0, y); ctx.lineTo(x0 - l, y);
    }
    ctx.stroke();
  }

  // 繪製死亡盧恩紋章（百足傷環／下彎新月與垂直死印）
  function drawRuneSigil(ctx, x, y, rad, a, rot) {
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.lineCap = 'round';
    // 黑底襯線
    ctx.strokeStyle = hexA(INK, 0.75 * a);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-rad * 0.95, 0); ctx.lineTo(rad * 0.95, 0);
    ctx.arc(0, 0, rad * 0.72, -PI * 0.42, PI * 0.42);
    ctx.stroke();
    // 猩紅亮芒
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA(CRIM, 0.9 * a);
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-rad * 0.95, 0); ctx.lineTo(rad * 0.95, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, rad * 0.72, -PI * 0.42, PI * 0.42);
    ctx.stroke();
    // 百足短棘
    ctx.strokeStyle = hexA(HOT, 0.75 * a);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      const an = i * 0.22;
      const r0 = rad * 0.62, r1 = rad * 0.84;
      ctx.moveTo(Math.cos(an) * r0, Math.sin(an) * r0);
      ctx.lineTo(Math.cos(an) * r1, Math.sin(an) * r1);
    }
    ctx.stroke();
    ctx.restore();
  }

  function windupDecor(ctx, sid, r, e, wd, t) {
    const a = e.a;
    if (a.do === 'hit' || a.do === 'bk_grab_strike') {
      tipOf(r);
      starGlint(ctx, TX, TY, (a.do === 'bk_grab_strike' ? 14 : 9) * wd + 3, wd, CRIM);
      if (a.do === 'bk_grab_strike' || sid === 'death_storm' || sid === 'alecto_whirl') {
        drawRuneSigil(ctx, 0, 0, r * (1.2 + 0.6 * wd), 0.75 * wd, t * 2);
      }
    } else if (a.do === 'proj') {
      tipOf(r);
      starGlint(ctx, TX, TY, 13 * wd + 4, wd, HOT);
      drawRuneSigil(ctx, 0, 0, r * (1.8 - 0.4 * wd), 0.8 * wd, 0);
    } else if (a.do === 'dash') {
      speedlines(ctx, -r * 0.4, r * 2.4 * wd, 5, r * 0.24, VEIL, 0.55 * wd);
    } else if (a.do === 'bk_ambush' || a.do === 'bk_ambush_strike') {
      ctx.save();
      ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 55;
      ring(ctx, 0, 0, r * (2.2 - 0.8 * wd), 0.65 * wd, VEIL, 2.2);
      ctx.restore();
    }
  }

  function snapDecor(ctx, sid, r, e, k) {
    const a = e.a, ex = 1 - k;
    if (a.do === 'hit') {
      if (a.shape === 'rect') {
        const len = (a.len || 210) * 0.82, x1 = r * 0.6 + (len - r * 0.6) * Math.min(1, ex * 3.5);
        ctx.save();
        ctx.strokeStyle = hexA(INK, 0.75 * k); ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(r * 0.5, 0); ctx.lineTo(x1, 0); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = hexA(CRIM, 0.85 * k); ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(r * 0.5, 0); ctx.lineTo(x1, 0); ctx.stroke();
        ctx.restore();
        starGlint(ctx, x1, 0, 14 * k + 4, k, HOT);
      } else if (a.shape === 'circle') {
        const rad = Math.min(a.r || 155, r * 4.2) * 0.85;
        deathCrescent(ctx, rad, ex * 4, ex * 4 + PI * 1.45, k, 4.5);
        deathCrescent(ctx, rad * 0.78, ex * 4 + PI, ex * 4 + PI * 2.35, 0.85 * k, 3.5);
      } else {
        const half = Math.min(a.arc || 2.1, 2.8) * 0.5;
        const rad = Math.min(a.r || 180, r * 3.8) * 0.82;
        const s = (e.hi & 1) ? -1 : 1;
        const from = -half * s, to = lerp(from, -from, Math.min(1, ex * 3.6));
        deathCrescent(ctx, rad, Math.min(from, to), Math.max(from, to), k, e.last ? 5 : 3.8);
        if (a.fx === 'bk_xslash' || e.last) {
          deathCrescent(ctx, rad * 0.84, -half * 0.8, half * 0.8, 0.8 * k, 3.2);
        }
      }
    } else if (a.do === 'dash') {
      speedlines(ctx, -r * 0.5 - ex * r * 1.6, 85 * k, 5, r * 0.25, VEIL, 0.65 * k);
      ring(ctx, 0, 0, r * (1.0 + 1.4 * ex), 0.45 * k, CRIM, 2);
    } else if (a.do === 'bk_ambush' || a.do === 'bk_ambush_strike') {
      ring(ctx, 0, 0, r * (1.1 + 1.8 * ex), 0.7 * k, VEIL, 3);
      starGlint(ctx, r * 0.4, 0, 15 * k, k, CRIM);
    }
  }

  function decor(ctx, sid, r, t, shade) {
    if (shade) return;
    if (P.ne && P.wd > 0) windupDecor(ctx, sid, r, P.ne, P.wd, t);
    if (P.le) {
      const k = U.clamp(1 - P.since / 0.32, 0, 1);
      if (k > 0) snapDecor(ctx, sid, r, P.le, k);
    }
  }

  // ───────── 角色本體解剖與裝備繪製 ─────────
  // 1. 黑夜面紗（7 道隨風與動作搖曳的半透明銀藍薄紗長條）
  function drawVeilCloak(ctx, r, t, shade, p2, cape) {
    const strips = 7;
    const baseLen = r * (2.05 + 0.85 * cape);
    for (let i = 0; i < strips; i++) {
      const u = (i / (strips - 1)) - 0.5; // -0.5 ~ +0.5
      const y0 = u * r * 1.38;
      const wave1 = Math.sin(t * 5.2 + i * 0.95) * r * 0.22 * (1 - cape * 0.55);
      const wave2 = Math.cos(t * 4.4 + i * 1.15) * r * 0.34 * (1 - cape * 0.45);
      const len = baseLen * (1 - Math.abs(u) * 0.28);
      const w0 = r * 0.26, w1 = r * 0.12;
      const x1 = -len, y1 = y0 * (1.35 - cape * 0.35) + wave2;
      const cx = -len * 0.52, cy = y0 * 1.1 + wave1;

      if (shade) {
        ctx.fillStyle = i % 2 ? 'rgba(18,16,30,0.72)' : 'rgba(10,8,18,0.82)';
      } else {
        const g = ctx.createLinearGradient(0, y0, x1, y1);
        if (i % 2 === 0) {
          g.addColorStop(0, 'rgba(38,36,56,0.88)');
          g.addColorStop(0.55, 'rgba(118,130,175,0.46)');
          g.addColorStop(1, p2 ? 'rgba(224,20,60,0.38)' : 'rgba(165,178,225,0.14)');
        } else {
          g.addColorStop(0, 'rgba(24,22,36,0.92)');
          g.addColorStop(0.6, 'rgba(72,78,112,0.52)');
          g.addColorStop(1, p2 ? 'rgba(140,10,34,0.32)' : 'rgba(130,142,190,0.18)');
        }
        ctx.fillStyle = g;
      }
      ctx.beginPath();
      ctx.moveTo(-r * 0.15, y0 - w0);
      ctx.quadraticCurveTo(cx, cy - w1 * 1.3, x1, y1);
      ctx.quadraticCurveTo(cx, cy + w1 * 1.3, -r * 0.15, y0 + w0);
      ctx.closePath();
      ctx.fill();

      // 半透明銀藍紗緣細線
      ctx.strokeStyle = shade ? hexA(CRIM, 0.32) : hexA(i % 2 === 0 ? VEIL_BRIGHT : VEIL, 0.36);
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }
  }

  // 2. 二階段：黑刀首領亞勒托的命定之死紅黑光翼
  function drawDeathWings(ctx, r, t, gl) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const fl = Math.sin(t * 7.5 + i * 0.8 + s) * 0.08;
        const ang = s * (0.55 + i * 0.24 + fl);
        const len = r * (2.4 - i * 0.28) * (0.95 + 0.15 * gl);
        const x1 = -Math.cos(ang) * len, y1 = Math.sin(ang) * len;
        const cx = -r * 0.5, cy = s * r * (0.9 + i * 0.22);
        ctx.fillStyle = hexA(i === 0 ? HOT : CRIM, 0.26 - i * 0.04);
        ctx.beginPath();
        ctx.moveTo(-r * 0.15, s * r * 0.35);
        ctx.quadraticCurveTo(cx, cy, x1, y1);
        ctx.quadraticCurveTo(cx - r * 0.25, cy * 0.65, -r * 0.35, s * r * 0.15);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // 3. 雙段關節手臂與銀護腕（s = -1 左臂 / +1 右臂）
  function drawArm(ctx, r, s, ext, ang, shade, p2, hasSideDagger) {
    const sx = r * 0.06, sy = s * r * 0.68;
    const hx = r * (0.48 + 0.58 * ext), hy = s * r * (0.54 - 0.22 * Math.max(ext, 0)) + Math.sin(ang) * r * 0.22;
    const ex = (sx + hx) * 0.5 - r * 0.12, ey = (sy + hy) * 0.5 + s * r * 0.18;

    // 上臂與前臂
    ctx.strokeStyle = shade ? '#07060c' : ARMOR_DARK;
    ctx.lineWidth = r * 0.23;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();

    // 精工銀鱗護腕
    ctx.strokeStyle = shade ? '#1c1018' : '#6c728e';
    ctx.lineWidth = r * 0.25;
    ctx.beginPath();
    ctx.moveTo(lerp(ex, hx, 0.35), lerp(ey, hy, 0.35));
    ctx.lineTo(lerp(ex, hx, 0.88), lerp(ey, hy, 0.88));
    ctx.stroke();

    // 手套拳頭
    ctx.fillStyle = shade ? '#050408' : '#1e1d2b';
    ctx.beginPath();
    ctx.arc(hx, hy, r * 0.15, 0, TAU);
    ctx.fill();

    // 左手副暗刃／死亡盧恩微光
    if (s === -1 && hasSideDagger && !shade) {
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(ang - 0.35);
      ctx.fillStyle = '#181422';
      ctx.strokeStyle = p2 ? CRIM : SILVER;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.06);
      ctx.lineTo(r * 0.78, 0);
      ctx.lineTo(0, r * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    return [hx, hy];
  }

  // 4. 傳奇武器：黑刀（Black Knife）——環首刀柄、扭曲焦木狀鋸齒黑刃、鏤空血槽與命定之死紅黑火舌
  function drawBlackKnife(ctx, r, hx, hy, t, shade, p2, ry) {
    ctx.save();
    ctx.translate(hx, hy);
    // rev > 0 為反手握持（刀尖朝身後斜側），rev < 0 為正手突刺（刀尖朝前）
    const gripRot = A.rAng + (A.rev > 0 ? PI * 0.76 : 0);
    ctx.rotate(gripRot);

    const L = r * 2.32, W = r * 0.22;
    if (ry && !shade) R.bladeTrail(ctx, ry, L, CRIM);

    // 刀身外圍命定之死紅黑光暈
    const glowAmt = Math.max(p2 ? 0.65 : 0.28, A.gl);
    if (!shade && glowAmt > 0.08) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = hexA(CRIM, 0.32 + 0.38 * glowAmt);
      ctx.lineWidth = r * (0.38 + 0.25 * glowAmt);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(r * 0.18, 0);
      ctx.lineTo(L * 0.96, 0);
      ctx.stroke();
      ctx.restore();
    }

    // 環首刀柄（Ring Pommel）與新月護手
    ctx.strokeStyle = shade ? CRIM : SILVER;
    ctx.fillStyle = shade ? '#08040a' : '#262436';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-r * 0.24, 0, r * 0.13, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // 握柄與弧形雙翼護手
    ctx.fillStyle = shade ? '#120810' : '#3a364e';
    ctx.beginPath();
    ctx.moveTo(-r * 0.12, -r * 0.07);
    ctx.lineTo(r * 0.16, -r * 0.09);
    ctx.lineTo(r * 0.22, -W * 1.25);
    ctx.lineTo(r * 0.30, 0);
    ctx.lineTo(r * 0.22, W * 1.25);
    ctx.lineTo(r * 0.16, r * 0.09);
    ctx.lineTo(-r * 0.12, r * 0.07);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 扭曲鋸齒黑曜刀身（如焦黑枯枝般的不對稱波浪形輪廓，考據自 bk-ref-001.jpg）
    ctx.fillStyle = shade ? '#050208' : INK;
    ctx.beginPath();
    ctx.moveTo(r * 0.22, -W * 0.85);
    ctx.lineTo(L * 0.36, -W * 1.05);
    ctx.lineTo(L * 0.44, -W * 0.68);
    ctx.lineTo(L * 0.66, -W * 0.92);
    ctx.lineTo(L * 0.82, -W * 0.52);
    ctx.lineTo(L, 0); // 銳利刀尖
    ctx.lineTo(L * 0.78, W * 0.68);
    ctx.lineTo(L * 0.52, W * 0.48);
    ctx.lineTo(L * 0.30, W * 0.85);
    ctx.lineTo(r * 0.22, W * 0.75);
    ctx.closePath();
    ctx.fill();

    // 刀鋒銀白與緋紅冷光邊緣
    ctx.strokeStyle = shade ? CRIM : (p2 || A.gl > 0.5 ? HOT : '#7a7896');
    ctx.lineWidth = 1.25;
    ctx.stroke();

    // 刀身中央鏤空死亡盧恩血槽（Glowing Crimson Channel）
    ctx.save();
    if (!shade) ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA(CRIM, shade ? 0.75 : 0.7 + 0.3 * glowAmt);
    ctx.lineWidth = r * 0.11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.30, 0);
    ctx.quadraticCurveTo(L * 0.55, -W * 0.18, L * 0.92, 0);
    ctx.stroke();

    ctx.strokeStyle = hexA(CORE, shade ? 0.5 : 0.65 + 0.3 * glowAmt);
    ctx.lineWidth = r * 0.045;
    ctx.beginPath();
    ctx.moveTo(r * 0.32, 0);
    ctx.quadraticCurveTo(L * 0.55, -W * 0.18, L * 0.88, 0);
    ctx.stroke();

    // 二階段或技能蓄力時，刀身竄出的命定之死紅黑火舌
    if (!shade && (p2 || A.gl > 0.45)) {
      const licks = p2 ? 5 : 3;
      for (let i = 0; i < licks; i++) {
        const u = 0.25 + (i / licks) * 0.65;
        const fl = Math.sin(t * 18 + i * 2.1) * W * 0.95;
        ctx.strokeStyle = hexA(i % 2 ? HOT : CRIM, 0.75);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(L * u, 0);
        ctx.quadraticCurveTo(L * (u + 0.08), fl, L * (u + 0.16), fl * 0.4);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.restore();
  }

  // ───────── 主繪製函式 body() ─────────
  function body(ctx, o, t, { def, r }) {
    const shade = !!o.shade, p2 = o.phase === 2;
    const stag = o.state === 'stagger' || o.state === 'stun';
    const stealth = !shade && !!(o.statuses && BD.hasStatus(o, 'blackveil'));
    const inst = !stag && o.inst && o.inst.skill && o.inst.v && o.inst.v.actions ? o.inst : null;
    const sid = inst ? inst.skill.id : '';

    for (const k of KEYS) A[k] = DEF[k];
    A.rExt = 0.12 + Math.sin(t * 3.2) * 0.05;
    A.lExt = 0.15 - Math.sin(t * 3.2) * 0.05;
    P.ne = P.le = null; P.wd = P.sn = P.since = 0;
    if (inst) { pace(inst); build(sid); }
    const dh = inst && inst.dash && inst.dash.t < inst.dash.dur ? inst.dash : null;
    if (sid === 'acrobatic_cartwheel' && dh) {
      const cu = U.clamp(dh.t / Math.max(0.05, dh.dur), 0, 1);
      A.spin = cu * TAU;
      A.hop = Math.max(A.hop, Math.sin(cu * PI) * 0.72);
      A.cape = 1;
      A.gl = 1;
    } else if (sid === 'backflip_throw' && dh) {
      const bu = U.clamp(dh.t / Math.max(0.05, dh.dur), 0, 1);
      A.hop = Math.max(A.hop, Math.sin(bu * PI) * 0.78);
      A.cape = 1;
    }
    const ry = !stag && R.rally(o);
    if (ry) rallyPose(ry, r);

    ctx.save();
    // 黑夜面紗隱身期間：身體呈半透明銀藍折射閃爍
    if (stealth) {
      ctx.globalAlpha *= 0.44 + 0.16 * Math.sin(t * 20);
    }

    if (inst && !shade) decor(ctx, sid, r, t, shade);

    // 地面陰影（若角色騰空 hop > 0，陰影留在地面並微幅縮小）
    if (!shade && o.world) {
      const shScale = 1 - Math.min(0.45, A.hop * 0.35);
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.beginPath();
      ctx.ellipse(A.fwd * r - A.hop * r * 0.3, A.hop * r * 0.45 + 4, r * 1.05 * shScale, r * 0.82 * shScale, 0, 0, TAU);
      ctx.fill();
    }

    // 套用前衝、騰空高度與蹲伏縮放
    if (inst || ry) {
      ctx.translate((A.fwd + A.hop * 0.22) * r, -A.hop * r * 0.38);
      const sc = (1 + A.hop * 0.18);
      if (A.sq !== 1 || A.hop > 0) ctx.scale(A.sq * sc, (1 + (1 - A.sq) * 0.48) * sc);
    }
    // 側翻迴旋期間：在身體周圍畫出銀藍與猩紅交織的側手翻車輪光環
    if (sid === 'acrobatic_cartwheel' && dh && !shade) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (let i = 0; i < 2; i++) {
        const a0 = A.spin + i * PI;
        ctx.strokeStyle = i === 0 ? hexA(CRIM, 0.78) : hexA(VEIL_BRIGHT, 0.72);
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.48, a0, a0 + PI * 0.72);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (A.spin) ctx.rotate(A.spin);

    const tag = r + ':' + (shade ? 's' : p2 ? 'p2' : 'p1');

    // 1. 二階段命定之死紅黑光翼（畫在披風與軀幹底下）
    if (p2 && !shade) drawDeathWings(ctx, r, t, A.gl);

    // 2. 半透明黑夜面紗披風（7 道動態飄帶）
    drawVeilCloak(ctx, r, t, shade, p2, A.cape);

    // 3. 左臂（平衡手／副暗刃）
    drawArm(ctx, r, -1, A.lExt, A.lAng, shade, p2, true);

    // 4. 軀幹：修長稀人女性銀鱗鎖子甲、束腰與下擺裙甲（快取）
    R.blit(ctx, 'body:blackknife:torso:' + tag, r * 1.6 + 8, r * 2.2 + 8, r * 0.8 + 4, r * 1.1 + 4, g => {
      // 下擺兩側銀鱗裙甲（Tassets）
      g.fillStyle = shade ? '#07060c' : ARMOR_DARK;
      g.strokeStyle = shade ? CRIM : '#6e7694';
      g.lineWidth = 1.2;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(-r * 0.1, s * r * 0.55);
        g.quadraticCurveTo(-r * 0.55, s * r * 0.92, -r * 0.68, s * r * 0.72);
        g.quadraticCurveTo(-r * 0.45, s * r * 0.35, -r * 0.05, s * r * 0.32);
        g.closePath();
        g.fill();
        g.stroke();
      }

      // 主胸甲（暗銀靛青漸層橢圓）
      const gr = g.createRadialGradient(r * 0.08, 0, 2, 0, 0, r * 0.92);
      gr.addColorStop(0, shade ? '#18101c' : '#464460');
      gr.addColorStop(0.65, shade ? '#0a060e' : ARMOR);
      gr.addColorStop(1, shade ? '#040206' : ARMOR_DARK);
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(0, 0, r * 0.56, r * 0.84, 0, 0, TAU);
      g.fill();
      g.strokeStyle = shade ? CRIM : '#828aa8';
      g.lineWidth = 1.4;
      g.stroke();

      // 魚鱗鎖子甲紋理弧線与胸前銀飾交叉帶
      if (!shade) {
        g.strokeStyle = 'rgba(184,192,216,0.34)';
        g.lineWidth = 1.0;
        for (let row = -2; row <= 2; row++) {
          g.beginPath();
          g.arc(-r * 0.08, row * r * 0.22, r * 0.24, -0.8, 0.8);
          g.stroke();
        }
        g.strokeStyle = p2 ? hexA(CRIM, 0.65) : 'rgba(200,210,235,0.55)';
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(-r * 0.35, -r * 0.48); g.lineTo(r * 0.28, r * 0.42);
        g.moveTo(-r * 0.35, r * 0.48); g.lineTo(r * 0.28, -r * 0.42);
        g.stroke();
      }
    });

    // 5. 右臂與傳奇武器「黑刀」
    const [rx, ryArm] = drawArm(ctx, r, 1, A.rExt, A.rAng, shade, p2, false);
    drawBlackKnife(ctx, r, rx, ryArm, t, shade, p2, ry);

    // 6. 精工雕花銀護肩（Pauldrons，壓住雙肩關節，快取）
    R.blit(ctx, 'body:blackknife:pauldrons:' + tag, r * 1.5 + 8, r * 2.4 + 8, r * 0.75 + 4, r * 1.2 + 4, g => {
      for (const s of [-1, 1]) {
        const py = s * r * 0.74;
        const gr = g.createLinearGradient(r * 0.3, py, -r * 0.45, py);
        gr.addColorStop(0, shade ? '#1c0c14' : '#7c84a4');
        gr.addColorStop(0.5, shade ? '#0c060c' : '#3a3850');
        gr.addColorStop(1, shade ? '#040206' : '#1c1a28');
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(r * 0.28, s * r * 0.42);
        g.quadraticCurveTo(r * 0.32, s * r * 0.92, -r * 0.08, s * r * 1.04);
        g.lineTo(-r * 0.46, s * r * 0.86);
        g.quadraticCurveTo(-r * 0.32, s * r * 0.48, r * 0.28, s * r * 0.42);
        g.closePath();
        g.fill();
        g.strokeStyle = shade ? CRIM : SILVER;
        g.lineWidth = 1.3;
        g.stroke();

        // 護肩內層銀藍浮雕弧線
        g.strokeStyle = shade ? hexA(CRIM, 0.5) : 'rgba(220,228,255,0.48)';
        g.lineWidth = 1.0;
        g.beginPath();
        g.moveTo(r * 0.14, s * r * 0.54);
        g.quadraticCurveTo(r * 0.12, s * r * 0.82, -r * 0.26, s * r * 0.82);
        g.stroke();
      }
    });

    // 7. 尖頂刺客兜帽與黑夜面紗頭罩（快取）
    R.blit(ctx, 'body:blackknife:hood:' + tag, r * 1.6 + 8, r * 1.4 + 8, r * 0.85 + 4, r * 0.7 + 4, g => {
      // 兜帽外輪廓（前方微拱罩住臉龐、後方收尖如鳥喙刺客帽）
      const gr = g.createRadialGradient(r * 0.12, -r * 0.08, 2, -r * 0.05, 0, r * 0.62);
      gr.addColorStop(0, shade ? '#1a0c14' : '#4a4864');
      gr.addColorStop(0.6, shade ? '#0c060c' : '#262438');
      gr.addColorStop(1, shade ? '#040206' : '#12101c');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(r * 0.48, 0);
      g.quadraticCurveTo(r * 0.42, -r * 0.52, -r * 0.12, -r * 0.48);
      g.lineTo(-r * 0.74, 0); // 兜帽後掠尖頂
      g.lineTo(-r * 0.12, r * 0.48);
      g.quadraticCurveTo(r * 0.42, r * 0.52, r * 0.48, 0);
      g.closePath();
      g.fill();

      // 兜帽銀藍鑲邊與中央脊線
      g.strokeStyle = shade ? CRIM : VEIL;
      g.lineWidth = 1.3;
      g.stroke();
      g.beginPath();
      g.moveTo(-r * 0.72, 0);
      g.lineTo(r * 0.44, 0);
      g.stroke();

      // 帽簷下的深邃臉部黑影凹槽
      g.fillStyle = '#040208';
      g.beginPath();
      g.ellipse(r * 0.28, 0, r * 0.18, r * 0.32, 0, -PI * 0.5, PI * 0.5);
      g.fill();
    });

    // 8. 兜帽暗影中的雙眸寒光（一階段冰冷銀藍稀人眼芒；二階段亞勒托燃起猩紅死印眼芒與拖尾）
    const eyeCol = (p2 || shade || A.gl > 0.6) ? HOT : VEIL_BRIGHT;
    const eyeAlpha = Math.min(1, (p2 ? 0.85 + 0.15 * Math.sin(t * 10) : 0.78) + 0.22 * A.gl);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA(eyeCol, eyeAlpha);
    ctx.lineWidth = p2 ? 2.6 : 2.0;
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(r * 0.24, s * r * 0.10);
      ctx.lineTo(r * 0.36, s * r * 0.21);
      ctx.stroke();
      if (p2 && !shade) {
        ctx.strokeStyle = hexA(CRIM, 0.55);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(r * 0.24, s * r * 0.10);
        ctx.lineTo(-r * 0.18, s * r * 0.32);
        ctx.stroke();
        ctx.strokeStyle = hexA(eyeCol, eyeAlpha);
        ctx.lineWidth = 2.6;
      }
    }
    ctx.restore();

    ctx.restore();
  }

  // ───────── under()：黑夜面紗殘影誘餌（b._decoys）、二階段死亡盧恩領域、敵人身上的命定之死咒印 ─────────
  function under(ctx, b, t) {
    const w = b.world;
    if (!w) return;

    // 1. 二階段首領亞勒托腳下的命定之死暗紅氣場環
    if (b.phase === 2 && b.state !== 'dead' && !BD.getMod(b, 'untargetable')) {
      ctx.save();
      const pu = 0.7 + 0.3 * Math.sin(t * 5);
      ring(ctx, b.x, b.y, b.r * 1.45, 0.28 * pu, CRIM, 2);
      drawRuneSigil(ctx, b.x, b.y, b.r * 1.25, 0.24 * pu, t * 0.6);
      ctx.restore();
    }

    // 2. 繪製場上的黑夜面紗殘影誘餌（b._decoys）
    const decoys = b._decoys;
    if (decoys && decoys.length) {
      for (const d of decoys) {
        const left = d.until - w.time, age = w.time - d.t0;
        if (left <= 0) continue;
        const a = U.clamp(age / 0.1, 0, 1) * U.clamp(left / 0.35, 0, 1) * (0.68 + 0.14 * Math.sin(t * 14 + d.t0 * 9));
        ctx.save();
        ctx.globalAlpha *= a;
        ctx.fillStyle = 'rgba(8,6,16,0.48)';
        ctx.beginPath(); ctx.ellipse(d.x, d.y + 5, b.r * 1.1, b.r * 0.85, 0, 0, TAU); ctx.fill();
        ring(ctx, d.x, d.y, b.r * 1.15, 0.5, VEIL, 1.5);
        R.drawBossBody(ctx, {
          x: d.x, y: d.y, face: d.face, r: b.r, def: b.def,
          phase: b.phase, state: 'idle', inst: null, shade: true,
        }, t);
        ctx.restore();
      }
    }

    // 3. 在受「命定之死」（destineddeath）侵蝕的對手身上繪製「百足傷環／死亡盧恩」咒印
    for (const u of w.enemiesOf(b.team)) {
      if (u.state === 'dead' || !u.statuses) continue;
      const st = BD.getStatus(u, 'destineddeath');
      if (!st || st.rem <= 0) continue;
      const marks = (st.data && st.data.marks) || 1;
      const pu = 0.75 + 0.25 * Math.sin(t * 8);
      ctx.save();
      // 腳下暗紅侵蝕環
      ring(ctx, u.x, u.y, u.r + 12, 0.45 * pu, CRIM, 2.2);
      // 頭頂／身周浮現的死亡盧恩百足傷環
      drawRuneSigil(ctx, u.x, u.y, u.r + 10, (0.45 + marks * 0.15) * pu, -PI / 2 + Math.sin(t * 2) * 0.15);
      ctx.restore();
    }
  }

  // ───────── hidden()：高空跳劈（裂地暴刺／死滅風暴／大招）3D 拋物線飛躍演出 ─────────
  function hidden(ctx, b, t) {
    const inst = b.inst;
    if (!inst || !inst.v || !inst.v.actions) return;
    const acts = inst.v.actions;
    let hAct = null, lAct = null;
    for (const a of acts) {
      if (a.do === 'hide' && a.at <= inst.t) hAct = a;
      if (a.do === 'land' && a.at >= inst.t) { lAct = a; break; }
    }
    if (!hAct || !lAct) return;

    const p = U.clamp((inst.t - hAct.at) / Math.max(0.1, lAct.at - hAct.at), 0, 1);
    const q = p * p * (3 - 2 * p);
    const mark = (inst.marks && lAct.mark && inst.marks[lAct.mark]) || inst.mark || b.enemy || b;
    const x = lerp(b.x, mark.x, q), y = lerp(b.y, mark.y, q);
    const arcH = Math.sin(p * PI) * b.r * 4.5;
    const sc = 1 + Math.sin(p * PI) * 0.36;
    const face = Math.atan2(mark.y - b.y, mark.x - b.x) + p * TAU; // 空中翻騰一圈

    // 1. 落點地面：旋轉收束的「死亡盧恩」鎖定準星
    ctx.save();
    drawRuneSigil(ctx, mark.x, mark.y, b.r * (2.6 - 1.1 * p), 0.35 + 0.55 * p, t * 3);
    ring(ctx, mark.x, mark.y, b.r * (2.8 - 1.4 * p), 0.5 * p, CRIM, 2.5);
    ctx.restore();

    // 2. 地面投影陰影（隨高度縮小變淡）
    ctx.save();
    const shScale = 1 - Math.sin(p * PI) * 0.45;
    ctx.fillStyle = `rgba(0,0,0,${(0.45 * shScale).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(x, y + 6, b.r * 1.15 * shScale, b.r * 0.85 * shScale, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // 3. 高空翻騰的黑刀刺客本體與拖曳的紅黑死焰光尾
    ctx.save();
    ctx.translate(x, y - arcH);
    ctx.scale(sc, sc);
    ctx.rotate(face);
    // 空中紅黑死焰殘影環
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ring(ctx, 0, 0, b.r * 1.35, 0.55, CRIM, 3.5);
    ctx.restore();
    body(ctx, {
      x: 0, y: 0, face: 0, r: b.r, def: b.def,
      phase: b.phase, state: 'skill', inst: null, world: null,
    }, t, { def: b.def, r: b.r });
    ctx.restore();
  }

  // ───────── transition()：二階段「黑刀首領・亞勒托」覺醒演出 ─────────
  function transition(ctx, b, t) {
    const u = U.clamp(1 - (b.stateTimer || 0) / 2.6, 0, 1);
    const lift = Math.sin(u * PI) * b.r * 1.35;
    ctx.save();
    // 地面巨型死亡盧恩法陣亮起
    drawRuneSigil(ctx, b.x, b.y, b.r * (1.8 + 1.8 * u), 0.4 + 0.5 * Math.sin(u * PI), t * 1.5);
    ring(ctx, b.x, b.y, b.r * (1.4 + 2.2 * u), 0.65, CRIM, 3.5);
    // 地面陰影
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y + 6, b.r * 1.1, b.r * 0.82, 0, 0, TAU);
    ctx.fill();
    // 懸浮半空高舉黑刀的亞勒托
    ctx.translate(b.x, b.y - lift);
    ctx.rotate(b.face);
    body(ctx, {
      x: 0, y: 0, face: 0, r: b.r, def: b.def,
      phase: 2, state: 'idle', inst: null, world: null,
    }, t, { def: b.def, r: b.r });
    ctx.restore();
    return true;
  }

  R.defineBossStyle('blackknife', { body, under, hidden, transition });

  // ───────── 投射物繪圖：命定之死・死亡之刃（deathblade）與黑刀暗刃（blackknife_dagger）─────────
  // 注意：world.js 的 drawProjectiles 在呼叫 R.projStyles[p.kind](ctx, p, t) 前，
  // 已經執行過 ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
  // 因此這裡直接以區域座標 (0, 0) 為中心、+x 為飛行正前方進行繪製！
  R.projStyles.deathblade = function (ctx, p, t) {
    const k = Math.max(30, (p.r || 36) * 1.38);
    const pulse = 0.88 + 0.12 * Math.sin(t * 28 + (p.seq || 0));
    const crescent = (sx, sy) => {
      ctx.beginPath();
      ctx.moveTo(-0.58 * k * sx, -1.38 * k * sy);
      ctx.bezierCurveTo(1.22 * k * sx, -0.98 * k * sy, 1.22 * k * sx, 0.98 * k * sy, -0.58 * k * sx, 1.38 * k * sy);
      ctx.bezierCurveTo(0.52 * k * sx, 0.68 * k * sy, 0.52 * k * sx, -0.68 * k * sy, -0.58 * k * sx, -1.38 * k * sy);
      ctx.closePath();
    };

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. 外層巨型猩紅死焰光暈
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(k * 0.18, 0, 2, 0, 0, k * 1.65);
    g.addColorStop(0, 'rgba(255,220,232,0.75)');
    g.addColorStop(0.38, 'rgba(224,20,60,0.52)');
    g.addColorStop(0.75, 'rgba(120,4,26,0.22)');
    g.addColorStop(1, 'rgba(40,0,8,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, k * 1.65, 0, TAU);
    ctx.fill();
    ctx.restore();

    // 2. 身後三道漸縮的紅黑月牙殘影 + 兩端尖角拖出的長長死焰尾流
    for (let i = 3; i >= 1; i--) {
      ctx.save();
      ctx.translate(-k * 0.62 * i, Math.sin(t * 22 + i * 1.6) * k * 0.06);
      ctx.fillStyle = i % 2 ? `rgba(224,20,60,${(0.34 - i * 0.07).toFixed(2)})` : `rgba(10,3,14,${(0.55 - i * 0.12).toFixed(2)})`;
      crescent(1 - i * 0.08, 1 - i * 0.05);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const sd of [-1, 1]) {
      const wg = ctx.createLinearGradient(-0.5 * k, 0, -k * 3.6, 0);
      wg.addColorStop(0, 'rgba(255,56,92,0.82)');
      wg.addColorStop(0.5, 'rgba(180,12,42,0.42)');
      wg.addColorStop(1, 'rgba(80,0,18,0)');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.moveTo(-0.48 * k, sd * 1.26 * k);
      ctx.lineTo(-k * 3.6, sd * 0.96 * k + Math.sin(t * 20 + sd) * k * 0.14);
      ctx.lineTo(-0.72 * k, sd * 1.44 * k);
      ctx.closePath();
      ctx.fill();
    }

    // 3. 外圈猩紅烈焰刀波光環
    ctx.fillStyle = `rgba(224,20,60,${(0.82 * pulse).toFixed(2)})`;
    ctx.strokeStyle = 'rgba(255,70,105,0.65)';
    ctx.lineWidth = k * 0.26;
    crescent(1.14, 1.08);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 4. 命定之死標誌性的「深淵漆黑刀核」主體（黑芯紅邊）
    ctx.fillStyle = '#07020a';
    ctx.strokeStyle = CRIM;
    ctx.lineWidth = 3.2;
    crescent(0.98, 0.98);
    ctx.fill();
    ctx.stroke();

    // 5. 內層赤白死亡盧恩刃脈、前緣極亮白熱弧線與竄動的紅黑火舌
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,56,92,${(0.78 * pulse).toFixed(2)})`;
    crescent(0.72, 0.84);
    ctx.fill();

    ctx.strokeStyle = CORE;
    ctx.lineWidth = Math.max(3.2, k * 0.08);
    ctx.beginPath();
    ctx.moveTo(-0.52 * k, -1.30 * k);
    ctx.bezierCurveTo(1.18 * k, -0.94 * k, 1.18 * k, 0.94 * k, -0.52 * k, 1.30 * k);
    ctx.stroke();

    // 沿著彎月弧竄出的 7 道紅黑死焰火舌
    for (let i = -3; i <= 3; i++) {
      const an = i * 0.34;
      const bx = Math.cos(an) * k * 0.52, by = Math.sin(an) * k * 1.05;
      const fl = (0.38 + 0.18 * Math.sin(t * 26 + i * 2.1)) * k;
      ctx.strokeStyle = i % 2 === 0 ? CORE : HOT;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx - fl * 0.55, by + Math.sin(t * 19 + i) * 6, bx - fl, by * 1.08);
      ctx.stroke();
    }

    // 隨飛行飄散的死亡盧恩星火
    ctx.fillStyle = CORE;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(-0.56 * k, sd * 1.36 * k, Math.max(2.8, k * 0.07), 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < 5; i++) {
      const ph = (t * 2.5 + i * 0.21) % 1;
      const ex = -k * (0.35 + 2.4 * ph);
      const ey = (i % 2 ? 1 : -1) * k * (0.25 + 0.85 * ((i * 0.37) % 1));
      ctx.fillStyle = i % 2 ? HOT : CORE;
      ctx.beginPath();
      ctx.arc(ex, ey, Math.max(1.8, k * 0.055) * (1 - ph), 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  };

  R.projStyles.blackknife_dagger = function (ctx, p, t) {
    const r = Math.max(16, (p.r || 16) * 1.35);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. 命定之死黑紅雙層尾流與發光暈圈
    ctx.strokeStyle = 'rgba(10,3,14,0.82)';
    ctx.lineWidth = r * 0.42;
    ctx.beginPath();
    ctx.moveTo(-r * 2.6, 0);
    ctx.lineTo(r * 0.5, 0);
    ctx.stroke();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(r * 0.3, 0, 1, 0, 0, r * 1.7);
    g.addColorStop(0, 'rgba(255,230,238,0.75)');
    g.addColorStop(0.45, 'rgba(224,20,60,0.45)');
    g.addColorStop(1, 'rgba(120,0,24,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.7, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = hexA(CRIM, 0.88);
    ctx.lineWidth = r * 0.24;
    ctx.beginPath();
    ctx.moveTo(-r * 3.4, 0);
    ctx.lineTo(r * 1.1, 0);
    ctx.stroke();

    ctx.strokeStyle = CORE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-r * 1.8, 0);
    ctx.lineTo(r * 1.5, 0);
    ctx.stroke();

    // 刀尖破空紅黑小月牙刃風
    ctx.strokeStyle = hexA(HOT, 0.78);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(r * 0.35, 0, r * 0.88, -0.78, 0.78);
    ctx.stroke();
    ctx.restore();

    // 2. 扭曲黑刀飛刃本體（不對稱鋸齒漆黑刀身 + 鮮紅死印刃邊）
    ctx.fillStyle = INK;
    ctx.strokeStyle = HOT;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(r * 1.75, 0);
    ctx.lineTo(r * 0.65, -r * 0.34);
    ctx.lineTo(r * 0.15, -r * 0.22);
    ctx.lineTo(-r * 0.28, -r * 0.36);
    ctx.lineTo(-r * 0.52, 0);
    ctx.lineTo(-r * 0.28, r * 0.36);
    ctx.lineTo(r * 0.25, r * 0.24);
    ctx.lineTo(r * 0.75, r * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 刀身中央赤白血槽亮線
    ctx.strokeStyle = CORE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, 0);
    ctx.lineTo(r * 1.45, 0);
    ctx.stroke();

    // 3. 招牌銀白環首刀柄（Ring Pommel）與尾端星火
    ctx.strokeStyle = SILVER;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(-r * 0.72, 0, r * 0.22, 0, TAU);
    ctx.stroke();

    if (t != null) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = CORE;
      for (let i = 0; i < 3; i++) {
        const x = -r * (1.2 + i * 0.75);
        const y = Math.sin(t * 24 + i * 2.1 + (p.seq || 0)) * r * 0.26;
        ctx.beginPath();
        ctx.arc(x, y, 2.2 - i * 0.4, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  };
})(typeof window !== 'undefined' ? window : globalThis);
