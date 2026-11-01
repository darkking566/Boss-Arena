'use strict';
// 狩獵模式（4v1）繪圖：Boss 身上的傷口標記（世界座標）、部位狀態列（畫面座標，競技場右上角）
(function (G) {
  const BD = G.BD, R = BD.Render, FONT = R.FONT, H4 = BD.HUNT4;

  R.drawHunt4World = function (ctx, w, t) {
    const st = w.hunt4, b = st.boss;
    if (b.state === 'dead') return;
    for (const P of st.parts) {
      if (!P.wound) continue;
      const p = BD.H4Combat.partPos(b, P), k = 0.5 + 0.5 * Math.sin(t * 7);
      ctx.strokeStyle = `rgba(255,50,70,${0.55 + 0.35 * k})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, 9 + 4 * k, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,40,60,0.85)'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    if (!R.aiDebug) return; // F6：獵人大腦最近一次的決定（出手 / 等待＋情境、反應、翻滾方向）
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = `bold 14px ${FONT}`; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    for (const h of st.hunters) if (h.brain && h.state !== 'dead' && h.brain.last) { const s = h.name + '｜' + h.brain.last; ctx.strokeText(s, h.x, h.y - h.r - 40); ctx.fillStyle = h.def.color; ctx.fillText(s, h.x, h.y - h.r - 40); }
  };

  // 部位列：頭 / 腳 / 身 / 尾 各一格（紅＝傷口、灰＝疤、金框＝已破壞），右側列出 Boss 身上的異常與疲勞
  R.drawHunt4Parts = function (ctx, w, t) {
    const st = w.hunt4, b = st.boss, cw = 58, x0 = R.W - 40 - st.parts.length * (cw + 6), y0 = R.OY + 8;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold 14px ${FONT}`;
    st.parts.forEach((P, i) => {
      const x = x0 + i * (cw + 6), scar = !P.wound && w.time < P.scarUntil;
      ctx.fillStyle = P.wound ? `rgba(200,30,50,${0.7 + 0.3 * Math.sin(t * 7)})` : scar ? 'rgba(90,90,90,0.8)' : 'rgba(10,8,14,0.7)';
      ctx.fillRect(x, y0, cw, 24);
      ctx.strokeStyle = P.broken ? '#ffe27a' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = P.broken ? 2 : 1; ctx.strokeRect(x, y0, cw, 24);
      ctx.fillStyle = '#fff'; ctx.fillText(P.name + (P.broken ? '・破' : P.wound ? '・傷' : scar ? '・疤' : ''), x + cw / 2, y0 + 12);
    });
    const tags = [];
    if (st.poisonT > 0) tags.push(['毒', H4.AILMENTS.poison.color]);
    if (st.asleep) tags.push(['睡眠', H4.AILMENTS.sleep.color]);
    if (BD.hasStatus(b, 'h4fatigue')) tags.push(['疲勞', '#cfc8a8']);
    ctx.textAlign = 'right'; ctx.font = `bold 13px ${FONT}`;
    let x = x0 - 8;
    for (const [s, c] of tags) { ctx.fillStyle = c; ctx.fillText(s, x, y0 + 12); x -= ctx.measureText(s).width + 10; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
