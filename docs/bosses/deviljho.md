# 恐暴龍（Deviljho）——《魔物獵人：世界》考據與招式設計

本文件整理 Boss「恐暴龍」的原作考據，並標明哪些是**原作（canon）**、哪些是為了 Boss 對決玩法做的**改編（adaptation）**。
名稱：官方繁中名「恐暴龍」＝ Deviljho（日文「恐暴竜」「イビルジョー」，別名「健啖的惡魔」「世界吞噬者」）；不要與「轟龍（Tigrex）」混淆。

## 1. 來源

| 代號 | 來源 | 用途 |
|---|---|---|
| [F1] | Monster Hunter Wiki（Fandom）「Deviljho」https://monsterhunter.fandom.com/wiki/Deviljho（內建瀏覽器讀取全文） | 外觀（體色、棘刺、顎、前肢、暴怒變化）、能力（顎力、擲物、龍屬性吐息）、習性（流浪、吃一切、同類相食）、各作遊戲內描述、一般筆記（吃尾巴、被動動作細節、岩塊屬性） |
| [F2] | 同站「Savage Deviljho」與「Deviljho Photo Gallery」（逐張檢視圖庫） | **造型依據**：MHW 渲染圖（深苔灰綠的粗皮、涎液拉絲、背尾棘刺、粉紅色爪、窄吻與巨顎）、MHW 遊戲截圖（暗紅的嘴與眼、棘刺、肌肉隆起）、MH3U 暴怒截圖（身軀鼓脹、背與肩泛起大片赤紅橘紅）、惶怒個體（龍屬性暗紅薄霧環繞頭部、尾刺血紅） |
| [F3] | Fextralife「Monster Hunter World Wiki：Deviljho」https://monsterhunterworld.wiki.fextralife.com/Deviljho | MHW 專屬：2018 年追加、龍屬性與龍封（Dragonblight）/ 防禦力 DOWN、弱點（雷、龍）、揮舞小型獸龍當武器並吃掉、對大型怪「咬一口」、岩塊依地形帶冰 / 火 / 水屬性、不出現在大師等級（由惶怒恐暴龍取代）、HP |
| [F4] | Gamer Guides「Monster Hunter 4 Ultimate：Deviljho」https://gamerguides.com/monster-hunter-4/guide/the-monsterdex/brute-wyverns/deviljho | **招式逐項描述**：Rock Fling、Quake Stomp、Jump Bite（壓制）、Forward Bite（涎液防禦 DOWN）、Tail Whip、360 Spin、Five-Step Charge、Hipcheck、Dragonbreath；顎可破壞兩次、尾巴可切斷且會被牠吃掉；疲勞時流涎 |
| [F5] | 游民星空「《怪物獵人世界》歷戰恐暴龍攻擊招式拆解」https://www.gamersky.com/handbook/201809/1103882.shtml | MHW 版招式：原地砸地（耐震可擋）、跳躍砸地（落地後長時間發呆）、鐵山靠、膽怯反擊（受傷後突然後退再反撲，暴怒時距離更長）、龍息、連環砸地、掃尾 |
| [F6] | Samurai Gamers「MHW: Iceborne – Deviljho Monster Guide」 | 弱點部位（頭、腹、尾）、龍息 → 龍封、暴怒第二階段（轉紅）的打法 |

> 注意：monsterhunterwiki.org 有 Cloudflare 機器人驗證，未嘗試繞過，因此沒有使用。官方 Capcom 資料與遊戲內影格未直接取得；招式時序、數值皆為遊戲內自訂。

## 2. 角色考據

### 2.1 外觀（本作造型依此繪製，見 `js/render/styles/deviljho.js`）
- **體型**：大型兽龍種（Brute Wyvern），雙足、身軀向前傾、後肢粗壯、**前肢細小幾乎不用**；體長約 18 m 以上 [F1]。
- **皮膚**：統一的深苔綠灰色（MHW 渲染圖偏暗、帶些許橄欖褐），粗厚的皮上有短而銳利的棘刺，**背與尾最高**、黃褐色 [F1][F2]。
- **頭**：窄吻 + 巨大的下顎，嘴裡好幾排參差的牙；眼睛小、位置在兩側（視力不佳，靠嗅覺）[F1][F2]；MHW 渲染圖的下顎不斷滴落黏稠的涎液 [F2]。
- **爪**：後腳三趾，爪呈粉褐色 [F2]。
- **暴怒**：背與肩的筋肉**鼓脹**（身驅明顯變大）、露出舊傷疤，皮膚大片泛起鮮紅 / 橘紅，眼睛赤紅，嘴邊開始噴出龍屬性的暗紅雷電 [F1][F2]。
- 遊戲俯視角：以橢圓身軀 + 脊背成排棘刺 + 彎曲的粗尾 + 左右兩條後腿 + 大頭與可張開的雙顎（左右兩片、內緣一排牙、中間露出紅色口腔）繪製；二階段換成赤褐皮膚、發亮的血脈與背脊、紅色眼睛、口中的龍屬性紅光（見 `torso()` / `head()`）。

### 2.2 習性與設定
- 稱號「健啖的惡魔」「世界吞噬者」，英文「Terrible Violent Wyvern / The Voracious Devil」[F1]。
- 無固定領地、四處流浪；新陳代謝極快，必須不停進食，**什麼都吃**（吃屍體、吃自己被砍斷的尾巴、同類相食），可把生態系吃到局部滅絕 [F1]。
- 在 MHW 中會把小型獸龍（Great Jagras、Kulu-Ya-Ku、Tobi-Kadachi、Odogaron…）叼起來當武器甩，血量低時摔死再吃；對太大叼不起的怪物則「咬一口」（約 500 傷害）[F3]。
- 涎液帶腐蝕性，會造成「防禦力 DOWN」；疲勞時喘氣、流涎特別多 [F1][F4]。
- 暴怒時龍屬性能量從口中溢出，吐息造成「龍封」（龍屬性異常，使武器屬性失效）[F1][F3]。
- 弱點：雷、龍屬性；頭（可破壞兩次）、腹部（最軟）；尾可切斷 [F3][F4]。

