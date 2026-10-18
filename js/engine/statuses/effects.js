'use strict';
// 全新內容狀態（目前沒有 Boss 使用）：燃燒 / 中毒 / 流血 / 護盾 / 易傷 / 狂暴
// 持續傷害一律透過 BD.statusDamage（world.damageUnit）結算，帶 dot / unblockable / ignoreIframe 旗標。
(function (G) {
  const BD = G.BD;

  // ── 燃燒：每 0.5 秒造成 6 點傷害（dps 12），以 st.data.acc 累積計時 ──
  BD.defineStatus('burn', {
    name: '燃燒', tags: ['dot', 'fire', 'debuff'], stacking: 'refresh', defaultDur: 4, dps: 12,
    onApply: function (u, st, opts, w, isNew) {
      if (isNew) { if (!st.data || typeof st.data.acc !== 'number') st.data = { acc: 0 }; st.data.acc = 0; }
      else if (!st.data || typeof st.data.acc !== 'number') st.data = { acc: 0 };
    },
    onTick: function (u, st, dt, w) {
      if (!st.data) st.data = { acc: 0 };
      st.data.acc += dt;
      while (st.data.acc >= 0.5) {
        st.data.acc -= 0.5;
        BD.statusDamage(w, u, st, 12 * 0.5);
      }
    },
  });

  // ── 中毒：可堆疊至 5 層，每 1 秒造成 4 × 層數傷害 ──
  BD.defineStatus('poison', {
    name: '中毒', tags: ['dot', 'debuff'], stacking: 'stack', maxStacks: 5, defaultDur: 6,
    dps: function (u, st) { return 4 * st.stacks; },
    onApply: function (u, st, opts, w, isNew) { if (!st.data) st.data = { acc: 0 }; },
    onTick: function (u, st, dt, w) {
      if (!st.data) st.data = { acc: 0 };
      st.data.acc += dt;
      while (st.data.acc >= 1.0) {
        st.data.acc -= 1.0;
        BD.statusDamage(w, u, st, 4 * st.stacks);
      }
    },
  });

  // ── 流血：stacks 即流血值，每秒自然衰減 6 點；累積至 100 時爆發大量傷害並移除 ──
  BD.defineStatus('bleed', {
    name: '流血', tags: ['buildup', 'debuff'], stacking: 'stack', maxStacks: 100, defaultDur: 8,
    onApply: function (u, st, opts, w, isNew) {
      if (st.stacks < 100) return;
      const max = u.maxHp || u.maxHpMinion || u.hp || 0;
      const dmg = Math.max(1, Math.round(0.15 * max));
      // 先移除再結算，避免 damageUnit 再次觸發流血造成遞迴
      BD.removeStatus(u, 'bleed', 'burst', w);
      if (w) {
        w.damageUnit(st.source || null, u, { dmg, posture: 25, unblockable: true, noPerfect: true, ignoreIframe: true, statusDmg: 'bleed' });
        if (w.fx) w.fx.text(u.x, u.y - (u.r || 20) - 30, '出血！', '#ff3344', 22);
      }
    },
    onTick: function (u, st, dt, w) {
      st.stacks = Math.max(0, st.stacks - 6 * dt);
      if (st.stacks <= 0) BD.removeStatus(u, 'bleed', 'decay', w);
    },
  });

  // ── 護盾：st.value 為剩餘可吸收傷害；重新施加時保留較大值；吸收完畢即破碎 ──
  BD.defineStatus('shield', {
    name: '護盾', tags: ['buff', 'shield'], stacking: 'refresh', defaultDur: 8,
    onApply: function (u, st, opts, w, isNew) {
      if (isNew) {
        st.data = { prev: 0 };
        st.value = opts.value || 0;
      } else {
        const prev = st.data && typeof st.data.prev === 'number' ? st.data.prev : 0;
        st.data = { prev };
        st.value = Math.max(prev, opts.value || 0);
      }
      st.data.prev = st.value;
    },
    absorb: function (u, st, dmg, w) {
      const take = Math.min(st.value, dmg);
      st.value -= take;
      if (st.data) st.data.prev = st.value;
      if (st.value <= 0) {
        BD.removeStatus(u, 'shield', 'broken', w);
        if (w && w.fx) w.fx.text(u.x, u.y - (u.r || 20) - 30, '護盾破碎', '#9fd8ff', 18);
      }
      return dmg - take;
    },
  });

  BD.defineStatus('vulnerable', {
    name: '易傷', tags: ['debuff'], stacking: 'refresh', defaultDur: 5,
    modifiers: { dmgTakenMul: 1.25 },
  });

  BD.defineStatus('enrage', {
    name: '狂暴', tags: ['buff'], stacking: 'refresh', defaultDur: 8,
    modifiers: { dmgDealtMul: 1.3, speedMul: 1.2 },
  });
})(typeof window !== 'undefined' ? window : globalThis);
