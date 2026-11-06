"""Freeze the human-reviewed selections and rebuild their searchable work library.
Requires the installed build-work-library skill. Never infers visual inspection from download success.
The observations below were authored after visual inspection of contact-01..04 and full-size 037/047.
"""
import hashlib, html, json, pathlib, subprocess, sys
from PIL import Image, ImageDraw
ROOT=pathlib.Path(__file__).resolve().parent.parent/'docs/research/redwolf'
LIB=ROOT/'library'
TOOL=pathlib.Path.home()/'.codex/skills/build-work-library/scripts/work_library.py'
OBS={
 1:('外觀','正面低伏與紅鬃外輪廓；四足站姿、眼睛為淡冷色亮點。'),
 2:('咬劍','口前橙金長劍及發亮的細粒子；可參考揮劍時頭頸角度。'),
 3:('外觀','紅鬃向後揚起、背部與長尾的整體輪廓。'),
 5:('咬劍','側身移動時的口持曲刃；弧形刃尖與刀光。'),
 6:('咬劍','轉身抬頭的持劍姿態；可參考追斬連接。'),
 7:('輝劍','冷藍色劍體、白亮劍芯與拖尾。單幀無法單獨確定每個法術的施放者。'),
 8:('動作','正面壓近與身軀低伏；前腳落點和蓬鬆鬃毛。'),
 10:('咬劍','彎曲橙金劍光與短促飛撲，後方為玩家召喚物。'),
 15:('咬劍','騰空扭腰的長尾姿勢；前景白狼為玩家召喚物，不是紅狼分身。'),
 16:('輝劍','紅狼拉開距離後場中的冷藍法術；參考遠近攻擊的空間安排。'),
 17:('輝劍','頭部前方聚起的藍光，與地面紅毛形成冷暖對照。'),
 18:('動作','後軀抬高的空翻 / 跳躍單幀；不能由單幀確定完整招式順序。'),
 19:('輝劍','藍色小劍沿橫向分布，參考延遲劍陣的間距。'),
 20:('咬劍','近地迴旋形成寬大的橙金彎月，體軀跟著旋轉。'),
 21:('外觀','側面長尾、暗色四肢與身軀的比例。'),
 22:('外觀','正面逼近、長吻和立耳；後方冷藍法術符光。'),
 23:('輝劍','法術交火時的藍白高亮與細長拖尾；歸屬不由靜態圖推定。'),
 24:('動作','低身轉向，前腿彎曲，長尾反向甩動。'),
 26:('外觀','較近的側面紅鬃與金色飾帶；角色仍為四足狼體。'),
 27:('咬劍','貼地掃斬的光弧與粒子密度。'),
 28:('輝劍','遠處射入的多道藍白光尾，參考飛劍發射節奏的視覺。'),
 31:('咬劍','近距離斬擊時，細刃與寬劍光分開可辨。'),
 33:('動作','無 HUD 的騰空咬劍畫面；前腿伸展、後腿收起、長尾延伸。'),
 37:('外觀','全尺寸側面：蓬亂紅褐長毛、細長四肢、長吻、尖耳，毛髮為多層暗銅色。'),
 38:('外觀','坐姿側面與長尾落地；供待機姿態參考，不加入新的戰鬥能力。'),
 40:('動作','咬劍往下壓的空中姿態，狼體並非直立持武器。'),
 41:('輝劍','藍白法術呈細線與亮點飛過討論室；施法歸屬需連續影像補證。'),
 42:('外觀','近側面頭頸和立耳，紅毛與深色鼻口的對比。'),
 43:('外觀','正面頭部、兩眼高亮、鬃毛從頭後往兩側散開。'),
 44:('咬劍','金白長劍從狼口伸出，尾部水平伸展；近地跳躍輪廓。'),
 45:('外觀','正面接近玩家的站姿，尖耳與長吻清楚；遊戲截圖含 HUD。'),
 46:('外觀','亮眼與長鬃近照；眼睛冷色亮點不等於額外雷電能力。'),
 47:('概念候選','白底正面、側面動勢與曲劍細節；金飾、寶石與繁複毛束。原官方頁碼及單張作者尚未核實。'),
}
EXCLUDED={4:'與 003 相同構圖的另一尺寸',9:'獎勵畫面',11:'地圖',12:'地圖',13:'獎勵畫面',14:'其他紅狼變體的獎勵',25:'獎勵畫面',29:'加框裁切封面，保守不重複計數',30:'地圖',32:'其他獎勵畫面',34:'拉達岡本人，並非紅狼',35:'地圖',36:'裁切近照，保守不重複計數',39:'空場景'}
SOURCES=[
 ('eip-moves','EIP Gaming — How to Beat the Red Wolf of Radagon','https://eip.gg/elden-ring/guides/how-to-beat-the-red-wolf-of-radagon/','DanielD / EIP Gaming','2022-03-24; updated 2022-05-25',
  'Sword Spin – The boss spawns a sword in its mouth',
  '招式表列出撕咬、飛撲、橫斬、迴旋、雙向斬、跳劈、彗星及輝劍；本庫只將動作作為改編依據。'),
 ('gamesradar-delay','GamesRadar+ — Red Wolf of Radagon boss fight','https://www.gamesradar.com/elden-ring-red-wolf-of-radagon-boss-fight/','Joel Franey / GamesRadar+','web edition retrieved 2026-11-07',
  "the Wolf often uses this window to attack",
  '攻略描述輝劍蓄力與狼本體進攻可以重疊；這是延遲劍與本體分開行動的設計依據。'),
 ('exputer-phase','eXputer — Red Wolf of Radagon','https://eldenring.exputer.com/characters/red-wolf-of-radagon','eXputer','web edition retrieved 2026-11-07',
  'The encounter is best understood as one continuing combat phase.',
  '本篇紅狼不以明確變身分隔戰鬥；本遊戲的半血強化須標為改編。'),
 ('creativeuncut-catalog','Creative Uncut — Lesser Red Wolf of Radagon Art','https://www.creativeuncut.com/gallery-43/er-lesser-red-wolf-of-radagon.html','Creative Uncut; gallery lists FromSoftware','web edition retrieved 2026-11-07',
  'Lesser Red Wolf of Radagon Art',
  '可讀頁面確有紅狼美術條目，直接圖片請求遭 403。不能用目錄存在推定本庫轉載圖的官方頁碼。'),
 ('official-artbook','Official publisher — Elden Ring Official Art Book Volume II','https://www.simonandschuster.com/books/Elden-Ring-Official-Art-Book-Volume-II/FromSoftware/Elden-Ring-Official-Art-Book/9781772942705','FromSoftware / UDON Entertainment / Simon & Schuster','English edition 2023-08-29; ISBN 9781772942705',
  'Volume II includes art of the foes great and small',
  '出版方確認第二冊收錄敵人與武器等美術；本次沒有翻閱完整畫冊，沒有核定紅狼頁碼或單圖作者。'),
]

