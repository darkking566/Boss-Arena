'use strict';
// 特效庫｜飛龍亞基爾專屬：agheelbreath 龍息 / agheelflame 天降龍炎 / agheelrain 滯空噴焰 / agheeldive 俯衝砸地 / agheelwing 翼擊 /
//   agheelgust 翼風驅逐 / agheeltakeoff 振翼起飛 / agheelroar 怒吼 / agheelheart 龍心熾燃（換階段）。
// 配色取自參考圖：橘金龍焰、白芯、焦黑煙與灰燼羽毛。只呼叫 fx 原件；亂數只用 BD.vrng；純視覺。
(function (G) {
  const BD = G.BD, TAU = Math.PI * 2, V = BD.vrng;
  const WHITE = '#fffbe8', CORE = '#ffe9a8', FLAME = '#ff8a1e', FLAME_D = '#e8480e', EMBER = '#ff5a12';
  const ASH = '#4a403a', SMOKE = 'rgba(38,26,20,0.34)', DUST = 'rgba(150,132,110,0.45)', RED = '#ff3b1a';
  const k_ = (o) => Math.min(1.6, o.k || 1);

  function flame(fx, x, y, s, life) {
    fx.glow(x, y, s, V() < 0.5 ? FLAME : FLAME_D, life, 0.55, 0.4);
    if (V() < 0.45) fx.glow(x, y, s * 0.45, CORE, life * 0.55, 0.65, 0.2);
    if (V() < 0.5) fx.embers(x, y, FLAME, 1, s * 0.4, 120);
  }
  // 灰燼羽毛：深灰的長條碎羽順著方向飄
  function feathers(fx, x, y, ang, spread, n, sp) {
    for (let i = 0; i < n; i++) {
      const a = ang + (V() - 0.5) * spread, v = sp * (0.5 + V() * 0.6);
      if (!fx.part(BD.PK.SQ, x, y, Math.cos(a) * v, Math.sin(a) * v, 0.7 + V() * 0.6, i % 3 ? ASH : '#7a6c60', 3 + V() * 2.5, 1.6)) break;
    }
  }

  BD.defineEffect('agheelbreath', { name: '亞基爾・龍息', category: '區域', params: { arc: 1.05 },
    desc: '飛龍拱頸噴出的橘金火浪：口前一團白熱，火團一波波翻滾向外、越遠越寬越暗，前緣捲起黑煙與火星，地上留下焦痕；接力時就是燒過湖面的橫掃龍息。rect 判定時是一道白芯的追蹤火柱。',
    spawn(fx, x, y, o) {
      const k = k_(o), ang = o.angle || 0, rr = (o.src && o.src.r) || 60, mx = x + Math.cos(ang) * rr * 0.95, my = y + Math.sin(ang) * rr * 0.95;
      fx.flashAt(mx, my, 40 * k, CORE, 0.1);
      if (o.shape === 'rect') { // 追蹤火柱
        const len = o.len || 520, w = o.width || 110, tx = x + Math.cos(ang) * len, ty = y + Math.sin(ang) * len;
        fx.beam(mx, my, tx, ty, w * 0.42, FLAME, 0.22, CORE);
        fx.beam(mx, my, tx, ty, w * 0.12, WHITE, 0.15, WHITE);
        for (let i = 0; i < 5; i++) { const u = 0.15 + 0.85 * V(), l = (V() - 0.5) * w * 0.9; flame(fx, mx + Math.cos(ang) * len * u - Math.sin(ang) * l, my + Math.sin(ang) * len * u + Math.cos(ang) * l, (20 + 22 * u) * k, 0.4); }
        fx.sparkle(tx, ty, CORE, fx.budget(5), 280, ang, 1.5);
        fx.smoke(tx, ty, SMOKE, fx.budget(2), 34); fx.shake(2);
        return;
      }
      const r = o.radius || 480, arc = o.arc || 1.05, tx0 = x + Math.cos(ang) * r * 0.95, ty0 = y + Math.sin(ang) * r * 0.95;
      for (let i = 0; i < 9; i++) { // 連續的火舌主體：口前白熱、往外越來越寬越紅
        const u = (i + 0.5) / 9, px = mx + (tx0 - mx) * u + (V() - 0.5) * 20, py = my + (ty0 - my) * u + (V() - 0.5) * 20;
        fx.glow(px, py, (20 + 50 * u) * k, u < 0.25 ? CORE : u < 0.6 ? FLAME : FLAME_D, 0.2, 0.6, 0.35);
      }
      for (let i = 0; i < 8; i++) fx.after(i * 0.03, () => {
        const q = (i + 1) / 8, d = r * (0.1 + 0.9 * q);
        for (let j = 0; j < 3 + (i >> 1); j++) { const a = ang + (V() - 0.5) * arc * 0.9, dd = d * (0.7 + 0.3 * V()); flame(fx, x + Math.cos(a) * dd, y + Math.sin(a) * dd, (40 + 55 * q) * k, 0.55); }
        if (V() < 0.35) fx.smoke(x + Math.cos(ang) * d, y + Math.sin(ang) * d, SMOKE, 1, 40);
      });
      fx.embers(tx0, ty0, EMBER, fx.budget(4), 60, 150);
      fx.after(0.2, () => { const tx = x + Math.cos(ang) * r * 0.92, ty = y + Math.sin(ang) * r * 0.92; fx.glow(tx, ty, 56 * k, CORE, 0.3, 0.7, 0.5); fx.decal(tx, ty, r * 0.15, 'rgba(30,12,4,0.32)', 6); });
      fx.sparkle(mx, my, CORE, fx.budget(5), 460, ang, arc * 0.45);
      fx.shake(3);
    } });

  BD.defineEffect('agheelflame', { name: '天降・亞基爾之炎', category: '區域', params: { len: 700, width: 200 },
    desc: '龍餐祈禱「亞基爾之炎」的放大版：飛龍在半空朝下噴焰，一整條長廊從天而降——每一段先落下白熱的火柱，再在地面炸成翻滾火海，邊緣捲起濃煙與上升的餘燼。',
    spawn(fx, x, y, o) {
      const k = k_(o), ang = o.angle || 0, len = o.len || 700, w = o.width || 200, c = Math.cos(ang), s = Math.sin(ang);
      for (let i = 0; i < 9; i++) fx.after(i * 0.02, () => {
        const u = (i + 0.3 + V() * 0.7) / 9, l = (V() - 0.5) * w * 0.8, px = x + c * len * u - s * l, py = y + s * len * u + c * l;
        fx.streak(px - s * 20, py - 150, px, py, 10, FLAME, 0.22, true); // 從天而降的火線（畫面上方為天空）
        flame(fx, px, py, (45 + 30 * V()) * k, 0.6);
        if (V() < 0.5) fx.embers(px, py, EMBER, 2, 30, 160);
      });
      fx.smoke(x + c * len * 0.6, y + s * len * 0.6, SMOKE, fx.budget(3), w * 0.5);
      fx.shake(4); fx.grade('#ff6a1a', 0.1, 0.2);
    } });

  BD.defineEffect('agheelrain', { name: '亞基爾・滯空噴焰', category: '區域', params: {},
    desc: '浮在半空的飛龍朝正下方大範圍噴火：一圈火浪由中心向外翻開，熱浪震環擴散，地面焦黑、火星與煙往外噴。',
    spawn(fx, x, y, o) {
      const k = k_(o), r = o.radius || 280;
      fx.flashAt(x, y, r * 0.5, CORE, 0.12);
      for (let i = 0; i < 10; i++) { const a = V() * TAU, d = r * Math.sqrt(V()) * 0.9; flame(fx, x + Math.cos(a) * d, y + Math.sin(a) * d, (34 + 26 * V()) * k, 0.55); }
      fx.shock(x, y, r * 0.2, r * 1.05, 0.4, FLAME, 6, CORE);
      fx.smoke(x, y, SMOKE, fx.budget(5), r * 0.7);
      fx.decal(x, y, r * 0.5, 'rgba(30,12,4,0.25)', 6);
      fx.shake(5);
    } });

  BD.defineEffect('agheeldive', { name: '亞基爾・俯衝砸地', category: '砸地', params: {},
    desc: '飛龍從高空砸落湖面：白熱閃光、橘紅火焰震波與灰色水霧 / 塵土雙層擴散，地面放射裂痕透出火光，碎石與燒焦的羽毛四散，鏡頭重重一震。',
    spawn(fx, x, y, o) {
      const k = k_(o), r = o.radius || 200;
      fx.flash('#ffd8a0', 0.18);
      fx.flashAt(x, y, r * 0.9, WHITE, 0.14);
      fx.shock(x, y, r * 0.15, r * 1.15, 0.45, FLAME, 9, CORE);
      fx.after(0.07, () => fx.ring(x, y, r * 0.3, r * 1.5, 0.55, DUST, 10));
      fx.after(0.12, () => fx.shock(x, y, r * 0.4, r * 1.7, 0.5, 'rgba(210,210,200,0.35)', 5, '#e8e4dc'));
      fx.crack(x, y, r * 1.05, 'rgba(40,20,10,0.55)', 8, FLAME, 9);
      fx.debris(x, y, '#7a6a58', fx.budget(18), 340 * k, 6, TAU);
      feathers(fx, x, y, 0, TAU, fx.budget(14), 300);
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + V() * 0.4; flame(fx, x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, 42 * k, 0.6); }
      fx.embers(x, y, EMBER, fx.budget(18), r, 170);
      fx.shake(14); fx.punch(0.04, x, y);
    } });

  BD.defineEffect('agheelwing', { name: '亞基爾・翼擊', category: '斬擊', params: { arc: 1.4 },
    desc: '巨大的翅膀拍下 / 橫掃：深灰的羽緣拖出好幾層暗色弧光，前緣颳起白色風壓，灰燼碎羽與塵土順著翼掃的方向飛出。',
    spawn(fx, x, y, o) {
      const k = k_(o), ang = o.angle || 0, r = o.radius || 220, arc = o.arc || 1.4;
      if (o.shape === 'circle' || o.shape === 'ring') {
        fx.shock(x, y, r * 0.2, r * 1.1, 0.4, 'rgba(90,80,72,0.6)', 8, '#d8d0c4');
        fx.smoke(x, y, DUST, fx.budget(8), r * 0.7);
        feathers(fx, x, y, 0, TAU, fx.budget(12), 260);
        fx.embers(x, y, FLAME, fx.budget(14), r * 0.6, 200);
        flame(fx, x, y, r * 0.45 * k, 0.35);
        fx.shake(8); return;
      }
      for (let i = 0; i < 3; i++) fx.after(i * 0.04, () => fx.slash(x, y, ang - i * 0.06, arc, r * (1 - i * 0.1), i ? '#3c3430' : '#6a5e54', 22 - i * 6, 0.38, i ? { trail: 2 } : { core: '#efe8dc', trail: 2 }));
      fx.sparkle(x + Math.cos(ang) * r * 0.7, y + Math.sin(ang) * r * 0.7, '#e8e0d4', fx.budget(10), 300, ang, arc);
      feathers(fx, x + Math.cos(ang) * r * 0.5, y + Math.sin(ang) * r * 0.5, ang, arc, fx.budget(14), 320 * k);
      fx.smoke(x + Math.cos(ang) * r * 0.8, y + Math.sin(ang) * r * 0.8, DUST, fx.budget(6), r * 0.3);
      for (let i = 0; i < 6; i++) { // 翼緣颳起的焚灰火星：沿弧排一串小火團，讓沙地上看得出翼掃軌跡
        const a = ang - arc / 2 + arc * (i + 0.5) / 6, d = r * (0.75 + 0.2 * V());
        fx.after(i * 0.02, () => flame(fx, x + Math.cos(a) * d, y + Math.sin(a) * d, (22 + 14 * V()) * k, 0.4));
      }
      fx.shake(7);
    } });

  BD.defineEffect('agheelgust', { name: '亞基爾・翼風驅逐', category: '增益', params: {},
    desc: '被動「翼風驅逐」：雙翼猛然一振，一圈帶火星的強風從身體颳出，灰燼碎羽向外飛散、塵土貼地擴開。',
    spawn(fx, x, y, o) {
      const r = o.radius || 220;
      fx.shock(x, y, r * 0.3, r * 1.15, 0.42, 'rgba(110,96,84,0.55)', 7, '#f0e6d8');
      fx.after(0.05, () => fx.ring(x, y, r * 0.4, r * 1.3, 0.5, FLAME, 3));
      for (const s of [-1, 1]) fx.slash(x, y, (o.src ? o.src.face : 0) + s * Math.PI / 2, 2.2, r * 0.95, '#5a4e46', 14, 0.35, { core: '#e8dccc', trail: 2 });
      feathers(fx, x, y, 0, TAU, fx.budget(16), 340);
      fx.embers(x, y, FLAME, fx.budget(12), r * 0.8, 140);
      fx.smoke(x, y, DUST, fx.budget(6), r * 0.8);
      fx.shake(6);
    } });

  BD.defineEffect('agheeltakeoff', { name: '亞基爾・振翼起飛', category: '位移', params: {},
    desc: '雙翼往下一壓：腳下颳出一圈貼地的風壓與水霧 / 塵土，碎羽往外飛，留下兩道翼尖拖影。',
    spawn(fx, x, y, o) {
      const r = (o.src && o.src.r) || 90, a = o.angle == null ? (o.src ? o.src.face : 0) : o.angle;
      fx.ring(x, y, r * 0.6, r * 2.4, 0.5, DUST, 8);
      fx.after(0.06, () => fx.ring(x, y, r * 0.4, r * 1.8, 0.4, 'rgba(220,220,210,0.35)', 4));
      for (const s of [-1, 1]) { const px = x - Math.sin(a) * s * r * 1.6, py = y + Math.cos(a) * s * r * 1.6; fx.streak(px, py, px - Math.cos(a) * r * 1.4, py - Math.sin(a) * r * 1.4, 6, '#8a7e72', 0.3, false); }
      fx.smoke(x, y, DUST, fx.budget(8), r);
      feathers(fx, x, y, 0, TAU, fx.budget(10), 240);
    } });

  BD.defineEffect('agheelroar', { name: '亞基爾・怒吼', category: '增益', params: {},
    desc: '昂首怒吼：喉頭先亮起橘光，接著好幾圈音浪震環向外推開，地上的塵與火星被震起。',
    spawn(fx, x, y, o) {
      const src = o.src || null, r = (src && src.r) || 90, ang = src ? src.face : 0, hx = x + Math.cos(ang) * r, hy = y + Math.sin(ang) * r;
      fx.charge(hx, hy, r * 1.2, FLAME, 0.5, null, fx.budget(10));
      for (let i = 0; i < 3; i++) fx.after(0.25 + i * 0.12, () => fx.ring(hx, hy, r * 0.4, r * (2.4 + i * 0.8), 0.45, i % 2 ? 'rgba(255,190,120,0.45)' : 'rgba(230,220,210,0.45)', 6 - i));
      fx.after(0.3, () => { fx.smoke(x, y, DUST, fx.budget(6), r * 1.2); fx.shake(9); });
    } });

  BD.defineEffect('agheelheart', { name: '亞基爾・龍心熾燃', category: '增益', params: { life: 1.7 },
    desc: '換階段（改編）：暗幕下胸口的龍心一下下搏動，背脊棘刺一根根透出赤光（取自設定稿背棘的紅色描線），熱浪與餘燼往上竄；時間到朝天噴出巨大火柱，雙層火焰震波炸開，浮出「龍心熾燃」。',
    spawn(fx, x, y, o) {
      const src = o.src || null, r = (src && src.r) || 90, life = Math.max(0.8, o.life || 1.7), ang = src ? src.face : 0;
      fx.veil(life + 0.8, 0.45, '#0c0604');
      for (let i = 0; i < 4; i++) fx.after(life * (0.1 + i * 0.2), () => { // 龍心搏動
        fx.ring(x, y, r * 0.3, r * (1.4 + i * 0.35), 0.4, RED, 4);
        fx.glow(x, y, r * 0.7, EMBER, 0.3, 0.6, 0.3);
        for (let j = 0; j < 4; j++) { const d = -r * (0.9 - (i * 4 + j) * 0.12); fx.glow(x + Math.cos(ang) * d, y + Math.sin(ang) * d, 16, RED, 0.5, 0.7, 0.2); } // 背棘逐根亮起
        fx.embers(x, y, FLAME, fx.budget(6), r, 140);
      });
      fx.after(life * 0.7, () => fx.charge(x, y, r * 2.6, FLAME, life * 0.3, src, fx.budget(16)));
      fx.after(life, () => {
        fx.pillar(x + Math.cos(ang) * r, y + Math.sin(ang) * r, r * 0.9, FLAME, 1.1);
        fx.after(0.1, () => fx.pillar(x + Math.cos(ang) * r, y + Math.sin(ang) * r, r * 0.45, CORE, 0.8));
        fx.flash('#ffb070', 0.32);
        fx.shock(x, y, r, r * 5, 0.6, FLAME, 9, CORE);
        fx.after(0.12, () => fx.shock(x, y, r, r * 3.4, 0.5, RED, 5, '#ffd0a0'));
        fx.embers(x, y, FLAME, fx.budget(30), r * 2.4, 180);
        feathers(fx, x, y, 0, TAU, fx.budget(16), 320);
        fx.text(x, y - r - 70, '龍心熾燃', CORE, 30);
        fx.shake(16); fx.punch(0.045, x, y); fx.grade('#ff5a10', 0.35, 0.8);
      });
    } });
})(typeof window !== 'undefined' ? window : globalThis);
