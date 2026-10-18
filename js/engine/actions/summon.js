'use strict';
// 召喚動作：依 BD.defineMinion 的種類生成召喚物；上限（cap）與種類專屬規則（afterSummon，例如紅眼監視者）由召喚物定義負責
(function (G) {
  const BD = G.BD;
  BD.defineAction('summon', (w, b, inst, a) => {
    const type = BD.minionType(a.kind);
    let n = a.n;
    if (a.cap) n = Math.min(n, a.cap - w.minions.filter((m) => m.alive && m.owner === b && m.kind === a.kind).length);
    for (let i = 0; i < n; i++) BD.spawnMinion(w, b, a.kind, i, n);
    if (type.afterSummon) type.afterSummon(w, b, a, n);
  }, { active: true });
})(typeof window !== 'undefined' ? window : globalThis);
