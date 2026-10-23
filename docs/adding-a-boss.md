# 新增 Boss

重構後新增一位 Boss 通常只需要 **2 個新檔案 + index.html 加 2 行**，不必修改任何通用程式碼。
全部仍是普通 `<script>` + IIFE + 全域 `BD`，雙擊 `index.html`（file://）即可執行，不需要建置。

## 1. 資料檔：`js/data/bosses/<id>.js`（純資料，不可觸碰 DOM / Canvas）

```js
'use strict';
(function (G) {
  const BD = G.BD, { D, strike, dashStrike } = BD.DataKit;   // 時間軸小工具
  const myBoss = {
    id: 'golemking', name: '岩王', title: '…', archetype: '…', desc: '…',
    color: '#…', color2: '#…', glow: '#…', style: 'golemking',  // style 對應繪圖樣式
    radius: 30, maxHp: 2800, speed: 180, turn: 5, mass: 1.4, fxEl: 'fire', hurt: 'magma', // 預設特效元素；hurt 為受擊材質（flesh / magma / frost / ooze / shadow / straw，預設 flesh）
    stamina: { max: 110, regen: 28 }, posture: 140, dodgeCost: 20, dodgeSpeed: 520,
    traits: [],                                   // 選用：'counter'（見切/彈反）、'echo'（二階段影分身追斬）、'reflect'（神虛視：`counter` 動作帶 `reflect: true` 時，被攻擊會複製對手整招反擊；另含二階段死立不倒，見 docs/bosses/adam.md）、'battlelust'（鬥神狂喜：一階段每挨 3 下進入 `ecstasy` 狀態，見 docs/bosses/zeus.md）、'learn'（一看就會：同一招看過越多次，傷害與架勢傷害最多降 36%，見 docs/bosses/yujiro.md）、'crowsub'（烏鴉分身：每 14 秒一次，被直接攻擊命中時換成烏鴉群、本體閃到後方，見 docs/bosses/itachi.md）、'clash'（對撞：見下方「對撞」一節）、'tyrant'（大海暴君：每挨 4 下動怒，短時間傷害與速度提升，見 docs/bosses/poseidon.md；`echo` 的殘影顏色可用 `def.echoColor` 指定）
    ai: { prefRange: [80, 200], aggression: 0.7, dodge: 0.5, precision: 0.6, reaction: 0.25, strafe: 0.6, walk: 0.7,
          feint: 0.1, delay: 0.3, retreat: 0.1, punish: 0.6, nervous: 0.1, patience: 0.3 },
    phase2: { speedMul: 1.15, dmgMul: 1.2, cdMul: 0.8, line: '二階段台詞', aura: 'fire', fxEl: 'fire',
              transFx: { id: 'shadowrise', el: 'shadow' },  // 選用：換階段開始時播放的特效（life＝咆哮前的秒數；純演出）
              status: { id: 'adamas' },                  // 選用：進入二階段時施加的常駐狀態（例如宙斯的阿陀磨須）
              note: '只寫招式變化——「速度 +15%、傷害 +20%、冷卻 −20%」會由倍率自動產生，請勿手寫百分比' },
    skills: [
      // 動作帶 fx 範例：指定 fx: 'slam' 播放砸地特效（元素預設取自 Boss 的 fxEl）
      // ...strike(0.6, 0.4, { shape: 'circle', r: 120 }, { dmg: 80, posture: 30, kb: 250, fx: 'slam' }),
      /* ≥ 6 個；每個 { id, name, short, tags, range, cd, cost, track, recovery, actions, actions2? , phase?, maxPhase? } */
    ],
    ultimate: { id: 'ult', name: '大招名', name2: '二階段大招名（選用）', ult: true, range: [0, 900], actions: [ … ], actions2: [ … ], desc: '…' },
  };
  BD.registerBoss(myBoss);   // id 重複會直接丟出錯誤
})(typeof window !== 'undefined' ? window : globalThis);
```

