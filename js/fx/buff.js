'use strict';
// 特效庫｜增益（charge / stance / parry / divinesight / gfoc / adamas / mikiri / pojun / summon / roar / bloodroar / awaken / shadowrise / eclipse / thunderwake / pressure / ironfist / posturebreak）：蓄力、架式、見切、神虛視、見切一閃、破軍、召喚、咆哮、血吼、覺醒、影起、月蝕、雷槌覺醒、威壓、鐵手套反槌與架勢崩潰
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
      fx.punch(0.035, x, y);
      fx.shake(Math.min(8, 4 * k));
    },
  });

  BD.defineEffect('clash', {
    name: '對撞', category: '增益',
    desc: '刀刃相撞：雙方代表色的兩道弧光與交叉亮線在接點迸開、白熱閃光、垂直刀鋒噴出兩股火花；首下與最後一下更猛，最後一下留下雙方殘影與震波。適合近戰對撞、拚刀。',
    params: { first: false, last: false },
    spawn(fx, x, y, o) {
      const E = o.E, V = BD.vrng, k = Math.min(1.4, o.k), a = o.src, b = o.other, big = o.first || o.last;
      const th = a && b ? Math.atan2(b.y - a.y, b.x - a.x) : o.angle, R = (big ? 120 : 85) * k;
      const ca = a ? a.def.glow : E.glow, cb = b ? b.def.glow : E.glow;
      // 雙方各一道弧光自己那側劈向接點；兩道交叉亮線的斜度每下隨機，連拚才不會每下長一樣
      const tilt = V.range(0.25, 0.85);
      fx.slash(x, y, th + Math.PI + V.range(-0.5, 0.5), 1.4, R * 0.8, ca, big ? 12 : 8, 0.2, { core: '#ffffff', trail: 2 });
      fx.slash(x, y, th + V.range(-0.5, 0.5), 1.4, R * 0.8, cb, big ? 12 : 8, 0.2, { core: '#ffffff', trail: 2 });
      for (const s of [-1, 1]) {
        const p = th + Math.PI / 2 + s * tilt, dx = Math.cos(p) * R, dy = Math.sin(p) * R;
        fx.streak(x - dx, y - dy, x + dx, y + dy, big ? 5 : 3.5, s < 0 ? '#ffffff' : E.core, 0.16, true);
      }
      fx.flashAt(x, y, (big ? 34 : 24) * k, '#ffffff', 0.08); // 閃光不能蓋住相碰的刀鋒
      for (const s of [-1, 1]) fx.sparkle(x, y, E.core, Math.round((big ? 12 : 7) * k), 330 + V() * 160, th + Math.PI / 2 * s, 0.9);
      fx.sparks(x, y, '#ffe8b0', Math.round(6 * k), 220);
      fx.shake(big ? 5 : 2.5, th);
      if (big) { fx.ring(x, y, 6, 55 * k, 0.2, '#ffffff', 3); fx.punch(0.02, x, y); }
      if (o.last) {
        fx.shock(x, y, 10, 95 * k, 0.3, E.glow, 6, E.core);
        if (a) fx.ghost(a, 0.3, ca);
        if (b) fx.ghost(b, 0.3, cb);
        fx.punch(0.035, x, y); fx.shake(8, th);
      }
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
      fx.punch(0.06, x, y); fx.grade(E.glow, 0.7, 1.2);
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
      fx.punch(0.045, x, y); fx.grade('#ffcc33', 0.6, 0.6);
      fx.shake(Math.min(8, 3 * k));
    },
  });
  BD.defineEffect('divinesight', {
    name: '神虛視', category: '增益',
    desc: '看穿並複製對手招式的瞬間：場地轉暗、一對粉紅放射輪紋的眼紋光環向外盪開，施放者身後疊出三道殘影，八道放射光線與秘紋光點四散（搭配 replica 元素的粉紅色）。適合複製、見切、看破類的反擊（亞當的神虛視）。',
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

  BD.defineEffect('gfoc', {
    name: '全宇宙之父', category: '增益',
    desc: '眾神之王的登場：金光爆環向外推開，頭頂炸出「GFOC」字樣，四周飄起小提琴的音符（赫密士演奏的 G 弦之歌），施放者身上的肌肉一圈圈膨脹（三層殘影由小到大）。適合帶點滑稽的王者登場、自我強化。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, V = BD.vrng, src = o.src || null, r = src && src.r ? src.r : 30;
      fx.flash(E.glow, 0.3);
      fx.shock(x, y, r, r * 6.5, 0.5, E.glow, 8 * Math.min(1.5, k), E.core);
      fx.ring(x, y, r, r * 4, 0.35, '#ffffff', 4);
      fx.glow(x, y, r * 2.6, E.glow, 0.7, 0.55, 0.4, src);
      fx.text(x, y - r - 46, 'G F O C', E.glow, 34);
      for (let i = 0; i < 8; i++) { // 小提琴的音符：一個個從四周飄起
        const a = i / 8 * Math.PI * 2 + V() * 0.4, d = r * (1.6 + V());
        fx.after(i * 0.07, () => fx.text(x + Math.cos(a) * d, y + Math.sin(a) * d, i % 2 ? '♪' : '♫', i % 3 ? E.core : E.glow, 22 + 6 * V()));
      }
      if (src) for (let i = 0; i < 3; i++) fx.after(i * 0.09, () => { fx.ghost(src, 0.35, E.glow); fx.ring(src.x, src.y, r * (1 + i * 0.4), r * (1.6 + i * 0.6), 0.25, E.core, 3); });
      fx.sparkle(x, y, E.core, Math.round(16 * Math.min(1.5, k)), 360);
      fx.motes(x, y, E, 14, r * 2, 160);
      fx.shake(Math.min(12, 6 * k));
    },
  });

  BD.defineEffect('adamas', {
    name: '阿陀磨須', category: '增益',
    desc: '把全身肌肉壓縮到極限的變身：life 秒內施放者渾身燒成橘紅、蒸氣不斷往上冒、光環一圈圈向身體擠壓；時間到時一大團白煙炸開，紫黑星海的暗幕籠罩全場、星光點點，雙層震波與光柱把新的形態推出煙霧。適合肌肉壓縮、肉體極限化、令眾生本能顫抖的終極形態（phase2.transFx）。',
    params: { life: 1.6 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, V = BD.vrng, src = o.src || null, r = src && src.r ? src.r : 30, life = o.life || 1.6;
      const pos = () => (src ? [src.x, src.y] : [x, y]);
      fx.glow(x, y, r * 1.6, '#ff7a2a', life, 0.75, 0.6, src); // 1. 壓縮中：橘紅的高熱身體
      for (let t = 0; t < life; t += 0.12) {
        fx.after(t, () => {
          const [cx, cy] = pos(), q = t / life;
          fx.ring(cx, cy, r * (3.4 - q), r * 0.9, 0.2, q > 0.6 ? '#ffffff' : '#ffb070', 3 + 3 * q); // 光環向身體擠壓
          fx.smoke(cx + (V() - 0.5) * r, cy + (V() - 0.5) * r, 'rgba(255,240,230,0.5)', 2 + Math.round(3 * q), r * 0.8); // 蒸氣
          fx.embers(cx, cy, '#ffb070', 2, r, 60);
          fx.shake(2 + 6 * q);
        });
      }
      fx.after(life, () => { // 2. 白煙炸開，紫黑星海籠罩
        const [cx, cy] = pos();
        fx.veil(1.6, 0.7, '#120424');
        fx.flash(E.core, 0.6);
        fx.smoke(cx, cy, 'rgba(235,230,240,0.7)', fx.budget(40), r * 3);
        fx.pillar(cx, cy, r * 1.6, E.glow, 0.6);
        fx.shock(cx, cy, r, r * 11, 0.9, E.glow, 14 * Math.min(1.5, k), E.core);
        fx.shock(cx, cy, r, r * 6, 0.55, '#ffffff', 6, '#ffffff');
        fx.glow(cx, cy, r * 3.5, E.glow, 1.2, 0.8, 0.3, src);
        for (let i = 0; i < 26; i++) { // 星光：散在暗幕上忽明忽滅
          const a = V() * Math.PI * 2, d = r * (2 + V() * 9), s = 4 + 6 * V(), l = 0.5 + V() * 0.6;
          fx.after(V() * 0.8, () => fx.glow(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, '#ffffff', l, 0.9, 0.2));
        }
        fx.motes(cx, cy, E, 30, r * 3, 240);
        fx.crack(cx, cy, r * 3.2, E.decal, 10, E.crack, 9);
        fx.shake(Math.min(26, 18 * Math.min(1.5, k)));
      });
    },
  });

  BD.defineEffect('ogreback', {
    name: '鬼背解放', category: '增益',
    desc: '肌肉撐破衣服、背上浮出惡鬼面孔的變身：life 秒內赤紅光暈越來越亮、背肌鼓動般的光環一圈圈搏動，地面不斷震動；時間到時衣服碎片炸飛、暗紅暗幕籠罩，巨大的「鬼」字浮現並向外炸開雙層震波、血紅火花與地裂。適合變身、解放本能、令人窒息的威壓（phase2.transFx）。',
    params: { life: 1.6 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, V = BD.vrng, src = o.src || null, r = src && src.r ? src.r : 30, life = o.life || 1.6;
      const pos = () => (src ? [src.x, src.y] : [x, y]);
      fx.glow(x, y, r * 1.8, '#ff2a1a', life, 0.7, 0.5, src); // 1. 壓抑中：赤紅的光暈越來越亮
      for (let t = 0; t < life; t += 0.14) {
        fx.after(t, () => {
          const [cx, cy] = pos(), q = t / life;
          fx.ring(cx, cy, r * 0.8, r * (1.4 + 1.6 * q), 0.22, q > 0.6 ? '#ffffff' : E.glow, 3 + 3 * q); // 背肌搏動
          fx.smoke(cx, cy, 'rgba(120,10,10,0.35)', 2 + Math.round(3 * q), r);
          fx.sparkle(cx, cy, E.core, 1 + Math.round(2 * q), 160 + 200 * q);
          fx.shake(2 + 7 * q);
        });
      }
      fx.after(life, () => { // 2. 撐破上衣，鬼臉浮現
        const [cx, cy] = pos();
        fx.veil(1.5, 0.65, '#1a0204');
        fx.flash(E.core, 0.6);
        for (let i = 0; i < 16; i++) { // 黑色布片炸飛
          const a = V() * Math.PI * 2;
          fx.debris(cx, cy, '#1b1517', 1, 280 + 220 * V(), 3 + 3 * V(), r * 0.3);
          fx.streak(cx, cy, cx + Math.cos(a) * r * 3.5, cy + Math.sin(a) * r * 3.5, 3, '#ffb0a0', 0.3, true);
        }
        fx.text(cx, cy - r - 70, '鬼', E.glow, 96);
        fx.pillar(cx, cy, r * 1.6, E.glow, 0.6);
        fx.shock(cx, cy, r, r * 11, 0.9, E.glow, 14 * Math.min(1.5, k), E.core);
        fx.shock(cx, cy, r, r * 6, 0.55, '#ffffff', 6, '#ffffff');
        fx.glow(cx, cy, r * 3.5, E.glow, 1.2, 0.8, 0.3, src);
        fx.sparkle(cx, cy, E.core, fx.budget(34), 480);
        fx.motes(cx, cy, E, 24, r * 3, 240);
        fx.crack(cx, cy, r * 3.2, E.decal, 10, E.crack, 9);
        fx.shake(Math.min(26, 18 * Math.min(1.5, k)));
      });
    },
  });
  // ── 鼬：萬花筒覺醒 / 須佐能乎 / 八咫鏡 ──
  BD.defineEffect('mangekyo', {
    name: '萬花筒覺醒', category: '增益',
    desc: '寫輪眼進化的瞬間：life 秒內全場沉入血紅暗幕，三枚勾玉狀的刃光繞著施放者越轉越快、越收越緊，血淚一滴滴墜落，畫面愈震愈烈；時間到時斗笠碎片炸飛、白閃之後炸開雙層震波與沖天紅光柱，三道烏鴉殘影四散。適合開眼、覺醒、覺悟的變身演出（phase2.transFx）。',
    params: { life: 1.8 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, V = BD.vrng, TAU = Math.PI * 2, src = o.src || null, r = src && src.r ? src.r : 30, life = o.life || 1.8;
      const pos = () => (src ? [src.x, src.y] : [x, y]);
      fx.veil(life + 0.9, 0.72, '#14000a');
      fx.glow(x, y, r * 2.2, '#ff1a3a', life, 0.7, 0.6, src);
      for (let t = 0, n = 0; t < life; t += 0.06, n++) {
        fx.after(t, () => {
          const [cx, cy] = pos(), q = t / life, rr = r * (2.8 - 1.5 * q);
          for (let i = 0; i < 3; i++) fx.slash(cx, cy, t * (5 + 9 * q) + i * TAU / 3, 0.85, rr, '#ff2a44', 3 + 3 * q, 0.12, { core: '#ffffff' });
          if (n % 3 === 0) fx.ring(cx, cy, rr * 1.7, rr * 0.55, 0.22, E.glow, 2 + 2 * q);
          if (n % 4 === 0) fx.sparkle(cx + (V() - 0.5) * r * 0.5, cy, '#d0102a', 2, 90, Math.PI / 2, 0.5); // 血淚
          fx.shake(1 + 6 * q);
        });
      }
      fx.after(life, () => {
        const [cx, cy] = pos();
        fx.flash('#ffffff', 0.7);
        for (let i = 0; i < 14; i++) fx.debris(cx, cy, '#cdbf9a', 1, 260 + 200 * V(), 3 + 3 * V(), r * 0.3); // 斗笠碎片
        fx.pillar(cx, cy, r * 1.5, E.glow, 0.7);
        fx.shock(cx, cy, r, r * 10, 0.85, E.glow, 12 * Math.min(1.5, k), E.core);
        fx.shock(cx, cy, r, r * 5.5, 0.5, '#ffffff', 5, '#ffffff');
        for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + V(); fx.streak(cx, cy, cx + Math.cos(a) * r * 6, cy + Math.sin(a) * r * 6, 8, '#0b0810', 0.7, false); }
        fx.sparkle(cx, cy, E.core, fx.budget(30), 460);
        fx.text(cx, cy - r - 60, '萬花筒', '#ff3048', 40);
        fx.crack(cx, cy, r * 3, E.decal, 9, E.crack, 8);
        fx.shake(Math.min(24, 16 * Math.min(1.5, k)));
      });
    },
  });

  BD.defineEffect('susanoo', {
    name: '須佐能乎', category: '增益',
    desc: '查克拉鎧甲的顯現：腳下炸出橘紅光柱與兩圈震波，肋骨狀的弧形刃光一根根從身體兩側伸出、合攏成骨架，赤橘火光與火星往上竄，「須佐能乎」字樣浮現。適合召喚巨大守護靈、鎧甲、護身化身。',
    params: { radius: 130 },
    spawn(fx, x, y, o) {
      const src = o.src || null, r = (src && src.r ? src.r : 30) * 2.4 * Math.min(1.3, o.scale || 1);
      fx.veil(0.9, 0.45, '#1a0600');
      fx.flash('#ffb070', 0.35);
      fx.pillar(x, y, r * 0.8, '#ff7a2a', 0.8);
      fx.shock(x, y, r * 0.3, r * 2.2, 0.6, '#ff7a2a', 8, '#fff0d0');
      fx.shock(x, y, r * 0.2, r * 1.4, 0.4, '#ffd29a', 4, '#ffffff');
      for (let i = 0; i < 6; i++) fx.after(0.05 * i, () => { // 肋骨一根根長出
        const yy = (i - 2.5) * r * 0.22, rr = r * (1.05 - Math.abs(i - 2.5) * 0.1);
        fx.slash(x, y + yy, -0.2, 2.6, rr, '#ff9a4a', 4, 0.5, { core: '#ffe9c8' });
        fx.slash(x, y + yy, Math.PI + 0.2, 2.6, rr, '#ff9a4a', 4, 0.5, { core: '#ffe9c8' });
      });
      fx.glow(x, y, r * 1.6, '#ff6a1a', 0.9, 0.7, 0.4, src);
      fx.embers(x, y, '#ffb070', fx.budget(24), r * 0.9, 220);
      fx.sparkle(x, y, '#ffe0b0', fx.budget(16), 380, -Math.PI / 2, 2.4);
      fx.text(x, y - r - 20, '須佐能乎', '#ffb070', 30);
      fx.shake(7);
    },
  });

  BD.defineEffect('yatamirror', {
    name: '八咫鏡', category: '增益',
    desc: '須佐能乎的盾「八咫鏡」擋下並彈回攻擊：場地一暗，橘金色的同心光環一圈接一圈由內向外盪開（鏡面波紋），三道旋轉的弧光刻出漩渦紋，中心白熱一閃、火花四濺。適合反射、彈反、絕對防禦（counter 動作的 fx）。',
    params: {},
    spawn(fx, x, y, o) {
      const src = o.src || null, r = src && src.r ? src.r : 30;
      fx.veil(0.4, 0.4, '#1a0600');
      fx.flash('#ffb060', 0.3);
      for (let i = 0; i < 4; i++) fx.after(i * 0.05, () => fx.ring(x, y, r * (0.6 + 0.3 * i), r * (2.4 + i), 0.42, i % 2 ? '#ffd29a' : '#ff7a2a', 5 - i));
      fx.shock(x, y, r * 0.5, r * 4.5, 0.5, '#ff7a2a', 8, '#fff0d0');
      fx.glow(x, y, r * 3, '#ff9a4a', 0.45, 0.8, 0.3);
      for (let i = 0; i < 3; i++) fx.slash(x, y, i * 2.09, 2.2, r * 1.8, '#ffe0a0', 4, 0.38, { core: '#ffffff' });
      fx.sparkle(x, y, '#fff0d0', fx.budget(18), 460);
      fx.shake(8);
    },
  });
  // ── 恐暴龍：暴怒（筋肉膨脹）──
  BD.defineEffect('dragonrage', {
    name: '暴怒膨脹', category: '增益',
    desc: '怒氣引爆的變身：life 秒內赤紅光暈越來越亮、全身筋肉像在膨脹般一圈圈搏動，口中龍屬性能量噴湧成折線電弧、地面不斷震動；時間到時暗紅暗幕籠罩、巨大的「怒」字浮現，雙層震波與向四面八方竄出的龍雷一起炸開。',
    params: { life: 1.7 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, V = BD.vrng, src = o.src || null, r = src && src.r ? src.r : 40, life = o.life || 1.7;
      const pos = () => (src ? [src.x, src.y] : [x, y]);
      fx.glow(x, y, r * 2, '#d0143c', life, 0.7, 0.5, src);
      for (let t = 0; t < life; t += 0.14) {
        fx.after(t, () => {
          const [cx, cy] = pos(), q = t / life, f = src ? src.face : 0, mx = cx + Math.cos(f) * r * 1.5, my = cy + Math.sin(f) * r * 1.5;
          fx.ring(cx, cy, r * 0.9, r * (1.5 + 1.4 * q), 0.22, q > 0.6 ? '#ffffff' : E.glow, 3 + 3 * q); // 筋肉搏動
          fx.motes(mx, my, E, 2 + Math.round(4 * q), 18, 160 + 160 * q);                                // 口中溢出的龍屬性能量
          fx.smoke(mx, my, E.smoke, 1 + Math.round(2 * q), r * 0.5);
          fx.shake(2 + 7 * q);
        });
      }
      fx.after(life, () => {
        const [cx, cy] = pos();
        fx.veil(1.5, 0.6, '#12000a');
        fx.flash(E.core, 0.6);
        for (let i = 0; i < 12; i++) { // 龍雷：向四面八方的三段折線
          let px = cx, py = cy, a = i / 12 * Math.PI * 2 + (V() - 0.5) * 0.3;
          for (let s = 0; s < 3; s++) {
            a += (V() - 0.5) * 0.7; const nx = px + Math.cos(a) * r * 2.6, ny = py + Math.sin(a) * r * 2.6;
            fx.streak(px, py, nx, ny, 8, E.glow, 0.4, true); fx.streak(px, py, nx, ny, 3, E.core, 0.28, true); px = nx; py = ny;
          }
        }
        fx.text(cx, cy - r - 70, '怒', E.glow, 96);
        fx.pillar(cx, cy, r * 1.6, E.glow, 0.6);
        fx.shock(cx, cy, r, r * 10, 0.9, E.glow, 14 * Math.min(1.5, k), E.core);
        fx.shock(cx, cy, r, r * 5.5, 0.55, '#ffffff', 6, '#ffffff');
        fx.glow(cx, cy, r * 3.5, E.glow, 1.2, 0.8, 0.3, src);
        fx.sparkle(cx, cy, E.core, fx.budget(30), 460);
        fx.motes(cx, cy, E, 24, r * 3, 240);
        fx.crack(cx, cy, r * 3.2, E.decal, 10, E.crack, 9);
        fx.shake(Math.min(26, 18 * Math.min(1.5, k)));
      });
    },
  });

  // ── 小次郎：千手無雙 / 萬手無雙（見切成功）與神器再錬（二階段變身）──
  BD.defineEffect('senju', {
    name: '千手無雙', category: '增益',
    desc: '在腦中模擬對手上千次：場地轉暗，對手周圍一圈圈青白細線構成的「模擬格線」逐條亮起、再猛然向對手收束，全屏一閃、浮出「見切」。適合讀招反擊、預判型見切。',
    params: {},
    spawn(fx, x, y, o) {
      const src = o.src || null, t = src && src.enemy ? src.enemy : { x, y, r: 26 }, r = t.r || 26;
      fx.veil(0.7, 0.55, '#02060e');
      for (let i = 0; i < 18; i++) {
        const a = i * Math.PI * 2 / 18;
        fx.after(i * 0.018, () => fx.beam(t.x + Math.cos(a) * r * 1.2, t.y + Math.sin(a) * r * 1.2, t.x + Math.cos(a) * r * 5.2, t.y + Math.sin(a) * r * 5.2, 2, '#9fd8ff', 0.3, '#ffffff'));
      }
      for (let i = 0; i < 3; i++) fx.after(0.1 + i * 0.08, () => fx.ring(t.x, t.y, r * (6 - i), r * 1.1, 0.26, i ? '#9fd8ff' : '#ffffff', 2.5));
      fx.after(0.38, () => { fx.flash('#ffffff', 0.35); fx.sparkle(t.x, t.y, '#ffffff', fx.budget(14), 340); fx.text(x, y - r - 34, '見切', '#cfe8ff', 34); fx.shake(7); });
      if (t.x !== x) fx.ghost(t, 0.45, '#9fd8ff');
    },
  });

  BD.defineEffect('manju', {
    name: '萬手無雙', category: '增益',
    desc: '千手的進化：不只讀對手，連空氣與地面傳來的震動都讀進來。場地轉暗，一圈圈震動環同時由空中（青白）與地面（金色）向外盪開，對手周圍的模擬格線更密，全屏白閃、震波盪開，浮出「萬手」。適合讀招反擊的強化版。',
    params: {},
    spawn(fx, x, y, o) {
      const k = Math.min(1.5, o.k), src = o.src || null, t = src && src.enemy ? src.enemy : { x, y, r: 26 }, r = t.r || 26;
      fx.veil(0.9, 0.62, '#02040c');
      for (let i = 0; i < 28; i++) {
        const a = i * Math.PI * 2 / 28, L = r * (4.4 + (i % 3) * 1.4);
        fx.after(i * 0.012, () => fx.beam(t.x + Math.cos(a) * r * 1.1, t.y + Math.sin(a) * r * 1.1, t.x + Math.cos(a) * L, t.y + Math.sin(a) * L, 2, i % 2 ? '#9fd8ff' : '#ffe39a', 0.34, '#ffffff'));
      }
      for (let i = 0; i < 4; i++) fx.after(i * 0.07, () => { fx.ring(x, y, r, r * (5 + i * 2), 0.5, '#9fd8ff', 3); fx.ring(x, y, r, r * (4 + i * 1.6), 0.5, '#ffd36a', 3); });
      fx.after(0.36, () => { fx.flash('#ffffff', 0.45); fx.shock(t.x, t.y, r, r * 6, 0.45, '#9fd8ff', 6, '#ffffff'); fx.sparkle(t.x, t.y, '#ffffff', fx.budget(20), 420); fx.text(x, y - r - 38, '萬手', '#ffe9a0', 40); fx.shake(Math.min(12, 9 * k)); });
      if (t.x !== x) fx.ghost(t, 0.55, '#ffe39a');
    },
  });

  BD.defineEffect('rewelund', {
    name: '神器再錬', category: '增益',
    desc: '物干し竿被折斷、神器再錬成二刀的變身：life 秒內暗幕籠罩，先是刀身白光龜裂、一記脆響折成兩段（白閃、金屬碎片四散、「折」字），接著鍛造的橘紅光與火星一下下搏動（錘擊光環），時間到長刀（紅）與小太刀（紫）的光刃交叉貫出、雙層震波與光柱、「神器再錬」字樣。適合武器損毀後重生的變身（phase2.transFx）。',
    params: { life: 1.9 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), V = BD.vrng, TAU = Math.PI * 2, src = o.src || null, r = src && src.r ? src.r : 30, life = o.life || 1.9;
      const pos = () => (src ? [src.x, src.y] : [x, y]);
      fx.veil(life + 0.9, 0.7, '#08040a');
      for (let t = 0; t < 0.5; t += 0.05) fx.after(t, () => { const [cx, cy] = pos(); fx.sparkle(cx + (V() - 0.5) * r * 3, cy + (V() - 0.5) * r * 3, '#ffffff', 2, 160, V() * TAU, 0.4); fx.shake(1 + t * 8); });
      fx.after(0.5, () => { // 折斷
        const [cx, cy] = pos();
        fx.flash('#ffffff', 0.6); fx.flashAt(cx, cy, r * 4, '#ffffff', 0.2);
        for (let i = 0; i < 12; i++) fx.debris(cx, cy, '#dfe6f0', 1, 280 + 220 * V(), 2.5 + 3 * V(), r * 0.3);
        for (const s of [-1, 1]) fx.streak(cx, cy, cx + Math.cos(s * 0.9) * r * 6, cy + Math.sin(s * 0.9) * r * 6, 6, '#ffffff', 0.4, true);
        fx.text(cx, cy - r - 36, '折', '#ffffff', 40); fx.shake(14);
      });
      for (let t = 0.7, n = 0; t < life; t += 0.17, n++) fx.after(t, () => { // 鍛造：錘擊
        const [cx, cy] = pos(), q = (t - 0.7) / (life - 0.7);
        fx.glow(cx, cy, r * (2.4 + q * 1.2), '#ff7a2a', 0.2, 0.5 + 0.3 * q, 0.3, src);
        fx.ring(cx, cy, r * (3.2 - q), r * 0.8, 0.2, n % 2 ? '#ffb347' : '#ffe3a0', 3);
        fx.sparkle(cx, cy, '#ffb347', fx.budget(6), 260, -Math.PI / 2, 1.6);
        fx.embers(cx, cy, '#ff8a2a', 3, r * 1.4, 90);
        fx.shake(2 + 5 * q);
      });
      fx.after(life, () => {
        const [cx, cy] = pos(), a = src && src.face != null ? src.face : 0;
        fx.flash('#ffffff', 0.7);
        fx.beam(cx, cy, cx + Math.cos(a - 0.75) * r * 9, cy + Math.sin(a - 0.75) * r * 9, 20, '#ff4a3a', 0.6, '#ffffff'); // 長刀（紅柄）
        fx.beam(cx, cy, cx + Math.cos(a + 0.75) * r * 7, cy + Math.sin(a + 0.75) * r * 7, 14, '#a07aff', 0.6, '#ffffff'); // 小太刀（紫柄）
        fx.pillar(cx, cy, r * 1.4, '#ffb347', 0.7);
        fx.shock(cx, cy, r, r * 9, 0.8, '#ff7a2a', 11 * Math.min(1.5, k), '#fff0d0');
        fx.shock(cx, cy, r, r * 5, 0.5, '#ffffff', 5, '#ffffff');
        fx.sparkle(cx, cy, '#ffe3a0', fx.budget(28), 460);
        fx.text(cx, cy - r - 60, '神器再錬', '#ffd36a', 38);
        fx.crack(cx, cy, r * 3, E.decal, 9, E.crack, 8);
        fx.shake(Math.min(22, 15 * k));
      });
    },
  });

  // 波賽頓二階段轉場：被叫「雜魚」的小次郎讀穿了一切，神中之神認真起來。圖片依據＝動畫設定圖：手臂上金色的尖刺環（發光的金色刻痕）、藍色大海
  BD.defineEffect('godofgods', {
    name: '神中之神', category: '增益',
    desc: '海神認真起來：life 秒內深藍暗幕籠罩，一根根水柱在身旁沖天而起、水環一圈圈向腳下收攏，二頭肌上的金色尖刺環一閃一閃越來越亮、地面隨每一踏震動；時間到全屏白閃，金白光柱貫穿，藍金雙層震波與水幕炸開、水花與氣泡四散，浮出「GOD of GODS」與「神中之神」。適合海神 / 水神的變身（phase2.transFx）。',
    params: { life: 2.0 },
    spawn(fx, x, y, o) {
      const E = o.E, k = Math.min(1.5, o.k), V = BD.vrng, TAU = Math.PI * 2, src = o.src || null, r = src && src.r ? src.r : 34, life = o.life || 2.0;
      const pos = () => (src ? [src.x, src.y] : [x, y]);
      fx.veil(life + 1.2, 0.62, '#020a20');
      fx.glow(x, y, r * 2.6, E.glow, life, 0.5, 0.4, src);
      for (let t = 0, n = 0; t < life; t += 0.12, n++) fx.after(t, () => {
        const [cx, cy] = pos(), q = t / life, a = V() * TAU, d = r * (1.6 + 1.8 * V());
        fx.pillar(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 10 + 14 * V(), E.glow, 0.5);              // 水柱沖天
        fx.ring(cx, cy, r * (4 - 2.6 * q), r * 0.9, 0.24, n % 2 ? E.core : E.glow, 3);                 // 水環向腳下收攏
        for (const s of [-1, 1]) { const ax = cx + Math.cos((src ? src.face : 0) + s * 1.55) * r * 0.85, ay = cy + Math.sin((src ? src.face : 0) + s * 1.55) * r * 0.85; fx.sparkle(ax, ay, '#ffd86a', 2 + Math.round(3 * q), 220, (src ? src.face : 0) + s * 1.55, 1.2); } // 手臂上的金色尖刺環
        if (n % 4 === 0) fx.shake(2 + 6 * q);
      });
      fx.after(life, () => {
        const [cx, cy] = pos();
        fx.flash('#ffffff', 0.75);
        fx.pillar(cx, cy, r * 1.5, '#ffe9a0', 0.8);
        fx.shock(cx, cy, r, r * 10, 0.85, E.glow, 13 * k, E.core);
        fx.after(0.08, () => fx.shock(cx, cy, r, r * 6, 0.6, '#ffd86a', 6, '#fff6d0'));
        for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; fx.streak(cx, cy, cx + Math.cos(a) * r * 5, cy + Math.sin(a) * r * 5, 5, i % 2 ? E.glow : '#ffd86a', 0.35, true); }
        fx.glow(cx, cy, r * 4, E.glow, 1.1, 0.8, 0.3, src);
        fx.sparkle(cx, cy, E.core, fx.budget(32), 480);
        fx.motes(cx, cy, E, 26, r * 3, 260);
        fx.text(cx, cy - r - 78, 'GOD of GODS', '#ffe9a0', 38);
        fx.text(cx, cy - r - 36, '神中之神', '#e8fbff', 34);
        fx.crack(cx, cy, r * 3.2, E.decal, 10, E.crack, 9);
        fx.shake(Math.min(24, 17 * k));
      });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
