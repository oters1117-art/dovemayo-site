import importlib.util,tempfile,threading,unittest,uuid,requests
from pathlib import Path
spec=importlib.util.spec_from_file_location('preview',Path(__file__).parents[1]/'scripts/preview-server.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class AnalyticsTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();m.DB=Path(cls.tmp.name)/'test.sqlite3';m.init();cls.server=m.ThreadingHTTPServer(('127.0.0.1',0),m.Handler);cls.url='http://127.0.0.1:'+str(cls.server.server_port);threading.Thread(target=cls.server.serve_forever,daemon=True).start()
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close();cls.tmp.cleanup()
 def test_01_unlisted_dashboard_needs_no_login(self):
  self.assertEqual(requests.get(self.url+'/api/admin/stats').status_code,200)
  page=requests.get(self.url+'/admin').text
  self.assertNotIn('type="password"',page)
  self.assertLess(page.index('홈페이지 통계'),page.index('유입 사이트'))
  self.assertLess(page.index('유입 사이트'),page.index('게임 통계'))
  self.assertLess(page.index('게임 통계'),page.index('최고 점수'))
  self.assertIn('noindex,nofollow',page)
  self.assertNotIn('/admin',requests.get(self.url+'/').text)
 def test_02_metrics_deduplicated(self):
  s=requests.Session();self.assertEqual(s.post(self.url+'/api/visit',json={}).status_code,200);s.post(self.url+'/api/visit',json={});pid=str(uuid.uuid4());s.post(self.url+'/api/play',json={'id':pid});s.post(self.url+'/api/play',json={'id':pid});s.post(self.url+'/api/end',json={'id':pid,'score':135,'seconds':427,'active':300})
  r=s.get(self.url+'/api/admin/stats');self.assertEqual(r.status_code,200);d=r.json();self.assertEqual(d['visitors'],1);self.assertEqual(d['visits'],1);self.assertEqual(d['players'],1);self.assertEqual(d['plays'],1);self.assertEqual(d['score'],135);self.assertEqual(d['seconds'],427)
 def test_03_wrong_origin_and_dns_rebinding_rejected(self):
  self.assertEqual(requests.post(self.url+'/api/visit',json={},headers={'Origin':'https://attacker.test'}).status_code,403)
  self.assertEqual(requests.get(self.url+'/',headers={'Host':'attacker.test'}).status_code,403)
  self.assertEqual(requests.post(self.url+'/api/visit',data='{}',headers={'Content-Type':'text/plain'}).status_code,415)
 def test_04_private_files_not_served(self):
  for path in ['/scripts/preview-server.py','/.sites-runtime/admin-password.txt','/.git/config','/audio/']:
   self.assertEqual(requests.get(self.url+path).status_code,404)
 def test_05_other_visitor_cannot_update_play(self):
  a=requests.Session();a.post(self.url+'/api/visit',json={});pid=str(uuid.uuid4());a.post(self.url+'/api/play',json={'id':pid});b=requests.Session();b.post(self.url+'/api/visit',json={});b.post(self.url+'/api/end',json={'id':pid,'score':99999,'seconds':888,'active':888})
  with m.connect() as c:self.assertEqual(c.execute('select score from plays where id=?',(pid,)).fetchone()[0],0)
 def test_06_player_averages_and_unique_top_twenty(self):
  with m.connect() as c:
   for i in range(25):
    visitor=f'ranking-player-{i:02d}';c.execute('INSERT INTO visitors VALUES(?,?,?)',(visitor,10+i,10+i))
    for attempt in range(3):c.execute('INSERT INTO plays VALUES(?,?,?,?,?,?,?)',(str(uuid.uuid4()),visitor,100,i*100+attempt,i*10+attempt,10,1))
  data=requests.get(self.url+'/api/admin/stats').json()
  self.assertEqual(len(data['scoreRanking']),20);self.assertEqual(len(data['timeRanking']),20)
  self.assertEqual(len(set(r['player'] for r in data['scoreRanking'])),20)
  self.assertEqual(data['scoreRanking'][0]['value'],2402)
  self.assertEqual(data['timeRanking'][0]['value'],427)
  self.assertAlmostEqual(data['averagePlayerSeconds'],1050/27)
  page=requests.get(self.url+'/admin').text;self.assertNotIn('플레이 횟수',page)
 def test_07_pageviews_and_referrer_hosts(self):
  session=requests.Session();start=session.get(self.url+'/api/admin/stats').json()['pageviews'];page=str(uuid.uuid4())
  for _ in range(2):session.post(self.url+'/api/visit',json={'pageId':page,'referrer':'https://example.org/private?token=secret'})
  session.post(self.url+'/api/visit',json={'pageId':str(uuid.uuid4()),'referrer':''})
  data=session.get(self.url+'/api/admin/stats').json();self.assertEqual(data['pageviews'],start+2)
  self.assertTrue(any(r['source']=='example.org' and r['views']==1 for r in data['referrers']))
  self.assertNotIn('secret',str(data['referrers']))
  self.assertGreaterEqual(data['todayViews'],2)
if __name__=='__main__':unittest.main()
