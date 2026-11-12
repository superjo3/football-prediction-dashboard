#!/usr/bin/env python3
"""EPL two-track V1 deterministic *inference*, consuming only versioned input files.

No fixtures, team names, prices, latest scores, training or dates are embedded in this engine.
Official == 2026-11-09 GW11-authored R90-style MARKETPROXY heuristic, NOT old R90 Exact.
Shadow == frozen R90-MATH5-Q-RECONSTRUCTION-V0 research weights, NOT old R90 Exact.
Requires genuinely pre-kickoff source-timestamped market/standings data for PREMATCH mode.
"""
from __future__ import annotations
import argparse, datetime as dt, hashlib, json, sys
from pathlib import Path
from zoneinfo import ZoneInfo
import numpy as np
import pandas as pd
from scipy.optimize import brentq
import joblib

SCHEMA='EPL-FIXED-INFERENCE-INPUT-V1'
MARKET_FEATURES=['p_home','p_draw','p_away','p_over25','market_lambda']
FEATURES=MARKET_FEATURES+['h_gf10','h_ga10','a_gf10','a_ga10']
SHADOW_NAMES=['l1_math_c010','l1_math_c003','l1_market_c003','hgb_math','extratrees_math']
NUMERIC_RESULT_COLUMNS=['p_home','p_draw','p_away','p_over25','market_lambda','h_gf10','h_ga10','a_gf10','a_ga10',
 'shadow_p_odd','shadow_Q','official_p_odd_proxy','official_rank_score','p_1x2_pick','p_over_blended']

def fail(msg):raise ValueError(msg)
def utcdate(s):
 try:
  x=dt.datetime.fromisoformat(str(s).replace('Z','+00:00'))
  if x.tzinfo is None: fail('Timestamp must be timezone-aware: '+str(s))
  return x.astimezone(dt.timezone.utc)
 except (TypeError,ValueError) as e:fail('Invalid timezone-aware timestamp '+repr(s)+': '+str(e))
def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def canonical(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False).encode('utf8')
def number(v,k,minimum=None):
 if isinstance(v,bool):fail('Boolean not valid numeric '+k)
 try:n=float(v)
 except (TypeError,ValueError):fail('Missing or nonnumeric '+k)
 if not np.isfinite(n) or (minimum is not None and n<minimum):fail('Nonfinite or out of range '+k)
 return n

