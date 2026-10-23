'use strict';
// 近戰 / 判定類動作：tele 預警、hit 範圍判定、counter 見切架式、invuln 無敵、slashes 連續斬線
(function (G) {
  const BD = G.BD, U = BD.U, K = BD.K;

  // 執行一個時間軸動作（由 Boss.updateSkill 依時間呼叫）
  BD.runAction = function (w, b, inst, a) {
    BD.action(a.do).fn(w, b, inst, a, b.aimTarget());
  };
  // 呼叫 Boss 特性（trait）的掛勾
  BD.traitHook = function (b, hook, ...args) {
    for (const t of b.traits) if (t[hook]) t[hook](...args);
  };

  // 預警是否標示「無法閃避」：預警本身標記 undodgeable，或同一時間軸中緊接在它之後的 hit 標記了 undodgeable
  function teleUndodgeable(inst, a) {
    if (a.undodgeable) return true;
    const acts = inst && inst.v && inst.v.actions;
    if (!acts) return false;
    for (const x of acts) if (x.do === 'hit' && x.at >= a.at) return !!x.undodgeable;
    return false;
  }
  BD.teleUndodgeable = teleUndodgeable;

  BD.defineAction('tele', (w, b, inst, a) => {
    const s = K.resolveShape(w, b, inst, a);
    K.addTele(w, b, inst, s, a.dur, { a, hitIn: a.hitIn != null ? a.hitIn : a.dur, soft: !!a.soft, undodgeable: teleUndodgeable(inst, a),
      follow: !!a.follow && (a.anchor || 'self') !== 'mark' && a.anchor !== 'safe', lockBefore: a.lockBefore != null ? a.lockBefore : 0.2,
      detached: a.anchor === 'safe' });
    if (a.chargeFx !== false && a.dur >= 0.5 && (a.anchor || 'self') === 'self') {
      BD.spawnFx(w, a.chargeFx || 'charge', b.x, b.y, { src: b, life: Math.min(a.dur, 1.4) });
    }
    if (a.teleFx) BD.spawnFx(w, a.teleFx, s.x, s.y, { src: b, life: a.dur, radius: a.r });
  });

  BD.defineAction('hit', (w, b, inst, a) => {
    const s = K.resolveShape(w, b, inst, a);
    w.applyArea(b, s, a);
    BD.hitProps(w, b, s, a);
    K.hitFx(w, b, s, a.fx, { el: a.fxEl, dmg: a.dmg });
    if (a.zone) { const c = K.shapeCenter(s); BD.makeZone(w, b, c.x, c.y, a.zone); }
    BD.traitHook(b, 'onHit', w, b, s, a);
  }, { active: true });

  // 見切 / 彈反架式：期間受到 Boss 的直接攻擊會觸發反擊（需要 'counter' 特性）
  BD.defineAction('counter', (w, b, inst, a) => {
    BD.applyStatus(b, 'counter', { data: a }, w);
    BD.spawnFx(w, a.stanceFx || 'stance', b.x, b.y, { src: b, life: a.dur });
  }, { active: true, duration: true, requiresTrait: 'counter' });

  BD.defineAction('invuln', (w, b, inst, a) => { BD.applyStatus(b, 'invuln', { dur: a.dur }, w); });

  // 萬花筒反噬（鼬）：施放萬花筒招式損耗眼力與體力——扣最大生命的 a.pct（不會因此倒下）
  BD.defineAction('strain', (w, b, inst, a) => {
    b.hp = Math.max(1, b.hp - b.maxHp * a.pct);
    w.fx.text(b.x + 30, b.y - b.r - 8, '血淚', '#ff3048', 16);
    w.fx.sparkle(b.x, b.y - 4, '#d0102a', 5, 120, -Math.PI / 2, 1.2);
  });

  // 斬線可指定 fx（例如 threadcut）：此時傳入 hold＝距離最後一擊的秒數，讓刀痕等到最後一齊裂開
  BD.defineAction('slashes', (w, b, inst, a) => {
    const endT = a.n * a.interval + 0.1 + a.final.tele;
    const one = (delay, ang, p) => {
      w.later(delay, () => {
        const t = b.enemy;
        const cx = t.x + w.rng.range(-25, 25), cy = t.y + w.rng.range(-25, 25);
        const angs = Array.isArray(ang) ? ang : [ang == null ? w.rng() * Math.PI : ang];
        for (const an of angs) {
          const s = { kind: 'rect', x: cx - Math.cos(an) * p.len / 2, y: cy - Math.sin(an) * p.len / 2, ang: an, len: p.len, w: p.w };
          K.addTele(w, b, null, s, p.tele, { detached: true, color: b.def.color });
          w.later(p.tele, () => {
            w.applyArea(b, s, { dmg: p.dmg, posture: p.posture, kb: 200, from: s });
            BD.hitProps(w, b, s, { dmg: p.dmg, kb: 200, fx: p.fx || 'cross' });
            K.hitFx(w, b, s, p.fx || 'cross', p.fx ? { dmg: p.dmg, hold: endT - delay - p.tele } : { color: '#fff', dmg: p.dmg });
            if (!p.fx) w.fx.shake(5);
          });
        }
      });
    };
    for (let i = 0; i < a.n; i++) one(i * a.interval, null, a);
    const fa = w.rng() * Math.PI;
    one(a.n * a.interval + 0.1, [fa + Math.PI / 4, fa - Math.PI / 4], a.final);
  }, { active: true });
})(typeof window !== 'undefined' ? window : globalThis);