註冊表注意：帶有 `hidden: true` 的 Boss 定義（如訓練假人）不會進入 `BD.bosses`（因此選角畫面、模擬對戰、ai_stats、fingerprint 都看不到）；新增一般正式 Boss **不可** 設定 `hidden: true`。

時間軸 `actions` 的每一項是 `{ do: '<動作>', at: 秒, … }`。可用動作（`js/engine/actions/`）：
`tele` 預警、`hit` 判定、`dash` 衝刺、`proj` 投射物、`lob` 拋射、`rain` 隕石雨、`zone` 區域、`trap` 陷阱、`erupt` 噴發柱、
`summon` 召喚、`blink` 閃現、`circle` 繞圈疾奔、`hide`/`land` 躍起落地、`appear` 背後現身、`counter` 見切架式、`invuln` 無敵、`slashes` 連續斬線、`strain` 萬花筒反噬（鼬：扣 `pct` 最大生命、不致死）、
`vitalstep` 閃到對手破綻方位（菲歐拉，`js/engine/actions/duelist.js`；`hit` 可加 `vital`）、`shadow` 放出影子 / `swap` 與影子換位 / `shadowstep` 瞬步到目標周圍 / `shadowshuriken`、`shadowslash` 影子同步投射與迴旋斬（劫，`js/engine/actions/shadow.js`；影子存在 `b.shadows`，造型以 `under(ctx, b, t)` 畫出；技能可加 `needShadow` / `noShadow` / `shadowMul` / `execMul` 或 tag `swapdodge`，AI 以 `ai.shadow` 設定，見 docs/bosses/zed.md §6）。
`strike(at, tele, shape, hit)` = 預警 + 判定；`dashStrike(...)` = 預警 + 衝刺。
純演出的動作欄位（不影響戰鬥、行為指紋不變）：`blink` 可加 `fx`（閃現特效，預設 `blink`）；`counter` 可加 `fx`（見切成功特效，預設 `parry`）與 `slowmo`（見切成功的慢動作秒數）；`slashes` 與其 `final` 可加 `fx`（例如 `threadcut`：刀痕懸著，等到最後一擊一齊裂開）。

### 無法閃避（undodgeable）
- `undodgeable: true` 可放在 `hit`、`trap`、`proj` 動作上（`dash` / `circle` 的 `hit: {...}` 物件中也可），表示翻滾 / 衝刺的無敵幀（iframe）無效。
- 與 `unblockable` 不同：`unblockable` 是「不能被見切 / 彈反（counter）」；`undodgeable` 只跟無敵幀有關，兩者各自獨立。
- 仍然有效的保護：`invuln`（例如階段轉換、魔女大招前搖）與 `untargetable`（例如影刃武士的隱身、母巢鑽地）。持續傷害（dot）本來就無視無敵幀。
- 預警（tele）會自動繼承同一時間軸緊接其後 hit 的 undodgeable，顯示紅紫雙框與「危／無法閃避」標記；也可直接在 tele 上寫 `undodgeable: true`。已布置的 undodgeable 地雷會有紅色警示光暈。
- AI：遇到 undodgeable 威脅不會靠翻滾，而是走出範圍 / 走進 except 安全圈；智慧閃避會把無敵幀視為無效、並避免翻滾路徑壓過已布置的地雷。
- 範例：霜月魔女的「絕對零度」安全圈外判定與「霜凍地雷」。注意：大招之後的放射冰刺沒有標記，仍可翻滾閃避。
- validate.js 會檢查 undodgeable 必須是布林值、且只出現在 hit / trap / proj / tele。
- `anchor: 'safe'` 的安全圈預警若標記 `undodgeable: true`，安全圈會依目標走速與預警時間放在「走得到」的距離（240–520px，預設 520px），讓慢速巨型 Boss 也有機會躲進去。

### 特效
招式特效請先看 [docs/effects.md](effects.md) 與特效圖鑑 `fx-gallery.html`，挑現有特效 + 元素；找不到才新增並擴充特效庫。

## 2. 造型檔：`js/render/styles/<id>.js`（僅瀏覽器）

