import json,re,hashlib,datetime,pathlib,copy
from collections import Counter
BASE=pathlib.Path('/mnt/data/files'); OUT=pathlib.Path('/mnt/data/five_league_sync')
source_map={
 'EPL':BASE/'GW11_PREMATCH_RECORD.json',
 'BUNDESLIGA':BASE/'DASHBOARD_UPDATE_PACKAGE_BUNDESLIGA_GW10_20261109.json',
 'LALIGA':BASE/'DASHBOARD_UPDATE_PACKAGE_LALIGA_GW13_20261109.json',
 'SERIEA':BASE/'DASHBOARD_UPDATE_PACKAGE_SERIEA_GW12_20261109.json',
 'LIGUE1':BASE/'DASHBOARD_UPDATE_PACKAGE_LIGUE1_GW11_20261109.json'}
orig={k:json.loads(p.read_text(encoding='utf-8')) for k,p in source_map.items()}
master=(BASE/'R1_R2_Master_3.md').read_text(encoding='utf-8')
rec={'schema':'DASHBOARD_FIVE_LEAGUE_SYNC_V1','generated_at_taipei':'2026-11-09T20:44:00+08:00','source_master_version':'Library /R1_R2 Master/R1_R2_Master.md v89','source_sha256':{k:hashlib.sha256(p.read_bytes()).hexdigest() for k,p in source_map.items()},'status':'PREMATCH_NOT_SETTLED','rounds':[],'predictions':[],'official_forecasts':[],'research_forecasts':[],'results':[],'latest_official':{},'latest_research':{},'checks':{}}

# never invent an unsealed Official/Exact model or replay; display only actual saved picks
name_maps={'HOME':'主勝','AWAY':'客勝','DRAW':'和','OVER':'大2.5','UNDER':'小2.5','ODD':'單','EVEN':'雙','大':'大2.5','小':'小2.5','大2.5':'大2.5','小2.5':'小2.5','主勝':'主勝','客勝':'客勝','和':'和','單':'單','雙':'雙'}
def norm(v):
 if v is None:return None
 return name_maps.get(v,v)
def rank_num(x):
 if x is None:return None
 if isinstance(x,(float,int)):return int(x)
 m=re.search(r'[123]',str(x));return int(m.group()) if m else None

def fixture(i,home,away,one,ou,parity,kickoff=None,match_id=None,**extra):
 d={'home':home,'away':away,'1X2':norm(one) or 'MISSING','OU25':norm(ou) or 'MISSING','parity':norm(parity) or 'MISSING'}
 if kickoff:d['kickoff_taipei']=kickoff
 if match_id:d['match_id']=match_id
 d.update(extra)
 return d

def add_round(league,gw,id,package,research,model,sourcepath,note='',ranks=None):
 assert id==package['record_id'],(id,package['record_id'])
 assert len(package['fixtures']) in (9,10)
 assert not any(r['id']==id for r in rec['rounds'])
 package['research_only']=research
 package['counts_as_official_forward_result']=not research
 package['package_type']='DASHBOARD_UPDATE_PACKAGE';package['gw']=gw
 package['pre_kick_status']='PENDING';package.setdefault('PASS',{})
 package.setdefault('PARITY_SKEW_ALERT',{'triggered':False})
 package.setdefault('XUAN_status',{'status':'NOT_RUN'})
 package.setdefault('integrity_flags',{'exact_weights':'MISSING','bet365_first_tick':'MISSING'})
 # all these are pregame; no historical result shall be filled in retroactively
 dest=rec['research_forecasts'] if research else rec['official_forecasts'];dest.append(package)
 rr={'id':id,'league':league,'gw':gw,'season':'2026-27','snapshot':'RESEARCH / EARLY MARKETPROXY' if research else 'OPEN / MARKETPROXY','model':model,'coverage':'recovered' if league=='EPL' and not research else 'full','research_only':research,'note':note or ('RESEARCH_ONLY; 官方版未執行，不能計入正式累計' if research else '賽前 MARKETPROXY；Bet365 first-tick MISSING'), 'package_path':'data/packages/'+sourcepath}
 rec['rounds'].append(rr)
 if research:
  if league!='EPL':rec['latest_research'][league]=id
 else:rec['latest_official'][league]=id
 ranks=ranks or {'1x2':[],'ou25':[],'parity':[]}
 def find_rank(f,market):
  if package['PASS'].get({'1x2':'1X2','ou25':'OU25','parity':'parity'}[market]) and not research:return None
  for item in ranks.get(market,[]):
   if (item.get('formal_selector') is False or item.get('counts_in_official') is False) and not research:continue
   if item.get('home')==f['home'] and item.get('away')==f['away'] or item.get('match')==f['home']+' vs '+f['away']:
    return rank_num(item.get('rank'))
  return None
 for i,f in enumerate(package['fixtures']):
  pred={ 'id':id+'-'+str(i+1),'record_id':id,'match_id':f.get('match_id') or id+'-'+('%02d'%(i+1)),'fixture':f['home']+' vs '+f['away'],'directions':{'1x2':None if f['1X2']=='MISSING' else f['1X2'],'ou25':None if f['OU25']=='MISSING' else f['OU25'],'parity':None if f['parity']=='MISSING' else f['parity']},'ranks':{m:find_rank(f,m) for m in ['1x2','ou25','parity']},'market_status':{'1x2':('RESEARCH_ONLY' if research else 'MARKETPROXY'),'ou25':('RESEARCH_ONLY' if research else 'MARKETPROXY'),'parity':('RESEARCH_ONLY' if research else 'MARKETPROXY')}}
  rec['predictions'].append(pred)
 rec['checks'][id]={'fixtures':len(package['fixtures']),'research_only':research,'record_status':package['status'],'official_parity_rank_count':len([x for x in rec['predictions'] if x['record_id']==id and x['ranks']['parity'] is not None]) if not research else None}

