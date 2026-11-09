'use strict';
// 有界強度小樣本：每位對手 × 3 種子 × 交換藍紅；神皮雙人組是使徒＋貴人兩位 Boss，勝負看隊伍。統計每場喚醒次數。不代替所有地圖／隊伍的平衡驗收。
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const def = BD.bossById.godskinduo;
for (const pace of ['light', 'heavy']) {
  let wins = 0, n = 0, time = 0, revives = 0;
  for (const foe of BD.bosses.filter(b => b.id !== def.id)) for (const seed of [7, 31, 71]) for (const flip of [false, true]) {
    const w = new BD.World(flip ? foe : def, flip ? def : foe, { seed, pace, intro: 0 }); w.simulate(450);
    if (!w.winner) throw new Error('unfinished ' + foe.id);
    const team = flip ? 1 : 0; wins += +(w.winner.team === team); n++; time += w.time;
    revives += w.bosses.reduce((s, b) => s + (b.team === team ? b._revives || 0 : 0), 0);
  }
  console.log(JSON.stringify({ pace, games: n, wins, winRate: +(wins / n).toFixed(4), meanSeconds: +(time / n).toFixed(1), revivesPerGame: +(revives / n).toFixed(2) }));
}
