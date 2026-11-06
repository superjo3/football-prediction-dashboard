from pathlib import Path
import re,json,hashlib
P=Path(__file__).resolve().parents[1]
if (P/'data/integrity.json').exists(): raise SystemExit('Initial import is locked. Do not rerun over append-only history; use a separate workspace for a new importer.')
s=(P/'source/R1_R2_Master.md').read_text(); lines=s.splitlines()
def clean(x):return x.replace('**','').replace('`','').strip()
def part(a,b):return '\n'.join(lines[a-1:b])
def table(a,b):
 return [[clean(c) for c in l.strip().strip('|').split('|')] for l in lines[a-1:b] if l.startswith('|') and not re.match(r'^\|[-: |]+\|$',l)]
def rows_after(title,start,end):
 text=part(start,end); chunk=text.split(title,1)[1]; chunk=chunk[chunk.index('\n|'):]; chunk=chunk.split('\n\n',1)[0]
 return [[clean(c) for c in l.strip('|').split('|')] for l in chunk.splitlines() if l.startswith('|') and not re.match(r'^\|[-: |]+\|$',l)][1:]
def ref(a,b):return {'file':'source/R1_R2_Master.md','start_line':a,'end_line':b,'version':55}
sections=[]
heads=[i for i,l in enumerate(lines) if l.startswith('## ')]
for k,i in enumerate(heads):
 end=heads[k+1] if k+1<len(heads) else len(lines)
 sections.append({'id':f'S{i+1}','title':lines[i][3:],'text':'\n'.join(lines[i:end]),'source':ref(i+1,end)})
D={'schema_version':'1.0.0','generated_on':'2026-11-05','source':{'name':'R1_R2_Master.md','library_file_id':'libfile_e32fcdc400d481919ed168a5ed3245b5','version':55,'sha256':hashlib.sha256((P/'source/R1_R2_Master.md').read_bytes()).hexdigest()},'leagues':[{'id':a,'name':b,'english':c,'coverage':'normalized' if a=='EPL' else 'source-only'} for a,b,c in [('EPL','英超','Premier League'),('BUNDESLIGA','德甲','Bundesliga'),('LALIGA','西甲','La Liga'),('SERIEA','義甲','Serie A'),('LIGUE1','法甲','Ligue 1')]],'rounds':[],'predictions':[],'updates':[],'results':[],'reviews':[],'rank_summaries':[],'research':[],'cross_league':[],'source_sections':sections}
configs=[(6,115,177,'EPL-2026-27-GW06-20261005','本輪完整單雙方向',[(0,1),(6,2)]),(7,628,745,'EPL-2026-27-GW07-20261014','本輪完整單雙方向',[(3,1),(7,2)]),(8,1283,1396,'EPL-2026-27-GW08-20261020-OPENPROXY','第8輪完整三市場正式方向',[]),(9,1901,1968,'EPL-2026-27-GW09-20261030-MARKETPROXY','第9輪完整三市場正式方向',[])]
for gw,a,b,rid,title,ranks in configs:
 rr={'id':rid,'league':'EPL','season':'2026-27','gw':gw,'model':'EPL R90-style 恢復線（非 OLD R90 Exact）','snapshot':{6:'新盤版',7:'新盤／近期結構版',8:'OPENPROXY',9:'MARKETPROXY'}[gw],'source':ref(a,b),'coverage':'partial-results' if gw==6 else 'complete-available-markets','note':{6:'來源只保存 R1/R2 比分，其餘8場未收錄賽果；1X2／大小未正式封存。',7:'只有單雙為正式預測；R3屬候補，不計正式R3。',8:'R3依賽前補充封存納入；10/23為MID-SNAPSHOT，無完整PRE-KICK。',9:'無完整PRE-KICK數據；檢討為未來研究建議，不回改本輪。'}[gw]}
 D['rounds'].append(rr)
 rows=rows_after(title,a,b)
 for idx,c in enumerate(rows):
  mid=f'EPL-2026-27-GW{gw:02}-{idx+1:02}'; pred={}; rank={}
  if gw<=7:pred={'parity':c[1][0]};rank={'parity':next((r for i,r in ranks if idx==i),None)}
  else:
   inds=[1,3,5] if gw==8 else [1,2,3]
   for market,j in zip(['1x2','ou25','parity'],inds):
    raw=c[j];pred[market]=('主勝' if '主勝' in raw else '客勝' if '客勝' in raw else '和') if market=='1x2' else raw[0]
    m=re.search(r'R([123])',raw);rank[market]=int(m[1]) if m else None
   if gw==8:rank['parity']={0:1,1:2}.get(idx)
  D['predictions'].append({'id':rid+'-'+str(idx+1),'record_id':rid,'match_id':mid,'fixture':c[0],'directions':pred,'ranks':rank,'source':ref(a,b)})
 if gw==6:
  scores={0:[2,1],6:[3,1]};sr=ref(167,175)
 elif gw==7:
  scores={i:list(map(int,c[2].split('-'))) for i,c in enumerate(rows_after('賽後對答案',628,745))};sr=ref(702,713)
 else:
  ra,rb=(1528,1611) if gw==8 else (1969,2045)
  scores={i:list(map(int,c[1 if gw==8 else 7].split('-'))) for i,c in enumerate(rows_after('三市場完整對答案',ra,rb))};sr=ref(ra,rb)
 for i,score in scores.items():D['results'].append({'id':rid+'-RESULT-'+str(i+1),'record_id':rid,'match_id':f'EPL-2026-27-GW{gw:02}-{i+1:02}','score':score,'source':sr})
 if gw in [7,8,9]:
  ra,rb={7:(716,720),8:(1589,1610),9:(2022,2042)}[gw]
  D['reviews'].append({'id':rid+'-REVIEW','record_id':rid,'text':part(ra,rb),'source':ref(ra,rb),'model_changes_status':'research / future only'})
