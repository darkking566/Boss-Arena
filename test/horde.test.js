// 小兵潮（生存模式）無頭測試：每位 Boss 都能撐過一段時間不丟錯、雜兵數量隨時間增加且沒有上限、假人不可被打也不擋路、
// Boss 倒下時正確結算；不開時沒有雜兵
'use strict';
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const ids = BD.bosses.map((b) => b.id);
const mk = (id, seed) => new BD.World(BD.bossById[id], BD.bossById.dummy, { seed, intro: 0, pace: 'heavy', horde: true });
let peak = 0, over = 0;
for (let s = 0; s < ids.length; s += 3) {
  const w = mk(ids[s], s + 1);
  for (let t = 0; t < 150 * 60 && !w.winner; t++) w.step(1 / 60);
  const H = w.horde;
  assert.ok(H.spawned > 30 && H.kills > 0, `${ids[s]}：雜兵沒有湧出或沒被擊倒（spawned ${H.spawned} kills ${H.kills}）`);
  assert.ok(BD.getMod(w.bosses[1], 'untargetable'), '假人必須是不可選取');
  assert.ok(w.bosses[1].state !== 'dead' && w.bosses[1].hp === w.bosses[1].maxHp, '假人不該受傷');
  assert.strictEqual(w.bosses[0].stats.breaks, 0, `${ids[s]}：不該架勢崩潰`);
  if (w.winner) { assert.strictEqual(w.winner, w.bosses[1]); over++; }
  peak = Math.max(peak, H.peak);
}
// 無上限：每波數量只隨時間增加，不看場上數量
const w = mk(ids[0], 1); w.bosses[0].hp = w.bosses[0].maxHp = 1e9; // 讓 Boss 撐久一點，只量生成數
let a = 0, b = 0;
for (let t = 0; t < 150 * 60; t++) { w.step(1 / 60); if (t === 50 * 60) a = w.horde.spawned; }
b = w.horde.spawned - a;
assert.ok(b > a * 2, `後 100 秒生成量應遠大於前 50 秒（前 ${a} / 後 ${b}）`);
assert.ok(w.horde.peak > 24, `場上雜兵峰值 ${w.horde.peak} 應超過舊的每隊 24 上限`);
const off = new BD.World(BD.bossById[ids[0]], BD.bossById[ids[1]], { seed: 1, intro: 0.5 });
off.simulate(20);
assert.strictEqual(off.minions.filter((m) => m.grunt).length, 0, '未開小兵潮卻出現雜兵');
console.log(`horde.test: 峰值 ${peak}，${over} 場被淹沒；無敵 Boss 150 秒共生成 ${w.horde.spawned} 隻（峰值 ${w.horde.peak}）`);
