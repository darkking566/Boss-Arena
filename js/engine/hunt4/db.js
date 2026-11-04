'use strict';
// 狩獵模式（4v1）雙刀驅動（荒野式）。資料與連招表在 js/data/hunt4/db.js。不碰 DOM / Canvas。
// 狀態：鬼人化（耗體力、命中累積鬼人槽）、鬼人強化（槽滿取得，可與鬼人化並存，槽隨時間流失）、鬼人身躱（精準迴避 → 藍色強化，限時）。
// 出招 = 照連招表 H4.DB_COMBOS 挑一套（獵人大腦依情境學哪套回報高），攻擊將至就鬼人迴避；精準迴避成功後直接挑「迴避後」連招。
// 亂舞 / 鬼人連斬靠招式旗標 dm 切換鬼人化（R2 派生）；集中亂舞【迴天】打破傷口 → 空中回轉亂舞・天 / 迴天穿刺。
(function (G) {
  const BD = G.BD, U = BD.U, H4 = BD.HUNT4, W = BD.H4Weapons, open = W.open;
  const DOWN = new Set(['stun', 'knockdown']);
  const kv = (h, id) => h.h4.kv[id];
  const ready = (h, s, d) => s && h.skillReady(s) && (d == null || d >= s.range[0] && d <= s.range[1] + h.enemy.r * 0.4) && (s.phase || 1) <= h.phase;
  function threatIn(h) { let m = Infinity; for (const th of h.controller.scanThreats()) if (!th.glow) m = Math.min(m, th.left); return m; }
  const keepGoing = (h, base) => h.world.rng() < (open(h) ? 0.95 : base);
  const sitOf = (h) => { const b = h.enemy; return DOWN.has(b.state) ? 'down' : open(h) ? 'open' : b.state === 'skill' ? 'atk' : Math.hypot(b.vx, b.vy) > 60 ? 'move' : 'idle'; };
  const stKey = (s) => (s.demon ? (s.arch ? 'da' : 'd') : s.arch ? 'a' : 'n');
  const say = (h, t, c, sz) => h.world.fx.text(h.x, h.y - h.r - 24, t, c, sz || 18);
  const dodgeSk = (h) => kv(h, h.h4.drv.boost > 0 ? 'db_dodge_b' : 'db_dodge');
  const GAP_TOK = new Set(['o1', 'jump', 'air', 'screw', 'dodge', 'side']); // 起手就能拉近距離的步驟
  const NO_CANCEL = new Set(['db_dodge', 'db_dodge_b', 'db_demon', 'db_heaven', 'db_drill']);

  // 連招步驟 → 招式 id；做不到（狀態 / 鬼人槽 / 體力不對）回 null，由 comboNext 跳過
  function tok(h, t) {
    const s = h.h4.drv, dm = s.demon, st = dm || s.arch, last = s.prev;
    const fromArch = last === 'db_ar1' || last === 'db_ar2'; // 鬼人連斬後 R2 可直接接亂舞
    let id = null;
    switch (t) {
      case 'a1': case 'a2': case 'a3': id = (dm ? 'db_d' : 'db_n') + t[1]; break;
      case 'o1': id = st ? 'db_dash' : 'db_lunge'; break;
      case 'o2': id = 'db_spin'; break;
      case 'o3': id = st ? 'db_spin2' : null; break;
      case 'up': id = 'db_up'; break;
      case 'side': id = dm ? 'db_side' : null; break;
      case 'ra1': id = dm ? 'db_ra1' : null; break;
      case 'ra2': case 'ra3': id = dm || fromArch ? 'db_' + t : null; break;
      case 'ar1': case 'ar2': id = s.arch ? 'db_' + t : null; break;
      case 'on': id = !dm && h.sta > h.maxSta * 0.35 ? 'db_demon' : null; break;
      case 'off': id = dm ? 'db_demon' : null; break;
      case 'dodge': id = dodgeSk(h).id; break;
      case 'screw': id = s.boost > 0 ? 'db_screw' : null; break;
      case 'jump': id = dm ? null : 'db_jump'; break;
      case 'air': id = dm ? 'db_air' : null; break;
      case 'airfin': id = last === 'db_air' ? 'db_airfin' : null; break;
    }
    const sk = id && kv(h, id);
    return sk && (!sk.gc || s.gauge >= sk.gc) ? id : null;
  }
  function comboNext(h, d) { // 連招下一步；做不到的步驟跳過（最多連跳 3 個），走完或卡住就結束
    const s = h.h4.drv, c = s.combo;
    for (let skip = 0; c && s.ci < c.seq.length && skip < 3; skip++) {
      const id = tok(h, c.seq[s.ci++]), sk = id && kv(h, id);
      if (ready(h, sk, sk && sk.tags.includes('defensive') ? null : d)) return sk;
    }
    s.combo = null; return null;
  }
  function ok(h, c, d, sit, after) {
    const s = h.h4.drv, n = c.need || {};
    if (!!c.after !== after || !c.when.includes(sit) || c.st && c.st !== stKey(s)) return false;
    const first = c.seq[0] === 'on' ? c.seq[1] : c.seq[0];
    return (!n.near || d < 240) && (!n.far || d > 230) && (n.far || GAP_TOK.has(first) || d <= 260)
      && s.gauge >= (n.g || 0) && s.gauge <= (n.gMax == null ? 100 : n.gMax) && (!n.arch || s.arch) && (!n.boost || s.boost > 0) && h.sta >= (n.sta || 0) && (!n.lowSta || h.sta < h.maxSta * 0.4);
  }
  function pickCombo(h, d, after) { // 依情境挑連招；獵人大腦記住每個情境下哪套回報高
    const s = h.h4.drv, sit = sitOf(h), rk = h.def.persona.risk - 0.5, list = H4.DB_COMBOS.filter((c) => ok(h, c, d, sit, after));
    if (!list.length) return null;
    const opts = list.map((c) => ({ id: c.id, name: c.name, prior: c.prior + (c.risk || 0) * rk })), key = `${after ? 'af' : sit}|${stKey(s)}|${d < 160 ? 'near' : d < 320 ? 'mid' : 'far'}`;
    const id = h.brain ? h.brain.pick('combo', key, opts) : opts.reduce((a, x) => (x.prior > a.prior ? x : a)).id;
    return list.find((c) => c.id === id);
  }
  function finisher(h) { // 集中亂舞【迴天】打破傷口後：還有別的傷口 → 空中回轉亂舞・天（沿路破壞），否則迴天穿刺（定點）
    const wounds = h.world.hunt4.parts.filter((p) => p.wound).length, w = wounds > 0;
    const opts = [{ id: 'db_heaven', name: '空中回轉亂舞・天', prior: w ? 0.7 : 0.45 }, { id: 'db_drill', name: '迴天穿刺', prior: w ? 0.4 : 0.65 }];
    const id = h.brain ? h.brain.pick('combo', 'fin|' + (w ? 'w' : '0'), opts) : opts.reduce((a, x) => (x.prior > a.prior ? x : a)).id;
    return kv(h, id);
  }
  function start(h, s, sk) { // 招式開始：切鬼人化、扣鬼人槽
    s.prev = sk.id;
    if (sk.id === 'db_demon') { s.demon = !s.demon; say(h, s.demon ? '鬼人化！' : '解除鬼人化', s.demon ? '#ff4a4a' : '#cccccc'); }
    else if (sk.dm != null && sk.dm !== s.demon) { s.demon = sk.dm; say(h, sk.dm ? '鬼人化' : '解除鬼人化', sk.dm ? '#ff4a4a' : '#cccccc', 14); }
    if (sk.gc) s.gauge = Math.max(0, s.gauge - sk.gc);
    if (/^db_ra/.test(sk.id)) s.stat.flurry++; else if (/^db_ar/.test(sk.id)) s.stat.weave++;
  }

  W.DRIVERS.db = {
    init: (h) => ({ cost0: Object.fromEntries(Object.values(h.h4.kv).filter((k) => /^db_/.test(k.id) && !k.evade && k.id !== 'db_demon').map((k) => [k.id, k.cost])), demon: false, arch: false, gauge: 0, dealt: 0, boost: 0, combo: null, ci: 0, after: false, prev: null, fp: 0, sp: h.stats.h4 ? h.stats.h4.pops : 0, elMod: null, elv: 0,
      stat: { perfect: 0, flurry: 0, weave: 0, finish: 0 } }),
    choose(h, d) {
      const s = h.h4.drv, c = pickCombo(h, d, false);
      if (!c) return null;
      s.combo = c; s.ci = 0;
      return comboNext(h, d);
    },
    next(h, d) {
      const s = h.h4.drv, id = h.lastSkillId, last = kv(h, id);
      if (id === 'h4_focus_db') { s.combo = null; if (h.stats.h4.pops > s.fp) { s.stat.finish++; return finisher(h); } return null; }
      if (id === 'db_heaven' || id === 'db_drill') { s.combo = null; return null; }
      if ((s.combo || s.after) && threatIn(h) < 0.18 && !(last && last.evade)) return dodgeSk(h); // 攻擊將至：迴避，連招之後接著打
      if (s.after) { // 精準迴避成功：直接挑「迴避後」連招（不經 keepGoing）
        s.after = false;
        const c = pickCombo(h, d, true);
        if (c) { s.combo = c; s.ci = 0; return comboNext(h, d); }
      }
      if (!s.combo) return null;
      if (!keepGoing(h, 0.85 + 0.1 * h.def.persona.risk)) { s.combo = null; return null; }
      return comboNext(h, d);
    },
    react: (h) => dodgeSk(h),
    tick(h, dt) {
      const s = h.h4.drv, D = H4.DEMON, B = D.boost, i = h.inst;
      if (i && !i.h4done) { i.h4done = true; start(h, s, i.skill); }
      if (i && i.skill.id === 'h4_focus_db' && !i.fpSet) { i.fpSet = true; s.fp = h.stats.h4.pops; s.combo = null; s.after = false; }
      const got = h.stats.dealt - s.dealt; s.dealt = h.stats.dealt;
      if (s.demon) {
        h.sta -= D.drain * dt; h.staDelay = Math.max(h.staDelay, 0.2);
        if (got > 0 && i && i.skill.gg !== 0 && /^db_/.test(i.skill.id)) s.gauge = Math.min(100, s.gauge + D.gaugePerHit * (i.skill.gg || 1));
        if (s.gauge >= 100 && !s.arch) { s.arch = true; say(h, '鬼人強化', '#ffd34a'); }
        if (h.sta <= h.maxSta * D.exitAt) { s.demon = false; say(h, '體力見底・解除鬼人化', '#cccccc', 14); s.combo = null; }
      } else if (!s.arch) s.gauge = Math.max(0, s.gauge - D.idleDrain * dt);
      if (s.arch && (s.gauge -= D.archDrain * dt) <= 0) { s.arch = false; s.gauge = 0; }
      if (h.stats.h4.pops > s.sp) { h.sta = Math.min(h.maxSta, h.sta + D.popSta * (h.stats.h4.pops - s.sp)); s.sp = h.stats.h4.pops; say(h, '耐力回復', '#7dffb0', 14); } // 集中亂舞打破傷口回耐力
      if (s.boost > 0 && (s.boost -= dt) <= 0) { s.boost = 0; say(h, '鬼人身躱結束', '#9ab8ff', 14); }
      const m = h.h4.mod; // 鬼人身躱：屬性傷害 ×1.3（物理 ×1.15 走 dmgMul）
      if (s.boost > 0 && m && m.el && !s.elMod) { s.elMod = m; s.elv = m.elv; m.elv = m.elv * B.el; }
      else if (s.boost <= 0 && s.elMod) { s.elMod.elv = s.elv; s.elMod = null; }
      h.dmgMul = h.hunt.baseDmg * (s.demon ? D.dmgMul : 1) * (s.boost > 0 ? B.atk : 1);
      for (const id in s.cost0) kv(h, id).cost = s.cost0[id] * (s.demon ? D.costMul : 1); // 鬼人化：攻擊的體力消耗減半以上（持續耗體力已另算）
      const dc = s.demon || s.arch ? D.dodgeCost : 14; // 鬼人迴避：體力更省
      kv(h, 'db_dodge').cost = kv(h, 'db_dodge_b').cost = dc; h.def.dodgeCost = dc + 2;
      // 收招中攻擊將至：取消收招改迴避（荒野的攻擊 → × 派生）
      if (i && !NO_CANCEL.has(i.skill.id) && /^db_/.test(i.skill.id) && h.skillPhase() === 'recovery' && h.sta >= dc && threatIn(h) < 0.15) { h.comboCancel(); h.startSkill(dodgeSk(h), { quiet: true }); }
    },
    onEvade(h, perfect) { // 鬼人迴避躲過攻擊；perfect＝迴避開頭（精準迴避）：鬼人身躱、接「迴避後」連招
      const s = h.h4.drv, B = H4.DEMON.boost, i = h.inst, w = h.world;
      if (!perfect || i.discerned) { if (!i.evaded) { i.evaded = true; w.fx.text(h.x, h.y - h.r - 14, '閃避', '#ccffdd', 14); } return; }
      i.discerned = true; s.stat.perfect++; h.stats.perfect++;
      s.boost = s.boost > 0 ? Math.min(B.cap, s.boost + B.ext) : B.dur; s.after = true; s.combo = null;
      w.fx.text(h.x, h.y - h.r - 30, '精準迴避・鬼人身躱！', '#6ab0ff', 20); w.log(h, '精準迴避（鬼人身躱）');
      w.slowmo = Math.max(w.slowmo, 0.15); BD.spawnFx(w, 'parry', h.x, h.y, { src: h });
    },
    gauge: (h) => { const s = h.h4.drv; return { v: s.gauge / 100, color: s.boost > 0 ? '#4aa8ff' : s.demon ? '#ff4a4a' : s.arch ? '#ffd34a' : '#a06060' }; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
