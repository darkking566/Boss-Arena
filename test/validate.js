// 資料驗證：Boss 定義、技能時間軸、召喚物、繪圖樣式、AI 參數與二階段說明是否一致（node test/validate.js）
'use strict';
const fs = require('fs'), path = require('path');
const { load, scriptList, ROOT } = require('./lib/load');
const { BD } = load({ render: true });
const R = BD.Render || {};
const errors = [], warns = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const num = (v) => typeof v === 'number' && isFinite(v);
const inR = (v, a, b) => num(v) && v >= a && v <= b;

// ── 註冊表（重構後由 registry 提供；舊版則從原始碼推得，讓驗證在每個階段都能跑） ──
const src = (f) => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { return ''; } };
const actions = BD.actions ? BD.actions : Object.fromEntries([...BD.runAction.toString().matchAll(/case '(\w+)'/g)].map((m) => [m[1], {}]));
const minionKinds = BD.minionTypes ? Object.keys(BD.minionTypes) : [...new Set([...src('js/skills.js').matchAll(/kind === '(\w+)'/g)].map((m) => m[1]))];
const styles = R.bossStyles ? Object.keys(R.bossStyles) : [...R.drawBossBody.toString().matchAll(/case '(\w+)'/g)].map((m) => m[1]);
const minionStyles = R.minionStyles ? Object.keys(R.minionStyles) : minionKinds;
const traits = BD.traits || null;
const bosses = BD.bosses || BD.BOSSES;
const TAGS = new Set(['swapdodge', 'lock', 'melee', 'gap', 'aoe', 'ranged', 'zone', 'fast', 'defensive', 'escape', 'trap', 'summon', 'counter', 'basic', 'windwall']);
const AI_PROB = ['aggression', 'dodge', 'precision', 'reaction', 'strafe', 'walk', 'feint', 'delay', 'retreat', 'punish', 'nervous', 'patience', 'read', 'counter', 'resetFlip'];
const AURAS = new Set(['fire', 'flame', 'frost', 'poison', 'shadow']);
const NEEDS_DUR = new Set(['tele', 'dash', 'counter', 'circle', 'invuln', 'rain']);
// 已知的動作旗標：undodgeable（無法閃避：無視翻滾 / 衝刺無敵幀，仍受 invuln / untargetable 保護）只能放在會造成傷害的動作上
const UNDODGEABLE_ACTS = new Set(['hit', 'trap', 'proj', 'tele']);

