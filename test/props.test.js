'use strict';
// 場景互動：樹被斬倒 / 撞飛 / 輕擊只掉血、滾木傷害敵人、每場重置、水中減速與濺水
const { load } = require('./lib/load');
const { BD } = load();
let passed = 0, failed = 0;
function ok(c, m) { if (c) passed++; else { failed++; console.log('FAIL ' + m); } }
const mk = (map) => { const w = new BD.World(BD.bossById.magmus, BD.bossById.ronin, { seed: 3, map }); w.intro = 0; return w; };
const treeAt = (x, y) => BD.ARENA.pillars.find((p) => p.x === x && p.y === y);
// 只留下第 i 棵樹，避免鄰樹干擾判定
const solo = (i) => { const [x, y] = BD.ARENA.trees[i]; BD.ARENA.pillars = BD.ARENA.pillars.filter((p) => p.x === x && p.y === y); return [x, y]; };

{
  const w = mk('forest'), a = w.bosses[0], N = BD.ARENA.trees.length;
  ok(BD.ARENA.pillars.length === N && N >= 25, `開局樹數 = 設定數（森林地圖有 ${N} 棵樹）`);
  ok(BD.ARENA.trees.every((t) => Math.hypot(t[0] - a.x, t[1] - a.y) > 200 && Math.hypot(t[0] - w.bosses[1].x, t[1] - w.bosses[1].y) > 200), '樹不擋在出生點上');
  const [tx, ty] = solo(0);
  // 輕擊：只掉血，樹還在
  BD.hitProps(w, a, { kind: 'circle', x: tx, y: ty, r: 50 }, { dmg: 20, kb: 50 });
  ok(treeAt(tx, ty) && treeAt(tx, ty).hp < treeAt(tx, ty).max, '輕擊只掉血');
  // 斬擊：樹被砍倒，產生兩半樹塊與樹墩
  BD.hitProps(w, a, { kind: 'rect', x: tx - 80, y: ty, ang: 0, len: 200, w: 60 }, { dmg: 60, kb: 100, fx: 'slash' });
  ok(!treeAt(tx, ty) && BD.ARENA.pillars.length === 0, '斬擊砍倒樹');
  ok(w.fx.chunks.length === 2 && w.projectiles.length === 0, '砍倒 → 兩半樹塊、不產生滾木');
}

{
  const w = mk('forest'), a = w.bosses[0], b = w.bosses[1], [tx, ty] = solo(1);
  BD.hitProps(w, a, { kind: 'circle', x: tx - 60, y: ty, r: 90 }, { dmg: 100, kb: 400, fx: 'slam' });
  const log = w.projectiles.find((p) => p.kind === 'log');
  ok(!treeAt(tx, ty) && log && log.vx > 0 && log.owner === a, '重擊把樹撞飛成沿衝擊方向飛行的滾木');
  b.x = tx + 200; b.y = ty; const hp = b.hp;
  for (let i = 0; i < 60 && b.hp === hp; i++) BD.updateProjectiles(w, 1 / 60);
  ok(b.hp < hp, '滾木命中敵方 Boss 造成傷害');
  // 持續傷害、非 Boss 來源不動場景
  const w2 = mk('forest'), [ux, uy] = solo(2), n = BD.ARENA.pillars.length;
  BD.hitProps(w2, w2.bosses[0], { kind: 'circle', x: ux, y: uy, r: 90 }, { dmg: 100, kb: 400, dot: true });
  BD.hitProps(w2, { isBoss: false }, { kind: 'circle', x: ux, y: uy, r: 90 }, { dmg: 100, kb: 400 });
  ok(BD.ARENA.pillars.length === n, '持續傷害與召喚物不影響樹');
}

