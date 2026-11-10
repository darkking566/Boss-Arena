'use strict';
// Boss 資料：龍裝大樹守衛（Draconic Tree Sentinel，《艾爾登法環》首都外郭／法魯姆．亞茲拉的龍化守衛）
// 考據：葛朗薩克襲來後，守衛們頓悟「唯有自己化為龍才能守護黃金樹」；披畸形龍鎧、戰馬長出翼狀羽扇與棘刺，
//   右手龍爪巨槌（Dragon Greatclaw，是槌不是戟）、左手龍爪盾（雷屬性）。
//   一階段招式：槌砸 / 速擊 / 突進槌擊 / 守衛重砸 / 馬蹄踐踏 / 火球 / 盾掃 / 盾砸（單／雙）；
//   二階段（50%）灌入赤雷：雷盾橫掃、磨礪雷擊（對準落點三道雷）、雷鳴重擊（範圍約三倍）、雷浪（長距追蹤）。
// 被動沿用 trait 'sentinel'（盾側減傷，js/engine/traits.js）；二階段常駐狀態「龍雷灌注」在 js/engine/statuses/effects.js。考據見 docs/bosses/draconictreesentinel.md
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;
  const RED = { el: 'dragon' };                         // 赤雷：龍屬性（深紅 + 電弧）
  const FIRE = { id: 'burn', dur: 2.5 };

  // 磨礪雷擊：預警鎖定落點，連落三道赤雷（第三道範圍較大）
  function bolts(at, r, dmg, mark) {
    return [
      { do: 'tele', at: at - 1.0, dur: 1.0, shape: 'circle', r, anchor: 'target', follow: true, lockBefore: 0.3, setMark: mark },
      { do: 'hit', at, shape: 'circle', r, anchor: 'mark', mark, dmg, posture: 24, kb: 260, fx: { id: 'thunderstrike', ...RED, radius: r } },
      { do: 'hit', at: at + 0.2, shape: 'circle', r, anchor: 'mark', mark, dmg: Math.round(dmg * 0.8), posture: 20, kb: 240, fx: { id: 'thunderstrike', ...RED, radius: r } },
      { do: 'tele', at: at + 0.05, dur: 0.3, shape: 'circle', r: r * 1.35, anchor: 'mark', mark },
      { do: 'hit', at: at + 0.4, shape: 'circle', r: r * 1.35, anchor: 'mark', mark, dmg: Math.round(dmg * 1.15), posture: 36, kb: 420, fx: { id: 'dtsbolt', ...RED, radius: r * 1.35 } },
    ];
  }

  const boss = {
    id: 'draconictreesentinel', name: '龍裝大樹守衛', title: '龍化的黃金壁壘', archetype: '龍雷重騎',
    desc: '葛朗薩克襲來之後，守衛們領悟到：要守住黃金樹，自己就得變成龍。披著畸形的金色龍鎧、戰馬長出棘刺與羽翼，龍爪巨槌一砸便是半個場地，戰至半血，赤色雷霆灌進槌與盾，整片大地都是落雷。',
    color: '#d6a43a', color2: '#2a1810', glow: '#ff3b3b', style: 'draconictreesentinel',
    rank: 'boss', stars: 4.5,
    radius: 54, maxHp: 2350, speed: 210, turn: 3.4, mass: 2.5, fxEl: 'physical', hurt: 'flesh',
    traits: ['sentinel'], // 龍爪盾：盾側（左前方）來的攻擊減傷
    stamina: { max: 135, regen: 26 }, posture: 240, dodgeCost: 26, dodgeSpeed: 420,
    ai: {
      prefRange: [110, 270], aggression: 0.8, dodge: 0.25, precision: 0.65, reaction: 0.3, strafe: 0.4, walk: 0.8,
      feint: 0.05, delay: 0.45, retreat: 0.05, punish: 0.65, nervous: 0.05, patience: 0.4,
      combos: [
        { id: 'maulchain', name: '槌砸・盾掃', phase: 1, weight: 1.3, steps: [
          { skill: 'maul_slam' },
          { skill: 'shield_swipe', cancel: 0.35, branch: [
            { when: { dist: [0, 300] }, do: 'extend' },
            { chance: 0.4, do: 'delay', hold: [0.3, 0.55] },
            { do: 'stop' }] }] },
        { id: 'lungecrush', name: '突進・守衛重砸', weight: 1.1, steps: [
          { skill: 'lunge_strike' },
          { skill: 'sentinel_slam', cancel: 0.4, branch: [
            { when: { dist: [0, 300] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'stompsmash', name: '踐踏・雙盾砸', phase: 1, weight: 1.0, steps: [
          { skill: 'horse_stomp' },
          { skill: 'shield_smash', cancel: 0.35, branch: [
            { when: { rolled: true }, do: 'extend' },
            { when: { dist: [0, 230] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'stormsmite', name: '雷浪・雷鳴重擊', phase: 2, weight: 1.4, steps: [
          { skill: 'lightning_wave' },
          { skill: 'thunderous_smite', cancel: 0.45, branch: [
            { when: { dist: [0, 360] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'shieldbolt', name: '雷盾・磨礪雷擊', phase: 2, weight: 1.2, steps: [
          { skill: 'lightning_strike' },
          { skill: 'honed_bolt', cancel: 0.35, branch: [
            { when: { rolled: true }, do: 'extend' },
            { chance: 0.5, do: 'extend' },
            { do: 'stop' }] }] },
      ],
    },
    phase2: {
      speedMul: 1.12, dmgMul: 1.2, cdMul: 0.82,
      line: '（紅雷纏上巨槌與龍爪盾，戰馬仰天長嘶）', aura: 'fire', fxEl: 'dragon', transFx: { id: 'dtsawaken', el: 'dragon' },
      status: { id: 'draconicsurge' },
      note: '龍雷灌注常駐；解鎖「雷盾橫掃」「磨礪雷擊」「雷鳴重擊」「雷浪」；槌砸帶出雷環、火球更大，大招追加落雷',
    },
    skills: [
      // 1. 槌砸：龍爪巨槌砸向前方（原作 Hammer Attack）
      { id: 'maul_slam', name: '龍爪槌砸', short: '槌砸', tags: ['melee', 'aoe'], range: [0, 270], cd: 3.4, cost: 22, track: 5, creep: 0.3, recovery: 0.6,
        actions: strike(0.65, 0.5, { shape: 'circle', r: 130, off: 140 }, { dmg: 150, posture: 44, kb: 440, fx: { id: 'bigslam', scale: 0.85 } }),
        actions2: [...strike(0.6, 0.46, { shape: 'circle', r: 135, off: 145 }, { dmg: 160, posture: 46, kb: 460, fx: { id: 'bigslam', scale: 0.9 } }),
          ...strike(0.78, 0.16, { shape: 'ring', r0: 125, r: 215, off: 145 }, { dmg: 50, posture: 14, kb: 280, fx: { id: 'thunderstrike', ...RED, radius: 120 } })] },
      // 2. 速擊：幾乎沒有前搖，槌從待機姿勢直接落下（原作 Quick Hammer Strike，別大意）
      { id: 'quick_maul', name: '疾落槌擊', short: '速擊', tags: ['melee', 'fast'], range: [0, 225], cd: 3.8, cost: 16, track: 8, recovery: 0.45,
        actions: strike(0.3, 0.2, { shape: 'circle', r: 110, off: 120 }, { dmg: 108, posture: 34, kb: 380, fx: { id: 'slam', scale: 1.0 } }),
        actions2: strike(0.27, 0.18, { shape: 'circle', r: 118, off: 124 }, { dmg: 118, posture: 36, kb: 410, fx: { id: 'slam', scale: 1.1 } }) },
      // 3. 突進槌擊：策馬猛衝一步，落地槌砸（原作 Lunging Strike）
      { id: 'lunge_strike', name: '突進槌擊', short: '突進', tags: ['gap', 'melee'], range: [170, 520], cd: 5.0, cost: 24, track: 6, recovery: 0.6,
        actions: [...dashStrike(0.55, 0.45, 380, 108, 0.32, { dmg: 128, posture: 38, kb: 420 }, { fx: 'dash' }),
          ...strike(0.98, 0.3, { shape: 'circle', r: 130, off: 125 }, { dmg: 145, posture: 44, kb: 450, fx: { id: 'bigslam', scale: 0.85 } })],
        actions2: [...dashStrike(0.5, 0.42, 440, 114, 0.32, { dmg: 138, posture: 42, kb: 450 }, { fx: 'dash' }),
          ...strike(0.92, 0.28, { shape: 'circle', r: 138, off: 130 }, { dmg: 156, posture: 46, kb: 480, fx: { id: 'bigslam', scale: 0.92 } })] },
      // 4. 守衛重砸：戰馬人立、巨槌高舉很久，再砸出巨大的範圍（原作 Sentinel's Slam，全程追蹤，退遠或繞到背後）
      { id: 'sentinel_slam', name: '守衛重砸', short: '重砸', tags: ['melee', 'aoe'], range: [0, 320], cd: 5.2, cost: 28, track: 5, recovery: 0.85,
        actions: [...strike(0.95, 0.75, { shape: 'circle', r: 175, off: 155 }, { dmg: 200, posture: 60, kb: 540, fx: { id: 'bigslam', scale: 1.15 } }),
          ...strike(1.12, 0.2, { shape: 'ring', r0: 160, r: 280, off: 155 }, { dmg: 60, posture: 18, kb: 320, fx: 'ring' })],
        actions2: [...strike(0.88, 0.7, { shape: 'circle', r: 190, off: 160 }, { dmg: 215, posture: 64, kb: 570, fx: { id: 'bigslam', scale: 1.25 } }),
          ...strike(1.05, 0.2, { shape: 'ring', r0: 175, r: 320, off: 160 }, { dmg: 70, posture: 20, kb: 360, fx: { id: 'thunderstrike', ...RED, radius: 160 } })] },
      // 5. 馬蹄踐踏：人立後前蹄重踏，貼身的人被踏飛（原作 Horse Stomp）
      { id: 'horse_stomp', name: '龍馬踐踏', short: '踐踏', tags: ['melee', 'fast', 'defensive'], range: [0, 175], cd: 4.4, cost: 18, track: 7, recovery: 0.5,
        actions: strike(0.46, 0.34, { shape: 'circle', r: 128, off: 70 }, { dmg: 102, posture: 42, kb: 520, fx: { id: 'slam', scale: 1.1 } }),
        actions2: strike(0.42, 0.3, { shape: 'circle', r: 138, off: 74 }, { dmg: 112, posture: 46, kb: 560, fx: { id: 'slam', scale: 1.2 } }) },
      // 6. 龍息火球：戰馬噴出火球，用來懲罰遠處的人（原作 Fireball）；二階段更大
      { id: 'fireball', name: '龍息火球', short: '火球', tags: ['ranged', 'aoe'], range: [220, 700], cd: 6.2, cost: 22, track: 7, recovery: 0.6,
        actions: [{ do: 'tele', at: 0.15, dur: 0.6, shape: 'cone', r: 120, arc: 40 * D, follow: true },
          { do: 'lob', at: 0.75, n: 1, scatter: 0, lead: 0.4, flight: 0.85, r: 105, dmg: 135, posture: 40, kb: 360, kind: 'fire', status: FIRE }],
        actions2: [{ do: 'tele', at: 0.12, dur: 0.55, shape: 'cone', r: 120, arc: 40 * D, follow: true },
          { do: 'lob', at: 0.67, n: 2, scatter: 90, lead: 0.4, flight: 0.85, r: 118, dmg: 140, posture: 42, kb: 380, kind: 'fire', status: FIRE }] },
      // 7. 盾掃：龍爪盾由後往前（或由前往後）橫掃，射程比看起來長（原作 Shield Swipe）
      { id: 'shield_swipe', name: '龍爪盾掃', short: '盾掃', tags: ['melee', 'aoe'], range: [0, 255], cd: 4.0, cost: 20, track: 6, recovery: 0.55,
        actions: strike(0.5, 0.4, { shape: 'cone', r: 250, arc: 165 * D, angOff: -0.25 }, { dmg: 118, posture: 52, kb: 420, fx: { id: 'cleave', scale: 1.1 } }),
        actions2: strike(0.46, 0.36, { shape: 'cone', r: 265, arc: 170 * D, angOff: -0.25 }, { dmg: 128, posture: 56, kb: 450, fx: { id: 'cleave', scale: 1.2 } }) },
      // 8. 盾砸：龍爪盾筆直砸下，第二下接得很快（原作 Shield Smash / Double Smash）
      { id: 'shield_smash', name: '龍爪盾砸', short: '盾砸', tags: ['melee', 'fast'], range: [0, 205], cd: 4.6, cost: 20, track: 8, creep: 0.3, recovery: 0.5,
        actions: [...strike(0.34, 0.26, { shape: 'rect', len: 195, w: 135, angOff: -0.2 }, { dmg: 96, posture: 70, kb: 460, fx: { id: 'slam', scale: 1.0 } }),
          ...strike(0.72, 0.24, { shape: 'rect', len: 205, w: 140, angOff: -0.2 }, { dmg: 112, posture: 74, kb: 520, fx: { id: 'slam', scale: 1.15 } })],
        actions2: [...strike(0.3, 0.24, { shape: 'rect', len: 205, w: 140, angOff: -0.2 }, { dmg: 104, posture: 74, kb: 480, fx: { id: 'slam', scale: 1.1 } }),
          ...strike(0.66, 0.22, { shape: 'rect', len: 215, w: 145, angOff: -0.2 }, { dmg: 122, posture: 78, kb: 540, fx: { id: 'slam', scale: 1.25 } })] },
      // —— 二階段專屬（赤雷）——
      // 9. 雷盾橫掃：赤雷纏在盾上橫掃，周圍一圈跟著落雷（原作 Lightning Strike）
      { id: 'lightning_strike', name: '赤雷盾掃', short: '雷盾', phase: 2, tags: ['melee', 'aoe'], range: [0, 300], cd: 5.0, cost: 24, track: 6, recovery: 0.65,
        actions: [...strike(0.5, 0.4, { shape: 'cone', r: 260, arc: 175 * D, angOff: -0.25 }, { dmg: 128, posture: 56, kb: 460, fx: { id: 'cleave', scale: 1.2, ...RED } }),
          ...strike(0.78, 0.3, { shape: 'ring', r0: 120, r: 300 }, { dmg: 92, posture: 26, kb: 340, fx: { id: 'thunderstrike', ...RED, radius: 150 } })] },
      // 10. 磨礪雷擊：舉盾鎖定，盾一落就是三道赤雷（原作 Honed Bolt；翻滾時機在盾落下的那一瞬間）
      { id: 'honed_bolt', name: '磨礪雷擊', short: '落雷', phase: 2, tags: ['ranged', 'aoe'], range: [0, 620], cd: 7.0, cost: 28, track: 8, recovery: 0.9,
        actions: bolts(1.2, 95, 100, 'dtsBolt') },
      // 11. 雷鳴重擊：巨槌帶雷砸下，雷波把範圍擴成約三倍（原作 Thunderous Smite；之後槌上的雷就散了）
      { id: 'thunderous_smite', name: '雷鳴重擊', short: '雷鳴', phase: 2, tags: ['melee', 'aoe'], range: [0, 400], cd: 6.4, cost: 32, track: 5, recovery: 0.95,
        actions: [...strike(0.95, 0.75, { shape: 'circle', r: 140, off: 150 }, { dmg: 215, posture: 62, kb: 560, fx: { id: 'dtssmite', ...RED, radius: 140 } }),
          ...strike(1.12, 0.3, { shape: 'ring', r0: 130, r: 400, off: 150 }, { dmg: 105, posture: 30, kb: 420, fx: { id: 'thunderstrike', ...RED, radius: 200 } })] },
      // 12. 雷浪：巨槌拉到身後再猛地扯出，放出長距離、強追蹤的赤雷波（原作 Lightning Wave，常接雷鳴重擊）
      { id: 'lightning_wave', name: '赤雷浪', short: '雷浪', phase: 2, tags: ['ranged'], range: [180, 800], cd: 6.6, cost: 24, track: 7, recovery: 0.7,
        actions: [{ do: 'tele', at: 0.15, dur: 0.7, shape: 'cone', r: 700, arc: 22 * D, follow: true },
          { do: 'proj', at: 0.85, n: 1, speed: 640, r: 46, dmg: 140, posture: 40, kb: 380, life: 1.7, homing: 1.6, pierce: true, kind: 'redwave', fx: { id: 'dtswave', ...RED } }] },
    ],
    // 大招（改編）：龍雷灌注 → 衝鋒一趟 → 赤雷浪扇形 → 一排落雷；二階段再追加三處鎖定落雷與全場雷環
    ultimate: {
      id: 'ult', name: '龍化的黃金壁壘', name2: '龍化的黃金壁壘・赤雷天罰', ult: true, range: [0, 900], track: 4, recovery: 1.2,
      actions: [
        { do: 'status', at: 0.3, id: 'draconicsurge', fx: 'dtsawaken' },
        { do: 'tele', at: 0.3, dur: 0.9, shape: 'rect', len: 660, w: 130, follow: true, lockBefore: 0.25, chargeFx: 'ultcast' },
        { do: 'dash', at: 1.2, dist: 660, dur: 0.42, hit: { dmg: 125, posture: 36, kb: 430 }, fx: 'dash' },
        { do: 'tele', at: 1.7, dur: 0.6, shape: 'cone', r: 760, arc: 70 * D, follow: true },
        { do: 'proj', at: 2.3, n: 3, spread: 0.32, speed: 620, r: 44, dmg: 120, posture: 36, kb: 360, life: 1.7, homing: 1.4, pierce: true, kind: 'redwave', fx: { id: 'dtswave', ...RED } },
        { do: 'tele', at: 2.5, dur: 0.5, shape: 'rect', len: 1000, w: 150 },
        { do: 'erupt', at: 3.0, n: 8, interval: 0.09, start: 130, step: 120, r: 100, dmg: 78, posture: 22, kb: 260, fx: { id: 'thunderstrike', ...RED, radius: 100 } },
      ],
      actions2: [
        { do: 'status', at: 0.25, id: 'draconicsurge', fx: 'dtsawaken' },
        { do: 'tele', at: 0.25, dur: 0.85, shape: 'rect', len: 700, w: 140, follow: true, lockBefore: 0.25, chargeFx: 'ultcast' },
        { do: 'dash', at: 1.1, dist: 700, dur: 0.42, hit: { dmg: 135, posture: 38, kb: 450 }, fx: 'dash' },
        { do: 'tele', at: 1.6, dur: 0.6, shape: 'cone', r: 800, arc: 80 * D, follow: true },
        { do: 'proj', at: 2.2, n: 3, spread: 0.34, speed: 650, r: 46, dmg: 130, posture: 38, kb: 380, life: 1.8, homing: 1.5, pierce: true, kind: 'redwave', fx: { id: 'dtswave', ...RED } },
        { do: 'tele', at: 2.4, dur: 0.5, shape: 'rect', len: 1100, w: 160 },
        { do: 'erupt', at: 2.9, n: 9, interval: 0.08, start: 130, step: 125, r: 105, dmg: 84, posture: 22, kb: 270, fx: { id: 'thunderstrike', ...RED, radius: 105 } },
        ...bolts(4.4, 105, 105, 'dtsUlt1'),
        { do: 'tele', at: 5.0, dur: 0.4, shape: 'ring', r0: 200, r: 520 },
        { do: 'hit', at: 5.4, shape: 'ring', r0: 200, r: 520, dmg: 110, posture: 34, kb: 480, fx: { id: 'dtssmite', ...RED, radius: 360, scale: 1.4 } },
      ],
      desc: '一階段「龍化的黃金壁壘」：灌入龍雷、策馬衝鋒、放出三道追蹤赤雷浪，再沿面向落下一排雷柱；二階段「赤雷天罰」：追加鎖定落點的三連落雷與全場雷環。',
    },
  };

  BD.registerBoss(boss);
})(typeof window !== 'undefined' ? window : globalThis);
