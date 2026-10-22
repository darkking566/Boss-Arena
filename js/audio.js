'use strict';
// 音效｜僅瀏覽器（data-browser）：由 BD.spawnFx 依特效 id / 類別觸發，不影響模擬；按 M 靜音（記在 localStorage）。
// 播 audio/raw/ 的現成音檔（用 <audio> 而非 fetch + decodeAudioData，才能在 file:// 下運作）。亂數只用 BD.vrng。
(function (G) {
  // 音效組：SET 選 audio/<SET>/ 並套用 SETS[SET]（副檔名 + 各分組的檔名清單，播放時隨機挑一個）；SET = null 即全部暫停（檔案保留）。
  const SET = 'mc_set';
  const SETS = {
    raw: { ext: '.mp3', files: {
      slashHeavy: ['slash_violent'], slash: ['slash_2'], swing: ['swing_small'],
      hitLight: ['hit_flesh_02'], hitMid: ['hit_flesh_slice'], hitHeavy: ['hit_armor', 'hit_metal_clash'],
      hitFlesh: ['hit_flesh_slice', 'hit_flesh_02'], hitBeast: ['roar_mid'], block: ['block_combo'],
      explodeMid: ['explosion_mid'], explodeBig: ['explosion_big'], shockwave: ['shockwave'], slamHeavy: ['slam_heavy'], slamThud: ['slam_thud'],
      roarMid: ['roar_mid'], roarBig: ['roar_big'], death: ['death'], fire: ['fire'], ice: ['ice'], lightning: ['lightning'],
      dash: ['dash_whoosh'], teleport: ['teleport'], buff: ['buff_up'], projHit: ['proj_hit'], ultCast: ['magic_cast'], poison: ['poison'], victory: ['victory'],
      horseNeigh: ['roar_mid'], horseGallop: ['slam_thud'], shieldBreak: ['hit_armor'],
    } },
    mc_set: { ext: '.ogg', files: {
      slashHeavy: ['sweep_attack1', 'sweep_attack2', 'sweep_attack3'], slash: ['sweep_attack4', 'sweep_attack5'], swing: ['sweep_attack6', 'sweep_attack7'],
      hitLight: ['arrow_hit1', 'arrow_hit2', 'arrow_hit3', 'arrow_hit4'], hitMid: ['critical_attack1', 'critical_attack2', 'critical_attack3'],
      hitHeavy: ['iron_golem_hurt1', 'iron_golem_hurt2', 'iron_golem_hurt3', 'iron_golem_hurt4'],
      hitFlesh: ['player_hurt1', 'player_hurt2', 'player_hurt3'],
      hitBeast: ['ravager_hurt1', 'ravager_hurt2', 'ravager_hurt3'],
      block: ['shield_block1', 'shield_block2', 'shield_block3', 'shield_block4', 'shield_block5'],
      explodeMid: ['explosion1', 'explosion2'], explodeBig: ['explosion3', 'explosion4'], shockwave: ['sonic_boom1', 'sonic_boom2', 'sonic_boom3', 'sonic_boom4'],
      slamHeavy: ['mace_smash_ground1', 'mace_smash_ground2', 'mace_smash_ground3', 'mace_smash_ground4'], slamThud: ['anvil_land'],
      roarMid: ['ravager_roar1', 'ravager_roar2', 'ravager_roar3', 'ravager_roar4'], roarBig: ['warden_roar1', 'warden_roar2', 'warden_roar3', 'warden_roar4', 'warden_roar5'],
      death: ['wither_death'], fire: ['fire'], ice: ['brittle_ice_break1', 'brittle_ice_break2', 'brittle_ice_break3', 'brittle_ice_break4', 'brittle_ice_break5', 'brittle_ice_break6'],
      lightning: ['thunder1', 'thunder2', 'thunder3', 'trident_thunder1', 'trident_thunder2'],
      dash: ['breeze_slide1_je2_be2', 'breeze_slide2_je2_be2', 'breeze_slide3_je2_be2', 'breeze_slide4_je2_be2'],
      teleport: ['enchanting_table_enchant1', 'enchanting_table_enchant2', 'enchanting_table_enchant3'], buff: ['enchanting_table_enchant1', 'enchanting_table_enchant2', 'enchanting_table_enchant3'],
      projHit: ['arrow_hit1', 'arrow_hit2', 'arrow_hit3', 'arrow_hit4'], ultCast: ['totem_of_undying'], poison: ['lava_pop'],
      victory: ['event_raidhorn1', 'event_raidhorn2', 'event_raidhorn3', 'event_raidhorn4'],
      wood: ['cherry_wood_break1', 'cherry_wood_break2', 'cherry_wood_break3', 'cherry_wood_break4', 'cherry_wood_break5'],
      grass: ['grass_dig1', 'grass_dig2', 'grass_dig3', 'grass_dig4'],
      splash: ['water_splash1', 'water_splash2'],
      stun: ['ravager_stun1', 'ravager_stun2', 'ravager_stun3'],
      bell: ['bell_use1', 'bell_use2'],
      click: ['click_stereo'],
      shoot: ['crossbow_shoot1', 'crossbow_shoot2', 'crossbow_shoot3'],
      draw: ['draw'], sheath: ['sheath'], mikiriClang: ['mikiri_clang'], mikiriRing: ['mikiri_ring'],
      horseNeigh: ['horse_angry'],
      horseGallop: ['horse_gallop1', 'horse_gallop2', 'horse_gallop3', 'horse_gallop4'],
      shieldBreak: ['brittle_ice_break1', 'brittle_ice_break2', 'brittle_ice_break3', 'brittle_ice_break4', 'brittle_ice_break5', 'brittle_ice_break6'],
      stepSand: ['sand_dig1', 'sand_dig2', 'sand_dig3', 'sand_dig4'],
      stepSnow: ['powder_snow_step1', 'powder_snow_step2', 'powder_snow_step3', 'powder_snow_step4', 'powder_snow_step5', 'powder_snow_step6', 'powder_snow_step7', 'powder_snow_step8', 'powder_snow_step9', 'powder_snow_step10'],
      stepGrass: ['grass_dig1', 'grass_dig2', 'grass_dig3', 'grass_dig4'],
      stepMud: ['mud_step1', 'mud_step2', 'mud_step3', 'mud_step4', 'mud_step5', 'mud_step6'],
      stepWater: ['water_splash1', 'water_splash2'],
      ambDesert: ['sand_wind8', 'dead_bush_howlingwind1', 'dry_grass_wind1', 'dry_grass_wind2', 'dry_grass_wind3'],
      ambSnow: ['soulsand_valley_wind1', 'soulsand_valley_wind2', 'soulsand_valley_wind3', 'dead_bush_howlingwind1'],
      ambLake: ['water1', 'water2'],
      ambForest: ['poplar_leaves_wind1_je2', 'poplar_leaves_wind2_je2', 'poplar_leaves_wind3_je2'],
      ambWheat: ['dry_grass_wind4', 'dry_grass_wind5', 'dry_grass_wind6'],
      ambSwamp: ['dead_bush_crickets', 'dead_bush_insect1'],
    } },
  };
  if (!SET) return;
  const BD = G.BD, V = BD.vrng, DIR = 'audio/' + SET + '/', EXT = SETS[SET].ext, FILES = SETS[SET].files;
  const LONG = 0.35, GAP = { hitFlesh: 0.12, hitHeavy: 0.12, hitBeast: 0.15, shoot: 0.12, draw: 0.25, sheath: 1, mikiriClang: 0.5, mikiriRing: 0.5, horseNeigh: 0.8, horseGallop: 0.16, shieldBreak: 0.15, stepSand: 0.1, stepSnow: 0.1, stepGrass: 0.1, stepMud: 0.1, stepWater: 0.1, wood: 0.12, grass: 0.12, splash: 0.2, stun: 0.5, bell: 0.8, click: 0.05, explodeMid: LONG, explodeBig: LONG, slamHeavy: LONG, slamThud: LONG, roarMid: 1, roarBig: 1, death: 1, fire: LONG, ice: LONG, lightning: LONG, dash: 0.25, teleport: 0.4, buff: 1, projHit: 0.1, ultCast: 1.5, poison: LONG, victory: 1 };
  // 音檔常帶很長的尾巴（蓄力 7 秒、砸地 6.6 秒…），超過上限就淡出截斷；未列出者播完整檔
  const MAXLEN = { mikiriRing: 1.5, horseNeigh: 1.8, horseGallop: 0.6, shieldBreak: 0.8, ambDesert: 8, ambSnow: 8, ambLake: 6, ambForest: 8, ambWheat: 7, ambSwamp: 8, explodeMid: 1.5, explodeBig: 2.2, slamHeavy: 1.5, slamThud: 1, roarMid: 2, roarBig: 2.2, fire: 1.2, ice: 1.2, lightning: 1.5, shockwave: 1.2, teleport: 1.2, buff: 1.2, ultCast: 1.5, poison: 1.2 };
  const ELEM = { fire: 'fire', ice: 'ice', lightning: 'lightning', poison: 'poison' }, ELEM_FX = ['projhit', 'trapburst', 'breath', 'flamethrow', 'dragonbreath'];
  const BUFF = ['summon', 'shadowrise', 'thunderwake', 'ironfist', 'adamas', 'divinesight', 'gfoc', 'mangekyo', 'susanoo', 'godofgods'], TELE = ['blink', 'boltblink', 'vanish', 'shadowswap', 'appear', 'livingshadow'];
  const TERRAIN = { treecut: 'wood', treesmash: 'wood', treehit: 'wood', wheatburst: 'grass', splash: 'splash', lakesplash: 'splash' };
  const ROAR = ['roar', 'bloodroar', 'awaken', 'dragonrage'];
  const MAX_VOICES = 12; // 同時發聲上限；同名音效最短間隔見 GAP（預設 0.04 秒）
  let muted = false, voices = 0;
  try { muted = G.localStorage.getItem('bd.mute') === '1'; } catch (e) { /* 無儲存空間也能玩 */ }
  const seen = new WeakSet(), last = {}, cache = {}, live = new Set();

  function play(group, vol, rate) {
    if (muted || voices >= MAX_VOICES) return;
    const now = performance.now() / 1000;
    if (now - (last[group] ?? -1e9) < (GAP[group] || 0.04)) return;
    last[group] = now;
    const names = FILES[group]; if (!names) return; // 該音效組沒有這類音效
    const n = names[Math.floor(V() * names.length)];
    const a = (cache[n] || (cache[n] = new Audio(DIR + n + EXT))).cloneNode();
    a.volume = Math.max(0, Math.min(1, vol));
    a.playbackRate = (rate || 1) * (0.92 + V() * 0.16); // 微幅變速避免重複感
    const h = { a, t: 0 };
    const end = () => { if (live.delete(h)) { voices--; clearInterval(h.t); a.pause(); } };
    live.add(h); voices++; a.onended = a.onerror = end;
    a.play().catch(end); // 尚未有使用者操作時瀏覽器會拒絕播放
    const len = MAXLEN[group];
    if (len) setTimeout(() => { // 最後 0.2 秒線性淡出，避免硬切的爆音
      if (!live.has(h)) return;
      const v0 = a.volume; let i = 0;
      h.t = setInterval(() => { a.volume = v0 * Math.max(0, 1 - ++i / 8); if (i >= 8) end(); }, 25);
    }, (len - 0.2) * 1000);
  }

  // 環境音（隔數秒輕輕吹一陣）與腳步（依移動距離，聲音隨地圖不同）。腳步 / 環境以 BD.ARENA.map 判斷地形。
  const MAP_SFX = { desert: ['stepSand', 'ambDesert'], forest: ['stepGrass', 'ambForest'], swamp: ['stepMud', 'ambSwamp'], wheat: ['stepGrass', 'ambWheat'], snow: ['stepSnow', 'ambSnow'], lake: ['stepWater', 'ambLake'] };
  const STRIDE = 70, JUMP = 40; // 每走 STRIDE px 一步；單格位移超過 JUMP 視為瞬移 / 位移招式，不算走路
  const pos = new WeakMap(); let ambT = 3, ambW = null;
  function tick(w, dt) {
    const g = MAP_SFX[BD.ARENA.map]; if (!g || w.over) return;
    if (ambW !== w) { ambW = w; ambT = 2 + V() * 3; }
    if ((ambT -= dt) <= 0) { ambT = 5 + V() * 5; play(g[1], 0.22); }
    for (const b of w.bosses) {
      const p = pos.get(b) || { x: b.x, y: b.y, d: 0 }; pos.set(b, p);
      const d = Math.hypot(b.x - p.x, b.y - p.y); p.x = b.x; p.y = b.y;
      if (b.hp <= 0 || d > JUMP) { p.d = 0; continue; }
      if ((p.d += d) >= STRIDE) {
        p.d = 0;
        if (b.phase === 2 && b.def && b.def.id === 'lubu') {
          play('horseGallop', 0.4); // 呂布二階段騎赤兔馬時，走路腳步聲轉為戰馬鐵蹄聲
        } else {
          play(g[0], Math.min(0.3, 0.12 + (b.r || 30) / 400));
        }
      }
    }
  }

  BD.sfx = {
    tick,
    play,
    once(o, group, vol) { if (!seen.has(o)) { seen.add(o); play(group, vol); } }, // 每個物件只響一次（如無法閃避的預警）
    stop() { for (const h of [...live]) { live.delete(h); clearInterval(h.t); h.a.pause(); } voices = 0; }, // 離開戰鬥時立刻停掉所有音效
    proj(kind) { // 投射物離手（BD.spawnProj）：只有拋擲 / 射出類有聲音，其餘種類靜音以免太密集
      if (kind === 'kunai' || kind === 'shuriken' || kind === 'arrow') play('shoot', 0.4);
      else if (kind === 'airslash') play('swing', 0.35);
    },
    fx(id, category, o) {
      const e = o.src && o.src.def && o.src.def.echoColor;
      if (e && o.color === e && (id === 'slash' || id === 'cross')) { play('swing', 0.25, 0.7); return; } // 影分身追斬：較輕、較低沉的虛影揮刀
      if (id === 'impact') {
        const d = o.dmg || 0, v = o.victim, ht = (v && v.def && v.def.hurt) || 'flesh';
        if (d >= 100) {
          if (ht === 'magma') play('hitHeavy', 0.4 + Math.min(0.5, d / 250));
          else if (ht === 'frost') play('ice', 0.5);
          else if (ht === 'ooze') play('poison', 0.5);
          else if (v && v.def && v.def.mass >= 2.0) play('hitBeast', 0.45 + Math.min(0.45, d / 250));
          else play('hitFlesh', 0.35 + Math.min(0.55, d / 250));
        } else if (d >= 40) {
          play('hitMid', 0.35 + Math.min(0.4, d / 250));
        } else {
          play('hitLight', 0.3 + Math.min(0.3, d / 250));
        }
      }
      else if (id === 'mikiri') { play('mikiriClang', 0.8); play('mikiriRing', 0.5); } // 影刃武士：見切彈刀
      else if (id === 'iaido') { play('draw', 0.55); if (o.src && o.src.inst && o.src.inst.skill.id === 'chidori') play('lightning', 0.4); } // 居合 / 千鳥（再加電弧）：出鞘
      else if (id === 'shadowrise') play('sheath', 0.7); // 二階段：收刀入鞘
      else if (id === 'nightfall') play('ambSnow', 0.5); // 百鬼夜斬：夜幕陰風（只在開頭一次）
      else if (id === 'threadcut') { if (o.scale >= 1.5) play('shockwave', 0.8); } // 只有最後的十字斬響，中間的刀線靜音
      else if (id === 'pojun') {
        play('slamThud', 0.9);   // 鐵砧巨響：方天畫戟硬接雷神巨力
        play('hitHeavy', 0.85);  // 重金屬交擊震盪
        play('block', 0.7);
        setTimeout(() => { play('slashHeavy', 0.9); play('hitFlesh', 0.85); }, (o.delay || 0.2) * 1000); // 反手切開神血
      }
      else if (id === 'skyrend') {
        play('shockwave', 1.0);  // sonic_boom 裂空音爆！
        play('slamHeavy', 0.85); // 大地崩解
        setTimeout(() => { play('explodeBig', 0.6); play('shockwave', 0.6); }, 250); // 沿線裂隙連鎖爆破
      }
      else if (id === 'warsteed') {
        play('horseNeigh', 0.95); // 赤兔長嘶破陣
        setTimeout(() => { play('horseGallop', 0.7); }, 220); // 鐵蹄踏地
      }
      else if (id === 'hoofcharge') {
        play('horseGallop', 0.75); // 戰馬奔騰衝刺
        play('dash', 0.4);
      }
      else if (id === 'bloodroar') {
        play(o.k >= 1.5 ? 'roarBig' : 'roarMid', 0.85);
        play('shockwave', 0.6);
        play('poison', 0.4); // 蒸騰熱氣
      }
      else if (TERRAIN[id]) play(TERRAIN[id], 0.5);
      else if (id === 'posturebreak') play('stun', 0.7);
      else if (id === 'parry') play('block', 0.6);
      else if (id === 'gore') { if (o.lethal) play('death', 0.8); }
      else if (ROAR.includes(id)) play(o.k >= 1.5 ? 'roarBig' : 'roarMid', 0.7);
      else if (category === '爆炸' && id !== 'deathmark') play(o.radius >= 140 ? 'explodeBig' : 'explodeMid', Math.min(0.9, 0.4 + o.k * 0.25));
      else if (category === '震波') play('shockwave', Math.min(0.8, 0.4 + o.k * 0.2));
      else if (category === '砸地') play(o.k >= 1.3 ? 'slamHeavy' : 'slamThud', Math.min(0.9, 0.45 + o.k * 0.2));
      else if (ELEM[o.el] && ELEM_FX.includes(id)) play(ELEM[o.el], 0.5);
      else if (id === 'ultcast') play('ultCast', 0.6);
      else if (BUFF.includes(id)) play('buff', 0.5);
      else if (category === '位移') play(TELE.includes(id) ? 'teleport' : 'dash', 0.45);
      else if (id === 'projhit' || id === 'projwall') play('projHit', id === 'projhit' ? 0.5 : 0.3);
      else if (category === '斬擊' || category === '突刺') {
        const d = o.dmg || 0;
        play(d >= 80 ? 'slashHeavy' : d >= 30 ? 'slash' : 'swing', 0.3 + Math.min(0.4, d / 250));
        if (o.status && (o.status.id === 'vulnerable' || (Array.isArray(o.status) && o.status.some(x => x.id === 'vulnerable')))) {
          play('shieldBreak', 0.65); // 破盾突：女武神破甲崩裂音效
        }
      }
    },
  };
  G.document.addEventListener('click', e => { if (e.target.closest && e.target.closest('button, .card, .mapcard')) play('click', 0.4); });
  G.addEventListener('keydown', e => {
    if (e.key !== 'm' && e.key !== 'M') return;
    muted = !muted;
    try { G.localStorage.setItem('bd.mute', muted ? '1' : '0'); } catch (err) { /* 同上 */ }
  });
})(window);
