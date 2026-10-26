# 大樹守衛（Tree Sentinel）——《艾爾登法環》考據與招式設計

本文件整理 Boss「大樹守衛」的原作考據，並標明哪些是**原作（canon）**、哪些是為了 Boss 對決玩法做的**改編（adaptation）**。
名稱採繁中版官方譯名（大樹守衛、黃金戟、黃金樹大盾、黃金的返報、黃金誓言）；數值不照搬原作（原作有等級與裝備），只保留每招的動作、節奏與手感。

## 1. 來源

| 代號 | 來源 | 用途 |
|---|---|---|
| [F1] | Fextralife「Tree Sentinel」 https://eldenring.wiki.fextralife.com/Tree+Sentinel | 招式表、HP 2,889、弱點、掉落、各地點變體 |
| [F2] | Fextralife「Erdtree Greatshield」 | 大盾外觀與戰技「黃金的返報」 |
| [F3] | Fextralife「Golden Halberd」 | 黃金戟（聖屬性）、戰技「黃金誓言」 |
| [F4] | Fextralife「Tree Sentinel Set」 | 盔甲外觀、羽飾、披風 |
| [F5] | Fextralife「Sentry's Torch」 | 火把守衛變體（火把能照出隱身的刺客） |
| [F6] | Fextralife「Golden Retaliation」「Golden Vow」 | 兩個戰技的文字敘述與動畫 GIF |
| [W1] | eldenring.wiki.gg「Tree Sentinel」 | 招式表交叉比對、漫畫格、二階段招式 |
| [W2] | eldenring.wiki.gg「Draconic Tree Sentinel」 | 龍化變體（雷屬性、龍爪盾） |
| [W3] | eldenring.wiki.gg「Spectral Steed Regalia」 | 黃金樹幽影 DLC 骨灰的宣傳圖 |
| [W4] | eldenring.wiki.gg「Erdtree Greatshield」 | 大盾正面紋樣（黃金樹根） |
| [A1] | 《ELDEN RING 官方設定集》（Artbook）經 wiki.gg 收錄 | **設定稿兩張**：人馬全身、盔甲與盾的細節 |
| [G1] | GamerGuides 攻略 | 戰鬥截圖、騎槍衝鋒與重攻擊時機 |
| [G2] | eip.gg 攻略（單人、雙守衛） | 招式 GIF、雙守衛位置 |
| [G3] | GGRecon 攻略 | 戰鬥截圖 |
| [G4] | 3DMGAME 攻略 | 中文招式描述、截圖 |
| [G5] | Inverse 報導 | 「第一個勸退玩家的 Boss」背景 |
| [P1] | Famitsu（Prime 1 Studio 雕像） | 六張雕像實拍：馬鎧、羽葉裙甲、戟與盾的立體細節 |
| [S1] | 搜尋結果摘要（game8、gamewith、toy-people、gcores） | 中日文招式名稱、與《隻狼》鬼庭刑部的比較 |

Fandom 回應 402 被擋、Bilibili Wiki 回應 404，兩者沒有取用。

## 2. 參考圖片（59 張）

| 類別 | 數量 | 代表檔名 |
|---|---|---|
| **官方設定稿** | 2 | `wgg_ER_Artbook.Tree_Sentinel_1.jpg`、`wgg_ER_Artbook.Tree_Sentinel_2.jpg` |
| 官方漫畫格 | 3 | `wgg_ER_Manga.Tree_Sentinel_{1,2,3}` |
| 遊戲截圖（寧姆格福、雙守衛、大盾、火把、DLC） | 6 | `wgg_ER_Tree_Sentinel_{Limgrave,Duo,w_Greatshield,w_Torch}`、`wgg_ER_Boss_Tree_Sentinel_(SoTE).png` |
| 龍化變體 | 5 | `wgg_ER_Draconic_Tree_Sentinel*.png`、龍爪盾與畸形龍盔圖示 |
| DLC 骨灰宣傳 | 2 | `wgg_Spectral_Steed_Regalia_Tree_Sentinel*` |
| 武器、盔甲、戰技 | 10 | `fx_Erdtree_greatshield…`、`fx_Golden_halberd…`、`fx_Golden_retaliation_gif…`、`fx_Skill-golden-vow…` |
| 招式表與戰鬥圖 | 9 | `fx_Tree-sentinel-shield-combo-chart.png`、`fx_Tree-sentinel-torch-combo-chart.png`、`fx_Tree-sentinel-*` |
| Prime 1 雕像實拍 | 6 | `fami_statue_{1..6}.jpg` |
| 攻略截圖與 GIF | 16 | `gg_*`、`ggr_*`、`eip_*`、`3dm_*`、`inverse.jpg` |

