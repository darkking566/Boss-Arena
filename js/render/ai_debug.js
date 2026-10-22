'use strict';
// AI 偵錯覆蓋層（F6）：顯示每位 AI Boss 的模式 / 連段 / 習慣讀取，並在場上標出預判落點、威脅與閃避候選。
// 只讀取 controller 的狀態（mode / plan / evade / combo / dbg / model），不改動世界或控制器、不呼叫亂數。
(function (G) {
  const BD = G.BD, R = BD.Render, FONT = R.FONT, hexA = R.hexA;

  const MODE_ZH = { strafe: '繞行', approach: '接近', retreat: '後撤', hold: '保持', reposition: '重新定位', stalk: '徘徊' };
  const PLAN_ZH = { dodge: '翻滾', counter: '見切', clash: '對撞' };
  const KIND_ZH = { tele: '預警', proj: '投射物', dash: '突進', glow: '蓄力' };
  const DO_ZH = { extend: '延伸', delay: '延遲', switch: '換招', stop: '停止', cut: '中斷' };
  const pct = (v) => Math.round((v || 0) * 100);

  // 分數 → 紅（差）→ 黃 → 綠（好）的顏色
  function scoreColor(s, lo, hi) {
    const k = hi <= lo ? 0.5 : Math.max(0, Math.min(1, (s - lo) / (hi - lo)));
    const r = Math.round(255 * (1 - k)), g = Math.round(210 * k + 40 * (1 - k));
    return `rgb(${r},${g},60)`;
  }

  function drawPanel(ctx, ctl, boss, w, t, side) {
    const A = BD.ARENA, col = boss.def.color || R.TEAM[boss.team];
    const PW = 560, x = R.cam.x + (side === 0 ? 24 : R.VW - 24 - PW), y = R.cam.y + 16;
    const lines = [];
    const mode = ctl.mode ? MODE_ZH[ctl.mode] || ctl.mode : '—';
    let mline = `模式 ${mode}`;
    if (ctl.plan) mline += `（計畫：${PLAN_ZH[ctl.plan.type] || ctl.plan.type} ${Math.max(0, ctl.plan.t).toFixed(1)}s）`;
    if (ctl.evade) mline += `（走位 ${Math.max(0, ctl.evade.until - w.time).toFixed(1)}s）`;
    lines.push(mline);

    const combo = ctl.combo && ctl.combo.c;
    if (combo) {
      const last = combo.last;
      const lastTxt = last ? `${DO_ZH[last.do] || last.do} ${Math.max(0, w.time - last.t).toFixed(1)}s 前` : '—';
      lines.push(`連段 ${combo.def.name}（${combo.def.id}）第 ${combo.i + 1}/${combo.def.steps.length} 步 · 上次：${lastTxt}`);
    } else {
      const cl = ctl.dbg && ctl.dbg.comboLast;
      const lastTxt = cl ? `${DO_ZH[cl.do] || cl.do} ${Math.max(0, w.time - cl.t).toFixed(1)}s 前` : '—';
      lines.push(`連段 — · 上次：${lastTxt}`);
    }

    if (ctl.model && ctl.model.summary) {
      const s = ctl.model.summary();
      lines.push(`讀取：早 ${pct(s.early)}% 準 ${pct(s.ontime)}% 晚 ${pct(s.late)}%（n=${s.n}）`);
      lines.push(`方向 左 ${pct(s.dirs.left)}% 右 ${pct(s.dirs.right)}% 後 ${pct(s.dirs.back)}% 穿 ${pct(s.dirs.through)}%` +
        ` · 懲罰 ${pct(s.punish)}% · 翻滾後出手 ${pct(s.aar)}% · 信心 ${pct(s.conf)}%`);
    } else {
      lines.push('讀取：—');
    }

    const lr = ctl.dbg && ctl.dbg.lastRead;
    lines.push(`最後判讀：${lr ? `${lr.text}（${Math.max(0, w.time - lr.t).toFixed(1)}s 前）` : '—'}`);
    const th = (ctl.dbg && ctl.dbg.threats) || [];
    lines.push(`威脅 ${th.length}${th.length ? '：' + th.map((o) => `${KIND_ZH[o.kind] || o.kind} ${o.left.toFixed(1)}s${o.undo ? '（無法閃避）' : ''}`).join('、') : ''}`);

    ctx.save();
    ctx.font = `13px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const ph = lines.length * 18 + 12;
    ctx.fillStyle = 'rgba(6,8,12,0.68)'; ctx.fillRect(x, y, PW, ph);
    ctx.strokeStyle = hexA(col, 0.8); ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, PW - 2, ph - 2);
    ctx.fillStyle = hexA(col, 0.85); ctx.fillRect(x, y, 4, ph);
    lines.forEach((l, i) => {
      ctx.fillStyle = i === 0 ? '#fff' : i === 1 ? '#ffe9a8' : '#cfd6e0';
      ctx.fillText(l, x + 12, y + 7 + i * 18);
    });
    ctx.restore();
    return { x, y, h: ph };
  }

  function cross(ctx, x, y, r, color, lw) {
    ctx.strokeStyle = color; ctx.lineWidth = lw || 1.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.moveTo(x - r - 5, y); ctx.lineTo(x + r + 5, y);
    ctx.moveTo(x, y - r - 5); ctx.lineTo(x, y + r + 5);
    ctx.stroke();
  }

  function drawField(ctx, ctl, boss, w, t) {
    const col = boss.def.color || R.TEAM[boss.team], e = boss.enemy;
    if (!e) return;
    const dbg = ctl.dbg || {};
    ctx.save();
    ctx.font = `12px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';

    // 預判落點
    const p = dbg.predict;
    if (p) {
      const fresh = w.time - p.t < 2;
      ctx.globalAlpha = fresh ? 0.9 : 0.4;
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = hexA(col, 0.6); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.setLineDash([]);
      cross(ctx, p.x, p.y, 13, hexA(col, 0.95), 2);
      ctx.fillStyle = hexA(col, 0.95); ctx.fillText('預判落點', p.x + 18, p.y);
      ctx.globalAlpha = 1;
    }

    // 威脅：細線連到預警中心 / 投射物
    const threats = dbg.threats || [];
    for (const o of threats) {
      if (o.x == null || o.y == null) continue;
      const a = Math.max(0.25, Math.min(1, o.left));
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = o.undo ? 'rgba(255,40,90,' + a.toFixed(2) + ')' : 'rgba(255,120,80,' + a.toFixed(2) + ')';
      ctx.lineWidth = o.undo ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(boss.x, boss.y); ctx.lineTo(o.x, o.y); ctx.stroke();
      ctx.fillStyle = o.undo ? '#ff7090' : '#ffb090';
      ctx.fillText(`${o.undo ? '危 ' : ''}${KIND_ZH[o.kind] || o.kind} ${o.left.toFixed(1)}s`, o.x + 6, o.y - 8);
      ctx.globalAlpha = 1;
    }

    // 最近的智慧閃避候選（1.2 秒內）
    const d = dbg.dodge;
    if (d && w.time - d.at <= 1.2 && d.cands && d.cands.length) {
      const age = w.time - d.at;
      let lo = Infinity, hi = -Infinity;
      for (const c of d.cands) { if (c.s < lo) lo = c.s; if (c.s > hi) hi = c.s; }
      ctx.globalAlpha = Math.max(0.25, 1 - age / 1.2);
      d.cands.forEach((c, i) => {
        const isBest = i === d.best;
        ctx.fillStyle = scoreColor(c.s, lo, hi);
        ctx.beginPath(); ctx.arc(c.x, c.y, isBest ? 5 : 3, 0, Math.PI * 2); ctx.fill();
        if (isBest) {
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(c.x, c.y, 9, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = `bold 12px ${FONT}`;
          ctx.fillText(c.s.toFixed(1), c.x + 12, c.y - 12);
        }
      });
      ctx.globalAlpha = 1;
      ctx.font = `12px ${FONT}`;
    }
    ctx.restore();
  }

  R.drawAIDebug = function (ctx, w, t) {
    if (!R.aiDebug || !w || !w.bosses) return;
    const A = BD.ARENA;
    ctx.save();
    // 嚴格限制在競技場內
    ctx.beginPath(); ctx.rect(0, 0, A.w, A.h); ctx.clip();
    w.bosses.forEach((boss, i) => {
      const ctl = boss.controller;
      if (!ctl || ctl.isPlayer || !BD.AIController || !(ctl instanceof BD.AIController)) return;
      if (boss.state === 'dead') return;
      drawField(ctx, ctl, boss, w, t);
    });
    w.bosses.forEach((boss, i) => {
      const ctl = boss.controller;
      if (!ctl || ctl.isPlayer || !BD.AIController || !(ctl instanceof BD.AIController)) return;
      drawPanel(ctx, ctl, boss, w, t, i);
    });
    ctx.restore();
  };
})(typeof window !== 'undefined' ? window : globalThis);
