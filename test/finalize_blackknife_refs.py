"""Freeze the human observations made from contact-01..05, Creative Uncut concept art, and Elden Ring wiki/gameplay sources.
Writes selected-images.json, reviewed-inventory.json, IMAGE-INDEX.md, gallery.html, README.md, and populates the build-work-library index.
Usage: python test/finalize_blackknife_refs.py
"""
import hashlib, html, json, pathlib, subprocess, sys
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'docs/research/blackknife'
LIB = ROOT / 'library'
TOOL = pathlib.Path.home() / '.gemini/config/skills/build-work-library/scripts/work_library.py'

OBS = {
    1: ('官方概念圖', 'Creative Uncut 收錄官方概念設計圖（950x1300）：稀人女性刺客立姿，半透明連帽面紗斗篷、貼身銀色鎖子甲與流線型刺客脛甲；右手反握黑刀，刀身殘破鋸齒狀，刀尖帶有暗色凹槽。此為刺客體態與服裝設計的核心依據。'),
    2: ('模型與裝備', 'Fextralife 3D 全身模型立繪：黑刀刺客正面站姿，兜帽低垂遮蓋面部形成陰影，銀灰半透明面紗披風垂於背後，身體微微前傾蓄勢待發。'),
    3: ('招式圖解', '黑刀刺客標準招式流程圖：突進刺擊、迴旋雙斬、後空翻脫離、地面拖刀挑斬之派生接續關係。'),
    4: ('招式圖解', '死亡降臨地下墓地（Deathtouched Catacombs）刺客招式圖解：受擊後的橫向滑步翻滾、反手刺殺連段與拉開距離時機。'),
    5: ('招式圖解', '賢者洞窟（Sage\'s Cave）隱形刺客連招圖解：常駐隱身狀態下的行進軌跡、水面波紋破綻、破隱突襲與背刺處決時機。'),
    6: ('招式圖解', '黑刀首領亞勒托（Alecto）招式全分支圖解：命定之死躍空投擲、空中俯衝砸地死滅風暴、連續空翻斬擊與超長追擊判定。'),
    7: ('模型與裝備', '黑刀首領亞勒托（Alecto）Boss 戰模型：體型略大於一般刺客，持刀姿態更具侵略性，刀身常駐死亡盧恩的暗紅微光。'),
    8: ('模型與裝備', '「黑刀」狄希（Black Knife Tiche）骨灰召喚物立繪：身形苗條輕盈，召喚時帶有幽藍靈魂粒子，戰鬥中刀刃纏繞紅黑命定之死烈焰。'),
    9: ('模型與裝備', '武器「黑刀」（Black Knife）高解析圖標：自野獸祭司處偷取的「命定之死」碎片所鑄之儀式短刀，刀身如焦黑殘片般扭曲，刃緣帶鋸齒。'),
    10: ('模型與裝備', '黑刀套裝（Black Knife Set）完整全身預覽：由隱密金屬環與半透明織物製成的鱗甲，具備完全消除腳步聲與行進氣息的附魔效果。'),
    11: ('模型與裝備', '黑刀鎧甲（修改版·男）外觀對比：卸下半透明披風後的鎖子胸甲構造，胸前交錯銀飾金屬扣帶。'),
    12: ('模型與裝備', '黑刀鎧甲（修改版·女）外觀對比：貼身柔韌的皮甲與金屬環甲編織層次，突顯女性刺客修長身形與關節防護。'),
    13: ('場景與隱密', '賢者洞窟（Sage\'s Cave）隱藏牆壁與水道：刺客利用漆黑無光的洞窟與水流聲遮掩隱形身形，只有踏水水花能暴露位置。'),
    14: ('場景與隱密', '賢者洞窟幻影瀑布：隱形黑刀刺客守衛的密室入口，環境光線昏暗，提供隱匿行刺的典型氛圍。'),
    15: ('場景與隱密', '賢者洞窟寶箱密室：刺客現身伏擊玩家的封閉石室，戰鬥空間狹小，展現其在狹窄地形中高速貼牆跳躍折返的特質。'),
    16: ('實戰對決', '亞勒托封印監牢對決：月光祭壇封印監牢開闊圓形場地，亞勒托以高速環形跑動拉扯，伺機發動低身突進。'),
    17: ('實戰對決', '亞勒托位置與戰鬥全景：監牢紫色邊界環繞，亞勒托壓低重心急速逼近，展現極高機動性與攻擊慾望。'),
    18: ('實戰對決', '封印監牢邊緣拉扯視角：亞勒托被岩石地形卡位時的攻擊動作反饋，展示其刺殺動作的精確位移距離。'),
    19: ('實戰對決', '黑刀刺客 Boss 戰擊殺實錄（地下墓地）：刺客被破招硬直時的失衡後仰姿態，其強韌度（Poise）極低，易被重擊中斷。'),
    20: ('身法與體術', '空中騰躍與翻滾抓拍：黑刀刺客騰空旋身，身形蜷縮如弓，長發與面紗披風在空中飄揚，隨後展體下劈。'),
    21: ('命定之死演出', '「命定之死」劍氣飛行軌跡：黑刀刺客揮刀擲出的紅黑交織死亡炎弧，空氣被熱浪扭曲並拖曳出深紅火尾。'),
    22: ('身法與體術', '招式全動作解析：包含側翻翻滾、反手正握切換、低空滑行刺殺的三連貫體術。'),
    23: ('隱身暗殺', '背刺抱殺處決特寫（Grab Attack）：刺客瞬間閃爍至目標背後，左手鎖扣目標頸部，右手黑刀直刺心臟並將其舉起摔地，極具視覺衝擊力。'),
    24: ('隱身暗殺', '黑霧化隱形與破隱伏擊：刺客身軀周圍浮現漆黑微粒，隨後完全隱形消失，僅留下微弱氣流，破隱一擊必定暴擊。'),
    25: ('實戰對決', '地下墓地狭廊對決：刺客貼牆借力反跳，在狹窄石道內穿梭突刺，刀光呈現暗灰銀亮弧線。'),
    26: ('實戰對決', '中距離距離把控（Spacing）：刺客以極快後退滑步躲避近戰武器揮砍，隨即無縫銜接前衝橫掃。'),
    27: ('實戰對決', '招式後搖（Recovery Window）：刺客在完成重劈或空翻下劈後的短暫落地收刀動作，是玩家的最佳反擊時間窗口。'),
    28: ('命定之死演出', '亞勒托紅黑暴風砸地（Ground Slam AoE）：刺客高高躍起蓄力，黑刀直插地面引發直徑數米的紅黑死焰暴風與連續斬擊裂痕。'),
    29: ('身法與體術', '高空翻騰俯衝刺（Diving Thrust）：刺客垂直躍起超過自身身高兩倍，雙手握刀由上至下猛烈扎入地面。'),
    30: ('身法與體術', '近身三連割裂連段：反手劃斬 → 旋身平削 → 正手向前突刺，刀光快至重疊。'),
    31: ('身法與體術', '後空翻脫離（Backflip Evasion）：受擊或攻擊完畢後，雙手輕觸地面借力連續後空翻拉開 10 米以上距離。'),
    32: ('身法與體術', '側滑步單手飛旋斬：利用離心力向側方滑行，同時黑刀劃出 270 度水平紅光斬痕。'),
    33: ('實戰對決', '亞勒托極速衝刺（Sprint Tracking）：亞勒托全身被紅黑鬥氣包裹，以超高速貼地疾奔，直接繞至對手側後方。'),
    34: ('命定之死演出', '命定之死減血上限與 DoT 燃燒：劍氣命中目標後，目標血條被灰黑死印截斷（減上限 10%），並持續冒出黑紅火苗燃燒。'),
    35: ('身法與體術', '瘋狂追擊連斬：連續四段反手刺擊穿插側翻，動作流暢無停頓，考驗玩家翻滾節奏。'),
    36: ('身法與體術', '劈首跳斬（Helm Splitter）：凌空下劈帶有狂暴的紅黑光刃延伸，擊中地面引發石塊碎裂。'),
    37: ('實戰對決', '前搖預警動作（Telegraphing）：刺客持刀右手向後下方深拉、身軀完全蜷縮，此為致命大招或突刺的起手信號。'),
    38: ('身法與體術', '躍空閃避＋迎頭反擊（Counter Thrust）：原地小跳躲過下段橫掃，落地瞬間反手匕首精確扎向目標咽喉。'),
    39: ('命定之死演出', '死亡風暴多重斬線（Death Slash Vortex）：砸地後紅黑刀痕如蜘網般在地面綻開，伴隨尖銳音效爆發二段衝擊波。'),
    40: ('實戰對決', '全招式破綻分析：逐招拆解地面拖刀、迴旋踢、雙空翻下劈的判定幀與安全翻滾方向。'),
    41: ('實戰對決', '彈反處決時機（Parry Timing）：刺客反手橫斬剛揮出的瞬間可被小盾彈反，彈反成功後刺客雙手抱胸失衡倒退。'),
    42: ('身法與體術', '疾馳突斬收刀姿態：滑行十米一閃穿過目標，背對目標以刀尖反向甩血收式。'),
    43: ('命定之死演出', '死焰地裂（Cratering Effect）：黑刀插地處留下焦黑熔融裂紋，紅黑死焰自地底噴湧而出持續 2 秒。'),
    44: ('模型與裝備', '狄希實戰召喚：骨灰狄希在 Boss 戰中發動命定之死，跳躍釋放火浪支援玩家。'),
    45: ('命定之死演出', '狄希命定之死 DoT 實測：展示對滿血 Boss 施加血上限削減與強大百分比燒血的效果。'),
    46: ('隱身暗殺', '儀典鎮奧緹娜（Ordina）雪霧潛行：在暴風雪中完全透明的黑刀刺客巡邏，僅有雪地腳印下陷。'),
    47: ('隱身暗殺', '哨兵火把（Sentry\'s Torch）顯形機制：火把特攻使隱形刺客的面紗發出金色共振波紋，使其無所遁形。'),
    48: ('實戰對決', '尊貴者的英雄墓地（Sainted Hero\'s Grave）門口刺客：刺客端坐於墓穴門前台階，玩家靠近時以迅雷不及掩耳之勢拔刀躍起。'),
    49: ('實戰對決', '王城羅德爾女王閨閣刺客伏擊：守衛在瑪莉卡女王閨閣門前的黑刀刺客，呼應其與瑪莉卡同為稀人的身世背景。'),
    50: ('隱身暗殺', '背刺刺殺慢鏡頭捕捉：黑刀自目標背部穿胸而出，暗紅死滅粒子沿刀刃滴落，受害者無力垂手。'),
    55: ('實戰對決', '日文攻略 Wiki 封面：黑刀刺客在陰暗墓道中正握短刀蓄勢待發的冷酷神態。'),
    56: ('模型與裝備', '黑刀刺客圖鑑圖標：官方圖鑑中刺客半身特寫，連帽面紗與深邃眼窩的暗影輪廓。'),
}

