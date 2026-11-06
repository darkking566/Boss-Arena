"""Freeze the selections observed in contact-01..06, four motion sheets and full 048.
These are human-authored observations, not an automatic visual-inspection claim.
Rebuildable Markdown/JSONL library; reference pictures never enter game runtime.
"""
import hashlib, html, json, pathlib, subprocess, sys
from PIL import Image, ImageDraw
ROOT=pathlib.Path(__file__).resolve().parent.parent/'docs/research/ekzykes'
LIB=ROOT/'library'
TOOL=pathlib.Path.home()/'.codex/skills/build-work-library/scripts/work_library.py'
OBS={
1:('外觀','側面長頸、兩後腿與翼肢；白色分枝狀覆蓋物和暗紅潰爛。封面含字。'),
2:('外觀','近正面的低伏頭部與折起翼肢，菌絲遮蓋大部分輪廓。封面有邊框。'),
4:('動作','近身的後腿、腹部及側面翼根；身軀覆蓋白色枝狀菌絲。'),
5:('外觀','頭頸近照，低垂長吻與暗色下顎，白色分枝在鱗片間延伸。'),
6:('腐霧','翼肢附近揚起赭紅混灰塵雲；單幀不判定完整動作順序。'),
7:('腐霧','高抬頸與向下擴散的紅霧，翅膀前緣高舉。'),
8:('外觀','夜間遠景的低身雙翼姿態，菌絲在暗背景下形成白色輪廓。'),
10:('外觀','頭部正面封面；尖牙、長吻與覆蓋頭冠的灰白枝絲。'),
13:('動作','近後腿視角，後肢粗壯彎曲，白色菌絲與局部紅色傷口。'),
14:('動作','低頭近咬時的頭頸轉折，頸部拉向前方。'),
15:('腐霧','雙翼向兩側展開，嘴前橙紅腐霧沿地擴散。'),
16:('腐霧','濃赭紅霧遮住龍體，畫面出現 SCARLET ROT；供異常狀態演出參考。'),
17:('動作','龍首正面探近，翼肢屈起，胸前有大片紅色霧團。'),
18:('外觀','倒下或低伏的龍首與頸側近照；深色口腔和粗糙灰鱗可辨。'),
19:('外觀','較完整的低伏全身，四個接地部位是兩翼肢和兩後腿；不是四腳外加翅膀。'),
20:('外觀','側面封面顯示頸部、翼根紅色傷口與背上的白色菌絲。'),
21:('外觀','側身低伏長頸與翼肢，體表的深灰鱗片和白絲形成分層。'),
22:('外觀','靜止全身：長尾上彎、身體低伏、前方翼肢收攏。'),
26:('動作','四格動圖核對：頸部由右往左橫掃，嘴前吐出紅霧，頭部貼近地面。每段動圖只算一張。'),
27:('動作','四格動圖核對：低頭朝目標連續吐息，腐霧自嘴前向地面推進。每段動圖只算一張。'),
28:('動作','四格動圖核對：短暫升空與後撤，同時向腳下噴出赭紅霧。每段動圖只算一張。'),
29:('動作','四格動圖核對：頸部抬起、胸腹拉長，再向近身地面洩出腐霧。每段動圖只算一張。'),
34:('祈禱','艾格基斯的腐敗物品圖示：腐霧中出現被菌絲覆蓋的龍頭。圖示不等於 Boss 本身新增能力。'),
36:('模型','針桐雙一模型全身正面比例，兩翼肢拱起，尾巴高彎；旁邊漆瓶供尺寸比較。非遊戲原畫。'),
37:('模型','模型高角度前視，觀察兩翼的展開方向和尾部彎曲；不是正式俯視設定稿。'),
38:('模型','模型近側面：翼骨向外延伸，菌絲密集分枝；可見暗紅破損區和翼爪。'),
39:('模型','模型背面：長尾往上捲，翼肢後方大片暗色膜面，菌絲主要沿鱗片與翼緣聚集。'),
40:('模型','模型全身斜前方：身體低伏、翅膀成前肢、兩後腿撐地。'),
42:('影片封面','公開實戰影片封面：近側面頭部、頸部潰爛及彎曲尖角；完整影片未在本輪查看。'),
43:('影片封面','公開實戰影片封面：短暫騰空、兩翼張開，軀幹較細長；不據此推定完整飛行能力。'),
45:('影片封面','公開實戰影片封面：張口與橫向伸展的頸部、嘴邊細小灰白菌絲；完整影片未查看。'),
46:('外觀','正面龍頭近照：黑色張口、細長牙齒與兩側不規則分枝狀鱗角。'),
47:('外觀','無 HUD 的側面近照：灰白菌絲下有深紅裸露傷口；長吻壓低，體表仍可辨粗鱗。'),
48:('原作文字','已查看完整遊戲物品說明：上位龍饗祈禱、由上方吐腐敗、蓄力延長並可跳躍施放；末段直接說明復仇者即使身受腐敗仍保留憎恨。'),
}
EXCLUDED={3:'地圖',9:'獎勵畫面',11:'地圖',12:'獎勵畫面',23:'一般龍心道具，不是艾格基斯外觀',24:'地圖',25:'與 001 的原始構圖相同',30:'其他 Boss',31:'其他 Boss',32:'腐敗眷屬，非艾格基斯',33:'其他 Boss',35:'與 040 為同一照片的近裁切',41:'與模型照片相近的頭部裁切，保守不重複計數',44:'拼接封面龍種辨識不足，排除'}
SOURCES=[
 ('game8-moves','Game8 JP：艾格基斯動作圖解','https://game8.jp/eldenring/442336','Game8 攻略班','2025-11-20', '地上ガス溜め→そのまま右から左へブレス','圖解可區分橫掃、追蹤、後撤噴息、近身咆哮洩霧和大範圍腐霧；相應動圖已另行查看。'),
 ('samurai-melee','SAMURAI GAMERS：艾格基斯攻略','https://jp.samurai-gamers.com/eldenring/er-boss063/','Taku Bou','2022-03-06','滑空攻撃は前に回避','附實戰截圖，作為短暫升空俯衝、近身腿部動作和地上吐息的參考；不採納推廣欄位。'),
 ('gamepressure-field','Gamepressure：艾格基斯攻略','https://www.gamepressure.com/elden-ring/decaying-ekzykes/z4fe3f','Gamepressure','2024-03-05','Beware of its rotting breath','場所與獎勵交叉核對：蓋利德大道南方附近、首周目 38,000 盧恩和一顆龍心；不是本遊戲生命與傷害值。其「所有異常都有效」說法過度概括，不採納。'),
 ('sculptor-origin','SCULPTORS：針桐雙一作品資料','https://sculptors.jp/topics/2835','SCULPTORS / 針桐雙一','2026-01-30','腐りゆくエグズキス','創作者資料頁把該件列在 fan art 作品區，連向 ArtStation 4NLNbk；模型不能稱為 FromSoftware 的官方角色設計稿。'),
 ('concept-catalog','Creative Uncut：艾格基斯概念圖專頁','https://www.creativeuncut.com/gallery-43/er-decaying-ekzykes-concept.html','Creative Uncut','retrieved 2026-11-07','Decaying Ekzykes Concept Art','已確認可讀專頁與目錄，直接圖像請求 403；未查看原圖。官方畫冊頁碼、單圖作者及與遊戲完成版的差異未核實；不計入已看過的圖片數。'),
 ('artbook-publisher','官方畫冊第二冊出版資料','https://www.simonandschuster.com/books/Elden-Ring-Official-Art-Book-Volume-II/FromSoftware/Elden-Ring-Official-Art-Book/9781772942705','FromSoftware / UDON / Simon & Schuster','2023-08-29 ISBN 9781772942705','Volume II includes art of the foes great and small','出版方確認第二冊包含敵人美術，英文版與日文版內容相同；未閱完整書，不能藉此宣稱艾格基斯特定圖頁已獲證實。'),
]
def write(p,s):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s,encoding='utf-8',newline='\n')
def call(*args):
 r=subprocess.run([sys.executable,str(TOOL),*map(str,args)],capture_output=True,text=True,encoding='utf-8')
 if r.returncode:raise RuntimeError(r.stdout+r.stderr)
 return r.stdout
