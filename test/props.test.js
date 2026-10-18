'use strict';
// 場景互動：樹被斬倒 / 撞飛 / 輕擊只掉血、滾木傷害敵人、每場重置、水中減速與濺水
const { load } = require('./lib/load');
const { BD } = load();
let passed = 0, failed = 0;
function ok(c, m) { if (c) passed++; else { failed++; console.log('FAIL ' + m); } }
const mk = () => { const w = new BD.World(BD.bossById.magmus, BD.bossById.ronin, { seed: 3 }); w.intro = 0; return w; };
const treeAt = (x, y) => BD.ARENA.pillars.find((p) => p.x === x && p.y === y);
const N = BD.ARENA.trees.length;

{
  const w = mk(), a = w.bosses[0], [tx, ty] = BD.ARENA.trees[0];
  ok(BD.ARENA.pillars.length === N, '開局樹數 = 設定數');
  // 輕擊：只掉血，樹還在
  BD.hitProps(w, a, { kind: 'circle', x: tx, y: ty, r: 50 }, { dmg: 20, kb: 50 });
  ok(treeAt(tx, ty) && treeAt(tx, ty).hp < treeAt(tx, ty).max, '輕擊只掉血');
  // 斬擊：樹被砍倒，產生兩半樹塊與樹墩
  BD.hitProps(w, a, { kind: 'rect', x: tx - 80, y: ty, ang: 0, len: 200, w: 60 }, { dmg: 60, kb: 100, fx: 'slash' });
  ok(!treeAt(tx, ty) && BD.ARENA.pillars.length === N - 1, '斬擊砍倒樹');
  ok(w.fx.chunks.length === 2 && w.projectiles.length === 0, '砍倒 → 兩半樹塊、不產生滾木');
}

{
  const w = mk(), a = w.bosses[0], b = w.bosses[1], [tx, ty] = BD.ARENA.trees[1];
  BD.hitProps(w, a, { kind: 'circle', x: tx - 60, y: ty, r: 90 }, { dmg: 100, kb: 400, fx: 'slam' });
  const log = w.projectiles.find((p) => p.kind === 'log');
  ok(!treeAt(tx, ty) && log && log.vx > 0 && log.owner === a, '重擊把樹撞飛成沿衝擊方向飛行的滾木');
  b.x = tx + 200; b.y = ty; const hp = b.hp;
  for (let i = 0; i < 60 && b.hp === hp; i++) BD.updateProjectiles(w, 1 / 60);
  ok(b.hp < hp, '滾木命中敵方 Boss 造成傷害');
  // 持續傷害、非 Boss 來源不動場景
  const n = BD.ARENA.pillars.length;
  BD.hitProps(w, a, { kind: 'circle', x: BD.ARENA.trees[2][0], y: BD.ARENA.trees[2][1], r: 90 }, { dmg: 100, kb: 400, dot: true });
  BD.hitProps(w, { isBoss: false }, { kind: 'circle', x: BD.ARENA.trees[2][0], y: BD.ARENA.trees[2][1], r: 90 }, { dmg: 100, kb: 400 });
  ok(BD.ARENA.pillars.length === n, '持續傷害與召喚物不影響樹');
}

{
  const w = mk();
  ok(BD.ARENA.pillars.length === N, '新的一場重置回完整樹木');
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

console.log(failed ? `PROPS TEST FAIL (${failed})` : `PROPS TEST PASS (${passed})`);
process.exit(failed ? 1 : 0);
