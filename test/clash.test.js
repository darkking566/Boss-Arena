'use strict';
// 對撞（trait clash）：技能等級推導、同級互撞、重擊壓輕擊、投射物彈偏、不在揮擊中不觸發、AI 實戰會撞
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
let passed = 0, failed = 0;
function ok(c, m) { if (c) passed++; else { failed++; console.log('FAIL ' + m); } }
const STEP = BD.STEP;
const mk = (a, b, seed) => { const w = new BD.World(BD.bossById[a], BD.bossById[b], { seed: seed || 1 }); w.intro = 0; const [x, y] = w.bosses; x.x = 400; x.y = 400; y.x = 520; y.y = 400; return [w, x, y]; };
const sk = (b, id) => b.skills.find((s) => s.id === id);

// ── 1. 等級推導：melee 預設 light；aoe / zone / gap / 大招沒有；明確標記優先 ──
{
  const f = BD.bossById.fiora, m = BD.bossById.magmus;
  const lv = (def, id) => BD.skillClash(def.skills.find((s) => s.id === id));
  ok(lv(f, 'bladework') === 1, '菲歐拉劍術應為 light');
  ok(lv(f, 'fleche') === 0, '突進（gap）預設不能對撞');
  ok(BD.skillClash(f.ultimate) === 0, '大招不能對撞');
  ok(lv(m, 'combo') === 2, '熔岩巨像重錘標了 heavy');
  ok(lv(m, 'quake') === 0, 'aoe 近戰不能對撞');
}

// ── 2. 同級互撞：兩人都在揮擊，一方的判定打到另一方 → 無傷害、雙方招式中斷 ──
{
  const [w, a, b] = mk('fiora', 'mihawk');
  a.startSkill(sk(a, 'bladework'), { force: true }); b.startSkill(sk(b, 'knife'), { force: true });
  a.inst.t = 0.2; b.inst.t = 0.2;
  const hp = b.hp;
  ok(w.damageBoss(a, b, { dmg: 50, posture: 10 }) === 'countered' && b.hp === hp, '同級應對撞、無傷害');
  ok(a.state === 'recover' && b.state === 'recover' && a.posture > 0 && b.posture > 0, '雙方都被撞開並吃架勢');
  ok((a.stats.clashes | 0) === 1, '應記錄對撞次數');
  for (let i = 0; i < 90; i++) w.step(STEP); // 同級對撞會連拚 2–6 下
  ok(a.stats.clashes >= 2 && a.stats.clashes <= 6, `同級對撞應連拚 2–6 下（實際 ${a.stats.clashes}）`);
  // 間隔內不再對撞
  w._clashAt = w.time;
  b.startSkill(sk(b, 'knife'), { force: true }); b.inst.t = 0.2; a.startSkill(sk(a, 'bladework'), { force: true });
  ok(w.damageBoss(a, b, { dmg: 50, posture: 10 }) === 'hit', '對撞間隔內應正常受傷');
}

// ── 2b. 架勢滿了對撞也會崩潰；普攻無冷卻、無消耗 ──
{
  const [w, a, b] = mk('fiora', 'mihawk');
  const sta = a.sta;
  ok(a.startSkill(sk(a, 'basic')) && a.cds.basic === 0 && a.sta === sta, '普攻應無冷卻、無體力消耗');
  a.cancelSkill(); a.state = 'idle';
  a.startSkill(sk(a, 'bladework'), { force: true }); b.startSkill(sk(b, 'knife'), { force: true });
  a.inst.t = 0.2; b.inst.t = 0.2; b.posture = b.maxPosture - 5;
  w.damageBoss(a, b, { dmg: 50, posture: 10 });
  ok(b.stats.breaks === 1 && BD.hasStatus(b, 'stagger'), '對撞累積到上限應架勢崩潰');
}

// ── 3. 不在揮擊中、或對方招式不能對撞 → 照常受傷 ──
{
  const [w, a, b] = mk('fiora', 'mihawk');
  a.startSkill(sk(a, 'bladework'), { force: true });
  ok(w.damageBoss(a, b, { dmg: 50 }) === 'hit', '待機中被打應受傷');
  b.startSkill(sk(b, 'knife'), { force: true }); a.cancelSkill(); a.state = 'idle'; a.startSkill(a.ultimate, { force: true });
  ok(w.damageBoss(a, b, { dmg: 50 }) === 'hit', '大招不能被對撞');
}

