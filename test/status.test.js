// 狀態效果系統單元測試（node test/status.test.js）：以 Node 載入遊戲邏輯，不涉入 DOM / 隨機數
'use strict';
const { load } = require('./lib/load');
const { BD } = load();
const U = BD.U;
let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; return; }
  failed++; console.log('FAIL ' + msg);
}
function eq(a, b, msg) { ok(a === b, `${msg}（期望 ${b}，實際 ${a}）`); }
function close(a, b, msg) { ok(Math.abs(a - b) < 1e-9, `${msg}（期望 ${b}，實際 ${a}）`); }
function throws(fn, msg) { let t = false; try { fn(); } catch (e) { t = true; } ok(t, msg); }
// 只印出第一個例外訊息，避免測試輸出被大量堆疊洗版
function throwsMsg(fn, msg) { try { fn(); } catch (e) { ok(true, msg); return; } ok(false, msg); }

// ── defineStatus 驗證 ──
BD.defineStatus('test_dup', { name: '重複' });
throws(() => BD.defineStatus('test_dup', { name: '重複' }), '重複 id 必須丟出錯誤');
throws(() => BD.defineStatus('test_badmod', { name: '壞修正', modifiers: { nope: 1 } }), '未知修正值必須丟出錯誤');
throws(() => BD.defineStatus('test_badstack', { name: '壞堆疊', stacking: 'weird' }), '無效堆疊模式必須丟出錯誤');
throws(() => BD.defineStatus('test_nostack', { name: '缺上限', stacking: 'stack', maxStacks: 0 }), 'stack 缺少 maxStacks 必須丟出錯誤');
throws(() => BD.defineStatus('test_noname', { stacking: 'max' }), '缺少 name 必須丟出錯誤');
throws(() => BD.defineStatus('test_badmul', { name: '壞倍率', modifiers: { speedMul: 'x' } }), 'mul 修正值非數字/函式必須丟出錯誤');
throws(() => BD.defineStatus('test_badand', { name: '壞布林', modifiers: { canAct: 1 } }), 'and 修正值非布林必須丟出錯誤');

// ── 測試專用狀態 ──
BD.defineStatus('test_a', { name: '測試A', stacking: 'refresh', defaultDur: 5 });
BD.defineStatus('test_max', { name: '測試最長', stacking: 'max', defaultDur: 5 });
BD.defineStatus('test_stack', { name: '測試堆疊', stacking: 'stack', maxStacks: 3, defaultDur: 5 });
BD.defineStatus('test_mul', { name: '測試倍率', modifiers: { dmgTakenMul: 2 } });
BD.defineStatus('test_fn', { name: '測試函式倍率', modifiers: { dmgTakenMul: (u) => u.factor } });
BD.defineStatus('test_and', { name: '測試且', modifiers: { canAct: false } });
BD.defineStatus('test_or', { name: '測試或', modifiers: { invuln: true } });
BD.defineStatus('test_rm', { name: '測試移除回呼' });
BD.defineStatus('test_last', { name: '測試後序', order: 0, modifiers: { dmgTakenMul: 3 } });
BD.defineStatus('test_first', { name: '測試前序', order: -10, modifiers: { dmgTakenMul: 5 } });
let removeReason = null;
BD.defineStatus('test_rcb', { name: '測試原因', onRemove: (u, st, w, reason) => { removeReason = reason; } });

const u = { hp: 100, x: 0, y: 0, r: 20 };

// ── applyStatus 未知 id ──
throws(() => BD.applyStatus(u, 'test_missing', {}), '施加未知狀態必須丟出錯誤');

// ── refresh / max / stack 語意 ──
BD.applyStatus(u, 'test_a', { dur: 5 });
BD.applyStatus(u, 'test_a', { dur: 2 });
eq(BD.statusRemaining(u, 'test_a'), 2, 'refresh 直接覆寫持續時間');
eq(BD.getStatus(u, 'test_a').stacks, 1, '重複施加 refresh 不會增加層數');
BD.applyStatus(u, 'test_max', { dur: 3 });
BD.applyStatus(u, 'test_max', { dur: 1 });
eq(BD.statusRemaining(u, 'test_max'), 3, 'max 保留較長的持續時間');
BD.applyStatus(u, 'test_stack', {});
BD.applyStatus(u, 'test_stack', {});
eq(BD.getStatus(u, 'test_stack').stacks, 2, 'stack 每次施加加一層');
BD.applyStatus(u, 'test_stack', { stacks: 5 });
eq(BD.getStatus(u, 'test_stack').stacks, 3, 'stack 不得超過 maxStacks');
BD.applyStatus(u, 'test_a', { dur: 7, source: u, value: 4 });
eq(BD.getStatus(u, 'test_a').source, u, '施加時可更新 source');
eq(BD.getStatus(u, 'test_a').value, 4, '施加時可更新 value');

// ── 過期與 onRemove 原因 ──
BD.applyStatus(u, 'test_rcb', { dur: 1 });
BD.tickStatuses(u, 1.1, null);
eq(removeReason, 'expire', '時間到應以 expire 回呼 onRemove');
eq(BD.hasStatus(u, 'test_rcb'), false, '過期後狀態應移除');
BD.applyStatus(u, 'test_rcb', { dur: 5 });
eq(BD.removeStatus(u, 'test_rcb', 'manual', null), true, 'removeStatus 應回傳 true');
eq(removeReason, 'manual', 'removeStatus 應傳入指定原因');

