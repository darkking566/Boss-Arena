'use strict';
// 特效庫｜飛龍亞基爾專屬：agheelbreath 龍息 / agheelflame 天降龍炎 / agheelrain 滯空噴焰 / agheeldive 俯衝砸地 / agheelwing 翼擊 /
//   agheelgust 翼風驅逐 / agheeltakeoff 振翼起飛 / agheelroar 怒吼 / agheelheart 龍心熾燃（換階段）/ agheelinhale 蓄息 /
//   agheelbite 撕咬 / agheelstomp 踏地 / agheeltail 甩尾 / agheelgore 角擊 / agheelpyre 地竄火柱 / agheelrock 火雨落點 / agheelnova 龍心火環。
// 龍息類特效從龍口噴出：口的位置依造型（js/render/styles/agheel.js）的頸長估算——身體中心往前 0.7r，再沿噴射方向 2.05r；
//   飛行招再往畫面上方抬高（與造型的離地高度一致：滯空噴焰 120、天降龍炎 150，× r/96）。
// 配色取自參考圖：橘金龍焰、白芯、焦黑煙與灰燼羽毛。只呼叫 fx 原件；亂數只用 BD.vrng；純視覺。
(function (G) {
  const BD = G.BD, TAU = Math.PI * 2, V = BD.vrng;
  const WHITE = '#fffbe8', CORE = '#ffe9a8', FLAME = '#ff8a1e', FLAME_D = '#e8480e', EMBER = '#ff5a12';
  const ASH = '#4a403a', SMOKE = 'rgba(38,26,20,0.34)', DUST = 'rgba(150,132,110,0.45)', RED = '#ff3b1a';
  const k_ = (o) => Math.min(1.6, o.k || 1);
  // 龍口位置（世界座標）：ang 為噴射方向；src 不存在時（圖鑑）退回特效原點前方
  function mouth(x, y, o, ang) {
    const src = o.src, r = (src && src.r) || 60, f = src && src.face != null ? src.face : ang;
    return [(src ? src.x : x) + Math.cos(f) * r * 0.7 + Math.cos(ang) * r * 2.05, (src ? src.y : y) + Math.sin(f) * r * 0.7 + Math.sin(ang) * r * 2.05];
  }

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
    desc: '飛龍拱頸從口中噴出的橘金火浪：口前白熱一團，幾道火舌從口裡沖出，火團沿路翻滾、越遠越寬越暗，前緣捲起黑煙與火星，地上留下焦痕；接力時就是燒過湖面的橫掃龍息。rect 判定時是一道白芯的追蹤火柱，末端炸開火花。',
    spawn(fx, x, y, o) {
      const k = k_(o), ang = o.angle || 0, [mx, my] = mouth(x, y, o, ang), c = Math.cos(ang), s = Math.sin(ang);
      const ox = o.src ? o.src.x : x, oy = o.src ? o.src.y : y;
      fx.flashAt(mx, my, 46 * k, CORE, 0.1);
      fx.glow(mx, my, 34 * k, WHITE, 0.16, 0.8, 0.3);
      if (o.shape === 'rect') { // 追蹤火柱：從口到判定末端
        const len = o.len || 520, w = o.width || 110, tx = ox + c * len, ty = oy + s * len, L = Math.max(60, Math.hypot(tx - mx, ty - my));
        fx.beam(mx, my, tx, ty, w * 0.5, FLAME_D, 0.2, FLAME);
        fx.beam(mx, my, tx, ty, w * 0.26, FLAME, 0.18, CORE);
        fx.beam(mx, my, tx, ty, w * 0.08, WHITE, 0.14, WHITE);
        for (let i = 0; i < 6; i++) { const u = (i + V()) / 6, l = (V() - 0.5) * w * 0.7 * u; flame(fx, mx + c * L * u - s * l, my + s * L * u + c * l, (18 + 30 * u) * k, 0.35); }
        for (let i = 0; i < 2; i++) { const l = (V() - 0.5) * w * 0.5; fx.streak(mx, my, mx + c * L * 0.7 - s * l, my + s * L * 0.7 + c * l, 9 * k, FLAME, 0.16, true); }
        fx.glow(tx, ty, 50 * k, FLAME, 0.3, 0.6, 0.6);
        fx.sparkle(tx, ty, CORE, fx.budget(6), 300, ang, 1.6);
        fx.embers(tx, ty, EMBER, fx.budget(3), 40, 140);
        fx.smoke(tx, ty, SMOKE, fx.budget(2), 34); fx.shake(2);
        return;
      }
      const r = o.radius || 480, arc = o.arc || 1.05, tx0 = ox + c * r * 0.95, ty0 = oy + s * r * 0.95, L = Math.max(80, Math.hypot(tx0 - mx, ty0 - my));
      for (let i = 0; i < 3; i++) { // 口中沖出的火舌：細長加亮拖影，往扇形內散開
        const a = ang + (V() - 0.5) * arc * 0.55, d = L * (0.55 + 0.35 * V());
        fx.streak(mx, my, mx + Math.cos(a) * d, my + Math.sin(a) * d, (12 + 6 * V()) * k, i ? FLAME : CORE, 0.2, true);
      }
      for (let i = 0; i < 7; i++) { // 連續的火舌主體：口前白熱、往外越來越寬越紅
        const u = (i + 0.5) / 7, px = mx + (tx0 - mx) * u + (V() - 0.5) * 24, py = my + (ty0 - my) * u + (V() - 0.5) * 24;
        fx.glow(px, py, (22 + 56 * u) * k, u < 0.22 ? CORE : u < 0.6 ? FLAME : FLAME_D, 0.22, 0.6, 0.35);
      }
      for (let i = 0; i < 6; i++) fx.after(i * 0.035, () => { // 火團一波波往外翻滾、越遠散得越開
        const q = (i + 1) / 6, d = L * (0.2 + 0.85 * q);
        for (let j = 0; j < 3 + (i >> 1); j++) { const a = ang + (V() - 0.5) * arc * (0.35 + 0.6 * q), dd = d * (0.75 + 0.3 * V()); flame(fx, mx + Math.cos(a) * dd, my + Math.sin(a) * dd, (30 + 38 * q) * k, 0.45); }
        if (V() < 0.4) fx.smoke(mx + c * d, my + s * d, SMOKE, 1, 40);
      });
      fx.embers(tx0, ty0, EMBER, fx.budget(4), 60, 150);
      fx.after(0.2, () => { fx.glow(tx0, ty0, 60 * k, FLAME, 0.3, 0.6, 0.5); fx.decal(tx0, ty0, r * 0.13, 'rgba(30,12,4,0.3)', 6); fx.smoke(tx0, ty0, SMOKE, fx.budget(2), 50); });
      fx.sparkle(mx, my, CORE, fx.budget(6), 520, ang, arc * 0.45);
      fx.shake(3);
    } });

  BD.defineEffect('agheelflame', { name: '天降・亞基爾之炎', category: '區域', params: { len: 700, width: 200 },
    desc: '龍餐祈禱「亞基爾之炎」的放大版：飛龍浮在半空，從口中朝地面斜斜噴下一道道火線，一整條長廊從天而降——每一段先落下白熱的火柱，再在地面炸成翻滾火海，邊緣捲起濃煙與上升的餘燼。',
    spawn(fx, x, y, o) {
      const k = k_(o), ang = o.angle || 0, len = o.len || 700, w = o.width || 200, c = Math.cos(ang), s = Math.sin(ang);
      const src = o.src, h = 150 * ((src && src.r) || 96) / 96, [mx, my0] = mouth(x, y, o, ang), my = my0 - h; // 飛在空中的龍口
      fx.glow(mx, my, 40 * k, CORE, 0.18, 0.8, 0.4);
      for (let i = 0; i < 7; i++) fx.after(i * 0.025, () => {
        const u = (i + 0.3 + V() * 0.7) / 7, l = (V() - 0.5) * w * 0.8, px = x + c * len * u - s * l, py = y + s * len * u + c * l;
        fx.streak(mx, my, px, py, (14 + 8 * V()) * k, i % 2 ? FLAME : CORE, 0.2, true); // 從龍口斜噴到地面的火線
        flame(fx, px, py, (45 + 30 * V()) * k, 0.6);
        if (V() < 0.5) fx.embers(px, py, EMBER, 2, 30, 160);
      });
      fx.after(0.12, () => { const u = 0.3 + 0.6 * V(); fx.ring(x + c * len * u, y + s * len * u, 20, w * 0.55, 0.35, 'rgba(255,170,90,0.5)', 4); });
      fx.smoke(x + c * len * 0.6, y + s * len * 0.6, SMOKE, fx.budget(3), w * 0.5);
      fx.shake(4); fx.grade('#ff6a1a', 0.1, 0.2);
    } });

  BD.defineEffect('agheelrain', { name: '亞基爾・滯空噴焰', category: '區域', params: {},
    desc: '浮在半空的飛龍朝前下方大範圍噴火：幾道火線從空中的龍口斜落，地上一圈火浪由中心向外翻開，熱浪震環擴散，地面焦黑、火星與煙往外噴。',
    spawn(fx, x, y, o) {
      const k = k_(o), r = o.radius || 280, src = o.src, h = 120 * ((src && src.r) || 96) / 96, [mx, my0] = mouth(x, y, o, src ? src.face : 0), my = my0 - h;
      fx.flashAt(x, y, r * 0.5, CORE, 0.12);
      fx.glow(mx, my, 36 * k, CORE, 0.16, 0.8, 0.4);
      for (let i = 0; i < 4; i++) { const a = V() * TAU, d = r * 0.6 * Math.sqrt(V()); fx.streak(mx, my, x + Math.cos(a) * d, y + Math.sin(a) * d, (12 + 6 * V()) * k, i ? FLAME : CORE, 0.2, true); }
      for (let i = 0; i < 9; i++) { const a = V() * TAU, d = r * Math.sqrt(V()) * 0.9; flame(fx, x + Math.cos(a) * d, y + Math.sin(a) * d, (34 + 26 * V()) * k, 0.55); }
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
  BD.defineEffect('agheelinhale', { name: '亞基爾・蓄息', category: '增益', params: { life: 0.8 },
    desc: '噴火前的蓄息：喉頭一下下亮起，四周的火星被吸進龍口，鼻孔冒出兩縷黑煙，口前的白熱越聚越亮。跟著龍頭轉向移動。',
    spawn(fx, x, y, o) {
      const src = o.src, life = Math.max(0.3, Math.min(1.4, o.life || 0.8)), r = (src && src.r) || 60;
      const at = () => mouth(x, y, o, src && src.face != null ? src.face : o.angle || 0);
      const n = Math.max(3, Math.round(life / 0.12));
      for (let i = 0; i < n; i++) fx.after(i * life / n, () => {
        const [mx, my] = at(), q = (i + 1) / n;
        fx.glow(mx, my, r * (0.18 + 0.3 * q), q > 0.6 ? CORE : FLAME, life / n * 2.2, 0.5 + 0.4 * q, 0.15);
        if (i % 3 === 0) fx.ring(mx, my, r * 1.5, r * 0.25, 0.3, 'rgba(255,170,90,0.4)', 3); // 往口中收縮的熱浪
        for (let j = 0; j < 5; j++) { // 被吸進口中的火星
          const a = V() * TAU, d = r * (0.9 + V() * 1.1), l = 0.2 + V() * 0.12;
          if (!fx.part(BD.PK.SPARK, mx + Math.cos(a) * d, my + Math.sin(a) * d, -Math.cos(a) * d / l, -Math.sin(a) * d / l, l, j ? FLAME : CORE, 1.8, 0)) break;
        }
        if (i % 2 === 0 && src) { // 鼻孔黑煙
          const f = src.face, bx = mx - Math.cos(f) * r * 0.35, by = my - Math.sin(f) * r * 0.35;
          for (const sd of [-1, 1]) fx.part(BD.PK.SOFT, bx - Math.sin(f) * sd * r * 0.06, by + Math.cos(f) * sd * r * 0.06, -Math.cos(f) * 30 + (V() - 0.5) * 20, -Math.sin(f) * 30 - 18, 0.7, 'rgba(30,22,18,0.4)', 6 + V() * 4, 1.5);
        }
      });
      fx.after(life * 0.85, () => { const [mx, my] = at(); fx.flashAt(mx, my, r * 0.5, CORE, 0.1); });
    } });

  BD.defineEffect('agheelbite', { name: '亞基爾・撕咬', category: '斬擊', params: {},
    desc: '巨顎猛然合上：上下兩排獠牙劃出兩道骨白弧光往中間咬合，咬合點迸出白光與碎牙般的火花、塵土噴開；元素為火時（二階段第三口）顎間噴出一團龍焰。',
    spawn(fx, x, y, o) {
      const k = k_(o), ang = o.angle || 0, r = Math.max(60, o.radius || 110), c = Math.cos(ang), s = Math.sin(ang), fire = o.el === 'fire';
      for (const sd of [-1, 1]) { // 上下顎：從兩側往中間合起
        const px = x - s * sd * r * 0.35 - c * r * 0.3, py = y + c * sd * r * 0.35 - s * r * 0.3;
        fx.slash(px, py, ang - sd * 0.55, 1.5, r * 0.75, '#5a504a', 14 * k, 0.26, { core: '#f2ead8', trail: 2 });
        fx.sparkle(x - s * sd * r * 0.2, y + c * sd * r * 0.2, '#f6eedc', fx.budget(5), 260, ang - sd * 1.2, 0.9);
      }
      fx.after(0.05, () => {
        fx.flashAt(x, y, r * 0.6, fire ? CORE : '#fff6e6', 0.1);
        fx.ring(x, y, r * 0.2, r * 0.9, 0.25, 'rgba(240,230,215,0.55)', 4);
        fx.smoke(x, y, DUST, fx.budget(4), r * 0.4);
        if (fire) {
          for (let i = 0; i < 6; i++) { const a = ang + (V() - 0.5) * 1.4, d = r * (0.2 + 0.8 * V()); flame(fx, x + Math.cos(a) * d, y + Math.sin(a) * d, (36 + 24 * V()) * k, 0.5); }
          fx.embers(x, y, EMBER, fx.budget(10), r * 0.6, 160);
        }
      });
      fx.shake(fire ? 7 : 5);
    } });

  BD.defineEffect('agheelstomp', { name: '亞基爾・踏地', category: '砸地', params: {},
    desc: '巨爪踏下：地面印出三趾爪痕與掌印，一圈塵土貼地擴散、碎石彈起，裂縫裡透出一點火光；突進重踏時震波更大。',
    spawn(fx, x, y, o) {
      const k = k_(o), r = o.radius || 130, ang = o.src ? o.src.face : o.angle || 0, c = Math.cos(ang), s = Math.sin(ang);
      fx.decal(x, y, r * 0.32, 'rgba(40,28,18,0.45)', 7); // 掌印
      for (let j = -1; j <= 1; j++) { const a = ang + j * 0.42, d = r * 0.52; fx.decal(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.12, 'rgba(30,20,12,0.5)', 7); } // 三趾
      fx.decal(x - c * r * 0.42, y - s * r * 0.42, r * 0.09, 'rgba(30,20,12,0.45)', 7);
      fx.shock(x, y, r * 0.2, r * 1.2, 0.4, 'rgba(150,130,104,0.55)', 7, '#efe4d0');
      fx.after(0.06, () => fx.ring(x, y, r * 0.3, r * 1.6, 0.5, DUST, 8));
      fx.crack(x, y, r * 0.8, 'rgba(40,20,10,0.5)', 6, FLAME, 6);
      fx.debris(x, y, '#7a6a58', fx.budget(12), 260 * k, 5, r * 0.3);
      fx.smoke(x, y, DUST, fx.budget(8), r * 0.8);
      fx.embers(x, y, EMBER, fx.budget(5), r * 0.5, 120);
      fx.shake(r > 240 ? 11 : 8);
    } });

  BD.defineEffect('agheeltail', { name: '亞基爾・甩尾', category: '斬擊', params: {},
    desc: '旋身甩尾掃過一整圈：好幾層灰黑弧光繞著身體轉、尾端破旗般的羽緣拖出碎羽，貼地的塵土被掃成一個圓，碎石往外飛。',
    spawn(fx, x, y, o) {
      const k = k_(o), r = o.radius || 300, a0 = o.src ? o.src.face : o.angle || 0;
      for (let i = 0; i < 3; i++) fx.after(i * 0.04, () => fx.slash(x, y, a0 + Math.PI + i * 0.3, TAU * 0.85, r * (0.95 - i * 0.12), i ? '#3c3430' : '#6a5e54', (26 - i * 6) * k, 0.4, i ? { trail: 2 } : { core: '#e8dccc', trail: 3 }));
      fx.ring(x, y, r * 0.5, r * 1.15, 0.5, DUST, 10);
      for (let i = 0; i < 10; i++) { // 沿圈掃起的塵與碎羽（切線方向）
        const a = a0 + i * TAU / 10, px = x + Math.cos(a) * r * 0.85, py = y + Math.sin(a) * r * 0.85;
        fx.after(i * 0.015, () => { fx.smoke(px, py, DUST, 1, 20); if (i % 2) feathers(fx, px, py, a + Math.PI / 2, 0.6, 2, 260); });
      }
      fx.debris(x, y, '#7a6a58', fx.budget(10), 320 * k, 5, r * 0.6);
      fx.shake(8);
    } });

  BD.defineEffect('agheelgore', { name: '亞基爾・角擊', category: '斬擊', params: {},
    desc: '低頭用頭角往上一挑：一道窄而亮的上挑弧光、角尖迸出火花，前方塵土與碎石被掀到半空。',
    spawn(fx, x, y, o) {
      const k = k_(o), ang = o.angle || 0, r = o.radius || 250, c = Math.cos(ang), s = Math.sin(ang);
      fx.slash(x, y, ang, 1.2, r * 0.9, '#5e544e', 22 * k, 0.3, { core: '#fff4e0', trail: 3 });
      fx.after(0.03, () => fx.slash(x, y, ang + 0.15, 0.9, r * 0.7, '#3c3430', 12 * k, 0.26, { trail: 1 }));
      const tx = x + c * r * 0.75, ty = y + s * r * 0.75;
      fx.flashAt(tx, ty, 44 * k, '#fff2dc', 0.1);
      fx.sparkle(tx, ty, '#ffe8c0', fx.budget(10), 380, ang, 0.9);
      fx.debris(tx, ty, '#7a6a58', fx.budget(10), 300 * k, 5, 30);
      fx.smoke(tx, ty, DUST, fx.budget(5), 50);
      fx.shake(7);
    } });

  BD.defineEffect('agheelpyre', { name: '亞基爾・地竄火柱', category: '區域', params: {},
    desc: '天降龍炎落地後沿著長廊一根根竄起的火柱：地面先閃白，火焰往上沖成一柱，外圈熱浪震開，焦黑地痕與上升的灰燼羽毛。',
    spawn(fx, x, y, o) {
      const k = k_(o), r = o.radius || 100;
      fx.flashAt(x, y, r * 0.8, CORE, 0.1);
      fx.pillar(x, y, r * 0.55, FLAME, 0.6);
      fx.after(0.05, () => fx.pillar(x, y, r * 0.28, CORE, 0.45));
      fx.shock(x, y, r * 0.2, r * 1.1, 0.35, FLAME_D, 5, CORE);
      for (let i = 0; i < 4; i++) { const a = V() * TAU, d = r * 0.5 * V(); flame(fx, x + Math.cos(a) * d, y + Math.sin(a) * d, (30 + 20 * V()) * k, 0.5); }
      fx.embers(x, y, EMBER, fx.budget(8), r * 0.5, 200);
      feathers(fx, x, y, -Math.PI / 2, 1.6, fx.budget(4), 160);
      fx.decal(x, y, r * 0.5, 'rgba(30,12,4,0.3)', 6);
      fx.shake(4);
    } });

  BD.defineEffect('agheelrock', { name: '亞基爾・火雨落點', category: '爆炸', params: {},
    desc: '大招的焚湖火雨落地：一團龍焰砸在地上炸開，白芯閃光、橘紅火環、四濺的火星與碎石，留下一小片焦痕。',
    spawn(fx, x, y, o) {
      const k = k_(o), r = o.radius || 80;
      fx.flashAt(x, y, r * 0.9, CORE, 0.1);
      fx.shock(x, y, r * 0.15, r * 1.1, 0.32, FLAME, 5, CORE);
      for (let i = 0; i < 4; i++) { const a = V() * TAU, d = r * 0.45 * V(); flame(fx, x + Math.cos(a) * d, y + Math.sin(a) * d, (28 + 18 * V()) * k, 0.45); }
      fx.sparkle(x, y, CORE, fx.budget(8), 320);
      fx.debris(x, y, '#5a4a3a', fx.budget(6), 220, 4, 10);
      fx.smoke(x, y, SMOKE, fx.budget(3), r * 0.5);
      fx.decal(x, y, r * 0.45, 'rgba(30,12,4,0.32)', 6);
      fx.shake(3);
    } });

  BD.defineEffect('agheelnova', { name: '亞基爾・龍心火環', category: '爆炸', params: {},
    desc: '龍心爆出的巨大火環（大招收尾、二階段俯衝落地後的外圈）：中心一柱龍焰沖天，赤紅與橘金兩層火環往外推，環上一路竄起火團，灰燼羽毛四散，畫面染紅。',
    spawn(fx, x, y, o) {
      const k = k_(o), R1 = o.radius || 400, R0 = o.r0 || R1 * 0.3;
      fx.flash('#ffb070', 0.22);
      fx.pillar(x, y, Math.min(140, R0 * 0.6), FLAME, 0.8);
      fx.shock(x, y, R0 * 0.5, R1 * 1.05, 0.55, FLAME, 10, CORE);
      fx.after(0.08, () => fx.shock(x, y, R0 * 0.4, R1 * 0.85, 0.5, RED, 6, '#ffd0a0'));
      fx.after(0.14, () => fx.ring(x, y, R0, R1 * 1.15, 0.6, 'rgba(255,190,120,0.4)', 4));
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12 + V() * 0.3;
        fx.after(0.05 + i * 0.012, () => { const d = R0 + (R1 - R0) * (0.55 + 0.4 * V()); flame(fx, x + Math.cos(a) * d, y + Math.sin(a) * d, (40 + 26 * V()) * k, 0.6); });
      }
      fx.embers(x, y, FLAME, fx.budget(24), R1 * 0.7, 180);
      feathers(fx, x, y, 0, TAU, fx.budget(14), 360);
      fx.shake(13); fx.punch(0.035, x, y); fx.grade('#ff5a10', 0.22, 0.5);
    } });
})(typeof window !== 'undefined' ? window : globalThis);
