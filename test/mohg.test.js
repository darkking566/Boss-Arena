'use strict';
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const def = BD.bossById.mohg;
function make(pace = 'light', opp = 'redwolf') {
  const w = new BD.World(def, BD.bossById[opp], { seed: 71, pace, intro: 0 });
  w.bosses.forEach(b => { b.controller = { update() {} }; });
  const [b, e] = w.bosses; e.x = b.x + 700; e.y = b.y; return w;
}
function run(w, seconds) { for (let t = 0; t < seconds; t += BD.STEP) { w.hitstop = w.slowmo = w.freezeF = 0; w.step(BD.STEP); } }
const stacks = (u) => { const s = BD.getStatus(u, 'bloodcurse'); return s ? Math.round(s.stacks) : 0; };

// 咒印倒數：生命跌破 88%／74%／60% 依序套上一層（一次跌過兩道門檻時，間隔 0.8 秒逐一念出）；滿血不會套
for (const pace of ['light', 'heavy']) {
  const w = make(pace), [b, e] = w.bosses; run(w, 2);
  assert.strictEqual(stacks(e), 0, '滿血不套咒印');
  b.hp = b.maxHp * 0.87; run(w, 0.1); assert.strictEqual(stacks(e), 1, '88% 第一層');
  b.hp = b.maxHp * 0.59; run(w, 0.1); assert.strictEqual(stacks(e), 1, '連跌兩道門檻也要等間隔');
  run(w, 0.8); assert.strictEqual(stacks(e), 2); run(w, 0.8); assert.strictEqual(stacks(e), 3, '最多三層');
  run(w, 3); assert.strictEqual(stacks(e), 3);
}
// 轉階段：咒印未滿會補齊，念三次 Nihil（無法閃避）吸血回復，結束後咒印清空、長出翅膀進二階段
{
  const w = make(), [b, e] = w.bosses; run(w, 1);
  b.hp = b.maxHp * 0.7; run(w, 1.0); assert.strictEqual(stacks(e), 2);
  BD.applyStatus(e, 'iframe', { dur: 10 }, w); // 翻滾無敵幀擋不住 Nihil
  const eh = e.hp; b.hp = b.maxHp * 0.5 - 1; b.startTransition(); const bh = b.hp;
  run(w, 0.9); assert.strictEqual(stacks(e), 3, '轉階段補齊三層');
  run(w, 2.0); assert.strictEqual(b._nihilN, 3, '三次 Nihil');
  assert.ok(e.hp < eh - 3 * (24 + 26 * 3) * 0.85, 'Nihil 依咒印造成傷害（無視無敵幀）');
  assert.ok(b.hp > bh + 100, 'Nihil 回復蒙格生命');
  assert.strictEqual(stacks(e), 0, '最後一次 Nihil 清空咒印');
  run(w, 0.5); assert.strictEqual(b.phase, 2);
}
// 被動「血之恩寵」：對手出血爆發 → 蒙格 10 秒傷害 ×1.15；隊友出血不算
{
  const w = make(), [b, e] = w.bosses; run(w, 0.5);
  BD.applyStatus(e, 'bleed', { stacks: 100, source: b }, w);
  assert.ok(BD.hasStatus(b, 'bloodboon'), '出血爆發觸發血之恩寵');
  assert.ok(Math.abs(BD.scaleMod(b, 'dmgDealtMul', 1) - 1.15) < 1e-9);
  run(w, 10.2); assert.ok(!BD.hasStatus(b, 'bloodboon'), '10 秒後消失');
}
// 二階段專屬招式只在二階段出現；血焰池排在身前的弧上（半徑固定）、會累積出血、算火傷
{
  const w = make(), b = w.bosses[0]; const p2 = ['winged_assault', 'bloodflame_charge', 'plunge', 'bloodflame_swing'];
  const ids = b.available().map(s => s.id); assert.ok(p2.every(id => !ids.includes(id)));
  b.phase = 2; assert.ok(p2.every(id => b.available().some(s => s.id === id)));
  const s = def.skills.find(x => x.id === 'bloodboon_arc'), pools = s.actions.find(a => a.do === 'bloodpools');
  b.face = 0; BD.action('bloodpools').fn(w, b, b.inst || { marks: {} }, pools, b.enemy);
  const zs = w.zones.filter(z => z.kind === 'bloodflame'); assert.strictEqual(zs.length, 5);
  assert.ok(zs.every(z => Math.abs(Math.hypot(z.x - b.x, z.y - b.y) - 215 * def.sizeMul) < 2 && [].concat(z.status).some(q => q.id === 'bleed') && z.damageEl === 'fire'));
}
// 回歸：puff 色票只能是 #rrggbb；rgba() 會讓畫布狀態壞掉
{
  const full = load().BD, ok = t => /^#[0-9a-f]{6}$/i.test(t) || ['sand', 'snow', 'wheat'].includes(t);
  for (const id of Object.keys(full.effects).filter(k => k.startsWith('mohg'))) {
    const w = new full.World(full.bossById.mohg, full.bossById.dummy, { seed: 3, intro: 0 }), b = w.bosses[0];
    full.spawnFx(w, id, b.x, b.y, { src: b, angle: 0, radius: 200, len: 500, width: 120, arc: 2, life: 1 });
    for (let i = 0; i < 200; i++) { w.fx.update(full.STEP); for (const p of w.fx.puffs) assert.ok(ok(p.tint), id + ' 的 puff 色票不合法：' + p.tint); }
  }
}
// 特效不影響戰鬥：有無特效庫，同種子的對戰結果逐幀一致
{
  const sim = (B) => { const w = new B.World(B.bossById.mohg, B.bossById.godrick, { seed: 9, intro: 0 }); let t = 0; while (!w.winner && t < 200) { w.step(B.STEP); t += B.STEP; } return [Math.round(w.bosses[0].hp), Math.round(w.bosses[1].hp), t.toFixed(3)].join(','); };
  assert.strictEqual(sim(BD), sim(load().BD), '特效改變了戰鬥結果');
}
console.log('MOHG TEST PASS');