// ── Boss ──
const ids = new Set();
for (const def of bosses) {
  const W = `boss ${def.id}`;
  if (ids.has(def.id)) err(W, '重複的 id'); ids.add(def.id);
  for (const k of ['id', 'name', 'title', 'archetype', 'desc', 'color', 'color2', 'glow', 'style'])
    if (typeof def[k] !== 'string' || !def[k]) err(W, `缺少字串欄位 ${k}`);
  if (!inR(def.radius, 10, 120)) err(W, `radius ${def.radius} 不合理`);
  if (!inR(def.maxHp, 500, 10000)) err(W, `maxHp ${def.maxHp} 不合理`);
  if (!inR(def.speed, 60, 500)) err(W, `speed ${def.speed} 不合理`);
  if (!inR(def.turn, 1, 20)) err(W, `turn ${def.turn} 不合理`);
  if (!inR(def.mass, 0.3, 4)) err(W, `mass ${def.mass} 不合理`);
  if (!def.stamina || !inR(def.stamina.max, 30, 300) || !inR(def.stamina.regen, 5, 100)) err(W, 'stamina 不合理');
  if (!inR(def.posture, 30, 500)) err(W, `posture ${def.posture} 不合理`);
  if (!inR(def.dodgeCost, 1, 60) || !inR(def.dodgeSpeed, 200, 1000)) err(W, 'dodge 參數不合理');
  if (!styles.includes(def.style)) err(W, `style '${def.style}' 沒有對應的繪圖樣式（R.defineBossStyle）`);
  // AI
  const ai = def.ai || {};
  for (const k of AI_PROB) if (ai[k] != null && !inR(ai[k], 0, 1)) err(W, `ai.${k}=${ai[k]} 應介於 0~1`);
  for (const k of ['aggression', 'dodge', 'precision', 'reaction', 'walk']) if (ai[k] == null) err(W, `ai.${k} 未設定`);
  if (!Array.isArray(ai.prefRange) || !(ai.prefRange[0] >= 0 && ai.prefRange[0] < ai.prefRange[1] && ai.prefRange[1] <= 1200)) err(W, 'ai.prefRange 不合理');
  if (ai.resetFlip && !def.skills.some((s) => s.id === ai.resetSkill)) err(W, `ai.resetFlip 需要 ai.resetSkill 指向存在的技能（目前 ${ai.resetSkill}）`);
  // 特性
  if (traits) for (const t of def.traits || []) if (!traits[t]) err(W, `trait '${t}' 未註冊（BD.defineTrait）`);
  // 二階段
  const p2 = def.phase2 || {};
  if (!inR(p2.speedMul, 0.8, 2) || !inR(p2.dmgMul, 0.8, 2) || !inR(p2.cdMul, 0.3, 1.2)) err(W, 'phase2 倍率不合理');
  if (typeof p2.line !== 'string' || typeof p2.note !== 'string') err(W, 'phase2.line / note 缺少');
  if (/[+＋\-−]\s*\d+\s*[%％]/.test(p2.note || '')) err(W, 'phase2.note 不可手寫百分比數值——由 speedMul/dmgMul/cdMul 自動產生');
  if (p2.aura && !AURAS.has(p2.aura)) err(W, `phase2.aura '${p2.aura}' 未知`);
  if (p2.transDur != null && p2.roarAt != null && !(p2.roarAt < p2.transDur)) err(W, 'phase2.roarAt 必須小於 transDur');
  const summary = (BD.phase2Summary || BD.describePhase2)(def);
  for (const [m, label] of [[p2.speedMul, '速度'], [p2.dmgMul, '傷害'], [p2.cdMul, '冷卻']]) {
    const n = Math.round((m - 1) * 100), want = `${label} ${n >= 0 ? '+' : '−'}${Math.abs(n)}%`;
    if (!summary.includes(want)) err(W, `二階段說明缺少「${want}」`);
  }
  // 技能
  const skills = def.skills || [];
  if (skills.length < 6) err(W, `技能只有 ${skills.length} 個（至少 6）`);
  const sids = new Set();
  for (const s of skills) {
    const S = `${W} skill ${s.id}`;
    if (sids.has(s.id) || s.id === 'ult' || s.id === 'riposte') err(S, '技能 id 重複或使用保留字'); sids.add(s.id);
    if (!s.name || !s.short) err(S, '缺少 name / short');
    if (!inR(s.cd, (s.tags || []).includes('basic') ? 0 : 0.5, 60)) err(S, `cd ${s.cd} 不合理`);
    if (!inR(s.cost || 0, 0, 100)) err(S, `cost ${s.cost} 不合理`);
    if (s.cost > def.stamina.max) err(S, 'cost 超過體力上限');
    checkRange(S, s.range);
    if (s.phase != null && ![1, 2].includes(s.phase)) err(S, 'phase 應為 1 或 2');
    if (s.maxPhase != null && ![1, 2].includes(s.maxPhase)) err(S, 'maxPhase 應為 1 或 2');
    if (s.track != null && !inR(s.track, 0, 30)) err(S, 'track 不合理');
    if (s.recovery != null && !inR(s.recovery, 0, 3)) err(S, 'recovery 不合理');
    for (const t of s.tags || []) if (!TAGS.has(t)) err(S, `未知 tag '${t}'`);
    if (s.summonCap != null && (!minionKinds.includes(s.summonKind) || !(s.summonCap > 0))) err(S, 'summonCap / summonKind 不合理');
    checkTimeline(S, def, s.actions); if (s.actions2) checkTimeline(S + '(二階段)', def, s.actions2);
  }
  const u = def.ultimate || {};
  if (!u.ult || !u.name || !u.desc) err(`${W} ultimate`, '必須有 ult:true、name、desc');
  checkRange(`${W} ultimate`, u.range);
  checkTimeline(`${W} ultimate`, def, u.actions); if (u.actions2) checkTimeline(`${W} ultimate(二階段)`, def, u.actions2);
}
function checkRange(S, r) { if (!Array.isArray(r) || !(r[0] >= 0 && r[0] < r[1] && r[1] <= 2000)) err(S, `range ${JSON.stringify(r)} 不合理`); }
function checkTimeline(S, def, list) {
  if (!Array.isArray(list) || !list.length) return err(S, '時間軸為空');
  const marks = new Set(list.filter((a) => a.setMark).map((a) => a.setMark));
  let end = 0;
  for (const a of list) {
    const meta = actions[a.do];
    if (!meta) { err(S, `動作 do:'${a.do}' 未註冊（BD.defineAction）`); continue; }
    if (!inR(a.at, 0, 8)) err(S, `do:${a.do} at=${a.at} 不合理`);
    if (NEEDS_DUR.has(a.do) && !inR(a.dur, 0.01, 5)) err(S, `do:${a.do} 需要合理的 dur（目前 ${a.dur}）`);
    if ((a.anchor === 'mark' || a.do === 'land' || a.do === 'circle') && a.mark && !marks.has(a.mark)) err(S, `do:${a.do} 參照了不存在的標記 '${a.mark}'`);
    if (a.do === 'summon' && !minionKinds.includes(a.kind)) err(S, `召喚種類 '${a.kind}' 沒有對應的召喚物定義（BD.defineMinion）`);
    if (a.do === 'summon' && !minionStyles.includes(a.kind)) err(S, `召喚種類 '${a.kind}' 沒有對應的繪圖樣式（R.defineMinionStyle）`);
    if (meta.requiresTrait && traits && !(def.traits || []).includes(meta.requiresTrait)) err(S, `do:${a.do} 需要 boss trait '${meta.requiresTrait}'`);
    if (num(a.dmg) && !inR(a.dmg, 0, 400)) err(S, `do:${a.do} dmg=${a.dmg} 不合理`);
    if (a.undodgeable !== undefined) {
      if (typeof a.undodgeable !== 'boolean') err(S, `do:${a.do} undodgeable 必須為 true / false`);
      if (!UNDODGEABLE_ACTS.has(a.do)) err(S, `do:${a.do} 不支援 undodgeable（僅 ${[...UNDODGEABLE_ACTS].join('/')}）`);
    }
    end = Math.max(end, a.at + (a.dur || 0));
  }
  if (end > 8) err(S, `時間軸長達 ${end.toFixed(2)} 秒`);
}
// ── 訓練假人（hidden Boss） ──
for (const def of (BD.hiddenBosses || [])) {
  const W = `hidden boss ${def.id}`;
  if (def.hidden !== true) err(W, 'hidden 必須為 true');
  if (bosses.includes(def)) err(W, '不可出現在 bosses 清單');
  if (BD.bossById[def.id] !== def) err(W, 'BD.bossById 未正確對應');
  if (def.id === 'dummy' && def.training !== true) err(W, 'dummy 必須有 training === true');
  if (!styles.includes(def.style)) err(W, `style '${def.style}' 沒有對應的繪圖樣式（R.defineBossStyle）`);
  if (!Array.isArray(def.skills)) err(W, 'skills 必須為陣列');
  if (!def.ultimate || !def.ultimate.ult) err(W, 'ultimate 必須存在');
}
if (!BD.bossById.dummy || !BD.bossById.dummy.hidden) err('dummy', 'BD.bossById.dummy 必須存在且為 hidden');
if (typeof BD.Training !== 'function') err('training', 'BD.Training 必須存在');
if (typeof BD.setupTraining !== 'function') err('training', 'BD.setupTraining 必須存在');
if (typeof BD.DummyController !== 'function') err('training', 'BD.DummyController 必須存在');
if (typeof BD.ManualController !== 'function') err('training', 'BD.ManualController 必須存在');

