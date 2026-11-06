'use strict';
// 凝成後獨立留在原處的輝劍：施法者可繼續移動 / 出招；死亡與轉階段清除尚未射出的劍。
(function (G) {
  const BD = G.BD, U = BD.U;
  BD.formGlintblades = function (w, b, a) {
    const list = b._glintblades || (b._glintblades = []), n = Math.min(9, a.n || 1), face = b.face;
    for (let i = 0; i < n; i++) {
      const side = (i - (n - 1) / 2) * (a.spacing || 48), back = 35 + Math.abs(i - (n - 1) / 2) * 13;
      const [x, y] = BD.K.clampPt(b.x - Math.cos(face) * back - Math.sin(face) * side, b.y - Math.sin(face) * back + Math.cos(face) * side, 35);
      const delay = (a.delay || 1.2) + i * (a.gap || 0.12);
      const blade = { x, y, face, formed: w.time, launchAt: w.time + delay };
      list.push(blade);
      BD.spawnFx(w, 'redwolfglint', x, y, { src: b, radius: 25 });
      // Detached from the skill instance deliberately: the wolf attacks while its blades wait.
      w.later(delay, () => {
        const index = list.indexOf(blade);
        if (index < 0) return;
        list.splice(index, 1);
        if (b.state === 'dead' || b.state === 'transition' || w.over) return;
        const foe = w.foeOf(b.team, blade);
        if (!foe || foe.state === 'dead') return;
        const angle = U.angTo(blade, foe);
        BD.spawnProj(w, { x, y, r: 0 }, b, angle, Object.assign({}, a, { kind: 'glintblade' }));
        BD.spawnFx(w, 'redwolfglint', x, y, { src: b, angle, radius: 18 });
      });
    }
  };
  BD.defineAction('glintblades', (w, b, inst, a) => BD.formGlintblades(w, b, a), { active: true });
  BD.defineTrait('glinthunter', {
    onReset(w, b) { b._wolfSteps = 0; b._wolfGlintReady = 0; },
    onDash(w, b) {
      if (b.state === 'dead' || b.state === 'transition') return;
      b._wolfSteps = (b._wolfSteps || 0) + 1;
      if (b._wolfSteps < 2 || w.time < (b._wolfGlintReady || 0)) return;
      b._wolfSteps = 0; b._wolfGlintReady = w.time + 7;
      BD.formGlintblades(w, b, { n: 1, delay: 1.3, speed: 720, r: 10, dmg: 40, posture: 12, kb: 80, life: 1.7, homing: 1.1 });
      w.fx.text(b.x, b.y - b.r - 25, '獵步留輝', '#8bdfff', 17);
    },
    tick(w, b) {
      if (b.state === 'transition' && b._glintblades) b._glintblades.length = 0;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
