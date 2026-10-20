'use strict';
// 特效系統（純視覺狀態：粒子、光暈、光環 / 震波、斬痕、光束、拖影、殘影、浮動文字、地面痕跡 / 裂痕、場地暗幕、畫面震動 / 閃光）
// 不觸碰 DOM；Node 模擬照常載入（只累積資料、不繪製），繪圖由 js/render/world.js 讀取。
// 亂數一律使用視覺亂數 BD.vrng（不可用 w.rng），因此特效不影響戰鬥結果與行為指紋。
// 粒子使用物件池（free-list）；死亡元素以原地壓縮移除，避免每幀配置新陣列。
// 高層特效（斬擊、砸地…）定義在 js/fx/，以 BD.spawnFx(w, 'slam', x, y, opts) 產生；本檔只提供「原件」。
(function (G) {
  const BD = G.BD, U = BD.U, V = BD.vrng;
  const PART_CAP = 900, POOL_CAP = 1000, DECAL_CAP = 70, GLOW_CAP = 80, STREAK_CAP = 120, GHOST_CAP = 40, PUFF_CAP = 260, STALK_CAP = 1100, PRINT_CAP = 500;
  // 粒子種類（kind）：繪圖端依此分批
  const PK = BD.PK = { SQ: 0, SOFT: 1, DEBRIS: 2, EMBER: 3, SHARD: 4, BUBBLE: 5, WISP: 6, SPARK: 7, MOTE: 8 };
  function newPart() { return { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0, color: '', size: 0, drag: 0, soft: false, kind: 0, z: 0, vz: 0, g: 0, ay: 0, ph: 0 }; }
  // 原地壓縮：只保留存活元素（維持順序），dead 可回收
  function compact(arr, onDead) {
    let n = 0;
    for (let i = 0; i < arr.length; i++) {
      const e = arr[i];
      if (e.life > 0) { arr[n++] = e; } else if (onDead) onDead(e);
    }
    arr.length = n;
  }
  class FX {
    constructor(w) {
      this.w = w; this.curE = null; this.parts = []; this.rings = []; this.slashes = []; this.beams = []; this.texts = []; this.decals = []; this.pillars = [];
      this.glows = []; this.shocks = []; this.streaks = []; this.ghosts = []; this.veils = []; this.timers = []; this.chunks = [];
      this.scars = []; // 永久戰鬥痕跡（js/fx/scars.js）；不隨 life 消失，只累計 age（餘燼冷卻用）
      this.puffs = []; this.stalks = []; this.prints = []; this.gusts = [];
      this.field = {}; // 麥田被摧毀的格子（格號 → 1）
      this.pool = [];
      this.shakeV = 0; this.shakeDir = null; this.shakeT = 0; this.flashA = 0; this.flashC = '#fff';
      this.curDir = null; // 目前特效的震動預設方向（BD.spawnFx 設定）
      this.punchV = 0; this.pushes = []; this.grades = []; this.zx = null; this.zy = null; // 鏡頭縮放 / 色調（純視覺，隨真實時間更新）
    }
    // 從池中取一個粒子（無則新建）
    takePart() { return this.pool.length ? this.pool.pop() : newPart(); }
    putPart(p) { p.color = ''; if (this.pool.length < POOL_CAP) this.pool.push(p); }
    // 粒子預算：場上粒子越多，新特效的粒子數越少（PART_CAP 仍是硬上限）
    budget(n) { const used = this.parts.length / PART_CAP; return Math.round(n * (used < 0.55 ? 1 : used < 0.8 ? 0.6 : 0.3)); }
    // 新增一個粒子（達上限時回傳 null）
    part(kind, x, y, vx, vy, life, color, size, drag) {
      if (this.parts.length >= PART_CAP) return null;
      const p = this.takePart();
      p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life; p.color = color; p.size = size; p.drag = drag;
      p.kind = kind; p.soft = kind === PK.SOFT || kind === PK.WISP; p.z = 0; p.vz = 0; p.g = 0; p.ay = 0; p.ph = V() * U.TAU;
      this.parts.push(p); return p;
    }
    sparks(x, y, color, n, speed) {
      for (let i = 0; i < n && this.parts.length < PART_CAP; i++) {
        const a = V() * U.TAU, s = speed * (0.25 + V() * 0.75), l = 0.25 + V() * 0.4;
        this.part(PK.SQ, x, y, Math.cos(a) * s, Math.sin(a) * s, l, color, 1.5 + V() * 2.5, 4);
      }
    }
    // 加亮火花：沿速度方向拉長的線段（additive），dir/spread 可限制噴射角度
    sparkle(x, y, color, n, speed, dir, spread) {
      n = this.budget(n);
      for (let i = 0; i < n; i++) {
        const a = dir == null ? V() * U.TAU : dir + (V() - 0.5) * (spread || 1), s = speed * (0.35 + V() * 0.65), l = 0.18 + V() * 0.3;
        if (!this.part(PK.SPARK, x, y, Math.cos(a) * s, Math.sin(a) * s, l, color, 1.5 + V() * 1.5, 5)) break;
      }
    }
    smoke(x, y, color, n, spread) {
      for (let i = 0; i < n && this.parts.length < PART_CAP; i++) {
        const a = V() * U.TAU, s = 20 + V() * 60, l = 0.6 + V() * 0.6;
        this.part(PK.SOFT, x + Math.cos(a) * V() * (spread || 20), y + Math.sin(a) * V() * (spread || 20), Math.cos(a) * s, Math.sin(a) * s, l, color, 6 + V() * 10, 2);
      }
    }
    // 碎塊：有假高度 z（俯視角以陰影位移 + 縮放表現），受重力落地彈跳
    debris(x, y, color, n, speed, size, spread) {
      n = this.budget(n);
      for (let i = 0; i < n; i++) {
        const a = V() * U.TAU, s = speed * (0.3 + V() * 0.7), r = V() * (spread || 0);
        const p = this.part(PK.DEBRIS, x + Math.cos(a) * r, y + Math.sin(a) * r, Math.cos(a) * s, Math.sin(a) * s, 0.9 + V() * 0.7, color, (size || 4) * (0.6 + V() * 0.8), 1.2);
        if (!p) break;
        p.vz = 120 + V() * 260 * (speed / 300); p.g = 900;
      }
    }
    // 上升餘燼（additive，閃爍、緩慢上飄）
    embers(x, y, color, n, spread, rise) {
      n = this.budget(n);
      for (let i = 0; i < n; i++) {
        const a = V() * U.TAU, r = V() * (spread || 20);
        const p = this.part(PK.EMBER, x + Math.cos(a) * r, y + Math.sin(a) * r, (V() - 0.5) * 50, -(rise || 40) * (0.4 + V() * 0.8), 0.7 + V() * 0.9, color, 1.5 + V() * 2.2, 1.2);
        if (!p) break;
        p.ay = -(rise || 40) * 0.8;
      }
    }
    // 元素額外粒子行為（依元素主題的 extra）：embers / shards / bubbles / wisps / crackle / drips / runes / motes / dust
    motes(x, y, E, n, spread, speed) {
      const ex = E && E.extra; if (!ex || n <= 0) return;
      spread = spread || 20; speed = speed || 120;
      if (ex === 'embers') { this.embers(x, y, E.core, n, spread, 50); return; }
      if (ex === 'dust') { this.debris(x, y, E.debris || E.particle, Math.ceil(n * 0.6), speed, 3.5, spread * 0.5); return; }
      if (ex === 'drips') { this.debris(x, y, E.particle, n, speed * 0.8, 2.6, spread * 0.4); return; }
      if (ex === 'crackle') {
        // 電弧：短折線（以拖影段表現）
        const k = Math.max(1, Math.round(n / 3));
        for (let i = 0; i < k; i++) {
          let px = x + (V() - 0.5) * spread * 2, py = y + (V() - 0.5) * spread * 2, a = V() * U.TAU;
          for (let j = 0; j < 3; j++) { const L = 10 + V() * 18, nx = px + Math.cos(a) * L, ny = py + Math.sin(a) * L; this.streak(px, py, nx, ny, 2.2, E.core, 0.12 + V() * 0.08, true); px = nx; py = ny; a += (V() - 0.5) * 2.2; }
        }
        this.sparkle(x, y, E.glow, Math.ceil(n * 0.5), speed * 1.4);
        return;
      }
      n = this.budget(n);
      for (let i = 0; i < n; i++) {
        const a = V() * U.TAU, r = V() * spread, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        let p;
        if (ex === 'shards') { const s = speed * (0.5 + V()); p = this.part(PK.SHARD, px, py, Math.cos(a) * s, Math.sin(a) * s, 0.35 + V() * 0.35, E.core, 3 + V() * 4, 3.5); }
        else if (ex === 'bubbles') { p = this.part(PK.BUBBLE, px, py, (V() - 0.5) * 30, -10 - V() * 25, 0.6 + V() * 0.8, E.particle, 2.5 + V() * 4, 1.5); }
        else if (ex === 'wisps') { const s = 20 + V() * 40; p = this.part(PK.WISP, px, py, Math.cos(a) * s, Math.sin(a) * s - 15, 0.7 + V() * 0.7, E.particle, 5 + V() * 7, 1.2); }
        else if (ex === 'runes' || ex === 'motes') { const s = 10 + V() * 40; p = this.part(PK.MOTE, px, py, Math.cos(a) * s, Math.sin(a) * s - (ex === 'motes' ? 25 : 0), 0.6 + V() * 0.8, E.core, 1.5 + V() * 2, 1.5); if (p && ex === 'motes') p.ay = -20; }
        if (!p) break;
      }
    }
    ring(x, y, r0, r1, life, color, width) { this.rings.push({ x, y, r0, r1, life, max: life, color, width: width || 3 }); }
    // 震波：明亮前緣 + 淡淡的內部填色，半徑以 easeOut 擴張；core 為前緣亮色（additive）
    shock(x, y, r0, r1, life, color, width, core) {
      this.shocks.push({ x, y, r0, r1, life, max: life, color, width: width || 6, core: core || '#ffffff', rim: this.rim() });
    }
    // 對比邊緣色：取目前正在產生的特效的元素主題（BD.spawnFx 期間設定 curE），沒有則不描邊
    rim() { return (this.curE && this.curE.rim) || null; }
    // opts：{ core 亮核心色（additive）, trail 殘影弧數, rim 對比邊緣色（省略時取目前元素） }
    slash(x, y, ang, arc, r, color, width, life, opts) {
      const L = life || 0.22;
      const s = { x, y, ang, arc, r, color, width: width || 10, life: L, max: L, core: null, trail: 0, rim: this.rim() };
      if (opts) { s.core = opts.core || null; s.trail = opts.trail || 0; if (opts.rim !== undefined) s.rim = opts.rim; }
      this.slashes.push(s);
    }
    beam(x1, y1, x2, y2, w, color, life, core) { this.beams.push({ x1, y1, x2, y2, w, color, life: life || 0.25, max: life || 0.25, core: core || null, rim: this.rim() }); }
    // 拖影 / 動態殘跡：由 (x1,y1) 漸細到 (x2,y2) 的亮線（add=true 時以 additive 繪製）
    streak(x1, y1, x2, y2, w, color, life, add) {
      if (this.streaks.length >= STREAK_CAP) return;
      this.streaks.push({ x1, y1, x2, y2, w, color, life: life || 0.25, max: life || 0.25, add: !!add });
    }
    // 光暈（additive）：r 半徑、a 不透明度；grow > 0 時半徑隨時間由 r 往 r*(1+grow) 擴張；follow 物件（有 x / y）時跟隨其位置
    glow(x, y, r, color, life, a, grow, follow) {
      if (this.glows.length >= GLOW_CAP) return;
      this.glows.push({ x, y, r, color, life, max: life, a: a == null ? 1 : a, grow: grow || 0, follow: follow || null, inv: false });
    }
    // 蓄力光：由暗漸亮、半徑收縮（inv），並有向內聚集的光點
    charge(x, y, r, color, life, follow, n) {
      if (this.glows.length < GLOW_CAP) this.glows.push({ x, y, r, color, life, max: life, a: 0.9, grow: 0.8, follow: follow || null, inv: true });
      n = this.budget(n == null ? 10 : n);
      for (let i = 0; i < n; i++) {
        const a = V() * U.TAU, d = r * (1.2 + V() * 0.8), l = life * (0.5 + V() * 0.5), s = d / l;
        const p = this.part(PK.MOTE, x + Math.cos(a) * d, y + Math.sin(a) * d, -Math.cos(a) * s, -Math.sin(a) * s, l, color, 1.6 + V() * 1.6, 0);
        if (!p) break;
      }
    }
    // 局部閃光：衝擊點的短暫強光（additive）
    flashAt(x, y, r, color, life) { this.glow(x, y, r, color || '#ffffff', life || 0.12, 1, 0.3); }
    // 殘影：記錄單位外形（繪圖端以 R.drawBossBody 半透明繪製）
    ghost(u, life, color) {
      if (!u || this.ghosts.length >= GHOST_CAP) return;
      this.ghosts.push({ x: u.x, y: u.y, face: u.face, r: u.r, def: u.def, phase: u.phase, life: life || 0.35, max: life || 0.35, color: color || null });
    }
    pillar(x, y, r, color, life) { this.pillars.push({ x, y, r, color, life: life || 0.5, max: life || 0.5 }); }
    // 斷樹的一半：a0 為切線（刃）方向，side（±1）決定留哪一側，spin 為之後累積的旋轉；繪圖端畫半棵樹並漸隱
    chunk(x, y, vx, vy, a0, vr, side, r, v, life) { this.chunks.push({ x, y, vx, vy, a0, spin: 0, vr, side, r, v, life: life || 1.1, max: life || 1.1 }); }
    // 大型柔軟塵團（沙塵 / 雪沫 / 麥屑）：半徑由 r0 擴到 r1、緩慢飄散；tint 為繪圖端的預烘焙色票（'sand' | 'snow' | 'wheat'）
    puff(x, y, vx, vy, r0, r1, life, tint, al) { this.puffs.push({ x, y, vx, vy, r0, r1, life, max: life, tint, al }); if (this.puffs.length > PUFF_CAP) this.puffs.shift(); }
    // 飛濺的長條 / 團塊（麥稈、麥粒、雪塊）：帶高度 z 的拋物線，落地後滑行並漸隱；len 為長度、w 為線寬
    stalk(x, y, vx, vy, vz, rot, vr, len, w, col, life) { if (this.stalks.length >= STALK_CAP) return; this.stalks.push({ x, y, z: 4, vx, vy, vz, rot, vr, len, w, col, life, max: life }); }
    // 腳印：kind 'snow'（深雪、留很久）/ 'desert'（淺、很快被風吹平）
    print(x, y, a, r, kind) { const life = kind === 'snow' ? 40 : 9; this.prints.push({ x, y, a, r, kind, life, max: life }); if (this.prints.length > PRINT_CAP) this.prints.shift(); }
    // 衝擊風圈：麥浪沿圈擴散（繪圖端用來讓麥叢向外傾倒）
    gust(x, y, r) { this.gusts.push({ x, y, r, life: 0.9, max: 0.9 }); if (this.gusts.length > 10) this.gusts.shift(); }
    text(x, y, text, color, size) { this.texts.push({ x: x + (V() - 0.5) * 16, y, text, color, size: size || 16, life: 1.0, max: 1.0, vy: -50 }); }
    damage(b, dmg, color) {
      const big = dmg >= 100;
      this.texts.push({ x: b.x + (V() - 0.5) * 30, y: b.y - b.r - 6, text: String(dmg), color, size: big ? 26 : 17, life: big ? 1.2 : 0.9, max: big ? 1.2 : 0.9, vy: -70, pop: big });
    }
    decal(x, y, r, color, life) { this.decals.push({ x, y, r, color, life: life || 8, max: life || 8, segs: null }); if (this.decals.length > DECAL_CAP) this.decals.shift(); }
    // 地面裂痕（程序生成，以 vrng 決定分岔）：segs 為 [x1,y1,x2,y2,寬] 的扁平陣列；glow 為裂縫內的發光色（可為 null）
    crack(x, y, r, color, life, glow, branches) {
      const segs = [], nb = branches || Math.max(5, Math.round(r / 14));
      const walk = (px, py, a, len, w, depth) => {
        const steps = 3 + Math.floor(V() * 3), sl = len / steps;
        for (let i = 0; i < steps; i++) {
          a += (V() - 0.5) * 0.7;
          const nx = px + Math.cos(a) * sl, ny = py + Math.sin(a) * sl;
          segs.push(px, py, nx, ny, w); px = nx; py = ny; w *= 0.78;
          if (depth < 1 && V() < 0.35) walk(px, py, a + (V() < 0.5 ? 1 : -1) * (0.5 + V() * 0.6), len * 0.45, w * 0.8, depth + 1);
        }
      };
      for (let i = 0; i < nb; i++) { const a = i / nb * U.TAU + (V() - 0.5) * 0.6; walk(x + Math.cos(a) * r * 0.08, y + Math.sin(a) * r * 0.08, a, r * (0.55 + V() * 0.45), Math.max(1.5, r / 30), 0); }
      this.decals.push({ x, y, r, color: color || 'rgba(0,0,0,0.55)', life: life || 9, max: life || 9, segs, glow: glow || null });
      if (this.decals.length > DECAL_CAP) this.decals.shift();
    }
    // 畫面震動：dir（弧度，可省略）為受擊方向——有方向時畫面沿該方向來回擺動，比四面亂抖更扎實
    shake(v, dir) {
      if (dir == null) dir = this.curDir;
      if (dir != null && v >= this.shakeV * 0.6) this.shakeDir = dir;
      this.shakeV = Math.min(26, Math.max(this.shakeV, v) + v * 0.15);
    }
    // 本幀的震動位移（繪圖端使用；out 物件重用，不配置）：
    // 有方向 → 沿方向的衰減擺動 + 少量垂直抖動；無方向 → 兩個頻率的正弦疊加少量雜訊（比純亂數平滑、不刺眼）
    shakeOffset(out) {
      const sh = this.shakeV * (this.shakeScale == null ? 1 : this.shakeScale), t = this.shakeT || 0;
      if (sh <= 0.05) { out.x = 0; out.y = 0; return out; }
      if (this.shakeDir != null) {
        const c = Math.cos(this.shakeDir), s = Math.sin(this.shakeDir);
        const m = Math.sin(t * 52) * sh * 0.55, p = (V() - 0.5) * sh * 0.25;
        out.x = c * m - s * p; out.y = s * m + c * p;
      } else {
        out.x = (Math.sin(t * 47) * 0.32 + (V() - 0.5) * 0.36) * sh;
        out.y = (Math.sin(t * 59 + 1.3) * 0.32 + (V() - 0.5) * 0.36) * sh;
      }
      return out;
    }
    // 場地暗幕：地面與區域變暗、角色 / 預警 / 特效照常明亮（聚光燈感）；淡入淡出由繪圖端處理
    veil(life, a, color) { this.veils.push({ life, max: life, a, color: color || '#000000' }); }
    flash(c, a) { this.flashC = c; this.flashA = Math.max(this.flashA, a); }
    // 鏡頭衝擊縮放：瞬間拉近 v（0.03 ≈ 3%）再快速回彈，圍繞 (x, y) 世界座標
    punch(v, x, y) { this.punchV = Math.min(0.08, Math.max(this.punchV, v)); this.zx = x; this.zy = y; }
    // 鏡頭持續推近：life 秒內淡入（0.2 秒）、淡出（最後 40%），推近量 z
    push(z, life, x, y) { this.pushes.push({ z, life, max: life }); if (this.pushes.length > 4) this.pushes.shift(); this.zx = x; this.zy = y; }
    // 色調 + 暗角：整個畫面疊上 color 的淡色與四周暗角，a 為強度
    grade(color, a, life) { this.grades.push({ color, a, life, max: life }); if (this.grades.length > 4) this.grades.shift(); }
    // 目前鏡頭縮放倍率（繪圖端使用）
    zoomNow() {
      let z = this.punchV;
      for (const p of this.pushes) { const e = Math.min(1, (p.max - p.life) / 0.2, p.life / (p.max * 0.4)); if (e > 0) z = Math.max(z, p.z * e * e * (3 - 2 * e)); }
      return 1 + z;
    }
    // 特效內部的延遲（依模擬時間；不使用 w.later，因此不影響世界排程）
    after(t, fn) { this.timers.push({ t, fn, e: this.curE, d: this.curDir }); }
    update(dt) {
      if (this.timers.length) {
        const due = [];
        for (const tm of this.timers) { tm.t -= dt; if (tm.t <= 0) due.push(tm); }
        if (due.length) { this.timers = this.timers.filter((tm) => tm.t > 0); for (const tm of due) { this.curE = tm.e; this.curDir = tm.d; try { tm.fn(); } finally { this.curE = null; this.curDir = null; } } }
      }
      const parts = this.parts, pool = this.pool;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.ay) p.vy += p.ay * dt;
        if (p.g) {
          p.vz -= p.g * dt; p.z += p.vz * dt;
          if (p.z <= 0) { p.z = 0; if (p.vz < -60) { p.vz = -p.vz * 0.32; p.vx *= 0.55; p.vy *= 0.55; } else { p.vz = 0; p.vx *= 0.8; p.vy *= 0.8; } }
        }
        const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k;
      }
      compact(parts, (p) => { if (pool.length < POOL_CAP) { p.color = ''; pool.push(p); } });
      const arrs = [this.rings, this.slashes, this.beams, this.texts, this.decals, this.pillars, this.glows, this.shocks, this.streaks, this.ghosts, this.veils, this.chunks, this.puffs, this.stalks, this.prints, this.gusts];
      for (let j = 0; j < arrs.length; j++) { const arr = arrs[j]; for (let i = 0; i < arr.length; i++) arr[i].life -= dt; }
      const pk = Math.exp(-1.1 * dt);
      for (const p of this.puffs) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= pk; p.vy *= pk; }
      for (const s of this.stalks) {
        s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt;
        if (s.z > 0) { s.vz -= 1100 * dt; s.z += s.vz * dt; if (s.z <= 0) { s.z = 0; s.vr = 0; s.vx *= 0.35; s.vy *= 0.35; } } else { const k = Math.exp(-6 * dt); s.vx *= k; s.vy *= k; }
      }
      for (const c of this.chunks) { c.x += c.vx * dt; c.y += c.vy * dt; c.spin += c.vr * dt; const k = Math.exp(-3 * dt); c.vx *= k; c.vy *= k; c.vr *= k; }
      for (const s of this.scars) s.age += dt;
      for (const t of this.texts) t.y += t.vy * dt, (t.vy *= Math.exp(-2.5 * dt));
      for (let j = 0; j < arrs.length; j++) compact(arrs[j]);
    }
    realUpdate(dt) {
      this.shakeT = (this.shakeT || 0) + dt;
      this.shakeV *= Math.exp(-7 * dt); if (this.shakeV < 0.05) { this.shakeV = 0; this.shakeDir = null; }
      this.flashA = Math.max(0, this.flashA - dt * 1.6);
      this.punchV *= Math.exp(-10 * dt); if (this.punchV < 0.0005) this.punchV = 0;
      for (const a of [this.pushes, this.grades]) for (let i = a.length - 1; i >= 0; i--) if ((a[i].life -= dt) <= 0) a.splice(i, 1);
    }
  }
  BD.FX = FX;
  BD.FX_CAPS = { PART_CAP, DECAL_CAP, GLOW_CAP, STREAK_CAP, GHOST_CAP };

  // ── 特效庫入口 ──
  // 單位（Boss / 召喚物）目前的預設元素：phase2.fxEl（二階段）→ def.fxEl → 'physical'
  BD.fxElementOf = function (u) {
    if (!u) return 'physical';
    if (!u.def && u.owner) u = u.owner;
    const d = u.def; if (!d) return 'physical';
    return (u.phase === 2 && d.phase2 && d.phase2.fxEl) || d.fxEl || 'physical';
  };
  // BD.spawnFx(w, spec, x, y, opts)
  //   spec：特效 id 字串或 { id, el, scale, color, intensity, ... }（資料中的 fx 欄位）
  //   opts（呼叫端提供）：src 施放者、el 元素、scale 倍率、angle 角度、arc 弧度、radius 半徑、r0 內半徑、len / width 長寬、
  //        dmg 傷害（推得 intensity）、intensity 強度、weight 重量感（預設由 src 半徑推得）、color 覆寫顏色、life 持續
  //   合併順序：effect.params（預設）< opts（呼叫端）< spec 物件欄位（資料）
  //   effect.spawn(fx, x, y, o) 收到的 o 另含：E 元素主題、k 綜合倍率、heavy 是否沉重節奏
  BD.spawnFx = function (w, spec, x, y, opts) {
    const P = BD.parseFx(spec); if (!P || !w || !w.fx) return null;
    const def = BD.effect(P.id);
    // 合併時略過 undefined（例如圓形判定沒有 arc / len），讓特效的預設參數不會被空值蓋掉
    const o = {};
    for (const part of [def.params, opts, P.opts]) if (part) for (const k in part) if (part[k] !== undefined) o[k] = part[k];
    const src = o.src || null;
    o.el = o.el || BD.fxElementOf(src);
    let E = BD.element(o.el);
    if (o.color) E = Object.assign({}, E, { glow: o.color, particle: o.color });
    o.E = E;
    if (o.scale == null) o.scale = 1;
    if (o.weight == null) o.weight = src && src.r ? U.clamp(Math.pow(src.r / 24, 0.6), 0.8, 2.2) : 1;
    if (o.intensity == null) o.intensity = o.dmg ? U.clamp(o.dmg / 90, 0.55, 2.4) : 1;
    o.k = o.scale * Math.sqrt(o.weight * o.intensity);
    if (o.radius == null) o.radius = 60 * o.scale * o.weight;
    if (o.angle == null) o.angle = src && src.face != null ? src.face : 0;
    o.heavy = !!w.pace;
    if (BD.sfx) BD.sfx.fx(P.id, def.category, o); // 音效（僅瀏覽器載入 js/audio.js；無頭模擬沒有 BD.sfx）
    // curE 讓原件（斬擊 / 震波 / 光束）取得元素的對比邊緣色（fx.after 延遲產生的部分也會沿用）
    w.fx.curE = E;
    // 斬擊 / 突刺的震動順著揮擊方向，砸地則上下重擊；其餘維持原本的四向抖動
    w.fx.curDir = def.category === '斬擊' || def.category === '突刺' ? o.angle : def.category === '砸地' ? Math.PI / 2 : null;
    try { def.spawn(w.fx, x, y, o); } finally { w.fx.curE = null; w.fx.curDir = null; }
    if (BD.leaveScar) BD.leaveScar(w, P.id, def.category, x, y, o);
    return o;
  };
})(typeof window !== 'undefined' ? window : globalThis);
