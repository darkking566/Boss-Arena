'use strict';
// 核心狀態：取代舊有旗標（無敵 / 閃避無敵 / 階段轉換 / 隱身 / 見切架式 / 緩速 / 定身 / 凍結 / 硬直 / 延長賽狂暴）
// 本檔僅定義內容；實際套用與讀取由後續任務接到 Boss / World。
(function (G) {
  const BD = G.BD;

  BD.defineStatus('iframe', {
    name: '閃避無敵', tags: ['defense'], stacking: 'max',
    modifiers: { iframe: true }, hud: false,
  });

  BD.defineStatus('invuln', {
    name: '無敵', tags: ['buff', 'defense'], stacking: 'max',
    modifiers: { invuln: true },
  });

  BD.defineStatus('transition', {
    name: '階段轉換', tags: ['phase'], bindState: 'transition',
    modifiers: { invuln: true, canAct: false },
  });

  BD.defineStatus('hidden', {
    name: '隱身', tags: ['buff'], stacking: 'max',
    modifiers: { untargetable: true, noCollide: true },
  });

  BD.defineStatus('counter', {
    name: '見切架式', tags: ['stance'], stacking: 'refresh',
    modifiers: { counter: true },
  });

  BD.defineStatus('slow', {
    name: '緩速', tags: ['debuff'], stacking: 'max',
    modifiers: { speedMul: 0.55 },
  });

  BD.defineStatus('root', {
    name: '定身', tags: ['debuff', 'root'], stacking: 'max',
    modifiers: { canMove: false, canDodge: false },
  });

  BD.defineStatus('frozen', {
    name: '凍結', tags: ['cc'], bindState: 'stun',
    onApply: function (u, st, opts, w) {
      if (opts.dur) u.setState('stun', opts.dur);
      if (w && w.fx) w.fx.text(u.x, u.y - u.r - 30, '凍結！', '#aef', 20);
    },
  });

  // 暈眩（菲歐拉招架反擊命中）：同凍結，無法行動
  BD.defineStatus('stun', {
    name: '暈眩', tags: ['cc'], bindState: 'stun', visual: 'stun',
    onApply: function (u, st, opts, w) {
      if (opts.dur && u.setState) u.setState('stun', opts.dur); // 召喚物沒有 setState
      if (w && w.fx) w.fx.text(u.x, u.y - u.r - 30, '暈眩！', '#ffe27a', 20);
    },
  });

  BD.defineStatus('stagger', {
    name: '硬直', tags: ['cc'], bindState: 'stagger',
    modifiers: { dmgTakenMul: 1.3 },
    onApply: function (u, st, opts) { if (opts.dur) u.setState('stagger', opts.dur); },
  });

  // 擊倒（沉重模式）：倒地期間無法行動、承受傷害降低；起身後獲得短暫保護與無敵
  BD.defineStatus('knockdown', {
    name: '倒地', tags: ['cc'], bindState: 'knockdown', visual: 'stagger',
    modifiers: { canAct: false, canDodge: false, canMove: false, dmgTakenMul: 0.75 },
    onApply: function (u, st, opts, w) {
      if (opts.dur) u.setState('knockdown', opts.dur);
      if (w && w.fx) {
        w.fx.text(u.x, u.y - u.r - 30, '倒地！', '#ffb070', 22);
        w.fx.ring(u.x, u.y, 10, 95, 0.5, 'rgba(210,190,160,0.8)', 6);
        w.fx.smoke(u.x, u.y, 'rgba(190,170,140,0.45)', 14, u.r + 10);
      }
    },
    onRemove: function (u, st, w, reason) {
      if (reason === 'end' && u.def.pace) {
        BD.applyStatus(u, 'kdGuard', { dur: u.def.pace.knockdown.guard }, w);
        BD.applyStatus(u, 'iframe', { dur: 0.3, stacking: 'refresh' }, w);
        if (w && w.fx) w.fx.text(u.x, u.y - u.r - 30, '起身', '#ffe0b0', 16);
      }
    },
  });

  // 起身保護（沉重模式）：擊倒起身後的短暫免疫擊倒
  BD.defineStatus('kdGuard', {
    name: '起身保護', tags: ['defense'], stacking: 'max', visual: 'invuln',
    modifiers: {}, hud: false,
  });

  BD.defineStatus('overtime', {
    name: '延長賽狂暴', tags: ['debuff', 'overtime'], order: -10, stacking: 'max',
    modifiers: { dmgTakenMul: function (u) { return u.world.enrage; } },
  });
})(typeof window !== 'undefined' ? window : globalThis);
