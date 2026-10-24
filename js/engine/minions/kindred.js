'use strict';
// 鏡爪的魔狼：開場就在、有自己生命的獨立戰鬥夥伴（召喚物 wolf）。
//   自主：沿著以獵物為圓心的弧線繞到獵物背對神羊的一側包夾，到位後在背後左右游移；逮到空檔就自己撲咬（在獵物背後撲得更快）；
//         獵物逼近神羊時改擋在兩人之間、咬得更急；獵物離神羊太遠（想逃）就加速追獵。
//   聽令：神羊的招式以 do:'wolf' 下令，魔狼從「自己所在的位置」蓄勢、撲出、咬下——躲的方向要看狼，不是看羊。
//         新的一招會取代上一招還沒輪到的下令（狼牙永遠跟著神羊眼前這一招，不會慢半拍）。
//   動作連貫：撲完順著衝勢滑過獵物再回身（連撲成為穿梭的 Z 字），蓄勢時帶著餘速伏低、轉頭有轉速上限，樹影幢幢螺旋入圈、最後穿過圈心衝出，全程沒有瞬移。
//   可以被打散：生命歸零化為黑霧，WOLF_BACK 秒後回到神羊身旁（原作：分立卻從不分離）；狼不在時，神羊的下令落空。
//   trait 'wolf'：每幀確認魔狼在場（開場召喚、潰散後計時重聚）。考據與設計見 docs/bosses/kindred.md
(function (G) {
  const BD = G.BD, U = BD.U, K = BD.K;
  const WOLF_BACK = [9, 7]; // 潰散後重聚秒數（一、二階段）
  const ICE = '#8fe3ff', EMBER = '#ff6a4a';

  BD.wolfOf = (w, b) => w.minions.find((m) => m.alive && m.owner === b && m.kind === 'wolf') || null;
  const p2 = (m) => m.owner.phase === 2;
  const elFx = (m, id) => (p2(m) ? { id, el: 'blood' } : id);
  const tint = (m) => (p2(m) ? EMBER : ICE);

  // 撲擊距離：衝殺 len 固定；穿透 through＝穿過獵物再多衝 through；躍擊 leap 不限距離；其餘最遠 cap
  function reach(m, o, e) {
    const d = U.dist(m, e);
    return o.len || (o.through != null ? d + o.through : o.leap ? d : Math.min(d, o.cap || 380));
  }
  function aimEnd(m, o, e) {
    const a = U.angTo(m, e), d = reach(m, o, e);
    return K.clampPt(m.x + Math.cos(a) * d, m.y + Math.sin(a) * d, 30).concat(a);
  }
  function lungeShape(m, o) {
    return o.w ? { kind: 'rect', x: m.x, y: m.y, ang: m.aa, len: U.dist(m, { x: m.ex, y: m.ey }), w: o.w } : { kind: 'circle', x: m.ex, y: m.ey, r: o.r };
  }
  function startLunge(w, m, o, e) {
    m.o = o;
    if (o.ring) { startRing(m, o, e); return; }
    m.ms = 'aim'; m.st = o.tele;
    [m.ex, m.ey, m.aa] = aimEnd(m, o, e);
    m.tele = K.addTele(w, m.owner, null, lungeShape(m, o), o.tele, { detached: true, color: tint(m) });
  }
  function launch(m, dashT) { m.ms = 'dash'; m.st = m.dashT = dashT; m.sx = m.x; m.sy = m.y; m.tele = null; }
  function finishLunge(w, m) {
    const o = m.o;
    if (!o.exit) {
      const s = lungeShape({ x: m.sx, y: m.sy, ex: m.ex, ey: m.ey, aa: m.aa }, o);
      w.applyArea(m, s, { dmg: o.dmg, posture: o.posture, kb: o.kb, status: o.status });
      K.hitFx(w, m.owner, s, o.fx || elFx(m, 'wolfbite'), { dmg: o.dmg });
    }
    // 撲完不急停：順著衝勢滑過去再回身
    const v = Math.min(520, Math.hypot(m.ex - m.sx, m.ey - m.sy) / m.dashT * 0.35);
    m.vx = Math.cos(m.aa) * v; m.vy = Math.sin(m.aa) * v;
    m.ms = 'rec'; m.st = o.rec != null ? o.rec : 0.3; m.o = null;
  }
  function clearTeles(w, m) {
    const own = (m.rteles || []).concat(m.tele || []);
    if (own.length) w.telegraphs = w.telegraphs.filter((t) => !own.includes(t));
    m.tele = null; m.rteles = [];
  }
  function dropOrders(w, m) {
    clearTeles(w, m);
    m.q.length = 0; m.o = null; if (m.ms !== 'rec') { m.ms = 'prowl'; m.st = 0; }
  }
  // 樹影幢幢（原作故事〈樹影幢幢的森林〉）：魔狼從所在位置螺旋切入、繞獵物狂奔一圈，每段路留下一道殘影（朝圈心的直線預警），
  // 跑完一圈後所有殘影同時撲向圈心——同一次只算一口；魔狼本體同時穿過圈心衝出去
  const RUN_IN = 0.26, LAP = 0.84; // 螺旋切入圈上的時間比例、跑完一圈的時間比例
  const smooth = (x) => x * x * (3 - 2 * x);
  function startRing(m, o, e) {
    const cr = (m.x - e.x) * m.vy - (m.y - e.y) * m.vx; // 順著狼原本繞行的方向跑
    if (Math.abs(cr) > 1) m.dir = Math.sign(cr);
    Object.assign(m, { ms: 'ring', st: o.tele, cx: e.x, cy: e.y, r0: U.dist(m, e), lines: [], rteles: [] });
    m.ra = Math.atan2(m.y - e.y, m.x - e.x) + m.dir * U.TAU * RUN_IN / (LAP - RUN_IN); // 讓起點恰好是狼現在的位置
  }
  function ringStep(w, m) {
    const o = m.o, k = U.clamp(1 - m.st / o.tele, 0, 1), lap = U.clamp((k - RUN_IN) / (LAP - RUN_IN), 0, 1);
    const a = m.ra + m.dir * U.TAU * (k < RUN_IN ? (k - RUN_IN) / (LAP - RUN_IN) : lap), rr = U.lerp(m.r0, o.ring, smooth(Math.min(1, k / RUN_IN)));
    const px = m.cx + Math.cos(a) * rr, py = m.cy + Math.sin(a) * rr;
    [m.x, m.y] = K.clampPt(px, py, 30);
    m.ang = m.face = a + m.dir * Math.PI / 2;
    if (k >= RUN_IN && m.lines.length < Math.min(o.n, Math.floor(lap * o.n) + 1)) {
      const s = { kind: 'rect', x: px, y: py, ang: a + Math.PI, len: o.ring + 40, w: o.w };
      m.lines.push(s);
      m.rteles.push(K.addTele(w, m.owner, null, s, m.st, { detached: true, color: tint(m) }));
    }
    if (m.st > 0) return;
    for (const u of w.enemiesOf(m.team)) {
      const s = m.lines.find((l) => U.hitShape(l, u));
      if (s) w.damageUnit(m, u, { from: s, dmg: o.dmg, posture: o.posture, kb: o.kb, status: o.status });
    }
    for (const s of m.lines) K.hitFx(w, m.owner, s, o.fx, { dmg: o.dmg });
    clearTeles(w, m);
    m.aa = m.ang = m.face = Math.atan2(m.cy - m.y, m.cx - m.x);
    [m.ex, m.ey] = K.clampPt(m.cx + (m.cx - m.x) * 0.5, m.cy + (m.cy - m.y) * 0.5, 30);
    m.o = { exit: true, rec: o.rec }; launch(m, 0.22);
  }

  BD.defineMinion('wolf', {
    threat: true,
    spawn(w, b, m) {
      Object.assign(m, { r: 26, hp: 300, maxHp: 300, speed: 300, ms: 'prowl', st: 0, cd: 2.5, q: [], qi: null, o: null, tele: null, dir: w.rng() < 0.5 ? 1 : -1, ang: b.face, p2: false });
      const a = b.face + 2.2;
      BD.spawnFx(w, 'vanish', b.x, b.y, { el: 'shadow', src: b });
      return [b.x + Math.cos(a) * (b.r + 50), b.y + Math.sin(a) * (b.r + 50)];
    },
    onDeath(w, m) {
      const b = m.owner;
      clearTeles(w, m);
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
        // 帶著餘速伏低蓄勢，頭慢慢轉向撲擊方向；最後 lock 秒鎖定
        const f = Math.exp(-8 * dt); m.vx *= f; m.vy *= f; m.x += m.vx * dt; m.y += m.vy * dt; w.confine(m);
        if (m.st > (m.o.lock || 0.15)) { [m.ex, m.ey, m.aa] = aimEnd(m, m.o, e); m.tele.shape = lungeShape(m, m.o); }
        m.ang = m.face = U.rotateToward(m.ang, m.aa, 14 * dt);
        if (m.st <= 0) {
          const d = Math.hypot(m.ex - m.x, m.ey - m.y);
          m.ang = m.face = m.aa;
          launch(m, m.o.dash || (m.o.leap ? U.clamp(d / 1500, 0.18, 0.38) : m.o.w ? 0.24 : 0.16)); // 遠距躍擊依距離拉長滯空
        }
        return true;
      }
      if (m.ms === 'ring') { ringStep(w, m); return true; }
      if (m.ms === 'dash') {
        const k = U.clamp(1 - m.st / m.dashT, 0, 1);
        m.x = U.lerp(m.sx, m.ex, k); m.y = U.lerp(m.sy, m.ey, k);
        if (m.st <= 0) { m.x = m.ex; m.y = m.ey; w.confine(m); finishLunge(w, m); }
        return true;
      }
      if (m.ms === 'rec') { const f = Math.exp(-5 * dt); m.vx *= f; m.vy *= f; if (m.st <= 0) m.ms = 'prowl'; return; }
      // prowl：聽令優先，否則自己找機會撲咬
      if (hunt && m.q.length) { startLunge(w, m, m.q.shift(), e); return true; }
      if (hunt && m.cd <= 0 && U.dist(m, e) < 280) {
        const behind = Math.abs(U.angDiff(e.face, U.angTo(e, m))) > 2.1; // 在獵物背後：撲得更快
        m.cd = p2(m) ? w.rng.range(3.6, 4.6) : w.rng.range(4.6, 6.0);
        startLunge(w, m, { tele: behind ? 0.38 : 0.5, cap: 300, r: 64, dmg: 20, posture: 5, kb: 150 }, e);
        return true;
      }
      let tx = b.x + Math.cos(b.face + 2.2) * 70, ty = b.y + Math.sin(b.face + 2.2) * 70, spd = m.speed * 0.8; // 沒有獵物：回到神羊身側
      if (hunt) {
        const de = U.dist(e, b);
        if (de < 170) { tx = U.lerp(b.x, e.x, 0.6); ty = U.lerp(b.y, e.y, 0.6); spd = m.speed * 1.1; } // 擋在神羊與獵物之間
        else {
          // 包夾：沿著獵物外圍的弧線（走較短的一邊）繞到獵物背對神羊的一側，到位後左右游移
          const flee = de > 480, D = flee ? 90 : 170;
          const want = U.angTo(b, e) + Math.sin(m.t * 0.7) * 0.6, cur = Math.atan2(m.y - e.y, m.x - e.x);
          const na = cur + U.clamp(U.angDiff(cur, want), -0.9, 0.9);
          tx = e.x + Math.cos(na) * D; ty = e.y + Math.sin(na) * D; spd = m.speed * (flee ? 1.35 : 1);
        }
      }
      const d = Math.hypot(tx - m.x, ty - m.y), want = d > 12 ? spd * Math.min(1, d / 60) : 0, a = Math.atan2(ty - m.y, tx - m.x);
      m.vx += (Math.cos(a) * want - m.vx) * Math.min(1, 5 * dt); m.vy += (Math.sin(a) * want - m.vy) * Math.min(1, 5 * dt);
      const head = Math.hypot(m.vx, m.vy) > 40 ? Math.atan2(m.vy, m.vx) : hunt ? U.angTo(m, e) : m.ang;
      m.ang = m.face = U.rotateToward(m.ang, head, 7 * dt);
    },
  });

  // 神羊下令：新的一招取代上一招還沒輪到的下令；now：連手邊的事也放下立刻執行（例如大招）；
  // sync：蓄勢時間對齊同一招的下一支箭，讓箭與狼同時抵達（沉重節奏拉長預警時也不會錯開）；狼不在場時落空
  BD.defineAction('wolf', (w, b, inst, a) => {
    const m = BD.wolfOf(w, b);
    if (!m) return;
    if (a.now && m.ms !== 'dash') dropOrders(w, m);
    if (m.qi !== inst) { m.q.length = 0; m.qi = inst; }
    if (a.sync) { const p = inst.v.actions.find((x) => x.do === 'proj' && x.at > a.at); if (p) a = Object.assign({}, a, { tele: Math.max(0.2, p.at - inst.t) }); }
    m.q.push(a);
  }, { active: true });

  // 舞動箭矢的翻滾：往「讓神羊與魔狼分處獵物兩側」的那一邊滾，箭與狼牙形成交叉火網；狼不在場就隨機一側
  BD.defineAction('tumble', (w, b, inst, a) => {
    const m = BD.wolfOf(w, b), e = b.enemy;
    let s = w.rng() < 0.5 ? 1 : -1;
    if (m) {
      const away = (k) => {
        const an = b.face + k * Math.PI / 2, [x, y] = K.clampPt(b.x + Math.cos(an) * a.dist, b.y + Math.sin(an) * a.dist, b.r + 20);
        return Math.abs(U.angDiff(U.angTo(e, m), Math.atan2(y - e.y, x - e.x)));
      };
      s = away(1) >= away(-1) ? 1 : -1;
    }
    BD.action('dash').fn(w, b, inst, Object.assign({}, a, { dir: s * Math.PI / 2 }));
  }, { active: true, duration: true });

  // 魔狼在場的保證：開場立刻召喚，潰散後等 _wolfAt 再重聚
  BD.defineTrait('wolf', {
    tick(w, b) {
      if (w.time < (b._wolfAt || 0) || BD.wolfOf(w, b)) return;
      BD.spawnMinion(w, b, 'wolf', 0, 1);
      if (b._wolfAt) { w.fx.text(b.x, b.y - b.r - 30, '魔狼歸來', '#bfe8ff', 20); b._wolfAt = 0; }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
