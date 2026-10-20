# 特效系統與特效庫指南

本文件為《Boss鬥技場》特效系統（Effect Library）的設計與實作手冊，供設計新 Boss 招式視覺、擴充特效庫與調校效能時參考。

---

## 1. 概念

- **純視覺，零行為影響**：
  特效系統是純視覺狀態機（粒子、光環、震波、斬痕、光束、殘影、地面裂痕、光暈與震動），完全不接觸實體邏輯、碰撞判定或傷害計算。
  特效內部產生的所有亂數**一律使用視覺亂數 `BD.vrng`**（不可使用 `w.rng` 或 `Math.random()`）。即使在 Node.js 無頭模擬中累積特效資料，也不會消耗遊戲模擬的隨機數列，保證對戰行為與逐幀指紋（fingerprint）完全不變。
- **資料只宣告 `id` 與元素**：
  在 Boss 資料檔（`js/data/bosses/<id>.js`）中，招式僅以字串宣告特效（如 `fx: 'slam'`）與元素（如 `fxEl: 'fire'`），具體的粒子物理、光暈擴張、地面裂縫與色彩取樣皆由引擎與特效庫負責處理。
- **「先挑現有特效 + 元素，找不到再新增」設計流程**：
  特效庫目前內建 **63 種招式特效 × 10 種元素主題 = 630 種視覺組合**（例如 `slam` 砸地 × `fire` 火焰 = 熔岩碎地、`slam` × `poison` 劇毒 = 毒沼重擊）。
  設計新 Boss 招式時，請先打開特效圖鑑挑選現有特效與元素；只有在現有原型確實無法滿足表現需求時，才擴充特效庫。

---

## 2. 特效圖鑑（`fx-gallery.html`）

直接雙擊專案根目錄的 `fx-gallery.html`，即可在任一現代瀏覽器中開啟（支援 `file://` 協定，不需要啟動本機伺服器）。

### 控制項說明

- **元素（下拉）**：切換 10 種元素主題（物理、火焰、冰霜、劇毒、暗影、影流、聖光、雷電、血、秘法），觀察同一招式在不同色彩、煙塵與特徵微粒下的表現。
- **倍率（滑桿）**：調整 `scale`（0.5× ~ 2.5×），預覽不同尺寸倍率下的特效縮放。
- **體型（下拉）**：
  - **人形**：以影刃武士為施放者原型（半徑 24，`weight ≈ 1.0`）。
  - **巨型**：以熔岩巨像為施放者原型（半徑 58，`weight ≈ 1.69`），自動預覽巨型 Boss 施放時更巨大的震波與碎石。
- **沉重節奏（核取方塊）**：勾選切換為沉重節奏（`heavy`），預覽加粗前緣、延長存活時間、加深地裂與強化震度。
- **循環播放 / ↻ 全部重播**：控制各格是否循環展示，或一鍵重播整頁。
- **分類（下拉）**：依 10 大分類篩選格子。
- **搜尋（輸入框）**：支援以特效 id（如 `slam`）或繁中名稱（如 `砸地`）即時過濾。
- **點擊重播**：直接點擊任一特效卡片，即可獨立重播該格特效。

### 自動化測試指令

```bash
python3 test/fx_gallery_test.py
```

以無頭 Chromium 走訪整頁，驗證 63 種特效 × 10 種元素皆能正確播放、更新至少 5 幀、畫布具備明亮像素且無任何 JavaScript 例外或 Console 報錯。加上 `--shot <輸出路徑.png>` 可截圖存檔。

---

## 3. 在 Boss 資料中使用

### 基本語法

- **字串形式**：直接指定特效 id，元素使用施放者當前預設元素。
  ```js
  { do: 'hit', at: 0.5, shape: 'circle', r: 120, dmg: 80, fx: 'slam' }
  ```
- **指定元素**：動作中以 `fxEl` 覆寫元素。
  ```js
  { do: 'hit', at: 0.5, shape: 'circle', r: 120, dmg: 80, fx: 'slam', fxEl: 'fire' }
  ```
- **物件形式**：微調縮放、顏色或指定元素。
  ```js
  { do: 'hit', at: 0.8, shape: 'circle', r: 180, dmg: 140, fx: { id: 'bigslam', scale: 1.3, el: 'fire' } }
  ```
  `test/validate.js` 嚴格限制物件形式的合法鍵，僅允許：
  `['id', 'el', 'scale', 'color', 'intensity', 'weight', 'radius', 'arc', 'life']`。

### Boss 預設元素與階段切換

Boss 定義頂層宣告 `fxEl`，二階段可於 `phase2.fxEl` 切換：
```js
const myBoss = {
  id: 'flameknight',
  // ...
  fxEl: 'physical',           // 一階段預設元素：物理
  phase2: {
    // ...
    fxEl: 'fire',             // 二階段進入薪王狂暴：所有招式自動轉為火焰元素
  },
};
```
引擎解析元素順序（`BD.fxElementOf(unit)`）：
1. 若處於第二階段且 `phase2.fxEl` 存在，使用 `phase2.fxEl`。
2. 否則使用頂層 `def.fxEl`。
3. 若皆未設定，回傳 `'physical'`。

### 哪些動作會讀取 `fx` / `fxEl`

1. **`hit`（近戰與範圍判定）**：
   - 讀取 `a.fx` 與 `a.fxEl`，透過 `BD.K.hitFx` 觸發。
   - 若未宣告 `fx`，預設在判定幾何中心產生微型爆點 `'projhit'`。
2. **`dash`（衝刺）**：
   - 預設固定播放 `'dash'`（連續殘影與拖影線）。
   - 若額外宣告 `a.fx` 且非 `'dash'`（例如 `fx: 'slashline'` 居合一閃），則在衝刺起點額外播放該特效。讀取 `a.fxEl`。
3. **`hide`（隱身 / 躍起 / 鑽地）**：
   - 預設播放 `'vanish'`（化煙散去）。
   - 可用 `fx: 'leap'`（起跳躍起）或 `fx: 'burrow'`（鑽入地面）替換，並讀取 `a.fxEl`。
4. **`erupt`（連續噴發柱）**：
   - 預設每柱播放 `'erupt'`，可用 `a.fx` 與 `a.fxEl` 換成自訂地脈噴發特效。

