"""Apply human inspection notes: drop excluded images, write selected-images.json, IMAGE-INDEX.md, gallery.html.
Notes below are what was actually seen in contact sheets (GIFs: first frame only). Run after collect_refs.py.
"""
import hashlib, html, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
rows = {r['id']: r for r in json.loads((ROOT / 'images.json').read_text(encoding='utf-8'))}

EXCLUDE = {
 'as-ref-008': '地圖（大迴廊位置），不是 Astel',
 'as-ref-011': 'GIF 第一格全黑，沒有可辨內容',
 'as-ref-012': 'GIF 第一格全黑，沒有可辨內容',
 'as-ref-013': 'GIF 第一格全黑，沒有可辨內容',
 'as-ref-014': '另一隻 Boss（蜘蛛形），不是 Astel',
 'as-ref-017': '地圖（Astel 位置標記），不是 Astel',
 'as-ref-032': 'Game8 網站標誌',
 'as-ref-033': 'Miklix 網站自製的 AI 風格插圖：長角骷髏、橘眼，與原作設計不符，會誤導，不當參考',
 'as-ref-034': '同上（Miklix 自製插圖）', 'as-ref-035': '同上（Miklix 自製插圖）', 'as-ref-036': '同上（Miklix 自製插圖）',
 'as-ref-037': '同上（Miklix 自製插圖）', 'as-ref-038': '同上（Miklix 自製插圖）', 'as-ref-039': '同上（Miklix 自製插圖）', 'as-ref-040': '同上（Miklix 自製插圖）',
 'as-ref-041': '地圖（箭頭標示位置），不是 Astel',
 'as-ref-042': '地圖（箭頭標示位置），不是 Astel',
 'as-ref-057': '玩家站在黃金樹前，沒有 Astel',
}
NOTES = {
 'as-ref-001': ('招式', '宇宙光束起手：頭頂拉出橫向紫色光束與爆裂星芒，背後雙翼與一串彩色星屑球，彎鉗朝兩側張開'),
 'as-ref-002': ('場景', '腐敗之湖的棺材通道：紅色瀑布與燭台，是通往 Astel 迷霧門的路'),
 'as-ref-003': ('外觀', '低伏全身：六肢像蜘蛛般撐開、扁平黑色彎鉗貼地、雙翼收在背後；場地是漆黑平坦的水面'),
 'as-ref-004': ('招式', '藍色半透明氣團連同橘色小球包住玩家（招式名未核實，應是星屑氣爆之類）'),
 'as-ref-005': ('外觀', '正面：骷髏頭、兩側彎鉗、頸後一圈毛、雙翼向左右展開，頭頂有紫色橫光'),
 'as-ref-006': ('招式', '黑色球核周圍捲出紫色弧光，像小型黑洞（招式名未核實）'),
 'as-ref-007': ('場景', '「傳說擊倒」畫面與黑暗星塵散開，獲得 Remembrance of the Naturalborn'),
 'as-ref-009': ('外觀', '由下往上看：顱骨、彎鉗、大片雙翼與星球串；玩家在腳邊，紫白火花'),
 'as-ref-010': ('場景', '腐敗之湖：紅霧、枯樹與菇群，通往 Astel 的前一區'),
 'as-ref-015': ('外觀', '官方標題卡（Naturalborn）：低伏、黑色彎鉗、背後有月牙形光環'),
 'as-ref-016': ('外觀', '同畫面無字版：貼近水面的低伏姿態，水面倒影與月牙光環'),
 'as-ref-018': ('招式', '玩家揮劍時，Astel 上方炸出紫色星爆'),
 'as-ref-019': ('外觀', '（GIF 第一格）遠景全身：六肢撐地、彎鉗成環、雙翼背在身後'),
 'as-ref-020': ('外觀', '（GIF 第一格）懸浮遠景：翼展開、上方一串星球'),
 'as-ref-021': ('外觀', '（GIF 第一格）中景：彎鉗圍成圓環、月環與翼膜'),
 'as-ref-022': ('招式', '（GIF 第一格）紫色花狀光團在遠處升起，地面有玩家火光（招式未核實）'),
 'as-ref-023': ('外觀', '（GIF 第一格）薄霧裡的 Astel，翼半透明，上方紫色星雲'),
 'as-ref-024': ('外觀', '（GIF 第一格）近距：獨眼發光的顱骨、彎鉗、右側細長手臂'),
 'as-ref-025': ('外觀', '（GIF 第一格）仰視：翼膜與垂下的星球串，玩家劍氣掃過'),
 'as-ref-026': ('招式', '（GIF 第一格）Astel 飛起，右側一顆紫色能量球射向玩家'),
 'as-ref-027': ('招式', '（GIF 第一格）側面：長臂撐地，尾端拍擊水面濺起白浪'),
 'as-ref-028': ('招式', '（GIF 第一格）遠方升起紫色環形光陣（可能是瞬移或隕石前兆，未核實）'),
 'as-ref-029': ('外觀', '（GIF 第一格）遠景：翼展開，玩家劍氣在前'),
 'as-ref-030': ('外觀', '官方標題卡（Stars of Darkness）：灰霧洞窟中同樣的低伏姿態與黑色環形彎鉗'),
 'as-ref-031': ('外觀', 'Stars of Darkness 洞窟畫面：灰褐色地面，彎鉗環與月環'),
 'as-ref-043': ('場景', '掉落 Remembrance of the Naturalborn，背景是星空與水面'),
 'as-ref-044': ('場景', 'Stars of Darkness 掉落 Meteorite of Astel（120,000 盧恩），洞窟霧中'),
 'as-ref-045': ('招式', '紫色光柱由上垂直打下，碎石與星屑懸浮空中；光束招的主參考'),
 'as-ref-046': ('招式', '三條手臂尖端各聚一顆紫色球：黑暗波前兆'),
 'as-ref-047': ('招式', '巨大圓形星空光陣，內有星點與爆光、外圈多層光環，旁邊藍色冰晶狀碎光'),
 'as-ref-048': ('招式', '粉紫色爆炸衝擊波橫掃畫面，Astel 在後方'),
 'as-ref-049': ('外觀', '貼近頭部：頸毛與顱骨下方，玩家在頭下方，橘色火花'),
 'as-ref-050': ('招式', '眼窩亮起藍光，頭前低垂（依 Fextralife，眼發光是壓碎咬的前兆）'),
 'as-ref-051': ('招式', '四顆紫色球體懸在手臂末端：大範圍黑暗波前兆（本圖看到四顆，不能證明總數）'),
 'as-ref-052': ('招式', '紫白多層圓環波貼著水面向外擴散：黑暗波衝擊'),
 'as-ref-053': ('招式', '白紫色巨浪夾著碎石吞沒畫面：大型衝擊波'),
 'as-ref-054': ('場景', '遠景全貌：藍色翼展、紫色星雲遍佈天空，玩家站在水面'),
 'as-ref-055': ('招式', '大型紫色球核與環形光圈在身前展開，Astel 在後方'),
 'as-ref-056': ('外觀', '顱骨特寫：左側有裂縫、藍眼發光、頸後毛、兩側彎鉗，附近星球串'),
 'as-ref-058': ('官方畫作', 'Creative Uncut 收錄的官方美術（1000×1160）：兩對蜻蜓狀翅膀、頭骨帶藍眼、脖後白毛、細長骨臂、爪手、彎鉗，身後一串彩色星球與行星環；比遊戲畫面更清楚。不是概念草圖，畫師與出處畫冊未核實'),
}
RIGHTS = 'FromSoftware / Bandai Namco 及原作者保有權利；僅本機研究參考，不載入遊戲，再分發許可未知。'

