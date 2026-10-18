'use strict';
// 場景互動：樹（斬擊砍成兩半、重擊撞飛成滾木）與沼澤水域（減速、濺水）。
// 只改戰鬥狀態並呼叫 BD.spawnFx；不碰 DOM / Canvas，沒有任何亂數（視覺碎片由 js/fx/terrain.js 以 BD.vrng 產生）。
(function (G) {
  const BD = G.BD, U = BD.U;
  const A = () => BD.ARENA;
  const TREE_R = 32, TREE_HP = 60, LOG_SPEED = 720, WATER_SLOW = 0.78;

  // 每場戰鬥開始（與訓練場重置）時依 ARENA.trees 重建存活的樹；pillars 其他程式（AI、投射物、碰撞）照舊讀取
  BD.resetArena = function () {
    A().pillars = A().trees.map((t, i) => ({ x: t[0], y: t[1], r: TREE_R, hp: TREE_HP, max: TREE_HP, tree: true, v: i % 3 }));
  };
  BD.resetArena();

  const pondAt = (x, y) => A().ponds.find((p) => ((x - p.x) / p.rx) ** 2 + ((y - p.y) / p.ry) ** 2 < 1) || null;
  BD.pondAt = pondAt;
  BD.terrainSpeedMul = (u) => (pondAt(u.x, u.y) ? WATER_SLOW : 1);

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
    const c = BD.K.shapeCenter(shape);
    if (pondAt(c.x, c.y)) BD.spawnFx(w, 'splash', c.x, c.y, { scale: U.clamp(dmg / 70, 0.7, 2.2), angle: shape.ang, dir: shape.kind === 'rect' || shape.kind === 'cone' });
  };
  // 投射物撞樹：掉血（滾木撞樹力道大）；呼叫端已讓投射物消失
  BD.projHitsTree = function (w, p, t) {
    hurtTree(w, t, p.kind === 'log' ? TREE_HP : p.dmg * 0.5, Math.atan2(p.vy, p.vx));
  };

  // 角色在水中移動時，腳邊持續濺起漣漪（純視覺）
  BD.updateTerrain = function (w, dt) {
    for (const b of w.bosses) {
      b.wetT = (b.wetT || 0) - dt;
      if (b.wetT > 0 || b.state === 'dead' || Math.hypot(b.vx + b.kbx, b.vy + b.kby) < 60 || !pondAt(b.x, b.y)) continue;
      b.wetT = 0.16;
      BD.spawnFx(w, 'splash', b.x, b.y + b.r * 0.4, { scale: 0.5 });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
