"""Collect public reference images, never game runtime assets. Run explicitly.
Keeps original page + image URLs; byte and perceptual dedup; no access-control bypass.
"""
import concurrent.futures, hashlib, io, json, pathlib, re, urllib.parse, urllib.request
from html.parser import HTMLParser
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'docs/research/redwolf'
PAGES = [
 'https://www.creativeuncut.com/gallery-43/er-lesser-red-wolf-of-radagon.html',
 'https://eip.gg/elden-ring/guides/how-to-beat-the-red-wolf-of-radagon/',
 'https://www.pushsquare.com/guides/elden-ring-how-to-beat-red-wolf-of-radagon',
 'https://www.eurogamer.pt/elden-ring-red-wolf-of-radagon-dicas-e-estrategias-para-derrotar-o-boss',
 'https://www.eurogamer.pl/elden-ring-rudy-wilk-radagona',
 'https://www.gamepressure.com/elden-ring/red-wolf-of-radagon/z7f7a9',
 'https://www.gamesradar.com/elden-ring-red-wolf-of-radagon-boss-fight/',
 'https://www.ggrecon.com/articles/elden-ring-red-wolf-boss-fight/',
 'https://gamewith.jp/eldenring/321750',
 'https://www.famitsu.com/news/202203/16254849.html',
 'https://www.dexerto.com/elden-ring/how-to-beat-red-wolf-of-radagon-in-elden-ring-1771010/',
 'https://www.gamerguides.com/elden-ring/database/bosses/raya-lucaria-academy-bosses/red-wolf-of-radagon',
 'https://sirusgaming.com/elden-ring-red-wolf-of-radagon-boss-fight-guide/',
 'https://www.computerbild.de/artikel/cb-eSports-Elden-Ring-Roten-Wolf-von-Radagon-besiegen-32112145.html',
 'https://www.neoseeker.com/elden-ring/Bosses/Red_Wolf_of_Radagon',
 'https://okirakugamelife.blog.jp/archives/14337179.html',
]

def fetch(u):
 req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
 with urllib.request.urlopen(req, timeout=22) as f: return f.read()

class Images(HTMLParser):
 def __init__(self): super().__init__(); self.items=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='meta' and a.get('property')=='og:image': self.items.append((a.get('content',''),'page cover'))
  if tag!='img': return
  alt=a.get('alt') or ''
  for key in ['data-src','src']:
   u=a.get(key,'')
   if u.startswith(('http','/')): self.items.append((u,alt)); break

def page(u):
 try:
  s=fetch(u).decode('utf-8',errors='replace'); p=Images(); p.feed(s)
  out=[]
  for img,alt in p.items:
   img=urllib.parse.urljoin(u,img)
   if (re.search(r'wolf|radagon|赤狼|赤い狼|紅狼|红狼|rudy|rote.wolf',img+' '+alt,re.I)
       or ('gamepressure.com/elden-ring/gfx' in img)
       or ('page cover'==alt)):
    if not re.search(r'avatar|logo|icon|banner|social|100x|150x',img,re.I): out.append({'page_url':u,'image_url':img,'alt':alt})
  print('PAGE',u,len(out),flush=True); return out
 except Exception as e: print('PAGE_FAIL',u,str(e)[:90],flush=True); return []

def download(item):
 try:
  old=next((x for x in PREVIOUS if x['image_url']==item['image_url']),None)
  data=(ROOT/old['file']).read_bytes() if old and (ROOT/old['file']).exists() else fetch(item['image_url'])
  im=Image.open(io.BytesIO(data)); im.load()
  if im.width<400 or im.height<200: return None
  item.update(width=im.width,height=im.height,sha256=hashlib.sha256(data).hexdigest())
  g=im.convert('L').resize((17,16)); px=list(g.getdata()); bits=[px[y*17+x]>px[y*17+x+1] for y in range(16) for x in range(16)]
  item['dhash']=sum(int(v)<<i for i,v in enumerate(bits))
  return item,data,im.convert('RGB')
 except Exception as e: print('IMG_FAIL',item['image_url'][:95],str(e)[:65],flush=True); return None