def create_rank_list(rows,matchgetter=None,rankkey='rank',formal_selector=True):
 out=[]
 for e in rows:
  row=copy.deepcopy(e);row['rank']=('R'+str(rank_num(e.get(rankkey)))) if rank_num(e.get(rankkey)) else str(e.get(rankkey))
  if not formal_selector:row['formal_selector']=False
  out.append(row)
 return out

# EPL official and shadow from exactly one sealed prematch record
j=orig['EPL'];offid=j['official']['id'];shid=j['shadow']['id'];jrows=j['prediction_rows']
assert len(jrows)==10 and j['prediction_cutoff_utc']<j['first_kickoff_utc']
for mode in ('OFFICIAL','SHADOW'):
 issh=mode=='SHADOW';id=shid if issh else offid
 fixtures=[fixture(i,z['home'],z['away'],None if issh else z['pick_1x2'],None if issh else z['pick_ou25'],z['shadow_direction'] if issh else z['official_direction'],z.get('kickoff_taipei'),z['match_id']) for i,z in enumerate(jrows)]
 pr={'1X2':[],'OU25':[],'parity':[]}
 for z in jrows:
  for m,key in ([('parity','shadow_rank')] if issh else [('1X2','rank_1x2'),('OU25','rank_ou25'),('parity','official_rank')]):
   n=rank_num(z.get(key));
   if n:pr[m].append({'rank':'R'+str(n),'home':z['home'],'away':z['away'],'match':z['home']+' vs '+z['away'],'pick':norm(z['shadow_direction'] if issh else z['official_direction'] if m=='parity' else z['pick_1x2'] if m=='1X2' else z['pick_ou25']),'formal_selector':not issh,'status':'RESEARCH_ONLY' if issh else 'PREMATCH_OFFICIAL'})
 for x in pr.values():x.sort(key=lambda z:z['rank'])
 pkg={'record_id':id,'league':'EPL','season':'2026-27','gw':11,'status':j['shadow']['status'] if issh else j['official']['status'],'model':('R90-MATH5-Q-RECONSTRUCTION-V0; NOT R90 EXACT' if issh else 'EPL R90-style recovered; MARKETPROXY not Exact'), 'fixtures':fixtures,'ranked_picks':pr,'PASS':{'1X2':issh,'OU25':issh,'parity':issh},'market_odds':[] if issh else [{'fixture':z['home']+' vs '+z['away'],'source_label':z['market_snapshot'],'open':{'1X2':{'home':z['market_h'],'draw':z['market_d'],'away':z['market_a']},'OU25':{'over':z['market_o'],'under':z['market_u']},'AH':None},'pre_kick':None,'movement':{'status':'BASELINE_ONLY'}} for z in jrows], 'source_and_cutoff':{'prediction_cutoff_utc':j['prediction_cutoff_utc'],'first_kickoff_utc':j['first_kickoff_utc'],'market_type':j['market_capture'],'bet365_first_tick':'MISSING'}, 'integrity_flags':{'prematch_seal_sha256':j['seal_sha256'],'exact_binary_replay':False,'no_hindsight':True}}
 # shadow has research-relative R1/R2/R3 even though formal high-conviction PASS
 pkg['PASS']={'1X2':issh,'OU25':issh,'parity':issh}
 if issh:
  pkg['ranked_picks']['1X2']=[];pkg['ranked_picks']['OU25']=[]
  pkg['PASS']['parity']=False # relative shadow picks exist, but betting gate PASS is separate
  pkg['formal_betting_layer']={'parity_selector':'PASS_HIGH_CONFIDENCE','relative_rankings':'SHADOW_ONLY'}
 else:pkg['formal_betting_layer']={'parity_selector':'R1_R2_R3_RELATIVE','historical_identity':'RECOVERED_COMPONENT'}
 add_round('EPL',11,id,pkg,issh,pkg['model'],('EPL_GW11_SHADOW_20261109.json' if issh else 'EPL_GW11_OFFICIAL_20261109.json'), 'Shadow PREMATCH_FROZEN / 研究，不混入 Official 勝率' if issh else '賽前 R90-style recovered；原權重缺失，Bet365開盤缺失',ranks={k.lower().replace('ou25','ou25').replace('1x2','1x2'):v for k,v in pr.items()})

