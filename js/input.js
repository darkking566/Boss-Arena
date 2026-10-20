'use strict';
// 輸入與玩家操控
(function (G) {
  const BD = G.BD, U = BD.U;
  class Input {
    constructor(canvas) {
      this.keys = new Set(); this.mouse = { sx: 700, sy: 400, get x() { return this.sx + BD.Render.cam.x; }, get y() { return this.sy + BD.Render.cam.y; } }; this.buffer = []; this.canvas = canvas;
      this.onKey = null;
      window.addEventListener('keydown', (e) => {
        const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if ([' ', 'Tab'].includes(e.key)) e.preventDefault();
        if (!this.keys.has(k)) this.press(k);
        this.keys.add(k);
        if (this.onKey) this.onKey(k, e);
      });
      window.addEventListener('keyup', (e) => { this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); });
      window.addEventListener('blur', () => this.keys.clear());
      canvas.addEventListener('mousemove', (e) => this.moveTo(e));
      canvas.addEventListener('mousedown', (e) => { this.moveTo(e); this.press(e.button === 2 ? 'mouse2' : 'mouse0'); e.preventDefault(); });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    moveTo(e) {
      const r = this.canvas.getBoundingClientRect(), R = BD.Render;
      this.mouse.sx = (e.clientX - r.left) / r.width * R.W - R.OX;
      this.mouse.sy = (e.clientY - r.top) / r.height * R.H - R.OY;
    }
    press(k) { this.buffer.push({ k, t: performance.now() }); }
    take(winMs) { const now = performance.now(), win = winMs || 280; this.buffer = this.buffer.filter((b) => now - b.t < win); return this.buffer; }
  }
  BD.Input = Input;

  const SKILL_KEYS = ['mouse0', 'mouse2', 'q', 'e', 'r', 'f', 'c', 'v', 'g'];
  const DRINK = { 1: 'hp', 2: 'mana' }; // 獵魂模式藥水鍵
  class PlayerController {
    constructor(b, w, input) { this.b = b; this.w = w; this.input = input; this.isPlayer = true; }
    aimPoint() { return { x: this.input.mouse.x, y: this.input.mouse.y, vx: 0, vy: 0 }; }
    update() {
      const b = this.b, I = this.input, k = I.keys;
      let mx = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0), my = (k.has('s') ? 1 : 0) - (k.has('w') ? 1 : 0);
      const l = Math.hypot(mx, my);
      if (l) { mx /= l; my /= l; }
      b.moveX = mx; b.moveY = my;
      b.wantFace = U.angTo(b, this.aimPoint());
      // 輸入緩衝：忙碌時保留 0.28 秒（沉重模式依 inputBuffer 加長）
      const buf = I.take(b.def.pace && b.def.pace.inputBuffer ? b.def.pace.inputBuffer * 1000 : 280);
      for (let i = 0; i < buf.length; i++) {
        const key = buf[i].k; let ok = false;
        if (key === ' ') ok = b.tryDodge(l ? Math.atan2(my, mx) : b.face + Math.PI);
        else if (key === 'x') ok = b.startSkill(b.ultimate);
        else if (b.hunt && DRINK[key]) ok = BD.Hunt.drink(b, DRINK[key]);
        else { const idx = SKILL_KEYS.indexOf(key); if (idx >= 0 && b.skills[idx]) ok = b.startSkill(b.skills[idx]); else ok = true; }
        if (ok || ![...SKILL_KEYS, 'x', ' ', '1', '2'].includes(key)) { buf.splice(i, 1); i--; }
      }
    }
  }
  BD.PlayerController = PlayerController;
})(typeof window !== 'undefined' ? window : globalThis);
