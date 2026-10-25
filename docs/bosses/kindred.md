# 鏡爪（Kindred）考據

《英雄聯盟》（League of Legends）的死亡化身「鏡爪・永恆獵手」。本文件記錄原作考據來源與設計對照，供調整招式、造型與特效時回頭查證。
名稱與招式名取自繁中官網（[鏡爪頁面](https://www.leagueoflegends.com/zh-tw/champions/kindred/)）：神羊（Lamb）、魔狼（Wolf）、鏡爪印記、舞動箭矢、魔狼狂熱、恐懼蔓延、神羊喘息。
（注意：繁中官網的「犽宿」是亞索 Yasuo，不是 Kindred。）

## 1. 原作要點

- **本質**：死亡的化身，「Separate, but never parted」——分立卻從不分離的兩半：羔羊（Lamb）與狼（Wolf）。起源不明，傳說中是一名因人們都避開他而孤獨的蒼白男子，把自己一分為二，「好讓自己永遠有一個朋友」。
- **羔羊（她 / she）**：蒼白、如羊的身影，持銀色神秘長弓，主導決策，對世人冷淡而有分寸；箭給的是「對接受命運的人，迅速而平和的解脫」。
- **狼（他 / he）**：巨大的靈狼，常只看見暗雲中的一排利齒；暴烈、永遠飢餓，追捕那些想逃離死亡的人，「用它有力的顎給予暴烈的終結」。
- **面具**：兩人的面具是互相顛倒的——羔羊戴著深色的狼面具，狼戴著白色的羊面具；眼窩發光。面具在墓穴中被發現，後來成為各地重演傳說時的道具。
- **各地的詮釋**：德瑪西亞敬重羔羊的真箭；諾克薩斯追求激烈的戰鬥以逃離狼；弗雷爾卓德以血灑戰場致敬狼的追獵；比爾吉沃特在大劫之後舉行慶典。
- **劇情**：Season 14 的《Still Here》中，崔斯特達曾被 Kindred 幾乎帶走，艾希介入才脫身；Ambessa（Chosen of the Wolf）是被狼選中的人。
- **皮膚主題**：Shadowfire（地獄火）、Spirit Blossom（靈花祭，羔羊化為孩子形「the Taker」）、Porcelain（瓷偶／農曆新年）、Woof and Lamb（貓狗大戰）、DRX（世界冠軍）、Chosen of the Wolf（諾克薩斯視角）、Pandemonium（惡魔，「一場永恆的飢餓」）。

## 2. 技能原作對照

| 原作（繁中官網名） | 原作機制（wiki 目前版本） | 本作對應 |
|---|---|---|
| 被動 鏡爪印記 | 標記獵物，完成狩獵後永久強化 | 狀態 `hunt`：「鏡爪印記・宣告」命中累積一層，每層 +6% 造成傷害（上限 5 層，不會消失） |
| Q 舞動箭矢 | 翻滾並射向附近最多三個敵人 | `arrows`：側向翻滾（翻滾中無敵，動作 `tumble`：滾向與魔狼分處獵物兩側的那一邊，形成交叉火網）＋三支微追蹤的箭；二階段兩輪 |
| W 魔狼狂熱 | 魔狼在範圍內撲咬，神羊離開範圍就結束 | `frenzy`：神羊在獵物腳下劃出獵場（持續傷害），魔狼從自己的位置連撲三口（二階段四口、每口重新瞄準）；撲完順勢滑過獵物再回身，連撲成為來回穿梭的 Z 字，神羊在後方補箭 |
| E 恐懼蔓延 | 前兩下緩速，第三下魔狼撲擊 | `dread`：兩支緩速箭 → 魔狼從牠所在的位置騰空躍向被緩速的獵物（不限距離，滯空隨距離拉長 0.18–0.38 秒） |
| R 神羊喘息 | 圈內單位生命不會低於下限，結束時回血 | **大招** `ult`：狀態 `respite`，4.5 秒內生命鎖在 10% 以上，到期仍活著回復 200（二階段 260）；只保護自己。同時施展原作最經典的 R + W 連招：魔狼在獵物腳下的獵場連撲四口（二階段五口） |
| （本作新增）雙生夾擊 | 取原作「分立，卻從不分離」 | `pincer`：神羊拉弓（0.42 秒）、魔狼在獵物另一側伏低，一箭一狼從兩側同時穿過獵物（狼衝過獵物再多 150）。狼的蓄勢以 `sync` 對齊箭的出手時間，沉重節奏拉長預警也不會錯開。躲法：看兩條預警的交點，往兩條線都不經過的方向走 |
| （本作新增）神羊躍步 | 取原作「神羊遠射、魔狼斷後」的分工 | `leap`：被貼身時神羊後躍放箭，魔狼丟下手邊的事撲向追上來的人 |
| （本作新增）魔狼撕咬 | 取 Pandemonium 皮膚「最後的饗宴」與魔狼的暴烈 | 二階段 `maw`：魔狼從牠所在的位置朝獵物直線衝殺 600 |
| （本作新增）樹影幢幢 | 取自原作故事〈樹影幢幢的森林〉：逃跑的扈從回頭只看見樹影，「四周的影子突然朝著他逼近而來」——那些都是魔狼高速移動留下的殘像 | 二階段 `shadows`：魔狼從所在位置螺旋切入、繞獵物狂奔一圈（半徑 210），每段留下一道朝圈心的殘影預警（7 道），跑完後殘影同時撲向圈心（只算一口，附易傷），本體同時穿過圈心衝出。躲法：圈合上前跑出圈外，或站在兩道殘影之間 |

數值（冷卻、傷害、範圍）以本作節奏重新設計，並未照搬 wiki 數字（不同版本數字互有出入）。

## 3. 設計決策

- **魔狼是獨立的戰鬥夥伴**（`js/engine/minions/kindred.js`，召喚物 `wolf`、trait `wolf`）：開場就在，有自己的生命（300，二階段重新凝聚為 380）。
  - 自主行動：平時沿著以獵物為圓心的弧線（走較短的一邊）繞到獵物「背對神羊」的一側包夾，到位後在背後左右游移；在獵物背後時撲咬的蓄勢較短（0.38 秒，正面 0.5 秒）；獵物逼近神羊（170 內）時改擋在兩人之間、撲咬冷卻轉得更快；獵物離神羊太遠（480 外，想逃）就加速追獵。逮到空檔（280 內、冷卻好）會自己撲咬一口。
  - 聽令：神羊的魔狼狂熱 / 恐懼蔓延 / 雙生夾擊 / 神羊躍步 / 魔狼撕咬 / 樹影幢幢 / 大招以 `do:'wolf'` 下令，排進魔狼的佇列（新的一招會取代上一招還沒輪到的下令，狼牙不會慢半拍），魔狼從「自己所在的位置」蓄勢（預警從狼身上拉出、跟著獵物轉，最後 0.15 秒鎖定）、撲出、咬下。躲的方向要看狼，不是看羊。
  - 可以被打散：生命歸零化為黑霧，9 秒（二階段 7 秒）後回到神羊身旁（原作：分立卻從不分離）。狼不在時神羊的下令落空——大招只剩聖域、樹影幢幢直接落空。
  - 平衡：狼與羊同時出手，總傷害與舊版相近，但狼的架勢傷害疊上神羊的會一直打崩對手架勢，因此狼的架勢傷害約為舊版一半；神羊生命 1900 → 1600。非鏡像勝率約 63%（舊版 62%）。v2 重製後（種子 1–3、雙方各坐一次）：沉重 58%、輕快 43%（重製前 52% / 44%）。
- **動作連貫（v2 重製）**：魔狼全程沒有瞬移——撲完保留三成衝勢滑行再減速、蓄勢時帶著餘速伏低、轉頭有轉速上限（巡行 7、蓄勢 14 rad/s）、遠距躍擊依距離拉長滯空；樹影幢幢從狼現在的位置螺旋切入圈上（舊版會直線瞬衝），跑完後穿過圈心衝出（舊版會瞬移回圈心）。繞行方向不再隨機翻轉，樹影幢幢順著狼原本繞行的方向跑。
- **沉重節奏連段**（`ai.combos`）：一階段 舞箭・恐懼、印記・狂熱、恐懼・夾擊；二階段 舞箭・恐懼、印記・狂熱、恐懼・撕咬（對手翻滾則改接夾擊）、狂熱・樹影。
- **魔狼的造型是一筆水墨**（`js/render/styles/kindred.js`）：沒有四肢，頭戴白色羊面具（兩側捲起羊角、S 形漩紋、細長的發光眼縫），頭後是一條長長的墨色身軀——
  身軀是跟著狼頭走的一條「繩」（18 節，存在 WeakMap，純視覺），停下時留在剛走過的路徑上緩緩起伏；邊緣是往後掃、左右交錯的鬃毛，身上是斷續的乾筆飛白，尾端散成數縷捲曲的墨絲。
  張口與騰空完全由魔狼的戰鬥狀態推得（蓄勢漸開、撲擊全開、躍擊離地）。參考原作概念圖中無四肢、墨線般的魔狼。
- **魔狼畫在沙塵之上**：沙漠等地圖的命中會揚起畫在 Boss 上方的沙塵，會把魔狼整個蓋掉。因此造型有 `over` 鉤子（`js/render/hud.js` 在空中特效之後呼叫），魔狼本體畫在 `over`、地面陰影畫在 `under`；召喚物造型 `wolf` 本身不畫東西。
- **面具顛倒**：神羊戴深色狼面具（眼窩冷藍）、魔狼戴白色羊面具，照原作設定；二階段不換面具，改為魔狼燃起鬼火、身形暴漲（取 Shadowfire 與 Pandemonium 的意象）。
- **神羊喘息**：用狀態的 `absorb` 把生命鎖在 10% 以上、`onRemove` 回血；`status` 動作新增可選的 `fx`（純演出）來播放聖域。
- **預警符印**：鏡爪印記與魔狼狂熱的獵場用 `setMark` + `anchor: 'mark'` 讓預警跟著目標走、鎖定後才落下，與天照的做法一致。

## 4. 圖片參考（32 張）

由 Riot Data Dragon CDN（版本 16.21.1）下載並逐張檢視：

- 立繪 `splash_{id}.jpg`：0 原版、1 Shadowfire、2 Super Galaxy、3 Spirit Blossom、12 Porcelain、22 Woof and Lamb、23 DRX、34 Chosen of the Wolf、45 Pandemonium（9 張）
- 載入畫面 `loading_{id}.jpg`（同上 9 款）
- 頭像 `tile_{id}.jpg`（同上 9 款）
- 技能圖示：`KindredQ.png`、`KindredW.png`、`KindredEWrapper.png`、`KindredR.png`、`Kindred_Passive.png`（5 張）

觀察重點：原版的羔羊與狼在陰影中，狼的眼睛為冷藍；Shadowfire 將狼改為火焰與紅眼；Chosen of the Wolf 偏冷色、狼身覆銀白。本作以深色長袍、銀色護襟、冷藍眼窩為一階段基調，二階段改為血紅與白色羊面具。

## 5. 網頁來源（實際讀取內容者 11 頁）

1. [Universe:Kindred（LoL Wiki）](https://wiki.leagueoflegends.com/en-us/Universe:Kindred)
2. [WR:Kindred（LoL Wiki 技能與數值）](https://wiki.leagueoflegends.com/en-us/WR:Kindred)
3. [Kindred/Skins（LoL Wiki 皮膚列表）](https://wiki.leagueoflegends.com/en-us/Kindred/Skins)
4. [英雄頁（leagueoflegends.com，en-us）](https://www.leagueoflegends.com/en-us/champions/kindred/)
5. [樹影幢幢的森林（Universe 繁中，原作短篇）](https://universe.leagueoflegends.com/zh_TW/story/kindred-color-story/)
6. [Champion Reveal: Kindred, the Eternal Hunters（Surrender at 20）](https://surrenderat20.net/2015/09/champion-reveal-kindred-eternal-hunters.html)
7. [Kindred guide（Dexerto）](https://www.dexerto.com/league-of-legends/lol-kindred-guide-best-builds-runes-tips-tricks-skins-1642026/)
8. [Kindred（TheSpike.gg）](https://www.thespike.gg/league-of-legends/champions/Kindred)
9. [What is Kindred（Fragster）](https://www.fragster.com/what-is-kindred/)
10. [Kindred League of Legends（ExitLag，葡萄牙文版）](https://www.exitlag.com/blog/pt/kindred-league-of-legends/)
11. [Kindred League of Legends（ExitLag，阿拉伯文版）](https://www.exitlag.com/blog/ar/kindred-league-of-legends/)

另有搜尋到但無法讀取的頁面（403 / 402 / 404）：dotesports、giantbomb、LoL Wiki「Lamb」、Fandom「Kindred」與「Lamb」、earlygame（德文）、「Lambs in the Orchard」。

## 6. 已知差異與限制

- 各來源對同一招的數字不一致（例如 E 的緩速幅度與 Q 的攻速加成），以 wiki 的 V6.2 版為準，本作數值另行設計。
- 原作的「不會瀕死」（R）與「狩獵層數加射程」（被動）沒有完整移植；前者以護盾近似，後者未做。
- 考據文字的繁中名稱（犽宿、千珏）以使用者指定為準。

## 7. 音效設計（SFX，`js/audio.js`）

鏡爪（神羊與魔狼）所有技能、投射物、狀態、轉場與魔狼夥伴狀態之音效補全（瀏覽器端 `BD.sfx`，取自 `audio/mc` 並整理至 `audio/mc_set`）：

- **二階段轉場（魔狼的饗宴）**：HP 50% 進入轉場，魔狼飢餓失控、身形暴漲並燃起鬼火；先響起魔狼低吼與靈能心跳湧現，隨後魔狼仰天長嚎（`wolfHowl`）、靈魂尖嘯（`sculkShriek`）、雙層血霧音爆震裂全場（`shockwave` + `slamHeavy` + `fire`）。
- **舞動箭矢（Q）**：神羊輕靈翻滾、拖出銀藍風痕破空（`lambdash` / `windBurst` + `dash`），落地星屑清響（`crystalResonate`）；銀弓新月連射三箭疾射劃空（`lambvolley` / `bowShoot` + `throwWhoosh` + `crystalResonate`）。二階段箭矢帶血色鬼火。
- **魔狼狂熱（W）**：神羊劃出獵場，魔狼鎖定低吼、虛空暗影波紋擴散（`wolfpounce` / `wolfGrowl` + `sculkPulse` + `click`）；魔狼連環撲咬上下獠牙猛合撕咬（`wolfbite` / `beastBite` + `fangSnap` + `slashHeavy`），神羊後方補箭符印破空（`lambshot` / `bowShoot` + `crystalResonate`）；最後一口撲殺震波轟鳴（`wolfmaw`）。
- **恐懼蔓延（E）**：前兩記銀箭帶冰冷緩速死寂侵襲（`lambshot` + `ice`），第三下魔狼凌空重撲、狂暴撕咬大地撕裂（`wolfmaw` / `wolfGrowl` + `beastBite` + `ghostSwoop` + `shockwave` + `slamHeavy`）。
- **雙生夾擊（本作新增）**：神羊銀弓拉滿極限弦音（`draw` + `bowShoot`）、魔狼對側伏身蓄勢低吼（`wolfGrowl`）；銀箭貫穿與魔狼狂暴直線衝殺雙向穿心（`wolfcharge` / `ghostSwoop` + `beastBite` + `shockwave` + `swordWhoosh`）。
- **鏡爪印記・宣告（被動）**：神聖銀色符印從天降臨旋轉清鳴（`lambmark` / `crystalResonate` + `sculkPulse` + `bell`）；爆開時靈魂光柱直沖天際、冷藍震環外擴（`lambmarkbloom` / `beaconBeam` + `shockwave` + `crystalResonate` + `slamHeavy`）；命中累積印記層數時響起靈魂昇華清鳴（`crystalResonate` + `buff`）。
- **神羊躍步（本作新增）**：神羊被貼身時後躍逃脫、白色絨光爆散破空（`lambleap` / `windBurst` + `ghostSwoop` + `crystalResonate`），空中放箭（`bowShoot`），魔狼同時撲向追擊者斷後撕咬（`wolfbite`）。
- **魔狼撕咬（二階段）**：魔狼直線狂暴衝殺撕裂空氣（`wolfcharge` / `ghostSwoop` + `beastBite` + `shockwave` + `swordWhoosh`），整條路徑被獠牙與爪痕撕裂。
- **樹影幢幢（二階段）**：神羊「開始狩獵吧」，魔狼仰天獵嚎（`wolfHowl`）、陰風呼嘯（`ambSnow`），螺旋繞圈留下殘影；跑完後殘影同時撲向圈心大合殺，本體呼嘯衝出（`ghostSwoop` + `beastBite` + `shockwave`）。
- **神羊喘息（大招 R）**：銀色聖域展開，天界光柱靈音降臨（`lambsanctum` / `beaconBeam` + `soulCharge` + `crystalResonate` + `ultCast`）；聖域期間符文每秒脈動低鳴，結束時聖域光芒斂入體內、生命回復（`buff` + `crystalResonate` + `bell`）；同時魔狼發起獵場連續狂暴撕咬。
- **魔狼夥伴狀態**：魔狼被打散潰散時傳出哀鳴與黑霧散落（`wolfDisperse` + `shadowTeleport`）；重聚時魔狼自黑霧重新凝聚低吼現身（`wolfGrowl` + `shadowTeleport`）。
