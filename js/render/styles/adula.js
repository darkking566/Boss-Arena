'use strict';
// 自繪俯視輝石龍亞杜拉。造型依已查看的遊戲畫面與官方宣傳圖（docs/research/adula/）：深藍灰鱗甲、破羽般的巨大翼膜（後緣鋸齒長尖）、背脊一排尖棘、
// 頭上分叉的鹿角冠與下顎鬚棘、頸後與胸口長出的青白輝石結晶、吐息是青藍帶白芯。月刃時嘴裡咬住一把冰藍魔法大劍。
// 姿勢讀實際時間軸（沉重節奏會拉長預警）；靜態材質以 R.blit 快取，亂數只用確定性公式或 BD.vrng。
(function (G) {
  const BD = G.BD, R = BD.Render, U = BD.U, TAU = U.TAU;
  const SC_D = '#141c2e', SC_M = '#27385a', SC_L = '#4a6a9a', FEA = '#2d4268', HORN = '#aab9d8', TEAL = '#6fe3ff', ICE = '#bff6ff', CORE = '#f2ffff', MOON = '#dfe9ff';
  const cl = (v) => U.clamp(v, 0, 1), ease = (v) => { v = cl(v); return v * v * (3 - 2 * v); };
  const CACHE = new WeakMap();
  const fxId = (a) => a.fx && (typeof a.fx === 'string' ? a.fx : a.fx.id);
  function info(inst) { // 時間軸分析（每個版本只算一次）：蓄力 = 到第一次判定，收勢 = 最後一次判定之後
    let v = CACHE.get(inst.v); if (v) return v;
    const acts = inst.v.actions, of = (k) => acts.filter((a) => a.do === k), hit = of('hit'), all = acts.filter((a) => a.do === 'hit' || a.do === 'rain' || a.do === 'proj').map((a) => a.at).sort((a, b) => a - b);
    v = { first: all.length ? all[0] : 1, last: all.length ? all[all.length - 1] : 1, hit, hide: of('hide'), land: of('land'), dash: of('dash'), proj: of('proj'), rain: of('rain'), tele: of('tele'),
      breath: hit.filter((a) => fxId(a) === 'adulabreath'), sweep: hit.filter((a) => fxId(a) === 'adulamoon' && a.shape === 'rect'), ring: hit.filter((a) => a.shape === 'ring') };
    CACHE.set(inst.v, v); return v;
  }
  function angAt(list, t) { // 相鄰兩口之間內插角度
    if (t <= list[0].at) return list[0].angOff || 0;
    for (let i = 1; i < list.length; i++) if (t < list[i].at) { const a = list[i - 1], b = list[i]; return U.lerp(a.angOff || 0, b.angOff || 0, (t - a.at) / (b.at - a.at)); }
    return list[list.length - 1].angOff || 0;
  }
  // 離地程度 0~1：側飛掠襲整段在低空
  function elev(inst) {
    if (!inst || inst.skill.id !== 'strafe') return 0;
    const d = info(inst).dash; if (d.length < 2) return 0;
    return ease((inst.t - d[0].at) / 0.4) * (1 - ease((inst.t - d[1].at - d[1].dur + 0.05) / 0.4));
  }
  // 姿勢：sp 翼張開 0~1、fl 拍動、dsp / dfl / dsw 單翼的追加張開 / 拍動 / 前擺（索引 0 左 1 右）、lift 後腿抬起、jaw 嘴張開、glow 口中光、
  //   lunge 身體前傾、neck 脖子伸縮、yaw 轉頭、spin 轉身、dip 身體壓低、tail 尾巴甩動、up 昂首、moon 月刃含在口中、cry 結晶亮度
  function pose(o, t, st, air) {
    const P = { sp: 0.35, fl: 0.06 * Math.sin(t * 1.6), dsp: [0, 0], dfl: [0, 0], dsw: [0, 0], lift: [0, 0], jaw: 0.05, glow: 0, lunge: 0, neck: 0, yaw: 0, spin: 0, dip: 1,
      tail: 0, up: 0, moon: 0, cry: o.phase === 2 ? 0.9 : 0.35, sway: Math.sin(t * 1.2) * 0.05, slam: 0 };
    const inst = o.inst;
    if (Math.hypot(o.vx || 0, o.vy || 0) > 30 && !air && !(inst && inst.dash)) { const ph = Math.sin(t * 8); P.sp = 0.42; P.dsw = [ph * 0.12, -ph * 0.12]; P.lift = [Math.max(0, -ph) * 0.5, Math.max(0, ph) * 0.5]; P.yaw = ph * 0.05; }
    if (air) { P.sp = 0.95; P.fl = 0.7 * Math.sin(t * 8); }
    if (['stun', 'stagger', 'knockdown'].includes(st)) { P.sp = 0.15; P.jaw = 0.4; P.cry = 0.1; P.sway = Math.sin(t * 2.3) * 0.2; P.dip = 0.95; return P; }
    if (st === 'transition') { const q = cl((o.stateT || 0) / ((o.def.phase2 && o.def.phase2.roarAt) || 1.8)); P.sp = 0.4 + 0.6 * ease(q); P.fl = 0.25 * Math.sin(t * 10) * q; P.up = ease(q); P.jaw = 0.1 + 0.4 * q; P.cry = 0.3 + 0.7 * q; P.glow = q * 0.8; P.moon = q; return P; }
    if (!inst) return P;
    const I = info(inst), T = inst.t, id = inst.skill.id, p = R.skillPace(inst, { hit: 1 }), a = p.a || {}, w = ease(p.wind / 0.82), s = cl((p.wind - 0.82) / 0.18);
    const wind = ease(T / Math.max(0.2, I.first)), after = 1 - ease((T - I.last) / 0.5);
    const bite = () => { // 脖子後縮張口 → 猛伸、闔顎
      P.yaw = U.clamp(a.angOff || 0, -1, 1) * 1.4; const mag = a.fxEl === 'glintstone';
      if (p.snap > 0) { P.neck = 0.45 * p.snap; P.jaw = 0.05; P.lunge = 0.12 * p.snap; P.glow = mag ? p.snap : 0; }
      else { P.neck = -0.25 * w + 0.6 * s; P.jaw = 0.1 + 0.6 * w * (1 - s); P.glow = mag ? 0.8 * w : 0; }
    };
    if (id === 'bite') bite();
    else if (id === 'stomp') {
      const k = a.angOff ? (a.angOff > 0 ? 1 : 0) : -1;
      if (k < 0) { // 前撲重踏：雙腳離地、雙翼上舉 → 整個身子壓下
        if (p.snap > 0) { P.sp = 0.75; P.fl = -0.6 * p.snap; P.dip = 1 - 0.07 * p.snap; P.slam = p.snap; P.jaw = 0.25 * p.snap; }
        else { P.lift = [0.6 * w * (1 - s), 0.6 * w * (1 - s)]; P.sp = 0.35 + 0.4 * w; P.fl = 0.6 * w; P.dip = 1 + 0.05 * w; P.up = 0.3 * w; }
      } else if (p.snap > 0) { P.dip = 1 - 0.04 * p.snap; P.spin = (k ? -1 : 1) * 0.04 * p.snap; P.slam = 0.6 * p.snap; }
      else { P.lift[k] = w * (1 - s); P.dfl[k] = 0.45 * w; P.dsp[k] = 0.25 * w; P.spin = (k ? -1 : 1) * 0.07 * w; P.dip = 1 + 0.02 * w; }
    } else if (id === 'wing_slam') {
      if (p.i === 0) { // 右翼高舉 → 拍下
        if (p.snap > 0) { P.dsp[1] = 0.6; P.dfl[1] = -0.75 * p.snap; P.dip = 1 - 0.04 * p.snap; P.slam = p.snap; }
        else { P.dsp[1] = 0.6 * w; P.dfl[1] = 0.9 * w - 1.6 * s; P.dsw[1] = 0.3 * w; P.spin = -0.08 * w; }
      } else if (p.snap > 0) { P.sp = 0.6 + 0.4 * p.snap; P.fl = -0.4 * p.snap; P.dsw = [0.5 * p.snap, 0.5 * p.snap]; P.slam = p.snap; }
      else { P.sp = 0.4 + 0.6 * w; P.fl = 0.4 * w * (1 - s); P.dsw = [-0.7 * w + 1.2 * s, -0.7 * w + 1.2 * s]; P.dip = 1 + 0.03 * w; } // 雙翼往後拉滿 → 貼地往前掃
    } else if (id === 'charge') {
      const d = I.dash[0];
      if (inst.dash) { P.sp = 0.45; P.dsw = [-0.4, -0.4]; P.fl = 0.2 * Math.sin(t * 16); P.neck = 0.2; P.jaw = 0.3; P.lunge = 0.15; }
      else if (d && T < d.at) { const c = ease(T / Math.min(0.4, d.at)); P.up = 0.7 * c; P.jaw = 0.15 + 0.4 * c; P.sp = 0.35 + 0.4 * c; P.fl = 0.08 * Math.sin(t * 22) * c; P.glow = 0.3 * c; } // 怒吼
      else bite();
    } else if (id === 'tail_gore') {
      if (p.i === 0 && I.hit[0]) { const u = cl(T / (I.hit[0].at + 0.3)), e = u * u * u * (u * (u * 6 - 15) + 10); P.spin = e * TAU; P.tail = -1.2 * Math.sin(u * Math.PI); P.sp = 0.22; P.yaw = -0.3 * Math.sin(u * Math.PI); } // 原地旋身一圈
      else bite();
    } else if (id === 'glintstone_stars') { // 昂首在嘴前凝晶 → 每一波碎片頭往前一點
      const h0 = I.hit[0] ? I.hit[0].at : I.first; let k = 0; for (const q of I.proj) if (T >= q.at) k = Math.max(k, 1 - (T - q.at) / 0.3);
      const c = ease(T / h0), on = T <= I.last + 0.3 ? 1 : 0;
      P.up = (T < h0 ? 0.6 * c : 0.2) * on; P.jaw = (0.15 + 0.45 * c) * on + 0.05; P.glow = c * on; P.sp = 0.5 + 0.4 * c * on; P.neck = T < h0 ? -0.2 * c : 0.3 * k; P.cry = 1; P.fl = 0.3 * k;
    } else if (id === 'dive_bomb' && I.hide[0] && T < I.hide[0].at) { P.sp = 0.7; P.fl = -0.6; P.dip = 0.93; P.up = 0.2; } // 起飛前一蹲
    else if (id === 'moonblade') { // 落地後口含月刃 → 劍波出手時橫甩一下
      const pr = I.proj[0], f = I.hit[0]; P.sp = 0.9; P.cry = 1;
      if (f && T >= f.at) { const end = pr ? pr.at : f.at + 0.2, k = pr ? cl((T - f.at) / Math.max(0.05, end - f.at)) : 1, q = cl((T - end) / 0.3); P.moon = 1 - ease(q); P.jaw = 0.5 * P.moon; P.glow = P.moon; P.yaw = T < end ? -0.6 * ease(k) : -0.6 + 1.3 * ease(q); P.lunge = 0.15 * (1 - q); }
    } else if (inst.skill.ult) { P.sp = 0.5 + 0.5 * wind * after; P.up = wind * after; P.glow = 0.5 * wind * after; P.moon = wind * after * (o.phase === 2 ? 1 : 0.5); P.cry = 1; P.jaw = 0.25 * wind; }
    // 吐息：蓄氣後縮 → 噴出，頭跟著每一口的角度轉（大角度連身體一起轉）
    if (I.breath.length) {
      const b0 = I.breath[0].at, b1 = I.breath[I.breath.length - 1].at + 0.2, pre = Math.min(0.85, Math.max(0.3, b0 - 0.05));
      if (T >= b0 - pre && T <= b1 + 0.6) {
        const g = I.breath.map((x) => x.angOff || 0), span = Math.max(...g) - Math.min(...g), part = span > 3.5 ? 1 : span > 1.2 ? 0.55 : 0, ang = angAt(I.breath, T);
        if (T < b0) { const c = ease((T - b0 + pre) / pre); P.neck = -0.25 * c; P.jaw = 0.1 + 0.3 * c; P.glow = 0.6 * c; P.up = 0.3 * c; P.sp = Math.max(P.sp, 0.5); P.spin += ang * part * c; P.yaw = ang * (1 - part) * c; }
        else { const f = T <= b1 ? 1 : Math.max(0, 1 - (T - b1) / 0.25), back = T <= b1 ? 1 : ease(1 - (T - b1) / 0.6); P.neck = 0.2 * f; P.jaw = 0.1 + 0.55 * f; P.glow = f; P.up = 0; P.sp = Math.max(P.sp, 0.55); P.spin += ang * part * back; P.yaw = (ang * (1 - part) + Math.sin(t * 23) * 0.025 * f) * back; }
      }
    }
    // 大招收尾：口含月刃橫掃全場，整個身子跟著劍波轉
    if (I.sweep.length) {
      const s0 = I.sweep[0].at, s1 = I.sweep[I.sweep.length - 1].at;
      if (T >= s0 - 0.6 && T <= s1 + 0.5) { const c = ease((T - s0 + 0.6) / 0.6), back = T <= s1 ? 1 : ease(1 - (T - s1) / 0.5); P.moon = c * back; P.jaw = 0.5 * P.moon; P.glow = P.moon; P.up = 0; P.sp = 0.8; P.spin = angAt(I.sweep, T) * (T < s0 ? c : back); P.lunge = 0.15 * back; }
    }
    for (const h of I.ring) if (T >= h.at - 0.3 && T < h.at + 0.3) { const q = cl((T - h.at + 0.3) / 0.3), d = cl((T - h.at) / 0.3); P.sp = 0.95; P.fl = T < h.at ? 0.7 * q : -0.7 * (1 - d); P.slam = T < h.at ? 0 : 1 - d; P.dip = T < h.at ? 1 + 0.04 * q : 1 - 0.05 * (1 - d); } // 衝擊環：雙翼一拍
    const L = I.land.filter((l) => T >= l.at && T < l.at + 0.6).pop();
    if (L && !(id === 'moonblade')) { const q = ease((T - L.at) / 0.6); P.sp = 1 - 0.6 * q; P.fl = -0.6 * (1 - q); P.dip = 0.9 + 0.1 * q; P.jaw = 0.4 * (1 - q); P.slam = 1 - q; } // 落地緩衝
    return P;
  }
  // 結晶：青白尖晶，加亮時外圈發光
  function crystal(g, x, y, ang, len, w, bright) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = bright > 0.6 ? ICE : '#7fd8ee'; g.strokeStyle = '#1b4d78'; g.lineWidth = Math.max(1, w * 0.12);
    g.beginPath(); g.moveTo(len, 0); g.lineTo(len * 0.1, -w); g.lineTo(-len * 0.2, 0); g.lineTo(len * 0.1, w); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.moveTo(len * 0.85, 0); g.lineTo(len * 0.15, -w * 0.45); g.lineTo(len * 0.25, 0); g.closePath(); g.fill();
    if (bright > 0.2) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 * bright; g.fillStyle = TEAL; g.beginPath(); g.arc(len * 0.3, 0, w * 2.2, 0, TAU); g.fill(); }
    g.restore();
  }
  // 翼：side=-1 左（畫面上方）、+1 右。翼膜由肩部向外後方展開，後緣是長短不一的鋸齒羽尖
  function wing(g, side, r, P, t, shadow) {
    const k = side < 0 ? 0 : 1, sp = cl(P.sp + P.dsp[k]), fl = P.fl + P.dfl[k] + 0.05 * Math.sin(t * 1.5 + side), span = r * (1.3 + 1.7 * sp), sweep = r * (1.1 + 1.5 * (1 - sp) + 0.3 * P.slam);
    g.save(); g.translate(r * 0.15, side * r * 0.5); g.scale(1, side * (1 - 0.2 * Math.min(1, Math.abs(fl)))); g.rotate(-P.dsw[k]);
    const pts = []; const n = 9; // 後緣的羽尖：沿翼骨由肩到翼尖
    for (let i = 0; i <= n; i++) { const u = i / n; pts.push([r * 0.1 - sweep * (0.35 + u * 0.65) - (i % 2 ? r * 0.4 : 0) - (i === n ? r * 0.35 : 0), span * u * (1 - 0.1 * (1 - u))]); }
    const body = () => { g.beginPath(); g.moveTo(r * 0.25, 0); g.lineTo(r * 0.0, span * 0.55); g.lineTo(-r * 0.35, span);
      for (let i = n; i >= 0; i--) { g.lineTo(pts[i][0], pts[i][1]); if (i > 0) g.lineTo((pts[i][0] + pts[i - 1][0]) / 2 - r * 0.12, (pts[i][1] + pts[i - 1][1]) / 2 - r * 0.06); }
      g.lineTo(-r * 0.3, 0); g.closePath(); };
    if (shadow) { g.fillStyle = '#000'; body(); g.fill(); g.restore(); return; }
    const gr = g.createLinearGradient(0, 0, -sweep, span); gr.addColorStop(0, SC_M); gr.addColorStop(0.6, FEA); gr.addColorStop(1, '#0f1626');
    g.fillStyle = gr; body(); g.fill(); g.strokeStyle = '#080d18'; g.lineWidth = r * 0.04; g.stroke();
    g.strokeStyle = 'rgba(120,160,215,0.35)'; g.lineWidth = r * 0.025; // 翼脈
    for (let i = 2; i < n; i += 2) { g.beginPath(); g.moveTo(r * 0.1, span * (i / n) * 0.7); g.lineTo(pts[i][0] + r * 0.1, pts[i][1] * 0.97); g.stroke(); }
    g.strokeStyle = SC_L; g.lineWidth = r * 0.09; g.lineCap = 'round'; g.beginPath(); g.moveTo(r * 0.25, 0); g.lineTo(r * 0.0, span * 0.55); g.lineTo(-r * 0.35, span); g.stroke(); // 翼骨
    const gl = 0.25 + 0.75 * P.cry; // 翼骨上的小結晶
    for (let i = 1; i <= 3; i++) crystal(g, r * 0.1, span * (i / 3.6), -side * 1.2 + 0.6, r * 0.16, r * 0.05, gl);
    g.restore();
  }
  function head(g, r, P, t) {
    g.save(); const nl = r * (0.85 + 0.7 * P.lunge + 0.85 * P.neck), reach = r * 0.5 + nl * Math.cos(P.yaw), hy = Math.sin(t * 1.7) * r * 0.03 + P.sway * r * 0.5 + nl * Math.sin(P.yaw);
    // 頸：由胸前伸到頭，分段鱗
    g.strokeStyle = SC_M; g.lineWidth = r * 0.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(r * 0.5, 0); g.quadraticCurveTo(r * 0.95, hy * 1.5, reach, hy); g.stroke();
    g.strokeStyle = SC_L; g.lineWidth = r * 0.12; g.beginPath(); g.moveTo(r * 0.5, 0); g.quadraticCurveTo(r * 0.95, hy * 1.5, reach, hy); g.stroke();
    for (let i = 0; i < 4; i++) { const u = 0.2 + i * 0.2; crystal(g, r * 0.5 + (reach - r * 0.5) * u, hy * u * (0.6 + 0.4 * u), P.yaw * u, r * 0.18, r * 0.06, P.cry); }
    g.translate(reach, hy); g.rotate(P.yaw);
    const jaw = P.jaw * r * 0.5;
    // 下顎與鬚棘
    g.fillStyle = SC_D; g.beginPath(); g.moveTo(-r * 0.1, r * 0.18); g.lineTo(r * 0.7, jaw + r * 0.1); g.lineTo(r * 0.78, jaw); g.lineTo(-r * 0.1, r * 0.02); g.closePath(); g.fill();
    g.fillStyle = SC_M; g.beginPath(); g.moveTo(-r * 0.1, -r * 0.18); g.lineTo(r * 0.75, -jaw - r * 0.08); g.lineTo(r * 0.8, -jaw); g.lineTo(-r * 0.1, -r * 0.02); g.closePath(); g.fill();
    // 頭：長楔形、額頭
    g.fillStyle = SC_M; g.strokeStyle = '#080d18'; g.lineWidth = r * 0.03; g.beginPath(); g.moveTo(r * 0.82, 0); g.lineTo(r * 0.3, -r * 0.3); g.lineTo(-r * 0.2, -r * 0.24); g.lineTo(-r * 0.25, r * 0.24); g.lineTo(r * 0.3, r * 0.3); g.closePath(); g.fill(); g.stroke();
    // 分叉鹿角冠
    g.strokeStyle = HORN; g.lineWidth = r * 0.07; g.lineCap = 'round';
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(r * 0.05, s * r * 0.2); g.lineTo(-r * 0.35, s * r * 0.5); g.lineTo(-r * 0.75, s * r * 0.58); g.stroke();
      g.lineWidth = r * 0.05; g.beginPath(); g.moveTo(-r * 0.35, s * r * 0.5); g.lineTo(-r * 0.55, s * r * 0.8); g.stroke(); g.beginPath(); g.moveTo(-r * 0.5, s * r * 0.55); g.lineTo(-r * 0.95, s * r * 0.38); g.stroke(); g.lineWidth = r * 0.07; }
    // 眼睛
    g.fillStyle = TEAL; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(r * 0.28, s * r * 0.16, r * 0.07, r * 0.035, s * 0.4, 0, TAU); g.fill(); }
    if (P.moon > 0.05) { // 月刃：冰藍魔法大劍咬在口中指向前方
      g.save(); g.globalAlpha *= cl(P.moon * 1.4); g.globalCompositeOperation = 'lighter';
      const L = r * 3.4 * (0.4 + 0.6 * P.moon); const gr = g.createLinearGradient(r * 0.5, 0, r * 0.5 + L, 0); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.5, 'rgba(140,220,255,0.7)'); gr.addColorStop(1, 'rgba(60,140,255,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(r * 0.5, -r * 0.1); g.lineTo(r * 0.5 + L * 0.9, -r * 0.18); g.lineTo(r * 0.5 + L, 0); g.lineTo(r * 0.5 + L * 0.9, r * 0.18); g.lineTo(r * 0.5, r * 0.1); g.closePath(); g.fill();
      g.fillStyle = 'rgba(223,233,255,0.9)'; g.fillRect(r * 0.5, -r * 0.3, r * 0.1, r * 0.6); g.restore();
    }
    if (P.glow > 0.05) { // 口中輝石光
      g.save(); g.globalCompositeOperation = 'lighter'; const rr = r * (0.3 + 0.7 * P.glow) * (0.9 + 0.1 * Math.sin(t * 18)), gr = g.createRadialGradient(r * 0.8, 0, 0, r * 0.8, 0, rr);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.35, 'rgba(111,227,255,0.7)'); gr.addColorStop(1, 'rgba(40,120,220,0)'); g.fillStyle = gr; g.beginPath(); g.arc(r * 0.8, 0, rr, 0, TAU); g.fill(); g.restore();
    }
    g.restore();
  }
  function tail(g, r, P, t) {
    const n = 12, sw = P.tail; g.save(); g.lineCap = 'round';
    const pts = []; for (let i = 0; i <= n; i++) { const u = i / n; pts.push([-r * (0.5 + u * 2.7), Math.sin(t * 1.6 - u * 3) * r * 0.22 * u + sw * Math.sin(u * 2.4) * r * 1.3 * u]); }
    for (let pass = 0; pass < 2; pass++) { g.strokeStyle = pass ? SC_L : SC_M; g.lineWidth = r * (pass ? 0.08 : 0.46); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i <= n; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); }
    for (let i = 2; i <= n; i += 2) crystal(g, pts[i][0], pts[i][1], Math.PI, r * 0.2 * (1 - i / n * 0.5), r * 0.06, P.cry);
    const e = pts[n]; g.fillStyle = SC_D; g.beginPath(); g.moveTo(e[0] - r * 0.5, e[1]); g.lineTo(e[0], e[1] - r * 0.12); g.lineTo(e[0], e[1] + r * 0.12); g.closePath(); g.fill(); g.restore();
  }
  function dragon(g, o, t, r, P, shadow) {
    g.save(); g.rotate(P.spin); g.translate(P.lunge * r, 0); g.scale(P.dip, P.dip);
    if (shadow) { for (const s of [-1, 1]) wing(g, s, r, P, t, true); g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, 0, r * 1.05, r * 0.6, 0, 0, TAU); g.fill(); g.restore(); return; }
    tail(g, r, P, t);
    for (const s of [-1, 1]) wing(g, s, r, P, t, false);
    // 後肢：兩隻爪在身側
    g.fillStyle = SC_D; for (const s of [-1, 1]) { const lf = P.lift[s < 0 ? 0 : 1]; g.beginPath(); g.ellipse(-r * 0.35 + lf * r * 0.22, s * r * 0.62, r * (0.38 + lf * 0.06), r * (0.2 + lf * 0.03), s * 0.3, 0, TAU); g.fill(); }
    R.blit(g, 'adula:torso:' + Math.round(r), r * 3, r * 2, r * 1.5, r, (c) => {
      const gr = c.createRadialGradient(r * 0.1, 0, r * 0.1, 0, 0, r * 1.1); gr.addColorStop(0, SC_L); gr.addColorStop(0.55, SC_M); gr.addColorStop(1, SC_D);
      c.fillStyle = gr; c.strokeStyle = '#080d18'; c.lineWidth = r * 0.04; c.beginPath(); c.ellipse(0, 0, r * 1.0, r * 0.62, 0, 0, TAU); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(160,200,245,0.18)'; c.lineWidth = r * 0.02; for (let i = -3; i <= 3; i++) { c.beginPath(); c.arc(-r * 0.1 + i * r * 0.28, 0, r * 0.5, -1.1, 1.1); c.stroke(); }
    });
    // 背脊一列尖棘與結晶
    for (let i = 0; i < 8; i++) { const x = r * 0.6 - i * r * 0.26; g.fillStyle = SC_D; g.beginPath(); g.moveTo(x + r * 0.1, -r * 0.06); g.lineTo(x - r * 0.12, 0); g.lineTo(x + r * 0.1, r * 0.06); g.closePath(); g.fill(); if (i % 2 === 0) crystal(g, x, 0, 0, r * 0.22, r * 0.07, P.cry); }
    head(g, r, P, t); g.restore();
  }
  function shadowOf(g, b, t, r, P, h) { g.save(); g.globalAlpha *= Math.max(0.12, 0.3 - h / 1500); g.translate(h * 0.15, h * 0.2); dragon(g, b, t, r, P, true); g.restore(); }
  R.defineBossStyle('adula', {
    body(g, b, t, k) {
      const portrait = !b.world && g.canvas && g.canvas.width <= 256, e = elev(b.inst), P = pose(b, t, k.st, e > 0.3);
      const hover = (Math.sin(t * 1.5) * 0.5 + 0.5) * k.r * 0.08 + e * k.r * 0.9;
      if (portrait) { g.translate(k.r * 0.2, 0); g.scale(0.34, 0.34); }
      shadowOf(g, b, t, k.r, P, hover + k.r * 0.15);
      g.save(); g.rotate(-(b.face || 0)); g.translate(0, -hover); g.rotate(b.face || 0); dragon(g, b, t, k.r, P, false); g.restore(); // 往畫面上方抬起（世界座標）
    },
    hidden(g, b, t) { // 升空：往落點飛、振翼三下，最後收翼急降；月刃時口含冰藍大劍
      if (!b.inst) return;
      const I = info(b.inst), T = b.inst.t, land = I.land.find((a) => a.at > T), hide = I.hide.filter((a) => a.at <= T).pop();
      if (!land || !hide) return;
      const mark = b.inst.marks[land.mark] || b.enemy || b, p = cl((T - hide.at) / (land.at - hide.at)), q = ease(p);
      const x = U.lerp(b.x, mark.x, q), y = U.lerp(b.y, mark.y, q), h = (1 - Math.pow(Math.max(0, (p - 0.75) / 0.25), 2)) * Math.sin(Math.min(1, p * 1.4) * Math.PI * 0.5) * b.r * 2.6;
      const ang = Math.atan2(mark.y - b.y, mark.x - b.x), P = pose({ phase: b.phase, def: b.def }, t, 'idle');
      P.sp = p > 0.8 ? 0.2 : 0.95; P.fl = p > 0.8 ? 0 : 0.8 * Math.sin(t * 9 + 0.4); P.tail = 0.1; P.moon = b.inst.skill.id === 'moonblade' ? cl(p * 2) : 0; P.jaw = 0.4 * P.moon; P.glow = P.moon * 0.6;
      g.save(); g.translate(x, y); g.rotate(ang); shadowOf(g, b, t, b.r, P, h); g.restore();
      g.save(); g.translate(x, y - h); g.rotate(ang); const sc = 1 + h / (b.r * 9); g.scale(sc, sc); dragon(g, b, t, b.r, P, false); g.restore();
    },
  });
  // 投射物：輝石碎片（冰藍尖晶）與月刃劍波（新月形冰藍弧光）
  R.projStyles = R.projStyles || {};
  R.projStyles.glintshard = function (g, p, t) {
    const r = p.r; g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 2); gr.addColorStop(0, 'rgba(180,245,255,0.7)'); gr.addColorStop(1, 'rgba(60,160,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 2, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over';
    for (let i = 1; i <= 4; i++) { g.globalAlpha = 0.5 / i; g.fillStyle = TEAL; g.beginPath(); g.moveTo(-r * i * 0.9, 0); g.lineTo(-r * (i * 0.9 - 0.8), -r * 0.35); g.lineTo(-r * (i * 0.9 - 0.8), r * 0.35); g.fill(); } g.globalAlpha = 1;
    crystal(g, 0, 0, 0, r * 1.3, r * 0.55, 1);
  };
  R.projStyles.moonwave = function (g, p, t) {
    const r = p.r; g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { g.globalAlpha = 0.5 - i * 0.14; g.strokeStyle = i ? TEAL : MOON; g.lineWidth = r * (0.5 - i * 0.14); g.beginPath(); g.arc(-r * (0.5 + i * 0.45), 0, r * (1.1 + i * 0.1), -1.15, 1.15); g.stroke(); }
    g.globalAlpha = 1; const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.2); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(100,190,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 1.2, 0, TAU); g.fill();
  };
})(typeof window !== 'undefined' ? window : globalThis);
