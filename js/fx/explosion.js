'use strict';
// 特效庫｜爆炸（explode / burst / shellburst / sacburst / impact）：落點爆炸、小型爆散、外殼爆裂、卵囊破裂與 Boss 受擊爆點
// 只呼叫 fx 原件（js/engine/entities/fx.js）；亂數只用 BD.vrng；不觸碰 DOM。
// o：E 元素主題、radius 半徑、k 綜合倍率、heavy 沉重節奏、src / victim（僅 impact）
(function (G) {
  const BD = G.BD;

  BD.defineEffect('deathmark', {
    name: '死亡印記引爆', category: '爆炸',
    desc: '印記到期、積蓄的傷害一口氣引爆：全場暗了一瞬，三道元素色斬線交錯貫穿目標，黑色碎片與元素火花炸散，震波擴張，地面留下裂痕。適合延遲引爆、死亡印記、積蓄傷害爆發。',
    params: { radius: 110 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.radius || 110, a0 = BD.vrng() * Math.PI;
      fx.veil(0.35, 0.35, '#000000');
      fx.glow(x, y, r * 0.9, E.glow, 0.35, 0.8, 0.5);
      for (let i = 0; i < 3; i++) {
        const a = a0 + i * Math.PI / 3, dx = Math.cos(a) * r * 1.3, dy = Math.sin(a) * r * 1.3;
        fx.beam(x - dx, y - dy, x + dx, y + dy, 14 * Math.min(1.4, k), E.glow, 0.32, E.core);
      }
      fx.shock(x, y, 10, r * 1.4, 0.45, E.glow, 10 * Math.min(1.5, k), E.core);
      fx.debris(x, y, E.rim, Math.round(12 * k), 320, 3 + k, 12);
      fx.sparkle(x, y, E.core, Math.round(20 * k), 420);
      fx.motes(x, y, E, Math.round(14 * k), r * 0.5, 200);
      fx.crack(x, y, r * 0.7, E.decal, 5, E.crack, 6);
      fx.flashAt(x, y, r * 0.6, E.core, 0.16);
      fx.shake(Math.min(14, 8 * k));
    },
  });

  BD.defineEffect('explode', {
    name: '爆炸', category: '爆炸',
    desc: '投射物或隕石落地的爆炸：強光、光暈、急速擴張的震波、四散火花與彈跳碎石，地面留下焦痕。適合火球、砲彈、落雷。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.radius || 90;
      fx.flashAt(x, y, r * 0.6, E.core, 0.16);
      fx.glow(x, y, r * 0.9, E.glow, o.heavy ? 0.6 : 0.45, 0.7, 0.5);
      fx.shock(x, y, 5, r, o.heavy ? 0.55 : 0.35, E.glow, 6 * Math.min(1.6, k), E.core);
      fx.sparkle(x, y, E.core, Math.round(14 * k), 280);
      fx.debris(x, y, E.debris, Math.round(6 * k), 260, 3.5 + k * 0.6, r * 0.25);
      fx.decal(x, y, r * 0.6, E.decal, 8);
      fx.motes(x, y, E, Math.round(8 * k), r * 0.5, 160);
      if (o.heavy || k > 1.3) fx.smoke(x, y, E.smoke, Math.round(6 * k), r * 0.5);
      fx.shake(Math.min(14, (o.heavy ? 6 : 4) * Math.min(k, 1.8)));
    },
  });

  BD.defineEffect('burst', {
    name: '爆散', category: '爆炸',
    desc: '小型爆散：一圈短促光環與幾點火花，體積較大時伴隨煙霧與地面痕跡。適合召喚物死亡、自爆、陷阱、血霧。',
    params: { radius: 40 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, r = o.radius || 40;
      fx.ring(x, y, 4, r, 0.3, E.glow, 5 * Math.min(1.4, k));
      fx.sparkle(x, y, E.core, Math.round(12 * k), 220);
      fx.motes(x, y, E, Math.round(8 * k), r * 0.5, 120);
      fx.flashAt(x, y, r * 0.5, E.core, 0.1);
      if (r >= 80) {
        fx.smoke(x, y, E.smoke, Math.round(6 * k), r * 0.5);
        fx.decal(x, y, r * 0.55, E.decal, 6);
      }
      fx.shake(Math.min(8, 2.5 * k));
    },
  });

  // Boss 受擊爆點：數值對應舊 world.js damageBoss 的視覺（heavyHit / light 兩個分支）
  BD.defineEffect('shellburst', {
    name: '外殼爆裂', category: '爆炸',
    desc: '巨型岩殼從內部炸開：life 秒內裂縫不斷噴出火花與煙、內部熱光逐漸膨脹；時間到時岩塊大量四散彈跳、熔岩震波擴散、地面留下發光裂痕與滿天餘燼。適合熔岩 / 岩石系巨型 Boss 的二階段覺醒（phase2.transFx）。',
    params: { life: 0.6 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, src = o.src || null, r = src && src.r ? src.r : o.radius || 60, life = o.life;
      fx.charge(x, y, r * 2.2, E.glow, life, src, 18);
      // 蓄勢：裂縫隨機噴出火花與煙（位置取當下施放者，跟著抖動）
      for (let t = 0; t < life; t += 0.1) {
        fx.after(t, () => {
          const a = BD.vrng() * Math.PI * 2, d = r * (0.4 + BD.vrng() * 0.5);
          const px = (src ? src.x : x) + Math.cos(a) * d, py = (src ? src.y : y) + Math.sin(a) * d;
          fx.sparkle(px, py, E.core, 4, 220, a, 0.8);
          fx.smoke(px, py, E.smoke, 1, 8);
        });
      }
      fx.after(life, () => {
        const sx = src ? src.x : x, sy = src ? src.y : y;
        fx.flash(E.glow, 0.45);
        fx.debris(sx, sy, E.debris || E.particle, 22, 460, 8, r * 0.7);
        fx.debris(sx, sy, '#2a1a12', 10, 360, 11, r * 0.5);
        fx.shock(sx, sy, r * 0.8, r * 5, 0.7, E.glow, 12 * Math.min(1.5, k), E.core);
        fx.crack(sx, sy, r * 2.6, E.decal, 10, E.crack, 9);
        fx.embers(sx, sy, E.core, 40, r, 90);
        fx.sparkle(sx, sy, E.core, 36, 520);
        fx.glow(sx, sy, r * 2.4, E.glow, 0.9, 0.7, 0.5, src);
        fx.shake(Math.min(24, 16 * Math.min(k, 1.5)));
      });
    },
  });

  BD.defineEffect('sacburst', {
    name: '卵囊破裂', category: '爆炸',
    desc: '巨大卵囊從內部撐破：life 秒內場地被病綠暗幕籠罩、腹部（施放者身後）脈動發光並冒出氣泡；時間到時囊膜炸開，黏液四濺、毒霧翻湧、地面留下酸液斑點與綠色震波。適合蟲巢 / 母體系 Boss 的二階段覺醒（phase2.transFx）。',
    params: { life: 0.6 },
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k, src = o.src || null, r = src && src.r ? src.r : o.radius || 60, life = o.life;
      // 卵囊在施放者身後約 0.45r
      const sac = () => { const a = src && src.face != null ? src.face : 0, bx = src ? src.x : x, by = src ? src.y : y; return [bx - Math.cos(a) * r * 0.45, by - Math.sin(a) * r * 0.45]; };
      fx.veil(life + 0.7, 0.5, '#0a1405');
      for (let t = 0; t < life; t += 0.12) {
        fx.after(t, () => { const [sx, sy] = sac(); fx.motes(sx, sy, E, 3, r * 0.5, 60); fx.glow(sx, sy, r * 0.9, E.glow, 0.14, 0.35, 0.3); });
      }
      fx.after(life, () => {
        const [sx, sy] = sac();
        fx.flash(E.glow, 0.4);
        fx.debris(sx, sy, E.particle, 26, 380, 4, r * 0.4);
        fx.smoke(sx, sy, E.smoke, 22, r);
        fx.shock(sx, sy, r * 0.5, r * 4.5, 0.6, E.glow, 10 * Math.min(1.5, k), E.core);
        fx.motes(sx, sy, E, 30, r * 0.8, 200);
        fx.sparkle(sx, sy, E.core, 24, 380);
        for (let i = 0; i < 7; i++) {
          const a = BD.vrng() * Math.PI * 2, d = r * (0.6 + BD.vrng() * 1.8);
          fx.decal(sx + Math.cos(a) * d, sy + Math.sin(a) * d, r * (0.12 + BD.vrng() * 0.18), E.decal || 'rgba(0,0,0,0.3)', 8);
        }
        fx.glow(sx, sy, r * 2, E.glow, 0.8, 0.6, 0.5);
        fx.shake(Math.min(18, 12 * Math.min(k, 1.5)));
      });
    },
  });

  BD.defineEffect('impact', {
    name: '命中爆點', category: '爆炸',
    desc: 'Boss 被命中的瞬間爆點：依輕重噴出不同量的火花並震動畫面，重擊時追加全屏閃白、地面痕跡與煙塵。純視覺的受擊回饋。',
    params: {},
    spawn(fx, x, y, o) {
      const E = o.E, k = o.k;
      const dmg = o.dmg || 0, big = !!o.big, victim = o.victim || null;
      const vr = victim && victim.r ? victim.r : (o.radius || 60);
      let ang = o.angle;
      if (ang == null && o.src && victim) ang = Math.atan2(victim.y - o.src.y, victim.x - o.src.x);
      fx.flashAt(x, y, vr * 0.9 * Math.sqrt(Math.min(2, k)), E.core, 0.14);
      // 有攻擊方向時，火花大多順著打擊方向從受擊者身後噴出（看得出從哪邊被打），只留少量四散
      const sparkCol = big ? '#fff2a8' : '#ffd7a0';
      const nSpark = o.heavyHit ? (big ? 28 : 10) : (big ? 18 : 8), spd = o.heavyHit ? (big ? 460 : 260) : (big ? 380 : 240);
      if (ang != null) {
        const bx = x + Math.cos(ang) * vr * 0.4, by = y + Math.sin(ang) * vr * 0.4;
        fx.sparkle(bx, by, sparkCol, Math.round(nSpark * 0.75), spd * 1.15, ang, big ? 1.1 : 0.85);
        fx.sparks(x, y, sparkCol, Math.round(nSpark * 0.3), spd * 0.6);
      } else {
        fx.sparks(x, y, sparkCol, nSpark, spd);
      }
      if (o.heavyHit) {
        fx.shake(Math.min(24, 3 + dmg / 12), ang);
        if (big) {
          fx.flash('#fff', 0.12);
          fx.decal(x, y, vr * 1.3, E.decal, 6);
          fx.smoke(x, y, E.smoke, 8, vr);
        }
      } else {
        fx.shake(Math.min(14, 2 + dmg / 22), ang);
      }
      if (ang != null) fx.sparkle(x, y, E.core, Math.round(6 * k), 300, ang, 0.9);
      fx.motes(x, y, E, Math.round((big ? 6 : 3) * k), vr * 0.3, 120);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
