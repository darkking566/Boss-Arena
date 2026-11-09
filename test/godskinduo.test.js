'use strict';
// 神皮雙人組：一般對戰展開成使徒＋貴人兩位完整 Boss、互相喚醒、兩人都倒才算輸；其他模式退回召喚物版；黑焰；貴人的招式真的打到人。
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const def = BD.bossById.godskinduo;
function make(pace = 'light', opts = {}) {
  const w = new BD.World(def, BD.bossById[opts.horde ? 'dummy' : 'redwolf'], { seed: 71, pace, intro: 0, ...opts });
  w.bosses.forEach((b) => { b.controller = { update() {} }; });
  const e = w.bosses[1]; e.x = w.bosses[0].x + 260; e.y = w.bosses[0].y; return w;
}
function run(w, seconds) { for (let t = 0; t < seconds; t += BD.STEP) { w.hitstop = w.slowmo = w.freezeF = 0; w.step(BD.STEP); } }
const kill = (w, by, b) => { b.phase = 2; b.state = 'idle'; b.hp = 5; BD.removeStatus(b, 'invuln'); w.hitBoss(by, b, { dmg: 200, posture: 0 }); };

// 一般對戰：兩位完整 Boss、同隊、各自的招式表；選角清單只有使徒這張
{
  const w = make(), [a, e, n] = w.bosses;
  assert.ok(w.teamMode && w.bosses.length === 3 && n.def.id === 'godskinnoble' && n.team === a.team && a.mate === n && n.mate === a);
  assert.strictEqual(a.name, '神皮使徒'); assert.strictEqual(n.name, '神皮貴人');
  assert.ok(n.skills.some((s) => s.id === 'wheel') && !a.skills.some((s) => s.id === 'wheel'));
  assert.ok(!BD.bosses.includes(BD.bossById.godskinnoble), '貴人不出現在選角');
  assert.ok(!w.minions.some((m) => m.kind === 'noble'), '雙人版沒有召喚物貴人');
  assert.strictEqual(e.enemy.team, a.team);
}
// 一個倒下 → 12 秒後另一個喚醒他（40%，第二次 30%）；兩人都倒下才分勝負
{
  const w = make(), [a, e, n] = w.bosses;
  kill(w, e, n); assert.strictEqual(n.state, 'dead'); assert.ok(!w.winner, '貴人倒下，使徒還在');
  run(w, 11.5); assert.strictEqual(n.state, 'dead');
  run(w, 1); assert.ok(n.state !== 'dead' && n.alive, '12 秒後貴人被喚醒'); assert.strictEqual(n.hp, Math.ceil(n.maxHp * 0.4));
  run(w, 2); kill(w, e, n); run(w, 12.5); assert.strictEqual(n.hp, Math.ceil(n.maxHp * 0.3), '第二次喚醒生命較少');
  run(w, 2); kill(w, e, n); kill(w, e, a); assert.ok(w.winner && w.winner.team === e.team, '兩人都倒下才算輸');
  run(w, 20); assert.strictEqual(n.state, 'dead', '分出勝負後不再喚醒');
}
// 二階段大招開頭立刻喚醒倒下的搭檔
{
  const w = make(), [a, e, n] = w.bosses; kill(w, e, n); a.phase = 2; a.state = 'idle';
  a.startSkill(a.ultimate, { force: true }); run(w, 0.1); assert.ok(n.state !== 'dead', '大招喚醒貴人');
}
// 其他模式（一邊一位 Boss）：不展開，使徒生命 ×soloHpMul，貴人是召喚物；使徒倒下時貴人還在就整場起身一次
{
  const w = make('light', { horde: true }), a = w.bosses[0];
  run(w, 0.2);
  assert.ok(!w.teamMode && !a.mate && BD.nobleOf(w, a), '召喚物貴人在場'); assert.strictEqual(a.maxHp, Math.round(def.maxHp * def.soloHpMul));
  kill(w, w.bosses[1], a); assert.ok(a.state !== 'dead' && a._rose, '貴人在場，使徒起身');
  run(w, 2); kill(w, w.bosses[1], a); assert.strictEqual(a.state, 'dead', '第二次直接倒下');
}
// 黑焰：最多 3 層、持續傷害
{
  const w = make(), e = w.bosses[1]; const hp = e.hp;
  for (let i = 0; i < 5; i++) BD.applyStatus(e, 'blackflame', { dur: 4, source: w.bosses[0] }, w);
  assert.strictEqual(BD.getStatus(e, 'blackflame').stacks, 3); BD.tickStatuses(e, 1, w); assert.ok(e.hp < hp);
}
// 貴人的招式真的打到站在原地的對手（輕快與沉重）
for (const pace of ['light', 'heavy']) for (const id of ['belly', 'rapier', 'tail', 'thrusts', 'wheel', 'crusher', 'ult']) {
  const w = make(pace), [a, e, n] = w.bosses; a.x = 100; a.y = 100;
  const sk = id === 'ult' ? n.ultimate : n.skills.find((s) => s.id === id); if (sk.phase === 2) n.phase = 2;
  n.x = e.x - 160; n.y = e.y; n.face = 0; run(w, 0.05);
  n.startSkill(sk, { force: true }); let hit = false;
  for (let t = 0; t < 8; t += BD.STEP) { w.hitstop = w.slowmo = w.freezeF = 0; w.step(BD.STEP); e.hp = e.maxHp; if (e.stats.taken > 0) { hit = true; break; } }
  assert.ok(hit, pace + ' 貴人 ' + id + ' 沒有打到人');
}
console.log('GODSKINDUO TEST PASS');
