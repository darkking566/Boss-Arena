'use strict';
// 自繪滿月女王蕾娜菈（俯視）。依已檢視之官方設定稿 rn-ref-158（大書庫主視覺）、rn-ref-159（正背面全身與彎月冠設定稿）、
// rn-ref-160（甜美小生徒、琥珀卵與白墓碑設定稿）及實機畫面（docs/research/rennala/）：
// 深午夜藍絲絨女王長袍、胸前與背後兩條垂地緋紅長襟、彎月缺口金紋寬袖、赤足；頭戴向後彎曲的黃金鏤空「女王彎月冠」；
// 左手懷抱散發溫暖金光的「琥珀卵」，右手持握鑲嵌藍色輝石的銀金「卡利亞權杖」。
// 一階段腳下為大書庫星象陣與琥珀金球護罩；二階段展開星夜水鏡倒影、四大半透明銀藍靈體骨灰（野狼、獵犬騎士、山妖巨人、王室飛龍）與巨型立體滿月。
// 靜態部件以 R.blit 快取，純視覺不消耗 w.rng。
(function (G) {
  const BD = G.BD, R = BD.Render, U = BD.U, TAU = U.TAU;
  const NAVY = '#14203e', NAVY2 = '#253b6e', INK = '#090f22', CRIM = '#b82836', CRIM2 = '#e04854';
  const GOLD = '#d8a848', GOLD2 = '#f6dc8a', GOLDD = '#785618', SILV = '#dceeff', CYAN = '#64d2ff', MOON = '#b8ecff';
  const AMBER = '#f59e0b', AMBER2 = '#fef08a';
  const cl = (v) => U.clamp(v, 0, 1), ease = (v) => { v = cl(v); return v * v * (3 - 2 * v); }, bump = (v) => (v > 0 && v < 1 ? Math.sin(v * Math.PI) : 0);

  function pose(b, t, st) {
    const p2 = b.phase === 2;
    const P = { sa: -0.25, sr: 0, spin: 0, lift: 0, sglow: p2 ? 0.75 : 0.35, eggGlow: p2 ? 0.45 : 0.85, la: 0.55, lean: 0, cast: 0, summon: 0 };
    if (['stun', 'stagger', 'knockdown'].includes(st)) { P.sa = 0.65; P.lean = -0.16; P.eggGlow = 0.3; return P; }
    if (st === 'transition') {
      const q = cl((b.stateT || 0) / 2.4);
      P.lift = ease(q); P.sa = -0.1; P.sglow = 1; P.eggGlow = 1; P.cast = 1; P.summon = bump(q);
      return P;
    }
    const inst = b.inst;
    if (!inst) return P;
    const T = inst.t, id = inst.skill.id;
    if (id === 'spinning_scepter') {
      P.spin = T < 0.7 ? T * 28 : 0;
      P.sr = T < 0.7 ? 0.35 : 0.5 * (1 - cl((T - 0.7) / 0.4));
      P.sglow = 1;
    } else if (id === 'comet_azur') {
      P.sa = 0; P.sr = 0.55; P.lift = 0.35; P.sglow = 1; P.cast = 1; P.lean = -0.1 * cl(T / 0.8);
    } else if (id === 'summon_wolves_bloodhound' || id === 'summon_troll_dragon') {
      P.summon = bump(T / 1.4); P.lift = 0.4 * P.summon; P.sa = -0.75 * P.summon; P.la = 1.15 * P.summon; P.sglow = 0.9;
    } else if (id === 'amber_gravity' || id === 'scholar_books') {
      P.eggGlow = 1; P.lift = 0.35 * bump(T / 1.1); P.cast = bump(T / 1.1);
    } else if (id === 'rennalas_full_moon' || inst.skill.ult) {
      P.lift = 0.6; P.sglow = 1; P.eggGlow = 1; P.cast = 1; P.summon = 0.8;
    } else {
      P.sa = -0.2 + 0.45 * Math.sin(Math.min(1, T / 0.7) * Math.PI);
      P.sr = 0.28 * bump(T / 0.9);
      P.sglow = 0.85;
    }
    return P;
  }

  // ── 靜態部件快取：女王長袍、彎月高冠、卡利亞權杖、琥珀卵 ──
  function robeSprite(g, r, shadow) {
    R.blit(g, 'rennala:robe:' + r + ':' + shadow, r * 3.1, r * 3.0, r * 1.65, r * 1.5, (c) => {
      const dress = () => {
        c.beginPath();
        c.moveTo(r * 0.78, 0);
        c.bezierCurveTo(r * 0.82, r * 0.75, r * 0.05, r * 1.18, -r * 0.78, r * 1.05);
        c.bezierCurveTo(-r * 1.48, r * 0.75, -r * 1.48, -r * 0.75, -r * 0.78, -r * 1.05);
        c.bezierCurveTo(r * 0.05, -r * 1.18, r * 0.82, -r * 0.75, r * 0.78, 0);
        c.closePath();
      };
      if (shadow) { c.fillStyle = '#000'; dress(); c.fill(); return; }
      const gr = c.createRadialGradient(r * 0.1, 0, r * 0.1, -r * 0.15, 0, r * 1.35);
      gr.addColorStop(0, NAVY2); gr.addColorStop(0.65, NAVY); gr.addColorStop(1, INK);
      c.fillStyle = gr; dress(); c.fill();
      c.strokeStyle = GOLD; c.lineWidth = r * 0.04; c.stroke();

      // 絲絨袍褶
      c.strokeStyle = 'rgba(130,175,245,0.22)'; c.lineWidth = r * 0.022;
      for (let i = 0; i < 8; i++) {
        const a = Math.PI * (0.64 + i * 0.09);
        c.beginPath(); c.moveTo(Math.cos(a) * r * 0.28, Math.sin(a) * r * 0.35); c.lineTo(Math.cos(a) * r * 1.22, Math.sin(a) * r * 0.96); c.stroke();
        c.beginPath(); c.moveTo(Math.cos(a) * r * 0.28, -Math.sin(a) * r * 0.35); c.lineTo(Math.cos(a) * r * 1.22, -Math.sin(a) * r * 0.96); c.stroke();
      }

      // 兩側彎月缺口金紋大袖擺（rn-ref-159）
      for (const s of [-1, 1]) {
        c.save(); c.scale(1, s);
        c.fillStyle = NAVY; c.strokeStyle = GOLD; c.lineWidth = r * 0.038;
        c.beginPath();
        c.moveTo(r * 0.2, r * 0.45);
        c.quadraticCurveTo(r * 0.45, r * 1.15, -r * 0.15, r * 1.36);
        c.arc(-r * 0.32, r * 1.22, r * 0.22, 0.6, 2.5, true); // 袖口彎月形內凹缺口
        c.quadraticCurveTo(-r * 0.55, r * 0.85, -r * 0.22, r * 0.45);
        c.closePath(); c.fill(); c.stroke();
        // 袖口繁複金繡花邊
        c.strokeStyle = GOLD2; c.lineWidth = r * 0.02;
        c.beginPath(); c.arc(-r * 0.32, r * 1.22, r * 0.27, 0.5, 2.6, true); c.stroke();
        c.restore();
      }

      // 背後與胸前垂下的緋紅鑲金長襟（rn-ref-158, 159）
      for (const s of [-1, 1]) {
        c.fillStyle = CRIM; c.strokeStyle = GOLD; c.lineWidth = r * 0.025;
        c.beginPath();
        c.moveTo(r * 0.72, s * r * 0.16);
        c.quadraticCurveTo(r * 0.1, s * r * 0.24, -r * 1.28, s * r * 0.42);
        c.lineTo(-r * 1.38, s * r * 0.22);
        c.quadraticCurveTo(r * 0.1, s * r * 0.1, r * 0.74, s * r * 0.06);
        c.closePath(); c.fill(); c.stroke();
      }
      // 背後緋紅披肩垂褶
      c.fillStyle = CRIM2; c.strokeStyle = GOLD; c.lineWidth = r * 0.025;
      c.beginPath(); c.arc(-r * 0.25, 0, r * 0.48, Math.PI * 0.65, Math.PI * 1.35); c.closePath(); c.fill(); c.stroke();

      // 前緣微露的蒼白赤足（rn-ref-159）
      c.fillStyle = '#e8e2ec';
      c.beginPath(); c.ellipse(r * 0.82, r * 0.14, r * 0.11, r * 0.065, 0.1, 0, TAU); c.fill();
      // 領口紫紅寶石胸針
      c.fillStyle = GOLD2; c.beginPath(); c.arc(r * 0.46, 0, r * 0.09, 0, TAU); c.fill();
      c.fillStyle = '#a21caf'; c.beginPath(); c.arc(r * 0.46, 0, r * 0.055, 0, TAU); c.fill();
    });
  }

  function crownSprite(g, r, shadow) {
    // 女王彎月冠（rn-ref-141, 159）：蒼白面容 + 向後高聳彎曲的黃金鏤空雕花新月冠
    R.blit(g, 'rennala:crown:' + r + ':' + shadow, r * 2.2, r * 1.4, r * 1.4, r * 0.7, (c) => {
      if (shadow) {
        c.fillStyle = '#000'; c.beginPath(); c.ellipse(-r * 0.2, 0, r * 0.65, r * 0.34, 0, 0, TAU); c.fill(); return;
      }
      // 蒼白臉龐與深色包頭內襯
      c.fillStyle = '#121624'; c.beginPath(); c.arc(0, 0, r * 0.34, 0, TAU); c.fill();
      c.fillStyle = '#ede8f2'; c.beginPath(); c.arc(r * 0.1, 0, r * 0.26, -1.2, 1.2); c.closePath(); c.fill();

      // 向後彎曲的新月高冠主體
      const gr = c.createLinearGradient(r * 0.2, -r * 0.3, -r * 1.15, r * 0.25);
      gr.addColorStop(0, GOLD2); gr.addColorStop(0.5, GOLD); gr.addColorStop(1, GOLDD);
      c.fillStyle = gr; c.strokeStyle = '#3a2608'; c.lineWidth = r * 0.03;
      c.beginPath();
      c.moveTo(r * 0.18, -r * 0.28);
      c.bezierCurveTo(-r * 0.35, -r * 0.34, -r * 0.95, -r * 0.18, -r * 1.22, r * 0.26); // 彎月尖端向後上方彎折
      c.bezierCurveTo(-r * 0.85, r * 0.42, -r * 0.25, r * 0.32, r * 0.18, r * 0.28);
      c.quadraticCurveTo(r * 0.32, 0, r * 0.18, -r * 0.28);
      c.closePath(); c.fill(); c.stroke();

      // 冠身菱格鏤空金紋與紅寶石點綴（rn-ref-159 左上特寫）
      c.strokeStyle = '#4a320a'; c.lineWidth = r * 0.022;
      for (let i = 1; i <= 4; i++) {
        const x = r * 0.15 - i * r * 0.24, yOff = i * i * r * 0.012, w = r * (0.28 - i * 0.045);
        c.beginPath(); c.moveTo(x, -w + yOff); c.lineTo(x, w + yOff); c.stroke();
        c.beginPath(); c.moveTo(x + r * 0.12, -w * 0.8 + yOff); c.lineTo(x - r * 0.12, w * 0.8 + yOff); c.stroke();
        c.beginPath(); c.moveTo(x + r * 0.12, w * 0.8 + yOff); c.lineTo(x - r * 0.12, -w * 0.8 + yOff); c.stroke();
      }
      c.fillStyle = CRIM2;
      for (const y of [-r * 0.16, 0, r * 0.16]) { c.beginPath(); c.arc(r * 0.16, y, r * 0.028, 0, TAU); c.fill(); }
    });
  }

  function drawAmberEgg(g, r, glow, t, shadow) {
    // 左手懷抱的金色琥珀卵（rn-ref-147, 160）
    g.save();
    if (shadow) {
      g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, 0, r * 0.28, r * 0.22, -0.3, 0, TAU); g.fill(); g.restore(); return;
    }
    const pulse = 0.85 + 0.15 * Math.sin(t * 4.5);
    if (glow > 0.1) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(0, 0, r * 0.05, 0, 0, r * (0.5 + 0.25 * glow) * pulse);
      gr.addColorStop(0, 'rgba(255,248,200,' + 0.75 * glow + ')');
      gr.addColorStop(0.5, 'rgba(245,158,11,' + 0.45 * glow + ')');
      gr.addColorStop(1, 'rgba(180,90,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 0.75, 0, TAU); g.fill();
      g.restore();
    }
    const eg = g.createRadialGradient(r * 0.06, -r * 0.05, r * 0.03, 0, 0, r * 0.3);
    eg.addColorStop(0, AMBER2); eg.addColorStop(0.55, AMBER); eg.addColorStop(1, '#7c3f06');
    g.fillStyle = eg; g.strokeStyle = GOLD2; g.lineWidth = r * 0.025;
    g.beginPath(); g.ellipse(0, 0, r * 0.27, r * 0.21, -0.25, 0, TAU); g.fill(); g.stroke();
    // 卵內無緣誕生者的大盧恩金影
    g.strokeStyle = 'rgba(255,250,220,0.85)'; g.lineWidth = r * 0.022;
    g.beginPath(); g.arc(0, 0, r * 0.11, -0.8, 2.2); g.stroke();
    g.restore();
  }

  function drawScepter(g, r, glow, t, shadow) {
    // 卡利亞權杖（Carian Regal Scepter，rn-ref-012, 140）：修長銀金杖身 + 螺旋托架 + 頂端深藍／青白輝石
    const L = r * 2.55, back = L * 0.34;
    if (shadow) {
      g.strokeStyle = '#000'; g.lineWidth = r * 0.07; g.beginPath(); g.moveTo(-back, 0); g.lineTo(L - back, 0); g.stroke(); return;
    }
    g.lineCap = 'round';
    g.strokeStyle = '#243454'; g.lineWidth = r * 0.08; g.beginPath(); g.moveTo(-back, 0); g.lineTo(L - back - r * 0.35, 0); g.stroke();
    g.strokeStyle = SILV; g.lineWidth = r * 0.045; g.stroke();
    // 金色螺旋杖環
    g.strokeStyle = GOLD2; g.lineWidth = r * 0.025;
    for (let x = -back * 0.5; x < L - back - r * 0.45; x += r * 0.18) {
      g.beginPath(); g.moveTo(x, -r * 0.04); g.lineTo(x + r * 0.09, r * 0.04); g.stroke();
    }
    const tipX = L - back - r * 0.24;
    // 彎月形銀金杖首托架
    g.strokeStyle = GOLD2; g.lineWidth = r * 0.04;
    g.beginPath(); g.arc(tipX, 0, r * 0.18, -2.2, 2.2); g.stroke();
    // 杖首藍色輝石與星芒光暈
    g.fillStyle = '#1e64d0'; g.beginPath(); g.ellipse(tipX + r * 0.04, 0, r * 0.14, r * 0.1, 0, 0, TAU); g.fill();
    g.fillStyle = '#d8f8ff'; g.beginPath(); g.ellipse(tipX + r * 0.06, -r * 0.02, r * 0.07, r * 0.045, 0, 0, TAU); g.fill();
    if (glow > 0.05) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const pulse = 0.85 + 0.15 * Math.sin(t * 14), rad = r * (0.38 + 0.35 * glow) * pulse;
      const gr = g.createRadialGradient(tipX + r * 0.05, 0, 0, tipX + r * 0.05, 0, rad);
      gr.addColorStop(0, 'rgba(245,252,255,' + 0.95 * glow + ')');
      gr.addColorStop(0.45, 'rgba(84,198,255,' + 0.65 * glow + ')');
      gr.addColorStop(1, 'rgba(16,32,72,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(tipX + r * 0.05, 0, rad, 0, TAU); g.fill();
      g.restore();
    }
  }

  function drawRennala(g, b, t, r, P, shadow) {
    g.save();
    g.translate(P.lean * r, 0);
    robeSprite(g, r, shadow);

    // 左手懷抱琥珀卵（胸前偏左 -y）
    const lx = r * 0.34, ly = -r * 0.34;
    g.save(); g.translate(lx, ly);
    drawAmberEgg(g, r, P.eggGlow, t, shadow);
    if (!shadow) {
      // 輕撫琥珀卵的蒼白左手（rn-ref-147）
      g.fillStyle = '#ede8f2';
      g.beginPath(); g.ellipse(r * 0.08, -r * 0.14, r * 0.09, r * 0.05, 0.4, 0, TAU); g.fill();
    }
    g.restore();

    // 右手持卡利亞權杖（+y）
    const hx = r * (0.42 + P.sr * 0.55), hy = r * 0.52;
    g.save(); g.translate(hx, hy); g.rotate(P.sa + P.spin);
    drawScepter(g, r, P.sglow, t, shadow);
    if (!shadow) {
      g.fillStyle = '#ede8f2';
      g.beginPath(); g.arc(0, 0, r * 0.08, 0, TAU); g.fill();
    }
    g.restore();

    // 頭部與女王彎月冠
    g.save(); g.translate(r * 0.2, 0);
    crownSprite(g, r, shadow);
    g.restore();

    g.restore();
  }

  // ── 立體滿月繪製（用於二階段「蕾娜菈的滿月」、大招與轉場） ──
  function drawFullMoonOrb(g, x, y, rad, alpha, t) {
    if (alpha <= 0.01) return;
    g.save(); g.translate(x, y); g.globalAlpha *= alpha;
    // 外層星冕光暈
    g.save(); g.globalCompositeOperation = 'lighter';
    const aura = g.createRadialGradient(0, 0, rad * 0.4, 0, 0, rad * 1.75);
    aura.addColorStop(0, 'rgba(240,250,255,0.85)');
    aura.addColorStop(0.45, 'rgba(110,205,255,0.52)');
    aura.addColorStop(1, 'rgba(16,32,72,0)');
    g.fillStyle = aura; g.beginPath(); g.arc(0, 0, rad * 1.75, 0, TAU); g.fill();
    g.restore();

    // 滿月球體與月海暗紋（rn-ref-020, 137, 140）
    const mg = g.createRadialGradient(-rad * 0.22, -rad * 0.22, rad * 0.1, 0, 0, rad);
    mg.addColorStop(0, '#ffffff');
    mg.addColorStop(0.55, '#d8f0ff');
    mg.addColorStop(0.85, '#86bce8');
    mg.addColorStop(1, '#3b6ca8');
    g.fillStyle = mg; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.fill();

    // 月球表面月海（Maria）陰影斑塊
    g.fillStyle = 'rgba(45,82,135,0.28)';
    const craters = [[-0.28, -0.18, 0.34, 0.24, 0.4], [0.22, 0.12, 0.38, 0.26, -0.3], [-0.12, 0.34, 0.25, 0.16, 0.2], [0.26, -0.28, 0.2, 0.15, 0.6]];
    for (const [cx, cy, rx, ry, rot] of craters) {
      g.beginPath(); g.ellipse(cx * rad, cy * rad, rx * rad, ry * rad, rot + Math.sin(t * 0.5) * 0.05, 0, TAU); g.fill();
    }
    g.strokeStyle = '#ffffff'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.stroke();

    // 環繞滿月的星軌細環
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      g.save(); g.rotate((i ? -0.45 : 0.35) + Math.sin(t + i) * 0.08);
      g.strokeStyle = i ? 'rgba(140,220,255,0.65)' : 'rgba(255,255,255,0.75)';
      g.lineWidth = 2;
      g.beginPath(); g.ellipse(0, 0, rad * (1.28 + i * 0.14), rad * 0.38, 0, 0, TAU); g.stroke();
      g.restore();
    }
    g.restore();
    g.restore();
  }

  // ── 四大喚魂靈體骨灰繪製（over() 層：半透明銀白／冰藍靈體造型） ──
  function drawSpiritPhantoms(g, b, t) {
    const list = b._spirits;
    if (!list || !list.length || !b.world) return;
    const now = b.world.time;
    for (let i = list.length - 1; i >= 0; i--) {
      const sp = list[i], age = now - sp.t0;
      if (age < 0 || age >= sp.life) { if (age >= sp.life) list.splice(i, 1); continue; }
      const u = age / sp.life, alpha = Math.min(1, u * 5) * Math.min(1, (1 - u) * 3.2) * 0.85;
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = alpha;
      if (sp.kind === 'bloodhound') {
        // 獵犬騎士靈體（rn-ref-086, 169）：尖鼻頭盔、披風與大曲劍突進斬
        const dashU = cl((u - 0.38) / 0.35);
        const px = sp.x + Math.cos(sp.angle) * (sp.len * dashU * 0.82);
        const py = sp.y + Math.sin(sp.angle) * (sp.len * dashU * 0.82);
        g.translate(px, py); g.rotate(sp.angle);
        // 靈體殘影線
        g.strokeStyle = 'rgba(140,215,255,0.45)'; g.lineWidth = 18;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(-sp.len * dashU * 0.55, 0); g.stroke();
        // 俯伏突進的獵犬騎士身軀與尖錐盔
        g.fillStyle = 'rgba(180,225,255,0.85)'; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(-6, 0, 22, 14, 0, 0, TAU); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(24, 0); g.lineTo(4, -9); g.lineTo(4, 9); g.closePath(); g.fill(); g.stroke();
        // 獵犬長牙大曲劍
        const swAng = -1.1 + dashU * 2.3;
        g.rotate(swAng);
        g.strokeStyle = '#ffffff'; g.lineWidth = 4.5;
        g.beginPath(); g.moveTo(6, 8); g.quadraticCurveTo(36, 22, 64, 4); g.stroke();
      } else if (sp.kind === 'troll') {
        // 山妖巨人靈體（rn-ref-139, 170）：魁梧巨人身軀與雙手高舉重砸的巨型石劍
        g.translate(sp.x, sp.y); g.rotate(sp.angle);
        const slam = cl((u - 0.42) / 0.22), lift = 1 - slam * 0.65;
        g.scale(1.15, 1.15);
        // 腳下銀白召喚陣
        g.strokeStyle = 'rgba(200,235,255,0.7)'; g.lineWidth = 2.5;
        g.beginPath(); g.arc(0, 0, 48, 0, TAU); g.stroke();
        // 巨人雙肩與毛皮胸膛
        g.fillStyle = 'rgba(165,215,250,0.78)'; g.strokeStyle = '#eef8ff'; g.lineWidth = 2.5;
        g.beginPath(); g.ellipse(-8, 0, 30, 42, 0, 0, TAU); g.fill(); g.stroke();
        g.beginPath(); g.arc(10, 0, 14, 0, TAU); g.fill(); g.stroke();
        // 巨型山妖石劍重砸
        g.fillStyle = 'rgba(230,245,255,0.92)';
        g.beginPath();
        const reach = 18 + (1 - lift) * 52;
        g.moveTo(12, -8); g.lineTo(reach + 44, -13); g.lineTo(reach + 54, 0); g.lineTo(reach + 44, 13); g.lineTo(12, 8);
        g.closePath(); g.fill(); g.stroke();
      } else if (sp.kind === 'dragon') {
        // 王室飛龍靈體（rn-ref-092）：展開巨大半透明銀藍雙翼低空掠過並張口吐息
        g.translate(sp.x, sp.y); g.rotate(sp.angle);
        const flap = Math.sin(t * 12) * 0.15;
        g.fillStyle = 'rgba(155,215,255,0.75)'; g.strokeStyle = '#ffffff'; g.lineWidth = 2.2;
        for (const s of [-1, 1]) {
          g.save(); g.scale(1, s * (1 - flap));
          g.beginPath();
          g.moveTo(10, 8); g.lineTo(-15, 92); g.lineTo(-55, 76); g.lineTo(-38, 42); g.lineTo(-62, 16); g.lineTo(-20, 6);
          g.closePath(); g.fill(); g.stroke();
          g.restore();
        }
        // 龍軀、長頸與雙角龍首
        g.beginPath(); g.ellipse(-18, 0, 34, 16, 0, 0, TAU); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(12, -8); g.lineTo(48, -5); g.lineTo(56, 0); g.lineTo(48, 5); g.lineTo(12, 8); g.closePath(); g.fill(); g.stroke();
      }
      g.restore();
    }
  }

  R.defineBossStyle('rennala', {
    body(g, b, t, k) {
      const portrait = !b.world && g.canvas && g.canvas.width <= 256;
      const P = pose(b, t, k.st), r = k.r;
      if (portrait) { g.translate(r * 0.15, 0); g.scale(0.88, 0.88); }
      const hover = (Math.sin(t * 2.8) * 0.5 + 0.5) * r * (b.phase === 2 ? 0.16 : 0.12) + P.lift * r * 0.22;
      g.save(); g.globalAlpha *= 0.28; g.translate(hover * 0.35 + 4, hover * 0.45 + 6);
      drawRennala(g, b, t, r, P, true);
      g.restore();

      g.save(); g.translate(0, -hover);
      drawRennala(g, b, t, r, P, false);
      // 施法或喚魂時手部與權杖前端的星光法陣
      if (P.cast > 0.05 || P.summon > 0.05) {
        g.save(); g.globalCompositeOperation = 'lighter';
        const c = b.phase === 2 ? 'rgba(130,220,255,' : 'rgba(255,215,100,';
        const al = Math.max(P.cast, P.summon) * 0.65;
        g.strokeStyle = c + al + ')'; g.lineWidth = 2;
        g.beginPath(); g.arc(r * 0.55, 0, r * (0.65 + 0.2 * Math.sin(t * 10)), 0, TAU); g.stroke();
        g.restore();
      }
      g.restore();
    },

    under(g, b, t) {
      if (b.state === 'dead') return;
      const r = b.r;
      g.save(); g.translate(b.x, b.y);
      if (b.phase === 2 || b.state === 'transition') {
        // 二階段：星夜水鏡領域（深海夜空倒影 + 滿月水影 + 卡利亞雙環紋章 + 水波漣漪）
        const k = b.state === 'transition' ? cl((b.stateT || 0) / 2.2) : 1;
        const mr = r * 3.4 * (0.4 + 0.6 * k);
        const wg = g.createRadialGradient(0, 0, r * 0.2, 0, 0, mr);
        wg.addColorStop(0, 'rgba(18,42,88,0.52)');
        wg.addColorStop(0.55, 'rgba(12,28,64,0.38)');
        wg.addColorStop(1, 'rgba(8,16,38,0)');
        g.fillStyle = wg; g.beginPath(); g.ellipse(0, 0, mr, mr * 0.86, 0, 0, TAU); g.fill();

        // 水面映出的銀白滿月倒影與同心漣漪
        g.fillStyle = 'rgba(185,232,255,0.16)';
        g.beginPath(); g.ellipse(-r * 0.45, -r * 0.35, r * 1.15 * k, r * 0.95 * k, 0, 0, TAU); g.fill();
        for (let i = 0; i < 3; i++) {
          const ph = (t * 0.45 + i / 3) % 1;
          g.strokeStyle = 'rgba(168,228,255,' + (1 - ph) * 0.38 * k + ')';
          g.lineWidth = 1.8;
          g.beginPath(); g.ellipse(0, 0, mr * (0.25 + ph * 0.72), mr * 0.86 * (0.25 + ph * 0.72), 0, 0, TAU); g.stroke();
        }
        // 卡利亞雙環紋章法陣（rn-ref-073）
        g.save(); g.rotate(t * 0.35);
        g.strokeStyle = 'rgba(140,215,255,' + 0.42 * k + ')'; g.lineWidth = 2;
        g.beginPath(); g.arc(0, 0, r * 1.65 * k, 0, TAU); g.stroke();
        g.beginPath(); g.arc(0, 0, r * 1.25 * k, 0, TAU); g.stroke();
        for (let i = 0; i < 8; i++) {
          const a = i * TAU / 8;
          g.beginPath(); g.moveTo(Math.cos(a) * r * 1.25 * k, Math.sin(a) * r * 1.25 * k);
          g.lineTo(Math.cos(a) * r * 1.65 * k, Math.sin(a) * r * 1.65 * k); g.stroke();
        }
        g.restore();
      } else {
        // 一階段：大書庫金色星象儀地紋
        g.strokeStyle = 'rgba(245,185,70,0.32)'; g.lineWidth = 1.8;
        g.beginPath(); g.arc(0, 0, r * 1.45, 0, TAU); g.stroke();
        g.beginPath(); g.arc(0, 0, r * 1.1, 0, TAU); g.stroke();
      }
      g.restore();
    },

    over(g, b, t) {
      const w = b.world;
      if (!w) return;
      // 1. 繪製場上活躍的四大喚魂靈體骨灰（離群野狼、獵犬騎士、山妖巨人、王室飛龍）
      drawSpiritPhantoms(g, b, t);

      // 2. 繪製對手頭頂的「滿月易傷（moonbane）」新月印記
      for (const e of w.enemiesOf(b.team)) {
        if (e.state === 'dead') continue;
        const mb = BD.getStatus(e, 'moonbane');
        if (mb) {
          g.save(); g.translate(e.x, e.y);
          g.strokeStyle = 'rgba(140,220,255,0.78)'; g.lineWidth = 2.2;
          g.beginPath(); g.arc(0, 0, (e.r || 28) + 13, t * 2, t * 2 + 4.8); g.stroke();
          g.restore();
        }
      }
      if (b.state === 'dead') return;

      // 3. 一階段「琥珀金罩（ambershield）」：金色琥珀球體護罩與 3 本環繞飛行的發光魔導書卷（rn-ref-131, 142）
      const amb = BD.getStatus(b, 'ambershield');
      if (amb) {
        const sr = b.r + 18;
        g.save(); g.translate(b.x, b.y);
        const ag = g.createRadialGradient(-sr * 0.25, -sr * 0.25, sr * 0.1, 0, 0, sr);
        ag.addColorStop(0, 'rgba(255,248,200,0.18)');
        ag.addColorStop(0.7, 'rgba(245,168,30,0.28)');
        ag.addColorStop(1, 'rgba(255,215,90,0.68)');
        g.fillStyle = ag; g.beginPath(); g.arc(0, 0, sr, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,230,130,0.88)'; g.lineWidth = 2.5;
        g.beginPath(); g.arc(0, 0, sr, 0, TAU); g.stroke();
        // 3 本環繞旋轉的大書庫發光書卷
        for (let i = 0; i < 3; i++) {
          const a = t * 2.6 + i * TAU / 3, bx = Math.cos(a) * (sr + 10), by = Math.sin(a) * (sr + 10);
          g.save(); g.translate(bx, by); g.rotate(a + Math.PI / 2);
          g.fillStyle = '#7c2d12'; g.strokeStyle = GOLD2; g.lineWidth = 1.5;
          g.fillRect(-7, -5, 14, 10); g.strokeRect(-7, -5, 14, 10);
          g.fillStyle = '#fef9c3'; g.fillRect(-5, -3, 10, 6);
          g.restore();
        }
        g.restore();
      }

      // 4. 二階段轉場或「蕾娜菈的滿月／大招」期間高懸頭頂的巨型立體滿月
      if (b.state === 'transition') {
        const q = cl((b.stateT || 0) / 2.2);
        drawFullMoonOrb(g, b.x, b.y - b.r * 2.6, b.r * 1.9 * ease(q), q, t);
      } else if (b._fullMoonUntil && w.time < b._fullMoonUntil && !BD.hasStatus(b, 'hidden')) {
        const rem = b._fullMoonUntil - w.time, up = w.time - (b._fullMoonFrom || 0);
        const k = cl(Math.min(up / 0.25, rem / 0.25));
        drawFullMoonOrb(g, b.x, b.y - b.r * 2.4, b.r * 1.85, k * 0.92, t);
      }
    },

    hidden(g, b, t) {
      // 「蕾娜菈的滿月」升空階段（rn-ref-020, 137）：蕾娜菈化為一輪巨大銀藍滿月在半空滑行逼近落點
      if (!b.inst) return;
      const acts = b.inst.v.actions, T = b.inst.t;
      const land = acts.find((a) => a.do === 'land' && a.at > T);
      const hide = acts.filter((a) => a.do === 'hide' && a.at <= T).pop();
      if (!land || !hide) return;
      const mark = b.inst.marks[land.mark] || b.enemy || b;
      const p = cl((T - hide.at) / Math.max(0.05, land.at - hide.at)), q = ease(p);
      const x = U.lerp(b.x, mark.x, q), y = U.lerp(b.y, mark.y, q);
      const h = Math.sin(p * Math.PI) * 115 + 35, rad = b.r * (2.1 + 0.35 * Math.sin(p * Math.PI));

      // 水面上的滿月倒影
      g.save(); g.translate(x, y);
      g.fillStyle = 'rgba(110,200,255,0.28)';
      g.beginPath(); g.ellipse(0, 0, rad * 0.95, rad * 0.55, 0, 0, TAU); g.fill();
      g.restore();

      // 半空中的巨型立體滿月與蜷縮其中的女王剪影
      drawFullMoonOrb(g, x, y - h, rad, 0.96, t);
      g.save(); g.translate(x, y - h); g.globalAlpha = 0.45;
      g.fillStyle = '#14203e'; g.beginPath(); g.arc(0, 0, b.r * 0.72, 0, TAU); g.fill();
      g.restore();
    },
  });

  // ── 投射物外觀：輝石魔礫、輝石魔弧、旋轉卡利亞權杖、大書庫發光書卷、離群野狼靈體 ──
  R.projStyles = R.projStyles || {};
  R.projStyles.glintshard = (g, p, t) => {
    const r = p.r || 11;
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createLinearGradient(-r * 3.8, 0, r, 0);
    gr.addColorStop(0, 'rgba(38,128,235,0)'); gr.addColorStop(0.65, 'rgba(100,210,255,0.75)'); gr.addColorStop(1, '#ffffff');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(r * 1.4, 0); g.lineTo(-r * 3.6, -r * 0.75); g.lineTo(-r * 1.6, 0); g.lineTo(-r * 3.6, r * 0.75); g.closePath(); g.fill();
    g.fillStyle = '#f0fcff';
    g.beginPath(); g.moveTo(r * 1.4, 0); g.lineTo(0, -r * 0.65); g.lineTo(-r * 1.1, 0); g.lineTo(0, r * 0.65); g.closePath(); g.fill();
    g.restore();
  };

  R.projStyles.glintarc = (g, p, t) => {
    const r = p.r || 15;
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(84,198,255,0.55)'; g.lineWidth = r * 0.55; g.lineCap = 'round';
    g.beginPath(); g.arc(-r * 0.4, 0, r * 1.35, -1.15, 1.15); g.stroke();
    g.strokeStyle = '#f4fbff'; g.lineWidth = r * 0.22;
    g.beginPath(); g.arc(-r * 0.4, 0, r * 1.35, -1.0, 1.0); g.stroke();
    g.restore();
  };

  R.projStyles.scepterspin = (g, p, t) => {
    const r = p.r || 28;
    g.save();
    g.rotate(t * 28);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const a = i * TAU / 3;
      g.strokeStyle = i % 2 ? 'rgba(100,215,255,0.8)' : 'rgba(245,252,255,0.9)';
      g.lineWidth = 4;
      g.beginPath(); g.arc(0, 0, r * (0.82 + i * 0.1), a, a + 1.65); g.stroke();
    }
    g.restore();
    // 旋轉中的卡利亞權杖本體
    g.strokeStyle = SILV; g.lineWidth = 4;
    g.beginPath(); g.moveTo(-r * 1.05, 0); g.lineTo(r * 1.05, 0); g.stroke();
    g.fillStyle = CYAN; g.beginPath(); g.arc(r * 0.95, 0, 6, 0, TAU); g.fill();
    g.fillStyle = GOLD2; g.beginPath(); g.arc(-r * 0.95, 0, 4, 0, TAU); g.fill();
    g.restore();
  };

  R.projStyles.sweetbook = (g, p, t) => {
    const r = p.r || 12;
    g.save();
    g.rotate(t * 9 + p.x * 0.02);
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(255,210,90,0.45)'; g.beginPath(); g.arc(0, 0, r * 1.45, 0, TAU); g.fill();
    g.restore();
    // 鑲金精裝魔導書與翻飛書頁
    g.fillStyle = '#6b21a8'; g.strokeStyle = GOLD2; g.lineWidth = 2;
    g.fillRect(-r * 0.9, -r * 0.7, r * 1.8, r * 1.4);
    g.strokeRect(-r * 0.9, -r * 0.7, r * 1.8, r * 1.4);
    g.fillStyle = '#fef9c3';
    g.fillRect(-r * 0.65, -r * 0.48, r * 1.3, r * 0.96);
    g.strokeStyle = GOLD; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(0, -r * 0.68); g.lineTo(0, r * 0.68); g.stroke();
    g.restore();
  };

  R.projStyles.spiritwolf = (g, p, t) => {
    // 離群野狼靈體飛撲（rn-ref-021, 171）：半透明銀白奔狼造型
    const r = p.r || 16, run = Math.sin(t * 24 + p.x * 0.03);
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createLinearGradient(-r * 3.2, 0, r, 0);
    gr.addColorStop(0, 'rgba(120,200,255,0)'); gr.addColorStop(1, 'rgba(220,242,255,0.65)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(-r * 1.1, 0, r * 2.2, r * 0.7, 0, 0, TAU); g.fill();
    // 狼身、四肢與狼首
    g.fillStyle = 'rgba(215,240,255,0.9)'; g.strokeStyle = '#ffffff'; g.lineWidth = 1.6;
    g.beginPath(); g.ellipse(-r * 0.2, 0, r * 1.15, r * 0.55, 0, 0, TAU); g.fill(); g.stroke();
    // 狼首與雙耳
    g.beginPath(); g.moveTo(r * 1.45, 0); g.lineTo(r * 0.55, -r * 0.45); g.lineTo(r * 0.55, r * 0.45); g.closePath(); g.fill(); g.stroke();
    // 前後奔跑狼爪與長尾
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(r * 0.5, -r * 0.4); g.lineTo(r * (1.1 + run * 0.3), -r * 0.65);
    g.moveTo(r * 0.5, r * 0.4); g.lineTo(r * (1.1 - run * 0.3), r * 0.65);
    g.moveTo(-r * 1.1, 0); g.quadraticCurveTo(-r * 1.9, run * r * 0.45, -r * 2.4, run * r * 0.6);
    g.stroke();
    g.restore();
  };

  // ── 拋射物外觀：發光白墓碑（tombstone）與大書庫燃燒吊燈（chandelier） ──
  R.lobStyles = R.lobStyles || {};
  R.lobStyles.tombstone = (g, l, x, y, k, t) => {
    // 原作一階段發光白色浮雕墓碑（rn-ref-015, 160 右下）
    g.save(); g.translate(x, y); g.rotate((1 - k) * 2.4 - 0.3);
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(255,235,170,0.45)'; g.beginPath(); g.arc(0, 0, 32, 0, TAU); g.fill();
    g.restore();
    g.fillStyle = '#f8fafc'; g.strokeStyle = '#cbd5e1'; g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(-14, 18); g.lineTo(-14, -8); g.arc(0, -8, 14, Math.PI, 0); g.lineTo(14, 18); g.closePath();
    g.fill(); g.stroke();
    // 墓碑上的交叉雙手浮雕紋路
    g.strokeStyle = '#94a3b8'; g.lineWidth = 1.4;
    g.beginPath(); g.arc(0, -8, 9, Math.PI, 0); g.stroke();
    g.beginPath(); g.moveTo(-7, 2); g.lineTo(7, 12); g.moveTo(7, 2); g.lineTo(-7, 12); g.stroke();
    g.restore();
  };

  R.lobStyles.chandelier = (g, l, x, y, k, t) => {
    // 大書庫墜落的燃燒黃銅燭台吊燈
    g.save(); g.translate(x, y);
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(255,165,40,0.6)'; g.lineWidth = 12; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -75); g.stroke();
    g.restore();
    g.strokeStyle = GOLD2; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, 4, 22, 9, 0, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(0, -18); g.lineTo(-20, 4); g.moveTo(0, -18); g.lineTo(20, 4); g.moveTo(0, -24); g.lineTo(0, 8); g.stroke();
    // 燭台上的 5 簇燭火
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5 + t * 4, cx = Math.cos(a) * 20, cy = 4 + Math.sin(a) * 8;
      g.fillStyle = '#ff9a2a'; g.beginPath(); g.arc(cx, cy - 5, 4.5, 0, TAU); g.fill();
      g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(cx, cy - 6, 2.2, 0, TAU); g.fill();
    }
    g.restore();
  };

  // ── 區域外觀：吊燈燭火海（chandelierfire）與滿月星夜水鏡池（moonpool） ──
  R.zoneStyles = R.zoneStyles || {};
  R.zoneStyles.chandelierfire = (g, z, t) => {
    g.save(); g.translate(z.x, z.y);
    const gr = g.createRadialGradient(0, 0, 4, 0, 0, z.r);
    gr.addColorStop(0, 'rgba(255,210,90,0.55)');
    gr.addColorStop(0.65, 'rgba(235,105,20,0.38)');
    gr.addColorStop(1, 'rgba(120,35,5,0.05)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, z.r, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,195,80,0.65)'; g.lineWidth = 2;
    g.beginPath(); g.arc(0, 0, z.r, 0, TAU); g.stroke();
    // 散落的黃銅燭台殘骸與搖曳燭火
    g.strokeStyle = GOLD; g.lineWidth = 2.2;
    g.beginPath(); g.ellipse(0, 0, z.r * 0.35, z.r * 0.18, 0.2, 0, TAU); g.stroke();
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6 + z.seed, d = z.r * (0.28 + 0.42 * ((i * 3) % 4) / 3), fl = 0.65 + 0.35 * Math.sin(t * 14 + i * 2);
      const fx = Math.cos(a) * d, fy = Math.sin(a) * d;
      g.fillStyle = 'rgba(255,155,35,' + 0.75 * fl + ')';
      g.beginPath(); g.moveTo(fx - 6, fy + 5); g.quadraticCurveTo(fx, fy - 18 * fl, fx + 6, fy + 5); g.closePath(); g.fill();
    }
    g.restore();
  };

  R.zoneStyles.moonpool = (g, z, t) => {
    g.save(); g.translate(z.x, z.y);
    const gr = g.createRadialGradient(0, 0, 4, 0, 0, z.r);
    gr.addColorStop(0, 'rgba(180,235,255,0.48)');
    gr.addColorStop(0.6, 'rgba(45,115,210,0.36)');
    gr.addColorStop(1, 'rgba(12,28,68,0.08)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, z.r, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(168,228,255,0.72)'; g.lineWidth = 2;
    g.beginPath(); g.arc(0, 0, z.r, 0, TAU); g.stroke();
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.55 + i / 3) % 1;
      g.strokeStyle = 'rgba(225,248,255,' + (1 - ph) * 0.5 + ')'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(0, 0, z.r * (0.2 + ph * 0.75), 0, TAU); g.stroke();
    }
    g.restore();
  };
})(typeof window !== 'undefined' ? window : globalThis);
