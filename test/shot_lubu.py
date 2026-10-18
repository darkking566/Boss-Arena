import asyncio, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from chrome import launch_args
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent; S = ROOT/'screenshots'
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(**launch_args()); pg = await b.new_page(viewport={'width':1600,'height':1010})
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    await pg.goto((ROOT/'index.html').as_uri()); await pg.wait_for_timeout(800)
    await pg.click('#sideA .card[data-id="lubu"]'); await pg.click('#sideB .card[data-id="ronin"]')
    await pg.hover('#sideA .card[data-id="lubu"]'); await pg.wait_for_timeout(300)
    await pg.screenshot(path=str(S/'lubu-select.png'))
    await pg.click('#btnStart'); await pg.wait_for_timeout(500)
    L="__BD.world.bosses.find(x=>x.def.id==='lubu')"
    async def wait(cond, n=600):
      for i in range(n):
        await pg.wait_for_timeout(50)
        if await pg.evaluate(cond): return True
      return False
    await pg.evaluate("__BD.world.speed=2")
    ok=await wait(f"(()=>{{const b={L};return __BD.world.intro<=0 && b.inst && !b.inst.skill.ult && b.inst.t>0.35 && __BD.world.telegraphs.length>0}})()")
    await pg.evaluate("__BD.world.speed=0.0001"); await pg.wait_for_timeout(150)
    await pg.screenshot(path=str(S/'lubu-phase1-skill.png')); print('p1',ok, await pg.evaluate(f"{L}.inst&&{L}.inst.skill.id"))
    await pg.evaluate(f"(()=>{{const b={L};b.hp=Math.round(b.maxHp*0.49);b.enemy&&0;__BD.world.speed=1}})()")
    ok=await wait(f"{L}.phase===2",400); await pg.wait_for_timeout(1500)
    await wait(f"{L}.state!=='transition'",200); await pg.wait_for_timeout(400)
    await pg.screenshot(path=str(S/'lubu-phase2-horse.png')); print('p2',ok)
    await pg.evaluate(f"{L}.ult=100")
    ok=await wait(f"(()=>{{const b={L};return b.inst&&b.inst.skill.ult&&b.inst.t>0.95}})()",800)
    await pg.evaluate("__BD.world.speed=0.0001"); await pg.wait_for_timeout(150)
    await pg.screenshot(path=str(S/'lubu-ult-charge.png')); print('ult',ok)
    await pg.evaluate("__BD.world.speed=1")
    ok=await wait(f"(()=>{{const b={L};return b.inst&&b.inst.skill.ult&&b.inst.t>1.85}})()",200); await pg.wait_for_timeout(60)
    await pg.screenshot(path=str(S/'lubu-ult-cleave.png')); print('cleave',ok)
    print('errors',errs); await b.close()
asyncio.run(main())
