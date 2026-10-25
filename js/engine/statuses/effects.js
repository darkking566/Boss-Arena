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

  // ── 冰凍值（霜月魔女二階段）：stacks 即冰凍值，每秒自然衰減 5 點；累積至 100 時瞬間凍結並歸零 ──
  BD.defineStatus('frostbite', {
    name: '冰凍值', tags: ['buildup', 'debuff'], stacking: 'stack', maxStacks: 100, defaultDur: 6, visual: 'frostbite',
    onApply: function (u, st, opts, w, isNew) {
      if (st.stacks < 100) return;
      BD.removeStatus(u, 'frostbite', 'burst', w);
      if (!w || u.state === 'dead' || u.state === 'transition') return;
      BD.applyStatus(u, 'frozen', { dur: 0.8 }, w);
      BD.spawnFx(w, 'nova', u.x, u.y, { src: st.source, radius: u.r + 40 });
    },
    onTick: function (u, st, dt, w) {
      st.stacks = Math.max(0, st.stacks - 5 * dt);
      if (st.stacks <= 0) BD.removeStatus(u, 'frostbite', 'decay', w);
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

  // ── 鏡爪印記（鏡爪）：每完成一次標記狩獵就累積一層，永久保留（不會自己消失）；每層 +6% 造成的傷害，最多 5 層 ──
  BD.defineStatus('hunt', {
    name: '鏡爪印記', tags: ['buff'], stacking: 'stack', maxStacks: 5, visual: 'hunt',
    modifiers: { dmgDealtMul: function (u) { const s = BD.getStatus(u, 'hunt'); return s ? 1 + 0.06 * s.stacks : 1; } },
  });

  // ── 神羊喘息（鏡爪 R）：原作「圈內單位的生命不會低於 10%，結束時恢復生命」——期間生命鎖在 10% 以上，到期仍活著則回復 value 點 ──
  BD.defineStatus('respite', {
    name: '神羊喘息', tags: ['buff', 'defense'], stacking: 'refresh', defaultDur: 4, visual: 'respite',
    absorb: function (u, st, dmg) { return Math.max(0, Math.min(dmg, u.hp - u.maxHp * 0.1)); },
    onRemove: function (u, st, w) {
      if (!w || w.winner || u.state === 'dead' || u.hp <= 0 || !st.value) return;
      u.hp = Math.min(u.maxHp, u.hp + st.value);
      if (w.fx) w.fx.text(u.x, u.y - (u.r || 20) - 30, '+' + st.value, '#eef7ff', 20);
    },
  });

  // ── 瞬獄影殺陣（劫的大招印記）：到期時引爆 value + 印記期間所受傷害 × 45%（施放者二階段 60%）；被提前移除（死亡等）不引爆 ──
  // shortcut: 以印記期間的生命差近似「劫造成的傷害」，1v1 幾乎都是劫打的；若有第三方傷害來源再改為記錄傷害來源
  BD.defineStatus('deathmark', {
    name: '瞬獄影殺陣', tags: ['debuff'], stacking: 'refresh', defaultDur: 3, visual: 'deathmark',
    onApply: function (u, st, opts, w, isNew) { if (isNew) st.data = { hp0: u.hp }; },
    onRemove: function (u, st, w, reason) {
      const src = st.source;
      if (reason !== 'expire' || !w || !src || u.state === 'dead') return;
      const taken = Math.max(0, st.data.hp0 - u.hp), pct = src.phase === 2 ? 0.6 : 0.45;
      w.damageUnit(src, u, { dmg: st.value + taken * pct / (src.dmgMul || 1), posture: 30, unblockable: true, undodgeable: true, noPerfect: true });
      BD.spawnFx(w, 'deathmark', u.x, u.y, { src, dmg: st.value + taken * pct });
    },
  });

  BD.defineStatus('enrage', {
    name: '狂暴', tags: ['buff'], stacking: 'refresh', defaultDur: 8,
    modifiers: { dmgDealtMul: 1.3, speedMul: 1.2 },
  });
  // ── 決鬥節奏（菲歐拉）：從破綻方位命中後短暫加速（原作破綻的移速加成）──
  BD.defineStatus('dueltempo', {
    name: '決鬥節奏', tags: ['buff'], stacking: 'refresh', defaultDur: 2.5,
    modifiers: { speedMul: 1.2 },
  });
  // ── 鷹眼鎖定 / 從容（米霍克）：被鷹眼盯上的對手受傷增加；撥擋成功的米霍克從容地加速加傷 ──
  BD.defineStatus('hawklock', {
    name: '鷹眼鎖定', tags: ['debuff'], stacking: 'refresh', defaultDur: 5,
    modifiers: { dmgTakenMul: 1.18 },
  });
  BD.defineStatus('poise', {
    name: '從容', tags: ['buff'], stacking: 'refresh', defaultDur: 3,
    modifiers: { speedMul: 1.15, dmgDealtMul: 1.2 },
  });
  // ── 鬥神狂喜（宙斯一階段 trait 'battlelust'）：挨打挨到興奮，肌肉再膨脹一圈 ──
  BD.defineStatus('ecstasy', {
    name: '鬥神狂喜', tags: ['buff'], stacking: 'refresh', defaultDur: 5,
    modifiers: { dmgDealtMul: 1.2, speedMul: 1.12 },
  });
  // ── 阿陀磨須（宙斯二階段常駐）：肌肉壓縮到極限、近乎不壞，但肉體每秒都在崩壞（損耗最大生命，不會因此倒下）──
  BD.defineStatus('adamas', {
    name: '阿陀磨須', tags: ['buff'], stacking: 'refresh',
    modifiers: { dmgTakenMul: 0.85 },
    onTick(u, st, dt) { if (u.hp > 1 && u.state !== 'dead') u.hp = Math.max(1, u.hp - u.maxHp * 0.0035 * dt); },
  });
  // ── 鬼背（範馬勇次郎二階段常駐）：肌肉撐破上衣、背上浮出惡鬼的面孔——身體更硬、拳腳更重 ──
  BD.defineStatus('ogreback', {
    name: '鬼背', tags: ['buff'], stacking: 'refresh',
    modifiers: { dmgTakenMul: 0.9, dmgDealtMul: 1.05 },
  });
  // ── 暴怒（恐暴龍二階段常駐）：筋肉膨脹、紅光與龍屬性能量噴湧——皮更厚（身體膨脹）、咬勁更重 ──
  BD.defineStatus('jhorage', {
    name: '暴怒', tags: ['buff'], stacking: 'refresh',
    modifiers: { dmgTakenMul: 0.92, dmgDealtMul: 1.08 },
  });
  // ── 萬手無雙（小次郎二階段常駐）：千手進化，連空氣與地面的震動都讀得到——移動更快、承受傷害降低 ──
  BD.defineStatus('manju', {
    name: '萬手無雙', tags: ['buff'], stacking: 'refresh',
    modifiers: { speedMul: 1.08, dmgTakenMul: 0.95 },
  });
  // ── 暴君之怒（波賽頓 trait 'tyrant'）：被雜魚碰到而動怒——傷害與速度短暫提升 ──
  BD.defineStatus('tyrantwrath', {
    name: '暴君之怒', tags: ['buff'], stacking: 'refresh', defaultDur: 5,
    modifiers: { dmgDealtMul: 1.15, speedMul: 1.1 },
  });
  // ── 神中之神（波賽頓二階段常駐）：認真起來的海神，快到連千手都讀不到——移動更快、挨得更少、出手更重 ──
  BD.defineStatus('godofgods', {
    name: '神中之神', tags: ['buff'], stacking: 'refresh',
    modifiers: { speedMul: 1.06, dmgTakenMul: 0.92, dmgDealtMul: 1.06 },
  });
  // ── 龍封（恐暴龍的龍息）：龍屬性能量侵蝕身體——造成的傷害降低 15%（原作：龍封力使武器屬性失效）──
  BD.defineStatus('dragonblight', {
    name: '龍封', tags: ['debuff'], stacking: 'refresh', defaultDur: 6, visual: 'dragonblight',
    modifiers: { dmgDealtMul: 0.85 },
  });
  // ── 死立不倒（亞當）：生命鎖在 1，期間無敵且出拳更重更快；時間到才真正倒下（對手先倒則以對手獲勝為準）──
  BD.defineStatus('deathstand', {
    name: '死立不倒', tags: ['buff'], stacking: 'refresh', defaultDur: 4, visual: 'deathstand',
    modifiers: { invuln: true, dmgDealtMul: 1.3, speedMul: 1.15 },
    onRemove(u, st, w) { if (w && !w.winner && u.state !== 'dead' && u.hp <= 1) { u.hp = 0; w.kill(u); } },
  });
  // ── 月讀（鼬）：與目標眼神交會後拉進自己的世界——無法行動、承受傷害 +25%，期間每 0.2 秒挨一記刺擊（一般傷害，會跳數字），結束時再補一記重擊（原作：數日的酷刑只在一瞬間）──
  // 不綁定 stun 狀態：bindState 的狀態不會 tick；stun 由 onApply 設定、與本狀態同長
  BD.defineStatus('tsukuyomi', {
    name: '月讀', tags: ['cc', 'debuff'], stacking: 'refresh', defaultDur: 2.2, visual: 'tsukuyomi', dps: 100,
    modifiers: { dmgTakenMul: 1.25 },
    onApply(u, st, opts, w, isNew) {
      if (!u.setState) return; // 召喚物沒有狀態機：月讀只對 Boss 有效
      u.setState('stun', opts.dur || 2.2);
      if (!isNew) return;
      st.data = { acc: 0 };
      if (w) { BD.spawnFx(w, 'tsukuyomi', u.x, u.y, { src: st.source, life: opts.dur || 2.2 }); w.fx.text(u.x, u.y - u.r - 30, '月讀！', '#ff3048', 26); }
    },
    onTick(u, st, dt, w) {
      if (!st.data || !w || u.state === 'dead') return;
      st.data.acc += dt;
      while (st.data.acc >= 0.2) {
        st.data.acc -= 0.2;
        w.damageUnit(st.source || null, u, { dmg: 20, posture: 3, unblockable: true, undodgeable: true, noPerfect: true, ignoreIframe: true, statusDmg: st.id });
        BD.spawnFx(w, 'slash', u.x, u.y, { src: st.source, angle: BD.vrng() * Math.PI * 2, radius: 90, el: 'umbra' });
      }
    },
    onRemove(u, st, w, reason) {
      if (reason !== 'expire' || !w || !st.data || u.state === 'dead') return;
      w.damageUnit(st.source || null, u, { dmg: 70, posture: 20, unblockable: true, undodgeable: true, noPerfect: true, ignoreIframe: true, statusDmg: st.id });
      BD.spawnFx(w, 'crowburst', u.x, u.y, { src: st.source });
    },
  });
  // ── 天照（鼬）：永遠無法撲滅的黑炎——不會自行熄滅（只有施術者倒下才停止），每被黑炎燒到一次疊一層（最多 5 層），每層每秒 6 點 ──
  BD.defineStatus('amaterasu', {
    name: '天照', tags: ['dot', 'fire', 'debuff'], stacking: 'stack', maxStacks: 5, visual: 'amaterasu',
    dps: function (u, st) { return 6 * st.stacks; },
    onApply(u, st, opts, w, isNew) {
      st.rem = Infinity;
      if (!st.data || typeof st.data.acc !== 'number') st.data = { acc: 0 };
      if (isNew && w) w.fx.text(u.x, u.y - u.r - 30, '天照！', '#d81c4a', 22);
    },
    onTick(u, st, dt, w) {
      if (!st.data || (st.source && st.source.state === 'dead')) return;
      st.data.acc += dt;
      while (st.data.acc >= 0.5) { st.data.acc -= 0.5; BD.statusDamage(w, u, st, 3 * st.stacks); }
    },
  });
  // ── 須佐能乎（鼬）：顯現期間身披查克拉鎧甲、承受傷害 −25%（八咫鏡擋下大半衝擊）──
  BD.defineStatus('susanoo', {
    name: '須佐能乎', tags: ['buff'], stacking: 'refresh', defaultDur: 16, visual: 'susanoo',
    modifiers: { dmgTakenMul: 0.75 },
    onApply(u, st, opts, w, isNew) { if (isNew && w) BD.spawnFx(w, 'susanoo', u.x, u.y, { src: u }); },
  });

  // ── 犽宿：天寒地凍（鋼鐵暴雪命中累積，兩層時下一記鋼鐵暴雪化為旋風）、滯空（被旋風捲起，無法行動；奪命氣息的目標）、乘風（刃敵千軍連續突進，每層 +4% 造成的傷害）──
  BD.defineStatus('gatherstorm', { name: '天寒地凍', tags: ['buff'], stacking: 'stack', maxStacks: 2, defaultDur: 6 });
  BD.defineStatus('airborne', {
    name: '滯空', tags: ['cc'], bindState: 'stun',
    onApply: function (u, st, opts, w, isNew) {
      if (opts.dur && u.setState) u.setState('stun', opts.dur); // 召喚物沒有 setState；已在滯空中再施加＝延長
      if (isNew && w && w.fx) { w.fx.text(u.x, u.y - u.r - 30, '滯空！', '#e6fbff', 20); BD.spawnFx(w, 'airlaunch', u.x, u.y, { src: st.source, victim: u }); }
    },
  });
  BD.defineStatus('ridewind', {
    name: '乘風', tags: ['buff'], stacking: 'stack', maxStacks: 4, defaultDur: 5,
    modifiers: { dmgDealtMul: function (u) { const s = BD.getStatus(u, 'ridewind'); return s ? 1 + 0.04 * s.stacks : 1; } },
  });
})(typeof window !== 'undefined' ? window : globalThis);