```js
'use strict';
(function (G) {
  const BD = G.BD, U = BD.U, R = BD.Render, hexA = R.hexA;
  R.defineBossStyle('golemking', {
    body(ctx, o, t, { def, r, st, act, swing }) { /* 已平移到 Boss 位置並旋轉到面向；畫身體 */ },
    hidden(ctx, b, t) { /* 選用：隱身（鑽地/躍起）時的畫面 */ },
    under(ctx, b, t) { /* 選用：畫在 Boss 底下、隱身時照畫的額外物件（世界座標；例如劫的影子） */ },
    transition(ctx, b, t) { /* 選用：階段轉換的自訂畫法，回傳 true 代表已畫完 */ return false; },
  });
})(typeof window !== 'undefined' ? window : globalThis);
```

效能：每幀重建的徑向漸層與 `shadowBlur` 很昂貴。造型中「區域座標下形狀固定」的部分（例如有漸層的身體圓盤、發光的武器 / 眼睛）
請用 `R.blit(ctx, key, w, h, ox, oy, draw)` 包起來：第一次把 `draw(g)` 畫進離屏 canvas，之後直接貼圖。
key 必須包含所有會改變像素的參數（樣式 id、部位、階段、半徑、顏色）；繪製倍率由 `R.blit` 自動加入。
隨時間變化的部分（擺動、閃爍）照常即時繪製。視覺用的亂數一律使用 `BD.vrng()`（不可用 `Math.random` 或 `w.rng`）。

## 3. index.html 加兩行
- 在 `<!-- 核心 / 資料 -->` 區塊加 `<script src="js/data/bosses/<id>.js"></script>`
- 在繪圖區塊（`js/render/minions.js` 之前）加 `<script src="js/render/styles/<id>.js" data-browser></script>`

選角畫面、Node 模擬、驗證與瀏覽器測試都從註冊表讀取 Boss 清單，會自動納入新 Boss（超過 6 位時選角自動分頁）。
新增 Boss 檔案時，請記得在 `fx-gallery.html` 同步加上 `<script src="js/data/bosses/<id>.js"></script>`（`npm run validate` 會檢查 `fx-gallery.html` 與 `index.html` 的腳本清單與載入順序必須一致）。

## 4.（選用）新的機制
| 需要 | 在哪裡註冊 | 檔案 |
|---|---|---|
| 新的時間軸動作 | `BD.defineAction(name, fn(w, boss, inst, a, target), { active, duration, requiresTrait })` | `js/engine/actions/*.js` |
| 新的召喚物 | `BD.defineMinion(kind, { spawn, update, onDeath, threat, stats, afterSummon, onHitBoss })` + `R.defineMinionStyle(kind, draw, { absolute })` | `js/engine/minions/<id>.js`、`js/render/minions.js` |
| Boss 專屬機制 | `BD.defineTrait(name, { onHit, onDash, interceptDamage })`，資料中 `traits: ['name']` | `js/engine/traits.js` |
| 新的狀態效果 | `BD.defineStatus(id, spec)`（見下方「狀態效果」）＋ `R.defineStatusIcon(visual, { glyph, color })` | `js/engine/statuses/<檔>.js`、`js/render/statuses.js` |
| 新的特效 / 元素 | `BD.defineEffect(id, spec)` / `BD.defineElement(id, spec)`（詳見 `docs/effects.md`） | `js/fx/<分類>.js`、`js/fx/elements.js` |

`active` 會讓動作計入出招時段（windup / activeEnd / AI 懲罰判斷），`duration` 代表它持續 `a.dur` 秒。
新檔案放在 `js/engine/` 底下時記得加進 index.html（不加 `data-browser`），且不得使用 DOM / Canvas。

## 5. 狀態效果（statuses）

狀態是通用的（Boss 與召喚物都適用），由註冊表 `BD.statusDefs` 管理：`js/engine/status.js` 提供 API，
`js/engine/statuses/core.js`、`js/engine/statuses/effects.js` 定義內容，繪圖圖示在 `js/render/statuses.js`。
舊有的旗標（`hidden` / `invuln` / `iframe` / `counterT` / `slowT` / `rootT` …）已移除，改以狀態表示。

