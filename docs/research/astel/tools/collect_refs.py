"""Astel public image reference collector (research only, never imported by the game).
Reads public pages for image links; no login/paywall/anti-bot bypass. Download != inspected.
Usage: python collect_refs.py        -> candidates.json, images/as-ref-NNN.*, contact-NN.jpg
"""
import concurrent.futures, hashlib, io, json, pathlib, re, sys, urllib.parse, urllib.request
from html.parser import HTMLParser
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = [
 'https://gamerguides.com/elden-ring/guide/lake-of-rot/bosses/astel-naturalborn-of-the-void-boss-guide',
 'https://gamerguides.com/elden-ring/database/bosses/lake-of-rot-bosses/astel-naturalborn-of-the-void',
 'https://pushsquare.com/guides/elden-ring-how-to-beat-astel-naturalborn-of-the-void',
 'https://twinfinite.net/guides/elden-ring-astel-naturalborn-how-beat/',
 'https://twinfinite.net/guides/elden-ring-astel-naturalborn-of-the-void-how-beat/',
 'https://rankedboost.com/elden-ring/astel-naturalborn-of-the-void/',
 'https://game8.co/games/Elden-Ring/archives/368058',
 'https://game8.co/games/Elden-Ring/archives/370690',
 'https://segmentnext.com/elden-ring/bosses/astel-naturalborn-of-the-void',
 'https://thebackdash.com/gaming/elden-ring-astel-naturalborn-of-the-void-boss-guide/',
 'https://www.gamesradar.com/elden-ring-astel-naturalborn-of-the-void-boss-guide/',
 'https://www.exitlag.com/blog/astel-elden-ring/',
 'https://www.arrpeegeez.com/2022/09/elden-ring-walkthrough-astel.html',
 'https://eip.gg/elden-ring/guides/how-to-beat-astel-naturalborn-of-the-void/',
 'https://www.gamepressure.com/elden-ring/astel-naturalborn-of-the-void/zb3bd5',
 'https://eldenring.wiki.fextralife.com/Astel,+Naturalborn+of+the+Void',
 'https://eldenring.wiki.fextralife.com/Astel,+Stars+of+Darkness',
 'https://eldenring.wiki.fextralife.com/Meteorite+of+Astel',
 'https://eldenring.wiki.fextralife.com/Wing+of+Astel',
 'https://eldenring.wiki.fextralife.com/Bastard%27s+Stars',
 'https://eldenring.wiki.fextralife.com/Gravitational+Missile',
 'https://eldenring.wiki.fextralife.com/Remembrance+of+the+Naturalborn',
 'https://eldenring.wiki.gg/wiki/Astel',
 'https://eldenring.wiki.gg/wiki/Astel,_Naturalborn_of_the_Void',
 'https://eldenring.wiki.gg/wiki/Astel,_Stars_of_Darkness',
 'https://eldenring.fandom.com/wiki/Astel,_Naturalborn_of_the_Void',
 'https://eldenring.fandom.com/wiki/Astel,_Stars_of_Darkness',
 'https://kotaku.com/fromsoftware-bosses-dark-souls-bloodborne-elden-ring-1849653932/10',
 'https://www.thegamer.com/elden-ring-astel-naturalborn-of-the-void-boss-fight-guide',
 'https://www.ign.com/wikis/elden-ring/Astel,_Naturalborn_of_the_Void_Boss_Guide',
 'https://www.vg247.com/elden-ring-astel-naturalborn-of-the-void-boss-guide',
 'https://www.polygon.com/elden-ring-guide-walkthrough/22962568/astel-naturalborn-of-the-void-boss-guide',
 'https://screenrant.com/elden-ring-astel-naturalborn-of-the-void-boss-guide/',
 'https://www.gamespot.com/articles/elden-ring-astel-naturalborn-of-the-void-boss-guide/',
 'https://game8.co/games/Elden-Ring/archives/371982',
 'https://game8.co/games/Elden-Ring/archives/374495',
 'https://game8.co/games/Elden-Ring/archives/370660',
 'https://www.miklix.com/gaming/elden-ring/astel-naturalborn-of-the-void-grand-cloister-boss-fight',
 'https://www.miklix.com/gaming/elden-ring/astel-stars-of-darkness-yelough-anix-tunnel-boss-fight',
 'https://sportskeeda.com/esports/how-defeat-astel-naturalborn-void-elden-ring',
 'https://primagames.com/gaming/elden-ring-astel-naturalborn-of-the-void',
 'https://www.gamepressure.com/elden-ring/astel-naturalborn-of-the-void/z9f829',
 'https://rankedboost.com/elden-ring/astel-stars-of-darkness/',
 'https://gamerguides.com/elden-ring/database/bosses/mountaintops-of-the-giants-boss/astel-stars-of-darkness',
 'https://segmentnext.com/elden-ring/dungeons/yelough-anix-tunnel',
 'https://gamertweak.com/beat-astel-elden-ring',
 'https://cyberpost.co/?p=1416724',
 'https://www.gamespot.com/articles/elden-ring-where-to-get-meteorite-of-astel/1100-6503259/',
 'https://www.pushsquare.com/guides/elden-ring-how-to-beat-astel-naturalborn-of-the-void',
 'https://eldenring.wiki.fextralife.com/Astel_Naturalborn_of_the_Void',
 'https://eldenring.wiki.fextralife.com/Yelough+Anix+Tunnel',
 'https://eldenring.wiki.fextralife.com/Grand+Cloister',
 'https://eldenring.wiki.fextralife.com/Lake+of+Rot',
 'https://eldenring.wiki.fextralife.com/Fallingstar+Beast',
 'https://eldenring.wiki.fextralife.com/Ainsel+River',
]
EXTRA = {
 'https://www.creativeuncut.com/gallery-43/er-astel-naturalborn-of-the-void.html': 'https://www.creativeuncut.com/gallery-43/art/er-astel-naturalborn-of-the-void.jpg',
 'https://eldenring.wiki.fextralife.com/Astel,+Naturalborn+of+the+Void': 'https://static0.fextralifeimages.com/file/eldenring/5/58/Astel-naturalborn-of-the-void-1-elden-ring-wiki-guide.png',
 'https://eldenring.wiki.fextralife.com/Astel,+Naturalborn+of+the+Void#2': 'https://static0.fextralifeimages.com/file/eldenring/f/f5/Astel%2C_naturalborn_of_the_void.png',
 'https://eldenring.wiki.fextralife.com/Astel,+Stars+of+Darkness': 'https://static0.fextralifeimages.com/file/eldenring/4/46/Astel-stars-of-darkness-boss-elden-ring-wiki-guide.png',
 'https://eldenring.wiki.fextralife.com/Astel,+Stars+of+Darkness#2': 'https://static0.fextralifeimages.com/file/eldenring/6/66/Astel-naturalborn-of-the-void-3-elden-ring-wiki-guide.png',
}
KEY = re.compile(r'astel|naturalborn|void|star|nebula|meteor|grand[-_ ]?cloister|lake[-_ ]?of[-_ ]?rot|ainsel|gravit', re.I)
BAD = re.compile(r'avatar|logo|icon|favicon|loading|transparent|1x1|banner|social|150x|100x|profile|sprite|button|thumb/.{0,80}/(20|30|40)px|status|damage|upgrades|currency|runes', re.I)

