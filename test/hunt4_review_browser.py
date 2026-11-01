"""真實瀏覽器：完整狩獵結算、回顧資料、重賽、舊存檔、窄視窗與模式切換。"""
import asyncio
import json
import pathlib

from chrome import launch_args
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / 'screenshots' / 'hunt4-growth'


async def main():
    async with async_playwright() as p:
        print('Launching browser', flush=True)
        browser = await p.chromium.launch(timeout=20000, **launch_args())
        page = await browser.new_page(viewport={'width': 1440, 'height': 1050})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto((ROOT / 'index.html').as_uri(), timeout=20000)
        await page.wait_for_function('!!window.__BD && !!BD.Hunt4')
        SHOTS.mkdir(parents=True, exist_ok=True)
        print('Running complete hunt', flush=True)
        # 固定種子重建世界，仍使用真正遊戲的結算與存檔路徑。推進固定步數加速測試。
        await page.evaluate("""() => {
            __BD.startHunt4('ronin', 'desert');
            __BD.world = new BD.World(BD.Hunt4.team(), BD.bossById.ronin,
                {seed:71, intro:0.5, pace:'heavy', hunt4:true, h4save:__BD.h4save});
            const w=__BD.world;
            for(let i=0;i<910*60 && !w.over;i++) { w.hitstop=0; w.freezeF=0; w.step(BD.STEP); }
        }""")
        await page.wait_for_function("__BD.screen === 'result'", timeout=30000)
        assert await page.locator('.h4-review-card').count() == 4
        assert await page.locator('#resGrowth').is_visible()
        assert '熟練度' in await page.locator('#resGrowth').inner_text()
        result = await page.evaluate("""() => {
            const r=__BD.world.hunt4.review[0], text=document.querySelector('.h4-review-card').textContent;
            const pct=n=>(n*100).toFixed(1)+'%';
            return {title:document.querySelector('#resTitle').textContent, time:__BD.world.time,
                correct:text.includes(pct(r.before.weapons.katana.mastery)+' → '+pct(r.after.weapons.katana.mastery)),
                saved:JSON.parse(localStorage.getItem('bd.hunt4.save')).matches,
                errors:__BD.errors, cards:document.querySelectorAll('.h4-review-card').length};
        }""")
        assert result['correct'] and result['saved'] == 1 and not result['errors'], result
        await page.screenshot(path=str(SHOTS / 'after-wide.png'), full_page=True)
        await page.set_viewport_size({'width': 390, 'height': 844})
        assert await page.evaluate("""() => Array.from(document.querySelectorAll('.h4-review-card')).every(c=>{
            const r=c.getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth;
        })"""), '窄視窗回顧卡片超出畫面'
        await page.screenshot(path=str(SHOTS / 'after-narrow.png'), full_page=True)
        await page.locator('#btnRematch').click()
        assert await page.locator('#resGrowth').is_hidden()
        assert await page.evaluate('__BD.world.hunt4.review === undefined')

        print('Checking loss and zero samples', flush=True)
        await page.evaluate("""() => {
            const w=__BD.world; w.winner=w.hunt4.boss;
            for(let i=0;i<400&&!w.over;i++) { w.hitstop=0; w.freezeF=0; w.step(BD.STEP); }
        }""")
        await page.wait_for_function("__BD.screen === 'result'")
        assert await page.locator('.h4-review-card').count() == 4
        assert '尚無已結算的嘗試紀錄' in await page.locator('#resGrowth').inner_text()
        assert '失敗' in await page.locator('#resTitle').inner_text()

        # 用既有 v1 存檔重新載入；不需要任何回顧欄位。
        print('Checking legacy save', flush=True)
        await page.evaluate("""() => localStorage.setItem('bd.hunt4.save', JSON.stringify({
            v:1, matches:8, hunters:{rin:{xp:{katana:25},strat:{},dex:{ronin:{fights:8,wins:3,sk:{}}}}}
        }))""")
        await page.reload()
        await page.wait_for_function('!!window.__BD && !!BD.Hunt4')
        await page.evaluate("""() => { const w=__BD.startHunt4('ronin','desert'); w.winner=w.hunt4.boss;
            for(let i=0;i<400&&!w.over;i++) { w.hitstop=0; w.freezeF=0; w.step(BD.STEP); }
        }""")
        await page.wait_for_function("__BD.screen === 'result'")
        assert await page.evaluate('__BD.world.hunt4.review[0].before.weapons.katana.xp === 25')
        assert await page.evaluate('__BD.h4save.hunters.rin.xp.katana === 26')
        assert '圖鑑' in await page.locator('#resGrowth').inner_text()
        await page.screenshot(path=str(SHOTS / 'legacy-loss.png'), full_page=True)

        # 其他模式的結算不應殘留狩獵回顧。
        await page.evaluate("""() => {const w=__BD.start('ronin','magmus',{seed:1}); w.winner=w.bosses[0];
            for(let i=0;i<400&&!w.over;i++) {w.hitstop=0;w.freezeF=0;w.step(BD.STEP);}}
        """)
        await page.wait_for_function("__BD.screen === 'result'")
        assert await page.locator('#resGrowth').is_hidden()
        assert not errors and not await page.evaluate('__BD.errors'), errors
        result['pageerrors'] = errors
        result['checks'] = ['full hunt', 'data parity', 'rematch', 'loss', 'zero samples', 'legacy save', '390px', 'duel isolation']
        (ROOT / 'test' / 'growth-browser.log').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps(result, ensure_ascii=False), flush=True)
        await browser.close()


asyncio.run(main())
