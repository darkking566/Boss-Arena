'use strict';
// 狀態效果系統：註冊表（BD.defineStatus）＋ 通用輔助函式（施加 / 移除 / 查詢 / 修正值 / 持續傷害 / 逐幀更新）
// 每個狀態定義於 js/engine/statuses/；狀態可替代舊有的旗標（iframe / invuln / 硬直 …），也可作為全新內容。
// 單位物件只需是任意物件（Boss 或召喚物皆可）；u.statuses 不存在時視為空（讀取）或自動建立（施加）。
// 不觸碰 DOM / Canvas，Node 模擬可直接載入。
(function (G) {
  const BD = G.BD;

  // 修正值種類：mul = 相乘倍率，and = 全部成立才為真，or = 任一成立即為真
  BD.MOD_KEYS = {
    speedMul: 'mul', dmgTakenMul: 'mul', dmgDealtMul: 'mul', canAct: 'and', canMove: 'and', canDodge: 'and',
    invuln: 'or', iframe: 'or', untargetable: 'or', noCollide: 'or', counter: 'or',
  };
  BD.STATUS_STACKING = ['refresh', 'stack', 'max'];
  const MOD_KEYS = BD.MOD_KEYS, STACKING = BD.STATUS_STACKING;
  const statusDefs = BD.statusDefs = {};

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  // ── 註冊 ──
  // BD.defineStatus(id, spec)：重複 id、未知的堆疊模式 / 修正值、型別不符、stack 卻沒有 maxStacks、缺少名稱都會丟出錯誤
  BD.defineStatus = function (id, spec) {
    if (typeof id !== 'string' || !id) throw new Error('defineStatus：狀態必須有字串 id');
    if (statusDefs[id]) throw new Error(`defineStatus：狀態「${id}」重複定義`);
    if (!spec || typeof spec.name !== 'string' || !spec.name) throw new Error(`defineStatus：狀態「${id}」缺少名稱 name`);
    const def = Object.assign({ id, tags: [], stacking: 'max', maxStacks: 1, order: 0, modifiers: {}, hud: true, visual: id, bindState: null }, spec);
    if (STACKING.indexOf(def.stacking) < 0) throw new Error(`defineStatus：狀態「${id}」的堆疊模式「${def.stacking}」無效`);
    if (def.stacking === 'stack' && !(isNum(def.maxStacks) && def.maxStacks >= 1)) throw new Error(`defineStatus：狀態「${id}」使用 stack 堆疊但缺少 maxStacks（>= 1）`);
    const mods = def.modifiers || {};
    for (const k in mods) {
      const kind = MOD_KEYS[k];
      if (!kind) throw new Error(`defineStatus：狀態「${id}」有未知的修正值「${k}」`);
      const v = mods[k];
      if (kind === 'mul') {
        if (!isNum(v) && typeof v !== 'function') throw new Error(`defineStatus：狀態「${id}」的修正值「${k}」必須是數字或函式`);
      } else if (typeof v !== 'boolean' && typeof v !== 'function') {
        throw new Error(`defineStatus：狀態「${id}」的修正值「${k}」必須是布林值`);
      }
    }
    if (!isNum(def.order)) def.order = 0;
    def.tags = Array.isArray(def.tags) ? def.tags : [];
    statusDefs[id] = def;
    return def;
  };
  BD.statusDef = function (id) {
    const def = statusDefs[id];
    if (!def) throw new Error(`未註冊的狀態「${id}」——請以 BD.defineStatus 註冊（js/engine/statuses/）`);
    return def;
  };

  // ── 內部工具 ──
  // 是否處於活動中：綁定狀態者看 u.state，其餘看剩餘時間
  function isActive(u, st) {
    if (!st) return false;
    if (st.def.bindState) return u.state === st.def.bindState;
    return st.rem > 0;
  }
  function remaining(u, st) {
    if (st.def.bindState) return (u.stateDur || 0) - (u.stateT || 0);
    return st.rem;
  }
  // 取得目前生效中的同 id 項目（沒有則回傳 null）
  function activeEntry(u, id) {
    const list = u.statuses;
    if (!list) return null;
    for (let i = 0; i < list.length; i++) if (list[i].id === id && isActive(u, list[i])) return list[i];
    return null;
  }
  function pendingWorld(u, w) { return w || (u && u.world) || null; }

  // ── 施加 / 移除 ──
  BD.applyStatus = function (u, id, opts, w) {
    const def = BD.statusDef(id);
    opts = opts || {};
    if (!u.statuses) u.statuses = [];
    w = pendingWorld(u, w);
    let st = activeEntry(u, id), isNew = false;
    if (!st) {
      // 先清掉已失效（時間到 / 狀態已結束）的同一狀態，不再呼叫 onRemove
      if (u.statuses.length) u.statuses = u.statuses.filter((e) => !(e.id === id && !isActive(u, e)));
      const dur = opts.dur !== undefined ? opts.dur : (def.defaultDur !== undefined ? def.defaultDur : Infinity);
      st = {
        id, def,
        rem: dur,
        stacks: Math.min(def.maxStacks, opts.stacks || 1),
        source: opts.source || null,
        data: opts.data !== undefined ? opts.data : null,
        value: opts.value !== undefined ? opts.value : 0,
        t: 0,
      };
      u.statuses.push(st); isNew = true;
      // 綁定狀態的剩餘時間以 u.stateDur / u.stateT 為準，這裡不覆寫 rem
    } else {
      const dur = opts.dur !== undefined ? opts.dur : (def.defaultDur !== undefined ? def.defaultDur : Infinity);
      const mode = opts.stacking || def.stacking;
      if (mode === 'refresh') st.rem = dur;
      else if (mode === 'max') st.rem = Math.max(st.rem, dur);
      else if (mode === 'stack') { st.stacks = Math.min(def.maxStacks, st.stacks + (opts.stacks || 1)); st.rem = dur; }
      if (opts.source) st.source = opts.source;
      if (opts.data !== undefined) st.data = opts.data;
      if (opts.value !== undefined) st.value = opts.value;
    }
    if (def.onApply) def.onApply(u, st, opts, w, isNew);
    return st;
  };

  BD.removeStatus = function (u, id, reason, w) {
    const list = u && u.statuses;
    if (!list || !list.length) return false;
    const keep = []; let removed = false;
    w = pendingWorld(u, w);
    for (const st of list) {
      if (st.id !== id) { keep.push(st); continue; }
      removed = true;
      if (st.def.onRemove && isActive(u, st)) st.def.onRemove(u, st, w, reason || 'remove');
    }
    if (removed) u.statuses = keep;
    return removed;
  };

  // ── 查詢 ──
  BD.getStatus = function (u, id) { return u ? activeEntry(u, id) : null; };
  BD.hasStatus = function (u, id) { return !!activeEntry(u, id); };
  BD.statusRemaining = function (u, id) {
    const st = activeEntry(u, id);
    return st ? remaining(u, st) : 0;
  };
  BD.activeStatuses = function (u) {
    const out = [], list = u && u.statuses;
    if (!list) return out;
    for (const st of list) if (isActive(u, st)) out.push(st);
    return out;
  };
  BD.statusesByTag = function (u, tag) {
    const out = [];
    for (const st of BD.activeStatuses(u)) if (st.def.tags.indexOf(tag) >= 0) out.push(st);
    return out;
  };

  // ── 修正值 ──
  function modValue(u, st, v) { return typeof v === 'function' ? v(u, st) : v; }

  BD.getMod = function (u, key) {
    const kind = MOD_KEYS[key];
    if (!kind) throw new Error(`getMod：未知的修正值「${key}」`);
    const list = u && u.statuses;
    if (!list || !list.length) return kind === 'mul' ? 1 : kind === 'and';
    if (kind === 'mul') {
      let x = 1;
      for (const st of list) {
        if (!isActive(u, st)) continue;
        const v = st.def.modifiers[key];
        if (v === undefined) continue;
        x = x * modValue(u, st, v);
      }
      return x;
    }
    if (kind === 'and') {
      for (const st of list) {
        if (!isActive(u, st)) continue;
        const v = st.def.modifiers[key];
        if (v !== undefined && modValue(u, st, v) === false) return false;
      }
      return true;
    }
    for (const st of list) {
      if (!isActive(u, st)) continue;
      const v = st.def.modifiers[key];
      if (v !== undefined && modValue(u, st, v) === true) return true;
    }
    return false;
  };

  // scaleMod：依 def.order 由小到大（穩定排序）依序相乘；沒有任何倍率時原封不動回傳 base
  BD.scaleMod = function (u, key, base) {
    if (MOD_KEYS[key] !== 'mul') throw new Error(`scaleMod：修正值「${key}」不是 mul 類型`);
    const list = u && u.statuses;
    if (!list || !list.length) return base;
    let list2 = null;
    for (const st of list) {
      if (!isActive(u, st)) continue;
      if (st.def.modifiers[key] === undefined) continue;
      if (!list2) list2 = [];
      list2.push(st);
    }
    if (!list2) return base;
    if (list2.length > 1) list2.sort((a, b) => (a.def.order || 0) - (b.def.order || 0));
    let x = base;
    for (const st of list2) x = x * modValue(u, st, st.def.modifiers[key]);
    return x;
  };

  // ── 傷害吸收 ──
  BD.absorbDamage = function (u, dmg, w) {
    const list = u && u.statuses;
    if (!list || !list.length) return dmg;
    w = pendingWorld(u, w);
    for (const st of list) {
      if (!st.def.absorb || !isActive(u, st)) continue;
      dmg = st.def.absorb(u, st, dmg, w);
    }
    return dmg;
  };

  // ── 逐幀更新 ──
  BD.tickStatuses = function (u, dt, w) {
    const list = u && u.statuses;
    if (!list || !list.length) return;
    w = pendingWorld(u, w);
    const copy = list.slice(), gone = [];
    for (const st of copy) {
      if (st.def.bindState) {
        if (!isActive(u, st)) {
          gone.push(st);
          if (st.def.onRemove) st.def.onRemove(u, st, w, 'end');
        }
        continue;
      }
      st.t += dt; st.rem -= dt;
      if (st.def.onTick && u.statuses.indexOf(st) >= 0) st.def.onTick(u, st, dt, w);
      if (st.rem <= 0) {
        gone.push(st);
        if (st.def.onRemove) st.def.onRemove(u, st, w, 'expire');
      }
    }
    if (gone.length) u.statuses = u.statuses.filter((s) => gone.indexOf(s) < 0);
  };

  BD.dotDps = function (u) {
    const list = u && u.statuses;
    if (!list || !list.length) return 0;
    let sum = 0;
    for (const st of list) {
      if (!isActive(u, st) || !st.def.dps) continue;
      sum += typeof st.def.dps === 'function' ? st.def.dps(u, st) : st.def.dps;
    }
    return sum;
  };

  // 持續傷害（燃燒 / 中毒 / 流血共用）：統一走 world.damageUnit；沒有 world 時直接忽略
  BD.statusDamage = function (w, u, st, dmg) {
    if (!w) return;
    w.damageUnit(st.source || null, u, { dmg, posture: 0, dot: true, unblockable: true, noPerfect: true, ignoreIframe: true, statusDmg: st.id });
  };

  // ── 時間軸動作：status ──
  // 對「敵人」施加狀態（a.target === 'enemy'）或對自己施加（預設）；沒有中繼資料 → 不算出招中
  BD.defineAction('status', function (w, b, inst, a) {
    return BD.applyStatus(a.target === 'enemy' ? b.enemy : b, a.id, { dur: a.dur, stacks: a.stacks, value: a.value, source: b }, w);
  });
})(typeof window !== 'undefined' ? window : globalThis);
