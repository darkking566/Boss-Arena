# 補拍：等待霜月魔女自然施放「絕對零度」時截圖
import asyncio, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from chrome import launch_args
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**launch_args())
        pg = await b.new_page(viewport={'width': 1600, 'height': 1010})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((ROOT / 'index.html').as_uri()); await pg.wait_for_timeout(500)
        await pg.evaluate("__BD.start('witch','brood',{speed:3, seed:7})")
        for i in range(900):
            await pg.wait_for_timeout(100)
            t = await pg.evaluate("(()=>{const w=__BD.world;const e=w.events.filter(e=>e.type==='ult'&&e.team===0);return e.length?w.time-e[0].t:-1})()")
            if t >= 0: break
        await pg.evaluate("__BD.world.speed=1"); await pg.wait_for_timeout(1700)
        await pg.screenshot(path=str(ROOT / 'screenshots' / '06_witch_absolute_zero.png'))
        print('errors', errs, await pg.evaluate("__BD.world.time"))
        await b.close()
asyncio.run(main())
