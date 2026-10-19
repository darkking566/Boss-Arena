'use strict';
// 特效庫｜受擊（gore）：角色被命中時依「材質」噴出不同的血肉 —— 血、熔渣、冰屑、黏液、暗影、乾草。
// 材質由角色資料的 hurt 欄位決定（flesh / magma / frost / ooze / shadow / straw，預設 flesh）；落地後留下血漬 / 焦痕 / 黏液（永久痕跡，見 scars.js）。
// 純視覺：亂數只用 BD.vrng；不碰 DOM。由 World.damageBoss 在命中時呼叫。
(function (G) {
  const BD = G.BD, V = BD.vrng, U = BD.U, TAU = Math.PI * 2, SCAR_CAP = 420;
  // drops 飛濺液滴色、mist 血霧色票（見 render/world.js PUFF）、extra 額外粒子、scar 落地痕跡配色、amt 液滴量倍率
  const MAT = BD.HURT = {
    flesh: { drops: ['#c4132a', '#9a0e1f', '#6e0814'], mist: 'blood', amt: 1, scar: { c: '#4a0610', c2: '#700c1a' } },
    magma: { drops: ['#ff7a1c', '#ffb24a', '#ffd27a'], mist: 'steam', amt: 0.7, extra: 'embers', scar: { c: '#120b07', c2: '#33280f', glow: '#ff6a1a' } },
    frost: { drops: ['#e8f8ff', '#bfe9ff', '#8fd0f0'], mist: 'snow', amt: 0.6, extra: 'shards', scar: { c: '#e9f7ff', c2: '#9fd3ea' } },
    ooze: { drops: ['#9ad04a', '#6fa02a', '#4f7d14'], mist: 'toxic', amt: 1, extra: 'bubbles', scar: { c: '#33520f', c2: '#587a20' } },
    shadow: { drops: ['#7a4cc0', '#4b2a7a', '#1b0f2e'], mist: 'ink', amt: 0.8, extra: 'wisps', scar: { c: '#150a24', c2: '#2e1c46', glow: '#a070ff' } },
    straw: { drops: ['#e6c878', '#c9a850', '#a8873f'], mist: 'sand', amt: 0.8, extra: 'chaff' },
  };
  const jag = (n) => Array.from({ length: n }, () => 0.6 + V() * 0.4);

  BD.defineEffect('gore', {
    name: '受擊血肉', category: '爆炸',
    desc: '角色被命中時依材質噴出液滴（血 / 熔渣 / 冰屑 / 黏液 / 暗影 / 乾草）：沿打擊方向的扇形噴濺，重擊追加二波、血霧與落地痕跡。純視覺的受擊回饋。',
    params: { mat: 'flesh' },
    spawn(fx, x, y, o) {
      const v = o.victim, m = MAT[(v && v.def && v.def.hurt) || o.mat] || MAT.flesh;
      const vr = v && v.r || 24, dmg = o.dmg == null ? 60 : o.dmg, big = !!o.big || !!o.lethal;
      const k = U.clamp(dmg / 60, 0.4, 3) * (o.lethal ? 1.8 : 1), sk = Math.sqrt(k);
      const dir = o.omni ? null : o.angle;
      const ox = dir == null ? x : x + Math.cos(dir) * vr * 0.3, oy = dir == null ? y : y + Math.sin(dir) * vr * 0.3;
      const pick = (a) => a[(V() * a.length) | 0];
      const ang = (spread) => (dir == null || V() < 0.15 ? V() * TAU : dir + (V() - 0.5) * spread);
      const spray = (n, spd, spread) => {
        for (let i = 0; i < n; i++) {
          const a = ang(spread), s = spd * (0.3 + V() * 0.7);
          fx.stalk(ox, oy, Math.cos(a) * s, Math.sin(a) * s, 140 + V() * 320, a, 0, 5 + V() * 8 * sk, 3 + V() * 2.5, pick(m.drops), 1.6 + V() * 1.2);
        }
      };
      const n = Math.min(90, Math.round((10 + 18 * k) * m.amt)), spd = 240 + 160 * sk;
      spray(n, spd, 1.1);
      if (big) { fx.after(0.1, () => spray(Math.round(n * 0.6), spd * 0.8, 1.5)); fx.after(0.22, () => spray(Math.round(n * 0.35), spd * 0.6, 2)); }

      // 材質專屬的額外粒子
      const burst = (kind, cnt, sp, life, col, size, drag) => {
        for (let i = 0; i < cnt; i++) { const a = ang(1.6), s = sp * (0.3 + V() * 0.7); if (!fx.part(kind, ox, oy, Math.cos(a) * s, Math.sin(a) * s, life * (0.7 + V() * 0.6), col, size * (0.7 + V() * 0.6), drag)) break; }
      };
      const cnt = Math.round(5 * k);
      if (m.extra === 'embers') { fx.embers(ox, oy, '#ff9a3a', cnt + 2, vr * 0.6, 60); fx.sparkle(ox, oy, '#ffb040', Math.round(8 * k), 420, dir, 1.3); }
      else if (m.extra === 'shards') burst(BD.PK.SHARD, cnt + 2, 320, 0.45, '#dff6ff', 4, 3.5);
      else if (m.extra === 'bubbles') burst(BD.PK.BUBBLE, cnt, 90, 0.9, '#b6e26a', 3.5, 1.5);
      else if (m.extra === 'wisps') burst(BD.PK.WISP, cnt, 70, 0.9, '#7a4cc0', 8, 1.2);
      else if (m.extra === 'chaff') fx.debris(ox, oy, '#d8b86a', Math.round(8 * k), 260, 3, vr * 0.4);

      // 血霧：中等以上的命中炸開一團，順著打擊方向飄出
      if (dmg >= 40 || big) {
        const a = dir == null ? 0 : dir, cc = big ? 2 : 1;
        for (let i = 0; i < cc; i++) fx.puff(ox, oy, Math.cos(a) * 50, Math.sin(a) * 50, vr * 0.5, vr * (1.3 + 0.3 * sk), 0.7 + 0.2 * sk, m.mist, 0.5);
      }

      // 落地痕跡：水面上不留，改成一團暈開的霧
      if (dmg >= 20) {
        const water = BD.pondAt && (BD.pondAt(x, y) || BD.biomeAt(x).id === 'lake');
        if (water) fx.puff(x, y, 0, 0, vr * 0.6, vr * 2, 1.6, m.mist, 0.4);
        else if (m.scar) fx.after(0.25, () => {
          const nb = big || dmg >= 100 ? 3 : dmg >= 40 ? 2 : 1;
          for (let i = 0; i < nb; i++) {
            const a = ang(0.8), d = vr * (0.6 + V() * 1.8 * sk), bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d;
            if (BD.pondAt && BD.pondAt(bx, by)) continue;
            fx.scars.push({ k: 'blot', x: bx, y: by, r: Math.min(40, 7 + V() * 9 * sk), rot: V() * TAU, pts: jag(12), al: 0.9, c: m.scar.c, c2: m.scar.c2, glow: m.scar.glow, age: 0 });
            if (fx.scars.length > SCAR_CAP) fx.scars.shift();
          }
        });
      }
      if (o.lethal) { fx.shake(18, dir); fx.flash('#ffffff', 0.18); }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
