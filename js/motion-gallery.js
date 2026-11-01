'use strict';
// 特效圖鑑附加分頁：狩獵武器動作預覽。選一把武器，所有招式循環播放；下方時間軸標出命中時間（紅點），
// 用來對照「武器揮到前方的那一刻＝命中時間」。只在圖鑑頁載入。
(function (G) {
  const BD = G.BD, R = BD.Render, H4 = BD.HUNT4, CW = 300, CH = 210, S = 1.9, PAUSE = 0.45;
  const wrap = document.querySelector('.g-wrap'), sec = document.createElement('div');
  sec.innerHTML = `<div class="g-head"><h1 style="font-size:24px">狩獵武器動作</h1><span class="g-count" id="mCount"></span></div>
    <p class="g-hint">每格循環播放一招：時間軸上紅點＝命中時間、白線＝目前時間。標「新動作」的招式用 hero-motion.js 的動作表，其餘是舊的擺法。</p>
    <div class="g-bar"><label>武器 <select id="mWeapon"></select></label><label>速度 <select id="mSpeed"><option value="1">×1</option><option value="0.5">×0.5</option><option value="0.25">×0.25</option><option value="0">暫停</option></select></label></div>
    <div class="g-grid" id="mGrid"></div>`;
  wrap.insertBefore(sec, wrap.querySelector('.g-foot'));
  const sel = sec.querySelector('#mWeapon'), speed = sec.querySelector('#mSpeed'), grid = sec.querySelector('#mGrid');
  for (const id of Object.keys(H4.WEAPON_SPECS)) sel.add(new Option((H4.WEAPON_NAMES || {})[id] || id, id));
  const hunter = H4.HUNTERS[0];
  let cells = [];
  function skillsOf(id) {
    const w = H4.WEAPON_DEFS[id] || BD.HUNT.WEAPON_BY_ID[id], sp = H4.WEAPON_SPECS[id];
    return [...(w.skills || []), ...(w.variants || []), ...Object.values(sp.extra || {}), ...(sp.focus ? [sp.focus] : [])].map((s) => BD.prepSkill(Object.assign({}, s)));
  }
  function build() {
    const id = sel.value, def = BD.Hunt4.buildHunter(hunter, 'heavy', id);
    grid.innerHTML = ''; cells = [];
    for (const sk of skillsOf(id)) {
      const el = document.createElement('div'), cv = document.createElement('canvas'), isNew = !!R.heroMotion.MOTIONS[sk.id];
      el.className = 'g-cell'; cv.width = CW; cv.height = CH;
      el.innerHTML = `<div class="g-row"><span class="nm">${sk.name}</span><span class="id">${sk.id}</span><span class="tag">${isNew ? '新動作' : '舊擺法'}</span></div>`;
      el.prepend(cv);
      const o = { x: 0, y: 0, face: 0, r: def.r || 20, def, state: 'skill', inst: { skill: sk, v: sk.v1, t: 0 }, h4: { drv: { mode: sk.mode || (id === 'chargeblade' ? 'sword' : 'axe') } }, statuses: [] }; // 變形武器：照招式標的形態畫
      const c = { o, ctx: cv.getContext('2d'), sk, hits: sk.v1.actions.filter((a) => a.do === 'hit' || a.do === 'proj').map((a) => a.at), clock: 0 };
      el.addEventListener('click', () => { c.clock = 0; });
      grid.appendChild(el); cells.push(c);
    }
    sec.querySelector('#mCount').textContent = `${cells.length} 招`;
  }
  function draw(c, now) {
    const { ctx, o, sk } = c, D = sk.v1.dur, t = c.clock % (D + PAUSE), r = o.r;
    o.inst.t = Math.min(t, D); o.state = t < D ? 'skill' : 'idle';
    ctx.fillStyle = '#16141a'; ctx.fillRect(0, 0, CW, CH);
    ctx.save(); ctx.translate(CW * 0.42, CH * 0.45); ctx.scale(S, S);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(0, 0, r * 3, -1, 1); ctx.stroke(); ctx.setLineDash([]); // 前方參考弧
    const hit = c.hits.some((h) => t >= h && t < h + 0.06);
    ctx.fillStyle = hit ? 'rgba(255,90,70,0.55)' : 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.arc(r * 3.6, 0, r * 0.9, 0, Math.PI * 2); ctx.fill(); // 靶：命中瞬間變紅
    R.drawBossBody(ctx, o, now / 1000);
    ctx.restore();
    const y = CH - 14, x0 = 14, w = CW - 28; // 時間軸
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x0, y, w, 3);
    ctx.fillStyle = '#ff5a46'; for (const h of c.hits) { ctx.beginPath(); ctx.arc(x0 + w * h / D, y + 1.5, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#fff'; ctx.fillRect(x0 + w * Math.min(1, t / D) - 1, y - 5, 2, 13);
  }
  let last = 0;
  function tick(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    for (const c of cells) { c.clock += dt * +speed.value; draw(c, now); }
    requestAnimationFrame(tick);
  }
  sel.addEventListener('change', build);
  build(); requestAnimationFrame(tick);
  BD.motionGallery = { cells: () => cells, seek(t) { for (const c of cells) c.clock = t; speed.value = '0'; } }; // 截圖 / 檢查用：停在指定時間
})(typeof window !== 'undefined' ? window : globalThis);
