"""One-time v56 import: adds four leagues without changing v1 imported entries."""
from pathlib import Path
import json,re,hashlib,copy
P=Path(__file__).resolve().parents[1]
d=json.loads((P/'data/dashboard.json').read_text())
if d.get('release')=='2.0':raise SystemExit('Already imported; refusing to overwrite.')
original=copy.deepcopy(d)
raw=(P/'source/R1_R2_Master_v56.md').read_text();lines=raw.splitlines()
def clean(x):return x.replace('**','').replace('`','').strip()
def ref(a,b):return {'file':'source/R1_R2_Master_v56.md','start_line':a,'end_line':b,'version':56}
def text(a,b):return '\n'.join(lines[a-1:b])
def table(a,b):return [[clean(c) for c in l.strip().strip('|').split('|')] for l in lines[a-1:b] if l.startswith('|') and not re.match(r'^\|[-: |]+\|$',l)][1:]
def norm(x,m):
 if m=='1x2':return '主勝' if '主勝' in x else '客勝' if '客勝' in x else '和'
 return x[0]
def record(a):return lines[a-1].split('｜')[1]
def addround(a,b,gw,model,snapshot,note,cols,ta,tb,ranks={},models=None):
 rid=record(a);league=rid.split('-')[0];rows=table(ta,tb)
 r={'id':rid,'league':league,'season':'2026-27','gw':gw,'model':model,'market_models':models or {m:model for m in cols},'snapshot':snapshot,'source':ref(a,b),'coverage':'available-source','note':note,'expected_matches':len(rows),'recorded_at':re.search(r'20\d{6}',rid)[0]}
 d['rounds'].append(r)
 for i,c in enumerate(rows):
  rank={m:None for m in cols}
  for m,j in cols.items():
   k=re.search(r'R([123])',c[j]);rank[m]=int(k[1]) if k else None
  for m,assign in ranks.items():rank[m]=assign.get(i)
  p={'id':rid+'-'+str(i+1),'record_id':rid,'match_id':f'{league}-2026-27-GW{gw:02}-{i+1:02}','fixture':c[0],'directions':{m:norm(c[j],m) for m,j in cols.items()},'ranks':rank,'source':ref(ta,tb),'source_cells':c}
  d['predictions'].append(p)
 return rid

def preds(rid):return [p for p in d['predictions'] if p['record_id']==rid]
def scores(rid,values,a,b):
 for i,v in enumerate(values):
  if v is None:continue
  p=preds(rid)[i];item={'id':rid+'-RESULT-'+str(i+1),'record_id':rid,'match_id':p['match_id'],'source':ref(a,b)}
  if isinstance(v,str):item.update(score=None,status=v)
  else:item.update(score=v,status='FINAL')
  d['results'].append(item)
def result_table(rid,a,b,col):scores(rid,[list(map(int,c[col].split('-'))) if re.fullmatch(r'\d+-\d+',c[col]) else 'ABANDONED' for c in table(a,b)],a,b)
def review(rid,a,b,title='賽後檢討／修正紀錄',typ='REVIEW'):
 d['reviews'].append({'id':rid+'-'+typ+'-'+str(a),'record_id':rid,'text':text(a,b),'title':title,'type':typ,'source':ref(a,b),'model_changes_status':'只追加；不回寫原始預測'})
def report(rid,values,a,b,scope='來源結算摘要'):
 r=next(r for r in d['rounds'] if r['id']==rid)
 for m,(h,n) in values.items():d['market_reports'].append({'league':r['league'],'season':r['season'],'gw':r['gw'],'record_id':rid,'market':m,'hits':h,'n':n,'scope':scope,'source':ref(a,b)})
def total(league,market,scope,h,n,ranks,a,b,note=''):
 d['historical_totals'].append({'league':league,'market':market,'scope':scope,'hits':h,'n':n,'ranks':ranks,'source':ref(a,b),'note':note})