sel = []
for i, r in rows.items():
    p = ROOT / r['file']
    if i in EXCLUDE:
        p.unlink(missing_ok=True); continue
    cat, note = NOTES[i]
    sel.append(dict(id=i, file=r['file'], category=cat, note=note, page_url=r['page_url'], image_url=r['image_url'],
                    width=r['width'], height=r['height'], frames=r['frames'],
                    sha256=hashlib.sha256(p.read_bytes()).hexdigest(), rights=RIGHTS))
(ROOT / 'selected-images.json').write_text(json.dumps(sel, ensure_ascii=False, indent=2), encoding='utf-8')

cnt = {}
for s in sel: cnt[s['category']] = cnt.get(s['category'], 0) + 1
lines = ['# Astel（黑暗棄子）・逐圖來源', '',
         '%d 張採用（%s）；排除 %d 張。GIF 只看過第一格，不冒稱完整動作分析。' % (len(sel), '、'.join('%s %d' % kv for kv in cnt.items()), len(EXCLUDE)), '']
for s in sel:
    lines += ['## %s・%s' % (s['id'], s['category']), s['note'], '',
              '- [本機圖片](%s) · [來源頁](%s) · [來源圖](%s)' % (s['file'], s['page_url'], s['image_url']),
              '- 尺寸：%d × %d；SHA-256：`%s`' % (s['width'], s['height'], s['sha256']), '']
lines += ['## 排除', ''] + ['- %s：%s' % kv for kv in EXCLUDE.items()]
(ROOT / 'IMAGE-INDEX.md').write_text('\n'.join(lines), encoding='utf-8')

cards = ''.join('<figure><a href="%s"><img loading="lazy" src="%s"></a><figcaption><b>%s・%s</b><br>%s</figcaption></figure>'
                % (s['file'], s['file'], s['id'], s['category'], html.escape(s['note'])) for s in sel)
(ROOT / 'gallery.html').write_text(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Astel（黑暗棄子）圖鑑</title>'
    '<style>body{background:#12151c;color:#dde;font:14px sans-serif;margin:16px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}'
    'figure{margin:0;background:#1b2030;padding:8px;border-radius:6px}img{width:100%%;display:block}figcaption{margin-top:6px;font-size:12px}a{color:#9cf}</style>'
    '<h1>Astel（黑暗棄子）圖鑑（%d 張）</h1><p><a href="IMAGE-INDEX.md">逐圖來源</a>・<a href="RESEARCH-LOG.md">研究範圍與缺口</a></p><div class="g">%s</div>' % (len(sel), cards),
    encoding='utf-8')
print(len(sel), cnt)
