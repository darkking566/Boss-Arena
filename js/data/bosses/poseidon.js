'use strict';
// Boss 資料：波賽頓（《終末的女武神》第 3 回戰，神方代表「大海的暴君」「海之宙斯」「神中之神」）
// 一階段：不動如山的傲慢海神——三叉槍「怒れる波濤」連刺 / 「荒海に降る神雷」躍起槍雨 / 三叉穿刺 / 分海之踏 / 怒濤巨浪 / 撥浪（見切）；被動「大海暴君」每挨 4 下動怒
// HP 50%：被讀穿一切的神真正認真（「神中之神」），右臂肌肉膨脹、用自己的血把頭髮往後撥，身法快到留下殘影（trait echo），解鎖「神速・殘影」「撼地者・震海」
// 大招：「四十日四十夜的大洪水」——從四面八方同時刺來、殘影連成圓頂的終極連刺。考據見 docs/bosses/poseidon.md
(function (G) {
  const BD = G.BD, { D, strike, dashStrike, flurry } = BD.DataKit;
  const rect = (len, w) => ({ shape: 'rect', len, w });
  const cone = (r, arc, angOff) => Object.assign({ shape: 'cone', r, arc: arc * D }, angOff ? { angOff: angOff * D } : {});
  const dome = (r, mark) => ({ shape: 'circle', r, anchor: 'mark', mark }); // 以標記點為圓心的圓形（槍雨 / 圓頂）

  const poseidon = {
    id: 'poseidon', name: '波賽頓', title: '大海的暴君', archetype: '長槍壓制',
    desc: '終末的女武神第 3 回戰、神方代表，奧林帕斯十二神中「最恐」的海神，眾神口中的「神中之神」。不群聚、不謀略、不依靠，神生來就是完美的；人類在他眼裡只是雜魚。以三叉槍使出一記接一記快到留下殘影的連刺，大招「四十日四十夜的大洪水」從四面八方同時刺來。',
    color: '#2b4fa8', color2: '#e9edf4', glow: '#5ac8ff', style: 'poseidon',
    radius: 35, maxHp: 1800, speed: 240, turn: 6.5, mass: 1.25, fxEl: 'ocean', hurt: 'flesh',
    traits: ['counter', 'tyrant', 'echo'], echoColor: '#7fdcff', // counter＝撥浪見切；tyrant＝每挨 4 下動怒；echo＝二階段快到留下殘影、0.3 秒後再刺一次
    stamina: { max: 110, regen: 30 }, posture: 170, dodgeCost: 18, dodgeSpeed: 560,
    // 原作：他一直站著不動，直到對手踏進槍的距離才出手——偏好遠距、耐心、很少主動逼近
    ai: { prefRange: [200, 420], aggression: 0.5, dodge: 0.45, precision: 0.85, reaction: 0.2, strafe: 0.4, walk: 0.5,
      feint: 0.05, delay: 0.35, retreat: 0.05, punish: 0.8, nervous: 0.02, patience: 0.85, read: 0.7, counter: 0.5,
      // 連段（僅沉重）：怒濤連刺接三叉穿、神雷落地接踏、巨浪後追刺；二階段殘影突襲、震海後連刺
      combos: [
        { id: 'wave', name: '波濤・三叉', weight: 1.3, steps: [
          { skill: 'amphitrite' },
          { skill: 'trident', cancel: 0.3, branch: [
            { when: { landed: true }, do: 'extend' },
            { when: { rolled: true, dist: [0, 420] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'flood', name: '神雷・分海', phase: 1, weight: 1.1, steps: [
          { skill: 'chione' },
          { skill: 'seaparting', cancel: 0.4, branch: [
            { when: { dist: [0, 260] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'tide', name: '巨浪・追刺', phase: 1, weight: 1, steps: [
          { skill: 'tidal' },
          { skill: 'amphitrite', cancel: 0.35, branch: [
            { when: { dist: [0, 330] }, do: 'extend' },
            { when: { dist: [330, 560] }, do: 'switch', skill: 'trident' },
            { do: 'stop' }] }] },
        { id: 'ghost', name: '殘影・三叉', phase: 2, weight: 1.3, steps: [
          { skill: 'godstep' },
          { skill: 'trident', cancel: 0.3, branch: [
            { when: { landed: true }, do: 'extend' },
            { chance: 0.4, do: 'delay', hold: [0.2, 0.45] },
            { do: 'stop' }] }] },
        { id: 'quake', name: '震海・怒濤', phase: 2, weight: 1.1, steps: [
          { skill: 'earthshaker' },
          { skill: 'amphitrite', cancel: 0.4, branch: [
            { when: { dist: [0, 330] }, do: 'extend' },
            { do: 'stop' }] }] },
      ] },
    phase2: { speedMul: 1.12, dmgMul: 1.18, cdMul: 0.82, line: '妄稱讀透了吾的一切？——給我認清自己的身分。', fxEl: 'ocean',
      transDur: 2.6, roarAt: 2.1, transFx: { id: 'godofgods', el: 'ocean', life: 2.0 }, status: { id: 'godofgods' },
      note: '神認真了：怒濤連刺加長並在末尾追加環形的波濤、神雷落槍更密、三叉穿刺連刺兩輪、分海追加外圈水環、巨浪一次三道、撥浪架式更久；身法快到留下殘影（每記判定 0.3 秒後再刺一次）；解鎖「神速・殘影」「撼地者・震海」；常駐「神中之神」（移動更快、承傷降低、出手更重），大招變為「大洪水・海神全開」（圓頂更大、連刺更密）' },
    skills: [
      // 原作招式「怒れる波濤（アムピトリテ）」：荒海巨浪般從正面連續刺來的槍（wiki：以圓形軌跡的連續突刺）。一階段六連刺 + 重刺收尾；二階段八連刺 + 環形波濤
      { id: 'amphitrite', name: '怒れる波濤', short: '波濤', tags: ['melee', 'fast'], range: [0, 360], cd: 5.5, cost: 22, track: 7, creep: 0.2, recovery: 0.6,
        actions: [{ do: 'tele', at: 0.05, dur: 0.55, ...rect(390, 84), follow: true },
          ...flurry(0.6, 6, 0.12, rect(390, 84), { dmg: 30, posture: 8, kb: 50, multi: true }, { id: 'amphitrite', scale: 0.9 }),
          { do: 'tele', at: 1.1, dur: 0.32, ...rect(420, 100), follow: true },
          { do: 'hit', at: 1.42, ...rect(420, 100), dmg: 70, posture: 28, kb: 300, fx: { id: 'amphitrite', scale: 1.4 } }],
        actions2: [{ do: 'tele', at: 0.05, dur: 0.5, ...rect(410, 90), follow: true },
          ...flurry(0.55, 8, 0.095, rect(410, 90), { dmg: 28, posture: 8, kb: 50, multi: true }, { id: 'amphitrite', scale: 0.95 }),
          { do: 'tele', at: 1.1, dur: 0.42, shape: 'circle', r: 215 },
          { do: 'hit', at: 1.52, shape: 'circle', r: 215, dmg: 86, posture: 32, kb: 380, fx: { id: 'ring', scale: 1.2 } }] },
      // 原作招式「荒海に降る神雷（キオネ・テュロ・デーメテール）」：跳到對手上空、像雷雨一樣連續刺下的槍雨。躍起後在空中（無法被選中）連刺，落地再一記重砸
      { id: 'chione', name: '荒海に降る神雷', short: '神雷', tags: ['aoe', 'gap'], range: [100, 760], cd: 9, cost: 28, track: 4, recovery: 0.85,
        actions: [{ do: 'tele', at: 0.1, dur: 1.2, shape: 'circle', r: 165, anchor: 'target', setMark: 'C', follow: true, lockBefore: 0.55 },
          { do: 'hide', at: 0.15, fx: 'leap' },
          ...flurry(1.3, 7, 0.09, dome(165, 'C'), { dmg: 24, posture: 7, kb: 60, multi: true }, 'tridentrain', 0.94),
          { do: 'tele', at: 1.3, dur: 0.7, shape: 'circle', r: 195, anchor: 'mark', mark: 'C' },
          { do: 'land', at: 2.0, mark: 'C' },
          { do: 'hit', at: 2.0, ...dome(195, 'C'), dmg: 110, posture: 40, kb: 440, fx: { id: 'bigslam', scale: 1.1 } }],
        actions2: [{ do: 'tele', at: 0.1, dur: 1.1, shape: 'circle', r: 185, anchor: 'target', setMark: 'C', follow: true, lockBefore: 0.5 },
          { do: 'hide', at: 0.15, fx: 'leap' },
          ...flurry(1.2, 10, 0.075, dome(185, 'C'), { dmg: 22, posture: 6, kb: 60, multi: true }, 'tridentrain', 0.95),
          { do: 'tele', at: 1.2, dur: 0.75, shape: 'circle', r: 215, anchor: 'mark', mark: 'C' },
          { do: 'land', at: 1.95, mark: 'C' },
          { do: 'hit', at: 1.95, ...dome(215, 'C'), dmg: 125, posture: 44, kb: 480, fx: { id: 'bigslam', scale: 1.25 } }] },
      // 三叉槍本身：三根槍齒同時貫穿（中央最長，兩側略短且各偏一點角度）；二階段連刺兩輪
      { id: 'trident', name: '三叉穿刺', short: '三叉', tags: ['melee', 'gap'], range: [60, 470], cd: 4.4, cost: 16, track: 8, recovery: 0.55,
        actions: [...strike(0.5, 0.45, rect(450, 50), { dmg: 58, posture: 20, kb: 200, fx: 'triprong' }),
          ...strike(0.5, 0.45, { ...rect(430, 44), angOff: 0.17 }, { dmg: 46, posture: 14, kb: 140, fx: { id: 'thrust', scale: 0.7 } }),
          ...strike(0.5, 0.45, { ...rect(430, 44), angOff: -0.17 }, { dmg: 46, posture: 14, kb: 140, fx: { id: 'thrust', scale: 0.7 } })],
        actions2: [...strike(0.4, 0.36, rect(460, 50), { dmg: 54, posture: 18, kb: 180, fx: 'triprong' }),
          ...strike(0.4, 0.36, { ...rect(440, 44), angOff: 0.17 }, { dmg: 42, posture: 12, kb: 120, fx: { id: 'thrust', scale: 0.7 } }),
          ...strike(0.4, 0.36, { ...rect(440, 44), angOff: -0.17 }, { dmg: 42, posture: 12, kb: 120, fx: { id: 'thrust', scale: 0.7 } }),
          ...strike(0.95, 0.3, rect(480, 56), { dmg: 66, posture: 24, kb: 260, fx: { id: 'triprong', scale: 1.2 } })] },
      // 原作入場：他腳一踏，海水就向兩側分開（走上場完全不濕）。改編為踏地震波 + 向前劈開一條乾路
      { id: 'seaparting', name: '分海之踏', short: '分海', tags: ['melee', 'aoe'], range: [0, 330], cd: 7, cost: 22, track: 5, recovery: 0.7,
        actions: [...strike(0.65, 0.6, { shape: 'circle', r: 165 }, { dmg: 78, posture: 34, kb: 440, fx: 'waterstomp' }),
          ...strike(1.05, 0.45, rect(720, 120), { dmg: 62, posture: 22, kb: 300, slow: 1, fx: { id: 'beam', scale: 0.6 } })],
        actions2: [...strike(0.55, 0.5, { shape: 'circle', r: 175 }, { dmg: 82, posture: 36, kb: 460, fx: { id: 'waterstomp', scale: 1.15 } }),
          ...strike(0.95, 0.4, rect(760, 130), { dmg: 66, posture: 24, kb: 320, slow: 1, fx: { id: 'beam', scale: 0.6 } }),
          ...strike(1.3, 0.35, { shape: 'ring', r0: 180, r: 340 }, { dmg: 58, posture: 20, kb: 340, fx: 'ring' })] },
      // 改編：神話中的海神操縱風暴與海嘯，推出一道貫穿全場的巨浪
      { id: 'tidal', name: '怒濤巨浪', short: '巨浪', tags: ['ranged'], range: [220, 900], cd: 7.5, cost: 22, track: 6, recovery: 0.6,
        actions: [{ do: 'tele', at: 0.1, dur: 0.65, ...rect(860, 130), follow: true },
          { do: 'proj', at: 0.75, n: 1, speed: 560, r: 62, dmg: 78, posture: 26, kb: 320, life: 1.6, pierce: true, kind: 'tidewave' }],
        actions2: [{ do: 'tele', at: 0.1, dur: 0.6, ...cone(860, 55), follow: true },
          { do: 'proj', at: 0.7, n: 3, spread: 0.38, speed: 620, r: 58, dmg: 70, posture: 22, kb: 300, life: 1.5, pierce: true, kind: 'tidewave' }] },
      // 原作：他輕易擋開、閃過小次郎的每一刀——以三叉槍把攻擊撥開（見切架式），反手一刺
      { id: 'parry_tide', name: '撥浪・後之先', short: '撥浪', tags: ['counter', 'defensive'], range: [0, 360], cd: 8, cost: 10, track: 8, recovery: 0.45,
        actions: [{ do: 'counter', at: 0, dur: 0.9, dmg: 150, posture: 55, name: '三叉槍・撥浪', fx: 'parry', slowmo: 0.3 }],
        actions2: [{ do: 'counter', at: 0, dur: 1.1, dmg: 190, posture: 72, name: '三叉槍・撥浪', fx: 'parry', slowmo: 0.4 }] },

      // ── 二階段：神中之神 ──
      // 原作：認真起來後速度超出了小次郎的預測——連續閃現到側面、再到背後，快到留下殘影的重刺
      { id: 'godstep', name: '神速・殘影', short: '殘影', phase: 2, tags: ['gap', 'fast'], range: [100, 520], cd: 7, cost: 20, track: 8, recovery: 0.7,
        actions: [{ do: 'blink', at: 0.12, to: 'side', dist: 300, fx: 'blink' },
          { do: 'blink', at: 0.5, to: 'behind', dist: 85, fx: 'blink' },
          ...strike(1.0, 0.45, rect(430, 70), { dmg: 84, posture: 30, kb: 300, fx: 'triprong' }),
          ...strike(1.32, 0.25, cone(260, 110), { dmg: 70, posture: 24, kb: 260, fx: 'slash' })] },
      // 改編：神話中的「撼地者」——一踏震動大海，水柱沿地面一路噴發
      { id: 'earthshaker', name: '撼地者・震海', short: '震海', phase: 2, tags: ['aoe', 'ranged'], range: [0, 600], cd: 9, cost: 26, track: 4, recovery: 0.85,
        actions: [...strike(0.8, 0.7, { shape: 'circle', r: 170 }, { dmg: 96, posture: 40, kb: 480, fx: { id: 'waterstomp', scale: 1.3 } }),
          { do: 'tele', at: 0.7, dur: 0.7, ...rect(900, 160), follow: true, hitIn: 0.75 },
          { do: 'erupt', at: 1.4, n: 8, start: 140, step: 105, interval: 0.07, r: 85, dmg: 58, posture: 18, kb: 300, fx: 'erupt' }] },
    ],
    // 一階段「四十日四十夜的大洪水」：躍到對手上空、從圓頂的每個方向同時連刺，最後落地一記無法閃避的重砸（走出圓頂範圍才能躲）；
    // 二階段「大洪水・海神全開」：圓頂更大、連刺更密、落地後再追一圈水環
    ultimate: { id: 'ult', name: '四十日四十夜的大洪水', name2: '大洪水・海神全開', ult: true, range: [0, 900], track: 0, recovery: 1.0,
      actions: [{ do: 'tele', at: 0.1, dur: 1.5, shape: 'circle', r: 300, anchor: 'target', setMark: 'F', follow: true, lockBefore: 0.7, chargeFx: 'ultcast' },
        { do: 'hide', at: 0.2, fx: 'leap' },
        { do: 'hit', at: 1.6, ...dome(300, 'F'), dmg: 22, posture: 6, kb: 40, multi: true, fx: { id: 'deluge' } },
        ...flurry(1.71, 8, 0.11, dome(300, 'F'), { dmg: 22, posture: 6, kb: 40, multi: true }, 'tridentrain', 0.95),
        { do: 'tele', at: 2.7, dur: 0.5, shape: 'circle', r: 300, anchor: 'mark', mark: 'F' },
        { do: 'land', at: 3.2, mark: 'F' },
        { do: 'hit', at: 3.2, ...dome(300, 'F'), dmg: 150, posture: 70, kb: 650, undodgeable: true, fx: { id: 'bigslam', scale: 1.5 } }],
      actions2: [{ do: 'tele', at: 0.1, dur: 1.4, shape: 'circle', r: 350, anchor: 'target', setMark: 'F', follow: true, lockBefore: 0.7, chargeFx: 'ultcast' },
        { do: 'hide', at: 0.2, fx: 'leap' },
        { do: 'hit', at: 1.5, ...dome(350, 'F'), dmg: 20, posture: 6, kb: 40, multi: true, fx: { id: 'deluge', scale: 1.2 } },
        ...flurry(1.6, 12, 0.08, dome(350, 'F'), { dmg: 20, posture: 6, kb: 40, multi: true }, 'tridentrain', 0.96),
        { do: 'tele', at: 2.4, dur: 0.5, shape: 'circle', r: 350, anchor: 'mark', mark: 'F' },
        { do: 'land', at: 2.9, mark: 'F' },
        { do: 'hit', at: 2.9, ...dome(350, 'F'), dmg: 200, posture: 90, kb: 720, undodgeable: true, fx: { id: 'bigslam', scale: 1.7 } },
        { do: 'tele', at: 3.0, dur: 0.4, shape: 'ring', r0: 340, r: 580, anchor: 'mark', mark: 'F' },
        { do: 'hit', at: 3.4, shape: 'ring', r0: 340, r: 580, anchor: 'mark', mark: 'F', dmg: 70, posture: 20, kb: 380, fx: 'ring' }],
      desc: '一階段「四十日四十夜的大洪水」：躍到對手上空，從圓頂的每個方向同時連刺（快到殘影連成一座光之圓頂），最後落地一記無法閃避的重砸，只有走出圓頂範圍才能躲開；二階段「大洪水・海神全開」：圓頂更大、連刺更密，落地後再追一圈水環。' },
  };

  BD.registerBoss(poseidon);
})(typeof window !== 'undefined' ? window : globalThis);
