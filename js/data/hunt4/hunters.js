'use strict';
// 狩獵模式（4v1）純資料：四位固定獵人與模式規則數值。設計見 docs/hunt4.md。
(function (G) {
  const BD = G.BD;
  // mod：武器的屬性（el / elv）或異常（ail / sv），P5 裝備系統上線前先寫死；items：閃光彈 / 生命粉塵數量
  // 個性（0~1）：risk 冒險、patience 耐心、team 合作、show 求表現、care 照顧隊友、learn 學習速度。P1 先換算成底層 AI 參數，P4 的大腦會直接讀。
  const HUNTERS = [
    { id: 'rin', name: '凜', title: '緋鷹', weapons: ['katana', 'bow'], line: '看穿了。',
      desc: '冷靜的完美主義劍士，把每一次見切當成考試。', color: '#e0465a', color2: '#1a1418', glow: '#ffb3bd',
      persona: { risk: 0.5, patience: 0.8, team: 0.5, show: 0.85, care: 0.3, learn: 0.6 },
      mod: { el: 'thunder', elv: 14 }, items: { flash: 1, dust: 0 } },
    { id: 'mari', name: '茉莉', title: '重鐵', weapons: ['katana', 'hammer'], line: '蓄好了——讓開。',
      desc: '悠哉的怪力姊姊，整場只為了那一刀真蓄力。', color: '#f2c24b', color2: '#3a3226', glow: '#fff0b8',
      persona: { risk: 0.75, patience: 0.95, team: 0.25, show: 0.6, care: 0.3, learn: 0.4 },
      mod: { ail: 'blast', sv: 14 }, items: { flash: 0, dust: 0 } },
    { id: 'yuzu', name: '小柚', title: '疾風', weapons: ['katana', 'lightxbow'], line: '再一下！再一下就好！',
      desc: '停不下來的小隻馬，黏在 Boss 腳邊轉圈。', color: '#ff9a3c', color2: '#2a1d14', glow: '#ffd6a8',
      persona: { risk: 0.95, patience: 0.2, team: 0.45, show: 0.7, care: 0.35, learn: 0.85 },
      mod: { ail: 'poison', sv: 14 }, items: { flash: 1, dust: 0 } },
    { id: 'selena', name: '瑟琳娜', title: '守護', weapons: ['katana', 'horn'], line: '我在，別慌。',
      desc: '隊伍的保母，眼睛永遠在看隊友血條。', color: '#8fc8ff', color2: '#1c2533', glow: '#e6f4ff',
      persona: { risk: 0.25, patience: 0.6, team: 0.95, show: 0.3, care: 0.95, learn: 0.6 },
      mod: { ail: 'paralysis', sv: 12 }, items: { flash: 2, dust: 2 } },
  ];
  BD.HUNT4 = {
    HUNTERS,
    BOSS_HP_MUL: 10, POSTURE_MUL: 4, // Boss 生命 / 架勢放大：含 P2 共通系統、AI 未學習時約 67% 勝率、平均 2 分 20 秒、Boss 被控約 24% 時間（46 場模擬）
    CARTS: 3, REVIVE: 8, TIME_LIMIT: 900, // 共用力竭次數、力竭後幾秒歸隊、時限（遊戲秒）
    AGGRO: { interval: 3, decay: 10, near: 260, stick: 1.3, random: 0.15 }, // 仇恨：重新評估間隔、衰減時間常數、近身加成、維持目標加成、隨機換人機率
    POTION_AT: 0.4, // 生命低於此比例且不是 Boss 目標時喝藥
    WEAPON_NAMES: { greatsword: '大劍', longsword: '太刀', katana: '太刀', sns: '片手劍', dual: '雙刀', hammer: '大錘', horn: '狩獵笛', lance: '長槍', gunlance: '銃槍',
      switchaxe: '斬擊斧', chargeblade: '充能斧', glaive: '操蟲棍', bow: '弓', lightxbow: '輕弩', heavyxbow: '重弩' },
  };
})(typeof window !== 'undefined' ? window : globalThis);
