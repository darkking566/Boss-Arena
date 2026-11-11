"""Apply human inspection notes: cut GIF frames, drop excluded images, write selected-images.json, IMAGE-INDEX.md, gallery.html.
Notes below are what was actually seen in contact sheets / frame sheets. Run after collect_refs.py (idempotent).
"""
import glob, hashlib, html, json, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
rows = {r['id']: r for r in json.loads((ROOT / 'images.json').read_text(encoding='utf-8'))}

MAPS = '地圖／位置示意，不是外觀'
EXCLUDE = {
 'ad-ref-002': MAPS, 'ad-ref-005': MAPS, 'ad-ref-006': MAPS, 'ad-ref-024': MAPS, 'ad-ref-025': MAPS, 'ad-ref-026': MAPS, 'ad-ref-028': MAPS,
 'ad-ref-009': '地圖（Smarag 位置）',
 'ad-ref-027': 'WhatIfGaming 站的標題拼貼，無新資訊',
 'ad-ref-030': '「巨敵討伐」字卡，畫面幾乎全黑',
 'ad-ref-032': 'GIF 第一格全黑，內容未看過（網站標為 cheese 打法，不採用）',
 'ad-ref-034': '與 033 同一動畫的 webp 副本', 'ad-ref-036': '與 035 同一動畫的 webp 副本', 'ad-ref-038': '與 037 同一動畫的 webp 副本',
 'ad-ref-040': '與 039 同一動畫的 webp 副本', 'ad-ref-042': '與 041 同一動畫的 webp 副本',
 **{'ad-ref-%03d' % n: '輝石龍斯瑪拉格（Smarag）的招式 GIF：同類龍但不是亞杜拉，不當依據' for n in range(10, 17)},
}
STILLS = {
 'ad-ref-001': ('外觀', '戰鬥全景：深灰藍的巨龍在山崖前，口前一團青藍光爆；背後是月夜廢墟。玩家騎馬在左下'),
 'ad-ref-003': ('外觀', '官方標題卡：龍在空中、體側上方斜插一把半透明的冰藍巨劍（月刃起手），低處霧中有青光'),
 'ad-ref-004': ('外觀', '龍低伏、兩翼張開如帶羽毛的破布，翼緣鋸齒狀、背脊一排尖棘；背後一道垂直的藍白光柱'),
 'ad-ref-017': ('掉落', '擊倒後在曼努斯・塞列斯大教堂外：掉落 3 顆龍之心與亞杜拉月刃（Adula\'s Moonblade）；背景是哥德式廢墟尖塔與枯松'),
 'ad-ref-018': ('外觀', '極近的翼：整片深藍黑翼膜，後緣有長長的鋸齒尖刺，玩家與馬相比小得多'),
 'ad-ref-019': ('招式', '龍浮空、前爪垂下，頭頂有碎裂狀的冰藍光屑向上散（準備起飛的結晶光屑）；夜空有星點'),
 'ad-ref-020': ('招式', '輝石吐息正面：青藍色魔法火焰像瀑布般噴向鏡頭，翼膜透出青光'),
 'ad-ref-021': ('招式', '吐息橫掃：青色火牆從左掃到右，掃過草地與廢墟，火焰中夾白色光絲'),
 'ad-ref-022': ('招式', '空中吐息：一條由高處斜斜打下的長條青色火焰，末端在地面炸開成大片白青色浪'),
 'ad-ref-023': ('外觀', '龍貼地低伏的側身：厚實的前臂撐地、翼膜成拱形、背脊棘刺成排，身體偏暗藍紫'),
 'ad-ref-029': ('外觀', '遠景全身側視：龍伏在霧中，周圍冒出藍白色結晶柱，翼收在身後像一堆尖羽毛，頭上有分叉的角冠；天空有月光光柱'),
 'ad-ref-031': ('外觀', '頭頸近景：長頸伸出、頭頂有鹿角般的分叉冠、下顎有鬚棘；翼膜如破羽向後掃，右邊一道月光光柱'),
 'ad-ref-043': ('招式', '吐息起手：嘴前聚成一團白青色的光球，周圍青霧外溢；龍伏在草地、翼膜透著青光'),
 'ad-ref-044': ('招式', '官方宣傳圖：龍的頭頸垂直立起，周身浮著許多星狀白光點，頭與頸被藍紫色光暈包住（結晶星光），玩家握劍在下方。疑似月刃或星屑起手，招式名未核實'),
 'ad-ref-045': ('場景', '蘭妮與玩家在月夜廢墟：滿月、斜射光、藍白長袍的蘭妮坐在石上（亞杜拉效忠蘭妮暗月的背景）'),
 'ad-ref-046': ('招式表', 'Fextralife 的招式流程圖（文字節點）：低踏左/右→高踏右/左、尾鞭、重整跳、咬（可連咬）、橫掃吐息、翼砸、翼掃、衝撞、俯衝轟炸、側移、尾鞭＋咬、旋咬、撤退、前撲踏、輝石之星，教堂版另有亞杜拉月刃；尾鞭／重整跳後可接追蹤吐息。這是目前最完整的招式清單'),
 'ad-ref-007': ('同類龍', 'Smarag 標題卡：同為輝石龍，吐息是青綠色、體型更細長、背脊棘刺更密——只拿來對照亞杜拉偏藍紫、翼更寬'),
 'ad-ref-008': ('同類龍', 'Smarag 吐息近景，用來對照吐息顏色與嘴部光效'),
}
GIFS = {'033': '基本打法', '035': '基本打法 2', '037': '吐息', '039': '輝石之星（水晶爆）', '041': '月刃（劍攻擊）'}
FRAME_NOTES = {
 '033': {20: '龍貼地橫陳、翼攤平，碎石飛散，背後光柱', 40: '龍站起，兩翼拱成大圓拱罩住玩家', 60: '龍身擦過，煙塵與白色衝擊霧', 80: '拱形翼下透出藍白光，近距壓迫'},
 '035': {20: '翼拱頂在左上，月光從縫隙漏下', 40: '龍腹下的暗部，拱洞透出藍光', 60: '巨大翼膜直立，玩家舉劍', 80: '翼上揚，遠處廢墟拱門'},
 '037': {20: '遠景：龍口前有青綠光，身後樹林', 40: '吐息橫掃：大片青綠火雲，翼向兩側張成扇狀', 60: '龍頭低壓、尾巴捲起，青火沿地面展開', 80: '近距：龍首低垂，嘴邊一小簇青光'},
 '039': {20: '嘴前凝出一大塊冰藍半透明的尖晶簇（輝石之星），閃著白色亮點', 40: '尖晶簇碎裂成藍白霧與光屑', 60: '龍落地翼展，殘餘藍光', 80: '岩堆旁一根斜立的藍白晶刺升起'},
 '041': {20: '龍高飛在新月前，雙翼張開，天上多道光柱', 40: '龍翻身俯衝，翼收攏、前爪垂下', 60: '龍從頭頂掠過，爪子特寫', 80: '龍水平滑翔，雙翼向兩側完全展開'},
}
RIGHTS = 'FromSoftware / Bandai Namco 及原作者保有權利；僅本機研究參考，不載入遊戲，再分發許可未知。'

