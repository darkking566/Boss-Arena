"""Apply human inspection notes: drop excluded images, write selected-images.json, IMAGE-INDEX.md, gallery.html.
Notes below are what was actually seen in contact sheets (GIFs: first frame; 044/117/118 also 8 evenly spaced frames). Run after collect_refs.py.
"""
import hashlib, html, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
rows = {r['id']: r for r in json.loads((ROOT / 'images.json').read_text(encoding='utf-8'))}

M = 'Miklix 站自製的 AI 風格插圖（紅臉惡魔、長白鬍），與原作設計不符，會誤導'
EXCLUDE = {
 'mg-ref-001': '地圖（聖域雪原傳送門位置）', 'mg-ref-002': '雪原傳送門，沒有蒙格', 'mg-ref-003': '地圖（蒙格溫王朝宮殿路線）',
 'mg-ref-004': '洞窟岔路標示，沒有蒙格', 'mg-ref-007': '調香瓶選單畫面（只有 UI）',
 'mg-ref-031': '開場動畫，與 mg-ref-058 同一鏡頭（較小）', 'mg-ref-032': '同上（重複開場鏡頭）', 'mg-ref-033': 'Game8 標題縮圖，與開場鏡頭重複',
 'mg-ref-034': '同上（重複開場鏡頭）', 'mg-ref-035': '地圖', 'mg-ref-050': '地圖（王城地下）', 'mg-ref-055': '開場鏡頭重複',
 'mg-ref-059': 'mg-ref-058 的縮小版', 'mg-ref-060': '地圖', 'mg-ref-061': '地圖', 'mg-ref-062': '地圖', 'mg-ref-068': '地圖',
 'mg-ref-070': '蒙格的枷鎖取得路線，沒有蒙格', 'mg-ref-071': '取得蒙格的枷鎖的 UI', 'mg-ref-072': '枷鎖位置標示，沒有蒙格',
 'mg-ref-073': '地圖', 'mg-ref-074': '地圖', 'mg-ref-080': 'mg-ref-079 的裁切版', 'mg-ref-081': '開場鏡頭重複（小圖）',
 'mg-ref-086': '取得枷鎖 UI', 'mg-ref-089': '與官方畫作 mg-ref-109 相同（較小、有壓縮）', 'mg-ref-090': '地圖', 'mg-ref-091': '地圖',
 'mg-ref-093': '另一隻 Boss（黃金樹之影的拉塔恩戰），不是蒙格',
}
EXCLUDE.update({'mg-ref-%03d' % i: M for i in range(94, 106)})
NOTES = {
 'mg-ref-005': ('招式', '一階段三叉戟連段：暗色巨體在破敗神殿前揮擊，碎石飛濺'),
 'mg-ref-006': ('招式', '「蒙格的枷鎖」：金色符文在地面兩側鋪開、金光柱把他壓跪在地（玩家道具，本遊戲改編成被動演出參考）'),
 'mg-ref-008': ('招式', '涅斐（Nihil）：畫面全紅、上方血霧爆散，玩家腳下紅色咒環、頭上血色符印，「BLOOD LOSS」'),
 'mg-ref-009': ('招式', '二階段有翼：血焰斜劈拉出一道長長的紅色光帶'),
 'mg-ref-010': ('外觀', '特寫渲染：滿頭黑色捲角（被紅光染紅）、金繡長領帶、紅色頸巾、利爪'),
 'mg-ref-011': ('場景', '擊敗後取得蒙格的大盧恩；神殿遺跡與星空、地上一灘血'),
 'mg-ref-012': ('場景', '「預兆」蒙格被擊倒，掉落鮮血猛禽爪（Bloodflame Talons）'),
 'mg-ref-013': ('場景', '戰鬥場地：紅色火光照亮的神殿遺跡、地上點點血焰'),
 'mg-ref-014': ('招式', '倒數「duo」：玩家頭上懸著紅色符陣，腰間一圈咒環'),
 'mg-ref-015': ('招式', '血之咒環套在玩家身上（紅色符文圓圈）'),
 'mg-ref-016': ('招式', '「nihil」：全場紅光、頭頂血色符陣、玩家腳下咒環，失血'),
 'mg-ref-017': ('外觀', '二階段：巨大黑羽翼完全張開，地面燃燒血焰'),
 'mg-ref-018': ('招式', '血焰三叉戟大橫掃：長紅色弧線、碎石崩飛'),
 'mg-ref-019': ('招式', '有翼騰空、手中聚血焰，地上一條火線'),
 'mg-ref-020': ('招式', '玩家身上咒環；蒙格持戟遠處'),
 'mg-ref-021': ('招式', '儀式：蒙格頭頂上方浮現多層血色漩渦光環'),
 'mg-ref-022': ('招式', '「nihil」第二次：天空血霧爆開、玩家咒環亮起'),
 'mg-ref-023': ('招式', '有翼下砸：地面裂開，兩側火線'),
 'mg-ref-024': ('外觀', '飛行中的有翼蒙格掠過拱門，下方火光'),
 'mg-ref-025': ('招式', '有翼投擲血焰：手中紅光彈'),
 'mg-ref-026': ('外觀', '開場仰視：雙臂張開，右手持華麗金色長戟（戟身螺旋雕飾、尖端金飾），身後星空神殿'),
 'mg-ref-027': ('招式', '「nihil」：玩家腳下紅色咒環，天空血爆'),
 'mg-ref-028': ('招式', '二階段儀式：有翼蒙格上空出現旋轉血環，地面一圈血焰'),
 'mg-ref-029': ('外觀', '二階段：三叉戟整支燃著血焰（紅色火焰包覆），羽翼暗黑'),
 'mg-ref-030': ('場景', '擊敗畫面：取得大盧恩，神殿階梯與滿地血跡'),
 'mg-ref-036': ('招式', '（GIF 第一格）一階段持戟逼近，黑袍巨體'),
 'mg-ref-037': ('招式', '（GIF 第一格）近身揮戟，地上血焰'),
 'mg-ref-038': ('招式', '（GIF 第一格）正面衝來，戟橫在身前'),
 'mg-ref-039': ('招式', '（GIF 第一格）左側拖出一條血焰火線'),
 'mg-ref-040': ('招式', '（GIF 第一格）彎身下刺，地面血漬'),
 'mg-ref-041': ('招式', '（GIF 第一格）腳下紅色咒紋，蓄力'),
 'mg-ref-042': ('招式', '（GIF 第一格）遠距離，玩家舉大劍'),
 'mg-ref-043': ('招式', '（GIF 第一格）舉戟、身後火光'),
 'mg-ref-044': ('招式', '（GIF，看 8 格）血柱沖天後，上空留下一個旋轉的血色漩渦光環、地面成片血焰持續燃燒'),
 'mg-ref-045': ('招式', '（GIF 第一格）紅黑血霧包住身體'),
 'mg-ref-046': ('招式', '（GIF 第一格）低身揮擊，地上血泊'),
 'mg-ref-047': ('招式', '二階段：羽翼張開，前方一排血焰噴泉沖起'),
 'mg-ref-048': ('招式', '空中俯衝：紅色血焰從上方炸開'),
 'mg-ref-049': ('外觀', '「預兆」蒙格標題卡：較暗的長袍、在王城地下的大教堂'),
 'mg-ref-051': ('招式', '「預兆」蒙格的血之恩賜（寬弧）：一道紅色血霧大範圍噴出'),
 'mg-ref-052': ('外觀', '「預兆」蒙格近照：金飾與燃火三叉戟'),
 'mg-ref-053': ('招式', '「預兆」蒙格：地面一片血焰火海、火星飛濺'),
 'mg-ref-054': ('場景', '米凱拉的繭：巨大肉色繭卡在骨盆形石座上，一隻乾枯的手伸出'),
 'mg-ref-056': ('招式', '一階段：地上長長一道血焰火線'),
 'mg-ref-057': ('招式', '涅斐：血柱螺旋纏繞玩家，腳下白紅咒環'),
 'mg-ref-058': ('外觀', '開場高解析（3834×1880）：滿頭捲角、紅頸巾、金繡雙長領帶、左肩金色聖物匣肩甲、右手長戟、雙臂張開'),
 'mg-ref-063': ('外觀', '開場另一角度：金色肩甲細節、垂下的紅布、黑色袖口與爪手'),
 'mg-ref-064': ('外觀', '一階段全身：直立持戟、黑袍拖地，玩家在前'),
 'mg-ref-065': ('招式', '二階段：羽翼張開、前方一大片血焰浪'),
 'mg-ref-066': ('外觀', '開場正面：戟身細節（金色螺旋）'),
 'mg-ref-067': ('場景', '進入「蒙格溫王朝宮殿」地名畫面'),
 'mg-ref-069': ('外觀', '同為「忌子」一族（推定為雙胞胎兄弟摩爾格特）：灰白皮膚、角與毛，作為忌子造型對照'),
 'mg-ref-075': ('外觀', '動畫「親愛的米凱拉」：側臉滿角、金色肩甲巨大且雕花繁複'),
 'mg-ref-076': ('招式', '倒數「très」：咒環化成紅色血柱'),
 'mg-ref-077': ('外觀', '二階段羽翼張開的正面，左右地上血焰'),
 'mg-ref-078': ('外觀', '忌子一族對照（推定摩爾格特，王城）：長袍、角、杖'),
 'mg-ref-079': ('招式', '二階段儀式：羽翼、頭頂血色漩渦光環灑下血雨，地上一圈血焰'),
 'mg-ref-082': ('招式', '咒環套在玩家身上，金色靈體協助'),
 'mg-ref-083': ('招式', '「nihil」：玩家被紅色咒環包圍，全場紅光'),
 'mg-ref-084': ('外觀', '二階段背後近照：黑羽、金色肩甲、捲角、袍上紅布'),
 'mg-ref-085': ('外觀', '三聯圖：血焰三叉戟（黑色鋸齒戟尖）、全身、捲角特寫'),
 'mg-ref-087': ('外觀', '二階段在神殿中央展翼，四周火海'),
 'mg-ref-088': ('場景', '空場地：紅光照亮的神殿遺跡、墓碑、兩側火光'),
 'mg-ref-092': ('外觀', '開場正面細節：雙長領帶上的繁複金繡、胸前垂掛的金鏈、紅頸巾、雙臂外張'),
 'mg-ref-106': ('外觀', '開場仰視（IGN 版本）：星空、長戟、神殿柱'),
 'mg-ref-107': ('官方概念圖', 'Creative Uncut 收錄「Mohg, Lord of Blood」設定（正面＋背面）：黑色捲角堆成頭冠、黑金屬般皮膚、雙條金繡長領帶、紅色頸巾、左肩教堂造型金色聖物匣肩甲配黑紗、背後太陽狀金繡、黑色爪手配金手環'),
 'mg-ref-108': ('官方概念圖', '「Mohg Phase 2」設定：一對巨大破碎黑羽翼（翼關節帶爪）、三叉戟是黑色鋸齒三尖配金色圓環護手'),
 'mg-ref-109': ('官方畫作', '「Mohg and Miquella」：蒙格懷抱沉睡的米凱拉（長金髮）、左側長戟、背景大月'),
 'mg-ref-110': ('官方概念圖', '忌子（Omen）設定：佝僂、身上長滿腫瘤與角（同族造型參考）'),
 'mg-ref-111': ('官方概念圖', '忌子設定：全身長滿彎角（角是忌子的特徵）'),
 'mg-ref-112': ('官方概念圖', '忌子裝備設定（血肉瘤狀盔甲）'),
 'mg-ref-113': ('官方概念圖', '蒙格的信徒「血之貴族」設定：黑袍、紅色護具、怪異頭冠'),
 'mg-ref-114': ('官方概念圖', '白面具法雷（血指信徒）的裝備 3D 設定（三視）'),
 'mg-ref-115': ('官方畫作', '雙胞胎摩爾格特與拉塔恩交戰（忌子姿態參考）'),
 'mg-ref-116': ('官方畫作', '「恐怖的預兆」碎裂者（摩爾格特化身）設定：破布長袍、角與尾、木杖'),
 'mg-ref-117': ('招式', '（GIF，看 8 格）交感儀式：背對鏡頭舉起三叉戟，周圍泛起黑色波紋，接著血紅放射狀爆光吞沒全場；袍背太陽狀金繡'),
 'mg-ref-118': ('招式', '（GIF，看 8 格）二階段變身：天上亮起血色光點→膨脹成血球→球爆開、黑羽翼展開、黑色羽毛飄落'),
 'mg-ref-119': ('招式', '（GIF 第一格）武器技「血之恩賜儀式」：玩家舉戟，四周墓碑下站起血色人影'),
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
lines = ['# 鮮血君王蒙格・逐圖來源', '',
         '%d 張採用（%s）；排除 %d 張。GIF 只看第一格（044／117／118 另看 8 格），不冒稱完整動作分析。' % (len(sel), '、'.join('%s %d' % kv for kv in cnt.items()), len(EXCLUDE)), '']
for s in sel:
    lines += ['## %s・%s' % (s['id'], s['category']), s['note'], '',
              '- [本機圖片](%s) · [來源頁](%s) · [來源圖](%s)' % (s['file'], s['page_url'], s['image_url']),
              '- 尺寸：%d × %d；SHA-256：`%s`' % (s['width'], s['height'], s['sha256']), '']
lines += ['## 排除', ''] + ['- %s：%s' % kv for kv in EXCLUDE.items()]
(ROOT / 'IMAGE-INDEX.md').write_text('\n'.join(lines), encoding='utf-8')

cards = ''.join('<figure><a href="%s"><img loading="lazy" src="%s"></a><figcaption><b>%s・%s</b><br>%s</figcaption></figure>'
                % (s['file'], s['file'], s['id'], s['category'], html.escape(s['note'])) for s in sel)
(ROOT / 'gallery.html').write_text(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>鮮血君王蒙格圖鑑</title>'
    '<style>body{background:#12151c;color:#dde;font:14px sans-serif;margin:16px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}'
    'figure{margin:0;background:#1b2030;padding:8px;border-radius:6px}img{width:100%%;display:block}figcaption{margin-top:6px;font-size:12px}a{color:#9cf}</style>'
    '<h1>鮮血君王蒙格圖鑑（%d 張）</h1><p><a href="IMAGE-INDEX.md">逐圖來源</a>・<a href="RESEARCH-LOG.md">研究範圍與缺口</a></p><div class="g">%s</div>' % (len(sel), cards),
    encoding='utf-8')
print(len(sel), cnt)
