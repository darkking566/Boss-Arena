'use strict';
// 訓練假人（木樁）：純資料
(function (G) {
  const BD = G.BD;
  BD.registerBoss({
    id: 'dummy', name: '訓練假人', title: '木樁', archetype: '訓練用標靶', desc: '站著不動、不會反擊也不會倒下的木製假人，用來測試招式。',
    hidden: true, training: true, dummy: true,
    color: '#c89a5a', color2: '#5a3a1e', glow: '#ffe2a8', style: 'dummy',
    radius: 38, maxHp: 10000, speed: 240, turn: 6, mass: 2.2, fxEl: 'physical', hurt: 'straw',
    stamina: { max: 100, regen: 20 }, posture: 200, dodgeCost: 999, dodgeSpeed: 300,
    traits: [], ai: {},
    phase2: { speedMul: 1, dmgMul: 1, cdMul: 1, line: '', note: '' },
    skills: [],
    ultimate: { id: 'ult', name: '—', ult: true, range: [0, 0], actions: [], desc: '' },
  });
})(typeof window !== 'undefined' ? window : globalThis);
