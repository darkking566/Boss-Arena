'use strict';
// 訓練場 DOM 面板：底部控制列 + 技能按鈕列（僅瀏覽器；對戰模式完全不受影響）
(function (G) {
  const BD = G.BD, R = BD.Render;

  const MODES = ['ai', 'manual', 'player'];
  const MODE_TEXT = { ai: 'AI', manual: '手動施放', player: '親自操控' };
  const RANGES = ['near', 'mid', 'far'];
  const RANGE_TEXT = { near: '近', mid: '中', far: '遠' };
  const SPEEDS = [0.25, 0.5, 1, 2, 3];
  const SPEED_TEXT = { 0.25: '×0.25', 0.5: '×0.5', 1: '×1', 2: '×2', 3: '×3' };

  function el(tag, cls, text) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }

  let app = null, canvas = null, panel = null, row1 = null, row2 = null;
  let cur = null, lastLayout = '', lastRun = 0, seen = new WeakSet();
  const refs = {};

  function btn(label, title, on, onClick) {
    const b = el('button', on ? 'on' : '', label);
    if (title) b.title = title;
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => { onClick(); b.blur(); });
    return b;
  }

  function group(parent, label, buttons) {
    const g = el('span', 'grp-wrap');
    if (label) g.appendChild(el('span', 'grp', label));
    for (const b of buttons) g.appendChild(b);
    parent.appendChild(g);
    return g;
  }

  function layout() {
    if (!panel || !canvas) return;
    const r = canvas.getBoundingClientRect(), ar = app.getBoundingClientRect();
    if (!r.width) return;
    const s = r.width / R.W;
    const key = [r.left - ar.left, r.top - ar.top, r.width].join(':');
    if (key === lastLayout) return;
    lastLayout = key;
    panel.style.left = (r.left - ar.left + R.OX * s) + 'px';
    panel.style.top = (r.top - ar.top + (R.OY + BD.ARENA.h - 136) * s) + 'px';
    panel.style.transform = `scale(${s})`;
  }

  function build() {
    panel = el('div', 'tp hidden');
    panel.id = 'trainPanel';
    row1 = el('div', 'tp-row');
    row2 = el('div', 'tp-row tp-skills');
    panel.appendChild(row1);
    panel.appendChild(row2);

    // Row 1：操控 / 階段 / 無冷卻 / 距離 / 擊退 / 速度 / 重置
    refs.mode = {};
    group(row1, '操控', MODES.map((m) => {
      const b = btn(MODE_TEXT[m], 'F2 切換', false, () => { const w = cur; if (w) w.training.setMode(m); });
      b.dataset.act = 'mode-' + m; refs.mode[m] = b; return b;
    }));
    refs.phase = {};
    group(row1, '階段', [1, 2].map((p) => {
      const b = btn(p === 1 ? '一階段' : '二階段', '強制切換 Boss 階段（二階段會播放轉場）', false, () => {
        const w = cur; if (w) w.training.setPhase(p);
      });
      b.dataset.act = 'phase-' + p; refs.phase[p] = b; return b;
    }));
    refs.free = btn('無冷卻／無限體力', '技能無冷卻、無限體力（預設開啟）', true, () => {
      const w = cur; if (w) w.training.setFreeCast(!w.training.freeCast);
    });
    refs.free.dataset.act = 'free';
    group(row1, '', [refs.free]);
    refs.range = {};
    group(row1, '假人距離', RANGES.map((id) => {
      const b = btn(RANGE_TEXT[id], '或點擊場地放置假人', false, () => { const w = cur; if (w) w.training.setRange(id); });
      b.dataset.act = 'range-' + id; refs.range[id] = b; return b;
    }).concat([el('span', 'hint', '或點擊場地')]));
    refs.kb = {};
    group(row1, '擊退', [['return', '歸位'], ['pin', '固定']].map(([id, label]) => {
      const b = btn(label, '假人被擊退後回到原位／原地固定', false, () => { const w = cur; if (w) w.training.setKbMode(id); });
      b.dataset.act = 'kb-' + id; refs.kb[id] = b; return b;
    }));
    refs.speed = {};
    group(row1, '速度', SPEEDS.map((v) => {
      const b = btn(SPEED_TEXT[v], `速度 ×${v}`, false, () => { const w = cur; if (w) w.speed = v; });
      b.dataset.act = 'speed-' + v; refs.speed[v] = b; return b;
    }));
    refs.pause = btn('⏸ 暫停', 'P 暫停／繼續', false, () => { const w = cur; if (w) w.paused = !w.paused; });
    refs.pause.dataset.act = 'pause';
    group(row1, '', [refs.pause]);
    const bReset = btn('↺ 重置', 'F9 重置（Boss 回一階段滿血、清除召喚物／區域／投射物／陷阱／狀態、假人回原位、清除統計）', false, () => { const w = cur; if (w) w.training.reset(); });
    const bClear = btn('清除統計', '只清除傷害統計', false, () => { const w = cur; if (w) w.training.clearStats(); });
    bReset.dataset.act = 'reset'; bClear.dataset.act = 'clear';
    group(row1, '', [bReset, bClear]);
    // 面板上的點擊不要穿透到畫布
    panel.addEventListener('mousedown', (e) => e.stopPropagation());
    app.appendChild(panel);
  }

  function skillButtons(w) {
    row2.textContent = '';
    refs.skill = {};
    const boss = w.training.boss, skills = boss.skills || [];
    skills.forEach((s, i) => {
      const b = btn('', '', false, () => { const tw = cur; if (tw) tw.training.cast(s.id); });
      b.dataset.skill = s.id;
      const bEl = el('b', '', String(i + 1));
      b.appendChild(bEl);
      b.appendChild(document.createTextNode(' ' + s.name));
      const tags = [];
      if ((s.phase || 1) === 2) tags.push('二階段');
      if ((s.maxPhase || 9) === 1) tags.push('僅一階段');
      for (const tg of tags) b.appendChild(el('span', 'tg', tg));
      const range = s.range ? `${s.range[0]}–${s.range[1]}` : '';
      b.title = [s.name, s.desc || '', range, s.cd ? `冷卻 ${s.cd} 秒` : '', ...tags].filter(Boolean).join(' · ');
      row2.appendChild(b);
      refs.skill[s.id] = b;
    });
    const ult = boss.def.ultimate;
    if (ult) {
      const name = ult.name2 ? `${ult.name}／${ult.name2}` : ult.name;
      const b = btn('', '大招（Shift+0）', false, () => { const tw = cur; if (tw) tw.training.cast('ult'); });
      b.dataset.skill = 'ult';
      b.classList.add('ult');
      b.appendChild(el('b', '', '0'));
      b.appendChild(document.createTextNode(` 大招【${name}】`));
      b.title = `大招【${name}】` + (ult.desc ? ' · ' + ult.desc : '');
      row2.appendChild(b);
      refs.skill.ult = b;
    }
  }

  // 技能在目前階段是否可用（只能用於提示，仍可點擊）
  function usable(boss, s) {
    const ph = boss.phase, p = s.phase || 1, mp = s.maxPhase || 9;
    return p <= ph && mp >= ph;
  }

  function toggle(node, on) {
    if (!node) return;
    const has = node.classList.contains('on');
    if (on !== has) node.classList.toggle('on', on);
  }

  function update(w) {
    if (!panel || !w || !w.training || w !== cur) return;
    layout();
    const now = performance.now();
    if (now - lastRun < 100) return;
    lastRun = now;
    const tr = w.training, boss = tr.boss;
    for (const m of MODES) toggle(refs.mode[m], tr.mode === m);
    for (const p of [1, 2]) toggle(refs.phase[p], boss.phase === p);
    toggle(refs.free, tr.freeCast);
    for (const id of RANGES) toggle(refs.range[id], tr.range === id);
    for (const id of ['return', 'pin']) toggle(refs.kb[id], tr.kbMode === id);
    for (const v of SPEEDS) toggle(refs.speed[v], Math.abs(w.speed - v) < 1e-6);
    toggle(refs.pause, w.paused);
    if (refs.pause) refs.pause.textContent = w.paused ? '▶ 繼續' : '⏸ 暫停';
    // 技能按鈕：施放中 / 階段鎖定 / 冷卻
    for (const s of boss.skills || []) {
      const b = refs.skill[s.id];
      if (!b) continue;
      const active = !!(boss.inst && boss.inst.skill === s);
      const locked = !usable(boss, s);
      const cd = Math.max(0, boss.cds[s.id] || 0);
      if (b.classList.contains('active') !== active) b.classList.toggle('active', active);
      if (b.classList.contains('locked') !== locked) b.classList.toggle('locked', locked);
      const showCd = !tr.freeCast && !locked && cd > 0;
      if (b.classList.contains('cd') !== showCd) b.classList.toggle('cd', showCd);
      const cdEl = b.querySelector('.cdt');
      if (showCd) {
        if (!cdEl) b.appendChild(el('span', 'cdt', ''));
        const t = b.querySelector('.cdt');
        const txt = cd.toFixed(1) + 's';
        if (t.textContent !== txt) t.textContent = txt;
      } else if (cdEl) cdEl.remove();
    }
    const ub = refs.skill.ult;
    if (ub) {
      const active = !!(boss.inst && boss.inst.skill && boss.inst.skill.ult);
      if (ub.classList.contains('active') !== active) ub.classList.toggle('active', active);
      const ultTxt = tr.freeCast ? '' : `大招 ${Math.floor(boss.ult)}%`;
      let t = ub.querySelector('.cdt');
      if (ultTxt) {
        if (!t) { t = el('span', 'cdt', ''); ub.appendChild(t); }
        if (t.textContent !== ultTxt) t.textContent = ultTxt;
        if (!ub.classList.contains('cd')) ub.classList.add('cd');
      } else {
        if (t) t.remove();
        if (ub.classList.contains('cd')) ub.classList.remove('cd');
      }
    }
    // 通知：轉成畫面右上角的提示
    // （引擎會修剪舊通知，故以物件本身記錄是否已顯示）
    for (const n of tr.notices || []) {
      if (seen.has(n)) continue;
      seen.add(n);
      if (R.perf && R.perf.notice) R.perf.notice(n.text);
    }
  }

  function show(w) {
    if (!panel) return;
    cur = w || null;
    seen = new WeakSet();
    if (cur) skillButtons(cur);
    lastLayout = '';
    panel.classList.remove('hidden');
    layout();
  }

  function hide() {
    cur = null;
    if (panel) panel.classList.add('hidden');
  }

  function create(a, c) {
    app = a; canvas = c;
    build();
    window.addEventListener('resize', layout);
    // 點擊場地放置假人（非「親自操控」時）
    canvas.addEventListener('mousedown', (e) => {
      const w = cur;
      if (!w || !w.training || e.button !== 0 || w.training.mode === 'player') return;
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const x = (e.clientX - r.left) / r.width * R.W - R.OX;
      const y = (e.clientY - r.top) / r.height * R.H - R.OY;
      const A = BD.ARENA;
      if (x < 0 || y < 0 || x > A.w || y > A.h) return;
      w.training.setHome(x, y);
    });
    return api;
  }

  const api = { create, show, hide, update, layout };
  BD.TrainingUI = api;
})(typeof window !== 'undefined' ? window : globalThis);