### `tele` 預警動作的自動蓄力光規則

- **觸發條件**：預警時間 `a.dur >= 0.5` 且錨點為自身 `(a.anchor || 'self') === 'self'`。
- **預設行為**：引擎自動在 Boss 當前座標呼叫 `BD.spawnFx(w, a.chargeFx || 'charge', b.x, b.y, { src: b, life: Math.min(a.dur, 1.4) })`，產生由暗漸亮向內收束的蓄力微粒。
- **關閉自動蓄力**：若該招式不適合發光蓄力，設定 `chargeFx: false` 即可關閉。
- **替換自訂蓄力**：設定 `chargeFx: 'id'`（例如 `chargeFx: 'stance'`）。

### 真實 Boss 資料範例

```js
// 範例 1：熔岩巨像（magmus.js）「重錘三連」第 3 擊的砸地
...strike(1.6, 0.5, { shape: 'circle', r: 147, off: 84 }, { dmg: 120, posture: 45, kb: 380, fx: 'slam' })

// 範例 2：熔岩巨像（magmus.js）大招「末日隕落」的躍起起跳與落地巨力砸地（物件縮放）
{ do: 'hide', at: 0.3, fx: 'leap' },
{ do: 'hit', at: 1.6, shape: 'circle', r: 294, anchor: 'mark', mark: 'U', dmg: 240, posture: 80, kb: 650, fx: { id: 'bigslam', scale: 1.3 } }

// 範例 3：影刃武士（ronin.js）「居合斬」高速衝刺，收刀後刀痕才遲一步裂開
dashStrike(0.42, 0.42, 330, 60, 0.13, { dmg: 95, posture: 40, kb: 250 }, { iframe: true, fx: 'iaido' })

// 範例 4：霜月魔女（witch.js）「冰槍貫穿」指定秘法元素的光束
strike(1.0, 1.0, { shape: 'rect', len: 950, w: 54, off: 10 }, { dmg: 165, posture: 65, kb: 300, fx: { id: 'beam', el: 'arcane' }, slow: 1 })

// 範例 5：腐沼母巢（brood.js）「鑽地突襲」鑽入泥土與破土巨砸
{ do: 'hide', at: 0.3, fx: 'burrow' },
{ do: 'hit', at: 1.45, shape: 'circle', r: 189, anchor: 'mark', mark: 'B', dmg: 140, posture: 60, kb: 520, fx: { id: 'bigslam', scale: 1.2 } }
```

---

## 4. `opts` 參考表與參數合併

當呼叫 `BD.spawnFx(w, spec, x, y, opts)` 時，特效定義的 `spawn(fx, x, y, o)` 收到的參數物件 `o` 是經由三層合併與數值推導產生的。

### 參數參考表

| 參數 | 型別 | 說明與預設值推導 |
|---|---|---|
| `src` | Object | 施放者單位實例（Boss 或召喚物），提供座標、半徑與面向 |
| `el` | String | 元素 id，預設由 `BD.fxElementOf(src)` 推導 |
| `E` | Object | 解析後的元素主題物件（含 `core`, `glow`, `particle`, `debris`, `smoke`, `decal`, `crack`, `extra`） |
| `scale` | Number | 尺寸縮放倍率，預設 `1` |
| `weight` | Number | 重量感倍率，由施放者半徑推導：`src && src.r ? U.clamp((src.r / 24) ** 0.6, 0.8, 2.2) : 1`。人形（r=24）約 1.0，巨型（r=58）約 1.7 |
| `intensity` | Number | 衝擊強度倍率，由傷害推導：`dmg ? U.clamp(dmg / 90, 0.55, 2.4) : 1` |
| `k` | Number | **綜合倍率公式**：`k = scale * Math.sqrt(weight * intensity)`，特效內部常用於粒子數與尺寸放縮 |
| `angle` | Number | 揮擊或朝向角度（弧度），預設取施放者 `src.face`，無則為 `0` |
| `arc` | Number | 扇形或弧刃張角（弧度，例如弧斬、噴吐） |
| `radius` | Number | 判定或特效外半徑，預設為 `60 * scale * weight` |
| `r0` | Number | 內半徑（震波環、柱環等環狀特效使用） |
| `len` | Number | 直線長度（突刺、光束、衝刺等長條特效使用） |
| `width` | Number | 寬度（光束寬度、突刺寬度） |
| `dur` | Number | 動作持續時間（衝刺時間、居合一閃延遲） |
| `life` | Number | 特效存活時間（秒） |
| `color` | String | 顏色覆寫；指定時會同時覆寫元素主題的 `glow` 與 `particle` |
| `heavy` | Boolean | 是否為沉重節奏（`!!w.pace`），開啟時加粗震波、加深地裂、延長存活時間 |

### 合併順序

參數依照以下順序由左至右覆寫：
$$\text{effect.params (特效預設)} \longrightarrow \text{opts (呼叫端傳入)} \longrightarrow \text{spec 物件欄位 (Boss 資料定義)}$$

> [!IMPORTANT]
> 合併時**嚴格略過 `undefined` 鍵**。例如圓形判定呼叫端傳入 `{ radius: 100 }` 但未定義 `arc`，不會覆寫掉弧斬特效自帶的 `params: { arc: 1.6 }` 預設參數。

---

## 5. 特效一覽表（63 種特效）

依 10 大分類（`BD.EFFECT_CATEGORIES`）整理，包含適合招式與當前所有 Boss 資料及引擎內建呼叫點：

