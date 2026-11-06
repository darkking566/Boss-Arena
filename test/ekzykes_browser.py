"""Actual local Chrome, file://, controlled skill views and an unforced AI match."""
import asyncio,json,pathlib,sys
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
from chrome import launch_args
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
SHOTS=ROOT/'screenshots/ekzykes'
async def main():
 SHOTS.mkdir(parents=True,exist_ok=True)
 async with async_playwright() as p:
  browser=await p.chromium.launch(**launch_args(),timeout=30000);pg=await browser.new_page(viewport={'width':1600,'height':1010});errors=[]
  pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.goto((ROOT/'index.html').as_uri());await pg.wait_for_timeout(400)
  for i in range(8):
   if await pg.locator('#sideA .card[data-id="ekzykes"]').count():break
   await pg.click('#sideA .pager button[data-d="1"]')
  await pg.click('#sideA .card[data-id="ekzykes"]');await pg.hover('#sideA .card[data-id="ekzykes"]');await pg.screenshot(path=str(SHOTS/'01-select.png'),full_page=True)
  for phase,skill,stage,name in [(1,None,'idle','02-body'),(1,'sweeping_breath','breath','03-breath'),(1,'great_miasma','fog','04-miasma'),(1,'dive_bomb','air','05-flight'),(2,'ult','land','06-ultimate')]:
   await pg.evaluate("__BD.startTraining('ekzykes',{mode:'manual',range:'mid'})")
   result=await pg.evaluate("""([phase,id,stage])=>{
    const w=__BD.world,b=w.training.boss; b.phase=phase;b.controller={update(){}};b.face=0;w.intro=0;
    w.training.setHome(b.x+390,b.y);
    if(id){const s=id==='ult'?b.ultimate:b.skills.find(x=>x.id===id);b.startSkill(s,{force:true});if(b.inst)b.inst.aim=0;
     const acts=b.inst.v.actions,hits=acts.filter(a=>a.do==='hit'),land=acts.find(a=>a.do==='land'),hide=acts.find(a=>a.do==='hide');
     const seconds=stage==='air'?(hide.at+land.at)/2:stage==='land'?land.at+0.12:stage==='fog'?hits[2].at+0.09:hits[2].at+0.08;
     for(let i=0;i<1900&&b.inst&&b.inst.t<seconds;i++){w.hitstop=w.slowmo=0;w.step(BD.STEP);}
    }
    w.speed=0;return {hidden:BD.hasStatus(b,'hidden'),zones:w.zones.length,skill:b.inst&&b.inst.skill.id,phase:b.phase};
   }""",[phase,skill,stage])
   if stage=='air':assert result['hidden'],result
   if stage=='land':assert not result['hidden'],result
   await pg.wait_for_timeout(100);await pg.screenshot(path=str(SHOTS/(name+'.png')))
  await pg.evaluate("__BD.start('ekzykes','agheel',{seed:31,speed:8,pace:'heavy'})");result=None
  for i in range(1000):
   await pg.wait_for_timeout(80)
   result=await pg.evaluate("({done:__BD.screen==='result',time:__BD.world.time,winner:__BD.world.winner&&__BD.world.winner.def.id})")
   if result['done']:break
  assert result['done'],result
  await pg.screenshot(path=str(SHOTS/'07-result.png'))
  await pg.set_viewport_size({'width':390,'height':844});await pg.evaluate("__BD.startTraining('ekzykes',{mode:'manual',range:'mid'})");await pg.wait_for_timeout(150);await pg.screenshot(path=str(SHOTS/'08-mobile.png'))
  await pg.set_viewport_size({'width':1600,'height':1010});await pg.goto((ROOT/'docs/research/ekzykes/gallery.html').as_uri())
  await pg.evaluate("document.querySelectorAll('img').forEach(i=>i.loading='eager')")
  await pg.wait_for_function("[...document.images].every(i=>i.complete&&i.naturalWidth>0)")
  assert await pg.locator('article').count()==34
  await pg.click('[data-filter="模型"]');assert await pg.locator('article:visible').count()==5
  await pg.click('[data-filter="全部"]');assert await pg.locator('article:visible').count()==34
  await pg.screenshot(path=str(SHOTS/'09-reference-gallery.png'))
  await pg.goto((ROOT/'index.html').as_uri())
  effects=await pg.evaluate("""()=>{
   const ids=Object.keys(BD.effects).filter(id=>id.startsWith('ekzykes'));
   for(const el of Object.keys(BD.elements))for(const id of ids){const w=new BD.World(BD.bossById.ekzykes,BD.bossById.dummy,{seed:3,intro:0}),b=w.bosses[0];BD.spawnFx(w,id,b.x,b.y,{src:b,el,angle:0,radius:200});for(let i=0;i<90;i++)w.fx.update(BD.STEP);}
   return {effects:ids.length,elements:Object.keys(BD.elements).length};
  }""")
  assert effects['effects']==9 and effects['elements']>=19,effects
  assert not errors,errors
  print(json.dumps(dict(browser='actual local Chrome file://',errors=errors,match=result,shots=9,images=34,effects=effects),ensure_ascii=False))
  await browser.close()
if __name__=='__main__':asyncio.run(main())