D['updates']=[{'id':'EPL-GW08-R3-ADDENDUM','record_id':configs[2][3],'type':'SELECTION_ADDENDUM','recorded_at':'2026-10-20','rank_additions':[{'match_id':'EPL-2026-27-GW08-05','market':'1x2','rank':3},{'match_id':'EPL-2026-27-GW08-09','market':'ou25','rank':3},{'match_id':'EPL-2026-27-GW08-04','market':'parity','rank':3}],'source':ref(1405,1415)}, {'id':'EPL-GW08-MID-20261023','record_id':configs[2][3],'type':'MID-SNAPSHOT','recorded_at':'2026-10-23T11:00:00+08:00','text':part(1419,1463),'table':rows_after('1X2｜OPENPROXY',1419,1464),'source':ref(1419,1464)}]
# Preserve source-level historical summaries without inventing missing fixtures.
for gw,r1,r2 in [(2,1,1),(3,1,1),(4,1,0),(5,0,0)]:D['rank_summaries'].append({'league':'EPL','season':'2026-27','gw':gw,'market':'parity','hits':{'1':r1,'2':r2},'sample_each':1,'detail_available':False,'source':ref(722,733)})
# Traced historical excerpt; not a newly executed backtest.
def research(model,season,h,n,scope,a,b):D['research'].append({'model':model,'season':season,'hits':h,'n':n,'scope':scope,'source':ref(a,b)})
for model,values in [('BASE',[(29,38),(23,38)]),('XUAN-R1 Exact',[(29,38),(25,38)])]:
 for season,(h,n) in zip(['2024-25','2025-26'],values):research(model,season,h,n,'封存研究摘要；非本次重跑',2172,2190)
research('OLD R90','2023-24',25,38,'倒測 retrospective only',2201,2207)
for model,h,n in [('XUAN-CONFIRM',22,23),('XUAN-AGAINST',7,16),('無有效玄學訊號',23,35),('PASS / 全反對排除',47,60)]:research(model,'2024-25＋2025-26',h,n,'探索性／資料重疊，不是正式前推；分組未涵蓋全部76筆',2194,2200)
for season,h,n in [('2021-22',11,19),('2022-23',12,22),('2023-24',6,10),('2024-25',19,21),('2025-26',13,19)]:research('PASS / 候選A',season,h,n,'探索性高選擇性，非正式升級',2135,2145)
D['cross_league']=[{'league':'EPL','line':'Exact','seasons':'2024-25, 2025-26','base':[52,76],'xuan':[54,76],'changed':11,'rescued':3,'harmed':1,'net':2,'source':ref(2172,2190)}]
for c in rows_after('主結果｜BASE vs XUAN_PROXY R1',2357,2511):
 if c[0].startswith('四'):continue
 frac=lambda x:list(map(int,re.search(r'(\d+)/(\d+)',x).groups()))
 D['cross_league'].append({'league':{'Bundesliga':'BUNDESLIGA','LaLiga':'LALIGA','SerieA':'SERIEA','Ligue1':'LIGUE1'}[c[0]],'line':'XUAN_PROXY','seasons':c[1],'base':frac(c[2]),'xuan':frac(c[3]),'changed':int(c[4]),'rescued':int(c[5]),'harmed':int(c[6]),'net':int(c[9]),'source':ref(2378,2385)})
D['cross_seasons']=rows_after('各賽季前推勝率／regime drift',2357,2511)
for name in ['predictions','updates','results','reviews','rank_summaries','research','cross_league','source_sections']:
 (P/f'data/{name}.json').write_text(json.dumps(D[name],ensure_ascii=False,indent=2))
(P/'data/dashboard.json').write_text(json.dumps(D,ensure_ascii=False,indent=2))
(P/'data.js').write_text('window.FOOTBALL_DATA = '+json.dumps(D,ensure_ascii=False).replace('</','<\\/')+';\n')
(P/'data/manifest.json').write_text(json.dumps({'schema_version':'1.0.0','source':D['source'],'rounds':D['rounds'],'leagues':D['leagues'],'layers':['predictions','updates','results','reviews'],'note':'dashboard.json and data.js are generated projections; separate layer files preserve original imported records.'},ensure_ascii=False,indent=2))
print('Built',len(D['predictions']),'predictions',len(D['results']),'results',len(sections),'source sections')
