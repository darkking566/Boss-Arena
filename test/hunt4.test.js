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

// P2 共通系統（直接呼叫 w.damageBoss，Boss 面向 +x：前方＝頭、側面＝腳、後方＝尾）
{
  const w = make('ronin', 3), st = w.hunt4, b = st.boss, [rin, mari, yuzu, sel] = st.hunters;
  run(w, 1);
  const place = (h, ang) => { b.x = 3000; b.y = 1800; b.face = 0; b.state = 'idle'; h.x = b.x + Math.cos(ang) * 90; h.y = b.y + Math.sin(ang) * 90; };
  const dmgAt = (h, ang) => { place(h, ang); const hp = b.hp; w.damageBoss(h, b, { dmg: 100, posture: 0 }); return hp - b.hp; };
  const head = dmgAt(mari, 0), body = dmgAt(mari, Math.PI * 0.7);
  assert.ok(head > body * 1.3, `肉質：頭 ${head} 應明顯高於身體 ${body}`);
  assert.ok(mari.h4.sharp === mari.h4.spec.sharp - 1 - BD.HUNT4.SHARP.hardCost, '銳利度：軟肉扣 1、硬肉扣 hardCost');
  mari.h4.sharp = 1; const dull = dmgAt(mari, 0);
  assert.ok(dull < head * 0.8, `鈍刀傷害較低（${dull} vs ${head}）`);
  // 傷口 → 集中弱點攻擊打破
  const P = st.parts.find((x) => x.id === 'legs');
  for (let i = 0; i < 40 && !P.wound; i++) dmgAt(rin, Math.PI / 2);
  assert.ok(P.wound, '腳累積傷害後開傷口');
  place(rin, 0); w.damageBoss(rin, b, { dmg: 50, posture: 0, focus: true });
  assert.ok(!P.wound && P.scarUntil > w.time && rin.stats.h4.pops === 1, '集中弱點攻擊打破傷口並留下疤');
  for (let i = 0; i < 60 && !P.broken; i++) dmgAt(rin, Math.PI / 2);
  assert.ok(P.broken && rin.stats.h4.breaks === 1, '腳部位破壞');
  assert.ok(st.flinches > 0, '累積傷害造成怯');
  // 異常：毒 / 麻痺
  st.ail.poison.acc = st.ail.poison.at; for (let i = 0; i < 20 && !(st.poisonT > 0); i++) dmgAt(yuzu, 0);
  assert.ok(st.poisonT > 0 && st.ail.poison.at > BD.HUNT4.AILMENTS.poison.at, '毒觸發、門檻上升');
  st.ail.paralysis.acc = st.ail.paralysis.at; for (let i = 0; i < 20 && !st.ail.paralysis.procs; i++) dmgAt(sel, 0);
  assert.ok(st.ail.paralysis.procs === 1 && b.state === 'stun', '麻痺觸發 → Boss 無法行動');
  // 單一重擊不會打倒 Boss；架勢崩潰才倒地
  b.state = 'idle'; w.damageBoss(mari, b, { dmg: 900, posture: 0, kb: 900 }); run(w, 0.05);
  assert.ok(b.state !== 'knockdown', '單一重擊不倒地');
  b.state = 'idle'; b.posture = b.maxPosture; w.damageBoss(mari, b, { dmg: 10, posture: 10 }); run(w, 0.05);
  assert.ok(b.state === 'knockdown' && st.topples === 1, '架勢崩潰 → 倒地');
}
// 換武器：凜（太刀 / 弓）血少又被追 → 換弓；Boss 倒地且過了 6 秒 → 換回太刀
{
  const w = make('ronin', 4), st = w.hunt4, b = st.boss, rin = st.hunters[0];
  run(w, 1);
  assert.ok(rin.h4.defs[1] && rin.h4.defs[1].weapon === 'bow', '凜帶著弓');
  rin.hp = rin.maxHp * 0.3; rin.h4.items.flash = 0; rin.hunt.hpPotions = 0; b._target = rin; st.switchT = 1e9; rin.state = 'idle';
  run(w, 0.3);
  assert.ok(rin.def.weapon === 'bow' && rin.skills.some((s) => s.id === 'w_shot'), '換成弓');
  run(w, 7); b.state = 'idle'; b.posture = b.maxPosture; w.damageBoss(st.hunters[1], b, { dmg: 10, posture: 10 }); run(w, 3);
  assert.ok(rin.def.weapon === 'katana' && rin.maxSpirit > 0, '倒地時換回太刀');
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
