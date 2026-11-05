// 狩獵模式（4v1）無頭測試：建隊、Boss 放大、仇恨換目標、力竭 / 歸隊 / 失敗、整場分出勝負、同種子可重現
'use strict';
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const H4 = BD.HUNT4;
const grow = (b) => b.r - b.def.radius; // Boss 放大（BOSS_SIZE）多出的半徑：獵人站位跟著往外移
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
  // 控制後先出一招：剛從麻痺恢復、還沒出招 → 新的倒地先記下，出完一招才補上
  b.state = 'idle'; b.posture = b.maxPosture; w.damageBoss(mari, b, { dmg: 10, posture: 10 }); run(w, 0.05);
  assert.ok(b.state !== 'knockdown' && st.pend && st.pend.state === 'knockdown', '控制恢復後未出招 → 倒地先記下');
  st.owe = st.wasCC = false; st.pend = null; b.maxPosture /= BD.HUNT4.TOPPLE.grow;
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
  assert.ok(rin.def.weapon === 'bow' && rin.skills.some((s) => s.id === 'bow_s1'), '換成弓');
  run(w, 7); b.state = 'idle'; b.posture = b.maxPosture; w.damageBoss(st.hunters[1], b, { dmg: 10, posture: 10, ignoreIframe: true }); run(w, 0.05); rin.state = 'idle'; rin.h4.nextAct = 0; rin.controller.update = () => {}; run(w, 3); // 弓的連段 / 一般 AI 會搶在 act 前出招，關掉 AI 並手動空出 act 的時機
  assert.ok(rin.def.weapon === 'katana' && rin.maxSpirit > 0, '倒地時換回太刀');
}

