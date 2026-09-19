import importlib.util,tempfile,threading,unittest,uuid,requests
from pathlib import Path
spec=importlib.util.spec_from_file_location('preview',Path(__file__).parents[1]/'scripts/preview-server.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class AnalyticsTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();m.DB=Path(cls.tmp.name)/'test.sqlite3';m.init();cls.server=m.ThreadingHTTPServer(('127.0.0.1',0),m.Handler);cls.url='http://127.0.0.1:'+str(cls.server.server_port);threading.Thread(target=cls.server.serve_forever,daemon=True).start()
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close();cls.tmp.cleanup()
 def test_01_auth_required(self):
  self.assertEqual(requests.get(self.url+'/api/admin/stats').status_code,401)
  self.assertEqual(requests.post(self.url+'/api/admin/login',json={'password':'wrong'}).status_code,401)
 def test_02_metrics_private_and_deduplicated(self):
  s=requests.Session();self.assertEqual(s.post(self.url+'/api/visit',json={}).status_code,200);s.post(self.url+'/api/visit',json={});pid=str(uuid.uuid4());s.post(self.url+'/api/play',json={'id':pid});s.post(self.url+'/api/play',json={'id':pid});s.post(self.url+'/api/end',json={'id':pid,'score':135,'seconds':427,'active':300})
  self.assertEqual(s.get(self.url+'/api/admin/stats').status_code,401)
  self.assertEqual(s.post(self.url+'/api/admin/login',json={'password':m.PASSWORD}).status_code,200);r=s.get(self.url+'/api/admin/stats');self.assertEqual(r.status_code,200);d=r.json();self.assertEqual(d['visitors'],1);self.assertEqual(d['visits'],1);self.assertEqual(d['players'],1);self.assertEqual(d['plays'],1);self.assertEqual(d['score'],135);self.assertEqual(d['seconds'],427)
  s.post(self.url+'/api/admin/logout',json={});self.assertEqual(s.get(self.url+'/api/admin/stats').status_code,401)
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
if __name__=='__main__':unittest.main()
