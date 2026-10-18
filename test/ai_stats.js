// AI 統計：node test/ai_stats.js [pace=heavy] [seeds=1,2,3,4,5,6]；JOBS=N 或 --jobs N 指定平行 worker 數
// 翻滾成功率（翻滾後 0.8 秒內未受直接命中）、抓翻滾命中（對手翻滾開始後 0.3~1.3 秒內——無敵結束後——受到的直接命中）、
// 連段使用（若 b.stats.combo 存在）、對戰時長、二階段 / 大招與非鏡像勝率
'use strict';
const { stripJobs, run } = require('./lib/par');
const cli = stripJobs(process.argv.slice(2));
process.argv = process.argv.slice(0, 2).concat(cli.argv);
if (cli.jobs) process.env.JOBS = String(cli.jobs);
const { load } = require('./lib/load');
const { BD } = load();
const pace = process.argv[2] || 'heavy';
const seeds = (process.argv[3] || '1,2,3,4,5,6').split(',').map(Number);
let paceMsg = '';
if (process.env.PACE_OVERRIDE && BD.PACES[pace]) {
  const ov = JSON.parse(process.env.PACE_OVERRIDE), pr = BD.PACES[pace];
  for (const k in ov) {
    if (k === 'ai') { pr.ai = Object.assign({}, pr.ai); for (const j in ov.ai) pr.ai[j] = (ov.ai[j] && typeof ov.ai[j] === 'object' && !Array.isArray(ov.ai[j]) && pr.ai[j] && typeof pr.ai[j] === 'object') ? Object.assign({}, pr.ai[j], ov.ai[j]) : ov.ai[j]; }
    else if (k === 'bosses') { pr.bosses = Object.assign({}, pr.bosses); for (const id in ov.bosses) pr.bosses[id] = Object.assign({}, pr.bosses[id], ov.bosses[id]); }
    else pr[k] = ov[k];
  }
  BD.clearPaceCache();
  paceMsg = 'PACE_OVERRIDE ' + JSON.stringify(ov);
}
const ids = BD.bosses.map((b) => b.id), byId = BD.bossById;
// 每場的命中 / 翻滾紀錄（只存索引與時間，避免留著 Boss 物件）
let cur = null, hitLog = [], dodgeLog = [];
const dmg0 = BD.World.prototype.damageBoss;
BD.World.prototype.damageBoss = function (src, b, p) {
  const hp = b.hp, r = dmg0.apply(this, arguments);
  if (this === cur && !p.dot && b.hp < hp) hitLog.push({ t: this.time, b: this.bosses.indexOf(b), src: src && (src.isBoss ? this.bosses.indexOf(src) : this.bosses.indexOf(src.owner)) });
  return r;
};
const dodge0 = BD.Boss.prototype.tryDodge;
BD.Boss.prototype.tryDodge = function () { const ok = dodge0.apply(this, arguments); if (ok && this.world === cur) dodgeLog.push({ t: this.world.time, b: this.world.bosses.indexOf(this) }); return ok; };
const jobs = [];
for (const a of ids) for (const bb of ids) for (const seed of seeds) jobs.push({ a, b: bb, seed });

// 單場模擬：儀器紀錄歸零，回傳純資料
function runOne(job) {
  const { a, b, seed } = job;
  const w = new BD.World(byId[a], byId[b], { seed, intro: 0.5, pace }); cur = w; hitLog = []; dodgeLog = [];
  while (!w.over && w.time < 400) { w.hitstop = 0; w.slowmo = 0; w.step(BD.STEP); }
  if (!w.over) return { timeout: true };
  const bosses = w.bosses.map((x, i) => ({ id: x.def.id, win: w.winner === x, phase: x.phase, enemy: 1 - i, ults: x.stats.ults, read: x.stats.read, combo: x.stats.combo }));
  return { time: w.time, hits: hitLog.map((h) => ({ t: h.t, b: h.b, src: h.src })), dodges: dodgeLog.map((d) => ({ t: d.t, b: d.b })), bosses, loserPhase: w.winner.enemy.phase };
}