d['release']='2.0';d['schema_version']='2.0.0';d['market_reports']=[];d['historical_totals']=[];d['reported_predictions']=[];d['audit_notes']=[]
d['sources']=[dict(d['source'],file='source/R1_R2_Master.md'),{'name':'R1_R2_Master.md','file':'source/R1_R2_Master_v56.md','library_file_id':d['source']['library_file_id'],'version':56,'sha256':hashlib.sha256((P/'source/R1_R2_Master_v56.md').read_bytes()).hexdigest()}]
d['latest_source_version']=56
heads=[i for i,l in enumerate(lines) if l.startswith('## ')]
for k,i in enumerate(heads):
 end=heads[k+1] if k+1<len(heads) else len(lines)
 d['source_sections'].append({'id':f'V56-S{i+1}','title':lines[i][3:],'text':'\n'.join(lines[i:end]),'source':ref(i+1,end)})
# La Liga: only GW8 has a full match table in this Master.
la=addround(45,114,8,'R90-X V3 / S-XOR','2026-10-05 賽前版','只保存單雙；R3為候補，華歷簡奴–畢爾包腰斬排除。Master提到GW10/11/12，但沒有其逐場表，未補造。',{'parity':1},73,85,{'parity':{3:1,7:2}})
result_table(la,91,103,1);review(la,105,112)
# Bundesliga
b5=addround(178,239,5,'西甲德甲版 V1','2026-10-05 最新盤版','9/21初盤只被提及，未提供完整逐場快照。保留此10/05更新版；不偽建9/21版本。',{'parity':1},200,210,{'parity':{3:1,4:2}})
result_table(b5,220,230,1);review(b5,232,237)
b6=addround(381,466,6,'西甲德甲版 V1（近似重建）','2026-10-12 賽前版','逐場原始表只封存單雙。1X2／大小在結算表追述，另存為結算追述，不回填原始預測。R3候補不計。',{'parity':1},410,420,{'parity':{1:1,2:2}})
result_table(b6,435,445,1);review(b6,447,456)
for i,c in enumerate(table(435,445)):
 d['reported_predictions'].append({'id':b6+'-REPORTED-'+str(i+1),'record_id':b6,'match_id':preds(b6)[i]['match_id'],'directions':{'1x2':norm(c[2],'1x2'),'ou25':c[4][0]},'source':ref(435,445),'classification':'RESULT_REPORTED_ONLY'})
report(b6,{'1x2':(5,9),'ou25':(5,9)},447,456)
b7=addround(1044,1156,7,'Bundesliga Parity V2-RG1','OPENPROXY','單雙V2-RG1；1X2／大小是原文另列的V1近似參考，非V2輸出。候補R3不計。缺完整PRE-KICK。',{'parity':1},1085,1095,{'parity':{8:1,5:2}}, {'parity':'V2-RG1','1x2':'V1近似參考','ou25':'V1近似參考'})
for i,c in enumerate(table(1109,1119)):
 p=preds(b7)[i];p['directions'].update({'1x2':norm(c[1],'1x2'),'ou25':c[3][0]});p['ranks'].update({'1x2':{5:1,0:2}.get(i),'ou25':{8:1,5:2}.get(i)});p['market_sources']={'1x2':ref(1107,1125),'ou25':ref(1107,1125),'parity':p['source']};p['market_status']={'1x2':'V1近似參考','ou25':'V1近似參考','parity':'正式V2-RG1'}
