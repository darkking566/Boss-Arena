'use strict';
// 觸控操作層（僅瀏覽器、僅觸控裝置）：虛擬搖桿、技能按鈕、暫停／變速／離開；瞄準預設自動鎖定對手，點畫布可手動瞄準
(function (G) {
  const BD = G.BD, R = BD.Render;
  const KEYS = ['mouse0', 'mouse2', 'q', 'e', 'r', 'f', 'c', 'v', 'g'];
  const SPEEDS = ['1', '2', '3', '4']; // 對應 ×1 ×2 ×3 ×0.5（沿用鍵盤 1~4）
  const fake = { preventDefault() {}, shiftKey: false, code: '' };

  function el(tag, cls, text) { const d = document.createElement(tag); if (cls) d.className = cls; if (text != null) d.textContent = text; return d; }

  function create(app, input, state, view) {
    if (!(matchMedia('(pointer: coarse)').matches || 'ontouchstart' in G)) return;
    const root = el('div', 'tc hidden'), stick = el('div', 'tc-stick'), knob = el('div', 'tc-knob'), pad = el('div', 'tc-pad'), bar = el('div', 'tc-bar'), hint = el('div', 'tc-hint', '↻ 請把手機橫放以獲得最佳畫面');
    stick.appendChild(knob); root.append(stick, pad, bar); app.append(root, hint);
    document.body.classList.add('touch');

    let manualAimUntil = 0, built = null, spd = 0, sid = null;
    const bind = (b, fn) => { b.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(e); }); return b; };
    const key = (k) => { fake.code = ''; input.onKey && input.onKey(k, fake); };

    // 觀戰／通用按鈕
    bar.append(
      bind(el('button', '', '⏸'), () => key('p')),
      bind(el('button', 'tc-spd', '×1'), (e) => { spd = (spd + 1) % SPEEDS.length; key(SPEEDS[spd]); e.target.textContent = ['×1', '×2', '×3', '×0.5'][spd]; }),
      bind(el('button', '', '☰'), () => key('Escape')));

    // 搖桿：直接寫入 WASD 按鍵集合
    function setStick(dx, dy) {
      const r = 60, l = Math.hypot(dx, dy) || 1, k = Math.min(1, l / r), nx = dx / l * k, ny = dy / l * k;
      knob.style.transform = `translate(${nx * r}px,${ny * r}px)`;
      const on = { d: nx > 0.3, a: nx < -0.3, s: ny > 0.3, w: ny < -0.3 };
      for (const c in on) on[c] ? input.keys.add(c) : input.keys.delete(c);
    }
    stick.addEventListener('pointerdown', (e) => { e.preventDefault(); sid = e.pointerId; stick.setPointerCapture(sid); });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId !== sid) return; const r = stick.getBoundingClientRect(); setStick(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2); });
    const endStick = (e) => { if (e.pointerId !== sid) return; sid = null; setStick(0, 0); };
    stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);

    // 點畫布 = 手動瞄準 1.5 秒，之後回到自動鎖定
    app.addEventListener('pointerdown', (e) => { if (e.target.id === 'game') { input.moveTo(e); manualAimUntil = performance.now() + 1500; } });

    function build(b, hunt) {
      pad.textContent = '';
      const add = (label, k, cls) => pad.appendChild(bind(el('button', cls || '', label), () => input.press(k)));
      add('翻滾', ' ', 'tc-roll'); add('大招', 'x', 'tc-ult');
      b.skills.forEach((s, i) => { if (KEYS[i]) add(i === 0 ? '普攻' : (s.name || KEYS[i]).slice(0, 4), KEYS[i]); });
      if (hunt) { add('❤', '1'); add('✦', '2'); }
    }

    function tick() {
      const w = state.world, p = w && state.screen === 'game' && view.player != null ? w.bosses[view.player] : null;
      root.classList.toggle('hidden', state.screen !== 'game');
      root.classList.toggle('play', !!p);
      hint.classList.toggle('on', state.screen === 'game');
      if (p) {
        if (built !== p) { built = p; build(p, !!w.hunt); }
        if (performance.now() > manualAimUntil && p.enemy) { // 自動鎖定：把螢幕座標反推成指向對手
          const z = R.zoom, m = input.mouse, e = p.enemy;
          m.sx = z.fx + (e.x - R.cam.x - z.fx) * z.z; m.sy = z.fy + (e.y - R.cam.y - z.fy) * z.z;
        }
      } else if (built) { built = null; setStick(0, 0); }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  BD.Touch = { create };
})(window);
