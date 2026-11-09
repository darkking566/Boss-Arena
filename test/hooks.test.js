// 引擎事件與傷害掛勾：事件依訂閱順序收到、useDamage 依加入順序串接（可改 p、可擋下）、hitBoss 不經過掛勾
'use strict';
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const ids = BD.bosses.map((b) => b.id);
const w = new BD.World(BD.bossById[ids[0]], BD.bossById[ids[1]], { seed: 7, intro: 0, pace: 'heavy' });
const [a, b] = w.bosses, seen = [], n = {};
for (const t of ['preStep', 'think', 'postStep', 'skill', 'damage', 'kill']) w.on(t, () => { n[t] = (n[t] || 0) + 1; });
w.on('damage', (e) => seen.push('first:' + e.dmg)).on('damage', (e) => seen.push('second:' + e.dmg));
// 掛勾：第一個把傷害改成 50，第二個看到改過的 p；p.block 時直接擋下不往下傳
const order = [];
w.useDamage((src, t, p, next) => { order.push(1); return p.block ? 'blocked' : next(src, t, Object.assign({}, p, { dmg: 50 })); });
w.useDamage((src, t, p, next) => { order.push(p.dmg); return next(src, t, p); });
const hp = b.hp;
assert.strictEqual(w.damageBoss(a, b, { dmg: 999, posture: 0 }), 'hit');
assert.deepStrictEqual(order, [1, 50]);
assert.ok(hp - b.hp >= 46 && hp - b.hp <= 54, `掛勾改的傷害沒生效（扣了 ${hp - b.hp}）`);
assert.deepStrictEqual(seen.map((s) => s.split(':')[0]), ['first', 'second'], 'damage 事件要依訂閱順序');
assert.strictEqual(w.damageBoss(a, b, { dmg: 999, block: true }), 'blocked');
assert.strictEqual(order.length, 3, '擋下後不該再往下傳');
order.length = 0; w.hitBoss(a, b, { dmg: 10, posture: 0 });
assert.strictEqual(order.length, 0, 'hitBoss 不經過掛勾');
w.simulate(400);
assert.ok(n.preStep > 100 && n.preStep === n.postStep, `preStep ${n.preStep} / postStep ${n.postStep} 每步都要成對`);
assert.ok(n.think > 100 && n.skill > 5 && n.damage > 5, '戰鬥中應有 think / skill / damage 事件');
assert.strictEqual(n.kill, 1, '1v1 打完應該剛好一次 kill');
console.log(`HOOKS PASS（${n.preStep} 步、${n.skill} 次出招、${n.damage} 次受傷）`);