scores(b7,[[2,3],[1,0],[0,0],[2,3],[1,1],[4,0],[1,0],[3,0],[1,3]],1654,1660);review(b7,1674,1703)
b9=addround(2689,2750,9,'Bundesliga V2-RG1 / MARKETPROXY','MARKETPROXY','尚無賽果。原排序曾觸發SKEW_ALERT；11/05二次審計維持8雙1單，但調整R1/R2/R3，請切換版本查看。',{'1x2':1,'ou25':2,'parity':3},2704,2714,{'1x2':{2:1,4:2,3:3},'ou25':{2:1,4:2,5:3},'parity':{0:1,6:2,7:3}})
review(b9,2751,2760,'原始順位警示','PREMATCH_AUDIT');review(b9,2762,len(lines),'11/05二次審計與排序修正','PREMATCH_AUDIT')
d['updates'].append({'id':'BUNDESLIGA-2026-27-GW09-20261105-SKEW-AUDIT','record_id':b9,'type':'PREMATCH_AUDIT','recorded_at':'2026-11-05','label':'11/05 二次審計版','rank_overrides':{'parity':[preds(b9)[i]['match_id'] for i in [2,0,6]]},'text':text(2762,len(lines)),'source':ref(2762,len(lines)),'status':'方向複核通過；V1 tie-break分數仍缺，沿用原相對排序','selectable':True})
# Italy
s6=addround(295,380,6,'Xuan-Odds V4 / WF6 + Adaptive R90','賽前正式版','1X2與大小僅有結算總數，沒有逐場預測；保留摘要，不回填。',{'parity':1},320,331,{'parity':{8:1,9:2}})
result_table(s6,335,347,2);review(s6,349,371);report(s6,{'1x2':(7,10),'ou25':(4,10)},363,371)
s7=addround(543,627,7,'Xuan-Odds V4 / WF6 + R90 CORR1','CORR1 賽前修正版','僅單雙有正式逐場封存；1X2／大小為NO_PREMATCH_RECORD，禁止補算。',{'parity':1},601,612,{'parity':{9:1,8:2}})
result_table(s7,1169,1180,2);review(s7,1157,1165);review(s7,1182,1220,'賽後盤口升降審計')
s8=addround(746,841,8,'Xuan-Odds V4 / WF6 + Adaptive R90','OPENPROXY','R3另以賽前追加保存。10/23只交換1X2 R2/R3，非T-1h PRE-KICK；原版與更新版獨立可查。',{'1x2':1,'ou25':3,'parity':5},770,781,{'1x2':{5:1,8:2},'ou25':{6:1,5:2},'parity':{0:1,7:2}})
result_table(s8,1758,1769,1);review(s8,1799,1833)
d['updates'].extend([{'id':'SERIEA-GW08-R3-ADDENDUM','record_id':s8,'type':'SELECTION_ADDENDUM','recorded_at':'2026-10-20','rank_additions':[{'match_id':preds(s8)[i]['match_id'],'market':m,'rank':3} for m,i in [('1x2',4),('ou25',2),('parity',2)]],'source':ref(853,863)}, {'id':'SERIEA-2026-27-GW08-20261023-MARKETUPDATE','record_id':s8,'type':'MARKETUPDATE','recorded_at':'2026-10-23T22:50:00+08:00','label':'10/23 MARKETUPDATE版','rank_overrides':{'1x2':[preds(s8)[i]['match_id'] for i in [5,4,8]]},'table':table(1476,1487),'table_headers':['比賽','10/20','10/23','變化','判讀'],'text':text(1465,1525),'source':ref(1465,1525),'selectable':True}])
# France
f6=addround(240,294,6,'R80 V2 DrawGuard','2026-10-06 賽前版','全輪單雙結算摘要7/9，但僅R1/R2有比分；其餘7場不補造。R位為弱訊號相對排序。',{'parity':1},263,273,{'parity':{5:1,4:2}})
scores(f6,[None,None,None,None,[2,2],[3,1],None,None,None],283,292);report(f6,{'parity':(7,9)},283,292)
f7=addround(467,542,7,'R80 V2 DrawGuard','2026-10-12 賽前版','1X2全場與大小其餘7場只見結算追述；大小R1/R2有賽前文字。原始層不倒填；統計摘要另列。',{'parity':1},490,500,{'parity':{0:1,7:2}})
for i,rk in [(1,1),(3,2)]:preds(f7)[i]['directions']['ou25']='大';preds(f7)[i]['ranks']['ou25']=rk;preds(f7)[i]['market_sources']={'ou25':ref(530,534),'parity':preds(f7)[i]['source']}
scores(f7,[[0,3],[1,3],[1,1],[1,3],[2,5],[1,0],[1,3],[4,3],[2,1]],925,937)
for i,c in enumerate(table(941,951)):
 d['reported_predictions'].append({'id':f7+'-REPORTED-'+str(i+1),'record_id':f7,'match_id':preds(f7)[i]['match_id'],'directions':{'1x2':norm(c[1],'1x2'),'ou25':c[4][0]},'source':ref(939,951),'classification':'RESULT_REPORTED_ONLY'})