| 分類 | id | 中文名 | 適合的招式 | 現有使用處（Boss 招式與引擎內建用途） |
|---|---|---|---|---|
| **斬擊** | `slash` | 弧斬 | 一般揮砍、快速連段 | 熔岩巨像「重錘三連」、影刃武士「燕返」/「影步」、深淵監視者「狼血連斬」、腐沼母巢「尖肢突刺」、監視者同伴揮砍 |
| | `cleave` | 重劈 | 巨型 Boss 單發大弧重斬、附帶裂地與碎石 | 特效庫與圖鑑提供 |
| | `whirl` | 迴旋斬 | 原地 360° 雙段半圓迴旋、清場掃擊 | 劫「影奧義！鬼斬」（本體與影子） |
| | `contempt` | 蔑視斬 | 目標身上交叉兩道短斬痕、中心閃光與噴濺火花 | 劫被動「影忍法・滅魂劫」觸發 |
| | `divineaxe` | 神之斧 | 場地一暗，掃踢後浮現巨斧幻影：漆黑寬弧斧面＋白熱斧刃掃過扇面，刃緣火花、終點裂地 | 宙斯「神之斧」 |
| **突刺** | `thrust` | 突刺 | 細長刃光、長槍穿刺、角撞、單點穿刺 | 腐沼母巢「尖肢突刺」、影刃武士「燕返（二階段）」、深淵監視者「狼血連斬」 |
| | `cross` | 斬線 | 貫穿畫面的筆直斬線與垂直飛散火花 | combat.js `slashes` 連續斬線動作（未指定 fx 時） |
| | `slashline` | 居合一閃 | 衝刺穿身殘影、落定後貫穿全線的白熱一閃 | 深淵監視者「突進刺擊」、呂布「飛將撲」 |
| | `iaido` | 居合・遲裂 | 衝刺只留殘影、收刀後刀痕懸空，delay 秒後沿線猛然裂開 | 影刃武士「居合斬」/「千鳥三連閃」 |
| | `totsuka` | 十拳劍 | 封印、一刺必殺的靈劍：蒼紫粗大光刃貫穿到終點、三圈光環內縮並浮出「封」字 | 鼬「須佐能乎・十拳劍」與大招二階段 |
| | `thunderpath` | 雷槌軌跡 | 整條路徑竄起鋸齒電弧、留下緩緩褪去的發光軌跡，scale 越大越亮 | 索爾「雷槌迴旋擲」、大招「蓋爾羅德」的去程 / 回程 |
| | `beam` | 光束 | 粗大能量光束、雷射、吐息直線、法術砲擊 | 霜月魔女「冰槍貫穿」 |
| | `fistrain` | 拳雨 | 直線前方塞滿拳影光點與速度線、金色鋸齒電弧竄過，終點震波與向前噴的火花 | 宙斯「黃昏流星拳」收尾、「真・神之右」、大招二階段 |
| **砸地** | `slam` | 砸地 | 武器或拳頭重擊地面、裂地碎石衝擊 | 熔岩巨像「重錘三連第3擊」/「熔岩衝撞（二階段）」/「地裂震波」、深淵監視者「迴旋翻斬」 |
| | `bigslam` | 巨力砸地 | 跳砸、大招級毀滅重擊、雙層震波大範圍裂地 | 熔岩巨像「末日隕落」、深淵監視者「躍空下劈」/「狼血連環躍斬」/「薪王焚環」、腐沼母巢「鑽地突襲」 |
| | `erupt` | 地脈噴發 | 沖天光柱、地刺、岩漿噴發、地脈爆發 | zones.js `erupt` 動作預設 |
| | `thunderstrike` | 雷擊落點 | 白熱光柱貫穿地面、電弧與震波炸開、發光碎裂焦痕 | 索爾「雷霆萬鈞」、大招「鬥神之雷槌」/「蓋爾羅德」 |
| | `crushhug` | 熊抱 | 被抱住不斷收緊：光環從四周向中心猛縮、兩側擠出白色火花、中心閃一下並浮出「咔」；scale 越大抱得越緊，收尾一抱炸出震波與碎屑 | 勇次郎「熊抱」（hit 的 fx，四次擠壓 + 收尾） |
| **震波** | `ring` | 震波環 | 貼地擴散的單圈衝擊環、踐踏、落地衝擊 | 熔岩巨像「地裂震波」、深淵監視者「旋風橫掃」/「狼血連環躍斬」 |
| | `nova` | 爆環 | 光暈炸開的環形爆散、能量新星、冰爆 | 霜月魔女「寒冰新星」 |
| | `pillarring` | 柱環 | 環形排列的多道光柱接連沖天升起 | 深淵監視者「迴旋翻斬（二階段）」/「躍空下劈（二階段）」/「旋風橫掃（二階段）」/「薪王焚環（二階段）」 |
| | `quakehalt` | 止震之拳 | 一拳砸停地震：落點白熱震波 + 放射狀粗大地裂，三圈一圈比一圈寬的震波接連推出，碎石塵土炸起 | 勇次郎「止震之拳」 |
| **爆炸** | `explode` | 爆炸 | 投射物或隕石落地劇烈爆炸、強光震波碎石焦痕 | projectiles.js `lob` / `rain` 落地爆炸（explodeAt） |
| | `burst` | 爆散 | 小型短促爆散光環、自爆、召喚物死亡、血霧 | minion.js 召喚物死亡預設、腐沼蜘蛛自爆、深淵監視者血祭消散 |
| | `shellburst` | 外殼爆裂 | 岩殼從內部炸開：裂縫噴火花、熱光膨脹，life 秒後岩塊四散、熔岩震波與發光裂痕 | 熔岩巨像 `phase2.transFx` |
| | `sacburst` | 卵囊破裂 | 病綠暗幕下身後卵囊脈動冒泡，life 秒後囊膜炸開：黏液四濺、毒霧、酸液斑點與綠色震波 | 腐沼母巢 `phase2.transFx` |
| | `deathmark` | 死亡印記引爆 | 全場一暗、三道斬線交錯貫穿目標、黑色碎片與震波、地裂 | 劫「禁奧義！瞬獄影殺陣」印記到期（`deathmark` 狀態） |
| | `impact` | 命中爆點 | 被擊中時的受擊爆點回饋、火花與重擊閃白震動 | world.js `damageBoss`（Boss 受擊時的通用回饋） |
| **位移** | `blink` | 閃現 | 瞬移、起點收縮光環煙霧、終點綻放與拖影 | movement.js `blink` 動作（blinkTo） |
| | `boltblink` | 雷光瞬身 | 起點到終點劈出鋸齒雷光、兩端爆閃、起點焦痕 | 索爾「雷光瞬身」（blink 動作的 fx） |
| | `livingshadow` | 影分身 | 本體剝離出影子疾射：漆黑身形殘跡＋元素細線，終點煙霧與內縮光環 | shadow.js `shadow` 動作（劫的影子） |
| | `shadowswap` | 影換位 | 兩端黑煙與內縮光環、一黑一亮兩道拖影交錯 | shadow.js `swap` 動作（劫與影子換位） |
| | `vanish` | 隱身 | 身影化煙散去、暗影粒子飄散、潛行消失 | movement.js `hide` 動作預設、深淵監視者同伴消散 |
| | `appear` | 現身 | 身影從煙霧中浮現、解除隱身、傳送抵達 | movement.js `appear` 動作、Boss 解除 hidden 狀態 |
| | `leap` | 躍起 | 起跳衝擊、地面震波向外推開、碎石塵土彈起 | movement.js `hide` 動作指定、熔岩巨像「末日隕落」起跳、深淵監視者「躍空下劈」起跳 |
| | `burrow` | 鑽地 | 鑽入或鑽出泥土、碎塊大量翻飛、地表裂坑 | movement.js `hide` 動作指定、腐沼母巢「鑽地突襲」起手 |
| | `dash` | 衝刺 | 高速突進、起步光環＋連續殘影與拖影線＋元素尾跡 | movement.js `dash` 與 `circle` 動作預設、熔岩巨像「熔岩衝撞」 |
| | `crowburst` | 烏鴉分身 | 替身、遁走：起點炸出放射狀漆黑羽翼拖影與羽毛，終點收束紅光與落羽 | 鼬「烏鴉分身」「瞬身」（blink 的 fx）與 trait `crowsub` |
| | `hoofcharge` | 鐵騎衝鋒 | 戰馬衝鋒沿路左右交替的蹄印、揚塵與火星，終點塵浪 | 呂布大招「天喰・赤兔奔騰」的衝鋒 |
| | `warsteed` | 戰騎奔至 | 換階段暗紅暗幕下，蹄印與揚塵從身後遠處一路奔近，時間到時塵浪與震波炸開 | 呂布 `phase2.transFx`（赤兔登場） |
| **投射物** | `projhit` | 投射物命中 | 飛刀、火球、毒彈等命中目標的小型爆點火花 | projectile.js 命中目標、kit.js `hitFx` 未指定 fx 時預設、小兵受傷 |
| | `projwall` | 碰撞碎散 | 撞上牆面或柱子的碎散方形火花與碎塊 | projectile.js 碰牆、boss.js Boss 衝撞競技場牆壁 |
| | `swarmtrail` | 蟲群尾跡 | 蟲群飛行留下的細碎微光火花與毒泡 | projectile.js `swarm` 飛行中 |
| | `trail` | 拖痕火花 | 移動中留下的短暫微粒與元素餘燼 | zones.js `dropTrail`（衝刺或繞圈留下火痕時） |
| **區域** | `amaterasu` | 天照 | 黑炎：墨黑濃煙與暗紅火星竄起、焦黑地面與暗紅裂痕（搭配元素 `blackfire`） | 鼬「天照」與大招的黑炎噴發柱 |
| | `flamethrow` | 噴火 | 真正塗滿扇形的火焰噴射：火團一波波沿整個錐形範圍向外推進、黑煙與火星、最前緣巨大火球、終點熱浪 | 鼬「火遁・豪火球之術」 |
| | `breath` | 噴吐 | 廣角錐形扇形刃光、錐內微粒與火花翻湧 | 熔岩巨像「熔岩噴吐」 |
| | `ambient` | 區域氛圍 | 毒池、火海、冰域等持續性地表跳動微粒與淡光暈 | zones.js `updateZones` 每 0.4 秒 tick |
| | `trapset` | 佈置陷阱 | 地雷、蛛網、符印設置時的收束光環與微光提示 | zones.js `trap` 動作佈置陷阱 |
| | `trapburst` | 陷阱觸發 | 陷阱踩中引爆、光環彈開、散射火花與微粒 | zones.js `updateTraps` 陷阱被踩中 |
| **增益** | `charge` | 蓄力 | 光源由暗漸亮向內收束、吸入光點 | combat.js `tele` 自動蓄力光預設 |
| | `stance` | 架式 | 光環由外向內收束成細環、中心微光 | combat.js `counter` 動作（見切架式） |
| | `parry` | 見切 | 精準彈反白熱光環盪開、全屏一閃、交叉亮線與火花 | traits.js counter 特性彈反成功（預設） |
| | `mikiri` | 見切・一閃 | 看穿瞬間場地轉暗、光環收束；delay 秒後背後一記巨大白弧斬 | 影刃武士「見切」成功（counter 動作的 fx） |
| | `divinesight` | 神虛視 | 看穿並複製招式的瞬間：場地轉暗、金色眼紋光環盪開、三道殘影疊出、八道放射光線 | 亞當「神虛視」複製成功（trait `reflect`，搭配 `replica` 元素）與二階段 `phase2.transFx` |
| | `gfoc` | 全宇宙之父 | 金光爆環、頭頂「G F O C」字樣、四周飄起音符、三層肌肉膨脹殘影 | 宙斯「全宇宙之父」 |
| | `adamas` | 阿陀磨須 | life 秒內橘紅高熱、蒸氣、光環向身體擠壓；時間到白煙炸開、紫黑星海暗幕與星光、雙層震波 | 宙斯 `phase2.transFx` |
| | `mangekyo` | 萬花筒覺醒 | 血紅暗幕、三枚勾玉刃光越轉越快收緊、血淚墜落，時間到斗笠碎片炸飛、雙層震波與紅光柱、三道烏鴉殘影 | 鼬 `phase2.transFx` |
| | `susanoo` | 須佐能乎 | 橘紅光柱與震波、肋骨弧光一根根長出、「須佐能乎」字樣 | 鼬 status `susanoo` 施加時 |
| | `yatamirror` | 八咫鏡 | 橘金同心光環由內向外盪開、旋轉弧光刻出漩渦紋 | 鼬「八咫鏡・反映」彈反成功 |
| | `ogreback` | 鬼背解放 | life 秒內赤紅光暈越來越亮、背肌搏動般的光環一圈圈向外，地面不斷震動；時間到時黑色布片炸飛、暗紅暗幕、巨大的「鬼」字浮現並炸開雙層震波與地裂 | 勇次郎 `phase2.transFx` |
| | `pojun` | 破軍 | 重兵器彈反：暗紅暗幕、震波與光環收束；delay 秒後沿面向劈出粗大刃光 | 呂布「鎚頂」彈反成功（counter 動作的 fx） |
| | `ironfist` | 鐵手套・反槌 | 鐵手套擋下的金屬火花與光環收束；delay 秒後面前重槌震波與地裂 | 索爾「雅恩格利佩爾・格擋」彈反成功 |
| | `summon` | 召喚 | 召喚物現身的小光圈擴張、微粒聚攏與閃光 | minion.js `spawnMinion` 召喚物現身 |
| | `roar` | 咆哮 | 階段轉換全場巨大震波、強烈震動與全屏閃光 | world.js 階段轉換、深淵監視者復活咆哮 |
| | `bloodroar` | 血吼 | 暗紅暗幕約一秒、震波與白環擴散、火花與餘燼噴湧 | 呂布「斷腿不退」 |
| | `pressure` | 威壓 | 場地變暗、三圈光環向施放者收攏、地面龜裂與低沉震動 | 索爾「雷神威壓」 |
| | `awaken` | 覺醒 | 進入第二階段全屏元素閃光、身上光暈與環繞微粒 | boss.js `checkPhaseTransition` 二階段變身 |
| | `shadowrise` | 影起 | 換階段暗幕籠罩、暗影吸向施放者，life 秒後炸成四道交錯弧斬 | 影刃武士 `phase2.transFx` |
| | `eclipse` | 月蝕 | 換階段深藍暗幕、頭上月光與收攏光環，life 秒後月光炸成雙層震波與冰晶符文 | 霜月魔女 `phase2.transFx` |
| | `thunderwake` | 雷槌覺醒 | 深藍暗幕下電弧越竄越密，life 秒後落雷光柱直擊、鐵灰碎片四散與雷電震波 | 索爾 `phase2.transFx` |
| | `posturebreak` | 架勢崩潰 | 架勢被打斷破防瞬間、金色光環彈開、金色火花四濺 | world.js `damageBoss`（Boss 架勢條歸零破防時） |
| **大招** | `tsukuyomi` | 月讀 | 白閃後沉入血紅暗幕、血紅月亮（月中三枚勾玉旋轉）、白色十字架、每 0.2 秒白線貫穿目標 | 鼬 status `tsukuyomi` 施加時 |
| | `ultcast` | 大招發動 | 施放大招起手詠唱、全屏一閃、巨大蓄力光收束 | boss.js `startSkill` 施放大招起手前置 |
| | `domain` | 領域爆發 | 領域展開、結界覆蓋、全屏核心色閃光與強震、點陣爆散 | 霜月魔女大招「絕對零度」 |
| | `zerocast` | 絕對零度蓄勢 | 全場冰封預兆：畫面漸暗、安全圈冷光與收束光環、場上雪光與霜紋 | 霜月魔女大招預警（tele 的 `teleFx`） |
| | `absolutezero` | 絕對零度 | 全屏白光、冰晶光束放射、雙冰環橫掃、點陣霜晶爆散 | 霜月魔女大招爆發 |
| | `nightfall` | 夜幕 | 化煙遁入黑暗，場地暗幕籠罩 life 秒，只剩角色與預警發亮 | 影刃武士大招「百鬼夜斬」隱身 |
| | `threadcut` | 懸斬 | 刀痕懸在空中，hold 秒後才裂開；多道同時到期就一齊裂開 | 影刃武士大招「百鬼夜斬」的斬線（slashes 的 fx） |
| | `skyrend` | 天喰 | 沿整條直線劈出巨大刃光、地面沿線裂開發光，0.25 秒後裂口噴出煙霧與二次刃光 | 呂布「天喰・未完成」與大招「天喰」 |
| | `timefist` | 超越時間之拳 | 時間凍結般的暗幕與收束光環，0.12 秒後沿整條直線炸出白熱光束、連鎖震波與地裂，終點巨大衝擊 | 亞當、宙斯「超越時間之拳」與大招（dash 的 fx） |
| | `timestop` | 時間停止 | 暗幕下施放者腳下浮現鐘面（外環、十二刻度、兩根逆轉的指針），光點被吸回，最後收成一圈白光 | 宙斯「超越時間之拳」與大招的蓄力（tele 的 chargeFx） |
| | `nukefist` | 撼地一拳 | 核爆般的一拳：全屏泛白、全場一暗，純白核心與四圈快速擴張的震波、十二道放射地裂與速度線、噴上天的碎石，焦黑發光的坑洞 | 勇次郎「鬼貌一擊」與大招「地上最強的一擊」/「鬼哭啼」 |
| | `finale` | 終結 | Boss 被擊倒終結演出、全屏白光、強震、海量火花碎塊 | world.js `onBossDeath` 擊殺結算演出 |

