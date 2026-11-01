'use strict';
// 狩獵模式（4v1）規則：獵人定義、Boss 放大、仇恨值選目標、力竭 / 歸隊、時限、獵人的道具 / 換武器 / 集中弱點攻擊判斷。不碰 DOM / Canvas。
// 戰鬥管線（部位、傷口、銳利度、異常…）在 combat.js。
// World 以 opts.hunt4 啟用（BD.setupHunt4）；其他模式完全不經過這裡。
(function (G) {
  const BD = G.BD, U = BD.U, H4 = BD.HUNT4;

  // 獵人 = 獵魂的 hero 定義換上名字 / 配色 / 個性；個性換算成底層 AI 參數（P4 的獵人大腦會直接讀 persona）
  function buildHunter(h, paceId, weapon) {
    const s = BD.Hunt.newSave(), id = weapon || h.weapons[0]; s.loadout.weapon = 'katana'; // 狩獵專用武器（大劍 / 雙刀 / 片手劍）以武器物件傳入
    const wp = H4.WEAPON_DEFS[id] || BD.HUNT.WEAPON_BY_ID[id], def = BD.Hunt.buildHero(s, paceId || 'heavy', wp), p = h.persona;
    return Object.assign(def, {
      id: 'h4_' + h.id, hunter: h.id, persona: p, name: h.name, title: h.title, desc: h.desc, color: h.color, color2: h.color2, glow: h.glow,
      traits: def.traits.concat('hunt4', 'h4arms'),
      ai: Object.assign({}, def.ai, { aggression: 0.35 + 0.5 * p.risk, patience: p.patience, retreat: 0.1 + 0.4 * (1 - p.risk), punish: 0.5 + 0.4 * p.show, nervous: 0.3 * (1 - p.risk) }, wp.aiMod),
    });
  }
  // mains：{ 獵人 id: 主武器 }（選單可換）；武器清單 = 主武器 + 原本的其他武器（第一把已實作的當副武器）
  const ARMS = (h, main) => [main].concat(h.weapons.filter((x) => x !== main));
  const team = (mains) => H4.HUNTERS.map((h) => { const m = (mains && H4.WEAPON_SPECS[mains[h.id]] && mains[h.id]) || h.weapons[0]; return Object.assign(buildHunter(h, 'heavy', m), { h4weapons: ARMS(h, m) }); });

  // Boss 每 interval 秒依「仇恨 + 近身加成」挑目標，維持原目標有加成，偶爾隨機換人
  function aggroTarget(w, st) {
    const b = st.boss, cur = b._target, A = H4.AGGRO, alive = st.hunters.filter((h) => h.state !== 'dead');
    if (!alive.length || (cur && cur.state !== 'dead' && w.time < st.switchT)) return;
    st.switchT = w.time + A.interval;
    let best = null;
    if (cur && cur.state !== 'dead' && alive.length > 1 && w.rng() < A.random) best = alive.filter((h) => h !== cur)[Math.floor(w.rng() * (alive.length - 1))];
    else {
      let bs = -1;
      for (const h of alive) {
        const sc = (st.aggro.get(h) + A.near * Math.max(0, 1 - U.dist(b, h) / 800)) * (h === cur ? A.stick : 1);
        if (sc > bs) { bs = sc; best = h; }
      }
    }
    if (best !== cur && cur) w.callout(b, '→ ' + best.name);
    b._target = best;
  }

  function fail(w, st, why) {
    w.winner = st.boss; w.slowmo = 1.4;
    w.banner('狩獵失敗', why, '#ff5566', 3); w.log(st.boss, '狩獵失敗：' + why, true);
  }
  function revive(w, st, b) {
    if (w.winner) return;
    const A = BD.ARENA;
    b.state = 'idle'; b.stateT = 0; b.alive = true; b.hp = b.hpTrail = b.maxHp; b.sta = b.maxSta; b.posture = 0; b.kbx = b.kby = 0;
    b.x = U.clamp(st.boss.x + (st.boss.x > A.w / 2 ? -700 : 700), 120, A.w - 120); b.y = U.clamp(st.boss.y + w.rng.range(-200, 200), 120, A.h - 120);
    w.fx.text(b.x, b.y - b.r - 20, '歸隊！', b.def.color, 22); w.log(b, '回到戰場');
  }
  // 獵人受到致命傷：不真的死亡，力竭 → REVIVE 秒後歸隊；共用次數用完就失敗
  BD.defineTrait('hunt4', {
    onLethal(w, b) {
      const st = w.hunt4; if (!st) return false;
      if (BD.H4Gear.undying(w, b)) return true; // 套裝「不死之身」
      st.faints++; st.faintsBy.set(b, st.faintsBy.get(b) + 1);
      b.cancelSkill(); b.hp = 0; b.state = 'dead'; b.stateT = 0; b.alive = false; b.statuses = [];
      w.fx.text(b.x, b.y - b.r - 30, '力竭', '#ff7070', 26); w.log(b, `力竭！（${st.faints}/${H4.CARTS}）`, true);
      if (st.faints >= H4.CARTS) fail(w, st, '力竭次數用盡');
      else { w.banner(b.name + ' 力竭了', `剩餘 ${H4.CARTS - st.faints} 次`, '#ff8080', 2); w.later(H4.REVIVE, () => revive(w, st, b)); }
      return true;
    },
  });

  // 換武器：主 / 副兩份定義，換 def / 招式 / 特性 / AI 參數與武器邏輯；收刀換手 1 秒
  function swap(w, h) {
    const hs = h.h4, def = hs.defs[hs.wi ^= 1];
    h.def = def; h.skills = def.skills.map(BD.prepSkill); h.traits = def.traits.map(BD.trait); h.controller.p = def.ai;
    h.dmgMul = h.hunt.baseDmg; BD.huntWeapon(h);
    hs.spec = hs.specs[hs.wi]; hs.mod = hs.mods[hs.wi]; hs.sharp = hs.sharps[hs.wi]; hs.wT = w.time; BD.H4Weapons.equip(h);
    h.stats.h4.switches++; h.brain.used.add(def.weapon); h.setState('recover', 1); w.fx.text(h.x, h.y - h.r - 24, '換武器：' + H4.WEAPON_NAMES[def.weapon], h.def.color, 16);
  }
  const use = (w, h, dur, text) => { h.setState('recover', dur); w.fx.text(h.x, h.y - h.r - 24, text, '#e8f4ff', 16); };
  // 每 0.25 秒判斷一次（只在手上沒事時）：粉塵 → 閃光 → 回復藥 → 磨刀 → 換武器 → 集中弱點攻擊
  function act(w, st, h) {
    const hs = h.h4, b = st.boss, p = h.def.persona, I = hs.items, d = U.dist(h, b), chased = b._target === h, rest = !chased && d > 300;
    if (w.time < hs.nextAct || !h.canAct()) return;
    hs.nextAct = w.time + 0.25;
    if (I.dust > 0) {
      const hurt = st.hunters.filter((x) => x.state !== 'dead' && x.hp < x.maxHp * 0.5 && U.dist(x, h) < H4.ITEMS.dustR);
      if (hurt.length >= 2) {
        I.dust--; h.stats.h4.dusts++; use(w, h, 0.8, '生命粉塵');
        for (const x of st.hunters) if (x.state !== 'dead' && U.dist(x, h) < H4.ITEMS.dustR) { const n = Math.round(x.maxHp * H4.ITEMS.dustHeal); x.hp = Math.min(x.maxHp, x.hp + n); w.fx.text(x.x, x.y - x.r - 14, '+' + n, '#7dffb0', 18); }
        w.log(h, '撒出生命粉塵'); return;
      }
    }
    const t = b._target;
    if (I.flash > 0 && t && t !== h && t.state !== 'dead' && t.hp < t.maxHp * 0.35 && b.state !== 'stun' && b.state !== 'knockdown' && b.state !== 'transition' && w.rng() < 0.3 + 0.6 * p.care) {
      I.flash--; h.stats.h4.flashes++; use(w, h, 0.4, '閃光彈！');
      const dur = H4.ITEMS.flashDur * Math.pow(H4.ITEMS.flashFade, st.flashes++);
      b.setState('stun', dur); w.fx.text(b.x, b.y - b.r - 34, '目眩！', '#ffffff', 24); w.fx.ring(h.x, h.y, 10, 160, 0.3, '#ffffff', 8);
      w.log(h, `丟閃光彈掩護 ${t.name}`, true); return;
    }
    if (h.hp < h.maxHp * H4.POTION_AT && !chased && BD.Hunt.drink(h, 'hp')) { if (h.def.weapon === 'sns') h.stateDur = 0.25; return; } // 片手劍拔刀喝藥：硬直短
    if (hs.spec.sharp && hs.sharp < hs.spec.sharp * H4.SHARP.whetAt && rest) {
      hs.sharp = hs.spec.sharp; h.stats.h4.whets++; use(w, h, H4.SHARP.whetTime, '磨刀'); return;
    }
    if (hs.defs[1]) { // 主武器 → 副武器：被追且血少（越不愛冒險越早換）；副 → 主：血回來了、或 Boss 倒地 / 暈眩
      const low = h.hp < h.maxHp * (0.35 + 0.25 * (1 - p.risk)), open = b.state === 'knockdown' || b.state === 'stun';
      if (w.time - hs.wT > 6 && (hs.wi === 0 ? low && chased : h.hp > h.maxHp * 0.7 || open)) { swap(w, h); return; } // 換過 6 秒內不再換，避免來回切
    }
    if (hs.focus && st.parts.some((P) => P.wound) && d < hs.focus.range[1] + b.r * 0.5 && w.rng() < 0.3 + 0.4 * p.show) h.startSkill(hs.focus);
  }

  function tick(w, st, dt) {
    if (w.intro > 0) return;
    const k = Math.exp(-dt / H4.AGGRO.decay);
    for (const h of st.hunters) {
      st.aggro.set(h, st.aggro.get(h) * k + h.stats.dealt - st.dealt.get(h)); st.dealt.set(h, h.stats.dealt);
      if (!w.winner && h.state !== 'dead') { BD.H4Weapons.step(h, dt); act(w, st, h); h.h4.sharps[h.h4.wi] = h.h4.sharp; } // 先讓武器接連段，道具 / 集中攻擊不插進連段空檔
    }
    BD.H4Combat.tick(w, st, dt, st.orig); BD.H4Brain.tick(w, st, dt); BD.H4Gear.tick(w, st);
    if (w.winner && !st.done) { st.done = true; BD.H4Brain.end(w, st); BD.H4Gear.end(w, st); if (w.winner.team === 0) w.banner('狩獵成功！', st.boss.name + ' 被討伐', '#ffe27a', 3); }
    if (!w.winner && w.time >= H4.TIME_LIMIT) fail(w, st, '時間到');
  }

  BD.setupHunt4 = function (w, opts) {
    const hunters = w.bosses.filter((b) => b.team === 0), boss = w.bosses.find((b) => b.team === 1);
    for (const h of hunters) {
      BD.huntUnit(h, true);
      const hd = H4.HUNTERS.find((x) => x.id === h.def.hunter), sub = (h.def.h4weapons || hd.weapons).slice(1).find((id) => (H4.WEAPON_DEFS[id] || BD.HUNT.WEAPON_BY_ID[id]) && H4.WEAPON_SPECS[id]); // 副武器要已實作才帶
      const spec = H4.WEAPON_SPECS[h.def.weapon];
      h.h4 = { defs: [h.def, sub ? buildHunter(hd, h.def.paceId, sub) : null], wi: 0, wT: -9, spec, specs: [spec, sub && H4.WEAPON_SPECS[sub]], mod: hd.mod || {}, mods: [hd.mod || {}, hd.mod || {}], sharp: spec.sharp, sharps: [spec.sharp, sub ? H4.WEAPON_SPECS[sub].sharp : 0],
        items: Object.assign({}, hd.items), nextAct: 0 };
      h.stats.h4 = { pops: 0, breaks: 0, procs: 0, whets: 0, flashes: 0, dusts: 0, switches: 0, offsets: 0, pguards: 0, clashes: 0 };
      BD.H4Weapons.equip(h);
    }
    boss.maxHp = boss.hp = boss.hpTrail = Math.round(boss.maxHp * H4.BOSS_HP_MUL); boss.maxPosture *= H4.POSTURE_MUL;
    w.enrageAt = Infinity; // 以時限取代狂暴
    BD.applyStatus(boss, 'kdGuard', { dur: Infinity }, w); // Boss 不會被單一重擊打倒，只有架勢累積崩潰才倒地（combat.js 的倒地）
    const st = w.hunt4 = { boss, hunters, faints: 0, faintsBy: new Map(hunters.map((h) => [h, 0])), aggro: new Map(hunters.map((h) => [h, 0])), dealt: new Map(hunters.map((h) => [h, 0])), switchT: 0, flashes: 0, done: false };
    BD.H4Combat.init(w, st); BD.H4Brain.install(w, st, (opts && opts.h4save) || BD.H4Brain.newSave()); BD.H4Gear.install(w, st); // 沒給存檔 = 全新的獵人（沒有裝備）
    const retarget = w.retarget.bind(w), step = w.step.bind(w), orig = st.orig = w.damageBoss.bind(w);
    w.retarget = (b) => (b === boss ? aggroTarget(w, st) : retarget(b));
    w.damageBoss = (src, b, p) => { // 獵人（或其投射物）打 Boss → 走狩獵戰鬥管線
      const h = src && (src.isBoss ? src : src.owner);
      return b === boss && h && h.h4 && !p.dot ? BD.H4Combat.hit(w, st, h, src, b, p, orig) : orig(src, b, p);
    };
    w.step = (dt) => { step(dt); tick(w, st, dt); };
  };
  BD.Hunt4 = { buildHunter, team, ARMS };
})(typeof window !== 'undefined' ? window : globalThis);