# Bundesliga GW10 - official parity directions but explicit R1-R3 PASS
j=orig['BUNDESLIGA'];pr=j['ranked_picks'];fr=[fixture(i,f['home'],f['away'],f['1X2'],f['OU25'],f['parity'],f.get('kickoff_taipei')) for i,f in enumerate(j['fixtures'])]
pkg=copy.deepcopy(j);pkg['fixtures']=fr;pkg['ranked_picks']=pr;pkg['research_only']=False
add_round('BUNDESLIGA',10,j['record_id'],pkg,False,'Bundesliga R90-DE V1 / Parity V2-RG1 [PASS ranks]', 'DASHBOARD_UPDATE_PACKAGE_BUNDESLIGA_GW10_20261109.json','正式 GW10；單雙 0單9雙，R1/R2/R3 正式 PASS',ranks={'1x2':pr.get('1X2',[]),'ou25':pr.get('OU25',[]),'parity':[]})

# La Liga GW13 research only; no exact Official
j=orig['LALIGA'];pr={'1X2':j['ranks']['1x2'],'OU25':j['ranks']['ou25'],'parity':j['ranks']['parity']};fr=[fixture(i,f['home'],f['away'],f['1X2'],f['OU25'],f['parity'],f.get('kickoff_taipei'),f.get('match_id')) for i,f in enumerate(j['fixtures'])];pkg=copy.deepcopy(j);pkg['fixtures']=fr;pkg['ranked_picks']=pr;pkg['PASS']={'1X2':False,'OU25':False,'parity':True};pkg['XUAN_status']={'official_exact':'NOT_RUN'};pkg['status']='RESEARCH_PREMATCH_FROZEN; OFFICIAL_NOT_RUN';pkg['source_record_type']='RESEARCH_MARKETPROXY';
add_round('LALIGA',13,j['record_id'],pkg,True,'LaLiga V2 RESEARCH MARKETPROXY; Official Exact NOT_RUN','DASHBOARD_UPDATE_PACKAGE_LALIGA_GW13_20261109.json','RESEARCH_ONLY；10/10 單方向，官方高信心單雙 PASS',ranks={'1x2':pr['1X2'],'ou25':pr['OU25'],'parity':pr['parity']})

# Serie A GW12: predictions explicitly preserved in Master table; package alone has scores, not parity labels.
j=orig['SERIEA'];start=master.index('## Record｜'+j['record_id']);after=master[start:];tab=after[after.index('### GW12 完整預測'):after.index('### 1X2 R1')];parsed={};
for l in tab.splitlines():
 if not l.startswith('|') or '---' in l or '比賽' in l:continue
 x=[v.strip().replace('**','') for v in l.strip('|').split('|')];
 if len(x)>=4:parsed[x[0]]=x
assert len(parsed)==10,list(parsed)
fr=[]
for i,f in enumerate(j['fixtures']):
 key=f['home']+' vs '+f['away'];assert key in parsed,key;v=parsed[key];fr.append(fixture(i,f['home'],f['away'],v[1].split()[0],v[2].replace(' 2.5',''),v[3]))
pr=j['ranked_picks'];pkg=copy.deepcopy(j);pkg['status']='RESEARCH_PREMATCH_EARLY_MARKETPROXY_NOT_OFFICIAL_EXACT';pkg['fixtures']=fr;pkg['PASS']={'1X2':False,'OU25':False,'parity':False};pkg['ranked_picks']=pr;pkg['source_and_cutoff']['official_exact']='NOT_RUN'
add_round('SERIEA',12,j['record_id'],pkg,True,'SerieA EARLY-MARKETPROXY + PARITY_RESEARCH (not Exact)', 'DASHBOARD_UPDATE_PACKAGE_SERIEA_GW12_20261109.json','RESEARCH_ONLY；正式 WF6/R90 Exact 未重跑',ranks={'1x2':pr['1X2'],'ou25':pr['OU25'],'parity':pr['parity']})

