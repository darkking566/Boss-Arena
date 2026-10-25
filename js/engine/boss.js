'use strict';
// Boss：狀態機（待機 / 出招 / 假動作 / 翻滾 / 硬直 / 階段轉換 / 死亡）與技能時間軸執行
(function (G) {
  const BD = G.BD, U = BD.U;

  // 技能時間軸預處理：windup / activeEnd / 總時長 / 傷害時間點，皆由動作的中繼資料（defineAction 的 active / duration）推得
  function prepVersion(actions, recovery) {
    const acts = actions.slice().sort((a, b) => a.at - b.at);
    let windup = Infinity, activeEnd = 0;
    const times = [];
    for (const a of acts) {
      const meta = BD.action(a.do);
      if (!meta.active) continue;
      windup = Math.min(windup, a.at);
      activeEnd = Math.max(activeEnd, a.at + (meta.duration ? a.dur : 0));
      times.push(a.at);
    }
    if (windup === Infinity) windup = 0;
    times.sort((a, b) => a - b);
    return { actions: acts, windup, activeEnd, dur: activeEnd + recovery, dmgTimes: times };
  }
  function prepSkill(s) {
    if (!s.v1) {
      s.v1 = prepVersion(s.actions, s.recovery == null ? 0.5 : s.recovery);
      s.v2 = s.actions2 ? prepVersion(s.actions2, s.recovery == null ? 0.5 : s.recovery) : s.v1;
    }
    return s;
  }
  BD.prepSkill = prepSkill;

  // ─────────────────────────── Boss ───────────────────────────
  class Boss {
    constructor(world, def, team, x, y) {
      this.world = world; this.def = def; this.team = team; this.isBoss = true;
      this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.kbx = 0; this.kby = 0;
      this.r = def.radius; this.face = team === 0 ? 0 : Math.PI; this.wantFace = this.face;
      this.maxHp = def.maxHp; this.hp = def.maxHp; this.hpTrail = def.maxHp;
      this.phase = 1; this.maxSta = def.stamina.max; this.sta = this.maxSta; this.staDelay = 0;
      this.maxPosture = def.posture; this.posture = 0; this.postureDelay = 0;
      this.ult = 15; if (def.mana) { this.maxMana = def.mana.max; this.mana = this.maxMana; } // 獵魂模式主角的法力
      this.state = 'idle'; this.stateT = 0; this.stateDur = 0; this.inst = null;
      this.cds = {}; this.statuses = [];
      this.dmgMul = 1; this.speedMul = 1; this.cdMul = 1;
      this.moveX = 0; this.moveY = 0;
      this.flash = 0; this.hurtFlash = 0; this.lastDodgeStart = -9; this.dodgeAng = 0; this.lastSkillEnd = -9;
      this.trail = [];
      this.alive = true;
      this.stats = { dealt: 0, taken: 0, ults: 0, ultP1: 0, ultP2: 0, dodges: 0, perfect: 0, breaks: 0, counters: 0, skills: 0, phase2At: null, feints: 0, uses: {} };
      this.skills = def.skills.map(prepSkill);
      this.traits = (def.traits || []).map(BD.trait); // Boss 特性（見 js/engine/traits.js）
      this.ultimate = prepSkill(def.ultimate);
      this.controller = null;
    }
    get enemy() { return this.world.teamMode ? this._target || this.world.foeOf(this.team, this) : this.world.bosses[1 - this.team]; } // 團隊戰：World.retarget 維護的目標
    get name() { return this.def.name; }
    available() { return this.skills.filter((s) => (s.phase || 1) <= this.phase && (s.maxPhase || 9) >= this.phase); }
    ultName() { const u = this.ultimate; return this.phase === 2 && u.name2 ? u.name2 : u.name; }
    aimTarget() {
      if (this.controller && this.controller.isPlayer) return this.controller.aimPoint();
      if (this.controller && this.controller.aimOverride) return this.controller.aimOverride; // 沉重：讀習慣預判落點
      return this.enemy;
    }
    speed() { return BD.scaleMod(this, 'speedMul', this.def.speed * this.speedMul) * BD.terrainSpeedMul(this); }
    canAct() { return this.state === 'idle' && this.world.intro <= 0 && !this.world.over && BD.getMod(this, 'canAct'); }
    // 影子條件（劫）：needShadow＝場上要有影子才能用、noShadow＝已有影子就不再放；只供 AI 選招 / 連段判斷，手動施放不受限
    // 旋風條件（犽宿）：needStorm＝天寒地凍兩層才能用（手動施放也受限）、noStorm＝兩層時 AI 改放旋風
    shadowOk(s) {
      if (s.needStorm || s.noStorm) return BD.stormReady(this) === !!s.needStorm;
      if (!s.needShadow && !s.noShadow) return true;
      return (BD.liveShadows(this.world, this).length > 0) === !!s.needShadow;
    }
    skillReady(s) {
      if (s.ult) return this.ult >= 100;
      if (s.res) return (this.cds[s.id] || 0) <= 0 && this[s.res] >= (s.cost || 0); // 獵魂：res 指向 mana / spirit 等資源池
      return (this.cds[s.id] || 0) <= 0 && this.sta >= (s.cost || 0);
    }
    skillPhase() { // windup / active / recovery
      const i = this.inst; if (!i) return null;
      if (i.aim > 0 || i.hold > 0 || i.t < i.v.windup) return 'windup';
      if (i.t < i.v.activeEnd) return 'active';
      return 'recovery';
    }
    recoveryLeft() { const i = this.inst; return i ? Math.max(0, i.v.dur - i.t) : 0; }
    isWindingUp() { return this.state === 'feint' || (this.state === 'skill' && this.skillPhase() === 'windup'); }

    startSkill(skill, opts) {
      opts = opts || {};
      const w = this.world;
      // opts.comboOk（僅沉重連段）：以連段的就緒判定（減少後的冷卻門檻 / 打折體力）取代 skillReady
      if (!opts.force && (!this.canAct() || !(opts.comboOk != null ? opts.comboOk : this.skillReady(skill)))) return false;
      if (!opts.force && ((skill.phase || 1) > this.phase || (skill.maxPhase || 9) < this.phase)) return false;
      if (!opts.force && skill.needStorm && !BD.stormReady(this)) return false;
      this.state = 'skill'; this.stateT = 0;
      this.inst = { skill, v: this.phase === 2 ? skill.v2 : skill.v1, t: 0, hold: opts.hold || 0, idx: 0, marks: {}, id: w.nextId++, dash: null };
      if (opts.chase) { this.inst.chase = opts.chase; this.inst.chaseStop = opts.chaseStop || 0; } // 沉重限定
      // 沉重：轉身慢，先轉向目標再開始時間軸（上限 1 秒），避免背對著把招放到空處；反擊 / 防禦 / 脫離招立即生效
      if (this.def.pace && !(skill.tags || []).some((t) => t === 'counter' || t === 'defensive' || t === 'escape')) this.inst.aim = 1;
      if (!skill.ult && !opts.force) {
        if (skill.res) this[skill.res] -= skill.cost || 0;
        else { this.sta -= (skill.cost || 0) * (opts.costMul != null ? opts.costMul : 1); this.staDelay = 0.9; }
        this.cds[skill.id] = (skill.cd == null ? 1 : skill.cd) * this.cdMul;
      }
      this.stats.skills++;
      this.stats.uses[skill.id] = (this.stats.uses[skill.id] || 0) + 1;
      if (skill.ult) {
        this.ult = 0; this.stats.ults++; this.stats['ultP' + this.phase]++;
        const un = this.ultName();
        w.banner('【' + un + '】', this.name + ' 施放大招！', this.def.color);
        w.slowmo = Math.max(w.slowmo, 0.45); BD.spawnFx(w, 'ultcast', this.x, this.y, { src: this, color: this.def.color });
        w.log(this, '施放大招【' + un + '】', true);
        w.events.push({ t: w.time, type: 'ult', team: this.team, phase: this.phase });
      } else {
        w.callout(this, skill.name);
        if (!opts.quiet) w.log(this, '使出【' + skill.name + '】');
      }
      return true;
    }
    startFeint(dur) {
      if (!this.canAct()) return false;
      this.state = 'feint'; this.stateT = 0; this.stateDur = dur; this.sta -= 4; this.stats.feints++;
      return true;
    }
    tryDodge(ang) {
      const w = this.world;
      if (!this.canAct() || !BD.getMod(this, 'canDodge') || this.sta < this.def.dodgeCost) return false;
      const pc = this.def.pace;
      if (pc && w.time - this.lastDodgeStart < pc.dodgeCd) return false; // 沉重：翻滾冷卻
      this.state = 'dodge'; this.stateT = 0; this.dodgeAng = ang;
      BD.applyStatus(this, 'iframe', { dur: 0.3, stacking: 'refresh' }); this.lastDodgeStart = w.time;
      this.sta -= this.def.dodgeCost; this.staDelay = 0.7; this.stats.dodges++;
      this.vx = Math.cos(ang) * this.def.dodgeSpeed; this.vy = Math.sin(ang) * this.def.dodgeSpeed;
      return true;
    }
    endSkill(noWhiff) {
      const inst = this.inst, pc = this.def.pace;
      this.lastSkillId = inst ? inst.skill.id : null;
      this.inst = null; this.state = 'idle'; this.stateT = 0; BD.removeStatus(this, 'counter'); BD.removeStatus(this, 'hidden');
      this.lastSkillEnd = this.world.time;
      // 沉重：近戰 / 突進空振 → 破綻硬直（連段取消時 noWhiff 跳過）
      if (!noWhiff && pc && pc.whiff && inst && !inst.landed && !inst.skill.ult && (inst.skill.tags || []).some((t) => t === 'melee' || t === 'gap')) {
        this.state = 'whiff'; this.stateT = 0; this.stateDur = pc.whiff;
        this.world.fx.text(this.x, this.y - this.r - 24, '破綻', '#ffd27a', 15);
      }
    }
    // 連段取消（僅沉重）：提前結束目前技能、不進入空振；已脫離的預警照常繼續
    comboCancel() {
      const inst = this.inst;
      if (inst) { this.cancelSkill(); this.endSkill(true); this.lastSkillId = inst.skill.id; }
    }
    // 連段裁切（僅沉重）：砍掉技能剩餘部分，進入固定收招 rec（可被懲罰的破口）
    cutSkill(rec) {
      const inst = this.inst;
      this.cancelSkill();
      this.lastSkillId = inst ? inst.skill.id : this.lastSkillId;
      this.lastSkillEnd = this.world.time;
      this.state = 'recover'; this.stateT = 0; this.stateDur = rec;
    }
    cancelSkill() {
      if (this.inst) {
        this.inst.cancelled = true;
        const id = this.inst;
        this.world.telegraphs = this.world.telegraphs.filter((t) => !(t.inst === id && !t.detached));
      }
      this.inst = null; BD.removeStatus(this, 'counter');
      if (BD.removeStatus(this, 'hidden')) { BD.spawnFx(this.world, 'appear', this.x, this.y, { src: this }); }
    }
    setState(s, dur) { this.cancelSkill(); this.state = s; this.stateT = 0; this.stateDur = dur; }

    startTransition() {
      const w = this.world;
      const p2 = this.def.phase2, dur = p2.transDur || 1.9;
      this.setState('transition', dur); BD.applyStatus(this, 'transition'); BD.applyStatus(this, 'invuln', { dur: dur + 0.1, stacking: 'refresh' }); this.roared = false; this.roarAt = p2.roarAt || 0.6;
      if (p2.purge) {
        for (const m of w.minions) if (m.alive && m.owner === this) { m.alive = false; BD.spawnFx(w, 'vanish', m.x, m.y, { el: 'blood', src: this }); }
        w.log(this, '同伴們化為血霧消散……', true);
      }
      if (p2.transFx) BD.spawnFx(w, p2.transFx, this.x, this.y, { src: this, life: this.roarAt });
      if (p2.bloodBurst) {
        BD.spawnFx(w, 'burst', this.x, this.y, { el: 'blood', radius: 110, scale: 2, src: this });
      }
      w.banner(this.name + ' — 第二階段', this.def.phase2.line, this.def.color);
      w.log(this, 'HP 降至 50%，進入第二階段！', true);
      w.events.push({ t: w.time, type: 'phase2', team: this.team });
      w.slowmo = Math.max(w.slowmo, 0.6);
    }
    finishTransition() {
      const p = this.def.phase2;
      this.phase = 2; this.speedMul *= p.speedMul; this.dmgMul *= p.dmgMul; this.cdMul *= p.cdMul;
      this.ult = Math.min(100, this.ult + 45); this.posture = 0; this.sta = this.maxSta;
      this.state = 'idle'; this.stateT = 0; this.stats.phase2At = this.world.time;
      if (p.status) BD.applyStatus(this, p.status.id, p.status, this.world); // 二階段常駐狀態（例如宙斯的阿陀磨須）
      BD.spawnFx(this.world, 'awaken', this.x, this.y, { src: this });
    }

    update(dt) {
      const w = this.world;
      for (const k in this.cds) if (this.cds[k] > 0) this.cds[k] -= dt;
      BD.tickStatuses(this, dt, w); this.flash -= dt; this.hurtFlash -= dt;
      this.staDelay -= dt; this.postureDelay -= dt;
      if (this.hpTrail > this.hp) this.hpTrail = Math.max(this.hp, this.hpTrail - this.maxHp * 0.25 * dt);
      this.stateT += dt;
      // 殘影
      if (this.state === 'dodge' || (this.inst && this.inst.dash) || (this.phase === 2 && this.def.phase2.aura === 'shadow' && w.rng() < 0.15)) {
        this.trail.push({ x: this.x, y: this.y, face: this.face, life: 0.3 });
      }
      for (const t of this.trail) t.life -= dt;
      this.trail = this.trail.filter((t) => t.life > 0);

      if (this.state === 'dead') {
        this.vx *= 0.9; this.vy *= 0.9; this.integrate(dt); return;
      }
      BD.traitHook(this, 'tick', w, this, dt); // 逐幀特性（例如鏡爪的魔狼在場保證）
      if (this.staDelay <= 0 && this.state !== 'skill' && this.state !== 'dodge') {
        this.sta = Math.min(this.maxSta, this.sta + this.def.stamina.regen * dt * (this.state === 'idle' ? 1 : 0.5));
      }
      if (this.maxMana) this.mana = Math.min(this.maxMana, this.mana + this.def.mana.regen * dt);
      if (this.hunt && this.hunt.tick) this.hunt.tick(this, dt); // 獵魂武器的逐幀邏輯（例如太刀的氣刃）
      if (this.postureDelay <= 0) this.posture = Math.max(0, this.posture - (this.state === 'idle' ? 16 : 9) * dt);
      if (this.ult < 100 && w.intro <= 0) this.ult = Math.min(100, this.ult + (this.def.pace ? 0.8 * this.def.pace.ultGainMul * dt : 0.8 * dt));

      const spd = this.speed();
      let tvx = 0, tvy = 0, accel = 8;
      const pc = this.def.pace;
      if (pc) accel = pc.accel; // 沉重：加速更慢（起步重）
      const tgt = this.aimTarget();
      switch (this.state) {
        case 'idle':
          if (BD.getMod(this, 'canMove')) { tvx = this.moveX * spd; tvy = this.moveY * spd; }
          this.face = U.rotateToward(this.face, this.wantFace, this.def.turn * dt);
          break;
        case 'feint':
          this.face = U.rotateToward(this.face, U.angTo(this, tgt), this.def.turn * 1.5 * dt);
          if (this.stateT >= this.stateDur) { this.state = 'idle'; this.stateT = 0; this.feintEnded = w.time; }
          break;
        case 'skill': {
          const r = this.updateSkill(dt, tgt, spd);
          if (r) { tvx = r[0]; tvy = r[1]; }
          break;
        }
        case 'dodge': {
          if (pc) {
            // 沉重：翻滾更久、收尾更慢
            const D = pc.dodgeDur;
            const k = this.stateT < 0.26 ? 1 : Math.max(0, 1 - (this.stateT - 0.26) / (D - 0.26));
            tvx = Math.cos(this.dodgeAng) * this.def.dodgeSpeed * k; tvy = Math.sin(this.dodgeAng) * this.def.dodgeSpeed * k;
            accel = 30;
            if (this.stateT >= D) { this.state = 'idle'; this.stateT = 0; }
          } else {
            const k = this.stateT < 0.26 ? 1 : Math.max(0, 1 - (this.stateT - 0.26) / 0.19);
            tvx = Math.cos(this.dodgeAng) * this.def.dodgeSpeed * k; tvy = Math.sin(this.dodgeAng) * this.def.dodgeSpeed * k;
            accel = 30;
            if (this.stateT >= 0.45) { this.state = 'idle'; this.stateT = 0; }
          }
          break;
        }
        case 'knockdown':
          // 倒地：不移動、不轉向，時間到起身（狀態系統隨後觸發 onRemove）
          if (this.stateT >= this.stateDur) { this.state = 'idle'; this.stateT = 0; }
          break;
        case 'whiff':
          // 空振破綻：不移動，時間到恢復
          if (this.stateT >= this.stateDur) { this.state = 'idle'; this.stateT = 0; }
          break;
        case 'recover':
          // 連段裁切後的收招：不移動，時間到恢復
          if (this.stateT >= this.stateDur) { this.state = 'idle'; this.stateT = 0; }
          break;
        case 'stagger': case 'stun':
          if (this.stateT >= this.stateDur) { this.state = 'idle'; this.stateT = 0; }
          break;
        case 'transition':
          if (!this.roared && this.stateT >= this.roarAt) { this.roared = true; w.roar(this); }
          if (this.stateT >= this.stateDur) this.finishTransition();
          break;
      }
      if (this.inst && this.inst.dash) { this.vx = this.inst.dash.vx; this.vy = this.inst.dash.vy; }
      else if (this.inst && this.inst.circle) { /* 繞圈衝刺：速度由 updateSkill 直接設定 */ }
      else { const a = Math.min(1, accel * dt); this.vx += (tvx - this.vx) * a; this.vy += (tvy - this.vy) * a; }
      this.integrate(dt);
    }
    integrate(dt) {
      this.x += (this.vx + this.kbx) * dt; this.y += (this.vy + this.kby) * dt;
      const k = this.def.pace ? Math.exp(-this.def.pace.kbDecay * dt) : Math.exp(-6 * dt); this.kbx *= k; this.kby *= k;
      const hitWall = this.world.confine(this);
      if (hitWall && this.inst && this.inst.dash) {
        this.inst.dash.t = this.inst.dash.dur; this.world.fx.shake(5);
        BD.spawnFx(this.world, 'projwall', this.x, this.y, { src: this, radius: this.r });
      }
    }
    updateSkill(dt, tgt, spd) {
      const w = this.world, inst = this.inst, v = inst.v, sk = inst.skill;
      if (inst.aim > 0) {
        const a = U.angTo(this, tgt);
        if (Math.abs(U.angDiff(this.face, a)) > 0.15) { inst.aim -= dt; this.face = U.rotateToward(this.face, a, this.def.turn * 2 * dt); return null; }
        inst.aim = 0;
      }
      if (inst.hold > 0) {
        inst.hold -= dt;
        this.face = U.rotateToward(this.face, U.angTo(this, tgt), (sk.track || 6) * dt);
        // 沉重・讀習慣的延遲斬：蓄住招式的同時逼近（目標翻滾後仍追得上）；light 不會設定 inst.chase
        if (inst.chase && U.dist(this, tgt) > inst.chaseStop) { const a = U.angTo(this, tgt); return [Math.cos(a) * spd * inst.chase, Math.sin(a) * spd * inst.chase]; }
        return null;
      }
      inst.t += dt;
      let nd = null;
      for (const tm of v.dmgTimes) if (tm > inst.t - 1e-6) { nd = tm; break; }
      const trackOk = sk.sweep ? inst.t < v.activeEnd : (nd !== null && nd - inst.t > 0.2);
      // 衝刺衝過頭後：面向差太大時無視鎖定窗並加速補轉，否則後續斬擊會劈空
      const reaim = inst.reaim && nd !== null && Math.abs(U.angDiff(this.face, U.angTo(this, tgt))) > 0.25;
      if (sk.track && (trackOk || reaim) && !BD.hasStatus(this, 'hidden')) {
        this.face = U.rotateToward(this.face, U.angTo(this, tgt), sk.track * (this.phase === 2 ? 1.15 : 1) * (reaim ? 3 : 1) * dt);
      }
      // 沉重・讀習慣的踏步追擊：起手中對手早滾 → 邊蓄邊追（light 不會設定 inst.chaseWind）
      if (inst.chaseWind && inst.t < v.windup && !inst.dash && U.dist(this, tgt) > inst.chaseStop) { const a = U.angTo(this, tgt); return [Math.cos(a) * spd * inst.chaseWind, Math.sin(a) * spd * inst.chaseWind]; }
      let res = null;
      if (inst.dash) {
        const d = inst.dash; d.t += dt;
        if (d.hit) {
          for (const u of w.enemiesOf(this.team)) {
            if (d.hitSet.has(u)) continue;
            if (Math.hypot(u.x - this.x, u.y - this.y) < u.r + this.r + 14) {
              d.hitSet.add(u);
              w.damageUnit(this, u, Object.assign({ kbAng: Math.atan2(d.vy, d.vx) + (w.rng() < 0.5 ? 0.6 : -0.6) }, d.hit));
            }
          }
        }
        if (d.trail) BD.dropTrail(w, this, d);
        if (d.t >= d.dur) { inst.dash = null; inst.reaim = true; this.vx *= 0.15; this.vy *= 0.15; }
      } else if (inst.circle) {
        const c = inst.circle; c.t += dt;
        const k = Math.min(1, c.t / c.dur), a = c.a0 + c.dir * k * U.TAU, rr = U.lerp(c.d0, c.r, Math.min(1, c.t / 0.25));
        const nx = c.cx + Math.cos(a) * rr, ny = c.cy + Math.sin(a) * rr;
        this.vx = (nx - this.x) / dt; this.vy = (ny - this.y) / dt; this.face = a + c.dir * Math.PI / 2;
        if (c.trail) BD.dropTrail(w, this, c);
        if (c.hit) for (const u of w.enemiesOf(this.team)) {
          if (c.hitSet.has(u) || Math.hypot(u.x - this.x, u.y - this.y) > u.r + this.r + 12) continue;
          c.hitSet.add(u); w.damageUnit(this, u, Object.assign({ kbAng: this.face }, c.hit));
        }
        if (c.t >= c.dur) { inst.circle = null; this.vx = this.vy = 0; }
      } else if (sk.creep && inst.t < v.activeEnd) {
        res = [Math.cos(this.face) * spd * sk.creep, Math.sin(this.face) * spd * sk.creep];
      } else if (this.def.pace && this.def.pace.recoveryMove && inst.t >= v.activeEnd && !(sk.tags || []).includes('counter') && BD.getMod(this, 'canMove')) {
        res = [this.moveX * spd * this.def.pace.recoveryMove, this.moveY * spd * this.def.pace.recoveryMove]; // 敏捷型：收招尾段就開始走位（AI 的移動意圖），不站著發呆
      }
      while (inst.idx < v.actions.length && v.actions[inst.idx].at <= inst.t) {
        BD.runAction(w, this, inst, v.actions[inst.idx++]);
        if (this.inst !== inst) return null;
      }
      if (inst.t >= v.dur) this.endSkill();
      return res;
    }
  }
  BD.Boss = Boss;
})(typeof window !== 'undefined' ? window : globalThis);
