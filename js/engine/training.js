'use strict';
// 訓練場（Training Ground）：模式控制、假人控制器、傷害統計、技能手動施放
// 純邏輯，不觸碰 DOM / Canvas
(function (G) {
  const BD = G.BD, U = BD.U;

  const TRAINING_RANGES = { near: 260, mid: 520, far: 860 };
  const TRAINING_RANGE_NAMES = { near: '近', mid: '中', far: '遠', custom: '自訂' };
  const TRAINING_MODES = ['ai', 'manual', 'player'];
  const TRAINING_MODE_NAMES = { ai: 'AI', manual: '手動施放', player: '親自操控' };
  const DPS_WIN = 5;

  class Training {
    constructor(w, opts, input) {
      this.w = w;
      this.input = input;
      this.boss = w.bosses[0];
      this.dummy = w.bosses[1];
      this.dummy.isDummy = true;

      w.enrageAt = Infinity;
      w.intro = 0;

      const topts = typeof opts === 'object' && opts ? opts : {};
      this.freeCast = topts.freeCast !== undefined ? !!topts.freeCast : true;
      this.kbMode = topts.kbMode || 'return';
      this.bossHome = { x: BD.ARENA.w / 2 - 260, y: BD.ARENA.h / 2 };
      this.home = { x: this.bossHome.x + (TRAINING_RANGES[topts.range || 'mid'] || 520), y: this.bossHome.y };
      this.range = topts.range || 'mid';
      this.queue = [];
      this.notices = [];
      this.lastHitT = null;

      this.boss.x = this.bossHome.x;
      this.boss.y = this.bossHome.y;
      this.boss.face = this.boss.wantFace = 0;

      this.dummy.face = this.dummy.wantFace = Math.PI;
      this.setRange(this.range);
      this.setMode(topts.mode || 'manual', true);

      this.dummy.controller = new DummyController(this.dummy, w, this);
      this.clearStats();
      if (this.freeCast) this.refill();
    }

    notice(text) {
      this.notices.push({ text, t: this.w.time });
      if (this.notices.length > 6) this.notices.shift();
    }

    setMode(mode, quiet) {
      if (!TRAINING_MODES.includes(mode)) mode = 'manual';
      const boss = this.boss, w = this.w;
      if (mode === 'ai') {
        boss.controller = new BD.AIController(boss, w);
        this.mode = 'ai';
      } else if (mode === 'player') {
        if (BD.PlayerController && this.input) {
          boss.controller = new BD.PlayerController(boss, w, this.input);
          this.mode = 'player';
        } else {
          boss.controller = new ManualController(boss, w, this);
          this.mode = 'manual';
        }
      } else {
        boss.controller = new ManualController(boss, w, this);
        this.mode = 'manual';
      }
      boss.moveX = boss.moveY = 0;
      // 清掉切換前殘留的輸入緩衝（例如點擊場地放置假人的 mouse0），避免一切到親自操控就誤出招
      if (this.input && Array.isArray(this.input.buffer)) this.input.buffer.length = 0;
      const name = TRAINING_MODE_NAMES[this.mode];
      if (!quiet) this.notice(`操控：${name}`);
      return this.mode;
    }

    cycleMode() {
      const idx = (TRAINING_MODES.indexOf(this.mode) + 1) % TRAINING_MODES.length;
      return this.setMode(TRAINING_MODES[idx]);
    }

    setFreeCast(on) {
      this.freeCast = !!on;
      this.notice(this.freeCast ? '無冷卻／無限體力：開' : '無冷卻／無限體力：關');
      if (this.freeCast) this.refill();
    }

    refill() {
      const boss = this.boss;
      for (const k in boss.cds) boss.cds[k] = 0;
      boss.sta = boss.maxSta;
      boss.ult = 100;
    }

    setKbMode(m) {
      if (m === 'return' || m === 'pin') this.kbMode = m;
    }

    setRange(id) {
      if (TRAINING_RANGES[id] != null) {
        this.range = id;
        const dist = TRAINING_RANGES[id];
        this.home = { x: this.bossHome.x + dist, y: this.bossHome.y };
        this.placeDummy();
      }
    }

    setHome(x, y) {
      const r = this.dummy.r, A = BD.ARENA;
      const clampedX = U.clamp(x, r + 4, A.w - r - 4);
      const clampedY = U.clamp(y, r + 4, A.h - r - 4);
      this.dummy.x = clampedX;
      this.dummy.y = clampedY;
      this.w.confine(this.dummy);
      this.range = 'custom';
      this.home = { x: this.dummy.x, y: this.dummy.y };
      this.placeDummy();
    }

    placeDummy() {
      this.dummy.x = this.home.x;
      this.dummy.y = this.home.y;
      this.dummy.vx = this.dummy.vy = this.dummy.kbx = this.dummy.kby = 0;
    }

    cast(skillId) {
      const skill = skillId === 'ult' ? this.boss.ultimate : this.boss.skills.find((s) => s.id === skillId);
      if (!skill) return false;
      this.queue.push(skill);
      return true;
    }

    castNow(skill) {
      const boss = this.boss, dummy = this.dummy;
      if (boss.state === 'transition') {
        this.notice('階段轉換中，無法施放');
        return false;
      }
      if (!this.freeCast && !boss.skillReady(skill)) {
        this.notice(`${skill.name} 尚未就緒（冷卻／體力／大招值）`);
        return false;
      }
      if (boss.state !== 'idle' || boss.inst) {
        boss.cancelSkill();
        boss.state = 'idle';
        boss.stateT = 0;
      }
      boss.face = boss.wantFace = U.angTo(boss, dummy);
      const ok = boss.startSkill(skill, { force: true });
      if (!this.freeCast && !skill.ult) {
        boss.sta -= skill.cost || 0;
        boss.staDelay = 0.9;
        boss.cds[skill.id] = (skill.cd || 1) * boss.cdMul;
      }
      return ok;
    }

    setPhase(p) {
      if (p === 2) {
        if (this.boss.phase === 2 || this.boss.state === 'transition') return false;
        this.boss.startTransition();
        return true;
      }
      if (p === 1) {
        this.reset();
        return true;
      }
      return false;
    }

    resetUnit(u, pos, face) {
      u.cancelSkill();
      u.inst = null;
      u.state = 'idle';
      u.stateT = 0;
      u.stateDur = 0;
      u.phase = 1;
      u.speedMul = u.dmgMul = u.cdMul = 1;
      u.hp = u.hpTrail = u.maxHp;
      u.sta = u.maxSta;
      u.staDelay = 0;
      u.posture = 0;
      u.postureDelay = 0;
      u.cds = {};
      u.statuses = [];
      u.x = pos.x;
      u.y = pos.y;
      u.vx = u.vy = u.kbx = u.kby = 0;
      u.face = u.wantFace = face;
      u.trail = [];
      u.flash = u.hurtFlash = 0;
      u.moveX = u.moveY = 0;
      u.roared = false;
      u.lastDodgeStart = -9;
      u.alive = true;
    }

    reset() {
      const w = this.w;
      BD.resetArena();
      w.telegraphs = [];
      w.projectiles = [];
      w.zones = [];
      w.traps = [];
      w.minions = [];
      w.lobs = [];
      w.scheduled = [];
      w.callouts = [];
      w.banners = [];
      w.stats = BD.minionStats();
      w.hitstop = 0;
      w.freezeF = 0;
      w.slowmo = 0;
      if (w.fx) {
        const fxProps = ['parts', 'rings', 'slashes', 'beams', 'texts', 'decals', 'pillars', 'glows', 'shocks', 'streaks', 'ghosts', 'veils', 'timers', 'chunks', 'scars', 'puffs', 'stalks', 'prints', 'gusts'];
        for (const prop of fxProps) {
          if (Array.isArray(w.fx[prop])) w.fx[prop].length = 0;
        }
        w.fx.field = {};
        if (w.fx.shakeV != null) w.fx.shakeV = 0;
      }
      this.resetUnit(this.boss, this.bossHome, 0);
      this.resetUnit(this.dummy, this.home, Math.PI);
      this.setMode(this.mode, true);
      this.queue = [];
      this.clearStats();
      if (this.freeCast) this.refill();
      else this.boss.ult = 15;
      this.notice('已重置');
    }

    clearStats() {
      this.stats = { total: 0, hits: 0, dot: 0, max: 0, last: null, startT: null, log: [], bySrc: {} };
      this.lastHitT = null;
    }

    windowSum() {
      const cutoff = this.w.time - DPS_WIN;
      this.stats.log = this.stats.log.filter((e) => e.t >= cutoff);
      return this.stats.log.reduce((acc, e) => acc + e.dmg, 0);
    }

    dps() {
      if (!this.stats.hits || this.stats.startT == null) return 0;
      const sum = this.windowSum();
      const dur = U.clamp(this.w.time - this.stats.startT, 1, DPS_WIN);
      return dur > 0 ? sum / dur : 0;
    }

    labelOf(src, p) {
      if (p && p.statusDmg) {
        const sDef = BD.statusDefs && BD.statusDefs[p.statusDmg];
        return (sDef && sDef.name) || p.statusDmg;
      }
      if (src && src.isBoss) {
        if (src.inst && src.inst.skill && src.inst.skill.name) return src.inst.skill.name;
        return src.name;
      }
      if (src && src.kind) return '召喚物';
      return '環境';
    }

    onDamage(b, dmg, p, src) {
      if (b === this.dummy) {
        const stats = this.stats;
        stats.total += dmg;
        stats.hits++;
        if (p && p.dot) stats.dot += dmg;
        stats.max = Math.max(stats.max, dmg);
        const label = this.labelOf(src, p);
        stats.last = { dmg, label, t: this.w.time, dot: !!(p && p.dot) };
        if (stats.startT == null) stats.startT = this.w.time;
        stats.log.push({ t: this.w.time, dmg });
        stats.bySrc[label] = (stats.bySrc[label] || 0) + dmg;
        this.lastHitT = this.w.time;
        if (b.hp <= 0) {
          b.hp = b.maxHp;
          b.hpTrail = b.maxHp;
          this.w.fx.text(b.x, b.y - b.r - 40, 'HP 回滿', '#9fe8a0', 16);
        }
      } else if (b.hp <= 0) {
        b.hp = 1;
      }
    }

    preStep(dt) {
      const q = this.queue;
      this.queue = [];
      for (const s of q) this.castNow(s);
    }

    postStep(dt) {
      if (this.freeCast) this.refill();
      const dummy = this.dummy;
      if (this.kbMode === 'pin') {
        dummy.x = this.home.x;
        dummy.y = this.home.y;
        dummy.vx = dummy.vy = dummy.kbx = dummy.kby = 0;
      }
      if (dummy.hp < dummy.maxHp && (this.w.time - (this.lastHitT != null ? this.lastHitT : -99)) > 3) {
        dummy.hp = dummy.maxHp;
        dummy.hpTrail = dummy.maxHp;
      }
      if (dummy.inst) dummy.cancelSkill();
      dummy.sta = dummy.maxSta;
      dummy.ult = 0;
      if (this.notices.length) {
        const cutoff = this.w.time - 3;
        this.notices = this.notices.filter((n) => n.t >= cutoff);
      }
    }
  }

  class DummyController {
    constructor(b, w, tr) {
      this.b = b;
      this.w = w;
      this.tr = tr;
      this.isDummy = true;
      this.isPlayer = false;
    }
    update(dt) {
      const b = this.b, tr = this.tr;
      b.wantFace = U.angTo(b, b.enemy);
      if (tr.kbMode === 'return') {
        const dx = tr.home.x - b.x, dy = tr.home.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d > 4) {
          const factor = Math.min(1, d / 60);
          b.moveX = (dx / d) * factor;
          b.moveY = (dy / d) * factor;
        } else {
          b.moveX = 0;
          b.moveY = 0;
        }
      } else {
        b.moveX = 0;
        b.moveY = 0;
      }
    }
  }

  class ManualController {
    constructor(b, w, tr) {
      this.b = b;
      this.w = w;
      this.tr = tr;
      this.isPlayer = false;
      this.isManual = true;
    }
    update() {
      this.b.moveX = 0;
      this.b.moveY = 0;
      this.b.wantFace = U.angTo(this.b, this.b.enemy);
    }
  }

  BD.setupTraining = function (w, opts) {
    w.training = new BD.Training(w, opts.training, opts.input);
    return w.training;
  };

  BD.Training = Training;
  BD.DummyController = DummyController;
  BD.ManualController = ManualController;
  BD.TRAINING_RANGES = TRAINING_RANGES;
  BD.TRAINING_RANGE_NAMES = TRAINING_RANGE_NAMES;
  BD.TRAINING_MODES = TRAINING_MODES;
  BD.TRAINING_MODE_NAMES = TRAINING_MODE_NAMES;
})(typeof window !== 'undefined' ? window : globalThis);
