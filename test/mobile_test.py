"""Mobile layout and real pointer interaction regression checks (Playwright)."""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from chrome import launch_args
ROOT = pathlib.Path(__file__).resolve().parent.parent

async def main():
 async with async_playwright() as pw:
  browser = await pw.chromium.launch(**launch_args())
  for width, height, mobile in [(390,844,True),(844,390,True),(360,740,True),(1440,900,False)]:
   context = await browser.new_context(viewport={'width':width,'height':height}, is_mobile=mobile, has_touch=mobile, device_scale_factor=3 if mobile else 1)
   page = await context.new_page()
   errors=[]
   page.on('pageerror',lambda e: errors.append(str(e)))
   await page.goto('http://localhost:8080/')
   await page.wait_for_timeout(400)
   assert await page.evaluate('document.querySelector("#select").scrollWidth <= innerWidth'), 'selection overflow'
   await page.locator('#sideA .card').first.click()
   await page.locator('#btnStart').scroll_into_view_if_needed()
   assert await page.locator('#btnStart').is_visible()
   await page.evaluate("__BD.start('magmus','ronin',{player:0,seed:1})")
   await page.wait_for_timeout(300)
   if mobile:
    assert await page.locator('.tc-stick').is_visible()
    await page.evaluate("__BD.world.intro=0")
    rect=await page.locator('.tc-stick').bounding_box()
    x,y=rect['x']+rect['width']/2,rect['y']+rect['height']/2
    await page.mouse.move(x+30,y)
    await page.mouse.down()
    await page.wait_for_timeout(100)
    assert await page.evaluate('__BD.world.bosses[0].moveX > 0'), 'joystick movement'
    await page.mouse.up()
    await page.wait_for_timeout(80)
    assert await page.evaluate('__BD.world.bosses[0].moveX === 0'), 'cancel clears movement'
    await page.evaluate('__BD.world.intro=0')
    if width == 390:
     cdp = await context.new_cdp_session(page)
     skill = await page.locator('.tc-pad button').nth(1).bounding_box()
     fingers=[{'x':x+30,'y':y,'id':1}, {'x':skill['x']+skill['width']/2,'y':skill['y']+skill['height']/2,'id':2}]
     await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':fingers[:1]})
     await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':fingers})
     await page.wait_for_timeout(80)
     assert await page.evaluate('__BD.world.bosses[0].moveX > 0'), 'multi touch movement'
     await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    else:
     await page.locator('.tc-pad button').nth(1).tap()
    await page.wait_for_timeout(120)
    assert await page.evaluate('__BD.world.bosses[0].state === "skill"'), 'touch skill'
    await page.get_by_role('button',name='選單',exact=True).tap()
    assert await page.evaluate('__BD.world.paused')
    await page.get_by_role('button',name='繼續戰鬥',exact=True).tap()
    assert not await page.evaluate('__BD.world.paused')
    for box in await page.locator('.tc-pad button, .tc-stick, .tc-bar button').evaluate_all('(els)=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}})'):
     assert box['x']>=0 and box['y']>=0 and box['right']<=width+1 and box['bottom']<=height+1, box
    await page.screenshot(path=f'/tmp/boss-mobile-{width}.png')
    await page.get_by_role('button',name='選單',exact=True).tap()
    await page.get_by_role('button',name='返回選角／據點',exact=True).tap()
    assert await page.evaluate('__BD.screen === "select"')
    await page.locator('#modeTrain').click()
    await page.locator('#btnStart').click()
    await page.wait_for_timeout(300)
    assert await page.locator('#trainPanel').is_visible()
    assert await page.locator('.tc-pad').is_visible()
    await page.locator('[data-act="phase-2"]').click()
    assert await page.evaluate('__BD.world.training.boss.phase === 2 || __BD.world.training.boss.state === "transition"')
   if mobile:
    await page.keyboard.press('Escape')
    await page.locator('#modeHunt').click()
    await page.wait_for_timeout(120)
    assert await page.locator('#hunt').is_visible()
    assert await page.evaluate('document.querySelector("#hunt").scrollWidth <= innerWidth'), 'hunt overflow'
    await page.evaluate("__BD.start('magmus','ronin',{seed:1})")
    await page.evaluate('__BD.world.over=true; __BD.world.winner=__BD.world.bosses[0]')
    await page.wait_for_timeout(200)
    assert await page.locator('#result').is_visible()
    assert await page.evaluate('document.querySelector("#result").scrollWidth <= innerWidth'), 'result overflow'
    await page.locator('#btnMenu').click()
    await page.screenshot(path=f'/tmp/boss-select-{width}.png')
    for mode in ['modeTeam','modeHorde','modeHunt4']:
     await page.locator('#'+mode).click()
     await page.locator('#btnStart').click()
     await page.wait_for_timeout(150)
     assert await page.evaluate('__BD.screen === "game"'), mode
     await page.keyboard.press('Escape')
   assert not errors,errors
   assert await page.evaluate('__BD.errors.length === 0')
   print(f'PASS {width}x{height} mobile={mobile}')
   await context.close()
  await browser.close()
asyncio.run(main())
