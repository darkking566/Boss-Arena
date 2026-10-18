'use strict';
// 特效庫｜增益（charge / stance / parry / mikiri / summon / roar / awaken / shadowrise / eclipse / posturebreak）：蓄力、架式、見切、見切一閃、召喚、咆哮、覺醒、影起、月蝕與架勢崩潰
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
// o：E 元素主題、life 持續時間、k 綜合倍率、src 施放者（可為 null）、flashColor（咆哮）
(function (G) {
  const BD = G.BD;

  BD.defineEffect('charge', {
    name: '蓄力', category: '增益',
    desc: '招式前置的蓄力：光源由暗漸亮並向內收束，光點不斷被吸向中心。適合詠唱、聚力、集氣。',
    params: { life: 0.8 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, src = o.src || null;
      const life = o.life || 0.8;
      const r = (src && src.r ? src.r : 30) * 1.8;
      fx.charge(x, y, r, E.glow, life, src, Math.round(10 * Math.min(2, k)));
      if (o.heavy) fx.glow(x, y, r * 0.8, E.core, life, 0.3, 0.2, src);
      fx.motes(x, y, E, 2, r * 0.5, 60);
    },
  });

  BD.defineEffect('stance', {
    name: '架式', category: '增益',
    desc: '擺出見切架式：一圈光環由外向內收束成明亮細環，中心淡淡發光。適合防禦、格擋待機、進入反擊姿態。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, src = o.src || null;
      const r = (src && src.r ? src.r : o.radius || 40);
      fx.ring(x, y, r + 30, r + 4, 0.3, '#ffffff', 3);
      fx.ring(x, y, r + 30, r + 4, 0.3, E.core, 3);
      fx.glow(x, y, r * 0.9, E.glow, 0.45, 0.25, 0.2, src);
      fx.motes(x, y, E, 4, r * 0.5, 60);
    },
  });

  BD.defineEffect('parry', {
    name: '見切', category: '增益',
    desc: '精準彈反的瞬間：白熱光環猛然盪開、全屏一閃、兩道交叉亮線與大量火花。適合格擋成功、反擊觸發。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      fx.ring(x, y, 10, 90, 0.3, E.core, 6 * Math.min(1.4, k));
      fx.flash('#fff', 0.25);
      fx.streak(x - 50, y - 50, x + 50, y + 50, 4, E.core, 0.25, true);
      fx.streak(x - 50, y + 50, x + 50, y - 50, 4, E.core, 0.25, true);
      fx.sparkle(x, y, E.core, 16, 320);
      fx.motes(x, y, E, 5, 24, 110);
      fx.shake(Math.min(8, 4 * k));
    },
  });

  BD.defineEffect('mikiri', {
    name: '見切・一閃', category: '增益',
    desc: '看穿攻擊的瞬間：場地瞬間轉暗、白色光環猛然收束、全屏一閃；delay 秒後施放者閃到對手背後，一道巨大的白色弧斬劃開黑暗、刀尖方向爆出火花。適合見切、居合反擊等「先讀後斬」的反擊技。',
    params: { delay: 0.2 },
    spawn(fx, x, y, o) {
      const E = o.E, src = o.src || null, r = src && src.r ? src.r : 30;
      fx.veil(0.55, 0.6, '#000000');
      fx.flash('#ffffff', 0.35);
      fx.ring(x, y, r * 4, r + 2, 0.18, '#ffffff', 4);
      fx.sparkle(x, y, '#ffffff', 10, 260);
      fx.shake(6);
      fx.after(o.delay, () => {
        const sx = src ? src.x : x, sy = src ? src.y : y, a = src && src.face != null ? src.face : o.angle || 0;
        fx.slash(sx, sy, a, 2.6, r + 105, '#ffffff', 22, 0.35, { core: E.core, trail: 3 });
        fx.flashAt(sx + Math.cos(a) * 60, sy + Math.sin(a) * 60, 40, '#ffffff', 0.16);
        fx.sparkle(sx + Math.cos(a) * 60, sy + Math.sin(a) * 60, E.core, 18, 380, a, 1.2);
        fx.shake(12, a);
      });
    },
  });

  BD.defineEffect('summon', {
    name: '召喚', category: '增益',
    desc: '召喚物現身的短暫陣法：光圈由小擴張、元素微粒聚攏。適合小兵召喚、圖騰降臨。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      fx.ring(x, y, 4, o.radius || 30, 0.3, E.glow, 3 * Math.min(1.4, k));
      fx.motes(x, y, E, Math.round(6 * k), 18, 90);
      fx.flashAt(x, y, 12, E.core, 0.1);
    },
  });

  BD.defineEffect('roar', {
    name: '咆哮', category: '增益',
    desc: '階段轉換的咆嘯：巨大震波掃過全場、白色光環緊隨、強烈震動與全屏閃光，光暈盤旋。適合狂暴、換階段。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      fx.shock(x, y, 20, 420, 0.8, E.glow, 10 * Math.min(1.5, k), E.core);
      fx.ring(x, y, 10, 300, 0.6, '#ffffff', 4);
      fx.shake(Math.min(26, 18 * Math.min(k, 1.5)));
      fx.flash(o.flashColor || E.glow, 0.45);
      fx.sparkle(x, y, E.core, 40, 500);
      fx.motes(x, y, E, 30, 60, 220);
      fx.glow(x, y, 160 * Math.min(1.5, k), E.glow, 0.7, 0.6, 0.6, o.src || null);
    },
  });

  BD.defineEffect('awaken', {
    name: '覺醒', category: '增益',
    desc: '進入第二階段：全屏元素閃光、身上持續的光暈、元素微粒環繞盤旋。適合變身、解封、二階段登場。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, src = o.src || null;
      const r = src && src.r ? src.r : o.radius || 60;
      fx.flash(E.glow, 0.5);
      fx.glow(x, y, r * 1.6, E.glow, 1.2, 0.5, 0.4, src);
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * Math.PI * 2, d = r * (1.2 + BD.vrng() * 0.8);
        fx.motes(x + Math.cos(a) * d, y + Math.sin(a) * d, E, 1, 8, 70);
      }
      fx.shake(Math.min(14, 8 * Math.min(o.k, 1.5)));
    },
  });

  BD.defineEffect('shadowrise', {
    name: '影起', category: '增益',
    desc: '換階段的蓄勢：場地被暗幕籠罩、暗影光點從四周被吸向施放者；life 秒後暗影炸開成四道交錯的巨大弧斬、震波與煙霧。適合暗影系角色的二階段覺醒（phase2.transFx）。',
    params: { life: 0.6 },
    spawn(fx, x, y, o) {
      const E = o.E, src = o.src || null, r = src && src.r ? src.r : 30, life = o.life;
      fx.veil(life + 0.7, 0.55, '#05020c');
      fx.charge(x, y, r * 5, E.glow, life, src, 28);
      fx.smoke(x, y, E.smoke, 8, r);
      fx.after(life, () => {
        const sx = src ? src.x : x, sy = src ? src.y : y;
        for (let i = 0; i < 4; i++) fx.slash(sx, sy, i * Math.PI / 2 + 0.4, 2.2, r + 70 + i * 12, E.glow, 16, 0.4, { core: E.core, trail: 2 });
        fx.shock(sx, sy, r, 260, 0.6, E.glow, 8, E.core);
        fx.smoke(sx, sy, E.smoke, 16, 50);
        fx.motes(sx, sy, E, 20, 40, 200);
      });
    },
  });

  BD.defineEffect('eclipse', {
    name: '月蝕', category: '增益',
    desc: '換階段的月蝕：場地沉入深藍暗幕，施放者頭上浮現一輪月光、外緣光環緩緩收攏，元素光點被吸向中心；life 秒後月光炸開成全屏元素閃光、雙層震波與四散的冰晶與符文。適合法師系角色的二階段覺醒（phase2.transFx）。',
    params: { life: 0.6 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, src = o.src || null, r = src && src.r ? src.r : 30, life = o.life;
      fx.veil(life + 0.8, 0.6, '#050818');
      fx.glow(x, y, r * 3.2, '#e0f7ff', life, 0.45, -0.3, src);
      fx.ring(x, y, r * 4, r * 2.4, life, '#e0f7ff', 3);
      fx.ring(x, y, r * 4.4, r * 2.6, life, E.glow, 2);
      fx.charge(x, y, r * 4, E.glow, life, src, 26);
      fx.after(life, () => {
        const sx = src ? src.x : x, sy = src ? src.y : y;
        fx.flash(E.glow, 0.5);
        fx.shock(sx, sy, r, r * 9, 0.7, E.glow, 10 * Math.min(1.5, k), E.core);
        fx.shock(sx, sy, r, r * 6, 0.5, '#e0f7ff', 6, '#ffffff');
        for (let i = 0; i < 16; i++) {
          const a = i / 16 * Math.PI * 2;
          fx.sparkle(sx + Math.cos(a) * r, sy + Math.sin(a) * r, i % 2 ? '#e0f7ff' : E.core, 2, 420, a, 0.3);
        }
        fx.motes(sx, sy, E, 24, r * 2, 180);
        fx.glow(sx, sy, r * 3, E.glow, 1.0, 0.6, 0.4, src);
        fx.shake(Math.min(16, 10 * Math.min(k, 1.5)));
      });
    },
  });

  BD.defineEffect('posturebreak', {
    name: '架勢崩潰', category: '增益',
    desc: '架勢被打斷的破防瞬間：金色光環彈開、金色火花四濺與一點閃光。適合破防、硬直、失衡。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      fx.ring(x, y, 10, 120, 0.5, '#ffcc33', 5 * Math.min(1.4, k));
      fx.sparkle(x, y, '#ffcc33', 16, 300);
      fx.motes(x, y, E, 5, 24, 110);
      fx.flashAt(x, y, 24, '#ffcc33', 0.14);
      fx.shake(Math.min(8, 3 * k));
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
