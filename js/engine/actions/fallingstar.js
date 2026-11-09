'use strict';
// 墜星成獸專屬規則。原作意象：重力魔法把附近的人吸過去（Gravitas）；數值與「星核引力」反應被動為本遊戲改編。
(function (G) {
  const BD = G.BD;
  // 以 (x, y) 為中心把範圍內的敵人往中心拉：擊退方向朝內，翻滾無敵幀照常可以躲。
  BD.gravityPull = function (w, b, x, y, r, p, fx) {
    for (const u of w.enemiesOf(b.team)) {
      if (u.state === 'dead' || Math.hypot(u.x - x, u.y - y) > r + u.r) continue;
      w.damageUnit(b, u, { dmg: p.dmg, posture: p.posture, kb: p.kb, kbAng: Math.atan2(y - u.y, x - u.x) });
    }
    BD.spawnFx(w, fx || 'fspull', x, y, { src: b, radius: r });
  };
  BD.defineAction('gravpull', (w, b, inst, a) => {
    const k = b.sizeMul || 1;
    BD.gravityPull(w, b, b.x, b.y, a.r * k, a, a.fx);
  }, { active: true });

  const PULSE_R = 300;
  // 四次正傷害後眼核發光，0.6 秒預警（位置固定）後吸人；8 秒間隔；由 tick 結算，沒有殘留計時回呼。
  BD.defineTrait('starcore', {
    interceptDamage(w, b, src, p) {
      if (!src || p.dot || !(p.dmg > 0) || BD.getMod(b, 'invuln') || BD.getMod(b, 'untargetable')) return null;
      if ((b._coreCooldown || 0) > 0 || b._corePending != null) return null;
      b._coreHits = (b._coreHits || 0) + 1;
      if (b._coreHits < 4) return null;
      b._coreHits = 0; b._coreCooldown = 8; b._corePending = { rem: 0.6, x: b.x, y: b.y };
      BD.K.addTele(w, b, null, { kind: 'circle', x: b.x, y: b.y, r: PULSE_R }, 0.6, { detached: true, color: '#a77bff' });
      BD.spawnFx(w, 'fscoreflare', b.x, b.y, { src: b, life: 0.6 });
      return null;
    },
    tick(w, b, dt) {
      b._coreCooldown = Math.max(0, (b._coreCooldown || 0) - dt);
      if (b.state === 'transition' || b.state === 'dead' || BD.getMod(b, 'untargetable')) { b._corePending = null; b._coreHits = 0; return; }
      if (b._corePending == null) return;
      b._corePending.rem -= dt;
      if (b._corePending.rem > 0) return;
      const { x, y } = b._corePending;
      b._corePending = null;
      BD.gravityPull(w, b, x, y, PULSE_R, { dmg: 26, posture: 6, kb: 420 }, 'fspull');
      w.log(b, '星核引力：眼核一亮，周圍的一切被拉了過去。', true);
    },
    onReset(w, b) { b._coreHits = 0; b._coreCooldown = 0; b._corePending = null; },
  });
})(typeof window !== 'undefined' ? window : globalThis);
