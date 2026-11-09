"""Freeze the human observations made from contact-01..05 and the two Creative Uncut page captures.
Writes selected-images.json, reviewed-inventory.json, IMAGE-INDEX.md, gallery.html, README.md. Reference pictures never enter game runtime.
"""
import html, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent / 'docs/research/fallingstar'
CU = 'https://www.creativeuncut.com/gallery-43/er-fallingstar-beast-concept.html'
OBS = {
 1: ('招式圖解', 'Fextralife 第一/二階段招式流程圖：甩頭、尾掃、踏地、拋岩、捲球、引力、重力彈、衝鋒、二階段重力反轉與重力光束的接續關係。'),
 3: ('招式圖解', '另一張流程圖：受擊後的轉身踏地（turn 90°）、頭甩連段與拋岩/掃岩分支。用於排連段，不是畫面參考。'),
 2: ('外觀', '黃金樹背景下的全身側面：黑岩甲殼層層翹起、尾巴高舉帶刺、兩片大顎張開成環。'),
 4: ('外觀', '坑洞中低伏的成獸，金色星屑在腳下發光；長尾盤起、顎片併攏像鳥喙。'),
 5: ('重力演出', '頭部近照：白色毛團中央的紫色眼光，背上黑岩縫隙透出紫色重力光。二階段眼睛發紫的依據。'),
 12: ('戰鬥', '火山坑內的實戰畫面：成獸被紫紅光包覆，玩家在前；用於二階段配色。'),
 13: ('影片封面', '一般墜星獸封面：紫色星點自坑底升起，白色毛頭在中央。'),
 14: ('影片封面', '成獸封面：正面低伏、兩側紫光，白毛頭與張開的雙顎。'),
 17: ('外觀', '攻略封面（帶字）：側面頭部，白毛環繞一隻發藍光的眼，長顎平伸。藍色眼光的依據。'),
 18: ('戰鬥', '低身掃動：尾巴高甩、頭部壓地，體側爆出橘色火花與石屑；尾掃與踏地的粉塵參考。'),
 19: ('外觀', '帶字封面：張開的環狀大顎、背刺、尾巴上捲，臀部透出紫光。'),
 20: ('外觀', '帶字封面：完整側身站姿，四肢細長、尾巴盤成問號形。'),
 21: ('外觀', '無字近照：大顎張開、尾巴高舉，黑岩背上散布紫色結晶。背部散碎結晶的直接參考。'),
 22: ('外觀', '帶字封面：紫紅天空下側身，尾巴與顎片的剪影比例清楚。'),
 24: ('戰鬥', '直播截圖：成獸低頭前衝，頭部與玩家同高；衝鋒時的身體壓低姿勢。'),
 25: ('戰鬥', '捲球或撞地瞬間：金色碎石與塵爆遮住半個畫面。捲球落地與踏地爆裂的塵土參考。'),
 26: ('同人插畫', 'MIKLIX 同人插畫：成獸自口前射出紫色重力光束，結晶坑洞背景。非官方，僅作光束氣氛參考。'),
 27: ('同人插畫', 'MIKLIX 同人插畫風格封面：金色光照的成獸張顎俯衝。非官方。'),
 28: ('影片封面', '帶字封面：白毛頭與黑紫甲殼特寫，背上金色碎屑。'),
 29: ('戰鬥', '帶字封面：玩家仰望張開的大顎，顎片內側的鋸齒清楚。'),
 30: ('重力演出', '重力場：多道紫色光柱與浮起的碎石環繞成獸，畫面整片染紫。引力崩落/重力反轉的特效依據。'),
 32: ('重力演出', '紫色重力場中成獸高舉，周圍有大量紫星點與白色碎片；重力反轉把玩家拋起時的配色。'),
 33: ('戰鬥', '結晶坑道金色地面：成獸身上泛藍光，玩家在前景。'),
 34: ('戰鬥', '帶字封面：蓋利德火山岩坡上的側身甩頭，頭部伸長。'),
 35: ('重力演出', '帶字封面：紫色爆散光與漂浮的毛頭；重力彈命中的炸裂感。'),
 36: ('戰鬥', '帶字封面：成獸躍起、腳下塵爆，身上紫色裂光；捲球前躍起的姿勢參考。'),
 37: ('重力演出', '帶字封面：背景紫色重力柱與飛石，成獸前探。'),
 38: ('戰鬥', '坑道內捲成岩球的成獸，外殼尖刺朝外、表面泛金光。捲球造型的直接參考。'),
 39: ('外觀', '帶字封面：高處正面，白毛頭、張開雙顎、尾巴後翹。'),
 40: ('戰鬥', '坑道近照：大顎劃過玩家，顎尖紫光，背毛被橘光照亮；甩顎的弧線參考。'),
 41: ('同人插畫', 'MIKLIX 同人插畫：成獸正面低伏，彎角狀大顎與蓬鬆白毛。非官方。'),
 42: ('重力演出', '帶字封面：成獸全身布滿紫色星光，雙顎展開。二階段全身發光的參考。'),
 44: ('戰鬥', '高原實戰：成獸高立，玩家與骨灰在前，背景紫色雷光。'),
 45: ('外觀', '4K 無 HUD 側面：四肢細長、背甲板片翹起、尾巴高捲成弧，尾刺一路到尾端。全身比例的主參考。'),
 46: ('戰鬥', '低角度近身：成獸壓低前衝，甲殼板片與尾刺填滿畫面。'),
 47: ('戰鬥', '「ENEMY FELLED」畫面：倒地的成獸與地上火光，尾刺弧線清楚。'),
 48: ('外觀', '帶字封面：張顎側身、尾巴上捲，臀部紫光。'),
 49: ('戰鬥', '帶字封面：成獸在石階上張顎，胸前紅光（玩家攻擊特效）。'),
 52: ('戰鬥', '草地實戰：成獸揚起大片塵土，玩家正面迎擊；踏地與衝鋒的塵雲參考。'),
 54: ('影片封面', '合成封面：亞斯泰爾與墜星獸並列，可對照兩者的頭部與體型。剪貼合成，非官方場景。'),
 55: ('重力演出', '雪地實戰封面：成獸自口部射出紫色重力光束，光束周圍有紫色飛屑。二階段重力光束的依據。'),
 57: ('戰鬥', '近距離：白毛頭內透出粉紫光，大顎張開掃過玩家。'),
 58: ('外觀', '帶字封面：低角度仰拍，背刺與尾刺像鋸齒，顎片高舉。'),
 59: ('重力演出', '實戰：紫色雷光包覆成獸，雙顎與頭部高舉；重力場蓄力的配色參考。'),
}
EXCLUDED = {6: '地圖', 7: '地圖', 8: '地圖', 9: '獎勵畫面', 10: '獎勵畫面', 11: '獎勵畫面', 15: '通用主視覺，非本 Boss', 16: '通用主視覺，非本 Boss',
            23: '純文字封面', 31: '通用主視覺，非本 Boss', 43: '小插圖，看不清本體', 50: '通用主視覺，非本 Boss',
            51: '顏色被改成紅粉色，可能是模組或調色，不當作原作配色', 53: '亞斯泰爾的同人插畫，非本 Boss', 56: '純文字封面（模組 Reforged）'}