{
  const N = mk('forest') && BD.ARENA.trees.length;
  solo(0); mk('forest');
  ok(BD.ARENA.pillars.length === N, '新的一場重置回完整樹木');
  const d = mk();
  ok(BD.ARENA.map === 'desert' && BD.ARENA.pillars.length === 0 && BD.ARENA.ponds.length === 0 && BD.biomeAt(d.bosses[0].x).id === 'desert', '預設地圖是沙漠：沒有樹也沒有水池');
  ok(BD.MAPS.length === 8 && BD.MAPS.every((m) => mk(m.id) && BD.ARENA.map === m.id && BD.ARENA.biomes.length === 1 && BD.ARENA.biomes[0].id === m.biome), '八張地圖各自一個生態區，依選擇切換');
  ok(mk('nope') && BD.ARENA.map === BD.DEFAULT_MAP, '未知地圖退回預設地圖');
  const w = mk('swamp');
  ok(BD.ARENA.ponds.length >= 4 && BD.ARENA.ponds.every((q) => Math.hypot(q.x - w.bosses[0].x, q.y - w.bosses[0].y) > q.rx + 80 && Math.hypot(q.x - w.bosses[1].x, q.y - w.bosses[1].y) > q.rx + 80), '沼澤地圖有多個水池，出生點不在水中');
  const p = BD.ARENA.ponds[0], b = w.bosses[0];
  b.x = p.x; b.y = p.y;
  const inW = b.speed(); b.x = 10; b.y = 10;
  ok(inW < b.speed() && BD.pondAt(p.x, p.y) && !BD.pondAt(10, 10), '水中移動速度較慢');
  b.x = p.x; b.y = p.y; b.vx = 200; w.fx.parts.length = 0; b.wetT = 0;
  BD.updateTerrain(w, 1 / 60);
  ok(w.fx.rings.length > 0, '水中移動濺起漣漪');
  w.fx.rings.length = 0;
  BD.hitProps(w, b, { kind: 'circle', x: p.x, y: p.y, r: 60 }, { dmg: 80, kb: 100 });
  ok(w.fx.rings.length > 0, '招式命中水面濺起水花');
}

{
  // 沙漠：招式命中揚沙塵；沙塵只在沙漠區
  const w = mk('desert'), a = w.bosses[0], cx = BD.ARENA.w / 2;
  const n0 = w.fx.parts.length;
  BD.hitProps(w, a, { kind: 'circle', x: cx, y: 900, r: 60 }, { dmg: 80, kb: 300, fx: 'slam' });
  ok(w.fx.parts.length > n0, '沙漠命中揚起沙塵');
  const n1 = w.fx.parts.length;
  ok(w.fx.puffs.length > 0 && w.fx.puffs.every((p) => p.tint === 'sand' && p.max >= 2.4), '沙塵團存在 2.4 秒以上');
  const f = mk('forest'); BD.ARENA.pillars = [];
  BD.hitProps(f, f.bosses[0], { kind: 'circle', x: 1000, y: 900, r: 60 }, { dmg: 80, kb: 100 });
  ok(f.fx.puffs.length === 0, '非沙漠不揚沙塵');
}

