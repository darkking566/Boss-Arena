"""Actual local Chrome file://: an unforced AI match 神皮雙人組 vs 紅狼, real-time; screenshots + page errors.
Checks the duo expands into two Bosses (使徒 + 貴人) with their own HUD bars, and reports revives / winner.
"""
import asyncio,json,pathlib,sys
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
from chrome import launch_args
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
SHOTS=ROOT/'screenshots/godskinduo'
async def main():
 sys.stdout.reconfigure(encoding='utf8');SHOTS.mkdir(parents=True,exist_ok=True)
 async with async_playwright() as p:
  browser=await p.chromium.launch(**launch_args(),timeout=30000)
  pg=await browser.new_page(viewport={'width':1600,'height':1010});errors=[]
  pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.goto((ROOT/'index.html').as_uri());await pg.wait_for_timeout(400)
  await pg.evaluate("__BD.start('godskinduo','redwolf',{seed:7,speed:2})")
  shots=[]
  for i in range(40):
   await pg.wait_for_timeout(3000)
   st=await pg.evaluate("""()=>{const w=__BD.world;return {t:+w.time.toFixed(1),winner:w.winner&&w.winner.name,team:w.winner&&w.winner.team,
     bosses:w.bosses.map(b=>[b.name,b.team,b.state,b.phase,Math.round(b.hp),b._revives||0]),revLogs:w.logs.filter(l=>/喚醒/.test(l.text)).map(l=>l.who+l.text)}}""")
   if i in (1,4,8,12) or st['winner']:
    n=f'{len(shots)+1:02d}-t{int(st["t"])}.png';await pg.screenshot(path=str(SHOTS/n));shots.append(n)
   if st['winner']:break
  rec={'final':st,'shots':shots,'pageErrors':errors,'appErrors':await pg.evaluate('__BD.errors')}
  (SHOTS/'verification.json').write_text(json.dumps(rec,ensure_ascii=False,indent=1),encoding='utf8');print(json.dumps(rec,ensure_ascii=False))
  await browser.close()
asyncio.run(main())
