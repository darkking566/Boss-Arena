'use strict';
// Boss 資料：鏡爪（《英雄聯盟》Kindred，永恆獵手）：死亡的雙生——神羊（Lamb）持銀弓遠射、魔狼（Wolf）在她身旁撲殺獵物。
// 招式名取自繁中官網：鏡爪印記（被動）、舞動箭矢（Q）、魔狼狂熱（W）、恐懼蔓延（E）、神羊喘息（R）。
// 魔狼是獨立的戰鬥夥伴（召喚物 wolf，js/engine/minions/kindred.js）：開場就在、自己包夾撲咬、可以被打散後重聚；
// 神羊的招式以 do:'wolf' 下令，魔狼從自己的位置蓄勢撲出（tele 蓄勢、cap 最遠撲距 / len 固定衝殺長度、r 咬合半徑 / w 衝殺寬度、leap 不限距離的躍擊、now 插隊）。
// 被動：狀態 hunt（每層 +6% 傷害）；R：狀態 respite（生命不低於 10%，結束回血）。考據見 docs/bosses/kindred.md
(function (G) {
  const BD = G.BD;
  // 對魔狼下令：從狼自己的位置撲向目標（cap 最遠撲距）、咬合半徑 r
  const order = (at, tele, r, dmg, posture, kb, fx, extra) => ({ do: 'wolf', at, tele, cap: 420, r, dmg, posture, kb, fx, ...extra });
  // 魔狼衝殺：從狼的位置朝獵物衝出固定長度 len、寬 w 的直線
  const charge = (at, tele, len, w, dmg, posture, kb) => ({ do: 'wolf', at, tele, len, w, dash: 0.28, dmg, posture, kb, fx: { id: 'wolfcharge', el: 'blood' } });

  // 神羊的單發箭（前兩箭的恐懼蔓延 / 魔狼狂熱期間的掩護射擊）
  const shot = (at, dmg, extra) => ({ do: 'proj', at, n: 1, speed: 1200, r: 11, dmg, posture: 8, kb: 40, life: 0.8, kind: 'arrow', fx: 'lambshot', ...extra });
  // 魔狼狂熱：神羊在獵物腳下劃出獵場，魔狼從自己的位置連撲數口（每口重新瞄準）；神羊在後方補箭。原作：魔狼在範圍內撲咬
  const frenzy = (r, dps, bites, el) => {
    const fx = (id) => (el ? { id, el } : id);
    const out = [{ do: 'tele', at: 0, dur: 0.55, shape: 'circle', r, anchor: 'target', setMark: 'Z', follow: true, lockBefore: 0.25, teleFx: 'wolfpounce' },
      { do: 'zone', at: 0.3, pattern: 'at', r, dur: 0.5 + bites * 0.4, dps, kind: 'frenzy', delay: 0.25 }];
    for (let i = 0; i < bites; i++) {
      const last = i === bites - 1;
      out.push(order(0.1, i ? 0.32 : 0.45, 70, last ? 34 : 22, last ? 10 : 6, last ? 220 : 110, fx(last ? 'wolfmaw' : 'wolfbite'), { rec: 0.1 }));
      if (!last) out.push(shot(0.75 + i * 0.4, 20));
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
    desc: '《英雄聯盟》中死亡的化身，「雖為各自為體，卻從不分離」：神羊的銀弓讓接受命運的人痛快解脫，魔狼追獵那些拒絕面對的人。神羊在遠處翻滾射箭，魔狼則自己繞到獵物背後包夾撲咬，逃得越遠追得越兇；打散魔狼能換來片刻喘息，但牠總會回到神羊身旁。二階段魔狼的飢餓再也壓不住，身形暴漲、燃起鬼火，箭雨與狼牙一起淹沒整個獵場。',
    color: '#eef2fa', color2: '#1d2233', glow: '#8fe3ff', style: 'kindred',
    radius: 24, maxHp: 1600, speed: 262, turn: 9, mass: 0.8, fxEl: 'shadow', hurt: 'flesh',
    traits: ['wolf'], // 魔狼：開場就在的獨立夥伴（js/engine/minions/kindred.js）
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
      // 魔狼狂熱（W）：神羊劃出獵場，魔狼從自己的位置連撲（一階段三口），神羊在後方補箭
      { id: 'frenzy', name: '魔狼狂熱', short: '狂熱', tags: ['ranged', 'zone'], range: [120, 520], cd: 11, cost: 20, track: 6, recovery: 0.4,
        actions: frenzy(150, 14, 3),
        actions2: frenzy(170, 18, 4, 'blood') },
      // 恐懼蔓延（E）：兩箭緩速，第三下魔狼從牠所在的位置撲向被緩速的獵物
      { id: 'dread', name: '恐懼蔓延', short: '恐懼', tags: ['ranged', 'lock'], range: [100, 520], cd: 9, cost: 16, track: 8, recovery: 0.4,
        actions: [{ do: 'tele', at: 0, dur: 0.3, shape: 'rect', len: 520, w: 30, follow: true },
          shot(0.3, 24, { status: { id: 'slow', dur: 1 } }), shot(0.5, 24, { status: { id: 'slow', dur: 1 } }),
          order(0.6, 0.5, 72, 70, 18, 260, 'wolfmaw', { cap: 560, status: { id: 'vulnerable', dur: 3 } })],
        actions2: [{ do: 'tele', at: 0, dur: 0.28, shape: 'rect', len: 560, w: 34, follow: true },
          shot(0.28, 28, { status: { id: 'slow', dur: 1.2 } }), shot(0.46, 28, { status: { id: 'slow', dur: 1.2 } }),
          order(0.55, 0.45, 82, 92, 22, 300, { id: 'wolfmaw', el: 'blood' }, { cap: 600, status: { id: 'vulnerable', dur: 3.5 } })] },
      // 鏡爪印記・宣告（被動的主動面）：符印落在目標腳下，爆開後累積一層鏡爪印記（每層 +6% 傷害，最多 5 層）
      { id: 'mark', name: '鏡爪印記・宣告', short: '印記', tags: ['ranged', 'zone'], range: [140, 700], cd: 10, cost: 18, track: 7, recovery: 0.5,
        actions: markShot(0.9, 60, 60, 20, 3),
        actions2: markShot(0.8, 66, 68, 24, 3.5) },
      // 神羊喘息（R）：神羊腳下展開銀色聖域，4 秒內生命不會低於 10%，結束時回復生命
      { id: 'respite', name: '神羊喘息', short: '喘息', tags: ['defensive'], range: [0, 900], cd: 26, cost: 24, track: 6, recovery: 0.5,
        actions: [{ do: 'status', at: 0.15, id: 'respite', dur: 4, value: 160, fx: 'lambsanctum' }],
        actions2: [{ do: 'status', at: 0.15, id: 'respite', dur: 4, value: 220, fx: { id: 'lambsanctum', el: 'blood' } }] },
      // 神羊躍步：對手貼身時神羊往後躍開、空中放箭，魔狼丟下手邊的事撲向追上來的人
      { id: 'leap', name: '神羊躍步', short: '躍步', tags: ['escape', 'ranged'], range: [0, 200], cd: 8, cost: 16, track: 7, recovery: 0.35,
        actions: [{ do: 'blink', at: 0.1, to: 'away', dist: 280, fx: 'lambleap' },
          { do: 'proj', at: 0.25, n: 3, spread: 0.3, speed: 950, r: 10, dmg: 28, posture: 10, kb: 70, life: 0.9, kind: 'arrow', fx: 'lambvolley' },
          order(0.1, 0.35, 90, 42, 12, 240, 'wolfbite', { now: true })],
        actions2: [{ do: 'blink', at: 0.1, to: 'away', dist: 300, fx: 'lambleap' },
          { do: 'proj', at: 0.22, n: 4, spread: 0.36, speed: 1000, r: 10, dmg: 28, posture: 10, kb: 70, life: 0.9, kind: 'arrow', fx: { id: 'lambvolley', el: 'blood' } },
          order(0.1, 0.32, 100, 52, 14, 260, { id: 'wolfbite', el: 'blood' }, { now: true })] },
      // 二階段：魔狼撕咬——魔狼從牠所在的位置朝獵物直線衝殺，整條路徑上的獵物都會被撕開
      { id: 'maw', name: '魔狼撕咬', short: '撕咬', phase: 2, tags: ['ranged', 'aoe'], range: [0, 640], cd: 8, cost: 20, track: 8, recovery: 0.45,
        actions: [charge(0.15, 0.65, 600, 110, 70, 18, 300)] },
      // 二階段：狩獵風暴——銀箭從天而降，落點各自預警
      { id: 'storm', name: '狩獵風暴', short: '風暴', phase: 2, tags: ['ranged', 'aoe'], range: [120, 640], cd: 10, cost: 24, track: 7, recovery: 0.6,
        actions: [{ do: 'rain', at: 0.3, n: 14, dur: 1.2, area: 280, r: 60, flight: 0.7, dmg: 40, posture: 14, kb: 160, kind: 'arrow', fx: 'lambrain', fxEl: 'blood' }] },
    ],
    // 大招：永恆獵手——銀箭雨淹沒獵場，魔狼丟下一切、從牠所在之處躍上半空撲落，把獵物壓進地面。二階段落地後再直線衝殺一次。魔狼被打散時只剩箭雨
    ultimate: { id: 'ult', name: '永恆獵手', name2: '永恆獵手・饗宴', ult: true, range: [0, 900], track: 0, recovery: 0.8,
      actions: [{ do: 'rain', at: 0.4, n: 16, dur: 1.4, area: 300, r: 64, flight: 0.7, dmg: 40, posture: 16, kb: 160, kind: 'arrow', fx: 'lambrain', fxEl: 'shadow' },
        { do: 'wolf', at: 0.05, now: true, leap: true, tele: 1.25, lock: 0.3, dash: 0.3, r: 130, dmg: 120, posture: 40, kb: 380, fx: 'lambfinale', rec: 0.2,
          status: [{ id: 'root', dur: 1 }, { id: 'vulnerable', dur: 4 }] },
        { do: 'status', at: 1.4, id: 'hunt' }],
      actions2: [{ do: 'rain', at: 0.35, n: 22, dur: 1.5, area: 320, r: 68, flight: 0.7, dmg: 44, posture: 18, kb: 170, kind: 'arrow', fx: 'lambrain', fxEl: 'blood' },
        { do: 'wolf', at: 0.05, now: true, leap: true, tele: 1.15, lock: 0.3, dash: 0.3, r: 150, dmg: 140, posture: 46, kb: 400, fx: { id: 'lambfinale', el: 'blood' }, rec: 0.2,
          status: [{ id: 'root', dur: 1.2 }, { id: 'vulnerable', dur: 4.5 }] },
        charge(0.1, 0.6, 700, 120, 90, 24, 380),
        { do: 'status', at: 1.3, id: 'hunt' }],
      desc: '銀箭雨淹沒獵場，魔狼從牠所在之處躍上半空撲落，把獵物壓進地面（定身 + 易傷），並累積一層鏡爪印記。二階段魔狼落地後再直線衝殺一次。魔狼被打散時只剩箭雨。' },
  };

  BD.registerBoss(kindred);
})(typeof window !== 'undefined' ? window : globalThis);