### 註冊表
```js
BD.defineStatus('burn', {
  name: '燃燒',            // 必填，繁中名稱
  tags: ['dot', 'fire'],   // 選用：statusesByTag 用
  stacking: 'refresh',     // 'refresh'（重設時間）| 'stack'（疊層）| 'max'（取最長），預設 'max'
  maxStacks: 1,            // stacking 'stack' 時必填且 >= 1
  order: 0,                // 修正值套用順序（由小到大）；同序依施加順序
  bindState: null,         // 設字串（如 'stun' / 'stagger' / 'transition'）時，狀態活動與否取決於 u.state
  modifiers: {},           // 修正值：speedMul / dmgTakenMul / dmgDealtMul / canAct / canMove / canDodge / invuln / iframe / untargetable / noCollide / counter
  hud: true,               // false 表示不顯示於 HUD 狀態列
  visual: 'burn',          // 圖示 id（對應 R.defineStatusIcon）
  defaultDur: 4,           // 未指定 dur 時使用；兩者皆無則 Infinity
  dps: 12,                 // 選用：dotDps 用（數字或 (u, st) => 數字）
  onApply(u, st, opts, w, isNew) {},
  onTick(u, st, dt, w) {},
  onRemove(u, st, w, reason) {},
  absorb(u, st, dmg, w) { return dmg; },   // 回傳剩餘傷害（護盾用）
});
```
重複 id、未知的堆疊模式 / 修正值、型別不符、`stack` 卻沒有 `maxStacks`、缺少 `name` 都會丟出錯誤。

### 輔助函式（皆接受任意單位，w 省略時取 `u.world`）
| 函式 | 說明 |
|---|---|
| `BD.applyStatus(u, id, { dur, stacks, source, data, value, stacking }, w)` | 施加 / 更新狀態，回傳狀態項目 |
| `BD.removeStatus(u, id, reason, w)` | 移除所有同 id 狀態（活動中的會呼叫 `onRemove`） |
| `BD.hasStatus(u, id)` / `BD.getStatus(u, id)` / `BD.statusRemaining(u, id)` | 查詢活動狀態 / 剩餘時間 |
| `BD.activeStatuses(u)` / `BD.statusesByTag(u, tag)` | 列出活動中的狀態 |
| `BD.getMod(u, key)` / `BD.scaleMod(u, key, base)` | 讀取修正值（`and` / `or` / `mul`） |
| `BD.absorbDamage(u, dmg, w)` / `BD.tickStatuses(u, dt, w)` | 傷害吸收 / 逐幀更新 |
| `BD.dotDps(u)` | 目前持續傷害的每秒總量 |

狀態項目為 `{ id, def, rem, stacks, source, data, value, t }`；DoT 請用 `BD.statusDamage(w, u, st, dmg)` 結算（帶 `ignoreIframe`）。

