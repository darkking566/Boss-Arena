// 行為指紋：以固定種子跑完所有配對，逐幀雜湊雙方 Boss 狀態，用來比對重構前後行為是否「完全一致」
// 用法：node test/fingerprint.js [seeds] [--pace <id>] > out.json ；node test/fingerprint.js --compare a.json b.json
//       node test/fingerprint.js --check         （與 test/baseline-fingerprint.json——重構前基準——比對，固定 light）
//       node test/fingerprint.js --check-heavy   （與 test/baseline-fingerprint-heavy.json 比對）
//       node test/fingerprint.js --write-heavy   （以 heavy 跑並寫入 test/baseline-fingerprint-heavy.json）
//       JOBS=N 或 --jobs N 指定平行 worker 數（--compare 不平行）
'use strict';
const { stripJobs, run } = require('./lib/par');
const cli = stripJobs(process.argv.slice(2));
process.argv = process.argv.slice(0, 2).concat(cli.argv);
if (cli.jobs) process.env.JOBS = String(cli.jobs);
const fs = require('fs'), path = require('path');
const argv = process.argv.slice(2);
const BASE = path.join(__dirname, 'baseline-fingerprint.json');
const BASE_HEAVY = path.join(__dirname, 'baseline-fingerprint-heavy.json');
const CHECK = argv.includes('--check');
const CHECK_HEAVY = argv.includes('--check-heavy');
const WRITE_HEAVY = argv.includes('--write-heavy');
let pace = 'light';
const pi = argv.indexOf('--pace');
if (pi >= 0) { pace = argv[pi + 1]; argv.splice(pi, 2); }
if (CHECK) pace = 'light';
if (CHECK_HEAVY || WRITE_HEAVY) pace = 'heavy';
// 第一個非旗標參數 = 種子清單
const seedArg = argv.find((a) => !a.startsWith('--'));
function compare(A, B) {
  let diff = 0, n = 0;
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    n++;
    if (JSON.stringify(A[k]) !== JSON.stringify(B[k])) { diff++; if (diff <= 10) console.log('DIFF', k, '\n  before:', JSON.stringify(A[k]), '\n  after: ', JSON.stringify(B[k])); }
  }
  console.log(diff ? `FINGERPRINT MISMATCH: ${diff}/${n} 場不同` : `FINGERPRINT IDENTICAL: ${n}/${n} 場逐幀完全一致`);
  return diff;
}
if (argv[0] === '--compare') {
  process.exit(compare(JSON.parse(fs.readFileSync(process.argv[3], 'utf8')), JSON.parse(fs.readFileSync(process.argv[4], 'utf8'))) ? 1 : 0);
}
if (CHECK_HEAVY && !fs.existsSync(BASE_HEAVY)) {
  console.log(`找不到 ${path.relative(process.cwd(), BASE_HEAVY)}——請先執行 node test/fingerprint.js --write-heavy 產生 heavy 基準`);
  process.exit(1);
}
const { isMainThread } = require('worker_threads');
const { load } = require('./lib/load');
const { BD } = load();
const bosses = BD.bosses || BD.BOSSES, byId = BD.bossById || BD.BOSS_BY_ID;
const seeds = (seedArg || '1,2,3,4,5,6').split(',').map(Number);
const buf = new Float64Array(1), u32 = new Uint32Array(buf.buffer);
function H() { let h = 2166136261 >>> 0; const f = (x) => { buf[0] = x; for (let i = 0; i < 2; i++) { h ^= u32[i]; h = Math.imul(h, 16777619) >>> 0; } };
  f.str = (s) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } }; f.v = () => h.toString(16); return f; }
const jobs = [];
for (const a of bosses) for (const b of bosses) for (const seed of seeds) jobs.push({ a: a.id, b: b.id, seed });
// 單場模擬：回傳純資料（主執行緒依工作順序組出 out 物件，鍵的插入順序因此不變）
function runOne(job) {
  const { a, b, seed } = job;
  const w = new BD.World(byId[a], byId[b], { seed, intro: 0.5, pace });
  const h = H(); let frames = 0;
  while (!w.over && w.time < 400) {
    w.hitstop = 0; w.slowmo = 0; w.step(BD.STEP); frames++;
    for (const x of w.bosses) { h(x.x); h(x.y); h(x.hp); h(x.sta); h(x.posture); h(x.face); h(x.ult); h.str(x.state); h(x.phase); }
    h(w.minions.length); h(w.projectiles.length); h(w.zones.length); h(w.traps.length); h(w.telegraphs.length); h(w.nextId);
    for (const m of w.minions) { h(m.x); h(m.y); h(m.hp); }
  }
  const [A, B] = w.bosses;
  return { winner: w.winner && w.winner.def.id, frames, hp: [A.hp, B.hp], uses: [A.stats.uses, B.stats.uses],
    stats: [A.stats, B.stats].map((s) => [s.dealt, s.taken, s.dodges, s.perfect, s.breaks, s.counters, s.feints, s.ultP1, s.ultP2]),
    world: JSON.parse(JSON.stringify(w.stats)), logs: w.logs.map((l) => l.text).join('|').length, rngNext: w.rng(), hash: h.v() };
}
function emit(results) {
  const out = {};
  for (let i = 0; i < jobs.length; i++) out[`${jobs[i].a}-${jobs[i].b}-s${jobs[i].seed}`] = results[i];
  if (CHECK) process.exit(compare(JSON.parse(fs.readFileSync(BASE, 'utf8')), out) ? 1 : 0);
  if (CHECK_HEAVY) process.exit(compare(JSON.parse(fs.readFileSync(BASE_HEAVY, 'utf8')), out) ? 1 : 0);
  if (WRITE_HEAVY) { fs.writeFileSync(BASE_HEAVY, JSON.stringify(out, null, 0)); console.log(`已寫入 ${path.relative(process.cwd(), BASE_HEAVY)}（${Object.keys(out).length} 場）`); process.exit(0); }
  process.stdout.write(JSON.stringify(out, null, 0));
}
const results = run(__filename, jobs, runOne);
if (results) results.then(emit);
