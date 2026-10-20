'use strict';
// Boss 資料：劫（《英雄聯盟》影流之主）：影分身（W）讓諸刃（Q）、鬼斬（E）同步施放，可與影子換位；被動「影忍法・滅魂劫」（Contempt for the Weak）；大招「禁奧義！瞬獄影殺陣」
// 新增招式：風魔手裏劍（迴旋巨型手裏劍，proj.ret）、千影亂舞（shadowstep 連續瞬步斬）
// 影子機制在 js/engine/actions/shadow.js；考據見 docs/bosses/zed.md
(function (G) {
  const BD = G.BD, { D, strike } = BD.DataKit;
  const cone = { shape: 'cone', r: 112, arc: 115 * D };

  // 諸刃：本體一發（tele + proj）+ 每個影子各一發（shadowshuriken）；原作第二發以後命中同一目標只剩 60%，影子那發直接以 60% 傷害表示
  function shuriken(at, tele, dmg, shadowDmg) {
    const p = { speed: 900, r: 17, posture: 16, life: 0.85, pierce: true, kind: 'shuriken' };
    return [
      { do: 'tele', at: at - tele, dur: tele, shape: 'rect', len: 760, w: 42, follow: true },
      Object.assign({ do: 'proj', at, n: 1, dmg }, p),
      Object.assign({ do: 'shadowshuriken', at: at - tele, dur: tele, len: 760, w: 42, dmg: shadowDmg }, p),
    ];
  }
  // 風魔手裏劍：巨型手裏劍飛出 ret 秒後折返飛回本體，去程與回程各命中一次
  function windmill(tele, dmg, speed, ret) {
    return [
      { do: 'tele', at: 0.05, dur: tele, shape: 'rect', len: speed * ret, w: 96, follow: true },
      { do: 'proj', at: 0.05 + tele, n: 1, dmg, speed, r: 44, posture: 26, kb: 140, life: ret * 2 + 1, pierce: true, kind: 'shuriken', ret },
    ];
  }
  // 千影亂舞：依序瞬步到目標周圍各方位，每到一處就是一記快斬，最後在正面落下大迴旋
  function dance(offs, tick, dmg, finalDmg) {
    const out = [];
    offs.forEach((off, i) => {
      const at = 0.1 + tick * i;
      out.push({ do: 'shadowstep', at, off, dist: 75 },
        ...strike(at + 0.2, 0.12, cone, { dmg, posture: 14, kb: 100, fx: 'slash', contempt: true }));
    });
    const at = 0.1 + tick * offs.length;
    out.push({ do: 'shadowstep', at, off: 0, dist: 95 },
      ...strike(at + 0.42, 0.34, { shape: 'circle', r: 160 }, { dmg: finalDmg, posture: 30, kb: 260, fx: 'whirl' }));
    return out;
  }
  // 鬼斬：本體與每個影子同時以自身為中心迴旋一斬；影子命中附帶緩速
  function slash(at, tele, r, dmg) {
    return [
      ...strike(at, tele, { shape: 'circle', r }, { dmg, posture: 22, kb: 160, fx: 'whirl' }),
      { do: 'shadowslash', at: at - tele, dur: tele, r, dmg, posture: 22, kb: 160, status: { id: 'slow', dur: 1.5 } },
    ];
  }

  const zed = {
    id: 'zed', name: '劫', title: '影流之主', archetype: '影分身刺客',
    desc: '影流教派之主。奪走均衡教派禁忌的影之匣後，以影子作為第二具身體：影子會同步擲出諸刃、揮出鬼斬，也能與本體瞬間換位；禁奧義「瞬獄影殺陣」在三秒後引爆期間累積的傷害。',
    color: '#e01e37', color2: '#15161c', glow: '#ff6b7d', style: 'zed',
    radius: 28, maxHp: 2150, speed: 245, turn: 9, mass: 0.85, fxEl: 'umbra', hurt: 'shadow',
    traits: ['contempt'], // 影忍法・滅魂劫（js/engine/actions/shadow.js）
    stamina: { max: 100, regen: 34 }, posture: 105, dodgeCost: 18, dodgeSpeed: 600,
    ai: { prefRange: [110, 320], aggression: 0.68, dodge: 0.6, precision: 0.85, reaction: 0.18, strafe: 0.85, walk: 0.55,
      feint: 0.2, delay: 0.25, retreat: 0.15, punish: 0.85, nervous: 0.05, patience: 0.5, read: 0.7,
      // 連段（僅沉重）：W 進場接 E、普攻接 Q、E 接普攻、三角殺陣收尾
      combos: [
        { id: 'we', name: '分身・鬼斬', weight: 1.3, steps: [
          { skill: 'living_shadow' },
          { skill: 'shadow_slash', cancel: 0.35, branch: [
            { when: { dist: [0, 150] }, do: 'extend' },
            { when: { dist: [140, 720] }, do: 'switch', skill: 'razor_shuriken' },
            { do: 'stop' }] }] },
        { id: 'aaq', name: '腕刃・諸刃', steps: [
          { skill: 'blade_flurry' },
          { skill: 'razor_shuriken', cancel: 0.3, branch: [
            { when: { rolled: true, dist: [140, 720] }, do: 'extend' },
            { when: { dist: [0, 150] }, do: 'switch', skill: 'shadow_slash' },
            { do: 'stop' }] }] },
        { id: 'eaa', name: '鬼斬・腕刃', steps: [
          { skill: 'shadow_slash' },
          { skill: 'blade_flurry', cancel: 0.3, branch: [
            { when: { landed: true, dist: [0, 120] }, do: 'extend' },
            { when: { rolled: true, dist: [160, 560] }, chance: 0.6, do: 'switch', skill: 'living_shadow' },
            { do: 'stop' }] }] },
        { id: 'tri', name: '三角殺陣・追擊', phase: 2, weight: 1.3, steps: [
          { skill: 'shadow_triangle' },
          { skill: 'blade_flurry', cancel: 0.35, branch: [
            { when: { dist: [0, 120] }, do: 'extend' },
            { when: { dist: [140, 720] }, do: 'switch', skill: 'razor_shuriken' },
            { do: 'stop' }] }] },
      ] },
    phase2: { speedMul: 1.12, dmgMul: 1.15, cdMul: 0.8, fxEl: 'umbra', transFx: { id: 'shadowrise', el: 'umbra' },
      line: '看不見的刀刃，才是最致命的。',
      note: '影之匣的力量完全解放：影子存在更久、影子諸刃傷害提高、分身換位後追加鬼斬、鬼斬範圍擴大；滅魂劫提升為 8% 最大生命；解鎖「影奧義！三角殺陣」；瞬獄影殺陣引爆比例 45% → 60%，並在結束時換回影子位置' },
    skills: [
      { id: 'razor_shuriken', name: '影奧義！諸刃', short: '諸刃', tags: ['ranged', 'fast'], range: [140, 720], cd: 3.6, cost: 14, track: 8, recovery: 0.35,
        actions: shuriken(0.36, 0.34, 56, 34),
        actions2: shuriken(0.34, 0.32, 60, 48) },
      // 原作 W：影子衝出 → 再施放換位；改編為換位後立即一記腕刃
      { id: 'living_shadow', name: '影奧義！分身', short: '分身', tags: ['gap'], range: [160, 560], cd: 6.5, cost: 18, track: 9, recovery: 0.45,
        actions: [{ do: 'shadow', at: 0.12, to: 'target', dist: 420, life: 4.5 }, { do: 'swap', at: 0.42 },
          ...strike(0.72, 0.28, cone, { dmg: 85, posture: 30, kb: 220, fx: 'slash', contempt: true })],
        actions2: [{ do: 'shadow', at: 0.12, to: 'target', dist: 440, life: 6.5 }, { do: 'swap', at: 0.4 },
          ...slash(0.68, 0.26, 150, 80)] },
      { id: 'shadow_slash', name: '影奧義！鬼斬', short: '鬼斬', tags: ['melee', 'aoe', 'fast'], range: [0, 150], cd: 3.2, cost: 16, track: 6, recovery: 0.4,
        actions: slash(0.32, 0.26, 135, 75),
        actions2: slash(0.3, 0.24, 150, 78) },
      // 普攻（腕刃）＋被動「影忍法・滅魂劫」（Contempt for the Weak）
      { id: 'blade_flurry', name: '腕刃連擊', short: '腕刃', tags: ['melee', 'fast'], range: [0, 115], cd: 2.2, cost: 14, track: 9, creep: 0.3, recovery: 0.4,
        actions: [...strike(0.24, 0.2, cone, { dmg: 45, posture: 14, kb: 90, fx: 'slash', contempt: true }),
          ...strike(0.5, 0.2, cone, { dmg: 50, posture: 16, kb: 160, fx: 'slash', contempt: true })] },
      // 原作經典連招 W → E → Q：影子貼近目標先鬼斬，接著本體與影子一齊擲出諸刃
      { id: 'shadow_combo', name: '影流連殺', short: '連殺', tags: ['gap'], range: [180, 480], cd: 9, cost: 26, track: 8, recovery: 0.55,
        actions: [{ do: 'shadow', at: 0.1, to: 'target', dist: 400, life: 4.5 }, { do: 'shadowslash', at: 0.22, dur: 0.3, r: 135, dmg: 75, posture: 22, kb: 160, status: { id: 'slow', dur: 1.5 } },
          ...shuriken(0.9, 0.34, 56, 34)],
        actions2: [{ do: 'shadow', at: 0.1, to: 'target', dist: 420, life: 6.5 }, { do: 'shadowslash', at: 0.2, dur: 0.28, r: 150, dmg: 78, posture: 22, kb: 160, status: { id: 'slow', dur: 1.5 } },
          ...shuriken(0.82, 0.32, 60, 48)] },
      // 原作逃脫手法：影子往後放、鬼斬後換位拉開距離，再從遠處補諸刃
      { id: 'shadow_retreat', name: '影遁', short: '影遁', tags: ['escape'], range: [0, 200], cd: 11, cost: 15, recovery: 0.35,
        actions: [{ do: 'shadow', at: 0.1, to: 'away', dist: 340, life: 4 }, ...slash(0.36, 0.24, 135, 60), { do: 'swap', at: 0.55 },
          ...shuriken(0.95, 0.3, 60, 36)] },
      // 改編：巨型風魔手裏劍（劫的招牌武器）——飛出後折返，去程與回程都會命中
      { id: 'windmill', name: '影奧義！風魔手裏劍', short: '風魔', tags: ['ranged'], range: [160, 600], cd: 9, cost: 24, track: 8, recovery: 0.7,
        actions: windmill(0.7, 66, 640, 0.8),
        actions2: windmill(0.6, 72, 720, 0.85) },
      // 改編：連續瞬步到目標四周，每到一處就是一記快斬，最後落下大迴旋（殘影相接的華麗連段）
      { id: 'shadow_dance', name: '影奧義！千影亂舞', short: '亂舞', tags: ['gap', 'melee'], range: [100, 420], cd: 12, cost: 30, track: 6, recovery: 0.7,
        actions: dance([2.2, -2.2, Math.PI, 1.0], 0.36, 42, 95),
        actions2: dance([2.2, -2.2, Math.PI, 1.0, -1.0], 0.32, 45, 105) },
      // 改編：W 影與 R 影把目標夾在三角形中央——三把諸刃交會，再換位到影子身邊鬼斬
      { id: 'shadow_triangle', name: '影奧義！三角殺陣', short: '三角', phase: 2, tags: ['ranged', 'gap'], range: [160, 520], cd: 10, cost: 28, track: 6, recovery: 0.6,
        actions: [{ do: 'shadow', at: 0.12, to: 'flank', n: 2, dist: 230, life: 4.5 },
          ...shuriken(0.75, 0.4, 66, 58), { do: 'swap', at: 1.0 }, ...slash(1.3, 0.26, 150, 78)] },
    ],
    ultimate: { id: 'ult', name: '禁奧義！瞬獄影殺陣', ult: true, range: [0, 700], track: 0, recovery: 0.6,
      // 原作 R：留下影子、化為無法被選取的暗影突進到目標身後並刻下死亡印記；三秒後引爆，追加期間所受傷害的一定比例
      actions: [{ do: 'shadow', at: 0.05, to: 'self', life: 6 }, { do: 'hide', at: 0.1, fx: { id: 'vanish', el: 'umbra' } },
        { do: 'appear', at: 0.55, dist: 55 }, { do: 'status', at: 0.56, id: 'deathmark', dur: 3, value: 90, target: 'enemy' },
        ...slash(0.95, 0.3, 135, 70), ...shuriken(1.4, 0.3, 66, 40),
        ...strike(1.75, 0.2, cone, { dmg: 55, posture: 16, kb: 120, fx: 'slash', contempt: true })],
      actions2: [{ do: 'shadow', at: 0.05, to: 'self', life: 6 }, { do: 'hide', at: 0.1, fx: { id: 'vanish', el: 'umbra' } },
        { do: 'appear', at: 0.5, dist: 55 }, { do: 'status', at: 0.51, id: 'deathmark', dur: 3, value: 120, target: 'enemy' },
        ...slash(0.88, 0.28, 150, 75), ...shuriken(1.3, 0.28, 70, 50),
        ...strike(1.65, 0.2, cone, { dmg: 60, posture: 18, kb: 140, fx: 'slash', contempt: true }), { do: 'swap', at: 2.05 }],
      desc: '留下一道影子後化為暗影（無法被選取）突進到目標身後，刻下死亡印記並連續鬼斬、諸刃、腕刃；印記在 3 秒後引爆，造成固定傷害加上期間所受傷害的 45%（二階段 60%，並在結束時換回影子位置）。' },
  };

  BD.registerBoss(zed);
})(typeof window !== 'undefined' ? window : globalThis);