{
  // 雪地：減速、踩出腳印、招式炸開雪霧；麥田：被削飛 / 炸開 / 踩倒，已摧毀的格子不重複
  const d = mk(), sp0 = d.bosses[0].speed(), w = mk('snow'), a = w.bosses[0], b = w.bosses[1];
  a.x = 400; a.y = 900;
  ok(a.speed() < sp0 && BD.biomeAt(400).id === 'snow', '雪地移動速度較慢');
  a.x = 400; a.vx = 200; a.vy = 0; a.kbx = 0; a.kby = 0;
  for (let i = 0; i < 100; i++) { BD.updateTerrain(w, 1 / 60); a.x += 200 / 60; }
  ok(w.fx.prints.length >= 2 && w.fx.prints[0].kind === 'snow', '雪地行走留下腳印');
  const n0 = w.fx.puffs.length;
  BD.hitProps(w, a, { kind: 'circle', x: 600, y: 900, r: 80 }, { dmg: 90, kb: 300, fx: 'slam' });
  ok(w.fx.puffs.length > n0 && w.fx.puffs.some((p) => p.tint === 'snow'), '雪地命中炸開雪霧');
  const n1 = w.fx.puffs.length;
  BD.projTerrain(w, { kind: 'ice', x: 800, y: 900, vx: 800, vy: 0, r: 40, dmg: 30 }, 1 / 60);
  ok(w.fx.puffs.length > n1, '投射物飛過雪地揚起雪霧');

  const wh = mk('wheat'); const a2 = wh.bosses[0], b2 = wh.bosses[1];
  const cut = (shape, p) => BD.hitProps(wh, a2, shape, Object.assign({ dmg: 60, kb: 100, fx: 'slash' }, p));
  cut({ kind: 'rect', x: 1300, y: 900, ang: 0, len: 300, w: 80 });
  const cutN = Object.keys(wh.fx.field).length, st = wh.fx.stalks.length;
  ok(cutN >= 8 && st > cutN * 4 && wh.fx.gusts.length === 1, `斬擊削飛麥叢（${cutN} 格、${st} 根麥稈）`);
  cut({ kind: 'rect', x: 1300, y: 900, ang: 0, len: 300, w: 80 });
  ok(Object.keys(wh.fx.field).length === cutN && wh.fx.stalks.length === st, '已摧毀的麥叢不重複');
  cut({ kind: 'circle', x: 1900, y: 500, r: 120 }, { kb: 400, fx: 'slam' });
  ok(Object.keys(wh.fx.field).length > cutN + 10, '重擊炸開一整片麥叢');
  const g0 = Object.keys(wh.fx.field).length;
  BD.projCutsWheat(wh, { kind: 'airslash', x: 1000, y: 1400, vx: 950, vy: 0, r: 95, dmg: 100 });
  ok(Object.keys(wh.fx.field).length > g0 + 8, '飛斬沿路徑削飛麥叢');
  b2.x = 2100; b2.y = 1300; b2.vx = 150; b2.vy = 0; b2.kbx = 0; b2.kby = 0;
  const f0 = Object.keys(wh.fx.field).length;
  BD.updateTerrain(wh, 1 / 60);
  ok(Object.keys(wh.fx.field).length > f0, '走過麥田踩倒腳下的麥子');
  wh.fx.stalks.length = 0; for (let i = 0; i < 60; i++) wh.fx.update(1 / 60);
  ok(wh.fx.gusts.length === 0, '風圈會消散');
  ok(BD.WHEAT.x1 > 0 && (mk('forest') && BD.WHEAT.x1 === 0), '非麥田地圖沒有麥叢');
}

{
  // 淺水湖泊：整張圖是水面；每個招式濺起大片水花，並依元素與水面起反應
  const dsp = mk().bosses[0].speed(), w = mk('lake'), a = w.bosses[0], b = w.bosses[1];
  ok(BD.inWater(a.x, a.y) && BD.inWater(10, 10) && a.speed() < dsp, '湖泊整張圖都是水面、移動略慢');
  const hit = (el, extra) => { const x = mk('lake'); BD.hitProps(x, x.bosses[0], { kind: 'circle', x: 1500, y: 900, r: 100 }, Object.assign({ dmg: 130, kb: 400, fx: { id: 'slam', el } }, extra)); return x; };
  const tints = (x) => new Set(x.fx.puffs.map((q) => q.tint));
  let x = hit('physical');
  ok(x.fx.rings.length >= 3 && x.fx.stalks.length > 60 && tints(x).has('water') && x.fx.scars.length === 0, '物理攻擊濺起大片水花（漣漪、水珠、水霧），不留地面痕跡');
  x = hit('fire');
  ok(tints(x).has('steam') && x.fx.puffs.filter((q) => q.tint === 'steam').length >= 8 && x.fx.scars.some((s) => s.k === 'rock'), '重型火焰：水蒸氣翻騰並把熔岩凝固成岩石');
  x = hit('fire', { dmg: 30, kb: 100 });
  ok(tints(x).has('steam') && !x.fx.scars.some((s) => s.k === 'rock'), '輕型火焰只有水蒸氣、不成岩');
  x = hit('ice');
  ok(x.fx.scars.some((s) => s.k === 'ice') && tints(x).has('snow'), '冰霜凍結水面');
  x = hit('lightning');
  ok(x.fx.beams.length >= 12, `雷電沿水面竄出電弧（${x.fx.beams.length} 道）`);
  for (const [el, tint] of [['poison', 'toxic'], ['blood', 'blood'], ['shadow', 'ink']]) { x = hit(el); ok(tints(x).has(tint) && x.fx.scars.some((s) => s.k === 'blot' && s.al < 1), `${el} 在水中暈開`); }
  x = hit('holy'); ok(x.fx.rings.length >= 5 && x.fx.glows.length > 0, '聖光盪出金色光圈');
  x = hit('arcane'); ok(x.fx.rings.length >= 5, '秘法泛起紫色漣漪');
  BD.spawnFx(w, 'slam', 1500, 900, { radius: 100 });
  ok(w.fx.scars.length === 0, '湖面不留地面的坑洞 / 裂痕');
  b.x = 800; b.y = 900; b.vx = 0; b.vy = 0; b.kbx = 0; b.kby = 0; b.idleT = 0; w.fx.rings.length = 0;
  BD.updateTerrain(w, 1 / 60);
  ok(w.fx.rings.length > 0, '站在水中也緩緩盪出漣漪');
  w.fx.rings.length = 0; b.vx = 200; b.wetT = 0; BD.updateTerrain(w, 1 / 60);
  ok(w.fx.rings.length > 0 && w.fx.parts.length + w.fx.stalks.length > 0, '涉水前進濺起水花');
}

