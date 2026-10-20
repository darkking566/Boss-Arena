'use strict';
// 特效庫｜位移（blink / boltblink / vanish / hoofcharge / warsteed / appear / leap / burrow / dash）：瞬移、雷光瞬身、隱現、鐵騎衝鋒、戰騎奔至、躍起、鑽地與衝刺殘影
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
// o：E 元素主題、toX / toY 終點、angle 方向、len 距離、dur 衝刺時間、k 綜合倍率、src 施放者
(function (G) {
  const BD = G.BD;

  BD.defineEffect('blink', {
    name: '閃現', category: '位移',
    desc: '瞬移：起點收縮的光環與煙霧，終點綻放的光圈與閃光，兩點之間拉出一道拖影。適合瞬步、傳送、突進。',
    params: { len: 200 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, src = o.src || null;
      const tx = o.toX == null ? x + 120 : o.toX, ty = o.toY == null ? y : o.toY;
      fx.ring(x, y, 4, 60, 0.35, E.glow, 4 * Math.min(1.5, k));
      fx.smoke(x, y, E.smoke, 6, 20);
      fx.motes(x, y, E, Math.round(5 * k), 24, 120);
      fx.ring(tx, ty, 60, 4, 0.3, E.glow, 4 * Math.min(1.5, k));
      fx.flashAt(tx, ty, 20 * Math.min(1.6, k), E.core, 0.14);
      fx.motes(tx, ty, E, Math.round(5 * k), 20, 120);
      fx.streak(x, y, tx, ty, src && src.r ? src.r * 0.6 : 14, E.glow, 0.25, true);
    },
  });

  BD.defineEffect('boltblink', {
    name: '雷光瞬身', category: '位移',
    desc: '化為一道閃電瞬移：起點與終點之間劈出鋸齒雷光（亮芯 + 元素色外層），兩端爆閃、電弧四竄，起點留下焦痕。適合雷電系的瞬步、閃現突襲。',
    params: { len: 200 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      const tx = o.toX == null ? x + 160 : o.toX, ty = o.toY == null ? y : o.toY;
      const len = Math.hypot(tx - x, ty - y) || 1, nx = -(ty - y) / len, ny = (tx - x) / len;
      for (let j = 0; j < 2; j++) {
        let px = x, py = y;
        const n = Math.max(5, Math.round(len / 40));
        for (let i = 1; i <= n; i++) {
          const t = i / n, off = i === n ? 0 : (BD.vrng() - 0.5) * 36;
          const qx = x + (tx - x) * t + nx * off, qy = y + (ty - y) * t + ny * off;
          fx.streak(px, py, qx, qy, j ? 2 : 5, j ? '#ffffff' : E.glow, 0.3, true);
          px = qx; py = qy;
        }
      }
      fx.flashAt(x, y, 30, E.core, 0.14);
      fx.flashAt(tx, ty, 36, E.core, 0.16);
      fx.motes(x, y, E, Math.round(8 * k), 20, 160);
      fx.motes(tx, ty, E, Math.round(10 * k), 24, 180);
      fx.decal(x, y, 18, E.decal || 'rgba(0,0,0,0.3)', 4);
      fx.shake(Math.min(8, 3 * k));
    },
  });

  BD.defineEffect('vanish', {
    name: '隱身', category: '位移',
    desc: '身影化煙散去：一團煙霧炸開、光環向內收縮、暗影粒子飄散。適合潛行、隱蔽、消失。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      fx.smoke(x, y, E.smoke, 14, 30 * Math.min(1.5, k));
      fx.ring(x, y, 50 * Math.min(1.5, k), 4, 0.35, E.glow, 4);
      fx.motes(x, y, E, Math.round(12 * k), 28, 100);
      fx.flashAt(x, y, 22, E.core, 0.08);
    },
  });

  BD.defineEffect('livingshadow', {
    name: '影分身', category: '位移',
    desc: '從本體剝離出一道影子疾射而出：沿路拖出漆黑的身形殘跡與一道元素色細線，終點煙霧聚攏、光環內縮、亮點一閃。適合分身、影子投射（搭配 shadow 動作）。',
    params: { len: 260 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.src && o.src.r ? o.src.r : 22;
      const tx = o.toX == null ? x + (o.len || 260) : o.toX, ty = o.toY == null ? y : o.toY;
      fx.streak(x, y, tx, ty, r * 1.1, '#000000', 0.4, false);
      fx.streak(x, y, tx, ty, 3 * Math.min(1.5, k), E.glow, 0.28, true);
      fx.smoke(x, y, E.smoke, 4, 14);
      fx.smoke(tx, ty, E.smoke, 10, r);
      fx.ring(tx, ty, r * 2.6, r * 0.6, 0.32, E.glow, 3 * Math.min(1.5, k));
      fx.flashAt(tx, ty, r, E.core, 0.1);
      fx.motes(tx, ty, E, Math.round(8 * k), r, 90);
    },
  });

  BD.defineEffect('shadowswap', {
    name: '影換位', category: '位移',
    desc: '與影子瞬間交換位置：兩端同時炸開黑煙與內縮光環，一黑一亮兩道拖影交錯，終點一閃。適合換位、替身術（搭配 swap 動作）。',
    params: { len: 260 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.src && o.src.r ? o.src.r : 22;
      const tx = o.toX == null ? x + (o.len || 260) : o.toX, ty = o.toY == null ? y : o.toY;
      fx.streak(tx, ty, x, y, r * 0.9, '#000000', 0.3, false);
      fx.streak(x, y, tx, ty, r * 0.5, E.glow, 0.22, true);
      for (const [px, py] of [[x, y], [tx, ty]]) {
        fx.smoke(px, py, E.smoke, 8, r * 0.8);
        fx.ring(px, py, r * 2.2, r * 0.4, 0.28, E.glow, 3 * Math.min(1.5, k));
      }
      fx.flashAt(tx, ty, r * 1.1, E.core, 0.12);
      fx.sparkle(tx, ty, E.glow, Math.round(8 * k), 240);
    },
  });

  BD.defineEffect('hoofcharge', {
    name: '鐵騎衝鋒', category: '位移',
    desc: '戰馬衝鋒：沿路左右交替留下蹄印與揚塵、蹄下迸出元素火星與餘燼，衝刺結束時揚起一圈塵浪。適合騎兵衝鋒、戰馬踐踏（搭配 dash 動作）。',
    params: { len: 300, dur: 0.3 },
    spawn(fx, x, y, o) {
      const E = o.E, src = o.src || null, dur = o.dur || 0.3, len = o.len || 300, ang = o.angle || 0;
      const n = Math.max(4, Math.round(len / 45));
      for (let i = 0; i <= n; i++) {
        fx.after(dur * i / n, () => {
          const a = src && src.face != null ? src.face : ang;
          const px = src ? src.x : x + Math.cos(ang) * len * i / n, py = src ? src.y : y + Math.sin(ang) * len * i / n;
          const side = i % 2 ? 1 : -1, hx = px - Math.sin(a) * side * 14, hy = py + Math.cos(a) * side * 14;
          fx.decal(hx, hy, 7, 'rgba(30,15,10,0.45)', 4);
          fx.smoke(hx, hy, 'rgba(140,110,80,0.35)', 2, 10);
          fx.sparkle(hx, hy, E.core, 2, 160, a + Math.PI, 0.8);
          fx.embers(hx, hy, E.glow, 1, 6, 30);
        });
      }
      fx.after(dur, () => {
        const ex = src ? src.x : x + Math.cos(ang) * len, ey = src ? src.y : y + Math.sin(ang) * len;
        fx.ring(ex, ey, 10, 90, 0.4, '#a07850', 6);
        fx.smoke(ex, ey, 'rgba(140,110,80,0.35)', 8, 40);
      });
    },
  });

  BD.defineEffect('warsteed', {
    name: '戰騎奔至', category: '位移',
    desc: '坐騎從後方奔入的換階段登場：場地覆上暗紅暗幕，life 秒內一串左右交替的蹄印與揚塵從施放者身後遠處一路奔近；時間到時塵浪與元素震波以施放者為中心炸開、火星與餘燼四濺。適合騎將系角色的二階段（phase2.transFx），搭配造型 transition 畫出奔入的坐騎。',
    params: { life: 0.6 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, src = o.src || null, r = src && src.r ? src.r : 30, life = o.life;
      fx.veil(life + 0.8, 0.5, '#1a0206');
      const n = 8;
      for (let i = 0; i < n; i++) {
        fx.after(life * i / n, () => {
          const a = src && src.face != null ? src.face : 0, bx = src ? src.x : x, by = src ? src.y : y;
          const d = r * 8.75 * (1 - i / n) + r * 0.5, side = i % 2 ? 1 : -1;
          const hx = bx - Math.cos(a) * d - Math.sin(a) * side * 16, hy = by - Math.sin(a) * d + Math.cos(a) * side * 16;
          fx.decal(hx, hy, 8, 'rgba(30,15,10,0.45)', 5);
          fx.smoke(hx, hy, 'rgba(140,110,80,0.35)', 3, 14);
          fx.sparkle(hx, hy, E.core, 2, 180, a, 0.8);
        });
      }
      fx.after(life, () => {
        const bx = src ? src.x : x, by = src ? src.y : y;
        fx.ring(bx, by, r, r * 6, 0.6, '#a07850', 8);
        fx.shock(bx, by, r, r * 8, 0.7, E.glow, 10 * Math.min(1.5, k), E.core);
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; fx.smoke(bx + Math.cos(a) * r * 1.5, by + Math.sin(a) * r * 1.5, 'rgba(140,110,80,0.35)', 1, 10); }
        fx.embers(bx, by, E.core, 24, r, 90);
        fx.sparkle(bx, by, E.core, 24, 420);
        fx.flash(E.glow, 0.35);
        fx.shake(Math.min(16, 10 * Math.min(k, 1.5)));
      });
    },
  });

  BD.defineEffect('appear', {
    name: '現身', category: '位移',
    desc: '身影從煙霧中浮現：煙塵擴散、光環由外收束、中心一點閃光與元素微粒。適合解除隱身、傳送抵達。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      fx.smoke(x, y, E.smoke, 10, 20);
      fx.ring(x, y, 60, 5, 0.3, E.glow, 4 * Math.min(1.5, k));
      fx.flashAt(x, y, 22, E.core, 0.14);
      fx.motes(x, y, E, Math.round(8 * k), 24, 120);
    },
  });

  BD.defineEffect('leap', {
    name: '躍起', category: '位移',
    desc: '起跳：地面震波向外推開、碎石與塵土彈起、煙霧拖在腳下。適合跳躍、飛撲、起手跳砸。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      fx.shock(x, y, 10, 120 * Math.sqrt(Math.min(2, k)), 0.5, E.glow, 8, E.core);
      fx.debris(x, y, E.debris, Math.round(12 * k), 220, 4 + k * 0.5, 20);
      fx.smoke(x, y, E.smoke, Math.round(6 * k), 24);
      fx.motes(x, y, E, Math.round(8 * k), 24, 120);
      fx.shake(Math.min(12, 8 * Math.min(k, 1.5)));
    },
  });

  BD.defineEffect('burrow', {
    name: '鑽地', category: '位移',
    desc: '鑽入或鑽出地面：泥土碎塊大量翻飛、地面裂開並留下坑痕，伴隨火花與煙塵。適合潛地移動、地底突襲。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      fx.debris(x, y, E.debris, Math.round(20 * k), 280, 4 + k, 24);
      fx.crack(x, y, 40 * Math.min(1.8, k), E.decal, 7, E.crack, 5);
      fx.decal(x, y, 40 * Math.min(1.8, k), E.decal, 7);
      fx.sparks(x, y, E.particle, Math.round(10 * k), 180);
      fx.smoke(x, y, E.smoke, Math.round(8 * k), 28);
      fx.motes(x, y, E, Math.round(6 * k), 24, 100);
      fx.shake(Math.min(10, 4 * k));
    },
  });

  BD.defineEffect('dash', {
    name: '衝刺', category: '位移',
    desc: '高速衝刺：起步光環，過程中連續留下殘影與拖影線，附帶元素尾跡（火為餘燼）。適合突進、衝撞、追擊。',
    params: { len: 200, dur: 0.3 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, src = o.src || null, dur = o.dur || 0.3;
      const ang = o.angle || 0;
      fx.ring(x, y, 4, 50, 0.25, E.glow, 4 * Math.min(1.5, k));
      if (!src) return;
      const segs = 5, len = o.len || 200;
      for (let i = 1; i <= segs; i++) {
        fx.after(dur * i / segs, () => {
          if (src.x == null) return;
          fx.ghost(src, 0.3, E.glow);
          const lx = src.x - Math.cos(ang) * len / segs;
          const ly = src.y - Math.sin(ang) * len / segs;
          fx.streak(lx, ly, src.x, src.y, (src.r || 20) * 0.8, E.glow, 0.22, true);
          fx.motes(src.x, src.y, E, 3, (src.r || 20) * 0.4, 100);
        });
      }
      if (o.heavy) fx.shake(Math.min(8, 3 * k));
    },
  });
  BD.defineEffect('crowburst', {
    name: '烏鴉分身', category: '位移',
    desc: '化作一群烏鴉四散：起點炸出放射狀的漆黑羽翼拖影與羽毛、濃黑煙霧與擴散光環，終點收束出一圈紅光與落羽，起終點之間拖出一道紅色殘影。適合替身、遁走、烏鴉分身（blink 動作的 fx、crowsub 特性）。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, V = BD.vrng, TAU = Math.PI * 2, tx = o.toX != null ? o.toX : x, ty = o.toY != null ? o.toY : y;
      fx.glow(x, y, 70, '#ff2a44', 0.25, 0.5, 0.4);
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * TAU + V() * 0.3, len = 90 + V() * 110;
        fx.streak(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, 3 + V() * 3, i % 3 ? '#0b0810' : E.glow, 0.45 + V() * 0.25, false);
      }
      fx.debris(x, y, '#14101a', fx.budget(14), 320, 2.5, 28);
      fx.smoke(x, y, 'rgba(8,4,12,0.65)', fx.budget(10), 50);
      fx.ring(x, y, 10, 90, 0.35, E.glow, 3);
      fx.after(0.12, () => {
        fx.ring(tx, ty, 70, 8, 0.25, E.glow, 3);
        fx.sparkle(tx, ty, E.core, fx.budget(10), 300);
        fx.debris(tx, ty, '#14101a', fx.budget(8), 220, 2.5, 20);
        fx.streak(x, y, tx, ty, 6, E.glow, 0.3, true);
      });
      fx.shake(2);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
