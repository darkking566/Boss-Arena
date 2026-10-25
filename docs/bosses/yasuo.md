# 犽宿（Yasuo）——《英雄聯盟》考據與招式設計

本文件整理 Boss「犽宿」的原作考據，並標明哪些是**原作（canon）**、哪些是為了 Boss 對決玩法做的**改編（adaptation）**。
名稱一律採台服官方譯名（ddragon zh_TW）；數值不照搬英雄聯盟（等級 / 裝備 / 冷卻縮減不存在），只保留每招的機制與手感。

## 1. 來源

| 代號 | 來源 | 用途 |
|---|---|---|
| [U1] | Universe 官方背景 `universe-meeps.leagueoflegends.com/v1/{en_us,zh_tw}/champions/yasuo/index.json` | 身分、弒師冤罪、與兄長犽凝的故事 |
| [D1] | Data Dragon zh_TW 英雄資料 `ddragon.leagueoflegends.com/cdn/<版本>/data/zh_TW/champion/Yasuo.json` | 台服技能名、技能敘述、名言 |
| [W1] | League of Legends Wiki「Yasuo」 https://wiki.leagueoflegends.com/en-us/Yasuo | 技能數值（Q 範圍 / 旋風擊飛時間、W 寬度與持續、E 距離與疊層、R 範圍與滯空延長） |
| [W2] | 同上「Yasuo/Audio」 | 招式語音（Hasagi!、Sorye ge ton! 等） |
| [W3] | 同上「Yasuo/Cosmetics」 | 造型原畫、模型圖、遊戲內截圖 |
| [W4] | 同上「Yasuo (Legends of Runeterra)」 | 符文大地卡牌版的招式詮釋 |
| [M1] | 萌娘百科「亚索」 https://zh.moegirl.org.cn/亚索 | 大陸譯名、酒葫蘆在殺死犽凝之後才出現、「死亡如風，常伴吾身」 |
| [B1] | Bilibili 英雄聯盟 Wiki「亚索」 https://wiki.biligame.com/lol/亚索 | 技能細節交叉比對 |
| [S1] | Surrender at 20（2013 年犽宿公開） https://www.surrenderat20.net | 初版技能描述與設計意圖 |
| [O1] | OP.GG 2XKO「Yasuo」 https://op.gg/2xko/champions/yasuo | 格鬥遊戲 2XKO 的招式表（斷風、颶風破、乘風而起…） |
| [O2] | Dashfight 2XKO 犽宿招式頁 https://dashfight.com | 2XKO 招式框架交叉比對 |
| [A1] | ArtStation（Hicham Habchi 2XKO / Project L 概念設計、Ina Wong 水墨影造型、Uriah Voth 原畫、Sixmorevodka、Chengwei Pan） | 外觀、俯視剪影參考 |
| [F1] | League of Legends Fandom 概念原畫（經由 API 取圖） | 早期概念設計、High Noon 模型三視圖（含俯視） |
| [C1] | CommunityDragon `raw.communitydragon.org` 遊戲內粒子貼圖 | 特效配色（Q 青白鏡頭光、旋風白藍渦流、R 青綠圓環、暴擊紅新月） |

## 2. 參考圖片（約 95 張）

| 類別 | 數量 | 代表來源 |
|---|---|---|
| 造型原畫（splash） | 21 | `ddragon.leagueoflegends.com/cdn/img/champion/splash/Yasuo_{0,1,2,3,9,10,17,18,35,36,45,54,55,56,57,68,77,87,88,97}.jpg`（基本造型另看大圖） |
| 遊戲內模型圖 | 3 | `wiki.leagueoflegends.com/en-us/images/Yasuo_{Odyssey,HighNoon,Nightbringer}_(Base).png` 等 |
| 遊戲內截圖（俯視角） | 4 | `Yasuo_Screenshots.jpg`、`Yasuo_HighNoon_Screenshots.jpg`、`Yasuo_SeaDog_Screenshots.jpg`、`Yasuo_PROJECT-Screenshot.jpg` |
| 技能圖示 | 5 | ddragon `img/passive`、`img/spell`（被動、Q、W、E、R） |
| Universe 官方插畫 | 約 11 | `cmsassets.rgpub.io/sanity/images/dsfx7636/universe/…` |
| ArtStation 概念與原畫 | 約 20 | Hicham Habchi `project-l-concepts-yasuo-1~5`、Ina Wong `inkshadow-yasuo`、Uriah Voth `yasuo-splash` / `yasuo-sketches`、Chengwei Pan、Sixmorevodka |
| Fandom 概念原畫 | 12 | `Yasuo_HighNoon_Concept_01.jpg`（含俯視三視圖）、早期概念、Armored 渲染 |
| 遊戲內特效貼圖 | 20 | CommunityDragon `game/assets/characters/yasuo/skins/base/particles/` |

