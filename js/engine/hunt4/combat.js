'use strict';
// 狩獵模式（4v1）戰鬥管線：獵人打 Boss 時套用部位肉質、銳利度、屬性、異常、傷口與集中弱點攻擊、怯 / 暈眩 / 倒地、部位破壞、疲勞。
// 由 mode.js 包住 w.damageBoss 呼叫 hit()；orig 是未包裝的原始 damageBoss（追加傷害走它，不會重複累積）。不碰 DOM / Canvas。
(function (G) {
  const BD = G.BD, U = BD.U, H4 = BD.HUNT4;
  const PART_ANG = { head: 0, legs: 1.35, body: 2.2, tail: Math.PI }; // 傷口標記的位置（相對面向）

  BD.defineStatus('h4fatigue', { name: '疲勞', tags: ['debuff'], stacking: 'refresh', modifiers: { speedMul: 0.8, dmgDealtMul: 0.85 } });

  function init(w, st) {
    const b = st.boss, ov = H4.BOSS_PARTS[b.def.id] || {};
    st.parts = H4.PARTS.map((P) => ({ id: P.id, name: P.name, front: P.front, el: P.el, hz: Object.assign({}, P.hz, ov.hz && ov.hz[P.id]),
      brkHp: P.brk * b.maxHp, brkAcc: 0, broken: false, woundAcc: 0, wound: 0, scarUntil: 0 }));
    st.weak = ov.weak || {};
    st.flinchAt = H4.FLINCH.at * b.maxHp; st.flinchAcc = 0; st.stunAt = H4.STUN.at * b.maxHp; st.stunAcc = 0;
    st.breaks = b.stats.breaks; st.topples = 0; st.flinches = 0;
    st.ail = {}; for (const k in H4.AILMENTS) st.ail[k] = { acc: 0, at: H4.AILMENTS[k].at, procs: 0 };
    st.poisonT = 0; st.poisonAcc = 0; st.poisonBy = null; st.asleep = false; st.fatigueAt = H4.FATIGUE.every;
  }

  const partAt = (st, b, src) => { const deg = Math.abs(U.angDiff(b.face, U.angTo(b, src))) * 180 / Math.PI; return st.parts.find((P) => deg <= P.front) || st.parts[st.parts.length - 1]; };
  const partPos = (b, P) => { const a = b.face + PART_ANG[P.id], d = b.r * (P.id === 'body' ? 0.35 : 0.8); return { x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d }; };
  function sharpBand(hs) {
    const r = hs.sharp / hs.spec.sharp, B = H4.SHARP.bands, i = B.findIndex((x) => r >= x.at);
    return Object.assign({ i: i < 0 ? B.length - 1 : i }, B[i < 0 ? B.length - 1 : i]);
  }
  const busy = (b) => b.state === 'transition' || b.state === 'dead';
  function cc(w, b, state, dur, text, color) { // Boss 硬直類：直接切狀態（打斷出招）
    if (busy(b)) return false;
    b.setState(state, dur); w.fx.text(b.x, b.y - b.r - 34, text, color, 24); return true;
  }
  function flinch(w, st, b, dur) {
    if (b.state === 'knockdown' || b.state === 'stun' || !cc(w, b, 'stagger', dur, '怯！', '#ffd0a0')) return;
    st.flinches++;
  }

  function pop(w, st, h, b, P, orig) { // 集中弱點攻擊打破傷口
    const W = H4.WOUND, at = partPos(b, P);
    P.wound = 0; P.scarUntil = w.time + W.scar; h.stats.h4.pops++;
    orig(h, b, { dmg: W.popDmg, posture: W.popPosture, unblockable: true, noPerfect: true, ignoreIframe: true });
    w.fx.text(at.x, at.y - 20, '傷口破壞！', '#ff4a5a', 26); w.fx.ring(at.x, at.y, 8, 90, 0.45, '#ff3344', 6);
    w.log(h, `打破了${P.name}部的傷口`);
    flinch(w, st, b, H4.FLINCH.dur + 0.3);
    BD.H4Gear.onPop(w, st, h, P, orig);
  }

  function ailment(w, st, h, b, id, orig) {
    const A = H4.AILMENTS[id], s = st.ail[id];
    if (busy(b)) return;
    s.acc = 0; s.at += A.grow; s.procs++; h.stats.h4.procs++;
    w.log(h, `${A.name}！`, true);
    if (id === 'poison') { st.poisonT = A.dur; st.poisonBy = h; w.fx.text(b.x, b.y - b.r - 34, '中毒！', A.color, 24); }
    else if (id === 'paralysis') cc(w, b, 'stun', A.dur, '麻痺！', A.color);
    else if (id === 'sleep') { if (cc(w, b, 'stun', A.dur, '睡眠…', A.color)) st.asleep = true; }
    else if (id === 'blast') {
      orig(h, b, { dmg: A.dmg + A.hp * b.maxHp, posture: 25, unblockable: true, noPerfect: true, ignoreIframe: true });
      w.fx.text(b.x, b.y - b.r - 34, '爆破！', A.color, 26); w.fx.ring(b.x, b.y, 10, b.r + 70, 0.4, A.color, 7);
    }
  }

  // 獵人（含其投射物）打中 Boss
  function hit(w, st, h, src, b, p, orig) {
    const P = partAt(st, b, src), hs = h.h4, spec = hs.spec, mod = hs.mod, S = H4.SHARP;
    const hz = P.hz[spec.dtype] + (P.wound ? H4.WOUND.hz : 0) + (P.broken ? 0.05 : 0);
    let mul = p.fixed ? 1 : hz / 0.5, bounce = false; // fixed：砲擊等固定傷害，不吃肉質 / 銳利度 / 屬性
    if (!p.fixed) BD.H4Brain.partHit(h, P.id, mul);
    mul *= BD.H4Gear.atkMul(w, st, h, P, hz);
    if (hs.D && hs.D.hitMul) mul *= hs.D.hitMul(h, p); // 武器自己的倍率（弓：適正距離）
    if (spec.sharp && src === h && !p.fixed) { const band = sharpBand(hs), eye = BD.H4Gear.fx(h, 'eye'); mul *= band.mul; bounce = band.i >= S.bounceFrom && hz < S.bounceHz && eye < 3; if (bounce) mul *= 0.6 + 0.13 * eye; } // 心眼
    if (st.asleep && p.dmg >= 20) mul *= H4.AILMENTS.sleep.wakeMul;
    let dmg = p.dmg * mul;
    if (mod.el && !p.fixed) dmg += mod.elv * BD.H4Gear.elMul(h, mod.el) * (st.weak[mod.el] != null ? st.weak[mod.el] : 1) * P.el;
    const kb = (p.dtype || spec.dtype) === 'blunt' && p.kb >= H4.HEAVY_KB ? p.kb : 0;
    const pm = BD.H4Gear.postureMul(h), hp0 = b.hp, r = orig(src, b, Object.assign({}, p, pm === 1 ? { dmg, kb } : { dmg, kb, posture: (p.posture != null ? p.posture : dmg * 0.25) * pm })); // 破城：架勢預設同 world.damageBoss
    const dealt = hp0 - b.hp;
    if (dealt <= 0) return r;
    if (st.asleep) { st.asleep = false; if (b.state === 'stun') b.setState('idle', 0); w.fx.text(b.x, b.y - b.r - 34, '驚醒！', '#8fb8ff', 22); }
    if (spec.sharp && src === h) {
      hs.sharp = Math.max(0, hs.sharp - (hz < S.bounceHz ? S.hardCost : 1) * BD.H4Gear.sharpCost(h));
      if (bounce && h.state === 'skill') { h.setState('recover', 0.35); w.fx.text(h.x, h.y - h.r - 24, '被彈開', '#cccccc', 16); }
    }
    BD.H4Gear.onHit(w, st, h, dealt, orig);
    if (hs.D && hs.D.onHit) hs.D.onHit(h, p, P, orig); // 武器命中後（弓：誘導箭標記、殘留觸發箭、引爆、量表）
    if (b.state === 'dead' || w.winner) return r;
    const ail = p.ail || mod.ail, sv = p.ail ? p.sv : mod.sv; // 命中參數帶的異常（弓的瓶）優先於武器本身
    for (const [k, v] of (ail ? [[ail, sv]] : []).concat(BD.H4Gear.coats(h).map((k) => [k, 6]))) { // 弓的瓶追加：每支箭另擲一次該異常
      if (w.rng() < H4.AILMENT_RATE) { const s = st.ail[k]; s.acc += v * BD.H4Gear.svMul(h, k); if (s.acc >= s.at) ailment(w, st, h, b, k, orig); }
    }
    // 傷口：打出來 / 集中弱點攻擊打破（打到哪都會破最近的傷口——集中模式代表瞄準）
    if (!P.wound && w.time >= P.scarUntil && (P.woundAcc += dealt * BD.H4Gear.mul(h, 'wound')) >= H4.WOUND.at * b.maxHp) {
      P.wound = w.time; P.woundAcc = 0; const at = partPos(b, P);
      w.fx.text(at.x, at.y - 16, `${P.name}部傷口`, '#ff7a7a', 18);
    }
    if (p.focus) { const W = P.wound ? P : st.parts.find((x) => x.wound); if (W) pop(w, st, h, b, W, orig); }
    if (P.brkHp && !P.broken && (P.brkAcc += dealt * BD.H4Gear.mul(h, 'brk')) >= P.brkHp) {
      P.broken = true; h.stats.h4.breaks++; const at = partPos(b, P);
      w.fx.text(at.x, at.y - 24, `${P.name}部位破壞！`, '#ffe27a', 26); w.log(h, `破壞了 ${b.name} 的${P.name}部`, true);
      flinch(w, st, b, H4.FLINCH.dur + 0.5);
    }
    if ((st.flinchAcc += dealt) >= st.flinchAt) { st.flinchAcc = 0; st.flinchAt *= H4.FLINCH.grow; flinch(w, st, b, H4.FLINCH.dur); }
    if (spec.dtype === 'blunt' && P.id === 'head' && (st.stunAcc += dealt * BD.H4Gear.mul(h, 'ko')) >= st.stunAt) {
      st.stunAcc = 0; st.stunAt *= H4.STUN.grow; if (cc(w, b, 'stun', H4.STUN.dur, '暈眩！', '#ffe27a')) w.log(h, '把 ' + b.name + ' 打暈了！', true);
    }
    return r;
  }

  function tick(w, st, dt, orig) {
    const b = st.boss;
    if (b.state === 'dead' || w.winner) return;
    for (const P of st.parts) if (P.wound && w.time - P.wound > H4.WOUND.life) P.wound = 0;
    if (st.asleep && b.state !== 'stun') st.asleep = false;
    if (st.poisonT > 0) {
      st.poisonT -= dt; st.poisonAcc += dt;
      if (st.poisonAcc >= 1) { st.poisonAcc -= 1; orig(st.poisonBy, b, { dmg: H4.AILMENTS.poison.dps * b.maxHp * (st.poisonBy && st.poisonBy.h4 ? BD.H4Gear.mul(st.poisonBy, 'poison') : 1), dot: true, posture: 0, unblockable: true, ignoreIframe: true }); }
    }
    // 倒地：架勢崩潰改成長時間倒地，之後架勢上限提高
    if (b.stats.breaks > st.breaks) {
      st.breaks = b.stats.breaks;
      if (!busy(b)) { BD.applyStatus(b, 'knockdown', { dur: H4.TOPPLE.dur }, w); st.topples++; b.maxPosture *= H4.TOPPLE.grow; w.log(b, '倒地！全員輸出！', true); }
    }
    if (w.time >= st.fatigueAt) {
      st.fatigueAt += H4.FATIGUE.every + H4.FATIGUE.dur;
      BD.applyStatus(b, 'h4fatigue', { dur: H4.FATIGUE.dur }, w); w.fx.text(b.x, b.y - b.r - 34, '疲勞（流口水）', '#cfc8a8', 20); w.log(b, '累了，動作變慢');
    }
  }

  BD.H4Combat = { init, hit, tick, partPos, sharpBand };
})(typeof window !== 'undefined' ? window : globalThis);
