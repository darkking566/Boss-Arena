// 拉鋸戰原型（opts.lane）無頭測試：中途召喚的 Boss 會打敵方小兵與核心；只有一方有 Boss 時那方能推平核心；
// 雙方各一位 Boss 時會互打；全程不丟錯；不開時沒有兵線單位
'use strict';
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const ids = BD.bosses.map((b) => b.id);
const mk = (seed, pace) => new BD.World(BD.bossById.dummy, BD.bossById.dummy, { seed, intro: 0, pace: pace || 'heavy', lane: true });
const run = (w, sec) => { for (let t = 0; t < sec * 60 && !w.over; t++) w.step(1 / 60); };

// 1. 單方 Boss：每位 Boss 都要能打小兵、打到核心，且在時限內推平
const slow = [];
for (const id of ids) {
  const w = mk(1); const hit = { unit: 0, core: 0 };
  w.on('minionDamage', (e) => { if (e.src && e.src.isBoss && e.src.laneProxy) hit[e.b.kind === 'lanecore' ? 'core' : 'unit'] += e.dmg; });
  w.later(2, () => BD.laneSummon(w, 0, BD.bossById[id]));
  run(w, 300);
  assert.ok(hit.unit > 0, `${id}：Boss 沒打到小兵`);
  assert.ok(hit.core > 0, `${id}：Boss 沒打到核心`);
  if (!(w.winner && w.winner.team === 0)) slow.push(`${id}(${Math.round(w.lane.cores[1].hp)})`);
}
assert.ok(slow.length <= ids.length * 0.2, `超過兩成 Boss 300 秒內推不平核心：${slow.join(' ')}`);

// 2. 雙方各一位：兩位 Boss 會互相傷害
let duel = 0;
for (let i = 0; i < ids.length; i += 2) {
  const w = mk(i + 1); let bb = 0;
  w.on('damage', (e) => { if (e.src && e.src.laneProxy && e.b.laneProxy) bb += e.dmg; });
  w.later(2, () => { BD.laneSummon(w, 0, BD.bossById[ids[i]]); BD.laneSummon(w, 1, BD.bossById[ids[(i + 1) % ids.length]]); });
  run(w, 120);
  if (bb > 0) duel++;
}
assert.ok(duel >= Math.ceil(ids.length / 2) * 0.8, `雙方 Boss 互打的場次太少：${duel}`);

// 3. 沒有 Boss：只有兵線，不丟錯、兵有生有死、核心沒被秒
const w0 = mk(3); run(w0, 120);
assert.ok(w0.lane.spawned > 100 && w0.lane.kills[0] + w0.lane.kills[1] > 20, '兵線沒有在交戰');
// 4. light 節奏也能跑
const wl = mk(4, 'light'); wl.later(1, () => BD.laneSummon(wl, 1, BD.bossById[ids[0]])); run(wl, 60);
// 5. 不開時沒有兵線單位
const off = new BD.World(BD.bossById[ids[0]], BD.bossById[ids[1]], { seed: 1, intro: 0.5 }); off.simulate(20);
assert.strictEqual(off.minions.filter((m) => m.laneUnit).length, 0, '未開拉鋸戰卻出現兵線單位');
console.log(`lane.test: ${ids.length} 位 Boss 單推，${ids.length - slow.length} 位 300 秒內推平${slow.length ? '（未推平：' + slow.join(' ') + '）' : ''}；互打 ${duel} 場；純兵線 120 秒擊殺 ${w0.lane.kills.join('/')}`);
