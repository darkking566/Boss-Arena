'use strict';
// Boss 造型：宙斯（全宇宙之父）——依原作設計（docs/bosses/zeus.md）：
// 一階段「肌肉形態」：禿頂、頭頂一撮灰色衝天髮、額上皺紋、下垂的長眉與向兩側捲起的八字鬍、長鬚在胸前綁一顆金珠；
//   膨脹成巨漢的古銅肌肉、白色長布從左肩斜披到右腰、腰下白色長裙；審判之槌時右手拿一柄小木槌。
// 二階段「阿陀磨須」：肌肉壓縮成深褐、拉長、筋肉外翻的軀體，手臂更長；長布脫落只剩裙；眉鬚像角一樣朝兩側炸開、
//   露出一排白牙；身上的裂縫透出紫光（肉體正在崩壞），身邊有紫黑星海的光點環繞。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;

  const VIS = 1.1;                     // 視覺放大：判定半徑不變
  const TRIG = { hit: 1, dash: 1 };
  const SK1 = { base: '#d8b08a', lite: '#f2d6b6', dark: '#a87c58', line: '#6e4a30' };   // 肌肉形態：古銅
  const SK2 = { base: '#5a3e2c', lite: '#86634a', dark: '#2e1e14', line: '#1a0f08' };   // 阿陀磨須：深褐
  const HAIR = '#c9cfd8', HAIR_D = '#7d8592', CLOTH = '#f4f6fa', CLOTH_S = '#b9c4d2';
  const ease = (u) => 1 - (1 - u) * (1 - u);

  function fist(ctx, x, y, r, S, glow, gold) {
    ctx.fillStyle = S.base; ctx.strokeStyle = S.line; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y, r * 0.27, 0, U.TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = hexA(S.line, 0.8); ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + r * 0.12, y + i * r * 0.1); ctx.lineTo(x + r * 0.26, y + i * r * 0.1); ctx.stroke(); }
    if (glow > 0.05) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hexA(gold, glow * 0.55); ctx.beginPath(); ctx.arc(x + r * 0.15, y, r * (0.32 + glow * 0.35), 0, U.TAU); ctx.fill();
      ctx.restore();
    }
  }
  // 審判之槌：眾神會議上那柄小木槌（握在右拳裡，槌頭朝前）
  function gavel(ctx, x, y, r, lift) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.6 * lift);
    ctx.strokeStyle = '#7a4a24'; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.75, 0); ctx.stroke();
    ctx.fillStyle = '#a0683a'; ctx.strokeStyle = '#4a2a10'; ctx.lineWidth = 1.3;
    ctx.fillRect(r * 0.68, -r * 0.24, r * 0.26, r * 0.48); ctx.strokeRect(r * 0.68, -r * 0.24, r * 0.26, r * 0.48);
    ctx.fillStyle = '#e8c860'; ctx.fillRect(r * 0.68, -r * 0.24, r * 0.05, r * 0.48); ctx.fillRect(r * 0.89, -r * 0.24, r * 0.05, r * 0.48);
    ctx.restore();
  }

  // 軀幹（精靈快取）：肌肉形態是圓厚的巨漢；阿陀磨須胸更寬、筋肉外翻（條紋）
  function torso(ctx, r, p2) {
    const S = p2 ? SK2 : SK1;
    R.blit(ctx, 'body:zeus:torso:' + (p2 ? 2 : 1) + ':' + r, r * 3 + 20, r * 3 + 20, r * 1.5 + 10, r * 1.5 + 10, (g) => {
      // 腰下白色長裙（俯視時從背後與兩側露出）
      g.fillStyle = CLOTH; g.strokeStyle = CLOTH_S; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(-r * 0.3, 0, r * 0.75, r * (p2 ? 0.8 : 0.95), 0, 0, U.TAU); g.fill(); g.stroke();
      g.strokeStyle = hexA(CLOTH_S, 0.8); g.lineWidth = 1.2;
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(-r * 0.4, i * r * 0.16); g.quadraticCurveTo(-r * 0.7, i * r * 0.2, -r * (0.95 - Math.abs(i) * 0.08), i * r * 0.22); g.stroke(); } // 裙褶
      const gr = g.createRadialGradient(r * 0.1, -r * 0.1, 2, 0, 0, r);
      gr.addColorStop(0, S.lite); gr.addColorStop(0.65, S.base); gr.addColorStop(1, S.dark);
      g.fillStyle = gr; g.strokeStyle = S.line; g.lineWidth = 1.6;
      g.beginPath(); g.ellipse(0, 0, r * 0.62, r * (p2 ? 1.0 : 0.92), 0, 0, U.TAU); g.fill(); g.stroke();              // 胸背
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(r * 0.02, s * r * (p2 ? 0.95 : 0.86), r * 0.36, r * 0.32, s * 0.25, 0, U.TAU); g.fill(); g.stroke(); } // 隆起的三角肌
      g.strokeStyle = hexA(S.line, 0.8); g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(r * 0.45, 0); g.lineTo(-r * 0.55, 0); g.stroke();                                          // 脊溝
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(r * 0.3, s * r * 0.1); g.quadraticCurveTo(r * 0.18, s * r * 0.55, -r * 0.05, s * r * 0.78); g.stroke(); // 斜方肌
        g.beginPath(); g.moveTo(-r * 0.1, s * r * 0.18); g.quadraticCurveTo(-r * 0.35, s * r * 0.4, -r * 0.42, s * r * 0.62); g.stroke(); // 肩胛
      }
      if (p2) { // 阿陀磨須：外翻的筋肉條紋
        g.strokeStyle = hexA(S.lite, 0.55); g.lineWidth = 1;
        for (let i = 0; i < 14; i++) { const a = i / 14 * U.TAU; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.32); g.lineTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.88); g.stroke(); }
      } else { // 白色長布：從左肩斜披到右腰
        g.fillStyle = CLOTH; g.strokeStyle = CLOTH_S; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(r * 0.28, -r * 0.95); g.lineTo(r * 0.02, -r * 1.05); g.lineTo(-r * 0.58, r * 0.5); g.lineTo(-r * 0.3, r * 0.68); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = hexA(CLOTH_S, 0.9); g.lineWidth = 1;
        for (let i = 1; i <= 2; i++) { g.beginPath(); g.moveTo(r * (0.28 - i * 0.09), -r * (0.98 + i * 0.02)); g.lineTo(-r * (0.58 - i * 0.09), r * (0.5 + i * 0.06)); g.stroke(); }
      }
    });
  }

  // 頭（精靈快取）：俯視角——禿頂與皺紋、衝天灰髮、下垂長眉、八字鬍、綁金珠的長鬚垂向前方；阿陀磨須時眉鬚朝兩側炸開、露牙
  function head(ctx, r, p2) {
    const S = p2 ? SK2 : SK1;
    R.blit(ctx, 'body:zeus:head:' + (p2 ? 2 : 1) + ':' + r, r * 2.6, r * 2.6, r * 1.3, r * 1.3, (g) => {
      // 長鬚：從下巴垂向前方、中段綁金珠（阿陀磨須時被壓短）
      const bl = p2 ? 0.55 : 0.95;
      g.fillStyle = HAIR; g.strokeStyle = HAIR_D; g.lineWidth = 1.2;
      // 下巴處寬、在金珠處收束、珠後再散成一束圓鈍的鬚尾（像綁起的馬尾）
      const kx = r * (0.3 + bl * 0.5), tx = r * (0.4 + bl);
      g.beginPath(); g.moveTo(r * 0.28, -r * 0.2); g.quadraticCurveTo(r * 0.5, -r * 0.2, kx, -r * 0.05);
      g.quadraticCurveTo(tx - r * 0.12, -r * 0.13, tx, -r * 0.05); g.quadraticCurveTo(tx + r * 0.06, 0, tx, r * 0.05);
      g.quadraticCurveTo(tx - r * 0.12, r * 0.13, kx, r * 0.05); g.quadraticCurveTo(r * 0.5, r * 0.2, r * 0.28, r * 0.2); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = hexA(HAIR_D, 0.7); g.lineWidth = 1;
      for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(r * 0.32, i * r * 0.11); g.quadraticCurveTo(r * 0.5, i * r * 0.1, kx, i * r * 0.02); g.quadraticCurveTo(tx - r * 0.1, i * r * 0.06, tx - r * 0.02, i * r * 0.03); g.stroke(); }
      g.fillStyle = '#e8c048'; g.strokeStyle = '#8a6a10'; g.lineWidth = 1; g.beginPath(); g.arc(kx, 0, r * 0.07, 0, U.TAU); g.fill(); g.stroke(); // 金珠
      // 禿頂
      const gr = g.createRadialGradient(-r * 0.05, -r * 0.08, 1, 0, 0, r * 0.4);
      gr.addColorStop(0, S.lite); gr.addColorStop(1, S.base);
      g.fillStyle = gr; g.strokeStyle = S.line; g.lineWidth = 1.4;
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(r * 0.04, s * r * 0.36, r * 0.08, r * 0.12, 0, 0, U.TAU); g.fill(); g.stroke(); } // 耳
      g.beginPath(); g.arc(0, 0, r * 0.36, 0, U.TAU); g.fill(); g.stroke();
      g.strokeStyle = hexA(S.line, 0.6); g.lineWidth = 1;                                                      // 額上皺紋
      for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-r * 0.1, 0, r * (0.18 + i * 0.05), -0.5, 0.5); g.stroke(); }
      // 眉與八字鬍：一階段下垂、向兩側捲；阿陀磨須時像角一樣朝兩側上翹炸開
      g.fillStyle = HAIR; g.strokeStyle = HAIR_D; g.lineWidth = 1.2;
      for (const s of [-1, 1]) {
        const L = p2 ? 0.5 : 0.22, lift = p2 ? -0.2 : 0.08;
        g.beginPath(); g.moveTo(r * 0.24, s * r * 0.06); g.quadraticCurveTo(r * 0.3, s * r * 0.3, r * (0.2 + lift), s * r * (0.3 + L)); g.quadraticCurveTo(r * 0.18, s * r * 0.32, r * 0.16, s * r * 0.08); g.closePath(); g.fill(); g.stroke(); // 眉
        g.beginPath(); g.moveTo(r * 0.36, s * r * 0.04); g.quadraticCurveTo(r * 0.44, s * r * 0.36, r * (0.3 + lift * 1.4), s * r * (0.34 + L * 0.95));
        g.quadraticCurveTo(r * (0.44 + lift), s * r * (0.5 + L * 0.6), r * (0.42 + lift), s * r * (0.3 + L * 0.5)); g.quadraticCurveTo(r * 0.34, s * r * 0.3, r * 0.3, s * r * 0.06); g.closePath(); g.fill(); g.stroke(); // 八字鬍
      }
      if (p2) { g.fillStyle = '#f4f0e6'; g.strokeStyle = '#3a2a20'; g.lineWidth = 1; g.fillRect(r * 0.34, -r * 0.14, r * 0.07, r * 0.28); g.strokeRect(r * 0.34, -r * 0.14, r * 0.07, r * 0.28); // 露牙
        for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(r * 0.34, -r * 0.14 + i * r * 0.07); g.lineTo(r * 0.41, -r * 0.14 + i * r * 0.07); g.stroke(); } }
      // 頭頂一撮灰色衝天髮
      g.fillStyle = HAIR; g.strokeStyle = HAIR_D; g.lineWidth = 1.1;
      for (let i = 0; i < 7; i++) { const a = i / 7 * U.TAU; g.beginPath(); g.moveTo(-r * 0.05 + Math.cos(a + 0.5) * r * 0.06, Math.sin(a + 0.5) * r * 0.06); g.lineTo(-r * 0.05 + Math.cos(a) * r * (p2 ? 0.26 : 0.2), Math.sin(a) * r * (p2 ? 0.26 : 0.2)); g.lineTo(-r * 0.05 + Math.cos(a - 0.5) * r * 0.06, Math.sin(a - 0.5) * r * 0.06); g.closePath(); g.fill(); g.stroke(); }
    });
  }

  function drawBody(ctx, o, t, { r }) {
    const p2 = o.phase === 2, S = p2 ? SK2 : SK1;
    const inst = o.inst && o.inst.skill && o.inst.v && o.inst.v.actions ? o.inst : null;
    const sid = inst ? inst.skill.id : '', ult = !!(inst && inst.skill.ult);
    const joy = !!(o.statuses && BD.hasStatus(o, 'ecstasy'));
    let wd = 0, sn = 0, hitI = 0;
    if (inst) { const p = R.skillPace(inst, TRIG); wd = p.snap > 0 ? 0 : p.wind; sn = p.snap; hitI = p.i; }
    const gold = p2 ? '#c89bff' : '#ffd36a';

    // 1. 腳下神威：一階段金光；狂喜時脈動；阿陀磨須是紫黑星海與環繞的星點
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(t * (joy ? 10 : 2.5));
    ctx.fillStyle = hexA(gold, (p2 ? 0.12 : 0.05) + 0.06 * pulse + (joy ? 0.12 : 0));
    ctx.beginPath(); ctx.arc(0, 0, r * (1.6 + 0.2 * pulse), 0, U.TAU); ctx.fill();
    if (p2) for (let i = 0; i < 9; i++) {
      const a = i / 9 * U.TAU + t * (0.6 + (i % 3) * 0.25), d = r * (1.5 + 0.35 * Math.sin(t * 1.3 + i * 2));
      ctx.fillStyle = hexA(i % 3 ? '#ffffff' : '#b07bff', 0.55 + 0.35 * Math.sin(t * 5 + i));
      ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * (0.04 + 0.03 * (i % 2)), 0, U.TAU); ctx.fill();
    }
    ctx.restore();

    // 2. 神之斧 / 步法的踢腿：畫在身體下層，出腳時掃出一道弧
    const kick = (sid === 'divine_axe' && hitI >= 1) || (sid === 'zeus_footwork' && (sn > 0 || wd > 0.4));
    if (kick) {
      const f = sn > 0 ? 1 - sn : 0, a = sid === 'divine_axe' ? -1.6 + 3.2 * ease(f) : 0.3 - 0.6 * ease(f), L = r * (1.0 + 1.0 * (sn > 0 ? 1 : wd));
      ctx.save(); ctx.translate(-r * 0.1, r * 0.3); ctx.rotate(a);
      if (sn > 0) { ctx.fillStyle = hexA(p2 ? '#9b5cff' : '#ff6a5a', 0.3 * sn); ctx.beginPath(); ctx.arc(0, 0, L + r * 0.35, -3.0 * (1 - f), 0.2); ctx.arc(0, 0, L * 0.5, 0.2, -3.0 * (1 - f), true); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = S.base; ctx.lineWidth = r * 0.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
      ctx.strokeStyle = S.line; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(L, -r * 0.16); ctx.stroke();
      ctx.fillStyle = S.base; ctx.beginPath(); ctx.ellipse(L + r * 0.12, 0, r * 0.24, r * 0.16, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    // 3. 軀幹
    torso(ctx, r, p2);
    if (p2) { // 肉體崩壞：裂縫透出紫光
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA('#b07bff', 0.45 + 0.3 * Math.sin(t * 3)); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 0.5); ctx.lineTo(r * 0.05, -r * 0.3); ctx.lineTo(r * 0.15, -r * 0.1); ctx.moveTo(-r * 0.3, r * 0.4); ctx.lineTo(-r * 0.1, r * 0.55); ctx.lineTo(-r * 0.2, r * 0.75); ctx.stroke();
      ctx.restore();
    }
    if (joy) { // 狂喜：青筋暴起
      ctx.strokeStyle = hexA('#c0283a', 0.75); ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(r * 0.1, s * r * 0.5); ctx.lineTo(r * 0.2, s * r * (0.62 + 0.04 * Math.sin(t * 12))); ctx.lineTo(r * 0.05, s * r * 0.78); ctx.stroke(); }
    }

    // 4. 雙臂：粗壯的手臂，阿陀磨須時更長；連打左右交替；時間之拳收拳蓄力時右拳發金光；審判之槌右手拿槌
    const fast = sid === 'meteor_jab' || sid === 'true_right' || ult;
    const reach = p2 ? 1.25 : 1;
    for (const s of [-1, 1]) {
      let ext = 0, glow = 0;
      if (sid === 'gfoc') { ext = -r * 0.1; glow = 0.4; }                                            // 雙手叉腰的架勢
      else if (inst) {
        const mine = (hitI % 2 === 0 ? 1 : -1) === s;
        const alt = fast ? ((Math.floor(inst.t * (sid === 'meteor_jab' ? 18 : 14)) % 2 === 0 ? 1 : -1) === s) : (s === 1 ? !(hitI % 2) || sid === 'time_fist' || sid === 'gavel_decree' : hitI % 2 === 1);
        if (sn > 0 && alt) { ext = r * (1.0 + 0.6 * ease(sn)) * reach; glow = sn; }
        else if (wd > 0 && (mine || fast)) { ext = -r * 0.35 * wd; if (sid === 'time_fist' && s === 1) glow = wd; }
        else ext = r * 0.15 * Math.sin(t * 2 + s);
      } else ext = r * 0.1 * Math.sin(t * 2.2 + s);
      const fx = r * 0.6 * reach + ext, fy = s * r * (sid === 'gfoc' ? 0.95 : 0.72);
      ctx.strokeStyle = S.base; ctx.lineWidth = r * (p2 ? 0.3 : 0.36); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(r * 0.04, s * r * 0.86); ctx.lineTo(fx - r * 0.1, fy); ctx.stroke();
      ctx.strokeStyle = hexA(S.line, 0.85); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(r * 0.04, s * r * 0.86 - s * r * 0.14); ctx.lineTo(fx - r * 0.1, fy - s * r * 0.13); ctx.stroke();
      if (sid === 'gavel_decree' && s === 1) gavel(ctx, fx, fy, r, sn > 0 ? 0 : wd);
      fist(ctx, fx, fy, r, S, glow, gold);
    }

    // 5. 頭
    head(ctx, r, p2);
  }

  R.defineBossStyle('zeus', {
    body(ctx, o, t, args) { ctx.save(); ctx.lineWidth = 1; drawBody(ctx, o, t, Object.assign({}, args, { r: args.r * VIS })); ctx.restore(); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
