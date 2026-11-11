"""Flying Dragon Greyll public image reference collector (research only, never imported by the game).
Reads public pages for image links; no login/paywall/anti-bot bypass. Download != inspected.
Usage: python collect_refs.py        -> candidates.json, images/gr-ref-NNN.*, contact-NN.jpg
"""
import concurrent.futures, hashlib, io, json, pathlib, re, sys, urllib.parse, urllib.request
from html.parser import HTMLParser
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = [
 'https://www.creativeuncut.com/gallery-43/er-flying-dragon-agheel.html',
 'https://www.creativeuncut.com/gallery-43/er-ancient-dragon-lansseax.html',
 'https://www.creativeuncut.com/gallery-43/er-glintstone-dragon-adula.html',
 'https://www.creativeuncut.com/gallery-43/er-drake-knight-set-concept.html',
 'https://gamerguides.com/elden-ring/database/bosses/limgrave-bosses/flying-dragon-agheel',
 'https://gamerguides.com/elden-ring/database/bosses/caelid-bosses/elder-dragon-greyoll',
 'https://rankedboost.com/elden-ring/flying-dragon-agheel/',
 'https://rankedboost.com/elden-ring/dragon-communion/',
 'https://game8.co/games/Elden-Ring/archives/369138',
 'https://game8.co/games/Elden-Ring/archives/371141',
 'https://segmentnext.com/elden-ring/bosses/agheel',
 'https://segmentnext.com/elden-ring/bosses/elder-dragon-greyoll',
 'https://gamerguides.com/elden-ring/database/bosses/caelid-bosses/flying-dragon-greyll',
 'https://gamepressure.com/elden-ring/flying-dragon-greyll/z0fe41',
 'https://www.gamepressure.com/elden-ring/flying-dragon-greyll/z0fe41',
 'https://segmentnext.com/elden-ring/bosses/greyll',
 'https://segmentnext.com/elden-ring-greyll',
 'https://www.ginx.tv/en/flying-dragon-greyll-elden-ring',
 'https://www.ginx.tv/en/elden-ring/flying-dragon-greyll-elden-ring',
 'https://breezewiki.pages.dev/knowledge/flying-dragon-greyll-elden-ring-20654',
 'https://rankedboost.com/elden-ring/flying-dragon-greyll/',
 'https://rankedboost.com/elden-ring/elder-dragon-greyoll/',
 'https://game8.co/games/Elden-Ring/archives/373810',
 'https://game8.co/games/Elden-Ring/archives/376353',
 'https://vip-develop.gamepur.com/?p=307559',
 'https://eldenring.wiki.fextralife.com/Flying+Dragon+Greyll',
 'https://eldenring.wiki.fextralife.com/Flying+Dragon+Agheel',
 'https://eldenring.wiki.fextralife.com/Elder+Dragon+Greyoll',
 'https://eldenring.wiki.fextralife.com/Farum+Greatbridge',
 'https://eldenring.wiki.fextralife.com/Greyoll%27s+Dragonbarrow',
 'https://eldenring.wiki.fextralife.com/Bestial+Sanctum',
 'https://eldenring.wiki.fextralife.com/Greyoll%27s+Roar',
 'https://eldenring.wiki.fextralife.com/Dragon+Heart',
 'https://eldenring.wiki.fextralife.com/Dragons',
 'https://eldenring.wiki.fextralife.com/Church+of+Dragon+Communion',
 'https://eldenring.wiki.fextralife.com/Dragonwound+Grease',
 'https://eldenring.wiki.gg/wiki/Flying_Dragon_Greyll',
 'https://eldenring.wiki.gg/wiki/Greyoll',
 'https://eldenring.wiki.gg/wiki/Dragons',
 'https://eldenring.wiki.gg/wiki/Flying_Dragon_Agheel',
 'https://eldenring.wiki.gg/wiki/Farum_Greatbridge',
 'https://eldenring.wiki.gg/wiki/Greyoll%27s_Dragonbarrow',
 'https://eldenring.wiki.gg/wiki/Bestial_Sanctum',
 'https://eldenring.fandom.com/wiki/Flying_Dragon_Greyll',
 'https://eldenring.fandom.com/wiki/Greyoll',
 'https://www.thegamer.com/elden-ring-flying-dragon-greyll-boss-guide/',
 'https://www.pushsquare.com/guides/elden-ring-how-to-beat-flying-dragon-greyll',
 'https://www.eurogamer.net/elden-ring-flying-dragon-greyll-location',
 'https://www.miklix.com/gaming/elden-ring/flying-dragon-greyll-dragonbarrow-boss-fight',
 'https://eldenringwiki.com/flying-dragon-greyll/',
 'https://www.creativeuncut.com/gallery-43/er-greyoll.html',
 'https://www.gamesradar.com/elden-ring-flying-dragon-greyll-boss-guide/',
 'https://www.ign.com/wikis/elden-ring/Flying_Dragon_Greyll_Boss_Guide',
 'https://www.polygon.com/elden-ring-guide-walkthrough/23004030/flying-dragon-greyll',
 'https://eip.gg/elden-ring/guides/how-to-beat-flying-dragon-greyll/',
 'https://primagames.com/gaming/elden-ring-flying-dragon-greyll',
 'https://screenrant.com/elden-ring-flying-dragon-greyll-boss-guide/',
 'https://www.gameskinny.com/elden-ring-flying-dragon-greyll-boss-guide',
 'https://www.dexerto.com/gaming/elden-ring-flying-dragon-greyll',
 'https://www.exitlag.com/blog/flying-dragon-greyll-elden-ring/',
 'https://sportskeeda.com/esports/elden-ring-flying-dragon-greyll',
 'https://www.arrpeegeez.com/2022/09/elden-ring-walkthrough-flying-dragon.html',
 'https://www.vg247.com/elden-ring-flying-dragon-greyll',
]
EXTRA = {
 'https://eldenring.wiki.fextralife.com/Flying+Dragon+Agheel#1': 'https://static0.fextralifeimages.com/file/eldenring/0/04/Flying_dragon_agheel_2_bosses_elden_ring_wiki_600px1-min.png',
 'https://eldenring.wiki.fextralife.com/Flying+Dragon+Agheel#2': 'https://static0.fextralifeimages.com/file/eldenring/a/ad/Agheel-combo-chart.png',
 'https://eldenring.wiki.fextralife.com/Flying+Dragon+Agheel#3': 'https://static0.fextralifeimages.com/file/eldenring/2/25/Flying_dragon_agheel_2_bosses_elden_ring_wiki_600px.png',
 'https://eldenring.wiki.fextralife.com/Flying+Dragon+Agheel#4': 'https://static0.fextralifeimages.com/file/eldenring/b/b6/Flying_dragon_agheel_bosses_elden_ring_wiki_600px.png',
 'https://eldenring.wiki.fextralife.com/Elder+Dragon+Greyoll#1': 'https://static0.fextralifeimages.com/file/eldenring/2/2d/Greyoll_bosses_elden_ring_wiki_guide_300px.png',
 'https://eldenring.wiki.fextralife.com/Elder+Dragon+Greyoll#2': 'https://static0.fextralifeimages.com/file/eldenring/c/c8/Greyoll1-min.png',
 'https://eldenring.wiki.fextralife.com/Dragonbarrow#1': 'https://static0.fextralifeimages.com/file/eldenring/1/1a/Dragonbarrow-region-location-elden-ring-wiki-guide-300px-min.png',
 'https://eldenring.wiki.fextralife.com/Dragonbarrow#2': 'https://static0.fextralifeimages.com/file/eldenring/4/46/Dragonbarrow_map_elden_ring_wiki_guide_300px.png',
 'https://eldenring.wiki.fextralife.com/Greyoll%27s+Roar': 'https://static0.fextralifeimages.com/file/eldenring/7/74/Greyolls_roar_incantation_elden_ring_wiki_guide_200px.png',
 'https://www.creativeuncut.com/gallery-43/er-flying-dragon-agheel.html': 'https://www.creativeuncut.com/gallery-43/art/er-flying-dragon-agheel.jpg',
 'https://www.creativeuncut.com/gallery-43/er-ancient-dragon-lansseax.html': 'https://www.creativeuncut.com/gallery-43/art/er-ancient-dragon-lansseax.jpg',
 'https://www.creativeuncut.com/gallery-43/er-glintstone-dragon-adula.html': 'https://www.creativeuncut.com/gallery-43/art/er-glintstone-dragon-adula.jpg',
 'https://www.creativeuncut.com/gallery-43/er-drake-knight-set-concept.html': 'https://www.creativeuncut.com/gallery-43/art/er-drake-knight-set-concept.jpg',
 'https://eldenring.wiki.fextralife.com/Flying+Dragon+Greyll': 'https://static0.fextralifeimages.com/file/eldenring/0/07/Flying_dragon_greyll_bosses_elden_ring_wiki_guide_300px.png',
 'https://eldenring.wiki.gg/wiki/Flying_Dragon_Greyll#2': 'https://eldenring.wiki.gg/images/ER_Flying_Dragon_Greyll.png',
 'https://eldenring.wiki.gg/wiki/Greyoll#2': 'https://eldenring.wiki.gg/images/ER_Greyoll.png',
 'https://eldenring.wiki.gg/wiki/Dragons#2': 'https://eldenring.wiki.gg/images/ER_Flying_Dragon_Agheel.png',
 'https://www.creativeuncut.com/gallery-43/er-greyoll.html': 'https://www.creativeuncut.com/gallery-43/art/er-greyoll.jpg',
 'https://www.creativeuncut.com/gallery-43/er-dragon.html': 'https://www.creativeuncut.com/gallery-43/art/er-dragon.jpg',
}
KEY = re.compile(r'greyll|greyoll|agheel|farum|dragon|bridge|bestial|caelid|wyrm|drake', re.I)
BAD = re.compile(r'avatar|logo|icon|favicon|loading|transparent|1x1|banner|social|150x|100x|profile|sprite|button|status|damage|upgrades|currency|runes', re.I)

def fetch(url, ref=None):
 url = urllib.parse.quote(url, safe=":/?&=%#+,;@!$'()*~")
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
   it['id'] = 'gr-ref-%03d' % (len(rows)+1)
   ext = '.gif' if data.startswith(b'GIF') else '.png' if data.startswith(b'\x89PNG') else '.webp' if data[8:12] == b'WEBP' else '.jpg'
   it['file'] = 'images/' + it['id'] + ext; (ROOT/it['file']).write_bytes(data); rows.append(it)
 (ROOT/'images.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
 sheets(rows); print('UNIQUE', len(rows))

if __name__ == '__main__': main()
