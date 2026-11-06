'use strict';
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const def = BD.bossById.redwolf;
function make() {
  const w = new BD.World(def, BD.bossById.dummy, { seed: 71, intro: 0, training: { mode: 'manual', range: 'mid' } });
  w.bosses.forEach((b) => { b.controller = { update() {} }; });
  return w;
}
function run(w, seconds) { for (let t = 0; t < seconds; t += BD.STEP) { w.hitstop = w.slowmo = 0; w.step(BD.STEP); } }
const spec = { n: 3, delay: 1, gap: 0.13, speed: 760, r: 10, dmg: 54, posture: 14, life: 2, homing: 1.25 };
// Real timing and anchored positions: no phantom damage while the swords are waiting.
{
  const w = make(), [b, e] = w.bosses, hp = e.hp;
  BD.formGlintblades(w, b, spec);
  const positions = b._glintblades.map((p) => [p.x, p.y]);
  b.x += 180; b.y += 100; b.cancelSkill(); run(w, 0.8);
  assert.strictEqual(w.projectiles.length, 0); assert.strictEqual(e.hp, hp);
  assert.deepStrictEqual(b._glintblades.map((p) => [p.x, p.y]), positions);
  run(w, 0.55);
  assert.strictEqual(b._glintblades.length, 0);
  assert.ok(w.projectiles.some((p) => p.kind === 'glintblade'), '凝成的劍在取消原招後仍獨立發射');
}
// A dead caster / a phase transition must not leave a delayed surprise attack.
{
  const w = make(), b = w.bosses[0]; BD.formGlintblades(w, b, spec);
  b._wolfSteps = 1; b._wolfGlintReady = 7;
  w.training.reset();
  assert.strictEqual(b._glintblades.length, 0); assert.strictEqual(b._wolfSteps, 0); assert.strictEqual(b._wolfGlintReady, 0);
  assert.strictEqual(w.scheduled.length, 0);
}
for (const state of ['dead', 'transition']) {
  const w = make(), b = w.bosses[0]; BD.formGlintblades(w, b, spec);
  if (state === 'dead') { b.state = state; b.alive = false; } else b.startTransition();
  run(w, 2.8);
  assert.strictEqual(w.projectiles.length, 0, state); assert.strictEqual(b._glintblades.length, 0, state);
}
// Passive: every two skill dashes, bounded by a seven-second cooldown; never permanent invulnerability.
{
  const w = make(), b = w.bosses[0], trait = BD.trait('glinthunter');
  trait.onDash(w, b); assert.ok(!b._glintblades);
  trait.onDash(w, b); assert.strictEqual(b._glintblades.length, 1);
  for (let i = 0; i < 20; i++) trait.onDash(w, b);
  assert.strictEqual(b._glintblades.length, 1);
  assert.strictEqual(BD.getMod(b, 'invuln'), false);
  w.time = 7.1; trait.onDash(w, b); assert.strictEqual(b._glintblades.length, 2);
}
// A three-against-three target can die before launch; swords reacquire a living enemy, never a teammate.
{
  const w = new BD.World([def, BD.bossById.ronin], [BD.bossById.witch, BD.bossById.magmus], { seed: 12, intro: 0 });
  w.bosses.forEach((b) => { b.controller = { update() {} }; });
  const b = w.bosses[0], e = w.bosses[2], next = w.bosses[3];
  BD.formGlintblades(w, b, { ...spec, n: 1 }); e.state = 'dead'; e.alive = false;
  next.x = b.x + 500; next.y = b.y + 180; run(w, 1.05);
  const p = w.projectiles.find((p) => p.kind === 'glintblade'); assert.ok(p && p.team === b.team);
  assert.ok(p.vx * (next.x - p.x) + p.vy * (next.y - p.y) > 0);
}
// Every move, both phases and both paces: actual training damage with time for detached blades.
for (const pace of ['light', 'heavy']) for (const phase of [1, 2]) {
  const w = new BD.World(def, BD.bossById.dummy, { seed: 7, pace, training: { mode: 'manual', range: 'mid' } });
  const b = w.bosses[0], e = w.bosses[1];
  for (const s of b.skills.concat(b.ultimate).filter((s) => (s.phase || 1) <= phase)) {
    let damage = 0;
    for (const distance of [100, 280, 480]) {
      w.training.reset(); b.phase = phase; b._glintblades = []; b._wolfSteps = 0;
      w.training.setHome(b.x + distance, b.y); w.intro = 0; b.face = 0;
      b.startSkill(s, { force: true }); run(w, 12);
      damage = Math.max(damage, b.stats.dealt);
      assert.ok([b, e].every((x) => [x.hp, x.x, x.y, x.sta].every(Number.isFinite)));
      assert.strictEqual(BD.hasStatus(b, 'hidden'), false, s.id + ' 未落地');
    }
    assert.ok(damage > 0, `${pace} P${phase} ${s.id} 三種距離都沒造成傷害`);
  }
}
// New boss integration and deterministic seeded matches, including mirror, team and hunting modes.
let games = 0;
for (const pace of ['light', 'heavy']) for (const enemy of ['redwolf', 'treesentinel', 'margit', 'godrick', 'witch', 'ronin']) {
  const snapshots = [];
  for (let repeat = 0; repeat < 2; repeat++) {
    const w = new BD.World(def, BD.bossById[enemy], { seed: 21, intro: 0, pace }); w.simulate(400);
    assert.ok(w.winner, `${pace} ${enemy} 沒有分出勝負`);
    snapshots.push(JSON.stringify({ time: w.time, hp: w.bosses.map((b) => b.hp), winner: w.winner.def.id, rng: w.rng() })); games++;
  }
  assert.strictEqual(snapshots[0], snapshots[1]);
}
{
  const w = new BD.World(BD.Hunt4.team(), [def], { seed: 7, hunt4: true, pace: 'heavy', intro: 0 });
  w.simulate(900); assert.ok(w.winner, '4v1 沒有結果'); games++;
  assert.ok(BD.HUNT.BOSS_META.redwolf && BD.HUNT4.BOSS_GEAR.redwolf);
}
// Enabling all the new effects must not consume combat RNG or change the result.
for (const pace of ['light', 'heavy']) {
  const outcomes = [];
  for (const noFx of [true, false]) {
    const { BD: lib } = load({ noFx });
    const w = new lib.World(lib.bossById.redwolf, lib.bossById.treesentinel, { seed: 31, pace, intro: 0 }); w.simulate(400);
    outcomes.push(JSON.stringify({ hp: w.bosses.map((b) => b.hp), time: w.time, rng: w.rng(), winner: w.winner.def.id })); games++;
  }
  assert.strictEqual(outcomes[0], outcomes[1], pace + ' 特效改變了戰鬥結果');
}
console.log(`REDWOLF PASS: 延遲 / 固定原位 / 死亡 / 轉階段 / 被動冷卻 / 換目標 / 全招命中；${games} 場模式與重現性檢查`);
