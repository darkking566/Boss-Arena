'use strict';
// Boss 造型：鏡爪（俯視）。
// 神羊（body）：白色羊毛斗篷（邊緣一圈蓬鬆的毛球）、兩側垂下的羊耳、臉上是深色的狼面具（眼窩冷藍）、手中一直握著新月形的銀弓——
//   射箭的招式會依時間軸拉滿弓弦、搭上一支發光的箭。
// 魔狼（under）：比神羊大一圈的靈狼——深藍黑的身軀與尖刺般的鬃毛、冷藍的靈光輪廓、煙霧般的尾巴、戴著白色羊面具（原作：兩人的面具互相顛倒）。
//   平時跟在神羊身側小跑；招式中凡是 fx 為 wolfbite / wolfmaw / wolfcharge / lambfinale 的判定，魔狼會先潛行靠近、在判定前 LEAD 秒撲上去張口咬下。
//   二階段（饗宴）魔狼身形暴漲、眼睛與鬃毛燃起橘紅鬼火。魔狼的位置只存在這個檔案的 WeakMap（純視覺，不影響戰鬥）。考據見 docs/bosses/kindred.md
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render;
  const ICE = '#8fe3ff', SILVER = '#eef7ff', BLOOD = '#d0102a', EMBER = '#ff7a3a';
  const WOLF_FX = { wolfbite: 1, wolfmaw: 1, wolfcharge: 1, lambfinale: 1 };
  const LEAD = 0.42, HOLD = 0.22; // 魔狼在判定前 LEAD 秒起撲、判定後停在原地 HOLD 秒
  const SHOOT = { arrows: 1, dread: 1, leap: 1, frenzy: 1 }, TRIG = { proj: 1 };
  const wolves = new WeakMap();

  const fxId = (f) => (typeof f === 'string' ? f : f && f.id);
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  // 判定點：印記位置 / 直線判定（rect）的終點 / 對手位置
  function strikePoint(b, inst, a) {
    if (a.anchor === 'mark' && inst.marks && inst.marks[a.mark]) return inst.marks[a.mark];
    if (a.shape === 'rect') { const L = (a.len || 400) * 0.92; return { x: b.x + Math.cos(b.face) * L, y: b.y + Math.sin(b.face) * L }; }
    return b.enemy || b;
  }
  // 這招接下來（或剛咬完 HOLD 秒內）的魔狼判定
  function nextWolfHit(inst) {
    const acts = inst && inst.v && inst.v.actions;
    if (!acts) return null;
    let best = null;
    for (const a of acts) if (a.do === 'hit' && WOLF_FX[fxId(a.fx)] && a.at + HOLD >= inst.t && (!best || a.at < best.at)) best = a;
    return best;
  }

  // 每幀推進魔狼的演出狀態：位置平滑追向「休息點 / 潛行點 / 撲擊點」，記錄速度（步伐）、張口與騰空
  function track(b, t, s) {
    let S = wolves.get(b);
    const restA = b.face + 2.2, rd = b.r + s * 1.7, rx = b.x + Math.cos(restA) * rd, ry = b.y + Math.sin(restA) * rd;
    if (!S) { S = { x: rx, y: ry, ang: b.face, lt: t, gait: 0, jaw: 0, air: 0, speed: 0 }; wolves.set(b, S); }
    const dt = Math.min(0.05, Math.max(0, t - S.lt)); S.lt = t;
    let tx = rx + Math.sin(t * 1.3) * b.r * 0.4, ty = ry + Math.cos(t * 1.1) * b.r * 0.4, rate = 5, face = b.face, jaw = 0, air = 0;
    const inst = b.state === 'skill' ? b.inst : null, a = nextWolfHit(inst);
    if (a && b.state !== 'dead') {
      const p = strikePoint(b, inst, a), toP = Math.atan2(p.y - S.y, p.x - S.x), lead = a.shape === 'rect' ? 0.5 : LEAD;
      if (inst.t >= a.at - lead) { // 撲擊：頭對準判定點
        const k = U.clamp((inst.t - (a.at - lead)) / lead, 0, 1);
        tx = p.x - Math.cos(toP) * s * 1.2; ty = p.y - Math.sin(toP) * s * 1.2; rate = inst.t < a.at ? 16 : 30; face = toP;
        jaw = inst.t < a.at ? k : Math.max(0, 1 - (inst.t - a.at) / 0.08);
        air = a.shape === 'rect' || inst.t >= a.at ? 0 : Math.sin(k * Math.PI);
      } else { // 潛行：壓低身子往獵物靠近一半
        tx = U.lerp(b.x, p.x, 0.5); ty = U.lerp(b.y, p.y, 0.5); rate = 4; face = Math.atan2(p.y - b.y, p.x - b.x);
      }
    } else if (b.state === 'skill' && b.enemy) face = Math.atan2(b.enemy.y - S.y, b.enemy.x - S.x);
    const k = 1 - Math.exp(-rate * dt), px = S.x, py = S.y;
    S.x += (tx - S.x) * k; S.y += (ty - S.y) * k;
    const sp = dt > 0 ? Math.hypot(S.x - px, S.y - py) / dt : 0;
    S.speed += (sp - S.speed) * Math.min(1, dt * 10);
    if (S.speed > 90 && !jaw) face = Math.atan2(S.y - py, S.x - px);
    S.ang += wrap(face - S.ang) * Math.min(1, dt * 12);
    S.gait += S.speed * dt * 0.05;
    S.jaw += (jaw - S.jaw) * Math.min(1, dt * 25); S.air = air;
    return S;
  }

  // 魔狼軀幹（固定形狀 → 離屏快取）：胸與臀兩團、尖刺鬃毛、冷藍輪廓；本地座標朝 +x
  function torso(g, s, p2) {
    const rim = p2 ? EMBER : ICE;
    const aura = g.createRadialGradient(0, 0, s * 0.3, 0, 0, s * 1.5); // 靈光：遠距離也看得出一頭狼的輪廓
    aura.addColorStop(0, 'rgba(' + (p2 ? '255,90,40' : '120,210,255') + ',0.45)'); aura.addColorStop(1, 'rgba(' + (p2 ? '255,90,40' : '120,210,255') + ',0)');
    g.fillStyle = aura; g.beginPath(); g.ellipse(-0.1 * s, 0, 1.5 * s, 0.95 * s, 0, 0, U.TAU); g.fill();
    g.fillStyle = '#121626'; g.strokeStyle = rim; g.lineWidth = Math.max(2, s * 0.07);
    g.beginPath(); // 鬃毛：肩頸一圈向外的尖刺
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI * 0.35 + i / 16 * Math.PI * 1.3, rr = (i % 2 ? 0.48 : 0.72) * s;
      g.lineTo(0.3 * s + Math.cos(a + Math.PI) * rr, Math.sin(a + Math.PI) * rr);
    }
    g.closePath(); g.fill(); g.stroke();
    const grd = g.createLinearGradient(0, -0.4 * s, 0, 0.4 * s);
    grd.addColorStop(0, '#1a2034'); grd.addColorStop(0.5, p2 ? '#4a2a34' : '#3c4a6c'); grd.addColorStop(1, '#1a2034');
    g.fillStyle = grd;
    g.beginPath(); g.ellipse(-0.55 * s, 0, 0.55 * s, 0.32 * s, 0, 0, U.TAU); g.fill(); g.stroke(); // 臀
    g.beginPath(); g.ellipse(0.2 * s, 0, 0.55 * s, 0.4 * s, 0, 0, U.TAU); g.fill(); g.stroke(); // 胸
    g.strokeStyle = 'rgba(' + (p2 ? '255,140,90' : '190,235,255') + ',0.55)'; g.lineWidth = Math.max(1, s * 0.03); // 背脊的亮線
    g.beginPath(); g.moveTo(-0.95 * s, 0); g.quadraticCurveTo(-0.2 * s, -0.05 * s, 0.6 * s, 0); g.stroke();
  }

  function drawWolf(ctx, S, s, t, p2, dead) {
    const rim = p2 ? EMBER : ICE, eye = p2 ? '#ffb070' : '#bff3ff';
    ctx.save(); ctx.translate(S.x, S.y - S.air * s * 0.7); ctx.rotate(S.ang);
    const lift = 1 + S.air * 0.18; ctx.scale(lift, lift);
    if (dead) ctx.globalAlpha = 0.55;
    // 尾巴：一束逐漸變細的暗色毛尾，尾端散成兩縷靈煙，隨步伐與時間擺動
    const sway = Math.sin(t * 3 + S.gait) * 0.3, tipX = -1.75 * s, tipY = sway * s;
    ctx.fillStyle = '#121626'; ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.beginPath(); ctx.moveTo(-0.95 * s, -0.16 * s); ctx.quadraticCurveTo(-1.35 * s, tipY * 0.5 - 0.2 * s, tipX, tipY);
    ctx.quadraticCurveTo(-1.35 * s, tipY * 0.5 + 0.2 * s, -0.95 * s, 0.16 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineCap = 'round';
    for (const d of [1, -1]) {
      ctx.strokeStyle = 'rgba(' + (p2 ? '255,120,60' : '140,225,255') + ',0.35)'; ctx.lineWidth = s * 0.07;
      ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.quadraticCurveTo(tipX - 0.2 * s, tipY + d * 0.1 * s + Math.sin(t * 5 + d) * 0.08 * s, tipX - 0.45 * s, tipY + d * 0.22 * s); ctx.stroke();
    }
    // 四條腿：粗壯的狼腿（帶靈光輪廓）＋爪，對角成對擺動（跑得越快擺幅越大）
    const amp = Math.min(1, S.speed / 260) * 0.38 * s;
    for (const [lx, ly, ph] of [[0.4, 0.3, 0], [0.4, -0.3, Math.PI], [-0.6, 0.26, Math.PI], [-0.6, -0.26, 0]]) {
      const sw = Math.sin(S.gait + ph) * amp, fx = lx * s + sw + 0.12 * s, fy = ly * s * 1.75;
      ctx.strokeStyle = rim; ctx.lineWidth = s * 0.25;
      ctx.beginPath(); ctx.moveTo(lx * s, ly * s); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.strokeStyle = '#121626'; ctx.lineWidth = s * 0.17;
      ctx.beginPath(); ctx.moveTo(lx * s, ly * s); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.fillStyle = '#e8edf5'; for (const c of [-1, 0, 1]) { ctx.beginPath(); ctx.arc(fx + 0.1 * s, fy + c * 0.05 * s, s * 0.025, 0, U.TAU); ctx.fill(); } // 爪
    }
    R.blit(ctx, 'kindred:wolf:torso:' + Math.round(s) + ':' + (p2 ? 2 : 1), s * 3.2 + 8, s * 1.9 + 8, s * 1.6 + 4, s * 0.95 + 4, (g) => torso(g, s, p2));
    if (p2 && !dead) { // 饗宴：鬃毛燃起鬼火
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * 0.55 + i / 6 * Math.PI * 0.9, fl = 0.75 + 0.25 * Math.sin(t * 14 + i * 1.7);
        const bx = 0.3 * s + Math.cos(a + Math.PI) * 0.55 * s, by = Math.sin(a + Math.PI) * 0.55 * s;
        ctx.fillStyle = i % 2 ? 'rgba(255,120,50,0.55)' : 'rgba(255,60,40,0.5)';
        ctx.beginPath(); ctx.moveTo(bx - 0.1 * s, by); ctx.lineTo(bx - 0.45 * s * fl, by + Math.sign(by || 1) * 0.25 * s * fl); ctx.lineTo(bx + 0.08 * s, by); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // 頭：頸、頭骨、耳朵；張口時口腔與獠牙向前張開
    ctx.fillStyle = '#141a2c'; ctx.strokeStyle = rim; ctx.lineWidth = Math.max(2, s * 0.07);
    ctx.beginPath(); ctx.moveTo(0.45 * s, -0.3 * s); ctx.lineTo(0.85 * s, -0.24 * s); ctx.lineTo(0.85 * s, 0.24 * s); ctx.lineTo(0.45 * s, 0.3 * s); ctx.closePath(); ctx.fill(); // 頸：把頭接在胸前
    ctx.beginPath(); ctx.ellipse(0.95 * s, 0, 0.36 * s, 0.3 * s, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
    for (const d of [1, -1]) { ctx.beginPath(); ctx.moveTo(0.95 * s, d * 0.16 * s); ctx.lineTo(0.62 * s, d * 0.5 * s); ctx.lineTo(0.8 * s, d * 0.08 * s); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (S.jaw > 0.05) {
      const op = S.jaw * 0.55, L = 0.75 * s;
      ctx.fillStyle = '#5a0a14';
      ctx.beginPath(); ctx.moveTo(1.1 * s, 0); ctx.lineTo(1.1 * s + Math.cos(op) * L, Math.sin(op) * L); ctx.lineTo(1.1 * s + Math.cos(-op) * L, Math.sin(-op) * L); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (const d of [1, -1]) for (let i = 1; i <= 3; i++) {
        const q = i / 3.6, bx = 1.1 * s + Math.cos(d * op) * L * q, by = Math.sin(d * op) * L * q;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 0.06 * s, by - d * 0.12 * s); ctx.lineTo(bx + 0.12 * s, by); ctx.closePath(); ctx.fill();
      }
    }
    // 白色羊面具（蓋住額頭與口鼻）：張口時面具跟著上顎往前抬
    const mx = S.jaw * 0.08 * s;
    ctx.fillStyle = '#e8edf5'; ctx.strokeStyle = '#8f9bb0'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0.78 * s + mx, -0.22 * s); ctx.quadraticCurveTo(1.25 * s + mx, -0.2 * s, 1.5 * s + mx, -0.05 * s);
    ctx.lineTo(1.5 * s + mx, 0.05 * s); ctx.quadraticCurveTo(1.25 * s + mx, 0.2 * s, 0.78 * s + mx, 0.22 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#a9b4c6'; ctx.beginPath(); ctx.moveTo(0.85 * s + mx, 0); ctx.lineTo(1.42 * s + mx, 0); ctx.stroke(); // 面具中線
    if (!dead) { // 眼窩的光：外暈 + 亮芯
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const d of [1, -1]) {
        ctx.fillStyle = 'rgba(' + (p2 ? '255,110,50' : '110,220,255') + ',0.45)'; ctx.beginPath(); ctx.arc(1.02 * s + mx, d * 0.12 * s, 0.14 * s, 0, U.TAU); ctx.fill();
        ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(1.02 * s + mx, d * 0.12 * s, 0.055 * s, 0, U.TAU); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // 神羊：羊毛斗篷 + 羊耳 + 深色狼面具 + 銀弓
  function lambBody(g, r) {
    g.fillStyle = '#e6ebf4';
    for (let i = 0; i < 14; i++) { const a = i / 14 * U.TAU; g.beginPath(); g.arc(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86, r * 0.24, 0, U.TAU); g.fill(); } // 蓬鬆的毛邊
    const grd = g.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r * 1.0);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.7, '#e9eef6'); grd.addColorStop(1, '#b9c4d8');
    g.fillStyle = grd; g.beginPath(); g.arc(0, 0, r * 0.9, 0, U.TAU); g.fill();
    g.strokeStyle = 'rgba(150,165,190,0.6)'; g.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) { const a = i / 6 * U.TAU + 0.3; g.beginPath(); g.arc(Math.cos(a) * r * 0.45 - r * 0.15, Math.sin(a) * r * 0.45, r * 0.16, a, a + 2.4); g.stroke(); } // 羊毛捲紋
    for (const d of [1, -1]) { // 垂下的羊耳
      g.fillStyle = '#f4f6fb'; g.beginPath(); g.ellipse(r * 0.1, d * r * 0.78, r * 0.36, r * 0.17, d * 0.5, 0, U.TAU); g.fill();
      g.fillStyle = '#c9d1e2'; g.beginPath(); g.ellipse(r * 0.12, d * r * 0.78, r * 0.22, r * 0.08, d * 0.5, 0, U.TAU); g.fill();
    }
    // 深色狼面具：從額頭收成一個尖尖的狼吻，兩側一對尖耳，吻部畫出交錯的白牙
    g.fillStyle = '#1b2031'; g.strokeStyle = '#6a7da3'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(r * 0.12, -r * 0.46); g.quadraticCurveTo(r * 0.75, -r * 0.48, r * 1.22, 0);
    g.quadraticCurveTo(r * 0.75, r * 0.48, r * 0.12, r * 0.46); g.quadraticCurveTo(-r * 0.02, 0, r * 0.12, -r * 0.46); g.closePath(); g.fill(); g.stroke();
    for (const d of [1, -1]) { g.beginPath(); g.moveTo(r * 0.18, d * r * 0.3); g.lineTo(-r * 0.12, d * r * 0.62); g.lineTo(r * 0.36, d * r * 0.42); g.closePath(); g.fill(); g.stroke(); } // 面具的狼耳
    g.strokeStyle = '#e8edf5'; g.lineWidth = 1.2; g.beginPath(); // 狼牙紋
    for (let i = 0; i <= 4; i++) { const x = r * (0.78 + i * 0.09), y = (i % 2 ? 1 : -1) * r * 0.1 * (1 - i * 0.2); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }

  function bow(ctx, r, pull, p2, shade) {
    const glow = p2 ? '#ff8a9a' : ICE, cx = r * 0.25, R0 = r * 1.05, A = 1.0;
    const tx = cx + Math.cos(A) * R0, ty = Math.sin(A) * R0, nock = tx - pull * r * 0.7;
    if (!shade) { ctx.strokeStyle = 'rgba(' + (p2 ? '255,120,140' : '140,225,255') + ',0.35)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, 0, R0, -A, A); ctx.stroke(); }
    ctx.strokeStyle = shade ? '#000' : SILVER; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, 0, R0, -A, A); ctx.stroke();
    if (shade) return;
    ctx.fillStyle = glow; for (const d of [1, -1]) { ctx.beginPath(); ctx.arc(tx, d * ty, 2.6, 0, U.TAU); ctx.fill(); } // 弓梢的光點
    ctx.strokeStyle = 'rgba(230,245,255,0.85)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tx, -ty); ctx.lineTo(nock, 0); ctx.lineTo(tx, ty); ctx.stroke();
    if (pull > 0.05) { // 搭上的箭：箭身 + 發光箭尖
      const tip = cx + R0 + r * 0.35;
      ctx.strokeStyle = SILVER; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(nock, 0); ctx.lineTo(tip, 0); ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = glow; ctx.globalAlpha = 0.5 + 0.5 * pull;
      ctx.beginPath(); ctx.arc(tip, 0, 4 + 3 * pull, 0, U.TAU); ctx.fill(); ctx.restore();
    }
  }

  function body(ctx, o, t, { r }) {
    const shade = !!o.shade, p2 = o.phase === 2, inst = o.inst;
    if (shade) { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, U.TAU); ctx.fill(); }
    else R.blit(ctx, 'body:kindred:lamb:' + r, r * 2.6 + 10, r * 2.6 + 10, r * 1.3 + 5, r * 1.3 + 5, (g) => lambBody(g, r));
    if (!shade) { // 狼面具的眼窩（冷藍）
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const d of [1, -1]) {
        ctx.fillStyle = 'rgba(120,220,255,0.45)'; ctx.beginPath(); ctx.arc(r * 0.55, d * r * 0.17, r * 0.15, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#d8f8ff'; ctx.beginPath(); ctx.arc(r * 0.55, d * r * 0.17, r * 0.06, 0, U.TAU); ctx.fill();
      }
      ctx.restore();
    }
    let pull = 0;
    if (o.state === 'skill' && inst && inst.v && SHOOT[inst.skill.id]) { const P = R.skillPace(inst, TRIG); pull = P.a ? (P.snap > 0 ? 0 : P.wind) : 0; }
    bow(ctx, r, pull, p2, shade);
  }

  const wolfSize = (b) => b.r * (b.phase === 2 ? 2.3 : 1.8); // 魔狼比神羊大得多（原作：巨大的靈狼）

  // under：推進魔狼狀態、畫地面陰影（騰空時留在原地、變淡）——陰影屬於地面，會被沙塵蓋住
  function under(ctx, b, t) {
    const s = wolfSize(b), S = track(b, t, s);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.32 - S.air * 0.15) + ')';
    ctx.beginPath(); ctx.ellipse(S.x, S.y + s * 0.25, s * 1.3 * (1 - S.air * 0.2), s * 0.55, S.ang, 0, U.TAU); ctx.fill();
  }
  // over：魔狼本體畫在煙塵之上（靈體不會被沙塵遮住）
  function over(ctx, b, t) {
    const S = wolves.get(b);
    if (S) drawWolf(ctx, S, wolfSize(b), t, b.phase === 2, b.state === 'dead');
  }

  R.defineBossStyle('kindred', { body, under, over });
})(typeof window !== 'undefined' ? window : globalThis);
