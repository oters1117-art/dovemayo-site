"""Local-only preview and unlisted SQLite analytics. Not a production server."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from http.cookies import SimpleCookie
from urllib.parse import urlparse
import sqlite3,json,secrets,hmac,time,os,argparse
ROOT=Path(__file__).resolve().parents[1]
STATE=ROOT/'.sites-runtime';STATE.mkdir(exist_ok=True)
DB=STATE/'analytics.sqlite3'
def connect():
 c=sqlite3.connect(DB,timeout=10);c.execute('PRAGMA journal_mode=WAL');return c
def init():
 with connect() as c:c.executescript('''CREATE TABLE IF NOT EXISTS visitors(id TEXT PRIMARY KEY,first INTEGER,last INTEGER);CREATE TABLE IF NOT EXISTS visits(id TEXT PRIMARY KEY,visitor TEXT,at INTEGER);CREATE TABLE IF NOT EXISTS plays(id TEXT PRIMARY KEY,visitor TEXT,at INTEGER,score INTEGER DEFAULT 0,seconds REAL DEFAULT 0,active REAL DEFAULT 0,ended INTEGER DEFAULT 0);CREATE TABLE IF NOT EXISTS pageviews(id TEXT PRIMARY KEY,visitor TEXT,at INTEGER,referrer TEXT);CREATE INDEX IF NOT EXISTS pageviews_at ON pageviews(at);''')
PAGE=r'''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>dovemayo · 통계</title><style>body{margin:50px auto;padding:0 24px;max-width:900px;background:#f1eeee;color:#323238;font:15px/1.6 system-ui}h1{font-size:25px}h2{font-size:18px}small{color:#777}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin:24px 0}article{background:white;border:1px solid #e3dfdf;border-radius:18px;padding:22px}strong{display:block;font-size:30px}button{padding:10px 16px;border:1px solid #ddd;border-radius:10px;background:white;cursor:pointer}table{width:100%;text-align:left;border-collapse:collapse;font-variant-numeric:tabular-nums}td,th{padding:10px 5px;border-bottom:1px solid #eee}td:last-child,th:last-child{text-align:right}p{color:#777}</style><h1>dovemayo <small>통계</small></h1><p>로컬 테스트 · 브라우저별 익명 플레이어를 집계합니다.</p><button id="refresh">새로고침</button><h2>홈페이지 통계</h2><section id="site-cards"></section><section><article><h2>유입 사이트</h2><table><thead><tr><th>사이트</th><th>조회수</th></tr></thead><tbody id="referrers"></tbody></table><p>주소 직접 입력·앱·리퍼러 미전달은 직접 / 알 수 없음으로 표시합니다. 조회수·유입 기록은 이번 업데이트부터 집계합니다.</p></article></section><h2>게임 통계</h2><section id="game-cards"></section><section><article><h2>최고 점수 · TOP 20</h2><table><thead><tr><th>순위</th><th>플레이어</th><th>점수</th></tr></thead><tbody id="scores"></tbody></table></article><article><h2>최고 생존 시간 · TOP 20</h2><table><thead><tr><th>순위</th><th>플레이어</th><th>시간</th></tr></thead><tbody id="times"></tbody></table></article></section><small>평균은 각 플레이어의 누적 실제 플레이 시간을 기준으로 계산합니다. 순위에는 플레이어별 최고 기록 한 개만 표시합니다. 다른 기기·시크릿 창·쿠키 삭제는 새 플레이어로 집계됩니다. 종료 없이 닫은 게임은 마지막 15초 주기 기록까지 남습니다.</small><script>
const fmt=s=>Math.floor(s/60).toString().padStart(2,'0')+':'+Math.floor(s%60).toString().padStart(2,'0');
async function load(){const r=await fetch('/api/admin/stats');if(!r.ok)return;const d=await r.json();for(const [id,values] of [['site-cards',[['오늘 사이트 조회수',d.todayViews],['누적 조회수',d.pageviews]]],['game-cards',[['플레이어 수',d.players],['플레이어당 평균 플레이 시간',fmt(d.averagePlayerSeconds)]]]])document.getElementById(id).replaceChildren(...values.map(([label,value])=>{const a=document.createElement('article'),title=document.createElement('span'),b=document.createElement('strong');title.textContent=label;b.textContent=value;a.append(title,b);return a;}));for(const [id,rows] of [['scores',d.scoreRanking],['times',d.timeRanking],['referrers',d.referrers]])document.getElementById(id).replaceChildren(...rows.map((row,i)=>{const tr=document.createElement('tr');for(const value of (id==='referrers'?[row.source,row.views]:[i+1,row.player,id==='scores'?row.value:fmt(row.value)])){const td=document.createElement('td');td.textContent=value;tr.append(td);}return tr;}));}
document.querySelector('#refresh').onclick=load;load();</script></html>'''

class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT/'dist'),**kw)
 def end_headers(self):
  self.send_header("Cache-Control","no-store")
  super().end_headers()
 def log_message(self,*a):pass
 def cookie(self,name):
  try:return SimpleCookie(self.headers.get('Cookie','')).get(name).value
  except:return None
 def response(self,status,data,headers=(),mime='application/json'):
  blob=(json.dumps(data) if mime=='application/json' else data).encode();self.send_response(status);self.send_header('Content-Type',mime+'; charset=utf-8');self.send_header('Content-Length',str(len(blob)));self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('X-Frame-Options','DENY')
  for k,v in headers:self.send_header(k,v)
  self.end_headers();self.wfile.write(blob)
 def valid_host(self):return self.headers.get('Host') in (f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}')
 def do_GET(self):
  if not self.valid_host():return self.response(403,{'error':'host'})
  path=urlparse(self.path).path
  if path=='/admin':return self.response(200,PAGE,mime='text/html')
  if path=='/api/admin/stats':
   with connect() as c:
    scalar=lambda q:c.execute(q).fetchone()[0] or 0
    stats={'visitors':scalar('SELECT count(*) FROM visitors'),'visits':scalar('SELECT count(*) FROM visits'),'today':scalar("SELECT count(DISTINCT visitor) FROM visits WHERE date(at,'unixepoch','+9 hours')=date('now','+9 hours')"),'players':scalar('SELECT count(DISTINCT visitor) FROM plays'),'plays':scalar('SELECT count(*) FROM plays'),'score':scalar('SELECT max(score) FROM plays'),'seconds':scalar('SELECT max(seconds) FROM plays'),'active':scalar('SELECT sum(active) FROM plays')}
    stats['pageviews']=scalar('SELECT count(*) FROM pageviews')
    stats['todayViews']=scalar("SELECT count(*) FROM pageviews WHERE date(at,'unixepoch','+9 hours')=date('now','+9 hours')")
    stats['referrers']=[{'source':r or '직접 / 알 수 없음','views':n} for r,n in c.execute('SELECT referrer,count(*) n FROM pageviews GROUP BY referrer ORDER BY n DESC LIMIT 30')]
    stats['averagePlayerSeconds']=stats['active']/stats['players'] if stats['players'] else 0
    labels={row[0]:f'플레이어 {i+1:04d}' for i,row in enumerate(c.execute('SELECT id FROM visitors ORDER BY first,id'))}
    for key,column in [('scoreRanking','score'),('timeRanking','seconds')]:
     rows=c.execute(f'SELECT visitor,max({column}) value FROM plays GROUP BY visitor ORDER BY value DESC,visitor LIMIT 20').fetchall()
     stats[key]=[{'player':labels.get(visitor,'플레이어'),'value':value} for visitor,value in rows]

   return self.response(200,stats)
  if path.startswith('/api/'):return self.response(404,{})
  # Only public assets are served; no directory listing or project source escape.
  target=Path(self.translate_path(self.path)).resolve()
  if not target.is_relative_to((ROOT/'dist').resolve()) or (target.is_dir() and path!='/'):return self.response(404,{})
  if "If-Modified-Since" in self.headers:del self.headers["If-Modified-Since"]
  return super().do_GET()
 def do_POST(self):
  if not self.valid_host():return self.response(403,{})
  origin=self.headers.get('Origin');expected='http://'+self.headers.get('Host','')
  if origin and origin!=expected:return self.response(403,{'error':'origin'})
  if self.headers.get('Content-Type','').split(';')[0]!='application/json':return self.response(415,{})
  try:
   length=int(self.headers.get('Content-Length','0'))
   if not 0<length<=4096:return self.response(413,{})
   data=json.loads(self.rfile.read(length));assert isinstance(data,dict)
  except:return self.response(400,{})
  path=urlparse(self.path).path;now=int(time.time())
  if path not in ['/api/visit','/api/play','/api/progress','/api/end']:return self.response(404,{})
  visitor=self.cookie('visitor');headers=[]
  if not visitor or len(visitor)>64:visitor=secrets.token_hex(16);headers.append(('Set-Cookie',f'visitor={visitor}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000'))
  with connect() as c:
   c.execute('INSERT INTO visitors VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET last=excluded.last',(visitor,now,now))
   if path=='/api/visit':
    page_id=str(data.get('pageId') or secrets.token_hex(16))[:64]
    try:
     parsed=urlparse(str(data.get('referrer',''))[:2048]);referrer=parsed.hostname if parsed.scheme in ('http','https') else ''
     if referrer in ('127.0.0.1','localhost','dovemayo.com','www.dovemayo.com'):referrer=''
    except:referrer=''
    c.execute('INSERT OR IGNORE INTO pageviews VALUES(?,?,?,?)',(page_id,visitor,now,referrer or ''))
    visit=self.cookie('visit') or secrets.token_hex(16);c.execute('INSERT OR IGNORE INTO visits VALUES(?,?,?)',(visit,visitor,now));headers.append(('Set-Cookie',f'visit={visit}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800'))
   else:
    pid=str(data.get('id',''))
    if len(pid)!=36:return self.response(400,{})
    if path=='/api/play':c.execute('INSERT OR IGNORE INTO plays(id,visitor,at) VALUES(?,?,?)',(pid,visitor,now))
    else:
     try:score=max(0,min(1000000,int(data.get('score',0))));seconds=max(0,min(86400,float(data.get('seconds',0))));active=max(0,min(seconds,float(data.get('active',0))))
     except:return self.response(400,{})
     c.execute('UPDATE plays SET score=max(score,?),seconds=max(seconds,?),active=max(active,?),ended=max(ended,?) WHERE id=? AND visitor=?',(score,seconds,active,int(path=='/api/end'),pid,visitor))
  return self.response(200,{},headers)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=4174);args=parser.parse_args();init();print(f'Preview: http://127.0.0.1:{args.port}/\nAdmin: http://127.0.0.1:{args.port}/admin',flush=True);ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