---

## 6. 元素一覽表

元素主題定義於 `js/fx/elements.js`，包含調色盤與特徵粒子行為：

| id | 中文名 | 核心光 `core` | 外光主色 `glow` | 粒子色 `particle` | 碎石 `debris` / 裂痕光 `crack` | 額外粒子行為 `extra` | 建議用途 |
|---|---|---|---|---|---|---|---|
| `physical` | 物理 | `#fff4e0` | `#ffd7a0` | `#d8c8b0` | `#8c7b66` / 無 | `dust`（碎石土塵） | 拳腳、純刀劍斬擊、鈍器敲擊、普通投射物 |
| `fire` | 火焰 | `#fff1b8` | `#ff8a2a` | `#ffb347` | `#8a3a14` / `#ff6a1a` | `embers`（上升餘燼） | 烈焰、岩漿、爆燃、薪王之火 |
| `ice` | 冰霜 | `#f4feff` | `#9fe6ff` | `#dff6ff` | `#cfefff` / `#bff3ff` | `shards`（冰晶碎片） | 寒冰、霜凍、暴風雪、晶錐、凍結領域 |
| `poison` | 劇毒 | `#eaffb0` | `#9be15d` | `#b6ff5c` | `#5e7a2a` / `#a8ff40` | `bubbles`（毒泡浮起） | 酸液、毒霧、沼澤、毒刺、蛛網 |
| `shadow` | 暗影 | `#e6d8ff` | `#9a6bff` | `#6b4aa8` | `#3a2a55` / `#7a4dff` | `wisps`（暗影游絲） | 刺客、影分身、黑霧、深淵幽邃力量 |
| `umbra` | 影流 | `#ffd6da` | `#e01e37` | `#1a0a0e` | `#2a1518` / `#ff2a44` | `wisps`（暗影游絲） | 漆黑影子配血紅刃光：劫的影分身、諸刃、鬼斬 |
| `holy` | 聖光 | `#fffef0` | `#ffe27a` | `#fff1b0` | `#e8d9a8` / `#ffe9a0` | `motes`（聖光微粒） | 神聖衝擊、祝福、天罰、光柱 |
| `lightning` | 雷電 | `#ffffff` | `#7fc8ff` | `#cfe9ff` | `#5a6a88` / `#a8dcff` | `crackle`（電弧折線） | 落雷、電弧、電磁衝擊、雷射貫穿 |
| `blood` | 血 | `#ffd0d0` | `#d0102a` | `#9a0a1c` | `#7a0a18` / `#ff2a40` | `drips`（血滴彈跳） | 斬殺爆血、鮮血獻祭、血狂撕裂 |
| `replica` | 神虛視 | `#fff0f4` | `#ff4f7e` | `#ffa0bc` | `#8a2a48` / `#ff6f95` | `runes`（秘紋光點） | 粉紅色的看穿、複製類演出（亞當的神虛視） |
| `cosmos` | 星海 | `#f3e8ff` | `#9b5cff` | `#d6b8ff` | `#3a2450` / `#b07bff` | `motes`（光點） | 紫黑星空的神威：宙斯阿陀磨須 |
| `blackfire` | 黑炎 | `#ffffff` | `#b3123c` | `#06020a` | `#0c0408` / `#d81c4a` | `embers`（上升餘燼） | 墨黑火焰配暗紅邊：鼬的天照 |
| `arcane` | 秘法 | `#f6e8ff` | `#c77dff` | `#e0b8ff` | `#6a3a8a` / `#d9a0ff` | `runes`（秘紋光點） | 奧術光束、星體魔法、符印法陣、時空裂隙 |

