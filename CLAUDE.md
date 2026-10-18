# Boss鬥技場

俯視角 2D Boss 對決遊戲：純 HTML5 Canvas + 原生 JavaScript，無建置、無相依，雙擊 `index.html` 即可執行。
架構、操作與測試說明見 `README.md`；新增 Boss 見 `docs/adding-a-boss.md`；特效與元素見 `docs/effects.md`。

## 工作方式
- **寫程式一律遵守 ponytail（full 等級）**：以最小而完整的改動解決任務。工作階段開始時若技能可用，先以 `/ponytail` 載入。
- **分工**：主代理（Opus）負責規劃、拆步驟、審查；範圍明確的實作步驟交給 `coder` 子代理（Haiku，`.claude/agents/coder.md`）。
  需要畫面美感判斷或架構決策的工作、以及很小的改動，由主代理直接做。
- **審查**：coder 完成後，主代理自己看 diff 並重跑測試，確認後才 commit。

## 硬性規則
- 特效與繪圖只能用視覺亂數 `BD.vrng()`，不可用 `w.rng` 或 `Math.random()`；視覺改動不可影響戰鬥結果。
- `js/data/`、`js/engine/` 不可碰 DOM / Canvas。
- 新增 script 時 `index.html` 與 `fx-gallery.html` 的載入清單要同步。
- 不要自行重新產生 `test/baseline-fingerprint*.json`，除非是刻意改變戰鬥行為且已說明。

## 完成前必跑
```bash
npm test
node test/fingerprint.js --check-heavy
```
兩個指紋測試都必須是 `FINGERPRINT IDENTICAL`。
