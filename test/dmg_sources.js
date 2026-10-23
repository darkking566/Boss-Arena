// 傷害來源診斷：node test/dmg_sources.js [seeds]   （環境變數 SELF=itachi、PACE=heavy）
// 純觀察：包住 World.damageBoss 只做計數，不改戰鬥。依「造成傷害的招式 / 狀態」分別統計 SELF 打出與承受的傷害，每場平均
'use strict';
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const SELF = process.env.SELF || 'itachi', PACE = process.env.PACE || 'heavy';
const seeds = (process.argv[2] || '1,2,3,4,5,6').split(',').map(Number);
const byId = BD.bossById, ids = BD.bosses.map((b) => b.id);

let cur = null, dealt = {}, taken = {};
const add = (tbl, key, d) => { const e = tbl[key] || (tbl[key] = { n: 0, d: 0 }); e.n++; e.d += d; };
const dmg0 = BD.World.prototype.damageBoss;
BD.World.prototype.damageBoss = function (src, b, p) {
  const hp = b.hp, r = dmg0.apply(this, arguments);
  if (this !== cur || b.hp >= hp) return r;
  const d = hp - b.hp;
  const srcKey = (s) => (p.statusDmg ? 'status:' + p.statusDmg : s && s.inst ? s.inst.skill.id : 'other');
  if (src && src.def && src.def.id === SELF) add(dealt, srcKey(src), d);
  else if (b.def.id === SELF) add(taken, srcKey(src), d);
  return r;
};

const jobs = [];
for (const o of ids) if (o !== SELF) for (const seed of seeds) { jobs.push({ a: SELF, b: o, seed }); jobs.push({ a: o, b: SELF, seed }); }

let games = 0, wins = 0, wonBy = {};
for (const job of jobs) {
  const w = new BD.World(byId[job.a], byId[job.b], { seed: job.seed, intro: 0.5, pace: PACE });
  cur = w;
  while (!w.over && w.time < 400) { w.hitstop = 0; w.slowmo = 0; w.step(BD.STEP); }
  if (!w.over) continue;
  games++;
  const selfIdx = w.bosses.findIndex((x) => x.def.id === SELF);
  if (w.winner === w.bosses[selfIdx]) wins++;
  else wonBy[w.winner.def.id] = (wonBy[w.winner.def.id] || 0) + 1;
}
cur = null;

const show = (title, tbl) => {
  const total = Object.values(tbl).reduce((s, v) => s + v.d, 0);
  console.log(`${title}（每場平均 ${(total / games).toFixed(0)}）`);
  for (const [k, v] of Object.entries(tbl).sort((x, y) => y[1].d - x[1].d).slice(0, 14)) {
    console.log(`  ${k.padEnd(18)} 每場 ${(v.d / games).toFixed(1).padStart(6)} 傷害  每場 ${(v.n / games).toFixed(1).padStart(5)} 次  佔比 ${(100 * v.d / total).toFixed(0)}%`);
  }
};
console.log(`${SELF} 勝 ${wins}/${games} = ${(100 * wins / games).toFixed(0)}%　PACE=${PACE}　敗給：${JSON.stringify(wonBy)}`);
show(`${SELF} 打出的傷害（依來源）`, dealt);
show(`${SELF} 承受的傷害（依對手來源）`, taken);
