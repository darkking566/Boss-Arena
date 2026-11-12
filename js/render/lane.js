'use strict';
// 拉鋸戰繪圖（js/engine/lane.js）：自由鏡頭（R.laneView，lane-ui.js 改它）、兵線地面與空建築格、核心 / 建築 / Boss 頭上血條、頂部雙方經濟 HUD。純繪圖。
(function (G) {
  const BD = G.BD, R = BD.Render, U = BD.U, FONT = R.FONT, hexA = R.hexA;
  const SIDE = ['藍方', '紅方'];
  // padY：底部面板疊在畫布上時（桌機）鏡頭往下偏多少；觸控版面板在畫布外，lane-ui.js 設成 0
  const LV = R.laneView = { w: null, x: 0, z: 0.38, tx: 0, tz: 0.38, padY: 40 };
  // 全覽倍率：整條兵線（含兩端基地約 4000）塞進視窗寬；手機直向畫布只有 900 寬，所以會比桌機的 0.38 更遠
  R.laneFitZ = () => U.clamp(R.VW / 4000, 0.18, 0.38);
  R.laneOverview = (w) => { const L = w.lane; LV.tx = (L.home[0].x + L.home[1].x) / 2; LV.tz = R.laneFitZ(); };

  // 鏡頭：只沿兵線左右移動與縮放，y 固定在兵線中央；換場時回到全覽
  R.laneCam = function (w, t, c) {
    const A = BD.ARENA, L = w.lane;
    if (LV.w !== w) { LV.w = w; R.laneOverview(w); LV.x = LV.tx; LV.z = LV.tz; }
    LV.tz = U.clamp(LV.tz, R.laneFitZ() * 0.9, 1);
    LV.tx = U.clamp(LV.tx, L.home[0].x - 300, L.home[1].x + 300);
    const k = c.w !== w ? 1 : Math.min(1, Math.max(0, t - c.t) * 10);
    LV.x += (LV.tx - LV.x) * k; LV.z += (LV.tz - LV.z) * k;
    c.w = w; c.t = t; c.z = LV.z;
    const vw = R.VW / c.z, vh = R.VH / c.z;
    c.x = U.clamp(LV.x - vw / 2, 0, A.w - vw); c.y = U.clamp(L.home[0].y - vh / 2 + LV.padY / c.z, 0, A.h - vh); // 稍微往下偏，讓底部建築面板不擋兵線
    return c;
  };

  // 地面：兵線道路、雙方基地範圍、空建築格（虛線框）
  R.drawLaneGround = function (ctx, w) {
    const L = w.lane, [a, b] = L.home;
    ctx.fillStyle = 'rgba(40,30,20,0.28)'; ctx.fillRect(a.x, a.y - 70, b.x - a.x, 140);
    ctx.strokeStyle = 'rgba(255,240,200,0.12)'; ctx.lineWidth = 3; ctx.setLineDash([30, 24]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
    for (const team of [0, 1]) {
      const h = L.home[team], dir = team ? -1 : 1;
      ctx.fillStyle = hexA(R.TEAM[team], 0.08);
      ctx.fillRect(Math.min(h.x - dir * 120, h.x + dir * 450), h.y - 370, 570, 740);
      if (L.ai[team]) continue; // 只替玩家方畫空格
      ctx.strokeStyle = hexA(R.TEAM[team], 0.35); ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      L.slots[team].forEach((m, i) => { if (m) return; const [x, y] = BD.laneSlotPos(L, team, i); ctx.strokeRect(x - 28, y - 28, 56, 56); });
      ctx.setLineDash([]);
    }
  };

  function bar(ctx, x, y, wd, h, k, col) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x - wd / 2 - 1, y - 1, wd + 2, h + 2);
    ctx.fillStyle = col; ctx.fillRect(x - wd / 2, y, wd * U.clamp(k, 0, 1), h);
  }
  // 世界上的標示：核心 / 建築血條與名字、召喚 Boss 的血條與名字（字級依鏡頭縮放反向放大，遠看也讀得到）
  R.drawLaneWorld = function (ctx, w) {
    const L = w.lane, s = 1 / (R.cam.z || 1), UN = BD.LANE_UNITS;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for (const m of w.minions) {
      if (!m.alive || !m.laneUnit) continue;
      const g = UN[m.kind];
      if (!g.static) { if (m.hp < m.maxHp) bar(ctx, m.x, m.y - m.r - 6 * s, m.r * 2, 3 * s, m.hp / m.maxHp, R.TEAM[m.team]); continue; }
      const core = m.kind === 'lanecore', wd = core ? 160 : 70;
      bar(ctx, m.x, m.y - m.r - 12 * s, wd, (core ? 9 : 5) * s, m.hp / m.maxHp, R.TEAM[m.team]);
      ctx.font = `bold ${Math.round((core ? 16 : 12) * s)}px ${FONT}`; ctx.fillStyle = '#fff';
      ctx.fillText(core ? `${SIDE[m.team]}核心` : g.name, m.x, m.y - m.r - 15 * s);
    }
    for (const b of L.summoned) {
      if (b.state === 'dead') continue;
      bar(ctx, b.x, b.y - b.r - 16 * s, 110, 7 * s, b.hp / b.maxHp, R.TEAM[b.team]);
      ctx.font = `bold ${Math.round(14 * s)}px ${FONT}`; ctx.fillStyle = R.TEAM[b.team]; // 用隊伍色，免得紅色系 Boss 在藍方看起來像敵人
      ctx.fillText(b.name, b.x, b.y - b.r - 20 * s);
    }
  };

  // 頂部 HUD：雙方金錢 / 收入 / 下次發錢、核心血量、建築數、在場 Boss；中央計時
  // 手機直向（R.vertical，畫布 900 寬）：雙欄大字版，計時在兩欄下方；高度 R.LANE_VHUD_H（main.js 版面用）
  R.LANE_VHUD_H = 262;
  function drawVertical(ctx, w) {
    const L = w.lane, pw = (R.W - 30) / 2, pct = (b) => Math.ceil(b.hp / b.maxHp * 100);
    for (const team of [0, 1]) {
      const x0 = 10 + team * (pw + 10), col = R.TEAM[team], core = L.cores[team];
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x0, 8, pw, 200);
      ctx.strokeStyle = hexA(col, 0.75); ctx.lineWidth = 3; ctx.strokeRect(x0, 8, pw, 200);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = `bold 32px ${FONT}`; ctx.fillStyle = col; ctx.fillText(SIDE[team] + (L.ai[team] ? ' AI' : ' 你'), x0 + 14, 48);
      ctx.textAlign = 'right'; ctx.font = `bold 38px ${FONT}`; ctx.fillStyle = '#ffd36a'; ctx.fillText(`💰${Math.floor(L.gold[team])}`, x0 + pw - 12, 50);
      bar(ctx, x0 + pw / 2, 64, pw - 28, 20, core.hp / core.maxHp, col);
      ctx.textAlign = 'left'; ctx.font = `24px ${FONT}`; ctx.fillStyle = '#ddd';
      ctx.fillText(`收入 +${BD.laneIncome(w, team)} · 下次 ${Math.ceil(L.payIn)} 秒`, x0 + 14, 118);
      const built = L.slots[team].filter(Boolean), alt = built.filter((m) => m.kind === 'lb_altar').length;
      ctx.fillStyle = '#bbb'; ctx.fillText(`建築 ${built.length} · 祭壇 ${alt} · 擊殺 ${L.kills[team]}`, x0 + 14, 152);
      const bs = L.summoned.filter((b) => b.team === team && b.state !== 'dead');
      ctx.font = `bold 22px ${FONT}`; ctx.fillStyle = bs.length ? col : '#777';
      ctx.fillText(bs.length ? bs.map((b) => `${b.name} ${pct(b)}%`).join('、') : 'Boss：無', x0 + 14, 190, pw - 28);
    }
    const mm = Math.floor(w.time / 60), ss = Math.floor(w.time % 60);
    const s = `拉鋸 ${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')} · ×${w.speed}`;
    ctx.textAlign = 'center'; ctx.font = `bold 28px ${FONT}`; const tw = ctx.measureText(s).width + 32;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(R.W / 2 - tw / 2, 214, tw, 40); // 計時壓在場地邊框上，要有底色才讀得到
    ctx.fillStyle = '#ddd'; ctx.fillText(s, R.W / 2, 245);
  }
  R.drawLaneHUD = function (ctx, w, view, t) {
    if (R.vertical) { drawVertical(ctx, w); return; }
    const L = w.lane, E = BD.LANE_ECON, pw = 640;
    for (const team of [0, 1]) {
      const x0 = team ? R.W - 20 - pw : 20, col = R.TEAM[team], core = L.cores[team];
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x0, 10, pw, 152);
      ctx.strokeStyle = hexA(col, 0.7); ctx.lineWidth = 2; ctx.strokeRect(x0, 10, pw, 152);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = `bold 22px ${FONT}`; ctx.fillStyle = col;
      ctx.fillText(SIDE[team] + (L.ai[team] ? '（AI）' : '（你）'), x0 + 16, 40);
      ctx.font = `bold 30px ${FONT}`; ctx.fillStyle = '#ffd36a';
      ctx.fillText(`💰 ${Math.floor(L.gold[team])}`, x0 + 200, 42);
      ctx.font = `15px ${FONT}`; ctx.fillStyle = '#ddd';
      ctx.fillText(`收入 +${BD.laneIncome(w, team)}／${E.incomeT} 秒　下次 ${Math.ceil(L.payIn)} 秒`, x0 + 380, 38);
      ctx.fillText(`核心 ${Math.ceil(core.hp)} / ${core.maxHp}`, x0 + 16, 70);
      bar(ctx, x0 + 16 + (pw - 32) / 2, 78, pw - 32, 14, core.hp / core.maxHp, col);
      const built = L.slots[team].filter(Boolean), alt = built.filter((m) => m.kind === 'lb_altar').length;
      ctx.fillStyle = '#bbb'; ctx.font = `14px ${FONT}`;
      ctx.fillText(`建築 ${built.length}/${E.slots}　祭壇 ${alt}　擊殺 ${L.kills[team]}`, x0 + 16, 114);
      const bs = L.summoned.filter((b) => b.team === team && b.state !== 'dead');
      ctx.fillText('Boss：', x0 + 16, 142);
      if (!bs.length) { ctx.fillStyle = '#777'; ctx.fillText('（無）', x0 + 64, 142); }
      bs.forEach((b, i) => {
        const bx = x0 + 64 + i * 280;
        ctx.fillStyle = b.def.color; ctx.font = `bold 14px ${FONT}`; ctx.fillText(b.name, bx, 142);
        bar(ctx, bx + 190, 133, 80, 8, b.hp / b.maxHp, col);
      });
    }
    ctx.textAlign = 'center'; ctx.font = `bold 34px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText('拉鋸', R.W / 2, 56);
    const mm = Math.floor(w.time / 60), ss = Math.floor(w.time % 60);
    ctx.font = `bold 22px ${FONT}`; ctx.fillStyle = '#ddd'; ctx.fillText(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, R.W / 2, 92);
    ctx.font = `14px ${FONT}`; ctx.fillStyle = '#aaa'; ctx.fillText(`速度 ×${w.speed}`, R.W / 2, 118);
  };
})(typeof window !== 'undefined' ? window : globalThis);