// 主執行緒：依工作順序彙總與輸出（與循序版逐字相同）
function report(results) {
  if (paceMsg) console.log(paceMsg);
  const P = {}; for (const id of ids) P[id] = { dodges: 0, dsucc: 0, catches: 0, oppDodges: 0, wins: 0, games: 0, p2: 0, n: 0, ults: 0, combo: {}, read: {} };
  const times = []; let fails = 0;
  const avg = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
  results.forEach((r, i) => {
    const { a, b } = jobs[i];
    if (r.timeout) { fails++; return; }
    const hitLog = r.hits, dodgeLog = r.dodges;
    times.push(r.time);
    for (const d of dodgeLog) {
      const S = P[r.bosses[d.b].id]; S.dodges++;
      if (!hitLog.some((h) => h.b === d.b && h.t >= d.t && h.t <= d.t + 0.8)) S.dsucc++;
      const E = P[r.bosses[r.bosses[d.b].enemy].id]; E.oppDodges++;
      if (hitLog.some((h) => h.b === d.b && h.src === r.bosses[d.b].enemy && h.t >= d.t + 0.3 && h.t <= d.t + 1.3)) E.catches++;
    }
    for (const x of r.bosses) {
      const S = P[x.id]; S.n++; S.p2 += x.phase === 2 ? 1 : 0; S.ults += x.ults;
      if (a !== b) { S.games++; if (x.win) S.wins++; }
      const rd = x.read;
      if (rd) for (const k in rd) { if (typeof rd[k] === 'number') S.read[k] = (S.read[k] || 0) + rd[k]; }
      const c = x.combo;
      if (c) {
        for (const k in c) { if (typeof c[k] === 'number') S.combo[k] = (S.combo[k] || 0) + c[k]; }
        // 每串連段的平均段數（只用於終端輸出，不寫回對局統計）
        S.seg = (S.seg || 0) + (S.segN || 0);
      }
    }
    if (r.loserPhase !== 2 || (r.bosses[0].ults + r.bosses[1].ults) === 0) fails++;
  });
  const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  console.log(`pace=${pace} 場數=${times.length} 對戰時長 平均 ${avg(times).toFixed(1)}s 中位 ${q(times, 0.5).toFixed(1)} p10 ${q(times, 0.1).toFixed(1)} p90 ${q(times, 0.9).toFixed(1)}`);
  let T = { dodges: 0, dsucc: 0, catches: 0, oppDodges: 0, combo: {}, read: {} };
  for (const id of ids) {
    const S = P[id];
    T.dodges += S.dodges; T.dsucc += S.dsucc; T.catches += S.catches; T.oppDodges += S.oppDodges;
    for (const k in S.combo) T.combo[k] = (T.combo[k] || 0) + S.combo[k];
    for (const k in S.read) T.read[k] = (T.read[k] || 0) + S.read[k];
    const cs = Object.keys(S.combo).length ? ' 連段 ' + Object.entries(S.combo).map(([k, v]) => `${k}=${(v / S.n).toFixed(1)}`).join(' ') + '（每場）' : '';
    const rs = Object.keys(S.read).length ? ' 讀 ' + Object.entries(S.read).map(([k, v]) => `${k}=${(v / S.n).toFixed(1)}`).join(' ') + '（每場）' : '';
    console.log(`  ${id.padEnd(8)} 勝率 ${S.wins}/${S.games}=${(100 * S.wins / S.games).toFixed(0)}%  二階段 ${S.p2}/${S.n}  大招/場 ${(S.ults / S.n).toFixed(2)}  翻滾成功 ${(100 * S.dsucc / (S.dodges || 1)).toFixed(0)}%（${(S.dodges / S.n).toFixed(1)}/場）  抓翻滾 ${(S.catches / S.n).toFixed(2)}/場 = ${(100 * S.catches / (S.oppDodges || 1)).toFixed(1)}% 對手翻滾${cs}${rs}`);
  }
  console.log(`總計：翻滾成功率 ${(100 * T.dsucc / (T.dodges || 1)).toFixed(1)}%（${T.dodges} 次）  抓翻滾 ${T.catches} 次 = ${(100 * T.catches / (T.oppDodges || 1)).toFixed(1)}% 的翻滾被抓` +
    (Object.keys(T.combo).length ? '  連段 ' + Object.entries(T.combo).map(([k, v]) => `${k}=${v}`).join(' ') : '') +
    (Object.keys(T.read).length ? '  讀 ' + Object.entries(T.read).map(([k, v]) => `${k}=${v}`).join(' ') : ''));
  console.log(fails ? `檢查未通過 ${fails}` : 'AI CHECKS PASS');
}

const results = run(__filename, jobs, runOne);
if (results) results.then(report);
