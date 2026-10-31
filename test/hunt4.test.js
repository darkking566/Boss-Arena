// 狩獵模式（4v1）無頭測試：建隊、Boss 放大、仇恨換目標、力竭 / 歸隊 / 失敗、整場分出勝負、同種子可重現
'use strict';
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const H4 = BD.HUNT4;
const make = (id, seed) => new BD.World(BD.Hunt4.team(), BD.bossById[id], { seed, pace: 'heavy', hunt4: true, intro: 0.5 });
const run = (w, sec) => { for (let i = 0; i < sec * 60 && !w.over; i++) { w.hitstop = 0; w.freezeF = 0; w.step(BD.STEP); } };

// 建隊與放大
{
  const w = make('ronin', 1), st = w.hunt4;
  assert.strictEqual(st.hunters.length, 4);
  assert.strictEqual(new Set(st.hunters.map((h) => h.name)).size, 4, '四位獵人名字不重複');
  for (const h of st.hunters) assert.ok(h.maxSpirit > 0 && h.hunt.hpPotions > 0, h.name + ' 沒有套上太刀邏輯 / 藥水');
  assert.strictEqual(st.boss.maxHp, Math.round(BD.applyPace(BD.bossById.ronin, 'heavy').maxHp * H4.BOSS_HP_MUL), 'Boss 生命放大');
  assert.ok(st.hunters.every((h) => h.enemy === st.boss), '獵人目標都是 Boss');
}

// 力竭 → 歸隊；用完次數 → 失敗
{
  const w = make('ronin', 2), st = w.hunt4, [a, b] = st.hunters;
  run(w, 1);
  w.damageBoss(st.boss, a, { dmg: 99999, unblockable: true, undodgeable: true, noPerfect: true });
  assert.ok(a.state === 'dead' && st.faints === 1 && !w.winner, '第一次力竭不結束');
  run(w, H4.REVIVE + 0.5);
  assert.ok(a.state !== 'dead' && a.hp > a.maxHp * 0.5, '力竭後歸隊');
  for (let k = 0; k < H4.CARTS - 1; k++) { b.hp = 1; b.state = 'idle'; b.statuses = []; w.damageBoss(st.boss, b, { dmg: 99999, unblockable: true, undodgeable: true, noPerfect: true }); }
  assert.ok(w.winner === st.boss, '力竭次數用完 → 狩獵失敗');
}

// 整場：分出勝負、Boss 換過目標、同種子結果相同
let wins = 0;
const ids = ['magmus', 'ronin', 'thor', 'deviljho', 'margit', 'zeus'];
for (const id of ids) {
  const w = make(id, 7), st = w.hunt4, seen = new Set();
  for (let i = 0; i < 1000 * 60 && !w.over; i++) { w.hitstop = 0; w.freezeF = 0; w.step(BD.STEP); if (st.boss._target) seen.add(st.boss._target); }
  assert.ok(w.winner, id + ' 未分出勝負');
  assert.ok(seen.size >= 2, id + ' Boss 從頭到尾只打一個人');
  if (w.winner.team === 0) wins++;
  const w2 = make(id, 7); run(w2, 1000);
  assert.strictEqual(w2.time.toFixed(3) + w2.hunt4.faints, w.time.toFixed(3) + st.faints, id + ' 同種子結果不同');
}
console.log(`hunt4.test: PASS（${ids.length} 場，獵人勝 ${wins}）`);
