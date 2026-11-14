'use strict';
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const def = BD.bossById.blackknife;

assert.ok(def, '黑刀刺客定義存在');
assert.strictEqual(def.id, 'blackknife');
assert.strictEqual(def.rank, 'boss');
assert.strictEqual(def.stars, 4);

function make(pace = 'light', opp = 'dummy') {
  const w = new BD.World(def, BD.bossById[opp], { seed: 42, pace, intro: 0 });
  w.bosses.forEach(b => { b.controller = { update() {} }; });
  const [b, e] = w.bosses;
  e.x = b.x + 110;
  e.y = b.y;
  return w;
}

function run(w, seconds) {
  for (let t = 0; t < seconds; t += BD.STEP) {
    w.hitstop = w.slowmo = w.freezeF = 0;
    w.step(BD.STEP);
  }
}

// 1. 狀態「命定之死」（destineddeath）：持續扣血 DoT + 易傷，疊滿 3 次觸發「死印崩裂」爆發傷害
{
  const w = make(), [b, e] = w.bosses;
  run(w, 0.5);
  const hp0 = e.hp;
  BD.applyStatus(e, 'destineddeath', { dur: 4.5, source: b }, w);
  assert.ok(BD.hasStatus(e, 'destineddeath'), '成功施加命定之死狀態');
  assert.ok(Math.abs(BD.scaleMod(e, 'dmgTakenMul', 1) - 1.08) < 1e-9, '命定之死提高目標受創倍率');
  run(w, 2.1);
  const hpAfterDot = e.hp;
  assert.ok(hpAfterDot < hp0 - 18, '命定之死每半秒造成持續侵蝕扣血');
  // 連續再疊加 2 次（共 3 層印記）觸發死印崩裂
  BD.applyStatus(e, 'destineddeath', { dur: 4.5, source: b }, w);
  const hpBeforeRupture = e.hp;
  BD.applyStatus(e, 'destineddeath', { dur: 4.5, source: b }, w);
  assert.ok(e.hp < hpBeforeRupture - 20, '疊滿 3 次命定之死觸發「死印崩裂」爆發傷害');
}

// 2. 特性「黑刀身法」（blackknife）：每三次衝刺觸發面紗匿影（blackveil + iframe + 殘影誘餌）
{
  const w = make(), [b] = w.bosses;
  run(w, 0.2);
  assert.strictEqual(b._bkDashes || 0, 0);
  BD.traits.blackknife.onDash(w, b);
  assert.strictEqual(b._bkDashes, 1, '第一次衝刺累積');
  BD.traits.blackknife.onDash(w, b);
  assert.strictEqual(b._bkDashes, 2, '第二次衝刺累積');
  BD.traits.blackknife.onDash(w, b);
  assert.strictEqual(b._bkDashes, 0, '第三次衝刺重置計數');
  assert.ok(BD.hasStatus(b, 'iframe'), '第三次衝刺觸發無敵幀');
  assert.ok(BD.hasStatus(b, 'blackveil'), '第三次衝刺觸發黑夜面紗隱身');
  assert.ok(b._decoys && b._decoys.length >= 1, '原地留下黑夜面紗殘影誘餌');
}

// 3. 專屬動作：bk_ambush 留下殘影並繞至目標背後，bk_grab_strike 處決抱殺與延遲拔刀爆破
{
  const w = make(), [b, e] = w.bosses;
  run(w, 0.2);
  e.face = 0;
  BD.action('bk_ambush').fn(w, b, null, { dist: 40, decoyLife: 0.9, veilDur: 0.35 }, e);
  assert.ok(b.x < e.x, 'bk_ambush 瞬移到目標面向的反側（背後）');
  assert.ok(b._decoys && b._decoys.length >= 1, 'bk_ambush 留下殘影誘餌');

  // 測試飛身抱殺處決
  b.x = e.x - 50; b.y = e.y; b.face = 0;
  const hpBeforeGrab = e.hp;
  BD.action('bk_grab_strike').fn(w, b, null, { r: 96, arc: 1.7, pinDmg: 26, burstDmg: 54, kb: 380 });
  assert.ok(e.hp < hpBeforeGrab, '飛身抱殺第一段貫心刺造成傷害');
  assert.ok(BD.hasStatus(e, 'destineddeath'), '飛身抱殺附加命定之死');
  const hpAfterPin = e.hp;
  run(w, 0.45);
  assert.ok(e.hp < hpAfterPin - 40, '飛身抱殺 0.32s 後觸發第二段死印拔刀爆破');
}

