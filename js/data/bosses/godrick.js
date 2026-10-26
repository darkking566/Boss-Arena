'use strict';
// Boss 資料：「接肢」葛瑞克（Godrick the Grafted，《艾爾登法環》史東薇爾城之主、大盧恩持有者、黃金一族的遠親）
// 考據：前傾的巨大身軀、白色亂髮編辮戴金冠，綠色斗篷配金邊流蘇；背上與肩上接著一叢別人的手臂、一隻格外巨大的左臂，
//   兩條腿也不一樣；右手刻著葛孚雷獅子紋的黃金雙刃戰斧。招式取自原作招式表：戰斧雙揮（中間停頓）/ 狂怒五連 / 給我跪下（震地）/
//   喚風（旋風擋投射物）→ 風暴之刃 / 風暴突襲 / 拖斧上撩 / 躍起重劈；二階段（原作 60%，本作照全體規則 50%）砍斷左臂、接上龍頭，
//   解鎖龍息橫掃、噴火進軍、龍首擒噬、見證吧！，風招全部帶火。
// 被動「接肢」在 js/engine/traits.js；喚風的四面風壁借用 windwall（angOff）；考據見 docs/bosses/godrick.md
(function (G) {
  const BD = G.BD, { D, strike } = BD.DataKit;
  const AXE = { el: 'physical' };              // 黃金戰斧：物理斬擊（Boss 預設 fxEl 是風）
  const BURN = { id: 'burn', dur: 3 };
  const FIRE = { fxEl: 'fire', status: BURN };

  // 跳躍：起跳消失 → 空中停頓鎖定落點 → 砸下，外圈再一圈震波
  function leap(at, up, r, dmg, mark, fx, ring, jump) {
    const out = [
      { do: 'tele', at: at - up, dur: up, shape: 'circle', r, anchor: 'target', follow: true, lockBefore: 0.35, setMark: mark },
      { do: 'hide', at: at - up + 0.08, fx: jump || 'axeleap' },
      { do: 'land', at, mark },
      { do: 'hit', at, shape: 'circle', r, anchor: 'mark', mark, dmg, posture: 60, kb: 520, fx },
    ];
    if (ring) out.push({ do: 'tele', at: at - 0.15, dur: 0.4, shape: 'ring', r0: r - 20, r: r + ring, anchor: 'mark', mark },
      { do: 'hit', at: at + 0.25, shape: 'ring', r0: r - 20, r: r + ring, anchor: 'mark', mark, dmg: Math.round(dmg * 0.3), posture: 18, kb: 340, fx: 'goldquakering' });
    return out;
  }
  // 喚風：四面風壁（擋下投射物）+ n 圈旋風（kb < 0 是把人捲進來）
  function storm(at, n, gap, r, dmg, kb, extra) {
    const out = [0, 1, 2, 3].map((i) => ({ do: 'windwall', at, angOff: i * Math.PI / 2, w: 2 * (r * 0.5 + 46), life: n * gap + 0.5, drift: 0 }));
    for (let i = 0; i < n; i++) out.push(Object.assign({ do: 'hit', at: +(at + 0.35 + i * gap).toFixed(3), shape: 'circle', r, dmg, posture: 12, kb, multi: true, fx: { id: 'stormcall', scale: r / 200 } }, extra));
    return out;
  }
  // 龍息：n 個接力的扇形從 from 轉到 from − step×(n−1)（相對面向，度）
  function sweep(t0, n, gap, from, step, arc, r, dmg) {
    const out = [];
    for (let i = 0; i < n; i++) out.push({ do: 'hit', at: +(t0 + i * gap).toFixed(3), shape: 'cone', r, arc: arc * D, angOff: (from - i * step) * D, dmg, posture: 8, kb: 110, multi: true, ...FIRE, fx: { id: 'graftbreath', scale: 0.9 } });
    return out;
  }
  // 給我跪下！：斧頭往地上捶，每一下震地比上一下大
  const quake = (at, tele, shape, dmg, s, o) => strike(at, tele, shape, Object.assign({ dmg, posture: 24, kb: 300, fx: { id: 'kneelquake', scale: s } }, o));

  const godrick = {
    id: 'godrick', name: '葛瑞克', title: '「接肢」', archetype: '接肢暴君',
    desc: '史東薇爾城之主、自稱「黃金之王」的半神。神血稀薄、被瑪蓮妮亞打到跪地求饒後，把別人的手臂一隻隻接到自己身上換取力量；揮舞刻著葛孚雷獅子紋的黃金戰斧，召喚風暴。被逼急了就砍斷自己的左臂，接上龍的頭顱噴火。',
    color: '#4e6a4a', color2: '#1e2a1c', glow: '#ffcf4a', style: 'godrick',
    rank: 'boss', stars: 3.5,
    radius: 52, maxHp: 2300, speed: 200, turn: 3.8, mass: 2.3, fxEl: 'wind', hurt: 'flesh',
    traits: ['grafted'], // 接肢：每揮 3 下，背上的手臂追加一記爪掃（二階段換成龍頭火咬）
    stamina: { max: 140, regen: 30 }, posture: 210, dodgeCost: 26, dodgeSpeed: 430,
    ai: {
      prefRange: [110, 280], aggression: 0.75, dodge: 0.35, precision: 0.6, reaction: 0.3, strafe: 0.4, walk: 0.75,
      feint: 0.1, delay: 0.5, retreat: 0.1, punish: 0.6, nervous: 0.05, patience: 0.4, // 原作招牌：雙揮之間的大停頓
      combos: [
        { id: 'storm', name: '喚風・風暴', weight: 1.4, steps: [
          { skill: 'stormcaller' },
          { skill: 'storm_assault', cancel: 0.4, branch: [
            { when: { dist: [260, 800] }, do: 'switch', skill: 'storm_blade' }, // 原作：喚風後拉遠就擲風刃、近就翻滾躍擊
            { when: { dist: [0, 260] }, do: 'extend' },
            { do: 'stop' }] }] },
        // 距離條件要算進前一招的擊退（雙揮的左臂捶地 / 五連最後一斧 / 擒噬摔地會把人打飛），否則連段接不起來
        { id: 'axe', name: '戰斧・拖斧', weight: 1.1, steps: [
          { skill: 'axe_swing' },
          { skill: 'drag_slash', cancel: 0.35, branch: [
            { when: { rolled: true, rollDir: ['back'] }, chance: 0.6, do: 'switch', skill: 'jump_slam' }, // 往後滾 → 躍起重劈
            { when: { rolled: true, rollDir: ['left', 'right', 'through'], dist: [0, 300] }, do: 'switch', skill: 'fury_swings' }, // 滾到身側 / 身後 → 狂怒五連
            { when: { rolled: true }, chance: 0.5, do: 'delay', hold: [0.25, 0.5] },
            { when: { dist: [0, 520] }, do: 'extend' },
            // 拖斧冷卻中 → 依距離改接其他招
            { when: { dist: [0, 300] }, do: 'switch', skill: 'fury_swings' },
            { when: { dist: [150, 700] }, do: 'switch', skill: 'jump_slam' },
            { when: { dist: [520, 900] }, do: 'switch', skill: 'storm_blade' }, // 被拉開 → 風刃
            { do: 'stop' }] }] },
        { id: 'kneel', name: '跪下・躍劈', phase: 1, weight: 1.0, steps: [
          { skill: 'kneel' },
          { skill: 'jump_slam', cancel: 0.4, branch: [
            { when: { dist: [150, 520] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'fury', name: '五連・跪下', phase: 1, weight: 1.0, steps: [
          { skill: 'fury_swings' },
          { skill: 'kneel', cancel: 0.4, branch: [
            { when: { rolled: true, rollDir: ['back'] }, chance: 0.6, do: 'switch', skill: 'jump_slam' },
            { when: { dist: [0, 320] }, do: 'extend' },
            { when: { dist: [320, 700] }, do: 'switch', skill: 'jump_slam' }, // 最後一斧打飛 → 躍劈追上
            { do: 'stop' }] }] },
        { id: 'flame', name: '戰斧・龍息・擒噬', phase: 2, weight: 1.4, steps: [ // 原作流程圖：揮斧 → 龍息橫掃 → 擒拿
          { skill: 'axe_swing' },
          { skill: 'sweeping_flame', cancel: 0.4, branch: [
            { when: { dist: [0, 480] }, do: 'extend' },
            { do: 'stop' }] },
          { skill: 'dragon_grab', cancel: 0.35, branch: [
            { when: { dist: [0, 300] }, do: 'extend' },
            { when: { dist: [300, 500] }, do: 'switch', skill: 'striding_flame' }, // 遠 → 邊噴邊逼近
            { do: 'stop' }] }] },
        { id: 'grab', name: '龍息・擒噬・見證', phase: 2, weight: 1.0, steps: [
          { skill: 'striding_flame' },
          { skill: 'dragon_grab', cancel: 0.35, branch: [
            { when: { dist: [0, 300] }, do: 'extend' },
            { when: { dist: [300, 520] }, do: 'switch', skill: 'sweeping_flame' }, // 被推遠擒不到 → 龍息橫掃
            { do: 'stop' }] },
          { skill: 'bear_witness', cancel: 0.4, branch: [ // 擒噬摔地把人打飛，火岩雨正好收尾
            { when: { dist: [0, 520] }, do: 'extend' },
            { do: 'stop' }] }] },
      ],
    },
    phase2: {
      speedMul: 1.1, dmgMul: 1.18, cdMul: 0.85,
      line: '列祖列宗……見證吧！', aura: 'fire', fxEl: 'fire', transFx: { id: 'graftsever', el: 'fire' }, transDur: 2.6, roarAt: 1.7,
      note: '砍斷左臂接上龍頭；解鎖「龍息橫掃」「噴火進軍」「龍首擒噬」「見證吧！」；喚風、風暴之刃、風暴突襲帶火（燃燒），給我跪下多一記大震波，被動追擊換成龍頭火咬，大招換成「列祖列宗，見證吧！」',
    },
    skills: [
      // 1. 戰斧雙揮：右往左、左往右，中間停頓很久才揮第二刀，接左臂捶地（原作 Axe Swing ↺ ↻ → Arm Swing）
      { id: 'axe_swing', name: '戰斧雙揮', short: '雙揮', tags: ['melee', 'aoe'], range: [0, 270], cd: 3.8, cost: 22, track: 5, creep: 0.3, recovery: 0.6,
        actions: [...strike(0.5, 0.4, { shape: 'cone', r: 250, arc: 150 * D, angOff: 0.4 }, { dmg: 96, posture: 26, kb: 300, fx: { id: 'goldaxeswing', ...AXE } }),
          ...strike(1.45, 0.5, { shape: 'cone', r: 250, arc: 150 * D, angOff: -0.4 }, { dmg: 104, posture: 28, kb: 330, fx: { id: 'goldaxeswing', ...AXE } }),
          ...strike(1.85, 0.25, { shape: 'circle', r: 110, off: 120, angOff: 0.6 }, { dmg: 70, posture: 30, kb: 360, fx: { id: 'graftpound', ...AXE } })],
        actions2: [...strike(0.46, 0.36, { shape: 'cone', r: 260, arc: 150 * D, angOff: 0.4 }, { dmg: 96, posture: 26, kb: 300, fx: { id: 'goldaxeswing', ...AXE } }),
          ...strike(1.35, 0.48, { shape: 'cone', r: 260, arc: 150 * D, angOff: -0.4 }, { dmg: 104, posture: 28, kb: 330, fx: { id: 'goldaxeswing', ...AXE } }),
          ...strike(1.72, 0.24, { shape: 'cone', r: 200, arc: 100 * D, angOff: 0.5 }, { dmg: 80, posture: 28, kb: 360, fx: 'dragonbite', ...FIRE })] },
      // 2. 狂怒五連：怒吼後雙手握斧左右連揮五下，一刀比一刀遠，最後一下延遲（原作 Fury Swings）
      { id: 'fury_swings', name: '狂怒五連', short: '五連', tags: ['melee', 'aoe'], range: [0, 300], cd: 7.5, cost: 34, track: 4, creep: 0.45, recovery: 1.0,
        actions: [0, 1, 2, 3, 4].flatMap((i) => strike([0.55, 0.9, 1.25, 1.6, 2.35][i], i ? (i === 4 ? 0.55 : 0.26) : 0.45,
          { shape: 'cone', r: 220 + i * 20, arc: 150 * D, angOff: i % 2 ? -0.4 : 0.4 },
          { dmg: i === 4 ? 140 : 64, posture: i === 4 ? 40 : 18, kb: i === 4 ? 460 : 200, fx: { id: 'furyswing', ...AXE, scale: i === 4 ? 1.4 : 1 } })) },
      // 3. 給我跪下！：斧頭拉到胸前、往地上捶兩下震地；二階段停頓後第三下炸出大震波（原作 Lesser Command / I Command Thee, Kneel!）
      { id: 'kneel', name: '給我跪下！', short: '跪下', tags: ['melee', 'aoe'], range: [0, 320], cd: 6.5, cost: 28, track: 4, recovery: 0.8,
        actions: [...quake(0.9, 0.6, { shape: 'circle', r: 150, off: 60 }, 92, 0.8),
          ...quake(1.4, 0.35, { shape: 'ring', r0: 120, r: 280, off: 60 }, 74, 1.1)],
        actions2: [...quake(0.75, 0.5, { shape: 'circle', r: 150, off: 60 }, 92, 0.8),
          ...quake(1.1, 0.3, { shape: 'ring', r0: 120, r: 280, off: 60 }, 74, 1.1),
          ...quake(2.2, 0.85, { shape: 'circle', r: 400, off: 60 }, 150, 1.8, { posture: 50, kb: 600, ...FIRE })] },
      // 4. 喚風：掄斧捲起三圈風壓，四面風壁擋下投射物；二階段旋風帶火（原作 Stormcaller）
      { id: 'stormcaller', name: '喚風', short: '喚風', tags: ['melee', 'aoe'], range: [0, 240], cd: 8, cost: 26, track: 3, recovery: 0.6,
        actions: [{ do: 'tele', at: 0.15, dur: 0.5, shape: 'circle', r: 200, follow: true }, ...storm(0.3, 3, 0.32, 200, 42, 320)],
        actions2: [{ do: 'tele', at: 0.15, dur: 0.48, shape: 'circle', r: 220, follow: true }, ...storm(0.28, 3, 0.3, 220, 46, 340, FIRE)] },
      // 5. 風暴之刃：斧刃插地，擲出彎曲追蹤的風刃（原作 Storm Blade）
      { id: 'storm_blade', name: '風暴之刃', short: '風刃', tags: ['ranged'], range: [220, 700], cd: 6, cost: 20, track: 6, recovery: 0.6,
        actions: [{ do: 'tele', at: 0.1, dur: 0.55, shape: 'rect', len: 640, w: 60, follow: true },
          { do: 'proj', at: 0.65, n: 2, spread: 0.55, speed: 640, r: 26, dmg: 74, posture: 20, kb: 260, life: 1.4, homing: 2.2, pierce: true, kind: 'stormblade', fx: 'stormbladecast' }],
        actions2: [{ do: 'tele', at: 0.1, dur: 0.5, shape: 'rect', len: 640, w: 60, follow: true },
          { do: 'proj', at: 0.6, n: 3, spread: 0.5, speed: 680, r: 28, dmg: 70, posture: 20, kb: 260, life: 1.4, homing: 2.2, pierce: true, kind: 'stormblade', fx: 'stormbladecast', fxEl: 'fire', status: BURN }] },
      // 6. 風暴突襲：往側邊翻滾、躍起、從空中一斧劈下（原作 Storm Assault）
      { id: 'storm_assault', name: '風暴突襲', short: '突襲', tags: ['gap', 'melee'], range: [160, 520], cd: 6.5, cost: 24, track: 5, recovery: 0.8,
        actions: [{ do: 'dash', at: 0.1, dir: 'side', dist: 170, dur: 0.3, fx: 'stormroll' }, ...leap(1.35, 0.8, 140, 160, 'stormSpot', { id: 'stormslam', scale: 0.8 }, 0, 'stormleap')],
        actions2: [{ do: 'dash', at: 0.1, dir: 'side', dist: 170, dur: 0.28, fx: 'stormroll' }, ...leap(1.3, 0.78, 150, 170, 'stormSpot', { id: 'stormslam', scale: 0.9, el: 'fire' }, 110, 'stormleap')] },
      // 7. 拖斧上撩：斧頭拖地往前推進、火花四濺，停一拍往上撩（原作 Dragging Slash / Axe Grind）
      { id: 'drag_slash', name: '拖斧上撩', short: '拖斧', tags: ['melee', 'gap'], range: [80, 380], cd: 5, cost: 22, track: 6, recovery: 0.65,
        actions: [{ do: 'dash', at: 0.2, dist: 190, dur: 0.55, fx: 'axegrind' }, ...strike(1.1, 0.4, { shape: 'rect', len: 300, w: 84 }, { dmg: 132, posture: 38, kb: 420, fx: 'axegrind' })],
        actions2: [{ do: 'dash', at: 0.18, dist: 210, dur: 0.5, fx: 'axegrind' }, ...strike(1.0, 0.38, { shape: 'rect', len: 320, w: 90 }, { dmg: 140, posture: 40, kb: 440, fx: 'axegrind', ...FIRE })] },
      // 8. 躍起重劈：雙手橫握戰斧躍起，空中前搖很長，砸下一圈（原作 Jumping Slam）
      { id: 'jump_slam', name: '躍起重劈', short: '躍劈', tags: ['gap', 'aoe'], range: [150, 520], cd: 6.5, cost: 26, track: 5, recovery: 0.9,
        actions: leap(1.2, 1.05, 160, 178, 'slamSpot', 'goldaxeslam', 120),
        actions2: leap(1.12, 0.98, 170, 188, 'slamSpot', { id: 'goldaxeslam', el: 'fire' }, 140) },
      // —— 二階段專屬（龍頭）——
      // 9. 龍息橫掃：舉起龍頭，從右到左燒過整片扇形（原作 Sweeping Flame，換階段後第一招）
      { id: 'sweeping_flame', name: '龍息橫掃', short: '龍息', phase: 2, tags: ['ranged', 'aoe'], range: [0, 500], cd: 9, cost: 30, track: 6, recovery: 0.9,
        actions: [{ do: 'tele', at: 0.1, dur: 0.85, shape: 'cone', r: 460, arc: 200 * D, follow: true, lockBefore: 0.3, chargeFx: { id: 'charge', el: 'fire' } },
          ...sweep(0.95, 7, 0.14, 95, 31.67, 66, 460, 36)] },
      // 10. 噴火進軍：邊往前走邊朝正前方噴細長的火，沿路留下火地，收尾橫掃一口（原作 Striding Flame）
      { id: 'striding_flame', name: '噴火進軍', short: '進軍', phase: 2, tags: ['ranged'], range: [0, 460], cd: 9, cost: 28, track: 4, sweep: true, recovery: 0.8,
        actions: [{ do: 'tele', at: 0.1, dur: 0.6, shape: 'rect', len: 420, w: 96, follow: true, chargeFx: { id: 'charge', el: 'fire' } },
          { do: 'dash', at: 0.7, dist: 230, dur: 1.3, trail: { kind: 'fire', r: 60, dur: 4, dps: 16, delay: 0.3 } },
          ...[0, 1, 2, 3, 4].map((i) => ({ do: 'hit', at: +(0.75 + i * 0.25).toFixed(2), shape: 'rect', len: 400, w: 96, dmg: 26, posture: 6, kb: 80, multi: true, ...FIRE, fx: { id: 'stridingflame', scale: 0.8, arc: 0.35 } })),
          ...strike(2.3, 0.3, { shape: 'cone', r: 330, arc: 120 * D }, { dmg: 74, posture: 22, kb: 300, ...FIRE, fx: 'stridingflame' })] },
      // 11. 龍首擒噬：龍頭撲出咬住（暈眩）、提起來噴火、再摔到地上爆一團火（原作 Grab）
      { id: 'dragon_grab', name: '龍首擒噬', short: '擒噬', phase: 2, tags: ['melee'], clash: false, range: [0, 260], cd: 8, cost: 26, track: 7, recovery: 0.7,
        actions: [...strike(0.75, 0.45, { shape: 'rect', len: 250, w: 96 }, { dmg: 60, posture: 20, kb: 0, status: { id: 'stun', dur: 1.5 }, fx: 'dragonbite', fxEl: 'fire' }),
          { do: 'hit', at: 1.15, shape: 'circle', r: 95, off: 150, dmg: 30, posture: 6, kb: 0, multi: true, ...FIRE, fx: { id: 'grabflame' } },
          { do: 'hit', at: 1.45, shape: 'circle', r: 95, off: 150, dmg: 30, posture: 6, kb: 0, multi: true, ...FIRE, fx: { id: 'grabflame' } },
          ...strike(1.95, 0.3, { shape: 'circle', r: 150, off: 150 }, { dmg: 124, posture: 40, kb: 500, ...FIRE, fx: 'grabslam' })] },
      // 12. 見證吧！：龍頭插進地面拖半圈（火痕）、往上一撩，正前方落下一片火岩雨（原作 Bear Witness!，接肢飛龍的戰技）
      { id: 'bear_witness', name: '見證吧！', short: '見證', phase: 2, tags: ['melee', 'aoe'], range: [0, 420], cd: 11, cost: 34, track: 3, recovery: 1.0,
        actions: [{ do: 'tele', at: 0.1, dur: 0.7, shape: 'circle', r: 260, follow: true, chargeFx: 'bearwitness' },
          ...[0, 1, 2, 3, 4].map((i) => ({ do: 'hit', at: +(0.8 + i * 0.13).toFixed(2), shape: 'circle', r: 110, off: 150, angOff: 1.6 - i * 0.8, dmg: 44, posture: 12, kb: 200, multi: true, ...FIRE, fx: { id: 'witnessgouge', scale: 0.8 } })),
          ...strike(1.8, 0.3, { shape: 'cone', r: 270, arc: 90 * D }, { dmg: 118, posture: 36, kb: 420, ...FIRE, fx: 'bearwitness' }),
          { do: 'lob', at: 1.9, n: 8, scatter: 190, flight: 0.9, r: 85, dmg: 56, posture: 14, kb: 160, kind: 'firerock', fx: 'firerockburst', fxEl: 'fire', teleColor: '#ff7a2e', status: BURN }] },
    ],
    // 大招（改編）：一階段「我乃黃金之王！」——巨大旋風把人捲近 → 三連震地 → 躍起重劈；
    //   二階段「列祖列宗，見證吧！」——全程無敵：火岩雨 → 旋身一整圈龍息 → 龍頭插地、火柱一路往前炸
    ultimate: {
      id: 'ult', name: '我乃黃金之王！', name2: '列祖列宗，見證吧！', ult: true, range: [0, 900], track: 4, recovery: 1.1,
      actions: [
        { do: 'tele', at: 0.2, dur: 0.6, shape: 'circle', r: 340, follow: true, chargeFx: 'ultcast' },
        ...storm(0.5, 3, 0.3, 340, 30, -260),
        ...quake(1.95, 0.4, { shape: 'circle', r: 170 }, 84, 1),
        ...quake(2.35, 0.3, { shape: 'ring', r0: 140, r: 320 }, 70, 1.3),
        ...quake(2.85, 0.4, { shape: 'ring', r0: 300, r: 480 }, 70, 1.6),
        ...leap(4.0, 1.0, 210, 205, 'lordSpot', { id: 'lordgold', scale: 1.1 }, 180),
      ],
      actions2: [
        { do: 'invuln', at: 0, dur: 4.4 },
        { do: 'tele', at: 0.2, dur: 1.0, shape: 'circle', r: 440, follow: true, chargeFx: 'bearwitness' },
        { do: 'rain', at: 0.5, n: 16, dur: 1.8, area: 420, flight: 0.8, r: 80, dmg: 48, posture: 12, kb: 150, kind: 'firerock', fx: 'firerockburst', fxEl: 'fire', teleColor: '#ff7a2e', status: BURN },
        ...sweep(1.25, 12, 0.12, 180, 30, 40, 440, 30),
        { do: 'tele', at: 2.75, dur: 0.6, shape: 'rect', len: 680, w: 180, follow: true, lockBefore: 0.25 },
        ...strike(3.35, 0.2, { shape: 'circle', r: 150, off: 70 }, { dmg: 110, posture: 40, kb: 420, ...FIRE, fx: { id: 'bearwitness', scale: 1.3 } }),
        { do: 'erupt', at: 3.4, n: 8, interval: 0.08, start: 140, step: 75, r: 95, dmg: 72, posture: 22, kb: 360, fx: 'dragonpyre', fxEl: 'fire', status: BURN },
      ],
      desc: '一階段「我乃黃金之王！」：「我命令你，跪下！」——掄斧捲起巨大旋風把對手捲到身邊（四面風壁擋下投射物），三連震地一圈比一圈大，最後高高躍起一斧劈下，落點浮出葛孚雷的金色獅紋。二階段「列祖列宗，見證吧！」（全程無敵）：龍頭朝天噴火、火岩雨從天而降，旋身一整圈龍息，最後龍頭插地，火柱一路往前炸開。',
    },
  };

  BD.registerBoss(godrick);
})(typeof window !== 'undefined' ? window : globalThis);
