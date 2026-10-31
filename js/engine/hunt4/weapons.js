'use strict';
// 狩獵模式（4v1）武器驅動：AI 選招（choose）、招式結束後接下一招（next）、看到攻擊來時的反應招（react）、逐幀狀態（tick）、HUD 量表（gauge）。
// 另含 h4arms 特性：相殺 / 力量對抗、防禦 / 完美防禦、鐵壁（招式旗標見 js/data/hunt4/weapons.js）。不碰 DOM / Canvas。
(function (G) {
  const BD = G.BD, U = BD.U, H4 = BD.HUNT4;
  const OPEN = new Set(['stagger', 'stun', 'knockdown', 'whiff', 'recover']);
  const open = (h) => { const b = h.enemy; return OPEN.has(b.state) || b.state === 'idle' && b.stateT < 0.3; }; // Boss 有破綻
  const rng = (h) => h.world.rng;
  const kv = (h, id) => h.h4.kv[id];
  const ready = (h, s, d) => s && h.skillReady(s) && (d == null || d >= s.range[0] && d <= s.range[1] + h.enemy.r * 0.4) && (s.phase || 1) <= h.phase;
  const pick = (h, d, ...ids) => { for (const id of ids) { const s = kv(h, id); if (ready(h, s, d)) return s; } return null; };
  function threatIn(h) { // 最快到的威脅還有幾秒（沒有回傳 Infinity）
    let m = Infinity;
    for (const th of h.controller.scanThreats()) if (!th.glow) m = Math.min(m, th.left);
    return m;
  }
  const keepGoing = (h, base) => rng(h)() < (open(h) ? 0.95 : base); // 連段要不要接：Boss 有破綻幾乎必接

  const DRIVERS = {
    // 太刀：連斬 → 累積氣刃 → 氣刃斬到大回旋升練氣；紅刃時找破綻放氣刃兜割（降回白刃）
    katana: {
      choose(h, d) {
        const kt = h.hunt.kt;
        if (kt.level === 3 && open(h)) { const s = pick(h, d, 'k_helm'); if (s) return s; }
        if (h.spirit >= 40 && (kt.level < 3 || h.spirit >= h.maxSpirit * 0.9)) return pick(h, d, 'k_s1');
        return rng(h)() < 0.7 ? pick(h, d, 'k_a1') : null;
      },
      next(h, d) {
        const id = h.lastSkillId, A = ['k_a1', 'k_a2', 'k_a3', 'k_a4', 'k_a5'], S = ['k_s1', 'k_s2', 'k_s3', 'k_spin'];
        const p = h.def.persona, i = A.indexOf(id), j = S.indexOf(id);
        if (i >= 0 && i < A.length - 1 && keepGoing(h, 0.5 + 0.3 * p.risk)) return h.spirit >= 60 && rng(h)() < 0.4 ? pick(h, d, 'k_s1') : pick(h, d, A[i + 1]);
        if (j >= 0 && j < S.length - 1) return pick(h, d, S[j + 1]);
        return null;
      },
      react: (h) => h.pick(0), // 彈刀
      tick(h) {
        const i = h.inst;
        if (i && i.skill.id === 'k_helm' && !i.h4done && i.landed) { i.h4done = true; BD.katanaLevel(h, 1); }
      },
      gauge: (h) => ({ v: h.spirit / h.maxSpirit, color: ['#c8a0ff', '#ffffff', '#ffe27a', '#ff5a4a'][h.hunt.kt.level] }),
    },
    // 大劍：蓄力 I → 強蓄力 → 真蓄力；連段中看到攻擊來就鐵壁衝撞（減傷 + 相殺）保住段數
    gs: {
      init: (h) => ({ lvl: 0 }),
      choose(h, d) {
        const s = h.h4.drv;
        if (open(h) || rng(h)() < 0.25 + 0.3 * h.def.persona.patience * (h.controller.punishWindow() > 0.5 ? 1 : 0)) { s.lvl = 1; return pick(h, d, 'gs_c1'); }
        return rng(h)() < 0.5 ? pick(h, d, 'gs_wide') : null;
      },
      next(h, d) {
        const s = h.h4.drv, id = h.lastSkillId, p = h.def.persona;
        if (id === 'gs_wide' && rng(h)() < 0.35) { s.lvl = 1; return pick(h, d, 'gs_c1'); }
        if (!s.lvl || id === 'gs_true') { s.lvl = 0; return null; }
        const nxt = s.lvl === 1 ? 'gs_c2' : 'gs_true', sk = kv(h, nxt);
        if (threatIn(h) < sk.v1.windup + 0.2) return pick(h, d, 'gs_tackle'); // 會被打斷 → 先衝撞硬吃
        if (!keepGoing(h, 0.3 + 0.5 * p.risk)) { s.lvl = 0; return null; }
        s.lvl++; return pick(h, d, nxt);
      },
      react: (h) => (h.h4.drv.lvl ? kv(h, 'gs_tackle') : null),
      tick(h) { if (h.h4.drv.lvl && h.state !== 'skill' && h.world.time - h.lastSkillEnd > 1) h.h4.drv.lvl = 0; }, // 連段斷了就歸零
      gauge: (h) => ({ v: h.h4.drv.lvl / 3, color: ['#888', '#ffd08a', '#ffa040', '#ff5a2a'][h.h4.drv.lvl] }),
    },
    // 雙刀：鬼人化耗體力、命中累積鬼人槽；體力見底解除，槽滿進入鬼人強化（亂舞耗槽）
    db: {
      init: (h) => ({ demon: false, arch: false, gauge: 0, dealt: 0 }),
      choose(h, d) {
        const s = h.h4.drv, p = h.def.persona;
        if (!s.demon && h.sta > h.maxSta * (0.95 - 0.3 * p.risk)) return kv(h, 'db_demon');
        if ((s.demon || s.arch && s.gauge >= H4.DEMON.flurryCost) && open(h) && h.sta > 30) { const f = pick(h, d, 'db_flurry'); if (f) return f; }
        if (d > 140) return pick(h, d, 'db_dash');
        return pick(h, d, s.demon ? 'db_d1' : 'db_a1');
      },
      next(h, d) {
        const s = h.h4.drv, id = h.lastSkillId, p = h.def.persona;
        if (threatIn(h) < 0.35 || !keepGoing(h, 0.5 + 0.4 * p.risk)) return null;
        const chain = s.demon ? { db_d1: 'db_d2', db_d2: 'db_flurry', db_dash: 'db_d1', db_flurry: 'db_d1' } : { db_a1: 'db_a2', db_a2: 'db_a3', db_dash: 'db_a1' };
        return chain[id] ? pick(h, d, chain[id], s.demon ? 'db_d1' : 'db_a1') : null;
      },
      tick(h, dt) {
        const s = h.h4.drv, D = H4.DEMON, i = h.inst;
        if (i && i.skill.id === 'db_demon' && !i.h4done) { i.h4done = true; s.demon = !s.demon; if (s.demon) h.world.fx.text(h.x, h.y - h.r - 24, '鬼人化！', '#ff4a4a', 18); }
        if (i && i.skill.id === 'db_flurry' && !i.h4done && !s.demon) { i.h4done = true; s.gauge -= D.flurryCost; }
        const got = h.stats.dealt - s.dealt; s.dealt = h.stats.dealt;
        if (s.demon) {
          h.sta -= D.drain * dt; h.staDelay = Math.max(h.staDelay, 0.2);
          if (got > 0) s.gauge = Math.min(100, s.gauge + D.gaugePerHit);
          if (h.sta <= h.maxSta * D.exitAt) { s.demon = false; if (s.gauge >= 100) { s.arch = true; h.world.fx.text(h.x, h.y - h.r - 24, '鬼人強化', '#ffd34a', 18); } }
        } else if (s.arch && (s.gauge -= D.archDrain * dt) <= 0) { s.arch = false; s.gauge = 0; }
        h.dmgMul = h.hunt.baseDmg * (s.demon ? D.dmgMul : 1); h.def.dodgeCost = s.demon || s.arch ? 10 : 20; // 鬼人迴避：翻滾更省體力
      },
      gauge: (h) => { const s = h.h4.drv; return { v: s.gauge / 100, color: s.demon ? '#ff4a4a' : s.arch ? '#ffd34a' : '#a06060' }; },
    },
    // 片手劍：連斬 → 迴旋斬、對頭盾擊、破綻時完美突進、遠了跳躍斬；攻擊來時舉盾（完美防禦 → 反擊）
    sns: {
      init: (h) => ({ counter: false }),
      choose(h, d) {
        const b = h.enemy, front = Math.abs(U.angDiff(b.face, U.angTo(b, h))) < 0.8;
        if (open(h) && h.sta > 40) { const s = pick(h, d, 'sns_rush'); if (s) return s; }
        if (front && rng(h)() < 0.5) { const s = pick(h, d, 'sns_bash'); if (s) return s; }
        if (d > 140) return pick(h, d, 'sns_jump');
        return pick(h, d, 'sns_a1');
      },
      next(h, d) {
        const s = h.h4.drv, id = h.lastSkillId;
        if (s.counter) { s.counter = false; return pick(h, null, 'sns_counter'); }
        if (threatIn(h) < 0.3) return pick(h, null, 'sns_guard');
        const chain = { sns_a1: 'sns_a2', sns_a2: 'sns_a3', sns_jump: 'sns_a2', sns_counter: 'sns_a3', sns_a3: 'sns_bash' };
        return chain[id] && keepGoing(h, 0.55 + 0.3 * h.def.persona.risk) ? pick(h, d, chain[id]) : null;
      },
      react: (h) => kv(h, 'sns_guard'),
      tick(h) { if (h.h4.drv.counter && h.inst && h.inst.skill.guard) h.comboCancel(); }, // 完美防禦：立刻收盾，由 next 接反擊
      gauge: () => null,
    },
  };

  // 武器上手：建招式表、掛驅動（choose 包住 AI 的 chooseSkill；react 給 agentize）
  function equip(h) {
    const hs = h.h4, D = DRIVERS[h.def.weapon], spec = hs.spec, c = h.controller;
    hs.kv = {};
    for (const s of h.skills) hs.kv[s.id] = s;
    for (const id in h.def.variants || {}) hs.kv[id] = BD.prepSkill(h.def.variants[id]);
    for (const id in spec.extra || {}) hs.kv[id] = BD.prepSkill(spec.extra[id]);
    hs.focus = spec.focus ? BD.prepSkill(spec.focus) : null;
    hs.D = D || null; hs.drv = D && D.init ? D.init(h) : {};
    if (!c._choose0) c._choose0 = c.chooseSkill.bind(c);
    c.chooseSkill = (d, win) => (hs.D && hs.D.choose(h, d, win)) || c._choose0(d, win);
    if (D && D.react) h.react = () => D.react(h); else delete h.react;
  }
  // 招式剛結束 → 問驅動要不要接下一招（每次結束只問一次）
  function step(h, dt) {
    const hs = h.h4, D = hs.D;
    if (!D) return;
    if (D.tick) D.tick(h, dt);
    if (h.lastSkillEnd === hs.chainSeen || !h.canAct() || h.world.time - h.lastSkillEnd > 0.1) return;
    hs.chainSeen = h.lastSkillEnd;
    const s = D.next && D.next(h, U.dist(h, h.enemy) - h.enemy.r * 0.4);
    if (s) h.startSkill(s, { quiet: true });
  }

  // ── 相殺 / 力量對抗 / 防禦 / 鐵壁 ──
  function clash(w, h, boss) {
    const C = H4.CLASH;
    h.setState('recover', C.lock); boss.setState('stagger', C.lock); h.stats.h4.clashes++;
    w.fx.text((h.x + boss.x) / 2, (h.y + boss.y) / 2 - 40, '力量對抗！', '#ffe27a', 26); w.log(h, '與 ' + boss.name + ' 力量對抗！', true);
    w.later(C.lock, () => {
      if (w.winner || h.state === 'dead') return;
      const p = h.def.persona, chance = C.win + 0.25 * (p.risk - 0.5) + 0.2 * (h.sta / h.maxSta - 0.5);
      if (w.rng() < chance) { BD.applyStatus(boss, 'knockdown', { dur: C.topple }, w); w.log(h, '力量對抗勝利！', true); }
      else { w.damageBoss(boss, h, { dmg: 40, kb: 600, posture: 30, unblockable: true, noPerfect: true }); w.log(boss, '把 ' + h.name + ' 彈飛'); }
    });
  }
  BD.defineTrait('h4arms', {
    interceptDamage(w, b, src, p) {
      const i = b.inst, boss = src && (src.isBoss ? src : null);
      if (!i || !src || p.dot) return null;
      const s = i.skill;
      if (s.offset && boss && !p.unblockable && i.t >= s.offset[0] && i.t <= s.offset[1]) {
        b.stats.h4.offsets++; w.hitstop = Math.max(w.hitstop, 0.09); BD.spawnFx(w, 'parry', b.x, b.y, { src: b });
        if (p.dmg >= H4.CLASH.dmg && boss.state === 'skill') clash(w, b, boss);
        else { w.fx.text(b.x, b.y - b.r - 30, '相殺！', '#ffffff', 24); if (boss.state !== 'transition') boss.setState('stagger', 0.6); boss.posture += 40; w.checkPostureBreak(boss); }
        return 'deflected';
      }
      if (s.guard && !p.unblockable) {
        if (i.t <= s.guard.perfect) {
          b.stats.h4.pguards++; b.h4.drv.counter = true; w.hitstop = Math.max(w.hitstop, 0.07); BD.spawnFx(w, 'parry', b.x, b.y, { src: b });
          w.fx.text(b.x, b.y - b.r - 30, '完美防禦！', '#9fe8ff', 22); if (boss) { boss.posture += 30; w.checkPostureBreak(boss); }
          return 'deflected';
        }
        const G2 = H4.GUARD; b.sta = Math.max(0, b.sta - p.dmg * G2.staPerDmg);
        p.dmg *= b.sta > 0 ? G2.chip : 0.6; p.kb = (p.kb || 0) * G2.kbMul; p.posture = (p.posture || 0) * 0.5; // 體力被削光＝防禦被破
        return null;
      }
      if (s.armor) { p.dmg *= 1 - s.armor; p.kb = 0; p.posture = (p.posture || 0) * 0.3; BD.applyStatus(b, 'kdGuard', { dur: 0.3 }, w); }
      return null;
    },
  });

  BD.H4Weapons = { DRIVERS, equip, step, open };
})(typeof window !== 'undefined' ? window : globalThis);
