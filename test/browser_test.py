# 以 headless Chromium 直接開啟 file:// index.html：檢查 JS 錯誤、截圖、並完整跑完數場對決
import asyncio, json, os, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from chrome import launch_args
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'index.html').as_uri()
# 截圖輸出目錄：預設 screenshots/，可用環境變數 BD_SHOTS 改到別處（避免覆蓋既有截圖）
SHOTS = pathlib.Path(os.environ.get('BD_SHOTS') or (ROOT / 'screenshots')); SHOTS.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**launch_args())
        pg = await b.new_page(viewport={'width': 1600, 'height': 1010})
        errs = []
        pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
        # 等待開場倒數結束（沉重模式為預設；玩家輸入在開場期間不會生效）
        async def wait_player_hit(shots=60, step=100):
            for i in range(shots):
                if await pg.evaluate("!!(__BD.world && __BD.world.intro <= 0)"): return True
                await pg.wait_for_timeout(step)
            return False
        await pg.goto(URL); await pg.wait_for_timeout(800)
        # 選角畫面
        await pg.click('#sideA .card[data-id="magmus"]'); await pg.click('#sideB .card[data-id="witch"]')
        await pg.hover('#sideB .card[data-id="witch"]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(SHOTS / '01_select.png'))
        await pg.click('#btnStart'); await pg.wait_for_timeout(500)
        await pg.evaluate("__BD.world.speed = 2")
        # 等到有預警範圍與特效的時刻
        for i in range(200):
            await pg.wait_for_timeout(100)
            n = await pg.evaluate("(()=>{const w=__BD.world; return w.time>12 && w.telegraphs.filter(t=>!t.soft).length>=2 && w.fx.parts.length>20 ? 1:0})()")
            if n: break
        await pg.evaluate("__BD.world.speed = 1"); await pg.wait_for_timeout(120)
        await pg.screenshot(path=str(SHOTS / '02_battle_phase1.png'))
        # 等待二階段 / 大招
        await pg.evaluate("__BD.world.speed = 3")
        got = None
        for i in range(600):
            await pg.wait_for_timeout(100)
            ev = await pg.evaluate("(()=>{const w=__BD.world; const e=w.events.filter(e=>e.type==='ult' && e.phase===2); return e.length? w.time-e[e.length-1].t : -1})()")
            if ev >= 0:
                await pg.evaluate("__BD.world.speed = 1"); await pg.wait_for_timeout(1500); got = 'ult-p2'; break
        if not got:
            got = 'timeout'
        await pg.screenshot(path=str(SHOTS / '03_phase2_ultimate.png'))
        info = await pg.evaluate("(()=>{const w=__BD.world; return {t:+w.time.toFixed(1), phases:w.bosses.map(b=>b.phase), ults:w.bosses.map(b=>[b.stats.ultP1,b.stats.ultP2]), hp:w.bosses.map(b=>Math.round(b.hp))}})()")
        print('shot3 trigger:', got, info)
        # 跑完此場，檢查結算畫面
        await pg.evaluate("__BD.world.speed = 8")
        for i in range(600):
            await pg.wait_for_timeout(100)
            if await pg.evaluate("__BD.screen === 'result'"): break
        res = await pg.evaluate("(()=>({screen:__BD.screen, title:document.querySelector('#resTitle').textContent, sub:document.querySelector('#resSub').textContent}))()")
        print('match1 result:', res)
        await pg.screenshot(path=str(SHOTS / '04_result.png'))
        # 重賽按鈕 + 其他配對完整跑完（含渲染）
        results = []
        # 配對由 Boss 清單產生：每位 Boss 各與下一位完整打一場（新增 Boss 時自動涵蓋）
        ids = await pg.evaluate("(BD.bosses || BD.BOSSES).map(b => b.id)")
        print('bosses:', ids)
        pairs = [(ids[i], ids[(i + 1) % len(ids)]) for i in range(len(ids))]
        await pg.click('#btnRematch'); await pg.wait_for_timeout(300)
        ok_rematch = await pg.evaluate("__BD.screen === 'game' && __BD.world.time < 2")
        for a, c in pairs:
            await pg.evaluate(f"__BD.start('{a}','{c}',{{speed:8}})")
            for i in range(900):
                await pg.wait_for_timeout(100)
                if await pg.evaluate("__BD.screen === 'result'"): break
            r = await pg.evaluate("(()=>{const w=__BD.world; return {pair:w.bosses.map(b=>b.def.id), done:__BD.screen==='result', winner:w.winner&&w.winner.def.id, t:+w.time.toFixed(1), phases:w.bosses.map(b=>b.phase), ults:w.bosses.map(b=>[b.stats.ultP1,b.stats.ultP2])}})()")
            results.append(r); print('browser match:', r)
        # 深淵監視者：一階段群狼（同伴 + 紅眼）與二階段薪王火焰截圖
        await pg.evaluate("__BD.start('watcher','magmus',{speed:1, seed:1})")
        pack = None
        for i in range(400):
            await pg.wait_for_timeout(100)
            pack = await pg.evaluate("(()=>{const w=__BD.world; const al=w.minions.filter(m=>m.alive&&m.kind==='watcher').length, ro=w.minions.filter(m=>m.alive&&m.kind==='rogue').length; return {t:w.time, al, ro, tele:w.telegraphs.filter(t=>!t.soft).length, ph:w.bosses[0].phase}})()")
            if pack['al'] and pack['ro'] and pack['t'] > 5 and pack['tele'] >= 1 and pack['ph'] == 1: break
        await pg.screenshot(path=str(SHOTS / '07_watcher_phase1_pack.png'))
        print('watcher pack shot:', pack)
        await pg.evaluate("__BD.world.speed = 3")
        flame = None
        for i in range(900):
            await pg.wait_for_timeout(100)
            flame = await pg.evaluate("(()=>{const w=__BD.world, b=w.bosses[0]; return {t:+w.time.toFixed(1), ph:b.phase, st:b.state, fires:w.zones.filter(z=>z.kind==='fire'&&z.team===0).length, minions:w.minions.filter(m=>m.kind==='watcher'||m.kind==='rogue').length, over:w.over}})()")
            if flame['over'] or (flame['ph'] == 2 and flame['st'] != 'transition' and flame['fires'] >= 4): break
        await pg.evaluate("__BD.world.speed = 1"); await pg.wait_for_timeout(250)
        await pg.screenshot(path=str(SHOTS / '08_watcher_phase2_flame.png'))
        print('watcher flame shot:', flame)
        await pg.evaluate("__BD.world.speed = 8")
        for i in range(900):
            await pg.wait_for_timeout(100)
            if await pg.evaluate("__BD.screen === 'result'"): break
        wres = await pg.evaluate("(()=>{const w=__BD.world; return {done:__BD.screen==='result', winner:w.winner&&w.winner.def.id, t:+w.time.toFixed(1), phases:w.bosses.map(b=>b.phase), ults:w.bosses.map(b=>[b.stats.ultP1,b.stats.ultP2]), packs:w.stats.packs, rogues:w.stats.rogues, rogueHits:w.stats.rogueHits}})()")
        print('watcher match:', wres)
        results.append(wres)
        for a, c in [('watcher', 'witch'), ('ronin', 'watcher')]:
            await pg.evaluate(f"__BD.start('{a}','{c}',{{speed:8}})")
            for i in range(900):
                await pg.wait_for_timeout(100)
                if await pg.evaluate("__BD.screen === 'result'"): break
            r = await pg.evaluate("(()=>{const w=__BD.world; return {pair:w.bosses.map(b=>b.def.id), done:__BD.screen==='result', winner:w.winner&&w.winner.def.id, t:+w.time.toFixed(1), phases:w.bosses.map(b=>b.phase), ults:w.bosses.map(b=>[b.stats.ultP1,b.stats.ultP2]), packs:w.stats.packs, rogues:w.stats.rogues}})()")
            results.append(r); print('browser match:', r)
        # 戰鬥節奏：預設沉重、H 鍵切換、輕快對戰可正常進行
        await pg.evaluate("__BD.world = null; document.querySelector('#btnMenu').click()"); await pg.wait_for_timeout(200)
        pace0 = await pg.evaluate("document.querySelector('#optPace').value")
        await pg.evaluate("document.activeElement && document.activeElement.blur()")
        await pg.keyboard.press('h'); pace1 = await pg.evaluate("document.querySelector('#optPace').value")
        await pg.keyboard.press('h'); pace2 = await pg.evaluate("document.querySelector('#optPace').value")
        await pg.evaluate("__BD.start('magmus','witch',{pace:'light', speed:3})"); await pg.wait_for_timeout(2500)
        lightw = await pg.evaluate("(()=>{const w=__BD.world; return {pace:w.paceId, t:+w.time.toFixed(1), hp:w.bosses[0].maxHp}})()")
        await pg.evaluate("__BD.start('magmus','witch',{speed:3})"); await pg.wait_for_timeout(300)
        heavyw = await pg.evaluate("(()=>{const w=__BD.world; return {pace:w.paceId, hp:w.bosses[0].maxHp}})()")
        ok_pace = pace0 == 'heavy' and pace1 == 'light' and pace2 == 'heavy' and lightw['pace'] == 'light' and lightw['hp'] == 3250 and heavyw['pace'] == 'heavy' and heavyw['hp'] > 3250
        print('pace ui:', pace0, pace1, pace2, lightw, heavyw, 'ok' if ok_pace else 'FAIL')
        # 玩家操控深淵監視者
        await pg.evaluate("__BD.start('watcher','brood',{player:0})"); await wait_player_hit()
        for i in range(18):
            await pg.keyboard.down('d'); await pg.wait_for_timeout(50); await pg.keyboard.up('d')
            await pg.mouse.move(1000, 600); await pg.mouse.click(1000, 600); await pg.wait_for_timeout(700)
            await pg.keyboard.press('v'); await pg.wait_for_timeout(500)
            uses = await pg.evaluate("(()=>{const b=__BD.world.bosses[0]; return b.stats.uses})()")
            if uses.get('pack', 0) >= 1: break
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(800)
        wp = await pg.evaluate("(()=>{const w=__BD.world,b=w.bosses[0]; return {player:!!b.controller.isPlayer, skills:b.stats.skills, uses:b.stats.uses, dodges:b.stats.dodges, allies:w.minions.filter(m=>m.kind==='watcher').length}})()")
        print('player watcher:', wp)
        # 玩家操控模式冒煙測試
        await pg.evaluate("__BD.start('ronin','magmus',{player:0})"); await wait_player_hit()
        await pg.mouse.move(1000, 600)
        await pg.keyboard.down('d'); await pg.wait_for_timeout(400); await pg.keyboard.up('d')
        await pg.mouse.click(1000, 600); await pg.wait_for_timeout(1300)
        # 沉重模式：出招後恢復較長、翻滾有冷卻 → 反覆按空白鍵直到翻滾成功（同時驗證輸入緩衝）
        for i in range(14):
            await pg.keyboard.press('Space'); await pg.wait_for_timeout(300)
            if await pg.evaluate("__BD.world.bosses[0].stats.dodges >= 1"): break
        await pg.keyboard.press('q'); await pg.wait_for_timeout(600)
        pinfo = await pg.evaluate("(()=>{const b=__BD.world.bosses[0]; return {player:!!b.controller.isPlayer, skills:b.stats.skills, dodges:b.stats.dodges, x:Math.round(b.x)}})()")
        print('player mode:', pinfo)
        await pg.screenshot(path=str(SHOTS / '05_player_mode.png'))
        # 選角畫面可容納 6 位以上 Boss：暫時註冊 4 位測試 Boss 後應出現分頁
        await pg.evaluate("__BD.world = null; document.querySelector('#btnMenu').click()")
        pager = await pg.evaluate("""(()=>{ const base = BD.bosses[1]; for (let i=1;i<=4;i++) BD.registerBoss(Object.assign({}, base, {id:'__t'+i, name:'測試'+i}));
          __BD.rebuildSelect(); const r = {cards: document.querySelectorAll('#sideA .card').length, total: BD.bosses.length,
          pager: !document.querySelector('#sideA .pager').classList.contains('hidden')};
          document.querySelector('#sideA .pager button[data-d="1"]').click(); r.page2 = document.querySelectorAll('#sideA .card').length; return r; })()""")
        print('pager:', pager)
        ok_pager = pager['cards'] == 6 and pager['pager'] and pager['page2'] == pager['total'] - 6
        # F6 AI 偵錯覆蓋層：切換後繪製約 1 秒、確認無 JS 錯誤，再關閉
        await pg.keyboard.press('F6'); await pg.wait_for_timeout(1000)
        f6on = await pg.evaluate("BD.Render.aiDebug === true")
        await pg.keyboard.press('F6'); await pg.wait_for_timeout(100)
        f6off = await pg.evaluate("BD.Render.aiDebug === false")
        ok_ai_debug = f6on and f6off
        print('ai debug overlay:', f6on, f6off, 'ok' if ok_ai_debug else 'FAIL')
        errs += await pg.evaluate("__BD.errors")
        print('rematch ok:', ok_rematch)
        print('JS errors:', errs if errs else 'none')
        await b.close()
        ok = ok_pace and ok_pager and ok_ai_debug and not errs and res['screen'] == 'result' and all(r['done'] for r in results) and ok_rematch and pinfo['skills'] >= 1 and pinfo['dodges'] >= 1 and wp['skills'] >= 2 and wp['uses'].get('pack', 0) >= 1 and wres['packs'] >= 1 and wres['rogues'] >= 1
        print('BROWSER', 'PASS' if ok else 'FAIL')
        sys.exit(0 if ok else 1)
asyncio.run(main())