def call(*args):
 r=subprocess.run([sys.executable,str(TOOL),*map(str,args)],capture_output=True,text=True,encoding='utf-8')
 if r.returncode: raise RuntimeError(r.stdout+r.stderr)
 return r.stdout
def write(path,text): path.parent.mkdir(parents=True,exist_ok=True); path.write_text(text,encoding='utf-8',newline='\n')
def register(obj,excerpt=None):
 sid=obj['id']; target=LIB/'sources'/f'{sid}.json'
 if not target.exists():
  inp=ROOT/'inputs'/f'{sid}.json'; write(inp,json.dumps(obj,ensure_ascii=False,indent=2))
  args=['add-source','--project',LIB,'--input',inp]
  if excerpt is not None:
   txt=ROOT/'inputs'/f'{sid}.txt'; write(txt,excerpt); args+=['--text',txt]
  call(*args)
 return hashlib.sha256(target.read_bytes()).hexdigest()
def record(sid,name,body,ev,kind='visual',status='confirmed'):
 meta={'id':sid,'kind':kind,'name':name,'aliases':['紅狼','拉達岡的紅狼','Red Wolf of Radagon'],'realm':'reference','continuity':'elden-ring-2022-base-game','status':status,'known_from':None,'evidence':[ev]}
 target=LIB/'records'/f'{sid}.md'
 content='<!-- tw-work-record:v1 -->\n```json\n'+json.dumps(meta,ensure_ascii=False,indent=2)+'\n```\n\n'+body+'\n'
 if target.exists() and target.read_text(encoding='utf-8')!=content:
  raise RuntimeError('Existing editable record changed; refusing to overwrite: '+str(target))
 write(target,content)
