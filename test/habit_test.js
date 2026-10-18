// 讀習慣煙霧測試（玩家模式替身）：node test/habit_test.js [seeds=1,2,3,4,5,6] [playerBoss=watcher]
// 以腳本「玩家」對上每一位 AI Boss（沉重）：玩家看到對手蓄力 / 預警後固定 0.3 秒就往固定方向（相對 Boss 的左側）翻滾（＝背了節奏、習慣性過早翻滾），
// 偶爾出招。統計各時段內玩家翻滾後被抓（無敵結束後、下一次翻滾前（最多 2.2 秒）受到 Boss 直接命中）的比例，
// 並與關閉讀習慣（feat.habit = null）的同一批對戰比較。讀習慣有效 → 開啟時被抓率隨時間上升、且高於關閉時。
'use strict';
const { load } = require('./lib/load');
const seeds = (process.argv[2] || '1,2,3,4,5,6,7,8,9,10').split(',').map(Number);
const playerId = process.argv[3] || 'watcher';
const EDGES = [0, 15, 45, 90, 150], DUR = 150; // 時段：0–15 秒（尚未學會）、15–45、45–90、90–150

function run(habitOn) {
  const { BD } = load(); const U = BD.U;
  const feat = BD.PACES.heavy.ai.feat;
  if (!habitOn) { BD.PACES.heavy.ai = Object.assign({}, BD.PACES.heavy.ai, { feat: Object.assign({}, feat, { habit: null }) }); BD.clearPaceCache(); }
  class ScriptedEarlyRoller {
    constructor(b, w) { this.b = b; this.w = w; this.seen = new Set(); this.atkT = 2; this.strafe = 1; this.isPlayer = false; this.rolls = []; }
    update(dt) {
      const b = this.b, e = b.enemy, w = this.w, d = U.dist(b, e);
      b.wantFace = U.angTo(b, e);
      // 早滾：看到新的蓄力（含假動作）或命中預警後固定 0.3 秒就翻滾（背下了「正常」節奏、總是滾太早），方向固定為「相對 Boss 的左側」
      const keys = [];
      if (e.isWindingUp() && d < 420) keys.push(e.state === 'feint' ? 'f' + e.stats.feints : 'g' + (e.inst && e.inst.id));
      for (const t of w.telegraphs) if (t.owner === e && !t.soft && U.hitShape(t.shape, { x: b.x, y: b.y, r: b.r + 10 })) keys.push('t' + t.id);
      for (const k of keys) if (!this.seen.has(k)) { this.seen.add(k); if (this.rollAt == null) this.rollAt = w.time + 0.3; }
      if (this.rollAt != null && w.time >= this.rollAt) {
        this.rollAt = null;
        const ang = U.angTo(e, b) - Math.PI / 2; // 對 Boss 而言：玩家往其左手邊滾
        if (b.tryDodge(ang)) this.rolls.push(w.time);
      }
      // 移動：在 150~220 距離附近繞圈
      const ux = Math.cos(b.wantFace), uy = Math.sin(b.wantFace), rad = d > 220 ? 0.8 : d < 150 ? -0.8 : 0;
      if (w.time % 6 < 0.02) this.strafe *= -1;
      b.moveX = ux * rad - uy * this.strafe; b.moveY = uy * rad + ux * this.strafe;
      const l = Math.hypot(b.moveX, b.moveY) || 1; b.moveX /= l; b.moveY /= l;
      // 偶爾出招（讓 Boss 也有破綻與懲罰的機會）
      this.atkT -= dt;
      if (this.atkT <= 0 && b.state === 'idle') {
        this.atkT = 3;
        const sk = b.available().find((s) => b.skillReady(s) && d >= s.range[0] && d <= s.range[1] && !(s.tags || []).includes('summon'));
        if (sk) b.startSkill(sk, { quiet: true });
      }
    }
  }
  const ids = BD.bosses.map((x) => x.id), byId = BD.bossById;
  const res = {};
  for (const id of ids) {
    const win = []; for (let i = 0; i < EDGES.length - 1; i++) win.push({ rolls: 0, caught: 0 });
    let earlyEnd = [];
    for (const seed of seeds) {
      const w = new BD.World(byId[playerId], byId[id], { seed, intro: 0.5, pace: 'heavy' });
      const P = w.bosses[0], A = w.bosses[1];
      P.maxHp = P.hp = 1e7; A.maxHp = A.hp = 1e7; // 不讓對戰結束：只觀察 150 秒內的判讀
      const ctl = new ScriptedEarlyRoller(P, w); P.controller = ctl;
      const hits = [];
      const dmg0 = w.damageBoss.bind(w);
      w.damageBoss = function (src, b, p) { const hp = b.hp, r = dmg0(src, b, p); if (b === P && !p.dot && b.hp < hp && src && (src === A || src.owner === A)) hits.push(w.time); return r; };
      while (w.time < DUR && !w.over) { w.hitstop = 0; w.slowmo = 0; w.step(BD.STEP); }
      for (const t of ctl.rolls) {
        let i = 0; while (i < win.length - 1 && t >= EDGES[i + 1]) i++;
        win[i].rolls++;
        // 被抓：無敵結束後、下一次成功翻滾之前（最多 2.2 秒）被 Boss 直接命中＝這次翻滾沒有躲掉該次攻擊
        const nx = ctl.rolls.find((r) => r > t) || Infinity, end = Math.min(t + 2.2, nx);
        if (hits.some((h) => h >= t + 0.3 && h <= end)) win[i].caught++;
      }
      const m = A.controller.model;
      if (m && m.early) earlyEnd.push(m.early());
    }
    res[id] = { win, early: earlyEnd.length ? earlyEnd.reduce((s, x) => s + x, 0) / earlyEnd.length : null };
  }
  return res;
}
const on = run(true), off = run(false);
const pct = (w) => (w.rolls ? (100 * w.caught / w.rolls).toFixed(0).padStart(3) + '%' : '  — ');
console.log(`腳本玩家（${playerId}，習慣性早滾＋固定往 Boss 左側）被抓率，時段 ${EDGES.slice(0, -1).map((e, i) => e + '–' + EDGES[i + 1] + 's').join(' / ')}，種子 ${seeds.join(',')}`);
let tot = { on: [0, 0, 0, 0], off: [0, 0, 0, 0] };
for (const id in on) {
  const a = on[id].win, b = off[id].win;
  console.log(`  ${id.padEnd(8)} 讀習慣 開：${a.map(pct).join(' ')}  關：${b.map(pct).join(' ')}` + (on[id].early != null ? `  （模型判定早滾比例 ${(100 * on[id].early).toFixed(0)}%）` : ''));
  tot.on[0] += a[0].caught; tot.on[1] += a[0].rolls; tot.on[2] += a.slice(-2).reduce((s, x) => s + x.caught, 0); tot.on[3] += a.slice(-2).reduce((s, x) => s + x.rolls, 0);
  tot.off[0] += b[0].caught; tot.off[1] += b[0].rolls; tot.off[2] += b.slice(-2).reduce((s, x) => s + x.caught, 0); tot.off[3] += b.slice(-2).reduce((s, x) => s + x.rolls, 0);
}
const r = (c, n) => (100 * c / (n || 1));
const on0 = r(tot.on[0], tot.on[1]), on1 = r(tot.on[2], tot.on[3]), off0 = r(tot.off[0], tot.off[1]), off1 = r(tot.off[2], tot.off[3]);
console.log(`合計 讀習慣 開：前 15 秒 ${on0.toFixed(1)}%（${tot.on[1]} 次翻滾）→ 45–150 秒 ${on1.toFixed(1)}%（${tot.on[3]} 次）；關：${off0.toFixed(1)}% → ${off1.toFixed(1)}%（${tot.off[3]} 次）`);
// 開場前 15 秒兩組都偏高（開場距離 / 首招），原始比例會被開場混淆；
// 因此以「同種子、同一個腳本玩家、只差讀習慣開關」的增益量化學習：後段增益須明顯大於開場增益
const lift0 = on0 - off0, lift1 = on1 - off1;
console.log(`讀習慣增益（開 − 關）：前 15 秒 ${lift0 >= 0 ? '+' : ''}${lift0.toFixed(1)} 點 → 45–150 秒 ${lift1 >= 0 ? '+' : ''}${lift1.toFixed(1)} 點`);
const ok = lift1 >= 3 && lift1 > lift0 + 2;
console.log(ok ? 'HABIT TEST PASS' : 'HABIT TEST FAIL');
process.exit(ok ? 0 : 1);