// 註冊表自我檢查：重複 id 與缺少樣式都必須丟出錯誤
if (BD.registerBoss) { let threw = false; try { BD.registerBoss({ id: bosses[0].id }); } catch (e) { threw = true; } if (!threw) err('registry', 'registerBoss 對重複 id 沒有丟出錯誤'); }
if (R.bossStyle) { let threw = false; try { R.bossStyle('__missing__'); } catch (e) { threw = true; } if (!threw) err('render', 'R.bossStyle 對缺少的樣式沒有丟出錯誤'); }
// 召喚物：每個定義都要有繪圖樣式
for (const k of minionKinds) if (!minionStyles.includes(k)) err(`minion ${k}`, '沒有對應的繪圖樣式');
// ── DOM-free：非 data-browser 腳本不得觸碰 DOM / Canvas ──
for (const s of scriptList()) {
  if (s.browser) continue;
  const code = src(s.src).replace(/\/\/.*$/gm, '').replace(/'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, "''");
  const bad = code.match(/\bdocument\b|\bwindow\.|getContext|\bctx\b|requestAnimationFrame|\bperformance\b/);
  if (bad) err(s.src, `非瀏覽器檔案出現 DOM/Canvas 用法「${bad[0]}」`);
}


// ── 狀態註冊表 / Boss 資料中的狀態參照 / 繪圖圖示 / 移除欄位讀取 ──
const statusDefs = BD.statusDefs || {};
const statusIds = new Set(Object.keys(statusDefs));
const statusList = Object.values(statusDefs);

// 單一定義的驗證（可傳入假定義做自我測試）：回傳錯誤訊息陣列
function checkStatusDef(def) {
  const out = [];
  const id = def && def.id;
  if (!def || typeof def.name !== 'string' || !def.name) out.push(`狀態「${id}」缺少非空字串 name`);
  if (!BD.STATUS_STACKING || BD.STATUS_STACKING.indexOf(def && def.stacking) < 0) out.push(`狀態「${id}」的 stacking「${def && def.stacking}」無效`);
  if (def && def.stacking === 'stack' && !(num(def.maxStacks) && def.maxStacks >= 1)) out.push(`狀態「${id}」使用 stack 但 maxStacks 不合理`);
  const mods = (def && def.modifiers) || {};
  for (const k in mods) {
    const kind = BD.MOD_KEYS && BD.MOD_KEYS[k];
    if (!kind) { out.push(`狀態「${id}」的修正值「${k}」未在 BD.MOD_KEYS`); continue; }
    const v = mods[k];
    if (kind === 'mul' ? !(num(v) || typeof v === 'function') : !(typeof v === 'boolean' || typeof v === 'function')) out.push(`狀態「${id}」的修正值「${k}」型別不符（${kind}）`);
  }
  if (def && !Array.isArray(def.tags)) out.push(`狀態「${id}」的 tags 必須是陣列`);
  if (def && def.bindState != null && typeof def.bindState !== 'string') out.push(`狀態「${id}」的 bindState 必須是 null 或字串`);
  return out;
}
for (const def of statusList) for (const m of checkStatusDef(def)) err(`status ${def.id}`, m);

// ── 連段（僅沉重；資料形式見 js/engine/combo.js 開頭註解）──
const COMBO_ACTS = ['extend', 'delay', 'switch', 'stop'];
const WHEN_KEYS = BD.COMBO_WHEN_KEYS || { landed: 1, rolled: 1, rollDir: 1, dist: 1, sta: 1, phase: 1, enemyState: 1 };
const ROLL_DIRS = BD.COMBO_ROLL_DIRS || ['left', 'right', 'back', 'through'];
// 回傳此 def.ai.combos 的所有問題（純函式，供資料檢查與自我測試共用）
function checkCombos(def) {
  const out = [], bad = (m) => out.push(m);
  const list = def.ai && def.ai.combos;
  if (list == null) return out;
  if (!Array.isArray(list) || !list.length) { bad('ai.combos 必須是非空陣列或省略'); return out; }
  const ids = new Set(), sids = new Set(def.skills.map((s) => s.id));
  const rangeOk = (r) => Array.isArray(r) && r.length === 2 && num(r[0]) && num(r[1]) && r[0] >= 0 && r[0] < r[1];
  list.forEach((c, ci) => {
    const W = `combos[${ci}]`;
    if (!c || typeof c !== 'object') return bad(`${W} 必須是物件`);
    if (typeof c.id !== 'string' || !c.id) bad(`${W}.id 必須是非空字串`);
    else if (ids.has(c.id)) bad(`${W}.id「${c.id}」重複`); else ids.add(c.id);
    if (typeof c.name !== 'string' || !c.name) bad(`${W}.name 必須是非空字串`);
    if (c.phase != null && ![1, 2].includes(c.phase)) bad(`${W}.phase 必須是 1、2 或省略`);
    if (c.weight != null && !(num(c.weight) && c.weight > 0)) bad(`${W}.weight 必須是正數`);
    if (!Array.isArray(c.steps) || c.steps.length < 2 || c.steps.length > 5) { bad(`${W}.steps 必須是 2..5 段`); return; }
    const starts = [];
    c.steps.forEach((st, si) => {
      const P = `${W}.steps[${si}]`;
      if (!st || typeof st !== 'object') return bad(`${P} 必須是物件`);
      if (!sids.has(st.skill)) bad(`${P}.skill「${st.skill}」不是此 Boss 的技能`);
      else if (st.skill === 'ult') bad(`${P}.skill 不可為大招`);
      if (st.skill) starts.push(st.skill);
      if (st.cancel != null && !(num(st.cancel) && st.cancel > 0 && st.cancel <= 2)) bad(`${P}.cancel 必須是 0~2 秒`);
      if (si === 0) {
        if (st.branch) bad(`${P}（第一段）不可有 branch`);
      }
      for (const [ri, r] of (st.branch || []).entries()) {
        const Q = `${P}.branch[${ri}]`;
        if (!COMBO_ACTS.includes(r.do)) bad(`${Q}.do「${r.do}」未知（${COMBO_ACTS.join('/')}）`);
        if (r.do === 'switch' && !sids.has(r.skill)) bad(`${Q}.do:switch 需要存在且非大招的 skill（目前 ${r.skill}）`);
        if (r.do === 'switch' && r.skill === 'ult') bad(`${Q} 不可切換到大招`);
        if (r.do === 'delay' && !(rangeOk(r.hold) && r.hold[1] <= 2)) bad(`${Q}.do:delay 需要 hold:[a,b]（a<b，<=2 秒）`);
        if (r.hold != null && !(rangeOk(r.hold) && r.hold[1] <= 2)) bad(`${Q}.hold 必須是 [a,b]（a<b，<=2 秒）`);
        if (r.chance != null && !inR(r.chance, 0, 1)) bad(`${Q}.chance 必須介於 0~1`);
        if (r.when != null) {
          if (typeof r.when !== 'object') bad(`${Q}.when 必須是物件`);
          else for (const k of Object.keys(r.when)) {
            if (!WHEN_KEYS[k]) bad(`${Q}.when.${k} 未知（可用 ${Object.keys(WHEN_KEYS).join('/')}）`);
            else if (k === 'dist' && !rangeOk(r.when.dist)) bad(`${Q}.when.dist 必須是 [a,b]`);
            else if (k === 'rollDir' && [].concat(r.when.rollDir).some((v) => !ROLL_DIRS.includes(v))) bad(`${Q}.when.rollDir 必須是 ${ROLL_DIRS.join('/')}`);
            else if (k === 'sta' && !inR(r.when.sta, 0, 1)) bad(`${Q}.when.sta 必須介於 0~1`);
            else if (k === 'phase' && ![1, 2].includes(r.when.phase)) bad(`${Q}.when.phase 必須是 1 或 2`);
            else if (k === 'enemyState' && [].concat(r.when.enemyState).some((v) => typeof v !== 'string')) bad(`${Q}.when.enemyState 必須是字串或字串陣列`);
          }
        }
      }
      for (const [ei, ex] of (st.exits || []).entries()) {
        const Q = `${P}.exits[${ei}]`;
        const esk = def.skills.find((s) => s.id === st.skill), nHits = esk && esk.actions ? new Set(esk.actions.filter((a) => BD.action && BD.actions && BD.actions[a.do] ? BD.action(a.do).active : a.do !== 'tele').map((a) => a.at)).size : 20;
        if (!(Number.isInteger(ex.after) && ex.after >= 1 && ex.after <= nHits)) bad(`${Q}.after 必須是 1..${nHits}（該技能的傷害時點數）`);
        if (!['stop', 'next'].includes(ex.then)) bad(`${Q}.then 必須是 'stop' 或 'next'`);
        if (ex.chance != null && !inR(ex.chance, 0, 1)) bad(`${Q}.chance 必須介於 0~1`);
        if (ex.then === 'next' && si + 1 >= c.steps.length) bad(`${Q}.then:next 但後面沒有段落`);
        if (ex.when != null && typeof ex.when !== 'object') bad(`${Q}.when 必須是物件`);
      }
    });
    const op = def.skills.find((s) => s.id === starts[0]);
    const r = c.range || (op && op.range);
    if (!rangeOk(r)) bad(`${W}.range 缺少，且起手技能沒有可用的 range`);
  });
  return out;
}
const comboCount = { boss: 0, combos: 0, steps: 0 };
for (const def of bosses) {
  const ms = checkCombos(def);
  for (const m of ms) err(`boss ${def.id} 連段`, m);
  const list = (def.ai && def.ai.combos) || [];
  if (!ms.length && list.length) { comboCount.boss++; comboCount.combos += list.length; comboCount.steps += list.reduce((a, c) => a + c.steps.length, 0); }
  // 二階段技能只能出現在二階段連段
  for (const c of list) for (const st of c.steps || []) {
    const sk = def.skills.find((s) => s.id === st.skill);
    if (sk && sk.phase === 2 && c.phase !== 2) err(`boss ${def.id} 連段 ${c.id}`, `二階段技能「${sk.id}」只能出現在 phase:2 的連段`);
    if (sk && sk.maxPhase === 1 && c.phase !== 1) err(`boss ${def.id} 連段 ${c.id}`, `僅一階段技能「${sk.id}」只能出現在 phase:1 的連段`);
  }
  for (const r of [].concat(...list.map((c) => (c.steps || []).map((st) => (st.branch || []).filter((x) => x.skill)))).flat()) {
    const sk = def.skills.find((s) => s.id === r.skill);
    if (sk && sk.phase === 2) for (const c of list) if (c.phase !== 2 && (c.steps || []).some((st) => (st.branch || []).includes(r))) err(`boss ${def.id} 連段 ${c.id}`, `switch 到二階段技能「${sk.id}」只能出現在 phase:2 的連段`);
  }
  // 每個階段可起手 2~4 串
  if (list.length) for (const ph of [1, 2]) {
    const n = list.filter((c) => c.phase == null || c.phase === ph).length;
    if (n < 2 || n > 4) err(`boss ${def.id} 連段`, `第 ${ph} 階段可用連段 ${n} 串（應為 2~4）`);
  }
}
// 連段驗證的負向自我測試（不動資料檔）
{
  const base = () => ({ id: 'x', name: 'X', steps: [{ skill: 'a' }, { skill: 'b', cancel: 0.4, branch: [{ do: 'delay', hold: [0.2, 0.4] }] }] });
  const good = () => ({ id: 'ok', skills: [{ id: 'a', range: [0, 100], phase: 1 }, { id: 'b', range: [0, 100], phase: 1 }], ai: { combos: [base()] } });
  if (checkCombos(good()).length) err('combo self-test', '合法連段被誤判：' + checkCombos(good()).join('；'));
  // 二階段技能只放在二階段連段（見下方 checkCombos 之外的全資料檢查）
  const phaseRule = (d) => {
    const list = (d.ai && d.ai.combos) || [];
    return list.flatMap((c) => (c.steps || []).flatMap((st) => {
      const sk = d.skills.find((s) => s.id === st.skill);
      return sk && sk.phase === 2 && c.phase !== 2 ? [`${c.id} 放了二階段技能 ${sk.id}`] : [];
    }));
  };
  if (phaseRule(good()).length) err('combo self-test', '合法連段被階段規則誤判');
  const bads = [
    ['技能不存在', (d) => { d.ai.combos[0].steps[1].skill = 'nope'; }],
    ['大招', (d) => { d.skills.push({ id: 'ult', range: [0, 10] }); d.ai.combos[0].steps[1].skill = 'ult'; }],
    ['一段', (d) => { d.ai.combos[0].steps.pop(); }],
    ['第一段 branch', (d) => { d.ai.combos[0].steps[0].branch = [{ do: 'extend' }]; }],
    ['未知 do', (d) => { d.ai.combos[0].steps[1].branch[0].do = 'teleport'; }],
    ['delay 缺 hold', (d) => { delete d.ai.combos[0].steps[1].branch[0].hold; }],
    ['未知 when 鍵', (d) => { d.ai.combos[0].steps[1].branch[0].when = { mood: true }; }],
    ['chance 超界', (d) => { d.ai.combos[0].steps[1].branch[0].chance = 1.5; }],
    ['switch 缺 skill', (d) => { d.ai.combos[0].steps[1].branch[0] = { do: 'switch' }; }],
    ['重複 id', (d) => { d.ai.combos.push(base()); }],
  ];
  { const d = good(); d.skills[1].phase = 2; if (!phaseRule(d).length) err('combo self-test', '「二階段技能」沒有被檢查出'); }
  for (const [label, mutate] of bads) {
    const d = good(); mutate(d);
    if (!checkCombos(d).length) err('combo self-test', `「${label}」沒有被檢查出`);
  }
}

// 走訪任意 JSON 結構（物件 / 陣列）找出所有 status 欄位與 do:'status' 動作
function walkStatusRefs(node, where, found) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((x, i) => walkStatusRefs(x, `${where}[${i}]`, found)); return; }
  if (node.do === 'status') found.push({ where: `${where}.do(status)`, id: node.id, dur: node.dur });
  if (node.status != null) {
    for (const s of [].concat(node.status)) found.push({ where: `${where}.status`, id: s && s.id, dur: s && s.dur, badShape: !s || typeof s !== 'object' || typeof s.id !== 'string' });
  }
  for (const k in node) {
    if (k === 'status' || k === 'when') continue; // when.status 是連段條件（狀態 id 字串），不是狀態套用
    if (node[k] && typeof node[k] === 'object') walkStatusRefs(node[k], `${where}.${k}`, found);
  }
}
const statusRefs = [];
for (const def of bosses) walkStatusRefs(def, `boss ${def.id}`, statusRefs);
const reportStatusRef = (ref) => {
  if (ref.badShape) return err(ref.where, 'status 必須是含字串 id 的物件（或此類物件的陣列）');
  if (!statusIds.has(ref.id)) err(ref.where, `未註冊的狀態 id「${ref.id}」（BD.defineStatus）`);
  if (ref.dur !== undefined && !(num(ref.dur) && ref.dur > 0)) err(ref.where, `狀態「${ref.id}」的 dur 必須是正數或省略（目前 ${ref.dur}）`);
};
for (const ref of statusRefs) reportStatusRef(ref);

