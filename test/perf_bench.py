# 繪圖效能量測：headless Chrome 以 file:// 開啟，自建固定種子的 World，逐幀 w.tick(1/60) 後量測 R.render 時間
# （render 後以 getImageData(0,0,1,1) 強制完成點陣化，數字包含 JS 繪圖指令 + 光柵化）。
# 用法：python3 test/perf_bench.py [--root DIR] [--dpr 1] [--frames 900] [--shot out.png] [--json out.json] [--scenarios normal,stress,ultspam]
# 場景：normal 一般對戰、stress 大量粒子 / 召喚物 / 區域、ultspam 巨型 Boss（熔岩巨像 vs 腐沼母巢，沉重）每 4 秒強制大招
import argparse, asyncio, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from chrome import launch_args
from playwright.async_api import async_playwright

BENCH = r"""
async ([scenario, frames, warm, shot]) => {
  // 固定 Math.random（讓舊版畫面中的隨機效果也可重現）
  let s = 99991; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const BD = window.BD, R = BD.Render, st = window.__BD;
  if (BD.vrng && BD.vrng.seed) BD.vrng.seed(99991);
  if (R.invalidateCaches) R.invalidateCaches();
  st.world = null;
  const cv = document.querySelector('#game'), ctx = cv.getContext('2d');
  const scale = cv.width / R.W;
  const view = { showLog: true, player: null, mouse: { x: 0, y: 0 } };
  const pnow = performance.now.bind(performance);
  const sc = scenario === 'stress' ? ['brood', 'watcher', 2] : scenario === 'ultspam' ? ['magmus', 'brood', 4] : ['magmus', 'witch', 3];
  const w = new BD.World(BD.bossById[sc[0]], BD.bossById[sc[1]], scenario === 'ultspam' ? { seed: sc[2], intro: 0.5, pace: 'heavy' } : { seed: sc[2], intro: 0.5 });
  const inject = (i) => {
    if (scenario === 'ultspam') {
      // 大招連發：兩位巨型 Boss 每 4 秒強制施放大招（血量保底，避免對戰結束）
      for (const b of w.bosses) { b.hp = Math.max(b.hp, b.maxHp * 0.3); if (i % 240 === b.team * 120 && b.state !== 'dead' && !(b.inst && b.inst.skill.ult)) { b.ult = 100; b.cancelSkill(); b.state = 'idle'; b.startSkill(b.ultimate); } }
      return;
    }
    if (scenario !== 'stress') return;
    if (i % 15 === 0) { w.fx.sparks(200 + (i * 37) % 900, 150 + (i * 53) % 500, '#ffd27a', 40, 320); w.fx.smoke(300 + (i * 71) % 800, 200 + (i * 29) % 400, 'rgba(120,120,140,0.5)', 10, 30); w.fx.ring(600, 400, 10, 200, 0.6, '#9ff', 5); }
    if (i % 45 === 0) for (let k = 0; k < 3; k++) BD.spawnMinion(w, w.bosses[0], 'spider', k, 3);
    if (i % 300 === 0) for (let k = 0; k < 2; k++) BD.spawnMinion(w, w.bosses[1], 'sentinel', k, 2);
    if (i % 90 === 0) for (let k = 0; k < 3; k++) w.zones.push({ team: 2, owner: w.bosses[0], x: 250 + k * 350, y: 250 + (k % 2) * 300, r: 145, dur: 5, dps: 0, slow: false, kind: k === 1 ? 'fire' : 'blizzard', delay: 0, t: 0, tick: 99, seed: k * 10 });
  };
  if (scenario === 'stress') for (let k = 0; k < 6; k++) BD.spawnMinion(w, w.bosses[0], 'spider', k, 6);
  const draw = () => { ctx.setTransform(scale, 0, 0, scale, 0, 0); R.render(ctx, w, view); ctx.getImageData(0, 0, 1, 1); };
  for (let i = 0; i < warm; i++) { inject(i); w.tick(1 / 60); if (i % 4 === 0) draw(); }
  const times = [];
  for (let i = 0; i < frames; i++) {
    inject(warm + i); w.tick(1 / 60);
    const t0 = pnow(); draw(); times.push(pnow() - t0);
  }
  let shotUrl = null;
  if (shot) { const T = 1234.5; performance.now = () => T * 1000; draw(); performance.now = pnow; shotUrl = cv.toDataURL('image/png'); }
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return { scenario, frames, avg, p50: times[Math.floor(times.length * 0.5)], p95: times[Math.floor(times.length * 0.95)], max: times[times.length - 1],
    parts: w.fx.parts.length, minions: w.minions.length, zones: w.zones.length, time: w.time, scale, shotUrl };
}
"""

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default=str(pathlib.Path(__file__).resolve().parent.parent))
    ap.add_argument('--dpr', type=float, default=1)
    ap.add_argument('--frames', type=int, default=900)
    ap.add_argument('--warm', type=int, default=1200)
    ap.add_argument('--shot', default=None, help='prefix for screenshots: <prefix>_<scenario>.png')
    ap.add_argument('--json', default=None)
    ap.add_argument('--runs', type=int, default=3)
    ap.add_argument('--scenarios', default='normal,stress,ultspam')
    a = ap.parse_args()
    root = pathlib.Path(a.root)
    out = {}
    async with async_playwright() as p:
        br = await p.chromium.launch(**launch_args())
        for scen in a.scenarios.split(','):
            res = []
            for run in range(a.runs):
                pg = await br.new_page(viewport={'width': 1600, 'height': 1010}, device_scale_factor=a.dpr)
                errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto((root / 'index.html').as_uri()); await pg.wait_for_timeout(400)
                r = await pg.evaluate(BENCH, [scen, a.frames, a.warm, bool(a.shot) and run == 0])
                if errs: print('ERRORS', errs); sys.exit(1)
                if r.get('shotUrl'):
                    import base64
                    pathlib.Path(f"{a.shot}_{scen}.png").write_bytes(base64.b64decode(r['shotUrl'].split(',')[1]))
                r.pop('shotUrl', None); res.append(r)
                await pg.close()
            best = sorted(res, key=lambda r: r['avg'])[len(res) // 2]  # 取中位數那一輪
            out[scen] = best
            print(f"{scen:7s} dpr={a.dpr} avg={best['avg']:.3f}ms p50={best['p50']:.3f} p95={best['p95']:.3f} max={best['max']:.2f}  parts={best['parts']} minions={best['minions']} zones={best['zones']}  (runs avg: {', '.join('%.3f' % r['avg'] for r in res)})")
        await br.close()
    if a.json: pathlib.Path(a.json).write_text(json.dumps(out, indent=1))
asyncio.run(main())
