'use strict';
// 飛龍桂雷爾造型：Eldenpedia 註明桂雷爾與飛龍亞基爾「外觀與能力相同」，所以龍體直接借用 js/render/styles/agheel.js（官方設定稿與遊戲截圖已在該檔考據過），
//   這個檔案只做兩件事：
//   1. 招式 id 對映：桂雷爾專屬招式「長橋龍息」沿用亞基爾「天降龍炎」的飛行與噴息姿勢（agheel 造型以招式 id 決定姿勢）。
//   2. 在龍體底下 / 上方加上桂雷爾專屬的氛圍：腳下鉛灰的低雲霧環、二階段「灰母血脈」背上飄起的灰燼與火星。
//   必須在 agheel 造型之後載入；亂數只用 BD.vrng。
(function (G) {
  const BD = G.BD, R = BD.Render, U = BD.U, V = BD.vrng;
  const AS = { bridge_inferno: 'agheel_flame' }; // greyll 招式 id → agheel 造型內的招式 id
  const base = () => R.bossStyles.agheel;
  function view(o) { // 以原型串接出一個 id 已對映的檢視，不改動原物件
    const inst = o.inst, to = inst && AS[inst.skill.id];
    if (!to) return o;
    const sk = Object.create(inst.skill); sk.id = to;
    const ii = Object.create(inst); ii.skill = sk;
    const p = Object.create(o); p.inst = ii; return p;
  }
  R.defineBossStyle('greyll', {
    body(g, o, t, k) { base().body(g, view(o), t, k); },
    hidden(g, b, t) { base().hidden(g, view(b), t); },
    under(g, b, t) { // 腳下一圈鉛灰低雲霧環（世界座標；隱身時也畫）
      if (b.state === 'dead') return;
      const r = b.r * 1.5;
      g.save(); g.globalAlpha = 0.22 + 0.04 * Math.sin(t * 1.3); g.fillStyle = '#56627a';
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * U.TAU + t * 0.18, rr = r * (0.55 + 0.1 * Math.sin(t * 0.9 + i));
        g.beginPath(); g.ellipse(b.x + Math.cos(a) * r * 0.5, b.y + Math.sin(a) * r * 0.42 + 6, rr, rr * 0.55, a, 0, U.TAU); g.fill();
      }
      g.restore();
    },
    over(g, b, t) { // 二階段：背上飄起灰燼與火星（世界座標；純視覺，用 vrng 取隨機）
      if (b.state === 'dead' || b.phase !== 2 || BD.hasStatus(b, 'hidden')) return;
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const ph = (t * 0.55 + i / 7) % 1, a = i * 2.4 + t * 0.4, d = b.r * (0.4 + 0.9 * ((i * 37) % 10) / 10);
        g.globalAlpha = 0.6 * (1 - ph); g.fillStyle = i % 2 ? '#ff8a1e' : '#ffd890';
        g.beginPath(); g.arc(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d * 0.7 - ph * b.r * 0.9, 2.2 + 1.4 * (1 - ph), 0, U.TAU); g.fill();
      }
      g.restore();
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
