'use strict';
// 主程式：畫面切換、選角、遊戲迴圈、結算
(function (G) {
  const BD = G.BD, R = BD.Render;
  const $ = (s) => document.querySelector(s);
  const canvas = $('#game'), ctx = canvas.getContext('2d');
  const input = new BD.Input(canvas);
  const view = { showLog: true, player: null, mouse: input.mouse };
  const ids0 = BD.bosses.map((b) => b.id);
  const state = { screen: 'select', world: null, pick: [ids0.includes('magmus') ? 'magmus' : ids0[0], ids0.includes('ronin') ? 'ronin' : ids0[1] || ids0[0]], pace: BD.DEFAULT_PACE, map: BD.DEFAULT_MAP, last: null, errors: [], page: [0, 0], mode: 'duel' };
  G.__BD = state; // 測試掛勾

  // ── 畫布縮放 ──
  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight, s = Math.min(vw / R.W, vh / R.H);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.style.width = Math.floor(R.W * s) + 'px'; canvas.style.height = Math.floor(R.H * s) + 'px';
    canvas.width = Math.floor(R.W * s * dpr); canvas.height = Math.floor(R.H * s * dpr);
    const ns = s * dpr;
    if (ns !== state.scale && R.invalidateCaches) R.invalidateCaches(); // 倍率變更 → 精靈快取失效
    state.scale = ns;
  }
  window.addEventListener('resize', resize); resize();
  // DPR 變更（例如視窗拖到不同縮放比例的螢幕）：重新註冊媒體查詢並重設畫布
  function watchDPR() {
    const mq = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onChange = () => { resize(); watchDPR(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange, { once: true });
    else if (mq.addListener) mq.addListener(onChange);
  }
  watchDPR();

  // ── 選角畫面 ──
  // 卡片完全由註冊表（BD.bosses）產生；超過一頁（PER_PAGE）時自動分頁
  const PER_PAGE = 6;
  let portraits = [];
  function buildSelect() {
    portraits = [];
    const pages = Math.max(1, Math.ceil(BD.bosses.length / PER_PAGE));
    ['#sideA', '#sideB'].forEach((sel, side) => {
      const box = $(sel + ' .cards'); box.innerHTML = '';
      state.page[side] = Math.min(state.page[side], pages - 1);
      const list = BD.bosses.slice(state.page[side] * PER_PAGE, (state.page[side] + 1) * PER_PAGE);
      for (const def of list) {
        const c = document.createElement('div'); c.className = 'card'; c.dataset.id = def.id;
        c.innerHTML = `<canvas width="168" height="168"></canvas><div><div class="nm" style="color:${def.color}">${def.name}</div>
          <div class="tt">${def.title}</div><div class="ar">${def.archetype}</div>
          <div class="tt">HP ${def.maxHp}</div></div>`;
        c.addEventListener('click', () => { state.pick[side] = def.id; refreshSelect(); });
        c.addEventListener('mouseenter', () => showDetail(side, def.id));
        box.appendChild(c);
        portraits.push([c.querySelector('canvas'), def]);
      }
      let pager = $(sel + ' .pager');
      if (!pager) { pager = document.createElement('div'); pager.className = 'pager'; $(sel).appendChild(pager); }
      pager.classList.toggle('hidden', pages <= 1);
      pager.innerHTML = pages <= 1 ? '' : `<button data-d="-1">◀</button><span>${state.page[side] + 1} / ${pages}</span><button data-d="1">▶</button>`;
      pager.querySelectorAll('button').forEach((bt) => bt.addEventListener('click', () => {
        state.page[side] = (state.page[side] + +bt.dataset.d + pages) % pages; buildSelect();
      }));
    });
    refreshSelect();
  }
  // 讓目前選中的 Boss 所在頁面可見（例如隨機配對後）
  function pageOf(id) { return Math.floor(BD.bosses.findIndex((b) => b.id === id) / PER_PAGE); }
  function skillList(def) {
    return def.skills.map((s) => `<li>${s.phase === 2 ? '<span class="p2">［二階段］</span>' : ''}${s.maxPhase === 1 ? '<span class="p2">［僅一階段］</span>' : ''}${s.name}</li>`).join('');
  }
  function detailHtml(def, side) {
    return `<div><h3 style="color:${def.color}">${side === 0 ? '藍方' : '紅方'}：${def.name} — ${def.title}</h3>
      <div class="d">${def.desc}</div><ul>${skillList(def)}</ul>
      <div class="ult">大招【${def.ultimate.name}${def.ultimate.name2 ? '／' + def.ultimate.name2 : ''}】：${def.ultimate.desc}</div>
      <div class="p2">二階段（HP 50%）：${BD.describePhase2(def)}</div></div>`;
  }
  function showDetail(side, id) {
    const a = side === 0 ? id : state.pick[0], b = side === 1 ? id : state.pick[1];
    if (state.mode === 'train') { // 訓練場：只顯示所選 Boss 與訓練假人說明
      const d = BD.bossById.dummy;
      $('#detail').innerHTML = detailHtml(BD.bossById[a], 0).replace('藍方：', '訓練：') +
        (d ? `<div><h3 style="color:${d.color}">對手：${d.name} — ${d.title}</h3><div class="d">${d.desc}</div>
          <div class="d">一／二階段每招與大招都可從底部面板直接施放；預設無冷卻／無限體力，可隨時重置。</div></div>` : '');
      return;
    }
    $('#detail').innerHTML = detailHtml(BD.bossById[a], 0) + detailHtml(BD.bossById[b], 1);
  }
  function refreshSelect() {
    ['#sideA', '#sideB'].forEach((sel, side) => {
      document.querySelectorAll(sel + ' .card').forEach((c) => c.classList.toggle('sel', c.dataset.id === state.pick[side]));
    });
    showDetail(0, state.pick[0]);
  }
  // ── 地圖（選角畫面）：每個地形是一張獨立地圖，卡片完全由 BD.MAPS 產生；選擇存在 localStorage ──
  function setMap(id) {
    if (!BD.mapById[id]) return;
    state.map = id;
    try { localStorage.setItem('bd.map', id); } catch (e) { /* file:// 下可能不可用 */ }
    document.querySelectorAll('#mapPick .mapcard').forEach((c) => c.classList.toggle('sel', c.dataset.id === id));
    $('#mapPick .mapdesc').textContent = `${BD.mapById[id].icon} ${BD.mapById[id].name}：${BD.mapById[id].desc}`;
  }
  (function buildMaps() {
    const box = $('#mapPick');
    box.innerHTML = '<h2>地圖</h2><div class="mapcards"></div><div class="mapdesc"></div>';
    for (const m of BD.MAPS) {
      const c = document.createElement('div'); c.className = 'mapcard'; c.dataset.id = m.id;
      c.style.background = `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})`;
      c.innerHTML = `<span class="ic">${m.icon}</span><span class="nm">${m.name}</span>`;
      c.addEventListener('click', () => setMap(m.id));
      box.querySelector('.mapcards').appendChild(c);
    }
    let saved = null; try { saved = localStorage.getItem('bd.map'); } catch (e) { /* ignore */ }
    setMap(BD.mapById[saved] ? saved : BD.DEFAULT_MAP);
  })();
  $('#btnRandom').addEventListener('click', () => {
    const ids = BD.bosses.map((b) => b.id);
    state.pick[0] = ids[Math.floor(Math.random() * ids.length)];
    do { state.pick[1] = ids[Math.floor(Math.random() * ids.length)]; } while (ids.length > 1 && state.pick[1] === state.pick[0]);
    const np = [pageOf(state.pick[0]), pageOf(state.pick[1])];
    if (np[0] !== state.page[0] || np[1] !== state.page[1]) { state.page = np; buildSelect(); } else refreshSelect();
  });
  $('#btnStart').addEventListener('click', () => {
    if (state.mode === 'train') {
      startTraining(state.pick[0], { mode: $('#optTrainMode').value, range: $('#optTrainRange').value, pace: state.pace, map: state.map });
      return;
    }
    start(state.pick[0], state.pick[1], {
      player: $('#optPlayer').checked ? 0 : null, speed: +$('#optSpeed').value, pace: $('#optPace').value || BD.DEFAULT_PACE, map: state.map,
    });
  });

  // ── 模式切換（對戰 / 訓練場）──
  function setMode(mode) {
    state.mode = mode === 'train' ? 'train' : 'duel';
    const train = state.mode === 'train';
    $('#select').classList.toggle('training', train);
    $('#modeDuel').classList.toggle('on', !train);
    $('#modeTrain').classList.toggle('on', train);
    $('#sideA h2').textContent = train ? '選擇 Boss' : '藍方';
    $('#sideA h2').className = 'blue';
    $('#btnStart').textContent = train ? '🎯 進入訓練場' : '⚔ 開始對決';
    refreshSelect();
  }
  $('#modeDuel').addEventListener('click', () => setMode('duel'));
  $('#modeTrain').addEventListener('click', () => setMode('train'));

  // ── 戰鬥節奏（選角畫面）──
  // 選單順序：沉重（預設）在前、輕快在後；描述隨選項更新
  const PACE_ORDER = ['heavy', 'light'];
  function paceDesc(id) {
    $('#paceDesc').textContent = BD.PACES[id] ? BD.PACES[id].desc : '';
  }
  // 攻擊落點預警框顯示開關（純繪製端，存在 localStorage）
  function setTele(hide, notice) {
    R.hideTele = !!hide;
    const cb = $('#optTele'); if (cb) cb.checked = !R.hideTele;
    try { localStorage.setItem('bd.hideTele', R.hideTele ? '1' : '0'); } catch (e) { /* file:// 下可能不可用 */ }
    if (notice && R.perf) R.perf.notice('預警框：' + (R.hideTele ? '關' : '開'));
  }
  (function initTele() {
    let v = false; try { v = localStorage.getItem('bd.hideTele') === '1'; } catch (e) { /* ignore */ }
    setTele(v);
    const cb = $('#optTele'); if (cb) cb.addEventListener('change', () => setTele(!cb.checked));
  })();
  function setPace(id) {
    if (!BD.PACES[id]) return;
    state.pace = id;
    const sel = $('#optPace'); sel.value = id;
    paceDesc(id);
  }
  (function buildPace() {
    const sel = $('#optPace');
    sel.innerHTML = '';
    const ids = PACE_ORDER.filter((id) => BD.PACES[id]).concat(Object.keys(BD.PACES).filter((id) => !PACE_ORDER.includes(id)));
    for (const id of ids) {
      const o = document.createElement('option');
      o.value = id; o.textContent = `${BD.PACES[id].name}（${id === 'heavy' ? '大開大合' : id === 'light' ? '原版' : BD.PACES[id].desc}）`;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => setPace(sel.value));
    setPace(BD.DEFAULT_PACE);
  })();
  $('#btnRematch').addEventListener('click', () => (state.resultKind === 'hunt' ? startHunt(state.hunt.boss, state.hunt.map) : start(state.last.a, state.last.b, state.last.opts)));
  $('#btnSwap').addEventListener('click', () => start(state.last.b, state.last.a, state.last.opts));
  $('#btnMenu').addEventListener('click', () => show(state.resultKind === 'hunt' ? 'hunt' : 'select'));
  $('#modeHunt').addEventListener('click', () => show('hunt'));

  function show(name, msg) {
    state.screen = name;
    $('#select').classList.toggle('hidden', name !== 'select');
    $('#result').classList.toggle('hidden', name !== 'result');
    if (name !== 'game' && BD.TrainingUI) BD.TrainingUI.hide();
    if (BD.HuntUI) { if (name === 'hunt') BD.HuntUI.open(msg); else BD.HuntUI.hide(); }
    if (name === 'select' || name === 'hunt') state.world = null;
    if (name === 'select') refreshSelect();
  }

  function start(a, b, opts) {
    opts = Object.assign({ player: null, speed: 1, pace: BD.DEFAULT_PACE, map: state.map }, opts || {});
    if (!opts.pace) opts.pace = BD.DEFAULT_PACE;
    state.last = { a, b, opts };
    const w = new BD.World(BD.bossById[a], BD.bossById[b], { player: opts.player, input, seed: opts.seed, pace: opts.pace, map: opts.map });
    w.speed = opts.player != null ? 1 : opts.speed;
    state.world = w; state.resultShown = false;
    view.player = opts.player;
    show('game');
    return w;
  }
  state.start = start;

  // 訓練場世界：Boss 對訓練假人（不計勝負、不會結束）
  function startTraining(a, opts) {
    opts = Object.assign({ mode: 'manual', range: 'mid', pace: state.pace, map: state.map, seed: null, freeCast: true }, opts || {});
    const w = new BD.World(BD.bossById[a], BD.bossById.dummy, {
      input, seed: opts.seed, pace: opts.pace || state.pace, map: opts.map,
      training: { mode: opts.mode || 'manual', range: opts.range || 'mid', freeCast: opts.freeCast !== false },
    });
    w.speed = 1;
    state.world = w; state.resultShown = false;
    view.player = null;
    show('game');
    if (BD.TrainingUI) BD.TrainingUI.show(w);
    return w;
  }
  state.startTraining = startTraining;

  // 獵魂模式：存檔中的主角（沉重節奏）挑戰所選 Boss；擊敗後在結算畫面發放靈魂
  function startHunt(bossId, mapId) {
    const w = new BD.World(BD.Hunt.buildHero(BD.HuntUI.getSave(), 'heavy'), BD.bossById[bossId], { player: 0, input, pace: 'heavy', map: mapId || state.map, hunt: true });
    w.speed = 1;
    state.world = w; state.resultShown = false; state.hunt = { boss: bossId, map: mapId || state.map };
    view.player = 0;
    show('game');
    return w;
  }
  state.startHunt = startHunt;
  state.rebuildSelect = () => buildSelect(); // 測試掛勾：新增 Boss 後重建選角卡片

  function showHuntResult(w) {
    state.resultShown = true; state.resultKind = 'hunt';
    const [hero, boss] = w.bosses, win = w.winner === hero, mm = Math.floor(w.time / 60), ss = Math.floor(w.time % 60);
    const rw = win ? BD.Hunt.reward(BD.HuntUI.getSave(), state.hunt.boss) : null;
    if (win) BD.HuntUI.persist();
    $('#resTitle').innerHTML = win ? `<span style="color:${boss.def.color}">${boss.name}</span> 已被擊敗！` : `<span style="color:${hero.def.color}">獵魂者</span> 倒下了…`;
    $('#resSub').textContent = `戰鬥時間 ${mm} 分 ${ss} 秒 · ` + (win ? `獲得 ${boss.name} 的靈魂 ×${rw.souls}${rw.first ? '（首殺加成）' : ''}` : `對 ${boss.name} 造成 ${Math.round((1 - boss.hp / boss.maxHp) * 100)}% 的傷害`);
    const rows = [['造成傷害', (b) => Math.round(b.stats.dealt)], ['施放技能次數', (b) => b.stats.skills], ['翻滾 / 完美閃避', (b) => `${b.stats.dodges} / ${b.stats.perfect}`], ['被架勢崩潰', (b) => b.stats.breaks]];
    $('#resStats').innerHTML = `<tr><th></th><th style="color:${hero.def.color}">獵魂者</th><th style="color:${boss.def.color}">${boss.name}</th></tr>` +
      rows.map(([n, f]) => `<tr><td>${n}</td><td>${f(hero)}</td><td>${f(boss)}</td></tr>`).join('') + `<tr><td>使用藥水</td><td>${hero.hunt.used}</td><td>—</td></tr>`;
    $('#btnRematch').textContent = '🔁 再戰一次'; $('#btnSwap').style.display = 'none'; $('#btnMenu').textContent = '↩ 回據點';
    show('result');
    state.screen = 'result';
  }

  function showResult(w) {
    state.resultShown = true; state.resultKind = 'duel';
    $('#btnRematch').textContent = '🔁 重賽（同組合）'; $('#btnSwap').style.display = ''; $('#btnMenu').textContent = '↩ 重新選角';
    const win = w.winner, lose = win.enemy;
    $('#resTitle').innerHTML = `<span style="color:${win.def.color}">${win.name}</span> 獲勝！`;
    const mm = Math.floor(w.time / 60), ss = Math.floor(w.time % 60);
    const paceName = BD.PACES[w.paceId] ? BD.PACES[w.paceId].name : w.paceId;
    $('#resSub').textContent = `戰鬥時間 ${mm} 分 ${ss} 秒 · 勝者剩餘 HP ${Math.ceil(win.hp)} / ${win.maxHp} · 節奏 ${paceName}`;
    const [A, B] = w.bosses;
    const rows = [
      ['造成傷害', (b) => Math.round(b.stats.dealt)],
      ['施放技能次數', (b) => b.stats.skills],
      ['大招（一階段 / 二階段）', (b) => `${b.stats.ultP1} / ${b.stats.ultP2}`],
      ['翻滾 / 完美閃避', (b) => `${b.stats.dodges} / ${b.stats.perfect}`],
      ['被架勢崩潰', (b) => b.stats.breaks],
      ['見切反擊', (b) => b.stats.counters],
      ['假動作', (b) => b.stats.feints],
      ['進入二階段時間', (b) => (b.stats.phase2At != null ? b.stats.phase2At.toFixed(1) + ' 秒' : '—')],
    ];
    $('#resStats').innerHTML = `<tr><th></th><th style="color:${A.def.color}">藍方 ${A.name}</th><th style="color:${B.def.color}">紅方 ${B.name}</th></tr>` +
      rows.map(([n, f]) => `<tr><td>${n}</td><td>${f(A)}</td><td>${f(B)}</td></tr>`).join('');
    show('result');
    state.screen = 'result';
  }

  input.onKey = (k, e) => {
    // F3 / F4 在任何畫面都可切換（繪製端狀態，不影響遊戲世界）
    if (k === 'F3') { e.preventDefault(); if (R.perf) R.perf.show = !R.perf.show; return; }
    // F6：AI 偵錯覆蓋層（任何畫面可切換）
    if (k === 'F6') {
      e.preventDefault();
      R.aiDebug = !R.aiDebug;
      if (R.perf) R.perf.notice('AI 偵錯：' + (R.aiDebug ? '開' : '關'));
      return;
    }
    if (k === 'F4') {
      e.preventDefault();
      if (e.shiftKey) { R.cache.debug = !R.cache.debug; R.invalidateCaches(); if (R.perf) R.perf.notice('精靈框線：' + (R.cache.debug ? '開' : '關')); }
      else { R.cache.enabled = !R.cache.enabled; R.invalidateCaches(); if (R.perf) R.perf.notice('快取：' + (R.cache.enabled ? '開' : '關')); }
      return;
    }
    if (state.screen === 'select' && k === 'h') {
      // 焦點在輸入欄位時不攔截 'h'
      const ae = document.activeElement;
      if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
      e.preventDefault();
      const ids = Object.keys(BD.PACES).filter((id) => BD.PACES[id]);
      setPace(ids[(ids.indexOf(state.pace) + 1) % ids.length]);
      return;
    }
    const w = state.world;
    if (!w || state.screen !== 'game') return;
    if (w.training) {
      const tr = w.training;
      if (k === 'F2') { e.preventDefault(); tr.cycleMode(); return; }
      if (k === 'F9') { e.preventDefault(); tr.reset(); return; }
      const dm = /^Digit([0-9])$/.exec(e.code || '');
      if (e.shiftKey && dm) {
        e.preventDefault();
        const n = +dm[1];
        if (n === 0) tr.cast('ult');
        else if (tr.boss.skills[n - 1]) tr.cast(tr.boss.skills[n - 1].id);
        return;
      }
      if (!e.shiftKey && dm && dm[1] >= '1' && dm[1] <= '5') {
        e.preventDefault();
        w.speed = { 1: 1, 2: 2, 3: 3, 4: 0.5, 5: 0.25 }[dm[1]];
        return;
      }
    }
    if (k === 'p') w.paused = !w.paused;
    if (k === 'Escape') { show(w.hunt ? 'hunt' : 'select'); return; }
    if (k === 'l') view.showLog = !view.showLog;
    if (k === 't') setTele(!R.hideTele, true);
    if (view.player == null) {
      if (k === '1') w.speed = 1; if (k === '2') w.speed = 2; if (k === '3') w.speed = 3; if (k === '4') w.speed = 0.5;
    }
  };

  // ── 主迴圈 ──
  let last = performance.now(), portraitT = 0;
  function frame(now) {
    const frameMs = now - last;
    const dt = Math.min(0.05, frameMs / 1000); last = now;
    try {
      ctx.setTransform(state.scale, 0, 0, state.scale, 0, 0);
      const w = state.world;
      if (w) {
        w.tick(dt);
        const rt = performance.now();
        R.render(ctx, w, view);
        if (R.perf) R.perf.push(frameMs, performance.now() - rt);
        if (w.training) {
          view.player = w.training.mode === 'player' ? 0 : null;
          if (BD.TrainingUI) BD.TrainingUI.update(w);
        }
        if (w.over && !state.resultShown) (w.hunt ? showHuntResult : showResult)(w);
      } else {
        if (R.perf) R.perf.push(frameMs, 0);
        ctx.fillStyle = '#050407'; ctx.fillRect(0, 0, R.W, R.H);
        if (R.perf) R.perf.drawNotice(ctx);
      }
      if (state.screen === 'select' && (portraitT -= dt) <= 0) { portraitT = 1 / 30; for (const [c, d] of portraits) R.portrait(c, d); }
    } catch (e) { state.errors.push(String(e && e.stack || e)); console.error(e); }
    requestAnimationFrame(frame);
  }
  if (BD.TrainingUI) BD.TrainingUI.create($('#app'), canvas);
  BD.HuntUI.create($('#app'), { onStart: startHunt, onBack: () => show('select') });
  setMode(state.mode);
  buildSelect();
  requestAnimationFrame(frame);
})(window);