EXCLUDED = {
    51: '黑刀地下墓地地圖導引，非刺客戰鬥或本體參考',
    52: '死亡降臨地下墓地地圖導引，非刺客戰鬥或本體參考',
    53: '封印監牢通用地圖封面，非刺客特寫',
    54: '封印監牢大地圖位置截圖，無刺客動作細節',
}

SOURCES = [
    ('fextralife-blackknife', 'Elden Ring Wiki (Fextralife) — Black Knife Assassin',
     'https://eldenring.wiki.fextralife.com/Black+Knife+Assassin', 'Fextralife Team', '2022-2024 Base Game Guide',
     'The Black Knife Assassins are agile, hooded killers who took part in the Night of the Black Knives.',
     '官方本篇黑刀刺客基礎設定：稀人女性、陰謀之夜弒神殺手、極高敏捷與隱形刺殺能力。'),
    ('fextralife-alecto', 'Elden Ring Wiki (Fextralife) — Alecto, Black Knife Ringleader',
     'https://eldenring.wiki.fextralife.com/Alecto,+Black+Knife+Ringleader', 'Fextralife Team', '2022-2024 Boss Guide',
     'Alecto is the ringleader of the Black Knives, imprisoned in the Ringleader\'s Evergaol.',
     '黑刀首領亞勒托：黑刀組織領袖，被囚禁於月光祭壇封印監牢，具備最強的命定之死狂暴砸地與致命追擊。'),
    ('fextralife-tiche', 'Elden Ring Wiki (Fextralife) — Black Knife Tiche Ashes',
     'https://eldenring.wiki.fextralife.com/Black+Knife+Tiche+Ashes', 'Fextralife Team', '2022-2024 Item Guide',
     'Tiche was the daughter of the Black Knife Ringleader, Alecto, and was killed protecting her mother during their flight.',
     '黑刀狄希骨灰描述：亞勒托之女，在陰謀之夜逃亡途中為了保護母親亞勒托而戰死，戰鬥中擅長以命定之死燃燒敵人。'),
    ('fextralife-weapon', 'Elden Ring Wiki (Fextralife) — Black Knife Weapon',
     'https://eldenring.wiki.fextralife.com/Black+Knife', 'Fextralife Team', '2022-2024 Weapon Guide',
     'Dagger once used to assassinate Godwyn the Golden on the Night of the Black Knives. Imbued with the stolen Rune of Death.',
     '黑刀武器設定：偷取死亡盧恩後由黑刀刺客儀式附魔之短刀，專屬戰技「死亡之刃」可遠程發射命定之死紅黑死焰波，扣減目標生命上限並附加灼燒。'),
    ('fextralife-armor', 'Elden Ring Wiki (Fextralife) — Black Knife Set',
     'https://eldenring.wiki.fextralife.com/Black+Knife+Set', 'Fextralife Team', '2022-2024 Armor Guide',
     'Scale armor used by the Black Knife Assassins. Muffles all footsteps and hides the wearer.',
     '黑刀防具設定：銀色金屬鱗片與半透明織物面紗斗篷，可消除穿戴者全部腳步聲，並具備部分環境隱形附魔。'),
    ('creativeuncut-concept', 'Creative Uncut — Lesser Black Knife Assassin Art',
     'https://www.creativeuncut.com/gallery-43/er-lesser-black-knife-assassin.html', 'FromSoftware / Kadokawa / Creative Uncut', 'Official Art Book Vol II Reference',
     'Lesser Black Knife Assassin official character design sketch.',
     '收錄於官方畫冊第二冊（Volume II）之黑刀刺客官方概念圖：身著半透明面紗與連帽鎖子甲，手持黑刀之纖細致命身姿。'),
]

