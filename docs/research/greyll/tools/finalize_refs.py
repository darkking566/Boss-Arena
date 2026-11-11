"""Apply human inspection notes (what was actually seen in contact sheets; GIFs: first frame only).
Writes selected-images.json, IMAGE-INDEX.md, gallery.html; deletes excluded files. Run after collect_refs.py."""
import html, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
rows = {r['id']: r for r in json.loads((ROOT / 'images.json').read_text(encoding='utf-8'))}
EXCLUDE = {
 'gr-ref-004': '龍騎士套裝概念圖（人物盔甲），不是龍',
 'gr-ref-006': '地圖（Agheel 位置），不是 Greyll',
 'gr-ref-007': 'Game8 網站標誌',
 'gr-ref-015': '地圖（Dragonbarrow 標記）',
 'gr-ref-021': '地圖（Greyll 位置標記）',
 'gr-ref-022': '地圖（Greyoll 位置標記）',
 'gr-ref-025': '地圖（Greyll 位置標記）',
 'gr-ref-038': '地圖（Fort Faroth 附近）',
}
NOTES = {
 'gr-ref-001': ('設計稿', '官方設定稿（Agheel；Eldenpedia 稱 Greyll 外觀與 Agheel 相同）：側面全身灰黑龍，頭有單角、背脊與翼緣鋸齒羽狀鱗；下方有俯視翼展、站姿、前傾姿勢草圖'),
 'gr-ref-002': ('家族參考', '官方畫作：Lansseax（古龍），銀白身軀、金褐羽狀翼膜——只用來對照「龍的翼膜質感」，不是 Greyll'),
 'gr-ref-003': ('家族參考', '官方畫作：Adula（輝石龍），黑身藍晶——龍族系列對照，不是 Greyll'),
 'gr-ref-005': ('外觀', '龍頭近照（來源頁標為 Greyoll 圖示）：灰色鱗、紅眼、張口，下方有紅光；是 Greyll 或 Elder Greyoll 未核實，只當龍頭質感'),
 'gr-ref-008': ('外觀', '霧中正面：雙翼向兩側張開、頭有尖角、腳邊有白光點，灰褐近黑的羽鱗'),
 'gr-ref-009': ('場景', '擊倒後掉落龍心（Dragon Heart），雨天石板橋面，右側有石欄與枯樹'),
 'gr-ref-010': ('招式', '貼近看龍腿：粗壯鱗腿與翼緣羽刺佔滿畫面——打腳的角度'),
 'gr-ref-011': ('招式', '龍起身展翼、玩家騎馬在前（升空前兆）'),
 'gr-ref-012': ('招式', '架勢被打崩：頭低垂貼地，口邊噴出橘色火星'),
 'gr-ref-013': ('招式', '轉姿後噴出火焰，火在橋面右側；背後黃金樹'),
 'gr-ref-014': ('場景', '橋面遠景：圓形紋章地面、石欄、遠處的 Greyll，背景黃金樹'),
 'gr-ref-016': ('外觀', '雙翼平展貼地的龍，面向玩家；翼緣長羽刺狀（SegmentNext 稱六招之一）'),
 'gr-ref-017': ('外觀', '側面伏低：長頸、背脊成排刺、翼折在身側，玩家騎馬在腹下'),
 'gr-ref-018': ('場景', '橋面騎馬視角，左側有石壇，箭頭指向橋邊枯樹下的位置'),
 'gr-ref-019': ('場景', '橋北側岩石與橋面，玩家騎馬接近'),
 'gr-ref-020': ('外觀', '龍立起頸子仰頭、頭上長角與捲曲的角，玩家以紫色法術對峙'),
 'gr-ref-023': ('外觀', '標題卡：灰霧中的龍正面，雙翼上舉、頭頂尖角'),
 'gr-ref-024': ('場景', '橋面長直路，遠處 Greyll 低伏，玩家在近處'),
 'gr-ref-036': ('家族參考', 'Elder Dragon Greyoll 標題卡：巨大伏地的龍，背脊刺列'),
 'gr-ref-037': ('家族參考', 'Elder Dragon Greyoll 畫面：伏地巨龍側面，長角、嘴部張開，灰褐鱗'),
 'gr-ref-039': ('招式表', 'Agheel 招式流程圖（Idle→各招）：低踏/高踏、折返跳、尾鞭、掃息、翼拍、翼掃、衝撞、俯衝、轉身咬等；文字太小，只當招式清單核對'),
 'gr-ref-040': ('外觀', 'Agheel 公式風格畫面：側面張口咆哮，翼羽像一叢枯枝，頭有單長角（同模型參考）'),
 'gr-ref-041': ('外觀', 'Agheel 飛行：翼膜展開，頭有單長角，鋸齒爪（同模型參考）'),
}
sel = []
for rid, r in rows.items():
    f = ROOT / r['file']
    if rid in EXCLUDE:
        f.exists() and f.unlink(); continue
    if rid in NOTES: cat, note = NOTES[rid]
    else:
        cat = '招式'; a = r['alt'].replace('Elden Ring - ', '')
        note = '（GIF 第一格，招式名取自 Game8 標題）' + a
    sel.append(dict(id=rid, file=r['file'], category=cat, note=note, width=r['width'], height=r['height'], page_url=r['page_url'], image_url=r['image_url']))
(ROOT / 'selected-images.json').write_text(json.dumps(sel, ensure_ascii=False, indent=2), encoding='utf-8')
md = ['# 飛龍桂雷爾（Flying Dragon Greyll）逐圖索引', '', '採用 %d 張；排除 %d 張。GIF 只看第一格。' % (len(sel), len(EXCLUDE)), '', '| 編號 | 類別 | 看到的內容 | 來源 |', '|---|---|---|---|']
for s in sel: md.append('| %s | %s | %s | [頁面](%s) |' % (s['id'], s['category'], s['note'].replace('|', '/'), s['page_url']))
md += ['', '## 排除', ''] + ['- %s：%s' % (k, v) for k, v in EXCLUDE.items()]
(ROOT / 'IMAGE-INDEX.md').write_text('\n'.join(md), encoding='utf-8')
cards = ''.join('<figure><img src="%s" loading="lazy"><figcaption><b>%s</b> [%s] %s</figcaption></figure>' % (s['file'], s['id'], s['category'], html.escape(s['note'])) for s in sel)
(ROOT / 'gallery.html').write_text('<!doctype html><meta charset=utf-8><title>Greyll 圖鑑</title><style>body{background:#12171c;color:#ddd;font:14px sans-serif;display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px;padding:12px}img{width:100%%}figure{margin:0}</style>%s' % cards, encoding='utf-8')
print('SELECTED', len(sel))
