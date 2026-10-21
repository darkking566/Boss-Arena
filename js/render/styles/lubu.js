'use strict';
// Boss 造型：飛將呂布：半裸古銅肌肉胸膛、赤紅戰袍披風、金冠雙雉翎、方天畫戟（二階段赤兔馬戰騎剪影）
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;

  // 視覺放大：判定半徑不變，只放大繪製（戟、翎、赤兔在一般縮放下更易辨識）
  const VIS = 1.25;

  // 方天畫戟姿勢：依時間軸下一個出手動作（R.skillPace）擺架勢，最後 35% 揮出
  const TRIG = { hit: 1, dash: 1 };
  const REST = 0.35;
  function poseOf(inst, a) {
    const id = inst.skill.id;
    if (!a) return null;
    if (a.do === 'dash') return inst.skill.ult ? 'lance' : 'pounce';
    if (a.shape === 'cone') return 'sweep';
    if (a.shape === 'rect') return id === 'tiankui_lite' || inst.skill.ult ? 'cleave' : id === 'hammer_parry' ? 'guard' : 'thrust';
    return id === 'unbroken' ? 'raise' : 'whirl';
  }
  const ease = (u) => 1 - (1 - u) * (1 - u);
  // 重用物件：ga 角度、tx 握點前後位移、fs 戟長縮放（高舉時透視縮短）、s0 / sa 戟弧殘影起點與透明度、gl 戟刃蓄力光、bl 戟刃伸長
  const H = { ga: REST, tx: 0, fs: 1, s0: 0, sa: 0, gl: 0, bl: 1 };
  function pose(r, mode, wd, sn, dashing, ult) {
    H.ga = REST; H.tx = 0; H.fs = 1; H.s0 = 0; H.sa = 0; H.gl = 0; H.bl = 1;
    const hold = Math.min(1, wd / 0.5), sw = wd < 0.65 ? 0 : ease((wd - 0.65) / 0.35);
    if (mode === 'sweep') {
      const A = 1.9, B = -1.2;
      if (sn > 0) { H.ga = REST + (B - REST) * sn; H.s0 = A; H.sa = 0.28 * sn; }
      else if (sw > 0) { H.ga = A + (B - A) * sw; H.s0 = A; H.sa = 0.28; }
      else H.ga = REST + (A - REST) * hold;
    } else if (mode === 'whirl') {
      const A = 2.0;
      if (sn > 0) { H.ga = A; H.s0 = A - 2.6; H.sa = 0.28 * sn; }
      else if (sw > 0) { H.ga = A + U.TAU * sw; H.s0 = H.ga - Math.min(2.6, U.TAU * sw); H.sa = 0.28; }
      else H.ga = REST + (A - REST) * hold;
    } else if (mode === 'thrust' || (mode === 'guard' && sw > 0) || (mode === 'guard' && sn > 0)) {
      H.ga = sn > 0 ? 0 : REST * (1 - hold);
      H.tx = sn > 0 ? r * 0.6 * sn : -r * 0.45 * hold + r * 1.05 * sw;
    } else if (mode === 'guard') {
      H.ga = -1.45; H.tx = r * 0.1; // 彈反架式在招式一開始就生效：立刻橫戟
    } else if (mode === 'pounce') {
      if (dashing || sn > 0) { H.ga = 0; H.fs = 1.15; }
      else { H.ga = REST * (1 - hold); H.fs = 1 - 0.5 * hold; }
    } else if (mode === 'cleave') {
      // 天喰：高舉蓄力、戟刃發光（大招時戟刃隨蓄力伸長），最後一刻斬落
      H.ga = 0.15 * (1 - sw); H.fs = sn > 0 ? 1 + 0.2 * sn : 1 - 0.5 * hold + 0.7 * sw;
      H.gl = Math.max(wd, sn); H.bl = ult ? 1 + 0.8 * Math.max(wd, sn) : 1;
    } else if (mode === 'lance') {
      H.ga = 0; H.tx = r * 0.3; H.fs = 1.1; H.gl = dashing ? 0.6 : 0.3 * hold;
    } else if (mode === 'raise') {
      H.ga = 0.2; H.fs = 1 - 0.6 * Math.max(hold, sn);
    }
    return H;
  }

  // 赤兔馬（二階段坐騎；換階段時由身後奔入）：lean 衝鋒時往前拉長
  function drawHorse(ctx, r, t, lean) {
    if (lean) ctx.scale(1 + 0.15 * lean, 1 - 0.06 * lean);
    // 赤兔馬身軀輪廓（以精靈快取靜態徑向漸層）
    R.blit(ctx, 'body:lubu:horse:' + r, r * 3.6 + 20, r * 1.8 + 20, r * 1.9 + 10, r * 0.9 + 10, (g) => {
      g.beginPath();
      g.moveTo(r * 1.6, 0);               // 馬吻
      g.lineTo(r * 1.45, -r * 0.22);       // 額頂
      g.lineTo(r * 1.25, -r * 0.35);       // 馬耳
      g.lineTo(r * 1.15, -r * 0.2);        // 耳根
      g.lineTo(r * 0.5, -r * 0.42);        // 頸脊
      g.lineTo(-r * 0.4, -r * 0.68);       // 側肋
      g.quadraticCurveTo(-r * 1.5, -r * 0.72, -r * 1.7, 0); // 臀部
      g.quadraticCurveTo(-r * 1.5, r * 0.72, -r * 0.4, r * 0.68);
      g.lineTo(r * 0.5, r * 0.42);
      g.lineTo(r * 1.15, r * 0.2);
      g.lineTo(r * 1.25, r * 0.35);
      g.lineTo(r * 1.45, r * 0.22);
      g.closePath();

      const gr = g.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.6);
      gr.addColorStop(0, '#9a1622');
      gr.addColorStop(1, '#48080e');
      g.fillStyle = gr;
      g.fill();
      g.strokeStyle = '#280408';
      g.lineWidth = 2.5;
      g.stroke();
    });

    // 赤兔馬動態烈火馬尾與飄逸鬃毛
    const tailSway = Math.sin(t * 8) * r * 0.25;
    ctx.strokeStyle = 'rgba(255,50,40,0.85)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 1.6, 0);
    ctx.quadraticCurveTo(-r * 2.1, tailSway * 0.6, -r * 2.5, tailSway);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,140,50,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 1.6, 0);
    ctx.quadraticCurveTo(-r * 2.0, -tailSway * 0.5, -r * 2.3, -tailSway * 0.8);
    ctx.stroke();

    // 烈焰鬃毛光絲
    for (let i = 0; i < 4; i++) {
      const mx = r * (0.8 - i * 0.35);
      const my = Math.sin(t * 12 + i * 1.5) * 3;
      ctx.strokeStyle = `rgba(255,${120 + i * 30},40,0.7)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx, -r * 0.2);
      ctx.lineTo(mx - r * 0.2, -r * 0.5 + my);
      ctx.stroke();
    }
  }
  function drawBody(ctx, o, t, { def, r, st, act, swing }) {
      const p2 = o.phase === 2;

      const inst = o.inst && o.inst.skill && o.inst.v && o.inst.v.actions ? o.inst : null;
      let w = null;
      if (inst) {
        const p = R.skillPace(inst, TRIG), mode = poseOf(inst, p.a);
        if (mode) w = pose(r, mode, p.snap > 0 ? 0 : p.wind, p.snap, !!inst.dash, !!inst.skill.ult);
      } else if (o.pose) w = pose(r, o.pose, o.poseK || 0, 0, false, false);
      // 1. 赤兔馬：二階段坐騎（衝鋒時前傾）；換階段時 horseK 0→1 由身後奔入、漸顯
      if (p2) { ctx.save(); drawHorse(ctx, r, t, inst && inst.dash ? 1 : 0); ctx.restore(); }
      else if (o.horseK > 0) {
        ctx.save(); ctx.translate(-r * 7 * (1 - o.horseK), 0); ctx.globalAlpha *= o.horseK; drawHorse(ctx, r, t, 1 - o.horseK); ctx.restore();
      }
      // 斷腿不退：狂怒期間全身赤紅氣焰
      if (o.statuses && BD.hasStatus(o, 'enrage')) {
        const a = 0.35 + 0.2 * Math.sin(t * 12);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = hexA('#d83ad8', a * 0.5); ctx.beginPath(); ctx.arc(0, 0, r * 1.25, 0, U.TAU); ctx.fill(); // 原作洋紅鬥氣
        for (let i = 0; i < 6; i++) {
          const ang = i / 6 * U.TAU + t * 2, fl = 0.5 + 0.5 * Math.sin(t * 18 + i * 2.1);
          ctx.fillStyle = hexA('#f060e8', a * fl);
          ctx.beginPath(); ctx.arc(Math.cos(ang) * r * 0.95, Math.sin(ang) * r * 0.95, r * (0.12 + 0.1 * fl), 0, U.TAU); ctx.fill();
        }
        ctx.restore();
      }

      // 2. 赤紅戰袍披風（隨時間與動作起伏飄揚）
      const capeSway = Math.sin(t * 5) * 0.15;
      ctx.fillStyle = p2 ? '#0a0e1c' : '#161c36'; // 原作為深藍黑長披風
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.8);
      for (let i = 1; i <= 5; i++) {
        const cx = -r * 0.2 - i * (r * 1.6 / 5);
        const cy = -r * 0.8 + i * (r * 1.6 / 5) + Math.sin(t * 6 + i) * r * 0.18 + capeSway * r;
        ctx.lineTo(cx, cy);
      }
      ctx.lineTo(-r * 0.2, r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d4af37'; // 戰袍金邊
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 3. 魁梧半裸軀幹（古銅膚色胸膛 + 腰間獸面甲裙）以精靈快取
      R.blit(ctx, 'body:lubu:torso:' + r + ':' + (p2 ? 2 : 1), r * 2.2 + 20, r * 2.0 + 20, r * 0.9 + 10, r * 1.0 + 10, (g) => {
        // 寬闊肩背與胸肌底輪廓
        g.beginPath();
        g.moveTo(r * 0.45, 0);
        g.lineTo(r * 0.35, -r * 0.7);
        g.lineTo(-r * 0.2, -r * 0.82);
        g.lineTo(-r * 0.5, -r * 0.55);
        g.lineTo(-r * 0.5, r * 0.55);
        g.lineTo(-r * 0.2, r * 0.82);
        g.lineTo(r * 0.35, r * 0.7);
        g.closePath();

        // 健壯肌肉膚色漸層
        const gr = g.createRadialGradient(r * 0.15, 0, 2, 0, 0, r * 0.9);
        gr.addColorStop(0, '#e8b896');
        gr.addColorStop(0.65, '#c5855f');
        gr.addColorStop(1, '#8e4c2b');
        g.fillStyle = gr;
        g.fill();
        g.strokeStyle = '#5a2e16';
        g.lineWidth = 2;
        g.stroke();

        // 雙肩紫色菱形魚鱗刺青（原作標誌）：裁切在軀幹內，只畫兩肩帶
        g.save(); g.clip();
        g.strokeStyle = 'rgba(112, 56, 168, 0.85)';
        g.lineWidth = 1.4;
        const step = r * 0.14;
        for (const side of [-1, 1]) {
          g.beginPath();
          for (let k = -6; k <= 6; k++) {
            g.moveTo(-r * 0.5 + k * step, side * r * 0.3); g.lineTo(r * 0.5 + k * step, side * r * 0.9);
            g.moveTo(r * 0.5 + k * step, side * r * 0.3); g.lineTo(-r * 0.5 + k * step, side * r * 0.9);
          }
          g.stroke();
        }
        g.restore();

        // 胸肌與腹肌陰影線條
        g.strokeStyle = 'rgba(110, 50, 25, 0.55)';
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(-r * 0.15, 0); g.lineTo(r * 0.4, 0); g.stroke();
        g.beginPath(); g.arc(r * 0.18, -r * 0.26, r * 0.22, 0.4, 2.7); g.stroke();
        g.beginPath(); g.arc(r * 0.18, r * 0.26, r * 0.22, -2.7, -0.4); g.stroke();

        // 腰腹白燈籠褲 + 金邊（原作赤足白褲）
        g.fillStyle = '#e8e4dc';
        g.beginPath();
        g.moveTo(-r * 0.15, -r * 0.65);
        g.lineTo(-r * 0.5, -r * 0.55);
        g.lineTo(-r * 0.5, r * 0.55);
        g.lineTo(-r * 0.15, r * 0.65);
        g.closePath();
        g.fill();
        g.strokeStyle = '#d4af37';
        g.lineWidth = 2;
        g.stroke();

        // 獅蠻金帶扣：金環嵌青藍寶玉
        g.fillStyle = '#f0c030';
        g.beginPath();
        g.arc(-r * 0.15, 0, r * 0.18, 0, U.TAU);
        g.fill();
        g.strokeStyle = '#8a6010';
        g.lineWidth = 1.5;
        g.stroke();
        g.fillStyle = '#1f8fb0';
        g.beginPath();
        g.arc(-r * 0.15, 0, r * 0.09, 0, U.TAU);
        g.fill();
      });

      // 4. 頭部金冠與兩道標誌性長雉翎（隨身姿大幅飄逸）
      // 披散黑長髮
      const hairSway = Math.sin(t * 4) * r * 0.12;
      ctx.fillStyle = '#0c0f1c';
      ctx.beginPath();
      ctx.moveTo(r * 0.1, -r * 0.4);
      ctx.quadraticCurveTo(-r * 0.9, -r * 0.6 + hairSway, -r * 1.3, hairSway);
      ctx.quadraticCurveTo(-r * 0.9, r * 0.6 + hairSway, r * 0.1, r * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1e1412';
      ctx.beginPath();
      ctx.arc(r * 0.12, 0, r * 0.36, 0, U.TAU);
      ctx.fill();

      // 紫金冠頂件
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.moveTo(r * 0.35, 0);
      ctx.lineTo(r * 0.05, -r * 0.25);
      ctx.lineTo(r * 0.12, 0);
      ctx.lineTo(r * 0.05, r * 0.25);
      ctx.closePath();
      ctx.fill();

      // 雙翎（長金羽向後飄逸）
      const plumeWave1 = Math.sin(t * 6) * r * 0.32;
      const plumeWave2 = Math.sin(t * 6 + 1.4) * r * 0.32;
      for (const [side, sway] of [[-1, plumeWave1], [1, plumeWave2]]) {
        ctx.strokeStyle = '#f5c538';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(r * 0.15, side * r * 0.15);
        ctx.bezierCurveTo(
          -r * 0.3, side * (r * 0.6) + sway * 0.4,
          -r * 1.1, side * (r * 0.85) + sway * 0.8,
          -r * 2.2, side * (r * 0.5) + sway * 1.2
        );
        ctx.stroke();

        // 翎羽尖端赤紅珠節
        ctx.fillStyle = '#ff4433';
        ctx.beginPath();
        ctx.arc(-r * 2.2, side * (r * 0.5) + sway * 1.2, 3, 0, U.TAU);
        ctx.fill();

        ctx.strokeStyle = '#ffe880';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // 5. 方天畫戟（長柄 + 月牙刀 + 槍尖，隨攻擊進度與呼吸擺動）
      const drawn = o.inst || st === 'feint';
      const ha = w ? w.ga : drawn ? (o.inst ? -1.1 + act * 2.6 : -0.6) : (REST + swing);
      const fs = w ? w.fs : 1, bl = w ? w.bl : 1, hpx = r * 0.25 + (w ? w.tx : 0), hpy = r * 0.6;
      if (w && w.sa > 0.01) {
        // 戟弧殘影：從起揮角掃到目前角的扇環帶
        const a0 = Math.min(w.s0, ha), a1 = Math.max(w.s0, ha), L = r * 3.4 * fs;
        ctx.fillStyle = p2 ? hexA('#ff2b38', w.sa) : `rgba(232,240,248,${w.sa})`;
        ctx.beginPath(); ctx.arc(hpx, hpy, L + r * 0.45, a0, a1); ctx.arc(hpx, hpy, L * 0.55, a1, a0, true); ctx.closePath(); ctx.fill();
      }
      ctx.save();
      ctx.translate(hpx, hpy);
      ctx.rotate(ha);
      if (fs !== 1) ctx.scale(fs, 1);

      const poleLen = r * 3.4;
      if (w && w.gl > 0.01) {
        // 戟刃蓄力光（天喰 / 赤兔衝鋒）
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = hexA('#ff2b38', 0.25 + 0.45 * w.gl); ctx.beginPath(); ctx.ellipse(poleLen, 0, r * (0.5 + 0.6 * w.gl) * bl, r * (0.35 + 0.3 * w.gl), 0, 0, U.TAU); ctx.fill();
        ctx.restore();
      }
      // 戟桿（長柄）
      ctx.strokeStyle = '#32231c';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, 0);
      ctx.lineTo(poleLen, 0);
      ctx.stroke();

      // 戟尾金鐏
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -3);
      ctx.lineTo(-r * 0.9, 0);
      ctx.lineTo(-r * 0.7, 3);
      ctx.closePath();
      ctx.fill();

      // 紅纓繫綴
      ctx.fillStyle = p2 ? '#ff2030' : '#c81824';
      ctx.beginPath();
      ctx.moveTo(poleLen - r * 0.9, -4);
      ctx.lineTo(poleLen - r * 0.6, 0);
      ctx.lineTo(poleLen - r * 0.9, 4);
      ctx.lineTo(poleLen - r * 1.2, 0);
      ctx.closePath();
      ctx.fill();

      // 戟頭部（中央透甲槍尖 + 側邊方天月牙刃）；天喰蓄力時以戟頭根部為原點伸長
      if (bl !== 1) { ctx.translate(poleLen - r * 0.8, 0); ctx.scale(bl, bl); ctx.translate(-(poleLen - r * 0.8), 0); }
      if (p2) {
        ctx.shadowColor = '#ff2b38';
        ctx.shadowBlur = 12;
      }
      // 中央長槍頭
      ctx.fillStyle = '#e8f0f8';
      ctx.beginPath();
      ctx.moveTo(poleLen - r * 0.8, -4);
      ctx.lineTo(poleLen + r * 0.45, 0);
      ctx.lineTo(poleLen - r * 0.8, 4);
      ctx.lineTo(poleLen - r * 0.65, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8fa3b5';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 側邊方天月牙鏟弧刃
      ctx.fillStyle = '#e8f0f8';
      ctx.beginPath();
      ctx.moveTo(poleLen - r * 0.75, -r * 0.05);
      ctx.quadraticCurveTo(poleLen - r * 0.4, -r * 0.55, poleLen - r * 0.05, -r * 0.05);
      ctx.quadraticCurveTo(poleLen - r * 0.4, -r * 0.35, poleLen - r * 0.75, -r * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 金色加固橫梃
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(poleLen - r * 0.6, 0);
      ctx.lineTo(poleLen - r * 0.5, -r * 0.42);
      ctx.stroke();

      ctx.restore();
  }

  // 換階段用的繪製物件（重用）
  const T = { x: 0, y: 0, face: 0, r: 0, def: null, phase: 1, state: 'mount', horseK: 0, pose: null, poseK: 0, inst: null };
  R.defineBossStyle('lubu', {
    body(ctx, o, t, args) { ctx.save(); ctx.lineWidth = 1; drawBody(ctx, o, t, Object.assign({}, args, { r: args.r * VIS })); ctx.restore(); },
    // 換階段「赤兔登場」：咆哮前高舉方天畫戟、赤兔由身後奔入漸顯（蹄印與塵浪由 phase2.transFx 的 warsteed 負責）；咆哮後即為騎乘外觀
    transition(ctx, b, t) {
      const at = b.roarAt || 0.6, before = b.stateT < at, k = U.clamp(b.stateT / at, 0, 1);
      T.x = b.x; T.y = b.y; T.face = b.face; T.r = b.r; T.def = b.def;
      T.phase = before ? 1 : 2; T.horseK = before ? k : 0; T.pose = before ? 'raise' : null; T.poseK = k;
      R.drawBossBody(ctx, T, t);
      return true;
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