// P3 武器：每一招（含連段變體、集中弱點攻擊、額外招）都能施放並打到身旁的 Boss
for (const mains of [null, { rin: 'hammer', mari: 'horn', yuzu: 'lance', selena: 'gunlance' }, { rin: 'switchaxe', mari: 'chargeblade', yuzu: 'glaive', selena: 'sns' }, { rin: 'bow', mari: 'heavyxbow', yuzu: 'lightxbow', selena: 'sns' }]) {
  const w = new BD.World(BD.Hunt4.team(mains), BD.bossById.ronin, { seed: 5, pace: 'heavy', hunt4: true, intro: 0.5 }), st = w.hunt4, b = st.boss;
  run(w, 1); b.controller.update = () => {}; for (const h of st.hunters) h.controller.update = () => {}; // 全員不自己行動，只放指定的招
  for (const h of st.hunters) {
    for (const id in h.h4.kv) {
      const s = h.h4.kv[id];
      if (s.guard || !s.actions.some((a) => a.do === 'hit' || a.do === 'proj') || (s.tags || []).includes('counter')) continue; // 防禦 / 架式要等對方出手；鬼人化 / 裝填沒有攻擊
      b.x = 3000; b.y = 1800; b.state = 'idle'; b.statuses = b.statuses.filter((x) => x.id === 'kdGuard'); h.x = b.x - 60 - grow(b) - 0.8 * Math.max(0, ...s.actions.map((a) => (a.do === 'dash' ? a.dist : 0))); h.y = b.y; // 突進招站遠一點 h.face = 0; h.state = 'idle'; h.spirit = 100; h.sta = h.maxSta;
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
  b.x = 3000; b.y = 1800; mari.x = b.x - 90 - grow(b); mari.y = b.y; b.setState('stun', 6); mari.state = 'idle';
  mari.startSkill(mari.h4.D.choose(mari, 60));
  for (let i = 0; i < 60 * 5; i++) { w.hitstop = 0; w.freezeF = 0; w.step(BD.STEP); if (mari.inst && seen[seen.length - 1] !== mari.inst.skill.id) seen.push(mari.inst.skill.id); b.x = 3000; b.y = 1800; if (b.state !== 'stun') b.setState('stun', 5); }
  assert.strictEqual(seen.slice(0, 3).join(), 'gs_c1,gs_c2,gs_true', '大劍蓄力連段：' + seen);
  const tk = mari.h4.kv.gs_tackle;
  mari.state = 'idle'; mari.startSkill(tk, { force: true }); mari.inst.t = 0.4; let hp = mari.hp; w.damageBoss(b, mari, { dmg: 100 });
  assert.ok(hp - mari.hp > 0 && hp - mari.hp < 70, '鐵壁衝撞減傷 ' + (hp - mari.hp));
  st.owe = st.wasCC = false; // 測試直接從暈眩切回待機；實戰中相殺發生在 Boss 出手後，鎖定已解除
  b.setState('idle', 0); mari.cancelSkill(); mari.state = 'idle'; mari.startSkill(tk, { force: true }); mari.inst.t = 0.1; hp = mari.hp;
  assert.strictEqual(w.damageBoss(b, mari, { dmg: 60 }), 'deflected'); assert.ok(mari.hp === hp && b.state === 'stagger' && mari.stats.h4.offsets === 1, '相殺：免傷、Boss 硬直');
  b.setState('idle', 0); st.owe = st.wasCC = false; b.startSkill(b.skills[0], { force: true }); mari.cancelSkill(); mari.state = 'idle'; mari.startSkill(tk, { force: true }); mari.inst.t = 0.1;
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
  s().gauge = 99; b.x = 3000; b.y = 1800; yuzu.x = b.x - 60 - grow(b); yuzu.y = b.y; b.setState('stun', 3); yuzu.face = 0; yuzu.state = 'idle'; yuzu.startSkill(yuzu.h4.kv.db_d1, { force: true }); run(w, 0.5);
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
  const seen = []; b.x = 3000; b.y = 1800; ham.x = b.x - 90 - grow(b); ham.y = b.y; b.setState('stun', 6); ham.state = 'idle'; ham.sta = ham.maxSta;
  ham.startSkill(ham.h4.D.choose(ham, 60));
  for (let i = 0; i < 60 * 5; i++) { w.hitstop = 0; w.freezeF = 0; w.step(BD.STEP); if (ham.inst && seen[seen.length - 1] !== ham.inst.skill.id) seen.push(ham.inst.skill.id); pin(); }
  assert.strictEqual(seen.slice(0, 3).join(), 'ham_c1,ham_c2,ham_c3', '大錘蓄力連段：' + seen);
  // 狩獵笛：兩個紅音 → 攻擊強化給範圍內隊友
  const hd = horn.h4.drv; hd.notes = ['A', 'A']; horn.x = lance.x = b.x - 100 - grow(b); horn.y = b.y; lance.y = b.y + 60; horn.state = 'idle';
  horn.startSkill(horn.h4.kv.horn_play, { force: true }); run(w, 0.1);
  assert.ok(BD.hasStatus(horn, 'h4atk') && BD.hasStatus(lance, 'h4atk') && hd.notes.length === 0, '演奏攻擊強化');
  hd.notes = []; horn.state = 'idle'; horn.cancelSkill(); horn.startSkill(horn.h4.kv.horn_back, { force: true }); run(w, 0.05); assert.strictEqual(hd.notes.join(), 'C', '綠音記一個音符');
  // 長槍：一般防禦（不完美）擋下也接反擊突刺
  lance.cancelSkill(); lance.state = 'idle'; lance.sta = lance.maxSta; lance.startSkill(lance.h4.kv.lance_guard, { force: true }); run(w, 0.4);
  let hp = lance.hp; w.damageBoss(b, lance, { dmg: 120 }); assert.ok(hp - lance.hp > 0 && hp - lance.hp <= 120 * 0.18 * 1.1, '長槍防禦減傷 ' + (hp - lance.hp));
  let countered = false; for (let i = 0; i < 60; i++) { run(w, 1 / 60); countered = countered || !!(lance.inst && lance.inst.skill.id === 'lance_counter'); } // Boss 不被擊退時反擊後會再接連段，記錄過程而非終點
  assert.ok(countered, '擋下後反擊突刺');
  // 銃槍：砲擊耗彈、固定傷害（不吃肉質）；裝填補滿
  const gd = gl.h4.drv; gd.shells = 5;
  gl.cancelSkill(); gl.state = 'idle'; gl.x = b.x - 80 - grow(b); gl.y = b.y; gl.face = 0; b.setState('stun', 5); gl.startSkill(gl.h4.kv.gl_shell, { force: true });
  hp = b.hp; for (let i = 0; i < 40; i++) { w.hitstop = 0; w.freezeF = 0; w.step(BD.STEP); pin(); }
  assert.ok(gd.shells === 4 && b.hp < hp, '砲擊耗彈並造成傷害');
  const P = st.parts[0], hz0 = P.hz.cut; P.hz.cut = 0.1; hp = b.hp; BD.H4Combat.hit(w, st, gl, gl, b, { dmg: 62, fixed: true }, st.orig); const d1 = hp - b.hp;
  P.hz.cut = 0.9; hp = b.hp; BD.H4Combat.hit(w, st, gl, gl, b, { dmg: 62, fixed: true }, st.orig); P.hz.cut = hz0;
  assert.ok(d1 > 0 && Math.abs((hp - b.hp) / d1 - 1) < 0.2, `固定傷害不吃肉質 ${d1} ${hp - b.hp}`); // 世界傷害本身有 ±8% 亂數；沒有 fixed 時肉質 0.1 對 0.9 會差 9 倍
  gd.shells = 0; gl.cancelSkill(); gl.state = 'idle'; gl.startSkill(gl.h4.kv.gl_reload, { force: true }); run(w, 0.1); assert.strictEqual(gd.shells, 5, '裝填');
}

// 太刀：兜割命中消耗一階、威力隨起手等級；紅刃兜割自動接練氣解放無雙斬（霸體、再消耗一階）；Boss 倒地時白刃也會放兜割
{
  const w = new BD.World(BD.Hunt4.team({ rin: 'katana', mari: 'gs', yuzu: 'db', selena: 'sns' }), BD.bossById.ronin, { seed: 8, pace: 'heavy', hunt4: true, intro: 0.5 });
  const st = w.hunt4, b = st.boss, k = st.hunters[0], kt = k.hunt.kt, ids = [];
  run(w, 1); b.controller.update = () => {}; for (const h of st.hunters) h.controller.update = () => {};
  const pin = () => { b.x = 3000; b.y = 1800; if (b.state !== 'stun') b.setState('stun', 5); for (const h of st.hunters.slice(1)) { h.x = 1000; h.y = 1000; } };
  k.cancelSkill(); k.state = 'idle'; k.x = 3000 - 90; k.y = 1800; k.face = 0; pin(); BD.katanaLevel(k, 3);
  assert.ok(k.startSkill(k.h4.kv.k_helm, { force: true }), '兜割起手');
  for (let i = 0; i < 60 * 4; i++) { w.hitstop = 0; w.freezeF = 0; w.step(BD.STEP); pin(); if (k.inst && ids[ids.length - 1] !== k.inst.skill.id) ids.push(k.inst.skill.id); if (k.inst && k.inst.skill.id === 'k_helm' && k.inst.paid) assert.ok(Math.abs(k.dmgMul / k.hunt.baseDmg - BD.katanaMul[3] * 1.5) < 1e-9, '紅刃兜割威力以起手等級計'); }
  assert.strictEqual(ids.slice(0, 2).join(), 'k_helm,k_musou', '紅刃兜割接無雙斬：' + ids);
  assert.strictEqual(kt.level, 1, '兜割 + 無雙斬各消耗一階（紅 → 白）');
  assert.ok(Math.abs(k.dmgMul - k.hunt.baseDmg * BD.katanaMul[1]) < 1e-9, '招式結束後傷害倍率回到當前練氣');
  k.cancelSkill(); k.state = 'idle'; k.stateT = 1; pin(); k.x = 3000 - 90;
  assert.strictEqual((k.h4.D.choose(k, 50) || {}).id, 'k_helm', 'Boss 倒地時白刃也放兜割');
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

// P8 第四批遠程：弓強擊瓶耗瓶 / 換瓶與傷害倍率、輕弩各彈種計數與裝填、重弩彈匣 / 狙擊冷卻
{
  const w = new BD.World(BD.Hunt4.team({ rin: 'bow', mari: 'heavyxbow', yuzu: 'lightxbow', selena: 'sns' }), BD.bossById.ronin, { seed: 9, pace: 'heavy', hunt4: true, intro: 0.5 });
  const st = w.hunt4, [bw, hb, lb] = st.hunters, R = BD.HUNT4;
  run(w, 1); st.boss.controller.update = () => {}; for (const h of st.hunters) h.controller.update = () => {};
  const go = (h, id) => { h.cancelSkill(); h.state = 'idle'; assert.ok(h.startSkill(h.h4.kv[id], { force: true }), id); run(w, 0.05); };
  const bd = bw.h4.drv, b = st.boss, D = bw.h4.D, pt = st.parts[0];
  go(bw, 'bow_s1'); go(bw, 'bow_s2'); go(bw, 'bow_s3'); assert.ok(bd.lvl === 3 && !bd.hot, '弓：射擊連射升到 III');
  go(bw, 'bow_step'); assert.ok(bd.hot && bd.lvl === 3, '墊步保住 III');
  bd.combo = { seq: ['shot', 'shot'] }; bd.ci = 0; bw.cancelSkill(); bw.state = 'idle';
  assert.strictEqual(D.next(bw, 300).id, 'bow_s3', 'III 墊步後射擊仍是 III'); go(bw, 'bow_s3');
  assert.strictEqual(D.next(bw, 300).id, 'bow_s2', 'III 再射一發掉回 II');
  bd.trick = 1; go(bw, 'bow_load'); assert.ok(bd.trick === 0 && bd.coatN === R.BOW.coatShots && R.BOW.coatFx[bd.coat], '裝瓶耗一格量表');
  go(bw, 'bow_p3'); run(w, 0.3); assert.strictEqual(bd.coatN, R.BOW.coatShots - 1, '一招只耗一發瓶（不論箭數）');
  D.onHit(bw, { tracer: true }, pt, st.orig); assert.ok(bd.tracer && bd.tracer.until > w.time, '誘導箭命中留標記');
  bd.lvl = 0; bd.combo = { seq: ['shot'] }; bd.ci = 0; assert.strictEqual(D.next(bw, 300).id, 'bow_s3', '誘導箭期間射擊視同 III');
  bd.marks = 4; let hp = b.hp; D.onHit(bw, { det: true }, pt, st.orig); assert.ok(!bd.tracer && !bd.marks && b.hp < hp, '引爆誘導箭與殘留觸發箭');
  go(bw, 'bow_step'); bd.trick = 0; bw.sta = 10;
  assert.strictEqual(w.damageBoss(b, bw, { dmg: 50, kb: 0 }), 'dodged'); assert.ok(bd.stat.discern === 1 && bd.trick >= 1 && bw.sta > 40 && bd.combo === R.BOW_DISCERN, '看破迴避：回量表 / 體力，接反擊');
  run(w, 0.25); hp = bw.hp; w.damageBoss(b, bw, { dmg: 50, kb: 0 }); assert.ok(bw.hp < hp, '墊步迴避判定過了就會被打中');
  bd.marks = 0; go(bw, 'bow_arc'); for (let k = 0; k < 90; k++) { b.x = bw.x + 300; b.y = bw.y; run(w, 1 / 60); } assert.ok(bd.marks > 0, '曲射落在 Boss 身上留下殘留觸發箭');
  assert.ok(BD.HUNT4.WEAPON_SPECS.bow.focus && bw.h4.focus, '弓有集中射擊');
  const ld = lb.h4.drv, LD = lb.h4.D, L = R.LBG;
  ld.am = 'n'; ld.spType = 'adh';
  go(lb, 'lbg_shot_n'); go(lb, 'lbg_shot_p');
  assert.ok(ld.mag.n === L.mag.n - 1 && ld.mag.p === L.mag.p - 1 && ld.mag.s === L.mag.s, '輕弩：各彈種分開計數');
  go(lb, 'lbg_reload_n'); assert.ok(ld.mag.n === L.mag.n && ld.mag.p === L.mag.p - 1, '裝填只補當前彈種');
  ld.en = 30; LD.onHit(lb, { proj: {} }, pt, st.orig); LD.onHit(lb, { proj: {}, chase: true }, pt, st.orig);
  assert.ok(Math.abs(ld.en - 30 - L.en.hit - L.en.chase) < 1e-6, '普通模式命中回能量、追擊射擊回較多');
  go(lb, 'lbg_mode'); assert.ok(ld.rapid, '切到速射模式');
  let en = ld.en; LD.onHit(lb, { proj: {} }, pt, st.orig); assert.strictEqual(ld.en, en, '速射模式命中不回能量');
  go(lb, 'lbg_rapid_n'); assert.ok(ld.en === en - L.en.cost.n && ld.mag.n === L.mag.n - 1, '速射耗能量與一發彈');
  ld.mag.n = 0; ld.combo = { seq: ['burst'] }; ld.ci = 0; lb.cancelSkill(); lb.state = 'idle';
  assert.strictEqual(LD.next(lb, 300).id, 'lbg_sreload', '速射模式彈匣空：墊步射擊變墊步裝填');
  go(lb, 'lbg_sreload'); assert.strictEqual(ld.mag.n, L.mag.n, '墊步裝填補滿');
  run(w, 1); ld.en = 0; run(w, 0.05); assert.ok(!ld.rapid && lb.state === 'recover', '能量耗盡：強制解除速射、有硬直');
  ld.combo = { seq: ['rapid', 'shot'] }; ld.ci = 0; lb.state = 'idle'; assert.strictEqual(LD.next(lb, 300).id, 'lbg_shot_n', '普通模式跳過速射步驟');
  go(lb, 'lbg_adh'); assert.ok(ld.sp < 1, '特殊彈耗一發');
  LD.onHit(lb, { proj: {}, adh: true }, pt, st.orig); assert.ok(ld.adh && ld.adh.part === pt.id, '附著龍彈附著在命中部位');
  hp = b.hp; en = ld.en; for (let k = 0; k < L.sp.adh.need[2]; k++) LD.onHit(lb, { proj: {} }, pt, st.orig);
  assert.ok(!ld.adh, '同部位命中滿三階提早引爆'); run(w, 1.2); assert.ok(b.hp < hp - L.sp.adh.boom && ld.en > en, '附著龍彈斬擊＋爆炸、回速射能量');
  assert.ok(R.WEAPON_SPECS.lightxbow.focus && lb.h4.focus && LD.focus(lb), '輕弩有集中攻擊彈');
  ld.fs = 0.5; assert.strictEqual(LD.focus(lb), null, '集中攻擊彈沒存量不放');
  ld.mag.n = 0; ld.combo = null; lb.state = 'idle'; assert.ok(/^lbg_reload_n$/.test(LD.choose(lb, 300).id), '普通模式打空就裝填');
  const hd = hb.h4.drv;
  go(hb, 'hbg_n'); assert.strictEqual(hd.mag, R.HBG.mag - 1, '重弩耗彈');
  go(hb, 'hbg_snipe'); assert.ok(hd.snipeAt > w.time && hd.mag === R.HBG.mag - 1, '狙擊彈進冷卻、不吃彈匣');
  hd.mag = 0; assert.strictEqual(hb.h4.D.choose(hb, 400).id, 'hbg_reload', '彈匣空了裝填');
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
  assert.strictEqual(JSON.stringify(clean), JSON.stringify({ mats: { ronin: { s: 0, p: 999, g: 0 } }, w: { 'katana:ronin': 3 }, a: { 'head:ronin': 2 }, rec: { 'katana:ronin': [5, 1] }, deco: {}, eq: null }), '裝備防呆');
  assert.ok(H.sanitize(JSON.parse(JSON.stringify(save))).hunters.rin.gear.w['katana:watcher'] === 2, '學習存檔帶著裝備');
}

// 裝飾珠：原作 361 顆、AI 鑲嵌（孔位 / 種類 / 上限 / 沒用的不鑲）、效果、掉落稀有度、存檔防呆
{
  const GR = BD.H4Gear, D = H4.DECOS, all = Object.values(D);
  assert.strictEqual(all.length, 361, '珠子總數');
  assert.ok(all.every((d) => d.slot >= 1 && d.slot <= 3 && d.skills.every(([k, l]) => H4.SKILLS[k] && H4.SKILLS[k].kind === d.kind && l >= 1)), '珠子資料完整');
  const save = BD.H4Brain.newSave(), g = GR.gearOf(save, 'rin'); // 凜：太刀，預設雷屬性
  g.w['katana:thor'] = 3; g.a['head:thor'] = 2; // 雷神太刀 III（孔 3/2/1）、頭 II（孔 2/1）
  Object.assign(g.deco, { '攻擊珠Ⅲ【3】': 1, '攻擊珠Ⅱ【2】': 5, '雷光珠【1】': 1, '火炎珠【1】': 3, '射法珠【1】': 2, '加護珠【1】': 1, '狩人珠【1】': 4, '痛擊珠【3】': 1, '挑戰珠【3】': 1 });
  const hd = Object.assign({}, H4.HUNTERS[0], { weapons: ['katana', 'bow'] }), eq = GR.choose(g, hd, 'ronin'), E = GR.build(g, eq);
  assert.strictEqual(eq.deco.length, 4, '武器 3 孔 + 頭 1 孔（3 孔防具珠塞不進 2 孔）：' + eq.deco);
  assert.strictEqual(E.L1.atk, 5, '攻擊夾在上限 5');
  assert.ok(E.L1.thunderA === 1 && !E.L1.fireA && !E.L1.ammo, '只鑲對這把武器有用的：' + eq.deco);
  assert.ok(E.L1.divine === 1 && !E.L1.life, '防具孔鑲加護，不鑲採集用的');
  assert.ok(!E.L0.atk && E.L0.divine === 1, '換副武器時武器珠不生效');
  const w = new BD.World(BD.Hunt4.team(), BD.bossById.ronin, { seed: 5, pace: 'heavy', hunt4: true, intro: 0.5, h4save: save }), st = w.hunt4, rin = st.hunters[0];
  assert.ok(rin.h4.gear.L1.atk === 5, '開場套用珠子');
  const P = st.parts[1]; const m0 = GR.atkMul(w, st, rin, P, 0.5); rin.h4.wi = 1; const m1 = GR.atkMul(w, st, rin, P, 0.5); rin.h4.wi = 0;
  assert.ok(m0 > m1 * 1.15, '主武器帶攻擊珠時傷害較高');
  assert.ok(GR.elMul(rin, 'thunder') > 1 && GR.elMul(rin, 'fire') === 1, '雷光珠只加雷');
  assert.ok(Math.abs(GR.takenMul(w, rin) - 0.97) < 1e-9, '精靈加護 1 級');
  // 掉落：弱 Boss 不掉 3 孔，強 Boss 會掉；整體機率在設定範圍
  const roll = (stars) => { let x = 7; const rng = () => ((x = (x * 16807) % 2147483647) / 2147483647); const out = []; for (let i = 0; i < 4000; i++) out.push(GR.rollDeco(rng, stars, 0)); return out; };
  const weak = roll(1.5), strong = roll(5), hit = weak.filter(Boolean);
  assert.ok(hit.length > 4000 * 0.25 && hit.length < 4000 * 0.35, '掉落率約 30%：' + hit.length);
  assert.ok(hit.every((k) => D[k].slot < 3), '1.5 星 Boss 不掉 3 孔');
  assert.ok(strong.filter((k) => k && D[k].tier === 4).length > 50, '5 星 Boss 會掉組合珠');
  assert.strictEqual(JSON.stringify(GR.sanitize({ deco: { '攻擊珠【1】': 2.4, '假珠【1】': 3, '匠珠【1】': 0, '超心珠【1】': 500 } }).deco), JSON.stringify({ '攻擊珠【1】': 2, '超心珠【1】': 99 }), '珠子防呆');
  run(w, 20); // 帶滿珠子跑一段不出錯
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
