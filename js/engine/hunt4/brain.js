'use strict';
// 狩獵模式（4v1）獵人大腦：跨場學習與存檔結構。不碰 DOM / Canvas（localStorage 由 main.js 讀寫，這裡只處理物件）。
// 三種學習（都是「選項 × 平均回報」的小表，次數上限 CAP，只存統計量）：
//   武器策略 strat[武器][距離段|Boss 狀態] → 出手 / 按兵不動
//   Boss 圖鑑 dex[Boss].sk[招式].lead → 反應招提早多少秒按（早 / 中 / 晚）；.dir → 翻滾方向（照 AI 原方向 / 偏左 / 偏右）
//   熟練度 xp[武器]：場數 × 個性的學習力 → 反應抖動變小、探索變少
//   武器選項 combo[武器][種類|情境] → 驅動給的選項（弓：哪套連招、哪種瓶），回報同武器策略
// 戰鬥內的探索亂數用 (存檔場數, 種子) 決定：同一份存檔 + 同一種子結果相同。
(function (G) {
  const BD = G.BD, U = BD.U, H4 = BD.HUNT4;
  const V = 1, CAP = 200, KEYS = 64, PRIOR_N = 3;
  const LEAD = { e: 0.2, m: 0.1, l: 0.04 }, DIR = { a: 0, l: 1.1, r: -1.1 };
  const ZH = { near: '近', mid: '中距', far: '遠', lo: '低血', open: 'Boss 有破綻', atk: 'Boss 出招中', idle: 'Boss 待機', a: '照原方向', l: '偏左', r: '偏右', }; // F6 顯示用
  const JIT = [0.12, 0.03]; // 反應抖動：新手 → 熟練
  const WIN = { strat: 2.5, react: 0.8, dodge: 0.8, combo: 4, coat: 8, ammo: 20, special: 20 }; // 結算回報的觀察時間（秒）
  const PICKED = new Set(['strat', 'combo', 'coat', 'ammo', 'special']), PICK_ZH = { coat: '選瓶：', ammo: '主力彈：', special: '特殊彈：' }; // 依輸出 − 受傷結算的試驗

  const newSave = () => ({ v: V, matches: 0, hunters: {} });
  const mem = (save, id) => save.hunters[id] || (save.hunters[id] = { xp: {}, strat: {}, dex: {} });
  const sub = (o, k) => o[k] || (o[k] = {});
  const arm = (tab, k) => tab[k] || (tab[k] = [0, 0]);
  function upd(a, r) { a[0] = Math.min(CAP, a[0] + 1); a[1] += (r - a[1]) / a[0]; }
  const mastery = (save, hid, wp) => {
    const hd = H4.HUNTERS.find((x) => x.id === hid), xp = (save.hunters[hid] && save.hunters[hid].xp[wp]) || 0;
    return 1 - Math.exp(-xp * (0.5 + (hd ? hd.persona.learn : 0.5)) / 150);
  };
  // ε-貪婪：先驗值以 PRIOR_N 次假想觀察混入平均（沒經驗時照個性 / 原本 AI 的習慣）
  function choose(tab, prior, eps, rng) {
    const ks = Object.keys(prior);
    if (rng() < eps) return ks[Math.floor(rng() * ks.length)];
    let best = ks[0], bv = -Infinity;
    for (const k of ks) { const a = tab[k] || [0, 0], v = (a[1] * a[0] + prior[k] * PRIOR_N) / (a[0] + PRIOR_N); if (v > bv) { bv = v; best = k; } }
    return best;
  }

  // 圖鑑資訊（選單用）：場數、勝場、被追比例、最軟部位、已摸熟的招式數 / 全部招式數
  function dexInfo(save, hid, bossId) {
    const d = save.hunters[hid] && save.hunters[hid].dex[bossId], def = BD.bossById[bossId];
    const all = def ? def.skills.length + (def.ultimate ? 1 : 0) : 0;
    if (!d) return { fights: 0, wins: 0, known: 0, all, chased: 0, soft: null };
    let known = 0;
    for (const k in d.sk || {}) { const s = d.sk[k], n = (t) => Object.values(t || {}).reduce((a, x) => a + x[0], 0); if (n(s.lead) + n(s.dir) >= 3) known++; }
    let soft = null, sv = -Infinity;
    for (const k in d.soft || {}) if (d.soft[k][0] >= 5 && d.soft[k][1] > sv) { sv = d.soft[k][1]; soft = k; }
    return { fights: d.fights || 0, wins: d.wins || 0, known: Math.min(known, all), all, chased: d.chased || 0, soft };
  }

  // 匯入時的防呆：只留認得的欄位，數字夾在範圍內，表的鍵數有上限
  function sanitize(o) {
    const out = newSave();
    if (!o || typeof o !== 'object' || o.v !== V) return out;
    const num = (x, lo, hi) => (typeof x === 'number' && isFinite(x) ? U.clamp(x, lo, hi) : lo);
    const key = (k) => typeof k === 'string' && k.length <= 40;
    const arms = (t) => { const r = {}; let n = 0; for (const k in t || {}) if (key(k) && Array.isArray(t[k]) && n++ < KEYS) r[k] = [Math.round(num(t[k][0], 0, CAP)), num(t[k][1], -10, 10)]; return r; };
    const table = (t, f) => { const r = {}; let n = 0; for (const k in t || {}) if (key(k) && t[k] && typeof t[k] === 'object' && n++ < KEYS) r[k] = f(t[k]); return r; };
    out.matches = Math.round(num(o.matches, 0, 1e7));
    for (const hd of H4.HUNTERS) {
      const h = o.hunters && o.hunters[hd.id];
      if (!h || typeof h !== 'object') continue;
      const xp = {}; for (const k in h.xp || {}) if (key(k)) xp[k] = Math.round(num(h.xp[k], 0, 1e5));
      out.hunters[hd.id] = { xp, strat: table(h.strat, (wp) => table(wp, arms)), ...(h.combo ? { combo: table(h.combo, (wp) => table(wp, arms)) } : {}),
        dex: table(h.dex, (d) => ({ fights: Math.round(num(d.fights, 0, 1e7)), wins: Math.round(num(d.wins, 0, 1e7)), chased: num(d.chased, 0, 1),
          soft: arms(d.soft), sk: table(d.sk, (s) => ({ lead: arms(s.lead), dir: arms(s.dir) })) })) };
      if (h.gear) out.hunters[hd.id].gear = BD.H4Gear.sanitize(h.gear);
    }
    return out;
  }

  // ── 戰鬥內 ──
  function install(w, st, save) {
    st.save = save; st.brng = U.makeRng(((w.seed >>> 0) * 2654435761 + save.matches * 97 + 13) >>> 0);
    const boss = st.boss, bid = boss.def.id;
    for (const h of st.hunters) {
      const M = mem(save, h.def.hunter), dex = sub(M.dex, bid), p = h.def.persona, rng = st.brng;
      const B = h.brain = { trials: [], holdUntil: 0, chasedT: 0, last: '', used: new Set([h.def.weapon]), res: { react: [0, 0], dodge: [0, 0] } }; // res：本場 [成功, 次數]
      const m = () => mastery(save, h.def.hunter, h.def.weapon), skId = () => (boss.state === 'skill' && boss.inst ? boss.inst.skill.id : null);
      const eps = () => 0.08 + 0.22 * (1 - m());
      const trial = (kind, a, extra) => B.trials.push(Object.assign({ kind, a, until: w.time + WIN[kind], taken: h.stats.taken, dealt: h.stats.dealt }, extra));
      // 武器策略：AI 想出招時決定出手或按兵不動
      const wt = 0.6 + 1.2 * p.care + 0.6 * (1 - p.risk); // 受傷在回報裡的權重：越謹慎越怕痛
      B.gate = (s, d) => {
        if (w.time < B.holdUntil) return null;
        const bs = BD.H4Weapons.open(h) ? 'open' : boss.state === 'skill' ? 'atk' : 'idle', band = (d < 150 ? 'near' : d < 400 ? 'mid' : 'far') + (h.hp < h.maxHp * 0.5 ? '|lo' : '');
        const tab = sub(sub(M.strat, h.def.weapon), band + '|' + bs);
        const go = 0.1 + 0.2 * (p.risk - 0.5) + (bs === 'open' ? 0.2 * p.show : 0) - (bs === 'atk' ? 0.1 * p.patience : 0);
        const k = choose(tab, { go, hold: 0 }, eps(), rng);
        trial('strat', arm(tab, k), { wt });
        B.last = (k === 'go' ? '出手：' : '退開等待：') + (band + '|' + bs).split('|').map((x) => ZH[x]).join('・');
        if (k === 'go') return s;
        B.holdUntil = w.time + 0.5; h.controller.mode = 'retreat'; h.controller.modeT = 0.5; return null; // 等待 = 退開觀察
      };
      // 武器選項：驅動給一組 { id, name, prior }（例如弓的連招 / 瓶），在 kind|key 情境下挑回報最高的（ε-貪婪），回報在 WIN[kind] 秒後結算
      B.pick = (kind, key, opts) => {
        const tab = sub(sub(sub(M, 'combo'), h.def.weapon), kind + '|' + key), prior = {};
        for (const o of opts) prior[o.id] = o.prior;
        const k = choose(tab, prior, eps(), rng);
        trial(kind, arm(tab, k), { wt });
        B.last = (PICK_ZH[kind] || '連招：') + opts.find((o) => o.id === k).name;
        return k;
      };
      // 圖鑑：反應招（彈刀 / 防禦 / 衝撞）的時機；熟練 + 熟悉這招 → 抖動變小
      const pend = new Map();
      h.reactAt = (th) => {
        const id = skId(); if (!id) return 0.1 + rng.range(-JIT[0], JIT[0]);
        const s = sub(sub(dex, 'sk'), id), lead = sub(s, 'lead'), k = choose(lead, { e: 0, m: 0.05, l: 0 }, eps(), rng);
        const fam = Math.min(1, Object.values(lead).reduce((a, x) => a + x[0], 0) / 10), j = JIT[0] - (JIT[0] - JIT[1]) * (0.6 * m() + 0.4 * fam);
        pend.set(th.key, [arm(lead, k), boss.inst.skill.name]); // 名稱先記下：反應時 Boss 可能已收招（投射物還在飛）
        return LEAD[k] + rng.range(-j, j);
      };
      h.onReact = (th) => { const a = pend.get(th.key); if (a) { trial('react', a[0]); B.last = '反應：' + a[1]; } };
      // 圖鑑：Boss 出招時的翻滾方向
      const dodge0 = h.tryDodge.bind(h);
      h.tryDodge = (ang) => {
        const id = skId();
        if (!id || !h.canAct()) return dodge0(ang);
        const dir = sub(sub(sub(dex, 'sk'), id), 'dir'), k = choose(dir, { a: 0.6, l: 0.5, r: 0.5 }, eps(), rng);
        const ok = dodge0(ang + DIR[k]);
        if (ok) { trial('dodge', arm(dir, k)); B.last = `翻滾（${ZH[k]}）：${boss.inst.skill.name}`; }
        return ok;
      };
      B.soft = sub(dex, 'soft');
    }
  }
  // 每幀：結算到期的嘗試（反應 / 翻滾：期間被打到就算失敗）
  function tick(w, st, dt) {
    for (const h of st.hunters) {
      const B = h.brain;
      if (!B) continue;
      if (st.boss._target === h) B.chasedT += dt;
      for (let i = B.trials.length - 1; i >= 0; i--) {
        const t = B.trials[i], hurt = h.stats.taken - t.taken;
        if (PICKED.has(t.kind)) { if (h.state === 'dead') upd(t.a, -3); else if (w.time < t.until && !w.winner) continue; else upd(t.a, U.clamp((h.stats.dealt - t.dealt - hurt * t.wt) / 300, -3, 3)); } // 期間力竭：重罰
        else if (hurt > h.maxHp * 0.02) { upd(t.a, 0); B.res[t.kind][1]++; }
        else if (w.time >= t.until || w.winner) { upd(t.a, 1); B.res[t.kind][0]++; B.res[t.kind][1]++; }
        else continue;
        B.trials.splice(i, 1);
      }
    }
  }
  // 部位手感：實際打出的倍率（combat.js 呼叫）
  const partHit = (h, part, mul) => { if (h.brain) upd(arm(h.brain.soft, part), mul); };
  // 一場結束：場數、熟練經驗、圖鑑的勝場與被追比例
  function end(w, st) {
    const save = st.save, bid = st.boss.def.id, win = w.winner && w.winner.team === 0;
    save.matches++;
    for (const h of st.hunters) {
      const M = mem(save, h.def.hunter), d = sub(M.dex, bid);
      for (const wp of h.brain.used) M.xp[wp] = (M.xp[wp] || 0) + 1;
      d.fights = (d.fights || 0) + 1; if (win) d.wins = (d.wins || 0) + 1;
      d.chased = (d.chased || 0) + (h.brain.chasedT / Math.max(1, w.time) - (d.chased || 0)) / Math.min(d.fights, 20);
    }
  }

  BD.H4Brain = { mem, newSave, sanitize, mastery, dexInfo, install, tick, end, partHit, V };
})(typeof window !== 'undefined' ? window : globalThis);
