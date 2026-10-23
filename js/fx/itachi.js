'use strict';
// 特效庫｜宇智波鼬專屬（kunaislash / kunaistab / shurikenfan / gokakyu / crowvolley / crowfall / shunshin / palmgrab /
// sharingancharge / gazeline / sharinganwatch / foreheadpoke / amaterasumark / amaterasubloom / magatamafan / susanoocharge）：
// 每個技能一組自己的演出——苦無連斬、手裏劍扇射、豪火球、烏鴉齊飛與俯衝、瞬身、月讀視線、寫輪眼見切、額頭一戳、天照、八尺瓊勾玉。
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
(function (G) {
  const BD = G.BD, TAU = Math.PI * 2, V = BD.vrng;
  const STEEL = '#cfd6e4', RED = '#e01e37', BLOOD = '#ff2a44', INK = '#0b0810';

  // 沿角度 ang 從 (x,y) 前進 d、側移 l 的點
  const along = (x, y, ang, d, l) => [x + Math.cos(ang) * d - Math.sin(ang) * (l || 0), y + Math.sin(ang) * d + Math.cos(ang) * (l || 0)];

  // 寫輪眼圖樣：血紅外環、中心瞳孔光、三枚勾玉繞著轉；rot 為起始角、life 為存活時間
  function eye(fx, x, y, r, rot, life) {
    fx.ring(x, y, r * 0.3, r, life, RED, 3);
    fx.ring(x, y, r * 0.12, r * 0.5, life, '#ffd6da', 2);
    fx.glow(x, y, r * 0.3, BLOOD, life, 0.8);
    for (let s = 0; s < 4; s++) fx.after(s * life / 4, () => {
      for (let i = 0; i < 3; i++) {
        const [px, py] = along(x, y, rot + s * 0.5 + i * TAU / 3, r * 0.68, 0);
        fx.glow(px, py, r * 0.2, '#ff5a70', life / 3, 0.95);
      }
    });
  }

  BD.defineEffect('kunaislash', {
    name: '苦無連斬', category: '斬擊',
    desc: '苦無逆手劃出的銀白弧：一道鋼色主弧帶紅邊與殘影、內側一道細弧補刀，弧末一枚苦無環閃光與四濺的火花。適合鼬的苦無近戰連擊（el 換成 fire 即火焰附著）。',
    params: { arc: 1.7 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), ang = o.angle || 0, arc = o.arc || 1.7, r = o.radius || 125, dir = V() < 0.5 ? -1 : 1;
      fx.slash(x, y, ang, arc, r, STEEL, 5 * k + 2, 0.2, { core: '#ffffff', trail: 3, rim: RED });
      fx.slash(x, y, ang + dir * 0.06, arc * 0.8, r * 0.72, E.glow, 3, 0.26, { core: null, trail: 2 });
      const [ex, ey] = along(x, y, ang + dir * arc / 2, r, 0), [sx, sy] = along(x, y, ang - dir * arc / 2, r * 0.5, 0);
      fx.streak(sx, sy, ex, ey, 2, '#ffffff', 0.12, true); // 苦無掠過的亮線
      fx.after(0.07, () => { fx.ring(ex, ey, 2, 13, 0.18, STEEL, 2.5); fx.sparkle(ex, ey, '#ffffff', fx.budget(7), 280, ang + dir * (arc / 2 + 1.2), 0.9); });
      fx.shake(Math.min(5, 2 * k), ang);
    },
  });

  BD.defineEffect('kunaistab', {
    name: '苦無突刺', category: '突刺',
    desc: '苦無尖端的一記直刺：鋼白細光貫穿全程、紅色殘影拖在後面，尖端炸出八芒星火花與苦無環，施放者留下殘影。適合鼬苦無連擊的收尾突刺（el 換成 fire 即火焰附著）。',
    params: { len: 165, width: 40 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), ang = o.angle || 0, len = o.len || 165, w = o.width || 40, [tx, ty] = along(x, y, ang, len, 0);
      fx.ghost(o.src || null, 0.22, RED);
      for (let i = -1; i <= 1; i += 2) { const [sx, sy] = along(x, y, ang, -30, i * w * 0.5), [ex, ey] = along(x, y, ang, len * 0.8, i * w * 0.12); fx.streak(sx, sy, ex, ey, 1.6, E.glow, 0.16, true); }
      fx.beam(x, y, tx, ty, 4 * k, STEEL, 0.14, '#ffffff');
      fx.beam(x, y, tx, ty, 11 * k, E.glow, 0.24, E.core);
      fx.after(0.05, () => {
        fx.ring(tx, ty, 3, 24 * k, 0.22, STEEL, 3);
        for (let i = 0; i < 8; i++) { const [px, py] = along(tx, ty, i / 8 * TAU, (i % 2 ? 22 : 40) * k, 0); fx.streak(tx, ty, px, py, 2.5, i % 2 ? E.glow : '#ffffff', 0.2, true); }
        fx.sparkle(tx, ty, '#ffffff', fx.budget(9), 340, ang, 1);
        fx.flashAt(tx, ty, 34 * k, E.core, 0.12);
      });
      fx.shake(Math.min(6, 3 * k), ang);
    },
  });

  BD.defineEffect('shurikenfan', {
    name: '手裏劍扇射', category: '突刺',
    desc: '手指一彈、暗器離手：每枚暗器的飛行方向拉出一條銀紅速度線與小旋環，手邊炸出一圈火花；scale ≥ 1.2 的手裏劍再浮出一枚高速旋轉的巨大四刃風車。適合鼬的手裏劍術（proj 的 fx）。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), ang = o.angle || 0, n = o.n || 1, arc = o.arc || 0, big = (o.scale || 1) >= 1.2;
      for (let i = 0; i < n; i++) {
        const a = ang + (n > 1 ? (i / (n - 1) - 0.5) * arc : 0), [ex, ey] = along(x, y, a, 210, 0), [rx, ry] = along(x, y, a, 70, 0);
        fx.streak(x, y, ex, ey, 3, E.glow, 0.24, true);
        fx.streak(x, y, ex, ey, 1.2, '#ffffff', 0.16, true);
        fx.after(i * 0.025, () => fx.ring(rx, ry, 2, 14, 0.2, STEEL, 2));
      }
      fx.ring(x, y, 6, 36 * k, 0.2, E.glow, 2.5);
      fx.sparkle(x, y, E.core, fx.budget(6), 260, ang, arc / 2 + 0.5);
      if (!big) return;
      const [cx, cy] = along(x, y, ang, 64, 0);
      fx.glow(cx, cy, 40, E.glow, 0.3, 0.7, 0.3);
      for (let j = 0; j < 6; j++) fx.after(j * 0.03, () => { // 旋轉中的四刃風車
        for (let b = 0; b < 4; b++) fx.slash(cx, cy, ang + j * 0.8 + b * TAU / 4, 0.8, 34 + j * 3, STEEL, 5, 0.1, { core: '#ffffff', trail: 1 });
      });
      fx.punch(0.015, cx, cy); fx.shake(4, ang);
    },
  });

  BD.defineEffect('gokakyu', {
    name: '火遁・豪火球', category: '區域',
    desc: '宇智波的招牌火遁：先在胸前結印收束一圈火光、浮出「火遁」，然後一顆巨大的火球從口中滾出、沿扇形一路膨脹推向前方，火球後方拖著翻滾的烈焰、黑煙與火星，抵達終點時炸成大震波並在地面留下焦痕。適合豪火球之術這類巨大的直線火球（搭配 fire）。',
    params: { radius: 340, arc: 1.3 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), ang = o.angle || 0, r = o.radius || 340, arc = o.arc || 1.3, N = 8;
      fx.grade(E.glow, 0.25, 0.9);
      fx.ring(x, y, 80, 10, 0.25, E.glow, 3); fx.ring(x, y, 50, 6, 0.2, E.core, 2);
      fx.text(x, y - 46, '火遁', E.core, 24);
      for (let s = 0; s < N; s++) fx.after(0.1 + s * 0.045, () => { // 火球一路滾向前方
        const d = r * (0.12 + 0.88 * s / (N - 1)), sz = (46 + 70 * s / (N - 1)) * k, [px, py] = along(x, y, ang, d, 0);
        fx.glow(px, py, sz, E.glow, 0.32, 0.85, 0.15);
        fx.glow(px, py, sz * 0.55, E.core, 0.24, 0.95);
        fx.flashAt(px, py, sz * 0.8, E.core, 0.08);
        fx.streak(x, y, px, py, sz * 0.5, E.glow, 0.22, true);
        fx.smoke(px, py, 'rgba(20,10,6,0.6)', fx.budget(3), sz * 0.6);
        fx.embers(px, py, E.particle, fx.budget(5), sz * 0.7, 80);
        const a = (V() - 0.5) * arc, [qx, qy] = along(x, y, ang + a, d * 0.95, 0); // 兩側的火舌填滿扇形
        fx.glow(qx, qy, sz * 0.5, E.glow, 0.26, 0.6, 0.2);
      });
      fx.after(0.1 + N * 0.045, () => {
        const [ex, ey] = along(x, y, ang, r, 0);
        fx.shock(ex, ey, 8, r * 0.55, 0.45, E.glow, 9, E.core);
        fx.ring(ex, ey, 10, r * 0.4, 0.4, '#ffffff', 3);
        fx.decal(ex, ey, r * 0.18, E.decal, 6);
        fx.sparkle(ex, ey, E.core, fx.budget(14), 380, ang, 1.4);
        fx.punch(0.03, ex, ey); fx.shake(Math.min(14, 7 * k), ang);
      });
    },
  });

  BD.defineEffect('crowvolley', {
    name: '烏鴉齊飛', category: '突刺',
    desc: '一群烏鴉從袖口、身後振翅衝出：漆黑的翼影掃過扇面，每隻烏鴉在飛行方向拉出一條黑紅拖影、滿天落羽與一對紅眼閃光。適合鼬的烏鴉分身、月讀與大招放出的追蹤烏鴉群（proj 的 fx）。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), ang = o.angle || 0, n = o.n || 5, arc = Math.max(o.arc || 0, 0.8);
      fx.slash(x, y, ang, arc + 0.6, 78, INK, 18, 0.3, { core: null, trail: 2, rim: E.glow }); // 展開的翼影
      for (let i = 0; i < n; i++) {
        const a = ang + (n > 1 ? (i / (n - 1) - 0.5) * arc : 0) + (V() - 0.5) * 0.12, [ex, ey] = along(x, y, a, 160 + V() * 120, 0);
        fx.streak(x, y, ex, ey, 5 + V() * 3, i % 3 ? INK : E.glow, 0.34, false);
        fx.after(0.05 + i * 0.015, () => fx.sparkle(ex, ey, BLOOD, 1, 60, a, 0.3)); // 紅眼閃光
      }
      fx.debris(x, y, '#14101a', fx.budget(Math.round(10 * k)), 320, 2.5, 30); // 落羽
      fx.smoke(x, y, 'rgba(8,4,12,0.6)', fx.budget(6), 50);
      fx.ring(x, y, 8, 70, 0.3, E.glow, 2.5);
      fx.shake(Math.min(5, 2.5 * k), ang);
    },
  });

  BD.defineEffect('crowfall', {
    name: '烏鴉俯衝', category: '爆炸',
    desc: '烏鴉群從高空俯衝砸在落點：幾條黑色斜線從天而降，落地炸開漆黑的羽毛與煙霧、紅光震波與一圈放射的黑羽拖影，地面留下焦黑的鴉痕與紅眼閃光。適合烏鴉風暴這類天降的落點爆炸（el 換成 blackfire 即帶天照黑炎）。',
    params: { radius: 70 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), r = o.radius || 70;
      for (let i = 0; i < 3; i++) { const sx = x - 90 + (V() - 0.5) * 80, sy = y - 240 - V() * 90; fx.streak(sx, sy, x + (V() - 0.5) * r * 0.4, y, 6, INK, 0.16, false); }
      fx.flashAt(x, y, r * 0.8, E.core, 0.12);
      fx.shock(x, y, 4, r * 1.3, 0.34, E.glow, 5 * k, E.core);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + V() * 0.3, [px, py] = along(x, y, a, r * (0.8 + V() * 0.8), 0); fx.streak(x, y, px, py, 3 + V() * 3, INK, 0.3, false); }
      fx.debris(x, y, '#14101a', fx.budget(Math.round(16 * k)), 330, 2.5, r * 0.3);
      fx.smoke(x, y, 'rgba(8,4,12,0.7)', fx.budget(8), r * 0.5);
      fx.sparkle(x, y, BLOOD, fx.budget(5), 200, -Math.PI / 2, 1.2);
      fx.decal(x, y, r * 0.7, E.decal, 5);
      fx.shake(Math.min(7, 3 * k));
    },
  });

  BD.defineEffect('shunshin', {
    name: '瞬身', category: '位移',
    desc: '木葉的瞬身之術：起點捲起一圈旋轉的落葉與白煙、留下一道殘影，一條銀白速度線在起終點之間拉開，終點樹葉與煙霧收束再散開，紅光一閃。適合鼬的瞬身、閃到背後（blink 動作的 fx）。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.4, o.k), tx = o.toX != null ? o.toX : x, ty = o.toY != null ? o.toY : y, LEAF = '#7a9a3a';
      fx.ghost(o.src || null, 0.3, RED);
      fx.smoke(x, y, 'rgba(230,230,240,0.55)', fx.budget(8), 40);
      fx.ring(x, y, 8, 80, 0.3, STEEL, 2.5);
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; fx.debris(x, y, LEAF, 1, 200, 2.5, 20); fx.streak(x, y, x + Math.cos(a) * 70, y + Math.sin(a) * 70, 2, LEAF, 0.3, false); }
      fx.streak(x, y, tx, ty, 8 * k, STEEL, 0.22, true);
      fx.streak(x, y, tx, ty, 3, E.glow, 0.3, true);
      fx.after(0.1, () => {
        fx.ring(tx, ty, 90, 10, 0.26, STEEL, 3);
        fx.smoke(tx, ty, 'rgba(230,230,240,0.5)', fx.budget(7), 36);
        fx.debris(tx, ty, LEAF, fx.budget(8), 220, 2.5, 22);
        fx.glow(tx, ty, 44, BLOOD, 0.22, 0.7, 0.3);
        fx.sparkle(tx, ty, '#ffffff', fx.budget(6), 260);
      });
      fx.shake(2);
    },
  });

  BD.defineEffect('palmgrab', {
    name: '擒拿掌擊', category: '突刺',
    desc: '背後貼身的一記掌擊：掌心炸出圓形衝擊環與紅光，兩側一排震盪線向外彈開、地面一圈白塵，施放者留下殘影。適合鼬瞬身後的背後擒拿。',
    params: { len: 130, width: 46 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), ang = o.angle || 0, len = o.len || 130, [px, py] = along(x, y, ang, len * 0.6, 0);
      fx.ghost(o.src || null, 0.2, RED);
      fx.flashAt(px, py, 54 * k, E.core, 0.12);
      fx.shock(px, py, 4, 66 * k, 0.28, BLOOD, 5, '#ffffff');
      for (let i = 0; i < 6; i++) { const a = ang + Math.PI / 2 + (i - 2.5) * 0.35, [qx, qy] = along(px, py, a, 60, 0); fx.streak(px, py, qx, qy, 2, '#ffffff', 0.16, true); fx.streak(px, py, 2 * px - qx, 2 * py - qy, 2, '#ffffff', 0.16, true); }
      fx.smoke(px, py, 'rgba(230,230,240,0.45)', fx.budget(4), 30);
      fx.sparkle(px, py, E.core, fx.budget(7), 280, ang, 1.1);
      fx.punch(0.012, px, py); fx.shake(Math.min(7, 3.5 * k), ang);
    },
  });

  BD.defineEffect('sharingancharge', {
    name: '寫輪眼凝視', category: '增益',
    desc: '月讀前的凝視：場地暗下一圈、血紅光點向身體收束，頭頂浮出一枚緩緩旋轉的寫輪眼圖樣與三枚勾玉，血紅光環一圈圈收攏。適合鼬施放月讀的蓄力（tele 的 chargeFx）。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, life = o.life || 0.9, src = o.src || null;
      fx.veil(life, 0.3, '#1a0006');
      fx.charge(x, y, 90, RED, life, src, 10);
      eye(fx, x, y - 6, 52, o.angle || 0, life * 0.9);
      for (let j = 0; j < 3; j++) fx.after(j * life / 3.4, () => fx.ring(x, y, 130, 20, life / 3, E.glow, 2));
    },
  });

  BD.defineEffect('gazeline', {
    name: '月讀視線', category: '大招',
    desc: '眼神交會的瞬間：整條視線化為血紅光束貫穿全程，起點浮出一枚旋轉的寫輪眼圖樣、光束上一圈圈紅環沿線疾衝向終點，終點炸出紅色閃光與烏鴉羽，場地短暫染紅。適合鼬月讀的視線判定（hit 的 fx）。',
    params: { len: 480, width: 110 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), ang = o.angle || 0, len = o.len || 480, w = o.width || 110, [tx, ty] = along(x, y, ang, len, 0);
      fx.veil(0.6, 0.3, '#1a0006'); fx.grade('#b3123c', 0.3, 0.8);
      fx.beam(x, y, tx, ty, w * 0.16, RED, 0.5, '#ffffff');
      fx.beam(x, y, tx, ty, w * 0.5, 'rgba(180,18,60,0.4)', 0.4, null);
      eye(fx, x, y, 46 + 10 * k, ang, 0.45);
      for (let i = 0; i < 6; i++) fx.after(i * 0.045, () => { // 紅環沿視線疾衝
        const [px, py] = along(x, y, ang, len * (i + 1) / 6, 0);
        fx.ring(px, py, 6, w * 0.45, 0.22, BLOOD, 2.5);
      });
      fx.after(0.25, () => {
        fx.flashAt(tx, ty, w * 0.7, BLOOD, 0.2);
        fx.shock(tx, ty, 6, w * 0.9, 0.35, RED, 4, '#ffffff');
        fx.debris(tx, ty, '#14101a', fx.budget(10), 260, 2.5, 26);
      });
      fx.shake(Math.min(6, 3 * k), ang);
    },
  });

  BD.defineEffect('sharinganwatch', {
    name: '寫輪眼・見切', category: '增益',
    desc: '看穿攻擊的一瞬：場地暗下、血紅閃光，一枚巨大的寫輪眼圖樣在身前轉開，三枚勾玉旋轉、兩道交叉亮線與血紅光環盪開，浮出「看穿」。適合鼬一階段的寫輪眼彈反（counter 的 fx）。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, src = o.src || null;
      fx.flash('#ffd6da', 0.35); fx.veil(0.5, 0.35, '#1a0006'); fx.grade('#b3123c', 0.35, 0.6);
      eye(fx, x, y, 76, V() * TAU, 0.45);
      fx.shock(x, y, 8, 130, 0.35, RED, 5, '#ffffff');
      fx.ring(x, y, 20, 170, 0.5, BLOOD, 3);
      for (let i = 0; i < 2; i++) { const a = (i ? 0.78 : -0.78) + (V() - 0.5) * 0.3, [px, py] = along(x, y, a, 190, 0), [qx, qy] = along(x, y, a, -190, 0); fx.streak(qx, qy, px, py, 3, '#ffffff', 0.25, true); }
      fx.ghost(src, 0.35, RED);
      fx.sparkle(x, y, BLOOD, fx.budget(10), 340);
      fx.text(x, y - 80, '看穿', '#ffd6da', 28);
      fx.punch(0.02, x, y); fx.shake(5);
    },
  });

  BD.defineEffect('foreheadpoke', {
    name: '額頭一戳', category: '增益',
    desc: '「下次吧。」兩根指頭輕輕點在額頭：落點一點白光、一圈圈柔和的漣漪向外盪開，幾片黑羽緩緩飄落，浮出「下次吧」。幾乎不痛卻足以推散架勢。適合鼬的額頭一戳。',
    params: { radius: 115 },
    spawn(fx, x, y, o) {
      const E = o.E, ang = o.angle || 0, r = o.radius || 115, [px, py] = along(x, y, ang, r * 0.7, 0);
      fx.grade('#ffffff', 0.18, 0.6);
      fx.glow(px, py, 26, '#ffffff', 0.3, 0.9, 0.2);
      fx.flashAt(px, py, 30, '#ffffff', 0.1);
      for (let j = 0; j < 3; j++) fx.after(j * 0.1, () => fx.ring(px, py, 4, 40 + j * 28, 0.5, j ? E.glow : '#ffffff', 2.5 - j * 0.5));
      fx.debris(px, py, '#14101a', fx.budget(5), 110, 2, 18);
      fx.motes(px, py, E, 4, 20, 50);
      fx.text(px, py - 40, '下次吧', '#ffd6da', 24);
      fx.punch(0.008, px, py);
    },
  });

  BD.defineEffect('amaterasumark', {
    name: '天照鎖定', category: '區域',
    desc: '黑炎降臨前的預兆：目標腳下浮出一枚旋轉的血紅寫輪眼圖樣，外圈血紅光環向焦點緩緩收攏，墨黑的煙霧從圈外向中心吸聚、火星竄起。life 秒後落點爆出黑炎。適合鼬的天照預警（tele 的 teleFx）。',
    params: { radius: 105 },
    spawn(fx, x, y, o) {
      const E = o.E, r = o.radius || 105, life = Math.max(0.3, o.life || 0.95), steps = Math.max(2, Math.round(life / 0.12));
      eye(fx, x, y, r * 0.8, 0, life);
      fx.ring(x, y, r * 1.2, r * 0.3, life, BLOOD, 3);
      for (let s = 0; s < steps; s++) fx.after(s * life / steps, () => {
        const a = V() * TAU, d = r * (0.9 + V() * 0.4), [px, py] = along(x, y, a, d, 0);
        fx.streak(px, py, x, y, 4, INK, 0.2, false);
        fx.embers(x, y, E.glow, fx.budget(2), r * 0.5, 70);
      });
      fx.glow(x, y, r, E.glow, life, 0.5, 0.2);
    },
  });

  BD.defineEffect('amaterasubloom', {
    name: '天照・黑炎綻放', category: '大招',
    desc: '焦點處炸出黑色的火：全屏一白、場地轉暗，一圈墨黑的火舌從落點沖天而起、血紅震波連推兩層，黑煙翻滾、火星飛濺，地面留下焦黑的血紅裂痕並浮出「天照」。適合鼬的天照落點爆發（搭配 blackfire）。',
    params: { radius: 105 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), r = o.radius || 105;
      fx.flash('#ffffff', 0.3); fx.veil(0.6, 0.45, '#000000'); fx.grade('#b3123c', 0.35, 0.8);
      fx.shock(x, y, 6, r * 1.5, 0.42, E.glow, 8 * k, '#ffffff');
      fx.after(0.08, () => fx.shock(x, y, 6, r * 1.1, 0.4, BLOOD, 5, E.core));
      for (let i = 0; i < 12; i++) fx.after(0.02 + i * 0.015, () => { // 一圈黑焰
        const a = i / 12 * TAU, [px, py] = along(x, y, a, r * (0.5 + V() * 0.4), 0);
        fx.pillar(px, py, r * 0.16, E.glow, 0.5);
        fx.streak(px, py, px + (V() - 0.5) * 30, py - 80 - V() * 80, 7, INK, 0.45, false);
      });
      fx.smoke(x, y, 'rgba(6,2,10,0.8)', fx.budget(14), r * 0.8);
      fx.embers(x, y, E.glow, fx.budget(16), r * 0.8, 160);
      for (let i = 0; i < 6; i++) fx.crack(x + (V() - 0.5) * r * 0.6, y + (V() - 0.5) * r * 0.6, r * 0.7, E.decal, 8, E.crack, 3);
      fx.decal(x, y, r * 0.8, E.decal, 8);
      fx.text(x, y - r * 0.8, '天照', BLOOD, 32);
      fx.punch(0.03, x, y); fx.shake(Math.min(14, 8 * k));
    },
  });

  BD.defineEffect('susanoocharge', {
    name: '須佐能乎蓄勢', category: '增益',
    desc: '骨架巨人聚形前的蓄勢：橘紅光點向身體收束，一根根肋骨弧光依序從身邊豎起，腳下橘色光環一圈圈收緊，火星與餘燼上升。適合鼬的八尺瓊勾玉與十拳劍預警（tele 的 chargeFx）。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, life = o.life || 0.8, src = o.src || null, OR = '#ff8a3a';
      fx.charge(x, y, 110, OR, life, src, 12);
      fx.veil(life, 0.2, '#200800');
      for (let i = 0; i < 6; i++) fx.after(i * life / 8, () => { // 肋骨弧光依序豎起
        const a = i / 6 * TAU;
        fx.slash(x, y, a - 0.35, 0.7, 44 + i * 4, OR, 4, life * 0.5, { core: '#ffe0a0', trail: 0 });
      });
      for (let j = 0; j < 3; j++) fx.after(j * life / 3.5, () => fx.ring(x, y, 150, 30, life / 3, OR, 2.5));
      fx.embers(x, y, OR, fx.budget(10), 40, 120);
    },
  });

  BD.defineEffect('magatamafan', {
    name: '八尺瓊勾玉', category: '突刺',
    desc: '須佐能乎甩出一串勾玉：橘紅光環從施放者身前盪開，每枚勾玉沿飛行方向亮起一顆橘金光球與一道彎月形的尾弧，身後拉出紅白速度線，浮出「八尺瓊勾玉」。適合鼬的八尺瓊勾玉（proj 的 fx）。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), ang = o.angle || 0, n = o.n || 5, arc = o.arc || 0.9, OR = '#ff8a3a';
      fx.flash('#ffb060', 0.12);
      fx.shock(x, y, 10, 120, 0.4, OR, 6, '#ffe0a0');
      fx.ring(x, y, 10, 90, 0.36, E.glow, 3);
      for (let i = 0; i < n; i++) {
        const a = ang + (n > 1 ? (i / (n - 1) - 0.5) * arc : 0), [px, py] = along(x, y, a, 70, 0), [ex, ey] = along(x, y, a, 280, 0);
        fx.after(i * 0.03, () => {
          fx.glow(px, py, 22 * k, '#ffd27a', 0.3, 0.9, 0.2);
          fx.slash(px, py, a - 1.1, 2.2, 26 * k, OR, 7, 0.32, { core: '#ffe0a0', trail: 3 }); // 彎月尾
          fx.streak(px, py, ex, ey, 3, '#ffffff', 0.2, true);
          fx.streak(px, py, ex, ey, 7, OR, 0.26, true);
        });
      }
      fx.embers(x, y, OR, fx.budget(8), 50, 120);
      fx.text(x, y - 60, '八尺瓊勾玉', '#ffd27a', 22);
      fx.punch(0.015, x, y); fx.shake(5, ang);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
