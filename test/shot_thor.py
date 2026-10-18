# 索爾截圖：選角卡、一階段（對呂布）出招、二階段覺醒（雷電）、大招 覺醒雷槌・蓋爾羅德（回程 / 落槌）、訓練場施放
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
    await pg.click('#sideA .pager button[data-d="1"]'); await pg.wait_for_timeout(100)
    await pg.click('#sideA .card[data-id="thor"]'); await pg.click('#sideB .card[data-id="lubu"]')
    await pg.hover('#sideA .card[data-id="thor"]'); await pg.wait_for_timeout(300)
    await pg.screenshot(path=str(S/'thor-select.png'))
    await pg.click('#btnStart'); await pg.wait_for_timeout(500)
    L="__BD.world.bosses.find(x=>x.def.id==='thor')"
    async def wait(cond, n=600):
      for i in range(n):
        await pg.wait_for_timeout(50)
        if await pg.evaluate(cond): return True
      return False
    await pg.evaluate("__BD.world.speed=2")
    ok=await wait(f"(()=>{{const b={L};return __BD.world.intro<=0 && b.inst && ['hammer_sweep','hammer_slam','hammer_chain','giant_felling'].includes(b.inst.skill.id) && b.inst.t>0.45 && __BD.world.telegraphs.length>0}})()",900)
    await pg.evaluate("__BD.world.speed=0.0001"); await pg.wait_for_timeout(150)
    await pg.screenshot(path=str(S/'thor-01-phase1.png')); print('p1',ok, await pg.evaluate(f"{L}.inst&&{L}.inst.skill.id"))
    await pg.evaluate(f"(()=>{{const b={L};b.hp=Math.round(b.maxHp*0.49);__BD.world.speed=1}})()")
    ok=await wait(f"{L}.phase===2",400)
    await wait(f"{L}.state!=='transition'",200)
    ok2=await wait(f"(()=>{{const b={L};return b.inst && !b.inst.skill.ult && b.inst.t>0.3}})()",400)
    await pg.evaluate("__BD.world.speed=0.0001"); await pg.wait_for_timeout(150)
    await pg.screenshot(path=str(S/'thor-02-awakened.png')); print('p2',ok,ok2, await pg.evaluate(f"{L}.inst&&{L}.inst.skill.id"))
    await pg.evaluate("__BD.world.speed=1")
    await wait(f"!{L}.inst",200)
    # 時間點依實際（節奏調整後）時間軸計算：回程判定前 0.3 秒、落地判定後 0.08 秒；被打斷則重試
    TL=f"(()=>{{const b={L},a=b.inst.v.actions,g=a.filter(x=>x.do==='hit'&&x.mark==='G1'),l=a.find(x=>x.do==='land');return [g[1].at,l.at]}})()"
    for attempt in range(4):
      await wait(f"!{L}.inst && {L}.state==='idle'",400)
      await pg.evaluate(f"{L}.ult=100")
      ok=await wait(f"(()=>{{const b={L};return b.inst&&b.inst.skill.ult}})()",800)
      if not ok: continue
      tb,tl=await pg.evaluate(TL)
      ok=await wait(f"(()=>{{const b={L};return !(b.inst&&b.inst.skill.ult)||b.inst.t>{tb-0.3}}})()",400)
      if not await pg.evaluate(f"!!({L}.inst&&{L}.inst.skill.ult)"): continue
      await pg.evaluate("__BD.world.speed=0.0001"); await pg.wait_for_timeout(150)
      await pg.screenshot(path=str(S/'thor-03b-geirrod-return.png')); print('ult return', await pg.evaluate(f"{L}.ultName()"), tb, tl)
      await pg.evaluate("__BD.world.speed=1")
      ok=await wait(f"(()=>{{const b={L};return !(b.inst&&b.inst.skill.ult)||b.inst.t>{tl+0.08}}})()",400)
      if not await pg.evaluate(f"!!({L}.inst&&{L}.inst.skill.ult)"): continue
      await pg.evaluate("__BD.world.speed=0.0001"); await pg.wait_for_timeout(150)
      break
    await pg.screenshot(path=str(S/'thor-03-geirrod.png')); print('ult slam',ok)
    # 訓練場：一階段 鐵手套格擋 → 截圖 巨人殺
    await pg.evaluate("__BD.startTraining('thor', { mode: 'manual', range: 'mid' })"); await pg.wait_for_timeout(400)
    await pg.click('#trainPanel [data-skill="giant_felling"]')
    ok=await wait("(()=>{const b=__BD.world.training.boss;return b.inst&&b.inst.t>0.45})()",200)
    await pg.evaluate("__BD.world.speed=0.0001"); await pg.wait_for_timeout(150)
    await pg.screenshot(path=str(S/'thor-training.png')); print('train',ok)
    print('errors',errs); await b.close()
asyncio.run(main())
