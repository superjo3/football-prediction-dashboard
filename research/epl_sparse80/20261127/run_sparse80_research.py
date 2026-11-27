#!/usr/bin/env python3
"""EPL sparse selector research. 2024-25/2025-26 strictly holdout.
Archived features come from external provenance EPL_Parity_History_FeatureCache_4180.pkl.
Models use only numeric pre-match columns, not team IDs, dates or targets.
Tuning is exclusively 2021-23 walk-forward; 2024-25 evaluated only after freeze.
"""
from __future__ import annotations
import hashlib, json, warnings
from pathlib import Path
from itertools import product
import joblib
import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from scipy.stats import binomtest
warnings.filterwarnings('ignore',category=FutureWarning)
ROOT=Path(__file__).resolve().parent
SRC=ROOT/'provenance/EPL_Parity_History_FeatureCache_4180.pkl'
D=joblib.load(SRC).sort_values(['season','date','home','away']).reset_index(drop=True)
assert len(D)==4180 and D.season.min()==2015 and D.season.max()==2025
assert (D['label']==(D.hg+D.ag)%2).all()
assert not D.duplicated(['season','date','home','away']).any()
assert not D.loc[D.season>=2021,'round'].isna().any()
D['group_id']=D.season.astype(str)+'-'+D['round'].fillna(0).astype(int).astype(str)
# Group IDs are matchweeks, not arbitrary future outcome features.
market=['p_home','p_draw','p_away','p_over25','ah_line','market_lambda']
form=['league_odd_100','league_goals_100','h_gf5','h_ga5','a_gf5','a_ga5','h_odd5','a_odd5','h_odd10','a_odd10','h_home_odd10','a_away_odd10','h_total5','a_total5','h_gf10','h_ga10','a_gf10','a_ga10','h_days_since','a_days_since','h_n_last10','a_n_last10','h_home_gf10','a_away_gf10','h_home_ga10','a_away_ga10','h_odd_streak','a_odd_streak','is_weekend']
used=market+form
assert all(col in D.columns for col in used)
assert all(col not in used for col in ['label','hg','ag','actual','date','season','round'])

# Candidate list FIXED BEFORE seeing holdout results.
def make_model(name):
  if name=='logit_market':return make_pipeline(SimpleImputer(strategy='median',add_indicator=True),StandardScaler(),LogisticRegression(C=.05,max_iter=1000,random_state=19)), market
  if name=='logit_form':return make_pipeline(SimpleImputer(strategy='median',add_indicator=True),StandardScaler(),LogisticRegression(C=.05,max_iter=1000,random_state=19)), form
  if name=='logit_all':return make_pipeline(SimpleImputer(strategy='median',add_indicator=True),StandardScaler(),LogisticRegression(C=.05,max_iter=1000,random_state=19)), used
  if name=='hgb_all':return HistGradientBoostingClassifier(max_iter=100,learning_rate=.04,max_leaf_nodes=7,l2_regularization=10,min_samples_leaf=75,random_state=19),used
  if name=='rf_all':return make_pipeline(SimpleImputer(strategy='median',add_indicator=True),RandomForestClassifier(n_estimators=140,max_depth=5,min_samples_leaf=40,max_features=.7,n_jobs=1,random_state=19)),used
  raise KeyError(name)

models=['logit_market','logit_form','logit_all','hgb_all','rf_all']
all_predict=[]
for target_season in [2021,2022,2023,2024,2025]:
  train=D.loc[D.season<target_season].copy()
  out=D.loc[D.season==target_season].copy()
  print('TRAIN',target_season,'prior years',train.season.min(),train.season.max(),'matches',len(train),'eval',len(out),flush=True)
  pred=out[['season','date','round','home','away','group_id','label','p_draw','p_over25','ah_line','market_lambda','h_odd10','a_odd10','h_odd5','a_odd5','h_n_last10','a_n_last10']].copy()
  for name in models:
    model,cols=make_model(name)
    model.fit(train[cols],train.label)
    pred['p_'+name]=model.predict_proba(out[cols])[:,1]
    if target_season==2023:
      # Archive time-before-test fitted models as a separate reproducible provenance resource.
      joblib.dump(model, ROOT/f'model_asof2023_{name}.joblib')
  all_predict.append(pred)
P=pd.concat(all_predict,ignore_index=True)
predicted_cols=['p_'+m for m in models]
P['p_median']=P[predicted_cols].median(axis=1)
P['p_mean']=P[predicted_cols].mean(axis=1)
P['odd_votes']=(P[predicted_cols]>=.5).sum(axis=1)
P['agree5']=((P.odd_votes==5)|(P.odd_votes==0))
P['agree4']=((P.odd_votes>=4)|(P.odd_votes<=1))
P['direction_median']=(P.p_median>=.5).astype(int)
P['direction_mean']=(P.p_mean>=.5).astype(int)
P['margin_median']=abs(P.p_median-.5)
P['margin_mean']=abs(P.p_mean-.5)
P['margin_market']=abs(P.p_logit_market-.5)
P['margin_form']=abs(P.p_logit_form-.5)
P['margin_hgb']=abs(P.p_hgb_all-.5)
P['margin_rf']=abs(P.p_rf_all-.5)
P['margin_logit_all']=abs(P.p_logit_all-.5)
P['draw_high']=(P.p_draw>=.27)
P['low_over']=(P.p_over25<.50)

