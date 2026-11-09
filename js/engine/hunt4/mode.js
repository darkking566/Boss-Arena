'use strict';
// 狩獵模式（4v1）規則：獵人定義、Boss 放大、仇恨值選目標、力竭 / 歸隊、時限、獵人的道具 / 換武器 / 集中弱點攻擊判斷。不碰 DOM / Canvas。
// 戰鬥管線（部位、傷口、銳利度、異常…）在 combat.js。
// World 以 opts.hunt4 啟用（BD.setupHunt4）；其他模式完全不經過這裡。
(function (G) {
  const BD = G.BD, U = BD.U, H4 = BD.HUNT4;

  // 獵人 = 獵魂的 hero 定義換上名字 / 配色 / 個性；個性換算成底層 AI 參數（P4 的獵人大腦會直接讀 persona）
  const aiOf = (def, p, wp) => Object.assign({}, def.ai, { aggression: 0.35 + 0.5 * p.risk, patience: p.patience, retreat: 0.1 + 0.4 * (1 - p.risk), punish: 0.5 + 0.4 * p.show, nervous: 0.3 * (1 - p.risk) }, wp.aiMod);
  const wpOf = (id) => H4.WEAPON_DEFS[id] || BD.HUNT.WEAPON_BY_ID[id];
  function buildHunter(h, paceId, weapon) {
    const s = BD.Hunt.newSave(), id = weapon || h.weapons[0]; s.loadout.weapon = 'katana'; // 狩獵專用武器（大劍 / 雙刀 / 片手劍）以武器物件傳入
    const wp = wpOf(id), def = BD.Hunt.buildHero(s, paceId || 'heavy', wp), p = h.persona, BS = H4.BASIC_STA;
    for (const sk of def.skills.concat(Object.values(def.variants))) { // buildHero 已複製招式，可直接改
      if (!sk.cost && !sk.res && (sk.tags || []).includes('melee') && !BS.skip.includes(sk.id)) sk.cost = Math.max(BS.min, Math.round((sk.recovery || 0) * BS.perRec));
    }
    def.stamina.regen *= H4.STA_REGEN_MUL;
    return Object.assign(def, {
      id: 'h4_' + h.id, hunter: h.id, persona: p, name: h.name, title: h.title, desc: h.desc, color: h.color, color2: h.color2, glow: h.glow,
      traits: def.traits.concat('hunt4', 'h4arms'), ai: aiOf(def, p, wp),
    });
  }
  // 獵魂代理：存檔裡的獵魂者拿狩獵武器（沒有 'hunt4' 特性＝不會力竭歸隊，照獵魂規則死亡）
  const SOLO_P = { risk: 0.6, patience: 0.6, team: 0.5, show: 0.6, care: 0.4, learn: 0.5 };
  function soloHero(save, weapon) {
    const wp = wpOf(weapon), def = BD.Hunt.buildHero(save, 'heavy', wp);
    return Object.assign(def, { persona: SOLO_P, traits: def.traits.concat('h4arms'), ai: aiOf(def, SOLO_P, wp) });
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
    h.stats.h4.switches++; h.brain.used.add(def.weapon); h.setState('recover', BD.H4Gear.cut(h, 'swap', 0.6)); w.fx.text(h.x, h.y - h.r - 24, '換武器：' + H4.WEAPON_NAMES[def.weapon], h.def.color, 16);
  }
  const use = (w, h, dur, text) => { h.setState('recover', dur); w.fx.text(h.x, h.y - h.r - 24, text, '#e8f4ff', 16); };

  // 傷口合作只在 4v1：短暫預留一處隊友傷口，標記實際攻擊，避免多人搶同一處或舊箭誤認新傷口。
  function finishCoop(w, st, c, result) {
    if (!c || c.result) return;
    c.result = result;
    const h = st.hunters.find((x) => x.def.hunter === c.hunter), P = st.parts.find((x) => x.id === c.part);
    h.stats.h4.coop[result]++;
    if (h.h4.coopActive === c) h.h4.coopActive = null;
    if (P.coop === c) P.coop = null;
    if (result === 'success') {
      const by = st.hunters.find((x) => x.def.hunter === c.creator);
      by.stats.h4.coop.assists++;
      w.callout(h, '合作破傷！'); w.log(h, `接應 ${by.name}，合作打破${P.name}部傷口！`, true);
    } else w.log(h, `傷口合作${result === 'missed' ? '未命中目標傷口' : '中止'}`);
  }
  const coopThreat = (h, window) => h.controller.plan || h.controller.evade || h.controller.undoSafe() ||
    h.controller.scanThreats().some((t) => !t.glow && t.left <= window);
  function coopTick(w, st) {
    if (st.solo) return;
    for (const h of st.hunters) {
      const c = h.h4.coopActive; if (!c) continue;
      const P = st.parts.find((x) => x.id === c.part), i = h.inst;
      if (w.winner || h.state === 'dead' || !P.wound || P.wound !== c.wound || w.time - P.wound > H4.WOUND.life) {
        finishCoop(w, st, c, 'cancelled'); continue;
      }
      // 尚未出手的蓄勢期才可安全收手；已飛出的箭照常飛行，結果由命中管線確認。
      if (i && i.id === c.inst && h.skillPhase() === 'windup' &&
          (h.hp < h.maxHp * 0.35 || st.boss.state === 'transition' || coopThreat(h, 0.4))) {
        h.setState('recover', 0.15); finishCoop(w, st, c, 'cancelled'); continue;
      }
      const flying = w.projectiles.some((p) => p.alive && p.extra && p.extra.h4coop === c);
      if (w.time >= c.until || ((!i || i.id !== c.inst) && !flying))
        finishCoop(w, st, c, h.lastSkillId === c.skill && h.lastSkillEnd >= c.started ? 'missed' : 'cancelled');
    }
  }
  function tryCoop(w, st, h) {
    if (st.solo || w.winner || h.h4.coopActive || !h.canAct()) return false;
    const hs = h.h4, p = h.def.persona, b = st.boss;
    const P = st.parts.find((x) => x.wound && w.time - x.wound <= H4.WOUND.life && x.woundBy && x.woundBy !== h.def.hunter && !x.coop);
    if (!P || !hs.focus) return false;
    // 不搶斷剛結束技能的連段接續，也不越過底層的防禦 / 逃生計畫。
    const f = hs.D && hs.D.focus ? hs.D.focus(h) : hs.focus;
    if (!f || !h.skillReady(f) || w.time - h.lastSkillEnd < 0.15 || h.hp < h.maxHp * (0.45 + 0.1 * (1 - p.risk)) ||
        h.sta < h.def.dodgeCost + (f.res ? 0 : f.cost || 0) || b.state === 'dead' || b.state === 'transition') return false;
    const d = U.dist(h, b) - b.r * 0.4, v = h.phase === 2 ? f.v2 : f.v1;
    if (d < f.range[0] || d > f.range[1] || (b.state === 'skill' && b._target === h) || coopThreat(h, v.windup + 0.3)) return false;
    if (w.rng() >= 0.45 + 0.4 * p.team) return false;
    const c = { hunter: h.def.hunter, creator: P.woundBy, part: P.id, wound: P.wound, started: w.time, skill: f.id, until: w.time + v.dur + 3.2 };
    // 只複製本次招式時間軸；近戰旗標 / 投射物 extra 沿既有命中路徑傳到 combat.hit。
    const tag = (ver) => Object.assign({}, ver, { actions: ver.actions.map((a) => a.focus ? Object.assign({}, a, { h4coop: c }) :
      a.extra && a.extra.focus ? Object.assign({}, a, { extra: Object.assign({}, a.extra, { h4coop: c }) }) : a) });
    const skill = Object.assign({}, f, { v1: tag(f.v1), v2: tag(f.v2) });
    if (!h.startSkill(skill)) return false;
    c.inst = h.inst.id; P.coop = hs.coopActive = c; h.stats.h4.coop.started++;
    if (h.brain) h.brain.last = '接應隊友的' + P.name + '部傷口';
    const by = st.hunters.find((x) => x.def.hunter === c.creator);
    w.callout(h, '接應 ' + by.name + '！'); w.log(h, `接應 ${by.name} 的${P.name}部傷口`, true);
    return true;
  }
  // 支援沿用瞬間施效 / 使用後硬直；先確保能自由行動，且沒有眼前的逃生或防禦需求。
  const groundDanger = (h, ahead) => h.world.zones.some((z) => z.team !== h.team && z.dps > 0 && z.t + ahead >= (z.delay || 0) && U.dist(h, z) < z.r + h.r) ||
    h.world.traps.some((t) => t.team !== h.team && t.t + ahead >= t.arm && U.dist(h, t) < t.trig + h.r);
  const supportUnsafe = (h, ahead) => coopThreat(h, ahead) || groundDanger(h, ahead);
  function trySupport(w, st, h) {
    if (st.solo || w.winner || !h.canAct() || h.h4.coopActive) return false;
    const S = H4.SUPPORT, I = h.h4.items, team = st.support, b = st.boss, p = h.def.persona;
    if (I.dust > 0 && w.time >= team.dustUntil) {
      const near = st.hunters.filter((x) => x.state !== 'dead' && x.hp > 0 && U.dist(x, h) < H4.ITEMS.dustR);
      const allies = near.filter((x) => x !== h);
      const urgent = allies.some((x) => x.hp < x.maxHp * (0.18 + 0.12 * p.care) ||
        x.hp < x.maxHp * (0.35 + 0.1 * p.care) && (groundDanger(x, 0.9) || x.controller.scanThreats().some((t) => !t.glow && t.left <= 0.9)));
      const group = near.filter((x) => x.hp < x.maxHp * (0.45 + 0.1 * p.care));
      if ((urgent || group.length >= 2 && group.some((x) => x !== h)) && !supportUnsafe(h, 0.95)) {
        I.dust--; h.stats.h4.dusts++; team.dustUntil = w.time + S.dustGap;
        use(w, h, 0.8, '生命粉塵救援');
        let total = 0; const helped = [];
        for (const x of near) {
          const n = Math.min(x.maxHp - x.hp, Math.round(x.maxHp * H4.ITEMS.dustHeal));
          if (n <= 0) continue;
          x.hp += n; total += n; helped.push(x.name); h.stats.h4.support.recipients++;
          if (x !== h) h.stats.h4.support.allyHealing += n;
          w.fx.text(x.x, x.y - x.r - 14, '+' + Math.round(n), '#7dffb0', 18);
        }
        h.stats.h4.support.healing += total;
        w.log(h, `粉塵救援 ${helped.join('、')}，實際回復 ${Math.round(total)}`, true);
        return true;
      }
    }
    const t = b._target, i = b.inst;
    const dur = H4.ITEMS.flashDur * Math.pow(H4.ITEMS.flashFade, st.flashes) * BD.H4Gear.mul(h, 'fdur');
    // 只打斷尚有傷害動作的招式；已脫離 Boss 的投射物 / 地面區域不會被這顆閃光消除。
    const attacking = b.state === 'skill' && i && b.skillPhase() !== 'recovery' &&
      (i.v.actions.some((a) => a.at + (a.dur || 0) >= i.t && (a.dmg > 0 || a.dps > 0 || a.hit && a.hit.dmg > 0)) ||
       i.dash && i.dash.hit || i.circle && i.circle.hit);
    if (I.flash <= 0 || w.time < team.flashUntil || team.cover || !t || t === h || t.state === 'dead' || t.hp <= 0 ||
        t.hp >= t.maxHp * H4.ITEMS.flashAt || !attacking || BD.H4Combat.locked(st, b) || dur < S.minFlash || U.dist(h, b) - b.r > S.flashR || supportUnsafe(h, 0.55)) return false;
    if (w.rng() >= 0.3 + 0.6 * p.care) return false;
    I.flash--; h.stats.h4.flashes++; st.flashes++;
    team.flashUntil = w.time + dur + S.flashGap;
    use(w, h, 0.4, '閃光掩護 ' + t.name);
    b.setState('stun', dur);
    if (i.cancelled) h.stats.h4.support.interrupts++;
    team.cover = { by: h, target: t, until: w.time + S.observe };
    w.fx.text(b.x, b.y - b.r - 34, '目眩！', '#ffffff', 24); w.fx.ring(h.x, h.y, 10, 160, 0.3, '#ffffff', 8);
    w.log(h, `閃光打斷【${i.skill.name}】，掩護 ${t.name}`, true);
    return true;
  }
  function supportTick(w, st) {
    if (st.solo || !st.support.cover) return;
    const c = st.support.cover;
    const result = c.target.state === 'dead' || c.target.hp <= 0 ? 'coverFaint' : w.time >= c.until ? 'coverSafe' : w.winner ? 'coverEnded' : null;
    if (!result) return;
    c.by.stats.h4.support[result]++; st.support.cover = null;
    const text = result === 'coverFaint' ? '觀察期間力竭' : result === 'coverSafe' ? '觀察 2 秒未力竭' : '戰鬥結束，觀察未滿 2 秒';
    w.log(c.by, `掩護 ${c.target.name}：${text}`);
  }
  // 每 0.25 秒判斷一次（只在手上沒事時）：支援 → 回復藥 → 磨刀 → 換武器 → 集中弱點攻擊
  function act(w, st, h) {
    const hs = h.h4, b = st.boss, p = h.def.persona, d = U.dist(h, b), chased = b._target === h, rest = !chased && d > 300;
    if (w.time < hs.nextAct || !h.canAct()) return;
    hs.nextAct = w.time + 0.25;
    if (BD.Hunt4.trySupport(w, st, h)) return;
    if (h.hp < h.maxHp * H4.POTION_AT && !chased && BD.Hunt.drink(h, 'hp')) { if (h.def.weapon === 'sns') h.stateDur = 0.25; return; } // 片手劍拔刀喝藥：硬直短
    if (hs.spec.sharp && hs.sharp < hs.spec.sharp * H4.SHARP.whetAt && rest) {
      hs.sharp = hs.spec.sharp; h.stats.h4.whets++; use(w, h, H4.SHARP.whetTime * BD.H4Gear.cut(h, 'whet', 0.75), '磨刀'); return;
    }
    if (hs.defs[1]) { // 主武器 → 副武器：被追且血少（越不愛冒險越早換）；副 → 主：血回來了、或 Boss 倒地 / 暈眩
      const low = h.hp < h.maxHp * (0.35 + 0.25 * (1 - p.risk)), open = b.state === 'knockdown' || b.state === 'stun';
      if (w.time - hs.wT > 6 && (hs.wi === 0 ? low && chased : h.hp > h.maxHp * 0.7 || open)) { swap(w, h); return; } // 換過 6 秒內不再換，避免來回切
    }
    if (tryCoop(w, st, h)) return;
    if (hs.focus && st.parts.some((P) => P.wound && !P.coop) && d < hs.focus.range[1] + b.r * 0.5 && w.rng() < 0.3 + 0.4 * p.show) {
      const f = hs.D && hs.D.focus ? hs.D.focus(h) : hs.focus; // 武器可換成蓄力版或沒存量不放（輕弩集中攻擊彈）
      if (f) h.startSkill(f);
    }
  }

  function tick(w, st, dt) {
    if (w.intro > 0) return;
    coopTick(w, st);
    supportTick(w, st);
    const k = Math.exp(-dt / H4.AGGRO.decay);
    for (const h of st.hunters) {
      st.aggro.set(h, st.aggro.get(h) * k + (h.stats.dealt - st.dealt.get(h)) * BD.H4Gear.cut(h, 'aggro', 0.6)); st.dealt.set(h, h.stats.dealt); // 威嚇：仇恨累積變慢
      if (!w.winner && h.state !== 'dead') { BD.H4Weapons.step(h, dt); act(w, st, h); h.h4.sharps[h.h4.wi] = h.h4.sharp; } // 先讓武器接連段，道具 / 集中攻擊不插進連段空檔
    }
    BD.H4Combat.tick(w, st, dt, st.orig); BD.H4Brain.tick(w, st, dt); BD.H4Gear.tick(w, st, dt);
    if (w.winner) supportTick(w, st); // 道具之後的傷害 / 掉血也可能在同幀結束戰鬥，先結算觀察再建立回顧。
    if (st.solo) return; // 獵魂代理：勝負與結算照獵魂規則
    if (w.winner && !st.done) { st.done = true; BD.H4Brain.end(w, st); BD.H4Gear.end(w, st); if (w.winner.team === 0) w.banner('狩獵成功！', st.boss.name + ' 被討伐', '#ffe27a', 3); }
    if (!w.winner && w.time >= H4.TIME_LIMIT) fail(w, st, '時間到');
  }

  // 狩獵戰鬥系統（武器驅動、部位 / 銳利度 / 異常管線、道具判斷）；4v1 與獵魂代理共用。hd：獵人資料（獵魂代理沒有）
  function arm(w, hunters, boss, solo) {
    for (const h of hunters) {
      const hd = !solo && H4.HUNTERS.find((x) => x.id === h.def.hunter), sub = hd && (h.def.h4weapons || hd.weapons).slice(1).find((id) => wpOf(id) && H4.WEAPON_SPECS[id]); // 副武器要已實作才帶
      const spec = H4.WEAPON_SPECS[h.def.weapon], mod = (hd && hd.mod) || {};
      h.h4 = { defs: [h.def, sub ? buildHunter(hd, h.def.paceId, sub) : null], wi: 0, wT: -9, spec, specs: [spec, sub && H4.WEAPON_SPECS[sub]], mod, mods: [mod, mod], sharp: spec.sharp, sharps: [spec.sharp, sub ? H4.WEAPON_SPECS[sub].sharp : 0],
        items: Object.assign({ flash: 0, dust: 0 }, hd && hd.items), nextAct: 0 };
      h.stats.h4 = { pops: 0, breaks: 0, procs: 0, whets: 0, flashes: 0, dusts: 0, switches: 0, offsets: 0, pguards: 0, clashes: 0 };
      if (!solo) h.stats.h4.coop = { created: 0, assists: 0, started: 0, success: 0, cancelled: 0, missed: 0 };
      if (!solo) h.stats.h4.support = { healing: 0, allyHealing: 0, recipients: 0, interrupts: 0, coverSafe: 0, coverFaint: 0, coverEnded: 0 };
      BD.H4Weapons.equip(h);
    }
    BD.applyStatus(boss, 'kdGuard', { dur: Infinity }, w); // Boss 不會被單一重擊打倒，只有架勢累積崩潰才倒地（combat.js 的倒地）
    const st = w.hunt4 = { boss, hunters, solo, faints: 0, faintsBy: new Map(hunters.map((h) => [h, 0])), aggro: new Map(hunters.map((h) => [h, 0])), dealt: new Map(hunters.map((h) => [h, 0])), switchT: 0, flashes: 0, done: false };
    if (!solo) st.support = { dustUntil: 0, flashUntil: 0, cover: null };
    BD.H4Combat.init(w, st);
    const orig = st.orig = (src, b, p) => w.hitBoss(src, b, p); // 追加傷害直接走四段管線，不再經過掛勾
    w.useDamage((src, b, p, next) => { // 獵人（或其投射物）打 Boss → 走狩獵戰鬥管線
      const h = src && (src.isBoss ? src : src.owner);
      return b === boss && h && h.h4 && !p.dot ? BD.H4Combat.hit(w, st, h, src, b, p, orig) : next(src, b, p);
    });
    w.on('postStep', (dt) => tick(w, st, dt)); // 命中凍結的步也要跑（原本包在 step 外層）
    return st;
  }

  BD.setupHunt4 = function (w, opts) {
    const hunters = w.bosses.filter((b) => b.team === 0), boss = w.bosses.find((b) => b.team === 1);
    for (const h of hunters) BD.huntUnit(h, true);
    boss.maxHp = boss.hp = boss.hpTrail = Math.round(boss.maxHp * H4.BOSS_HP_MUL); boss.maxPosture *= H4.POSTURE_MUL;
    boss.r *= H4.BOSS_SIZE; boss.sizeMul = (boss.sizeMul || 1) * H4.BOSS_SIZE;
    w.enrageAt = Infinity; // 以時限取代狂暴
    const st = arm(w, hunters, boss, false);
    BD.H4Brain.install(w, st, (opts && opts.h4save) || BD.H4Brain.newSave()); BD.H4Gear.install(w, st); // 沒給存檔 = 全新的獵人（沒有裝備）
    const retarget = w.retarget.bind(w);
    w.retarget = (b) => (b === boss ? aggroTarget(w, st) : retarget(b));
  };
  // 獵魂代理（opts.h4solo，主角由 soloHero 建）：只掛戰鬥系統，不放大 Boss、沒有仇恨 / 力竭 / 時限；不學習、不帶狩獵裝備
  // shortcut: 獵人大腦不裝（沒有跨場存檔），出手 / 反應時機用武器驅動的預設；要學習時給獵魂另存一份 H4Brain 存檔
  BD.setupHunt4Solo = function (w) {
    const st = arm(w, [w.bosses[0]], w.bosses[1], true);
    for (const h of st.hunters) h.h4.gear = BD.H4Gear.blank();
  };
  BD.Hunt4 = { buildHunter, soloHero, team, ARMS, tryCoop, coopTick, finishCoop, trySupport, supportTick };
})(typeof window !== 'undefined' ? window : globalThis);