def validate(doc,priors,mode):
 if doc.get('schema')!=SCHEMA or doc.get('league')!='EPL':fail('Unsupported input schema or league')
 purpose=doc.get('purpose');
 if purpose not in ('ARCHIVE_REPLAY','TEST_ONLY','PREMATCH'):fail('Invalid purpose')
 if mode=='prematch' and purpose!='PREMATCH':fail('PREMATCH run requires purpose PREMATCH')
 if mode=='replay' and purpose!='ARCHIVE_REPLAY':fail('Replay requires purpose ARCHIVE_REPLAY')
 if mode=='test' and purpose!='TEST_ONLY':fail('Test requires purpose TEST_ONLY')
 for field in ('results','final_scores','score','score_home','score_away','outcomes'):
  if field in doc:fail('Postmatch field forbidden: '+field)
 gw=doc.get('gw');season=doc.get('season')
 if isinstance(gw,bool) or not isinstance(gw,int) or gw<1 or gw>38 or not isinstance(season,str) or len(season)!=7 or not season[:4].isdigit():fail('Invalid season or GW')
 if not doc.get('record_id') or not isinstance(doc['record_id'],str):fail('Missing record_id')
 if season!='2026-27':fail('This frozen model baseline is versioned for 2026-27 only; train and seal a new version for other seasons')
 fixtures=doc.get('fixtures');teams=doc.get('team_snapshot',{}).get('teams',{});
 if not isinstance(fixtures,list) or len(fixtures)!=10 or not isinstance(teams,dict):fail('EPL requires ten fixtures and a team snapshot')
 cutoff=utcdate(doc.get('prediction_cutoff_utc'));first=utcdate(doc.get('first_kickoff_utc'));
 if not cutoff<first:fail('Input cutoff must precede the first kickoff')
 if mode=='prematch':
  through=doc.get('team_snapshot',{}).get('through_gw')
  if isinstance(through,bool) or not isinstance(through,int) or not 0<=through<gw:fail('PREMATCH must declare team snapshot through_gw earlier than target GW')
  # Both raw sources must have verifiable provenance and must be captured before the cutoff.
  for k in ('market_snapshot','team_snapshot'):
   source=doc.get(k,{});
   if source.get('capture_time_verified') is not True or not str(source.get('source_url') or '').startswith(('https://','http://')):fail('PREMATCH missing verified '+k+' source/time')
   stamp=utcdate(source.get('captured_at_utc'))
   if stamp>cutoff:fail(k+' captured AFTER prediction cutoff')
 if not doc.get('fixture_source_url'):fail('Missing fixture source provenance')
 seen_id=set();seen_teams=set()
 expected_prefix=f'EPL-{season}-GW{gw:02d}-'
 records=[]
 for fix in fixtures:
  if not isinstance(fix,dict):fail('Non-object fixture')
  for forbidden in ('score','actual','goals_home','goals_away','result','final_score','outcome'):
   if forbidden in fix:fail('Future/score data not allowed: '+forbidden)
  mid=fix.get('match_id');h=fix.get('home');a=fix.get('away');kick=utcdate(fix.get('kickoff_utc'))
  if not isinstance(mid,str) or not mid.startswith(expected_prefix) or mid in seen_id:fail('Invalid or duplicate match_id')
  if h==a or not isinstance(h,str) or not isinstance(a,str) or h not in teams or a not in teams:fail('Missing or duplicate home/away name or team snapshot')
  if not kick>=first:fail('A fixture starts before first_kickoff_utc')
  if h in seen_teams or a in seen_teams:fail('Repeated team across ten-fixture round')
  seen_teams.update((h,a));seen_id.add(mid)
  for team in (h,a):
   if team not in priors['teams']:fail('No frozen historical prior for '+team+'; requires explicitly versioned model update')
   # GW11 frozen policy: <6 last-season observations -> neutral prior 0.5, never fabricate a history.
   if priors['teams'][team]['sample_count']<6 and priors['teams'][team]['rate']!=.5:
    fail('Insufficient prior must use frozen neutral 0.5 for '+team)
   row=teams[team]
   n=number(row.get('played'),team+'.played',1)
   if not n.is_integer():fail('played must be integer')
   if number(row.get('goals_for'),team+'.gf',0)<0 or number(row.get('goals_against'),team+'.ga',0)<0:fail('Invalid goals')
   flag=row.get('last_completed_match_total_odd');
   if flag not in (0,1) or isinstance(flag,bool):fail('Invalid last_completed_match_total_odd '+team)
  odds=fix.get('market_odds',{});mx=odds.get('1X2',{});ou=odds.get('OU25',{});
  for k in ('home','draw','away'):number(mx.get(k),mid+'.1X2.'+k,1.000001)
  for k in ('over','under'):number(ou.get(k),mid+'.OU25.'+k,1.000001)
  seen=records.append((fix,h,a,mx,ou,kick))
 if len(seen_teams)!=20:fail('Each of 20 teams must appear exactly once')
 actual_first=min(rec[5] for rec in records)
 if actual_first!=first:fail('first_kickoff_utc does not match fixture times')
 return sorted(records,key=lambda x:x[0]['match_id'])

def mk_features(doc,priors,rows):
 raw=[]
 for fix,h,a,mx,ou,kick in rows:
  stats=doc['team_snapshot']['teams']
  def gv(t,k):return number(stats[t][k],t+'.'+k)
  def gf(t):return gv(t,'goals_for')/gv(t,'played')
  def ga(t):return gv(t,'goals_against')/gv(t,'played')
  recip=1/np.array([mx['home'],mx['draw'],mx['away']],float);ph,pdraw,pa=recip/recip.sum()
  urecip=1/np.array([ou['over'],ou['under']],float);p_over=float(urecip[0]/urecip.sum())
  lam=brentq(lambda l:1-np.exp(-l)*(1+l+l*l/2)-p_over,0.03,15)
  raw.append({'match_id':fix['match_id'],'home':h,'away':a,'kickoff_utc':fix['kickoff_utc'],
   'kickoff_taipei':kick.astimezone(ZoneInfo('Asia/Taipei')).strftime('%m/%d %H:%M'),
   'market_h':number(mx['home'],'home odds'),'market_d':number(mx['draw'],'draw odds'),
   'market_a':number(mx['away'],'away odds'),'market_o':number(ou['over'],'over odds'),'market_u':number(ou['under'],'under odds'),
   'p_home':ph,'p_draw':pdraw,'p_away':pa,'p_over25':p_over,'market_lambda':lam,
   'h_gf10':gf(h),'h_ga10':ga(h),'a_gf10':gf(a),'a_ga10':ga(a),
   'last_home_odd':stats[h]['last_completed_match_total_odd'],'last_away_odd':stats[a]['last_completed_match_total_odd'],
   'market_snapshot':doc['market_snapshot']['type'],'ah_line':fix.get('market_odds',{}).get('AH',{}).get('line_home') if isinstance(fix.get('market_odds',{}).get('AH'),dict) else None,
   'prior_home':priors['teams'][h]['rate'],'prior_away':priors['teams'][a]['rate']})
 return pd.DataFrame(raw)

