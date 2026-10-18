'use strict';
// 召喚物實體：通用生成 / 擊殺 / 每幀更新；各種類的數值與行為由 BD.defineMinion 定義（js/engine/minions/）
(function (G) {
  const BD = G.BD, U = BD.U;
  const A = () => BD.ARENA;

  BD.spawnMinion = function (w, b, kind, i, n) {
    const type = BD.minionType(kind);
    const t = b.enemy, base = U.angTo(b, t);
    const m = { kind, team: b.team, owner: b, dmgMul: b.dmgMul, alive: true, t: 0, vx: 0, vy: 0, hurt: 0, cd: 0.8 + i * 0.35, fuse: -1, face: base, statuses: [] };
    const [x, y] = type.spawn(w, b, m, i, n, t, base);
    m.x = U.clamp(x, 30, A().w - 30); m.y = U.clamp(y, 30, A().h - 30);
    w.minions.push(m);
    BD.spawnFx(w, 'summon', m.x, m.y, { src: b });
    return m;
  };
  BD.killMinion = function (w, m) {
    if (!m.alive) return;
    m.alive = false;
    BD.spawnFx(w, 'burst', m.x, m.y, { src: m.owner });
    const type = BD.minionTypes[m.kind];
    if (type && type.onDeath) type.onDeath(w, m);
  };
  function updateMinion(w, m, dt) {
    m.t += dt; m.hurt -= dt; BD.tickStatuses(m, dt, w); if (!m.alive) return; m.dmgMul = m.owner.dmgMul;
    const e = m.team === 2 ? null : w.bosses[1 - m.team]; // team 2 = 中立（敵我不分）
    const eAlive = !!e && e.state !== 'dead';
    if (BD.minionType(m.kind).update(w, m, dt, e, eAlive) === true) return;
    m.x += m.vx * dt; m.y += m.vy * dt;
    w.confine(m);
  }
  BD.updateMinions = function (w, dt) {
    for (const m of w.minions) if (m.alive) updateMinion(w, m, dt);
    w.minions = w.minions.filter((m) => m.alive);
  };
  // World.stats 的初始欄位由各召喚物種類提供（例如紅眼監視者的出現次數）
  BD.minionStats = function () {
    const s = {};
    for (const k in BD.minionTypes) if (BD.minionTypes[k].stats) Object.assign(s, BD.minionTypes[k].stats());
    return s;
  };
})(typeof window !== 'undefined' ? window : globalThis);
