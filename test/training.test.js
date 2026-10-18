'use strict';
const { load } = require('./lib/load');
const { BD } = load();

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; return; }
  failed++; console.log('FAIL ' + msg);
}
function eq(a, b, msg) { ok(a === b, `${msg}（期望 ${b}，實際 ${a}）`); }
function close(a, b, eps, msg) { ok(Math.abs(a - b) <= (eps || 1e-4), `${msg}（期望約 ${b}，實際 ${a}）`); }

// 判斷動作是否包含傷害或召喚
function isDamagingAction(a) {
  if (!a || typeof a !== 'object') return false;
  if ((typeof a.dmg === 'number' && a.dmg > 0) || (typeof a.dps === 'number' && a.dps > 0) || a.do === 'summon') return true;
  for (const k of Object.keys(a)) {
    if (typeof a[k] === 'object' && isDamagingAction(a[k])) return true;
  }
  return false;
}
function isDamaging(actions) {
  return (actions || []).some(isDamagingAction);
}

// 允許空振的技能名單（需為受攻擊觸發的反擊技、或假人站立不動無法觸發的陷阱）
const ALLOW_MISS = new Set([
  'fiora:parry_w',  // 招架：架式期間需受攻擊才會觸發反擊；假人不攻擊
  'mihawk:parry',   // 撥擋：架式期間需受攻擊才會觸發反擊；假人不攻擊
  'ronin:mikiri',  // 見切：架式期間需受攻擊才會觸發反斬；假人不攻擊
  'watcher:parry',  // 匕首彈反：架式期間需受攻擊才會觸發反斬；假人不攻擊
  'witch:mines',    // 霜凍地雷：陷阱散布於兩者之間，假人站立不動不會踩中
  'brood:web',      // 蛛網陷阱：陷阱環繞假人外圍生成（距離 150px），假人不動不會觸發
  'magmus:pools',   // 熔岩池：熔岩池散布於目標兩側（off 170px，半徑 105px），假人站立不動不會接觸
]);

for (const pace of ['light', 'heavy']) {
  for (const def of BD.bosses) {
    const id = def.id;
    const w = new BD.World(BD.bossById[id], BD.bossById.dummy, { seed: 7, pace, training: { mode: 'manual', range: 'mid' } });
    const tr = w.training;
    const boss = w.bosses[0];
    const dummy = w.bosses[1];

    ok(!BD.bosses.some((b) => b.id === 'dummy'), `${id} [${pace}]: dummy 不在 BD.bosses 清單中`);
    ok(!!tr, `${id} [${pace}]: w.training 存在`);
    const cx = BD.ARENA.w / 2;
    close(boss.x, cx - 260, 1, `${id} [${pace}]: boss x 位置約場中央左 260`);
    close(dummy.x, cx + 260, 1, `${id} [${pace}]: dummy x 位置約場中央右 260`);

    const skillList = [...boss.skills, boss.ultimate];

    for (const phase of [1, 2]) {
      const dmgRecords = [];
      for (const s of skillList) {
        tr.reset();
        if (phase === 2) {
          tr.setPhase(2);
          let waitT = 0;
          while (boss.phase !== 2 && waitT < 6) {
            w.step(1 / 60);
            waitT += 1 / 60;
          }
          eq(boss.phase, 2, `${id} [${pace}] P2: 成功進入二階段`);
          tr.clearStats(); // 轉階段的咆哮也會打到假人，先清掉，只統計本招
        }

        const sid = s.id;
        const r = s.range || [0, 600];
        const d = Math.max(boss.r + dummy.r + 40, Math.min(800, (r[0] + r[1]) / 2));
        tr.setHome(boss.x + d, boss.y);

        const usesBefore = boss.stats.uses[sid] || 0;
        const castOk = tr.cast(sid);
        ok(castOk, `${id} [${pace}] P${phase} ${sid}: tr.cast 成功`);

        let enteredSkill = false;
        for (let step = 0; step < 480; step++) {
          w.step(1 / 60);
          if (boss.state === 'skill') enteredSkill = true;
        }

        ok(enteredSkill, `${id} [${pace}] P${phase} ${sid}: 出招進入 skill 狀態`);
        const usesAfter = boss.stats.uses[sid] || 0;
        ok(usesAfter > usesBefore, `${id} [${pace}] P${phase} ${sid}: uses 計數增加（${usesBefore} -> ${usesAfter}）`);

        const actions = (phase === 2 && s.actions2) ? s.actions2 : s.actions;
        const damaging = isDamaging(actions);
        const missKey = `${id}:${sid}`;

        if (damaging && !ALLOW_MISS.has(missKey)) {
          ok(tr.stats.total > 0, `${id} [${pace}] P${phase} ${sid}: 造成傷害（期望 > 0，實際 ${tr.stats.total}）`);
        }
        dmgRecords.push(`${sid}:${tr.stats.total}`);
      }
      console.log(`[${pace}] ${id} P${phase}: ${dmgRecords.join(', ')}`);
    }

    // Dummy never dies
    ok(w.winner == null, `${id} [${pace}]: w.winner 為空`);
    ok(!w.over, `${id} [${pace}]: 遊戲未結束`);
    ok(dummy.hp > 0, `${id} [${pace}]: dummy.hp > 0`);
    eq(dummy.phase, 1, `${id} [${pace}]: dummy.phase 為 1`);
  }
}

