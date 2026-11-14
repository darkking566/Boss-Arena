'use strict';
// 黑刀刺客（Black Knife Assassin ／ 黑刀首領・亞勒托）專屬狀態、動作與特性：
// 1. 狀態「命定之死」（destineddeath）：持續侵蝕生命（DoT）並使目標受創加深；疊滿 3 次觸發「死印崩裂」追加最大生命比例傷害。
// 2. 狀態「黑夜面紗」（blackveil）：刺客披風折射光線進入短暫匿蹤（untargetable + 移速提升）。
// 3. 動作「bk_ambush」：於原地留下黑夜面紗殘影誘餌（b._decoys），瞬步閃至目標背後或側翼。
// 4. 動作「bk_grab_strike」：招牌不可防禦「飛身抱殺」——撲倒對手將黑刀刺入胸口刻下死亡盧恩，再猛力拔出引爆紅黑死焰。
// 5. 動作「bk_phantom_raid」：大招「陰謀之夜」於目標四周召出群影刺客分身交錯穿刺。
// 6. 特性「blackknife」：衝刺殘影、每 3 次衝刺觸發面紗匿影、受擊累積觸發翻騰見切反擊，以及二階段首領亞勒托覺醒演出。
// 純資料與引擎邏輯，不觸碰 DOM / Canvas。
(function (G) {
  const BD = G.BD, U = BD.U, K = BD.K;

  function liveDecoys(w, b) {
    if (!b._decoys) b._decoys = [];
    else if (b._decoys.length) b._decoys = b._decoys.filter(d => d.until > w.time);
    return b._decoys;
  }
  BD.liveBlackKnifeDecoys = liveDecoys;

  function addDecoy(w, b, x, y, face, life) {
    const list = liveDecoys(w, b);
    list.push({ x, y, face, t0: w.time, until: w.time + (life || 0.85) });
    while (list.length > 6) list.shift();
  }

  // ── 狀態：命定之死（Destined Death）──
  BD.defineStatus('destineddeath', {
    name: '命定之死',
    tags: ['dot', 'debuff'],
    stacking: 'refresh',
    defaultDur: 4.5,
    visual: 'destineddeath',
    dps: 11,
    modifiers: { dmgTakenMul: 1.08 },
    onApply(u, st, opts, w, isNew) {
      if (!st.data || typeof st.data.acc !== 'number') st.data = { acc: 0, marks: 0 };
      st.data.marks = (st.data.marks || 0) + 1;
      if (isNew && w && w.fx) {
        w.fx.text(u.x, u.y - (u.r || 24) - 28, '命定之死！', '#ff1e42', 20);
      } else if (st.data.marks >= 3 && w) {
        st.data.marks = 0;
        const src = opts && opts.source;
        const burst = Math.min(48, Math.max(22, Math.round((u.maxHp || 1500) * 0.022)));
        BD.statusDamage(w, u, st, burst);
        BD.spawnFx(w, 'bk_brand_burst', u.x, u.y, { src: src || u, radius: (u.r || 24) * 2.4 });
        if (w.fx) w.fx.text(u.x, u.y - (u.r || 24) - 34, '死印崩裂！', '#ff1438', 22);
      }
    },
    onTick(u, st, dt, w) {
      if (!st.data) st.data = { acc: 0, marks: 1 };
      st.data.acc += dt;
      while (st.data.acc >= 0.5) {
        st.data.acc -= 0.5;
        BD.statusDamage(w, u, st, 11 * 0.5);
      }
    },
  });

  // ── 狀態：黑夜面紗（Concealing Veil）──
  BD.defineStatus('blackveil', {
    name: '黑夜面紗',
    tags: ['buff'],
    stacking: 'refresh',
    defaultDur: 0.85,
    visual: 'blackveil',
    modifiers: { untargetable: true, speedMul: 1.3 },
  });

  // ── 動作：黑夜面紗・匿蹤背刺現身（bk_ambush / bk_ambush_strike）──
  function ambushAction(w, b, inst, a, target) {
    const foe = (b.enemy && b.enemy.state !== 'dead') ? b.enemy : target;
    if (!foe) return;
    addDecoy(w, b, b.x, b.y, b.face, a.decoyLife || 0.9);
    if (b.trail) b.trail.push({ x: b.x, y: b.y, face: b.face, life: 0.45 });
    BD.spawnFx(w, 'bk_veil_vanish', b.x, b.y, { src: b, radius: b.r * 2.2 });
    const base = foe.face != null ? foe.face + Math.PI : U.angTo(foe, b);
    const ang = base + (a.off || 0);
    const dist = (foe.r || 26) + (a.dist || 42);
    const [cx, cy] = K.clampPt(foe.x + Math.cos(ang) * dist, foe.y + Math.sin(ang) * dist, b.r || 24);
    b.x = cx; b.y = cy; w.confine(b);
    b.face = U.angTo(b, foe);
    if (a.veilDur) BD.applyStatus(b, 'blackveil', { dur: a.veilDur, source: b }, w);
    BD.spawnFx(w, 'bk_veil_appear', b.x, b.y, { src: b, angle: b.face, radius: b.r * 2.2 });
  }
  BD.defineAction('bk_ambush_strike', ambushAction, { active: true });
  BD.defineAction('bk_ambush', ambushAction, { active: true });

  // ── 動作：弒神處決・飛身抱殺（bk_grab_strike）──
  BD.defineAction('bk_grab_strike', (w, b, inst, a) => {
    const r = (a.r || 92) * (b.sizeMul || 1);
    const arc = a.arc || 1.7;
    const sh = { kind: 'cone', x: b.x, y: b.y, r, ang: b.face, arc };
    let victim = null;
    for (const u of w.enemiesOf(b.team)) {
      if (u.state === 'dead' || BD.getMod(u, 'untargetable') || BD.getMod(u, 'invuln')) continue;
      if (U.hitShape(sh, u)) { victim = u; break; }
    }
    if (!victim) {
      BD.spawnFx(w, 'bk_slash', b.x, b.y, { src: b, angle: b.face, arc: 1.4, radius: r });
      return;
    }
    // 命中抱殺：鎖定身位、壓制對手並刺入胸口刻下死亡盧恩
    const ang = U.angTo(b, victim);
    const [px, py] = K.clampPt(victim.x - Math.cos(ang) * (victim.r + b.r * 0.75), victim.y - Math.sin(ang) * (victim.r + b.r * 0.75), b.r);
    b.x = px; b.y = py; b.face = ang;
    victim.kbx = 0; victim.kby = 0;
    BD.applyStatus(b, 'iframe', { dur: 0.45, source: b }, w);
    BD.applyStatus(victim, 'stun', { dur: 0.42, source: b }, w);
    w.damageUnit(b, victim, {
      dmg: a.pinDmg || 28, posture: 16, kb: 20,
      unblockable: true, status: { id: 'destineddeath' }, from: sh,
    });
    w.hitstop = Math.max(w.hitstop || 0, 0.1);
    if (w.fx) w.fx.text(victim.x, victim.y - (victim.r || 24) - 36, '弒神抱殺！', '#ff183b', 24);
    BD.spawnFx(w, 'bk_grab_pin', victim.x, victim.y, { src: b, angle: ang, radius: (victim.r || 24) * 2.4 });
    w.later(0.32, () => {
      if (b.state === 'dead' || victim.state === 'dead') return;
      const blastAng = U.angTo(b, victim);
      w.damageUnit(b, victim, {
        dmg: a.burstDmg || 56, posture: 28, kb: a.kb || 380,
        unblockable: true, noPerfect: true, status: { id: 'destineddeath' },
      });
      w.hitstop = Math.max(w.hitstop || 0, 0.12);
      BD.spawnFx(w, 'bk_grab_burst', victim.x, victim.y, { src: b, angle: blastAng, radius: 135 });
      b.kbx -= Math.cos(blastAng) * 190;
      b.kby -= Math.sin(blastAng) * 190;
    });
  }, { active: true });

  // ── 動作：陰謀之夜・群影奇襲（bk_phantom_raid）──
  BD.defineAction('bk_phantom_raid', (w, b, inst, a, target) => {
    const cx = ( inst && inst.mark ? inst.mark.x : (target ? target.x : b.x) );
    const cy = ( inst && inst.mark ? inst.mark.y : (target ? target.y : b.y) );
    const n = a.n || 6, rad = a.rad || 210;
    for (let i = 0; i < n; i++) {
      const ang = i * U.TAU / n + (a.rot || 0);
      const sx = cx + Math.cos(ang) * rad, sy = cy + Math.sin(ang) * rad;
      const face = ang + Math.PI;
      addDecoy(w, b, sx, sy, face, a.life || 0.75);
      BD.spawnFx(w, 'bk_ult_phantom', sx, sy, {
        src: b, toX: cx - Math.cos(ang) * rad * 0.85, toY: cy - Math.sin(ang) * rad * 0.85,
        angle: face, radius: rad, i, n,
      });
    }
  }, { active: true });

  // ── 特性：黑刀身法與首領亞勒托覺醒（blackknife）──
  BD.defineTrait('blackknife', {
    onReset(w, b) {
      b._bkDashes = 0;
      b._bkHitsTaken = 0;
      b._bkRiposteCd = 0;
      b._bkTransStep = 0;
      b._decoys = [];
    },
    tick(w, b, dt) {
      liveDecoys(w, b);
      if (w.intro > 0 || b.state === 'dead') return;
      if (b.state === 'transition' && b.phase === 1) {
        b._bkTransT = (b._bkTransT || 0) + dt;
        const step = b._bkTransStep || 0;
        if (step < 1 && b._bkTransT >= 0.12) {
          b._bkTransStep = 1;
          addDecoy(w, b, b.x - Math.cos(b.face) * 45, b.y - Math.sin(b.face) * 45, b.face, 1.1);
          BD.spawnFx(w, 'bk_veil_vanish', b.x, b.y, { src: b, radius: b.r * 2.8 });
          if (w.fx) w.fx.text(b.x, b.y - b.r - 36, '命定之死，解封——', '#ff1e42', 24);
          w.log(b, '黑刀首領・亞勒托高舉黑刀，將完整的死亡盧恩刻入虛空！', true);
        }
        if (step < 2 && b._bkTransT >= 0.72) {
          b._bkTransStep = 2;
          BD.spawnFx(w, 'bk_awaken', b.x, b.y, { src: b, radius: 220 });
        }
      }
    },
    onDash(w, b) {
      if (b.state === 'dead' || b.state === 'transition') return;
      if (b.trail) b.trail.push({ x: b.x, y: b.y, face: b.face, life: 0.36 });
      b._bkDashes = (b._bkDashes || 0) + 1;
      if (b._bkDashes >= 3) {
        b._bkDashes = 0;
        addDecoy(w, b, b.x, b.y, b.face, 0.75);
        BD.applyStatus(b, 'blackveil', { dur: 0.35, source: b }, w);
        BD.applyStatus(b, 'iframe', { dur: 0.28, source: b }, w);
        BD.spawnFx(w, 'bk_veil_vanish', b.x, b.y, { src: b, radius: b.r * 2.0 });
        if (w.fx) w.fx.text(b.x, b.y - b.r - 25, '面紗匿影', '#b8c4e8', 18);
      }
    },
    interceptDamage(w, b, src, p) {
      if (!p.dot && !p.unblockable && src && src.isBoss && b.state !== 'dead' && b.state !== 'transition') {
        b._bkHitsTaken = (b._bkHitsTaken || 0) + 1;
        if (w.time >= (b._bkRiposteCd || 0) && b._bkHitsTaken >= 4) {
          b._bkHitsTaken = 0;
          b._bkRiposteCd = w.time + 9.5;
          b.stats.counters = (b.stats.counters || 0) + 1;
          addDecoy(w, b, b.x, b.y, b.face, 0.85);
          if (w.fx) w.fx.text(b.x, b.y - b.r - 28, '翻騰見切！', '#ff223b', 22);
          BD.spawnFx(w, 'bk_backflip', b.x, b.y, { src: b, angle: U.angTo(b, src) });
          w.hitstop = 0.09;
          const an = U.angTo(b, src);
          b.kbx -= Math.cos(an) * 210;
          b.kby -= Math.sin(an) * 210;
          [-0.14, 0.14].forEach(ao => {
            BD.spawnProj(w, { x: b.x, y: b.y, r: 0 }, b, an + ao, {
              speed: 780, r: 11, dmg: 28, posture: 10, kb: 100, life: 1.1, kind: 'deathblade',
              status: { id: 'destineddeath' }, fx: 'bk_deathwave_hit',
            });
          });
          return 'countered';
        }
      }
      return null;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
