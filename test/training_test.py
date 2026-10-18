# 訓練場 headless browser test：以 headless Chromium 開啟 file:// index.html
# 測試選角進入訓練場、每位 Boss 一/二階段技能施放與傷害、重置、AI 模式、鍵盤快速鍵、速度按鈕、一般對戰回退、截圖
import argparse, asyncio, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from chrome import launch_args
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'index.html').as_uri()

# 允許空振的技能名單（需為受攻擊觸發的反擊技、或假人站立不動無法觸發的陷阱）
ALLOW_MISS = {
    'ronin:mikiri',   # 見切：架式期間需受攻擊才會觸發反斬；假人不攻擊
    'watcher:parry',  # 匕首彈反：架式期間需受攻擊才會觸發反斬；假人不攻擊
    'witch:mines',    # 霜凍地雷：陷阱散布於兩者之間，假人站立不動不會踩中
    'brood:web',      # 蛛網陷阱：陷阱環繞假人外圍生成（距離 150px），假人不動不會觸發
    'magmus:pools',   # 熔岩池：熔岩池散布於目標兩側（off 170px，半徑 105px），假人站立不動不會接觸
}

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--shot', default=None, help='Screenshot path (optional)')
    args = ap.parse_args()

    failures = []
    errs = []

    async with async_playwright() as p:
        b = await p.chromium.launch(**launch_args())
        pg = await b.new_page(viewport={'width': 1600, 'height': 1010})

        pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))

        # ── 1. Open index.html & enter training ground ──
        await pg.goto(URL)
        await pg.wait_for_timeout(800)

        await pg.click('#modeTrain')
        await pg.wait_for_timeout(100)

        step1_nav = await pg.evaluate("""(() => {
            const sel = document.querySelector('#select');
            const sideB = document.querySelector('#sideB');
            return {
                trainingClass: sel && sel.classList.contains('training'),
                sideBHidden: sideB && sideB.offsetParent === null
            };
        })()""")
        if not step1_nav['trainingClass']:
            failures.append("Step 1: #select does not have class 'training'")
        if not step1_nav['sideBHidden']:
            failures.append("Step 1: #sideB is not hidden (offsetParent !== null)")

        await pg.click('#sideA .card[data-id="magmus"]')
        await pg.select_option('#optTrainMode', 'manual')
        await pg.click('#btnStart')
        await pg.wait_for_timeout(500)

        step1_asserts = await pg.evaluate("""(() => {
            const w = __BD.world;
            const panel = document.querySelector('#trainPanel');
            const panelVisible = panel && !panel.classList.contains('hidden') && panel.offsetParent !== null;
            const dummyOk = !!(w && w.bosses && w.bosses[1] && w.bosses[1].def && w.bosses[1].def.id === 'dummy');
            const bossesClean = BD.bosses.every(b => b.id !== 'dummy');
            const noDummyCard = !document.querySelector('#sideA .card[data-id="dummy"]');
            return {
                trainingExists: !!(w && w.training),
                panelVisible,
                dummyOk,
                bossesClean,
                noDummyCard
            };
        })()""")
        for k, v in step1_asserts.items():
            if not v:
                failures.append(f"Step 1 assertion failed: {k}")

        # ── 2. For EACH boss id: phase 1 and phase 2 skills + ult ──
        boss_ids = await pg.evaluate("BD.bosses.map(b => b.id)")
        # 索爾（第 7 位 Boss）必須出現在訓練場角色清單
        for must in ['lubu', 'thor']:
            if must not in boss_ids:
                failures.append(f"Step 2: boss '{must}' missing from BD.bosses")
        # 7 位 Boss 超過一頁（6 張）→ 選角分頁；索爾在第 2 頁
        thor_card = await pg.evaluate("""(() => {
            const nx = document.querySelector('#sideA .pager button[data-d="1"]');
            if (nx) nx.click();
            const ok = !!document.querySelector('#sideA .card[data-id=thor]');
            const pv = document.querySelector('#sideA .pager button[data-d="-1"]');
            if (pv) pv.click();
            return ok;
        })()""")
        if not thor_card:
            failures.append("Step 2: thor card missing from training select")
        for boss_id in boss_ids:
            await pg.evaluate(f"__BD.startTraining('{boss_id}', {{ mode: 'manual', range: 'mid' }})")
            await pg.wait_for_timeout(200)

            for phase in [1, 2]:
                if phase == 2:
                    await pg.locator('#trainPanel [data-act="phase-2"]').click()
                    await pg.evaluate("__BD.world.speed = 2")
                    p2_ok = False
                    for _ in range(80):
                        await pg.wait_for_timeout(100)
                        p2_ok = await pg.evaluate("(()=>{const b=__BD.world.training.boss; return b.phase === 2 && b.state !== 'transition'})()")
                        if p2_ok:
                            break
                    if not p2_ok:
                        failures.append(f"{boss_id} P2: transition timed out")
                    await pg.evaluate("__BD.world.training.clearStats()")

                skill_ids = await pg.evaluate("""
                    Array.from(document.querySelectorAll('#trainPanel [data-skill]')).map(b => b.dataset.skill)
                """)

                phase_records = []
                for skill_id in skill_ids:
                    # tr.clearStats(); place dummy in skill's range
                    await pg.evaluate(f"""(() => {{
                        const w = __BD.world, tr = w.training, b = tr.boss;
                        if ({phase} === 1) {{
                            tr.reset();
                        }} else {{
                            b.x = tr.bossHome.x;
                            b.y = tr.bossHome.y;
                            b.vx = b.vy = b.kbx = b.kby = 0;
                            b.face = b.wantFace = 0;
                            if (b.inst || b.state !== 'idle') {{
                                b.cancelSkill();
                                b.state = 'idle';
                                b.stateT = 0;
                            }}
                        }}
                        tr.clearStats();
                        const s = '{skill_id}' === 'ult' ? b.ultimate : b.skills.find(x => x.id === '{skill_id}');
                        const r = s.range || [0, 600];
                        const d = Math.max(b.r + tr.dummy.r + 40, Math.min(800, (r[0] + r[1]) / 2));
                        tr.setHome(b.x + d, b.y);
                    }})()""")

                    await pg.evaluate("__BD.world.speed = 4")
                    uses_before = await pg.evaluate(f"__BD.world.bosses[0].stats.uses['{skill_id}'] || 0")

                    await pg.click(f'#trainPanel [data-skill="{skill_id}"]')

                    cast_started = False
                    for _ in range(20):
                        await pg.wait_for_timeout(100)
                        uses_now = await pg.evaluate(f"__BD.world.bosses[0].stats.uses['{skill_id}'] || 0")
                        if uses_now > uses_before:
                            cast_started = True
                            break
                    if not cast_started:
                        failures.append(f"{boss_id} P{phase} {skill_id}: cast never started")

                    await pg.wait_for_timeout(1600)

                    total = await pg.evaluate("__BD.world.training.stats.total")
                    phase_records.append(f"{skill_id} {total}")

                    damaging = await pg.evaluate(f"""(() => {{
                        const w = __BD.world, b = w.training.boss;
                        const s = '{skill_id}' === 'ult' ? b.ultimate : b.skills.find(x => x.id === '{skill_id}');
                        const acts = ({phase} === 2 && s.actions2) ? s.actions2 : s.actions;
                        function isDamagingAction(a) {{
                            if (!a || typeof a !== 'object') return false;
                            if ((typeof a.dmg === 'number' && a.dmg > 0) || (typeof a.dps === 'number' && a.dps > 0) || a.do === 'summon') return true;
                            for (const k of Object.keys(a)) {{
                                if (typeof a[k] === 'object' && isDamagingAction(a[k])) return true;
                            }}
                            return false;
                        }}
                        return (acts || []).some(isDamagingAction);
                    }})()""")

                    miss_key = f"{boss_id}:{skill_id}"
                    if damaging and miss_key not in ALLOW_MISS:
                        if total == 0:
                            failures.append(f"{boss_id} P{phase} {skill_id}: dmg 0")

                print(f"{boss_id} P{phase}: {' · '.join(phase_records)}")

        # ── 3. Reset check (brood & watcher) ──
        await pg.evaluate("__BD.startTraining('brood', { mode: 'manual' })")
        await pg.wait_for_timeout(200)
        for sk in ['spawn', 'acid', 'web', 'miasma']:
            await pg.click(f'#trainPanel [data-skill="{sk}"]')
            await pg.wait_for_timeout(200)
        await pg.wait_for_timeout(1500)

        brood_entities = await pg.evaluate("""(() => {
            const w = __BD.world;
            return (w.minions.length > 0 || w.zones.length > 0 || w.traps.length > 0);
        })()""")
        if not brood_entities:
            failures.append("brood reset check: entities not spawned before reset")

        await pg.locator('#trainPanel [data-act="reset"]').click()
        await pg.wait_for_timeout(100)

        brood_reset = await pg.evaluate("""(() => {
            const w = __BD.world, b = w.bosses[0], d = w.bosses[1];
            return {
                empty: w.minions.length === 0 && w.zones.length === 0 && w.traps.length === 0 &&
                       w.projectiles.length === 0 && w.lobs.length === 0 && w.telegraphs.length === 0,
                hpOk: b.hp === b.maxHp,
                phase1: b.phase === 1,
                statusesOk: b.statuses.length === 0 && d.statuses.length === 0
            };
        })()""")
        if not (brood_reset['empty'] and brood_reset['hpOk'] and brood_reset['phase1'] and brood_reset['statusesOk']):
            failures.append(f"brood reset check failed: {brood_reset}")

        await pg.evaluate("__BD.startTraining('watcher', { mode: 'manual' })")
        await pg.wait_for_timeout(200)
        await pg.click('#trainPanel [data-skill="pack"]')
        pack_spawned = False
        for _ in range(30):
            await pg.wait_for_timeout(100)
            if await pg.evaluate("__BD.world.minions.length > 0"):
                pack_spawned = True
                break
        if not pack_spawned:
            failures.append("watcher reset check: pack minion not spawned")
        await pg.locator('#trainPanel [data-act="reset"]').click()
        await pg.wait_for_timeout(100)
        watcher_reset_minions = await pg.evaluate("__BD.world.minions.length")
        if watcher_reset_minions != 0:
            failures.append(f"watcher reset check: minions after reset {watcher_reset_minions} != 0")

        # ── 4. AI mode ──
        await pg.evaluate("__BD.startTraining('watcher', { mode: 'ai' })")
        await pg.evaluate("__BD.world.speed = 1")
        await pg.wait_for_timeout(1500)

        await pg.keyboard.press('F6')
        await pg.wait_for_timeout(2000)
        await pg.keyboard.press('F6')
        await pg.wait_for_timeout(1000)

        await pg.keyboard.press('t')
        await pg.wait_for_timeout(500)
        await pg.keyboard.press('t')
        await pg.wait_for_timeout(500)

        await pg.keyboard.press('p')
        await pg.wait_for_timeout(200)
        p1 = await pg.evaluate("__BD.world.paused === true")

        await pg.keyboard.press('p')
        await pg.wait_for_timeout(200)
        p2 = await pg.evaluate("__BD.world.paused === false")

        await pg.wait_for_timeout(4100)

        ai_check = await pg.evaluate("""(() => {
            const w = __BD.world, b = w.bosses[0], tr = w.training;
            return {
                isAi: b.controller instanceof BD.AIController,
                skillsOk: b.stats.skills >= 2,
                totalOk: tr.stats.total > 0
            };
        })()""")
        if not ai_check['isAi']:
            failures.append("AI mode: boss.controller is not BD.AIController")
        if not ai_check['skillsOk']:
            failures.append("AI mode: boss.stats.skills < 2")
        if not ai_check['totalOk']:
            failures.append("AI mode: tr.stats.total <= 0")
        if not (p1 and p2):
            failures.append(f"AI mode: pause toggle failed (p1={p1}, p2={p2})")

        # ── 5. Keys & Player mode ──
        await pg.evaluate("__BD.startTraining('magmus', { mode: 'manual' })")
        await pg.wait_for_timeout(200)

        await pg.keyboard.press('F2')
        m1 = await pg.evaluate("__BD.world.training.mode")
        if m1 != 'player':
            failures.append(f"Keys F2 step 1: mode is {m1}, expected 'player'")

        await pg.keyboard.press('F2')
        m2 = await pg.evaluate("__BD.world.training.mode")
        if m2 != 'ai':
            failures.append(f"Keys F2 step 2: mode is {m2}, expected 'ai'")

        await pg.keyboard.press('F2')
        m3 = await pg.evaluate("__BD.world.training.mode")
        if m3 != 'manual':
            failures.append(f"Keys F2 step 3: mode is {m3}, expected 'manual'")

        await pg.keyboard.press('Digit5')
        s5 = await pg.evaluate("__BD.world.speed")
        if abs(s5 - 0.25) > 1e-4:
            failures.append(f"Key 5: speed {s5} != 0.25")

        await pg.keyboard.press('Digit4')
        s4 = await pg.evaluate("__BD.world.speed")
        if abs(s4 - 0.5) > 1e-4:
            failures.append(f"Key 4: speed {s4} != 0.5")

        await pg.keyboard.press('Digit1')
        s1 = await pg.evaluate("__BD.world.speed")
        if abs(s1 - 1.0) > 1e-4:
            failures.append(f"Key 1: speed {s1} != 1.0")

        first_skill_id = await pg.evaluate("__BD.world.bosses[0].skills[0].id")
        uses_before_shift = await pg.evaluate(f"__BD.world.bosses[0].stats.uses['{first_skill_id}'] || 0")
        await pg.keyboard.press('Shift+Digit1')
        shift_ok = False
        for _ in range(10):
            await pg.wait_for_timeout(100)
            uses_now_shift = await pg.evaluate(f"__BD.world.bosses[0].stats.uses['{first_skill_id}'] || 0")
            if uses_now_shift > uses_before_shift:
                shift_ok = True
                break
        if not shift_ok:
            failures.append(f"Shift+Digit1 did not increment uses for {first_skill_id}")

        coords = await pg.evaluate("""(() => {
            const cv = document.querySelector('#game');
            const rect = cv.getBoundingClientRect();
            const R = BD.Render;
            const x = 700, y = 300;
            const px = rect.left + (R.OX + x) * rect.width / R.W;
            const py = rect.top + (R.OY + y) * rect.height / R.H;
            return { px, py };
        })()""")
        await pg.mouse.click(coords['px'], coords['py'])
        await pg.wait_for_timeout(100)
        home_after = await pg.evaluate("({x: __BD.world.training.home.x, y: __BD.world.training.home.y})")
        if abs(home_after['x'] - 700) > 5 or abs(home_after['y'] - 300) > 5:
            failures.append(f"canvas click at (700, 300) failed to set dummy home: got {home_after}")

        # Player mode via button（先重置：上面 Shift+1 施放的重錘三連在沉重節奏下還沒收招，忙碌中不能出招 / 翻滾）
        await pg.locator('#trainPanel [data-act="reset"]').click()
        await pg.locator('#trainPanel [data-act="mode-player"]').click()
        await pg.wait_for_timeout(100)
        skills_before_q = await pg.evaluate("__BD.world.bosses[0].stats.skills")
        for _ in range(5):
            await pg.keyboard.press('q')
            await pg.wait_for_timeout(250)
        skills_after_q = await pg.evaluate("__BD.world.bosses[0].stats.skills")
        if skills_after_q <= skills_before_q:
            failures.append(f"player mode 'q' did not increase boss.stats.skills ({skills_before_q} -> {skills_after_q})")

        await pg.locator('#trainPanel [data-act="reset"]').click()  # 剛才 q 的招式還在收招（忙碌中無法翻滾），重置後再試
        await pg.wait_for_timeout(100)
        dodges_before_sp = await pg.evaluate("__BD.world.bosses[0].stats.dodges")
        for _ in range(16):
            await pg.keyboard.press('Space')
            await pg.wait_for_timeout(250)
            if await pg.evaluate(f"__BD.world.bosses[0].stats.dodges > {dodges_before_sp}"):
                break
        dodges_after_sp = await pg.evaluate("__BD.world.bosses[0].stats.dodges")
        if dodges_after_sp <= dodges_before_sp:
            failures.append(f"player mode Space did not increase boss.stats.dodges ({dodges_before_sp} -> {dodges_after_sp})")

        await pg.locator('#trainPanel [data-act="mode-manual"]').click()
        await pg.wait_for_timeout(100)

        # ── 6. Speed buttons ──
        await pg.locator('#trainPanel [data-act="speed-0.25"]').click()
        await pg.wait_for_timeout(50)
        sp_025 = await pg.evaluate("__BD.world.speed")
        if abs(sp_025 - 0.25) > 1e-4:
            failures.append(f"speed button ×0.25 failed: got {sp_025}")

        await pg.locator('#trainPanel [data-act="speed-1"]').click()
        await pg.wait_for_timeout(50)
        sp_1 = await pg.evaluate("__BD.world.speed")
        if abs(sp_1 - 1.0) > 1e-4:
            failures.append(f"speed button ×1 failed: got {sp_1}")

        # ── 7. Normal duel still works ──
        await pg.keyboard.press('Escape')
        await pg.wait_for_timeout(200)
        await pg.click('#modeDuel')
        await pg.wait_for_timeout(100)
        await pg.evaluate("__BD.start('magmus','witch',{speed:8})")
        await pg.wait_for_timeout(3000)

        duel_res = await pg.evaluate("""(() => {
            const w = __BD.world;
            const panel = document.querySelector('#trainPanel');
            const panelVisible = panel && !panel.classList.contains('hidden') && panel.offsetParent !== null;
            return {
                trainingNull: w.training == null,
                panelNotVisible: !panelVisible
            };
        })()""")
        if not duel_res['trainingNull']:
            failures.append("duel check: w.training is not null")
        if not duel_res['panelNotVisible']:
            failures.append("duel check: #trainPanel is visible")

        # ── 8. Screenshot (only with --shot) ──
        if args.shot:
            await pg.evaluate("""(() => {
                if (BD.vrng && BD.vrng.seed) BD.vrng.seed(4242);
                __BD.startTraining('magmus', { mode: 'manual', range: 'near' });
                __BD.world.speed = 1;
            })()""")
            await pg.wait_for_timeout(200)
            # 假人貼近一點，讓三連的第三擊（砸地）確實命中
            await pg.evaluate("(() => { const tr = __BD.world.training; tr.setHome(tr.boss.x + 225, tr.boss.y + 40); })()")
            await pg.click('#trainPanel [data-skill="combo"]')

            hit3_ok = False
            for _ in range(200):
                await pg.wait_for_timeout(40)
                if await pg.evaluate("(() => { const s = __BD.world.training.stats; return s.hits >= 3 && s.last && s.last.dmg >= 150; })()"):
                    hit3_ok = True
                    break
            if not hit3_ok:
                failures.append("screenshot: combo 第三擊（砸地）未命中")

            await pg.wait_for_timeout(120)

            for _ in range(10):
                if await pg.evaluate("__BD.world.fx.texts.length > 0"):
                    break
                await pg.wait_for_timeout(30)

            await pg.evaluate("__BD.world.speed = 0")  # 定格（暫停會蓋上「暫停」遮罩）
            await pg.wait_for_timeout(100)

            shot_p = pathlib.Path(args.shot)
            shot_p.parent.mkdir(parents=True, exist_ok=True)
            await pg.screenshot(path=str(shot_p))
            stats_info = await pg.evaluate("__BD.world.training.stats")
            print("Screenshot stats:", stats_info)

        bd_errs = await pg.evaluate("__BD.errors")
        if bd_errs:
            errs.extend(bd_errs)
        if errs:
            for e in errs:
                failures.append(f"JS error: {e}")

        await b.close()

    if failures:
        for f in failures:
            print(f"FAIL: {f}")
        print("TRAINING BROWSER FAIL")
        sys.exit(1)
    else:
        print("TRAINING BROWSER PASS")
        sys.exit(0)

if __name__ == '__main__':
    asyncio.run(main())