report(f7,{'1x2':(6,9),'ou25':(8,9)},953,963);review(f7,953,972)
f8=addround(976,1043,8,'R80 V2 DrawGuard','OPENPROXY','無正式1X2 R位與R3封存，不事後補選。大小／單雙R1/R2為相對排序。',{'1x2':3,'ou25':6,'parity':7},992,1002)
result_table(f8,1713,1723,1);review(f8,1725,1740)
f9=addround(1836,1900,9,'R80 V2 DrawGuard / 1X2 Blend V0.1','MARKETPROXY','1X2為未校準challenger；單雙全為弱訊號。11/04審計對未來停用Forced R位作投注依據，歷史結果保留。',{'1x2':2,'ou25':4,'parity':6},1852,1862,models={'1x2':'1X2-Blend V0.1 challenger','ou25':'R80 V2 DrawGuard','parity':'R80 V2 DrawGuard'})
result_table(f9,2524,2534,1);review(f9,2564,2572);review(f9,2575,2656,'法甲單雙後續政策／研究修正','MODEL_POLICY')
# Baseline snapshots, kept as typed documentary evidence, not fresh pre-kick data.
for rid,a,b,title in [(s8,810,823,'OPENPROXY 市場基準'),(f8,990,1033,'初盤代理與MarketMove基準'),(f9,1880,1890,'當前市場快照'),(b6,458,464,'週中歐戰風控')]:
 d['updates'].append({'id':rid+'-BASELINE-'+str(a),'record_id':rid,'type':'BASELINE_CONTEXT','recorded_at':'見原始封存日期','label':title,'text':text(a,b),'source':ref(a,b)})
# Historical rank summaries, distinct from unknown fixtures and model statistics.
for gw,r1,r2 in [(1,1,None),(2,1,1),(3,0,1),(4,1,0)]:
 d['rank_summaries'].append({'league':'BUNDESLIGA','season':'2026-27','gw':gw,'market':'parity','hits':{str(k):v for k,v in [(1,r1),(2,r2)] if v is not None},'sample_each':1,'model':'西甲德甲版 V1','detail_available':False,'source':ref(422,431)})
for league,vals,a,b in [('SERIEA',{'1':1,'2':1},373,375),('LIGUE1',{'1':0,'2':1},502,513)]:
 d['rank_summaries'].append({'league':league,'season':'2026-27','gw':5,'market':'parity','hits':vals,'sample_each':1,'detail_available':False,'source':ref(a,b)})
