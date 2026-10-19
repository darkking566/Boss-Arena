'use strict';
// Boss 造型：亞當（人類始祖）：赤裸上身的健壯青年（僅以樹葉遮蔽）、黑色亂髮、雙手戴著瑞吉蕾芙化成的金色手指虎；
// 眼睛是神虛視的金色眼紋（見切架式／大招時亮起），二階段眼眶流血、金光轉血紅，死立不倒時全身燃起金焰。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;

  const VIS = 1.15;                    // 視覺放大：判定半徑不變
  const TRIG = { hit: 1, dash: 1 };
  const SKIN = '#d9a877', SKIN_D = '#a8774c', SKIN_L = '#f0c8a0', GOLD = '#ffd35a', GOLD_D = '#a8741a';
  const ease = (u) => 1 - (1 - u) * (1 - u);

  // 拳頭：皮膚 + 金色手指虎（四顆指節突起）+ 瑞吉蕾芙的翼紋微光；glow 0~1 為出拳時的光芒
  function fist(ctx, x, y, r, glow, t, p2) {
    ctx.fillStyle = SKIN; ctx.strokeStyle = SKIN_D; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, r * 0.26, 0, U.TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = GOLD; ctx.strokeStyle = GOLD_D; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x + r * 0.14, y, r * 0.22, -1.25, 1.25); ctx.arc(x + r * 0.02, y, r * 0.16, 1.25, -1.25, true); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let i = -1.5; i <= 1.5; i++) { ctx.beginPath(); ctx.arc(x + r * 0.3, y + i * r * 0.1, r * 0.055, 0, U.TAU); ctx.fill(); ctx.stroke(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const a = 0.25 + 0.15 * Math.sin(t * 4 + x) + glow * 0.6;
    ctx.strokeStyle = hexA(p2 ? '#ff7a5a' : '#fff0a8', a); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x + r * 0.05, y - r * 0.2, r * 0.18, 3.5, 5.6); ctx.arc(x + r * 0.05, y + r * 0.2, r * 0.18, 0.7, 2.8); ctx.stroke(); // 翼紋
    if (glow > 0.05) { ctx.fillStyle = hexA(p2 ? '#ff6a4a' : '#fff0a8', glow * 0.5); ctx.beginPath(); ctx.arc(x + r * 0.3, y, r * (0.3 + glow * 0.35), 0, U.TAU); ctx.fill(); }
    ctx.restore();
  }

  function drawBody(ctx, o, t, { r, act }) {
    const p2 = o.phase === 2;
    const inst = o.inst && o.inst.skill && o.inst.v && o.inst.v.actions ? o.inst : null;
    const sid = inst ? inst.skill.id : '';
    const stand = !!(o.statuses && BD.hasStatus(o, 'deathstand'));
    const sight = sid === 'divine_sight' || (inst && inst.skill.ult);          // 神虛視發動中：眼睛亮起
    let wd = 0, sn = 0, hitI = 0;
    if (inst) { const p = R.skillPace(inst, TRIG); wd = p.snap > 0 ? 0 : p.wind; sn = p.snap; hitI = p.i; }
    const eye = Math.min(1, (sight ? 1 : 0) + (p2 ? 0.45 : 0.2) + (stand ? 0.5 : 0));
    const col = p2 ? '#ff5a4a' : '#ffe27a';

    // 1. 腳下光輪：一階段金色、二階段血紅；死立不倒時燃起火焰般的光焰
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(t * (stand ? 9 : 3));
    ctx.fillStyle = hexA(col, (sight ? 0.2 : 0.06) + 0.06 * pulse + (stand ? 0.2 : 0));
    ctx.beginPath(); ctx.arc(0, 0, r * (1.5 + 0.2 * pulse + (stand ? 0.5 : 0)), 0, U.TAU); ctx.fill();
    if (stand) for (let i = 0; i < 7; i++) { // 金焰
      const a = i / 7 * U.TAU + t * 2, l = r * (1.4 + 0.5 * Math.sin(t * 11 + i * 2));
      ctx.fillStyle = hexA('#ffcf5a', 0.35); ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.2) * r, Math.sin(a - 0.2) * r); ctx.lineTo(Math.cos(a) * l * 1.5, Math.sin(a) * l * 1.5); ctx.lineTo(Math.cos(a + 0.2) * r, Math.sin(a + 0.2) * r); ctx.fill();
    }
    ctx.restore();

    // 2. 樹葉腰飾（俯視只看得見背後一小片）
    ctx.fillStyle = '#5c8a3a'; ctx.strokeStyle = '#2f5420'; ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) { ctx.save(); ctx.translate(-r * 0.62, i * r * 0.26); ctx.rotate(Math.PI + i * 0.5); ctx.beginPath(); ctx.ellipse(0, 0, r * 0.3, r * 0.12, 0, 0, U.TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }

    // 3. 軀幹與肩：赤裸的健壯肌肉（精靈快取）
    R.blit(ctx, 'body:adam:torso:' + r, r * 2.4 + 20, r * 2.4 + 20, r * 1.2 + 10, r * 1.2 + 10, (g) => {
      g.lineWidth = 1.6; g.strokeStyle = SKIN_D;
      const gr = g.createRadialGradient(r * 0.1, 0, 2, 0, 0, r * 0.95);
      gr.addColorStop(0, SKIN_L); gr.addColorStop(0.65, SKIN); gr.addColorStop(1, SKIN_D);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(0, 0, r * 0.6, r * 0.88, 0, 0, U.TAU); g.fill(); g.stroke(); // 胸背
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(r * 0.05, s * r * 0.82, r * 0.36, r * 0.3, s * 0.2, 0, U.TAU); g.fill(); g.stroke(); } // 肩
      g.strokeStyle = hexA(SKIN_D, 0.7); g.lineWidth = 1.2; // 脊椎與肩胛肌肉線
      g.beginPath(); g.moveTo(r * 0.4, 0); g.lineTo(-r * 0.55, 0); g.stroke();
      for (const s of [-1, 1]) { g.beginPath(); g.arc(-r * 0.05, s * r * 0.4, r * 0.3, s > 0 ? -0.9 : 0.9 - Math.PI, s > 0 ? 0.9 : Math.PI - 0.9 + 0.01); g.stroke(); }
    });

    // 4. 雙臂與手指虎：出拳左右交替；神虛視架式時雙拳收在胸前
    const guard = sid === 'divine_sight' || sid === 'fatherly_ward' || sid === 'endurance_clash';
    for (const s of [-1, 1]) {
      const mine = (hitI % 2 === 0 ? 1 : -1) === s;                // 這一拳是哪隻手
      let ext = 0, glow = 0;
      if (guard) { ext = r * 0.5; glow = sid === 'divine_sight' ? 0.5 + 0.3 * Math.sin(t * 8) : 0.15; }
      else if (inst) {
        const strike = mine || sid === 'meteor_jab' || sid === 'endurance_clash' || (inst.skill.ult && !mine);
        const fast = sid === 'meteor_jab' || inst.skill.ult;
        const alt = fast ? ((Math.floor(inst.t * 14) % 2 === 0 ? 1 : -1) === s) : mine;
        if (sn > 0 && (alt || fast)) { ext = r * (0.9 + 0.5 * ease(sn)); glow = sn; }
        else if (wd > 0 && strike) ext = -r * 0.35 * wd;            // 蓄力時拉回
        else ext = r * 0.15 * Math.sin(t * 2 + s);
      } else ext = r * 0.12 * Math.sin(t * 2.2 + s);
      const fx = r * 0.6 + ext, fy = s * (r * 0.62 - (guard ? r * 0.3 : 0));
      ctx.strokeStyle = SKIN; ctx.lineWidth = r * 0.3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(r * 0.05, s * r * 0.82); ctx.lineTo(fx - r * 0.1, fy); ctx.stroke();
      ctx.strokeStyle = SKIN_D; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(r * 0.05, s * r * 0.82 - s * r * 0.14); ctx.lineTo(fx - r * 0.1, fy - s * r * 0.14); ctx.stroke();
      fist(ctx, fx, fy, r, glow, t, p2);
    }

    // 5. 頭：黑色亂髮、耳；神虛視的金色眼紋（前緣兩道光弧）；二階段眼角流下血痕
    R.blit(ctx, 'body:adam:head:' + r, r * 1.6, r * 1.6, r * 0.8, r * 0.8, (g) => {
      g.fillStyle = SKIN; g.strokeStyle = SKIN_D; g.lineWidth = 1.5;
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(r * 0.05, s * r * 0.4, r * 0.1, r * 0.14, 0, 0, U.TAU); g.fill(); g.stroke(); } // 耳
      g.fillStyle = '#1c130d'; g.strokeStyle = '#0a0705';
      g.beginPath(); g.arc(r * 0.05, 0, r * 0.42, 0, U.TAU); g.fill(); g.stroke();
      g.strokeStyle = '#3a2a1c'; g.lineWidth = 1.4;
      for (let i = 0; i < 9; i++) { const a = i / 9 * U.TAU; g.beginPath(); g.moveTo(r * 0.05 + Math.cos(a) * r * 0.1, Math.sin(a) * r * 0.1); g.lineTo(r * 0.05 + Math.cos(a + 0.5) * r * 0.4, Math.sin(a + 0.5) * r * 0.4); g.stroke(); }
      g.fillStyle = '#1c130d'; // 額前亂翹的髮束
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(r * 0.38, i * r * 0.12 - 3); g.lineTo(r * 0.62, i * r * 0.16); g.lineTo(r * 0.38, i * r * 0.12 + 3); g.closePath(); g.fill(); }
    });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.strokeStyle = hexA(col, 0.35 + 0.65 * eye); ctx.lineWidth = 2.2 + 2 * eye;
      ctx.beginPath(); ctx.arc(r * 0.42, s * r * 0.17, r * 0.12, -1.0, 1.0); ctx.stroke(); // 眼紋
      if (eye > 0.5) { ctx.fillStyle = hexA('#ffffff', (eye - 0.5) * 1.4); ctx.beginPath(); ctx.arc(r * 0.46, s * r * 0.17, r * 0.05, 0, U.TAU); ctx.fill(); }
      if (eye > 0.8) { ctx.strokeStyle = hexA(col, (eye - 0.8) * 2); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(r * 0.46, s * r * 0.17, r * (0.2 + 0.08 * Math.sin(t * 10)), 0, U.TAU); ctx.stroke(); }
    }
    ctx.restore();
    if (p2) { // 眼睛過載：血痕沿臉側流下
      ctx.strokeStyle = hexA('#b01020', 0.9); ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(r * 0.44, s * r * 0.2); ctx.quadraticCurveTo(r * 0.3, s * r * (0.32 + 0.04 * Math.sin(t * 3 + s)), r * 0.2, s * r * 0.4); ctx.stroke(); }
    }
  }

  R.defineBossStyle('adam', {
    body(ctx, o, t, args) { ctx.save(); ctx.lineWidth = 1; drawBody(ctx, o, t, Object.assign({}, args, { r: args.r * VIS })); ctx.restore(); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
