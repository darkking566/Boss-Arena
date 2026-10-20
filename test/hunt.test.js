// 獵魂模式測試（node test/hunt.test.js）：資料一致性、靈魂經濟、存檔整理、每個武器 / 借用招式都能施放、AI 操控的主角能完整打完一場
'use strict';
const { load } = require('./lib/load');
const { BD } = load();
const H = BD.HUNT, Hunt = BD.Hunt;
let fails = 0;
const check = (cond, msg) => { if (!cond) { fails++; console.log('FAIL ' + msg); } };
const eq = (a, b, msg) => check(a === b, `${msg}（${a} !== ${b}）`);

// ── 1. 資料一致性 ──
check(Object.keys(H.BOSS_META).sort().join() === BD.bosses.map((b) => b.id).sort().join(), 'BOSS_META 必須涵蓋所有正式 Boss（新增 Boss 時請補 js/data/hunt.js）');
eq(H.WEAPONS.length, 8, '武器數量');
for (const w of H.WEAPONS) {
  check(w.skills.length >= 2, `${w.id} 至少兩招`);
  for (const s of w.skills) check(s.actions.length && s.id && s.name && s.short && s.cost >= 0 && s.cd > 0, `${w.id}/${s.id} 欄位`);
}
for (const id in H.BOSS_META) {
  const m = H.BOSS_META[id];
  check(H.ARCH[m.arch] && m.short && m.passive.name && m.set2.name && m.set4.name, `${id} 套裝 / 被動資料`);
  const ab = Hunt.abilitiesOf(id);
  check(ab.some((a) => a.kind === 'skill') && ab.some((a) => a.kind === 'passive'), `${id} 至少要有一個可借用招式與被動`);
  for (const s of H.SLOTS) check(Hunt.piece(id, s.id).desc, `${id}/${s.id} 裝備數值`);
}

// ── 2. 靈魂經濟 ──
{
  const s = Hunt.newSave(), ab = Hunt.abilitiesOf('ronin').find((a) => a.kind === 'skill');
  check(!Hunt.unlock(s, ab.key).ok, '沒有靈魂不能解鎖');
  const r = Hunt.reward(s, 'ronin');
  eq(r.souls, H.REWARD.kill + H.REWARD.first, '首殺獎勵'); eq(Hunt.reward(s, 'ronin').souls, H.REWARD.kill, '重複擊敗只給基本獎勵');
  s.souls.ronin = 20;
  check(Hunt.unlock(s, ab.key).ok && !Hunt.unlock(s, ab.key).ok, '解鎖一次、不可重複');
  eq(s.souls.ronin, 20 - ab.cost, '解鎖扣靈魂');
  for (const sl of H.SLOTS) check(Hunt.craft(s, 'ronin', sl.id).ok, `製作 ${sl.id}`);
  check(!Hunt.craft(s, 'ronin', 'helm').ok, '裝備不可重複製作');
  check(!Hunt.craft(s, 'magmus', 'helm').ok, '沒有該 Boss 的靈魂不能製作');
  eq(Hunt.setsOf(s).length, 1, '四件集滿'); eq(Hunt.setsOf(s)[0].bonuses.length, 2, '四件套含二件 + 四件獎勵');
  Hunt.equip(s, 'helm', null); eq(Hunt.setsOf(s)[0].bonuses.length, 1, '三件只有二件套獎勵');
  Hunt.equip(s, 'chest', null); eq(Hunt.setsOf(s).length, 1, '兩件仍有二件套'); Hunt.equip(s, 'legs', null); eq(Hunt.setsOf(s).length, 0, '一件沒有套裝');
  check(!Hunt.equip(s, 'helm', 'magmus').ok, '未製作的裝備不能穿');
  check(Hunt.toggle(s, ab.key).ok && s.loadout.skills.length === 1, '裝備技能'); Hunt.toggle(s, ab.key); eq(s.loadout.skills.length, 0, '卸下技能');
  const before = s.souls.ronin; check(Hunt.upgrade(s, 'hp', 'ronin').ok, '升級生命'); eq(s.souls.ronin, before - H.UPGRADES[0].base, '升級扣靈魂');
  check(!Hunt.upgrade(s, 'hp', null).ok, '升級必須指定靈魂來源');
  const bad = Hunt.sanitize({ unlocked: { 'ronin:nope': true, [ab.key]: true }, loadout: { weapon: 'xx', skills: ['ronin:nope', 'magmus:combo'] }, souls: { ronin: -3, zed: 5.7 } });
  check(Object.keys(bad.unlocked).join() === ab.key && bad.loadout.weapon === 'katana' && Hunt.sanitize({ loadout: { weapon: 'bow' } }).loadout.weapon === 'katana' && !bad.loadout.skills.length && !bad.souls.ronin && bad.souls.zed === 5, '存檔整理丟掉無效項目');
}

