'use strict';
// 狩獵模式（4v1）規則：獵人定義、Boss 放大、仇恨值選目標、力竭 / 歸隊、時限、喝藥。不碰 DOM / Canvas。
// World 以 opts.hunt4 啟用（BD.setupHunt4）；其他模式完全不經過這裡。
(function (G) {
  const BD = G.BD, U = BD.U, H4 = BD.HUNT4;

  // 獵人 = 獵魂的 hero 定義換上名字 / 配色 / 個性；個性換算成底層 AI 參數（P4 的獵人大腦會直接讀 persona）
  function buildHunter(h, paceId) {
    const s = BD.Hunt.newSave(); s.loadout.weapon = h.weapons[0];
    const def = BD.Hunt.buildHero(s, paceId || 'heavy'), p = h.persona;
    return Object.assign(def, {
      id: 'h4_' + h.id, hunter: h.id, persona: p, name: h.name, title: h.title, desc: h.desc, color: h.color, color2: h.color2, glow: h.glow,
      traits: def.traits.concat('hunt4'),
      ai: Object.assign({}, def.ai, { aggression: 0.35 + 0.5 * p.risk, patience: p.patience, retreat: 0.1 + 0.4 * (1 - p.risk), punish: 0.5 + 0.4 * p.show, nervous: 0.3 * (1 - p.risk) }),
    });
  }
  const team = () => H4.HUNTERS.map((h) => buildHunter(h, 'heavy'));

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
      st.faints++; st.faintsBy.set(b, st.faintsBy.get(b) + 1);
      b.cancelSkill(); b.hp = 0; b.state = 'dead'; b.stateT = 0; b.alive = false; b.statuses = [];
      w.fx.text(b.x, b.y - b.r - 30, '力竭', '#ff7070', 26); w.log(b, `力竭！（${st.faints}/${H4.CARTS}）`, true);
      if (st.faints >= H4.CARTS) fail(w, st, '力竭次數用盡');
      else { w.banner(b.name + ' 力竭了', `剩餘 ${H4.CARTS - st.faints} 次`, '#ff8080', 2); w.later(H4.REVIVE, () => revive(w, st, b)); }
      return true;
    },
  });

  function tick(w, st, dt) {
    if (w.intro > 0) return;
    const k = Math.exp(-dt / H4.AGGRO.decay);
    for (const h of st.hunters) {
      st.aggro.set(h, st.aggro.get(h) * k + h.stats.dealt - st.dealt.get(h)); st.dealt.set(h, h.stats.dealt);
      // 喝藥：血量低、手上沒事、而且 Boss 沒在追自己
      if (!w.winner && h.state !== 'dead' && h.hp < h.maxHp * H4.POTION_AT && st.boss._target !== h && h.canAct()) BD.Hunt.drink(h, 'hp');
    }
    if (w.winner && !st.done) { st.done = true; if (w.winner.team === 0) w.banner('狩獵成功！', st.boss.name + ' 被討伐', '#ffe27a', 3); }
    if (!w.winner && w.time >= H4.TIME_LIMIT) fail(w, st, '時間到');
  }

  BD.setupHunt4 = function (w) {
    const hunters = w.bosses.filter((b) => b.team === 0), boss = w.bosses.find((b) => b.team === 1);
    for (const h of hunters) BD.huntUnit(h, true);
    boss.maxHp = boss.hp = boss.hpTrail = Math.round(boss.maxHp * H4.BOSS_HP_MUL); boss.maxPosture *= H4.POSTURE_MUL;
    w.enrageAt = Infinity; // 以時限取代狂暴
    const st = w.hunt4 = { boss, hunters, faints: 0, faintsBy: new Map(hunters.map((h) => [h, 0])), aggro: new Map(hunters.map((h) => [h, 0])), dealt: new Map(hunters.map((h) => [h, 0])), switchT: 0, done: false };
    const retarget = w.retarget.bind(w), step = w.step.bind(w);
    w.retarget = (b) => (b === boss ? aggroTarget(w, st) : retarget(b));
    w.step = (dt) => { step(dt); tick(w, st, dt); };
  };
  BD.Hunt4 = { buildHunter, team };
})(typeof window !== 'undefined' ? window : globalThis);