// ── bindState 活動判定 ──
const bu = { state: 'stagger', stateDur: 1.5, stateT: 0.5, setState(s, d) { this.state = s; this.stateDur = d; this.stateT = 0; } };
BD.applyStatus(bu, 'stagger', {});
eq(BD.statusRemaining(bu, 'stagger'), 1.0, '綁定狀態剩餘時間 = stateDur - stateT');
eq(BD.hasStatus(bu, 'stagger'), true, '綁定狀態在對應 state 下為活動中');
bu.setState('idle', 0);
eq(BD.hasStatus(bu, 'stagger'), false, 'state 改變後綁定狀態不再活動');
const before = bu.statuses.length;
BD.tickStatuses(bu, 0.1, null);
eq(bu.statuses.length, before - 1, 'tickStatuses 應清除已失效的綁定狀態');

// ── getMod ──
const m = { statuses: [] };
eq(BD.getMod(m, 'dmgTakenMul'), 1, '無狀態時 mul 預設為 1');
eq(BD.getMod(m, 'canAct'), true, '無狀態時 and 預設為 true');
eq(BD.getMod(m, 'invuln'), false, '無狀態時 or 預設為 false');
eq(BD.getMod(null, 'invuln'), false, '空單位 or 預設為 false');
BD.applyStatus(m, 'test_mul', {});
eq(BD.getMod(m, 'dmgTakenMul'), 2, 'mul 修正值生效');
m.factor = 1.5;
BD.applyStatus(m, 'test_fn', {});
close(BD.getMod(m, 'dmgTakenMul'), 3, '函式修正值生效並相乘');
BD.applyStatus(m, 'test_and', {});
eq(BD.getMod(m, 'canAct'), false, 'and 修正值 false 會使結果為 false');
BD.applyStatus(m, 'test_or', {});
eq(BD.getMod(m, 'invuln'), true, 'or 修正值 true 會使結果為 true');
throws(() => BD.getMod(m, 'bogus'), '未知修正值 key 必須丟出錯誤');
const emptyU = {};
eq(BD.getMod(emptyU, 'speedMul'), 1, '狀態欄位不存在時走快速路徑');

// ── scaleMod 依 order 排序 ──
const s = { statuses: [] };
BD.applyStatus(s, 'test_last', {});
BD.applyStatus(s, 'test_first', {});
const x = 0.3;
eq(BD.scaleMod(s, 'dmgTakenMul', x), (x * 5) * 3, 'order 較小者先套用，且乘法順序完全一致');
eq(BD.scaleMod(emptyU, 'dmgTakenMul', x), x, '沒有倍率時原封不動回傳 base');
throws(() => BD.scaleMod(s, 'canAct', 1), 'scaleMod 只接受 mul 類型');

// ── 燃燒 / 中毒 ──
const calls = [];
const w = { damageUnit(src, uu, p) { calls.push(p); uu.hp -= p.dmg; }, fx: { text() {} } };
function dotUnit(extra) { return Object.assign({ hp: 1000, x: 100, y: 100, r: 20, maxHp: 1000, statuses: [] }, extra || {}); }
const burnU = dotUnit();
BD.applyStatus(burnU, 'burn', {}, w);
BD.tickStatuses(burnU, 1.5, w);
eq(calls.length, 3, '燃燒 1.5 秒應觸發 3 次（每 0.5 秒）');
eq(calls.every((p) => p.dmg === 6 && p.dot === true), true, '燃燒每次造成 6 點 dot 傷害');
eq(burnU.hp, 982, '燃燒傷害反映在 hp');
eq(BD.dotDps(burnU), 12, '燃燒 dps 為 12');
calls.length = 0;
const poiU = dotUnit();
BD.applyStatus(poiU, 'poison', {}, w);
BD.applyStatus(poiU, 'poison', {}, w);
BD.applyStatus(poiU, 'poison', {}, w);
BD.applyStatus(poiU, 'poison', {}, w);
BD.applyStatus(poiU, 'poison', {}, w);
BD.applyStatus(poiU, 'poison', {}, w);
eq(BD.getStatus(poiU, 'poison').stacks, 5, '中毒最多 5 層');
eq(BD.dotDps(poiU), 20, '中毒 dps = 4 × 層數');
BD.tickStatuses(poiU, 1.0, w);
eq(calls.length, 1, '中毒每 1 秒觸發一次');
eq(calls[0] && calls[0].dmg, 20, '中毒每次造成 4 × 5 點傷害');

