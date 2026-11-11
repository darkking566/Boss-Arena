'use strict';
// 輝石龍亞杜拉被動「輝石結晶」（改編）：落地行動時每 10 秒，先在對手腳邊亮起預警圈，0.8 秒後長出輝石結晶殘滯，只減速；同時只留一團。
(function (G) {
  const BD = G.BD;
  BD.defineTrait('glintbloom', {
    tick(w, b, dt) {
      if (w.intro > 0) return;
      if (b.state === 'transition' || b.state === 'dead' || BD.getMod(b, 'untargetable')) { b._bloomTimer = 0; b._bloomPending = null; return; }
      if (b._bloomPending) {
        const p = b._bloomPending; p.rem -= dt;
        if (p.rem > 0) return;
        b._bloomPending = null;
        if (b._bloomZone && w.zones.includes(b._bloomZone)) return;
        BD.makeZone(w, b, p.x, p.y, { kind: 'glintbloom', r: p.r, dur: 2.8, delay: 0, dps: 5, status: { id: 'slow', dur: 1.2 } });
        b._bloomZone = w.zones[w.zones.length - 1];
        BD.spawnFx(w, 'adulabloom', p.x, p.y, { src: b, radius: p.r });
        w.log(b, '輝石結晶：腳邊的地面長出青白的結晶，拖慢了腳步。', true);
        return;
      }
      b._bloomTimer = (b._bloomTimer || 0) + dt;
      if (b._bloomTimer < 10) return;
      const foe = b.enemy;
      if (!foe || foe.state === 'dead') return;
      b._bloomTimer = 0;
      const r = 150 * (b.sizeMul || 1) * 0.75;
      b._bloomPending = { x: foe.x, y: foe.y, r, rem: 0.8 };
      BD.K.addTele(w, b, null, { kind: 'circle', x: foe.x, y: foe.y, r }, 0.8, { detached: true, color: '#6fe3ff' });
    },
    onReset(w, b) { b._bloomTimer = 0; b._bloomPending = null; b._bloomZone = null; },
  });
})(typeof window !== 'undefined' ? window : globalThis);
