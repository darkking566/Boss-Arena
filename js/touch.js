'use strict';
// Pointer Events allow independent movement, aiming and skills with multiple fingers.
(function (G) {
  const BD = G.BD, R = BD.Render;
  function el(tag, cls, text) { const d = document.createElement(tag); d.className = cls || ''; if (text != null) d.textContent = text; return d; }
  function create(app, input, state, view) {
    if (!matchMedia('(pointer: coarse)').matches && !navigator.maxTouchPoints) return;
    document.body.classList.add('touch');
    const root = el('div', 'tc hidden'), bar = el('div', 'tc-bar'), stick = el('div', 'tc-stick'), knob = el('div', 'tc-knob'), pad = el('div', 'tc-pad');
    root.setAttribute('aria-label', '觸控戰鬥操作');
    stick.setAttribute('aria-label', '移動搖桿'); stick.append(knob);
    const status = el('div', 'tc-status'), sheet = el('div', 'tc-sheet'); sheet.hidden = true;
    root.append(bar, status, stick, pad, sheet); app.append(root);
    let sid = null, built = null, manualAimUntil = 0, menuWorld = null, wasPaused = false, last = 0, buttons = [];
    function button(parent, label, fn, cls) {
      const b = el('button', cls, label); b.type = 'button'; b.setAttribute('aria-label', label);
      b.addEventListener('click', e => { e.preventDefault(); fn(); }); parent.append(b); return b;
    }
    const key = k => input.onKey && input.onKey(k, { preventDefault() {}, shiftKey: false, code: '' });
    function reset() { sid = null; input.touchMove = null; knob.style.transform = ''; }
    function closeMenu() { sheet.hidden = true; if (menuWorld === state.world) menuWorld.paused = wasPaused; menuWorld = null; }
    const pause = button(bar, '暫停', () => { reset(); state.world.paused = !state.world.paused; });
    const speed = button(bar, '×1', () => { const w = state.world, speeds = [0.5, 1, 2, 3]; w.speed = speeds[(speeds.indexOf(w.speed) + 1) % speeds.length]; });
    button(bar, '選單', () => {
      if (!sheet.hidden) return closeMenu();
      reset(); menuWorld = state.world; wasPaused = menuWorld.paused; menuWorld.paused = true; sheet.hidden = false;
    });
    sheet.append(el('h2', '', '戰鬥選單'), el('p', '', '左手移動 · 右手施放技能。預設自動瞄準，點場地可暫時指定方向。橫放手機可獲得更大視野。'));
    button(sheet, '繼續戰鬥', closeMenu, 'primary');
    button(sheet, '切換戰鬥紀錄', () => key('l'));
    button(sheet, '切換攻擊預警', () => key('t'));
    button(sheet, '全螢幕', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await app.requestFullscreen(); } catch (_) { status.textContent = '此瀏覽器不支援全螢幕，可使用橫向畫面'; } });
    button(sheet, '返回選角／據點', () => { closeMenu(); key('Escape'); reset(); });
    function move(e) {
      const r = stick.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
      const len = Math.hypot(dx, dy), radius = r.width * .32, strength = Math.min(1, len / radius);
      input.touchMove = len < 8 ? { x: 0, y: 0 } : { x: dx / len * strength, y: dy / len * strength };
      knob.style.transform = `translate(${len ? dx / len * strength * radius : 0}px,${len ? dy / len * strength * radius : 0}px)`;
    }
    stick.addEventListener('pointerdown', e => { if (sid !== null) return; e.preventDefault(); sid = e.pointerId; stick.setPointerCapture(sid); move(e); });
    stick.addEventListener('pointermove', e => { if (sid === e.pointerId) move(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => stick.addEventListener(type, e => { if (sid === e.pointerId) reset(); }));
    window.addEventListener('blur', reset); window.addEventListener('resize', reset);
    document.addEventListener('visibilitychange', () => { reset(); if (document.hidden && state.world && state.screen === 'game') state.world.paused = true; });
    app.addEventListener('pointerdown', e => { if (e.target.id === 'game' && state.screen === 'game') { input.moveTo(e); manualAimUntil = performance.now() + 1500; } });
    function build(b, w) {
      pad.replaceChildren(); buttons = [];
      const add = (name, k, skill, cls) => {
        const btn = button(pad, name, () => {}, cls); btn.replaceChildren(el('span', '', name), el('small', 'tc-cd', ''));
        btn.addEventListener('pointerdown', e => { e.preventDefault(); if (btn.disabled || w.paused || b.state === 'dead') return; if (w.training && w.training.mode === 'manual' && skill) w.training.cast(skill.ult ? 'ult' : skill.id); else input.press(k); });
        buttons.push({ btn, skill, name, k });
      };
      add('翻滾', ' ', null, 'tc-roll');
      b.skills.forEach((s, i) => add(s.name, 'skill:' + i, s));
      add('大招', 'x', b.ultimate, 'tc-ult');
      if (w.hunt) { add('生命藥水', '1'); add('法力藥水', '2'); }
    }
    function tick(now) {
      const w = state.world, active = w && state.screen === 'game';
      root.classList.toggle('hidden', !active);
      const p = active ? (w.training && w.training.mode !== 'ai' ? w.training.boss : view.player != null && w.bosses[view.player].controller.isPlayer ? w.bosses[view.player] : null) : null;
      root.classList.toggle('play', !!p); root.classList.toggle('manual', !!(w && w.training && w.training.mode === 'manual'));
      if (!active) { if (built) reset(); built = null; sheet.hidden = true; menuWorld = null; }
      if (active) {
        pause.textContent = w.paused ? '繼續' : '暫停'; speed.textContent = `×${w.speed}`; speed.hidden = !!p && !w.training;
        if (p && built !== p) { reset(); built = p; build(p, w); }
        if (!p && built) { reset(); built = null; }
        if (p && performance.now() > manualAimUntil && p.enemy) {
          const z = R.zoom, e = p.enemy;
          input.mouse.sx = z.fx + ((e.x - R.cam.x) * R.cam.z - z.fx) * z.z;
          input.mouse.sy = z.fy + ((e.y - R.cam.y) * R.cam.z - z.fy) * z.z;
        }
        if (now - last > 100) {
          last = now;
          status.textContent = p ? `${p.def.name} · ${p.state === 'dead' ? '已倒下' : performance.now() < manualAimUntil ? '手動瞄準' : '自動瞄準'} · HP ${Math.max(0, Math.ceil(p.hp))}` : w.lane ? '拉鋸戰 · 拖曳捲動 · 兩指縮放 · 點兩下全覽' : '觀戰模式 · 橫放手機享受更大視野';
          for (const { btn, skill } of p ? buttons : []) {
            let locked = false, text = '';
            if (skill) {
              locked = (skill.phase || 1) > p.phase || (skill.maxPhase || 9) < p.phase;
              const free = w.training && w.training.freeCast;
              const cd = p.cds[skill.id] || 0;
              text = locked ? '階段未開放' : free ? '就緒' : skill.ult ? `${Math.floor(p.ult)}%` : cd > 0 ? `${cd.toFixed(1)}s` : !p.skillReady(skill) ? '資源不足' : '就緒';
            }
            btn.disabled = locked || p.state === 'dead'; btn.querySelector('small').textContent = text;
            btn.classList.toggle('ready', text === '就緒' || text === '100%');
          }
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  BD.Touch = { create };
})(window);