### `BD.kindElement` 對照表

在投射物、地表區域與陷阱中，若未指定元素，引擎會呼叫 `BD.kindElement(kind, fallback)` 自動映射：

- `fire`, `flame`, `lava`, `meteor`, `magma` $\longrightarrow$ `'fire'`
- `ice`, `blizzard`, `mine`, `frost` $\longrightarrow$ `'ice'`
- `acid`, `poison`, `swarm`, `egg`, `spider` $\longrightarrow$ `'poison'`
- `kunai`, `caltrops`, `web` $\longrightarrow$ `'physical'`
- `clone`, `sentinel`, `watcher` $\longrightarrow$ `'shadow'`
- 若無匹配，使用 `fallback`（通常為施放者當前預設元素 `BD.fxElementOf(src)`）；再無則回傳 `'physical'`。

---

## 7. 原件（Primitives）一覽

所有高階特效只能呼叫 `FX` 類別（`js/engine/entities/fx.js`）提供的原件方法。

### 硬上限與粒子預算（Budget）

- **硬上限（`BD.FX_CAPS`）**：
  - `PART_CAP = 900`：場上活躍粒子硬上限。
  - `POOL_CAP = 1000`：粒子物件池（free-list）上限。
  - `DECAL_CAP = 70`：地面印記與裂痕上限（超出時淘汰最舊者）。
  - `GLOW_CAP = 80`：加法光暈上限。
  - `STREAK_CAP = 120`：動態拖影亮線上限。
  - `GHOST_CAP = 40`：角色殘影上限。
