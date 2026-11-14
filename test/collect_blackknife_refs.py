"""Collect public reference images of Black Knife Assassin / Alecto / Tiche, never game runtime assets. Run explicitly.
Keeps original page + image URLs; byte and perceptual dedup; no access-control bypass.
Usage: python test/collect_blackknife_refs.py
"""
import concurrent.futures, hashlib, io, json, pathlib, re, urllib.parse, urllib.request
from html.parser import HTMLParser
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'docs/research/blackknife'

PAGES = [
    'https://eldenring.wiki.fextralife.com/Black+Knife+Assassin',
    'https://eldenring.wiki.fextralife.com/Alecto,+Black+Knife+Ringleader',
    'https://eldenring.wiki.fextralife.com/Black+Knife+Tiche+Ashes',
    'https://eldenring.wiki.fextralife.com/Black+Knife',
    'https://eldenring.wiki.fextralife.com/Black+Knife+Set',
    'https://eldenring.wiki.fextralife.com/Sage\'s+Cave',
    'https://eldenring.wiki.fextralife.com/Black+Knife+Catacombs',
    'https://eldenring.wiki.fextralife.com/Deathtouched+Catacombs',
    'https://eldenring.wiki.fextralife.com/Ringleader\'s+Evergaol',
    'https://www.creativeuncut.com/gallery-43/er-lesser-black-knife-assassin.html',
    'https://kamikouryaku.net/eldenring/?%E9%BB%92%E3%81%8D%E5%88%83%E3%81%AE%E5%88%BA%E5%AE%A2',
    'https://kamikouryaku.net/eldenring/?%E9%BB%92%E3%81%8D%E5%88%83%E3%81%AE%E9%A6%96%E9%A0%98%E3%82%A2%E3%83%AC%E3%82%AF%E3%83%88%E3%83%BC',
]

KEY = r'black.?knife|alecto|tiche|assassin|黒き刃|アレクトー|ティシー|刺客|首領|catacomb|sage.?cave|evergaol|veil'
SKIP = r'avatar|logo|icon|banner|social|sprite|favicon|100x|150x|45x45|-thumb|placeholder|ad[sx]?/|twemoji|gravatar'

def fetch(u, referer=None):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    if referer:
        headers['Referer'] = referer
    req = urllib.request.Request(u, headers=headers)
    with urllib.request.urlopen(req, timeout=25) as f:
        return f.read()

class Images(HTMLParser):
    def __init__(self):
        super().__init__()
        self.items = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'meta' and a.get('property') in ('og:image', 'twitter:image'):
            self.items.append((a.get('content', ''), 'page cover'))
            return
        if tag not in ('img', 'source', 'a'):
            return
        alt = a.get('alt') or a.get('title') or ''
        for key in ['data-src', 'data-lazy-src', 'data-original', 'src', 'srcset', 'href']:
            u = (a.get(key) or '').split(' ')[0]
            if re.search(r'\.(jpe?g|png|webp)(\?|$)', u, re.I):
                self.items.append((u, alt))
                break

def page(u):
    try:
        s = fetch(u).decode('utf-8', errors='replace')
        p = Images()
        p.feed(s)
        out = []
        for img, alt in p.items:
            img = urllib.parse.urljoin(u, img)
            if (re.search(KEY, img + ' ' + alt, re.I) or alt == 'page cover') and not re.search(SKIP, img, re.I):
                out.append({'page_url': u, 'image_url': img, 'alt': alt})
        print('PAGE', u[:55], len(out), flush=True)
        return out
    except Exception as e:
        print('PAGE_FAIL', u[:55], str(e)[:50], flush=True)
        return []

