"""Apply human inspection notes: drop excluded images, write selected-images.json, IMAGE-INDEX.md, gallery.html.
Notes below are what was actually seen in contact sheets (GIFs: first frame only). Run after collect_refs.py.
"""
import hashlib, html, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
rows = {r['id']: r for r in json.loads((ROOT / 'images.json').read_text(encoding='utf-8'))}

EXCLUDE = {
 'gd-ref-001': '只有走下樓梯的玩家背影，沒有 Boss',
 'gd-ref-017': '遺落法魯姆．亞茲拉地圖，沒有角色',
 'gd-ref-018': '畫面主體是玩家的紅色火焰技能，Boss 只是背景',
 'gd-ref-035': '梅琳娜（劇情圖），不是神皮雙人組',
}
NOTES = {
 'gd-ref-002': ('場景', '雙人組同場：使徒在遠處持長柄鐮刃，貴人在左；玩家施放輝石劍陣，可見石柱與燭台的場地'),
 'gd-ref-003': ('招式', '使徒二階段「黑焰龍捲」：黑煙與白色火星組成的圓盤席捲整個場地，是本作大招與龍捲特效的主參考'),
 'gd-ref-004': ('場景', '血量約六成時的場地全景：石棺、骸骨、燭台滿地，使徒立於遠處，貴人在左側石柱旁'),
 'gd-ref-005': ('招式', '貴人「神皮之輪」：身體整個滾向玩家，白色圓胖軀體與揚起的塵土'),
 'gd-ref-006': ('招式', '雙人同時進攻：貴人圓胖身軀在前、使徒在後，兩者站位成一前一後'),
 'gd-ref-007': ('招式', '使徒二階段伸展攻擊：上身皮囊拉長，長袍垂在地上，玩家出血'),
 'gd-ref-008': ('場景', '使徒遠距「旋轉武器」，場地有石柱與蠟燭'),
 'gd-ref-009': ('外觀', '貴人臉部特寫：兜帽下蒼白的臉、厚重層疊的皮肉與肩部金屬環；前方是玩家火焰爪擊'),
 'gd-ref-010': ('招式', '貴人旋轉橫掃，白色刀風圓弧'),
 'gd-ref-011': ('招式', '使徒高舉長柄武器過頭斬，旁邊橘色火焰是玩家的戰技'),
 'gd-ref-012': ('外觀', '貴人二階段捲成球：腹部朝上、露出皮膚褶皺與臉孔紋路'),
 'gd-ref-013': ('招式', '使徒黑焰橫掃：白煙與火星湧過，使徒持鞭狀伸長的武器'),
 'gd-ref-014': ('場景', '「巨敵殲滅」時的白煙與獎勵視窗（鍛造石採礦者鈴鐺 [4]、戰灰：黑焰龍捲），確認掉落'),
 'gd-ref-015': ('場景', '攻略標題圖：貴人蹲伏在石棺上、使徒站在遠處，是開場站位的參考'),
 'gd-ref-016': ('場景', '開場畫面：貴人蹲在石棺上、使徒直立，沙塵與火盆；同 015 的原始畫面'),
 'gd-ref-019': ('招式', '使徒面對玩家的藍色劍氣，使徒以長柄武器揮擊'),
 'gd-ref-020': ('外觀', '貴人在火山官邸紅色大廳（單挑版）：圓胖軀幹與長尾'),
 'gd-ref-021': ('招式', '玩家的藍色魔法護盾擋下貴人攻擊（Boss 在背景）'),
 'gd-ref-022': ('場景', '雙人組場地，貴人二階段飛躍落下（右上方白色圓影）'),
 'gd-ref-023': ('招式', '貴人細劍突刺：長長的細劍從身側刺出，尾巴擺動'),
 'gd-ref-024': ('招式', '貴人滾動／衝撞，揚起塵土'),
 'gd-ref-025': ('招式', '貴人在紅色大廳伏低、出招前蓄勢'),
 'gd-ref-026': ('場景', '雙人組場地全景，蠟燭、石棺、白髮羽織斗篷的玩家'),
 'gd-ref-027': ('外觀', '使徒（多米努拉風車村單挑版）：細長身影、手持細長鐮刃，站在塔前'),
 'gd-ref-028': ('外觀', '使徒被攻擊的瞬間：白袍細長、袍襬長及地面'),
 'gd-ref-029': ('場景', '雙人組場地：使徒在遠處、貴人在石棺旁，煙塵揚起'),
 'gd-ref-030': ('外觀', '使徒面向玩家，長袍與握持的長柄武器'),
 'gd-ref-031': ('招式', '使徒黑焰消散、身體粉碎成黑煙與白火星的瞬間'),
 'gd-ref-032': ('招式', '使徒向前突刺，細長武器伸出'),
 'gd-ref-033': ('外觀', '拼圖：左為貴人二階段的圓球身軀（腹部圓盤紋與臉孔），右為使徒站在金色門前'),
 'gd-ref-034': ('外觀', '拼圖：左為貴人（紅光下，兜帽、環狀肩飾、手持細劍），右為使徒全身（兜帽額前紫寶石、層疊皮袍、護腕與長柄鐮刃）。全身最清楚的一張'),
 'gd-ref-036': ('外觀', '雙人組同框：使徒持長柄鐮刃、貴人圓胖身軀，腹部有臉孔'),
 'gd-ref-037': ('概念圖', '使徒概念圖（兩個視角）：佝僂細長、兜帽縫線、胸前鍊飾與寶石、手腕護環、拖地的長袍；Creative Uncut 頁面標題為 Godskin Apostle Concept Art'),
 'gd-ref-038': ('概念圖', '貴人概念圖（大圖＋縮小圖）：圓胖身軀、兜帽小頭、腹部布滿臉孔的圓形紋、藍灰色彎曲長尾；Creative Uncut 頁面標題為 Godskin Noble Concept Art'),
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
lines = ['# 神皮雙人組・逐圖來源', '',
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
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>神皮雙人組圖鑑</title>'
    '<style>body{background:#12151c;color:#dde;font:14px sans-serif;margin:16px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}'
    'figure{margin:0;background:#1b2030;padding:8px;border-radius:6px}img{width:100%%;display:block}figcaption{margin-top:6px;font-size:12px}a{color:#9cf}</style>'
    '<h1>神皮雙人組圖鑑（%d 張）</h1><p><a href="IMAGE-INDEX.md">逐圖來源</a>・<a href="RESEARCH-LOG.md">研究範圍與缺口</a></p><div class="g">%s</div>' % (len(sel), cards),
    encoding='utf-8')
print(len(sel), cnt)
