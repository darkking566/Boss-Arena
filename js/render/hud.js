'use strict';
// HUD 與整體繪製流程：雙方面板、計時、橫幅、戰鬥紀錄、R.render 主繪製、選角肖像
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA, TEAM = R.TEAM, FONT = R.FONT;
  const { arena: drawArena, lights: drawLights, zones: drawZones, traps: drawTraps, telegraphs: drawTelegraphs, pillars: drawPillars, reflections: drawReflections, wheat: drawWheat,
    minions: drawMinions, boss: drawBoss, ghosts: drawGhosts, projectiles: drawProjectiles, lobs: drawLobs, fx: drawFx, texts: drawTexts, veil: drawVeil } = R.draw;
  // ─────────────────────── HUD ───────────────────────
  function bar(ctx, x, y, w, h, frac, color, bg, rtl, trail) {
    ctx.fillStyle = bg || 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, w, h);
    const fw = w * U.clamp(frac, 0, 1);
    if (trail != null) { const tw = w * U.clamp(trail, 0, 1); ctx.fillStyle = 'rgba(255,240,220,0.8)'; ctx.fillRect(rtl ? x + w - tw : x, y, tw, h); }
    ctx.fillStyle = color; ctx.fillRect(rtl ? x + w - fw : x, y, fw, h);
  }
  function drawSkills(ctx, b, x, ky, PW, rtl) {
    const skills = b.skills, cw = 54, gap = 6;
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
  }
  // 團隊戰：每隊三行精簡面板（名字 / 階段 / HP / 架勢 / 大招），倒下的變暗
  function drawTeamPanel(ctx, w, team, t) {
    const rtl = team === 1, PW = 640, x = rtl ? R.W - 40 - PW : 40, y = 14, RH = 51;
    const list = w.bosses.filter((b) => b.team === team), al = rtl ? 'right' : 'left', ex = rtl ? x + PW : x;
    ctx.fillStyle = 'rgba(10,8,14,0.75)'; ctx.fillRect(x - 10, y - 6, PW + 20, 158);
    ctx.fillStyle = TEAM[team]; ctx.fillRect(rtl ? x + PW + 6 : x - 10, y - 6, 4, 158);
    list.forEach((b, i) => {
      const ry = y + i * RH, dead = b.state === 'dead';
      ctx.globalAlpha = dead ? 0.4 : 1;
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = al;
      ctx.font = `bold 18px ${FONT}`; ctx.fillStyle = b.def.color; ctx.fillText(b.name, ex, ry + 16);
      const nw = ctx.measureText(b.name).width;
      ctx.font = `13px ${FONT}`; ctx.fillStyle = '#bbb';
      const tag = dead ? '倒下' : (b.phase === 2 ? '第二階段' : '第一階段') + (b.controller && b.controller.isPlayer ? ' · 玩家' : '');
      ctx.fillText(tag, rtl ? ex - nw - 10 : ex + nw + 10, ry + 15);
      const hx = rtl ? x : x + 230, hw = PW - 230;
      bar(ctx, hx, ry + 2, hw, 16, b.hp / b.maxHp, b.phase === 2 ? b.def.color : TEAM[team], 'rgba(0,0,0,0.65)', rtl, b.hpTrail / b.maxHp);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(hx, ry + 2, hw, 16);
      ctx.font = `bold 12px ${FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = rtl ? 'right' : 'left';
      ctx.fillText(`${Math.ceil(b.hp)} / ${b.maxHp}`, rtl ? hx + hw - 6 : hx + 6, ry + 14);
      bar(ctx, x, ry + 22, PW / 2 - 6, 5, b.posture / b.maxPosture, b.posture / b.maxPosture > 0.75 ? '#ff8844' : '#f5c542', null, rtl);
      bar(ctx, x + PW / 2 + 6, ry + 22, PW / 2 - 6, 5, b.ult / 100, b.ult >= 100 ? `rgba(255,220,90,${0.6 + 0.4 * Math.sin(t * 8)})` : '#c8a0ff', null, rtl);
      ctx.globalAlpha = 1;
      if (!dead) R.drawStatusRow(ctx, b, rtl ? x + PW : x, ry + 30, rtl, PW);
    });
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
    const ky = uy + 18;
    drawSkills(ctx, b, x, ky, PW, rtl);
    // 狀態列（位於技能列下方，仍在競技場上緣 y = R.OY 之上）
    R.drawStatusRow(ctx, b, rtl ? x + PW : x, ky + 26, rtl, PW);
  }
  function drawHUD(ctx, w, view, t) {
    if (w.teamMode) {
      drawTeamPanel(ctx, w, 0, t); drawTeamPanel(ctx, w, 1, t);
      const p = view.player != null && w.bosses[view.player]; // 玩家的技能列畫在競技場下緣
      if (p && p.state !== 'dead') drawSkills(ctx, p, R.W / 2 - 300, R.OY + R.VH - 30, 600, false);
    } else for (const b of w.bosses) drawPanel(ctx, b, w, t);
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
      if (w.teamMode) {
        const names = (tm) => w.foes(1 - tm).map((b) => b.name).join('・');
        ctx.font = `bold 34px ${FONT}`; ctx.fillText(`${names(0)}  對  ${names(1)}`, R.VW / 2, R.VH / 2 - 8);
      } else ctx.fillText(`${w.bosses[0].name}  對  ${w.bosses[1].name}`, R.VW / 2, R.VH / 2 - 8);
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
  // 團隊戰：框住所有存活 Boss 的範圍，太散時鏡頭拉遠（c.z < 1，最遠 0.4 倍）讓每個人都在畫面內
  // 聚焦模式（view.focus，Tab 切換）：鏡頭只跟那一位，正常倍率；他倒下就回到全體視角
  function followCamera(w, t, view) {
    const A = BD.ARENA, c = R.cam, [a, b] = w.bosses, f = view.focus != null && w.bosses[view.focus];
    let mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, tz = 1;
    if (f && f.state !== 'dead') { mx = f.x; my = f.y; } else if (view.focus != null) view.focus = null;
    else if (w.teamMode) {
      const pts = w.bosses.filter((u) => u.state !== 'dead');
      if (pts.length) {
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const u of pts) { x0 = Math.min(x0, u.x); x1 = Math.max(x1, u.x); y0 = Math.min(y0, u.y); y1 = Math.max(y1, u.y); }
        mx = (x0 + x1) / 2; my = (y0 + y1) / 2;
        tz = U.clamp(Math.min(R.VW / (x1 - x0 + 420), R.VH / (y1 - y0 + 360)), 0.4, 1); // 邊距：Boss 身形與招式範圍
      }
    }
    const k = c.w !== w ? 1 : Math.min(1, Math.max(0, t - c.t) * 5);
    c.z += (tz - c.z) * k * 0.6;
    const vw = R.VW / c.z, vh = R.VH / c.z, m = R.VH * 0.085 * lbox.k / c.z; // 大招黑邊期間鏡頭可多越出上下牆一條黑邊高，貼牆的角色不被遮住
    const tx = U.clamp(mx - vw / 2, 0, A.w - vw), ty = U.clamp(my - vh / 2, -m, A.h - vh + m);
    if (c.w !== w) { c.w = w; c.z = tz; c.x = U.clamp(mx - R.VW / tz / 2, 0, A.w - R.VW / tz); c.y = U.clamp(my - R.VH / tz / 2, 0, A.h - R.VH / tz); } else { c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; }
    c.t = t;
    return c;
  }
  // 色調 + 暗角（fx.grade）：淡入 0.15 秒、最後 40% 淡出；暗角漸層全程共用一個快取
  function drawGrade(ctx, w) {
    const gs = w.fx.grades;
    for (const g of gs) {
      const a = g.a * Math.min(1, (g.max - g.life) / 0.15, g.life / (g.max * 0.4));
      if (a <= 0) continue;
      ctx.globalAlpha = a * 0.22; ctx.fillStyle = g.color; ctx.fillRect(0, 0, R.VW, R.VH);
      ctx.globalAlpha = a; ctx.fillStyle = R.grad(ctx, 'gradevig', (c) => {
        const v = c.createRadialGradient(R.VW / 2, R.VH / 2, R.VH * 0.35, R.VW / 2, R.VH / 2, R.VW * 0.62);
        v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.7)'); return v;
      });
      ctx.fillRect(0, 0, R.VW, R.VH);
    }
    ctx.globalAlpha = 1;
  }
  // 大招黑邊：任一方施放大招期間，上下黑邊滑入（電影鏡頭感）；k 只是繪圖狀態，依真實時間緩動
  const lbox = { k: 0, t: 0 };
  function drawLetterbox(ctx, w, t) {
    const on = w.bosses.some((b) => b.state === 'skill' && b.inst && b.inst.skill.ult);
    const dt = Math.min(0.1, Math.max(0, t - lbox.t)); lbox.t = t;
    lbox.k = U.clamp(lbox.k + (on ? dt / 0.25 : -dt / 0.4), 0, 1);
    if (lbox.k <= 0) return;
    const e = lbox.k * lbox.k * (3 - 2 * lbox.k), bh = R.VH * 0.085 * e;
    ctx.fillStyle = '#000'; ctx.fillRect(-34, -34, R.VW + 68, bh + 34); ctx.fillRect(-34, R.VH - bh, R.VW + 68, bh + 34);
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
    const cam = followCamera(w, t, view);
    ctx.save(); ctx.beginPath(); ctx.rect(-34, -34, R.VW + 68, R.VH + 68); ctx.clip();
    // 鏡頭縮放（衝擊 punch / 大招與擊殺的推近）：以事件位置為中心，只縮世界，HUD 不動
    const Z = R.zoom, zn = w.fx.zoomNow();
    Z.z = zn; Z.fx = w.fx.zx == null ? R.VW / 2 : U.clamp((w.fx.zx - cam.x) * cam.z, 0, R.VW); Z.fy = w.fx.zy == null ? R.VH / 2 : U.clamp((w.fx.zy - cam.y) * cam.z, 0, R.VH);
    if (zn !== 1) { ctx.translate(Z.fx, Z.fy); ctx.scale(zn, zn); ctx.translate(-Z.fx, -Z.fy); }
    if (cam.z !== 1) ctx.scale(cam.z, cam.z); // 團隊戰拉遠
    ctx.translate(-cam.x, -cam.y);
    drawArena(ctx, w, t);
    drawLights(ctx, w);
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
    // 造型的 over：畫在空中特效（煙塵）之上的部分，例如鏡爪的靈狼不會被沙塵蓋掉
    for (const b of order) { const st = R.bossStyle(b.def.style); if (st.over) st.over(ctx, b, t); }
    // F6 AI 偵錯覆蓋層：在震動位移內以競技場座標繪製
    if (R.aiDebug && R.drawAIDebug) R.drawAIDebug(ctx, w, t);
    drawTexts(ctx, w);
    if (view.focus != null) {
      const f = w.bosses[view.focus]; ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 18, 0, U.TAU); ctx.stroke(); ctx.restore();
    }
    if (view.player != null) {
      const m = view.mouse; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(m.x, m.y, 10, 0, U.TAU); ctx.moveTo(m.x - 15, m.y); ctx.lineTo(m.x + 15, m.y); ctx.moveTo(m.x, m.y - 15); ctx.lineTo(m.x, m.y + 15); ctx.stroke();
    }
    ctx.restore();
    drawGrade(ctx, w);
    drawLetterbox(ctx, w, t);
    drawBanners(ctx, w);
    drawLog(ctx, w, view);
    if (view.focus != null) {
      const f = w.bosses[view.focus], s = `◎ 聚焦：${f.name}　（Tab 切換 / 回到全體）`;
      ctx.font = `bold 16px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(s).width + 28; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(R.VW / 2 - tw / 2, 10, tw, 28);
      ctx.fillStyle = f.def.color; ctx.fillText(s, R.VW / 2, 25);
    }
    ctx.restore();
    // 全螢幕閃光壓低上限（最多 22%），避免整片閃白刺眼
    if (w.fx.flashA > 0) { ctx.globalAlpha = Math.min(0.22, w.fx.flashA * 0.35); ctx.fillStyle = w.fx.flashC; ctx.fillRect(0, 0, R.W, R.H); ctx.globalAlpha = 1; }
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
        : '1/2/3/4 切換速度 ×1/×2/×3/×0.5 · Tab 聚焦 · P 暫停 · L 戰鬥紀錄 · Esc 回選單 · F3 效能 · F4 快取 · F6 AI', R.W - 50, R.H - 6);
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
