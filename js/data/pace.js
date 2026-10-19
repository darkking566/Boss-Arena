'use strict';
// 節奏預設（純資料）：light＝原版節奏；heavy＝沉重（魂系）。World 未指定 pace 時一律使用 light，確保行為與原版完全一致
(function (G) {
  const BD = G.BD;
  BD.DEFAULT_PACE = 'heavy';           // 預設給 UI / 模擬工具用；World 本身在 opts.pace 省略時為 'light'
  BD.PACES = {
    light: { id: 'light', name: '輕快', desc: '原版節奏：出招頻繁、節奏明快' },
    heavy: {
      id: 'heavy', name: '沉重', desc: '大開大合：蓄力更長、硬直更久、一擊更重',
      enrageAt: 160,
      // 技能時間軸
      teleMul: 1.35, teleAdd: 0.12, bigTeleMul: 1.3, bigDmg: 100, leadIn: 0.08,
      recoveryMul: 1.5, recoveryAdd: 0.2, whiff: 0.5,
      cdMul: 1.45, costMul: 1.35, trackMul: 0.7,
      dmgMul: 1.4, postureMul: 1.2, kbMul: 1.45, aoeMul: 1.12,
      // 能力值
      hpMul: 1.5, ultGainMul: 0.6,
      speedMul: 0.8, turnMul: 0.5, regenMul: 0.9, dodgeCostMul: 1.3,
      accel: 3.2, dodgeDur: 0.62, dodgeCd: 1.0, kbDecay: 4.5,
      hitstop: { minDmg: 40, perDmg: 1 / 40, minF: 2, maxF: 9 },
      knockdown: { dmg: 150, kb: 600, dur: 1.1, guard: 3.0 },
      inputBuffer: 0.45,
      ai: { aggressionMul: 0.8, patienceAdd: 0.2, feintMul: 1.4, gapMul: 1.9, midWait: 0.45, stalk: 0.5,
        // 連段（js/engine/combo.js）：發動機率、減少後的冷卻門檻、取消窗、收招縮短、連段冷卻
        feat: { combo: { rate: 0.55, cdGate: 0.6, cancel: 0.35, cutRec: 0.4, comboCd: 3, staGate: 0.05, costMul: 0.6 },
          // 讀習慣（js/engine/opmodel.js）：記憶秒數、早滾門檻、信心常數、強度倍率、延遲上限、預判維持、誘敵倍率
          habit: { memory: 18, early: 0.4, conf: 3, mul: 1, holdMax: 0.8, leadMax: 0.9, baitMul: 1.0 },
          // 智慧閃避（js/engine/ai.js chooseEscape）：候選數、威脅 / 區域 / 陷阱 / 投射物 / 牆角 / 柱子 / 距離 / 繞後權重、舊方向傾向、抖動
          smartDodge: { n: 12, wThreat: 6, wBig: 3, wZone: 3, wTrap: 2, wProj: 4, wWall: 2.5, wCorner: 2, wPillar: 3, wRange: 0.3, wBehind: 0.6, wLegacy: 0.4, jitter: 0.15 } } },
      // 個別 Boss 覆寫（淺層合併到上面的值；ai 物件另外淺層合併）
      bosses: {
        magmus: { hpMul: 1.55 },                // 熔岩巨像：幾乎不翻滾；體型放大（r58、招式範圍 ×1.4）後更容易打中對手 → 耐久 1.65 → 1.55
        witch: { dmgMul: 1.2 },                 // 冰霜女巫：智慧閃避後勝率偏高 → 微降傷害；絕對零度 / 地雷改為無法閃避後 48 種子 60% → 再降 1.35 → 1.2
        ronin: { dmgMul: 1.19 },                // 影刃武士：輕快模式約 79% 勝率 → 沉重模式壓低單擊傷害（1.15 → 1.12，勝率壓到 56% 以下；呂布加入、魔女調降後 43% → 1.19）
        brood: { dmgMul: 1.62, hpMul: 1.8 },     // 腐沼母巢：傷害多來自召喚物 / 區域（未放大），本體補強；體型放大（r64）更容易被命中 → 傷害 1.6 → 1.62、耐久 1.65 → 1.8
        watcher: { hpMul: 1.72 },               // 深淵監視者：略增耐久（巨像 / 母巢範圍放大後較吃虧 → 1.65 → 1.72）
        lubu: { hpMul: 1.7, dmgMul: 1.45 },     // 呂布：近戰重戟在沉重節奏收招拉長後吃虧 → 補強耐久與傷害
        thor: { hpMul: 1.55, dmgMul: 1.39, bigDmg: 165, recoveryMul: 1.3 }, // 索爾：招式幾乎都是重擊 → 預警全被拉長、收招又長，48 種子 14% → 只對巨擊（原始 165+）額外拉長預警、收招倍率 1.5 → 1.3；基礎 HP / 傷害已為輕快模式上調（2900、×1.1），這裡換算回沉重模式的 HP 4500、傷害 ×1.53
        zed: { hpMul: 1.5, dmgMul: 1.56 },      // 劫：多段小傷害與投射物在沉重節奏預警拉長後吃虧（8 種子 31%）→ 補強耐久與傷害後約 50%（加入風魔手裏劍與千影亂舞後重調為 hpMul 1.5）
        fiora: { hpMul: 1.6, dmgMul: 1.28, ult2Stretch: 1.2 },    // 菲歐拉：細碎快刺在沉重節奏預警拉長後吃虧（8 種子 29%）→ 補強耐久與傷害後約 50%；二階段大招四擊間隔拉長 1.2 倍，避免第三擊落在對手倒地起身的無敵裡
        mihawk: { hpMul: 1.9, dmgMul: 1.4 },    // 鷹眼米霍克：招式預警長、單擊少，沉重節奏下勝率偏低（8 種子 19%）→ 補強耐久與傷害後約 46%
      },
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
