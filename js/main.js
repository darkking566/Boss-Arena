'use strict';
// 主程式：畫面切換、選角、遊戲迴圈、結算
(function (G) {
  const BD = G.BD, R = BD.Render;
  const $ = (s) => document.querySelector(s);
  const canvas = $('#game'), ctx = canvas.getContext('2d');
  const input = new BD.Input(canvas);
  const view = { showLog: true, player: null, mouse: input.mouse };
  const ids0 = BD.bosses.map((b) => b.id);
  const state = { screen: 'select', world: null, pick: [ids0.includes('magmus') ? 'magmus' : ids0[0], ids0.includes('ronin') ? 'ronin' : ids0[1] || ids0[0]], pace: BD.DEFAULT_PACE, map: BD.DEFAULT_MAP, last: null, errors: [], page: [0, 0], mode: 'duel', team: [ids0.slice(0, 3), ids0.slice(3, 6)] };
  G.__BD = state; // 測試掛勾

  // ── 畫布縮放 ──
  // 手機直立 + 實際對戰（非訓練 / 獵魂）→ 直向版面：窄長畫布、放大 HUD、鏡頭放大並自動拉遠；回傳 null 表示維持橫向版面
  const coarse = matchMedia('(pointer: coarse)');
  function verticalSpec() {
    const w = state.world;
    if (!coarse.matches || window.innerHeight < window.innerWidth * 1.1) return null;
    if ((state.screen !== 'game' && state.screen !== 'result') || !w || w.training || w.hunt || w.hunt4) return null; // 結算畫面也維持直向，避免背後的畫布突然縮回橫向
    const p = state.screen === 'game' && view.player != null && w.bosses[view.player] && w.bosses[view.player].controller.isPlayer ? w.bosses[view.player] : null;
    return { hudH: R.verticalHudH(w), pad: p ? Math.ceil((p.skills.length + 2) / 3) * 55 + 28 : 0 }; // pad：觸控技能鈕區高度（css px）
  }
  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight, spec = verticalSpec();
    document.body.classList.toggle('vlayout', !!spec);
    if (spec) { // 寬佔滿，高 = 視窗 − 上方按鈕列 − 技能鈕區
      const top = parseFloat(getComputedStyle(canvas).marginTop) || 0;
      R.setLayout({ hudH: spec.hudH, h: Math.max(900, Math.min(2000, Math.round((vh - top - spec.pad) * 900 / vw))) });
    } else R.setLayout(null);
    const rail = matchMedia('(pointer: coarse) and (orientation: landscape)').matches ? Math.min(vw * .28, 250) : 0;
    const s = Math.min((vw - rail) / R.W, vh / R.H);
    canvas.style.marginRight = rail + 'px';
    const dpr = Math.min(matchMedia('(pointer: coarse)').matches ? 1.5 : 2, window.devicePixelRatio || 1);
    canvas.style.width = Math.floor(R.W * s) + 'px'; canvas.style.height = Math.floor(R.H * s) + 'px';
    canvas.width = Math.floor(R.W * s * dpr); canvas.height = Math.floor(R.H * s * dpr);
    const ns = s * dpr;
    if (ns !== state.scale && R.invalidateCaches) R.invalidateCaches(); // 倍率變更 → 精靈快取失效
    state.scale = ns;
  }
  window.addEventListener('resize', resize); resize();
  let layoutSig = '';
  function syncLayout() { // 開戰 / 返回 / 換玩家時版面需求會變 → 簽章改變才重算
    const s = verticalSpec(), sig = window.innerWidth + 'x' + window.innerHeight + (s ? ':' + s.hudH + ':' + s.pad : '');
    if (sig !== layoutSig) { layoutSig = sig; resize(); }
  }
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
        const c = document.createElement('div'); c.className = 'card'; c.dataset.id = def.id; c.tabIndex = 0; c.setAttribute('role', 'button'); c.setAttribute('aria-label', def.name);
        c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.click(); } });
        c.innerHTML = `<canvas width="168" height="168"></canvas><div><div class="nm" style="color:${def.color}">${def.name}</div>
          <div class="tt">${def.title}</div><div class="ar">${def.archetype}</div>
          <div class="tt"><span class="rk rk-${def.rank}">${BD.RANKS[def.rank].name}</span> <span class="st" title="${def.stars} 星">${BD.starText(def.stars)}</span></div></div>`;
        c.addEventListener('click', () => { if (state.mode === 'team') pickTeam(side, def.id); else state.pick[side] = def.id; refreshSelect(); });
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
  // 3v3：點一下加入 / 再點移除；同隊不能重複，滿 3 位時擠掉最早選的
  function pickTeam(side, id) {
    const t = state.team[side], i = t.indexOf(id);
    if (i >= 0) t.splice(i, 1); else { if (t.length >= 3) t.shift(); t.push(id); }
  }
  // 讓目前選中的 Boss 所在頁面可見（例如隨機配對後）
  function pageOf(id) { return Math.floor(BD.bosses.findIndex((b) => b.id === id) / PER_PAGE); }
  function skillList(def) {
    return def.skills.map((s) => `<li>${s.phase === 2 ? '<span class="p2">［二階段］</span>' : ''}${s.maxPhase === 1 ? '<span class="p2">［僅一階段］</span>' : ''}${s.name}</li>`).join('');
  }
  function detailHtml(def, side) {
    return `<div><h3 style="color:${def.color}">${side === 0 ? '藍方' : '紅方'}：${def.name} — ${def.title}</h3>
      <div class="d">${BD.RANKS[def.rank].name} ${BD.starText(def.stars)}（${def.stars} 星）· HP ${def.maxHp}</div>
      <div class="d">${def.desc}</div><ul>${skillList(def)}</ul>
      <div class="ult">大招【${def.ultimate.name}${def.ultimate.name2 ? '／' + def.ultimate.name2 : ''}】：${def.ultimate.desc}</div>
      <div class="p2">二階段（HP 50%）：${BD.describePhase2(def)}</div></div>`;
  }
  // 狩獵：獵人的熟練度與對這位 Boss 的圖鑑（招式摸熟幾招、最軟部位、被追比例、戰績）
  const PART_NAME = { head: '頭', legs: '腳', body: '身', tail: '尾' };
  function h4Line(h0, bossId) {
    const h = h4Armed(h0);
    const H = BD.H4Brain, sv = state.h4save, x = H.dexInfo(sv, h.id, bossId);
    const ms = h.weapons.filter((wp) => BD.HUNT4.WEAPON_SPECS[wp]).slice(0, 2).map((wp) => `${BD.HUNT4.WEAPON_NAMES[wp]} ${Math.round(H.mastery(sv, h.id, wp) * 100)}%`).join('、');
    return `<div class="d"><b style="color:${h.color}">${h.title}・${h.name}</b>：${h.desc}<br>熟練：${ms}｜圖鑑：招式 ${x.known}/${x.all}` +
      (x.soft ? `・最軟 ${PART_NAME[x.soft]}` : '') + (x.fights ? `・被追 ${Math.round(x.chased * 100)}%・戰績 ${x.wins}/${x.fights}` : '・尚未交手') + '<br>' + h4Gear(h, bossId) + '</div>';
  }
  // 這場會帶的裝備（AI 依目標 Boss 挑）：武器與特性、防具技能、套裝、素材總數
  function h4Gear(h, bossId) {
    const H4 = BD.HUNT4, GR = BD.H4Gear, g = GR.gearOf(state.h4save, h.id), eq = GR.choose(g, h4Armed(h), bossId), E = GR.build(g, eq);
    const wpn = eq.w ? `${GR.itemName(eq.w, g.w[eq.w])}（${H4.WTRAITS[E.wt].name}）` : '初始武器';
    const arm = ['head', 'body', 'legs'].map((s) => (eq[s] ? GR.itemName(eq[s], g.a[eq[s]]) : '—')).join(' / ');
    const sk = GR.skillText(E.L1) || '無', gems = Object.values(g.deco).reduce((a, n) => a + n, 0);
    const mats = Object.values(g.mats).reduce((a, m) => a + m.s + m.p + m.g, 0);
    return `裝備：${wpn}｜防具 ${arm}｜技能 ${sk}` + (E.set ? `｜套裝【${H4.SETS[E.set].name}】` : '') + `｜珠子 ${eq.deco.length ? eq.deco.join('、') : '—'}（持有 ${gems} 顆）` + `｜素材 ${mats} 個、已做 ${Object.keys(g.w).length + Object.keys(g.a).length} 件`;
  }
  // 主武器選擇（存在 localStorage）：預設各自的招牌武器
  const H4MAIN = 'bd.hunt4.main';
  state.h4main = (() => { const o = {}; let v = null; try { v = JSON.parse(localStorage.getItem(H4MAIN)); } catch (e) { /* 壞掉就用預設 */ }
    for (const h of BD.HUNT4.HUNTERS) o[h.id] = v && BD.HUNT4.WEAPON_SPECS[v[h.id]] ? v[h.id] : h.weapons[0]; return o; })();
  const h4Armed = (h) => Object.assign({}, h, { weapons: BD.Hunt4.ARMS(h, state.h4main[h.id]) });
  const H4KEY = 'bd.hunt4.save';
  state.h4save = (() => { try { return BD.H4Brain.sanitize(JSON.parse(localStorage.getItem(H4KEY))); } catch (e) { return BD.H4Brain.newSave(); } })();
  function h4Store() { try { localStorage.setItem(H4KEY, JSON.stringify(state.h4save)); } catch (e) { /* file:// 下可能不可用：本次開啟期間仍記得 */ } }
  $('#detail').addEventListener('click', (e) => {
    const k = e.target.dataset && e.target.dataset.h4;
    if (k === 'export') {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(state.h4save)], { type: 'application/json' }));
      a.download = 'hunt4-save.json'; a.click(); URL.revokeObjectURL(a.href);
    } else if (k === 'import') {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
      inp.onchange = () => inp.files[0] && inp.files[0].text().then((t) => {
        let o = null; try { o = JSON.parse(t); } catch (err) { /* 下面統一提示 */ }
        if (!o || o.v !== BD.H4Brain.V) { alert('這不是可用的狩獵學習存檔'); return; }
        state.h4save = BD.H4Brain.sanitize(o); h4Store(); showDetail(1, state.pick[1]);
      });
      inp.click();
    } else if (k === 'reset' && confirm('確定要清除四位獵人的所有學習紀錄嗎？')) { state.h4save = BD.H4Brain.newSave(); h4Store(); showDetail(1, state.pick[1]); }
  });
  function showDetail(side, id) {
    const a = side === 0 ? id : state.pick[0], b = side === 1 ? id : state.pick[1];
    if (state.mode === 'train') { // 訓練場：只顯示所選 Boss 與訓練假人說明
      const d = BD.bossById.dummy;
      $('#detail').innerHTML = detailHtml(BD.bossById[a], 0).replace('藍方：', '訓練：') +
        (d ? `<div><h3 style="color:${d.color}">對手：${d.name} — ${d.title}</h3><div class="d">${d.desc}</div>
          <div class="d">一／二階段每招與大招都可從底部面板直接施放；預設無冷卻／無限體力，可隨時重置。</div></div>` : '');
      return;
    }
    if (state.mode === 'horde') { // 小兵潮：所選 Boss 單挑無限雜兵
      $('#detail').innerHTML = detailHtml(BD.bossById[a], 0).replace('藍方：', '迎戰：') +
        `<div><h3>小兵潮（生存模式）</h3><div class="d">四面八方湧來的低級雜兵，每 1.5 秒一波，數量隨時間越來越多、沒有上限；${Object.values(BD.GRUNTS).map((g) => g.name).join(' / ')} 會陸續登場。Boss 倒下即結束，成績是撐住的秒數與擊倒數。</div></div>`;
      return;
    }
    if (state.mode === 'hunt4') { // 狩獵：顯示目標 Boss（右側選的）與獵人隊
      $('#detail').innerHTML = detailHtml(BD.bossById[b], 1).replace('紅方：', '目標：') +
        `<div><h3>獵人隊（4 人，AI 操控）· 已累積 ${state.h4save.matches} 場</h3>${BD.HUNT4.HUNTERS.map((h) => h4Line(h, b)).join('')}
        <div class="d">Boss 生命 ×${BD.HUNT4.BOSS_HP_MUL}；全隊共用 ${BD.HUNT4.CARTS} 次力竭，用完即失敗。獵人會跨場學習：武器越用越熟、對每位 Boss 的招式越來越了解。</div>
        <div class="d"><button data-h4="export">匯出學習存檔</button> <button data-h4="import">匯入</button> <button data-h4="reset">重置學習</button></div></div>`;
      return;
    }
    if (state.mode === 'team') { // 3v3：顯示游標所在的 Boss 與雙方陣容
      const roster = (sd) => state.team[sd].map((x) => `<span style="color:${BD.bossById[x].color}">${BD.bossById[x].name}</span>`).join('・') || '（尚未選擇）';
      $('#detail').innerHTML = detailHtml(BD.bossById[id], side) +
        `<div><h3>陣容（每隊 1~3 位，點卡片加入 / 移除）</h3><div class="d">藍方 ${state.team[0].length}/3：${roster(0)}</div><div class="d">紅方 ${state.team[1].length}/3：${roster(1)}</div></div>`;
      return;
    }
    $('#detail').innerHTML = detailHtml(BD.bossById[a], 0) + detailHtml(BD.bossById[b], 1);
  }
  function refreshSelect() {
    ['#sideA', '#sideB'].forEach((sel, side) => {
      document.querySelectorAll(sel + ' .card').forEach((c) => {
        const n = state.team[side].indexOf(c.dataset.id) + 1;
        c.classList.toggle('sel', state.mode === 'team' ? n > 0 : c.dataset.id === state.pick[side]);
        c.setAttribute('aria-pressed', String(c.classList.contains('sel')));
        if (state.mode === 'team' && n) c.dataset.n = n; else delete c.dataset.n;
      });
    });
    if (state.mode === 'team') showDetail(0, state.team[0][0] || state.pick[0]); else showDetail(0, state.pick[0]);
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
    if (state.mode === 'team') { // 3v3：每隊隨機 3 位不重複
      state.team = [0, 1].map(() => { const pool = ids.slice(), out = []; while (out.length < Math.min(3, pool.length)) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); return out; });
      refreshSelect(); return;
    }
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
    if (state.mode === 'hunt4') { startHunt4(state.pick[1], state.map); return; }
    if (state.mode === 'horde') { startHorde(state.pick[0], { player: $('#optPlayer').checked ? 0 : null, speed: +$('#optSpeed').value, pace: $('#optPace').value || BD.DEFAULT_PACE, map: state.map }); return; }
    if (state.mode === 'team' && (!state.team[0].length || !state.team[1].length)) { alert('3v3：兩隊各至少要選 1 位 Boss'); return; }
    start(state.mode === 'team' ? state.team[0].slice() : state.pick[0], state.mode === 'team' ? state.team[1].slice() : state.pick[1], {
      player: $('#optPlayer').checked ? 0 : null, speed: +$('#optSpeed').value, pace: $('#optPace').value || BD.DEFAULT_PACE, map: state.map,
    });
  });

  // ── 模式切換（對戰 / 訓練場）──
  function setMode(mode) {
    state.mode = mode === 'train' || mode === 'team' || mode === 'hunt4' || mode === 'horde' ? mode : 'duel';
    const train = state.mode === 'train', team = state.mode === 'team', h4 = state.mode === 'hunt4', hd = state.mode === 'horde';
    $('#select').classList.toggle('training', train);
    $('#select').classList.toggle('hunt4', h4);
    $('#select').classList.toggle('horde', hd);
    $('#modeHorde').classList.toggle('on', hd);
    $('#modeHunt4').classList.toggle('on', h4);
    $('#modeDuel').classList.toggle('on', state.mode === 'duel');
    $('#modeTrain').classList.toggle('on', train);
    $('#modeTeam').classList.toggle('on', team);
    $('#sideA h2').textContent = train || hd ? '選擇 Boss' : team ? '藍方（選 3 位）' : h4 ? '獵人隊' : '藍方';
    $('#sideB h2').textContent = team ? '紅方（選 3 位）' : h4 ? '選擇目標 Boss' : '紅方';
    $('#sideA h2').className = 'blue';
    $('#btnStart').textContent = train ? '🎯 進入訓練場' : team ? '👥 開始 3v3' : h4 ? '🐉 出發狩獵' : hd ? '🪲 迎戰小兵潮' : '⚔ 開始對決';
    refreshSelect();
  }
  $('#modeHorde').addEventListener('click', () => setMode('horde'));
  $('#modeDuel').addEventListener('click', () => setMode('duel'));
  $('#modeTrain').addEventListener('click', () => setMode('train'));
  $('#modeTeam').addEventListener('click', () => setMode('team'));
  $('#modeHunt4').addEventListener('click', () => setMode('hunt4'));
  const wpOpts = (h) => Object.keys(BD.HUNT4.WEAPON_SPECS).map((id) => `<option value="${id}"${state.h4main[h.id] === id ? ' selected' : ''}>${BD.HUNT4.WEAPON_NAMES[id]}${h.weapons[0] === id ? '（招牌）' : ''}</option>`).join('');
  $('#roster4').addEventListener('change', (e) => {
    const id = e.target.dataset && e.target.dataset.h4main;
    if (!id) return;
    state.h4main[id] = e.target.value; try { localStorage.setItem(H4MAIN, JSON.stringify(state.h4main)); } catch (err) { /* file:// 下可能不可用 */ }
    showDetail(1, state.pick[1]);
  });
  $('#roster4').innerHTML = BD.HUNT4.HUNTERS.map((h) => `<div class="h4" style="border-color:${h.color}"><div class="nm" style="color:${h.color}">${h.title}・${h.name} <select data-h4main="${h.id}" title="這場的主武器">${wpOpts(h)}</select></div>
    <div class="tt">${h.desc}</div><div class="tt">武器：${h.weapons.map((id) => BD.HUNT4.WEAPON_NAMES[id]).join(' / ')}　「${h.line}」</div></div>`).join('');

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
  // 戰場痕跡上限開關（純視覺：只決定要不要擠掉最舊的痕跡；打開後長時間對戰可能變慢）
  (function initScars() {
    const cb = $('#optScars'); if (!cb) return;
    try { cb.checked = localStorage.getItem('bd.keepScars') === '1'; } catch (e) { /* ignore */ }
    BD.keepScars = cb.checked;
    cb.addEventListener('change', () => { BD.keepScars = cb.checked; try { localStorage.setItem('bd.keepScars', cb.checked ? '1' : '0'); } catch (e) { /* ignore */ } });
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
  $('#btnRematch').addEventListener('click', () => (state.resultKind === 'hunt' ? startHunt(state.hunt.boss, state.hunt.map, state.hunt.agent, state.hunt.arms) : state.resultKind === 'hunt4' ? startHunt4(state.hunt4.boss, state.hunt4.map) : state.resultKind === 'horde' ? startHorde(state.last.horde, state.last.opts) : start(state.last.a, state.last.b, state.last.opts)));
  $('#btnSwap').addEventListener('click', () => start(state.last.b, state.last.a, state.last.opts));
  $('#btnMenu').addEventListener('click', () => show(state.resultKind === 'hunt' ? 'hunt' : 'select'));
  $('#modeHunt').addEventListener('click', () => show('hunt'));

  function show(name, msg) {
    state.screen = name;
    input.keys.clear(); input.buffer.length = 0; input.touchMove = null;
    if (name !== 'result' && BD.sfx) BD.sfx.stop(); // 離開 / 重開戰鬥時停掉殘留音效
    $('#select').classList.toggle('hidden', name !== 'select');
    $('#result').classList.toggle('hidden', name !== 'result');
    $('#result').classList.toggle('hunt4-result', name === 'result' && state.resultKind === 'hunt4');
    $('#resGrowth').hidden = name !== 'result' || state.resultKind !== 'hunt4';
    if (name !== 'game' && BD.TrainingUI) BD.TrainingUI.hide();
    if (BD.HuntUI) { if (name === 'hunt') BD.HuntUI.open(msg); else BD.HuntUI.hide(); }
    if (name === 'select' || name === 'hunt') state.world = null;
    if (name === 'select') refreshSelect();
  }

  function start(a, b, opts) {
    opts = Object.assign({ player: null, speed: 1, pace: BD.DEFAULT_PACE, map: state.map }, opts || {});
    if (!opts.pace) opts.pace = BD.DEFAULT_PACE;
    state.last = { a, b, opts };
    const def = (x) => (Array.isArray(x) ? x.map((id) => BD.bossById[id]) : BD.bossById[x]); // 陣列 = 3v3 團隊戰
    const w = new BD.World(def(a), def(b), { player: opts.player, input, seed: opts.seed, pace: opts.pace, map: opts.map });
    w.speed = opts.player != null ? 1 : opts.speed;
    state.world = w; state.resultShown = false;
    view.player = opts.player; view.focus = null;
    show('game');
    return w;
  }
  state.start = start;

  // 小兵潮（生存模式）：Boss 對無上限的雜兵潮；對手是 hidden 假人（js/engine/minions/horde.js）
  function startHorde(a, opts) {
    opts = Object.assign({ player: null, speed: 1, pace: BD.DEFAULT_PACE, map: state.map }, opts || {});
    state.last = { horde: a, opts };
    const w = new BD.World(BD.bossById[a], BD.bossById.dummy, { player: opts.player, input, seed: opts.seed, pace: opts.pace, map: opts.map, horde: true });
    w.speed = opts.player != null ? 1 : opts.speed;
    state.world = w; state.resultShown = false;
    view.player = opts.player; view.focus = 0; // 鏡頭只跟 Boss（假人會飄到雜兵身上）
    show('game');
    return w;
  }
  state.startHorde = startHorde;

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
  function startHunt(bossId, mapId, agent, arms) { // arms：代理改拿的狩獵武器 id（只限代理）
    arms = agent && arms; const save = BD.HuntUI.getSave();
    const w = new BD.World(arms ? BD.Hunt4.soloHero(save, arms) : BD.Hunt.buildHero(save, 'heavy'), BD.bossById[bossId], { player: agent ? undefined : 0, input, pace: 'heavy', map: mapId || state.map, hunt: true, agent: !!agent, h4solo: !!arms });
    w.speed = 1;
    state.world = w; state.resultShown = false; state.hunt = { boss: bossId, map: mapId || state.map, agent, arms };
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
    if (win && BD.sfx) BD.sfx.play('victory', 0.7);
    state.screen = 'result';
  }

  // 狩獵模式（4v1）：四位 AI 獵人討伐一位 Boss
  function startHunt4(bossId, mapId) {
    const w = new BD.World(BD.Hunt4.team(state.h4main), BD.bossById[bossId], { input, pace: 'heavy', map: mapId || state.map, hunt4: true, h4save: state.h4save });
    w.speed = 1;
    state.world = w; state.resultShown = false; state.hunt4 = { boss: bossId, map: mapId || state.map };
    view.player = null; view.focus = null;
    show('game');
    return w;
  }
  state.startHunt4 = startHunt4;
  function showHunt4Review(st) {
    const root = $('#resGrowth'); root.replaceChildren();
    const add = (parent, tag, text, cls) => { const el = document.createElement(tag); el.textContent = text; if (cls) el.className = cls; parent.appendChild(el); return el; };
    const pct = (n) => (n * 100).toFixed(1) + '%';
    add(root, 'h2', '本場成長回顧').id = 'resGrowthTitle';
    add(root, 'p', '記錄這一場的經驗與表現；單場結果不代表已經穩定掌握招式。', 'h4-review-note');
    if (!st.review) { add(root, 'p', '本場回顧資料不足，仍可查看下方戰鬥統計。'); return; }
    const grid = add(root, 'div', '', 'h4-review-grid');
    for (const r of st.review) {
      const hd = BD.HUNT4.HUNTERS.find((h) => h.id === r.id), card = add(grid, 'article', '', 'h4-review-card');
      card.style.borderColor = hd.color;
      add(card, 'h3', hd.name + '・' + hd.title);
      if (r.before && r.after) {
        for (const id of Object.keys(r.after.weapons)) {
          const a = r.before.weapons[id], b = r.after.weapons[id], wp = BD.HUNT4.WEAPON_NAMES[id];
          add(card, 'p', a ? `${wp}熟練度：${pct(a.mastery)} → ${pct(b.mastery)}（本場經驗 +${b.xp - a.xp}）` : `${wp}：缺少開戰前紀錄`);
        }
        const a = r.before.dex, b = r.after.dex;
        add(card, 'p', `本 Boss 圖鑑：達記錄門檻 ${a.known}/${a.all} → ${b.known}/${b.all} 招；累計交手 ${a.fights} → ${b.fights} 場`);
      } else add(card, 'p', '缺少前後紀錄，無法比較本場成長。');
      for (const [label, v] of [['反應', r.react], ['翻滾', r.dodge]]) {
        add(card, 'p', !v || !v[1] ? `${label}：本場尚無已結算的嘗試紀錄` : `${label}：成功 ${v[0]} / 嘗試 ${v[1]} 次` + (v[1] < 10 ? '（樣本較少，先作參考）' : ''));
      }
      if (r.coop) {
        const c = r.coop;
        add(card, 'p', `造傷 ${c.created} 次・隊友接應成功 ${c.assists} 次`);
        add(card, 'p', c.started ? `傷口合作：成功 ${c.success} / 出手 ${c.started} 次；未命中 ${c.missed}、中止 ${c.cancelled}` : '傷口合作：本場尚未出手接應');
      }
      if (r.support) {
        const s = r.support;
        add(card, 'p', `粉塵實際回復 ${Math.round(s.healing)} HP（隊友 ${Math.round(s.allyHealing)} HP），有效受益 ${s.recipients} 人次（含自己）`);
        add(card, 'p', `閃光打斷 ${s.interrupts} 次；掩護後觀察 2 秒未力竭 ${s.coverSafe}、期間力竭 ${s.coverFaint}、戰鬥提早結束 ${s.coverEnded}`);
      }
    }
    add(root, 'p', '反應／翻滾沿用學習判定：嘗試後的觀察期間內，累計受傷超過最大生命的 2% 算失敗。這不是逐招完全閃避率。圖鑑同一招累計 3 次反應／翻滾觀察即達記錄門檻，不等於學會該招。熟練度僅列本場使用的武器；小幅增加可能因顯示到小數一位而看不出差異。', 'h4-review-note');
    add(root, 'p', '造傷者按打出傷口的最後一擊記名。合作只計隊友接應指定傷口的集中攻擊；傷口消失、危險時收手或招式被打斷會中止，出手後沒打破指定傷口則記未命中。', 'h4-review-note');
    add(root, 'p', '粉塵只計真正補回的生命，滿血或已力竭者不計受益人次。閃光記錄實際打斷與其後 2 秒的觀察結果，不代表保證救命；已飛出的投射物與地面危險仍會存在。', 'h4-review-note');
  }
  function showHunt4Result(w) {
    state.resultShown = true; state.resultKind = 'hunt4'; h4Store(); // 這場學到的已寫進 state.h4save（戰鬥中直接累積）
    const st = w.hunt4, boss = st.boss, win = w.winner && w.winner.team === 0, mm = Math.floor(w.time / 60), ss = Math.floor(w.time % 60);
    $('#resTitle').innerHTML = win ? `<span style="color:${boss.def.color}">${boss.name}</span> 討伐成功！` : '狩獵失敗…';
    $('#resSub').textContent = `狩獵時間 ${mm} 分 ${ss} 秒 · 力竭 ${st.faints} / ${BD.HUNT4.CARTS} · 怯 ${st.flinches} 次 · 倒地 ${st.topples} 次` + (win ? '' : ` · ${boss.name} 剩餘生命 ${Math.round(boss.hp / boss.maxHp * 100)}%`);
    showHunt4Review(st);
    const rows = [['造成傷害', (h) => Math.round(h.stats.dealt)], ['承受傷害', (h) => Math.round(h.stats.taken)], ['力竭', (h) => st.faintsBy.get(h)],
      ['彈刀 / 見切', (h) => `${h.stats.deflects || 0} / ${h.stats.counters}`], ['相殺 / 力量對抗 / 完美防禦', (h) => `${h.stats.h4.offsets} / ${h.stats.h4.clashes} / ${h.stats.h4.pguards}`], ['翻滾 / 完美閃避', (h) => `${h.stats.dodges} / ${h.stats.perfect}`],
      ['傷口破壞 / 部位破壞', (h) => `${h.stats.h4.pops} / ${h.stats.h4.breaks}`], ['異常觸發', (h) => h.stats.h4.procs], ['換武器', (h) => h.stats.h4.switches],
      ['回復藥 / 磨刀', (h) => `${h.hunt.used} / ${h.stats.h4.whets}`], ['閃光彈 / 生命粉塵', (h) => `${h.stats.h4.flashes} / ${h.stats.h4.dusts}`],
      ['反應 / 翻滾成功', (h) => h.brain.res.react.concat(h.brain.res.dodge).reduce((s, v, i) => s + (i % 2 ? `/${v}` : (i ? '　' : '') + v), '')],
      ['熟練度', (h) => `${Math.round(BD.H4Brain.mastery(state.h4save, h.def.hunter, h.def.weapon) * 100)}%`],
      ['套裝 / 技能', (h) => { const E = h.h4.gear; return (E.set ? BD.HUNT4.SETS[E.set].name : '—') + '<br>' + (BD.H4Gear.skillText(E.L1) || '—'); }],
      ['獲得素材', (h) => { const x = h.h4.gear.got; return x ? `鱗 ${x.s}・部位 ${x.p}` + (x.g ? '・寶玉！' : '') + (h.h4.gear.gem ? '<br>💎 ' + h.h4.gear.gem : '') : '—'; }],
      ['製作 / 強化', (h) => h.h4.gear.made.join('<br>') || '—']];
    $('#resStats').innerHTML = `<tr><th></th>${st.hunters.map((h) => `<th style="color:${h.def.color}">${h.name}</th>`).join('')}</tr>` +
      rows.map(([n, f]) => `<tr><td>${n}</td>${st.hunters.map((h) => `<td>${f(h)}</td>`).join('')}</tr>`).join('');
    $('#btnRematch').textContent = '🔁 再狩獵一次'; $('#btnSwap').style.display = 'none'; $('#btnMenu').textContent = '↩ 回選單';
    show('result');
    if (win && BD.sfx) BD.sfx.play('victory', 0.7);
    state.screen = 'result';
  }

  function showHordeResult(w) {
    state.resultShown = true; state.resultKind = 'horde';
    const H = w.horde, b = H.hero, mm = Math.floor(w.time / 60), ss = Math.floor(w.time % 60);
    $('#btnRematch').textContent = '🔁 再戰一次'; $('#btnSwap').style.display = 'none'; $('#btnMenu').textContent = '↩ 重新選角';
    $('#resTitle').innerHTML = `<span style="color:${b.def.color}">${b.name}</span> 被雜兵潮淹沒`;
    $('#resSub').textContent = `撐了 ${mm} 分 ${ss} 秒 · 擊倒 ${H.kills} 隻 · 場上最多 ${H.peak} 隻`;
    $('#resStats').innerHTML = [['已湧出雜兵', H.spawned], ['造成傷害', Math.round(b.stats.dealt)], ['施放技能次數', b.stats.skills], ['翻滾 / 完美閃避', `${b.stats.dodges} / ${b.stats.perfect}`], ['被架勢崩潰', b.stats.breaks]]
      .map(([n, v]) => `<tr><td>${n}</td><td>${v}</td></tr>`).join('');
    show('result');
    state.screen = 'result';
  }

  function showResult(w) {
    state.resultShown = true; state.resultKind = 'duel';
    $('#btnRematch').textContent = '🔁 重賽（同組合）'; $('#btnSwap').style.display = ''; $('#btnMenu').textContent = '↩ 重新選角';
    const win = w.winner;
    $('#resTitle').innerHTML = w.teamMode ? `<span style="color:${R.TEAM[win.team]}">${win.team ? '紅方' : '藍方'}</span> 獲勝！`
      : `<span style="color:${win.def.color}">${win.name}</span> 獲勝！`;
    const mm = Math.floor(w.time / 60), ss = Math.floor(w.time % 60);
    const paceName = BD.PACES[w.paceId] ? BD.PACES[w.paceId].name : w.paceId;
    $('#resSub').textContent = `戰鬥時間 ${mm} 分 ${ss} 秒 · ` + (w.teamMode ? `存活 ${w.bosses.filter((b) => b.state !== 'dead').length} 位` : `勝者剩餘 HP ${Math.ceil(win.hp)} / ${win.maxHp}`) + ` · 節奏 ${paceName}`;
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
    const L = w.bosses;
    $('#resStats').innerHTML = `<tr><th></th>${L.map((b) => `<th style="color:${b.def.color}">${b.team ? '紅方' : '藍方'} ${b.name}</th>`).join('')}</tr>` +
      rows.map(([n, f]) => `<tr><td>${n}</td>${L.map((b) => `<td>${f(b)}</td>`).join('')}</tr>`).join('');
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
    if (k === 'Tab' && !w.training && !w.hunt && !w.horde) { // 聚焦模式：全體 → 每位存活 Boss → 全體
      const order = [null, ...w.bosses.map((b, i) => (b.state !== 'dead' ? i : -1)).filter((i) => i >= 0)];
      view.focus = order[(order.indexOf(view.focus) + 1) % order.length];
      return;
    }
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
      syncLayout();
      ctx.setTransform(state.scale, 0, 0, state.scale, 0, 0);
      const w = state.world;
      if (w) {
        if (!document.hidden) w.tick(dt);
        if (BD.sfx) BD.sfx.tick(w, dt);
        const rt = performance.now();
        R.render(ctx, w, view);
        if (R.perf) R.perf.push(frameMs, performance.now() - rt);
        if (w.training) {
          view.player = w.training.mode === 'player' ? 0 : null;
          if (BD.TrainingUI) BD.TrainingUI.update(w);
        }
        if (w.over && !state.resultShown) (w.hunt ? showHuntResult : w.hunt4 ? showHunt4Result : w.horde ? showHordeResult : showResult)(w);
      } else {
        if (R.perf) R.perf.push(frameMs, 0);
        ctx.fillStyle = '#050407'; ctx.fillRect(0, 0, R.W, R.H);
        if (R.perf) R.perf.drawNotice(ctx);
      }
      if (state.screen === 'select' && (portraitT -= dt) <= 0) { portraitT = 1 / (matchMedia('(pointer: coarse)').matches ? 12 : 30); for (const [c, d] of portraits) R.portrait(c, d); }
    } catch (e) { state.errors.push(String(e && e.stack || e)); console.error(e); }
    requestAnimationFrame(frame);
  }
  if (BD.Touch) BD.Touch.create($('#app'), input, state, view);
  if (BD.TrainingUI) BD.TrainingUI.create($('#app'), canvas);
  BD.HuntUI.create($('#app'), { onStart: startHunt, onBack: () => show('select') });
  setMode(state.mode);
  buildSelect();
  requestAnimationFrame(frame);
})(window);