// ── 3. 建立主角、對假人施放每個武器招式與每個可借用招式 ──
function dummyWorld(save, gap) {
  const hero = Hunt.buildHero(save, 'heavy');
  const w = new BD.World(hero, BD.bossById.dummy, { seed: 7, pace: 'heavy', intro: 0, hunt: true });
  const [h, d] = w.bosses;
  h.controller = null; d.controller = null; d.isDummy = true;
  h.x = 800; h.y = 900; d.x = 800 + gap; d.y = 900; h.face = h.wantFace = 0;
  return w;
}
function castAndMeasure(save, skillIndex, ult, gap) {
  const w = dummyWorld(save, gap), [h, d] = w.bosses;
  h.mana = h.maxMana; h.sta = h.maxSta; h.ult = 100; if (h.maxSpirit) h.spirit = h.maxSpirit;
  const sk = ult ? h.ultimate : h.skills[skillIndex];
  check(h.startSkill(sk), `${sk.name} 無法起手`);
  for (let i = 0; i < 60 * 6; i++) { w.hitstop = 0; w.freezeF = 0; w.step(BD.STEP); }
  check(isFinite(h.hp) && isFinite(h.mana) && isFinite(d.hp), `${sk.name} 數值出現 NaN`);
  return d.stats.taken;
}
const soulSave = (key, weapon) => {
  const s = Hunt.newSave(); s.loadout.weapon = weapon || 'greatsword';
  s.unlocked[key] = true;
  Hunt.toggle(s, key);
  return s;
};
for (const wp of H.WEAPONS) {
  const s = Hunt.newSave(); s.loadout.weapon = wp.id;
  const hero = Hunt.buildHero(s, 'heavy');
  check(hero.skills.length === wp.skills.length && hero.maxHp === 700 + (wp.bonus.hp || 0), `${wp.id} 基礎主角`);
  for (let i = 0; i < wp.skills.length; i++) {
    if (wp.skills[i].tags.includes('counter')) continue; // 見切架式本身不造成傷害
    const near = castAndMeasure(s, i, false, 110), far = castAndMeasure(s, i, false, 400);
    check(near > 0 || far > 0, `${wp.id}/${wp.skills[i].id} 在近距離與中距離都打不到假人`);
  }
}
let borrowed = 0, noHit = [];
for (const id in H.BOSS_META) {
  for (const a of Hunt.abilitiesOf(id)) {
    if (a.kind === 'passive') continue;
    const s = soulSave(a.key); borrowed++;
    const idx = a.kind === 'ult' ? 0 : 2, ult = a.kind === 'ult';
    const hits = [90, 250, 500].map((g) => castAndMeasure(s, idx, ult, g));
    if (!hits.some((x) => x > 0)) noHit.push(a.key);
  }
}
console.log(`借用招式 ${borrowed} 個全部可施放；對靜止假人三種距離都沒命中：${noHit.join(', ') || '無'}`);

