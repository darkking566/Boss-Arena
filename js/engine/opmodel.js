'use strict';
// 對手習慣模型（OpponentModel）：以衰減計數器觀察對手的翻滾時機 / 方向 / 距離與懲罰習慣。
// 供 AI（AIController）預測對手翻滾落地與懲罰意圖；不含任何隨機數。僅沉重節奏建立（def.ai.feat.habit）。
//
// 計數器：early / ontime / late（翻滾時機）、free（無威脅時翻滾）、left / right / back / through（方向）、
//         opp（我露出破綻次數）、punished（其中被懲罰）、rollEnds（翻滾結束次數）、aar（翻滾後立刻出招）
// 均值：earlyLead（提早量）、rollDist（翻滾距離）、range（交手距離）
(function (G) {
  const BD = G.BD, U = BD.U;

  const LOCKS = {
    c: ['early', 'ontime', 'late', 'free', 'left', 'right', 'back', 'through', 'opp', 'punished', 'rollEnds', 'aar'],
    means: ['earlyLead', 'rollDist', 'range', 'react', 'react2'],
  };

  class OpponentModel {
    constructor(ctl, cfg) {
      this.ctl = ctl;
      this.cfg = Object.assign({ memory: 18, early: 0.4, conf: 3 }, cfg || {});
      this.c = {};
      for (const k of LOCKS.c) this.c[k] = 0;
      this.m = {};
      this.lastT = this.w ? this.w.time : 0;
      this.lastSeenDodge = null;
      this.lastRoll = null;
      this.startPos = null;
      this.prevDodge = false;
      this.prevMyState = null;
      this.lastEnemyInst = null;
      this.rollEndT = -1e9;
      this.awaitAar = false;
      this.oppOpen = false;
      this.oppT = -1e9;
    }

    get b() { return this.ctl.b; }
    get e() { return this.ctl.e; }
    get w() { return this.ctl.w; }

    // 時間衰減：所有計數 / 總和 / 權重乘上半衰期係數（memory 秒）
    decay() {
      const w = this.w;
      if (!w) return;
      const f = Math.pow(0.5, (w.time - this.lastT) / this.cfg.memory);
      this.lastT = w.time;
      if (f >= 1) return;
      for (const k of LOCKS.c) this.c[k] *= f;
      for (const k of LOCKS.means) {
        if (!this.m[k]) this.m[k] = { sum: 0, w: 0 };
        this.m[k].sum *= f;
        this.m[k].w *= f;
      }
    }

    // 均值添加（先確保存在）
    addMean(k, v) {
      if (!this.m[k]) this.m[k] = { sum: 0, w: 0 };
      this.m[k].sum += v;
      this.m[k].w += 1;
    }
    mean(k, def) {
      const s = this.m[k];
      if (!s || s.w <= 0) return def;
      return s.sum / s.w;
    }
    meanW(k) { const s = this.m[k]; return s ? s.w : 0; }

    // 我方攻擊將於幾秒後命中對手（無威脅 → null）
    threatLead(e) {
      const me = this.b, w = this.w;
      if (!w) return null;
      let best = null;
      for (const t of w.telegraphs || []) {
        if (t.owner !== me || t.soft) continue;
        if (!U.hitShape(t.shape, { x: e.x, y: e.y, r: e.r })) continue;
        const lead = t.hitIn - t.t;
        if (best === null || lead < best) best = lead;
      }
      if (best !== null) return best;
      if (me.isWindingUp() && me.inst) return (me.inst.v.windup - me.inst.t) + (me.inst.hold || 0);
      return null;
    }

    update(dt) {
      const me = this.b, e = this.e, w = this.w;
      if (!me || !e || !w) return;
      this.decay();
      const c = this.c, cfg = this.cfg;

      // 超時清除標記
      if (this.awaitAar && w.time - this.rollEndT > 0.6) this.awaitAar = false;
      if (this.oppOpen && w.time - this.oppT > 0.9) this.oppOpen = false;

      // 我方起手（蓄力 / 假動作開始）的時間點：用來量對手「看到起手後多久翻滾」
      const wind = me.isWindingUp();
      if (wind && !this.prevWind) this.cueT = w.time;
      this.prevWind = wind;
      // ── 對手翻滾開始 ──
      if (e.lastDodgeStart !== this.lastSeenDodge && e.state === 'dodge') {
        // 反應延遲：我起手後幾秒翻滾（只計我正在出招 / 假動作期間、起手 2 秒內）
        if (this.cueT != null && (me.state === 'skill' || me.state === 'feint') && w.time - this.cueT <= 2) {
          const rt = w.time - this.cueT; this.addMean('react', rt); this.addMean('react2', rt * rt);
        }
        this.lastSeenDodge = e.lastDodgeStart;
        const x = e.x, y = e.y;
        this.startPos = { x, y };
        const lead = this.threatLead(e);
        if (lead === null) c.free += 1;
        else if (lead > cfg.early) { c.early += 1; this.addMean('earlyLead', lead); }
        else if (lead >= -0.05) c.ontime += 1;
        else c.late += 1;
        const dir = BD.rollDirOf(me, e, e.dodgeAng);
        c[dir] += 1;
        this.lastRoll = { t: w.time, x, y, ang: e.dodgeAng, dir, lead };
      }
      // ── 對手翻滾結束 ──
      if (this.prevDodge && e.state !== 'dodge') {
        if (this.startPos) this.addMean('rollDist', U.dist(this.startPos, e));
        c.rollEnds += 1;
        this.rollEndT = w.time;
        this.awaitAar = true;
      }
      this.prevDodge = e.state === 'dodge';

      // ── 對手技能起手 ──
      if (e.inst && e.inst.id !== this.lastEnemyInst) {
        this.lastEnemyInst = e.inst.id;
        this.addMean('range', U.dist(me, e));
        if (this.awaitAar && w.time - this.rollEndT <= 0.6) c.aar += 1;
        this.awaitAar = false;
        if (this.oppOpen && w.time - this.oppT <= 0.9) { c.punished += 1; this.oppOpen = false; }
      }
      // ── 我方露出破綻（空振 / 收招）──
      const ms = me.state;
      if (ms !== this.prevMyState && (ms === 'whiff' || ms === 'recover')) {
        c.opp += 1;
        this.oppOpen = true;
        this.oppT = w.time;
      }
      this.prevMyState = ms;
    }

    timedN() { this.decay(); const c = this.c; return c.early + c.ontime + c.late; }
    early() { this.decay(); const n = this.timedN(); return n < 1e-6 ? 0 : this.c.early / n; }
    ontime() { this.decay(); const n = this.timedN(); return n < 1e-6 ? 0 : this.c.ontime / n; }
    late() { this.decay(); const n = this.timedN(); return n < 1e-6 ? 0 : this.c.late / n; }
    conf(n) { return n / (n + this.cfg.conf); }
    dirN() { this.decay(); const c = this.c; return c.left + c.right + c.back + c.through; }
    dirProb(dir) { const n = this.dirN(); return n < 1e-6 ? 0 : this.c[dir] / n; }
    dominantDir() {
      const n = this.dirN();
      if (n < 1e-6) return { dir: null, p: 0 };
      let best = null, bp = -1;
      for (const d of ['left', 'right', 'back', 'through']) {
        const p = this.c[d] / n;
        if (p > bp) { bp = p; best = d; }
      }
      return { dir: best, p: bp };
    }
    punishRate() { this.decay(); return this.c.opp < 1e-6 ? 0 : this.c.punished / this.c.opp; }
    punishConf() { this.decay(); return this.conf(this.c.opp); }
    attackAfterRollRate() { this.decay(); return this.c.rollEnds < 1e-6 ? 0 : this.c.aar / this.c.rollEnds; }
    avgEarlyLead() { this.decay(); return this.mean('earlyLead', this.cfg.early + 0.2); }
    rollDist() {
      this.decay();
      if (this.meanW('rollDist') < 0.5) return (this.e.def.dodgeSpeed || 0) * 0.45;
      return this.m.rollDist.sum / this.m.rollDist.w;
    }
    enemyRange() { this.decay(); return this.mean('range', null); }
    // 反應延遲（起手 → 翻滾）的衰減平均 / 標準差 / 樣本權重：習慣性固定時機翻滾的對手 std 很小
    react() {
      this.decay();
      const n = this.meanW('react'); if (n < 1e-6) return { mean: 0, std: 1, n: 0 };
      const mu = this.mean('react', 0), v = Math.max(0, this.mean('react2', 0) - mu * mu);
      return { mean: mu, std: Math.sqrt(v), n };
    }

    // 依習慣方向預測翻滾角（與 BD.rollDirOf 一致）
    predictDirAngle(dir) {
      const me = this.b, e = this.e;
      const base = U.angTo(me, e);
      if (dir === 'back') return base;
      if (dir === 'through') return base + Math.PI;
      if (dir === 'right') return base + Math.PI / 2;
      if (dir === 'left') return base - Math.PI / 2;
      return base;
    }

    // 預測翻滾落地點：距離 + 競技場邊界 + 柱子推擠
    predictLanding(from, ang) {
      const A = BD.ARENA, e = this.e, d = this.rollDist();
      let x = from.x + Math.cos(ang) * d;
      let y = from.y + Math.sin(ang) * d;
      x = U.clamp(x, 40, A.w - 40);
      y = U.clamp(y, 40, A.h - 40);
      const reach = e.r + 4;
      for (const pl of A.pillars) {
        const dx = x - pl.x, dy = y - pl.y;
        const dist = Math.hypot(dx, dy);
        const need = pl.r + reach;
        if (dist < need) {
          const a = dist > 1e-6 ? Math.atan2(dy, dx) : ang;
          x = pl.x + Math.cos(a) * need;
          y = pl.y + Math.sin(a) * need;
        }
      }
      return { x, y, vx: 0, vy: 0 };
    }

    // 除錯用摘要
    summary() {
      this.decay();
      const c = this.c, n = this.timedN(), dn = this.dirN();
      const r1 = (v) => Math.round(v * 10) / 10;
      const r2 = (v) => Math.round(v * 100) / 100;
      const dom = this.dominantDir();
      return {
        n: r1(n),
        early: r2(this.early()),
        ontime: r2(this.ontime()),
        late: r2(this.late()),
        free: r1(c.free),
        dirs: {
          left: dn < 1e-6 ? 0 : r2(c.left / dn),
          right: dn < 1e-6 ? 0 : r2(c.right / dn),
          back: dn < 1e-6 ? 0 : r2(c.back / dn),
          through: dn < 1e-6 ? 0 : r2(c.through / dn),
        },
        dom: dom.dir,
        punish: r2(this.punishRate()),
        aar: r2(this.attackAfterRollRate()),
        range: r2(this.enemyRange() || 0),
        conf: r2(this.conf(n)),
        lead: r2(this.avgEarlyLead()),
        react: r2(this.react().mean), reactStd: r2(this.react().std),
      };
    }
  }

  BD.OpponentModel = OpponentModel;
})(typeof window !== 'undefined' ? window : globalThis);
