'use strict';
// 造型：獵魂者（獵魂模式主角）——兜帽披肩的小身影，手持所選武器（出招時依時間軸揮動）
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render;
  // 出招進度 -1（起手）→ +1（收勢）：用來擺動武器；非出招時為 0
  function swing(o) {
    const i = o.inst;
    if (!i || o.state !== 'skill') return 0;
    const v = i.v, k = U.clamp((i.t - v.windup * 0.4) / Math.max(0.12, v.activeEnd - v.windup * 0.4), 0, 1);
    return k * 2 - 1;
  }
  const blade = (ctx, len, w, col) => {
    ctx.strokeStyle = '#2a2f3a'; ctx.lineWidth = w + 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
  };
  const WEAPON = {
    bow(ctx, r) {
      ctx.strokeStyle = '#a8794a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r * 0.2, 0, r * 1.1, -1.15, 1.15); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(r * 0.2 + Math.cos(1.15) * r * 1.1, Math.sin(1.15) * r * 1.1); ctx.lineTo(r * 0.2 + Math.cos(-1.15) * r * 1.1, Math.sin(-1.15) * r * 1.1); ctx.stroke();
    },
    greatsword(ctx, r) { blade(ctx, r * 2.6, 6, '#dfe6ee'); ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-2, -5, 5, 10); },
    daggers(ctx, r) { for (const s of [-1, 1]) { ctx.save(); ctx.translate(r * 0.3, s * r * 0.75); blade(ctx, r * 1.05, 3, '#e8ecf2'); ctx.restore(); } },
    greataxe(ctx, r) {
      blade(ctx, r * 2.1, 4, '#8a6a46'); ctx.fillStyle = '#c9d0d8';
      ctx.beginPath(); ctx.moveTo(r * 1.5, 0); ctx.lineTo(r * 2.1, -r * 0.8); ctx.lineTo(r * 2.2, r * 0.6); ctx.closePath(); ctx.fill();
    },
    katana(ctx, r, t, o) {
      const lv = (o && o.hunt && o.hunt.kt && o.hunt.kt.level) || 0; // 練氣等級：刀身發光（白 / 黃 / 紅）
      if (lv) { ctx.shadowColor = ['', '#fff', '#ffe27a', '#ff3a2a'][lv]; ctx.shadowBlur = 10 + lv * 4; }
      blade(ctx, r * 2.2, 3, ['#f2f5fa', '#ffffff', '#fff2b0', '#ff9a8a'][lv]); ctx.shadowBlur = 0; ctx.fillStyle = '#c0a050'; ctx.fillRect(-1, -4, 3, 8);
    },
    // 狩獵模式：大劍（蓄力段數 → 刀身發橘紅光）、雙刀（鬼人化紅光 / 鬼人強化金光）、片手劍（劍；盾另外畫在左手）
    gs(ctx, r, t, o) {
      const lv = (o && o.h4 && o.h4.drv.lvl) || 0;
      if (lv) { ctx.shadowColor = ['', '#ffd08a', '#ffa040', '#ff5a2a'][lv]; ctx.shadowBlur = 8 + lv * 5; }
      blade(ctx, r * 2.7, 8, lv ? '#fff0d8' : '#dfe6ee'); ctx.shadowBlur = 0; ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-3, -6, 6, 12);
    },
    db(ctx, r, t, o) {
      const d = o && o.h4 && o.h4.drv, glow = d && (d.demon ? '#ff3a3a' : d.arch ? '#ffd34a' : null);
      if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 12; }
      for (const s of [-1, 1]) { ctx.save(); ctx.translate(r * 0.3, s * r * 0.75); blade(ctx, r * 1.1, 3, glow ? '#ffe0d8' : '#e8ecf2'); ctx.restore(); }
      ctx.shadowBlur = 0;
    },
    sns(ctx, r) { blade(ctx, r * 1.5, 4, '#e8ecf2'); ctx.fillStyle = '#c0a050'; ctx.fillRect(-1, -6, 3, 12); },
    // 第二批：大錘（蓄力段數發光）、狩獵笛（音符數 → 笛身顏色）、長槍、銃槍（槍管；龍擊砲可用時槍口發橘光）
    hammer(ctx, r, t, o) {
      const lv = (o && o.h4 && o.h4.drv.lvl) || 0;
      blade(ctx, r * 1.9, 4, '#8a6a46');
      if (lv) { ctx.shadowColor = ['', '#ffd08a', '#ffa040', '#ff5a2a'][lv]; ctx.shadowBlur = 8 + lv * 5; }
      ctx.fillStyle = '#6f7884'; ctx.strokeStyle = '#2a2f3a'; ctx.lineWidth = 2;
      ctx.fillRect(r * 1.6, -r * 0.55, r * 0.75, r * 1.1); ctx.strokeRect(r * 1.6, -r * 0.55, r * 0.75, r * 1.1); ctx.shadowBlur = 0;
    },
    horn(ctx, r, t, o) {
      const d = o && o.h4 && o.h4.drv, n = d && d.notes ? d.notes.length : 0;
      blade(ctx, r * 1.7, 4, '#8a6a46');
      ctx.fillStyle = ['#b89a5a', '#d8a85a', '#e8c06a', '#fff0a0'][n]; ctx.strokeStyle = '#2a2f3a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(r * 1.4, -r * 0.25); ctx.lineTo(r * 2.4, -r * 0.7); ctx.lineTo(r * 2.4, r * 0.7); ctx.lineTo(r * 1.4, r * 0.25); ctx.closePath(); ctx.fill(); ctx.stroke();
    },
    // 第三批：斬擊斧（斧 / 劍形態，解放時劍身紫光）、充能斧（劍盾 / 大斧，盾強化金光）、操蟲棍（雙刃棍＋繞身飛的獵蟲，顏色＝精華數）
    switchaxe(ctx, r, t, o) {
      const d = o && o.h4 && o.h4.drv;
      if (d && d.mode === 'sword') {
        if (d.amped) { ctx.shadowColor = '#ff7aff'; ctx.shadowBlur = 14; }
        blade(ctx, r * 2.4, 6, d.amped ? '#ffd8ff' : '#dfe6ee'); ctx.shadowBlur = 0;
      } else {
        blade(ctx, r * 2, 4, '#8a6a46'); ctx.fillStyle = '#b8c0c8'; ctx.strokeStyle = '#2a2f3a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(r * 1.4, -r * 0.1); ctx.lineTo(r * 2.1, -r * 0.75); ctx.lineTo(r * 2.2, r * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    },
    chargeblade(ctx, r, t, o) {
      const d = o && o.h4 && o.h4.drv;
      if (d && d.mode === 'axe') {
        if (o.world && o.world.time < d.shieldUntil) { ctx.shadowColor = '#ffd34a'; ctx.shadowBlur = 12; }
        blade(ctx, r * 2.3, 5, '#8a6a46'); ctx.fillStyle = '#c8d0d8'; ctx.strokeStyle = '#2a2f3a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(r * 1.9, 0, r * 0.45, r * 0.8, 0, 0, U.TAU); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      } else { blade(ctx, r * 1.5, 4, '#e8ecf2'); ctx.fillStyle = '#c0a050'; ctx.fillRect(-1, -6, 3, 12); }
    },
    glaive(ctx, r) {
      blade(ctx, r * 2.4, 3, '#6a5a4a');
      for (const x of [0, r * 2.4]) { ctx.fillStyle = '#d8dee6'; ctx.beginPath(); ctx.moveTo(x + (x ? r * 0.35 : -r * 0.35), 0); ctx.lineTo(x, -r * 0.16); ctx.lineTo(x, r * 0.16); ctx.closePath(); ctx.fill(); }
    },
    lance(ctx, r) { blade(ctx, r * 2.8, 4, '#d8dee6'); ctx.fillStyle = '#e8ecf2'; ctx.beginPath(); ctx.moveTo(r * 2.8, 0); ctx.lineTo(r * 2.4, -r * 0.22); ctx.lineTo(r * 2.4, r * 0.22); ctx.closePath(); ctx.fill(); },
    gunlance(ctx, r, t, o) {
      const d = o && o.h4 && o.h4.drv;
      blade(ctx, r * 2.4, 7, '#5a626e'); ctx.fillStyle = '#d8dee6'; ctx.beginPath(); ctx.moveTo(r * 2.75, 0); ctx.lineTo(r * 2.35, -r * 0.25); ctx.lineTo(r * 2.35, r * 0.25); ctx.closePath(); ctx.fill();
      if (d && o.world && o.world.time >= d.wfAt) { ctx.fillStyle = `rgba(255,140,60,${0.5 + 0.4 * Math.sin(t * 8)})`; ctx.beginPath(); ctx.arc(r * 2.4, 0, r * 0.18, 0, U.TAU); ctx.fill(); }
    },
    staff(ctx, r, t) {
      blade(ctx, r * 2.2, 3, '#7a5a3a');
      ctx.fillStyle = `rgba(170,140,255,${0.6 + 0.4 * Math.sin(t * 6)})`; ctx.beginPath(); ctx.arc(r * 2.3, 0, r * 0.38, 0, U.TAU); ctx.fill();
    },
    lightxbow(ctx, r) {
      ctx.strokeStyle = '#a8794a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.8); ctx.lineTo(r * 0.5, r * 0.8); ctx.stroke();
      blade(ctx, r * 1.3, 3, '#555c68');
    },
    heavyxbow(ctx, r) {
      ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(r * 0.6, -r * 1.1); ctx.lineTo(r * 0.6, r * 1.1); ctx.stroke();
      blade(ctx, r * 1.6, 6, '#444b57');
    },
  };
  R.defineBossStyle('hero', {
    body(ctx, o, t, { def, r }) {
      const s = swing(o), M = R.heroMotion, m = M && M.pose(o); // m：有動作表的招式姿勢（hero-motion.js）；沒有就用舊的 sw 擺法
      const fd = m && m.form && o.h4 && o.h4.drv, form0 = fd && fd.mode; if (fd) fd.mode = m.form; // 變形招：命中前先照舊形態畫（畫完還原，不影響戰鬥）
      if (m) { const k = 1 + 0.15 * m.air; ctx.translate(m.lean * r, 0); ctx.scale(k * (1 - 0.08 * m.sq), k * (1 + 0.08 * m.sq)); M.trail(ctx, o, r, def.weapon); }
      // 武器：握在身體右側（區域 y 軸正向），出招時以 s 擺動
      const sw = o.state === 'skill' && o.inst.skill.sw; // 太刀連斬各式的揮刀動作
      ctx.save(); ctx.translate(r * 0.2, r * 0.55);
      if (m) {
        ctx.translate(m.reach * r, 0); ctx.rotate(m.a);
        if (m.glow > 0.02) { // 蓄力光：沿武器一道發光的線
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = '#ffb050'; ctx.shadowBlur = 8 + 18 * m.glow; ctx.strokeStyle = `rgba(255,190,110,${Math.min(0.8, m.glow)})`; ctx.lineWidth = 6 + 6 * m.glow; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo((M.LEN[def.weapon] || 2) * r, 0); ctx.stroke(); ctx.restore();
        }
      } else if (sw === 'thrust') ctx.translate((s + 1) * r * 0.6, -(s + 1) * r * 0.25);
      else ctx.rotate(sw === 'spin' ? (s + 1) * Math.PI : sw === 'down' ? -1.5 + (s + 1) * 1.1 : sw === 'ccw' ? -s * 0.9 - 0.3 : s * 0.9 + (o.state === 'skill' ? 0 : -0.25));
      (WEAPON[def.weapon] || WEAPON.katana)(ctx, r, t, o); const hand = ctx.getTransform ? ctx.getTransform() : null; ctx.restore();
      const drv = o.h4 && o.h4.drv, cbSword = def.weapon === 'chargeblade' && drv && drv.mode === 'sword';
      if (def.weapon === 'sns' || def.weapon === 'lance' || def.weapon === 'gunlance' || cbSword) { // 盾：左手；防禦時舉到正前方，完美防禦窗內發亮（槍系 / 充能斧的盾較大）
        const g = o.state === 'skill' && o.inst.skill.guard, pf = g && o.inst.t <= o.inst.skill.guard.perfect, big = def.weapon === 'sns' ? 1 : 1.35;
        const gv = g ? 1 : m ? Math.min(1, m.shield) : 0, push = m ? Math.max(0, m.shield - 1) * r * 0.6 : 0; // 盾擊：姿勢的 shield 把盾推到前方
        ctx.save(); ctx.translate(r * (0.25 + 0.5 * gv) + push, -r * 0.75 * (1 - gv)); ctx.rotate(-0.4 * (1 - gv));
        if (pf) { ctx.shadowColor = '#9fe8ff'; ctx.shadowBlur = 16; } else if (cbSword && o.world && o.world.time < drv.shieldUntil) { ctx.shadowColor = '#ffd34a'; ctx.shadowBlur = 12; } // 盾強化
        ctx.fillStyle = '#4a6a8a'; ctx.strokeStyle = '#d8e4f0'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.28 * big, r * 0.62 * big, 0, 0, U.TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      if (def.weapon === 'glaive') { // 獵蟲：繞身體飛，精華越多越亮
        const n = ['red', 'white', 'orange'].filter((c) => BD.hasStatus(o, 'h4' + c)).length, a = t * 4;
        ctx.fillStyle = ['#7a8a6a', '#ff6a5a', '#ffd0a0', '#ffe27a'][n]; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5, r * 0.18, 0, U.TAU); ctx.fill();
      }
      if (o.state === 'skill' && o.inst.skill.grp === 'a' && o.inst.t < 0.2) { // 彈刀判定中：刀前一道白弧
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r * 1.7, -0.9, 0.9); ctx.stroke();
      }
      // 披肩 + 肩線
      ctx.fillStyle = def.color2; ctx.strokeStyle = def.color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(-r * 0.1, 0, r * 0.8, r * 1.05, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      // 兜帽（頭）
      ctx.fillStyle = '#d7e6f2'; ctx.beginPath(); ctx.arc(r * 0.15, 0, r * 0.52, 0, U.TAU); ctx.fill();
      ctx.fillStyle = def.color; ctx.beginPath(); ctx.arc(-r * 0.05, 0, r * 0.52, Math.PI * 0.6, Math.PI * 1.4); ctx.fill();
      if (M && hand) M.hands(ctx, hand, def, o, r); // 手畫在披肩上面，才看得出怎麼握武器
      if (fd) fd.mode = form0;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