def main():
 if not LIB.exists(): call('init','--project',LIB,'--title','拉達岡的紅狼・本篇考據與視覺參考')
 rows=json.loads((ROOT/'images.json').read_text(encoding='utf-8')); selected=[]; tiles=[]
 for x in rows:
  n=int(x['id'][-3:]); x['inspection']='viewed'; x['inspection_ref']=f'Codex visual inspection 2026-11-07: contact-{(n-1)//12+1:02d}.jpg'+('; full-size image inspected' if n in [37,47] else '')
  x['selected']=n in OBS
  if n not in OBS: x['exclusion_reason']=EXCLUDED[n]; continue
  category,note=OBS[n]; x.update(category=category,observation=note,realm='reference',status='uncertain' if n==47 else 'confirmed')
  x.pop('dhash',None); selected.append(x)
  obj={'id':x['id'],'kind':'image','title':f'{x["id"]} 紅狼・{category}','realm':'reference','continuity':x['continuity'],'edition':'Elden Ring base game screenshot / concept candidate','phase':None,'provenance':'Public third-party page and image; inspected locally. Concept origin is provisional.' if n==47 else 'Original game pixels hosted by a third-party guide; visually inspected locally.','rights':x['rights'],'url':x['page_url'],'image_url':x['image_url'],'retrieved_at':x['retrieved_at'],'inspection':'viewed','inspection_ref':x['inspection_ref'],'use':'reference-only','local_file':'../'+x['file'],'image_sha256':x['sha256']}
  sha=register(obj)
  record(x['id'],obj['title'],f'# {obj["title"]}\n\n{note}\n\n[來源頁]({x["page_url"]}) · [原圖]({x["image_url"]})\n\n用途：{category}。僅本機考據；不作遊戲貼圖或可分發素材。',{'unit_id':x['id']+'/u000001','source_sha256':sha,'locator':'full image; see observation','observation':note},status=x['status'])
  im=Image.open(ROOT/x['file']).convert('RGB'); im.thumbnail((472,264)); tile=Image.new('RGB',(480,300),'#111927'); tile.paste(im,((480-im.width)//2,0)); ImageDraw.Draw(tile).text((8,272),x['id']+(' | CONCEPT: PROVISIONAL' if n==47 else ' | GAME SCREENSHOT'),fill='white'); tiles.append(tile)
 for sid,title,url,author,edition,excerpt,body in SOURCES:
  obj={'id':sid,'kind':'web-text','title':title,'realm':'reference','continuity':'elden-ring-2022-base-game','edition':edition,'phase':None,'author':author,'provenance':'Read through web search/page tools on 2026-11-07; only a short exact verification excerpt retained.','rights':'Short excerpt and original notes for reference; no full article retained.','url':url,'retrieved_at':'2026-11-07'}
  sha=register(obj,excerpt); record(sid,title,'# '+title+'\n\n'+body+'\n\n[來源]('+url+')',{'unit_id':sid+'/u000001','source_sha256':sha,'start':0,'quote':excerpt},kind='rule',status='uncertain' if sid=='creativeuncut-catalog' else 'confirmed')
 write(ROOT/'images.json',json.dumps(rows,ensure_ascii=False,indent=2)); write(ROOT/'selected-images.json',json.dumps(selected,ensure_ascii=False,indent=2))
 for start in range(0,len(tiles),12):
  group=tiles[start:start+12]; sheet=Image.new('RGB',(1440,300*((len(group)+2)//3)),'#111927')
  for i,tile in enumerate(group): sheet.paste(tile,((i%3)*480,(i//3)*300))
  sheet.save(ROOT/f'selected-{start//12+1:02d}.jpg',quality=91)
 cards=[]; md=['# 紅狼參考圖索引','',f'已人工選定 {len(selected)} 張：32 張遊戲圖像＋1 張來源待核實的概念圖候選。地圖、獎勵、其他角色與重複裁切不計入。','']
 for x in selected:
  md += [f'## {x["id"]} · {x["category"]}','',x['observation'],'',f'[本機圖片]({x["file"]}) · [來源頁]({x["page_url"]}) · [原圖]({x["image_url"]})','']
  esc=html.escape
  cards.append(f'<article data-category="{esc(x["category"])}"><a href="{esc(x["file"])}"><img loading="lazy" src="{esc(x["file"])}" alt="{esc(x["observation"])}"></a><div><small>{x["id"]} · {esc(x["category"])}</small><p>{esc(x["observation"])}</p><a href="{esc(x["page_url"])}" target="_blank" rel="noreferrer">來源頁 ↗</a> · <a href="{esc(x["image_url"])}" target="_blank" rel="noreferrer">原圖 ↗</a></div></article>')
 write(ROOT/'IMAGE-INDEX.md','\n'.join(md))
 page='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>紅狼・原作圖像參考</title><style>
 *{box-sizing:border-box}body{margin:0;background:#0c111a;color:#ddd9d3;font:16px/1.7 system-ui,sans-serif}header,main{max-width:1440px;margin:auto;padding:32px}header{border-bottom:1px solid #33404c}h1{font-size:clamp(26px,4vw,48px);color:#f3b875;margin:8px 0}small{color:#91dbff}a{color:#93d9ff}nav{display:flex;gap:8px;flex-wrap:wrap;margin-top:22px}button{background:#182431;color:#eee;border:1px solid #475a6a;padding:8px 16px;border-radius:30px;cursor:pointer}button[aria-pressed=true]{background:#c6894d;color:#111}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}article{background:#141e2a;border:1px solid #2c3a49;border-radius:12px;overflow:hidden}article img{width:100%;height:240px;object-fit:contain;background:#080c13}article div{padding:18px}article p{min-height:80px}article[hidden]{display:none}.note{max-width:1000px;color:#aeb8c4}footer{padding:30px;text-align:center;color:#9ea7b4}</style>
 <header><small>ELDEN RING / RED WOLF OF RADAGON</small><h1>紅鬃、蒼藍輝劍與橙金咬劍</h1><p>33 張已查看參考：32 張遊戲圖像＋1 張概念圖候選。點圖片可看本機完整尺寸。</p><p class="note">概念候選的原官方頁碼及單張作者尚未核實。圖片為研究參考，版權仍屬 FromSoftware、Bandai Namco 及原截圖持有人；沒有載入遊戲，也沒有取得再分發授權。部分法術交火單幀不能確定施放者。<a href="../../bosses/redwolf.md">考據與技能設計</a></p><nav aria-label="圖片分類">'''
 cats=['全部','外觀','咬劍','動作','輝劍','概念候選']
 page+=''.join(f'<button aria-pressed="{str(i==0).lower()}" data-filter="{c}">{c}</button>' for i,c in enumerate(cats))+'</nav></header><main>'+''.join(cards)+'''</main><footer>查核日期：2026-11-07 · 本機參考資料，不是官方素材包。</footer><script>document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelectorAll('article').forEach(x=>x.hidden=b.dataset.filter!=='全部'&&x.dataset.category!==b.dataset.filter)}));</script></html>'''
 write(ROOT/'gallery.html',page)
 print(call('reindex','--project',LIB).strip())
 print('SELECTED',len(selected),'SCREENSHOTS',sum(x['category']!='概念候選' for x in selected),'CONCEPT_CANDIDATES',1)

if __name__=='__main__': main()