- **動態預算（`fx.budget(n)`）**：
  新特效產生粒子時會自動依場上粒子飽和度縮減發射量：
  - 佔比 $< 55\%$：發射 $100\%$ 數量。
  - 佔比 $55\% \sim 80\%$：縮減為 $60\%$。
  - 佔比 $\ge 80\%$：縮減為 $30\%$。

### 繪製分層

`R.draw.fx(ctx, w, layer)` 分兩層：`'ground'`（震波、光環、半徑 ≥ 70 的大光暈）畫在 Boss 底下，`'air'`（光柱、斬擊、光束、拖影、粒子、小光暈）畫在 Boss 上面；省略 `layer` 時兩層依序全畫。
大招的大範圍閃光因此不會把角色洗成一片白，命中閃點等小光暈仍蓋在最上層。

### 原件方法一覽

| 原件方法簽名 | 一句話說明 |
|---|---|
| `sparks(x, y, color, n, speed)` | 向四周放射短暫微型方形火花粒子 |
| `sparkle(x, y, color, n, speed, dir, spread)` | 沿指定角度（`dir`）與散角（`spread`）噴射拉長之加亮（additive）火花線段 |
| `smoke(x, y, color, n, spread)` | 在半徑內擴散柔光煙霧粒子 |
| `debris(x, y, color, n, speed, size, spread)` | 帶有假高度 $z$ 與重力的立體碎石塊，落地時具備物理彈跳 |
| `embers(x, y, color, n, spread, rise)` | 閃爍並帶有向上加速度緩慢上飄的加法微光餘燼 |
| `motes(x, y, E, n, spread, speed)` | 依元素主題的 `extra` 自動發射對應特徵微粒（餘燼/冰晶/毒泡/暗影/電弧/血滴/秘紋/聖光/碎石） |
| `ring(x, y, r0, r1, life, color, width)` | 從內半徑 $r_0$ 擴張到外半徑 $r_1$ 的單色衝擊光環線框 |
| `shock(x, y, r0, r1, life, color, width, core)` | 帶有明亮加法前緣（`core`）與半透明填色、以 easeOutCubic 擴張的強烈震波 |
| `slash(x, y, ang, arc, r, color, width, life, opts)` | 沿方向與張角掃出的弧形刃光，可設定加亮核心線（`core`）與殘影弧數（`trail`） |
| `beam(x1, y1, x2, y2, w, color, life, core)` | 連接兩點的筆直能量光束，支援高亮核心線 |
| `streak(x1, y1, x2, y2, w, color, life, add)` | 兩點間由粗漸細的動態殘跡拖影線，`add=true` 時採加法混合 |
| `glow(x, y, r, color, life, a, grow, follow)` | 加法混色柔光光暈，可隨時間擴張（`grow`）或跟隨單位座標（`follow`） |
| `charge(x, y, r, color, life, follow, n)` | 聚力蓄光，光暈由暗漸亮半徑收縮，並有向中心吸聚的光點 |
| `flashAt(x, y, r, color, life)` | 局部爆點閃光，於衝擊點產生短促強烈的加法光暈 |
| `ghost(u, life, color)` | 擷取角色當下造型、方向與動畫姿勢的半透明外形殘影 |
| `pillar(x, y, r, color, life)` | 從地面沖天而起的元素光柱 |
| `text(x, y, text, color, size)` | 向上飄移淡出的浮動戰鬥文字 |
| `damage(b, dmg, color)` | 向上浮現的傷害數字（$\ge 100$ 自動放大並帶彈跳彈出效果） |
| `decal(x, y, r, color, life)` | 地面留下的圓形焦痕 / 污跡印記（最多維持 `DECAL_CAP` 個） |
| `crack(x, y, r, color, life, glow, branches)` | 程序生成的多分岔碎裂地面裂痕，縫內可透出元素發光色（`glow`） |
| `shake(v, dir)` | 觸發畫面震動，震度疊加並以指數衰減；給受擊方向 `dir`（弧度）時畫面沿該方向擺動，否則為平滑的雙頻正弦抖動 |
| `flash(c, a)` | 觸發全螢幕覆蓋閃光與指定不透明度 |
| `veil(life, a, color)` | 場地暗幕：地面與區域變暗 life 秒（淡入 0.15 秒、最後 0.3 秒淡出），預警、角色與特效仍畫在暗幕之上 |
| `after(t, fn)` | 特效內部專用的延遲排程（依賴模擬時間，不碰 `w.later`，純視覺無副作用） |
| `part(kind, x, y, vx, vy, life, color, size, drag)` | 產生單一底層粒子（達上限回傳 `null`） |
| `budget(n)` | 依目前場上粒子佔比動態計算建議發射粒子量 |

