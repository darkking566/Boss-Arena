'use strict';
// 特效庫｜飛龍桂雷爾專屬（撕咬 / 踏地 / 甩尾 / 龍息沿用 agheel*）：
//   greyllroar 母龍之嚎氣浪 / greyllbridge 長橋龍息火牆 / greyllash 灰燼風暴 / greyllheart 灰母血脈（換階段）/ greyllnova 灰母之焰火環。
// 配色取自參考圖：雨天龍巢的鉛灰與霧藍、羽鱗的炭黑，加上龍焰的橘金；與亞基爾的棕灰湖畔區隔。只呼叫 fx 原件；亂數只用 BD.vrng；純視覺。
(function (G) {
  const BD = G.BD, TAU = Math.PI * 2, V = BD.vrng;
  const MIST = 'rgba(150,170,196,0.5)', STORM = 'rgba(70,82,100,0.55)', SLATE = '#5d6a7c', PALE = '#dfe8f4', ASH = '#3b4048';
  const CORE = '#ffe9a8', FLAME = '#ff8a1e', EMBER = '#ff5a12', RED = '#ff3b1a';
  function ash(fx, x, y, ang, spread, n, sp) { // 灰燼碎羽
    for (let i = 0; i < n; i++) {
      const a = ang + (V() - 0.5) * spread, v = sp * (0.5 + V() * 0.6);
      if (!fx.part(BD.PK.SQ, x, y, Math.cos(a) * v, Math.sin(a) * v, 0.8 + V() * 0.7, i % 3 ? ASH : '#8a94a4', 3 + V() * 2.5, 1.6)) break;
    }
  }

  BD.defineEffect('greyllroar', { name: '桂雷爾・母龍之嚎', category: '增益', params: { radius: 300 },
    desc: '母龍之嚎（改編）：昂首一吼，三層鉛灰與橘金交錯的音浪震環從龍口往外推開，貼地的塵霧與灰燼被震得翻起；氣浪經過的地面留下一圈暗色壓痕，彷彿天空壓低了一截。被擊中的人會背上母龍威壓。',
    spawn(fx, x, y, o) {
      const r = o.radius || 300 * (o.scale || 1), k = Math.min(1.8, o.scale || 1);
      fx.flashAt(x, y, r * 0.35, PALE, 0.12);
      fx.shock(x, y, r * 0.12, r * 1.05, 0.5, MIST, 9, PALE);
      for (let i = 0; i < 3; i++) fx.after(0.08 + i * 0.1, () => fx.ring(x, y, r * 0.2, r * (0.85 + i * 0.22), 0.5, i % 2 ? 'rgba(255,170,100,0.45)' : 'rgba(210,222,240,0.5)', 6 - i * 1.5));
      fx.after(0.12, () => { fx.shock(x, y, r * 0.2, r * 0.9, 0.45, STORM, 6, '#ffb070'); fx.decal(x, y, r * 0.8, 'rgba(14,18,26,0.25)', 8); });
      ash(fx, x, y, 0, TAU, fx.budget(Math.round(18 * k)), 360);
      fx.smoke(x, y, STORM, fx.budget(8), r * 0.9);
      fx.embers(x, y, FLAME, fx.budget(10), r * 0.7, 120);
      fx.grade('#7a8ca8', 0.18, 0.5); fx.shake(9 * Math.min(1.4, k));
    } });

  BD.defineEffect('greyllbridge', { name: '桂雷爾・長橋龍息', category: '區域', params: {},
    desc: '長橋龍息：在亞基爾龍息的火流之上，沿著整條判定線多一層鉛灰煙柱與橋面的火星，地面一路爆出短促的火花，像火焰沿著橋面一路舔過去；末端炸開一朵火團與灰燼。',
    spawn(fx, x, y, o) {
      BD.effects.agheelbreath.spawn(fx, x, y, Object.assign({}, o, { shape: 'rect' })); // 火流本體
      const src = o.src, ang = o.angle || 0, c = Math.cos(ang), s = Math.sin(ang), ox = src ? src.x : x, oy = src ? src.y : y, len = o.len || 820;
      for (let i = 1; i <= 5; i++) {
        const d = len * i / 5.5, px = ox + c * d, py = oy + s * d;
        fx.after(i * 0.03, () => { fx.glow(px, py, 26 + 6 * i, i % 2 ? FLAME : EMBER, 0.28, 0.5, 0.4); fx.embers(px, py, FLAME, fx.budget(2), 40, 120); fx.smoke(px, py, STORM, fx.budget(1), 30); });
      }
      ash(fx, ox + c * len, oy + s * len, ang, 1.4, fx.budget(5), 260);
    } });

  BD.defineEffect('greyllash', { name: '桂雷爾・灰燼風暴', category: '爆炸', params: {},
    desc: '灰燼風暴收尾：落點上一柱旋轉的灰黑風柱捲著火星沖天，風柱外圍兩圈鉛灰震波，碎羽與餘燼被捲成螺旋往四周甩，地面留下焦黑的圓痕。',
    spawn(fx, x, y, o) {
      const r = o.radius || 300 * (o.scale || 1);
      fx.flashAt(x, y, r * 0.5, CORE, 0.12);
      fx.pillar(x, y, r * 0.35, SLATE, 1.0);
      fx.after(0.08, () => fx.pillar(x, y, r * 0.2, FLAME, 0.8));
      fx.shock(x, y, r * 0.15, r * 1.0, 0.55, STORM, 9, PALE);
      fx.after(0.1, () => fx.shock(x, y, r * 0.1, r * 0.75, 0.45, FLAME, 5, CORE));
      for (let i = 0; i < 14; i++) { // 螺旋甩出的碎羽與餘燼
        const a = i / 14 * TAU * 2, d = r * (0.1 + i * 0.06);
        fx.after(i * 0.025, () => { ash(fx, x + Math.cos(a) * d, y + Math.sin(a) * d, a + 1.2, 0.5, fx.budget(2), 300); fx.embers(x + Math.cos(a) * d, y + Math.sin(a) * d, FLAME, fx.budget(1), 30, 130); });
      }
      fx.smoke(x, y, STORM, fx.budget(8), r * 0.7);
      fx.decal(x, y, r * 0.8, 'rgba(18,14,12,0.35)', 8);
      fx.grade('#ff7a2e', 0.18, 0.4); fx.shake(11); fx.punch(0.03, x, y);
    } });

  BD.defineEffect('greyllheart', { name: '桂雷爾・灰母血脈', category: '增益', params: { life: 1.7 },
    desc: '換階段（改編）：整個畫面壓暗成鉛灰，天邊一道道暗紅閃光往龍身匯聚；背脊的赤光一根根亮起，隨後灰色的雲壓向地面，龍朝天一吼，兩圈灰藍音浪與一圈火環接連炸開，浮出「灰母血脈」。',
    spawn(fx, x, y, o) {
      const src = o.src || null, r = (src && src.r) || 90, life = Math.max(0.8, o.life || 1.7), ang = src ? src.face : 0;
      fx.veil(life + 0.9, 0.5, '#0a0d12');
      for (let i = 0; i < 4; i++) fx.after(life * (0.1 + i * 0.2), () => {
        fx.ring(x, y, r * 0.3, r * (1.5 + i * 0.4), 0.42, i % 2 ? RED : MIST, 4);
        fx.glow(x, y, r * 0.7, i % 2 ? EMBER : SLATE, 0.3, 0.55, 0.3);
        for (let j = 0; j < 4; j++) { const d = -r * (0.9 - (i * 4 + j) * 0.12); fx.glow(x + Math.cos(ang) * d, y + Math.sin(ang) * d, 16, RED, 0.5, 0.7, 0.2); }
        ash(fx, x, y, 0, TAU, fx.budget(5), 220);
      });
      fx.after(life * 0.65, () => fx.charge(x, y, r * 2.8, SLATE, life * 0.35, src, fx.budget(16)));
      fx.after(life, () => {
        fx.flash('#c8d4e8', 0.3);
        fx.pillar(x + Math.cos(ang) * r, y + Math.sin(ang) * r, r * 0.9, SLATE, 1.1);
        fx.after(0.1, () => fx.pillar(x + Math.cos(ang) * r, y + Math.sin(ang) * r, r * 0.45, FLAME, 0.9));
        fx.shock(x, y, r, r * 5.4, 0.65, MIST, 10, PALE);
        fx.after(0.12, () => fx.shock(x, y, r, r * 3.8, 0.5, FLAME, 6, CORE));
        fx.after(0.2, () => fx.ring(x, y, r, r * 6.2, 0.7, 'rgba(255,120,60,0.4)', 4));
        fx.embers(x, y, FLAME, fx.budget(30), r * 2.6, 180);
        ash(fx, x, y, 0, TAU, fx.budget(20), 340);
        fx.text(x, y - r - 70, '灰母血脈', PALE, 30);
        fx.shake(16); fx.punch(0.045, x, y); fx.grade('#6a7c98', 0.35, 0.8);
      });
    } });

  BD.defineEffect('greyllnova', { name: '桂雷爾・灰母之焰', category: '爆炸', params: {},
    desc: '焚橋・灰母降臨的收尾火環：中心一柱灰藍與橘金交纏的光柱沖天，鉛灰與橘紅兩層震波往外推，環上一路竄起火團與灰燼，整個畫面先被染成鉛灰再轉橘紅。',
    spawn(fx, x, y, o) {
      const R1 = o.radius || 400, R0 = o.r0 || R1 * 0.3, k = Math.min(1.6, o.k || 1);
      fx.flash('#d8e2f4', 0.24);
      fx.pillar(x, y, Math.min(150, R0 * 0.6), SLATE, 0.9);
      fx.after(0.05, () => fx.pillar(x, y, Math.min(90, R0 * 0.4), CORE, 0.7));
      fx.shock(x, y, R0 * 0.5, R1 * 1.05, 0.58, MIST, 11, PALE);
      fx.after(0.08, () => fx.shock(x, y, R0 * 0.4, R1 * 0.88, 0.5, FLAME, 7, CORE));
      fx.after(0.15, () => fx.ring(x, y, R0, R1 * 1.18, 0.62, 'rgba(255,130,70,0.42)', 4));
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12 + V() * 0.3;
        fx.after(0.06 + i * 0.012, () => { const d = R0 + (R1 - R0) * (0.55 + 0.4 * V()), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
          fx.glow(px, py, (44 + 26 * V()) * k, V() < 0.5 ? FLAME : EMBER, 0.55, 0.55, 0.4); fx.embers(px, py, FLAME, fx.budget(2), 30, 140); ash(fx, px, py, a, 1.0, fx.budget(2), 260); });
      }
      fx.embers(x, y, FLAME, fx.budget(26), R1 * 0.7, 180);
      fx.smoke(x, y, STORM, fx.budget(8), R1 * 0.6);
      fx.shake(14); fx.punch(0.035, x, y); fx.grade('#ff6a28', 0.24, 0.5);
    } });
})(typeof window !== 'undefined' ? window : globalThis);
