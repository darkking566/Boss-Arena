'use strict';
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const def = BD.bossById.fallingstar, trait = BD.trait('starcore');
function make(pace = 'light') {
  const w = new BD.World(def, BD.bossById.dummy, { seed: 71, pace, intro: 0, training: { mode: 'manual', range: 'mid' } });
  w.bosses.forEach(b => { b.controller = { update() {} }; });
  const [b] = w.bosses; w.training.setHome(b.x + 150, b.y); return w;
}
function run(w, seconds) { for (let t = 0; t < seconds; t += BD.STEP) { w.hitstop = w.slowmo = 0; w.step(BD.STEP); } }
const hit = (w, n, p = {}) => { const [b, e] = w.bosses; for (let i = 0; i < n; i++) trait.interceptDamage(w, b, e, { dmg: 10, ...p }); };
// 被動：第 4 下正傷害直接攻擊才觸發、預警位置固定、吸向原點、8 秒間隔。
{
  const w = make(), [b, e] = w.bosses;
  e.x = b.x + 260; e.y = b.y; e.kbx = e.kby = 0;
  hit(w, 3); hit(w, 5, { dot: true }); hit(w, 5, { dmg: 0 }); assert.strictEqual(b._corePending, undefined);
  hit(w, 1); assert.ok(b._corePending); const origin = { x: b._corePending.x, y: b._corePending.y };
  b.x -= 200; trait.tick(w, b, 0.5); assert.ok(b._corePending, '預警期間不吸');
  const hp = e.hp; trait.tick(w, b, 0.15);
  assert.strictEqual(b._corePending, null); assert.ok(e.hp < hp, '範圍內的敵人受傷');
  assert.ok(e.kbx < 0 && Math.abs(Math.atan2(e.kby, e.kbx) - Math.atan2(origin.y - e.y, origin.x - e.x)) < 1e-6, '擊退方向朝原預警點');
  hit(w, 20); assert.strictEqual(b._corePending, null, '間隔內不再觸發');
  trait.tick(w, b, 8); hit(w, 4); assert.ok(b._corePending, '間隔結束後可以再次觸發');
}
for (const state of ['dead', 'transition', 'hidden']) {
  const w = make(), [b, e] = w.bosses; e.x = b.x + 200; hit(w, 4);
  if (state === 'dead') { b.state = 'dead'; b.alive = false; } else if (state === 'transition') b.startTransition(); else BD.applyStatus(b, 'hidden', { dur: 2 }, w);
  const hp = e.hp; run(w, 0.8); assert.strictEqual(e.hp, hp, state + ' 時不吸人');
}
{
  const w = make(), b = w.bosses[0]; hit(w, 4); w.training.reset();
  assert.strictEqual(b._corePending, null); assert.strictEqual(b._coreCooldown, 0); assert.strictEqual(b._coreHits, 0);
}
// 重力牽引：只拉範圍內的敵人（不拉隊友與遠處敵人），翻滾無敵幀可以躲。
{
  const w = new BD.World([def, BD.bossById.redwolf], [BD.bossById.dummy, BD.bossById.margit], { seed: 2, intro: 0 });
  const b = w.bosses.find(u => u.def.id === 'fallingstar'), ally = w.bosses.find(u => u.def.id === 'redwolf');
  const near = w.bosses.find(u => u.def.id === 'dummy'), far = w.bosses.find(u => u.def.id === 'margit');
  for (const u of w.bosses) { u.kbx = u.kby = 0; } near.x = b.x + 250; near.y = b.y; ally.x = b.x - 250; ally.y = b.y; far.x = b.x + 2000; far.y = b.y;
  const hp = [near.hp, ally.hp, far.hp];
  BD.gravityPull(w, b, b.x, b.y, 400, { dmg: 20, posture: 5, kb: 500 });
  assert.ok(near.hp < hp[0] && near.kbx < 0, '近處敵人被拉向中心');
  assert.strictEqual(ally.hp, hp[1]); assert.strictEqual(ally.kbx, 0); assert.strictEqual(far.hp, hp[2]);
  near.kbx = 0; BD.applyStatus(near, 'iframe', { dur: 0.5 }, w); const h2 = near.hp;
  BD.gravityPull(w, b, b.x, b.y, 400, { dmg: 20, posture: 5, kb: 500 }); assert.strictEqual(near.hp, h2); assert.strictEqual(near.kbx, 0, '無敵幀躲掉吸力');
}
// 二階段才解鎖原作的重力反轉 / 重力光束；重力反轉的浮空會讓目標無法行動。
{
  assert.strictEqual(def.skills.filter(s => s.phase === 2).map(s => s.id).join(), 'reverse_gravity,gravity_ray');
  const w = make(), [b, e] = w.bosses; b.phase = 2; w.training.setHome(b.x + 200, b.y); b.face = 0;
  b.startSkill(b.skills.find(s => s.id === 'reverse_gravity'), { force: true });
  run(w, 1.25); assert.ok(BD.hasStatus(e, 'airborne'), '重力反轉把目標拋上半空');
}
// 每招兩節奏、兩階段至少在一種距離命中，捲球後一定落地。
for (const pace of ['light', 'heavy']) for (const phase of [1, 2]) {
  const w = make(pace), b = w.bosses[0];
  for (const s of b.skills.concat(b.ultimate).filter(s => (s.phase || 1) <= phase)) {
    let damage = 0;
    for (const distance of [140, 330, 540]) {
      w.training.reset(); b.phase = phase; w.training.setHome(b.x + distance, b.y); w.intro = 0; b.face = 0;
      const d0 = b.stats.dealt; b.startSkill(s, { force: true }); run(w, 13); damage = Math.max(damage, b.stats.dealt - d0);
      assert.ok(w.bosses.every(x => [x.hp, x.x, x.y, x.sta].every(Number.isFinite)));
      assert.ok(!BD.hasStatus(b, 'hidden'), `${pace} P${phase} ${s.id} 沒有落地`);
    }
    assert.ok(damage > 0, `${pace} P${phase} ${s.id} 三種距離都沒命中`);
  }
}
let games = 0;
for (const pace of ['light', 'heavy']) for (const enemy of ['fallingstar', 'ekzykes', 'agheel', 'redwolf', 'margit', 'witch']) {
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
  assert.ok(BD.HUNT.BOSS_META.fallingstar && BD.HUNT4.BOSS_GEAR.fallingstar);
}
for (const pace of ['light', 'heavy']) {
  const results = [];
  for (const noFx of [true, false]) {
    const { BD: lib } = load({ noFx }); const w = new lib.World(lib.bossById.fallingstar, lib.bossById.ekzykes, { seed: 71, pace, intro: 0 }); w.simulate(400);
    results.push(JSON.stringify({ hp: w.bosses.map(b => b.hp), winner: w.winner.def.id, time: w.time, rng: w.rng() })); games++;
  }
  assert.strictEqual(results[0], results[1], pace + ' 特效影響戰鬥');
}
console.log(`FALLINGSTAR PASS: 星核引力觸發條件 / 固定預警點 / 吸向原點 / 間隔 / 死亡・轉階段・隱身・重置 / 牽引敵我與無敵幀 / 二階段解鎖與浮空 / 全招兩節奏命中並落地；${games} 場模式與重現性檢查`);
