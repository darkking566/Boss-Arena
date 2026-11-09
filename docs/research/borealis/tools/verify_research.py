"""Check reference integrity and the actual local Chrome gallery only.
No game files, game state, learning data or fingerprint baselines are touched.
"""
import asyncio,hashlib,json,pathlib,sys
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT.parents[2]/'test'))
from chrome import launch_args
async def main():
 sys.stdout.reconfigure(encoding='utf8')
 selected=json.loads((ROOT/'selected-images.json').read_text(encoding='utf8'))
 inventory=json.loads((ROOT/'reviewed-inventory.json').read_text(encoding='utf8'))
 records=[json.loads(x) for x in (ROOT/'library/index/records.jsonl').read_text(encoding='utf8').splitlines()]
 assert len(selected)==33 and len(inventory)==48 and len(records)==42
 assert len({x['sha256'] for x in selected})==33
 assert sum(x['frames']>1 for x in selected)==4
 assert len([x for x in inventory if not x['selected']])==15
 assert len([x for x in selected if x['category']=='概念圖'])==1
 for x in selected:
  p=ROOT/x['file'];assert p.resolve().is_relative_to(ROOT.resolve())
  assert hashlib.sha256(p.read_bytes()).hexdigest()==x['sha256'],x['id']
  assert x['inspection']=='viewed' and x['inspection_ref'] and x['author']
 assert not any('@@'+k+'@@' in (ROOT/'gallery.html').read_text(encoding='utf8') for k in ['DATA','CARDS','FILTERS'])
 result={'integrity':{'selected':33,'reviewed':48,'excluded':15,'animated_sources':4,'records':42,'hashes':'all match','duplicates':'no identical selected bytes'},'driver_accepted':False,'game_implemented':False}
 (ROOT/'qa').mkdir(exist_ok=True)
 async with async_playwright() as p:
  browser=await p.chromium.launch(**launch_args(),timeout=30000)
  pg=await browser.new_page(viewport={'width':1560,'height':1050});errors=[]
  pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.goto((ROOT/'gallery.html').as_uri())
  await pg.evaluate("document.querySelectorAll('article img,.hero img').forEach(i=>i.loading='eager')")
  await pg.wait_for_function("[...document.querySelectorAll('article img,.hero img')].every(i=>i.complete&&i.naturalWidth>0)")
  assert await pg.locator('article').count()==33
  assert await pg.locator('article:visible').count()==33
  await pg.screenshot(path=str(ROOT/'qa/gallery-desktop.png'),full_page=False)
  categories={}
  for category in ['概念圖','外觀','動作','冰霧','凍傷','龍饗祈禱','遊戲攝影']:
   await pg.click('button[data-filter="'+category+'"]');n=await pg.locator('article:visible').count()
   assert n==sum(x['category']==category for x in selected)
   categories[category]=n
  assert sum(categories.values())==33
  await pg.click('button[data-filter="全部"]');await pg.fill('#query','翼腕');assert await pg.locator('article:visible').count()>0
  await pg.fill('#query','不存在的圖片關鍵字');assert await pg.locator('article:visible').count()==0;assert await pg.locator('#empty').is_visible()
  await pg.fill('#query','')
  await pg.click('.hero-picture');assert await pg.locator('dialog').is_visible()
  assert (await pg.locator('#viewer-title').inner_text()).startswith('bo-ref-048')
  await pg.wait_for_function("document.querySelector('dialog img').complete&&document.querySelector('dialog img').naturalWidth>0")
  await pg.screenshot(path=str(ROOT/'qa/gallery-concept-viewer.png'))
  await pg.keyboard.press('ArrowRight');assert (await pg.locator('#viewer-title').inner_text()).startswith('bo-ref-001')
  await pg.keyboard.press('ArrowLeft');assert (await pg.locator('#viewer-title').inner_text()).startswith('bo-ref-048')
  await pg.keyboard.press('Escape');assert not await pg.locator('dialog').is_visible()
  await pg.set_viewport_size({'width':390,'height':844});await pg.evaluate('scrollTo(0,0)')
  assert await pg.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1')
  await pg.screenshot(path=str(ROOT/'qa/gallery-mobile.png'))
  await pg.click('button[data-filter="概念圖"]');assert await pg.locator('article:visible').count()==1
  await pg.locator('article:visible .picture').click();assert await pg.locator('dialog').is_visible()
  await pg.keyboard.press('Escape')
  assert not errors,errors
  result['browser']={'name':'actual local Chrome, file://','all_card_images_loaded':33,'categories':categories,'search':'passed, including empty state','viewer':'passed, buttons/arrows/Escape','mobile_width':390,'horizontal_overflow':False,'page_errors':errors,'screenshots':3}
  await browser.close()
 (ROOT/'qa/verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
 print(json.dumps(result,ensure_ascii=False))
if __name__=='__main__':asyncio.run(main())
