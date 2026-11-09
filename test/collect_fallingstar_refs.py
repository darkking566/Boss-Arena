"""Collect public reference images of Full-Grown Fallingstar Beast, never game runtime assets. Run explicitly.
Keeps original page + image URLs; byte and perceptual dedup; no access-control bypass.
Usage: python -I test/collect_fallingstar_refs.py
"""
import concurrent.futures, hashlib, io, json, pathlib, re, urllib.parse, urllib.request
from html.parser import HTMLParser
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'docs/research/fallingstar'
PAGES = [
 'https://eldenring.wiki.fextralife.com/Full-Grown+Fallingstar+Beast',
 'https://eldenring.wiki.fextralife.com/Fallingstar+Beast',
 'https://eldenring.wiki.fextralife.com/Fallingstar+Beast+Jaw',
 'https://eldenring.wiki.fextralife.com/Gravitational+Missile',
 'https://eldenring.wiki.fextralife.com/Gravity+Stone+Chunk',
 'https://eldenring.wiki.fextralife.com/Astel,+Naturalborn+of+the+Void',
 'https://eldenring.wiki.gg/wiki/Full-Grown_Fallingstar_Beast',
 'https://eldenring.wiki.gg/wiki/Fallingstar_Beast',
 'https://www.gamepressure.com/elden-ring/fallingstar-beast/zffe40',
 'https://www.gamepressure.com/elden-ring/full-grown-fallingstar-beast/z9ff3d',
 'https://game8.co/games/Elden-Ring/archives/376026',
 'https://game8.co/games/Elden-Ring/archives/374438',
 'https://gamewith.net/elden-ring/article/show/31786',
 'https://segmentnext.com/elden-ring-full-grown-fallingstar-beast',
 'https://segmentnext.com/elden-ring-fallingstar-beast',
 'https://segmentnext.com/elden-ring/bosses/fallingstar-beast',
 'https://www.sportskeeda.com/esports/how-defeat-fallingstar-beast-elden-ring',
 'https://www.sportskeeda.com/esports/elden-ring-full-grown-fallingstar-beast-reward',
 'https://gamerant.com/elden-ring-how-to-beat-fallingstar-beast/',
 'https://screenrant.com/elden-ring-story-lore-fallingstar-beast-boss-astel/',
 'https://www.gamesradar.com/it-turns-out-this-elden-ring-boss-eats-little-animals-to-heal/',
 'https://www.pushsquare.com/guides/elden-ring-how-to-beat-fallingstar-beast',
 'https://rankedboost.com/elden-ring/fallingstar-beast/',
 'https://rankedboost.com/elden-ring/full-grown-fallingstar-beast/',
 'https://bo3.gg/games/articles/fallingstar-beast-hinterlands-boss-guide',
 'https://www.gamerguides.com/elden-ring/database/bosses/mt-gelmir-bosses/full-grown-fallingstar-beast',
 'https://www.gamerguides.com/elden-ring/database/bosses/caelid-bosses/fallingstar-beast',
 'https://attackofthefanboy.com/guides/elden-ring-how-to-beat-full-grown-fallingstar-beast-boss/',
 'https://gamepur.com/guides/how-to-defeat-the-full-grown-fallingstar-beast-in-elden-ring',
 'https://www.gamespot.com/articles/elden-ring-how-to-beat-the-full-grown-fallingstar-beast/1100-6503176/',
 'https://staging2.eip.gg/elden-ring/guides/how-to-beat-the-fallingstar-beast',
 'https://www.powerpyx.com/elden-ring-all-boss-locations/',
 'https://kamikouryaku.net/eldenring/?%E9%99%8D%E3%82%8B%E6%98%9F%E3%81%AE%E6%88%90%E7%8D%A3',
 'https://kamikouryaku.net/eldenring/?%E9%99%8D%E3%82%8B%E6%98%9F%E3%81%AE%E7%8D%A3',
 'https://wikiwiki.jp/eldenring/%E9%99%8D%E3%82%8B%E6%98%9F%E3%81%AE%E6%88%90%E7%8D%A3',
 'https://gameranbu.jp/eldenring/fba2271befb68dbf140d',
 'https://www.creativeuncut.com/gallery-43/er-fallingstar-beast-concept.html',
]
KEY = r'fallingstar|falling.?star|star.?beast|ryuusei|流星|降る星|墜星|gelmir|sellia|astel|gravit|%E9%99%8D'
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
  if not item.get('small') and (im.width < 400 or im.height < 200): return None
  if im.width < 200: return None
  item.update(width=im.width, height=im.height, sha256=hashlib.sha256(data).hexdigest())
  g = im.convert('L').resize((17, 16)); px = list(g.get_flattened_data() if hasattr(g, 'get_flattened_data') else g.getdata())
  item['dhash'] = sum(int(px[y*17+x] > px[y*17+x+1]) << (y*16+x) for y in range(16) for x in range(16))
  return item, data, im.convert('RGB')
 except Exception as e: print('IMG_FAIL', item['image_url'][:95], str(e)[:65], flush=True); return None