## 3. 角色考據

- **身分**：愛歐尼亞的劍客、長老蘇馬（Souma）的弟子。被誣陷殺害長老而遭放逐，逃亡途中與追殺他的兄長犽凝（Yone）決鬥並殺死了他；後來得知真凶是銳空（Riven），並曾指導塔莉雅（Taliyah）[U1][M1]。
- **外貌**（造型依此繪製，俯視角取最能辨識的剪影）：
  - 高束髮髻甩出一大片深棕色馬尾（俯視時最大的剪影特徵）[A1][F1]。
  - 藍色圍巾，左肩是層疊的鋼刃肩甲。
  - 古銅色裸胸、藍色臂纏、橘褐粗麻繩腰帶、深藍袴。
  - 紅柄長太刀：雲紋鋼護手、橘色繩穗，刀刃朝上佩帶。左腰是有白色漩渦紋的藍刀鞘，右腰掛綠色酒葫蘆 [W3][A1]。
- **小動作**：嘲諷時喝一口酒、往刀上一噴；會吹尺八 [W3][M1]。二階段轉換演出取自「喝酒噴劍」。
- **台詞**：二階段換階台詞用台服名言「死亡就像一陣風，永遠伴隨著我。」[D1]（大陸譯「死亡如風，常伴吾身」[M1]）。

## 4. 招式對照

| 遊戲招式 | 原作 | 說明 |
|---|---|---|
| 被動「浪人之道」 | canon | 走動累積劍意（每移動 1px 約 +0.06），滿了之後受到直接攻擊時化為 1 秒護盾（最大生命 9%，二階段 12%）[D1][W1]。原作的「暴擊率加倍」改寫在劍擊：一階段 25%、二階段 40% 機率追加 75% 傷害，跳「暴擊！」。 |
| Q「鋼鐵暴雪」 | canon | 前刺（長 250、寬 46）。命中疊一層「天寒地凍」（6 秒，最多 2 層）[D1]。 |
| Q3「鋼鐵暴雪・旋風」 | canon | 天寒地凍 2 層才能放（手動施放也受限，`needStorm`）：捲出貫穿的旋風，命中的對手「滯空」1 秒（二階段 1.15 秒）[W1]。 |
| W「風牆」 | canon | 朝面向立起一道風牆 4 秒，先往前飄再停住，擋下所有敵方投射物 [D1]。AI 只在敵方投射物將命中前才施放（tag `windwall`，不進一般選招）。改編：自己的旋風穿過風牆會變大變強一次（取自 2XKO「Q 打中風牆化為長距風刃」[O1]）。 |
| E「刃敵千軍」 | canon | 穿身突進（無敵幀），每次突進疊一層「乘風」（每層 +4% 造成的傷害，最多 4 層）——對應原作 E 連續使用傷害提升 [W1]。AI 也會用它穿過對手的招（`escDodge`）。 |
| E→Q「刃敵千軍・環斬」 | canon | 原作 E 途中按 Q 變成環形斬 [D1]。二階段環斬也會把人捲上天。 |
| E→Q3「刃敵千軍・旋風環斬」 | canon | 天寒地凍兩層時的環斬（`needStorm`，一般環斬此時改為 `noStorm`）：用掉層數，把周圍的人捲上天（滯空 0.85 秒，二階段 1 秒），對應原作 E 途中放 Q3 [D1]。兩階段都有。 |
| 劍擊 | canon（普攻） | 左右兩記橫斬，可能暴擊。 |
| 納刀・斷風 | 改編（2XKO） | 收刀入鞘凝風，拔刀斬出長距風刃 [O1]。二階段一次三道。 |
| 颶風破（二階段） | 改編（2XKO 超必殺 Storm Breaker） | 突進撞上 → 瞬步到身後斬 → 閃到側面 → 交叉收尾斬 [O1]。 |
| 乘風而起（二階段） | 改編（2XKO Rise With the Wind） | 在對手腳下捲起巨大龍捲風，滯空 1.3 秒，接著 AI 就會放奪命氣息 [O1]。 |
| R「奪命氣息」 | canon | 瞬移到滯空的對手身邊（自身無敵）、延長滯空並連斬 6 刀（二階段 9 刀），最後一記落地重斬；結束時劍意充滿、重置天寒地凍 [D1][W1]。AI 在對手滯空時施放（滯空屬於 `cc`，AI 視為破綻）；`ai.airUlt`：對手一滯空就立刻放，收招中也會取消收招接上（原作 R 可在 Q3 飛行中施放）。`ai.ultRand`（犽宿 0.01，預設 0.05）壓低沒破綻也放大招的機率，大招滿時 `ai.ultSetup` 讓選招偏好會捲人的招。改編：對手沒在滯空時先捲出一道大旋風，0.7 秒內捲中才發動，否則收刀。 |

