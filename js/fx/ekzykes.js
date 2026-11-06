'use strict';
// 赭紅腐霧 / 灰白孢子。純視覺，不消耗戰鬥亂數；不把猩紅腐敗畫成綠毒或橘火。
(function (G) {
  const BD = G.BD, V = BD.vrng, TAU = Math.PI * 2;
  const RED = '#c35c47', LIGHT = '#f0b49b', WHITE = '#e9e0c7', MIST = 'rgba(136,58,43,0.55)';
  BD.defineElement('scarletrot', { name: '猩紅腐敗', rim: '#6a2621', debris: '#b5a990', core: '#f7d7b5', glow: RED, particle: WHITE,
    smoke: MIST, decal: 'rgba(93,26,23,0.42)', crack: '#c57355', extra: 'wisps' });
  BD.KIND_EL.scarletrot = 'scarletrot';
  function spores(fx, x, y, r, n) {
    for (let i = 0; i < fx.budget(n); i++) {
      const a = V() * TAU, d = V() * r, speed = 30 + V() * 100;
      if (!fx.part(BD.PK.MOTE, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * speed, Math.sin(a) * speed - 45, 0.7 + V() * 0.9, i % 3 ? WHITE : RED, 2 + V() * 3, 1.5)) break;
    }
  }
  function cloud(fx, x, y, r, n) {
    fx.smoke(x, y, MIST, fx.budget(n), r * 0.65);
    for (let i = 0; i < 2; i++) fx.puff(x + (V() - 0.5) * r, y + (V() - 0.5) * r, (V() - 0.5) * 45, -8 - V() * 18, r * 0.25, r * 0.9, 1.25, 'scarletrot', 0.42);
    fx.glow(x, y, r * 0.55, RED, 0.55, 0.28, 0.2);
    spores(fx, x, y, r * 0.7, 12);
  }
  BD.defineEffect('ekzykesbreath', { name: '艾格基斯・猩紅吐息', category: '區域', params: {}, desc: '口前灰白菌絲碎屑、內層赭紅霧浪和深紅外緣，沿吐息方向一層層向地面翻滾。',
    spawn(fx, x, y, o) {
      const a = o.angle || 0, len = o.len || o.radius || 660, arc = o.shape === 'rect' ? 0.13 : (o.arc || 0.65), rr = o.src ? o.src.r : 90;
      const mx = x + Math.cos(a) * rr * 1.55, my = y + Math.sin(a) * rr * 1.55;
      fx.glow(mx, my, 60, LIGHT, 0.22, 0.35, 0.3);
      for (let i = 0; i < 7; i++) fx.after(i * 0.035, () => {
        const u = (i + 1) / 7, d = rr + (len - rr) * u;
        for (let j = 0; j < 2; j++) {
          const an = a + (V() - 0.5) * arc, px = x + Math.cos(an) * d, py = y + Math.sin(an) * d;
          fx.smoke(px, py, MIST, 1, 25 + 60 * u);
          fx.puff(px, py, Math.cos(an) * 65, Math.sin(an) * 65, 18 + 18 * u, 52 + 72 * u, 1.1, 'scarletrot', 0.5);
          fx.glow(px, py, 24 + 42 * u, j ? '#8e3a30' : RED, 0.42, 0.2, 0.15);
        }
      });
      fx.slash(x, y, a, Math.max(0.22, arc), len * 0.86, 'rgba(227,170,133,0.35)', 9, 0.42, { trail: 2 });
      spores(fx, mx, my, 55, 13); fx.shake(2.5);
    } });
  BD.defineEffect('ekzykesmiasma', { name: '艾格基斯・翻湧霧海', category: '區域', params: {}, desc: '貼地腐霧翻滾成分層圓浪，邊緣較亮，白色孢子在霧上飄散。',
    spawn(fx, x, y, o) {
      const r = o.radius || 440;
      fx.shock(x, y, r * 0.12, r, 0.8, RED, 11, LIGHT);
      fx.after(0.12, () => fx.ring(x, y, r * 0.2, r * 1.08, 1, MIST, 24));
      for (let i = 0; i < 9; i++) { const a = i * TAU / 9; cloud(fx, x + Math.cos(a) * r * 0.65, y + Math.sin(a) * r * 0.65, r * 0.23, 2); }
      fx.decal(x, y, r * 0.65, 'rgba(112,30,23,0.19)', 5); fx.shake(4);
    } });
  BD.defineEffect('ekzykescrash', { name: '艾格基斯・腐骨墜地', category: '砸地', params: {}, desc: '腐龍落地揚起赭紅衝擊與白色菌絲碎片，先塵震再腐霧，保留粗重的肉體衝撞。',
    spawn(fx, x, y, o) {
      const r = o.radius || 205;
      fx.flashAt(x, y, r * 0.65, LIGHT, 0.12); fx.shock(x, y, 25, r * 1.15, 0.5, RED, 12, WHITE);
      fx.after(0.08, () => fx.ring(x, y, r * 0.3, r * 1.35, 0.65, 'rgba(215,197,163,0.55)', 9));
      fx.crack(x, y, r, '#3c2924', 8, RED, 7); fx.debris(x, y, '#9b9180', fx.budget(14), 320, 6, TAU);
      cloud(fx, x, y, r, 6); fx.shake(11); fx.punch(0.03, x, y);
    } });
  BD.defineEffect('ekzykeswing', { name: '艾格基斯・枯翼尾鞭', category: '斬擊', params: {}, desc: '灰黑翼骨與米白纖維拖出粗重弧線，落下腐朽碎屑。',
    spawn(fx, x, y, o) {
      const a = o.angle || 0, r = o.radius || 300, arc = o.arc || 2.5;
      fx.slash(x, y, a, arc, r, '#776e61', 20, 0.4, { core: WHITE, trail: 2 });
      fx.after(0.06, () => fx.slash(x, y, a - 0.08, arc, r * 0.9, RED, 7, 0.5, { trail: 2 }));
      spores(fx, x, y, r * 0.7, 24); fx.smoke(x, y, 'rgba(139,116,91,0.4)', fx.budget(4), r * 0.5); fx.shake(6);
    } });
  BD.defineEffect('ekzykestakeoff', { name: '艾格基斯・腐翼騰空', category: '位移', params: {}, desc: '灰白翼肢沉重拍地，壓出一圈紅塵，朽絲向兩側飛散。',
    spawn(fx, x, y, o) { const r = o.src ? o.src.r : 100; fx.ring(x, y, r * 0.3, r * 2.5, 0.65, 'rgba(206,183,151,0.6)', 7); cloud(fx, x, y, r * 1.3, 5); spores(fx, x, y, r * 2, 22); fx.shake(5); } });
  BD.defineEffect('ekzykesroar', { name: '艾格基斯・蓄腐低吼', category: '增益', params: {}, desc: '灰白菌絲顫動，暗紅氣流往口腔收縮，長頸抬起後吐出腐霧。',
    spawn(fx, x, y, o) {
      const r = o.src ? o.src.r : 100, a = o.src ? o.src.face : 0, mx = x + Math.cos(a) * r * 1.8, my = y + Math.sin(a) * r * 1.8;
      fx.ring(mx, my, 95, 12, o.life || 0.9, RED, 5); fx.glow(mx, my, 65, RED, o.life || 0.9, 0.3, 0.4); spores(fx, mx, my, 90, 20); fx.shake(3);
    } });
  BD.defineEffect('ekzykesspore', { name: '艾格基斯・腐軀洩霧', category: '增益', params: {}, desc: '受創的菌絲顫裂，孢子和霧從身體四周洩出；改編被動專屬演出。',
    spawn(fx, x, y, o) { const r = o.radius || 195; fx.shock(x, y, 30, r, 0.7, WHITE, 4, LIGHT); cloud(fx, x, y, r, 8); spores(fx, x, y, r, 30); } });
  BD.defineEffect('ekzykesrot', { name: '猩紅腐敗・侵蝕', category: '增益', params: {}, desc: '腐敗累積滿值：暗紅氣團包住受害者，灰白菌絲碎光由身邊冒出。',
    spawn(fx, x, y, o) { cloud(fx, x, y, o.radius || 75, 5); fx.ring(x, y, 15, o.radius || 75, 0.65, RED, 5); } });
  BD.defineEffect('ekzykesheart', { name: '艾格基斯・憎恨未熄', category: '大招', params: {}, desc: '改編的半血 / 大招蓄力：菌絲冠冕裂開，兩重暗紅霧環與灰白孢雨，潰爛龍心的光逐拍增強。',
    spawn(fx, x, y, o) {
      const r = o.src ? o.src.r : 100;
      for (let i = 0; i < 4; i++) fx.after(i * 0.28, () => { fx.shock(x, y, r * 0.4, r * (2.4 + i * 0.5), 1, i % 2 ? RED : WHITE, 5 + i * 2, LIGHT); cloud(fx, x, y, r * (1.1 + i * 0.3), 5); });
      spores(fx, x, y, r * 2, 48); fx.grade('#b75f43', 0.15, 0.8); fx.shake(8); fx.punch(0.035, x, y);
    } });
})(typeof window !== 'undefined' ? window : globalThis);
