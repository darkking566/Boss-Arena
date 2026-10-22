'use strict';
// 連段與分支（僅沉重）：資料驅動的多段連招。light 的 Boss 定義沒有 ai.combos / ai.feat，這裡的函式永遠不會被呼叫。
//
// ── 資料結構（Boss 資料的 ai.combos；驗證見 test/validate.js）──
// def.ai.combos = [ {
//   id: 'hammer', name: '重錘變奏',        // id 每位 Boss 唯一
//   phase: 1 | 2 | undefined,             // 可「起手」的階段；undefined = 兩階段皆可
//   weight: 1,                            // 權重（預設 1）
//   range: [min,max],                     // 選用：起手距離；預設 = 起手技能 range
//   steps: [ step0, step1, ... ]          // 2..5 段
// } ]
// step = {
//   skill: '<本 Boss 技能 id，不可為大招>',
//   cancel: 秒,                           // 選用：前一段「收招剩餘 <= cancel」時即可起手（前段提早結束、不算空振；
//                                         //        已脫離的預警照常繼續）；預設 feat.combo.cancel
//   branch: [ rule, ... ],                // 第 0 段忽略；要起手本段時依序判定，第一條 when 成立且 chance 通過者決定
//   exits: [ { after: n, when, chance, then: 'stop'|'next' } ]
//                                         // 選用：本段第 n 個傷害時點後（+0.12 秒，只判定一次）若成立，
//                                         // 立即砍掉本段剩餘收招（b.cutSkill）並結束（stop）或直接接下一段（next，無視 cancel）
// }
// rule = { when: {...}, chance: 0..1, do: 'extend'|'delay'|'switch'|'stop', skill: '<id>'（switch 必填）,
//          hold: [a,b]（delay 必填、switch 選填：下一段以此延遲起手，仿魂系延遲斬） }
// when 可用的鍵（全部選填，須全部成立）：
//   landed:bool  上一段是否命中（沉重由 world.damageBoss 標記 inst.landed）
//   rolled:bool  對手是否自上一段起手後開始翻滾
//   rollDir:['left'|'right'|'back'|'through']  該翻滾相對我的方向（BD.rollDirOf）
//   dist:[a,b]   目前距離 U.dist(b,e) - e.r*0.6（與 ai.think 相同算法）
//   sta:number   我的體力比例 >= sta
//   phase:1|2    目前階段
//   enemyState:['idle','skill','whiff','knockdown','dodge',...]
// 若沒有規則成立 → 視同 extend。選定的段落若未就緒（可用 / 體力 / 減少後的冷卻門檻）→ 連段以 stopped 結束。
(function (G) {
  const BD = G.BD, U = BD.U;

  // 翻滾方向：rel = angDiff(我→對手, 翻滾角)；|rel| <= PI/4 → back（背向我）；|rel| >= 3PI/4 → through（朝我／穿過我）；rel > 0 → right；否則 left
  BD.rollDirOf = function (me, e, ang) {
    const rel = U.angDiff(U.angTo(me, e), ang);
    if (Math.abs(rel) <= Math.PI / 4) return 'back';
    if (Math.abs(rel) >= Math.PI * 3 / 4) return 'through';
    return rel > 0 ? 'right' : 'left';
  };

  // 減少後的冷卻門檻：技能可用、體力足夠、剩餘冷卻 <= cd * cdGate
  BD.comboReady = function (b, skill, cdGate, costMul) {
    if (!skill || !b.available().includes(skill) || !b.shadowOk(skill)) return false;
    if (b.sta < (skill.cost || 0) * (costMul == null ? 1 : costMul)) return false;
    return (b.cds[skill.id] || 0) <= (skill.cd || 0) * (cdGate == null ? 1 : cdGate);
  };

  const ROLL_DIRS = ['left', 'right', 'back', 'through'];
  const WHEN_KEYS = { landed: 1, rolled: 1, rollDir: 1, dist: 1, sta: 1, phase: 1, enemyState: 1 };

  // 判定一組 when（st = { landed, rolled, rollDir, dist }；其餘即時讀取）
  BD.evalComboWhen = function (ctl, when, st) {
    if (!when) return true;
    const b = ctl.b, e = ctl.e;
    if (when.landed != null && !!when.landed !== !!st.landed) return false;
    if (when.rolled != null && !!when.rolled !== !!st.rolled) return false;
    if (when.rollDir != null && [].concat(when.rollDir).indexOf(st.rollDir) < 0) return false;
    if (when.dist != null && !(st.dist >= when.dist[0] && st.dist <= when.dist[1])) return false;
    if (when.sta != null && !(b.sta / b.maxSta >= when.sta)) return false;
    if (when.phase != null && b.phase !== when.phase) return false;
    if (when.enemyState != null && [].concat(when.enemyState).indexOf(e.state) < 0) return false;
    return true;
  };
  BD.COMBO_WHEN_KEYS = WHEN_KEYS;
  BD.COMBO_ROLL_DIRS = ROLL_DIRS;

  // ─────────── ComboRunner：AIController 的連段狀態機 ───────────
  class ComboRunner {
    constructor(ctl) { this.ctl = ctl; this.c = null; this.rule = null; }
    get b() { return this.ctl.b; }
    get e() { return this.ctl.e; }
    get w() { return this.ctl.w; }
    get feat() { const p = this.ctl.p; return (p && p.feat && p.feat.combo) || null; }

    // 連段統計（沉重限定、延遲建立）
    static stats(b) {
      if (!b.stats.combo) b.stats.combo = { started: 0, steps: 0, extended: 0, delayed: 0, switched: 0, stopped: 0, cut: 0, completed: 0, interrupted: 0 };
      if (!b.stats.comboUse) b.stats.comboUse = {};
      return b.stats;
    }

    dist() { return U.dist(this.b, this.e) - this.e.r * 0.6; }
    costMul() { const m = this.feat.costMul; return m == null ? 1 : m; } // 後續段落的體力折扣
    // 體力是否足夠接下一段（staGate = 至少要留下自身體力上限的比例；連段預留的普攻不扣）
    staOk(sk) {
      const b = this.b, g = this.feat.staGate == null ? 0 : this.feat.staGate;
      if (sk.ult) return true;
      return b.sta - (sk.cost || 0) * this.costMul() >= b.maxSta * g;
    }
    snap() { const c = this.c; return { landed: c.landed, rolled: c.rolled, rollDir: c.rollDir, dist: this.dist() }; }

    start(combo) {
      const b = this.b, w = this.w;
      if (!this.feat || !combo || this.c) return false;
      if (this.ctl.comboCd && (this.ctl.comboCd[combo.id] || 0) > w.time) return false; // 連段冷卻中
      const sk = b.skills.find((s) => s.id === combo.steps[0].skill);
      const h0 = sk && this.ctl.readHold ? this.ctl.readHold(sk) : 0; // 讀習慣：起手也可延遲抓早滾
      const o0 = { quiet: false }; if (h0) o0.hold = h0;
      if (!sk || !b.startSkill(sk, this.ctl.holdOpts ? this.ctl.holdOpts(sk, o0) : o0)) return false;
      if (this.ctl.preAim) this.ctl.preAim(sk); // 讀習慣：起手預判
      const st = ComboRunner.stats(b);
      st.combo.started++;
      st.comboUse[combo.id] = (st.comboUse[combo.id] || 0) + 1;
      this.c = { def: combo, i: 0, stepStart: w.time, landed: false, rolled: false, rollDir: null, exitsDone: new Set(), waitT: 0, decided: null, last: null };
      return true;
    }

    // 預估整串連段（捨棄未就緒的段落）的總體力開銷；用於挑選連段，避免把體力吃乾
    planCost(combo, cdGate) {
      const b = this.b;
      let sum = 0;
      for (let k = 0; k < combo.steps.length; k++) {
        const sk = b.skills.find((s) => s.id === combo.steps[k].skill);
        if (!BD.comboReady(b, sk, cdGate, k ? this.costMul() : 1)) break;
        sum += (sk.cost || 0) * (k ? this.costMul() : 1);
      }
      return sum;
    }

    // 每幀（AI 更新時、think 之前）呼叫；b.state 可為 skill / idle / whiff
    update(dt) {
      const c = this.c;
      if (!c) return;
      const b = this.b, e = this.e, feat = this.feat;
      const S = ComboRunner.stats(b).combo;
      // 翻滾 / 硬直 / 倒地 / 轉階段 / 死亡… → 中斷
      if (b.state !== 'skill' && b.state !== 'idle' && b.state !== 'whiff') return this.end('interrupted');
      // 追蹤本段：命中 / 對手翻滾
      if (b.inst && b.inst.landed) c.landed = true;
      if (e.lastDodgeStart >= c.stepStart) { c.rolled = true; c.rollDir = BD.rollDirOf(b, e, e.dodgeAng); }

      const steps = c.def.steps, step = steps[c.i], inst = b.inst;
      // exits：本段第 n 個傷害時點後判定一次
      if (step.exits && inst && b.state === 'skill') {
        const times = inst.v.dmgTimes;
        for (let k = 0; k < step.exits.length; k++) {
          const ex = step.exits[k];
          if (c.exitsDone.has(k) || ex.after > times.length) continue;
          if (inst.t < times[ex.after - 1] + 0.12) continue;
          c.exitsDone.add(k);
          if (!BD.evalComboWhen(this.ctl, ex.when, this.snap())) continue;
          if (ex.chance != null && this.ctl.rng() >= ex.chance) continue;
          b.cutSkill(feat.cutRec); S.cut++;
          if (this.ctl.dbg) this.ctl.dbg.comboLast = { do: 'cut', t: this.w.time };
          if (ex.then === 'stop') { S.stopped++; return this.end(); }
          if (c.i + 1 < steps.length) return this.startStep('extend', 0);
          return;
        }
        if (!this.c) return;
      }
      if (b.state === 'whiff') return this.wait(dt);

      const next = steps[c.i + 1];
      const idle = b.state === 'idle';
      if (!next) {
        if (idle) { S.completed++; return this.end(); }
        return;
      }
      // 取消窗：收招剩餘 <= 下一段的 cancel（預設 feat.combo.cancel）
      const cancel = next.cancel != null ? next.cancel : feat.cancel;
      const inCancel = b.state === 'skill' && b.skillPhase() === 'recovery' && b.recoveryLeft() <= cancel;
      if (!idle && !inCancel) return;
      // 決定下一段
      // 每段只判定一次（chance / hold 不會因為逐幀重擲而趨近必然）
      if (!c.decided) c.decided = this.evalBranch(next) || (this.staOk(this.pickSkill(next, { do: 'extend' })) && this.skillReady(next, { do: 'extend' }) ? { do: 'extend' } : { do: 'stop' });
      const rule = c.decided;
      if (rule.do === 'stop') {
        if (idle) { S.stopped++; return this.end(); }
        return this.wait(dt); // 收招自然結束（仍可能空振）
      }
      this.rule = rule.do === 'switch' ? rule : null;
      if (b.state === 'skill') b.comboCancel();
      let hold = rule.hold ? this.ctl.rng.range(rule.hold[0], rule.hold[1]) : 0;
      if (!hold && rule.do === 'extend' && this.ctl.readHold) hold = this.ctl.readHold(this.pickSkill(next, rule)); // 讀習慣：延遲抓翻滾
      this.startStep(rule.do, hold);
    }

    // 依序判定下一段的 branch；回傳第一條成立且機會通過的規則（都沒有 → null）
    evalBranch(step) {
      const st = this.snap();
      for (const r of step.branch || []) {
        if (!BD.evalComboWhen(this.ctl, r.when, st)) continue;
        // 指定技能沒體力 / 冷卻 → 退而求其次接預設技能（extend）
        if (r.do !== 'stop' && (!this.staOk(this.pickSkill(step, r)) || !this.skillReady(step, r))) continue;
        if (r.chance != null && this.ctl.rng() >= r.chance) continue;
        return r;
      }
      return null;
    }

    // 規則指定的技能（switch 換招）；否則為段落預設技能
    pickSkill(step, rule) {
      const r = rule || this.rule, b = this.b;
      if (r && r.do === 'switch' && r.skill) return b.skills.find((s) => s.id === r.skill) || null;
      return b.skills.find((s) => s.id === step.skill) || null;
    }
    skillReady(step, rule) {
      const sk = this.pickSkill(step, rule);
      return !!sk && BD.comboReady(this.b, sk, this.feat.cdGate, this.costMul());
    }
    // 起手下一段（kind: extend / delay / switch）；失敗 → 連段以 stopped 結束
    startStep(kind, hold) {
      const c = this.c, b = this.b, w = this.w, S = ComboRunner.stats(b).combo;
      const sk = this.pickSkill(c.def.steps[c.i + 1]);
      if (!sk || !this.staOk(sk) || !BD.comboReady(b, sk, this.feat.cdGate, this.costMul()) || !b.startSkill(sk, this.ctl.holdOpts ? this.ctl.holdOpts(sk, { hold, comboOk: true, costMul: this.costMul() }) : { hold, comboOk: true, costMul: this.costMul() })) {
        S.stopped++; return this.end();
      }
      c.i++; c.stepStart = w.time; c.landed = false; c.rolled = false; c.rollDir = null; c.exitsDone = new Set(); c.waitT = 0; c.decided = null;
      c.last = { do: kind, skill: sk.id, t: w.time };
      if (this.ctl.preAim) this.ctl.preAim(sk);
      S.steps++;
      if (kind === 'extend') S.extended++;
      else if (kind === 'delay') S.delayed++;
      else if (kind === 'switch') S.switched++;
    }

    wait(dt) {
      const c = this.c;
      c.waitT += dt;
      if (c.waitT > 1.2) { ComboRunner.stats(this.b).combo.stopped++; this.end(); }
    }

    // 結束連段：清除狀態並啟動連段冷卻（同一串不會被連發）
    end(reason) {
      const c = this.c, feat = this.feat;
      if (!c) return;
      if (reason === 'interrupted') ComboRunner.stats(this.b).combo.interrupted++;
      this.c = null; this.rule = null;
      const ctl = this.ctl;
      if (ctl.dbg) ctl.dbg.comboLast = { do: reason === 'interrupted' ? 'cut' : 'stop', t: this.w.time };
      if (!ctl.comboCd) ctl.comboCd = {};
      ctl.comboCd[c.def.id] = this.w.time + feat.comboCd;
      ctl.comboAfter();
    }
  }

  BD.ComboRunner = ComboRunner;
})(typeof window !== 'undefined' ? window : globalThis);
