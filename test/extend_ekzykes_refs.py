"""Append extra public references after first inventory; never replace originals."""
import concurrent.futures, json
from PIL import Image, ImageDraw
from collect_ekzykes_refs import ROOT, page, download

PAGES=[]  # Initial and supplementary pages are recorded in the inventories.
def main():
 rows=json.loads((ROOT/'images.json').read_text(encoding='utf-8'))
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:new=[x for r in ex.map(page,PAGES) for x in r]
 new += [dict(page_url='https://www.youtube.com/watch?v='+v,image_url='https://i.ytimg.com/vi/'+v+'/hqdefault.jpg',alt='Public video thumbnail; full video not inspected',category='video-cover') for v in ['nRvzrOb2kUs','mUZUO6rlWM8','CBW2tc6Iu8A','yEZf_QtRZqI']]
 new += [dict(page_url='https://www.gamerguides.com/elden-ring/database/bosses/caelid-bosses/decaying-ekzykes',image_url='https://www.gamerguides.com/assets/media/15/680991/decaying_ekzykes.png',alt='Decaying Ekzykes database image',category='gameplay'),dict(page_url='https://video-game-guide-walkthrough.supersoluce.com/solution/elden-ring-guide-walkthrough/er-bosses-guide/bosses-caelid/decaying-ekzykes/',image_url='https://cdn.supersoluce.com/file/docs/docid_60cc9d3a9a20455d6c000001/elemid_4ee9fac00a2fe93e0e000014/thumb_1647330752-1.jpg',alt='Decaying Ekzykes gameplay video cover',category='video-cover')]
 new += [dict(page_url='https://www.windowscentral.com/elden-ring-best-spells',image_url='https://cdn.mos.cms.futurecdn.net/XgcRdTBbo7QoYBwDFm4ZAg.png',alt='In-game Ekzykes Decay item description',category='item-description')]
 old_urls={x['image_url'] for x in rows}
 new=[x for x in {x['image_url']:x for x in new}.values() if x['image_url'] not in old_urls]
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
  for result in ex.map(download,new):
   if result is None:continue
   item,data,im=result
   animated=data.startswith(b'GIF')
   if any(item['sha256']==x['sha256'] or (not animated and (item['dhash']^x['dhash']).bit_count()<14) for x in rows):continue
   item['id']='ek-ref-%03d'%(len(rows)+1)
   ext='.gif' if data.startswith(b'GIF') else '.png' if data.startswith(b'\x89PNG') else '.webp' if data[8:12]==b'WEBP' else '.jpg'
   item.update(file='images/'+item['id']+ext,inspection='not-viewed',inspection_ref=None,use='reference-only',retrieved_at='2026-11-07',realm='reference',continuity='elden-ring-2022-base-game',rights='Original rights retained; local research only; redistribution permission unknown.')
   (ROOT/item['file']).write_bytes(data); rows.append(item)
 (ROOT/'images.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
 tiles=[]
 for item in rows:
  im=Image.open(ROOT/item['file']).convert('RGB'); im.thumbnail((492,278)); tile=Image.new('RGB',(500,320),'#13191b'); tile.paste(im,((500-im.width)//2,0))
  ImageDraw.Draw(tile).text((8,288),item['id']+' | '+item['category']+' | '+str(item['width'])+'x'+str(item['height']),fill='white'); tiles.append(tile)
 for start in range(0,len(tiles),9):
  group=tiles[start:start+9]; sheet=Image.new('RGB',(1500,320*((len(group)+2)//3)),'#13191b')
  for i,t in enumerate(group):sheet.paste(t,((i%3)*500,(i//3)*320))
  sheet.save(ROOT/('contact-%02d.jpg'%(start//9+1)),quality=90)
 print('TOTAL_CANDIDATES',len(rows))
if __name__=='__main__':main()
