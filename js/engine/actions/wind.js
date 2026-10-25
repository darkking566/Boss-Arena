'use strict';
// 風之劍術（犽宿）：windwall 風牆擋下敵方投射物、gather 消耗天寒地凍、lastbreath 奪命氣息（瞬移到滯空的對手身邊連斬），
// 以及 wanderer 特性（浪人之道：走動累積劍意，滿了受擊時化為護盾；鋼鐵暴雪命中累積天寒地凍；劍擊可能暴擊）
// 風牆存在 w.walls（{ team, owner, x0, y0, ang, w, t0, until, vx, vy }）：ang 為正面朝向，牆面垂直於 ang；出現後 0.3 秒向前飄移再停住
(function (G) {
  const BD = G.BD, U = BD.U, K = BD.K;
  const DRIFT = 0.3;

  // 風牆目前的中心位置（向前飄 DRIFT 秒後停住；繪圖也用這個）
  BD.wallPos = (wl, time) => { const k = Math.min(time - wl.t0, DRIFT); return [wl.x0 + wl.vx * k, wl.y0 + wl.vy * k]; };
  BD.stormReady = (b) => { const s = BD.getStatus(b, 'gatherstorm'); return !!s && s.stacks >= 2; };

  BD.defineAction('windwall', (w, b, inst, a) => {
    const ang = inst.wallAng != null ? inst.wallAng : b.face, d = b.r + 46, x0 = b.x + Math.cos(ang) * d, y0 = b.y + Math.sin(ang) * d;
    if (!w.walls) w.walls = [];
    w.walls.push({ team: b.team, owner: b, x0, y0, ang, w: a.w, t0: w.time, until: w.time + a.life, vx: Math.cos(ang) * a.drift / DRIFT, vy: Math.sin(ang) * a.drift / DRIFT });
    BD.spawnFx(w, 'windwallcast', x0, y0, { src: b, angle: ang, width: a.w, life: a.life });
  }, { active: true });

  // 投射物碰到風牆：敵方的被吹散；犽宿自己的旋風穿過風牆時變大變強一次（2XKO：鋼鐵暴雪打中風牆化為長距風刃）
  BD.wallBlocks = function (w, p) {
    let live = false;
    for (const wl of w.walls) {
      if (wl.until <= w.time) continue;
      live = true;
      const [cx, cy] = BD.wallPos(wl, w.time), dx = p.x - cx, dy = p.y - cy;
      const n = dx * Math.cos(wl.ang) + dy * Math.sin(wl.ang), s = -dx * Math.sin(wl.ang) + dy * Math.cos(wl.ang);
      if (Math.abs(n) > p.r + 12 || Math.abs(s) > wl.w / 2 + p.r * 0.5) continue;
      if (wl.team !== p.team) {
        p.alive = false;
        BD.spawnFx(w, 'windblock', p.x, p.y, { src: wl.owner, angle: wl.ang });
        return;
      }
      if (p.kind === 'tornado' && !p.walled) {
        p.walled = true; p.r *= 1.4; p.dmg *= 1.3;
        BD.spawnFx(w, 'windblock', p.x, p.y, { src: wl.owner, angle: wl.ang, empower: true });
      }
    }
    if (!live) w.walls = [];
  };

  // 天寒地凍用掉（鋼鐵暴雪・旋風放出後）
  BD.defineAction('gather', (w, b) => { BD.removeStatus(b, 'gatherstorm', 'used', w); });

  // 奪命氣息：瞬移到滯空的對手身旁、延長滯空，連斬 n 下後一記落地重斬；對手沒在滯空就先捲出一道大旋風，0.7 秒後再判定
  function finale(w, b, inst, a, e) {
    const n = a.n, tick = 0.12, total = 0.22 + n * tick + 0.14;
    BD.applyStatus(b, 'invuln', { dur: total + 0.3 }, w);
    const ang = U.angTo(b, e), d = e.r + b.r + 18;
    const [x, y] = K.clampPt(e.x + Math.cos(ang) * d, e.y + Math.sin(ang) * d, b.r + 10);
    b.trail.push({ x: b.x, y: b.y, face: b.face, life: 0.4 });
    BD.spawnFx(w, 'lbwarp', b.x, b.y, { src: b, toX: x, toY: y });
    b.x = x; b.y = y; w.confine(b); b.face = U.angTo(b, e);
    b._lb = { t0: w.time, until: w.time + total + 0.2, tgt: e };
    BD.applyStatus(e, 'airborne', { dur: total + 0.25, source: b }, w);
    w.slowmo = Math.max(w.slowmo, 0.5);
    for (let i = 0; i < n; i++) w.later(0.22 + i * tick, () => {
      if (e.state === 'dead') return;
      w.damageUnit(b, e, { dmg: a.dmg, posture: 2, unblockable: true, undodgeable: true, noPerfect: true });
      BD.spawnFx(w, 'lbslash', e.x, e.y, { src: b, angle: i * 2.39996 + b.face, i, n });
    }, inst);
    w.later(total, () => {
      BD.spawnFx(w, 'lbfinale', e.x, e.y, { src: b, angle: b.face, radius: 170 });
      if (e.state !== 'dead') w.damageUnit(b, e, { dmg: a.final, posture: 30, kb: 260, kbAng: b.face, unblockable: true, undodgeable: true, noPerfect: true });
      b.flow = 100; BD.removeStatus(b, 'gatherstorm', 'used', w); // 原作：奪命氣息充滿劍意、重置鋼鐵暴雪層數
      w.fx.text(e.x, e.y - e.r - 46, '死亡如風', '#e6fbff', 24);
    }, inst);
    w.later(total + 0.35, () => { if (b.inst === inst) b.endSkill(true); }, inst); // 收刀：不必等滿整段時間軸
  }
  BD.defineAction('lastbreath', (w, b, inst, a) => {
    const e = b.enemy;
    if (BD.hasStatus(e, 'airborne')) { finale(w, b, inst, a, e); return; }
    const ang = U.angTo(b, e);
    K.addTele(w, b, null, { kind: 'rect', x: b.x, y: b.y, ang, len: 820, w: 110 }, 0.2, { detached: true });
    BD.spawnProj(w, b, b, ang, { speed: 1300, r: 58, dmg: a.dmg * 2, posture: 20, kb: 40, life: 0.65, pierce: true, kind: 'tornado', status: { id: 'airborne', dur: 1.2 } });
    w.later(0.7, () => {
      if (BD.hasStatus(e, 'airborne')) finale(w, b, inst, a, e);
      else if (b.inst === inst) b.endSkill(); // 沒捲中：收刀
    }, inst);
  }, { active: true, duration: true });

  BD.defineTrait('wanderer', {
    // 浪人之道：走動累積劍意（每移動 1px 約 +0.06；位移技也算）
    tick(w, b) {
      if (b._lx != null && (b.flow || 0) < 100) b.flow = Math.min(100, (b.flow || 0) + Math.hypot(b.x - b._lx, b.y - b._ly) * 0.06);
      b._lx = b.x; b._ly = b.y;
    },
    // 劍意滿：受到 Boss / 召喚物的直接攻擊時消耗劍意，化為 1 秒護盾（之後的傷害結算由護盾吸收）
    interceptDamage(w, b, src, p) {
      if ((b.flow || 0) < 100 || p.dot || !src || !(p.dmg > 0)) return null;
      b.flow = 0;
      BD.applyStatus(b, 'shield', { dur: 1, value: b.maxHp * (b.phase === 2 ? 0.12 : 0.09) }, w);
      w.fx.text(b.x, b.y - b.r - 34, '浪人之道', '#bff3ff', 18);
      BD.spawnFx(w, 'flowshield', b.x, b.y, { src: b });
      return null;
    },
    // a.storm：鋼鐵暴雪命中 → 天寒地凍 +1；a.crit：劍擊剛命中時擲暴擊（一階段 25%、二階段 40%），追加 75% 傷害
    onHit(w, b, s, a) {
      const e = b.enemy;
      if (!e || e.state === 'dead' || e.hurtFlash < 0.12 || !U.hitShape(s, e)) return;
      if (a.storm) {
        BD.applyStatus(b, 'gatherstorm', { dur: 6, stacks: 1, source: b }, w);
        if (BD.stormReady(b)) { w.fx.text(b.x, b.y - b.r - 30, '旋風就緒', '#e6fbff', 16); BD.spawnFx(w, 'windstep', b.x, b.y, { src: b }); }
      }
      if (a.crit && w.rng() < (b.phase === 2 ? 0.4 : 0.25)) {
        w.damageUnit(b, e, { dmg: a.dmg * 0.75, posture: 6, unblockable: true, noPerfect: true });
        w.fx.text(e.x, e.y - e.r - 40, '暴擊！', '#ff6a4a', 20);
      }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
