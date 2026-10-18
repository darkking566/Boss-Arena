'use strict';
// Boss 造型：熔岩巨像：岩塊身軀與肩岩、發光裂紋、巨拳；依招式擺出蓄力姿勢（單拳後拉 / 雙拳高舉 / 低身衝撞 / 張口噴吐 / 拳砸地面）；
// 二階段岩殼裂成板塊、露出熔核；換階段時裂紋擴張、身體顫抖，咆哮瞬間岩殼爆裂（爆裂特效由 phase2.transFx 的 shellburst 負責）
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;

  // 會「出手」的動作：姿勢依下一個出手動作蓄力、出手後收勢（R.skillPace）
  const SIDES = [-1, 1];
  const TRIG = { hit: 1, dash: 1, lob: 1, zone: 1, erupt: 1, hide: 1 };
  function poseOf(id, a) {
    if (id === 'breath') return 'breath';
    if (!a) return null;
    if (a.do === 'dash') return 'ram';
    if (a.do === 'lob' || a.do === 'hide') return 'heave';
    if (a.do === 'zone' || a.do === 'erupt') return 'ground';
    return a.shape === 'cone' || a.shape === 'rect' ? 'punch' : 'slam';
  }
  // 單一拳頭的位置與高舉倍率（重用物件）
  const F = { x: 0, y: 0, sc: 1 };
  function fist(s, r, mode, side, wd, sn, t, idle) {
    let x = r * 0.55, y = s * r * 0.95, sc = 1;
    if (mode === 'punch') {
      if (s === side) { x = r * (0.55 - 0.45 * wd + 0.65 * sn); sc = 1 + 0.15 * wd; } else x = r * 0.6;
    } else if (mode === 'slam' || mode === 'heave') {
      const sl = mode === 'slam';
      x = r * (0.55 - 0.15 * wd + (sl ? 0.55 : 0.3) * sn); y = s * r * (0.95 - 0.22 * wd - (sl ? 0.25 : 0) * sn);
      sc = 1 + 0.3 * wd + (sl ? 0 : 0.3 * sn);
    } else if (mode === 'ground') {
      x = r * (0.55 - 0.25 * sn); y = s * r * (0.95 + 0.35 * sn); sc = 1 + 0.3 * wd;
    } else if (mode === 'ram') {
      x = r * 0.85; y = s * r * 0.42; sc = 1.05;
    } else if (mode === 'breath') {
      x = r * 0.15; y = s * r;
    } else if (idle) y += Math.sin(t * 2 + s) * r * 0.03;
    F.x = x; F.y = y; F.sc = sc;
    return F;
  }
  function drawFist(ctx, def, r, f, heat, cf, sf) {
    const lift = f.sc - 1;
    if (lift > 0.02) {
      // 高舉：地面陰影往世界座標右下錯開（換算到身體座標）
      const ox = lift * 14, oy = lift * 18;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(f.x + ox * cf + oy * sf, f.y - ox * sf + oy * cf, r * 0.42, r * 0.36, 0, 0, U.TAU); ctx.fill();
    }
    const fr = r * 0.42 * f.sc;
    ctx.fillStyle = def.color2; ctx.beginPath(); ctx.arc(f.x, f.y, fr, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = hexA(def.glow, heat); ctx.lineWidth = r * 0.085; ctx.stroke();
    ctx.strokeStyle = hexA(def.color, heat * 0.8); ctx.lineWidth = r * 0.04; // 指節裂縫
    ctx.beginPath(); ctx.moveTo(f.x + fr * 0.45, f.y - fr * 0.45); ctx.lineTo(f.x + fr * 0.65, f.y + fr * 0.35); ctx.stroke();
  }
  // 換階段用的繪製物件（重用）
  const T = { x: 0, y: 0, face: 0, r: 0, def: null, phase: 1, state: 'crack', crackK: 0, inst: null };

  R.defineBossStyle('golem', {
    body(ctx, o, t, { def, r }) {
      const p2 = o.phase === 2, inst = o.inst && o.inst.v ? o.inst : null, crackK = o.crackK || 0;
      let mode = null, wd = 0, sn = 0, side = 1, lean = 0;
      let heat = p2 ? 1 : 0.55 + 0.2 * Math.sin(t * 4);
      if (inst) {
        const p = R.skillPace(inst, TRIG);
        wd = p.snap > 0 ? 0 : p.wind; sn = p.snap; side = p.i % 2 ? 1 : -1;
        mode = poseOf(inst.skill.id, p.a);
        if (mode === 'breath') heat = Math.max(heat, p.n > 0 ? 1 : wd);
        else if (mode === 'heave' || mode === 'ground') heat = Math.max(heat, 0.5 + 0.5 * Math.max(wd, sn));
        else if (mode === 'ram') lean = inst.dash ? r * 0.12 : -r * 0.1 * wd;
      }
      heat = Math.max(heat, crackK);
      const cf = Math.cos(o.face), sf = Math.sin(o.face);
      if (lean) ctx.translate(lean, 0);
      // 拳頭：一般畫在身體下面，高舉時畫在上面（較靠近鏡頭）
      for (let pass = 0; pass < 2; pass++) {
        for (const s of SIDES) {
          const f = fist(s, r, mode, side, wd, sn, t, !inst);
          if ((f.sc > 1.15) === (pass === 1)) drawFist(ctx, def, r, f, heat, cf, sf);
        }
        if (pass === 1) break;
        if (p2) {
          // 二階段：岩殼裂成板塊、縫隙透出熔核（精靈快取），核心以加法光脈動
          R.blit(ctx, 'body:golem:core:' + r + ':' + def.color2, r * 2.2 + 8, r * 2.2 + 8, r * 1.1 + 4, r * 1.1 + 4, (g) => {
            const gr = g.createRadialGradient(0, 0, r * 0.05, 0, 0, r * 0.95);
            gr.addColorStop(0, '#fff6c0'); gr.addColorStop(0.45, '#ff8a2a'); gr.addColorStop(1, '#7a1a00');
            g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 0.93, 0, U.TAU); g.fill();
            const pg = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.06, 0, 0, r * 1.05); pg.addColorStop(0, '#6b3a22'); pg.addColorStop(1, def.color2);
            g.fillStyle = pg; g.strokeStyle = '#1a0a04'; g.lineWidth = r * 0.05;
            for (let i = 0; i < 7; i++) {
              const a0 = i / 7 * U.TAU + 0.08, a1 = (i + 1) / 7 * U.TAU - 0.08, ro = r * (0.95 + (i % 3) * 0.05);
              g.beginPath(); g.arc(0, 0, ro, a0, a1); g.arc(0, 0, r * 0.4, a1, a0, true); g.closePath(); g.fill(); g.stroke();
            }
            g.fillStyle = '#4a2414'; g.beginPath(); g.arc(r * 0.5, 0, r * 0.3, 0, U.TAU); g.fill(); g.stroke();
          });
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = hexA(def.glow, 0.3 + 0.2 * Math.sin(t * 6)); ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, U.TAU); ctx.fill();
          ctx.restore();
        } else {
          // 岩塊身軀 + 肩岩 + 頭（徑向漸層 + 同一路徑外框）以精靈快取
          R.blit(ctx, 'body:golem:rock2:' + r + ':' + def.color2, r * 2.2 + 8, r * 2.2 + 8, r * 1.1 + 4, r * 1.1 + 4, (g) => {
            const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.06, 0, 0, r); gr.addColorStop(0, '#6b3a22'); gr.addColorStop(1, def.color2);
            g.fillStyle = gr; g.strokeStyle = '#1a0a04'; g.lineWidth = r * 0.07;
            g.beginPath();
            for (let i = 0; i < 9; i++) { const a = i / 9 * U.TAU, rr = r * (0.92 + ((i * 7) % 3) * 0.05); i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(rr, 0); }
            g.closePath(); g.fill(); g.stroke();
            for (const s of [-1, 1]) { g.beginPath(); g.arc(-r * 0.1, s * r * 0.72, r * 0.36, 0, U.TAU); g.fill(); g.stroke(); }
            g.fillStyle = '#5a2e1a'; g.beginPath(); g.arc(r * 0.5, 0, r * 0.3, 0, U.TAU); g.fill(); g.stroke();
          });
          ctx.strokeStyle = hexA(def.color, heat); ctx.lineWidth = r * 0.07; ctx.beginPath();
          ctx.moveTo(-r * 0.6, -r * 0.2); ctx.lineTo(-r * 0.1, 0); ctx.lineTo(-r * 0.4, r * 0.45); ctx.moveTo(-r * 0.1, 0); ctx.lineTo(r * 0.3, -r * 0.35); ctx.moveTo(0, r * 0.1); ctx.lineTo(r * 0.2, r * 0.5); ctx.stroke();
          ctx.strokeStyle = hexA(def.color, heat * 0.6); ctx.lineWidth = r * 0.035; ctx.beginPath();
          ctx.moveTo(r * 0.1, -r * 0.55); ctx.lineTo(r * 0.35, -r * 0.15); ctx.lineTo(r * 0.6, -r * 0.4); ctx.moveTo(-r * 0.55, r * 0.15); ctx.lineTo(-r * 0.2, r * 0.6); ctx.stroke();
          if (crackK > 0) {
            // 換階段：新的裂紋蔓延到全身、內部熱光透出
            ctx.strokeStyle = hexA('#fff1b8', crackK); ctx.lineWidth = r * 0.05; ctx.beginPath();
            ctx.moveTo(-r * 0.85, -r * 0.1); ctx.lineTo(-r * 0.5, -r * 0.05); ctx.lineTo(-r * 0.3, -r * 0.3);
            ctx.moveTo(r * 0.1, r * 0.85); ctx.lineTo(r * 0.05, r * 0.5); ctx.lineTo(r * 0.3, r * 0.3);
            ctx.moveTo(r * 0.7, r * 0.6); ctx.lineTo(r * 0.45, r * 0.35);
            ctx.moveTo(-r * 0.3, -r * 0.85); ctx.lineTo(-r * 0.1, -r * 0.5); ctx.lineTo(r * 0.15, -r * 0.6);
            ctx.stroke();
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = hexA(def.glow, 0.45 * crackK); ctx.beginPath(); ctx.arc(-r * 0.1, 0, r * 0.5 * crackK, 0, U.TAU); ctx.fill();
            ctx.restore();
          }
        }
        // 眼睛
        ctx.fillStyle = p2 ? '#fff6c0' : def.glow;
        ctx.beginPath(); ctx.arc(r * 0.6, -r * 0.13, r * 0.08, 0, U.TAU); ctx.arc(r * 0.6, r * 0.13, r * 0.08, 0, U.TAU); ctx.fill();
        if (mode === 'breath') {
          // 噴吐：口中熔岩光隨蓄力膨脹
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = hexA(def.glow, 0.5 * heat); ctx.beginPath(); ctx.arc(r * 0.85, 0, r * (0.15 + 0.25 * heat), 0, U.TAU); ctx.fill();
          ctx.fillStyle = hexA('#fff1b8', heat); ctx.beginPath(); ctx.arc(r * 0.82, 0, r * (0.06 + 0.1 * heat), 0, U.TAU); ctx.fill();
          ctx.restore();
        }
      }
      if (lean) ctx.translate(-lean, 0);
    },
    // 換階段：咆哮前裂紋蔓延、身體顫抖；咆哮（岩殼爆裂）後提早換成熔核外觀
    transition(ctx, b, t) {
      const at = b.roarAt || 0.6, cracking = b.stateT < at, k = U.clamp(b.stateT / at, 0, 1), j = cracking ? k * 4 : 0;
      T.x = b.x + (BD.vrng() - 0.5) * j; T.y = b.y + (BD.vrng() - 0.5) * j; T.face = b.face; T.r = b.r; T.def = b.def;
      T.phase = cracking ? 1 : 2; T.crackK = cracking ? k : 0;
      R.drawBossBody(ctx, T, t);
      return true;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
