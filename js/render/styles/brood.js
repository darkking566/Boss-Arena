'use strict';
// Boss 造型：腐沼母巢：三節八足、甲殼頭胸、多眼、螯牙、半透明卵囊（囊內卵粒脈動）；
// 依招式擺出姿勢（前足後拉突刺 / 前足橫掃 / 仰頭吐酸 / 卵囊鼓脹產卵 / 吐絲 / 八足撐開噴瘴 / 收足鑽地 / 前足高舉）；
// 二階段卵囊破裂、露出發光卵粒；換階段時卵囊劇烈鼓脹（破裂特效由 phase2.transFx 的 sacburst 負責）
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;

  const SIDES = [-1, 1];
  const TRIG = { hit: 1, lob: 1, summon: 1, trap: 1, zone: 1, hide: 1, proj: 1 };
  const BY_DO = { lob: 'spit', summon: 'birth', trap: 'web', zone: 'miasma', hide: 'burrow', proj: 'rear' };
  function poseOf(id, a) {
    if (!a) return null;
    if (id === 'stab') return a.shape === 'rect' ? 'stab' : 'sweep';
    return BY_DO[a.do] || null;
  }
  // 囊內卵粒（x, y, 半徑，以 r 為單位）
  // 眼睛（x, y, 半徑，以 r 為單位）
  const EYES = [0.7, -0.15, 0.065, 0.7, 0.15, 0.065, 0.6, -0.3, 0.05, 0.6, 0.3, 0.05, 0.78, 0, 0.055, 0.52, -0.12, 0.035, 0.52, 0.12, 0.035];
  const EGGS = [-0.6, -0.3, 0.14, -0.3, 0.25, 0.11, -0.85, 0.15, 0.12, -0.45, -0.05, 0.09, -0.75, -0.08, 0.08, -0.5, 0.35, 0.08];

  // 單隻腳：s 側、i 由前到後；回傳是否為抬起（畫在身體上方）
  function leg(ctx, r, t, s, i, mode, wd, sn, moving, onTop) {
    let ba = s * (0.55 + i * 0.42), reach = 1, lift = 0;
    const ph = Math.sin(t * 10 * moving + i * 1.3 + (s > 0 ? 0 : 1.5)) * 0.25 * (mode ? 0.3 : 1);
    const front = i === 0, front2 = i <= 1;
    if (mode === 'stab' && front) { ba = s * (0.55 + 0.5 * wd - 0.43 * sn); reach = 1 - 0.3 * wd + 0.35 * sn; lift = 0.9 * wd + 0.3 * sn; }
    else if (mode === 'sweep' && front) { ba = s * (0.55 + 0.6 * wd - 0.5 * sn); reach = 1 + 0.15 * sn; lift = 0.8 * wd + 0.2 * sn; }
    else if (mode === 'rear' && front2) { ba = s * (0.4 + i * 0.3); reach = 0.9; lift = 0.9 * Math.max(wd, sn); }
    else if (mode === 'miasma' || mode === 'web') reach = 1 + 0.15 * Math.max(wd, sn);
    else if (mode === 'burrow') reach = 1 - 0.3 * wd;
    if ((lift > 0.15) !== onTop) return;
    const kr = r * 1.15 * reach, fr = r * 1.75 * reach;
    const kx = Math.cos(ba + ph) * kr, ky = Math.sin(ba + ph) * kr;
    const fx2 = Math.cos(ba + ph * 1.5 + s * 0.3) * fr, fy2 = Math.sin(ba + ph * 1.5 + s * 0.3) * fr;
    const bx = Math.cos(ba) * r * 0.4, by = Math.sin(ba) * r * 0.4;
    // 抬起的腳：更粗（較靠近鏡頭）並帶地面陰影
    if (lift > 0.05) {
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = r * 0.1;
      ctx.beginPath(); ctx.moveTo(bx + 8, by + 10); ctx.lineTo(kx + 8 + lift * 12, ky + 10 + lift * 14); ctx.lineTo(fx2 + 8 + lift * 16, fy2 + 10 + lift * 18); ctx.stroke();
    }
    ctx.strokeStyle = '#2a1636'; ctx.lineWidth = r * 0.1 * (1 + lift);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(kx, ky); ctx.lineTo(fx2, fy2); ctx.stroke();
    ctx.strokeStyle = lift > 0.15 ? '#8a5aa0' : '#5b3a6b'; ctx.lineWidth = r * 0.035 * (1 + lift); // 節上的亮面
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(kx, ky); ctx.lineTo((kx + fx2) / 2, (ky + fy2) / 2); ctx.stroke();
    ctx.fillStyle = '#cfc'; ctx.beginPath(); ctx.arc(fx2, fy2, r * 0.04 * (1 + lift), 0, U.TAU); ctx.fill(); // 足尖
  }
  // 換階段用的繪製物件（重用）
  const T = { x: 0, y: 0, face: 0, r: 0, def: null, phase: 1, state: 'swell', swell: 0, vx: 0, vy: 0, inst: null };

  R.defineBossStyle('brood', {
    body(ctx, o, t, { def, r }) {
      const p2 = o.phase === 2, inst = o.inst && o.inst.v ? o.inst : null;
      let mode = null, wd = 0, sn = 0;
      if (inst) {
        const p = R.skillPace(inst, TRIG);
        mode = poseOf(inst.skill.id, p.a); wd = p.snap > 0 ? 0 : p.wind; sn = p.snap;
      }
      const moving = Math.hypot(o.vx || 0, o.vy || 0) > 20 ? 1 : 0.25;
      ctx.lineCap = 'round';
      for (const s of SIDES) for (let i = 0; i < 4; i++) leg(ctx, r, t, s, i, mode, wd, sn, moving, false);

      // 卵囊：產卵時鼓脹、換階段時劇烈脈動
      const sw = o.swell || 0;
      const sacS = 1 + (mode === 'birth' ? 0.18 * wd - 0.1 * sn : 0) + sw * (0.3 + 0.06 * Math.sin(t * 30));
      ctx.save(); ctx.translate(-r * 0.45, 0); ctx.scale(sacS, sacS); ctx.translate(r * 0.45, 0);
      R.blit(ctx, 'body:brood:sac:' + o.phase + ':' + r + ':' + def.color2, r * 1.8 + 8, r * 1.5 + 8, r * 1.35 + 4, r * 0.75 + 4, (g) => {
        const gr = g.createRadialGradient(-r * 0.7, -r * 0.2, r * 0.075, -r * 0.5, 0, r);
        gr.addColorStop(0, p2 ? '#8a6a5c' : '#7a4a8c'); gr.addColorStop(1, def.color2);
        g.fillStyle = gr; g.beginPath(); g.ellipse(-r * 0.45, 0, r * 0.85, r * 0.72, 0, 0, U.TAU); g.fill();
        g.strokeStyle = 'rgba(155,225,93,0.35)'; g.lineWidth = r * 0.025; // 囊膜血管
        g.beginPath(); g.moveTo(r * 0.3, -r * 0.2); g.quadraticCurveTo(-r * 0.4, -r * 0.7, -r * 1.1, -r * 0.35);
        g.moveTo(r * 0.3, r * 0.2); g.quadraticCurveTo(-r * 0.4, r * 0.75, -r * 1.15, r * 0.25); g.moveTo(r * 0.1, 0); g.lineTo(-r * 1.2, 0); g.stroke();
        if (p2) {
          // 破裂的囊膜：後半撕開，露出黏稠的內部
          g.fillStyle = '#1c2a0c'; g.beginPath();
          for (let i = 0; i < 16; i++) { const a = i / 16 * U.TAU, rr = r * (0.42 + (i % 2) * 0.12); i ? g.lineTo(-r * 0.7 + Math.cos(a) * rr * 0.8, Math.sin(a) * rr) : g.moveTo(-r * 0.7 + rr * 0.8, 0); }
          g.closePath(); g.fill();
          g.strokeStyle = '#b6ff5c'; g.lineWidth = r * 0.02; g.stroke();
        }
      });
      // 囊內卵粒：依序脈動發光（二階段更亮、更大）
      for (let i = 0; i < EGGS.length; i += 3) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 4 + i);
        ctx.fillStyle = hexA(p2 ? '#d4ff8a' : def.color, (p2 ? 0.75 : 0.45) + 0.25 * pulse + sw * 0.3);
        ctx.beginPath(); ctx.arc(EGGS[i] * r, EGGS[i + 1] * r, EGGS[i + 2] * r * (p2 ? 1.15 : 1) * (1 + 0.1 * pulse), 0, U.TAU); ctx.fill();
      }
      const sacGlow = Math.max(mode === 'birth' || mode === 'miasma' ? Math.max(wd, sn) : 0, sw, p2 ? 0.25 + 0.15 * Math.sin(t * 5) : 0);
      if (sacGlow > 0.02) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = hexA(def.glow, 0.35 * sacGlow); ctx.beginPath(); ctx.ellipse(-r * 0.45, 0, r * 0.8, r * 0.66, 0, 0, U.TAU); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      if (mode === 'web') {
        // 吐絲：尾端絲疣發光、拉出幾條絲線
        const k = Math.max(wd, sn);
        ctx.strokeStyle = hexA('#eeeeee', 0.6 * k); ctx.lineWidth = 1.2;
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-r * 1.28, 0); ctx.quadraticCurveTo(-r * 1.7, i * r * 0.3, -r * (1.6 + k * 0.8), i * r * 0.6); ctx.stroke(); }
        ctx.fillStyle = hexA('#eaffb0', k); ctx.beginPath(); ctx.arc(-r * 1.28, 0, r * 0.07, 0, U.TAU); ctx.fill();
      }

      // 頭胸甲（精靈快取：漸層 + 甲片紋）；吐酸時往後仰
      const hx = mode === 'spit' ? -r * 0.08 * wd + r * 0.06 * sn : 0;
      ctx.translate(hx, 0);
      R.blit(ctx, 'body:brood:head:' + r, r * 1.1 + 8, r * 1.1 + 8, r * 0.1 + 4, r * 0.55 + 4, (g) => {
        const gr = g.createRadialGradient(r * 0.35, -r * 0.18, r * 0.05, r * 0.45, 0, r * 0.52); gr.addColorStop(0, '#5b3a6b'); gr.addColorStop(1, '#2e1a3a');
        g.fillStyle = gr; g.beginPath(); g.arc(r * 0.45, 0, r * 0.5, 0, U.TAU); g.fill();
        g.strokeStyle = '#1a0d22'; g.lineWidth = r * 0.05; g.stroke();
        g.strokeStyle = 'rgba(26,13,34,0.8)'; g.lineWidth = r * 0.025;
        g.beginPath(); g.moveTo(r * 0.05, 0); g.lineTo(r * 0.5, 0); g.moveTo(r * 0.15, -r * 0.3); g.quadraticCurveTo(r * 0.4, -r * 0.1, r * 0.55, -r * 0.4);
        g.moveTo(r * 0.15, r * 0.3); g.quadraticCurveTo(r * 0.4, r * 0.1, r * 0.55, r * 0.4); g.stroke();
      });
      // 多眼：施招時更亮
      ctx.fillStyle = def.glow;
      const eg = mode ? 1.25 : 1;
      for (let i = 0; i < EYES.length; i += 3) { ctx.beginPath(); ctx.arc(EYES[i] * r, EYES[i + 1] * r, EYES[i + 2] * r * eg, 0, U.TAU); ctx.fill(); }
      // 螯牙：吐酸時大張、突刺出手時張開
      const mo = mode === 'spit' ? 0.15 + 0.45 * Math.max(wd, sn) : mode === 'stab' || mode === 'sweep' || mode === 'rear' ? 0.15 + 0.3 * Math.max(wd, sn) : 0.1 + 0.04 * Math.sin(t * 3);
      ctx.strokeStyle = '#cfc'; ctx.lineWidth = r * 0.075;
      for (const s of SIDES) { ctx.beginPath(); ctx.moveTo(r * 0.85, s * r * 0.15); ctx.quadraticCurveTo(r * 1.2, s * r * (0.3 + mo), r * 1.15, s * r * 0.02); ctx.stroke(); }
      if (mode === 'spit' && wd + sn > 0.02) {
        // 口中酸液光
        const k = Math.max(wd, sn);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = hexA('#b6ff5c', 0.5 * k); ctx.beginPath(); ctx.arc(r * 1.0, 0, r * (0.1 + 0.18 * k), 0, U.TAU); ctx.fill();
        ctx.fillStyle = hexA('#eaffb0', k); ctx.beginPath(); ctx.arc(r * 0.98, 0, r * 0.07 * (0.5 + k), 0, U.TAU); ctx.fill();
        ctx.restore();
      }
      ctx.translate(-hx, 0);
      for (const s of SIDES) for (let i = 0; i < 4; i++) leg(ctx, r, t, s, i, mode, wd, sn, moving, true);
    },
    // 鑽地時地面隆起
    hidden(ctx, b, t) {
      if (b.state === 'skill') { ctx.fillStyle = 'rgba(60,40,20,0.5)'; ctx.beginPath(); ctx.arc(b.x + Math.sin(t * 30) * (b.r * 0.08), b.y, b.r * 0.8, 0, U.TAU); ctx.fill(); }
    },
    // 換階段：咆哮前卵囊劇烈鼓脹、八足收攏；咆哮（卵囊破裂）後提早換成二階段外觀
    transition(ctx, b, t) {
      const at = b.roarAt || 0.6, before = b.stateT < at;
      T.x = b.x; T.y = b.y; T.face = b.face; T.r = b.r; T.def = b.def;
      T.phase = before ? 1 : 2; T.swell = before ? U.clamp(b.stateT / at, 0, 1) : 0;
      R.drawBossBody(ctx, T, t);
      return true;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
