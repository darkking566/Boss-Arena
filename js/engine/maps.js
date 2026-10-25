'use strict';
// 地圖：每個地形是一張獨立的 6000×3600 地圖（單一生態區）。BD.setMap(id) 就地改寫 BD.ARENA（world.js 等模組持有的是同一個物件），
// 每個 World 建構時依 opts.map 呼叫一次。樹位以固定種子散佈（與 w.rng 無關），避開雙方出生點。不碰 DOM。
(function (G) {
  const BD = G.BD, A = BD.ARENA, W = 6000, H = 3600;
  // colors：選圖卡片的底色漸層；desc：選圖畫面的說明
  BD.MAPS = [
    { id: 'desert', name: '沙漠', icon: '🏜', biome: 'desert', colors: ['#d8bd80', '#b08f58'], desc: '開闊沙地，無遮蔽。招式與奔跑揚起大片沙塵（持續數秒），行走留下淺腳印。' },
    { id: 'forest', name: '森林', icon: '🌲', biome: 'forest', trees: 136, colors: ['#52703c', '#2f4a28'], desc: '林立的大樹是障礙：斬擊把樹砍成兩半、重擊把樹撞成滾木（穿透並傷害敵人）。' },
    { id: 'swamp', name: '沼澤', icon: '🌿', biome: 'swamp', colors: ['#3d4a30', '#1c4247'],
      ponds: [{ x: 420, y: 420, rx: 230, ry: 100 }, { x: 1500, y: 360, rx: 210, ry: 90 }, { x: 2560, y: 500, rx: 250, ry: 110 }, { x: 500, y: 1400, rx: 220, ry: 95 }, { x: 1500, y: 1470, rx: 260, ry: 110 }, { x: 2580, y: 1330, rx: 230, ry: 100 }],
      desc: '散布的水池：水中減速、濺起水花、有角色倒影。' },
    { id: 'wheat', name: '麥田', icon: '🌾', biome: 'wheat', colors: ['#e3b94a', '#9a7a2e'], desc: '高聳的金黃麥田：被斬飛、炸開、踩倒，漫天麥稈麥粒翻飛，風圈讓麥浪外倒。' },
    { id: 'snow', name: '雪地', icon: '❄', biome: 'snow', colors: ['#f2f7fc', '#b4c7da'], desc: '深雪：略微減速、行走留下腳印（久久不散），招式炸開大片雪霧與雪塊。' },
    { id: 'lake', name: '淺水湖泊', icon: '🌊', biome: 'lake', colors: ['#f0c27a', '#33618f'],
      desc: '夕陽下平靜如鏡的淺水：角色與倒影一起戰鬥，攻擊濺起大片水花；火焰蒸發成水氣、熔岩凝固成岩石、冰霜凍結水面、雷電沿水面竄走、毒與血在水中暈開。' },
    { id: 'white', name: '純白', icon: '⬜', biome: 'white', colors: ['#ffffff', '#e8e8e8'], desc: '一片純白的空地，沒有任何互動效果。' },
    { id: 'dark', name: '純黑', icon: '⬛', biome: 'dark', colors: ['#1a1a1a', '#000000'], desc: '一片純黑的空地，沒有互動效果；火焰、雷電、光柱等技能的光源會照亮周圍的地面。' },
  ];
  BD.mapById = {}; for (const m of BD.MAPS) BD.mapById[m.id] = m;
  BD.DEFAULT_MAP = 'desert';

  // 樹位：固定種子 LCG，樹距至少 130，離雙方出生點至少 230
  function scatterTrees(n) {
    const out = [], spawn = [[W / 2 - 350, H / 2], [W / 2 + 350, H / 2]];
    let s = 20240601; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let tries = 0; tries < 6000 && out.length < n; tries++) {
      const x = 70 + rnd() * (W - 140), y = 70 + rnd() * (H - 140);
      if (out.every((t) => Math.hypot(t[0] - x, t[1] - y) > 130) && spawn.every((p) => Math.hypot(p[0] - x, p[1] - y) > 230)) out.push([Math.round(x), Math.round(y)]);
    }
    return out;
  }
  BD.setMap = function (id) {
    const m = BD.mapById[id] || BD.mapById[BD.DEFAULT_MAP];
    A.map = m.id; A.w = W; A.h = H;
    A.biomes = [{ id: m.biome, x0: 0, x1: W }];
    // 水池以 3000×1800 為一格設計，鋪滿 2×2 格（密度與大小不變）
    A.ponds = [];
    for (const ox of [0, 3000]) for (const oy of [0, 1800]) for (const p of m.ponds || []) A.ponds.push(Object.assign({}, p, { x: p.x + ox, y: p.y + oy }));
    A.trees = scatterTrees(m.trees || 0);
    if (BD.WHEAT) BD.WHEAT.update();
    BD.resetArena();
    return m;
  };
})(typeof window !== 'undefined' ? window : globalThis);