# Standalone per-round reports provide coverage where a complete match archive is absent.
for m,h in [('1x2',4),('ou25',5),('parity',7)]:d['market_reports'].append({'league':'SERIEA','season':'2026-27','gw':5,'record_id':None,'market':m,'hits':h,'n':10,'scope':'僅Master結算摘要','source':ref(1263,1278)})
d['market_reports'].append({'league':'LIGUE1','season':'2026-27','gw':5,'record_id':None,'market':'parity','hits':6,'n':9,'scope':'僅Master結算摘要','source':ref(2616,2626)})
# Direct published totals are snapshots, never added to calculated rows (no double counting).
for m,h,n,ranks in [('1x2',32,63,{}),('ou25',45,63,{}),('parity',28,63,{})]:total('BUNDESLIGA',m,'GW1–7 全歷代方向',h,n,ranks,1684,1688,'跨V1/V2；原文累計，並非每輪逐場資料皆齊全。')
total('BUNDESLIGA','parity','V1 至GW6',None,None,{'1':[3,6],'2':[2,5]},422,431)
total('BUNDESLIGA','parity','V2-RG1 GW7',3,9,{'1':[0,1],'2':[1,1]},1674,1695)
for m,h,n,ranks in [('1x2',19,30,{'1':[3,3],'2':[2,3],'3':[1,1]}),('ou25',15,30,{'1':[2,3],'2':[1,3],'3':[0,1]}),('parity',26,40,{'1':[3,4],'2':[3,4],'3':[1,1]})]:total('SERIEA',m,'截至GW8；各市場範圍見來源',h,n,ranks,1808,1818,'原文累計；1X2／大小排除無賽前封存的GW7。')
total('LIGUE1','parity','GW5–9',24,45,{'1':[2,5],'2':[3,5],'3':[1,1]},2616,2626,'R3來源為GW9結算；Forced R位歷史保留，不當80%精選。')
total('LIGUE1','ou25','R位截至GW9',None,None,{'1':[4,5],'2':[5,5],'3':[0,1]},2550,2556,'原文累計；GW5/6大小逐場表不完整。')
total('LIGUE1','1x2','GW9 精選起點',None,None,{'1':[1,1],'2':[1,1],'3':[1,1]},2542,2548)
# Model/history notes and data-quality register.
d['audit_notes']=[{'league':'LALIGA','message':'Master只含GW8完整逐場表；GW10/11/12僅被政策段落提及，未創建虛構輪次。','source':ref(2681,2683)}, {'league':'BUNDESLIGA','message':'GW8無逐場Record；GW9二次審計另存，原始排名不覆寫。','source':ref(2762,len(lines))}, {'league':'LIGUE1','message':'GW6全輪7/9僅有結算摘要，逐筆可算為1/2；兩者分開顯示。','source':ref(283,292)}, {'league':'SERIEA','message':'GW8更新版只換1X2 R2/R3，三場均命中；不重複累計、不事後擇優。','source':ref(1777,1784)}]
for l in d['leagues']:l['coverage']='normalized-available'
# Research scope on v1 entries is EPL. Keep original dictionaries unchanged; UI supplies default EPL.
for c in table(2386,2399):
 lid={'Bundesliga':'BUNDESLIGA','LaLiga':'LALIGA','SerieA':'SERIEA','Ligue1':'LIGUE1'}[c[0]]
 for model,col in [('BASE',2),('XUAN_PROXY',3),('OLD / LEAGUE-NATIVE',5)]:
  h,n=map(int,re.search(r'(\d+)/(\d+)',c[col]).groups())
  d['research'].append({'league':lid,'model':model,'season':c[1],'hits':h,'n':n,'scope':'Common Proxy時間前推；非Exact，來源摘要非本次重跑','source':ref(2385,2401)})
for c in table(2440,2446):
 lid={'Bundesliga':'BUNDESLIGA','LaLiga':'LALIGA','SerieA':'SERIEA','Ligue1':'LIGUE1'}[c[0]]
 for model,col in [('XUAN-CONFIRM Proxy',1),('XUAN-AGAINST Proxy',2),('PASS shadow Proxy',1)]:
  h,n=map(int,re.search(r'(\d+)/(\d+)',c[col]).groups())
  d['research'].append({'league':lid,'model':model,'season':'2023-24＋2024-25'+('' if lid=='LALIGA' else '＋2025-26'),'hits':h,'n':n,'scope':'只記錄／不自動翻向或PASS；非Exact','source':ref(2439,2456)})
# Prove append-only preservation for all original event objects.
for layer in ['predictions','results','updates','reviews','rank_summaries','research','source_sections','rounds']:
 assert d[layer][:len(original[layer])]==original[layer],layer
layers=['predictions','updates','results','reviews','rank_summaries','research','cross_league','source_sections','market_reports','historical_totals','reported_predictions','audit_notes','rounds']
for name in layers:(P/f'data/{name}.json').write_text(json.dumps(d[name],ensure_ascii=False,indent=2))
(P/'data/dashboard.json').write_text(json.dumps(d,ensure_ascii=False,indent=2))
(P/'data.js').write_text('window.FOOTBALL_DATA = '+json.dumps(d,ensure_ascii=False).replace('</','<\\/')+';\n')
(P/'data/manifest.json').write_text(json.dumps({k:d[k] for k in ['schema_version','release','sources','latest_source_version','rounds','leagues']},ensure_ascii=False,indent=2))
lock={name:[hashlib.sha256(json.dumps(x,ensure_ascii=False,sort_keys=True).encode()).hexdigest() for x in d[name]] for name in layers}
(P/'data/integrity.json').write_text(json.dumps(lock,indent=2))
print('Imported',len(d['rounds']),'rounds',len(d['predictions']),'predictions',len(d['results']),'result entries')
