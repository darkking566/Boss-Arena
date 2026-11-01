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
  assert.strictEqual(st.hunters.map((h) => h.def.weapon).join(), 'katana,gs,db,sns', '四人主武器');
  for (const h of st.hunters) assert.ok(h.h4.D && h.hunt.hpPotions > 0, h.name + ' 沒有武器驅動 / 藥水');
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

// P3 武器：每一招（含連段變體、集中弱點攻擊、額外招）都能施放並打到身旁的 Boss
{
  const w = make('ronin', 5), st = w.hunt4, b = st.boss;
  run(w, 1); b.controller.update = () => {}; for (const h of st.hunters) h.controller.update = () => {}; // 全員不自己行動，只放指定的招
  for (const h of st.hunters) {
    for (const id in h.h4.kv) {
      const s = h.h4.kv[id];
      if (s.guard || id === 'db_demon' || (s.tags || []).includes('counter')) continue; // 防禦 / 架式要等對方出手
      b.x = 3000; b.y = 1800; b.state = 'idle'; b.statuses = b.statuses.filter((x) => x.id === 'kdGuard'); h.x = b.x - 60 - 0.8 * Math.max(0, ...s.actions.map((a) => (a.do === 'dash' ? a.dist : 0))); h.y = b.y; // 突進招站遠一點 h.face = 0; h.state = 'idle'; h.spirit = 100; h.sta = h.maxSta;
      const hp = b.hp; assert.ok(h.startSkill(s, { force: true }), `${h.name} ${id} 無法施放`);
      for (let k = 0; k < ((s.v1.dur || 1) + 0.1) * 60; k++) { w.hitstop = 0; w.freezeF = 0; w.step(BD.STEP); b.x = 3000; b.y = 1800; } // 釘住 Boss（不被碰撞推開）
      assert.ok(b.hp < hp || w.winner, `${h.name} ${id} 沒打到 Boss`);
      b.hp = Math.max(b.hp, b.maxHp * 0.6);
    }
  }
}
// 大劍：Boss 有破綻 → 蓄力 → 強蓄力 → 真蓄力；鐵壁衝撞減傷、相殺、力量對抗
{
  const w = make('ronin', 6), st = w.hunt4, b = st.boss, mari = st.hunters[1];
  run(w, 1);
  const seen = [];
  b.x = 3000; b.y = 1800; mari.x = b.x - 90; mari.y = b.y; b.setState('stun', 6); mari.state = 'idle';
  mari.startSkill(mari.h4.D.choose(mari, 60));
  for (let i = 0; i < 60 * 5; i++) { w.hitstop = 0; w.freezeF = 0; w.step(BD.STEP); if (mari.inst && seen[seen.length - 1] !== mari.inst.skill.id) seen.push(mari.inst.skill.id); b.x = 3000; b.y = 1800; if (b.state !== 'stun') b.setState('stun', 5); }
  assert.strictEqual(seen.slice(0, 3).join(), 'gs_c1,gs_c2,gs_true', '大劍蓄力連段：' + seen);
  const tk = mari.h4.kv.gs_tackle;
  mari.state = 'idle'; mari.startSkill(tk, { force: true }); mari.inst.t = 0.4; let hp = mari.hp; w.damageBoss(b, mari, { dmg: 100 });
  assert.ok(hp - mari.hp > 0 && hp - mari.hp < 70, '鐵壁衝撞減傷 ' + (hp - mari.hp));
  b.setState('idle', 0); mari.cancelSkill(); mari.state = 'idle'; mari.startSkill(tk, { force: true }); mari.inst.t = 0.1; hp = mari.hp;
  assert.strictEqual(w.damageBoss(b, mari, { dmg: 60 }), 'deflected'); assert.ok(mari.hp === hp && b.state === 'stagger' && mari.stats.h4.offsets === 1, '相殺：免傷、Boss 硬直');
  b.setState('idle', 0); b.startSkill(b.skills[0], { force: true }); mari.cancelSkill(); mari.state = 'idle'; mari.startSkill(tk, { force: true }); mari.inst.t = 0.1;
  w.damageBoss(b, mari, { dmg: 200 }); assert.ok(mari.stats.h4.clashes === 1, '大招式相殺 → 力量對抗');
  run(w, 1.5); assert.ok(b.state === 'knockdown' || mari.hp < hp, '力量對抗有結果');
}
// 雙刀：鬼人化耗體力、鬼人槽累積、體力見底解除時槽滿 → 鬼人強化
{
  const w = make('ronin', 7), st = w.hunt4, b = st.boss, yuzu = st.hunters[2], s = () => yuzu.h4.drv;
  run(w, 1); yuzu.state = 'idle'; yuzu.sta = yuzu.maxSta;
  yuzu.startSkill(yuzu.h4.kv.db_demon, { force: true }); run(w, 0.3);
  assert.ok(s().demon, '鬼人化');
  const sta = yuzu.sta; run(w, 1); assert.ok(yuzu.sta < sta, '鬼人化耗體力');
  s().gauge = 99; b.x = 3000; b.y = 1800; yuzu.x = b.x - 60; yuzu.y = b.y; yuzu.face = 0; yuzu.state = 'idle'; yuzu.startSkill(yuzu.h4.kv.db_d1, { force: true }); run(w, 0.5);
  assert.ok(s().gauge >= 100, '命中累積鬼人槽');
  yuzu.sta = 1; run(w, 0.1); assert.ok(!s().demon && s().arch, '體力見底 → 鬼人強化');
}
// 片手劍：完美防禦免傷並接反擊；一般防禦減傷
{
  const w = make('ronin', 8), st = w.hunt4, b = st.boss, sel = st.hunters[3];
  run(w, 1); sel.state = 'idle'; sel.startSkill(sel.h4.kv.sns_guard, { force: true }); run(w, 0.05);
  let hp = sel.hp; assert.strictEqual(w.damageBoss(b, sel, { dmg: 120 }), 'deflected'); assert.ok(sel.hp === hp && sel.h4.drv.counter, '完美防禦');
  run(w, 1); assert.ok(sel.lastSkillId === 'sns_counter' || (sel.inst && sel.inst.skill.id === 'sns_counter'), '完美防禦後反擊');
  sel.cancelSkill(); sel.state = 'idle'; sel.startSkill(sel.h4.kv.sns_guard, { force: true }); run(w, 0.4); hp = sel.hp; sel.sta = sel.maxSta;
  w.damageBoss(b, sel, { dmg: 120 }); assert.ok(hp - sel.hp > 0 && hp - sel.hp < 60, '一般防禦減傷 ' + (hp - sel.hp));
}

