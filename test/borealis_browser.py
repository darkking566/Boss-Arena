"""Actual local Chrome file://: controlled displays plus an unforced AI match.
Snapshots of skills are training demonstrations, not proof of an AI decision.
"""
import asyncio,json,pathlib,sys
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
from chrome import launch_args
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
SHOTS=ROOT/'screenshots/borealis'
async def main():
 sys.stdout.reconfigure(encoding='utf8');SHOTS.mkdir(parents=True,exist_ok=True)
 async with async_playwright() as p:
  browser=await p.chromium.launch(**launch_args(),timeout=30000)
  pg=await browser.new_page(viewport={'width':1600,'height':1010});errors=[]
  pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.goto((ROOT/'index.html').as_uri());await pg.wait_for_timeout(400)
  for i in range(9):
   if await pg.locator('#sideA .card[data-id="borealis"]').count():break
   await pg.click('#sideA .pager button[data-d="1"]')
  await pg.click('#sideA .card[data-id="borealis"]');await pg.hover('#sideA .card[data-id="borealis"]')
  await pg.screenshot(path=str(SHOTS/'01-select.png'),full_page=True)
  views=[(1,None,'idle','02-body'),(1,'ice_bite','hit','03-bite'),(1,'wing_sweep','hit','04-wing'),
   (1,'ice_breath','breath','05-breath'),(1,'freezing_roar','roar','06-roar'),(1,'aerial_breath','breath','07-aerial'),
   (1,'dive_bomb','air','08-flight'),(2,'borealis_mist','breath','09-communion'),(2,'ult','land','10-ultimate'),(2,'ult','ring','11-rings')]
  snapshots=[]
  for phase,skill,stage,name in views:
   await pg.evaluate("__BD.startTraining('borealis',{mode:'manual',range:'mid'})")
   result=await pg.evaluate("""([phase,id,stage])=>{
    const w=__BD.world,b=w.training.boss;b.phase=phase;b.controller={update(){}};b.face=0;w.intro=0;
    w.training.setHome(b.x+450,b.y);
    if(id){const s=id==='ult'?b.ultimate:b.skills.find(x=>x.id===id);b.startSkill(s,{force:true});if(b.inst)b.inst.aim=0;
     const acts=b.inst.v.actions,hits=acts.filter(a=>a.do==='hit'),land=acts.find(a=>a.do==='land'),hide=acts.find(a=>a.do==='hide');
     const seconds=stage==='air'?(hide.at+land.at)/2:stage==='land'?land.at+0.1:stage==='ring'?hits[hits.length-1].at+0.12:stage==='hit'?hits[0].at+0.04:stage==='roar'?hits[0].at+0.2:hits[Math.min(2,hits.length-1)].at+0.08;
     for(let i=0;i<2400&&b.inst&&b.inst.t<seconds;i++){w.hitstop=w.slowmo=w.freezeF=0;w.step(BD.STEP);}
    }
    w.speed=0;return {hidden:BD.hasStatus(b,'hidden'),zones:w.zones.length,skill:b.inst&&b.inst.skill.id,phase:b.phase,fx:w.fx.parts.length};
   }""",[phase,skill,stage])
   if stage=='air':assert result['hidden'],result
   if stage in ('land','ring'):assert not result['hidden'],result
   snapshots.append(dict(view=name,**result));await pg.wait_for_timeout(100);await pg.screenshot(path=str(SHOTS/(name+'.png')))
  # A full uncontrolled AI match, separate from staged snapshots.
  await pg.evaluate("__BD.start('borealis','agheel',{seed:31,speed:8,pace:'heavy'})")
  match=None
  for i in range(1200):
   await pg.wait_for_timeout(80)
   match=await pg.evaluate("({done:__BD.screen==='result',time:__BD.world.time,winner:__BD.world.winner&&__BD.world.winner.def.id})")
   if match['done']:break
  assert match['done'],match
  await pg.screenshot(path=str(SHOTS/'12-result.png'))
  await pg.set_viewport_size({'width':390,'height':844});await pg.evaluate("__BD.startTraining('borealis',{mode:'manual',range:'mid'})");await pg.wait_for_timeout(150)
  await pg.screenshot(path=str(SHOTS/'13-mobile.png'))
  effects=await pg.evaluate("""()=>{
   const ids=Object.keys(BD.effects).filter(id=>id.startsWith('borealis'));
   for(const el of Object.keys(BD.elements))for(const id of ids){const w=new BD.World(BD.bossById.borealis,BD.bossById.dummy,{seed:3,intro:0}),b=w.bosses[0];BD.spawnFx(w,id,b.x,b.y,{src:b,el,angle:0,radius:200});for(let i=0;i<90;i++)w.fx.update(BD.STEP);for(const key of ['parts','glows','puffs','shocks','streaks'])for(const x of w.fx[key])for(const k of ['x','y','life'])if(k in x&&!Number.isFinite(x[k]))throw Error(id+': '+key+'.'+k);}
   return {effects:ids.length,elements:Object.keys(BD.elements).length};
  }""")
  assert effects['effects']==17 and effects['elements']>=20,effects
  assert not errors,errors
  result=dict(browser='actual local Chrome file://',page_errors=errors,match=match,snapshots=snapshots,effects=effects,screenshots=13,driver_accepted=False)
  (SHOTS/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
  print(json.dumps(result,ensure_ascii=False));await browser.close()
if __name__=='__main__':asyncio.run(main())