// 4. 二階段專屬招式（紅蓮亂舞、死滅風暴）只在二階段解鎖；轉階段觸發亞勒托覺醒
{
  const w = make(), [b] = w.bosses;
  const p2Only = ['alecto_whirl', 'death_storm'];
  const avail1 = b.available().map(s => s.id);
  assert.ok(p2Only.every(id => !avail1.includes(id)), '一階段無法使用二階段專屬技能');
  b.hp = b.maxHp * 0.48;
  b.startTransition();
  run(w, 1.0);
  assert.strictEqual(b._bkTransStep, 2, '轉階段完成亞勒托死亡盧恩覺醒演出');
  run(w, 2.0);
  assert.strictEqual(b.phase, 2, '進入二階段');
  const avail2 = b.available().map(s => s.id);
  assert.ok(p2Only.every(id => avail2.includes(id)), '二階段解鎖紅蓮亂舞與死滅風暴');
}

// 5. 招式技能表與大招完整性（10 個技能 + 雙階段大招）
{
  assert.strictEqual(def.skills.length, 10, '黑刀刺客共有 10 個技能');
  assert.ok(def.ultimate && def.ultimate.actions.length && def.ultimate.actions2.length, '雙階段大招時間軸完整');
}

// 6. 回歸檢查：所有 bk_* 特效的 puff 色票嚴格為 #rrggbb
{
  const full = load().BD;
  const ok = t => /^#[0-9a-f]{6}$/i.test(t) || ['sand', 'snow', 'wheat'].includes(t);
  for (const id of Object.keys(full.effects).filter(k => k.startsWith('bk_'))) {
    const w = new full.World(full.bossById.blackknife, full.bossById.dummy, { seed: 7, intro: 0 });
    const b = w.bosses[0];
    full.spawnFx(w, id, b.x, b.y, { src: b, angle: 0, radius: 180, len: 240, arc: 2.1, life: 0.8 });
    for (let i = 0; i < 120; i++) {
      w.fx.update(full.STEP);
      for (const p of w.fx.puffs) assert.ok(ok(p.tint), id + ' 的 puff 色票不合法：' + p.tint);
    }
  }
}

// 7. 特效與視覺亂數（BD.vrng）絕不影響戰鬥模擬結果（確定性驗證）
{
  const sim = B => {
    const w = new B.World(B.bossById.blackknife, B.bossById.mohg, { seed: 19, intro: 0 });
    let t = 0;
    while (!w.winner && t < 180) { w.step(B.STEP); t += B.STEP; }
    return [Math.round(w.bosses[0].hp), Math.round(w.bosses[1].hp), t.toFixed(3)].join(',');
  };
  assert.strictEqual(sim(BD), sim(load().BD), '特效改變了戰鬥模擬結果');
}

