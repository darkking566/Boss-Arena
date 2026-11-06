'use strict';
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const def = BD.bossById.ekzykes, trait = BD.trait('rottingbody');
function make(pace = 'light') {
  const w = new BD.World(def, BD.bossById.dummy, { seed: 71, pace, intro: 0, training: { mode: 'manual', range: 'mid' } });
  w.bosses.forEach(b => { b.controller = { update() {} }; });
  const [b, e] = w.bosses; w.training.setHome(b.x + 150, b.y); return w;
}
function run(w, seconds) { for (let t = 0; t < seconds; t += BD.STEP) { w.hitstop = w.slowmo = 0; w.step(BD.STEP); } }
const hit = (w, n, p = {}) => { const [b, e] = w.bosses; for (let i = 0; i < n; i++) trait.interceptDamage(w, b, e, { dmg: 10, ...p }); };
// Passive: fourth positive direct hit, a visible delay, fixed telegraph location and cooldown.
{
  const w = make(), [b] = w.bosses;
  hit(w, 3); hit(w, 5, { dot: true }); hit(w, 5, { dmg: 0 }); run(w, 0.7);
  assert.strictEqual(w.zones.length, 0);
  hit(w, 1); const origin = { x: b.x, y: b.y }; assert.strictEqual(w.zones.length, 0);
  b.x -= 280; run(w, 0.4); assert.strictEqual(w.zones.length, 0);
  run(w, 0.3); assert.strictEqual(w.zones.length, 1);
  assert.strictEqual(w.zones[0].x, origin.x, '腐霧必須出現在原來的預警位置');
  assert.strictEqual(w.zones[0].y, origin.y);
  hit(w, 20); assert.strictEqual(b._rotPending, null); assert.strictEqual(b._rotHits, 0);
  run(w, 7); hit(w, 4); run(w, 0.7); assert.strictEqual(w.zones.length, 1, '間隔結束後可以再次洩霧');
}
for (const state of ['dead', 'transition', 'hidden']) {
  const w = make(), b = w.bosses[0]; hit(w, 4);
  if (state === 'dead') { b.state = 'dead'; b.alive = false; } else if (state === 'transition') b.startTransition(); else BD.applyStatus(b, 'hidden', { dur: 2 }, w);
  run(w, 0.8); assert.strictEqual(w.zones.length, 0, state + ' 時不新增腐霧');
}
{
  const w = make(), b = w.bosses[0]; hit(w, 4); w.training.reset();
  assert.strictEqual(b._rotPending, null); assert.strictEqual(b._rotCooldown, 0); assert.strictEqual(b._rotHits, 0); run(w, 1); assert.strictEqual(w.zones.length, 0);
}
// Buildup is distinct from green poison, threshold DoT has an owner and a fixed duration.
{
  const w = make(), [b, e] = w.bosses;
  BD.applyStatus(e, 'rotbuildup', { stacks: 60, source: b }, w); const hp = e.hp;
  assert.ok(!BD.hasStatus(e, 'scarletrot')); assert.strictEqual(e.hp, hp);
  BD.tickStatuses(e, 1, w); assert.strictEqual(BD.getStatus(e, 'rotbuildup').stacks, 55);
  BD.applyStatus(e, 'rotbuildup', { stacks: 45, source: b }, w);
  assert.ok(BD.hasStatus(e, 'scarletrot')); assert.ok(!BD.hasStatus(e, 'rotbuildup')); assert.ok(!BD.hasStatus(e, 'poison'));
  assert.strictEqual(BD.getStatus(e, 'scarletrot').source, b);
  BD.tickStatuses(e, 0.5, w); assert.ok(e.hp < hp); const rem = BD.statusRemaining(e, 'scarletrot');
  BD.applyStatus(e, 'rotbuildup', { stacks: 100, source: b }, w); assert.strictEqual(BD.statusRemaining(e, 'scarletrot'), rem, '已發作時不無限刷新');
  for (let i = 0; i < 16; i++) BD.tickStatuses(e, 0.5, w);
  assert.ok(!BD.hasStatus(e, 'scarletrot')); assert.ok(b.stats.dealt > 0);
}
// Fields: delayed arming, foes only, step out to stop further buildup, finite lifetime.
{
  const w = new BD.World([def, BD.bossById.redwolf], [BD.bossById.dummy, BD.bossById.margit], { seed: 2, intro: 0 });
  const b = w.bosses.find(u => u.def.id === 'ekzykes'), ally = w.bosses.find(u => u.def.id === 'redwolf');
  const enemy = w.bosses.find(u => u.def.id === 'dummy'), other = w.bosses.find(u => u.def.id === 'margit');
  for (const u of w.bosses) { u.x = b.x; u.y = b.y; } other.x += 500;
  BD.makeZone(w, b, b.x, b.y, { kind: 'scarletrot', r: 150, dur: 1.5, delay: 0.6, dps: 10, status: { id: 'rotbuildup', stacks: 14 } });
  BD.updateZones(w, 0.4); assert.ok(!BD.hasStatus(enemy, 'rotbuildup'));
  BD.updateZones(w, 0.3); assert.ok(BD.hasStatus(enemy, 'rotbuildup')); assert.ok(!BD.hasStatus(ally, 'rotbuildup')); assert.ok(!BD.hasStatus(b, 'rotbuildup')); assert.ok(!BD.hasStatus(other, 'rotbuildup'));
  const stacks = BD.getStatus(enemy, 'rotbuildup').stacks; enemy.x += 500; BD.updateZones(w, 0.4); assert.strictEqual(BD.getStatus(enemy, 'rotbuildup').stacks, stacks);
  BD.updateZones(w, 2); assert.strictEqual(w.zones.length, 0);
}
// Every available move in both phases and paces actually damages a target and returns from flight.
for (const pace of ['light', 'heavy']) for (const phase of [1, 2]) {
  const w = make(pace), b = w.bosses[0];
  for (const s of b.skills.concat(b.ultimate).filter(s => (s.phase || 1) <= phase)) {
    let damage = 0;
    for (const distance of [130, 310, 510]) {
      w.training.reset(); b.phase = phase; w.training.setHome(b.x + distance, b.y); w.intro = 0; b.face = 0;
      b.startSkill(s, { force: true }); run(w, 13); damage = Math.max(damage, b.stats.dealt);
      assert.ok(w.bosses.every(x => [x.hp, x.x, x.y, x.sta].every(Number.isFinite)));
      assert.ok(!BD.hasStatus(b, 'hidden'), `${pace} P${phase} ${s.id} 沒有落地`);
    }
    assert.ok(damage > 0, `${pace} P${phase} ${s.id} 三種距離都沒命中`);
  }
}
let games = 0;
for (const pace of ['light', 'heavy']) for (const enemy of ['ekzykes', 'agheel', 'redwolf', 'margit', 'witch', 'ronin']) {
  const results = [];
  for (let repeat = 0; repeat < 2; repeat++) {
    const w = new BD.World(def, BD.bossById[enemy], { seed: 31, pace, intro: 0 }); w.simulate(400); assert.ok(w.winner);
    assert.ok(w.bosses.every(b => Number.isFinite(b.hp))); results.push(JSON.stringify({ hp: w.bosses.map(b => b.hp), winner: w.winner.def.id, time: w.time, rng: w.rng() })); games++;
  }
  assert.strictEqual(results[0], results[1]);
}
for (const pace of ['light', 'heavy']) {
  const w = new BD.World([def, BD.bossById.redwolf, BD.bossById.margit], [BD.bossById.agheel, BD.bossById.witch, BD.bossById.ronin], { seed: 7, intro: 0, pace });
  w.simulate(600); assert.ok(w.winner); games++;
}
{
  const w = new BD.World(BD.Hunt4.team(), [def], { seed: 7, hunt4: true, pace: 'heavy', intro: 0 }); w.simulate(900); assert.ok(w.winner); games++;
  assert.ok(BD.HUNT.BOSS_META.ekzykes && BD.HUNT4.BOSS_GEAR.ekzykes);
}
for (const pace of ['light', 'heavy']) {
  const results = [];
  for (const noFx of [true, false]) {
    const { BD: lib } = load({ noFx }); const w = new lib.World(lib.bossById.ekzykes, lib.bossById.agheel, { seed: 71, pace, intro: 0 }); w.simulate(400);
    results.push(JSON.stringify({ hp: w.bosses.map(b => b.hp), winner: w.winner.def.id, time: w.time, rng: w.rng() })); games++;
  }
  assert.strictEqual(results[0], results[1], pace + ' 特效影響戰鬥');
}
console.log(`EKZYKES PASS: 腐敗閾值 / 不無限刷新 / 來源歸屬 / 腐霧延遲與範圍 / 敵我 / 壽命 / 被動間隔與固定預警位置 / 死亡・升空・轉階段・重置 / 全招兩節奏命中並落地；${games} 場模式與重現性檢查`);
