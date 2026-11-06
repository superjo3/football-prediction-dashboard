from pathlib import Path
import json,hashlib,copy
P=Path(__file__).resolve().parents[1];d=json.loads((P/'data/dashboard.json').read_text())
assert hashlib.sha256((P/'source/R1_R2_Master.md').read_bytes()).hexdigest()==d['source']['sha256']
ps=copy.deepcopy(d['predictions']);rs={(r['record_id'],r['match_id']):r['score'] for r in d['results']}
assert len(rs)==len(d['results'])==32
assert len(ps)==40
for u in d['updates']:
 for a in u.get('rank_additions',[]):next(p for p in ps if p['match_id']==a['match_id'])['ranks'][a['market']]=a['rank']
def calc(m,gw=None,rank=None):
 h=n=0
 for p in ps:
  if gw and f'GW{gw:02}' not in p['record_id']:continue
  if rank and p['ranks'].get(m)!=rank:continue
  if m not in p['directions'] or (p['record_id'],p['match_id']) not in rs:continue
  a,b=rs[p['record_id'],p['match_id']];v=('主勝' if a>b else '客勝' if a<b else '和') if m=='1x2' else ('大' if a+b>2 else '小') if m=='ou25' else ('單' if (a+b)%2 else '雙')
  n+=1;h+=v==p['directions'][m]
 return h,n
assert [calc(m,8) for m in ['1x2','ou25','parity']]==[(4,10),(3,10),(5,10)]
assert [calc(m,9) for m in ['1x2','ou25','parity']]==[(5,10),(2,10),(4,10)]
assert calc('parity',7)==(6,10)
assert calc('parity',6)==(2,2)
for rank,expected in [(1,(5,8)),(2,(6,8)),(3,(1,2))]:
 h,n=calc('parity',rank=rank)
 for s in d['rank_summaries']:
  if str(rank) in s['hits']:h+=s['hits'][str(rank)];n+=1
 assert (h,n)==expected
assert not any(p['ranks'].get('parity')==3 for p in ps if 'GW06' in p['record_id'] or 'GW07' in p['record_id'])
assert all(r['xuan'][0]-r['base'][0]==r['net']==r['rescued']-r['harmed'] for r in d['cross_league'])
for name in ['predictions','updates','results','reviews','rank_summaries','research','cross_league','source_sections']:
 assert json.loads((P/f'data/{name}.json').read_text())==d[name]
print('PASS: source unchanged; 40 unique predictions / 32 results; GW6–9 and R1/R2/R3 reconciled; research net gains and layer projections consistent.')
