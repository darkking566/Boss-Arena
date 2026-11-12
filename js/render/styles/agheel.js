'use strict';
// 自繪俯視飛龍亞基爾。造型來源：Creative Uncut 收錄的官方設定稿（俯視圖：雙翼展開、背脊一列骨棘、長尾；後視圖背棘的紅色描線）、
//   遊戲截圖（灰黑鱗甲、翼緣如燒焦羽毛層層剝落、頭上兩支後掠長角與鼻角、張口的橘紅喉嚨）。不載入第三方圖片；亂數只用 BD.vrng。
// 動畫：pose() 依狀態與技能時間軸算出一組姿勢（雙翼張合 / 拍動 / 前後擺、頸長與轉向、下顎、喉頭火光、後腿抬起、尾巴、身體旋轉），
//   dragon() 依姿勢畫出整條龍。時間點一律取自實際時間軸（沉重節奏會把預警拉長，不能寫死秒數）。
// 飛行：技能時間軸決定離地高度（身體往畫面上方平移、地上留龍形陰影）；hide 期間由 hidden() 畫出空中三拍振翼、收翼急降的龍。
(function (G) {
  const BD = G.BD, R = BD.Render, U = BD.U, TAU = U.TAU, V = BD.vrng;
  const SCALE_D = '#221e1d', SCALE_L = '#7a7069', FEATHER = '#5e5550', HORN = '#2b2624', BONE = '#b8ab94';
  const EYE = '#ffd27a', EYE2 = '#ff5a1a', FIRE = '#ff8a1e', CORE = '#fff1b8', RED = '#ff3b1a';
  const BREATH_FX = { agheelbreath: 1, agheelflame: 1, agheelrain: 1, greyllbridge: 1 };
  const GUST_FX = { agheelgust: 1, greyllroar: 1 }; // 以雙翼 / 嚎叫震開四周的判定
  const ease = (x) => x * x * (3 - 2 * x), cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const fxId = (a) => a.fx && (typeof a.fx === 'string' ? a.fx : a.fx.id);
  // 出手節奏：蓄力到 82% 時姿勢到位，最後 18% 揮出（讓揮擊在命中那一刻剛好掃到）
  const load = (w) => ease(cl(w / 0.82)), swing = (w) => cl((w - 0.82) / 0.18);

  // ───────── 時間軸分析（每個版本 inst.v 只算一次）─────────
  const INFO = new WeakMap();
  function info(inst) {
    let I = INFO.get(inst.v); if (I) return I;
    const acts = inst.v.actions, id = inst.skill.id, of = (k) => acts.filter((a) => a.do === k);
    const hits = of('hit'), dash = of('dash'), tele = of('tele'), breath = hits.filter((a) => BREATH_FX[fxId(a)]);
    const last = hits.length ? hits[hits.length - 1].at : 0;
    I = { breath, b0: breath.length ? breath[0].at : -9, b1: breath.length ? breath[breath.length - 1].at + 0.18 : -9, span: 0, fly: null,
      land: of('land'), hide: of('hide'), roar: tele.filter((a) => a.chargeFx === 'agheelroar'), nova: hits.filter((a) => fxId(a) === 'agheelnova' || fxId(a) === 'greyllnova'), gust: hits.filter((a) => GUST_FX[fxId(a)]), rain: of('rain'), ash: hits.filter((a) => fxId(a) === 'greyllash'), dash };
    if (breath.length) { const g = breath.map((a) => a.angOff || 0); I.span = Math.max(...g) - Math.min(...g); }
    // 離地高度：[開始升空, 到頂, 開始下降, 落地, 高度]
    if (id === 'retreat_flame' && dash[0]) I.fly = [dash[0].at, dash[0].at + 0.4, last + 0.15, last + 0.55, 120];
    else if (id === 'strafe' && dash[1]) I.fly = [dash[0].at, dash[0].at + 0.5, dash[1].at + dash[1].dur - 0.05, dash[1].at + dash[1].dur + 0.35, 95];
    else if (id === 'agheel_flame' && tele[0]) I.fly = [tele[0].at, tele[0].at + tele[0].dur, last + 0.2, last + 0.6, 150];
    INFO.set(inst.v, I); return I;
  }
  function elev(inst) {
    const f = inst && info(inst).fly; if (!f) return 0;
    const t = inst.t; if (t < f[0] || t > f[3]) return 0;
    return f[4] * (t < f[1] ? ease((t - f[0]) / (f[1] - f[0])) : t < f[2] ? 1 : ease(1 - (t - f[2]) / (f[3] - f[2])));
  }
  // 目前龍息的角度：在相鄰兩口之間內插（資料裡的角度單調排列）
  function breathAng(list, t) {
    if (t <= list[0].at) return list[0].angOff || 0;
    for (let i = 1; i < list.length; i++) if (t < list[i].at) { const a = list[i - 1], b = list[i], u = (t - a.at) / (b.at - a.at); return (a.angOff || 0) + ((b.angOff || 0) - (a.angOff || 0)) * u; }
    return list[list.length - 1].angOff || 0;
  }

  // ───────── 姿勢 ─────────
  // sp 翼張開 0~1、fl 拍動 −1（下壓）~1（上舉，離鏡頭近）、sw 前後擺（+ 往前）；索引 0 左翼 1 右翼
  const P = { sp: [0, 0], fl: [0, 0], sw: [0, 0], yaw: 0, reach: 1, curl: 0, jaw: 0, fire: 0, chest: 0, sway: 0, straight: 0, spin: 0, dip: 1, lunge: 0,
    lift: [0, 0], tuck: 0, head: 1, step: 0, glow: 0 };
  function wings(s, f, w) { P.sp[0] = P.sp[1] = s; P.fl[0] = P.fl[1] = f; P.sw[0] = P.sw[1] = w || 0; }
  function roarPose(c, t) { P.reach = 1 - 0.15 * c; P.head = 1 + 0.12 * c; P.jaw = 0.05 + 0.25 * c; P.chest = Math.max(P.chest, 0.5 * c); wings(0.25 + 0.4 * c, Math.sin(t * 22) * 0.08 * c, -0.1 * c); P.dip = 1 + 0.03 * c; }
  function landPose(q) { // 落地：翅膀撐開緩衝 → 慢慢收起，身體壓低再彈回
    const e = ease(q); wings(1 - 0.72 * e, -0.55 * (1 - e), 0.1 * (1 - e)); P.dip = 0.9 + 0.1 * e; P.jaw = 0.22 * (1 - e); P.head = 1 + 0.06 * (1 - e); P.sway = (1 - e) * 0.4 * Math.sin(q * 9);
  }

  function pose(o, t, st, air) {
    const inst = o.inst;
    wings(0.24 + 0.03 * Math.sin(t * 1.4), 0, 0);
    P.yaw = Math.sin(t * 0.7) * 0.14; P.reach = 1; P.curl = Math.sin(t * 0.5) * 0.08; P.jaw = 0.03 + 0.03 * Math.max(0, Math.sin(t * 0.9));
    P.fire = 0; P.chest = 0; P.sway = Math.sin(t * 1.3) * 0.1; P.straight = 0; P.spin = 0; P.dip = 1 + 0.012 * Math.sin(t * 1.8); P.lunge = 0;
    P.lift[0] = P.lift[1] = 0; P.tuck = 0; P.head = 1; P.step = 0; P.glow = o.phase === 2 ? 9 : 0;
    const moving = st === 'dodge' || (inst && inst.dash) || Math.hypot(o.vx || 0, o.vy || 0) > 25;
    if (moving && !air) { // 飛龍以翼腕撐地行走：左右翼腕交替往前撐、身體跟著起伏
      const ph = Math.sin(t * 9); P.step = 1; wings(0.3, 0, 0.08); P.fl[0] = 0.18 * ph; P.fl[1] = -0.18 * ph; P.sw[0] = 0.08 + 0.1 * ph; P.sw[1] = 0.08 - 0.1 * ph;
      P.yaw = 0.08 * ph; P.dip = 1 + 0.015 * Math.abs(ph); P.sway = -0.25 * ph;
    }
    if (st === 'dodge') wings(0.75, Math.sin(t * 14) * 0.6, 0);
    if (air) { wings(0.95, Math.sin(t * 7) * 0.85, 0.05); P.tuck = 1; P.sway = Math.sin(t * 3.5) * 0.25; }
    if (st === 'stun' || st === 'stagger' || st === 'knockdown') { wings(0.55, 0, -0.25); P.reach = 0.85; P.yaw = Math.sin(t * 2.3) * 0.35; P.jaw = 0.12; P.dip = 0.95; P.head = 0.94; }
    if (st === 'transition') transitionPose(o, t);
    if (inst) skillPose(inst, inst.skill.id, t, air);
    return P;
  }
  // 龍心熾燃：四下心跳（對齊 agheelheart 特效的搏動時間）→ 背棘逐根亮起 → 昂首展翼怒吼
  function transitionPose(o, t) {
    const T = o.stateT || 0, p2 = o.def.phase2 || {}, roar = p2.roarAt || 1.7, life = 1.7;
    if (T < roar) {
      const c = T / roar; wings(0.3 + 0.25 * c, 0, -0.25); P.dip = 0.92; P.reach = 0.78; P.head = 0.94; P.jaw = 0.06; P.glow = Math.floor(c * 10);
      let beat = 0; for (let i = 0; i < 4; i++) beat = Math.max(beat, Math.exp(-Math.pow((T - life * (0.1 + i * 0.2)) / 0.07, 2)));
      P.chest = 0.35 + 0.65 * beat; P.dip -= 0.03 * beat; P.yaw = Math.sin(t * 1.5) * 0.1;
    } else {
      const q = cl((T - roar) / 0.45); wings(0.45 + 0.55 * ease(q), 0.7 * Math.sin(q * Math.PI) - 0.2 * q, 0); P.reach = 0.9; P.head = 1 + 0.16 * ease(q);
      P.jaw = 0.32; P.fire = 0.9; P.chest = 1; P.glow = 9; P.dip = 1.04; P.yaw = 0;
    }
  }
  function skillPose(inst, id, t, air) {
    const I = info(inst), T = inst.t;
    // 怒吼（衝撞 / 天降龍炎 / 大招起手的預警）
    for (const a of I.roar) if (T >= a.at && T <= a.at + a.dur) roarPose(ease(cl((T - a.at) / Math.min(0.35, a.dur))), t);
    // 召來火雨：仰天長嚎、雙翼張開緩緩鼓動
    for (const a of I.rain) if (!air && T >= a.at - 0.2 && T < a.at + (a.dur || 1)) {
      const c = ease(cl((T - a.at + 0.2) / 0.3)) * ease(cl((a.at + (a.dur || 1) - T) / 0.3));
      wings(0.24 + 0.6 * c, Math.sin(t * 5) * 0.45 * c, -0.1 * c); P.reach = 1 - 0.12 * c; P.head = 1 + 0.12 * c; P.jaw = Math.max(P.jaw, 0.26 * c); P.chest = Math.max(P.chest, 0.7 * c); P.fire = Math.max(P.fire, 0.4 * c); P.yaw = 0;
    }
    // 翼風 / 嚎叫的判定：雙翼高舉 → 猛然拍下
    for (const a of I.gust) if (T >= a.at - 0.35 && T < a.at + 0.45) {
      if (T < a.at) { const c = ease((T - a.at + 0.35) / 0.35); wings(0.5 + 0.5 * c, 0.9 * c, -0.15 * c); P.head = 1 + 0.1 * c; P.jaw = 0.1 + 0.2 * c; P.dip = 1 + 0.04 * c; P.chest = Math.max(P.chest, 0.6 * c); }
      else { const q = (T - a.at) / 0.45; wings(1, -0.85 * (1 - q), 0.15 * (1 - q)); P.jaw = 0.3 * (1 - q); P.dip = 0.95 + 0.05 * q; P.head = 1.08; }
    }
    // 灰燼風暴的收尾：朝落點吐出一口灰燼
    for (const a of I.ash) if (T >= a.at - 0.4 && T < a.at + 0.4) { const c = T < a.at ? ease((T - a.at + 0.4) / 0.4) : 1 - (T - a.at) / 0.4; wings(0.45, 0, -0.12); P.reach = T < a.at ? 1 - 0.2 * c : 1 + 0.15 * c; P.jaw = 0.08 + 0.2 * c; P.fire = c; P.chest = c; }
    // 落地緩衝
    for (const a of I.land) if (T >= a.at && T < a.at + 0.8) landPose((T - a.at) / 0.8);
    if (id === 'bite') {
      const p = R.skillPace(inst, { hit: 1 }), a = p.a || {}, side = (a.angOff || 0) * 1.5, fire = a.fxEl === 'fire';
      wings(0.3, 0, 0); P.yaw = side;
      if (p.snap > 0) { P.reach = 1 + 0.42 * p.snap; P.lunge = 0.12 * p.snap; P.jaw = 0.03; P.head = 1.04; P.fire = fire ? p.snap : 0; }
      else { const w = load(p.wind); P.reach = 1 - 0.2 * w + 0.4 * swing(p.wind); P.jaw = 0.05 + 0.26 * w * (1 - swing(p.wind)); P.head = 1 + 0.07 * w; P.fire = fire ? w * 0.8 : 0; P.chest = fire ? w * 0.7 : 0; }
    } else if (id === 'stomp') {
      const p = R.skillPace(inst, { hit: 1 }), a = p.a || {}, s = a.angOff ? (a.angOff > 0 ? 1 : 0) : -1, w = load(p.wind);
      wings(0.3, 0, 0);
      if (s < 0) { // 突進重踏：雙腳離地、翅膀上舉，落下時整個身子壓低
        if (p.snap > 0) { wings(0.75, -0.6 * p.snap, 0); P.dip = 1 - 0.07 * p.snap; P.lift[0] = P.lift[1] = 0; P.jaw = 0.2 * p.snap; }
        else { P.lift[0] = P.lift[1] = 0.55 * w * (1 - swing(p.wind)); wings(0.3 + 0.45 * w, 0.6 * w, 0); P.dip = 1 + 0.05 * w; P.head = 1 + 0.06 * w; }
      } else if (p.snap > 0) { P.dip = 1 - 0.04 * p.snap; P.spin = (s ? -1 : 1) * 0.04 * p.snap; }
      else { P.lift[s] = w * (1 - swing(p.wind)); P.fl[s] = 0.45 * w; P.sp[s] = 0.3 + 0.25 * w; P.spin = (s ? -1 : 1) * 0.07 * w; P.dip = 1 + 0.02 * w; }
    } else if (id === 'wing_slam') {
      const p = R.skillPace(inst, { hit: 1 }), w = load(p.wind), sw = swing(p.wind);
      if (p.i === 0) { // 右翼高舉 → 拍下
        wings(0.3, 0, 0);
        if (p.snap > 0) { P.sp[1] = 1; P.fl[1] = -0.75 * p.snap; P.dip = 1 - 0.04 * p.snap; }
        else { P.sp[1] = 0.3 + 0.7 * w; P.fl[1] = 0.95 * w - 1.7 * sw; P.sw[1] = 0.3 * w; P.spin = -0.08 * w; }
      } else { // 雙翼往後拉滿 → 貼地往前一掃
        if (p.snap > 0) { wings(0.6 + 0.4 * p.snap, -0.4 * p.snap, 0.5 * p.snap); P.dip = 1 - 0.03 * p.snap; }
        else { wings(0.4 + 0.6 * w, 0.4 * w * (1 - sw), -0.75 * w + 1.25 * sw); P.dip = 1 + 0.03 * w; }
      }
    } else if (id === 'charge') {
      if (inst.dash) { P.step = 2; wings(0.45, Math.sin(t * 16) * 0.2, -0.4); P.reach = 1.12; P.head = 0.96; P.jaw = 0.12; P.yaw = 0; }
      else if (!I.roar.some((a) => T <= a.at + a.dur)) { // 頭角上挑
        const p = R.skillPace(inst, { hit: 1 }), w = load(p.wind), sw = swing(p.wind);
        wings(0.4, 0, -0.1);
        if (p.snap > 0) { P.yaw = 0.35 * p.snap; P.head = 1 + 0.16 * p.snap; P.reach = 1.15; P.jaw = 0.18; }
        else { P.yaw = -0.6 * w + 0.95 * sw; P.reach = 0.9 + 0.25 * sw; P.head = 1 + 0.16 * sw; P.jaw = 0.1; }
      }
    } else if (id === 'tail_gore') {
      const p = R.skillPace(inst, { hit: 1 }), h0 = inst.v.actions.find((a) => a.do === 'hit');
      if (p.i === 0 && h0) { // 原地旋身一整圈，尾巴打直掃過
        const u = cl(T / (h0.at + 0.3)), e = u * u * u * (u * (u * 6 - 15) + 10);
        P.spin = e * TAU; P.straight = 1; P.sway = -0.9 * Math.sin(u * Math.PI); wings(0.22, 0, -0.2); P.yaw = -0.3 * Math.sin(u * Math.PI);
      } else { // 回首角擊
        const w = load(p.wind), sw = swing(p.wind);
        if (p.snap > 0) { P.yaw = -0.4 * p.snap; P.head = 1 + 0.14 * p.snap; P.reach = 1.15; P.jaw = 0.2; }
        else { P.yaw = 0.6 * w - 1.0 * sw; P.reach = 0.9 + 0.25 * sw; P.jaw = 0.1; }
      }
    } else if (id === 'dive_bomb' && !I.land.some((a) => T >= a.at)) { // 起跳前一蹲
      wings(0.7, -0.6, -0.2); P.dip = 0.93; P.head = 1.05;
    } else if (id === 'strafe' && I.dash[1] && T >= I.dash[1].at && T <= I.dash[1].at + I.dash[1].dur) { // 低空滑翔：翅膀攤平不拍
      wings(1, Math.sin(t * 4) * 0.08, 0.12); P.sway = Math.sin(t * 6) * 0.15;
    } else if (id === 'agheel_flame' && air) {
      wings(1, Math.sin(t * 5) * 0.95, 0);
    } else if (id === 'ult' && I.nova.length) { // 龍心爆發：昂首展翼、胸口亮到極點 → 雙翼拍下
      const n = I.nova[0];
      if (T >= n.at - 0.5 && T < n.at) { const c = ease((T - n.at + 0.5) / 0.5); wings(0.5 + 0.5 * c, 0.9 * c, 0); P.chest = c; P.head = 1 + 0.12 * c; P.jaw = 0.1 + 0.2 * c; P.fire = c; P.dip = 1 + 0.05 * c; P.glow = 9; }
      else if (T >= n.at && T < n.at + 0.5) { const q = (T - n.at) / 0.5; wings(1, -0.8 * (1 - q), 0.1); P.chest = 1 - q; P.fire = 1 - q; P.jaw = 0.3 * (1 - q); P.dip = 0.94 + 0.06 * q; }
    }
    // 龍息：蓄氣（脖子後縮、喉頭與胸口亮起）→ 噴射（跟著每一口的角度轉頭；大角度時連身體一起轉）
    if (I.breath.length) {
      const pre = Math.min(0.85, Math.max(0.4, I.b0 - 0.1));
      if (T >= I.b0 - pre && T <= I.b1 + 0.6) {
        const part = I.span > 3.5 ? 1 : I.span > 1.2 ? 0.55 : 0, a = breathAng(I.breath, T);
        if (T < I.b0) {
          const c = ease((T - I.b0 + pre) / pre);
          P.reach = Math.min(P.reach, 1 - 0.22 * c); P.head = Math.max(P.head, 1 + 0.08 * c); P.chest = Math.max(P.chest, c); P.jaw = Math.max(P.jaw, 0.05 + 0.12 * c); P.fire = Math.max(P.fire, 0.5 * c);
          P.spin += a * part * c; P.yaw = a * (1 - part) * c - 0.15 * c * Math.sign(a || 1); P.curl = 0.2 * c;
        } else {
          // 火 0.25 秒熄，頭與身體 0.6 秒緩緩轉回（不瞬間彈回正面）
          const f = T <= I.b1 ? 1 : Math.max(0, 1 - (T - I.b1) / 0.25), back = T <= I.b1 ? 1 : ease(1 - (T - I.b1) / 0.6);
          P.reach = 1 + 0.12 * f; P.head = 1; P.chest = Math.max(P.chest, 0.8 * f); P.jaw = Math.max(P.jaw, 0.25 * f); P.fire = Math.max(P.fire, f);
          P.spin += a * part * back; P.yaw = (a * (1 - part) + Math.sin(t * 23) * 0.025 * f) * back; P.curl = 0;
          if (!air && id !== 'ult') wings(0.42, 0, -0.12);
        }
      }
    }
  }

  // ───────── 部件 ─────────
  // 右翼精靈（翼座標：原點＝肩、+y 往外展、+x 往前）；左翼以 scale(1,-1) 鏡像。kind：'' 本體、's' 陰影、'g' 二階段翼緣火光
  function wingEdge(r) {
    const edge = []; // 後緣：翼尖 → 身體，鋸齒狀羽緣
    const tip = [-r * 0.15, r * 2.85];
    for (let i = 0; i <= 18; i++) {
      const u = i / 18, x = tip[0] + (-r * 1.45 - tip[0]) * u - Math.sin(u * Math.PI) * r * 0.65, y = tip[1] + (r * 0.15 - tip[1]) * u;
      edge.push([x, y], [x - r * (0.18 + 0.12 * Math.sin(i * 2.7)), y + r * 0.06]);
    }
    return edge;
  }
  function wingPath(c, r, edge) {
    c.beginPath(); c.moveTo(0, -r * 0.05); c.quadraticCurveTo(r * 0.3, r * 0.6, r * 0.35, r * 1.35); c.lineTo(-r * 0.15, r * 2.85);
    for (const [x, y] of edge) c.lineTo(x, y);
    c.lineTo(-r * 0.6, 0); c.closePath();
  }
  function wingSprite(g, r, kind) {
    R.blit(g, 'agheel:wing3' + kind + ':' + r, r * 4.4, r * 3.5, r * 2.2, r * 0.35, (c) => {
      const wrist = [r * 0.35, r * 1.35], tip = [-r * 0.15, r * 2.85], edge = wingEdge(r), fingers = [0.24, 0.5, 0.76].map((u) => edge[Math.round(u * 36)]);
      if (kind === 's' || kind === 'l') { c.fillStyle = kind === 's' ? '#000' : '#c8bcae'; wingPath(c, r, edge); c.fill(); return; }
      if (kind === 'g') { // 二階段：燒焦的翼緣透出餘燼紅光
        c.lineJoin = 'round'; c.globalCompositeOperation = 'lighter';
        for (const [w, col] of [[r * 0.16, 'rgba(255,60,20,0.18)'], [r * 0.07, 'rgba(255,120,40,0.35)'], [r * 0.025, 'rgba(255,210,140,0.6)']]) {
          c.strokeStyle = col; c.lineWidth = w; c.beginPath(); edge.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
        }
        return;
      }
      const gr = c.createLinearGradient(0, 0, -r, r * 2.7); gr.addColorStop(0, '#433b37'); gr.addColorStop(0.55, '#2a2523'); gr.addColorStop(1, '#141110');
      c.fillStyle = gr; wingPath(c, r, edge); c.fill();
      // 翼膜分片：指骨之間交錯明暗，靠前緣較亮（受光）
      const pts = [tip, ...fingers, [-r * 0.6, 0]];
      for (let i = 0; i < pts.length - 1; i++) {
        c.fillStyle = i % 2 ? 'rgba(0,0,0,0.18)' : 'rgba(120,108,98,0.10)';
        c.beginPath(); c.moveTo(wrist[0], wrist[1]); c.lineTo(pts[i][0], pts[i][1]); c.lineTo((pts[i][0] + pts[i + 1][0]) / 2 - r * 0.1, (pts[i][1] + pts[i + 1][1]) / 2); c.lineTo(pts[i + 1][0], pts[i + 1][1]); c.closePath(); c.fill();
      }
      // 翼膜皺褶：從腕骨往後緣放射的細紋
      c.lineCap = 'round';
      for (let i = 0; i < 26; i++) {
        const e = edge[(i * 7) % edge.length], u = 0.35 + 0.4 * ((i * 0.618) % 1);
        c.strokeStyle = i % 2 ? 'rgba(10,8,8,0.35)' : 'rgba(130,118,108,0.16)'; c.lineWidth = r * 0.012;
        c.beginPath(); c.moveTo(wrist[0] + (e[0] - wrist[0]) * u * 0.4, wrist[1] + (e[1] - wrist[1]) * u * 0.4); c.lineTo(wrist[0] + (e[0] - wrist[0]) * u, wrist[1] + (e[1] - wrist[1]) * u); c.stroke();
      }
      // 羽毛般的鱗片：沿後緣一層層往外的短筆觸
      for (let i = 0; i < 140; i++) {
        const u = (i * 0.618) % 1, v = (i * 0.37) % 1, x = tip[0] * (1 - u) + (-r * 1.4) * u - Math.sin(u * Math.PI) * r * 0.5 * v, y = (tip[1] * (1 - u) + r * 0.2 * u) * (0.55 + 0.45 * v);
        c.strokeStyle = ['#5e5550', '#3a3431', '#6e645d', '#2a2523'][i % 4]; c.lineWidth = r * (0.02 + 0.02 * (i % 3)); c.globalAlpha = 0.5;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - r * (0.22 + 0.1 * v), y + r * 0.04); c.stroke();
      }
      c.globalAlpha = 1;
      // 燒穿的破洞：焦黑邊、內側一圈暗紅
      for (const [u, v, s] of [[0.3, 0.7, 0.07], [0.55, 0.82, 0.05], [0.72, 0.62, 0.06], [0.18, 0.86, 0.04]]) {
        const e = edge[Math.round(u * 36)], x = wrist[0] + (e[0] - wrist[0]) * v, y = wrist[1] + (e[1] - wrist[1]) * v;
        c.fillStyle = '#0b0908'; c.beginPath(); c.ellipse(x, y, r * s * 1.3, r * s, 0.6, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(150,60,30,0.45)'; c.lineWidth = r * 0.012; c.stroke();
      }
      // 骨架：上臂（前緣加一道受光線）、前臂、三根指骨
      c.strokeStyle = '#5a504b'; c.lineWidth = r * 0.14; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(r * 0.3, r * 0.6, wrist[0], wrist[1]); c.lineTo(tip[0], tip[1]); c.stroke();
      c.strokeStyle = 'rgba(170,158,146,0.45)'; c.lineWidth = r * 0.035; c.beginPath(); c.moveTo(r * 0.04, -r * 0.03); c.quadraticCurveTo(r * 0.36, r * 0.6, wrist[0] + r * 0.05, wrist[1]); c.lineTo(tip[0] + r * 0.03, tip[1] - r * 0.02); c.stroke();
      c.strokeStyle = SCALE_D; c.lineWidth = r * 0.04; c.beginPath(); c.moveTo(0, r * 0.03); c.quadraticCurveTo(r * 0.27, r * 0.62, wrist[0] - r * 0.03, wrist[1]); c.lineTo(tip[0] - r * 0.03, tip[1]); c.stroke();
      for (const [ex, ey] of fingers) {
        c.strokeStyle = '#4a423d'; c.lineWidth = r * 0.06; c.beginPath(); c.moveTo(wrist[0], wrist[1]); c.quadraticCurveTo((wrist[0] + ex) / 2 + r * 0.12, (wrist[1] + ey) / 2, ex, ey); c.stroke();
        c.strokeStyle = 'rgba(150,138,126,0.3)'; c.lineWidth = r * 0.018; c.stroke();
      }
      c.fillStyle = HORN; for (const [x, y] of [wrist, tip]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + r * 0.26, y + r * 0.04); c.lineTo(x, y + r * 0.11); c.fill(); } // 翼爪
      c.fillStyle = BONE; c.beginPath(); c.moveTo(wrist[0] + r * 0.18, wrist[1] + r * 0.03); c.lineTo(wrist[0] + r * 0.27, wrist[1] + r * 0.04); c.lineTo(wrist[0] + r * 0.18, wrist[1] + r * 0.07); c.fill();
    });
  }
  function wing(g, r, s, P, S, phase) {
    const i = s < 0 ? 0 : 1, sp = P.sp[i], fl = P.fl[i];
    g.save(); g.translate(r * 0.38, s * r * 0.33); g.scale(1, s);
    g.rotate(1.05 * (1 - sp) - P.sw[i] + fl * 0.12); // 收合時翼尖往後貼著身側
    const span = (0.3 + 0.7 * sp) * (1 - 0.3 * Math.abs(fl)) * (fl > 0 ? 1 + 0.16 * fl : 1); // 上下拍時翼面前縮（透視）、上舉時離鏡頭近而變大
    g.scale(1 + 0.1 * fl, span);
    wingSprite(g, r, S ? 's' : '');
    const A = g.globalAlpha;
    if (!S && fl > 0.2) { g.globalAlpha = A * (fl - 0.2) * 0.22; wingSprite(g, r, 'l'); } // 上舉的翼面受光
    if (!S && phase === 2) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = A * (0.55 + 0.3 * Math.sin(P.t * 3.8 + s)); wingSprite(g, r, 'g'); }
    g.restore();
  }
  function torso(g, r, P, phase, S) {
    if (S) { g.fillStyle = '#000'; g.beginPath(); g.ellipse(-r * 0.1, 0, r * 1.05, r * 0.58, 0, 0, TAU); g.fill(); return; }
    R.blit(g, 'agheel:torso2:' + r, r * 3.2, r * 2.2, r * 1.7, r * 1.1, (c) => {
      for (const [x, y, rx, ry] of [[r * 0.42, r * 0.36, r * 0.32, r * 0.24], [-r * 0.5, r * 0.4, r * 0.34, r * 0.26]]) for (const s of [-1, 1]) { // 肩膀與後腿的肌肉隆起
        c.fillStyle = '#2c2725'; c.beginPath(); c.ellipse(x, s * y, rx, ry, 0, 0, TAU); c.fill();
      }
      const gr = c.createLinearGradient(0, -r * 0.62, 0, r * 0.62); gr.addColorStop(0, SCALE_D); gr.addColorStop(0.42, SCALE_L); gr.addColorStop(0.58, '#5e5650'); gr.addColorStop(1, SCALE_D);
      c.fillStyle = gr; c.beginPath(); c.ellipse(-r * 0.1, 0, r * 1.05, r * 0.56, 0, 0, TAU); c.fill();
      for (let i = 0; i < 110; i++) { // 鱗片：中段受光、兩側暗
        const u = (i * 0.618) % 1, v = ((i * 0.381) % 1) * 2 - 1, x = -r * 1.0 + u * r * 1.9, y = v * r * 0.46 * Math.sqrt(Math.max(0, 1 - Math.pow((x + r * 0.1) / (r * 1.05), 2)));
        c.fillStyle = Math.abs(v) > 0.55 ? 'rgba(14,11,10,0.42)' : i % 3 ? 'rgba(20,16,15,0.3)' : 'rgba(150,138,126,0.28)';
        c.beginPath(); c.ellipse(x, y, r * 0.075, r * 0.045, 0, 0, TAU); c.fill();
      }
      c.strokeStyle = 'rgba(12,10,9,0.55)'; c.lineWidth = r * 0.05; c.beginPath(); c.moveTo(r * 0.85, 0); c.lineTo(-r * 1.1, 0); c.stroke(); // 背脊溝
    });
    if (phase === 2) { // 龍心熾燃：鱗縫透出赤光的裂紋
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45 + 0.3 * Math.sin(P.t * 3.3);
      R.blit(g, 'agheel:cracks:' + r, r * 2.4, r * 1.3, r * 1.25, r * 0.65, (c) => {
        c.lineCap = 'round';
        for (let i = 0; i < 14; i++) {
          let x = -r * 0.9 + ((i * 0.618) % 1) * r * 1.6, y = (((i * 0.43) % 1) - 0.5) * r * 0.75;
          c.strokeStyle = i % 2 ? 'rgba(255,70,20,0.75)' : 'rgba(255,160,60,0.6)'; c.lineWidth = r * (0.012 + 0.008 * (i % 3));
          c.beginPath(); c.moveTo(x, y);
          for (let j = 0; j < 4; j++) { x += r * 0.07 * (j % 2 ? 1 : -0.4) + r * 0.04; y += r * 0.06 * Math.sin(i * 3.1 + j * 2.3); c.lineTo(x, y); }
          c.stroke();
        }
      });
      g.restore();
    }
    if (P.chest > 0.02) { // 胸口 / 喉頭的龍焰光（蓄息、龍心搏動）
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) { g.globalAlpha = P.chest * (0.45 - i * 0.2); g.fillStyle = i ? FIRE : CORE; g.beginPath(); g.ellipse(r * 0.6, 0, r * (0.16 + i * 0.14), r * (0.1 + i * 0.09), 0, 0, TAU); g.fill(); }
      g.restore();
    }
  }
  // 背脊骨棘：lit 根亮起（二階段全亮並脈動；換階段時逐根點亮）
  function spines(g, r, lit, t) {
    for (let i = 0; i < 9; i++) {
      const x = r * (0.75 - i * 0.22), h = r * (0.24 - Math.abs(i - 3) * 0.018);
      for (const s of [-1, 1]) { g.fillStyle = HORN; g.beginPath(); g.moveTo(x + r * 0.08, s * r * 0.05); g.lineTo(x - h, s * r * (0.17 + 0.02 * i)); g.lineTo(x - r * 0.04, s * r * 0.02); g.fill(); }
      g.fillStyle = '#5c534d'; g.beginPath(); g.moveTo(x + r * 0.06, 0); g.lineTo(x - h * 0.8, -r * 0.025); g.lineTo(x - h * 0.8, r * 0.025); g.fill();
      if (i < lit) {
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.4 + 0.35 * Math.sin(t * 6 - i * 0.6);
        g.fillStyle = RED; g.beginPath(); g.ellipse(x - r * 0.05, 0, r * 0.12, r * 0.075, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffb070'; g.beginPath(); g.ellipse(x - r * 0.04, 0, r * 0.05, r * 0.03, 0, 0, TAU); g.fill(); g.restore();
      }
    }
  }
  // 沿一串中心點畫出由粗漸細的實心帶狀（頸、尾）
  const L_ = [], R_ = [];
  function band(g, pts, wOf) {
    L_.length = R_.length = 0;
    for (let i = 0; i < pts.length; i += 2) {
      const j = Math.min(pts.length - 2, Math.max(2, i)), dx = pts[j] - pts[j - 2], dy = pts[j + 1] - pts[j - 1], d = Math.hypot(dx, dy) || 1, w = wOf(i / 2) / 2;
      L_.push(pts[i] - dy / d * w, pts[i + 1] + dx / d * w); R_.push(pts[i] + dy / d * w, pts[i + 1] - dx / d * w);
    }
    g.beginPath(); g.moveTo(L_[0], L_[1]);
    for (let i = 2; i < L_.length; i += 2) g.lineTo(L_[i], L_[i + 1]);
    for (let i = R_.length - 2; i >= 0; i -= 2) g.lineTo(R_[i], R_[i + 1]);
    g.closePath(); g.fill();
  }
  const TP = [];
  function tail(g, r, t, P, S) {
    const n = 18; TP.length = 0; TP.push(-r * 0.85, 0);
    for (let i = 1; i <= n; i++) { const k = i / n; TP.push(-r * (0.85 + k * 3.0), Math.sin(t * 2.1 - k * 2.6) * r * k * 0.32 * (1 - P.straight) + P.sway * r * k * k * 1.6); }
    const wOf = (i) => r * (0.46 * Math.pow(1 - i / n, 0.85) + 0.05);
    g.fillStyle = S ? '#000' : '#2c2725'; band(g, TP, wOf);
    const ex = TP[n * 2], ey = TP[n * 2 + 1], a = Math.atan2(ey - TP[n * 2 - 1], ex - TP[n * 2 - 2]);
    // 尾端破旗般的羽緣
    g.save(); g.translate(ex, ey); g.rotate(a); g.fillStyle = S ? '#000' : FEATHER;
    g.beginPath(); g.moveTo(-r * 0.25, 0);
    for (let j = 0; j <= 8; j++) { const b = (j / 8 - 0.5) * 1.6, l = r * (0.45 + 0.18 * Math.sin(j * 2.3 + t * 3)); g.lineTo(Math.cos(b) * l, Math.sin(b) * l); g.lineTo(Math.cos(b + 0.1) * l * 0.72, Math.sin(b + 0.1) * l * 0.72); }
    g.closePath(); g.fill(); g.restore();
    if (S) return;
    g.fillStyle = '#4a423e'; band(g, TP, (i) => wOf(i) * 0.36); // 尾背受光帶
    g.fillStyle = HORN;
    for (let i = 2; i < n - 3; i += 2) { const x = TP[i * 2], y = TP[i * 2 + 1], s = r * 0.12 * (1 - i / n); g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s * 1.2, y - s * 0.6); g.lineTo(x + s * 1.2, y + s * 0.6); g.fill(); }
  }
  function legs(g, r, t, P, raised) {
    for (const s of [-1, 1]) {
      const i = s < 0 ? 0 : 1, lift = P.lift[i];
      if ((lift > 0.05) !== raised) continue;
      const ph = t * (P.step > 1 ? 15 : 9) + (s < 0 ? Math.PI : 0);
      const step = P.step ? Math.sin(ph) * r * 0.2 : 0, up = P.step ? Math.max(0, Math.cos(ph)) * 0.15 : 0;
      const hx = -r * 0.42, hy = s * r * 0.4, fx = hx + r * 0.14 + step - P.tuck * r * 0.55 + lift * r * 0.5, fy = s * r * (0.8 - P.tuck * 0.32 + lift * 0.12);
      const k = 1 + lift * 0.65 + up * 0.45 - P.tuck * 0.2;
      if (lift + up > 0.05) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(fx - r * 0.05, fy, r * 0.22, r * 0.12, 0, 0, TAU); g.fill(); } // 抬腳時地上的腳影
      g.strokeStyle = '#1e1a19'; g.lineCap = 'round'; g.lineWidth = r * 0.24 * k; g.beginPath(); g.moveTo(hx, hy); g.lineTo(fx, fy); g.stroke(); // 大腿
      g.save(); g.translate(fx, fy); g.scale(k, k);
      g.fillStyle = '#2a2523'; g.beginPath(); g.ellipse(0, 0, r * 0.2, r * 0.13, 0, 0, TAU); g.fill();
      g.strokeStyle = BONE; g.lineWidth = r * 0.03;
      for (let j = -1; j <= 1; j++) { g.beginPath(); g.moveTo(r * 0.12, j * r * 0.07); g.quadraticCurveTo(r * 0.26, j * r * 0.1, r * 0.3, j * r * 0.12 + r * 0.03); g.stroke(); } // 三根前爪
      g.beginPath(); g.moveTo(-r * 0.15, 0); g.lineTo(-r * 0.25, s * r * 0.04); g.stroke();
      g.restore();
    }
  }
  const NP = [];
  function neckAndHead(g, r, P, phase, t, S) {
    const n = 5, L = r * 0.215 * P.reach; NP.length = 0; NP.push(r * 0.7, 0);
    let x = r * 0.7, y = 0, a = 0;
    for (let i = 1; i <= n; i++) { a = P.yaw * i / n + P.curl * Math.sin(i / n * Math.PI); x += Math.cos(a) * L; y += Math.sin(a) * L; NP.push(x, y); }
    const wOf = (i) => r * (0.46 - 0.045 * i);
    g.fillStyle = S ? '#000' : '#2e2927'; band(g, NP, wOf);
    if (!S) {
      g.fillStyle = '#4e4642'; band(g, NP, (i) => wOf(i) * 0.38);
      if (P.chest > 0.05) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = P.chest * 0.5; g.fillStyle = FIRE; band(g, NP, (i) => wOf(i) * (0.25 + 0.1 * i / n)); g.restore(); } // 龍焰沿喉嚨往上湧
      g.fillStyle = HORN;
      for (let i = 1; i <= n; i++) { const px = NP[i * 2], py = NP[i * 2 + 1], b = P.yaw * i / n; g.save(); g.translate(px, py); g.rotate(b); g.beginPath(); g.moveTo(r * 0.02, 0); g.lineTo(-r * 0.15, -r * 0.055); g.lineTo(-r * 0.15, r * 0.055); g.fill(); g.restore(); }
    }
    g.save(); g.translate(x, y); g.rotate(a); g.scale(P.head, P.head);
    if (S) { g.fillStyle = '#000'; g.beginPath(); g.ellipse(r * 0.35, 0, r * 0.5, r * 0.22, 0, 0, TAU); g.fill(); g.restore(); return; }
    head(g, r, P.jaw, P.fire, phase, t);
    g.restore();
  }
  function head(g, r, jaw, fire, phase, t) {
    if (jaw > 0.02) { // 張口：口腔、下顎往兩側撐開、露出牙列
      const o = Math.min(0.34, jaw);
      g.fillStyle = '#2a0c08'; g.beginPath(); g.ellipse(r * 0.42, 0, r * 0.42, r * (0.1 + o * 0.55), 0, 0, TAU); g.fill();
      g.fillStyle = R.hexA('#c9512a', 0.85); g.beginPath(); g.ellipse(r * 0.3, 0, r * 0.22, r * o * 0.4, 0, 0, TAU); g.fill();
      for (const s of [-1, 1]) {
        g.save(); g.translate(r * 0.04, s * r * 0.1); g.rotate(s * o * 1.15);
        g.fillStyle = '#332d2a'; g.beginPath(); g.moveTo(0, -s * r * 0.02); g.quadraticCurveTo(r * 0.45, s * r * 0.09, r * 0.84, s * r * 0.01); g.lineTo(r * 0.8, -s * r * 0.03); g.quadraticCurveTo(r * 0.4, s * r * 0.0, 0, -s * r * 0.06); g.closePath(); g.fill();
        g.fillStyle = '#efe6d2'; for (let i = 0; i < 6; i++) { const x = r * (0.2 + i * 0.11); g.beginPath(); g.moveTo(x, -s * r * 0.025); g.lineTo(x + r * 0.03, -s * r * 0.075); g.lineTo(x + r * 0.06, -s * r * 0.025); g.fill(); }
        g.restore();
      }
    }
    R.blit(g, 'agheel:head2:' + r, r * 1.8, r * 1.3, r * 0.8, r * 0.65, (c) => {
      for (const s of [-1, 1]) { // 兩支往後掠的長角（有節紋）
        c.fillStyle = HORN; c.beginPath(); c.moveTo(r * 0.02, s * r * 0.15); c.quadraticCurveTo(-r * 0.35, s * r * 0.34, -r * 0.7, s * r * 0.54); c.quadraticCurveTo(-r * 0.32, s * r * 0.24, -r * 0.08, s * r * 0.07); c.fill();
        c.strokeStyle = 'rgba(120,108,98,0.35)'; c.lineWidth = r * 0.012;
        for (let i = 1; i < 6; i++) { const u = i / 6, px = r * (0.0 - 0.62 * u), py = s * r * (0.13 + 0.36 * u * u); c.beginPath(); c.moveTo(px, py - s * r * 0.03); c.lineTo(px - r * 0.02, py + s * r * 0.03); c.stroke(); }
        c.fillStyle = '#3c3532'; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(r * (0.24 - i * 0.12), s * r * 0.16); c.lineTo(r * (0.13 - i * 0.12), s * r * 0.31); c.lineTo(r * (0.08 - i * 0.12), s * r * 0.15); c.fill(); } // 頰側棘
      }
      const gr = c.createLinearGradient(0, -r * 0.22, 0, r * 0.22); gr.addColorStop(0, '#26211f'); gr.addColorStop(0.5, '#6e655e'); gr.addColorStop(1, '#26211f');
      c.fillStyle = gr; c.beginPath(); c.moveTo(-r * 0.16, -r * 0.21); c.quadraticCurveTo(r * 0.36, -r * 0.21, r * 0.74, -r * 0.075); c.lineTo(r * 0.86, 0); c.lineTo(r * 0.74, r * 0.075); c.quadraticCurveTo(r * 0.36, r * 0.21, -r * 0.16, r * 0.21); c.quadraticCurveTo(-r * 0.24, 0, -r * 0.16, -r * 0.21); c.closePath(); c.fill();
      c.fillStyle = 'rgba(20,16,15,0.55)'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(r * 0.06, s * r * 0.19); c.quadraticCurveTo(r * 0.28, s * r * 0.17, r * 0.46, s * r * 0.1); c.lineTo(r * 0.42, s * r * 0.07); c.quadraticCurveTo(r * 0.26, s * r * 0.12, r * 0.08, s * r * 0.13); c.fill(); } // 眉骨
      c.fillStyle = HORN; c.beginPath(); c.moveTo(r * 0.5, -r * 0.035); c.lineTo(r * 0.98, 0); c.lineTo(r * 0.5, r * 0.035); c.fill(); // 鼻角
      c.fillStyle = 'rgba(140,128,118,0.35)'; c.beginPath(); c.moveTo(r * 0.55, -r * 0.012); c.lineTo(r * 0.92, 0); c.lineTo(r * 0.55, r * 0.012); c.fill();
      for (const s of [-1, 1]) { c.fillStyle = '#0c0a09'; c.beginPath(); c.ellipse(r * 0.74, s * r * 0.045, r * 0.025, r * 0.012, s * 0.4, 0, TAU); c.fill(); } // 鼻孔
      for (let i = 0; i < 16; i++) { const u = (i * 0.618) % 1, v = ((i * 0.43) % 1) - 0.5; c.fillStyle = i % 2 ? 'rgba(20,16,15,0.3)' : 'rgba(150,138,126,0.22)'; c.beginPath(); c.ellipse(r * (u * 0.55 - 0.05), v * r * 0.26 * (1 - u * 0.5), r * 0.035, r * 0.022, 0, 0, TAU); c.fill(); }
    });
    // 眼：細長發光的豎瞳（二階段轉紅）
    const ec = phase === 2 ? EYE2 : EYE;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const s of [-1, 1]) { g.fillStyle = R.hexA(ec, 0.35); g.beginPath(); g.ellipse(r * 0.3, s * r * 0.13, r * 0.1, r * 0.05, s * 0.35, 0, TAU); g.fill(); }
    g.restore();
    for (const s of [-1, 1]) { g.fillStyle = ec; g.beginPath(); g.ellipse(r * 0.3, s * r * 0.13, r * 0.055, r * 0.018, s * 0.35, 0, TAU); g.fill(); g.fillStyle = '#1a0a04'; g.fillRect(r * 0.295, s * r * 0.13 - r * 0.012, r * 0.012, r * 0.024); }
    if (fire > 0) { // 口中火光：白芯、橘焰、外圈暗紅，隨機閃爍
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) { g.globalAlpha = fire * (0.55 - i * 0.12); g.fillStyle = i ? (i > 2 ? RED : FIRE) : CORE; g.beginPath(); g.arc(r * (0.82 + i * 0.12), 0, r * (0.1 + i * 0.09) * (0.88 + 0.24 * V()), 0, TAU); g.fill(); }
      g.restore();
    }
  }

  // 整條龍：S＝只畫陰影剪影
  function dragon(g, o, t, r, P, S) {
    P.t = t; g.save(); g.translate(P.lunge * r, 0); g.rotate(P.spin); g.scale(P.dip, P.dip);
    tail(g, r, t, P, S);
    if (!S) legs(g, r, t, P, false);
    wing(g, r, -1, P, S, o.phase); wing(g, r, 1, P, S, o.phase);
    if (!S && P.lift[0] + P.lift[1] > 0.05) legs(g, r, t, P, true); // 抬起的腳在翅膀上方（離鏡頭近）
    torso(g, r, P, o.phase, S);
    if (!S) spines(g, r, P.glow, t);
    neckAndHead(g, r, P, o.phase, t, S);
    g.restore();
  }
  // 離地時地上的龍形陰影：世界座標往右下偏（高度越高偏越多、越淡），換算回龍的區域座標
  function groundShadow(g, o, t, r, P, h, face, boost) {
    const dx = h * 0.22, dy = h * 0.3, c = Math.cos(face), s = Math.sin(face), sc = 1 - Math.min(0.2, h / 1200);
    g.save(); g.globalAlpha *= Math.min(0.45, Math.max(0.12, 0.3 - h / 1000) * (boost || 1));
    g.translate(dx * c + dy * s, -dx * s + dy * c); g.scale(sc, sc); dragon(g, o, t, r, P, true); g.restore();
  }

  R.defineBossStyle('agheel', {
    body(g, o, t, k) {
      // 選角肖像（小畫布、無世界）：通用肖像依 radius 換算會只看到一片翅膀，縮到整條龍放得進卡片
      const portrait = !o.world && g.canvas && g.canvas.width <= 256;
      if (portrait) { g.translate(k.r * 0.3, 0); g.scale(0.34, 0.34); }
      const h0 = elev(o.inst), h = h0 * k.r / 96, p = pose(o, t, k.st, h > 20); // 飛行高度跟著體型（sizeMul）等比放大
      if (portrait) wings(0.85, 0, 0);
      if (h > 2) {
        groundShadow(g, o, t, k.r, p, h, o.face);
        g.save(); g.translate(-Math.sin(o.face) * h, -Math.cos(o.face) * h); const sc = 1 + h0 / 600; g.scale(sc, sc);
        dragon(g, o, t, k.r, p, false); g.restore();
      } else dragon(g, o, t, k.r, p, false);
    },
    hidden(g, b, t) { // 升空（三拍俯衝 / 大招）：前段在空中振翼三下盤旋鎖定，最後 1/4 收翼急降
      const inst = b.inst; if (!inst) return;
      const land = inst.v.actions.find((a) => a.do === 'land' && a.at > inst.t), hide = inst.v.actions.filter((a) => a.do === 'hide' && a.at <= inst.t).pop();
      const mark = (land && inst.marks[land.mark]) || b.enemy || b;
      const p = land && hide ? cl((inst.t - hide.at) / (land.at - hide.at)) : 0.5;
      const q = p < 0.75 ? p / 0.75 * 0.5 : 0.5 + (p - 0.75) / 0.25 * 0.5;
      const x = b.x + (mark.x - b.x) * q, y = b.y + (mark.y - b.y) * q, hgt = p < 0.75 ? 60 + 150 * Math.sin(Math.min(1, p / 0.4) * Math.PI / 2) : 210 * (1 - (p - 0.75) / 0.25);
      const ang = U.angTo({ x, y }, mark) || b.face, k = b.r / 96;
      pose(b, t, 'skill', true); P.chest = 0; P.fire = 0; P.jaw = 0.1; P.yaw = 0; P.spin = 0; P.lunge = 0; P.dip = 1; P.tuck = 1;
      if (p < 0.75) { const u = p / 0.75, beat = Math.cos(u * 3 * TAU); wings(0.85 + 0.15 * beat, 0.9 * beat, 0.05); P.sway = Math.sin(u * 3 * TAU) * 0.3; } // 三拍：三下大振翼
      else { const u = (p - 0.75) / 0.25; wings(0.75 - 0.4 * u, -0.25, -0.55 * u); P.reach = 1.15; P.head = 1.04; P.jaw = 0.2 * u; P.straight = 0.7; P.sway = 0; } // 收翼俯衝
      g.save(); g.translate(x, y); g.rotate(ang); groundShadow(g, b, t, b.r, P, hgt * k, ang, 1.5); g.restore();
      g.save(); g.translate(x, y - hgt * k); g.rotate(ang); const sc = 1 + hgt / 900; g.scale(sc, sc);
      dragon(g, b, t, b.r, P, false); g.restore();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
