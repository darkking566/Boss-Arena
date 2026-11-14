# 飛龍桂雷爾（Flying Dragon Greyll）

《艾爾登法環》本篇選配 Boss。名稱「飛龍桂雷爾」是使用者提供的繁中寫法，沒有核對官方繁中版；英文名 Flying Dragon Greyll（有站點寫 Greyoll，指的是另一隻或同源名稱，見下）。

[33 張圖鑑](../research/greyll/gallery.html) · [逐圖索引](../research/greyll/IMAGE-INDEX.md) · [研究範圍與缺口](../research/greyll/RESEARCH-LOG.md)

## 1. 先講最重要的考據結論

- **桂雷爾與飛龍亞基爾是同一個模型、同一套招式**：Eldenpedia 的龍族頁寫「Greyll：similar to Agheel, but the bridge limits movement」，另一站寫外觀與能力相同；Fextralife 稱「更強的亞基爾，場地更窄」。所以本作的龍體直接借用亞基爾造型（[styles/greyll.js](../../js/render/styles/greyll.js) 以招式 id 對映），招式表沿用亞基爾 11 招並改成橋上的數值。**不是**另畫一條新龍，這點與原作一致，也是這次的取捨。
- 與亞基爾的差別（原作）：場地是窄橋（法魯姆大橋，龍巢高原）、HP 11,550（亞基爾 3,200）、掉落 80,000 盧恩與龍心。
- **Greyoll（母龍格雷爾）不是桂雷爾**：Elder Dragon Greyoll 是伏地不動的巨龍（約 88,000 HP，靠身邊 5–6 隻小龍連動血量，招式只有一聲吼），桂雷爾是另一個 Boss。龍族頁寫格雷爾是「所有龍的母親」，亞基爾、桂雷爾這類龍是她逃出猩紅腐敗後在龍巢築巢的後裔。

## 2. 原作資料（文字）

| 項目 | 內容 | 來源 |
|---|---|---|
| 位置 | 龍巢高原、「法魯姆大橋」降福點正南的橋上，Bestial Sanctum 南側；選配、可呼叫靈體、可多人 | Fextralife、SegmentNext |
| 血量 | 11,550（NG）；防禦 121、架勢 120、不可彈反；弱點頭部 +50%；弱 貫穿 / 龍屬性；睡眠與瘋狂免疫 | Fextralife |
| 招式（SegmentNext 六招） | 踏腳壓擊、翼拍衝跑、空中鎖定撲擊、尾擊、跳起噴息（火集中橋右側）、地面追蹤噴息（由左掃到右、起手不再轉向） | SegmentNext |
| 招式（Game8 補充） | 懸停噴息、橫掃噴息、飛行噴息（升空後沿橋噴）、咬擊、帶角橫掃衝撞、踏地 | Game8 |
| 招式（亞基爾完整表，同模型） | 低踏/高踏、突進重踏、橫掃龍息、追蹤龍息、折返跳、後躍滯空噴息、側翼掠襲、三拍俯衝、翼擊/翼掃、怒吼衝撞、尾鞭、回首咬、甩尾接頭擊、反向咬（共 16 招，見逐圖 gr-ref-039 的流程圖） | Fextralife Agheel 頁 |
| 掉落 | 80,000 盧恩、龍心（龍餐祈禱的貨幣） | Fextralife、wiki.gg |
| 氣氛 | 雨天、鉛灰天空、橋上石欄與枯樹、遠方黃金樹（見 gr-ref-014、016、017） | 截圖 |
| 母龍之嚎（物品） | 龍餐的極高階祈禱：變身為龍發出吼聲，降低附近敵人的攻擊 15%、防禦 10%（持續 60 秒），打倒 Elder Greyoll 後可換 | Fextralife Greyoll's Roar |

資料多是網頁摘要工具轉述，不是逐字讀原頁；各站只有招式說明、沒有統一的官方招式名，招式名是本專案的繁中命名。

## 3. 本作的招式（13 招 + 大招）

沿用亞基爾的時間軸結構（同模型、同招式表），數值換成橋上強度；新增三招（皆為改編）。

