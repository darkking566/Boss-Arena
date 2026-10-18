'use strict';
// 場景互動：樹（斬擊砍成兩半、重擊撞飛成滾木）與沼澤水域（減速、濺水）。
// 只改戰鬥狀態並呼叫 BD.spawnFx；不碰 DOM / Canvas，沒有任何亂數（視覺碎片由 js/fx/terrain.js 以 BD.vrng 產生）。
(function (G) {
  const BD = G.BD, U = BD.U;
  const A = () => BD.ARENA;
  const TREE_R = 32, TREE_HP = 60, LOG_SPEED = 720, WATER_SLOW = 0.78, SNOW_SLOW = 0.9, LAKE_SLOW = 0.92;
  // 麥田格網：每格 40px 一叢麥；被招式 / 踩踏摧毀的格子記在 fx.field（純視覺狀態，不影響戰鬥）。非麥田地圖時範圍為空
  const CELL = 40;
  const WHEAT = BD.WHEAT = { cell: CELL, cols: 0, x0: 0, x1: 0, y0: 0, y1: 0,
    idx: (x, y) => Math.floor(y / CELL) * WHEAT.cols + Math.floor(x / CELL), cx: (i) => (i % WHEAT.cols + 0.5) * CELL, cy: (i) => (Math.floor(i / WHEAT.cols) + 0.5) * CELL,
    update() { const a = A(), on = a.biomes[0].id === 'wheat'; this.cols = Math.ceil(a.w / CELL); this.x0 = this.y0 = on ? CELL : 0; this.x1 = on ? a.w - CELL : 0; this.y1 = on ? a.h - CELL : 0; } };
  const inWheat = (x, y) => x >= WHEAT.x0 && x < WHEAT.x1 && y >= WHEAT.y0 && y < WHEAT.y1;

  BD.biomeAt = (x) => A().biomes.find((b) => x < b.x1) || A().biomes[A().biomes.length - 1];

  // 每場戰鬥開始（與訓練場重置）時依 ARENA.trees 重建存活的樹；pillars 其他程式（AI、投射物、碰撞）照舊讀取
  BD.resetArena = function () {
    A().pillars = A().trees.map((t, i) => ({ x: t[0], y: t[1], r: TREE_R, hp: TREE_HP, max: TREE_HP, tree: true, v: i % 3 }));
  };
  BD.setMap(BD.DEFAULT_MAP);

  const pondAt = (x, y) => A().ponds.find((p) => ((x - p.x) / p.rx) ** 2 + ((y - p.y) / p.ry) ** 2 < 1) || null;
  BD.pondAt = pondAt;
  const isLake = () => A().biomes[0].id === 'lake';
  BD.inWater = (x, y) => isLake() || !!pondAt(x, y); // 淺水湖泊整張圖都是水面
  BD.terrainSpeedMul = (u) => (pondAt(u.x, u.y) ? WATER_SLOW : isLake() ? LAKE_SLOW : BD.biomeAt(u.x).id === 'snow' ? SNOW_SLOW : 1);

  // 招式的特效分類決定怎麼動場景：斬擊 → 砍（樹受傷害加倍）、其餘有擊退的重擊 → 撞飛、輕擊 → 只掉血
  function classify(p) {
    const P = p.fx && BD.parseFx(p.fx), e = P && BD.effects[P.id];
    if (e && e.category === '斬擊') return 'cut';
    return (p.kb || 0) >= 150 ? 'smash' : 'chip';
  }
  function removeTree(t) { const a = A().pillars, i = a.indexOf(t); if (i >= 0) a.splice(i, 1); }
  function hurtTree(w, t, dmg, ang) {
    t.hp -= dmg;
    if (t.hp <= 0) { removeTree(t); BD.spawnFx(w, 'treecut', t.x, t.y, { angle: ang, r: t.r }); } else BD.spawnFx(w, 'treehit', t.x, t.y, { angle: ang });
  }
  // 撞飛：樹變成沿衝擊方向飛行的滾木（穿透、對敵方造成傷害與擊退，撞牆 / 撞別棵樹就停）
  function launchTree(w, src, t, ang, dmg) {
    removeTree(t);
    w.projectiles.push({ team: src.team, owner: src, x: t.x, y: t.y, vx: Math.cos(ang) * LOG_SPEED, vy: Math.sin(ang) * LOG_SPEED, r: t.r,
      dmg: 25 + dmg * 0.4, posture: 18, kb: 260, life: 0.6, homing: 0, pierce: true, kind: 'log', hitSet: new Set(), t: 0, alive: true, ret: 0, back: false });
    BD.spawnFx(w, 'treesmash', t.x, t.y, { angle: ang, r: t.r });
  }

  // 招式命中場景（由 hit / slashes / 爆炸 呼叫）；src 非 Boss（召喚物、陷阱）或持續傷害不動場景
  BD.hitProps = function (w, src, shape, p) {
    if (!src || !src.isBoss || p.dot || shape.kind === 'except') return;
    const cls = classify(p), dmg = p.dmg || 0;
    for (const t of A().pillars.slice()) {
      if (!t.tree || !U.hitShape(shape, t)) continue;
      const radial = Math.atan2(t.y - shape.y, t.x - shape.x);
      if (cls === 'smash') launchTree(w, src, t, radial, dmg);
      else hurtTree(w, t, cls === 'cut' ? dmg * 2 : dmg * 0.5, cls === 'cut' && shape.ang != null && (shape.kind === 'rect' || shape.kind === 'cone') ? shape.ang : radial);
    }
    const c = BD.K.shapeCenter(shape), line = shape.kind === 'rect' || shape.kind === 'cone', k = U.clamp(dmg / 70, 0.7, 2.2);
    // 長條斬擊沿刃長在三處濺起 / 揚起，其餘（砸地、爆炸）在中心
    const pts = shape.kind === 'rect' ? [0.2, 0.5, 0.8].map((f) => ({ x: shape.x + Math.cos(shape.ang) * shape.len * f, y: shape.y + Math.sin(shape.ang) * shape.len * f })) : [c];
    if (isLake()) { // 淺水湖泊：大片水花，並依招式元素與水面起反應（js/fx/terrain.js 的 lakesplash）
      const P = p.fx && BD.parseFx(p.fx), base = BD.fxElementOf(src), el = p.fxEl || (P && P.opts.el) || (p.kind ? BD.kindElement(p.kind, base) : base);
      for (const q of pts) BD.spawnFx(w, 'lakesplash', q.x, q.y, { scale: k * (pts.length > 1 ? 0.75 : 1), angle: shape.ang, dir: line, el, dmg, zoneR: p.zone && p.zone.r });
    } else if (pondAt(c.x, c.y)) BD.spawnFx(w, 'splash', c.x, c.y, { scale: k, angle: shape.ang, dir: line });
    // 沙漠 / 雪地：沿招式方向揚起沙塵 / 雪霧
    for (const q of pts) { const fxId = DUST[BD.biomeAt(q.x).id]; if (fxId) BD.spawnFx(w, fxId, q.x, q.y, { scale: k * (pts.length > 1 ? 0.7 : 1), angle: shape.ang, dir: line }); }
    // 麥田：被命中的麥叢整片摧毀（斬擊 → 兩側削飛、重擊 → 炸開、輕擊 → 削掉）
    const reach = shape.kind === 'rect' ? shape.len / 2 + shape.w : shape.r || 150, cells = [], field = w.fx.field;
    for (let y = Math.max(WHEAT.y0, c.y - reach); y < Math.min(WHEAT.y1, c.y + reach); y += CELL) {
      for (let x = Math.max(WHEAT.x0, c.x - reach); x < Math.min(WHEAT.x1, c.x + reach); x += CELL) {
        const i = WHEAT.idx(x, y);
        if (!field[i] && U.hitShape(shape, { x: WHEAT.cx(i), y: WHEAT.cy(i), r: CELL * 0.5 })) cells.push(i);
      }
    }
    if (cells.length) BD.spawnFx(w, 'wheatburst', c.x, c.y, { cells, mode: cls === 'smash' ? 'blast' : 'cut', angle: shape.ang, dirless: shape.ang == null, radius: reach, dmg });
  };
  const DUST = { desert: 'sanddust', snow: 'snowburst' };
  // 投射物撞樹：掉血（滾木撞樹力道大）；呼叫端已讓投射物消失
  BD.projHitsTree = function (w, p, t) {
    hurtTree(w, t, p.kind === 'log' ? TREE_HP : p.dmg * 0.5, Math.atan2(p.vy, p.vx));
  };

  // 角色在水中 / 沙漠中移動時，腳邊持續濺起漣漪 / 揚起沙塵（純視覺）
  BD.updateTerrain = function (w, dt) {
    for (const b of w.bosses) {
      b.wetT = (b.wetT || 0) - dt;
      const sp = Math.hypot(b.vx + b.kbx, b.vy + b.kby), bio = BD.biomeAt(b.x).id;
      if (b.state === 'dead') continue;
      if (bio === 'lake' && sp < 40) { // 站著不動時腳下仍緩緩盪出漣漪
        b.idleT = (b.idleT || 0) - dt;
        if (b.idleT <= 0) { b.idleT = 0.9; w.fx.ring(b.x, b.y + b.r * 0.4, b.r * 0.6, b.r * 2.2, 1.3, '#d7f3f6', 1.6); }
      }
      if (sp < 40) continue;
      const ang = Math.atan2(b.vy + b.kby, b.vx + b.kbx);
      if (bio === 'snow' || bio === 'desert') { // 腳印：每走一個步幅左右交替留下一個
        b.stepD = (b.stepD || 0) + sp * dt;
        if (b.stepD >= U.clamp(b.r * 1.5, 30, 80)) {
          b.stepD = 0; b.stepSide = -(b.stepSide || 1);
          w.fx.print(b.x - Math.sin(ang) * b.stepSide * b.r * 0.35, b.y + Math.cos(ang) * b.stepSide * b.r * 0.35, ang, b.r, bio);
          if (bio === 'snow') BD.spawnFx(w, 'snowburst', b.x, b.y + b.r * 0.4, { scale: 0.3, angle: ang + Math.PI, dir: true });
        }
      }
      if (bio === 'wheat' && sp > 60) { // 踩倒腳下的麥子
        const cells = [], rr = b.r * 0.7 + CELL * 0.5;
        for (let y = b.y - rr; y <= b.y + rr; y += CELL) for (let x = b.x - rr; x <= b.x + rr; x += CELL) {
          const i = WHEAT.idx(x, y);
          if (inWheat(x, y) && !w.fx.field[i] && Math.hypot(WHEAT.cx(i) - b.x, WHEAT.cy(i) - b.y) < rr && cells.indexOf(i) < 0) cells.push(i);
        }
        if (cells.length) BD.spawnFx(w, 'wheatburst', b.x, b.y, { cells, mode: 'trample', angle: ang, radius: rr });
      }
      if (b.wetT > 0 || sp < 60) continue;
      if (BD.inWater(b.x, b.y)) { b.wetT = 0.16; BD.spawnFx(w, 'splash', b.x, b.y + b.r * 0.4, { scale: bio === 'lake' ? 0.8 : 0.5 }); }
      else if (sp > 150 && DUST[bio]) { b.wetT = 0.14; BD.spawnFx(w, DUST[bio], b.x, b.y + b.r * 0.4, { scale: 0.45, angle: Math.atan2(-b.vy, -b.vx), dir: true }); }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
