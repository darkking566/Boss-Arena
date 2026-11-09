"""Normal Chrome page load only. Record failed access without workarounds."""
import asyncio,json,pathlib,sys
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT.parents[2]/'test'))
from chrome import launch_args
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(**launch_args(),timeout=30000)
  pg=await browser.new_page(viewport={'width':1600,'height':1080})
  url='https://www.creativeuncut.com/gallery-43/er-borealis-the-freezing-fog.html'
  result={'page_url':url,'method':'normal local Chrome page load; no custom headers or access-control workarounds'}
  try:
   response=await pg.goto(url,wait_until='domcontentloaded',timeout=25000)
   await pg.wait_for_timeout(1500)
   result['page_status']=response.status if response else None
   result['images']=await pg.locator('img').evaluate_all('(imgs)=>imgs.map(i=>({src:i.src,width:i.naturalWidth,height:i.naturalHeight,complete:i.complete}))')
   target=pg.locator('img[alt="Borealis the Freezing Fog Art from Elden Ring"]')
   result['viewable']=bool(await target.count() and await target.evaluate('(i)=>i.complete&&i.naturalWidth>1000'))
   if result['viewable']:
    await target.screenshot(path=str(ROOT/'concept-public-page.png'))
    await pg.screenshot(path=str(ROOT/'concept-page-context.png'),full_page=True)
  except Exception as e:result['error']=str(e)
  (ROOT/'concept-browser-receipt.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
  print(json.dumps(result,ensure_ascii=False));await browser.close()
if __name__=='__main__':asyncio.run(main())