// ── 流血：衰減、爆發 ──
calls.length = 0;
const blU = dotUnit({ maxHp: 1000 });
BD.applyStatus(blU, 'bleed', { stacks: 94 }, w);
eq(BD.getStatus(blU, 'bleed').stacks, 94, '流血值即 stack');
BD.tickStatuses(blU, 1, w);
close(BD.getStatus(blU, 'bleed').stacks, 88, '流血每秒衰減 6 點');
BD.applyStatus(blU, 'bleed', { stacks: 100 }, w);
eq(BD.hasStatus(blU, 'bleed'), false, '流血達 100 時爆發並移除');
eq(calls.length, 1, '流血爆發造成一次傷害');
eq(calls[0] && calls[0].dmg, 150, '流血爆發傷害 = 15% 最大生命');
eq(calls[0] && calls[0].posture, 25, '流血爆發附帶 25 架勢');
const bl2 = dotUnit();
BD.applyStatus(bl2, 'bleed', { stacks: 100 }, w);
BD.applyStatus(bl2, 'bleed', { stacks: 100 }, w);
eq(calls.length >= 2, true, '再滿一次仍會爆發（無遞迴鎖死）');
const bl3 = dotUnit();
BD.applyStatus(bl3, 'bleed', { stacks: 4 }, w);
BD.tickStatuses(bl3, 1, w);
eq(BD.hasStatus(bl3, 'bleed'), false, '流血值歸零後移除');
calls.length = 0;

// ── 護盾 ──
const shU = dotUnit();
BD.applyStatus(shU, 'shield', { value: 50 }, w);
eq(BD.getStatus(shU, 'shield').value, 50, '護盾初始吸收值');
eq(BD.absorbDamage(shU, 30, w), 0, '護盾吸收全部傷害');
eq(BD.getStatus(shU, 'shield').value, 20, '護盾剩餘值扣減');
BD.applyStatus(shU, 'shield', { value: 10 }, w);
eq(BD.getStatus(shU, 'shield').value, 20, '重新施加保留較大值');
BD.applyStatus(shU, 'shield', { value: 80 }, w);
eq(BD.getStatus(shU, 'shield').value, 80, '重新施加較大值會覆寫');
eq(BD.absorbDamage(shU, 100, w), 20, '護盾破裂後回傳剩餘傷害');
eq(BD.hasStatus(shU, 'shield'), false, '吸收完畢後護盾移除');

// ── 易傷 / 狂暴 ──
const vulU = { statuses: [] };
BD.applyStatus(vulU, 'vulnerable', {});
close(BD.getMod(vulU, 'dmgTakenMul'), 1.25, '易傷提高承受傷害');
BD.applyStatus(vulU, 'enrage', {});
close(BD.getMod(vulU, 'dmgDealtMul'), 1.3, '狂暴提高造成傷害');
close(BD.getMod(vulU, 'speedMul'), 1.2, '狂暴提高移動速度');

// ── status 動作 ──
const act = BD.actions.status;
ok(!!act, 'status 動作已註冊');
eq(act.active, false, 'status 動作不算出招中');
const target = { statuses: [] }, caster = { statuses: [], enemy: target };
act.fn({ fx: {} }, caster, {}, { id: 'test_a', dur: 3, target: 'enemy' });
eq(BD.hasStatus(target, 'test_a'), true, 'status 動作可對敵人施加狀態');
eq(BD.statusRemaining(target, 'test_a'), 3, 'status 動作傳遞 dur');


// ─────────────────────── 整合測試（真正的 BD.World，不推進 AI）───────────────────────
function world(seed, extra) {
  return new BD.World(BD.bossById.magmus, BD.bossById.witch, Object.assign({ seed: seed || 1, intro: 0 }, extra || {}));
}
function hit(w, src, tgt, dmg) { return w.damageBoss(src, tgt, { dmg, posture: 0 }); }

// 護盾：完全吸收 / 部分吸收
{
  const w = world(1), [a, b] = w.bosses;
  BD.applyStatus(b, 'shield', { value: 100, dur: 8 }, w);
  const hp0 = b.hp;
  eq(hit(w, a, b, 60), 'absorbed', '護盾完全吸收時 damageBoss 回傳 absorbed');
  eq(b.hp, hp0, '護盾完全吸收時 hp 不變');
  const sw = BD.getStatus(b, 'shield');
  const left = sw ? sw.value : 0;
  ok(sw && left > 30 && left < 50, `護盾吸收後剩餘量等於 100 − 首次傷害（實際 ${left}）`);
  const r = hit(w, a, b, Math.ceil(left) + 30);
  eq(r, 'hit', '護盾破裂後傷害正常命中');
  ok(b.hp < hp0 && b.hp >= hp0 - 34 && b.hp <= hp0 - 25, `護盾部分吸收後 hp 只扣剩餘傷害（實際 ${hp0 - b.hp}，剩餘護盾 ${left}）`);
}

// 易傷：相同種子、相同一擊，傷害放大到 1.25 倍
{
  const w1 = world(7), w2 = world(7);
  const [a1, b1] = w1.bosses, [a2, b2] = w2.bosses;
  BD.applyStatus(b2, 'vulnerable', { dur: 5 }, w2);
  const h1 = b1.hp, h2 = b2.hp;
  hit(w1, a1, b1, 100); hit(w2, a2, b2, 100);
  const d1 = h1 - b1.hp, d2 = h2 - b2.hp;
  ok(d1 > 0 && d2 > 0, '兩次測試皆造成傷害');
  close(BD.getMod(b2, 'dmgTakenMul'), 1.25, '易傷使 dmgTakenMul = 1.25');
  ok(Math.abs(d2 / d1 - 1.25) <= 0.02, `易傷傷害比約為 1.25（實際 ${(d2 / d1).toFixed(4)}）`);
}

