// 無頭模擬：依 index.html 的 <script src> 清單載入遊戲邏輯（略過 data-browser 的繪圖 / DOM 檔案），跑所有配對
// 用法：node test/sim.js [seeds] [pace]（pace 省略時為 light）；JOBS=N 或 --jobs N 指定平行 worker 數
'use strict';
const { stripJobs, run } = require('./lib/par');
const cli = stripJobs(process.argv.slice(2));
process.argv = process.argv.slice(0, 2).concat(cli.argv);
if (cli.jobs) process.env.JOBS = String(cli.jobs);
const { load } = require('./lib/load');
const { BD, files } = load({ noFx: true });
const { isMainThread } = require('worker_threads');
const BOSSES = BD.bosses || BD.BOSSES, BY_ID = BD.bossById || BD.BOSS_BY_ID;
const HAS_WATCHER = !!BY_ID.watcher;
const seeds = (process.argv[2] || '1,2,3').split(',').map(Number);
const pace = process.argv[3] || 'light';
const ids = BOSSES.map((b) => b.id);
const jobs = [];
for (const a of ids) for (const b of ids) for (const seed of seeds) jobs.push({ a, b, seed });

// 單場模擬：全新 World、區域計數器歸零，只回傳純資料
function runOne(job) {
  const { a, b, seed } = job;
  let purgeViol = 0, maxAllies = 0, maxRogues = 0;
  const w = new BD.World(BY_ID[a], BY_ID[b], { seed, intro: 0.5, pace });
  let ok = false, err = null;
  try {
    while (!w.over && w.time < 400) {
      w.hitstop = 0; w.slowmo = 0; w.step(BD.STEP);
      // 不變量：監視者進入二階段（含轉換中）後，其同伴與紅眼監視者必須全數消失
      for (const bb of w.bosses) if (bb.def.id === 'watcher' && (bb.phase === 2 || bb.state === 'transition') &&
        w.minions.some((m) => m.alive && m.owner === bb && (m.kind === 'watcher' || m.kind === 'rogue'))) purgeViol++;
      const allies = w.minions.filter((m) => m.alive && m.kind === 'watcher').length, rogues = w.minions.filter((m) => m.alive && m.kind === 'rogue').length;
      maxAllies = Math.max(maxAllies, allies); maxRogues = Math.max(maxRogues, rogues);
    }
    ok = w.over;
  } catch (e) { err = e; }
  let summon = null;
  if (a === 'watcher' || b === 'watcher') {
    summon = { packs: w.stats.packs, rogues: w.stats.rogues, hit: [w.stats.rogueHits[0], w.stats.rogueHits[1]], victims: [0, 0] };
    for (const x of w.bosses) summon.victims[x.def.id === 'watcher' ? 0 : 1] += w.stats.rogueHits[x.team];
  }
  const [A, B] = w.bosses;
  const line = `${a.padEnd(7)} vs ${b.padEnd(7)} s${seed}: ` + (err ? 'ERROR ' + err.stack : ok ? `winner=${w.winner.def.id} t=${w.time.toFixed(1)}s hp=${A.hp}/${B.hp} p2=${A.phase}/${B.phase} ult=${A.stats.ultP1}+${A.stats.ultP2}/${B.stats.ultP1}+${B.stats.ultP2} dodge=${A.stats.dodges}/${B.stats.dodges} perf=${A.stats.perfect}/${B.stats.perfect} brk=${A.stats.breaks}/${B.stats.breaks} ctr=${A.stats.counters}/${B.stats.counters}` : `TIMEOUT hp=${A.hp}/${B.hp}`);
  const winner = ok && w.winner ? ids.indexOf(w.winner.def.id) : -1;
  const check = err || !ok || w.winner.enemy.phase !== 2 || (A.stats.ults + B.stats.ults) === 0 ? { fail: true, loserPhase: ok && !err ? w.winner.enemy.phase : null, ults: A.stats.ults + B.stats.ults } : { fail: false };
  const bosses = w.bosses.map((x) => ({ id: x.def.id, win: w.winner === x, phase: x.phase, stats: Object.assign({}, x.stats) }));
  return { line, ok, time: ok ? w.time : null, winner, check, purgeViol, maxAllies, maxRogues, summon, bosses };
}