def predict(live,artifact):
 fitted=artifact['direction_models']; ps=[]
 for name in SHADOW_NAMES:
  features=MARKET_FEATURES if name=='l1_market_c003' else FEATURES
  ps.append(fitted[name].predict_proba(live[features])[:,1])
 m=np.stack(ps,axis=1);p=np.median(m,axis=1)
 qf=np.column_stack([np.abs(p-.5),1-np.std(m,axis=1),np.mean((m>=.5)==(p[:,None]>=.5),axis=1),
    np.asarray(live.p_draw),np.asarray(live.p_over25),np.asarray(live.h_gf10),np.asarray(live.h_ga10),np.asarray(live.a_gf10),np.asarray(live.a_ga10)])
 q=artifact['Q_correctness_selector'].predict_proba(qf)[:,1]
 live['shadow_p_odd']=p;live['shadow_Q']=q
 live['shadow_direction']=np.where(p>=.5,'單','雙');idx=np.argsort(-q)
 live['shadow_rank']=[next((rank for rank,k in enumerate(idx[:3],1) if k==i),None) for i in range(len(live))]
 p_off=[];scores=[];agree=[]
 for row in live.itertuples():
  lh,la=row.last_home_odd,row.last_away_odd
  prior_h,prior_a=row.prior_home,row.prior_away
  lag=((lh-.5)+(la-.5))/2
  pdiff=((prior_h-.5)+(prior_a-.5))/2
  pc=.5+.20*pdiff+.075*lag+.035*np.tanh((row.h_gf10+row.a_ga10-row.a_gf10-row.h_ga10)/2)
  historic=int(np.sign(prior_h-.5)==np.sign(prior_a-.5) and prior_h!=.5 and prior_a!=.5)
  recent=int(lh==la)
  p_off.append(pc);agree.append(int(historic+recent>=2));scores.append(abs(pc-.5)+.035*historic+.020*recent)
 live['official_p_odd_proxy']=p_off;live['official_direction']=np.where(np.array(p_off)>=.5,'單','雙')
 live['parity_two_signal_agreement']=np.asarray(agree,dtype=float);live['official_rank_score']=scores
 order=live.sort_values(['parity_two_signal_agreement','official_rank_score','match_id'],ascending=[False,False,True]).index[:3]
 live['official_rank']=[next((j for j,k in enumerate(order,1) if k==i),None) for i in range(len(live))]
 live['pick_1x2']=np.array(['主勝','和','客勝'])[np.argmax(live[['p_home','p_draw','p_away']].to_numpy(),axis=1)]
 live['p_1x2_pick']=live[['p_home','p_draw','p_away']].max(axis=1)
 env=(live.h_gf10+live.h_ga10+live.a_gf10+live.a_ga10)/2
 po=1-np.exp(-env)*(1+env+.5*env**2)
 live['p_over_blended']=.5*live.p_over25+.5*po
 live['pick_ou25']=np.where(live.p_over_blended>=.5,'大','小')
 rank1=live.sort_values('p_1x2_pick',ascending=False).index[:3]
 ranko=np.argsort(-np.abs(live.p_over_blended.to_numpy()-.5))[:3]
 live['rank_1x2']=np.asarray([next((j for j,k in enumerate(rank1,1) if k==i),None) for i in range(len(live))],dtype=object)
 live['rank_ou25']=np.asarray([next((j for j,k in enumerate(ranko,1) if k==i),None) for i in range(len(live))],dtype=object)
 return live.drop(columns=['prior_home','prior_away'])