// 繪圖圖示：render 腳本已載入（load({ render: true })）時，每個狀態的 visual 都要有 R.statusIcons 項目
const statusVisuals = new Set(statusList.map((d) => d.visual || d.id));
if (R.statusIcons) {
  for (const v of statusVisuals) if (!R.statusIcons[v]) err(`status ${v}`, `缺少狀態圖示（R.defineStatusIcon '${v}'，js/render/statuses.js）`);
}

// 移除欄位：js/ 底下不得再讀取舊有的 counterT / counterP / slowT / rootT / hidden / invuln / iframe 旗標
// （允許動作資料參數 a.iframe，例如 { do: 'dash', iframe: true }）
const REMOVED = /\.(counterT|counterP|slowT|rootT)\b|\b(b|e|u|this|tgt)\.(hidden|invuln|iframe)\b/;
for (const s of scriptList()) {
  if (!/^js\//.test(s.src)) continue;
  const lines = src(s.src).split('\n');
  lines.forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '');
    const m = code.match(REMOVED);
    if (m) err(`${s.src}:${i + 1}`, `讀取了已移除的狀態欄位「${m[0]}」——請改用 BD.hasStatus / BD.getMod`);
  });
}

// ── 視覺亂數：render / engine 不得再用 Math.random（唯一的例外：world.js 未給種子時建立預設種子）──
for (const s of scriptList()) {
  if (!/^js\/(render|engine)\//.test(s.src)) continue;
  src(s.src).split('\n').forEach((line, i) => {
    if (!/Math\.random/.test(line.replace(/\/\/.*$/, ''))) return;
    if (s.src === 'js/engine/world.js' && /opts\.seed != null/.test(line)) return;
    err(`${s.src}:${i + 1}`, 'Math.random 僅能出現在視覺以外的播種處——繪圖 / 引擎請改用 BD.vrng');
  });
}
// 視覺亂數存在且可重新播種（同種子前 3 個值必須相同）
if (typeof BD.vrng !== 'function') err('vrng', 'BD.vrng 不存在');
else {
  const seq = () => { BD.vrng.seed(1); return [BD.vrng(), BD.vrng(), BD.vrng()]; };
  const a = seq(), b = seq();
  if (!a.every((v, i) => v === b[i] && v >= 0 && v < 1)) err('vrng', 'seeding(1) 後前 3 個值不具決定性');
  BD.vrng.seed(0x9E3779B9);
  if (typeof BD.vrng.range !== 'function') err('vrng', 'BD.vrng.range 不存在');
}

// ── 狀態檢查的自我測試（僅在記憶體中，不動任何資料檔）──
{
  // 未知狀態 id
  const fakeRefs = []; walkStatusRefs({ skills: [{ actions: [{ do: 'hit', status: { id: '__nope__', dur: 2 } }] }] }, 'self', fakeRefs);
  const okId = fakeRefs.length === 1 && fakeRefs[0].id === '__nope__' && !statusIds.has(fakeRefs[0].id);
  if (!okId) err('status self-test', '未知狀態 id 沒有被收集 / 辨識');
  // 未知修正值 key
  if (!checkStatusDef({ id: '__badmod__', name: '壞', stacking: 'max', tags: [], modifiers: { __nope__: 1 } }).length) err('status self-test', '未知修正值 key 沒有被檢查出');
  // 缺少名稱 / 錯誤 tags / 錯誤 bindState
  if (!checkStatusDef({ id: '__noname__', stacking: 'max', tags: [], modifiers: {} }).length) err('status self-test', '缺少 name 沒有被檢查出');
  if (!checkStatusDef({ id: '__badtags__', name: '壞', stacking: 'max', tags: 'x', modifiers: {} }).length) err('status self-test', 'tags 非陣列沒有被檢查出');
  if (!checkStatusDef({ id: '__badbind__', name: '壞', stacking: 'max', tags: [], modifiers: {}, bindState: 3 }).length) err('status self-test', 'bindState 非字串沒有被檢查出');
  // 未知圖示
  if (R.statusIcons && R.statusIcons.__nope__) err('status self-test', '圖示自我測試使用了已存在的 id');
}

// ── 節奏預設驗證（PACES 形狀、light 同一性、各預設的衍生定義）──
if (!BD.PACES || !BD.DEFAULT_PACE || !BD.PACES[BD.DEFAULT_PACE]) err('pace', 'BD.PACES / BD.DEFAULT_PACE 缺少或預設節奏不存在');
else {
  for (const [k, p] of Object.entries(BD.PACES)) {
    if (p.id !== k) err(`pace ${k}`, `id「${p.id}」與鍵名不一致`);
    if (typeof p.name !== 'string' || !p.name) err(`pace ${k}`, '缺少 name');
  }
  if (BD.paceConfig('light', null) !== null) err('pace light', "paceConfig('light') 必須為 null");
  let threw = false; try { BD.paceConfig('__nope__'); } catch (e) { threw = true; }
  if (!threw) err('pace', '未知節奏沒有丟出錯誤');
  const snap = bosses.map((d) => JSON.stringify(d)); if (BD.clearPaceCache) BD.clearPaceCache();
  for (const def of bosses) {
    if (BD.applyPace(def, 'light') != def) err(`pace light ${def.id}`, 'light 必須回傳原始定義（同一物件）');
    for (const k of Object.keys(BD.PACES)) {
      if (k === 'light') continue;
      const cfg = BD.paceConfig(k, def.id), d = BD.applyPace(def, k), W = `pace ${k} ${def.id}`;
      // 注意：no-op 的可能（例如 pace 物件沒有速度倍率時 speed*=undefined）——此處以這項檢查擋下
      if (cfg == null) err(W, 'paceConfig 無法解析此 Boss 的設定');
      else if (typeof cfg.speedMul !== 'number') err(W, '預設缺少 speedMul');
      if (!d.pace || d.paceId !== k) err(W, `衍生定義缺少 pace / paceId（目前 ${d.paceId}）`);
      for (const s of [...(d.skills || []), d.ultimate].filter(Boolean)) {
        if (s.v1 != null || s.v2 != null) err(W, `技能 ${s.id} 在執行前已有 v1/v2 快取`);
        for (const [label, list] of [['actions', s.actions], ['actions2', s.actions2]]) {
          if (!list) continue;
          for (const a of list) {
            if (!num(a.at) || a.at < 0) err(W, `${s.id}.${label} do:${a.do} at=${a.at} 必須 >= 0`);
            if (a.do === 'tele' && !(num(a.dur) && a.dur > 0)) err(W, `${s.id}.${label} tele dur=${a.dur} 必須 > 0`);
          }
        }
      }
    }
  }
  bosses.forEach((d, i) => { if (JSON.stringify(d) !== snap[i]) err(`pace ${d.id}`, 'applyPace 改動了原始定義（必須深拷貝）'); });
}

// ── 特效庫與元素驗證（Boss 資料參照、效果定義、元素主題、執行健全度、DOM-free / 無 RNG、無 fxColor）──
const effects = BD.effects || {};
const effectIds = new Set(Object.keys(effects));
const elements = BD.elements || {};
const elementIds = new Set(Object.keys(elements));
const FX_ALLOWED_KEYS = new Set(['id', 'el', 'scale', 'color', 'intensity', 'weight', 'radius', 'arc', 'life']);
const KNOWN_EXTRAS = new Set(['embers', 'shards', 'bubbles', 'wisps', 'crackle', 'drips', 'runes', 'motes', 'dust']);

// 1. 走訪所有 Boss 動作中的 fx 與 fxEl 參照
function checkFxAction(a, where) {
  if (!a || typeof a !== 'object') return;
  if (a.fx != null) {
    if (typeof a.fx === 'string') {
      if (!effectIds.has(a.fx)) err(where, `未註冊的特效 id「${a.fx}」（BD.defineEffect）`);
    } else if (typeof a.fx === 'object' && a.fx !== null) {
      if (typeof a.fx.id !== 'string' || !a.fx.id) err(where, 'fx 物件缺少字串 id');
      else if (!effectIds.has(a.fx.id)) err(where, `未註冊的特效 id「${a.fx.id}」（BD.defineEffect）`);
      for (const k of Object.keys(a.fx)) {
        if (!FX_ALLOWED_KEYS.has(k)) err(where, `fx 物件不允許的鍵「${k}」`);
      }
      if (a.fx.el != null && !elementIds.has(a.fx.el)) err(where, `未註冊的元素 id「${a.fx.el}」（BD.defineElement）`);
    } else {
      err(where, 'fx 必須為字串或物件');
    }
  }
  if (a.fxEl != null && !elementIds.has(a.fxEl)) err(where, `動作 fxEl「${a.fxEl}」未在 BD.elements 註冊`);
  if (a.hit && typeof a.hit === 'object') checkFxAction(a.hit, `${where}.hit`);
}

for (const def of bosses) {
  const W = `boss ${def.id}`;
  if (def.fxEl != null && !elementIds.has(def.fxEl)) err(W, `fxEl「${def.fxEl}」未在 BD.elements 註冊`);
  if (def.phase2 && def.phase2.transFx != null && !effectIds.has((BD.parseFx(def.phase2.transFx) || {}).id)) err(W, 'phase2.transFx 未註冊的特效 id');
  if (def.phase2 && def.phase2.fxEl != null && !elementIds.has(def.phase2.fxEl)) err(W, `phase2.fxEl「${def.phase2.fxEl}」未在 BD.elements 註冊`);
  for (const s of def.skills || []) {
    (s.actions || []).forEach((a, i) => checkFxAction(a, `${W} skill ${s.id}.actions[${i}]`));
    (s.actions2 || []).forEach((a, i) => checkFxAction(a, `${W} skill ${s.id}.actions2[${i}]`));
  }
  const u = def.ultimate || {};
  (u.actions || []).forEach((a, i) => checkFxAction(a, `${W} ult.actions[${i}]`));
  (u.actions2 || []).forEach((a, i) => checkFxAction(a, `${W} ult.actions2[${i}]`));
}

// 2. 每個效果定義規格
for (const [id, def] of Object.entries(effects)) {
  const W = `effect ${id}`;
  if (typeof def.name !== 'string' || !def.name) err(W, '缺少字串 name（繁中名稱）');
  if (!Array.isArray(BD.EFFECT_CATEGORIES) || !BD.EFFECT_CATEGORIES.includes(def.category)) err(W, `category「${def.category}」不在 BD.EFFECT_CATEGORIES`);
  if (typeof def.desc !== 'string' || !def.desc.trim()) err(W, 'desc 必須為非空字串');
  if (typeof def.spawn !== 'function') err(W, 'spawn 必須為函式');
}

// 3. 每個元素主題規格
for (const [id, el] of Object.entries(elements)) {
  const W = `element ${id}`;
  if (typeof el.name !== 'string' || !el.name) err(W, '缺少字串 name');
  if (typeof el.core !== 'string' || !el.core) err(W, '缺少 core');
  if (typeof el.glow !== 'string' || !el.glow) err(W, '缺少 glow');
  if (typeof el.particle !== 'string' || !el.particle) err(W, '缺少 particle');
  if (el.extra !== null && !KNOWN_EXTRAS.has(el.extra)) err(W, `未知 extra「${el.extra}」`);
}

// 4. 每個效果 × 每個元素在假 world 上執行與更新健全度
if (BD.FX && typeof BD.spawnFx === 'function') {
  for (const effId of Object.keys(effects)) {
    for (const elId of Object.keys(elements)) {
      try {
        const fakeWorld = { fx: new BD.FX(null), pace: null };
        BD.spawnFx(fakeWorld, effId, 100, 100, {
          el: elId, radius: 80, angle: 0, arc: 1.6, len: 200, width: 40, dur: 0.3, life: 0.5,
          pts: [100, 100, 200, 200], toX: 200, toY: 100,
        });
        for (let i = 0; i < 30; i++) fakeWorld.fx.update(0.016);
      } catch (e) {
        err(`spawnFx(${effId}, ${elId})`, `執行拋出例外：${e.message}`);
      }
    }
  }
}

// 5. 特效庫不得使用遊戲或原生亂數（js/fx/*.js 內不出現 w.rng、.rng(、Math.random）
const fxDir = path.join(ROOT, 'js/fx');
if (fs.existsSync(fxDir)) {
  for (const f of fs.readdirSync(fxDir)) {
    if (!f.endsWith('.js')) continue;
    const filePath = `js/fx/${f}`;
    const code = src(filePath).replace(/\/\/.*$/gm, '');
    const badRng = code.match(/w\.rng|\.rng\(|Math\.random/);
    if (badRng) err(filePath, `特效庫檔案不得使用遊戲或原生亂數「${badRng[0]}」——請改用 BD.vrng`);
  }
}

// 6. js/engine/ 與 js/data/ 內不再出現舊的 fxColor
function walkJsFiles(dir, fn) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkJsFiles(full, fn);
    else if (ent.isFile() && ent.name.endsWith('.js')) fn(full);
  }
}
for (const sub of ['js/engine', 'js/data']) {
  const dir = path.join(ROOT, sub);
  if (fs.existsSync(dir)) {
    walkJsFiles(dir, (file) => {
      const rel = path.relative(ROOT, file);
      const lines = src(rel).split('\n');
      lines.forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, '');
        if (/\bfxColor\b/.test(code)) err(`${rel}:${i + 1}`, '出現了已廢棄的舊欄位「fxColor」——請改用 fxEl');
      });
    });
  }
}

