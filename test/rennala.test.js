'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const def = BD.bossById.rennala;

assert.ok(def, '滿月女王蕾娜菈定義存在');
assert.strictEqual(def.id, 'rennala');
assert.strictEqual(def.rank, 'boss');
assert.strictEqual(def.stars, 4);

function make(pace = 'light', opp = 'dummy') {
  const w = new BD.World(def, BD.bossById[opp], { seed: 42, pace, intro: 0 });
  w.bosses.forEach(b => { b.controller = { update() {} }; });
  const [b, e] = w.bosses;
  e.x = b.x + 220;
  e.y = b.y;
  return w;
}

function run(w, seconds) {
  for (let t = 0; t < seconds; t += BD.STEP) {
    w.hitstop = w.slowmo = w.freezeF = 0;
    w.step(BD.STEP);
  }
}

// 1. 一階段被動「琥珀卵聖歌」（ambershield）：開場約 2.7 秒自動張開金罩吸收傷害，擊碎時觸發原作「破盾墜地」短暫失衡（stagger）
{
  const w = make(), [b, e] = w.bosses;
  run(w, 2.8);
  const sh = BD.getStatus(b, 'ambershield');
  assert.ok(sh && sh.value >= 100, '開場 2.8 秒自動張開琥珀金罩（ambershield）');
  const hp0 = b.hp;
  w.damageUnit(e, b, { dmg: 60, posture: 10, el: 'physical' });
  assert.strictEqual(b.hp, hp0, '琥珀金罩未破時完全吸收傷害');
  assert.ok(BD.getStatus(b, 'ambershield').value < 105, '琥珀金罩耐久隨受擊遞減');
  // 再次重擊打破護罩
  w.damageUnit(e, b, { dmg: 120, posture: 10, el: 'physical' });
  assert.ok(!BD.hasStatus(b, 'ambershield'), '超過剩餘耐久時琥珀金罩破碎');
  assert.ok(BD.hasStatus(b, 'stagger'), '護罩擊碎時致敬原作書庫墜落機制，觸發短暫失衡');
}

// 2. 狀態「滿月易傷」（moonbane）：敵方受到傷害提高 18%（dmgTakenMul = 1.18）
{
  const w = make(), [b, e] = w.bosses;
  run(w, 0.2);
  BD.applyStatus(e, 'moonbane', { dur: 6.5, source: b }, w);
  assert.ok(BD.hasStatus(e, 'moonbane'), '成功施加滿月易傷（moonbane）');
  assert.ok(Math.abs(BD.scaleMod(e, 'dmgTakenMul', 1) - 1.18) < 1e-9, '滿月易傷使目標受到的所有傷害 +18%');
}

// 3. 二階段轉階段（「以卡利亞的滿月起誓」）與專屬技能解鎖
{
  const w = make(), [b] = w.bosses;
  const p2Only = ['summon_wolves_bloodhound', 'summon_troll_dragon', 'comet_azur', 'rennalas_full_moon'];
  const avail1 = b.available().map(s => s.id);
  assert.ok(p2Only.every(id => !avail1.includes(id)), '一階段不會施放二階段專屬滿月與喚魂招式');
  run(w, 2.8);
  assert.ok(BD.hasStatus(b, 'ambershield'));
  b.hp = b.maxHp * 0.48;
  b.startTransition();
  run(w, 2.8);
  assert.strictEqual(b.phase, 2, '轉階段完成後進入二階段');
  run(w, 0.2);
  assert.ok(!BD.hasStatus(b, 'ambershield'), '進入二階段時褪去一階段的琥珀金罩');
  const avail2 = b.available().map(s => s.id);
  assert.ok(p2Only.every(id => avail2.includes(id)), '二階段完整解鎖四大骨灰喚魂、彗星亞茲勒與蕾娜菈的滿月');
}

