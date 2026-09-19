from pathlib import Path
import requests,concurrent.futures,json
p=Path('dist/emoji')
names=['1f419','1fac0','1f528','1f3b1','1f383','1f9e0','2601','26a1','1f300','1f95a','1f9ff','1f451','1f97a','270b','1f448','1f449','1f60e','1f3f0','1f9e8','1f382']
def fetch(n):
 r=requests.get('https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/'+n+'.svg',timeout=25);r.raise_for_status();(p/(n+'.svg')).write_bytes(r.content)
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:list(pool.map(fetch,names))
m=json.loads((p/'manifest.json').read_text());m['expansion']=names;(p/'manifest.json').write_text(json.dumps(m,separators=(',',':')))
print('Downloaded',len(names),'Twemoji assets')
