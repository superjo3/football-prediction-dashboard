#!/usr/bin/env python3
"""Exploratory rare market/form regimes: predeclared train/validation/benchmark chronology.
Does not validate provider-time provenance or make prospective claims.
"""
import pickle, json, math, itertools, hashlib
from pathlib import Path
import numpy as np, pandas as pd
from scipy.stats import binomtest
ROOT=Path(__file__).resolve().parent
D=pickle.load(open(ROOT/'provenance/EPL_Parity_History_FeatureCache_4180.pkl','rb'))
D=D.loc[D.season>=2020].sort_values(['season','round','date','home','away'],kind='stable').reset_index(drop=True)
assert len(D)==2280 and not D['round'].isna().any()
assert np.all(D.label==(D.hg+D.ag)%2)
D['week_key']=D.season.astype(str)+'-'+D['round'].astype(int).astype(str)
D['fav_prob']=D[['p_home','p_away']].max(axis=1)
D['favorite_delta']=(D.p_home-D.p_away).abs()
D['home_goal_form']=D.h_gf5 + D.a_ga5
D['away_goal_form']=D.a_gf5 + D.h_ga5
D['goal_form_sum']=D['home_goal_form']+D['away_goal_form']
D['odd_form_mean']=(D.h_odd5+D.a_odd5)/2
D['odd_form_spread']=abs(D.h_odd5-D.a_odd5)
D['odd_form_sum10']=D.h_odd10+D.a_odd10
D['odd_streak_sum']=D.h_odd_streak + D.a_odd_streak
D['odd_streak_absdiff']=abs(D.h_odd_streak - D.a_odd_streak)
D['rest_diff']=abs(D.h_days_since-D.a_days_since)
D['ou_draw_combo']=D.p_draw / D.p_over25
D['ah_abs']=abs(D.ah_line)
# Fixed candidate feature thresholds and directional inequalities, no target-derived bins.
SPEC={
 'p_draw': [.20,.24,.27,.29,.31,.33],
 'p_over25':[.40,.45,.50,.55,.60,.65],
 'market_lambda':[2.3,2.6,2.9,3.2],
 'fav_prob':[.45,.55,.65,.75],
 'favorite_delta':[.1,.25,.40,.6],
 'ah_abs':[.25,.50,.75,1.,1.5],
 'home_goal_form':[1.5,2.,2.5,3.,3.5],
 'away_goal_form':[1.5,2.,2.5,3.,3.5],
 'goal_form_sum':[4.,4.5,5.,5.5,6.,7.],
 'odd_form_mean':[.3,.4,.5,.6,.7],
 'odd_form_spread':[.10,.2,.3,.4],
 'odd_form_sum10':[.7,.9,1.1,1.3],
 'league_odd_100':[.45,.50,.55],
 'odd_streak_sum':[-4,-2,0,2,4],
 'odd_streak_absdiff':[1,2,3,4],
 'rest_diff':[1,3,5,8]
}
mask=[]
for feat,levels in SPEC.items():
 for level in levels:
  for op in ['<=','>=']:
   mask.append((f'{feat}{op}{level}',feat,op,level))
# Evaluate single and pairwise gate intersections. Limit to distinct features.
ALL={}
for nam,f,op,thr in mask:
 v=D[f].to_numpy();ALL[nam]=np.isfinite(v)&((v<=thr) if op=='<=' else (v>=thr))
N=len(D);seasons=D.season.to_numpy();y=D.label.to_numpy(dtype=np.int8);pdra=D.p_draw.to_numpy();group=D.week_key.to_numpy();
# Test 2020-21 discovery, 2022-23 validation, 2024-25 prior-seen historical benchmark.
parts=[np.flatnonzero(np.isin(seasons,[2020,2021])),np.flatnonzero(np.isin(seasons,[2022,2023])),np.flatnonzero(np.isin(seasons,[2024,2025]))]
# For each matchweek, a qualified R1 is the one with most extreme pre-match draw probability in the specified direction.
# This tie-break was frozen before testing any candidates.
bygroup=[]
for inds in parts:
 groupvals=pd.unique(group[inds]); bygroup.append([inds[group[inds]==g] for g in groupvals])
assert all(len(weeks)==76 for weeks in bygroup)

def evaluate(el,dirn,part):
  pick_idxs=[]
  for inds in bygroup[part]:
   q=inds[el[inds]]
   if q.size:
    order=np.argsort(-pdra[q] if dirn==0 else pdra[q],kind='stable')
    pick_idxs.append(q[order[0]])
  if len(pick_idxs)==0:return 0,0,None,[]
  picks=np.asarray(pick_idxs,dtype=int);h=int((y[picks]==dirn).sum());n=len(picks)
  return h,n,round(h/n,5),picks.tolist()

