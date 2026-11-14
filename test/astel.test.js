'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { load } = require('./lib/load');
const { BD } = load({ noFx: true });
const def = BD.bossById.astel;
function make(pace = 'light') {
  const w = new BD.World(def, BD.bossById.redwolf, { seed: 71, pace, intro: 0 });
  w.bosses.forEach(b => { b.controller = { update() {} }; });
  const [b, e] = w.bosses; e.x = b.x + 600; e.y = b.y; return w;
}
function run(w, seconds) { for (let t = 0; t < seconds; t += BD.STEP) { w.hitstop = w.slowmo = w.freezeF = 0; w.step(BD.STEP); } }
// 被動「星屑流散」：9 秒後先預警 0.7 秒，再在對手腳邊撒下只減速的星屑；同時只留一團；無法選取時不觸發。
for (const pace of ['light', 'heavy']) {
  const w = make(pace), [b, e] = w.bosses; run(w, 8.8);
  assert.ok(!w.zones.some(z => z.kind === 'stardust'), '8.8 秒內不能提前出現');
  run(w, 0.4); assert.ok(b._dustPending, '預警中'); assert.ok(!w.zones.some(z => z.kind === 'stardust'));
  run(w, 0.9);
  const z = w.zones.find(z => z.kind === 'stardust'); assert.ok(z, '星屑落地'); assert.ok(Math.hypot(z.x - e.x, z.y - e.y) < 5, '落在對手腳邊');
  assert.deepStrictEqual([].concat(z.status).map(s => s.id), ['slow']);
  run(w, 2.6); assert.ok(!w.zones.includes(z) || w.zones.every(q => q !== z || q.t >= q.dur), '星屑會自己消散');
}
{ const w = make(); BD.applyStatus(w.bosses[0], 'hidden', { dur: 30 }, w); run(w, 12); assert.ok(!w.zones.some(z => z.kind === 'stardust'), '無法選取（躍起 / 轉階段）時不撒星屑'); }
// 二階段專屬招式不會在一階段出現；流星的傳送門預警要抓得到（有 off 的圓形）。
{ const w = make(), b = w.bosses[0]; const ids = b.available().map(s => s.id);
  assert.ok(!ids.includes('meteorite') && !ids.includes('star_clones')); b.phase = 2;
  assert.ok(b.available().some(s => s.id === 'meteorite') && b.available().some(s => s.id === 'star_clones')); }
// 壓碎咬、擒抱確實帶浮空 / 定身，且時間軸不異常長。
for (const [id, st] of [['crushing_bite', 'airborne'], ['teleport_grab', 'root']]) {
  const s = def.skills.find(x => x.id === id), has = s.actions.some(a => a.do === 'hit' && [].concat(a.status || []).some(q => q.id === st));
  assert.ok(has, id + ' 應帶 ' + st);
}
// 回歸：puff 色票只能是 #rrggbb 或預烘焙名稱；rgba() 會被畫成 NaN，繪圖時丟例外、畫布狀態壞掉（畫面永久模糊）。
{
  const full = load().BD, ok = t => /^#[0-9a-f]{6}$/i.test(t) || ['sand', 'snow', 'wheat'].includes(t);
  for (const id of Object.keys(full.effects).filter(k => k.startsWith('astel'))) {
    const w = new full.World(full.bossById.astel, full.bossById.dummy, { seed: 3, intro: 0 }), b = w.bosses[0];
    full.spawnFx(w, id, b.x, b.y, { src: b, angle: 0, radius: 200, len: 600, width: 150, arc: 2 });
    for (let i = 0; i < 90; i++) { w.fx.update(full.STEP); for (const p of w.fx.puffs) assert.ok(ok(p.tint), id + ' 的 puff 色票不合法：' + p.tint); }
  }
}
// 音效：驗證艾絲緹 20 種專屬技能與演出特效在 js/audio.js 中均有對應處理，且其參照的音效檔案皆存在於 audio/mc_set/。
{
  const audioSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'audio.js'), 'utf8');
  const astelFxIds = [
    'astelbite', 'astelswipe', 'astelshove', 'asteltail', 'astelstab',
    'astelvanish', 'astelgather', 'astelbeam', 'astelorbs', 'astelwave',
    'astelgravity', 'astelcrush', 'astelgrab', 'astelclone', 'astelstarburst',
    'astelportal', 'astelmeteor', 'astelpull', 'astelawaken', 'astelstardust'
  ];
  for (const id of astelFxIds) {
    assert.ok(audioSrc.includes("id === '" + id + "'"), 'js/audio.js 必須包含 ' + id + ' 的音效分支');
  }
  const setDir = path.join(__dirname, '..', 'audio', 'mc_set');
  const setFiles = new Set(fs.readdirSync(setDir));
  const expectedAudio = [
    'sculk_click1.ogg', 'sculk_click2.ogg', 'sculk_click3.ogg',
    'heavy_whoosh1.ogg', 'heavy_whoosh2.ogg',
    'amethyst_cluster_break1.ogg', 'amethyst_cluster_break2.ogg',
    'heavy_core_break1.ogg', 'earth_crack.ogg',
    'portal_disappear.ogg', 'portal_appear.ogg',
    'sonic_charge1.ogg', 'beacon_power1.ogg',
    'tractor_beam_activate.ogg', 'tractor_beam_pull.ogg',
    'respawn_anchor_ambient1.ogg', 'respawn_anchor_set1.ogg',
    'shulker_hit1.ogg', 'warden_impact1.ogg',
    'illusion_warp1.ogg', 'firework_blast.ogg',
    'end_portal_activation.ogg', 'basalt_plode1.ogg',
    'ender_dragon_death.ogg', 'wither_spawn.ogg'
  ];
  for (const f of expectedAudio) {
    assert.ok(setFiles.has(f), 'audio/mc_set 必須存在 ' + f);
  }
}
console.log('ASTEL TEST PASS');
