# 輝石龍亞杜拉：研究範圍、選圖與缺口

日期：2026-11-11；作品線：2022 年《艾爾登法環》本篇。用途：為 Boss 互鬥遊戲設計角色。圖片只在本機研究，不載入遊戲；權利由 FromSoftware、Bandai Namco 及各原作者保有，沒有取得再分發授權。

## 方法

1. 先讀專案「新增 Boss」指南，以及艾絲緹、飛龍亞基爾（committed 版）的考據做法。
2. 文字：用網頁工具讀 Fextralife（Glintstone Dragon Adula、Adula's Moonblade）、wiki.gg（Adula、Dragons）、SegmentNext、Gamepressure 的頁面，是**摘要工具轉述**，不是逐字讀原頁；招式清單以 Fextralife 的招式流程圖（`ad-ref-046`，我自己看過圖）為準，其餘站互相對照。
3. 圖片：`tools/collect_refs.py` 讀 49 個候選頁（可讀 12 個，其餘 403／404／斷線）→ 下載 → 去重 → 聯絡表與畫格表人工檢視 → `tools/finalize_refs.py` 套用人工標註、從 GIF 切畫格並產出索引與圖鑑。

## 計數

| 項目 | 數量 |
|---|---:|
| 自動收集後去重的候選 | 46 |
| 採用的檔案 | **43**（亞杜拉靜態 13、GIF 畫格 20、相關圖 3、GIF 原檔 5、同類龍 2） |
| 亞杜拉入鏡的畫面／畫格 | **33** |
| 排除 | 23（地圖 8、webp 副本 5、Smarag 招式 GIF 7、其他 3） |

GIF 只看 20%／40%／60%／80% 四個畫格，不冒稱完整動作分析；分類是人工標註，不是自動模型分類。

## 存取失敗（沒有繞過任何限制）

| 來源 | 結果 |
|---|---|
| Fextralife、wiki.gg、Fandom、Pushsquare、Primagames、Screenrant、TheGamer、GameRant（直接程式抓取） | 403、405 或連線被關閉；Fextralife 的圖由頁面實際列出的圖片網址取得，wiki.gg 的概念圖檔與 Creative Uncut 的猜測網址回 403，**沒有再用 Referer 或其他手段繞過** |
| 部分猜的網址（GamesRadar、IGN、VG247、Miklix、Creative Uncut 單頁） | 404 |
| GamerTweak 圖片 | 404 |

## 證據上的分歧

- **血量**：三姊妹版 4,405、月光祭壇／教堂版 11,550（兩站一致）；本遊戲不照搬。
- **月刃出現時機**：Fextralife 寫「約 70% 血以下、約 50 秒一次」；wiki.gg 沒有時機。本遊戲放在半血（改編）。
- **弱點**：Fextralife 寫頭部＋50%、怕穿刺與龍屬性；RankedBoost 寫怕穿刺。本遊戲沒有部位系統，不處理。
- **外觀**：沒有任何文字站描述顏色或外型，外觀全靠圖片；圖裡偏藍紫的色調有被夜景濾鏡放大的可能。
- **招式清單**：流程圖有 16 個節點，Gamepressure／SegmentNext 的敘述只有約 7 項；以流程圖為準。

## 概念圖／設計稿

- **沒有找到**。搜尋結果提到 wiki.gg 概念圖索引裡有 `ER_Concept_Art_DragonGlintstone.jpg`（疑似輝石龍概念圖），但該站圖檔回 403，**未取得、未查看**，不確定是不是亞杜拉本人。
- 手上最接近設計稿的是官方標題卡（`ad-ref-003`）與官方宣傳圖（`ad-ref-044`）。