CONCEPT = [
 dict(id='fs-concept-01', file='concept/cu-fallingstar-beast-concept.png', category='概念圖', page_url=CU, image_url=CU,
      observation='官方概念圖（Creative Uncut 收錄）：後腿立起的黑岩獸，兩片大顎併成環形、頭部白毛團、尾巴帶刺。顎片與白毛的造型以此為準。',
      inspection_ref='Chrome 正常載入頁面後截圖；直接圖片網址回 403，未繞過'),
 dict(id='fs-concept-02', file='concept/cu-astel-naturalborn-art.png', category='概念圖', page_url=CU, image_url=CU,
      observation='亞斯泰爾的官方美術（同頁相關圖）：同屬「無光彼方」的外星生物，用於重力與星空色調的背景設定，不是本 Boss 外觀。',
      inspection_ref='Chrome 正常載入頁面後截圖；直接圖片網址回 403，未繞過'),
]
RIGHTS = 'Copyright remains with FromSoftware / Bandai Namco and original owner; redistribution not granted'
def write(p, s): p.write_text(s, encoding='utf-8', newline='\n')
def main():
    assert not set(OBS) & set(EXCLUDED)
    rows = json.loads((ROOT / 'images.json').read_text(encoding='utf-8')); selected = []
    assert {int(x['id'][-3:]) for x in rows} == set(OBS) | set(EXCLUDED), '每張候選都要有結論'
    for x in rows:
        n = int(x['id'][-3:]); x.update(inspection='viewed', inspection_ref='Claude actual visual review 2026-11-09: contact-%02d.jpg' % ((n - 1) // 12 + 1), selected=n in OBS)
        x.pop('dhash', None)
        if n not in OBS: x['exclusion_reason'] = EXCLUDED[n]; continue
        x['category'], x['observation'] = OBS[n]; selected.append(x)
    for c in CONCEPT: c.update(inspection='viewed', use='reference-only', retrieved_at='2026-11-09', rights=RIGHTS, selected=True)
    selected = CONCEPT + selected
    assert all((ROOT / x['file']).exists() for x in selected)
    write(ROOT / 'reviewed-inventory.json', json.dumps(rows, ensure_ascii=False, indent=2))
    write(ROOT / 'selected-images.json', json.dumps(selected, ensure_ascii=False, indent=2))
    e = html.escape; n = len(selected)
    cards = ''.join('<article data-category="%s"><a href="%s"><img loading="lazy" src="%s" alt="%s"></a><div><small>%s · %s</small><p>%s</p><a class="src" href="%s">來源頁</a></div></article>'
                    % (e(x['category']), e(x['file']), e(x['file']), e(x['observation']), e(x['id']), e(x['category']), e(x['observation']), e(x['page_url'])) for x in selected)
    filters = ['全部'] + list(dict.fromkeys(x['category'] for x in selected))
    buttons = ''.join('<button data-filter="%s"%s>%s</button>' % (e(f), ' class="on"' if f == '全部' else '', e(f)) for f in filters)
    write(ROOT / 'gallery.html', '''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>墜星成獸視覺考據</title><style>
*{box-sizing:border-box}body{margin:0;background:#15141b;color:#ebe6f5;font:16px/1.65 system-ui,sans-serif}header,main{max-width:1420px;margin:auto;padding:32px 20px}
header{border-bottom:1px solid #4a3f6b}h1{font-size:clamp(30px,5vw,54px);margin:0 0 10px}.eyebrow{color:#a77bff;letter-spacing:.2em;font-size:13px}.muted{color:#a9a2bb}
nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}button{background:#24212f;color:inherit;border:1px solid #4a3f6b;border-radius:999px;padding:6px 14px;font:inherit;cursor:pointer}button.on{background:#a77bff;color:#15141b}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}article{background:#1f1d28;border:1px solid #332d47;border-radius:10px;overflow:hidden}
article img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:#000}article[data-category="概念圖"] img,article[data-category="招式圖解"] img{object-fit:contain}
article div{padding:12px 14px}small{color:#a77bff}p{margin:6px 0}.src{color:#c9b6ff;font-size:14px}</style>
<header><div class="eyebrow">ELDEN RING / VISUAL RESEARCH</div><h1>墜星成獸</h1><p>''' + str(n) + ''' 張已查看參考（含 2 張官方概念圖）· 59 張原始候選全部看過 · 遊戲畫面、影片封面、同人插畫與概念圖分開標示</p>
<p class="muted">圖片版權屬 FromSoftware / Bandai Namco 與原作者，僅作研究參考，不進遊戲執行檔。</p><nav>''' + buttons + '''</nav></header><main>''' + cards + '''</main>
<script>document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('on',x===b));
document.querySelectorAll('article').forEach(a=>a.style.display=b.dataset.filter==='全部'||a.dataset.category===b.dataset.filter?'':'none');});</script></html>''')
    index = ['# 墜星成獸・逐圖來源', '共 %d 張（2 張官方概念圖 + %d 張遊戲/影片參考）；59 張候選全部實際看過。' % (n, n - 2), '']
    for x in selected:
        index += ['## %s・%s' % (x['id'], x['category']), x['observation'], '', '- [本機圖片](%s) · [來源頁](%s) · [原圖](%s)' % (x['file'], x['page_url'], x['image_url']), '- 查看回執：' + x['inspection_ref']]
        if 'sha256' in x: index.append('- SHA-256：`%s`' % x['sha256'])
        index.append('')
    index += ['## 排除清單'] + ['- fs-ref-%03d：%s' % (k, v) for k, v in EXCLUDED.items()]
    write(ROOT / 'IMAGE-INDEX.md', '\n'.join(index) + '\n')
    write(ROOT / 'README.md', '# 墜星成獸考據入口\n\n[%d 張本機圖鑑](gallery.html) · [角色設計](../../bosses/fallingstar.md) · [逐圖索引](IMAGE-INDEX.md)\n\n'
          '- `images/`、`images.json`、`candidates.json`：`test/collect_fallingstar_refs.py` 下載的原始候選與雜湊。\n'
          '- `selected-images.json`、`reviewed-inventory.json`、本頁圖鑑：`test/finalize_fallingstar_refs.py` 依人工觀察產生。\n'
          '- `concept/`：Creative Uncut 頁面正常載入後的截圖（直接圖片網址回 403，沒有繞過）。\n\n圖片版權屬原作者，只作研究參考。\n' % n)
    print('%d selected (2 concept); %d excluded' % (n, len(EXCLUDED)))
if __name__ == '__main__': main()