// 4. 十二招去重機制與雙階段大招動作驗證
{
  // (A) 輝石魔礫・月影滑步（glintstone_volley）：側向瞬移拉位並射出輝石魔礫
  const w0 = make(), [b0, e0] = w0.bosses;
  e0.x = b0.x + 260; e0.y = b0.y; b0.face = 0;
  const yStart = b0.y;
  b0.startSkill(b0.skills.find(s => s.id === 'glintstone_volley'), { force: true });
  run(w0, 0.35);
  assert.ok(Math.abs(b0.y - yStart) > 40 || Math.hypot(b0.x - 940, b0.y - yStart) > 40, '輝石魔礫・月影滑步觸發月影側移（blink）');
  assert.ok(w0.projectiles.some(p => p.kind === 'glintshard'), '側移後射出 glintshard 魔礫投射物');

  // (B) 小生徒合唱・黃金書陣（scholar_books）：展開聖歌結界（chandelierfire）與 3 枚星紋地雷（traps），不再射扇形書本彈幕
  const w1 = make(), [b1, e1] = w1.bosses;
  e1.x = b1.x + 220; e1.y = b1.y; b1.face = 0;
  b1.startSkill(b1.skills.find(s => s.id === 'scholar_books'), { force: true });
  run(w1, 0.6);
  assert.ok(BD.hasStatus(b1, 'ambershield'), '小生徒合唱補上琥珀護盾');
  assert.ok(w1.zones.some(z => z.kind === 'chandelierfire'), '小生徒合唱於目標腳下展開聖歌結界');
  assert.strictEqual(w1.traps.length, 3, '小生徒合唱周圍埋設 3 枚延遲星紋地雷（traps）');

  // (C) 白墓碑・地脈突刺線（gravestone_drop）：改為 erupt 沿地脈直線連環破土，不再使用 lob
  const wG = make(), [bG, eG] = wG.bosses;
  eG.x = bG.x + 290; eG.y = bG.y; bG.face = 0;
  const hpG0 = eG.hp;
  bG.startSkill(bG.skills.find(s => s.id === 'gravestone_drop'), { force: true });
  run(wG, 1.3);
  assert.strictEqual(wG.lobs.length, 0, '白墓碑・地脈突刺線不產生天降 lob 拋射物');
  assert.ok(eG.hp < hpG0, '白墓碑・地脈突刺線沿直線連環爆發命中目標');

  // (D) 琥珀卵重力坍縮（amber_gravity）：使用真正 gravpull 將目標往內拉扯後再爆發
  const wA = make(), [bA, eA] = wA.bosses;
  eA.x = bA.x + 230; eA.y = bA.y; bA.face = 0;
  const dist0 = Math.hypot(eA.x - bA.x, eA.y - bA.y);
  bA.startSkill(bA.skills.find(s => s.id === 'amber_gravity'), { force: true });
  run(wA, 0.65);
  const distAfterPull = Math.hypot(eA.x - bA.x, eA.y - bA.y);
  assert.ok(distAfterPull < dist0, `琥珀卵重力坍縮先將對手向內拉近（${dist0.toFixed(1)} -> ${distAfterPull.toFixed(1)}）`);
  run(wA, 0.65);
  assert.ok(eA.hp < eA.maxHp - 80, '重力拉近後黃金／滿月坍縮爆炸造成完整傷害');

  // (E) 卡利亞輝劍圓陣（ring 圓環波）與結晶散射・星光碎裂斬（slashes 交錯斬）
  for (const sid of ['carian_phalanx', 'shattering_crystal']) {
    const wK = make(), [bK, eK] = wK.bosses;
    eK.x = bK.x + 250; eK.y = bK.y; bK.face = 0;
    bK.startSkill(bK.skills.find(s => s.id === sid), { force: true });
    run(wK, 1.6);
    assert.ok(eK.hp < eK.maxHp, `去重技能【${sid}】成功命中目標`);
  }

  // (F) 大書庫吊燈墜落（chandelier_fall）：唯一天降拋射 chandelier 並留下 chandelierfire 燭火區域
  const w2 = make(), [b2, e2] = w2.bosses;
  e2.x = b2.x + 240; e2.y = b2.y; b2.face = 0;
  b2.startSkill(b2.skills.find(s => s.id === 'chandelier_fall'), { force: true });
  run(w2, 1.35);
  const fireZone = w2.zones.find(z => z.kind === 'chandelierfire');
  assert.ok(fireZone, '大書庫吊燈墜落落地後留下 chandelierfire 燭火區域');

  // (G) 二階段四大靈體骨灰喚魂（summon_wolves_bloodhound / summon_troll_dragon）皆能命中目標
  for (const sid of ['summon_wolves_bloodhound', 'summon_troll_dragon']) {
    const w3 = make(), [b3, e3] = w3.bosses;
    b3.phase = 2;
    e3.x = b3.x + 210; e3.y = b3.y; b3.face = 0;
    const hp0 = e3.hp;
    const sk = b3.skills.find(s => s.id === sid);
    b3.startSkill(sk, { force: true });
    run(w3, 2.2);
    assert.ok(e3.hp < hp0, `二階段喚魂招式【${sid}】成功對目標造成傷害`);
  }

  // (H) 蕾娜菈的滿月（rennalas_full_moon）：化為滿月升空（hide），追尾墜落爆發並附加滿月易傷（moonbane）
  const w4 = make(), [b4, e4] = w4.bosses;
  b4.phase = 2;
  e4.x = b4.x + 230; e4.y = b4.y; b4.face = 0;
  const hp0 = e4.hp;
  b4.startSkill(b4.skills.find(s => s.id === 'rennalas_full_moon'), { force: true });
  run(w4, 0.5);
  assert.ok(b4._fullMoonUntil && b4._fullMoonUntil > w4.time, '蕾娜菈化身為滿月期間啟動 _fullMoonUntil 狀態');
  run(w4, 1.3);
  assert.ok(e4.hp < hp0 - 100, '蕾娜菈的滿月墜落造成巨額魔力爆發傷害');
  assert.ok(BD.hasStatus(e4, 'moonbane'), '蕾娜菈的滿月命中後附加滿月易傷（moonbane）');

  // (I) 雙階段全新專屬大招：P1（書頁流星雨 rain + 三層擴散共振環）、P2（星軌斬 slashes + 彗星雨 rain + 安全圈星蝕爆 except + 16道徑向彗星）
  const wU1 = make(), [bU1, eU1] = wU1.bosses;
  eU1.x = bU1.x + 260; eU1.y = bU1.y; bU1.face = 0;
  bU1.startSkill(bU1.ultimate, { force: true });
  run(wU1, 2.8);
  assert.ok(eU1.hp < eU1.maxHp - 50, '一階段大招（星雨＋共振環）造成顯著傷害');

  const wU2 = make(), [bU2, eU2] = wU2.bosses;
  bU2.phase = 2;
  eU2.x = bU2.x + 280; eU2.y = bU2.y; bU2.face = 0;
  bU2.startSkill(bU2.ultimate, { force: true });
  run(wU2, 3.6);
  assert.ok(eU2.hp < eU2.maxHp - 80, '二階段大招（星軌斬＋彗星雨＋星蝕全場終爆）造成巨額傷害');
}

