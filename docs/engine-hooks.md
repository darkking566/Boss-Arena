# 引擎事件與傷害掛勾

新模式 / 新系統要接進戰鬥時，用這兩個入口，不要再改 `js/engine/world.js` 或覆寫 `w.step` / `w.damageBoss`。
測試：`node test/hooks.test.js`。

## 事件：`w.on(type, fn)`
`fn(e, x, w)` 在事件發生當下**同步**呼叫，依訂閱順序。沒人訂閱時不做任何事，所以加訂閱不會改變一般對戰（指紋測試保證）。
監聽器可以改戰鬥狀態（例如訓練場把假人 HP 回滿），但要改到戰鬥結果就屬於刻意改行為，照硬性規則說明。

| type | e | x | 時機 |
|---|---|---|---|
| `preStep` | dt | — | 每個模擬步開頭（含命中凍結的步） |
| `think` | dt | — | 開戰後、未結束時，所有 AI / 玩家控制器更新之後 |
| `postStep` | dt | frozen | 每個模擬步結尾；`frozen` 為 true 表示這步是沉重模式的命中凍結（時間沒推進） |
| `skill` | `{ b, skill }` | — | Boss 開始出招（含大招） |
| `ult` | `{ b }` | — | 施放大招 |
| `phase2` | `{ b }` | — | 進入第二階段 |
| `dodge` | `{ src, b, p }` | — | 無敵幀閃掉一擊（完美閃避時 `b.stats.perfect` 已加一） |
| `damage` | `{ src, b, p, dmg }` | — | Boss 實際扣血後、判定擊殺 / 二階段 / 倒地之前 |
| `minionDamage` | `{ src, b, p, dmg }` | — | 召喚物實際扣血後、判定死亡之前；`b` 是召喚物 |
| `elementHit` | `{ src, b, p, dmg }` | — | 4v1 武器的正數火屬性加算傷害，且整次攻擊確實扣血後；`p.damageEl` 是 `fire` |
| `knockdown` | `{ src, b }` | — | 沉重模式重擊打倒 |
| `postureBreak` | `{ b }` | — | 架勢崩潰 |
| `kill` | `{ b, by }` | — | Boss 倒下 |

`w.events`（只記 `ult` / `phase2`）保留給瀏覽器測試讀取。

## 傷害掛勾：`w.useDamage(fn)`
`fn(src, b, p, next)`：所有打到 Boss 的傷害（`w.damageBoss`）依加入順序經過每個掛勾。
- 改參數：`return next(src, b, Object.assign({}, p, { dmg: p.dmg * 2 }))`（不要直接改 `p`，招式共用同一個物件）
- 換管線：不呼叫 `next`，自己處理並回傳結果字串（狩獵模式的部位 / 肉質就是這樣接，見 `js/engine/hunt4/mode.js`）
- 擋下：直接回傳 `'immune'` 之類的結果

掛勾裡要「再打一下」（追加傷害、異常爆發）時呼叫 `w.hitBoss(src, b, p)`，它不經過掛勾，不會重複累積。

## 四段管線（`w.hitBoss`）
1. `hitGate` 擋下：已倒下 / 不可選取 / 無效 / 閃避 / 特性攔截（見切、彈反）→ 回傳結果字串
2. `hitAmount` 算傷害：增減傷、浮動（用 `w.rng`）、護盾吸收 → 全吸收回傳 null（結果 `'absorbed'`）
3. `hitApply` 套用：扣血、大招充能、吸血、架勢、擊退、附加狀態、頓挫 / 命中凍結、特效 → 發 `damage`
4. `hitOutcome` 結果：擊殺（`'kill'`）、二階段（`'phase'`）、倒地、冰凍、架勢崩潰 → 其餘 `'hit'`

召喚物受傷走 `w.damageUnit`，不經過這條管線。

## 實際火焰與凍傷

`p.damageEl` 表示傷害本身的屬性，`p.fxEl` 只改特效。火 / 熔岩 / 黑焰區域會帶 `damageEl: 'fire'`；帶火標籤的燃燒狀態也能辨識。玻列琉斯的凍傷只在正數傷害命中時讀這些資訊來解除，不因換火色、未命中、無敵或護盾全吸收而解除。

`elementHit.dmg` 是整次命中實際扣血，不是獨立火傷數字。它只保證本次算過正數火屬性加算；固定傷害不算，完全擋下也不發事件。這個事件在一般 Boss 傷害結果處理之後，勿用它取代 `damage` 的擊殺前時機。

狀態造成追加爆發時，若原始命中的結果還沒結算，不要同步重入擊殺管線。玻列琉斯先記一次待處理爆發，下一次狀態更新再經 `BD.statusDamage` 結算，並檢查死亡、轉階段及無敵。
