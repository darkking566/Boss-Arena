'use strict';
// World：戰場狀態、固定步長模擬、排程、傷害 / 架勢 / 擊退結算、碰撞、狂暴、勝負
(function (G) {
  const BD = G.BD, U = BD.U, Boss = BD.Boss;
  const STEP = 1 / 60;
  // 命中附加狀態：將動作的 status 清單（單一或陣列）套用到受擊單位
  function applyHitStatuses(w, src, u, list) {
    for (const s of [].concat(list)) BD.applyStatus(u, s.id, { dur: s.dur, stacks: s.stacks, value: s.value, source: src && (src.isBoss ? src : src.owner) || null }, w);
  }
  const ARENA = BD.ARENA = {
    w: 1500, h: 820,
    pillars: [{ x: 390, y: 250, r: 38 }, { x: 1110, y: 250, r: 38 }, { x: 390, y: 570, r: 38 }, { x: 1110, y: 570, r: 38 }],
  };

  // 每幀更新所有實體（順序固定：預警 → 投射物 → 拋射物 → 區域 → 陷阱 → 召喚物）
  BD.updateEntities = function (w, dt) {
    BD.updateTelegraphs(w, dt);
    BD.updateProjectiles(w, dt);
    BD.updateLobs(w, dt);
    BD.updateZones(w, dt);
    BD.updateTraps(w, dt);
    BD.updateMinions(w, dt);
  };

  // ─────────────────────────── World ───────────────────────────
  class World {
    constructor(defA, defB, opts) {
      opts = opts || {};
      this.seed = opts.seed != null ? opts.seed : (Math.random() * 1e9) | 0;
      this.rng = U.makeRng(this.seed);
      // 節奏預設：未指定時為 light（原始定義、行為不變）；pace 僅供之後的機制讀取
      this.paceId = opts.pace || 'light'; this.pace = BD.paceConfig(this.paceId, null);
      this.time = 0; this.intro = opts.intro != null ? opts.intro : 1.8; this.over = false; this.winner = null; this.endT = 0;
      this.telegraphs = []; this.projectiles = []; this.zones = []; this.traps = []; this.minions = []; this.lobs = [];
      this.scheduled = []; this.logs = []; this.callouts = []; this.banners = []; this.events = [];
      this.enrage = 1; this.enrageAt = opts.enrageAt || (this.pace && this.pace.enrageAt) || 110; this.enrageOn = false;
      this.stats = BD.minionStats(); // 召喚物種類提供的統計欄位（例如紅眼監視者）
      this.hitstop = 0; this.freezeF = 0; this.slowmo = 0; this.acc = 0; this.speed = 1; this.paused = false; this.nextId = 1;
      this.fx = new BD.FX(this);
      this.bosses = [new Boss(this, BD.applyPace(defA, this.paceId), 0, 260, ARENA.h / 2), new Boss(this, BD.applyPace(defB, this.paceId), 1, ARENA.w - 260, ARENA.h / 2)];
      this.bosses.forEach((b, i) => {
        b.controller = (opts.player === i && BD.PlayerController) ? new BD.PlayerController(b, this, opts.input) : new BD.AIController(b, this);
      });
      if (opts.training && BD.setupTraining) BD.setupTraining(this, opts); else this.training = null;
    }
    tick(realDt) {
      if (this.paused) return;
      realDt = Math.min(realDt, 0.1);
      this.fx.realUpdate(realDt);
      if (this.hitstop > 0) { this.hitstop -= realDt; return; }
      if (this.slowmo > 0) this.slowmo -= realDt;
      this.acc += realDt * this.speed * (this.slowmo > 0 ? 0.35 : 1);
      let n = 0;
      while (this.acc >= STEP && n < 16) { this.step(STEP); this.acc -= STEP; n++; }
      if (n >= 16) this.acc = 0;
    }
    step(dt) {
      if (this.training) this.training.preStep(dt);
      // 沉重模式：命中凍結（固定步數），整個模擬暫停、時間不推進
      if (this.pace && this.freezeF > 0) { this.freezeF--; this.frozenSteps = (this.frozenSteps || 0) + 1; return; }
      this.time += dt;
      if (this.intro > 0) {
        this.intro -= dt;
        if (this.intro <= 0) this.banner('開戰！', '', '#fff', 0.9);
      } else if (!this.over) {
        for (const b of this.bosses) if (b.controller && b.state !== 'dead' && b.enemy.state !== 'dead') b.controller.update(dt);
      }
      for (const b of this.bosses) {
        if (b.enemy.state === 'dead') { b.moveX = b.moveY = 0; }
        b.update(dt);
      }
      this.collideBosses();
      BD.updateEntities(this, dt);
      // 排程
      if (this.scheduled.length) {
        const due = [], keep = [];
        for (const s of this.scheduled) { s.t -= dt; (s.t <= 0 ? due : keep).push(s); }
        this.scheduled = keep;
        for (const s of due) if (!(s.inst && s.inst.cancelled)) s.fn();
      }
      for (const c of this.callouts) c.life -= dt;
      this.callouts = this.callouts.filter((c) => c.life > 0);
      for (const b of this.banners) b.life -= dt;
      this.banners = this.banners.filter((b) => b.life > 0);
      this.fx.update(dt);
      // 狂暴（避免拖太久）
      if (this.time > this.enrageAt && !this.winner) {
        if (!this.enrageOn) {
          this.enrageOn = true; this.banner('雙方狂暴化！', '傷害隨時間持續提升', '#ff3355'); this.log(null, '戰鬥過久——雙方進入狂暴', true);
          for (const b of this.bosses) BD.applyStatus(b, 'overtime', {}, this);
        }
        this.enrage = 1 + (this.time - this.enrageAt) * 0.025;
      }
      if (this.winner) { this.endT += dt; if (this.endT > 2.4) this.over = true; }
      if (this.training) this.training.postStep(dt);
    }
    later(t, fn, inst) { this.scheduled.push({ t, fn, inst: inst || null }); }
    enemiesOf(team) {
      const out = [];
      for (const b of this.bosses) if (b.team !== team && b.state !== 'dead' && !BD.getMod(b, 'untargetable')) out.push(b);
      for (const m of this.minions) if (m.alive && m.team !== team) out.push(m);
      return out;
    }
    callout(b, text) { this.callouts.push({ boss: b, text, life: 1.3, max: 1.3 }); }
    banner(text, sub, color, life) { this.banners.push({ text, sub: sub || '', color: color || '#fff', life: life || 2.0, max: life || 2.0 }); }
    log(b, text, important) {
      this.logs.push({ t: this.time, who: b ? b.name : '', color: b ? b.def.color : '#ff7788', text, important: !!important });
      if (this.logs.length > 60) this.logs.shift();
    }
    confine(u) {
      let hit = false;
      if (u.x < u.r) { u.x = u.r; hit = true; } if (u.x > ARENA.w - u.r) { u.x = ARENA.w - u.r; hit = true; }
      if (u.y < u.r) { u.y = u.r; hit = true; } if (u.y > ARENA.h - u.r) { u.y = ARENA.h - u.r; hit = true; }
      if (BD.getMod(u, 'noCollide')) return false;
      for (const p of ARENA.pillars) {
        const dx = u.x - p.x, dy = u.y - p.y, d = Math.hypot(dx, dy), m = p.r + u.r;
        if (d < m) { const k = (m - d) / (d || 1); u.x += dx * k; u.y += dy * k; hit = true; }
      }
      return hit;
    }
    collideBosses() {
      const [a, b] = this.bosses;
      if (BD.getMod(a, 'noCollide') || BD.getMod(b, 'noCollide') || a.state === 'dead' || b.state === 'dead') return;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, m = a.r + b.r;
      if (d < m) {
        const o = m - d, ta = b.def.mass / (a.def.mass + b.def.mass);
        a.x -= dx / d * o * ta; a.y -= dy / d * o * ta; b.x += dx / d * o * (1 - ta); b.y += dy / d * o * (1 - ta);
      }
    }
    // 對形狀內所有敵方單位造成傷害
    applyArea(src, shape, p) {
      let n = 0;
      for (const u of this.enemiesOf(src.team)) {
        if (U.hitShape(shape, u)) { this.damageUnit(src, u, Object.assign({ from: shape }, p)); n++; }
      }
      return n;
    }
    damageUnit(src, u, p) {
      if (u.isBoss) return this.damageBoss(src, u, p);
      if (!u.alive) return;
      let dmg = BD.scaleMod(u, 'dmgTakenMul', BD.scaleMod(src, 'dmgDealtMul', p.dmg * (src && src.dmgMul || 1)));
      dmg = BD.absorbDamage(u, dmg, this);
      if (p.status) applyHitStatuses(this, src, u, p.status);
      u.hp -= dmg; u.hurt = 0.12;
      BD.spawnFx(this, 'projhit', u.x, u.y, { el: 'physical' });
      if (u.hp <= 0) BD.killMinion(this, u);
      return 'hit';
    }
    damageBoss(src, b, p) {
      if (b.state === 'dead' || BD.getMod(b, 'untargetable') || this.winner) return 'none';
      const fx = this.fx;
      if (BD.getMod(b, 'invuln')) { if (!p.dot) fx.text(b.x, b.y - b.r - 10, '無效', '#bbb', 16); return 'immune'; }
      if (BD.getMod(b, 'iframe') && !p.ignoreIframe && !p.undodgeable) { // undodgeable（無法閃避）：翻滾 / 衝刺無敵幀無效；invuln / untargetable 仍然有效
        if (!p.dot) {
          if (this.time - b.lastDodgeStart < 0.2 && !p.noPerfect) {
            b.stats.perfect++; b.ult = Math.min(100, b.ult + 6); b.sta = Math.min(b.maxSta, b.sta + 10);
            fx.text(b.x, b.y - b.r - 14, '完美閃避', '#7dffb0', 18); this.log(b, '完美閃避！');
          } else fx.text(b.x, b.y - b.r - 10, '閃避', '#ccffdd', 14);
        }
        return 'dodged';
      }
      for (const tr of b.traits) if (tr.interceptDamage) { const r = tr.interceptDamage(this, b, src, p); if (r) return r; } // 例如見切 / 彈反
      const pc = this.pace;
      if (pc && src && src.isBoss && src.inst) src.inst.landed = true; // 沉重：本次出招已命中（供空振硬直判定）
      let dmg = BD.scaleMod(b, 'dmgTakenMul', BD.scaleMod(src, 'dmgDealtMul', p.dmg * (src && src.dmgMul || 1)));
      dmg = Math.max(1, Math.round(dmg * this.rng.range(0.92, 1.08)));
      if (b.statuses.length) { const left = BD.absorbDamage(b, dmg, this); if (left <= 0) { fx.text(b.x, b.y - b.r - 10, '護盾吸收', '#9fd8ff', 14); return 'absorbed'; } dmg = Math.round(left); }
      b.hp -= dmg; b.stats.taken += dmg;
      if (pc) { // 沉重：大招充能依 ultGainMul 縮放（一擊傷害較高，避免大招過於頻繁）
        const ug = pc.ultGainMul;
        if (src && src.isBoss) { src.stats.dealt += dmg; src.ult = Math.min(100, src.ult + dmg * 0.06 * ug); }
        else if (src && src.owner && !src.neutral) { src.owner.stats.dealt += dmg; src.owner.ult = Math.min(100, src.owner.ult + dmg * 0.04 * ug); }
      } else if (src && src.isBoss) { src.stats.dealt += dmg; src.ult = Math.min(100, src.ult + dmg * 0.06); }
      else if (src && src.owner && !src.neutral) { src.owner.stats.dealt += dmg; src.owner.ult = Math.min(100, src.owner.ult + dmg * 0.04); }
      if (src && !src.isBoss && src.kind) { const mt = BD.minionTypes[src.kind]; if (mt && mt.onHitBoss) mt.onHitBoss(this, src, b); }
      b.ult = Math.min(100, b.ult + (pc ? dmg * 0.05 * pc.ultGainMul : dmg * 0.05));
      b.posture += p.posture != null ? p.posture : dmg * 0.25; b.postureDelay = 1.4;
      // 擊退
      if (p.kb) {
        let ang = p.kbAng;
        if (ang == null) {
          const o = p.from && p.from.kind !== 'rect' && p.from.kind !== 'except' ? p.from : (src || b);
          ang = Math.atan2(b.y - o.y, b.x - o.x);
          if (p.from && p.from.kind === 'rect') ang = p.from.ang + (U.angDiff(p.from.ang, U.angTo(p.from, b)) > 0 ? 0.5 : -0.5);
        }
        const k = p.kb / b.def.mass; b.kbx += Math.cos(ang) * k; b.kby += Math.sin(ang) * k;
      }
      if (p.slow) BD.applyStatus(b, 'slow', { dur: p.slow === true ? 0.6 : p.slow }, this);
      if (p.root) BD.applyStatus(b, 'root', { dur: p.root }, this);
      if (p.status) applyHitStatuses(this, src, b, p.status);
      b.hurtFlash = 0.12;
      const big = pc ? dmg >= 120 : dmg >= 100;
      if (pc) {
        // 沉重：命中凍結
        if (!p.dot && dmg >= pc.hitstop.minDmg) this.freezeF = Math.max(this.freezeF, U.clamp(Math.round(dmg * pc.hitstop.perDmg), pc.hitstop.minF, pc.hitstop.maxF));
      } else {
        if (big) this.hitstop = Math.max(this.hitstop, 0.06);
      }
      if (!p.dot || dmg >= 20) {
        const atkSrc = src && (src.isBoss ? src : src.owner) || null;
        BD.spawnFx(this, 'impact', b.x, b.y, { src: atkSrc, victim: b, dmg, big, heavyHit: !!pc });
      }
      fx.damage(b, dmg, p.dot ? '#c9a0ff' : (dmg >= 150 ? '#ffdd55' : '#ffffff'));
      if (dmg >= 150) this.log(src && src.isBoss ? src : (src && src.owner) || null, '重創 ' + b.name + '（' + dmg + '）');
      if (this.training) this.training.onDamage(b, dmg, p, src); // 訓練場：統計假人傷害、假人 HP 回滿、Boss 不會倒下
      if (b.hp <= 0) { b.hp = 0; this.kill(b); return 'kill'; }
      if (b.phase === 1 && b.hp <= b.maxHp * 0.5 && !b.isDummy) { b.startTransition(); return 'phase'; }
      // 沉重：擊倒（倒地）——階段轉換 / 已倒地 / 起身保護期間不觸發
      let downed = false;
      if (pc) {
        const kd = pc.knockdown;
        if (b.state !== 'transition' && b.state !== 'knockdown' && !BD.hasStatus(b, 'kdGuard') && (dmg >= kd.dmg || (p.kb || 0) >= kd.kb)) {
          BD.applyStatus(b, 'knockdown', { dur: kd.dur }, this);
          downed = true; b.stats.knockdowns = (b.stats.knockdowns || 0) + 1;
          this.log(b, '被擊倒在地！');
        }
      }
      if (p.freeze && b.state !== 'transition' && !downed) BD.applyStatus(b, 'frozen', { dur: p.freeze }, this);
      if (b.posture >= b.maxPosture && b.state !== 'transition') {
        b.posture = 0; b.stats.breaks++;
        if (!downed) BD.applyStatus(b, 'stagger', { dur: 1.5 }, this); // 倒地時不再疊加硬直
        fx.text(b.x, b.y - b.r - 34, '架勢崩潰！', '#ffcc33', 24);
        BD.spawnFx(this, 'posturebreak', b.x, b.y, { src: b });
        this.log(b, '架勢崩潰，陷入硬直！', true);
      }
      return 'hit';
    }
    roar(b) {
      const e = b.enemy;
      BD.spawnFx(this, 'roar', b.x, b.y, { src: b, flashColor: b.def.color });
      if (b.def.phase2.bloodBurst) {
        BD.spawnFx(this, 'roar', b.x, b.y, { src: b, el: 'blood', flashColor: '#5a0010', scale: 0.9 });
      }
      if (e.state !== 'dead' && U.dist(b, e) < 330) {
        const a = U.angTo(b, e); e.kbx += Math.cos(a) * 750 / e.def.mass; e.kby += Math.sin(a) * 750 / e.def.mass;
        this.damageBoss(b, e, { dmg: 35, posture: 30, noPerfect: true, unblockable: true });
      }
    }
    kill(b) {
      b.cancelSkill(); b.state = 'dead'; b.stateT = 0; b.alive = false;
      this.winner = b.enemy; this.slowmo = 1.4;
      BD.spawnFx(this, 'finale', b.x, b.y, { src: b, color: b.def.color });
      this.banner(b.enemy.name + ' 獲勝！', b.name + ' 倒下了', b.enemy.def.color, 3);
      this.log(b.enemy, '擊敗了 ' + b.name + '！', true);
    }
    // 無頭模擬：直接跑到結束
    simulate(maxTime) {
      maxTime = maxTime || 400;
      while (!this.over && this.time < maxTime) { this.hitstop = 0; this.slowmo = 0; this.step(STEP); }
      return this.over;
    }
  }
  BD.World = World;
  BD.STEP = STEP;
})(typeof window !== 'undefined' ? window : globalThis);
