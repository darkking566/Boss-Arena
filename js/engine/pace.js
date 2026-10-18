'use strict';
// 節奏轉換：把 Boss 定義依節奏預設改寫成衍生定義（純資料轉換，不含執行期機制）。
// light 一律回傳原始物件本身（同一參照，零改動）；其他節奏回傳深拷貝並快取。
(function (G) {
  const BD = G.BD;
  const cache = new Map();

  // 依 paceId + bossId 解析出合併後的設定；light / 未知的 light 為 null；未知節奏擲出錯誤
  BD.paceConfig = function (id, bossId) {
    if (id == null || id === 'light') return null;
    const preset = BD.PACES && BD.PACES[id];
    if (!preset) throw new Error(`未知的節奏預設「${id}」（BD.PACES）`);
    const ov = (preset.bosses && preset.bosses[bossId]) || null;
    const cfg = Object.assign({}, preset, ov || {});
    cfg.ai = Object.assign({}, preset.ai, (ov && ov.ai) || {});
    delete cfg.bosses;
    return cfg;
  };

  // 深拷貝：純物件 / 陣列遞迴複製；函式與非純物件（Set / Map / 類別實例…）以參照保留
  function isPlain(v) {
    if (!v || typeof v !== 'object') return false;
    const p = Object.getPrototypeOf(v); // 跨 realm（Node vm / iframe）也成立：原型為 null 或某個 realm 的 Object.prototype
    return p === null || Object.getPrototypeOf(p) === null;
  }
  function clone(v) {
    if (Array.isArray(v)) return v.map(clone);
    if (!isPlain(v)) return v;
    const o = {};
    for (const k in v) o[k] = clone(v[k]);
    return o;
  }

  const EPS = 1e-9;
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const origDmg = (a) => (a && a.dmg != null ? a.dmg : (a && a.hit && a.hit.dmg)) || 0;
  const teleHitIn = (t) => (t.hitIn != null ? t.hitIn : t.dur);

  // 動作層改寫：傷害 / 架勢 / 擊退，大招或高傷害動作為「大」動作，判定與配對預警一併放大
  function makeTransform(cfg, isUlt) {
    return function transform(list) {
      const teles = list.filter((t) => t.do === 'tele');
      const used = new Set();
      for (const a of list) {
        const big = isUlt || origDmg(a) >= cfg.bigDmg;
        for (const o of [a, a.hit, a.final]) {
          if (!o) continue;
          if (isNum(o.dmg)) o.dmg *= cfg.dmgMul;
          if (isNum(o.posture)) o.posture *= cfg.postureMul;
          if (isNum(o.kb)) o.kb *= cfg.kbMul;
        }
        if (!big || a.do !== 'hit') continue;
        const scale = (o) => { for (const k of ['r', 'r0', 'len', 'w']) if (isNum(o[k])) o[k] *= cfg.aoeMul; };
        scale(a);
        for (const t of teles) {
          if (used.has(t) || t.shape !== a.shape) continue;
          if (Math.abs(t.at + teleHitIn(t) - a.at) >= 1e-6) continue;
          used.add(t); scale(t); break;
        }
      }
    };
  }

  // 時間軸重排：每段預警讓其後的動作整體延後（tele 自身的 dur / hitIn 亦同步拉長）
  function makeRetime(cfg) {
    const act = (doName) => BD.action(doName);
    return function retime(list, isU) {
      const arr = list.slice().sort((a, b) => a.at - b.at);
      const extras = new Map();
      for (const t of arr) {
        if (t.do !== 'tele' || t.soft) continue; // 預警本身不是 active 動作
        const H = teleHitIn(t);
        const hitAt = t.at + H;
        let pair = null;
        for (const a of arr) {
          if (a === t) continue;
          if (!act(a.do).active) continue;
          if (Math.abs(a.at - hitAt) < 1e-6) { pair = a; break; }
        }
        if (!pair) continue;
        let extra = H * (cfg.teleMul - 1) + cfg.teleAdd;
        if (isU || origDmg(pair) / cfg.dmgMul >= cfg.bigDmg) extra *= cfg.bigTeleMul; // 先 transform 後 retime：除回 dmgMul 得原始傷害
        extras.set(t, extra);
      }
      const warp = (x) => {
        let y = x + (x > EPS ? cfg.leadIn : 0);
        for (const [t, ex] of extras) if (t.at < x - EPS) y += ex;
        return y;
      };
      const out = arr.map((a) => {
        const o = Object.assign({}, a);
        const T = a.at;
        o.at = warp(T);
        if (a.do === 'tele') {
          o.dur = warp(T + a.dur) - o.at;
          if (a.hitIn != null) o.hitIn = warp(T + a.hitIn) - o.at;
        }
        return o;
      });
      return out;
    };
  }

  function derive(def, cfg, paceId) {
    const d = clone(def);
    d.pace = cfg; d.paceId = paceId;
    d.speed *= cfg.speedMul; d.turn *= cfg.turnMul;
    if (isNum(cfg.hpMul)) d.maxHp = Math.round(d.maxHp * cfg.hpMul); // 沉重：較耐打（一擊更重但對戰長度維持 90–150 秒）
    if (isNum(cfg.postureMaxMul)) d.posture = Math.round(d.posture * cfg.postureMaxMul);
    if (d.stamina) d.stamina.regen *= cfg.regenMul;
    if (isNum(d.dodgeCost)) d.dodgeCost *= cfg.dodgeCostMul;
    if (d.ai) {
      const ai = d.ai;
      if (isNum(ai.aggression)) ai.aggression *= cfg.ai.aggressionMul;
      if (isNum(ai.patience)) ai.patience = Math.min(0.95, ai.patience + cfg.ai.patienceAdd);
      ai.feint = Math.min(0.6, (ai.feint || 0) * cfg.ai.feintMul);
      ai.gapMul = cfg.ai.gapMul; ai.midWait = cfg.ai.midWait; ai.stalk = cfg.ai.stalk; // 之後由 AI 讀取
      if (cfg.ai.feat) ai.feat = clone(cfg.ai.feat); // 沉重限定機制（連段）；light 永遠不讀
    }
    const doSkill = (s, isUlt) => {
      delete s.v1; delete s.v2; // 清除 BD.prepSkill 的快取時間軸
      if (isNum(s.cd)) s.cd *= cfg.cdMul;
      if (isNum(s.cost)) s.cost *= cfg.costMul;
      if (isNum(s.track)) s.track *= cfg.trackMul;
      s.recovery = (s.recovery == null ? 0.5 : s.recovery) * cfg.recoveryMul + cfg.recoveryAdd;
      for (const key of ['actions', 'actions2']) {
        if (!Array.isArray(s[key])) continue;
        const list = clone(s[key]);
        makeTransform(cfg, isUlt)(list);
        s[key] = makeRetime(cfg)(list, isUlt);
      }
    };
    for (const s of d.skills || []) doSkill(s, false);
    if (d.ultimate) doSkill(d.ultimate, true);
    return d;
  }

  // 套用節奏：light 回傳原物件；其他節奏回傳快取的衍生定義
  BD.applyPace = function (def, paceId) {
    const cfg = BD.paceConfig(paceId, def.id);
    if (cfg == null) return def;
    const key = paceId + ':' + def.id;
    let d = cache.get(key);
    if (!d) { d = derive(def, cfg, paceId); cache.set(key, d); }
    return d;
  };
  BD.clearPaceCache = function () { cache.clear(); };

  BD.pace = { config: BD.paceConfig, apply: BD.applyPace };
})(typeof window !== 'undefined' ? window : globalThis);
