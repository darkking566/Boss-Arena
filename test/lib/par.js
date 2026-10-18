// 平行化輔助：主執行緒把工作分給 worker_threads（每個 worker 重跑同一支腳本），JOBS=1 或只有一件工作時改為循序執行
// worker 內 runJobs 回傳 null——腳本看到 null 就是 worker，做完工作後直接結束（例如 async main 內 `if (!results) return;`）
'use strict';
const os = require('os'), { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

function jobCount() {
  const v = parseInt(process.env.JOBS, 10);
  return v >= 1 ? v : os.cpus().length;
}

// 移除 `--jobs N` / `--jobs=N`，回傳 { argv, jobs }（argv 已剝除旗標）
function stripJobs(argv) {
  const out = [];
  let jobs = 0;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--jobs') { const n = parseInt(argv[++i], 10); if (n >= 1) jobs = n; }
    else if (a.startsWith('--jobs=')) { const n = parseInt(a.slice(7), 10); if (n >= 1) jobs = n; }
    else out.push(a);
  }
  return { argv: out, jobs };
}

function runJobs(scriptFile, jobs, runOne) {
  if (!isMainThread) return Promise.resolve(null);
  if (workerData && workerData.__parWorker) return Promise.resolve(null); // 防呆：worker 不應再開 worker
  const n = Math.min(jobs.length, jobCount());
  if (n <= 1) return Promise.resolve(jobs.map((j) => runOne(j)));
  return new Promise((resolve, reject) => {
    const results = new Array(jobs.length);
    let next = 0, done = 0, failed = false;
    const workers = [];
    const fail = (e) => { if (!failed) { failed = true; for (const x of workers) x.terminate(); reject(e); } };
    const finish = () => { for (const w of workers) w.terminate(); resolve(results); };
    const give = (w) => (next < jobs.length ? w.postMessage({ i: next++ }) : w.postMessage({ done: true }));
    const boot = () => {
      const w = new Worker(scriptFile, { workerData: { __parWorker: true }, argv: process.argv.slice(2), env: process.env });
      workers.push(w);
      w.on('message', (m) => {
        if (m.exit) return fail(Object.assign(new Error('worker exited'), { code: m.exit }));
        if (m.done || m.ready) return;
        done++;
        results[m.i] = m.result;
        if (done === jobs.length) return finish();
        give(w);
      });
      w.on('error', fail);
      w.on('exit', (code) => { if (!failed && code !== 0) fail(Object.assign(new Error('worker exited with code ' + code), { code })); });
      give(w);
    };
    for (let k = 0; k < n; k++) boot();
  });
}

// worker 端：向父程序領取索引、執行 runOne、回報結果；父程序說 done 就結束
function serveJobs(jobs, runOne) {
  const post = (m) => parentPort.postMessage(m);
  const take = (i) => {
    if (i >= jobs.length) { post({ done: true }); return; }
    Promise.resolve().then(() => runOne(jobs[i])).then((result) => post({ i, result }),
      (e) => { post({ exit: 1 }); console.error(e && e.stack || e); process.exit(1); });
  };
  parentPort.on('message', (m) => { if (m && m.done) process.exit(0); else take(m.i); });
  post({ ready: true });
}

// 腳本進入點包裝：主執行緒回傳 runJobs 的 Promise；worker 領工作後回傳 null
function run(scriptFile, jobs, runOne) {
  if (isMainThread) return runJobs(scriptFile, jobs, runOne);
  serveJobs(jobs, runOne);
  return null;
}

module.exports = { runJobs, run, stripJobs };
