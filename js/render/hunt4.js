'use strict';
// 狩獵模式（4v1）繪圖：Boss 身上的傷口 / 弓的誘導箭與殘留觸發箭標記（世界座標）、曲射落箭、部位狀態列（畫面座標，競技場右上角）
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
    for (const h of st.hunters) { // 輕弩：附著龍彈（橘色方塊，環數＝目前階段）、起爆龍彈裝置（地上的橘色圓盤，點數＝剩餘可爆次數）
      const s = h.def.weapon === 'lightxbow' && h.h4.drv;
      if (!s) continue;
      if (s.adh) {
        const p = BD.H4Combat.partPos(b, st.parts.find((P) => P.id === s.adh.part) || st.parts[0]), lv = H4.LBG.sp.adh.need.filter((x) => s.adh.pts >= x).length;
        ctx.fillStyle = '#ffb84a'; ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
        ctx.strokeStyle = 'rgba(255,184,74,0.8)'; ctx.lineWidth = 2;
        for (let k = 1; k <= lv; k++) { ctx.beginPath(); ctx.arc(p.x, p.y, 6 + k * 5, 0, Math.PI * 2); ctx.stroke(); }
      }
      if (s.wyv) {
        const d = s.wyv, k = 0.5 + 0.5 * Math.sin(t * 9);
        ctx.fillStyle = `rgba(255,154,60,${0.35 + 0.3 * k})`; ctx.beginPath(); ctx.arc(d.x, d.y, 14, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ff9a3c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(d.x, d.y, 14, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#fff'; for (let n = 0; n < d.n; n++) ctx.fillRect(d.x - 7 + n * 6, d.y - 2, 3, 3);
      }
    }
    for (const h of st.hunters) { // 弓：誘導箭標記（青色旋轉菱框，快到期時閃）、殘留觸發箭（插在 Boss 身上的短箭）
      const s = h.def.weapon === 'bow' && h.h4.drv;
      if (!s) continue;
      if (s.tracer) {
        const p = BD.H4Combat.partPos(b, st.parts.find((P) => P.id === s.tracer.part) || st.parts[0]), left = s.tracer.until - w.time;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(t * 2.5); ctx.globalAlpha = left < 2 ? 0.45 + 0.55 * Math.abs(Math.sin(t * 12)) : 1;
        ctx.strokeStyle = '#7dffe0'; ctx.lineWidth = 3; ctx.strokeRect(-11, -11, 22, 22); ctx.fillStyle = 'rgba(125,255,224,0.85)'; ctx.fillRect(-3, -3, 6, 6);
        ctx.restore();
      }
      ctx.strokeStyle = '#d8f0ff'; ctx.lineWidth = 2;
      for (let k = 0; k < s.marks; k++) {
        const a = b.face + k * 2.4, d = b.r * (0.35 + 0.08 * (k % 4)), x = b.x + Math.cos(a) * d, y = b.y + Math.sin(a) * d;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y - 12); ctx.stroke();
      }
    }
    for (const h of st.hunters) { // 星軌輪刃：Boss 身上的星痕（滿了連成星座、一閃一閃）、擲出飛行中的輪刃（去 → 在遠端迴旋 → 回）
      const s = h.def.weapon === 'chakram' && h.h4.drv;
      if (!s) continue;
      const n = s.stars, full = n >= H4.CK.max, P = (k) => H4.ckStarPos(b, k);
      if (full) {
        ctx.strokeStyle = `rgba(255,233,168,${0.45 + 0.3 * Math.sin(t * 6)})`; ctx.lineWidth = 3; ctx.beginPath();
        for (let k = 0; k <= n; k++) { const p = P(k % n); if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
        ctx.stroke();
      }
      for (let k = 0; k < n; k++) {
        const p = P(k), z = b.r * (full ? 0.22 : 0.16) * (1 + 0.15 * Math.sin(t * 5 + k));
        ctx.fillStyle = full ? '#ffe9a8' : '#cfeaff'; ctx.beginPath();
        for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4 + t, rr = j % 2 ? z * 0.35 : z; ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill();
      }
      const i = h.inst;
      if (i && h.state === 'skill' && i.skill.id === 'ck_throw' && i.t > 0.06 && i.t < 0.62) {
        const L = 480, f = i.t < 0.24 ? (i.t - 0.06) / 0.18 : i.t < 0.42 ? 1 : 1 - (i.t - 0.42) / 0.2, e = 1 - (1 - f) * (1 - f);
        const x = h.x + Math.cos(h.face) * L * e, y = h.y + Math.sin(h.face) * L * e;
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 24); ctx.shadowColor = '#9fd8ff'; ctx.shadowBlur = 14; R.ckRing(ctx, h.r * 1.3, '#e6f6ff'); ctx.restore();
        ctx.strokeStyle = "rgba(159,216,255,0.5)"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(x, y); ctx.stroke(); // 星鏈
      }
    }
    if (!R.aiDebug) return; // F6：獵人大腦最近一次的決定（出手 / 等待＋情境、反應、翻滾方向）
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = `bold 14px ${FONT}`; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    for (const h of st.hunters) if (h.brain && h.state !== 'dead' && h.brain.last) { const s = h.name + '｜' + h.brain.last; ctx.strokeText(s, h.x, h.y - h.r - 40); ctx.fillStyle = h.def.color; ctx.fillText(s, h.x, h.y - h.r - 40); }
  };

  // 曲射的箭：從高空斜斜落下的箭（箭頭朝落點）
  R.lobStyles = R.lobStyles || {};
  R.lobStyles.h4arrow = function (ctx, l, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(l.y1 - l.y0, l.x1 - l.x0));
    ctx.strokeStyle = 'rgba(143,227,255,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-30, 0); ctx.stroke();
    ctx.strokeStyle = '#eef7ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(7, 3.5); ctx.lineTo(7, -3.5); ctx.closePath(); ctx.fill();
    ctx.restore();
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
