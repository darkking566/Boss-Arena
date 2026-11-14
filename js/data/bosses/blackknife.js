'use strict';
// 原作考據、圖片索引與改編界線：docs/bosses/blackknife.md、docs/research/blackknife/（52 張精選參考圖，含官方設定稿 bk-ref-001.jpg）。
// 招式完整考據自《艾爾登法環》黑刀刺客、黑刀狄希（Tiche）與封印監牢「黑刀首領・亞勒托（Alecto）」：
//   1. 黑刀・疾風連斬（反手二連斬＋正手突刺，二階段追加十字雙斬）
//   2. 命定之死・死亡之刃（騰空懸停揮出紅黑彎月光波，侵蝕生命上限並持續灼燒）
//   3. 側翻疾刃・雙月迴旋斬（側手翻閃避同時大弧度揮斬）
//   4. 貼地疾馳・挑空抹喉（壓低身形高速逼近，刀尖拖地擦出火花後由下往上挑斬）
//   5. 黑夜面紗・匿蹤背刺（披風折射光線留下殘影誘餌，瞬步繞背十字斬）
//   6. 致命處決・弒神抱殺（不可防禦飛身撲抓，將黑刀刺入胸口刻下死亡盧恩後拔刀引爆）
//   7. 騰空・裂地暴刺（高空翻騰躍起，倒持黑刀垂直插地引發死焰爆破）
//   8. 後空翻・暗刃散射（近身快斬後翻騰後撤，於半空扇形擲出黑刀飛刃）
//   9. 首領旋刃・紅蓮亂舞（二階段：亞勒托連續旋身推進的 360 度紅黑旋刃）
//  10. 死滅風暴・千刃裂隙（二階段：亞勒托招牌跳劈插地，展開球形交錯紅黑刀網並二次引爆）
//  大招：一階段「陰謀之夜・群影弒神陣」／二階段「黑刀首領・命定之死滅世劫」
(function (G) {
  const BD = G.BD, { D, strike } = BD.DataKit;
  const DD = { fxEl: 'destineddeath' };
  const deathStatus = { status: { id: 'destineddeath' } };

  BD.registerBoss({
    id: 'blackknife',
    name: '黑刀刺客',
    title: '陰謀之夜的弒神凶刃',
    archetype: '匿蹤瞬殺・命定死刃',
    desc: '陰謀之夜執行弒神暗殺的稀人女性刺客。身披能折射光線的半透明「黑夜面紗」與無聲銀鱗鎖子甲，手持寄宿失竊「命定之死」碎片的扭曲黑刀。身法如鬼魅般飄忽，擅長以面紗殘影混淆視聽、側翻迴旋與飛身抱殺處決；每一擊皆會烙下持續侵蝕生命的死亡盧恩，疊滿三層更會引發「死印崩裂」。半血後解放黑刀首領「亞勒托」真身，施展籠罩戰場的球形千刃死滅風暴。',
    color: '#e0143c',
    color2: '#161422',
    glow: '#ff284c',
    style: 'blackknife',
    rank: 'boss',
    stars: 4,
    radius: 24,
    maxHp: 1780,
    speed: 280,
    turn: 7.5,
    mass: 0.92,
    fxEl: 'destineddeath',
    hurt: 'flesh',
    traits: ['blackknife'],
    stamina: { max: 126, regen: 34 },
    posture: 88,
    dodgeCost: 15,
    dodgeSpeed: 590,
    ai: {
      prefRange: [75, 250],
      aggression: 0.78,
      dodge: 0.72,
      precision: 0.76,
      reaction: 0.18,
      strafe: 0.75,
      walk: 0.68,
      feint: 0.16,
      delay: 0.2,
      retreat: 0.22,
      punish: 0.76,
      nervous: 0.1,
      patience: 0.32,
      safeCancel: true,
      combos: [
        {
          id: 'flurry_ambush', name: '疾風・匿蹤背刺', weight: 1.3,
          steps: [
            { skill: 'dagger_flurry' },
            {
              skill: 'shadow_ambush', cancel: 0.28,
              branch: [
                { when: { rolled: true, dist: [90, 480] }, do: 'extend' },
                { when: { landed: true, dist: [0, 160] }, do: 'switch', skill: 'backflip_throw' },
                { do: 'stop' },
              ],
            },
          ],
        },
        {
          id: 'upcut_plunge', name: '挑空・裂地暴刺', weight: 1.15,
          steps: [
            { skill: 'lunging_upcut' },
            {
              skill: 'diving_splitter', cancel: 0.3,
              branch: [
                { when: { dist: [80, 420] }, do: 'extend' },
                { when: { dist: [0, 120] }, do: 'switch', skill: 'acrobatic_cartwheel' },
                { do: 'stop' },
              ],
            },
          ],
        },
        {
          id: 'cartwheel_wave', name: '雙月・死亡之刃', weight: 1.1,
          steps: [
            { skill: 'acrobatic_cartwheel' },
            {
              skill: 'blade_of_death', cancel: 0.26,
              branch: [
                { when: { dist: [110, 560] }, do: 'extend' },
                { when: { dist: [0, 140], landed: true }, do: 'switch', skill: 'fatal_grab' },
                { do: 'stop' },
              ],
            },
          ],
        },
        {
          id: 'alecto_execution', name: '首領・紅蓮死滅連殺', phase: 2, weight: 1.35,
          steps: [
            { skill: 'alecto_whirl' },
            {
              skill: 'death_storm', cancel: 0.32,
              branch: [
                { when: { dist: [0, 420] }, do: 'extend' },
                { do: 'stop' },
              ],
            },
          ],
        },
      ],
    },
    phase2: {
      speedMul: 1.14,
      dmgMul: 1.12,
      cdMul: 0.85,
      line: '「此身乃黑刀首領亞勒托——見證命定之死的真貌吧！」',
      aura: 'fire',
      fxEl: 'destineddeath',
      transFx: { id: 'bk_awaken', el: 'destineddeath' },
      transDur: 2.6,
      roarAt: 0.72,
      note: '黑刀首領・亞勒托覺醒：黑刀常駐爆燃命定之死紅黑烈焰，解鎖「首領旋刃・紅蓮亂舞」與球形刀網絕殺「死滅風暴・千刃裂隙」；疾風連斬追加第四段十字雙斬、死亡之刃化為三連死印月牙、裂地暴刺追加死印餘震。',
    },
    skills: [
      // 1. 黑刀・疾風連斬（反手二連斬 + 正手突刺，二階段追加十字雙斬）
      {
        id: 'dagger_flurry',
        name: '黑刀・疾風連斬',
        short: '連斬',
        tags: ['melee', 'fast'],
        range: [0, 200],
        cd: 3.2,
        cost: 15,
        track: 7.0,
        creep: 0.35,
        recovery: 0.42,
        actions: [
          ...strike(0.24, 0.20, { shape: 'cone', r: 175, arc: 125 * D, angOff: -0.22 }, { dmg: 32, posture: 9, kb: 110, fx: 'bk_slash', ...DD, ...deathStatus }),
          ...strike(0.50, 0.18, { shape: 'cone', r: 185, arc: 135 * D, angOff: 0.24 }, { dmg: 36, posture: 11, kb: 130, fx: 'bk_slash', ...DD, ...deathStatus }),
          ...strike(0.80, 0.22, { shape: 'rect', len: 220, w: 56 }, { dmg: 48, posture: 16, kb: 240, fx: 'bk_thrust', ...DD, ...deathStatus }),
        ],
        actions2: [
          ...strike(0.22, 0.18, { shape: 'cone', r: 185, arc: 130 * D, angOff: -0.22 }, { dmg: 32, posture: 9, kb: 110, fx: 'bk_slash', ...DD, ...deathStatus }),
          ...strike(0.46, 0.17, { shape: 'cone', r: 195, arc: 140 * D, angOff: 0.24 }, { dmg: 36, posture: 11, kb: 120, fx: 'bk_slash', ...DD, ...deathStatus }),
          ...strike(0.72, 0.20, { shape: 'rect', len: 235, w: 60 }, { dmg: 44, posture: 14, kb: 180, fx: 'bk_thrust', ...DD, ...deathStatus }),
          ...strike(1.00, 0.22, { shape: 'cone', r: 205, arc: 165 * D }, { dmg: 52, posture: 18, kb: 280, fx: 'bk_xslash', ...DD, ...deathStatus }),
        ],
      },
      // 2. 命定之死・死亡之刃（Blade of Death 騰空懸停紅黑月牙波）
      {
        id: 'blade_of_death',
        name: '命定之死・死亡之刃',
        short: '死刃',
        tags: ['ranged', 'aoe'],
        range: [110, 640],
        cd: 5.8,
        cost: 22,
        track: 6.0,
        recovery: 0.55,
        actions: [
          { do: 'tele', at: 0.05, dur: 0.45, shape: 'rect', len: 640, w: 82, follow: true, chargeFx: 'bk_deathwave_cast' },
          { do: 'proj', at: 0.50, speed: 740, r: 36, pierce: true, dmg: 62, posture: 18, kb: 220, life: 1.15, kind: 'deathblade', fx: 'bk_deathwave', ...DD, ...deathStatus, n: 1 },
        ],
        actions2: [
          { do: 'tele', at: 0.05, dur: 0.42, shape: 'rect', len: 660, w: 96, follow: true, chargeFx: 'bk_deathwave_cast' },
          { do: 'proj', at: 0.47, speed: 760, r: 38, pierce: true, dmg: 54, posture: 16, kb: 210, life: 1.15, kind: 'deathblade', fx: 'bk_deathwave', ...DD, ...deathStatus, n: 1 },
          { do: 'proj', at: 0.72, speed: 740, r: 28, pierce: true, dmg: 34, posture: 12, kb: 160, life: 1.10, kind: 'deathblade', fx: 'bk_deathwave', ...DD, ...deathStatus, n: 2, spread: 0.24 },
        ],
      },
      // 3. 側翻疾刃・雙月迴旋斬（Cartwheel Sweep 側手翻大弧度斬擊）
      {
        id: 'acrobatic_cartwheel',
        name: '側翻疾刃・雙月迴旋斬',
        short: '雙月',
        tags: ['melee', 'aoe', 'defensive'],
        range: [0, 230],
        cd: 4.8,
        cost: 18,
        track: 9.5,
        recovery: 0.46,
        actions: [
          { do: 'tele', at: 0.06, dur: 0.36, shape: 'cone', r: 255, arc: 235 * D, follow: true },
          { do: 'dash', at: 0.06, dist: 195, dur: 0.24, dir: 1.50, iframe: true, fx: 'bk_veil_vanish' },
          { do: 'hit', at: 0.42, shape: 'cone', r: 260, arc: 240 * D, dmg: 58, posture: 16, kb: 210, fx: 'bk_cartwheel', ...DD, ...deathStatus },
        ],
        actions2: [
          { do: 'tele', at: 0.05, dur: 0.33, shape: 'cone', r: 260, arc: 240 * D, follow: true },
          { do: 'dash', at: 0.05, dist: 195, dur: 0.22, dir: 1.50, iframe: true, fx: 'bk_veil_vanish' },
          { do: 'hit', at: 0.38, shape: 'cone', r: 265, arc: 245 * D, dmg: 50, posture: 15, kb: 180, fx: 'bk_cartwheel', ...DD, ...deathStatus },
          { do: 'tele', at: 0.44, dur: 0.32, shape: 'cone', r: 260, arc: 240 * D, follow: true },
          { do: 'dash', at: 0.44, dist: 205, dur: 0.22, dir: -1.50, iframe: true, fx: 'bk_veil_vanish' },
          { do: 'hit', at: 0.76, shape: 'cone', r: 265, arc: 245 * D, dmg: 48, posture: 15, kb: 240, fx: 'bk_xslash', ...DD, ...deathStatus },
        ],
      },
      // 4. 貼地疾馳・挑空抹喉（Low-stance drag sprint into rising slash）
      {
        id: 'lunging_upcut',
        name: '貼地疾馳・挑空抹喉',
        short: '挑空',
        tags: ['gap', 'melee'],
        range: [110, 420],
        cd: 5.6,
        cost: 20,
        track: 6.0,
        recovery: 0.50,
        actions: [
          { do: 'tele', at: 0.05, dur: 0.34, shape: 'rect', len: 340, w: 68, follow: true },
          { do: 'dash', at: 0.38, dist: 240, dur: 0.20, fx: 'bk_veil_vanish' },
          { do: 'hit', at: 0.58, shape: 'cone', r: 210, arc: 155 * D, dmg: 68, posture: 20, kb: 270, fx: 'bk_upcut', ...DD, ...deathStatus },
        ],
        actions2: [
          { do: 'tele', at: 0.05, dur: 0.30, shape: 'rect', len: 360, w: 74, follow: true },
          { do: 'dash', at: 0.34, dist: 260, dur: 0.18, fx: 'bk_veil_vanish' },
          { do: 'hit', at: 0.52, shape: 'cone', r: 225, arc: 165 * D, dmg: 64, posture: 18, kb: 220, fx: 'bk_upcut', ...DD, ...deathStatus },
          ...strike(0.80, 0.20, { shape: 'rect', len: 230, w: 60 }, { dmg: 44, posture: 14, kb: 260, fx: 'bk_thrust', ...DD, ...deathStatus }),
        ],
      },
      // 5. 黑夜面紗・匿蹤背刺（Concealing Veil Decoy + Backstab）
      {
        id: 'shadow_ambush',
        name: '黑夜面紗・匿蹤背刺',
        short: '背刺',
        tags: ['gap', 'fast'],
        range: [85, 500],
        cd: 7.2,
        cost: 22,
        track: 4.5,
        recovery: 0.55,
        actions: [
          { do: 'tele', at: 0.05, dur: 0.34, shape: 'circle', r: 85, anchor: 'target', follow: true },
          { do: 'bk_ambush', at: 0.36, dist: 40, decoyLife: 0.95, veilDur: 0.35 },
          { do: 'hit', at: 0.50, shape: 'cone', r: 195, arc: 165 * D, dmg: 76, posture: 22, kb: 260, fx: 'bk_xslash', ...DD, ...deathStatus },
        ],
      },
      // 6. 致命處決・弒神抱殺（Unblockable Lunging Grab Execution）
      {
        id: 'fatal_grab',
        name: '致命處決・弒神抱殺',
        short: '抱殺',
        tags: ['melee', 'gap'],
        range: [0, 250],
        cd: 9.2,
        cost: 26,
        track: 5.0,
        recovery: 0.75,
        actions: [
          { do: 'tele', at: 0.05, dur: 0.46, shape: 'cone', r: 190, arc: 95 * D, unblockable: true, follow: true },
          { do: 'dash', at: 0.48, dist: 135, dur: 0.14 },
          { do: 'bk_grab_strike', at: 0.60, r: 96, arc: 1.7, pinDmg: 26, burstDmg: 54, kb: 380 },
        ],
      },
      // 7. 騰空・裂地暴刺（Leaping Plunge Attack）
      {
        id: 'diving_splitter',
        name: '騰空・裂地暴刺',
        short: '裂地',
        tags: ['gap', 'aoe'],
        range: [100, 470],
        cd: 6.6,
        cost: 24,
        track: 4.0,
        recovery: 0.65,
        actions: [
          { do: 'tele', at: 0.05, dur: 0.72, shape: 'circle', r: 170, anchor: 'target', follow: true, lockBefore: 0.24, setMark: 'bkPlunge' },
          { do: 'hide', at: 0.14, fx: 'bk_plunge_takeoff' },
          { do: 'land', at: 0.77, mark: 'bkPlunge' },
          { do: 'hit', at: 0.77, shape: 'circle', r: 170, anchor: 'mark', mark: 'bkPlunge', dmg: 84, posture: 26, kb: 340, fx: 'bk_plunge_slam', ...DD, ...deathStatus },
        ],
        actions2: [
          { do: 'tele', at: 0.05, dur: 0.68, shape: 'circle', r: 180, anchor: 'target', follow: true, lockBefore: 0.22, setMark: 'bkPlunge' },
          { do: 'hide', at: 0.14, fx: 'bk_plunge_takeoff' },
          { do: 'land', at: 0.73, mark: 'bkPlunge' },
          { do: 'hit', at: 0.73, shape: 'circle', r: 180, anchor: 'mark', mark: 'bkPlunge', dmg: 78, posture: 24, kb: 300, fx: 'bk_plunge_slam', ...DD, ...deathStatus },
          { do: 'tele', at: 0.80, dur: 0.28, shape: 'circle', r: 210, anchor: 'mark', mark: 'bkPlunge' },
          { do: 'hit', at: 1.08, shape: 'circle', r: 210, anchor: 'mark', mark: 'bkPlunge', dmg: 44, posture: 14, kb: 360, multi: true, fx: 'bk_brand_burst', ...DD, ...deathStatus },
        ],
      },
      // 8. 後空翻・暗刃散射（Backflip Knife Throw）
      {
        id: 'backflip_throw',
        name: '後空翻・暗刃散射',
        short: '暗刃',
        tags: ['ranged', 'defensive'],
        range: [0, 250],
        cd: 5.6,
        cost: 18,
        track: 6.5,
        recovery: 0.50,
        actions: [
          ...strike(0.24, 0.18, { shape: 'cone', r: 170, arc: 145 * D }, { dmg: 34, posture: 10, kb: 190, fx: 'bk_slash', ...DD }),
          { do: 'dash', at: 0.28, dir: 'back', dist: 210, dur: 0.24, iframe: true, fx: 'bk_backflip' },
          { do: 'proj', at: 0.50, speed: 740, r: 16, dmg: 22, posture: 6, kb: 120, life: 1.15, kind: 'blackknife_dagger', fx: 'bk_deathwave', ...DD, ...deathStatus, n: 5, spread: 0.16 },
        ],
        actions2: [
          ...strike(0.22, 0.16, { shape: 'cone', r: 180, arc: 150 * D }, { dmg: 36, posture: 10, kb: 190, fx: 'bk_slash', ...DD }),
          { do: 'dash', at: 0.26, dir: 'back', dist: 220, dur: 0.22, iframe: true, fx: 'bk_backflip' },
          { do: 'proj', at: 0.46, speed: 780, r: 16, dmg: 20, posture: 6, kb: 120, life: 1.15, kind: 'blackknife_dagger', fx: 'bk_deathwave', ...DD, ...deathStatus, n: 7, spread: 0.14 },
        ],
      },
      // 9. 首領旋刃・紅蓮亂舞（Phase 2 Alecto's Advancing Spinning Combo）
      {
        id: 'alecto_whirl',
        name: '首領旋刃・紅蓮亂舞',
        short: '紅蓮',
        phase: 2,
        tags: ['melee', 'aoe', 'gap'],
        range: [0, 320],
        cd: 7.8,
        cost: 26,
        track: 6.0,
        recovery: 0.62,
        actions: [
          { do: 'tele', at: 0.05, dur: 0.32, shape: 'circle', r: 155, follow: true },
          { do: 'dash', at: 0.35, dist: 140, dur: 0.18 },
          { do: 'hit', at: 0.42, shape: 'circle', r: 155, dmg: 46, posture: 14, kb: 150, fx: 'bk_alecto_whirl', ...DD, ...deathStatus },
          { do: 'dash', at: 0.64, dist: 135, dur: 0.18 },
          { do: 'hit', at: 0.72, shape: 'circle', r: 165, dmg: 48, posture: 15, kb: 170, multi: true, fx: 'bk_alecto_whirl', ...DD, ...deathStatus },
          ...strike(1.04, 0.24, { shape: 'cone', r: 225, arc: 180 * D }, { dmg: 58, posture: 20, kb: 320, multi: true, fx: 'bk_xslash', ...DD, ...deathStatus }),
        ],
      },
      // 10. 死滅風暴・千刃裂隙（Phase 2 Alecto's Helical Death Sphere）
      {
        id: 'death_storm',
        name: '死滅風暴・千刃裂隙',
        short: '風暴',
        phase: 2,
        tags: ['aoe', 'gap'],
        range: [0, 440],
        cd: 10.5,
        cost: 32,
        track: 4.0,
        recovery: 0.85,
        actions: [
          { do: 'tele', at: 0.05, dur: 0.86, shape: 'circle', r: 235, anchor: 'target', follow: true, lockBefore: 0.28, setMark: 'stormSpot' },
          { do: 'hide', at: 0.16, fx: 'bk_plunge_takeoff' },
          { do: 'land', at: 0.91, mark: 'stormSpot' },
          { do: 'hit', at: 0.91, shape: 'circle', r: 235, anchor: 'mark', mark: 'stormSpot', dmg: 86, posture: 28, kb: 320, fx: 'bk_alecto_storm', ...DD, ...deathStatus },
          { do: 'tele', at: 0.98, dur: 0.34, shape: 'circle', r: 255, anchor: 'mark', mark: 'stormSpot' },
          { do: 'hit', at: 1.32, shape: 'circle', r: 255, anchor: 'mark', mark: 'stormSpot', dmg: 56, posture: 18, kb: 420, multi: true, fx: 'bk_brand_burst', ...DD, ...deathStatus },
        ],
      },
    ],
    ultimate: {
      id: 'ult',
      name: '陰謀之夜・群影弒神陣',
      name2: '黑刀首領・命定之死滅世劫',
      ult: true,
      range: [0, 900],
      track: 4.2,
      recovery: 1.0,
      desc: '一階段「陰謀之夜・群影弒神陣」：黑刀刺客化入黑夜面紗高速穿梭三連斬，隨後躍入高空並召出六道黑刀刺客分身自四面八方交錯穿刺，最後從天而降將死亡盧恩貫入大地引爆八方死焰光柱！二階段「黑刀首領・命定之死滅世劫」：亞勒托解放完整死亡盧恩，召出八方群影殺陣後墜落展開超大範圍千刃死滅風暴與滅世死印大爆破！',
      actions: [
        { do: 'tele', at: 0.08, dur: 0.46, shape: 'circle', r: 280, follow: true, chargeFx: 'bk_veil_vanish' },
        { do: 'dash', at: 0.54, dist: 240, dur: 0.15, fx: 'bk_veil_appear' },
        { do: 'hit', at: 0.68, shape: 'circle', r: 155, dmg: 42, posture: 12, kb: 160, multi: true, fx: 'bk_slash', ...DD, ...deathStatus },
        { do: 'dash', at: 0.86, dist: 250, dur: 0.15, dir: -1.45, fx: 'bk_veil_vanish' },
        { do: 'hit', at: 1.00, shape: 'circle', r: 155, dmg: 42, posture: 12, kb: 160, multi: true, fx: 'bk_xslash', ...DD, ...deathStatus },
        { do: 'tele', at: 1.15, dur: 0.65, shape: 'circle', r: 300, anchor: 'target', follow: true, lockBefore: 0.22, setMark: 'ultSpot' },
        { do: 'hide', at: 1.20, fx: 'bk_plunge_takeoff' },
        { do: 'bk_phantom_raid', at: 1.34, n: 6, rad: 230, life: 0.7 },
        { do: 'land', at: 1.80, mark: 'ultSpot' },
        { do: 'hit', at: 1.80, shape: 'circle', r: 300, anchor: 'mark', mark: 'ultSpot', dmg: 105, posture: 34, kb: 440, multi: true, fx: 'bk_ult_cataclysm', ...DD, ...deathStatus },
      ],
      actions2: [
        { do: 'tele', at: 0.08, dur: 0.56, shape: 'circle', r: 360, anchor: 'target', follow: true, lockBefore: 0.24, setMark: 'alectoUlt', chargeFx: 'bk_awaken' },
        { do: 'hide', at: 0.22, fx: 'bk_plunge_takeoff' },
        { do: 'bk_phantom_raid', at: 0.36, n: 8, rad: 270, life: 0.85 },
        { do: 'land', at: 0.94, mark: 'alectoUlt' },
        { do: 'hit', at: 0.94, shape: 'circle', r: 350, anchor: 'mark', mark: 'alectoUlt', dmg: 96, posture: 30, kb: 360, fx: 'bk_alecto_storm', ...DD, ...deathStatus },
        { do: 'tele', at: 1.02, dur: 0.46, shape: 'circle', r: 380, anchor: 'mark', mark: 'alectoUlt' },
        { do: 'hit', at: 1.48, shape: 'circle', r: 380, anchor: 'mark', mark: 'alectoUlt', dmg: 88, posture: 28, kb: 480, multi: true, fx: 'bk_ult_cataclysm', ...DD, ...deathStatus },
      ],
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
