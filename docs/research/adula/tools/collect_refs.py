"""Adula public image reference collector (research only, never imported by the game).
Reads public pages for image links; no login/paywall/anti-bot bypass. Download != inspected.
Usage: python collect_refs.py        -> candidates.json, images/ad-ref-NNN.*, contact-NN.jpg
"""
import concurrent.futures, hashlib, io, json, pathlib, re, sys, urllib.parse, urllib.request
from html.parser import HTMLParser
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = [
 'https://eldenring.wiki.fextralife.com/Glintstone+Dragon+Adula',
 'https://eldenring.wiki.fextralife.com/Glinstone+Dragon+Adula',
 'https://eldenring.wiki.fextralife.com/Glintstone+Dragon',
 'https://eldenring.wiki.fextralife.com/Adula%27s+Moonblade',
 'https://eldenring.wiki.fextralife.com/Glintstone+Dragon+Smarag',
 'https://eldenring.wiki.fextralife.com/Three+Sisters',
 'https://eldenring.wiki.fextralife.com/Cathedral+of+Manus+Celes',
 'https://eldenring.wiki.fextralife.com/Moonlight+Altar',
 'https://eldenring.wiki.fextralife.com/Ranni+the+Witch',
 'https://eldenring.wiki.fextralife.com/Dragon+Heart',
 'https://eldenring.wiki.fextralife.com/Smarag%27s+Glintstone+Breath',
 'https://eldenring.wiki.gg/wiki/Adula',
 'https://eldenring.wiki.gg/wiki/Glintstone_Dragon_Adula',
 'https://eldenring.wiki.gg/wiki/Adula%27s_Moonblade',
 'https://eldenring.wiki.gg/wiki/Concept_art',
 'https://eldenring.wiki.gg/wiki/Smarag',
 'https://eldenring.wiki.gg/wiki/Dragons',
 'https://eldenring.wiki.gg/wiki/Three_Sisters',
 'https://eldenring.wiki.gg/wiki/Cathedral_of_Manus_Celes',
 'https://eldenring.wiki.gg/wiki/Moonlight_Altar',
 'https://eldenring.fandom.com/wiki/Glintstone_Dragon_Adula',
 'https://eldenring.fandom.com/wiki/Adula%27s_Moonblade',
 'https://segmentnext.com/elden-ring/bosses/glintstone-dragon-adula',
 'https://segmentnext.com/elden-ring-glintstone-dragon-adula',
 'https://game8.co/games/Elden-Ring/archives/376001',
 'https://game8.co/games/Elden-Ring/archives/369845',
 'https://www.gamepressure.com/elden-ring/glintstone-dragon-adula/z3fe3e',
 'https://rankedboost.com/elden-ring/glinstone-dragon-adula/',
 'https://rankedboost.com/elden-ring/adulas-moonblade/',
 'https://whatifgaming.com/?p=67541',
 'https://staging2.eip.gg/elden-ring/guides/how-to-beat-glintstone-dragon-adula',
 'https://eip.gg/elden-ring/guides/how-to-beat-glintstone-dragon-adula/',
 'https://gamerant.com/elden-ring-how-beat-glintstone-dragon-adula',
 'https://gamertweak.com/beat-glintstone-dragon-adula-elden-ring',
 'https://thenerdstash.com/elden-ring-how-to-defeat-glintstone-dragon-adula',
 'https://gamerguides.com/elden-ring/database/bosses/liurnia-of-the-lakes-bosses/glintstone-dragon-adula',
 'https://www.millenium.org/guide/390493.html',
 'https://tvtropes.org/pmwiki/pmwiki.php/Characters/EldenRingDragons',
 'https://www.thegamer.com/elden-ring-glintstone-dragon-adula-boss-fight-guide',
 'https://www.gamesradar.com/elden-ring-glintstone-dragon-adula-boss-guide/',
 'https://screenrant.com/elden-ring-glintstone-dragon-adula-boss-guide/',
 'https://www.pushsquare.com/guides/elden-ring-how-to-beat-glintstone-dragon-adula',
 'https://www.miklix.com/gaming/elden-ring/glintstone-dragon-adula-moonlight-altar-boss-fight',
 'https://www.miklix.com/gaming/elden-ring/glintstone-dragon-adula-three-sisters-boss-fight',
 'https://www.creativeuncut.com/gallery-43/er-glintstone-dragon.html',
 'https://www.creativeuncut.com/art_elden-ring_a.html',
 'https://sportskeeda.com/esports/how-defeat-glintstone-dragon-adula-elden-ring',
 'https://primagames.com/gaming/elden-ring-glintstone-dragon-adula',
 'https://www.ign.com/wikis/elden-ring/Glintstone_Dragon_Adula_Boss_Guide',
 'https://www.vg247.com/elden-ring-glintstone-dragon-adula-boss-guide',
]
EXTRA = {
 'https://eldenring.wiki.fextralife.com/Glintstone+Dragon+Adula#1': 'https://static0.fextralifeimages.com/file/eldenring/1/1f/Glintstone_dragon_bosses_elden_ring_wiki_600px1-min.png',
 'https://eldenring.wiki.fextralife.com/Glintstone+Dragon+Adula#2': 'https://static0.fextralifeimages.com/file/eldenring/4/44/Glintstone-dragon-adula-2-elden-ring-wiki-guide.png',
 'https://eldenring.wiki.fextralife.com/Glintstone+Dragon+Adula#3': 'https://static0.fextralifeimages.com/file/eldenring/3/34/Adula-combo-chart.png',
 'https://eldenring.wiki.fextralife.com/Glintstone+Dragon+Adula#4': 'https://static0.fextralifeimages.com/file/eldenring/d/d0/Glintstone-dragon-adula-1-elden-ring-wiki-guide.png',
 'https://eldenring.wiki.fextralife.com/Glintstone+Dragon#1': 'https://static0.fextralifeimages.com/file/eldenring/b/bd/Glintstone-dragon-enemy-creature-elden-ring-wiki-guide-300px.png',
 'https://eldenring.wiki.fextralife.com/Glintstone+Dragon+Smarag#5': 'https://static0.fextralifeimages.com/file/eldenring/3/3e/Glintstone-dragon-smarag-1-elden-ring-wiki-guide.png',
 'https://eldenring.wiki.fextralife.com/Glintstone+Dragon+Smarag#6': 'https://static0.fextralifeimages.com/file/eldenring/3/32/Glintstone-dragon-smarag-2-elden-ring-wiki-guide.png',
}
KEY = re.compile(r'adula|glintstone|glinstone|dragon|moonblade|moonlight|manus|three[-_ ]sisters|smarag|ranni|concept', re.I)
BAD = re.compile(r'avatar|logo|icon|favicon|loading|transparent|1x1|banner|social|150x|100x|profile|sprite|button|thumb/.{0,80}/(20|30|40)px|status|damage|upgrades|currency|runes', re.I)

def fetch(url, ref=None):
 url = urllib.parse.quote(url, safe="%:/?&=#@+,;~!$*()'")
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
   it['id'] = 'ad-ref-%03d' % (len(rows)+1)
   ext = '.gif' if data.startswith(b'GIF') else '.png' if data.startswith(b'\x89PNG') else '.webp' if data[8:12] == b'WEBP' else '.jpg'
   it['file'] = 'images/' + it['id'] + ext; (ROOT/it['file']).write_bytes(data); rows.append(it)
 (ROOT/'images.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
 sheets(rows); print('UNIQUE', len(rows))

if __name__ == '__main__': main()
