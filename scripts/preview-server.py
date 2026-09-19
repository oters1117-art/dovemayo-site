"""Local-only preview and private, authenticated SQLite analytics. Not a production server."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from http.cookies import SimpleCookie
from urllib.parse import urlparse
import sqlite3,json,secrets,hmac,time,os,argparse
ROOT=Path(__file__).resolve().parents[1]
STATE=ROOT/'.sites-runtime';STATE.mkdir(exist_ok=True)
KEY=STATE/'admin-password.txt'
if not KEY.exists():KEY.write_text(secrets.token_urlsafe(24),encoding='utf-8')
PASSWORD=KEY.read_text(encoding='utf-8').strip()
DB=STATE/'analytics.sqlite3'
SESSIONS={};ATTEMPTS={}
def connect():
 c=sqlite3.connect(DB,timeout=10);c.execute('PRAGMA journal_mode=WAL');return c
def init():
 with connect() as c:c.executescript('''CREATE TABLE IF NOT EXISTS visitors(id TEXT PRIMARY KEY,first INTEGER,last INTEGER);CREATE TABLE IF NOT EXISTS visits(id TEXT PRIMARY KEY,visitor TEXT,at INTEGER);CREATE TABLE IF NOT EXISTS plays(id TEXT PRIMARY KEY,visitor TEXT,at INTEGER,score INTEGER DEFAULT 0,seconds REAL DEFAULT 0,active REAL DEFAULT 0,ended INTEGER DEFAULT 0);''')
PAGE='''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>dovemayo · 관리</title><style>body{margin:50px auto;padding:0 24px;max-width:840px;background:#f1eeee;color:#323238;font:15px/1.6 system-ui}h1{font-size:25px}small{color:#888}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:24px 0}article{background:white;border:1px solid #e3dfdf;border-radius:18px;padding:22px}strong{display:block;font-size:30px}input,button{padding:12px;border:1px solid #ccc;border-radius:10px;background:white}table{width:100%;text-align:left;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #dedada}</style><h1>dovemayo <small>통계</small></h1><p>로컬 테스트 통계 · 방문자와 플레이어는 브라우저별 익명 식별자로 집계합니다.</p><div id="login"><form><input type="password" autocomplete="current-password" aria-label="관리 비밀번호" placeholder="관리 비밀번호" required><button>로그인</button></form><p id="error"></p></div><div id="dashboard" hidden><button id="refresh">새로고침</button> <button id="logout">로그아웃</button><section id="cards"></section><h2>최근 7일</h2><table><thead><tr><th>날짜</th><th>방문자</th><th>방문 횟수</th><th>플레이</th></tr></thead><tbody></tbody></table><small>다른 기기·시크릿 창·쿠키 삭제는 새 방문자로 집계됩니다. 종료 없이 닫은 플레이는 마지막 15초 주기 기록까지 남습니다.</small></div><script>
const login=document.querySelector('#login'),dash=document.querySelector('#dashboard');
async function load(){const r=await fetch('/api/admin/stats');if(!r.ok){login.hidden=false;dash.hidden=true;return}const d=await r.json();login.hidden=true;dash.hidden=false;const fmt=s=>Math.floor(s/60).toString().padStart(2,'0')+':'+Math.floor(s%60).toString().padStart(2,'0');const values=[['오늘 방문자',d.today],['누적 방문자',d.visitors],['누적 방문 횟수',d.visits],['게임 플레이어',d.players],['플레이 횟수',d.plays],['최고 점수',d.score],['최고 생존 시간',fmt(d.seconds)],['누적 실제 플레이',fmt(d.active)]];document.querySelector('#cards').replaceChildren(...values.map(([label,value])=>{const a=document.createElement('article'),b=document.createElement('strong');a.textContent=label;b.textContent=value;a.append(b);return a}));document.querySelector('tbody').replaceChildren(...d.days.map(row=>{const tr=document.createElement('tr');for(const v of row){const td=document.createElement('td');td.textContent=v;tr.append(td)}return tr}));}
document.querySelector('form').onsubmit=async e=>{e.preventDefault();const input=document.querySelector('input'),r=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:input.value})});input.value='';document.querySelector('#error').textContent=r.ok?'':'비밀번호를 확인하세요.';if(r.ok)load()};document.querySelector('#refresh').onclick=load;document.querySelector('#logout').onclick=async()=>{await fetch('/api/admin/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});load()};load();</script></html>'''
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT/'dist'),**kw)
 def log_message(self,*a):pass
 def cookie(self,name):
  try:return SimpleCookie(self.headers.get('Cookie','')).get(name).value
  except:return None
 def auth(self):return SESSIONS.get(self.cookie('admin'),0)>time.time()
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
   if not self.auth():return self.response(401,{'error':'login required'})
   with connect() as c:
    scalar=lambda q:c.execute(q).fetchone()[0] or 0
    stats={'visitors':scalar('SELECT count(*) FROM visitors'),'visits':scalar('SELECT count(*) FROM visits'),'today':scalar("SELECT count(DISTINCT visitor) FROM visits WHERE date(at,'unixepoch','+9 hours')=date('now','+9 hours')"),'players':scalar('SELECT count(DISTINCT visitor) FROM plays'),'plays':scalar('SELECT count(*) FROM plays'),'score':scalar('SELECT max(score) FROM plays'),'seconds':scalar('SELECT max(seconds) FROM plays'),'active':scalar('SELECT sum(active) FROM plays')}
    stats['days']=c.execute("SELECT date(at,'unixepoch','+9 hours') day,count(DISTINCT visitor),count(*),(SELECT count(*) FROM plays p WHERE date(p.at,'unixepoch','+9 hours')=date(v.at,'unixepoch','+9 hours')) FROM visits v GROUP BY day ORDER BY day DESC LIMIT 7").fetchall()
   return self.response(200,stats)
  if path.startswith('/api/'):return self.response(404,{})
  # Only public assets are served; no directory listing or project source escape.
  target=Path(self.translate_path(self.path)).resolve()
  if not target.is_relative_to((ROOT/'dist').resolve()) or (target.is_dir() and path!='/'):return self.response(404,{})
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
  if path=='/api/admin/login':
   recent=[t for t in ATTEMPTS.get(self.client_address[0],[]) if now-t<60]
   if len(recent)>=8:return self.response(429,{})
   recent.append(now);ATTEMPTS[self.client_address[0]]=recent
   if not hmac.compare_digest(str(data.get('password','')),PASSWORD):return self.response(401,{})
   SESSIONS.update({secrets.token_urlsafe(32):now+3600});token=next(reversed(SESSIONS));return self.response(200,{},[('Set-Cookie',f'admin={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600')])
  if path=='/api/admin/logout':
   SESSIONS.pop(self.cookie('admin'),None);return self.response(200,{},[('Set-Cookie','admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')])
  if path not in ['/api/visit','/api/play','/api/progress','/api/end']:return self.response(404,{})
  visitor=self.cookie('visitor');headers=[]
  if not visitor or len(visitor)>64:visitor=secrets.token_hex(16);headers.append(('Set-Cookie',f'visitor={visitor}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000'))
  with connect() as c:
   c.execute('INSERT INTO visitors VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET last=excluded.last',(visitor,now,now))
   if path=='/api/visit':
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
 parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=4174);args=parser.parse_args();init();print(f'Preview: http://127.0.0.1:{args.port}/\nAdmin: http://127.0.0.1:{args.port}/admin\nPassword file: {KEY}',flush=True);ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