圖片只作為繪製參考，沒有放進專案。

## 3. 角色考據

- **身分**：侍奉黃金樹的重騎士團，被稱為「黃金樹的活壁壘」。最有名的一位在寧姆格福「第一步」賜福外的道路上巡邏，是許多玩家遇到的第一個強敵 [F1][G5]。亞壇高原與寧姆格福有雙守衛，另有拿火把的守衛與龍化變體 [F1][W2]。
- **外貌**（造型依此繪製，俯視角取最能辨識的剪影）[A1][P1]：
  - 戰馬披黃金馬鎧，下方是一圈紫黑色的羽葉裙甲；馬頭是鍍金面甲，有角飾與帶孔的眼罩，四腿紅褐色。
  - 騎士穿鍍金胸甲與頭盔，頭頂一大把乾草色羽飾，背後是赭黃色披風，上面有白色黃金樹紋。
  - 右手黃金戟，左手圓形的黃金樹大盾，盾面刻著放射狀的樹根與中央圓章。
- **弱點**：怕雷、不能被處決（暴擊無效）[F1]。
- **招式風格**：一般認為動作模組沿用《隻狼》的鬼庭刑部 [S1]——騎在馬上大開大合、人立、衝鋒。
- **原作二階段**：HP 60% 換階段，新增盾擊、大盾碾壓、轉身 180° 的側揮 [F1][W1]。

## 4. 招式對照

| 遊戲招式 | 原作 | 說明 |
|---|---|---|
| 被動「黃金樹大盾」 | 改編 | 從盾側（左前方，面向 −20° 到 −137°）打來的直接攻擊，傷害與架勢傷害各減 30%，盾上跳金光與「盾擋」。持續傷害、無法格擋的攻擊不算。 |
| 側揮連斬 | canon（Side Swing） | 往右側左右來回兩記橫掃；二階段三記。 |
| 人立突刺 | canon（Rearing Stab） | 長距直刺（長 340，二階段 380）。連段裡有機率停頓再刺，對應原作人立後的停頓騙翻滾。 |
| 人立重砸 | canon（Rearing Slam） | 前方砸地加一圈外環震波。 |
| 馬蹄踐踏 | canon（Hoof Attack） | 原作唯一用馬蹄造成傷害的招，把貼身的人踏飛。 |
| 側身衝撞 | canon（Horse Bash） | 戰馬往右甩身撞人，出手快。 |
| 騎兵衝鋒 | canon（Charging Attack） | 遠距直衝，擦身後順勢揮戟。 |
| 躍馬斬 | canon（Leap Attack） | 中距離縱馬一躍，落地揮戟。 |
| 迴旋大掃 | canon（Twirling Swing） | 250° 的大弧（二階段 270°），連段裡專抓翻滾後退的人。 |
| 黃金誓言 | canon（黃金戟戰技） | 震開周圍，自身 10 秒造成傷害 ×1.1、受到傷害 ×0.9（狀態圖示「誓」）。二階段換階演出也是這招。 |
| 黃金的返報 | canon（黃金樹大盾戰技） | AI 只在敵方投射物將命中前舉盾（`windwall` 標籤）。盾擋下第一發投射物時，朝施放者射出一道追蹤的黃金光束（150 傷害，二階段 175）。原作是擋魔法並回以黃金之力，這裡擴大到所有投射物。 |
| 黃金樹大盾・盾擊（二階段） | canon（Shield Bash） | 架勢傷害極重（78）。 |
| 大盾碾壓（二階段） | canon（Shield Crush） | 躍起消失在空中、追蹤落點，落地以大盾砸地，再炸一圈外環。 |
| 回馬連掃（二階段） | canon（Side Swing Turning 180°） | 先往背後掃、再轉回來掃，最後接盾擊。 |
| 大招「黃金樹的活壁壘」 | 改編 | 黃金誓言加身 → 兩趟騎兵衝鋒 → 躍起大盾碾壓，落點長出光之黃金樹。二階段名稱「・聖戟天罰」，落地後沿面向拔起 8 根聖戟光柱。 |

## 5. 機制實作