def fetch(url, ref=None):
 h = {'User-Agent': 'Mozilla/5.0'}
 if ref: h['Referer'] = ref
 with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=25) as f:
  return f.read(25_000_001)

class Imgs(HTMLParser):
 def __init__(s): super().__init__(); s.items = []
 def handle_starttag(s, tag, attrs):
  a = dict(attrs); alt = a.get('alt') or a.get('title') or ''
  if tag == 'meta' and a.get('property') == 'og:image': s.items.append((a.get('content', ''), 'page cover'))
  if tag not in ('img', 'a', 'source'): return
  for k in ('data-original', 'data-lazy-src', 'data-src', 'src', 'href'):
   u = a.get(k) or ''
   if re.search(r'\.(png|jpe?g|webp|gif)([/?]|$)', u, re.I): s.items.append((u, alt)); break

def page(url):
 try:
  s = fetch(url).decode('utf-8', 'replace'); p = Imgs(); p.feed(s); out = []
  for img, alt in p.items:
   img = urllib.parse.urljoin(url, img).replace('&amp;', '&')
   if BAD.search(img) or not (KEY.search(img + ' ' + alt) or alt == 'page cover'): continue
   out.append(dict(page_url=url, image_url=img, alt=alt))
  return out, dict(url=url, status='readable', candidate_count=len(out))
 except Exception as e:
  return [], dict(url=url, status='failed', error=str(e)[:160])

