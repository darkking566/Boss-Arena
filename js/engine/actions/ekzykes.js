'use strict';
// 艾格基斯專屬規則。原作意象：腐敗累積 / 留地腐霧；數值、反應被動為本遊戲改編。
(function (G) {
  const BD = G.BD;
  BD.defineStatus('rotbuildup', {
    name: '腐敗累積', tags: ['buildup', 'debuff'], stacking: 'stack', maxStacks: 100, defaultDur: 10, visual: 'rotbuildup',
    onApply(u, st, opts, w) {
      if (BD.hasStatus(u, 'scarletrot')) { BD.removeStatus(u, 'rotbuildup', 'already-rotting', w); return; }
      if (st.stacks < 100) return;
      BD.removeStatus(u, 'rotbuildup', 'threshold', w);
      if (!w || u.state === 'dead' || u.state === 'transition') return;
      BD.applyStatus(u, 'scarletrot', { dur: 8, source: st.source }, w);
      BD.spawnFx(w, 'ekzykesrot', u.x, u.y, { src: st.source, radius: u.r + 55 });
      w.fx.text(u.x, u.y - u.r - 32, '猩紅腐敗', '#ed795a', 20);
    },
    onTick(u, st, dt, w) {
      st.stacks = Math.max(0, st.stacks - 5 * dt);
      if (st.stacks <= 0) BD.removeStatus(u, 'rotbuildup', 'decay', w);
    },
  });
  const rotDps = (u) => 8 + Math.min(12, (u.maxHp || u.maxHpMinion || 1000) * 0.002);
  BD.defineStatus('scarletrot', {
    name: '猩紅腐敗', tags: ['dot', 'debuff'], stacking: 'max', defaultDur: 8, visual: 'scarletrot', dps: rotDps,
    onApply(u, st) { if (!st.data) st.data = { acc: 0 }; },
    onTick(u, st, dt, w) {
      st.data.acc += dt;
      while (st.data.acc >= 0.5) { st.data.acc -= 0.5; BD.statusDamage(w, u, st, rotDps(u) * 0.5); }
    },
  });
  // 四次正傷害後洩霧，有明確預警與 7 秒間隔；由 tick 結算，沒有殘留計時回呼。
  BD.defineTrait('rottingbody', {
    interceptDamage(w, b, src, p) {
      if (!src || p.dot || !(p.dmg > 0) || BD.getMod(b, 'invuln') || BD.getMod(b, 'untargetable')) return null;
      if ((b._rotCooldown || 0) > 0 || b._rotPending != null) return null;
      b._rotHits = (b._rotHits || 0) + 1;
      if (b._rotHits < 4) return null;
      b._rotHits = 0; b._rotCooldown = 7; b._rotPending = { rem: 0.55, x: b.x, y: b.y };
      BD.K.addTele(w, b, null, { kind: 'circle', x: b.x, y: b.y, r: 195 }, 0.55, { detached: true, color: '#e1785c' });
      return null;
    },
    tick(w, b, dt) {
      b._rotCooldown = Math.max(0, (b._rotCooldown || 0) - dt);
      if (b.state === 'transition' || BD.getMod(b, 'untargetable')) { b._rotPending = null; b._rotHits = 0; return; }
      if (b._rotPending == null) return;
      b._rotPending.rem -= dt;
      if (b._rotPending.rem > 0) return;
      const { x, y } = b._rotPending;
      b._rotPending = null;
      BD.makeZone(w, b, x, y, { kind: 'scarletrot', r: 195, dur: 3.4, dps: 9, delay: 0, status: { id: 'rotbuildup', stacks: 12, dur: 10 } });
      BD.spawnFx(w, 'ekzykesspore', x, y, { src: b, radius: 195 });
      w.log(b, '腐軀洩霧：受創的菌絲灑出腐敗孢子。', true);
    },
    onReset(w, b) { b._rotHits = 0; b._rotCooldown = 0; b._rotPending = null; },
  });
})(typeof window !== 'undefined' ? window : globalThis);
