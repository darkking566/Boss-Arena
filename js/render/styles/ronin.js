'use strict';
// Boss 造型：影刃武士：飄帶、羽織肩與家紋、腰間刀鞘、太刀、斗笠；
// 居合 / 千鳥拔刀前與見切架式時刀在鞘中、鯉口閃光；二階段飄帶染紫、斗笠下透出紫光；換階段時跪坐收刀
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;

  // 第一個衝刺動作的時間（居合 / 千鳥的拔刀時刻）；沒有衝刺回傳 -1
  function dashAt(inst) {
    const acts = inst && inst.v && inst.v.actions;
    if (acts) for (const a of acts) if (a.do === 'dash') return a.at;
    return -1;
  }

  R.defineBossStyle('ronin', {
    body(ctx, o, t, { def, r, st, act }) {
      const p2 = o.phase === 2, kneel = st === 'kneel', inst = o.inst;
      // 拔刀前（居合架勢）：居合 / 千鳥第一段衝刺之前、或見切架式期間，刀留在鞘中
      const da = dashAt(inst);
      const ready = !!inst && ((da >= 0 && inst.t < da) || inst.skill.id === 'mikiri');
      const drawn = (inst && !ready) || st === 'feint' || st === 'dodge';
      const readyK = !ready ? 0 : da >= 0 ? U.clamp(inst.t / da, 0, 1) : 0.6 + 0.4 * Math.sin(t * 10);

      // 飄帶：跪坐時垂下；二階段染上暗影、拉長
      const amp = kneel ? 0.25 : 1;
      ctx.strokeStyle = p2 ? '#8a5cff' : def.color; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(-r * 0.5, s * r * 0.3);
        for (let i = 1; i <= (p2 ? 8 : 6); i++) ctx.lineTo(-r * 0.5 - i * 7, s * r * 0.3 + (Math.sin(t * 8 + i * 0.9 + s) * i * 1.4 + s * i * 1.5) * amp);
        ctx.stroke();
      }
      // 羽織肩 + 家紋（精靈快取）
      R.blit(ctx, 'body:ronin:haori:' + r + ':' + def.color2 + ':' + def.color, r * 1.7 + 8, r * 2.4 + 8, r * 0.85 + 4, r * 1.2 + 4, (g) => {
        g.fillStyle = def.color2; g.beginPath(); g.ellipse(0, 0, r * 0.85, r * 1.18, 0, 0, U.TAU); g.fill();
        g.strokeStyle = def.color; g.lineWidth = 2; g.stroke();
        g.fillStyle = hexA(def.color, 0.85);
        for (const s of [-1, 1]) { g.beginPath(); g.arc(-r * 0.05, s * r * 0.98, r * 0.11, 0, U.TAU); g.fill(); }
      });

      // 刀鞘（左腰）：鯉口在前、鞘尾在後；居合架勢時鞘往前推
      const push = ready ? r * 0.15 * readyK : 0;
      const mx = r * 0.45 + push, my = -r * 0.72;
      ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-r * 0.95 + push, -r * 0.98); ctx.lineTo(mx, my); ctx.stroke();
      ctx.strokeStyle = '#4a3a5a'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-r * 0.8 + push, -r * 0.98); ctx.lineTo(mx - r * 0.1, my - 1.5); ctx.stroke();
      ctx.strokeStyle = '#a0413e'; ctx.lineWidth = 2; // 下緒
      ctx.beginPath(); ctx.moveTo(mx - r * 0.25, my - r * 0.02); ctx.quadraticCurveTo(mx - r * 0.35, my + r * 0.3, mx - r * 0.6, my + r * 0.22); ctx.stroke();
      if (!drawn) {
        // 收在鞘中的刀：只露出鍔與纏柄
        ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.ellipse(mx, my, r * 0.07, r * 0.17, -0.12, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = '#a0413e'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(mx + r * 0.05, my); ctx.lineTo(mx + r * 0.55, my + r * 0.07); ctx.stroke();
        if (readyK > 0) {
          // 鯉口閃光：拔刀前越接近出刀越亮
          ctx.save(); ctx.translate(mx, my); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= readyK;
          R.blit(ctx, 'body:ronin:glint', 44, 44, 22, 22, (g) => {
            g.shadowColor = '#fff'; g.shadowBlur = 10; g.fillStyle = '#fff';
            g.beginPath(); g.moveTo(0, -9); g.lineTo(2, -2); g.lineTo(9, 0); g.lineTo(2, 2); g.lineTo(0, 9); g.lineTo(-2, 2); g.lineTo(-9, 0); g.lineTo(-2, -2); g.closePath(); g.fill();
          });
          ctx.restore();
        }
      } else {
        // 拔出的刀
        const ka = inst ? -0.9 + act * 2.6 : -0.6;
        ctx.save(); ctx.rotate(ka);
        // 發光刀身：幾何固定（旋轉在外層），含 10px 陰影
        R.blit(ctx, 'body:ronin:blade:' + o.phase + ':' + r, r * 1.8 + 40, 3 + 40, r * 1.4 + 20, 1.5 + 20, (g) => {
          g.strokeStyle = '#e9eef5'; g.lineWidth = 3; g.shadowColor = o.phase === 2 ? '#b48cff' : '#fff'; g.shadowBlur = 10;
          g.beginPath(); g.moveTo(r * 0.5, 0); g.lineTo(r * 2.3, 0); g.stroke();
        });
        ctx.strokeStyle = '#a0413e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r * 0.1, 0); ctx.lineTo(r * 0.5, 0); ctx.stroke(); ctx.restore();
      }

      // 斗笠（俯視；跪坐時低頭往前）：漸層與竹篾以精靈快取
      const hx = -r * 0.05 + (kneel ? r * 0.14 : 0);
      ctx.translate(hx, 0);
      R.blit(ctx, 'body:ronin:hat:' + r, r * 1.76 + 8, r * 1.76 + 8, r * 0.88 + 4, r * 0.88 + 4, (g) => {
        const gr = g.createRadialGradient(0, 0, 2, 0, 0, r * 0.95); gr.addColorStop(0, '#d8b26a'); gr.addColorStop(1, '#8a6a32');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 0.88, 0, U.TAU); g.fill();
        g.strokeStyle = 'rgba(60,40,10,0.6)'; g.lineWidth = 1;
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86); g.stroke(); }
        g.fillStyle = '#5a3e14'; g.beginPath(); g.arc(0, 0, 3, 0, U.TAU); g.fill();
      });
      ctx.translate(-hx, 0);
      if (p2) {
        // 斗笠下透出的紫光（帽簷前緣）
        const a = 0.55 + 0.35 * Math.sin(t * 5);
        ctx.strokeStyle = hexA('#b48cff', a); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(hx, 0, r * 0.92, -0.5, 0.5); ctx.stroke();
        ctx.fillStyle = hexA('#e6d6ff', a);
        ctx.beginPath(); ctx.arc(hx + r * 0.95, -r * 0.15, 1.8, 0, U.TAU); ctx.arc(hx + r * 0.95, r * 0.15, 1.8, 0, U.TAU); ctx.fill();
      }
    },
    // 換階段：咆哮前跪坐收刀（暗幕與暗影聚集由 phase2.transFx 的 shadowrise 負責）
    transition(ctx, b, t) {
      if (b.stateT >= (b.roarAt || 0.6)) return false;
      R.drawBossBody(ctx, { x: b.x - Math.cos(b.face) * 4, y: b.y - Math.sin(b.face) * 4, face: b.face, r: b.r * 0.92, def: b.def, phase: 1, state: 'kneel', inst: null }, t);
      return true;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