def main():
 ROOT.mkdir(parents=True,exist_ok=True); (ROOT/'images').mkdir(exist_ok=True)
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex: candidates=[x for p in ex.map(page,PAGES) for x in p]
 # Extra URLs observed in web image search; preserve the actual originating pages.
 candidates += [
  {'page_url':PAGES[0],'image_url':'https://www.creativeuncut.com/gallery-43/art/er-lesser-red-wolf-of-radagon.jpg','alt':'Lesser Red Wolf of Radagon concept art'},
  {'page_url':'https://www.windowscentral.com/elden-ring-bosses-ranked','image_url':'https://cdn.mos.cms.futurecdn.net/fpaHNHRAdihkJLTTwMmtUb-1024-80.jpg','alt':'Red Wolf of Radagon'},
  {'page_url':'https://www.gamersdecide.com/articles/all-elden-ring-bosses-ranked','image_url':'https://www.gamersdecide.com/sites/default/files/authors/u173634/red-wolf-of-radagon-1-hq-elden-ring-wiki-guide-min.jpg','alt':'Red Wolf of Radagon'},
  {'page_url':'https://www.pushsquare.com/guides/elden-ring-how-to-beat-red-wolf-of-radagon','image_url':'https://images.pushsquare.com/ac5cf161dab1a/elden-ring-how-to-beat-red-wolf-of-radagon-guide-4.large.jpg','alt':'Red Wolf of Radagon guide 4'},
  {'page_url':'https://www.pushsquare.com/guides/elden-ring-how-to-beat-red-wolf-of-radagon','image_url':'https://images.pushsquare.com/ce86dabd85a0a/elden-ring-how-to-beat-red-wolf-of-radagon-guide-1.large.jpg','alt':'Red Wolf of Radagon guide 1'},
  {'page_url':'https://storage.googleapis.com/dzkwdnmmhsjkpe/red-wolf-of-redragon.html','image_url':'https://pbs.twimg.com/media/Fr-gAL6WcAIGu0-.jpg','alt':'Red wolf concept candidate; repost attribution unverified'},
 ]
 unique={x['image_url']:x for x in candidates}
 (ROOT/'candidates.json').write_text(json.dumps(list(unique.values()),ensure_ascii=False,indent=2),encoding='utf-8')
 accepted=[]; hashes=[]; tiles=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
  for result in ex.map(download,unique.values()):
   if result is None: continue
   item,data,im=result
   if any(item['sha256']==x['sha256'] or (item['dhash']^x['dhash']).bit_count()<16 for x in accepted): continue
   item['id']='rw-ref-%03d'%(len(accepted)+1); item['file']='images/'+item['id']+'.'+('png' if data.startswith(b'\x89PNG') else 'jpg')
   item.update(inspection='not-viewed',inspection_ref=None,use='reference-only',rights='Copyright remains with FromSoftware / Bandai Namco and original screenshot owner; redistribution not granted',continuity='elden-ring-2022-base-game',retrieved_at='2026-11-07')
   (ROOT/item['file']).write_bytes(data); accepted.append(item)
   tile=Image.new('RGB',(480,300),'#141923'); im.thumbnail((472,264)); tile.paste(im,((480-im.width)//2,0)); ImageDraw.Draw(tile).text((8,272),item['id']+' | '+str(item['width'])+'x'+str(item['height']),fill='white'); tiles.append(tile)
 for start in range(0,len(tiles),12):
  group=tiles[start:start+12]; sheet=Image.new('RGB',(480*3,300*((len(group)+2)//3)),'#141923')
  for i,t in enumerate(group): sheet.paste(t,((i%3)*480,(i//3)*300))
  sheet.save(ROOT/('contact-%02d.jpg'%(start//12+1)),quality=90)
 (ROOT/'images.json').write_text(json.dumps(accepted,ensure_ascii=False,indent=2),encoding='utf-8')
 print('UNIQUE_IMAGES',len(accepted),flush=True)

PREVIOUS=json.loads((ROOT/'images.json').read_text(encoding='utf-8')) if (ROOT/'images.json').exists() else []
if __name__=='__main__': main()
