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
      bladeScrape: ['slash_violent'], swordWhoosh: ['swing_small'],
      maceAir: ['swing_small', 'dash_whoosh'], tridentThrow: ['dash_whoosh', 'swing_small'],
      tridentReturn: ['dash_whoosh', 'slash_2'], anvilDestroy: ['hit_armor'],
      throwWhoosh: ['dash_whoosh', 'swing_small'],
      heartbeat: ['slam_thud'],
      shadowTeleport: ['teleport', 'dash_whoosh'],
      fangSnap: ['hit_flesh_slice', 'slash_violent'],
      crit: ['hit_flesh_slice', 'slash_violent'],
      mikiriClang: ['hit_metal_clash'], mikiriRing: ['hit_metal_clash', 'buff_up'],
      draw: ['swing_small'], sheath: ['slash_2'], bell: ['buff_up'], stun: ['hit_armor'],
      wood: ['slam_thud', 'hit_armor'], click: ['swing_small'], stepSand: ['slam_thud'], shoot: ['swing_small', 'dash_whoosh'],
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
      bladeScrape: ['grindstone1', 'grindstone2', 'grindstone3'],
      swordWhoosh: ['sword_whoosh1', 'sword_whoosh2', 'sword_whoosh3', 'sword_whoosh4'],
      maceAir: ['mace_smash_air1', 'mace_smash_air2', 'mace_smash_air3'],
      tridentThrow: ['trident_throw1', 'trident_throw2'],
      tridentReturn: ['trident_return1', 'trident_return2', 'trident_return3'],
      anvilDestroy: ['anvil_destroy'],
      throwWhoosh: ['throw_whoosh1', 'throw_whoosh2', 'throw_whoosh3', 'throw_whoosh4'],
      heartbeat: ['heartbeat1', 'heartbeat2', 'heartbeat3', 'heartbeat4'],
      shadowTeleport: ['shadow_teleport1', 'shadow_teleport2'],
      fangSnap: ['evoker_fangs'],
      crit: ['critical_attack1', 'critical_attack2', 'critical_attack3'],
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
  const LONG = 0.35, GAP = { hitFlesh: 0.12, hitHeavy: 0.12, hitBeast: 0.15, shoot: 0.12, draw: 0.25, sheath: 1, mikiriClang: 0.5, mikiriRing: 0.5, horseNeigh: 0.8, horseGallop: 0.16, shieldBreak: 0.15, bladeScrape: 0.2, swordWhoosh: 0.1, maceAir: 0.1, tridentThrow: 0.2, tridentReturn: 0.2, anvilDestroy: 0.5, throwWhoosh: 0.08, heartbeat: 0.22, shadowTeleport: 0.12, fangSnap: 0.15, crit: 0.08, stepSand: 0.1, stepSnow: 0.1, stepGrass: 0.1, stepMud: 0.1, stepWater: 0.1, wood: 0.12, grass: 0.12, splash: 0.2, stun: 0.5, bell: 0.35, click: 0.05, explodeMid: LONG, explodeBig: LONG, slamHeavy: LONG, slamThud: LONG, roarMid: 1, roarBig: 1, death: 1, fire: LONG, ice: LONG, lightning: 0.08, dash: 0.25, teleport: 0.4, buff: 1, projHit: 0.1, ultCast: 1.5, poison: LONG, victory: 1 };
  // 音檔常帶很長的尾巴（蓄力 7 秒、砸地 6.6 秒…），超過上限就淡出截斷；未列出者播完整檔
  const MAXLEN = { mikiriRing: 1.5, horseNeigh: 1.8, horseGallop: 0.6, shieldBreak: 0.8, bladeScrape: 0.8, swordWhoosh: 0.5, maceAir: 0.6, tridentThrow: 0.8, tridentReturn: 1.2, anvilDestroy: 1.2, throwWhoosh: 0.4, heartbeat: 0.6, shadowTeleport: 0.8, fangSnap: 0.8, ambDesert: 8, ambSnow: 8, ambLake: 6, ambForest: 8, ambWheat: 7, ambSwamp: 8, explodeMid: 1.5, explodeBig: 2.2, slamHeavy: 1.5, slamThud: 1, roarMid: 2, roarBig: 2.2, fire: 1.2, ice: 1.2, lightning: 1.5, shockwave: 1.2, teleport: 1.2, buff: 1.2, ultCast: 1.5, poison: 1.2 };
  const ELEM = { fire: 'fire', ice: 'ice', lightning: 'lightning', poison: 'poison' }, ELEM_FX = ['projhit', 'trapburst', 'breath', 'flamethrow', 'dragonbreath'];
  const BUFF = ['summon', 'shadowrise', 'thunderwake', 'ironfist', 'adamas', 'divinesight', 'gfoc', 'gfocroar', 'mangekyo', 'susanoo', 'godofgods', 'sightstance', 'ogreback'], TELE = ['blink', 'boltblink', 'vanish', 'shadowswap', 'appear', 'livingshadow', 'edenblink'];
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
  const lastSkill = new WeakMap();
  const dmMap = new WeakMap();
  const seenRet = new WeakSet();
  const seenHeal = new WeakSet();
  const seenP2 = new WeakSet();
  const seenLock = new WeakSet();
  const seenDeathstand = new WeakSet();
  const seenZeusP2 = new WeakSet();
  const seenEcstasy = new WeakSet();
  const seenYujiroP2 = new WeakSet();
  const seenLearn = new WeakSet();
  const seenItachiP2 = new WeakSet();
  const amMap = new WeakMap();
  function tick(w, dt) {
    const g = MAP_SFX[BD.ARENA.map]; if (!g || w.over) return;
    if (ambW !== w) { ambW = w; ambT = 2 + V() * 3; }
    if ((ambT -= dt) <= 0) { ambT = 5 + V() * 5; play(g[1], 0.22); }
    for (const b of w.bosses) {
      if (b.def && b.def.id === 'watcher') {
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          if (sid === 'pack') {
            play('bell', 0.7);      // 法蘭誓約鐘鳴
            play('buff', 0.5);
          } else if (sid === 'parry') {
            play('draw', 0.5);      // 橫架格擋匕首
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
        }
      }
      else if (b.def && b.def.id === 'thor') {
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          if (sid === 'mjolnir_throw') {
            play('tridentThrow', 0.85); // 妙爾尼爾覺醒投擲破空
            play('maceAir', 0.7);
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
        }
      }
      else if (b.def && b.def.id === 'zed') {
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          if (sid === 'living_shadow') {
            play('throwWhoosh', 0.85);   // 影分身：暗影疾射出手
            play('shadowTeleport', 0.65);
          } else if (sid === 'windmill') {
            play('swordWhoosh', 0.7);     // 風魔手裏劍：蓄力高旋
            play('maceAir', 0.55);
          } else if (sid === 'shadow_triangle') {
            play('shadowTeleport', 0.8);  // 三角殺陣：暗影分化展開
            play('throwWhoosh', 0.8);
          } else if (sid === 'ult') {
            play('ultCast', 0.9);         // 瞬獄影殺陣：禁奧義暗影狂湧起手
            play('shadowTeleport', 0.85);
            play('ambSnow', 0.55);
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
        }
      }
      else if (b.def && b.def.id === 'fiora') {
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          if (sid === 'parry_w') {
            play('draw', 0.65);         // 招架起手：利刃橫架、架式展開
            play('swordWhoosh', 0.45);
          } else if (sid === 'ult') {
            play('ultCast', 0.85);       // 終極挑戰：四方破綻全開、高貴決鬥宣告
            play('bell', 0.7);
            play('draw', 0.6);
          } else if (sid === 'fleche') {
            play('swordWhoosh', 0.75);   // 飛躍突刺：擊劍長衝破空
            play('dash', 0.6);
          } else if (sid === 'crossstep') {
            play('dash', 0.55);          // 交叉步：側身滑步
          } else if (sid === 'vital_chain') {
            play('swordWhoosh', 0.5);    // 破綻連鎖：起手蓄勢
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
        }
        // 追蹤回復領域（大招四個破綻全部擊破時產生）
        if (b._heal) {
          for (const z of b._heal) {
            if (!seenHeal.has(z)) {
              seenHeal.add(z);
              play('buff', 0.9);          // 回復領域展開：神聖和弦湧現
              play('bell', 0.85);
              play('ultCast', 0.7);
            }
          }
        }
      }
      else if (b.def && b.def.id === 'mihawk') {
        // 二階段轉變開始：HP 50% 進入 transition，畫面慢動作、橫幅出現「你的眼神很有趣……」
        if ((b.state === 'transition' || b.phase === 2) && !seenP2.has(b)) {
          seenP2.add(b);
          play('bladeScrape', 0.85); // 伸手扣住背後黑刀「夜」刀柄金屬刮擦
          play('buff', 0.85);        // 見聞色與無上劍豪氣場爆發
          play('shockwave', 0.65);   // 戰場低頻劍壓微震
          setTimeout(() => {
            play('draw', 0.95);      // 黑刀「夜」出鞘清脆鳴響！
            play('swordWhoosh', 0.85);
          }, 450);
        }
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          const isP2 = b.phase === 2;
          if (sid === 'parry') {
            play('draw', isP2 ? 0.7 : 0.6);         // 撥擋架式：橫架小刀 / 黑刀
            play('swordWhoosh', 0.45);
          } else if (sid === 'glare') {
            play('bell', 0.65);                     // 鷹眼鎖定：見聞色凝神清鳴
            play('click', 0.6);                     // 準星鎖定提示
            play('buff', 0.5);
          } else if (sid === 'wave') {
            play('maceAir', 0.85);                  // 飛斬：夜高高舉起蓄勢大破空
            play('swordWhoosh', 0.75);
          } else if (sid === 'fleet') {
            play('bladeScrape', 0.75);              // 一斬沉艦：大範圍橫揮蓄力壓低身形
            play('maceAir', 0.8);
          } else if (sid === 'iai') {
            play('draw', 0.85);                     // 居合・夜：拔刀術壓低身軀扣刀待發
            play('swordWhoosh', 0.5);
          } else if (sid === 'fan') {
            play('swordWhoosh', 0.7);               // 三連月牙：快速揮刀蓄勢
            play('throwWhoosh', 0.6);
          } else if (sid === 'star') {
            play('dash', 0.65);                     // 黑刀・荒星：騰空躍起起步
            play('maceAir', 0.6);
          } else if (sid === 'ult') {
            play('ultCast', 0.95);                  // 世界第一大劍豪：終極蓄力豪氣爆發
            play('draw', 0.85);                     // 夜橫斬起手亮刃
            play('shockwave', 0.7);                 // 劍氣席捲全場
            play('maceAir', 0.75);
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
        }
        // 追蹤「鷹眼鎖定」狀態（對手身上出現金色準星瞬間）
        const e = b.enemy;
        const hl = e && e.statuses && BD.getStatus(e, 'hawklock');
        if (hl && hl.rem > 0 && e.hp > 0 && e.state !== 'dead') {
          if (!seenLock.has(hl)) {
            seenLock.add(hl);
            play('click', 0.7);      // 準星精準咬住
            play('mikiriRing', 0.6); // 金色光環鎖定音
          }
        }
      }
      else if (b.def && b.def.id === 'adam') {
        // 二階段轉變開始：神虛視過載、眼鼻流血，全人類之父的溫柔與決意
        if ((b.state === 'transition' || b.phase === 2) && !seenP2.has(b)) {
          seenP2.add(b);
          play('bell', 0.85);          // 始祖聖鐘長鳴，父之意志
          play('buff', 0.85);          // 神性光環湧現
          play('heartbeat', 0.8);      // 沉重的心跳一振
          setTimeout(() => {
            if (b.hp > 0 && b.state !== 'dead') {
              play('shockwave', 0.85); // 眼睛過載氣場震盪
              play('roarMid', 0.75);   // 意志爆發長嘯
              play('hitHeavy', 0.7);
            }
          }, 1000);
        }
        // 死立不倒（二階段瀕死無敵，死後依然揮拳）
        const ds = b.statuses && BD.getStatus(b, 'deathstand');
        if (ds && ds.rem > 0 && !seenDeathstand.has(b)) {
          seenDeathstand.add(b);
          play('heartbeat', 1.0);      // 絕唱心跳
          play('bell', 0.95);          // 始祖喪鐘清鳴
          play('ultCast', 0.9);        // 意志共振
          play('shockwave', 0.85);     // 震懾全場的無敵氣場
        }
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          const isP2 = b.phase === 2;
          if (sid === 'divine_sight') {
            play('bell', 0.85);         // 神虛視架式：神靈眼紋清鳴
            play('mikiriRing', 0.75);   // 看穿萬物的清脆共振
            play('buff', 0.6);
          } else if (sid === 'time_fist') {
            play('ambSnow', 0.6);       // 超越時間之拳：時間凍結的死寂陰風
            play('heartbeat', 0.75);    // 時間停滯前的一拍沉重微鳴
            play('buff', 0.6);
          } else if (sid === 'meteor_jab') {
            play('throwWhoosh', 0.75);  // 黃昏流星群：殘影極速蓄勢破空
            play('swordWhoosh', 0.65);
          } else if (sid === 'serpent_shred') {
            play('fangSnap', 0.85);     // 蛇神之爪：黑綠骨爪異化伸展
            play('bladeScrape', 0.7);   // 鱗片生長摩擦
            play('poison', 0.6);
          } else if (sid === 'divine_axe') {
            play('maceAir', 0.8);       // 神之斧：下段掃腿撕裂空氣
            play('swordWhoosh', 0.65);
          } else if (sid === 'leaf_rush') {
            play('dash', 0.65);         // 始祖衝拳：直線強襲突進踏步
            play('throwWhoosh', 0.6);
          } else if (sid === 'fatherly_ward') {
            play('bell', 0.8);          // 為了孩子：守護光環低鳴
            play('buff', 0.7);
            play('ultCast', 0.65);
          } else if (sid === 'eden_step') {
            play('teleport', 0.65);     // 伊甸背擊：複製身法移形換影
            play('throwWhoosh', 0.55);
          } else if (sid === 'endurance_clash') {
            play('block', 0.8);         // 我慢比べ：雙拳抱架、對轟開端
            play('buff', 0.7);
            play('heartbeat', 0.65);
          } else if (sid === 'true_right') {
            play('bladeScrape', 0.8);   // 真・神之右：手指虎金屬刮擦蓄力
            play('maceAir', 0.75);
            play('heartbeat', 0.7);
          } else if (sid === 'ult') {
            play('ultCast', 0.95);      // 大招絕唱：神聖力量狂湧
            play('bell', 0.9);
            play('shockwave', 0.75);
            if (isP2) play('heartbeat', 0.85);
          } else if (sid === 'reflect_copy') {
            play('bell', 0.7);          // 神虛視複製招式發動清鳴
            play('buff', 0.55);
          } else if (sid === 'jab_combo') {
            play('throwWhoosh', 0.65);  // 亞光速直拳：極速架式破空
            play('swing', 0.5);
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
        }
      }
      else if (b.def && b.def.id === 'zeus') {
        // 二階段轉變開始：壓縮肌肉成「阿陀磨須」，全身燒成橘紅蒸氣、痛苦慘叫
        if ((b.state === 'transition' || b.phase === 2) && !seenZeusP2.has(b)) {
          seenZeusP2.add(b);
          play('heartbeat', 0.9);      // 肌肉極限壓縮之首跳
          play('bladeScrape', 0.75);   // 骨骼肌肉摩擦劇痛
          play('fire', 0.65);          // 全身燒成橘紅高熱蒸氣
          play('buff', 0.8);
          setTimeout(() => {
            if (b.hp > 0 && b.state !== 'dead') {
              play('roarBig', 1.0);     // 痛苦慘叫與神力狂暴咆哮！
              play('shockwave', 0.95);  // 白煙炸開
              play('explodeBig', 0.85); // 氣場震懾
              play('ambSnow', 0.7);     // 紫黑星海降臨，連神明都會本能發抖
            }
          }, 1600);
        }
        // 鬥神狂喜（被動 battlelust 觸發時）
        const ec = b.statuses && BD.getStatus(b, 'ecstasy');
        if (ec && ec.rem > 0 && b.hp > 0 && b.state !== 'dead') {
          if (!seenEcstasy.has(ec)) {
            seenEcstasy.add(ec);
            play('roarMid', 0.85);     // 戰鬥狂喜長嘯
            play('buff', 0.8);         // 渾身肌肉再膨脹一圈
            play('shockwave', 0.75);
          }
        }
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          const isP2 = b.phase === 2;
          if (sid === 'light_jab') {
            play('throwWhoosh', 0.75);  // 亞光速刺拳：0.01 秒極速破空起手
            play('swordWhoosh', 0.6);
          } else if (sid === 'meteor_jab') {
            play('throwWhoosh', 0.85);  // 黃昏流星拳：漫天殘影極速蓄勢
            play('swordWhoosh', 0.75);
            play('maceAir', 0.6);
          } else if (sid === 'divine_axe') {
            play('bladeScrape', 0.8);   // 神之斧：下段掃踢壓低身形刮擦蓄勢
            play('maceAir', 0.75);
          } else if (sid === 'zeus_footwork') {
            play('dash', 0.75);         // 宙斯步法：神速步法殘影繞圈起步
            play('throwWhoosh', 0.7);
          } else if (sid === 'gavel_decree') {
            play('draw', 0.65);         // 審判之槌：議長高舉小木槌宣判
            play('buff', 0.6);
          } else if (sid === 'gfoc') {
            if (isP2) {
              play('heartbeat', 0.85);  // 阿陀磨須威壓：深沉心跳震懾
              play('ambSnow', 0.7);     // 窒息星海陰風
            } else {
              play('bell', 0.8);        // 全宇宙之父：GFOC 呼聲聖響
              play('buff', 0.75);
            }
          } else if (sid === 'time_fist') {
            play('ambSnow', 0.8);       // 超越時間之拳：時空死寂凍結陰風
            play('heartbeat', 0.85);    // 停滯前的一拍沉重微鳴
            play('buff', 0.65);
          } else if (sid === 'true_right') {
            play('maceAir', 0.9);       // 真・神之右：雙拳扣緊極限神力蓄勢
            play('heartbeat', 0.85);
            play('bladeScrape', 0.7);
          } else if (sid === 'ult') {
            play('ultCast', 1.0);       // 大招起手：眾神之王神威降臨
            play('shockwave', 0.85);
            if (isP2) {
              play('roarBig', 0.9);     // 阿陀磨須無敵狂暴咆哮
              play('heartbeat', 0.95);
            } else {
              play('bell', 0.9);        // 克羅諾斯鐘面逆轉清鳴
              play('ambSnow', 0.8);
            }
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
        }
      }
      else if (b.def && b.def.id === 'yujiro') {
        // 二階段轉變開始：肌肉撐破上衣，背肌浮出惡鬼面孔
        if ((b.state === 'transition' || b.phase === 2) && !seenYujiroP2.has(b)) {
          seenYujiroP2.add(b);
          play('heartbeat', 0.95);      // 惡鬼面孔甦醒，沉重而恐怖的搏動
          play('bladeScrape', 0.85);    // 肌肉急遽膨脹骨骼爆響
          play('buff', 0.8);            // 狂暴氣場升騰
          setTimeout(() => {
            if (b.hp > 0 && b.state !== 'dead') {
              play('shieldBreak', 1.0); // 緊身短袖衫被極限膨脹的背肌生生撐爆炸飛！
              play('anvilDestroy', 0.9);
              play('roarBig', 1.0);     // 食人魔惡鬼咆哮！地上最強生物全力解放！
              play('shockwave', 1.0);   // 赤紅暗幕降臨、雙層震波橫掃整座鬥技場！
              play('explodeBig', 0.95);
              play('slamHeavy', 0.9);
            }
          }, 1600);
        }
        // 一看就會（trait 'learn'）：同一招看過第二次時清脆看破提示
        if (b._learn) {
          for (const k in b._learn) {
            const entry = b._learn[k];
            if (entry && entry.n >= 2 && !seenLearn.has(entry)) {
              seenLearn.add(entry);
              play('click', 0.75);      // 清脆看破：已經看過這招了
              play('mikiriRing', 0.6);
            }
          }
        }
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          const isP2 = b.phase === 2;
          if (sid === 'finger_flick') {
            play('click', 0.75);                     // 彈指：拇指扣緊指甲脆響
            play('throwWhoosh', 0.65);               // 指尖氣旋極速聚集
          } else if (sid === 'axe_kick') {
            play('maceAir', 0.9);                    // 踵落：重戰斧高高揚起破空
            play('swordWhoosh', 0.7);
          } else if (sid === 'backhand') {
            play('dash', 0.65);                      // 裏拳：壓低身形旋身起手
            play('swordWhoosh', 0.6);
          } else if (sid === 'whip_strike') {
            play('bladeScrape', 0.75);               // 鞭打：手臂如軟鞭般鬆弛甩動
            play('swordWhoosh', 0.7);
          } else if (sid === 'roll_kick') {
            play('dash', 0.75);                      // 迴旋踢：疾衝滑步貼身起步
            play('throwWhoosh', 0.65);
          } else if (sid === 'bite') {
            play('roarMid', 0.85);                   // 噛みつき：食人魔低沉嗜血嘶吼
            play('dash', 0.7);
          } else if (sid === 'bear_hug') {
            play('buff', 0.8);                       // 熊抱：雙臂肌肉如鐵箍張開環抱
            play('bladeScrape', 0.7);
          } else if (sid === 'eardrum') {
            play('throwWhoosh', 0.75);               // 鼓膜破壞：雙掌左右合抱蓄勢
            play('dash', 0.55);
          } else if (sid === 'quake_stop') {
            play('heartbeat', 0.85);                 // 止震之拳：大地震動前沉重微鳴
            play('maceAir', 0.85);                   // 右拳高高過頂
            play('buff', 0.75);
          } else if (sid === 'xiaoli') {
            play('buff', 0.7);                       // 消力：郭海皇之消力，身如棉絮放鬆
            play('swordWhoosh', 0.55);
          } else if (sid === 'flex') {
            play('heartbeat', 0.9);                  // 震樓之軀：心臟狂暴鼓動
            play('bladeScrape', 0.85);               // 渾身筋骨爆鳴摩擦
          } else if (sid === 'beast_barrage') {
            play('roarBig', 0.95);                   // 猛獸連擊：鬼背惡鬼猙獰咆哮！
            play('heartbeat', 0.85);
          } else if (sid === 'demon_blow') {
            play('heartbeat', 0.95);                 // 鬼貌一擊：惡魔領域降臨深沉心跳
            play('bladeScrape', 0.85);               // 骨骼極限蓄力摩擦
            play('ambSnow', 0.7);                    // 死寂陰風
            play('buff', 0.8);
          } else if (sid === 'ult') {
            if (isP2) {
              play('roarBig', 1.0);                  // 鬼哭啼：鬼臉扭曲痛哭！惡鬼悲鳴長嘯！
              play('ultCast', 0.95);                 // 全程無敵惡魔領域
              play('heartbeat', 0.95);
            } else {
              play('shadowTeleport', 0.9);           // 地上最強的一擊：身法快到如瞬間移動
              play('heartbeat', 0.85);               // 絕對威壓心跳
              play('buff', 0.8);
            }
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
        }
      }
      else if (b.def && b.def.id === 'itachi') {
        // 二階段轉變開始：HP 50% 進入 transition，脫下斗笠、萬花筒寫輪眼全開
        if ((b.state === 'transition' || b.phase === 2) && !seenItachiP2.has(b)) {
          seenItachiP2.add(b);
          play('heartbeat', 0.95);       // 萬花筒開眼：心跳沉重一震
          play('bell', 0.9);            // 血瞳清鳴
          play('buff', 0.85);           // 暗黑查克拉狂湧
          play('ambSnow', 0.7);         // 血紅暗幕降臨陰風
          setTimeout(() => {
            if (b.hp > 0 && b.state !== 'dead') {
              play('wood', 0.95);       // 斗笠粉碎炸飛！
              play('shockwave', 0.95);  // 雙層震波狂湧！
              play('slamHeavy', 0.9);   // 氣場震碎地面
              play('swordWhoosh', 0.85);// 烏鴉殘影掠過
            }
          }, 1800);
        }
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          const isP2 = b.phase === 2;
          if (sid === 'kunai') {
            play('draw', isP2 ? 0.7 : 0.6);        // 苦無連擊：俐落拔刀架式
            play('swordWhoosh', 0.55);
            if (isP2) play('fire', 0.65);          // 二階段火焰查克拉附著
          } else if (sid === 'shuriken') {
            play('throwWhoosh', 0.8);              // 手裏劍術：苦無與精準手裏劍破空出手
            play('shoot', 0.5);
            if (isP2) play('fire', 0.65);
          } else if (sid === 'fireball') {
            play('click', 0.7);                    // 火遁・豪火球之術：指尖極速結印
            play('draw', 0.65);                    // 胸腔深吸氣
            play('maceAir', 0.7);                  // 空氣回流
            play('fire', 0.8);                     // 高熱火遁蓄勢
          } else if (sid === 'crow_clone') {
            play('shadowTeleport', 0.85);          // 烏鴉分身：替身遁走、群鴉四散
            play('throwWhoosh', 0.8);
            play('wood', 0.55);
          } else if (sid === 'crow_storm') {
            play('ambSnow', 0.8);                  // 烏鴉風暴：漫天群鴉遮天蔽日
            play('throwWhoosh', 0.85);
            play('shockwave', 0.7);
            if (isP2) play('fire', 0.75);          // 二階段黑炎狂風
          } else if (sid === 'flicker') {
            play('teleport', 0.85);                // 瞬身・背後擒拿：極速瞬身
            play('dash', 0.75);
            play('throwWhoosh', 0.6);
          } else if (sid === 'tsukuyomi') {
            play('bell', 0.95);                    // 月讀：眼神交會、精神世界鐘鳴
            play('heartbeat', 0.9);                // 心跳凝固
            play('buff', 0.8);
            play('ambSnow', 0.7);                  // 虛無暗幕
          } else if (sid === 'sharingan') {
            play('draw', 0.75);                    // 寫輪眼・見切：橫架架式
            play('bell', 0.75);                    // 洞悉之眼清鳴
            if (isP2) {
              play('mikiriRing', 0.8);             // 八咫鏡・反映：神盾同心圓共振
              play('buff', 0.7);
            } else {
              play('swordWhoosh', 0.5);
            }
          } else if (sid === 'poke') {
            play('swordWhoosh', 0.65);             // 額頭一戳・下次吧：兩指輕點探出破空
            play('swing', 0.55);
          } else if (sid === 'amaterasu') {
            play('heartbeat', 0.9);                // 天照：右眼流血、焦點黑炎無中生有
            play('fire', 0.85);
            play('click', 0.75);                   // 焦點鎖定
            play('shockwave', 0.65);
          } else if (sid === 'susanoo_form') {
            play('ultCast', 0.95);                 // 須佐能乎・顯現：骨架巨人拔地而起！
            play('slamHeavy', 0.9);
            play('shockwave', 0.85);
            play('buff', 0.8);
          } else if (sid === 'yasaka') {
            play('maceAir', 0.9);                  // 須佐能乎・八尺瓊勾玉：巨臂揮動、勾玉高速自旋蓄勢
            play('buff', 0.8);
            play('tridentThrow', 0.75);
          } else if (sid === 'totsuka') {
            play('bladeScrape', 0.9);              // 須佐能乎・十拳劍：靈劍自酒壺拔出摩擦金屬巨響
            play('maceAir', 0.9);                  // 擎天巨劍高高舉起
            play('shockwave', 0.75);
            play('buff', 0.7);
          } else if (sid === 'ult') {
            play('ultCast', 1.0);                  // 大招：三大萬花筒瞳術全開！
            play('bell', 0.95);
            play('heartbeat', 0.9);
            play('ambSnow', 0.85);
            play('shockwave', 0.8);
            if (isP2) play('slamHeavy', 0.85);
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
        }
        // 追蹤對手身上的「天照」黑炎燃燒狀態：永不熄滅的黑炎嘶嘶炙烤聲
        const e = b.enemy;
        const am = e && e.statuses && BD.getStatus(e, 'amaterasu');
        if (am && am.stacks > 0 && e.hp > 0 && e.state !== 'dead') {
          const nextAm = amMap.get(e) || 0;
          if (w.time >= nextAm) {
            amMap.set(e, w.time + 0.65);
            play('fire', 0.65);
            play('poison', 0.5);
          }
        }
      }
      // 死亡印記（瞬獄影殺陣）心跳倒數音效：隨倒數時間加速跳動
      const dm = b.statuses && b.statuses.find((s) => s.id === 'deathmark');
      if (dm && dm.rem > 0 && b.hp > 0 && b.state !== 'dead') {
        const interval = dm.rem > 1.8 ? 0.65 : dm.rem > 0.8 ? 0.42 : 0.24;
        const nextT = dmMap.get(b) || 0;
        if (w.time >= nextT) {
          dmMap.set(b, w.time + interval);
          play('heartbeat', 0.85);
        }
      } else if (dmMap.has(b)) {
        dmMap.delete(b);
      }
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
    // 迴旋類投射物折返音效（風魔手裏劍）
    if (w.projectiles) {
      for (const p of w.projectiles) {
        if (p.ret && p.back && !seenRet.has(p)) {
          seenRet.add(p);
          if (p.owner && p.owner.def && p.owner.def.id === 'zed') {
            play('tridentReturn', 0.9); // 風魔手裏劍：折返迴旋呼嘯飛回
            play('swordWhoosh', 0.75);
            play('shockwave', 0.5);
          }
        }
      }
    }
  }

  BD.sfx = {
    tick,
    play,
    once(o, group, vol) { if (!seen.has(o)) { seen.add(o); play(group, vol); } }, // 每個物件只響一次（如無法閃避的預警）
    stop() { for (const h of [...live]) { live.delete(h); clearInterval(h.t); h.a.pause(); } voices = 0; }, // 離開戰鬥時立刻停掉所有音效
    proj(kind, a, owner) { // 投射物離手（BD.spawnProj）：只有拋擲 / 射出類有聲音，其餘種類靜音以免太密集
      if (a && a.ret) {
        play('maceAir', 0.9);        // 風魔手裏劍：巨型迴旋武器離手沉重破空
        play('tridentThrow', 0.85);
        play('swordWhoosh', 0.75);
      } else if (kind === 'crow') {
        play('throwWhoosh', 0.65);   // 烏鴉群撲翼掠空
        play('dash', 0.45);
      } else if (kind === 'magatama') {
        play('tridentThrow', 0.9);   // 八尺瓊勾玉：巨型神玉破空投擲呼嘯
        play('maceAir', 0.85);
        play('shockwave', 0.75);
      } else if (kind === 'kunai' || kind === 'shuriken' || kind === 'arrow') {
        const isItachi = !!(owner && owner.def && owner.def.id === 'itachi');
        const isItachiP2 = isItachi && owner.phase === 2;
        play('throwWhoosh', 0.65);   // 諸刃手裏劍 / 苦無投擲破空
        play('shoot', 0.4);
        if (isItachiP2) play('fire', 0.55); // 二階段火遁包覆苦無／手裏劍
      } else if (kind === 'airslash') {
        const isMihawk = !!(owner && owner.def && owner.def.id === 'mihawk');
        if (isMihawk) {
          const sid = owner.inst && owner.inst.skill && owner.inst.skill.id;
          const isP2 = owner.phase === 2;
          if (sid === 'wave') {
            play('shockwave', 0.85);    // 飛斬：巨大的貫穿月牙斬破空裂地
            play('tridentThrow', 0.85);
            play('swordWhoosh', 0.8);
            play('maceAir', 0.75);
          } else if (sid === 'fleet') {
            play('shockwave', 0.8);     // 一斬沉艦：沉重劍氣飛向遠方
            play('maceAir', 0.8);
            play('swordWhoosh', 0.75);
          } else if (sid === 'fan') {
            play('swordWhoosh', 0.75);  // 三連月牙：扇形飛斬群與中央大斬
            play('throwWhoosh', 0.7);
            if (a.r >= 85) play('shockwave', 0.65); // 中央大斬追加音爆
          } else if (sid === 'star') {
            play('throwWhoosh', 0.7);   // 荒星：放射狀星芒月牙斬
            play('swordWhoosh', 0.6);
          } else if (sid === 'ult') {
            play('swordWhoosh', 0.8);   // 世界第一大劍豪：扇形月牙斬群
            play('shockwave', 0.7);
            play('maceAir', 0.65);
          } else if (sid === 'flick') {
            play('throwWhoosh', 0.75);  // 指尖斬：刀尖隔空彈出，快準銳利
            play('swordWhoosh', 0.6);
            play('shoot', 0.4);
          } else if (sid === 'backstep') {
            play('throwWhoosh', 0.7);   // 從容後撤：後退時順手送出一道飛斬
            play('swordWhoosh', 0.6);
          } else {
            play(isP2 ? 'swordWhoosh' : 'swing', 0.5);
          }
        } else {
          play('swing', 0.35);
        }
      }
    },
    fx(id, category, o) {
      const wDef = o.src && (o.src.def || (o.src.owner && o.src.owner.def));
      const isWatcher = !!(wDef && wDef.id === 'watcher');
      const isThor = !!(wDef && wDef.id === 'thor');
      const isZed = !!(wDef && wDef.id === 'zed');
      const isFiora = !!(wDef && wDef.id === 'fiora');
      const isMihawk = !!(wDef && wDef.id === 'mihawk');
      const isAdam = !!(wDef && wDef.id === 'adam');
      const isZeus = !!(wDef && wDef.id === 'zeus');
      const isYujiro = !!(wDef && wDef.id === 'yujiro');
      const isItachi = !!(wDef && wDef.id === 'itachi');
      const wSid = o.src && o.src.inst && o.src.inst.skill && o.src.inst.skill.id;
      const isP2 = !!(o.src && (o.src.phase === 2 || (o.src.owner && o.src.owner.phase === 2)));
      const e = o.src && o.src.def && o.src.def.echoColor;
      if (e && o.color === e && (id === 'slash' || id === 'cross')) { play('swing', 0.25, 0.7); return; } // 影分身追斬：較輕、較低沉的虛影揮刀
      if (id === 'clash') { // 放在各角色專屬區塊之前，否則施放者是亞當 / 菲歐拉等時會被攔走而靜音
        const isFist = (o.src && o.src.def && o.src.def.clash && o.src.def.clash.style === 'fist') ||
                       (o.other && o.other.def && o.other.def.clash && o.other.def.clash.style === 'fist');
        if (isFist) {
          play(o.last ? 'slamHeavy' : 'hitHeavy', o.last ? 0.9 : 0.65);
          play(o.last ? 'shockwave' : 'slamThud', o.last ? 0.8 : 0.5);
        } else {
          play(o.last ? 'mikiriClang' : 'block', o.last ? 0.8 : 0.55);
        }
        return;
      }
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
      else if (id === 'threadcut' && !isAdam) { if (o.scale >= 1.5) play('shockwave', 0.8); } // 只有最後的十字斬響，中間的刀線靜音
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
      else if (o.src && o.src.inst && o.src.inst.skill && o.src.inst.skill.id === 'shoulder_tackle') {
        play('hitHeavy', 0.8); // 崩架肩撞：沉重鐵甲鈍擊撞擊聲
        play('dash', 0.5);
      }
      else if (o.src && o.src.inst && o.src.inst.skill && o.src.inst.skill.id === 'gundyr_kick') {
        play('slamThud', 0.85); // 審判鐵腿：重裝鐵靴破空悶擊
        play('swing', 0.5);
      }
      // 深淵監視者專屬音效
      else if (isWatcher) {
        // 延遲火焰爆鳴（二階段揮劍遲一拍在地面燃起烈焰）
        if (o.zone && o.zone.delay && (o.el === 'fire' || isP2)) {
          setTimeout(() => { play('fire', 0.5); play('explodeMid', 0.4); }, o.zone.delay * 1000);
        }
        if (id === 'parry') {
          play('mikiriClang', 0.9); // 匕首彈反金屬清脆巨響
          play('mikiriRing', 0.7);  // 鐘鳴共振
          play('block', 0.5);
        }
        else if (wSid === 'riposte' && (id === 'slash' || id === 'cross')) {
          play('slashHeavy', 0.9);  // 彈反處決致命一擊
          play('hitHeavy', 0.85);
          play('hitFlesh', 0.85);
        }
        else if (id === 'leap') {
          play('dash', 0.6);        // 躍空重劈起跳破空
          play('swordWhoosh', 0.5);
        }
        else if (id === 'ultcast') {
          play('ultCast', 0.8);     // 不死隊大招誓約之禮
          play('bell', 0.75);       // 法蘭鐘鳴
        }
        else if (id === 'burst' && o.el === 'blood') {
          play('death', 0.8);       // 換二階段同伴消散、狼血匯於一身
          play('slamThud', 0.6);
        }
        else if (id === 'awaken') {
          play('fire', 0.9);        // 薪王之火燃盡深淵！
          play('explodeBig', 0.85);
          play('shockwave', 0.65);
        }
        else if (id === 'vanish') {
          if (o.el === 'blood') {
            play('roarMid', 0.85);  // 紅眼監視者現身：被深淵侵蝕的恐怖咆哮
            play('bell', 0.8);      // 喪鐘低鳴
            play('death', 0.55);
          } else if (o.el === 'shadow') {
            play('teleport', 0.55); // 暗影同伴監視者現身
            play('draw', 0.45);
          }
        }
        else if (wSid === 'plunge') {
          if (id === 'bigslam') {
            play('slamHeavy', 0.95);  // 躍空重劈落地千鈞重砸
            play('slamThud', 0.85);
            play('shockwave', 0.55);
            if (isP2 || o.el === 'fire') { play('explodeMid', 0.75); play('fire', 0.7); }
          } else if (id === 'pillarring') {
            play('explodeBig', 0.75); // 二階段落地延遲火柱環
            play('shockwave', 0.65);
            play('fire', 0.65);
          }
        }
        else if (wSid === 'rise') {
          if (id === 'cleave') {
            play('bladeScrape', 0.8); // 上撩大劍狠狠刮擦地面石板揚塵
            play('slashHeavy', 0.65);
            play('stepSand', 0.5);
            if (isP2 || o.el === 'fire') play('fire', 0.65);
          } else if (id === 'pillarring') {
            play('slamThud', 0.75);   // 二階段插地火環
            play('explodeMid', 0.7);
            play('fire', 0.65);
          }
        }
        else if (wSid === 'dashslash') {
          if (id === 'dash') {
            play('dash', 0.5);
            play('bladeScrape', 0.65); // 壓低身形貼地滑行
            if (isP2 || o.el === 'fire') play('fire', 0.5);
          } else if (id === 'slashline') {
            play('swordWhoosh', 0.6);
            if (isP2 || o.el === 'fire') play('fire', 0.55);
          } else if (id === 'whirl') {
            play('slashHeavy', 0.85);  // 360 度迴旋大橫斬
            play('shockwave', 0.45);
            if (isP2 || o.el === 'fire') { play('explodeMid', 0.75); play('fire', 0.7); }
          }
        }
        else if (wSid === 'emberswipe') {
          if (id === 'dash') {
            play('dash', 0.5);
            play('bladeScrape', 0.65); // 薪火長斬貼地滑步
            play('fire', 0.45);
          } else if (id === 'slashline') {
            play('swordWhoosh', 0.6);
            play('fire', 0.5);
          } else if (id === 'pillarring') {
            play('slashHeavy', 0.85);  // 反手回馬大橫斬掃出滔天火海
            play('explodeMid', 0.8);
            play('fire', 0.75);
          }
        }
        else if (wSid === 'lunge') {
          if (id === 'dash') {
            play('dash', 0.5);
            if (isP2 || o.el === 'fire') play('fire', 0.45);
          } else if (id === 'slashline') {
            play('swordWhoosh', 0.7);  // 突進長刺破空
            play('slashHeavy', 0.6);
            if (isP2 || o.el === 'fire') play('fire', 0.55);
          }
        }
        else if (wSid === 'backflip' && id === 'dash') {
          play('dash', 0.5);          // 後空翻後躍靈動風聲
          play('swordWhoosh', 0.4);
        }
        else if (wSid === 'combo') {
          if (id === 'slash') {
            play('swordWhoosh', 0.55); // 快速交替橫斬
            play('slash', 0.5);
            if (isP2 || o.el === 'fire') play('fire', 0.5);
          } else if (id === 'thrust') {
            play('slashHeavy', 0.7);   // 停頓後前壓重刺
            play('swordWhoosh', 0.6);
            if (isP2 || o.el === 'fire') play('fire', 0.6);
          }
        }
        else if (wSid === 'ult') {
          if (id === 'dash') {
            play('dash', 0.35);
            play('bladeScrape', 0.35); // 連環劍舞高速貼地踏步
            if (isP2 || o.el === 'fire') play('fire', 0.4);
          } else if (id === 'slash') {
            play('swordWhoosh', 0.55);
            play('slash', 0.45);
            if (isP2 || o.el === 'fire') play('fire', 0.5);
          } else if (id === 'thrust') {
            play('slashHeavy', 0.65);  // 三擊一刺的貫通音
            play('swordWhoosh', 0.6);
            if (isP2 || o.el === 'fire') play('fire', 0.55);
          } else if (id === 'bigslam') {
            play('slamHeavy', 1.0);    // 劍舞終結落地狂暴重劈
            play('slamThud', 0.9);
            play('shockwave', 0.7);
            if (isP2 || o.el === 'fire') { play('explodeBig', 0.85); play('fire', 0.8); }
          } else if (id === 'pillarring') {
            play('shockwave', 0.85);   // 二階段薪王焚天終結火環
            play('explodeMid', 0.75);
            play('fire', 0.7);
          }
        }
      }
      // 索爾專屬音效
      else if (isThor) {
        if (id === 'thunderwake') {
          play('buff', 0.65);          // 覺醒聚能：暗幕與電弧匯聚
          play('lightning', 0.5);
          setTimeout(() => {
            play('anvilDestroy', 0.95);// 鐵手套雅恩格利佩爾碎裂粉碎
            play('shieldBreak', 0.85);
            play('lightning', 1.0);    // 蒼雷貫頂神力覺醒
            play('explodeBig', 0.95);
            play('shockwave', 0.9);
            play('slamHeavy', 0.85);
            play('roarMid', 0.75);
          }, (o.life || 1.0) * 1000);
        }
        else if (wSid === 'hammer_sweep') {
          play('maceAir', 0.85);       // 妙爾尼爾巨槌橫掃撕裂空氣
          play('slashHeavy', 0.85);
          if (isP2 || o.el === 'lightning') {
            play('lightning', 0.7);    // 二階段雷電雙掃帶雷
          } else {
            play('slamHeavy', 0.45);   // 一階段沉重鈍擊破空
          }
        }
        else if (wSid === 'hammer_slam') {
          if (id === 'slam') {
            play('slamHeavy', 0.95);   // 巨槌砸地
            play('slamThud', 0.9);
            play('shockwave', 0.6);
            if (isP2 || o.el === 'lightning') play('lightning', 0.75);
          } else if (id === 'nova') {
            play('shockwave', 0.8);    // 二階段雷爆環擴散
            play('lightning', 0.8);
            play('explodeMid', 0.65);
          }
        }
        else if (wSid === 'jarngreipr_guard') {
          if (id === 'ironfist') {
            play('mikiriClang', 0.95); // 鐵手套雅恩格利佩爾硬接神器
            play('block', 0.85);
            play('slamThud', 0.85);
            setTimeout(() => {
              play('slamHeavy', 0.9);  // 鐵手套・反槌重擊砸落
              play('hitHeavy', 0.85);
            }, (o.delay || 0.25) * 1000);
          } else if (id === 'slam') {
            play('slamHeavy', 0.85);   // 追擊砸地
            play('slamThud', 0.8);
          }
        }
        else if (wSid === 'giant_felling') {
          if (id === 'cleave') {
            play('maceAir', 1.0);      // 屠巨一振：毀滅大橫揮
            play('slashHeavy', 0.95);
            play('shockwave', 0.85);
            if (isP2 || o.el === 'lightning') play('lightning', 0.85);
            else play('slamHeavy', 0.7);
          } else if (id === 'ring') {
            play('shockwave', 0.85);   // 吹飛沙土／雷霆衝擊環
            if (isP2 || o.el === 'lightning') {
              play('lightning', 0.8);
              play('explodeMid', 0.65);
            } else {
              play('stepSand', 0.7);
              play('slamThud', 0.65);
            }
          }
        }
        else if (wSid === 'divine_pressure') {
          if (id === 'pressure') {
            play('buff', 0.65);        // 雷神威壓：神威低鳴
            play('ambSnow', 0.55);     // 窒息陰風
            setTimeout(() => {
              play('shockwave', 0.85); // 光環收攏後的地面震動
              play('slamThud', 0.75);
              if (isP2 || o.el === 'lightning') play('lightning', 0.75);
            }, 320);
          }
        }
        else if (wSid === 'hammer_chain') {
          if (id === 'slash') {
            play('maceAir', 0.8);      // 前兩記重掃
            play('slashHeavy', 0.75);
            if (isP2 || o.el === 'lightning') play('lightning', 0.6);
          } else if (id === 'slam') {
            play('slamHeavy', 0.95);   // 故意延遲的過頂下砸
            play('slamThud', 0.9);
            play('shockwave', 0.7);
          } else if (id === 'bigslam') {
            play('slamHeavy', 1.0);    // 二階段延遲雷爆大砸地
            play('slamThud', 0.95);
            play('lightning', 0.85);
            play('explodeMid', 0.75);
            play('shockwave', 0.75);
          }
        }
        else if (wSid === 'mjolnir_throw') {
          if (id === 'thunderpath') {
            if ((o.scale || 1) >= 1.2) {
              play('tridentReturn', 1.0); // 妙爾尼爾迴旋折返
              play('lightning', 0.9);
              play('shockwave', 0.85);
              play('explodeMid', 0.7);
            } else {
              play('lightning', 0.85);   // 妙爾尼爾去程直線雷霆
              play('shockwave', 0.8);
              play('swordWhoosh', 0.75);
            }
          }
        }
        else if (wSid === 'thunder_step') {
          if (id === 'boltblink') {
            play('lightning', 0.85);   // 雷光瞬身：化作閃電
            play('teleport', 0.65);
            play('dash', 0.55);
          } else if (id === 'slam') {
            play('slamHeavy', 0.9);    // 閃到背後的驚雷重砸
            play('slamThud', 0.85);
            play('lightning', 0.75);
          }
        }
        else if (wSid === 'thunder_rampage') {
          if (id === 'thunderstrike') {
            play('lightning', 0.85);   // 連鎖天降落雷
            play('slamHeavy', 0.65);
            play('shockwave', 0.55);
          }
        }
        else if (wSid === 'ult') {
          if (id === 'ultcast') {
            play('ultCast', 0.9);      // 大招蓄力
            play('lightning', 0.85);
            if (isP2) play('roarMid', 0.7);
            else play('buff', 0.6);
          } else if (id === 'thunderpath') {
            if ((o.scale || 1) >= 1.2) {
              play('tridentReturn', 1.0);// 蓋爾羅德：回程無法閃避迴旋
              play('lightning', 0.95);
              play('shockwave', 0.9);
              play('explodeMid', 0.8);
            } else {
              play('tridentThrow', 0.95);// 蓋爾羅德：全力擲出
              play('lightning', 0.9);
              play('shockwave', 0.85);
              play('slashHeavy', 0.8);
            }
          } else if (id === 'leap') {
            play('dash', 0.8);         // 接槌騰空躍起
            play('shockwave', 0.75);
            play('maceAir', 0.75);
          } else if (id === 'bigslam') {
            play('slamHeavy', 1.0);    // 鬥神之雷槌／蓋爾羅德絕頂躍砸
            play('slamThud', 1.0);
            play('explodeBig', 1.0);
            play('shockwave', 1.0);
            play('lightning', 1.0);
          } else if (id === 'ring') {
            play('shockwave', 0.85);   // 一階段鬥神之雷槌震波環
            play('stepSand', 0.75);
          } else if (id === 'thunderstrike') {
            play('lightning', 1.0);    // 二階段蓋爾羅德終結雷擊環
            play('explodeBig', 0.9);
            play('shockwave', 0.9);
          }
        }
      }
      // 劫（影流之主）專屬音效
      else if (isZed) {
        if (id === 'livingshadow') {
          play('shadowTeleport', 0.85);  // 影奧義！分身：影子疾射衝出
          play('throwWhoosh', 0.8);
          play('dash', 0.5);
          if (wSid === 'shadow_triangle') play('ambSnow', 0.45);
        }
        else if (id === 'shadowswap') {
          if (wSid === 'shadow_dance') {
            play('shadowTeleport', 0.85); // 千影亂舞：連續鬼魅殘影穿梭
            play('throwWhoosh', 0.65);
            play('swordWhoosh', 0.5);
          } else if (wSid === 'shadow_flicker') {
            play('shadowTeleport', 0.9);  // 反應式換影：極速移形換位
            play('dash', 0.65);
          } else {
            play('shadowTeleport', 0.85); // 換影突襲 / 影遁 / 換位
            play('dash', 0.5);
            play('bladeScrape', 0.4);
          }
        }
        else if (id === 'contempt') {
          play('fangSnap', 1.0);          // 影忍法・滅魂劫：血牙入骨、斬殺被動咬碎
          play('slashHeavy', 0.95);       // 致命撕裂
          play('hitHeavy', 0.9);
          play('hitFlesh', 0.9);
        }
        else if (id === 'deathmark') {
          play('fangSnap', 1.0);          // 禁奧義！瞬獄影殺陣：死亡印記終結引爆
          play('slashHeavy', 1.0);        // 三道血紅斬痕同時爆裂貫穿
          play('shockwave', 1.0);         // 致命暗影音爆
          play('slamHeavy', 0.9);
          play('hitHeavy', 0.95);
          play('death', 0.8);             // 死神收割喪鐘迴響
        }
        else if (id === 'shadowrise') {
          play('shadowTeleport', 1.0);    // 影之匣完全解放：暗影狂潮炸裂
          play('shockwave', 0.9);
          play('sheath', 0.8);            // 雙臂腕刃歸位微鳴
          play('buff', 0.8);              // 禁忌力量灌注
        }
        else if (id === 'vanish') {
          play('shadowTeleport', 0.9);    // 瞬獄影殺陣：化身暗影疾掠突進
          play('ambSnow', 0.7);           // 死亡陰風
          play('dash', 0.6);
        }
        else if (id === 'appear') {
          play('shadowTeleport', 0.9);    // 瞬獄影殺陣：目標背後突現
          play('draw', 0.8);              // 腕刃亮刃現形
          play('heartbeat', 0.9);         // 刻下死亡印記第一聲心跳
        }
        else if (id === 'whirl') {
          if (wSid === 'shadow_dance') {
            play('slashHeavy', 1.0);      // 千影亂舞終結：狂暴正面大迴旋
            play('shockwave', 0.9);
            play('swordWhoosh', 0.85);
            play('slamHeavy', 0.75);
          } else if (wSid === 'shadow_triangle') {
            play('slashHeavy', 0.95);     // 三角殺陣：換位後三位一體大鬼斬
            play('shockwave', 0.85);
            play('swordWhoosh', 0.8);
          } else {
            play('slashHeavy', 0.85);     // 影奧義！鬼斬：360° 雙臂腕刃迴旋斬
            play('swordWhoosh', 0.8);     // 高速金屬撕裂破空
            play('shockwave', 0.55);      // 暗影刃風震盪
          }
        }
        else if (id === 'slash') {
          if (wSid === 'shadow_dance') {
            play('slash', 0.7);           // 千影亂舞：方位快斬
            play('swordWhoosh', 0.65);
          } else if (wSid === 'shadow_swap') {
            play('slashHeavy', 0.9);      // 換影突襲：換位出刀
            play('swordWhoosh', 0.75);
          } else if (wSid === 'ult') {
            play('slashHeavy', 0.9);      // 瞬獄影殺陣：身後處決腕刃
            play('swordWhoosh', 0.8);
          } else if (wSid === 'blade_flurry') {
            const d = o.dmg || 0;
            if (d >= 55) {
              play('slashHeavy', 0.85);   // 腕刃連擊：終結重斬
              play('swordWhoosh', 0.75);
            } else {
              play('swordWhoosh', 0.7);   // 腕刃連擊：左右交替快刺
              play('slash', 0.65);
            }
          } else {
            play('swordWhoosh', 0.65);
            play('slash', 0.6);
          }
        }
      }
      // 菲歐拉（無雙劍姬）專屬音效
      else if (isFiora) {
        if (id === 'parry') {
          play('mikiriClang', 0.95);  // 勞倫特心眼刀：完美招架彈刀巨響
          play('mikiriRing', 0.85);   // 金屬共振清鳴
          play('block', 0.7);
        }
        else if (wSid === 'riposte') {
          if (id === 'slash' || id === 'cross' || id === 'thrust') {
            play('slashHeavy', 0.95); // 招架・反刺致命穿透
            play('crit', 0.9);        // 暴擊撕裂
            play('stun', 0.85);       // 震暈鐘鳴
            play('hitHeavy', 0.8);
          }
        }
        else if (id === 'projhit' && o.el === 'holy') {
          play('crit', 0.9);          // 決鬥之舞：破綻擊破清脆暴擊
          play('mikiriRing', 0.75);   // 破綻碎裂清脆鳴響
          play('bladeScrape', 0.6);   // 刺入貫穿感
        }
        else if (id === 'blink') {
          if (wSid === 'ult') {
            play('swordWhoosh', 0.65); // 終極挑戰：四方極速移形換位
            play('dash', 0.55);
          } else if (wSid === 'vital_chain') {
            play('swordWhoosh', 0.55); // 破綻連鎖：連環瞬步
            play('dash', 0.5);
          } else {
            play('dash', 0.45);        // 瞬步破綻方位
            play('swordWhoosh', 0.4);
          }
        }
        else if (id === 'dash') {
          if (wSid === 'fleche') {
            play('dash', 0.7);         // 飛躍突刺：大步衝刺／後撤後躍
            play('swordWhoosh', 0.65);
          } else if (wSid === 'crossstep') {
            play('dash', 0.55);        // 交叉步：側身滑步
          } else if (wSid === 'lunge') {
            play('dash', 0.6);         // 移形之體：第一段突刺衝刺
            play('swordWhoosh', 0.55);
          } else {
            play('dash', 0.5);
          }
        }
        else if (id === 'thrust') {
          if (wSid === 'ult') {
            play('slashHeavy', 0.9);   // 終極挑戰：四方決鬥穿刺
            play('swordWhoosh', 0.85);
            play('crit', 0.85);
            if (isP2) play('shockwave', 0.45);
          } else if (wSid === 'bladework') {
            if (o.vital) {
              play('slashHeavy', 0.85); // 劍術：暴擊重刺
              play('swordWhoosh', 0.8);
              play('crit', 0.8);
            } else {
              play('swordWhoosh', 0.7);  // 劍術：首擊緩速刺
              play('slash', 0.65);
            }
          } else if (wSid === 'flurry') {
            if (o.vital) {
              play('slashHeavy', 0.75); // 連刺：收尾破綻刺
              play('swordWhoosh', 0.75);
              play('crit', 0.7);
            } else {
              play('swordWhoosh', 0.6);  // 連刺：前兩記快刺
              play('slash', 0.55);
            }
          } else if (wSid === 'fleche') {
            play('slashHeavy', 0.9);   // 飛躍突刺：長距離貫通重刺
            play('swordWhoosh', 0.85);
            play('shockwave', 0.5);
          } else if (wSid === 'crossstep') {
            play('slashHeavy', 0.8);   // 交叉步：破綻追刺
            play('swordWhoosh', 0.75);
            if (o.vital) play('crit', 0.75);
          } else if (wSid === 'vital_chain') {
            play('slashHeavy', 0.85);  // 破綻連鎖：連續破綻突刺
            play('swordWhoosh', 0.8);
            play('crit', 0.8);
          } else if (wSid === 'lunge') {
            if (o.vital) {
              play('slashHeavy', 0.8);  // 移形之體：破綻方位突刺
              play('swordWhoosh', 0.75);
              play('crit', 0.75);
            } else {
              play('swordWhoosh', 0.7); // 移形之體：第一段突刺
              play('slash', 0.65);
            }
          } else if (wSid === 'parry_w') {
            play('slashHeavy', 0.8);   // 招架：未被攻擊時的刺出
            play('swordWhoosh', 0.75);
          } else {
            play('swordWhoosh', 0.65);
            play('slash', 0.6);
          }
        }
        else if (id === 'slash') {
          play('swordWhoosh', 0.7);
          play('slash', 0.65);
        }
        else if (id === 'awaken') {
          play('draw', 0.9);           // 決鬥，才剛開始：拔劍出鞘鳴響
          play('swordWhoosh', 0.8);
          play('buff', 0.8);
          play('mikiriRing', 0.75);
        }
        else if (id === 'stance') {
          play('draw', 0.6);           // 招架架式
          play('swordWhoosh', 0.45);
        }
      }
      // 鷹眼米霍克（世界第一大劍豪）專屬音效
      else if (isMihawk) {
        if (id === 'awaken') {
          play('shockwave', 0.95);    // 二階段轉變完成：黑刀「夜」完全解放出鞘，劍壓狂湧！
          play('slashHeavy', 0.95);   // 凌厲揮刃撕裂氣流
          play('swordWhoosh', 0.85);
          play('mikiriRing', 0.8);    // 名刀金屬清脆共振
          play('buff', 0.75);
        }
        else if (id === 'parry') {
          play('mikiriClang', 0.95);  // 撥擋：刀尖撥開攻擊，清脆見切彈刀
          play('mikiriRing', 0.85);   // 金屬共鳴清鳴
          play('block', 0.7);
          if (isP2) {
            play('slashHeavy', 0.95); // 撥擋・反斬：黑刀反手一刀兩斷
            play('shockwave', 0.7);
            play('swordWhoosh', 0.8);
          } else {
            play('crit', 0.9);        // 撥擋・反刺：小刀精準貫胸
            play('slashHeavy', 0.8);
            play('swordWhoosh', 0.7);
          }
        }
        else if (wSid === 'knife') {
          if (id === 'thrust') {
            // 一階段小刀連刺
            const d = o.dmg || 0;
            if (d >= 45) {
              play('slashHeavy', 0.75); // 第三段貫通重刺
              play('swordWhoosh', 0.7);
              play('crit', 0.65);
            } else {
              play('swordWhoosh', 0.55); // 前兩記快速刺擊
              play('slash', 0.5);
              play('crit', 0.45);
            }
          } else if (id === 'slash') {
            // 二階段黑刀兩段橫斬
            const d = o.dmg || 0;
            if (d >= 70) {
              play('slashHeavy', 0.95); // 第二段豪邁重橫斬
              play('swordWhoosh', 0.85);
              play('shockwave', 0.6);
              play('maceAir', 0.7);
            } else {
              play('slashHeavy', 0.85); // 第一段夜橫斬
              play('swordWhoosh', 0.8);
              play('maceAir', 0.6);
            }
          }
        }
        else if (wSid === 'pierce') {
          if (id === 'dash' || id === 'slashline') {
            play('dash', 0.65);
            play('swordWhoosh', 0.6);
          } else if (id === 'thrust') {
            if (isP2) {
              play('slashHeavy', 0.95); // 二階段黑刀貫胸重刺
              play('crit', 0.9);
              play('shockwave', 0.65);
              play('maceAir', 0.7);
            } else {
              play('slashHeavy', 0.85); // 一階段小刀貫穿胸口的一刺
              play('crit', 0.9);
              play('swordWhoosh', 0.75);
            }
          }
        }
        else if (wSid === 'glare') {
          if (id === 'cross') {
            play('shockwave', 0.85);   // 二階段十字裂空大斬
            play('slashHeavy', 0.9);
            play('swordWhoosh', 0.85);
            play('mikiriRing', 0.75);
          } else if (id === 'thrust') {
            play('slashHeavy', 0.85);  // 一階段遠距離精準穿刺
            play('swordWhoosh', 0.8);
            play('crit', 0.8);
            play('mikiriRing', 0.65);
          }
        }
        else if (wSid === 'backstep') {
          if (id === 'dash') {
            play('dash', 0.55);        // 從容後撤滑步
            play('swordWhoosh', 0.45);
          }
        }
        else if (wSid === 'fleet') {
          if (id === 'cleave') {
            play('shockwave', 1.0);    // 一斬沉艦：斬斷艦隊大橫揮，毀天滅地音爆！
            play('slashHeavy', 1.0);
            play('maceAir', 0.95);
            play('slamHeavy', 0.8);
          }
        }
        else if (wSid === 'iai') {
          if (id === 'slashline' || id === 'dash') {
            play('draw', 0.95);        // 居合・夜：拔刀出鞘一閃清鳴
            play('bladeScrape', 0.75);
            play('dash', 0.75);
          } else if (id === 'cross') {
            play('slashHeavy', 0.95);  // 居合出鞘貫穿致命一斬
            play('shockwave', 0.85);
            play('crit', 0.85);
          } else if (id === 'slash') {
            play('slashHeavy', 0.85);  // 反手大弧斬
            play('swordWhoosh', 0.8);
            play('maceAir', 0.65);
          }
        }
        else if (wSid === 'star') {
          if (id === 'leap') {
            play('dash', 0.75);        // 黑刀・荒星：躍起昇空
            play('swordWhoosh', 0.7);
            play('maceAir', 0.65);
          } else if (id === 'bigslam') {
            play('slamHeavy', 1.0);    // 荒星天降落地重砸崩碎大地
            play('slamThud', 0.95);
            play('shockwave', 0.9);
            play('explodeMid', 0.75);
          } else if (id === 'slashline' || id === 'dash') {
            play('dash', 0.65);
            play('swordWhoosh', 0.7);
          } else if (id === 'thrust') {
            play('slashHeavy', 0.9);   // 終結貫穿突斬
            play('crit', 0.85);
            play('shockwave', 0.65);
          }
        }
        else if (wSid === 'ult') {
          if (id === 'slashline' || id === 'dash') {
            play('dash', 0.8);
            play('swordWhoosh', 0.85);
          } else if (id === 'cross') {
            play('shockwave', 1.0);    // 世界第一大劍豪：橫貫全場巨斬／身後貫穿終結
            play('slashHeavy', 1.0);
            play('maceAir', 0.95);
            play('slamHeavy', 0.85);
            play('explodeBig', 0.75);
          }
        }
      }
      // 亞當（人類始祖・神虛視）專屬音效
      else if (isAdam) {
        if (id === 'divinesight' || id === 'sightstance') {
          play('bell', 0.95);           // 神虛視發動：神之眼紋展開清脆聖鐘
          play('mikiriRing', 0.85);     // 神靈清鳴共振
          play('shockwave', 0.75);      // 視覺慢動作氣場震盪
          play('buff', 0.6);
        }
        else if (id === 'timestop') {
          play('ambSnow', 0.65);        // 時間停止蓄力：鐘面逆轉死寂
          play('heartbeat', 0.8);       // 凍結前的心跳
          play('buff', 0.65);
        }
        else if (id === 'chronofist' || id === 'timefist') {
          play('shockwave', 1.0);       // 超越時間之拳／時鐘之拳：超越光速的致命裂空音爆！
          play('slamHeavy', 0.95);      // 碎裂時空的沉重悶擊
          play('slamThud', 0.85);
          play('crit', 0.9);            // 貫穿胸口暴擊
          play('ultCast', 0.85);        // 凍結解除時光爆鳴
          if (o.scale && o.scale > 1.2) {
            play('explodeBig', 0.8);    // 大招版本追加時空破裂
          }
        }
        else if (id === 'fistjab') {
          const sc = o.scale || 1.0;
          if (sc >= 1.2) {
            play('slashHeavy', 0.85);   // 音爆直拳・重拳：音障破空
            play('crit', 0.85);
            play('shockwave', 0.6);
          } else {
            play('swordWhoosh', 0.6);   // 刺拳／普攻音爆高速破空
            play('slash', 0.55);
          }
        }
        else if (id === 'meteorfist') {
          const sc = o.scale || 1.0;
          if (sc >= 1.4) {
            play('slashHeavy', 0.9);    // 流星拳收尾重彗星
            play('shockwave', 0.85);
            play('slamThud', 0.8);
          } else {
            play('hitMid', 0.55);       // 流星拳連打高頻暴擊
            play('crit', 0.5);
            play('swordWhoosh', 0.45);
          }
        }
        else if (id === 'replicaaxe') {
          play('slashHeavy', 1.0);      // 複製神斧：如巨斧般切開對手的極速掃踢
          play('maceAir', 0.9);         // 沉重破空
          play('shockwave', 0.85);      // 裂地音爆
          play('bladeScrape', 0.7);
          if (isP2 || o.el === 'blood') {
            play('slamThud', 0.8);      // 二階段血斧重擊
          }
        }
        else if (id === 'serpentclaw') {
          const sc = o.scale || 1.0;
          if (sc >= 1.3) {
            play('fangSnap', 1.0);      // 蛇爪裂：最終碎裂大撕咬！
            play('slashHeavy', 0.95);   // 巨爪一齊裂開
            play('shockwave', 0.85);
            play('poison', 0.7);
          } else {
            play('fangSnap', 0.75);     // 墨綠爪痕撕裂
            play('slash', 0.65);
            play('poison', 0.5);
          }
        }
        else if (id === 'wardnova') {
          play('shockwave', 0.85);      // 庇護圓頂：金色光暈震開全場
          play('bell', 0.8);
          play('slamThud', 0.75);
          play('buff', 0.7);
        }
        else if (id === 'edenblink') {
          play('teleport', 0.65);       // 伊甸殘影：瞬間移動移形換影
          play('throwWhoosh', 0.55);
          play('dash', 0.5);
        }
        else if (id === 'rushfist') {
          play('dash', 0.75);           // 始祖衝拳：肉身強襲破空衝刺
          play('bladeScrape', 0.65);
          play('throwWhoosh', 0.6);
          play('slamThud', 0.6);
        }
        else if (id === 'guardbash') {
          const sc = o.scale || 1.0;
          if (sc >= 0.9) {
            play('slamHeavy', 1.0);     // 我慢對轟收尾重拳
            play('shockwave', 0.9);
            play('slamThud', 0.85);
            play('explodeMid', 0.75);
          } else {
            play('slamThud', 0.85);     // 我慢近身連續重拳對轟
            play('hitHeavy', 0.8);
            play('maceAir', 0.65);
          }
        }
        else if (id === 'truefist') {
          play('slamHeavy', 1.0);       // 真・神之右：傾注全力的一擊！
          play('shockwave', 0.95);
          play('hitHeavy', 0.9);
          play('crit', 0.9);
          play('slamThud', 0.85);
        }
        else if (id === 'parry') {
          play('mikiriClang', 0.95);    // 見切格擋：手指虎硬接神器、清脆彈刀巨響
          play('mikiriRing', 0.85);     // 鐘鳴共振
          play('block', 0.7);
        }
        else if (id === 'roar') {
          play('heartbeat', 1.0);       // 死立不倒特寫爆發：絕唱心跳
          play('bell', 0.95);           // 始祖喪鐘清鳴
          play('ultCast', 0.9);         // 意志共鳴
          play('shockwave', 0.85);
        }
        else if (id === 'ultcast') {
          play('ultCast', 0.95);        // 大招蓄力：神聖共鳴
          play('bell', 0.85);
          play('buff', 0.75);
        }
        else if (id === 'bigslam') {
          play('slamHeavy', 1.0);       // 二階段父之絕唱：終結震裂大地
          play('slamThud', 0.95);
          play('explodeBig', 0.9);
          play('shockwave', 0.9);
        }
        // 向後相容通用動作 id
        else if (id === 'thrust') {
          const sc = o.scale || 1.0;
          if (sc >= 1.2) {
            play('slashHeavy', 0.85);
            play('crit', 0.85);
            play('shockwave', 0.6);
          } else {
            play('swordWhoosh', 0.6);
            play('slash', 0.55);
          }
        }
        else if (id === 'projhit') {
          play('hitMid', 0.55);
          play('swordWhoosh', 0.45);
        }
        else if (id === 'cleave') {
          play('slashHeavy', 1.0);
          play('maceAir', 0.9);
          play('shockwave', 0.85);
        }
        else if (id === 'threadcut') {
          play('fangSnap', 0.85);
          play('slash', 0.65);
        }
        else if (id === 'nova') {
          play('shockwave', 0.85);
          play('bell', 0.8);
        }
        else if (id === 'blink') {
          play('teleport', 0.6);
          play('dash', 0.5);
        }
        else if (id === 'dash') {
          play('dash', 0.7);
          play('bladeScrape', 0.6);
        }
        else if (id === 'slam') {
          play('slamThud', 0.85);
          play('hitHeavy', 0.8);
        }
      }
      // 宙斯（眾神之王・全宇宙之父）專屬音效
      else if (isZeus) {
        if (id === 'adamas') {
          play('heartbeat', 0.9);       // 阿陀磨須變身展開：肌肉壓縮劇痛心跳
          play('bladeScrape', 0.75);    // 肌肉骨骼極限緊縮摩擦
          play('fire', 0.65);           // 橘紅蒸氣升騰
          play('buff', 0.75);
        }
        else if (id === 'zeusjab') {
          const sc = o.scale || 1.0;
          if (wSid === 'true_right' || wSid === 'ult') {
            // 真・神之右 / 大招連打中的快拳
            play('hitMid', 0.6);
            play('crit', 0.55);
            play('throwWhoosh', 0.5);
          } else if (sc >= 1.2) {
            play('slashHeavy', 0.9);    // 亞光速刺拳・重拳：突破音障破空音爆！
            play('shockwave', 0.8);
            play('crit', 0.85);
            play('throwWhoosh', 0.75);
          } else {
            play('throwWhoosh', 0.75);  // 0.01 秒極速刺拳
            play('swordWhoosh', 0.65);
            play('crit', 0.6);
          }
        }
        else if (id === 'sunsetrush') {
          const sc = o.scale || 1.0;
          if (sc >= 1.2) {
            play('slashHeavy', 0.95);   // 黃昏流星拳收尾：黃昏巨日轟碎大地
            play('shockwave', 0.9);
            play('slamHeavy', 0.85);
            play('explodeMid', 0.75);
          } else {
            play('hitMid', 0.55);       // 黃昏流星群高速連打落點
            play('crit', 0.5);
            play('throwWhoosh', 0.45);
          }
        }
        else if (id === 'godaxe') {
          play('slashHeavy', 1.0);      // 神之斧：如巨斧斬裂對手的大弧掃踢！
          play('maceAir', 0.95);        // 沉重破空裂風
          play('shockwave', 0.9);       // 巨斧撕裂大地音爆
          play('slamThud', 0.85);
          if (isP2 || o.el === 'cosmos') {
            play('explodeMid', 0.75);   // 二階段紫黑星海巨斧
          } else {
            play('hitHeavy', 0.8);      // 一階段血斧重擊
          }
        }
        else if (id === 'stepecho') {
          play('slamHeavy', 0.95);      // 宙斯步法：閃至身後凌空踢頭重擊！
          play('slashHeavy', 0.9);
          play('shockwave', 0.85);
          play('crit', 0.85);
          play('throwWhoosh', 0.7);
        }
        else if (id === 'gavelverdict') {
          play('wood', 0.95);           // 審判之槌：木槌重重敲擊神殿石板
          play('slamThud', 0.95);       // 沉重鐵砧震盪
          play('slamHeavy', 0.9);       // 崩裂大半地面
          play('shockwave', 0.85);      // 宣告諸神黃昏音爆擴散
        }
        else if (id === 'gfocroar') {
          play('buff', 0.9);            // 全宇宙之父：神威宣告爆發
          play('shockwave', 0.85);      // 擊退氣場
          play('roarMid', 0.75);
          play('bell', 0.8);
        }
        else if (id === 'pressure') {
          play('shockwave', 0.95);      // 阿陀磨須威壓：星海暗幕壓頂
          play('slamHeavy', 0.85);
          play('ambSnow', 0.75);
          play('buff', 0.7);
        }
        else if (id === 'timestop') {
          play('ambSnow', 0.75);        // 時間停止蓄力：鐘面逆轉死寂陰風
          play('heartbeat', 0.85);      // 停滯前的一拍心跳
          play('buff', 0.7);
        }
        else if (id === 'kronosfist') {
          play('shockwave', 1.0);       // 超越時間之拳：超越光速弒父一拳！時空爆裂！
          play('slamHeavy', 1.0);       // 碎裂時空的沉重悶擊
          play('slamThud', 0.9);
          play('crit', 0.95);
          play('ultCast', 0.85);        // 凍結解除時光爆鳴
          if (o.scale && o.scale > 1.2) {
            play('explodeBig', 0.9);    // 大招超越時間之拳時空破裂
          }
        }
        else if (id === 'adamasfist') {
          const sc = o.scale || 1.0;
          if (sc >= 1.4) {
            play('slamHeavy', 1.0);     // 真・神之右終結：傾注神力的最後一擊！
            play('shockwave', 1.0);
            play('explodeBig', 0.9);
            play('slamThud', 0.95);
            play('crit', 0.95);
          } else {
            play('slamHeavy', 0.95);    // 真・神之右首擊重拳
            play('shockwave', 0.9);
            play('hitHeavy', 0.85);
            play('crit', 0.85);
          }
        }
        else if (id === 'olympusquake') {
          play('slamHeavy', 1.0);       // 眾神震盪：眾神之王大招終結墜地！
          play('slamThud', 1.0);
          play('explodeBig', 1.0);
          play('shockwave', 1.0);
          if (isP2 || o.el === 'cosmos') {
            play('roarBig', 0.85);      // 紫黑星海砸碎大地
          } else {
            play('lightning', 0.8);     // 神聖金雷震盪
          }
        }
        else if (id === 'awaken') {
          if (wDef && wDef.traits && wDef.traits.includes('battlelust') && !isP2) {
            play('roarMid', 0.9);       // 鬥神狂喜：挨打肌肉再膨脹一圈狂喜長笑
            play('buff', 0.85);
            play('shockwave', 0.75);
          } else {
            play('shockwave', 0.95);    // 阿陀磨須變身完成神力爆裂
            play('explodeBig', 0.85);
            play('buff', 0.8);
          }
        }
        else if (id === 'ring') {
          play('shockwave', 0.85);      // 審判之槌外圈震波
          play('stepSand', 0.65);
        }
        else if (id === 'appear') {
          play('teleport', 0.7);        // 步法背後突現
          play('dash', 0.6);
        }
        else if (id === 'dash') {
          play('dash', 0.65);
          play('throwWhoosh', 0.6);
        }
        else if (id === 'thrust') {
          play('throwWhoosh', 0.75);
          play('crit', 0.7);
        }
        else if (id === 'slash') {
          play('slashHeavy', 0.85);
          play('swordWhoosh', 0.75);
        }
        else if (id === 'bigslam') {
          play('slamHeavy', 1.0);
          play('slamThud', 0.95);
          play('shockwave', 0.9);
        }
      }
      // 範馬勇次郎（地上最強生物・食人魔）專屬音效
      else if (isYujiro) {
        if (id === 'ogreback') {
          play('buff', 0.85);          // 鬼背解放：暗紅光芒搏動
          play('heartbeat', 0.9);
        }
        else if (id === 'dissolve' || id === 'parry') {
          play('mikiriClang', 0.95);   // 消力：看一眼就學會郭海皇的卸力，清脆化勁彈刀！
          play('mikiriRing', 0.85);    // 空靈鐘鳴共振
          play('buff', 0.7);
        }
        else if (wSid === 'riposte') {
          play('slashHeavy', 0.95);    // 消力・返：借力打力全力反擊！
          play('slamHeavy', 0.9);
          play('shockwave', 0.85);
          play('hitHeavy', 0.8);
        }
        else if (id === 'fingerflick' || (wSid === 'finger_flick' && id === 'thrust')) {
          play('shockwave', isP2 ? 0.95 : 0.85); // 彈指：空氣被彈碎的貫穿音爆！
          play('throwWhoosh', 0.8);
          play('slamThud', 0.75);
          if (isP2 || o.el === 'blood') {
            play('crit', 0.85);
            play('slamHeavy', 0.75); // 二階段血色氣彈更狂暴
          }
        }
        else if (id === 'heelstomp' || (wSid === 'axe_kick' && id === 'bigslam')) {
          play('slamHeavy', 1.0);      // 踵落：戰斧下劈重靴踏碎地面！
          play('slamThud', 0.95);
          play('shockwave', 0.85);
          if (isP2 || o.el === 'blood') play('explodeMid', 0.75);
        }
        else if (wSid === 'axe_kick' && id === 'ring') {
          play('shockwave', 0.85);     // 二階段落地延遲擴散震波
          play('stepSand', 0.7);
          play('slamThud', 0.65);
        }
        else if (id === 'backfist' || (wSid === 'backhand' && id === 'slash')) {
          play('slashHeavy', 0.95);    // 裏拳：鐵臂破空沉重撕裂！
          play('maceAir', 0.85);
          play('slamThud', 0.8);
          if (isP2 || (o.scale && o.scale >= 1.2)) {
            play('shockwave', 0.85);   // 二階段第二記重擊破空音爆
          }
        }
        else if (id === 'whiplash' || (wSid === 'whip_strike' && id === 'slash')) {
          play('crit', 0.85);          // 鞭打：皮開肉綻的清脆極限抽擊聲！
          play('slash', 0.75);
          play('hitFlesh', 0.65);
          if (isP2 || o.el === 'blood') play('bladeScrape', 0.5);
        }
        else if (wSid === 'roll_kick' && id === 'dash') {
          play('dash', 0.7);           // 貼地疾衝
          play('bladeScrape', 0.5);
        }
        else if (id === 'rollkick' || (wSid === 'roll_kick' && id === 'whirl')) {
          play('slashHeavy', 0.95);    // 迴旋踢：旋身大橫掃破空！
          play('maceAir', 0.9);
          play('shockwave', 0.85);
          play('slamThud', 0.75);
        }
        else if (wSid === 'bite' && id === 'dash') {
          play('dash', 0.75);          // 食人魔前撲
        }
        else if (id === 'fangbite' || (wSid === 'bite' && (id === 'projhit' || id === 'bite'))) {
          play('fangSnap', 1.0);       // 噛みつき：利齒狠狠咬入碎骨脆響！
          play('hitFlesh', 0.9);
          play('crit', 0.85);
          play('poison', 0.65);        // 鮮血淋漓噴濺
        }
        else if (id === 'bearhug' || (wSid === 'bear_hug' && id === 'crushhug')) {
          const sc = o.scale || 1.0;
          if (sc >= 1.3) {
            play('slamHeavy', 1.0);    // 熊抱終結：肋骨折斷粉碎性終結一抱！
            play('shockwave', 0.95);   // 氣管與肋骨壓爆音爆
            play('slamThud', 0.9);
            play('anvilDestroy', 0.85);
            play('crit', 0.85);
          } else {
            play('hitHeavy', 0.85);    // 熊抱收緊：肋骨被一根根壓彎的沉悶撞擊
            play('bladeScrape', 0.75); // 骨骼相互擠壓摩擦
            play('hitFlesh', 0.7);
          }
        }
        else if (id === 'eardrum' || (wSid === 'eardrum' && id === 'ring')) {
          play('mikiriRing', 1.0);     // 鼓膜破壞：震耳欲聾的高頻耳鳴清鳴！
          play('slamThud', 0.9);       // 雙掌狠拍耳際悶響
          play('shockwave', 0.85);     // 鼓膜震碎氣爆
          play('stun', 0.75);
        }
        else if (id === 'stillquake' || (wSid === 'quake_stop' && id === 'quakehalt')) {
          play('slamHeavy', 1.0);      // 止震之拳：千鈞重拳砸穿地面！
          play('slamThud', 1.0);       // 鐵砧震盪
          play('shockwave', 1.0);      // 鎮壓地脈的巨型裂地音爆！
          play('explodeBig', 0.95);
        }
        else if (wSid === 'quake_stop' && id === 'ring') {
          play('shockwave', 0.85);     // 地脈衝擊波外推
          play('stepSand', 0.75);
        }
        else if (id === 'flexpulse' || (wSid === 'flex' && id === 'pressure')) {
          play('shockwave', 0.95);     // 震樓之軀：整棟建築震顫的低頻衝擊！
          play('slamHeavy', 0.9);      // 地基巨響
          play('buff', 0.85);          // 狂暴氣場升騰
          play('roarMid', 0.8);        // 食人魔獰笑威壓
        }
        else if (id === 'beastclaw') {
          play('slamHeavy', 0.9);      // 猛獸爪影
          play('shockwave', 0.8);
          play('crit', 0.75);
          play('hitHeavy', 0.75);
        }
        else if (wSid === 'beast_barrage') {
          if (id === 'fistrain') {
            const sc = o.scale || 1.0;
            if (sc >= 1.3) {
              play('slamHeavy', 1.0);  // 猛獸連擊終結：狂暴連打終結重拳！
              play('shockwave', 0.95);
              play('slamThud', 0.9);
              play('explodeMid', 0.85);
              play('crit', 0.85);
            } else {
              play('slamHeavy', 0.95); // 首記重拳轟擊
              play('shockwave', 0.85);
              play('slamThud', 0.8);
            }
          } else if (id === 'projhit') {
            play('hitHeavy', 0.75);    // 密不透風的高速亂拳
            play('hitMid', 0.65);
            play('crit', 0.6);
            play('throwWhoosh', 0.55);
          }
        }
        else if (id === 'demonface' || (wSid === 'demon_blow' && id === 'nukefist')) {
          play('slamHeavy', 1.0);      // 鬼貌一擊：惡魔領域的終結一拳！
          play('explodeBig', 0.95);    // 撼地巨響
          play('shockwave', 1.0);      // 暴烈裂空音爆
          play('slamThud', 0.95);
          play('crit', 0.95);
        }
        else if (wSid === 'demon_blow') {
          if (id === 'pressure') {
            play('shockwave', 0.85);   // 惡魔領域威壓
            play('buff', 0.8);
            play('heartbeat', 0.8);
          } else if (id === 'dash') {
            play('dash', 0.85);        // 狂暴野獸撕裂地面疾衝
            play('shockwave', 0.8);
          }
        }
        else if (id === 'ultfist' || id === 'ogrewail' || (wSid === 'ult' && id === 'nukefist')) {
          play('slamHeavy', 1.0);      // 地上最強一擊／鬼哭啼終結：把大地打凹下去！
          play('explodeBig', 1.0);     // 核爆轟鳴
          play('shockwave', 1.0);      // 全場音爆
          play('slamThud', 1.0);
          if (isP2 || id === 'ogrewail') play('death', 0.85); // 惡鬼啼哭餘韻
        }
        else if (wSid === 'ult') {
          if (id === 'appear') {
            play('teleport', 0.85);    // 身後突現
            play('shadowTeleport', 0.8);
          } else if (id === 'pressure') {
            play('shockwave', 0.9);    // 絕對威壓拖慢
            play('heartbeat', 0.9);
            play('buff', 0.8);
          } else if (id === 'fistrain') {
            play('slamHeavy', 0.95);   // 鬼哭啼：無盡亂拳首擊
            play('shockwave', 0.9);
            play('hitHeavy', 0.85);
            play('crit', 0.85);
          } else if (id === 'projhit') {
            play('hitHeavy', 0.75);    // 鬼哭啼高頻拳雨
            play('crit', 0.65);
            play('hitMid', 0.65);
          } else if (id === 'ring') {
            play('shockwave', 0.9);    // 全場衝擊波擴散
            play('stepSand', 0.8);
          }
        }
        // 勇次郎通用動作保底
        else if (id === 'nukefist') {
          play('slamHeavy', 1.0); play('explodeBig', 1.0); play('shockwave', 1.0); play('slamThud', 1.0);
        }
        else if (id === 'quakehalt') {
          play('slamHeavy', 1.0); play('slamThud', 1.0); play('shockwave', 1.0); play('explodeBig', 0.95);
        }
        else if (id === 'crushhug') {
          play('slamHeavy', 0.95); play('shockwave', 0.9); play('hitHeavy', 0.85);
        }
        else if (id === 'bigslam') {
          play('slamHeavy', 1.0); play('slamThud', 0.95); play('shockwave', 0.9);
        }
        else if (id === 'thrust') {
          play('shockwave', 0.85); play('throwWhoosh', 0.75); play('crit', 0.7);
        }
        else if (id === 'slash') {
          play('slashHeavy', 0.85); play('maceAir', 0.75);
        }
        else if (id === 'whirl') {
          play('slashHeavy', 0.9); play('maceAir', 0.85); play('shockwave', 0.8);
        }
        else if (id === 'ring') {
          play('shockwave', 0.85); play('stepSand', 0.65);
        }
        else if (id === 'pressure') {
          play('shockwave', 0.9); play('buff', 0.75);
        }
        else if (id === 'dash') {
          play('dash', 0.65); play('bladeScrape', 0.5);
        }
      }
      // 宇智波鼬專屬音效
      else if (isItachi) {
        if (id === 'mangekyo') {
          play('heartbeat', 0.95);       // 萬花筒覺醒：血淚滴落、勾玉收緊心跳
          play('bell', 0.9);             // 萬花筒清鳴開眼
          play('buff', 0.85);            // 暗黑查克拉湧出
          play('ambSnow', 0.7);          // 血紅暗幕陰風
          setTimeout(() => {
            play('wood', 0.95);          // 斗笠粉碎炸飛！
            play('shockwave', 0.95);     // 雙層震波狂湧！
            play('slamHeavy', 0.9);      // 氣勢壓碎地面
            play('swordWhoosh', 0.85);   // 烏鴉殘影掠過
          }, (o.life || 1.8) * 1000);
        }
        else if (id === 'susanoo') {
          play('ultCast', 0.95);         // 須佐能乎：查克拉骨架暴拔升騰！
          play('slamHeavy', 0.9);        // 踏裂大地
          play('shockwave', 0.85);       // 神威震波
          play('fire', 0.8);             // 赤紅烈火奔流
          play('bladeScrape', 0.75);     // 骨架合攏金屬感
        }
        else if (id === 'susanoocharge') {
          play('maceAir', 0.85);         // 須佐能乎蓄勢：肋骨骨架光環蓄力
          play('bladeScrape', 0.8);      // 查克拉金屬摩擦
          play('buff', 0.75);
          play('shockwave', 0.65);
        }
        else if (id === 'yatamirror') {
          play('mikiriClang', 1.0);      // 八咫鏡・反映：絕對神盾同心圓反彈！
          play('mikiriRing', 0.95);      // 鏡面波紋神聖共振清鳴
          play('shockwave', 0.9);        // 彈反震波推開
          play('buff', 0.8);
          play('slashHeavy', 0.85);      // 反傷重創
        }
        else if (id === 'sharinganwatch') {
          play('mikiriClang', 0.95);     // 寫輪眼・見切：看穿反擊彈刀！
          play('mikiriRing', 0.9);       // 洞悉清鳴
          play('slashHeavy', 0.85);      // 反手斬擊
          play('swordWhoosh', 0.8);
        }
        else if (id === 'sharingancharge') {
          play('bell', 0.85);            // 寫輪眼凝視：月讀前場地暗下一圈
          play('heartbeat', 0.8);        // 精神收束心跳
          play('buff', 0.7);
          play('ambSnow', 0.6);
        }
        else if (id === 'gazeline') {
          play('bell', 0.95);            // 月讀視線：眼神交會血紅光束貫穿！
          play('heartbeat', 0.9);        // 精神重擊
          play('ambSnow', 0.85);         // 幻術抽離現實
          play('shockwave', 0.8);
          play('teleport', 0.75);
        }
        else if (id === 'tsukuyomi') {
          play('bell', 1.0);             // 月讀世界：拉入血紅暗幕、釘上十字架！
          play('ambSnow', 0.9);          // 幻術世界死寂陰風
          play('heartbeat', 0.9);        // 精神重壓心跳
          play('teleport', 0.8);
        }
        else if (id === 'amaterasumark') {
          play('heartbeat', 0.85);       // 天照鎖定：黑炎降臨前寫輪眼預警焦點
          play('fire', 0.75);            // 虛無火舌滋滋作響
          play('click', 0.7);            // 視線鎖死
          play('buff', 0.6);
        }
        else if (id === 'amaterasubloom' || id === 'amaterasu') {
          play('explodeMid', 0.95);      // 天照・黑炎綻放：落點黑炎憑空爆裂！
          play('fire', 0.95);            // 不滅之火狂暴灼燒
          play('shockwave', 0.85);       // 黑炎震波
          play('poison', 0.75);          // 燒盡為止的腐蝕滋滋聲
        }
        else if (id === 'gokakyu' || id === 'flamethrow') {
          play('fire', 0.95);            // 火遁・豪火球之術：滔天烈焰向前噴湧翻滾！
          play('explodeMid', 0.85);      // 火球前緣爆破
          play('shockwave', 0.8);        // 灼熱氣浪衝擊
          play('maceAir', 0.7);          // 空氣撕裂
        }
        else if (id === 'kunaislash') {
          play(isP2 ? 'slashHeavy' : 'slash', isP2 ? 0.75 : 0.65); // 苦無連斬：銀白弧度
          play('swordWhoosh', 0.55);
          if (isP2 || o.el === 'fire') play('fire', 0.65);
        }
        else if (id === 'kunaistab') {
          play('slashHeavy', isP2 ? 0.85 : 0.75); // 苦無突刺：直刺貫通
          play('crit', 0.75);
          play('swordWhoosh', 0.65);
          if (isP2 || o.el === 'fire') play('fire', 0.7);
        }
        else if (id === 'shurikenfan') {
          play('throwWhoosh', 0.8);      // 手裏劍扇射：暗器破空疾射
          play('shoot', 0.5);
          if ((o.scale || 1) >= 1.2) play('swordWhoosh', 0.7); // 巨大四刃風車手裏劍
          if (isP2 || o.el === 'fire') play('fire', 0.6);
        }
        else if (id === 'crowvolley') {
          play('throwWhoosh', 0.75);     // 烏鴉齊飛：袖口振翅衝出
          play('dash', 0.55);
          play('shadowTeleport', 0.5);
        }
        else if (id === 'crowfall') {
          play('slamThud', 0.75);        // 烏鴉俯衝：從天而降砸在落點
          play('throwWhoosh', 0.7);
          if (o.el === 'blackfire' || isP2) {
            play('explodeMid', 0.85);    // 附帶天照黑炎的群鴉轟炸
            play('fire', 0.75);
          }
        }
        else if (id === 'crowburst') {
          play('shadowTeleport', 0.85);  // 烏鴉分身／烏鴉替身：漆黑羽翼拖影炸散遁走
          play('throwWhoosh', 0.8);      // 漫天落羽撲擊破空
          play('wood', 0.55);            // 替身混淆
          play('dash', 0.5);
        }
        else if (id === 'shunshin') {
          play('teleport', 0.85);        // 瞬身之術：落葉白煙極速位移
          play('dash', 0.75);
          play('throwWhoosh', 0.6);
        }
        else if (id === 'palmgrab') {
          play('hitHeavy', 0.85);        // 擒拿掌擊：背後貼身重重一印！
          play('slamThud', 0.8);
          play('shockwave', 0.7);
          play('throwWhoosh', 0.6);
        }
        else if (id === 'foreheadpoke' || wSid === 'poke') {
          play('click', 0.9);            // 額頭一戳・下次吧：「下次吧，佐助。」額頭清脆一響！
          play('shieldBreak', 0.9);      // 破防崩解、架勢全散！
          play('bell', 0.75);            // 親情羈絆清鳴
        }
        else if (id === 'magatamafan') {
          play('tridentThrow', 0.9);     // 八尺瓊勾玉：勾玉扇形甩出、橘金呼嘯
          play('maceAir', 0.85);
          play('shockwave', 0.8);
          play('buff', 0.7);
        }
        else if (id === 'totsuka') {
          play('slashHeavy', 1.0);       // 須佐能乎・十拳劍：四道蒼紫月牙斬氣滾出、裂地巨斬！
          play('shockwave', 1.0);        // 貫通音爆
          play('slamHeavy', 0.95);       // 大地碎裂
          play('ultCast', 0.9);          // 封印靈劍神威
          setTimeout(() => {
            play('bell', 0.95);          // 封印收束：「封」字浮現、吸入酒壺清鳴！
            play('mikiriRing', 0.85);
            play('teleport', 0.8);
          }, 500);
        }
        else if (id === 'parry') {
          play('mikiriClang', 0.95);     // 寫輪眼見切：看穿反擊彈刀！
          play('mikiriRing', 0.85);
          play('slashHeavy', 0.9);
          play('swordWhoosh', 0.8);
        }
        else if (wSid === 'flicker') {
          play('hitHeavy', 0.85);        // 瞬身掌擊命中
          play('slamThud', 0.8);
          play('shockwave', 0.7);
        }
        else if (wSid === 'kunai') {
          if (id === 'thrust') {
            play(isP2 ? 'slashHeavy' : 'slash', 0.8);
            play('crit', 0.75);
            play('swordWhoosh', 0.65);
            if (isP2) play('fire', 0.75);
          } else {
            play('slash', 0.7);
            play('swordWhoosh', 0.6);
            if (isP2) play('fire', 0.65);
          }
        }
        else if (id === 'slash') {
          if (o.el === 'umbra') {
            play('crit', 0.75);          // 月讀幻境中的連續白線穿刺酷刑！
            play('slash', 0.65);
            play('heartbeat', 0.7);
          } else {
            play(isP2 ? 'slashHeavy' : 'slash', 0.75);
            play('swordWhoosh', 0.65);
            if (isP2) play('fire', 0.65);
          }
        }
        else if (id === 'thrust') {
          play('slashHeavy', 0.8);
          play('crit', 0.75);
          play('throwWhoosh', 0.65);
          if (isP2) play('fire', 0.7);
        }
      }
      else if (id === 'thunderwake') { play('buff', 0.6); play('lightning', 0.6); }
      else if (id === 'thunderstrike') { play('lightning', 0.8); play('slamHeavy', 0.6); }
      else if (id === 'thunderpath') { play('lightning', 0.7); play('shockwave', 0.5); }
      else if (id === 'boltblink') { play('lightning', 0.8); play('teleport', 0.5); }
      else if (id === 'chronofist' || id === 'timefist' || id === 'kronosfist') {
        play('shockwave', 1.0);
        play('slamHeavy', 0.95);
        play('slamThud', 0.85);
        play('crit', 0.9);
        play('ultCast', 0.85);
      }
      else if (id === 'timestop') {
        play('ambSnow', 0.65);
        play('heartbeat', 0.8);
        play('buff', 0.65);
      }
      else if (id === 'fistjab') {
        play((o.scale || 1) >= 1.2 ? 'slashHeavy' : 'swordWhoosh', 0.7);
        if ((o.scale || 1) >= 1.2) play('shockwave', 0.6); else play('slash', 0.5);
      }
      else if (id === 'meteorfist') {
        if ((o.scale || 1) >= 1.4) { play('slashHeavy', 0.85); play('shockwave', 0.8); }
        else { play('hitMid', 0.55); play('swordWhoosh', 0.45); }
      }
      else if (id === 'replicaaxe') {
        play('slashHeavy', 0.95); play('maceAir', 0.85); play('shockwave', 0.8);
      }
      else if (id === 'serpentclaw') {
        play('fangSnap', 0.85); play('slashHeavy', 0.8); play('poison', 0.6);
      }
      else if (id === 'wardnova') {
        play('shockwave', 0.8); play('bell', 0.75); play('buff', 0.65);
      }
      else if (id === 'edenblink') {
        play('teleport', 0.6); play('dash', 0.5);
      }
      else if (id === 'rushfist') {
        play('dash', 0.7); play('slamThud', 0.6);
      }
      else if (id === 'guardbash') {
        play((o.scale || 1) >= 0.9 ? 'slamHeavy' : 'slamThud', 0.8);
        play((o.scale || 1) >= 0.9 ? 'shockwave' : 'hitHeavy', 0.7);
      }
      else if (id === 'truefist') {
        play('slamHeavy', 0.95); play('shockwave', 0.9); play('hitHeavy', 0.85); play('crit', 0.85);
      }
      else if (id === 'zeusjab') {
        play((o.scale || 1) >= 1.2 ? 'slashHeavy' : 'throwWhoosh', 0.7);
        if ((o.scale || 1) >= 1.2) play('shockwave', 0.6); else play('crit', 0.5);
      }
      else if (id === 'sunsetrush') {
        if ((o.scale || 1) >= 1.4) { play('slashHeavy', 0.9); play('shockwave', 0.85); }
        else { play('hitMid', 0.55); play('throwWhoosh', 0.45); }
      }
      else if (id === 'godaxe') {
        play('slashHeavy', 0.95); play('maceAir', 0.85); play('shockwave', 0.8);
      }
      else if (id === 'stepecho') {
        play('slamHeavy', 0.9); play('slashHeavy', 0.8); play('shockwave', 0.75);
      }
      else if (id === 'gavelverdict') {
        play('wood', 0.9); play('slamThud', 0.9); play('shockwave', 0.8);
      }
      else if (id === 'gfocroar') {
        play('buff', 0.8); play('shockwave', 0.75); play('bell', 0.7);
      }
      else if (id === 'adamasfist') {
        play('slamHeavy', 0.95); play('shockwave', 0.9); play('hitHeavy', 0.85); play('crit', 0.85);
      }
      else if (id === 'olympusquake') {
        play('slamHeavy', 1.0); play('slamThud', 1.0); play('explodeBig', 0.95); play('shockwave', 0.95);
      }
      else if (id === 'sightstance') {
        play('bell', 0.85); play('mikiriRing', 0.75); play('buff', 0.6);
      }
      else if (id === 'ironfist') { play('mikiriClang', 0.8); play('slamHeavy', 0.7); }
      else if (id === 'pressure') { play('buff', 0.5); play('shockwave', 0.5); }
      else if (TERRAIN[id]) play(TERRAIN[id], 0.5);
      else if (id === 'posturebreak') play('stun', 0.7);
      else if (id === 'parry') play('block', 0.6);
      else if (id === 'gore') { if (o.lethal) play('death', 0.8); }
      else if (ROAR.includes(id)) play(o.k >= 1.5 ? 'roarBig' : 'roarMid', 0.7);
      else if (id === 'deathmark') {
        play('fangSnap', 1.0);
        play('slashHeavy', 0.95);
        play('shockwave', 0.9);
        play('slamHeavy', 0.85);
        play('death', 0.75);
      }
      else if (id === 'contempt') {
        play('fangSnap', 0.95);
        play('slashHeavy', 0.9);
        play('hitHeavy', 0.85);
      }
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
