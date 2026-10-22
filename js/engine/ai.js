'use strict';
// 魂系 Boss AI：效用評分 + 狀態機。繞圈 / 保持距離 / 誘敵後懲罰 / 時機翻滾 / 假動作 / 延遲出招 / 弧線接近 / 撤退重整
(function (G) {
  const BD = G.BD, U = BD.U;

  class AIController {
    constructor(b, w) {
      this.b = b; this.w = w; this.p = b.def.ai; this.rng = w.rng;
      this.mode = 'strafe'; this.modeT = 0.5; this.strafeDir = this.rng.sign();
      this.thinkT = 0; this.seen = new Map(); this.plan = null; this.evade = null;
      this.attackGap = this.rng.range(0.3, 0.9); this.lastAttack = 0; this.flipCd = 0; this.repoint = null;
      this.feintAt = -9; this.noise = this.rng() * 100;
      // 連段（僅沉重；light 不建立、不消耗亂數）
      const F = this.p.feat;
      this.combo = F && F.combo ? new BD.ComboRunner(this) : null;
      this.comboCd = {};
      // 讀習慣（僅沉重；light 的 def.ai 沒有 feat.habit → 不建立、不消耗亂數）
      this.model = F && F.habit ? new BD.OpponentModel(this, F.habit) : undefined;
      this.readStreak = 0; this.baitUntil = -9; this.aimOverride = null;
      this.dbg = F ? {} : undefined;
      this.evadeAng = null; this.evadeAt = -9; // 智慧閃避的走位方向（僅沉重）
    }
    get e() { return this.b.enemy; }

    // ── 讀習慣（僅沉重）──
    cap() { const p = this.p; return (p.read == null ? 0.5 : p.read) * p.feat.habit.mul; }
    readStats() {
      const st = this.b.stats;
      if (!st.read) st.read = { holds: 0, leads: 0, predicts: 0, rollPunish: 0, baits: 0 };
      return st.read;
    }
    note(label) { if (this.dbg) this.dbg.lastRead = { text: label, t: this.w.time }; }
    setAim(pt, label) {
      this.aimOverride = pt;
      this.aimInst = this.b.inst ? this.b.inst.id : null;
      this.aimUntil = this.w.time + this.p.feat.habit.leadMax;
      this.note(label);
      this.dbg.predict = { x: pt.x, y: pt.y, t: this.w.time };
    }
    // 清除過期預判；對手此刻起滾且我的傷害還沒到 → 預判落點
    updateAim() {
      const b = this.b, e = this.e, w = this.w;
      // 過期 / 換招 / 收招 → 清除預判
      if (this.aimOverride && (b.state !== 'skill' || !b.inst || b.inst.id !== this.aimInst || w.time > this.aimUntil)) this.aimOverride = null;
      // 反應式預判只在對手翻滾途中有效：落地後直接追蹤本人（不瞄準過時的點）
      if (this.aimOverride && this.aimKind === 'react' && e.state !== 'dodge') this.aimOverride = null;
      if (b.state !== 'skill' || !b.inst) return;
      const inst = b.inst;
      // 我的傷害還沒落地 → 翻滾躲得掉；抓「何時」翻滾的習慣（每次起滾都判一次）
      if (e.state !== 'dodge' || e.lastDodgeStart === this.seenRoll || !this.nextDmg(inst)) return;
      this.seenRoll = e.lastDodgeStart;
      const m = this.model;
      if (this.rng() < this.cap() * (0.7 + 0.3 * m.conf(m.timedN()))) {
        this.setAim(m.predictLanding(e, e.dodgeAng), '預判落點'); this.aimKind = 'react';
        this.readStats().leads++;
        // 近戰還在起手 → 邊蓄邊踏步追向落點（讀到「早滾」才會；對手滾得越早越常見）
        const tags = inst.skill.tags || [];
        if (tags.includes('melee') && inst.t < inst.v.windup && this.rng() < m.early() * (0.5 + 0.5 * m.conf(m.timedN()))) {
          const r = inst.skill.range || [0, 120];
          inst.chaseWind = 0.9; inst.chaseStop = Math.max(40, r[1] * 0.55) + e.r;
          this.readStats().steps = (this.readStats().steps || 0) + 1; this.note('踏步追擊');
        }
      }
    }
    // 下一段傷害預估落地秒數（含延遲 hold）；已無傷害 → 0
    nextDmg(inst) {
      const times = inst.v.dmgTimes || [];
      for (const t of times) if (t > inst.t - (inst.hold || 0)) return Math.max(0.01, t + (inst.hold || 0) - inst.t);
      return 0;
    }
    // 讀習慣延遲斬的附加參數：蓄力時逼近到技能射程內（startSkill opts）
    holdOpts(skill, o) {
      if (!this.holdRead) return o;
      this.holdRead = false;
      const r = skill.range || [0, 140];
      return Object.assign(o, { chase: 1.0, chaseStop: Math.max(40, r[1] * 0.55) + this.e.r });
    }
    // 延遲出招（抓早滾）：回傳額外 hold 秒，0 表示不延遲
    readHold(skill) {
      const F = this.p.feat, H = F && F.habit;
      if (!H) return 0;
      this.holdRead = false;
      const tags = skill.tags || [];
      if (!(tags.includes('melee') || tags.includes('gap') || tags.includes('aoe'))) return 0;
      if (this.punishWindow() > 0.6) return 0; // 明顯的破綻 → 直接打，不延遲
      // 讀「起手後多久翻滾」：若這招的命中時點會落在對手翻滾無敵（0.3 秒）內，就延遲出手讓它落在無敵剛結束時
      const m = this.model, R = m.react();
      if (R.n < 1.5) return 0;
      const v = this.b.phase === 2 ? skill.v2 : skill.v1, W = v.windup;
      if (W < R.mean - 0.08 || W > R.mean + 0.42) return 0; // 原本就不會被這種翻滾躲掉
      const consist = U.clamp(1 - R.std / 0.3, 0, 1);
      const pr = this.cap() * m.conf(R.n) * consist * Math.pow(0.8, this.readStreak);
      if (this.rng() < pr) {
        this.readStreak++;
        const hold = U.clamp(R.mean + 0.3 + this.rng.range(0.06, 0.2) - W, 0.12, F.habit.holdMax);
        this.readStats().holds++; this.holdRead = true;
        this.note('延遲 ' + hold.toFixed(2) + 's');
        return hold;
      }
      this.readStreak = Math.max(0, this.readStreak - 1);
      return 0;
    }
    // 出招成功後：依習慣方向預判落點
    // 誘滾（僅沉重）：對手習慣早滾 → 先做短假動作騙出翻滾，翻滾冷卻中（punishWindow 的 habitWin）再出真招
    baitRoll(d, k) {
      const b = this.b, w = this.w, m = this.model, rng = this.rng;
      this.baitStreak = (this.baitStreak || 0) * Math.pow(0.5, (w.time - (this.baitT || 0)) / 8); this.baitT = w.time; // 連用逐漸失效、8 秒半衰
      if (d > 380 || b.sta < 20 || !BD.getMod(b, 'canAct')) return false; // 假動作只花 4 體力；留一點給後續真招
      const e = this.e, pc = e.def.pace;
      if (e.state === 'dodge' || (pc && w.time - e.lastDodgeStart < pc.dodgeCd)) return false; // 對手翻滾還沒好 → 直接打就好
      const pr = k * this.cap() * m.conf(m.timedN()) * m.early() * Math.pow(0.6, this.baitStreak);
      if (rng() < pr && b.startFeint(rng.range(0.25, 0.4))) {
        this.feintAt = w.time; this.attackGap = 0; this.baitStreak += 1;
        this.readStats().baits++; this.note('誘滾'); w.callout(b, '……');
        return true;
      }
      return false;
    }
    preAim(skill) {
      const F = this.p.feat, H = F && F.habit;
      if (!H) return;
      // 對手正在翻滾途中出招 → 直接瞄準其落點
      const e = this.e, lr = this.model.lastRoll;
      if (e.state === 'dodge' && lr) { this.setAim(this.model.predictLanding(lr, lr.ang), '預判落點'); this.aimKind = 'react'; this.readStats().leads++; return; }
      const acts = skill.actions || [];
      const aimed = acts.some((a) => a.anchor === 'target' || a.do === 'lob' || (a.do === 'zone' && a.pattern === 'at'));
      if (!aimed) return; // 只對「瞄準目標位置」的範圍招預判（突進類在對手翻滾時才反應式修正）
      const m = this.model, dd = m.dominantDir();
      if (dd.p > 0.45 && m.early() > 0.4 && this.rng() < this.cap() * m.conf(m.dirN()) * dd.p * 0.6) {
        this.setAim(m.predictLanding(this.e, m.predictDirAngle(dd.dir)), '預判 ' + dd.dir); this.aimKind = 'pre';
        this.readStats().predicts++;
      }
    }

    update(dt) {
      const b = this.b, e = this.e, w = this.w;
      b.wantFace = U.angTo(b, e);
      if (this.model) { this.model.update(dt); this.updateAim(); } // 讀習慣：先吸收本幀資訊
      if (this.combo) this.combo.update(dt); // 連段狀態機先於思考
      this.modeT -= dt; this.flipCd -= dt; this.attackGap -= dt; this.thinkT -= dt;
      if (this.plan) {
        this.plan.t -= dt;
        if (this.plan.t <= 0) {
          const pl = this.plan; this.plan = null;
          if (pl.type === 'counter') {
            const sk = b.available().find((s) => (s.tags || []).includes('counter'));
            if (sk) b.startSkill(sk, { quiet: true });
          } else if (pl.type === 'swap') {
            const sk = b.available().find((s) => (s.tags || []).includes('swapdodge'));
            if (sk && this.stillThreat(pl.th)) b.startSkill(sk, { quiet: true });
          } else if (this.stillThreat(pl.th)) {
            if (this.p.feat && this.p.feat.smartDodge) b.tryDodge(this.chooseEscape(pl.th, 'roll'));
            else b.tryDodge(this.avoidMines(this.escapeAng(pl.th) + this.rng.range(-0.25, 0.25)));
          }
        }
      }
      if (this.thinkT <= 0) { this.thinkT = this.rng.range(0.05, 0.1); this.think(); }
      this.steer(dt);
    }

    // ── 威脅偵測 ──
    scanThreats() {
      const b = this.b, w = this.w, out = [];
      const me = { x: b.x, y: b.y, r: b.r + 12 };
      for (const t of w.telegraphs) {
        if (t.team === b.team || t.soft) continue;
        if (t.t < this.p.reaction * 0.6) continue; // 反應時間
        if (!U.hitShape(t.shape, me)) continue;
        let left = t.hitIn - t.t; if (left < 0) left = 0.05;
        out.push({ key: 't' + t.id, kind: 'tele', ref: t, left, big: t.shape.kind === 'except' || (t.a && t.a.dmg > 120) || !!t.detached,
          melee: t.owner === this.e && !t.detached && t.shape.kind !== 'except' && U.dist(b, this.e) < 260, undo: !!t.undodgeable });
      }
      for (const p of w.projectiles) {
        if (p.team === b.team) continue;
        const th = this.projThreat(p.x, p.y, p.vx, p.vy, p.r);
        if (th) out.push({ key: 'p' + (p.id || (p.id = w.nextId++)), kind: 'proj', ref: p, left: th, big: p.kind === 'swarm', undo: !!p.undodgeable });
      }
      const e = this.e;
      if (e.inst && e.inst.dash && e.inst.dash.hit) {
        const th = this.projThreat(e.x, e.y, e.inst.dash.vx, e.inst.dash.vy, e.r);
        if (th) out.push({ key: 'd' + e.inst.id, kind: 'dash', ref: e, left: th, big: true });
      }
      // 對手蓄力（含假動作／延遲）——神經質的 AI 可能過早翻滾
      if (e.isWindingUp() && U.dist(b, e) < 280) {
        const id = e.state === 'feint' ? 'f' + e.stats.feints : 'g' + (e.inst && e.inst.id);
        out.push({ key: id, kind: 'glow', ref: e, left: 0.2, glow: true });
      }
      return out;
    }
    projThreat(px, py, vx, vy, r) {
      const b = this.b, dx = b.x - px, dy = b.y - py, v2 = vx * vx + vy * vy;
      if (v2 < 1) return 0;
      const tca = (dx * vx + dy * vy) / v2;
      if (tca < 0 || tca > 0.8) return 0;
      const cx = px + vx * tca - b.x, cy = py + vy * tca - b.y;
      return Math.hypot(cx, cy) < r + b.r + 8 ? Math.max(0.02, tca) : 0;
    }
    // 進行中的無法閃避 except 預警（魔女絕對零度）：回傳安全圈形狀，沒有則 null
    undoSafe() {
      for (const t of this.w.telegraphs) if (t.undodgeable && t.team !== this.b.team && t.shape.kind === 'except') return t.shape;
      return null;
    }
    // 無法閃避的已布置陷阱（例如魔女地雷）：翻滾的無敵幀擋不住，翻滾路徑不可壓過
    undoMines() {
      const b = this.b, out = [];
      for (const tp of this.w.traps) if (tp.undodgeable && tp.team !== b.team && tp.t >= tp.arm - 0.2) out.push(tp);
      return out;
    }
    rollCrossesMine(ang, mines) {
      const b = this.b, D = (b.def.pace && b.def.pace.dodgeDur) || 0.45, d0 = b.def.dodgeSpeed * (0.26 + (D - 0.26) * 0.5);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      for (const f of [0.25, 0.5, 0.75, 1]) {
        const x = b.x + ca * d0 * f, y = b.y + sa * d0 * f;
        for (const tp of mines) if (Math.hypot(x - tp.x, y - tp.y) < tp.trig + b.r + 6) return true;
      }
      return false;
    }
    // 翻滾方向若會壓過無法閃避的地雷 → 依序嘗試偏轉 ±0.6 / ±1.2 / ±1.8 弧度（不消耗亂數；沒有地雷時原樣回傳）
    avoidMines(ang) {
      const mines = this.undoMines();
      if (!mines.length || !this.rollCrossesMine(ang, mines)) return ang;
      for (const off of [0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) if (!this.rollCrossesMine(ang + off, mines)) return ang + off;
      return ang;
    }
    stillThreat(th) {
      const b = this.b, w = this.w;
      if (th.kind === 'glow') return true;
      if (th.kind === 'tele') return w.telegraphs.includes(th.ref) && U.hitShape(th.ref.shape, { x: b.x, y: b.y, r: b.r + 8 });
      if (th.kind === 'proj') return th.ref.alive && !!this.projThreat(th.ref.x, th.ref.y, th.ref.vx, th.ref.vy, th.ref.r);
      if (th.kind === 'dash') return !!(th.ref.inst && th.ref.inst.dash);
      return false;
    }
    escapeAng(th) {
      const b = this.b;
      if (th.kind === 'proj' || th.kind === 'dash') {
        const o = th.ref, vx = th.kind === 'dash' ? o.inst ? o.inst.dash.vx : o.vx : o.vx, vy = th.kind === 'dash' ? o.inst ? o.inst.dash.vy : o.vy : o.vy;
        const ang = Math.atan2(vy, vx), side = U.angDiff(ang, U.angTo(o, b)) >= 0 ? 1 : -1;
        return ang + side * Math.PI / 2;
      }
      if (th.kind === 'glow') return U.angTo(this.e, b) + this.strafeDir * Math.PI / 2;
      const s = th.ref.shape;
      switch (s.kind) {
        case 'circle': return U.dist(s, b) < 4 ? this.rng() * U.TAU : U.angTo(s, b);
        case 'ring': return U.dist(s, b) < ((s.r0 || 0) + s.r) / 2 ? U.angTo(b, s) : U.angTo(s, b);
        case 'cone': case 'rect': { const side = U.angDiff(s.ang, U.angTo(s, b)) >= 0 ? 1 : -1; return s.ang + side * Math.PI / 2; }
        case 'except': return U.angTo(b, s);
      }
      return this.rng() * U.TAU;
    }
    // ── 智慧閃避方向（僅沉重；light 走原有路徑，消耗的亂數完全一致）──
    chooseEscape(th, mode) {
      const b = this.b, e = this.e, w = this.w, p = this.p, A = BD.ARENA, rng = this.rng;
      const C = p.feat.smartDodge;
      if (!C) return this.escapeAng(th);
      const N = C.n;
      // 候選方向的起始偏移（每次不同，避免固定 12 方位）
      const a0 = rng() * U.TAU / N;
      const legacyAng = this.escapeAng(th);
      // 在執行當下評估：翻滾立即開始，命中落在前 0.3 秒（無敵幀）內的預警不算威脅
      const tRoll = 0;
      const D = (b.def.pace && b.def.pace.dodgeDur) || 0.45;
      const dRoll = b.def.dodgeSpeed * (0.26 + (D - 0.26) * 0.5);
      const dWalk = b.speed() * p.walk * Math.min(0.8, th.left + 0.1);
      const d0 = mode === 'roll' ? dRoll : dWalk;
      const [mn, mx] = p.prefRange, mid = (mn + mx) / 2, span = Math.max(80, mx - mn);
      const meleeBoss = mx <= 260 && !p.kiter;
      // 近戰預警 / 突進：獎勵滾到攻擊者身旁或背後（無敵幀內安全）
      const thMelee = th.kind === 'dash' || (th.kind === 'tele' && (th.melee || ((th.ref.owner === e) && th.ref.shape.kind !== 'except' && U.dist(b, e) < 260)));
      const L0 = th.kind === 'tele' ? th.ref.hitIn - th.ref.t : th.left;
      const cands = [];
      const undoMines = this.undoMines();
      let best = -1, bs = -Infinity;
      const evalAt = (a) => {
        const ca = Math.cos(a), sa = Math.sin(a);
        let x = b.x, y = b.y, d = d0, pen = 0, clipped = false;
        // 路徑取樣 1/3、2/3、1：出界或撞柱就截斷到最後合法點
        for (const f of [1 / 3, 2 / 3, 1]) {
          const sx = b.x + ca * d0 * f, sy = b.y + sa * d0 * f;
          let bad = sx < b.r || sx > A.w - b.r || sy < b.r || sy > A.h - b.r;
          if (!bad) for (const pl of A.pillars) { if (Math.hypot(sx - pl.x, sy - pl.y) < pl.r + b.r) { bad = true; break; } }
          if (bad) { x = b.x; y = b.y; d = 0; pen += C.wPillar + C.wWall; clipped = true; break; }
          x = sx; y = sy; d = d0 * f;
        }
        const end = { x, y, r: b.r + 10 };
        let s = 0, behind = false;
        // 無法閃避的地雷：翻滾路徑（不只落點）壓過即重罰
        if (mode === 'roll' && undoMines.length && this.rollCrossesMine(a, undoMines)) s -= C.wTrap * 1.5;
        // 敵方預警
        for (const t of w.telegraphs) {
          if (t.team === b.team || t.soft) continue;
          const L = t.hitIn - t.t;
          const hit = U.hitShape(t.shape, end);
          if (t.undodgeable) {
            // 無法閃避：無敵幀無效；except 只有安全圈內才是合法終點，其餘依離安全圈多遠扣分
            if (t.shape.kind === 'except') {
              const out = U.dist(end, t.shape) - (t.shape.r - b.r * 0.5);
              s += out <= 0 ? C.wThreat * 2 : -C.wThreat * (1 + Math.min(2, out / 200));
            } else if (hit) { s -= C.wThreat * 2; if ((t.a && t.a.dmg > 120) || (t.shape.r || 0) >= 150) s -= C.wBig; }
            continue;
          }
          if (t.shape.kind === 'except') { if (hit) s += C.wThreat; continue; }
          if (!hit) continue;
          if (mode === 'walk' || L > tRoll + 0.3) {
            s -= C.wThreat;
            const big = (t.a && t.a.dmg > 120) || (t.shape.r || 0) >= 150;
            if (big) s -= C.wBig;
          }
        }
        // 敵方區域
        for (const z of w.zones) {
          if (z.team === b.team) continue;
          if (U.dist(z, end) < z.r + b.r) s -= C.wZone * Math.min(1, (z.dps || 0) / 30);
        }
        // 敵方陷阱
        for (const tp of w.traps) {
          if (tp.team === b.team) continue;
          if (U.dist(tp, end) <= 70 + b.r) { s -= C.wTrap; break; }
        }
        // 投射物：以落點為中心，時間窗 0..0.8 秒
        for (const pr of w.projectiles) {
          if (pr.team === b.team || !pr.alive) continue;
          const v2 = pr.vx * pr.vx + pr.vy * pr.vy;
          if (v2 < 1) continue;
          const tca = ((x - pr.x) * pr.vx + (y - pr.y) * pr.vy) / v2;
          if (tca < 0 || tca > 0.8) continue;
          const cx = pr.x + pr.vx * tca - x, cy = pr.y + pr.vy * tca - y;
          if (Math.hypot(cx, cy) < pr.r + b.r + 8) { s -= C.wProj; break; }
        }
        // 牆壁 / 角落
        const wd = Math.min(x - b.r, y - b.r, A.w - b.r - x, A.h - b.r - y);
        if (wd < 110) s -= C.wWall * (1 - Math.max(0, wd) / 110);
        if (Math.min(x, A.w - x) < 160 && Math.min(y, A.h - y) < 160) s -= C.wCorner;
        // 與敵人距離
        s -= C.wRange * Math.abs(U.dist(end, e) - mid) / span;
        // 近戰：滾向攻擊者身側 / 背後
        if (meleeBoss && thMelee && L0 <= tRoll + 0.3) {
          const rel = Math.abs(U.angDiff(e.face, U.angTo(e, end)));
          if (rel > 1.75) { s += C.wBehind; behind = true; }
          else if (rel > 1.05) { s += C.wBehind * 0.5; behind = true; }
        }
        s -= pen; // 撞牆 / 撞柱被截斷
        // 舊方向傾向 + 抖動
        s += C.wLegacy * (1 - Math.abs(U.angDiff(a, legacyAng)) / Math.PI);
        s += rng.range(-C.jitter, C.jitter);
        return { a, x, y, d, s, behind, pen, clipped };
      };
      for (let k = 0; k < N; k++) cands.push(evalAt(a0 + k * U.TAU / N));
      cands.push(evalAt(legacyAng));
      for (let i = 0; i < cands.length; i++) if (cands[i].s > bs) { bs = cands[i].s; best = i; }
      const bc = cands[best];
      if (this.dbg) this.dbg.dodge = { at: w.time, x0: b.x, y0: b.y, mode, cands: cands.map((c) => ({ x: c.x, y: c.y, s: c.s })), best };
      const st = b.stats;
      if (!st.smart) st.smart = { rolls: 0, walks: 0, behind: 0 };
      if (mode === 'roll') st.smart.rolls++; else st.smart.walks++;
      if (bc.behind) st.smart.behind++;
      // 實際執行：最佳候選 + 小幅抖動（不完美）
      return bc.a + rng.range(-C.jitter, C.jitter);
    }
    decide(th) {
      const b = this.b, p = this.p, rng = this.rng;
      if (th.glow) {
        // 對蓄力過度反應：誘餌成功
        if (rng() < p.nervous && b.sta > b.def.dodgeCost) this.plan = { type: 'dodge', t: rng.range(0.02, 0.12), th };
        return;
      }
      // 無法閃避：不靠翻滾，直接走出範圍 / 走進安全圈（優先於其他閃避計畫，不會被一般威脅的走位覆蓋）
      if (th.undo) {
        if (this.plan && this.plan.type === 'dodge' && this.plan.th && this.plan.th.kind === th.kind && this.plan.th.ref === th.ref) this.plan = null;
        this.evade = { th, until: this.w.time + th.left + 0.15, undo: true };
        return;
      }
      // 正在躲無法閃避的威脅：一般威脅不覆蓋走位；沒有智慧閃避（輕快）時也不翻滾，以免滾出安全圈
      if (this.evade && this.evade.undo && this.w.time < this.evade.until && !(this.p.feat && this.p.feat.smartDodge)) return;
      const undoBusy = this.evade && this.evade.undo && this.w.time < this.evade.until;
      const stamOk = b.sta >= b.def.dodgeCost && BD.getMod(b, 'canDodge');
      // 見切：看準近身攻擊的時機（沉重誘敵期間提高）
      const H = p.feat && p.feat.habit;
      if (H && this.model && this.w.time < this.baitUntil) {
        const pc = Math.max(p.counter || 0, this.cap() * this.model.punishRate());
        if (pc && th.kind === 'tele' && th.melee && th.left > 0.2 && th.left < 1.0) {
          const sk = b.available().find((s) => (s.tags || []).includes('counter'));
          if (sk && b.skillReady(sk) && rng() < pc) { this.plan = { type: 'counter', t: Math.max(0, th.left - 0.55), th }; return; }
        }
      } else if (p.counter && th.kind === 'tele' && th.melee && th.left > 0.2 && th.left < 1.0) {
        const sk = b.available().find((s) => (s.tags || []).includes('counter'));
        if (sk && b.skillReady(sk) && rng() < p.counter) { this.plan = { type: 'counter', t: Math.max(0, th.left - 0.55), th }; return; }
      }
      // 換影閃避（劫）：近戰預警落下前與影子互換位置——影子必須在這個預警範圍外
      if (p.shadow && p.shadow.swapDodge && th.kind === 'tele' && th.melee && th.left > 0.15 && th.left < 0.9) {
        const sk = b.available().find((s) => (s.tags || []).includes('swapdodge')), sh = BD.liveShadows(this.w, b), s = sh[sh.length - 1];
        if (sk && s && b.skillReady(sk) && !U.hitShape(th.ref.shape, { x: s.x, y: s.y, r: b.r + 8 }) && rng() < p.shadow.swapDodge) {
          this.plan = { type: 'swap', t: Math.max(0, th.left - 0.3), th }; return;
        }
      }
      let pr = p.dodge * (b.sta / b.maxSta < 0.3 ? 0.6 : 1) * (th.big ? 1.2 : 1);
      if (H && this.model && this.w.time < this.baitUntil && th.melee) pr += 0.25;
      if (th.kind === 'tele' && th.ref.shape.kind === 'except') pr = Math.max(pr, 0.7);
      const roll = stamOk && rng() < pr;
      if (roll) {
        const ideal = 0.12, err = (1 - p.precision) * rng.range(-0.28, 0.18);
        const t = Math.max(0, th.left - ideal + err);
        if (!this.plan || t < this.plan.t) this.plan = { type: 'dodge', t, th };
      }
      // 走出範圍（大範圍或時間充裕時）；正在躲無法閃避的威脅時不被覆蓋
      if (undoBusy) return;
      if (th.left > 0.3 && (th.kind === 'tele') && (!roll || th.left > 0.8 || th.ref.shape.kind === 'except') && rng() < 0.45 + p.dodge * 0.5) {
        this.evade = { th, until: this.w.time + th.left + 0.15 };
      } else if (!roll && th.kind !== 'tele' && rng() < p.dodge) {
        this.evade = { th, until: this.w.time + Math.min(0.5, th.left + 0.1) };
      }
    }

    punishWindow() {
      const e = this.e, H = this.p.feat && this.p.feat.habit;
      if (H && this.dbg) this.dbg.pw = { t: this.w.time, st: e.state, stt: e.stateT, r: -1 };
      const cc = BD.statusesByTag(e, 'cc'); if (cc.length) { let r = -Infinity; for (const st of cc) r = Math.max(r, BD.statusRemaining(e, st.id)); return r; }
      if (e.state === 'skill' && !BD.hasStatus(e, 'hidden')) {
        const ph = e.skillPhase();
        if (ph === 'recovery') return e.recoveryLeft();
        if (ph === 'active' && e.recoveryLeft() > 0.9 && !this.w.telegraphs.some((t) => t.owner === e && !t.soft && U.hitShape(t.shape, this.b))) return e.recoveryLeft() * 0.5;
      }
      if (e.state === 'whiff') return e.stateDur - e.stateT + 0.25;
      if (e.state === 'recover') return e.stateDur - e.stateT + 0.15; // 連段裁切後的收招破口
      // 讀習慣：翻滾剛結束且不愛反擊 → 抓落地
      if (H && e.state === 'dodge' && this.model.attackAfterRollRate() < 0.4 && this.model.conf(this.model.c.rollEnds) > 0.4) {
        this.habitWin = true;
        return (e.def.pace ? e.def.pace.dodgeDur : 0.55) - e.stateT + 0.3;
      }
      if (e.state === 'dodge' && e.stateT > 0.3) return (e.def.pace ? e.def.pace.dodgeDur : 0.55) - e.stateT;
      if (e.state === 'idle' && e.sta < e.def.dodgeCost) return 0.3;
      // 讀習慣：對手翻滾冷卻中 → 壓上
      if (H && e.state === 'idle' && e.def.pace && this.w.time - e.lastDodgeStart < e.def.pace.dodgeCd) {
        const v = (e.def.pace.dodgeCd - (this.w.time - e.lastDodgeStart)) * (1 - this.model.attackAfterRollRate()) * 0.8;
        if (v > 0.25) { this.habitWin = true; if (this.dbg) this.dbg.pw.r = v; return v; }
      }
      return 0;
    }

    think() {
      const b = this.b, e = this.e, w = this.w, p = this.p, rng = this.rng;
      if (this.seen.size > 300) this.seen.clear();
      if (b.state !== 'idle') return;
      for (const th of this.scanThreats()) {
        if (this.seen.has(th.key)) continue;
        this.seen.set(th.key, 1);
        this.decide(th);
      }
      if (this.evade && w.time > this.evade.until) this.evade = null;
      const d = U.dist(b, e) - e.r * 0.6;
      // 移動模式
      const [mn, mx] = p.prefRange;
      if (this.mode === 'approach' && d < mx) this.modeT = 0;
      if (this.mode === 'retreat' && d > mx * 1.15 && b.sta > b.maxSta * 0.5) this.modeT = 0;
      if (this.modeT <= 0) this.chooseMode(d);
      if (this.combo && this.combo.c) return; // 連段進行中：只閃避 / 走位，不另起技能
      // 出招
      if (this.plan || this.evade || w.intro > 0) return;
      if (this.undoSafe()) return; // 無法閃避的安全圈預警中：留在圈內，不出招（突進會衝出圈外）
      // 出招後以指定的位移技能重置距離（ai.resetSkill / ai.resetFlip，例如深淵監視者的後空翻）
      if (p.resetFlip && w.time - b.lastSkillEnd < 0.2 && b.lastSkillId !== p.resetSkill && d < 170 && rng() < p.resetFlip) {
        const fl = b.available().find((s) => s.id === p.resetSkill);
        if (fl && b.skillReady(fl) && b.startSkill(fl, { quiet: true })) { this.afterAttack(); return; }
      }
      if (this.attackGap > 0) return;
      // 狀態感知（現有 Boss 不會觸發）：自身持續傷害過重 → 後撤；對手有護盾 → 降低出手意願
      if (BD.dotDps(b) >= 20 && this.mode !== 'retreat') { this.mode = 'retreat'; this.modeT = 0.8; }
      const shielded = BD.statusesByTag(e, 'shield').length > 0;
      const win = this.punishWindow();
      const ult = b.ultimate;
      if (b.ult >= 100 && d >= ult.range[0] && d <= ult.range[1] && (win > 0.5 || rng() < 0.05)) {
        if (b.startSkill(ult)) { this.afterAttack(); return; }
      }
      const SH = p.shadow, hunt = !!SH && SH.execute > 0 && e.hp <= e.maxHp * 0.5 && (b._contemptT || 0) <= w.time; // 滅魂劫就緒
      this.markKite = !!SH && !!SH.markKite && BD.hasStatus(e, 'deathmark');
      if (this.markKite && this.mode !== 'stalk' && this.mode !== 'retreat') { this.mode = 'stalk'; this.modeT = 0.6; } // 印記期間拉開距離
      this.hunt = hunt;
      this.duelAng = null; this.duelArc = null;
      if (p.duel) { // 目前最近的破綻方位（二階段有對向兩個）與本體是否已在其內
        const v = BD.vitalOf(w, b), at = U.angTo(e, b), a2 = v.ang + Math.PI;
        this.duelAng = b.phase === 2 && Math.abs(U.angDiff(at, a2)) < Math.abs(U.angDiff(at, v.ang)) ? a2 : v.ang;
        this.duelArc = Math.abs(U.angDiff(at, this.duelAng)) <= 0.8;
      }
      let chance = p.aggression * 0.2 + Math.min(0.55, (w.time - this.lastAttack) * 0.05 * (1 - p.patience * 0.6));
      if (hunt) chance += SH.execute;
      if (win > 0) chance += p.punish * 0.85;
      else if (e.isWindingUp()) chance *= 0.25 + p.aggression * 0.5;
      else if (e.state === 'idle' && e.sta > e.maxSta * 0.6 && d < mx * 1.2) chance *= 1 - p.patience * 0.55; // 耐心：等對手先出手
      if (b.sta < b.maxSta * 0.25) chance *= 0.25;
      if (shielded) chance *= 0.5;
      if (w.time - this.feintAt < 0.9 && w.time - this.feintAt > 0.3) chance += 0.7;
      if (p.stalk && win > 0.6 && d > mx && this.mode !== 'approach') { this.mode = 'approach'; this.modeT = 1.0; }
      if (p.midWait && win <= 0 && d > mn * 0.8 && d < mx * 1.8) chance *= 1 - p.midWait;
      if (p.feat && p.feat.habit && win <= 0.25 && this.baitRoll(d, 0.25)) return; // 讀習慣：誘使早滾的對手先翻滾（每次思考的機率）
      if (rng() >= chance) {
        if (d > mx * 1.3 && this.mode !== 'approach' && rng() < p.aggression * 0.3) { this.mode = 'approach'; this.modeT = rng.range(0.8, 1.6); }
        return;
      }
      // 連段（僅沉重）
      const F = p.feat, H = F && F.habit, sk = this.chooseSkill(d, win);
      // 偵錯（僅沉重）：快照威脅清單供 F6 覆蓋層繪製；light 沒有 dbg，行為完全不變
      if (this.dbg) this.dbg.threats = this.scanThreats().map((th) => {
        const o = th.kind === 'proj' ? th.ref : th.kind === 'tele' ? th.ref.shape : th.ref;
        return { kind: th.kind, left: th.left, key: th.key, x: o.x, y: o.y, undo: !!th.undo };
      });
if (F && F.combo && rng() < F.combo.rate) { const c = this.chooseCombo(d, win, sk); if (c && this.startCombo(c)) return; }
      if (!sk) return;
      const tags = sk.tags || [];
      const commit = tags.includes('melee') || tags.includes('gap');
      // 誘敵：讀到對手愛懲罰時提高假動作機率
      let featFeint = p.feint;
      if (H) {
        const m = this.model;
        featFeint = m.punishRate() * m.punishConf() > 0.45 ? Math.min(0.7, p.feint * (1 + this.cap() * m.punishRate() * F.habit.baitMul)) : p.feint;
      }
      if (featFeint === p.feint) {
        if (!win && commit && d < 320 && rng() < p.feint && b.sta > 30) {
          if (b.startFeint(rng.range(0.3, 0.5))) { this.feintAt = w.time; this.attackGap = 0.25; w.callout(b, '……'); return; }
        }
      } else if (!win && commit && d < 320 && rng() < featFeint && b.sta > 30) {
        if (b.startFeint(rng.range(0.3, 0.5))) {
          this.feintAt = w.time; this.attackGap = 0.25; this.baitUntil = w.time + 0.9; this.readStats().baits++; this.note('誘敵');
          if (this.dbg) this.dbg.bait = w.time;
          w.callout(b, '……'); return;
        }
      }
      let hold;
      if (H) { hold = this.readHold(sk); if (!hold) hold = !win && commit && rng() < p.delay ? rng.range(0.18, 0.55) : 0; }
      else hold = !win && commit && rng() < p.delay ? rng.range(0.18, 0.55) : 0;
      if (b.startSkill(sk, H ? this.holdOpts(sk, { hold }) : { hold })) {
        if (H) { this.preAim(sk); if (this.habitWin) this.readStats().rollPunish++; }
        this.afterAttack();
      }
    }
    afterAttack() {
      this.lastAttack = this.w.time;
      this.attackGap = this.rng.range(0.15, 0.6) * (1.35 - this.p.aggression);
      if (this.p.gapMul) this.attackGap *= this.p.gapMul;
    }
    // 連段結束時呼叫（ComboRunner）：與 afterAttack 相同，但連段裁切後不再被 resetFlip 打斷
    comboAfter() { this.afterAttack(); }

    // ── 連段（僅沉重）──
    startCombo(combo) {
      if (!this.combo) return false;
      if (!this.combo.start(combo)) return false;
      this.lastAttack = this.w.time;
      return true;
    }
    chooseCombo(d, win, sk) {
      const b = this.b, p = this.p, rng = this.rng, F = p.feat;
      let best = null, bs = 0;
      for (const c of this.p.combos || []) {
        if (c.phase != null && c.phase !== b.phase) continue;
        if ((this.comboCd && this.comboCd[c.id] || 0) > this.w.time) continue;
        const op = b.skills.find((s) => s.id === c.steps[0].skill);
        if (!op || !b.available().includes(op) || !b.skillReady(op) || !b.shadowOk(op)) continue;
        // 連段體力預算：整串開銷 + 原本要放的技能不得透支過多（避免體力見底）
        if (this.combo.planCost(c, F.cdGate) + (sk ? sk.cost || 0 : 0) > b.sta + b.maxSta * 0.3) continue;
        const rg = c.range || op.range;
        if (d < rg[0] || d > rg[1]) continue;
        const v = b.phase === 2 ? op.v2 : op.v1;
        const sc = (c.weight || 1) * rng.range(0.6, 1.4) * (win > 0 && v.windup <= win + 0.25 ? 1.8 : 1);
        if (sc > bs) { bs = sc; best = c; }
      }
      return best;
    }
    chooseSkill(d, win) {
      const b = this.b, e = this.e, p = this.p, rng = this.rng;
      const owned = this.w.minions.filter((m) => m.team === b.team).length;
      let best = null, bs = 0;
      for (const s of b.available()) {
        if (!b.skillReady(s) || !b.shadowOk(s)) continue;
        if (d < s.range[0] || d > s.range[1]) continue;
        if (s.summonCap && this.w.minions.filter((m) => m.alive && m.owner === b && m.kind === s.summonKind).length >= s.summonCap) continue;
        const tg = s.tags || [], v = b.phase === 2 ? s.v2 : s.v1;
        let sc = (s.weight || 1) * rng.range(0.5, 1.5);
        if (tg.includes('melee')) sc *= 0.6 + p.aggression;
        if (tg.includes('gap')) sc *= d > p.prefRange[1] * 1.15 ? 1.4 + p.aggression : 0.45;
        if (tg.includes('defensive') || tg.includes('escape')) sc *= d < p.prefRange[0] * 0.8 ? 2.6 : 0.06;
        if (tg.includes('summon')) sc *= owned < 4 ? 1.1 : 0.1;
        if (tg.includes('trap') || tg.includes('zone')) sc *= 0.85;
        if (tg.includes('ranged')) sc *= p.kiter ? 1.4 : 0.9;
        if (tg.includes('counter')) sc *= (e.isWindingUp() || d < 170) ? 0.9 * (p.counter || 0) : 0.15;
        if ((s.tags || []).includes('swapdodge')) continue; // 反應式技能：只由閃避計畫施放
        if (s.shadowMul && b.shadows && b.shadows.length) sc *= s.shadowMul; // 影子在場：影子會同步施放的招式更划算
        if (this.hunt && s.execMul) sc *= s.execMul;                        // 滅魂劫就緒：偏好普攻類
        if (this.markKite) sc *= tg.includes('ranged') ? 2 : tg.includes('melee') ? 0.4 : 1;
        if (this.duelArc != null && !tg.includes('counter')) { // 破綻感知（菲歐拉）：在破綻方位內偏好會刺出破綻的招，不在則偏好會閃到破綻方位的招
          const acts = (b.phase === 2 && s.actions2 || s.actions), vit = acts.some((a) => a.vital), stp = acts.some((a) => a.do === 'vitalstep');
          sc *= this.duelArc ? (vit ? 1.5 : 1) : stp ? 1.7 : vit ? 0.75 : 1;
        }
        if (s.phase === 2) sc *= 1.3;
        if (win > 0) { sc *= v.windup <= win + 0.25 ? 2.6 : 0.4; if (tg.includes('fast')) sc *= 1.5; if (tg.includes('counter') || tg.includes('escape')) sc *= 0.05; }
        if (sc > bs) { bs = sc; best = s; }
      }
      return best;
    }

    // ── 移動模式 ──
    chooseMode(d) {
      const b = this.b, p = this.p, rng = this.rng, [mn, mx] = p.prefRange, staR = b.sta / b.maxSta, r = rng();
      if (staR < 0.3) this.mode = r < 0.55 + p.retreat * 0.4 ? 'retreat' : 'strafe';
      else if (d > mx * 1.2) this.mode = r < 0.55 + p.aggression * 0.4 ? 'approach' : 'strafe';
      else if (d < mn * 0.8) this.mode = r < 0.25 + p.retreat ? 'retreat' : r < 0.85 ? 'strafe' : 'hold';
      else this.mode = r < (p.duel ? 0 : p.patience * 0.45) ? 'hold' : r < 0.88 ? 'strafe' : 'approach';
      if (p.stalk && staR >= 0.3 && d < mx * 2.2 && d > mn * 0.8 && rng() < p.stalk) this.mode = 'stalk';
      const A = BD.ARENA, edge = Math.min(b.x, b.y, A.w - b.x, A.h - b.y), em = 120 + Math.max(0, b.r - 40) * 1.5; // 巨型 Boss 離牆更早轉向
      if (edge < em && rng() < 0.55) {
        this.mode = 'reposition';
        const e = this.e, base = U.angTo(e, { x: A.w / 2, y: A.h / 2 }) + rng.range(-0.9, 0.9), want = (mn + mx) / 2 + 40;
        this.repoint = { x: U.clamp(e.x + Math.cos(base) * want, em, A.w - em), y: U.clamp(e.y + Math.sin(base) * want, em, A.h - em) };
      }
      if (rng() < 0.35) this.strafeDir *= -1;
      this.modeT = rng.range(0.7, 2.2);
    }
    steer(dt) {
      const b = this.b, e = this.e, w = this.w, p = this.p, A = BD.ARENA;
      const d = U.dist(b, e), toE = U.angTo(b, e), ux = Math.cos(toE), uy = Math.sin(toE);
      const tx = -uy * this.strafeDir, ty = ux * this.strafeDir;
      const [mn, mx] = p.prefRange;
      let vx = 0, vy = 0, spd = p.walk;
      const wob = Math.sin(w.time * 1.3 + this.noise) * 0.25;
      if (this.evade && w.time < this.evade.until) {
        const th = this.evade.th;
        const inside = this.stillThreat(th);
        if (inside || (th.kind === 'tele' && th.ref.shape.kind === 'except' && U.dist(b, th.ref.shape) > 25)) {
          let a;
          if (this.p.feat && this.p.feat.smartDodge) {
            // 走路閃避：最多每 0.15 秒重新評估方向
            if (w.time - this.evadeAt >= 0.15) { this.evadeAng = this.chooseEscape(th, 'walk'); this.evadeAt = w.time; }
            a = this.evadeAng != null ? this.evadeAng : this.escapeAng(th);
          } else a = this.escapeAng(th);
          vx = Math.cos(a); vy = Math.sin(a); spd = 1;
        } else { vx = tx * 0.3; vy = ty * 0.3; spd = 0.4; }
      } else {
        this.evade = null;
        switch (this.mode) {
          case 'approach': {
            const arc = U.clamp((d - mx) / 350, 0.15, 0.85);
            vx = ux + tx * arc; vy = uy + ty * arc; spd = 0.85 + p.aggression * 0.15; break;
          }
          case 'hold': {
            const rad = d < mn ? -0.6 : d > mx ? 0.5 : 0;
            vx = ux * rad + tx * 0.45; vy = uy * rad + ty * 0.45; spd = p.walk * 0.55; break;
          }
          case 'retreat': {
            const cx = A.w / 2 - b.x, cy = A.h / 2 - b.y, cl = Math.hypot(cx, cy) || 1;
            vx = -ux + tx * 0.6 + cx / cl * 0.4; vy = -uy + ty * 0.6 + cy / cl * 0.4; spd = 0.9; break;
          }
          case 'reposition': {
            const rp = this.repoint || { x: A.w / 2, y: A.h / 2 };
            const dd = U.dist(b, rp);
            if (dd < 50) { this.modeT = 0; }
            vx = (rp.x - b.x) / (dd || 1); vy = (rp.y - b.y) / (dd || 1); spd = 0.85; break;
          }
          case 'stalk': {
            // 沉重：在警戒距離外繞行觀望
            const want = mx + 60, rad = U.clamp((d - want) / 120, -0.8, 0.8) + wob * 0.5;
            vx = ux * rad + tx; vy = uy * rad + ty; spd = p.walk * 0.6; break;
          }
          default: { // strafe
            // 夾擊（劫）：繞圈方向朝「影子的對側」，讓本體與影子把對手夾在中間
            const sh = p.shadow && p.shadow.pincer && b.shadows && b.shadows.length ? b.shadows[b.shadows.length - 1] : null;
            if (sh && this.flipCd <= 0) { const dd = U.angDiff(U.angTo(e, b), U.angTo(e, sh) + Math.PI); if (Math.abs(dd) > 0.5) this.strafeDir = dd > 0 ? -1 : 1; }
            // 繞向破綻（菲歐拉）：繞圈方向朝最近的破綻方位
            if (this.duelAng != null && this.flipCd <= 0) { const dd = U.angDiff(U.angTo(e, b), this.duelAng); if (Math.abs(dd) > 0.5) this.strafeDir = dd > 0 ? -1 : 1; }
            const rad = (d < mn ? -0.8 : d > mx ? 0.7 : 0) + wob;
            vx = ux * rad + tx; vy = uy * rad + ty; spd = p.walk * (0.8 + p.strafe * 0.3);
          }
        }
      }
      // 迴避牆壁、柱子、敵方區域、陷阱與具威脅的召喚物
      const big = Math.max(0, b.r - 40), m = 120 + big * 1.5; // 巨型 Boss（r>40）：牆 / 柱子的迴避距離隨體型放大
      let ax = 0, ay = 0;
      if (b.x < m) ax += (m - b.x) / m * 1.6; if (b.x > A.w - m) ax -= (b.x - (A.w - m)) / m * 1.6;
      if (b.y < m) ay += (m - b.y) / m * 1.6; if (b.y > A.h - m) ay -= (b.y - (A.h - m)) / m * 1.6;
      if ((ax || ay) && (this.mode === 'strafe' || this.mode === 'hold') && this.flipCd <= 0 && (tx * ax + ty * ay) < -0.3) {
        this.strafeDir *= -1; this.flipCd = 1.2;
      }
      for (const pl of A.pillars) {
        const dx = b.x - pl.x, dy = b.y - pl.y, dd = Math.hypot(dx, dy), lim = pl.r + b.r + 50 + big, sl = big ? 1.1 : 0.6;
        if (dd < lim) { const k = (lim - dd) / lim * 1.8; ax += dx / dd * k - dy / dd * k * sl * this.strafeDir; ay += dy / dd * k + dx / dd * k * sl * this.strafeDir; }
      }
      for (const z of w.zones) {
        if (z.team === b.team) continue;
        const dx = b.x - z.x, dy = b.y - z.y, dd = Math.hypot(dx, dy) || 1, lim = z.r + b.r + 30;
        if (dd < lim) { const k = (lim - dd) / lim * 2.5 + 0.3; ax += dx / dd * k; ay += dy / dd * k; }
      }
      for (const t of w.traps) {
        if (t.team === b.team) continue;
        const dx = b.x - t.x, dy = b.y - t.y, dd = Math.hypot(dx, dy) || 1, lim = 80 + b.r;
        if (dd < lim) { const k = (lim - dd) / lim * 1.6; ax += dx / dd * k; ay += dy / dd * k; }
      }
      for (const mi of w.minions) {
        if (mi.team === b.team || !BD.minionType(mi.kind).threat) continue; // 只避開具威脅的召喚物（defineMinion 的 threat）
        const dx = b.x - mi.x, dy = b.y - mi.y, dd = Math.hypot(dx, dy) || 1;
        if (dd < 140) { const k = (140 - dd) / 140 * (p.kiter ? 1.2 : 0.4); ax += dx / dd * k; ay += dy / dd * k; }
      }
      vx += ax; vy += ay;
      // 無法閃避的 except 預警（絕對零度）：安全圈是唯一的合法位置 → 直奔圈心，已在圈內則幾乎站定
      const sz = this.undoSafe();
      if (sz) {
        const dd = U.dist(b, sz), lim = Math.max(10, sz.r - b.r * 0.5 - 12);
        if (dd > lim * 0.6) { vx = (sz.x - b.x) / (dd || 1); vy = (sz.y - b.y) / (dd || 1); spd = 1; }
        else { vx *= 0.15; vy *= 0.15; spd = Math.min(spd, 0.3); }
      }
      // 巨型 Boss 卡在牆 / 柱子邊（想走卻幾乎沒動）超過 0.2 秒 → 反向繞行
      if (big) {
        const mv = this.lx != null ? Math.hypot(b.x - this.lx, b.y - this.ly) : 99; this.lx = b.x; this.ly = b.y;
        if ((ax || ay) && b.state === 'idle' && mv < b.def.speed * spd * dt * 0.25) this.stuckT = (this.stuckT || 0) + dt; else this.stuckT = 0;
        if (this.stuckT > 0.2) { this.strafeDir *= -1; this.stuckT = 0; if (this.mode === 'approach' || this.mode === 'retreat') this.modeT = 0; }
      }
      const l = Math.hypot(vx, vy);
      if (l > 0.01) { b.moveX = vx / l * spd; b.moveY = vy / l * spd; } else { b.moveX = b.moveY = 0; }
    }
  }
  BD.AIController = AIController;
})(typeof window !== 'undefined' ? window : globalThis);
