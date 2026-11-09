"""Actual local Chrome, file://: card, controlled skill views (training, fixed times), an unforced AI match, narrow screen, reference gallery, fx x element."""
import asyncio, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from chrome import launch_args
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / 'screenshots/fallingstar'
VIEWS = [  # (phase, skill, seconds after start, file)
    (1, None, 0, '02-body'), (1, 'head_swing', 1.02, '03-mandible'), (1, 'tail_sweep', 0.9, '04-tail'), (1, 'gravitas', 1.2, '05-gravitas-pull'),
    (1, 'gravitas', 1.85, '06-gravitas-spikes'), (1, 'gravity_bolt', 2.8, '07-gravity-bolt'), (1, 'beast_roll', 1.2, '08-roll-air'),
    (1, 'rock_throw', 1.8, '09-rock-throw'), (1, 'charge', 1.9, '10-charge'), (2, 'reverse_gravity', 1.5, '11-reverse-gravity'),
    (2, 'gravity_ray', 1.2, '12-ray-orb'), (2, 'gravity_ray', 2.3, '13-ray-sweep'), (1, 'ult', 3.9, '14-ult-meteor'), (2, 'ult', 5.4, '15-ult2-ray'),
]
ONLY = sys.argv[1:]
async def main():
    SHOTS.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_args(), timeout=30000); pg = await browser.new_page(viewport={'width': 1600, 'height': 1010}); errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        await pg.goto((ROOT / 'index.html').as_uri()); await pg.wait_for_timeout(400)
        for i in range(10):
            if await pg.locator('#sideA .card[data-id="fallingstar"]').count(): break
            await pg.click('#sideA .pager button[data-d="1"]')
        await pg.click('#sideA .card[data-id="fallingstar"]'); await pg.hover('#sideA .card[data-id="fallingstar"]'); await pg.screenshot(path=str(SHOTS / '01-select.png'), full_page=True)
        for phase, skill, sec, name in VIEWS:
            if ONLY and name not in ONLY: continue
            await pg.evaluate("__BD.startTraining('fallingstar',{mode:'manual',range:'mid'})")
            await pg.evaluate("""([phase,id,sec])=>{
              const w=__BD.world,b=w.training.boss; b.phase=phase;b.controller={update(){}};b.face=0;w.intro=0;w.training.setHome(b.x+380,b.y);
              if(id){const s=id==='ult'?b.ultimate:b.skills.find(x=>x.id===id);b.startSkill(s,{force:true});
                for(let i=0;i<2400&&b.inst&&b.inst.t<sec;i++){w.hitstop=w.slowmo=0;w.step(BD.STEP);} }
              else for(let i=0;i<60;i++)w.step(BD.STEP);
              w.speed=0;}""", [phase, skill, sec])
            await pg.wait_for_timeout(120); await pg.screenshot(path=str(SHOTS / (name + '.png')))
        result = None
        if not ONLY:
            await pg.evaluate("__BD.start('fallingstar','ekzykes',{seed:31,speed:8,pace:'heavy'})")
            for i in range(1500):
                await pg.wait_for_timeout(80)
                result = await pg.evaluate("({done:__BD.screen==='result',time:__BD.world.time,winner:__BD.world.winner&&__BD.world.winner.def.id})")
                if result['done']: break
            assert result['done'], result
            await pg.screenshot(path=str(SHOTS / '16-result.png'))
            await pg.set_viewport_size({'width': 390, 'height': 844}); await pg.evaluate("__BD.startTraining('fallingstar',{mode:'manual',range:'mid'})"); await pg.wait_for_timeout(150); await pg.screenshot(path=str(SHOTS / '17-mobile.png'))
            await pg.set_viewport_size({'width': 1600, 'height': 1010}); await pg.goto((ROOT / 'docs/research/fallingstar/gallery.html').as_uri())
            await pg.evaluate("document.querySelectorAll('img').forEach(i=>i.loading='eager')")
            await pg.wait_for_function("[...document.images].every(i=>i.complete&&i.naturalWidth>0)", timeout=60000)
            n = await pg.locator('article').count()
            await pg.click('[data-filter="概念圖"]'); concept = await pg.locator('article:visible').count()
            await pg.click('[data-filter="全部"]'); assert await pg.locator('article:visible').count() == n
            await pg.screenshot(path=str(SHOTS / '18-reference-gallery.png'))
            await pg.goto((ROOT / 'index.html').as_uri())
            effects = await pg.evaluate("""()=>{
              const ids=Object.keys(BD.effects).filter(id=>BD.effects[id].name.startsWith('墜星成獸'));
              for(const el of Object.keys(BD.elements))for(const id of ids){const w=new BD.World(BD.bossById.fallingstar,BD.bossById.dummy,{seed:3,intro:0}),b=w.bosses[0];BD.spawnFx(w,id,b.x,b.y,{src:b,el,angle:0,radius:200});for(let i=0;i<90;i++)w.fx.update(BD.STEP);}
              return {effects:ids.length,elements:Object.keys(BD.elements).length};}""")
            print(json.dumps(dict(gallery=n, concept=concept, effects=effects), ensure_ascii=False))
        assert not errors, errors
        print(json.dumps(dict(browser='actual local Chrome file://', errors=errors, match=result), ensure_ascii=False))
        await browser.close()
if __name__ == '__main__': asyncio.run(main())