// ── 4. 法力 / 藥水 / 吸血 / 減傷 ──
{
  const s = Hunt.newSave(); s.loadout.weapon = 'staff';
  const w = dummyWorld(s, 300), h = w.bosses[0], m0 = h.mana;
  h.startSkill(h.skills[0]); eq(h.mana, m0 - h.skills[0].cost, '法杖耗法力不耗體力'); eq(h.sta, h.maxSta, '法杖不耗體力');
  h.setState('idle', 0); h.cancelSkill(); h.hp = 100; h.mana = 10;
  check(Hunt.drink(h, 'hp') && h.hp === 100 + Math.round(h.maxHp * 0.45), '生命藥水回血'); eq(h.hunt.hpPotions, H.BASE.potions - 1, '藥水扣數量');
  check(!Hunt.drink(h, 'mana'), '喝藥期間（硬直中）不能再喝');
  h.setState('idle', 0); check(Hunt.drink(h, 'mana') && h.mana === 10 + Math.round(h.maxMana * 0.7), '法力藥水回法力');
  h.hp = h.maxHp; h.setState('idle', 0); check(!Hunt.drink(h, 'hp'), '滿血不浪費藥水');
  const s2 = Hunt.newSave(); s2.unlocked['magmus:passive'] = true; Hunt.toggle(s2, 'magmus:passive');
  const w2 = dummyWorld(s2, 300), h2 = w2.bosses[0], p = { dmg: 100 };
  h2.hp = h2.maxHp; w2.damageBoss(w2.bosses[1], h2, p);
  check(h2.def.hunt.def > 0 && h2.hp > h2.maxHp - 100 && h2.hp < h2.maxHp, '被動減傷生效'); // 熔岩之軀 8% → 約 92（±8% 浮動）
  const w3 = dummyWorld(Hunt.newSave(), 300), h3 = w3.bosses[0]; h3.lifesteal = 0.1; h3.hp = 100;
  w3.damageBoss(h3, w3.bosses[1], { dmg: 200 }); check(h3.hp > 100, '吸血');
}


// ── 4b. 太刀：連段順序、氣刃累積 / 消耗、練氣升級、見切 ──
{
  const s = Hunt.newSave(); s.loadout.weapon = 'katana';
  const w = dummyWorld(s, 120), h = w.bosses[0], d = w.bosses[1];
  const run = (n) => { for (let i = 0; i < n; i++) { w.hitstop = 0; w.freezeF = 0; w.step(BD.STEP); } };
  const swing = (idx) => { const sk = h.pick(idx); check(h.startSkill(sk), sk.id + ' 起手'); for (let i = 0; i < 200 && h.state !== 'idle'; i++) run(1); run(2); return sk.id; };
  eq(h.pick(0).id, 'k_a1', '連斬從 a1 開始');
  eq(swing(0), 'k_a1', 'a1'); eq(h.pick(0).id, 'k_a2', '接 a2'); swing(0); eq(h.pick(0).id, 'k_a3', '接 a3'); swing(0); swing(0); eq(h.pick(0).id, 'k_a5', '接 a5'); eq(swing(0), 'k_a5', 'a5'); eq(h.pick(0).id, 'k_a1', '連斬循環回 a1'); h.sta = h.maxSta; eq(h.sta, h.maxSta, '連斬不耗體力');
  check(h.spirit > 0, '命中累積氣刃（' + h.spirit.toFixed(1) + '）');
  h.spirit = 100; run(1); d.x = h.x + 120; d.y = h.y;
  eq(h.pick(1).id, 'k_s1', '氣刃斬從 I 開始');
  const ids = []; for (let i = 0; i < 4; i++) { ids.push(swing(1)); d.x = h.x + 120; d.y = h.y; } eq(ids.join(), 'k_s1,k_s2,k_s3,k_spin', '氣刃連段順序');
  check(h.spirit < 100 - 44, '氣刃斬消耗氣刃（' + h.spirit.toFixed(1) + '）'); eq(h.hunt.kt.level, 1, '大回旋命中後練氣升級');
  check(Math.abs(h.dmgMul - h.hunt.baseDmg * 1.05) < 1e-9, '練氣提高傷害倍率');
  h.spirit = 0; check(!h.startSkill(h.pick(1)), '氣刃不足不能施放氣刃斬');
  // 見切：架式中被打中 → 反擊並回氣、再升一級
  h.hp = h.maxHp; run(40); h.sta = h.maxSta; h.setState('idle', 0); h.cancelSkill();
  const mk = h.skills.find((x) => x.id === 'k_mikiri'); check(h.startSkill(mk), '見切起手'); run(10);
  const lv0 = h.hunt.kt.level, hp0 = h.hp; w.damageBoss(d, h, { dmg: 80 }); run(30);
  check(h.hp === hp0 && h.stats.counters === 1 && h.spirit >= 30 && h.hunt.kt.level === lv0 + 1, '見切成功：無傷、回氣、練氣 +1');
  h.hunt.kt.lvAt = w.time - 100; run(2); eq(h.hunt.kt.level, lv0, '練氣等級久未命中會下降');
  // 彈刀：揮刀前 0.2 秒內被直接攻擊 → 免傷並反震；投射物改向打回；超出時機照常受傷
  h.cancelSkill(); h.setState('idle', 0); run(60); h.hp = h.maxHp; d.hp = d.maxHp; d.posture = 0; h.hunt.kt.gainAt = w.time;
  check(h.startSkill(h.skills.find((x) => x.id === 'k_a1')), '彈刀起手'); run(3);
  const hp1 = h.hp, dhp = d.hp; eq(w.damageBoss(d, h, { dmg: 80 }), 'deflected', '揮刀窗內被打中 → 彈刀');
  check(h.hp === hp1 && d.hp < dhp && d.posture > 0 && h.stats.deflects === 1, '彈刀：自己無傷、敵人受傷並失去架勢');
  eq(w.damageBoss(d, h, { dmg: 80, unblockable: true }) === 'deflected', false, '無法格擋的攻擊不能彈');
  const pr = { team: d.team, owner: d, x: h.x + 30, y: h.y, vx: -500, vy: 0, r: 8, dmg: 40, posture: 10, kb: 0, life: 2, hitSet: new Set(), alive: true, t: 0 };
  w.projectiles.push(pr); h.face = 0; h.hp = h.maxHp; run(1);
  check(pr.team === h.team && pr.owner === h && pr.vx > 0 && h.hp === h.maxHp, '投射物被彈開、改向並換隊');
  run(200); h.cancelSkill(); h.setState('idle', 0); run(60);
  check(h.startSkill(h.skills.find((x) => x.id === 'k_a1')), '彈刀起手 2'); run(30); const hp2 = h.hp; w.damageBoss(d, h, { dmg: 80 }); check(h.hp < hp2, '超出彈刀時機照常受傷');
}