// 5. 招式技能表與大招完整性（12 個技能 + 雙階段大招）
{
  assert.strictEqual(def.skills.length, 12, '滿月女王蕾娜菈共有 12 個一般技能');
  assert.ok(def.ultimate && def.ultimate.actions.length && def.ultimate.actions2.length, '雙階段大招（琥珀輪迴／顛倒滿月・卡利亞星蝕終焉）時間軸完整');
}

// 6. 回歸檢查：所有 rennala_* 特效的 puff 色票嚴格為 #rrggbb
{
  const full = load().BD;
  const ok = t => /^#[0-9a-f]{6}$/i.test(t) || ['sand', 'snow', 'wheat'].includes(t);
  const fxIds = Object.keys(full.effects).filter(k => k.startsWith('rennala_'));
  assert.ok(fxIds.length >= 19, '蕾娜菈專屬特效數量齊全');
  for (const id of fxIds) {
    const w = new full.World(full.bossById.rennala, full.bossById.dummy, { seed: 7, intro: 0 });
    const b = w.bosses[0];
    full.spawnFx(w, id, b.x, b.y, { src: b, angle: 0, radius: 180, len: 420, width: 110, arc: 1.6, life: 0.9 });
    for (let i = 0; i < 120; i++) {
      w.fx.update(full.STEP);
      for (const p of w.fx.puffs) assert.ok(ok(p.tint), id + ' 的 puff 色票不合法：' + p.tint);
    }
  }
}

