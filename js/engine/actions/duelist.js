'use strict';
// 決鬥者動作（菲歐拉）：vitalstep 瞬步到對手的「破綻」方位，以及 duelist 特性（決鬥之舞：從破綻方位命中時追加真實傷害並回復）
// 破綻存在 b._vital（{ ang, t0 }）：對手身上的一個方位（相對對手的世界角度），命中後或 6 秒沒被打到就換新方位
(function (G) {
  const BD = G.BD, U = BD.U, K = BD.K;

  function vitalOf(w, b) {
    if (!b._vital || w.time - b._vital.t0 > 6) b._vital = { ang: w.rng.range(0, U.TAU), t0: w.time };
    return b._vital;
  }
  BD.vitalOf = vitalOf;

  // 閃到對手的破綻方位（off：再偏轉的弧度）並面向對手，留下一道殘影
  BD.defineAction('vitalstep', (w, b, inst, a) => {
    const tgt = b.enemy; // aimTarget 可能是沒有 r 的預判點
    const ang = vitalOf(w, b).ang + (a.off || 0), d = a.dist + tgt.r;
    const [x, y] = K.clampPt(tgt.x + Math.cos(ang) * d, tgt.y + Math.sin(ang) * d, b.r + 10);
    b.trail.push({ x: b.x, y: b.y, face: b.face, life: 0.4 });
    BD.spawnFx(w, 'blink', b.x, b.y, { src: b, toX: x, toY: y });
    b.x = x; b.y = y; w.confine(b); b.face = U.angTo(b, tgt);
  }, { active: true });

  // hit 標記 vital 且剛命中：從破綻方位（±0.8 弧度）命中，或 vital:'all'（終極挑戰：四個破綻全開）→ 追加最大生命比例真實傷害並回復自身
  BD.defineTrait('duelist', {
    onHit(w, b, s, a) {
      const e = b.enemy;
      if (!a.vital || !e || e.state === 'dead' || e.hurtFlash < 0.12 || !U.hitShape(s, e)) return;
      const v = vitalOf(w, b);
      if (a.vital !== 'all' && Math.abs(U.angDiff(U.angTo(e, b), v.ang)) > 0.8) return;
      const pct = (b.phase === 2 ? 0.04 : 0.03) * (a.vital === 'all' ? 0.8 : 1);
      w.damageUnit(b, e, { dmg: e.maxHp * pct / (b.dmgMul || 1), posture: 10, unblockable: true, noPerfect: true });
      b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.015);
      w.fx.text(e.x, e.y - e.r - 40, '破綻！', '#ffe27a', 20);
      BD.spawnFx(w, 'projhit', e.x, e.y, { src: b, el: 'holy', angle: U.angTo(b, e) });
      b._vital = { ang: w.rng.range(0, U.TAU), t0: w.time };
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