// 硬直：狀態綁定 state，且承受傷害 ×1.3
{
  const w = world(1), [a, b] = w.bosses;
  BD.applyStatus(b, 'stagger', { dur: 1.5 }, w);
  eq(b.state, 'stagger', '施加硬直後 boss.state === stagger');
  close(BD.getMod(b, 'dmgTakenMul'), 1.3, '硬直時承受傷害 ×1.3');
  const w0 = world(1), [a0, b0] = w0.bosses;
  const h0 = b0.hp, hb = b.hp;
  hit(w0, a0, b0, 100); hit(w, a, b, 100);
  ok((hb - b.hp) > (h0 - b0.hp), '硬直使同一擊造成更多傷害');
}

// iframe：阻擋一般命中，但不阻擋狀態 DoT
{
  const w = world(1), [a, b] = w.bosses;
  BD.applyStatus(b, 'iframe', { dur: 1 }, w);
  const hp0 = b.hp;
  eq(hit(w, a, b, 100), 'dodged', 'iframe 期間一般命中被閃避');
  eq(b.hp, hp0, 'iframe 期間一般命中不造成傷害');
  BD.applyStatus(b, 'burn', { dur: 3, source: a }, w);
  BD.tickStatuses(b, 0.5, w);
  ok(b.hp < hp0, '燃燒 DoT 無視 iframe 造成傷害');
}

// 延長賽：時間超過 enrageAt 後雙方獲得 overtime，承受傷害倍率 = world.enrage
{
  const w = world(3, { enrageAt: 5 });
  w.time = 5.5;
  w.step(BD.STEP);
  for (const b of w.bosses) {
    ok(BD.hasStatus(b, 'overtime'), `${b.def.id} 在延長賽獲得 overtime`);
    close(BD.getMod(b, 'dmgTakenMul'), w.enrage, `${b.def.id} 的 dmgTakenMul = world.enrage`);
  }
  ok(w.enrage > 1, '延長賽倍率大於 1');
}

// 召喚物：可被施加中毒並在 tickStatuses 後扣血
{
  const w = world(1), b = w.bosses[0];
  ok(!!BD.minionTypes.spider, 'spider 召喚物種類已註冊');
  const m = BD.spawnMinion(w, b, 'spider', 0, 1);
  ok(!!m && w.minions.indexOf(m) >= 0, 'spawnMinion 生成幼蟲');
  BD.applyStatus(m, 'poison', { dur: 6, source: b.enemy }, w);
  eq(BD.getStatus(m, 'poison').stacks, 1, '召喚物可獲得中毒');
  const hp0 = m.hp;
  BD.tickStatuses(m, 1.0, w);
  ok(m.hp < hp0, `中毒使召喚物扣血（${hp0} → ${m.hp}）`);
}

// ── 沉重模式（heavy）執行期機制 ──
function heavyWorld(seed) {
  return new BD.World(BD.bossById.magmus, BD.bossById.witch, { seed: seed || 1, intro: 0, pace: 'heavy' });
}

// 擊倒：200 傷害 / 700 擊退觸發倒地，期間無法行動；結束後獲得起身保護與無敵
{
  const w = heavyWorld(1), [a, b] = w.bosses;
  eq(b.def.pace != null, true, '沉重模式的衍生定義帶有 pace');
  eq(BD.hasStatus(b, 'knockdown'), false, '初始未倒地');
  const r = w.damageBoss(a, b, { dmg: 200, posture: 0, kb: 700 });
  eq(r, 'hit', '擊倒觸發於一般命中');
  eq(b.state, 'knockdown', '200 傷害 / 700 擊退使 boss.state === knockdown');
  eq(BD.hasStatus(b, 'knockdown'), true, '倒地狀態已施加');
  eq(BD.getMod(b, 'canAct'), false, '倒地期間無法行動');
  eq(BD.getMod(b, 'canDodge'), false, '倒地期間無法翻滾');
  close(BD.getMod(b, 'dmgTakenMul'), 0.75, '倒地期間承受傷害 ×0.75');
  const dur = b.def.pace.knockdown.dur;
  for (let i = 0; i < Math.ceil(dur / BD.STEP) + 2; i++) b.update(BD.STEP);
  eq(b.state, 'idle', '倒地時間結束後起身');
  eq(BD.hasStatus(b, 'knockdown'), false, '起身後移除倒地狀態');
  eq(BD.hasStatus(b, 'kdGuard'), true, '起身後獲得起身保護');
  eq(BD.hasStatus(b, 'iframe'), true, '起身後獲得短暫無敵');
  BD.removeStatus(b, 'iframe', 'manual', w);
  const r2 = w.damageBoss(a, b, { dmg: 200, posture: 0, kb: 700 });
  ok(r2 !== 'none', '起身保護期間仍可受到傷害（未被擊倒）');
  eq(b.state === 'knockdown', false, '起身保護期間不會再次倒地');
  eq(BD.hasStatus(b, 'knockdown'), false, '起身保護期間不再施加倒地');
}

