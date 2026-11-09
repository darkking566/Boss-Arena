'use strict';
// 玻列琉斯：凍傷是爆發／易傷／耐力恢復下降；不改魔女原有的冰凍值。
(function (G) {
  const BD = G.BD, bound = new WeakSet();
  function fireStatus(id) { const s = BD.statusDefs[id]; return s && s.tags.includes('fire'); }
  // 傷害語意來自明確屬性／燃燒狀態；不讀 fxEl 或施放者造型。
  function fireHit(p) {
    return p.damageEl === 'fire' || (p.statusDmg && fireStatus(p.statusDmg)) ||
      (p.status && [].concat(p.status).some(s => fireStatus(s.id)));
  }
  function bind(w) {
    if (!w || bound.has(w)) return;
    bound.add(w);
    const thaw = ({ b, p, dmg }) => {
      if (!(dmg > 0) || !BD.hasStatus(b, 'rimebite') || !fireHit(p)) return;
      BD.removeStatus(b, 'rimebite', 'fire', w);
      BD.applyStatus(b, 'rimeguard', { dur: 2 }, w);
      BD.spawnFx(w, 'borealisthaw', b.x, b.y, { radius: b.r + 30 });
      w.fx.text(b.x, b.y - b.r - 28, '回溫', '#d3edf1', 17);
    };
    w.on('damage', thaw); w.on('minionDamage', thaw); w.on('elementHit', thaw);
  }
  BD.defineStatus('rimebuildup', {
    name: '凍傷累積', tags: ['buildup', 'ice', 'debuff'], stacking: 'stack', maxStacks: 100, defaultDur: 10, visual: 'rimebuildup',
    onApply(u, st, opts, w) {
      bind(w);
      if (BD.hasStatus(u, 'rimebite') || BD.hasStatus(u, 'rimeguard')) { BD.removeStatus(u, 'rimebuildup', 'protected', w); return; }
      if (st.stacks < 100) return;
      BD.removeStatus(u, 'rimebuildup', 'threshold', w);
      if (!w || u.state === 'dead' || u.state === 'transition' || u.alive === false || !(u.hp > 0)) return;
      BD.applyStatus(u, 'rimebite', { dur: 8, source: st.source }, w);
    },
    onTick(u, st, dt, w) {
      st.stacks = Math.max(0, st.stacks - 5 * dt);
      if (st.stacks <= 0) BD.removeStatus(u, 'rimebuildup', 'decay', w);
    },
  });
  BD.defineStatus('rimebite', {
    name: '凍傷', tags: ['ice', 'debuff'], stacking: 'max', defaultDur: 8, visual: 'rimebite',
    modifiers: { dmgTakenMul: 1.12, staminaRegenMul: 0.85 },
    onApply(u, st, opts, w, isNew) { bind(w); if (isNew) st.data = { burst: true }; },
    onTick(u, st, dt, w) {
      if (!st.data.burst) return;
      st.data.burst = false; // 下一個狀態步結算，避免在原始命中尚未判定死亡前重入。
      if (!w || u.state === 'dead' || u.alive === false || !(u.hp > 0) || BD.getMod(u, 'invuln') || BD.getMod(u, 'untargetable')) return;
      const dmg = 60 + Math.min(300, (u.maxHp || u.maxHpMinion || 500) * 0.06);
      BD.spawnFx(w, 'borealisburst', u.x, u.y, { src: st.source, radius: u.r + 55 });
      w.fx.text(u.x, u.y - u.r - 32, '凍傷！', '#b9edff', 23);
      BD.statusDamage(w, u, st, dmg);
    },
  });
  BD.defineStatus('rimeguard', { name: '回溫', tags: ['ice', 'buff'], defaultDur: 2, visual: 'rimeguard' });
  BD.defineTrait('freezingfog', {
    tick(w, b, dt) {
      if (w.intro > 0) return;
      if (b.state === 'transition' || BD.getMod(b, 'untargetable')) { b._rimeTimer = 0; b._rimePending = null; return; }
      if (b._rimePending) {
        const p = b._rimePending; p.rem -= dt;
        if (p.rem > 0) return;
        b._rimePending = null;
        // 至多一個自己的被動霧圈；普通技能的霧不受此限制。
        if (b._rimeZone && w.zones.includes(b._rimeZone)) return;
        BD.makeZone(w, b, p.x, p.y, { kind: 'rimefog', r: p.r, dur: 3, delay: 0, dps: 6, status: { id: 'rimebuildup', stacks: 12, dur: 10 } });
        b._rimeZone = w.zones[w.zones.length - 1];
        BD.spawnFx(w, 'borealisfog', p.x, p.y, { src: b, radius: p.r });
        w.log(b, '冰結湖遺霧：霜線亮起，貼身白霧沿地面散開。', true);
        return;
      }
      b._rimeTimer = (b._rimeTimer || 0) + dt;
      if (b._rimeTimer < 8) return;
      b._rimeTimer = 0;
      const r = 205 * (b.sizeMul || 1);
      b._rimePending = { x: b.x, y: b.y, r, rem: 0.65 };
      BD.K.addTele(w, b, null, { kind: 'circle', x: b.x, y: b.y, r }, 0.65, { detached: true, color: '#bce8f1' });
    },
    onReset(w, b) { b._rimeTimer = 0; b._rimePending = null; b._rimeZone = null; },
  });
})(typeof window !== 'undefined' ? window : globalThis);
