// 狩獵團隊調校：同 Boss / 種子 / 存檔條件，比較勝率、力竭、時間、合作與道具支援。
// node test/hunt4_coop_stats.js [輸出.log] [--legacy-support]；不修改正式基準或使用者存檔。
'use strict';
const fs = require('fs');
const { load } = require('./lib/load');
const { BD, files } = load({ noFx: true });
const sourceHash = require('crypto').createHash('sha256').update(files.map((f) => fs.readFileSync(f, 'utf8')).join('\n')).digest('hex');
const legacy = process.argv.includes('--legacy-support');
// 當其他戰鬥規則同時調整時，在相同載入來源裡重播改動前的兩個道具分支，才能公平比較。
if (legacy) BD.Hunt4.trySupport = (w, st, h) => {
  const I = h.h4.items, H4 = BD.HUNT4, b = st.boss, p = h.def.persona, U = BD.U;
  const use = (dur, text) => { h.setState('recover', dur); w.fx.text(h.x, h.y - h.r - 24, text, '#e8f4ff', 16); };
  if (I.dust > 0) {
    const hurt = st.hunters.filter((x) => x.state !== 'dead' && x.hp < x.maxHp * 0.5 && U.dist(x, h) < H4.ITEMS.dustR);
    if (hurt.length >= 2) {
      I.dust--; h.stats.h4.dusts++; use(0.8, '生命粉塵');
      for (const x of st.hunters) if (x.state !== 'dead' && U.dist(x, h) < H4.ITEMS.dustR) { const n = Math.round(x.maxHp * H4.ITEMS.dustHeal); x.hp = Math.min(x.maxHp, x.hp + n); w.fx.text(x.x, x.y - x.r - 14, '+' + n, '#7dffb0', 18); }
      w.log(h, '撒出生命粉塵'); return true;
    }
  }
  const t = b._target;
  if (I.flash > 0 && t && t !== h && t.state !== 'dead' && t.hp < t.maxHp * H4.ITEMS.flashAt && b.state !== 'stun' && b.state !== 'knockdown' && b.state !== 'transition' && w.rng() < 0.3 + 0.6 * p.care) {
    I.flash--; h.stats.h4.flashes++; use(0.4, '閃光彈！');
    const dur = H4.ITEMS.flashDur * Math.pow(H4.ITEMS.flashFade, st.flashes++) * BD.H4Gear.mul(h, 'fdur');
    b.setState('stun', dur); w.fx.text(b.x, b.y - b.r - 34, '目眩！', '#ffffff', 24); w.fx.ring(h.x, h.y, 10, 160, 0.3, '#ffffff', 8);
    w.log(h, `丟閃光彈掩護 ${t.name}`, true); return true;
  }
  return false;
};
const results = [];
for (const xp of [0, 150]) {
  const rows = [];
  for (const def of BD.bosses) for (const seed of [7, 17]) {
    const save = BD.H4Brain.newSave();
    if (xp) for (const hd of BD.HUNT4.HUNTERS) for (const wp of hd.weapons) BD.H4Brain.mem(save, hd.id).xp[wp] = xp;
    const w = new BD.World(BD.Hunt4.team(), def, { seed, pace: 'heavy', hunt4: true, h4save: save, intro: 0.5 });
    for (let i = 0; i < 910 * 60 && !w.over; i++) { w.hitstop = 0; w.freezeF = 0; w.step(BD.STEP); }
    if (!w.winner || !w.over) throw new Error(def.id + ' 未完成');
    const st = w.hunt4, sum = (k) => st.hunters.reduce((n, h) => n + (h.stats.h4.coop ? h.stats.h4.coop[k] : 0), 0);
    const support = (k) => st.hunters.reduce((n, h) => n + ((h.stats.h4.support || {})[k] || 0), 0);
    if (sum('started') !== sum('success') + sum('cancelled') + sum('missed') || sum('assists') !== sum('success')) throw new Error(def.id + ' 合作結算不平衡');
    const flashes = st.hunters.reduce((n, h) => n + h.stats.h4.flashes, 0);
    if (!legacy && flashes !== support('coverSafe') + support('coverFaint') + support('coverEnded')) throw new Error(def.id + ' 掩護觀察未完整結算');
    rows.push({ boss: def.id, seed, win: w.winner.team === 0, time: w.time, faints: st.faints,
      pops: st.hunters.reduce((n, h) => n + h.stats.h4.pops, 0), started: sum('started'), success: sum('success'), cancelled: sum('cancelled'), missed: sum('missed'),
      dusts: st.hunters.reduce((n, h) => n + h.stats.h4.dusts, 0), flashes: st.hunters.reduce((n, h) => n + h.stats.h4.flashes, 0),
      healing: support('healing'), allyHealing: support('allyHealing'), recipients: support('recipients'), interrupts: support('interrupts'),
      coverSafe: support('coverSafe'), coverFaint: support('coverFaint'), coverEnded: support('coverEnded') });
  }
  const avg = (k) => rows.reduce((n, x) => n + x[k], 0) / rows.length;
  const summary = { xp, matches: rows.length, wins: rows.filter((r) => r.win).length, time: avg('time'), faints: avg('faints'), pops: avg('pops'),
    started: avg('started'), success: avg('success'), cancelled: avg('cancelled'), missed: avg('missed'), dusts: avg('dusts'), flashes: avg('flashes'),
    healing: avg('healing'), allyHealing: avg('allyHealing'), recipients: avg('recipients'), interrupts: avg('interrupts') };
  results.push({ sourceHash, supportMode: legacy ? 'legacy' : 'current', summary, rows }); console.log(JSON.stringify(summary));
}
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(results, null, 2));
