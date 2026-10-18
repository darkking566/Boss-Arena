'use strict';
// Boss 造型：霜月魔女：寬簷尖帽與新月帽徽、銀白長髮、霜邊披風、法杖冰晶、環繞冰片；
// 依招式擺出施法姿勢（杖尖前指連射 / 平舉蓄力冰槍 / 高舉杖頭 / 低掃佈雷 / 立杖召喚），冰片向杖尖收攏；
// 二階段冰晶與帽徽轉為秘法紫、頭後浮現新月光環；換階段時高舉法杖迎接月蝕（月蝕特效由 phase2.transFx 的 eclipse 負責）
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;

  const TRIG = { proj: 1, hit: 1, trap: 1, zone: 1, summon: 1 };
  const POSE = { icicle: 'thrust', lance: 'lance', nova: 'raise', blizzard: 'raise', ult: 'raise', mines: 'sweep', sentinel: 'plant', mirror: 'plant' };
  // 法杖幾何（重用物件）：hx/hy 握點、tx/ty 杖尖、cx 冰晶沿杖方向的伸長、cs 冰晶大小、gl 杖尖光、conv 冰片向杖尖收攏程度
  const S = { hx: 0, hy: 0, tx: 0, ty: 0, cx: 1, cs: 1, gl: 0, conv: 0 };
  function staff(r, mode, wd, sn) {
    S.hx = -r * 0.2; S.hy = r * 0.85; S.tx = r * 1.5; S.ty = r * 0.75; S.cx = 1; S.cs = 1; S.gl = 0; S.conv = 0;
    if (mode === 'thrust') {
      S.hx = r * 0.4; S.hy = r * 0.6; S.tx = r * (1.5 + 0.4 * wd + 0.25 * sn); S.ty = r * (0.75 - 0.65 * wd); S.cs = 1 + 0.3 * wd; S.gl = Math.max(wd, sn); S.conv = wd;
    } else if (mode === 'lance') {
      S.hx = r * 0.5; S.hy = r * 0.45; S.tx = r * (1.6 + 0.6 * wd - 0.4 * sn); S.ty = r * 0.05; S.cx = 1 + 1.5 * wd; S.gl = Math.max(wd, sn); S.conv = wd;
    } else if (mode === 'raise') {
      S.hx = r * 0.25; S.hy = r * 0.45; S.tx = r * 0.35; S.ty = r * 0.2; S.cs = 1.5 + 0.7 * wd; S.gl = 0.4 + 0.6 * Math.max(wd, sn); S.conv = wd - sn;
    } else if (mode === 'sweep') {
      const a = sn > 0 ? 0.9 - 1.8 * sn : 0.9 + 0.3 * wd;
      S.hx = r * 0.2; S.hy = r * 0.5; S.tx = Math.cos(a) * r * 1.6; S.ty = Math.sin(a) * r * 1.6; S.gl = Math.max(wd, sn) * 0.6;
    } else if (mode === 'plant') {
      S.hx = r * 0.5; S.hy = r * 0.55; S.tx = r * 1.3; S.ty = r * 0.2; S.cs = 1.3; S.gl = 0.3 + 0.5 * Math.max(wd, sn);
    }
    return S;
  }
  // 換階段用的繪製物件（重用）
  const T = { x: 0, y: 0, face: 0, r: 0, def: null, phase: 1, state: 'eclipse', pose: null, poseK: 0, inst: null };

  R.defineBossStyle('witch', {
    body(ctx, o, t, { def, r }) {
      const p2 = o.phase === 2, inst = o.inst && o.inst.v ? o.inst : null;
      const ice = p2 ? '#c77dff' : '#9fe6ff', iceCore = p2 ? '#f6e8ff' : '#e8fdff';
      let mode = o.pose || null, wd = o.poseK || 0, sn = 0;
      if (inst && POSE[inst.skill.id]) {
        const p = R.skillPace(inst, TRIG);
        mode = POSE[inst.skill.id]; wd = p.snap > 0 ? 0 : p.wind; sn = p.snap;
      }
      const st = staff(r, mode, wd, sn);
      const sway = Math.sin(t * 3) * 0.15 + (mode ? 0.12 * Math.max(wd, sn) : 0);

      if (mode === 'plant') {
        // 召喚法陣：腳下旋轉的虛線圈
        ctx.save(); ctx.rotate(t * 0.8); ctx.setLineDash([6, 5]);
        ctx.strokeStyle = hexA(ice, 0.3 + 0.5 * Math.max(wd, sn)); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, U.TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      }
      // 披風：肩後往後飄、下襬波浪，霜白滾邊
      ctx.fillStyle = def.color2; ctx.strokeStyle = 'rgba(191,239,255,0.55)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.78);
      ctx.quadraticCurveTo(-r * 1.2, -r * (0.95 + sway), -r * 2.0, -r * (0.55 - sway * 2));
      for (let i = 1; i <= 4; i++) ctx.quadraticCurveTo(-r * (2.25 - (i % 2) * 0.1), -r * (0.55 - i * 0.275 - sway * 2) + r * 0.14, -r * 2.0, -r * (0.55 - i * 0.275 - sway * 2));
      ctx.quadraticCurveTo(-r * 1.2, r * (0.95 - sway), -r * 0.1, r * 0.78);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (p2) {
        ctx.fillStyle = 'rgba(246,232,255,0.8)';
        for (let i = 0; i < 5; i++) { const sx = -r * (0.9 + (i * 37 % 10) / 10), sy = r * (((i * 53) % 13) / 13 - 0.5) * 0.9; ctx.fillRect(sx, sy, 1.6, 1.6); }
      }
      // 銀白長髮（帽簷下往後飄）
      ctx.strokeStyle = 'rgba(223,246,255,0.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        const a = Math.PI + i * 0.38 + Math.sin(t * 2.5 + i) * 0.06;
        ctx.beginPath(); ctx.moveTo(-r * 0.5, i * r * 0.3);
        ctx.quadraticCurveTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2 + Math.sin(t * 3 + i) * 3, Math.cos(a + i * 0.15) * r * 1.65, Math.sin(a + i * 0.15) * r * 1.65);
        ctx.stroke();
      }
      // 身體圓盤（徑向漸層 + 同一路徑外框）以精靈快取
      R.blit(ctx, 'body:witch:disc:' + r + ':' + def.color, r * 2 + 8, r * 2 + 8, r + 4, r + 4, (g) => {
        const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r); gr.addColorStop(0, '#d8f4ff'); gr.addColorStop(1, def.color);
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, U.TAU); g.fill(); g.strokeStyle = '#0d2238'; g.lineWidth = 2; g.stroke();
      });
      if (p2) {
        // 頭後的新月光環
        ctx.strokeStyle = hexA('#c77dff', 0.55 + 0.25 * Math.sin(t * 4)); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(-r * 0.1, 0, r * 1.25, Math.PI * 0.62, Math.PI * 1.38); ctx.stroke();
      }
      // 寬簷尖帽（俯視：帽簷、帽帶、往後彎的帽尖）＋新月帽徽，以精靈快取
      R.blit(ctx, 'body:witch:hat:' + r + ':' + o.phase, r * 2.6 + 8, r * 2.6 + 8, r * 1.3 + 4, r * 1.3 + 4, (g) => {
        // 帽簷（深）→ 帽帶（亮色細環）→ 帽冠（較亮、左上受光）→ 往後彎的帽尖
        g.fillStyle = '#0f2236'; g.strokeStyle = '#3a76a8'; g.lineWidth = 2;
        g.beginPath(); g.arc(0, 0, r * 0.98, 0, U.TAU); g.fill(); g.stroke();
        const cg = g.createRadialGradient(-r * 0.25, -r * 0.2, 1, -r * 0.1, 0, r * 0.5); cg.addColorStop(0, '#4a86b8'); cg.addColorStop(1, '#1d4266');
        g.fillStyle = cg;
        g.beginPath(); g.arc(-r * 0.1, 0, r * 0.46, 0, U.TAU); g.fill();
        g.beginPath(); g.moveTo(-r * 0.15, -r * 0.32); g.quadraticCurveTo(-r * 0.7, -r * 0.15, -r * 1.25, r * 0.38); g.quadraticCurveTo(-r * 0.6, r * 0.18, -r * 0.15, r * 0.32); g.closePath(); g.fill();
        g.strokeStyle = p2 ? '#a070ff' : '#7fd8ff'; g.lineWidth = r * 0.09;
        g.beginPath(); g.arc(-r * 0.1, 0, r * 0.5, 0, U.TAU); g.stroke();
        g.shadowColor = p2 ? '#c77dff' : '#bff'; g.shadowBlur = p2 ? 8 : 4; g.fillStyle = p2 ? '#f6e8ff' : '#e0f7ff';
        g.beginPath(); g.arc(r * 0.5, 0, r * 0.16, 0, U.TAU); g.moveTo(r * 0.69, -r * 0.04); g.arc(r * 0.56, -r * 0.04, r * 0.13, 0, U.TAU); g.fill('evenodd');
      });
      // 法杖
      ctx.strokeStyle = '#d9c9a3'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(st.hx, st.hy); ctx.lineTo(st.tx, st.ty); ctx.stroke();
      if (st.gl > 0.01) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = hexA(ice, 0.2 + 0.4 * st.gl); ctx.beginPath(); ctx.arc(st.tx, st.ty, r * (0.3 + 0.5 * st.gl), 0, U.TAU); ctx.fill();
        ctx.restore();
      }
      // 杖頭冰晶（固定區域座標 + 陰影）：精靈含陰影範圍 14px；冰槍蓄力時沿杖方向伸長
      ctx.save(); ctx.translate(st.tx, st.ty);
      if (st.cx !== 1) { ctx.rotate(Math.atan2(st.ty - st.hy, st.tx - st.hx)); ctx.scale(st.cx, 1); ctx.rotate(Math.PI / 2); } else ctx.rotate(t * 2);
      ctx.scale(st.cs, st.cs);
      R.blit(ctx, 'body:witch:crystal:' + o.phase, 10 + 40, 16 + 40, 5 + 20, 8 + 20, (g) => {
        g.shadowColor = ice; g.shadowBlur = 14; g.fillStyle = iceCore;
        g.beginPath(); g.moveTo(0, -8); g.lineTo(5, 0); g.lineTo(0, 8); g.lineTo(-5, 0); g.closePath(); g.fill();
      });
      ctx.restore();
      // 環繞冰片：施法時向杖尖收攏（conv < 0 為出手後向外炸開）
      const n = p2 ? 5 : 3, cv = U.clamp(st.conv, -1, 1);
      const ox = cv > 0 ? st.tx * cv : 0, oy = cv > 0 ? st.ty * cv : 0;
      const rr = cv > 0 ? r * (1.6 - 1.25 * cv) : r * (1.6 - cv);
      const spin = t * (o.pose ? 6 : 1.6);
      ctx.fillStyle = p2 ? 'rgba(230,200,255,0.85)' : 'rgba(210,245,255,0.85)';
      for (let i = 0; i < n; i++) {
        const a = spin + i * U.TAU / n; ctx.save(); ctx.translate(ox + Math.cos(a) * rr, oy + Math.sin(a) * rr); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(0, 3); ctx.lineTo(-6, 0); ctx.lineTo(0, -3); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    },
    // 換階段：咆哮前高舉法杖、冰片高速旋轉收攏；咆哮（月蝕炸開）後提早換成二階段外觀
    transition(ctx, b, t) {
      const at = b.roarAt || 0.6, before = b.stateT < at;
      T.x = b.x; T.y = b.y; T.face = b.face; T.r = b.r; T.def = b.def;
      T.phase = before ? 1 : 2; T.pose = before ? 'raise' : null; T.poseK = before ? U.clamp(b.stateT / at, 0, 1) : 0;
      R.drawBossBody(ctx, T, t);
      return true;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
