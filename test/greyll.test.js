'use strict';
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const def = BD.bossById.greyll;
function make() {
  const w = new BD.World(def, BD.bossById.dummy, { seed: 71, intro: 0, training: { mode: 'manual', range: 'mid' } });
  w.bosses.forEach((b) => { b.controller = { update() {} }; });
  const [b, e] = w.bosses; e.x = b.x + 200; e.y = b.y;
  return w;
}
function run(w, seconds) { for (let t = 0; t < seconds; t += BD.STEP) { w.hitstop = w.slowmo = 0; w.step(BD.STEP); } }

// 被動「母龍餘威」：一階段 15 秒、二階段 11 秒一吼；先有 0.9 秒預警，再震出氣浪並施加母龍威壓；對手太遠時不吼。
{
  const w = make(), [b, e] = w.bosses, hp = e.hp;
  run(w, 14); assert.strictEqual(BD.hasStatus(e, 'powershred'), false, '一階段 15 秒前不吼');
  run(w, 1.2); assert.strictEqual(BD.hasStatus(e, 'powershred'), false, '預警期間不傷人');
  run(w, 1.0); assert.ok(BD.hasStatus(e, 'powershred'), '氣浪炸開後對手背上母龍威壓'); assert.ok(e.hp < hp, '氣浪有小傷害');
  assert.ok(BD.getMod(e, 'dmgDealtMul') < 1 && BD.getMod(e, 'dmgTakenMul') > 1, '攻擊下降、承傷上升');
}
{ const w = make(), [b, e] = w.bosses; e.x = b.x + 1800; run(w, 20); assert.strictEqual(BD.hasStatus(e, 'powershred'), false, '對手太遠不吼'); assert.ok(b._roarTimer >= 15, '計時留著'); }
{ const w = make(), b = w.bosses[0]; b.phase = 2; run(w, 12.4); assert.ok(w.bosses[1].hp < w.bosses[1].maxHp, '二階段 11 秒就吼'); }
for (const state of ['transition', 'hidden']) {
  const w = make(), [b, e] = w.bosses; run(w, 10);
  if (state === 'transition') b.startTransition(); else BD.applyStatus(b, 'hidden', { dur: 8 }, w);
  run(w, 7); assert.strictEqual(BD.hasStatus(e, 'powershred'), false, state + ' 時不吼');
}
{ const w = make(), b = w.bosses[0]; run(w, 5); w.training.reset(); assert.strictEqual(b._roarTimer, 0, '訓練場重置歸零'); }

// 二階段專屬招式不會在一階段出現。
{ const w = make(), b = w.bosses[0], ids = () => b.available().map((s) => s.id);
  assert.ok(!ids().includes('greyoll_roar') && !ids().includes('ash_storm') && ids().includes('bridge_inferno'));
  b.phase = 2; assert.ok(ids().includes('greyoll_roar') && ids().includes('ash_storm')); }
// 母龍之嚎、大招帶母龍威壓。
for (const [id, list] of [['greyoll_roar', def.skills.find((s) => s.id === 'greyoll_roar').actions], ['ult', def.ultimate.actions], ['ult2', def.ultimate.actions2]]) {
  assert.ok(list.some((a) => a.do === 'hit' && [].concat(a.status || []).some((q) => q.id === 'powershred')), id + ' 應帶 powershred');
}
// 每招、兩階段、兩種節奏：真的對訓練假人造成傷害，升空必定落地。
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
// 整合：固定種子可重現、不同對手都能分出勝負；狩獵 / 4v1 資料齊全。
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
  assert.ok(BD.HUNT.BOSS_META.greyll && BD.HUNT4.BOSS_GEAR.greyll);
}
// 特效不得消耗戰鬥亂數或改變結果。
for (const pace of ['light', 'heavy']) {
  const outcomes = [];
  for (const noFx of [true, false]) {
    const { BD: lib } = load({ noFx });
    const w = new lib.World(lib.bossById.greyll, lib.bossById.redwolf, { seed: 31, pace, intro: 0 }); w.simulate(400);
    outcomes.push(JSON.stringify({ hp: w.bosses.map((b) => b.hp), time: w.time, rng: w.rng(), winner: w.winner.def.id })); games++;
  }
  assert.strictEqual(outcomes[0], outcomes[1], pace + ' 特效改變了戰鬥結果');
}
// 回歸：puff 色票只能是 #rrggbb 或預烘焙名稱（rgba() 會讓畫布狀態壞掉）。
{
  const full = load().BD, ok = (t) => /^#[0-9a-f]{6}$/i.test(t) || ['sand', 'snow', 'wheat'].includes(t) || /^rgba?\(/.test(t) === false;
  for (const id of Object.keys(full.effects).filter((k) => k.startsWith('greyll'))) {
    const w = new full.World(full.bossById.greyll, full.bossById.dummy, { seed: 3, intro: 0 }), b = w.bosses[0];
    full.spawnFx(w, id, b.x, b.y, { src: b, angle: 0, radius: 300, len: 800, width: 200, arc: 1.2 });
    for (let i = 0; i < 90; i++) { w.fx.update(full.STEP); for (const p of w.fx.puffs) assert.ok(ok(p.tint), id + ' 的 puff 色票不合法：' + p.tint); }
  }
}
console.log(`GREYLL TEST PASS：母龍餘威 / 威壓狀態 / 二階段招式 / 全招命中且必定落地；${games} 場重現性與特效無關檢查`);