// 命中凍結：150 傷害後 freezeF > 0，凍結期間 step() 不推進時間
{
  const w = heavyWorld(1), [a, b] = w.bosses;
  eq(w.freezeF, 0, '沉重模式初始無命中凍結');
  w.damageBoss(a, b, { dmg: 150, posture: 0 });
  ok(w.freezeF > 0, `150 傷害觸發命中凍結（freezeF=${w.freezeF}）`);
  const t0 = w.time, n = w.freezeF;
  w.step(BD.STEP);
  eq(w.time, t0, '凍結期間 step() 不推進 w.time');
  eq(w.freezeF, n - 1, '凍結步數逐幀遞減');
  for (let i = 0; i < n - 1; i++) w.step(BD.STEP);
  eq(w.freezeF, 0, '凍結結束後歸零');
  const t1 = w.time;
  w.step(BD.STEP);
  ok(w.time > t1, '凍結結束後時間恢復推進');
}

// 輕快模式：同樣的一擊不觸發凍結或擊倒
{
  const w = world(1), [a, b] = w.bosses;
  w.damageBoss(a, b, { dmg: 200, posture: 0, kb: 700 });
  eq(w.freezeF, 0, '輕快模式不觸發命中凍結');
  eq(BD.hasStatus(b, 'knockdown'), false, '輕快模式不觸發擊倒');
  eq(b.state === 'knockdown', false, '輕快模式 boss.state 不會是 knockdown');
}

// 空振硬直：沉重模式近戰技能落空後進入 whiff
{
  const w = heavyWorld(1), [a, b] = w.bosses;
  const sk = a.skills.find((s) => (s.tags || []).includes('melee')) || a.skills.find((s) => (s.tags || []).includes('gap'));
  ok(!!sk, '找到近戰 / 突進技能');
  a.state = 'idle'; a.inst = { skill: sk, v: sk.v1, landed: false };
  a.endSkill();
  eq(a.state, 'whiff', '近戰技能落空後進入 whiff');
  close(a.stateDur, a.def.pace.whiff, 'whiff 持續時間取自 pace.whiff');
  for (let i = 0; i < Math.ceil(a.def.pace.whiff / BD.STEP) + 2; i++) a.update(BD.STEP);
  eq(a.state, 'idle', 'whiff 結束後恢復待機');
  a.state = 'idle'; a.inst = { skill: a.ultimate, v: a.ultimate.v1, landed: false };
  a.endSkill();
  eq(a.state, 'idle', '大招落空不會進入 whiff');
  const a2 = heavyWorld(1).bosses[0];
  a2.state = 'idle'; a2.inst = { skill: sk, v: sk.v1, landed: true };
  a2.endSkill();
  eq(a2.state, 'idle', '命中的技能結束後不會進入 whiff');
  // 由 damageBoss 實際命中時標記 landed（而非人工設定）
  const w3 = heavyWorld(1), [a3, b3] = w3.bosses;
  const inst3 = { skill: sk, v: sk.v1, landed: false };
  a3.state = 'skill'; a3.inst = inst3;
  w3.damageBoss(a3, b3, { dmg: 30, posture: 0 });
  eq(inst3.landed, true, 'damageBoss 命中後標記出招已命中（landed）');
}

