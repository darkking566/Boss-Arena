# 特效戰鬥截圖：以固定種子跑一場（預設 熔岩巨像 vs 深淵監視者、沉重節奏），在熔岩巨像的巨力砸地（bigslam）落地後數幀截圖
# 用法：python3 test/shot_fx.py [--root 目錄] [--frame N] [--out 檔名] [--a magmus --b watcher --seed 3 --after 7]
#   新版會自動找出 bigslam 的幀號並印出；舊版（尚無特效庫）以 --frame N 指定同一幀（模擬逐位元一致，所以是同一時刻）
import argparse, asyncio, base64, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from chrome import launch_args
from playwright.async_api import async_playwright

JS = r"""
async ([a, b, seed, frame, after, ids]) => {
  const BD = window.BD, R = BD.Render;
  if (BD.vrng && BD.vrng.seed) BD.vrng.seed(4242);
  window.__BD.world = null;
  const cv = document.querySelector('#game'), ctx = cv.getContext('2d'), scale = cv.width / R.W;
  const view = { showLog: false, player: null, mouse: { x: 0, y: 0 } };
  const w = new BD.World(BD.bossById[a], BD.bossById[b], { seed, intro: 0.5, pace: 'heavy' });
  let hitAt = -1, n = 0, info = null;
  if (frame < 0 && BD.spawnFx) {
    const orig = BD.spawnFx;
    BD.spawnFx = function (ww, spec, x, y, o) {
      const id = typeof spec === 'string' ? spec : spec && spec.id;
      if (hitAt < 0 && ids.includes(id) && o && o.src && o.src.def && o.src.def.id === a) { hitAt = n; info = { id, phase: o.src.phase, t: +ww.time.toFixed(2) }; }
      return orig.apply(this, arguments);
    };
  }
  const draw = () => { ctx.setTransform(scale, 0, 0, scale, 0, 0); R.render(ctx, w, view); };
  const limit = frame >= 0 ? frame : 60 * 400;
  for (n = 0; n < limit && !w.over; n++) {
    w.tick(1 / 60);
    if (n % 3 === 0) draw();   // 讓繪圖端的粒子（氣場等）照常累積
    if (frame < 0 && hitAt >= 0 && n >= hitAt + after) break;
  }
  w.fx.shakeV = 0; draw();
  return { frame: n, hitAt, info, time: +w.time.toFixed(2), hp: w.bosses.map((x) => Math.round(x.hp)), phases: w.bosses.map((x) => x.phase), url: cv.toDataURL('image/png') };
}
"""

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default=str(pathlib.Path(__file__).resolve().parent.parent))
    ap.add_argument('--a', default='magmus'); ap.add_argument('--b', default='watcher')
    ap.add_argument('--seed', type=int, default=3); ap.add_argument('--frame', type=int, default=-1)
    ap.add_argument('--after', type=int, default=7); ap.add_argument('--ids', default='bigslam')
    ap.add_argument('--out', default='screenshots/16_fx_combat.png')
    a = ap.parse_args()
    async with async_playwright() as p:
        br = await p.chromium.launch(**launch_args())
        pg = await br.new_page(viewport={'width': 1600, 'height': 1010})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((pathlib.Path(a.root) / 'index.html').as_uri()); await pg.wait_for_timeout(400)
        r = await pg.evaluate(JS, [a.a, a.b, a.seed, a.frame, a.after, a.ids.split(',')])
        await br.close()
    if errs: print('ERRORS', errs); sys.exit(1)
    pathlib.Path(a.out).write_bytes(base64.b64decode(r.pop('url').split(',')[1]))
    print('frame', r['frame'], r, '->', a.out)
asyncio.run(main())
