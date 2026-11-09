'use strict';
// 狩獵模式：星軌輪刃驅動。資料與數值（H4.CK）在 js/data/hunt4/chakram.js。不碰 DOM / Canvas。
// 每一招第一次命中刻一顆星痕；流星步精準閃過 → 星縛（Boss 短暫硬直、+2 星）→ 流星返し；星痕滿 → 星座崩落（釘住 Boss、逐星落下星光、終爆）。
(function (G) {
  const BD = G.BD, H4 = BD.HUNT4, W = BD.H4Weapons, open = W.open;
  const kv = (h, id) => h.h4.kv[id];
  const ready = (h, s, d) => s && h.skillReady(s) && (d == null || d >= s.range[0] && d <= s.range[1] + h.enemy.r * 0.4);
  const pick = (h, d, ...ids) => { for (const id of ids) { const s = kv(h, id); if (ready(h, s, d)) return s; } return null; };
  function threatIn(h) { let m = Infinity; for (const th of h.controller.scanThreats()) if (!th.glow) m = Math.min(m, th.left); return m; }
  const keepGoing = (h, base) => h.world.rng() < (open(h) ? 0.95 : base);
  const alive = (h) => h.enemy.state !== 'dead' && !h.world.winner;
  const FREE = { unblockable: true, noPerfect: true, ignoreIframe: true, kb: 0 }; // 星光 / 終爆：固定傷害直接走原管線
  const NO_CANCEL = new Set(['ck_step', 'ck_nova', 'ck_counter']);
  const CHAIN = { ck_a1: 'ck_a2', ck_a2: 'ck_a3', ck_chain: 'ck_a1', ck_counter: 'ck_a2', h4_focus_ck: 'ck_a3' };

  function addStars(h, n) {
    const s = h.h4.drv, C = H4.CK, before = s.stars;
    s.stars = Math.min(C.max, s.stars + n); s.stat.stars += s.stars - before;
    if (s.stars >= C.max && before < C.max) { const b = h.enemy; h.world.fx.text(b.x, b.y - b.r - 56, '星痕已滿', '#ffe9a8', 20); }
  }
  // 星縛：Boss 被星鏈纏住（硬直）；近 12 秒越常被縛越短
  function bind(h) {
    const s = h.h4.drv, C = H4.CK, b = h.enemy, w = h.world;
    s.binds = s.binds.filter((t) => w.time - t < 12);
    const dur = C.bind / (1 + C.resist * s.binds.length);
    s.binds.push(w.time); s.stat.binds++;
    if (b.state !== 'transition' && b.state !== 'dead') b.setState('stagger', dur);
    BD.spawnFx(w, 'ckbind', b.x, b.y, { src: b, color: '#9fd8ff', life: dur + 0.2 });
    w.fx.text(b.x, b.y - b.r - 40, '星縛！', '#9fd8ff', 24);
  }
  // 星座崩落起手：釘住 Boss，依星痕數排定每顆星的星光（星痕的位置與 render/hunt4.js 的畫法一致）
  function novaStart(h) {
    const s = h.h4.drv, N = H4.CK.nova, b = h.enemy, w = h.world, orig = w.hunt4.orig, n = s.stars;
    s.novaN = n; s.stars = 0; s.stat.novas++;
    const st = w.hunt4; // 4v1 多人都拿輪刃時不連續釘住：上一次釘住結束 3 秒內不再釘
    if (b.state !== 'transition' && b.state !== 'dead' && w.time >= (st.ckPin || 0)) { b.setState('stagger', N.pin); st.ckPin = w.time + N.pin + 3; }
    w.fx.text(b.x, b.y - b.r - 60, '星座崩落', '#ffe9a8', 30); w.log(h, '星座崩落！', true);
    BD.spawnFx(w, 'ckconst', b.x, b.y, { src: b, n, life: 1.8 });
    for (let k = 0; k < n; k++) w.later(0.3 + k * 0.17, () => {
      if (!alive(h)) return;
      const p = H4.ckStarPos(b, k);
      orig(h, b, Object.assign({ dmg: N.star, posture: 12 }, FREE));
      BD.spawnFx(w, 'ckstar', p.x, p.y, { src: h, color: '#ffe9a8' });
    });
  }

  W.DRIVERS.chakram = {
    init: () => ({ stars: 0, counter: false, binds: [], novaN: 0, stat: { stars: 0, perfect: 0, binds: 0, counters: 0, novas: 0 } }),
    choose(h, d) {
      const s = h.h4.drv;
      if (s.stars >= H4.CK.max && threatIn(h) > 0.35) { const n = pick(h, null, 'ck_nova'); if (n) return n; }
      if (d > 260) return pick(h, d, 'ck_chain', 'ck_throw');
      if (d > 165) return pick(h, d, 'ck_throw', 'ck_chain');
      return pick(h, d, open(h) && h.sta > 30 ? 'ck_a3' : 'ck_a1', 'ck_a1');
    },
    next(h, d) {
      const s = h.h4.drv, id = h.lastSkillId;
      if (s.counter) { s.counter = false; s.stat.counters++; return pick(h, null, 'ck_counter'); }
      if (id === 'ck_nova') return null;
      if (s.stars >= H4.CK.max && threatIn(h) > 0.35) { const n = pick(h, null, 'ck_nova'); if (n) return n; }
      if (threatIn(h) < 0.2 && id !== 'ck_step') return pick(h, null, 'ck_step');
      if (id === 'ck_throw') return d < 165 ? pick(h, d, 'ck_a1') : keepGoing(h, 0.5) ? pick(h, d, 'ck_throw') : null;
      return CHAIN[id] && keepGoing(h, 0.6 + 0.3 * h.def.persona.risk) ? pick(h, d, CHAIN[id]) : null;
    },
    react: (h) => kv(h, 'ck_step'),
    tick(h) {
      const i = h.inst;
      if (!i) return;
      if (!i.h4done) { i.h4done = true; if (i.skill.id === 'ck_nova') novaStart(h); }
      // 收招中攻擊將至：取消收招改流星步
      const st = kv(h, 'ck_step');
      if (!NO_CANCEL.has(i.skill.id) && h.skillPhase() === 'recovery' && h.sta >= st.cost && threatIn(h) < 0.15) { h.comboCancel(); h.startSkill(st, { quiet: true }); }
    },
    onHit(h, p, P, orig) {
      const i = h.inst, s = h.h4.drv, w = h.world, b = h.enemy;
      if (!i) return;
      if (!i.starred && i.skill.id !== 'ck_nova') { i.starred = true; addStars(h, 1); }
      if (p.ev === 'ckheal' && !i.healed) { i.healed = true; h.hp = Math.min(h.maxHp, h.hp + h.maxHp * H4.CK.heal); w.fx.text(h.x, h.y - h.r - 24, '星輝回復', '#9fffd0', 16); }
      if (p.ev === 'cknova' && !i.boomed && alive(h)) {
        i.boomed = true;
        const N = H4.CK.nova, dmg = N.boom * (0.4 + 0.6 * s.novaN / H4.CK.max) + N.hpPct * b.maxHp;
        orig(h, b, Object.assign({ dmg, posture: N.posture }, FREE)); w.checkPostureBreak(b);
        w.fx.text(b.x, b.y - b.r - 70, `崩落 ${Math.round(dmg)}`, '#ffe9a8', 26);
      }
    },
    onEvade(h, perfect) { // 流星步躲過攻擊；perfect＝開頭精準閃過：星縛 + 2 星、接流星返し（每次閃身只算一次）
      const s = h.h4.drv, i = h.inst, w = h.world;
      if (!perfect || i.discerned) { if (!i.evaded) { i.evaded = true; w.fx.text(h.x, h.y - h.r - 14, '閃避', '#ccffdd', 14); } return; }
      i.discerned = true; s.stat.perfect++; h.stats.perfect++;
      addStars(h, H4.CK.perfectStars); bind(h); s.counter = true;
      w.fx.text(h.x, h.y - h.r - 30, '流星步・精準！', '#ffe9a8', 20); w.log(h, '精準閃過（星縛）');
      w.slowmo = Math.max(w.slowmo, 0.18); BD.spawnFx(w, 'parry', h.x, h.y, { src: h, color: '#ffe9a8' });
    },
    gauge: (h) => ({ v: h.h4.drv.stars / H4.CK.max, color: h.h4.drv.stars >= H4.CK.max ? '#ffe9a8' : '#9fd8ff' }),
  };
  // 第 k 顆星痕在 Boss 身上的位置（驅動與繪圖共用；黃金角排開，跟著 Boss 面向轉）
  H4.ckStarPos = (b, k) => { const a = b.face + k * 2.39996, d = b.r * (0.3 + 0.1 * (k % 4)); return { x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d }; };
})(typeof window !== 'undefined' ? window : globalThis);
