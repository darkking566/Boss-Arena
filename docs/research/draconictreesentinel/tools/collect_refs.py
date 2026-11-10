"""Draconic Tree Sentinel public image reference collector (research only, never imported by the game).
Reads public pages for image links; no login/paywall/anti-bot bypass. Download != inspected.
Usage: python collect_refs.py        -> candidates.json, images/dts-ref-NNN.*, contact-NN.jpg
"""
import concurrent.futures, hashlib, io, json, pathlib, re, sys, urllib.parse, urllib.request
from html.parser import HTMLParser
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = [
 'https://eldenring.wiki.gg/wiki/Draconic_Tree_Sentinel',
 'https://eldenring.wiki.gg/wiki/Dragon_Greatclaw',
 'https://eldenring.wiki.gg/wiki/Dragonclaw_Shield',
 'https://eldenring.wiki.gg/wiki/Malformed_Dragon_Armor',
 'https://eldenring.wiki.gg/wiki/Tree_Sentinel',
 'https://eldenring.wiki.fextralife.com/Draconic+Tree+Sentinel',
 'https://eldenring.wiki.fextralife.com/Dragon+Greatclaw',
 'https://eldenring.wiki.fextralife.com/Dragonclaw+Shield',
 'https://eldenring.wiki.fextralife.com/Malformed+Dragon+Set',
 'https://gamesradar.com/elden-ring-draconic-tree-sentinel-boss-fight-how-to-beat',
 'https://segmentnext.com/elden-ring/bosses/draconic-tree-sentinel',
 'https://segmentnext.com/elden-ring-draconic-tree-sentinel',
 'https://game8.co/games/Elden-Ring/archives/369752',
 'https://screenrant.com/elden-ring-draconic-tree-sentinel-leyndell-fight-guide/',
 'https://pushsquare.com/guides/elden-ring-how-to-beat-draconic-tree-sentinel',
 'https://rankedboost.com/elden-ring/draconic-tree-sentinel/',
 'https://www.gamepressure.com/elden-ring/draconic-tree-sentinel/zbfe79',
 'https://gamertweak.com/beat-draconic-tree-sentinel-elden-ring',
 'https://gameplay.tips/guides/elden-ring-how-to-fight-draconic-tree-sentinel.html',
 'https://staging2.eip.gg/elden-ring/guides/how-to-beat-the-draconic-tree-sentinel',
 'https://gamerguides.com/elden-ring/database/bosses/leyndell-royal-capital-bosses/draconic-tree-sentinel',
 'https://eldenring.wiki.fextralife.com/Capital+Outskirts',
 'https://eldenring.wiki.fextralife.com/Tree+Sentinel',
 'https://www.thegamer.com/elden-ring-draconic-tree-sentinel-boss-fight-guide/',
 'https://www.dexerto.com/elden-ring/how-to-beat-draconic-tree-sentinel-in-elden-ring-1773469/',
 'https://gamerant.com/elden-ring-how-to-beat-draconic-tree-sentinel-boss-guide/',
 'https://gamerant.com/elden-ring-draconic-tree-sentinel-manga-fan-art/',
 'https://eip.gg/elden-ring/guides/how-to-beat-the-draconic-tree-sentinel-crumbling-farum-azula/',
 'https://eip.gg/elden-ring/db/malformed-dragon-armor/',
 'https://www.gamerguides.com/elden-ring/database/armors/chest-armors/malformed-dragon-armor',
 'https://hardcoregamer.com/elden-ring/malformed-dragon-armor/',
 'https://www.sportskeeda.com/esports/how-get-malformed-dragon-armor-set-elden-ring',
 'https://erdtreeforge.com/armor/malformed-dragon-armor/',
 'https://vaultgg.app/guides/draconic-tree-sentinel',
 'https://eldenring.wiki.fextralife.com/Draconic_Tree_Sentinel',
 'https://eldenring.wiki.fextralife.com/Malformed_Dragon_Set',
]
EXTRA = {}
KEY = re.compile(r'draconic|dragon|sentinel|greatclaw|dragonclaw|malformed|tree[-_ ]?sentinel|capital|outskirts|farum', re.I)
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
   it['id'] = 'dts-ref-%03d' % (len(rows)+1)
   ext = '.gif' if data.startswith(b'GIF') else '.png' if data.startswith(b'\x89PNG') else '.webp' if data[8:12] == b'WEBP' else '.jpg'
   it['file'] = 'images/' + it['id'] + ext; (ROOT/it['file']).write_bytes(data); rows.append(it)
 (ROOT/'images.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
 sheets(rows); print('UNIQUE', len(rows))

if __name__ == '__main__': main()