---

## 8. 新增一個特效

擴充特效庫請依以下標準步驟進行：

### 步驟流程

1. **選擇分類檔案**：
   在 `js/fx/` 目錄中找到對應分類的檔案（`slash.js`、`thrust.js`、`impact.js`、`shockwave.js`、`explosion.js`、`movement.js`、`projectile.js`、`zone.js`、`buff.js`、`ultimate.js`）。
2. **呼叫 `BD.defineEffect(id, spec)`**：
   註冊特效，指定繁體中文 `name`、所屬 `category`、適用場景說明 `desc`、預設參數 `params` 與執行函式 `spawn(fx, x, y, o)`。
3. **只用原件與 `BD.vrng`**：
   函式內只能呼叫 `fx` 實例的原件方法；隨機數只能使用 `BD.vrng()`（不可使用 `w.rng`、`Math.random()`）。
4. **色彩與縮放規則**：
   - 繪製顏色取自 `o.E`（`o.E.core`, `o.E.glow`, `o.E.particle`, `o.E.debris`, `o.E.crack` 等）。
   - 粒子數量與尺寸放大請乘上綜合倍率 `o.k`（或 `Math.min(1.5, o.k)` 避免過度膨脹）。
   - 檢查 `o.heavy` 沉重節奏旗標，適度加深裂痕、延長震波生命與加大震動。
5. **在特效圖鑑驗證**：
   開啟 `fx-gallery.html`，切換所有 10 種元素，確認視覺效果協調且無邊界裁切。
6. **執行驗證與指紋比對**：
   執行 `npm test`（含 `validate.js` 與 `fingerprint.js`），確認所有檢查通過且指紋完全為 `IDENTICAL`。

### 需要新增原件時

若現有原件無法表達所需視覺，請修改：
1. `js/engine/entities/fx.js`：在 `FX` 類別中新增狀態收集與更新陣列。
2. `js/render/world.js`：在對應的繪製函式中實作 Canvas 繪圖邏輯。

### 新增元素主題

若需新增元素主題，於 `js/fx/elements.js` 呼叫 `BD.defineElement(id, spec)`：
- `name`：繁中名稱。
- `core`：亮核心色（加法前緣）。
- `glow`：外光主色。
- `particle`：粒子散落色。
- `debris`：碎塊顏色（選用，預設同 `particle`）。
- `smoke`：煙塵顏色（rgba 字串）。
- `decal`：地面痕跡顏色（rgba 字串）。
- `crack`：裂縫內部發光色（字串或 `null`）。
- `rim`：對比邊緣色（選用）。斬擊、震波、光束會在外緣多畫一圈此色，讓同色系特效有輪廓；原件在 `BD.spawnFx` 期間自動取用，不必在特效裡傳。
- `extra`：額外微粒行為（`'embers'` / `'shards'` / `'bubbles'` / `'wisps'` / `'crackle'` / `'drips'` / `'runes'` / `'motes'` / `'dust'` 或 `null`）。

### 完整範例程式碼：雷擊落點（`thunderstrike`）

以下示範在 `js/fx/impact.js` 新增一個「雷擊落點」特效：

```js
BD.defineEffect('thunderstrike', {
  name: '雷擊落點', category: '砸地',
  desc: '蒼雷轟頂的落雷衝擊：一道白熱光柱貫穿地面、向四周炸開電弧與震波，地面留下發光碎裂焦痕。適合雷擊、神罰、落雷召喚。',
  params: { radius: 90 },
  spawn(fx, x, y, o) {
    const E = o.E, k = o.k, r = o.radius || 90;
    const life = o.heavy ? 0.6 : 0.45;

    // 1. 垂直天降光柱與貫穿閃光
    fx.pillar(x, y, r * 0.7 * Math.min(1.4, k), E.glow, life);
    fx.flashAt(x, y, r * 0.9, E.core, 0.16);

    // 2. 地面明亮前緣震波
    fx.shock(x, y, 10, r, life, E.glow, 8 * Math.min(1.5, k), E.core);

    // 3. 地面碎裂發光裂痕與焦痕
    fx.crack(x, y, r * 0.8, E.decal, o.heavy ? 8 : 6, E.crack, Math.round(6 + 3 * k));
    fx.decal(x, y, r * 0.6, E.decal, 6);

    // 4. 向上噴濺的高亮火花與碎石
    fx.sparkle(x, y, E.core, Math.round(14 * k), 420, -Math.PI / 2, 1.8);
    fx.debris(x, y, E.debris, Math.round(8 * k), 260, 3 + k, r * 0.25);

    // 5. 元素特徵微粒（雷元素時會炸出折線電弧）
    fx.motes(x, y, E, Math.round(12 * k), r * 0.5, 200);

    // 6. 畫面震動
    fx.shake((o.heavy ? 12 : 8) * Math.min(1.6, k));
  },
});
```

