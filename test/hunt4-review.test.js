// 成長回顧：新 / 舊存檔、主副武器、零樣本、勝負、快照獨立性與重賽。
'use strict';
const assert = require('assert');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true }), H = BD.H4Brain;
const make = (save, seed = 71, mains) => new BD.World(BD.Hunt4.team(mains), BD.bossById.ronin, { seed, intro: 0, pace: 'heavy', hunt4: true, h4save: save });
const finish = (w, win) => { w.winner = win ? w.hunt4.hunters[0] : w.hunt4.boss; w.step(BD.STEP); return w.hunt4.review; };

// 格式沿用舊版；沒有任何回顧欄位也可以讀取，不會遺失既有經驗和圖鑑。
const old = { v: 1, matches: 8, hunters: { rin: { xp: { katana: 25, bow: 7 }, strat: {}, dex: { ronin: { fights: 8, wins: 3, sk: {} } } } } };
const save = H.sanitize(JSON.parse(JSON.stringify(old))), w = make(save), st = w.hunt4, rin = st.hunters[0];
assert.strictEqual(H.V, 1);
assert.strictEqual(rin.brain.before.weapons.katana.xp, 25);
assert.strictEqual(rin.brain.before.weapons.bow.xp, 7);
assert.strictEqual(rin.brain.before.dex.fights, 8);
assert.strictEqual(st.review, undefined, '尚未結算沒有回顧');

// 實際用過副武器才列入成長；目前手上拿副武器不會遺漏主武器的紀錄。
rin.brain.used.add('bow'); rin.def = rin.h4.defs[1];
rin.brain.res.react = [2, 3]; rin.brain.res.dodge = [0, 0];
const [r] = finish(w, true);
assert.strictEqual(st.review.length, 4);
assert.strictEqual(r.after.weapons.katana.xp, 26);
assert.strictEqual(r.after.weapons.bow.xp, 8);
assert.ok(r.after.weapons.katana.mastery > r.before.weapons.katana.mastery);
assert.strictEqual(JSON.stringify(r.react), '[2,3]');
assert.strictEqual(JSON.stringify(r.dodge), '[0,0]');
assert.strictEqual(r.after.dex.fights, 9);
assert.strictEqual(r.before.dex.fights, 8);
assert.strictEqual(Object.keys(st.review[1].after.weapons).join(), 'gs', '未用副武器不列入本場經驗');

// 回顧不是存檔的參照；結算後的戰鬥 tick 與後續場次不改寫這一份結果。
const frozen = JSON.stringify(st.review);
rin.brain.res.react[0] = 99;
save.hunters.rin.xp.katana = 40;
assert.strictEqual(JSON.stringify(st.review), frozen);
assert.ok(!JSON.stringify(save).includes('before') && !JSON.stringify(save).includes('review'), '回顧不進持久存檔');
const clean = H.sanitize(JSON.parse(JSON.stringify(save)));
assert.strictEqual(clean.hunters.rin.xp.katana, 40);
const again = make(clean, 72);
assert.strictEqual(again.hunt4.review, undefined, '重賽不殘留上場結果');
assert.strictEqual(again.hunt4.hunters[0].brain.before.weapons.katana.xp, 40);
const lost = finish(again, false);
assert.strictEqual(lost[0].after.weapons.katana.xp, 41, '失敗依原有規則也增加經驗');
assert.strictEqual(lost[0].after.dex.fights, 10);
assert.strictEqual(JSON.stringify(lost[0].react), '[0,0]');

// 圖鑑沿用實際統計門檻，快照確實比較開戰前後。
const fresh = H.newSave(), first = make(fresh, 73, { rin: 'lightxbow' }), h = first.hunt4.hunters[0];
assert.strictEqual(h.brain.before.weapons.lightxbow.xp, 0);
assert.strictEqual(h.brain.before.dex.known, 0);
fresh.hunters.rin.dex.ronin.sk = { iai: { lead: { m: [3, 1] } } };
const dex = finish(first, false)[0];
assert.strictEqual(dex.before.dex.known, 0);
assert.strictEqual(dex.after.dex.known, 1);
assert.strictEqual(dex.after.weapons.lightxbow.xp, 1);

// 同存檔、種子與輸入產生相同回顧；不讀系統時間或額外戰鬥亂數。
const a = finish(make(H.newSave(), 74), true), b = finish(make(H.newSave(), 74), true);
assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
console.log('HUNT4 REVIEW PASS（舊存檔、主副武器、零樣本、勝負、重賽、快照與可重現性）');
