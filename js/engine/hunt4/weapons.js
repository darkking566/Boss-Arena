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
  const DOWN = new Set(['stun', 'knockdown']), HELM_MUL = [1, 1, 1.25, 1.5]; // 太刀：Boss 倒地才捨得用低階兜割；兜割威力隨練氣等級
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
  // ── 弓 ──
  // 蓄力段數：射擊連射 I→II→III、長按蓄力直接到 III；III 再射一發掉回 II，蓄力墊步升一階、在 III 時保住（hot）；decay 秒沒動作歸零。誘導箭期間射擊一律視同 III。
  // 特殊箭量表 0~3：長按蓄力、箭命中慢慢回，看破迴避大量回；裝瓶 / 誘導箭各耗 1。
  const BOW_SHOTS = new Set(['bow_s1', 'bow_s2', 'bow_s3', 'bow_c2', 'bow_c3', 'bow_quick', 'bow_p1', 'bow_p2', 'bow_p3', 'bow_v1', 'bow_v2', 'bow_v3', 'bow_tracer']); // 收招可取消墊步的招
  const bowSit = (h) => { const b = h.enemy; return DOWN.has(b.state) ? 'down' : open(h) ? 'open' : b.state === 'skill' ? 'atk' : Math.hypot(b.vx, b.vy) > 60 ? 'move' : 'idle'; };
  function bowOk(h, c, d, sit) {
    const s = h.h4.drv, n = c.need || {};
    return c.when.includes(sit) && (!n.near || d < 300) && s.trick >= (n.trick || 0) && (!n.noTracer || !s.tracer) && (!n.tracer || s.tracer) && (!n.coatless || s.coatN <= 0) && (!n.det || s.tracer || s.marks) && (!n.lowSta || h.sta < 35);
  }
  function bowTok(h, tok) { // 連招步驟 → 招式 id（依目前段數 / 量表）
    const s = h.h4.drv, L = s.tracer ? 3 : s.lvl;
    if (tok === 'shot') return L >= 3 ? (s.hot || s.tracer ? 'bow_s3' : 'bow_s2') : 'bow_s' + (L + 1);
    if (tok === 'charge') return L >= 2 ? bowTok(h, 'shot') : 'bow_c3';
    if (tok === 'power' || tok === 'volley' || tok === 'swallow') return { power: 'bow_p', volley: 'bow_v', swallow: 'bow_sw' }[tok] + Math.max(1, L);
    if (tok === 'tracer') return s.trick >= 1 && !s.tracer ? 'bow_tracer' : null;
    if (tok === 'load') return s.trick >= 1 ? 'bow_load' : null;
    return 'bow_' + tok;
  }
  function comboNext(h, d, tok) { // 連招下一步（tok：步驟 → 招式 id）；做不到的步驟跳過（最多連跳 3 個），走完或卡住就結束
    const s = h.h4.drv, c = s.combo;
    for (let skip = 0; s.ci < c.seq.length && skip < 3; skip++) {
      const id = tok(h, c.seq[s.ci++]), sk = id && kv(h, id);
      if (ready(h, sk, sk && sk.tags.includes('defensive') ? null : d)) return sk;
    }
    s.combo = null; return null;
  }
  function bowCoat(h) { // 選瓶：獵人大腦依 Boss 學哪種瓶划算；先驗＝Boss 還沒中過的控場異常優先、體型大用貫通、愛冒險用接擊
    const s = h.h4.drv, B = H4.BOW, st = h.world.hunt4, p = h.def.persona, fresh = (a) => !st.ail[a].procs && !s.used[B.coatList.find((c) => B.coatFx[c].ail === a)];
    const PRI = { power: 0.6, close: 0.45 + 0.4 * (p.risk - 0.5), pierce: h.enemy.r >= 60 ? 0.65 : 0.35, para: fresh('paralysis') ? 0.75 : 0.25, sleep: fresh('sleep') ? 0.6 : 0.2,
      poison: st.poisonT > 0 ? 0.2 : 0.45, blast: 0.45, exhaust: 0.4 };
    const opts = B.coatList.map((c) => ({ id: c, name: B.coatFx[c].name, prior: PRI[c] }));
    return h.brain ? h.brain.pick('coat', h.enemy.def.id, opts) : opts.reduce((a, x) => (x.prior > a.prior ? x : a)).id;
  }
  function bowStart(h, s, id) { // 招式開始：段數、量表、瓶
    const B = H4.BOW, w = h.world;
    s.lastAct = w.time;
    if (/^bow_[sc]\d$/.test(id)) { s.lvl = +id.slice(-1); s.hot = false; if (id[4] === 'c') s.trick = Math.min(B.trickMax, s.trick + B.gain[id.slice(4)]); }
    else if (id === 'bow_quick') s.lvl = Math.max(s.lvl, 1);
    else if (id === 'bow_step') { if (s.lvl) { s.lvl = Math.min(3, s.lvl + 1); s.hot = s.lvl === 3; } } // 沒建立蓄力時墊步不升階
    else if (id.startsWith('bow_sw')) s.hot = false; // 飛燕射擊不保留 III
    else if (id === 'bow_dragon' || id === 'bow_thousand') { s.lvl = 0; s.hot = false; }
    else if (id === 'bow_tracer') s.trick = Math.max(0, s.trick - 1);
    else if (id === 'bow_load') {
      s.trick = Math.max(0, s.trick - 1); s.coat = bowCoat(h); s.coatN = B.coatShots; s.used[s.coat] = true; s.stat.loads++;
      w.fx.text(h.x, h.y - h.r - 24, B.coatFx[s.coat].name, B.coatFx[s.coat].color, 16);
    }
  }
  function bowDetonate(h, orig, text) { // 引爆誘導箭（基礎 + 追蹤箭命中數加成）與殘留觸發箭
    const s = h.h4.drv, B = H4.BOW, b = h.enemy, w = h.world;
    const dmg = (s.tracer ? B.tracer.det + B.tracer.perHit * Math.min(s.tracer.hits, B.tracer.maxHits) : 0) + s.marks * B.mark.det;
    s.tracer = null; s.marks = 0;
    if (!dmg || b.state === 'dead' || w.winner) return;
    s.stat.dets++;
    orig(h, b, { dmg, posture: dmg * 0.3, unblockable: true, noPerfect: true, ignoreIframe: true });
    w.fx.text(b.x, b.y - b.r - 50, `${text} ${Math.round(dmg)}`, '#7dffe0', 22); w.fx.ring(b.x, b.y, 10, b.r + 60, 0.4, '#7dffe0', 6);
  }
  // 曲射：箭射上天，flight 秒後落在目標附近（照目標移動預判一點）；落在 Boss 身上的箭造成傷害並留下殘留觸發箭（mark）
  BD.defineAction('h4arc', (w, b, inst, a) => {
    const t = b.enemy, cx = t.x + (t.vx || 0) * a.flight * 0.5, cy = t.y + (t.vy || 0) * a.flight * 0.5;
    for (let k = 0; k < a.n; k++) {
      const an = w.rng() * U.TAU, rr = Math.sqrt(w.rng()) * a.scatter, x = cx + Math.cos(an) * rr, y = cy + Math.sin(an) * rr, fl = a.flight + k * 0.04;
      w.lobs.push({ x0: x - 90, y0: y - 520, x1: x, y1: y, t: 0, dur: fl, kind: 'h4arrow', sky: true });
      w.later(fl, () => {
        if (w.winner || b.state === 'dead' || t.state === 'dead') return;
        if (Math.hypot(t.x - x, t.y - y) < t.r + 8) w.damageBoss(b, t, { dmg: a.dmg, posture: a.posture, kb: 0, mark: true });
        BD.spawnFx(w, 'projhit', x, y, { el: 'physical' });
      });
    }
  }, { active: true });

  // ── 輕弩：招式 id＝lbg_<動作>_<彈種>；速射系動作只在速射模式、普通系只在普通模式 ──
  const LBG_RE = /^lbg_(shot|chase|rapid|rchase|burst|reload)_([nps])$/, LBG_CANCEL = /^lbg_(shot|chase|rapid|rchase)_/;
  const LBG_RAPID = new Set(['rapid', 'rchase', 'burst']);
  const brainPick = (h, kind, opts) => (h.brain ? h.brain.pick(kind, h.enemy.def.id, opts) : opts.reduce((a, x) => (x.prior > a.prior ? x : a)).id);
  function lbgArm(h, s) { // 第一次用到時決定主力彈與特殊彈（獵人大腦依 Boss 學）：大體型偏貫通、愛冒險偏散彈 / 起爆龍彈
    if (s.am) return;
    const rk = h.def.persona.risk - 0.5;
    s.am = brainPick(h, 'ammo', [{ id: 'n', name: '通常彈', prior: 0.55 }, { id: 'p', name: '貫通彈', prior: h.enemy.def.radius >= 34 ? 0.6 : 0.35 }, { id: 's', name: '散彈', prior: 0.35 + 0.5 * rk }]);
    s.spType = brainPick(h, 'special', [{ id: 'adh', name: '附著龍彈', prior: 0.6 }, { id: 'wyv', name: '起爆龍彈', prior: 0.45 + 0.3 * rk }]);
    h.controller.p.prefRange = H4.LBG.pref[s.am].slice(); // 站位跟著主力彈的適正距離（散彈要貼近）
  }
  function lbgOk(h, c, d, sit) {
    const s = h.h4.drv, L = H4.LBG, n = c.need || {};
    return c.when.includes(sit) && (c.mode === 'r') === s.rapid && s.en >= (n.en || 0) && (!n.lowEn || s.en < L.en.early) && (!n.magLow || s.mag[s.am] <= 1)
      && (!n.sp || s.sp >= 1) && (!n.spType || s.spType === n.spType) && (!n.near || d < 350);
  }
  function lbgTok(h, tok) { // 連招步驟 → 招式 id；彈匣空時需要彈的步驟改成裝填（速射模式＝墊步裝填）
    const s = h.h4.drv, am = s.am, L = H4.LBG, empty = s.mag[am] <= 0;
    if (tok === 'on') return !s.rapid && s.en >= L.en.on ? 'lbg_mode' : null;
    if (tok === 'off') return s.rapid ? 'lbg_mode' : null;
    if (tok === 'step' || tok === 'slide') return 'lbg_' + tok;
    if (tok === 'special') return s.sp >= 1 ? 'lbg_' + s.spType : null;
    if (tok === 'reload') return s.mag[am] >= L.mag[am] ? null : s.rapid ? (empty ? 'lbg_sreload' : null) : 'lbg_reload_' + am;
    if (empty) return s.rapid ? 'lbg_sreload' : 'lbg_reload_' + am;
    if (LBG_RAPID.has(tok) !== s.rapid || s.rapid && s.en <= 0) return null;
    return `lbg_${tok}_${am}`;
  }
  function lbgDodge(h) { // 迴避：速射模式有彈有能量＝速射墊步射擊、彈匣空＝墊步裝填，否則射擊後墊步
    const s = h.h4.drv;
    if (s.rapid && s.am) return kv(h, s.mag[s.am] <= 0 ? 'lbg_sreload' : s.en > 0 ? 'lbg_burst_' + s.am : 'lbg_step');
    return kv(h, 'lbg_step');
  }
  function lbgStart(h, s, id) { // 招式開始：扣彈、扣能量、切模式、裝填、特殊彈 / 集中攻擊彈存量
    const L = H4.LBG, w = h.world, m = LBG_RE.exec(id), say = (t, c) => w.fx.text(h.x, h.y - h.r - 24, t, c, 16);
    if (m) {
      const [, act, am] = m;
      if (act === 'reload') { s.mag[am] = L.mag[am]; say('裝填', '#cfe0ff'); return; }
      s.mag[am] = Math.max(0, s.mag[am] - 1);
      if (LBG_RAPID.has(act)) { s.en = Math.max(0, s.en - L.en.cost[am]); s.stat.rapid++; } else if (act === 'chase') s.stat.chase++;
    } else if (id === 'lbg_mode') { s.rapid = !s.rapid; say(s.rapid ? '速射模式' : '普通模式', s.rapid ? '#ff9a3c' : '#8ad0ff'); }
    else if (id === 'lbg_sreload') { s.mag[s.am] = L.mag[s.am]; s.stat.sreload++; say('墊步裝填', '#cfe0ff'); }
    else if (id === 'lbg_adh' || id === 'lbg_wyv') {
      s.sp = Math.max(0, s.sp - 1);
      if (id === 'lbg_wyv') { const a = U.angTo(h, h.enemy); s.wyv = { x: h.x + Math.cos(a) * 120, y: h.y + Math.sin(a) * 120, until: w.time + L.sp.wyv.life, n: L.sp.wyv.n, cd: 0 }; s.stat.wyv++; } // 設在前方地面（腳下會被自己剛射出的彈引爆）
    } else if (id === 'h4_focus_lbg' || id === 'lbg_focus1' || id === 'lbg_focus2') s.fs = Math.max(0, s.fs - 1);
  }
  function lbgAdhBoom(h, orig) { // 附著龍彈引爆：依同部位命中數決定階段 → 連續斬擊 → 爆炸，回速射能量
    const s = h.h4.drv, A = H4.LBG.sp.adh, w = h.world, b = h.enemy, a = s.adh, alive = () => b.state !== 'dead' && !w.winner;
    s.adh = null;
    if (!a || !alive()) return;
    const lv = A.need.filter((x) => a.pts >= x).length - 1, n = A.slash[lv], P = { unblockable: true, noPerfect: true, ignoreIframe: true, kb: 0 };
    for (let k = 0; k < n; k++) w.later(k * 0.04, () => { if (alive()) orig(h, b, Object.assign({ dmg: A.slashDmg, posture: 3 }, P)); });
    w.later(n * 0.04 + 0.1, () => {
      if (!alive()) return;
      orig(h, b, Object.assign({ dmg: A.boom, posture: 30 }, P)); s.en = Math.min(H4.LBG.en.max, s.en + A.gain);
      w.fx.text(b.x, b.y - b.r - 50, `附著龍彈 ${['I', 'II', 'III'][lv]}`, '#ffb84a', 22); w.fx.ring(b.x, b.y, 10, b.r + 50, 0.4, '#ffb84a', 6);
    });
  }
  function lbgWyv(h, s, w, orig) { // 起爆龍彈：Boss 踩到、被自己的彈打中、或時間到就爆；可爆 n 次，範圍內的 Boss 受傷
    const W = H4.LBG.sp.wyv, d = s.wyv, b = h.enemy;
    let trig = w.time >= d.until || U.dist(d, b) < b.r + 20;
    if (!trig) for (const p of w.projectiles) if (p.owner === h && Math.hypot(p.x - d.x, p.y - d.y) < W.trig) { trig = true; break; }
    if (!trig || w.time < d.cd) return;
    d.cd = w.time + W.cd; d.n--;
    if (U.dist(d, b) < W.r + b.r && b.state !== 'dead' && !w.winner) orig(h, b, { dmg: W.dmg, posture: 35, kb: 0, unblockable: true, noPerfect: true, ignoreIframe: true });
    w.fx.ring(d.x, d.y, 10, W.r, 0.35, '#ff9a3c', 6);
    if (d.n <= 0 || w.time >= d.until) s.wyv = null;
  }

  const DRIVERS = {
    // 太刀：連斬 → 累積氣刃 → 氣刃斬到大回旋升練氣；見切反擊命中接大回旋；紅刃見破綻（或 Boss 倒地時白 / 黃刃）放兜割，紅刃兜割再接無雙斬
    katana: {
      choose(h, d) {
        const kt = h.hunt.kt;
        if (kt.level >= (DOWN.has(h.enemy.state) ? 1 : 3) && open(h)) { const s = pick(h, d, 'k_helm'); if (s) return s; }
        if (h.spirit >= 40 && (kt.level < 3 || h.spirit >= h.maxSpirit * 0.9)) return pick(h, d, 'k_s1');
        return rng(h)() < 0.7 ? pick(h, d, 'k_a1') : null;
      },
      next(h, d) {
        const id = h.lastSkillId, A = ['k_a1', 'k_a2', 'k_a3', 'k_a4', 'k_a5'], S = ['k_s1', 'k_s2', 'k_s3', 'k_spin'];
        const p = h.def.persona, i = A.indexOf(id), j = S.indexOf(id);
        if (id === 'riposte' && h.hunt.kt.mikiri) return pick(h, d, 'k_spin');
        if (id === 'k_helm' && h.h4.drv.musou) { h.h4.drv.musou = false; return pick(h, d, 'k_musou'); }
        if (i >= 0 && i < A.length - 1 && keepGoing(h, 0.5 + 0.3 * p.risk)) return h.spirit >= 60 && rng(h)() < 0.4 ? pick(h, d, 'k_s1') : pick(h, d, A[i + 1]);
        if (j >= 0 && j < S.length - 1) return pick(h, d, S[j + 1]);
        return null;
      },
      react: (h) => h.pick(0), // 彈刀
      tick(h) {
        const i = h.inst, kt = h.hunt.kt, id = i && i.skill.id, M = BD.katanaMul;
        if (id === 'k_helm' || id === 'k_musou') {
          if (!i.h4done) { i.h4done = true; i.lv = kt.level; if (id === 'k_helm') h.h4.drv.musou = false; } // 起手時的練氣等級決定威力
          if (i.landed && !i.paid) { i.paid = true; BD.katanaLevel(h, i.lv - 1); if (id === 'k_helm' && i.lv === 3) h.h4.drv.musou = true; } // 命中才消耗一階
          h.dmgMul = h.hunt.baseDmg * M[i.lv] * (id === 'k_helm' ? HELM_MUL[i.lv] : 1); kt.boost = true;
        } else if (kt.boost) { kt.boost = false; h.dmgMul = h.hunt.baseDmg * M[kt.level]; }
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
    // 弓（荒野式）：照連招表 H4.BOW_COMBOS 出招，獵人大腦依情境學哪套回報高（見 bowCombo）；攻擊將至就蓄力墊步（收招中也能取消），躲在開頭＝看破迴避
    bow: {
      init: () => ({ lvl: 0, hot: false, lastAct: -9, trick: 1, coat: null, coatN: 0, used: {}, tracer: null, marks: 0, marksUntil: 0, combo: null, ci: 0, pops: 0,
        stat: { discern: 0, tracers: 0, dets: 0, loads: 0 } }),
      choose(h, d) {
        const s = h.h4.drv, sit = bowSit(h), rk = h.def.persona.risk - 0.5, list = H4.BOW_COMBOS.filter((c) => bowOk(h, c, d, sit));
        if (!list.length) return null;
        const opts = list.map((c) => ({ id: c.id, name: c.name, prior: c.prior + (c.risk || 0) * rk })), key = `${sit}|${s.trick >= 1 ? 'g' : 'n'}|${d < 300 ? 'near' : 'mid'}`;
        const id = h.brain ? h.brain.pick('combo', key, opts) : opts[0].id;
        s.combo = list.find((c) => c.id === id); s.ci = 0;
        return comboNext(h, d, bowTok);
      },
      next(h, d) {
        const s = h.h4.drv;
        if (h.lastSkillId === 'h4_focus_bow') { s.combo = null; return h.stats.h4.pops > s.pops ? pick(h, null, 'bow_focus_dragon') : null; } // 集中射擊打破傷口 → 追加強化龍之一矢
        if (!s.combo) return null;
        if (threatIn(h) < 0.18 && h.lastSkillId !== 'bow_step') return pick(h, null, 'bow_step'); // 攻擊將至：墊步，連招之後接著打
        if (s.combo !== H4.BOW_DISCERN && !keepGoing(h, 0.85 + 0.1 * h.def.persona.risk)) { s.combo = null; return null; }
        return comboNext(h, d, bowTok);
      },
      react: (h) => kv(h, 'bow_step'),
      tick(h) {
        const s = h.h4.drv, B = H4.BOW, w = h.world, i = h.inst, id = startOnce(h);
        if (id) bowStart(h, s, id);
        if (i && i.skill.id.startsWith('bow_sw')) h.face = U.angTo(h, h.enemy); // 飛燕射擊：跳躍中一直對著 Boss 射（招式的追蹤只在起手）
        if (i && i.skill.id === 'h4_focus_bow' && i.pops == null) { i.pops = s.pops = h.stats.h4.pops; s.combo = null; }
        // 收招中攻擊將至：取消收招墊步（荒野的射擊 → × 派生）
        if (i && BOW_SHOTS.has(i.skill.id) && h.skillPhase() === 'recovery' && h.sta >= kv(h, 'bow_step').cost && threatIn(h) < 0.15) { h.comboCancel(); h.startSkill(kv(h, 'bow_step'), { quiet: true }); }
        if (h.state !== 'skill' && w.time - s.lastAct > B.decay) { s.lvl = 0; s.hot = false; }
        if (s.tracer && w.time >= s.tracer.until) bowDetonate(h, w.hunt4.orig, '誘導箭爆炸');
        if (s.marks && w.time >= s.marksUntil) s.marks = 0;
        h.dmgMul = h.hunt.baseDmg;
      },
      onProj(h, p) { // 剛射出的箭：套用瓶（每招只扣一次）、誘導箭期間追蹤並加長射程
        const s = h.h4.drv, i = h.inst, B = H4.BOW;
        if (p.kind !== 'arrow') return;
        p.band = [B.band.near, B.band.far];
        if (s.coat && i && (i.coated || s.coatN > 0)) {
          if (!i.coated) { i.coated = true; s.coatN--; }
          const c = B.coatFx[s.coat];
          p.coat = s.coat; p.dmg *= c.dmg || 1; p.posture *= c.posture || 1;
          if (c.band) p.band = c.band.slice();
          if (c.pierce) { p.pierce = true; p.rehit = c.rehit; }
          if (c.ail) p.extra = Object.assign({ ail: c.ail, sv: c.sv }, p.extra);
        }
        if (s.tracer) { p.traced = true; p.homing = Math.max(p.homing, B.tracer.home); p.band[1] += B.tracer.reach; p.life += B.tracer.reach / Math.hypot(p.vx, p.vy); }
      },
      hitMul(h, p) { // 適正距離：箭飛行距離在範圍內才是全傷害
        const q = p.proj;
        if (!q || !q.band) return 1;
        const td = q.t * Math.hypot(q.vx, q.vy);
        return td >= q.band[0] && td <= q.band[1] ? 1 : H4.BOW.band.lo;
      },
      onHit(h, p, P, orig) {
        const s = h.h4.drv, B = H4.BOW, w = h.world;
        if (p.proj && p.proj.kind === 'arrow') s.trick = Math.min(B.trickMax, s.trick + B.gain.hit);
        if (p.tracer) { s.tracer = { until: w.time + B.tracer.dur, part: P.id, hits: 0 }; s.stat.tracers++; w.fx.text(h.enemy.x, h.enemy.y - h.enemy.r - 40, '誘導箭', '#7dffe0', 18); }
        else if (s.tracer && p.proj && p.proj.traced) s.tracer.hits++;
        if (p.mark) { s.marks = Math.min(B.mark.max, s.marks + 1); s.marksUntil = w.time + B.mark.dur; }
        if (p.det && (s.tracer || s.marks)) bowDetonate(h, orig, '引爆！');
      },
      onEvade(h, perfect) { // 墊步 / 飛燕射擊躲過攻擊；perfect＝蓄力墊步開頭（看破迴避）：回體力、量表，接看破反擊
        const s = h.h4.drv, B = H4.BOW, w = h.world, i = h.inst;
        if (!perfect || i.discerned) { if (!i.evaded) { i.evaded = true; w.fx.text(h.x, h.y - h.r - 14, '閃避', '#ccffdd', 14); } return; }
        i.discerned = true; s.stat.discern++; h.stats.perfect++;
        const prec = i.t <= B.gain.preciseT; // 越貼近完美時機回越多
        s.trick = Math.min(B.trickMax, s.trick + (prec ? B.gain.perfect : B.gain.discern)); h.sta = Math.min(h.maxSta, h.sta + B.discernSta);
        if (s.lvl < 3) s.lvl = Math.max(2, s.lvl + 1); s.hot = s.lvl === 3;
        s.combo = H4.BOW_DISCERN; s.ci = 0;
        w.fx.text(h.x, h.y - h.r - 30, prec ? '看破迴避・精準！' : '看破迴避！', '#7dffe0', 20); w.log(h, '看破迴避');
        w.slowmo = Math.max(w.slowmo, 0.15); BD.spawnFx(w, 'parry', h.x, h.y, { src: h });
      },
      gauge: (h) => { const s = h.h4.drv; return { v: s.trick / H4.BOW.trickMax, color: s.coatN > 0 ? H4.BOW.coatFx[s.coat].color : s.tracer ? '#7dffe0' : '#a0a0a0' }; },
    },
    // 輕弩（荒野式）：普通模式射擊 / 追擊射擊回速射能量 → 切速射模式消耗能量（速射 / 速射追擊 / 速射墊步射擊）→ 能量低提早收手，耗盡強制解除有硬直。
    //   彈匣每種彈各自、裝填只補當前彈；速射模式彈匣空＝墊步裝填。特殊彈（附著 / 起爆龍彈）約 100 秒一發；集中攻擊彈 3 發各 35 秒回。連招表 H4.LBG_COMBOS 由獵人大腦學
    lightxbow: {
      init: (h) => ({ am: null, spType: null, rapid: false, en: 50, mag: Object.assign({}, H4.LBG.mag), sp: H4.LBG.sp.max, fs: H4.LBG.focus.max, adh: null, wyv: null,
        combo: null, ci: 0, pops: h.stats.h4 ? h.stats.h4.pops : 0, stat: { rapid: 0, exits: 0, chase: 0, sreload: 0, adh: 0, wyv: 0 } }),
      choose(h, d) {
        const s = h.h4.drv, sit = bowSit(h), rk = h.def.persona.risk - 0.5;
        lbgArm(h, s);
        const main = kv(h, 'lbg_shot_' + s.am);
        if (d > main.range[1] + h.enemy.r * 0.4) return false; // 主力彈打不到：先走近（回 null 會退回預設選招、亂打通常彈）
        const list = H4.LBG_COMBOS.filter((c) => lbgOk(h, c, d, sit));
        if (!list.length) return false;
        const opts = list.map((c) => ({ id: c.id, name: c.name, prior: c.prior + (c.risk || 0) * rk })), key = `${sit}|${s.rapid ? 'r' : 'n'}|${s.am}`;
        const id = h.brain ? h.brain.pick('combo', key, opts) : opts[0].id;
        s.combo = list.find((c) => c.id === id); s.ci = 0;
        return comboNext(h, d, lbgTok) || false;
      },
      next(h, d) {
        const s = h.h4.drv, last = kv(h, h.lastSkillId);
        if (!s.combo) return null;
        if (threatIn(h) < 0.18 && !(last && last.evade)) return lbgDodge(h); // 攻擊將至：墊步，連招之後接著打
        if (s.rapid && s.en < H4.LBG.en.early && rng(h)() > h.def.persona.risk * 0.6) { s.combo = null; return kv(h, 'lbg_mode'); } // 能量快見底：越謹慎越早手動收手，避開強制解除的空檔
        if (!keepGoing(h, 0.85 + 0.1 * h.def.persona.risk)) { s.combo = null; return null; }
        return comboNext(h, d, lbgTok);
      },
      react: (h) => { lbgArm(h, h.h4.drv); return lbgDodge(h); },
      focus(h) { // 集中攻擊彈：沒存量不放；Boss 倒地蓄二段、有破綻蓄一段，平常不蓄
        if (h.h4.drv.fs < 1) return null;
        return DOWN.has(h.enemy.state) ? kv(h, 'lbg_focus2') : open(h) ? kv(h, 'lbg_focus1') : h.h4.focus;
      },
      tick(h, dt) {
        const s = h.h4.drv, L = H4.LBG, w = h.world, i = h.inst, id = startOnce(h);
        lbgArm(h, s);
        if (id) lbgStart(h, s, id);
        if (i && i.skill.id.startsWith('lbg_burst')) h.face = U.angTo(h, h.enemy); // 速射墊步射擊：移動中一直對著 Boss 射
        // 收招中攻擊將至：取消收招墊步（射擊 → × 派生）
        if (i && LBG_CANCEL.test(i.skill.id) && h.skillPhase() === 'recovery' && threatIn(h) < 0.15) { h.comboCancel(); h.startSkill(lbgDodge(h), { quiet: true }); }
        if (!s.rapid) s.en = Math.min(L.en.max, s.en + L.en.regen * dt);
        else if (s.en <= 0 && h.state !== 'skill' && h.canAct()) { // 能量耗盡：強制解除速射，有一段空檔
          s.rapid = false; s.combo = null; s.stat.exits++; h.setState('recover', L.en.exitLock); w.fx.text(h.x, h.y - h.r - 24, '速射解除', '#ff9a3c', 16);
        }
        if (h.stats.h4.pops > s.pops) { s.en = Math.min(L.en.max, s.en + L.focus.gain * (h.stats.h4.pops - s.pops)); s.pops = h.stats.h4.pops; } // 集中攻擊彈打破傷口回能量
        s.sp = Math.min(L.sp.max, s.sp + dt / L.sp.regen); s.fs = Math.min(L.focus.max, s.fs + dt / L.focus.regen);
        if (s.adh && w.time >= s.adh.until) lbgAdhBoom(h, w.hunt4.orig);
        if (s.wyv) lbgWyv(h, s, w, w.hunt4.orig);
        h.dmgMul = h.hunt.baseDmg;
      },
      onProj(h, p) { // 射擊類的彈：記下該彈種的適正距離
        const m = h.inst && LBG_RE.exec(h.inst.skill.id);
        if (m && p.kind === 'bolt') p.band = H4.LBG.band[m[2]].slice();
      },
      hitMul(h, p) { // 適正距離外乘 lo；貫通彈第二段起每段遞減
        const q = p.proj, L = H4.LBG;
        if (!q) return 1;
        let mul = 1;
        if (q.band) { const td = q.t * Math.hypot(q.vx, q.vy); if (td < q.band[0] || td > q.band[1]) mul = L.band.lo; }
        if (q.pierce) { q.nHit = (q.nHit || 0) + 1; mul *= Math.max(L.pierce.min, 1 - L.pierce.fall * (q.nHit - 1)); }
        return mul;
      },
      onHit(h, p, P, orig) { // 普通模式命中回能量（追擊射擊回較多）；附著龍彈附著 / 同部位命中累積階段，滿三階提早引爆
        const s = h.h4.drv, L = H4.LBG, w = h.world;
        if (p.proj && !s.rapid) s.en = Math.min(L.en.max, s.en + (p.chase ? L.en.chase : L.en.hit));
        if (p.adh) {
          if (s.adh) lbgAdhBoom(h, orig);
          s.adh = { part: P.id, pts: 0, until: w.time + L.sp.adh.life }; s.stat.adh++; w.fx.text(h.enemy.x, h.enemy.y - h.enemy.r - 40, '附著龍彈', '#ffb84a', 18);
        } else if (s.adh && p.proj && P.id === s.adh.part && ++s.adh.pts >= L.sp.adh.need[2]) lbgAdhBoom(h, orig);
      },
      onEvade(h) { const i = h.inst; if (!i.evaded) { i.evaded = true; h.world.fx.text(h.x, h.y - h.r - 14, '閃避', '#ccffdd', 14); } },
      gauge: (h) => { const s = h.h4.drv; return { v: s.en / H4.LBG.en.max, color: s.rapid ? '#ff9a3c' : '#8ad0ff' }; },
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
    h.onProj = D && D.onProj ? (p, a) => D.onProj(h, p, a) : null;
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
      if (s.evade && !p.undodgeable && i.t <= s.evade.win) { b.h4.D.onEvade(b, s.evade.perfect != null && i.t <= s.evade.perfect); return 'dodged'; } // 弓：墊步 / 飛燕射擊
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
