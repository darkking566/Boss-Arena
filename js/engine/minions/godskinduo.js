'use strict';
// 神皮雙人組。考據與設計見 docs/bosses/godskinduo.md
//   一般對戰：使徒（godskinduo）與貴人（godskinnoble）是兩位完整 Boss（World 依 def.partner 展開成同一隊），各自的 AI、招式、耐力、架勢；
//     原作「一個倒下，另一個把他喚醒」：trait godskin 在搭檔倒下 REVIVE 秒後把他喚醒，兩人都倒下才算輸。
//   訓練場、獵魂、4v1、小兵潮（一邊只能一位 Boss）：退回召喚物版——貴人是召喚物 noble，自己上前腹撞 / 柄擊，
//     倒下後 NOBLE_BACK 秒由使徒喚醒；使徒倒下時若貴人還在，整場一次起身（trait onLethal）。
//   召喚物的出招欄位：shape rect(len,w) / circle(r, where:'self'|預設落點)；go 前進距離、dash 位移秒數、tele 預警秒數、lock 最後鎖定秒數、rec 收招。
(function (G) {
  const BD = G.BD, U = BD.U, K = BD.K;
  const NOBLE_BACK = [14, 11]; // 貴人被打倒後，使徒把他喚醒的秒數（一、二階段）
  const RISE_HP = 0.3;         // 使徒起身後的生命比例（召喚物版）
  const REVIVE = [12, 10], REVIVE_HP = 0.4; // 雙人版：搭檔倒下後幾秒喚醒（依喚醒者的階段）、第一次喚醒的生命比例（之後每次 ×0.75）

  BD.nobleOf = (w, b) => w.minions.find((m) => m.alive && m.owner === b && m.kind === 'noble') || null;
  const p2 = (m) => m.owner.phase === 2;
  const tint = (m) => (p2(m) ? '#e4e0ff' : '#b9c2e6');
  const BLACKFLAME = { id: 'blackflame', dur: 4 };
  BD.GS_BLACKFLAME = BLACKFLAME;

  // 黑焰：持續傷害（可疊 3 層）。原作：能殺神的黑焰，只剩傷人的力量
  BD.defineStatus('blackflame', {
    name: '黑焰', tags: ['dot', 'debuff'], stacking: 'stack', maxStacks: 3, defaultDur: 4, visual: 'blackflame', dps: (u, st) => 7 * st.stacks,
    onTick(u, st, dt, w) {
      st.acc = (st.acc || 0) + dt;
      if (st.acc >= 0.5) { st.acc -= 0.5; BD.statusDamage(w, u, st, 3.5 * st.stacks); }
    },
  });

  function aim(m, e) {
    const o = m.o, a = U.angTo(m, e), D = U.dist(m, e);
    let d = o.to === 'target' ? Math.min(D, o.cap || 700) : (o.go || 0);
    m.len = o.len;
    if (o.to !== 'target' && (o.shape === 'rect' || o.shape === 'cone')) { // 離獵物太遠時先欺身再出招（最多多前進 280），預警跟著拉長
      d += U.clamp(D - (o.len || o.r) * 0.7 - d, 0, 280);
      if (o.shape === 'rect') m.len = Math.max(o.len, Math.min(D + 40, o.len + d));
    }
    m.aa = a; [m.ex, m.ey] = K.clampPt(m.x + Math.cos(a) * d, m.y + Math.sin(a) * d, 40);
  }
  // 預警形狀（自身位置為起點）／判定形狀（rect 從出發點算起，其餘在落點）
  function shapeAt(o, x, y, ex, ey, ang, len) {
    if (o.shape === 'cone') return { kind: 'cone', x: ex, y: ey, ang, r: o.r, arc: o.arc };
    if (o.shape === 'circle') return o.where === 'self' ? { kind: 'circle', x, y, r: o.r } : { kind: 'circle', x: ex, y: ey, r: o.r };
    if (o.shape === 'ring') return { kind: 'ring', x, y, r0: o.r0, r: o.r };
    return { kind: 'rect', x, y, ang, len: len || o.len, w: o.w };
  }
  const teleShape = (m, o) => shapeAt(o, m.x, m.y, m.ex, m.ey, m.aa, m.len);
  function startOrder(w, m, o, e) {
    m.o = o; m.ms = 'aim'; m.st = o.tele; aim(m, e);
    m.tele = K.addTele(w, m.owner, null, teleShape(m, o), o.tele, { detached: true, color: tint(m) });
  }
  function finish(w, m) {
    const o = m.o;
    const s = shapeAt(o, m.sx, m.sy, m.x, m.y, m.aa, m.len);
    w.applyArea(m, s, { dmg: o.dmg, posture: o.posture, kb: o.kb, status: o.status });
    K.hitFx(w, m.owner, s, o.fx, { dmg: o.dmg });
    const v = Math.min(420, Math.hypot(m.ex - m.sx, m.ey - m.sy) / m.dashT * 0.25); // 撲完留一點餘速，不急停
    m.vx = Math.cos(m.aa) * v; m.vy = Math.sin(m.aa) * v;
    m.ms = 'rec'; m.st = o.rec != null ? o.rec : 0.35; m.o = null;
  }
  function dropOrders(w, m) {
    if (m.tele) w.telegraphs = w.telegraphs.filter((t) => t !== m.tele);
    m.tele = null; m.q.length = 0; m.o = null; if (m.ms !== 'rec') { m.ms = 'prowl'; m.st = 0; }
  }

  BD.defineMinion('noble', {
    threat: true,
    spawn(w, b, m) {
      Object.assign(m, { r: 40, hp: 760, maxHp: 760, speed: 200, ms: 'prowl', st: 0, cd: 3, q: [], qi: null, o: null, tele: null, ang: b.face, p2: false });
      const a = b.face + Math.PI * 0.7;
      return [b.x + Math.cos(a) * (b.r + 90), b.y + Math.sin(a) * (b.r + 90)];
    },
    onDeath(w, m) {
      const b = m.owner;
      dropOrders(w, m);
      if (b.state === 'dead') return;
      b._nobleAt = w.time + NOBLE_BACK[b.phase - 1];
      w.fx.text(m.x, m.y - 50, '貴人倒下', '#c9c6ee', 22);
      w.log(b, '的神皮貴人倒下——使徒將在 ' + NOBLE_BACK[b.phase - 1] + ' 秒後把他喚醒', true);
    },
    update(w, m, dt, e, eAlive) {
      const b = m.owner;
      if (b.state === 'dead') { BD.killMinion(w, m); return true; }
      m.dmgMul *= BD.scaleMod(b, 'dmgDealtMul', 1);
      if (b.phase === 2 && !m.p2) { m.p2 = true; m.maxHp = 980; m.hp = 980; m.speed = 235; m.r = 44; } // 二階段：貴人撕下腹皮、身形脹大
      m.st -= dt; m.cd -= dt;
      const hunt = eAlive && !BD.getMod(e, 'untargetable') && b.state !== 'transition';
      if (!hunt && m.ms !== 'dash') dropOrders(w, m);
      if (m.ms === 'aim') {
        const f = Math.exp(-8 * dt); m.vx *= f; m.vy *= f; m.x += m.vx * dt; m.y += m.vy * dt; w.confine(m);
        if (m.st > (m.o.lock || 0.15)) { aim(m, e); m.tele.shape = teleShape(m, m.o); }
        m.ang = m.face = U.rotateToward(m.ang, m.aa, 6 * dt);
        if (m.st <= 0) {
          m.ang = m.face = m.aa; m.ms = 'dash'; m.dashT = m.st = m.o.dash != null ? m.o.dash : (m.ex !== m.x || m.ey !== m.y ? 0.3 : 0.02);
          m.sx = m.x; m.sy = m.y; m.tele = null;
        }
        return true;
      }
      if (m.ms === 'dash') {
        const k = U.clamp(1 - m.st / m.dashT, 0, 1);
        m.x = U.lerp(m.sx, m.ex, k); m.y = U.lerp(m.sy, m.ey, k);
        if (m.st <= 0) { m.x = m.ex; m.y = m.ey; w.confine(m); finish(w, m); }
        return true;
      }
      if (m.ms === 'rec') { const f = Math.exp(-5 * dt); m.vx *= f; m.vy *= f; if (m.st <= 0) m.ms = 'prowl'; return; }
      // prowl：聽令優先；否則貼近獵物自己肉搏（腹撞 / 柄擊）
      if (hunt && m.q.length) { startOrder(w, m, m.q.shift(), e); return true; }
      if (hunt && m.cd <= 0 && U.dist(m, e) < 270) {
        m.cd = p2(m) ? w.rng.range(3.8, 5) : w.rng.range(5, 6.5);
        startOrder(w, m, w.rng() < 0.5
          ? { shape: 'rect', len: 240, w: 100, go: 150, dash: 0.14, tele: 0.55, dmg: 34, posture: 14, kb: 260, fx: 'gsbelly' }
          : { shape: 'circle', where: 'self', r: 125, tele: 0.6, dmg: 40, posture: 14, kb: 200, fx: 'gsslam' }, e);
        return true;
      }
      let tx = b.x + Math.cos(b.face + 2.2) * 110, ty = b.y + Math.sin(b.face + 2.2) * 110, spd = m.speed * 0.8; // 沒有獵物：回到使徒身側
      if (hunt) { // 貼近到肉搏距離，繞到獵物與使徒的對側夾擊
        const want = U.angTo(b, e) + Math.sin(m.t * 0.5) * 0.5, D = 150;
        tx = e.x + Math.cos(want) * D; ty = e.y + Math.sin(want) * D; spd = m.speed * (U.dist(e, b) > 520 ? 1.3 : 1);
      }
      const d = Math.hypot(tx - m.x, ty - m.y), v = d > 14 ? spd * Math.min(1, d / 80) : 0, a = Math.atan2(ty - m.y, tx - m.x);
      m.vx += (Math.cos(a) * v - m.vx) * Math.min(1, 4 * dt); m.vy += (Math.sin(a) * v - m.vy) * Math.min(1, 4 * dt);
      const head = Math.hypot(m.vx, m.vy) > 30 ? Math.atan2(m.vy, m.vx) : hunt ? U.angTo(m, e) : m.ang;
      m.ang = m.face = U.rotateToward(m.ang, head, 5 * dt);
    },
  });

  // 雙人 Boss 互相喚醒：b.mate 倒下後 REVIVE 秒由 b 喚醒（每次喚醒的生命遞減）；兩人都倒下才分勝負（World.kill 的團隊規則）
  function revive(w, m, by) {
    m._reviveAt = null; m._revives = (m._revives || 0) + 1;
    for (const s of m.statuses.slice()) BD.removeStatus(m, s.id);
    Object.assign(m, { state: 'idle', stateT: 0, alive: true, posture: 0, vx: 0, vy: 0, kbx: 0, kby: 0 });
    m.hp = m.hpTrail = Math.ceil(m.maxHp * REVIVE_HP * Math.pow(0.75, m._revives - 1));
    BD.applyStatus(m, 'invuln', { dur: 1.4 }, w);
    BD.spawnFx(w, 'gsrevive', m.x, m.y, { src: by, big: true }); w.slowmo = Math.max(w.slowmo, 0.6);
    w.fx.text(m.x, m.y - m.r - 36, by.name + '將他喚醒', '#e4e0ff', 26);
    w.log(by, '把' + m.name + '喚醒了（' + Math.round(m.hp / m.maxHp * 100) + '% 生命）', true);
  }

  // 二階段大招開頭：立刻喚醒倒下的搭檔（雙人版）或貴人召喚物（召喚物版）
  BD.defineAction('gscall', (w, b) => { if (b.mate) { if (b.mate.state === 'dead') b.mate._reviveAt = 0; } else if (!BD.nobleOf(w, b)) b._nobleAt = 0; }, {});

  // 雙人版（一般對戰，World 依 def.partner 展開）：兩人互相喚醒。
  // 召喚物版（訓練場、獵魂、4v1、小兵潮）：貴人是召喚物，開場召喚、倒下後由使徒喚醒；使徒倒下時貴人還在就整場起身一次
  BD.defineTrait('godskin', {
    tick(w, b) {
      const mate = b.mate;
      if (mate) {
        if (mate.state !== 'dead' || w.winner) return;
        if (mate._reviveAt == null) { mate._reviveAt = w.time + REVIVE[b.phase - 1]; w.log(b, '將在 ' + REVIVE[b.phase - 1] + ' 秒後把' + mate.name + '喚醒', true); }
        else if (w.time >= mate._reviveAt) revive(w, mate, b);
        return;
      }
      if (w.time < (b._nobleAt || 0) || BD.nobleOf(w, b)) return;
      const m = BD.spawnMinion(w, b, 'noble', 0, 1);
      if (b._nobleAt != null && b._called) { BD.spawnFx(w, 'gsrevive', m.x, m.y, { src: b }); w.fx.text(m.x, m.y - 56, '貴人甦醒', '#e4e0ff', 22); }
      b._called = true;
    },
    onLethal(w, b) {
      const n = !b.mate && BD.nobleOf(w, b);
      if (b._rose || !n) return false;
      b._rose = true; b.hp = Math.ceil(b.maxHp * RISE_HP); b.posture = 0;
      n.hp = Math.max(1, Math.ceil(n.hp * 0.5)); // 喚醒的代價：貴人折損一半生命
      BD.applyStatus(b, 'invuln', { dur: 1.6, source: b }, w);
      BD.spawnFx(w, 'gsrevive', b.x, b.y, { src: b, big: true });
      w.fx.text(b.x, b.y - b.r - 36, '貴人將他喚醒', '#e4e0ff', 28); w.slowmo = Math.max(w.slowmo, 0.7);
      w.log(b, '倒下了，神皮貴人把他喚醒——但貴人也折損了一半生命', true);
      return true;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
