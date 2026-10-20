'use strict';
// 特效庫｜突刺（thrust / cross / slashline / iaido / thunderpath / beam / fistrain）：直線穿刺、斬線、居合衝刺、遲裂居合、雷槌軌跡、光束與拳雨
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
// o：E 元素主題、angle 方向、len 長度、width 寬度、dur 衝刺時間、k 綜合倍率、src 施放者
(function (G) {
  const BD = G.BD;

  BD.defineEffect('thrust', {
    name: '突刺', category: '突刺',
    desc: '沿直線貫穿的細長刃光：明亮光束與中軸拖影，尖端爆出放射火花。適合長槍、角撞等單點穿刺。',
    params: { len: 200, width: 40 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, len = o.len || 200, w = (o.width || 40) * 0.6;
      const ang = o.angle || 0;
      const tx = x + Math.cos(ang) * len, ty = y + Math.sin(ang) * len;
      fx.beam(x, y, tx, ty, w * Math.min(1.5, k), E.glow, 0.2, E.core);
      fx.streak(x, y, tx, ty, Math.max(2, w * 0.3), E.glow, 0.22, true);
      fx.flashAt(tx, ty, 14 + 10 * k, E.core, 0.12);
      fx.sparkle(tx, ty, E.core, Math.round(6 * k), 300, ang, 0.6);
      fx.motes(tx, ty, E, Math.round(4 * k), 20, 120);
      fx.shake(Math.min(8, 2 * k));
    },
  });

  BD.defineEffect('cross', {
    name: '斬線', category: '突刺',
    desc: '一道貫穿整個畫面的筆直斬線：粗光束加兩端垂直飛散的火花，沿線留有元素微光。適合多重斬擊、影分身追斬。',
    params: { len: 200, width: 40 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, len = o.len || 200, w = o.width || 40;
      const ang = o.angle || 0;
      const tx = x + Math.cos(ang) * len, ty = y + Math.sin(ang) * len;
      fx.beam(x, y, tx, ty, w * Math.min(1.4, k), E.glow, 0.3, E.core);
      fx.sparkle(x, y, E.core, Math.round(6 * k), 320, ang + Math.PI / 2, 0.5);
      fx.sparkle(tx, ty, E.core, Math.round(6 * k), 320, ang + Math.PI / 2, 0.5);
      const n = Math.max(2, Math.round(len / 60));
      for (let i = 1; i <= n; i++) {
        const t = i / (n + 1);
        fx.motes(x + (tx - x) * t, y + (ty - y) * t, E, 1, 8, 70);
      }
      if (k > 1.3) fx.flashAt(x, y, 12 * k, E.core, 0.1);
      fx.shake(Math.min(6, 1.5 * k));
    },
  });

  BD.defineEffect('slashline', {
    name: '居合一閃', category: '突刺',
    desc: '衝刺穿身的一閃：衝刺途中留下多道殘影，落定後從起點到終點劃出白熱貫穿光束。適合高速突進斬、居合拔刀。',
    params: { len: 200, width: 40, dur: 0.3 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, len = o.len || 200, dur = o.dur || 0.3;
      const ang = o.angle || 0, src = o.src || null;
      const ex = src && src.x != null ? src.x : x + Math.cos(ang) * len;
      const ey = src && src.y != null ? src.y : y + Math.sin(ang) * len;
      const segs = 4;
      for (let i = 1; i <= segs; i++) {
        fx.after(dur * i / segs, () => {
          if (src) fx.ghost(src, 0.3, E.glow);
          else {
            const t = i / segs;
            fx.streak(x + (ex - x) * (t - 1 / segs), y + (ey - y) * (t - 1 / segs), x + (ex - x) * t, y + (ey - y) * t, 6, E.glow, 0.2, true);
          }
        });
      }
      fx.after(dur, () => {
        const sx = src && src.x != null ? src.x : ex, sy = src && src.y != null ? src.y : ey;
        fx.beam(x, y, sx, sy, 10 * Math.min(1.4, k), '#ffffff', 0.3, E.core);
        fx.beam(x, y, sx, sy, 18 * Math.min(1.5, k), E.glow, 0.34, E.core);
        fx.streak(x, y, sx, sy, 5, E.core, 0.4, true);
        fx.flashAt(x, y, 18, E.core, 0.14);
        fx.flashAt(sx, sy, 18, E.core, 0.14);
        const n = Math.round(10 * k);
        const a = Math.atan2(sy - y, sx - x);
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          fx.sparkle(x + (sx - x) * t, y + (sy - y) * t, E.core, 1, 240, a + Math.PI / 2, 1.4);
        }
        fx.motes(sx, sy, E, Math.round(6 * k), 30, 140);
        fx.shake(Math.min(8, 3 * k));
      });
    },
  });

  BD.defineEffect('iaido', {
    name: '居合・遲裂', category: '突刺',
    desc: '快到看不見的拔刀：衝刺途中只留下淡淡殘影，收刀後空中懸著一條細白刀痕，delay 秒後才沿線猛然裂開——白熱光束、裂口兩側錯開的亮線、往兩側噴濺的火花與全屏一閃。適合居合、拔刀術等「斬完才裂」的突進斬。',
    params: { len: 200, width: 40, dur: 0.3, delay: 0.3 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, len = o.len || 200, dur = o.dur || 0.3, delay = o.delay;
      const ang = o.angle || 0, src = o.src || null;
      for (let i = 1; i <= 3; i++) fx.after(dur * i / 3, () => { if (src) fx.ghost(src, 0.18, '#ffffff'); });
      fx.after(dur, () => {
        const sx = src && src.x != null ? src.x : x + Math.cos(ang) * len, sy = src && src.y != null ? src.y : y + Math.sin(ang) * len;
        // 懸在空中的刀痕：短命的細光束接力，亮度維持到裂開
        for (let t = 0; t < delay; t += 0.1) fx.after(t, () => fx.beam(x, y, sx, sy, 2.5, '#ffffff', 0.14));
        fx.flashAt(sx, sy, 10, '#ffffff', 0.08);
        fx.sparkle(sx, sy, '#ffffff', 3, 120);
        fx.after(delay, () => {
          const a = Math.atan2(sy - y, sx - x), nx = -Math.sin(a), ny = Math.cos(a);
          fx.beam(x, y, sx, sy, 26 * Math.min(1.5, k), E.glow, 0.32, E.core);
          fx.beam(x, y, sx, sy, 8, '#ffffff', 0.26, E.core);
          // 裂口兩側的亮線往外錯開，像空間被切開
          for (const s of [-1, 1]) fx.streak(x + nx * s * 7, y + ny * s * 7, sx + nx * s * 7, sy + ny * s * 7, 3, E.core, 0.35, true);
          const n = Math.round(12 * k);
          for (let i = 0; i < n; i++) {
            const t = (i + 0.5) / n;
            fx.sparkle(x + (sx - x) * t, y + (sy - y) * t, E.core, 1, 280, a + (i % 2 ? 1 : -1) * Math.PI / 2, 0.6);
          }
          fx.flashAt(x, y, 20, E.core, 0.14);
          fx.flashAt(sx, sy, 20, E.core, 0.14);
          fx.motes(sx, sy, E, Math.round(6 * k), 30, 140);
          fx.flash('#ffffff', 0.12);
          fx.shake(Math.min(10, 4 * k), a + Math.PI / 2);
        });
      });
    },
  });

  BD.defineEffect('thunderpath', {
    name: '雷槌軌跡', category: '突刺',
    desc: '飛行的雷槌劃過的直線：整條路徑竄起鋸齒電弧、留下一條緩緩褪去的發光軌跡，兩側迸出火花與元素微粒。scale 越大越亮（例如迴旋返回的第二段）。適合投擲武器的去程 / 回程、雷電直線攻擊。',
    params: { len: 400, width: 40 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, len = o.len || 400, ang = o.angle || 0;
      const c = Math.cos(ang), s = Math.sin(ang), nx = -s, ny = c, tx = x + c * len, ty = y + s * len;
      fx.beam(x, y, tx, ty, (o.width || 40) * 0.35 * Math.min(1.6, k), E.glow, 0.8, E.core);
      // 鋸齒電弧：沿路徑分段、左右亂擺
      for (let j = 0; j < 2; j++) {
        let px = x, py = y;
        const n = Math.max(6, Math.round(len / 45));
        for (let i = 1; i <= n; i++) {
          const t = i / n, off = (BD.vrng() - 0.5) * 30 * Math.min(1.5, k);
          const qx = x + c * len * t + nx * off, qy = y + s * len * t + ny * off;
          fx.streak(px, py, qx, qy, j ? 1.5 : 3, j ? '#ffffff' : E.glow, 0.25 + BD.vrng() * 0.15, true);
          px = qx; py = qy;
        }
      }
      const m = Math.max(3, Math.round(len / 80));
      for (let i = 0; i < m; i++) {
        const t = (i + 0.5) / m;
        fx.sparkle(x + c * len * t, y + s * len * t, E.core, 2, 260, ang + (i % 2 ? 1 : -1) * Math.PI / 2, 0.6);
        fx.motes(x + c * len * t, y + s * len * t, E, 1, 10, 100);
      }
      fx.shake(Math.min(10, 4 * k), ang + Math.PI / 2);
    },
  });

  BD.defineEffect('beam', {
    name: '光束', category: '突刺',
    desc: '粗大筆直的能量光束：起點聚光、沿線元素微粒、終點爆閃。適合雷射、吐息直線、法術砲擊。',
    params: { len: 200, width: 40 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, len = o.len || 200, w = (o.width || 40) * Math.min(1.5, k);
      const ang = o.angle || 0;
      const tx = x + Math.cos(ang) * len, ty = y + Math.sin(ang) * len;
      fx.beam(x, y, tx, ty, w, E.glow, 0.4, E.core);
      fx.beam(x, y, tx, ty, Math.max(3, w * 0.35), E.core, 0.4, E.core);
      fx.glow(x, y, w * 0.9, E.glow, 0.35, 0.8, 0.5);
      const n = Math.max(1, Math.floor(len / 60));
      for (let i = 1; i <= n; i++) {
        const t = i / (n + 1);
        fx.motes(x + (tx - x) * t, y + (ty - y) * t, E, 2, 14, 120);
      }
      fx.flashAt(tx, ty, w * 0.7 + 10, E.core, 0.16);
      fx.sparkle(tx, ty, E.core, Math.round(6 * k), 300, ang, 0.7);
      fx.shake(Math.min(18, 8 * Math.min(k, 1.5)));
    },
  });

  BD.defineEffect('fistrain', {
    name: '拳雨', category: '突刺',
    desc: '快到化成一片的連打：整條直線閃一下，前方塞滿忽隱忽現的拳影光點與放射速度線，金色鋸齒電弧沿路竄過，終點炸開前緣明亮的震波與向前噴的火花。適合黃昏流星拳、真・神之右這類「看不見的拳雨」收尾。',
    params: { len: 260, width: 130 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, V = BD.vrng, ang = o.angle || 0, len = o.len || 260, w = o.width || 130;
      const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;
      const at = (t, l) => [x + ca * len * t + nx * l, y + sa * len * t + ny * l];
      fx.flash(E.glow, 0.16);
      for (let i = 0; i < 14; i++) { // 1. 速度線：由施放者向前放射
        const l = (V() - 0.5) * w * 1.3, [x1, y1] = at(0.05 + 0.15 * V(), l * 0.4), [x2, y2] = at(0.75 + 0.35 * V(), l);
        fx.streak(x1, y1, x2, y2, 2 + 2 * V(), i % 3 ? E.core : E.glow, 0.22 + 0.1 * V(), true);
      }
      const n = fx.budget(Math.round(18 * Math.min(1.6, k)));
      for (let i = 0; i < n; i++) { // 2. 拳影：沿直線一個接一個亮起的拳頭殘像
        const [px, py] = at(0.25 + 0.75 * V(), (V() - 0.5) * w), s = (12 + 8 * V()) * Math.min(1.4, k);
        fx.after(i * 0.014, () => { fx.glow(px, py, s, E.core, 0.22, 0.85, 0.6); fx.ring(px, py, s * 0.3, s * 1.4, 0.18, E.glow, 3); });
      }
      for (let j = 0; j < 3; j++) { // 3. 金色鋸齒電弧（動畫中拳雨周圍竄動的電光）
        let [px, py] = at(0.1, (V() - 0.5) * w);
        for (let s = 1; s <= 5; s++) {
          const [qx, qy] = at(0.1 + s * 0.18, (V() - 0.5) * w * 1.1);
          fx.streak(px, py, qx, qy, 3, E.glow, 0.3, true); px = qx; py = qy;
        }
      }
      const [tx, ty] = at(1, 0);
      fx.after(0.1, () => { // 4. 終點衝擊
        fx.shock(tx, ty, 10, w * 0.95, 0.4, E.glow, 6 * Math.min(1.5, k), E.core);
        fx.flashAt(tx, ty, w * 0.8, '#ffffff', 0.18);
        fx.sparkle(tx, ty, E.core, Math.round(12 * k), 420, ang, 0.9);
        fx.motes(tx, ty, E, Math.round(8 * k), w * 0.4, 180);
        fx.shake(Math.min(16, 8 * k), ang);
      });
    },
  });
  // 波賽頓「怒れる波濤」：動畫分鏡＝一記接一記的槍突，每一突都是白藍放射線炸開的浪頭（scale ≥ 1.3 的收尾突帶書法字「怒濤」）
  BD.defineEffect('amphitrite', {
    name: '怒濤連刺', category: '突刺',
    desc: '荒海巨浪般的一記快突：白熱槍光貫穿到終點、前方推出一道弧形浪頭、由施放者向前放射的白藍速度線、尖端炸開浪花與火花；scale ≥ 1.3 的收尾一突再加暗藍暗幕、全屏白閃、震波與書法字「怒濤」。適合一連串的快速突刺（每一突各放一次）。',
    params: { len: 380, width: 70 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), V = BD.vrng, ang = o.angle || 0, len = o.len || 380, w = o.width || 70;
      const c = Math.cos(ang), s = Math.sin(ang), nx = -s, ny = c, tx = x + c * len, ty = y + s * len;
      fx.beam(x, y, tx, ty, w * 0.5 * k, E.glow, 0.24, E.core);
      fx.beam(x, y, tx, ty, Math.max(3, w * 0.14), '#ffffff', 0.2, '#ffffff');
      fx.slash(x, y, ang, 0.7, len * 0.92, E.glow, 14 * k, 0.28, { core: E.core, trail: 2 }); // 前方的浪頭
      for (let i = 0; i < 8; i++) { // 放射速度線
        const l = (V() - 0.5) * w * 1.7, a0 = 0.05 + 0.2 * V(), a1 = 0.75 + 0.35 * V();
        fx.streak(x + c * len * a0 + nx * l * 0.3, y + s * len * a0 + ny * l * 0.3, x + c * len * a1 + nx * l, y + s * len * a1 + ny * l, 2 + 2 * V(), i % 2 ? E.core : E.glow, 0.2 + 0.1 * V(), true);
      }
      fx.flashAt(tx, ty, 24 + 16 * k, E.core, 0.14);
      fx.shock(tx, ty, 6, w * 0.9, 0.3, E.glow, 4, E.core);
      fx.sparkle(tx, ty, E.core, fx.budget(Math.round(8 * k)), 380, ang, 0.9);
      fx.motes(tx, ty, E, Math.round(5 * k), 24, 160);
      if ((o.scale || 1) >= 1.3) {
        fx.veil(0.45, 0.4, '#02081a'); fx.flash(E.glow, 0.3);
        fx.shock(x, y, 12, len * 0.8, 0.5, E.glow, 8, E.core);
        fx.text(x + c * len * 0.5, y + s * len * 0.5 - 44, '怒濤', '#e8fbff', 46);
      }
      fx.shake(Math.min(9, 2.5 * k), ang);
    },
  });

  // 波賽頓三叉槍：三根槍齒各自貫穿（中央一根最長）、槍身周圍纏著螺旋水流、尖端浪花炸開
  BD.defineEffect('triprong', {
    name: '三叉穿刺', category: '突刺',
    desc: '三叉槍的一記貫穿：三道平行的白藍槍光（中央最長、兩側齒尖帶倒鉤弧）、沿槍身纏繞的螺旋水流與氣泡、尖端炸開浪花與三叉形的閃光。適合三叉戟 / 多齒長槍的單點重刺。',
    params: { len: 450, width: 56 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), ang = o.angle || 0, len = o.len || 450, w = o.width || 56, sp = w * 0.62;
      const c = Math.cos(ang), s = Math.sin(ang), nx = -s, ny = c, tx = x + c * len, ty = y + s * len;
      for (const side of [-1, 0, 1]) { // 三根槍齒：兩側略短
        const L = side ? len * 0.9 : len, ex = x + c * L + nx * side * sp, ey = y + s * L + ny * side * sp;
        fx.beam(x + nx * side * sp * 0.3, y + ny * side * sp * 0.3, ex, ey, (side ? 9 : 15) * Math.min(1.4, k), E.glow, 0.26, E.core);
        fx.beam(x + nx * side * sp * 0.3, y + ny * side * sp * 0.3, ex, ey, 3, '#ffffff', 0.2, '#ffffff');
        if (side) fx.slash(ex - c * 26, ey - s * 26, ang + side * 0.9, 1.2, 30, E.core, 5, 0.22); // 倒鉤
      }
      for (let i = 0; i < 12; i++) { // 螺旋水流
        const t = (i + 0.5) / 12, a = t * 9, l = Math.sin(a) * w * 0.5;
        fx.after(t * 0.1, () => { fx.glow(x + c * len * t + nx * l, y + s * len * t + ny * l, 10, E.particle, 0.2, 0.7, 0.4); if (i % 3 === 0) fx.motes(x + c * len * t, y + s * len * t, E, 1, 10, 80); });
      }
      fx.flashAt(tx, ty, 30 + 16 * k, E.core, 0.15);
      fx.shock(tx, ty, 6, w * 1.2, 0.32, E.glow, 5, E.core);
      for (const side of [-1, 0, 1]) fx.sparkle(tx + nx * side * sp, ty + ny * side * sp, E.core, fx.budget(5), 360, ang + side * 0.35, 0.5);
      fx.shake(Math.min(10, 3 * k), ang);
    },
  });

  BD.defineEffect('totsuka', {
    name: '十拳劍', category: '突刺',
    desc: '須佐能乎揮下十拳劍的巨斬：場地一暗，三道蒼紫的巨大月牙斬氣（內芯白熱）接連朝前方滾出，沿著斬線留下一道白熱劍痕，地面沿線裂開，一圈圈震波推向終點；終點三圈光環向內收束（被吸進酒壺）並浮出「封」字。適合封印、巨劍劈砍、一刀兩斷的靈劍。',
    params: { len: 300 },
    spawn(fx, x, y, o) {
      const V = BD.vrng, ang = o.angle || 0, len = o.len || 300, c = Math.cos(ang), s = Math.sin(ang), x2 = x + c * len, y2 = y + s * len;
      fx.veil(0.7, 0.6, '#04020a');
      fx.flash('#cfc2ff', 0.35);
      for (let i = 0; i < 4; i++) fx.after(i * 0.05, () => { // 月牙斬氣一波波滾出（半徑隨波次推遠）
        const rr = len * (0.38 + 0.2 * i);
        fx.slash(x, y, ang, 2.1 - 0.3 * i, rr, '#8a7aff', 46 - 6 * i, 0.45, { core: '#ffffff', trail: 3 });
        fx.slash(x, y, ang, 1.9 - 0.3 * i, rr, '#e6dcff', 16, 0.38, { core: '#ffffff' });
      });
      fx.beam(x, y, x2, y2, 16, '#e6dcff', 0.45, '#ffffff'); // 劍痕
      for (let i = 1; i <= 5; i++) fx.after(0.03 * i, () => { // 沿線地裂與震波
        const q = i / 5, px = x + c * len * q, py = y + s * len * q;
        fx.crack(px, py, 70, 'rgba(10,0,30,0.5)', 6, '#a89cff', 5);
        fx.shock(px, py, 8, 70 + 30 * q, 0.35, '#cfc2ff', 5, '#ffffff');
        fx.sparkle(px, py, '#e6dcff', fx.budget(6), 300, ang + Math.PI / 2, 2.6);
      });
      fx.flashAt(x2, y2, 110, '#cfc2ff', 0.2);
      for (let i = 0; i < 3; i++) fx.after(0.18 + i * 0.08, () => fx.ring(x2, y2, 120 - i * 32, 10, 0.3, '#cfc2ff', 4)); // 封印收束
      fx.after(0.5, () => { fx.text(x2, y2 - 44, '封', '#e6dcff', 50); fx.shock(x2, y2, 10, 130, 0.45, '#cfc2ff', 6, '#ffffff'); fx.sparkle(x2, y2, '#e6dcff', fx.budget(14), 380); });
      fx.shake(12);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
