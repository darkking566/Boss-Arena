"""Actual local Chrome file://: controlled displays plus an unforced AI match for Rennala, Queen of the Full Moon.
Snapshots of skills are training demonstrations, not proof of an AI decision.
"""
import asyncio, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from chrome import launch_args
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / 'screenshots/rennala'

VIEWS = [
    (1, None, 3.0, '02-body-p1-amber'),
    (1, 'glintstone_volley', 0.58, '03-glintstone-volley'),
    (1, 'spinning_scepter', 0.52, '04-spinning-scepter'),
    (1, 'scholar_books', 0.62, '05-scholar-books'),
    (1, 'gravestone_drop', 0.92, '06-gravestone-drop'),
    (1, 'chandelier_fall', 1.18, '07-chandelier-fall'),
    (1, 'amber_gravity', 0.64, '08-amber-gravity'),
    (1, 'carian_phalanx', 0.98, '09-carian-phalanx'),
    (1, 'shattering_crystal', 0.90, '10-shattering-crystal'),
    (1, 'transition', 1.8, '11-transition-phase2'),
    (2, None, 0.5, '12-body-p2-watermirror'),
    (2, 'summon_wolves_bloodhound', 0.85, '13-summon-wolves-bloodhound'),
    (2, 'summon_troll_dragon', 1.25, '14-summon-troll-dragon'),
    (2, 'comet_azur', 1.18, '15-comet-azur'),
    (2, 'rennalas_full_moon', 0.72, '16-full-moon-orb'),
    (2, 'rennalas_full_moon', 1.28, '17-full-moon-blast'),
    (1, 'ult', 1.46, '18-ult-p1-amber-reincarnation'),
    (2, 'ult', 1.65, '19-ult-p2-spirits-comet'),
    (2, 'ult', 3.10, '20-ult-p2-fullmoon-cataclysm'),
]

async def main():
    sys.stdout.reconfigure(encoding='utf8')
    SHOTS.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_args(), timeout=30000)
        pg = await browser.new_page(viewport={'width': 1600, 'height': 1010})
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        await pg.goto((ROOT / 'index.html').as_uri())
        await pg.wait_for_timeout(400)
        for _ in range(12):
            if await pg.locator('#sideA .card[data-id="rennala"]').count():
                break
            await pg.click('#sideA .pager button[data-d="1"]')
        await pg.click('#sideA .card[data-id="rennala"]')
        await pg.hover('#sideA .card[data-id="rennala"]')
        await pg.screenshot(path=str(SHOTS / '01-select.png'), full_page=True)

        snapshots = []
        for phase, skill, sec, name in VIEWS:
            await pg.evaluate("__BD.startTraining('rennala',{mode:'manual',range:'mid'})")
            res = await pg.evaluate("""([phase, id, sec]) => {
                const w = __BD.world, b = w.training.boss;
                b.phase = phase; b.controller = { update() {} }; b.face = 0; w.intro = 0;
                w.training.setHome(b.x + 280, b.y);
                if (id === 'transition') {
                    b.hp = b.maxHp * 0.5 - 1; b.startTransition();
                    for (let i = 0; i < 2400 && b.stateT < sec; i++) { w.hitstop = w.slowmo = 0; w.step(BD.STEP); }
                } else if (id) {
                    const s = id === 'ult' ? b.ultimate : b.skills.find(x => x.id === id);
                    const raw = BD.bossById.rennala, rs = id === 'ult' ? raw.ultimate : raw.skills.find(x => x.id === id);
                    const last = v => Math.max(...((phase === 2 && v.actions2) || v.actions).map(q => q.at));
                    const k = last(s) / last(rs);
                    b.startSkill(s, { force: true });
                    for (let i = 0; i < 2400 && b.inst && b.inst.t < sec * k; i++) { w.hitstop = w.slowmo = 0; w.step(BD.STEP); }
                } else {
                    for (let i = 0; i < Math.round(sec / BD.STEP); i++) w.step(BD.STEP);
                }
                w.speed = 0;
                return { skill: b.inst && b.inst.skill.id, phase: b.phase, fx: w.fx.parts.length, zones: w.zones.length, projs: w.projectiles.length };
            }""", [phase, skill, sec])
            snapshots.append(dict(view=name, **res))
            await pg.wait_for_timeout(120)
            await pg.screenshot(path=str(SHOTS / f'{name}.png'))

        await pg.evaluate("__BD.start('rennala','godrick',{seed:31,speed:8,pace:'heavy'})")
        match = None
        for _ in range(1500):
            await pg.wait_for_timeout(80)
            match = await pg.evaluate("({done:__BD.screen==='result',time:__BD.world.time,winner:__BD.world.winner&&__BD.world.winner.def.id})")
            if match['done']:
                break
        assert match and match['done'], match
        await pg.screenshot(path=str(SHOTS / '21-result.png'))

        await pg.set_viewport_size({'width': 390, 'height': 844})
        await pg.evaluate("__BD.startTraining('rennala',{mode:'manual',range:'mid'})")
        await pg.wait_for_timeout(150)
        await pg.screenshot(path=str(SHOTS / '22-mobile.png'))

        await pg.set_viewport_size({'width': 1600, 'height': 1010})
        await pg.goto((ROOT / 'docs/research/rennala/gallery.html').as_uri())
        await pg.evaluate("document.querySelectorAll('img').forEach(i=>i.loading='eager')")
        await pg.wait_for_function("[...document.images].every(i=>i.complete&&i.naturalWidth>0)", timeout=90000)
        gallery_count = await pg.locator('.card').count()
        await pg.screenshot(path=str(SHOTS / '23-reference-gallery.png'))

        await pg.goto((ROOT / 'index.html').as_uri())
        effects = await pg.evaluate("""() => {
            const ids = Object.keys(BD.effects).filter(id => id.startsWith('rennala_'));
            for (const el of Object.keys(BD.elements)) {
                for (const id of ids) {
                    const w = new BD.World(BD.bossById.rennala, BD.bossById.dummy, { seed: 3, intro: 0 }), b = w.bosses[0];
                    BD.spawnFx(w, id, b.x, b.y, { src: b, el, angle: 0, radius: 200, len: 400 });
                    for (let i = 0; i < 90; i++) w.fx.update(BD.STEP);
                    for (const key of ['parts','glows','puffs','shocks','streaks']) {
                        for (const x of w.fx[key]) {
                            for (const k of ['x','y','life']) {
                                if (k in x && !Number.isFinite(x[k])) throw Error(id + ': ' + key + '.' + k);
                            }
                        }
                    }
                }
            }
            return { effects: ids.length, elements: Object.keys(BD.elements).length };
        }""")
        assert not errors, errors
        result = dict(
            browser='actual local Chrome file://',
            page_errors=errors,
            match=match,
            gallery_cards=gallery_count,
            effects=effects,
            snapshots=snapshots,
            screenshots=23,
            driver_accepted=False,
        )
        (SHOTS / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf8')
        print(json.dumps(result, ensure_ascii=False))
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
