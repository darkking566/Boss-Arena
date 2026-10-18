'use strict';
// 無法閃避（undodgeable）：無敵幀無效、invuln / untargetable 仍有效、魔女大招 / 地雷、訓練場假人、AI 走進安全圈
const { load } = require('./lib/load');
const { BD } = load();
const U = BD.U;
let passed = 0, failed = 0;
function ok(c, m) { if (c) passed++; else { failed++; console.log('FAIL ' + m); } }

// ── 1. 傷害判定 ──
{
  const w = new BD.World(BD.bossById.magmus, BD.bossById.ronin, { seed: 3 });
  const a = w.bosses[0], b = w.bosses[1];
  w.intro = 0;
  const hp = () => b.hp;
  BD.applyStatus(b, 'iframe', { dur: 5 }, w);
  ok(w.damageBoss(a, b, { dmg: 50 }) === 'dodged', '一般攻擊在無敵幀中應被閃避');
  const h0 = hp(); const r = w.damageBoss(a, b, { dmg: 50, undodgeable: true });
  ok(r !== 'dodged' && hp() < h0, `undodgeable 應無視無敵幀（結果 ${r}）`);
  BD.applyStatus(b, 'invuln', { dur: 5 }, w);
  ok(w.damageBoss(a, b, { dmg: 50, undodgeable: true }) === 'immune', 'undodgeable 不可穿透 invuln');
  BD.removeStatus(b, 'invuln');
  BD.applyStatus(b, 'hidden', {}, w);
  ok(w.damageBoss(a, b, { dmg: 50, undodgeable: true }) === 'none', 'undodgeable 不可命中 untargetable（隱身）');
}

// ── 2. 資料：魔女大招安全圈外判定與地雷有旗標、放射冰刺沒有 ──
{
  const wd = BD.bossById.witch;
  for (const acts of [wd.ultimate.actions, wd.ultimate.actions2]) {
    ok(acts.some((x) => x.do === 'hit' && x.shape === 'except' && x.undodgeable === true), '絕對零度的 except 判定需 undodgeable');
    ok(acts.filter((x) => x.do === 'proj').every((x) => !x.undodgeable), '大招後的放射冰刺必須可閃避');
  }
  const mines = wd.skills.find((s) => s.id === 'mines');
  ok([...mines.actions, ...mines.actions2].every((x) => x.do !== 'trap' || x.undodgeable === true), '霜凍地雷需 undodgeable');
  ok(!BD.bosses.some((d) => d.id !== 'witch' && JSON.stringify(d).includes('undodgeable')), '目前只有魔女使用 undodgeable');
}

// ── 3. 訓練場：假人持續帶無敵幀（模擬翻滾）仍吃到大招與地雷 ──
for (const pace of ['light', 'heavy']) {
  for (const phase of [1, 2]) {
    const w = new BD.World(BD.bossById.witch, BD.bossById.dummy, { seed: 5, pace, training: { mode: 'manual', range: 'mid' } });
    const tr = w.training, d = tr.dummy;
    const roll = () => BD.applyStatus(d, 'iframe', { dur: 0.3, stacking: 'refresh' }, w);
    if (phase === 2) { tr.setPhase(2); for (let i = 0; i < 600 && (tr.boss.phase !== 2 || tr.boss.state === 'transition'); i++) w.step(1 / 60); tr.reset(); tr.boss.phase = 2; }
    // 大招
    tr.clearStats(); tr.cast('ult');
    let teleOk = false;
    for (let i = 0; i < 60 * 6; i++) { roll(); w.step(1 / 60); if (w.telegraphs.some((t) => t.shape.kind === 'except' && t.undodgeable)) teleOk = true; }
    const ultDmg = tr.stats.total;
    ok(teleOk, `${pace} P${phase}：絕對零度預警應標示 undodgeable`);
    ok(ultDmg >= 150, `${pace} P${phase}：帶無敵幀的假人仍應吃到絕對零度（${ultDmg}）`);
    // 地雷：放到假人腳下，翻滾中觸發
    tr.reset(); tr.clearStats(); tr.cast('mines');
    for (let i = 0; i < 60; i++) w.step(1 / 60);
    ok(w.traps.length > 0 && w.traps.every((t) => t.undodgeable), `${pace} P${phase}：地雷應帶 undodgeable`);
    const m = w.traps[0]; m.x = d.x; m.y = d.y; m.t = m.arm;
    for (let i = 0; i < 20; i++) { roll(); w.step(1 / 60); }
    ok(tr.stats.total > 0, `${pace} P${phase}：翻滾中的假人踩到地雷仍應受傷（${tr.stats.total}）`);
  }
}

// ── 4. AI：面對絕對零度走進安全圈，而不是翻滾 ──
for (const pace of ['light', 'heavy']) {
  let ults = 0, inside = 0, rolls = 0;
  for (const def of BD.bosses) {
    if (def.id === 'witch') continue;
    for (let n = 0; n < 12; n++) {
      const seed = (n >> 1) + 1, side = n & 1;
      const w = side ? new BD.World(def, BD.bossById.witch, { seed, pace }) : new BD.World(BD.bossById.witch, def, { seed, pace });
      const wi = w.bosses[side ? 1 : 0], op = w.bosses[side ? 0 : 1], seen = new Map();
      for (let f = 0; f < 60 * 300 && !w.winner; f++) {
        w.step(1 / 60);
        for (const t of w.telegraphs) if (t.owner === wi && t.shape.kind === 'except' && !seen.has(t)) seen.set(t, { d0: op.lastDodgeStart });
        for (const [t, rec] of seen) {
          if (rec.done || w.telegraphs.includes(t)) continue;
          rec.done = true;
          ults++;
          if (U.dist(op, t.shape) <= t.shape.r - op.r * 0.5) inside++;
          if (op.lastDodgeStart !== rec.d0) rolls++;
        }
      }
    }
  }
  console.log(`${pace}：絕對零度 ${ults} 次，對手在安全圈內 ${inside}（${Math.round(inside / ults * 100)}%），預警期間翻滾 ${rolls}`);
  ok(ults >= 60, `${pace}：樣本太少（${ults}）`);
  ok(inside / ults >= 0.45, `${pace}：AI 應多半走進安全圈（${inside}/${ults}）`);
  ok(rolls / ults <= 0.25, `${pace}：AI 不應依賴翻滾（${rolls}/${ults}）`);
}

console.log(failed ? `UNDODGEABLE TEST FAIL (${failed} failed, ${passed} passed)` : `UNDODGEABLE TEST PASS (${passed} checks)`);
process.exit(failed ? 1 : 0);
