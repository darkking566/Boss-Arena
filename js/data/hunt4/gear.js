'use strict';
// 狩獵模式（4v1）裝備純資料：素材、Boss 武器（屬性 / 異常 + 武器特性）、防具（頭 / 身 / 腳，各帶該 Boss 的技能）、套裝效果、製作花費。設計見 docs/hunt4.md §8。
// aff：個性偏好權重（AI 配裝 / 製作時 Σ 權重 × 個性值）
(function (G) {
  const BD = G.BD, H4 = BD.HUNT4;

  H4.MATS = { s: '鱗', p: '部位素材', g: '寶玉' };
  // 武器特性：每把 Boss 武器一個，改變打法
  H4.WTRAITS = {
    magma: { name: '熔火', desc: '打在有傷口或已破壞的部位傷害 +15%', aff: { risk: 1 } },
    sharp: { name: '斬鐵', desc: '銳利度消耗減半', aff: { patience: 1 } },
    swallow: { name: '燕返', desc: '相殺 / 完美防禦 / 彈刀 / 見切成功後，下一擊傷害 +40%', aff: { show: 1.2 } },
    leech: { name: '血契', desc: '造成傷害的 2% 回復生命', aff: { risk: 0.6, care: 0.4 } },
    exploit: { name: '狩影', desc: 'Boss 硬直 / 暈眩 / 倒地時傷害 +20%', aff: { patience: 0.8, show: 0.4 } },
    siege: { name: '破城', desc: '架勢傷害 +30%（更容易打倒 Boss）', aff: { risk: 0.5, patience: 0.5 } },
    chain: { name: '連鎖雷', desc: '打破傷口時，雷電跳到另一個傷口一併打破（傷害減半）', aff: { show: 1 } },
    gorge: { name: '暴食', desc: '打破傷口回復 8% 生命，但銳利度消耗加倍', aff: { risk: 1.2 } },
  };
  // 防具技能：每件防具給 1~2 級（= 防具等級），同技能可疊，上限 3 級
  H4.SKILLS = {
    guard: { name: '耐震', desc: '受到傷害 −6% / 級', aff: { care: 1, risk: -0.5 } },
    evade: { name: '迴避性能', desc: '翻滾無敵時間 +0.08 秒 / 級', aff: { risk: 0.6, learn: 0.4 } },
    offguard: { name: '攻擊守勢', desc: '相殺 / 完美防禦 / 彈刀 / 見切後 8 秒內傷害 +8% / 級', aff: { care: 0.5, show: 0.5 } },
    weakex: { name: '弱點特效', desc: '打在軟肉（肉質 ≥0.6）或傷口上傷害 +6% / 級', aff: { show: 0.6, patience: 0.4 } },
    combo: { name: '看破', desc: '連續命中（1.2 秒內）每段 +2% / 級，最多 5 段', aff: { risk: 0.8 } },
    challenger: { name: '挑戰者', desc: 'Boss 進入二階段後傷害 +8% / 級', aff: { risk: 0.6, show: 0.4 } },
    adversity: { name: '逆境', desc: '隊伍每力竭一次傷害 +8% / 級（最多算 2 次）', aff: { team: 0.5, risk: 0.5 } },
  };
  // 套裝：頭 / 身 / 腳都是同一位 Boss 的防具時發動
  H4.SETS = {
    berserk: { name: '狂戰之血', desc: '生命低於 40% 時傷害 +25%', aff: { risk: 1.2 } },
    timegap: { name: '時之隙', desc: '完美閃避後 Boss 減速 1.5 秒', aff: { show: 1 } },
    guardian: { name: '守護靈光', desc: '自己與 400 範圍內的隊友受到傷害 −10%', aff: { team: 1, care: 0.5 } },
    undying: { name: '不死之身', desc: '每場一次：致命傷改為剩 1 點生命', aff: { care: 0.5, team: 0.5 } },
    storm: { name: '雷神之怒', desc: '每命中 15 次落雷追加 150 傷害', aff: { show: 0.6, risk: 0.4 } },
  };
  // 每位 Boss 的裝備主題：屬性（el）或異常（ail），都沒有 = 無屬性（攻擊額外 +6%）；武器特性、防具技能、套裝
  const T = (el, wt, sk, set) => ({ [el && H4.AILMENTS[el] ? 'ail' : 'el']: el, wt, sk, set });
  H4.BOSS_GEAR = {
    borealis: T('ice', 'siege', 'guard', 'timegap'), // 冰龍；凍傷另走專屬狀態，裝備沿用本模式冰屬性
    godskinduo: T(null, 'sharp', 'evade', 'undying'), // 神皮雙人組；黑焰是持續傷害，不當作本模式的屬性
    agheel: T('fire', 'siege', 'guard', 'berserk'), // 原作龍焰（火）
    ekzykes: T(null, 'siege', 'guard', 'guardian'), // 猩紅腐敗另有狀態規則，不誤標成本模式的綠毒屬性
    fallingstar: T(null, 'siege', 'guard', 'berserk'), // 重力不是本模式的五行屬性；尾刺出血另由狀態處理
    redwolf: T(null, 'sharp', 'evade', 'timegap'), // 原作沒有本模式的五行屬性；裝備採機動 / 利刃主題
    magmus: T('fire', 'magma', 'guard', 'berserk'), witch: T('ice', 'sharp', 'evade', 'timegap'), ronin: T('paralysis', 'swallow', 'offguard', 'timegap'),
    brood: T('poison', 'leech', 'weakex', 'guardian'), watcher: T('dragon', 'exploit', 'combo', 'berserk'), lubu: T('blast', 'siege', 'challenger', 'berserk'),
    gundyr: T('paralysis', 'siege', 'guard', 'undying'), thor: T('thunder', 'chain', 'challenger', 'storm'), zed: T('dragon', 'exploit', 'combo', 'timegap'),
    fiora: T('thunder', 'swallow', 'offguard', 'timegap'), mihawk: T(null, 'sharp', 'combo', 'berserk'), adam: T('thunder', 'swallow', 'combo', 'timegap'),
    zeus: T('thunder', 'chain', 'challenger', 'storm'), yujiro: T(null, 'siege', 'adversity', 'undying'), itachi: T('fire', 'exploit', 'evade', 'timegap'),
    deviljho: T('dragon', 'gorge', 'adversity', 'berserk'), kojiro: T(null, 'swallow', 'evade', 'timegap'), poseidon: T('water', 'leech', 'guard', 'guardian'),
    kindred: T('dragon', 'exploit', 'weakex', 'undying'), yasuo: T(null, 'sharp', 'evade', 'storm'), treesentinel: T('sleep', 'siege', 'guard', 'guardian'),
    margit: T('thunder', 'exploit', 'offguard', 'undying'), godrick: T('fire', 'gorge', 'adversity', 'berserk'),
  };
  H4.SLOTS = { head: '頭', body: '身', legs: '腳' };
  // 製作 / 強化花費（該 Boss 的素材，數字為到達該等級的花費）；武器 1~3 級、防具 1~2 級
  H4.COST = { w: [null, { s: 4 }, { s: 6, p: 2 }, { s: 8, p: 3, g: 1 }], a: [null, { s: 3 }, { s: 5, p: 2 }] };
  // 武器等級效果：攻擊 +5% / 級（無屬性再 +6%）、屬性 / 異常值 10 + 4 / 級、銳利度上限 +10% / 級
  H4.WPN = { atk: 0.05, raw: 0.06, elv: 10, elvPer: 4, sharp: 0.1 };
  // 掉落（每位獵人各自拿）：勝利 s 2~3、每個破壞部位 p 1、寶玉 g 機率 6% + 4% × 破壞數；失敗沒有
  H4.DROP = { s: 2, sExtra: 0.5, gBase: 0.06, gPerBreak: 0.04 };
  H4.CRAFTS_PER_MATCH = 1; // 每場最多做 / 強化一件，而且只做比手上更好的（見 engine/hunt4/gear.js end）
})(typeof window !== 'undefined' ? window : globalThis);