// P4 獵人大腦：存檔防呆、學習會寫進存檔、同存檔 + 同種子結果相同、熟練度隨場數上升
{
  const H = BD.H4Brain, bad = H.sanitize({ v: H.V, matches: 'x', hunters: { rin: { xp: { katana: 1e9 }, strat: { katana: { k: { go: [999, NaN] } } }, dex: { x: 5 } }, evil: {} } });
  assert.strictEqual(bad.matches, 0); assert.strictEqual(bad.hunters.rin.xp.katana, 1e5); assert.strictEqual(bad.hunters.rin.strat.katana.k.go.join(), '200,-10');
  assert.ok(!bad.hunters.evil && !bad.hunters.rin.dex.x, '未知欄位要丟掉');
  assert.strictEqual(H.sanitize(null).matches, 0); assert.strictEqual(H.sanitize({ v: 99 }).matches, 0);
  const save = H.newSave(), m0 = H.mastery(save, 'rin', 'katana');
  const fight = (sv) => { const w = new BD.World(BD.Hunt4.team(), BD.bossById.ronin, { seed: 5, pace: 'heavy', hunt4: true, intro: 0.5, h4save: sv }); run(w, 1000); return w; };
  const snap = JSON.stringify(save), w = fight(save);
  assert.ok(w.over && save.matches === 1 && save.hunters.rin.xp.katana === 1 && save.hunters.rin.dex.ronin.fights === 1, '一場結束要寫回存檔');
  assert.ok(Object.keys(save.hunters.mari.strat.gs).length > 0 && Object.keys(save.hunters.rin.dex.ronin.sk).length > 0, '武器策略 / 圖鑑有學到東西');
  assert.ok(H.mastery(save, 'rin', 'katana') > m0, '熟練度上升');
  const a = JSON.parse(snap), b = JSON.parse(snap), wa = fight(a), wb = fight(b);
  assert.strictEqual(wa.time.toFixed(3) + JSON.stringify(a), wb.time.toFixed(3) + JSON.stringify(b), '同存檔 + 同種子結果不同');
  const cl = H.sanitize(JSON.parse(JSON.stringify(save))); // 合法存檔經防呆後內容不變（欄位順序可能不同）
  assert.strictEqual(JSON.stringify(H.dexInfo(cl, 'yuzu', 'ronin')) + H.mastery(cl, 'yuzu', 'db') + cl.hunters.mari.strat.gs['mid|atk'].go, JSON.stringify(H.dexInfo(save, 'yuzu', 'ronin')) + H.mastery(save, 'yuzu', 'db') + save.hunters.mari.strat.gs['mid|atk'].go, '合法存檔經防呆後不變');
  assert.ok(H.dexInfo(save, 'rin', 'ronin').all > 0 && H.dexInfo(save, 'rin', 'nobody').fights === 0);
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
