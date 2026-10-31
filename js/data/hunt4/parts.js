'use strict';
// 狩獵模式（4v1）純資料：部位 / 肉質 / 屬性弱點、傷口、怯 / 暈眩 / 疲勞、異常狀態、銳利度、各武器的狩獵屬性。數值設計見 docs/hunt4.md §4。
(function (G) {
  const BD = G.BD, H4 = BD.HUNT4, { D } = BD.DataKit;
  const hit = (at, shape, p) => Object.assign({ do: 'hit', at }, shape, p);
  const cone = (r, arcDeg) => ({ shape: 'cone', r, arc: arcDeg * D });

  // 部位由「攻擊者在 Boss 面向的哪一側」決定：front 為與面向夾角上限（度）。肉質 0.5 = 傷害 ×1。
  // brk：破壞耐久（Boss 最大生命的比例，0 = 不可破壞）；el：屬性傷害倍率
  H4.PARTS = [
    { id: 'head', name: '頭', front: 45, hz: { cut: 0.65, blunt: 0.75, shot: 0.55 }, el: 1.0, brk: 0.08 },
    { id: 'legs', name: '腳', front: 100, hz: { cut: 0.5, blunt: 0.5, shot: 0.45 }, el: 0.8, brk: 0.1 },
    { id: 'body', name: '身', front: 145, hz: { cut: 0.42, blunt: 0.45, shot: 0.4 }, el: 0.7, brk: 0 },
    { id: 'tail', name: '尾', front: 180, hz: { cut: 0.6, blunt: 0.4, shot: 0.5 }, el: 0.9, brk: 0.08 },
  ];
  H4.ELEMENTS = { fire: { name: '火', color: '#ff7a3a' }, water: { name: '水', color: '#4ab0ff' }, thunder: { name: '雷', color: '#ffe14a' },
    ice: { name: '冰', color: '#a8ecff' }, dragon: { name: '龍', color: '#c04a6a' } };
  // 各 Boss 覆寫：hz 為部位肉質（淺層合併到預設），weak 為屬性倍率（未列 = 1）
  H4.BOSS_PARTS = {
    magmus: { hz: { body: { cut: 0.3, blunt: 0.45, shot: 0.25 } }, weak: { water: 1.6, ice: 1.3, fire: 0.2 } },
    witch: { weak: { fire: 1.5, ice: 0.2 } },
    brood: { hz: { body: { cut: 0.55, blunt: 0.5, shot: 0.55 } }, weak: { fire: 1.5, ice: 0.6 } },
    thor: { hz: { head: { cut: 0.5, blunt: 0.6, shot: 0.45 } }, weak: { thunder: 0.2, ice: 1.3 } },
    zeus: { weak: { thunder: 0.4, dragon: 1.3 } },
    poseidon: { weak: { thunder: 1.5, water: 0.2 } },
    deviljho: { hz: { head: { cut: 0.7, blunt: 0.8, shot: 0.6 } }, weak: { dragon: 1.5, thunder: 1.2, fire: 0.7 } },
    watcher: { weak: { dragon: 1.3, fire: 0.6 } },
    treesentinel: { hz: { body: { cut: 0.32, blunt: 0.4, shot: 0.3 } }, weak: { fire: 1.3, thunder: 1.2 } },
  };

  // 傷口：部位累積傷害達最大生命 at 比例就開傷口，life 秒後自然閉合；集中弱點攻擊打破 → 額外傷害 + 必定怯、該部位 scar 秒內不再開
  H4.WOUND = { at: 0.035, life: 60, scar: 40, hz: 0.1, popDmg: 160, popPosture: 40 };
  // 怯：累積傷害達最大生命 at 比例 → 硬直 dur 秒，每次門檻 ×grow；暈眩：打擊打頭累積；倒地：架勢崩潰改為倒地 dur 秒、之後架勢上限 ×grow
  H4.FLINCH = { at: 0.06, dur: 0.7, grow: 1.3 };
  H4.STUN = { at: 0.05, dur: 4, grow: 1.5 };
  H4.TOPPLE = { dur: 3.5, grow: 1.5 };
  H4.FATIGUE = { every: 150, dur: 25 }; // 每 every 秒進入 dur 秒疲勞（變慢、傷害降低）
  // 異常：每次命中 rate 機率累積 sv，滿 at 觸發，之後門檻 +grow
  H4.AILMENTS = {
    poison: { name: '毒', color: '#b86bff', at: 180, grow: 80, dur: 25, dps: 0.0025 }, // dps：每秒最大生命比例
    paralysis: { name: '麻痺', color: '#ffe14a', at: 200, grow: 100, dur: 4 },
    sleep: { name: '睡眠', color: '#8fb8ff', at: 220, grow: 110, dur: 12, wakeMul: 2 },
    blast: { name: '爆破', color: '#ff9a3c', at: 120, grow: 60, dmg: 90, hp: 0.012 },
  };
  H4.AILMENT_RATE = 0.33;
  // 銳利度：依剩餘比例分段（從高到低），mul 為傷害倍率；低於 bounceBelow 段打到肉質 < bounceHz 會被彈開
  H4.SHARP = { bands: [{ at: 0.75, name: '白', color: '#f4f4f4', mul: 1.25 }, { at: 0.45, name: '藍', color: '#3a8bff', mul: 1.15 },
    { at: 0.25, name: '綠', color: '#5fd47a', mul: 1.05 }, { at: 0.1, name: '黃', color: '#ffe14a', mul: 1 }, { at: 0, name: '橙', color: '#ff8a3a', mul: 0.8 }],
  bounceFrom: 3, bounceHz: 0.45, hardCost: 2, whetAt: 0.3, whetTime: 1.6 };
  H4.ITEMS = { flashDur: 2.6, flashFade: 0.6, dustHeal: 0.3, dustR: 500 };

  // 各武器的狩獵屬性：dtype 傷害類型、sharp 銳利度上限（命中次數；遠程為 0）、focus 集中弱點攻擊（打破傷口）
  H4.WEAPON_SPECS = {
    katana: { dtype: 'cut', sharp: 150,
      focus: { id: 'h4_focus_katana', name: '穿傷・居合突', short: '穿傷', tags: ['melee'], range: [0, 200], cd: 6, cost: 0, track: 9, recovery: 0.45,
        actions: [hit(0.3, cone(200, 40), { dmg: 70, posture: 30, kb: 120, focus: true, fx: { id: 'thrust', scale: 1.2 } })] } },
    bow: { dtype: 'shot', sharp: 0 },
    lightxbow: { dtype: 'shot', sharp: 0 },
  };
})(typeof window !== 'undefined' ? window : globalThis);
