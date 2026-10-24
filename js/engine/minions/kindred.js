'use strict';
// 鏡爪的魔狼：開場就在、有自己生命的獨立戰鬥夥伴（召喚物 wolf）。
//   自主：繞到獵物背對神羊的一側包夾，逮到空檔就自己撲咬；獵物逼近神羊時改擋在兩人之間、咬得更急；獵物離神羊太遠（想逃）就加速追獵。
//   聽令：神羊的招式以 do:'wolf' 下令（排入佇列），魔狼從「自己所在的位置」蓄勢、撲出、咬下——躲的方向要看狼，不是看羊。
//   可以被打散：生命歸零化為黑霧，WOLF_BACK 秒後回到神羊身旁（原作：分立卻從不分離）；狼不在時，神羊的下令落空。
//   trait 'wolf'：每幀確認魔狼在場（開場召喚、潰散後計時重聚）。考據與設計見 docs/bosses/kindred.md
(function (G) {
  const BD = G.BD, U = BD.U, K = BD.K;
  const WOLF_BACK = [9, 7]; // 潰散後重聚秒數（一、二階段）
  const ICE = '#8fe3ff', EMBER = '#ff6a4a';

  BD.wolfOf = (w, b) => w.minions.find((m) => m.alive && m.owner === b && m.kind === 'wolf') || null;
  const p2 = (m) => m.owner.phase === 2;
  const elFx = (m, id) => (p2(m) ? { id, el: 'blood' } : id);

  // 一次撲擊的落點：固定長度（衝殺）沿朝向延伸；否則撲向目標、最遠 cap（躍擊 leap 不限距離）
  function aimEnd(m, o, e) {
    const a = U.angTo(m, e), d = o.len || (o.leap ? U.dist(m, e) : Math.min(U.dist(m, e), o.cap || 380));
    return K.clampPt(m.x + Math.cos(a) * d, m.y + Math.sin(a) * d, 30).concat(a);
  }
  function lungeShape(m, o) {
    return o.w ? { kind: 'rect', x: m.x, y: m.y, ang: m.ang, len: U.dist(m, { x: m.ex, y: m.ey }), w: o.w } : { kind: 'circle', x: m.ex, y: m.ey, r: o.r };
  }
  function startLunge(w, m, o, e) {
    m.o = o; m.ms = 'aim'; m.st = o.tele; m.vx = 0; m.vy = 0;
    [m.ex, m.ey, m.ang] = aimEnd(m, o, e); m.face = m.ang;
    m.tele = K.addTele(w, m.owner, null, lungeShape(m, o), o.tele, { detached: true, color: p2(m) ? EMBER : ICE });
  }
  function finishLunge(w, m) {
    const o = m.o, s = lungeShape({ x: m.sx, y: m.sy, ex: m.ex, ey: m.ey, ang: m.ang }, o);
    w.applyArea(m, s, { dmg: o.dmg, posture: o.posture, kb: o.kb, status: o.status });
    K.hitFx(w, m.owner, s, o.fx || elFx(m, 'wolfbite'), { dmg: o.dmg });
    m.ms = 'rec'; m.st = o.rec != null ? o.rec : 0.3; m.o = null;
  }
  function dropOrders(w, m) {
    if (m.tele) w.telegraphs = w.telegraphs.filter((t) => t !== m.tele);
    m.q.length = 0; m.o = null; m.tele = null; if (m.ms !== 'rec') { m.ms = 'prowl'; m.st = 0; }
  }

  BD.defineMinion('wolf', {
    threat: true,
    spawn(w, b, m) {
      Object.assign(m, { r: 26, hp: 300, maxHp: 300, speed: 300, ms: 'prowl', st: 0, cd: 2.5, q: [], o: null, tele: null, dir: w.rng() < 0.5 ? 1 : -1, ang: b.face, p2: false });
      const a = b.face + 2.2;
      BD.spawnFx(w, 'vanish', b.x, b.y, { el: 'shadow', src: b });
      return [b.x + Math.cos(a) * (b.r + 50), b.y + Math.sin(a) * (b.r + 50)];
    },
    onDeath(w, m) {
      const b = m.owner;
      if (m.tele) w.telegraphs = w.telegraphs.filter((t) => t !== m.tele);
      if (b.state === 'dead') return;
      b._wolfAt = w.time + WOLF_BACK[b.phase - 1];
      w.fx.text(m.x, m.y - 40, '魔狼潰散', '#9fb4e0', 20);
      w.log(b, '的魔狼被打散成黑霧——' + WOLF_BACK[b.phase - 1] + ' 秒後重聚', true);
    },
    update(w, m, dt, e, eAlive) {
      const b = m.owner;
      if (b.state === 'dead') { BD.killMinion(w, m); return true; }
      m.dmgMul *= BD.scaleMod(b, 'dmgDealtMul', 1); // 鏡爪印記的層數也加在狼牙上
      if (b.phase === 2 && !m.p2) { m.p2 = true; m.maxHp = 380; m.hp = 380; m.speed = 340; m.r = 30; } // 饗宴：魔狼重新凝聚、身形暴漲
      m.st -= dt; m.cd -= dt * (eAlive && U.dist(e, b) < 170 ? 1.6 : 1);
      const hunt = eAlive && !BD.getMod(e, 'untargetable') && b.state !== 'transition';
      if (!hunt && m.ms !== 'dash') dropOrders(w, m);
      if (m.ms === 'aim') {
        if (m.st > (m.o.lock || 0.15)) { [m.ex, m.ey, m.ang] = aimEnd(m, m.o, e); m.face = m.ang; m.tele.shape = lungeShape(m, m.o); }
        if (m.st <= 0) { m.ms = 'dash'; m.st = m.o.dash || (m.o.w ? 0.24 : 0.16); m.dashT = m.st; m.sx = m.x; m.sy = m.y; m.tele = null; }
        return true;
      }
      if (m.ms === 'dash') {
        const k = U.clamp(1 - m.st / m.dashT, 0, 1);
        m.x = U.lerp(m.sx, m.ex, k); m.y = U.lerp(m.sy, m.ey, k);
        if (m.st <= 0) { m.x = m.ex; m.y = m.ey; w.confine(m); finishLunge(w, m); }
        return true;
      }
      if (m.ms === 'rec') { m.vx *= 0.8; m.vy *= 0.8; if (m.st <= 0) m.ms = 'prowl'; return; }
      // prowl：聽令優先，否則自己找機會撲咬
      if (hunt && m.q.length) { startLunge(w, m, m.q.shift(), e); return true; }
      if (hunt && m.cd <= 0 && U.dist(m, e) < 280) {
        m.cd = p2(m) ? w.rng.range(3.6, 4.6) : w.rng.range(4.6, 6.0);
        startLunge(w, m, { tele: 0.5, cap: 300, r: 64, dmg: 20, posture: 5, kb: 150 }, e);
        return true;
      }
      let tx = b.x + Math.cos(b.face + 2.2) * 70, ty = b.y + Math.sin(b.face + 2.2) * 70, spd = m.speed * 0.8; // 沒有獵物：回到神羊身側
      if (hunt) {
        const de = U.dist(e, b), away = U.angTo(b, e);
        if (de < 170) { tx = U.lerp(b.x, e.x, 0.6); ty = U.lerp(b.y, e.y, 0.6); spd = m.speed * 1.1; } // 擋在神羊與獵物之間
        else {
          const flee = de > 480, D = flee ? 90 : 170, a = away + m.dir * (flee ? 0.4 : 1.0); // 包夾：繞到獵物背對神羊的一側
          tx = e.x + Math.cos(a) * D; ty = e.y + Math.sin(a) * D; spd = m.speed * (flee ? 1.35 : 1);
        }
        if (w.rng() < dt * 0.25) m.dir *= -1;
      }
      const d = Math.hypot(tx - m.x, ty - m.y), want = d > 12 ? spd : 0, a = Math.atan2(ty - m.y, tx - m.x);
      m.vx += (Math.cos(a) * want - m.vx) * Math.min(1, 5 * dt); m.vy += (Math.sin(a) * want - m.vy) * Math.min(1, 5 * dt);
      if (Math.hypot(m.vx, m.vy) > 40) m.ang = Math.atan2(m.vy, m.vx); else if (hunt) m.ang = U.rotateToward(m.ang, U.angTo(m, e), 6 * dt);
      m.face = m.ang;
    },
  });

  // 神羊下令：排入魔狼的佇列（now：清掉手邊的事立刻執行，例如大招）；狼不在場時落空
  BD.defineAction('wolf', (w, b, inst, a) => {
    const m = BD.wolfOf(w, b);
    if (!m) return;
    if (a.now && m.ms !== 'dash') dropOrders(w, m);
    m.q.push(a);
  }, { active: true });

  // 魔狼在場的保證：開場立刻召喚，潰散後等 _wolfAt 再重聚
  BD.defineTrait('wolf', {
    tick(w, b) {
      if (w.time < (b._wolfAt || 0) || BD.wolfOf(w, b)) return;
      BD.spawnMinion(w, b, 'wolf', 0, 1);
      if (b._wolfAt) { w.fx.text(b.x, b.y - b.r - 30, '魔狼歸來', '#bfe8ff', 20); b._wolfAt = 0; }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
