'use strict';
// 亞當的神虛視（trait reflect）與死立不倒：架式被攻擊 → 複製對手整招反擊；二階段將死 → 生命鎖 1、期間無敵、時間到才倒下
const { load } = require('./lib/load');
const { BD } = load();
let passed = 0, failed = 0;
function ok(c, m) { if (c) passed++; else { failed++; console.log('FAIL ' + m); } }
const STEP = BD.STEP;

// ── 1. 神虛視：Adam 擺出架式，魔女出一招冰槍 → 應改用複製的反擊，且打到魔女 ──
{
  const w = new BD.World(BD.bossById.adam, BD.bossById.witch, { seed: 5 });
  const a = w.bosses[0], e = w.bosses[1];
  w.intro = 0; a.x = 400; a.y = 400; e.x = 700; e.y = 400; a.face = 0; e.face = Math.PI;
  a.startSkill(a.skills.find((s) => s.id === 'divine_sight'), { force: true });
  e.startSkill(e.skills.find((s) => s.id === 'lance'), { force: true });
  const hp0 = e.hp;
  for (let i = 0; i < 360 && a.lastSkillId !== 'reflect_copy' && !(a.inst && a.inst.skill.id === 'reflect_copy'); i++) { a.x = 400; a.y = 400; w.step(STEP); }
  ok(a.stats.uses.reflect_copy === 1 || (a.inst && a.inst.skill.id === 'reflect_copy') || a.lastSkillId === 'reflect_copy', '架式被攻擊後應改用複製的反擊');
  for (let i = 0; i < 240; i++) w.step(STEP);
  ok(e.hp < hp0, '複製的反擊應傷到對手');
  ok(a._seen && a._seen.lance === 1, '應記下看過的招式');
}

// ── 2. 死立不倒：二階段致命傷 → 鎖 1 點生命並無敵；只觸發一次；時間到才倒下 ──
{
  const w = new BD.World(BD.bossById.adam, BD.bossById.magmus, { seed: 1 });
  const a = w.bosses[0], e = w.bosses[1];
  w.intro = 0; a.phase = 2; a.hp = 5;
  const r = w.damageBoss(e, a, { dmg: 500, unblockable: true });
  ok(r === 'hit' && a.hp === 1 && a.state !== 'dead', `致命傷應被死立不倒擋下（結果 ${r}、hp ${a.hp}）`);
  ok(BD.hasStatus(a, 'deathstand'), '應進入死立不倒狀態');
  ok(w.damageBoss(e, a, { dmg: 500, unblockable: true }) === 'immune' && a.hp === 1, '死立不倒期間無敵');
  for (let i = 0; i < 60 * 5 && a.state !== 'dead'; i++) w.step(STEP);
  ok(a.state === 'dead' && w.winner === e, '時間到後亞當應倒下、對手獲勝');
}

// ── 3. 一階段不會死立不倒 ──
{
  const w = new BD.World(BD.bossById.adam, BD.bossById.magmus, { seed: 1 });
  const a = w.bosses[0], e = w.bosses[1];
  w.intro = 0; a.hp = 1;
  ok(w.damageBoss(e, a, { dmg: 500, unblockable: true }) === 'kill', '一階段致命傷應直接倒下');
}

// ── 4. 自動複製就緒判斷：沒看過 / 剛複製過不就緒；二階段間隔縮短；拳對拳對撞、AI 對沒看過的遠程招擺架式 ──
{
  const w = new BD.World(BD.bossById.adam, BD.bossById.witch, { seed: 3 });
  const a = w.bosses[0];
  ok(!BD.reflectAuto(w, a, 'lance'), '沒看過的招不能自動複製');
  a._seen = { lance: 1 }; w.time = 10; a._reflectAt = 6.5;
  ok(!BD.reflectAuto(w, a, 'lance'), '一階段 3.5 秒前才複製過，間隔未到');
  a.phase = 2;
  ok(BD.reflectAuto(w, a, 'lance'), '二階段間隔縮為 3 秒');
  ok(BD.skillClash(a.skills.find((s) => s.id === 'true_right')) === 2 && BD.skillClash(a.skills.find((s) => s.id === 'basic')) === 1, '真・神之右為 heavy、普攻為 light');
}

console.log(failed ? `REFLECT TEST FAIL (${failed} failed, ${passed} passed)` : `REFLECT TEST PASS (${passed})`);
process.exit(failed ? 1 : 0);
