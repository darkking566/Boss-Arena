'use strict';
// 黑暗棄子・艾絲緹被動「星屑流散」（改編）：落地行動時每 9 秒，先在對手腳邊亮起預警圈，0.7 秒後撒下短命星屑，只減速、不累積任何狀態。
(function (G) {
  const BD = G.BD;
  BD.defineTrait('stardust', {
    tick(w, b, dt) {
      if (w.intro > 0) return;
      if (b.state === 'transition' || b.state === 'dead' || BD.getMod(b, 'untargetable')) { b._dustTimer = 0; b._dustPending = null; return; }
      if (b._dustPending) {
        const p = b._dustPending; p.rem -= dt;
        if (p.rem > 0) return;
        b._dustPending = null;
        if (b._dustZone && w.zones.includes(b._dustZone)) return; // 同時只留一團自己的被動星屑
        BD.makeZone(w, b, p.x, p.y, { kind: 'stardust', r: p.r, dur: 2.6, delay: 0, dps: 5, status: { id: 'slow', dur: 1.2 } });
        b._dustZone = w.zones[w.zones.length - 1];
        BD.spawnFx(w, 'astelstardust', p.x, p.y, { src: b, radius: p.r });
        w.log(b, '星屑流散：碎裂的星屑落在腳邊，拖慢了腳步。', true);
        return;
      }
      b._dustTimer = (b._dustTimer || 0) + dt;
      if (b._dustTimer < 9) return;
      const foe = b.enemy;
      if (!foe || foe.state === 'dead') return; // 沒有對手就先不丟，計時留著
      b._dustTimer = 0;
      const r = 150 * (b.sizeMul || 1) * 0.8;
      b._dustPending = { x: foe.x, y: foe.y, r, rem: 0.7 };
      BD.K.addTele(w, b, null, { kind: 'circle', x: foe.x, y: foe.y, r }, 0.7, { detached: true, color: '#b9a2ff' });
    },
    onReset(w, b) { b._dustTimer = 0; b._dustPending = null; b._dustZone = null; },
  });
})(typeof window !== 'undefined' ? window : globalThis);
