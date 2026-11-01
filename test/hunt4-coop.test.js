// 傷口合作：安全條件、預留、實際近戰 / 投射物命中、失敗釋放與可重現性。
'use strict';
const assert = require('assert');
const { BD } = require('./lib/load').load({ noFx: true });
const H = BD.Hunt4;
function fixture(main = 'katana') {
  const w = new BD.World(H.team({ rin: main }), BD.bossById.ronin, { seed: 17, intro: 0, pace: 'heavy', hunt4: true });
  w.time = 10;
  const st = w.hunt4, b = st.boss, [h, mari, by] = st.hunters, P = st.parts[0];
  b.x = 3000; b.y = 1800; b.face = 0;
  for (const x of w.bosses) { x.controller.update = () => {}; x.moveX = x.moveY = 0; }
  for (const x of st.hunters) {
    x.x = b.x + 100; x.y = b.y; x.face = Math.PI; x.lastSkillEnd = -99; x.h4.nextAct = Infinity;
    x.h4.D = Object.assign({}, x.h4.D, { next: () => null });
  }
  P.wound = 9; P.woundBy = by.def.hunter;
  return { w, st, b, h, mari, by, P };
}
function start(t, hunter = t.h) {
  const rng = t.w.rng; t.w.rng = () => 0; // 只固定接應意願，後續模擬恢復真正的種子亂數。
  const ok = H.tryCoop(t.w, t.st, hunter); t.w.rng = rng; return ok;
}
function run(w, sec) { for (let i = 0; i < sec * 60 && !w.over; i++) { w.hitstop = 0; w.freezeF = 0; w.step(BD.STEP); } }

// 各種不適用情境不能建立預留，也不消耗招式 / 亂數。
for (const [name, change] of [
  ['自己的傷口', (t) => { t.P.woundBy = t.h.def.hunter; }],
  ['缺少造傷者', (t) => { delete t.P.woundBy; }],
  ['低血', (t) => { t.h.hp = 1; }],
  ['沒有翻滾體力', (t) => { t.h.sta = 0; }],
  ['冷卻', (t) => { t.h.cds[t.h.h4.focus.id] = 5; }],
  ['距離太遠', (t) => { t.h.x += 2000; }],
  ['正在出招', (t) => { t.h.state = 'skill'; }],
  ['連段接續窗', (t) => { t.h.lastSkillEnd = t.w.time; }],
  ['有防禦計畫', (t) => { t.h.controller.plan = { type: 'dodge' }; }],
  ['正在避險', (t) => { t.h.controller.evade = {}; }],
  ['即將命中', (t) => { t.h.controller.scanThreats = () => [{ left: 0.1 }]; }],
  ['待在安全圈', (t) => { t.h.controller.undoSafe = () => ({}); }],
  ['Boss 轉階段', (t) => { t.b.state = 'transition'; }],
  ['Boss 正在追打自己', (t) => { t.b.state = 'skill'; t.b._target = t.h; }],
  ['傷口過期', (t) => { t.P.wound = t.w.time - BD.HUNT4.WOUND.life - 1; }],
  ['沒有集中攻擊', (t) => { t.h.h4.focus = null; }],
  ['戰鬥結束', (t) => { t.w.winner = t.b; }],
]) {
  const t = fixture(); change(t); const count = t.h.stats.skills;
  t.w.rng = () => { throw new Error(name + ' 不應消耗接應亂數'); };
  assert.strictEqual(H.tryCoop(t.w, t.st, t.h), false, name);
  assert.ok(!t.P.coop && !t.h.h4.coopActive, name + ' 不應預留');
  assert.strictEqual(t.h.stats.skills, count, name + ' 不出招');
}

// 輕弩缺集中彈時不接應；預留不改共享的武器定義。
{
  const t = fixture('lightxbow'); t.h.h4.drv.fs = 0;
  assert.strictEqual(start(t), false);
  assert.ok(!t.P.coop);
}
{
  const t = fixture(), original = t.h.h4.focus.v1;
  assert.ok(start(t));
  assert.ok(!original.actions.some((a) => a.h4coop), '不污染共享招式');
  assert.strictEqual(start(t, t.mari), false, '同傷口只預留一位接應者');
  run(t.w, 2);
  assert.strictEqual(t.h.stats.h4.coop.started, 1);
  assert.strictEqual(t.h.stats.h4.coop.success, 1, '近戰實際打破指定傷口');
  assert.strictEqual(t.by.stats.h4.coop.assists, 1, '造傷者助攻');
  assert.strictEqual(t.h.stats.h4.pops, 1);
  assert.ok(!t.P.coop && !t.h.h4.coopActive);
  assert.ok(t.w.logs.some((l) => l.text.includes('合作打破')));
}

// 弓的 extra 經由實際投射物傳遞；招式結束後，在飛行的箭仍保有本次預留。
{
  const t = fixture('bow'); t.h.x = t.b.x + 650;
  assert.ok(start(t));
  for (let i = 0; i < 100 && !t.w.projectiles.some((p) => p.extra && p.extra.h4coop); i++) run(t.w, 1 / 60);
  const arrow = t.w.projectiles.find((p) => p.extra && p.extra.h4coop), c = t.h.h4.coopActive;
  assert.ok(arrow && c, '合作標記到達真實投射物');
  t.h.cancelSkill(); t.h.state = 'idle'; H.coopTick(t.w, t.st);
  assert.strictEqual(t.h.h4.coopActive, c, '已射出時等待命中，不提前解散');
  run(t.w, 3);
  assert.strictEqual(t.h.stats.h4.coop.success, 1);
  assert.strictEqual(t.by.stats.h4.coop.assists, 1, '三支箭不重複計助攻');
}

