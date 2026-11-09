"""Publish only manually reviewed reference selections, never game content.
Observations were authored after actual view_image calls on 2026-11-09.
The library tool validates metadata/locators, not the truth of visual judgments.
"""
import hashlib, html, json, pathlib, subprocess, sys
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parent.parent
LIB=ROOT/'library'
TOOL=pathlib.Path.home()/'.codex/skills/build-work-library/scripts/work_library.py'
OBS={
1:('外觀','網站封面：正面長吻、額前長角與兩側展開的翼肢，嘴前是霜白氣團。文字不是角色外觀。'),
3:('外觀','斜側低伏的完整龍體，長尾伸向後方；雙翼折起形成兩個寬大支點。解析度較低，只採輪廓。'),
5:('外觀','GameWith 封面中的龍首與頸背近景，長角、灰白覆蓋與局部暗紅膜面可辨；金邊與字框不採用。'),
7:('冰霧','近身畫面中白色霧浪與亮點向外展開，龍首及翼肢有部分被遮住；單幀不能推算持續時間。'),
8:('冰霧','龍頭低垂向右吐出貼地白霧，翼腕仍接地，長尾後揚；適合校對地面吐息起點。'),
10:('外觀','由後腿附近看腹側與長頸；深灰鱗片底色仍在白色覆蓋下露出，翼膜邊緣破碎。'),
11:('動作','仰視近身腿腹與翼根，後腿正抬高；供踩踏蓄力與腹部高度參考，不以單幀量測秒數。'),
12:('動作','升空時雙翼打開、兩隻後腿屈起，長頸上揚；不是四腿再加兩翼的輪廓。'),
13:('冰霧','空中龍體向前下方噴出白霧，雙後腿懸空；作為飛行吐息和直接下墜的視覺區分。'),
14:('外觀','翼根和前方翼肢近照，鱗片粗糙、灰黑底色清楚；邊緣是成束霜白尖片。'),
15:('動作','長吻壓到近身低處，頸部大幅彎曲；有張口和探頸輪廓，不能僅憑靜圖認定已命中。'),
16:('動作','側後方長尾彎成弧線、背棘順脊延伸；地面碎屑是動作環境，不能視作冰晶彈幕。'),
17:('凍傷','原作畫面明示 FROSTBITE，龍在遠處白霧中；可用於凍傷提示參考，不把提示字當技能名稱。'),
18:('冰霧','近身翼肢與龍軀旁有翻起的白霧弧線；紅色部分混有玩家命中特效，不當作龍的火焰。'),
19:('外觀','正面全身網站封面：額前長角、低胸與兩個厚重翼腕，後方兩腳和尾部可分辨。'),
21:('動作','遠景空中龍體與下垂長尾，玩家位於冰湖；可確認飛行高度感，不能用透視圖量體長。'),
22:('外觀','側面近身的翼骨、頸腹與後腿，暗灰鱗面上有白色霜痕，嘴前一側有淡霧。'),
23:('龍饗祈禱','遊戲祈禱圖示：龍頭由上向下噴白霧；這是玩家可使用的龍饗圖示，不能當成額外 Boss 招式。'),
24:('外觀','較高解析度正面張口：黑暗口腔、暗紅內膜、霜白鬚片與粗厚翼腕，翼緣成束尖片。已另看原尺寸。'),
28:('動作','五格抽幀：從湖岸看龍低伏吐出白霧、抬起與展翼，長尾在霧外可辨。抽幀只供姿態對照，整段只計一張。'),
29:('動作','五格抽幀可見正面蓄息、向前白霧、尾部彎曲及抬腿近身動作；不是逐幀招式判定表，整段只計一張。'),
30:('冰霧','五格抽幀：抬頸張口、白色圓浪向外推、龍體俯低收勢；後段另有近身動作，不能合併推算咆哮時間。整段只計一張。'),
31:('龍饗祈禱','玩家施法五格：紅色召喚光先出現，再顯現龍頭，向地面吐出白霧，龍頭消散。是玩家祈禱演出，整段只計一張。'),
34:('冰霧','側面長頸低垂，白霧自龍口沿地面推出，霧中有亮點；藍白色來自冰霧而非火焰。'),
35:('冰霧','較完整的斜側地面吐息，兩側折翼、長尾及背棘仍可辨；嘴前白霧形成寬扇面。'),
36:('外觀','日間正面低伏全身，翼肢朝兩側撐開、頭部居中向前；適合俯視化時保留兩翼腕的辨識度。'),
37:('外觀','公開攻略縮圖中的前方龍體，霜白翼緣與黑灰鱗甲對比明顯。原頁本輪回應 503，只查看此圖，未核實完整影片。'),
38:('動作','龍頸抬高，翼緣向上展開；畫面紅色命中噴濺不作龍本身發紅或噴火的證據。帶第三方轉載水印，原截圖者未知。'),
39:('動作','空中大幅展翼，兩後腳下垂、尾巴在身後延伸，白色暴雪背景襯出暗色翼膜。'),
40:('遊戲攝影','BBuradori 的青藍色遊戲攝影：近身仰視昂首張口與翼腕，白霜亮片突出。只作演出氣氛參考，後製程度未知，不據此定原作底色。'),
44:('動作','玩家文章中的冰湖遠景，龍低伏朝前，翼肢兩側高起；可用於巨大龍體和騎乘角色的尺度感。'),
45:('冰霧','同篇文章的另一個時刻：龍低頭在左前方吐出白霧，雙翼仍折起；與 044 的姿態和鏡頭不同。'),
48:('概念圖','Creative Uncut 收錄的獨立白底圖：兩翼肢、兩後腿、彎起長尾、額前長角；翼膜破碎，霜白條片覆住翼緣和背部，黑灰鱗甲與暗紅膜仍露出。已看完整圖；單張作者、官方畫冊頁碼尚未核實。'),
}
EXCLUDED={
2:'位置地圖；不計角色圖數',4:'Game8 通用網站佔位圖',6:'位置地圖；不計角色圖數',9:'擊敗後龍心獎勵，沒有可用龍體',
20:'與 022 是極近構圖，保留 022，不靠近似畫面湊數',25:'位置地圖',26:'前往湖岸岩台路線，沒有龍體',27:'玩家與拉緹娜站位，沒有龍體',
32:'位置地圖',33:'與 024 同一張圖的龍頭裁切，不重複計數',41:'冰湖環境，沒有龍體',42:'切腹戰灰選單，與冰龍造型無關',43:'梅琳娜對話，非冰龍',46:'擊敗提示，沒有龍體',47:'其他入侵戰，非冰龍',
}
SOURCES=[
('official-frost','官方：凍傷的效果與火焰解除','https://www.bandainamcoent.com/news/elden-ring-introduction-part-1-stats','Bandai Namco Entertainment America','2023-07-19','canon',
 'Applying a Fire/Burning effect to a target that is suffering from Frostbite will remove the Frost debuff.',
 '官方說明凍傷會造成比例生命損失，並在生效期間降低耐力恢復、提高所受傷害；火焰／燃燒可解除。沒有把對手整段凍成冰雕的描述。這是狀態規則，不是玻列琉斯專屬免疫證明。'),
('boss-gamerguides','冰龍歷史、招式與獎勵','https://www.gamerguides.com/elden-ring/database/bosses/mountaintops-of-the-giants-boss/borealis-the-freezing-fog','Gamer Guides','頁面未標完整版本；本輪 2026-11-09 回讀','reference',
 'The ice dragons were once lords of the mountaintops long ago',
 '可讀頁面 Lore 段轉述：冰龍曾是山巔的主人，後遭火焰巨人打敗並驅離頂峰；Description 段記載踩踏、尾掃、冰息與咬擊。分類為二手轉錄，不冒充已親自讀取遊戲資源。'),
('moves-gamewith','踩踏殘霧與空中招式的起手區別','https://gamewith.jp/eldenring/325390','GameWith 編輯部','頁面目前標示 2026-08-31；2026-11-09 回讀','reference',
 'ボレアリスの踏みつけには、冷気蓄積の氷霧が発生する。',
 '本體飛龍動作之外，踩踏會留下累積冷氣的霧；遠距吐息、空中吐息、落下攻擊與咆哮範圍霧各有辨識。口前有無冷氣可幫助分辨空中吐息與撲落。本文未給可直接採信的完整逐幀招式表。'),
('phase-gamepressure','冰結湖遭遇與單一階段敘述','https://www.gamepressure.com/elden-ring/borealis-the-frozen-fog/zffcdb','Gamepressure 攻略編輯部','2024-03-05 更新','reference',
 'The fight only consists of one phase.',
 '記載在巨人山頂冰結湖中央觸發風雪與戰鬥，擊敗給龍心並解鎖可在龍饗教堂換取的祈禱。文中說戰鬥只有一階段；不因此否認低血量的招式選擇可能改變。'),
('roar-eip','公開咆哮與吐息動圖','https://eip.gg/elden-ring/guides/how-to-beat-borealis-the-freezing-fog/','DanielD / EIP Gaming','2022-05-25','reference',
 'this attack inflicts AOE frostbite.',
 '正文區分 Frost Breath、Flying Frost Breath、Frost Roar、Bite、Tail Whip。已抽看原頁三段 GIF 的五個時間位置；GIF 是觀察來源，不把攻略作者的所有耐性陳述當成原作定論。'),
('low-hp-samurai','低血量咆哮的攻略觀察','https://jp.samurai-gamers.com/eldenring/er-boss116/','Taku Bou / SAMURAI GAMERS','2022-04-11','reference',
 'HPが低くなると周囲に大ダメージを与える咆哮を使用してきます。',
 '作者觀察低血量會使用向周圍造成大傷害的咆哮。沒有給精確血量閾值；不能直接寫成半血必定換形態，也不能由此推成獨立冰王變身。'),
('mist-game8','玻列琉斯的冰霧：玩家龍饗祈禱','https://game8.jp/eldenring/443586','Game8 攻略編輯部','2025-11-20 更新','reference',
 '上空から、ボレアリスの氷霧を吐く',
 '本篇確認祈禱名稱、從上方吐冰霧，以及擊敗玻列琉斯後在大龍饗教堂用兩顆龍心交換。可見資料列信仰 23、感應 15、消耗 48 FP；它們屬於玩家祈禱，不是 Boss 在本遊戲的能力值。'),
('concept-cu','玻列琉斯概念圖收錄頁','https://www.creativeuncut.com/gallery-43/er-borealis-the-freezing-fog.html','Creative Uncut；單張畫師未知','2026-11-09 正常 Chrome 頁面已顯示原圖','reference',
 'Borealis the Freezing Fog Art',
 '專頁和圖庫將其列入 Elden Ring 美術；本輪正常 Chrome 頁面回應 200，圖像 naturalWidth=1340、naturalHeight=650，保存了元素截圖並實際查看。普通直接檔案請求曾 403；沒有修改請求標頭或繞過驗證。原圖像素可見不等於已核實紙本頁碼、單張作者或再分發許可。'),
('official-artbook','官方畫冊卷別與內容範圍','https://www.eldenring.jp/newsdetail/news_detail_221129_1.html','FromSoftware / ELDEN RING 官方網站','2022-11-29','canon',
 'Volume IIには、エネミーや武器のコンセプトアート、アイテムのアートを掲載しています。',
 '官方公告確認美術設定集分卷，Volume II 收敵人、武器與道具美術；日文版於 2022-11-30 發售。公告不足以定位本張冰龍圖的頁碼或畫師，本輪沒有購買或下載整本畫冊。'),
]

