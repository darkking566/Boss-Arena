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
for (const mains of [null, { rin: 'hammer', mari: 'horn', yuzu: 'lance', selena: 'gunlance' }, { rin: 'switchaxe', mari: 'chargeblade', yuzu: 'glaive', selena: 'sns' }]) {
  const w = new BD.World(BD.Hunt4.team(mains), BD.bossById.ronin, { seed: 5, pace: 'heavy', hunt4: true, intro: 0.5 }), st = w.hunt4, b = st.boss;
  run(w, 1); b.controller.update = () => {}; for (const h of st.hunters) h.controller.update = () => {}; // 全員不自己行動，只放指定的招
  for (const h of st.hunters) {
    for (const id in h.h4.kv) {
      const s = h.h4.kv[id];
      if (s.guard || !s.actions.some((a) => a.do === 'hit') || (s.tags || []).includes('counter')) continue; // 防禦 / 架式要等對方出手；鬼人化 / 裝填沒有攻擊
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

// P6 第二批武器：大錘蓄力連段、狩獵笛旋律增益、長槍擋下就反擊、銃槍砲擊耗彈 / 裝填 / 固定傷害、主武器選擇
{
  const w = new BD.World(BD.Hunt4.team({ rin: 'hammer', mari: 'horn', yuzu: 'lance', selena: 'gunlance' }), BD.bossById.ronin, { seed: 8, pace: 'heavy', hunt4: true, intro: 0.5 });
  const st = w.hunt4, b = st.boss, [ham, horn, lance, gl] = st.hunters;
  assert.strictEqual(st.hunters.map((h) => h.def.weapon).join(), 'hammer,horn,lance,gunlance');
  assert.strictEqual(ham.h4.defs[1].weapon, 'katana', '換主武器後，招牌武器變副武器');
  run(w, 1);
  const pin = () => { b.x = 3000; b.y = 1800; if (b.state !== 'stun') b.setState('stun', 5); };
  const seen = []; b.x = 3000; b.y = 1800; ham.x = b.x - 90; ham.y = b.y; b.setState('stun', 6); ham.state = 'idle'; ham.sta = ham.maxSta;
  ham.startSkill(ham.h4.D.choose(ham, 60));
  for (let i = 0; i < 60 * 5; i++) { w.hitstop = 0; w.freezeF = 0; w.step(BD.STEP); if (ham.inst && seen[seen.length - 1] !== ham.inst.skill.id) seen.push(ham.inst.skill.id); pin(); }
  assert.strictEqual(seen.slice(0, 3).join(), 'ham_c1,ham_c2,ham_c3', '大錘蓄力連段：' + seen);
  // 狩獵笛：兩個紅音 → 攻擊強化給範圍內隊友
  const hd = horn.h4.drv; hd.notes = ['A', 'A']; horn.x = lance.x = b.x - 100; horn.y = b.y; lance.y = b.y + 60; horn.state = 'idle';
  horn.startSkill(horn.h4.kv.horn_play, { force: true }); run(w, 0.1);
  assert.ok(BD.hasStatus(horn, 'h4atk') && BD.hasStatus(lance, 'h4atk') && hd.notes.length === 0, '演奏攻擊強化');
  hd.notes = []; horn.state = 'idle'; horn.cancelSkill(); horn.startSkill(horn.h4.kv.horn_back, { force: true }); run(w, 0.05); assert.strictEqual(hd.notes.join(), 'C', '綠音記一個音符');
  // 長槍：一般防禦（不完美）擋下也接反擊突刺
  lance.cancelSkill(); lance.state = 'idle'; lance.sta = lance.maxSta; lance.startSkill(lance.h4.kv.lance_guard, { force: true }); run(w, 0.4);
  let hp = lance.hp; w.damageBoss(b, lance, { dmg: 120 }); assert.ok(hp - lance.hp > 0 && hp - lance.hp <= 120 * 0.12 + 1, '長槍防禦減傷 ' + (hp - lance.hp));
  run(w, 1); assert.ok(lance.lastSkillId === 'lance_counter' || (lance.inst && lance.inst.skill.id === 'lance_counter'), '擋下後反擊突刺');
  // 銃槍：砲擊耗彈、固定傷害（不吃肉質）；裝填補滿
  const gd = gl.h4.drv; gd.shells = 5;
  gl.cancelSkill(); gl.state = 'idle'; gl.x = b.x - 80; gl.y = b.y; gl.face = 0; b.setState('stun', 5); gl.startSkill(gl.h4.kv.gl_shell, { force: true });
  hp = b.hp; for (let i = 0; i < 40; i++) { w.hitstop = 0; w.freezeF = 0; w.step(BD.STEP); pin(); }
  assert.ok(gd.shells === 4 && b.hp < hp, '砲擊耗彈並造成傷害');
  const P = st.parts[0], hz0 = P.hz.cut; P.hz.cut = 0.1; hp = b.hp; BD.H4Combat.hit(w, st, gl, gl, b, { dmg: 62, fixed: true }, st.orig); const d1 = hp - b.hp;
  P.hz.cut = 0.9; hp = b.hp; BD.H4Combat.hit(w, st, gl, gl, b, { dmg: 62, fixed: true }, st.orig); P.hz.cut = hz0;
  assert.ok(d1 > 0 && Math.abs((hp - b.hp) / d1 - 1) < 0.2, `固定傷害不吃肉質 ${d1} ${hp - b.hp}`); // 世界傷害本身有 ±8% 亂數；沒有 fixed 時肉質 0.1 對 0.9 會差 9 倍
  gd.shells = 0; gl.cancelSkill(); gl.state = 'idle'; gl.startSkill(gl.h4.kv.gl_reload, { force: true }); run(w, 0.1); assert.strictEqual(gd.shells, 5, '裝填');
}

// P7 第三批武器：斬擊斧變形 / 斧槽 / 屬性解放、充能斧裝瓶 / 超解瓶爆 / 盾強化、操蟲棍精華 / 急襲突刺消耗
{
  const w = new BD.World(BD.Hunt4.team({ rin: 'switchaxe', mari: 'chargeblade', yuzu: 'glaive', selena: 'sns' }), BD.bossById.ronin, { seed: 8, pace: 'heavy', hunt4: true, intro: 0.5 });
  const st = w.hunt4, b = st.boss, [sa, cb, ig] = st.hunters;
  run(w, 1); b.controller.update = () => {}; for (const h of st.hunters) h.controller.update = () => {};
  const go = (h, id, sec) => { // 只跑指定秒數（不超過招式本身，避免接到下一招）
    h.cancelSkill(); h.state = 'idle'; h.x = 3000 - 70; h.y = 1800; h.face = 0; h.sta = h.maxSta; assert.ok(h.startSkill(h.h4.kv[id], { force: true }), id);
    for (let i = 0; i < Math.round(sec * 60); i++) { w.hitstop = 0; w.freezeF = 0; w.step(BD.STEP); b.x = 3000; b.y = 1800; if (b.state !== 'stun') b.setState('stun', 5); }
  };
  const sd = sa.h4.drv; sd.gauge = 50;
  go(sa, 'sa_morph', 0.05); assert.ok(sd.mode === 'sword' && sd.gauge === 38, '斬擊斧變劍、耗斧槽 ' + sd.gauge);
  sd.amp = 95; go(sa, 'sa_sw1', sa.h4.kv.sa_sw1.v1.dur); assert.ok(sd.amped && sa.dmgMul > sa.hunt.baseDmg, '劍命中 → 屬性解放、傷害提高');
  go(sa, 'sa_zsd', 0.05); assert.ok(!sd.amped, '零距離解放突刺消耗解放');
  const g0 = sd.gauge; go(sa, 'sa_axe1', 0.05); assert.ok(sd.mode === 'axe' && sd.gauge === g0 + 15, '斧招回斧槽');
  const cd = cb.h4.drv; cd.energy = 60; cd.phials = 0;
  go(cb, 'cb_charge', 0.05); assert.ok(cd.phials === 3 && cd.energy === 0, '充能斧裝瓶 ' + cd.phials);
  const saed = (n) => { cd.phials = n; const hp = b.hp; go(cb, 'cb_saed', cb.h4.kv.cb_saed.v1.dur); b.hp = Math.max(b.hp, b.maxHp * 0.6); return hp - b.hp; };
  const d0 = saed(0), d3 = saed(3); assert.ok(cd.phials === 0 && d3 - d0 > 150, `超解每瓶瓶爆 ${d0} ${d3}`);
  cd.phials = 2; cd.shieldUntil = 0; go(cb, 'cb_aed', 0.7);
  assert.ok(cd.phials === 0 && cd.shieldUntil > w.time && cd.guardChip === BD.HUNT4.CHARGE.shieldChip, '大解放斬耗瓶並盾強化');
  for (const c of ['red', 'white', 'orange']) BD.removeStatus(ig, 'h4' + c, 'test', w);
  for (let k = 0; k < 3; k++) go(ig, 'ig_kinsect', 0.05);
  assert.ok(['red', 'white', 'orange'].every((c) => BD.hasStatus(ig, 'h4' + c)), '獵蟲依序取得三色精華');
  go(ig, 'ig_dive', 0.05); assert.ok(!['red', 'white', 'orange'].some((c) => BD.hasStatus(ig, 'h4' + c)), '急襲突刺消耗精華');
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

// P5 裝備：配裝換算、武器特性 / 防具技能 / 套裝效果、不死之身、掉落與製作、存檔防呆
{
  const H = BD.H4Brain, GR = BD.H4Gear, save = H.newSave(), g = GR.gearOf(save, 'rin');
  g.w['katana:watcher'] = 2; for (const s of ['head', 'body', 'legs']) g.a[s + ':gundyr'] = 1;
  const yz = GR.gearOf(save, 'yuzu'); yz.w['db:thor'] = 1; yz.a['head:thor'] = 1; yz.a['body:thor'] = 1; yz.a['legs:thor'] = 1;
  const w = new BD.World(BD.Hunt4.team(), BD.bossById.ronin, { seed: 3, pace: 'heavy', hunt4: true, intro: 0.5, h4save: save }), st = w.hunt4, b = st.boss, [rin, , yuzu] = st.hunters;
  const E = rin.h4.gear;
  assert.ok(E.wt === 'exploit' && rin.h4.mod.el === 'dragon' && E.sk.guard === 3 && E.set === 'undying', '配裝換算 ' + JSON.stringify(E.eq));
  assert.ok(rin.h4.spec.sharp > BD.HUNT4.WEAPON_SPECS.katana.sharp, '武器等級提高銳利度上限');
  assert.ok(Math.abs(GR.takenMul(w, rin) - 0.82) < 1e-9, '耐震 3 級');
  run(w, 1);
  const P = st.parts[1]; b.state = 'idle'; const m0 = GR.atkMul(w, st, rin, P, 0.5); b.setState('stun', 3); const m1 = GR.atkMul(w, st, rin, P, 0.5);
  assert.ok(Math.abs(m1 / m0 - 1.2) < 1e-9, '狩影：Boss 暈眩時 +20%');
  rin.hp = 5; w.damageBoss(b, rin, { dmg: 9999, unblockable: true, ignoreIframe: true });
  assert.ok(rin.state !== 'dead' && rin.hp === 1, '不死之身'); rin.hp = 5; w.damageBoss(b, rin, { dmg: 9999, unblockable: true, ignoreIframe: true }); assert.strictEqual(rin.state, 'dead', '不死之身每場一次');
  st.parts[0].wound = st.parts[2].wound = w.time; let hp = b.hp; GR.onPop(w, st, yuzu, st.parts[0], st.orig);
  assert.ok(st.parts[2].wound === 0 && b.hp < hp, '連鎖雷');
  assert.strictEqual(yuzu.h4.gear.set, 'storm'); hp = b.hp; for (let i = 0; i < 15; i++) GR.onHit(w, st, yuzu, 1, st.orig); assert.ok(b.hp < hp, '雷神之怒落雷');
  w.winner = rin; st.parts[0].broken = true; GR.end(w, st);
  const m = g.mats.ronin; assert.ok(m && m.p === 1 && rin.h4.gear.got.s >= 2, '勝利掉落素材（含部位素材）');
  const clean = GR.sanitize({ mats: { ronin: { s: -5, p: 1e9 }, nobody: { s: 3 } }, w: { 'katana:ronin': 9, 'katana:nobody': 1, 'x:ronin': 1 }, a: { 'head:ronin': 2, 'arm:ronin': 1 }, rec: { 'katana:ronin': [5, 9], 'gs:zeus': [1, 1] } });
  assert.strictEqual(JSON.stringify(clean), JSON.stringify({ mats: { ronin: { s: 0, p: 999, g: 0 } }, w: { 'katana:ronin': 3 }, a: { 'head:ronin': 2 }, rec: { 'katana:ronin': [5, 1] }, eq: null }), '裝備防呆');
  assert.ok(H.sanitize(JSON.parse(JSON.stringify(save))).hunters.rin.gear.w['katana:watcher'] === 2, '學習存檔帶著裝備');
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
