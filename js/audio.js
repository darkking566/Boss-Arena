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
  const LONG = 0.35, GAP = { hitFlesh: 0.12, hitHeavy: 0.12, hitBeast: 0.15, shoot: 0.12, draw: 0.25, sheath: 1, mikiriClang: 0.5, mikiriRing: 0.5, horseNeigh: 0.8, horseGallop: 0.16, shieldBreak: 0.15, bladeScrape: 0.2, swordWhoosh: 0.1, maceAir: 0.1, tridentThrow: 0.2, tridentReturn: 0.2, anvilDestroy: 0.5, throwWhoosh: 0.08, heartbeat: 0.22, shadowTeleport: 0.12, fangSnap: 0.15, crit: 0.08, stepSand: 0.1, stepSnow: 0.1, stepGrass: 0.1, stepMud: 0.1, stepWater: 0.1, wood: 0.12, grass: 0.12, splash: 0.2, stun: 0.5, bell: 0.8, click: 0.05, explodeMid: LONG, explodeBig: LONG, slamHeavy: LONG, slamThud: LONG, roarMid: 1, roarBig: 1, death: 1, fire: LONG, ice: LONG, lightning: 0.08, dash: 0.25, teleport: 0.4, buff: 1, projHit: 0.1, ultCast: 1.5, poison: LONG, victory: 1 };
  // 音檔常帶很長的尾巴（蓄力 7 秒、砸地 6.6 秒…），超過上限就淡出截斷；未列出者播完整檔
  const MAXLEN = { mikiriRing: 1.5, horseNeigh: 1.8, horseGallop: 0.6, shieldBreak: 0.8, bladeScrape: 0.8, swordWhoosh: 0.5, maceAir: 0.6, tridentThrow: 0.8, tridentReturn: 1.2, anvilDestroy: 1.2, throwWhoosh: 0.4, heartbeat: 0.6, shadowTeleport: 0.8, fangSnap: 0.8, ambDesert: 8, ambSnow: 8, ambLake: 6, ambForest: 8, ambWheat: 7, ambSwamp: 8, explodeMid: 1.5, explodeBig: 2.2, slamHeavy: 1.5, slamThud: 1, roarMid: 2, roarBig: 2.2, fire: 1.2, ice: 1.2, lightning: 1.5, shockwave: 1.2, teleport: 1.2, buff: 1.2, ultCast: 1.5, poison: 1.2 };
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
  const lastSkill = new WeakMap();
  const dmMap = new WeakMap();
  const seenRet = new WeakSet();
  const seenHeal = new WeakSet();
  const seenP2 = new WeakSet();
  const seenLock = new WeakSet();
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
        // 二階段拔刀：HP 50% 佩服對手決心，拔出黑刀「夜」
        if (b.phase === 2 && !seenP2.has(b)) {
          seenP2.add(b);
          play('draw', 0.95);        // 拔刀出鞘清脆破空
          play('swordWhoosh', 0.85); // 黑刀「夜」巨刃劃開氣流
          play('bladeScrape', 0.7);  // 刀刃離鞘金屬摩擦
          play('buff', 0.75);        // 世界第一大劍豪氣場爆發
          play('shockwave', 0.6);    // 劍壓微鳴震動
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
      } else if (kind === 'kunai' || kind === 'shuriken' || kind === 'arrow') {
        play('throwWhoosh', 0.65);   // 諸刃手裏劍投擲破空
        play('shoot', 0.4);
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
      const wSid = o.src && o.src.inst && o.src.inst.skill && o.src.inst.skill.id;
      const isP2 = !!(o.src && (o.src.phase === 2 || (o.src.owner && o.src.owner.phase === 2)));
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
        if (id === 'parry') {
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
      else if (id === 'thunderwake') { play('buff', 0.6); play('lightning', 0.6); }
      else if (id === 'thunderstrike') { play('lightning', 0.8); play('slamHeavy', 0.6); }
      else if (id === 'thunderpath') { play('lightning', 0.7); play('shockwave', 0.5); }
      else if (id === 'boltblink') { play('lightning', 0.8); play('teleport', 0.5); }
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
