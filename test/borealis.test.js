'use strict';
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const def = BD.bossById.borealis;
function make(pace = 'light', training = false) {
  const w = new BD.World(def, BD.bossById[training ? 'dummy' : 'redwolf'], { seed: 71, pace, intro: 0, ...(training ? { training: { mode: 'manual', range: 'mid' } } : {}) });
  w.bosses.forEach(b => { b.controller = { update() {} }; });
  const [b, e] = w.bosses; e.x = b.x + 230; e.y = b.y; return w;
}
function run(w, seconds) { for (let t = 0; t < seconds; t += BD.STEP) { w.hitstop = w.slowmo = w.freezeF = 0; w.step(BD.STEP); } }
function afflict(w, e = w.bosses[1], b = w.bosses[0]) { BD.applyStatus(e, 'rimebuildup', { stacks: 100, source: b }, w); }
// Accumulate / decay / burst only once, attribute to its owner, and never root or stun.
{
  const w = make(), [b, e] = w.bosses, hp = e.hp;
  BD.applyStatus(e, 'rimebuildup', { stacks: 60, source: b }, w);
  BD.tickStatuses(e, 1, w); assert.strictEqual(BD.getStatus(e, 'rimebuildup').stacks, 55); assert.strictEqual(e.hp, hp);
  BD.applyStatus(e, 'rimebuildup', { stacks: 45, source: b }, w);
  assert.ok(BD.hasStatus(e, 'rimebite')); assert.ok(!BD.hasStatus(e, 'rimebuildup'));
  assert.strictEqual(BD.getStatus(e, 'rimebite').source, b);
  assert.strictEqual(BD.getMod(e, 'staminaRegenMul'), 0.85); assert.strictEqual(BD.getMod(e, 'dmgTakenMul'), 1.12);
  BD.tickStatuses(e, BD.STEP, w); const dealt = b.stats.dealt; assert.ok(dealt > 60 && e.hp < hp);
  assert.ok(!BD.hasStatus(e, 'frozen') && !BD.hasStatus(e, 'root')); assert.strictEqual(e.state, 'idle');
  const rem = BD.statusRemaining(e, 'rimebite'); afflict(w); assert.strictEqual(BD.statusRemaining(e, 'rimebite'), rem);
  BD.tickStatuses(e, 0.5, w); assert.strictEqual(b.stats.dealt, dealt, '凍傷不能每步重複爆發');
  BD.tickStatuses(e, 8, w); assert.ok(!BD.hasStatus(e, 'rimebite')); assert.strictEqual(BD.getMod(e, 'staminaRegenMul'), 1);
}
// Successful fire semantics, not a changed visual element. Misses and absorbed hits do not thaw.
for (const pace of ['light', 'heavy']) {
  const w = make(pace), [b, e] = w.bosses; afflict(w);
  w.damageBoss(b, e, { dmg: 1, posture: 0, fxEl: 'fire' }); assert.ok(BD.hasStatus(e, 'rimebite'));
  BD.applyStatus(e, 'shield', { value: 9999, dur: 1 }, w);
  assert.strictEqual(w.damageBoss(b, e, { dmg: 20, damageEl: 'fire' }), 'absorbed'); assert.ok(BD.hasStatus(e, 'rimebite'));
  BD.removeStatus(e, 'shield'); BD.applyStatus(e, 'invuln', { dur: 1 }, w);
  w.damageBoss(b, e, { dmg: 20, damageEl: 'fire' }); assert.ok(BD.hasStatus(e, 'rimebite'));
  BD.removeStatus(e, 'invuln'); w.damageBoss(b, e, { dmg: 1, posture: 0, damageEl: 'fire' });
  assert.ok(!BD.hasStatus(e, 'rimebite')); assert.ok(BD.hasStatus(e, 'rimeguard'));
  afflict(w); assert.ok(!BD.hasStatus(e, 'rimebite') && !BD.hasStatus(e, 'rimebuildup'));
  run(w, 2.1); afflict(w); assert.ok(BD.hasStatus(e, 'rimebite'));
}
for (const fire of [{ status: { id: 'burn', dur: 2 } }, { status: [{ id: 'burn', dur: 2 }] }, { statusDmg: 'burn', dot: true }, { statusDmg: 'amaterasu', dot: true }]) {
  const w = make(), [b, e] = w.bosses; afflict(w); w.damageBoss(b, e, { dmg: 1, posture: 0, ...fire }); assert.ok(!BD.hasStatus(e, 'rimebite'));
}
// Minions receive actual damage notifications too; a blocked fire hit cannot remove their frost.
{
  const w = make(), [b, e] = w.bosses;
  const m = { alive: true, hp: 2000, maxHp: 2000, r: 20, x: e.x, y: e.y, team: 1, owner: e, statuses: [] };
  afflict(w, m); BD.tickStatuses(m, BD.STEP, w); assert.ok(m.hp < 2000 && m.alive);
  BD.applyStatus(m, 'shield', { value: 500 }, w); w.damageUnit(b, m, { dmg: 10, damageEl: 'fire' }); assert.ok(BD.hasStatus(m, 'rimebite'));
  BD.removeStatus(m, 'shield'); w.damageUnit(b, m, { dmg: 10, damageEl: 'fire' }); assert.ok(!BD.hasStatus(m, 'rimebite'));
}
// Stamina recovery is reduced while afflicted, returns exactly to its default afterward.
{
  const gains = [];
  for (const cold of [false, true]) { const w = make(), e = w.bosses[1]; if (cold) { afflict(w); BD.getStatus(e, 'rimebite').data.burst = false; } e.sta = 0; e.staDelay = 0; e.update(BD.STEP); gains.push(e.sta); }
  assert.ok(Math.abs(gains[1] / gains[0] - 0.85) < 1e-12);
  const w = make(), e = w.bosses[1]; BD.applyStatus(e, 'frostbite', { stacks: 100 }, w); assert.ok(BD.hasStatus(e, 'frozen'), '魔女原有冰凍值不能被改掉');
}
// Zone arming / finite lifetime / team boundaries / stopping buildup after leaving.
{
  const w = new BD.World([def, BD.bossById.agheel], [BD.bossById.redwolf, BD.bossById.margit], { seed: 2, intro: 0 });
  const [b, ally, e, other] = w.bosses; for (const u of [ally, e]) { u.x = b.x; u.y = b.y; } other.x = b.x + 900;
  BD.makeZone(w, b, b.x, b.y, { kind: 'rimefog', r: 200, dur: 2, delay: 0.65, dps: 6, status: { id: 'rimebuildup', stacks: 12 } });
  BD.updateZones(w, 0.5); assert.ok(!BD.hasStatus(e, 'rimebuildup'));
  BD.updateZones(w, 0.2); assert.ok(BD.hasStatus(e, 'rimebuildup')); assert.ok(!BD.hasStatus(ally, 'rimebuildup') && !BD.hasStatus(b, 'rimebuildup') && !BD.hasStatus(other, 'rimebuildup'));
  const stacks = BD.getStatus(e, 'rimebuildup').stacks; e.x += 800; BD.updateZones(w, 0.5); assert.strictEqual(BD.getStatus(e, 'rimebuildup').stacks, stacks);
  BD.updateZones(w, 3); assert.strictEqual(w.zones.length, 0);
}
// Passive: timer / fixed marked ground / one field / pause in air or transition / training reset.
{
  const w = make(), b = w.bosses[0]; run(w, 7.9); assert.strictEqual(w.zones.length, 0);
  run(w, 0.2); assert.ok(b._rimePending); const { x, y } = b._rimePending; b.x -= 400;
  run(w, 0.4); assert.strictEqual(w.zones.length, 0); run(w, 0.3); assert.strictEqual(w.zones.length, 1);
  assert.strictEqual(w.zones[0].x, x); assert.strictEqual(w.zones[0].y, y);
  const first = w.zones[0]; b._rimeTimer = 8; run(w, 0.7); assert.ok(w.zones.filter(z => z.owner === b).length <= 1); assert.strictEqual(b._rimeZone, first);
}
for (const state of ['dead', 'transition', 'hidden']) {
  const w = make(), b = w.bosses[0]; b._rimeTimer = 8; run(w, 0.02); assert.ok(b._rimePending);
  if (state === 'dead') { b.state = 'dead'; b.alive = false; } else if (state === 'transition') b.startTransition(); else BD.applyStatus(b, 'hidden', { dur: 2 }, w);
  run(w, 0.8); assert.strictEqual(w.zones.length, 0, state);
}
{
  const w = make('light', true), b = w.bosses[0]; b._rimeTimer = 8; run(w, 0.03); w.training.reset();
  assert.strictEqual(b._rimeTimer, 0); assert.strictEqual(b._rimePending, null); assert.strictEqual(b._rimeZone, null); run(w, 1); assert.strictEqual(w.zones.length, 0);
}
// Every available move actually damages a target in both paces / phases, and every flight lands.
// Long channels yield to a seen safe-circle warning; flight must retain its landing action.
for (const pace of ['light', 'heavy']) for (const hidden of [false, true]) {
  const w = new BD.World(def, BD.bossById.witch, { seed: 3, pace, intro: 0 }), [b, e] = w.bosses;
  const ctl = b.controller; b.startSkill(b.skills.find(s => s.id === 'ice_breath'), { force: true });
  const inst = b.inst, sta = b.sta, cd = b.cds.ice_breath;
  if (hidden) BD.applyStatus(b, 'hidden', { dur: 2 }, w);
  const t = { undodgeable: true, team: e.team, t: 0.1, shape: { kind: 'except', x: b.x + 650, y: b.y, r: 180 } }; w.telegraphs.push(t);
  ctl.update(BD.STEP); assert.strictEqual(b.inst, inst, '不能讀到反應時間之前的預警');
  t.t = 1; ctl.update(BD.STEP);
  if (hidden) assert.strictEqual(b.inst, inst, '不可把升空技能的落地動作取消');
  else { assert.strictEqual(b.inst, null); assert.strictEqual(b.state, 'recover'); assert.strictEqual(b.sta, sta); assert.strictEqual(b.cds.ice_breath, cd); }
}
for (const pace of ['light', 'heavy']) for (const phase of [1, 2]) {
  const w = make(pace, true), b = w.bosses[0];
  for (const s of b.skills.concat(b.ultimate).filter(s => (s.phase || 1) <= phase)) {
    let damage = 0;
    for (const distance of [140, 330, 530]) {
      w.training.reset(); b.phase = phase; w.training.setHome(b.x + distance, b.y); w.intro = 0; b.face = 0;
      b.startSkill(s, { force: true }); run(w, 14); damage = Math.max(damage, b.stats.dealt);
      assert.ok(w.bosses.every(x => [x.hp, x.x, x.y, x.sta].every(Number.isFinite)));
      assert.ok(!BD.hasStatus(b, 'hidden'), `${pace} P${phase} ${s.id} 未落地`);
    }
    assert.ok(damage > 0, `${pace} P${phase} ${s.id} 三種距離皆未命中`);
  }
}
// Kill / transition at threshold cannot leave delayed bursts or cause duplicate kills.
{
  const w = make(), [b, e] = w.bosses; let kills = 0; w.on('kill', () => kills++);
  e.hp = 1; w.damageBoss(b, e, { dmg: 10, status: { id: 'rimebuildup', stacks: 100 } }); run(w, 0.1);
  assert.strictEqual(kills, 1); assert.ok(!BD.hasStatus(e, 'rimebite'));
}
// 4v1's real positive fire-element addition thaws; fixed raw damage from a fire weapon does not.
{
  const w = new BD.World(BD.Hunt4.team(), [def], { seed: 7, hunt4: true, pace: 'heavy', intro: 0 }), b = w.hunt4.boss, h = w.bosses.find(x => x.h4);
  h.h4.mod.el = 'fire'; h.h4.mod.elv = 14; afflict(w, b, h); BD.getStatus(b, 'rimebite').data.burst = false;
  w.damageBoss(h, b, { dmg: 1, posture: 0, fixed: true }); assert.ok(BD.hasStatus(b, 'rimebite'));
  w.damageBoss(h, b, { dmg: 1, posture: 0 }); assert.ok(!BD.hasStatus(b, 'rimebite'));
}
let games = 0;
for (const pace of ['light', 'heavy']) for (const enemy of ['borealis', 'agheel', 'ekzykes', 'fallingstar', 'witch', 'redwolf']) {
  const out = [];
  for (let repeat = 0; repeat < 2; repeat++) { const w = new BD.World(def, BD.bossById[enemy], { seed: 31, pace, intro: 0 }); w.simulate(450); assert.ok(w.winner); assert.ok(w.bosses.every(b => [b.hp, b.x, b.y].every(Number.isFinite))); out.push(JSON.stringify({ hp: w.bosses.map(b => b.hp), winner: w.winner.def.id, time: w.time, rng: w.rng() })); games++; }
  assert.strictEqual(out[0], out[1]);
}
for (const pace of ['light', 'heavy']) { const w = new BD.World([def, BD.bossById.redwolf, BD.bossById.margit], [BD.bossById.agheel, BD.bossById.witch, BD.bossById.fallingstar], { seed: 7, intro: 0, pace }); w.simulate(600); assert.ok(w.winner); games++; }
{
  const w = new BD.World(BD.Hunt4.team(), [def], { seed: 7, hunt4: true, pace: 'heavy', intro: 0 }); w.simulate(900); assert.ok(w.winner); games++;
  assert.ok(BD.HUNT.BOSS_META.borealis && BD.HUNT4.BOSS_GEAR.borealis);
}
for (const pace of ['light', 'heavy']) {
  const out = [];
  for (const noFx of [true, false]) { const { BD: lib } = load({ noFx }); const w = new lib.World(lib.bossById.borealis, lib.bossById.agheel, { seed: 71, pace, intro: 0 }); w.simulate(450); out.push(JSON.stringify({ hp: w.bosses.map(b => b.hp), winner: w.winner.def.id, time: w.time, rng: w.rng() })); games++; }
  assert.strictEqual(out[0], out[1], pace + ' 特效影響戰鬥');
}
// FX numbers remain finite, including charge effects; no budget shortcut may affect combat RNG.
{
  const { BD: lib } = load(); const w = new lib.World(lib.bossById.borealis, lib.bossById.dummy, { seed: 3, intro: 0 });
  for (const id of Object.keys(lib.effects).filter(x => x.startsWith('borealis'))) lib.spawnFx(w, id, 300, 300, { src: w.bosses[0], radius: 300, angle: 0 });
  for (let i = 0; i < 120; i++) w.fx.update(lib.STEP);
  for (const key of ['parts', 'rings', 'glows', 'puffs', 'shocks', 'streaks']) for (const x of w.fx[key]) for (const p of ['x', 'y', 'life']) if (p in x) assert.ok(Number.isFinite(x[p]), `${key}.${p}`);
}
console.log(`BOREALIS PASS: 凍傷閾值／單次爆發／不冰封／來源／耐力／語意火焰解除與回溫／護盾與無敵／召喚物／霧區敵我與壽命／被動預警與固定位置／升空・死亡・轉階段・重置／全招兩節奏命中且落地／特效數值；${games} 場模式與重現性檢查`);
