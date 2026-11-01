// 危急支援：粉塵實際效益、閃光打斷、安全 / 庫存 / 間隔、觀察結果與存檔。
'use strict';
const assert = require('assert');
const { BD } = require('./lib/load').load({ noFx: true });
const H = BD.Hunt4;
function fixture() {
  const w = new BD.World(H.team(), BD.bossById.ronin, { seed: 19, intro: 0, pace: 'heavy', hunt4: true });
  w.time = 10;
  const st = w.hunt4, b = st.boss, [t, other, , h] = st.hunters;
  b.x = 3000; b.y = 1800; b.face = 0; b._target = t;
  for (const x of w.bosses) { x.controller.update = () => {}; x.moveX = x.moveY = 0; }
  for (const x of st.hunters) {
    x.x = b.x + 100; x.y = b.y; x.h4.nextAct = Infinity;
    x.controller.scanThreats = () => []; x.controller.undoSafe = () => null;
  }
  h.x = b.x + 500; t.hp = t.maxHp * 0.2;
  return { w, st, b, t, other, h };
}
function use(t, h = t.h) {
  const rng = t.w.rng; t.w.rng = () => 0;
  const ok = H.trySupport(t.w, t.st, h); t.w.rng = rng; return ok;
}
function attack(t) {
  t.h.h4.items.dust = 0;
  const s = t.b.skills.find((x) => x.v1.actions.some((a) => a.dmg > 0 || a.hit && a.hit.dmg > 0));
  assert.ok(s); t.b.startSkill(s, { force: true });
  return t.b.inst;
}

// 單一危急隊友也能救；只計真正補回的血與正回復人次，其他滿血者不計。
{
  const f = fixture(), hp = f.t.hp;
  assert.ok(use(f));
  assert.strictEqual(f.h.h4.items.dust, 1);
  assert.strictEqual(f.t.hp - hp, Math.round(f.t.maxHp * BD.HUNT4.ITEMS.dustHeal));
  const s = f.h.stats.h4.support;
  assert.strictEqual(s.healing, f.t.hp - hp);
  assert.strictEqual(s.allyHealing, s.healing);
  assert.strictEqual(s.recipients, 1);
  assert.strictEqual(f.h.stats.h4.dusts, 1);
}
{
  const f = fixture(); f.t.hp = f.t.maxHp * 0.45; f.other.hp = f.other.maxHp * 0.45; f.h.hp = f.h.maxHp - 10;
  assert.ok(use(f), '兩位隊友受傷時救援');
  const s = f.h.stats.h4.support;
  assert.strictEqual(s.recipients, 3, '包含自己，按有實際回血者計人次');
  assert.strictEqual(s.healing - s.allyHealing, 10, '自己只缺 10 血，不灌成理論回血量');
  assert.ok(f.h.hp <= f.h.maxHp);
}
{
  const f = fixture(); f.t.hp = f.t.maxHp * 0.4;
  assert.strictEqual(use(f), false, '單人非危急且無眼前威脅時不浪費');
  f.t.controller.scanThreats = () => [{ left: 0.7 }];
  assert.ok(use(f), '即將受擊的低血隊友優先救援');
}

for (const [name, change] of [
  ['無粉塵', (f) => { f.h.h4.items.dust = 0; }],
  ['已滿血', (f) => { f.t.hp = f.t.maxHp; }],
  ['只有自己受傷', (f) => { f.t.hp = f.t.maxHp; f.h.hp = 1; }],
  ['隊友已力竭', (f) => { f.t.state = 'dead'; }],
  ['範圍外', (f) => { f.t.x += 2000; }],
  ['使用者正被攻擊', (f) => { f.h.controller.scanThreats = () => [{ left: 0.1 }]; }],
  ['自己站在火圈', (f) => { f.w.zones.push({ team: 1, x: f.h.x, y: f.h.y, r: 80, dps: 20, t: 1, delay: 0 }); }],
  ['自己站在陷阱', (f) => { f.w.traps.push({ team: 1, x: f.h.x, y: f.h.y, trig: 30, t: 1, arm: 1 }); }],
  ['正在躲避', (f) => { f.h.controller.evade = {}; }],
  ['已有防禦計畫', (f) => { f.h.controller.plan = {}; }],
  ['安全圈限制', (f) => { f.h.controller.undoSafe = () => ({}); }],
  ['正在出招', (f) => { f.h.state = 'skill'; }],
  ['隊伍粉塵間隔', (f) => { f.st.support.dustUntil = f.w.time + 1; }],
  ['戰鬥結束', (f) => { f.w.winner = f.b; }],
]) {
  const f = fixture(); change(f); const items = JSON.stringify(f.h.h4.items);
  f.w.rng = () => { throw new Error(name + ' 不應嘗試閃光亂數'); };
  assert.strictEqual(H.trySupport(f.w, f.st, f.h), false, name);
  assert.strictEqual(JSON.stringify(f.h.h4.items), items, name + ' 不消耗');
}

