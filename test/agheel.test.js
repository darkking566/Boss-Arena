'use strict';
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const def = BD.bossById.agheel;
function make() {
  const w = new BD.World(def, BD.bossById.dummy, { seed: 71, intro: 0, training: { mode: 'manual', range: 'mid' } });
  w.bosses.forEach((b) => { b.controller = { update() {} }; });
  const [b, e] = w.bosses; e.x = b.x + 150; e.y = b.y;
  return w;
}
function run(w, seconds) { for (let t = 0; t < seconds; t += BD.STEP) { w.hitstop = w.slowmo = 0; w.step(BD.STEP); } }
const trait = BD.trait('dragonwing');
const hit = (w, n, p = {}) => { const [b, e] = w.bosses; for (let i = 0; i < n; i++) trait.interceptDamage(w, b, e, p); };
// Passive: the fourth direct hit (not DoT, not while invulnerable) sends one gust 0.25 s later.
{
  const w = make(), e = w.bosses[1], hp = e.hp;
  hit(w, 3); hit(w, 5, { dot: true }); run(w, 0.4);
  assert.strictEqual(e.hp, hp, '前三下 / 持續傷害不該觸發翼風');
  hit(w, 1); assert.strictEqual(e.hp, hp, '翼風延遲 0.25 秒');
  run(w, 0.4); assert.ok(e.hp < hp, '第四下觸發翼風'); assert.strictEqual(w.bosses[0]._wingbeat, 0);
}
// No gust after death / phase transition / taking off (hidden); training reset clears the counter.
for (const state of ['dead', 'transition', 'hidden']) {
  const w = make(), [b, e] = w.bosses, hp = e.hp;
  hit(w, 4);
  if (state === 'dead') { b.state = 'dead'; b.alive = false; } else if (state === 'transition') b.startTransition(); else BD.applyStatus(b, 'hidden', { dur: 2 }, w);
  run(w, 0.4); assert.strictEqual(e.hp, hp, state + ' 時不該颳翼風');
}
{
  const w = make(), b = w.bosses[0]; hit(w, 3); w.training.reset();
  assert.strictEqual(b._wingbeat, 0, '訓練場重置歸零');
}
// Every move, both phases and both paces: actual training damage, and every take-off lands.
for (const pace of ['light', 'heavy']) for (const phase of [1, 2]) {
  const w = new BD.World(def, BD.bossById.dummy, { seed: 7, pace, training: { mode: 'manual', range: 'mid' } });
  const b = w.bosses[0], e = w.bosses[1];
  for (const s of b.skills.concat(b.ultimate).filter((s) => (s.phase || 1) <= phase)) {
    let damage = 0;
    for (const distance of [100, 280, 480]) {
      w.training.reset(); b.phase = phase;
      w.training.setHome(b.x + distance, b.y); w.intro = 0; b.face = 0;
      b.startSkill(s, { force: true }); run(w, 12);
      damage = Math.max(damage, b.stats.dealt);
      assert.ok([b, e].every((x) => [x.hp, x.x, x.y, x.sta].every(Number.isFinite)));
      assert.strictEqual(BD.hasStatus(b, 'hidden'), false, s.id + ' 未落地');
    }
    assert.ok(damage > 0, `${pace} P${phase} ${s.id} 三種距離都沒造成傷害`);
  }
}
// Integration and deterministic seeded matches, plus hunting mode.
let games = 0;
for (const pace of ['light', 'heavy']) for (const enemy of ['agheel', 'redwolf', 'margit', 'godrick', 'witch', 'ronin']) {
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
  assert.ok(BD.HUNT.BOSS_META.agheel && BD.HUNT4.BOSS_GEAR.agheel);
}
// Effects must not consume combat RNG or change the result.
for (const pace of ['light', 'heavy']) {
  const outcomes = [];
  for (const noFx of [true, false]) {
    const { BD: lib } = load({ noFx });
    const w = new lib.World(lib.bossById.agheel, lib.bossById.redwolf, { seed: 31, pace, intro: 0 }); w.simulate(400);
    outcomes.push(JSON.stringify({ hp: w.bosses.map((b) => b.hp), time: w.time, rng: w.rng(), winner: w.winner.def.id })); games++;
  }
  assert.strictEqual(outcomes[0], outcomes[1], pace + ' 特效改變了戰鬥結果');
}
console.log(`AGHEEL PASS: 翼風每 4 下 / 持續傷害不計 / 死亡・轉階段・升空不觸發 / 重置歸零 / 全招命中且必定落地；${games} 場模式與重現性檢查`);
