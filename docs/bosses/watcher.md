# 深淵監視者（Abyss Watchers）——逐招動畫

造型檔 `js/render/styles/watcher.js`，純繪圖（不碰戰鬥）。每個出手動作（hit / dash / hide / summon）一組關鍵值：
`key: [引（蓄滿）, 擊, 起始, 收招, 擊後衰減起點]`，驅動軀幹扭轉 `rot`、前衝 `fwd`、蹲伏 `sq`、大劍角 `ga`、握點 `tx`、劍長透視 `fs`、落地重壓 `big`、刃尖蓄力光 `glow`、匕首 `dag`、紅眼 `eye`。
擊後 0.25s 保留「擊」姿態並與下一手蓄力混合，連段不跳格。衝刺中、後空翻、彈反架式為 `special()` 特例。

| 技能 | 動畫重點 |
|---|---|
| 狼血連斬 | 左右交替橫斬（身軀反向扭轉）→ 停頓、劍收腰後蓄滿顫動 → 前壓重刺並留地裂；二階段尾端大弧斬帶火環 |
| 上撩・揚塵 | 蹲低、劍貼地拖後 → 由下往上撩起、前方揚起塵土；二階段補一記插地火環與裂紋 |
| 衝斬 | 低身踏步、劍拖後蓄力 → 衝刺（劍尖前伸、速度線）→ 近 360° 迴旋斬（身軀甩開、整圈劍弧）→ 震波環；二階段為火環 |
| 躍空重劈 | 舉劍蹲伏 → 躍起隱身（起跳煙塵環、落點巨影漸濃）→ 落地重壓放大再彈回、震波環與地裂；二階段再爆火環 |
| 突進刺擊 | 低身拖劍蓄力 → 突進（劍尖前伸、速度線）→ 收勢殘留流線 |
| 後空翻 | 縮身整圈翻轉（披風被扯開、速度線朝前），落地塵環 |
| 匕首彈反 | 0.55s 見切窗口：匕首橫架、大劍收後、身前一道脈動光弧；窗口結束漸收 |
| 呼喚同伴 | 舉劍嚎叫、紅眼爆亮，血色光點向身上收束 → 出手時紅環炸開 |
| 薪火長斬（二階段） | 低身滑步、劍尖前伸 → 反手向身後掃出一道火，身後落火環與裂紋 |
| 不死隊連環劍舞 | 九組「踏步 → 斬 / 刺」（三擊一刺，刺擊有速度線與地裂）→ 高舉重劈落地重壓 → 二階段尾環擴散 |

躍空重劈的隱身表現在 `hidden()`；換階段倒地 / 起身仍由 `transition()` 負責。

---

## 音效設計（SFX）

音效邏輯位於 `js/audio.js`（僅瀏覽器 `data-browser`，純音效不影響戰鬥與隨機種子）。
支援 `mc_set`（Minecraft 原生風格 OGG 音效組）與 `raw`（Pixabay 寫實 MP3 音效組）。

