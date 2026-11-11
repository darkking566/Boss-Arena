'use strict';
// 飛龍桂雷爾：狀態「母龍威壓」與被動「母龍餘威」（皆為改編）。
// 原作的格雷爾之嚎使周圍敵人攻擊力 −15%、防禦 −10%（持續 60 秒）；本作改成短時間版本。
(function (G) {
  const BD = G.BD;
  // 狀態：造成的傷害 −15%、承受的傷害 +10%（取原作數值，持續時間縮短）
  BD.defineStatus('powershred', {
    name: '母龍威壓', tags: ['debuff'], stacking: 'refresh', defaultDur: 6, visual: 'powershred',
    modifiers: { dmgDealtMul: 0.85, dmgTakenMul: 1.1 },
  });

  // 被動：落地行動時，每 15 秒（二階段 11 秒）昂首一吼——先在腳下亮起預警圈，0.9 秒後氣浪炸開，擊退對手並施加母龍威壓
  BD.defineTrait('greyoll', {
    tick(w, b, dt) {
      if (w.intro > 0) return;
      if (b.state === 'transition' || b.state === 'dead' || BD.getMod(b, 'untargetable') || BD.hasStatus(b, 'hidden')) { b._roarTimer = 0; b._roarRem = 0; return; }
      const p2 = b.phase === 2, r = b.r + 230;
      if (b._roarRem > 0) {
        b._roarRem -= dt;
        if (b._roarRem > 0) return;
        b._roarRem = 0;
        BD.spawnFx(w, 'greyllroar', b.x, b.y, { src: b, radius: r });
        w.applyArea(b, { kind: 'circle', x: b.x, y: b.y, r }, { dmg: p2 ? 30 : 22, posture: 14, kb: 300, status: { id: 'powershred', dur: p2 ? 7 : 5 } });
        w.log(b, '母龍餘威：咆哮震出一圈氣浪，母龍的威壓壓得人抬不起手。', true);
        return;
      }
      b._roarTimer = (b._roarTimer || 0) + dt;
      if (b._roarTimer < (p2 ? 11 : 15)) return;
      const foe = b.enemy;
      if (!foe || foe.state === 'dead' || Math.hypot(foe.x - b.x, foe.y - b.y) > r + foe.r + 120) return; // 對手太遠就先不吼，計時留著
      b._roarTimer = 0; b._roarRem = 0.9;
      BD.K.addTele(w, b, null, { kind: 'circle', x: b.x, y: b.y, r }, 0.9, { detached: true, color: '#9fb4c8' });
    },
    onReset(w, b) { b._roarTimer = 0; b._roarRem = 0; },
  });
})(typeof window !== 'undefined' ? window : globalThis);