### 狀態一覽
| id | 名稱 | tags | 效果 |
|---|---|---|---|
| `iframe` | 閃避無敵 | defense | iframe，翻滾 / 衝刺期間無敵（HUD 不顯示） |
| `invuln` | 無敵 | buff, defense | 完全免疫傷害 |
| `transition` | 階段轉換 | phase | 綁定 `transition`：無敵、無法行動 |
| `hidden` | 隱身 | buff | 無法被鎖定、不碰撞 |
| `counter` | 見切架式 | stance | 見切架式（counter） |
| `slow` | 緩速 | debuff | 移動速度 ×0.55 |
| `root` | 定身 | debuff, root | 無法移動 / 翻滾 |
| `frozen` | 凍結 | cc | 綁定 `stun`：無法行動 |
| `stagger` | 硬直 | cc | 綁定 `stagger`：無法行動、承受傷害 ×1.3 |
| `overtime` | 延長賽狂暴 | debuff, overtime | 承受傷害 ×`world.enrage`（時間到自動施加） |
| `burn` | 燃燒 | dot, fire, debuff | 每 0.5 秒 6 點（dps 12） |
| `poison` | 中毒 | dot, debuff | 可疊 5 層，每 1 秒 4 × 層數 |
| `bleed` | 流血 | buildup, debuff | 每秒衰減 6 點；達 100 爆發 15% 最大生命 |
| `shield` | 護盾 | buff, shield | 吸收傷害（`value` 為剩餘吸收量） |
| `vulnerable` | 易傷 | debuff | 承受傷害 ×1.25 |
| `enrage` | 狂暴 | buff | 造成傷害 ×1.3、速度 ×1.2 |
| `tsukuyomi` | 月讀 | cc, debuff | 無法行動（onApply 設定 stun）、承受傷害 ×1.25，期間每 0.2 秒 20 點刺擊、結束再補 70 點（鼬；注意：綁定 `bindState` 的狀態不會 tick，需要持續效果的控制狀態不要綁） |
| `amaterasu` | 天照 | dot, fire, debuff | 永不熄滅（無期限）、可疊 5 層，每層每秒 6 點（鼬） |
| `susanoo` | 須佐能乎 | buff | 承受傷害 ×0.75，預設 16 秒；造型檔 `under()` 畫出約 6 倍大的巨人（鼬） |
| `jhorage` | 暴怒 | buff | 承受傷害 ×0.92、造成傷害 ×1.08（恐暴龍二階段常駐；造型膨脹泛紅）|
| `dragonblight` | 龍封 | debuff | 造成傷害 ×0.85，預設 6 秒（恐暴龍的龍息）|
| `manju` | 萬手無雙 | buff | 移動速度 ×1.08、承受傷害 ×0.95（小次郎二階段常駐）|
| `tyrantwrath` | 暴君之怒 | buff | 造成傷害 ×1.15、速度 ×1.1，預設 5 秒（波賽頓 trait `tyrant`：每挨 4 下動怒）|
| `godofgods` | 神中之神 | buff | 移動速度 ×1.06、承受傷害 ×0.92、造成傷害 ×1.06（波賽頓二階段常駐）|

### Boss 資料如何使用
命中類參數（`hit` / `proj` / `zone` / `trap` / `erupt` …）可加 `status`：
```js
{ do: 'hit', at: 0.4, shape: { kind: 'circle', r: 90 }, dmg: 60, status: { id: 'burn', dur: 3 } }
// 也可傳陣列：status: [{ id: 'burn', dur: 3 }, { id: 'slow', dur: 2 }]
```
命中類參數另可加 `heal: 0.4`：施放者每次命中回復「造成傷害 × heal」的生命（恐暴龍的啃咬）。

時間軸動作 `{ do: 'status', at, id, dur, stacks, value, target: 'enemy' }`（省略 `target` 表示對自己）：
```js
{ do: 'status', at: 0.6, id: 'shield', dur: 8, value: 120 }        // 自身護盾
{ do: 'status', at: 1.2, id: 'vulnerable', dur: 4, target: 'enemy' } // 讓對手易傷
```

### 新增一個狀態
1. 在 `js/engine/statuses/` 的檔案中 `BD.defineStatus('新id', spec)`（新檔案記得加進 index.html、不加 `data-browser`）。
2. 在 `js/render/statuses.js` 加上 `R.defineStatusIcon('新id', { glyph: '字', color: '#rrggbb' })`。
3. 若需要戰場視覺，可參考 `js/render/world.js` 的 `drawStatusAuras`（純繪圖，僅依賴時間）。

`npm run validate` 會檢查：每個狀態定義的 name / stacking / 修正值 key / tags / bindState、Boss 資料中所有 `status`
與 `do: 'status'` 的 id 是否已註冊、`dur` 是否為正數、每個狀態的 `visual` 是否有對應圖示，
以及 `js/` 底下是否還讀取已移除的舊旗標欄位。

