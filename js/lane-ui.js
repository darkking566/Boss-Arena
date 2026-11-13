'use strict';
// 拉鋸戰 DOM 面板（僅瀏覽器）：畫布底部的建築按鈕列 + Boss 召喚列，以及鏡頭操作（滾輪縮放、拖曳 / A D ← → 捲動、W S 縮放、空白鍵全覽）。
// 點自己的建築選取（R.laneView.sel），面板出現升級 / 拆除。只呼叫 BD.laneBuild / laneSummonBoss / laneUpgrade / laneSell（與 AI 指揮官同一組操作）；玩家永遠是藍方（team 0）。
(function (G) {
  const BD = G.BD, R = BD.Render;
  const TEAM = 0, PAN = 1400; // 鍵盤捲動速度（世界單位 / 秒，依縮放換算）
  let app = null, canvas = null, panel = null, cur = null, input = null, lastLayout = '', lastRun = 0, drag = null;
  const refs = { build: {} };

  function el(tag, cls, text) { const d = document.createElement(tag); if (cls) d.className = cls; if (text != null) d.textContent = text; return d; }
  const notice = (s) => { if (R.perf && R.perf.notice) R.perf.notice(s); };

  function layout() {
    if (!panel || !canvas) return;
    const r = canvas.getBoundingClientRect(), ar = app.getBoundingClientRect();
    if (!r.width) return;
    const touch = document.body.classList.contains('touch'), s = r.width / R.W, key = [r.left - ar.left, r.top - ar.top, r.width, touch].join(':');
    if (key === lastLayout) return;
    lastLayout = key;
    R.laneView.padY = touch ? 0 : 40;
    if (touch) { panel.style.left = panel.style.top = panel.style.transform = ''; return; } // 觸控：面板在畫布外（直向在下方、橫向在右欄），由 mobile.css 定位
    panel.style.left = (r.left - ar.left + R.OX * s) + 'px';
    panel.style.top = (r.top - ar.top + (R.OY + R.VH - 104) * s) + 'px';
    panel.style.transform = `scale(${s})`;
  }

  function build() {
    panel = el('div', 'tp lp hidden'); panel.id = 'lanePanel';
    const row1 = el('div', 'tp-row'), row2 = el('div', 'tp-row');
    panel.appendChild(row1); panel.appendChild(row2);
    const UN = BD.LANE_UNITS;
    for (const k of Object.keys(UN).filter((x) => UN[x].cost)) {
      const g = UN[k], b = el('button', 'lb');
      const tip = [g.spawn ? '每波生出 ' + Object.entries(g.spawn).map(([u, n]) => `${UN[u].name}×${n}`).join('、') : '',
        g.income ? `收入 +${g.income}` : '', g.dmg ? '自動射擊附近敵人' : '', k === 'lb_altar' ? '有一座就能召喚 Boss（數量不限），不能升級' : '',
        g.needs ? '需要先蓋' + UN[g.needs].name : '', `生命 ${g.hp}`].filter(Boolean).join(' · ');
      b.title = tip;
      b.appendChild(el('span', 'nm', g.name)); b.appendChild(el('span', 'cost', '💰' + g.cost));
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => { const w = cur; if (!w) return; const r = BD.laneBuild(w, TEAM, k); if (!r.ok) notice(`${g.name}：${r.why}`); b.blur(); });
      row1.appendChild(b); refs.build[k] = b;
    }
    refs.sel = el('select', 'bsel');
    for (const d of BD.bosses.slice().sort((a, b) => BD.laneBossCost(a) - BD.laneBossCost(b) || a.name.localeCompare(b.name))) {
      const o = el('option', '', `${d.name}　★${d.stars || 3}　💰${BD.laneBossCost(d)}`); o.value = d.id; refs.sel.appendChild(o);
    }
    refs.sel.addEventListener('keydown', (e) => e.stopPropagation()); // 選單裡打字不要觸發遊戲快速鍵
    refs.summon = el('button', 'lb summon', '召喚 Boss');
    refs.summon.addEventListener('mousedown', (e) => e.preventDefault());
    refs.summon.addEventListener('click', () => {
      const w = cur; if (!w) return; const id = refs.sel.value, r = BD.laneSummonBoss(w, TEAM, id);
      if (!r.ok) notice(`${BD.bossById[id].name}：${r.why}`);
    });
    refs.status = el('span', 'hint', '');
    row2.appendChild(el('span', 'grp', 'Boss')); row2.appendChild(refs.sel); row2.appendChild(refs.summon); row2.appendChild(refs.status);
    // 選取的建築：名字 / 等級 + 升級 + 拆除（沒選取時隱藏）
    refs.selBox = el('span', 'grp-wrap selbox hidden'); refs.selName = el('span', 'grp', '');
    refs.up = el('button', 'lb up', ''); refs.sell = el('button', 'lb sell', '');
    for (const [b, fn] of [[refs.up, BD.laneUpgrade], [refs.sell, BD.laneSell]]) {
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => {
        const w = cur, m = R.laneView.sel; if (!w || !m) return;
        const r = fn(w, TEAM, m); if (!r.ok) notice(`${BD.LANE_UNITS[m.kind].name}：${r.why}`);
        if (fn === BD.laneSell && r.ok) R.laneView.sel = null;
        lastRun = 0;
      });
    }
    refs.selBox.appendChild(refs.selName); refs.selBox.appendChild(refs.up); refs.selBox.appendChild(refs.sell);
    row2.appendChild(refs.selBox);
    panel.addEventListener('mousedown', (e) => e.stopPropagation());
    panel.addEventListener('wheel', (e) => e.stopPropagation());
    app.appendChild(panel);
  }

  const zoomBy = (f) => { R.laneView.tz *= f; };
  function update(w, dt) {
    if (!w || !w.lane || w !== cur) return;
    // 鍵盤捲動 / 縮放（按住）；面板隱藏（觀戰）時也能用
    const k = input && input.keys, LV = R.laneView, sp = PAN / LV.z * dt;
    if (k) {
      if (k.has('a') || k.has('ArrowLeft')) LV.tx -= sp;
      if (k.has('d') || k.has('ArrowRight')) LV.tx += sp;
      if (k.has('w') || k.has('ArrowUp')) zoomBy(1 + dt * 1.6);
      if (k.has('s') || k.has('ArrowDown')) zoomBy(1 / (1 + dt * 1.6));
    }
    if (!panel || panel.classList.contains('hidden')) return;
    layout();
    const now = performance.now(); if (now - lastRun < 120) return; lastRun = now;
    const L = w.lane;
    for (const kind in refs.build) {
      const r = BD.laneCanBuild(w, TEAM, kind), b = refs.build[kind];
      b.classList.toggle('off', !r.ok); b.dataset.why = r.ok ? '' : r.why;
    }
    const id = refs.sel.value, r = BD.laneCanSummon(w, TEAM, id);
    refs.summon.classList.toggle('off', !r.ok);
    refs.summon.textContent = `召喚（💰${BD.laneBossCost(BD.bossById[id])}）`;
    const alt = L.slots[TEAM].filter((m) => m && m.kind === 'lb_altar').length;
    const txt = `祭壇 ${alt}　在場 ${BD.laneBossesAlive(w, TEAM)}` + (r.ok ? '' : `　— ${r.why}`);
    if (refs.status.textContent !== txt) refs.status.textContent = txt;
    const m = R.laneView.sel;
    if (m && !m.alive) R.laneView.sel = null; // 被拆掉了
    refs.selBox.classList.toggle('hidden', !R.laneView.sel);
    if (R.laneView.sel) {
      const g = BD.LANE_UNITS[m.kind], ur = BD.laneCanUpgrade(w, TEAM, m), max = g.noUp || m.lv >= BD.LANE_ECON.maxLv;
      refs.selName.textContent = `已選：${g.name}${g.noUp ? '' : ' Lv' + m.lv}`;
      refs.up.textContent = max ? (g.noUp ? '不能升級' : '已滿級') : `升級 💰${BD.laneUpCost(m)}`;
      refs.up.classList.toggle('off', !ur.ok); refs.up.title = ur.ok ? '產出 × 等級、生命 +50%' : ur.why;
      refs.sell.textContent = `拆除 +${BD.laneSellValue(m)}`;
    }
  }

  function show(w) {
    cur = w || null; lastLayout = ''; R.laneView.sel = null;
    if (!panel) return;
    panel.classList.toggle('hidden', !cur || cur.lane.ai[TEAM]); // 雙方都是 AI（觀戰）時不給操作面板
    layout();
  }
  function hide() { cur = null; R.laneView.sel = null; if (panel) panel.classList.add('hidden'); }
  // 螢幕座標 → 世界座標（R.cam 是 render/lane.js 的 laneCam 算好的鏡頭），找半徑內自己的建築
  function pickBuilding(e) {
    const r = canvas.getBoundingClientRect(), c = R.cam; if (!r.width || !c) return null;
    const x = ((e.clientX - r.left) / r.width * R.W - R.OX) / c.z + c.x, y = ((e.clientY - r.top) / r.height * R.H - R.OY) / c.z + c.y;
    let best = null, bd = Infinity;
    for (const m of cur.lane.slots[TEAM]) if (m && m.alive) { const d = Math.hypot(m.x - x, m.y - y); if (d < m.r + 16 && d < bd) { bd = d; best = m; } }
    return best;
  }

  function create(a, c, inp) {
    app = a; canvas = c; input = inp;
    build();
    window.addEventListener('resize', layout);
    canvas.addEventListener('wheel', (e) => { if (!cur) return; e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
    // 指標（滑鼠 / 手指）：一指拖曳捲動、兩指捏合縮放、快速點兩下回全覽
    const pts = new Map(); let lastTap = 0;
    const span = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
    canvas.addEventListener('pointerdown', (e) => {
      if (!cur || (e.pointerType === 'mouse' && e.button !== 0)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) {
        drag = { x: e.clientX, y: e.clientY, tx: R.laneView.tx };
        const hit = cur.lane.ai[TEAM] ? null : pickBuilding(e); // 觀戰時不給選
        if (hit) { R.laneView.sel = hit; lastRun = 0; lastTap = 0; drag.picked = true; return; }
        const now = performance.now(); if (now - lastTap < 300) R.laneOverview(cur); lastTap = now;
      } else if (pts.size === 2) drag = { pinch: span(), tz: R.laneView.tz };
    });
    window.addEventListener('pointermove', (e) => {
      if (!cur || !pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = canvas.getBoundingClientRect(); if (!r.width || !drag) return;
      if (drag.pinch && pts.size >= 2) R.laneView.tz = drag.tz * span() / drag.pinch;
      else if (!drag.pinch) R.laneView.tx = drag.tx - (e.clientX - drag.x) / r.width * R.W / R.laneView.z;
    });
    const up = (e) => {
      if (drag && !drag.pinch && !drag.picked && pts.has(e.pointerId) && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) R.laneView.sel = null; // 點空地取消選取
      pts.delete(e.pointerId); drag = null; const p = [...pts.values()][0]; if (p) drag = { x: p.x, tx: R.laneView.tx }; }; // 放開一指後剩下那指接著拖
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', (e) => {
      if (!cur || e.key !== ' ') return;
      e.preventDefault(); R.laneOverview(cur);
    });
    return api;
  }
  const api = { create, show, hide, update, layout };
  BD.LaneUI = api;
})(typeof window !== 'undefined' ? window : globalThis);