// 7. 引擎程式碼中以字串字面值呼叫的特效 id（BD.spawnFx(w, 'id', ...) / K.hitFx(..., 'id', ...) / chargeFx 預設）也必須已註冊
walkJsFiles(path.join(ROOT, 'js/engine'), (file) => {
  const rel = path.relative(ROOT, file), code = src(rel);
  const re = /\b(?:BD\.spawnFx\(\s*[\w.]+\s*,|K\.hitFx\(\s*\w+\s*,\s*\w+\s*,\s*\w+\s*,)\s*(?:[\w.]+\s*\|\|\s*)?'([\w-]+)'/g;
  let m;
  while ((m = re.exec(code))) if (!effectIds.has(m[1])) err(rel, `引擎呼叫了未註冊的特效「${m[1]}」`);
});
// 8. 每個特效以「巨型施放者」（有 src）再跑一次，並確認粒子上限守住
if (BD.FX && typeof BD.spawnFx === 'function') {
  const giant = { x: 300, y: 300, r: 58, face: 0.3, phase: 2, def: { fxEl: 'fire', phase2: { fxEl: 'fire' } }, statuses: [] };
  const fw = { fx: new BD.FX(null), pace: 'heavy' };
  for (const effId of Object.keys(effects)) {
    try {
      for (let rep = 0; rep < 3; rep++) BD.spawnFx(fw, effId, 300, 300, { src: giant, dmg: 240, big: true, heavyHit: true, victim: giant, pts: [10, 10, 50, 50] });
      for (let i = 0; i < 20; i++) fw.fx.update(0.016);
    } catch (e) { err(`spawnFx(${effId}, 巨型施放者)`, `執行拋出例外：${e.message}`); }
  }
  for (let i = 0; i < 400; i++) fw.fx.update(0.016);
  if (fw.fx.parts.length > BD.FX_CAPS.PART_CAP) err('fx', `粒子數 ${fw.fx.parts.length} 超過 PART_CAP`);
  if (fw.fx.timers.length) err('fx', `特效延遲（fx.after）未清空：${fw.fx.timers.length}`);
}
// 9. fx-gallery.html 必須載入 index.html 的所有腳本（同順序，排除 js/input.js / js/main.js / js/training-ui.js / js/touch.js），新增 Boss / 特效檔案時兩邊要同步
{
  const gal = path.join(ROOT, 'fx-gallery.html');
  if (!fs.existsSync(gal)) err('fx-gallery.html', '找不到特效圖鑑頁面');
  else {
    const list = (html) => [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*"([^"]+)"/g)].map((m) => m[1]);
    const want = list(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')).filter((f) => f !== 'js/input.js' && f !== 'js/main.js' && f !== 'js/training-ui.js' && f !== 'js/touch.js' && f !== 'js/hunt-ui.js');
    const have = list(fs.readFileSync(gal, 'utf8')).filter((f) => f !== 'js/fx-gallery.js');
    if (want.join('\n') !== have.join('\n')) {
      const miss = want.filter((f) => !have.includes(f)), extra = have.filter((f) => !want.includes(f));
      err('fx-gallery.html', `腳本清單與 index.html 不一致（缺少：${miss.join(', ') || '無'}；多出：${extra.join(', ') || '無'}；或順序不同）`);
    }
  }
}

console.log(`驗證 ${bosses.length} 位 Boss、${Object.keys(actions).length} 種動作、${minionKinds.length} 種召喚物、${styles.length} 種繪圖樣式、${statusList.length} 種狀態、${statusRefs.length} 處狀態參照、${Object.keys(BD.PACES || {}).length} 種節奏、${comboCount.combos} 串連段（${comboCount.steps} 段，${comboCount.boss} 位 Boss）、${Object.keys(effects).length} 種特效、${Object.keys(elements).length} 種元素`);
for (const w of warns) console.log('WARN ' + w);
for (const e of errors) console.log('ERROR ' + e);
console.log(errors.length ? `VALIDATE FAIL（${errors.length} 項）` : 'VALIDATE PASS');
process.exit(errors.length ? 1 : 0);