// ── 連段（僅沉重）──
{
  // 輕快模式：完全不建立連段、不讀取連段資料
  const w = world(1), [a, b] = w.bosses;
  eq(a.controller.combo, null, '輕快模式：controller.combo 為 null');
  eq(a.def.pace, undefined, '輕快模式：Boss 定義沒有 pace');
  eq(b.stats.combo, undefined, '輕快模式：不建立連段統計');
  eq(a.def.ai.combos != null, true, '輕快模式：combos 僅是資料，不建立執行期狀態');
  while (!w.over && w.time < 30) { w.hitstop = 0; w.slowmo = 0; w.step(BD.STEP); }
  eq(a.stats.combo === undefined && b.stats.combo === undefined, true, '輕快模式：對戰後仍沒有連段統計');
}
{
  // 連段起手：技能、統計、結束後的冷卻
  const w = heavyWorld(1), a = w.bosses[0], b = w.bosses[1], ctl = a.controller;
  ok(ctl.combo instanceof BD.ComboRunner, '沉重模式：controller.combo 是 ComboRunner');
  const all = a.def.ai.combos, def = all.filter((c) => !c.phase).sort((x, y) => y.steps.length - x.steps.length)[0];
  const sk = a.skills.find((s) => s.id === def.steps[0].skill);
  a.state = 'idle';
  eq(ctl.startCombo(def), true, '起手連段成功');
  eq(a.state, 'skill', '起手連段後 Boss 進入 skill');
  eq(a.stats.combo.started, 1, '連段統計 started +1');
  eq(a.stats.comboUse[def.id], 1, '連段使用次數記錄在 comboUse');
  // 取消窗之前不會接段
  const next = def.steps[1], nextSk = a.skills.find((s) => s.id === next.skill);
  a.inst.t = a.inst.v.windup * 0.3;
  ctl.combo.update(BD.STEP);
  eq(a.inst.skill, sk, '取消窗之前不會接下一段');
  // 取消窗：切到下一段
  // 推進到收招期的取消窗內
  for (let i = 0; i < 2000 && !(a.state === 'skill' && a.skillPhase() === 'recovery' && a.recoveryLeft() <= 0.5); i++) a.update(0.01);
  ok(a.skillPhase() === 'recovery', '第一段已進入收招');
  ok(a.inst && a.inst.skill === sk, '收招期間仍在第一段');
  // 拉近距離，避免 branch 的 dist 規則直接停止連段
  b.x = a.x + 90; b.y = a.y;
  w.confine(b);
  a.inst.landed = true;
  // inst.t 在 cancelSkill 後由 update 重設，無法手工塞時間：用極小 dt 逐步推進
  ctl.combo.update(BD.STEP);
  eq(a.inst && a.inst.skill, nextSk, `收招剩餘 <= cancel 時接下一段（${next.skill}）`);
  eq(a.stats.combo.steps, 1, '連段統計 steps +1');
  // 最後一段結束 → 完成並進入冷卻
  const last = def.steps[def.steps.length - 1];
  for (let i = 0; i < 400 && ctl.combo.c; i++) {
    a.inst.landed = true;
    a.update(BD.STEP);
    ctl.combo.update(BD.STEP);
    if (a.state === 'idle') ctl.combo.update(BD.STEP);
  }
  ok(!ctl.combo.c, '連段在最後一段後結束');
  ok(a.stats.combo.completed + a.stats.combo.stopped + a.stats.combo.interrupted > 0, '連段結束有記錄原因');
  ok(ctl.comboCd[def.id] > w.time, '連段結束後進入冷卻');
  // 冷卻期間無法再起手同一串
  a.state = 'idle';
  eq(ctl.startCombo(def), false, '冷卻期間不能起手同一串連段');
}
{
  // 空振取消：連段換段時不會進入 whiff（endSkill 的 noWhiff）
  const w = heavyWorld(1), a = w.bosses[0];
  const sk = a.skills.find((s) => (s.tags || []).includes('melee'));
  a.state = 'skill'; a.inst = { skill: sk, v: sk.v1, t: 0, landed: false };
  a.comboCancel();
  eq(a.state, 'idle', 'comboCancel：提前結束且不進入 whiff');
  eq(a.inst, null, 'comboCancel：清除出招狀態');
  eq(a.lastSkillId, sk.id, 'comboCancel：記錄最後技能');
  // 對照：一般 endSkill 仍會空振
  a.state = 'skill'; a.inst = { skill: sk, v: sk.v1, t: 0, landed: false };
  a.endSkill();
  eq(a.state, 'whiff', '一般 endSkill 空振行為不變');
}
{
  // 裁切：砍掉剩餘收招並進入 recover（可被懲罰）
  const w = heavyWorld(1), [a, b] = w.bosses;
  const sk = a.skills.find((s) => (s.tags || []).includes('melee'));
  a.state = 'skill'; a.inst = { skill: sk, v: sk.v1, t: 0, landed: true };
  a.cutSkill(0.4);
  eq(a.state, 'recover', 'cutSkill 進入 recover');
  eq(a.inst, null, 'cutSkill 清除出招狀態');
  ok(b.controller.punishWindow() > 0, 'recover 是可被懲罰的破口（punishWindow > 0）');
  for (let i = 0; i < Math.ceil(0.4 / BD.STEP) + 2; i++) a.update(BD.STEP);
  eq(a.state, 'idle', 'recover 時間結束後恢復待機');
}
{
  // 翻滾方向判定
  const me = { x: 0, y: 0 }, e = { x: 100, y: 0, r: 30 };
  eq(BD.rollDirOf(me, e, 0), 'back', '背向我們翻滾 → back');
  eq(BD.rollDirOf(me, e, Math.PI), 'through', '朝向我們翻滾 → through');
  eq(BD.rollDirOf(me, e, Math.PI / 2), 'right', '垂直翻滾（+90°）→ right');
  eq(BD.rollDirOf(me, e, -Math.PI / 2), 'left', '垂直翻滾（-90°）→ left');
  // when 判定
  const ctl = { b: { sta: 50, maxSta: 100, phase: 1 }, e: { state: 'idle' } };
  const snap = { landed: true, rolled: false, rollDir: null, dist: 120 };
  eq(BD.evalComboWhen(ctl, { landed: true }, snap), true, 'when.landed 成立');
  eq(BD.evalComboWhen(ctl, { landed: false }, snap), false, 'when.landed 不成立');
  eq(BD.evalComboWhen(ctl, { rolled: true }, snap), false, 'when.rolled 不成立');
  eq(BD.evalComboWhen(ctl, { rollDir: ['left', 'through'] }, snap), false, 'when.rollDir 沒有翻滾時不成立');
  eq(BD.evalComboWhen(ctl, { dist: [0, 200] }, snap), true, 'when.dist 在範圍內');
  eq(BD.evalComboWhen(ctl, { dist: [200, 400] }, snap), false, 'when.dist 在範圍外');
  eq(BD.evalComboWhen(ctl, { sta: 0.4 }, snap), true, 'when.sta 體力足夠');
  eq(BD.evalComboWhen(ctl, { sta: 0.6 }, snap), false, 'when.sta 體力不足');
  eq(BD.evalComboWhen(ctl, { phase: 2 }, snap), false, 'when.phase 不符');
  eq(BD.evalComboWhen(ctl, { enemyState: ['idle'] }, snap), true, 'when.enemyState 相符');
  eq(BD.evalComboWhen(ctl, null, snap), true, '沒有 when 視為成立');
}
{
  // 隨機：固定種子的沉重對戰會出現連段；統計數字合理
  let started = 0, steps = 0, games = 0;
  for (let seed = 1; seed <= 3; seed++) {
    const w = heavyWorld(seed);
    while (!w.over && w.time < 240) { w.hitstop = 0; w.slowmo = 0; w.step(BD.STEP); }
    games++;
    for (const x of w.bosses) if (x.stats.combo) { started += x.stats.combo.started; steps += x.stats.combo.steps; }
  }
  ok(started > 0, `沉重對戰會發動連段（${started} 次）`);
  ok(steps <= started * 4, '接段次數不超過起手次數 × 最多段數');
  eq(games, 3, '三場沉重對戰完成');
}