| # | 招式 | 原作對應 | 說明 |
|---|---|---|---|
| 1 | 撕咬・反向回咬 | 咬擊 / 反向咬 | 先咬一側、再反向回咬；二階段多一口帶火 |
| 2 | 踏地・突進重踏 | 踏腳壓擊 / 突進重踏 | 左右腳各踏一下，再突進重踏 |
| 3 | 翼擊・貼地翼掃 | 翼拍衝跑 / 翼掃 | 高舉拍地，再貼地橫掃 |
| 4 | 怒吼衝撞 | 帶角橫掃衝撞 | 怒吼、衝刺、頭角上挑 |
| 5 | 甩尾・回首角擊 | 尾擊 / 甩尾接頭擊 | 一整圈尾掃再回頭一撞 |
| 6 | 龍息・焚橋橫掃 | 橫掃噴息 | 長頸一揮燒過大扇形；沿途留火地 |
| 7 | 追蹤龍息 | 地面追蹤噴息 | 細長火柱慢慢追過去 |
| 8 | 三拍俯衝 | 俯衝 | 升空、振翼三下、砸地；二階段多一圈火環 |
| 9 | 後躍・滯空噴焰 | 後躍噴息 | 後躍浮空，對正下方噴火 |
| 10 | 側翼掠襲 | Strafe | 低空掠過並朝一側噴出整排火，留火徑 |
| 11 | **長橋龍息**（改編） | 飛行噴息（沿橋噴） | 升空、對準整條橋噴一道火牆，橋面一列火柱竄起 |
| 12 | **母龍之嚎**（二階段、改編） | 母龍之嚎祈禱 | 兩圈氣浪連續炸開，命中者背上「母龍威壓」，隨後火雨 |
| 13 | **灰燼風暴**（二階段、改編） | — | 火團從天砸落、中心一柱沖天 |
| 大招 | 一階段「母龍之嚎」／二階段「焚橋・灰母降臨」 | — | 一階段：威壓＋火雨＋三拍俯衝；二階段全程無敵，高空火雨、俯衝、旋身吐息一整圈、灰母之焰火環 |

## 4. 被動與狀態（改編）

- **母龍餘威**（trait `greyoll`）：落地行動時，每 15 秒（二階段 11 秒）腳下先亮預警圈，0.9 秒後一圈氣浪炸開，擊退並施加「母龍威壓」。對手太遠、升空或轉階段時不吼，訓練場重置歸零。
- **母龍威壓**（status `powershred`，新增）：造成傷害 ×0.85、承受傷害 ×1.1，刷新時間不疊層；取原作母龍之嚎的 −15% 攻擊／−10% 防禦，時間縮到 5–7 秒。
- **灰母血脈**（二階段，原作沒有）：半血換階段，龍息更寬、火地更大，撕咬改三連，解鎖母龍之嚎與灰燼風暴。

## 5. 外觀與演出

- 龍體：借用亞基爾造型（官方設定稿 gr-ref-001、遊戲截圖 gr-ref-008／016／017／020／040／041：灰黑羽鱗、後掠單長角、翼緣鋸齒如枯枝、長尾）。體型 sizeMul 1.85（亞基爾 1.6）。
- 桂雷爾專屬：腳下的鉛灰低雲霧環（`under`）、二階段背上飄起的灰燼火星（`over`）。
- 5 種專屬特效：`greyllroar` 母龍之嚎氣浪、`greyllbridge` 長橋火牆、`greyllash` 灰燼風暴、`greyllheart` 灰母血脈（換階段）、`greyllnova` 灰母之焰火環；其他沿用 `agheel*`。
- 官方概念圖：只有 Agheel 的官方設定稿（Creative Uncut 收錄）與 Lansseax／Adula 畫作；**沒有找到桂雷爾專屬的設計稿**（它沒有獨立設計），詳見 RESEARCH-LOG。

## 6. 強度

基礎 HP 2700、4 星；沉重節奏血量倍率由 1.5 微降到 1.38（`js/data/pace.js`）。對其餘 32 位 Boss（含另一個工作階段尚未提交的亞杜拉）每節奏 3–4 種子、交換藍紅：沉重 51%（256 場 ×2 次 51.2%／50.4%）、輕快約 56%（256 場 55.9%）。同一腳本量亞基爾沉重 51.0%。數字是本機模擬，不是原作強度。

## 7. 沒做到的事

- 沒有為桂雷爾畫新龍（原作同模型，不是缺漏）；顏色也沒有與亞基爾拉開（只靠體型、霧環與二階段火星區分），若要更鮮明，下一步可為 `agheel` 造型加調色參數。
- 完整動作分析沒有做：11 張招式 GIF 只看第一格，招式時序是依文字描述與亞基爾既有時間軸改寫。
- 「母龍之嚎」只取祈禱的效果，沒有做變身成龍的演出。

## 8. 音效配置（SFX）

桂雷爾作為法魯姆大橋的灰母之裔，音效圍繞「巨龍喉音、長橋烈焰、灰母咆哮、風暴砸地」四層聽覺意象，由 `js/audio.js` 在瀏覽器端（`data-browser`）渲染：

