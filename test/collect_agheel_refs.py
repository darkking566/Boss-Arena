"""Collect public reference images of Flying Dragon Agheel, never game runtime assets. Run explicitly.
Keeps original page + image URLs; byte and perceptual dedup; no access-control bypass.
Usage: python -I test/collect_agheel_refs.py
"""
import concurrent.futures, hashlib, io, json, pathlib, re, urllib.parse, urllib.request
from html.parser import HTMLParser
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'docs/research/agheel'
PAGES = [
 'https://eldenring.wiki.fextralife.com/Flying+Dragon+Agheel',
 'https://eldenring.wiki.fextralife.com/Flying+Dragon+Greyll',
 'https://eldenring.wiki.fextralife.com/Agheel\'s+Flame',
 'https://eldenring.wiki.fextralife.com/Dragon-Burnt+Ruins',
 'https://eldenring.wiki.fextralife.com/Agheel+Lake+North',
 'https://eldenring.wiki.gg/wiki/Dragon',
 'https://eldenring.wiki.gg/wiki/Flying_Dragon_Greyll',
 'https://www.creativeuncut.com/gallery-43/er-flying-dragon-agheel.html',
 'https://www.gamepressure.com/elden-ring/flying-dragon-agheel/z5f5f4',
 'https://www.dexerto.com/guides/how-to-beat-flying-dragon-agheel-in-elden-ring-1767669/',
 'https://game8.co/games/Elden-Ring/archives/353864',
 'https://www.gamerguides.com/elden-ring/guide/limgrave/bosses/how-to-beat-flying-dragon-agheel',
 'https://progameguides.com/elden-ring/how-to-beat-flying-dragon-agheel-in-elden-ring/',
 'https://progameguides.com/elden-ring/all-dragon-locations-in-elden-ring/',
 'https://www.gamesradar.com/elden-ring-agheel-boss-fight-how-to-beat-flying-dragon/',
 'https://primagames.com/gaming/elden-ring-flying-dragon-agheel-guide',
 'https://www.upcomer.com/how-to-defeat-flying-dragon-agheel-in-elden-ring',
 'https://www.godisageek.com/?p=260557',
 'https://www.famitsu.com/news/202203/03253323.html',
 'https://eip.gg/elden-ring/guides/how-to-beat-the-flying-dragon-agheel-boss/',
 'https://villains.fandom.com/wiki/Agheel',
 'https://80.lv/articles/fan-created-a-diorama-of-elden-ring-s-flying-dragon-agheel',
 'https://www.pcgamesn.com/elden-ring/dragon-diorama',
 'https://www.bedeutungonline.de/who-is-agheel-elden-ring-dragon-boss-history-fighting-style-strategy/',
 'https://techstory.in/how-to-beat-agheel-in-elden-ring/',
 'https://gamewith.jp/eldenring/article/show/326434',
 'https://kamikouryaku.net/eldenring/?%E9%A3%9B%E7%AB%9C%E3%82%A2%E3%82%AE%E3%83%BC%E3%83%AB',
 'https://www.thegamer.com/elden-ring-flying-dragon-agheel-boss-fight-guide/',
 'https://www.pcgamer.com/elden-ring-dragon-agheel/',
 'https://www.thegamer.com/elden-ring-flying-dragon-agheel-boss-guide/',
 'https://godisageek.com/2022/02/elden-ring-flying-dragon-agheel-boss-guide/',
 'https://www.gamerguides.com/elden-ring/guide/limgrave/bosses/how-to-beat-flying-dragon-agheel-in-limgrave',
 'https://www.dexerto.com/elden-ring/how-to-beat-flying-dragon-agheel-in-elden-ring-1767669/',
 'https://gamerant.com/elden-ring-flying-dragon-agheel-boss-guide/',
 'https://bossphase.com/guides/flying-dragon-agheel-flying-dragon-agheel-elden-ring-wiki/',
 'https://www.techradar.com/how-to/elden-ring-bosses-guide',
 'https://appmedia.jp/?p=75197640',
 'https://appmedia.jp/?p=75200364',
 'https://diamondlobby.com/elden-ring/how-to-defeat-dragon-agheel/',
 'https://steamforged.com/blogs/brands/flying-dragon-agheel-elden-ring-designer-diary',
 'https://store.bandainamcoent.com/elden-ring-the-board-game-flying-dragon-agheel',
 'https://www.pushsquare.com/guides/elden-ring-how-to-beat-flying-dragon-agheel',
 'https://www.ginx.tv/en/elden-ring/elden-ring-flying-dragon-agheel-boss-beat-location',
 'https://sirusgaming.com/elden-ring-flying-dragon-agheel-boss-fight-guide/',
 'https://gamertweak.com/beat-flying-dragon-agheel/amp/',
 'https://www.wepc.com/gaming/elden-ring/flying-dragon-agheel-boss-guide/',
 'https://www.highgroundgaming.com/all-elden-ring-dragons-ranked/',
 'https://stevivor.com/guides/guides-elden-ring-closed-network-test-boss-locations/',
 'https://kotaku.com/elden-ring-players-are-already-cheesing-its-dragon-boss-1848049327',
 'https://www.pcgamer.com/elden-ring-players-are-already-tricking-bosses-into-falling-off-cliffs/',
 'https://www.ggrecon.com/articles/elden-ring-players-find-easy-way-to-defeat-bosses/',
 'https://zulusgames.com/products/elden-ring-flying-dragon-agheel-expansion',
 'https://www.sportskeeda.com/esports/top-5-easiest-bosses-elden-ring-find',
]
KEY = r'agheel|aghee|greyll|dragon|飛竜|飞龙|飛龍|アギール|ドラゴン'
SKIP = r'avatar|logo|icon|banner|social|sprite|favicon|100x|150x|45x45|-thumb|placeholder|ad[sx]?/|twemoji|gravatar'

