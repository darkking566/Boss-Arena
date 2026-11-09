# 玻列琉斯考據入口

[33 張本機圖鑑](gallery.html) · [原作考據與技能提案](../../bosses/borealis.md) · [逐圖索引](IMAGE-INDEX.md) · [研究範圍與缺口](RESEARCH-LOG.md)

本輪使用者選擇先看研究與技能方案，尚未製作角色。

48 張候選已看過，採用 33 張：29 張靜圖（含概念圖、祈禱圖示與遊戲攝影）＋4 段動圖，每段只算一張；另有 15 張排除。概念圖已看完整頁面圖像，單張畫師與正式畫冊頁碼仍未核實。

`library/records/` 有 42 筆可編輯 Markdown 正文（33 圖＋9 文字來源）；`library/index/records.jsonl` 可從正文重建。`selected-images.json` 記錄逐圖來源、查看方式與檔案 SHA-256。`images.json` 是原始下載清單，不代表已被採用；最後選圖以 `selected-images.json` 為準。

圖片只在本機研究，不載入遊戲；權利由 FromSoftware、Bandai Namco 及各原作者保有。全部原圖與失敗來源都有出處，沒有取得圖片再分發授權。

重建索引：`python "C:/Users/dark/.codex/skills/build-work-library/scripts/work_library.py" reindex --project docs/research/borealis/library`。讀者改正文後只重建索引，不要用 finalize 腳本覆蓋人工修改。
