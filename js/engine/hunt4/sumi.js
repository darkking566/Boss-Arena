'use strict';
// 狩獵模式：墨染武士刀驅動。資料與數值（H4.SM）在 js/data/hunt4/sumi.js。不碰 DOM / Canvas。
// 每一招第一次命中留一道墨痕；居合命中 0.3 秒後追加遲來的一筆；流墨精準閃過 → 墨縛（Boss 短暫硬直、+2）→ 墨影返し；
// 墨痕寫滿 → 一筆百斬（定住 Boss，獵人一筆一筆穿身斬過，最後寫「斬」字、終爆）。
(function (G) {
  const BD = G.BD, H4 = BD.HUNT4, W = BD.H4Weapons, open = W.open;
  const kv = (h, id) => h.h4.kv[id];
  const ready = (h, s, d) => s && h.skillReady(s) && (d == null || d >= s.range[0] && d <= s.range[1] + h.enemy.r * 0.4);
  const pick = (h, d, ...ids) => { for (const id of ids) { const s = kv(h, id); if (ready(h, s, d)) return s; } return null; };
  function threatIn(h) { let m = Infinity; for (const th of h.controller.scanThreats()) if (!th.glow) m = Math.min(m, th.left); return m; }
  const keepGoing = (h, base) => h.world.rng() < (open(h) ? 0.95 : base);
  const alive = (h) => h.enemy.state !== 'dead' && !h.world.winner;
  const FREE = { unblockable: true, noPerfect: true, ignoreIframe: true, kb: 0 }; // 遲來的一筆 / 每一筆 / 終爆：固定傷害直接走原管線
  const NO_CANCEL = new Set(['sm_step', 'sm_ult', 'sm_counter']);
  const CHAIN = { sm_a1: 'sm_a2', sm_a2: 'sm_a3', sm_iai: 'sm_a1', sm_rush: 'sm_a2', sm_counter: 'sm_a2', h4_focus_sm: 'sm_a3' };

  function addInk(h, n) {
    const s = h.h4.drv, C = H4.SM, before = s.ink;
    s.ink = Math.min(C.max, s.ink + n); s.stat.ink += s.ink - before;
    if (s.ink >= C.max && before < C.max) { const b = h.enemy; h.world.fx.text(b.x, b.y - b.r - 56, '墨韻已滿', '#e8402e', 20); }
  }
  // 墨縛：潑墨纏住 Boss（硬直）；近 12 秒越常被縛越短
  function bind(h) {
    const s = h.h4.drv, C = H4.SM, b = h.enemy, w = h.world;
    s.binds = s.binds.filter((t) => w.time - t < 12);
    const dur = C.bind / (1 + C.resist * s.binds.length);
    s.binds.push(w.time); s.stat.binds++;
    if (b.state !== 'transition' && b.state !== 'dead') b.setState('stagger', dur);
    BD.spawnFx(w, 'sumibind', b.x, b.y, { src: b, life: dur + 0.2 });
    w.fx.text(b.x, b.y - b.r - 40, '墨縛！', '#f2ead8', 24);
  }
  // 一筆百斬：定住 Boss；每一筆把獵人從 Boss 一側移到另一側（弦穿過 Boss 身體，每筆轉一點角度，連起來像一朵墨花）
  function ultStart(h) {
    const s = h.h4.drv, U = H4.SM.ult, b = h.enemy, w = h.world, orig = w.hunt4.orig;
    s.ink = 0; s.stat.ults++;
    const st = w.hunt4; // 4v1 多人都拿墨染時不連續定住：上一次定住結束 3 秒內不再定
    if (b.state !== 'transition' && b.state !== 'dead' && w.time >= (st.smPin || 0)) { b.setState('stagger', U.pin); st.smPin = w.time + U.pin + 3; }
    w.fx.text(b.x, b.y - b.r - 60, '水墨・一筆百斬', '#1a1614', 30); w.log(h, '水墨・一筆百斬！', true);
    BD.spawnFx(w, 'sumipaper', b.x, b.y, { src: b, life: 2.5 });
    let th = Math.atan2(h.y - b.y, h.x - b.x);
    for (let k = 0; k < U.n; k++) w.later(0.25 + k * 0.24, () => {
      if (!alive(h) || h.state !== 'skill' || !h.inst || h.inst.skill.id !== 'sm_ult') return;
      const R = b.r + 90, x0 = h.x, y0 = h.y; th += Math.PI + 0.5;
      h.x = b.x + Math.cos(th) * R; h.y = b.y + Math.sin(th) * R; w.confine(h); h.face = Math.atan2(b.y - h.y, b.x - h.x); h.vx = h.vy = 0;
      orig(h, b, Object.assign({ dmg: U.cut, posture: 12 }, FREE));
      BD.spawnFx(w, 'sumistroke', x0, y0, { src: h, x1: h.x, y1: h.y, k, life: 2.4 - k * 0.24 }); // 每一筆留到終爆後才散
    });
  }

  W.DRIVERS.sumi = {
    init: () => ({ ink: 0, counter: false, binds: [], stat: { ink: 0, perfect: 0, binds: 0, counters: 0, ults: 0 } }),
    choose(h, d) {
      const s = h.h4.drv;
      if (s.ink >= H4.SM.max && threatIn(h) > 0.35) { const n = pick(h, d, 'sm_ult'); if (n) return n; }
      if (d > 230) return pick(h, d, 'sm_iai');
      if (d > 160) return pick(h, d, 'sm_rush', 'sm_iai');
      return pick(h, d, open(h) && h.sta > 30 ? 'sm_rush' : 'sm_a1', 'sm_a1');
    },
    next(h, d) {
      const s = h.h4.drv, id = h.lastSkillId;
      if (s.counter) { s.counter = false; s.stat.counters++; return pick(h, null, 'sm_counter'); }
      if (id === 'sm_ult') return null;
      if (s.ink >= H4.SM.max && threatIn(h) > 0.35) { const n = pick(h, d, 'sm_ult'); if (n) return n; }
      if (threatIn(h) < 0.2 && id !== 'sm_step') return pick(h, null, 'sm_step');
      if (id === 'sm_a3' && keepGoing(h, 0.4)) return pick(h, d, 'sm_rush', 'sm_iai');
      return CHAIN[id] && keepGoing(h, 0.6 + 0.3 * h.def.persona.risk) ? pick(h, d, CHAIN[id]) : null;
    },
    react: (h) => kv(h, 'sm_step'),
    tick(h) {
      const i = h.inst;
      if (!i) return;
      if (!i.h4done) { i.h4done = true; if (i.skill.id === 'sm_ult') ultStart(h); }
      // 收招中攻擊將至：取消收招改流墨
      const st = kv(h, 'sm_step');
      if (!NO_CANCEL.has(i.skill.id) && h.skillPhase() === 'recovery' && h.sta >= st.cost && threatIn(h) < 0.15) { h.comboCancel(); h.startSkill(st, { quiet: true }); }
    },
    onHit(h, p, P, orig) {
      const i = h.inst, s = h.h4.drv, w = h.world, b = h.enemy;
      if (!i) return;
      if (!i.inked && i.skill.id !== 'sm_ult') { i.inked = true; addInk(h, 1); }
      if (p.ev === 'smiai' && !i.late) { // 遲來的一筆：穿身而過後，Boss 身上那道墨線才裂開
        i.late = true; const a = h.face;
        w.later(0.3, () => {
          if (!alive(h)) return;
          orig(h, b, Object.assign({ dmg: H4.SM.late, posture: 14 }, FREE));
          BD.spawnFx(w, 'sumicut', b.x, b.y, { src: b, angle: a });
        });
      }
      if (p.ev === 'smheal' && !i.healed) { i.healed = true; h.hp = Math.min(h.maxHp, h.hp + h.maxHp * H4.SM.heal); w.fx.text(h.x, h.y - h.r - 24, '墨韻回復', '#9fffd0', 16); }
      if (p.ev === 'smult' && !i.boomed && alive(h)) {
        i.boomed = true;
        const U = H4.SM.ult, dmg = U.boom + U.hpPct * b.maxHp;
        orig(h, b, Object.assign({ dmg, posture: U.posture }, FREE)); w.checkPostureBreak(b);
        w.fx.text(b.x, b.y - b.r - 70, `一筆百斬 ${Math.round(dmg)}`, '#f2ead8', 26);
      }
    },
    onEvade(h, perfect) { // 流墨躲過攻擊；perfect＝開頭精準閃過：墨縛 + 2 墨痕、接墨影返し（每次閃身只算一次）
      const s = h.h4.drv, i = h.inst, w = h.world;
      if (!perfect || i.discerned) { if (!i.evaded) { i.evaded = true; w.fx.text(h.x, h.y - h.r - 14, '閃避', '#ccffdd', 14); } return; }
      i.discerned = true; s.stat.perfect++; h.stats.perfect++;
      addInk(h, H4.SM.perfectStars); bind(h); s.counter = true;
      w.fx.text(h.x, h.y - h.r - 30, '流墨・見切！', '#f2ead8', 20); w.log(h, '精準閃過（墨縛）');
      w.slowmo = Math.max(w.slowmo, 0.18);
    },
    gauge: (h) => ({ v: h.h4.drv.ink / H4.SM.max, color: h.h4.drv.ink >= H4.SM.max ? '#e8402e' : '#d8d0c0' }),
  };
  // 第 k 道墨痕在 Boss 身上的位置與方向（繪圖用；跟著 Boss 面向轉）
  H4.smMark = (b, k) => { const a = b.face + k * 2.39996, d = b.r * (0.25 + 0.12 * (k % 3)); return { x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d, a: a + 0.9 }; };
})(typeof window !== 'undefined' ? window : globalThis);
