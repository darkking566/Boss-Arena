# 沉重模式截圖與短片：先在頁面內無頭跑同一種子的對戰找到「重擊倒地」的時間點，
# 再以相同種子重開、暫停自動推進，逐步推進並逐幀截圖（決定性：AI 只用 w.rng，繪圖只用 BD.vrng）。
# 用法：python3 test/shot_heavy.py [a] [b] [seed]  → screenshots/12_heavy_windup.png、12_heavy_knockdown.png、heavy_clip.mp4
import asyncio, pathlib, sys, subprocess, shutil, tempfile
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from chrome import launch_args
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
A = sys.argv[1] if len(sys.argv) > 1 else 'magmus'
B = sys.argv[2] if len(sys.argv) > 2 else 'watcher'
SEED = int(sys.argv[3]) if len(sys.argv) > 3 else 4
PRE, POST, SPF = 180, 150, 2  # 倒地前 / 後各幾個模擬步，每幀推進 SPF 步（60 步/秒 → 30 fps 即時速度）

FIND = """([a, b, seed]) => {
  const w = new BD.World(BD.bossById[a], BD.bossById[b], { seed, pace: 'heavy' });
  let n = 0, kd0 = 0, out = [];
  while (!w.over && n < 60 * 400) {
    w.step(BD.STEP); n++;
    const kd = (w.bosses[0].stats.knockdowns || 0) + (w.bosses[1].stats.knockdowns || 0);
    if (kd > kd0) { kd0 = kd; out.push(n); if (out.length >= 6) break; }
  }
  return out;
}"""

async def main():
    shots = ROOT / 'screenshots'; tmp = pathlib.Path(tempfile.mkdtemp(prefix='heavyclip_'))
    async with async_playwright() as p:
        br = await p.chromium.launch(**launch_args())
        pg = await br.new_page(viewport={'width': 1600, 'height': 1010})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((ROOT / 'index.html').as_uri()); await pg.wait_for_timeout(500)
        kds = await pg.evaluate(FIND, [A, B, SEED])
        print('knockdown steps:', kds)
        # 選一個不太早的倒地（避開開場）
        target = next((k for k in kds if k > 60 * 12), kds[0])
        start = max(1, target - PRE)
        await pg.evaluate("""([a, b, seed, start]) => {
          const w = __BD.start(a, b, { seed, pace: 'heavy' }); w.tick = () => {}; // 停用自動推進（不顯示暫停畫面）
          for (let i = 0; i < start; i++) w.step(BD.STEP);
        }""", [A, B, SEED, start])
        frames = (PRE + POST) // SPF
        kd_idx = None; wind_idx = None; cxs = []; cys = []
        for f in range(frames):
            info = await pg.evaluate("""(spf) => {
              const w = __BD.world;
              for (let i = 0; i < spf; i++) { w.fx.realUpdate(BD.STEP); w.step(BD.STEP); }
              const [x, y] = w.bosses;
              return { cx: (x.x + y.x) / 2, cy: (x.y + y.y) / 2, kd: x.state === 'knockdown' || y.state === 'knockdown',
                wind: (x.isWindingUp() || y.isWindingUp()) && w.telegraphs.some((t) => !t.soft) };
            }""", SPF)
            await pg.evaluate("new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
            await pg.screenshot(path=str(tmp / f'f{f:04d}.png'))
            cxs.append(info['cx']); cys.append(info['cy'])
            if info['wind'] and kd_idx is None: wind_idx = f      # 倒地前最後一個「蓄力 + 預警」幀
            if info['kd'] and kd_idx is None: kd_idx = f
        files = sorted(tmp.glob('f*.png'))
        if kd_idx is not None: shutil.copy(files[min(len(files) - 1, kd_idx + 5)], shots / '12_heavy_knockdown.png')  # 倒地後 5 幀：塵土 / 字樣已出現
        if wind_idx is not None: shutil.copy(files[max(0, wind_idx - 6)], shots / '12_heavy_windup.png')  # 判定前約 0.2 秒：預警清楚可見
        print('kd frame', kd_idx, 'windup frame', wind_idx)
        print('errors:', errs or 'none')
        await br.close()
    # 依雙方平均位置裁切（戰場座標 + 畫面偏移 R.OX/R.OY = 50/172，畫布 1600x1010），放大到 1280 寬
    W, H = 960, 606
    mx = sum(cxs) / len(cxs) + 50; my = sum(cys) / len(cys) + 172
    x0 = int(min(max(mx - W / 2, 0), 1600 - W)); y0 = int(min(max(my - H / 2, 0), 1010 - H))
    out = shots / 'heavy_clip.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', str(tmp / 'f%04d.png'),
                    '-vf', f'crop={W}:{H}:{x0}:{y0},scale=1280:-2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', str(out)], check=True)
    print('clip:', out, out.stat().st_size // 1024, 'KB; frames dir', tmp)

asyncio.run(main())
