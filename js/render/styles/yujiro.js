'use strict';
// Boss 造型：範馬勇次郎——依原作設計（docs/bosses/yujiro.md；造型取自 Baki Wiki 的設定圖、動畫截圖與特寫，只在瀏覽器中檢視、未複製任何圖片）：
// 一階段「黑色功夫裝」：紅褐色長髮往後梳起、粗黑的怒眉與獰笑、黑色緊身短袖衫（肌肉把布料撐出皺褶）、古銅色前臂與拳頭。
// 二階段「鬼背解放」：上衣被撐破只剩碎布，背肌浮出一張惡鬼的面孔——怒眉似的闊背肌、發紅光的雙眼、脊溝化成鼻樑、獠牙般的下背；
//   眼睛隨招式越來越亮，大招「鬼哭啼」時鬼臉流下血淚；身邊有赤紅的氣場與餘燼。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;

  const VIS = 1.1;                     // 視覺放大：判定半徑不變
  const TRIG = { hit: 1, dash: 1 };
  const SK = { base: '#c98a62', lite: '#e2a87c', dark: '#8f5a3c', line: '#4a2a1a' };       // 古銅膚色
  const SH = { base: '#26232a', lite: '#454049', dark: '#121014', line: '#08070a' };       // 黑色功夫衫
  const HAIR = '#7a2828', HAIR_D = '#3e1010', HAIR_L = '#a63a34';
  const ease = (u) => 1 - (1 - u) * (1 - u);

  function fist(ctx, x, y, r, glow, col) {
    ctx.fillStyle = SK.base; ctx.strokeStyle = SK.line; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y, r * 0.26, 0, U.TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = hexA(SK.line, 0.8); ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + r * 0.12, y + i * r * 0.1); ctx.lineTo(x + r * 0.25, y + i * r * 0.1); ctx.stroke(); }
    if (glow > 0.05) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hexA(col, glow * 0.55); ctx.beginPath(); ctx.arc(x + r * 0.14, y, r * (0.3 + glow * 0.35), 0, U.TAU); ctx.fill();
      ctx.restore();
    }
  }

  // 軀幹（精靈快取）：一階段黑色緊身衫；二階段上衣撐破，背肌上浮出惡鬼的面孔（額頭靠近頭部、下巴朝後）
  function torso(ctx, r, p2) {
    R.blit(ctx, 'body:yujiro:torso:' + (p2 ? 2 : 1) + ':' + r, r * 3 + 20, r * 3 + 20, r * 1.5 + 10, r * 1.5 + 10, (g) => {
      const S = p2 ? SK : SH;
      const gr = g.createRadialGradient(-r * 0.05, -r * 0.1, 2, -r * 0.1, 0, r);
      gr.addColorStop(0, S.lite); gr.addColorStop(0.65, S.base); gr.addColorStop(1, S.dark);
      g.fillStyle = gr; g.strokeStyle = S.line; g.lineWidth = 1.7;
      g.beginPath(); g.ellipse(p2 ? -r * 0.22 : -r * 0.12, 0, p2 ? r * 0.82 : r * 0.66, r * 0.98, 0, 0, U.TAU); g.fill(); g.stroke();   // 胸背（鬼背時背部拉長）
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(r * 0.02, s * r * 0.84, r * 0.34, r * 0.3, s * 0.25, 0, U.TAU); g.fill(); g.stroke(); } // 三角肌
      g.strokeStyle = hexA(S.line, 0.75); g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(r * 0.2, 0); g.lineTo(-r * 0.78, 0); g.stroke();                                          // 脊溝
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(r * 0.12, s * r * 0.12); g.quadraticCurveTo(r * 0.02, s * r * 0.5, -r * 0.2, s * r * 0.78); g.stroke();   // 斜方肌
        g.beginPath(); g.moveTo(-r * 0.45, s * r * 0.2); g.quadraticCurveTo(-r * 0.7, s * r * 0.5, -r * 0.62, s * r * 0.82); g.stroke();  // 背闊肌外緣
      }
      if (!p2) { // 衣服被肌肉撐出的皺褶
        g.strokeStyle = hexA(SH.lite, 0.8); g.lineWidth = 1.1;
        for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(-r * 0.15, i * r * 0.26); g.quadraticCurveTo(-r * 0.4, i * r * 0.3, -r * 0.62, i * r * 0.2); g.stroke(); }
        return;
      }
      // ── 鬼背：以脊溝為中軸，面孔中心在 (-0.62r, 0)，放大 1.25 倍 ──
      g.save(); g.translate(-r * 0.62, 0); g.scale(1.25, 1.25);
            g.fillStyle = hexA('#3a0c0c', 0.55);
      g.beginPath(); g.ellipse(0, 0, r * 0.3, r * 0.62, 0, 0, U.TAU); g.fill();                                         // 面孔暗部
      g.strokeStyle = '#2a0707'; g.lineWidth = 2.6; g.lineCap = 'round';
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(r * 0.2, s * r * 0.1); g.lineTo(r * 0.02, s * r * 0.52); g.stroke();           // 怒眉（向外上揚）
        g.beginPath(); g.moveTo(r * 0.22, s * r * 0.5); g.lineTo(r * 0.36, s * r * 0.62); g.lineTo(r * 0.3, s * r * 0.4); g.stroke(); // 角
        g.beginPath(); g.moveTo(-r * 0.12, s * r * 0.5); g.quadraticCurveTo(-r * 0.3, s * r * 0.42, -r * 0.34, s * r * 0.2); g.stroke(); // 顴骨
      }
      g.lineWidth = 2; g.beginPath(); g.moveTo(r * 0.1, 0); g.lineTo(-r * 0.18, 0); g.stroke();                  // 鼻樑
      g.fillStyle = '#2a0707';
      g.beginPath(); g.moveTo(-r * 0.3, -r * 0.3); g.lineTo(-r * 0.34, 0); g.lineTo(-r * 0.3, r * 0.3); g.lineTo(-r * 0.42, r * 0.2); g.lineTo(-r * 0.46, 0); g.lineTo(-r * 0.42, -r * 0.2); g.closePath(); g.fill(); // 大嘴
      g.fillStyle = '#f4e6d0';
      for (let i = -3; i <= 3; i++) { if (!i) continue; const y = i * r * 0.08; g.beginPath(); g.moveTo(-r * 0.3 - Math.abs(i) * r * 0.005, y); g.lineTo(-r * 0.36, y + r * 0.03); g.lineTo(-r * 0.32, y - r * 0.025); g.closePath(); g.fill(); } // 獠牙
      g.fillStyle = hexA('#ff4a33', 0.9); g.strokeStyle = '#2a0707'; g.lineWidth = 1;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(r * 0.0, s * r * 0.14); g.lineTo(-r * 0.08, s * r * 0.36); g.lineTo(r * 0.06, s * r * 0.32); g.closePath(); g.fill(); g.stroke(); } // 眼
      g.restore();
      g.strokeStyle = hexA('#b44a3a', 0.6); g.lineWidth = 1.1;
      for (let i = 0; i < 6; i++) { const y = (i - 2.5) * r * 0.16; g.beginPath(); g.moveTo(-r * 0.7, y); g.lineTo(-r * 0.78, y * 1.15); g.stroke(); }  // 下背肌束
      g.fillStyle = '#17131a'; // 撐破的上衣碎布
      g.beginPath(); g.moveTo(-r * 0.7, -r * 0.5); g.lineTo(-r * 0.86, -r * 0.34); g.lineTo(-r * 0.68, -r * 0.3); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-r * 0.66, r * 0.36); g.lineTo(-r * 0.84, r * 0.5); g.lineTo(-r * 0.62, r * 0.55); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(r * 0.0, -r * 1.02); g.lineTo(-r * 0.2, -r * 0.9); g.lineTo(r * 0.06, -r * 0.84); g.closePath(); g.fill();
    });
  }

  // 頭（精靈快取）：俯視——往後梳起的長髮與髮束、前緣露出獰笑的臉：粗黑的怒眉、泛紅的眼、一排牙
  function head(ctx, r, p2) {
    R.blit(ctx, 'body:yujiro:head:' + (p2 ? 2 : 1) + ':' + r, r * 2.6, r * 2.6, r * 1.3, r * 1.3, (g) => {
      g.fillStyle = HAIR; g.strokeStyle = HAIR_D; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(-r * 0.2, 0, r * 0.34, r * 0.3, 0, 0, U.TAU); g.fill(); g.stroke();      // 後腦的髮量
      const strands = 7;
      for (let i = 0; i < strands; i++) { // 往後（−x）梳起的髮束，尾端帶鋸齒
        const a = Math.PI + (i / (strands - 1) - 0.5) * 1.5, L = r * (0.5 + 0.12 * ((i * 5) % 3) / 2), w = 0.24;
        g.beginPath(); g.moveTo(Math.cos(a - w) * r * 0.2, Math.sin(a - w) * r * 0.2);
        g.quadraticCurveTo(Math.cos(a - 0.12) * L * 0.7, Math.sin(a - 0.12) * L * 0.7, Math.cos(a + 0.06) * L, Math.sin(a + 0.06) * L);
        g.quadraticCurveTo(Math.cos(a + w * 0.9) * L * 0.6, Math.sin(a + w * 0.9) * L * 0.6, Math.cos(a + w) * r * 0.2, Math.sin(a + w) * r * 0.2);
        g.closePath(); g.fill(); g.stroke();
      }
      const sg = g.createRadialGradient(-r * 0.06, -r * 0.05, 1, 0, 0, r * 0.4);
      sg.addColorStop(0, SK.lite); sg.addColorStop(1, SK.base);
      g.fillStyle = sg; g.strokeStyle = SK.line; g.lineWidth = 1.4;
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(-r * 0.04, s * r * 0.36, r * 0.07, r * 0.11, 0, 0, U.TAU); g.fill(); g.stroke(); } // 耳
      g.beginPath(); g.arc(0, 0, r * 0.35, 0, U.TAU); g.fill(); g.stroke();
      const hg = g.createRadialGradient(-r * 0.12, -r * 0.05, 1, -r * 0.08, 0, r * 0.34);       // 頭髮蓋住後半
      hg.addColorStop(0, HAIR_L); hg.addColorStop(1, HAIR);
      g.fillStyle = hg; g.strokeStyle = HAIR_D; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(-r * 0.1, 0, r * 0.28, r * 0.34, 0, 0, U.TAU); g.fill(); g.stroke();
      g.strokeStyle = hexA(HAIR_D, 0.8); g.lineWidth = 1;                                              // 髮流
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(r * 0.12, i * r * 0.07); g.quadraticCurveTo(-r * 0.12, i * r * 0.1, -r * 0.34, i * r * 0.12); g.stroke(); }
      // 前緣的臉：粗黑的怒眉、眼、獰笑的牙
      g.strokeStyle = '#120808'; g.lineWidth = r * 0.07; g.lineCap = 'round';
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(r * 0.24, s * r * 0.22); g.lineTo(r * 0.3, s * r * 0.06); g.stroke(); }
      g.fillStyle = p2 ? '#ff5a40' : '#2a1410';
      for (const s of [-1, 1]) { g.beginPath(); g.arc(r * 0.31, s * r * 0.14, r * 0.025, 0, U.TAU); g.fill(); }
      g.fillStyle = '#f4ece0'; g.strokeStyle = '#3a2218'; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(r * 0.345, -r * 0.12); g.quadraticCurveTo(r * 0.4, 0, r * 0.345, r * 0.12); g.lineTo(r * 0.32, r * 0.1); g.quadraticCurveTo(r * 0.36, 0, r * 0.32, -r * 0.1); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = hexA(SK.line, 0.7); g.lineWidth = 1;                                              // 額上與臉頰的皺紋 / 傷疤
      g.beginPath(); g.moveTo(r * 0.18, -r * 0.2); g.lineTo(r * 0.12, -r * 0.1); g.moveTo(r * 0.18, r * 0.2); g.lineTo(r * 0.12, r * 0.1); g.stroke();
      if (p2) { g.beginPath(); g.moveTo(r * 0.16, -r * 0.32); g.lineTo(r * 0.28, -r * 0.24); g.stroke(); }
    });
  }

  function drawBody(ctx, o, t, { r }) {
    const p2 = o.phase === 2;
    const inst = o.inst && o.inst.skill && o.inst.v && o.inst.v.actions ? o.inst : null;
    const sid = inst ? inst.skill.id : '', ult = !!(inst && inst.skill.ult);
    let wd = 0, sn = 0, hitI = 0;
    if (inst) { const p = R.skillPace(inst, TRIG); wd = p.snap > 0 ? 0 : p.wind; sn = p.snap; hitI = p.i; }
    const col = p2 ? '#ff4a33' : '#c8c0d0';
    const rage = p2 ? (ult || sid === 'demon_blow' ? 1 : sid === 'beast_barrage' ? 0.75 : 0.3) : 0;

    // 1. 腳下氣場：一階段淡淡的暗灰；二階段赤紅的氣場與浮起的餘燼
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(t * (p2 ? 5 : 2));
    ctx.fillStyle = hexA(col, (p2 ? 0.14 : 0.04) + 0.06 * pulse + rage * 0.1);
    ctx.beginPath(); ctx.arc(0, 0, r * (1.55 + 0.2 * pulse + rage * 0.3), 0, U.TAU); ctx.fill();
    if (p2) for (let i = 0; i < 8; i++) {
      const a = i / 8 * U.TAU + t * 0.5, d = r * (1.2 + 0.7 * ((t * 0.6 + i * 0.37) % 1));
      ctx.fillStyle = hexA('#ffb070', 0.6 * (1 - ((t * 0.6 + i * 0.37) % 1)));
      ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.04, 0, U.TAU); ctx.fill();
    }
    ctx.restore();

    // 2. 腿：踵落抬腿高舉再劈下、迴旋踢旋身掃出（畫在身體下層）
    const kick = (sid === 'axe_kick' && (wd > 0.35 || sn > 0)) || (sid === 'roll_kick' && hitI >= 2);
    if (kick) {
      const f = sn > 0 ? 1 - sn : 0;
      const a = sid === 'axe_kick' ? (sn > 0 ? -0.5 + 0.5 * ease(f) : -0.5) : -1.6 + 3.2 * ease(f);
      const L = r * (sid === 'axe_kick' ? (sn > 0 ? 1.15 : 0.9 + 0.4 * wd) : 1.5);
      ctx.save(); ctx.translate(-r * 0.05, r * 0.28); ctx.rotate(a);
      if (sn > 0) { ctx.fillStyle = hexA(p2 ? '#ff5a40' : '#e0d8e8', 0.28 * sn); ctx.beginPath(); ctx.arc(0, 0, L + r * 0.35, -2.4 * (1 - f), 0.2); ctx.arc(0, 0, L * 0.45, 0.2, -2.4 * (1 - f), true); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = SH.base; ctx.lineWidth = r * 0.42; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
      ctx.strokeStyle = SH.lite; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -r * 0.18); ctx.lineTo(L, -r * 0.15); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.ellipse(L + r * 0.14, 0, r * 0.24, r * 0.15, 0, 0, U.TAU); ctx.fill(); ctx.stroke(); // 功夫鞋
      ctx.restore();
    }

    // 3. 軀幹（二階段：鬼臉的眼睛隨招式越來越亮；大招「鬼哭啼」流下血淚）
    torso(ctx, r, p2);
    if (p2) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const eg = 0.35 + 0.25 * Math.sin(t * 3) + rage * 0.5, cx = -r * 0.62;
      for (const s of [-1, 1]) {
        ctx.fillStyle = hexA('#ff5a40', Math.min(0.95, eg)); ctx.beginPath(); ctx.arc(cx - r * 0.03, s * r * 0.34, r * (0.1 + 0.06 * rage), 0, U.TAU); ctx.fill();
        if (ult && inst.skill.id === 'ult') { // 血淚
          ctx.strokeStyle = hexA('#ff2a1a', 0.7); ctx.lineWidth = 2;
          const d = (t * 1.6 + (s > 0 ? 0.5 : 0)) % 1;
          ctx.beginPath(); ctx.moveTo(cx - r * 0.08, s * r * 0.38); ctx.lineTo(cx - r * (0.2 + 0.5 * d), s * r * (0.42 + 0.06 * d)); ctx.stroke();
        }
      }
      if (rage > 0.5) { ctx.strokeStyle = hexA('#ff8a60', 0.35 * rage); ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.ellipse(cx, 0, r * 0.4, r * 0.78, 0, 0, U.TAU); ctx.stroke(); }
      ctx.restore();
    }

    // 4. 雙臂：短袖黑衫下是古銅的前臂；招式姿態：震樓之軀雙臂張開、熊抱前伸再收緊、鼓膜破壞雙掌合擊、消力低垂卸力，其餘依出招節奏
    const fast = sid === 'whip_strike' || sid === 'beast_barrage' || ult;
    for (const s of [-1, 1]) {
      let fx = r * 0.62, fy = s * r * 0.66, glow = 0;
      if (sid === 'flex') { fx = r * 0.2; fy = s * r * (1.15 + 0.1 * Math.sin(t * 14)); glow = 0.5; }
      else if (sid === 'bear_hug') { const sq = hitI > 0 ? Math.min(1, 0.4 + 0.2 * hitI) : 0; fx = r * (0.5 + 0.5 * (hitI > 0 ? 1 : wd)); fy = s * r * (0.95 - 0.8 * sq); glow = sq * 0.5; }
      else if (sid === 'eardrum') { if (sn > 0) { fx = r * 0.78; fy = s * r * 0.1; glow = sn; } else { fx = r * (0.2 + 0.2 * wd); fy = s * r * (0.8 + 0.3 * wd); } }
      else if (sid === 'xiaoli') { fx = r * 0.35 + r * 0.06 * Math.sin(t * 4 + s); fy = s * r * 0.86; }
      else if (inst) {
        const mine = (hitI % 2 === 0 ? 1 : -1) === s;
        const alt = fast ? ((Math.floor(inst.t * (sid === 'beast_barrage' ? 18 : 14)) % 2 === 0 ? 1 : -1) === s) : (sid === 'quake_stop' || sid === 'demon_blow' || sid === 'finger_flick' || ult ? s === 1 : (hitI % 2 === 0 ? s === 1 : s === -1));
        let ext = 0;
        if (sn > 0 && alt) { ext = r * (1.0 + 0.6 * ease(sn)); glow = sn; }
        else if (wd > 0 && (mine || fast || alt)) { ext = -r * 0.35 * wd; if ((sid === 'quake_stop' || sid === 'demon_blow' || ult) && s === 1) { ext = -r * 0.5 * wd; glow = wd; } }
        else ext = r * 0.15 * Math.sin(t * 2 + s);
        fx += ext;
      } else fx += r * 0.1 * Math.sin(t * 2.2 + s);
      const sx = -r * 0.02, sy = s * r * 0.86, mx = (sx + fx - r * 0.1) / 2 + r * 0.04, my = (sy + fy) / 2 + s * r * 0.05;
      ctx.lineCap = 'round';
      ctx.strokeStyle = p2 ? SK.base : SH.base; ctx.lineWidth = r * 0.34; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(mx, my); ctx.stroke(); // 上臂（一階段為黑色短袖）
      ctx.strokeStyle = SK.base; ctx.lineWidth = r * 0.29; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(fx - r * 0.1, fy); ctx.stroke();      // 前臂
      ctx.strokeStyle = hexA(p2 ? SK.line : SH.lite, 0.8); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx, sy - s * r * 0.12); ctx.lineTo(mx, my - s * r * 0.1); ctx.stroke();
      if (sid === 'finger_flick' && s === 1 && (wd > 0.4 || sn > 0)) { // 彈指：指尖積蓄的一點亮光
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = hexA('#ffffff', 0.5 + 0.4 * (sn > 0 ? sn : wd));
        ctx.beginPath(); ctx.arc(fx + r * 0.2, fy, r * (0.08 + 0.12 * (sn > 0 ? sn : wd)), 0, U.TAU); ctx.fill(); ctx.restore();
      }
      fist(ctx, fx, fy, r, glow, col);
    }

    // 5. 頭（比軀幹再靠前一些；噛みつき時整顆頭撲向前方）
    ctx.save();
    ctx.translate(r * (0.12 + (sid === 'bite' && sn > 0 ? 0.28 * sn : 0)), 0);
    head(ctx, r, p2);
    ctx.restore();
  }

  R.defineBossStyle('yujiro', {
    body(ctx, o, t, args) { ctx.save(); ctx.lineWidth = 1; drawBody(ctx, o, t, Object.assign({}, args, { r: args.r * VIS })); ctx.restore(); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
