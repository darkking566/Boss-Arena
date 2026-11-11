# 飛龍桂雷爾：研究範圍、選圖與缺口

日期：2026-11-11；作品線：2022 年《艾爾登法環》本篇。用途：為 Boss 互鬥遊戲設計角色。圖片只在本機研究，不載入遊戲；權利由 FromSoftware、Bandai Namco 及各原作者保有，沒有取得再分發授權。

## 方法

1. 讀專案「新增 Boss」指南，以及艾絲緹、亞基爾的考據做法與既有招式表。
2. 文字：用網頁工具讀 Fextralife（Flying Dragon Greyll、Flying Dragon Agheel、Elder Dragon Greyoll、Dragonbarrow、Greyoll's Roar）、wiki.gg（Dragons 頁）、Gamepressure、SegmentNext 與一則搜尋摘要；是**摘要工具轉述**，不是逐字讀原頁。招式名各站不統一，本專案的繁中招式名是自訂。
3. 圖片：`tools/collect_refs.py` 讀約 60 個候選頁面（可讀的 22 個，其餘 403/404/斷線）→ 下載 → 雜湊與視覺近似去重 → 聯絡表人工檢視 → `tools/finalize_refs.py` 套用人工標註。官方設定稿與畫作來自 Creative Uncut 的 Elden Ring 圖庫（Agheel、Lansseax、Adula）。Fextralife 圖片直接走圖片 CDN（頁面本身連線被關閉）。

## 計數

| 項目 | 數量 |
|---|---:|
| 自動收集後去重的候選 | 41 |
| 人工排除 | 8 |
| 最終採用 | **33**（官方設定稿 1、家族參考 4（含官方畫作 2、Elder Greyoll 截圖 2）、外觀 8、招式 14、場景 5、招式表 1） |

排除原因：地圖 6、Game8 網站標誌 1、龍騎士套裝概念圖（人物盔甲）1。

GIF（10 張）只看第一格，不冒稱完整動作分析；分類是人工標註，不是自動模型分類。

## 存取失敗（沒有繞過任何限制）

| 來源 | 結果 |
|---|---|
| wiki.gg、Fandom、Push Square、Prima、GameSkinny、ExitLag | 403 |
| Fextralife 頁面（程式抓取）、TheGamer、Polygon、ScreenRant | 連線被關閉；Fextralife 圖片改走圖片 CDN |
| IGN、GamesRadar、Eurogamer、VG247、Dexerto、Miklix、eIP | 404（猜的網址） |
| RankedBoost 圖片 | 部分網址含空白，改為編碼後下載；其餘為地圖，已排除 |

## 證據上的分歧與缺口

- **血量**：Fextralife 11,550（NG）；搜尋摘要曾出現 11,500，以 Fextralife 頁面為準。
- **位置描述**：「法魯姆大橋降福點正南」與「Bestial Sanctum 南側的橋」是同一座橋的兩種說法，不衝突。
- **招式清單**：SegmentNext 說六招、Game8 列的是另一組分類、亞基爾頁有 16 招；三者只能互相對照，沒有官方招式表。本作以亞基爾 16 招為底（Eldenpedia 註明同模型同能力）並合併成連段。
- **Greyoll／Greyll 拼寫**：有站點把桂雷爾寫成 Greyoll；本作以 Fextralife 與 Gamepressure 的 Greyll（Flying Dragon）為準，Elder Dragon Greyoll 是另一隻（母龍）。
- **完整動作分析沒做**：GIF 只看第一格；招式時序依文字改寫，不是逐格量測。
- **概念圖／設計稿**：有一張官方設定稿（Agheel，與桂雷爾同模型，Creative Uncut 收錄，含側面全身與多角度草圖）；**沒有桂雷爾專屬的設計稿**；畫師與出處畫冊未核實。Lansseax、Adula 畫作只用來對照龍族翼膜質感。
