"""Rennala, Queen of the Full Moon public image reference collector (research only, never imported by the game).
Reads public pages for image links; no login/paywall/anti-bot bypass. Download != inspected.
Usage: python collect_refs.py        -> candidates.json, images/rn-ref-NNN.*, contact-NN.jpg
"""
import concurrent.futures, hashlib, io, json, pathlib, re, shutil, sys, urllib.parse, urllib.request
from html.parser import HTMLParser
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = [
 'https://game8.co/games/Elden-Ring/archives/369062',
 'https://game8.co/games/Elden-Ring/archives/369358',
 'https://game8.co/games/Elden-Ring/archives/369354',
 'https://game8.co/games/Elden-Ring/archives/369174',
 'https://game8.co/games/Elden-Ring/archives/369673',
 'https://game8.jp/eldenring/441117',
 'https://gamewith.jp/eldenring/321702',
 'https://kamigame.jp/eldenring/page/199453575720504984.html',
 'https://jp.samurai-gamers.com/eldenring/er-boss048/',
 'https://www.gamepressure.com/elden-ring/rennala-queen-of-the-full-moon/z7f75e',
 'https://eip.gg/elden-ring/guides/how-to-beat-rennala-queen-of-the-full-moon-boss/',
 'https://eip.gg/elden-ring/guides/academy-of-raya-lucaria-walkthrough/',
 'https://www.gamesradar.com/elden-ring-rennala-boss-fight-queen-of-the-full-moon/',
 'https://www.gameshedge.com/elden-ring-rennala-queen-of-the-full-moon-boss-guide/',
 'https://www.ign.com/wikis/elden-ring/Rennala,_Queen_of_the_Full_Moon',
 'https://rankedboost.com/elden-ring/rennala-queen-of-the-full-moon/',
 'https://www.miklix.com/gaming/elden-ring/rennala-queen-of-the-full-moon-raya-lucaria-academy-boss-fight',
 'https://www.pushsquare.com/guides/elden-ring-how-to-beat-rennala-queen-of-the-full-moon',
 'https://www.gamespot.com/articles/elden-ring-rennala-boss-guide-how-to-beat-queen-of-the-full-moon/1100-6501142/',
 'https://www.polygon.com/elden-ring-guide-walkthrough/22958488/rennala-queen-of-the-full-moon-boss-fight-raya-lucaria-academy',
 'https://screenrant.com/elden-ring-rennala-queen-full-moon-boss-guide/',
 'https://www.thegamer.com/elden-ring-rennala-queen-of-the-full-moon-boss-fight-guide/',
 'https://gamerant.com/elden-ring-rennala-queen-of-the-full-moon-boss-guide/',
 'https://eldenring.wiki.fextralife.com/Rennala,+Queen+of+the+Full+Moon',
 'https://eldenring.wiki.fextralife.com/Remembrance+of+the+Full+Moon+Queen',
 'https://eldenring.wiki.fextralife.com/Carian+Regal+Scepter',
 'https://eldenring.wiki.fextralife.com/Rennala%27s+Full+Moon',
 'https://eldenring.wiki.fextralife.com/Queen+of+the+Full+Moon+Set',
 'https://eldenring.wiki.fextralife.com/Queen%27s+Crescent+Crown',
 'https://eldenring.wiki.fextralife.com/Queen%27s+Robe',
 'https://eldenring.wiki.fextralife.com/Great+Rune+of+the+Unborn',
 'https://eldenring.wiki.fextralife.com/Juvenile+Scholar',
 'https://eldenring.wiki.fextralife.com/Comet+Azur',
 'https://eldenring.wiki.gg/wiki/Rennala,_Queen_of_the_Full_Moon',
 'https://eldenring.fandom.com/wiki/Rennala,_Queen_of_the_Full_Moon',
]
CU = 'https://www.creativeuncut.com/gallery-43/'
EXTRA = {CU + s + '.html': CU + 'art/' + s + '.jpg' for s in [
 'er-rennala-queen-of-the-full-moon',
 'er-rennala-artwork',
 'er-rennala-children',
 'er-rennalas-children',
 'er-lunar-princess-ranni',
 'er-ranni-the-witch',
 'er-primevil-sorcerer-azur-concept',
 'er-master-lusat-concept',
 'er-glintstone-sorcerer-concept',
 'er-lazuli-sorcerer-concept',
 'er-carian-knight-set-concept',
 'er-lesser-bloodhound-knight',
 'er-troll-concept',
 'er-lone-wolf-concept',
 'er-radagon-of-the-golden-order',
]}
KEY = re.compile(r'rennala|full[-_ ]?moon|raya[-_ ]?lucaria|sweet|juvenile|scholar|amber|unborn|carian|scepter|comet[-_ ]?azur|glintstone|crescent[-_ ]?crown|queen|rebirth|larval|ranni|lusat|azur|bloodhound|troll|レナラ|満月|レアルカリア', re.I)
BAD = re.compile(r'avatar|logo|icon|favicon|loading|transparent|1x1|banner|social|150x|100x|profile|sprite|button|thumb/.{0,80}/(20|30|40)px|status|damage|upgrades|currency|runes|membership_modal|bee_|Advertiser|tracking\.game8|img-pr-article', re.I)

