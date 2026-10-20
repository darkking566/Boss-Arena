'use strict';
// 獵魂模式（Soul Hunt）引擎：存檔、靈魂經濟（解鎖 / 鍛造 / 強化）、主角定義建構、藥水。不碰 DOM / Canvas。
// 主角是一個 hero 定義（不進註冊表），用同一個 Boss 引擎、PlayerController 操控；World 以 opts.hunt 啟用（見 BD.setupHunt）。
(function (G) {
  const BD = G.BD, H = BD.HUNT;
  const PCT = { dmg: '傷害', def: '減傷', spd: '移速', cdr: '冷卻縮減', lifesteal: '吸血', staRegen: '體力回復', manaRegen: '法力回復' };
  const FLAT = { hp: '生命', sta: '體力', mana: '法力' };
  const CAP = { def: 0.6, cdr: 0.5, spd: 0.4, lifesteal: 0.15 };
  // 含這些動作的招式不能借用（需要 Boss 專屬特性 / 召喚物 / 影子等狀態）
  const DENY = new Set(['summon', 'shadow', 'swap', 'shadowstep', 'shadowshuriken', 'shadowslash', 'vitalstep', 'vitalmark']);
  const ok = (msg) => ({ ok: true, msg: msg || '' }), no = (msg) => ({ ok: false, msg });

  function addMods(t, m, k) { for (const x in m) t[x] = (t[x] || 0) + m[x] * (k == null ? 1 : k); return t; }
  function describeMods(m) {
    return Object.keys(m).map((k) => (FLAT[k] ? `${FLAT[k]} +${m[k]}` : `${PCT[k] || k} +${Math.round(m[k] * 100)}%`)).join('、');
  }
  function clone(v) {
    if (Array.isArray(v)) return v.map(clone);
    if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = clone(v[k]); return o; }
    return v;
  }
  function scaleDmg(o, k) { // 遞迴縮放 dmg / dps
    if (Array.isArray(o)) o.forEach((x) => scaleDmg(x, k));
    else if (o && typeof o === 'object') for (const key in o) { if ((key === 'dmg' || key === 'dps') && typeof o[key] === 'number') o[key] *= k; else scaleDmg(o[key], k); }
  }
  const usable = (s) => (s.actions || []).concat(s.actions2 || []).every((a) => !DENY.has(a.do) && !BD.action(a.do).requiresTrait);

  // ── 能力清單：每位 Boss 的可解鎖項目（每個可用招式、大招、被動各一項）──
  const abilityCache = {};
  function abilitiesOf(bossId) {
    if (abilityCache[bossId]) return abilityCache[bossId];
    const def = BD.bossById[bossId], meta = H.BOSS_META[bossId], list = [];
    for (const s of def.skills) {
      if (!usable(s)) continue;
      list.push({ key: bossId + ':' + s.id, boss: bossId, kind: 'skill', id: s.id, name: s.name, cost: s.phase === 2 ? H.COST.skill2 : H.COST.skill,
        desc: `${s.phase === 2 ? '［二階段招式］' : ''}${(s.tags || []).join('／')}` });
    }
    if (usable(def.ultimate)) list.push({ key: bossId + ':ult', boss: bossId, kind: 'ult', id: 'ult', name: def.ultimate.name, cost: H.COST.ult, desc: def.ultimate.desc || '大招' });
    list.push({ key: bossId + ':passive', boss: bossId, kind: 'passive', id: 'passive', name: meta.passive.name, cost: H.COST.passive, desc: describeMods(meta.passive.mods), mods: meta.passive.mods });
    return (abilityCache[bossId] = list);
  }
  const abilityByKey = (key) => { const id = String(key).split(':')[0]; return BD.bossById[id] && H.BOSS_META[id] ? abilitiesOf(id).find((a) => a.key === key) : null; };

  // ── 裝備 ──
  function piece(bossId, slotId) {
    const meta = H.BOSS_META[bossId], slot = H.SLOTS.find((s) => s.id === slotId), mods = H.ARCH[meta.arch][slotId];
    return { key: bossId + ':' + slotId, boss: bossId, slot: slotId, name: meta.short + slot.suffix, mods, desc: describeMods(mods) };
  }

  // ── 存檔 ──
  function newSave() {
    return { v: 1, souls: {}, kills: {}, unlocked: {}, crafted: {}, equip: { helm: null, chest: null, legs: null, boots: null },
      loadout: { weapon: 'katana', skills: [], ult: null, passives: [] }, upg: {} };
  }
  // 讀檔 / 匯入時整理：補預設值，丟掉無效或未解鎖的項目
  function sanitize(raw) {
    const s = newSave();
    if (!raw || typeof raw !== 'object') return s;
    for (const k of ['souls', 'kills', 'upg']) for (const id in raw[k] || {}) if (Number.isFinite(raw[k][id]) && raw[k][id] > 0) s[k][id] = Math.floor(raw[k][id]);
    for (const k of ['unlocked', 'crafted']) for (const id in raw[k] || {}) if (raw[k][id] === true) s[k][id] = true;
    for (const k in s.unlocked) if (!abilityByKey(k)) delete s.unlocked[k];
    for (const k in s.crafted) { const [b, sl] = k.split(':'); if (!H.BOSS_META[b] || !H.SLOTS.some((x) => x.id === sl)) delete s.crafted[k]; }
    for (const sl of H.SLOTS) { const e = raw.equip && raw.equip[sl.id]; if (e && s.crafted[e + ':' + sl.id]) s.equip[sl.id] = e; }
    const lo = raw.loadout || {};
    if (H.WEAPON_BY_ID[lo.weapon] && !H.WEAPON_BY_ID[lo.weapon].hidden) s.loadout.weapon = lo.weapon;
    const pick = (arr, kind, max) => [...new Set(arr || [])].filter((k) => s.unlocked[k] && abilityByKey(k).kind === kind).slice(0, max);
    s.loadout.skills = pick(lo.skills, 'skill', H.SKILL_SLOTS);
    s.loadout.passives = pick(lo.passives, 'passive', H.PASSIVE_SLOTS);
    s.loadout.ult = pick([lo.ult], 'ult', 1)[0] || null;
    return s;
  }

  // ── 數值彙總 ──
  function setsOf(save) { // 回傳每位集滿 2 / 4 件的 Boss：{ boss, n, bonuses: [{ name, mods }] }
    const out = [];
    for (const id in H.BOSS_META) {
      const n = H.SLOTS.filter((s) => save.equip[s.id] === id).length;
      if (n >= 2) out.push({ boss: id, n, bonuses: [H.BOSS_META[id].set2].concat(n >= 4 ? [H.BOSS_META[id].set4] : []) });
    }
    return out;
  }
  function stats(save) {
    const m = {}, wp = H.WEAPON_BY_ID[save.loadout.weapon];
    addMods(m, wp.bonus);
    for (const k of save.loadout.passives) addMods(m, abilityByKey(k).mods);
    for (const sl of H.SLOTS) if (save.equip[sl.id]) addMods(m, piece(save.equip[sl.id], sl.id).mods);
    for (const s of setsOf(save)) for (const b of s.bonuses) addMods(m, b.mods);
    for (const k in CAP) if (m[k] > CAP[k]) m[k] = CAP[k];
    const up = {}; for (const u of H.UPGRADES) up[u.id] = save.upg[u.id] || 0;
    return { mods: m, up };
  }

  // ── 操作（皆回傳 { ok, msg }，成功時才改動 save）──
  function spend(save, bossId, n) {
    if ((save.souls[bossId] || 0) < n) return false;
    save.souls[bossId] -= n; return true;
  }
  function unlock(save, key) {
    const a = abilityByKey(key);
    if (!a) return no('未知的能力');
    if (save.unlocked[key]) return no('已解鎖');
    if (!spend(save, a.boss, a.cost)) return no(`${BD.bossById[a.boss].name}的靈魂不足（需要 ${a.cost}）`);
    save.unlocked[key] = true; return ok(`解鎖【${a.name}】`);
  }
  function craft(save, bossId, slotId) {
    if (!H.BOSS_META[bossId] || !H.SLOTS.some((s) => s.id === slotId)) return no('未知的裝備');
    const p = piece(bossId, slotId);
    if (save.crafted[p.key]) return no('已製作');
    if (!spend(save, bossId, H.COST.gear)) return no(`${BD.bossById[bossId].name}的靈魂不足（需要 ${H.COST.gear}）`);
    save.crafted[p.key] = true;
    if (!save.equip[slotId]) save.equip[slotId] = bossId;
    return ok(`製作【${p.name}】`);
  }
  function equip(save, slotId, bossId) { // bossId 為 null 表示卸下
    if (!(slotId in save.equip)) return no('未知的欄位');
    if (bossId && !save.crafted[bossId + ':' + slotId]) return no('尚未製作');
    save.equip[slotId] = bossId || null; return ok();
  }
  function toggle(save, key) { // 技能 / 被動 / 大招的裝備開關
    const a = abilityByKey(key), lo = save.loadout;
    if (!a || !save.unlocked[key]) return no('尚未解鎖');
    if (a.kind === 'ult') { lo.ult = lo.ult === key ? null : key; return ok(); }
    const arr = a.kind === 'skill' ? lo.skills : lo.passives, max = a.kind === 'skill' ? H.SKILL_SLOTS : H.PASSIVE_SLOTS, i = arr.indexOf(key);
    if (i >= 0) arr.splice(i, 1);
    else if (arr.length >= max) return no(`${a.kind === 'skill' ? '技能' : '被動'}欄位已滿（${max}）`);
    else arr.push(key);
    return ok();
  }
  const upgradeCost = (save, id) => { const u = H.UPGRADES.find((x) => x.id === id); return u.base + (save.upg[id] || 0) * u.step; };
  function upgrade(save, id, bossId) {
    const u = H.UPGRADES.find((x) => x.id === id), lv = save.upg[id] || 0;
    if (!u) return no('未知的強化');
    if (lv >= u.max) return no('已達上限');
    if (!H.BOSS_META[bossId]) return no('請選擇用哪位 Boss 的靈魂');
    const c = upgradeCost(save, id);
    if (!spend(save, bossId, c)) return no(`${BD.bossById[bossId].name}的靈魂不足（需要 ${c}）`);
    save.upg[id] = lv + 1; return ok(`${u.name} → Lv.${lv + 1}`);
  }
  function reward(save, bossId) { // 擊敗 Boss：掉落靈魂（首殺額外加成）
    const first = !save.kills[bossId], n = H.REWARD.kill + (first ? H.REWARD.first : 0);
    save.souls[bossId] = (save.souls[bossId] || 0) + n; save.kills[bossId] = (save.kills[bossId] || 0) + 1;
    return { souls: n, first };
  }

  // ── 主角定義 ──
  // 借用的 Boss 招式取自該 Boss 的沉重衍生定義，去掉預警、改耗法力、威力乘上魂力係數；id 加上 Boss 前綴避免冷卻互相覆蓋
  function borrow(ab, paceId, k, cdr) {
    const hd = BD.applyPace(BD.bossById[ab.boss], paceId);
    const src = ab.kind === 'ult' ? hd.ultimate : hd.skills.find((s) => s.id === ab.id);
    const c = clone(src);
    delete c.v1; delete c.v2; delete c.phase; delete c.maxPhase;
    for (const key of ['actions', 'actions2']) if (c[key]) c[key] = c[key].filter((a) => a.do !== 'tele');
    scaleDmg(c, k);
    c.id = ab.boss + ':' + c.id; c.res = 'mana'; c.cost = Math.round((c.cost || 0) * 0.8);
    if (ab.kind !== 'ult') c.cd = (c.cd || 1) * (1 - cdr);
    return c;
  }
  function buildHero(save, paceId) {
    paceId = paceId || 'heavy';
    const wp = H.WEAPON_BY_ID[save.loadout.weapon], { mods: m, up } = stats(save), B = H.BASE;
    const cdr = m.cdr || 0, soulK = B.soulMul * (1 + 0.05 * up.soul);
    const weapon = wp.skills.map((s) => { const c = clone(s); c.cd *= 1 - cdr; return c; });
    const variants = {};
    for (const v of wp.variants || []) { const c = clone(v); c.cd *= 1 - cdr; variants[c.id] = c; }
    const skills = weapon.concat(save.loadout.skills.map((k) => borrow(abilityByKey(k), paceId, soulK, cdr)));
    const ultAb = save.loadout.ult && abilityByKey(save.loadout.ult);
    const def = {
      id: 'hero', hero: true, weapon: wp.id, name: '獵魂者', title: '無名的挑戰者', archetype: wp.name,
      desc: '沒有任何特殊能力的基礎角色，靠武器與從 Boss 身上奪來的靈魂變強。',
      color: '#7fd6ff', color2: '#1b2a3a', glow: '#cfeeff', style: 'hero',
      radius: 27, maxHp: Math.round(B.hp + up.hp * 40 + (m.hp || 0)), speed: 240 * (1 + (m.spd || 0)), turn: 9, mass: 1, fxEl: wp.el, hurt: 'flesh',
      traits: ['hunter'].concat(wp.traits || []), variants, stamina: { max: B.sta + up.sta * 8 + (m.sta || 0), regen: 34 * (1 + (m.staRegen || 0)) },
      mana: { max: B.mana + up.mana * 10 + (m.mana || 0), regen: 5 * (1 + (m.manaRegen || 0)) },
      posture: 90, dodgeCost: 20, dodgeSpeed: 560,
      ai: { prefRange: wp.ai, aggression: 0.6, dodge: 0.6, precision: 0.7, reaction: 0.2, strafe: 0.6, walk: 0.6, feint: 0.1, delay: 0.2, retreat: 0.2, punish: 0.7, nervous: 0.1, patience: 0.5, gapMul: 1.9, midWait: 0.45, stalk: 0.5 },
      phase2: { speedMul: 1, dmgMul: 1, cdMul: 1, line: '', note: '' }, // 佔位：主角沒有二階段（World 以 def.hero 略過階段轉換）
      skills, ultimate: ultAb ? borrow(ultAb, paceId, soulK, 0) : { id: 'ult', name: '—', ult: true, range: [0, 0], actions: [], desc: '' },
      hunt: { dmg: up.atk * 0.04 + (m.dmg || 0), def: m.def || 0, lifesteal: m.lifesteal || 0, potions: B.potions + up.potion },
    };
    const cfg = BD.paceConfig(paceId, 'hero');
    if (cfg) { def.pace = Object.assign({}, cfg, { whiff: 0, dodgeCd: 0.3, dodgeDur: 0.5, accel: 7 }); def.paceId = paceId; } // 主角：無空振硬直、翻滾更俐落
    return def;
  }

  // ── 太刀（魔物獵人式）：氣刃槽 + 練氣等級 + 連段 ──
  // 左鍵連斬 a1→a2→a3 命中累積氣刃；右鍵消耗氣刃 s1→s2→s3→大回旋（大回旋命中提升練氣等級）；見切斬成功回氣並升級。
  const KT = { lv: ['—', '白', '黃', '紅'], mul: [1, 1.05, 1.1, 1.2], chainWin: 0.75, lvTime: 25, idleDecay: 4 };
  const A_CHAIN = ['k_a1', 'k_a2', 'k_a3', 'k_a4', 'k_a5'], S_CHAIN = ['k_s1', 'k_s2', 'k_s3', 'k_spin'];
  function setLevel(b, n) {
    const kt = b.hunt.kt; n = Math.max(0, Math.min(3, n));
    if (n > kt.level) { b.world.fx.text(b.x, b.y - b.r - 36, '練氣：' + KT.lv[n], ['', '#ffffff', '#ffe27a', '#ff5a4a'][n], 22); b.world.fx.sparkle(b.x, b.y, ['', '#ffffff', '#ffe27a', '#ff5a4a'][n], 12, 160, -Math.PI / 2, 1); }
    kt.level = n; kt.lvAt = b.world.time; b.dmgMul = b.hunt.baseDmg * KT.mul[n];
  }
  const LOGIC = {
    katana: {
      init(b) {
        b.spirit = 0; b.maxSpirit = 100; b.kv = {};
        for (const id in b.def.variants) b.kv[id] = BD.prepSkill(b.def.variants[id]);
        for (const s of b.skills) b.kv[s.id] = s;
        b.hunt.kt = { level: 0, lvAt: 0, gainAt: 0, taken: 0, counters: 0 };
      },
      pick(b, idx) {
        if (idx > 1) return b.skills[idx];
        const last = b.world.time - b.lastSkillEnd < KT.chainWin ? b.lastSkillId : null, chain = idx === 0 ? A_CHAIN : S_CHAIN, j = chain.indexOf(last);
        return b.kv[chain[j >= 0 && j < chain.length - 1 ? j + 1 : 0]];
      },
      tick(b, dt) {
        const kt = b.hunt.kt, e = b.enemy, t = b.world.time, sk = b.inst && b.inst.skill;
        const d = e.stats.taken - kt.taken; kt.taken = e.stats.taken;
        if (d > 0 && !(sk && sk.grp === 's')) { b.spirit = Math.min(b.maxSpirit, b.spirit + Math.min(14, d * 0.15)); kt.gainAt = t; } // 氣刃斬本身不回氣
        if (t - kt.gainAt > KT.idleDecay) b.spirit = Math.max(0, b.spirit - 2 * dt);
        if (sk && sk.id === 'k_spin' && b.inst.landed && !b.inst.lvDone) { b.inst.lvDone = true; setLevel(b, kt.level + 1); }
        if (b.stats.counters > kt.counters) { kt.counters = b.stats.counters; b.spirit = Math.min(b.maxSpirit, b.spirit + 30); kt.gainAt = t; setLevel(b, kt.level + 1); }
        if (kt.level > 0 && t - kt.lvAt > KT.lvTime) setLevel(b, kt.level - 1);
      },
    },
  };

  // World 以 opts.hunt 啟用：把主角（隊伍 0）的存檔數值套到單位上
  // 代理：AI 操控主角，與玩家受同樣限制——只能在揮刀窗內彈刀（無法格擋的攻擊彈不了），靠看預警 / 投射物，以約 ±0.05 秒的抖動抓時機
  BD.agentize = function (c) {
    const ai = c.update.bind(c), jit = new Map();
    c.update = (dt) => {
      const b = c.b;
      if (b.canAct()) for (const th of c.scanThreats()) {
        if (th.glow) continue;
        if (!jit.has(th.key)) jit.set(th.key, c.rng.range(-0.05, 0.05));
        if (th.left <= 0.1 + jit.get(th.key) && b.startSkill(b.pick(0))) return;
      }
      ai(dt);
    };
  };
  BD.setupHunt = function (w, opts) {
    const b = w.bosses[0], h = b.def.hunt;
    b.dmgMul = 1 + h.dmg; b.lifesteal = h.lifesteal;
    b.hunt = { hpPotions: h.potions, manaPotions: h.potions, used: 0, baseDmg: b.dmgMul };
    const L = LOGIC[b.def.weapon]; // 武器專屬邏輯（目前只有太刀）
    if (L) { L.init(b); b.hunt.tick = L.tick; b.pick = (i) => L.pick(b, i); }
    if (opts && opts.agent) BD.agentize(b.controller);
    w.enrageAt = 720; // 挑戰 Boss 不必趕時間
    w.hunt = true;
  };
  BD.defineTrait('hunter', { // 裝備 / 被動的減傷
    interceptDamage(w, b, src, p) { const d = b.def.hunt && b.def.hunt.def; if (d && p.dmg) p.dmg *= 1 - d; return null; },
  });

  // 彈刀（拚刀）：左鍵揮刀的前 DEFLECT_WIN 秒內被直接攻擊 → 免傷；近戰反震敵人（傷害 + 架勢），投射物改向打回；成功回氣刃
  const DEFLECT_WIN = 0.2;
  BD.defineTrait('deflect', {
    interceptDamage(w, b, src, p) {
      const i = b.inst;
      if (!i || i.skill.grp !== 'a' || i.t > DEFLECT_WIN || p.dot || p.unblockable || !src) return null;
      const pr = p.proj, U = BD.U;
      w.fx.text(b.x, b.y - b.r - 30, pr ? '彈開！' : '彈刀！', '#ffffff', 24);
      BD.spawnFx(w, 'parry', b.x, b.y, { src: b }); w.hitstop = Math.max(w.hitstop, 0.08);
      if (b.hunt.kt) { b.spirit = Math.min(b.maxSpirit, b.spirit + 12); b.hunt.kt.gainAt = w.time; } b.stats.deflects = (b.stats.deflects || 0) + 1;
      if (pr) { // 依主角面向改變軌跡，換成主角的投射物
        const sp = Math.hypot(pr.vx, pr.vy) * 1.25;
        pr.vx = Math.cos(b.face) * sp; pr.vy = Math.sin(b.face) * sp; pr.team = b.team; pr.owner = b; pr.homing = 0; pr.ret = 0; pr.hitSet = new Set();
        pr.dmg *= 1.5; pr.life = Math.max(pr.life, 1.2); pr.x = b.x + Math.cos(b.face) * (b.r + pr.r + 4); pr.y = b.y + Math.sin(b.face) * (b.r + pr.r + 4);
      } else if (src.isBoss) w.damageBoss(b, src, { dmg: 45, posture: 40, kb: 260, unblockable: true, noPerfect: true });
      return 'deflected';
    },
  });

  // 喝藥水：只能在待機時喝，有短暫硬直；血 / 法力已滿或沒有藥水時不消耗
  function drink(b, kind) {
    const h = b.hunt;
    if (!h || !b.canAct()) return false;
    const hp = kind === 'hp', w = b.world;
    if (hp ? (h.hpPotions <= 0 || b.hp >= b.maxHp) : (h.manaPotions <= 0 || b.mana >= b.maxMana)) return false;
    if (hp) { h.hpPotions--; const n = Math.round(b.maxHp * 0.45); b.hp = Math.min(b.maxHp, b.hp + n); w.fx.text(b.x, b.y - b.r - 14, '+' + n, '#7dffb0', 20); }
    else { h.manaPotions--; const n = Math.round(b.maxMana * 0.7); b.mana = Math.min(b.maxMana, b.mana + n); w.fx.text(b.x, b.y - b.r - 14, '法力 +' + n, '#8fc4ff', 18); }
    w.fx.sparkle(b.x, b.y - 4, hp ? '#7dffb0' : '#8fc4ff', 8, 120, -Math.PI / 2, 1);
    h.used++; b.setState('recover', 0.55);
    return true;
  }

  Object.assign(BD.KIND_EL, { arrow: 'physical', bolt: 'physical', magic: 'arcane' });
  BD.Hunt = { newSave, sanitize, abilitiesOf, abilityByKey, piece, setsOf, stats, describeMods, unlock, craft, equip, toggle, upgrade, upgradeCost, reward, buildHero, drink, usable };
})(typeof window !== 'undefined' ? window : globalThis);
