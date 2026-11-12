'use strict';
// 鮮血君王蒙格：血焰池、血之咒印倒數、虛無（Nihil）吸血與被動「血之恩寵」。純引擎，不碰 DOM / Canvas。
// 原作考據：docs/bosses/mohg.md。原作：HP 約 90%／75%／60% 依序念出 Trēs／Duo／Ūnus 在褪色者身上套咒環，
// 半血時三度高舉三叉戟念「Nihil」，依咒環數吸血回復；他或對手出血後 20 秒傷害 +15%。秒數與倍率為本遊戲改編。
(function (G) {
  const BD = G.BD, U = BD.U;
  const CHANT = ['Trēs！', 'Duo！', 'Ūnus！'];

  BD.defineStatus('bloodcurse', { name: '血之咒印', tags: ['debuff'], stacking: 'stack', maxStacks: 3, defaultDur: 40, visual: 'bloodcurse' });
  BD.defineStatus('bloodboon', { name: '血之恩寵', tags: ['buff'], stacking: 'refresh', defaultDur: 10, visual: 'bloodboon', modifiers: { dmgDealtMul: 1.15 } });

  // 血焰池：依面向排成扇形 / 直線 / 環形（不用亂數，落點只看施放當下的位置與面向）
  const POOL = { kind: 'bloodflame', r: 58, dur: 4, dps: 14, delay: 0.35, damageEl: 'fire', status: { id: 'bleed', stacks: 4 } };
  BD.defineAction('bloodpools', (w, b, inst, a) => {
    const k = b.sizeMul || 1, z = Object.assign({}, POOL, a.pool, { r: (a.pool && a.pool.r || POOL.r) * k });
    for (let i = 0; i < a.n; i++) {
      let ang = b.face, d;
      if (a.pattern === 'arc') { ang += (a.n > 1 ? i / (a.n - 1) - 0.5 : 0) * a.spread; d = a.dist; }
      else if (a.pattern === 'ring') { ang += i * U.TAU / a.n; d = a.dist; }
      else d = a.start + i * a.step; // 'line'
      const [x, y] = BD.K.clampPt(b.x + Math.cos(ang) * d * k, b.y + Math.sin(ang) * d * k);
      BD.makeZone(w, b, x, y, z);
      BD.spawnFx(w, 'mohgpool', x, y, { src: b, radius: z.r });
    }
  }, { active: true });

  const foes = (w, b) => w.enemiesOf(b.team).filter(u => u.state !== 'dead');
  // 血之咒印：無法閃避的咒環（原作也無法躲），只累積層數，不造成傷害
  function curse(w, b, i) {
    for (const e of foes(w, b)) {
      BD.applyStatus(e, 'bloodcurse', { stacks: 1, source: b }, w);
      BD.spawnFx(w, 'mohgcurse', e.x, e.y, { src: b, radius: e.r * 2.2 });
    }
    w.fx.text(b.x, b.y - b.r - 34, CHANT[Math.min(2, i)], '#ff3b4e', 26);
    w.log(b, '「' + CHANT[Math.min(2, i)].replace('！', '') + '」——血之咒環套上了敵人。', true);
  }
  BD.defineAction('curse', (w, b, inst, a) => curse(w, b, a.i || 0), { active: true });

  // 虛無（Nihil）：對所有敵人吸血，咒印越多越痛、回血越多；無法閃避，invuln 仍然有效
  function nihil(w, b, a, last) {
    w.fx.text(b.x, b.y - b.r - 40, 'Nihil！', '#ff1f3a', 30);
    BD.spawnFx(w, 'mohgnihil', b.x, b.y, { src: b, radius: b.r * 3 });
    for (const e of foes(w, b)) {
      const st = BD.getStatus(e, 'bloodcurse'), n = st ? Math.round(st.stacks) : 0;
      w.damageUnit(b, e, { dmg: a.base + a.per * n, posture: 6, kb: 0, heal: a.heal, unblockable: true, undodgeable: true, noPerfect: true, ignoreIframe: true, status: { id: 'bleed', stacks: 6 + 4 * n } });
      BD.spawnFx(w, 'mohgdrain', e.x, e.y, { src: b, radius: e.r * 2, n });
      if (last) BD.removeStatus(e, 'bloodcurse', 'nihil', w);
    }
  }
  BD.defineAction('nihil', (w, b, inst, a) => nihil(w, b, a, !!a.last), { active: true });

  // 被動「血之恩寵」＋咒印倒數＋轉階段的虛無
  const MARKS = [0.88, 0.74, 0.6], NIHIL = [1.0, 1.75, 2.5], TRANS = { base: 24, per: 26, heal: 0.6 };
  BD.defineTrait('bloodlord', {
    tick(w, b, dt) {
      if (!b._bloodHook) { // 任一方吃到出血爆發 → 蒙格 10 秒傷害 +15%（原作 20 秒）
        b._bloodHook = true;
        w.on('damage', e => {
          if (!e.p || e.p.statusDmg !== 'bleed' || b.state === 'dead' || (e.b !== b && e.b.team === b.team)) return;
          BD.applyStatus(b, 'bloodboon', { dur: 10 }, w);
          BD.spawnFx(w, 'mohgboonbuff', b.x, b.y, { src: b });
          w.log(b, '血之恩寵：鮮血流淌，王朝之主的力量高漲。', true);
        });
      }
      if (w.intro > 0 || b.state === 'dead') return;
      b._curseN = b._curseN || 0;
      if (b.state === 'transition' && b.phase === 1) { // 咒印未滿就在轉階段時補齊，再念三次 Nihil
        b._nihilT = (b._nihilT || 0) + dt;
        if (b._curseN < 3 && b._nihilT >= 0.25 + b._curseN * 0.22) curse(w, b, b._curseN++);
        b._nihilN = b._nihilN || 0;
        if (b._nihilN < 3 && b._nihilT >= NIHIL[b._nihilN]) { b._nihilN++; nihil(w, b, TRANS, b._nihilN === 3); }
        return;
      }
      if (b.phase !== 1 || b._curseN >= 3 || BD.getMod(b, 'untargetable')) return;
      b._curseCd = Math.max(0, (b._curseCd || 0) - dt);
      if (b._curseCd > 0 || b.hp > b.maxHp * MARKS[b._curseN] || !foes(w, b).length) return;
      curse(w, b, b._curseN++); b._curseCd = 0.8; // 一下掉過兩道門檻時逐一念出
    },
    onReset(w, b) { b._curseN = 0; b._curseCd = 0; b._nihilT = 0; b._nihilN = 0; },
  });
})(typeof window !== 'undefined' ? window : globalThis);