def download(item):
 try:
  data = fetch(item['image_url'], item['page_url']); im = Image.open(io.BytesIO(data)); im.load()
  if im.width < 400 or im.height < 220: return None
  g = list(im.convert('L').resize((17, 16)).getdata())
  dh = sum(int(g[y*17+x] > g[y*17+x+1]) << (y*16+x) for y in range(16) for x in range(16))
  return dict(item, width=im.width, height=im.height, frames=getattr(im, 'n_frames', 1), sha256=hashlib.sha256(data).hexdigest(), dhash=dh), data
 except Exception as e:
  print('IMAGE_FAIL', item['image_url'][:90], str(e)[:60], flush=True); return None

def sheets(rows):
 tiles = []
 for it in rows:
  im = Image.open(ROOT/it['file']).convert('RGB'); im.thumbnail((660, 365))
  t = Image.new('RGB', (680, 410), '#131c23'); t.paste(im, ((680-im.width)//2, 0))
  ImageDraw.Draw(t).text((10, 378), '%s %dx%d' % (it['id'], it['width'], it['height']), fill='white'); tiles.append(t)
 for st in range(0, len(tiles), 6):
  g = tiles[st:st+6]; sh = Image.new('RGB', (2040, 410*((len(g)+2)//3)), '#131c23')
  for i, t in enumerate(g): sh.paste(t, ((i % 3)*680, (i//3)*410))
  sh.save(ROOT/('contact-%02d.jpg' % (st//6+1)), quality=90)

def main():
 sys.stdout.reconfigure(encoding='utf-8'); (ROOT/'images').mkdir(exist_ok=True)
 cands, receipts = [], []
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
  for items, r in ex.map(page, PAGES): cands += items; receipts.append(r); print('PAGE', r, flush=True)
 for p, i in EXTRA.items(): cands.append(dict(page_url=p, image_url=i, alt='concept art'))
 cands = list({x['image_url']: x for x in cands}.values())
 (ROOT/'candidates.json').write_text(json.dumps(cands, ensure_ascii=False, indent=2), encoding='utf-8')
 (ROOT/'page-receipts.json').write_text(json.dumps(receipts, ensure_ascii=False, indent=2), encoding='utf-8')
 rows = []
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
  for res in ex.map(download, cands):
   if not res: continue
   it, data = res
   if any(it['sha256'] == x['sha256'] or (it['frames'] == 1 and (it['dhash'] ^ x['dhash']).bit_count() < 12) for x in rows): continue
   it['id'] = 'as-ref-%03d' % (len(rows)+1)
   ext = '.gif' if data.startswith(b'GIF') else '.png' if data.startswith(b'\x89PNG') else '.webp' if data[8:12] == b'WEBP' else '.jpg'
   it['file'] = 'images/' + it['id'] + ext; (ROOT/it['file']).write_bytes(data); rows.append(it)
 (ROOT/'images.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
 sheets(rows); print('UNIQUE', len(rows))

if __name__ == '__main__': main()
