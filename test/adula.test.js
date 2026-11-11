'use strict';
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const def = BD.bossById.adula;
function make(pace = 'light') {
  const w = new BD.World(def, BD.bossById.redwolf, { seed: 71, pace, intro: 0 });
  w.bosses.forEach(b => { b.controller = { update() {} }; });
  const [b, e] = w.bosses; e.x = b.x + 600; e.y = b.y; return w;
}
function run(w, seconds) { for (let t = 0; t < seconds; t += BD.STEP) { w.hitstop = w.slowmo = w.freezeF = 0; w.step(BD.STEP); } }
// 被動「輝石結晶」：10 秒後先預警 0.8 秒，再在對手腳邊長出只減速的結晶；同時只留一團；無法選取時不觸發。
for (const pace of ['light', 'heavy']) {
  const w = make(pace), [b, e] = w.bosses; run(w, 9.8);
  assert.ok(!w.zones.some(z => z.kind === 'glintbloom'), '9.8 秒內不能提前出現');
  run(w, 0.4); assert.ok(b._bloomPending, '預警中'); assert.ok(!w.zones.some(z => z.kind === 'glintbloom'));
  run(w, 1.0);
  const z = w.zones.find(z => z.kind === 'glintbloom'); assert.ok(z, '結晶長出'); assert.ok(Math.hypot(z.x - e.x, z.y - e.y) < 5, '落在對手腳邊');
  assert.deepStrictEqual([].concat(z.status).map(s => s.id), ['slow']);
}
{ const w = make(); BD.applyStatus(w.bosses[0], 'hidden', { dur: 30 }, w); run(w, 13); assert.ok(!w.zones.some(z => z.kind === 'glintbloom'), '無法選取時不長結晶'); }
// 二階段專屬招式不會在一階段出現。
{ const w = make(), b = w.bosses[0]; const ids = b.available().map(s => s.id);
  assert.ok(!ids.includes('moonblade') && !ids.includes('strafe')); b.phase = 2;
  assert.ok(b.available().some(s => s.id === 'moonblade') && b.available().some(s => s.id === 'strafe')); }
// 月刃帶冰凍值；輝石之星的碎片是會追蹤的投射物。
assert.ok(def.skills.find(s => s.id === 'moonblade').actions.some(a => [].concat(a.status || []).some(q => q.id === 'frostbite')), '月刃應帶 frostbite');
assert.ok(def.skills.find(s => s.id === 'glintstone_stars').actions.some(a => a.do === 'proj' && a.homing > 0), '輝石之星應有追蹤碎片');
// 回歸：puff 色票只能是 #rrggbb 或預烘焙名稱（rgba 會讓畫布狀態壞掉）。
{
  const full = load().BD, ok = t => /^#[0-9a-f]{6}$/i.test(t) || ['sand', 'snow', 'wheat'].includes(t);
  for (const id of Object.keys(full.effects).filter(k => k.startsWith('adula'))) {
    const w = new full.World(full.bossById.adula, full.bossById.dummy, { seed: 3, intro: 0 }), b = w.bosses[0];
    full.spawnFx(w, id, b.x, b.y, { src: b, angle: 0, radius: 200, len: 600, width: 150, arc: 2 });
    for (let i = 0; i < 90; i++) { w.fx.update(full.STEP); for (const p of w.fx.puffs) assert.ok(ok(p.tint), id + ' 的 puff 色票不合法：' + p.tint); }
  }
}
console.log('ADULA TEST PASS');
