'use strict';
// 繪圖核心：畫布常數、色彩工具、Boss 造型註冊表（R.defineBossStyle）與 Boss 身體繪製分派
// 只定義函式；實際繪圖在瀏覽器中呼叫（Node 驗證可載入此檔檢查樣式是否齊全）
(function (G) {
  const BD = G.BD, U = BD.U;
  const R = BD.Render = {};
  R.W = 1600; R.H = 1010; R.OX = 50; R.OY = 172;
  R.VW = 1500; R.VH = 820; // 競技場視窗（世界座標單位）；競技場比視窗大，鏡頭 R.cam（視窗左上角的世界座標）跟著戰鬥移動
  R.cam = { x: 0, y: 0, w: null, t: 0 };
  const TEAM = ['#4aa3ff', '#ff4a5a', '#d01030'];
  R.TEAM = TEAM;
  const FONT = '"Microsoft JhengHei","微軟正黑體","PingFang TC","Noto Sans TC","Noto Sans CJK TC",sans-serif';
  R.FONT = FONT;

  function hexA(hex, a) {
    if (hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  R.hexA = hexA;
  R.draw = {}; // 各繪圖模組互相共用的函式

  // ─────────────────────── Boss 造型註冊表 ───────────────────────
  // R.defineBossStyle(name, body) 或 R.defineBossStyle(name, { body, hidden, transition })
  //   body(ctx, o, t, k)：已平移到 Boss 位置並旋轉到面向；k = { def, r, st, act, swing }
  //   hidden(ctx, b, t)：Boss 隱身時的額外表現（選用）
  //   under(ctx, b, t)：畫在 Boss 底下的額外物件，隱身時照畫（選用；例如劫的影子）
  //   transition(ctx, b, t)：階段轉換中的自訂畫法；回傳 true 表示已畫完、略過一般身體（選用）
  const styles = R.bossStyles = {};
  R.defineBossStyle = function (name, spec) {
    if (styles[name]) throw new Error(`defineBossStyle：樣式「${name}」重複定義`);
    if (typeof spec === 'function') spec = { body: spec };
    if (!spec || typeof spec.body !== 'function') throw new Error(`defineBossStyle：樣式「${name}」缺少 body()`);
    styles[name] = spec;
    return spec;
  };
  R.bossStyle = function (name) {
    const s = styles[name];
    if (!s) throw new Error(`未定義的 Boss 繪圖樣式「${name}」——請以 R.defineBossStyle 註冊（js/render/styles/）`);
    return s;
  };

  // 招式節奏（造型擺姿勢用；回傳重用物件，不每幀配置）：trig 為會「出手」的動作種類 { hit: 1, … }
  //   wind 0→1 朝下一個出手動作蓄力；snap 1→0 剛出手的收勢；a 目前對應的動作；i 第幾個出手動作；n 已出手數
  const PACE = { wind: 0, snap: 0, a: null, i: 0, n: 0 };
  R.skillPace = function (inst, trig) {
    const P = PACE;
    P.wind = 0; P.snap = 0; P.a = null; P.i = 0; P.n = 0;
    const t = inst.t; let prev = 0, last = null;
    for (const a of inst.v.actions) {
      if (!trig[a.do]) continue;
      if (a.at > t) { P.wind = U.clamp((t - prev) / Math.max(0.05, a.at - prev), 0, 1); P.a = a; P.i = P.n; break; }
      prev = a.at; last = a; P.n++;
    }
    if (last && t - prev < 0.25 && (!P.a || P.wind < 0.3)) { P.snap = 1 - (t - prev) / 0.25; P.a = last; P.i = P.n - 1; }
    if (!P.a && last) { P.a = last; P.i = P.n - 1; }
    return P;
  };

  // o: {x,y,face,r,def,phase,state,t,...} ；可用於遊戲與選角肖像
  R.drawBossBody = function (ctx, o, t) {
    const def = o.def, r = o.r, st = o.state, style = R.bossStyle(def.style);
    const act = o.inst ? U.clamp(o.inst.t / Math.max(0.1, o.inst.v.dur), 0, 1) : 0;
    const swing = o.inst ? Math.sin(o.inst.t * 14) : Math.sin(t * 3) * 0.15;
    ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.face);
    style.body(ctx, o, t, { def, r, st, act, swing });
    ctx.restore();
  };
})(typeof window !== 'undefined' ? window : globalThis);
