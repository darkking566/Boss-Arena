'use strict';
// Boss 資料：鏡爪（《英雄聯盟》Kindred，永恆獵手）：死亡的雙生——神羊（Lamb）持銀弓遠射、魔狼（Wolf）在她身旁撲殺獵物。
// 招式名取自繁中官網：鏡爪印記（被動）、舞動箭矢（Q）、魔狼狂熱（W）、恐懼蔓延（E）、神羊喘息（R）。
// 魔狼是獨立的戰鬥夥伴（召喚物 wolf，js/engine/minions/kindred.js）：開場就在、自己包夾撲咬、可以被打散後重聚；
// 神羊的招式以 do:'wolf' 下令，魔狼從自己的位置蓄勢撲出（tele 蓄勢、cap 最遠撲距 / len 固定衝殺長度 / through 穿過獵物再衝多遠、r 咬合半徑 / w 衝殺寬度、
// leap 不限距離的躍擊、now 插隊、sync 對齊同一招下一支箭的出手時間）；舞動箭矢的翻滾 do:'tumble' 會滾向與魔狼夾擊獵物的那一側。
// 被動：狀態 hunt（每層 +6% 傷害）；大招 = 原作 R 神羊喘息：狀態 respite（生命不低於 10%，結束回血）。考據見 docs/bosses/kindred.md
(function (G) {
  const BD = G.BD;
  // 對魔狼下令：從狼自己的位置撲向目標（cap 最遠撲距）、咬合半徑 r
  const order = (at, tele, r, dmg, posture, kb, fx, extra) => ({ do: 'wolf', at, tele, cap: 420, r, dmg, posture, kb, fx, ...extra });
  // 魔狼衝殺：從狼的位置朝獵物衝出固定長度 len、寬 w 的直線
  const charge = (at, tele, len, w, dmg, posture, kb) => ({ do: 'wolf', at, tele, len, w, dash: 0.28, dmg, posture, kb, fx: { id: 'wolfcharge', el: 'blood' } });

  // 神羊的單發箭（前兩箭的恐懼蔓延 / 魔狼狂熱期間的掩護射擊）
  const shot = (at, dmg, extra) => ({ do: 'proj', at, n: 1, speed: 1200, r: 11, dmg, posture: 8, kb: 40, life: 0.8, kind: 'arrow', fx: 'lambshot', ...extra });
  // 魔狼狂熱：神羊在獵物腳下劃出獵場，魔狼從自己的位置連撲數口（每口重新瞄準）；撲完順勢滑過獵物再回身，連撲成為來回穿梭的 Z 字；神羊在後方補箭。原作：魔狼在範圍內撲咬
  const frenzy = (r, dps, bites, el, now) => {
    const fx = (id) => (el ? { id, el } : id);
    const out = [{ do: 'tele', at: 0, dur: 0.55, shape: 'circle', r, anchor: 'target', setMark: 'Z', follow: true, lockBefore: 0.25, teleFx: 'wolfpounce' },
      { do: 'zone', at: 0.3, pattern: 'at', r, dur: 0.5 + bites * 0.34, dps, kind: 'frenzy', delay: 0.25 }];
    for (let i = 0; i < bites; i++) {
      const last = i === bites - 1;
      out.push(order(0.1, i ? 0.26 : 0.45, 70, last ? 34 : 22, last ? 10 : 6, last ? 220 : 110, fx(last ? 'wolfmaw' : 'wolfbite'), { rec: 0.06, now: now && !i }));
      if (!last) out.push(shot(0.7 + i * 0.34, 20));
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
    desc: '《英雄聯盟》中死亡的化身，「雖為各自為體，卻從不分離」：神羊的銀弓讓接受命運的人痛快解脫，魔狼追獵那些拒絕面對的人。神羊在遠處翻滾射箭、總是滾向與魔狼夾住獵物的那一側，魔狼則沿著獵物外圍繞到背後包夾撲咬，逃得越遠追得越兇；打散魔狼能換來片刻喘息，但牠總會回到神羊身旁。二階段魔狼的飢餓再也壓不住，身形暴漲、燃起鬼火，箭雨與狼牙一起淹沒整個獵場。',
    color: '#eef2fa', color2: '#1d2233', glow: '#8fe3ff', style: 'kindred',
    radius: 24, maxHp: 1600, speed: 262, turn: 9, mass: 0.8, fxEl: 'shadow', hurt: 'flesh',
    traits: ['wolf'], // 魔狼：開場就在的獨立夥伴（js/engine/minions/kindred.js）
    stamina: { max: 100, regen: 34 }, posture: 100, dodgeCost: 18, dodgeSpeed: 610,
    ai: { prefRange: [190, 430], aggression: 0.55, dodge: 0.55, precision: 0.8, reaction: 0.2, strafe: 0.85, walk: 0.6,
      feint: 0.15, delay: 0.25, retreat: 0.3, punish: 0.7, nervous: 0.05, patience: 0.5,
      // 連段（僅沉重）：一階段 舞箭接恐懼、印記接狂熱、恐懼接夾擊；二階段 舞箭接恐懼、印記接狂熱、恐懼接撕咬、狂熱接樹影
      combos: [
        { id: 'qe', name: '舞箭・恐懼', weight: 1.2, steps: [
          { skill: 'arrows' },
          { skill: 'dread', cancel: 0.3, branch: [
            { when: { landed: true }, do: 'extend' },
            { when: { rolled: true, dist: [100, 520] }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'mf', name: '印記・狂熱', weight: 1.1, steps: [
          { skill: 'mark' },
          { skill: 'frenzy', cancel: 0.35, branch: [
            { when: { landed: true }, do: 'extend' },
            { chance: 0.4, do: 'delay', hold: [0.2, 0.45] },
            { do: 'stop' }] }] },
        { id: 'ep', name: '恐懼・夾擊', phase: 1, weight: 1.2, steps: [
          { skill: 'dread' },
          { skill: 'pincer', cancel: 0.35, branch: [
            { when: { landed: true }, do: 'extend' },
            { do: 'stop' }] }] },
        { id: 'em', name: '恐懼・撕咬', phase: 2, weight: 1.3, steps: [
          { skill: 'dread' },
          { skill: 'maw', cancel: 0.35, branch: [
            { when: { landed: true }, do: 'extend' },
            { when: { rolled: true }, do: 'switch', skill: 'pincer' },
            { do: 'stop' }] }] },
        { id: 'fs', name: '狂熱・樹影', phase: 2, weight: 1.2, steps: [
          { skill: 'frenzy' },
          { skill: 'shadows', cancel: 0.4, branch: [
            { when: { landed: true }, do: 'extend' },
            { do: 'stop' }] }] }] },
    phase2: { speedMul: 1.12, dmgMul: 1.2, cdMul: 0.82, fxEl: 'blood', transFx: { id: 'wolfawaken', el: 'blood' },
      line: '魔狼，這一場是你的饗宴。',
      note: '魔狼的飢餓失控：身形暴漲、燃起鬼火，魔狼狂熱連咬四口、恐懼蔓延的撲擊更重、雙生夾擊穿得更遠；解鎖「魔狼撕咬」「樹影幢幢」；大招的聖域回復更多、魔狼多撲一口' },
    skills: [
      // 舞動箭矢（Q）：神羊往側面翻滾——滾向與魔狼分處獵物兩側的那一邊，形成交叉火網——落地連射三箭（二階段兩輪）；箭會微幅追蹤（原作：自動射向附近的敵人）
      { id: 'arrows', name: '舞動箭矢', short: '舞箭', tags: ['ranged', 'escape'], range: [80, 460], cd: 5.5, cost: 14, track: 7, recovery: 0.35,
        actions: [{ do: 'tumble', at: 0.05, dist: 220, dur: 0.22, iframe: true, fx: 'lambdash' },
          { do: 'proj', at: 0.3, n: 3, spread: 0.22, speed: 950, r: 10, dmg: 32, posture: 10, kb: 70, life: 0.9, homing: 3, kind: 'arrow', fx: 'lambvolley' }],
        actions2: [{ do: 'tumble', at: 0.05, dist: 240, dur: 0.2, iframe: true, fx: 'lambdash' },
          { do: 'proj', at: 0.28, n: 3, spread: 0.22, speed: 1000, r: 10, dmg: 32, posture: 10, kb: 70, life: 0.9, homing: 3, kind: 'arrow', fx: { id: 'lambvolley', el: 'blood' } },
          { do: 'proj', at: 0.5, n: 4, spread: 0.3, speed: 1000, r: 10, dmg: 30, posture: 10, kb: 70, life: 0.9, homing: 3, kind: 'arrow', fx: { id: 'lambvolley', el: 'blood' } }] },
      // 魔狼狂熱（W）：神羊劃出獵場，魔狼從自己的位置連撲（一階段三口），神羊在後方補箭
      { id: 'frenzy', name: '魔狼狂熱', short: '狂熱', tags: ['ranged', 'zone'], range: [120, 520], cd: 11, cost: 20, track: 6, recovery: 0.4,
        actions: frenzy(150, 14, 3),
        actions2: frenzy(170, 18, 4, 'blood') },
      // 恐懼蔓延（E）：兩箭緩速，第三下魔狼從牠所在的位置騰空躍向被緩速的獵物（不限距離，滯空隨距離拉長）
      { id: 'dread', name: '恐懼蔓延', short: '恐懼', tags: ['ranged', 'lock'], range: [100, 520], cd: 9, cost: 16, track: 8, recovery: 0.4,
        actions: [{ do: 'tele', at: 0, dur: 0.3, shape: 'rect', len: 520, w: 30, follow: true },
          shot(0.3, 24, { status: { id: 'slow', dur: 1 } }), shot(0.5, 24, { status: { id: 'slow', dur: 1 } }),
          order(0.6, 0.5, 72, 70, 18, 260, 'wolfmaw', { leap: true, status: { id: 'vulnerable', dur: 3 } })],
        actions2: [{ do: 'tele', at: 0, dur: 0.28, shape: 'rect', len: 560, w: 34, follow: true },
          shot(0.28, 28, { status: { id: 'slow', dur: 1.2 } }), shot(0.46, 28, { status: { id: 'slow', dur: 1.2 } }),
          order(0.55, 0.45, 82, 92, 22, 300, { id: 'wolfmaw', el: 'blood' }, { leap: true, status: { id: 'vulnerable', dur: 3.5 } })] },
      // 雙生夾擊（本作新增，取原作「分立，卻從不分離」）：神羊拉滿銀弓、魔狼在獵物另一側伏低——一箭一狼從兩側同時穿過獵物。
      // 躲法：看兩條預警的交點，往兩條線都不經過的方向走；狼不在場時只剩一箭
      { id: 'pincer', name: '雙生夾擊', short: '夾擊', tags: ['ranged', 'lock'], range: [220, 600], cd: 11, cost: 18, track: 8, recovery: 0.3,
        actions: [{ do: 'tele', at: 0, dur: 0.42, shape: 'rect', len: 660, w: 30, follow: true },
          { do: 'wolf', at: 0, sync: true, through: 150, w: 90, dash: 0.22, dmg: 50, posture: 12, kb: 240, rec: 0.2, now: true, fx: 'wolfcharge' },
          { do: 'proj', at: 0.42, n: 1, speed: 1500, r: 13, dmg: 44, posture: 12, kb: 90, life: 0.6, kind: 'arrow', fx: 'lambshot' }],
        actions2: [{ do: 'tele', at: 0, dur: 0.38, shape: 'rect', len: 700, w: 34, follow: true },
          { do: 'wolf', at: 0, sync: true, through: 180, w: 100, dash: 0.22, dmg: 60, posture: 14, kb: 280, rec: 0.2, now: true, fx: { id: 'wolfcharge', el: 'blood' } },
          { do: 'proj', at: 0.38, n: 1, speed: 1600, r: 14, dmg: 52, posture: 14, kb: 100, life: 0.6, kind: 'arrow', fx: { id: 'lambshot', el: 'blood' } }] },
      // 鏡爪印記・宣告（被動的主動面）：符印落在目標腳下，爆開後累積一層鏡爪印記（每層 +6% 傷害，最多 5 層）
      { id: 'mark', name: '鏡爪印記・宣告', short: '印記', tags: ['ranged', 'zone'], range: [140, 700], cd: 10, cost: 18, track: 7, recovery: 0.5,
        actions: markShot(0.9, 60, 60, 20, 3),
        actions2: markShot(0.8, 66, 68, 24, 3.5) },
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
      // 二階段：樹影幢幢（原作故事〈樹影幢幢的森林〉）——神羊說「開始狩獵吧」，魔狼繞著獵物狂奔一圈、每段路留下一道漆黑殘影，
      // 跑完後殘影從四面八方同時撲向圈心（「他這才發現他早已無處可逃」）。躲法：趁圈還沒合上跑出圈外，或站在兩道殘影之間
      { id: 'shadows', name: '樹影幢幢', short: '殘影', phase: 2, tags: ['ranged', 'aoe'], range: [0, 640], cd: 10, cost: 22, track: 7, recovery: 0.4,
        actions: [{ do: 'wolf', at: 0.1, ring: 210, n: 7, tele: 1.5, w: 56, dmg: 72, posture: 20, kb: 240, rec: 0.35,
          fx: { id: 'wolfcharge', el: 'blood' }, status: { id: 'vulnerable', dur: 3 } }] },
    ],
    // 大招：神羊喘息（原作 R）——神羊腳下展開銀色聖域，期間生命不會低於 10%、結束時回復生命；
    // 同時施展原作最經典的 R + W：魔狼丟下手邊的事，在神羊劃出的獵場裡連撲（一階段四口、二階段五口）。魔狼被打散時只剩聖域
    ultimate: { id: 'ult', name: '神羊喘息', name2: '神羊喘息・饗宴', ult: true, range: [0, 900], track: 0, recovery: 0.6,
      actions: [{ do: 'status', at: 0.15, id: 'respite', dur: 4.5, value: 200, fx: 'lambsanctum' }, ...frenzy(170, 18, 4, null, true)],
      actions2: [{ do: 'status', at: 0.15, id: 'respite', dur: 4.5, value: 260, fx: { id: 'lambsanctum', el: 'blood' } }, ...frenzy(190, 22, 5, 'blood', true)],
      desc: '神羊展開銀色聖域：4.5 秒內生命不會低於 10%，結束時回復生命。同時在獵物腳下劃出獵場，魔狼在場內連撲四口（二階段五口），神羊在後方補箭——想在聖域裡收掉神羊是不可能的，撐過去，或趁魔狼撲咬時拉開距離。' },
  };

  BD.registerBoss(kindred);
})(typeof window !== 'undefined' ? window : globalThis);
