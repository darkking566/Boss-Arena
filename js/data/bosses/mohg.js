'use strict';
// 原作考據、圖片查看與改編界線：docs/bosses/mohg.md、docs/research/mohg/（78 張參考圖，含 2 張官方設定稿）。
// 招式取自攻略站對原作招式的命名（Trident Combo、Thrust、Blood Tax、Bloodflame Talons、Bloodboon 三種變化、Spear Slam + Explosion、
// Upwards Swing and Slam、二階段 Winged Assault / Bloodflame Charge / Plunge / Bloodflame Swing、Bloodboon Ritual「Nihil」）；
// 數值、時間軸、被動秒數與兩段大招為觀戰遊戲改編。
(function (G) {
  const BD = G.BD, { D, strike } = BD.DataKit;
  const BF = { fxEl: 'bloodflame' }, BLOOD = { fxEl: 'blood' };
  const bleed = (n) => ({ status: { id: 'bleed', stacks: n } });
  const POOL = { kind: 'bloodflame', r: 58, dur: 4, dps: 14, delay: 0.35, damageEl: 'fire', status: { id: 'bleed', stacks: 4 } };
  // 天降血雨：落地起火、留下血焰池（原作 Bloodboon 的 shower 與二階段飛空灑血）
  const rain = (at, n, dur, area, dmg) => ({ do: 'rain', at, n, dur, area, flight: 0.7, r: 80, dmg, posture: 10, kb: 140, kind: 'bloodflame', fx: 'mohgbloodrain',
    teleColor: '#ff2a3a', ...bleed(8), zone: { ...POOL, r: 62, dur: 3.2 } });
  BD.registerBoss({
    id: 'mohg', name: '鮮血君王蒙格', title: '蒙格溫王朝之主', archetype: '血焰儀式・吸血壓制',
    desc: '黃金一族的忌子，與「無形之母」交感而點燃了受詛咒的血。滿頭黑色捲角、金繡長袍與左肩的聖物匣肩甲，手持蒙格溫聖槍（三叉戟）。三叉戟連斬、血稅突刺、鮮血猛禽爪的延遲爆炸，與三種「血之恩賜」把整個場地灑成血焰火海。被動「血之恩寵」：任一方出血爆發後傷害提升；生命降到 88%／74%／60% 時念出 Trēs、Duo、Ūnus，在敵人身上套下無法閃避的血之咒印。半血時展開黑羽、三度高舉聖槍念「Nihil」——依咒印吸取敵人的血回復自身。',
    color: '#c8102e', color2: '#16080c', glow: '#ff3b4e', style: 'mohg', rank: 'boss', stars: 4,
    radius: 54, sizeMul: 1.3, maxHp: 3400, speed: 215, turn: 3.6, mass: 2.4, fxEl: 'blood', hurt: 'flesh', traits: ['bloodlord'],
    stamina: { max: 160, regen: 30 }, posture: 220, dodgeCost: 26, dodgeSpeed: 420,
    ai: { prefRange: [110, 330], aggression: 0.74, dodge: 0.26, precision: 0.66, reaction: 0.28, strafe: 0.4, walk: 0.66,
      feint: 0.08, delay: 0.32, retreat: 0.12, punish: 0.62, nervous: 0.08, patience: 0.34, safeCancel: true,
      combos: [
        { id: 'tridentflow', name: '連斬・穿地', weight: 1.2, steps: [{ skill: 'trident_sweep' }, { skill: 'ground_thrust', cancel: 0.3, branch: [{ when: { dist: [0, 380] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'talonboon', name: '猛禽爪・恩賜', weight: 1.2, steps: [{ skill: 'bloodflame_talons' }, { skill: 'bloodboon_arc', cancel: 0.3, branch: [{ when: { dist: [0, 420] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'taxslam', name: '血稅・爆擊', weight: 1.1, phase: 1, steps: [{ skill: 'blood_tax' }, { skill: 'spear_slam', cancel: 0.3, branch: [{ when: { dist: [0, 400] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'skyblood', name: '翼擊・大橫掃', weight: 1.3, phase: 2, steps: [{ skill: 'winged_assault' }, { skill: 'bloodflame_swing', cancel: 0.3, branch: [{ when: { dist: [0, 460] }, do: 'extend' }, { do: 'stop' }] }] },
      ],
    },
    phase2: { speedMul: 1.14, dmgMul: 1.12, cdMul: 0.86, line: '「Nihil！Nihil！Nihil！」——血之咒印吞下敵人的血，黑羽自背後撕裂展開。',
      fxEl: 'bloodflame', transFx: { id: 'mohgawaken', el: 'bloodflame' }, transDur: 3.2, roarAt: 2.7,
      note: '原作約半血時念三次「Nihil」吸取咒環者的生命並回復、長出翅膀、三叉戟燃起血焰；本遊戲在轉階段時照此依咒印層數吸血回復（咒印未滿三層會在轉階段補齊），之後解鎖翼擊、血焰衝鋒、墜擊與大橫掃，三叉戟招式附加血焰爆炸',
    },
    skills: [
      { id: 'trident_sweep', name: '三叉戟連斬', short: '連斬', tags: ['melee'], range: [0, 300], cd: 3.6, cost: 18, track: 4.5, recovery: 0.6,
        // 原作：兩到三下慢速橫掃，常以過頂重砸收尾
        actions: [...strike(0.6, 0.45, { shape: 'cone', r: 230, arc: 150 * D, angOff: -0.3 }, { dmg: 88, posture: 22, kb: 200, ...BLOOD, fx: 'mohgsweep' }),
          ...strike(1.15, 0.36, { shape: 'cone', r: 240, arc: 155 * D, angOff: 0.3 }, { dmg: 96, posture: 24, kb: 230, multi: true, ...BLOOD, fx: 'mohgsweep' }),
          ...strike(1.8, 0.45, { shape: 'circle', r: 115, off: 175 }, { dmg: 118, posture: 34, kb: 320, multi: true, ...BLOOD, fx: 'mohgslam' })],
        actions2: [...strike(0.6, 0.42, { shape: 'cone', r: 245, arc: 155 * D, angOff: -0.3 }, { dmg: 92, posture: 22, kb: 210, ...BF, fx: 'mohgsweep', ...bleed(6) }),
          ...strike(1.12, 0.34, { shape: 'cone', r: 255, arc: 160 * D, angOff: 0.3 }, { dmg: 100, posture: 24, kb: 240, multi: true, ...BF, fx: 'mohgsweep', ...bleed(6) }),
          ...strike(1.75, 0.42, { shape: 'circle', r: 125, off: 180 }, { dmg: 122, posture: 34, kb: 330, multi: true, ...BF, fx: 'mohgslam' }),
          { do: 'hit', at: 2.25, shape: 'circle', r: 175, off: 180, dmg: 70, posture: 18, kb: 300, multi: true, ...BF, fx: 'mohgexplode', ...bleed(11) }] },
      { id: 'ground_thrust', name: '穿地突刺', short: '突刺', tags: ['melee'], range: [0, 360], cd: 5, cost: 20, track: 3, recovery: 0.8,
        // 原作：三叉戟刺進地面，拔出時再一下；二階段拔出處炸開血焰
        actions: [...strike(0.72, 0.55, { shape: 'rect', len: 300, w: 80 }, { dmg: 110, posture: 30, kb: 240, ...BLOOD, fx: 'mohgthrust' }),
          ...strike(1.2, 0.3, { shape: 'circle', r: 105, off: 255 }, { dmg: 62, posture: 16, kb: 220, multi: true, ...BLOOD, fx: 'mohgslam' })],
        actions2: [...strike(0.68, 0.5, { shape: 'rect', len: 310, w: 86 }, { dmg: 114, posture: 30, kb: 250, ...BF, fx: 'mohgthrust' }),
          ...strike(1.15, 0.3, { shape: 'circle', r: 110, off: 260 }, { dmg: 64, posture: 16, kb: 220, multi: true, ...BF, fx: 'mohgslam' }),
          ...strike(1.65, 0.35, { shape: 'circle', r: 170, off: 260 }, { dmg: 88, posture: 22, kb: 320, multi: true, ...BF, fx: 'mohgexplode', ...bleed(12) })] },
      { id: 'blood_tax', name: '血稅', short: '血稅', tags: ['melee'], range: [0, 380], cd: 7, cost: 22, track: 2.6, recovery: 0.85,
        // 原作 Blood Tax：裹著血焰扭轉刺出，大量累積出血
        actions: strike(0.85, 0.75, { shape: 'rect', len: 340, w: 92 }, { dmg: 118, posture: 32, kb: 260, ...BF, fx: 'mohgtax', ...bleed(33) }) },
      { id: 'bloodflame_talons', name: '鮮血猛禽爪', short: '猛禽爪', tags: ['melee', 'aoe'], range: [0, 400], cd: 6.5, cost: 22, track: 3, recovery: 0.75,
        // 原作 Bloodflame Talons：左手撕裂空氣留下三道爪痕，片刻後才爆炸
        // 0.55 秒揮爪後爪痕懸空（造型檔畫出），三道爪痕各自預警到爆炸
        actions: [...[-0.3, 0, 0.3].map(ao => ({ do: 'tele', at: 0.1, dur: 1.05, shape: 'rect', len: 340, w: 62, angOff: ao, follow: true, lockBefore: 0.6, chargeFx: false })),
          ...[-0.3, 0, 0.3].map(ao => ({ do: 'hit', at: 1.15, shape: 'rect', len: 340, w: 62, angOff: ao, dmg: 62, posture: 16, kb: 190, multi: true, ...BF, fx: 'mohgtalonburst', ...bleed(13) }))] },
      { id: 'bloodboon_arc', name: '血之恩賜・弧灑', short: '弧灑', tags: ['aoe'], range: [0, 360], cd: 7, cost: 24, track: 2.4, recovery: 0.85,
        // 原作 Bloodboon（寬弧）：伸手探入無形之母體內，扇形灑出血焰
        actions: [...strike(0.8, 0.65, { shape: 'cone', r: 300, arc: 200 * D }, { dmg: 74, posture: 18, kb: 200, ...BF, fx: 'mohgboon', ...bleed(15) }),
          { do: 'bloodpools', at: 0.85, pattern: 'arc', n: 5, dist: 215, spread: 190 * D }] },
      { id: 'bloodboon_cone', name: '血之恩賜・直潑', short: '直潑', tags: ['ranged', 'aoe'], range: [150, 540], cd: 7.5, cost: 24, track: 2.2, recovery: 0.85,
        // 原作 Bloodboon（窄錐）：往正前方潑出一長條血焰，往側邊閃
        actions: [...strike(0.8, 0.65, { shape: 'cone', r: 490, arc: 34 * D }, { dmg: 88, posture: 22, kb: 260, ...BF, fx: { id: 'mohgboon', arc: 0.6 }, ...bleed(18) }),
          { do: 'bloodpools', at: 0.85, pattern: 'line', n: 4, start: 150, step: 100 }] },
      { id: 'bloodboon_shower', name: '血之恩賜・血雨', short: '血雨', tags: ['aoe'], range: [0, 230], cd: 8, cost: 24, track: 1.5, recovery: 1.2,
        // 原作 Bloodboon（shower）：近身時往頭頂一灑，血雨落在身邊；收招長、背後是破綻
        actions: [{ do: 'tele', at: 0.05, dur: 0.85, shape: 'circle', r: 205, follow: true, chargeFx: 'mohgcharge' },
          { do: 'hit', at: 0.9, shape: 'circle', r: 205, dmg: 52, posture: 12, kb: 160, ...BF, fx: 'mohgshower', ...bleed(11) },
          { do: 'hit', at: 1.3, shape: 'circle', r: 205, dmg: 52, posture: 12, kb: 160, multi: true, ...BF, fx: 'mohgshower', ...bleed(11) },
          { do: 'bloodpools', at: 1.3, pattern: 'ring', n: 6, dist: 150 }] },
      { id: 'spear_slam', name: '聖槍爆擊', short: '爆擊', tags: ['melee', 'aoe'], range: [0, 340], cd: 8, cost: 26, track: 2.5, recovery: 0.95,
        // 原作 Spear Slam + Explosion：發光的聖槍砸地，片刻後大爆炸
        actions: [...strike(0.85, 0.6, { shape: 'circle', r: 125, off: 175 }, { dmg: 104, posture: 30, kb: 260, ...BLOOD, fx: 'mohgslam' }),
          ...strike(1.6, 0.6, { shape: 'circle', r: 250, off: 175 }, { dmg: 112, posture: 32, kb: 420, multi: true, ...BF, fx: 'mohgexplode', ...bleed(12) })] },
      { id: 'rising_slash', name: '上撩・爆砸', short: '上撩', tags: ['melee', 'gap'], range: [80, 420], cd: 7.5, cost: 24, track: 3, recovery: 0.9,
        // 原作 Upwards Swing and Slam：血焰上撩，接著往前爆炸重砸
        actions: [...strike(0.55, 0.42, { shape: 'cone', r: 250, arc: 110 * D }, { dmg: 92, posture: 24, kb: 260, ...BF, fx: 'mohgrise', ...bleed(8) }),
          { do: 'dash', at: 0.9, dist: 150, dur: 0.3 },
          ...strike(1.4, 0.38, { shape: 'circle', r: 165, off: 130 }, { dmg: 120, posture: 34, kb: 360, multi: true, ...BF, fx: 'mohgexplode', ...bleed(10) })] },
      // ── 二階段（黑羽展開、聖槍燃起血焰）──
      { id: 'winged_assault', name: '翼擊・血焰俯衝', short: '翼擊', phase: 2, tags: ['gap', 'aoe'], range: [220, 950], cd: 12, cost: 32, track: 3, recovery: 1.1,
        // 原作 Winged Assault：振翼飛起、往地面灑下血焰，再俯衝刺向落點
        actions: [{ do: 'tele', at: 0.1, dur: 2.0, shape: 'circle', r: 185, anchor: 'target', follow: true, lockBefore: 0.5, setMark: 'mgLand', chargeFx: false },
          { do: 'hide', at: 0.35, fx: 'mohgtakeoff' }, rain(0.6, 8, 1.1, 300, 50),
          { do: 'land', at: 2.1, mark: 'mgLand' },
          { do: 'hit', at: 2.1, shape: 'circle', r: 185, anchor: 'mark', mark: 'mgLand', dmg: 140, posture: 42, kb: 420, ...BF, fx: 'mohgdive', ...bleed(14) }] },
      { id: 'bloodflame_charge', name: '血焰衝鋒', short: '衝鋒', phase: 2, tags: ['gap'], range: [200, 680], cd: 9, cost: 28, track: 3.5, recovery: 0.9, clash: false,
        // 原作 Bloodflame Charge：挺槍衝過全場，身後留下一整條血焰
        actions: [{ do: 'tele', at: 0.05, dur: 0.6, shape: 'rect', len: 560, w: 120, follow: true, lockBefore: 0.25, chargeFx: 'mohgcharge' },
          { do: 'dash', at: 0.65, dist: 560, dur: 0.5, fx: 'mohgcharge', trail: { ...POOL, r: 62, dur: 3.6, delay: 0.1 }, hit: { dmg: 118, posture: 32, kb: 360, ...bleed(12) } }] },
      { id: 'plunge', name: '血焰墜擊', short: '墜擊', phase: 2, tags: ['gap', 'aoe'], range: [150, 720], cd: 10, cost: 30, track: 3, recovery: 1,
        // 原作 Plunge：躍起後砸下，會修正落點抓翻滾，落點延遲爆炸
        actions: [{ do: 'tele', at: 0.1, dur: 1.15, shape: 'circle', r: 170, anchor: 'target', follow: true, lockBefore: 0.15, setMark: 'mgPlunge', chargeFx: false },
          { do: 'hide', at: 0.25, fx: 'mohgtakeoff' }, { do: 'land', at: 1.25, mark: 'mgPlunge' },
          { do: 'hit', at: 1.25, shape: 'circle', r: 170, anchor: 'mark', mark: 'mgPlunge', dmg: 126, posture: 38, kb: 380, ...BF, fx: 'mohgdive' },
          { do: 'tele', at: 1.3, dur: 0.55, shape: 'circle', r: 265, anchor: 'mark', mark: 'mgPlunge', chargeFx: false },
          { do: 'hit', at: 1.85, shape: 'circle', r: 265, anchor: 'mark', mark: 'mgPlunge', dmg: 92, posture: 24, kb: 420, multi: true, ...BF, fx: 'mohgexplode', ...bleed(13) }] },
      { id: 'bloodflame_swing', name: '血焰大橫掃', short: '大掃', phase: 2, tags: ['melee', 'aoe'], range: [0, 420], cd: 8.5, cost: 28, track: 2.6, recovery: 0.95,
        // 原作 Bloodflame Swing：大弧橫掃，留下的血焰軌跡隨後一路爆開
        actions: [...strike(0.75, 0.6, { shape: 'cone', r: 330, arc: 230 * D }, { dmg: 124, posture: 34, kb: 300, ...BF, fx: { id: 'mohgswing', arc: 230 * D }, ...bleed(10) }),
          ...[-1.6, -0.8, 0, 0.8, 1.6].map((ao, i) => ({ do: 'hit', at: +(1.15 + i * 0.08).toFixed(2), shape: 'circle', r: 88, off: 270, angOff: ao, dmg: 46, posture: 10, kb: 200, multi: true, ...BF, fx: 'mohgexplode', ...bleed(6) }))] },
    ],
    ultimate: { id: 'ult', name: '蒙格溫王朝・血之誕生', name2: '血之恩賜儀式・虛無', ult: true, range: [0, 1100], track: 2.5, recovery: 1.25,
      desc: '一階段（本遊戲新編，取意開場台詞「歡迎來到我們王朝的誕生之地」與交感無形之母的動畫）：高舉聖槍，背後泛起黑色波紋，血紅放射爆光吞沒周圍，血雨灑滿場地，最後一記聖槍爆擊。二階段（取自原作 Bloodboon Ritual）：飛上半空連念 Trēs、Duo、Ūnus 套滿三層咒印，再三度高舉聖槍念「Nihil」吸取敵人的血，血雨與血焰池覆蓋全場，落地重砸收尾。',
      actions: [{ do: 'tele', at: 0.1, dur: 1.5, shape: 'circle', r: 420, follow: true, chargeFx: 'mohgcommune' },
        { do: 'hit', at: 1.6, shape: 'circle', r: 420, dmg: 112, posture: 30, kb: 460, ...BLOOD, fx: 'mohgcommuneblast', ...bleed(24) },
        rain(1.9, 12, 1.8, 380, 54),
        { do: 'tele', at: 3.5, dur: 0.6, shape: 'circle', r: 260, off: 150, follow: true, chargeFx: false },
        { do: 'hit', at: 4.1, shape: 'circle', r: 260, off: 150, dmg: 132, posture: 40, kb: 460, multi: true, ...BF, fx: 'mohgexplode', ...bleed(14) }],
      actions2: [{ do: 'tele', at: 0.1, dur: 0.5, shape: 'circle', r: 300, follow: true, chargeFx: 'mohgcommune' },
        { do: 'curse', at: 0.6, i: 0 }, { do: 'curse', at: 1.0, i: 1 }, { do: 'curse', at: 1.4, i: 2 },
        { do: 'nihil', at: 2.2, base: 30, per: 26, heal: 0.6 }, { do: 'nihil', at: 2.95, base: 30, per: 26, heal: 0.6 }, { do: 'nihil', at: 3.7, base: 30, per: 26, heal: 0.6, last: true },
        rain(2.2, 14, 1.8, 420, 50),
        { do: 'tele', at: 4.1, dur: 0.6, shape: 'circle', r: 300, follow: true, chargeFx: false },
        { do: 'hit', at: 4.7, shape: 'circle', r: 300, dmg: 128, posture: 40, kb: 480, multi: true, ...BF, fx: 'mohgnihilend', ...bleed(14) },
        { do: 'bloodpools', at: 4.75, pattern: 'ring', n: 8, dist: 260 }],
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
