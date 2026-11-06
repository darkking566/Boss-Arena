# 紅狼考據資料入口

[開啟 33 張圖的本機圖鑑](gallery.html) · [完整考據與技能設計](../../bosses/redwolf.md) · [逐圖來源索引](IMAGE-INDEX.md)

選定 32 張遊戲圖像＋1 張概念候選；原始候選 47 張。圖片已實際查看，地圖、獎勵、其他角色與重複裁切未列入選圖數量。概念候選的官方紙本定位尚未核實。

- `images/`：本機參考原檔；不載入遊戲。
- `selected-01.jpg` 到 `selected-03.jpg`：選定圖像總覽。
- `selected-images.json`：33 張的來源、查看回執、觀察及用途。
- `library/records/`：38 筆可編輯正文，含 33 筆圖像與 5 筆文字來源筆記。
- `library/sources/`：凍結的來源描述和少量核對摘錄。
- `library/index/records.jsonl`：可從正文重建的查詢索引。

圖片仍由 FromSoftware、Bandai Namco 及原截圖持有人享有權利；本次授權限於本機研究與設計參考，沒有取得圖片再分發授權。遊戲畫面是自行繪製。

首次採集與本次人工選圖的工具位於 `test/collect_redwolf_refs.py`、`test/finalize_redwolf_refs.py`。後者包含本次已查看的人工觀察，不能拿它將未查看的新圖自動標成「看過」。來源一經登記保持凍結；日後新圖另加編號，避免覆蓋使用者筆記。
