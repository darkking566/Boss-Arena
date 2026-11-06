"""Real browser file:// smoke + staged skill screenshots, without modifying a saved game."""
import asyncio, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from chrome import launch_args
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
SHOTS=ROOT/'screenshots/redwolf'

async def main():
 SHOTS.mkdir(exist_ok=True)
 async with async_playwright() as p:
  browser=await p.chromium.launch(**launch_args())
  pg=await browser.new_page(viewport={'width':1600,'height':1010}); errors=[]
  pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.goto((ROOT/'index.html').as_uri()); await pg.wait_for_timeout(500)
  for i in range(3): await pg.click('#sideA .pager button[data-d="1"]')
  await pg.click('#sideA .card[data-id="redwolf"]'); await pg.hover('#sideA .card[data-id="redwolf"]')
  await pg.screenshot(path=str(SHOTS/'01-select.png'),full_page=True)
  assert await pg.locator('#sideA .card[data-id="redwolf"]').count()==1
  for phase,skill,stage,name in [(1,'glint_array','glint','02-glintblades'),(1,'sword_combo','slash','03-sword'),(1,'leap_sword','air','04-leap'),(2,'ult','finale','05-ultimate')]:
   await pg.evaluate("__BD.startTraining('redwolf',{mode:'manual',range:'mid'})")
   staged=await pg.evaluate("""([phase,id,stage])=>{
    const w=__BD.world,b=w.training.boss,e=b.enemy; w.intro=0;
    b.phase=phase; b.controller={update(){}}; b.face=0;
    w.training.setHome(b.x+300,b.y);
    const s=id==='ult'?b.ultimate:b.skills.find(s=>s.id===id);
    b.startSkill(s,{force:true}); if(b.inst)b.inst.aim=0;
    const acts=b.inst.v.actions;
    const seconds=stage==='glint'?acts.find(a=>a.do==='glintblades').at+0.4:
      stage==='slash'?acts.find(a=>a.do==='hit').at+0.08:
      stage==='air'?(acts.find(a=>a.do==='hide').at+acts.find(a=>a.do==='land').at)/2:
      acts.find(a=>a.do==='land').at+0.26;
    for(let n=0;n<1800&&b.inst&&b.inst.t<seconds;n++){w.hitstop=w.slowmo=0;w.step(BD.STEP);}
    w.speed=0;
    return {stage,hidden:BD.hasStatus(b,'hidden'),glints:(b._glintblades||[]).length,skill:b.inst&&b.inst.skill.id};
   }""",[phase,skill,stage])
   if stage=='air': assert staged['hidden'],staged
   if stage=='glint': assert staged['glints']>=3,staged
   if stage=='finale': assert not staged['hidden'] and staged['glints']>=5,staged
   await pg.wait_for_timeout(120); await pg.screenshot(path=str(SHOTS/(name+'.png')))
  await pg.evaluate("__BD.start('redwolf','treesentinel',{seed:21,speed:8,pace:'heavy'})")
  await pg.wait_for_timeout(120)
  result=None
  for i in range(600):
   await pg.wait_for_timeout(50)
   result=await pg.evaluate("({done:__BD.screen==='result',time:__BD.world.time,winner:__BD.world.winner&&__BD.world.winner.def.id})")
   if result['done']: break
  assert result['done'],result
  await pg.screenshot(path=str(SHOTS/'06-result.png'))
  await pg.set_viewport_size({'width':390,'height':844})
  await pg.evaluate("__BD.startTraining('redwolf',{mode:'manual',range:'mid'})")
  await pg.wait_for_timeout(250); await pg.screenshot(path=str(SHOTS/'07-mobile.png'))
  await pg.set_viewport_size({'width':1600,'height':1010})
  await pg.goto((ROOT/'docs/research/redwolf/gallery.html').as_uri())
  await pg.evaluate("document.querySelectorAll('img').forEach(i=>i.loading='eager')")
  await pg.wait_for_function("[...document.images].every(i=>i.complete&&i.naturalWidth>0)")
  assert await pg.locator('article').count()==33
  await pg.click('[data-filter="概念候選"]'); assert await pg.locator('article:visible').count()==1
  await pg.click('[data-filter="全部"]'); assert await pg.locator('article:visible').count()==33
  await pg.screenshot(path=str(SHOTS/'08-reference-gallery.png'))
  # Exercise all six effects against every element in the actual browser renderer.
  await pg.goto((ROOT/'index.html').as_uri())
  effects=await pg.evaluate("""()=>{
   const ids=Object.keys(BD.effects).filter(id=>id.startsWith('redwolf'));
   for(const el of Object.keys(BD.elements))for(const id of ids){
    const w=new BD.World(BD.bossById.redwolf,BD.bossById.dummy,{intro:0,seed:2}),b=w.bosses[0];
    BD.spawnFx(w,id,b.x,b.y,{src:b,el,angle:0,radius:180});
    for(let i=0;i<15;i++)w.fx.update(BD.STEP);
   }
   return {effects:ids.length,elements:Object.keys(BD.elements).length};
  }""")
  assert effects['effects']==6 and effects['elements']>=18,effects
  assert not errors,errors
  print(json.dumps({'browser':'file:// Chromium','errors':errors,'match':result,'shots':8,'reference_images':33,'effects':effects},ensure_ascii=False))
  await browser.close()

asyncio.run(main())
