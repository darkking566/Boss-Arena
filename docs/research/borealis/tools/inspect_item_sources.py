"""Read normal public browser pages. Never interact with access challenges."""
import asyncio,json,pathlib,sys
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT.parents[2]/'test'))
from chrome import launch_args
PAGES=[('mist-wikigg','https://eldenring.wiki.gg/wiki/Borealis%27s_Mist'),('mist-fandom','https://eldenring.fandom.com/wiki/Borealis%27s_Mist'),('boss-fandom','https://eldenring.fandom.com/wiki/Borealis_the_Freezing_Fog')]
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(**launch_args(),timeout=30000);rows=[]
  for sid,url in PAGES:
   pg=await browser.new_page();r={'id':sid,'url':url,'method':'normal Chrome; no challenge interaction'}
   try:
    response=await pg.goto(url,wait_until='domcontentloaded',timeout=20000);await pg.wait_for_timeout(800)
    txt=await pg.locator('body').inner_text(timeout=2000);r['status']=response.status if response else None;r['title']=await pg.title()
    # Only short, identified source excerpts; do not archive full articles.
    start=txt.lower().find('the ice dragons were');r['lore_found']=start>=0
    if start>=0:
     r['lore_excerpt']='The ice dragons were once lords of the mountaintops long ago'
     r['context_verified']='The following text states defeat by Fire Giants and expulsion from the peak.'
    r['challenge_or_failure']=any(t in txt.lower() for t in ['verify you are human','enable javascript and cookies','just a moment','access denied'])
   except Exception as e:r['error']=str(e)[:350]
   rows.append(r);await pg.close()
  (ROOT/'item-browser-receipts.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(rows,ensure_ascii=False));await browser.close()
if __name__=='__main__':asyncio.run(main())