// 7. 特效與視覺亂數（BD.vrng）絕不影響戰鬥模擬結果（確定性驗證）
{
  const sim = B => {
    const w = new B.World(B.bossById.rennala, B.bossById.mohg, { seed: 23, intro: 0 });
    let t = 0;
    while (!w.winner && t < 180) { w.step(B.STEP); t += B.STEP; }
    return [Math.round(w.bosses[0].hp), Math.round(w.bosses[1].hp), t.toFixed(3)].join(',');
  };
  assert.strictEqual(sim(BD), sim(load().BD), '特效改變了戰鬥模擬結果');
}

// 8. 造型檔（js/render/styles/rennala.js）全招式關鍵幀、滿月化身 hidden()、under() 水鏡與書庫金陣、over() 琥珀障與靈體骨灰、投射物／拋射物／區域渲染無異常
{
  const full = load({ render: true }).BD;
  const R = full.Render;
  const style = R.bossStyle('rennala');
  assert.ok(style && style.body && style.under && style.over && style.hidden, 'rennala 繪圖樣式四階段函式齊全');
  for (const k of ['glintshard', 'glintarc', 'scepterspin', 'sweetbook', 'spiritwolf']) {
    assert.ok(R.projStyles[k], `專屬投射物繪圖函式 ${k} 存在`);
  }
  for (const k of ['tombstone', 'chandelier']) {
    assert.ok(R.lobStyles[k], `專屬拋射物繪圖函式 ${k} 存在`);
  }
  for (const k of ['chandelierfire', 'moonpool']) {
    assert.ok(R.zoneStyles[k], `專屬區域繪圖函式 ${k} 存在`);
  }

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
  const origBlit = R.blit;
  R.blit = (c, key, w, h, cx, cy, fn) => fn(c);

  const w = new full.World(full.bossById.rennala, full.bossById.dummy, { seed: 11, intro: 0 });
  w.bosses.forEach(u => { u.controller = { update() {} }; });
  const [b, e] = w.bosses;
  full.applyStatus(b, 'ambershield', { dur: 99, value: 220, source: b }, w);
  full.applyStatus(e, 'moonbane', { dur: 8, source: b }, w);

  for (const phase of [1, 2]) {
    b.phase = phase;
    for (const s of [...b.skills, b.ultimate]) {
      b.startSkill(s, { force: true });
      for (let i = 0; i < 45 && b.inst; i++) {
        w.step(full.STEP);
        style.under(ctx, b, w.time);
        if (b._moonOrb && b._moonOrb.end > w.time) {
          style.hidden(ctx, b, w.time);
        } else {
          R.drawBossBody(ctx, b, w.time);
        }
        style.over(ctx, b, w.time);
      }
    }
  }

  // 驗證投射物繪製不會重複 translate(p.x, p.y)
  const trCalls = [];
  ctx.translate = (tx, ty) => trCalls.push([tx, ty]);
  for (const k of ['glintshard', 'glintarc', 'scepterspin', 'sweetbook', 'spiritwolf']) {
    R.projStyles[k](ctx, { x: 1200, y: 900, vx: 600, vy: 0, r: 24, seq: 1 }, 1.2);
  }
  assert.ok(!trCalls.some(([tx, ty]) => tx === 1200 && ty === 900), '投射物不可重複 translate(p.x, p.y) 以免偏離畫面');
  ctx.translate = noop;
  R.blit = origBlit;
}

// 9. 考據圖片庫（docs/research/rennala/selected-images.json）完整性驗證：>= 30 張入庫圖片且含官方美術設定稿
{
  const root = path.resolve(__dirname, '..', 'docs', 'research', 'rennala');
  const selPath = path.join(root, 'selected-images.json');
  assert.ok(fs.existsSync(selPath), 'selected-images.json 存在');
  const selData = JSON.parse(fs.readFileSync(selPath, 'utf8'));
  const sel = selData.selected || selData;
  assert.ok(Array.isArray(sel) && sel.length >= 30, `入庫參考圖數量應 >= 30 張（實際 ${sel.length} 張）`);
  const conceptCount = sel.filter(x => x.category && x.category.startsWith('official-concept')).length;
  assert.ok(conceptCount >= 10, `應包含官方美術設定稿與 3D 設定圖（實際 ${conceptCount} 張）`);
  for (const item of sel) {
    const imgPath = path.join(root, item.file);
    assert.ok(fs.existsSync(imgPath), `入庫圖片檔案存在：${item.file}`);
  }
}

console.log('RENNALA TEST PASS');