// 所有帶集中攻擊的武器沿自己的動作 / 彈藥規則結算，位移招可以失手，不保證命中。
for (const wp of Object.keys(BD.HUNT4.WEAPON_SPECS)) {
  const t = fixture(wp);
  if (!t.h.h4.focus) { assert.strictEqual(start(t), false, wp + ' 沒有集中攻擊則不接應'); continue; }
  assert.ok(start(t), wp + ' 可接應'); run(t.w, 3);
  const c = t.h.stats.h4.coop;
  assert.strictEqual(c.success + c.missed + c.cancelled, 1, wp + ' 真實動作有結果');
  assert.strictEqual(t.by.stats.h4.coop.assists, c.success, wp + ' 助攻對應真正成功');
  assert.ok(!t.h.h4.coopActive && !t.P.coop, wp + ' 不殘留預留');
}

// 合作指定的是那一處傷口，而不是順手打中或後來出現的其他傷口。
{
  const t = fixture(); t.h.x = t.b.x - 100; t.h.face = 0; t.st.parts[3].wound = 9;
  assert.ok(start(t)); run(t.w, 2);
  assert.strictEqual(t.P.wound, 0, '從尾側命中仍處理預先指定的頭傷口');
  assert.ok(t.st.parts[3].wound, '不改成破壞尾部傷口');
}

// 預留不能永久佔用；危險收手、招式被打斷、傷口消失 / 過期、力竭、戰鬥結束。
for (const [name, change] of [
  ['低血收手', (t) => { t.h.hp = 1; }],
  ['威脅收手', (t) => { t.h.controller.scanThreats = () => [{ left: 0.1 }]; }],
  ['招式中斷', (t) => { t.h.setState('stagger', 1); }],
  ['傷口消失', (t) => { t.P.wound = 0; }],
  ['傷口重開', (t) => { t.P.wound = t.w.time; }],
  ['傷口過期', (t) => { t.w.time += BD.HUNT4.WOUND.life + 1; }],
  ['獵人力竭', (t) => { t.h.setState('dead', 1); }],
  ['戰鬥結束', (t) => { t.w.winner = t.b; }],
]) {
  const t = fixture(); assert.ok(start(t)); const c = t.P.coop; change(t); H.coopTick(t.w, t.st);
  assert.strictEqual(c.result, 'cancelled', name);
  assert.ok(!t.P.coop && !t.h.h4.coopActive, name + ' 釋放');
  H.coopTick(t.w, t.st); assert.strictEqual(t.h.stats.h4.coop.cancelled, 1, '只結算一次');
}
{
  const t = fixture(); start(t); const c = t.P.coop;
  t.h.lastSkillId = c.skill; t.h.lastSkillEnd = t.w.time; t.h.cancelSkill(); t.h.state = 'idle';
  H.coopTick(t.w, t.st);
  assert.strictEqual(c.result, 'missed', '出招結束沒打破指定傷口');
  assert.ok(!t.P.coop);
}

// 舊箭不打破另一代傷口；正常集中攻擊不搶預留，可處理另一處傷口。
{
  const t = fixture(); start(t); const c = t.P.coop;
  H.finishCoop(t.w, t.st, c, 'cancelled'); t.P.wound = 10;
  t.w.damageBoss(t.h, t.b, { dmg: 1, posture: 0, focus: true, h4coop: c, ignoreIframe: true, noPerfect: true });
  assert.strictEqual(t.P.wound, 10, '舊合作標記不能打破新傷口');
  assert.strictEqual(t.h.stats.h4.coop.success, 0);
}
{
  const t = fixture(); start(t); const Q = t.st.parts[3]; Q.wound = 9;
  t.w.damageBoss(t.mari, t.b, { dmg: 1, posture: 0, focus: true, ignoreIframe: true, noPerfect: true });
  assert.ok(t.P.wound && t.P.coop, '普通集中攻擊不搶合作預留');
  assert.strictEqual(Q.wound, 0, '仍可破壞其他傷口');
}

// 真實累積傷害產生造傷記錄，既有存檔格式保持 v1、沒有合作歷史。
{
  const t = fixture(); t.P.wound = 0;
  for (let i = 0; i < 100 && !t.P.wound; i++) t.w.damageBoss(t.by, t.b, { dmg: 100, posture: 0, ignoreIframe: true, noPerfect: true });
  assert.strictEqual(t.P.woundBy, t.by.def.hunter);
  assert.strictEqual(t.by.stats.h4.coop.created, 1);
  start(t); t.w.winner = t.b; run(t.w, 0.1);
  const r = t.st.review[0].coop;
  assert.strictEqual(r.started, r.success + r.cancelled + r.missed);
  const save = JSON.stringify(t.st.save);
  assert.ok(!save.includes('coop') && !save.includes('woundBy'));
  assert.strictEqual(BD.H4Brain.sanitize(JSON.parse(save)).v, 1);
}

console.log('HUNT4 COOP PASS（安全條件、競爭預留、近戰 / 弓實際命中、中斷 / 舊箭 / 結算）');