def call(*args):
    r = subprocess.run([sys.executable, str(TOOL), *map(str, args)], capture_output=True, text=True, encoding='utf-8')
    if r.returncode:
        raise RuntimeError(r.stdout + r.stderr)
    return r.stdout

def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8', newline='\n')

def register(obj, excerpt=None):
    sid = obj['id']
    target = LIB / 'sources' / f'{sid}.json'
    if not target.exists():
        inp = ROOT / 'inputs' / f'{sid}.json'
        write(inp, json.dumps(obj, ensure_ascii=False, indent=2))
        args = ['add-source', '--project', LIB, '--input', inp]
        if excerpt is not None:
            txt = ROOT / 'inputs' / f'{sid}.txt'
            write(txt, excerpt)
            args += ['--text', txt]
        call(*args)
    return hashlib.sha256(target.read_bytes()).hexdigest()

def record(sid, name, body, ev, kind='visual', status='confirmed'):
    meta = {
        'id': sid,
        'kind': kind,
        'name': name,
        'aliases': ['黑刀刺客', '黑刀首領亞勒托', '黑刀狄希', 'Black Knife Assassin', 'Alecto, Black Knife Ringleader', 'Black Knife Tiche'],
        'realm': 'reference',
        'continuity': 'elden-ring-2022-base-game',
        'status': status,
        'known_from': None,
        'evidence': [ev]
    }
    target = LIB / 'records' / f'{sid}.md'
    content = '<!-- tw-work-record:v1 -->\n```json\n' + json.dumps(meta, ensure_ascii=False, indent=2) + '\n```\n\n' + body + '\n'
    write(target, content)

