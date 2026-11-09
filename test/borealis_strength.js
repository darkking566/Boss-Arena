'use strict';
// 有界強度小樣本：27 種對手 × 3 種子 × 交換藍紅；不代替所有地圖／隊伍的平衡驗收。
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const fs = require('fs'), crypto = require('crypto');
const def = BD.bossById.borealis, rows = [];
for (const pace of ['light', 'heavy']) {
  let wins = 0, n = 0, time = 0, roars = 0, breaths = 0;
  for (const foe of BD.bosses.filter(b => b.id !== def.id)) for (const seed of [7, 31, 71]) for (const flip of [false, true]) {
    const w = new BD.World(flip ? foe : def, flip ? def : foe, { seed, pace, intro: 0 }); w.simulate(450);
    if (!w.winner) throw new Error('unfinished ' + foe.id);
    const b = w.bosses[flip ? 1 : 0], win = w.winner === b;
    wins += +win; n++; time += w.time; roars += b.stats.uses.freezing_roar || 0; breaths += (b.stats.uses.ice_breath || 0) + (b.stats.uses.sweeping_breath || 0);
    rows.push({ pace, foe: foe.id, seed, flip, win, time: +w.time.toFixed(2) });
  }
  console.log(JSON.stringify({ pace, opponents: BD.bosses.length - 1, games: n, wins, winRate: +(wins / n).toFixed(4), meanSeconds: +(time / n).toFixed(2), roarsPerGame: +(roars / n).toFixed(2), breathsPerGame: +(breaths / n).toFixed(2) }));
}
const sources = ['js/data/bosses/borealis.js', 'js/engine/actions/borealis.js', 'js/engine/status.js', 'js/engine/boss.js', 'js/engine/world.js', 'js/engine/ai.js', 'js/data/pace.js'];
console.log('SOURCE SHA256', crypto.createHash('sha256').update(sources.map(p => fs.readFileSync(p)).join('')).digest('hex'));
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(rows, null, 2));
