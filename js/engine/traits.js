'use strict';
// Boss 特性（trait）：個別 Boss 的特殊機制，Boss 資料以 traits: [...] 啟用
//   counter：見切 / 彈反——架式（do:'counter'）期間被 Boss 直接攻擊時，閃到背後反斬
//   echo：影分身追斬——二階段每記斬擊 / 衝刺在 0.3 秒後由影子以 40% 威力重複
(function (G) {
  const BD = G.BD, K = BD.K;

  function triggerCounter(w, b, attacker) {
    const cs = BD.getStatus(b, 'counter'), p = (cs && cs.data) || { dmg: 150, posture: 60 };
    b.stats.counters++;
    w.fx.text(b.x, b.y - b.r - 30, p.name ? '彈反！' : '見切！', '#ffffff', 26);
    BD.spawnFx(w, 'parry', b.x, b.y, { src: b }); w.hitstop = 0.12;
    w.log(b, (p.name ? '彈反成功，' : '見切成功，') + '看穿了 ' + attacker.name + ' 的攻擊！', true);
    if (!b._riposte) {
      b._riposte = BD.prepSkill({ id: 'riposte', name: p.name || '見切・反斬', track: 20, recovery: 0.35,
        actions: [{ do: 'blink', at: 0.06, to: 'behind', dist: 60 },
          { do: 'hit', at: 0.2, shape: 'cone', r: 140, arc: 2.4, dmg: p.dmg, posture: p.posture, kb: 380, fx: 'slash', unblockable: true }] });
    }
    b.cancelSkill(); b.state = 'idle';
    b.startSkill(b._riposte, { force: true });
  }
  BD.triggerCounter = triggerCounter;

  BD.defineTrait('counter', {
    // 在傷害結算前攔截：回傳非空值即中止此次傷害
    interceptDamage(w, b, src, p) {
      if (BD.hasStatus(b, 'counter') && src && src.isBoss && !p.dot && !p.unblockable) { triggerCounter(w, b, src); return 'countered'; }
      return null;
    },
  });

  function echo(w, b, s, a) {
    const copy = Object.assign({}, s);
    K.addTele(w, b, null, copy, 0.3, { detached: true, color: '#a070ff' });
    w.later(0.3, () => {
      if (b.state === 'dead') return;
      w.applyArea(b, copy, { dmg: a.dmg * 0.4, posture: (a.posture || 0) * 0.4, kb: (a.kb || 0) * 0.4 });
      const P = BD.parseFx(a.fx), isLine = P && (P.id === 'thrust' || P.id === 'cross');
      K.hitFx(w, b, copy, isLine ? 'cross' : 'slash', { color: '#b48cff' });
    });
  }
  BD.defineTrait('echo', {
    onHit(w, b, s, a) { if (b.phase === 2 && !a.multi) echo(w, b, s, a); },
    onDash(w, b, x0, y0, ang, a) { if (b.phase === 2) echo(w, b, { kind: 'rect', x: x0, y: y0, ang, len: a.dist, w: 60 }, Object.assign({ fx: 'cross' }, a.hit)); },
  });
})(typeof window !== 'undefined' ? window : globalThis);