## 6. 驗證
```
npm run validate     # 資料檢查：動作/召喚物/樣式/特性是否已註冊、數值範圍、二階段說明、DOM-free
npm run sim          # 全配對無頭對戰（可加種子：node test/sim.js 1,2,3,4,5,6）
python3 test/browser_test.py   # headless Chrome（file://）；CHROME_PATH 可指定瀏覽器，BD_SHOTS 可指定截圖目錄
```
`npm run fingerprint` 會比對 `test/baseline-fingerprint.json`（重構前的逐幀行為指紋）；新增 Boss 後配對數改變，
若要以新狀態為基準，執行 `node test/fingerprint.js > test/baseline-fingerprint.json` 重新產生。

## 7. 戰鬥節奏（沉重版）

新 Boss 不需要額外工作就會自動擁有「沉重」版本：`World` 建立時會以 `BD.applyPace(def, 'heavy')`
產生衍生定義（時間軸、傷害、冷卻、能力值、AI 個性皆依 `js/data/pace.js` 的 `BD.PACES.heavy` 調整），
原始定義保持不變；`light` 則直接回傳原始定義。

需要個別調整某位 Boss 的沉重數值時，在 `BD.PACES.heavy.bosses` 加上以 Boss id 為鍵的覆寫（淺層合併；
`ai` 會再與 `BD.PACES.heavy.ai` 淺層合併），例如：

```js
bosses: {
  ronin: { dmgMul: 1.2 },            // 影刃武士傷害再高一些
  watcher: { ai: { patienceAdd: 0.3 } },
},
```

繪圖端只要讀取 `w.pace` / `w.paceId` 與 `b.def.pace`（衍生定義上的解析結果），不要改動引擎狀態；
沉重專屬的狀態（`knockdown` / `kdGuard`）記得在 `js/render/statuses.js` 提供 `R.defineStatusIcon`。

## 8. AI 連段與分支（`ai.combos`，僅沉重節奏）

在 Boss 資料的 `ai` 區塊加入 `combos`，只能重用該 Boss 既有的技能 id（不可用大招）。light 節奏完全不讀這些資料。

```js
combos: [
  { id: 'hammer', name: '重錘變奏', weight: 1.4, phase: undefined /* 1 | 2 | 省略=兩階段 */, steps: [
    { skill: 'combo', exits: [{ after: 2, when: { rolled: true }, chance: 0.5, then: 'next' }] },   // 第 2 擊後：對手翻滾 → 砍掉收招直接接下一段
    { skill: 'quake', cancel: 0.5, branch: [                      // 前段收招剩 0.5 秒內即可起手
      { when: { landed: true }, do: 'extend' },                     // 命中 → 接
      { when: { rollDir: ['back'], dist: [170, 560] }, do: 'switch', skill: 'charge' },  // 向後滾 → 改用衝撞
      { chance: 0.45, do: 'delay', hold: [0.3, 0.6] },              // 延遲出手（騙翻滾）
      { do: 'stop' }] }] },                                         // 收手（收招照常，可能空振）
]
```

- `branch` 由上到下判定，第一條 `when` 全部成立且 `chance` 通過者生效，每段只判定一次。沒有規則成立 → 預設技能就緒時 `extend`，否則 `stop`。
- `when` 可用：`landed`、`rolled`、`rollDir`（`left`/`right`/`back`/`through`，相對自己）、`dist:[a,b]`、`sta`（體力比例下限）、`phase`、`enemyState`。
- 公平性：後續段落仍需體力（`feat.combo.costMul` 折扣）與冷卻（剩餘冷卻 ≤ `cd × feat.combo.cdGate`），起手後照樣進入完整冷卻；每串結束後有 `comboCd` 秒的連段冷卻。
- `node test/validate.js` 會檢查：技能存在、二階段 / 僅一階段技能只出現在對應階段的連段、`exits.after` 不超過該技能的傷害時點數、每個階段可用 2~4 串等。
- 調整參數：`js/data/pace.js` 的 `heavy.ai.feat.combo`；統計：`node test/ai_stats.js heavy`。

## 9. 用訓練場檢查新 Boss

