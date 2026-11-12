// 拉鋸戰（opts.lane）無頭測試：經濟與建築規則；中途召喚的 Boss 會打敵方小兵與核心、雙方 Boss 會互打；
// AI 指揮官對打時雙方都會蓋建築、叫 Boss；全程不丟錯；不開時沒有兵線單位
'use strict';
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const ids = BD.bosses.map((b) => b.id), E = BD.LANE_ECON, UN = BD.LANE_UNITS;
const mk = (seed, ai, pace) => new BD.World(BD.bossById.dummy, BD.bossById.dummy, { seed, intro: 0, pace: pace || 'heavy', lane: true, laneAI: ai || [false, false] });
const run = (w, sec) => { for (let t = 0; t < sec * 60 && !w.over; t++) w.step(1 / 60); };

// 1. 經濟與建築規則
{
  const w = mk(1), L = w.lane;
  assert.strictEqual(L.gold[0], E.startGold, '開局金錢');
  assert.strictEqual(L.slots[0].filter(Boolean).length, 1, '開局送一座兵營');
  assert.strictEqual(BD.laneBuild(w, 0, 'lb_nope').ok, false, '不存在的建築不能蓋');
  assert.ok(BD.laneBuild(w, 0, 'lb_bank').ok, '錢夠應能蓋金庫');
  assert.strictEqual(L.gold[0], E.startGold - UN.lb_bank.cost, '蓋完要扣錢');
  const r = BD.laneBuild(w, 0, 'lb_altar');
  assert.ok(!r.ok && r.why === '金錢不足' && L.gold[0] === E.startGold - UN.lb_bank.cost, '錢不夠不能蓋、不扣錢');
  assert.strictEqual(BD.laneSummonBoss(w, 0, ids[0]).why, '需要先蓋召喚祭壇');
  BD.killMinion(w, L.slots[1].find(Boolean)); // 拆掉紅方唯一的兵營：重甲營要先有兵營，拆掉的人拿賞金
  L.gold[1] = 1e4;
  assert.strictEqual(BD.laneBuild(w, 1, 'lb_armory').why, '需要先蓋兵營');
  assert.strictEqual(L.gold[0], E.startGold - UN.lb_bank.cost + UN.lb_barracks.bounty, '拆建築給對方賞金');
  assert.ok(BD.laneBuild(w, 1, 'lb_altar').ok);
  const cost = BD.laneBossCost(BD.bossById[ids[0]]), before = L.gold[1];
  assert.ok(BD.laneSummonBoss(w, 1, ids[0]).ok, '有祭壇、錢夠應能召喚');
  assert.strictEqual(L.gold[1], before - cost, '召喚要扣錢');
  assert.strictEqual(BD.laneSummonBoss(w, 1, ids[1]).why, 'Boss 已達上限（祭壇數）');
  while (BD.laneBuild(w, 1, 'lb_bank').ok);
  assert.strictEqual(L.slots[1].filter(Boolean).length, E.slots, '建築格上限');
  const g0 = L.gold[0], inc = BD.laneIncome(w, 0);
  assert.strictEqual(inc, E.baseIncome + UN.lb_barracks.income + UN.lb_bank.income);
  run(w, E.incomeT + 0.1);
  assert.ok(L.gold[0] >= g0 + inc, `每 ${E.incomeT} 秒發收入（${g0} → ${L.gold[0]}，收入 ${inc}）`);
}

// 2. 單方 Boss：每位 Boss 都要能打小兵、打到核心
for (const id of ids) {
  const w = mk(1); const hit = { unit: 0, core: 0 };
  w.on('minionDamage', (e) => { if (e.src && e.src.isBoss && e.src.laneProxy) hit[e.b.kind === 'lanecore' ? 'core' : 'unit'] += e.dmg; });
  w.later(2, () => BD.laneSummon(w, 0, BD.bossById[id]));
  run(w, 300);
  assert.ok(hit.unit > 0, `${id}：Boss 沒打到小兵`);
  assert.ok(hit.core > 0, `${id}：Boss 沒打到核心`);
}

// 3. 雙方各一位：兩位 Boss 會互相傷害
let duel = 0;
for (let i = 0; i < ids.length; i += 2) {
  const w = mk(i + 1); let bb = 0;
  w.on('damage', (e) => { if (e.src && e.src.laneProxy && e.b.laneProxy) bb += e.dmg; });
  w.later(2, () => { BD.laneSummon(w, 0, BD.bossById[ids[i]]); BD.laneSummon(w, 1, BD.bossById[ids[(i + 1) % ids.length]]); });
  run(w, 120);
  if (bb > 0) duel++;
}
assert.ok(duel >= Math.ceil(ids.length / 2) * 0.8, `雙方 Boss 互打的場次太少：${duel}`);

// 4. AI 指揮官對打：雙方都會蓋建築、叫 Boss，不丟錯
const games = [];
for (const seed of [1, 2]) {
  const w = mk(seed, [true, true]); run(w, 420);
  const L = w.lane, n = [0, 1].map((t) => L.summoned.filter((b) => b.team === t).length);
  assert.ok(L.built[0] >= 5 && L.built[1] >= 5, `seed ${seed}：AI 蓋太少（${L.built}）`);
  assert.ok(n[0] >= 1 && n[1] >= 1, `seed ${seed}：雙方都要叫出 Boss（${n}）`);
  games.push(`${Math.round(w.time)}s 勝 ${w.winner ? (w.winner.team ? '紅' : '藍') : '-'} 建 ${L.built} Boss ${n}`);
}
// 5. light 節奏也能跑；預設紅方是 AI、藍方（玩家）不會自己蓋
const wl = new BD.World(BD.bossById.dummy, BD.bossById.dummy, { seed: 4, intro: 0, lane: true }); run(wl, 90);
assert.strictEqual(wl.lane.built[0], 0, '玩家方不該自動蓋'); assert.ok(wl.lane.built[1] > 0, '預設紅方 AI 要會蓋');
// 6. 不開時沒有兵線單位
const off = new BD.World(BD.bossById[ids[0]], BD.bossById[ids[1]], { seed: 1, intro: 0.5 }); off.simulate(20);
assert.strictEqual(off.minions.filter((m) => m.laneUnit).length, 0, '未開拉鋸戰卻出現兵線單位');
console.log(`lane.test: 規則 OK；${ids.length} 位 Boss 都打到小兵與核心；互打 ${duel} 場；AI 對打 ${games.join(' / ')}`);