// Reset clears
{
  const w = new BD.World(BD.bossById.brood, BD.bossById.dummy, { seed: 7, training: { mode: 'manual', range: 'mid' } });
  const tr = w.training;
  tr.cast('spawn');
  tr.cast('acid');
  tr.cast('web');
  for (let i = 0; i < 120; i++) w.step(1 / 60);
  tr.reset();
  eq(w.minions.length, 0, 'reset: minions 清空');
  eq(w.zones.length, 0, 'reset: zones 清空');
  eq(w.projectiles.length, 0, 'reset: projectiles 清空');
  eq(w.traps.length, 0, 'reset: traps 清空');
  eq(w.lobs.length, 0, 'reset: lobs 清空');
  eq(w.telegraphs.length, 0, 'reset: telegraphs 清空');
  eq(w.scheduled.length, 0, 'reset: scheduled 清空');
  eq(w.bosses[0].statuses.length, 0, 'reset: boss statuses 清空');
  eq(w.bosses[1].statuses.length, 0, 'reset: dummy statuses 清空');
  eq(w.bosses[0].hp, w.bosses[0].maxHp, 'reset: boss hp 回滿');
  eq(w.bosses[0].phase, 1, 'reset: boss phase 為 1');
  close(w.bosses[0].x, tr.bossHome.x, 0.01, 'reset: boss 位於 bossHome');
  close(w.bosses[1].x, tr.home.x, 0.01, 'reset: dummy 位於 home');
}

// AI mode
{
  const w = new BD.World(BD.bossById.magmus, BD.bossById.dummy, { seed: 7, pace: 'heavy', training: { mode: 'ai', range: 'near' } });
  const tr = w.training;
  tr.reset();
  for (let i = 0; i < 600; i++) w.step(1 / 60); // 10 s
  ok(w.bosses[0].stats.skills > 0, 'AI mode: boss.stats.skills > 0');
  ok(tr.stats.total > 0, 'AI mode: tr.stats.total > 0');
  tr.setMode('manual');
  for (let i = 0; i < 240; i++) w.step(1 / 60); // 4 s
  const dist = Math.hypot(w.bosses[1].x - tr.home.x, w.bosses[1].y - tr.home.y);
  ok(dist <= 30, `AI mode return: dummy 返回 home（距離 ${dist.toFixed(1)} <= 30）`);
}

// Pin mode
{
  const w = new BD.World(BD.bossById.magmus, BD.bossById.dummy, { seed: 7, training: { mode: 'manual', range: 'near' } });
  const tr = w.training;
  tr.setKbMode('pin');
  tr.cast('charge');
  for (let i = 0; i < 180; i++) w.step(1 / 60);
  close(w.bosses[1].x, tr.home.x, 0.01, 'Pin mode: dummy 保持在 home.x');
  close(w.bosses[1].y, tr.home.y, 0.01, 'Pin mode: dummy 保持在 home.y');
}

// freeCast off
{
  const w = new BD.World(BD.bossById.magmus, BD.bossById.dummy, { seed: 7, training: { mode: 'manual', range: 'near' } });
  const tr = w.training;
  tr.setFreeCast(false);
  tr.reset();
  const boss = w.bosses[0];
  const skill = boss.skills[0];
  tr.cast(skill.id);
  w.step(1 / 60);
  while (boss.state === 'skill') w.step(1 / 60);
  const usesAfterFirst = boss.stats.uses[skill.id];
  eq(usesAfterFirst, 1, 'freeCast off: 首次施放完成，使用次數為 1');
  tr.cast(skill.id);
  w.step(1 / 60);
  eq(boss.stats.uses[skill.id], usesAfterFirst, 'freeCast off: 冷卻中再次施放未增加使用次數');
  ok(tr.notices.some((n) => n.text.includes('尚未就緒')), 'freeCast off: 推送尚未就緒提示');
}

// Determinism guard
{
  const normalWorld = new BD.World(BD.bossById.magmus, BD.bossById.ronin, { seed: 42 });
  eq(normalWorld.training, null, '正常 World.training 必須為 null');
  ok(!BD.bosses.some((b) => b.id === 'dummy'), 'BD.bosses 中不可包含 dummy');
}

console.log(failed ? `TRAINING TEST FAIL (${failed} failed, ${passed} passed)` : `TRAINING TEST PASS (${passed} checks)`);
process.exit(failed ? 1 : 0);
