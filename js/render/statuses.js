'use strict';
// 狀態效果繪圖：狀態圖示註冊表（R.defineStatusIcon）與 HUD 狀態列（R.drawStatusRow）
// 每個狀態定義的 visual 必須有對應圖示；僅定義函式，實際繪圖在瀏覽器中呼叫（Node 驗證可載入此檔檢查圖示是否齊全）
(function (G) {
  const BD = G.BD, R = BD.Render, FONT = R.FONT;

  // ─────────────────────── 圖示註冊表 ───────────────────────
  const icons = R.statusIcons = {};
  // R.defineStatusIcon(visualId, { glyph, color })：重複定義會丟出錯誤
  R.defineStatusIcon = function (visualId, spec) {
    if (typeof visualId !== 'string' || !visualId) throw new Error('defineStatusIcon：圖示必須有字串 id');
    if (icons[visualId]) throw new Error(`defineStatusIcon：圖示「${visualId}」重複定義`);
    if (!spec || typeof spec.glyph !== 'string') throw new Error(`defineStatusIcon：圖示「${visualId}」缺少 glyph`);
    const icon = { glyph: spec.glyph, color: spec.color || '#fff' };
    icons[visualId] = icon;
    return icon;
  };
  R.statusIcon = function (id) {
    const icon = icons[id];
    if (!icon) throw new Error(`缺少狀態圖示「${id}」——請以 R.defineStatusIcon 定義（js/render/statuses.js）`);
    return icon;
  };

  // ── 所有狀態的圖示 ──
  R.defineStatusIcon('iframe', { glyph: '閃', color: '#d8fff0' });
  R.defineStatusIcon('invuln', { glyph: '無', color: '#ffe680' });
  R.defineStatusIcon('transition', { glyph: '轉', color: '#ff9a3c' });
  R.defineStatusIcon('hidden', { glyph: '隱', color: '#9a8cff' });
  R.defineStatusIcon('counter', { glyph: '見', color: '#ffffff' });
  R.defineStatusIcon('slow', { glyph: '緩', color: '#9fdcff' });
  R.defineStatusIcon('root', { glyph: '縛', color: '#e0e0e0' });
  R.defineStatusIcon('frozen', { glyph: '凍', color: '#bfefff' });
  R.defineStatusIcon('stagger', { glyph: '崩', color: '#ffcc33' });
  R.defineStatusIcon('overtime', { glyph: '狂', color: '#ff3355' });
  R.defineStatusIcon('burn', { glyph: '燒', color: '#ff8a2a' });
  R.defineStatusIcon('poison', { glyph: '毒', color: '#8fdc3a' });
  R.defineStatusIcon('bleed', { glyph: '血', color: '#ff3344' });
  R.defineStatusIcon('shield', { glyph: '盾', color: '#7fc8ff' });
  R.defineStatusIcon('vulnerable', { glyph: '易', color: '#c07aff' });
  R.defineStatusIcon('enrage', { glyph: '怒', color: '#ff5040' });
  R.defineStatusIcon('knockdown', { glyph: '倒', color: '#ffb070' });
  R.defineStatusIcon('kdGuard', { glyph: '起', color: '#ffe0b0' });

  // ─────────────────────── HUD 狀態列 ───────────────────────
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // R.drawStatusRow(ctx, b, x, y, rtl, maxW)：每個狀態一格（底色 + 顏色外框 + 圖示 + 名稱 + 剩餘時間 + 層數）
  // rtl 時由右往左排列；超過 maxW 即停止。回傳實際使用的寬度。
  R.drawStatusRow = function (ctx, b, x, y, rtl, maxW) {
    const list = BD.activeStatuses(b);
    const H = 18, PAD = 5, GAP = 4, FS = 11;
    let used = 0;
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${FS}px ${FONT}`;
    for (const st of list) {
      const def = st.def;
      if (def.hud === false) continue;
      const icon = R.statusIcon(def.visual);
      let label = def.name;
      const rem = BD.statusRemaining(b, st.id);
      if (isFinite(rem)) label += ` ${rem.toFixed(1)}s`;
      if (def.stacking === 'stack' && st.stacks > 1) {
        label += def.id === 'bleed' ? ` ${Math.round(st.stacks)}/100` : ` ×${st.stacks}`;
      }
      if (def.id === 'shield') label += ` (${Math.ceil(st.value)})`;
      const gw = 12;
      const textW = ctx.measureText(label).width;
      const w = PAD * 2 + gw + GAP + textW;
      if (used + w > maxW) break;
      const cx = rtl ? x - used - w : x + used;
      ctx.fillStyle = 'rgba(0,0,0,0.72)'; roundRect(ctx, cx, y, w, H, 4); ctx.fill();
      ctx.strokeStyle = icon.color; ctx.lineWidth = 2; roundRect(ctx, cx + 1, y + 1, w - 2, H - 2, 3); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillStyle = icon.color;
      ctx.fillText(icon.glyph, cx + PAD + gw / 2, y + H / 2 + 0.5);
      ctx.textAlign = 'left'; ctx.fillStyle = '#eee';
      ctx.fillText(label, cx + PAD + gw + GAP, y + H / 2 + 0.5);
      used += w + GAP;
    }
    ctx.restore();
    return used;
  };
})(typeof window !== 'undefined' ? window : globalThis);
