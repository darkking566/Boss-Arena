# 截圖：狀態效果圖示（HUD 狀態列 + 頭頂圖示 + 場上光環）。以 BD.applyStatus 手動施加狀態做展示，不影響正式對戰
# 用法：python3 test/shot_status.py   （輸出 screenshots/09_status_icons.png；BD_SHOTS 可改輸出目錄）
import asyncio, os, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from chrome import launch_args
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = pathlib.Path(os.environ.get('BD_SHOTS') or (ROOT / 'screenshots')); SHOTS.mkdir(parents=True, exist_ok=True)
DEMO = """(() => {
  const w = __BD.world, [a, b] = w.bosses, BD = window.BD;
  BD.applyStatus(a, 'burn', { dur: 3.5, source: b }, w);
  BD.applyStatus(a, 'poison', { dur: 5.2, stacks: 3, source: b }, w);
  BD.applyStatus(a, 'bleed', { stacks: 64, source: b }, w);
  BD.applyStatus(a, 'slow', { dur: 1.6 }, w);
  BD.applyStatus(b, 'shield', { dur: 6, value: 180 }, w);
  BD.applyStatus(b, 'enrage', { dur: 7.5 }, w);
  BD.applyStatus(b, 'vulnerable', { dur: 4.2 }, w);
  BD.applyStatus(b, 'invuln', { dur: 2.0 }, w);
  return BD.activeStatuses(a).map(s => s.id).concat(BD.activeStatuses(b).map(s => s.id));
})()"""
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(**launch_args())
        pg = await br.new_page(viewport={'width': 1600, 'height': 1010})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        await pg.goto((ROOT / 'index.html').as_uri()); await pg.wait_for_timeout(500)
        await pg.evaluate("__BD.start('magmus','witch',{speed:1, seed:3})")
        await pg.wait_for_timeout(3500)
        ids = await pg.evaluate(DEMO)
        await pg.wait_for_timeout(450)
        await pg.screenshot(path=str(SHOTS / '09_status_icons.png'))
        print('statuses', ids); print('errors', errs)
        await br.close()
        sys.exit(1 if errs else 0)
asyncio.run(main())