def wilson(h,n):
 if not n:return [None,None]
 z=1.95996398454;p=h/n;den=1+z*z/n
 return [round((p+z*z/(2*n)-z*np.sqrt(p*(1-p)/n+z*z/(4*n*n)))/den,5),round((p+z*z/(2*n)+z*np.sqrt(p*(1-p)/n+z*z/(4*n*n)))/den,5)]

records=[];tiny=[];candidates=0
# Minimum discovery 18 picks total (9/year on average) avoids 1/1 jackpot.
for x in range(len(mask)):
  n1,f1,_,_=mask[x];m1=ALL[n1]
  for n2,m in [(None,m1)]+[(mask[j][0],m1&ALL[mask[j][0]]) for j in range(x+1,len(mask)) if f1!=mask[j][1]]:
   candidates+=1
   if m[parts[0]].sum()<8:continue
   for direction in [0,1]:
    h,n,r,_=evaluate(m,direction,0)
    if n<8:continue
    if n<18:
     tiny.append({'rule':n1 if n2 is None else n1+' & '+n2,'cond1':n1,'cond2':n2,'dir':direction,'direction':'單' if direction else '雙','disc_h':h,'disc_n':n,'disc_acc':r,'disc_lcb':wilson(h,n)[0]})
     continue
    records.append({'rule':n1 if n2 is None else n1+' & '+n2,'cond1':n1,'cond2':n2,'dir':direction,'direction':'單' if direction else '雙','disc_h':h,'disc_n':n,'disc_acc':r,'disc_lcb':wilson(h,n)[0]})
train=pd.DataFrame(records).sort_values(['disc_lcb','disc_acc','disc_n','rule','dir'],ascending=[False,False,False,True,True],kind='stable')
train['discovery_rank']=np.arange(1,len(train)+1)
# Pick ONE best discovery model deterministically, test it without using validation outcomes in selection.
chosen=train.iloc[0].to_dict()
rulemap={x['rule']:x for x in records}
def mask_for(rule):
  x=rulemap[rule];k=ALL[x['cond1']].copy();return k if x['cond2'] is None else k&ALL[x['cond2']]

def evaluate_rule(x,part):
    h,n,acc,picks=evaluate(mask_for(x['rule']),int(x['dir']),part)
    br=[{'season':int(v),'h':int(sum(y[i]==x['dir'] for i in picks if seasons[i]==v)),'n':sum(seasons[i]==v for i in picks)} for v in sorted(set(seasons[picks]))]
    return {'hit':h,'n':n,'accuracy':acc,'ci95':wilson(h,n),'per_season':br,'pass_rounds':76-n,'picks':[{'season':int(seasons[i]),'round':int(D.iloc[i]['round']),'fixture':str(D.iloc[i].home)+' - '+str(D.iloc[i].away),'pick':x['direction'],'actual':'單' if y[i]==1 else '雙','hit':bool(y[i]==x['dir']),'pre_match_p_draw':round(float(pdra[i]),4)} for i in picks]}
primary={'rule':chosen['rule'],'direction':chosen['direction'],'discovery':evaluate_rule(chosen,0),'validation':evaluate_rule(chosen,1),'previously_seen_benchmark':evaluate_rule(chosen,2)}
# Evaluate all candidate rules on validation WITHOUT choosing winner by outcomes; summarize sparsity and generalization.
# For diagnostic count, identify all conditions that pass 85% in discovery with >=18 selected and validation n>=8.
disc_high=train[(train.disc_acc>=.85)&(train.disc_n>=18)]
allvalidation=[]
for x in train.head(30).to_dict('records'):
 v=evaluate_rule(x,1); allvalidation.append({'rule':x['rule'],'direction':x['direction'],'discovery_rank':int(x['discovery_rank']),'discovery':[x['disc_h'],x['disc_n']],'validation':[v['hit'],v['n']],'validation_rate':v['accuracy'],'validation_ci':v['ci95']})
# Baseline independent of search: Pick double from fixture with highest draw odds each week.
baseline={}
for part,desc in enumerate(['discovery','validation','benchmark']):
 h,n,acc,picks=evaluate(np.ones(N,dtype=bool),0,part)
 baseline[desc]={'hit':h,'n':n,'rate':acc,'ci95':wilson(h,n)}