def fetch(u):  # plain request: a 403 / bot wall is recorded as a failure, never worked around
 with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=25) as f: return f.read()

class Images(HTMLParser):
 def __init__(self): super().__init__(); self.items = []
 def handle_starttag(self, tag, attrs):
  a = dict(attrs)
  if tag == 'meta' and a.get('property') in ('og:image', 'twitter:image'): self.items.append((a.get('content', ''), 'page cover')); return
  if tag not in ('img', 'source', 'a'): return
  alt = a.get('alt') or a.get('title') or ''
  for key in ['data-src', 'data-lazy-src', 'data-original', 'src', 'srcset', 'href']:
   u = (a.get(key) or '').split(' ')[0]
   if re.search(r'\.(jpe?g|png|webp)(\?|$)', u, re.I): self.items.append((u, alt)); break

def page(u):
 try:
  s = fetch(u).decode('utf-8', errors='replace'); p = Images(); p.feed(s); out = []
  for img, alt in p.items:
   img = urllib.parse.urljoin(u, img)
   if (re.search(KEY, img + ' ' + alt, re.I) or alt == 'page cover') and not re.search(SKIP, img, re.I):
    out.append({'page_url': u, 'image_url': img, 'alt': alt})
  print('PAGE', u, len(out), flush=True); return out
 except Exception as e: print('PAGE_FAIL', u, str(e)[:90], flush=True); return []

def download(item):
 try:
  data = fetch(item['image_url'])
  im = Image.open(io.BytesIO(data)); im.load()
  if im.width < 400 or im.height < 200: return None
  item.update(width=im.width, height=im.height, sha256=hashlib.sha256(data).hexdigest())
  g = im.convert('L').resize((17, 16)); px = list(g.get_flattened_data() if hasattr(g, 'get_flattened_data') else g.getdata())
  item['dhash'] = sum(int(px[y*17+x] > px[y*17+x+1]) << (y*16+x) for y in range(16) for x in range(16))
  return item, data, im.convert('RGB')
 except Exception as e: print('IMG_FAIL', item['image_url'][:95], str(e)[:65], flush=True); return None