// ── 4. 重擊壓輕擊：熔岩巨像重錘打斷菲歐拉的揮擊，但這一擊仍命中；反過來菲歐拉被撞開 ──
{
  const [w, a, b] = mk('magmus', 'fiora');
  a.startSkill(sk(a, 'combo'), { force: true }); b.startSkill(sk(b, 'bladework'), { force: true });
  a.inst.t = 0.3; b.inst.t = 0.2;
  const hp = b.hp;
  ok(w.damageBoss(a, b, { dmg: 80 }) === 'hit' && b.hp < hp && b.state === 'recover', '重擊應壓斷輕擊並命中');
  ok(a.state === 'skill', '重擊方不被打斷');
  const [w2, c, d] = mk('fiora', 'magmus');
  c.startSkill(sk(c, 'bladework'), { force: true });
  ok(w2.damageBoss(c, d, { dmg: 50 }) === 'hit', '巨像沒有 clash 特性，不會對撞');
}

// ── 5. 投射物：揮擊中被 deflect 投射物打到會偏轉且不傷；沒標 deflect 的照常命中 ──
{
  const [w, a, b] = mk('witch', 'fiora');
  b.startSkill(sk(b, 'bladework'), { force: true });
  const pr = { vx: -500, vy: 0, x: 500, y: 400, r: 9, deflect: true, homing: 2 }, hp = b.hp;
  ok(w.damageBoss(a, b, { proj: pr, dmg: 44 }) === 'deflected' && b.hp === hp && pr.vy !== 0 && pr.homing === 0, 'deflect 投射物應被彈偏');
  ok(w.damageBoss(a, b, { proj: { vx: -500, vy: 0, x: 500, y: 400, r: 9 }, dmg: 44 }) === 'hit', '沒標 deflect 的投射物照常命中');
}

// ── 5b. 所有能對撞的角色：有 clash 特性 + 描述、普攻可對撞且無冷卻、重擊標記生效 ──
{
  const ids = ['fiora', 'mihawk', 'ronin', 'watcher', 'lubu', 'kojiro', 'poseidon'];
  for (const id of ids) {
    const d = BD.bossById[id], bs = d.skills.find((s) => (s.tags || []).includes('basic'));
    ok(d.traits.includes('clash') && d.clash && d.ai.clash > 0 && d.ai.basic > 0, `${id} 應有 clash 特性、描述與 ai.clash / ai.basic`);
    ok(bs && bs.cd === 0 && bs.cost === 0 && BD.skillClash(bs) === 1, `${id} 的普攻應無冷卻、無消耗、light 等級`);
    ok(d.skills[d.skills.length - 1] === bs, `${id} 的普攻應放在技能陣列最後（不改變既有按鍵）`);
  }
  const lv = (id, sid) => BD.skillClash(BD.bossById[id].skills.find((s) => s.id === sid));
  ok(lv('lubu', 'randgriz_thrust') === 2 && lv('lubu', 'fangtian_sweep') === 2 && lv('poseidon', 'trident') === 2, '呂布 / 波賽頓的重武器招式應為 heavy');
}

// ── 6. 實戰：菲歐拉 vs 米霍克多個種子，AI 應能撞出對撞且不卡死 ──
{
  let n = 0, done = 0;
  for (let s = 1; s <= 6; s++) {
    const w = new BD.World(BD.bossById.fiora, BD.bossById.mihawk, { seed: s });
    if (w.simulate(400)) done++;
    n += w.bosses[0].stats.clashes | 0;
  }
  ok(n > 0, `6 場對戰應出現對撞（實際 ${n}）`);
  ok(done === 6, '對戰都應正常結束');
}

// ── 7. 七位能對撞的角色兩兩互打：都能打完，且每位都實際撞出過 ──
{
  const ids = ['fiora', 'mihawk', 'ronin', 'watcher', 'lubu', 'kojiro', 'poseidon'], got = {};
  let done = 0, total = 0;
  for (const a of ids) for (const b of ids) if (a !== b) {
    const w = new BD.World(BD.bossById[a], BD.bossById[b], { seed: 2 });
    total++; if (w.simulate(400)) done++;
    got[a] = (got[a] || 0) + (w.bosses[0].stats.clashes | 0);
  }
  ok(done === total, `兩兩對戰都應打完（${done}/${total}）`);
  for (const id of ids) ok(got[id] > 0, `${id} 在兩兩對戰中應撞出過（${got[id]}）`);
}

console.log(failed ? `CLASH TEST FAIL (${failed} failed, ${passed} passed)` : `CLASH TEST PASS (${passed})`);
process.exit(failed ? 1 : 0);