// 8. 造型檔（js/render/styles/blackknife.js）全招式關鍵幀、3D 跳劈 hidden()、under() 死印與殘影、transition() 及投射物渲染無異常
{
  const full = load({ render: true }).BD;
  const R = full.Render;
  const style = R.bossStyle('blackknife');
  assert.ok(style && style.body && style.under && style.hidden && style.transition, 'blackknife 繪圖樣式四階段函式齊全');
  assert.ok(R.projStyles.deathblade && R.projStyles.blackknife_dagger, '專屬投射物繪圖函式齊全');

  const noop = () => {};
  const grad = () => ({ addColorStop: noop });
  const ctx = {
    canvas: { width: 1600, height: 1010 },
    save: noop, restore: noop, translate: noop, rotate: noop, scale: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    quadraticCurveTo: noop, bezierCurveTo: noop, arc: noop, arcTo: noop, ellipse: noop, rect: noop,
    fill: noop, stroke: noop, clip: noop, fillRect: noop, strokeRect: noop, clearRect: noop,
    setLineDash: noop, drawImage: noop, fillText: noop, strokeText: noop,
    measureText: () => ({ width: 20 }),
    createRadialGradient: grad, createLinearGradient: grad,
    globalAlpha: 1, globalCompositeOperation: 'source-over',
  };
  // Stub R.blit so inner drawing callbacks are also executed and verified
  const origBlit = R.blit;
  R.blit = (c, key, w, h, cx, cy, fn) => fn(c);

  const w = new full.World(full.bossById.blackknife, full.bossById.dummy, { seed: 11, intro: 0 });
  w.bosses.forEach(u => { u.controller = { update() {} }; });
  const [b, e] = w.bosses;
  full.applyStatus(e, 'destineddeath', { dur: 4.5, source: b }, w);
  full.applyStatus(b, 'blackveil', { dur: 0.85, source: b }, w);

  for (const phase of [1, 2]) {
    b.phase = phase;
    for (const s of [...b.skills, b.ultimate]) {
      b.startSkill(s, { force: true });
      for (let i = 0; i < 40 && b.inst; i++) {
        w.step(full.STEP);
        style.under(ctx, b, w.time);
        if (full.getMod(b, 'untargetable') && b.inst.v.actions.some(a => a.do === 'hide')) {
          style.hidden(ctx, b, w.time);
        } else {
          R.drawBossBody(ctx, b, w.time);
        }
      }
    }
  }
  // 驗證轉階段動畫與投射物繪製（確認投射物以區域座標 (0,0) 繪製，不會重複 translate(p.x, p.y) 導致畫到畫面外）
  b.startTransition();
  style.transition(ctx, b, w.time);
  const trCalls = [];
  ctx.translate = (tx, ty) => trCalls.push([tx, ty]);
  R.projStyles.deathblade(ctx, { x: 1200, y: 900, vx: 600, vy: 0, r: 36, seq: 1 }, 1.2);
  R.projStyles.blackknife_dagger(ctx, { x: 1200, y: 900, vx: 600, vy: 0, r: 16, seq: 2 }, 1.2);
  assert.ok(!trCalls.some(([tx, ty]) => tx === 1200 && ty === 900), '投射物不可重複 translate(p.x, p.y) 以免偏離畫面');
  ctx.translate = noop;
  R.blit = origBlit;
}

// 9. 三項招式行為驗證：
//   (A) 命定之死・死亡之刃（blade_of_death）射出大型貫穿紅黑彎月刀波（deathblade，r >= 36 且 pierce === true）
//   (B) 側翻疾刃・雙月迴旋斬（acrobatic_cartwheel）真正往側面橫向翻滾（橫向位移 > 120px），而非往敵人臉上直衝
//   (C) 後空翻・暗刃散射（backflip_throw）後撤同時扇形射出 5 枚（二階段 7 枚）blackknife_dagger 投射物
{
  // (A) 命定之死・死亡之刃
  const w1 = make(), [b1, e1] = w1.bosses;
  e1.x = b1.x + 220; e1.y = b1.y; b1.face = 0;
  const sWave = b1.skills.find(s => s.id === 'blade_of_death');
  b1.startSkill(sWave, { force: true });
  run(w1, 0.56);
  const waveProj = w1.projectiles.find(p => p.kind === 'deathblade');
  assert.ok(waveProj, '命定之死・死亡之刃成功生成 deathblade 彎月刀波投射物');
  assert.ok(waveProj.r >= 36 && waveProj.pierce === true, 'deathblade 為大型貫穿彎月刀波，命中後繼續斬過戰場不消失');

  // (B) 側翻疾刃・雙月迴旋斬：初始面向 +x（y0 = b2.y），側翻後橫向位移 |b2.y - y0| > 120px
  const w2 = make(), [b2, e2] = w2.bosses;
  e2.x = b2.x + 170; e2.y = b2.y; b2.face = 0;
  const y0 = b2.y;
  const sCart = b2.skills.find(s => s.id === 'acrobatic_cartwheel');
  b2.startSkill(sCart, { force: true });
  run(w2, 0.32);
  assert.ok(Math.abs(b2.y - y0) > 120, `側翻疾刃應往側面大幅翻滾（實際橫向位移 ${Math.abs(b2.y - y0).toFixed(1)}px）`);

  // (C) 後空翻・暗刃散射：射出 5 枚 blackknife_dagger 投射物
  const w3 = make(), [b3, e3] = w3.bosses;
  e3.x = b3.x + 140; e3.y = b3.y; b3.face = 0;
  const sFlip = b3.skills.find(s => s.id === 'backflip_throw');
  b3.startSkill(sFlip, { force: true });
  run(w3, 0.56);
  const daggers = w3.projectiles.filter(p => p.kind === 'blackknife_dagger');
  assert.strictEqual(daggers.length, 5, '後空翻・暗刃散射於一階段扇形射出 5 枚黑刀飛刃');
}

console.log('BLACKKNIFE TEST PASS');