def write(path,text):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text,encoding='utf-8')
def call(*args):
 r=subprocess.run([sys.executable,str(TOOL),*map(str,args)],capture_output=True,text=True,encoding='utf-8')
 if r.returncode:raise RuntimeError(r.stdout+r.stderr)
 return r.stdout
def register(obj,excerpt=None):
 target=LIB/'sources'/(obj['id']+'.json')
 if not target.exists():
  inp=ROOT/'inputs'/(obj['id']+'.json');write(inp,json.dumps(obj,ensure_ascii=False,indent=2));args=['add-source','--project',LIB,'--input',inp]
  if excerpt is not None:
   txt=ROOT/'inputs'/(obj['id']+'.txt');write(txt,excerpt);args+=['--text',txt]
  call(*args)
 return hashlib.sha256(target.read_bytes()).hexdigest()
def record(sid,name,body,evidence,kind='visual',realm='reference',status='confirmed'):
 meta=dict(id=sid,kind=kind,name=name,aliases=['玻列琉斯','Borealis','凍てつく霧、ボレアリス','凍結冰霧'],realm=realm,continuity='elden-ring-2022-base-game',status=status,known_from=None,evidence=[evidence])
 content='<!-- tw-work-record:v1 -->\n```json\n'+json.dumps(meta,ensure_ascii=False,indent=2)+'\n```\n\n'+body+'\n'
 target=LIB/'records'/(sid+'.md')
 if target.exists() and target.read_text(encoding='utf-8')!=content:raise RuntimeError('Refuse to overwrite edited record '+str(target))
 write(target,content)

