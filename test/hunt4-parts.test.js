// 部位戰術：破壞前招式不變、破壞後指定招式範圍縮小、定義物件不被改動、其他 Boss 不受影響。
'use strict';
const assert = require('assert');
const { BD } = require('./lib/load').load({ noFx: true });
const H = BD.Hunt4;

function fixture(bossId) {
  const w = new BD.World(H.team({}), BD.bossById[bossId], { seed: 5, intro: 0, pace: 'heavy', hunt4: true });
  w.time = 10;
  const st = w.hunt4, b = st.boss, h = st.hunters[0];
  b.x = 3000; b.y = 1800; b.face = 0;
  return { w, st, b, h };
}
const sk = (b, id) => b.skills.find((s) => s.id === id);
const hitR = (s) => s.actions.filter((a) => a.do === 'hit').map((a) => a.r || a.len);

// 從指定部位那一側把破壞值打滿
function breakPart(t, partId) {
  const P = t.st.parts.find((x) => x.id === partId);
  const ang = { head: 0, tail: Math.PI }[partId];
  t.h.x = t.b.x + Math.cos(ang) * 150; t.h.y = t.b.y + Math.sin(ang) * 150;
  P.brkAcc = P.brkHp - 1;
  t.w.damageBoss(t.h, t.b, { dmg: 200, posture: 0 });
  return P;
}

for (const [bossId, part, ids, mul] of [['deviljho', 'tail', ['tail_spin'], 0.65], ['agheel', 'head', ['sweeping_breath', 'tracking_breath'], 0.7]]) {
  const t = fixture(bossId), def = t.b.def;
  const before = ids.map((id) => ({ s: sk(t.b, id), r: hitR(sk(t.b, id)), range: sk(t.b, id).range[1] }));
  const other = t.b.skills.find((s) => !ids.includes(s.id));
  // 打別的部位不生效
  const wrong = t.st.parts.find((x) => x.id === 'legs'); wrong.brkAcc = wrong.brkHp - 1;
  t.h.x = t.b.x; t.h.y = t.b.y + 150; t.w.damageBoss(t.h, t.b, { dmg: 200, posture: 0 });
  assert.ok(wrong.broken, `${bossId} 腳應該被破壞`);
  ids.forEach((id, i) => assert.strictEqual(sk(t.b, id), before[i].s, `${bossId} 腳破壞不該改 ${id}`));

  const P = breakPart(t, part);
  assert.ok(P.broken, `${bossId} ${part} 應該被破壞`);
  ids.forEach((id, i) => {
    const s = sk(t.b, id);
    assert.ok(s.h4broken && s !== before[i].s, `${id} 應換成破壞後版本`);
    hitR(s).forEach((r, k) => assert.ok(Math.abs(r - before[i].r[k] * mul) < 1e-6, `${id} 第 ${k} 段判定應 ×${mul}`));
    assert.ok(s.range[1] < before[i].range && s.range[1] >= s.range[0], `${id} 出招距離應縮短`);
    assert.ok(s.v1 && s.v1 !== before[i].s.v1, `${id} 應重新計算時間軸`);
    assert.strictEqual(def.skills.find((x) => x.id === id), before[i].s, `${id} 的 Boss 定義不可被改動`);
  });
  assert.strictEqual(sk(t.b, other.id), other, '其他招式維持原物件');
}

// 甩尾的突進位移與預告長度不縮（只縮旋身判定）
{
  const s = BD.H4Combat.shrink(BD.bossById.deviljho.skills.find((x) => x.id === 'tail_spin'), 0.5);
  const tele = s.actions.find((a) => a.do === 'tele' && a.shape === 'rect'), dash = s.actions.find((a) => a.do === 'dash');
  assert.strictEqual(tele.len, dash.dist, '突進預告長度應等於位移距離');
}

// 沒有設定 brkFx 的 Boss：破壞後招式不變
{
  const t = fixture('ronin'), snap = t.b.skills.slice();
  breakPart(t, 'head');
  assert.deepStrictEqual(t.b.skills, snap);
}

// 破壞後實際打一段，不能出錯，而且可重現
function play() {
  const t = fixture('deviljho'); breakPart(t, 'tail');
  for (let i = 0; i < 60 * 40 && !t.w.over; i++) t.w.step(BD.STEP);
  return [Math.round(t.b.hp), t.b.stats.skills, t.b.stats.uses.tail_spin || 0];
}
assert.deepStrictEqual(play(), play());

console.log('hunt4-parts OK');
