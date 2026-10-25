// 3v3 團隊戰無頭測試：每位 Boss 至少上場一次、兩種節奏都要分出勝負且不丟錯；勝方必有存活者、敗方全滅
'use strict';
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const ids = BD.bosses.map((b) => b.id);
let n = 0;
for (const pace of ['light', 'heavy']) {
  for (let s = 0; s < ids.length; s += 3) {
    const A = [0, 1, 2].map((k) => ids[(s + k) % ids.length]), B = [3, 4, 5].map((k) => ids[(s + k + 7) % ids.length]);
    const w = new BD.World(A.map((id) => BD.bossById[id]), B.map((id) => BD.bossById[id]), { seed: s + 1, intro: 0.5, pace });
    assert.strictEqual(w.bosses.length, 6);
    w.simulate(400);
    const tag = `${pace} ${A}/${B}`;
    assert.ok(w.winner, tag + ' 未分出勝負');
    const wt = w.winner.team;
    assert.ok(w.bosses.every((b) => b.team === wt || b.state === 'dead'), tag + ' 敗方未全滅');
    assert.ok(w.winner.state !== 'dead', tag + ' 勝者已倒下');
    for (const b of w.bosses) assert.ok(b.enemy.team !== b.team, tag + ' 目標是隊友');
    n++;
  }
}
console.log(`team.test: ${n} 場 3v3 全部分出勝負`);
