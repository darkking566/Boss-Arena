'use strict';
// 獵魂模式繪圖：主角 HUD 面板（生命 / 體力 / 法力 / 架勢 / 大招 / 技能列 / 藥水）與弓箭、弩矢、魔彈的投射物外觀
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, TEAM = R.TEAM, FONT = R.FONT;
  const KEYS = ['左鍵', '右鍵', 'Q', 'E', 'R', 'F'];
  const bar = (ctx, x, y, w, h, frac, color) => { ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x, y, w, h); ctx.fillStyle = color; ctx.fillRect(x, y, w * U.clamp(frac, 0, 1), h); };

  R.drawHeroPanel = function (ctx, b, w, t) {
    const PW = 640, x = 40, y = 14, h = b.hunt || { hpPotions: 0, manaPotions: 0 };
    ctx.fillStyle = 'rgba(10,8,14,0.75)'; ctx.fillRect(x - 10, y - 6, PW + 20, 158);
    ctx.fillStyle = TEAM[0]; ctx.fillRect(x - 10, y - 6, 4, 158);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.font = `bold 28px ${FONT}`; ctx.fillStyle = b.def.color; ctx.fillText(b.name, x, y + 26);
    const nw = ctx.measureText(b.name).width;
    ctx.font = `15px ${FONT}`; ctx.fillStyle = '#bbb'; ctx.fillText(`${b.def.archetype} · 玩家`, x + nw + 14, y + 25);
    const hy = y + 38, f = U.clamp(b.hp / b.maxHp, 0, 1), ft = U.clamp(b.hpTrail / b.maxHp, 0, 1);
    bar(ctx, x, hy, PW, 24, f, TEAM[0]);
    ctx.fillStyle = 'rgba(255,240,220,0.5)'; ctx.fillRect(x + PW * f, hy, PW * Math.max(0, ft - f), 24);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(x, hy, PW, 24);
    ctx.font = `bold 15px ${FONT}`; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.fillStyle = '#fff';
    const hpTxt = `${Math.ceil(b.hp)} / ${b.maxHp}`; ctx.strokeText(hpTxt, x + 8, hy + 18); ctx.fillText(hpTxt, x + 8, hy + 18);
    const half = PW / 2 - 50, sy = hy + 30;
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = '#9c9'; ctx.fillText('體力', x, sy + 9); bar(ctx, x + 34, sy, half, 9, b.sta / b.maxSta, '#5fd47a');
    ctx.fillStyle = '#8fc4ff'; ctx.fillText('法力', x + PW / 2 + 10, sy + 9); bar(ctx, x + PW / 2 + 44, sy, half, 9, b.mana / b.maxMana, '#4a90ff');
    const uy = sy + 16, ready = b.ult >= 100 && b.ultimate.actions.length > 0;
    ctx.fillStyle = '#dc9'; ctx.fillText('架勢', x, uy + 9); bar(ctx, x + 34, uy, half, 9, b.posture / b.maxPosture, b.posture / b.maxPosture > 0.75 ? '#ff8844' : '#f5c542');
    ctx.fillStyle = ready ? `rgba(255,220,90,${0.6 + 0.4 * Math.sin(t * 8)})` : '#c8a0ff'; ctx.fillText('大招 X', x + PW / 2 + 10, uy + 9);
    bar(ctx, x + PW / 2 + 54, uy, half - 10, 9, b.ult / 100, ready ? '#ffdd55' : '#9a6cff');
    // 技能列
    const ky = uy + 18, cw = 66, gap = 6;
    ctx.textAlign = 'center';
    b.skills.forEach((s, i) => {
      const sx = x + i * (cw + gap), cd = Math.max(0, b.cds[s.id] || 0), max = (s.cd || 1) * b.cdMul, active = b.inst && b.inst.skill === s;
      const afford = s.res === 'mana' ? b.mana >= s.cost : b.sta >= (s.cost || 0);
      ctx.fillStyle = active ? 'rgba(127,214,255,0.8)' : 'rgba(255,255,255,0.12)'; ctx.fillRect(sx, ky, cw, 22);
      if (cd > 0) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(sx, ky, cw * U.clamp(cd / max, 0, 1), 22); }
      ctx.fillStyle = active ? '#111' : afford ? '#eee' : '#e88';
      ctx.fillText(`${KEYS[i]} ${s.short}`.slice(0, 9), sx + cw / 2, ky + 15);
    });
    ctx.textAlign = 'right'; ctx.font = `bold 14px ${FONT}`;
    ctx.fillStyle = h.hpPotions ? '#7dffb0' : '#666'; ctx.fillText(`1 生命藥水 ×${h.hpPotions}`, x + PW - 130, ky + 16);
    ctx.fillStyle = h.manaPotions ? '#8fc4ff' : '#666'; ctx.fillText(`2 法力藥水 ×${h.manaPotions}`, x + PW, ky + 16);
    R.drawStatusRow(ctx, b, x, ky + 26, false, PW);
  };

  // 投射物外觀（world.js 的 drawProjectiles 會依 p.kind 查這張表）
  R.huntProj = {
    arrow(ctx) {
      ctx.strokeStyle = '#d8c9a8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.fillStyle = '#e8ecf2'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(6, 4); ctx.lineTo(6, -4); ctx.closePath(); ctx.fill();
    },
    bolt(ctx, p) {
      const s = p.r > 8 ? 1.4 : 1;
      ctx.strokeStyle = '#8a8f9a'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(-14 * s, 0); ctx.lineTo(10 * s, 0); ctx.stroke();
      ctx.fillStyle = '#f2f5fa'; ctx.beginPath(); ctx.moveTo(16 * s, 0); ctx.lineTo(8 * s, 4 * s); ctx.lineTo(8 * s, -4 * s); ctx.closePath(); ctx.fill();
    },
    magic(ctx, p) {
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, p.r * 1.8); g.addColorStop(0, '#fff'); g.addColorStop(0.4, '#b99bff'); g.addColorStop(1, 'rgba(120,80,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, p.r * 1.8, 0, U.TAU); ctx.fill();
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