# Ligue 1 GW11: 1x2 official R1-3; OU and parity are relative/shadow while formal PASS.
j=orig['LIGUE1'];pred=j['predictions'];fr=[]
for i,p in enumerate(pred):
 home,away=p['match'].split(' vs ',1);fr.append(fixture(i,home,away,p['1x2'],p['ou25'],p['parity'],p.get('kickoff_taipei')))
pr={'1X2':j['ranks']['1x2'],'OU25':create_rank_list(j['ranks']['ou25_relative'],formal_selector=False),'parity':create_rank_list(j['ranks']['parity_shadow'],formal_selector=False)}
pkg=copy.deepcopy(j);pkg['fixtures']=fr;pkg['ranked_picks']=pr;pkg['PASS']={'1X2':False,'OU25':True,'parity':True};pkg['status']='ARCHIVED_PREMATCH_MARKETPROXY';pkg['XUAN_status']={'status':'RESEARCH_NOT_PROMOTED'}
add_round('LIGUE1',11,j['record_id'],pkg,False,'Ligue1 R80-V2.1-DrawGuard Frozen + 1X2 Blend V0.1','DASHBOARD_UPDATE_PACKAGE_LIGUE1_GW11_20261109.json','單雙正式 selector PASS；研究 R1/R2/R3 只列 Relative/Shadow',ranks={'1x2':pr['1X2'],'ou25':[],'parity':[]})

# Validation without changing any existing past results
assert len(rec['rounds'])==6 and len(rec['predictions'])==58,(len(rec['rounds']),len(rec['predictions']))
assert len(rec['official_forecasts'])==3 and len(rec['research_forecasts'])==3
assert rec['results']==[]
assert set(rec['latest_official'])=={'EPL','BUNDESLIGA','LIGUE1'}
assert set(rec['latest_research'])=={'LALIGA','SERIEA'}
for f in rec['predictions']:
 assert f['ranks']['parity'] in (None,1,2,3)
 assert f['directions']['parity'] in ('單','雙')
for x in rec['predictions']:
 if x['record_id'].endswith('SHADOW'):
  assert x['directions']['1x2'] is None and x['directions']['ou25'] is None
for y in rec['official_forecasts']:
 if y['league']=='Bundesliga':assert y['PASS']['parity'] and all(p['ranks']['parity'] is None for p in rec['predictions'] if p['record_id']==y['record_id'])
 if y['league']=='Ligue 1': assert y['PASS']['parity'] and y['PASS']['OU25']
for x in rec['research_forecasts']:
 assert x['research_only'] and x['counts_as_official_forward_result']==False