| 技能 | 一階段音效 | 二階段薪火音效 | 音效設計說明 |
|---|---|---|---|
| **狼血連斬** (`combo`) | 前兩斬利刃破空 `swordWhoosh` + `slash`；第三刺沉重金屬破空貫通 `slashHeavy` + `swordWhoosh` | 每一斬揮出帶烈焰呼嘯 `fire`；第 4 擊大弧斬爆發烈火橫掃 `slashHeavy` + `fire`；命中後 0.5s 遲滯地火爆響 `explodeMid` + `fire` | 還原原作法蘭大劍左右橫斬節奏、延遲重刺穿透感；二階段遲一拍火焰爆鳴 |
| **上撩・揚塵** (`rise`) | 大劍擦地石板摩擦 `bladeScrape`（grindstone）+ 破空挑斬 `slashHeavy` + 揚塵碎石 `stepSand` | 劍刃拖火擦地 + 破空挑斬 `fire`；隨後插地火環爆發重擊震波 `slamThud` + 烈焰爆破 `explodeMid` + `fire` | 重現大劍狠刮地面石板、揚起沙土挑飛對手；二階段追加插地火環巨響 |
| **衝斬** (`dashslash`) | 踏步滑行刮地 `dash` + `bladeScrape`；衝線破空 `swordWhoosh`；終點 360° 迴旋斬 `slashHeavy` + 震波 `shockwave` | 沿途拖火痕 `fire`；終點迴旋斬爆發火環狂暴爆裂 `slashHeavy` + `explodeMid` + `fire` | 原作標誌性低身滑進與以匕首為軸心的大迴旋斬 |
| **躍空重劈** (`plunge`) | 深蹲躍起起跳破空 `dash` + `swordWhoosh`；落地千鈞重砸地裂 `slamHeavy` + `slamThud` + 震波 `shockwave` | 落地瞬間帶烈焰重壓 `slamHeavy` + `slamThud` + `explodeMid` + `fire`；1.37s 延遲火柱環大爆裂 `explodeBig` + `shockwave` + `fire` | 特大劍直貫地面的巨力重劈；二階段延遲火柱二次引爆 |
| **突進刺擊** (`lunge`) | 長距突進 `dash` + 凌厲長刺破空 `swordWhoosh` + `slashHeavy` | 突進長刺帶烈焰噴湧 `dash` + `swordWhoosh` + `slashHeavy` + `fire` | 迅雷長距離直刺穿透 |
| **後空翻** (`backflip`) | 靈活後躍風聲 `dash` + 披風扯動 `swordWhoosh` | 同一階段 | 遭遇壓迫時的迅捷拉開距離與無敵翻滾 |
| **匕首彈反** (`parry`) | 架式展開抽匕首 `draw`；彈反成功清脆金屬彈刀 `mikiriClang` + 鐘聲長鳴 `mikiriRing` + `block`；處決反斬 `slashHeavy` + `hitHeavy` + `hitFlesh` | 同一階段（處決傷害依二階段倍率加成） | 魂系靈魂時刻：匕首格擋清脆脆響、反斬處決內臟暴擊感 |
| **呼喚同伴** (`pack`) | 舉劍召喚遠方鐘鳴 `bell` + 誓約光環 `buff`；同伴現身 `teleport` + `draw`；紅眼監視者現身深淵狂暴咆哮 `roarMid` + 喪鐘 `bell` + 鮮血消散 `death` | 僅一階段存在 | 狼血誓約的同伴召喚，與被深淵侵蝕失控的紅眼同伴登場威壓 |
| **薪火長斬** (`emberswipe`) | （二階段限定） | 低身貼地滑步 `dash` + `bladeScrape` + `fire`；反手身後狂暴回馬火海大爆發 `slashHeavy` + `explodeMid` + `fire` | 原作二階段著名殺招：劍尖前伸欺騙，身後瞬間炸開滔天火海 |
| **不死隊連環劍舞 / 薪王焚天連斬** (`ult`) | 誓約起手 `ultCast` + 鐘鳴 `bell`；九連踏步斬刺連續破空 `dash` + `bladeScrape` + `swordWhoosh` / `slashHeavy`；終結重劈 `slamHeavy` + `slamThud` + `shockwave` | 全程九連劍舞帶烈焰呼嘯 `fire`；終結重劈爆發大爆炸 `slamHeavy` + `explodeBig` + `fire`；隨後尾擊薪火巨環擴散 `shockwave` + `explodeMid` + `fire` | 法蘭不死隊絕技連環劍舞；二階段焚天烈焰狂舞與尾環全場洗禮 |
| **二階段轉場** (`phase2`) | 倒地同伴消散血霧爆發 `death` + `slamThud` | 1.7s 薪王之火燃起 `fire` + `explodeBig` + 威壓音爆 `shockwave` | 「薪王之火……燃盡深淵。」狼血匯於一身、特大劍燃火重生的莊嚴震撼 |