## 5. 機制實作

- 動作與特性在 `js/engine/actions/wind.js`：
  - `windwall`：風牆存在 `w.walls`。
  - `gather`：消耗天寒地凍。
  - `lastbreath`：奪命氣息。
  - 特性 `wanderer`：浪人之道、天寒地凍累積、暴擊。
- 風牆碰撞在 `js/engine/entities/projectile.js` 呼叫 `BD.wallBlocks`。
- 狀態在 `js/engine/statuses/effects.js`：`gatherstorm`（天寒地凍）、`airborne`（滯空，同暈眩綁定 `stun` 狀態，標 `cc`）、`ridewind`（乘風）。
- 技能欄位（純資料，`js/data/bosses/yasuo.js`）：
  - `needStorm`：要有天寒地凍 2 層，手動施放也受限。
  - `noStorm`：2 層時 AI 不放一般 Q、改放旋風。
  - 判斷寫在 `Boss.shadowOk`（`js/engine/boss.js`），跟劫的影子條件放在一起。
- AI 設定：`ai.windWall`（投射物將命中前立風牆的機率；風牆朝來襲的投射物立起，3v3 時不一定是目標的方向）、`airUlt` / `ultRand` / `ultSetup`（滯空接大招、存大招）、`escDodge` / `escKite`（用刃敵千軍穿招與拉扯），見 `js/engine/ai.js`。
- 新元素 `wind`（風）：白芯、淡藍外光、深藍描邊。

## 6. 逐招動畫

- 造型檔 `js/render/styles/yasuo.js`，純繪圖（不碰戰鬥），沿用菲歐拉的關鍵值姿態混合（蓄力 → 擊 → 收，連段不跳格）。
- 每個出手動作依種類與所屬技能取一組專屬姿態（`pick`），驅動持刀手、刀身角度、軀幹扭轉、前衝、蹲伏、刀光、納刀、馬尾與左手（前伸引導 / 推掌 / 按鞘）；刀身大幅揮動時沿刀尖畫一道刀光弧。
- 身體底下的蓄力光與收勢（`windup` / `snapfx`）也依技能分開畫。
- 地面層 `under()` 畫三樣東西：風牆（流動的風絲加兩端小渦流）、腳下的劍意環（滿了會發白光），以及兩顆天寒地凍小旋風點。
- 旋風與斷風的投射物外觀用 `R.projStyles`（`js/render/world.js` 的 `drawProjectiles` 會查這張表）。
- 滯空的單位（任何 Boss）身體會離地浮起、腳下繞一圈旋風；犽宿施放奪命氣息時同樣騰空。