- 被動 `sentinel` 在 `js/engine/traits.js`（`interceptDamage`）。
- 黃金的返報借用犽宿的風牆：`windwall` 動作帶 `retaliate: { dmg, posture }` 時，牆會改畫成黃金盾，擋下第一發敵方投射物就射出 `goldbeam` 光束（`js/engine/actions/wind.js`）。沒有 `retaliate` 的風牆行為不變。
- 狀態 `goldenvow` 在 `js/engine/statuses/effects.js`。
- 二階段照全體規則在 50% HP 轉換（原作 60%）。

## 6. 逐招動畫

- 造型檔 `js/render/styles/treesentinel.js`，純繪圖（不碰戰鬥），沿用關鍵值姿態混合（蓄力 → 擊 → 收）。
- 姿態鍵：戟角度、伸出、高舉、人立、舉盾、前衝、迴旋、戟光。每個出手動作依技能挑一組姿態（`pick`）。
- 人立時戰馬前半身放大，像是抬起來；奔跑時四腿交替。
- 戟大幅揮動時在身體底下畫一道金色刀光弧；二階段戟身持續發光，黃金誓言期間身邊繞金色光點。
- 地面層 `under()` 畫黃金盾牆與誓言光環；衝鋒（`dash`）期間身後拖五條金色光帶與光暈；大盾碾壓躍起時 `hidden()` 在落點畫越來越大的影子與旋轉的金色符環（半徑 = 落地判定半徑），人馬沿弧線飛過去並拖一道金色彗尾。
- 戟尖在突刺與衝鋒時延伸出一道光槍（`thr`）；盾擊與碾壓時盾面撞出金色弧光與放射根紋（`bk`）；迴旋大掃的戟光多掃兩圈內弧；高舉戟（誓言、大盾碾壓前）戟頭有旋轉的放射光芒；衝鋒或前撲時披風與尾巴也飄起。光槍、盾弧、光帶、彗尾都先畫一層琥珀底再疊加亮，淺色地圖上也看得見。

| 技能 | 招式動畫 | 特效（`js/fx/treesentinel.js`） |
|---|---|---|
| 側揮連斬 / 回馬連掃 | 戟由右往左、再由左往右大掃，回馬先轉向背後 | `goldcleave`：琥珀寬弧三層拖影、內圈金弧、弧端星芒、落下羽葉 |
| 人立突刺 | 戰馬人立、戟高舉後往前直刺，戟尖延伸出光槍 | `lancethrust`：琥珀光束＋白芯、兩條金色螺旋、速度線收束、戟尖星芒 |
| 人立重砸 | 人立、雙手高舉停頓 → 砸落 | `lanceslam`：金色光槍由天釘落、小型光之黃金樹、樹根裂紋；外環 `goldring` |
| 馬蹄踐踏 / 側身衝撞 | 前蹄抬起重踏 / 馬身往右甩 | `hoofstomp`：金色馬蹄鐵印、塵浪、火星；`horsebash`：金色月牙、平行速度線、馬鎧火花 |
| 騎兵衝鋒 / 躍馬斬 | 前傾、戟平舉衝刺，身後拖金色光帶、披風飄起 | `goldcharge`：蹄印、琥珀光帶、金色殘影、終點塵浪；`goldleap`：起跳震波、光柱、羽葉餘燼 |
| 迴旋大掃 | 整個人馬迴旋，戟掃出長弧並多掃兩圈內弧 | `twirlsweep`：三圈金弧由外而內、切線火花、旋風環 |
| 黃金誓言 | 高舉戟，身後浮出光之樹 | `goldvow`：金色光樹、放射光線、光點 |
| 黃金的返報 | 盾舉起，前方立起黃金盾牆 | `goldshield`、`goldretaliate`（盾面爆光，射出光束）、`shieldguard`（盾擋金光） |
| 盾擊 | 盾往前推撞，盾面撞出金色弧光 | `erdbash`：盾面寬弧、放射根紋、雙層震環 |
| 大盾碾壓 | 躍起消失 → 落點影子變大並浮出旋轉符環 → 盾砸地 | 起跳 `goldleap`；`shieldcrush`：樹根狀裂紋、金色震環、碎石；外環 `goldring` |
| 大招 | 衝鋒兩趟 → 躍起碾壓 | `erdtreeblast`：光之黃金樹、放射光線、光柱、樹根裂紋；二階段 `holylance` 聖戟光柱 |

## 7. 平衡

HP 2450、移速 225、質量 2.2、架勢 210。全 Boss 對戰模擬（種子 1、2、3）勝率：light 約 50%、heavy 約 49%。