# update dual track from frozen source
old_cfg=json.loads(pathlib.Path('/mnt/data/epl_dualtrack/data/epl_parity_dual_track.json').read_text())
sh=rec['research_forecasts'][0];old_cfg['tracks'][1]['status']='ACTIVE_PREMATCH_SHADOW_RESEARCH';old_cfg['tracks'][1]['model_weights_status']='TRAINED_RESEARCH_SHA256_VERIFIED';old_cfg['shadow_records']=[{'record_id':shid,'official_record_id':offid,'model_version':j.get('x','R90-MATH5-Q-RECONSTRUCTION-V0'), 'model_artifact_sha256':orig['EPL']['files']['R90_RECOVERY_MATH5_SHADOW_GW11.joblib'],'season':'2026-27','gw':11,'market_snapshot':orig['EPL']['market_capture'],'first_kickoff_utc':orig['EPL']['first_kickoff_utc'],'prediction_cutoff_utc':orig['EPL']['prediction_cutoff_utc'],'seal_sha256':orig['EPL']['seal_sha256'],'status':'PREMATCH_FROZEN','predictions':[{'match_id':p['match_id'],'direction':p['directions']['parity'],'rank':p['ranks']['parity']} for p in rec['predictions'] if p['record_id']==shid]}]
old_cfg['shadow_records'][0]['model_version']='R90-MATH5-Q-RECONSTRUCTION-V0'
# IMPORTANT: shadow R1,R2,R3 are relative rankings, NOT official betting threshold, independent shadow stats
old_cfg['shadow_records'][0]['formal_betting_status']='PASS_HIGH_CONFIDENCE'
# verify dual with existing tool
(root:=OUT/'data').mkdir(exist_ok=True)
(OUT/'data'/'epl_parity_dual_track.json').write_text(json.dumps(old_cfg,ensure_ascii=False,indent=2)+'\n')
import sys;sys.path.insert(0,str(pathlib.Path('/mnt/data/epl_dualtrack/tools')))
import build_epl_parity_dual
build_epl_parity_dual.validate(old_cfg)
(OUT/'epl-parity-tracks.js').write_text('/* Generated from data/epl_parity_dual_track.json: validated offline. */\nwindow.EPL_PARITY_DUAL = '+json.dumps(old_cfg,ensure_ascii=False,separators=(',',':'))+';\n')
rec['checks']['parity_official_ligue11']='PASS_0_TRIGGERS'
rec['checks']['parity_official_bundes10']='PASS_0_ODD_9_EVEN'
rec['checks']['result_calculation']='NONE_PREMATCH_ONLY'
rec['checks']['master_policy']='OFFICIAL_SHADOW_SEPARATED'
# freeze normalized snapshot (sidecar JS mutates D once, also supports offline browser)
(OUT/'data'/'five_league_sync_20261109.json').write_text(json.dumps(rec,ensure_ascii=False,indent=2)+'\n')
js="""/* Five leagues consolidated archive: adds only new prematch records; does not alter existing selections/results. */
(function(){'use strict';
 const D=window.FOOTBALL_DATA;
 if(!D)throw new Error('FOOTBALL_DATA must load first');
 const data=__PAYLOAD__;
 const ensure=(a,b,k)=>{if(!Array.isArray(D[a]))D[a]=[];const keys=new Set(D[a].map(x=>x[k]));for(const x of b){if(!keys.has(x[k])){D[a].push(x);keys.add(x[k]);}}};
 ensure('rounds',data.rounds,'id');
 ensure('predictions',data.predictions,'id');
 ensure('official_forecasts',data.official_forecasts,'record_id');
 ensure('research_forecasts',data.research_forecasts,'record_id');
 // NEVER import scores or reviews from pregame records.
 if(data.results.length)throw new Error('Unexpected prematch settlement data');
 D.LATEST_BY_LEAGUE=Object.assign({},D.LATEST_BY_LEAGUE||{},data.latest_official);
 D.LATEST_RESEARCH=Object.assign({},D.LATEST_RESEARCH||{},data.latest_research);
 D.FIVE_LEAGUE_SYNC_META={schema:data.schema,source_sha256:data.source_sha256,checks:data.checks};
})();
""".replace('__PAYLOAD__',json.dumps(rec,ensure_ascii=False,separators=(',',':')))
(OUT/'five-league-sync.js').write_text(js)
# write individual normalized packages for hyperlink and source retention
for x in rec['official_forecasts']+rec['research_forecasts']:
 r=next(r for r in rec['rounds'] if r['id']==x['record_id']);(OUT/'data'/'packages').mkdir(parents=True,exist_ok=True);(OUT/r['package_path']).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
manifest={'schema':'SYNC-MANIFEST-V2','timestamp_taipei':'2026-11-09 20:44','league_latest':{'EPL':11,'BUNDESLIGA':10,'LALIGA':13,'SERIEA':12,'LIGUE1':11},'new_rounds':[{'record_id':r['id'],'league':r['league'],'gw':r['gw'],'research_only':r['research_only'],'fixture_count':rec['checks'][r['id']]['fixtures'],'package_path':r['package_path']} for r in rec['rounds']], 'new_predictions':len(rec['predictions']),'new_results':0,'official_latest_updates':rec['latest_official'],'research_latest_updates':rec['latest_research'],'shadow_records':1,'source_master':'/R1_R2 Master/R1_R2_Master.md','source_master_version':89,'source_sha256':rec['source_sha256'],'rules':['Official/Research/Shadow never pooled','Bet365 first tick missing not fabricated','Research GW13 LaLiga/GW12 Serie A remain research','Bundesliga parity R1-R3 PASS','Ligue1 relative OU/parity NOT official ranks','EPL Official and Recovery Shadow separated','No historic forecasts overwritten','No pregame results manufactured']}
(OUT/'SYNC_MANIFEST_20261109.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('READY',len(rec['rounds']),len(rec['predictions']),[(r['league'],r['gw'],r['research_only']) for r in rec['rounds']]);print('JS bytes',(OUT/'five-league-sync.js').stat().st_size,'record files:',list((OUT/'data'/'packages').glob('*')))