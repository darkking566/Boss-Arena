'use strict';
// 場景互動：樹被斬倒 / 撞飛 / 輕擊只掉血、滾木傷害敵人、每場重置、水中減速與濺水
const { load } = require('./lib/load');
const { BD } = load();
let passed = 0, failed = 0;
function ok(c, m) { if (c) passed++; else { failed++; console.log('FAIL ' + m); } }
const mk = () => { const w = new BD.World(BD.bossById.magmus, BD.bossById.ronin, { seed: 3 }); w.intro = 0; return w; };
const treeAt = (x, y) => BD.ARENA.pillars.find((p) => p.x === x && p.y === y);
const N = BD.ARENA.trees.length;
// 只留下第 i 棵樹，避免鄰樹干擾判定
const solo = (i) => { const [x, y] = BD.ARENA.trees[i]; BD.ARENA.pillars = BD.ARENA.pillars.filter((p) => p.x === x && p.y === y); return [x, y]; };

{
  const w = mk(), a = w.bosses[0];
  ok(BD.ARENA.pillars.length === N && N >= 20, '開局樹數 = 設定數（森林區有一批樹）');
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
  const w = mk(), a = w.bosses[0], b = w.bosses[1], [tx, ty] = solo(1);
  BD.hitProps(w, a, { kind: 'circle', x: tx - 60, y: ty, r: 90 }, { dmg: 100, kb: 400, fx: 'slam' });
  const log = w.projectiles.find((p) => p.kind === 'log');
  ok(!treeAt(tx, ty) && log && log.vx > 0 && log.owner === a, '重擊把樹撞飛成沿衝擊方向飛行的滾木');
  b.x = tx + 200; b.y = ty; const hp = b.hp;
  for (let i = 0; i < 60 && b.hp === hp; i++) BD.updateProjectiles(w, 1 / 60);
  ok(b.hp < hp, '滾木命中敵方 Boss 造成傷害');
  // 持續傷害、非 Boss 來源不動場景
  const w2 = mk(), [ux, uy] = solo(2), n = BD.ARENA.pillars.length;
  BD.hitProps(w2, w2.bosses[0], { kind: 'circle', x: ux, y: uy, r: 90 }, { dmg: 100, kb: 400, dot: true });
  BD.hitProps(w2, { isBoss: false }, { kind: 'circle', x: ux, y: uy, r: 90 }, { dmg: 100, kb: 400 });
  ok(BD.ARENA.pillars.length === n, '持續傷害與召喚物不影響樹');
}

{
  const w = mk();
  ok(BD.ARENA.pillars.length === N, '新的一場重置回完整樹木');
  ok(w.bosses[0].x > 1700 && w.bosses[1].x < 2500 && BD.biomeAt(w.bosses[0].x).id === 'desert', 'Boss 出生在中央沙漠');
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
  const w = mk(), a = w.bosses[0], d = BD.ARENA.biomes.find((b) => b.id === 'desert'), cx = (d.x0 + d.x1) / 2;
  const n0 = w.fx.parts.length;
  BD.hitProps(w, a, { kind: 'circle', x: cx, y: 900, r: 60 }, { dmg: 80, kb: 300, fx: 'slam' });
  ok(w.fx.parts.length > n0, '沙漠命中揚起沙塵');
  const n1 = w.fx.parts.length;
  BD.ARENA.pillars = [];
  BD.hitProps(w, a, { kind: 'circle', x: 1000, y: 900, r: 60 }, { dmg: 80, kb: 100 });
  ok(w.fx.parts.length === n1 && w.fx.puffs.length > 0 && w.fx.puffs.every((p) => p.tint === 'sand'), '非沙漠不揚沙塵');
  ok(w.fx.puffs.every((p) => p.max >= 2.4), '沙塵團存在 2.4 秒以上');
}

