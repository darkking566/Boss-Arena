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
  BD.defineStatus('h4def', { name: '防禦強化', tags: ['buff'], stacking: 'refresh', modifiers: { dmgTakenMul: 0.9 } });
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
  BD.defineStatus('h4red', { name: '紅精華', tags: ['buff'], stacking: 'refresh', modifiers: { dmgDealtMul: 1.1 } }); // 操蟲棍
  BD.defineStatus('h4white', { name: '白精華', tags: ['buff'], stacking: 'refresh', modifiers: { speedMul: 1.15 } });
  BD.defineStatus('h4orange', { name: '橙精華', tags: ['buff'], stacking: 'refresh', modifiers: { dmgTakenMul: 0.8 } });
  const EXTRACT_NAME = { red: '紅精華', white: '白精華', orange: '橙精華' };
  // 變形武器：招式開始時切到該招的形態（AI 備援挑到另一形態的招 = 順勢變形）
  const startOnce = (h) => { const i = h.inst; if (!i || i.h4done) return null; i.h4done = true; if (i.skill.mode) h.h4.drv.mode = i.skill.mode; return i.skill.id; };
  const gotDealt = (s, h) => { const g = h.stats.dealt - s.dealt; s.dealt = h.stats.dealt; return g; }; // 這幀自己打出的傷害
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
    // 斬擊斧：斧回槽 → 槽夠就變形成劍（耗槽、命中累積解放槽）→ 解放（劍傷害提高、慢慢掉）→ Boss 有破綻放零距離屬性解放突擊；槽見底變回斧
    switchaxe: {
      init: () => ({ mode: 'axe', gauge: 100, amp: 0, amped: false, dealt: 0 }),
      choose(h, d) {
        const s = h.h4.drv, S = H4.SWITCH;
        if (s.mode === 'axe') {
          if (d > 165) return pick(h, d, 'sa_lunge');
          if (s.gauge >= S.morphAt && (open(h) || rng(h)() < 0.3 + 0.5 * h.def.persona.risk)) return pick(h, d, 'sa_morph');
          return pick(h, d, 'sa_axe1');
        }
        if (s.gauge < S.lowAt) return pick(h, d, 'sa_morph_axe');
        if (s.amped && open(h)) { const z = pick(h, d, 'sa_zsd'); if (z) return z; }
        return pick(h, d, 'sa_sw1') || false; // 劍形態沒有突進招：走過去，不讓備援挑斧招變回斧
      },
      next(h, d) {
        const s = h.h4.drv, S = H4.SWITCH, id = h.lastSkillId;
        if (threatIn(h) < 0.35 || !keepGoing(h, 0.55 + 0.3 * h.def.persona.risk)) return null;
        if (s.mode === 'axe') return pick(h, d, { sa_axe1: 'sa_axe2', sa_lunge: 'sa_axe2', sa_morph_axe: 'sa_axe2', sa_axe2: s.gauge < 60 ? 'sa_wild' : 'sa_morph', sa_wild: 'sa_morph' }[id] || '');
        if (s.gauge < S.lowAt) return pick(h, d, 'sa_morph_axe');
        if (s.amped && open(h) && id !== 'sa_zsd') { const z = pick(h, d, 'sa_zsd'); if (z) return z; }
        return pick(h, d, { sa_morph: 'sa_sw2', sa_sw1: 'sa_sw2', sa_sw2: 'sa_sw3', sa_sw3: 'sa_sw1' }[id] || '');
      },
      tick(h, dt) {
        const s = h.h4.drv, S = H4.SWITCH, id = startOnce(h);
        if (id) {
          if (s.mode === 'sword') s.gauge = Math.max(0, s.gauge - S.swordCost); else s.gauge = Math.min(100, s.gauge + (id === 'sa_wild' ? S.wildGain : S.axeGain));
          if (id === 'sa_zsd') { s.amped = false; s.amp = 0; }
        }
        if (s.mode === 'sword' && gotDealt(s, h) > 0 && !s.amped && (s.amp += S.ampPerHit) >= 100) { s.amped = true; s.amp = 100; h.world.fx.text(h.x, h.y - h.r - 24, '屬性解放！', '#ff7aff', 18); }
        else gotDealt(s, h);
        if (s.amped && (s.amp -= S.ampDrain * dt) <= 0) { s.amped = false; s.amp = 0; }
        h.dmgMul = h.hunt.baseDmg * (s.amped && s.mode === 'sword' ? S.ampDmg : 1);
      },
      gauge: (h) => { const s = h.h4.drv; return { v: s.amped ? s.amp / 100 : s.gauge / 100, color: s.amped ? '#ff7aff' : s.mode === 'sword' ? '#8ad0ff' : '#c0a060' }; },
    },
    // 充能斧：劍命中攢能量 → 安全時裝瓶 → 有瓶就變斧放屬性解放斬 I → II → 大解放斬（有瓶且沒盾強化時順便盾強化）；瓶多又有破綻放超解；劍形態舉盾
    chargeblade: {
      init: () => ({ mode: 'sword', energy: 0, phials: 0, shieldUntil: 0, dealt: 0, counter: false, guardChip: null }),
      choose(h, d) {
        const s = h.h4.drv;
        if (s.energy >= 60 && s.phials < H4.CHARGE.maxPhials && threatIn(h) > 1) return kv(h, 'cb_charge');
        if (s.phials >= 3 && open(h)) { const x = pick(h, d, 'cb_saed'); if (x) return x; }
        if (s.phials >= (open(h) ? 1 : 2) && rng(h)() < (open(h) ? 1 : 0.4)) { const x = pick(h, d, 'cb_ed1'); if (x) return x; }
        return d > 150 ? pick(h, d, 'cb_s1') : pick(h, d, 'cb_s2');
      },
      next(h, d) {
        const s = h.h4.drv, id = h.lastSkillId;
        if (s.counter) { s.counter = false; return pick(h, d, s.phials ? 'cb_ed1' : 'cb_s3'); }
        if (s.mode === 'sword' && threatIn(h) < 0.35) return pick(h, null, 'cb_guard');
        if (threatIn(h) < 0.35 || !keepGoing(h, (s.mode === 'axe' ? 0.75 : 0.55) + 0.3 * h.def.persona.risk)) return null; // 解放斬連段比較捨不得斷
        const nx = { cb_s1: 'cb_s2', cb_s2: 'cb_s3', cb_s3: s.energy >= 60 ? 'cb_charge' : 'cb_s2', cb_ed1: 'cb_ed2', cb_ed2: 'cb_aed', cb_charge: s.phials ? 'cb_ed1' : '' }[id];
        return nx ? pick(h, nx === 'cb_charge' ? null : d, nx) : null;
      },
      react: (h) => (h.h4.drv.mode === 'sword' ? kv(h, 'cb_guard') : null),
      tick(h) {
        guardTick(h);
        const s = h.h4.drv, C = H4.CHARGE, w = h.world, i = h.inst, id = startOnce(h);
        if (id === 'cb_charge') { const n = Math.min(C.maxPhials - s.phials, Math.floor(s.energy / C.perPhial)); s.phials += n; s.energy = 0; w.fx.text(h.x, h.y - h.r - 24, '裝瓶 ×' + n, '#ffd08a', 16); }
        else if (id === 'cb_ed1' || id === 'cb_ed2' || id === 'cb_aed') s.phials = Math.max(0, s.phials - 1);
        if (i && i.skill.id === 'cb_aed' && !i.h4b && i.t >= 0.6) { // 大解放斬後：有瓶就盾強化
          i.h4b = true;
          if (s.phials > 0 && w.time >= s.shieldUntil) { s.phials--; s.shieldUntil = w.time + C.shieldDur; w.fx.text(h.x, h.y - h.r - 24, '盾強化', '#ffd34a', 18); }
        }
        if (i && i.skill.id === 'cb_saed' && !i.h4b && i.t >= 0.72) { // 超解：每瓶一次瓶爆（固定傷害）
          i.h4b = true; const b = h.enemy;
          if (U.dist(h, b) < 230 + b.r) for (let k = 0; k < s.phials; k++) w.damageBoss(h, b, { dmg: C.saedPhial, fixed: true, posture: 20, kb: 0, unblockable: true, noPerfect: true });
          if (s.phials) w.fx.text(b.x, b.y - b.r - 40, `瓶爆 ×${s.phials}`, '#ff9a3c', 22);
          s.phials = 0;
        }
        if (s.mode === 'sword' && gotDealt(s, h) > 0) s.energy = Math.min(100, s.energy + C.energyPerHit); else gotDealt(s, h);
        const sh = w.time < s.shieldUntil;
        s.guardChip = sh ? C.shieldChip : null; h.dmgMul = h.hunt.baseDmg * (sh && s.mode === 'axe' ? C.shieldDmg : 1);
      },
      gauge: (h) => { const s = h.h4.drv; return { v: s.phials / H4.CHARGE.maxPhials, color: h.world.time < s.shieldUntil ? '#ffd34a' : s.energy >= 60 ? '#ff6a3a' : '#c0a060' }; },
    },
    // 操蟲棍：缺精華且安全就放獵蟲（依序紅 → 白 → 橙）；三色齊全又有破綻放急襲突刺（消耗精華）；遠了跳躍接空中迴轉斬
    glaive: {
      init: () => ({ kinAt: 0 }),
      choose(h, d) {
        const s = h.h4.drv, miss = H4.KINSECT.order.find((c) => BD.statusRemaining(h, 'h4' + c) < 5);
        if (miss && threatIn(h) > 1 && h.world.time >= s.kinAt) return kv(h, 'ig_kinsect');
        if (!miss && open(h)) { const x = pick(h, d, 'ig_dive'); if (x) return x; }
        if (d > 160) return pick(h, d, 'ig_vault');
        return pick(h, d, BD.hasStatus(h, 'h4red') && rng(h)() < 0.4 ? 'ig_red' : 'ig_a1');
      },
      next(h, d) {
        if (threatIn(h) < 0.35 || !keepGoing(h, 0.55 + 0.3 * h.def.persona.risk)) return null;
        const red = BD.hasStatus(h, 'h4red');
        return pick(h, d, { ig_a1: 'ig_a2', ig_a2: red ? 'ig_red' : 'ig_a3', ig_a3: 'ig_a1', ig_vault: 'ig_air', ig_air: 'ig_a2', ig_red: 'ig_a3' }[h.lastSkillId] || '');
      },
      tick(h) {
        const s = h.h4.drv, w = h.world, id = startOnce(h);
        if (id === 'ig_kinsect') {
          const c = H4.KINSECT.order.find((x) => BD.statusRemaining(h, 'h4' + x) < 5);
          if (c) { BD.applyStatus(h, 'h4' + c, { dur: H4.KINSECT.dur }, w); w.fx.text(h.x, h.y - h.r - 24, EXTRACT_NAME[c], { red: '#ff6a5a', white: '#ffffff', orange: '#ffaa4a' }[c], 16); }
          s.kinAt = w.time + 2;
        } else if (id === 'ig_dive') for (const c of H4.KINSECT.order) BD.removeStatus(h, 'h4' + c, 'consume', w);
      },
      gauge: (h) => { const n = H4.KINSECT.order.filter((c) => BD.hasStatus(h, 'h4' + c)).length; return { v: n / 3, color: n === 3 ? '#ffe27a' : '#a0d0a0' }; },
    },
    // 弓：蓄力射擊 I → II → III → 剛射；強擊瓶用完找空檔換瓶；Boss 有破綻且冷卻好了放龍之一矢
    bow: {
      init: () => ({ coat: H4.BOW.coats, dragonAt: 0 }),
      choose(h, d) {
        const s = h.h4.drv;
        if (!s.coat && threatIn(h) > 1) return kv(h, 'bow_coat');
        if (open(h) && h.world.time >= s.dragonAt) { const x = pick(h, d, 'bow_dragon'); if (x) return x; }
        return pick(h, d, 'bow_s1');
      },
      next(h, d) {
        if (threatIn(h) < 0.35 || !keepGoing(h, 0.6 + 0.3 * h.def.persona.risk)) return null;
        return pick(h, d, { bow_s1: 'bow_s2', bow_s2: 'bow_s3', bow_s3: 'bow_volley', bow_coat: 'bow_s1' }[h.lastSkillId] || '');
      },
      tick(h) {
        const s = h.h4.drv, B = H4.BOW, w = h.world, id = startOnce(h);
        if (id === 'bow_coat') { s.coat = B.coats; w.fx.text(h.x, h.y - h.r - 24, '強擊瓶', '#ff8a6a', 16); }
        else if (id === 'bow_dragon') s.dragonAt = w.time + B.dragonCd;
        else if (id && s.coat) s.coat--;
        h.dmgMul = h.hunt.baseDmg * (s.coat ? B.coatDmg : 1); // shortcut: 塗料效果看「現在還有沒有瓶」，最後一瓶射出後還在飛的箭不加成
      },
      gauge: (h) => ({ v: h.h4.drv.coat / H4.BOW.coats, color: '#ff8a6a' }),
    },
    // 輕弩：三種彈各自計數；有破綻用速射、偶爾貫通彈、平常通常彈；打空了裝填（全部補滿）
    lightxbow: {
      init: () => Object.assign({}, H4.LBG.mag),
      choose(h, d) {
        const s = h.h4.drv;
        if (!s.n && (threatIn(h) > 0.8 || !s.p && !s.rapid)) return kv(h, 'lbg_reload');
        if (open(h) && s.rapid) { const x = pick(h, d, 'lbg_rapid'); if (x) return x; }
        if (s.p && (open(h) || rng(h)() < 0.3)) { const x = pick(h, d, 'lbg_p'); if (x) return x; }
        return s.n ? pick(h, d, 'lbg_n') : pick(h, d, s.p ? 'lbg_p' : 'lbg_rapid');
      },
      next(h, d) {
        const s = h.h4.drv;
        if (threatIn(h) < 0.35 || !keepGoing(h, 0.55 + 0.3 * h.def.persona.risk)) return null;
        return s.n ? pick(h, d, 'lbg_n') : null;
      },
      tick(h) {
        const s = h.h4.drv, id = startOnce(h);
        if (id === 'lbg_reload') { Object.assign(s, H4.LBG.mag); h.world.fx.text(h.x, h.y - h.r - 24, '裝填', '#cfe0ff', 16); }
        else if (id) { const k = { lbg_n: 'n', lbg_p: 'p', lbg_rapid: 'rapid' }[id]; if (k) s[k] = Math.max(0, s[k] - 1); }
      },
      gauge: (h) => ({ v: h.h4.drv.n / H4.LBG.mag.n, color: '#8ad0ff' }),
    },
    // 重弩：彈匣打空就裝填；有破綻放狙擊彈；安全時架設連射（減傷、不倒）
    heavyxbow: {
      init: () => ({ mag: H4.HBG.mag, snipeAt: 0, siegeAt: 0 }),
      choose(h, d) {
        const s = h.h4.drv, w = h.world;
        if (!s.mag) return kv(h, 'hbg_reload');
        if (open(h) && w.time >= s.snipeAt) { const x = pick(h, d, 'hbg_snipe'); if (x) return x; }
        if (w.time >= s.siegeAt && threatIn(h) > 1.5) { const x = pick(h, d, 'hbg_siege'); if (x) return x; }
        return pick(h, d, 'hbg_n');
      },
      next(h, d) {
        const s = h.h4.drv;
        if (!s.mag || threatIn(h) < 0.4 || !keepGoing(h, 0.5 + 0.3 * h.def.persona.risk)) return null;
        return pick(h, d, 'hbg_n');
      },
      tick(h) {
        const s = h.h4.drv, Hb = H4.HBG, w = h.world, id = startOnce(h);
        if (id === 'hbg_reload') { s.mag = Hb.mag; w.fx.text(h.x, h.y - h.r - 24, '裝填', '#cfe0ff', 16); }
        else if (id === 'hbg_n') s.mag = Math.max(0, s.mag - 1);
        else if (id === 'hbg_snipe') s.snipeAt = w.time + Hb.snipeCd;
        else if (id === 'hbg_siege') s.siegeAt = w.time + Hb.siegeCd; // 架設與狙擊用專用彈，不吃彈匣
      },
      gauge: (h) => ({ v: h.h4.drv.mag / H4.HBG.mag, color: '#c0a060' }),
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
    c.chooseSkill = (d, win) => { const r = hs.D && hs.D.choose(h, d, win), s = r === false ? null : r || c._choose0(d, win); return s && h.brain ? h.brain.gate(s, d) : s; }; // 驅動回 false＝這次不出招也不用備援；獵人大腦決定出手或等待
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
      if (!p.dot && p.dmg) p.dmg *= BD.H4Gear.takenMul(w, b) * (b.h4.spec.taken || 1); // 防具：耐震、守護靈光；遠程防具較薄
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
        const chip = b.h4.drv.guardChip != null ? b.h4.drv.guardChip : s.guard.chip != null ? s.guard.chip : G2.chip; // 驅動可臨時覆寫（充能斧盾強化）
        p.dmg *= b.sta > 0 ? chip : 0.6; p.kb = (p.kb || 0) * G2.kbMul; p.posture = (p.posture || 0) * 0.5; // 體力被削光＝防禦被破
        return null;
      }
      if (s.armor) { p.dmg *= 1 - s.armor; p.kb = 0; p.posture = (p.posture || 0) * 0.3; BD.applyStatus(b, 'kdGuard', { dur: 0.3 }, w); }
      return null;
    },
  });

  BD.H4Weapons = { DRIVERS, equip, step, open };
})(typeof window !== 'undefined' ? window : globalThis);