def register(obj,excerpt=None):
 path=LIB/'sources'/(obj['id']+'.json')
 if not path.exists():
  inp=ROOT/'inputs'/(obj['id']+'.json');write(inp,json.dumps(obj,ensure_ascii=False,indent=2));args=['add-source','--project',LIB,'--input',inp]
  if excerpt:
   txt=ROOT/'inputs'/(obj['id']+'.txt');write(txt,excerpt);args+=['--text',txt]
  call(*args)
 return hashlib.sha256(path.read_bytes()).hexdigest()
def record(sid,name,body,evidence,kind='visual',status='confirmed'):
 meta=dict(id=sid,kind=kind,name=name,aliases=['艾格基斯','Ekzykes','腐りゆくエグズキス'],realm='reference',continuity='elden-ring-2022-base-game',status=status,known_from=None,evidence=[evidence])
 target=LIB/'records'/(sid+'.md');content='<!-- tw-work-record:v1 -->\n```json\n'+json.dumps(meta,ensure_ascii=False,indent=2)+'\n```\n\n'+body+'\n'
 if target.exists() and target.read_text(encoding='utf-8')!=content:raise RuntimeError('Refuse to overwrite editable record '+str(target))
 write(target,content)
def main():
 assert len(OBS)==34
 if not LIB.exists():call('init','--project',LIB,'--title','步入腐敗・艾格基斯 原作與視覺參考')
 rows=json.loads((ROOT/'images.json').read_text(encoding='utf-8'));selected=[]
 for x in rows:
  n=int(x['id'][-3:]);x.update(inspection='viewed',inspection_ref='Codex actual visual review 2026-11-07: contact-%02d.jpg'%((n-1)//9+1),selected=n in OBS)
  if n not in OBS:x['exclusion_reason']=EXCLUDED[n];continue
  category,note=OBS[n];x.update(category=category,observation=note)
  if n in (26,27,28,29):x['inspection_ref']+='; four motion keyframes reviewed in '+x['id']+'-motion.jpg'
  if n==48:x['inspection_ref']='Codex full-size view_image ek-ref-048.png, game item description legible'
  x.pop('dhash',None);selected.append(x)
  obj=dict(id=x['id'],kind='image',title=x['id']+' 艾格基斯・'+category,realm='reference',continuity=x['continuity'],edition='Elden Ring 2022 game / separately labelled sculpture or video cover',phase=None,provenance='Original game pixels / third-party sculpture as labelled, actual visual review recorded',rights=x['rights'],url=x['page_url'],image_url=x['image_url'],retrieved_at=x['retrieved_at'],inspection='viewed',inspection_ref=x['inspection_ref'],use='reference-only',local_file='../'+x['file'],image_sha256=x['sha256'])
  sha=register(obj);record(x['id'],obj['title'],note+'\n\n[來源頁]('+x['page_url']+') · [原圖]('+x['image_url']+')\n\n用途：'+category+'。僅研究參考，沒有圖片再分發授權。',dict(unit_id=x['id']+'/u000001',source_sha256=sha,locator='full image / motion keyframes as noted',observation=note))
 for sid,title,url,author,edition,excerpt,note in SOURCES:
  obj=dict(id=sid,kind='web-text',title=title,realm='reference',continuity='elden-ring-2022-base-game',edition=edition,phase=None,author=author,provenance='Actual readable web page inspected 2026-11-07',rights='Original notes and short verification excerpt only',url=url,retrieved_at='2026-11-07')
  sha=register(obj,excerpt);record(sid,title,note+'\n\n[來源]('+url+')',dict(unit_id=sid+'/u000001',source_sha256=sha,start=0,quote=excerpt),kind='rule',status='uncertain' if sid=='concept-catalog' else 'confirmed')
 write(ROOT/'reviewed-inventory.json',json.dumps(rows,ensure_ascii=False,indent=2));write(ROOT/'selected-images.json',json.dumps(selected,ensure_ascii=False,indent=2))
 call('reindex','--project',LIB)
 cards=[]
 for x in selected:
  e=html.escape;cards.append('<article data-category="'+e(x['category'])+'"><a href="'+e(x['file'])+'"><img loading="lazy" src="'+e(x['file'])+'" alt="'+e(x['observation'])+'"></a><div><small>'+e(x['id']+' · '+x['category'])+'</small><p>'+e(x['observation'])+'</p><a href="'+e(x['page_url'])+'">來源頁 ↗</a> · <a href="'+e(x['image_url'])+'">原圖 ↗</a></div></article>')
 filters=['全部']+list(dict.fromkeys(x['category'] for x in selected))
 page='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>艾格基斯・34 張視覺考據</title><style>
*{box-sizing:border-box}body{margin:0;background:#171919;color:#ebe7dd;font:16px/1.65 system-ui,sans-serif}header,main{max-width:1420px;margin:auto;padding:36px 28px}header{border-bottom:1px solid #55443a}h1{font-size:clamp(32px,5vw,58px);margin:0 0 12px;letter-spacing:.05em}small{color:#d3977d}a{color:#e6b79b}nav{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}button{cursor:pointer;border:1px solid #75604d;background:#262724;color:#e9e4da;border-radius:24px;padding:8px 18px;font:inherit}button[aria-pressed=true]{background:#753e32;border-color:#d3977d}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:22px}article{background:#222626;border:1px solid #40423e;border-radius:9px;overflow:hidden}article[hidden]{display:none}img{display:block;width:100%;height:245px;object-fit:contain;background:#101212}article div{padding:18px}p{margin:8px 0 14px}.muted{color:#b5b8ae}.eyebrow{letter-spacing:.25em;color:#c5c3b0;font-size:13px}footer{padding:32px;text-align:center;color:#afb0a5}</style>
<header><div class="eyebrow">ELDEN RING / VISUAL RESEARCH</div><h1>步入腐敗・艾格基斯</h1><p>34 張已查看參考 · 48 張原始候選 · 遊戲像素、招式動圖、模型與原作文字分別標示</p><p class="muted">動圖每段只計一張。模型是針桐雙一的立體創作，影片封面不能代替完整影片。參考圖不載入遊戲，也未取得再分發授權。</p><p><a href="../../bosses/ekzykes.md">考據與角色設計</a> · <a href="IMAGE-INDEX.md">逐圖來源</a> · <a href="https://www.creativeuncut.com/gallery-43/er-decaying-ekzykes-concept.html">概念圖候選（原圖未查看，不計入 34 張）</a></p><nav>'''+''.join('<button data-filter="'+x+'" aria-pressed="'+('true' if x=='全部' else 'false')+'">'+x+'</button>' for x in filters)+'''</nav><p id="count" aria-live="polite">顯示 34 張</p></header><main><div class="grid">'''+''.join(cards)+'''</div></main><footer>2026-11-07 · FromSoftware / Bandai Namco 與各原作者保有權利 · 本機研究用</footer><script>document.querySelectorAll('button').forEach(b=>b.onclick=()=>{document.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));let n=0;document.querySelectorAll('article').forEach(a=>{a.hidden=b.dataset.filter!=='全部'&&a.dataset.category!==b.dataset.filter;if(!a.hidden)n++});document.querySelector('#count').textContent='顯示 '+n+' 張'})</script></html>'''
 write(ROOT/'gallery.html',page)
 index=['# 艾格基斯・逐圖來源','共 34 張；48 張候選已實際查看。原作像素、模型與封面按類別分開。','']
 for x in selected:index+=['## '+x['id']+'・'+x['category'],x['observation'],'','- [本機圖片]('+x['file']+') · [來源頁]('+x['page_url']+') · [原圖]('+x['image_url']+')','- 查看回執：'+x['inspection_ref'],'- SHA-256：`'+x['sha256']+'`','']
 index+=['## 排除清單']+[str(n)+': '+s for n,s in EXCLUDED.items()]
 write(ROOT/'IMAGE-INDEX.md','\n'.join(index))
 write(ROOT/'README.md','# 艾格基斯考據入口\n\n[34 張本機圖鑑](gallery.html) · [角色設計](../../bosses/ekzykes.md) · [逐圖索引](IMAGE-INDEX.md)\n\n`library/records/` 是可編輯正文；`library/index/records.jsonl` 可由正文重建。34 筆圖像記錄與 6 筆文字來源記錄。`selected-images.json` 保留逐圖來源、雜湊及實際查看回執；`reviewed-inventory.json` 保留排除理由。\n\n圖片只供本機研究，不載入遊戲；權利由 FromSoftware、Bandai Namco 及原作者保有。概念圖專頁存在，原圖請求遭 403，沒有繞過、沒有冒充已看過。\n\n本輪採串行人工核對；模型 token 用量不可見，沒有捏造用量或建立無人值守批次。\n')
 print('34 selected images; 40 editable records; gallery and JSONL rebuilt')
if __name__=='__main__':main()
