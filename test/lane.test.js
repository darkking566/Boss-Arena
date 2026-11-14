// 拉鋸戰（opts.lane）無頭測試：經濟與建築規則；中途召喚的 Boss 會打敵方小兵與核心、雙方 Boss 會互打；
// AI 指揮官對打時雙方都會蓋建築、叫 Boss；全程不丟錯；不開時沒有兵線單位
'use strict';
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const ids = BD.bosses.map((b) => b.id), E = BD.LANE_ECON, UN = BD.LANE_UNITS;
const U_dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
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
  L.gold[1] = 1e5;
  assert.ok(BD.laneSummonBoss(w, 1, ids[1]).ok && BD.laneSummonBoss(w, 1, ids[2]).ok, '一座祭壇、Boss 數量不設上限');
  for (let i = 0; i < 30; i++) assert.ok(BD.laneBuild(w, 1, 'lb_bank').ok, '建築數量不設上限');
  const pos = new Set(L.slots[1].filter(Boolean).map((m) => Math.round(m.x) + ',' + Math.round(m.y)));
  assert.strictEqual(pos.size, L.slots[1].filter(Boolean).length, '每座建築位置不重疊');
  // 升級：扣錢、等級與生命上升、產出 × 等級；祭壇不能升級；滿級擋下
  const bank = L.slots[1].find((m) => m && m.kind === 'lb_bank'), inc1 = BD.laneIncome(w, 1), g1 = L.gold[1], hp1 = bank.maxHp;
  assert.ok(BD.laneUpgrade(w, 1, bank).ok && bank.lv === 2 && L.gold[1] === g1 - UN.lb_bank.cost && bank.maxHp > hp1, '升級 Lv2');
  assert.strictEqual(BD.laneIncome(w, 1), inc1 + UN.lb_bank.income, '金庫 Lv2 收入翻倍');
  assert.ok(BD.laneUpgrade(w, 1, bank).ok && bank.lv === 3);
  assert.strictEqual(BD.laneUpgrade(w, 1, bank).why, '已經是最高等級');
  assert.ok(!BD.laneUpgrade(w, 1, L.slots[1].find((m) => m && m.kind === 'lb_altar')).ok, '祭壇不能升級');
  assert.ok(!BD.laneUpgrade(w, 0, bank).ok && !BD.laneSell(w, 0, bank).ok, '不能動對方的建築');
  // 拆除：退一半投入、空出格子（下一座蓋回那格）、不給對方賞金
  const g2 = L.gold[1], back = BD.laneSellValue(bank), slot = bank.slot, enemyGold = L.gold[0];
  assert.strictEqual(back, Math.floor(UN.lb_bank.cost * (1 + E.upMul[1] + E.upMul[2]) * E.sellBack));
  assert.ok(BD.laneSell(w, 1, bank).ok && !bank.alive && L.gold[1] === g2 + back && L.gold[0] === enemyGold, '拆除退錢、不給賞金');
  assert.ok(BD.laneBuild(w, 1, 'lb_tower').ok && L.slots[1][slot] && L.slots[1][slot].kind === 'lb_tower', '拆掉的空格會先被補上');
  const g0 = L.gold[0], inc = BD.laneIncome(w, 0);
  assert.strictEqual(inc, Math.round((E.baseIncome + UN.lb_barracks.income + UN.lb_bank.income) * (1 + BD.laneCatchUp(w, 0))), "收入（含落後補助）");
  run(w, E.incomeT + 0.1);
  assert.ok(L.gold[0] >= g0 + inc, `每 ${E.incomeT} 秒發收入（${g0} → ${L.gold[0]}，收入 ${inc}）`);
}