// ── OpponentModel：對手習慣模型（純計數，無隨機）──
{
  const w = new BD.World(BD.bossById.magmus, BD.bossById.ronin, { seed: 1, intro: 0, pace: 'heavy' });
  const me = w.bosses[0], e = w.bosses[1];
  const m = new BD.OpponentModel(me.controller, { memory: 18, early: 0.4, conf: 3 });
  w.time = 10;
  m.lastT = w.time;
  for (let i = 0; i < 6; i++) {
    const tg = { owner: me, team: me.team, soft: false, shape: { kind: 'circle', x: e.x, y: e.y, r: 80 }, t: 0, hitIn: 0.7 };
    w.telegraphs.push(tg);
    e.state = 'dodge'; e.lastDodgeStart = w.time; e.dodgeAng = U.angTo(me, e) - Math.PI / 2;
    m.update(1 / 60);
    e.state = 'idle';
    m.update(1 / 60);
    w.time += 1.0;
    w.telegraphs.splice(w.telegraphs.indexOf(tg), 1);
  }
  ok(m.early() > 0.8, `提早翻滾比例高（${m.early().toFixed(2)}）`);
  eq(m.dominantDir().dir, 'left', '主要翻滾方向為左');
  ok(m.conf(m.timedN()) > 0.6, `樣本信心足夠（${m.conf(m.timedN()).toFixed(2)}）`);

  // 衰減
  const n0 = m.timedN();
  w.time += 3 * 18;
  ok(m.timedN() < n0 * 0.15, `計數隨時間衰減（${n0.toFixed(2)} → ${m.timedN().toFixed(3)}）`);

  // 預測落地：角落仍在場內、且被推離柱子
  m.m.rollDist = { sum: 2000, w: 10 };
  const p1 = m.predictLanding({ x: 20, y: 20 }, -2.3);
  ok(p1.x >= 40 && p1.x <= BD.ARENA.w - 40 && p1.y >= 40 && p1.y <= BD.ARENA.h - 40, `落地點在場內（${p1.x.toFixed(0)},${p1.y.toFixed(0)}）`);
  let outside = null;
  for (const pl of BD.ARENA.pillars) {
    const from = { x: pl.x - (pl.r + e.r + 4 + 150), y: pl.y };
    const to = { x: pl.x, y: pl.y };
    const ang = U.angTo(from, to);
    const p2 = m.predictLanding(from, ang);
    if (Math.hypot(p2.x - pl.x, p2.y - pl.y) < pl.r + e.r + 4 - 1e-6) { outside = pl; break; }
  }
  ok(outside === null, '落地預測被推離柱子');

  // 懲罰率
  const m2 = new BD.OpponentModel(me.controller, { memory: 18, early: 0.4, conf: 3 });
  m2.lastT = w.time;
  me.state = 'idle'; m2.update(1 / 60);
  me.state = 'whiff'; m2.update(1 / 60);
  w.time += 0.5;
  e.inst = { id: 999, t: 0, hold: 0, v: { windup: 0.5, dmgTimes: [0.5], dur: 1 }, skill: e.skills[0], landed: false };
  e.state = 'skill'; m2.update(1 / 60);
  ok(m2.punishRate() > 0.9, `破綻被懲罰率高（${m2.punishRate().toFixed(2)}）`);
}

