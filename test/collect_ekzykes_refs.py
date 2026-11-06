"""Explicit, bounded local research collection. Never loaded by the game.
Public article images only; no login, paywall or bot-wall workarounds.
Files remain not-viewed until the actual visual review is recorded separately.
"""
import concurrent.futures, hashlib, io, json, pathlib, re, urllib.parse, urllib.request
from html.parser import HTMLParser
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'docs/research/ekzykes'
PAGES = [
 'https://www.creativeuncut.com/gallery-43/er-decaying-ekzykes.html',
 'https://www.toy-people.com/?p=86967',
 'https://www.artstation.com/projects/4NLNbk.json',
 'https://game8.jp/eldenring/442336',
 'https://gamewith.jp/eldenring/322867',
 'https://jp.samurai-gamers.com/eldenring/er-boss063/',
 'https://kamigame.jp/eldenring/page/211231076578803440.html',
 'https://www.gamepressure.com/elden-ring/decaying-ekzykes/z4fe3f',
 'https://www.neoseeker.com/elden-ring/Bosses/Decaying_Ekzykes',
 'https://game8.co/games/Elden-Ring/archives/374437',
 'https://playerassist.com/how-to-beat-decaying-ekzykes-in-elden-ring/',
 'https://progameguides.com/elden-ring/how-to-cheese-decaying-ekzykes-boss-in-elden-ring/',
 'https://www.gamerguides.com/elden-ring/database/bosses/caelid-bosses/decaying-ekzykes',
 'https://us.millenium.gg/guide/26739.html',
 'https://alfabetajuega.com/guia/elden-ring/jefes-ekzykes',
 'https://video-game-guide-walkthrough.supersoluce.com/solution/elden-ring-guide-walkthrough/er-bosses-guide/bosses-caelid/decaying-ekzykes/',
 'https://www.3dmgame.com/gl/3944018.html',
]
def fetch(url):
 with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'}), timeout=22) as f:
  return f.read(18_000_000)

class Images(HTMLParser):
 def __init__(self): super().__init__(); self.items=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs); alt=a.get('alt') or a.get('title') or ''
  if tag=='meta' and a.get('property')=='og:image': self.items.append((a.get('content',''),'page cover'))
  if tag not in ('img','a','source'):return
  for k in ('data-src','data-original','data-lazy-src','src','href','srcset'):
   u=(a.get(k) or '').split(' ')[0]
   if re.search(r'\.(png|jpe?g|webp|gif)([/?]|$)',u,re.I) or ('googleusercontent.com' in u and tag=='img'): self.items.append((u,alt)); break

def page(url):
 try:
  data=fetch(url); s=data.decode('utf-8',errors='replace')
  if url.endswith('.json'):
   j=json.loads(s)
   return [dict(page_url='https://www.artstation.com/artwork/4NLNbk',image_url=a['image_url'],alt='Soichi Harigiri Ekzykes sculpture',category='sculpture') for a in j.get('assets',[]) if a.get('image_url')]
  # Restrict unlabelled article images to the relevant article section.
  if 'toy-people' in url:
   start=s.find('2024-02-10 21:13:08'); end=s.find('來源',start)
   s=s[start:end] if start>=0 and end>start else s
  if 'samurai-gamers' in url:
   start=s.find('腐りゆくエグズキスの倒し方'); end=s.find('腐りゆくエグズキスの基本情報',start)
   s=s[start:end] if start>=0 and end>start else s
  p=Images(); p.feed(s); out=[]
  for img,alt in p.items:
   img=urllib.parse.urljoin(url,img)
   allowed = re.search(r'ekzy|egzy|エグズキス|エグズキス|艾格基斯',img+' '+alt,re.I) or alt=='page cover'
   allowed = allowed or any(x in url for x in ('toy-people','samurai-gamers','gamepressure','hobbyfanclub'))
   allowed = allowed or ('game8.jp' in url and alt not in ('チェックマーク','') and any(x in alt for x in ('ブレス','腐敗','咆哮','立ち回り')))
   if allowed and not re.search(r'avatar|logo|icon|favicon|loading|banner|social|150x|100x|profile',img,re.I):
    out.append(dict(page_url=url,image_url=img,alt=alt,category='concept-candidate' if 'creativeuncut' in url else 'sculpture' if 'toy-people' in url else 'gameplay'))
  print('PAGE',url,len(out),flush=True); return out
 except Exception as e: print('PAGE_FAIL',url,str(e)[:100],flush=True); return []

def download(item):
 try:
  data=fetch(item['image_url']); im=Image.open(io.BytesIO(data)); im.load()
  if im.width<300 or im.height<168:return None
  gray=im.convert('L').resize((17,16)); px=list(gray.getdata())
  dh=sum(int(px[y*17+x]>px[y*17+x+1])<<(y*16+x) for y in range(16) for x in range(16))
  return dict(item,width=im.width,height=im.height,sha256=hashlib.sha256(data).hexdigest(),dhash=dh),data,im.convert('RGB')
 except Exception as e:print('IMAGE_FAIL',item['image_url'][:95],str(e)[:65],flush=True); return None

def main():
 ROOT.mkdir(parents=True,exist_ok=True); (ROOT/'images').mkdir(exist_ok=True)
 if (ROOT/'images.json').exists():raise SystemExit('Existing inventory: refuse to overwrite. Review or extend explicitly.')
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:candidates=[x for p in ex.map(page,PAGES) for x in p]
 unique=list({x['image_url']:x for x in candidates}.values())
 (ROOT/'candidates.json').write_text(json.dumps(unique,ensure_ascii=False,indent=2),encoding='utf-8')
 accepted=[]; tiles=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
  for result in ex.map(download,unique):
   if result is None:continue
   item,data,im=result
   if any(item['sha256']==x['sha256'] or (item['dhash']^x['dhash']).bit_count()<14 for x in accepted):continue
   item['id']='ek-ref-%03d'%(len(accepted)+1)
   ext='.gif' if data.startswith(b'GIF') else '.png' if data.startswith(b'\x89PNG') else '.webp' if data[8:12]==b'WEBP' else '.jpg'
   item.update(file='images/'+item['id']+ext,inspection='not-viewed',inspection_ref=None,use='reference-only',retrieved_at='2026-11-07',realm='reference',continuity='elden-ring-2022-base-game',rights='Original rights retained; local research only; redistribution permission unknown.')
   (ROOT/item['file']).write_bytes(data); accepted.append(item)
   tile=Image.new('RGB',(500,320),'#13191b'); im.thumbnail((492,278)); tile.paste(im,((500-im.width)//2,0))
   ImageDraw.Draw(tile).text((8,288),item['id']+' | '+item['category']+' | '+str(item['width'])+'x'+str(item['height']),fill='white'); tiles.append(tile)
 for start in range(0,len(tiles),9):
  group=tiles[start:start+9]; sheet=Image.new('RGB',(1500,320*((len(group)+2)//3)),'#13191b')
  for i,t in enumerate(group):sheet.paste(t,((i%3)*500,(i//3)*320))
  sheet.save(ROOT/('contact-%02d.jpg'%(start//9+1)),quality=90)
 (ROOT/'images.json').write_text(json.dumps(accepted,ensure_ascii=False,indent=2),encoding='utf-8')
 print('UNIQUE_CANDIDATES',len(accepted),flush=True)

if __name__=='__main__':main()