| 觸發時機 / 招式 | 聽覺表現與設計考量 | 對應音效分組與 MC 音檔來源 |
|---|---|---|
| **撕咬・反向回咬** (`bite`) | 起手喉音低吼與振翅，命中巨顎咬合；二階段第 3 口附帶爆裂火息 | `dragonRoarShort` + `dragonFlap`；命中 `dragonBite` + `fangSnap`；二階附帶 `dragonFlameShort` + `fire` |
| **踏地・突進重踏** (`stomp`) | 前兩踏爪踏石橋，第 3 踏暴烈衝撞重砸引發衝擊震地 | 前踏 `dragonStomp` + `tuffBreak`；突進重踏 `dragonStomp` + `wardenImpact` + `earthCrack` + `heavySmash` |
| **翼擊・貼地翼掃** (`wing_slam`) | 展翼拍擊揚起狂風，貼地橫掃割裂空氣 | 起手 `dragonFlap` + `heavyWhoosh`；拍地 `slamHeavy`；橫掃 `windSpin` + `metalWhoosh` |
| **怒吼衝撞** (`charge`) | 昂首怒吼狂奔刨橋，收尾雙角猛烈挑擊 | 起手 `dragonRoarShort` + `golemBellow` + `dragonStomp`；收尾 `hitHeavy` + `wardenImpact` |
| **甩尾・回首角擊** (`tail_gore`) | 壓低身軀一整圈大旋尾，回頭角撞沉重衝擊 | `heavyWhoosh` + `dragonFlap` + `windSpin` + `metalWhoosh` + `wardenImpact` |
| **龍息・焚橋橫掃** (`sweeping_breath`) | 長頸後縮吸氣聚火，扇形吐息焚燒石橋 | 起手 `windCharge` + `fireballWhoosh` + `dragonRoarShort`；噴射 `dragonFlameLong` + `fire` |
| **追蹤龍息** (`tracking_breath`) | 喉腔凝神聚束吸氣，高壓追蹤火柱噴射 | `windCharge` + `fireballWhoosh` + `dragonFlameShort` + `fire` |
| **三拍俯衝** (`dive_bomb`) | 振翼拔地騰空、空中經典三拍展翅、極速砸地爆炎 | 升空 `breezeJump` + `dragonFlap`；空中 3 拍 `dragonFlap`；砸地 `slamHeavy` + `wardenImpact` + `earthCrack` + `explodeBig` + `fire` |
| **後躍・滯空噴焰** (`retreat_flame`) | 拍翼後跳拉開身位，對地面潑灑火雨 | `dragonFlap` + `heavyWhoosh` + `dash` + `fireballLaunch` + `fireballImpact` + `fire` |
| **側翼掠襲** (`strafe`) | 低空振翅疾掠橋面，一側連續火浪掃射 | `dragonFlap` + `heavyWhoosh` + `fireballWhoosh` + `dragonFlameShort` + `fire` |
| **長橋龍息** (`bridge_inferno`) | 昂首長嘯宣告，沿橋貫穿火牆，橋面地刺火柱連鎖噴發 | `dragonRoarLong` + `golemBellow` + `dragonFlameLong` + `campfire`（焦灼餘燼）+ `fireballImpact` + `earthCrack` |
| **母龍之嚎** (`greyoll_roar`) | 心跳預警、原初母龍雙層氣浪轟鳴（神威詛咒），隨後天降灰燼火雨 | `heartbeat` + `trialOmen` + `dragonRoarLong` + `dragonRoarBeastly` + `omenCurse` + `dripstoneLand` |
| **灰燼風暴** (`ash_storm`) | 灰燼黑雲風暴呼嘯，火球天降轟炸，中心沖天火柱 | `windWhirl` + `heavyWhoosh` + `fireballImpact` + `dripstoneLand` + `explodeBig` + `earthCrack` |
| **大招** (`ult`) | 一階段母龍威壓俯衝；二階段全程無敵：火雨、俯衝、360度旋身噴息、終焉火環「灰母之焰」 | 起手 `ultCast` + `dragonRoarLong` + `dragonRoarBeastly`；終焉 `explodeBig` + `dragonFlameLong` + `shockwave` + `earthCrack` |
| **被動「母龍餘威」** (`greyoll`) | 每 15 秒（二階 11 秒）低沉惡兆預警，隨後氣浪炸開 | 預警 `trialOmen`；氣浪 `greyllroar`（`dragonRoarLong` + `dragonRoarBeastly` + `omenCurse`） |
| **換階段「灰母血脈」** (`greyllheart`) | 胸口黑紅暗流聚氣心跳，1.7 秒狂暴長吼震碎石橋 | 前奏 `heartbeat` + `soulCharge` + `trialOmen`；長吼 `dragonRoarLong` + `dragonRoarBeastly` + `shockwave` + `earthCrack` |
| **受擊反饋** (`impact`) | 承受單次大於等於 75 點重擊傷害時，觸發龍族悲鳴與重肉碎響 | `dragonHurt` (`ender_dragon_hurt1..3`) + `hitBeast` (`ravager_hurt1..3`) |
| **死亡演出** (Death) | 血量歸零崩解，觸發終界龍經典爆裂巨響與石碎烈焰 | `dragonDeath` (`ender_dragon_death`) + `dragonRoarBeastly` + `earthCrack` + `explodeBig` |
| **橋面行走** (Stride) | 於橋面上邁步前移時，龍爪發出沉重石地踏步聲 | `dragonStomp`（間隔 stride 70px，音量 0.4） |