def run(input_path,model_path,prior_path,manifest_path,mode,output_dir):
 src=json.loads(Path(input_path).read_text());priors=json.loads(Path(prior_path).read_text());manifest=json.loads(Path(manifest_path).read_text())
 if manifest['model_sha256']!=sha(model_path):fail('MODEL SHA256 mismatch; refusing changed weights')
 if manifest['prior_sha256']!=sha(prior_path):fail('PRIOR SHA256 mismatch; refusing changed source')
 if manifest['features']!=FEATURES or manifest['shadow_model_names']!=SHADOW_NAMES:fail('Feature/model version mismatch')
 ordered=validate(src,priors,mode)
 model=joblib.load(model_path)  # only load trusted frozen model bundle, never an unknown Internet pickle.
 if sorted(model['direction_models'])!=sorted(SHADOW_NAMES):fail('Unexpected model components')
 live=predict(mk_features(src,priors,ordered),model)
 output_dir=Path(output_dir);output_dir.mkdir(parents=True,exist_ok=True)
 rows=[]
 for row in live.to_dict('records'):
  rows.append({k:(None if pd.isna(v) else (v.item() if isinstance(v,np.generic) else v)) for k,v in row.items()})
 forecast={'schema':'EPL-FIXED-FORECAST-V1','purpose':src['purpose'],'status':'TEST_ONLY' if mode=='test' else 'REPLAY_ONLY' if mode=='replay' else 'PREMATCH_PROVISIONAL_NOT_AUTOMATICALLY_OFFICIAL',
  'record_id':src['record_id'],'season':src['season'],'gw':src['gw'],'prediction_cutoff_utc':src['prediction_cutoff_utc'],
  'input_sha256':sha(input_path),'model_sha256':sha(model_path),'prior_sha256':sha(prior_path),'runner_sha256':sha(Path(__file__)),
  'model_identity':{'official':manifest['official'],'shadow':manifest['shadow']},'warnings':['NOT ORIGINAL R90 EXACT','Shadow Q is not calibrated actual win probability','Market input prices must be sourced and frozen independently','Replaying GW11 is not proof of new-round predictive accuracy'],
  'predictions':[{k:x[k] for k in ('match_id','home','away','kickoff_utc','pick_1x2','rank_1x2','pick_ou25','rank_ou25','official_direction','official_rank','shadow_direction','shadow_rank','official_p_odd_proxy','shadow_p_odd','shadow_Q')} for x in rows]}
 (output_dir/'forecast.json').write_text(json.dumps(forecast,ensure_ascii=False,indent=2,allow_nan=False)+'\n')
 live.to_csv(output_dir/'MODEL_OUTPUTS.csv',index=False)
 digest={p.name:sha(p) for p in sorted(output_dir.glob('*')) if p.is_file()}
 (output_dir/'SHA256SUMS.json').write_text(json.dumps(digest,indent=2)+'\n')
 return forecast

def main():
 p=argparse.ArgumentParser(description=__doc__)
 root=Path(__file__).resolve().parent
 p.add_argument('--input',type=Path,required=True)
 p.add_argument('--mode',choices=('replay','test','prematch'),required=True)
 p.add_argument('--model',type=Path,default=root/'assets/R90_RECOVERY_MATH5_SHADOW_GW11.joblib')
 p.add_argument('--priors',type=Path,default=root/'assets/prior_rates_2025.json')
 p.add_argument('--manifest',type=Path,default=root/'model_manifest.json')
 p.add_argument('--output-dir',type=Path,required=True)
 a=p.parse_args()
 try:
  x=run(a.input,a.model,a.priors,a.manifest,a.mode,a.output_dir)
  print('PASS',x['record_id'],x['status'],len(x['predictions']),'fixtures, official/shadow R1-R3 preserved')
  print('INPUT_SHA256',x['input_sha256'],'MODEL_SHA256',x['model_sha256'])
 except (ValueError,KeyError,TypeError,FileNotFoundError) as e:
  print('BLOCKED:',e,file=sys.stderr);sys.exit(2)
if __name__=='__main__':main()
