// 產生拉鋸戰 AI 挑 Boss 用的克制表 js/data/lane-counter.js：每對 Boss 在 heavy 節奏 1v1，左右各打 seeds 場，記 A 對 B 的勝率（逾時算平手）
// node test/lane_counter.js [seeds=1,2,3]；JOBS=N 或 --jobs N 指定平行 worker 數。新增 Boss 後重跑；表裡沒有的配對 AI 當 0.5。
'use strict';
const fs = require('fs'), path = require('path');
const { stripJobs, run } = require('./lib/par');
const cli = stripJobs(process.argv.slice(2));
if (cli.jobs) process.env.JOBS = String(cli.jobs);
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const seeds = (cli.argv[0] || '1,2,3').split(',').map(Number);
const ids = BD.bosses.map((b) => b.id);
const jobs = [];
for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (const seed of seeds) for (const flip of [0, 1]) jobs.push({ a: ids[i], b: ids[j], seed, flip });

function runOne({ a, b, seed, flip }) {
  const L = BD.bossById[flip ? b : a], R = BD.bossById[flip ? a : b];
  const w = new BD.World(L, R, { seed, intro: 0.5, pace: 'heavy' });
  while (!w.over && w.time < 400) { w.hitstop = 0; w.slowmo = 0; w.step(BD.STEP); }
  if (!w.winner) return 0.5;
  const leftWon = w.winner.team === 0;
  return (leftWon !== !!flip) ? 1 : 0; // a 贏 = 1
}

const p = run(__filename, jobs, runOne);
if (p) p.then((res) => {
  const T = {}; for (const id of ids) T[id] = {};
  const acc = {};
  res.forEach((r, k) => { const { a, b } = jobs[k], key = a + '|' + b; (acc[key] = acc[key] || []).push(r); });
  for (const key in acc) {
    const [a, b] = key.split('|'), v = acc[key].reduce((s, x) => s + x, 0) / acc[key].length;
    T[a][b] = Math.round(v * 100) / 100; T[b][a] = Math.round((1 - v) * 100) / 100;
  }
  const out = `'use strict';
// 拉鋸戰 AI 指揮官挑 Boss 用的克制表：BD.LANE_COUNTER[a][b] = a 對 b 的 1v1 勝率（heavy，${seeds.length * 2} 場 / 對）。
// 由 node test/lane_counter.js 產生，勿手改；新增或重調 Boss 後重跑。
(function (G) {
  G.BD.LANE_COUNTER = ${JSON.stringify(T)};
})(typeof window !== 'undefined' ? window : globalThis);
`;
  fs.writeFileSync(path.join(__dirname, '..', 'js', 'data', 'lane-counter.js'), out);
  console.log(`lane-counter: ${ids.length} 位 Boss、${jobs.length} 場 → js/data/lane-counter.js`);
});
