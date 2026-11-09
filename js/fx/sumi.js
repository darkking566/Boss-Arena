'use strict';
// 特效庫｜墨染武士刀（sumislash / sumiwhirl / sumiiai / sumidash / sumistep / sumibind / sumicut / sumipaper / sumistroke / sumiult）：狩獵模式原創武器的水墨刀光
// 水墨感來自：fx.ink 毛筆筆畫（沿路徑寫出、落筆粗收筆尖、墨暈與飛白）外襯淡宣紙白、地上墨滴（decal），
// 大招時場地鋪一層宣紙色、書法字與朱紅印。只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
(function (G) {
  const BD = G.BD, TAU = Math.PI * 2, INK = '#1a1614', PAPER = '#efe6d2', RED = '#c8202e';
  const col = (o) => o.color || INK;

  // 毛筆一筆（fx.ink：沿路徑寫出來、落筆粗收筆尖、飛白）；底下一層淡宣紙白，墨在暗色場地也看得見
  function brush(fx, x1, y1, x2, y2, w, c, life, bend) {
    fx.ink(x1, y1, x2, y2, w * 1.3, life * 0.9, 'rgba(239,230,210,0.45)', bend);
    fx.ink(x1, y1, x2, y2, w, life, c, bend);
  }
  // 毛筆弧：圓弧切成每段不超過 120° 的彎筆畫，依序寫出（月牙刀光的墨線版）
  function brushArc(fx, x, y, r, a0, a1, w, c, life) {
    const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (TAU / 3))), f = (a1 - a0) / n;
    for (let k = 0; k < n; k++) {
      const p = a0 + f * k, q = p + f, bend = -Math.sign(f) * r * (1 - Math.cos(f / 2));
      fx.after(k * 0.035, () => brush(fx, x + Math.cos(p) * r, y + Math.sin(p) * r, x + Math.cos(q) * r, y + Math.sin(q) * r, w, c, life, bend));
    }
  }
  // 墨滴：甩在地上的小墨點（幾秒後淡去）
  function splat(fx, x, y, n, spread, ang) {
    const V = BD.vrng;
    for (let k = 0; k < n; k++) {
      const a = ang == null ? V() * TAU : ang + (V() - 0.5) * 1.4, d = spread * (0.3 + 0.7 * V());
      fx.decal(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.5 + V() * 3, 'rgba(14,10,10,0.95)', 2 + V() * 1.5);
    }
  }

  BD.defineEffect('sumislash', {
    name: '墨刃斬', category: '斬擊',
    desc: '一刀一筆：深墨色的月牙刀光外鑲宣紙白、刃芯一線白光，沿弧線補上一筆濃淡有致的毛筆墨痕，刀尖甩出一串墨滴。',
    params: {},
    spawn(fx, x, y, o) {
      const c = col(o), k = Math.min(1.6, o.k || 1), a = o.angle || 0, r = 165 * k, arc = 2.1;
      fx.slash(x, y, a, arc, r, c, 16 * k, 0.26, { trail: 2, rim: PAPER });
      brushArc(fx, x, y, r * 0.8, a - arc / 2, a + arc / 2, 16 * k, c, 0.5);
      const ta = a + arc / 2; splat(fx, x + Math.cos(ta) * r * 0.85, y + Math.sin(ta) * r * 0.85, 5, 40, ta + Math.PI / 2);
    },
  });

  BD.defineEffect('sumiwhirl', {
    name: '墨旋', category: '斬擊',
    desc: '旋身一圈：一整圈墨色刀光與毛筆圓（像一筆畫成的「圓相」），四周濺出放射狀墨點，地上留一圈淡墨暈。',
    params: {},
    spawn(fx, x, y, o) {
      const c = col(o), k = Math.min(1.6, o.k || 1), r = 170 * k, a = o.angle || 0;
      fx.slash(x, y, a, TAU * 0.95, r, c, 14 * k, 0.32, { trail: 2, rim: PAPER });
      brushArc(fx, x, y, r * 0.75, a, a + TAU * 0.9, 14 * k, c, 0.6);
      splat(fx, x, y, 10, r, null); fx.decal(x, y, r * 0.55, 'rgba(26,22,20,0.18)', 3); fx.shake(4 * k);
      if (c !== INK) fx.flashAt(x, y, r * 0.5, c, 0.15);
    },
  });

  BD.defineEffect('sumiiai', {
    name: '居合・一閃', category: '位移',
    desc: '穿身而過的拔刀：起點一圈墨暈炸開，沿衝刺路徑一道又長又利的毛筆橫畫，中段最濃、兩端飛白，路徑上一閃白光，終點甩出墨滴。附在 dash 的 fx（讀取 angle / len）。',
    params: { len: 360 },
    spawn(fx, x, y, o) {
      const a = o.angle || 0, L = o.len || 360, ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
      splat(fx, x, y, 6, 50, a + Math.PI);
      fx.ring(x, y, 10, 60, 0.25, PAPER, 3);
      fx.after(0.05, () => { brush(fx, x, y, ex, ey, 26, col(o), 0.8); fx.streak(x, y, ex, ey, 3, '#ffffff', 0.18, true); });
      fx.after(0.12, () => { splat(fx, ex, ey, 6, 60, a); fx.flashAt((x + ex) / 2, (y + ey) / 2, 40, '#ffffff', 0.1); });
      if (o.src) fx.ghost(o.src, 0.4, '#2a2220');
    },
  });

  BD.defineEffect('sumidash', {
    name: '燕翔', category: '位移',
    desc: '短促的穿身衝刺：一筆斜飛的墨線、身後一道墨色殘影，衝刺終點濺開墨點。附在 dash 的 fx（讀取 angle / len）。',
    params: { len: 270 },
    spawn(fx, x, y, o) {
      const a = o.angle || 0, L = o.len || 270, ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L, c = col(o);
      brush(fx, x, y, ex, ey, 20, c, 0.6);
      if (o.src) fx.ghost(o.src, 0.3, c === INK ? '#2a2220' : c);
      fx.after(0.08, () => splat(fx, ex, ey, 4, 40, a));
    },
  });

  BD.defineEffect('sumistep', {
    name: '流墨', category: '位移',
    desc: '橫向閃身：原地留下一團化開的墨影（殘影 + 墨暈），身後拖一筆淡墨。',
    params: {},
    spawn(fx, x, y, o) {
      const a = o.angle || 0, L = o.len || 140, ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
      brush(fx, x, y, ex, ey, 8, col(o), 0.35);
      if (o.src) fx.ghost(o.src, 0.45, '#2a2220');
    },
  });

  BD.defineEffect('sumibind', {
    name: '墨縛', category: '增益',
    desc: '精準閃過後的潑墨：六道墨線從四方甩向 Boss，腳下炸開一大灘墨、濃墨暈纏住身體，外圈一道宣紙白的環縮緊，中心一點朱紅。',
    params: { life: 0.9 },
    spawn(fx, x, y, o) {
      const V = BD.vrng, r = (o.src && o.src.r ? o.src.r : 40) + 50, life = o.life || 0.9;
      for (let k = 0; k < 6; k++) {
        const a = k * TAU / 6 + V() * 0.4;
        brush(fx, x + Math.cos(a) * r * 2.2, y + Math.sin(a) * r * 2.2, x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, 10, INK, 0.5);
      }
      fx.after(0.1, () => { splat(fx, x, y, 14, r * 1.2, null); fx.decal(x, y, r * 0.9, 'rgba(22,18,16,0.3)', life + 1.5); });
      fx.ring(x, y, r * 1.6, r * 0.7, 0.35, PAPER, 4);
      fx.flashAt(x, y, r * 0.4, RED, 0.2); fx.shake(4);
    },
  });

  BD.defineEffect('sumicut', {
    name: '遲來的一筆', category: '斬擊',
    desc: '居合穿身之後，Boss 身上那道墨線才裂開：一筆濃墨橫畫貫穿 Boss、兩端噴出墨滴，一線白光沿筆畫閃過，書法字「斬」。',
    params: {},
    spawn(fx, x, y, o) {
      const a = o.angle || 0, r = (o.src && o.src.r ? o.src.r : 40) * 1.8, c = Math.cos(a) * r, s = Math.sin(a) * r;
      brush(fx, x - c, y - s, x + c, y + s, 16, INK, 0.5);
      fx.streak(x - c, y - s, x + c, y + s, 4, '#ffffff', 0.2, true);
      splat(fx, x + c, y + s, 5, 40, a); splat(fx, x - c, y - s, 4, 30, a + Math.PI);
      fx.text(x, y - r * 0.6, '斬', '#e8402e', 34); fx.shake(5, a);
    },
  });

  BD.defineEffect('sumipaper', {
    name: '宣紙鋪開', category: '大招',
    desc: '一筆百斬起手：整個場地鋪上一層宣紙色、四角暗下，Boss 腳下暈開一大圈淡墨，邊緣一圈宣紙白的環向內收。',
    params: { life: 2.5 },
    spawn(fx, x, y, o) {
      const life = o.life || 2.5, r = (o.src && o.src.r ? o.src.r : 40);
      fx.veil(life, 0.5, '#e6dcc4'); fx.grade('#8a7a5a', 0.25, life);
      fx.decal(x, y, r * 2.4, 'rgba(26,22,20,0.15)', life + 2);
      fx.ring(x, y, r * 4, r * 1.4, 0.5, INK, 4);
    },
  });

  BD.defineEffect('sumistroke', {
    name: '一筆', category: '斬擊',
    desc: '一筆百斬中的一刀：從獵人原位到穿過 Boss 後的落點，一筆極粗的濃墨長畫（外襯宣紙白、兩側飛白），一線白光貫穿，兩端甩出墨滴，第一筆以外每筆附一點朱紅。讀取 x1 / y1（落點）。',
    params: {},
    spawn(fx, x, y, o) {
      const x1 = o.x1 == null ? x + 300 : o.x1, y1 = o.y1 == null ? y : o.y1, a = Math.atan2(y1 - y, x1 - x);
      brush(fx, x, y, x1, y1, 26, INK, o.life || 1.4);
      fx.streak(x, y, x1, y1, 4, '#ffffff', 0.16, true);
      splat(fx, x1, y1, 5, 50, a);
      fx.flashAt((x + x1) / 2, (y + y1) / 2, 46, '#ffffff', 0.08);
      if (o.k) fx.flashAt((x + x1) / 2, (y + y1) / 2, 16, RED, 0.3);
      if (o.src) fx.ghost(o.src, 0.5, '#2a2220');
      fx.shake(3, a);
    },
  });

  BD.defineEffect('sumiult', {
    name: '一筆百斬・納刀', category: '大招',
    desc: '納刀的一瞬，整幅墨畫爆開：Boss 上方寫出巨大的書法字「斬」與朱紅印「墨」，墨色衝擊波推開三層、十道放射狀墨畫、滿地墨滴與墨暈，最後全屏一白。',
    params: {},
    spawn(fx, x, y, o) {
      const V = BD.vrng, R = o.radius || 340;
      fx.text(x, y - 40, '斬', INK, 110);
      fx.after(0.08, () => fx.text(x + 70, y + 10, '墨', RED, 30));
      fx.after(0.14, () => {
        fx.flash('#fff8e8', 0.5); fx.punch(0.05, x, y); fx.shake(14);
        fx.shock(x, y, 20, R, 0.45, INK, 12, PAPER); fx.ring(x, y, 30, R * 1.2, 0.6, INK, 5); fx.ring(x, y, 10, R * 0.7, 0.4, RED, 3);
        for (let k = 0; k < 10; k++) { const a = k * TAU / 10 + V() * 0.25, L = R * (0.6 + 0.5 * V()); brush(fx, x + Math.cos(a) * 30, y + Math.sin(a) * 30, x + Math.cos(a) * L, y + Math.sin(a) * L, 12 + 8 * V(), INK, 0.9); }
        splat(fx, x, y, 22, R, null);
        fx.decal(x, y, R * 0.45, 'rgba(26,22,20,0.22)', 4);
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
