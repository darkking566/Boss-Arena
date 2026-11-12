'use strict';
// 輝石龍亞杜拉（Glintstone Dragon Adula，《艾爾登法環》利耶尼亞 三姊妹 / 曼努斯・塞列斯大教堂）。考據與改編邊界見 docs/bosses/adula.md。
// 招式取自 Fextralife 招式流程圖（低踏 / 高踏 / 前撲踏、咬、尾鞭、翼砸 / 翼掃、衝撞、橫掃吐息、追蹤吐息、俯衝轟炸、側飛、輝石之星、亞杜拉月刃）；
// 原作與亞基爾共用大半動作，亞杜拉的獨門只有「輝石之星」（水晶爆裂成追蹤碎片）與「亞杜拉月刃」（空中凝出冰冷魔法大劍俯衝斬、放出霜寒劍波）。
// 改編：二階段（原作月刃 70% 以下才出現，本作放在半血）、被動「輝石結晶」、大招編排、數值。
(function (G) {
  const BD = G.BD, { D, strike } = BD.DataKit;
  const MAG = { fxEl: 'glintstone' }, PHYS = { fxEl: 'physical' };
  const FIELD = { kind: 'glintbloom', r: 80, dur: 4, dps: 12 };      // 吐息過後殘留的輝石魔力地
  const FROST = (n) => ({ id: 'frostbite', stacks: n, dur: 8 });

  // 橫掃吐息：n 個接力扇形由 from 轉到 from − step×(n−1)（相對面向，度），隔口留下魔力地
  function sweep(t0, n, gap, from, step, arc, r, dmg, scale) {
    return Array.from({ length: n }, (_, i) => ({ do: 'hit', at: +(t0 + i * gap).toFixed(3), shape: 'cone', r, arc: arc * D, angOff: (from - i * step) * D,
      dmg, posture: 8, kb: 120, multi: true, ...MAG, fx: { id: 'adulabreath', scale: scale || 1 }, ...(i % 2 ? { zone: FIELD } : {}) }));
  }
  // 追蹤吐息：細長輝石光柱跟著目標慢慢轉
  function stream(t0, n, gap, len, w, dmg) {
    return Array.from({ length: n }, (_, i) => ({ do: 'hit', at: +(t0 + i * gap).toFixed(3), shape: 'rect', len, w, dmg, posture: 7, kb: 90, multi: true,
      ...MAG, fx: { id: 'adulabreath', scale: 0.85, arc: 0.3 }, ...(i % 2 ? {} : { zone: FIELD }) }));
  }
  // 俯衝：升空（隱身）→ 鎖定落點 → 砸下，外圈再一圈碎晶
  function dive(at, up, r, dmg, mark, ring) {
    return [
      { do: 'tele', at: at - up, dur: up, shape: 'circle', r, anchor: 'target', follow: true, lockBefore: 0.35, setMark: mark, chargeFx: false },
      { do: 'hide', at: at - up + 0.06, fx: 'adulatakeoff', fxEl: 'glintstone' },
      { do: 'land', at, mark },
      { do: 'hit', at, shape: 'circle', r, anchor: 'mark', mark, dmg, posture: 60, kb: 560, ...MAG, fx: { id: 'adulaland', scale: r / 200 }, zone: { ...FIELD, r: 120 } },
      { do: 'tele', at: at - 0.1, dur: 0.38, shape: 'ring', r0: r - 20, r: r + ring, anchor: 'mark', mark },
      { do: 'hit', at: at + 0.28, shape: 'ring', r0: r - 20, r: r + ring, anchor: 'mark', mark, dmg: Math.round(dmg * 0.3), posture: 18, kb: 380, ...MAG, fx: { id: 'adulashock', scale: 1.2 } },
    ];
  }
  // 大招用的環形衝擊（環與環之間留縫）
  function rings(at, n, r0, gap, thick, dmg) {
    return Array.from({ length: n }, (_, i) => strike(at + i * 0.4, i ? 0.2 : 0.55, { shape: 'ring', r0: r0 + i * gap, r: r0 + i * gap + thick },
      { dmg: dmg + i * 4, posture: 14 + i * 3, kb: 240, multi: true, ...MAG, fx: { id: 'adulashock', scale: 1.4 } })).flat();
  }

  BD.registerBoss({
    id: 'adula', name: '輝石龍亞杜拉', title: '向暗月宣誓的食術龍', archetype: '飛龍・輝石魔法',
    desc: '利耶尼亞三姊妹一帶遊蕩的輝石龍：古龍後裔，吞食魔法師的身體被輝石侵蝕，鱗甲如深藍夜色，翼膜像破損的黑羽、背脊與頸後長出青白色結晶。傳說曾被魔女蘭妮擊敗，之後以騎士之禮向她的暗月宣誓效忠。吐息是青藍的輝石魔法，獨門技是凝出水晶、炸成追蹤碎片的「輝石之星」，與在空中咬出一把冰冷魔法大劍俯衝斬下的「亞杜拉月刃」。被動「輝石結晶」（改編）：落地行動時每 10 秒預警後在敵人腳邊長出輝石結晶殘滯，只減速。半血的「暗月之誓」二階段與大招為本遊戲改編。',
    color: '#4a6a9a', color2: '#141b2e', glow: '#6fe3ff', style: 'adula', rank: 'boss', stars: 3.5,
    radius: 96, sizeMul: 1.6, maxHp: 4600, speed: 215, turn: 3.4, mass: 2.6, fxEl: 'glintstone', hurt: 'flesh', traits: ['glintbloom'],
    stamina: { max: 165, regen: 32 }, posture: 245, dodgeCost: 26, dodgeSpeed: 450,
    ai: { prefRange: [190, 460], aggression: 0.72, dodge: 0.24, precision: 0.62, reaction: 0.32, strafe: 0.35, walk: 0.7,
      feint: 0.05, delay: 0.3, retreat: 0.16, punish: 0.64, nervous: 0.06, patience: 0.35,
      combos: [
        { id: 'stompwing', name: '踏地・翼砸', weight: 1.1, steps: [
          { skill: 'stomp' },
          { skill: 'wing_slam', cancel: 0.3, branch: [
            { when: { rolled: true, rollDir: ['back'] }, chance: 0.6, do: 'switch', skill: 'charge' },
            { when: { dist: [0, 360] }, do: 'extend' },
            { when: { dist: [360, 800] }, do: 'switch', skill: 'sweeping_breath' },
            { do: 'stop' }] }] },
        { id: 'tailbreath', name: '尾鞭・追蹤吐息', weight: 1.2, steps: [
          { skill: 'tail_gore' },
          { skill: 'tracking_breath', cancel: 0.35, branch: [{ when: { dist: [0, 560] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'starsky', name: '輝石之星・俯衝', weight: 1.0, steps: [
          { skill: 'glintstone_stars' },
          { skill: 'dive_bomb', cancel: 0.3, branch: [{ when: { dist: [200, 900] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'oathblade', name: '掠襲・月刃', phase: 2, weight: 1.4, steps: [
          { skill: 'strafe' },
          { skill: 'moonblade', cancel: 0.35, branch: [{ when: { dist: [150, 800] }, do: 'extend' }, { do: 'stop' }] }] },
      ],
    },
    phase2: { speedMul: 1.1, dmgMul: 1.15, cdMul: 0.85, line: '——暗月高懸。輝石龍仰首，翼膜上的結晶一根根亮起，口中咬住一把冰冷的魔法大劍。',
      aura: 'frost', fxEl: 'glintstone', transFx: { id: 'adulamoonrise', el: 'glintstone' }, transDur: 2.7, roarAt: 1.8,
      note: '「暗月之誓」為本遊戲改編（原作月刃約 70% 血以下才出現，且 Three Sisters 版半血會飛走）：半血時暗月升起、結晶轉亮；吐息更寬、碎片更多，解鎖「側飛掠襲」與「亞杜拉月刃」；大招換成「暗月之誓・月刃星落」',
    },
    skills: [
      // 1. 咬（原作 Bite ↺ ↻）：朝一側咬、再反向回咬；二階段多一口魔法咬
      { id: 'bite', name: '撕咬・反向回咬', short: '撕咬', tags: ['melee', 'fast'], range: [0, 300], cd: 3.6, cost: 16, track: 7, creep: 0.3, recovery: 0.55,
        actions: [...strike(0.45, 0.35, { shape: 'circle', r: 120, off: 175, angOff: 0.35 }, { dmg: 90, posture: 26, kb: 220, ...PHYS, fx: { id: 'adulabite', scale: 1.3 } }),
          ...strike(0.95, 0.3, { shape: 'circle', r: 125, off: 180, angOff: -0.35 }, { dmg: 102, posture: 30, kb: 320, ...PHYS, fx: { id: 'adulabite', scale: 1.4 } })],
        actions2: [...strike(0.42, 0.32, { shape: 'circle', r: 125, off: 175, angOff: 0.35 }, { dmg: 86, posture: 24, kb: 160, ...PHYS, fx: { id: 'adulabite', scale: 1.3 } }),
          ...strike(0.85, 0.28, { shape: 'circle', r: 125, off: 180, angOff: -0.35 }, { dmg: 90, posture: 26, kb: 160, ...PHYS, fx: { id: 'adulabite', scale: 1.4 } }),
          ...strike(1.35, 0.3, { shape: 'circle', r: 140, off: 185 }, { dmg: 106, posture: 34, kb: 380, ...MAG, fx: { id: 'adulabite', scale: 1.5 } })] },
      // 2. 踏地（Low / High Stomp → Lunging Stomp）
      { id: 'stomp', name: '踏地・前撲重踏', short: '踏地', tags: ['melee', 'aoe'], range: [0, 320], cd: 6, cost: 26, track: 5, recovery: 0.8,
        actions: [...strike(0.6, 0.45, { shape: 'circle', r: 130, off: 70, angOff: 0.8 }, { dmg: 76, posture: 24, kb: 260, ...PHYS, fx: { id: 'adulastomp', scale: 1 } }),
          ...strike(1.05, 0.3, { shape: 'circle', r: 130, off: 70, angOff: -0.8 }, { dmg: 80, posture: 26, kb: 280, ...PHYS, fx: { id: 'adulastomp', scale: 1.05 } }),
          { do: 'dash', at: 1.4, dist: 140, dur: 0.22 },
          ...strike(1.75, 0.35, { shape: 'circle', r: 175, off: 90 }, { dmg: 126, posture: 42, kb: 460, ...PHYS, fx: { id: 'adulastomp', scale: 1.3 } })] },
      // 3. 翼砸 / 翼掃（Wing Slam / Wing Sweep）
      { id: 'wing_slam', name: '翼砸・貼地翼掃', short: '翼砸', tags: ['melee', 'aoe'], range: [0, 380], cd: 6.5, cost: 26, track: 5, recovery: 0.85,
        actions: [...strike(0.75, 0.55, { shape: 'circle', r: 150, off: 150, angOff: 1.0 }, { dmg: 116, posture: 38, kb: 420, ...PHYS, fx: { id: 'adulawing', scale: 1.1 } }),
          ...strike(1.45, 0.4, { shape: 'cone', r: 360, arc: 170 * D, angOff: -0.25 }, { dmg: 94, posture: 30, kb: 400, ...PHYS, fx: { id: 'adulawing', scale: 1.5, arc: 2.9 } })] },
      // 4. 衝撞（Charge）
      { id: 'charge', name: '怒吼衝撞', short: '衝撞', tags: ['gap', 'melee'], range: [200, 700], cd: 8, cost: 28, track: 6, recovery: 0.9,
        actions: [{ do: 'tele', at: 0.05, dur: 0.75, shape: 'rect', len: 600, w: 170, follow: true, lockBefore: 0.3, chargeFx: 'adulagather' },
          { do: 'dash', at: 0.8, dist: 470, dur: 0.5, hit: { dmg: 70, posture: 20, kb: 240 }, fx: 'adulacharge' },
          ...strike(1.45, 0.2, { shape: 'cone', r: 250, arc: 110 * D }, { dmg: 126, posture: 42, kb: 520, ...PHYS, fx: { id: 'adulabite', scale: 1.7 } })] },
      // 5. 尾鞭＋咬（Tail Whip / Whip & Bite）
      { id: 'tail_gore', name: '甩尾・回首咬', short: '甩尾', tags: ['melee', 'aoe'], range: [0, 340], cd: 6.5, cost: 24, track: 4, recovery: 0.75,
        actions: [...strike(0.6, 0.45, { shape: 'circle', r: 300 }, { dmg: 110, posture: 36, kb: 480, ...PHYS, fx: { id: 'adulatail', scale: 1.3 } }),
          ...strike(1.2, 0.3, { shape: 'cone', r: 270, arc: 120 * D }, { dmg: 96, posture: 30, kb: 380, ...PHYS, fx: { id: 'adulabite', scale: 1.4 } })] },
      // 6. 橫掃吐息（Sweeping Breath）：輝石魔法，從左掃到右
      { id: 'sweeping_breath', name: '輝石吐息・橫掃', short: '橫掃', tags: ['ranged', 'aoe'], range: [120, 600], cd: 9, cost: 30, track: 5, recovery: 0.95,
        actions: [{ do: 'tele', at: 0.1, dur: 0.85, shape: 'cone', r: 560, arc: 190 * D, follow: true, lockBefore: 0.3, chargeFx: 'adulagather' }, ...sweep(0.95, 8, 0.12, -90, -25.7, 60, 560, 34)],
        actions2: [{ do: 'tele', at: 0.1, dur: 0.8, shape: 'cone', r: 620, arc: 220 * D, follow: true, lockBefore: 0.3, chargeFx: 'adulagather' }, ...sweep(0.9, 9, 0.11, -105, -26.25, 64, 620, 34, 1.15)] },
      // 7. 追蹤吐息（Tracking Breath）
      { id: 'tracking_breath', name: '追蹤吐息', short: '追蹤', tags: ['ranged'], range: [150, 620], cd: 7.5, cost: 26, track: 1.6, sweep: true, recovery: 0.8,
        actions: [{ do: 'tele', at: 0.1, dur: 0.65, shape: 'rect', len: 560, w: 110, follow: true, chargeFx: 'adulagather' }, ...stream(0.75, 8, 0.16, 560, 110, 26)] },
      // 8. 俯衝轟炸（Dive Bomb）
      { id: 'dive_bomb', name: '三拍俯衝', short: '俯衝', tags: ['gap', 'aoe'], range: [220, 900], cd: 11, cost: 32, track: 5, recovery: 1.1,
        actions: dive(1.55, 1.3, 190, 176, 'adDive', 160),
        actions2: [...dive(1.45, 1.2, 205, 184, 'adDive', 180),
          { do: 'tele', at: 1.55, dur: 0.45, shape: 'ring', r0: 200, r: 460, anchor: 'mark', mark: 'adDive' },
          { do: 'hit', at: 2.0, shape: 'ring', r0: 200, r: 460, anchor: 'mark', mark: 'adDive', dmg: 56, posture: 16, kb: 300, ...MAG, fx: { id: 'adulashock', scale: 1.8 } }] },
      // 9. 輝石之星（Glintstone Stars / Crystal Burst，亞杜拉獨門）：嘴前凝出水晶，炸成追蹤碎片
      { id: 'glintstone_stars', name: '輝石之星', short: '星晶', tags: ['ranged', 'aoe'], range: [200, 900], cd: 10, cost: 30, track: 3, recovery: 1.05,
        actions: [{ do: 'tele', at: 0.05, dur: 0.95, shape: 'circle', r: 130, off: 210, follow: true, lockBefore: 0.3, chargeFx: 'adulagather' },
          { do: 'hit', at: 1.0, shape: 'circle', r: 130, off: 210, dmg: 58, posture: 16, kb: 200, ...MAG, fx: { id: 'adulacrystal', scale: 1.2 } },
          { do: 'proj', at: 1.05, n: 7, spread: 0.2, speed: 540, r: 34, dmg: 54, posture: 12, kb: 160, life: 2.4, homing: 1.4, kind: 'glintshard', fxEl: 'glintstone', fx: 'adulastars' },
          { do: 'proj', at: 1.55, n: 9, radial: true, speed: 400, r: 30, dmg: 48, posture: 10, kb: 140, life: 2.6, homing: 1.1, kind: 'glintshard', fxEl: 'glintstone', fx: 'adulastars' }],
        actions2: [{ do: 'tele', at: 0.05, dur: 0.9, shape: 'circle', r: 140, off: 210, follow: true, lockBefore: 0.3, chargeFx: 'adulagather' },
          { do: 'hit', at: 0.95, shape: 'circle', r: 140, off: 210, dmg: 58, posture: 16, kb: 200, ...MAG, fx: { id: 'adulacrystal', scale: 1.3 } },
          { do: 'proj', at: 1.0, n: 9, spread: 0.18, speed: 560, r: 34, dmg: 54, posture: 12, kb: 160, life: 2.4, homing: 1.5, kind: 'glintshard', fxEl: 'glintstone', fx: 'adulastars' },
          { do: 'proj', at: 1.45, n: 12, radial: true, speed: 420, r: 30, dmg: 48, posture: 10, kb: 140, life: 2.6, homing: 1.2, kind: 'glintshard', fxEl: 'glintstone', fx: 'adulastars' },
          { do: 'proj', at: 1.9, n: 8, radial: true, angOff: 0.2, speed: 380, r: 30, dmg: 46, posture: 10, kb: 130, life: 2.6, homing: 1.2, kind: 'glintshard', fxEl: 'glintstone', fx: 'adulastars' }] },
      // —— 二階段專屬 ——
      // 10. 側飛掠襲（Strafe）：低空往前掠過，同時朝一側噴出一排輝石吐息
      { id: 'strafe', name: '側飛掠襲', short: '掠襲', phase: 2, tags: ['gap', 'ranged', 'aoe'], range: [180, 760], cd: 10, cost: 30, track: 4, recovery: 0.9,
        actions: [{ do: 'dash', at: 0.05, dir: 'back', dist: 160, dur: 0.3, fx: 'adulatakeoff' },
          { do: 'tele', at: 0.3, dur: 0.6, shape: 'rect', len: 640, w: 260, follow: true, lockBefore: 0.25, chargeFx: 'adulagather' },
          { do: 'dash', at: 0.9, dist: 640, dur: 1.0, trail: { ...FIELD, r: 70, dur: 4 }, hit: { dmg: 58, posture: 18, kb: 260 } },
          ...[0, 1, 2, 3, 4].map((i) => ({ do: 'hit', at: +(0.95 + i * 0.2).toFixed(2), shape: 'cone', r: 300, arc: 70 * D, angOff: -1.25, dmg: 32, posture: 8, kb: 140, multi: true,
            ...MAG, fx: { id: 'adulabreath', scale: 0.8 } }))] },
      // 11. 亞杜拉月刃（Adula's Moonblade，亞杜拉獨門）：飛上高空、咬出冰冷魔法大劍，俯衝斬下並放出霜寒劍波
      { id: 'moonblade', name: '亞杜拉月刃', short: '月刃', phase: 2, tags: ['gap', 'aoe'], range: [200, 900], cd: 13, cost: 36, track: 5, recovery: 1.15,
        actions: [{ do: 'tele', at: 0.05, dur: 1.55, shape: 'circle', r: 250, anchor: 'target', follow: true, lockBefore: 0.45, setMark: 'adBlade', chargeFx: false },
          { do: 'hide', at: 0.12, fx: 'adulatakeoff', fxEl: 'glintstone' },
          { do: 'land', at: 1.6, mark: 'adBlade' },
          { do: 'hit', at: 1.6, shape: 'circle', r: 250, anchor: 'mark', mark: 'adBlade', dmg: 150, posture: 55, kb: 520, status: FROST(40), ...MAG, fx: { id: 'adulamoon', scale: 1.3 } },
          { do: 'proj', at: 1.75, n: 3, spread: 0.55, speed: 680, r: 70, dmg: 80, posture: 18, kb: 200, life: 1.4, pierce: true, status: FROST(25), kind: 'moonwave', fxEl: 'glintstone', fx: 'adulamoonwave' }] },
    ],
    // 大招（本遊戲編排）：一階段「輝石星墜」——蓄起魔力、結晶碎片如雨落下，再以環形衝擊推出；
    //   二階段「暗月之誓・月刃星落」——暗月高懸，星墜更密，最後以橫掃的月刃劍波收尾
    ultimate: { id: 'ult', name: '輝石星墜', name2: '暗月之誓・月刃星落', ult: true, range: [0, 1100], track: 3, recovery: 1.25,
      desc: '本遊戲新編（取意原作「食術龍、向暗月宣誓」）：蓄起滿身輝石魔力，結晶碎片如流星雨落下，環形衝擊層層推出；二階段先升起暗月，星墜更密，收尾加上橫掃全場的月刃劍波。',
      actions: [{ do: 'tele', at: 0.1, dur: 1.4, shape: 'circle', r: 580, follow: true, chargeFx: 'adulamoonrise' },
        { do: 'rain', at: 1.6, n: 13, dur: 2, area: 380, flight: 0.8, r: 95, dmg: 60, posture: 14, kb: 200, kind: 'glintrock', fx: 'adulameteor', teleColor: '#6fe3ff' },
        ...rings(4.0, 4, 140, 150, 110, 68)],
      actions2: [{ do: 'tele', at: 0.1, dur: 1.3, shape: 'circle', r: 600, follow: true, chargeFx: 'adulamoonrise' },
        { do: 'rain', at: 1.5, n: 15, dur: 1.8, area: 400, flight: 0.7, r: 95, dmg: 58, posture: 12, kb: 190, kind: 'glintrock', fx: 'adulameteor', teleColor: '#6fe3ff' },
        ...rings(3.3, 4, 140, 150, 110, 70),
        { do: 'tele', at: 4.8, dur: 0.8, shape: 'circle', r: 960, chargeFx: 'adulagather' },
        ...Array.from({ length: 11 }, (_, i) => ({ do: 'hit', at: +(5.65 + i * 0.17).toFixed(2), shape: 'rect', len: 960, w: 150, angOff: (-150 + i * 30) * D,
          dmg: 36, posture: 7, kb: 90, multi: true, status: FROST(8), ...MAG, fx: 'adulamoon' }))],
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
