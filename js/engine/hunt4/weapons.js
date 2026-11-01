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
  BD.defineStatus('h4atk', { name: '攻擊強化', tags: ['buff'], stacking: 'refresh', modifiers: { dmgDealtMul: 1.1 } }); // 狩獵笛旋律
  BD.defineStatus('h4def', { name: '防禦強化', tags: ['buff'], stacking: 'refresh', modifiers: { dmgTakenMul: 0.85 } });
  // 狩獵笛：最近 3 個音符 → 旋律（同色兩個以上；紅藍綠各一 = 全音）；目標旋律依隊伍狀況決定
  const NOTE = { horn_l: 'A', horn_dash: 'A', horn_r: 'B', horn_back: 'C' }, NOTE_SK = { A: 'horn_l', B: 'horn_r', C: 'horn_back' }, MEL_NOTE = { atk: 'A', def: 'B', heal: 'C' };
  const MEL_NAME = { atk: '攻擊強化', def: '防禦強化', heal: '回復', all: '全音・回復與體力' };
  function melody(ns) {
    const c = (x) => ns.filter((n) => n === x).length;
    return c('A') >= 2 ? 'atk' : c('B') >= 2 ? 'def' : c('C') >= 2 ? 'heal' : ns.length === 3 ? 'all' : null;
  }
  const allies = (h) => h.world.hunt4.hunters.filter((x) => x.state !== 'dead' && U.dist(x, h) < H4.HORN.range);
  function hornTarget(h) {
    const al = allies(h);
    if (al.some((x) => x.hp < x.maxHp * (0.4 + 0.3 * h.def.persona.care))) return 'heal';
    const need = (id) => al.filter((x) => BD.statusRemaining(x, id) < 8).length >= Math.ceil(al.length / 2);
    return need('h4atk') ? 'atk' : need('h4def') ? 'def' : 'atk';
  }
  function perform(h, mel) {
    const w = h.world, Hn = H4.HORN;
    for (const x of allies(h)) {
      if (mel === 'atk' || mel === 'def') BD.applyStatus(x, mel === 'atk' ? 'h4atk' : 'h4def', { dur: Hn.dur }, w);
      else { x.hp = Math.min(x.maxHp, x.hp + x.maxHp * (mel === 'heal' ? Hn.heal : Hn.allHeal)); if (mel === 'all') x.sta = x.maxSta; }
    }
    w.fx.text(h.x, h.y - h.r - 30, '♪ ' + MEL_NAME[mel], '#c8f0ff', 20); w.fx.ring(h.x, h.y, 20, Hn.range, 0.6, '#c8f0ff', 4); w.log(h, '演奏：' + MEL_NAME[mel]);
  }
  // 槍系：防禦 → 完美防禦（或長槍的一般防禦）立刻收盾接反擊；攻擊將至時舉盾
  const guardTick = (h) => { if (h.h4.drv.counter && h.inst && h.inst.skill.guard) h.comboCancel(); };

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
    // 大錘：蓄力 I → II → III（打頭疊暈眩）；遠了用蓄力迴轉接近；蓄力中攻擊將至 → 相殺上撈（成功直接接 II）
    hammer: {
      init: () => ({ lvl: 0 }),
      choose(h, d) {
        const s = h.h4.drv;
        if (d > 180) { const sp = pick(h, d, 'ham_spin'); if (sp) return sp; }
        if (open(h) || rng(h)() < 0.4 + 0.3 * h.def.persona.patience * (h.controller.punishWindow() > 0.4 ? 1 : 0)) { s.lvl = 1; return pick(h, d, 'ham_c1'); }
        return rng(h)() < 0.6 ? pick(h, d, 'ham_side') : null;
      },
      next(h, d) {
        const s = h.h4.drv, id = h.lastSkillId, p = h.def.persona;
        if (id === 'ham_offset') { s.lvl = 2; return pick(h, d, 'ham_c2'); }
        if ((id === 'ham_side' || id === 'ham_spin') && rng(h)() < 0.5) { s.lvl = 1; return pick(h, d, 'ham_c1'); }
        if (!s.lvl || id === 'ham_c3') { s.lvl = 0; return null; }
        const nxt = s.lvl === 1 ? 'ham_c2' : 'ham_c3', sk = kv(h, nxt);
        if (threatIn(h) < sk.v1.windup + 0.15) return pick(h, d, 'ham_offset');
        if (!keepGoing(h, 0.4 + 0.5 * p.risk)) { s.lvl = 0; return null; }
        s.lvl++; return pick(h, d, nxt);
      },
      react: (h) => (h.h4.drv.lvl && U.dist(h, h.enemy) < 220 ? kv(h, 'ham_offset') : null),
      tick(h) { if (h.h4.drv.lvl && h.state !== 'skill' && h.world.time - h.lastSkillEnd > 1) h.h4.drv.lvl = 0; },
      gauge: (h) => ({ v: h.h4.drv.lvl / 3, color: ['#888', '#ffd08a', '#ffa040', '#ff5a2a'][h.h4.drv.lvl] }),
    },
    // 狩獵笛：照隊伍需要（有人低血 → 回復；增益快沒了 → 攻擊 / 防禦）挑音符；旋律成形且沒有威脅就演奏；Boss 有破綻放響玉
    horn: {
      init: () => ({ notes: [], echoAt: 0 }),
      choose(h, d) {
        const s = h.h4.drv, tgt = hornTarget(h), mel = melody(s.notes), safe = threatIn(h) > 0.8;
        if (mel && safe && (mel === tgt || s.notes.length === 3 && rng(h)() < 0.3)) { const pl = pick(h, null, 'horn_play'); if (pl) return pl; }
        if (open(h) && h.world.time >= s.echoAt) { const e = pick(h, d, 'horn_echo'); if (e) return e; }
        if (d > 160) return pick(h, d, 'horn_dash');
        return pick(h, d, NOTE_SK[MEL_NOTE[tgt]], 'horn_l');
      },
      next(h, d) {
        const s = h.h4.drv, id = h.lastSkillId;
        if (!NOTE[id] || threatIn(h) < 0.4 || !keepGoing(h, 0.5 + 0.3 * h.def.persona.risk)) return null;
        const tgt = hornTarget(h);
        return melody(s.notes) === tgt ? pick(h, null, 'horn_play') : pick(h, d, NOTE_SK[MEL_NOTE[tgt]]);
      },
      tick(h) {
        const s = h.h4.drv, i = h.inst;
        if (!i || i.h4done) return;
        const id = i.skill.id;
        if (NOTE[id]) { i.h4done = true; s.notes.push(NOTE[id]); if (s.notes.length > 3) s.notes.shift(); }
        else if (id === 'horn_play') { i.h4done = true; const mel = melody(s.notes); if (mel) perform(h, mel); s.notes = []; }
        else if (id === 'horn_echo') { i.h4done = true; s.echoAt = h.world.time + H4.HORN.echoCd; }
      },
      gauge: (h) => { const s = h.h4.drv, m = melody(s.notes); return { v: s.notes.length / 3, color: m ? { atk: '#ff6a5a', def: '#5a9aff', heal: '#6adf8a', all: '#ffffff' }[m] : '#888' }; },
    },
    // 長槍：遠了突進；三段突刺；攻擊將至就舉盾，擋下（不必完美）就反擊突刺
    lance: {
      init: () => ({ counter: false }),
      choose: (h, d) => (d > 220 ? pick(h, d, 'lance_charge') : pick(h, d, 'lance_p1')),
      next(h, d) {
        const s = h.h4.drv, id = h.lastSkillId;
        if (s.counter) { s.counter = false; return pick(h, null, 'lance_counter'); }
        if (threatIn(h) < 0.35) return pick(h, null, 'lance_guard');
        const chain = { lance_p1: 'lance_p2', lance_p2: 'lance_p3', lance_charge: 'lance_p1', lance_counter: 'lance_p2' };
        return chain[id] && keepGoing(h, 0.6 + 0.3 * h.def.persona.risk) ? pick(h, d, chain[id]) : null;
      },
      react: (h) => kv(h, 'lance_guard'),
      tick: guardTick,
      gauge: () => null,
    },
    // 銃槍：突刺 → 砲擊 → 上撈 → 砲擊 → 叩擊 →（滿彈）全彈發射；沒彈就找空檔裝填；Boss 倒地 / 暈眩時放龍擊砲（長冷卻）
    gunlance: {
      init: (h) => ({ counter: false, shells: h.h4.spec.shells, wfAt: 0 }),
      choose(h, d) {
        const s = h.h4.drv, w = h.world;
        if (s.shells === 0 && threatIn(h) > 1) return kv(h, 'gl_reload');
        if (w.time >= s.wfAt && (h.enemy.state === 'knockdown' || h.enemy.state === 'stun')) { const f = pick(h, d, 'gl_wf'); if (f) return f; }
        if (s.shells === h.h4.spec.shells && open(h)) { const b = pick(h, d, 'gl_slam'); if (b) return b; }
        if (d > 160) return pick(h, d, 'gl_lunge');
        return pick(h, d, 'gl_p1');
      },
      next(h, d) {
        const s = h.h4.drv, id = h.lastSkillId, full = s.shells === h.h4.spec.shells;
        if (s.counter) { s.counter = false; return pick(h, d, s.shells ? 'gl_shell' : 'gl_p2'); }
        if (threatIn(h) < 0.35) return pick(h, null, 'gl_guard');
        if (!keepGoing(h, 0.55 + 0.3 * h.def.persona.risk)) return null;
        const chain = { gl_lunge: 'gl_shell', gl_p1: 'gl_shell', gl_shell: 'gl_p2', gl_p2: 'gl_slam', gl_slam: full ? 'gl_burst' : 'gl_shell' }[id];
        return chain && (chain === 'gl_shell' ? s.shells > 0 : true) ? pick(h, d, chain) : chain === 'gl_shell' ? pick(h, d, 'gl_slam') : null;
      },
      react: (h) => kv(h, 'gl_guard'),
      tick(h) {
        guardTick(h);
        const s = h.h4.drv, i = h.inst;
        if (!i || i.h4done) return;
        const id = i.skill.id;
        if (id === 'gl_shell') { i.h4done = true; s.shells = Math.max(0, s.shells - 1); }
        else if (id === 'gl_burst') { i.h4done = true; s.shells = 0; }
        else if (id === 'gl_reload') { i.h4done = true; s.shells = h.h4.spec.shells; h.world.fx.text(h.x, h.y - h.r - 24, '裝填', '#e8f4ff', 16); }
        else if (id === 'gl_wf') { i.h4done = true; s.wfAt = h.world.time + h.h4.spec.wfCd; }
      },
      gauge: (h) => { const s = h.h4.drv; return { v: s.shells / h.h4.spec.shells, color: h.world.time >= s.wfAt ? '#ff8a3a' : '#c0c8d0' }; },
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
    c.chooseSkill = (d, win) => { const s = (hs.D && hs.D.choose(h, d, win)) || c._choose0(d, win); return s && h.brain ? h.brain.gate(s, d) : s; }; // 獵人大腦決定出手或等待
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
      if (!p.dot && p.dmg) p.dmg *= BD.H4Gear.takenMul(w, b); // 防具：耐震、守護靈光
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
        if (s.guard.block && b.sta > 0) b.h4.drv.counter = true; // 長槍：擋下就反擊
        p.dmg *= b.sta > 0 ? (s.guard.chip != null ? s.guard.chip : G2.chip) : 0.6; p.kb = (p.kb || 0) * G2.kbMul; p.posture = (p.posture || 0) * 0.5; // 體力被削光＝防禦被破
        return null;
      }
      if (s.armor) { p.dmg *= 1 - s.armor; p.kb = 0; p.posture = (p.posture || 0) * 0.3; BD.applyStatus(b, 'kdGuard', { dur: 0.3 }, w); }
      return null;
    },
  });

  BD.H4Weapons = { DRIVERS, equip, step, open };
})(typeof window !== 'undefined' ? window : globalThis);