新增檔案並載入後，直接開啟 `index.html` → 切換至「🎯 訓練場」→ 選擇新 Boss →「手動施放」：
- 逐一點擊一階段、二階段的各個技能按鈕與大招，觀察預警框（telegraph）、特效（fx）、傷害飄字、假人身上的狀態效果（statuses）與架勢條累積。
- 使用「假人距離」（近／中／遠）或直接點擊場地任意位置放置假人，測試遠程招式與範圍區域（zone）的射程與判定。
- 切換「×0.25」慢動作並配合「P」暫停，細緻檢查關鍵幀動作、特效粒子與受擊反饋。
- 按「F6」開啟 AI 偵錯覆蓋層，切換「AI」操控模式，觀察 AI 在各距離下的走位、出招抉擇與連招施展。
- `npm run test:training` 會自動讓所有已註冊 Boss 的一／二階段每招技能與大招對假人施放並驗證傷害（若新招式確實無法命中靜止目標，如見切反擊或特殊陷阱，才可加進 `test/training.test.js` 的 `ALLOW_MISS` 名單並附上繁中原因註解）。
- 可在訓練場用假人確認無法閃避的招式（假人本來就不會翻滾，主要用來看預警外觀與傷害）。

## 對撞（clash）

兩邊都在揮擊時互相撞開（刀刀對撞）；不需要專屬架式，與 `counter` 見切並存。實作在 `js/engine/traits.js`，測試 `npm run test:clash`。

- **角色能力**：`traits` 加 `'clash'`，並寫 `clash: { style: 'blade', proj: true }`。沒有 `clash` 的角色不會主動對撞，但他的招式仍可被別人撞開。`style` 只留給演出，`proj` 表示揮擊中可把 `deflect` 投射物彈偏。
- **技能等級**（`skill.clash`）：`'light'` 輕擊、`'heavy'` 重擊（壓過 light，同級互撞）、`false` 不能被撞。不寫時由 `tags` 推導：有 `melee` 且沒有 `aoe` / `zone` → light；其餘（含 `gap`、大招、`unblockable` 的判定）→ 不能。突進類想能對撞就明寫 `clash: 'light'`。
- **投射物**：`proj` 動作加 `deflect: true`，揮擊中的 `clash.proj` 角色可彈偏它；沒標的（例如米霍克的飛斬）照常命中。
- **結果**：同級 → 雙方無傷害、鎖在原地連拚 2–6 下（每串一種快 / 中 / 慢節奏、每下再抖動，各吃 7 架勢），最後才撞開；較高級壓斷較低級（較低級吃 35 架勢，高級方這一擊仍命中）。兩次對撞至少間隔 0.8 秒。`stats.clashes` 以「一下」計。
- **普攻**：技能 tags 加 `'basic'`、`cd: 0`、`cost: 0`（validate 只對 basic 放行 cd 0），低傷害、收招短、`weight` 低。`ai.basic`（0–1）= 其他技能沒出手、對手在普攻射程內時揮普攻的機率；對撞時 AI 優先用普攻，因為它永遠可用。目前有的角色：菲歐拉、米霍克、影刃武士、深淵監視者、呂布、佐佐木小次郎、波賽頓、亞當（拳對拳；呂布的方天掃 / 破盾突、波賽頓的三叉穿刺、亞當的真・神之右為 heavy）。普攻要放在 `skills` 陣列最後，不然會擠掉玩家操控的按鍵順序。
- **崩潰**：對撞累積的架勢滿了會直接架勢崩潰（`World.checkPostureBreak`），所以不會永遠卡在對撞。
- **對撞動畫**（純視覺）：連拚時雙方的 `_rally` 記著每一下的絕對時間；造型的 `body()` 呼叫 `R.rally(o)` 取得 `{ s, off, po, c }`（s＝1 的瞬間就是火花迸出、刀鋒相碰的時間點；off 是刀身相對「指向接點」的偏角；c 是到接點的距離），把武器對準接點後依 s 蓄力 / 劈回，並用 `R.bladeTrail` 畫刀光拖尾。範例見 `js/render/styles/fiora.js`、`mihawk.js` 的 `rallyPose`；新的能對撞角色照做即可。
- **AI**：`ai.clash`（0–1）= 看準近身預警後搶在落下前揮出快速近戰（`tags` 含 `fast`）的機率。
