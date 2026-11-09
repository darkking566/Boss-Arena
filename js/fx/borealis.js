'use strict';
// 霜白貼地霧、青藍前緣與暗色冰裂；只用視覺亂數，絕不參與傷害或凍傷累積。
(function (G) {
  const BD = G.BD, V = BD.vrng, TAU = Math.PI * 2;
  const WHITE = '#edfaff', ICE = '#a7dce9', BLUE = '#4e9ac1', DARK = '#365b70';
  const MIST = [WHITE, ICE, '#cfeaf2', 'snow']; // fx.stream 的芯 / 主體 / 外緣 / 貼地白霧
  BD.KIND_EL.rimefog = 'ice';
  function shards(fx, x, y, r, n, speed) {
    for (let i = 0; i < fx.budget(n); i++) {
      const a = V() * TAU, d = V() * r, v = (speed || 180) * (0.35 + V());
      const p = fx.part(BD.PK.SHARD, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * v, Math.sin(a) * v - 25, 0.45 + V() * 0.65, i % 3 ? WHITE : BLUE, 2 + V() * 5, 2.5);
      if (!p) break;
    }
  }
  function mist(fx, x, y, r, alpha) {
    for (let j = 0; j < 4; j++) { const a = j * 2.4 + V(); fx.puff(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.22, Math.cos(a) * 30, Math.sin(a) * 20 - 8, r * 0.28, r * 0.9, 0.85 + V() * 0.4, 'snow', Math.min(0.5, (alpha || 0.28) * 1.5)); }
  }
  function mouth(x, y, o) {
    const b = o.src, render = BD.Render;
    if (b && b.def.style === 'borealis' && render && render.borealisMouth) return render.borealisMouth(b);
    const a = o.angle || (b && b.face) || 0, r = b ? b.r : 70;
    return { x: (b ? b.x : x) + Math.cos(a) * r * 1.9, y: (b ? b.y : y) + Math.sin(a) * r * 1.9 };
  }
  function breath(fx, x, y, o, down, communion) {
    const a = o.angle || 0, b = o.src, rr = b ? b.r : 70, m = mouth(x, y, o), len = o.len || o.radius || 660;
    const end = { x: x + Math.cos(a) * (o.shape === 'circle' ? 0 : len * 0.9), y: y + Math.sin(a) * (o.shape === 'circle' ? 0 : len * 0.9) };
    const arc = o.shape === 'rect' ? 0.17 : (o.arc || 0.65);
    fx.glow(m.x, m.y, rr * 0.3, WHITE, 0.18, 0.6, 0.3);
    if (down) { const D0 = Math.max(60, Math.hypot(x - m.x, y - m.y)); fx.stream(m.x, m.y, Math.atan2(y - m.y, x - m.x), 2 * Math.atan(len * 0.5 / D0), D0 + len * 0.3, MIST, 0.2, 1); }
    else fx.stream(m.x, m.y, Math.atan2(end.y - m.y, end.x - m.x), arc, Math.hypot(end.x - m.x, end.y - m.y), MIST, 0.2, 1); // 連綿的冰霧流塗滿整個判定
    for (let i = 0; i < 6; i++) fx.after(i * 0.03, () => {
      const u = (i + 1) / 6, an = a + (V() - 0.5) * arc * 0.75;
      let px, py;
      if (down) { const aa = V() * TAU, d = Math.sqrt(V()) * len * 0.85; px = x + Math.cos(aa) * d; py = y + Math.sin(aa) * d; }
      else { px = m.x + (end.x - m.x) * u - Math.sin(an) * (V() - 0.5) * (o.width || len * arc) * u; py = m.y + (end.y - m.y) * u + Math.cos(an) * (V() - 0.5) * (o.width || len * arc) * u; }
      mist(fx, px, py, 40 + 95 * u, 0.24);
      fx.ring(px, py, 6, 27 + 43 * u, 0.45, 'rgba(178,227,243,0.3)', 3);
      shards(fx, px, py, 25, 5, 140);
    });
    if (communion) { fx.glow(m.x, m.y, rr * 0.8, BLUE, 0.35, 0.25, 0.3); fx.grade('#8dbfd0', 0.07, 0.2); }
    fx.shake(down ? 3.5 : 2);
  }
  BD.defineEffect('borealisbreath', { name: '玻列琉斯・翻湧冰息', category: '區域', params: {}, desc: '氣流自龍口推出，內層細冰、外層貼地白霧，前緣青藍折光。', spawn(fx, x, y, o) { breath(fx, x, y, o, false, false); } });
  BD.defineEffect('borealisdownbreath', { name: '玻列琉斯・懸空覆霜', category: '區域', params: {}, desc: '空中龍口斜噴向地面，白霧落地後翻成矮浪，保留龍影。', spawn(fx, x, y, o) { breath(fx, x, y, o, true, false); } });
  BD.defineEffect('borealiscommunion', { name: '玻列琉斯・龍饗冰霧', category: '區域', params: {}, desc: '改編龍饗：幻影龍首前的冷光與多層冰息，幻影由本體造型畫出。', spawn(fx, x, y, o) { breath(fx, x, y, o, false, true); } });
  BD.defineEffect('borealisinhale', { name: '玻列琉斯・深吸寒霧', category: '增益', params: {}, desc: '口前冰粒往內收束，氣流變窄，喉部漸亮。',
    spawn(fx, x, y, o) { const m = mouth(x, y, o), r = o.src ? o.src.r : 70; fx.charge(m.x, m.y, r * 0.8, ICE, o.life || 0.9, null, 22); fx.ring(m.x, m.y, r * 0.7, r * 0.1, o.life || 0.9, ICE, 3); fx.glow(m.x, m.y, r * 0.3, WHITE, o.life || 0.9, 0.3, 0.4); } });
  BD.defineEffect('borealisgather', { name: '玻列琉斯・霜線聚流', category: '增益', params: {}, desc: '背脊寒光與身側白氣向胸口聚流；咆哮與龍饗的蓄力。',
    spawn(fx, x, y, o) { const r = o.src ? o.src.r : 96; fx.charge(x, y, r * 2.3, ICE, o.life || 1.2, null, 32); fx.ring(x, y, r * 2.6, r * 0.5, o.life || 1.2, BLUE, 4); shards(fx, x, y, r * 1.2, 18, 35); } });
  BD.defineEffect('borealisbite', { name: '玻列琉斯・冰牙閉合', category: '斬擊', params: {}, desc: '長吻閉合時兩道霜白齒痕，碎霜自顎邊甩出。',
    spawn(fx, x, y, o) { const a = o.angle || 0, m = mouth(x, y, o); fx.slash(m.x, m.y, a, 0.8, 82, DARK, 16, 0.22, { core: WHITE }); fx.slash(m.x, m.y, a + Math.PI, 0.8, 75, ICE, 7, 0.24); shards(fx, m.x, m.y, 35, 14, 190); fx.shake(4); } });
  BD.defineEffect('borealisstomp', { name: '玻列琉斯・踏冰裂紋', category: '砸地', params: {}, desc: '後腳重踏，先壓出冰裂與雪粉，再翻起低霧。',
    spawn(fx, x, y, o) { const r = o.radius || 200; fx.shock(x, y, 18, r, 0.5, BLUE, 10, WHITE); fx.crack(x, y, r, DARK, 7, ICE, 7); shards(fx, x, y, r * 0.6, 26, 280); mist(fx, x, y, r, 0.3); fx.shake(9); } });
  BD.defineEffect('borealiswing', { name: '玻列琉斯・重翼雪弧', category: '斬擊', params: {}, desc: '粗重翼腕掃過一條暗色弧，外緣白霜沿慣性剝落。',
    spawn(fx, x, y, o) { const r = o.radius || 320; fx.slash(x, y, o.angle || 0, o.arc || 2.7, r, DARK, 22, 0.35, { core: ICE, trail: 2 }); shards(fx, x, y, r * 0.7, 25, 210); fx.shake(6); } });
  BD.defineEffect('borealistail', { name: '玻列琉斯・霜尾回旋', category: '斬擊', params: {}, desc: '尾尖帶出分層冰痕，外緣飛雪拖長。',
    spawn(fx, x, y, o) { const r = o.radius || 360, a = o.angle || 0; fx.slash(x, y, a, o.arc || 4.5, r, DARK, 18, 0.4, { core: WHITE, trail: 2 }); fx.after(0.08, () => fx.slash(x, y, a - 0.08, o.arc || 4.5, r * 0.93, ICE, 5, 0.45)); shards(fx, x, y, r, 28, 240); fx.shake(7); } });
  BD.defineEffect('borealistakeoff', { name: '玻列琉斯・冰翼騰空', category: '位移', params: {}, desc: '雙翼壓出兩側雪風，冰粒散開、龍影留地。',
    spawn(fx, x, y, o) { const r = o.src ? o.src.r : 96; fx.ring(x, y, r * 0.3, r * 2.8, 0.65, 'rgba(207,238,248,0.45)', 8); shards(fx, x, y, r, 30, 210); mist(fx, x, y, r * 1.4, 0.22); fx.shake(5); } });
  BD.defineEffect('borealiscrash', { name: '玻列琉斯・冰翼墜湖', category: '砸地', params: {}, desc: '龍體重落，暗色裂冰托出白色衝擊，低霧與碎冰向外滑。',
    spawn(fx, x, y, o) { const r = o.radius || 240; fx.flashAt(x, y, r * 0.8, WHITE, 0.12); fx.shock(x, y, 25, r * 1.2, 0.48, BLUE, 15, WHITE); fx.after(0.09, () => fx.shock(x, y, r * 0.3, r * 1.65, 0.75, 'rgba(174,222,237,0.5)', 9, ICE)); fx.crack(x, y, r * 1.3, DARK, 11, ICE, 10); shards(fx, x, y, r * 0.7, 45, 360); mist(fx, x, y, r * 1.3, 0.3); fx.shake(13); fx.punch(0.04, x, y); } });
  BD.defineEffect('borealisroar', { name: '玻列琉斯・凍結咆哮', category: '區域', params: {}, desc: '昂首長吼，厚薄兩層白霧從胸腹向外推開，中心保持可見。',
    spawn(fx, x, y, o) { const r = o.radius || 450; fx.shock(x, y, r * 0.12, r, 0.8, BLUE, 12, WHITE); fx.after(0.13, () => fx.ring(x, y, r * 0.15, r * 1.12, 0.95, 'rgba(215,243,255,0.55)', 20)); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; mist(fx, x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72, r * 0.28, 0.3); } shards(fx, x, y, r * 0.7, 36, 250); fx.shake(7); } });
  BD.defineEffect('borealisring', { name: '玻列琉斯・外擴冰環', category: '大招', params: {}, desc: '對齊環形判定的裂冰前緣，內圈空心，碎冰沿外緣依序爆開。',
    spawn(fx, x, y, o) { const r = o.radius || 550, r0 = o.r0 || r * 0.6; fx.shock(x, y, r0, r, 0.7, BLUE, 16, WHITE); fx.ring(x, y, r0, r * 1.05, 0.85, 'rgba(185,229,246,0.45)', 11); for (let i = 0; i < 12; i++) fx.after(i * 0.016, () => { const a = i * TAU / 12; shards(fx, x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, 15, 4, 180); }); fx.shake(6); } });
  BD.defineEffect('borealisfog', { name: '玻列琉斯・冰結湖遺霧', category: '區域', params: {}, desc: '改編被動：白色霜線打開，薄霧環留在先前亮出的地面位置。',
    spawn(fx, x, y, o) { const r = o.radius || 260; fx.ring(x, y, r * 0.25, r, 0.6, ICE, 6); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; mist(fx, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.45, 0.22); } shards(fx, x, y, r * 0.7, 20, 90); } });
  BD.defineEffect('borealisburst', { name: '凍傷・霜裂爆發', category: '增益', params: {}, desc: '凍傷滿值的瞬間，碎冰向外崩開；沒有長時間冰雕束縛。',
    spawn(fx, x, y, o) { const r = o.radius || 100; fx.flashAt(x, y, r, WHITE, 0.12); fx.shock(x, y, 10, r * 1.4, 0.45, BLUE, 9, WHITE); shards(fx, x, y, r * 0.6, 32, 300); fx.shake(5); } });
  BD.defineEffect('borealisthaw', { name: '凍傷・回溫白氣', category: '增益', params: {}, desc: '火焰解除凍傷時碎霜消散、蒸氣升起，純視覺回饋。',
    spawn(fx, x, y, o) { const r = o.radius || 80; mist(fx, x, y, r, 0.3); fx.ring(x, y, 12, r, 0.5, '#d3edf1', 3); } });
  BD.defineEffect('borealisawaken', { name: '玻列琉斯・白霧再臨', category: '大招', params: {}, desc: '半血／大招新增演出：背脊霜線亮起，冰粒倒捲後被長吼推開。',
    spawn(fx, x, y, o) { const r = o.src ? o.src.r : 96; fx.charge(x, y, r * 2.8, ICE, o.life || 1.5, null, 45); for (let i = 0; i < 3; i++) fx.after(i * 0.35, () => { fx.ring(x, y, r * (2.1 + i * 0.5), r * 0.3, 0.9, i % 2 ? BLUE : ICE, 4); shards(fx, x, y, r * 1.4, 12, 40); }); fx.grade('#8dc6dc', 0.1, 1.2); fx.shake(5); } });
})(typeof window !== 'undefined' ? window : globalThis);