def main():
 sys.stdout.reconfigure(encoding='utf8')
 if not LIB.exists():call('init','--project',LIB,'--title','凍結冰霧・玻列琉斯：考據與視覺研究')
 rows=json.loads((ROOT/'images.json').read_text(encoding='utf8'))
 receipt=json.loads((ROOT/'concept-browser-receipt.json').read_text(encoding='utf8'));assert receipt['viewable']
 f=ROOT/'concept-public-page.png';im=Image.open(f)
 rows.append(dict(id='bo-ref-048',file=f.name,page_url=receipt['page_url'],image_url='https://www.creativeuncut.com/gallery-43/art/er-borealis-the-freezing-fog.jpg',width=im.width,height=im.height,frames=1,sha256=hashlib.sha256(f.read_bytes()).hexdigest(),capture='normal Chrome element screenshot; original URL itself previously returned 403',realm='reference',continuity='elden-ring-2022-base-game',retrieved_at='2026-11-09',use='reference-only',rights='Original rights retained; local research only; single-artist credit, book page and redistribution permission unverified.'))
 selected=[]
 for x in rows:
  n=int(x['id'][-3:]);x.update(inspection='viewed',inspection_ref='Codex view_image 2026-11-09: contact-%02d.jpg'%((n-1)//6+1),selected=n in OBS)
  if n in [28,29,30,31]:x['inspection_ref']='Codex view_image 2026-11-09: '+x['id']+'-motion.jpg (five sampled frames; not frame-complete)'
  if n in [24,40]:x['inspection_ref']+='; full-size '+x['file']+' also viewed'
  if n==48:x['inspection_ref']='Codex view_image 2026-11-09: concept-public-page.png, entire rendered artwork'
  if n not in OBS:x['exclusion_reason']=EXCLUDED[n];continue
  category,note=OBS[n];x.update(category=category,observation=note)
  author='原作畫面：FromSoftware / Bandai Namco；逐張截圖者未知'
  if n in [28,29,30,24]:author='原作：FromSoftware / Bandai Namco；提供頁面：DanielD / EIP Gaming；逐張攝製者未單獨確認'
  if n in [36,41,42]:author='原作：FromSoftware / Bandai Namco；玩家文章：西へ東へ；個人本名未核實'
  if n in [44,45]:author='原作：FromSoftware / Bandai Namco；玩家文章：yutorinau'
  if n==40:author='原作：FromSoftware / Bandai Namco；遊戲攝影署名：Seekers_Sanctuary / @BBuradori；後製程度未知'
  if n==48:author='原作美術權利：FromSoftware / Bandai Namco；收錄：Creative Uncut；單張畫師未核實'
  x['author']=author;x.pop('dhash',None);selected.append(x)
  obj=dict(id=x['id'],kind='image',title=x['id']+' 玻列琉斯・'+category,realm='reference',continuity=x['continuity'],edition='Elden Ring 2022 base game; capture or icon or photography or concept as individually labelled',phase=None,provenance=author,author=author,rights=x['rights'],url=x['page_url'],image_url=x['image_url'],retrieved_at=x['retrieved_at'],inspection='viewed',inspection_ref=x['inspection_ref'],use='reference-only',local_file='../'+x['file'],image_sha256=x['sha256'])
  sha=register(obj)
  body=note+'\n\n[本機圖]('+('../../'+x['file'])+') · [來源頁]('+x['page_url']+') · [來源圖]('+x['image_url']+')\n\n作者／機構：'+author+'。\n\n用途：'+category+'。本機研究用，沒有再分發授權。'
  record(x['id'],obj['title'],body,dict(unit_id=x['id']+'/u000001',source_sha256=sha,locator='whole image at contact-sheet resolution / sampled GIF frames; full-size only where separately noted',observation=note),status='uncertain' if n==48 else 'confirmed')
 for sid,title,url,author,edition,realm,excerpt,note in SOURCES:
  obj=dict(id=sid,kind='web-text',title=title,realm=realm,continuity='elden-ring-2022-base-game',edition=edition,phase=None,author=author,provenance='Readable original page inspected 2026-11-09; short excerpt frozen, own paraphrase in record',rights='Only own notes and minimal verification excerpt; original rights retained',url=url,retrieved_at='2026-11-09')
  sha=register(obj,excerpt)
  record(sid,title,note+'\n\n[來源]('+url+')\n\n作者／機構：'+author+'；版本：'+edition,dict(unit_id=sid+'/u000001',source_sha256=sha,start=0,quote=excerpt),kind='rule',realm=realm,status='uncertain' if sid=='concept-cu' else 'confirmed')
 write(ROOT/'reviewed-inventory.json',json.dumps(rows,ensure_ascii=False,indent=2));write(ROOT/'selected-images.json',json.dumps(selected,ensure_ascii=False,indent=2))
 assert len(selected)==33
 print(call('reindex','--project',LIB))
 index=['# 玻列琉斯・逐圖來源','', '33 張已看過的參考：29 張靜態圖片（含 1 張概念圖、1 張祈禱圖示及 1 張遊戲攝影）＋4 段 GIF。GIF 每段只計一張；不把抽幀或概念頁上下文截圖重複計數。','', '檢視以完整構圖與動圖的五個時間點為主。24、40、48 另看完整尺寸；不冒稱其餘全都做過像素級細節檢查。','']
 for x in selected:
  index+=['## '+x['id']+'・'+x['category'],x['observation'],'','- [本機圖片]('+x['file']+') · [來源頁]('+x['page_url']+') · [來源圖]('+x['image_url']+')','- 作者／機構：'+x['author'],'- 尺寸：'+str(x['width'])+' × '+str(x['height'])+'；查看回執：'+x['inspection_ref'],'- SHA-256（本機檔案校驗值）：`'+x['sha256']+'`','- 權利：僅本機研究參考，再分發許可未知。','']
 index+=['## 已看過但排除的 15 張','']+['- bo-ref-%03d：%s'%(n,note) for n,note in EXCLUDED.items()]
 write(ROOT/'IMAGE-INDEX.md','\n'.join(index))
 e=html.escape;cards=[]
 for x in selected:
  assert x['page_url'].startswith('https://') and x['image_url'].startswith('https://')
  motion='<a href="'+x['id']+'-motion.jpg">動作抽幀 ↗</a>' if x['frames']>1 else ''
  cards.append('<article data-id="'+x['id']+'" data-category="'+e(x['category'])+'"><button class="picture" data-id="'+x['id']+'" aria-label="放大 '+e(x['id']+' '+x['category'])+'"><img loading="lazy" src="'+e(x['file'])+'" alt="'+e(x['observation'])+'"></button><div class="card-body"><div class="meta"><span>'+x['id']+'</span><span>'+e(x['category'])+(' · GIF' if x['frames']>1 else '')+'</span></div><p>'+e(x['observation'])+'</p><div class="source"><a href="'+e(x['page_url'])+'" target="_blank" rel="noopener noreferrer">來源頁 ↗</a><a href="'+e(x['image_url'])+'" target="_blank" rel="noopener noreferrer">來源圖 ↗</a>'+motion+'</div><p class="credit">'+e(x['author'])+'</p></div></article>')
 filters=['全部','概念圖','外觀','動作','冰霧','凍傷','龍饗祈禱','遊戲攝影']
 nav=''.join('<button data-filter="'+x+'" aria-pressed="'+str(x=='全部').lower()+'">'+x+'</button>' for x in filters)
 page=(ROOT/'gallery-template.html').read_text(encoding='utf8').replace('@@CARDS@@',''.join(cards)).replace('@@FILTERS@@',nav).replace('@@DATA@@',json.dumps(selected,ensure_ascii=False).replace('<','\\u003c'))
 write(ROOT/'gallery.html',page)
 write(ROOT/'README.md','# 玻列琉斯考據入口\n\n[33 張本機圖鑑](gallery.html) · [原作考據與技能提案](../../bosses/borealis.md) · [逐圖索引](IMAGE-INDEX.md) · [研究範圍與缺口](RESEARCH-LOG.md)\n\n本輪使用者選擇先看研究與技能方案，尚未製作角色。\n\n48 張候選已看過，採用 33 張：29 張靜圖（含概念圖、祈禱圖示與遊戲攝影）＋4 段動圖，每段只算一張；另有 15 張排除。概念圖已看完整頁面圖像，單張畫師與正式畫冊頁碼仍未核實。\n\n`library/records/` 有 42 筆可編輯 Markdown 正文（33 圖＋9 文字來源）；`library/index/records.jsonl` 可從正文重建。`selected-images.json` 記錄逐圖來源、查看方式與檔案 SHA-256。`images.json` 是原始下載清單，不代表已被採用；最後選圖以 `selected-images.json` 為準。\n\n圖片只在本機研究，不載入遊戲；權利由 FromSoftware、Bandai Namco 及各原作者保有。全部原圖與失敗來源都有出處，沒有取得圖片再分發授權。\n\n重建索引：`python "C:/Users/dark/.codex/skills/build-work-library/scripts/work_library.py" reindex --project docs/research/borealis/library`。讀者改正文後只重建索引，不要用 finalize 腳本覆蓋人工修改。\n')
 print('33 selected references; 42 editable records; JSONL rebuilt')
if __name__=='__main__':main()
