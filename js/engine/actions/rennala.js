'use strict';
// 滿月女王蕾娜菈（Rennala, Queen of the Full Moon）專屬狀態、喚魂動作與雙階段被動「琥珀卵聖歌・喚魂之鈴」
// 純引擎邏輯：不觸碰 DOM / Canvas，戰鬥亂數只使用 w.rng。
(function (G) {
  const BD = G.BD, U = BD.U, K = BD.K;

  // ── 琥珀金罩（一階段大書庫金球護罩）：吸收傷害；被打穿時觸發原作「破盾墜地」短暫硬直；自然結束時釋放琥珀光波 ──
  BD.defineStatus('ambershield', {
    name: '琥珀金罩', tags: ['buff', 'shield'], stacking: 'refresh', defaultDur: 6.5, visual: 'ambershield',
    onApply: function (u, st, opts, w, isNew) {
      const val = opts.value || 105;
      if (isNew) {
        st.data = { prev: val };
        st.value = val;
      } else {
        const prev = st.data && typeof st.data.prev === 'number' ? st.data.prev : 0;
        st.value = Math.max(prev, val);
        st.data = { prev: st.value };
      }
      if (w && w.fx && isNew) w.fx.text(u.x, u.y - (u.r || 27) - 30, '琥珀金罩', '#ffd86a', 18);
    },
    absorb: function (u, st, dmg, w) {
      const take = Math.min(st.value, dmg);
      st.value -= take;
      if (st.data) st.data.prev = st.value;
      if (st.value <= 0) {
        BD.removeStatus(u, 'ambershield', 'broken', w);
        if (w && u.state !== 'dead' && u.state !== 'transition') {
          BD.spawnFx(w, 'rennala_shatter', u.x, u.y, { src: u, radius: (u.r || 27) + 46 });
          if (w.fx) w.fx.text(u.x, u.y - (u.r || 27) - 32, '金罩碎裂！', '#ffcf56', 20);
          w.log(u, '琥珀金罩碎裂：甜美小生徒的聖歌中斷，蕾娜菈自半空跌落！', true);
          BD.applyStatus(u, 'stagger', { dur: 0.45 }, w);
        }
      }
      return dmg - take;
    },
    onRemove: function (u, st, w, reason) {
      if (reason !== 'end' || !w || w.over || u.state === 'dead' || u.state === 'transition' || u.phase !== 1) return;
      const s = { kind: 'circle', x: u.x, y: u.y, r: 130 };
      w.applyArea(u, s, { dmg: 34, posture: 12, kb: 175 });
      BD.hitProps(w, u, s, { dmg: 34, kb: 175 });
      BD.spawnFx(w, 'rennala_amber_cast', u.x, u.y, { src: u, radius: 130 });
    },
  });

  // ── 滿月易傷（二階段「蕾娜菈的滿月」附加效果）：對應原作降低目標魔力減傷率，承受傷害 +18% ──
  BD.defineStatus('moonbane', {
    name: '滿月易傷', tags: ['debuff'], stacking: 'refresh', defaultDur: 6.5, visual: 'moonbane',
    modifiers: { dmgTakenMul: 1.18 },
    onApply: function (u, st, opts, w, isNew) {
      if (w && w.fx && isNew) w.fx.text(u.x, u.y - (u.r || 25) - 30, '滿月易傷', '#9fe8ff', 18);
    },
  });

  // ── 喚魂之鈴・四大靈體骨灰召喚（離群野狼群 / 獵犬騎士 / 山妖巨人 / 王室飛龍） ──
  function summonWolves(w, b, a) {
    const n = a.n || 3, gap = a.gap || 0.12;
    for (let i = 0; i < n; i++) {
      const side = (i - (n - 1) / 2) * 52;
      w.later(i * gap, () => {
        if (b.state === 'dead' || b.state === 'transition' || w.over) return;
        const foe = w.foeOf(b.team, b) || b.enemy;
        if (!foe || foe.state === 'dead') return;
        const face = U.angTo(b, foe);
        const [sx, sy] = K.clampPt(
          b.x + Math.cos(face) * 28 - Math.sin(face) * side,
          b.y + Math.sin(face) * 28 + Math.cos(face) * side,
          28
        );
        const ang = Math.atan2(foe.y - sy, foe.x - sx) + (i - (n - 1) / 2) * (a.spread || 0.08);
        BD.spawnFx(w, 'rennala_spirit_wolves', sx, sy, { src: b, angle: ang, radius: 42 });
        BD.spawnProj(w, { x: sx, y: sy, r: 0 }, b, ang, {
          kind: 'spiritwolf',
          speed: a.speed || 650,
          r: a.r || 16,
          dmg: a.dmg || 38,
          posture: a.posture || 11,
          kb: a.kb || 90,
          life: a.life || 1.55,
          homing: a.homing != null ? a.homing : 1.85,
          status: a.status,
        });
      });
    }
  }

  function summonBloodhound(w, b, a) {
    const foe = w.foeOf(b.team, b) || b.enemy;
    if (!foe || foe.state === 'dead') return;
    const baseAng = U.angTo(b, foe) + (a.angOff || 0.38);
    const len = a.len || 250, wid = a.w || 64, tele = a.tele || 0.46;
    const [x0, y0] = K.clampPt(foe.x - Math.cos(baseAng) * (len * 0.52), foe.y - Math.sin(baseAng) * (len * 0.52), 36);
    const ang = Math.atan2(foe.y - y0, foe.x - x0);
    const s = { kind: 'rect', x: x0, y: y0, ang, len, w: wid };
    K.addTele(w, b, null, s, tele, { detached: true, color: '#9fe8ff' });
    BD.spawnFx(w, 'rennala_spirit_bloodhound', x0, y0, { src: b, angle: ang, len, radius: wid, life: tele + 0.42 });
    w.later(tele, () => {
      if (b.state === 'dead' || b.state === 'transition' || w.over) return;
      w.applyArea(b, s, { dmg: a.dmg || 62, posture: a.posture || 20, kb: a.kb || 150, status: a.status, from: s });
      BD.hitProps(w, b, s, { dmg: a.dmg || 62, kb: a.kb || 150 });
      if (a.secondSlash) {
        w.later(0.26, () => {
          if (b.state === 'dead' || b.state === 'transition' || w.over) return;
          const t2 = w.foeOf(b.team, b) || b.enemy;
          if (!t2 || t2.state === 'dead') return;
          const ang2 = ang + Math.PI - 0.35;
          const [rx0, ry0] = K.clampPt(t2.x - Math.cos(ang2) * (len * 0.48), t2.y - Math.sin(ang2) * (len * 0.48), 36);
          const s2 = { kind: 'rect', x: rx0, y: ry0, ang: ang2, len: len * 0.92, w: wid };
          K.addTele(w, b, null, s2, 0.34, { detached: true, color: '#9fe8ff' });
          BD.spawnFx(w, 'rennala_spirit_bloodhound', rx0, ry0, { src: b, angle: ang2, len: len * 0.92, radius: wid, life: 0.68 });
          w.later(0.34, () => {
            if (b.state === 'dead' || b.state === 'transition' || w.over) return;
            w.applyArea(b, s2, { dmg: Math.round((a.dmg || 62) * 0.78), posture: 16, kb: 165, status: a.status, from: s2 });
            BD.hitProps(w, b, s2, { dmg: 48, kb: 165 });
          });
        });
      }
    });
  }

  function summonTroll(w, b, a) {
    const foe = w.foeOf(b.team, b) || b.enemy;
    if (!foe || foe.state === 'dead') return;
    const lead = a.lead || 0.22;
    const [tx, ty] = K.clampPt(foe.x + (foe.vx || 0) * lead, foe.y + (foe.vy || 0) * lead, 48);
    const r = a.r || 135, tele = a.tele || 0.64, ang = U.angTo({ x: tx, y: ty }, foe);
    const s = { kind: 'circle', x: tx, y: ty, r };
    K.addTele(w, b, null, s, tele, { detached: true, color: '#9fe8ff' });
    BD.spawnFx(w, 'rennala_spirit_troll', tx, ty, { src: b, angle: ang, radius: r, life: tele + 0.48 });
    w.later(tele, () => {
      if (b.state === 'dead' || b.state === 'transition' || w.over) return;
      w.applyArea(b, s, { dmg: a.dmg || 82, posture: a.posture || 32, kb: a.kb || 235, slow: a.slow || 1.0, status: a.status });
      BD.hitProps(w, b, s, { dmg: a.dmg || 82, kb: a.kb || 235 });
    });
  }

  function summonDragon(w, b, a) {
    const foe = w.foeOf(b.team, b) || b.enemy;
    if (!foe || foe.state === 'dead') return;
    const face = U.angTo(b, foe) + (a.angOff || 0);
    const [dx, dy] = K.clampPt(b.x + Math.cos(face) * 75, b.y + Math.sin(face) * 75, 45);
    const ang = Math.atan2(foe.y - dy, foe.x - dx);
    const len = a.len || 430, wid = a.w || 115, tele = a.tele || 0.62;
    const s = { kind: 'rect', x: dx, y: dy, ang, len, w: wid };
    K.addTele(w, b, null, s, tele, { detached: true, color: '#78d8ff' });
    BD.spawnFx(w, 'rennala_spirit_dragon', dx, dy, { src: b, angle: ang, len, radius: wid, life: tele + 0.55 });
    w.later(tele, () => {
      if (b.state === 'dead' || b.state === 'transition' || w.over) return;
      w.applyArea(b, s, { dmg: a.dmg || 88, posture: a.posture || 26, kb: a.kb || 210, status: a.status, from: s });
      BD.hitProps(w, b, s, { dmg: a.dmg || 88, kb: a.kb || 210 });
      if (a.zone) {
        const [zx, zy] = K.clampPt(dx + Math.cos(ang) * (len * 0.62), dy + Math.sin(ang) * (len * 0.62), 45);
        BD.makeZone(w, b, zx, zy, a.zone);
      }
    });
  }

  BD.defineAction('spiritsummon', (w, b, inst, a) => {
    BD.spawnFx(w, 'rennala_summon_sigil', b.x, b.y, { src: b, radius: (b.r || 27) + 62, life: 1.0 });
    const sp = a.spirit || 'wolves';
    if (sp === 'wolves') summonWolves(w, b, a);
    else if (sp === 'bloodhound') summonBloodhound(w, b, a);
    else if (sp === 'troll') summonTroll(w, b, a);
    else if (sp === 'dragon') summonDragon(w, b, a);
  }, { active: true });

  // ── 蕾娜菈的滿月升空標記（供造型檔 over() 繪製半空巨型立體滿月） ──
  BD.defineAction('fullmoonform', (w, b, inst, a) => {
    const dur = a.dur || 1.25;
    b._fullMoonFrom = w.time;
    b._fullMoonUntil = w.time + dur;
    BD.spawnFx(w, 'rennala_fullmoon_orb', b.x, b.y, { src: b, radius: a.r || 95, life: dur });
  });

  // ── 琥珀卵聖歌護盾（技能主動補充琥珀金罩） ──
  BD.defineAction('ambercast', (w, b, inst, a) => {
    if (b.phase === 1) {
      BD.applyStatus(b, 'ambershield', { value: a.value || 70, dur: a.dur || 5.5 }, w);
    }
    BD.spawnFx(w, 'rennala_amber_cast', b.x, b.y, { src: b, radius: (b.r || 27) + 42 });
  });

  // ── 被動特性「琥珀卵聖歌・喚魂之鈴」 ──
  BD.defineTrait('fullmoonqueen', {
    onReset(w, b) {
      b._amberTimer = 9.8; // 開場約 2.7 秒後首次張開琥珀金罩
      b._moonEchoTimer = 0;
      b._moonEchoPending = null;
      b._fullMoonFrom = 0;
      b._fullMoonUntil = 0;
    },
    tick(w, b, dt) {
      if (w.intro > 0) return;
      if (b.state === 'transition' && b._glintblades) b._glintblades.length = 0;
      if (b.state === 'dead' || b.state === 'transition' || BD.getMod(b, 'untargetable')) {
        b._moonEchoPending = null;
        return;
      }
      if (b.phase === 1) {
        if (b._amberTimer == null) b._amberTimer = 9.8;
        b._amberTimer += dt;
        if (b._amberTimer < 12.5) return;
        const foe = b.enemy;
        if (!foe || foe.state === 'dead') return;
        b._amberTimer = 0;
        BD.applyStatus(b, 'ambershield', { value: 105, dur: 6.5 }, w);
        BD.spawnFx(w, 'rennala_amber_cast', b.x, b.y, { src: b, radius: b.r + 48 });
        w.log(b, '琥珀卵聖歌：甜美小生徒齊聲吟唱，為蕾娜菈披上琥珀金罩！', true);
        const base = U.angTo(b, foe);
        for (let i = -1; i <= 1; i += 2) {
          BD.spawnProj(w, b, b, base + i * 0.16, {
            kind: 'sweetbook', speed: 540, r: 12, dmg: 22, posture: 7, kb: 60, life: 1.5, homing: 0.9,
          });
        }
        return;
      }
      // 二階段：星夜水鏡與卡利亞滿月迴響
      if (BD.hasStatus(b, 'ambershield')) BD.removeStatus(b, 'ambershield', 'phase2', w);
      if (b._moonEchoPending) {
        const p = b._moonEchoPending;
        p.rem -= dt;
        if (p.rem > 0) return;
        b._moonEchoPending = null;
        const s = { kind: 'circle', x: p.x, y: p.y, r: p.r };
        w.applyArea(b, s, { dmg: 36, posture: 12, kb: 120, slow: 1.1 });
        BD.hitProps(w, b, s, { dmg: 36, kb: 120 });
        BD.spawnFx(w, 'rennala_fullmoon_blast', p.x, p.y, { src: b, radius: p.r });
        return;
      }
      b._moonEchoTimer = (b._moonEchoTimer || 0) + dt;
      if (b._moonEchoTimer < 10.5) return;
      const foe = b.enemy;
      if (!foe || foe.state === 'dead') return;
      b._moonEchoTimer = 0;
      if (BD.formGlintblades) {
        BD.formGlintblades(w, b, { n: 3, delay: 1.05, gap: 0.12, spacing: 44, speed: 760, r: 10, dmg: 30, posture: 9, kb: 70, life: 1.7, homing: 1.2 });
      }
      const r = 105;
      b._moonEchoPending = { x: foe.x, y: foe.y, r, rem: 0.75 };
      K.addTele(w, b, null, { kind: 'circle', x: foe.x, y: foe.y, r }, 0.75, { detached: true, color: '#9fe8ff' });
      w.log(b, '卡利亞滿月迴響：星夜水鏡映出月華，同時凝結三柄輝石魔劍！', true);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