// 主執行緒：依工作順序彙總與輸出（與循序版逐字相同）
function report(results) {
  console.log('載入：' + files.join(', '));
  console.log('pace=' + pace);
  const agg = {}; for (const id of ids) agg[id] = { wins: 0, games: 0, p2: 0, ultP1: 0, ultP2: 0, uses: {}, dodges: 0, perfect: 0, breaks: 0, counters: 0, feints: 0 };
  let fails = 0, total = 0, times = [];
  let purgeViol = 0, maxAllies = 0, maxRogues = 0, packTot = 0, rogueTot = 0; const rogueVictims = { watcher: 0, other: 0 };
  const nm = {}; for (const id of ids) nm[id] = { w: 0, g: 0 };
  for (const r of results) {
    const { a, b } = jobs[total];
    total++;
    console.log(r.line);
    if (r.check.fail) { fails++; if (r.check.loserPhase !== null) console.log('   ^ check failed: loserPhase=' + r.check.loserPhase + ' ults=' + r.check.ults); }
    if (r.ok) times.push(r.time);
    purgeViol += r.purgeViol; maxAllies = Math.max(maxAllies, r.maxAllies); maxRogues = Math.max(maxRogues, r.maxRogues);
    if (r.summon) { packTot += r.summon.packs; rogueTot += r.summon.rogues;
      rogueVictims.watcher += r.summon.victims[0]; rogueVictims.other += r.summon.victims[1]; }
    if (a !== b && r.ok) { for (const x of r.bosses) { nm[x.id].g++; if (x.win) nm[x.id].w++; } }
    for (const x of r.bosses) {
      const g = agg[x.id]; g.games++; if (x.win) g.wins++; if (x.phase === 2) g.p2++;
      g.ultP1 += x.stats.ultP1; g.ultP2 += x.stats.ultP2; g.dodges += x.stats.dodges; g.perfect += x.stats.perfect; g.breaks += x.stats.breaks; g.counters += x.stats.counters; g.feints += x.stats.feints;
      for (const k in x.stats.uses) g.uses[k] = (g.uses[k] || 0) + x.stats.uses[k];
    }
  }
  console.log('\n=== 彙總 ===');
  for (const id of ids) {
    const g = agg[id], def = BY_ID[id];
    const unused = def.skills.filter((s) => !g.uses[s.id]).map((s) => s.id);
    console.log(`${def.name}(${id}) 勝 ${g.wins}/${g.games} 進入二階段 ${g.p2} 大招 P1=${g.ultP1} P2=${g.ultP2} 翻滾=${g.dodges} 完美=${g.perfect} 崩潰=${g.breaks} 見切=${g.counters} 假動作=${g.feints}`);
    console.log('   技能使用: ' + JSON.stringify(g.uses) + (unused.length ? '  未使用: ' + unused.join(',') : ''));
    if (unused.length || g.ultP1 === 0 || g.ultP2 === 0) fails++;
  }
  console.log('\n=== 非鏡像對戰勝率 ===');
  for (const id of ids) { const r = nm[id]; console.log(`${BY_ID[id].name}: ${r.w}/${r.g} = ${(100 * r.w / r.g).toFixed(0)}%`); if (r.w / r.g > 0.65) { console.log('   ^ 勝率過高'); if (id === 'watcher') fails++; } }
  console.log(`\n=== 深淵監視者召喚 ===\n呼喚同伴 ${packTot} 次；紅眼監視者出現 ${rogueTot} 次；紅眼命中 監視者方 ${rogueVictims.watcher} 次 / 對手方 ${rogueVictims.other} 次`);
  console.log(`同時存在上限：同伴 ${maxAllies}、紅眼 ${maxRogues}；二階段殘留召喚違規 ${purgeViol} 幀`);
  if (HAS_WATCHER && (purgeViol || maxRogues > 1 || packTot === 0 || rogueTot === 0 || !rogueVictims.watcher || !rogueVictims.other)) { console.log('   ^ 召喚檢查未通過'); fails++; }
  times.sort((a, b) => a - b);
  console.log(`對戰時長 min=${times[0] && times[0].toFixed(1)} median=${times[times.length >> 1] && times[times.length >> 1].toFixed(1)} max=${times[times.length - 1] && times[times.length - 1].toFixed(1)}`);
  console.log(fails ? `FAIL (${fails} 項檢查未通過，共 ${total} 場)` : `PASS：${total} 場全部完成`);
  process.exit(fails ? 1 : 0);
}

const results = run(__filename, jobs, runOne);
if (results) results.then(report);
