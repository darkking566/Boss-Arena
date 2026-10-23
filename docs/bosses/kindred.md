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
| 被動 鏡爪印記 | 標記獵物，完成狩獵後永久強化 | 狀態 `hunt`：「鏡爪印記・宣告」與大招命中各累積一層，每層 +6% 造成傷害（上限 5 層，不會消失） |
| Q 舞動箭矢 | 翻滾並射向附近最多三個敵人 | `arrows`：側向翻滾（翻滾中無敵）＋三支微追蹤的箭；二階段兩輪 |
| W 魔狼狂熱 | 魔狼在範圍內撲咬，神羊離開範圍就結束 | `frenzy`：魔狼衝進對手所在的獵場連咬三口（二階段四口），神羊在後方補箭；獵場會跟著目標鎖定一次，走出去就躲得掉 |
| E 恐懼蔓延 | 前兩下緩速，第三下魔狼撲擊 | `dread`：兩支緩速箭 → 魔狼從神羊身旁撲向目標（落點預警跟著目標走） |
| R 神羊喘息 | 圈內單位生命不會低於下限，結束時回血 | 狀態 `respite`：4 秒內生命鎖在 10% 以上，到期仍活著回復 160（二階段 220）；只保護自己 |
| （本作新增）神羊躍步 | 取原作「神羊遠射、魔狼斷後」的分工 | `leap`：被貼身時神羊後躍放箭，魔狼留在原地咬住追上來的人 |
| （本作新增）魔狼撕咬 | 取 Pandemonium 皮膚「最後的饗宴」與魔狼的暴烈 | 二階段 `maw`：魔狼沿直線衝殺 560 |
| （本作新增）狩獵風暴 | — | 二階段 `storm`：銀箭雨 |
| 大招 永恆獵手 | — | 符印 + 箭雨 + 魔狼從天撲落（定身、易傷、累積一層印記）；二階段追加魔狼直線衝殺 |

數值（冷卻、傷害、範圍）以本作節奏重新設計，並未照搬 wiki 數字（不同版本數字互有出入）。

## 3. 設計決策

- **魔狼是看得見的靈體，但不是實體**：魔狼只存在於造型（`js/render/styles/kindred.js`），位置記在 WeakMap 裡（純視覺）。
  凡是 fx 為 `wolfbite` / `wolfmaw` / `wolfcharge` / `lambfinale` 的 `hit`，魔狼會先潛行到一半、在判定前 0.42 秒（直線衝殺 0.5 秒）撲向判定點並張口，咬完停 0.22 秒再回到神羊身側。
  傷害全部由神羊的時間軸結算，因此沒有新增實體，也不影響行為指紋以外的任何東西。新增魔狼招式時，只要讓判定的 fx 用上述四種之一即可。
- **魔狼畫在沙塵之上**：沙漠等地圖的命中會揚起畫在 Boss 上方的沙塵，魔狼正好站在命中點，會被整個蓋掉。因此造型新增 `over` 鉤子（`js/render/hud.js` 在空中特效之後呼叫），魔狼本體畫在 `over`、地面陰影畫在 `under`。
- **魔狼比神羊大**：原作是「巨大的靈狼」，魔狼尺寸為神羊半徑 × 1.8（二階段 × 2.3），外圍有冷藍（二階段橘紅）的靈光與輪廓，遠距離也看得出是一頭狼。
- **面具顛倒**：神羊戴深色狼面具（眼窩冷藍）、魔狼戴白色羊面具，照原作設定；二階段不換面具，改為魔狼燃起鬼火、身形暴漲（取 Shadowfire 與 Pandemonium 的意象）。
- **神羊喘息**：用狀態的 `absorb` 把生命鎖在 10% 以上、`onRemove` 回血；`status` 動作新增可選的 `fx`（純演出）來播放聖域。
- **預警符印**：鏡爪印記、魔狼狂熱、恐懼蔓延與大招都用 `setMark` + `anchor: 'mark'` 讓預警跟著目標走、鎖定後才落下，與天照的做法一致。

## 4. 圖片參考（32 張）

由 Riot Data Dragon CDN（版本 16.21.1）下載並逐張檢視：

- 立繪 `splash_{id}.jpg`：0 原版、1 Shadowfire、2 Super Galaxy、3 Spirit Blossom、12 Porcelain、22 Woof and Lamb、23 DRX、34 Chosen of the Wolf、45 Pandemonium（9 張）
- 載入畫面 `loading_{id}.jpg`（同上 9 款）
- 頭像 `tile_{id}.jpg`（同上 9 款）
- 技能圖示：`KindredQ.png`、`KindredW.png`、`KindredEWrapper.png`、`KindredR.png`、`Kindred_Passive.png`（5 張）

觀察重點：原版的羔羊與狼在陰影中，狼的眼睛為冷藍；Shadowfire 將狼改為火焰與紅眼；Chosen of the Wolf 偏冷色、狼身覆銀白。本作以深色長袍、銀色護襟、冷藍眼窩為一階段基調，二階段改為血紅與白色羊面具。

## 5. 網頁來源（實際讀取內容者 10 頁）

1. [Universe:Kindred（LoL Wiki）](https://wiki.leagueoflegends.com/en-us/Universe:Kindred)
2. [WR:Kindred（LoL Wiki 技能與數值）](https://wiki.leagueoflegends.com/en-us/WR:Kindred)
3. [Kindred/Skins（LoL Wiki 皮膚列表）](https://wiki.leagueoflegends.com/en-us/Kindred/Skins)
4. [英雄頁（leagueoflegends.com，en-us）](https://www.leagueoflegends.com/en-us/champions/kindred/)
5. [Champion Reveal: Kindred, the Eternal Hunters（Surrender at 20）](https://surrenderat20.net/2015/09/champion-reveal-kindred-eternal-hunters.html)
6. [Kindred guide（Dexerto）](https://www.dexerto.com/league-of-legends/lol-kindred-guide-best-builds-runes-tips-tricks-skins-1642026/)
7. [Kindred（TheSpike.gg）](https://www.thespike.gg/league-of-legends/champions/Kindred)
8. [What is Kindred（Fragster）](https://www.fragster.com/what-is-kindred/)
9. [Kindred League of Legends（ExitLag，葡萄牙文版）](https://www.exitlag.com/blog/pt/kindred-league-of-legends/)
10. [Kindred League of Legends（ExitLag，阿拉伯文版）](https://www.exitlag.com/blog/ar/kindred-league-of-legends/)

另有搜尋到但無法讀取的頁面（403 / 402 / 404）：dotesports、giantbomb、LoL Wiki「Lamb」、Fandom「Kindred」與「Lamb」、earlygame（德文）、「Lambs in the Orchard」。

## 6. 已知差異與限制

- 各來源對同一招的數字不一致（例如 E 的緩速幅度與 Q 的攻速加成），以 wiki 的 V6.2 版為準，本作數值另行設計。
- 原作的「不會瀕死」（R）與「狩獵層數加射程」（被動）沒有完整移植；前者以護盾近似，後者未做。
- 考據文字的繁中名稱（犽宿、千珏）以使用者指定為準。
