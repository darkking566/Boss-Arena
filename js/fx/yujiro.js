'use strict';
// 特效庫｜範馬勇次郎專屬（fingerflick / heelstomp / backfist / whiplash / rollkick / fangbite / bearhug / eardrum / stillquake / dissolve / flexpulse / beastclaw / demonface / ultfist / ogrewail）：
// 每個招式一組自己的演出——彈指氣彈、踵落裂地、裏拳風刃、鞭影、迴旋弧光、咬合齒痕、熊抱收緊、雙掌耳鳴、止震、消力反彈、震樓鼓動、猛獸爪影、鬼貌一擊、地上最強、鬼哭啼。
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
(function (G) {
  const BD = G.BD, TAU = Math.PI * 2, V = BD.vrng;
  const BLOOD_RED = '#b0141c', DEMON = '#8a0a0a', DEMON_HOT = '#ff3a2a', IVORY = '#f2e6d0';

  // 沿角度 ang 從 (x,y) 前進 d、側移 l 的點
  const along = (x, y, ang, d, l) => [x + Math.cos(ang) * d - Math.sin(ang) * (l || 0), y + Math.sin(ang) * d + Math.cos(ang) * (l || 0)];

  BD.defineEffect('fingerflick', {
    name: '彈指氣彈', category: '突刺',
    desc: '一根手指彈出的空氣炮：指尖先壓縮出一圈向內收的氣波，一顆白熱氣彈沿直線射出並拖著空氣裂痕，命中點炸出透鏡狀的衝擊環。scale 越大氣彈越粗、後段再補一圈震環。適合遠距離的直線氣彈。',
    params: { len: 560, width: 38 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), ang = o.angle || 0, len = o.len || 560, w = o.width || 38, sc = o.scale || 1;
      const [tx, ty] = along(x, y, ang, len, 0);
      fx.ring(x, y, 22 * k + 14, 3, 0.14, E.glow, 2.5); // 指尖壓縮空氣
      fx.flashAt(x, y, 14 + 6 * k, '#ffffff', 0.08);
      for (let j = 0; j < 3; j++) fx.after(0.02 + j * 0.035, () => { // 氣彈分三段射出
        const [px, py] = along(x, y, ang, len * (0.25 + 0.3 * j), 0);
        fx.streak(px - Math.cos(ang) * 60, py - Math.sin(ang) * 60, px, py, 4 + 2 * k, E.glow, 0.16, true);
      });
      fx.beam(x, y, tx, ty, Math.max(2, w * 0.12 * k), '#ffffff', 0.1, '#ffffff');
      fx.beam(x, y, tx, ty, w * 0.35 * k, E.glow, 0.16, E.core);
      fx.after(0.12, () => {
        fx.shock(tx, ty, 4, w * 1.2 + 24 * sc, 0.26, E.glow, 4, E.core); // 透鏡狀衝擊環
        fx.ring(tx, ty, 8, w * 1.6, 0.2, E.core, 2);
        fx.sparkle(tx, ty, E.core, fx.budget(Math.round(8 * k)), 300, ang, 0.8);
      });
      if (sc >= 1.3) fx.after(0.18, () => { fx.ring(tx, ty, 10, 70, 0.3, E.glow, 5); fx.punch(0.02, tx, ty); });
      fx.shake(Math.min(7, 2 + 2 * k), ang);
    },
  });

  BD.defineEffect('heelstomp', {
    name: '踵落', category: '砸地',
    desc: '高高舉起的腳跟從上方劈落：一道拖影從天而降，腳跟砸地炸出向外的震波與放射狀裂痕，木屑與碎石四濺。scale 大時再推出一圈外擴的餘震。適合墜落式的斧踢與砸地。',
    params: { radius: 120 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), r = o.radius || 120, sc = o.scale || 1;
      fx.streak(x, y - 240 * sc, x, y - 8, Math.max(8, r * 0.14), E.core, 0.14, true); // 腳跟落下的拖影
      fx.after(0.15, () => {
        fx.shock(x, y, 6, r * 1.6, 0.4, E.glow, 7 * Math.min(1.4, k), E.core);
        fx.ring(x, y, r * 0.2, r * 1.3, 0.3, E.core, 3);
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + V() * 0.3; fx.crack(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, r * 0.9, E.decal, 6, E.crack, 3); }
        fx.debris(x, y, E.debris, Math.round(10 * k), 260, 3 + k, r * 0.3);
        fx.smoke(x, y, E.smoke, Math.round(5 * k), r * 0.4);
        fx.flashAt(x, y, r * 0.8, E.core, 0.14);
        if (sc >= 1) { fx.text(x, y - r * 0.6, '踵落', E.core, 26); fx.punch(0.03, x, y); }
        if (sc >= 1.0) fx.after(0.2, () => fx.ring(x, y, r * 1.1, r * 2.2, 0.35, E.glow, 3)); // 二階段的餘震
      });
      fx.shake(Math.min(16, 10 * k), Math.PI / 2);
    },
  });

  BD.defineEffect('backfist', {
    name: '裏拳風刃', category: '斬擊',
    desc: '手背的一揮：扇面弧形的拳風刃光由內向外掃開，弧心炸出一點白閃，刃光外再拖一道細殘影。scale 大時在弧心附近浮出「裏拳」。適合橫掃式的近身揮擊。',
    params: { arc: 2.6 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), ang = o.angle || 0, arc = o.arc || 2.6, r = o.radius || 180, sc = o.scale || 1;
      fx.slash(x, y, ang, arc, r * 0.95, E.glow, 9 * Math.min(1.5, k), 0.2, { core: E.core, trail: 4 });
      fx.slash(x, y, ang - 0.25, arc * 0.8, r * 0.78, '#ffffff', 3, 0.16, { core: null, trail: 2 });
      const [mx, my] = along(x, y, ang, r * 0.6, 0);
      fx.flashAt(mx, my, 16 + 8 * k, '#ffffff', 0.1);
      for (let i = 0; i < 4; i++) { const a = ang - arc / 2 + arc * (i + 0.5) / 4, [px, py] = along(x, y, a, r * 0.8, 0); fx.streak(x, y, px, py, 1.5, E.core, 0.14, true); } // 拳風撕裂的細線
      fx.shock(mx, my, 3, r * 0.5, 0.2, E.glow, 3, E.core);
      if (sc >= 1.2) { fx.text(mx, my - 24, '裏拳', E.core, 24); fx.punch(0.02, mx, my); }
      fx.shake(Math.min(10, 4 + 3 * k), ang);
    },
  });

  BD.defineEffect('whiplash', {
    name: '鞭影', category: '突刺',
    desc: '鞭打的 S 形鞭影：拉長的鞭身沿拳路依序甩出，每一段折返都在關節處炸出火星，鞭梢啪地一響炸開小型衝擊。適合連續抽打的鞭擊。',
    params: { len: 330, width: 60 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), ang = o.angle || 0, len = o.len || 330, w = o.width || 60, N = 6;
      let px = x, py = y;
      for (let i = 1; i <= N; i++) { // 鞭身以 S 形依序甩出
        const [qx, qy] = along(x, y, ang, len * i / N, (i % 2 ? 1 : -1) * w * 0.35);
        const sx = px, sy = py;
        fx.after(i * 0.018, () => { fx.streak(sx, sy, qx, qy, 3 + k, E.core, 0.14, true); fx.sparks(qx, qy, E.glow, 2, 120); });
        px = qx; py = qy;
      }
      fx.streak(x, y, px, py, 1.5, '#ffffff', 0.12, true);
      fx.after(0.12, () => { fx.shock(px, py, 2, w * 0.8, 0.2, E.glow, 3, E.core); fx.sparkle(px, py, E.core, fx.budget(6), 220, ang, 1.0); });
      fx.shake(Math.min(6, 2 + 2 * k), ang);
    },
  });

  BD.defineEffect('rollkick', {
    name: '迴旋弧光', category: '斬擊',
    desc: '旋身一圈的迴旋踢：三道弧光依序繞著施放者掃過整圈，身後留下殘影與氣旋，踢中的最後一刻炸出環狀震波並浮出「迴旋」。適合旋轉踢與繞身攻擊。',
    params: { radius: 175 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), ang = o.angle || 0, r = o.radius || 175, src = o.src || null;
      fx.ghost(src, 0.25, E.glow);
      for (let i = 0; i < 3; i++) fx.after(i * 0.05, () => // 三道弧光繞身掃過
        fx.slash(x, y, ang + i * TAU / 3, TAU * 0.4, r * (0.85 + 0.08 * i), E.glow, 8 - i * 1.5, 0.24, { core: E.core, trail: 3 }));
      fx.ring(x, y, r * 0.2, r * 0.9, 0.25, E.glow, 3);
      fx.motes(x, y, E, Math.round(6 * k), r * 0.6, 140);
      fx.after(0.12, () => { fx.shock(x, y, 6, r * 1.1, 0.3, E.glow, 5, E.core); fx.text(x, y - r * 0.6, '迴旋', E.core, 22); });
      fx.shake(Math.min(10, 6 * k));
    },
  });

  BD.defineEffect('fangbite', {
    name: '咬合齒痕', category: '突刺',
    desc: '上下兩排利齒從外圈咬合：齒痕先在外圈亮起，接著收緊到中心，炸出血霧般的紅光與血滴噴濺，最後傷口處留下殘紅。適合咬擊與出血類的近身攻擊。',
    params: { radius: 95 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), ang = o.angle || 0, r = o.radius || 95;
      const teeth = (R, len) => { for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { // 上下兩排
        const a = ang + (i - 2.5) * 0.22, [px, py] = along(x, y, a, R, s * 0.3 * r), [qx, qy] = along(x, y, a, R - len, s * 0.3 * r);
        fx.streak(px, py, qx, qy, 3, IVORY, 0.14, false);
      } };
      teeth(r * 1.6, r * 0.5);
      fx.after(0.07, () => { teeth(r * 0.9, r * 0.35); fx.flashAt(x, y, r * 0.5, '#ff3030', 0.14); });
      fx.after(0.12, () => {
        fx.sparkle(x, y, BLOOD_RED, fx.budget(Math.round(14 * k)), 260, ang, 1.2);
        for (let i = 0; i < 4; i++) { const a = ang + (i - 1.5) * 0.5, [px, py] = along(x, y, a, r * 1.1, 0); fx.streak(x, y, px, py, 2.5, BLOOD_RED, 0.3, false); } // 血滴拖線
        fx.decal(x, y, r * 0.5, DEMON, 0.6);
        fx.text(x, y - r * 0.8, '咬', DEMON_HOT, 24);
      });
      fx.shake(Math.min(10, 6 * k), ang);
    },
  });

  BD.defineEffect('bearhug', {
    name: '熊抱收緊', category: '砸地',
    desc: '抱住不斷收緊的光環：外圈的收束環逐步縮到身體，環內的肋骨裂紋一根根亮起；最後一下爆出骨裂白光與震波，scale 大時浮出「肋骨」。適合持續擠壓的抱擊。',
    params: { radius: 100 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), r = o.radius || 100, sc = o.scale || 1, big = sc >= 1.3;
      fx.ring(x, y, r * 1.6, r * 0.5, 0.3, E.glow, 4); // 外圈收束
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4, [px, py] = along(x, y, a, r * 0.7, 0); fx.streak(px, py, x, y, 1.5, E.core, 0.18, true); } // 收緊的肋骨
      fx.glow(x, y, r * 0.6, E.glow, 0.25, 0.5, 0.3, o.src || null);
      if (big) fx.after(0.18, () => {
        fx.shock(x, y, 4, r * 1.6, 0.35, E.glow, 6 * Math.min(1.4, k), E.core);
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, [px, py] = along(x, y, a, r * 0.6, 0); fx.crack(px, py, r * 0.5, E.decal, 5, E.crack, 3); }
        fx.text(x, y - r * 0.8, '肋骨', E.core, 26); fx.punch(0.03, x, y);
      });
      fx.shake(Math.min(12, 4 + 3 * k));
    },
  });

  BD.defineEffect('eardrum', {
    name: '雙掌鼓膜', category: '砸地',
    desc: '雙掌左右同時拍向耳側：兩道對稱的掌壓衝擊先炸開，接著耳鳴般的同心波紋一圈圈向外擴散，中央浮出「耳鳴」。適合雙掌拍擊與暈眩類的近身攻擊。',
    params: { radius: 120 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), ang = o.angle || 0, r = o.radius || 120;
      for (const s of [-1, 1]) { // 左右雙掌
        const [px, py] = along(x, y, ang, 0, s * r * 0.7);
        fx.shock(px, py, 3, r * 0.6, 0.2, E.glow, 4, E.core);
        fx.streak(px - Math.sin(ang) * s * 30, py + Math.cos(ang) * s * 30, px, py, 4, E.core, 0.16, true);
      }
      for (let j = 0; j < 3; j++) fx.after(0.12 + j * 0.1, () => fx.ring(x, y, r * 0.3, r * (1.1 + 0.3 * j), 0.4, '#fff4c8', 2)); // 耳鳴波紋
      fx.after(0.12, () => { fx.text(x, y - r * 0.7, '耳鳴', '#fff4c8', 22); fx.flashAt(x, y, r * 0.4, E.core, 0.1); });
      fx.shake(Math.min(10, 5 * k), ang);
    },
  });

  BD.defineEffect('stillquake', {
    name: '止震', category: '砸地',
    desc: '一拳打進地面：震波的同心環先向拳落處收縮，驟然停住後凝固成一圈白環，裂縫定格發光，只留下一聲「止」與沉重的震動。適合停止震盪的重拳與砸地。',
    params: { radius: 140 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), r = o.radius || 140;
      fx.ring(x, y, r * 2.4, r * 0.2, 0.42, E.glow, 4); // 震波向拳落處收縮
      fx.after(0.42, () => { // 驟然停住
        fx.ring(x, y, r * 0.5, r * 0.8, 0.3, '#ffffff', 6);
        fx.flashAt(x, y, r * 0.7, E.core, 0.16);
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; fx.crack(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.8, E.decal, 7, E.glow, 4); } // 裂縫定格發光
        fx.debris(x, y, E.debris, Math.round(8 * k), 200, 3 + k, r * 0.25);
        fx.text(x, y - r * 0.6, '止', E.core, 30);
        fx.punch(0.03, x, y);
      });
      fx.shake(Math.min(14, 9 * k), Math.PI / 2);
    },
  });

  BD.defineEffect('dissolve', {
    name: '消力・返', category: '增益',
    desc: '卸力的見切架式：來勢被捲成一圈向內的漩渦，力道在中心消散，接著反彈成一道環形衝擊與一記白亮的反擊弧，浮出「消力・返」。適合格擋反擊類的招式。',
    params: { radius: 180 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), ang = o.angle || 0, r = o.radius || 180, src = o.src || null;
      fx.glow(x, y, r * 0.8, E.core, 0.9, 0.5, 0.5, src);
      for (let i = 0; i < 10; i++) { // 來勢捲成漩渦、向內收
        const a = i / 10 * TAU, b = a + 0.6, [px, py] = along(x, y, a, r * 1.4, 0), [qx, qy] = along(x, y, b, r * 0.35, 0);
        fx.streak(px, py, qx, qy, 2.5, E.glow, 0.35, true);
      }
      fx.after(0.4, () => { // 力道消散後反彈
        fx.ring(x, y, r * 0.2, r * 1.3, 0.35, E.glow, 4);
        fx.slash(x, y, ang, 2.4, r * 1.1, '#ffffff', 6, 0.3, { core: E.core, trail: 3 });
        fx.text(x, y - r * 0.9, '消力・返', E.core, 24);
        fx.punch(0.02, x, y);
      });
      fx.shake(Math.min(8, 4 * k));
    },
  });

  BD.defineEffect('flexpulse', {
    name: '震樓鼓動', category: '增益',
    desc: '肌肉緊繃鼓動：身上的光暈一下下脈動，三圈衝擊波依序從體表推開，地面放射出細裂，震動的餘波讓整個場地輕輕晃動。適合自我強化與威壓的防禦技。',
    params: { radius: 210 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), r = o.radius || 210, src = o.src || null;
      fx.ghost(src, 0.35, E.glow);
      for (let j = 0; j < 3; j++) fx.after(j * 0.12, () => { // 三下鼓動
        fx.shock(x, y, r * 0.3, r * (0.8 + 0.2 * j), 0.35, E.glow, 5 - j, E.core);
        fx.glow(x, y, r * (0.5 + 0.1 * j), E.glow, 0.25, 0.6, 0.2, src);
        fx.shake(3 + j, null);
      });
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; fx.crack(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.5, E.decal, 5, E.crack, 2); }
      fx.text(x, y - r * 0.5, '震樓', E.core, 24);
      fx.shake(Math.min(12, 6 * k));
    },
  });

  BD.defineEffect('beastclaw', {
    name: '猛獸爪影', category: '突刺',
    desc: '猛獸般的連續抓擊：三道平行的爪痕依序刷過，爪影間爆出細碎火星與血點；scale 大的收尾重擊再加一圈震環與「猛獸」。適合快速連打與近身亂抓。',
    params: { width: 130 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), ang = o.angle || 0, w = o.width || 130, sc = o.scale || 1;
      for (let i = 0; i < 3; i++) { // 三道爪痕依序刷過
        const l = (i - 1) * w * 0.22, [sx, sy] = along(x, y, ang, -40, l), [ex, ey] = along(x, y, ang, 40, l);
        fx.after(i * 0.03, () => { fx.streak(sx, sy, ex, ey, 3 + k, E.core, 0.14, true); fx.sparks(ex, ey, E.glow, 3, 140); });
      }
      fx.flashAt(x, y, 10 + 8 * k, E.core, 0.08);
      if (sc >= 1.3) fx.after(0.12, () => { fx.ring(x, y, 8, w * 0.9, 0.3, E.glow, 5); fx.text(x, y - 30, '猛獸', E.core, 24); fx.punch(0.02, x, y); });
      fx.shake(Math.min(7, 2 + 2 * k), ang);
    },
  });

  BD.defineEffect('demonface', {
    name: '鬼貌一擊', category: '突刺',
    desc: '背上的鬼臉浮現於拳鋒：暗紅的暗幕與鬼影殘像先閃現，拳鋒衝刺時拖出血紅的殘痕，鬼面的雙眼與獠牙在拳尖亮起；命中時炸出血色震波與裂地，浮出「鬼貌」。適合衝刺的終結重拳。',
    params: { len: 420, width: 120 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), ang = o.angle || 0, len = o.len || 420, w = o.width || 120, src = o.src || null;
      const [ex, ey] = along(x, y, ang, len, 0);
      fx.veil(0.3, 0.4, '#1a0000');
      fx.ghost(src, 0.3, DEMON);
      fx.streak(x, y, ex, ey, w * 0.5, DEMON, 0.3, false); // 血紅殘痕
      fx.streak(x, y, ex, ey, 3, E.core, 0.18, true);
      for (const s of [-1, 1]) { // 鬼眼
        const [px, py] = along(ex, ey, ang, -12, s * 18);
        fx.glow(px, py, 9, '#ffe14a', 0.35, 0.9, 0.1);
        fx.flashAt(px, py, 4, '#ffe14a', 0.12);
      }
      const [mx, my] = along(ex, ey, ang, -26, 0); // 獠牙
      fx.slash(mx, my, ang, 2.2, 30, DEMON_HOT, 5, 0.3, { core: '#ffffff', trail: 2 });
      fx.after(0.09, () => { // 命中的瞬間
        fx.shock(ex, ey, 8, w * 1.8, 0.45, DEMON_HOT, 8, '#ffb0a0');
        fx.crack(ex, ey, w * 1.1, E.decal, 8, E.crack, 4);
        fx.debris(ex, ey, E.debris, Math.round(10 * k), 300, 4, w * 0.4);
        fx.flashAt(ex, ey, w * 0.9, DEMON_HOT, 0.16);
        fx.text(ex, ey - 40, '鬼貌', E.core, 30);
        fx.punch(0.04, ex, ey); fx.shake(16, ang);
      });
    },
  });

  BD.defineEffect('ultfist', {
    name: '地上最強的一擊', category: '大招',
    desc: '一拳核爆級的震波：全場暗下，白熱閃光炸開，四圈震環快速外推，放射地裂與光柱同時竄起，碎石與火花四射，浮出「最強」。大招一階段的終結一拳專用。',
    params: { radius: 170 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), r = o.radius || 170;
      fx.flash(E.core, 0.5); fx.grade(E.glow, 0.4, 0.6); fx.veil(0.3, 0.5, '#000000');
      fx.shock(x, y, 8, r * 2.5, 0.5, E.glow, 10 * Math.min(1.5, k), E.core);
      for (let j = 0; j < 4; j++) fx.after(j * 0.05, () => fx.ring(x, y, r * (0.3 + 0.2 * j), r * (2.2 + 0.4 * j), 0.45, E.glow, 6 - j));
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; fx.crack(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4, r * 1.2, E.decal, 9, E.crack, 5); }
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.2; const [px, py] = along(x, y, a, r * 1.3, 0); fx.pillar(px, py, 20, E.glow, 0.5); }
      fx.debris(x, y, E.debris, Math.round(16 * k), 320, 4 + k, r * 0.4);
      fx.sparks(x, y, E.core, fx.budget(24), 420);
      fx.text(x, y - r, '最強', E.core, 40);
      fx.punch(0.05, x, y); fx.shake(Math.min(24, 16 * k));
    },
  });

  BD.defineEffect('ogrewail', {
    name: '鬼哭啼', category: '大招',
    desc: '鬼背的面孔扭曲痛哭：血紅的聲波環一圈圈向外擴開、場地染成暗紅，中心的裂地由深到淺，最後轟然一拳把大地打凹，浮出「鬼哭啼」。大招二階段的終結一拳專用。',
    params: { radius: 280 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), r = o.radius || 280, src = o.src || null;
      fx.grade(DEMON, 0.45, 0.8); fx.flashAt(x, y, r * 0.5, DEMON_HOT, 0.2);
      for (let j = 0; j < 4; j++) fx.after(j * 0.09, () => fx.ring(x, y, r * 0.2, r * (1.0 + 0.3 * j), 0.5, DEMON_HOT, 5 - j));
      fx.glow(x, y, r * 0.8, DEMON_HOT, 0.45, 0.8, 0.4, src);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; fx.crack(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, r * 0.9, E.decal, 9, E.crack, 4); }
      fx.after(0.2, () => fx.shock(x, y, 10, r * 1.4, 0.5, DEMON_HOT, 9 * Math.min(1.5, k), '#ffb0a0'));
      fx.debris(x, y, E.debris, Math.round(14 * k), 300, 4 + k, r * 0.4);
      fx.text(x, y - r * 0.6, '鬼哭啼', '#ffb0a0', 36);
      fx.punch(0.05, x, y); fx.shake(Math.min(22, 14 * k), Math.PI / 2);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