## 3. 招式對照

| 遊戲招式 | 原作 | 說明 |
|---|---|---|
| 被動「健啖」（技能 `heal` 參數） | canon + 改編 | 吃肉補充體力、什麼都吃 [F1][F3]。遊戲：啃咬 / 壓制 / 揮舞獵物的最後一擊命中就回復造成傷害的 40~60%（`heal`）；反制：別被咬到、或抓破綻打。 |
| 被動「腐蝕涎液」（命中帶 `vulnerable`） | canon + 改編 | 涎液 → 防禦力 DOWN [F1][F4]。遊戲：啃咬、撲咬、揮舞獵物命中施加 4 秒易傷（承受傷害 ×1.25）。 |
| 二階段「暴怒」（`phase2.status` = `jhorage`） | canon + 改編 | 筋肉膨脹、轉紅 [F1][F2]。遊戲：常駐狀態（承受傷害降低、造成傷害略增）、元素換成 `dragon`、新特效 `dragonrage`、造型膨脹泛紅。 |
| 前咬 `snap` | canon（Forward Bite）[F4] | 單發啃咬；二階段兩連。 |
| 撲咬壓制 `jump_bite` | canon（Jump Bite）[F4] | 衝撞後把人壓住連啃三口再重咬一口；翻滾脫離就能掙開。 |
| 甩尾旋身 `tail_spin` | canon（360 Spin）[F4] | 向前一撲整個身體轉一圈；二階段追加第二轉。 |
| 五連衝 `five_step` | canon（Five-Step Charge）[F4] | 四步小衝加一記重撞，暴怒時快得多。 |
| 鐵山靠 `hipcheck` | canon（Hipcheck）[F4][F5] | 側身撞；二階段留下龍炎地帶。 |
| 震地踩踏 `quake_stomp` | canon（Quake Stomp）[F4][F5] | 抬腿重踩、震波外推；二階段連踩兩次。 |
| 跳躍砸地 `jump_slam` | canon（跳躍砸地）[F5] | 躍起落在目標處；落地後收招極長（原作：落地後發呆好一陣子）。 |
| 掘石投擲 `rock_fling` | canon（Rock Fling）[F4] | 下顎插地、掀起岩塊拋向目標（lob 新種類 `rock`）。 |
| 膽怯反擊 `cower_rush` | canon [F5] | 先向後一跳、再長距離反撲；二階段留下龍炎。 |
| 揮舞獵物 `prey_swing` | canon（MHW）[F3] | 叼著小型獸龍當武器兩下甩擊、最後把牠吃掉（回血）；造型會畫出被叼著的獵物。 |
| 威嚇咆哮 `roar` | canon [F1] | 近距離會傷人（原作要高級耳栓）；遊戲：震開、緩速、自己狂暴。 |
| 腐蝕涎液 `drool_pool` | canon + 改編 | 吐出幾灘涎液留在場上（持續傷害 + 易傷）。 |
| 龍息 `dragon_breath`（二階段） | canon（Dragon Breath）[F1][F4] | 暴怒專屬、由右向左橫掃約 180 度、附帶龍封；躲腹下 / 尾旁最安全。遊戲：先顯示整片預警，七個扇形接力掃過；頭會跟著掃動。 |
| 連踏・龍爆 `stomp_blast`（二階段） | adaptation（來自 Frontier 的飢餓恐暴龍：連踩後地面炸開龍屬性能量）[F1] | 三連踏後的大範圍龍爆。 |
| 大招（一階段）「饕餮盛宴」 | canon + 改編 | 威嚇讓對手緩速 → 躍起壓上去重砸 → 連咬三口（回血）→ 甩出去。 |
| 大招（二階段）「龍息・滅世」 | canon + 改編（Savage Deviljho / Frontier 的 360 度龍息）[F1] | 全程無敵，龍息朝四面八方橫掃整整一圈（12 個扇形接力），最後炸開一圈龍爆。 |

## 4. 新增的程式內容
- 元素 `dragon`（龍屬性，暗紅 + 黑 + 龍雷電弧，`extra: 'crackle'`）。
- 特效 `devour` 咬碎（斬擊）、`dragonbreath` 龍息（區域）、`dragonrage` 暴怒膨脹（增益，`phase2.transFx`）。
- 狀態 `jhorage` 暴怒、`dragonblight` 龍封（造成傷害 ×0.85）。
- 命中參數 `heal`：施放者每次命中回復「造成傷害 × heal」的生命（`world.js` `damageBoss`）。
- 拋射物 `lob` 新種類 `rock`（灰褐岩塊，`BD.KIND_EL.rock = physical`）。
- 造型 `deviljho`（含 `hidden`：跳躍砸地滯空時只畫落點陰影；`transition`：換階段時發抖、泛紅、膨脹）。

## 5. 平衡
- 以 `node test/pace_stats.js` 調整：基礎 HP 2700、傷害約為初稿的 1.1 倍；輕快 48%、沉重 51%（對其餘 14 位非鏡像對手，鼬仍是壓倒性的 91~98%，非本次範圍）。
- 沉重節奏沒有個別覆寫（`js/data/pace.js` 的 `bosses` 不含 deviljho）。
