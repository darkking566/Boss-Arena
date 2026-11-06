'use strict';
// Boss 資料：飛龍亞基爾（Flying Dragon Agheel，《艾爾登法環》寧姆格福・亞基爾湖 / 龍燒廢墟）。考據與改編邊界見 docs/bosses/agheel.md。
// 原作招式表（16 招）：低踏 / 高踏 / 突進踏、撕咬（反向雙咬）、翼擊 / 翼掃、怒吼衝撞、甩尾、回首咬、甩尾接頭擊、
//   換位跳躍、三拍俯衝、橫掃龍息、追蹤龍息、後躍滯空噴焰、側翼掠襲。本作把相近的招式合併成連段，數值是本遊戲的調整值。
// 改編（原作沒有）：半血「龍心熾燃」、二階段專屬「天降・亞基爾之炎」（取自龍餐祈禱「亞基爾之炎」）、被動「翼風驅逐」、大招編排。
(function (G) {
  const BD = G.BD, { D, strike } = BD.DataKit;
  const BURN = { id: 'burn', dur: 3 };
  const FIRE = { fxEl: 'fire', status: BURN };
  const PHYS = { fxEl: 'physical' };
  const FIELD = { kind: 'fire', r: 85, dur: 4.5, dps: 14 };   // 湖面燒焦的火地

  // 龍息橫掃：n 個接力扇形由 from 轉到 from − step×(n−1)（相對面向，度）；每兩口在扇形中段留一片火地
  function sweep(t0, n, gap, from, step, arc, r, dmg, scale) {
    const out = [];
    for (let i = 0; i < n; i++) out.push({ do: 'hit', at: +(t0 + i * gap).toFixed(3), shape: 'cone', r, arc: arc * D, angOff: (from - i * step) * D,
      dmg, posture: 8, kb: 120, multi: true, ...FIRE, fx: { id: 'agheelbreath', scale: scale || 1 }, ...(i % 2 ? { zone: FIELD } : {}) });
    return out;
  }
  // 追蹤龍息：細長火柱跟著目標慢慢轉（技能 track 低 + sweep:true，整段都會轉向）
  function stream(t0, n, gap, len, w, dmg) {
    return Array.from({ length: n }, (_, i) => ({ do: 'hit', at: +(t0 + i * gap).toFixed(3), shape: 'rect', len, w, dmg, posture: 7, kb: 90, multi: true,
      ...FIRE, fx: { id: 'agheelbreath', scale: 0.85, arc: 0.3 }, ...(i % 2 ? {} : { zone: FIELD }) }));
  }
  // 三拍俯衝：振翼升空（隱身）→ 空中三下振翼鎖定落點 → 砸下火焰衝擊，外圈再一圈翼風
  function dive(at, up, r, dmg, mark, ring, fieldR) {
    return [
      { do: 'tele', at: at - up, dur: up, shape: 'circle', r, anchor: 'target', follow: true, lockBefore: 0.35, setMark: mark, chargeFx: false },
      { do: 'hide', at: at - up + 0.06, fx: 'agheeltakeoff', fxEl: 'fire' },
      { do: 'land', at, mark },
      { do: 'hit', at, shape: 'circle', r, anchor: 'mark', mark, dmg, posture: 60, kb: 560, ...FIRE, fx: { id: 'agheeldive', scale: r / 200 }, zone: { ...FIELD, r: fieldR || 120 } },
      { do: 'tele', at: at - 0.1, dur: 0.38, shape: 'ring', r0: r - 20, r: r + ring, anchor: 'mark', mark },
      { do: 'hit', at: at + 0.28, shape: 'ring', r0: r - 20, r: r + ring, anchor: 'mark', mark, dmg: Math.round(dmg * 0.32), posture: 18, kb: 380, ...PHYS, fx: { id: 'agheelwing', scale: 1.2 } },
    ];
  }

  const agheel = {
    id: 'agheel', name: '飛龍亞基爾', title: '亞基爾湖的焚灰之翼', archetype: '飛龍・焚天龍息',
    desc: '盤踞寧姆格福亞基爾湖、龍燒廢墟上空的飛龍——古龍衰弱的後裔，前肢化為一對巨大翅膀，翼緣像燒焦的羽毛般層層剝落。灰黑的鱗甲、頭上兩支長角與鼻角、背脊一排尖棘，長尾末端如破旗。湖畔的流浪貴族朝天祈禱，盼牠的龍焰把自己燒成灰。牠會踏地、撕咬、甩尾、以翅膀拍擊，退到半空俯衝，或從天上噴下整片火海。被動「翼風驅逐」（改編）：每挨 4 下，振翼颳起帶火星的強風把近身者吹開。',
    color: '#5a524c', color2: '#211d1c', glow: '#ff8a2a', style: 'agheel',
    rank: 'boss', stars: 4,
    radius: 96, sizeMul: 1.6, maxHp: 2800, speed: 205, turn: 3.4, mass: 2.6, fxEl: 'fire', hurt: 'flesh',
    traits: ['dragonwing'],
    stamina: { max: 160, regen: 32 }, posture: 240, dodgeCost: 26, dodgeSpeed: 460,
    ai: {
      prefRange: [180, 420], aggression: 0.72, dodge: 0.25, precision: 0.6, reaction: 0.32, strafe: 0.35, walk: 0.7,
      feint: 0.05, delay: 0.3, retreat: 0.15, punish: 0.65, nervous: 0.05, patience: 0.35,
      combos: [ // 取自原作的動作流程：換位跳躍 / 甩尾 → 追蹤龍息、撕咬 → 回咬
        { id: 'hopbreath', name: '換位・追蹤龍息', weight: 1.3, steps: [
          { skill: 'tail_gore' },
          { skill: 'tracking_breath', cancel: 0.35, branch: [{ when: { dist: [0, 560] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'stompwing', name: '踏地・翼擊', weight: 1.1, steps: [
          { skill: 'stomp' },
          { skill: 'wing_slam', cancel: 0.3, branch: [
            { when: { rolled: true, rollDir: ['back'] }, chance: 0.6, do: 'switch', skill: 'charge' },
            { when: { dist: [0, 360] }, do: 'extend' },
            { when: { dist: [360, 800] }, do: 'switch', skill: 'sweeping_breath' },
            { do: 'stop' }] }] },
        { id: 'skyfall', name: '後躍・俯衝', weight: 1.0, steps: [
          { skill: 'retreat_flame' },
          { skill: 'dive_bomb', cancel: 0.3, branch: [{ when: { dist: [200, 900] }, do: 'extend' }, { do: 'stop' }] }] },
        { id: 'strafe', name: '掠襲・天降龍焰', phase: 2, weight: 1.4, steps: [
          { skill: 'strafe' },
          { skill: 'agheel_flame', cancel: 0.35, branch: [{ when: { dist: [150, 760] }, do: 'extend' }, { do: 'stop' }] }] },
      ],
    },
    phase2: {
      speedMul: 1.1, dmgMul: 1.15, cdMul: 0.85, line: '——龍心熾燃。背脊的棘刺透出赤光，湖面化為火海。',
      aura: 'fire', fxEl: 'fire', transFx: { id: 'agheelheart', el: 'fire' }, transDur: 2.6, roarAt: 1.7,
      note: '「龍心熾燃」為本遊戲改編（原作只有一個階段）：背棘發出赤光；龍息更寬、火地更大，撕咬改三連，俯衝落地多一圈火環；解鎖「側翼掠襲」與「天降・亞基爾之炎」；大招換成「龍餐・亞基爾之炎」',
    },
    skills: [
      // 1. 撕咬（原作 Bite ↺ ↻）：低頭蓄一下，朝一側咬、再反方向回咬；二階段多一口
      { id: 'bite', name: '撕咬・反向回咬', short: '撕咬', tags: ['melee', 'fast'], range: [0, 300], cd: 3.6, cost: 16, track: 7, creep: 0.3, recovery: 0.55,
        actions: [...strike(0.45, 0.35, { shape: 'circle', r: 120, off: 175, angOff: 0.35 }, { dmg: 92, posture: 26, kb: 220, ...PHYS, fx: { id: 'devour', scale: 1.3 } }),
          ...strike(0.95, 0.3, { shape: 'circle', r: 125, off: 180, angOff: -0.35 }, { dmg: 104, posture: 30, kb: 320, ...PHYS, fx: { id: 'devour', scale: 1.4 } })],
        actions2: [...strike(0.42, 0.32, { shape: 'circle', r: 125, off: 175, angOff: 0.35 }, { dmg: 88, posture: 24, kb: 160, ...PHYS, fx: { id: 'devour', scale: 1.3 } }),
          ...strike(0.85, 0.28, { shape: 'circle', r: 125, off: 180, angOff: -0.35 }, { dmg: 92, posture: 26, kb: 160, ...PHYS, fx: { id: 'devour', scale: 1.4 } }),
          ...strike(1.35, 0.3, { shape: 'circle', r: 140, off: 185 }, { dmg: 108, posture: 34, kb: 380, ...FIRE, fx: { id: 'agheelbreath', scale: 0.6 } })] },
      // 2. 踏地（原作 Low / High Stomp → Lunging Stomp）：左右腳各踏一下震地，最後轉身突進重踏
      { id: 'stomp', name: '踏地・突進重踏', short: '踏地', tags: ['melee', 'aoe'], range: [0, 320], cd: 6, cost: 26, track: 5, recovery: 0.8,
        actions: [...strike(0.6, 0.45, { shape: 'circle', r: 130, off: 70, angOff: 0.8 }, { dmg: 78, posture: 24, kb: 260, ...PHYS, fx: { id: 'quakehalt', scale: 0.8 } }),
          ...strike(1.05, 0.3, { shape: 'circle', r: 130, off: 70, angOff: -0.8 }, { dmg: 82, posture: 26, kb: 280, ...PHYS, fx: { id: 'quakehalt', scale: 0.9 } }),
          { do: 'dash', at: 1.4, dist: 140, dur: 0.22 },
          ...strike(1.75, 0.35, { shape: 'circle', r: 175, off: 90 }, { dmg: 128, posture: 42, kb: 460, ...PHYS, fx: { id: 'agheeldive', scale: 0.7 } })] },
      // 3. 翼擊・翼掃（原作 Wing Slam / Wing Sweep）：退一步把翅膀高舉拍地，再貼地橫掃一大片
      { id: 'wing_slam', name: '翼擊・貼地翼掃', short: '翼擊', tags: ['melee', 'aoe'], range: [0, 380], cd: 6.5, cost: 26, track: 5, recovery: 0.85,
        actions: [...strike(0.75, 0.55, { shape: 'circle', r: 150, off: 150, angOff: 1.0 }, { dmg: 118, posture: 38, kb: 420, ...PHYS, fx: { id: 'agheelwing', scale: 1.1 } }),
          ...strike(1.45, 0.4, { shape: 'cone', r: 360, arc: 170 * D, angOff: -0.25 }, { dmg: 96, posture: 30, kb: 400, ...PHYS, fx: { id: 'agheelwing', scale: 1.5, arc: 2.9 } })] },
      // 4. 怒吼衝撞（原作 Charge）：昂首怒吼、跑兩步，最後用頭角一記上挑
      { id: 'charge', name: '怒吼衝撞', short: '衝撞', tags: ['gap', 'melee'], range: [200, 700], cd: 8, cost: 28, track: 6, recovery: 0.9,
        actions: [{ do: 'tele', at: 0.05, dur: 0.75, shape: 'rect', len: 600, w: 170, follow: true, lockBefore: 0.3, chargeFx: 'agheelroar' },
          { do: 'dash', at: 0.8, dist: 470, dur: 0.5, hit: { dmg: 70, posture: 20, kb: 240 }, fx: 'agheeltakeoff' },
          ...strike(1.45, 0.2, { shape: 'cone', r: 250, arc: 110 * D }, { dmg: 128, posture: 42, kb: 520, ...PHYS, fx: { id: 'devour', scale: 1.6 } })] },
      // 5. 甩尾接頭擊（原作 Tail Whip / Whip & Gore）：尾巴掃一整圈，緊接著回頭用角撞一下
      { id: 'tail_gore', name: '甩尾・回首角擊', short: '甩尾', tags: ['melee', 'aoe'], range: [0, 340], cd: 6.5, cost: 24, track: 4, recovery: 0.75,
        actions: [...strike(0.6, 0.45, { shape: 'circle', r: 300 }, { dmg: 112, posture: 36, kb: 480, ...PHYS, fx: { id: 'whirl', scale: 1.4 } }),
          ...strike(1.2, 0.3, { shape: 'cone', r: 270, arc: 120 * D }, { dmg: 98, posture: 30, kb: 380, ...PHYS, fx: { id: 'devour', scale: 1.3 } })] },
      // 6. 橫掃龍息（原作 Sweeping Breath，順時針）：拱起長頸，從左到右燒過一大片扇形，沿路留下火地
      { id: 'sweeping_breath', name: '龍息・焚湖橫掃', short: '橫掃', tags: ['ranged', 'aoe'], range: [120, 600], cd: 9, cost: 30, track: 5, recovery: 0.95,
        actions: [{ do: 'tele', at: 0.1, dur: 0.85, shape: 'cone', r: 560, arc: 190 * D, follow: true, lockBefore: 0.3, chargeFx: { id: 'charge', el: 'fire' } },
          ...sweep(0.95, 8, 0.12, -90, -25.7, 60, 560, 34)],
        actions2: [{ do: 'tele', at: 0.1, dur: 0.8, shape: 'cone', r: 620, arc: 220 * D, follow: true, lockBefore: 0.3, chargeFx: { id: 'charge', el: 'fire' } },
          ...sweep(0.9, 9, 0.11, -105, -26.25, 64, 620, 34, 1.15)] },
      // 7. 追蹤龍息（原作 Tracking Breath）：細長的火柱噴向對手、會慢慢轉頭追過去
      { id: 'tracking_breath', name: '追蹤龍息', short: '追蹤', tags: ['ranged'], range: [150, 620], cd: 7.5, cost: 26, track: 1.6, sweep: true, recovery: 0.8,
        actions: [{ do: 'tele', at: 0.1, dur: 0.65, shape: 'rect', len: 560, w: 110, follow: true, chargeFx: { id: 'charge', el: 'fire' } },
          ...stream(0.75, 8, 0.16, 560, 110, 26)] },
      // 8. 三拍俯衝（原作 Dive Bomb）：往後一跳升空、振翼三下，對準落點砸下
      { id: 'dive_bomb', name: '三拍俯衝', short: '俯衝', tags: ['gap', 'aoe'], range: [220, 900], cd: 11, cost: 32, track: 5, recovery: 1.1,
        actions: dive(1.55, 1.3, 190, 178, 'diveSpot', 160),
        actions2: [...dive(1.45, 1.2, 205, 186, 'diveSpot', 180, 150),
          { do: 'tele', at: 1.55, dur: 0.45, shape: 'ring', r0: 200, r: 460, anchor: 'mark', mark: 'diveSpot' },
          { do: 'hit', at: 2.0, shape: 'ring', r0: 200, r: 460, anchor: 'mark', mark: 'diveSpot', dmg: 58, posture: 16, kb: 300, ...FIRE, fx: { id: 'ring', el: 'fire', scale: 1.4 } }] },
      // 9. 後躍滯空噴焰（原作 Retreat）：向後一躍浮在半空，對正下方大範圍噴火——近身的人要往外跑
      { id: 'retreat_flame', name: '後躍・滯空噴焰', short: '後躍', tags: ['defensive', 'aoe'], range: [0, 300], cd: 10, cost: 26, track: 3, recovery: 0.9,
        actions: [{ do: 'dash', at: 0.1, dir: 'back', dist: 230, dur: 0.35, iframe: true, fx: 'agheeltakeoff' },
          { do: 'tele', at: 0.4, dur: 0.6, shape: 'circle', r: 300, off: 170, follow: true, chargeFx: { id: 'charge', el: 'fire' } },
          ...[0, 1, 2, 3].map((i) => ({ do: 'hit', at: +(1.0 + i * 0.2).toFixed(2), shape: 'circle', r: 300, off: 170, dmg: 36, posture: 10, kb: 260, multi: true, ...FIRE,
            fx: { id: 'agheelrain', scale: 1 }, ...(i === 1 ? { zone: { ...FIELD, r: 160 } } : {}) }))] },
      // —— 二階段專屬 ——
      // 10. 側翼掠襲（原作 Strafe）：後跳升空，再低空往前掠過，同時朝左側噴出一整排火（本作作為半血後專屬）
      { id: 'strafe', name: '側翼掠襲', short: '掠襲', phase: 2, tags: ['gap', 'ranged', 'aoe'], range: [180, 760], cd: 10, cost: 30, track: 4, recovery: 0.9,
        actions: [{ do: 'dash', at: 0.05, dir: 'back', dist: 160, dur: 0.3, fx: 'agheeltakeoff' },
          { do: 'tele', at: 0.3, dur: 0.6, shape: 'rect', len: 640, w: 260, follow: true, lockBefore: 0.25, chargeFx: { id: 'charge', el: 'fire' } },
          { do: 'dash', at: 0.9, dist: 640, dur: 1.0, trail: { ...FIELD, r: 70, dur: 4 }, hit: { dmg: 60, posture: 18, kb: 260 } },
          ...[0, 1, 2, 3, 4].map((i) => ({ do: 'hit', at: +(0.95 + i * 0.2).toFixed(2), shape: 'cone', r: 300, arc: 70 * D, angOff: -1.25, dmg: 32, posture: 8, kb: 140, multi: true,
            ...FIRE, fx: { id: 'agheelbreath', scale: 0.8 } }))] },
      // 11. 天降・亞基爾之炎（改編自龍餐祈禱「亞基爾之炎」：化身飛龍從空中噴下火焰）：升空，朝前方地面整片噴焰，落下一條火柱長廊
      { id: 'agheel_flame', name: '天降・亞基爾之炎', short: '天炎', phase: 2, tags: ['ranged', 'aoe'], range: [150, 720], cd: 12, cost: 32, track: 3, recovery: 1.0,
        actions: [{ do: 'tele', at: 0.1, dur: 0.95, shape: 'rect', len: 700, w: 200, follow: true, lockBefore: 0.3, chargeFx: 'agheelroar' },
          ...[0, 1, 2, 3, 4, 5].map((i) => ({ do: 'hit', at: +(1.05 + i * 0.14).toFixed(2), shape: 'rect', len: 700, w: 200, dmg: 30, posture: 8, kb: 110, multi: true, ...FIRE,
            fx: { id: 'agheelflame', scale: 1 }, ...(i % 2 ? {} : { zone: { ...FIELD, r: 95 } }) })),
          { do: 'erupt', at: 1.9, n: 7, interval: 0.07, start: 120, step: 90, r: 100, dmg: 64, posture: 20, kb: 340, fx: 'dragonpyre', fxEl: 'fire', status: BURN }] },
    ],
    // 大招（本遊戲編排）：一階段「焚湖之翼」——怒吼升空、火雨覆蓋湖面、三拍俯衝砸下；
    //   二階段「龍餐・亞基爾之炎」——全程無敵：高空灑下火雨，落地旋身噴出一整圈龍息，最後龍心爆出火環
    ultimate: {
      id: 'ult', name: '焚湖之翼', name2: '龍餐・亞基爾之炎', ult: true, range: [0, 900], track: 4, recovery: 1.2,
      actions: [
        { do: 'tele', at: 0.15, dur: 0.6, shape: 'circle', r: 300, follow: true, chargeFx: 'agheelroar' },
        { do: 'hit', at: 0.75, shape: 'circle', r: 300, dmg: 40, posture: 30, kb: 420, ...PHYS, fx: { id: 'pressure' }, status: { id: 'slow', dur: 1.2 } },
        { do: 'rain', at: 1.2, n: 12, dur: 1.6, area: 380, flight: 0.8, r: 80, dmg: 44, posture: 12, kb: 150, kind: 'firerock', fx: 'firerockburst', fxEl: 'fire', teleColor: '#ff7a2e', status: BURN },
        ...dive(3.4, 2.3, 230, 205, 'ultSpot', 220, 170),
      ],
      actions2: [
        { do: 'invuln', at: 0, dur: 4.6 },
        { do: 'tele', at: 0.15, dur: 0.7, shape: 'circle', r: 300, follow: true, chargeFx: 'agheelroar' },
        { do: 'rain', at: 1.1, n: 18, dur: 1.6, area: 460, flight: 0.75, r: 85, dmg: 44, posture: 12, kb: 150, kind: 'firerock', fx: 'firerockburst', fxEl: 'fire', teleColor: '#ff7a2e', status: BURN },
        ...dive(2.7, 1.7, 220, 190, 'ultSpot', 200, 170),
        { do: 'tele', at: 2.9, dur: 0.5, shape: 'circle', r: 520, follow: true },
        ...sweep(3.4, 12, 0.08, 165, 30, 40, 520, 30, 1.1),
        { do: 'tele', at: 4.3, dur: 0.45, shape: 'ring', r0: 160, r: 720 },
        { do: 'hit', at: 4.75, shape: 'ring', r0: 160, r: 720, dmg: 118, posture: 40, kb: 620, ...FIRE, fx: { id: 'nova', el: 'fire', scale: 1.3 } },
      ],
      desc: '一階段「焚湖之翼」：昂首怒吼震退對手，振翼升空，火雨落滿湖面，最後三拍俯衝砸下、落地爆出火焰衝擊與翼風。二階段「龍餐・亞基爾之炎」（全程無敵）：高空灑下更密的火雨、俯衝落地，旋身朝四面八方噴出一整圈龍息，最後龍心爆出巨大火環。',
    },
  };

  BD.registerBoss(agheel);
})(typeof window !== 'undefined' ? window : globalThis);