{
  // 雪地：減速、踩出腳印、招式炸開雪霧；麥田：被削飛 / 炸開 / 踩倒，已摧毀的格子不重複
  const w = mk(), a = w.bosses[0], b = w.bosses[1];
  a.x = 400; a.y = 900;
  const inSnow = a.speed(); a.x = 2000;
  ok(inSnow < a.speed() && BD.biomeAt(400).id === 'snow', '雪地移動速度較慢');
  a.x = 400; a.vx = 200; a.vy = 0; a.kbx = 0; a.kby = 0;
  for (let i = 0; i < 100; i++) { BD.updateTerrain(w, 1 / 60); a.x += 200 / 60; }
  ok(w.fx.prints.length >= 2 && w.fx.prints[0].kind === 'snow', '雪地行走留下腳印');
  const n0 = w.fx.puffs.length;
  BD.hitProps(w, a, { kind: 'circle', x: 600, y: 900, r: 80 }, { dmg: 90, kb: 300, fx: 'slam' });
  ok(w.fx.puffs.length > n0 && w.fx.puffs.some((p) => p.tint === 'snow'), '雪地命中炸開雪霧');

  const cut = (shape, p) => BD.hitProps(w, a, shape, Object.assign({ dmg: 60, kb: 100, fx: 'slash' }, p));
  cut({ kind: 'rect', x: 2700, y: 900, ang: 0, len: 300, w: 80 });
  const cutN = Object.keys(w.fx.field).length, st = w.fx.stalks.length;
  ok(cutN >= 8 && st > cutN * 4 && w.fx.gusts.length === 1, `斬擊削飛麥叢（${cutN} 格、${st} 根麥稈）`);
  cut({ kind: 'rect', x: 2700, y: 900, ang: 0, len: 300, w: 80 });
  ok(Object.keys(w.fx.field).length === cutN && w.fx.stalks.length === st, '已摧毀的麥叢不重複');
  cut({ kind: 'circle', x: 3000, y: 500, r: 120 }, { kb: 400, fx: 'slam' });
  ok(Object.keys(w.fx.field).length > cutN + 10, '重擊炸開一整片麥叢');
  b.x = 3100; b.y = 1300; b.vx = 150; b.vy = 0; b.kbx = 0; b.kby = 0;
  const f0 = Object.keys(w.fx.field).length;
  BD.updateTerrain(w, 1 / 60);
  ok(Object.keys(w.fx.field).length > f0, '走過麥田踩倒腳下的麥子');
  w.fx.stalks.length = 0; for (let i = 0; i < 60; i++) w.fx.update(1 / 60);
  ok(w.fx.field && w.fx.gusts.length === 0, '風圈會消散');
}

{
  // 戰鬥痕跡：依特效分類自動留痕、水面不留、有上限、砍樹留樹墩與落葉
  const w = mk(), kinds = () => w.fx.scars.map((s) => s.k);
  BD.spawnFx(w, 'slash', 1400, 900, { angle: 0, radius: 100 });
  ok(kinds().includes('gash'), '斬擊在地上留下劍痕');
  BD.spawnFx(w, 'slam', 1500, 900, { radius: 100, el: 'fire' });
  ok(kinds().includes('pit') && kinds().includes('blot'), '火系砸地留下坑洞與焦痕');
  const n = w.fx.scars.length, p = BD.ARENA.ponds[0];
  BD.spawnFx(w, 'slam', p.x, p.y, { radius: 100 });
  ok(w.fx.scars.length === n, '水面不留痕跡');
  BD.spawnFx(w, 'treecut', 300, 300, { angle: 0, r: 32 });
  ok(kinds().includes('stump') && kinds().includes('litter'), '砍樹留下樹墩與落葉');
  const w2 = mk(), n2 = () => w2.fx.scars.length;
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
  ok(w.fx.scars.length <= 260, '痕跡數量有上限');
  const before = w.fx.scars[0].age; w.fx.update(1);
  ok(w.fx.scars[0].age === before + 1, '痕跡累計 age（餘燼冷卻用）且不會自行消失');
}

console.log(failed ? `PROPS TEST FAIL (${failed})` : `PROPS TEST PASS (${passed})`);
process.exit(failed ? 1 : 0);