# Selector ranks among eligible only; no forced picks when none pass.
# Consensus gates do NOT assert model independence or probability calibration.
thresholds=[0,.01,.02,.03,.04,.05,.06,.07,.08,.10,.125]
candidates=[]
for model in ['logit_market','logit_form','logit_all','hgb_all','rf_all','median','mean']:
 for gate in ['any','agree4','agree5','draw_high','low_over']:
  if model in ['median','mean'] and gate=='agree4': pass
  for t in thresholds:
   candidates.append((model,gate,t))

def selector(p,model,gate,t):
  col='p_'+model if model not in ['median','mean'] else 'p_'+model
  conf=np.abs(p[col].to_numpy()-.5)
  picks=(p[col].to_numpy()>=.5).astype(int)
  eligible=conf>=t-1e-12
  if gate=='agree4':eligible &= p.agree4.to_numpy()
  if gate=='agree5':eligible &= p.agree5.to_numpy()
  if gate=='draw_high':eligible &= p.draw_high.to_numpy()
  if gate=='low_over':eligible &= p.low_over.fillna(False).to_numpy()
  out=[]
  groups=p.group_id.to_numpy()
  # Stable source-order tie break.
  for group in pd.unique(groups):
    idx=np.flatnonzero((groups==group)&eligible)
    if len(idx):
      order=idx[np.argsort(-conf[idx],kind='stable')[:3]]
      for rank,i in enumerate(order,start=1):
        out.append((i,rank,picks[i],bool(picks[i]==int(p.label.iloc[i])),float(conf[i])))
  return out

def wilson(h,n):
 if n==0:return [None,None]
 z=1.959963984540054;p=h/n;den=1+z*z/n
 center=(p+z*z/(2*n))/den;half=z*np.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
 return [round(center-half,4),round(center+half,4)]

def mprint(rows,p,code):
 n=len(rows);h=int(sum(r[3] for r in rows));ranks={}
 for rank in [1,2,3]:
  arr=[r for r in rows if r[1]==rank]
  ranks[str(rank)]={'hit':int(sum(r[3] for r in arr)),'n':len(arr),'rate':round(sum(r[3] for r in arr)/len(arr),4) if arr else None}
 return {'id':code,'h':h,'n':n,'rate':round(h/n,4) if n else None,'ci95':wilson(h,n),'coverage_of_R123_slots':round(n/(p.group_id.nunique()*3),4),'rounds_with_any':len({p.group_id.iloc[r[0]] for r in rows}),'rounds_total':p.group_id.nunique(),'ranks':ranks,'odd':int(sum(r[2] for r in rows)),'even':n-int(sum(r[2] for r in rows))}

v=P[P.season<=2023].reset_index(drop=True)
hold=P[P.season>=2024].reset_index(drop=True)
results=[]
for model,gate,t in candidates:
 rows=selector(v,model,gate,t)
 if not rows:continue
 result=mprint(rows,v,f'{model}__{gate}__{t:.3f}')
 result.update({'model':model,'gate':gate,'threshold':t})
 results.append(result)

# To avoid over-optimizing tiny samples, require >=40 validated selections (of <=342)
# and >=10 different rounds. Primary selection maximizing conservative lower bound
# (accuracy+coverage tradeoff); tuning is all before heldout seasons.
qual=[r for r in results if r['n']>=40 and r['rounds_with_any']>=15]
qual.sort(key=lambda r:(-r['ci95'][0],-r['rate'],-r['n'],r['id']))
selected=qual[0]
selected_tuple=(selected['model'],selected['gate'],selected['threshold'])
test_rows=selector(hold,*selected_tuple)
test_summary=mprint(test_rows,hold,selected['id'])

# Fully pre-specified alternative comparisons, NOT chosen by holdout results:
comparators=[('logit_market','any',0),('logit_form','any',0),('logit_all','any',0),('hgb_all','any',0),('rf_all','any',0),('mean','any',0),('median','any',0),('median','agree5',0),('median','agree4',0),('median','agree5',.03),('median','agree5',.05),('median','agree4',.03),('median','agree4',.05)]
# Compare to always EVEN with same exact candidate coverage by ranking first 3 in fixed order.
base_all=np.mean(hold.label==0)
base_even3=[]
for group,rows in hold.groupby('group_id',sort=False):
 for _,f in rows.head(3).iterrows():base_even3.append(int(f.label)==0)
base_even3={'hits':sum(base_even3),'n':len(base_even3),'rate':sum(base_even3)/len(base_even3)}
comp=[]
for config in comparators:
 rows=selector(hold,*config)
 comp.append(mprint(rows,hold,f'{config[0]}_{config[1]}_{config[2]:.2f}'))

