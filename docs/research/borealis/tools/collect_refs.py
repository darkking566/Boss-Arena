"""Bounded public Borealis references, explicitly authorized 2026-11-09.
Images are research only, never imported by the game. Download success is NOT
visual inspection. Source pages are read for links; no full articles are saved.
No login, paywall, anti-bot or access-control bypass. Original files stay intact.
"""
import concurrent.futures, hashlib, io, json, pathlib, re, sys, urllib.parse, urllib.request
from html.parser import HTMLParser
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = [
 'https://www.creativeuncut.com/gallery-43/er-borealis-the-freezing-fog.html',
 'https://game8.jp/eldenring/444834',
 'https://game8.jp/eldenring/443586',
 'https://gamewith.jp/eldenring/325390',
 'https://www.gamepressure.com/elden-ring/borealis-the-frozen-fog/zffcdb',
 'https://jp.samurai-gamers.com/eldenring/er-boss116/',
 'https://kamigame.jp/eldenring/page/211222806921248218.html',
 'https://eip.gg/elden-ring/guides/how-to-beat-borealis-the-freezing-fog/',
 'https://eip.gg/elden-ring/db/borealiss-mist/',
 'https://game8.co/games/Elden-Ring/archives/372988',
 'https://www.gamerguides.com/elden-ring/database/bosses/mountaintops-of-the-giants-boss/borealis-the-freezing-fog',
 'https://www.gamepur.com/guides/how-to-beat-borealis-the-freezing-fog-in-elden-ring',
 'https://video-game-guide-walkthrough.supersoluce.com/solution/elden-ring-guide-walkthrough/er-optional-areas/mountaintops-of-the-giants/mountaintops-of-the-giants-optional-bosses/',
 'https://eldenring.fandom.com/wiki/Borealis_the_Freezing_Fog',
 'https://eldenring.wiki.gg/wiki/Borealis%27s_Mist',
]

def fetch(url):
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
 with urllib.request.urlopen(req,timeout=25) as f:
  if int(f.headers.get('Content-Length','0'))>25_000_000: raise ValueError('oversized asset')
  return f.read(25_000_001)

class Images(HTMLParser):
 def __init__(self):super().__init__();self.items=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);alt=a.get('alt') or a.get('title') or ''
  if tag=='meta' and a.get('property')=='og:image':self.items.append((a.get('content',''),'page cover'))
  if tag not in ('img','a','source'):return
  for k in ('preview','data-original','data-lazy-src','data-src','src','href'):
   u=a.get(k) or ''
   if re.search(r'\.(png|jpe?g|webp|gif)([/?]|$)',u,re.I) or ('googleusercontent.com' in u and tag=='img'):
    self.items.append((u,alt));break

def page(url):
 try:
  s=fetch(url).decode('utf-8','replace')
  if 'samurai-gamers' in url:
   start=s.find('凍てつく霧、ボレアリスの倒し方');end=s.find('凍てつく霧、ボレアリスのドロップアイテム',start)
   if start>=0 and end>start:s=s[start:end]
  p=Images();p.feed(s);out=[]
  for img,alt in p.items:
   img=urllib.parse.urljoin(url,img)
   allowed=re.search(r'boreali|ボレアリス|玻列琉斯|凍結冰霧',img+' '+alt,re.I) or alt=='page cover'
   allowed=allowed or any(k in url for k in ('gamepressure','samurai-gamers'))
   if allowed and not re.search(r'avatar|logo|icon|favicon|loading|transparent|1x1|banner|social|150x|100x|profile',img,re.I):
    out.append(dict(page_url=url,image_url=img,alt=alt,category='concept-candidate' if 'creativeuncut' in url else 'gameplay'))
  return out,dict(url=url,status='readable',candidate_count=len(out))
 except Exception as e:return [],dict(url=url,status='failed',error=str(e)[:200])

def download(item):
 try:
  data=fetch(item['image_url']);im=Image.open(io.BytesIO(data));im.load()
  if im.width<300 or im.height<168:return None
  gray=im.convert('L').resize((17,16));px=list(gray.getdata())
  dh=sum(int(px[y*17+x]>px[y*17+x+1])<<(y*16+x) for y in range(16) for x in range(16))
  return dict(item,width=im.width,height=im.height,frames=getattr(im,'n_frames',1),sha256=hashlib.sha256(data).hexdigest(),dhash=dh),data
 except Exception as e:
  print('IMAGE_FAIL',item['image_url'][:100],str(e)[:100],flush=True);return None

def sheets(rows):
 tiles=[]
 for item in rows:
  im=Image.open(ROOT/item['file']).convert('RGB');im.thumbnail((660,365))
  tile=Image.new('RGB',(680,410),'#131c23');tile.paste(im,((680-im.width)//2,0))
  ImageDraw.Draw(tile).text((10,378),item['id']+' | '+item['category']+' | '+str(item['width'])+'x'+str(item['height']),fill='white');tiles.append(tile)
 for start in range(0,len(tiles),6):
  group=tiles[start:start+6];sheet=Image.new('RGB',(2040,410*((len(group)+2)//3)),'#131c23')
  for i,t in enumerate(group):sheet.paste(t,((i%3)*680,(i//3)*410))
  sheet.save(ROOT/('contact-%02d.jpg'%(start//6+1)),quality=93)

def main():
 sys.stdout.reconfigure(encoding='utf-8');ROOT.mkdir(parents=True,exist_ok=True);(ROOT/'images').mkdir(exist_ok=True)
 path=ROOT/'images.json';rows=json.loads(path.read_text(encoding='utf-8')) if path.exists() else []
 receipts=[];candidates=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
  for items,receipt in ex.map(page,[] if '--extras-only' in sys.argv else PAGES):
   receipts.append(receipt);candidates.extend(items);print('PAGE',receipt,flush=True)
 extra=ROOT/'extra-candidates.json'
 if extra.exists():candidates.extend(json.loads(extra.read_text(encoding='utf-8')))
 candidates=list({x['image_url']:x for x in candidates}.values())
 (ROOT/'candidates.json').write_text(json.dumps(candidates,ensure_ascii=False,indent=2),encoding='utf-8')
 old={x['image_url'] for x in rows}
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
  for result in ex.map(download,[x for x in candidates if x['image_url'] not in old]):
   if result is None:continue
   item,data=result
   if any(item['sha256']==x['sha256'] or (item['frames']==1 and (item['dhash']^x['dhash']).bit_count()<14) for x in rows):continue
   item['id']='bo-ref-%03d'%(len(rows)+1)
   ext='.gif' if data.startswith(b'GIF') else '.png' if data.startswith(b'\x89PNG') else '.webp' if data[8:12]==b'WEBP' else '.jpg'
   item.update(file='images/'+item['id']+ext,inspection='not-viewed',inspection_ref=None,use='reference-only',retrieved_at='2026-11-09',realm='reference',continuity='elden-ring-2022-base-game',rights='FromSoftware / Bandai Namco and original creators retain rights; local research only; redistribution permission unknown.')
   (ROOT/item['file']).write_bytes(data);rows.append(item)
 path.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
 if receipts:(ROOT/'page-receipts.json').write_text(json.dumps(receipts,ensure_ascii=False,indent=2),encoding='utf-8')
 sheets(rows)
 print('UNIQUE_CANDIDATES',len(rows),flush=True)

if __name__=='__main__':main()
