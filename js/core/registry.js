'use strict';
// 註冊表：Boss、時間軸動作、召喚物種類、Boss 特性（trait）、特效元素 / 特效的集中登記處。
// BD.bosses（陣列，依載入順序）與 BD.bossById 由 registerBoss 產生；動作的 ACTIVE 判定與持續時間由 defineAction 的中繼資料推得。
// 不觸碰 DOM / Canvas，Node 模擬可直接載入。
(function (G) {
  const BD = G.BD;
  const bosses = BD.bosses = [];
  const hiddenBosses = BD.hiddenBosses = [];
  const byId = BD.bossById = {};
  // 舊名稱別名（同一個物件，保持相容）
  BD.BOSSES = bosses; BD.BOSS_BY_ID = byId;

  BD.registerBoss = function (def) {
    if (!def || typeof def.id !== 'string' || !def.id) throw new Error('registerBoss：Boss 定義必須有字串 id');
    if (byId[def.id]) throw new Error(`registerBoss：Boss id 重複「${def.id}」`);
    // hidden（例如訓練假人）不會出現在選角、模擬、ai_stats、fingerprint 清單。
    if (def.hidden) hiddenBosses.push(def);
    else bosses.push(def);
    byId[def.id] = def;
    return def;
  };

  // 強度標示：rank 是階級（分類），stars 是同階級內的強度（1~5，可半顆）；純顯示，不影響戰鬥
  BD.RANKS = { grunt: { name: '小兵' }, miniboss: { name: '小Boss' }, boss: { name: 'Boss' }, legend: { name: '傳說' } };
  BD.starText = (n) => '★'.repeat(Math.floor(n)) + (n % 1 ? '½' : '') + '☆'.repeat(5 - Math.ceil(n));

  // 二階段說明的數值部分由倍率自動產生，避免文字與實際數值脫節
  BD.describePhase2 = function (def) {
    const p = def.phase2, pct = (m) => Math.round((m - 1) * 100), sg = (n) => (n >= 0 ? '+' : '−') + Math.abs(n) + '%';
    return `速度 ${sg(pct(p.speedMul))}、傷害 ${sg(pct(p.dmgMul))}、冷卻 ${sg(pct(p.cdMul))}；${p.note}`;
  };
  BD.phase2Summary = BD.describePhase2;

  // ── 時間軸動作 ──
  // BD.defineAction(name, fn(w, boss, inst, a, target), { active, duration, requiresTrait })
  //   active：此動作屬於「出招中」（決定 windup / activeEnd / 傷害時間點，AI 懲罰判斷依此）
  //   duration：此動作持續 a.dur 秒（計入 activeEnd）
  //   requiresTrait：使用此動作的 Boss 必須具備的 trait（validate 會檢查）
  const actions = BD.actions = {};
  BD.defineAction = function (name, fn, meta) {
    if (actions[name]) throw new Error(`defineAction：動作「${name}」重複定義`);
    if (typeof fn !== 'function') throw new Error(`defineAction：動作「${name}」缺少執行函式`);
    meta = meta || {};
    actions[name] = { name, fn, active: !!meta.active, duration: !!meta.duration, requiresTrait: meta.requiresTrait || null };
    return actions[name];
  };
  BD.action = function (name) {
    const a = actions[name];
    if (!a) throw new Error(`未註冊的時間軸動作 do:'${name}'——請以 BD.defineAction 註冊（js/engine/actions/）`);
    return a;
  };

  // ── 召喚物種類 ──
  // BD.defineMinion(kind, { spawn, update, onDeath, threat, stats, afterSummon, onHitBoss })
  //   spawn(w, owner, m, i, n, target, baseAng) → [x, y]：設定數值並回傳出生位置
  //   update(w, m, dt, enemy, enemyAlive) → 回傳 true 表示本幀不再套用移動（例如自爆）
  //   onDeath(w, m)：被擊殺時（選用）　threat：AI 是否會主動避開　stats()：World.stats 初始欄位
  //   afterSummon(w, owner, a, n)：summon 動作召喚完畢後的規則（選用）　onHitBoss(w, m, boss)：命中 Boss 時（選用）
  const minions = BD.minionTypes = {};
  BD.defineMinion = function (kind, spec) {
    if (minions[kind]) throw new Error(`defineMinion：召喚物「${kind}」重複定義`);
    if (!spec || typeof spec.spawn !== 'function' || typeof spec.update !== 'function') throw new Error(`defineMinion：召喚物「${kind}」需要 spawn() 與 update()`);
    minions[kind] = Object.assign({ kind, threat: false }, spec);
    return minions[kind];
  };
  BD.minionType = function (kind) {
    const m = minions[kind];
    if (!m) throw new Error(`未註冊的召喚物種類「${kind}」——請以 BD.defineMinion 註冊（js/engine/minions/）`);
    return m;
  };

  // ── Boss 特性（trait）：把個別 Boss 的特殊機制從通用程式碼抽出 ──
  // BD.defineTrait(name, { onHit, onDash, interceptDamage, tick(w, b, dt) })；Boss 資料以 traits: ['name', ...] 啟用
  const traits = BD.traits = {};
  BD.defineTrait = function (name, hooks) {
    if (traits[name]) throw new Error(`defineTrait：特性「${name}」重複定義`);
    traits[name] = Object.assign({ name }, hooks);
    return traits[name];
  };
  BD.trait = function (name) {
    const t = traits[name];
    if (!t) throw new Error(`未註冊的 Boss 特性「${name}」——請以 BD.defineTrait 註冊（js/engine/traits.js）`);
    return t;
  };
  // ── 視覺特效庫（純視覺，不影響戰鬥結果）──
  // BD.defineElement(id, { name, core, glow, particle, smoke, decal, extra })：元素主題（顏色 + 額外粒子行為）
  //   core 亮核心色、glow 外光色、particle 粒子色、debris 碎塊色（預設 = particle）、smoke 煙塵色（rgba）、decal 地面痕跡色（rgba）、
  //   extra：額外粒子行為 'embers' 上升餘燼 | 'shards' 冰晶碎片 | 'bubbles' 毒泡 | 'wisps' 暗影絲 |
  //          'crackle' 電弧 | 'drips' 血滴 | 'runes' 秘紋光點 | 'motes' 聖光微粒 | 'dust' 碎石塵（見 js/engine/entities/fx.js 的 motes）
  const elements = BD.elements = {};
  BD.defineElement = function (id, spec) {
    if (elements[id]) throw new Error(`defineElement：元素「${id}」重複定義`);
    if (!spec || !spec.name || !spec.core || !spec.glow || !spec.particle) throw new Error(`defineElement：元素「${id}」需要 name / core / glow / particle`);
    elements[id] = Object.assign({ id, debris: spec.particle, smoke: 'rgba(190,170,140,0.35)', decal: 'rgba(0,0,0,0.28)', extra: null }, spec);
    return elements[id];
  };
  BD.element = function (id) {
    const e = elements[id || 'physical'];
    if (!e) throw new Error(`未註冊的特效元素「${id}」——請以 BD.defineElement 註冊（js/fx/elements.js）`);
    return e;
  };

  // BD.defineEffect(id, { name, category, desc, params, spawn(fx, x, y, o) })
  //   category：EFFECT_CATEGORIES 之一；params：預設參數（會被呼叫端 opts 覆寫）
  //   spawn 只能呼叫 fx 原件（js/engine/entities/fx.js），亂數只能用 BD.vrng（不可用 w.rng，否則行為指紋會改變）
  BD.EFFECT_CATEGORIES = ['斬擊', '突刺', '砸地', '震波', '爆炸', '位移', '投射物', '區域', '增益', '大招', '地形'];
  const effects = BD.effects = {};
  BD.defineEffect = function (id, spec) {
    if (effects[id]) throw new Error(`defineEffect：特效「${id}」重複定義`);
    if (!spec || typeof spec.spawn !== 'function') throw new Error(`defineEffect：特效「${id}」缺少 spawn()`);
    if (!spec.name) throw new Error(`defineEffect：特效「${id}」缺少 name（繁中名稱）`);
    if (BD.EFFECT_CATEGORIES.indexOf(spec.category) < 0) throw new Error(`defineEffect：特效「${id}」的分類「${spec.category}」不在 ${BD.EFFECT_CATEGORIES.join('/')}`);
    effects[id] = Object.assign({ id, desc: '', params: {} }, spec);
    return effects[id];
  };
  BD.effect = function (id) {
    const e = effects[id];
    if (!e) throw new Error(`未註冊的特效 fx:'${id}'——請以 BD.defineEffect 註冊（js/fx/）`);
    return e;
  };
  // 資料中的 fx 欄位：字串 'slam' 或物件 { id:'slam', el:'fire', scale:1.3, ... }；回傳 { id, opts } 或 null
  BD.parseFx = function (spec, el) {
    if (!spec) return null;
    if (typeof spec === 'string') return { id: spec, opts: el ? { el } : {} };
    if (typeof spec === 'object' && spec.id) {
      const opts = {};
      for (const k in spec) if (k !== 'id') opts[k] = spec[k];
      if (el && opts.el == null) opts.el = el;
      return { id: spec.id, opts };
    }
    return null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
