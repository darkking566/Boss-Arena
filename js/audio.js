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
      wolfHowl: ['roar_big'], wolfGrowl: ['roar_mid'], wolfDisperse: ['death'], wolfPant: ['slam_thud'],
      beastBite: ['hit_flesh_slice'], ghostSwoop: ['dash_whoosh'], bowShoot: ['proj_hit'],
      windBurst: ['dash_whoosh'], crystalResonate: ['buff_up'], beaconBeam: ['magic_cast'],
      soulCharge: ['magic_cast'], sculkPulse: ['slam_thud'], sculkShriek: ['roar_big'],
      windDeflect: ['hit_armor'], windWhirl: ['dash_whoosh', 'swing_small'], windCharge: ['buff_up', 'dash_whoosh'],
      windShoot: ['swing_small', 'dash_whoosh'], windAir: ['dash_whoosh'], windPierce: ['slash_2', 'hit_flesh_slice'],
      windSpin: ['dash_whoosh', 'slash_2'], metalWhoosh: ['slash_violent', 'swing_small'],
      windShield: ['buff_up'], sakeDrink: ['buff_up'], sakeSpit: ['slash_2'],
      tridentGround: ['slam_heavy'], bloodSplash: ['hit_flesh_slice'], spearLunge: ['dash_whoosh', 'slash_violent'],
      clothRip: ['slash_2'], battleaxeSwipe: ['slash_violent'], dragonFlap: ['dash_whoosh'],
      fireballWhoosh: ['dash_whoosh'], fireballImpact: ['explosion_mid'], omenCurse: ['death'],
      bellResonate: ['buff_up'], witherShoot: ['dash_whoosh', 'magic_cast'],
      bloodDrain: ['magic_cast', 'buff_up'], evokerPrepare: ['magic_cast'], dripLava: ['poison'],
      crimsonVoom: ['magic_cast'], soulsandVoices: ['roar_mid'],
      crystalSword: ['magic_cast', 'slash_violent'],
      glintBreath: ['fire', 'ice'],
      iceCrystalBreak: ['ice', 'hit_armor'],
      iceCrack: ['ice'],
      shulkerShoot: ['magic_cast', 'swing_small'],
      iceChime: ['buff_up'],
      dragonRoarLong: ['roar_big'],
      dragonRoarShort: ['roar_mid'],
      dragonBite: ['hit_flesh_slice', 'slash_violent'],
      dragonStomp: ['slam_heavy', 'slam_thud'],
      heavyCoreBreak: ['slam_heavy', 'hit_armor'],
      beaconPower: ['buff_up', 'magic_cast'],
      heavyWhoosh: ['dash_whoosh', 'swing_small'],
      dragonFlameLong: ['fire'], dragonFlameShort: ['fire'],
      breezeJump: ['dash_whoosh'], breezeLand: ['slam_thud'],
      golemBellow: ['roar_mid'], wardenImpact: ['slam_heavy'],
      sculkClick: ['swing_small'], amethystClusterBreak: ['hit_armor', 'slash_violent'],
      portalDisappear: ['teleport'], portalAppear: ['teleport'],
      shulkerHit: ['buff_up'], tractorBeam: ['shockwave', 'magic_cast'], tractorPull: ['dash_whoosh'],
      respawnAnchorAmbient: ['buff_up'], respawnAnchorSet: ['teleport'],
      conduitAmbient: ['buff_up'], conduitShort: ['dash_whoosh'],
      illusionWarp: ['teleport'], fireworkBlast: ['explosion_mid'], fireworkTwinkle: ['buff_up'],
      endPortal: ['teleport', 'magic_cast'], enderDragonDeath: ['death', 'roar_big'],
      witherSpawn: ['roar_big', 'magic_cast'],
      borealisBreath: ['ice'], borealisRoarEpic: ['roar_big'], borealisRoar: ['roar_big', 'roar_mid'],
      borealisSlam: ['slam_heavy'], borealisStomp: ['slam_thud'], borealisGrowl: ['roar_mid'],
      borealisFreezeMagic: ['magic_cast'], borealisIceCast: ['ice'], borealisSnarl: ['roar_mid'],
      borealisBite: ['hit_flesh_slice'], borealisFrostCreak: ['ice'], borealisIceCrack: ['ice'],
      borealisIceBreak: ['hit_armor'], borealisFrostbite: ['ice'],
      gravityTractor: ['magic_cast', 'shockwave'], gravityPull: ['teleport', 'shockwave'], gravitySuck: ['dash_whoosh'],
      cosmicRoar: ['roar_big'], cosmicSnarl: ['roar_mid'], cosmicGrowl: ['roar_mid'],
      cataclysmLand: ['slam_heavy', 'explosion_big'], cosmicWhoosh: ['slash_violent', 'swing_small'],
      beastChomp: ['hit_flesh_slice'], ripBlock: ['hit_armor', 'slam_thud'],
      wardenDig: ['slam_thud'], wardenEmerge: ['dash_whoosh'], guardianBeam: ['magic_cast'],
      basaltPlode: ['explosion_mid'], basaltTwist: ['slam_thud'], basaltDebris: ['hit_armor'],
      deepslateBreak: ['hit_armor'], ancientDebrisDig: ['hit_armor'], endPortalActivate: ['magic_cast'],
      hoglinAngry: ['roar_mid'], hoglinAttack: ['hit_flesh_slice'], beastStep: ['slam_thud'],
      sonicCharge: ['magic_cast'], heavySmash: ['slam_heavy', 'hit_armor'], earthCrack: ['slam_heavy'],
      dripstoneLand: ['hit_armor', 'slam_thud'], conduitAttack: ['magic_cast'],
      dragonRoarBeastly: ['roar_big'], dragonHurt: ['hit_flesh_slice', 'roar_mid'], dragonDeath: ['death'],
      fireballLaunch: ['magic_cast', 'dash_whoosh'], trialOmen: ['buff_up', 'magic_cast'],
      tuffBreak: ['slam_thud', 'hit_armor'], campfire: ['fire'],
      dragonRoar: ['roar_mid', 'roar_big'],
      dragonFlame: ['fire'],
      heavyCore: ['slam_thud', 'hit_armor'],
      sonicCharge: ['magic_cast'],
      witherSpawn: ['roar_big', 'magic_cast'],
      ghastCharge: ['magic_cast'],
      ironGolemThrow: ['swing_small', 'dash_whoosh'],
      tridentThunder: ['lightning'],
      horseStep: ['slam_thud'],
      horseArmor: ['hit_armor'],
      wolfStep: ['slam_thud'], wolfBark: ['roar_mid'], foxAggro: ['roar_mid'], foxScreech: ['dash_whoosh'],
      crystalBreak: ['hit_armor'],
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
      wolfHowl: ['wolf_howl1', 'wolf_howl2'],
      wolfGrowl: ['wolf_growl1', 'wolf_growl2', 'wolf_growl3'],
      wolfDisperse: ['wolf_death', 'wolf_whine', 'wolf_hurt1'],
      wolfPant: ['wolf_panting'],
      beastBite: ['fox_bite1', 'fox_bite2', 'fox_bite3'],
      ghostSwoop: ['phantom_swoop1', 'phantom_swoop2'],
      bowShoot: ['bow_shoot'],
      windBurst: ['breeze_burst1', 'breeze_burst2', 'breeze_burst3'],
      windDeflect: ['breeze_deflect1', 'breeze_deflect2', 'breeze_deflect3'],
      windWhirl: ['breeze_whirl', 'vortex_whoosh1', 'vortex_whoosh2'],
      windCharge: ['breeze_charge1', 'breeze_charge2', 'breeze_charge3', 'breeze_inhale1'],
      windShoot: ['breeze_shoot'],
      windAir: ['breeze_air1', 'breeze_air2', 'breeze_air3'],
      windPierce: ['trident_pierce1', 'trident_pierce2', 'trident_pierce3'],
      windSpin: ['riptide1', 'riptide2', 'riptide3'],
      metalWhoosh: ['metal_whoosh1', 'metal_whoosh2', 'metal_whoosh3'],
      windShield: ['wither_shield1', 'wither_shield2'],
      sakeDrink: ['sake_drink'],
      sakeSpit: ['sake_spit'],
      crystalResonate: ['amethyst_resonate1', 'amethyst_resonate2', 'amethyst_resonate3', 'amethyst_resonate4', 'amethyst_shimmer'],
      beaconBeam: ['beacon_activate'],
      soulCharge: ['respawn_anchor_charge'],
      sculkPulse: ['sculk_charge'],
      sculkShriek: ['sculk_shriek'],
      dragonFlap: ['dragon_flap1', 'dragon_flap2', 'dragon_flap3', 'dragon_flap4', 'dragon_flap5', 'dragon_flap6'],
      fireballWhoosh: ['fireball_whoosh1', 'fireball_whoosh2', 'fireball_whoosh3'],
      fireballImpact: ['fireball_impact1', 'fireball_impact2', 'fireball_impact3'],
      omenCurse: ['omen_curse'],
      bellResonate: ['bell_resonate'],
      tridentGround: ['trident_ground_impact1', 'trident_ground_impact2', 'trident_ground_impact3', 'trident_ground_impact4'],
      bloodSplash: ['water_heavy_splash'],
      spearLunge: ['spear_lunge1', 'spear_lunge2', 'spear_lunge3'],
      clothRip: ['cloth_rip1', 'cloth_rip2'],
      battleaxeSwipe: ['battleaxe_swipe1', 'battleaxe_swipe2', 'battleaxe_swipe3', 'battleaxe_swipe4'],
      witherShoot: ['wither_shoot'],
      bloodDrain: ['respawn_anchor_deplete1', 'respawn_anchor_deplete2'],
      evokerPrepare: ['evoker_prepare_summon', 'evoker_prepare_attack1'],
      dripLava: ['drip_lava1', 'drip_lava2'],
      crimsonVoom: ['crimson_voom1', 'crimson_voom2'],
      soulsandVoices: ['soulsand_voices1'],
      crystalSword: ['crystal_sword_craft'],
      glintBreath: ['ice_breath1', 'ice_breath2', 'ice_breath3'],
      iceCrystalBreak: ['ice_crystal_break1', 'ice_crystal_break2', 'ice_crystal_break3', 'ice_crystal_break4', 'ice_crystal_break5'],
      iceCrack: ['ice_crack1', 'ice_crack2', 'ice_crack3'],
      shulkerShoot: ['shulker_shoot1', 'shulker_shoot2', 'shulker_shoot3', 'shulker_shoot4'],
      iceChime: ['ice_chime'],
      dragonRoarLong: ['dragon_roar_long1', 'dragon_roar_long2', 'dragon_roar_pitched'],
      dragonRoarShort: ['dragon_roar_short1', 'dragon_roar_short2', 'dragon_roar_short3'],
      dragonBite: ['dragon_bite1', 'dragon_bite2', 'dragon_bite3', 'dragon_bite4'],
      dragonStomp: ['dragon_stomp1', 'dragon_stomp2', 'dragon_stomp3', 'dragon_stomp4'],
      heavyCoreBreak: ['heavy_core_break1', 'heavy_core_break2', 'heavy_core_break3', 'heavy_core_break4'],
      beaconPower: ['beacon_power1', 'beacon_power2'],
      heavyWhoosh: ['heavy_whoosh1', 'heavy_whoosh2'],
      dragonFlameLong: ['dragon_flamethrow_long1', 'dragon_flamethrow_long2'],
      dragonFlameShort: ['dragon_flamethrow_short1', 'dragon_flamethrow_short2', 'dragon_flamethrow_short3', 'dragon_flamethrow_short4'],
      breezeJump: ['breeze_jump1', 'breeze_jump2'],
      breezeLand: ['breeze_land1', 'breeze_land2'],
      golemBellow: ['golem_bellow1', 'golem_bellow2'],
      wardenImpact: ['warden_impact1', 'warden_impact2'],
      borealisBreath: ['borealis_breath1', 'borealis_breath2', 'borealis_breath3'],
      borealisRoarEpic: ['borealis_roar_epic'],
      borealisRoar: ['borealis_roar_deep1', 'borealis_roar_deep2', 'borealis_roar_short1', 'borealis_roar_short2', 'borealis_roar_short3'],
      borealisSlam: ['borealis_slam1', 'borealis_slam2'],
      borealisStomp: ['borealis_stomp1', 'borealis_stomp2', 'borealis_stomp3'],
      borealisGrowl: ['borealis_growl'],
      borealisFreezeMagic: ['borealis_freeze_magic'],
      borealisIceCast: ['borealis_ice_cast1', 'borealis_ice_cast2'],
      borealisSnarl: ['borealis_snarl1', 'borealis_snarl2', 'borealis_snarl3'],
      borealisBite: ['borealis_bite1', 'borealis_bite2', 'borealis_bite3'],
      borealisFrostCreak: ['borealis_frost_creak1', 'borealis_frost_creak2', 'borealis_frost_creak3', 'borealis_frost_creak4'],
      borealisIceCrack: ['borealis_ice_crack1', 'borealis_ice_crack2', 'borealis_ice_crack3', 'borealis_ice_crack4', 'borealis_ice_crack5'],
      borealisIceBreak: ['borealis_ice_break1', 'borealis_ice_break2', 'borealis_ice_break3'],
      borealisFrostbite: ['borealis_frostbite1', 'borealis_frostbite2'],
      gravityTractor: ['wither_storm_tractor_beam_activation'],
      gravityPull: ['wither_storm_tractor_beam_pulling'],
      gravitySuck: ['wither_storm_suck_whoosh1', 'wither_storm_suck_whoosh2', 'wither_storm_suck_whoosh3'],
      cosmicRoar: ['wither_storm_roar_beastly1', 'wither_storm_roar_beastly2'],
      cosmicSnarl: ['wither_storm_snarl_short1', 'wither_storm_snarl_short2', 'wither_storm_snarl_short3'],
      cosmicGrowl: ['wither_storm_growl_beastly1', 'wither_storm_growl_beastly2'],
      cataclysmLand: ['wither_storm_fall_hit_large_low1', 'wither_storm_fall_hit_large_low2'],
      cosmicWhoosh: ['wither_storm_metalic_whoosh1', 'wither_storm_metalic_whoosh2'],
      beastChomp: ['wither_storm_chomp', 'wither_storm_bite1'],
      ripBlock: ['wither_storm_rip_block1', 'wither_storm_rip_block2'],
      wardenDig: ['warden_dig'],
      wardenEmerge: ['warden_emerge'],
      guardianBeam: ['guardian_attack_loop'],
      basaltPlode: ['basalt_deltas_plode1', 'basalt_deltas_plode2'],
      basaltTwist: ['basalt_deltas_twist1', 'basalt_deltas_twist2'],
      basaltDebris: ['basalt_deltas_long_debris1'],
      deepslateBreak: ['deepslate_break1', 'deepslate_break2'],
      ancientDebrisDig: ['ancient_debris_dig1', 'ancient_debris_dig2'],
      endPortalActivate: ['end_portal_activation'],
      hoglinAngry: ['hoglin_angry1', 'hoglin_angry2'],
      hoglinAttack: ['hoglin_attack1', 'hoglin_attack2'],
      beastStep: ['ravager_step1', 'ravager_step2', 'ravager_step3'],
      sonicCharge: ['sonic_charge1', 'sonic_charge2'],
      heavySmash: ['heavy_core_break1', 'heavy_core_break2', 'heavy_core_break3', 'heavy_core_break4'],
      earthCrack: ['earth_crack'],
      dripstoneLand: ['dripstone_land1', 'dripstone_land2'],
      conduitAttack: ['conduit_attack1', 'conduit_attack2', 'conduit_attack3'],
      sculkClick: ['sculk_click1', 'sculk_click2', 'sculk_click3'],
      amethystClusterBreak: ['amethyst_cluster_break1', 'amethyst_cluster_break2', 'amethyst_cluster_break3', 'amethyst_cluster_break4'],
      portalDisappear: ['portal_disappear'],
      portalAppear: ['portal_appear'],
      shulkerHit: ['shulker_hit1', 'shulker_hit2', 'shulker_hit3', 'shulker_hit4'],
      tractorBeam: ['tractor_beam_activate'],
      tractorPull: ['tractor_beam_pull'],
      respawnAnchorAmbient: ['respawn_anchor_ambient1', 'respawn_anchor_ambient2', 'respawn_anchor_ambient3'],
      respawnAnchorSet: ['respawn_anchor_set1', 'respawn_anchor_set2'],
      conduitAmbient: ['conduit_ambient'],
      conduitShort: ['conduit_short1', 'conduit_short2', 'conduit_short3'],
      illusionWarp: ['illusion_warp1', 'illusion_warp2'],
      fireworkBlast: ['firework_blast', 'firework_large_blast'],
      fireworkTwinkle: ['firework_twinkle'],
      endPortal: ['end_portal_activation'],
      enderDragonDeath: ['ender_dragon_death'],
      witherSpawn: ['wither_spawn'],
      dragonRoar: ['dragon_roar_long1', 'dragon_roar_long2', 'dragon_roar_short1', 'dragon_roar_short2', 'dragon_roar_short3', 'dragon_roar_pitched'],
      dragonFlame: ['dragon_flamethrow_short1', 'dragon_flamethrow_short2', 'dragon_flamethrow_short3', 'dragon_flamethrow_short4', 'dragon_breath_hiss1', 'dragon_breath_hiss2'],
      heavyCore: ['heavy_core_break1', 'heavy_core_break2', 'heavy_core_break3', 'heavy_core_break4'],
      sonicCharge: ['sonic_charge1', 'sonic_charge2'],
      ghastCharge: ['ghast_charge'],
      ironGolemThrow: ['iron_golem_throw'],
      tridentThunder: ['trident_thunder1', 'trident_thunder2'],
      horseStep: ['horse_step1', 'horse_step2', 'horse_step3', 'horse_step4', 'horse_step5', 'horse_step6'],
      horseArmor: ['iron_golem_hurt1', 'iron_golem_hurt2', 'iron_golem_hurt3'],
      wolfStep: ['wolf_step1', 'wolf_step2', 'wolf_step3', 'wolf_step4', 'wolf_step5'],
      wolfBark: ['wolf_bark1', 'wolf_bark2', 'wolf_bark3'],
      foxAggro: ['fox_aggro1', 'fox_aggro2', 'fox_aggro3'],
      foxScreech: ['fox_screech1', 'fox_screech2'],
      crystalBreak: ['amethyst_break1', 'amethyst_break2', 'amethyst_break3'],
      dragonRoarBeastly: ['wither_storm_roar_beastly1', 'wither_storm_roar_beastly2'],
      dragonHurt: ['ender_dragon_hurt1', 'ender_dragon_hurt2', 'ender_dragon_hurt3'],
      dragonDeath: ['ender_dragon_death'],
      fireballLaunch: ['fireball_launch1', 'fireball_launch2', 'fireball_launch3', 'fireball_launch4'],
      trialOmen: ['trial_omen'],
      tuffBreak: ['tuff_break1', 'tuff_break2'],
      campfire: ['campfire_crackle1', 'campfire_crackle2', 'campfire_crackle3', 'campfire_crackle4'],
    } },
  };
  if (!SET) return;
  const BD = G.BD, V = BD.vrng, DIR = 'audio/' + SET + '/', EXT = SETS[SET].ext, FILES = SETS[SET].files;
  const LONG = 0.35, GAP = { hitFlesh: 0.12, hitHeavy: 0.12, hitBeast: 0.15, shoot: 0.12, draw: 0.25, sheath: 1, mikiriClang: 0.5, mikiriRing: 0.5, horseNeigh: 0.8, horseGallop: 0.16, shieldBreak: 0.15, bladeScrape: 0.2, swordWhoosh: 0.1, maceAir: 0.1, tridentThrow: 0.2, tridentReturn: 0.2, anvilDestroy: 0.5, throwWhoosh: 0.08, heartbeat: 0.22, shadowTeleport: 0.12, fangSnap: 0.15, crit: 0.08, stepSand: 0.1, stepSnow: 0.1, stepGrass: 0.1, stepMud: 0.1, stepWater: 0.1, wood: 0.12, grass: 0.12, splash: 0.2, stun: 0.5, bell: 0.35, click: 0.05, explodeMid: LONG, explodeBig: LONG, slamHeavy: LONG, slamThud: LONG, roarMid: 1, roarBig: 1, death: 1, fire: LONG, ice: LONG, lightning: 0.08, dash: 0.25, teleport: 0.4, buff: 1, projHit: 0.1, ultCast: 1.5, poison: LONG, victory: 1, wolfHowl: 0.8, wolfGrowl: 0.25, wolfDisperse: 0.5, wolfPant: 0.3, beastBite: 0.12, ghostSwoop: 0.2, bowShoot: 0.08, windBurst: 0.15, windDeflect: 0.08, windWhirl: 0.15, windCharge: 0.18, windShoot: 0.06, windAir: 0.12, windPierce: 0.08, windSpin: 0.12, metalWhoosh: 0.06, windShield: 0.2, sakeDrink: 0.5, sakeSpit: 0.5, crystalResonate: 0.15, beaconBeam: 1.0, soulCharge: 0.6, sculkPulse: 0.2, sculkShriek: 0.6, dragonFlap: 0.15, fireballWhoosh: 0.1, fireballImpact: 0.15, omenCurse: 0.4, bellResonate: 0.3, tridentGround: 0.15, bloodSplash: 0.1, spearLunge: 0.12, clothRip: 0.15, battleaxeSwipe: 0.1, witherShoot: 0.1, bloodDrain: 0.25, evokerPrepare: 0.3, dripLava: 0.12, crimsonVoom: 0.4, soulsandVoices: 0.8, crystalSword: 0.2, glintBreath: 0.25, iceCrystalBreak: 0.08, iceCrack: 0.12, shulkerShoot: 0.06, iceChime: 0.15, dragonRoarLong: 0.8, dragonRoarShort: 0.25, dragonBite: 0.12, dragonStomp: 0.15, heavyCoreBreak: 0.12, beaconPower: 0.5, heavyWhoosh: 0.12, dragonFlameLong: 0.6, dragonFlameShort: 0.15, breezeJump: 0.15, breezeLand: 0.15, golemBellow: 0.8, wardenImpact: 0.15, gravityTractor: 0.3, gravityPull: 0.4, gravitySuck: 0.15, cosmicRoar: 0.8, cosmicSnarl: 0.2, cosmicGrowl: 0.4, cataclysmLand: 0.35, cosmicWhoosh: 0.1, beastChomp: 0.2, ripBlock: 0.2, wardenDig: 0.3, wardenEmerge: 0.4, guardianBeam: 0.08, basaltPlode: 0.2, basaltTwist: 0.25, basaltDebris: 0.2, deepslateBreak: 0.1, ancientDebrisDig: 0.1, endPortalActivate: 0.5, hoglinAngry: 0.25, hoglinAttack: 0.15, beastStep: 0.12, sonicCharge: 0.25, heavySmash: 0.15, earthCrack: 0.35, dripstoneLand: 0.04, conduitAttack: 0.12, sculkClick: 0.08, amethystClusterBreak: 0.1, portalDisappear: 0.25, portalAppear: 0.25, shulkerHit: 0.15, tractorBeam: 0.3, tractorPull: 0.3, respawnAnchorAmbient: 0.25, respawnAnchorSet: 0.25, conduitAmbient: 0.3, conduitShort: 0.15, illusionWarp: 0.2, fireworkBlast: 0.1, fireworkTwinkle: 0.15, endPortal: 0.35, enderDragonDeath: 0.5, witherSpawn: 0.5, borealisBreath: 0.22, borealisRoarEpic: 1.0, borealisRoar: 0.6, borealisSlam: 0.3, borealisStomp: 0.18, borealisGrowl: 0.8, borealisFreezeMagic: 0.35, borealisIceCast: 0.15, borealisSnarl: 0.2, borealisBite: 0.15, borealisFrostCreak: 0.1, borealisIceCrack: 0.08, borealisIceBreak: 0.08, borealisFrostbite: 0.18, dragonRoar: 0.8, dragonFlame: 0.4, heavyCore: 0.15, sonicCharge: 0.4, witherSpawn: 1.5, ghastCharge: 0.6, ironGolemThrow: 0.2, tridentThunder: 0.2, horseStep: 0.2, horseArmor: 0.2, wolfStep: 0.1, wolfBark: 0.15, foxAggro: 0.18, foxScreech: 0.25, crystalBreak: 0.08, dragonRoarBeastly: 1.2, dragonHurt: 0.25, dragonDeath: 2.0, fireballLaunch: 0.1, trialOmen: 0.8, tuffBreak: 0.15, campfire: 0.4 };
  // 音檔常帶很長的尾巴（蓄力 7 秒、砸地 6.6 秒…），超過上限就淡出截斷；未列出者播完整檔
  const MAXLEN = { mikiriRing: 1.5, horseNeigh: 1.8, horseGallop: 0.6, shieldBreak: 0.8, bladeScrape: 0.8, swordWhoosh: 0.5, maceAir: 0.6, tridentThrow: 0.8, tridentReturn: 1.2, anvilDestroy: 1.2, throwWhoosh: 0.4, heartbeat: 0.6, shadowTeleport: 0.8, fangSnap: 0.8, ambDesert: 8, ambSnow: 8, ambLake: 6, ambForest: 8, ambWheat: 7, ambSwamp: 8, explodeMid: 1.5, explodeBig: 2.2, slamHeavy: 1.5, slamThud: 1, roarMid: 2, roarBig: 2.2, fire: 1.2, ice: 1.2, lightning: 1.5, shockwave: 1.2, teleport: 1.2, buff: 1.2, ultCast: 1.5, poison: 1.2, wolfHowl: 2.2, wolfGrowl: 1.2, wolfDisperse: 1.0, wolfPant: 0.6, beastBite: 0.5, ghostSwoop: 0.9, bowShoot: 0.5, windBurst: 0.8, windDeflect: 0.6, windWhirl: 1.2, windCharge: 0.7, windShoot: 0.4, windAir: 0.9, windPierce: 0.5, windSpin: 1.2, metalWhoosh: 0.7, windShield: 1.0, sakeDrink: 0.5, sakeSpit: 0.5, crystalResonate: 1.5, beaconBeam: 2.2, soulCharge: 1.8, sculkPulse: 1.0, sculkShriek: 1.5, dragonFlap: 1.2, fireballWhoosh: 0.8, fireballImpact: 1.2, omenCurse: 2.0, bellResonate: 1.5, tridentGround: 1.5, bloodSplash: 0.8, spearLunge: 0.8, clothRip: 0.8, battleaxeSwipe: 0.9, witherShoot: 0.8, bloodDrain: 1.5, evokerPrepare: 1.2, dripLava: 0.8, crimsonVoom: 1.5, soulsandVoices: 2.5, crystalSword: 1.5, glintBreath: 2.2, iceCrystalBreak: 1.2, iceCrack: 1.2, shulkerShoot: 0.8, iceChime: 1.5, dragonRoarLong: 3.2, dragonRoarShort: 1.4, dragonBite: 0.6, dragonStomp: 0.9, heavyCoreBreak: 1.0, beaconPower: 1.8, heavyWhoosh: 0.8, dragonFlameLong: 2.8, dragonFlameShort: 1.0, breezeJump: 0.8, breezeLand: 0.8, golemBellow: 2.2, wardenImpact: 0.8, gravityTractor: 2.0, gravityPull: 2.5, gravitySuck: 1.0, cosmicRoar: 2.5, cosmicSnarl: 1.2, cosmicGrowl: 1.8, cataclysmLand: 2.2, cosmicWhoosh: 0.9, beastChomp: 0.8, ripBlock: 1.2, wardenDig: 1.5, wardenEmerge: 1.6, guardianBeam: 1.2, basaltPlode: 1.5, basaltTwist: 1.8, basaltDebris: 1.5, deepslateBreak: 0.8, ancientDebrisDig: 0.8, endPortalActivate: 2.5, hoglinAngry: 1.0, hoglinAttack: 0.8, beastStep: 0.5, sonicCharge: 1.8, heavySmash: 1.2, earthCrack: 2.0, dripstoneLand: 0.6, conduitAttack: 1.8, sculkClick: 0.5, amethystClusterBreak: 1.0, portalDisappear: 1.2, portalAppear: 1.2, shulkerHit: 0.8, tractorBeam: 2.2, tractorPull: 2.5, respawnAnchorAmbient: 2.0, respawnAnchorSet: 1.5, conduitAmbient: 2.2, conduitShort: 1.0, illusionWarp: 1.2, fireworkBlast: 1.2, fireworkTwinkle: 1.2, endPortal: 2.5, enderDragonDeath: 3.5, witherSpawn: 2.5, borealisBreath: 2.5, borealisRoarEpic: 3.8, borealisRoar: 2.5, borealisSlam: 2.2, borealisStomp: 1.5, borealisGrowl: 2.5, borealisFreezeMagic: 2.4, borealisIceCast: 1.4, borealisSnarl: 0.9, borealisBite: 0.8, borealisFrostCreak: 1.0, borealisIceCrack: 0.8, borealisIceBreak: 0.8, borealisFrostbite: 1.2, dragonRoar: 2.2, dragonFlame: 1.2, heavyCore: 1.0, sonicCharge: 1.8, witherSpawn: 2.5, ghastCharge: 1.8, ironGolemThrow: 0.8, tridentThunder: 2.0, horseStep: 0.5, horseArmor: 0.4, wolfStep: 0.3, wolfBark: 0.6, foxAggro: 0.8, foxScreech: 0.9, crystalBreak: 0.8, dragonRoarBeastly: 3.2, dragonHurt: 1.2, dragonDeath: 4.5, fireballLaunch: 0.8, trialOmen: 2.0, tuffBreak: 0.8, campfire: 2.5 };
  const ELEM = { fire: 'fire', ice: 'ice', lightning: 'lightning', poison: 'poison' }, ELEM_FX = ['projhit', 'trapburst', 'breath', 'flamethrow', 'dragonbreath', 'graftbreath', 'stridingflame', 'grabflame', 'agheelbreath', 'agheelflame', 'agheelrain', 'greyllbridge'];
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
  const seenKindredP2 = new WeakSet();
  const seenWolfDead = new WeakSet();
  const huntMap = new WeakMap();
  const rspMap = new WeakMap();
  const seenMohgP2 = new WeakSet();
  const seenGreyllP2 = new WeakSet();
  const seenGreyllDead = new WeakSet();
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
      else if (b.def && b.def.id === 'kindred') {
        // 二階段轉變：HP 50% 進入 transition，魔狼的飢餓再也壓不住，身形暴漲、燃起鬼火
        if ((b.state === 'transition' || b.phase === 2) && !seenKindredP2.has(b)) {
          seenKindredP2.add(b);
          play('wolfGrowl', 0.9);         // 魔狼低吼蓄力
          play('soulCharge', 0.85);       // 鬼火靈能湧現
          play('ambSnow', 0.7);           // 死亡陰風呼嘯
          play('heartbeat', 0.8);
          setTimeout(() => {
            if (b.hp > 0 && b.state !== 'dead') {
              play('wolfHowl', 1.0);      // 魔狼仰天長嚎——「魔狼，這一場是你的饗宴！」
              play('sculkShriek', 0.85);  // 飢餓靈魂尖嘯
              play('shockwave', 0.95);    // 氣場震懾
              play('slamHeavy', 0.85);
              play('fire', 0.7);          // 鬼火爆散
            }
          }, 800);
        }
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          if (sid === 'arrows') {
            play('windBurst', 0.65);          // 舞動箭矢：神羊翻滾風痕
            play('dash', 0.55);
          } else if (sid === 'frenzy') {
            play('wolfGrowl', 0.8);           // 魔狼狂熱：魔狼盯上獵物低吼
            play('sculkPulse', 0.75);         // 劃出獵場暗影波紋
            play('crystalResonate', 0.6);
          } else if (sid === 'dread') {
            play('ambSnow', 0.7);             // 恐懼蔓延：緩速陰寒死寂
            play('draw', 0.65);               // 鎖定拉弓
            play('bowShoot', 0.6);
          } else if (sid === 'pincer') {
            play('draw', 0.85);               // 雙生夾擊：銀弓拉滿極限弦音
            play('wolfGrowl', 0.75);          // 魔狼對側伏身蓄勢
            play('swordWhoosh', 0.6);
          } else if (sid === 'mark') {
            play('crystalResonate', 0.85);    // 鏡爪印記・宣告：神聖銀色符印降臨清鳴
            play('bell', 0.7);
            play('sculkPulse', 0.65);
          } else if (sid === 'leap') {
            play('windBurst', 0.75);          // 神羊躍步：後躍絨光風爆
            play('ghostSwoop', 0.65);         // 騰空疾掠
            play('bowShoot', 0.6);
          } else if (sid === 'maw') {
            play('wolfGrowl', 0.95);          // 魔狼撕咬：狂暴撲殺直線鎖定
            play('ghostSwoop', 0.85);         // 幽靈巨狼衝殺破空
            play('shockwave', 0.75);
          } else if (sid === 'shadows') {
            play('wolfHowl', 0.95);           // 樹影幢幢：「開始狩獵吧」群狼獵嚎
            play('ambSnow', 0.8);             // 鬼林陰風呼嘯
            play('ghostSwoop', 0.75);
          } else if (sid === 'ult') {
            play('beaconBeam', 1.0);          // 神羊喘息：天界光柱靈音降臨，銀色聖域展開
            play('ultCast', 0.95);            // 圖騰守護共振
            play('crystalResonate', 0.9);     // 符文環神聖清鳴
            play('soulCharge', 0.85);         // 靈魂不死誓約
            play('wolfHowl', 0.8);            // 魔狼隨之發起獵場狂撲
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
        }
        // 追蹤魔狼潰散與重聚
        if (b._wolfAt && !seenWolfDead.has(b)) {
          seenWolfDead.add(b);
          play('wolfDisperse', 0.9);          // 魔狼被打散哀鳴化為黑霧
          play('shadowTeleport', 0.65);       // 黑霧炸散
        } else if (!b._wolfAt && seenWolfDead.has(b)) {
          seenWolfDead.delete(b);
          play('wolfGrowl', 0.75);            // 魔狼自黑霧重新凝聚重聚
          play('shadowTeleport', 0.7);
        }
        // 追蹤神羊喘息（聖域脈動與回血）
        const rsp = b.statuses && BD.getStatus(b, 'respite');
        if (rsp && rsp.rem > 0 && b.hp > 0 && b.state !== 'dead') {
          const nextRsp = rspMap.get(b) || 0;
          if (w.time >= nextRsp) {
            rspMap.set(b, w.time + 0.95);
            play('crystalResonate', 0.5);     // 聖域符文脈動
            play('soulCharge', 0.5);
          }
        } else if (rspMap.has(b)) {
          rspMap.delete(b);
          if (b.hp > 0 && b.state !== 'dead') {
            play('buff', 0.9);                // 神羊喘息結束：聖域光芒斂入體內，生命回復
            play('crystalResonate', 0.85);
            play('bell', 0.75);
          }
        }
        // 追蹤鏡爪印記層數獲取
        const h = b.statuses && BD.getStatus(b, 'hunt');
        const lastSt = huntMap.get(b) || 0;
        const curSt = h ? h.stacks || 1 : 0;
        if (curSt > lastSt) {
          huntMap.set(b, curSt);
          play('crystalResonate', 0.85);      // 獲得鏡爪印記層數：靈魂昇華清鳴
          play('buff', 0.7);
        } else if (!h && lastSt > 0) {
          huntMap.delete(b);
        }
      }
      else if (b.def && b.def.id === 'yasuo') {
        // 二階段轉變開始：HP 50% 進入 transition，畫面慢動作、台詞「死亡就像一陣風，永遠伴隨著我。」
        if ((b.state === 'transition' || b.phase === 2) && !seenP2.has(b)) {
          seenP2.add(b);
          play('sakeDrink', 0.85);    // 喝一口酒葫蘆
          play('bladeScrape', 0.7);   // 拔劍橫置
          setTimeout(() => {
            play('sakeSpit', 0.85);   // 往劍上一噴
            play('draw', 0.8);        // 劍身泛起青白風光鳴響
          }, 350);
          setTimeout(() => {
            play('windBurst', 1.0);   // 周身捲起龍捲風狂暴爆發！
            play('windWhirl', 0.95);
            play('shockwave', 0.9);
            play('buff', 0.85);
          }, 650);
        }
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          if (sid === 'sever_wind') {
            play('sheath', 0.85);      // 納刀・斷風：收刀入鞘
            play('bladeScrape', 0.65); // 刀身摩擦刀鞘金屬聲
            play('windCharge', 0.75);  // 鞘口急速凝風、蓄勢待發
          } else if (sid === 'tempest_tornado') {
            play('windWhirl', 0.75);   // 鋼鐵暴雪・旋風：狂風蓄勢呼嘯
            play('windCharge', 0.7);
          } else if (sid === 'wind_wall') {
            play('windAir', 0.7);      // 風牆：橫刀迎風掃過
            play('swordWhoosh', 0.5);
          } else if (sid === 'storm_breaker') {
            play('dash', 0.7);         // 颶風破：低身極速突進破空
            play('swordWhoosh', 0.65);
          } else if (sid === 'rise_wind') {
            play('windCharge', 0.85);  // 乘風而起：刀由低往前撩，導引狂風
            play('windWhirl', 0.75);
            play('maceAir', 0.6);
          } else if (sid === 'ult') {
            play('ultCast', 0.95);     // 奪命氣息：狂風絕息大招宣告
            play('windWhirl', 0.85);
            play('windAir', 0.75);
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
        }
      }
      else if (b.def && b.def.id === 'draconictreesentinel') {
        // 二階段古龍赤雷覺醒：HP 50% 轉階段（transition），高舉巨盾接引赤雷、戰馬長嘶、龍雷爆裂
        if ((b.state === 'transition' || b.phase === 2) && !seenP2.has(b)) {
          seenP2.add(b);
          play('horseNeigh', 0.95);       // 戰馬高昂長嘶人立
          play('witherSpawn', 0.9);        // 古龍之威降臨低吼
          play('sonicCharge', 0.85);       // 盾牌接引赤雷高頻聚集
          play('dragonRoarLong', 0.8);     // 巨龍咆哮
          setTimeout(() => {
            play('lightning', 1.0);        // 赤雷轟天貫頂！
            play('tridentThunder', 0.95);
            play('slamHeavy', 0.9);
            play('shockwave', 0.85);
          }, 350);
        }
        // 技能起手前搖與蓄勢音效
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          if (sid === 'honed_bolt') {
            play('sonicCharge', 0.85);     // 磨礪雷擊：舉盾引雷高頻蓄電鳴響
            play('bell', 0.7);             // 警示清脆音
          } else if (sid === 'fireball') {
            play('ghastCharge', 0.8);      // 火球：戰馬口中烈焰深吸蓄火
            play('dragonFlameShort', 0.65);
          } else if (sid === 'lightning_smash') {
            play('sonicCharge', 0.8);      // 雷鳴重擊：赤雷聚於巨槌
            play('tridentThunder', 0.75);
            play('heavyWhoosh', 0.7);
          } else if (sid === 'lightning_wave') {
            play('bladeScrape', 0.75);     // 赤雷浪：巨槌割地蓄勢
            play('tridentThunder', 0.7);
          } else if (sid === 'sentinel_slam') {
            play('horseNeigh', 0.8);       // 守衛重砸：戰馬長嘶人立
            play('heavyWhoosh', 0.75);
          } else if (sid === 'shield_swipe' || sid === 'shield_smash') {
            play('ironGolemThrow', 0.75);  // 重盾揮動或下砸破空
            play('maceAir', 0.65);
          } else if (sid === 'lightning_strike') {
            play('sonicCharge', 0.75);     // 赤雷盾掃：盾牌赤雷閃耀
            play('ironGolemThrow', 0.7);
          } else if (sid === 'lunge_strike') {
            play('horseGallop', 0.7);      // 突進槌擊：戰馬加速衝鋒
            play('heavyWhoosh', 0.65);
          } else if (sid === 'ult') {
            play('ultCast', 1.0);          // 大招宣告：天罰古龍雷霆
            play('witherSpawn', 0.95);
            play('dragonRoarLong', 0.9);
            play('tridentThunder', 0.85);
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
        }
      }
      else if (b.def && b.def.id === 'mohg') {
        if ((b.state === 'transition' || b.phase === 2) && !seenMohgP2.has(b)) {
          seenMohgP2.add(b);
          play('omenCurse', 0.95);
          play('bellResonate', 0.9);
          play('soulCharge', 0.85);
          play('soulsandVoices', 0.8);
        }
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          const isP2 = b.phase === 2;
          if (sid === 'trident_sweep') {
            play('tridentThrow', 0.75); play('maceAir', 0.65); if (isP2) play('fire', 0.6);
          } else if (sid === 'ground_thrust') {
            play('spearLunge', 0.85); play('maceAir', 0.7); if (isP2) play('fireballWhoosh', 0.65);
          } else if (sid === 'blood_tax') {
            play('witherShoot', 0.9); play('windSpin', 0.8); play('fireballWhoosh', 0.75);
          } else if (sid === 'bloodflame_talons') {
            play('fangSnap', 0.85); play('clothRip', 0.75); play('fire', 0.65);
          } else if (sid === 'bloodboon_arc') {
            play('evokerPrepare', 0.85); play('dripLava', 0.75); play('heartbeat', 0.7);
          } else if (sid === 'bloodboon_cone') {
            play('evokerPrepare', 0.85); play('fireballWhoosh', 0.75); play('dripLava', 0.7);
          } else if (sid === 'bloodboon_shower') {
            play('soulCharge', 0.85); play('fireballWhoosh', 0.8); play('dripLava', 0.75);
          } else if (sid === 'spear_slam') {
            play('maceAir', 0.9); play('witherShoot', 0.8); if (isP2) play('fireballWhoosh', 0.75);
          } else if (sid === 'rising_slash') {
            play('bladeScrape', 0.85); play('maceAir', 0.75); play('fire', 0.65);
          } else if (sid === 'winged_assault') {
            play('dragonFlap', 1.0); play('windBurst', 0.9); play('clothRip', 0.8);
          } else if (sid === 'bloodflame_charge') {
            play('fireballWhoosh', 0.9); play('maceAir', 0.85); play('windCharge', 0.8);
          } else if (sid === 'plunge') {
            play('dragonFlap', 0.95); play('windBurst', 0.85); play('maceAir', 0.75);
          } else if (sid === 'bloodflame_swing') {
            play('battleaxeSwipe', 0.95); play('maceAir', 0.9); play('fireballWhoosh', 0.85);
          } else if (sid === 'ult') {
            if (isP2) {
              play('dragonFlap', 1.0); play('ultCast', 0.95); play('soulCharge', 0.9); play('omenCurse', 0.9);
            } else {
              play('soulCharge', 0.95); play('ultCast', 0.9); play('heartbeat', 0.85); play('crimsonVoom', 0.8);
            }
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
        }
      }
      else if (b.def && b.def.id === 'adula') {
        // 二階段轉變開始：HP 50% 進入 transition，暗月高懸，輝石龍昂首咬住冰冷魔法大劍
        if ((b.state === 'transition' || b.phase === 2) && !seenP2.has(b)) {
          seenP2.add(b);
          play('beaconBeam', 0.95);       // 暗月降臨，信標魔力光束自天穹灌注
          play('crystalResonate', 0.9);   // 全身青白輝石共振長鳴
          play('sculkPulse', 0.85);       // 幽匿脈衝暗月力場湧現
          play('ambSnow', 0.7);           // 霜寒暴風雪陰風呼嘯
          setTimeout(() => {
            if (b.hp > 0 && b.state !== 'dead') {
              play('dragonRoarLong', 1.0);     // 1.8s roarAt：飛龍昂首長嘯！
              play('crystalSword', 0.95);      // 口中咬出冰冷魔法大劍凝晶脆響！
              play('iceCrystalBreak', 0.85);   // 翼膜結晶同時爆亮綻放
              play('shockwave', 0.8);          // 震懾全場的魔力衝擊波
            }
          }, 1800);
        }
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          if (sid === 'bite') {
            play('dragonBite', 0.8);           // 撕咬起手：巨顎張合
            play('dragonRoarShort', 0.6);      // 低沉龍息
            play('heavyWhoosh', 0.55);
          } else if (sid === 'stomp') {
            play('dragonStomp', 0.85);         // 踏地起手：粗壯龍爪前踏
            play('dragonRoarShort', 0.6);
          } else if (sid === 'wing_slam') {
            play('dragonFlap', 0.85);          // 翼砸起手：黑羽翼膜破風掀起
            play('windBurst', 0.8);
          } else if (sid === 'charge') {
            play('dragonRoarLong', 0.9);       // 怒吼衝撞起手：前衝前憤怒低吼
            play('crystalResonate', 0.75);     // 輝石聚流共振
            play('windCharge', 0.7);
          } else if (sid === 'tail_gore') {
            play('heavyWhoosh', 0.85);         // 甩尾起手：長尾甩過大破空
            play('dragonFlap', 0.7);
            play('dragonRoarShort', 0.55);
          } else if (sid === 'sweeping_breath') {
            play('crystalResonate', 0.85);     // 橫掃吐息起手：喉頭輝石魔力蓄積
            play('windCharge', 0.8);           // 氣流吸入
            play('dragonRoarShort', 0.65);
          } else if (sid === 'tracking_breath') {
            play('crystalResonate', 0.85);     // 追蹤吐息起手：聚束魔力蓄力鳴響
            play('windCharge', 0.75);
          } else if (sid === 'dive_bomb') {
            play('dragonFlap', 0.95);          // 俯衝起手：雙翼下壓狂暴升空
            play('dragonRoarLong', 0.85);
            play('heavyWhoosh', 0.8);
          } else if (sid === 'glintstone_stars') {
            play('crystalResonate', 0.9);      // 輝石之星起手：嘴前凝結巨大晶簇
            play('beaconPower', 0.75);         // 星晶魔力充能
            play('iceChime', 0.7);             // 冰晶清脆微鳴
          } else if (sid === 'strafe') {
            play('dragonFlap', 0.9);           // 側飛掠襲起手：低空振翅疾掠
            play('windBurst', 0.85);
            play('glintBreath', 0.75);
          } else if (sid === 'moonblade') {
            play('crystalSword', 1.0);         // 亞杜拉月刃起手：咬出冰冷魔法大劍！凝劍破空！
            play('dragonFlap', 0.9);           // 升空俯衝
            play('dragonRoarLong', 0.85);
            play('crystalResonate', 0.8);
            play('iceChime', 0.75);
          } else if (sid === 'ult') {
            play('beaconBeam', 1.0);           // 大招起手：天穹魔力光柱降臨
            play('crystalResonate', 0.95);     // 滿身結晶狂暴共振
            play('ultCast', 0.9);              // 終極魔法施放
            play('dragonRoarLong', 0.9);       // 昂首長嘯
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
        }
      }
      else if (b.def && b.def.id === 'borealis') {
        // 二階段轉變開始：HP 50% 進入 transition，白霧再臨演出
        if ((b.state === 'transition' || b.phase === 2) && !seenP2.has(b)) {
          seenP2.add(b);
          play('borealisFrostCreak', 0.9);   // 背脊霜線急速凝結龜裂，極寒張力
          play('borealisGrowl', 0.85);        // 喉間深沉寒息低鳴
          play('ambSnow', 0.8);               // 冰結湖暴雪狂風呼嘯
          setTimeout(() => {
            if (b.hp > 0 && b.state !== 'dead') {
              play('borealisRoarEpic', 1.0);  // 昂首將整片寒霧吼向湖面！震撼全場的極寒巨龍長吼
              play('shockwave', 0.9);         // 寒氣衝擊波擴散
              play('borealisIceBreak', 0.85); // 湖面浮冰隨吼聲寸寸崩碎
              play('windBurst', 0.8);
            }
          }, 1850); // 對齊 borealis.js phase2.roarAt = 1.85s
        }
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          if (sid === 'ice_bite') {
            play('borealisSnarl', 0.8);       // 冰牙前噬：龍吻猛張極寒嘶吼
            play('dragonFlap', 0.5);          // 翼腕下壓借力前傾
          } else if (sid === 'wing_sweep') {
            play('dragonFlap', 0.85);         // 霜翼橫擊：粗重翼腕排山倒海揮出
            play('windBurst', 0.75);          // 狂風呼嘯
            play('metalWhoosh', 0.6);
          } else if (sid === 'ice_stomp') {
            play('borealisGrowl', 0.75);      // 踏冰揚霧：喉間沉吼蓄力
            play('maceAir', 0.7);             // 重爪高抬下墜破空
          } else if (sid === 'tail_whip') {
            play('dragonFlap', 0.8);          // 迴身霜尾：粗壯龍尾回旋掃過
            play('windSpin', 0.85);           // 龍身回旋烈風
            play('borealisSnarl', 0.7);       // 回首連咬前低吼
          } else if (sid === 'ice_breath') {
            play('windCharge', 0.8);          // 冰霧直息：口前深吸寒霧
            play('borealisFrostCreak', 0.75); // 喉腔冰晶凝結清脆聲
          } else if (sid === 'sweeping_breath') {
            play('windCharge', 0.85);         // 橫掃冰息：昂首蓄霧
            play('dragonFlap', 0.7);          // 雙翼大張撐地蓄勢
            play('borealisFrostCreak', 0.75);
          } else if (sid === 'retreat_breath') {
            play('dragonFlap', 0.9);          // 後撤俯息：雙翼暴振後掠
            play('windBurst', 0.85);          // 烈風推動身軀後躍
            play('windCharge', 0.75);         // 滯空急吸寒氣
          } else if (sid === 'aerial_breath') {
            play('dragonFlap', 0.95);         // 懸空覆霜：騰空懸停振翼
            play('windCharge', 0.85);         // 冰龍長吸
            play('borealisGrowl', 0.75);      // 空中威懾沉鳴
          } else if (sid === 'dive_bomb') {
            play('dragonFlap', 1.0);          // 冰翼撲落：巨翼劇烈拍擊直衝天際
            play('windBurst', 0.9);
            play('dash', 0.8);                // 騰空躍起
          } else if (sid === 'freezing_roar') {
            play('borealisGrowl', 0.85);      // 凍結咆哮：背脊寒光劇烈蓄能
            play('borealisFrostCreak', 0.85); // 霜線骨節節節亮起鳴響
            play('windCharge', 0.8);
          } else if (sid === 'borealis_mist') {
            play('borealisFreezeMagic', 0.95);// 龍饗・玻列琉斯的冰霧：遠古龍饗幻影降臨神聖共振
            play('borealisGrowl', 0.85);      // 幻影巨首低鳴
            play('bell', 0.7);
            play('crystalResonate', 0.8);
          } else if (sid === 'ult') {
            play('borealisFreezeMagic', 1.0); // 永凍白幕 / 冰海葬場：終極大招全場冰封神鳴
            play('ultCast', 0.95);            // 絕景儀式展開
            play('borealisFrostCreak', 0.9);  // 萬年堅冰凝結爆裂聲
            play('ambSnow', 0.9);             // 終極冰暴呼嘯
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
        }
      }
      else if (b.def && b.def.id === 'fallingstar') {
        // 二階段轉變（HP <= 50% 進入 transition 或 phase 2）
        if ((b.state === 'transition' || b.phase === 2) && !seenP2.has(b)) {
          seenP2.add(b);
          play('endPortalActivate', 0.95);  // 星門共鳴：眼核轉為深紫，重力場異變
          play('cosmicRoar', 0.95);         // 隕星成獸狂吼宣告
          play('shockwave', 0.85);
          play('basaltTwist', 0.75);
        }
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          if (sid === 'head_swing') {
            play('hoglinAttack', 0.8);      // 彎顎連掃：狂獸低吼蓄勢
            play('cosmicWhoosh', 0.65);
          } else if (sid === 'tail_sweep') {
            play('cosmicSnarl', 0.75);      // 星刺尾掃：長尾晶刺震顫低嘶
            play('throwWhoosh', 0.6);
          } else if (sid === 'fore_stomp') {
            play('hoglinAngry', 0.85);      // 人立踏碎：怒吼後腿立起
            play('maceAir', 0.65);
          } else if (sid === 'hind_kick') {
            play('cosmicSnarl', 0.7);       // 後蹄踐踏：短促防禦示警
          } else if (sid === 'gouge') {
            play('wardenDig', 0.85);        // 顎掘衝撕：雙顎狠狠插地
            play('ripBlock', 0.8);
          } else if (sid === 'bite') {
            play('cosmicGrowl', 0.8);       // 擒顎重摔：後躍拉開蓄勢
            play('wardenEmerge', 0.7);
          } else if (sid === 'rock_throw') {
            play('wardenDig', 0.9);         // 掘岩拋射：埋頭掘入碎岩
            play('basaltTwist', 0.75);
          } else if (sid === 'beast_roll') {
            play('wardenEmerge', 0.95);     // 星球墜擊：四足蹬地暴起騰空
            play('cosmicWhoosh', 0.85);
            play('sonicCharge', 0.75);
          } else if (sid === 'gravitas') {
            play('gravityTractor', 0.95);   // 引力崩落：引力場啟動轟鳴
            play('sonicCharge', 0.85);
            play('cosmicGrowl', 0.8);
          } else if (sid === 'gravity_bolt') {
            play('sonicCharge', 0.85);      // 重力雷：紫雷聚能高頻震鳴
            play('crystalResonate', 0.8);
          } else if (sid === 'charge') {
            play('hoglinAngry', 0.9);       // 狂牛三連衝：刨蹄怒吼衝鋒起步
            play('ravagerRoar', 0.8);
          } else if (sid === 'reverse_gravity') {
            play('gravityTractor', 0.95);   // 重力反轉：反重力奇異點展開
            play('endPortalActivate', 0.9);
            play('cosmicGrowl', 0.85);
          } else if (sid === 'gravity_ray') {
            play('conduitAttack', 0.9);     // 重力光束：左肩凝聚重力球
            play('sonicCharge', 0.85);
            play('crystalResonate', 0.8);
          } else if (sid === 'ult') {
            play('endPortalActivate', 1.0); // 終極大招：無光彼方／重力崩壞開場
            play('cosmicRoar', 1.0);
            play('gravityTractor', 0.95);
            play('sonicCharge', 0.9);
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
        }
      }
      else if (b.def && b.def.id === 'agheel') {
        // 二階段轉變（龍心熾燃）：暗幕下胸口龍心搏動，隨後朝天噴出巨大火柱！
        if ((b.state === 'transition' || b.phase === 2) && !seenP2.has(b)) {
          seenP2.add(b);
          // 4 次心跳聲與熱浪收縮
          for (let i = 0; i < 4; i++) {
            setTimeout(() => {
              play('heartbeat', 0.9);
              play('fireballWhoosh', 0.6);
            }, i * 340);
          }
          // 1.7 秒時火柱沖天、昂首長嘯
          setTimeout(() => {
            play('dragonRoarLong', 1.0);
            play('golemBellow', 0.95);
            play('dragonFlameLong', 0.9);
            play('explodeBig', 0.85);
            play('shockwave', 0.85);
            play('earthCrack', 0.8);
          }, 1700);
        }
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          if (sid === 'bite') {
            play('dragonRoarShort', 0.7);     // 低頭喉音、張開巨顎
            play('maceAir', 0.5);
          } else if (sid === 'stomp') {
            play('dragonStomp', 0.75);        // 單足抬起沉重踏地
            play('dragonRoarShort', 0.6);
          } else if (sid === 'wing_slam') {
            play('dragonFlap', 0.85);         // 雙翼高舉展翅破空
            play('windBurst', 0.7);
          } else if (sid === 'charge') {
            play('dragonRoarLong', 0.9);      // 昂首長嘯咆哮起跑
            play('windBurst', 0.75);
          } else if (sid === 'tail_gore') {
            play('windWhirl', 0.75);          // 壓低身形旋身風壓
            play('maceAir', 0.65);
          } else if (sid === 'sweeping_breath') {
            play('windCharge', 0.85);         // 長頸後縮深吸火息
            play('dragonRoarShort', 0.7);
          } else if (sid === 'tracking_breath') {
            play('windCharge', 0.8);          // 喉頭聚火吸氣
            play('dragonFlameShort', 0.65);
          } else if (sid === 'dive_bomb') {
            play('breezeJump', 0.85);         // 拔地拔升跳躍
            play('dragonFlap', 0.85);
            play('dragonRoarShort', 0.7);
            // 空中三拍振翅（原作 Dive Bomb 標誌性三拍）
            setTimeout(() => play('dragonFlap', 0.8), 380);
            setTimeout(() => play('dragonFlap', 0.85), 780);
            setTimeout(() => play('dragonFlap', 0.9), 1180);
          } else if (sid === 'retreat_flame') {
            play('breezeJump', 0.8);          // 後躍浮空
            play('dragonFlap', 0.8);
          } else if (sid === 'strafe') {
            play('breezeJump', 0.8);          // 後跳滑翔升空
            play('dragonFlap', 0.85);
            play('ghostSwoop', 0.7);
          } else if (sid === 'agheel_flame') {
            play('dragonRoarLong', 0.95);     // 高空長嘯
            play('dragonFlap', 0.9);
            play('ultCast', 0.75);
          } else if (sid === 'ult') {
            play('ultCast', 1.0);             // 焚湖之翼 / 龍餐・亞基爾之炎宣告
            play('dragonRoarLong', 0.95);
            play('golemBellow', 0.9);
            play('dragonFlap', 0.9);
            if (b.phase === 2) play('ambSnow', 0.6); // 龍餐暴怒陰風
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
        }
      }
      else if (b.def && b.def.id === 'redwolf') {
        // 二階段轉變：半血時仰天長嚎，赤鬃炸裂、輝石劍冠展開
        if ((b.state === 'transition' || b.phase === 2) && !seenP2.has(b)) {
          seenP2.add(b);
          play('wolfHowl', 1.0);        // 赤鬃狂嘯：紅狼仰天長嚎
          play('crystalResonate', 0.85); // 輝石劍陣四散成冠
          play('shockwave', 0.8);       // 魔力氣場爆發震波
          play('windBurst', 0.7);
        }
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          const isP2 = b.phase === 2;
          if (sid === 'bite') {
            play('wolfGrowl', 0.6);      // 連續撕咬起手：低沉恐嚇低吼
            play('wolfBark', 0.45);
          } else if (sid === 'pounce') {
            play('foxAggro', 0.8);       // 飛撲噬咬起跳前搖：暴怒狂吠破空
            play('dash', 0.55);
          } else if (sid === 'sword_combo') {
            play('metalWhoosh', 0.75);   // 橙金咬劍蓄勢：口含巨劍亮刃魔力蜂鳴
            play('swordWhoosh', 0.65);
          } else if (sid === 'sword_spin') {
            play('metalWhoosh', 0.85);   // 咬劍迴旋大掃前搖：全身蓄力低伏、魔刃劇烈共鳴
            play('windCharge', 0.65);
          } else if (sid === 'leap_sword') {
            play('breezeJump', 0.9);     // 騰空下劈起跳：狂風破空帶入高空
            play('foxScreech', 0.75);    // 躍起利嘯
            play('maceAir', 0.8);        // 巨劍升空呼嘯
          } else if (sid === 'glint_array') {
            play('illusionWarp', 0.8);   // 延遲劍陣起手：學院秘術陣紋展開
            play('crystalResonate', 0.7);
          } else if (sid === 'glint_step') {
            play('teleport', 0.65);      // 側躍留置：幻影殘相閃逝
            play('dash', 0.6);
            play('crystalBreak', 0.4);   // 殘影輝劍凝成
          } else if (sid === 'comet') {
            play('sonicCharge', 0.9);    // 輝石彗星蓄力：深層魔力劇烈壓縮震鳴
            play('soulCharge', 0.8);
            play('crystalResonate', 0.75);
          } else if (sid === 'cross_hunt') {
            play('foxAggro', 0.85);      // 交錯撲殺起手：魔陣浮空與暴戾狼吼
            play('illusionWarp', 0.75);
            play('crystalResonate', 0.7);
          } else if (sid === 'ult') {
            play('wolfHowl', 1.0);        // 赤狼・輝劍獵場：王之長嚎！全場共鳴！
            play('beaconBeam', 0.95);     // 蒼金劍冠升騰沖天
            play('bellResonate', 0.85);   // 學院鐘樓肅穆共鳴
            play('crystalResonate', 0.85);
            play('shockwave', 0.8);
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
        }
      }
      else if (b.def && b.def.id === 'greyll') {
        // 二階段轉變「灰母血脈」：HP <= 50% 觸發 transition
        if ((b.state === 'transition' || b.phase === 2) && !seenGreyllP2.has(b)) {
          seenGreyllP2.add(b);
          play('heartbeat', 0.95);
          play('soulCharge', 0.9);
          play('trialOmen', 0.85);
          setTimeout(() => {
            if (b.hp > 0 && b.state !== 'dead') {
              play('dragonRoarLong', 1.0);
              play('dragonRoarBeastly', 0.95);
              play('shockwave', 0.95);
              play('earthCrack', 0.9);
              play('fire', 0.85);
            }
          }, 1700);
        }
        // 桂雷爾死亡：終界龍巨響與烈焰崩解
        if ((b.hp <= 0 || b.state === 'dead') && !seenGreyllDead.has(b)) {
          seenGreyllDead.add(b);
          play('dragonDeath', 1.0);
          play('dragonRoarBeastly', 0.9);
          play('earthCrack', 0.85);
          play('explodeBig', 0.8);
        }
        const curInst = b.inst;
        const prevInst = lastSkill.get(b);
        if (curInst && curInst !== prevInst) {
          lastSkill.set(b, curInst);
          const sid = curInst.skill && curInst.skill.id;
          if (sid === 'bite') {
            play('dragonRoarShort', 0.75);
            play('dragonFlap', 0.6);
          } else if (sid === 'stomp') {
            play('dragonStomp', 0.8);
            play('heavyWhoosh', 0.65);
          } else if (sid === 'wing_slam') {
            play('dragonFlap', 0.85);
            play('heavyWhoosh', 0.75);
          } else if (sid === 'charge') {
            play('dragonRoarShort', 0.85);
            play('golemBellow', 0.8);
            play('dragonStomp', 0.75);
          } else if (sid === 'tail_gore') {
            play('heavyWhoosh', 0.85);
            play('dragonFlap', 0.7);
          } else if (sid === 'sweeping_breath') {
            play('windCharge', 0.85);
            play('fireballWhoosh', 0.8);
            play('dragonRoarShort', 0.7);
          } else if (sid === 'tracking_breath') {
            play('windCharge', 0.8);
            play('fireballWhoosh', 0.75);
          } else if (sid === 'dive_bomb') {
            play('breezeJump', 0.85);
            play('dragonFlap', 0.9);
            play('heavyWhoosh', 0.85);
            play('dragonRoarShort', 0.8);
            // 空中三拍振翅
            setTimeout(() => play('dragonFlap', 0.8), 380);
            setTimeout(() => play('dragonFlap', 0.85), 780);
            setTimeout(() => play('dragonFlap', 0.9), 1180);
          } else if (sid === 'retreat_flame') {
            play('dragonFlap', 0.85);
            play('heavyWhoosh', 0.8);
            play('dash', 0.75);
          } else if (sid === 'strafe') {
            play('dragonFlap', 0.9);
            play('heavyWhoosh', 0.85);
            play('fireballWhoosh', 0.8);
          } else if (sid === 'bridge_inferno') {
            play('dragonRoarLong', 0.95);
            play('golemBellow', 0.9);
            play('fireballWhoosh', 0.85);
          } else if (sid === 'greyoll_roar') {
            play('heartbeat', 0.85);
            play('trialOmen', 0.9);
            play('dragonRoarBeastly', 0.85);
          } else if (sid === 'ash_storm') {
            play('windWhirl', 0.9);
            play('heavyWhoosh', 0.85);
          } else if (sid === 'ult') {
            play('ultCast', 1.0);
            play('dragonRoarLong', 0.95);
            play('dragonRoarBeastly', 0.9);
            play('trialOmen', 0.85);
          }
        } else if (!curInst && prevInst) {
          lastSkill.delete(b);
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
        } else if (b.def && b.def.id === 'redwolf') {
          play('wolfStep', 0.4); // 拉達岡的紅狼：敏捷四足肉墊踏地步態
        } else if (b.def && b.def.id === 'draconictreesentinel') {
          play('horseStep', 0.42);  // 龍裝大樹守衛重裝戰馬蹄聲
          play('horseArmor', 0.22); // 龍鱗馬鎧晃動碰撞聲
        } else if (b.def && b.def.id === 'agheel') {
          play('dragonStomp', 0.45); // 飛龍亞基爾雙爪與翼腕撐地，沉重震地爪步
          play(g[0], Math.min(0.3, 0.12 + (b.r || 30) / 400));
        } else if (b.def && b.def.id === 'borealis') {
          play('borealisStomp', 0.35); // 玻列琉斯巨大冰龍爪踏在冰結湖上的沉重碎冰步
        } else if (b.def && b.def.id === 'fallingstar') {
          play('beastStep', 0.35);  // 墜星成獸：沉重四足黑岩鐵蹄踐踏
          play(g[0], 0.25);
        } else if (b.def && b.def.id === 'greyll') {
          play('dragonStomp', 0.4); // 飛龍桂雷爾粗壯龍爪前踏大橋步
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
      if (kind === 'glintblade') {
        play('crystalResonate', 0.55); // 輝劍破空激射
        play('throwWhoosh', 0.45);
        play('windShoot', 0.4);
        return;
      }
      if (kind === 'glintcomet') {
        play('shockwave', 0.85);       // 輝石彗星發射音爆
        play('windShoot', 0.8);        // 巨型魔彈噴射
        play('throwWhoosh', 0.75);
        play('crystalBreak', 0.7);     // 輝石劇烈破發
        play('crystalResonate', 0.65);
        return;
      }
      if (kind === 'starrock') {
        play('deepslateBreak', 0.8);    // 黑岩隕星：巨石甩出破空震碎
        play('throwWhoosh', 0.75);
        play('basaltDebris', 0.65);
        return;
      }
      if (kind === 'firerock') {
        play('fireballWhoosh', 0.85); // 龍火岩：呼嘯破空墜落
        play('dragonFlameShort', 0.7);
        play('throwWhoosh', 0.65);
        return;
      }
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
        const isKindred = !!(owner && (owner.def && owner.def.id === 'kindred' || owner.owner && owner.owner.def && owner.owner.def.id === 'kindred'));
        const isKindredP2 = isKindred && (owner.phase === 2 || (owner.owner && owner.owner.phase === 2));
        if (isKindred) {
          play('bowShoot', 0.7);      // 神羊銀弓射擊弦音破空
          play('throwWhoosh', 0.45);
          if (isKindredP2) play('crystalResonate', 0.4); // 二階段血色符印箭微鳴
        } else {
          play('throwWhoosh', 0.65);   // 諸刃手裏劍 / 苦無投擲破空
          play('shoot', 0.4);
          if (isItachiP2) play('fire', 0.55); // 二階段火遁包覆苦無／手裏劍
        }
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
      } else if (kind === 'tornado') {
        play('windWhirl', 0.85);       // 鋼鐵暴雪・旋風：狂暴氣旋呼嘯破空
        play('throwWhoosh', 0.75);
        play('windBurst', 0.65);
      } else if (kind === 'windblade') {
        play('metalWhoosh', 0.85);     // 斷風風刃：極速風刃貫穿裂空
        play('windShoot', 0.8);
        play('swordWhoosh', 0.75);
        if (a && a.n > 1) play('windBurst', 0.6); // 二階段三道扇形散開
      } else if (kind === 'glintshard') {
        play('shulkerShoot', 0.85);    // 追蹤星晶射出破空
        play('crystalResonate', 0.65); // 輝石微鳴
        play('throwWhoosh', 0.55);
      } else if (kind === 'moonwave') {
        play('crystalSword', 0.95);    // 月刃霜寒劍波激射出
        play('windPierce', 0.85);      // 冰鋒貫穿破空
        play('swordWhoosh', 0.75);
        play('iceChime', 0.7);         // 寒月冰晶清鳴
      } else if (kind === 'glintrock') {
        play('throwWhoosh', 0.75);     // 天外星晶雨劃破天際
        play('crystalResonate', 0.6);
      } else if (kind === 'redwave') {
        play('tridentThunder', 0.85);  // 赤雷浪：地面雷光波浪爆裂蔓延
        play('shockwave', 0.8);
        play('maceAir', 0.7);
      } else if (kind === 'fire' || (owner && owner.def && owner.def.id === 'draconictreesentinel' && a && a.lob)) {
        play('fireballLaunch', 0.85);  // 龍息火球噴射離口呼嘯
        play('fireballWhoosh', 0.75);
      } else if (kind === 'deathblade') {
        play('crimsonVoom', 0.9);      // 命定之死・死亡之刃：紅黑月牙刀波破空呼嘯
        play('swordWhoosh', 0.85);
        play('fireballWhoosh', 0.7);
      } else if (kind === 'blackknife_dagger') {
        play('throwWhoosh', 0.75);     // 黑刀暗刃：扇形飛刀疾射
        play('swordWhoosh', 0.6);
      }
    },
    fx(id, category, o) {
      if (id.startsWith('bk_')) {
        if (id === 'bk_slash') {
          play('swordWhoosh', 0.8); play('slash', 0.75); play('fire', 0.45);
        } else if (id === 'bk_xslash') {
          play('slashHeavy', 0.9); play('swordWhoosh', 0.85); play('crit', 0.75); play('crimsonVoom', 0.65);
        } else if (id === 'bk_thrust') {
          play('spearLunge', 0.88); play('windPierce', 0.8); play('crit', 0.7);
        } else if (id === 'bk_cartwheel') {
          play('windSpin', 0.85); play('swordWhoosh', 0.8); play('clothRip', 0.65);
        } else if (id === 'bk_upcut') {
          play('bladeScrape', 0.85); play('slashHeavy', 0.9); play('fireballWhoosh', 0.75);
        } else if (id === 'bk_deathwave_cast') {
          play('soulCharge', 0.85); play('crimsonVoom', 0.8); play('breezeJump', 0.7);
        } else if (id === 'bk_deathwave' || id === 'bk_deathwave_hit') {
          play('fireballImpact', 0.85); play('slashHeavy', 0.8); play('crimsonVoom', 0.75);
        } else if (id === 'bk_veil_vanish' || id === 'bk_ambush') {
          play('shadowTeleport', 0.82); play('illusionWarp', 0.7); play('clothRip', 0.55);
        } else if (id === 'bk_veil_appear') {
          play('shadowTeleport', 0.88); play('swordWhoosh', 0.78); play('crit', 0.65);
        } else if (id === 'bk_backflip') {
          play('breezeJump', 0.8); play('dash', 0.72); play('throwWhoosh', 0.65);
        } else if (id === 'bk_plunge_takeoff') {
          play('breezeJump', 0.9); play('windBurst', 0.8); play('shadowTeleport', 0.7);
        } else if (id === 'bk_plunge_slam' || id === 'bk_plunge') {
          play('slamHeavy', 0.95); play('tridentGround', 0.9); play('shockwave', 0.88); play('crimsonVoom', 0.8);
        } else if (id === 'bk_grab_pin') {
          play('crit', 0.95); play('fangSnap', 0.9); play('omenCurse', 0.85); play('heartbeat', 0.85);
        } else if (id === 'bk_grab_burst') {
          play('explodeBig', 0.95); play('slashHeavy', 0.95); play('shockwave', 0.9); play('bloodSplash', 0.85);
        } else if (id === 'bk_brand_burst') {
          play('omenCurse', 0.9); play('explodeMid', 0.85); play('shockwave', 0.8); play('crimsonVoom', 0.8);
        } else if (id === 'bk_alecto_whirl') {
          play('windSpin', 0.92); play('slashHeavy', 0.9); play('fireballWhoosh', 0.8);
        } else if (id === 'bk_alecto_storm' || id === 'bk_helical_storm') {
          play('slamHeavy', 0.95); play('omenCurse', 0.95); play('windWhirl', 0.9); play('slashHeavy', 0.95);
          setTimeout(() => { play('explodeBig', 0.95); play('shockwave', 0.95); play('crimsonVoom', 0.9); }, 320);
        } else if (id === 'bk_awaken') {
          play('omenCurse', 1.0); play('witherSpawn', 0.92); play('shockwave', 0.95); play('crimsonVoom', 0.9);
        } else if (id === 'bk_ult_phantom') {
          play('shadowTeleport', 0.78); play('swordWhoosh', 0.82); play('windPierce', 0.75);
        } else if (id === 'bk_ult_cataclysm' || id === 'bk_ult') {
          play('witherSpawn', 1.0); play('explodeBig', 1.0); play('shockwave', 1.0); play('slamHeavy', 0.95); play('omenCurse', 0.95);
        }
        return;
      }
      if (id === 'dtsawaken') {
        play('witherSpawn', 0.95); play('lightning', 0.95); play('shockwave', 0.9); play('dragonRoarLong', 0.85); return;
      }
      if (id === 'dtsbolt') {
        play('lightning', 0.95); play('tridentThunder', 0.9); play('shockwave', 0.8); play('wardenImpact', 0.75); return;
      }
      if (id === 'dtssmite') {
        play('slamHeavy', 0.95); play('tridentThunder', 0.9); play('heavyCore', 0.85); play('shockwave', 0.85); return;
      }
      if (id === 'dtswave') {
        play('tridentThunder', 0.8); play('shockwave', 0.75); play('fireballWhoosh', 0.6); return;
      }
      if (id.startsWith('astel')) {
        if (id === 'astelbite') {
          play('fangSnap', 0.85);             // 彎鉗閉合：利齒咬合
          play('sculkClick', 0.7);            // 幽匿顎骨脆響
          play('hitHeavy', 0.55);             // 沉重骨骼夾擊
        } else if (id === 'astelswipe') {
          play('heavyWhoosh', 0.85);          // 星雲橫掃：細長骨臂破空大揮
          play('windWhirl', 0.7);             // 星雲紫霧渦流
          play('crystalResonate', 0.55);      // 拖曳星塵晶屑微鳴
        } else if (id === 'astelshove') {
          play('shockwave', 0.8);             // 星雲推掌：前方掌風氣浪爆發
          play('maceAir', 0.75);              // 沉重空爆呼嘯
          play('crystalResonate', 0.5);       // 紫霧星點消散
        } else if (id === 'asteltail') {
          play('windSpin', 0.85);             // 星屑尾鞭：彩色蠍尾長空甩擊
          play('maceAir', 0.8);               // 越過頭頂之沉重破空
          play('crystalResonate', 0.65);      // 星球鏈共振流光
        } else if (id === 'astelstab') {
          play('amethystClusterBreak', 0.95); // 星尾連刺：尾尖紫晶硬刺刺入地面
          play('heavyCoreBreak', 0.85);       // 刺裂地表岩石
          play('earthCrack', 0.8);            // 放射狀地面裂紋
          play('slamThud', 0.65);
        } else if (id === 'astelvanish') {
          play('portalDisappear', 0.9);       // 化球瞬移：身形向內坍縮、虛空星光消散
          play('crystalResonate', 0.65);      // 殘留紫光微鳴
          play('dash', 0.45);
        } else if (id === 'astelgather') {
          play('sonicCharge', 0.9);           // 聚流蓄能：藍眼亮起、虛空粒子急聚
          play('beaconPower', 0.8);           // 能量信標共鳴
          play('crystalResonate', 0.6);       // 星光環繞匯聚
        } else if (id === 'astelbeam') {
          play('shockwave', 1.0);             // 宇宙光束：毀滅性紫白光柱貫穿震波
          play('tractorBeam', 0.95);          // 虛空引力牽引聲
          play('beaconBeam', 0.9);            // 信標光束破空音爆
          play('maceAir', 0.7);
        } else if (id === 'astelorbs') {
          play('respawnAnchorAmbient', 0.85); // 臂端聚球：六臂人手末端聚起旋轉能量球
          play('sculkPulse', 0.75);           // 幽匿脈動越轉越急
          play('crystalResonate', 0.65);
        } else if (id === 'astelwave') {
          play('shockwave', 0.85 + (o.radius > 400 ? 0.12 : 0)); // 黑暗波：貼地推進環形衝擊
          play('earthCrack', 0.8);            // 地面碎裂
          play('sculkPulse', 0.7);            // 暗能量脈動
          play('slamHeavy', 0.65);
        } else if (id === 'astelgravity') {
          play('shulkerHit', 0.9);            // 重力氣泡：漂浮重力氣泡托起敵身
          play('soulCharge', 0.8);            // 靈魂充能共鳴
          play('crystalResonate', 0.65);
        } else if (id === 'astelcrush') {
          play('slamHeavy', 1.0);             // 重力壓碎：氣泡驟縮向下猛壓粉碎！
          play('slamThud', 0.95);
          play('wardenImpact', 0.95);         // 監守者重壓衝擊
          play('heavyCoreBreak', 0.85);       // 地面同心碎裂
          play('shockwave', 0.85);
        } else if (id === 'astelgrab') {
          play('wardenImpact', 1.0);          // 俯衝擒抱：自天而降合鉗重砸地面！
          play('slamHeavy', 0.95);
          play('fangSnap', 0.9);              // 雙彎鉗暴力咬合
          play('shockwave', 0.85);
        } else if (id === 'astelclone') {
          play('illusionWarp', 0.85);         // 星影分身：四散分身自虛空浮出
          play('shadowTeleport', 0.7);        // 暗影瞬步
          play('fangSnap', 0.6);              // 虛影鉗擊合攏
        } else if (id === 'astelstarburst') {
          play('fireworkBlast', 0.85);        // 星屑爆散：後掠遺留星屑球依序爆開
          play('amethystClusterBreak', 0.75); // 彩色晶片炸裂
          play('conduitShort', 0.65);         // 潮湧清響
        } else if (id === 'astelportal') {
          play('endPortal', 1.0);             // 星空傳送門：面前撕開巨大終界傳送門
          play('beaconPower', 0.85);          // 能量光陣急速充能
          play('respawnAnchorSet', 0.75);     // 異維度錨定音
        } else if (id === 'astelmeteor') {
          play('explodeBig', 0.9);            // 隕星墜落：天外彩色隕石轟擊炸裂
          play('basaltPlode', 0.85);          // 玄武岩質爆碎
          play('heavyCoreBreak', 0.8);        // 碎星爆破
          play('earthCrack', 0.7);            // 地面焦黑撞擊坑
        } else if (id === 'astelpull') {
          play('tractorPull', 1.0);           // 星空吸引：引力旋渦全方位強力牽引
          play('windCharge', 0.85);           // 逆向氣流收束
          play('windWhirl', 0.8);             // 漩渦狂風席捲
          play('sculkPulse', 0.75);           // 核心吸力共振
        } else if (id === 'astelawaken') {
          play('enderDragonDeath', 1.0);      // 天外流星／大招演出：終界龍死滅之虛空長嘯！
          play('witherSpawn', 0.95);          // 凋靈降世天地色變
          play('roarBig', 0.85);              // 監守者重吼共鳴
          play('shockwave', 0.85);
        } else if (id === 'astelstardust') {
          play('crystalResonate', 0.8);       // 星屑流散（被動）：腳邊升起旋轉彩色星屑
          play('conduitAmbient', 0.65);       // 潮湧微光環境音
          play('shulkerHit', 0.5);            // 拖曳減速微鳴
        }
        return;
      }
      if (id.startsWith('adula')) {
        if (id === 'adulaland') {
          play('slamHeavy', 1.0);             // 落地爆晶：龍身巨力砸地
          play('iceCrystalBreak', 0.95);      // 冰藍結晶柱爆裂
          play('shockwave', 0.9);             // 雙層青白震波
          play('crystalResonate', 0.85);
          play('heavyCoreBreak', 0.8);
        } else if (id === 'adulamoon') {
          play('crystalSword', 1.0);          // 亞杜拉月刃：魔法大劍怒斬
          play('iceCrack', 0.95);             // 地面霜白裂紋撕裂
          play('iceCrystalBreak', 0.9);       // 冰晶爆散
          play('shockwave', 0.85);            // 月刃衝擊波
          play('iceChime', 0.8);              // 霜月清鳴
        } else if (id === 'adulabreath') {
          play('glintBreath', 0.85);          // 輝石吐息：青藍冰焰噴流
          play('crystalResonate', 0.7);       // 輝石共振
          play('iceCrack', 0.6);              // 冰晶凝結脆響
        } else if (id === 'adulacrystal') {
          play('iceCrystalBreak', 0.95);      // 輝石之星：嘴前尖晶簇炸裂
          play('crystalResonate', 0.85);      // 四芒星芒閃爍
          play('shockwave', 0.75);
          play('iceChime', 0.7);
        } else if (id === 'adulastars') {
          play('shulkerShoot', 0.9);          // 星晶齊射：多枚追蹤碎片脫手
          play('crystalResonate', 0.7);
          play('iceCrack', 0.65);
        } else if (id === 'adulamoonwave') {
          play('windPierce', 0.9);            // 月刃劍波：冰刃割裂空氣
          play('swordWhoosh', 0.8);           // 寬月牙殘影
          play('iceChime', 0.75);
          play('crystalResonate', 0.65);
        } else if (id === 'adulacharge') {
          play('dragonRoarLong', 0.9);        // 怒吼衝撞：貼地狂衝
          play('heavyWhoosh', 0.85);          // 龍軀破風
          play('iceCrack', 0.8);              // 沿途碎晶迸起
          play('shockwave', 0.75);            // 終點氣浪撞擊
        } else if (id === 'adulastomp') {
          play('dragonStomp', 0.95);          // 結晶踏地：龍爪前撲踩踏
          play('slamHeavy', 0.85);            // 沉重砸地
          play('iceCrack', 0.8);              // 放射裂紋
          play('iceCrystalBreak', 0.75);      // 碎晶外彈
        } else if (id === 'adulabite') {
          play('dragonBite', 0.95);           // 利齒咬合：巨顎上下合攏
          play('fangSnap', 0.85);             // 銳利撕咬
          play('iceCrystalBreak', 0.7);       // 咬合點碎晶四濺
        } else if (id === 'adulawing') {
          play('dragonFlap', 0.9);            // 破羽翼砸：羽翼重砸
          play('windBurst', 0.85);            // 掀起暴風
          play('heavyWhoosh', 0.8);
          play('iceCrystalBreak', 0.65);
        } else if (id === 'adulatail') {
          play('heavyWhoosh', 0.9);           // 結晶尾鞭：長尾貼地大甩
          play('windSpin', 0.85);             // 破空旋風
          play('iceCrack', 0.75);             // 地面碎晶迸裂
          play('iceCrystalBreak', 0.7);
        } else if (id === 'adulatakeoff') {
          play('dragonFlap', 0.95);           // 振翼起飛：雙翼大力下壓
          play('windBurst', 0.85);            // 向外氣浪環
          play('heavyWhoosh', 0.75);
        } else if (id === 'adulashock') {
          play('shockwave', 0.85);            // 輝石衝擊環：貼地青白衝擊波
          play('crystalResonate', 0.75);
          play('iceCrack', 0.7);
        } else if (id === 'adulagather') {
          play('crystalResonate', 0.8);       // 聚流：青白光點吸入口中
          play('windCharge', 0.75);           // 氣流聚攏
          play('iceChime', 0.65);
        } else if (id === 'adulamoonrise') {
          play('beaconBeam', 0.95);           // 暗月升起：月光柱降臨
          play('crystalResonate', 0.9);       // 光環向外盪開
          play('iceChime', 0.8);              // 碎晶如星散落
          play('ambSnow', 0.75);
        } else if (id === 'adulameteor') {
          play('explodeMid', 0.85);           // 星晶墜落：天外結晶砸落炸裂
          play('iceCrystalBreak', 0.85);      // 碎晶四濺
          play('shockwave', 0.75);            // 爆環震盪
          play('crystalResonate', 0.7);
        } else if (id === 'adulabloom') {
          play('crystalResonate', 0.75);      // 輝石結晶：地面長出一圈青白結晶
          play('iceCrack', 0.7);              // 結晶長出聲
          play('iceChime', 0.65);             // 緩慢閃爍微鳴
        } else {
          play('iceCrystalBreak', 0.6);
        }
        return;
      }
      if (id.startsWith('borealis')) {
        if (id === 'borealisroar') {
          play('borealisRoar', 0.95);         // 凍結咆哮：冰龍昂首長嘯
          play('shockwave', 0.85);            // 衝擊波破空
          play('borealisIceBreak', 0.7);      // 冰面震碎
          play('windBurst', 0.6);
        } else if (id === 'borealisawaken') {
          play('borealisRoarEpic', 0.95);     // 白霧再臨 / 大招覺醒：極寒遠古巨吼
          play('borealisFrostCreak', 0.85);   // 霜線急凍
          play('shockwave', 0.85);
          play('ambSnow', 0.75);
        } else if (id === 'borealiscrash') {
          play('borealisSlam', 1.0);          // 冰翼墜湖：龐大冰龍身軀重重砸入湖面
          play('slamHeavy', 0.9);             // 巨力砸地
          play('borealisIceBreak', 0.95);     // 萬頃湖冰大崩裂
          play('shockwave', 0.85);
        } else if (id === 'borealisstomp') {
          play('borealisStomp', 0.95);        // 踏冰裂紋：厚重翼腕重踏湖冰
          play('borealisIceCrack', 0.85);     // 冰層開裂
          play('slamHeavy', 0.75);
        } else if (id === 'borealisbreath') {
          play('borealisBreath', 0.85);       // 翻湧冰息：綿密刺骨冰霧噴吐
          play('borealisIceCrack', 0.45);
        } else if (id === 'borealisdownbreath') {
          play('borealisBreath', 0.9);        // 懸空覆霜：俯衝灌地冰息
          play('borealisStomp', 0.6);         // 氣流壓地震盪
          play('dragonFlap', 0.5);
        } else if (id === 'borealiscommunion') {
          play('borealisFreezeMagic', 0.85);  // 龍饗冰霧：龍饗儀式寒冰神威
          play('borealisBreath', 0.95);       // 巨型幻影龍首澎湃吐息
          play('beaconBeam', 0.7);
        } else if (id === 'borealisinhale') {
          play('windCharge', 0.75);           // 深吸寒霧：空氣與冰屑倒灌入喉
          play('borealisFrostCreak', 0.6);
        } else if (id === 'borealisgather') {
          play('borealisFrostCreak', 0.8);    // 霜線聚流：背脊寒光節節聚集
          play('borealisIceCast', 0.7);
          play('borealisGrowl', 0.65);
        } else if (id === 'borealiswing') {
          play('dragonFlap', 0.85);           // 重翼雪弧：翼腕狂暴橫掃
          play('borealisSlam', 0.65);
          play('windBurst', 0.75);
          play('metalWhoosh', 0.6);
        } else if (id === 'borealistail') {
          play('windSpin', 0.9);              // 霜尾回旋：巨尾割裂冰風
          play('borealisSlam', 0.75);
          play('metalWhoosh', 0.65);
          play('borealisSnarl', 0.6);
        } else if (id === 'borealistakeoff') {
          play('dragonFlap', 0.95);           // 冰翼騰空：雙翼劇烈拍打排開大片暴雪
          play('windBurst', 0.8);
          play('borealisFrostCreak', 0.5);
        } else if (id === 'borealisbite') {
          play('borealisBite', 0.95);         // 冰牙閉合：巨大龍顎狠狠咬合
          play('borealisIceCrack', 0.8);      // 寒冰尖牙咬碎空氣與骨肉
          play('borealisSnarl', 0.6);
        } else if (id === 'borealisring') {
          play('borealisIceCrack', 0.95);     // 外擴冰環：裂冰前緣沿湖面極速環形炸開
          play('borealisIceBreak', 0.85);     // 冰凌崩射
          play('borealisFreezeMagic', 0.75);
          play('shockwave', 0.65);
        } else if (id === 'borealisfog') {
          play('borealisFrostCreak', 0.6);    // 冰結湖遺霧：被動霜線微鳴
          play('ambSnow', 0.5);
        } else if (id === 'borealisburst') {
          play('borealisIceBreak', 1.0);      // 凍傷爆發：體內累積凍霜瞬間爆碎！
          play('borealisFrostbite', 0.95);    // 徹骨極寒寒戰
          play('crit', 0.85);
          play('shockwave', 0.7);
        } else if (id === 'borealisthaw') {
          play('poison', 0.7);                // 回溫白氣：火焰融化碎霜，蒸氣升起
          play('windAir', 0.5);
        } else {
          play('ice', 0.6);
          play('windAir', 0.4);
        }
        return;
      }
      if (id.startsWith('fs') && BD.effects[id] && BD.effects[id].name.startsWith('墜星成獸')) {
        if (id === 'fsmandible') {
          play('cosmicWhoosh', 0.85);       // 巨型黑曜石彎顎劈空揮斬
          play('heavySmash', 0.7);          // 沉重堅岩刮擦撞擊
          play('maceAir', 0.65);            // 沉重風壓
          if (o.src && o.src.inst && o.src.inst.skill && o.src.inst.skill.id === 'bite') {
            play('beastChomp', 0.95);       // 擒顎重摔：狂暴大顎咬合重摔
          }
        } else if (id === 'fstail') {
          play('cosmicWhoosh', 0.8);        // 晶刺長尾360度迴轉掃擊
          play('swordWhoosh', 0.75);
          play('crystalResonate', 0.6);     // 尾部紫晶尖刺破空嗡鳴
          play('shieldBreak', 0.5);         // 裂傷出血刺破撕裂音
        } else if (id === 'fsstomp') {
          play('earthCrack', 0.95);         // 人立踏碎：地面崩解龜裂
          play('slamHeavy', 0.9);           // 重蹄砸地沉重轟擊
          play('shockwave', 0.7);           // 重力衝擊環貼地擴散
          play('basaltPlode', 0.65);        // 碎岩炸裂噴飛
        } else if (id === 'fsgouge') {
          play('ripBlock', 0.9);            // 顎插地向前犁開深溝、撕裂地岩
          play('earthCrack', 0.85);
          play('dash', 0.75);
          play('cosmicWhoosh', 0.7);
        } else if (id === 'fsspike') {
          play('dripstoneLand', 0.75);      // 溝旁接連刺出的黑岩尖柱
          play('deepslateBreak', 0.65);     // 岩柱刺穿地面
          play('crystalResonate', 0.4);     // 柱根重力紫光震顫
        } else if (id === 'fsspikes') {
          play('basaltPlode', 0.95);        // 引力岩陣：一圈黑岩尖柱暴刺而出
          play('dripstoneLand', 0.85);
          play('shockwave', 0.8);           // 衝擊波暴散
          play('lightning', 0.65);          // 柱間紫雷亂竄
        } else if (id === 'fsjump') {
          play('wardenEmerge', 0.85);       // 四足蹬地暴起飛躍
          play('windBurst', 0.7);           // 塵環氣浪向外震散
          play('heavySmash', 0.6);
        } else if (id === 'fscharge') {
          play('dash', 0.85);               // 狂牛全速衝鋒呼嘯
          play('cosmicWhoosh', 0.8);
          play('beastStep', 0.75);          // 鐵蹄狂踏地面揚塵
          play('shockwave', 0.5);
        } else if (id === 'fsdig') {
          play('wardenDig', 0.9);           // 雙顎插地埋頭掘岩
          play('basaltTwist', 0.8);         // 岩層劇烈扭曲震動
          play('ripBlock', 0.75);
        } else if (id === 'fsrockburst') {
          play('deepslateBreak', 0.85);     // 猛然抬頭甩出扇形大塊黑岩
          play('throwWhoosh', 0.8);         // 巨石拋射破空
          play('basaltPlode', 0.7);         // 口前岩塵炸裂
          play('shockwave', 0.6);
        } else if (id === 'fsroll') {
          play('cataclysmLand', 1.0);       // 星球墜擊：滅世級彗星砸地重轟
          play('shockwave', 0.95);          // 雙重音爆衝擊環
          play('explodeBig', 0.85);         // 大地陷裂爆碎
          play('earthCrack', 0.85);
        } else if (id === 'fsrear') {
          play('cosmicGrowl', 0.8);         // 人立蓄力：凶暴獸吼低鳴
          play('sonicCharge', 0.75);        // 眼核引力場充能蓄勢
          play('basaltTwist', 0.65);        // 周身碎石離地浮起摩擦
        } else if (id === 'fspull') {
          play('gravityPull', 0.95);        // 重力牽引：引力牽引力場狂暴收縮吸扯
          play('gravitySuck', 0.85);        // 狂暴漩渦向心吸力風壓
          play('sculkPulse', 0.8);          // 異界核心深層重力脈動
          play('crystalResonate', 0.7);     // 中心白紫光爆發
        } else if (id === 'fsboltcharge') {
          play('sonicCharge', 0.75);        // 目標腳下聚起紫雷預警音
          play('crystalResonate', 0.7);     // 重力符印共振微鳴
          play('lightning', 0.4);           // 預警電弧跳躍
        } else if (id === 'fsbolt') {
          play('lightning', 0.95);          // 天降重力紫雷轟鳴
          play('dripstoneLand', 0.85);      // 地底暴刺巨大岩柱
          play('shockwave', (o.radius || 0) > 200 ? 0.95 : 0.65); // 第三道巨雷帶超大衝擊波
          play('basaltPlode', 0.7);         // 柱底碎岩狂噴
        } else if (id === 'fsreverse') {
          play('gravityTractor', 0.95);     // 重力反轉：反重力力場瞬間撕裂地面
          play('shockwave', 0.9);           // 沖天光柱音爆震波
          play('sculkShriek', 0.85);        // 虛空尖鳴
          play('basaltTwist', 0.75);        // 碎岩敵人浮空升起
        } else if (id === 'fsslam') {
          play('cataclysmLand', 0.95);      // 重力砸落：空中一切狠狠砸回坑底
          play('slamHeavy', 0.9);
          play('earthCrack', 0.85);
          play('explodeMid', 0.75);
        } else if (id === 'fsorb') {
          play('conduitAttack', 0.85);      // 左肩凝聚重力球：奇異點吸光嗡鳴
          play('sonicCharge', 0.8);
          play('gravitySuck', 0.7);
          play('crystalResonate', 0.65);
        } else if (id === 'fsray') {
          play('guardianBeam', 0.85);       // 重力光束：巨大毀滅光束橫掃長嘯
          play('cosmicWhoosh', 0.75);
          play('lightning', 0.6);           // 束身纏繞紫雷劈啪
          play('basaltDebris', 0.5);        // 掃過地面黑岩翻起崩碎
        } else if (id === 'fsawaken') {
          play('endPortalActivate', 0.95);  // 成獸覺醒：異界星門終極共鳴
          play('cosmicRoar', 0.95);         // 震世巨獸暴吼
          play('shockwave', 0.85);          // 四重星核衝擊波
          play('basaltTwist', 0.75);
          play('crystalResonate', 0.7);
        } else if (id === 'fsmeteor') {
          play('dripstoneLand', 0.85);      // 天外黑岩隕星著地貫入地表
          play('deepslateBreak', 0.8);      // 隕星撞碎爆散
          play('explodeMid', 0.65);         // 紫焰炸裂
          play('crystalResonate', 0.45);    // 星屑共鳴
        } else if (id === 'fscoreflare') {
          play('crystalResonate', 0.85);    // 星核引力被動預警：眼核暴亮刺眼星光
          play('sonicCharge', 0.75);        // 光環向內急遽收縮
          play('sculkPulse', 0.65);
        } else {
          play('slamThud', 0.6);
        }
        return;
      }
      if (id.startsWith('ekzykes')) {
        if (id === 'ekzykescrash') { play('slamHeavy', 0.85); play('poison', 0.35); }
        else if (id === 'ekzykesheart' || id === 'ekzykesroar') play('roarMid', 0.8);
        else if (id === 'ekzykeswing' || id === 'ekzykestakeoff') { play('windBurst', 0.7); play('maceAir', 0.35); }
        else play('poison', 0.55);
        return;
      }
      if (id.startsWith('agheel')) {
        if (id === 'agheeldive') {
          play('wardenImpact', 1.0);       // 俯衝巨獸破空重砸
          play('slamHeavy', 0.95);         // 巨龍落地爆震
          play('earthCrack', 0.9);         // 湖底地裂
          play('explodeBig', 0.85);        // 火焰爆衝
          play('dragonFlameShort', 0.75);
        } else if (id === 'agheelwing') {
          if (o.shape === 'circle' || o.shape === 'ring') {
            play('wardenImpact', 0.95);    // 雙翼拍地鈍擊
            play('dragonFlap', 0.9);       // 巨翼轟擊風壓
            play('slamHeavy', 0.85);
            play('windBurst', 0.8);
          } else {
            play('dragonFlap', 0.9);       // 貼地翼掃扇形風壓
            play('metalWhoosh', 0.85);     // 翼緣割裂氣流
            play('windBurst', 0.8);
            play('maceAir', 0.7);
          }
        } else if (id === 'agheelgust') {
          play('dragonFlap', 0.95);        // 翼風驅逐：雙翼猛然一振
          play('windBurst', 0.9);          // 暴風推開近身者
          play('shockwave', 0.85);
          play('fireballWhoosh', 0.7);     // 帶火星強風
        } else if (id === 'agheeltakeoff') {
          play('dragonFlap', 0.9);         // 拔地起飛扇翅
          play('breezeJump', 0.8);         // 旋風拔升
          play('windBurst', 0.75);
        } else if (id === 'agheelroar') {
          play('dragonRoarLong', 1.0);     // 昂首怒吼震懾
          play('golemBellow', 0.9);
          play('shockwave', 0.8);
        } else if (id === 'agheelheart') {
          play('dragonRoarLong', 1.0);     // 龍心熾燃：火柱沖天怒吼
          play('golemBellow', 0.95);
          play('dragonFlameLong', 0.9);
          play('explodeBig', 0.85);
          play('shockwave', 0.85);
        } else if (id === 'agheelbite') {
          play('dragonBite', 0.95);        // 巨顎咬合
          play('fangSnap', 0.8);           // 獠牙合攏
          if (o.el === 'fire') {
            play('dragonFlameShort', 0.85);// 火焰爆咬
            play('fireballWhoosh', 0.7);
          }
        } else if (id === 'agheelstomp') {
          const isG = o.src && ((o.src.def && o.src.def.id === 'greyll') || (o.src.owner && o.src.owner.def && o.src.owner.def.id === 'greyll'));
          if (isG && (o.scale || 1) > 1.3) {
            play('wardenImpact', 1.0);     // 桂雷爾第 3 踏暴烈重砸
            play('dragonStomp', 0.95);
            play('earthCrack', 0.95);
            play('heavySmash', 0.9);
          } else if ((o.radius || 0) > 150) {
            play('wardenImpact', 1.0);     // 突進重踏：巨震衝擊
            play('dragonStomp', 0.95);
            play('earthCrack', 0.9);
            play('shockwave', 0.85);
          } else {
            play('dragonStomp', 0.9);      // 普通單爪踏地
            play('wardenImpact', 0.8);
            play('slamHeavy', 0.75);
          }
        } else if (id === 'agheeltail') {
          play('windSpin', 0.9);           // 旋身甩尾
          play('metalWhoosh', 0.85);
          play('dragonFlap', 0.8);
          play('maceAir', 0.75);
        } else if (id === 'agheelgore') {
          play('wardenImpact', 0.95);      // 頭角上挑重擊
          play('slamHeavy', 0.85);
          play('swordWhoosh', 0.75);
          play('hitBeast', 0.7);
        } else if (id === 'agheelinhale') {
          play('windCharge', 0.85);        // 喉頭聚火吸氣
          play('dragonRoarShort', 0.65);
          play('fireballWhoosh', 0.6);
        } else if (id === 'agheelbreath') {
          play('dragonFlameLong', 0.9);    // 扇形橫掃 / 追蹤火浪
          play('dragonFlameShort', 0.8);
          play('fireballWhoosh', 0.75);
        } else if (id === 'agheelflame') {
          play('dragonFlameLong', 0.95);   // 天降亞基爾之炎長廊
          play('fireballWhoosh', 0.85);
          play('dragonFlameShort', 0.8);
        } else if (id === 'agheelrain') {
          play('fireballWhoosh', 0.85);    // 滯空噴焰
          play('dragonFlameShort', 0.8);
          play('fireballImpact', 0.75);
        } else if (id === 'agheelpyre') {
          play('fireballImpact', 0.85);    // 長廊地竄火柱
          play('dragonFlameShort', 0.8);
          play('explodeMid', 0.65);
        } else if (id === 'agheelrock') {
          play('fireballImpact', 0.85);    // 大招火雨 / 灰母天罰砸地落點
          play('fireballWhoosh', 0.7);
          play('explodeMid', 0.65);
          const isG = o.src && ((o.src.def && o.src.def.id === 'greyll') || (o.src.owner && o.src.owner.def && o.src.owner.def.id === 'greyll'));
          if (isG) {
            play('dripstoneLand', 0.85);   // 灰燼尖晶流星貫入石橋
            play('earthCrack', 0.8);
          }
        } else if (id === 'agheelnova') {
          play('dragonRoarLong', 1.0);     // 龍心火環爆裂
          play('explodeBig', 0.95);
          play('dragonFlameLong', 0.9);
          play('shockwave', 0.9);
        }
        return;
      }
      if (id.startsWith('greyll')) {
        if (id === 'greyllroar') {
          play('dragonRoarLong', 1.0);
          play('dragonRoarBeastly', 0.95);
          play('shockwave', 0.95);
          play('omenCurse', 0.9);
          play('earthCrack', 0.85);
        } else if (id === 'greyllheart') {
          play('dragonRoarLong', 1.0);
          play('dragonRoarBeastly', 0.95);
          play('shockwave', 0.95);
          play('earthCrack', 0.9);
          play('fire', 0.85);
        } else if (id === 'greyllbridge') {
          play('dragonFlameLong', 0.95);
          play('fireballWhoosh', 0.9);
          play('fire', 0.85);
          play('campfire', 0.8);
        } else if (id === 'greyllash') {
          play('explodeBig', 0.95);
          play('heavySmash', 0.9);
          play('earthCrack', 0.85);
          play('windWhirl', 0.85);
          play('fire', 0.8);
        } else if (id === 'greyllnova') {
          play('explodeBig', 1.0);
          play('dragonFlameLong', 0.95);
          play('shockwave', 0.95);
          play('earthCrack', 0.9);
          play('fire', 0.85);
        }
        return;
      }
      if (id === 'devour') {
        play('beastBite', 0.85);       // 巨顎合攏撕咬
        play('fangSnap', 0.8);         // 獠牙咬碎
        play('wolfBark', 0.55);        // 狼吻撕咬短促狂吠
        return;
      }
      if (id.startsWith('redwolf')) {
        if (id === 'redwolfcrown') {
          play('wolfHowl', 0.95);       // 蒼金劍冠：狼王高亢長嚎
          play('crystalResonate', 0.85);// 七劍環形共鳴
          play('beaconBeam', 0.75);     // 輝石光柱沖天
          play('bellResonate', 0.7);    // 學院魔力聖環清鳴
        } else if (id === 'redwolfglint') {
          play('crystalResonate', 0.5); // 輝劍凝結成形
          play('crystalBreak', 0.35);   // 微弱晶化破鳴
        } else if (id === 'redwolfbound') {
          play('dash', 0.55);           // 疾步竄動破風
          play('wolfStep', 0.5);        // 四足疾馳踏塵
          play('wolfGrowl', 0.35);      // 敏捷戒備低哼
        } else if (id === 'redwolfpounce') {
          play('dash', 0.65);           // 飛撲直線突進
          play('foxAggro', 0.65);       // 凌空狂暴惡吠
          play('beastBite', 0.9);       // 落地撲咬
          play('fangSnap', 0.85);       // 巨顎咬碎
          play('slamThud', 0.7);        // 沉重撲地
        } else if (id === 'redwolfslash') {
          play('battleaxeSwipe', 0.85); // 橙金咬劍：魔力曲刃大揮斬
          play('metalWhoosh', 0.8);     // 巨型光刃撕裂空氣蜂鳴
          play('swordWhoosh', 0.7);     // 揮劍破空呼嘯
          play('wolfGrowl', 0.45);      // 狼口咬劍發力的悶吼
          if (o.arc && o.arc > 3.0) play('slashHeavy', 0.8); // 縱劈/大弧度重斬加強
        } else if (id === 'redwolfwhirl') {
          play('windSpin', 0.95);       // 咬劍圓舞：360 度激流旋斬呼嘯
          play('metalWhoosh', 0.9);     // 光刃劇烈旋風
          play('slashHeavy', 0.85);     // 重型圓弧斬擊
          play('crystalResonate', 0.75);// 冷藍星屑環形共鳴
          play('shockwave', 0.65);      // 劍氣席捲地面震波
        } else if (id === 'redwolfplunge') {
          play('slamHeavy', 1.0);       // 騰空下劈：巨劍重轟地面
          play('earthCrack', 0.9);      // 大地崩裂巨響
          play('heavySmash', 0.85);     // 岩石爆碎
          play('dripstoneLand', 0.8);   // 尖石碎屑飛濺
          play('crystalBreak', 0.8);    // 劍尖輝石劇烈震碎
          play('shockwave', 0.85);      // 裂地衝擊波擴散
        } else {
          play('swordWhoosh', 0.75);
          play('wolfGrowl', 0.4);
        }
        return;
      }
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
      const isKindred = !!(wDef && wDef.id === 'kindred');
      const isYasuo = !!(wDef && wDef.id === 'yasuo');
      const isDTS = !!(wDef && wDef.id === 'draconictreesentinel');
      const isMohg = !!(wDef && wDef.id === 'mohg');
      const isGreyll = !!(wDef && wDef.id === 'greyll');
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
        if (v && v.def && v.def.id === 'redwolf' && d >= 70) {
          play('wolfDisperse', 0.6); // 紅狼受重創哀鳴
        }
        if (v && v.def && v.def.id === 'fallingstar') {
          play('ancientDebrisDig', 0.55); // 墜星成獸：黑亮隕星岩甲受擊碎響
          play('heavySmash', 0.45);
        } else if (v && v.def && v.def.id === 'greyll' && d >= 75) {
          play('dragonHurt', 0.85);       // 飛龍桂雷爾：重傷龍吼嘶鳴
          play('hitBeast', 0.6);
        }
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
      else if (id === 'hoofcharge' || id === 'goldcharge') {
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
      else if (isKindred) {
        if (id === 'lambdash') {
          play('windBurst', 0.75);         // 神羊側身翻滾：銀藍風痕破空
          play('dash', 0.6);
          play('crystalResonate', 0.5);    // 落地星屑清響
          if (isP2) play('fire', 0.5);     // 血色風痕
        }
        else if (id === 'lambvolley') {
          play('bowShoot', 0.85);          // 銀弓連射：新月弓弦震鳴
          play('throwWhoosh', 0.7);        // 三箭扇形劃空
          play('crystalResonate', 0.6);    // 銀白光尾星屑飄落
          if (isP2) play('fire', 0.5);
        }
        else if (id === 'lambshot') {
          play('bowShoot', 0.8);           // 恐懼之箭：筆直銀箭疾射
          play('throwWhoosh', 0.7);
          play('crystalResonate', 0.7);    // 符印細環掠過空靈共鳴
          if (isP2) play('fire', 0.55);
        }
        else if (id === 'lambleap') {
          play('windBurst', 0.8);          // 神羊躍步：起跳白色絨光爆散
          play('ghostSwoop', 0.7);         // 空中銀色弧光軌跡
          play('crystalResonate', 0.65);   // 落點冷藍光環
        }
        else if (id === 'lambmark') {
          play('crystalResonate', 0.85);   // 鏡爪符印：符文環旋轉清鳴
          play('sculkPulse', 0.75);        // 內圈銀光收縮脈動
          play('bell', 0.65);
        }
        else if (id === 'lambmarkbloom') {
          play('beaconBeam', 0.95);        // 符印爆開：靈魂光柱直沖天際
          play('shockwave', 0.85);         // 冷藍光環外擴震波
          play('crystalResonate', 0.8);    // 銀色星屑炸開
          play('slamHeavy', 0.75);         // 靈能震地
        }
        else if (id === 'lambsanctum') {
          play('beaconBeam', 1.0);         // 神羊聖域：天界光柱靈音降臨
          play('soulCharge', 0.95);        // 聖域守護共振
          play('crystalResonate', 0.9);    // 符文環神聖清鳴
          play('ultCast', 0.85);           // 靈魂不死誓約
        }
        else if (id === 'wolfpounce') {
          play('wolfGrowl', 0.8);          // 魔狼獵場：暗紅獵場浮現，魔狼鎖定低吼
          play('sculkPulse', 0.75);        // 獵場冷霧升起
          play('click', 0.65);             // 三枚爪印依序亮起
        }
        else if (id === 'wolfbite') {
          play('beastBite', 0.9);          // 魔狼噬咬：上下獠牙光弧猛合
          play('fangSnap', 0.85);          // 尖牙咬碎
          play('slashHeavy', 0.75);        // 冷藍爪痕劃過
          play('swordWhoosh', 0.6);
          if (isP2) play('hitFlesh', 0.7); // 血色獠牙
        }
        else if (id === 'wolfmaw') {
          play('wolfGrowl', 0.95);         // 魔狼撲殺：魔狼凌空重撲狂暴撕咬
          play('beastBite', 1.0);          // 巨口咬合
          play('fangSnap', 0.95);
          play('shockwave', 0.9);          // 暗色震波震裂大地
          play('slamHeavy', 0.85);
          play('ghostSwoop', 0.8);
        }
        else if (id === 'wolfcharge') {
          play('ghostSwoop', 0.95);        // 魔狼衝殺：直線衝殺撕裂空氣
          play('beastBite', 0.9);          // 獠牙光弧合攏
          play('shockwave', 0.85);         // 終點震波爆開
          play('swordWhoosh', 0.8);        // 平行爪痕撕地
          play('slamThud', 0.75);
        }
        else if (id === 'wolfawaken') {
          play('wolfHowl', 1.0);           // 魔狼的饗宴：飢餓暴走長嚎
          play('shockwave', 0.95);         // 血紅光暈翻湧震波
          play('sculkShriek', 0.9);        // 餓狼靈魂長嘯
          play('slamHeavy', 0.85);
          play('fire', 0.75);              // 燃起鬼火
        }
        else if (id === 'lambrain') {
          play('ghostSwoop', 0.85);        // 銀箭雨：銀箭從天貫下
          play('crystalResonate', 0.75);   // 落地光環與星屑
          play('projHit', 0.7);
        }
        else if (id === 'lambfinale') {
          play('beaconBeam', 1.0);         // 永恆獵手・終：銀白巨光從天貫下
          play('wolfHowl', 0.95);          // 魔狼隨光撲落
          play('shockwave', 0.95);         // 銀藍震環炸開
          play('slamHeavy', 0.9);
          play('crystalResonate', 0.85);
        }
        else if (id === 'slash') {
          play('beastBite', 0.8);
          play('slash', 0.7);
          play('swordWhoosh', 0.6);
        }
      }
      // 犽宿（放逐浪人）專屬音效
      else if (isYasuo) {
        if (id === 'steeltempest') {
          play('windPierce', 0.85);   // 鋼鐵暴雪：直刺破空與劍芒穿透
          play('windShoot', 0.8);     // 劍尖激射突風
          play('swordWhoosh', 0.75);  // 迅疾出劍破空
          if (o.k >= 1.2) play('shockwave', 0.5);
        }
        else if (id === 'tornadocast') {
          play('windBurst', 0.9);     // 旋風捲起：狂風爆發震散
          play('windWhirl', 0.85);    // 雙層白藍渦流破空激盪
          play('maceAir', 0.75);      // 揮劍掀起巨風
          play('shockwave', 0.7);
        }
        else if (id === 'airlaunch') {
          play('windBurst', 0.95);    // 捲上天：強烈升騰風柱爆發
          play('shockwave', 0.85);    // 風壓環擴散震波
          play('windWhirl', 0.8);     // 地面螺旋氣旋升空
          setTimeout(() => play('windAir', 0.6), 120);
        }
        else if (id === 'sweepblade') {
          play('windSpin', 0.85);     // 刃敵千軍：御風穿身滑行疾衝
          play('dash', 0.75);         // 殘影高速位移
          play('swordWhoosh', 0.7);
          setTimeout(() => {
            play('slash', 0.75);      // 終點橫向拔刀切開空氣
            play('windShoot', 0.6);
          }, Math.min(200, (o.dur || 0.2) * 1000));
        }
        else if (id === 'eqring') {
          if (wSid === 'eq_storm') {
            play('windBurst', 0.95);  // 旋風環斬：消耗層數、沉重暴風環爆
            play('windWhirl', 0.9);   // 圓周外旋風弧
            play('slashHeavy', 0.85); // 迴旋雙刀環
            play('shockwave', 0.8);
          } else {
            play('windSpin', 0.85);   // 環斬：高速迴旋雙重刀環
            play('slashHeavy', 0.8);  // 整圈迴旋切擊
            play('windWhirl', 0.75);  // 外圈氣流渦流
            play('shockwave', 0.65);
          }
        }
        else if (id === 'windwallcast') {
          play('windBurst', 0.95);    // 風牆：正面氣流屏障轟然升起
          play('windShield', 0.85);   // 風壁結界成形能量脈衝
          play('windWhirl', 0.75);    // 牆面兩端小渦流盤旋
          play('shockwave', 0.65);    // 風壓環擴散
        }
        else if (id === 'windblock') {
          if (o.empower) {
            play('windBurst', 0.95);  // 旋風穿過風牆增幅：風暴咆哮
            play('windWhirl', 0.9);   // 渦流劇烈放大
            play('buff', 0.8);        // 力量激化音
            play('shockwave', 0.75);
          } else {
            play('windDeflect', 0.9); // 風牆阻擋：投射物被流風彈散撥開
            play('windShoot', 0.7);   // 氣流碎裂消散
          }
        }
        else if (id === 'severwind') {
          play('draw', 0.95);         // 納刀・斷風：居合拔刀清脆金屬出鞘鳴響
          play('metalWhoosh', 0.9);   // 狹長白光刀風撕裂全場
          play('windBurst', 0.85);    // 身前拔刀狂風爆破
          play('windShoot', 0.8);     // 風刃噴薄
          play('shockwave', 0.75);
        }
        else if (id === 'lbwarp') {
          play('windAir', 0.9);       // 奪命氣息・瞬移：化為疾風移形
          play('teleport', 0.85);     // 瞬移現身虛空
          play('dash', 0.7);
          play('ultCast', 0.8);       // 絕息之陣暗色宣告
        }
        else if (id === 'lbslash') {
          const k = ((o.i || 0) + 1) / (o.n || 6);
          play('metalWhoosh', 0.75 + k * 0.2); // 連斬：隨刀數遞增的凌厲刀風
          play('slashHeavy', 0.7 + k * 0.2);  // 空中交錯長直刀線切割
          play('swordWhoosh', 0.75);
          if (k >= 0.8) play('crit', 0.8);    // 後段連斬追加暴擊撕裂感
        }
        else if (id === 'lbfinale') {
          play('slamHeavy', 1.0);     // 落地斬：重斬將對手轟回地面
          play('metalWhoosh', 0.95);  // 巨型橫貫刀光破空
          play('shockwave', 0.95);    // 青綠圓環與雙層震波激盪
          play('windBurst', 0.9);     // 暴風席捲全場
          play('crit', 0.85);
          setTimeout(() => {
            play('sheath', 0.85);     // 落地歸位：收刀入鞘清脆一響
            play('draw', 0.5);
          }, 350);
        }
        else if (id === 'flowshield') {
          play('windShield', 0.85);   // 浪人之道：劍意化為風壁護盾
          play('windAir', 0.8);       // 身周逆時針流風環繞
          play('buff', 0.65);
        }
        else if (id === 'galeawaken') {
          play('sakeDrink', 0.9);     // 疾風覺醒：仰頭喝一口酒
          play('sakeSpit', 0.85);     // 往劍上一噴，酒霧化作白光
          play('bladeScrape', 0.75);
          setTimeout(() => {
            play('windBurst', 1.0);   // 狂暴龍捲自周身沖天而起
            play('windWhirl', 0.95);
            play('shockwave', 0.9);
            play('buff', 0.85);
          }, 300);
        }
        else if (id === 'stormbreaker') {
          play('metalWhoosh', 0.95);  // 颶風破終結：X 形交錯巨斬撕裂空氣
          play('slashHeavy', 0.9);    // 雙刀光狂暴重斬
          play('windBurst', 0.85);    // 交點四芒星與青白震波炸開
          play('shockwave', 0.85);
          play('crit', 0.8);
        }
        else if (id === 'risecharge') {
          play('windCharge', 0.85);   // 乘風而起・聚風：目標腳下風環收束急旋
          play('windWhirl', 0.8);     // 地面風絲越轉越快
          play('maceAir', 0.65);
        }
        else if (id === 'risewind') {
          play('windBurst', 1.0);     // 乘風而起：巨大龍捲風柱拔地而起沖天！
          play('shockwave', 0.95);    // 外圈雙層震波呼嘯
          play('windWhirl', 0.9);     // 六層白藍渦流螺旋升騰
          play('slamHeavy', 0.8);     // 碎石被捲起之重壓
        }
        else if (id === 'windstep') {
          if (BD.stormReady(o.src)) {
            play('windCharge', 0.85); // 旋風就緒：身上湧現急旋風鳴
            play('windWhirl', 0.7);
            play('bell', 0.5);        // 提示清鳴
          } else {
            play('windAir', 0.65);    // 風步：化風閃身殘影
            play('dash', 0.55);
            play('swordWhoosh', 0.45);
          }
        }
        else if (id === 'slash') {
          if (wSid === 'storm_breaker') {
            play('slashHeavy', 0.85); // 颶風破中段：反手正身快斬
            play('swordWhoosh', 0.8);
            play('crit', 0.75);
          } else {
            play('swordWhoosh', 0.65); // 劍擊：清脆日本刀揮擊破空
            play('slash', 0.6);
            if (o.crit) play('crit', 0.7);
          }
        }
      }
      // 龍裝大樹守衛（古龍赤雷與重裝巨槌）專屬音效
      else if (isDTS) {
        if (id === 'thunderstrike' || id === 'dtsbolt') {
          play('lightning', 0.95);     // 赤雷落雷轟天
          play('tridentThunder', 0.9);
          play('wardenImpact', 0.8);
          play('shockwave', 0.8);
        } else if (id === 'dtssmite' || id === 'dtsawaken') {
          play('slamHeavy', 1.0);      // 巨槌砸地重壓天崩地裂
          play('tridentThunder', 0.95);// 赤雷爆裂
          play('heavyCore', 0.9);
          play('shockwave', 0.85);
        } else if (id === 'dtswave') {
          play('tridentThunder', 0.85);// 赤雷浪裂地波紋
          play('shockwave', 0.8);
          play('fireballWhoosh', 0.7);
        } else if (wSid === 'fireball' || id === 'fire' || category === '爆炸') {
          play('fireballImpact', 0.95);// 龍息火球猛烈轟炸
          play('explodeBig', 0.85);
          play('dragonFlame', 0.8);
        } else if (wSid === 'maul_slam') {
          play('slamHeavy', 0.95);     // 槌砸：沉重大槌砸地碎骨
          play('heavyCore', 0.9);
          play('shockwave', 0.85);
        } else if (wSid === 'quick_maul') {
          play('heavyWhoosh', 0.85);   // 速擊：迅猛大槌掃擊
          play('hitHeavy', 0.8);
          play('maceAir', 0.75);
        } else if (wSid === 'lunge_strike') {
          play('slamHeavy', 0.95);     // 突進槌擊：戰馬躍步砸地
          play('shockwave', 0.85);
          play('horseGallop', 0.8);
        } else if (wSid === 'sentinel_slam') {
          play('slamHeavy', 1.0);      // 守衛重砸：人立落地天崩地裂
          play('slamThud', 0.95);
          play('shockwave', 0.95);
          play('heavyCore', 0.9);
        } else if (wSid === 'horse_stomp') {
          play('slamHeavy', 0.85);     // 踐踏：雙蹄踩踏碎裂
          play('shockwave', 0.8);
          play('horseStep', 0.75);
        } else if (wSid === 'shield_swipe') {
          play('ironGolemThrow', 0.85);// 盾掃：巨型龍爪盾破風橫掃
          play('hitHeavy', 0.8);
          play('shockwave', 0.7);
        } else if (wSid === 'shield_smash') {
          play('ironGolemThrow', 0.85);// 盾砸：龍爪大盾強壓碎地
          play('slamHeavy', 0.85);
          play('heavyCore', 0.8);
        } else if (wSid === 'lightning_strike') {
          play('ironGolemThrow', 0.9); // 赤雷盾掃：盾牌帶電橫掃
          play('tridentThunder', 0.85);
          play('lightning', 0.85);
          play('shockwave', 0.8);
        } else if (wSid === 'ult') {
          play('lightning', 1.0);      // 大招天罰落雷衝鋒
          play('tridentThunder', 0.95);
          play('slamHeavy', 0.95);
          play('shockwave', 0.95);
          play('witherSpawn', 0.9);
          play('dragonRoarLong', 0.85);
        } else if (category === '砸地') {
          play('slamHeavy', 0.9);
          play('shockwave', 0.8);
        } else {
          play('hitHeavy', 0.7);
        }
      }
      // 鮮血君王蒙格專屬音效
      else if (isMohg || id.startsWith('mohg')) {
        if (id === 'mohgsweep') {
          play('slashHeavy', 0.85); play('tridentThrow', 0.7); play('swordWhoosh', 0.65);
          if (isP2 || o.el === 'bloodflame') { play('fire', 0.75); play('fireballWhoosh', 0.65); }
        } else if (id === 'mohgslam') {
          play('tridentGround', 0.95); play('slamHeavy', 0.9); play('bloodSplash', 0.85); play('earthCrack', 0.75);
          if (isP2 || o.el === 'bloodflame') play('fire', 0.7);
        } else if (id === 'mohgexplode') {
          const big = (o.radius || 220) >= 200;
          play(big ? 'explodeBig' : 'explodeMid', 0.9); play('fireballImpact', 0.85);
          play('shockwave', big ? 0.85 : 0.65); play('bloodSplash', 0.8); play('fire', 0.75);
        } else if (id === 'mohgthrust') {
          play('spearLunge', 0.9); play('tridentGround', 0.85); play('earthCrack', 0.8); play('bloodSplash', 0.75);
          if (isP2 || o.el === 'bloodflame') play('fire', 0.7);
        } else if (id === 'mohgtax') {
          play('windSpin', 0.9); play('spearLunge', 0.9); play('fireballWhoosh', 0.85); play('bloodSplash', 0.8); play('fire', 0.75);
        } else if (id === 'mohgtalonburst') {
          play('explodeMid', 0.9); play('fireballImpact', 0.85); play('fangSnap', 0.8); play('bloodSplash', 0.75); play('poison', 0.7);
        } else if (id === 'mohgboon') {
          play('fireballWhoosh', 0.85); play('bloodSplash', 0.85); play('dripLava', 0.75); play('fire', 0.7);
        } else if (id === 'mohgshower') {
          play('bloodSplash', 0.85); play('dripLava', 0.8); play('fire', 0.75); play('poison', 0.65);
        } else if (id === 'mohgrise') {
          play('slashHeavy', 0.9); play('bladeScrape', 0.85); play('fireballWhoosh', 0.8); play('fire', 0.75);
        } else if (id === 'mohgtakeoff') {
          play('dragonFlap', 1.0); play('windBurst', 0.9); play('clothRip', 0.85); play('heavyWhoosh', 0.8);
        } else if (id === 'mohgdive') {
          play('heavyWhoosh', 0.95); play('shockwave', 0.95); play('slamHeavy', 0.95); play('tridentGround', 0.9); play('explodeBig', 0.9); play('bloodSplash', 0.85);
        } else if (id === 'mohgbloodrain') {
          play('bloodSplash', 0.7); play('dripLava', 0.65); play('fire', 0.6);
        } else if (id === 'mohgcharge') {
          if (o.len) { play('dash', 0.9); play('fire', 0.85); play('fireballWhoosh', 0.8); play('spearLunge', 0.75); }
          else { play('fireballWhoosh', 0.8); play('soulCharge', 0.75); play('fire', 0.7); }
        } else if (id === 'mohgswing') {
          play('battleaxeSwipe', 1.0); play('slashHeavy', 0.95); play('fireballWhoosh', 0.9); play('shockwave', 0.85); play('fire', 0.8);
        } else if (id === 'mohgcommune') {
          play('soulCharge', 0.95); play('soulsandVoices', 0.85); play('heartbeat', 0.85); play('witherShoot', 0.75);
        } else if (id === 'mohgcommuneblast') {
          play('witherSpawn', 1.0); play('shockwave', 1.0); play('explodeBig', 0.95); play('bloodSplash', 0.95); play('slamHeavy', 0.85);
        } else if (id === 'mohgnihilend') {
          play('heavyWhoosh', 1.0); play('slamHeavy', 1.0); play('shockwave', 1.0); play('explodeBig', 0.95); play('tridentGround', 0.95); play('bloodSplash', 0.95); play('earthCrack', 0.9);
        } else if (id === 'mohgawaken') {
          play('dragonFlap', 1.0); play('roarBig', 0.95); play('shockwave', 0.95); play('fire', 0.9); play('explodeBig', 0.85); play('bloodSplash', 0.85);
        } else if (id === 'mohgpool') {
          play('dripLava', 0.65); play('fire', 0.6); play('poison', 0.55);
        } else if (id === 'mohgcurse') {
          play('omenCurse', 0.95); play('bellResonate', 0.85); play('heartbeat', 0.8); play('soulCharge', 0.7);
        } else if (id === 'mohgnihil') {
          play('shockwave', 0.95); play('heartbeat', 0.9); play('fireballWhoosh', 0.8); play('crimsonVoom', 0.75);
        } else if (id === 'mohgdrain') {
          play('bloodDrain', 0.95); play('bloodSplash', 0.85); play('dripLava', 0.75); play('soulCharge', 0.7);
        } else if (id === 'mohgboonbuff') {
          play('soulCharge', 0.85); play('fire', 0.75); play('heartbeat', 0.75); play('crimsonVoom', 0.65);
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
      else if (id === 'steeltempest') { play('windPierce', 0.85); play('windShoot', 0.8); play('swordWhoosh', 0.75); }
      else if (id === 'tornadocast' || id === 'stormbladecast') { play('windBurst', 0.9); play('windWhirl', 0.85); play('maceAir', 0.75); }
      else if (id === 'airlaunch') { play('windBurst', 0.95); play('shockwave', 0.85); play('windWhirl', 0.8); }
      else if (id === 'sweepblade') { play('windSpin', 0.85); play('dash', 0.75); play('swordWhoosh', 0.7); }
      else if (id === 'eqring') { play('windSpin', 0.85); play('slashHeavy', 0.8); play('windWhirl', 0.75); }
      else if (id === 'windwallcast') { play('windBurst', 0.95); play('windShield', 0.85); play('windWhirl', 0.75); }
      else if (id === 'windblock') { if (o.empower) play('windBurst', 0.95); else play('windDeflect', 0.9); }
      else if (id === 'severwind') { play('draw', 0.95); play('metalWhoosh', 0.9); play('windBurst', 0.85); }
      else if (id === 'lbwarp') { play('windAir', 0.9); play('teleport', 0.85); play('ultCast', 0.8); }
      else if (id === 'lbslash') { play('metalWhoosh', 0.85); play('slashHeavy', 0.8); play('swordWhoosh', 0.75); }
      else if (id === 'lbfinale') { play('slamHeavy', 1.0); play('metalWhoosh', 0.95); play('shockwave', 0.95); play('windBurst', 0.9); }
      else if (id === 'flowshield') { play('windShield', 0.85); play('windAir', 0.8); play('buff', 0.65); }
      else if (id === 'galeawaken') { play('sakeDrink', 0.9); play('sakeSpit', 0.85); setTimeout(() => { play('windBurst', 1.0); play('windWhirl', 0.95); }, 300); }
      else if (id === 'stormbreaker') { play('metalWhoosh', 0.95); play('slashHeavy', 0.9); play('windBurst', 0.85); }
      else if (id === 'risecharge') { play('windCharge', 0.85); play('windWhirl', 0.8); }
      else if (id === 'risewind') { play('windBurst', 1.0); play('shockwave', 0.95); play('windWhirl', 0.9); }
      else if (id === 'windstep') { play('windAir', 0.65); play('dash', 0.55); }
      else if (category === '爆炸' && id !== 'deathmark') play(o.radius >= 140 ? 'explodeBig' : 'explodeMid', Math.min(0.9, 0.4 + o.k * 0.25));
      else if (category === '震波') play('shockwave', Math.min(0.8, 0.4 + o.k * 0.2));
      else if (category === '砸地') play(o.k >= 1.3 ? 'slamHeavy' : 'slamThud', Math.min(0.9, 0.45 + o.k * 0.2));
      else if (ELEM[o.el] && ELEM_FX.includes(id)) play(ELEM[o.el], 0.5);
      else if (id === 'ultcast') play('ultCast', 0.6);
      else if (BUFF.includes(id)) play('buff', 0.5);
      else if (category === '位移') play(TELE.includes(id) ? 'teleport' : 'dash', 0.45);
      else if (id === 'projhit' || id === 'projwall') {
        play('projHit', id === 'projhit' ? 0.5 : 0.3);
        if (o.kind === 'glintblade' || o.kind === 'glintcomet') {
          play('crystalBreak', o.kind === 'glintcomet' ? 0.75 : 0.45);
        }
      }
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