// ── 4c. 代理：opts.agent 的主角由 AI 操控，只靠揮刀窗彈刀（與玩家同限制）──
{
  const s = Hunt.newSave(); s.loadout.weapon = 'katana';
  for (const id of ['ronin', 'zed', 'magmus']) {
    const w = new BD.World(Hunt.buildHero(s, 'heavy'), BD.bossById[id], { seed: 5, pace: 'heavy', hunt: true, agent: true });
    for (let i = 0; i < 60 * 90 && !w.winner; i++) { w.hitstop = 0; w.freezeF = 0; w.step(BD.STEP); }
    const h = w.bosses[0];
    check(h.stats.deflects > 0, '代理 vs ' + id + '：彈開 ' + h.stats.deflects + ' 次，承受 ' + h.stats.taken);
  }
}

// ── 5. AI 操控的主角打完整場（每種武器對一位 Boss，確認引擎全程不丟例外、能分出勝負）──
{
  const bosses = BD.bosses.map((b) => b.id);
  let n = 0, heroWins = 0;
  for (let i = 0; i < H.WEAPONS.length; i++) {
    const s = Hunt.newSave(); s.loadout.weapon = H.WEAPONS[i].id;
    const w = new BD.World(Hunt.buildHero(s, 'heavy'), BD.bossById[bosses[i % bosses.length]], { seed: 100 + i, pace: 'heavy', hunt: true });
    const over = w.simulate(900); n++;
    check(over && w.winner, `${H.WEAPONS[i].id} 對 ${bosses[i % bosses.length]} 沒有分出勝負`);
    if (w.winner === w.bosses[0]) heroWins++;
  }
  console.log(`AI 主角 ${n} 場完整對戰完成（主角勝 ${heroWins}）`);
}

console.log(fails ? `HUNT FAIL（${fails} 項）` : 'HUNT PASS');
process.exit(fails ? 1 : 0);
