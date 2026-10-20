'use strict';
// Boss 造型：佐佐木小次郎（俯視）。造型依據＝動畫角色設定圖與漫畫彩圖：灰銀高馬尾、橄欖綠羽織下露出芥黃內襯與敞開的胸口、
// 紅色披肩（橘色牡丹錦緞紋、圍成頸巾）、玫瑰褐袴與紅腰帶、帶傷疤的古銅色前臂；一階段雙手握紅柄的超長刀「物干し竿」，
// 二階段折斷再錬成：右手紅柄長刀、左手紫柄小太刀（金色鍔），刀身帶一圈鍛造的橘紅餘熱。見切（千手 / 萬手）架式時身周盪出青白的模擬環。
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  const TRIG = { hit: 1, proj: 1, dash: 1 };
  const POSE = { ext: 0, guard: false, id: null, i: 0, reach: 0 };
  const GOLD = '#d8b44e';

  // 揮刀前伸量：0 = 待機，1 = 完全揮出，負值 = 蓄力後拉；id / i / reach = 目前招式、第幾個出手動作、招式最遠距離（刀身視覺依此拉長）
  function pose(o, t) {
    const p = POSE;
    p.ext = 0.05 + Math.sin(t * 2.2) * 0.04; p.guard = !!(o.statuses && BD.hasStatus(o, 'counter')); p.id = null; p.i = 0; p.reach = 0;
    const inst = o.inst;
    if (p.guard || !inst || !inst.v) return p;
    const P = R.skillPace(inst, TRIG);
    if (!P.a) return p;
    p.ext = P.snap > 0 ? 0.4 + P.snap * 0.6 : -0.45 * P.wind;
    if (inst.skill) { p.id = inst.skill.id; p.i = P.i; p.reach = inst.skill.range ? inst.skill.range[1] : 0; }
    return p;
  }

  // 刀：柄從 (0,0) 往 +x，柄長 H，刀身到 L；hilt 柄卷色、glow 二階段餘熱
  function blade(ctx, r, shade, L, hilt, glow) {
    const H = r * 0.85, W = r * 0.17;
    if (glow && !shade) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,140,60,0.32)'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(H, 0); ctx.lineTo(L, 0); ctx.stroke(); ctx.restore(); }
    ctx.strokeStyle = shade ? '#000000' : hilt; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.25, 0); ctx.lineTo(H, 0); ctx.stroke();
    if (!shade) { ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; for (let x = 0; x < H; x += r * 0.22) { ctx.beginPath(); ctx.moveTo(x, -r * 0.1); ctx.lineTo(x + r * 0.1, r * 0.1); ctx.stroke(); } }
    ctx.fillStyle = shade ? '#000000' : '#dde4ee'; // 刀身
    ctx.beginPath(); ctx.moveTo(H, -W); ctx.lineTo(L * 0.94, -W * 0.8); ctx.lineTo(L, -W * 0.2); ctx.lineTo(L * 0.94, W * 0.7); ctx.lineTo(H, W); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade ? '#202a40' : '#7f8aa0'; ctx.lineWidth = 1; ctx.stroke();
    if (!shade) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(H + 2, W * 0.3); ctx.lineTo(L * 0.9, W * 0.12); ctx.stroke(); } // 刃文
    ctx.fillStyle = shade ? '#000000' : GOLD; ctx.beginPath(); ctx.ellipse(H, 0, r * 0.1, r * 0.34, 0, 0, U.TAU); ctx.fill(); // 金色鍔
    ctx.strokeStyle = shade ? '#202a40' : '#8a6a1c'; ctx.lineWidth = 1; ctx.stroke();
  }

  R.defineBossStyle('kojiro', {
    body(ctx, o, t, { r }) {
      const shade = !!o.shade, p2 = o.phase === 2, P = pose(o, t);
      const tag = r + ':' + (shade ? 's' : 'b');
      const col = (c) => (shade ? '#000000' : c);
      const sw = Math.sin(t * 3.4 + o.x * 0.01) * (p2 ? 0.3 : 0.18); // 二階段披肩與髮更狂放地散開

      // 見切架式：青白的模擬環（二階段加一圈金色「萬手」環）
      if (P.guard && !shade) {
        const q = (t * 1.6) % 1;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { const u = (q + i / 3) % 1; ctx.strokeStyle = hexA('#9fd8ff', 0.55 * (1 - u)); ctx.beginPath(); ctx.arc(0, 0, r * (1.2 + u * 2.4), 0, U.TAU); ctx.stroke(); }
        if (p2) { ctx.strokeStyle = hexA('#ffe39a', 0.5 + 0.2 * Math.sin(t * 8)); ctx.beginPath(); ctx.arc(0, 0, r * 1.5, 0, U.TAU); ctx.stroke(); }
        ctx.restore();
      }

      // 千手無雙的學習刻度：看過同一招越多次（最高 3 層）身後亮越多格；被完美閃避就歸零
      if (!shade && o._learn) {
        let lv = 0; for (const k in o._learn) lv = Math.max(lv, Math.min(3, o._learn[k].n - 1));
        if (lv > 0) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineWidth = 3;
          for (let i = 0; i < 3; i++) { const a = Math.PI + (i - 1) * 0.8; ctx.strokeStyle = i < lv ? hexA(p2 ? '#ffe39a' : '#9fd8ff', 0.85) : 'rgba(159,216,255,0.15)'; ctx.beginPath(); ctx.arc(0, 0, r * 1.75, a - 0.28, a + 0.28); ctx.stroke(); }
          ctx.restore();
        }
      }

      // 二階段：鍛造餘熱的橘紅光暈與飄散的火星（只用時間推算位置，不抽亂數）
      if (p2 && !shade) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const hg = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.1); hg.addColorStop(0, hexA('#ff7a2a', 0.16 + 0.05 * Math.sin(t * 5))); hg.addColorStop(1, hexA('#ff7a2a', 0));
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, r * 2.1, 0, U.TAU); ctx.fill();
        for (let i = 0; i < 6; i++) { const u = (t * 0.55 + i / 6) % 1; ctx.fillStyle = hexA('#ffb347', 0.8 * (1 - u)); ctx.beginPath(); ctx.arc(-r * (0.5 + u * 1.9), Math.sin(i * 2.3 + t * 2) * r * 0.9, 1.8 * (1 - u * 0.5), 0, U.TAU); ctx.fill(); }
        ctx.restore();
      }

      // 紅色披肩：身後飄動的長披肩，橘色滾邊與牡丹錦緞紋
      ctx.fillStyle = col('#b8322a');
      ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.95); ctx.quadraticCurveTo(-r * 1.3, -r * (1.2 + sw), -r * (p2 ? 2.5 : 2.15), -r * sw * 2.2);
      ctx.quadraticCurveTo(-r * 1.3, r * (1.2 - sw), -r * 0.05, r * 0.95); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = col('#f08a3a'); ctx.lineWidth = 3; ctx.stroke();
      if (!shade) {
        ctx.strokeStyle = 'rgba(255,170,80,0.7)'; ctx.lineWidth = 1.6;
        for (const [x, y] of [[-0.7, -0.45], [-1.05, 0.25], [-1.5, -0.1], [-0.6, 0.5]]) { const cy = r * y + r * sw * 0.3 * x; ctx.beginPath(); ctx.arc(r * x, cy, r * 0.17, 0, U.TAU); ctx.moveTo(r * x + r * 0.07, cy); ctx.arc(r * x, cy, r * 0.07, 0, U.TAU); ctx.stroke(); }
      }

      // 灰銀高馬尾：由後腦甩向身後，幾股隨動作擺動
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const o1 = (i - 1.5) * 0.18 * r, sy = Math.sin(t * 4 + i) * r * 0.25 + sw * r;
        ctx.strokeStyle = col(i % 2 ? '#9aa0ae' : '#d8dce4'); ctx.lineWidth = r * (0.2 - i * 0.025);
        ctx.beginPath(); ctx.moveTo(-r * 0.25, o1 * 0.4); ctx.quadraticCurveTo(-r * 1.3, o1 + sy, -r * (2.5 + i * 0.2), o1 * 1.6 + sy * 1.5); ctx.stroke();
      }

      // 羽織袖：寬大的橄欖綠袖子，身後衣擺
      R.blit(ctx, 'body:kojiro:haori:' + tag, r * 2.6 + 8, r * 2.8 + 8, r * 1.3 + 4, r * 1.4 + 4, (g) => {
        g.fillStyle = shade ? '#000000' : '#464e3c';
        for (const s of [-1, 1]) { g.beginPath(); g.ellipse(-r * 0.2, s * r * 0.95, r * 0.78, r * 0.4, s * 0.25, 0, U.TAU); g.fill(); g.strokeStyle = shade ? '#000000' : '#262c20'; g.lineWidth = 1.6; g.stroke(); }
        const gr = g.createRadialGradient(r * 0.1, 0, 2, 0, 0, r * 1.05);
        gr.addColorStop(0, shade ? '#000000' : '#59634a'); gr.addColorStop(1, shade ? '#000000' : '#3a4130');
        g.fillStyle = gr; g.beginPath(); g.ellipse(-r * 0.05, 0, r * 0.68, r * 1.08, 0, 0, U.TAU); g.fill(); g.strokeStyle = shade ? '#000000' : '#232819'; g.lineWidth = 2; g.stroke();
        // 敞開的胸口：芥黃內襯與紅腰帶
        g.fillStyle = shade ? '#000000' : '#d9a74a'; g.beginPath(); g.ellipse(r * 0.42, 0, r * 0.26, r * 0.38, 0, 0, U.TAU); g.fill();
        g.fillStyle = shade ? '#000000' : '#c9936a'; g.beginPath(); g.ellipse(r * 0.46, 0, r * 0.1, r * 0.22, 0, 0, U.TAU); g.fill(); // 古銅色胸肌
        g.strokeStyle = shade ? '#000000' : '#a83a3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(-r * 0.15, -r * 0.55); g.lineTo(-r * 0.15, r * 0.55); g.stroke();
      });

      // 手臂與刀
      const e = P.guard ? -0.15 : P.ext, ang0 = P.guard ? -0.25 : -0.95 + 1.05 * e;
      // 招式專屬姿勢：虎切＝逆手握刀（刀尖朝後）；燕返し的第二擊＝反向上撩。刀身視覺依招式最遠距離拉長，與判定範圍對齊
      const tori = P.id === 'torakiri', up = P.id === 'tsubame' && P.i >= 1;
      const grow = (base) => tori ? 1 : 1 + Math.min(1.4, Math.max(0, P.reach * 0.75 / (r * base) - 1)) * Math.max(0, e);
      const arm = (sy, gx, gy) => { ctx.strokeStyle = col('#464e3c'); ctx.lineWidth = r * 0.42; ctx.beginPath(); ctx.moveTo(0, sy * r * 0.7); ctx.lineTo(gx * 0.6, (sy * r * 0.7 + gy) / 2); ctx.stroke();
        ctx.strokeStyle = col('#c58f66'); ctx.lineWidth = r * 0.28; ctx.beginPath(); ctx.moveTo(gx * 0.6, (sy * r * 0.7 + gy) / 2); ctx.lineTo(gx, gy); ctx.stroke();
        if (!shade) { ctx.strokeStyle = 'rgba(120,60,40,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx * 0.75, (sy * r * 0.7 + gy) / 2 - 2); ctx.lineTo(gx * 0.85, (sy * r * 0.7 + gy) / 2 + 3); ctx.stroke(); } }; // 傷疤
      if (!p2) { // 雙手握物干し竿
        const gx = r * (0.7 + 0.5 * e), gy = r * 0.05;
        arm(1, gx, gy + r * 0.12); arm(-1, gx - r * 0.25, gy - r * 0.12);
        ctx.save(); ctx.translate(gx, gy); ctx.rotate(tori ? Math.PI - 0.5 - 0.6 * e : up ? -ang0 : ang0); blade(ctx, r, shade, r * 5.4 * grow(5.4), '#a8262e', false); ctx.restore();
      } else { // 右手紅柄長刀（+y）、左手紫柄小太刀（-y）
        const ex = P.guard ? -0.1 : e;
        const rx = r * (0.75 + 0.45 * ex), ry = r * 0.55, lx = r * (0.7 + 0.4 * ex), ly = -r * 0.55;
        arm(1, rx, ry); arm(-1, lx, ly);
        ctx.save(); ctx.translate(rx, ry); ctx.rotate(P.guard ? -0.3 : tori ? Math.PI - 0.5 - 0.6 * ex : up ? 0.8 - 0.95 * ex : -0.8 + 0.95 * ex); blade(ctx, r, shade, r * 4.3 * grow(4.3), '#a8262e', true); ctx.restore();
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(P.guard ? 0.45 : 0.9 - 1.0 * ex); blade(ctx, r, shade, r * 3.0, '#6a4aa8', true); ctx.restore();
      }

      // 頭：古銅色臉、灰銀髮、橘色錦緞頸巾（圍在頸間）
      R.blit(ctx, 'body:kojiro:head:' + tag, r * 1.6 + 8, r * 1.6 + 8, r * 0.8 + 4, r * 0.8 + 4, (g) => {
        g.strokeStyle = shade ? '#000000' : '#e8883a'; g.lineWidth = r * 0.26; g.beginPath(); g.arc(0, 0, r * 0.52, 0, U.TAU); g.stroke(); // 頸巾
        if (!shade) { g.strokeStyle = '#b8561a'; g.lineWidth = 1.2; g.setLineDash([3, 4]); g.beginPath(); g.arc(0, 0, r * 0.52, 0, U.TAU); g.stroke(); g.setLineDash([]); }
        const gr = g.createRadialGradient(r * 0.12, 0, 2, 0, 0, r * 0.5);
        gr.addColorStop(0, shade ? '#000000' : '#d6a276'); gr.addColorStop(1, shade ? '#000000' : '#a9744e');
        g.fillStyle = gr; g.beginPath(); g.arc(r * 0.05, 0, r * 0.44, 0, U.TAU); g.fill();
        g.fillStyle = shade ? '#000000' : '#c8ccd6'; g.beginPath(); g.arc(-r * 0.08, 0, r * 0.45, Math.PI * 0.42, Math.PI * 1.58); g.fill(); // 後腦灰銀髮
        g.strokeStyle = shade ? '#000000' : '#8f95a2'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(r * 0.05, -r * 0.38); g.quadraticCurveTo(-r * 0.2, 0, r * 0.05, r * 0.38); g.stroke();
        g.fillStyle = shade ? '#000000' : '#2a1c14'; // 銳利的眉與眼，嘴角上揚的笑
        g.fillRect(r * 0.34, -r * 0.22, r * 0.13, 2); g.fillRect(r * 0.34, r * 0.18, r * 0.13, 2);
        g.strokeStyle = shade ? '#000000' : '#5a2a1a'; g.lineWidth = 1.4; g.beginPath(); g.arc(r * 0.18, 0, r * 0.28, -0.6, 0.6); g.stroke();
      });

      // 二階段：萬手無雙的青白微光環繞
      if (p2 && !shade) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA('#9fd8ff', 0.18 + 0.08 * Math.sin(t * 3)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 1.35, 0, U.TAU); ctx.stroke(); ctx.restore(); }
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