SLICES = [
 ('game8.co', 'p-archiveHeader', 'p-archiveFooter'),
 ('game8.jp', 'p-archiveHeader', 'コメント'),
 ('gamewith.jp', '満月の女王レナラの攻略', 'コメント'),
 ('kamigame.jp', '<article', '</article>'),
 ('samurai-gamers', '満月の女王、レナラの倒し方', '満月の女王、レナラのドロップ'),
 ('eip.gg', 'entry-content', '</article>'),
]

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
  s = fetch(url).decode('utf-8', 'replace')
  for dom, st, en in SLICES:
   if dom in url:
    i = s.find(st); j = s.find(en, i) if i >= 0 else -1
    if i >= 0 and j > i: s = s[i:j]
    break
  p = Imgs(); p.feed(s); out = []
  for img, alt in p.items:
   img = urllib.parse.urljoin(url, img).replace('&amp;', '&').split()[0]
   if BAD.search(img): continue
   if not (KEY.search(img + ' ' + alt) or alt == 'page cover' or any(d in url for d in ('gamepressure', 'game8', 'gamewith', 'kamigame', 'samurai-gamers', 'eip.gg'))):
    continue
   out.append(dict(page_url=url, image_url=img, alt=alt))
  return out, dict(url=url, status='readable', candidate_count=len(out))
 except Exception as e:
  return [], dict(url=url, status='failed', error=str(e)[:160])

def download(item):
 try:
  data = fetch(item['image_url'], item['page_url']); im = Image.open(io.BytesIO(data)); im.load()
  if im.width < 360 or im.height < 200: return None
  g = list(im.convert('L').resize((17, 16)).getdata())
  dh = sum(int(g[y*17+x] > g[y*17+x+1]) << (y*16+x) for y in range(16) for x in range(16))
  return dict(item, width=im.width, height=im.height, frames=getattr(im, 'n_frames', 1), sha256=hashlib.sha256(data).hexdigest(), dhash=dh), data
 except Exception as e:
  print('IMAGE_FAIL', item['image_url'][:90], str(e)[:60], flush=True); return None

def sheets(rows):
 for old in ROOT.glob('contact-*.jpg'): old.unlink()
 tiles = []
 for it in rows:
  im = Image.open(ROOT/it['file']).convert('RGB'); im.thumbnail((660, 365))
  t = Image.new('RGB', (680, 410), '#131c23'); t.paste(im, ((680-im.width)//2, 0))
  ImageDraw.Draw(t).text((10, 378), '%s %dx%d f=%d' % (it['id'], it['width'], it['height'], it['frames']), fill='white'); tiles.append(t)
 for st in range(0, len(tiles), 6):
  g = tiles[st:st+6]; sh = Image.new('RGB', (2040, 410*((len(g)+2)//3)), '#131c23')
  for i, t in enumerate(g): sh.paste(t, ((i % 3)*680, (i//3)*410))
  sh.save(ROOT/('contact-%02d.jpg' % (st//6+1)), quality=90)

def main():
 sys.stdout.reconfigure(encoding='utf-8')
 if (ROOT/'images').exists(): shutil.rmtree(ROOT/'images')
 (ROOT/'images').mkdir(parents=True, exist_ok=True)
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
   it['id'] = 'rn-ref-%03d' % (len(rows)+1)
   ext = '.gif' if data.startswith(b'GIF') else '.png' if data.startswith(b'\x89PNG') else '.webp' if data[8:12] == b'WEBP' else '.jpg'
   it['file'] = 'images/' + it['id'] + ext; (ROOT/it['file']).write_bytes(data); rows.append(it)
 (ROOT/'images.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
 sheets(rows); print('UNIQUE', len(rows))

if __name__ == '__main__': main()
