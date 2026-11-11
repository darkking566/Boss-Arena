'use strict';
// Boss 資料：飛龍桂雷爾（Flying Dragon Greyll，《艾爾登法環》格雷爾龍巢・法魯姆大橋）。考據與改編邊界見 docs/bosses/greyll.md。
// 原作：與飛龍亞基爾同模型、同招式表（Eldenpedia 註明外觀與能力相同），差別是場地（窄橋）與強度（HP 11,550，約亞基爾的 3.6 倍）。
//   本作沿用那套招式（踏地 / 撕咬 / 翼擊 / 衝撞 / 甩尾 / 橫掃龍息 / 追蹤龍息 / 三拍俯衝 / 後躍噴焰 / 掠襲），數值是本遊戲的調整值。
// 改編（原作沒有）：桂雷爾是母龍格雷爾的後裔，所以加上母龍之嚎的主題——被動「母龍餘威」、半血「灰母血脈」、
//   專屬「長橋龍息」「母龍之嚎」「灰燼風暴」與大招「母龍之嚎」「焚橋・灰母降臨」。
// 繪圖：style 'greyll' 借用亞基爾的龍體造型（同模型），招式 id 在造型檔內對映；特效沿用 agheel* 的撕咬 / 踏地 / 甩尾 / 龍息，另有 greyll* 專屬 5 種。
(function (G) {
  const BD = G.BD, { D, strike } = BD.DataKit;
  const BURN = { id: 'burn', dur: 3 };
  const SHRED = (dur) => ({ id: 'powershred', dur: dur || 6 });
  const FIRE = { fxEl: 'fire', status: BURN };
  const PHYS = { fxEl: 'physical' };
  const FIELD = { kind: 'fire', r: 90, dur: 4.8, dps: 15 };   // 橋面燒焦的火地

  // 龍息橫掃：n 個接力扇形由 from 轉到 from − step×(n−1)（相對面向，度）；每兩口在扇形中段留一片火地
  function sweep(t0, n, gap, from, step, arc, r, dmg, scale) {
    const out = [];
    for (let i = 0; i < n; i++) out.push({ do: 'hit', at: +(t0 + i * gap).toFixed(3), shape: 'cone', r, arc: arc * D, angOff: (from - i * step) * D,
      dmg, posture: 8, kb: 120, multi: true, ...FIRE, fx: { id: 'agheelbreath', scale: scale || 1 }, ...(i % 2 ? { zone: FIELD } : {}) });
    return out;
  }
  // 追蹤龍息：細長火柱跟著目標慢慢轉
  function stream(t0, n, gap, len, w, dmg) {
    return Array.from({ length: n }, (_, i) => ({ do: 'hit', at: +(t0 + i * gap).toFixed(3), shape: 'rect', len, w, dmg, posture: 7, kb: 90, multi: true,
      ...FIRE, fx: { id: 'agheelbreath', scale: 0.9, arc: 0.3 }, ...(i % 2 ? {} : { zone: FIELD }) }));
  }
  // 三拍俯衝：升空（隱身）→ 振翼三下鎖定落點 → 砸下火焰衝擊，外圈再一圈翼風
  function dive(at, up, r, dmg, mark, ring, fieldR) {
    return [
      { do: 'tele', at: at - up, dur: up, shape: 'circle', r, anchor: 'target', follow: true, lockBefore: 0.35, setMark: mark, chargeFx: false },
      { do: 'hide', at: at - up + 0.06, fx: 'agheeltakeoff', fxEl: 'fire' },
      { do: 'land', at, mark },
      { do: 'hit', at, shape: 'circle', r, anchor: 'mark', mark, dmg, posture: 60, kb: 560, ...FIRE, fx: { id: 'agheeldive', scale: r / 200 }, zone: { ...FIELD, r: fieldR || 125 } },
      { do: 'tele', at: at - 0.1, dur: 0.38, shape: 'ring', r0: r - 20, r: r + ring, anchor: 'mark', mark },
      { do: 'hit', at: at + 0.28, shape: 'ring', r0: r - 20, r: r + ring, anchor: 'mark', mark, dmg: Math.round(dmg * 0.32), posture: 18, kb: 380, ...PHYS, fx: { id: 'agheelwing', scale: 1.3 } },
    ];
  }

  const greyll = {
    id: 'greyll', name: '飛龍桂雷爾', title: '法魯姆大橋的灰母之裔', archetype: '飛龍・長橋龍息',
    desc: '守在龍巢高原法魯姆大橋上的飛龍——母龍格雷爾的後裔，與亞基爾同樣的灰黑羽鱗、後掠長角與破旗般的長尾，但體型更大、更耐打，又被窄橋逼得更凶。牠踏地、撕咬、以翅膀拍擊，退到半空俯衝，或沿著整條橋噴出一道火。被動「母龍餘威」（改編）：每隔一陣昂首咆哮，震出一圈氣浪，受到的人攻擊與防禦下降。',
    color: '#4a4f58', color2: '#1b1d22', glow: '#ff7a2a', style: 'greyll',
    rank: 'boss', stars: 4,
    radius: 96, sizeMul: 1.85, maxHp: 2700, speed: 195, turn: 3.2, mass: 3.0, fxEl: 'fire', hurt: 'flesh',
    traits: ['greyoll'],
    stamina: { max: 170, regen: 32 }, posture: 260, dodgeCost: 26, dodgeSpeed: 450,
    ai: {
      prefRange: [200, 460], aggression: 0.74, dodge: 0.22, precision: 0.6, reaction: 0.32, strafe: 0.3, walk: 0.7,
      feint: 0.05, delay: 0.3, retreat: 0.12, punish: 0.65, nervous: 0.05, patience: 0.35,
      combos: [
        { id: 'hopbreath', name: '甩尾・追蹤龍息', phase: 1, weight: 1.2, steps: [
          { skill: 'tail_gore' },
          { skill: 'tracking_breath', cancel: 0.35, branch: [{ when: { dist: [0, 620] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'stompwing', name: '踏地・翼擊', weight: 1.1, steps: [
          { skill: 'stomp' },
          { skill: 'wing_slam', cancel: 0.3, branch: [
            { when: { rolled: true, rollDir: ['back'] }, chance: 0.6, do: 'switch', skill: 'charge' },
            { when: { dist: [0, 400] }, do: 'extend' },
            { when: { dist: [400, 860] }, do: 'switch', skill: 'sweeping_breath' },
            { do: 'stop' }] }] },
        { id: 'skyfall', name: '後躍・俯衝', weight: 1.0, steps: [
          { skill: 'retreat_flame' },
          { skill: 'dive_bomb', cancel: 0.3, branch: [{ when: { dist: [220, 980] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'bridgefire', name: '掠襲・長橋龍息', weight: 1.2, steps: [
          { skill: 'strafe' },
          { skill: 'bridge_inferno', cancel: 0.35, branch: [{ when: { dist: [160, 820] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'greyollstorm', name: '母龍之嚎・灰燼風暴', phase: 2, weight: 1.5, steps: [
          { skill: 'greyoll_roar' },
          { skill: 'ash_storm', cancel: 0.35, branch: [{ when: { dist: [100, 900] }, do: 'extend' }, { do: 'stop' }] }] },
      ],
    },
    phase2: {
      speedMul: 1.1, dmgMul: 1.15, cdMul: 0.85, line: '——灰母血脈甦醒。天空壓低，整座大橋被火光與灰燼吞沒。',
      aura: 'fire', fxEl: 'fire', transFx: { id: 'greyllheart', el: 'fire' }, transDur: 2.6, roarAt: 1.7,
      note: '「灰母血脈」為本遊戲改編（原作只有一個階段）：龍息更寬、火地更大，撕咬改三連，俯衝落地多一圈火環；被動「母龍餘威」更頻繁、debuff 更久；解鎖「母龍之嚎」與「灰燼風暴」；大招換成「焚橋・灰母降臨」',
    },
    skills: [
      // 1. 撕咬（原作 Bite）：低頭蓄一下，朝一側咬、再反方向回咬；二階段多一口
      { id: 'bite', name: '撕咬・反向回咬', short: '撕咬', tags: ['melee', 'fast'], range: [0, 300], cd: 3.6, cost: 16, track: 7, creep: 0.3, recovery: 0.55,
        actions: [...strike(0.45, 0.35, { shape: 'circle', r: 120, off: 175, angOff: 0.35 }, { dmg: 98, posture: 28, kb: 220, ...PHYS, fx: { id: 'agheelbite', scale: 1.4 } }),
          ...strike(0.95, 0.3, { shape: 'circle', r: 125, off: 180, angOff: -0.35 }, { dmg: 110, posture: 32, kb: 320, ...PHYS, fx: { id: 'agheelbite', scale: 1.5 } })],
        actions2: [...strike(0.42, 0.32, { shape: 'circle', r: 125, off: 175, angOff: 0.35 }, { dmg: 94, posture: 26, kb: 160, ...PHYS, fx: { id: 'agheelbite', scale: 1.4 } }),
          ...strike(0.85, 0.28, { shape: 'circle', r: 125, off: 180, angOff: -0.35 }, { dmg: 98, posture: 28, kb: 160, ...PHYS, fx: { id: 'agheelbite', scale: 1.5 } }),
          ...strike(1.35, 0.3, { shape: 'circle', r: 140, off: 185 }, { dmg: 114, posture: 36, kb: 380, ...FIRE, fx: { id: 'agheelbite', scale: 1.6 } })] },
      // 2. 踏地（原作 Low / High Stomp → Lunging Stomp）
      { id: 'stomp', name: '踏地・突進重踏', short: '踏地', tags: ['melee', 'aoe'], range: [0, 330], cd: 6, cost: 26, track: 5, recovery: 0.8,
        actions: [...strike(0.6, 0.45, { shape: 'circle', r: 130, off: 70, angOff: 0.8 }, { dmg: 82, posture: 26, kb: 260, ...PHYS, fx: { id: 'agheelstomp', scale: 1.1 } }),
          ...strike(1.05, 0.3, { shape: 'circle', r: 130, off: 70, angOff: -0.8 }, { dmg: 86, posture: 28, kb: 280, ...PHYS, fx: { id: 'agheelstomp', scale: 1.15 } }),
          { do: 'dash', at: 1.4, dist: 150, dur: 0.22 },
          ...strike(1.75, 0.35, { shape: 'circle', r: 180, off: 90 }, { dmg: 136, posture: 44, kb: 480, ...PHYS, fx: { id: 'agheelstomp', scale: 1.4 } })] },
      // 3. 翼擊・翼掃（原作 Wing Slam / Wing Sweep）
      { id: 'wing_slam', name: '翼擊・貼地翼掃', short: '翼擊', tags: ['melee', 'aoe'], range: [0, 400], cd: 6.5, cost: 26, track: 5, recovery: 0.85,
        actions: [...strike(0.75, 0.55, { shape: 'circle', r: 150, off: 150, angOff: 1.0 }, { dmg: 124, posture: 40, kb: 420, ...PHYS, fx: { id: 'agheelwing', scale: 1.2 } }),
          ...strike(1.45, 0.4, { shape: 'cone', r: 380, arc: 170 * D, angOff: -0.25 }, { dmg: 100, posture: 32, kb: 400, ...PHYS, fx: { id: 'agheelwing', scale: 1.6, arc: 2.9 } })] },
      // 4. 怒吼衝撞（原作 Charge）：昂首怒吼、跑兩步，最後用頭角上挑
      { id: 'charge', name: '怒吼衝撞', short: '衝撞', tags: ['gap', 'melee'], range: [220, 760], cd: 8, cost: 28, track: 6, recovery: 0.9,
        actions: [{ do: 'tele', at: 0.05, dur: 0.75, shape: 'rect', len: 640, w: 180, follow: true, lockBefore: 0.3, chargeFx: 'agheelroar' },
          { do: 'dash', at: 0.8, dist: 500, dur: 0.5, hit: { dmg: 74, posture: 20, kb: 240 }, fx: 'agheeltakeoff' },
          ...strike(1.45, 0.2, { shape: 'cone', r: 260, arc: 110 * D }, { dmg: 136, posture: 44, kb: 540, ...PHYS, fx: { id: 'agheelgore', scale: 1.4 } })] },
      // 5. 甩尾接頭擊（原作 Tail Whip / Whip & Gore）
      { id: 'tail_gore', name: '甩尾・回首角擊', short: '甩尾', tags: ['melee', 'aoe'], range: [0, 350], cd: 6.5, cost: 24, track: 4, recovery: 0.75,
        actions: [...strike(0.6, 0.45, { shape: 'circle', r: 310 }, { dmg: 118, posture: 38, kb: 480, ...PHYS, fx: { id: 'agheeltail', scale: 1.3 } }),
          ...strike(1.2, 0.3, { shape: 'cone', r: 280, arc: 120 * D }, { dmg: 104, posture: 32, kb: 380, ...PHYS, fx: { id: 'agheelgore', scale: 1.3 } })] },
      // 6. 橫掃龍息（原作 Sweeping Breath）
      { id: 'sweeping_breath', name: '龍息・焚橋橫掃', short: '橫掃', tags: ['ranged', 'aoe'], range: [120, 640], cd: 9, cost: 30, track: 5, recovery: 0.95,
        actions: [{ do: 'tele', at: 0.1, dur: 0.85, shape: 'cone', r: 600, arc: 190 * D, follow: true, lockBefore: 0.3, chargeFx: 'agheelinhale' },
          ...sweep(0.95, 8, 0.2, -90, -25.7, 60, 600, 36)],
        actions2: [{ do: 'tele', at: 0.1, dur: 0.8, shape: 'cone', r: 660, arc: 220 * D, follow: true, lockBefore: 0.3, chargeFx: 'agheelinhale' },
          ...sweep(0.9, 9, 0.18, -105, -26.25, 64, 660, 36, 1.2)] },
      // 7. 追蹤龍息（原作 Tracking Breath）
      { id: 'tracking_breath', name: '追蹤龍息', short: '追蹤', tags: ['ranged'], range: [150, 680], cd: 7.5, cost: 26, track: 1.6, sweep: true, recovery: 0.8,
        actions: [{ do: 'tele', at: 0.1, dur: 0.65, shape: 'rect', len: 620, w: 120, follow: true, chargeFx: 'agheelinhale' },
          ...stream(0.75, 8, 0.16, 620, 120, 28)] },
      // 8. 三拍俯衝（原作 Dive Bomb）
      { id: 'dive_bomb', name: '三拍俯衝', short: '俯衝', tags: ['gap', 'aoe'], range: [240, 980], cd: 11, cost: 32, track: 5, recovery: 1.1,
        actions: dive(1.55, 1.3, 200, 188, 'diveSpot', 170),
        actions2: [...dive(1.45, 1.2, 215, 196, 'diveSpot', 190, 155),
          { do: 'tele', at: 1.55, dur: 0.45, shape: 'ring', r0: 210, r: 480, anchor: 'mark', mark: 'diveSpot' },
          { do: 'hit', at: 2.0, shape: 'ring', r0: 210, r: 480, anchor: 'mark', mark: 'diveSpot', dmg: 60, posture: 16, kb: 300, ...FIRE, fx: 'agheelnova' }] },
      // 9. 後躍滯空噴焰（原作 Retreat）
      { id: 'retreat_flame', name: '後躍・滯空噴焰', short: '後躍', tags: ['defensive', 'aoe'], range: [0, 320], cd: 10, cost: 26, track: 3, recovery: 0.9,
        actions: [{ do: 'dash', at: 0.1, dir: 'back', dist: 240, dur: 0.35, iframe: true, fx: 'agheeltakeoff' },
          { do: 'tele', at: 0.4, dur: 0.6, shape: 'circle', r: 320, off: 170, follow: true, chargeFx: 'agheelinhale' },
          ...[0, 1, 2, 3].map((i) => ({ do: 'hit', at: +(1.0 + i * 0.2).toFixed(2), shape: 'circle', r: 320, off: 170, dmg: 38, posture: 10, kb: 260, multi: true, ...FIRE,
            fx: { id: 'agheelrain', scale: 1.1 }, ...(i === 1 ? { zone: { ...FIELD, r: 170 } } : {}) }))] },
      // 10. 側翼掠襲（原作 Strafe）：後跳升空，低空往前掠過並朝一側噴出一整排火
      { id: 'strafe', name: '側翼掠襲', short: '掠襲', tags: ['gap', 'ranged', 'aoe'], range: [180, 800], cd: 10, cost: 30, track: 4, recovery: 0.9,
        actions: [{ do: 'dash', at: 0.05, dir: 'back', dist: 170, dur: 0.3, fx: 'agheeltakeoff' },
          { do: 'tele', at: 0.3, dur: 0.6, shape: 'rect', len: 680, w: 280, follow: true, lockBefore: 0.25, chargeFx: 'agheelinhale' },
          { do: 'dash', at: 0.9, dist: 680, dur: 1.0, trail: { ...FIELD, r: 75, dur: 4.2 }, hit: { dmg: 64, posture: 18, kb: 260 } },
          ...[0, 1, 2, 3, 4].map((i) => ({ do: 'hit', at: +(0.95 + i * 0.2).toFixed(2), shape: 'cone', r: 320, arc: 70 * D, angOff: -1.25, dmg: 34, posture: 8, kb: 140, multi: true,
            ...FIRE, fx: { id: 'agheelbreath', scale: 0.85 } }))] },
      // 11. 長橋龍息（原作：升空後沿著橋面飛行噴火；本作做成對準整條橋的一道火牆）：升空、朝前方整排噴焰、橋面竄起一列火柱
      { id: 'bridge_inferno', name: '長橋龍息', short: '橋炎', tags: ['ranged', 'aoe'], range: [160, 820], cd: 11, cost: 32, track: 3, recovery: 1.0,
        actions: [{ do: 'tele', at: 0.1, dur: 0.95, shape: 'rect', len: 820, w: 220, follow: true, lockBefore: 0.3, chargeFx: 'agheelroar' },
          ...[0, 1, 2, 3, 4, 5, 6].map((i) => ({ do: 'hit', at: +(1.05 + i * 0.13).toFixed(2), shape: 'rect', len: 820, w: 220, dmg: 30, posture: 8, kb: 110, multi: true, ...FIRE,
            fx: { id: 'greyllbridge', scale: 1 }, ...(i % 2 ? {} : { zone: { ...FIELD, r: 100 } }) })),
          { do: 'erupt', at: 1.95, n: 8, interval: 0.07, start: 130, step: 95, r: 105, dmg: 66, posture: 20, kb: 340, fx: 'agheelpyre', fxEl: 'fire', status: BURN }] },
      // —— 二階段專屬 ——
      // 12. 母龍之嚎（改編自「格雷爾之嚎」祈禱：母龍的吼聲使附近敵人攻擊與防禦下降）：昂首咆哮，兩圈氣浪接連炸開並施加「母龍威壓」，隨後降下火雨
      { id: 'greyoll_roar', name: '母龍之嚎', short: '母嚎', phase: 2, tags: ['aoe'], range: [0, 520], cd: 14, cost: 30, track: 4, recovery: 1.0,
        actions: [{ do: 'tele', at: 0.1, dur: 0.9, shape: 'circle', r: 440, follow: true, chargeFx: 'agheelroar' },
          { do: 'hit', at: 1.05, shape: 'circle', r: 440, dmg: 54, posture: 36, kb: 540, ...PHYS, fx: { id: 'greyllroar', scale: 1 }, status: SHRED(7) },
          { do: 'tele', at: 1.2, dur: 0.4, shape: 'ring', r0: 430, r: 700 },
          { do: 'hit', at: 1.6, shape: 'ring', r0: 430, r: 700, dmg: 32, posture: 14, kb: 300, ...PHYS, fx: { id: 'greyllroar', scale: 1.5 }, status: SHRED(7) },
          { do: 'rain', at: 1.9, n: 8, dur: 1.2, area: 360, flight: 0.8, r: 80, dmg: 40, posture: 12, kb: 150, kind: 'firerock', fx: 'agheelrock', fxEl: 'fire', teleColor: '#ff7a2e', status: BURN }] },
      // 13. 灰燼風暴（改編）：滿天灰燼與火星卷成風暴，火團從天砸下，最後中心一柱沖天
      { id: 'ash_storm', name: '灰燼風暴', short: '灰風', phase: 2, tags: ['aoe', 'ranged'], range: [100, 900], cd: 13, cost: 32, track: 3, recovery: 1.0,
        actions: [{ do: 'tele', at: 0.1, dur: 0.7, shape: 'circle', r: 520, anchor: 'target', follow: true, lockBefore: 0.3, chargeFx: false },
          { do: 'rain', at: 0.9, n: 14, dur: 1.5, area: 480, flight: 0.75, r: 82, dmg: 42, posture: 12, kb: 150, kind: 'firerock', anchor: 'target', fx: 'agheelrock', fxEl: 'fire', teleColor: '#ff7a2e', status: BURN },
          { do: 'hit', at: 2.5, shape: 'circle', r: 300, anchor: 'target', dmg: 84, posture: 28, kb: 420, ...FIRE, fx: { id: 'greyllash', scale: 1 }, zone: { ...FIELD, r: 150 } }] },
    ],
    // 大招（本遊戲編排）：一階段「母龍之嚎」——昂首咆哮震出威壓、火雨覆蓋整座橋、三拍俯衝砸下；
    //   二階段「焚橋・灰母降臨」——全程無敵：高空灑下火雨，落地旋身噴出一整圈龍息，最後灰母之焰爆成火環
    ultimate: {
      id: 'ult', name: '母龍之嚎', name2: '焚橋・灰母降臨', ult: true, range: [0, 960], track: 4, recovery: 1.2,
      actions: [
        { do: 'tele', at: 0.15, dur: 0.7, shape: 'circle', r: 340, follow: true, chargeFx: 'agheelroar' },
        { do: 'hit', at: 0.85, shape: 'circle', r: 340, dmg: 42, posture: 32, kb: 440, ...PHYS, fx: 'greyllroar', status: [SHRED(6), { id: 'slow', dur: 1.2 }] },
        { do: 'rain', at: 1.3, n: 12, dur: 1.6, area: 400, flight: 0.8, r: 82, dmg: 46, posture: 12, kb: 150, kind: 'firerock', fx: 'agheelrock', fxEl: 'fire', teleColor: '#ff7a2e', status: BURN },
        ...dive(3.5, 2.3, 240, 214, 'ultSpot', 230, 175),
      ],
      actions2: [
        { do: 'invuln', at: 0, dur: 4.6 }, { do: 'invuln', at: 4.4, dur: 1.0 },
        { do: 'tele', at: 0.15, dur: 0.8, shape: 'circle', r: 360, follow: true, chargeFx: 'agheelroar' },
        { do: 'hit', at: 0.95, shape: 'circle', r: 360, dmg: 36, posture: 28, kb: 440, ...PHYS, fx: 'greyllroar', status: SHRED(7) },
        { do: 'rain', at: 1.3, n: 18, dur: 1.6, area: 480, flight: 0.75, r: 88, dmg: 46, posture: 12, kb: 150, kind: 'firerock', fx: 'agheelrock', fxEl: 'fire', teleColor: '#ff7a2e', status: BURN },
        ...dive(2.9, 1.7, 230, 198, 'ultSpot', 210, 175),
        { do: 'tele', at: 3.1, dur: 0.5, shape: 'circle', r: 560, follow: true },
        ...sweep(3.6, 12, 0.15, 165, 30, 40, 560, 32, 1.15),
        { do: 'tele', at: 5.3, dur: 0.45, shape: 'ring', r0: 170, r: 780 },
        { do: 'hit', at: 5.75, shape: 'ring', r0: 170, r: 780, dmg: 124, posture: 42, kb: 640, ...FIRE, fx: 'greyllnova' },
      ],
      desc: '一階段「母龍之嚎」：昂首咆哮震退對手並施加母龍威壓（攻擊與防禦下降），火雨落滿整座橋，最後三拍俯衝砸下。二階段「焚橋・灰母降臨」（全程無敵）：先咆哮、高空灑下更密的火雨、俯衝落地，旋身噴出一整圈龍息，最後灰母之焰爆成巨大火環。',
    },
  };

  BD.registerBoss(greyll);
})(typeof window !== 'undefined' ? window : globalThis);
