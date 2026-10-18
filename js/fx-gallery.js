'use strict';
// 特效圖鑑：瀏覽特效庫（BD.effects × BD.elements），每格以獨立的 FX 實例播放一次特效。
// 只使用全域 BD 與 BD.Render；與遊戲相同的特效系統與繪圖函式（R.draw.decals / ghosts / fx）。
(function (G) {
  const BD = G.BD, R = BD.Render, U = BD.U;
  if (!BD || !R || !R.draw) return;

  const CATS = BD.EFFECT_CATEGORIES.slice();
  const CAT_SPAWN = { '斬擊': 'caster', '突刺': 'caster', '位移': 'caster', '投射物': 'caster' };
  const PERIOD = 1.8, PERIOD_ULT = 2.6;
  const CW = 480, CH = 336;
  const shakeOut = { x: 0, y: 0 };

  const els = {
    grid: document.getElementById('gGrid'), legend: document.getElementById('gLegend'),
    el: document.getElementById('gElement'), scale: document.getElementById('gScale'), scaleVal: document.getElementById('gScaleVal'),
    size: document.getElementById('gSize'), heavy: document.getElementById('gHeavy'), loop: document.getElementById('gLoop'),
    replay: document.getElementById('gReplay'), cat: document.getElementById('gCat'), search: document.getElementById('gSearch'),
    count: document.getElementById('gCount'),
  };

  const ui = { el: 'physical', scale: 1, size: 'human', heavy: false, loop: true, cat: 'all', search: '' };

  // ── 地板（離屏 canvas，只畫一次）──
  const floorTile = (function () {
    const c = document.createElement('canvas'); c.width = CW; c.height = CH;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(CW * 0.45, CH * 0.4, 20, CW * 0.5, CH * 0.5, CW * 0.75);
    grad.addColorStop(0, '#2a2622'); grad.addColorStop(0.55, '#1a1716'); grad.addColorStop(1, '#100e0d');
    g.fillStyle = grad; g.fillRect(0, 0, CW, CH);
    // 石磚縫隙 + 淡格線
    g.strokeStyle = 'rgba(255,255,255,0.045)'; g.lineWidth = 1;
    for (let x = 0; x <= CW; x += 40) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, CH); g.stroke(); }
    for (let y = 0; y <= CH; y += 40) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(CW, y + 0.5); g.stroke(); }
    // 淡淡的石板色差
    for (let i = 0; i < 46; i++) {
      const x = BD.vrng() * CW, y = BD.vrng() * CH, w = 18 + BD.vrng() * 46, h = 14 + BD.vrng() * 34;
      g.fillStyle = BD.vrng() < 0.5 ? 'rgba(255,240,220,0.022)' : 'rgba(0,0,0,0.16)';
      g.fillRect(x, y, w, h);
    }
    // 邊角暗角
    const vg = g.createRadialGradient(CW / 2, CH / 2, CH * 0.35, CW / 2, CH / 2, CW * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = vg; g.fillRect(0, 0, CW, CH);
    return c;
  })();

  // ── 施放者定義（複製註冊的 Boss 定義並移除 fxEl，讓元素下拉決定）──
  function makeDummyDef(baseId) {
    const src = BD.bossById[baseId] || BD.bosses[0];
    const def = Object.assign({}, src);
    delete def.fxEl;
    if (def.phase2) { def.phase2 = Object.assign({}, def.phase2); delete def.phase2.fxEl; }
    return def;
  }
  const DEFS = { human: makeDummyDef('ronin'), giant: makeDummyDef('magmus') };
  const DUMMY_X = 150, DUMMY_Y = CH / 2;

  const cells = [];
  const errors = [];
  const seen = [];

  function makeCell(id) {
    const eff = BD.effects[id];
    const cat = eff.category;
    const el = document.createElement('div');
    el.className = 'g-cell';
    el.title = eff.desc || '';
    const canvas = document.createElement('canvas');
    canvas.width = 300; canvas.height = 210;
    el.appendChild(canvas);
    const row = document.createElement('div'); row.className = 'g-row';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = eff.name;
    const idEl = document.createElement('span'); idEl.className = 'id'; idEl.textContent = id;
    const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = cat;
    row.appendChild(nm); row.appendChild(idEl); row.appendChild(tag);
    const desc = document.createElement('div'); desc.className = 'g-desc'; desc.textContent = eff.desc || ''; desc.title = eff.desc || '';
    el.appendChild(row); el.appendChild(desc);

    const ctx = canvas.getContext('2d');
    const cell = {
      id, cat, eff, el, canvas, ctx, visible: false,
      dpr: 1, cw: 0, ch: 0,
      world: { fx: new BD.FX(null), pace: null },
      dummy: null,
      next: 0, spawns: 0, frames: 0, everSpawned: false, loopIdx: 0, dashP: -1,
      pts: [], target: null, aim: 0,
    };
    el.addEventListener('click', () => replay(cell));
    cells.push(cell);
    return cell;
  }

  function makeDummy(cell) {
    const def = DEFS[ui.size];
    return { x: DUMMY_X, y: DUMMY_Y, r: ui.size === 'giant' ? 58 : 24, face: 0, phase: 1, def, statuses: [], vx: 0, vy: 0 };
  }

  // 平移特效與殘影（讓鏡頭跟著衝刺單位移動）
  function shiftFx(fx, dx) {
    if (!dx) return;
    const arrs = [fx.parts, fx.rings, fx.slashes, fx.beams, fx.texts, fx.decals, fx.pillars, fx.glows, fx.shocks, fx.streaks, fx.ghosts, fx.chunks, fx.scars, fx.puffs, fx.stalks, fx.prints, fx.gusts];
    for (const arr of arrs) for (const o of arr) o.x += dx;
    for (const g of fx.glows) if (g.follow && g.follow.x != null) g.follow.x += dx;
  }

  function replay(cell) {
    const id = cell.id, cat = cell.cat;
    const cellWorld = cell.world;
    const heavy = !!cellWorld.pace;
    const dummy = makeDummy(cell);
    cell.dummy = dummy;
    const caster = CAT_SPAWN[cat] === 'caster';
    const x = caster ? DUMMY_X : CW / 2, y = caster ? DUMMY_Y : CH / 2;
    const toX = x + 160, toY = y;
    cell.target = { x: toX, y: toY };
    cell.dashP = -1; cell.aim = 0;
    if (id === 'dash' || id === 'slashline') { dummy.x = x; cell.dashP = 0; }
    const pts = [];
    for (let i = 0; i < 20; i++) { pts.push(4 + BD.vrng() * (CW - 8), 4 + BD.vrng() * (CH - 8)); }
    cell.pts = pts;
    cell.frames = 0;
    const opts = {
      src: dummy, el: ui.el, scale: ui.scale, angle: 0, arc: 1.6, radius: 110, r0: 40, len: 260, width: 44,
      dur: 0.35, life: 0.9, dmg: 90, big: true, heavyHit: heavy, victim: dummy, toX, toY, pts,
    };
    try {
      BD.spawnFx(cellWorld, id, x, y, opts);
    } catch (e) { report(e, id, 'spawn'); }
    if (id === 'blink') dummy.x = toX, dummy.y = toY;
    cell.spawns++;
    cell.everSpawned = true;
    cell.next = 0;
  }

  function report(e, id, where) {
    const msg = `[${id}] ${where}: ${e && e.message ? e.message : e}`;
    errors.push(msg);
    if (typeof console !== 'undefined') console.error(msg, e);
  }

  function resize(cell) {
    const r = cell.canvas.getBoundingClientRect();
    const dpr = (G.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (cell.cw !== w || cell.ch !== h || cell.dpr !== dpr) {
      cell.cw = w; cell.ch = h; cell.dpr = dpr;
      cell.canvas.width = w; cell.canvas.height = h;
    }
  }

  function step(cell, dt, t) {
    const dpr = cell.dpr || 1;
    const scale = cell.cw / CW;
    const dummy = cell.dummy, fx = cell.world.fx;
    // 位移特效：dash / slashline 於 dur 內由左移到右
    if (dummy && cell.dashP >= 0 && cell.dashP < 1) {
      const dur = 0.35;
      cell.dashP = Math.min(1, cell.dashP + dt / dur);
      const nx = DUMMY_X + (cell.target.x - DUMMY_X) * cell.dashP;
      const dx = nx - dummy.x;
      dummy.x = nx;
      try { shiftFx(fx, dx); } catch (e) { report(e, cell.id, 'shift'); }
    }
    cell.frames++;
    try {
      fx.update(dt); fx.realUpdate(dt);
      // 鏡頭（僅 dash / slashline）：固定左段視野，向右捲動追隨
      if (dummy && cell.dashP >= 0 && cell.dashP < 1) cell.aim = Math.max(0, dummy.x - DUMMY_X - 48);
    } catch (e) { report(e, cell.id, 'update'); }

    const ctx = cell.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0b0a0e'; ctx.fillRect(0, 0, cell.cw, cell.ch);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.save();
    try {
      if (fx.shakeV > 0.05) { const sh = fx.shakeOffset(shakeOut); ctx.translate(sh.x, sh.y); }
      ctx.translate(-cell.aim, 0);
      ctx.drawImage(floorTile, 0, 0);
      R.draw.decals(ctx, cell.world);
      R.draw.veil(ctx, cell.world, cell.aim, 0, CW, CH);
      R.draw.ghosts(ctx, cell.world, t);
      R.draw.fx(ctx, cell.world, 'ground');
      if (dummy && !(cell.cat === '位移' && dummy.x >= cell.target.x)) {
        ctx.save(); ctx.globalAlpha = 0.5;
        R.drawBossBody(ctx, dummy, t);
        ctx.restore();
      }
      R.draw.fx(ctx, cell.world, 'air');
    } catch (e) { report(e, cell.id, 'draw'); }
    // 格子範圍內的畫面閃光
    if (fx.flashA > 0.01) {
      ctx.globalAlpha = Math.min(0.9, fx.flashA * 0.6);
      ctx.fillStyle = fx.flashC; ctx.fillRect(cell.aim, 0, CW, CH);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  const pass = [];
  for (const cat of CATS) for (const id in BD.effects) if (BD.effects[id].category === cat) pass.push(id);
  for (const id in BD.effects) if (pass.indexOf(id) < 0) pass.push(id);

  const observers = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const c = cells.find((x) => x.el === e.target);
      if (c) c.visible = e.isIntersecting;
    }
  }, { rootMargin: '120px 0px' });

  // ── 工具列 ──
  function fillCategories() {
    els.cat.innerHTML = '';
    const all = document.createElement('option'); all.value = 'all'; all.textContent = '全部'; els.cat.appendChild(all);
    for (const cat of CATS) {
      const o = document.createElement('option'); o.value = cat; o.textContent = cat; els.cat.appendChild(o);
    }
  }
  function fillElements() {
    els.el.innerHTML = '';
    for (const id in BD.elements) {
      const o = document.createElement('option'); o.value = id; o.textContent = `${BD.elements[id].name} (${id})`; els.el.appendChild(o);
    }
    els.el.value = ui.el;
  }
  function fillLegend() {
    els.legend.innerHTML = '';
    for (const id in BD.elements) {
      const E = BD.elements[id];
      const wrap = document.createElement('span'); wrap.className = 'g-el';
      const sw = document.createElement('span'); sw.className = 'sw';
      for (const c of [E.core, E.glow, E.particle]) { const i = document.createElement('i'); i.style.background = c; sw.appendChild(i); }
      const nm = document.createElement('b'); nm.textContent = `${E.name}（${id}）`;
      const ex = document.createElement('span'); ex.className = 'ex'; ex.textContent = E.extra ? `粒子：${E.extra}` : '無額外粒子';
      wrap.appendChild(sw); wrap.appendChild(nm); wrap.appendChild(ex);
      els.legend.appendChild(wrap);
    }
  }
  function matches(cell) {
    if (ui.cat !== 'all' && cell.cat !== ui.cat) return false;
    const q = ui.search.trim().toLowerCase();
    if (!q) return true;
    return cell.id.toLowerCase().indexOf(q) >= 0 || (cell.eff.name || '').toLowerCase().indexOf(q) >= 0;
  }
  function applyFilter() {
    for (const c of cells) {
      const on = matches(c);
      c.el.style.display = on ? '' : 'none';
      if (!on) c.visible = false;
    }
  }
  function rebuild() {
    els.grid.innerHTML = '';
    cells.length = 0;
    observers.disconnect();
    for (const cat of CATS) {
      const ids = pass.filter((id) => BD.effects[id].category === cat);
      if (!ids.length) continue;
      const h = document.createElement('div'); h.className = 'g-cat'; h.textContent = `${cat}`;
      els.grid.appendChild(h);
      for (const id of ids) {
        const c = makeCell(id);
        els.grid.appendChild(c.el);
        observers.observe(c.el);
      }
    }
    // 不在分類清單中的特效（保險）
    for (const id of pass) if (!cells.some((c) => c.id === id)) { const c = makeCell(id); els.grid.appendChild(c.el); observers.observe(c.el); }
    applyFilter();
    els.count.textContent = `${cells.length} 種特效 · ${Object.keys(BD.elements).length} 種元素`;
    for (const c of cells) c.everSpawned = false;
  }
  function replayAll() {
    for (const c of cells) { c.world.fx = new BD.FX(null); c.world.pace = ui.heavy ? 'heavy' : null; replay(c); }
  }

  // ── 主迴圈（共用一個 rAF）──
  let last = 0;
  function tick(now) {
    const t = now / 1000;
    let dt = last ? (t - last) : 0.016;
    last = t;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    for (const c of cells) {
      if (!c.visible) continue;
      try {
        resize(c);
        if (ui.loop && (!c.everSpawned || c.next <= 0)) { replay(c); c.next = c.cat === '大招' ? PERIOD_ULT : PERIOD; }
        c.next -= dt;
        step(c, dt, t);
      } catch (e) { report(e, c.id, 'frame'); }
    }
    requestAnimationFrame(tick);
  }

  // 初始化
  fillCategories(); fillElements(); fillLegend(); rebuild();
  for (const c of cells) c.world.pace = ui.heavy ? 'heavy' : null;
  for (const c of cells) c.next = BD.vrng() * 0.5;

  els.el.addEventListener('change', () => { ui.el = els.el.value; replayAll(); });
  els.scale.addEventListener('input', () => {
    ui.scale = parseFloat(els.scale.value) || 1;
    els.scaleVal.textContent = '×' + ui.scale.toFixed(1);
    replayAll();
  });
  els.size.addEventListener('change', () => { ui.size = els.size.value; rebuild(); for (const c of cells) replay(c); });
  els.heavy.addEventListener('change', () => { ui.heavy = els.heavy.checked; replayAll(); });
  els.loop.addEventListener('change', () => { ui.loop = els.loop.checked; });
  els.replay.addEventListener('click', () => replayAll());
  els.cat.addEventListener('change', () => { ui.cat = els.cat.value; applyFilter(); });
  els.search.addEventListener('input', () => { ui.search = els.search.value; applyFilter(); });

  // 用於無頭測試：先重設時間軸，等下一幀真的更新特效
  function scheduleReplayAll(settle) {
    for (const c of cells) { c.world.fx = new BD.FX(null); c.world.pace = ui.heavy ? 'heavy' : null; c.next = 0; c.everSpawned = false; c.dashP = -1; c.aim = 0; }
    setTimeout(() => { for (const c of cells) if (c.visible) replay(c); }, settle == null ? 40 : Math.max(16, settle - 30));
  }

  G.__FXG = {
    get cells() { return cells.map((c) => ({ id: c.id, spawns: c.spawns, frames: c.frames || 0, visible: c.visible })); },
    errors,
    ready: true,
    get ui() { return ui; },
    setElement(id) { ui.el = id; els.el.value = id; for (const c of cells) c.everSpawned = false; scheduleReplayAll(); },
    setScale(v) { ui.scale = Math.max(0.5, Math.min(2.5, +v || 1)); els.scale.value = ui.scale; els.scaleVal.textContent = '×' + ui.scale.toFixed(1); for (const c of cells) c.everSpawned = false; scheduleReplayAll(); },
    replayAll() { scheduleReplayAll(0); },
  };
  requestAnimationFrame(tick);
})(typeof window !== 'undefined' ? window : globalThis);