def main():
 (ROOT / 'images').mkdir(parents=True, exist_ok=True)
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex: candidates = [x for p in ex.map(page, PAGES) for x in p]
 cu = 'https://www.creativeuncut.com/gallery-43/'
 fx = 'https://static0.fextralifeimages.com/file/eldenring/'
 candidates = [  # concept art first, so it gets the lowest ids
  {'page_url': cu + 'er-flying-dragon-agheel.html', 'image_url': cu + 'art/er-flying-dragon-agheel.jpg', 'alt': 'Flying Dragon Agheel concept art (official art book scan via Creative Uncut)'},
  {'page_url': cu + 'er-glintstone-dragon-adula.html', 'image_url': cu + 'art/er-glintstone-dragon-adula.jpg', 'alt': 'Glintstone Dragon Adula concept art (same flying-dragon body plan)'},
 ] + [{'page_url': 'https://eldenring.wiki.fextralife.com/Flying+Dragon+Agheel', 'image_url': fx + f, 'alt': 'Flying Dragon Agheel (Fextralife)'}
      for f in ['0/04/Flying_dragon_agheel_2_bosses_elden_ring_wiki_600px1-min.png', '2/25/Flying_dragon_agheel_2_bosses_elden_ring_wiki_600px.png',
                'b/b6/Flying_dragon_agheel_bosses_elden_ring_wiki_600px.png', 'a/ad/Agheel-combo-chart.png']] + candidates + [
  # public YouTube thumbnails of Agheel fight videos (found via web search); thumbnail text overlays are the uploader's
  {'page_url': 'https://www.youtube.com/watch?v=' + v, 'image_url': 'https://i.ytimg.com/vi/%s/maxresdefault.jpg' % v, 'alt': 'YouTube thumbnail: Agheel fight video'}
   for v in ['QBYDKPePoW8', 'HjDirwysPOY', 'ejYJ_k4X7As', '3WWhpsazcVs', 'qXTuQzsEnCU', 'XvcJaNEBwAg', 'G1PNXpGY3Wk', 'xwIQ7imGG1k', 'ePnGKY8RO-U', 'L-bmJ9JvnEg',
             'm1ZQ-t1bVIA', 'tJBgi5VLJQk', 'OVI_FmYHoMg', 'vCzSCzm3JYE', '612lTP7_gpU', '-Ojs8wUqJKY', '6-bTivHhi8Y', 'nuUbo93Jw7A', 'VNxyQr1Qb3U', 'j0Q_94dMb0Y', 'kyeLTooxzk0']]
 unique = {x['image_url']: x for x in candidates}
 (ROOT / 'candidates.json').write_text(json.dumps(list(unique.values()), ensure_ascii=False, indent=2), encoding='utf-8')
 accepted, tiles = [], []
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
  for result in ex.map(download, unique.values()):
   if result is None: continue
   item, data, im = result
   if any(item['sha256'] == x['sha256'] or bin(item['dhash'] ^ x['dhash']).count('1') < 16 for x in accepted): continue
   item['id'] = 'ag-ref-%03d' % (len(accepted) + 1)
   item['file'] = 'images/' + item['id'] + ('.png' if data.startswith(b'\x89PNG') else '.webp' if data[8:12] == b'WEBP' else '.jpg')
   item.update(inspection='not-viewed', use='reference-only', retrieved_at='2026-11-07',
               rights='Copyright remains with FromSoftware / Bandai Namco and original owner; redistribution not granted')
   (ROOT / item['file']).write_bytes(data); accepted.append(item)
   tile = Image.new('RGB', (480, 300), '#141923'); im.thumbnail((472, 264)); tile.paste(im, ((480 - im.width) // 2, 0))
   ImageDraw.Draw(tile).text((8, 272), item['id'] + ' | ' + str(item['width']) + 'x' + str(item['height']), fill='white'); tiles.append(tile)
 for start in range(0, len(tiles), 12):
  group = tiles[start:start + 12]; sheet = Image.new('RGB', (480 * 3, 300 * ((len(group) + 2) // 3)), '#141923')
  for i, t in enumerate(group): sheet.paste(t, ((i % 3) * 480, (i // 3) * 300))
  sheet.save(ROOT / ('contact-%02d.jpg' % (start // 12 + 1)), quality=88)
 (ROOT / 'images.json').write_text(json.dumps(accepted, ensure_ascii=False, indent=2), encoding='utf-8')
 print('UNIQUE_IMAGES', len(accepted), flush=True)

if __name__ == '__main__': main()
