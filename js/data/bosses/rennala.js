'use strict';
// 原作考據、圖片檢視與改編界線：docs/bosses/rennala.md、docs/research/rennala/（69 張已檢視參考圖，含 15 張官方設定稿與 10 張招式 GIF）。
// 一階段重現雷亞盧卡利亞大書庫的「琥珀卵聖歌」金罩、小生徒飛天書卷、發光白墓碑與墜落吊燈；
// 二階段（50% HP）響起魔女菈妮的誓言，展開星夜水鏡，解鎖「彗星亞茲勒」、「蕾娜菈的滿月」與四大靈體骨灰（離群野狼、獵犬騎士、山妖巨人、王室飛龍）。
(function (G) {
  const BD = G.BD, { D, strike } = BD.DataKit;
  const MOON = { fxEl: 'fullmoon' }, GLINT = { fxEl: 'glintstone' }, HOLY = { fxEl: 'holy' };
  const moonbane = (dur) => ({ status: { id: 'moonbane', dur: dur || 6.5 } });
  const CHAND_ZONE = { kind: 'chandelierfire', r: 92, dur: 3.6, dps: 11, delay: 0.2, damageEl: 'fire', status: { id: 'burn', dur: 3 } };
  const MOON_ZONE = { kind: 'moonpool', r: 105, dur: 3.4, dps: 9, delay: 0.2, slow: true };

  BD.registerBoss({
    id: 'rennala', name: '滿月女王蕾娜菈', title: '卡利亞王室與雷亞盧卡利亞之主', archetype: '琥珀聖歌・滿月與喚魂大法師',
    desc: '年輕時在觀星期間遇見滿月、以月之魔法折服雷亞盧卡利亞魔法學院並建立卡利亞王室的傳奇女王。頭戴向後彎曲的黃金「女王彎月冠」，身著深藍鑲金與緋紅長襟的女王長袍，左手緊抱前夫拉達岡留下的金色「琥珀卵」，右手持握鑲嵌藍色輝石的「卡利亞權杖」。一階段於大書庫受甜美小生徒的「琥珀卵聖歌」守護，張開琥珀金罩並以飛天書卷、發光白墓碑、燃燒吊燈與輝石魔礫壓制對手；半血時響起女兒魔女菈妮的守護誓言，腳下展開無邊星夜水鏡，解鎖貫穿全場的起源魔法「彗星亞茲勒」、化為巨月墜落的「蕾娜菈的滿月」（附加滿月易傷），並搖響喚魂之鈴召喚離群野狼、獵犬騎士、山妖巨人與王室飛龍四大靈體骨灰協同作戰。',
    color: '#3b82f6', color2: '#101c38', glow: '#8fe4ff', style: 'rennala', rank: 'boss', stars: 4,
    radius: 27, maxHp: 2020, speed: 198, turn: 4.0, mass: 1.25, fxEl: 'fullmoon', hurt: 'cloth', traits: ['fullmoonqueen'],
    stamina: { max: 155, regen: 31 }, posture: 235, dodgeCost: 24, dodgeSpeed: 430,
    ai: {
      prefRange: [190, 390], aggression: 0.68, dodge: 0.34, precision: 0.74, reaction: 0.26, strafe: 0.52, walk: 0.62,
      feint: 0.08, delay: 0.28, retreat: 0.32, punish: 0.66, nervous: 0.14, patience: 0.38, safeCancel: true,
      combos: [
        { id: 'library_barrage', name: '聖歌結界・地脈墓碑', weight: 1.2, phase: 1, steps: [{ skill: 'scholar_books' }, { skill: 'gravestone_drop', cancel: 0.28, branch: [{ when: { dist: [80, 520] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'amber_prism', name: '重力坍縮・星光碎裂', weight: 1.15, steps: [{ skill: 'amber_gravity' }, { skill: 'shattering_crystal', cancel: 0.26, branch: [{ when: { dist: [40, 380] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'carian_guard', name: '輝劍環・轉啊轉', weight: 1.15, steps: [{ skill: 'carian_phalanx' }, { skill: 'spinning_scepter', cancel: 0.28, branch: [{ when: { dist: [0, 320] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'moon_azur', name: '滿月・彗星亞茲勒', weight: 1.35, phase: 2, steps: [{ skill: 'rennalas_full_moon' }, { skill: 'comet_azur', cancel: 0.3, branch: [{ when: { dist: [0, 720] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'spirit_parade', name: '獵犬・山妖飛龍', weight: 1.3, phase: 2, steps: [{ skill: 'summon_wolves_bloodhound' }, { skill: 'summon_troll_dragon', cancel: 0.3, branch: [{ when: { dist: [0, 560] }, do: 'extend' }, { do: 'stop' }] }] },
      ],
    },
    phase2: {
      speedMul: 1.12, dmgMul: 1.14, cdMul: 0.85,
      line: '「以魔女菈妮之名，不容許任何人驚擾我母親的安眠——來吧，見識卡利亞的滿月女王，蕾娜菈的輝煌！」',
      fxEl: 'fullmoon', transFx: { id: 'rennala_phase2', el: 'fullmoon' }, transDur: 2.6, roarAt: 2.1,
      note: '原作打倒一階段大書庫的蕾娜菈後，琥珀卵湧出黑霧並響起魔女菈妮的聲音，將戰場化為繁星與巨月照耀的鏡面湖泊；本遊戲於半血轉場時展開星夜水鏡領域，強化全部輝石魔法，並解鎖「彗星亞茲勒」、「蕾娜菈的滿月」與四大靈體骨灰召喚。',
    },
    skills: [
      { id: 'glintstone_volley', name: '輝石魔礫・月影滑步', short: '魔礫', tags: ['ranged', 'escape'], range: [100, 520], cd: 3.8, cost: 17, track: 4.5, recovery: 0.48,
        // 原作 Magic Shards (rn-ref-016)：月影側移拉開身位後，連續齊射輝石魔礫風箏壓制；二階段尾段改為高追蹤彗星彈
        actions: [
          { do: 'blink', at: 0.08, to: 'side', dist: 165, fx: 'rennala_moonstep' },
          { do: 'proj', at: 0.28, kind: 'glintshard', n: 4, spread: 0.09, speed: 740, r: 11, dmg: 25, posture: 10, kb: 70, life: 1.35, homing: 0.9, fx: 'rennala_glint_volley', ...GLINT },
          { do: 'proj', at: 0.56, kind: 'glintshard', n: 3, spread: 0.08, speed: 780, r: 12, dmg: 26, posture: 10, kb: 80, life: 1.35, homing: 1.1, fx: 'rennala_glint_volley', ...GLINT },
        ],
        actions2: [
          { do: 'blink', at: 0.06, to: 'side', dist: 185, fx: 'rennala_moonstep' },
          { do: 'proj', at: 0.24, kind: 'glintshard', n: 5, spread: 0.08, speed: 780, r: 11, dmg: 24, posture: 10, kb: 75, life: 1.4, homing: 1.0, fx: 'rennala_glint_volley', ...MOON },
          { do: 'proj', at: 0.5, kind: 'glintcomet', n: 3, spread: 0.1, speed: 840, r: 15, dmg: 35, posture: 14, kb: 120, life: 1.45, homing: 1.15, fx: 'rennala_glint_volley', ...MOON },
        ] },

      { id: 'spinning_scepter', name: '轉啊轉・迴旋權杖', short: '轉杖', tags: ['melee', 'ranged'], range: [0, 320], cd: 5.2, cost: 18, track: 3.8, recovery: 0.65,
        // 原作 Spinning Staff Shield & Boomerang Staff (rn-ref-022, 023)：身前高速旋轉權杖切割近身，再將旋轉權杖擲出橫掃
        actions: [
          ...strike(0.42, 0.32, { shape: 'circle', r: 145, off: 45 }, { dmg: 50, posture: 22, kb: 210, ...GLINT, fx: 'rennala_spin_scepter' }),
          { do: 'proj', at: 0.72, kind: 'scepterspin', n: 1, speed: 580, r: 28, dmg: 56, posture: 24, kb: 220, life: 0.95, pierce: true, fx: 'rennala_spin_scepter', ...GLINT },
        ],
        actions2: [
          ...strike(0.38, 0.3, { shape: 'circle', r: 160, off: 45 }, { dmg: 55, posture: 24, kb: 220, ...MOON, fx: 'rennala_spin_scepter' }),
          { do: 'proj', at: 0.66, kind: 'scepterspin', n: 3, spread: 0.24, speed: 620, r: 28, dmg: 50, posture: 22, kb: 230, life: 1.0, pierce: true, fx: 'rennala_spin_scepter', ...MOON },
        ] },

      { id: 'scholar_books', name: '小生徒合唱・黃金書陣', short: '合唱', tags: ['trap', 'defensive', 'zone'], range: [40, 440], cd: 7.2, cost: 22, track: 3.2, recovery: 0.58,
        // 原作一階段甜美小生徒合唱護衛與書庫結界 (rn-ref-068, 158)：補充琥珀護盾、於對手腳下展開聖歌持續結界並埋設延遲星紋地雷
        actions: [
          { do: 'ambercast', at: 0.14, value: 56, dur: 5.5 },
          { do: 'tele', at: 0.24, dur: 0.45, shape: 'circle', r: 105, anchor: 'target', follow: true, lockBefore: 0.15, teleFx: 'rennala_scholar_choir' },
          { do: 'zone', at: 0.36, kind: 'chandelierfire', pattern: 'at', lead: 0.2, n: 1, r: 105, dur: 3.4, dps: 22, delay: 0.35, damageEl: 'holy', status: { id: 'slow', dur: 1.0 } },
          { do: 'trap', at: 0.48, kind: 'mine', n: 3, pattern: 'around', off: 115, r: 80, dmg: 52, slow: 1.2, arm: 0.65, life: 8.5 },
        ],
        actions2: [
          { do: 'tele', at: 0.2, dur: 0.42, shape: 'circle', r: 125, anchor: 'target', follow: true, lockBefore: 0.15, teleFx: 'rennala_scholar_choir' },
          { do: 'zone', at: 0.32, kind: 'moonpool', pattern: 'at', lead: 0.2, n: 1, r: 125, dur: 3.8, dps: 25, delay: 0.32, slow: true },
          { do: 'trap', at: 0.44, kind: 'mine', n: 4, pattern: 'around', off: 125, r: 86, dmg: 58, slow: 1.5, arm: 0.6, life: 9.0 },
        ] },

      { id: 'gravestone_drop', name: '白墓碑・地脈突刺線', short: '墓碑', tags: ['ranged', 'aoe'], range: [80, 520], cd: 6.8, cost: 22, track: 2.8, recovery: 0.72,
        // 原作 Glowing Gravestones (rn-ref-015, 160)：白光墓碑沿直線地脈從地板一路連環破土炸向敵人
        actions: [
          { do: 'tele', at: 0.08, dur: 0.48, shape: 'rect', len: 530, w: 94, follow: true, lockBefore: 0.16, chargeFx: 'rennala_amber_cast' },
          { do: 'erupt', at: 0.56, n: 5, interval: 0.11, start: 105, step: 92, r: 80, dmg: 58, posture: 22, kb: 180, fx: 'rennala_tombstone', ...HOLY },
        ],
        actions2: [
          { do: 'tele', at: 0.06, dur: 0.44, shape: 'rect', len: 610, w: 108, follow: true, lockBefore: 0.15, chargeFx: 'rennala_summon_sigil' },
          { do: 'erupt', at: 0.5, n: 6, interval: 0.1, start: 100, step: 96, r: 88, dmg: 62, posture: 24, kb: 200, fx: 'rennala_tombstone', ...MOON },
        ] },

      { id: 'chandelier_fall', name: '大書庫吊燈墜落', short: '吊燈', tags: ['ranged', 'aoe', 'zone'], range: [80, 480], cd: 7.8, cost: 24, track: 2.5, recovery: 0.8,
        // 原作一階段大書庫高空燃燒燭台吊燈墜落並引燃地面（唯一天降拋射 lob 招式）
        actions: [
          { do: 'lob', at: 0.5, kind: 'chandelier', n: 2, flight: 0.66, r: 122, scatter: 92, lead: 0.2, dmg: 64, posture: 26, kb: 230, teleColor: '#ff9a2a', fx: 'rennala_chandelier', zone: CHAND_ZONE },
        ],
        actions2: [
          { do: 'lob', at: 0.46, kind: 'chandelier', n: 3, flight: 0.62, r: 126, scatter: 98, lead: 0.22, dmg: 66, posture: 28, kb: 240, teleColor: '#78d8ff', fx: 'rennala_chandelier', zone: MOON_ZONE },
        ] },

      { id: 'amber_gravity', name: '琥珀卵重力坍縮', short: '琥珀爆', tags: ['aoe'], range: [0, 340], cd: 8.4, cost: 25, track: 2.4, recovery: 0.82,
        // 原作 AoE Blast (rn-ref-014)：高舉琥珀卵開啟重力漩渦將對手往內拉扯，隨即引爆黃金／滿月衝擊（二階段追加外環震波）
        actions: [
          { do: 'tele', at: 0.06, dur: 0.5, shape: 'circle', r: 325, follow: true, lockBefore: 0.15, chargeFx: 'rennala_amber_cast' },
          { do: 'gravpull', at: 0.56, r: 325, dmg: 24, posture: 10, kb: 440, fx: 'rennala_gravity_pull' },
          { do: 'tele', at: 0.62, dur: 0.42, shape: 'circle', r: 215, off: 25, follow: false, chargeFx: false },
          { do: 'hit', at: 1.04, shape: 'circle', r: 215, off: 25, dmg: 76, posture: 30, kb: 320, slow: 1.0, ...HOLY, fx: 'rennala_gravity' },
        ],
        actions2: [
          { do: 'tele', at: 0.06, dur: 0.46, shape: 'circle', r: 345, follow: true, lockBefore: 0.15, chargeFx: 'rennala_summon_sigil' },
          { do: 'gravpull', at: 0.52, r: 345, dmg: 26, posture: 12, kb: 460, fx: 'rennala_gravity_pull' },
          { do: 'tele', at: 0.58, dur: 0.4, shape: 'circle', r: 225, off: 25, follow: false, chargeFx: false },
          { do: 'hit', at: 0.98, shape: 'circle', r: 225, off: 25, dmg: 78, posture: 30, kb: 320, slow: 1.2, ...MOON, fx: 'rennala_fullmoon_blast', ...moonbane(5.5) },
          ...strike(1.36, 0.32, { shape: 'ring', r0: 185, r: 325 }, { dmg: 44, posture: 16, kb: 240, multi: true, ...MOON, fx: 'rennala_phalanx_ring' }),
        ] },

      { id: 'carian_phalanx', name: '卡利亞輝劍圓陣', short: '輝劍陣', tags: ['ranged', 'aoe'], range: [60, 460], cd: 7.4, cost: 23, track: 3.5, recovery: 0.7,
        // 原作頭頂凝結延遲追蹤輝劍 + 腳下向外擴張兩段藍銀圓環衝擊波 (rn-ref-019, 126)
        actions: [
          { do: 'glintblades', at: 0.22, n: 5, delay: 0.9, gap: 0.1, spacing: 42, speed: 780, r: 10, dmg: 22, posture: 9, kb: 75, life: 1.65, homing: 1.25 },
          ...strike(0.58, 0.42, { shape: 'ring', r0: 105, r: 230 }, { dmg: 48, posture: 18, kb: 195, ...GLINT, fx: 'rennala_phalanx_ring' }),
          ...strike(0.96, 0.3, { shape: 'ring', r0: 210, r: 345 }, { dmg: 54, posture: 20, kb: 215, multi: true, ...GLINT, fx: 'rennala_phalanx_ring' }),
        ],
        actions2: [
          { do: 'glintblades', at: 0.2, n: 7, delay: 0.85, gap: 0.09, spacing: 38, speed: 820, r: 11, dmg: 24, posture: 10, kb: 80, life: 1.7, homing: 1.35 },
          ...strike(0.54, 0.38, { shape: 'ring', r0: 110, r: 245 }, { dmg: 54, posture: 20, kb: 205, ...MOON, fx: 'rennala_phalanx_ring' }),
          ...strike(0.9, 0.28, { shape: 'ring', r0: 220, r: 365 }, { dmg: 58, posture: 22, kb: 225, multi: true, ...MOON, fx: 'rennala_phalanx_ring' }),
        ] },

      { id: 'shattering_crystal', name: '結晶散射・星光碎裂斬', short: '結晶', tags: ['aoe', 'gap'], range: [60, 380], cd: 6.8, cost: 22, track: 3.2, recovery: 0.68,
        // 原作 Orbs of Light / Shattering Crystal (rn-ref-017, 144)：在敵人四周空間折射多道縱橫交錯的高能星光斬線，X 型爆裂收尾
        actions: [
          { do: 'slashes', at: 0.22, n: 3, interval: 0.22, tele: 0.42, len: 310, w: 40, dmg: 30, posture: 10, fx: 'rennala_crystal_cross', final: { tele: 0.48, len: 360, w: 56, dmg: 54, posture: 20, fx: 'rennala_crystal_cross' } },
        ],
        actions2: [
          { do: 'slashes', at: 0.18, n: 4, interval: 0.19, tele: 0.38, len: 340, w: 44, dmg: 32, posture: 11, fx: 'rennala_crystal_cross', final: { tele: 0.44, len: 400, w: 62, dmg: 58, posture: 22, fx: 'rennala_crystal_cross' } },
        ] },

      // ── 二階段專屬：喚魂之鈴・四大靈體骨灰、彗星亞茲勒、蕾娜菈的滿月 ──
      { id: 'summon_wolves_bloodhound', name: '喚魂・野狼與獵犬騎士', short: '喚獵犬', phase: 2, tags: ['ranged', 'aoe'], range: [80, 520], cd: 9.2, cost: 26, track: 3.2, recovery: 0.82,
        // 原作 Summoning Spirits (rn-ref-021, 086, 169, 171)：展開銀白卡利亞紋章，喚出三隻離群野狼撲咬與獵犬騎士曲劍突進二連斬
        actions: [
          { do: 'spiritsummon', at: 0.35, spirit: 'wolves', n: 3, gap: 0.1, speed: 660, r: 16, dmg: 28, posture: 11, kb: 90, life: 1.55, homing: 1.85 },
          { do: 'spiritsummon', at: 0.62, spirit: 'bloodhound', tele: 0.46, len: 260, w: 68, dmg: 50, posture: 20, kb: 155, secondSlash: true, status: { id: 'bleed', stacks: 18 } },
        ] },

      { id: 'summon_troll_dragon', name: '喚魂・山妖與王室飛龍', short: '喚飛龍', phase: 2, tags: ['aoe', 'ranged'], range: [80, 560], cd: 11.0, cost: 30, track: 2.8, recovery: 0.95,
        // 原作 Summoning Spirits (rn-ref-073, 092, 138, 139, 170)：喚出山妖巨人重踏震地，緊接著王室飛龍低空掠過噴吐輝石龍息
        actions: [
          { do: 'spiritsummon', at: 0.38, spirit: 'troll', tele: 0.62, r: 140, dmg: 64, posture: 32, kb: 240, slow: 1.0 },
          { do: 'spiritsummon', at: 0.92, spirit: 'dragon', tele: 0.6, len: 460, w: 120, dmg: 69, posture: 26, kb: 215, zone: MOON_ZONE },
        ] },

      { id: 'comet_azur', name: '起源魔法・彗星亞茲勒', short: '亞茲勒', phase: 2, tags: ['ranged', 'aoe'], range: [120, 720], cd: 10.5, cost: 30, track: 2.4, recovery: 1.05,
        // 原作 Magic Beam / Comet Azur (rn-ref-018, 069, 128, 135, 164)：高舉權杖展開多重星光法陣，射出貫穿全場的粗大星空激流光束
        actions: [
          { do: 'tele', at: 0.08, dur: 0.82, shape: 'rect', len: 860, w: 118, follow: true, lockBefore: 0.22, chargeFx: 'rennala_comet_charge' },
          { do: 'hit', at: 0.9, shape: 'rect', len: 860, w: 118, dmg: 41, posture: 16, kb: 140, ...MOON, fx: 'rennala_comet_beam' },
          { do: 'hit', at: 1.12, shape: 'rect', len: 860, w: 118, dmg: 34, posture: 14, kb: 140, multi: true, ...MOON, fx: 'rennala_comet_beam' },
          { do: 'hit', at: 1.34, shape: 'rect', len: 860, w: 118, dmg: 34, posture: 14, kb: 160, multi: true, ...MOON, fx: 'rennala_comet_beam' },
          { do: 'hit', at: 1.56, shape: 'rect', len: 860, w: 118, dmg: 44, posture: 18, kb: 260, multi: true, ...MOON, fx: 'rennala_comet_beam' },
        ] },

      { id: 'rennalas_full_moon', name: '蕾娜菈的滿月', short: '滿月', phase: 2, tags: ['gap', 'aoe'], range: [100, 620], cd: 11.5, cost: 32, track: 3.0, recovery: 1.0,
        // 原作 Rennala's Full Moon (rn-ref-020, 129, 137, 145)：蜷身升空化為一輪巨大銀藍滿月逼近對手，墜落引發月光星爆並附加「滿月易傷」
        actions: [
          { do: 'fullmoonform', at: 0.08, dur: 1.25, r: 98 },
          { do: 'tele', at: 0.1, dur: 1.15, shape: 'circle', r: 225, anchor: 'target', follow: true, lockBefore: 0.25, setMark: 'rnMoon', chargeFx: false },
          { do: 'hide', at: 0.28, fx: 'rennala_fullmoon_orb' },
          { do: 'land', at: 1.25, mark: 'rnMoon' },
          { do: 'hit', at: 1.25, shape: 'circle', r: 225, anchor: 'mark', mark: 'rnMoon', dmg: 108, posture: 40, kb: 360, ...MOON, fx: 'rennala_fullmoon_blast', ...moonbane(6.5), zone: MOON_ZONE },
        ] },
    ],
    ultimate: {
      id: 'ult', name: '大書庫的琥珀輪迴', name2: '顛倒滿月・卡利亞星蝕終焉', ult: true, range: [0, 760], track: 2.6, recovery: 1.15,
      desc: '一階段「大書庫的琥珀輪迴」：女王瞬移拉開張開無敵琥珀搖籃，大書庫穹頂傾瀉黃金星辰書頁流星雨（rain），隨即自中心逐層推開三道交錯黃金共振圓環逼迫走位。二階段「顛倒滿月・卡利亞星蝕終焉」：蕾娜菈升空化為巨月並在星夜水鏡畫出縱橫星軌交叉斬（slashes）與蒼藍彗星雨（rain），最終整個戰場陷入日蝕終爆，只留一處清澈月光庇護圈可躲避（圈外無法閃避），同時放射十六道滿月彗星！',
      actions: [
        { do: 'invuln', at: 0.04, dur: 1.05 },
        { do: 'ambercast', at: 0.08, value: 105, dur: 7.0 },
        { do: 'blink', at: 0.1, to: 'away', dist: 185, fx: 'rennala_moonstep' },
        { do: 'rain', at: 0.24, n: 10, dur: 1.45, area: 340, flight: 0.62, r: 86, dmg: 40, posture: 14, kb: 165, kind: 'sweetbook', teleColor: '#ffcf58', fx: 'rennala_ult_p1_star' },
        ...strike(0.85, 0.5, { shape: 'ring', r0: 65, r: 225 }, { dmg: 52, posture: 18, kb: 200, multi: true, ...HOLY, fx: 'rennala_ult_p1_ring' }),
        ...strike(1.42, 0.36, { shape: 'ring', r0: 195, r: 380 }, { dmg: 58, posture: 20, kb: 230, multi: true, ...HOLY, fx: 'rennala_ult_p1_ring' }),
        ...strike(2.05, 0.45, { shape: 'ring', r0: 340, r: 540 }, { dmg: 74, posture: 26, kb: 300, multi: true, ...HOLY, fx: 'rennala_ult_p1' }),
      ],
      actions2: [
        { do: 'invuln', at: 0.04, dur: 1.35 },
        { do: 'fullmoonform', at: 0.08, dur: 2.95, r: 122 },
        { do: 'blink', at: 0.1, to: 'away', dist: 195, fx: 'rennala_moonstep' },
        { do: 'slashes', at: 0.22, n: 4, interval: 0.24, tele: 0.42, len: 500, w: 46, dmg: 30, posture: 12, fx: 'rennala_crystal_cross', final: { tele: 0.48, len: 620, w: 66, dmg: 46, posture: 18, fx: 'rennala_crystal_cross' } },
        { do: 'rain', at: 0.56, n: 10, dur: 1.5, area: 360, flight: 0.64, r: 88, dmg: 36, posture: 13, kb: 170, kind: 'glintcomet', teleColor: '#8fe4ff', fx: 'rennala_ult_p2_meteor' },
        { do: 'tele', at: 1.38, dur: 1.65, shape: 'except', r: 122, anchor: 'safe', setMark: 'rnSafe', undodgeable: true, teleFx: 'rennala_ult_p2_charge' },
        { do: 'hit', at: 3.03, shape: 'except', r: 122, anchor: 'mark', mark: 'rnSafe', undodgeable: true, dmg: 145, posture: 52, kb: 380, multi: true, ...MOON, fx: 'rennala_ult_p2', ...moonbane(8.0) },
        { do: 'proj', at: 3.08, n: 16, radial: true, kind: 'glintcomet', speed: 620, r: 14, dmg: 34, posture: 12, kb: 160, life: 1.55, fx: 'rennala_glint_volley', ...MOON },
      ],
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