// 2. 單方 Boss：每位 Boss 都要能打小兵、打到核心（先拆掉紅方的兵營，只剩核心每波一名步兵，看的是索敵不是強弱）
let coreHit = 0;
for (const id of ids) {
  const w = mk(1); const hit = { unit: 0, core: 0 };
  w.on('minionDamage', (e) => { if (e.src && e.src.isBoss && e.src.laneProxy) hit[e.b.kind === 'lanecore' ? 'core' : 'unit'] += e.dmg; });
  w.later(2, () => { BD.killMinion(w, w.lane.slots[1].find(Boolean)); BD.laneSummon(w, 0, BD.bossById[id]); });
  run(w, 300);
  assert.ok(hit.unit > 0, `${id}：Boss 沒打到小兵`);
  if (hit.core > 0) coreHit++;
}
assert.ok(coreHit >= ids.length * 0.9, `打到核心的 Boss 太少：${coreHit}/${ids.length}（核心會反擊，脆的 Boss 可能在射程邊緣就倒下）`);

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

// 3b. 克制：場上有敵方 Boss 時，AI 從勝率表前 3 名裡挑
{
  const w = mk(3), T = BD.LANE_COUNTER, foe = ids[0];
  assert.ok(T && T[ids[1]] && T[ids[1]][foe] != null, '克制表要有資料（node test/lane_counter.js）');
  BD.laneSummon(w, 1, BD.bossById[foe]); w.lane.gold[0] = 1e5; // 錢夠：每位都在可挑範圍
  const rank = ids.slice().sort((a, b) => ((T[b] && T[b][foe] != null ? T[b][foe] : 0.5) - (T[a] && T[a][foe] != null ? T[a][foe] : 0.5)) || (a < b ? -1 : 1));
  for (let i = 0; i < 20; i++) assert.ok(rank.slice(0, 3).includes(BD.lanePickBoss(w, 0, ids)), '應挑克制的 Boss');
  w.lane.gold[0] = 0; const cheap = BD.lanePickBoss(w, 0, ids);
  assert.ok(BD.laneBossCost(BD.bossById[cheap]) <= 2 * BD.laneIncome(w, 0) || BD.laneBossCost(BD.bossById[cheap]) <= Math.min(...ids.map((id) => BD.laneBossCost(BD.bossById[id]))) + 200, '沒錢時要挑付得起 / 便宜的');
}
// 3c. 加時：otAt 前不動；之後雙方核心持續崩落、兵傷害倍率上升，血少的一方先倒（不再有兵的僵局也會分出勝負）
{
  const w = mk(5), L = w.lane;
  w.minions.forEach((m) => { if (m.laneUnit && !BD.LANE_UNITS[m.kind].static) m.alive = false; });
  w.on('think', () => { for (const m of w.minions) if (m.alive && m.laneUnit && !BD.LANE_UNITS[m.kind].static) m.alive = false; }); // 清掉所有兵：純看加時
  run(w, E.otAt - 1);
  assert.ok(L.cores.every((c) => c.hp === c.maxHp) && L.otMul === 1, '加時前核心不掉血');
  L.cores[1].hp -= 1000;
  run(w, 400);
  assert.ok(w.winner && w.winner.team === 0, '加時要分出勝負，血少的紅方先倒');
  assert.ok(w.time < E.otAt + 200, `加時太久才結束：${Math.round(w.time)}s`);
  assert.ok(L.otMul > 1, '兵傷害倍率要上升');
}
// 3d. 落後補助：建築總投入落後的一方收入加成（最多 catchUp）；領先方沒有
{
  const w = mk(6), L = w.lane;
  assert.strictEqual(BD.laneCatchUp(w, 0), 0, '開局雙方相同沒有補助');
  L.gold[1] = 1e5; for (let i = 0; i < 9; i++) BD.laneBuild(w, 1, 'lb_barracks'); // 紅方 10 座、藍方 1 座
  assert.strictEqual(BD.laneCatchUp(w, 1), 0, '領先方沒有補助');
  assert.ok(Math.abs(BD.laneCatchUp(w, 0) - E.catchUp) < 1e-9, '落後很多時補助到上限');
  assert.strictEqual(BD.laneIncome(w, 0), Math.round((E.baseIncome + UN.lb_barracks.income) * (1 + E.catchUp)));
}
// 3e. 核心危機反擊：掉過門檻各爆一次，清掉附近敵兵、Boss 扣血、送出援軍；同一門檻不重複
{
  const w = mk(7), L = w.lane, c = L.cores[0];
  run(w, 1);
  const foe = BD.laneSummon(w, 1, BD.bossById[ids[0]]); foe.x = c.x + 300; foe.y = c.y;
  for (let i = 0; i < 6; i++) BD.spawnMinion(w, L.anchors[1], 'laneheavy', i, 6);
  for (const m of w.minions) if (m.alive && m.team === 1 && m.kind === 'laneheavy') { m.x = c.x + 200; m.y = c.y + (m.y % 60); }
  const hp0 = foe.hp, mine0 = w.minions.filter((m) => m.alive && m.team === 0 && m.kind === 'laneheavy').length;
  c.hp = c.maxHp * 0.6; // 一次掉過 75%：只到第 1 檔（50% 還沒到）
  run(w, 0.1);
  assert.strictEqual(L.crisis[0], 1, '掉過 75% 觸發一次');
  assert.ok(!w.minions.some((m) => m.alive && m.team === 1 && m.kind === 'laneheavy' && U_dist(m, c) < E.blastR - 50), '附近敵兵被清掉');
  assert.ok(foe.hp < hp0, '附近敵方 Boss 要扣血');
  assert.strictEqual(w.minions.filter((m) => m.alive && m.team === 0 && m.kind === 'laneheavy').length, mine0 + E.blastWave.laneheavy, '送出援軍');
  run(w, 1); assert.strictEqual(L.crisis[0], 1, '同一門檻不重複');
  c.hp = c.maxHp * 0.2; run(w, 0.1);
  assert.strictEqual(L.crisis[0], 3, '一下掉過兩檔就連爆兩次');
}
// 3f. 建築碰撞：兵被推出建築 / 核心；擋在建築正後方的兵會繞過去，不會卡住
{
  const w = mk(8), L = w.lane, bld = L.slots[0].find(Boolean);
  L.spawnFrom = bld; const m = BD.spawnMinion(w, L.anchors[0], 'lanemelee', 0, 1); L.spawnFrom = null;
  m.x = bld.x + 3; m.y = bld.y; run(w, 0.2);
  assert.ok(U_dist(m, bld) >= m.r + bld.r - 1, '兵要被推出建築');
  L.spawnFrom = bld; const b2 = BD.spawnMinion(w, L.anchors[0], 'lanemelee', 0, 1); L.spawnFrom = null;
  b2.x = bld.x - bld.r - b2.r - 2; b2.y = bld.y; // 建築擋在它往敵方核心的正前方
  const x0 = b2.x; run(w, 4);
  assert.ok(b2.alive && b2.x > bld.x + bld.r, `兵卡在建築後面（${Math.round(x0)} → ${Math.round(b2.x)}）`);
}
// 3g. 左右對稱：同一場對打左右鏡像後，結果要逐一相同（推擠若邊推邊移，會依格子處理順序往 −x 飄，讓左邊那隊佔便宜）
let symRes = [];
for (const seed of [1, 2, 3]) {
  const res = [false, true].map((mir) => {
    const w = mk(seed), L = w.lane, mid = (L.home[0].x + L.home[1].x) / 2, y = L.home[0].y;
    for (const m of L.slots.flat()) if (m) BD.killMinion(w, m);
    if (mir) { L.home.reverse(); for (const c of L.cores) c.x = 2 * mid - c.x; }
    for (let i = 0; i < 6; i++) for (const t of [0, 1]) for (const k of ['lanemelee', 'lanerange']) {
      const side = (t ? 1 : -1) * (mir ? -1 : 1); L.spawnFrom = { x: mid + side * 300, y }; BD.spawnMinion(w, L.anchors[t], k, i, 6).x = mid + side * 250;
    }
    L.spawnFrom = null;
    for (let f = 0; f < 20 * 60; f++) { w.step(1 / 60); for (const m of w.minions) if (m.alive && m.kind === 'lanemelee' && m.t < 0.02 && U_dist(m, L.cores[m.team]) < 200) m.alive = false; } // 不讓核心新生的兵加入
    return [0, 1].map((t) => w.minions.filter((m) => m.alive && m.team === t && !UN[m.kind].static).length).join(':');
  });
  assert.strictEqual(res[1], res[0], `seed ${seed}：左右鏡像後結果不同（${res[0]} vs ${res[1]}）`);
  symRes.push(res[0]);
}
// 3h. AI 拆除：自家建築快被拆、旁邊有敵人時自己拆掉（退一半、對方沒賞金）；沒有敵人不拆；玩家方不會自動拆
{
  const w = mk(9, [true, true]), L = w.lane;
  L.cmd[0].goal = L.cmd[1].goal = { build: 'lb_bank' }; L.gold = [0, 0]; // 讓 AI 這段時間不花錢，方便對帳
  const bld = L.slots[1].find(Boolean); bld.hp = bld.maxHp * 0.1;
  run(w, 0.1);
  assert.ok(bld.alive, '旁邊沒敵人時不拆');
  L.spawnFrom = { x: bld.x - 60, y: bld.y }; BD.spawnMinion(w, L.anchors[0], 'lanemelee', 0, 1); L.spawnFrom = null;
  const g0 = L.gold.slice(), back = BD.laneSellValue(bld);
  run(w, 2 / 60);
  assert.ok(!bld.alive && L.gold[1] >= g0[1] + back && L.gold[0] === g0[0], 'AI 拆掉快死的建築：退錢、藍方沒拿到賞金');
  const w2 = mk(9, [false, true]), mine = w2.lane.slots[0].find(Boolean); mine.hp = mine.maxHp * 0.1;
  w2.lane.spawnFrom = { x: mine.x + 60, y: mine.y }; BD.spawnMinion(w2, w2.lane.anchors[1], 'lanemelee', 0, 1); w2.lane.spawnFrom = null;
  run(w2, 2 / 60);
  assert.ok(mine.alive, '玩家方的建築不會被自動拆');
}
// 4. AI 指揮官對打：雙方都會蓋建築、叫 Boss，不丟錯
const games = [];
for (const seed of [1, 2]) {
  const w = mk(seed, [true, true]); run(w, 420);
  const L = w.lane, n = [0, 1].map((t) => L.summoned.filter((b) => b.team === t).length);
  assert.ok(L.built[0] >= 5 && L.built[1] >= 5, `seed ${seed}：AI 蓋太少（${L.built}）`);
  assert.ok(n[0] + n[1] >= 2 && Math.max(...n) >= 1, `seed ${seed}：AI 要會叫 Boss（${n}）`); // 落後方可能在付得起之前就輸（滾雪球），不要求雙方都叫
  games.push(`${Math.round(w.time)}s 勝 ${w.winner ? (w.winner.team ? '紅' : '藍') : '-'} 建 ${L.built} Boss ${n}`);
}
// 5. light 節奏也能跑；預設紅方是 AI、藍方（玩家）不會自己蓋
const wl = new BD.World(BD.bossById.dummy, BD.bossById.dummy, { seed: 4, intro: 0, lane: true }); run(wl, 90);
assert.strictEqual(wl.lane.built[0], 0, '玩家方不該自動蓋'); assert.ok(wl.lane.built[1] > 0, '預設紅方 AI 要會蓋');
// 6. 不開時沒有兵線單位
const off = new BD.World(BD.bossById[ids[0]], BD.bossById[ids[1]], { seed: 1, intro: 0.5 }); off.simulate(20);
assert.strictEqual(off.minions.filter((m) => m.laneUnit).length, 0, '未開拉鋸戰卻出現兵線單位');
console.log(`lane.test: 規則 OK；左右鏡像一致 ${symRes.join(' ')}；${ids.length} 位 Boss 都打到小兵、${coreHit} 位打到核心；互打 ${duel} 場；AI 對打 ${games.join(' / ')}`);