def download(item):
    try:
        ref = item.get('page_url')
        data = fetch(item['image_url'], referer=ref)
        im = Image.open(io.BytesIO(data))
        im.load()
        if not item.get('small') and (im.width < 250 or im.height < 180):
            return None
        item.update(width=im.width, height=im.height, sha256=hashlib.sha256(data).hexdigest())
        g = im.convert('L').resize((17, 16))
        px = list(g.get_flattened_data() if hasattr(g, 'get_flattened_data') else g.getdata())
        item['dhash'] = sum(int(px[y*17+x] > px[y*17+x+1]) << (y*16+x) for y in range(16) for x in range(16))
        return item, data, im.convert('RGB')
    except Exception as e:
        print('IMG_FAIL', item['image_url'][:75], str(e)[:50], flush=True)
        return None

def main():
    (ROOT / 'images').mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        candidates = [x for p in ex.map(page, PAGES) for x in p]

    # Priority 1: Official Concept Art from Creative Uncut
    cu_candidates = [
        {
            'page_url': 'https://www.creativeuncut.com/gallery-43/er-lesser-black-knife-assassin.html',
            'image_url': 'https://www.creativeuncut.com/gallery-43/art/er-lesser-black-knife-assassin.jpg',
            'alt': 'Lesser Black Knife Assassin official concept art (Creative Uncut)',
            'small': True
        }
    ]

    # Priority 2: High-resolution direct character / gear renders from Fextralife static CDN
    fx_base = 'https://static0.fextralifeimages.com/file/eldenring/'
    fx_files = [
        ('b/be/Assassin1.png', 'Black Knife Assassin full body model render', True),
        ('0/08/Black-knife-assassin-limgrave-2-min.png', 'Black Knife Assassin in Limgrave Deathtouched Catacombs', False),
        ('0/07/Black-knife-assassin-standard-combo-chart.png', 'Black Knife Assassin standard combo chart diagram', False),
        ('f/ff/Black-knife-assassin-deathtouched-catacomb-combo-chart.png', 'Black Knife Assassin Deathtouched combo chart diagram', False),
        ('1/12/Black-knife-assassin-sages-cave-combo-chart.png', 'Black Knife Assassin Sage\'s Cave combo chart diagram', False),
        ('6/64/Alecto-combo-chart.png', 'Alecto, Black Knife Ringleader combo chart diagram', False),
        ('d/d2/Lesser-black-knife-assassin-1-elden-ring-wiki-guide.png', 'Lesser Black Knife Assassin in-game pose', False),
        ('4/47/Black-knife-assassin-2-elden-ring-wiki-guide.png', 'Black Knife Assassin crouching ready stance', False),
        ('5/53/Black-knife-assassin-3-elden-ring-wiki-guide.png', 'Black Knife Assassin side combat movement', False),
        ('f/f0/Black-knife-assassin-4-elden-ring-wiki-guide.png', 'Black Knife Assassin evasive leap stance', False),
        ('0/01/Alecto-black-knife-ringleader-1-elden-ring-wiki-guide.png', 'Alecto Black Knife Ringleader battle screenshot', False),
        ('b/b7/Alecto_black_knife_ringleader_bosses_elden_ring_wiki_guide_300px.png', 'Alecto Ringleader boss render', True),
        ('7/74/Black_knife_tiche_elden_ring_wiki_guide_200px.png', 'Black Knife Tiche spirit ashes render', True),
        ('f/f8/Black_knife_dagger_weapon_elden_ring_wiki_guide_200px.png', 'Black Knife weapon render with Rune of Death blade', True),
        ('6/6a/Black_knife_armor_set-elden-ring-wiki-guide.png', 'Black Knife Armor set full preview render', True),
        ('c/c2/Black_knife_armor_altered_armor_pieces_comparison_elden_ring_sote_wiki_quide_300px.png', 'Black Knife Armor altered male comparison', True),
        ('8/84/Black_knife_armor_female_altered_armor_pieces_comparison_elden_ring_sote_wiki_quide_300px.png', 'Black Knife Armor altered female comparison', True),
        ('thumb/2/27/Illusory-wall-1-sage-cave.png/600px-Illusory-wall-1-sage-cave.png', 'Sage\'s Cave hidden path to invisible assassin', False),
        ('thumb/3/31/Illusory-wall-2-sage-cave.png/600px-Illusory-wall-2-sage-cave.png', 'Sage\'s Cave illusory waterfall', False),
        ('thumb/8/88/Illusory-wall-3-sage-cave.png/600px-Illusory-wall-3-sage-cave.png', 'Sage\'s Cave secret chamber', False),
    ]
    fextralife_candidates = [
        {
            'page_url': 'https://eldenring.wiki.fextralife.com/Black+Knife+Assassin',
            'image_url': fx_base + f,
            'alt': alt,
            'small': sm
        }
        for f, alt, sm in fx_files
    ]

    # Priority 3: High resolution in-game action & boss fight captures from verified YouTube fight guides
    yt_vids = [
        ('JrMUYFMU_0E', 'Alecto, Black Knife Ringleader Boss Fight (No Damage) - Moonlight Altar Evergaol'),
        ('4Yn9zDKeby0', 'How To Defeat Alecto, Black Knife Ringleader - Elden Ring Boss Gameplay Guide'),
        ('oEUqcXr_TfU', 'Elden Ring - Alecto, Black Knife Ringleader (Boss Fight & Location Guide)'),
        ('Bv501owq6LY', 'How to Cheese Alecto, Black Knife Ringleader in Elden Ring'),
        ('x4Vju-R-Qtc', 'Elden Ring - Black Knife Assassin Boss Fight (No Damage) - Deathtouched Catacombs'),
        ('A7QKm_6J1ok', 'Elden Ring - Black Knife Assassin Boss Fight & Location - Black Knife Catacombs'),
        ('jNOgdbyRVdc', 'Elden Ring - Black Knife Assassin Boss Fight by Boss Fight Database'),
        ('V7_nbmrZdAU', 'Black Knife Assassin fight capture: low stance and dagger slashes'),
        ('jBetp89ClnI', 'Black Knife Assassin fight capture: leap attack and acrobatic flip'),
        ('D0fwFBUX9YQ', 'Black Knife Assassin combat guide: Blade of Death red flame trajectory'),
        ('G--wldbJD00', 'Black Knife Assassin fight moveset showcase'),
        ('1s2Q0tyx5gM', 'Black Knife Assassin grab attack execution frame capture'),
        ('e2yKJHcA5V0', 'Black Knife Assassin stealth invisibility and ambush animation'),
        ('dsA_q-kaRlw', 'Black Knife Assassin Catacombs boss duel'),
        ('lMXPbzocRmY', 'Black Knife Assassin fight tactics and spacing'),
        ('VIHsZUZzegg', 'Black Knife Assassin combat pacing and recovery windows'),
        ('5a8hGveVACg', 'Alecto Black Knife Ringleader heavy red-black flame AoE explosion'),
        ('CY6QCSN3V1o', 'Black Knife Assassin high acrobatic leap and plunge attack'),
        ('40DU0Fi1O1o', 'Black Knife Assassin close range combo sequence'),
        ('lUARop58z6Y', 'Black Knife Assassin evading with backward somersault'),
        ('5GqCcfSdSek', 'Black Knife Assassin knife spin and sidestep'),
        ('RAkqDMnb-Y0', 'Alecto Ringleader Evergaol arena combat and speed demonstration'),
        ('sItot9no9cc', 'Alecto Ringleader Blade of Death wave projectile and health drain'),
        ('CnVDH5WHkM0', 'Alecto Ringleader aggressive combo string and evasive recovery'),
        ('Zrkayey-e9o', 'Alecto Ringleader diving helm splitter with crimson-black death aura'),
        ('AoQV05ofw4U', 'Alecto Ringleader close-up attack tracking and telegraph animation'),
        ('dG3bXyC9hP0', 'Alecto Ringleader jump dodge and lethal counter-thrust'),
        ('kPrEcuMy664', 'Alecto Ringleader aerial strike into death storm ground burst'),
        ('vbvdTNvq30s', 'Alecto Ringleader full fight moveset and punish windows'),
        ('cHkxGpldqKw', 'Alecto Ringleader high poise-break duel and critical reposte timing'),
        ('faMrREx7M2U', 'Alecto Ringleader aggressive dash-slice and spinning recovery'),
        ('UaNhxIqvRcg', 'Alecto Ringleader red-black flame burst and ground cratering effect'),
        ('BjxBvrvOgP4', 'Black Knife Tiche spirit summon showcasing Rune of Death in battle'),
        ('xMeMJB5z5mM', 'Black Knife Tiche agile acrobatic evasion vs late-game bosses'),
        ('Mtt1hyIFmd0', 'Black Knife Tiche Blade of Death maximum HP debuff applied to boss'),
        ('UkARVwgW-gU', 'Black Knife Assassin in Ordina Liturgical Town invisible hunt mode'),
        ('Oj6gvRDBAFU', 'Black Knife Assassin Sentry Torch detection in Ordina Liturgical Town'),
        ('BcXYNnugn1U', 'Black Knife Assassin Sainted Hero Grave entrance duel'),
        ('iFc2bcN9D8o', 'Black Knife Assassin Queen Bedchamber Leyndell royal capital ambush'),
        ('XWMJVQOa6I0', 'Black Knife Assassin stealth backstab grab animation detailed view'),
    ]

    yt_candidates = [
        {
            'page_url': f'https://www.youtube.com/watch?v={vid}',
            'image_url': f'https://i.ytimg.com/vi/{vid}/maxresdefault.jpg',
            'alt': alt,
            'small': False
        }
        for vid, alt in yt_vids
    ]

    all_candidates = cu_candidates + fextralife_candidates + yt_candidates + candidates

    unique = {}
    for x in all_candidates:
        unique.setdefault(x['image_url'], x)

    (ROOT / 'candidates.json').write_text(json.dumps(list(unique.values()), ensure_ascii=False, indent=2), encoding='utf-8')
    print('TOTAL_UNIQUE_CANDIDATES', len(unique), flush=True)

    accepted, tiles = [], []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        for result in ex.map(download, unique.values()):
            if result is None:
                continue
            item, data, im = result
            # Dedup by exact SHA256 or perceptual hash distance < 14
            if any(item['sha256'] == x['sha256'] or bin(item['dhash'] ^ x['dhash']).count('1') < 14 for x in accepted):
                continue
            item['id'] = 'bk-ref-%03d' % (len(accepted) + 1)
            ext = '.png' if data.startswith(b'\x89PNG') else '.webp' if data[8:12] == b'WEBP' else '.jpg'
            item['file'] = 'images/' + item['id'] + ext
            item.update(
                inspection='not-viewed',
                use='reference-only',
                retrieved_at='2026-11-13',
                rights='Copyright remains with FromSoftware / Bandai Namco and original owner; redistribution not granted'
            )
            (ROOT / item['file']).write_bytes(data)
            accepted.append(item)
            tile = Image.new('RGB', (480, 300), '#141923')
            im.thumbnail((472, 264))
            tile.paste(im, ((480 - im.width) // 2, 0))
            is_concept = 'concept' in item.get('alt', '').lower()
            tag = ' | CONCEPT CANDIDATE' if is_concept else ''
            ImageDraw.Draw(tile).text((8, 272), item['id'] + tag + ' | ' + str(item['width']) + 'x' + str(item['height']), fill='white')
            tiles.append(tile)

    # Generate contact sheets (12 tiles per sheet)
    for start in range(0, len(tiles), 12):
        group = tiles[start:start + 12]
        sheet = Image.new('RGB', (480 * 3, 300 * ((len(group) + 2) // 3)), '#141923')
        for i, t in enumerate(group):
            sheet.paste(t, ((i % 3) * 480, (i // 3) * 300))
        sheet.save(ROOT / ('contact-%02d.jpg' % (start // 12 + 1)), quality=88)

    (ROOT / 'images.json').write_text(json.dumps(accepted, ensure_ascii=False, indent=2), encoding='utf-8')
    print('ACCEPTED_IMAGES', len(accepted), flush=True)

if __name__ == '__main__':
    main()
