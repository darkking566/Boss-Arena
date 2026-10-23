'use strict';
// Boss 資料：鏡爪（《英雄聯盟》Kindred，永恆獵手）：死亡的雙生——神羊（Lamb）持銀弓遠射、魔狼（Wolf）在她身旁撲殺獵物。
// 招式名取自繁中官網：鏡爪印記（被動）、舞動箭矢（Q）、魔狼狂熱（W）、恐懼蔓延（E）、神羊喘息（R）。
// 魔狼是純演出的靈體（js/render/styles/kindred.js 的 under）：凡是 fx 為 wolfbite / wolfmaw / wolfcharge / lambfinale 的判定，都由魔狼撲上去咬；
// 傷害一律由神羊的時間軸結算。被動：狀態 hunt（每層 +6% 傷害）；R：狀態 respite（生命不低於 10%，結束回血）。考據見 docs/bosses/kindred.md
(function (G) {
  const BD = G.BD, { strike } = BD.DataKit;
  const rect = (len, w) => ({ shape: 'rect', len, w });

  // 神羊的單發箭（前兩箭的恐懼蔓延 / 魔狼狂熱期間的掩護射擊）
  const shot = (at, dmg, extra) => ({ do: 'proj', at, n: 1, speed: 1200, r: 11, dmg, posture: 8, kb: 40, life: 0.8, kind: 'arrow', fx: 'lambshot', ...extra });
  // 魔狼撲向印記點的一口（印記由前面的 tele 設定、跟著目標走）
  const bite = (at, mark, r, dmg, posture, kb, fx, extra) => ({ do: 'hit', at, shape: 'circle', r, anchor: 'mark', mark, dmg, posture, kb, fx, ...extra });

  // 魔狼狂熱：魔狼衝進目標所在的獵場，連咬數口；神羊在後方補箭。離開獵場就躲得掉（原作：離開範圍魔狼就停手）
  const frenzy = (r, dps, bites, el) => {
    const fx = (id) => (el ? { id, el } : id);
    const out = [{ do: 'tele', at: 0, dur: 0.55, shape: 'circle', r, anchor: 'target', setMark: 'Z', follow: true, lockBefore: 0.25, teleFx: 'wolfpounce' },
      { do: 'zone', at: 0.3, pattern: 'at', r, dur: 0.5 + bites * 0.4, dps, kind: 'frenzy', delay: 0.25 }];
    for (let i = 0; i < bites; i++) {
      const last = i === bites - 1, at = 0.55 + i * 0.4;
      out.push(bite(at, 'Z', r, last ? 46 : 30, last ? 20 : 12, last ? 220 : 110, fx(last ? 'wolfmaw' : 'wolfbite')));
      if (!last) out.push(shot(at + 0.2, 20));
    }
    return out;
  };

  // 鏡爪印記・宣告：神羊的銀色符印落在目標腳下，爆開後累積一層鏡爪印記
  const markShot = (tele, r, dmg, posture, dur) => [
    { do: 'tele', at: 0.05, dur: tele, shape: 'circle', r, anchor: 'target', setMark: 'M', follow: true, lockBefore: 0.3, teleFx: 'lambmark' },
    { do: 'hit', at: 0.05 + tele, shape: 'circle', r, anchor: 'mark', mark: 'M', dmg, posture, kb: 90, fx: 'lambmarkbloom', status: [{ id: 'vulnerable', dur }] },
    { do: 'status', at: 0.1 + tele, id: 'hunt' }];

  const kindred = {
    id: 'kindred', name: '鏡爪', title: '永恆獵手', archetype: '死亡的雙生（神羊與魔狼）',
    desc: '《英雄聯盟》中死亡的化身，「雖為各自為體，卻從不分離」：神羊的銀弓讓接受命運的人痛快解脫，魔狼追獵那些拒絕面對的人。神羊在遠處翻滾射箭，魔狼隨時會從她身旁撲出——被標記的獵物躲不掉，逃跑的獵物更躲不掉。二階段魔狼的飢餓再也壓不住，身形暴漲、燃起鬼火，箭雨與狼牙一起淹沒整個獵場。',
    color: '#eef2fa', color2: '#1d2233', glow: '#8fe3ff', style: 'kindred',
    radius: 24, maxHp: 1900, speed: 262, turn: 9, mass: 0.8, fxEl: 'shadow', hurt: 'flesh',
    traits: [],
    stamina: { max: 100, regen: 34 }, posture: 100, dodgeCost: 18, dodgeSpeed: 610,
    ai: { prefRange: [190, 430], aggression: 0.55, dodge: 0.55, precision: 0.8, reaction: 0.2, strafe: 0.85, walk: 0.6,
      feint: 0.15, delay: 0.25, retreat: 0.3, punish: 0.7, nervous: 0.05, patience: 0.5 },
    phase2: { speedMul: 1.12, dmgMul: 1.2, cdMul: 0.82, fxEl: 'blood', transFx: { id: 'wolfawaken', el: 'blood' },
      line: '魔狼，這一場是你的饗宴。',
      note: '魔狼的飢餓失控：身形暴漲、燃起鬼火，魔狼狂熱連咬四口、恐懼蔓延的撲擊更重；解鎖「魔狼撕咬」「狩獵風暴」；大招追加魔狼的直線衝殺' },
    skills: [
      // 舞動箭矢（Q）：神羊往側面翻滾、落地連射三箭（二階段兩輪）；箭會微幅追蹤（原作：自動射向附近的敵人）
      { id: 'arrows', name: '舞動箭矢', short: '舞箭', tags: ['ranged', 'escape'], range: [80, 460], cd: 5.5, cost: 14, track: 7, recovery: 0.35,
        actions: [{ do: 'dash', at: 0.05, dist: 220, dur: 0.22, dir: 'side', iframe: true, fx: 'lambdash' },
          { do: 'proj', at: 0.3, n: 3, spread: 0.22, speed: 950, r: 10, dmg: 32, posture: 10, kb: 70, life: 0.9, homing: 3, kind: 'arrow', fx: 'lambvolley' }],
        actions2: [{ do: 'dash', at: 0.05, dist: 240, dur: 0.2, dir: 'side', iframe: true, fx: 'lambdash' },
          { do: 'proj', at: 0.28, n: 3, spread: 0.22, speed: 1000, r: 10, dmg: 32, posture: 10, kb: 70, life: 0.9, homing: 3, kind: 'arrow', fx: { id: 'lambvolley', el: 'blood' } },
          { do: 'proj', at: 0.5, n: 4, spread: 0.3, speed: 1000, r: 10, dmg: 30, posture: 10, kb: 70, life: 0.9, homing: 3, kind: 'arrow', fx: { id: 'lambvolley', el: 'blood' } }] },
      // 魔狼狂熱（W）：魔狼衝進對手所在的獵場連咬（一階段三口），神羊在後方補箭；走出獵場就躲得掉
      { id: 'frenzy', name: '魔狼狂熱', short: '狂熱', tags: ['ranged', 'zone'], range: [120, 520], cd: 11, cost: 20, track: 6, recovery: 0.4,
        actions: frenzy(150, 14, 3),
        actions2: frenzy(170, 18, 4, 'blood') },
      // 恐懼蔓延（E）：兩箭緩速，第三下魔狼從神羊身旁撲向目標（落點預警跟著目標走）
      { id: 'dread', name: '恐懼蔓延', short: '恐懼', tags: ['ranged', 'lock'], range: [100, 520], cd: 9, cost: 16, track: 8, recovery: 0.4,
        actions: [{ do: 'tele', at: 0, dur: 0.3, shape: 'rect', len: 520, w: 30, follow: true },
          shot(0.3, 24, { status: { id: 'slow', dur: 1 } }), shot(0.5, 24, { status: { id: 'slow', dur: 1 } }),
          { do: 'tele', at: 0.65, dur: 0.45, shape: 'circle', r: 70, anchor: 'target', setMark: 'W', follow: true, lockBefore: 0.15, teleFx: 'wolfpounce' },
          bite(1.1, 'W', 70, 92, 40, 260, 'wolfmaw', { status: { id: 'vulnerable', dur: 3 } })],
        actions2: [{ do: 'tele', at: 0, dur: 0.28, shape: 'rect', len: 560, w: 34, follow: true },
          shot(0.28, 28, { status: { id: 'slow', dur: 1.2 } }), shot(0.46, 28, { status: { id: 'slow', dur: 1.2 } }),
          { do: 'tele', at: 0.6, dur: 0.42, shape: 'circle', r: 82, anchor: 'target', setMark: 'W', follow: true, lockBefore: 0.15, teleFx: 'wolfpounce' },
          bite(1.02, 'W', 82, 122, 50, 300, { id: 'wolfmaw', el: 'blood' }, { status: { id: 'vulnerable', dur: 3.5 } })] },
      // 鏡爪印記・宣告（被動的主動面）：符印落在目標腳下，爆開後累積一層鏡爪印記（每層 +6% 傷害，最多 5 層）
      { id: 'mark', name: '鏡爪印記・宣告', short: '印記', tags: ['ranged', 'zone'], range: [140, 700], cd: 10, cost: 18, track: 7, recovery: 0.5,
        actions: markShot(0.9, 60, 60, 20, 3),
        actions2: markShot(0.8, 66, 68, 24, 3.5) },
      // 神羊喘息（R）：神羊腳下展開銀色聖域，4 秒內生命不會低於 10%，結束時回復生命
      { id: 'respite', name: '神羊喘息', short: '喘息', tags: ['defensive'], range: [0, 900], cd: 26, cost: 24, track: 6, recovery: 0.5,
        actions: [{ do: 'status', at: 0.15, id: 'respite', dur: 4, value: 160, fx: 'lambsanctum' }],
        actions2: [{ do: 'status', at: 0.15, id: 'respite', dur: 4, value: 220, fx: { id: 'lambsanctum', el: 'blood' } }] },
      // 神羊躍步：對手貼身時神羊往後躍開、空中放箭，魔狼留在原地咬住追上來的人
      { id: 'leap', name: '神羊躍步', short: '躍步', tags: ['escape', 'ranged'], range: [0, 200], cd: 8, cost: 16, track: 7, recovery: 0.35,
        actions: [{ do: 'tele', at: 0, dur: 0.4, shape: 'circle', r: 110, setMark: 'B' },
          { do: 'blink', at: 0.1, to: 'away', dist: 280, fx: 'lambleap' },
          { do: 'proj', at: 0.25, n: 3, spread: 0.3, speed: 950, r: 10, dmg: 28, posture: 10, kb: 70, life: 0.9, kind: 'arrow', fx: 'lambvolley' },
          bite(0.4, 'B', 110, 56, 26, 240, 'wolfbite')],
        actions2: [{ do: 'tele', at: 0, dur: 0.36, shape: 'circle', r: 120, setMark: 'B' },
          { do: 'blink', at: 0.1, to: 'away', dist: 300, fx: 'lambleap' },
          { do: 'proj', at: 0.22, n: 4, spread: 0.36, speed: 1000, r: 10, dmg: 28, posture: 10, kb: 70, life: 0.9, kind: 'arrow', fx: { id: 'lambvolley', el: 'blood' } },
          bite(0.36, 'B', 120, 68, 30, 260, { id: 'wolfbite', el: 'blood' })] },
      // 二階段：魔狼撕咬——魔狼從神羊身旁沿直線衝殺出去，整條路徑上的獵物都會被撕開
      { id: 'maw', name: '魔狼撕咬', short: '撕咬', phase: 2, tags: ['ranged', 'aoe'], range: [0, 540], cd: 8, cost: 20, track: 8, recovery: 0.45,
        actions: strike(0.75, 0.6, rect(560, 100), { dmg: 88, posture: 40, kb: 300, fx: { id: 'wolfcharge', el: 'blood' } }) },
      // 二階段：狩獵風暴——銀箭從天而降，落點各自預警
      { id: 'storm', name: '狩獵風暴', short: '風暴', phase: 2, tags: ['ranged', 'aoe'], range: [120, 640], cd: 10, cost: 24, track: 7, recovery: 0.6,
        actions: [{ do: 'rain', at: 0.3, n: 14, dur: 1.2, area: 280, r: 60, flight: 0.7, dmg: 40, posture: 14, kb: 160, kind: 'arrow', fx: 'lambrain', fxEl: 'blood' }] },
    ],
    // 大招：永恆獵手——符印落在對手腳下，銀箭雨淹沒獵場；符印爆開的瞬間魔狼從天而降、把獵物壓進地面。二階段魔狼再沿直線衝殺一次
    ultimate: { id: 'ult', name: '永恆獵手', name2: '永恆獵手・饗宴', ult: true, range: [0, 900], track: 0, recovery: 0.8,
      actions: [{ do: 'tele', at: 0.05, dur: 1.3, shape: 'circle', r: 130, anchor: 'target', setMark: 'U', follow: true, lockBefore: 0.3, teleFx: 'lambmark' },
        { do: 'rain', at: 0.4, n: 16, dur: 1.4, area: 300, r: 64, flight: 0.7, dmg: 40, posture: 16, kb: 160, kind: 'arrow', fx: 'lambrain', fxEl: 'shadow' },
        bite(1.35, 'U', 130, 150, 60, 380, 'lambfinale', { status: [{ id: 'root', dur: 1 }, { id: 'vulnerable', dur: 4 }] }),
        { do: 'status', at: 1.4, id: 'hunt' }],
      actions2: [{ do: 'tele', at: 0.05, dur: 1.2, shape: 'circle', r: 150, anchor: 'target', setMark: 'U', follow: true, lockBefore: 0.3, teleFx: 'lambmark' },
        { do: 'rain', at: 0.35, n: 22, dur: 1.5, area: 320, r: 68, flight: 0.7, dmg: 44, posture: 18, kb: 170, kind: 'arrow', fx: 'lambrain', fxEl: 'blood' },
        bite(1.25, 'U', 150, 170, 70, 400, { id: 'lambfinale', el: 'blood' }, { status: [{ id: 'root', dur: 1.2 }, { id: 'vulnerable', dur: 4.5 }] }),
        { do: 'status', at: 1.3, id: 'hunt' },
        ...strike(2.2, 0.6, rect(700, 120), { dmg: 110, posture: 50, kb: 380, fx: { id: 'wolfcharge', el: 'blood' } })],
      desc: '符印落在對手腳下，銀箭雨淹沒獵場；符印爆開的瞬間魔狼從天而降，把獵物壓進地面（定身 + 易傷），並累積一層鏡爪印記。二階段魔狼再沿直線衝殺一次。' },
  };

  BD.registerBoss(kindred);
})(typeof window !== 'undefined' ? window : globalThis);
