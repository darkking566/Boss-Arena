'use strict';
// Boss 造型：亞當（人類始祖）——依原作設計（docs/bosses/adam.md）：
// 白金色蓬鬆短髮（瀏海垂在額前、一撮呆毛）、纖瘦但線條分明的蒼白偏粉肌膚；
// 手指虎只戴在右手：黑色握環加銀白尖刺，泛著青綠光；神虛視發動時雙眼化為粉紅色放射輪紋（外圈一道白環）；
// 「模倣」蛇神時雙手長成三倍大、覆滿墨綠鱗片與三根白骨爪；神之斧畫出掃踢的腿；
// 二階段過載：眼、鼻、耳流血；死立不倒時全身燃起光焰。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;

  const VIS = 1.15;                    // 視覺放大：判定半徑不變
  const TRIG = { hit: 1, dash: 1 };
  const SKIN = '#f3d6c8', SKIN_S = '#dba897', SKIN_L = '#fff0e6', LINE = '#a8786a';
  const HAIR = '#ece29c', HAIR_D = '#c4b668', HAIR_L = '#fffadc';
  const SCALE = '#33503c', SCALE_L = '#58805e', BONE = '#f4f0e0';
  const ease = (u) => 1 - (1 - u) * (1 - u);

  // 銀色手指虎（右手）：黑色握環 + 四根銀白尖刺 + 青綠色神器光；glow 0~1 為出拳瞬間的光芒
  function knuckle(ctx, x, y, r, glow, t) {
    ctx.fillStyle = SKIN; ctx.strokeStyle = LINE; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(x, y, r * 0.22, 0, U.TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1e1816'; ctx.strokeStyle = '#08060a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x + r * 0.1, y, r * 0.24, -1.4, 1.4); ctx.arc(x - r * 0.02, y, r * 0.15, 1.4, -1.4, true); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8ecf2'; ctx.strokeStyle = '#7a8090'; ctx.lineWidth = 1;
    for (let i = -1.5; i <= 1.5; i++) { // 尖刺
      const yy = y + i * r * 0.11;
      ctx.beginPath(); ctx.moveTo(x + r * 0.28, yy - r * 0.055); ctx.lineTo(x + r * 0.46, yy); ctx.lineTo(x + r * 0.28, yy + r * 0.055); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = hexA('#7fffe0', 0.14 + 0.07 * Math.sin(t * 4) + glow * 0.4);
    ctx.beginPath(); ctx.arc(x + r * 0.18, y, r * (0.34 + glow * 0.3), 0, U.TAU); ctx.fill();
    if (glow > 0.05) { ctx.strokeStyle = hexA('#d8fff4', glow * 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + r * 0.2, y, r * (0.3 + glow * 0.4), -1.2, 1.2); ctx.stroke(); }
    ctx.restore();
  }
  function bareFist(ctx, x, y, r, glow) {
    ctx.fillStyle = SKIN; ctx.strokeStyle = LINE; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(x, y, r * 0.23, 0, U.TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = hexA(LINE, 0.8); ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + r * 0.1, y + i * r * 0.09); ctx.lineTo(x + r * 0.22, y + i * r * 0.09); ctx.stroke(); }
    if (glow > 0.05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = hexA('#bfe8ff', glow * 0.45); ctx.beginPath(); ctx.arc(x + r * 0.15, y, r * (0.28 + glow * 0.25), 0, U.TAU); ctx.fill(); ctx.restore(); }
  }
  // 蛇神之爪：放大的墨綠鱗手 + 三根白骨爪；k 0~1 為成長
  function claw(ctx, x, y, r, k, t, s) {
    const R0 = r * (0.23 + 0.4 * k);
    ctx.fillStyle = SCALE; ctx.strokeStyle = '#142a1e'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(x + R0 * 0.2, y, R0, 0, U.TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = SCALE_L; ctx.lineWidth = 1.1; // 鱗片
    for (let i = 0; i < 9; i++) { const a = i / 9 * U.TAU; ctx.beginPath(); ctx.arc(x + R0 * 0.2 + Math.cos(a) * R0 * 0.55, y + Math.sin(a) * R0 * 0.55, R0 * 0.22, a - 0.9, a + 0.9); ctx.stroke(); }
    ctx.fillStyle = BONE; ctx.strokeStyle = '#8a8470'; ctx.lineWidth = 1.2;
    for (let i = -1; i <= 1; i++) {
      const by = y + i * R0 * 0.5, L = r * (0.2 + 0.75 * k);
      ctx.beginPath(); ctx.moveTo(x + R0 * 0.8, by - R0 * 0.2); ctx.quadraticCurveTo(x + R0 * 0.8 + L * 0.7, by - R0 * 0.12 + i * 2, x + R0 * 0.8 + L, by + i * R0 * 0.18); ctx.quadraticCurveTo(x + R0 * 0.8 + L * 0.6, by + R0 * 0.26, x + R0 * 0.8, by + R0 * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (k > 0.3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = hexA('#9be15d', 0.16 * k + 0.05 * Math.sin(t * 6 + s)); ctx.beginPath(); ctx.arc(x + R0, y, R0 * 1.5, 0, U.TAU); ctx.fill(); ctx.restore(); }
  }
  // 神虛視的眼：粉紅色放射輪紋 + 外圈白環；k 為亮度
  function replicaEye(ctx, x, y, rr, k, t) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = hexA('#ff4f7e', 0.55 * k); ctx.beginPath(); ctx.arc(x, y, rr * 1.8, 0, U.TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ff6f95'; ctx.beginPath(); ctx.arc(x, y, rr, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = '#fff0f4'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, rr * 1.35, 0, U.TAU); ctx.stroke();
    ctx.strokeStyle = hexA('#7a0a30', 0.9); ctx.lineWidth = 1;
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * U.TAU + t * 0.8; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * rr * 0.95, y + Math.sin(a) * rr * 0.95); } ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, rr * 0.2, 0, U.TAU); ctx.fill();
  }

  function drawBody(ctx, o, t, { r, act }) {
    const p2 = o.phase === 2;
    const inst = o.inst && o.inst.skill && o.inst.v && o.inst.v.actions ? o.inst : null;
    const sid = inst ? inst.skill.id : '';
    const stand = !!(o.statuses && BD.hasStatus(o, 'deathstand'));
    const sight = sid === 'divine_sight' || (inst && inst.skill.ult);          // 神虛視發動中：雙眼亮起
    let wd = 0, sn = 0, hitI = 0;
    if (inst) { const p = R.skillPace(inst, TRIG); wd = p.snap > 0 ? 0 : p.wind; sn = p.snap; hitI = p.i; }
    const eye = Math.min(1, (sight ? 1 : 0) + (p2 ? 0.15 : 0) + (stand ? 0.6 : 0));

    // 1. 腳下光輪：平時極淡的青白；神虛視為粉紅、二階段偏紅；死立不倒時燃起光焰
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(t * (stand ? 9 : 3)), col = sight || p2 ? '#ff5a86' : '#9fe8ff';
    ctx.fillStyle = hexA(col, (sight ? 0.2 : 0.05) + 0.05 * pulse + (stand ? 0.2 : 0));
    ctx.beginPath(); ctx.arc(0, 0, r * (1.5 + 0.2 * pulse + (stand ? 0.5 : 0)), 0, U.TAU); ctx.fill();
    if (stand) for (let i = 0; i < 7; i++) {
      const a = i / 7 * U.TAU + t * 2, l = r * (1.4 + 0.5 * Math.sin(t * 11 + i * 2));
      ctx.fillStyle = hexA('#fff0b0', 0.33); ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.2) * r, Math.sin(a - 0.2) * r); ctx.lineTo(Math.cos(a) * l * 1.5, Math.sin(a) * l * 1.5); ctx.lineTo(Math.cos(a + 0.2) * r, Math.sin(a + 0.2) * r); ctx.fill();
    }
    ctx.restore();

    // 2. 神之斧：掃踢的腿（畫在身體下層；蓄力時收起、出腳時掃出一道弧）
    if (sid === 'divine_axe' && hitI >= 1) {
      const f = sn > 0 ? 1 - sn : 0, a = -1.5 + 3.0 * ease(f), L = r * (0.9 + 0.9 * (sn > 0 ? 1 : wd));
      ctx.save(); ctx.translate(0, r * 0.3); ctx.rotate(a);
      if (sn > 0) { ctx.fillStyle = hexA('#d8f4ff', 0.28 * sn); ctx.beginPath(); ctx.arc(0, 0, L + r * 0.3, -2.9 * (1 - f), 0.2); ctx.arc(0, 0, L * 0.5, 0.2, -2.9 * (1 - f), true); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = SKIN; ctx.lineWidth = r * 0.32; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
      ctx.fillStyle = SKIN; ctx.strokeStyle = LINE; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(L + r * 0.1, 0, r * 0.2, r * 0.14, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    // 3. 軀幹與肩：纖瘦、線條分明（精靈快取）
    R.blit(ctx, 'body:adam2:torso:' + r, r * 2.4 + 20, r * 2.4 + 20, r * 1.2 + 10, r * 1.2 + 10, (g) => {
      g.lineWidth = 1.5; g.strokeStyle = LINE;
      const gr = g.createRadialGradient(r * 0.1, 0, 2, 0, 0, r * 0.9);
      gr.addColorStop(0, SKIN_L); gr.addColorStop(0.7, SKIN); gr.addColorStop(1, SKIN_S);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(0, 0, r * 0.5, r * 0.78, 0, 0, U.TAU); g.fill(); g.stroke();                       // 胸背
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(r * 0.04, s * r * 0.74, r * 0.27, r * 0.24, s * 0.2, 0, U.TAU); g.fill(); g.stroke(); } // 三角肌
      g.strokeStyle = hexA(LINE, 0.75); g.lineWidth = 1.1;
      g.beginPath(); g.moveTo(r * 0.34, 0); g.lineTo(-r * 0.46, 0); g.stroke();                                 // 脊溝
      for (const s of [-1, 1]) {                                                                                  // 斜方肌與肩胛線
        g.beginPath(); g.moveTo(r * 0.22, s * r * 0.12); g.quadraticCurveTo(r * 0.12, s * r * 0.5, -r * 0.05, s * r * 0.66); g.stroke();
        g.beginPath(); g.moveTo(-r * 0.12, s * r * 0.2); g.quadraticCurveTo(-r * 0.3, s * r * 0.36, -r * 0.34, s * r * 0.55); g.stroke();
      }
    });

    // 4. 雙臂：右手（+y）戴手指虎、左手空拳；出拳左右交替；神虛視架式時雙拳收在胸前；模倣蛇神時雙手長成鱗爪
    const guard = sid === 'divine_sight' || sid === 'fatherly_ward' || sid === 'endurance_clash';
    const claws = sid === 'serpent_shred';
    const ry = !inst && !guard && o.state !== 'stagger' && o.state !== 'stun' && R.rally(o); // 對撞連拚（R.rally）：一拳一拳打向接點，左右手依每下交替
    const ck = claws ? (sn > 0 || hitI > 0 ? 1 : Math.min(1, 0.25 + wd * 1.4)) : 0;
    for (const s of [-1, 1]) {
      let ext = 0, glow = 0;
      if (guard) { ext = r * 0.5; glow = sid === 'divine_sight' ? 0.5 + 0.3 * Math.sin(t * 8) : 0.15; }
      else if (inst) {
        const fast = sid === 'meteor_jab' || sid === 'true_right' || sid === 'endurance_clash' || inst.skill.ult;
        const mine = (hitI % 2 === 0 ? 1 : -1) === s;
        const alt = fast ? ((Math.floor(inst.t * (sid === 'meteor_jab' ? 16 : 13)) % 2 === 0 ? 1 : -1) === s) : (s === 1 ? !(hitI % 2) || sid === 'time_fist' || sid === 'leaf_rush' : hitI % 2 === 1);
        if (sn > 0 && alt) { ext = r * (0.9 + 0.5 * ease(sn)); glow = sn; }
        else if (wd > 0 && (mine || fast)) ext = -r * 0.3 * wd;
        else ext = r * 0.15 * Math.sin(t * 2 + s);
        if (claws) ext = r * 0.35 + r * 0.5 * (sn > 0 ? sn : 0);
      } else ext = r * 0.1 * Math.sin(t * 2.2 + s);
      let fx = r * 0.55 + ext, fy = s * (r * 0.6 - (guard ? r * 0.28 : 0));
      if (ry) { // s = 1 的瞬間拳鋒（含尖刺）剛好落在接點；蓄力時收回腰側，另一隻手護在胸前
        if (s === (ry.off > 0 ? 1 : -1)) { fx = r * 0.25 + (Math.min(r * 2.2, ry.c - r * 0.4) - r * 0.25) * ry.s; fy = s * r * (0.6 - 0.45 * ry.s); glow = ry.s; }
        else { fx = r * 0.7; fy = s * r * 0.32; }
      }
      ctx.strokeStyle = claws ? SCALE : SKIN; ctx.lineWidth = r * (0.22 + 0.2 * ck); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(r * 0.04, s * r * 0.74); ctx.lineTo(fx - r * 0.08, fy); ctx.stroke();
      if (!claws) { ctx.strokeStyle = hexA(LINE, 0.8); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(r * 0.04, s * r * 0.74 - s * r * 0.1); ctx.lineTo(fx - r * 0.08, fy - s * r * 0.1); ctx.stroke(); }
      if (claws) claw(ctx, fx, fy, r, ck, t, s);
      else if (s === 1) knuckle(ctx, fx, fy, r, glow, t);
      else bareFist(ctx, fx, fy, r, glow);
    }

    // 5. 頭：白金蓬鬆短髮、耳、額前瀏海與呆毛（精靈快取）
    R.blit(ctx, 'body:adam2:head:' + r, r * 1.8, r * 1.8, r * 0.9, r * 0.9, (g) => {
      g.fillStyle = SKIN; g.strokeStyle = LINE; g.lineWidth = 1.4;
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(r * 0.08, s * r * 0.4, r * 0.09, r * 0.13, 0, 0, U.TAU); g.fill(); g.stroke(); }
      g.fillStyle = HAIR; g.strokeStyle = HAIR_D; g.lineWidth = 1.3;
      for (let i = 0; i < 12; i++) { const a = i / 12 * U.TAU; g.beginPath(); g.arc(r * 0.06 + Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, r * 0.16, 0, U.TAU); g.fill(); g.stroke(); } // 蓬鬆的扇貝輪廓
      g.beginPath(); g.arc(r * 0.06, 0, r * 0.34, 0, U.TAU); g.fill();
      g.strokeStyle = hexA(HAIR_D, 0.55); g.lineWidth = 1;      // 髮流：由頭頂向四周散開
      for (let i = 0; i < 10; i++) { const a = i / 10 * U.TAU + 0.3; g.beginPath(); g.moveTo(r * 0.06 + Math.cos(a) * r * 0.06, Math.sin(a) * r * 0.06); g.lineTo(r * 0.06 + Math.cos(a + 0.25) * r * 0.36, Math.sin(a + 0.25) * r * 0.36); g.stroke(); }
      g.fillStyle = HAIR_L; g.strokeStyle = HAIR_D; g.lineWidth = 1; // 額前瀏海（長短不一的幾綹，垂向臉的前方）
      for (let i = -2; i <= 2; i++) { const yy = i * r * 0.15, L = r * (0.56 + 0.05 * ((i + 2) % 2)); g.beginPath(); g.moveTo(r * 0.3, yy - r * 0.08); g.quadraticCurveTo(r * 0.45, yy - r * 0.04, L, yy + (i ? i * r * 0.03 : 0)); g.quadraticCurveTo(r * 0.45, yy + r * 0.06, r * 0.3, yy + r * 0.08); g.closePath(); g.fill(); g.stroke(); }
      g.strokeStyle = HAIR_D; g.lineWidth = 1.8; g.lineCap = 'round'; // 呆毛
      g.beginPath(); g.moveTo(r * 0.02, -r * 0.04); g.quadraticCurveTo(-r * 0.18, -r * 0.3, -r * 0.02, -r * 0.46); g.stroke();
    });

    // 6. 眼睛：平時被瀏海遮住（俯視角下兩顆藍點像脫湯，故不畫）；神虛視時才亮起粉紅色放射輪紋
    for (const s of [-1, 1]) {
      const ex = r * 0.44, ey = s * r * 0.15;
      if (eye > 0.35) replicaEye(ctx, ex, ey, r * (0.085 + 0.03 * eye), eye, t);
    }
    // 7. 二階段過載：眼、鼻、耳流血
    if (p2) {
      ctx.strokeStyle = '#c0102a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(r * 0.5, s * r * 0.19); ctx.quadraticCurveTo(r * 0.4, s * r * (0.3 + 0.04 * Math.sin(t * 3 + s)), r * 0.3, s * r * 0.4); ctx.stroke(); // 眼
        ctx.beginPath(); ctx.moveTo(r * 0.1, s * r * 0.5); ctx.lineTo(-r * 0.02, s * r * (0.62 + 0.05 * Math.sin(t * 2.5 + s))); ctx.stroke();                         // 耳
      }
      ctx.beginPath(); ctx.moveTo(r * 0.6, 0); ctx.lineTo(r * 0.7, r * 0.02 * Math.sin(t * 4)); ctx.stroke();                                                         // 鼻
    }
  }

  R.defineBossStyle('adam', {
    body(ctx, o, t, args) { ctx.save(); ctx.lineWidth = 1; drawBody(ctx, o, t, Object.assign({}, args, { r: args.r * VIS })); ctx.restore(); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
