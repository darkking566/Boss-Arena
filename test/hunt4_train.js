// 狩獵模式無頭訓練：同一份存檔連打 N 場，每 every 場印出該段的勝率 / 平均時間 / 力竭 / 反應與翻滾成功率，
// 並在「固定評測組」（每位 Boss × 4 個固定種子，用存檔的複本打，不回寫）上量一次勝率與力竭——訓練段的對局各不相同、雜訊大，評測組才是可比的曲線。
// 用法：node test/hunt4_train.js [bossId|all] [場數=200] [每段=40] [--save 檔案.json]（給 --save 會讀入既有存檔、結束後寫回）
'use strict';
const fs = require('fs');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });

const run = (w) => { while (!w.over && w.time < 1000) { w.hitstop = 0; w.slowmo = 0; w.step(BD.STEP); } return w; };
function eval4(ids, save) { // 固定評測組：勝率、平均力竭
  let wins = 0, faints = 0, n = 0;
  for (const seed of [7, 8, 9, 10]) for (const id of ids) {
    const w = run(new BD.World(BD.Hunt4.team(), BD.bossById[id], { seed, pace: 'heavy', hunt4: true, h4save: JSON.parse(JSON.stringify(save)) }));
    n++; faints += w.hunt4.faints; if (w.winner && w.winner.team === 0) wins++;
  }
  return { win: wins / n, faints: faints / n };
}
function train(boss, n, every, save, log) {
  const ids = boss === 'all' ? BD.bosses.map((b) => b.id) : [boss], rows = [];
  let blk = null;
  for (let i = 0; i < n; i++) {
    if (i % every === 0) rows.push(blk = { from: i + 1, n: 0, wins: 0, t: 0, faints: 0, react: [0, 0], dodge: [0, 0], ev: eval4(ids, save) });
    const id = ids[i % ids.length], w = new BD.World(BD.Hunt4.team(), BD.bossById[id], { seed: 1000 + i, pace: 'heavy', hunt4: true, h4save: save }), st = w.hunt4;
    run(w);
    for (const h of st.hunters) for (const k of ['react', 'dodge']) { blk[k][0] += h.brain.res[k][0]; blk[k][1] += h.brain.res[k][1]; }
    blk.n++; blk.t += w.time; blk.faints += st.faints; if (w.winner && w.winner.team === 0) blk.wins++;
    if (log && (i + 1) % every === 0) log(blk);
  }
  rows.final = eval4(ids, save);
  return rows;
}
const ev = (e) => `評測 勝率 ${(e.win * 100).toFixed(0).padStart(3)}% 力竭 ${e.faints.toFixed(2)}`;
const fmt = (b) => `[${ev(b.ev)}]  訓練 ${String(b.from).padStart(4)}-${String(b.from + b.n - 1).padEnd(4)} 勝率 ${(b.wins / b.n * 100).toFixed(0).padStart(3)}%  時間 ${(b.t / b.n).toFixed(0).padStart(4)}s  力竭 ${(b.faints / b.n).toFixed(2)}  反應成功 ${(b.react[0] / Math.max(1, b.react[1]) * 100).toFixed(0)}%  翻滾成功 ${(b.dodge[0] / Math.max(1, b.dodge[1]) * 100).toFixed(0)}%`;

if (require.main === module) {
  const a = process.argv.slice(2), si = a.indexOf('--save'), file = si >= 0 ? a.splice(si, 2)[1] : null;
  const save = file && fs.existsSync(file) ? BD.H4Brain.sanitize(JSON.parse(fs.readFileSync(file, 'utf8'))) : BD.H4Brain.newSave();
  const rows = train(a[0] || 'all', +a[1] || 200, +a[2] || 40, save, (b) => console.log(fmt(b)));
  console.log(`[${ev(rows.final)}]  訓練結束（存檔共 ${save.matches} 場）`);
  for (const hd of BD.HUNT4.HUNTERS) console.log(hd.name, hd.weapons.map((wp) => `${BD.HUNT4.WEAPON_NAMES[wp]} 熟練 ${(BD.H4Brain.mastery(save, hd.id, wp) * 100).toFixed(0)}%`).join('、'));
  if (file) fs.writeFileSync(file, JSON.stringify(save));
}
module.exports = { train, eval4 };
