'use strict';
// HUD 與整體繪製流程：雙方面板、計時、橫幅、戰鬥紀錄、R.render 主繪製、選角肖像
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA, TEAM = R.TEAM, FONT = R.FONT;
  const { arena: drawArena, zones: drawZones, traps: drawTraps, telegraphs: drawTelegraphs, pillars: drawPillars, reflections: drawReflections, wheat: drawWheat,
    minions: drawMinions, boss: drawBoss, ghosts: drawGhosts, projectiles: drawProjectiles, lobs: drawLobs, fx: drawFx, texts: drawTexts, veil: drawVeil } = R.draw;
  // ─────────────────────── HUD ───────────────────────
  function bar(ctx, x, y, w, h, frac, color, bg, rtl, trail) {
    ctx.fillStyle = bg || 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, w, h);
    const fw = w * U.clamp(frac, 0, 1);
    if (trail != null) { const tw = w * U.clamp(trail, 0, 1); ctx.fillStyle = 'rgba(255,240,220,0.8)'; ctx.fillRect(rtl ? x + w - tw : x, y, tw, h); }
    ctx.fillStyle = color; ctx.fillRect(rtl ? x + w - fw : x, y, fw, h);
  }
  function drawPanel(ctx, b, w, t) {
    if (b.def.hero && R.drawHeroPanel) { R.drawHeroPanel(ctx, b, w, t); return; }
    if (w.training && b.def.training && R.drawDummyPanel) { R.drawDummyPanel(ctx, b, w, t); return; }
    const rtl = b.team === 1, PW = 640, x = rtl ? R.W - 40 - PW : 40, y = 14;
    const al = rtl ? 'right' : 'left', ex = rtl ? x + PW : x;
    ctx.fillStyle = 'rgba(10,8,14,0.75)'; ctx.fillRect(x - 10, y - 6, PW + 20, 158);
    ctx.fillStyle = TEAM[b.team]; ctx.fillRect(rtl ? x + PW + 6 : x - 10, y - 6, 4, 158);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = al;
    ctx.font = `bold 28px ${FONT}`; ctx.fillStyle = b.def.color; ctx.fillText(b.name, ex, y + 26);
    const nw = ctx.measureText(b.name).width;
    ctx.font = `15px ${FONT}`; ctx.fillStyle = '#bbb';
    const sub = `${b.def.title} · ${b.def.archetype}` + (b.controller && b.controller.isPlayer ? ' · 玩家' : b.controller && b.controller.isManual ? ' · 手動施放' : ' · AI');
    ctx.fillText(sub, rtl ? ex - nw - 14 : ex + nw + 14, y + 25);
    // 階段徽章
    const ph = b.phase === 2 ? '第二階段' : '第一階段';
    ctx.font = `bold 15px ${FONT}`;
    const bw = 84, bx = rtl ? x : x + PW - bw;
    ctx.fillStyle = b.phase === 2 ? b.def.color : 'rgba(255,255,255,0.15)'; ctx.fillRect(bx, y + 8, bw, 24);
    ctx.fillStyle = b.phase === 2 ? '#111' : '#ddd'; ctx.textAlign = 'center'; ctx.fillText(ph, bx + bw / 2, y + 26);
    // HP
    const hy = y + 38;
    bar(ctx, x, hy, PW, 24, b.hp / b.maxHp, b.phase === 2 ? b.def.color : TEAM[b.team], 'rgba(0,0,0,0.65)', rtl, b.hpTrail / b.maxHp);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(x, hy, PW, 24);
    ctx.fillStyle = '#fff'; ctx.fillRect(x + PW / 2 - 1, hy - 4, 3, 32);
    ctx.font = `bold 11px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('Ⅱ', x + PW / 2 + 1, hy - 6);
    ctx.font = `bold 15px ${FONT}`; ctx.textAlign = al; ctx.lineWidth = 3; ctx.strokeStyle = '#000';
    const hpTxt = `${Math.ceil(b.hp)} / ${b.maxHp}`;
    ctx.strokeText(hpTxt, rtl ? x + PW - 8 : x + 8, hy + 18); ctx.fillText(hpTxt, rtl ? x + PW - 8 : x + 8, hy + 18);
    // 體力 / 架勢（右方鏡像）
    const sy = hy + 30, half = PW / 2 - 50;
    const MX = (xl, ww) => (rtl ? x + PW - (xl - x) - ww : xl);
    ctx.font = `12px ${FONT}`; ctx.textAlign = al;
    ctx.fillStyle = '#9c9'; ctx.fillText('體力', ex, sy + 9);
    bar(ctx, MX(x + 34, half), sy, half, 9, b.sta / b.maxSta, '#5fd47a', null, rtl);
    ctx.fillStyle = '#dc9'; ctx.fillText('架勢', rtl ? x + PW / 2 - 10 : x + PW / 2 + 10, sy + 9);
    bar(ctx, MX(x + PW / 2 + 44, half), sy, half, 9, b.posture / b.maxPosture, b.posture / b.maxPosture > 0.75 ? '#ff8844' : '#f5c542', null, rtl);
    // 大招
    const uy = sy + 16, ready = b.ult >= 100;
    ctx.fillStyle = ready ? `rgba(255,220,90,${0.6 + 0.4 * Math.sin(t * 8)})` : '#c8a0ff';
    ctx.textAlign = al; ctx.fillText('大招', ex, uy + 10);
    // 大招漸層參數固定（只隨面板 x / 寬度變），以 R.grad 備忘
    const ug = R.grad(ctx, 'ult:' + x + ':' + PW, (c) => {
      const lg = c.createLinearGradient(x, 0, x + PW, 0); lg.addColorStop(0, '#7a4cff'); lg.addColorStop(1, '#ffcc44'); return lg;
    });
    bar(ctx, rtl ? x : x + 34, uy, PW - 34, 11, b.ult / 100, ready ? '#ffdd55' : ug, null, rtl);
    if (ready) {
      ctx.font = `bold 12px ${FONT}`; ctx.fillStyle = '#111'; ctx.textAlign = 'center';
      ctx.fillText('【' + b.ultName() + '】就緒', rtl ? x + (PW - 34) / 2 : x + 34 + (PW - 34) / 2, uy + 10);
    }
    // 技能冷卻
    const ky = uy + 18, skills = b.skills, cw = 54, gap = 6;
    ctx.textAlign = 'center'; ctx.font = `12px ${FONT}`;
    const keys = b.controller && b.controller.isPlayer ? ['左鍵', '右鍵', 'Q', 'E', 'R', 'F', 'C', 'V', 'G'] : null;
    skills.forEach((s, i) => {
      const sx = rtl ? x + PW - (i + 1) * (cw + gap) + gap : x + i * (cw + gap);
      const locked = (s.phase || 1) > b.phase || (s.maxPhase || 9) < b.phase, cd = Math.max(0, b.cds[s.id] || 0), max = (s.cd || 1) * b.cdMul;
      const active = b.inst && b.inst.skill === s;
      ctx.fillStyle = active ? hexA(b.def.color, 0.8) : locked ? 'rgba(40,40,40,0.8)' : 'rgba(255,255,255,0.12)';
      ctx.fillRect(sx, ky, cw, 22);
      if (cd > 0 && !locked) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(sx, ky, cw * U.clamp(cd / max, 0, 1), 22); }
      ctx.fillStyle = locked ? '#666' : active ? '#111' : '#eee';
      ctx.fillText((locked ? '🔒' : '') + (keys ? keys[i] + ' ' : '') + s.short, sx + cw / 2, ky + 15);
    });
    // 狀態列（位於技能列下方，仍在競技場上緣 y = R.OY 之上）
    R.drawStatusRow(ctx, b, rtl ? x + PW : x, ky + 26, rtl, PW);
  }
  function drawHUD(ctx, w, view, t) {
    for (const b of w.bosses) drawPanel(ctx, b, w, t);
    if (w.training && R.drawTrainingCenter) { R.drawTrainingCenter(ctx, w, t); return; }
    // 中央
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = `bold 40px ${FONT}`; ctx.fillStyle = '#fff';
    ctx.fillText('VS', R.W / 2, 62);
    const tm = Math.max(0, w.time - 0), mm = Math.floor(tm / 60), ss = Math.floor(tm % 60);
    ctx.font = `bold 22px ${FONT}`; ctx.fillStyle = '#ddd';
    ctx.fillText(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, R.W / 2, 98);
    ctx.font = `14px ${FONT}`; ctx.fillStyle = '#aaa';
    ctx.fillText(`速度 ×${w.speed}`, R.W / 2, 122);
    const pc = BD.PACES && BD.PACES[w.paceId];
    if (pc) {
      const heavy = w.paceId !== 'light';
      ctx.font = `12px ${FONT}`; ctx.fillStyle = heavy ? '#ffb070' : '#9fdcff';
      ctx.fillText(`節奏：${pc.name}`, R.W / 2, 140);
    }
    if (w.enrageOn) { ctx.fillStyle = `rgba(255,60,90,${0.7 + 0.3 * Math.sin(t * 6)})`; ctx.font = `bold 15px ${FONT}`; ctx.fillText(`狂暴 ×${w.enrage.toFixed(2)}`, R.W / 2, pc ? 160 : 144); }
  }
  function drawBanners(ctx, w) {
    const b = w.banners[w.banners.length - 1];
    if (w.intro > 0) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, R.VH / 2 - 60, R.VW, 120);
      ctx.font = `bold 56px ${FONT}`; ctx.fillStyle = '#fff';
      ctx.fillText(`${w.bosses[0].name}  對  ${w.bosses[1].name}`, R.VW / 2, R.VH / 2 - 8);
      ctx.font = `20px ${FONT}`; ctx.fillStyle = '#ccc'; ctx.fillText('準備…', R.VW / 2, R.VH / 2 + 38);
    }
    if (!b) return;
    const k = b.life / b.max, a = Math.min(1, k * 4, (1 - k) * 8);
    ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const y = R.VH * 0.2;
    // 橫幅面板漸層參數固定，以 R.grad 備忘
    const g = R.grad(ctx, 'banner:' + R.VW, (c) => {
      const lg = c.createLinearGradient(0, 0, R.VW, 0); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.5, 'rgba(0,0,0,0.7)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); return lg;
    });
    ctx.fillStyle = g; ctx.fillRect(0, y - 50, R.VW, b.sub ? 110 : 90);
    ctx.font = `bold ${Math.round(50 + (1 - Math.min(1, (1 - k) * 6)) * 20)}px ${FONT}`;
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.strokeText(b.text, R.VW / 2, y);
    ctx.fillStyle = b.color; ctx.fillText(b.text, R.VW / 2, y);
    if (b.sub) { ctx.font = `22px ${FONT}`; ctx.fillStyle = '#eee'; ctx.fillText(b.sub, R.VW / 2, y + 42); }
    ctx.globalAlpha = 1;
  }
  function drawLog(ctx, w, view) {
    if (!view.showLog) return;
    const n = 7, items = w.logs.slice(-n);
    const x = 12, y0 = R.VH - 12 - n * 20 - (w.training ? 150 : 0);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x - 6, y0 - 22, 470, n * 20 + 26);
    ctx.font = `bold 13px ${FONT}`; ctx.fillStyle = '#aaa'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('戰鬥紀錄（L 切換）', x, y0 - 6);
    ctx.font = `14px ${FONT}`;
    items.forEach((l, i) => {
      const yy = y0 + 14 + i * 20, mm = Math.floor(l.t / 60), ss = Math.floor(l.t % 60);
      ctx.fillStyle = '#888'; ctx.fillText(`${mm}:${String(ss).padStart(2, '0')}`, x, yy);
      ctx.fillStyle = l.color; ctx.fillText(l.who, x + 42, yy);
      const ww = ctx.measureText(l.who).width;
      ctx.fillStyle = l.important ? '#ffe9a8' : '#ddd'; ctx.fillText(l.text, x + 48 + ww, yy);
    });
  }

  const shakeOut = { x: 0, y: 0 };
  // 鏡頭：平滑跟著雙方 Boss 的中點，夾在競技場內；換場（新 World）時直接定位。純繪圖狀態，滑鼠世界座標由 input.js 讀 R.cam
  function followCamera(w, t) {
    const A = BD.ARENA, c = R.cam, [a, b] = w.bosses;
    const tx = U.clamp((a.x + b.x) / 2 - R.VW / 2, 0, A.w - R.VW), ty = U.clamp((a.y + b.y) / 2 - R.VH / 2, 0, A.h - R.VH);
    if (c.w !== w) { c.w = w; c.x = tx; c.y = ty; } else { const k = Math.min(1, Math.max(0, t - c.t) * 5); c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; }
    c.t = t;
    return c;
  }
  R.render = function (ctx, w, view) {
    const t = performance.now() / 1000;
    if (R.cacheBeginFrame) R.cacheBeginFrame();
    ctx.save();
    ctx.fillStyle = '#08070b'; ctx.fillRect(0, 0, R.W, R.H);
    const sh = w.fx.shakeOffset(shakeOut);
    ctx.save();
    ctx.translate(R.OX + sh.x, R.OY + sh.y);
    // 世界繪圖：裁切在競技場視窗（含邊框 34px）內，並套用鏡頭位移
    const cam = followCamera(w, t);
    ctx.save(); ctx.beginPath(); ctx.rect(-34, -34, R.VW + 68, R.VH + 68); ctx.clip();
    ctx.translate(-cam.x, -cam.y);
    drawArena(ctx, w, t);
    drawReflections(ctx, w, t);
    drawWheat(ctx, w, t);
    drawZones(ctx, w, t);
    drawTraps(ctx, w, t);
    drawVeil(ctx, w, 0, 0, BD.ARENA.w, BD.ARENA.h);
    if (!R.hideTele) drawTelegraphs(ctx, w, t);
    drawPillars(ctx);
    drawMinions(ctx, w, t);
    // 沉重打擊的凍結幀：Boss 位置做極短抖動（純視覺，不動世界狀態）
    const frz = w.freezeF > 0;
    const jx = frz ? (BD.vrng() - 0.5) * 3 : 0, jy = frz ? (BD.vrng() - 0.5) * 3 : 0;
    // 殘影（衝刺 / 疾奔）畫在 Boss 之前，讓本體清楚壓在殘影上
    drawGhosts(ctx, w, t);
    // 貼地特效（震波、光環、大光暈）畫在 Boss 底下，Boss 本體在大招中仍看得清楚
    drawFx(ctx, w, 'ground');
    const order = w.bosses.slice().sort((a, b) => a.y - b.y);
    for (const b of order) {
      if (!frz) { drawBoss(ctx, b, t); continue; }
      ctx.save(); ctx.translate(jx, jy); drawBoss(ctx, b, t); ctx.restore();
    }
    drawProjectiles(ctx, w, t);
    drawLobs(ctx, w, t);
    drawFx(ctx, w, 'air');
    // F6 AI 偵錯覆蓋層：在震動位移內以競技場座標繪製
    if (R.aiDebug && R.drawAIDebug) R.drawAIDebug(ctx, w, t);
    drawTexts(ctx, w);
    if (view.player != null) {
      const m = view.mouse; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(m.x, m.y, 10, 0, U.TAU); ctx.moveTo(m.x - 15, m.y); ctx.lineTo(m.x + 15, m.y); ctx.moveTo(m.x, m.y - 15); ctx.lineTo(m.x, m.y + 15); ctx.stroke();
    }
    ctx.restore();
    drawBanners(ctx, w);
    drawLog(ctx, w, view);
    ctx.restore();
    if (w.fx.flashA > 0) { ctx.globalAlpha = w.fx.flashA * 0.6; ctx.fillStyle = w.fx.flashC; ctx.fillRect(0, 0, R.W, R.H); ctx.globalAlpha = 1; }
    drawHUD(ctx, w, view, t);
    // 底部提示
    ctx.font = `13px ${FONT}`; ctx.fillStyle = '#777'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    if (w.training) {
      const tr = w.training;
      const hint = 'F2 切換操控 · Shift+1~9 施放技能 · Shift+0 大招 · 點擊場地放置假人 · 1/2/3/4/5 速度 ×1/×2/×3/×0.5/×0.25 · P 暫停 · T 預警框 · F6 AI · F9 重置 · Esc 選單';
      const player = tr.mode === 'player';
      ctx.font = `${player ? 12 : 13}px ${FONT}`;
      ctx.fillText((player ? 'WASD 移動 · 滑鼠瞄準 · 左/右鍵 Q E R F C V G 技能 · X 大招 · 空白鍵 翻滾 · ' + hint : hint), R.W - 50, R.H - 6);
    } else {
      ctx.fillText(w.hunt ? 'WASD 移動 · 滑鼠瞄準 · 左/右鍵 Q E R F 技能 · X 大招 · 空白鍵 翻滾 · 1 生命藥水 · 2 法力藥水 · P 暫停 · Esc 回據點'
        : view.player != null
        ? 'WASD 移動 · 滑鼠瞄準 · 左/右鍵 Q E R F C V G 技能 · X 大招 · 空白鍵 翻滾 · P 暫停 · Esc 選單'
        : '1/2/3/4 切換速度 ×1/×2/×3/×0.5 · P 暫停 · L 戰鬥紀錄 · Esc 回選單 · F3 效能 · F4 快取 · F6 AI', R.W - 50, R.H - 6);
    }
    if (w.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, R.W, R.H);
      ctx.font = `bold 60px ${FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('暫停', R.W / 2, R.H / 2);
      ctx.font = `20px ${FONT}`; ctx.fillText('按 P 繼續', R.W / 2, R.H / 2 + 44);
    }
    if (R.perf) {
      if (R.perf.show) R.perf.draw(ctx, w);
      R.perf.drawNotice(ctx);
    }
    ctx.restore();
  };

  R.portrait = function (canvas, def) {
    const ctx = canvas.getContext('2d'), s = canvas.width;
    ctx.clearRect(0, 0, s, s);
    // 選角肖像只在建立時繪製，無須快取
    const g = ctx.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2);
    g.addColorStop(0, hexA(def.color, 0.35)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    const r = s * 0.2 * (def.radius / 32);
    R.drawBossBody(ctx, { x: s / 2 - r * 0.2, y: s / 2, face: -Math.PI / 4, r, def, phase: 1, state: 'idle' }, performance.now() / 1000);
  };
})(typeof window !== 'undefined' ? window : globalThis);