def main():
 (ROOT / 'images').mkdir(parents=True, exist_ok=True)
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex: candidates = [x for p in ex.map(page, PAGES) for x in p]
 fx = 'https://static0.fextralifeimages.com/file/eldenring/'
 wg = 'https://eldenring.wiki.gg/images/'
 FX = 'https://eldenring.wiki.fextralife.com/'
 candidates = [{'page_url': FX + 'Full-Grown+Fallingstar+Beast', 'image_url': fx + f, 'alt': 'Fallingstar Beast (Fextralife)'} for f in [
   '8/84/Full-grown-fallingstar-beast-1-elden-ring-wiki-guide.png', '9/90/Full-grown-fallingstar-beast-combo-chart-2.png',
   '2/29/Full-grown-fallingstar-beast-bosses-elden-ring-wiki-guide-300px.png', '0/0e/Fallingstar-beast-1-elden-ring-wiki-guide.png',
   '3/39/Fallingstar-beast-altus-elden-ring-wiki-600px.png', '7/7c/Fallingstar-beast-combo-chart.png',
   '5/57/Fallingstar_beast_altus_plateau_enemies_elden_ring_wiki_300px.png', 'd/de/Fallingstar-beast-boss-sote-er-wiki-guide-300px.png',
   'a/a4/Fallingstar_beast_jaw_elden_ring_wiki_guide_200px.png']] + [
  {'page_url': 'https://eldenring.wiki.gg/wiki/File:' + f, 'image_url': wg + f, 'alt': 'Fallingstar Beast (wiki.gg file page)'} for f in [
   'ER_Fallingstar_Beast.png', 'ER_Fallingstar_Beast_Altus_Plateau.png', 'ER_Fallingstar_Beast_Sellia_Crystal_Tunnel.png',
   'ER_Full-Grown_Fallingstar_Beast.png', 'ER_Boss_Fallingstar_Beast_%28SoTE%29.png']] + [
  {'page_url': 'https://screenrant.com/elden-ring-story-lore-fallingstar-beast-boss-astel/', 'image_url': 'https://static0.srcdn.com/wordpress/wp-content/uploads/2022/08/Elden-Ring-Story-Lore-Fallingstar-Beast-Boss-Astel.jpg', 'alt': 'Fallingstar Beast lore cover'},
  {'page_url': 'https://www.gamerguides.com/elden-ring/database/bosses/mt-gelmir-bosses/full-grown-fallingstar-beast', 'image_url': 'https://www.gamerguides.com/assets/media/15/681001/fallingstar.png', 'alt': 'Full-Grown Fallingstar Beast'},
 ] + candidates + [
  # public YouTube thumbnails of Fallingstar Beast fight videos (found via web search); overlays are the uploader's
  {'page_url': 'https://www.youtube.com/watch?v=' + v, 'image_url': 'https://i.ytimg.com/vi/%s/maxresdefault.jpg' % v, 'alt': 'YouTube thumbnail: Fallingstar Beast fight video'}
   for v in ['W35IrLSrTto', 'zrb0pg1wHRQ', 'AA3K_L5kZp0', 'rGetTL9mFQQ', 'p1pNV9LuaF0', 'XTx5ERPkSzw', 'CRIfhT3sfBo', '63QBMAxa9XE', 'UdVzsotlCdg',
             'NyodpcSn89k', 'TWgUuIm40Kg', 'a3x3VcU2iG8', 'DtIe_3KiA4I', 'yWXmbxJkdyQ', '5WKxy50LLPU', 'cybYJex1jsI', 'bWUKtm4JQso', '5EzwxWPztng',
             'nELTjJvNoL4', '1EpmaoAbo60', 'jZb5uggKA0c', 'k_vk_mMBcB0', 'EkODcrLj7ek', 'i3ucjI8jAfg', '7S3UqNHUXeQ',
             'H3OErCfa6JM', 'klR9sk1mrQk', 'FjryjPQgQiE', 'mrsGWvSrjOg', 'VSJ15W6Js9s', 'iAGnXSXkE4I', '96kWzfMv4OA', 'FHqHQa_6A3Y', 'JZ1BLtkfFgs', 'GV9YJCGBuQU',
             'b2Ou5FgPlu4', 'LRhqsKxJ3gU', 'BARZ7Mr7KrI', 'WY9SJ1RJbl4', 'gCM20qwn_M8', 'W9Xfpb88i-c', 'omph3R5V6Lc', '0bg_i26DBTA', '-GMKSONbUU8', '39ylujBJunQ']] + [
  # small Fextralife wiki renders (below the 400px floor), appended last so earlier ids stay stable
  {'page_url': FX + 'Fallingstar+Beast', 'image_url': fx + f, 'alt': 'Fallingstar Beast (Fextralife, small)', 'small': True} for f in [
   '2/29/Full-grown-fallingstar-beast-bosses-elden-ring-wiki-guide-300px.png', '5/57/Fallingstar_beast_altus_plateau_enemies_elden_ring_wiki_300px.png',
   'd/de/Fallingstar-beast-boss-sote-er-wiki-guide-300px.png', '8/84/Full-grown-fallingstar-beast-1-elden-ring-wiki-guide.png', '0/0e/Fallingstar-beast-1-elden-ring-wiki-guide.png']]
 unique = {}
 for x in candidates: unique.setdefault(x['image_url'], x)  # first listing wins, keeps ids stable
 (ROOT / 'candidates.json').write_text(json.dumps(list(unique.values()), ensure_ascii=False, indent=2), encoding='utf-8')
 accepted, tiles = [], []
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
  for result in ex.map(download, unique.values()):
   if result is None: continue
   item, data, im = result
   if any(item['sha256'] == x['sha256'] or bin(item['dhash'] ^ x['dhash']).count('1') < 16 for x in accepted): continue
   item['id'] = 'fs-ref-%03d' % (len(accepted) + 1)
   item['file'] = 'images/' + item['id'] + ('.png' if data.startswith(b'\x89PNG') else '.webp' if data[8:12] == b'WEBP' else '.jpg')
   item.update(inspection='not-viewed', use='reference-only', retrieved_at='2026-11-09',
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
