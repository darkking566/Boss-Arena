'use strict';
// 特效庫｜斬擊（slash / cleave / whirl / divineaxe）：弧形揮砍、重劈、360° 迴旋斬與神之斧
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
// o：E 元素主題、angle 揮擊方向、arc 張角、radius 半徑、k 綜合倍率、heavy 沉重節奏、src 施放者
(function (G) {
  const BD = G.BD;

  BD.defineEffect('slash', {
    name: '弧斬', category: '斬擊',
    desc: '一道明亮弧刃掃過前方：核心亮線、殘影弧與沿切線飛散的火花。適合一般揮砍、快速連段。',
    params: { arc: 1.6 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.radius || 100;
      const ang = o.angle || 0, arc = o.arc || 1.6;
      const life = o.heavy ? 0.4 : 0.22, width = o.heavy ? 14 : 12;
      fx.slash(x, y, ang, arc, r, E.glow, width, life, { core: E.core, trail: k > 1.3 ? 3 : 2 });
      fx.ghost(o.src, life * 0.8, E.glow); // 揮刀殘影
      const tipA = ang + arc * 0.5, midA = ang;
      const tipX = x + Math.cos(tipA) * r, tipY = y + Math.sin(tipA) * r;
      fx.sparkle(tipX, tipY, E.core, Math.round(6 * k), 300, tipA + Math.PI / 2, 0.8);
      fx.sparkle(tipX, tipY, E.core, Math.round(4 * k), 300, tipA - Math.PI / 2, 0.8);
      for (let i = 0; i < 3; i++) {
        const a = ang + (BD.vrng() - 0.5) * arc;
        fx.motes(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85, E, 1, 10, 90);
      }
      if (k > 1.3) fx.flashAt(x + Math.cos(midA) * r * 0.7, y + Math.sin(midA) * r * 0.7, r * 0.35, E.core, 0.12);
    },
  });

  BD.defineEffect('cleave', {
    name: '重劈', category: '斬擊',
    desc: '更寬更慢的大弧重斬：弧刃前端砸出裂地、閃光與碎石，畫面震動明顯。適合巨型 Boss 的單發重斬。',
    params: { arc: 1.9 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.radius || 140;
      const ang = o.angle || 0, arc = o.arc || 1.9;
      const life = o.heavy ? 0.55 : 0.4, width = (o.heavy ? 22 : 18) * Math.min(1.6, k);
      fx.slash(x, y, ang, arc, r, E.glow, width, life, { core: E.core, trail: 3 });
      fx.ghost(o.src, life * 0.7, E.glow);
      const hx = x + Math.cos(ang) * r * 0.8, hy = y + Math.sin(ang) * r * 0.8;
      fx.crack(hx, hy, r * 0.32, E.decal, o.heavy ? 8 : 6, E.crack, 5);
      fx.flashAt(hx, hy, r * 0.4, E.core, 0.14);
      fx.debris(hx, hy, E.debris, Math.round(8 * k), 240, 3.5 + k, r * 0.12);
      fx.sparkle(hx, hy, E.core, Math.round(8 * k), 280);
      fx.motes(hx, hy, E, Math.round(6 * k), r * 0.2, 140);
      fx.shake(Math.min(18, 6 * k));
    },
  });

  BD.defineEffect('contempt', {
    name: '蔑視斬', category: '斬擊',
    desc: '對虛弱目標的追加一擊：目標身上交叉劃過兩道短促的元素色斬痕，中心一點血紅閃光與向外噴的火花。適合處決、弱點追擊、斬殺被動。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, a = o.angle || 0, L = 46 * Math.min(1.4, k);
      for (const s of [-1, 1]) {
        const an = a + s * Math.PI / 4;
        fx.beam(x - Math.cos(an) * L, y - Math.sin(an) * L, x + Math.cos(an) * L, y + Math.sin(an) * L, 8, E.glow, 0.24, E.core);
      }
      fx.flashAt(x, y, 26, E.core, 0.12);
      fx.sparkle(x, y, E.glow, Math.round(10 * k), 300, a, 1.4);
      fx.shake(Math.min(8, 3 * k));
    },
  });

  BD.defineEffect('whirl', {
    name: '迴旋斬', category: '斬擊',
    desc: '原地 360° 迴旋：兩段半圓弧刃接連掃出，外圈震波擴散、四周火花沿切線飛射。適合旋轉掃擊、清場。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.radius || 110;
      const ang = o.angle || 0;
      const life = o.heavy ? 0.4 : 0.26, width = (o.heavy ? 15 : 12) * Math.min(1.5, k);
      fx.slash(x, y, ang, Math.PI, r, E.glow, width, life, { core: E.core, trail: 2 });
      fx.slash(x, y, ang + Math.PI, Math.PI, r, E.glow, width, life, { core: E.core, trail: 2 });
      fx.shock(x, y, 10, r * 1.1, o.heavy ? 0.5 : 0.35, E.glow, 6 * Math.min(1.6, k), E.core);
      const n = Math.round(8 * k);
      for (let i = 0; i < n; i++) {
        const a = ang + i / n * Math.PI * 2;
        fx.sparkle(x + Math.cos(a) * r, y + Math.sin(a) * r, E.core, 2, 260, a + Math.PI / 2, 0.7);
        fx.motes(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, E, 1, 12, 100);
      }
      if (k > 1.4) fx.flashAt(x, y, r * 0.5, E.core, 0.12);
      fx.shake(Math.min(10, 3 * k));
    },
  });

  BD.defineEffect('divineaxe', {
    name: '神之斧', category: '斬擊',
    desc: '把對手一分為二的迴旋掃踢：場地一暗，腿後浮現一柄巨斧的幻影——漆黑的寬大斧面帶著白熱斧刃掃過整個扇面，殘影疊三層；刃緣沿路噴出火花，最後在掃擊終點裂地。適合巨大的掃踢、斧刃幻影、一刀兩斷的大弧斬。',
    params: { arc: 3.6 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.radius || 230, arc = o.arc || 3.6, ang = o.angle || 0;
      fx.veil(0.4, 0.45, '#000000');
      fx.flash(E.glow, 0.2);
      fx.slash(x, y, ang, arc, r * 0.72, '#16100e', r * 0.42, 0.42, { core: null, trail: 3, rim: E.glow }); // 斧面：漆黑寬弧
      fx.slash(x, y, ang, arc, r * 0.95, E.glow, 14 * Math.min(1.6, k), 0.4, { core: E.core, trail: 4 });   // 斧刃：白熱細弧
      fx.slash(x, y, ang, arc * 0.9, r * 1.02, '#ffffff', 4, 0.22, { core: '#ffffff' });
      const n = 7;
      for (let i = 0; i < n; i++) { // 刃緣沿著掃擊方向依序噴火花
        const a = ang - arc / 2 + arc * (i + 0.5) / n;
        fx.after(i * 0.025, () => fx.sparkle(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95, E.core, 4, 300, a + Math.PI / 2, 0.7));
      }
      const ea = ang + arc / 2, hx = x + Math.cos(ea) * r * 0.85, hy = y + Math.sin(ea) * r * 0.85;
      fx.after(0.18, () => {
        fx.crack(hx, hy, r * 0.35, E.decal, o.heavy ? 8 : 6, E.crack, 5);
        fx.debris(hx, hy, E.debris, Math.round(8 * k), 260, 4 + k, r * 0.1);
        fx.flashAt(hx, hy, r * 0.35, E.core, 0.14);
      });
      fx.motes(x, y, E, Math.round(8 * k), r * 0.6, 160);
      fx.shake(Math.min(20, 9 * k));
    },
  });
  // ── 恐暴龍：咬碎 ──
  BD.defineEffect('devour', {
    name: '咬碎', category: '斬擊',
    desc: '巨顎合攏的一口：兩道弧形顎刃從兩側夾向落點，一排利齒的白線向中心收束，咬合瞬間閃光、骨渣與黃綠色涎沫四濺並浮出「喀」；scale 越大咬得越深（大咬會再震出一圈震波）。適合啃咬、吞食、撕咬。',
    params: { radius: 90 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, V = BD.vrng, sc = o.scale || 1, r = (o.radius || 90) * Math.min(1.5, sc), ang = o.angle || 0, big = sc > 1.2;
      for (const s of [-1, 1]) fx.slash(x, y, ang + s * 1.35, 1.5, r, E.core, 16 * Math.min(1.5, k), 0.2, { core: '#ffffff', trail: 1 }); // 上下顎
      for (let i = 0; i < 10; i++) { // 兩排牙：由外向中心收束的亮線
        const a = ang + (i < 5 ? 1 : -1) * (0.3 + (i % 5) * 0.3), c = Math.cos(a), s = Math.sin(a);
        fx.streak(x + c * r * 1.2, y + s * r * 1.2, x + c * r * 0.3, y + s * r * 0.3, 3, '#f4ead0', 0.16, true);
      }
      fx.ring(x, y, r * 1.2, r * 0.2, 0.16, E.glow, 5);
      fx.flashAt(x, y, r * 0.7, '#ffffff', 0.1);
      fx.sparkle(x, y, '#f4ead0', fx.budget(8), 260, ang, 1.6);                    // 骨渣
      fx.debris(x, y, '#e8dcc0', Math.round(5 * k), 200, 2.5, r * 0.3);
      fx.smoke(x, y, 'rgba(190,210,90,0.45)', 4, r * 0.5);                          // 涎沫
      fx.sparkle(x, y, '#d4e878', fx.budget(6), 220, ang, 1.4);
      fx.text(x + (V() - 0.5) * r * 0.5, y - r * 0.4, '喀', E.core, 18 + 8 * Math.min(2, sc));
      if (big) { fx.shock(x, y, 10, r * 1.8, 0.4, E.glow, 8, E.core); fx.decal(x, y, r * 0.7, E.decal, 6); fx.shake(Math.min(12, 7 * k)); }
      else fx.shake(Math.min(5, 2.5 * k));
    },
  });

  // ── 小次郎（《終末的女武神》）：圖片依據＝動畫燕返し分鏡（白閃、青白燕影、書法字「燕返し」）與虎切分鏡（逆手握刀、書法字「岩流秘奧・虎切」）──
  BD.defineEffect('tsubame', {
    name: '燕返し', category: '斬擊',
    desc: '下劈被躲開的瞬間刀勢急停、翻成上撩：全屏白閃、一道巨大的白熱月牙弧由下往上撩起，青白色的燕影（細長拖尾）沿弧線掠過、刀尖爆出火花，書法字「燕」「返」浮現，施放者留下青白殘影。適合反轉斬、回馬槍、第二擊。',
    params: { radius: 340, arc: 3.0 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.6, o.k), ang = o.angle || 0, r = o.radius || 340, arc = o.arc || 3.0, src = o.src || null;
      fx.flash('#ffffff', 0.3);
      fx.slash(x, y, ang, arc, r, E.glow, 20 * k, o.heavy ? 0.42 : 0.3, { core: '#ffffff', trail: 3 });
      fx.slash(x, y, ang, arc * 0.8, r * 0.7, '#ffffff', 8, 0.2, { core: E.core, trail: 1 });
      for (let i = 0; i < 4; i++) { // 燕影：沿弧線由下往上掠過的細長拖尾
        const a0 = ang - arc * 0.45 + i * arc * 0.08, rr = r * (0.55 + 0.12 * i);
        for (let s = 0; s < 6; s++) {
          const a1 = a0 + s * arc * 0.1;
          fx.after(i * 0.025 + s * 0.012, () => fx.streak(x + Math.cos(a1) * rr, y + Math.sin(a1) * rr, x + Math.cos(a1 + 0.35) * rr * 1.08, y + Math.sin(a1 + 0.35) * rr * 1.08, 5, E.glow, 0.22, true));
        }
      }
      const tipA = ang + arc * 0.5, tx = x + Math.cos(tipA) * r, ty = y + Math.sin(tipA) * r;
      fx.sparkle(tx, ty, '#ffffff', fx.budget(10), 380, tipA + Math.PI / 2, 0.8);
      fx.flashAt(x + Math.cos(ang) * r * 0.6, y + Math.sin(ang) * r * 0.6, r * 0.3, '#ffffff', 0.14);
      fx.text(x + Math.cos(ang) * r * 0.5, y + Math.sin(ang) * r * 0.5 - 24, '燕', E.core, 44);
      fx.after(0.12, () => fx.text(x + Math.cos(ang) * r * 0.5 + 40, y + Math.sin(ang) * r * 0.5 - 6, '返', E.glow, 34));
      if (src) fx.ghost(src, 0.4, E.glow);
      fx.shake(Math.min(14, 7 * k), ang);
    },
  });

  BD.defineEffect('torakiri', {
    name: '虎切', category: '斬擊',
    desc: '逆手握刀、突然換握的橫斬：沿衝刺路徑劃出三道平行的金色爪痕（虎爪），爪痕尾端噴出火花，書法字「虎切」浮現。附在 dash 的 fx 使用（讀取 angle / len）。',
    params: { len: 260 },
    spawn(fx, x, y, o) {
      const k = Math.min(1.5, o.k), ang = o.angle || 0, len = o.len || 260, c = Math.cos(ang), s = Math.sin(ang), px = -s, py = c;
      for (let i = -1; i <= 1; i++) { // 三道爪痕：中間最長最亮
        const off = i * 24, L = len * (i ? 0.86 : 1.0);
        fx.after(0.03 * Math.abs(i), () => {
          fx.beam(x + px * off, y + py * off, x + px * off + c * L, y + py * off + s * L, i ? 9 : 14, '#ffc84a', 0.3, '#ffffff');
          fx.sparkle(x + px * off + c * L, y + py * off + s * L, '#ffe39a', fx.budget(5), 300, ang, 0.9);
        });
      }
      // 書法字放在衝刺尾端並偏向一側，避免連段「燕返し・虎切」時與「燕」「返」疊在一起
      fx.after(0.1, () => { fx.flashAt(x + c * len * 0.6, y + s * len * 0.6, 50, '#fff0c0', 0.14); fx.text(x + c * len * 0.9 + px * 46, y + s * len * 0.9 + py * 46 - 20, '虎切', '#ffd36a', 32); fx.shake(Math.min(9, 5 * k), ang); });
      if (o.src) fx.ghost(o.src, 0.3, '#ffc84a');
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