report={
 'schema':'EPL_R1_SPARSE_85_MARKET_FORM_REGIMES_V3', 'status':'RESEARCH_REPLAY_ONLY_NOT_PROMOTED',
 'research_date_taipei':'2026-11-27','goal':'at most one selected high-confidence R1; whole-round PASS allowed; >85% long-run new pre-match walk-forward accuracy',
 'data':{'n_full_cache':4180,'n_used':len(D),'target_seasons':[2020,2021,2022,2023,2024,2025], 'source_cache':'provenance/EPL_Parity_History_FeatureCache_4180.pkl','source_sha256':hashlib.sha256((ROOT/'provenance/EPL_Parity_History_FeatureCache_4180.pkl').read_bytes()).hexdigest(),'pre_match_fields':list(SPEC)},
 'methods':{'discovery_seasons':[2020,2021],'validation_seasons':[2022,2023],'reused_benchmark_seasons':[2024,2025], 'candidate_gates':int(candidates),'rules_with_at_least_18_discovery_picks':len(train),'directions':'both single/odd and double/even','gate_type':'single or intersection of two different pre-match features; predeclared thresholds','selected_by':'highest Wilson lower bound on discovery only; validation and benchmark never used for rule selection','rank_within_week':'For predicted EVEN choose highest draw probability; for predicted ODD choose lowest draw probability; tie break stable sorted fixture order','qualification':'no eligible match in week -> PASS, max 1 R1 per matchweek','can_certify_85':False},
 'highest_discovery_rate_with_n18':{'rate':float(train.disc_acc.max()),'rule':train.loc[train.disc_acc.idxmax(),'rule'],'n':int(train.loc[train.disc_acc.idxmax(),'disc_n'])},
 'number_discovery_85_rules':len(disc_high),
 'tiny_exploratory_85_not_eligible':None,
 'highest_discovery_rules':train.head(10)[['rule','direction','disc_h','disc_n','disc_acc','disc_lcb']].to_dict('records'),
 'primary_frozen_discovery_rule':primary,
 'top30_research_diagnostics':allvalidation,
 'simple_baseline':baseline,
 'warnings':['2024 and 2025 prior seen in V1/V2, never call these untouched blind holdout','No historical source quote timestamps independently authenticated','Data may have synthetic or stale market proxies, not certified bet365','Any retrospective candidate >85 with tiny n is not proof or acceptance','GW11/GW12 original pregame predictions never changed']
}
# Small-sample apparent 85% rules are kept ONLY as a warning, never promoted.
tiny=pd.DataFrame(tiny)
if not tiny.empty:
 t=tiny[(tiny.disc_acc>=.85)].copy().sort_values(['disc_lcb','disc_acc','disc_n'],ascending=[False,False,False],kind='stable')
 if not t.empty:
  item=t.iloc[0].to_dict()
  rulemap[item['rule']]=item
  report['tiny_exploratory_85_not_eligible']={'count':len(t),'best_rule':item['rule'],'direction':item['direction'],'discovery':evaluate_rule(item,0),'validation':evaluate_rule(item,1),'previously_seen_benchmark':evaluate_rule(item,2),'WARNING':'Never interpret as 85% out-of-sample; optimized across thousands of filters with fewer than 18 discovery picks.'}
  support=[]
  for candidate in t.to_dict('records'):
   rulemap[candidate['rule']]=candidate
   hh,nn,rt,_=evaluate(mask_for(candidate['rule']),int(candidate['dir']),1)
   if nn>=8 and rt>=.85:
    hh2,nn2,rt2,_=evaluate(mask_for(candidate['rule']),int(candidate['dir']),2)
    support.append({'rule':candidate['rule'],'direction':candidate['direction'],'discovery':[int(candidate['disc_h']),int(candidate['disc_n'])],'validation':[hh,nn],'reused_benchmark':[hh2,nn2],'reused_benchmark_rate':rt2})
  report['tiny_exploratory_85_not_eligible']['validation_85_count_min8']=len(support)
  report['tiny_exploratory_85_not_eligible']['validation_85_cases']=support[:12]
  report['tiny_exploratory_85_not_eligible']['all_three_stages_85_count_min8']=sum(row['reused_benchmark'][1]>=8 and row['reused_benchmark_rate']>=.85 for row in support)
(ROOT/'EPL_R1_SPARSE85_MARKET_FORM_REGIMES_V3.json').write_text(json.dumps(report,ensure_ascii=False,indent=2,default=lambda x: x.item() if hasattr(x,"item") else str(x))+'\n')
print('Candidates',candidates,'with min 18 discovered',len(train),'discovery high >=85',len(disc_high),flush=True)
print('Primary',json.dumps({k:v for k,v in primary.items() if k not in ['validation','discovery','previously_seen_benchmark']},ensure_ascii=False),flush=True)
for x in ['discovery','validation','previously_seen_benchmark']: print(x, {k:v for k,v in primary[x].items() if k!='picks'},flush=True)
print('Baseline',baseline,flush=True)
print('Top10:',train.head(10)[['rule','direction','disc_h','disc_n','disc_acc','disc_lcb']].to_string(index=False),flush=True)
print('Top30 validation:',allvalidation[:7],flush=True)
