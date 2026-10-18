'use strict';
// 訓練場繪圖：訓練假人右側面板（取代紅方面板）與中央標題 / 速度列
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA, TEAM = R.TEAM, FONT = R.FONT;

  function bar(ctx, x, y, w, h, frac, color, bg, rtl, trail) {
    ctx.fillStyle = bg || 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, w, h);
    const fw = w * U.clamp(frac, 0, 1);
    if (trail != null) { const tw = w * U.clamp(trail, 0, 1); ctx.fillStyle = 'rgba(255,240,220,0.8)'; ctx.fillRect(rtl ? x + w - tw : x, y, tw, h); }
    ctx.fillStyle = color; ctx.fillRect(rtl ? x + w - fw : x, y, fw, h);
  }

  // 訓練假人面板：與 hud.js drawPanel 的右方（team 1）面板同一個框（x = W - 40 - 640、y = 14、660×158）
  // 排版：標題列 → HP 條 → 架勢條 → 一列 6 格傷害統計 → 狀態列（與 drawPanel 的狀態列同高）
  function txt(ctx, s, x, y, stroke) {
    if (stroke) { ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(s, x, y); }
    ctx.fillText(s, x, y);
  }
  R.drawDummyPanel = function (ctx, b, w, t) {
    const tr = w.training;
    if (!tr) return;
    const PW = 640, x = R.W - 40 - PW, y = 14, ex = x + PW;
    ctx.fillStyle = 'rgba(10,8,14,0.75)'; ctx.fillRect(x - 10, y - 6, PW + 20, 158);
    ctx.fillStyle = TEAM[1]; ctx.fillRect(x + PW + 6, y - 6, 4, 158);
    ctx.textBaseline = 'alphabetic';
    // 標題
    ctx.textAlign = 'right'; ctx.font = `bold 28px ${FONT}`; ctx.fillStyle = b.def.color; ctx.fillText(b.name, ex, y + 26);
    const nw = ctx.measureText(b.name).width;
    ctx.font = `15px ${FONT}`; ctx.fillStyle = '#bbb';
    ctx.fillText(`${b.def.title} · 不會移動、反擊或倒下`, ex - nw - 14, y + 25);
    ctx.textAlign = 'left'; ctx.font = `bold 15px ${FONT}`; ctx.fillStyle = '#ffd27a';
    ctx.fillText('傷害統計', x, y + 25);
    // HP（右方鏡像）：數值靠右、回滿提示靠左
    const hy = y + 38;
    bar(ctx, x, hy, PW, 24, b.hp / b.maxHp, b.def.color, 'rgba(0,0,0,0.65)', true, b.hpTrail / b.maxHp);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(x, hy, PW, 24);
    ctx.font = `bold 15px ${FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
    txt(ctx, `${Math.ceil(b.hp)} / ${b.maxHp}`, ex - 8, hy + 18, true);
    ctx.font = `12px ${FONT}`; ctx.fillStyle = '#f3e6cc'; ctx.textAlign = 'left';
    txt(ctx, '3 秒未受傷自動回滿', x + 8, hy + 17, true);
    // 架勢
    const sy = hy + 30, pf = U.clamp(b.posture / b.maxPosture, 0, 1);
    ctx.font = `12px ${FONT}`; ctx.textAlign = 'right'; ctx.fillStyle = '#dc9';
    ctx.fillText('架勢', ex, sy + 9);
    bar(ctx, x + 70, sy, PW - 106, 9, pf, pf > 0.75 ? '#ff8844' : '#f5c542', null, true);
    ctx.textAlign = 'left'; ctx.fillStyle = b.state === 'stagger' ? '#ffcc33' : '#dc9';
    ctx.fillText(b.state === 'stagger' ? '架勢崩潰！' : `${Math.round(b.posture)} / ${b.maxPosture}`, x, sy + 9);
    // 傷害統計：一列 6 格（標籤在上、數值在下）
    const st = tr.stats, last = st.last, dps = tr.dps();
    const cells = [
      ['總傷害', String(Math.round(st.total)), '#fff', 96],
      ['DPS（近 5 秒）', dps.toFixed(1), '#ffd27a', 104],
      ['最後一擊' + (last ? `（${last.label}）` : ''), last ? String(Math.round(last.dmg)) : '—', last && last.dot ? '#c9a0ff' : '#fff', 180],
      ['最高單擊', String(Math.round(st.max)), '#fff', 88],
      ['命中次數', String(st.hits), '#fff', 82],
      ['持續傷害', String(Math.round(st.dot)), '#c9a0ff', 90],
    ];
    let cx = x;
    const gy = sy + 16;
    ctx.textAlign = 'left';
    for (const [label, val, color, cw] of cells) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(cx, gy, cw - 6, 40);
      ctx.font = `11px ${FONT}`; ctx.fillStyle = '#aaa';
      let lb = label;
      while (lb.length > 2 && ctx.measureText(lb).width > cw - 14) lb = lb.slice(0, -2) + '…';
      ctx.fillText(lb, cx + 5, gy + 13);
      ctx.font = `bold 18px ${FONT}`; ctx.fillStyle = color;
      ctx.fillText(val, cx + 5, gy + 34);
      cx += cw;
    }
    // 狀態列（與 drawPanel 同高，仍在競技場上緣之上）
    if (R.drawStatusRow) R.drawStatusRow(ctx, b, ex, y + 128, true, PW);
  };

  // 中央標題 / 計時 / 速度（取代 drawHUD 的 VS 區塊）
  R.drawTrainingCenter = function (ctx, w, t) {
    const tr = w.training;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = `bold 38px ${FONT}`; ctx.fillStyle = '#ffd27a';
    ctx.fillText('訓練場', R.W / 2, 62);
    const tm = Math.max(0, w.time), mm = Math.floor(tm / 60), ss = Math.floor(tm % 60);
    ctx.font = `bold 22px ${FONT}`; ctx.fillStyle = '#ddd';
    ctx.fillText(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, R.W / 2, 98);
    ctx.font = `14px ${FONT}`; ctx.fillStyle = '#aaa';
    ctx.fillText(`速度 ×${w.speed}`, R.W / 2, 122);
    const modeName = (BD.TRAINING_MODE_NAMES && BD.TRAINING_MODE_NAMES[tr.mode]) || tr.mode;
    const pc = BD.PACES && BD.PACES[w.paceId];
    ctx.font = `12px ${FONT}`; ctx.fillStyle = '#9fdcff';
    ctx.fillText(`${modeName} · 無冷卻 ${tr.freeCast ? '開' : '關'} · ${pc ? pc.name : w.paceId}`, R.W / 2, 142);
  };
})(typeof window !== 'undefined' ? window : globalThis);
