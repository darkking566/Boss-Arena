# F6 AI 偵錯覆蓋層截圖：沉重模式對戰，推進到「有連段進行中 + 最近一次閃避候選」的時刻，開啟 F6 後截圖。
# 用法：python3 test/shot_ai_debug.py [a] [b] [seed] → screenshots/13_ai_debug.png
import asyncio, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from chrome import launch_args
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
A = sys.argv[1] if len(sys.argv) > 1 else 'ronin'
B = sys.argv[2] if len(sys.argv) > 2 else 'watcher'
SEED = int(sys.argv[3]) if len(sys.argv) > 3 else 3

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(**launch_args())
        pg = await br.new_page(viewport={'width': 1600, 'height': 1010})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((ROOT / 'index.html').as_uri()); await pg.wait_for_timeout(500)
        info = await pg.evaluate("""([a, b, seed]) => {
          const w = __BD.start(a, b, { seed, pace: 'heavy' }); w.tick = () => {}; // 停用自動推進
          let n = 0;
          // 一方連段進行中，且（任一方）0.6 秒內剛評估過閃避候選；優先同時有預判落點
          const combo = () => w.bosses.some((x) => x.controller && x.controller.combo && x.controller.combo.c);
          const dodge = () => w.bosses.some((x) => { const d = x.controller && x.controller.dbg; return d && d.dodge && d.dodge.mode === 'roll' && w.time - d.dodge.at < 0.2; });
          const pred = () => w.bosses.some((x) => { const d = x.controller && x.controller.dbg; return d && d.predict && w.time - d.predict.t < 0.6; });
          const good = () => w.time > 15 && combo() && dodge() && pred();
          const ok2 = () => w.time > 15 && combo() && dodge();
          while (!w.over && n < 60 * 150 && !good()) { w.step(BD.STEP); n++; }
          return { t: w.time, good: good(), ok2: ok2() };
        }""", [A, B, SEED])
        print('moment:', info)
        await pg.keyboard.press('F6')
        await pg.evaluate("new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
        await pg.wait_for_timeout(300)
        on = await pg.evaluate("BD.Render.aiDebug === true")
        await pg.screenshot(path=str(ROOT / 'screenshots' / '13_ai_debug.png'))
        print('aiDebug on:', on, 'errors:', errs or 'none')
        await br.close()
        if errs or not on: sys.exit(1)

asyncio.run(main())