{
  // 戰鬥痕跡：依特效分類自動留痕、水面不留、有上限、砍樹留樹墩與落葉
  const w = mk('swamp'), kinds = () => w.fx.scars.map((s) => s.k);
  BD.spawnFx(w, 'slash', 1400, 900, { angle: 0, radius: 100 });
  ok(kinds().includes('gash'), '斬擊在地上留下劍痕');
  BD.spawnFx(w, 'slam', 1500, 900, { radius: 100, el: 'fire' });
  ok(kinds().includes('pit') && kinds().includes('blot'), '火系砸地留下坑洞與焦痕');
  const n = w.fx.scars.length, p = BD.ARENA.ponds[0];
  BD.spawnFx(w, 'slam', p.x, p.y, { radius: 100 });
  ok(w.fx.scars.length === n, '水面不留痕跡');
  BD.spawnFx(w, 'treecut', 300, 300, { angle: 0, r: 32 });
  ok(kinds().includes('stump') && kinds().includes('litter'), '砍樹留下樹墩與落葉');
  const w2 = mk('desert'), n2 = () => w2.fx.scars.length;
  BD.spawnFx(w2, 'skyrend', 1000, 900, { angle: 0, len: 1200, width: 150, el: 'blood' });
  ok(w2.fx.scars.some((s) => s.k === 'gash') && w2.fx.scars.some((s) => s.k === 'blot'), '天喰沿線留下深溝與焦痕');
  const n3 = n2(); BD.spawnFx(w2, 'threadcut', 1000, 1000, { angle: 0, len: 400, hold: 0.5 });
  ok(n2() === n3, '懸斬在裂開前不留痕');
  w2.fx.update(0.6);
  ok(n2() === n3 + 1, '懸斬裂開時才留下刀痕');
  const n4 = n2(); BD.spawnFx(w2, 'hoofcharge', 1000, 800, { angle: 0, len: 300 });
  ok(n2() === n4 + 2, '鐵騎衝鋒沿路留下兩道蹄痕');
  const n5 = n2(); BD.spawnFx(w2, 'domain', 1500, 900, { pts: [1400, 800, 1500, 850, 1600, 900] });
  ok(n2() === n5 + 3, '領域爆發在各點留下痕跡');
  for (let i = 0; i < 400; i++) BD.spawnFx(w, 'slam', 1300 + (i % 50), 700, { radius: 60 });
  ok(w.fx.scars.length <= 420, '痕跡數量有上限');
  const g0 = w2.fx.stalks.length, g1 = n2(); BD.spawnFx(w2, 'gore', 1200, 900, { victim: { r: 30, def: { hurt: 'magma' } }, dmg: 120, angle: 0 });
  ok(w2.fx.stalks.length > g0 + 8, '受擊依材質噴出液滴');
  for (const hurt of Object.keys(BD.HURT)) BD.spawnFx(w2, 'gore', 1200, 900, { victim: { r: 30, def: { hurt } }, dmg: 200, big: true, lethal: true, omni: true });
  ok(true, '所有材質都能正常產生受擊特效');
  for (let i = 0; i < 20; i++) w2.fx.update(1 / 60);
  ok(n2() > g1, '受擊在地上留下落地痕跡');
  const before = w.fx.scars[0].age; w.fx.update(1);
  ok(w.fx.scars[0].age === before + 1, '痕跡累計 age（餘燼冷卻用）且不會自行消失');
}

console.log(failed ? `PROPS TEST FAIL (${failed})` : `PROPS TEST PASS (${passed})`);
process.exit(failed ? 1 : 0);