# Validation results distribution, holds for gate stability judgement, no post-test selection.
val_summary={
 'num_candidates':len(results),'eligible_candidates_with_min_sample':len(qual),
 'top_10_pre_holdout':[dict(id=q['id'],h=q['h'],n=q['n'],rate=q['rate'],ci95=q['ci95'],coverage=q['coverage_of_R123_slots']) for q in qual[:10]],
 'validation_best':selected,
 'validation_any80_min40':sum(x['rate']>=.8 for x in qual),
}
# Data integrity and limitations on provenance in future report.
audit={
 'schema':'EPL_PARITY_SPARSE80_RESEARCH_V1',
 'status':'RESEARCH_REPLAY_ONLY_NOT_PREMATCH_FORWARD',
 'data':{'games':len(D),'seasons':list(map(int,sorted(D.season.unique()))),'season_dates':D.groupby('season').agg(first=('date','min'),last=('date','max')).reset_index().to_dict('records'),
   'missing_market_by_year':D.groupby('season')[['p_over25','market_lambda','ah_line']].apply(lambda x:x.isna().sum()).to_dict(),
   'artifact_sha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),
   'outcomes_separated':True,'target_score_features_excluded':True,'feature_provenance_not_independently_recaptured':True},
 'protocol':{'fit_for_2021':'2015-2020','fit_for_2022':'2015-2021','fit_for_2023':'2015-2022',
             'fit_for_2024':'2015-2023','fit_for_2025':'2015-2024',
             'selector_hyperparameters_tuned_only_on':'2021-23 model predictions',
             'untouched_holdout_seasons':[2024,2025],
             'high_confidence_sample_rule':'validation >=40 bets and >=15 active rounds',
             'selection_objective':'max validation Wilson 95% LOWER bound, tie-break by accuracy and coverage',
             'per_week_cap':3,
             'pass':'No match exceeds gate threshold => 0 bets that round',
             'pre_declared_comparison_models':models,
             'pre_declared_gates':['any','agree4','agree5','draw_high','low_over'],
             'confidence_thresholds':thresholds,
             'note':'Only archived reconstructed features, NO training on 2026-27 GW11 or GW12 results. Holdout not used in search.'},
 'validation':val_summary,
 'holdout_selected':test_summary,
 'holdout_comparisons':comp,
 'holdout_always_even_all':{'h':int((hold.label==0).sum()),'n':len(hold),'rate':round(base_all,4)},
 'holdout_always_even_first3':base_even3,
 'not_promoted':True,
 'goal':'Qualified R1+R2+R3 accuracy >80%, adequate coverage and prospective confirmation',
 'achieved_validated_80':bool(test_summary['rate'] is not None and test_summary['rate']>.80 and test_summary['n']>=60 and test_summary['ci95'][0]>.70),
 'warnings':['Earlier years 2015-18 lack OU/AH features; imputation not real odds',
             'Historical feature source/cache not independently audited for chronology and exact bookmaker timestamps',
             'R90 Shadow GW11 model weights were originally fit using this old historical cache: do not backtest original Shadow on held-out 2024-25 as independent test',
             'No post-match reranking of existing 2026-27 Official or Shadow results',
             'Historical held-out seasons may still be non-blind due to earlier research; only NEW prospective future rounds can certify 80%.']
}
# Round-level selection order for independent reproduction and future auditing.
for period,p,config in [('validation',v,selected_tuple),('holdout',hold,selected_tuple)]:
 rows=selector(p,*config)
 record=[]
 for idx,rank,pick,hit,conf in rows:
  f=p.iloc[idx]
  record.append({'season':int(f.season),'date':f.date,'round':int(f['round']),'home':f.home,'away':f.away,
                 'rank':rank,'pick':'單' if pick else '雙','actual':'單' if f.label else '雙','hit':bool(hit),'uncalibrated_margin':round(conf,6)})
 (ROOT/f'{period}_selected_picks.csv')
 pd.DataFrame(record).to_csv(ROOT/f'{period}_selected_picks.csv',index=False,encoding='utf-8-sig')
print('VALIDATION best:',json.dumps({k:selected[k] for k in ['id','h','n','rate','ci95','coverage_of_R123_slots','ranks']},ensure_ascii=False),flush=True)
print('HOLDOUT selected:',json.dumps(test_summary,ensure_ascii=False),flush=True)
print('HOLDOUT first comparators:',json.dumps(comp[:8],ensure_ascii=False),flush=True)
print('HOLDOUT always-even:',audit['holdout_always_even_all'],'first3',base_even3,flush=True)
print('80% achieved:',audit['achieved_validated_80'],flush=True)
(ROOT/'EPL_SPARSE80_RESEARCH_V1_RESULTS.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
P.to_csv(ROOT/'EPL_RESEARCH_ROLLING_MODEL_SCORES.csv',index=False,encoding='utf-8-sig')
