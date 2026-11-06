from pathlib import Path
import json,hashlib,copy
P=Path(__file__).resolve().parents[1];d=json.loads((P/'data/dashboard.json').read_text());lock=json.loads((P/'data/integrity.json').read_text())
for s in d['sources']:assert hashlib.sha256((P/s['file']).read_bytes()).hexdigest()==s['sha256']
for layer,hashes in lock.items():
 assert [hashlib.sha256(json.dumps(x,ensure_ascii=False,sort_keys=True).encode()).hexdigest() for x in d[layer]]==hashes,layer
 assert json.loads((P/f'data/{layer}.json').read_text())==d[layer],layer
for layer in ['predictions','results','updates','reviews']:
 ids=[p['id'] for p in d[layer]];assert len(ids)==len(set(ids)),layer
assert len(d['rounds'])==17 and len(d['predictions'])==161 and len(d['results'])==137
assert len(d['research'])==59
rs={(r['record_id'],r['match_id']):r for r in d['results']}
assert len(rs)==137
rid=lambda l,g:next(r['id'] for r in d['rounds'] if r['league']==l and r['gw']==g)
def ps(l,g,version=None):
 key=rid(l,g);out=copy.deepcopy([p for p in d['predictions'] if p['record_id']==key])
 for u in d['updates']:
  if u['record_id']!=key:continue
  for x in u.get('rank_additions',[]):next(p for p in out if p['match_id']==x['match_id'])['ranks'][x['market']]=x['rank']
  if u['id']==version:
   for m,ids in u.get('rank_overrides',{}).items():
    for p in out:p['ranks'][m]=ids.index(p['match_id'])+1 if p['match_id'] in ids else None
 return out

def calc(l,g,m,rank=None,version=None):
 h=n=0
 for p in ps(l,g,version):
  if m not in p['directions'] or rank and p['ranks'].get(m)!=rank:continue
  result=rs.get((p['record_id'],p['match_id']),{})
  if not result.get('score'):continue
  a,b=result['score'];actual=('主勝' if a>b else '客勝' if a<b else '和') if m=='1x2' else ('大' if a+b>2 else '小') if m=='ou25' else ('單' if (a+b)%2 else '雙')
  h+=actual==p['directions'][m];n+=1
 return h,n
expected={('BUNDESLIGA',8):[(3,9),(5,9),(7,9)],('EPL',6):[(0,0),(0,0),(2,2)],('EPL',7):[(0,0),(0,0),(6,10)],('EPL',8):[(4,10),(3,10),(5,10)],('EPL',9):[(5,10),(2,10),(4,10)],('LALIGA',8):[(0,0),(0,0),(5,9)],('BUNDESLIGA',5):[(0,0),(0,0),(2,9)],('BUNDESLIGA',6):[(0,0),(0,0),(2,9)],('BUNDESLIGA',7):[(4,9),(5,9),(3,9)],('BUNDESLIGA',9):[(0,0)]*3,('SERIEA',6):[(0,0),(0,0),(7,10)],('SERIEA',7):[(0,0),(0,0),(6,10)],('SERIEA',8):[(8,10),(6,10),(6,10)],('LIGUE1',6):[(0,0),(0,0),(1,2)],('LIGUE1',7):[(0,0),(2,2),(3,9)],('LIGUE1',8):[(4,9),(5,9),(6,9)],('LIGUE1',9):[(6,9),(5,9),(2,9)]}
for (l,g),values in expected.items():assert [calc(l,g,m) for m in ['1x2','ou25','parity']]==values,(l,g)
# Exclude candidate R3, preserve new revisions and original ranking.
assert not any(p['ranks'].get('parity')==3 for l,g in [('LALIGA',8),('BUNDESLIGA',6),('BUNDESLIGA',7),('SERIEA',7)] for p in ps(l,g))
assert len([p for p in ps('BUNDESLIGA',9) if p['directions']['parity']=='雙'])==8
bversion='BUNDESLIGA-2026-27-GW09-20261105-SKEW-AUDIT'
assert next(p['fixture'] for p in ps('BUNDESLIGA',9) if p['ranks']['parity']==1)=='漢堡 vs 門興'
assert next(p['fixture'] for p in ps('BUNDESLIGA',9,bversion) if p['ranks']['parity']==1)=='美因茨 vs 拜仁'
sver='SERIEA-2026-27-GW08-20261023-MARKETUPDATE'
assert next(p['fixture'] for p in ps('SERIEA',8) if p['ranks']['1x2']==2)=='萊切 vs 祖雲達斯'
assert next(p['fixture'] for p in ps('SERIEA',8,sver) if p['ranks']['1x2']==2)=='拉素 vs 帕爾馬'
assert all(calc('SERIEA',8,'1x2',r,sver)==(1,1) for r in [1,2,3])
assert sum(r.get('status')=='ABANDONED' for r in d['results'])==1
assert not any(r['record_id']==rid('BUNDESLIGA',9) for r in d['results'])
for l,base,xuan,n in [('BUNDESLIGA',53,54,102),('LALIGA',36,33,76),('SERIEA',59,61,114),('LIGUE1',57,55,102)]:
 for model,h in [('BASE',base),('XUAN_PROXY',xuan)]:
  rr=[r for r in d['research'] if r.get('league')==l and r['model']==model];assert sum(x['hits'] for x in rr)==h and sum(x['n'] for x in rr)==n
print('PASS: 17 rounds / 161 predictions / 136 scores + 1 abandoned; all market results reconcile; original and revised ranks isolated; research season sums match; every source hash and layer verified.')

assert [calc("BUNDESLIGA",8,m,r)[0] for m in ["1x2","ou25","parity"] for r in [1,2,3]]==[0,1,0,1,1,0,0,1,1]
assert next(r for r in d["rounds"] if r["id"]==rid("BUNDESLIGA",8))["coverage"]=="recovered"