---

## 9. 效能守則

戰鬥過程中可能有多位 Boss 同時出招、召喚物混戰與大招連發，特效實作必須嚴格遵守效能原則：

1. **粒子數精準控制**：
   - 一般招式火花數量維持在 6 ~ 16 顆，大招控制在 24 ~ 40 顆以內。
   - 粒子生成必須由 `fx.budget(n)` 保護，確保高負載下自動降低發射量。
   - 粒子物件採用 free-list（`FX.takePart` / `FX.putPart`）池化回收，死亡粒子原地壓縮淘汰，避免每幀配置物件引發垃圾回收（GC）。
2. **避免每幀動態建立漸層**：
   Canvas 的 `ctx.createRadialGradient` 建立漸層極其昂貴，切勿在逐幀更新或粒子回圈中建立。
3. **光暈與裂痕的繪製快取**：
   繪圖端（`js/render/world.js`）的 `blitGlow` 為每個顏色只建立一個圓心在原點、半徑 64 的徑向漸層（`R.grad(ctx, 'fxglow:' + color)` 跨幀重用），繪製時以 `translate + scale` 填圓；
   實測在軟體光柵下，大半徑光暈用漸層填色比放大貼圖快 2~3 倍，且不會因半徑或倍率不同產生快取碎片。光暈半徑上限 `GLOW_MAX = 320`，避免整個畫面被加亮洗白。
   地面裂痕在生成時烘焙成離屏精靈（依繪製倍率分鍵），以 `R.drawSprite` 像素對齊 1:1 複製，避免每幀重新取樣。
4. **F3 效能面板觀察**：
   對戰中按 **F3** 可開啟效能面板，即時監控：
   - 幀時間（FPS、平均 ms、p95 ms）。
   - 繪圖時間（Draw ms）。
   - 場上物件數量：粒子（part）、召喚物（minion）、區域（zone）。
   - 快取命中率（Cache hit/miss）。
5. **大招連發壓力量測**：
   執行以下測試驗證極限負載效能：
   ```bash
   python3 test/perf_bench.py --scenarios ultspam
   ```
   該場景由熔岩巨像與腐沼母巢在沉重節奏下每 4 秒強制施放大招，檢驗極限粒子堆疊下的繪圖效能與幀率穩定性。

---

## 10. 驗證

執行 `npm run validate`（即 `node test/validate.js`）時，會對特效庫與 Boss 資料執行以下嚴格檢驗：

1. **Boss 動作的 `fx` 與 `fxEl` 參照檢查**：
   - 走訪所有 Boss 的技能與大招時間軸動作（含二階段 `actions2` 與巢狀 `hit`）。
   - 若為字串，必須已在 `BD.effects` 註冊。
   - 若為物件，必須具備合法的字串 `id` 且在 `BD.effects` 註冊；所有欄位鍵必須在 `FX_ALLOWED_KEYS` 內；若指定 `el` 必須在 `BD.elements` 註冊。
   - 動作中的 `fxEl` 必須在 `BD.elements` 註冊。
   - Boss 定義頂層 `def.fxEl` 與 `def.phase2.fxEl` 必須在 `BD.elements` 註冊。
2. **特效定義規格**：
   - 每個特效必須具備非空繁中名稱 `name`。
   - `category` 必須屬於 `BD.EFFECT_CATEGORIES` 10 大分類之一。
   - `desc` 必須為非空字串。
   - `spawn` 必須為可執行函式。
3. **元素主題規格**：
   - 每個元素必須具備 `name`、`core`、`glow`、`particle` 字串。
   - `extra` 必須為 `null` 或屬於已知的 9 種微粒行為之一。
4. **假想 World 全組合健全度測試**：
   - 引擎會自動以 **40 種特效 × 9 種元素** 在虛擬 World 上各執行一次 `BD.spawnFx`，並連續推進更新 30 幀，確認無任何執行期例外丟出。
5. **嚴禁遊戲與原生隨機數**：
   - 靜態掃描 `js/fx/*.js`，檔案內不得出現 `w.rng`、`.rng(` 或 `Math.random`，必須全數使用 `BD.vrng`。
6. **廢棄欄位清除**：
   - 靜態掃描 `js/engine/` 與 `js/data/`，確認完全無舊版廢棄之 `fxColor` 欄位。
7. **引擎字串常數呼叫檢查**：
   - 掃描 `js/engine/` 中所有以字串常數呼叫 `BD.spawnFx`、`K.hitFx` 或預設 `chargeFx` 的 id，確認皆已在特效庫完成註冊。
8. **巨型施放者負載測試**：
   - 以巨型單位（半徑 58、重擊 240 傷害、`heavyHit`）連續執行所有特效 3 次並推進更新 400 幀，確認場上粒子數絕不超過 `PART_CAP`（900），且所有 `fx.after` 延遲排程全數清空無殘留。
9. **`fx-gallery.html` 腳本一致性**：
   - 檢查 `fx-gallery.html` 所載入的 `<script>` 清單與順序，必須與 `index.html` 完全一致（排除 `input.js`、`main.js` 與圖鑑專屬的 `fx-gallery.js`）。新增 Boss 或特效檔案時兩處必須同步。

## 受擊血肉（gore）

角色被命中時，`World.damageBoss` 會自動播放 `gore`（js/fx/gore.js）：依角色資料的 `hurt` 材質噴出液滴與額外粒子，重擊追加二波與血霧，落地後留下永久痕跡（水面上改成暈開的霧）。材質：`flesh`（血，預設）、`magma`（熔渣火星）、`frost`（冰屑）、`ooze`（黏液氣泡）、`shadow`（暗影霧）、`straw`（乾草，訓練假人）。新增材質只要在 `BD.HURT` 加一筆。輕擊（15 傷害以上）另有 0.035 秒的實際播放頓挫；它只暫停播放、不改變模擬，因此不影響指紋。
