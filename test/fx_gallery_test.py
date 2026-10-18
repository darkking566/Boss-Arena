# 以 headless Chromium 開啟 file:// fx-gallery.html：檢查每格特效都能產生畫面、沒有 JS 錯誤
import argparse, asyncio, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from chrome import launch_args
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'fx-gallery.html').as_uri()


async def main(shot, shot_el='fire'):
    fail = []

    def check(ok, msg):
        print(('ok   ' if ok else 'FAIL ') + msg)
        if not ok:
            fail.append(msg)

    async with async_playwright() as p:
        b = await p.chromium.launch(**launch_args())
        pg = await b.new_page(viewport={'width': 1600, 'height': 1000})
        errors = []
        pg.on('console', lambda m: errors.append(f'{m.type}: {m.text}') if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        await pg.goto(URL)
        await pg.wait_for_selector('.g-cell canvas')
        await pg.wait_for_function('window.__FXG && window.__FXG.ready', timeout=15000)
        await pg.wait_for_timeout(400)

        info = await pg.evaluate('({n: Object.keys(BD.effects).length, els: Object.keys(BD.elements), cells: __FXG.cells.length})')
        check(info['cells'] == info['n'], f'特效格數 {info["cells"]} / 特效 {info["n"]}')
        n = info['n']

        # 捲動整頁，讓每一格都進入畫面並播放
        step = 500
        total = await pg.evaluate('document.documentElement.scrollHeight')
        y = 0
        while y < total:
            await pg.evaluate(f'window.scrollTo(0, {y})')
            await pg.wait_for_timeout(250)
            y += step
        await pg.evaluate('window.scrollTo(0, 0)')
        await pg.wait_for_timeout(200)

        cells = await pg.evaluate('__FXG.cells')
        no_spawn = [c['id'] for c in cells if c['spawns'] < 1]
        no_frame = [c['id'] for c in cells if c['frames'] < 5]
        check(not no_spawn, '每格至少播放一次' + (f'：{no_spawn}' if no_spawn else ''))
        check(not no_frame, '每格至少更新 5 幀' + (f'：{no_frame}' if no_frame else ''))

        # 每個元素都試一輪
        for el in info['els']:
            await pg.evaluate('id => __FXG.setElement(id)', el)
            await pg.wait_for_timeout(600)
        await pg.evaluate('() => __FXG.replayAll()')
        await pg.wait_for_timeout(600)

        fx_errors = await pg.evaluate('__FXG.errors.slice()')
        check(not fx_errors, '特效內部無例外' + (f'：{fx_errors[:3]}' if fx_errors else ''))
        check(not errors, '無 console / page 錯誤' + (f'：{errors[:3]}' if errors else ''))

        # 每一格重播後都要有比地板亮的像素
        await pg.evaluate('window.scrollTo(0, 0)')
        await pg.wait_for_timeout(100)
        total = await pg.evaluate('document.documentElement.scrollHeight')
        y = 0
        dim = []
        seen = set()
        while y < total:
            await pg.evaluate(f'window.scrollTo(0, {y})')
            await pg.wait_for_timeout(120)
            await pg.evaluate('() => __FXG.replayAll()')
            await pg.wait_for_timeout(160)
            res = await pg.evaluate("""() => Array.from(document.querySelectorAll('.g-cell')).filter(c => c.style.display !== 'none' && c.getBoundingClientRect().top < innerHeight && c.getBoundingClientRect().bottom > 0).map(c => {
                const cv = c.querySelector('canvas'), g = cv.getContext('2d');
                const d = g.getImageData(0, 0, cv.width, cv.height).data;
                let mx = 0; for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; if (v > mx) mx = v; }
                return { id: c.querySelector('.id').textContent, max: mx };
            })""")
            for r in res:
                if r['max'] <= 70:
                    dim.append((r['id'], round(r['max'])))
                seen.add(r['id'])
            y += 500
        check(not dim, '每格都有明亮像素' + (f'：{dim[:5]}' if dim else ''))
        check(len(seen) == info['cells'], f'檢查到的格子 {len(seen)} / {info["cells"]}')

        if shot:
            await pg.evaluate('window.scrollTo(0, 0)')
            await pg.evaluate('id => __FXG.setElement(id)', shot_el)
            await pg.evaluate('() => __FXG.replayAll()')
            await pg.wait_for_timeout(260)   # 讓各格停在爆發最亮的那幾幀
            await pg.screenshot(path=str(shot))
            print('screenshot:', shot)

        await b.close()

    if fail:
        print('FX GALLERY FAIL:', len(fail), '項')
        return 1
    print(f'FX GALLERY PASS: {n} 特效 × {len(info["els"])} 元素，無 JS 錯誤')
    return 0


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--shot', default=None)
    ap.add_argument('--el', default='fire', help='截圖時使用的元素')
    args = ap.parse_args()
    sys.exit(asyncio.run(main(args.shot, args.el)))