下表「招式動畫」是造型檔畫的人物動作與腳下光效，「特效」是 `js/fx/yasuo.js` 原本就有的命中特效。

| 技能 | 招式動畫 | 特效 |
|---|---|---|
| 劍擊 | 第一刀由右後往左前反手橫斬、第二刀踏步正手斬回；扇形弧光隨刀掃過，第二刀前方多三道風切線 | 一般斬擊 |
| 鋼鐵暴雪 | 左手前指、刀後拉到腰側，風切線往刺擊線匯聚 → 直刺，光軌兩側扭轉的風絲、劍尖星芒 | 前方青白鏡頭光、中段星芒、兩側風絲 |
| 鋼鐵暴雪・旋風 | 刀甩到背後、腳下風絲繞轉、刀尖聚成小渦流、楓葉被吸進來 → 大揮，刀光弧、風壓環、放射風線與迸散的楓葉 | 渦流與四芒星炸開；飛行中的旋風是旋轉的白藍渦流，繞著紅楓葉 |
| 刃敵千軍 | 低身、刀拖在身後，腳下塵環收束 → 穿身突進，身後風痕、沿路殘影、終點橫向刀弧 | 三道風痕與殘影 |
| 刃敵千軍・環斬 | 突進後虛線環依蓄力畫滿 → 整圈迴旋斬（收刀沿同方向轉回），雙刀環、震環、楓葉迸散 | 兩圈重疊刀環、青色震波、落葉 |
| 刃敵千軍・旋風環斬 | 同環斬但壓得更低、轉得更狠，蓄力時外圈三道風弧繞轉 → 斬出後三道風弧向外旋開 | 同環斬 |
| 風牆 | 虛線風環收束、左掌凝風 → 橫刀掃過、左掌推出，前方風壓弧 | 風牆升起時沿牆閃白光 |
| 納刀・斷風 | 刀收進鞘、左手按鞘、鞘口凝光，前方浮出細白線（二階段三道） → 拔刀，每道風刃一條長白刀光、身前拔刀弧 | 身後逆風 |
| 颶風破 | 突進斬（刀尖凝光）→ 風步蹲身藏刀 → 回身反手斬 → 風步 → 高舉、兩條斜線伸長預告 → 交叉斬落，X 形刀光、星芒與震環 | 風步殘影、交叉兩斬星芒 |
| 乘風而起 | 刀由低往前撩、左手指向目標，三道風絲從身前流向目標腳下、那裡的漩渦越轉越大 → 刀弧撩起、目標腳下風柱收尾 | 巨大龍捲（六層渦流、白光柱、碎石與楓葉） |
| 奪命氣息 | 落位蹲身按鞘 → 依連斬節拍每 0.12 秒一刀左右換向（每刀一道刀光弧）→ 高舉 → 落地一斬 → 收刀入鞘、鞘口一閃，按鞘片刻才回待機；對手沒在滯空時則是大揮捲出旋風 | 畫面變暗、青綠星芒瞬移、殘影輪流斬過、巨型刀光與震波 |
| 二階段 | 劍身常駐青白風光、身邊繞兩條風帶 | 喝酒噴劍 → 以身為圓心捲起龍捲風 |

## 7. 平衡

調整後（各 6 個種子、雙方互換位置，對其他 19 位 Boss）：輕快節奏勝率約 53%，沉重節奏約 35–45%（不同參數下波動較大）。

滯空接大招改版（各 3 個種子、互換位置，114 場）：對手滯空且大招已滿時接上奪命氣息，沉重 5/40 → 55/62、輕快 58/78 → 101/107；大招在對手滯空時放出的比例，沉重 2% → 25%、輕快 23% → 46%。勝率沉重 33% → 32%（不變），輕快 54% → 62%。
加入犽宿不改變既有任何配對的行為：舊配對指紋逐幀一致，只把犽宿的新配對加進基準。
