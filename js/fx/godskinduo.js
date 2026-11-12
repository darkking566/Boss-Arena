'use strict';
// 特效庫｜神皮雙人組（gsflamebolt / gsscythe / gsstab / gshook / gswhirl / gsleap / gssweep / gsthrust / gsbelly / gsslam / gsplunge / gsburst / gstornado / gsritual / gsritualburst /
// gsgather / gswheel / gscrusher / gsrevive / gsawaken）：黑煙配白色火星的神皮黑焰、使徒的長柄鐮刃、貴人的細劍與腹撞、互相喚醒。
// 兩人本體的造型在 js/render/styles/godskinduo.js；這裡只負責刀痕、火焰與震波。只呼叫 fx 原件；亂數只用 BD.vrng；不觸碰 DOM。
(function (G) {
  const BD = G.BD, TAU = Math.PI * 2, V = BD.vrng;
  const SMOKE = 'rgba(6,4,12,0.74)', WHITE = '#ffffff', LAV = '#b9b4ff', PALE = '#ece6f6', CELADON = '#a6e8cf', SKIN = '#e4dccd';
  BD.KIND_EL.gsflame = 'blackflame';
  const pt = (x, y, a, d, l) => [x + Math.cos(a) * d - Math.sin(a) * (l || 0), y + Math.sin(a) * d + Math.cos(a) * (l || 0)];
  // 黑焰：黑煙翻湧、白色火星迸出、少許薰紫餘燼
  function flame(fx, x, y, r, n) {
    fx.smoke(x, y, SMOKE, fx.budget(n), r);
    fx.sparkle(x, y, WHITE, fx.budget(n * 2), r * 3, -Math.PI / 2, TAU);
    fx.embers(x, y, LAV, fx.budget(Math.ceil(n / 2)), r, 80);
  }

  BD.defineEffect('gsflamebolt', {
    name: '神皮・黑焰彈', category: '投射物',
    desc: '使徒抬手擲出的黑焰球：粗黑的煙跡拖在身後，中心一道細白的亮線與白色火星，出手處炸開一圈薰紫光環。',
    params: { len: 220 },
    spawn(fx, x, y, o) {
      const a = o.angle || 0, L = o.len || 220, [tx, ty] = pt(x, y, a, L, 0);
      fx.streak(x, y, tx, ty, 14, '#0a0710', 0.26, false);
      fx.streak(x, y, tx, ty, 3, WHITE, 0.2, true);
      fx.glow(x, y, 30, LAV, 0.2, 0.8); fx.ring(x, y, 6, 36, 0.25, LAV, 2.5);
      for (let i = 1; i <= 5; i++) { const [px, py] = pt(x, y, a, L * i / 5, 0); fx.after(i * 0.025, () => fx.sparkle(px, py, WHITE, fx.budget(3), 120, a, 1.2)); }
    },
  });

  BD.defineEffect('gsscythe', {
    name: '神皮・鐮刃', category: '斬擊',
    desc: '使徒長柄武器的一端鐮刃劃過：蒼白的新月刀光外圍包著黑色火緣，尾端帶出幾點白色火星。',
    params: { arc: 1.7 },
    spawn(fx, x, y, o) {
      const a = o.angle || 0, L = o.radius || o.len || 170;
      fx.slash(x, y, a, o.arc || 1.7, L, PALE, 10, 0.24, { core: WHITE, trail: 2, rim: '#1a1424' });
      fx.slash(x, y, a, (o.arc || 1.7) * 0.8, L * 0.85, '#0a0710', 16, 0.2, { trail: 1 });
      const [sx, sy] = pt(x, y, a, L * 0.7, 0); fx.sparkle(sx, sy, WHITE, fx.budget(8), 220, a, 1.1);
      fx.shake(2.5, a);
    },
  });

  BD.defineEffect('gsstab', {
    name: '神皮・長刃直刺', category: '突刺',
    desc: '使徒把長柄武器的直刃一端筆直捅出：蒼白細長的刃光外包黑焰，兩側各一道黑色殘影，刃尖炸開白色火星與一圈細環。',
    params: { len: 300 },
    spawn(fx, x, y, o) {
      const a = o.angle || 0, L = o.len || o.radius || 300, [tx, ty] = pt(x, y, a, L, 0);
      fx.streak(x, y, tx, ty, Math.max(14, (o.width || 70) * 0.3), '#0a0710', 0.26, false);
      fx.beam(x, y, tx, ty, 6, PALE, 0.2, WHITE);
      for (const s of [-1, 1]) { const [sx, sy] = pt(x, y, a, 20, s * 16), [ex, ey] = pt(x, y, a, L * 0.85, s * 10); fx.streak(sx, sy, ex, ey, 3, '#1a1424', 0.3, false); }
      fx.after(0.04, () => { fx.ring(tx, ty, 4, 44, 0.26, LAV, 3); fx.sparkle(tx, ty, WHITE, fx.budget(10), 240, a, 1.3); });
      fx.shake(3, a);
    },
  });

  BD.defineEffect('gshook', {
    name: '神皮・鉤刃回拉', category: '斬擊',
    desc: '刺出去的鐮刃鉤住對手往回扯：一道由遠而近收攏的蒼白彎鉤、往使徒方向倒抽的黑色拖影與白色火星。',
    params: { arc: 1.6 },
    spawn(fx, x, y, o) {
      const a = o.angle || 0, L = o.radius || o.len || 230;
      fx.slash(x, y, a, o.arc || 1.6, L, PALE, 9, 0.26, { core: WHITE, trail: 2, rim: '#1a1424' });
      for (let i = -1; i <= 1; i++) { const [sx, sy] = pt(x, y, a + i * 0.3, L, 0), [ex, ey] = pt(x, y, a + i * 0.3, L * 0.35, 0); fx.streak(sx, sy, ex, ey, i ? 3 : 6, i ? '#0a0710' : LAV, 0.28, !i); }
      fx.ring(x, y, L * 0.9, L * 0.3, 0.3, 'rgba(236,230,246,0.5)', 3);
      const [px, py] = pt(x, y, a, L * 0.4, 0); fx.sparkle(px, py, WHITE, fx.budget(8), 200, a + Math.PI, 1.2); fx.shake(3, a + Math.PI);
    },
  });

  BD.defineEffect('gswhirl', {
    name: '神皮・旋舞長刃', category: '斬擊',
    desc: '使徒握著長柄中段旋身：兩端的鐮刃與直刃各拉出半圈蒼白刀光，外圍一圈黑焰火緣與四散的白色火星。',
    params: { radius: 180 },
    spawn(fx, x, y, o) {
      const a = o.angle || 0, r = o.radius || 180;
      fx.slash(x, y, a, Math.PI * 0.95, r, PALE, 11, 0.26, { core: WHITE, trail: 2, rim: '#1a1424' });
      fx.slash(x, y, a + Math.PI, Math.PI * 0.95, r * 0.92, PALE, 8, 0.26, { core: WHITE, trail: 2 });
      fx.ring(x, y, r * 0.75, r * 1.05, 0.3, '#0a0710', 9);
      fx.sparkle(x, y, WHITE, fx.budget(10), r * 1.6, a, TAU); fx.embers(x, y, LAV, fx.budget(4), r * 0.8, 60); fx.shake(3);
    },
  });

  BD.defineEffect('gsleap', {
    name: '神皮・躍斬', category: '位移',
    desc: '使徒拖著長袍躍起：起跳處一圈塵環，空中一道黑底白芯的拖影，落點鐮刃由上而下劈出蒼白弧光與黑焰火星。',
    params: { len: 400 },
    spawn(fx, x, y, o) {
      const a = o.angle == null ? (o.src ? o.src.face : 0) : o.angle, L = o.len || 400, dur = o.dur || 0.35, [tx, ty] = pt(x, y, a, L, 0);
      fx.ring(x, y, 10, 70, 0.3, SKIN, 4); fx.puff(x, y, 0, 0, 24, 70, 0.6, 'sand', 0.4);
      fx.streak(x, y, tx, ty, 10, '#0a0710', dur + 0.2, false); fx.streak(x, y, tx, ty, 3, PALE, dur + 0.15, true);
      fx.after(dur, () => { fx.slash(tx, ty, a, 2.2, 150, PALE, 12, 0.26, { core: WHITE, trail: 3, rim: '#1a1424' }); flame(fx, tx, ty, 34, 4); fx.shake(5, a); });
    },
  });

  BD.defineEffect('gssweep', {
    name: '神皮・黑焰橫掃', category: '斬擊',
    desc: '使徒伸長身體橫掃：一道寬而低的黑焰弧，邊緣白色火星一路灑出，地面被黑煙貼地蓋過。',
    params: { arc: 0.8 },
    spawn(fx, x, y, o) {
      const a = o.angle || 0, L = o.radius || o.len || 440;
      fx.slash(x, y, a, o.arc || 0.8, L, '#0a0710', 22, 0.3, { core: LAV, trail: 3, rim: WHITE });
      for (let i = 1; i <= 4; i++) { const [px, py] = pt(x, y, a, L * i / 4.6, 0); fx.after(i * 0.03, () => flame(fx, px, py, 40, 3)); }
      fx.shake(3, a);
    },
  });

  BD.defineEffect('gsthrust', {
    name: '神皮・細劍突刺', category: '突刺',
    desc: '貴人的細劍直刺：一道青瓷色的細長劍光貫穿全程，劍尖炸開白色星芒與一圈細環，劍身兩側帶著短短的殘影。',
    params: { len: 380 },
    spawn(fx, x, y, o) {
      const a = o.angle || 0, L = o.len || o.radius || 380, [tx, ty] = pt(x, y, a, L, 0);
      fx.beam(x, y, tx, ty, 5, CELADON, 0.2, WHITE);
      for (const s of [-1, 1]) { const [sx, sy] = pt(x, y, a, 10, s * 14), [ex, ey] = pt(x, y, a, L * 0.9, s * 20); fx.streak(sx, sy, ex, ey, 2, PALE, 0.22, true); }
      fx.after(0.05, () => { fx.ring(tx, ty, 4, 40, 0.28, CELADON, 3); fx.sparkle(tx, ty, WHITE, fx.budget(12), 240, a, 1.4); });
      fx.shake(3, a);
    },
  });

  BD.defineEffect('gsbelly', {
    name: '神皮・貴人腹撞', category: '震波',
    desc: '貴人挺著圓腹整個撞出去：身前一道厚實的氣浪推開，地面揚起一排沙塵與碎石，腹皮震出蒼白的波紋。',
    params: { radius: 120 },
    spawn(fx, x, y, o) {
      const a = o.angle || 0, r = o.radius || 120, [px, py] = pt(x, y, a, r * 1.1, 0);
      fx.shock(px, py, 10, r * 1.2, 0.35, SKIN, 10, WHITE);
      fx.puff(px, py, Math.cos(a) * 60, Math.sin(a) * 60, r * 0.4, r * 1.3, 0.8, 'sand', 0.5);
      fx.debris(px, py, '#8c7b66', fx.budget(8), 260, 5, 1.5);
      fx.shake(7, a);
    },
  });

  BD.defineEffect('gsslam', {
    name: '神皮・柄擊', category: '砸地',
    desc: '貴人用細劍的劍柄重敲地面：碎石迸飛、一圈薄薄的震波與裂縫，煙塵低低地貼著地面散開。',
    params: { radius: 120 },
    spawn(fx, x, y, o) {
      const r = o.radius || 120;
      fx.shock(x, y, 8, r, 0.3, SKIN, 8, WHITE); fx.crack(x, y, r * 0.8, '#1a1424', 5, LAV, 5);
      fx.puff(x, y, 0, 0, r * 0.3, r, 0.7, 'sand', 0.45); fx.debris(x, y, '#8c7b66', fx.budget(10), 280, 5, TAU); fx.shake(6);
    },
  });

  BD.defineEffect('gsplunge', {
    name: '神皮・倒插', category: '砸地',
    desc: '使徒把長柄武器豎著插進地面：一道黑焰光柱沿刃身衝天，插入處裂縫放射、黑煙與白色火星炸開。',
    params: { radius: 125 },
    spawn(fx, x, y, o) {
      const r = o.radius || 125;
      fx.pillar(x, y, r * 0.35, LAV, 0.5); fx.beam(x, y, x, y - 220, 14, '#0a0710', 0.4, WHITE);
      fx.crack(x, y, r, '#1a1424', 7, LAV, 7); fx.shock(x, y, 10, r * 1.2, 0.38, LAV, 9, WHITE);
      flame(fx, x, y, r * 0.6, 10); fx.shake(9);
    },
  });

  BD.defineEffect('gsburst', {
    name: '神皮・黑焰爆發', category: '爆炸',
    desc: '黑焰在地面炸開：一圈黑色火環往外擴張，邊緣是白色火星，中心升起翻湧的黑煙柱與薰紫色閃光。',
    params: { radius: 200 },
    spawn(fx, x, y, o) {
      const r = o.radius || 200, k = Math.min(1.6, o.k || 1);
      fx.flashAt(x, y, r * 0.6, LAV, 0.12); fx.shock(x, y, r * 0.2, r, 0.5, '#0a0710', 14, WHITE);
      fx.ring(x, y, r * 0.3, r * 1.05, 0.55, LAV, 3); fx.pillar(x, y, r * 0.25, LAV, 0.5);
      flame(fx, x, y, r * 0.5, 12); fx.shake(Math.min(10, 5 * k));
    },
  });

  BD.defineEffect('gstornado', {
    name: '神皮・黑焰龍捲', category: '大招',
    desc: '戰灰「黑焰龍捲」：黑色火焰沿螺旋向外捲出三層，每層外緣灑滿白色火星，中心黑煙翻湧；是這場最華麗的一擊。',
    params: { radius: 220 },
    spawn(fx, x, y, o) {
      const r = o.radius || 220;
      fx.shock(x, y, r * 0.2, r, 0.55, '#0a0710', 16, WHITE);
      for (let k = 0; k < 3; k++) fx.after(k * 0.07, () => fx.ring(x, y, r * (0.3 + k * 0.15), r * (0.9 + k * 0.1), 0.6, k % 2 ? WHITE : LAV, 3));
      for (let i = 0; i < 16; i++) {
        const a = i * TAU / 16, [sx, sy] = pt(x, y, a, r * 0.25, 0), [ex, ey] = pt(x, y, a + 0.9, r, 0);
        fx.streak(sx, sy, ex, ey, 6, i % 2 ? '#0a0710' : LAV, 0.4, i % 2 === 0);
      }
      flame(fx, x, y, r * 0.6, 14); fx.flash(LAV, 0.25); fx.shake(8);
    },
  });

  BD.defineEffect('gsritual', {
    name: '神皮・黑焰儀式', category: '區域',
    desc: '地面亮起一圈黑焰符環，八根黑焰光柱依序從環上升起、越來越高，預警結束時一齊爆開。',
    params: { radius: 210 },
    spawn(fx, x, y, o) {
      const r = o.radius || 210, life = o.life || 1.1;
      fx.ring(x, y, r * 0.3, r, life, LAV, 2.5); fx.ring(x, y, r * 0.5, r * 0.75, life, WHITE, 1.5); fx.glow(x, y, r * 0.55, LAV, life, 0.3, 0.2);
      for (let i = 0; i < 8; i++) { const [px, py] = pt(x, y, i * TAU / 8, r * 0.9, 0); fx.after(i * life / 9, () => { fx.pillar(px, py, 11, LAV, life * 0.5); fx.sparkle(px, py, WHITE, fx.budget(3), 70, -Math.PI / 2, 0.8); }); }
    },
  });

  BD.defineEffect('gsritualburst', {
    name: '神皮・黑焰儀式爆發', category: '爆炸',
    desc: '黑焰儀式落下：一圈十二根黑焰光柱同時衝天，環內被黑煙與白色火星填滿，震波往外推。',
    params: { radius: 210 },
    spawn(fx, x, y, o) {
      const r = o.radius || 210;
      fx.flashAt(x, y, r * 0.7, LAV, 0.14); fx.shock(x, y, r * 0.3, r * 1.1, 0.5, '#0a0710', 14, WHITE);
      for (let i = 0; i < 12; i++) { const [px, py] = pt(x, y, i * TAU / 12, r * 0.85, 0); fx.pillar(px, py, 13, i % 2 ? LAV : WHITE, 0.55); flame(fx, px, py, 24, 3); }
      flame(fx, x, y, r * 0.5, 10); fx.shake(8);
    },
  });

  BD.defineEffect('gsgather', {
    name: '神皮・黑焰聚流', category: '增益',
    desc: '周圍的黑煙與白色火星向身體聚攏，一圈薰紫光環由外往內收縮；使徒與貴人出大招前的蓄力。',
    params: {},
    spawn(fx, x, y, o) {
      const r = o.src ? o.src.r : 26, life = o.life || 1;
      fx.charge(x, y, r * 4, LAV, life, o.src || null, 26); fx.ring(x, y, r * 6, r * 0.8, life, LAV, 3);
      fx.after(life * 0.5, () => fx.smoke(x, y, SMOKE, fx.budget(6), r * 3));
    },
  });

  BD.defineEffect('gswheel', {
    name: '神皮・神皮之輪', category: '突刺',
    desc: '貴人縮成一顆白色大球整個滾出去：沿路拖出一道蒼白的寬痕與滾起的沙塵，終點撞出一圈震波。',
    params: { len: 660 },
    spawn(fx, x, y, o) {
      const a = o.angle || 0, L = o.len || 660, [tx, ty] = pt(x, y, a, L, 0);
      fx.streak(x, y, tx, ty, 54, 'rgba(228,220,205,0.5)', 0.45, false); fx.streak(x, y, tx, ty, 6, WHITE, 0.3, true);
      for (let i = 1; i <= 6; i++) { const [px, py] = pt(x, y, a, L * i / 6, 0); fx.after(i * 0.04, () => { fx.puff(px, py, 0, -20, 40, 120, 0.8, 'sand', 0.5); fx.debris(px, py, '#8c7b66', fx.budget(3), 160, 4, TAU); }); }
      fx.after(0.2, () => { fx.shock(tx, ty, 10, 150, 0.4, SKIN, 10, WHITE); fx.shake(9, a); });
    },
  });

  BD.defineEffect('gscrusher', {
    name: '神皮・神皮碾壓', category: '大招',
    desc: '貴人浮到半空、整個身體砸下：落點一圈三層震波往外炸開，地面裂縫放射、碎石與沙塵衝起，畫面重重一震。',
    params: { radius: 195 },
    spawn(fx, x, y, o) {
      const r = o.radius || 195;
      for (let k = 0; k < 3; k++) fx.after(k * 0.07, () => fx.shock(x, y, r * 0.15, r * (0.8 + k * 0.2), 0.45, k % 2 ? LAV : SKIN, 12 - k * 2, WHITE));
      fx.crack(x, y, r, '#1a1424', 9, LAV, 8); fx.puff(x, y, 0, 0, r * 0.4, r * 1.5, 1, 'sand', 0.6);
      fx.debris(x, y, '#8c7b66', fx.budget(18), 360, 6, TAU); fx.flashAt(x, y, r * 0.5, WHITE, 0.1); fx.shake(14); fx.punch(0.04, x, y);
    },
  });

  BD.defineEffect('gsrevive', {
    name: '神皮・互相喚醒', category: '增益',
    desc: '倒下的一方被另一方喚醒：地面縫出一圈蒼白的針線、一根黑焰光柱從身下升起，黑煙與白色火星往上飄，皮膚般的白光一閃。',
    params: {},
    spawn(fx, x, y, o) {
      const r = o.src ? o.src.r : 30, big = !!o.big;
      fx.pillar(x, y, r * 0.8, LAV, 0.9); fx.ring(x, y, r * 3, r * 0.4, 0.7, LAV, 3);
      for (let i = 0; i < 10; i++) { const a = i * TAU / 10, [sx, sy] = pt(x, y, a, r * 2.4, 0), [ex, ey] = pt(x, y, a + 0.25, r * 0.6, 0); fx.streak(sx, sy, ex, ey, 1.6, i % 2 ? PALE : LAV, 0.5, true); }
      fx.after(0.35, () => { flame(fx, x, y, r * 1.2, big ? 18 : 10); fx.flashAt(x, y, r * 2, SKIN, 0.16); fx.shock(x, y, 10, r * 3, 0.5, LAV, 8, WHITE); });
      if (big) { fx.flash(LAV, 0.3); fx.shake(8); }
    },
  });

  BD.defineEffect('gsawaken', {
    name: '神皮・雙人覺醒', category: '大招',
    desc: '半血演出：使徒交叉雙臂浮起、貴人撕下腹皮，黑煙與白色火星倒捲向兩人，最後化為一聲落地的巨響震波，整個場地蒙上一層暗紫。',
    params: {},
    spawn(fx, x, y, o) {
      const r = o.src ? o.src.r : 26, life = o.life || 1.5;
      fx.charge(x, y, r * 6, LAV, life, null, 44); fx.grade('#3a2a5a', 0.12, life + 0.8);
      for (let i = 0; i < 3; i++) fx.after(i * 0.4, () => { fx.ring(x, y, r * (6 - i), r * 0.5, 0.9, i % 2 ? WHITE : LAV, 4); fx.smoke(x, y, SMOKE, fx.budget(8), r * 3); });
      fx.after(life * 0.9, () => { fx.shock(x, y, 20, r * 14, 0.7, '#0a0710', 18, WHITE); flame(fx, x, y, r * 2, 22); fx.flash(LAV, 0.4); fx.shake(14); });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
