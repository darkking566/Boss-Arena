'use strict';
// 特效庫｜亞當專屬（fistjab / meteorfist / replicaaxe / serpentclaw / wardnova / edenblink / rushfist / guardbash / truefist / chronofist / sightstance）：
// 每個招式一組自己的演出——音爆直拳、流星拳、複製的斧影、蛇爪裂、庇護圓頂、伊甸殘影、衝拳、我慢、真・神之右、時鐘之拳、神虛視架式。
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
(function (G) {
  const BD = G.BD, TAU = Math.PI * 2;

  // 沿角度 ang 從 (x,y) 前進 d、側移 l 的點
  const along = (x, y, ang, d, l) => [x + Math.cos(ang) * d - Math.sin(ang) * (l || 0), y + Math.sin(ang) * d + Math.cos(ang) * (l || 0)];

  BD.defineEffect('fistjab', {
    name: '音爆直拳', category: '突刺',
    desc: '快到打破音障的一拳：細長的光束貫穿拳路，拳鋒炸出音爆環與兩道向後掠開的圓錐亮線、前噴的火花；scale ≥ 1.2 的重拳再多一圈震波、鏡頭衝擊與擴散的電光。適合亞光速直拳、普攻與背擊。',
    params: { len: 170, width: 80 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), V = BD.vrng, ang = o.angle || 0, len = o.len || 170, w = (o.width || 80) * 0.5, sc = o.scale || 1;
      const [tx, ty] = along(x, y, ang, len, 0);
      fx.beam(x, y, tx, ty, w * 0.45 * k, E.glow, 0.16, E.core);
      fx.beam(x, y, tx, ty, Math.max(2, w * 0.08), '#ffffff', 0.14, '#ffffff');
      for (const s of [-1, 1]) { // 音爆圓錐：由拳鋒向後掠開
        const [bx, by] = along(x, y, ang, len * 0.35, s * w * 0.95);
        fx.streak(tx, ty, bx, by, 3, E.core, 0.2, true);
      }
      fx.ring(tx, ty, 4, 26 * k + 10, 0.2, E.core, 3);
      fx.flashAt(tx, ty, 16 + 12 * k, E.core, 0.12);
      fx.sparkle(tx, ty, E.core, fx.budget(Math.round(6 * k)), 320, ang, 0.7);
      fx.motes(tx, ty, E, Math.round(3 * k), 16, 120);
      if (sc >= 1.2) {
        fx.shock(tx, ty, 8, w * 1.5, 0.3, E.glow, 5, E.core);
        for (let i = 0; i < 3; i++) { // 電光沿拳路竄動
          let [px, py] = along(x, y, ang, len * 0.1, (V() - 0.5) * w);
          for (let j = 1; j <= 3; j++) { const [qx, qy] = along(x, y, ang, len * (0.1 + j * 0.3), (V() - 0.5) * w * 1.2); fx.streak(px, py, qx, qy, 2.5, E.glow, 0.22, true); px = qx; py = qy; }
        }
        fx.punch(0.02, tx, ty); fx.shake(Math.min(10, 4 * k), ang);
      } else fx.shake(Math.min(5, 1.8 * k));
    },
  });

  BD.defineEffect('meteorfist', {
    name: '流星拳', category: '突刺',
    desc: '拳速一拳比一拳快的流星群：每一拳都是一顆斜斜劃過拳路的彗星（拖著長長的尾線）、拳鋒的星芒與細小震環，每下左右側移讓連打看起來像一片流星雨；scale ≥ 1.4 的收尾重拳是一顆巨大的彗星，砸出震波、八道星芒碎光與鏡頭衝擊。適合黃昏流星群、真・神之右的連打。',
    params: { len: 235, width: 105 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), V = BD.vrng, ang = o.angle || 0, len = o.len || 235, w = o.width || 105, big = (o.scale || 1) >= 1.4;
      const l = (V() - 0.5) * w * 0.9, [tx, ty] = along(x, y, ang, len * (0.72 + 0.25 * V()), l);
      const [sx, sy] = along(x, y, ang, len * 0.1, l + (V() < 0.5 ? -1 : 1) * w * 0.7); // 彗星從斜後方掠入
      fx.streak(sx, sy, tx, ty, big ? 9 : 3.5, E.core, big ? 0.3 : 0.16, true);
      fx.streak(sx, sy, tx, ty, big ? 18 : 7, E.glow, big ? 0.34 : 0.18, true);
      fx.flashAt(tx, ty, big ? 70 : 14 + 8 * k, E.core, big ? 0.2 : 0.1);
      fx.ring(tx, ty, 3, big ? 70 : 20, big ? 0.3 : 0.16, E.glow, big ? 5 : 2);
      fx.sparkle(tx, ty, E.core, fx.budget(big ? 12 : 3), big ? 420 : 240, ang, 1.2);
      if (!big) return;
      fx.beam(x, y, ...along(x, y, ang, len, 0), w * 0.5, E.glow, 0.22, E.core);
      fx.shock(tx, ty, 10, w * 1.2, 0.4, E.glow, 7, E.core);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, [px, py] = along(tx, ty, a, 70, 0); fx.streak(tx, ty, px, py, 3, E.core, 0.26, true); } // 星芒碎光
      fx.motes(tx, ty, E, 8, 50, 200); fx.punch(0.03, tx, ty); fx.shake(11, ang);
    },
  });

  BD.defineEffect('replicaaxe', {
    name: '複製神斧', category: '斬擊',
    desc: '被複製的神之斧：場地一暗，漆黑的寬大斧面與白熱斧刃掃過整個扇面，隨後一道更淡的斧影「複製」般重疊再掃一次（施放者殘影疊出），刃緣依序噴火花、掃擊終點裂地；搭配 replica 元素是粉紅的複製斧、搭配 blood 是染血的斧。適合亞當的神之斧。',
    params: { arc: 3.5 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), ang = o.angle || 0, arc = o.arc || 3.5, r = o.radius || 230, src = o.src || null;
      fx.veil(0.5, 0.5, '#000000'); fx.flash(E.glow, 0.2);
      fx.slash(x, y, ang, arc, r * 0.72, '#16100e', r * 0.42, 0.4, { core: null, trail: 3, rim: E.glow });
      fx.slash(x, y, ang, arc, r * 0.95, E.glow, 14 * k, 0.4, { core: E.core, trail: 4 });
      for (let i = 0; i < 7; i++) {
        const a = ang - arc / 2 + arc * (i + 0.5) / 7, [px, py] = along(x, y, a, r * 0.95, 0);
        fx.after(i * 0.025, () => fx.sparkle(px, py, E.core, 3, 300, a + Math.PI / 2, 0.7));
      }
      fx.after(0.14, () => { // 複製：同一把斧再疊一次，較淡較細
        if (src) fx.ghost(src, 0.35, E.glow);
        fx.slash(x, y, ang, arc * 0.96, r * 1.0, E.core, 6, 0.3, { core: '#ffffff', trail: 2 });
        fx.ring(x, y, r * 0.3, r * 1.05, 0.28, E.glow, 3);
        fx.motes(x, y, E, Math.round(8 * k), r * 0.6, 160);
      });
      const [hx, hy] = along(x, y, ang + arc / 2, r * 0.85, 0);
      fx.after(0.2, () => { fx.crack(hx, hy, r * 0.35, E.decal, 6, E.crack, 5); fx.debris(hx, hy, E.debris, Math.round(8 * k), 260, 4 + k, r * 0.1); fx.flashAt(hx, hy, r * 0.35, E.core, 0.14); });
      fx.shake(Math.min(18, 9 * k));
    },
  });

  BD.defineEffect('serpentclaw', {
    name: '蛇爪裂', category: '斬擊',
    desc: '模仿蛇神的鱗爪撕裂：一條細線先懸在空中、三根白骨爪的細線依序亮起，hold 秒後三道平行的粗爪痕猛然裂開、尖端噴出骨白火花與毒液、地面留下發光裂痕；多道爪痕同時到期即一齊撕開。scale ≥ 1.4 的收尾爪再多一圈震波與書法字「裂」。適合亞當的蛇神之爪（slashes 的 fx）。',
    params: { len: 380, width: 34, hold: 0.5 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), V = BD.vrng, ang = o.angle || 0, len = o.len || 380, w = (o.width || 34), hold = Math.max(0, o.hold || 0), big = (o.scale || 1) >= 1.4;
      const lane = w * 0.55, [tx, ty] = along(x, y, ang, len, 0);
      for (let t = 0; t < hold; t += 0.1) fx.after(t, () => { // 懸著的三根爪線，逐漸亮起
        for (const s of [-1, 0, 1]) { const [ax, ay] = along(x, y, ang, 0, s * lane), [bx, by] = along(x, y, ang, len, s * lane); fx.beam(ax, ay, bx, by, 2, t / Math.max(hold, 0.1) > 0.6 ? E.glow : '#ffffff', 0.12); }
      });
      fx.after(hold, () => {
        for (const s of [-1, 0, 1]) {
          const [ax, ay] = along(x, y, ang, 0, s * lane), [bx, by] = along(x, y, ang, len, s * lane);
          fx.beam(ax, ay, bx, by, w * 0.55 * k, E.glow, 0.4, E.core);
          fx.beam(ax, ay, bx, by, 5, '#f4f0e0', 0.3, '#ffffff');
          fx.sparkle(bx, by, '#f4f0e0', 4, 300, ang, 0.6);
        }
        const n = Math.max(3, Math.round(len / 70));
        for (let i = 0; i < n; i++) {
          const [px, py] = along(x, y, ang, len * (i + 0.5) / n, 0);
          fx.sparkle(px, py, E.core, 1, 300, ang + (i % 2 ? 1 : -1) * Math.PI / 2, 0.5);
          if (i % 2) { fx.motes(px, py, E, 2, 12, 90); fx.crack(px, py, w * 0.8, E.decal, 7, E.crack, 3); }
        }
        fx.smoke(tx, ty, E.smoke, 4, 30); fx.flash(E.core, big ? 0.3 : 0.14); fx.shake(Math.min(12, 4 * k), ang + Math.PI / 2);
        if (big) { fx.shock(tx, ty, 8, w * 2.2, 0.4, E.glow, 6, E.core); fx.text(tx, ty - 40, '裂', E.glow, 40); fx.punch(0.03, tx, ty); }
      });
    },
  });

  BD.defineEffect('wardnova', {
    name: '庇護圓頂', category: '震波',
    desc: '為了孩子的庇護：六角形的護盾圓頂由施放者腳下層層撐開（六邊形的亮線一圈比一圈大），金色光暈向外推開近身敵人，光點如羽毛般緩緩飄起並浮出「護」。適合護盾、震開近身敵人的防禦招式。',
    params: { radius: 190 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), V = BD.vrng, r = o.radius || 190, src = o.src || null;
      fx.flash(E.glow, 0.2); fx.glow(x, y, r * 0.9, E.glow, 0.7, 0.5, 0.4, src);
      fx.shock(x, y, 10, r, 0.4, E.glow, 8, E.core);
      for (let j = 0; j < 3; j++) fx.after(j * 0.09, () => { // 六角形圓頂：每圈轉一點、大一點
        const rr = r * (0.55 + 0.22 * j), off = j * 0.3;
        for (let i = 0; i < 6; i++) {
          const a0 = off + i / 6 * TAU, a1 = off + (i + 1) / 6 * TAU, [ax, ay] = along(x, y, a0, rr, 0), [bx, by] = along(x, y, a1, rr, 0);
          fx.beam(ax, ay, bx, by, 3, j === 2 ? E.core : E.glow, 0.5 - j * 0.08, E.core);
          if (j === 2) fx.sparkle(ax, ay, E.core, 2, 160, a0, 1);
        }
      });
      fx.ring(x, y, r * 0.3, r * 1.1, 0.5, '#ffffff', 2);
      for (let i = 0; i < 10; i++) { const a = V() * TAU, d = r * 0.3 * V() + 20; fx.after(i * 0.05, () => fx.motes(x + Math.cos(a) * d, y + Math.sin(a) * d, E, 1, 10, 60)); }
      fx.text(x, y - r * 0.4, '護', E.core, 32); fx.shake(Math.min(7, 3 * k));
    },
  });

  BD.defineEffect('edenblink', {
    name: '伊甸殘影', category: '位移',
    desc: '複製式的瞬間移動：起點的光環向內收束、留下一道輪廓殘影，沿路依序亮起五顆拖尾光點與一條細亮線，終點浮出光環與放射的光點並再留一道殘影。適合亞當的伊甸背擊等閃到背後的位移（blink 的 fx）。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), src = o.src || null, r = src && src.r ? src.r : 30, tx = o.toX != null ? o.toX : x, ty = o.toY != null ? o.toY : y;
      fx.ring(x, y, r * 2.4, r * 0.4, 0.2, E.glow, 4);
      fx.flashAt(x, y, r * 1.4, E.core, 0.12);
      if (src) fx.ghost(src, 0.4, E.glow);
      fx.streak(x, y, tx, ty, 5, E.core, 0.25, true);
      for (let i = 1; i <= 5; i++) { const t = i / 6; fx.after(i * 0.025, () => fx.glow(x + (tx - x) * t, y + (ty - y) * t, r * 1.1, E.glow, 0.25, 0.6, 0.2)); }
      fx.after(0.12, () => {
        fx.ring(tx, ty, r * 0.4, r * 2.6, 0.3, E.core, 4); fx.shock(tx, ty, 6, r * 2, 0.3, E.glow, 4, E.core);
        fx.sparkle(tx, ty, E.core, fx.budget(Math.round(10 * k)), 300); fx.motes(tx, ty, E, 6, r, 140);
        if (src) fx.ghost(src, 0.3, E.core);
      });
    },
  });

  BD.defineEffect('rushfist', {
    name: '衝拳', category: '位移',
    desc: '一頭撞出去的直線強襲拳：起步炸出向後的風壓錐與地面震環，沿路拖著殘影，到終點一拳砸出震波、裂地與前噴的火花（附在 dash 的 fx，另會自動播放 dash 的殘影）。適合不穿甲冑、全靠肉身的突進拳。',
    params: { len: 360, dur: 0.16 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), V = BD.vrng, ang = o.angle || 0, len = o.len || 360, dur = o.dur || 0.16, src = o.src || null;
      fx.shock(x, y, 6, 70 * k, 0.3, E.glow, 5, E.core); fx.sparkle(x, y, E.core, fx.budget(8), 320, ang + Math.PI, 0.8);
      for (let i = 0; i < 6; i++) { const l = (V() - 0.5) * 70, [ax, ay] = along(x, y, ang, 10, l), [bx, by] = along(x, y, ang, -90 - 60 * V(), l * 1.5); fx.streak(ax, ay, bx, by, 3, E.core, 0.22, true); } // 風壓
      for (let i = 1; i <= 4; i++) fx.after(dur * i / 4, () => src && fx.ghost(src, 0.25, E.glow));
      const [tx, ty] = along(x, y, ang, len, 0);
      fx.after(dur, () => {
        fx.shock(tx, ty, 8, 110 * k, 0.35, E.glow, 7, E.core); fx.crack(tx, ty, 70, E.decal, 6, E.crack, 4);
        fx.flashAt(tx, ty, 70, E.core, 0.14); fx.sparkle(tx, ty, E.core, fx.budget(Math.round(12 * k)), 420, ang, 1);
        fx.debris(tx, ty, E.debris, Math.round(6 * k), 240, 3.5, 30); fx.punch(0.025, tx, ty); fx.shake(Math.min(12, 6 * k), ang);
      });
    },
  });

  BD.defineEffect('guardbash', {
    name: '我慢對轟', category: '砸地',
    desc: '站著硬碰硬的對轟：貼地擴散的震環、輻射狀的短火花與小裂縫，每一下都像拳頭砸在厚牆上；scale ≥ 0.9 的收尾重拳再暗幕、雙層震波與金色光點，浮出「我慢」。適合原地連打的防禦型對轟。',
    params: { radius: 150 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), r = o.radius || 150, big = (o.scale || 1) >= 0.9;
      fx.shock(x, y, 8, r, big ? 0.5 : 0.28, E.glow, big ? 9 : 5, E.core);
      fx.flashAt(x, y, r * 0.5, E.core, 0.1);
      const n = big ? 12 : 5;
      for (let i = 0; i < n; i++) { const a = i / n * TAU + BD.vrng() * 0.3, [ax, ay] = along(x, y, a, r * 0.3, 0), [bx, by] = along(x, y, a, r * 0.85, 0); fx.streak(ax, ay, bx, by, 2.5, E.core, 0.2, true); }
      fx.crack(x, y, r * 0.6, E.decal, big ? 8 : 4, E.crack, big ? 6 : 3);
      if (!big) { fx.sparkle(x, y, E.core, fx.budget(4), 240); fx.shake(Math.min(6, 2 * k)); return; }
      fx.veil(0.5, 0.45, '#000000'); fx.shock(x, y, 10, r * 1.3, 0.6, '#ffffff', 5, E.core);
      fx.debris(x, y, E.debris, Math.round(14 * k), 380, 5, r * 0.3); fx.motes(x, y, E, 10, r * 0.6, 200);
      fx.text(x, y - r * 0.5, '我慢', E.glow, 34); fx.punch(0.04, x, y); fx.shake(Math.min(20, 12 * k));
    },
  });

  BD.defineEffect('truefist', {
    name: '真・神之右', category: '大招',
    desc: '傾注全力的一記重拳：場地沉入暗幕、拳路上炸出粗大的光束與放射速度線，拳鋒爆開震波、裂地與電光，鏡頭猛然推近並浮出「真・神之右」。適合連打之前那記決定性的重拳。',
    params: { len: 270, width: 110 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), V = BD.vrng, ang = o.angle || 0, len = o.len || 270, w = o.width || 110;
      const [tx, ty] = along(x, y, ang, len, 0);
      fx.veil(0.6, 0.6, '#000000'); fx.flash('#ffffff', 0.3);
      fx.beam(x, y, tx, ty, w * 0.7, E.glow, 0.4, E.core); fx.beam(x, y, tx, ty, w * 0.2, '#ffffff', 0.35, E.core);
      for (let i = 0; i < 10; i++) { const l = (V() - 0.5) * w * 1.4, [ax, ay] = along(x, y, ang, len * 0.1, l * 0.3), [bx, by] = along(x, y, ang, len * (0.8 + 0.4 * V()), l); fx.streak(ax, ay, bx, by, 2 + 2 * V(), i % 2 ? E.core : E.glow, 0.28, true); }
      fx.shock(tx, ty, 10, w * 1.6, 0.5, E.glow, 9, E.core); fx.crack(tx, ty, w * 0.8, E.decal, 8, E.crack, 6); fx.flashAt(tx, ty, w * 1.1, '#ffffff', 0.2);
      fx.sparkle(tx, ty, E.core, fx.budget(Math.round(16 * k)), 460, ang, 1.1); fx.debris(tx, ty, E.debris, Math.round(8 * k), 300, 4.5, w * 0.3);
      fx.text(tx, ty - 50, '真・神之右', E.core, 30); fx.punch(0.045, tx, ty); fx.push(0.05, 0.5, tx, ty); fx.shake(Math.min(20, 11 * k), ang);
    },
  });

  BD.defineEffect('chronofist', {
    name: '時鐘之拳', category: '大招',
    desc: '時間停下又重新流動的一拳：施放者腳下浮出鐘面（十二刻度與兩根指針）、暗幕收束，0.12 秒後整條直線同時炸出雙層光束與連鎖震波；一瞬之後鐘面倒著收回、終點再震一次，彷彿時間倒流。適合亞當的超越時間之拳與大招（dash 的 fx）。',
    params: { len: 540, width: 80 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), V = BD.vrng, ang = o.angle || 0, len = o.len || 540, w = o.width || 80, src = o.src || null, r = (src && src.r ? src.r : 30) * 2.6;
      const [tx, ty] = along(x, y, ang, len, 0);
      fx.veil(0.9, 0.8, '#000000'); fx.flash('#ffffff', 0.3);
      fx.ring(x, y, r, r * 0.9, 0.5, E.core, 4);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, [ax, ay] = along(x, y, a, r * 0.82, 0), [bx, by] = along(x, y, a, r * (i % 3 ? 0.94 : 1.08), 0); fx.streak(ax, ay, bx, by, i % 3 ? 2 : 4, E.core, 0.5, true); }
      const ha = V() * TAU; // 兩根指針
      for (const [d, a] of [[r * 0.7, ha], [r * 0.45, ha + 2.1]]) { const [bx, by] = along(x, y, a, d, 0); fx.streak(x, y, bx, by, 3, E.glow, 0.5, true); }
      fx.after(0.12, () => {
        fx.beam(x, y, tx, ty, w * 1.1, E.glow, 0.45, E.core); fx.beam(x, y, tx, ty, w * 0.25, '#ffffff', 0.55, E.core); fx.flash('#ffffff', 0.5);
        const n = Math.max(4, Math.round(len / 80));
        for (let i = 0; i < n; i++) {
          const [px, py] = along(x, y, ang, len * (i + 0.5) / n, 0);
          fx.after(i * 0.012, () => { fx.shock(px, py, 8, w * 0.9, 0.35, E.glow, 4, E.core); fx.crack(px, py, w * 0.5, E.decal, 8, E.crack, 3); fx.sparkle(px, py, E.core, 2, 360, ang + (i % 2 ? 1 : -1) * Math.PI / 2, 0.6); });
        }
        fx.after(0.1, () => {
          fx.shock(tx, ty, 10, w * 2.2 * k, 0.5, E.glow, 8, E.core); fx.flashAt(tx, ty, w * 1.6, '#ffffff', 0.25);
          fx.debris(tx, ty, E.debris, 8, 320, 5, w * 0.4); fx.motes(tx, ty, E, 8, w, 220); fx.shake(22, ang);
        });
        fx.after(0.3, () => { // 時間倒流：鐘面反向收回
          fx.ring(x, y, r * 1.6, r * 0.2, 0.35, E.glow, 3); fx.ring(tx, ty, w * 2.4, w * 0.3, 0.35, E.core, 3); fx.punch(0.03, tx, ty);
        });
      });
    },
  });

  BD.defineEffect('sightstance', {
    name: '神虛視架式', category: '增益',
    desc: '看穿架式：粉紅的光環由外向內收束成一枚放射輪紋的瞳孔，十二道虹膜線一條條亮起並緩緩旋轉、中心一點白光；life 秒內持續亮著。適合亞當擺出神虛視的見切架式（counter 的 stanceFx）。',
    params: { life: 1.0 },
    spawn(fx, x, y, o) {
      const E = o.E, src = o.src || null, r = (src && src.r ? src.r : 30) * 2.2, life = o.life || 1;
      const pos = () => (src ? [src.x, src.y] : [x, y]);
      fx.ring(x, y, r * 2, r * 0.5, 0.3, E.glow, 4); fx.flashAt(x, y, r * 0.6, E.core, 0.12);
      fx.glow(x, y, r * 1.2, E.glow, life, 0.35, 0.1, src);
      for (let t = 0; t < life; t += 0.14) fx.after(t, () => {
        const [px, py] = pos();
        fx.ring(px, py, r * 0.9, r * 0.75, 0.16, E.glow, 2);
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t * 1.6; fx.streak(...along(px, py, a, r * 0.2, 0), ...along(px, py, a, r * 0.85, 0), 1.6, E.core, 0.16, true); }
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
