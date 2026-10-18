// 節奏統計：node test/pace_stats.js [light|heavy] [seeds]；JOBS=N 或 --jobs N 指定平行 worker 數
// 跑所有配對，輸出對戰時長、每分鐘出招次數、每次命中平均傷害、預警時間、二階段 / 大招、非鏡像勝率
'use strict';
const { stripJobs, run } = require('./lib/par');
const cli = stripJobs(process.argv.slice(2));
process.argv = process.argv.slice(0, 2).concat(cli.argv);
if (cli.jobs) process.env.JOBS = String(cli.jobs);
const { load } = require('./lib/load');
const { BD } = load();
const pace = process.argv[2] || 'light';
const seeds = (process.argv[3] || '1,2,3,4,5,6').split(',').map(Number);
const ids = BD.bosses.map((b) => b.id), byId = BD.bossById;
// 調整用：PACE_OVERRIDE='{"dmgMul":1.2,"bosses":{"ronin":{"dmgMul":0.9}}}' 會淺層合併到該預設（ai / bosses 另外合併）
let paceMsg = '';
if (process.env.PACE_OVERRIDE && BD.PACES[pace]) {
  const ov = JSON.parse(process.env.PACE_OVERRIDE), pr = BD.PACES[pace];
  for (const k in ov) {
    if (k === 'ai') pr.ai = Object.assign({}, pr.ai, ov.ai);
    else if (k === 'bosses') { pr.bosses = Object.assign({}, pr.bosses); for (const id in ov.bosses) pr.bosses[id] = Object.assign({}, pr.bosses[id], ov.bosses[id]); }
    else pr[k] = ov[k];
  }
  BD.clearPaceCache();
  paceMsg = 'PACE_OVERRIDE ' + JSON.stringify(ov);
}
// 儀器：預警時間、Boss 受到的直接命中（每場歸零，只留純資料）
let teles = [], cur = null;
const addTele0 = BD.addTele;
BD.addTele = function (w, b, inst, shape, dur, opts) { const t = addTele0.apply(this, arguments); if (cur === w && !t.soft) teles.push(t.hitIn); return t; };
if (BD.K) BD.K.addTele = BD.addTele;
const dmg0 = BD.World.prototype.damageBoss;
let hits = [];
let whiffs = 0, kds = 0, frozen = 0;
const end0 = BD.Boss.prototype.endSkill;
BD.Boss.prototype.endSkill = function () { const r = end0.apply(this, arguments); if (this.world === cur && this.state === 'whiff') whiffs++; return r; };
BD.World.prototype.damageBoss = function (src, b, p) {
  const hp = b.hp, r = dmg0.apply(this, arguments);
  if (this === cur && !p.dot && b.hp < hp) hits.push({ d: hp - b.hp, team: b.team });
  return r;
};
const jobs = [];
for (const a of ids) for (const b of ids) for (const seed of seeds) jobs.push({ a, b, seed });

// 單場模擬：儀器計數歸零，回傳純資料
function runOne(job) {
  const { a, b, seed } = job;
  const opts = { seed, intro: 0.5 }; if (pace !== 'default') opts.pace = pace;
  const w = new BD.World(byId[a], byId[b], opts); cur = w; hits = []; teles = []; whiffs = 0;
  while (!w.over && w.time < 400) { w.hitstop = 0; w.slowmo = 0; w.step(BD.STEP); }
  if (!w.over) return { timeout: true };
  const bosses = w.bosses.map((x) => ({ id: x.def.id, win: w.winner === x, phase: x.phase, skills: x.stats.skills, ults: x.stats.ults }));
  const hitsOut = hits.map((h) => ({ d: h.d, team: h.team }));
  return { time: w.time, enrage: !!w.enrageOn, kds: (w.bosses[0].stats.knockdowns || 0) + (w.bosses[1].stats.knockdowns || 0), frozen: w.frozenSteps || 0,
    bosses, hits: hitsOut, teles: teles.slice(), whiffs, loserPhase: w.winner.enemy.phase, ults: w.bosses[0].stats.ults + w.bosses[1].stats.ults };
}

// 主執行緒：依工作順序彙總與輸出（與循序版逐字相同）
function report(results) {
  if (paceMsg) console.log(paceMsg);
  const times = [], apm = {}, dph = {}, nm = {}, p2 = {}, ult = {};
  for (const id of ids) { apm[id] = []; dph[id] = []; nm[id] = [0, 0]; p2[id] = [0, 0]; ult[id] = [0, 0]; }
  let fails = 0, allHits = [], ends = { ko: 0, timeout: 0 }, enr = 0, kds = 0, whiffs = 0, frozen = 0, teles = [];
  for (const r of results) {
    const { a, b } = jobs[ends.ko + ends.timeout];
    if (r.timeout) { ends.timeout++; fails++; continue; }
    ends.ko++; if (r.enrage) enr++;
    kds += r.kds; frozen += r.frozen;
    times.push(r.time);
    teles = teles.concat(r.teles); whiffs += r.whiffs;
    for (const x of r.bosses) {
      const id = x.id, min = r.time / 60;
      apm[id].push((x.skills - x.ults) / min);
      p2[id][0] += x.phase === 2 ? 1 : 0; p2[id][1]++;
      ult[id][0] += x.ults; ult[id][1]++;
      if (a !== b) { nm[id][1]++; if (x.win) nm[id][0]++; }
    }
    for (const h of r.hits) { allHits.push(h.d); dph[r.bosses[1 - h.team].id].push(h.d); }
    if (r.loserPhase !== 2 || r.ults === 0) fails++;
  }
  const avg = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
  const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  console.log(`pace=${pace} 場數=${times.length} 超時=${ends.timeout} 進入狂暴=${enr}`);
  console.log(`對戰時長 平均 ${avg(times).toFixed(1)}s 中位 ${q(times, 0.5).toFixed(1)} p10 ${q(times, 0.1).toFixed(1)} p90 ${q(times, 0.9).toFixed(1)} min ${Math.min(...times).toFixed(1)} max ${Math.max(...times).toFixed(1)}`);
  console.log(`每分鐘出招(不含大招) 平均 ${avg(ids.map((i) => avg(apm[i]))).toFixed(1)}；每次直接命中平均傷害 ${avg(allHits).toFixed(1)}（命中數 ${allHits.length}）；預警(至判定) 平均 ${avg(teles).toFixed(2)}s 中位 ${q(teles, 0.5).toFixed(2)}s p90 ${q(teles, 0.9).toFixed(2)}s`);
  console.log(`每場：倒地 ${(kds / times.length).toFixed(1)} 次、空振破綻 ${(whiffs / times.length).toFixed(1)} 次、命中凍結 ${(frozen / times.length).toFixed(0)} 幀（${(frozen / 60 / times.length).toFixed(1)} 秒）`);
  for (const id of ids) console.log(`  ${byId[id].name.padEnd(5, '　')} 出招/分 ${avg(apm[id]).toFixed(1).padStart(5)}  傷害/命中 ${avg(dph[id]).toFixed(1).padStart(6)}  二階段 ${p2[id][0]}/${p2[id][1]}  大招/場 ${(ult[id][0] / ult[id][1]).toFixed(2)}  非鏡像勝率 ${nm[id][0]}/${nm[id][1]} = ${(100 * nm[id][0] / nm[id][1]).toFixed(0)}%`);
  console.log(fails ? `檢查未通過 ${fails}` : 'PACE CHECKS PASS');
}

const results = run(__filename, jobs, runOne);
if (results) results.then(report);
