'use strict';
// 召喚物造型註冊表與各種類造型
//   R.defineMinionStyle(kind, draw(ctx, m, t), { absolute })：預設已平移到召喚物位置；absolute=true 時以世界座標繪製
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, TEAM = R.TEAM, FONT = R.FONT;
  const styles = R.minionStyles = {};
  R.defineMinionStyle = function (kind, draw, opts) {
    if (styles[kind]) throw new Error(`defineMinionStyle：召喚物造型「${kind}」重複定義`);
    styles[kind] = Object.assign({ kind, draw, absolute: false }, opts || {});
  };
  R.minionStyle = function (kind) {
    const s = styles[kind];
    if (!s) throw new Error(`未定義的召喚物造型「${kind}」——請以 R.defineMinionStyle 註冊（js/render/minions.js）`);
    return s;
  };

  // ── 腐沼母巢 ──
  R.defineMinionStyle('spider', (ctx, m, t) => {
    ctx.rotate(m.face || 0);
    ctx.strokeStyle = '#2a1636'; ctx.lineWidth = 2;
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const a = s * (0.7 + i * 0.6) + Math.sin(t * 20 + i) * 0.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * m.r * 1.7, Math.sin(a) * m.r * 1.7); ctx.stroke(); }
    ctx.fillStyle = m.fuse >= 0 && Math.sin(t * 40) > 0 ? '#fff' : '#5b3a6b'; ctx.beginPath(); ctx.arc(0, 0, m.r, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#c8ff7a'; ctx.beginPath(); ctx.arc(m.r * 0.5, -3, 2, 0, U.TAU); ctx.arc(m.r * 0.5, 3, 2, 0, U.TAU); ctx.fill();
  });
  R.defineMinionStyle('egg', (ctx, m, t) => {
    const p = m.t / m.life, s = 1 + Math.sin(t * (6 + p * 20)) * 0.08;
    ctx.scale(s, s);
    ctx.fillStyle = '#d9e8b0'; ctx.beginPath(); ctx.ellipse(0, 0, m.r, m.r * 1.2, 0, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = '#6b8f2a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = `rgba(120,200,60,${p})`; ctx.beginPath(); ctx.ellipse(0, 0, m.r * 0.6, m.r * 0.75, 0, 0, U.TAU); ctx.fill();
  });

  // ── 霜月魔女 ──
  R.defineMinionStyle('sentinel', (ctx, m, t) => {
    ctx.rotate(t * 0.8);
    // 發光冰晶（陰影 16px）：整顆精靈快取，精靈框含陰影範圍
    R.blit(ctx, 'minion:sentinel:' + m.r, m.r * 2 + 44, m.r * 2 + 44, m.r + 22, m.r + 22, (g) => {
      g.shadowColor = '#bff'; g.shadowBlur = 16;
      g.fillStyle = 'rgba(180,235,255,0.85)'; g.beginPath();
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; i ? g.lineTo(Math.cos(a) * m.r, Math.sin(a) * m.r) : g.moveTo(m.r, 0); }
      g.closePath(); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
      g.shadowBlur = 0;
      g.fillStyle = '#1b3a5c'; g.beginPath(); g.arc(0, 0, 5, 0, U.TAU); g.fill();
    });
  });
  R.defineMinionStyle('clone', (ctx, m, t) => {
    ctx.globalAlpha = 0.45 + 0.15 * Math.sin(t * 10);
    R.drawBossBody(ctx, { x: m.x, y: m.y, face: m.face, r: m.r, def: m.owner.def, phase: 1, state: 'idle' }, t);
  }, { absolute: true });

  // ── 深淵監視者：同伴與紅眼監視者沿用 Boss 造型，加上迷你血條 ──
  function knight(ctx, m, t) {
    if (m.kind === 'rogue') {
      // 紅眼監視者的血色光暈：以 alpha=1 快取，繪製時套用脈動 globalAlpha（等效）
      const a = 0.35 + 0.15 * Math.sin(t * 7), rr = m.r * 2.4;
      ctx.save(); ctx.translate(m.x, m.y); ctx.globalAlpha *= a;
      R.blit(ctx, 'minion:rogueglow:' + m.kind + ':' + m.r, rr * 2 + 8, rr * 2 + 8, rr + 4, rr + 4, (g) => {
        const gr = g.createRadialGradient(0, 0, 4, 0, 0, rr);
        gr.addColorStop(0, 'rgba(200,0,30,1)'); gr.addColorStop(1, 'rgba(120,0,20,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rr, 0, U.TAU); g.fill();
      });
      ctx.restore();
    }
    ctx.globalAlpha = m.kind === 'watcher' ? 0.9 : 1;
    const fi = m.ms === 'wind' ? { t: Math.max(0, 0.5 - m.st), v: { dur: 0.8 } } : null;
    R.drawBossBody(ctx, { x: m.x, y: m.y, face: m.face, r: m.r, def: m.def, phase: 1, state: 'idle', inst: fi, rogue: m.kind === 'rogue' }, t);
    ctx.globalAlpha = 1;
    const bw = 36; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(m.x - bw / 2, m.y - m.r - 14, bw, 4);
    ctx.fillStyle = TEAM[m.team]; ctx.fillRect(m.x - bw / 2, m.y - m.r - 14, bw * m.hp / m.maxHp, 4);
    if (m.kind === 'rogue') { ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ff5566'; ctx.fillText('紅眼', m.x, m.y - m.r - 18); }
  }
  R.defineMinionStyle('watcher', knight, { absolute: true });
  R.defineMinionStyle('rogue', knight, { absolute: true });
})(typeof window !== 'undefined' ? window : globalThis);
