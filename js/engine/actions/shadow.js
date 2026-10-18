'use strict';
// 影分身類動作（劫）：shadow 放出影子、swap 與影子換位、shadowshuriken 影子同步擲出諸刃、shadowslash 影子同步鬼斬；
// 以及 contempt 特性（影忍法・滅魂劫：普攻對生命低於一半的目標追加最大生命比例傷害，同一目標 10 秒一次）
// 影子存在 b.shadows（{ x, y, face, t0, until }）而不是召喚物：原作影子無法被選取，不吃傷害、不擋投射物、不參與碰撞
(function (G) {
  const BD = G.BD, U = BD.U, K = BD.K;
  const MAX = 2; // 原作同時最多兩個影子（W 影 + R 影）

  function liveShadows(w, b) {
    if (!b.shadows) b.shadows = [];
    else if (b.shadows.length) b.shadows = b.shadows.filter((s) => s.until > w.time);
    return b.shadows;
  }
  BD.liveShadows = liveShadows;

  // to：'target' 衝向目標（停在目標身前）| 'away' 背離目標 | 'self' 原地 | 'flank' 與本體、目標排成三角（n 個）
  BD.defineAction('shadow', (w, b, inst, a, tgt) => {
    const list = liveShadows(w, b), base = U.angTo(b, tgt), n = a.n || 1;
    for (let i = 0; i < n; i++) {
      let x = b.x, y = b.y;
      if (a.to === 'target') {
        const d = Math.min(a.dist, Math.max(0, U.dist(b, tgt) - b.enemy.r - 45)); // tgt 可能是沒有 r 的預判點
        x += Math.cos(base) * d; y += Math.sin(base) * d;
      } else if (a.to === 'away') {
        const an = base + Math.PI + w.rng.range(-0.5, 0.5);
        x += Math.cos(an) * a.dist; y += Math.sin(an) * a.dist;
      } else if (a.to === 'flank') {
        const an = base + Math.PI + (i % 2 ? 1 : -1) * Math.PI * 2 / 3;
        x = tgt.x + Math.cos(an) * a.dist; y = tgt.y + Math.sin(an) * a.dist;
      }
      [x, y] = K.clampPt(x, y, b.r + 10);
      list.push({ x, y, face: U.angTo({ x, y }, tgt), t0: w.time, until: w.time + a.life });
      BD.spawnFx(w, 'livingshadow', b.x, b.y, { src: b, toX: x, toY: y });
    }
    while (list.length > MAX) list.shift();
  }, { active: true });

  // 與最新的影子交換位置（原作 W / R 再施放）；沒有影子時不動
  BD.defineAction('swap', (w, b, inst, a) => {
    const list = liveShadows(w, b), s = list[list.length - 1];
    if (!s) return;
    const ox = b.x, oy = b.y, of = b.face;
    b.x = s.x; b.y = s.y; w.confine(b);
    s.x = ox; s.y = oy; s.face = of;
    b.face = U.angTo(b, b.enemy);
    BD.spawnFx(w, 'shadowswap', ox, oy, { src: b, toX: b.x, toY: b.y });
  }, { active: true });

  // 每個影子朝目標「目前位置」預警 dur 秒後擲出諸刃（本體那一發照常用 tele + proj 寫在資料裡）；施放被打斷則不擲出
  BD.defineAction('shadowshuriken', (w, b, inst, a, tgt) => {
    const px = tgt.x, py = tgt.y;
    for (const s of liveShadows(w, b)) {
      const ang = Math.atan2(py - s.y, px - s.x), src = { x: s.x, y: s.y, r: b.r };
      K.addTele(w, b, null, { kind: 'rect', x: s.x, y: s.y, ang, len: a.len, w: a.w }, a.dur, { detached: true });
      w.later(a.dur, () => { if (!inst.cancelled && b.state !== 'dead') BD.spawnProj(w, src, b, ang, a); });
    }
  }, { active: true, duration: true });

  // 每個影子在原地預警 dur 秒後鬼斬；目標同時在本體的鬼斬範圍內時只吃緩速（原作同一招不重複傷害）
  BD.defineAction('shadowslash', (w, b, inst, a) => {
    for (const s of liveShadows(w, b)) {
      const sh = { kind: 'circle', x: s.x, y: s.y, r: a.r };
      K.addTele(w, b, null, sh, a.dur, { detached: true });
      w.later(a.dur, () => {
        if (inst.cancelled || b.state === 'dead') return;
        const self = { kind: 'circle', x: b.x, y: b.y, r: a.r };
        for (const u of w.enemiesOf(b.team)) {
          if (!U.hitShape(sh, u)) continue;
          w.damageUnit(b, u, U.hitShape(self, u) ? { dmg: 0, posture: 0, status: a.status, from: sh }
            : { dmg: a.dmg, posture: a.posture, kb: a.kb, status: a.status, from: sh });
        }
        K.hitFx(w, b, sh, a.fx || 'whirl', { dmg: a.dmg });
      });
    }
  }, { active: true, duration: true });

  // 滅魂劫：hit 標記 contempt 且剛命中（hurtFlash 剛被設為 0.12）生命一半以下的對手時，追加 pct 最大生命傷害（不受傷害倍率影響）
  BD.defineTrait('contempt', {
    onHit(w, b, s, a) {
      const e = b.enemy;
      if (!a.contempt || !e || e.state === 'dead' || e.hp > e.maxHp * 0.5 || e.hurtFlash < 0.12 || !U.hitShape(s, e)) return;
      if (b._contemptT > w.time) return;
      b._contemptT = w.time + 10;
      const pct = b.phase === 2 ? 0.08 : 0.06;
      w.damageUnit(b, e, { dmg: e.maxHp * pct / (b.dmgMul || 1), posture: 12, unblockable: true, noPerfect: true });
      w.fx.text(e.x, e.y - e.r - 40, '滅魂劫', '#ff4b5c', 18);
      BD.spawnFx(w, 'contempt', e.x, e.y, { src: b, angle: b.face });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