sel = []
def add(i, f, cat, note, src, w, h, frames=1):
    sel.append(dict(id=i, file=f, category=cat, note=note, page_url=src['page_url'], image_url=src['image_url'], width=w, height=h, frames=frames,
                    sha256=hashlib.sha256((ROOT / f).read_bytes()).hexdigest(), rights=RIGHTS))
for i, r in rows.items():
    p = ROOT / r['file']
    if i in EXCLUDE: p.unlink(missing_ok=True); continue
    if i in STILLS: add(i, r['file'], *STILLS[i], r, r['width'], r['height'], r['frames'])
    else:
        k = i[-3:]
        cat, label = '招式', GIFS[k]
        im = Image.open(p); n = im.n_frames
        for q in (20, 40, 60, 80):
            im.seek(int(n * q / 100)); out = 'images/ad-frame-%s-%d.png' % (k, q); im.convert('RGB').save(ROOT / out)
            add('ad-frame-%s-%d' % (k, q), out, cat, '（GIF「%s」%d%% 處畫格）%s' % (label, q, FRAME_NOTES[k][q]), r, im.width, im.height, 1)
        add(i, r['file'], '動畫', 'GIF「%s」原檔（第一格全黑，內容以上列 4 個畫格為準）' % label, r, r['width'], r['height'], r['frames'])
for t in glob.glob(str(ROOT / 'images/_t_*.png')): pathlib.Path(t).unlink()
for t in ('_frames.jpg', '_chart1.png', '_chart2.png'): (ROOT / t).unlink(missing_ok=True)

(ROOT / 'selected-images.json').write_text(json.dumps(sel, ensure_ascii=False, indent=2), encoding='utf-8')
cnt = {}
for s in sel: cnt[s['category']] = cnt.get(s['category'], 0) + 1
lines = ['# 輝石龍亞杜拉・逐圖來源', '', '%d 個檔案（%s）；排除 %d 張。其中 5 段 GIF 各取 4 個畫格逐一看過。' % (len(sel), '、'.join('%s %d' % kv for kv in cnt.items()), len(EXCLUDE)), '']
for s in sel:
    lines += ['## %s・%s' % (s['id'], s['category']), s['note'], '', '- [本機圖片](%s) · [來源頁](%s) · [來源圖](%s)' % (s['file'], s['page_url'], s['image_url']),
              '- 尺寸：%d × %d；SHA-256：`%s`' % (s['width'], s['height'], s['sha256']), '']
lines += ['## 排除', ''] + ['- %s：%s' % kv for kv in EXCLUDE.items()]
(ROOT / 'IMAGE-INDEX.md').write_text('\n'.join(lines), encoding='utf-8')
cards = ''.join('<figure><a href="%s"><img loading="lazy" src="%s"></a><figcaption><b>%s・%s</b><br>%s</figcaption></figure>' % (s['file'], s['file'], s['id'], s['category'], html.escape(s['note'])) for s in sel if not s['file'].endswith('.gif'))
(ROOT / 'gallery.html').write_text('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>輝石龍亞杜拉圖鑑</title>'
 '<style>body{background:#10151f;color:#dde;font:14px sans-serif;margin:16px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}figure{margin:0;background:#1a2133;padding:8px;border-radius:6px}img{width:100%%;display:block}figcaption{margin-top:6px;font-size:12px}a{color:#9cf}</style>'
 '<h1>輝石龍亞杜拉圖鑑（%d 個檔案，GIF 以畫格呈現）</h1><p><a href="IMAGE-INDEX.md">逐圖來源</a>・<a href="RESEARCH-LOG.md">研究範圍與缺口</a></p><div class="g">%s</div>' % (len(sel), cards), encoding='utf-8')
print(len(sel), cnt)
