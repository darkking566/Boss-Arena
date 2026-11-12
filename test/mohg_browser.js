// 真實 Chromium（file://）：選角卡、訓練場逐招定格、轉階段、不干預的 AI 對戰、手機寬度、考據圖鑑、特效 × 元素。
// 用法：node test/mohg_browser.js [畫面名稱…]（只拍指定畫面）；需要 Node 版 playwright（雲端環境已內建）。
'use strict';
const path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), SHOTS = path.join(ROOT, 'screenshots/mohg'), url = f => pathToFileURL(path.join(ROOT, f)).href;
const VIEWS = [ // [階段, 招式（'transition' = 轉階段第幾秒）, 開招後秒數, 檔名]
  [1, null, 0, '02-body'], [1, 'trident_sweep', 1.15, '03-sweep'], [1, 'blood_tax', 0.87, '04-blood-tax'], [1, 'bloodflame_talons', 0.9, '05-talons-hang'],
  [1, 'bloodflame_talons', 1.2, '06-talons-burst'], [1, 'bloodboon_arc', 1.0, '07-bloodboon-arc'], [1, 'bloodboon_arc', 1.9, '07b-bloodflame-pools'], [1, 'bloodboon_shower', 1.4, '08-shower'], [1, 'spear_slam', 1.65, '09-spear-slam'],
  [1, 'transition', 1.1, '10-nihil'], [1, 'transition', 3.0, '11-wings'], [2, null, 0, '12-body-p2'], [2, 'winged_assault', 1.2, '13-winged-flight'],
  [2, 'bloodflame_charge', 1.0, '14-charge'], [2, 'bloodflame_swing', 0.9, '15-swing'], [2, 'plunge', 1.9, '16-plunge'],
  [1, 'ult', 1.0, '17-ult-commune'], [1, 'ult', 2.4, '18-ult-rain'], [2, 'ult', 2.3, '19-ult2-nihil'], [2, 'ult', 4.8, '20-ult2-end'],
];
const ONLY = process.argv.slice(2);
(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch(), pg = await browser.newPage({ viewport: { width: 1600, height: 1010 } }), errors = [];
  pg.on('pageerror', e => errors.push(String(e)));
  await pg.goto(url('index.html')); await pg.waitForTimeout(400);
  for (let i = 0; i < 12 && !(await pg.locator('#sideA .card[data-id="mohg"]').count()); i++) await pg.click('#sideA .pager button[data-d="1"]');
  await pg.click('#sideA .card[data-id="mohg"]'); await pg.hover('#sideA .card[data-id="mohg"]');
  if (!ONLY.length) await pg.screenshot({ path: path.join(SHOTS, '01-select.png'), fullPage: true });
  for (const [phase, skill, sec, name] of VIEWS) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    await pg.evaluate("__BD.startTraining('mohg',{mode:'manual',range:'mid'})");
    await pg.evaluate(([phase, id, sec]) => {
      const w = __BD.world, b = w.training.boss; b.phase = phase; b.controller = { update() {} }; b.face = 0; w.intro = 0; w.training.setHome(b.x + 380, b.y);
      if (id === 'transition') { b.hp = b.maxHp * 0.5 - 1; b.startTransition(); for (let i = 0; i < 2400 && b.stateT < sec; i++) { w.hitstop = w.slowmo = 0; w.step(BD.STEP); } }
      else if (id) { const s = id === 'ult' ? b.ultimate : b.skills.find(x => x.id === id), raw = BD.bossById.mohg, rs = id === 'ult' ? raw.ultimate : raw.skills.find(x => x.id === id);
        const last = v => Math.max(...((phase === 2 && v.actions2) || v.actions).map(q => q.at)), k = last(s) / last(rs); // 訓練場是沉重節奏：秒數依時間軸實際拉長比例換算
        b.startSkill(s, { force: true }); for (let i = 0; i < 2400 && b.inst && b.inst.t < sec * k; i++) { w.hitstop = w.slowmo = 0; w.step(BD.STEP); } }
      else for (let i = 0; i < 60; i++) w.step(BD.STEP);
      w.speed = 0;
    }, [phase, skill, sec]);
    await pg.waitForTimeout(120); await pg.screenshot({ path: path.join(SHOTS, name + '.png') });
  }
  let result = null, extra = {};
  if (!ONLY.length) {
    await pg.evaluate("__BD.start('mohg','godrick',{seed:31,speed:8,pace:'heavy'})");
    for (let i = 0; i < 1500; i++) { await pg.waitForTimeout(80); result = await pg.evaluate("({done:__BD.screen==='result',time:__BD.world.time,winner:__BD.world.winner&&__BD.world.winner.def.id})"); if (result.done) break; }
    if (!result.done) throw new Error('對戰沒有結束 ' + JSON.stringify(result));
    await pg.screenshot({ path: path.join(SHOTS, '21-result.png') });
    await pg.setViewportSize({ width: 390, height: 844 }); await pg.evaluate("__BD.startTraining('mohg',{mode:'manual',range:'mid'})"); await pg.waitForTimeout(150); await pg.screenshot({ path: path.join(SHOTS, '22-mobile.png') });
    await pg.setViewportSize({ width: 1600, height: 1010 }); await pg.goto(url('docs/research/mohg/gallery.html'));
    await pg.evaluate("document.querySelectorAll('img').forEach(i=>i.loading='eager')");
    await pg.waitForFunction("[...document.images].every(i=>i.complete&&i.naturalWidth>0)", null, { timeout: 90000 });
    extra.gallery = await pg.locator('figure').count(); await pg.screenshot({ path: path.join(SHOTS, '23-reference-gallery.png') });
    await pg.goto(url('index.html'));
    extra.effects = await pg.evaluate(() => {
      const ids = Object.keys(BD.effects).filter(id => id.startsWith('mohg'));
      for (const el of Object.keys(BD.elements)) for (const id of ids) { const w = new BD.World(BD.bossById.mohg, BD.bossById.dummy, { seed: 3, intro: 0 }), b = w.bosses[0]; BD.spawnFx(w, id, b.x, b.y, { src: b, el, angle: 0, radius: 200, len: 400 }); for (let i = 0; i < 90; i++) w.fx.update(BD.STEP); }
      return { effects: ids.length, elements: Object.keys(BD.elements).length };
    });
  }
  await browser.close();
  console.log(JSON.stringify({ browser: 'Chromium file://', errors, match: result, ...extra }));
  if (errors.length) process.exit(1);
})();
