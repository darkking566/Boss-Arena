'use strict';
// 特效庫｜增益（charge / stance / parry / divinesight / mikiri / pojun / summon / roar / bloodroar / awaken / shadowrise / eclipse / thunderwake / pressure / ironfist / posturebreak）：蓄力、架式、見切、神虛視、見切一閃、破軍、召喚、咆哮、血吼、覺醒、影起、月蝕、雷槌覺醒、威壓、鐵手套反槌與架勢崩潰
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

  BD.defineEffect('pojun', {
    name: '破軍', category: '增益',
    desc: '重兵器彈反成功：場地瞬間染上暗紅、元素色震波與白色光環收束、全屏一閃；delay 秒後反擊的長兵器沿施放者面向劈出一道粗大刃光，刀尖爆出火花並強烈震動。適合長戟、巨槌等重兵器的格擋反擊。',
    params: { delay: 0.2 },
    spawn(fx, x, y, o) {
      const E = o.E, src = o.src || null, r = src && src.r ? src.r : 30;
      fx.veil(0.5, 0.5, '#1a0004');
      fx.flash(E.glow, 0.3);
      fx.shock(x, y, r, r * 5, 0.45, E.glow, 10, E.core);
      fx.ring(x, y, r * 3, r + 4, 0.18, '#ffffff', 4);
      fx.sparkle(x, y, E.core, 14, 320);
      fx.shake(8);
      fx.after(o.delay, () => {
        const sx = src ? src.x : x, sy = src ? src.y : y, a = src && src.face != null ? src.face : o.angle || 0;
        const tx = sx + Math.cos(a) * r * 6, ty = sy + Math.sin(a) * r * 6;
        fx.beam(sx, sy, tx, ty, 30, E.glow, 0.35, E.core);
        fx.beam(sx, sy, tx, ty, 8, '#ffffff', 0.3, E.core);
        fx.flashAt(tx, ty, 40, E.core, 0.16);
        fx.sparkle(tx, ty, E.core, 18, 400, a, 0.9);
        fx.shake(14, a);
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

  BD.defineEffect('bloodroar', {
    name: '血吼', category: '增益',
    desc: '浴血不退的怒吼：場地染上暗紅暗幕約一秒、元素色震波與白色光環擴散、全屏閃光，施放者周圍火花與餘燼噴湧並留下光暈。適合狂怒、背水一戰、開啟護盾。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, src = o.src || null, r = src && src.r ? src.r : 30;
      fx.veil(1.0, 0.5, '#1a0004');
      fx.shock(x, y, r, r * 7, 0.6, E.glow, 10 * Math.min(1.5, k), E.core);
      fx.ring(x, y, r, r * 5, 0.5, '#ffffff', 4);
      fx.flash(E.glow, 0.35);
      fx.sparkle(x, y, E.core, 30, 420);
      fx.embers(x, y, E.core, 24, r, 80);
      fx.glow(x, y, r * 2.5, E.glow, 0.8, 0.6, 0.4, src);
      fx.shake(Math.min(16, 10 * Math.min(k, 1.5)));
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

  BD.defineEffect('thunderwake', {
    name: '雷槌覺醒', category: '增益',
    desc: '沉睡的雷槌甦醒：場地沉入深藍暗幕，life 秒內電弧在施放者周圍越竄越密、光點被吸向中心；時間到時一道落雷光柱直擊施放者，鐵灰碎片四散、雙層雷電震波與全屏白藍閃光。適合雷電系角色的二階段覺醒（phase2.transFx）。',
    params: { life: 0.6 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, src = o.src || null, r = src && src.r ? src.r : 30, life = o.life;
      fx.veil(life + 0.9, 0.6, '#04070f');
      fx.charge(x, y, r * 4, E.glow, life, src, 24);
      for (let t = 0; t < life; t += 0.1) {
        fx.after(t, () => {
          const n = 1 + Math.round(4 * t / life), sx = src ? src.x : x, sy = src ? src.y : y;
          fx.motes(sx, sy, E, n * 3, r * (1.6 - t / life), 140);
        });
      }
      fx.after(life, () => {
        const sx = src ? src.x : x, sy = src ? src.y : y;
        fx.flash('#e6f4ff', 0.6);
        fx.pillar(sx, sy, r * 1.4, E.glow, 0.5);
        fx.glow(sx, sy, r * 3, E.glow, 0.9, 0.8, 0.5, src);
        fx.shock(sx, sy, r, r * 9, 0.7, E.glow, 12 * Math.min(1.5, k), E.core);
        fx.shock(sx, sy, r, r * 5, 0.45, '#ffffff', 6, '#ffffff');
        fx.debris(sx, sy, '#3a3f48', 16, 420, 5, r * 0.5);
        fx.motes(sx, sy, E, 24, r * 1.5, 260);
        fx.crack(sx, sy, r * 3, E.decal, 9, E.crack, 8);
        fx.shake(Math.min(24, 16 * Math.min(k, 1.5)));
      });
    },
  });

  BD.defineEffect('pressure', {
    name: '威壓', category: '增益',
    desc: '令人僵住的威壓：場地短暫變暗，三圈沉重的光環由外向施放者收攏、地面以施放者為中心龜裂，最後一記低沉的震動。適合神威、霸氣、恐懼震懾類的減速 / 易傷技能。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, src = o.src || null, r = src && src.r ? src.r : 30, R0 = Math.max(o.radius || 200, r * 4);
      fx.veil(0.9, 0.55, '#05060c');
      for (let i = 0; i < 3; i++) fx.after(i * 0.1, () => fx.ring(x, y, R0 * (1.2 - i * 0.1), r, 0.45, i ? E.glow : '#ffffff', 5 - i));
      fx.after(0.32, () => {
        fx.crack(x, y, R0 * 0.7, E.decal, 6, E.crack, 10);
        fx.shock(x, y, r, R0, 0.4, E.glow, 6, E.core);
        fx.debris(x, y, E.debris || E.particle, 8, 220, 3, r);
        fx.shake(Math.min(18, 12 * Math.min(k, 1.5)), Math.PI / 2);
      });
    },
  });

  BD.defineEffect('ironfist', {
    name: '鐵手套・反槌', category: '增益',
    desc: '鐵手套擋下攻擊的瞬間：場地瞬間變暗、金屬撞擊的白金火花大量迸射、白色光環收束；delay 秒後反擊重槌落在施放者面前：震波、地裂與碎石。適合重手甲 / 盾牌格擋後的重擊反擊。',
    params: { delay: 0.25 },
    spawn(fx, x, y, o) {
      const E = o.E, src = o.src || null, r = src && src.r ? src.r : 30;
      fx.veil(0.5, 0.5, '#05060c');
      fx.flash('#ffffff', 0.3);
      fx.ring(x, y, r * 3, r + 4, 0.18, '#ffffff', 4);
      fx.sparkle(x, y, '#ffe6a0', 24, 380);
      fx.shake(8);
      fx.after(o.delay, () => {
        const a = src && src.face != null ? src.face : o.angle || 0;
        const hx = (src ? src.x : x) + Math.cos(a) * r * 2, hy = (src ? src.y : y) + Math.sin(a) * r * 2;
        fx.shock(hx, hy, r * 0.5, r * 4, 0.45, E.glow, 10, E.core);
        fx.crack(hx, hy, r * 2.2, E.decal, 8, E.crack, 7);
        fx.debris(hx, hy, E.debris || E.particle, 12, 300, 5, r * 0.5);
        fx.flashAt(hx, hy, 40, E.core, 0.16);
        fx.shake(14, a);
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
  BD.defineEffect('divinesight', {
    name: '神虛視', category: '增益',
    desc: '看穿並複製對手招式的瞬間：場地轉暗、一對金色眼紋光環向外盪開，施放者身後疊出三道殘影，八道放射光線與秘紋光點四散。適合複製、見切、看破類的反擊（亞當的神虛視）。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, src = o.src || null, r = src && src.r ? src.r : 30;
      fx.veil(0.45, 0.5, '#000000');
      fx.flash(E.glow, 0.3);
      fx.ring(x, y, r * 0.5, r * 3.2, 0.35, E.core, 5);
      fx.ring(x, y, r * 0.5, r * 2.2, 0.3, E.glow, 3);
      fx.glow(x, y, r * 2.4, E.glow, 0.5, 0.45, 0.3, src);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2 + BD.vrng() * 0.2;
        fx.streak(x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a) * r * 4.2, y + Math.sin(a) * r * 4.2, 3, E.core, 0.3, true);
      }
      if (src) { fx.ghost(src, 0.5, E.glow); fx.after(0.08, () => fx.ghost(src, 0.42, E.core)); fx.after(0.16, () => fx.ghost(src, 0.34, E.glow)); }
      fx.sparkle(x, y, E.core, Math.round(14 * Math.min(1.5, k)), 340);
      fx.motes(x, y, E, 8, r * 1.6, 120);
      fx.shake(Math.min(8, 4 * k));
    },
  });

})(typeof window !== 'undefined' ? window : globalThis);