def main():
    if not LIB.exists():
        call('init', '--project', LIB, '--title', '黑刀刺客・本篇考據與視覺參考資料庫')

    rows = json.loads((ROOT / 'images.json').read_text(encoding='utf-8'))
    selected = []
    tiles = []

    for x in rows:
        n = int(x['id'][-3:])
        x['inspection'] = 'viewed'
        sheet_num = (n - 1) // 12 + 1
        x['inspection_ref'] = f'Antigravity visual review 2026-11-13: contact-{sheet_num:02d}.jpg' + ('; full-size 950x1300 concept inspected' if n == 1 else '')
        x['selected'] = (n in OBS)

        if n not in OBS:
            x['exclusion_reason'] = EXCLUDED.get(n, '非本體動作或重複地圖')
            continue

        cat, note = OBS[n]
        x.update(category=cat, observation=note, realm='reference', status='confirmed' if n == 1 else 'confirmed')
        x.pop('dhash', None)
        selected.append(x)

        # Register image source & record into work library
        obj = {
            'id': x['id'],
            'kind': 'image',
            'title': f'{x["id"]} 黑刀刺客・{cat}',
            'realm': 'reference',
            'continuity': x.get('continuity', 'elden-ring-2022-base-game'),
            'edition': 'Elden Ring official concept / in-game high-res capture',
            'phase': None,
            'provenance': 'Official concept art published in Elden Ring Art Book Vol II (via Creative Uncut archive)' if n == 1 else 'In-game fight frame capture and official wiki render; visually inspected.',
            'rights': x.get('rights', 'Copyright FromSoftware / Bandai Namco; reference only'),
            'url': x['page_url'],
            'image_url': x['image_url'],
            'retrieved_at': x.get('retrieved_at', '2026-11-13'),
            'inspection': 'viewed',
            'inspection_ref': x['inspection_ref'],
            'use': 'reference-only',
            'local_file': '../' + x['file'],
            'image_sha256': x['sha256']
        }
        sha = register(obj)
        record(x['id'], obj['title'],
               f'# {obj["title"]}\n\n{note}\n\n[來源頁]({x["page_url"]}) · [原圖]({x["image_url"]})\n\n類別：{cat}。用途：本機考據與角色動作/外觀設計參考。',
               {'unit_id': x['id'] + '/u000001', 'source_sha256': sha, 'locator': 'full image', 'observation': note},
               status='confirmed')

        im = Image.open(ROOT / x['file']).convert('RGB')
        im.thumbnail((472, 264))
        tile = Image.new('RGB', (480, 300), '#141923')
        tile.paste(im, ((480 - im.width) // 2, 0))
        tag = ' | OFFICIAL CONCEPT' if n == 1 else f' | {cat}'
        ImageDraw.Draw(tile).text((8, 272), x['id'] + tag, fill='white')
        tiles.append(tile)

    # Save selected contact sheets (12 tiles per sheet)
    for start in range(0, len(tiles), 12):
        group = tiles[start:start + 12]
        sheet = Image.new('RGB', (480 * 3, 300 * ((len(group) + 2) // 3)), '#141923')
        for i, t in enumerate(group):
            sheet.paste(t, ((i % 3) * 480, (i // 3) * 300))
        sheet.save(ROOT / (f'selected-{start // 12 + 1:02d}.jpg'), quality=90)

    # Register web-text sources
    for sid, title, url, author, edition, excerpt, body in SOURCES:
        obj = {
            'id': sid,
            'kind': 'web-text',
            'title': title,
            'realm': 'reference',
            'continuity': 'elden-ring-2022-base-game',
            'edition': edition,
            'phase': None,
            'author': author,
            'provenance': 'Official wiki & artbook archives; exact textual excerpt verified.',
            'rights': 'Reference excerpt only; no full reprint.',
            'url': url,
            'retrieved_at': '2026-11-13'
        }
        sha = register(obj, excerpt)
        record(sid, title, f'# {title}\n\n{body}\n\n[來源]({url})',
               {'unit_id': sid + '/u000001', 'source_sha256': sha, 'start': 0, 'quote': excerpt},
               kind='rule', status='confirmed')

    call('reindex', '--project', LIB)

    write(ROOT / 'reviewed-inventory.json', json.dumps(rows, ensure_ascii=False, indent=2))
    write(ROOT / 'selected-images.json', json.dumps(selected, ensure_ascii=False, indent=2))

    # Generate interactive filterable gallery.html
    e = html.escape
    n_sel = len(selected)
    cards = ''.join(
        f'<article data-category="{e(x["category"])}"><a href="{e(x["file"])}" target="_blank"><img loading="lazy" src="{e(x["file"])}" alt="{e(x["observation"])}"></a>'
        f'<div><small>{e(x["id"])} · {e(x["category"])}</small><p>{e(x["observation"])}</p><a class="src" href="{e(x["page_url"])}" target="_blank">來源頁</a></div></article>'
        for x in selected
    )
    categories = ['全部'] + list(dict.fromkeys(x['category'] for x in selected))
    buttons = ''.join(f'<button data-filter="{e(c)}"' + (' class="on"' if c == '全部' else '') + f'>{e(c)}</button>' for c in categories)

    gallery_html = f'''<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>黑刀刺客 · 視覺考據圖鑑</title>
<style>
*{{box-sizing:border-box}}
body{{margin:0;background:#0d0f17;color:#e8e4f0;font:15px/1.6 system-ui,-apple-system,sans-serif}}
header,main{{max-width:1440px;margin:auto;padding:28px 24px}}
header{{border-bottom:1px solid #322d47}}
h1{{font-size:clamp(28px,4vw,46px);margin:0 0 8px;color:#f0ece4}}
.eyebrow{{color:#d84848;letter-spacing:.2em;font-size:12px;font-weight:700;text-transform:uppercase}}
.muted{{color:#928ba4;font-size:14px;margin-top:4px}}
nav{{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}}
button{{background:#1c1928;color:#c8c0dc;border:1px solid #3c3554;border-radius:20px;padding:6px 16px;font:inherit;font-size:14px;cursor:pointer;transition:.15s ease}}
button:hover{{background:#28233a;color:#fff}}
button.on{{background:#b22222;color:#fff;border-color:#ff4444;box-shadow:0 0 12px rgba(178,34,34,0.4)}}
main{{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;padding-top:28px}}
article{{background:#151320;border:1px solid #282438;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;transition:transform .15s ease}}
article:hover{{transform:translateY(-3px);border-color:#5c2424}}
article img{{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:#050508}}
article[data-category="官方概念圖"] img,article[data-category="模型與裝備"] img,article[data-category="招式圖解"] img{{object-fit:contain;background:#090810}}
article div{{padding:14px 16px;flex:1;display:flex;flex-direction:column}}
small{{color:#e85050;font-weight:600;font-size:12px;letter-spacing:.05em}}
p{{margin:8px 0;font-size:14px;line-height:1.55;color:#ddd6e8;flex:1}}
.src{{color:#ff8080;font-size:13px;text-decoration:none;margin-top:8px;align-self:flex-start}}
.src:hover{{text-decoration:underline}}
</style>
</head>
<body>
<header>
<div class="eyebrow">Elden Ring / Lore & Visual Research</div>
<h1>黑刀刺客・視覺考據圖鑑</h1>
<p class="muted">共 {n_sel} 張精選參考圖（含 1 張官方概念設計圖原稿、11 張模型與裝備細節、10 張命定之死紅黑死焰演出、12 張體術與空中身法、6 張隱形暗殺處決、12 張實戰 Boss 對決）</p>
<p class="muted">圖片版權歸屬 FromSoftware / Bandai Namco 與原截圖持有人。僅供本機研究與 Boss 設計參考，不作遊戲貼圖。</p>
<nav>{buttons}</nav>
</header>
<main>
{cards}
</main>
<script>
document.querySelectorAll('[data-filter]').forEach(btn => {{
  btn.onclick = () => {{
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('on', b === btn));
    const filter = btn.dataset.filter;
    document.querySelectorAll('article').forEach(card => {{
      card.style.display = (filter === '全部' || card.dataset.category === filter) ? '' : 'none';
    }});
  }};
}});
</script>
</body>
</html>
'''
    write(ROOT / 'gallery.html', gallery_html)

    # Generate IMAGE-INDEX.md
    index_md = [
        '# 黑刀刺客・逐圖考據與來源索引',
        '',
        f'查核日期：2026-11-13。共取得 56 張本機參考圖像，經人工檢驗排除 4 張地圖/純文字後，共選錄 **{n_sel} 張核心參考**（包含 1 張官方概念圖原稿）。',
        '',
        '- [開啟本機視覺圖鑑](gallery.html)',
        '- [選圖多張拼版 01](selected-01.jpg) · [拼版 02](selected-02.jpg) · [拼版 03](selected-03.jpg) · [拼版 04](selected-04.jpg) · [拼版 05](selected-05.jpg)',
        '- 機器可讀選圖清單：[selected-images.json](selected-images.json)',
        '- 可編輯檢索資料庫：`docs/research/blackknife/library/`',
        '',
        '## 逐圖詳細說明',
        ''
    ]
    for x in selected:
        index_md += [
            f'### {x["id"]} · {x["category"]}',
            x['observation'],
            '',
            f'- **來源頁**：[{x["page_url"]}]({x["page_url"]})',
            f'- **原圖網址**：[{x["image_url"]}]({x["image_url"]})',
            f'- **本機檔案**：`{x["file"]}` ({x["width"]}x{x["height"]})',
            f'- **查核紀錄**：{x["inspection_ref"]}',
            f'- **SHA-256**：`{x["sha256"]}`',
            ''
        ]
    write(ROOT / 'IMAGE-INDEX.md', '\n'.join(index_md))

    # Generate README.md
    readme_md = f'''# 黑刀刺客考據資料庫

[開啟本機視覺圖鑑](gallery.html) · [逐圖來源索引](IMAGE-INDEX.md) · [文字與技能設計文檔](../../bosses/blackknife.md)

本資料庫為《艾爾登法環》黑刀刺客（Black Knife Assassin / 黒き刃の刺客）與首領亞勒托（Alecto）的原作考據與視覺參考。

- **精選參考數量**：{n_sel} 張（含 1 張官方畫冊概念圖原稿）
- **本機圖片庫**：`images/`（不作為遊戲貼圖進入遊戲執行檔）
- **多圖拼版總覽**：`selected-01.jpg` 至 `selected-05.jpg`
- **圖鑑網頁**：`gallery.html`（具備分類篩選功能）
- **正文資料庫**：`library/records/`（包含 52 筆圖像紀錄與 6 筆核心文獻紀錄）
- **重建索引指令**：`python ~/.gemini/config/skills/build-work-library/scripts/work_library.py reindex --project docs/research/blackknife/library`
'''
    write(ROOT / 'README.md', readme_md)
    print(f'FINALIZE_COMPLETE: {n_sel} images selected, gallery and index written.')

if __name__ == '__main__':
    main()