// ── 讀習慣（AIController）：預判瞄準、延遲出招、light 不建立模型 ──
{
  const w = heavyWorld(3), ctl = w.bosses[0].controller, b = w.bosses[0], e = w.bosses[1];
  ok(!!ctl.model, '沉重 AI 建立對手模型');
  const sk = b.available().find((s) => !s.ult && b.skillReady(s)) || b.skills[0];
  w.intro = 0;
  b.startSkill(sk, { force: true });
  ctl.setAim({ x: 321, y: 234 }, '測試預判');
  eq(b.aimTarget(), ctl.aimOverride, 'Boss.aimTarget 回傳預判落點');
  eq(b.aimTarget().x, 321, '預判落點 x 正確');
  b.state = 'idle'; b.inst = null;
  w.time += 2;
  ctl.update(1 / 60);
  eq(ctl.aimOverride, null, '技能結束後清除預判');

  // 餵入 8 次早滾 → 延遲出招偶爾 > 0
  for (let i = 0; i < 8; i++) {
    const tg = { owner: b, team: b.team, soft: false, shape: { kind: 'circle', x: e.x, y: e.y, r: 80 }, t: 0, hitIn: 0.7 };
    w.telegraphs.push(tg);
    e.state = 'dodge'; e.lastDodgeStart = w.time; e.dodgeAng = U.angTo(b, e) - Math.PI / 2;
    ctl.model.update(1 / 60);
    e.state = 'idle';
    ctl.model.update(1 / 60);
    w.time += 1.0;
    w.telegraphs.splice(w.telegraphs.indexOf(tg), 1);
  }
  ok(ctl.model.early() > 0.5, `模型讀到早滾習慣（${ctl.model.early().toFixed(2)}）`);
  // 固定「起手後 0.3 秒翻滾」的反應延遲
  for (let i = 0; i < 8; i++) { ctl.model.addMean('react', 0.3); ctl.model.addMean('react2', 0.09); }
  const meleeSk = { tags: ['melee'], v1: { windup: 0.45 }, v2: { windup: 0.45 } };
  const summonSk = b.skills.find((s) => (s.tags || []).includes('summon'));
  let hits = 0;
  for (let i = 0; i < 20; i++) { b.state = 'idle'; if (ctl.readHold(meleeSk) > 0) hits++; }
  ok(hits > 0, `早滾習慣下 readHold 偶爾延遲（${hits}/20）`);
  if (summonSk) eq(ctl.readHold(summonSk), 0, '召喚技能不延遲');
  eq(ctl.readHold({ tags: ['summon'] }), 0, '只含 summon 標籤的技能 readHold 為 0');
}
{
  const w = new BD.World(BD.bossById.magmus, BD.bossById.witch, { seed: 1, intro: 0 });
  const ctl = w.bosses[0].controller;
  eq(ctl.model, undefined, 'light AI 不建立對手模型');
  eq(w.bosses[0].aimTarget(), w.bosses[0].enemy, 'light aimTarget 為敵人本體');
}

// ── 智慧閃避方向（僅沉重）──
{
  const w = new BD.World(BD.bossById.magmus, BD.bossById.ronin, { seed: 1, intro: 0, pace: 'heavy' });
  const b = w.bosses[0], e = w.bosses[1];
  w.time = 3;
  b.x = 70; b.y = 410;
  const shape = { kind: 'circle', x: b.x, y: b.y, r: 90 };
  const thRef = { id: 9001, team: 1, owner: e, soft: false, shape, t: 0, hitIn: 0.9, a: null };
  w.telegraphs.push(thRef);
  const ctl = b.controller;
  const th = { key: 't9001', kind: 'tele', ref: thRef, left: 0.9, big: false, melee: false };
  const ang = ctl.chooseEscape(th, 'roll');
  const D = b.def.pace.dodgeDur, dist = b.def.dodgeSpeed * (0.26 + (D - 0.26) * 0.5);
  const end = { x: b.x + Math.cos(ang) * dist, y: b.y + Math.sin(ang) * dist, r: b.r };
  const A = BD.ARENA;
  ok(end.x >= b.r && end.x <= A.w - b.r && end.y >= b.r && end.y <= A.h - b.r, `智慧閃避落點在場內（${end.x.toFixed(1)}, ${end.y.toFixed(1)}）`);
  ok(!A.pillars.some((pl) => Math.hypot(end.x - pl.x, end.y - pl.y) < pl.r + b.r), '智慧閃避落點不在柱子內');
  ok(!U.hitShape(shape, { x: end.x, y: end.y, r: b.r + 10 }), '智慧閃避落點逃出預警圓');
  // 2) 候選：外圈得分高於圈內
  const dg = ctl.dbg.dodge;
  ok(dg && dg.cands.length > 0, '記錄 chooseEscape 候選');
  const inside = [], outside = [];
  for (const c of dg.cands) {
    (U.hitShape(shape, { x: c.x, y: c.y, r: b.r + 10 }) ? inside : outside).push(c.s);
  }
  ok(inside.length > 0 && outside.length > 0, '同時存在圈內 / 圈外候選');
  ok(Math.max(...outside) > Math.max(...inside), '圈外候選得分高於圈內候選');
  ok(dg.best >= 0 && dg.cands[dg.best].s === Math.max(...dg.cands.map((c) => c.s)), '最佳候選為最高分');
}
{
  const w = new BD.World(BD.bossById.magmus, BD.bossById.ronin, { seed: 1, intro: 0 });
  for (let i = 0; i < 60 * 20 && !w.over; i++) w.step(1 / 60);
  eq(w.bosses[0].stats.smart, undefined, 'light 模式 boss0 不建立 smart 統計');
  eq(w.bosses[1].stats.smart, undefined, 'light 模式 boss1 不建立 smart 統計');
}

console.log(failed ? `STATUS TESTS FAIL (${failed} failed, ${passed} passed)` : `STATUS TESTS PASS (${passed})`);
process.exit(failed ? 1 : 0);
