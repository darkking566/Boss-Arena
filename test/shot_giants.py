# 巨型 Boss 體型截圖：沉重模式下「熔岩巨像 vs 深淵監視者」與「腐沼母巢 vs 影刃武士」的交戰瞬間，上下拼成一張
# 用法：python3 test/shot_giants.py [--root 其他版本目錄] [--out 檔名]（預設 screenshots/14_giants.png；需要 Pillow）
import asyncio, pathlib, sys, io
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from chrome import launch_args
from playwright.async_api import async_playwright
from PIL import Image
HERE = pathlib.Path(__file__).resolve().parent.parent
args = sys.argv[1:]
ROOT = pathlib.Path(args[args.index('--root') + 1]).resolve() if '--root' in args else HERE
OUT = HERE / 'screenshots' / (args[args.index('--out') + 1] if '--out' in args else '14_giants.png')
PAIRS = [('magmus', 'watcher', 2), ('brood', 'ronin', 4)]

async def main():
    shots, errs = [], []
    async with async_playwright() as p:
        br = await p.chromium.launch(**launch_args())
        for a, b, seed in PAIRS:
            pg = await br.new_page(viewport={'width': 1600, 'height': 1010})
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto((ROOT / 'index.html').as_uri()); await pg.wait_for_timeout(500)
            info = await pg.evaluate("""([a, b, seed]) => {
              const w = __BD.start(a, b, { seed, pace: 'heavy' }); w.tick = () => {};
              const [A, B] = w.bosses; let n = 0;
              // 交戰瞬間：雙方貼近（中心距 < 雙方半徑和 + 170）、巨型方正在出招且有預警、雙方都看得見
              const good = () => w.time > 12 && A.phase === 1 && U(A, B) < A.r + B.r + 170 && A.state === 'skill' && w.telegraphs.some((t) => t.owner === A)
                && !BD.hasStatus(A, 'hidden') && !BD.hasStatus(B, 'hidden');
              function U(p, q) { return Math.hypot(p.x - q.x, p.y - q.y); }
              while (!w.over && n < 60 * 120 && !good()) { w.step(BD.STEP); n++; }
              return { t: +w.time.toFixed(1), ok: good(), r: [A.r, B.r] };
            }""", [a, b, seed])
            print(a, 'vs', b, info)
            await pg.evaluate("new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
            await pg.wait_for_timeout(200)
            shots.append(Image.open(io.BytesIO(await pg.screenshot())))
            await pg.close()
        await br.close()
    W = max(s.width for s in shots); img = Image.new('RGB', (W, sum(s.height for s in shots)))
    y = 0
    for s in shots: img.paste(s, (0, y)); y += s.height
    img.save(OUT); print('saved', OUT, 'errors:', errs or 'none')
    if errs: sys.exit(1)

asyncio.run(main())