// 同幀另一位獵人不能再撒粉，即使第一次之後仍有低血隊友。
{
  const f = fixture(); f.t.hp = 1; f.other.h4.items.dust = 2; f.other.hp = 1;
  assert.ok(use(f));
  assert.strictEqual(use(f, f.other), false);
  assert.strictEqual(f.other.h4.items.dust, 2);
}

// 真正打斷一招；不刪已飛出的箭與地面危險。
{
  const f = fixture(), i = attack(f), oldProjectiles = f.w.projectiles, oldZones = f.w.zones;
  assert.ok(use(f));
  assert.ok(i.cancelled && f.b.state === 'stun');
  assert.strictEqual(f.h.stats.h4.support.interrupts, 1);
  assert.strictEqual(f.h.h4.items.flash, 1);
  assert.strictEqual(f.w.projectiles, oldProjectiles); assert.strictEqual(f.w.zones, oldZones);
  f.other.h4.items.flash = 2;
  assert.strictEqual(use(f, f.other), false, 'Boss 已被控制，別人不重複閃光');
}
for (const [name, change] of [
  ['血量達現有閃光門檻', (f) => { f.t.hp = f.t.maxHp * BD.HUNT4.ITEMS.flashAt; }],
  ['Boss 已倒地', (f) => { f.b.setState('knockdown', 3); }],
  ['Boss 已暈眩', (f) => { f.b.setState('stun', 3); }],
  ['Boss 轉階段', (f) => { f.b.setState('transition', 3); }],
  ['Boss 在收招', (f) => { f.b.inst.t = f.b.inst.v.activeEnd + 0.01; f.b.inst.aim = 0; }],
  ['Boss 待機', (f) => { f.b.setState('idle', 0); }],
  ['施法沒有剩餘傷害', (f) => { f.b.inst.v = Object.assign({}, f.b.inst.v, { actions: [{ do: 'invuln', at: 1, dur: 2 }] }); }],
  ['隊友已力竭', (f) => { f.t.state = 'dead'; }],
  ['沒有鎖定隊友', (f) => { f.b._target = null; }],
  ['Boss 追自己', (f) => { f.b._target = f.h; f.h.hp = 1; }],
  ['沒有閃光', (f) => { f.h.h4.items.flash = 0; }],
  ['自己眼前有危險', (f) => { f.h.controller.scanThreats = () => [{ left: 0.1 }]; }],
  ['自己站在火圈', (f) => { f.w.zones.push({ team: 1, x: f.h.x, y: f.h.y, r: 80, dps: 20, t: 1, delay: 0 }); }],
  ['距離太遠', (f) => { f.h.x += 3000; }],
  ['耐性過高', (f) => { f.st.flashes = 20; }],
  ['隊伍閃光間隔', (f) => { f.st.support.flashUntil = f.w.time + 1; }],
]) {
  const f = fixture(); attack(f); change(f); const items = JSON.stringify(f.h.h4.items);
  f.w.rng = () => { throw new Error(name + ' 不應消耗亂數'); };
  assert.strictEqual(H.trySupport(f.w, f.st, f.h), false, name);
  assert.strictEqual(JSON.stringify(f.h.h4.items), items, name + ' 不消耗道具');
}

// 掩護後的觀察明確區分三種結果，不推論「救命成功」，也不重複記帳。
for (const [key, change] of [
  ['coverSafe', (f) => { f.w.time += BD.HUNT4.SUPPORT.observe; }],
  ['coverFaint', (f) => { f.t.state = 'dead'; f.t.hp = 0; }],
  ['coverEnded', (f) => { f.w.winner = f.b; }],
]) {
  const f = fixture(); attack(f); assert.ok(use(f)); change(f); H.supportTick(f.w, f.st);
  assert.strictEqual(f.h.stats.h4.support[key], 1, key);
  H.supportTick(f.w, f.st); assert.strictEqual(f.h.stats.h4.support[key], 1);
  assert.strictEqual(f.st.support.cover, null);
}
{
  const f = fixture(); attack(f); use(f); f.w.winner = f.b; f.w.step(BD.STEP);
  const s = f.st.review[3].support;
  assert.strictEqual(s.coverEnded, 1, '結算回顧已包含未滿觀察時間的結果');
  f.h.stats.h4.support.interrupts++;
  assert.strictEqual(s.interrupts, 1, '回顧不跟著下一次統計修改');
  const save = JSON.stringify(f.st.save);
  assert.ok(!save.includes('"support"') && !save.includes('coverSafe'));
  assert.strictEqual(BD.H4Brain.sanitize(JSON.parse(save)).v, 1);
  const again = new BD.World(H.team(), BD.bossById.ronin, { hunt4: true, h4save: f.st.save });
  assert.strictEqual(again.hunt4.support.cover, null);
  assert.strictEqual(again.hunt4.hunters[3].stats.h4.support.healing, 0, '下場不殘留');
}

console.log('HUNT4 SUPPORT PASS（粉塵效益、危急 / 多人、安全、庫存 / 間隔、閃光打斷 / 耐性、觀察結算、舊存檔）');
